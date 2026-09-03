import { AgentMail } from '@agentmail/convex'
import type { OutboundId, OutboundStatus } from '@agentmail/convex'
import { paginationOptsValidator } from 'convex/server'
import { v } from 'convex/values'

import { components, internal } from '../_generated/api'
import type { Doc } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'
import { env, internalMutation } from '../_generated/server'
import {
  createOpaqueToken,
  decryptAddress,
  hashAccessToken,
} from './secrets'
import { MANAGEMENT_TOKEN_TTL_MS } from './enrollmentContracts'
import { weeklyRoundupWindowAt } from './roundupTime'

export const agentmail = new AgentMail(components.agentmail, {
  webhookSecret: env.AGENTMAIL_WEBHOOK_SECRET ?? '',
  retryAttempts: 6,
  initialBackoffMs: 30_000,
})

export function updatesInboxId(): string {
  const inboxId = env.AGENTMAIL_UPDATES_INBOX_ID?.trim()
  if (!inboxId) throw new Error('AGENTMAIL_UPDATES_INBOX_ID is not configured')
  return inboxId
}

const MAX_ENQUEUE_ATTEMPTS = 3
// Six provider attempts can span 23.25 minutes at maximum backoff jitter.
// Keep polling beyond that window so the app records the component's terminal state.
const MAX_RECONCILE_ATTEMPTS = 70
const ENQUEUE_RETRY_DELAY_MS = 60_000
const ROUNDUP_STALE_AFTER_MS = 15 * 60_000

export const reserveImmediateDelivery = internalMutation({
  args: {
    materialChangeId: v.id('materialChanges'),
    ownerKey: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('notificationDeliveries')
      .withIndex('by_owner_key_and_kind_and_material_change_id', (index) =>
        index
          .eq('ownerKey', args.ownerKey)
          .eq('kind', 'immediate')
          .eq('materialChangeId', args.materialChangeId),
      )
      .unique()
    if (
      existing &&
      (existing.state !== 'failed' ||
        existing.outboundId !== undefined ||
        existing.enqueueAttempts >= MAX_ENQUEUE_ATTEMPTS)
    ) {
      return null
    }
    const matches = await ctx.db
      .query('notificationMatches')
      .withIndex('by_material_change_id_and_owner_key', (index) =>
        index
          .eq('materialChangeId', args.materialChangeId)
          .eq('ownerKey', args.ownerKey),
      )
      .take(50)
    const eligible = [] as Array<{
      match: Doc<'notificationMatches'>
      follow: Doc<'follows'>
    }>
    for (const match of matches) {
      if (
        match.cadenceAtMatch !== 'immediate' &&
        match.cadenceAtMatch !== 'both'
      ) {
        continue
      }
      const follow = await ctx.db.get(match.followId)
      const preference = follow
        ? await ctx.db
            .query('notificationPreferences')
            .withIndex('by_follow_id', (index) =>
              index.eq('followId', follow._id),
            )
            .unique()
        : null
      if (
        !follow ||
        follow.ownerKey !== args.ownerKey ||
        !preference ||
        (preference.cadence !== 'immediate' && preference.cadence !== 'both')
      ) {
        continue
      }
      eligible.push({ match, follow })
    }
    if (eligible.length === 0) return null

    const first = eligible[0]
    let recipient: string
    let managementUrl: string
    if (first.follow.ownerKind === 'google') {
      const user = await ctx.db.get(first.follow.userId)
      if (!user) return null
      recipient = user.email
      managementUrl = appUrl('/following/notifications')
    } else {
      const subscriber = await ctx.db.get(first.follow.emailSubscriberId)
      if (!subscriber || subscriber.state !== 'verified') return null
      recipient = await decryptAddress(subscriber.encryptedAddress)
      const token = createOpaqueToken()
      const now = Date.now()
      await ctx.db.insert('emailAccessTokens', {
        subscriberId: subscriber._id,
        kind: 'management',
        tokenHash: await hashAccessToken(token),
        expiresAt: now + MANAGEMENT_TOKEN_TTL_MS,
        createdAt: now,
      })
      managementUrl = appUrl(`/email/manage/${encodeURIComponent(token)}`)
    }

    const projected = await projectImmediateEmail(
      ctx,
      args.materialChangeId,
      managementUrl,
    )
    if (!projected) return null
    const now = Date.now()
    const deliveryId = existing
      ? existing._id
      : await ctx.db.insert('notificationDeliveries', {
          ownerKind: first.follow.ownerKind,
          ownerKey: args.ownerKey,
          kind: 'immediate',
          materialChangeId: args.materialChangeId,
          state: 'reserved',
          enqueueAttempts: 0,
          reconcileAttempts: 0,
          createdAt: now,
          updatedAt: now,
        })
    const enqueueAttempts = (existing?.enqueueAttempts ?? 0) + 1
    await ctx.db.patch(deliveryId, {
      state: 'reserved',
      errorDetail: undefined,
      enqueueAttempts,
      updatedAt: now,
    })
    try {
      const outboundId = await agentmail.sendMessage(ctx, updatesInboxId(), {
        to: recipient,
        subject: projected.subject,
        text: projected.text,
        labels: ['public-parish', 'sourced-alert', 'immediate'],
      })
      await ctx.db.patch(deliveryId, {
        state: 'pending',
        outboundId,
        providerIdempotencyKey: outboundId,
        updatedAt: Date.now(),
      })
      await ctx.scheduler.runAfter(
        5_000,
        internal.follows.agentmailClient.reconcileImmediateDelivery,
        { deliveryId },
      )
    } catch (error) {
      await ctx.db.patch(deliveryId, {
        state: 'failed',
        errorDetail: errorText(error),
        updatedAt: Date.now(),
      })
      if (enqueueAttempts < MAX_ENQUEUE_ATTEMPTS) {
        await ctx.scheduler.runAfter(
          ENQUEUE_RETRY_DELAY_MS * 2 ** (enqueueAttempts - 1),
          internal.follows.agentmailClient.reserveImmediateDelivery,
          args,
        )
      }
    }
    return null
  },
})

export const reconcileImmediateDelivery = internalMutation({
  args: { deliveryId: v.id('notificationDeliveries') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get(args.deliveryId)
    if (!delivery?.outboundId || isTerminal(delivery.state)) return null
    const outbound = await agentmail.status(
      ctx,
      delivery.outboundId as OutboundId,
    )
    const attempts = delivery.reconcileAttempts + 1
    if (!outbound) {
      await ctx.db.patch(delivery._id, {
        state: 'failed',
        errorDetail: 'AgentMail delivery state is unavailable',
        reconcileAttempts: attempts,
        updatedAt: Date.now(),
      })
      return null
    }
    await ctx.db.patch(delivery._id, {
      state: outbound.status,
      agentmailMessageId: outbound.agentmailMessageId ?? undefined,
      agentmailThreadId: outbound.threadId ?? undefined,
      errorDetail: outbound.errorMessage?.slice(0, 500) ?? undefined,
      reconcileAttempts: attempts,
      updatedAt: Date.now(),
    })
    if (
      attempts < MAX_RECONCILE_ATTEMPTS &&
      (outbound.status === 'pending' || outbound.status === 'sent')
    ) {
      await ctx.scheduler.runAfter(
        30_000,
        internal.follows.agentmailClient.reconcileImmediateDelivery,
        { deliveryId: delivery._id },
      )
    }
    return null
  },
})

export const claimWeeklyRoundup = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now()
    await resumeStaleRoundupWindows(ctx, now)
    const window = weeklyRoundupWindowAt(now)
    if (!window) return null
    const existing = await ctx.db
      .query('roundupWindows')
      .withIndex('by_window_key', (index) => index.eq('windowKey', window.key))
      .unique()
    if (existing) return null
    const roundupWindowId = await ctx.db.insert('roundupWindows', {
      windowKey: window.key,
      startsAt: window.startsAt,
      endsAt: window.endsAt,
      state: 'collecting',
      entryCount: 0,
      deliveryCount: 0,
      createdAt: now,
      updatedAt: now,
    })
    await ctx.scheduler.runAfter(
      0,
      internal.follows.agentmailClient.collectWeeklyRoundupPage,
      {
        roundupWindowId,
        paginationOpts: { numItems: 50, cursor: null },
      },
    )
    return null
  },
})

async function resumeStaleRoundupWindows(
  ctx: MutationCtx,
  now: number,
): Promise<void> {
  const staleBefore = now - ROUNDUP_STALE_AFTER_MS
  const collecting = await ctx.db
    .query('roundupWindows')
    .withIndex('by_state_and_updated_at', (index) =>
      index.eq('state', 'collecting').lt('updatedAt', staleBefore),
    )
    .first()
  if (collecting) {
    await ctx.db.patch(collecting._id, { updatedAt: now })
    await ctx.scheduler.runAfter(
      0,
      internal.follows.agentmailClient.collectWeeklyRoundupPage,
      {
        roundupWindowId: collecting._id,
        paginationOpts: {
          numItems: 50,
          cursor: collecting.matchCursor ?? null,
        },
      },
    )
  }
  const delivering = await ctx.db
    .query('roundupWindows')
    .withIndex('by_state_and_updated_at', (index) =>
      index.eq('state', 'delivering').lt('updatedAt', staleBefore),
    )
    .first()
  if (delivering) {
    await ctx.db.patch(delivering._id, { updatedAt: now })
    await ctx.scheduler.runAfter(
      0,
      internal.follows.agentmailClient.deliverWeeklyRoundupPage,
      {
        roundupWindowId: delivering._id,
        paginationOpts: {
          numItems: 25,
          cursor: delivering.deliveryCursor ?? null,
        },
      },
    )
  }
}

export const collectWeeklyRoundupPage = internalMutation({
  args: {
    roundupWindowId: v.id('roundupWindows'),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const window = await ctx.db.get(args.roundupWindowId)
    if (!window || window.state !== 'collecting') return null
    const page = await ctx.db
      .query('notificationMatches')
      .withIndex('by_matched_at', (index) =>
        index.gte('matchedAt', window.startsAt).lt('matchedAt', window.endsAt),
      )
      .paginate(args.paginationOpts)
    let entryCount = 0
    let deliveryCount = 0
    for (const match of page.page) {
      if (
        match.cadenceAtMatch !== 'weekly' &&
        match.cadenceAtMatch !== 'both'
      ) {
        continue
      }
      const follow = await ctx.db.get(match.followId)
      const preference = follow
        ? await ctx.db
            .query('notificationPreferences')
            .withIndex('by_follow_id', (index) =>
              index.eq('followId', follow._id),
            )
            .unique()
        : null
      if (
        !follow ||
        !preference ||
        (preference.cadence !== 'weekly' && preference.cadence !== 'both') ||
        follow.ownerKey !== match.ownerKey
      ) {
        continue
      }
      if (follow.ownerKind === 'email') {
        const subscriber = await ctx.db.get(follow.emailSubscriberId)
        if (!subscriber || subscriber.state !== 'verified') continue
      } else if (!(await ctx.db.get(follow.userId))) {
        continue
      }
      let delivery = await ctx.db
        .query('notificationDeliveries')
        .withIndex('by_roundup_window_id_and_owner_key', (index) =>
          index
            .eq('roundupWindowId', window._id)
            .eq('ownerKey', match.ownerKey),
        )
        .unique()
      if (!delivery) {
        const deliveryId = await ctx.db.insert('notificationDeliveries', {
          ownerKind: match.ownerKind,
          ownerKey: match.ownerKey,
          kind: 'weekly',
          roundupWindowId: window._id,
          representativeFollowId: follow._id,
          state: 'reserved',
          enqueueAttempts: 0,
          reconcileAttempts: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        delivery = await ctx.db.get(deliveryId)
        deliveryCount += 1
      }
      if (!delivery || delivery.kind !== 'weekly') continue
      const existingEntry = await ctx.db
        .query('roundupEntries')
        .withIndex('by_delivery_id_and_material_change_id', (index) =>
          index
            .eq('deliveryId', delivery._id)
            .eq('materialChangeId', match.materialChangeId),
        )
        .unique()
      if (existingEntry) {
        if (!existingEntry.followIds.includes(follow._id)) {
          await ctx.db.patch(existingEntry._id, {
            followIds: [...existingEntry.followIds, follow._id],
          })
        }
        continue
      }
      await ctx.db.insert('roundupEntries', {
        roundupWindowId: window._id,
        deliveryId: delivery._id,
        materialChangeId: match.materialChangeId,
        followIds: [follow._id],
        createdAt: Date.now(),
      })
      entryCount += 1
    }
    const now = Date.now()
    if (!page.isDone) {
      await ctx.db.patch(window._id, {
        matchCursor: page.continueCursor,
        entryCount: window.entryCount + entryCount,
        deliveryCount: window.deliveryCount + deliveryCount,
        updatedAt: now,
      })
      await ctx.scheduler.runAfter(
        0,
        internal.follows.agentmailClient.collectWeeklyRoundupPage,
        {
          roundupWindowId: window._id,
          paginationOpts: { numItems: 50, cursor: page.continueCursor },
        },
      )
      return null
    }
    await ctx.db.patch(window._id, {
      state: 'delivering',
      matchCursor: undefined,
      entryCount: window.entryCount + entryCount,
      deliveryCount: window.deliveryCount + deliveryCount,
      updatedAt: now,
    })
    await ctx.scheduler.runAfter(
      0,
      internal.follows.agentmailClient.deliverWeeklyRoundupPage,
      {
        roundupWindowId: window._id,
        paginationOpts: { numItems: 25, cursor: null },
      },
    )
    return null
  },
})

export const deliverWeeklyRoundupPage = internalMutation({
  args: {
    roundupWindowId: v.id('roundupWindows'),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const window = await ctx.db.get(args.roundupWindowId)
    if (!window || window.state !== 'delivering') return null
    const page = await ctx.db
      .query('notificationDeliveries')
      .withIndex('by_roundup_window_id_and_owner_key', (index) =>
        index.eq('roundupWindowId', window._id),
      )
      .paginate(args.paginationOpts)
    for (const delivery of page.page) {
      if (delivery.kind === 'weekly' && delivery.state === 'reserved') {
        await enqueueWeeklyDelivery(ctx, delivery)
      }
    }
    const now = Date.now()
    if (!page.isDone) {
      await ctx.db.patch(window._id, {
        deliveryCursor: page.continueCursor,
        updatedAt: now,
      })
      await ctx.scheduler.runAfter(
        0,
        internal.follows.agentmailClient.deliverWeeklyRoundupPage,
        {
          roundupWindowId: window._id,
          paginationOpts: { numItems: 25, cursor: page.continueCursor },
        },
      )
      return null
    }
    await ctx.db.patch(window._id, {
      state: 'complete',
      deliveryCursor: undefined,
      completedAt: now,
      updatedAt: now,
    })
    return null
  },
})

export const retryWeeklyDelivery = internalMutation({
  args: { deliveryId: v.id('notificationDeliveries') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get(args.deliveryId)
    if (
      !delivery ||
      delivery.kind !== 'weekly' ||
      delivery.state !== 'failed' ||
      delivery.outboundId !== undefined ||
      delivery.enqueueAttempts >= MAX_ENQUEUE_ATTEMPTS
    ) {
      return null
    }
    await enqueueWeeklyDelivery(ctx, delivery)
    return null
  },
})

async function enqueueWeeklyDelivery(
  ctx: MutationCtx,
  delivery: Doc<'notificationDeliveries'>,
): Promise<void> {
  const entries = await ctx.db
    .query('roundupEntries')
    .withIndex('by_delivery_id_and_created_at', (index) =>
      index.eq('deliveryId', delivery._id),
    )
    .take(101)
  if (entries.length === 0) {
    await suppressDelivery(ctx, delivery, 'The roundup is empty')
    return
  }
  if (entries.length > 100) {
    await ctx.db.patch(delivery._id, {
      state: 'failed',
      errorDetail: 'The roundup exceeded 100 material updates',
      updatedAt: Date.now(),
    })
    return
  }
  const selection = await currentWeeklySelection(ctx, delivery, entries)
  if (!selection) {
    await suppressDelivery(ctx, delivery, 'No contributing follow is weekly')
    return
  }
  const { follow } = selection
  let recipient: string
  let managementUrl: string
  if (follow.ownerKind === 'google') {
    const user = await ctx.db.get(follow.userId)
    if (!user) {
      await suppressDelivery(ctx, delivery, 'The alert owner is unavailable')
      return
    }
    recipient = user.email
    managementUrl = appUrl('/following/notifications')
  } else {
    const subscriber = await ctx.db.get(follow.emailSubscriberId)
    if (!subscriber || subscriber.state !== 'verified') {
      await suppressDelivery(ctx, delivery, 'The subscriber is not verified')
      return
    }
    recipient = await decryptAddress(subscriber.encryptedAddress)
    const token = createOpaqueToken()
    const now = Date.now()
    await ctx.db.insert('emailAccessTokens', {
      subscriberId: subscriber._id,
      kind: 'management',
      tokenHash: await hashAccessToken(token),
      expiresAt: now + MANAGEMENT_TOKEN_TTL_MS,
      createdAt: now,
    })
    managementUrl = appUrl(`/email/manage/${encodeURIComponent(token)}`)
  }
  const projected = await projectWeeklyEmail(
    ctx,
    delivery,
    selection.entries,
    managementUrl,
  )
  if (!projected) return
  const enqueueAttempts = delivery.enqueueAttempts + 1
  await ctx.db.patch(delivery._id, {
    state: 'reserved',
    errorDetail: undefined,
    enqueueAttempts,
    updatedAt: Date.now(),
  })
  try {
    const outboundId = await agentmail.sendMessage(ctx, updatesInboxId(), {
      to: recipient,
      subject: projected.subject,
      text: projected.text,
      labels: ['public-parish', 'sourced-alert', 'weekly'],
    })
    await ctx.db.patch(delivery._id, {
      state: 'pending',
      outboundId,
      providerIdempotencyKey: outboundId,
      updatedAt: Date.now(),
    })
    await ctx.scheduler.runAfter(
      5_000,
      internal.follows.agentmailClient.reconcileImmediateDelivery,
      { deliveryId: delivery._id },
    )
  } catch (error) {
    await ctx.db.patch(delivery._id, {
      state: 'failed',
      errorDetail: errorText(error),
      updatedAt: Date.now(),
    })
    if (enqueueAttempts < MAX_ENQUEUE_ATTEMPTS) {
      await ctx.scheduler.runAfter(
        ENQUEUE_RETRY_DELAY_MS * 2 ** (enqueueAttempts - 1),
        internal.follows.agentmailClient.retryWeeklyDelivery,
        { deliveryId: delivery._id },
      )
    }
  }
}

async function currentWeeklySelection(
  ctx: MutationCtx,
  delivery: Doc<'notificationDeliveries'>,
  entries: Array<Doc<'roundupEntries'>>,
): Promise<{
  entries: Array<Doc<'roundupEntries'>>
  follow: Doc<'follows'>
} | null> {
  const eligibleEntries: Array<Doc<'roundupEntries'>> = []
  let recipientFollow: Doc<'follows'> | null = null
  for (const entry of entries) {
    let entryIsEligible = false
    for (const followId of entry.followIds) {
      const follow = await ctx.db.get(followId)
      if (
        !follow ||
        follow.ownerKind !== delivery.ownerKind ||
        follow.ownerKey !== delivery.ownerKey
      ) {
        continue
      }
      const preference = await ctx.db
        .query('notificationPreferences')
        .withIndex('by_follow_id', (index) =>
          index.eq('followId', follow._id),
        )
        .unique()
      if (
        preference?.cadence === 'weekly' ||
        preference?.cadence === 'both'
      ) {
        recipientFollow ??= follow
        entryIsEligible = true
        break
      }
    }
    if (entryIsEligible) eligibleEntries.push(entry)
  }
  return recipientFollow
    ? { entries: eligibleEntries, follow: recipientFollow }
    : null
}

async function projectWeeklyEmail(
  ctx: MutationCtx,
  delivery: Doc<'notificationDeliveries'>,
  entries: Array<Doc<'roundupEntries'>>,
  managementUrl: string,
): Promise<{ subject: string; text: string } | null> {
  const items: Array<{
    place: string
    title: string
    change: string
    source: string
    href: string
  }> = []
  for (const entry of entries) {
    const change = await ctx.db.get(entry.materialChangeId)
    const version = change
      ? await ctx.db.get(change.currentPublicationVersionId)
      : null
    const record = change ? await ctx.db.get(change.recordId) : null
    const body = record ? await ctx.db.get(record.governmentBodyId) : null
    const jurisdiction = body
      ? await ctx.db.get(body.jurisdictionId)
      : null
    if (!change?.material || !version?.payload || !record || !jurisdiction) {
      continue
    }
    const issue = await currentIssueLink(ctx, record._id, version._id)
    items.push({
      place: jurisdiction.name,
      title: version.payload.title,
      change:
        change.classification === 'new_decision'
          ? 'New decision'
          : changeLabel(change.classification),
      source: version.payload.source.officialUrl,
      href: issue
        ? appUrl(`/issues/${encodeURIComponent(issue.slug)}`)
        : appUrl(`/decisions/${encodeURIComponent(record.recordKey)}`),
    })
  }
  if (items.length === 0) {
    await suppressDelivery(ctx, delivery, 'The roundup has no readable updates')
    return null
  }
  items.sort(
    (left, right) =>
      left.place.localeCompare(right.place) ||
      left.title.localeCompare(right.title),
  )
  const lines = ['Your weekly Public Parish roundup']
  let place = ''
  for (const item of items) {
    if (item.place !== place) {
      place = item.place
      lines.push('', place)
    }
    lines.push(`- ${item.title}`, `  ${item.change}`, `  ${item.href}`)
    lines.push(`  Official source: ${item.source}`)
  }
  lines.push('', `Manage alerts: ${managementUrl}`)
  return {
    subject: `${items.length} ${items.length === 1 ? 'update' : 'updates'} in your Public Parish roundup`,
    text: lines.join('\n'),
  }
}

async function suppressDelivery(
  ctx: MutationCtx,
  delivery: Doc<'notificationDeliveries'>,
  reason: string,
): Promise<void> {
  await ctx.db.patch(delivery._id, {
    state: 'suppressed',
    errorDetail: reason,
    updatedAt: Date.now(),
  })
}

type DeliveryCtx = MutationCtx

async function projectImmediateEmail(
  ctx: DeliveryCtx,
  materialChangeId: Doc<'materialChanges'>['_id'],
  managementUrl: string,
): Promise<{ subject: string; text: string } | null> {
  const change = await ctx.db.get(materialChangeId)
  const version = change
    ? await ctx.db.get(change.currentPublicationVersionId)
    : null
  const record = change ? await ctx.db.get(change.recordId) : null
  if (!change?.material || !version?.payload || !record) return null
  const citations = await ctx.db
    .query('citations')
    .withIndex('by_publication_and_field_path', (index) =>
      index.eq('publicationVersionId', version._id),
    )
    .take(100)
  const officialUrls = [
    ...new Set([
      version.payload.source.officialUrl,
      ...citations.map((citation) => citation.officialUrl),
    ]),
  ].slice(0, 5)
  const issueLink = await currentIssueLink(ctx, record._id, version._id)
  const appLink = issueLink
    ? appUrl(`/issues/${encodeURIComponent(issueLink.slug)}`)
    : appUrl(`/decisions/${encodeURIComponent(record.recordKey)}`)
  const lines = [
    change.classification === 'new_decision'
      ? 'A new local decision was published.'
      : `A published decision changed: ${changeLabel(change.classification)}.`,
    '',
    version.payload.title,
  ]
  if (version.payload.kind === 'full') {
    lines.push('', version.payload.plainLanguageSummary)
    lines.push('', `Current stage: ${version.payload.lifecycleState}`)
    if (version.payload.meetingAt) {
      lines.push(`Meeting date: ${version.payload.meetingAt}`)
    }
  }
  if (issueLink?.whyItMatters) {
    lines.push('', 'Why it matters', issueLink.whyItMatters)
  }
  lines.push('', 'Official sources')
  for (const url of officialUrls) lines.push(url)
  lines.push('', `View in Public Parish: ${appLink}`)
  lines.push(`Manage alerts: ${managementUrl}`)
  return {
    subject: `${change.classification === 'new_decision' ? 'New decision' : 'Decision update'}: ${version.payload.title}`,
    text: lines.join('\n'),
  }
}

async function currentIssueLink(
  ctx: DeliveryCtx,
  recordId: Doc<'decisionRecords'>['_id'],
  publicationVersionId: Doc<'publicationVersions'>['_id'],
): Promise<{ slug: string; whyItMatters: string | null } | null> {
  const links = await ctx.db
    .query('issueDecisionLinks')
    .withIndex('by_record_and_created_at', (index) =>
      index.eq('recordId', recordId),
    )
    .order('desc')
    .take(20)
  for (const link of links) {
    if (link.publicationVersionId !== publicationVersionId) continue
    const issue = await ctx.db.get(link.issueId)
    if (!issue || issue.currentVersionId !== link.issueVersionId) continue
    const assessments = await ctx.db
      .query('importanceAssessments')
      .withIndex('by_issue_version_and_factor', (index) =>
        index.eq('issueVersionId', link.issueVersionId),
      )
      .take(7)
    const whyItMatters =
      assessments.find((assessment) => assessment.level !== 'absent')
        ?.rationale ?? null
    return { slug: issue.slug, whyItMatters }
  }
  return null
}

function appUrl(path: string): string {
  return `${env.CONVEX_SITE_URL.replace(/\/$/, '')}${path}`
}

function changeLabel(classification: string): string {
  return classification.replaceAll('_', ' ')
}

function errorText(error: unknown): string {
  return (error instanceof Error ? error.message : 'Delivery enqueue failed').slice(
    0,
    500,
  )
}

function isTerminal(state: Doc<'notificationDeliveries'>['state']): boolean {
  return !(['reserved', 'pending', 'sent'] as string[]).includes(state)
}

export function providerStatusIsTerminal(status: OutboundStatus): boolean {
  return !['pending', 'sent'].includes(status)
}
