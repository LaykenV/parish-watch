import { paginationOptsValidator, paginationResultValidator } from 'convex/server'
import { v } from 'convex/values'
import { env, query } from '../_generated/server'
import { requireOwner } from '../auth/authorization'
import { listRootManifests } from '../coverage/roots'
import schema from '../schema'

export const monitoring = query({
  args: {}, returns: v.object({ enabled: v.boolean(), counters: v.array(schema.doc('civicEventCounters')), sources: v.array(v.object({ bodyName: v.string(), proposalId: v.id('coverageRegistryProposals'), policy: v.union(schema.doc('sourceMonitoringPolicies'), v.null()), pendingTarget: v.boolean(), failedTarget: v.boolean(), failedTargetId: v.union(v.id('documentInventoryTargets'), v.null()), retryDocumentId: v.union(v.id('monitoredDocuments'), v.null()) })) }),
  handler: async ctx => {
    await requireOwner(ctx)
    const sources = []
    for (const manifest of listRootManifests()) {
      const proposals = await ctx.db.query('coverageRegistryProposals').withIndex('by_body_and_status', q => q.eq('bodyKey', manifest.bodyKey).eq('status', 'promoted')).take(2)
      if (proposals.length !== 1) continue
      const proposal = proposals[0]
      const policy = await ctx.db.query('sourceMonitoringPolicies').withIndex('by_registry_id', q => q.eq('registryId', proposal.registryId)).unique()
      const pending = policy ? await ctx.db.query('documentInventoryTargets').withIndex('by_policy_id_and_state', q => q.eq('policyId', policy._id).eq('state', 'pending')).first() : null
      const failed = policy ? await ctx.db.query('documentInventoryTargets').withIndex('by_policy_id_and_state', q => q.eq('policyId', policy._id).eq('state', 'failed')).first() : null
      const retryDocument = policy ? await ctx.db.query('monitoredDocuments').withIndex('by_policy_id_and_inventory_complete', q => q.eq('policyId', policy._id).eq('inventoryComplete', false)).filter(q => q.neq(q.field('errorClass'), undefined)).first() : null
      sources.push({ bodyName: manifest.bodyName, proposalId: proposal._id, policy, pendingTarget: pending !== null, failedTarget: failed !== null, failedTargetId: failed?._id ?? null, retryDocumentId: retryDocument?._id ?? null })
    }
    return { enabled: env.SOURCE_MONITORING_ENABLED === 'true', counters: await ctx.db.query('civicEventCounters').take(100), sources }
  },
})
export const incidents = query({
  args: { paginationOpts: paginationOptsValidator }, returns: paginationResultValidator(schema.doc('coverageIncidents')),
  handler: async (ctx, args) => { await requireOwner(ctx); return ctx.db.query('coverageIncidents').withIndex('by_state_and_last_seen_at', q => q.eq('state', 'open')).order('desc').paginate(args.paginationOpts) },
})
export const issueProposals = query({
  args: { paginationOpts: paginationOptsValidator }, returns: paginationResultValidator(schema.doc('issueLinkProposals')),
  handler: async (ctx, args) => { await requireOwner(ctx); return ctx.db.query('issueLinkProposals').order('desc').paginate(args.paginationOpts) },
})
export const demand = query({
  args: { paginationOpts: paginationOptsValidator }, returns: paginationResultValidator(schema.doc('coverageDemandCounts')),
  handler: async (ctx, args) => { await requireOwner(ctx); return ctx.db.query('coverageDemandCounts').order('desc').paginate(args.paginationOpts) },
})
const usageRow = v.object({ id: v.string(), provider: v.string(), operation: v.string(), status: v.string(), model: v.optional(v.string()), role: v.optional(v.string()), tokens: v.optional(v.number()), estimatedCostUsd: v.optional(v.number()), credits: v.optional(v.number()), at: v.number() })
export const providerUsage = query({
  args: { kind: v.union(v.literal('pipeline'), v.literal('ask'), v.literal('compiler'), v.literal('monitoring'), v.literal('retrieval')), paginationOpts: paginationOptsValidator }, returns: paginationResultValidator(usageRow),
  handler: async (ctx, args) => {
    await requireOwner(ctx)
    if (args.paginationOpts.numItems > 50) throw new Error('Use report pages of at most 50.')
    if (args.kind === 'retrieval') {
      const page = await ctx.db.query('retrievalProviderCalls').order('desc').paginate(args.paginationOpts)
      return { ...page, page: page.page.map(row => ({ id: row._id, provider: 'firecrawl', operation: 'retrieval', status: row.status, credits: row.creditsUsed, at: row.createdAt })) }
    }
    if (args.kind === 'pipeline') {
      const page = await ctx.db.query('aiCalls').order('desc').paginate(args.paginationOpts)
      return { ...page, page: page.page.map(row => ({ id: row._id, provider: row.route, operation: 'evidence_pipeline', status: row.status, model: row.modelId, role: row.modelRole, tokens: row.totalTokens, estimatedCostUsd: row.estimatedCostUsd, at: row.createdAt })) }
    }
    if (args.kind === 'ask') {
      const page = await ctx.db.query('askModelAttempts').order('desc').paginate(args.paginationOpts)
      return { ...page, page: page.page.map(row => ({ id: row._id, provider: row.route, operation: row.promptVersion, status: row.status, model: row.modelId, role: row.modelRole, tokens: row.totalTokens, estimatedCostUsd: row.estimatedCostUsd, at: row.createdAt })) }
    }
    if (args.kind === 'compiler') {
      const page = await ctx.db.query('coverageCompilerProviderCalls').order('desc').paginate(args.paginationOpts)
      return { ...page, page: page.page.map(row => ({ id: row._id, provider: row.provider, operation: row.operation, status: row.status, model: row.modelId, role: row.modelRole, tokens: row.promptTokens !== undefined && row.completionTokens !== undefined ? row.promptTokens + row.completionTokens : undefined, estimatedCostUsd: row.estimatedCostUsd, credits: row.creditsUsed, at: row.createdAt })) }
    }
    const page = await ctx.db.query('monitoringProviderCalls').order('desc').paginate(args.paginationOpts)
    return { ...page, page: page.page.map(row => ({ id: row._id, provider: row.provider, operation: row.operation, status: row.status, model: row.modelId, role: row.modelRole, tokens: row.promptTokens !== undefined && row.completionTokens !== undefined ? row.promptTokens + row.completionTokens : undefined, estimatedCostUsd: row.estimatedCostUsd, credits: row.creditsUsed, at: row.createdAt })) }
  },
})

export const deliveryProblems = query({
  args: { state: v.union(v.literal('failed'), v.literal('bounced'), v.literal('complained'), v.literal('rejected'), v.literal('pending')), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(v.object({ id: v.string(), kind: v.string(), state: v.string(), enqueueAttempts: v.number(), reconcileAttempts: v.number(), updatedAt: v.number() })),
  handler: async (ctx, args) => {
    await requireOwner(ctx)
    if (args.paginationOpts.numItems > 50) throw new Error('Use pages of at most 50.')
    const page = await ctx.db.query('notificationDeliveries').withIndex('by_state_and_updated_at', q => q.eq('state', args.state)).order('desc').paginate(args.paginationOpts)
    return { ...page, page: page.page.map(row => ({ id: row._id, kind: row.kind, state: row.state, enqueueAttempts: row.enqueueAttempts, reconcileAttempts: row.reconcileAttempts, updatedAt: row.updatedAt })) }
  },
})
