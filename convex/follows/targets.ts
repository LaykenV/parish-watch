import { paginationOptsValidator } from 'convex/server'
import { ConvexError, v } from 'convex/values'

import { internal } from '../_generated/api'
import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { internalMutation } from '../_generated/server'
import { TOPIC_SLUGS } from './contracts'
import type { TopicSlug } from './contracts'
import type { FollowTargetKind } from './enrollmentContracts'

type TargetCtx = Pick<QueryCtx | MutationCtx, 'db'>

type ResolvedTarget = {
  targetKind: FollowTargetKind
  targetKey: string
  title: string
  detail: string
}

const TOPIC_LABELS: Record<(typeof TOPIC_SLUGS)[number], string> = {
  'public-money': 'Public money',
  'public-assets': 'Public assets',
  'public-safety': 'Public safety',
  housing: 'Housing',
  drainage: 'Drainage',
  'land-use': 'Land use',
}

const TOPIC_ALIASES = new Map<string, TopicSlug>([
  ['public-money', 'public-money'],
  ['public money', 'public-money'],
  ['public-assets', 'public-assets'],
  ['public assets', 'public-assets'],
  ['public-safety', 'public-safety'],
  ['public safety', 'public-safety'],
  ['housing', 'housing'],
  ['drainage', 'drainage'],
  ['land-use', 'land-use'],
  ['land use', 'land-use'],
])

const IMPORTANCE_FACTOR_TOPICS = new Map<string, TopicSlug>([
  ['public_money', 'public-money'],
  ['public_assets', 'public-assets'],
  ['health_safety', 'public-safety'],
  ['land_use', 'land-use'],
])

export function canonicalTopicSlug(value: string): TopicSlug | null {
  const normalized = value
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('en-US')
    .replace(/[_\s]+/g, ' ')
  return TOPIC_ALIASES.get(normalized) ?? null
}

export function importanceFactorTopicSlug(value: string): TopicSlug | null {
  return IMPORTANCE_FACTOR_TOPICS.get(value) ?? null
}

export async function resolveFollowTarget(
  ctx: TargetCtx,
  targetKind: FollowTargetKind,
  rawTargetKey: string,
): Promise<ResolvedTarget> {
  const targetKey = normalizeTargetKey(rawTargetKey)

  if (targetKind === 'topic') {
    if (!TOPIC_SLUGS.includes(targetKey as (typeof TOPIC_SLUGS)[number])) {
      throw invalidTarget()
    }
    return {
      targetKind,
      targetKey,
      title: TOPIC_LABELS[targetKey as (typeof TOPIC_SLUGS)[number]],
      detail: 'Published local decisions in this topic',
    }
  }

  if (targetKind === 'issue') {
    const issue = await ctx.db
      .query('issues')
      .withIndex('by_slug', (index) => index.eq('slug', targetKey))
      .unique()
    if (!issue?.currentVersionId || !issue.currentMode) throw invalidTarget()
    const version = await ctx.db.get('issueVersions', issue.currentVersionId)
    if (!version?.payload) throw invalidTarget()
    const body = await ctx.db.get('governmentBodies', issue.governmentBodyId)
    return {
      targetKind,
      targetKey,
      title: version.payload.title,
      detail: body?.name ?? 'Published issue',
    }
  }

  if (targetKind === 'government_body') {
    const body = await ctx.db
      .query('governmentBodies')
      .withIndex('by_slug', (index) => index.eq('slug', targetKey))
      .unique()
    if (!body || !isFollowableCoverage(body.publicStatus)) throw invalidTarget()
    const jurisdiction = await ctx.db.get('jurisdictions', body.jurisdictionId)
    return {
      targetKind,
      targetKey,
      title: body.name,
      detail: jurisdiction?.name ?? 'Local government body',
    }
  }

  const place = await ctx.db
    .query('jurisdictions')
    .withIndex('by_slug', (index) => index.eq('slug', targetKey))
    .unique()
  if (
    !place ||
    !isFollowableCoverage(place.publicStatus)
  ) {
    throw invalidTarget()
  }
  return {
    targetKind,
    targetKey,
    title: place.name,
    detail: place.type === 'parish' ? 'Parish' : 'Municipality',
  }
}

function normalizeTargetKey(value: string): string {
  const normalized = value.trim().toLowerCase()
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) throw invalidTarget()
  return normalized
}

function isFollowableCoverage(value: string): boolean {
  return value === 'supported' || value === 'degraded'
}

function invalidTarget(): ConvexError<string> {
  return new ConvexError('This follow target is unavailable')
}

type MatchTarget = {
  targetKind: FollowTargetKind
  targetKey: string
}

export const startDecisionMatchFanout = internalMutation({
  args: { materialChangeId: v.id('materialChanges') },
  returns: v.null(),
  handler: async (ctx, args) => {
    await startMatchFanout(ctx, {
      materialChangeId: args.materialChangeId,
      phase: 'decision',
    })
    return null
  },
})

export const startIssueMatchFanout = internalMutation({
  args: {
    materialChangeId: v.id('materialChanges'),
    issueVersionId: v.id('issueVersions'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await startMatchFanout(ctx, {
      materialChangeId: args.materialChangeId,
      phase: 'issue',
      issueVersionId: args.issueVersionId,
    })
    return null
  },
})

async function startMatchFanout(
  ctx: MutationCtx,
  args: {
    materialChangeId: Id<'materialChanges'>
    phase: 'decision' | 'issue'
    issueVersionId?: Id<'issueVersions'>
  },
): Promise<void> {
  const change = await ctx.db.get(args.materialChangeId)
  if (!change?.material) return
  const existing = await ctx.db
    .query('notificationFanouts')
    .withIndex(
      'by_material_change_id_and_phase_and_issue_version_id',
      (index) =>
        index
          .eq('materialChangeId', args.materialChangeId)
          .eq('phase', args.phase)
          .eq('issueVersionId', args.issueVersionId),
    )
    .unique()
  if (existing) return
  const now = Date.now()
  const fanoutId = await ctx.db.insert('notificationFanouts', {
    materialChangeId: args.materialChangeId,
    phase: args.phase,
    issueVersionId: args.issueVersionId,
    targetIndex: 0,
    state: 'pending',
    matchesCreated: 0,
    createdAt: now,
    updatedAt: now,
  })
  await ctx.scheduler.runAfter(0, internal.follows.targets.runMatchFanout, {
    fanoutId,
    paginationOpts: { numItems: 50, cursor: null },
  })
}

export const runMatchFanout = internalMutation({
  args: {
    fanoutId: v.id('notificationFanouts'),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const fanout = await ctx.db.get(args.fanoutId)
    if (!fanout || fanout.state === 'complete') return null
    const change = await ctx.db.get(fanout.materialChangeId)
    if (!change?.material) {
      await ctx.db.patch(fanout._id, {
        state: 'complete',
        updatedAt: Date.now(),
      })
      return null
    }
    const targets = await matchTargets(ctx, fanout, change)
    const target = targets.find(
      (_candidate, index) => index === fanout.targetIndex,
    )
    if (!target) {
      await ctx.db.patch(fanout._id, {
        state: 'complete',
        cursor: undefined,
        updatedAt: Date.now(),
      })
      return null
    }
    const page = await ctx.db
      .query('follows')
      .withIndex(
        'by_target_kind_and_target_key_and_owner_kind',
        (index) =>
          index
            .eq('targetKind', target.targetKind)
            .eq('targetKey', target.targetKey),
      )
      .paginate(args.paginationOpts)
    let matchesCreated = 0
    const immediateOwnerKeys = new Set<string>()
    for (const follow of page.page) {
      if (follow.createdAt > change.createdAt) continue
      const preference = await ctx.db
        .query('notificationPreferences')
        .withIndex('by_follow_id', (index) =>
          index.eq('followId', follow._id),
        )
        .unique()
      if (!preference || preference.cadence === 'muted') continue
      if (follow.ownerKind === 'email') {
        const subscriber = await ctx.db.get(follow.emailSubscriberId)
        if (!subscriber || subscriber.state !== 'verified') continue
      } else if (!(await ctx.db.get(follow.userId))) {
        continue
      }
      const existing = await ctx.db
        .query('notificationMatches')
        .withIndex('by_follow_id_and_material_change_id', (index) =>
          index
            .eq('followId', follow._id)
            .eq('materialChangeId', change._id),
        )
        .unique()
      if (!existing) {
        await ctx.db.insert('notificationMatches', {
          followId: follow._id,
          materialChangeId: change._id,
          ownerKind: follow.ownerKind,
          ownerKey: follow.ownerKey,
          targetKind: follow.targetKind,
          targetKey: follow.targetKey,
          cadenceAtMatch: preference.cadence,
          matchedAt: Date.now(),
        })
        matchesCreated += 1
      }
      if (
        preference.cadence === 'immediate' ||
        preference.cadence === 'both'
      ) {
        immediateOwnerKeys.add(follow.ownerKey)
      }
    }
    const nextTargetIndex = page.isDone
      ? fanout.targetIndex + 1
      : fanout.targetIndex
    const complete = page.isDone && nextTargetIndex >= targets.length
    const now = Date.now()
    await ctx.db.patch(fanout._id, {
      targetIndex: nextTargetIndex,
      cursor: complete || page.isDone ? undefined : page.continueCursor,
      state: complete ? 'complete' : 'pending',
      matchesCreated: fanout.matchesCreated + matchesCreated,
      updatedAt: now,
    })
    for (const ownerKey of immediateOwnerKeys) {
      await ctx.scheduler.runAfter(
        0,
        internal.follows.agentmailClient.reserveImmediateDelivery,
        {
          materialChangeId: change._id,
          ownerKey,
        },
      )
    }
    if (!complete) {
      await ctx.scheduler.runAfter(0, internal.follows.targets.runMatchFanout, {
        fanoutId: fanout._id,
        paginationOpts: {
          numItems: 50,
          cursor: page.isDone ? null : page.continueCursor,
        },
      })
    }
    return null
  },
})

async function matchTargets(
  ctx: TargetCtx,
  fanout: Doc<'notificationFanouts'>,
  change: Doc<'materialChanges'>,
): Promise<MatchTarget[]> {
  if (fanout.phase === 'decision') {
    const record = await ctx.db.get(change.recordId)
    const body = record ? await ctx.db.get(record.governmentBodyId) : null
    const jurisdiction = body
      ? await ctx.db.get(body.jurisdictionId)
      : null
    if (!body || !jurisdiction) return []
    const targets: MatchTarget[] = [
      { targetKind: 'government_body', targetKey: body.slug },
      { targetKind: 'place', targetKey: jurisdiction.slug },
    ]
    if (jurisdiction.parentJurisdictionId) {
      const parent = await ctx.db.get(jurisdiction.parentJurisdictionId)
      if (parent && isFollowableCoverage(parent.publicStatus)) {
        targets.push({ targetKind: 'place', targetKey: parent.slug })
      }
    }
    return targets
  }

  if (!fanout.issueVersionId) return []
  const fanoutVersion = await ctx.db.get(fanout.issueVersionId)
  const issue = fanoutVersion ? await ctx.db.get(fanoutVersion.issueId) : null
  const version = issue?.currentVersionId
    ? await ctx.db.get(issue.currentVersionId)
    : null
  if (
    !version?.payload ||
    !issue ||
    issue.currentMode !== version.mode
  ) {
    return []
  }
  if (version._id !== fanoutVersion?._id) {
    const links = await loadIssueLinksWithinBuildBound(ctx, version._id)
    const stillLinked = links.some(
      (link) =>
        link.publicationVersionId === change.currentPublicationVersionId,
    )
    if (!stillLinked) return []
  }
  const targets: MatchTarget[] = [
    { targetKind: 'issue', targetKey: issue.slug },
  ]
  const seen = new Set<string>()
  for (const topic of version.payload.topics) {
    const targetKey = canonicalTopicSlug(topic)
    if (!targetKey || seen.has(targetKey)) continue
    seen.add(targetKey)
    targets.push({ targetKind: 'topic', targetKey })
  }
  const assessments = await ctx.db
    .query('importanceAssessments')
    .withIndex('by_issue_version_and_factor', (index) =>
      index.eq('issueVersionId', version._id),
    )
    .take(7)
  for (const assessment of assessments) {
    if (assessment.level === 'absent') continue
    const targetKey = importanceFactorTopicSlug(assessment.factor)
    if (!targetKey || seen.has(targetKey)) continue
    seen.add(targetKey)
    targets.push({ targetKind: 'topic', targetKey })
  }
  return targets
}

async function loadIssueLinksWithinBuildBound(
  ctx: Pick<MutationCtx, 'db'> | Pick<TargetCtx, 'db'>,
  issueVersionId: Id<'issueVersions'>,
): Promise<Doc<'issueDecisionLinks'>[]> {
  const links = await ctx.db
    .query('issueDecisionLinks')
    .withIndex('by_issue_version', (index) =>
      index.eq('issueVersionId', issueVersionId),
    )
    .take(11)
  if (links.length > 10) {
    throw new Error('Issue version exceeds the ten-decision build limit')
  }
  return links
}

export async function scheduleNewIssueLinkFanouts(
  ctx: MutationCtx,
  args: {
    issueVersionId: Id<'issueVersions'>
    previousIssueVersionId?: Id<'issueVersions'>
  },
): Promise<void> {
  const previousPublicationIds = new Set<string>()
  if (args.previousIssueVersionId) {
    const previousLinks = await loadIssueLinksWithinBuildBound(
      ctx,
      args.previousIssueVersionId,
    )
    for (const link of previousLinks) {
      previousPublicationIds.add(link.publicationVersionId)
    }
  }
  const links = await loadIssueLinksWithinBuildBound(ctx, args.issueVersionId)
  for (const link of links) {
    if (previousPublicationIds.has(link.publicationVersionId)) continue
    const change = await ctx.db
      .query('materialChanges')
      .withIndex('by_current_publication', (index) =>
        index.eq('currentPublicationVersionId', link.publicationVersionId),
      )
      .unique()
    if (!change?.material) continue
    await ctx.scheduler.runAfter(
      0,
      internal.follows.targets.startIssueMatchFanout,
      { materialChangeId: change._id, issueVersionId: args.issueVersionId },
    )
  }
}
