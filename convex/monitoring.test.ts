/// <reference types="vite/client" />
import rateLimiterTest from '@convex-dev/rate-limiter/test'
import { DAY, RateLimiter, calculateRateLimit } from '@convex-dev/rate-limiter'
import { configurePolicy } from './monitoring/ledger'
import { convexTest } from 'convex-test'
import { afterEach, expect, test, vi } from 'vitest'
import { api, components, internal } from './_generated/api'
import { isBeforeSourceWindow, isDocumentUrl } from './monitoring/discovery'
import { inventoryContract } from './monitoring/contracts'
import type { InventoryResult } from './monitoring/contracts'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')
afterEach(() => vi.unstubAllEnvs())
const inventory: InventoryResult = { complete: true, bodyName: 'Test Council', sourceKind: 'agenda', meetingDate: '2026-09-04', dateExcerpt: 'September 4, 2026', targets: [{ printedId: '2026-14', title: 'Road repairs', excerpt: '2026-14 Road repairs' }] }
const text = 'Test Council. September 4, 2026. 2026-14 Road repairs'

test('inventory refuses fabricated locators, ambiguous items and invalid dates', () => {
  expect(inventoryContract(inventory, text, 'Test Council')).toBeNull()
  expect(inventoryContract({ ...inventory, targets: [{ ...inventory.targets[0], excerpt: 'Not in the source' }] }, text, 'Test Council')).toMatch(/citation/)
  expect(inventoryContract({ ...inventory, targets: [...inventory.targets, ...inventory.targets] }, text, 'Test Council')).toMatch(/duplicate/)
  expect(inventoryContract({ ...inventory, meetingDate: '2026-02-30' }, text, 'Test Council')).toMatch(/date/)
  expect(inventoryContract({ ...inventory, complete: false }, text, 'Test Council')).toMatch(/incomplete/)
  expect(inventoryContract({ ...inventory, targets: [{ ...inventory.targets[0], printedId: '2026-14\n', excerpt: '2026-14\n Road repairs' }] }, text, 'Test Council')).toMatch(/identifier/)
  expect(inventoryContract(inventory, text, 'Another Council')).toMatch(/body/)
})

test('monitoring controls and ledgers require the owner', async () => {
  const t = convexTest(schema, modules)
  await expect(t.query(api.monitoring.ledger.policies, { paginationOpts: { numItems: 10, cursor: null } })).rejects.toThrow()
  const userId = await t.run(ctx => ctx.db.insert('users', { email: 'resident@example.test', googleAccountId: 'monitoring-test', emailVerified: true, createdAt: 1, updatedAt: 1, lastSignedInAt: 1 }))
  await expect(t.withIdentity({ subject: userId }).query(api.monitoring.ledger.policies, { paginationOpts: { numItems: 10, cursor: null } })).rejects.toThrow()
})

test('deployment switch keeps scheduled monitoring dormant', async () => {
  vi.stubEnv('SOURCE_MONITORING_ENABLED', 'false')
  const t = convexTest(schema, modules)
  await t.mutation(internal.monitoring.ledger.tick, {})
  expect(await t.run(ctx => ctx.db.query('sourceMonitoringRuns').collect())).toEqual([])
})

async function monitoringFixture() {
  const t = convexTest(schema, modules)
  vi.stubEnv('SOURCE_MONITORING_ENABLED', 'true')
  const ids = await t.run(async ctx => {
    const jurisdictionId = await ctx.db.insert('jurisdictions', { name: 'Lafayette Parish', slug: 'lafayette-parish', state: 'LA', type: 'parish', publicStatus: 'supported' })
    const bodyId = await ctx.db.insert('governmentBodies', { jurisdictionId, name: 'Lafayette City Council', slug: 'lafayette-city-council', bodyType: 'city_council', publicStatus: 'supported' })
    const registryId = await ctx.db.insert('sourceRegistries', { governmentBodyId: bodyId, officialDomains: ['www.lafayettela.gov'], seedUrls: ['https://www.lafayettela.gov/agenda.pdf'], sourceKinds: ['agenda'], expectedCadence: { kind: 'monthly' }, discoveryMode: 'dynamic', status: 'supported', statusGeneration: 1 })
    const userId = await ctx.db.insert('users', { email: 'owner@example.test', googleAccountId: 'owner', emailVerified: true, createdAt: 1, updatedAt: 1, lastSignedInAt: 1 })
    const compilerRunId = await ctx.db.insert('coverageCompilerRuns', { bodyKey: 'lafayette-city-council', jurisdictionSlug: 'lafayette-parish', rootManifestVersion: 'v1', compilerVersion: 'test', idempotencyKey: 'monitor-test', attempt: 1, state: 'succeeded', requestedByUserId: userId, startedAt: 1 })
    const proposalId = await ctx.db.insert('coverageRegistryProposals', { runId: compilerRunId, governmentBodyId: bodyId, registryId, bodyKey: 'lafayette-city-council', proposalVersion: 1, status: 'promoted', rootManifestVersion: 'v1', goldSetVersion: 'test', evaluatorVersion: 'test', proposedDomains: ['www.lafayettela.gov'], proposedSeedUrls: ['https://www.lafayettela.gov/agenda.pdf'], proposedSourceKinds: ['agenda'], diffHash: 'test', diffSummary: [], createdAt: 1 })
    const policyId = await ctx.db.insert('sourceMonitoringPolicies', { registryId, proposalId, enabled: true, generation: 1, intervalHours: 24, documentsPerRun: 1, targetsPerRun: 1, dailyCallLimit: 10, startsAt: Date.now() - 86_400_000, activatedAt: Date.now(), baselineComplete: false, nextCheckAt: 0, failures: 0, createdAt: 1, updatedAt: 1 })
    const runId = await ctx.db.insert('sourceMonitoringRuns', { policyId, registryId, generation: 1, registryGeneration: 1, state: 'running', baseline: true, documentsChecked: 0, targetsStarted: 0, startedAt: Date.now() })
    await ctx.db.patch(policyId, { activeRunId: runId })
    return { registryId, policyId, runId, bodyId, proposalId, userId }
  })
  return { t, ...ids }
}

test('a failed document backs off so the next approved document can run', async () => {
  const { t, runId } = await monitoringFixture()
  await t.mutation(internal.monitoring.ledger.addDocuments, { runId, urls: ['https://www.lafayettela.gov/dead-agenda.pdf', 'https://www.lafayettela.gov/good-agenda.pdf', 'https://unapproved.example/agenda.pdf'] })
  const first = await t.query(internal.monitoring.ledger.dueDocuments, { runId })
  expect(first).toHaveLength(1)
  await t.mutation(internal.monitoring.ledger.deferDocument, { runId, documentId: first[0]._id })
  const next = await t.query(internal.monitoring.ledger.dueDocuments, { runId })
  expect(next).toHaveLength(1)
  expect(next[0]._id).not.toBe(first[0]._id)
  expect(await t.run(ctx => ctx.db.query('monitoredDocuments').collect())).toHaveLength(2)
})

test('pause invalidates in-flight monitoring and publication authority', async () => {
  const { t, runId, policyId, registryId } = await monitoringFixture()
  const pipelineId = await t.run(async ctx => {
    const id = await ctx.db.insert('pipelineRuns', { registryId, trigger: 'manual_extraction', state: 'running', processorVersion: 'test', startedAt: Date.now(), monitorPolicyId: policyId, monitorGeneration: 1, monitorRegistryGeneration: 1 })
    await ctx.db.patch(policyId, { enabled: false, generation: 2 })
    return id
  })
  await expect(t.query(internal.monitoring.ledger.context, { runId })).rejects.toThrow('monitoring_stopped')
  await expect(t.query(internal.monitoring.ledger.pipelineGuard, { runId: pipelineId })).rejects.toThrow('monitoring_stopped')
})

test('source window skips dated old archives and keeps opaque document links', () => {
  const start = Date.parse('2026-01-01')
  expect(isBeforeSourceWindow('https://rppj.com/2020-police-jury-meetings', start)).toBe(true)
  expect(isBeforeSourceWindow('https://rppj.com/wp-content/uploads/2026/08/agenda.pdf', start)).toBe(false)
  expect(isBeforeSourceWindow('https://rppj.com/agenda/2392', start)).toBe(false)
  expect(isDocumentUrl('https://www.brla.gov/AgendaCenter/ViewFile/Agenda/_08122026-2419')).toBe(true)
  expect(isDocumentUrl('https://rppj.com/2026-police-jury-meetings')).toBe(false)
})

test('changing a daily limit preserves admissions already used in the window', async () => {
  const { t, runId, policyId, proposalId } = await monitoringFixture()
  rateLimiterTest.register(t)
  expect(await t.mutation(internal.monitoring.ledger.reserve, { runId, units: 6 })).toBe(true)
  const rate = new RateLimiter(components.rateLimiter, {})
  for (const dailyCallLimit of [20, 10]) {
    await t.run(ctx => configurePolicy(ctx, { proposalId, enabled: true, intervalHours: 24, documentsPerRun: 1, targetsPerRun: 1, dailyCallLimit, startsAt: Date.now() - DAY }))
    const remaining = await t.run(async ctx => {
      const value = await rate.getValue(ctx, 'calls', { key: policyId, config: { kind: 'fixed window', rate: dailyCallLimit, period: DAY } })
      return calculateRateLimit(value, value.config).value
    })
    expect(remaining).toBe(dailyCallLimit - 6)
  }
})
