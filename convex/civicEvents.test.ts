/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { expect, test } from 'vitest'
import { api, internal } from './_generated/api'
import { recordConfirmedEvent } from './analytics/civic'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')

test('successful civic events deduplicate without retaining a resident identifier', async () => {
  const t = convexTest(schema, modules)
  await t.run(async ctx => {
    expect(await recordConfirmedEvent(ctx, 'ask_answered', 'private-receipt')).toBe(true)
    expect(await recordConfirmedEvent(ctx, 'ask_answered', 'private-receipt')).toBe(false)
    const receipts = await ctx.db.query('civicEventReceipts').collect()
    const counters = await ctx.db.query('civicEventCounters').collect()
    expect(receipts).toHaveLength(1)
    expect(JSON.stringify(receipts)).not.toContain('private-receipt')
    expect(counters[0].count).toBe(1)
    expect(Object.keys(receipts[0]).sort()).toEqual(['_creationTime', '_id', 'eventKey', 'expiresAt', 'kind'])
  })
})
test('monitoring, usage and demand reports are owner-only', async () => {
  const t = convexTest(schema, modules)
  await expect(t.query(api.operations.dashboard.monitoring, {})).rejects.toThrow()
  await expect(t.query(api.operations.dashboard.providerUsage, { kind: 'ask', paginationOpts: { numItems: 10, cursor: null } })).rejects.toThrow()
  await expect(t.query(api.operations.dashboard.demand, { paginationOpts: { numItems: 10, cursor: null } })).rejects.toThrow()
})

test('daily provider rollups retain unknown usage and never count a ledger row twice', async () => {
  const t = convexTest(schema, modules)
  await t.run(async ctx => {
    const userId = await ctx.db.insert('users', { email: 'owner@example.test', googleAccountId: 'rollup', emailVerified: true, createdAt: 1, updatedAt: 1, lastSignedInAt: 1 })
    const runId = await ctx.db.insert('coverageCompilerRuns', { bodyKey: 'test', jurisdictionSlug: 'test', rootManifestVersion: 'v1', compilerVersion: 'test', idempotencyKey: 'usage', attempt: 1, state: 'succeeded', requestedByUserId: userId, startedAt: 1 })
    const stageId = await ctx.db.insert('coverageCompilerStages', { runId, stage: 'discover_sources', idempotencyKey: 'usage-stage', inputHash: 'test', attempt: 1, state: 'succeeded', gateVersion: 'test', startedAt: 1 })
    for (const status of [...Array<string>(100).fill('succeeded'), 'failed']) await ctx.db.insert('coverageCompilerProviderCalls', { runId, stageId, requestHash: 'test', creditsReported: false, operation: 'test', provider: 'firecrawl', status, latencyMs: 50, createdAt: Date.now() })
  })
  expect(await t.mutation(internal.operations.usage.aggregate, { kind: 'compiler' })).toBe(100)
  expect(await t.mutation(internal.operations.usage.aggregate, { kind: 'compiler' })).toBe(1)
  expect(await t.mutation(internal.operations.usage.aggregate, { kind: 'compiler' })).toBe(0)
  await t.run(async ctx => {
    const row = await ctx.db.query('providerUsageDaily').first()
    expect(row).toMatchObject({ calls: 101, failures: 1, unknownCostCalls: 101, estimatedCostUsd: 0, totalLatencyMs: 5050 })
  })
})

test('retrieval rollups keep failed calls with unknown credits beside reported credits', async () => {
  const t = convexTest(schema, modules)
  await t.run(async ctx => {
    // IDs remain typed while this test exercises only the provider ledger.
    const runId = 'pipelineRuns:controlled' as import('./_generated/dataModel').Id<'pipelineRuns'>
    await ctx.db.insert('retrievalProviderCalls', { runId, status: 'succeeded', creditsUsed: 31, latencyMs: 100, createdAt: 1788560000000 })
    await ctx.db.insert('retrievalProviderCalls', { runId, status: 'failed', latencyMs: 50, createdAt: 1788560000000 })
  })
  expect(await t.mutation(internal.operations.usage.aggregate, { kind: 'retrieval' })).toBe(2)
  expect(await t.mutation(internal.operations.usage.aggregate, { kind: 'retrieval' })).toBe(0)
  await t.run(async ctx => {
    expect(await ctx.db.query('providerUsageDaily').first()).toMatchObject({ kind: 'retrieval', calls: 2, failures: 1, reportedCredits: 31, unknownCreditCalls: 1, unknownCostCalls: 2 })
  })
})
