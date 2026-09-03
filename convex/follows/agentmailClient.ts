import { AgentMail } from '@agentmail/convex'
import type { OutboundId, OutboundStatus } from '@agentmail/convex'
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
const MAX_RECONCILE_ATTEMPTS = 30
const ENQUEUE_RETRY_DELAY_MS = 60_000

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
