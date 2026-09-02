import { ConvexError } from 'convex/values'

import type { MutationCtx, QueryCtx } from '../_generated/server'
import { TOPIC_SLUGS } from './contracts'
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
    place.type !== 'municipality' ||
    !isFollowableCoverage(place.publicStatus)
  ) {
    throw invalidTarget()
  }
  return {
    targetKind,
    targetKey,
    title: place.name,
    detail: 'Municipality',
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
