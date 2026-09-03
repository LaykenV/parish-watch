import { ConvexError, v } from 'convex/values'

import type { Doc, Id } from '../_generated/dataModel'
import { mutation } from '../_generated/server'
import type { MutationCtx } from '../_generated/server'
import { requireOwner } from '../auth/authorization'
import { COVERAGE_EVALUATOR_VERSION } from './gates'
import { listRootManifests } from './roots'

export const confirmPromotion = mutation({
  args: { proposalId: v.id('coverageRegistryProposals') },
  returns: v.object({ promoted: v.boolean(), replayed: v.boolean() }),
  handler: async (ctx, args) => {
    const owner = await requireOwner(ctx)
    const proposal = await ctx.db.get(args.proposalId)
    if (!proposal)
      throw promotionError('proposal_missing', 'The proposal does not exist.')
    if (proposal.status === 'promoted') {
      return { promoted: true, replayed: true }
    }
    if (proposal.status !== 'ready') {
      throw promotionError(
        'coverage_gates_failed',
        'Owner confirmation cannot override a blocked coverage gate.',
      )
    }
    if (!(await allCurrentGatesPass(ctx, proposal))) {
      throw promotionError(
        'coverage_gates_stale',
        'The latest evaluator version does not have ten passing gates.',
      )
    }

    const body = await ctx.db.get(proposal.governmentBodyId)
    const registry = await ctx.db.get(proposal.registryId)
    if (!body || !registry) {
      throw promotionError(
        'proposal_target_missing',
        'The proposal body or registry no longer exists.',
      )
    }
    const siblingRegistries = await ctx.db
      .query('sourceRegistries')
      .withIndex('by_body_and_status', (index) =>
        index.eq('governmentBodyId', body._id),
      )
      .take(30)
    for (const sibling of siblingRegistries) {
      if (
        sibling._id !== registry._id &&
        (sibling.status === 'supported' || sibling.status === 'degraded')
      ) {
        await ctx.db.patch(sibling._id, {
          status: 'paused',
          statusGeneration: (sibling.statusGeneration ?? 0) + 1,
        })
      }
    }
    const now = Date.now()
    await ctx.db.patch(registry._id, {
      status: 'supported',
      statusGeneration: (registry.statusGeneration ?? 0) + 1,
      lastHealthyAt: now,
    })
    await ctx.db.patch(body._id, { publicStatus: 'supported' })
    await ctx.db.patch(proposal._id, {
      status: 'promoted',
      promotedAt: now,
      promotedByUserId: owner._id,
    })
    await updateJurisdictionStatus(ctx, body.jurisdictionId)
    return { promoted: true, replayed: false }
  },
})

export const setCoverageStatus = mutation({
  args: {
    proposalId: v.id('coverageRegistryProposals'),
    status: v.union(
      v.literal('supported'),
      v.literal('degraded'),
      v.literal('paused'),
    ),
  },
  returns: v.object({ changed: v.boolean(), recovered: v.boolean() }),
  handler: async (ctx, args) => {
    await requireOwner(ctx)
    const proposal = await ctx.db.get(args.proposalId)
    if (!proposal || proposal.status !== 'promoted') {
      return { changed: false, recovered: false }
    }
    const body = await ctx.db.get(proposal.governmentBodyId)
    const registry = await ctx.db.get(proposal.registryId)
    if (!body || !registry) return { changed: false, recovered: false }
    if (
      args.status === 'supported' &&
      !(await allCurrentGatesPass(ctx, proposal))
    ) {
      throw promotionError(
        'recovery_gates_failed',
        'Coverage cannot recover until every current gate passes again.',
      )
    }
    const recovered =
      args.status === 'supported' && body.publicStatus !== 'supported'
    if (body.publicStatus === args.status && registry.status === args.status) {
      return { changed: false, recovered }
    }
    await ctx.db.patch(body._id, { publicStatus: args.status })
    await ctx.db.patch(registry._id, {
      status: args.status,
      statusGeneration: (registry.statusGeneration ?? 0) + 1,
      ...(args.status === 'supported' ? { lastHealthyAt: Date.now() } : {}),
    })
    await updateJurisdictionStatus(ctx, body.jurisdictionId)
    return { changed: true, recovered }
  },
})

async function allCurrentGatesPass(
  ctx: MutationCtx,
  proposal: Doc<'coverageRegistryProposals'>,
): Promise<boolean> {
  if (proposal.evaluatorVersion !== COVERAGE_EVALUATOR_VERSION) return false
  const registry = await ctx.db.get(proposal.registryId)
  if (!registry) return false
  const statusGeneration = registry.statusGeneration ?? 0
  const results = await Promise.all(
    Array.from({ length: 10 }, async (_, index) => {
      return await ctx.db
        .query('coverageGateEvaluations')
        .withIndex('by_proposal_and_gate', (query) =>
          query.eq('proposalId', proposal._id).eq('gateNumber', index + 1),
        )
        .order('desc')
        .first()
    }),
  )
  return results.every(
    (result) =>
      result?.passed === true &&
      result.evaluatorVersion === COVERAGE_EVALUATOR_VERSION &&
      (result.registryStatusGeneration ?? 0) === statusGeneration,
  )
}

async function updateJurisdictionStatus(
  ctx: MutationCtx,
  jurisdictionId: Id<'jurisdictions'>,
): Promise<void> {
  const jurisdiction = await ctx.db.get(jurisdictionId)
  if (!jurisdiction) return
  const requiredKeys = listRootManifests()
    .filter((manifest) => manifest.jurisdictionSlug === jurisdiction.slug)
    .map((manifest) => manifest.bodyKey)
  const bodies = await Promise.all(
    requiredKeys.map(
      async (bodyKey) =>
        await ctx.db
          .query('governmentBodies')
          .withIndex('by_slug', (index) => index.eq('slug', bodyKey))
          .unique(),
    ),
  )
  const supported =
    requiredKeys.length > 0 &&
    bodies.every((body) => body?.publicStatus === 'supported')
  await ctx.db.patch(jurisdiction._id, {
    publicStatus: supported ? 'supported' : 'candidate',
    ...(supported ? { qualityGateAt: Date.now() } : {}),
  })
}

function promotionError(code: string, message: string) {
  return new ConvexError({ code, message })
}
