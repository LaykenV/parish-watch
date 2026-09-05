import { paginationOptsValidator, paginationResultValidator } from 'convex/server'
import { v } from 'convex/values'
import type { Id } from '../_generated/dataModel'
import { internalMutation, query } from '../_generated/server'
import { requireOwner } from '../auth/authorization'
import schema from '../schema'

const kind = v.union(v.literal('pipeline'), v.literal('ask'), v.literal('compiler'), v.literal('monitoring'), v.literal('retrieval'))
type Usage = { at: number; provider: string; status: string; tokens?: number; cost?: number; credits?: number; latency: number; id: Id<'aiCalls' | 'askModelAttempts' | 'coverageCompilerProviderCalls' | 'monitoringProviderCalls' | 'retrievalProviderCalls'> }
export const aggregate = internalMutation({
  args: { kind }, returns: v.number(),
  handler: async (ctx, args): Promise<number> => {
    let rows: Usage[]
    if (args.kind === 'pipeline') rows = (await ctx.db.query('aiCalls').withIndex('by_usage_aggregated', q => q.eq('usageAggregatedAt', undefined)).take(100)).map(row => ({ at: row.createdAt, provider: row.route, status: row.status, tokens: row.totalTokens, cost: row.estimatedCostUsd, latency: row.latencyMs, id: row._id }))
    else if (args.kind === 'ask') rows = (await ctx.db.query('askModelAttempts').withIndex('by_usage_aggregated', q => q.eq('usageAggregatedAt', undefined)).take(100)).map(row => ({ at: row.createdAt, provider: row.route, status: row.status, tokens: row.totalTokens, cost: row.estimatedCostUsd, latency: row.latencyMs, id: row._id }))
    else if (args.kind === 'compiler') rows = (await ctx.db.query('coverageCompilerProviderCalls').withIndex('by_usage_aggregated', q => q.eq('usageAggregatedAt', undefined)).take(100)).map(row => ({ at: row.createdAt, provider: row.provider, status: row.status, tokens: row.promptTokens !== undefined && row.completionTokens !== undefined ? row.promptTokens + row.completionTokens : undefined, cost: row.estimatedCostUsd, credits: row.creditsUsed, latency: row.latencyMs, id: row._id }))
    else if (args.kind === 'retrieval') rows = (await ctx.db.query('retrievalProviderCalls').withIndex('by_usage_aggregated', q => q.eq('usageAggregatedAt', undefined)).take(100)).map(row => ({ at: row.createdAt, provider: 'firecrawl', status: row.status, credits: row.creditsUsed, latency: row.latencyMs, id: row._id }))
    else rows = (await ctx.db.query('monitoringProviderCalls').withIndex('by_usage_aggregated', q => q.eq('usageAggregatedAt', undefined)).take(100)).map(row => ({ at: row.createdAt, provider: row.provider, status: row.status, tokens: row.promptTokens !== undefined && row.completionTokens !== undefined ? row.promptTokens + row.completionTokens : undefined, cost: row.estimatedCostUsd, credits: row.creditsUsed, latency: row.latencyMs, id: row._id }))
    for (const row of rows) {
      const day = new Date(row.at).toISOString().slice(0, 10)
      const key = `${day}:${args.kind}:${row.provider}`
      const previous = await ctx.db.query('providerUsageDaily').withIndex('by_key', q => q.eq('key', key)).unique()
      const successful = row.status === 'succeeded' || row.status === 'success'
      const totals = { key, day, kind: args.kind, provider: row.provider, calls: (previous?.calls ?? 0) + 1, failures: (previous?.failures ?? 0) + (successful ? 0 : 1), reportedTokens: (previous?.reportedTokens ?? 0) + (row.tokens ?? 0), estimatedCostUsd: (previous?.estimatedCostUsd ?? 0) + (row.cost ?? 0), reportedCredits: (previous?.reportedCredits ?? 0) + (row.credits ?? 0), unknownTokenCalls: (previous?.unknownTokenCalls ?? 0) + (row.tokens === undefined ? 1 : 0), unknownCostCalls: (previous?.unknownCostCalls ?? 0) + (row.cost === undefined ? 1 : 0), unknownCreditCalls: (previous?.unknownCreditCalls ?? 0) + (row.credits === undefined ? 1 : 0), totalLatencyMs: (previous?.totalLatencyMs ?? 0) + row.latency, maxLatencyMs: Math.max(previous?.maxLatencyMs ?? 0, row.latency), updatedAt: Date.now() }
      if (previous) await ctx.db.patch(previous._id, totals)
      else await ctx.db.insert('providerUsageDaily', totals)
      await ctx.db.patch(row.id, { usageAggregatedAt: Date.now() })
    }
    return rows.length
  },
})
export const daily = query({
  args: { paginationOpts: paginationOptsValidator }, returns: paginationResultValidator(schema.doc('providerUsageDaily')),
  handler: async (ctx, args) => { await requireOwner(ctx); if (args.paginationOpts.numItems > 50) throw new Error('Use pages of at most 50.'); return ctx.db.query('providerUsageDaily').withIndex('by_day').order('desc').paginate(args.paginationOpts) },
})

export const recordRetrieval = internalMutation({
  args: { runId: v.id('pipelineRuns'), status: v.string(), creditsUsed: v.optional(v.number()), latencyMs: v.number() }, returns: v.null(),
  handler: async (ctx, args) => { await ctx.db.insert('retrievalProviderCalls', { ...args, createdAt: Date.now() }); return null },
})
