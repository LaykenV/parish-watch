import { DAY, RateLimiter, calculateRateLimit } from '@convex-dev/rate-limiter'
import { v } from 'convex/values'
import { paginationOptsValidator, paginationResultValidator } from 'convex/server'

import { components, internal } from '../_generated/api'
import type { Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { env, internalMutation, internalQuery, mutation, query } from '../_generated/server'
import { requireOwner } from '../auth/authorization'
import { extractionWorkflowManager } from '../pipeline/workflowManager'
import { isRegisteredSourceUrl } from '../sources/domains'
import { canonicalizeCandidateUrl } from '../coverage/candidates'
import { classifyHost } from '../coverage/rootGate'
import { resolveRootManifest } from '../coverage/roots'
import { sha256HexOfText } from '../sources/hashing'
import schema from '../schema'
import { isBeforeSourceWindow } from './discovery'
import { DAY_MS, inventoryIdentity, inventoryResult, isBeforeMeetingWindow, MONITOR_VERSION, monitorState } from './contracts'

const limiter = new RateLimiter(components.rateLimiter, {
  globalCalls: { kind: 'fixed window', rate: 1_000, period: DAY },
})

export async function assertMonitoringRun(ctx: Pick<QueryCtx, 'db'>, runId: Id<'sourceMonitoringRuns'>) {
  const run = await ctx.db.get(runId)
  const policy = run ? await ctx.db.get(run.policyId) : null
  const registry = run ? await ctx.db.get(run.registryId) : null
  const proposal = policy ? await ctx.db.get(policy.proposalId) : null
  const body = registry ? await ctx.db.get(registry.governmentBodyId) : null
  if (env.SOURCE_MONITORING_ENABLED !== 'true' || !run || run.state !== 'running' || !policy?.enabled ||
      policy.activeRunId !== run._id || policy.generation !== run.generation ||
      !registry || (registry.status !== 'supported' && registry.status !== 'degraded') ||
      (registry.statusGeneration ?? 0) !== run.registryGeneration ||
      proposal?.status !== 'promoted' || !body || body.publicStatus === 'paused') {
    throw new Error('monitoring_stopped')
  }
  return { run, policy, registry, proposal, body }
}

export async function assertPipelineMonitoring(ctx: Pick<QueryCtx, 'db'>, runId: Id<'pipelineRuns'>) {
  const run = await ctx.db.get(runId)
  if (!run?.monitorPolicyId) return
  const policy = await ctx.db.get(run.monitorPolicyId)
  const registry = policy ? await ctx.db.get(policy.registryId) : null
  const proposal = policy ? await ctx.db.get(policy.proposalId) : null
  const body = registry ? await ctx.db.get(registry.governmentBodyId) : null
  if (env.SOURCE_MONITORING_ENABLED !== 'true' || !policy?.enabled || policy.generation !== run.monitorGeneration ||
      !registry || (registry.status !== 'supported' && registry.status !== 'degraded') ||
      proposal?.status !== 'promoted' || body?.publicStatus === 'paused' ||
      (registry.statusGeneration ?? 0) !== run.monitorRegistryGeneration) throw new Error('monitoring_stopped')
}

const configureArgs = {
  proposalId: v.id('coverageRegistryProposals'), enabled: v.boolean(),
  intervalHours: v.number(), documentsPerRun: v.number(), targetsPerRun: v.number(),
  dailyCallLimit: v.number(), startsAt: v.number(),
}
export const configure = mutation({
  args: configureArgs, returns: v.id('sourceMonitoringPolicies'),
  handler: async (ctx, args) => {
    await requireOwner(ctx)
    return configurePolicy(ctx, args)
  },
})
export async function configurePolicy(ctx: MutationCtx, args: { proposalId: Id<'coverageRegistryProposals'>; enabled: boolean; intervalHours: number; documentsPerRun: number; targetsPerRun: number; dailyCallLimit: number; startsAt: number }): Promise<Id<'sourceMonitoringPolicies'>> {
  const proposal = await ctx.db.get(args.proposalId)
  const registry = proposal ? await ctx.db.get(proposal.registryId) : null
  if (!proposal || proposal.status !== 'promoted' || !registry || !['supported', 'degraded'].includes(registry.status)) throw new Error('Only a promoted registry can be monitored.')
  if (args.enabled && env.SOURCE_MONITORING_ENABLED !== 'true') throw new Error('Source monitoring has not been enabled for this deployment.')
  for (const [value, min, max] of [[args.intervalHours, 1, 168], [args.documentsPerRun, 1, 10], [args.targetsPerRun, 1, 20], [args.dailyCallLimit, 10, 500]]) {
    if (!Number.isInteger(value) || value < min || value > max) throw new Error('Monitoring limits are outside the allowed bounds.')
  }
  const manifest = resolveRootManifest(proposal.bodyKey, proposal.rootManifestVersion)
  if (!manifest) throw new Error('Approved root manifest is missing.')
  await ctx.db.patch(registry._id, { approvedDocumentHosts: manifest.documentHosts })
  const now = Date.now()
  if (!Number.isFinite(args.startsAt) || (args.enabled && args.startsAt < now - 366 * DAY_MS) || args.startsAt > now) throw new Error('Choose an explicit source window within the previous year.')
  const existing = await ctx.db.query('sourceMonitoringPolicies').withIndex('by_registry_id', q => q.eq('registryId', registry._id)).unique()
  const fields = { ...args, registryId: registry._id, generation: (existing?.generation ?? 0) + 1, nextCheckAt: now, activeRunId: undefined, updatedAt: now }
  if (existing) {
    if (existing.dailyCallLimit !== args.dailyCallLimit) {
      const prior = await limiter.getValue(ctx, 'calls', { key: existing._id, config: { kind: 'fixed window', rate: existing.dailyCallLimit, period: DAY } })
      const current = calculateRateLimit(prior, prior.config, now)
      const used = Math.max(0, existing.dailyCallLimit - current.value)
      if (used > args.dailyCallLimit) throw new Error('The new daily limit is below calls already used in this window. Wait for the next window or choose a higher limit.')
      await limiter.reset(ctx, 'calls', { key: existing._id })
      await limiter.limit(ctx, 'calls', { key: existing._id, count: used, config: { kind: 'fixed window', rate: args.dailyCallLimit, period: DAY, start: current.ts }, throws: true })
    }
    const sourceWindowChanged = existing.startsAt !== args.startsAt || existing.proposalId !== args.proposalId
    await ctx.db.patch(existing._id, { ...fields, ...(sourceWindowChanged ? { discoveryPendingUrls: undefined, discoveryVisitedUrls: undefined, nextDiscoveryAt: undefined, baselineComplete: false } : {}) })
    return existing._id
  }
  return await ctx.db.insert('sourceMonitoringPolicies', { ...fields, activatedAt: now, baselineComplete: false, failures: 0, createdAt: now })
}

export const policies = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(schema.doc('sourceMonitoringPolicies')),
  handler: async (ctx, args) => {
    await requireOwner(ctx)
    return ctx.db.query('sourceMonitoringPolicies').withIndex('by_registry_id').paginate(args.paginationOpts)
  },
})
export const runs = query({
  args: { policyId: v.id('sourceMonitoringPolicies') }, returns: v.array(schema.doc('sourceMonitoringRuns')),
  handler: async (ctx, args) => {
    await requireOwner(ctx)
    return ctx.db.query('sourceMonitoringRuns').withIndex('by_policy_id_and_started_at', q => q.eq('policyId', args.policyId)).order('desc').take(20)
  },
})
export const checkNow = mutation({
  args: { policyId: v.id('sourceMonitoringPolicies') }, returns: v.union(v.id('sourceMonitoringRuns'), v.null()),
  handler: async (ctx, args) => { await requireOwner(ctx); return startRun(ctx, args.policyId) },
})
export const tick = internalMutation({
  args: {}, returns: v.null(),
  handler: async ctx => {
    if (env.SOURCE_MONITORING_ENABLED !== 'true') return null
    const policies = await ctx.db.query('sourceMonitoringPolicies').withIndex('by_enabled_and_next_check_at', q => q.eq('enabled', true).lte('nextCheckAt', Date.now())).take(5)
    for (const policy of policies) await startRun(ctx, policy._id)
    return null
  },
})
async function startRun(ctx: MutationCtx, policyId: Id<'sourceMonitoringPolicies'>): Promise<Id<'sourceMonitoringRuns'> | null> {
  let policy = await ctx.db.get(policyId)
  if (!policy?.enabled || env.SOURCE_MONITORING_ENABLED !== 'true') return null
  const now = Date.now()
  if (policy.activeRunId) {
    const active = await ctx.db.get(policy.activeRunId)
    if (active?.state === 'running' && active.startedAt > now - 2 * 3_600_000) return active._id
    if (active?.state === 'running') {
      await ctx.db.patch(active._id, { state: 'failed', errorClass: 'monitoring_lease_expired', completedAt: now })
      policy = { ...policy, generation: policy.generation + 1 }
      await ctx.db.patch(policy._id, { generation: policy.generation, activeRunId: undefined, updatedAt: now })
      await recordIncident(ctx, policy.registryId, 'monitoring_lease_expired')
    }
  }
  const registry = await ctx.db.get(policy.registryId)
  const proposal = await ctx.db.get(policy.proposalId)
  if (!registry || !['supported', 'degraded'].includes(registry.status) || proposal?.status !== 'promoted') {
    await ctx.db.patch(policyId, { enabled: false, generation: policy.generation + 1, updatedAt: now })
    return null
  }
  const runId = await ctx.db.insert('sourceMonitoringRuns', {
    policyId, registryId: registry._id, generation: policy.generation,
    registryGeneration: registry.statusGeneration ?? 0, state: 'running',
    baseline: !policy.baselineComplete, documentsChecked: 0, targetsStarted: 0, startedAt: now,
  })
  await ctx.db.patch(policyId, { activeRunId: runId, lastAttemptAt: now, nextCheckAt: now + policy.intervalHours * 3_600_000, updatedAt: now })
  const workflowId = await extractionWorkflowManager.start(ctx, internal.monitoring.workflow.checkSources, { runId }, {
    onComplete: internal.monitoring.workflow.completed, context: { runId },
  })
  await ctx.db.patch(runId, { workflowId })
  return runId
}

export const context = internalQuery({
  args: { runId: v.id('sourceMonitoringRuns') },
  returns: v.object({ run: schema.doc('sourceMonitoringRuns'), policy: schema.doc('sourceMonitoringPolicies'), registry: schema.doc('sourceRegistries'), proposal: schema.doc('coverageRegistryProposals'), body: schema.doc('governmentBodies') }),
  handler: async (ctx, args) => assertMonitoringRun(ctx, args.runId),
})
export const pipelineGuard = internalQuery({
  args: { runId: v.id('pipelineRuns') }, returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => { await assertPipelineMonitoring(ctx, args.runId); return (await ctx.db.get(args.runId))?.targetLocator ?? null },
})
export const reserve = internalMutation({
  args: { runId: v.id('sourceMonitoringRuns'), units: v.number() }, returns: v.boolean(),
  handler: async (ctx, args) => {
    const { policy } = await assertMonitoringRun(ctx, args.runId)
    if (!Number.isInteger(args.units) || args.units < 1 || args.units > 10) throw new Error('Invalid monitoring reservation.')
    const options = { key: policy._id, count: args.units, config: { kind: 'fixed window' as const, rate: policy.dailyCallLimit, period: DAY } }
    if (!(await limiter.check(ctx, 'calls', options)).ok || !(await limiter.check(ctx, 'globalCalls', { count: args.units })).ok) return false
    await limiter.limit(ctx, 'calls', { ...options, throws: true })
    await limiter.limit(ctx, 'globalCalls', { count: args.units, throws: true })
    return true
  },
})
export const addDocuments = internalMutation({
  args: { runId: v.id('sourceMonitoringRuns'), urls: v.array(v.string()) }, returns: v.number(),
  handler: async (ctx, args) => {
    const { run, registry, proposal, body, policy } = await assertMonitoringRun(ctx, args.runId)
    if (args.urls.length > 100) throw new Error('Listing page overflow.')
    const manifest = resolveRootManifest(body.slug, proposal.rootManifestVersion)
    if (!manifest) throw new Error('Approved root manifest is missing.')
    let count = 0
    for (const raw of args.urls) {
      const url = canonicalizeCandidateUrl(raw)
      if (!url || isBeforeSourceWindow(url, policy.startsAt) || classifyHost(manifest, url) === 'unapproved' || !isRegisteredSourceUrl(url, registry.officialDomains, registry.seedUrls, registry.approvedDocumentHosts)) continue
      const existing = await ctx.db.query('monitoredDocuments').withIndex('by_policy_id_and_url', q => q.eq('policyId', run.policyId).eq('canonicalUrl', url)).unique()
      if (!existing) {
        await ctx.db.insert('monitoredDocuments', { policyId: run.policyId, registryId: registry._id, canonicalUrl: url, nextCheckAt: 0, firstSeenAt: Date.now(), notificationEligible: !run.baseline, inventoryComplete: false })
        count++
      }
    }
    return count
  },
})
export const saveDiscoveryProgress = internalMutation({
  args: { runId: v.id('sourceMonitoringRuns'), pending: v.array(v.string()), visited: v.array(v.string()) }, returns: v.null(),
  handler: async (ctx, args) => {
    const { policy, proposal } = await assertMonitoringRun(ctx, args.runId)
    const manifest = resolveRootManifest(proposal.bodyKey, proposal.rootManifestVersion)
    if (!manifest || args.pending.length + args.visited.length > 500 || [...args.pending, ...args.visited].some(url => url.length > 1500 || classifyHost(manifest, url) === 'unapproved' || isBeforeSourceWindow(url, policy.startsAt))) throw new Error('monitoring_listing_capacity')
    await ctx.db.patch(policy._id, { discoveryPendingUrls: args.pending.length ? args.pending : undefined, discoveryVisitedUrls: args.pending.length ? args.visited : undefined, nextDiscoveryAt: args.pending.length ? undefined : Date.now() + policy.intervalHours * 3_600_000 })
    return null
  },
})
export const dueDocuments = internalQuery({
  args: { runId: v.id('sourceMonitoringRuns') }, returns: v.array(schema.doc('monitoredDocuments')),
  handler: async (ctx, args) => {
    const { policy, run } = await assertMonitoringRun(ctx, args.runId)
    return ctx.db.query('monitoredDocuments').withIndex('by_policy_id_and_next_check_at', q => q.eq('policyId', policy._id).lte('nextCheckAt', run.startedAt)).take(policy.documentsPerRun)
  },
})
export const documentContext = internalQuery({
  args: { runId: v.id('sourceMonitoringRuns'), documentId: v.id('monitoredDocuments') },
  returns: v.object({ document: schema.doc('monitoredDocuments'), snapshot: v.union(schema.doc('sourceSnapshots'), v.null()), bodyName: v.string() }),
  handler: async (ctx, args) => {
    const { policy, body } = await assertMonitoringRun(ctx, args.runId)
    const document = await ctx.db.get(args.documentId)
    if (!document || document.policyId !== policy._id) throw new Error('Monitoring document mismatch.')
    return { document, snapshot: document.snapshotId ? await ctx.db.get(document.snapshotId) : null, bodyName: body.name }
  },
})
export const priorInventoryTargets = internalQuery({
  args: { runId: v.id('sourceMonitoringRuns'), documentId: v.id('monitoredDocuments') },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    const { policy } = await assertMonitoringRun(ctx, args.runId)
    const document = await ctx.db.get(args.documentId)
    if (!document || document.policyId !== policy._id || !document.snapshotId) throw new Error('Monitoring document mismatch.')
    const targets = await ctx.db.query('documentInventoryTargets').withIndex('by_document_id_and_snapshot_id', q => q.eq('documentId', document._id).eq('snapshotId', document.snapshotId!)).take(1001)
    const locators = targets.map(target => target.locator)
    if (targets.length > 1000 || JSON.stringify(locators).length > 250_000) throw new Error('monitoring_inventory_history_capacity')
    return locators
  },
})
export const setSnapshot = internalMutation({
  args: { runId: v.id('sourceMonitoringRuns'), documentId: v.id('monitoredDocuments'), snapshotId: v.id('sourceSnapshots') },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const { policy } = await assertMonitoringRun(ctx, args.runId)
    const document = await ctx.db.get(args.documentId)
    const snapshot = await ctx.db.get(args.snapshotId)
    if (!document || document.policyId !== policy._id || !snapshot || snapshot.registryId !== policy.registryId || snapshot.canonicalUrl !== document.canonicalUrl || snapshot.truncation.truncated || snapshot.contentHashBasis !== 'raw_artifact_v2') throw new Error('Monitoring snapshot mismatch.')
    const sameContent = document.normalizedHash === snapshot.normalizedContentHash && document.inventoryVersion === MONITOR_VERSION
    const reused = sameContent && document.inventoryComplete
    await ctx.db.patch(document._id, { snapshotId: sameContent ? document.snapshotId : snapshot._id, notificationEligible: sameContent ? document.notificationEligible : policy.baselineComplete, normalizedHash: snapshot.normalizedContentHash, inventoryVersion: MONITOR_VERSION, inventoryComplete: reused, completedChunks: sameContent ? document.completedChunks : 0, lastCheckedAt: Date.now(), nextCheckAt: Date.now() + policy.intervalHours * 3_600_000, errorClass: undefined })
    await ctx.db.patch(policy._id, { lastRetrievalAt: Date.now() })
    return reused
  },
})
export const saveInventory = internalMutation({
  args: { runId: v.id('sourceMonitoringRuns'), documentId: v.id('monitoredDocuments'), chunk: v.number(), chunks: v.number(), inventory: inventoryResult }, returns: v.number(),
  handler: async (ctx, args) => {
    const { policy, registry } = await assertMonitoringRun(ctx, args.runId)
    const document = await ctx.db.get(args.documentId)
    if (!document || document.policyId !== policy._id || !document.snapshotId) throw new Error('Monitoring document mismatch.')
    if (!Number.isInteger(args.chunk) || !Number.isInteger(args.chunks) || args.chunks < 1 || args.chunks > 12 || args.chunk < 0 || args.chunk >= args.chunks) throw new Error('Invalid inventory chunk.')
    if (!args.inventory.complete || (args.inventory.targets.length > 0 && !registry.sourceKinds.includes(args.inventory.sourceKind))) throw new Error('Inventory is not complete or its source kind is not registered.')
    if ((document.completedChunks ?? 0) > args.chunk) return 0
    if ((document.completedChunks ?? 0) !== args.chunk) throw new Error('Inventory chunk order mismatch.')
    let added = 0
    for (const target of args.inventory.targets) {
      const date = args.inventory.meetingDate
      if (!date || isBeforeMeetingWindow(date, policy.startsAt) || Date.parse(date) > Date.now() + 366 * DAY_MS) continue
      const { key, sourcePrinted: hasYear } = inventoryIdentity(date, target)
      const targetKey = await sha256HexOfText(key)
      const existing = await ctx.db.query('documentInventoryTargets').withIndex('by_snapshot_id_and_target_key', q => q.eq('snapshotId', document.snapshotId!).eq('targetKey', targetKey)).unique()
      if (existing) continue
      const targetRecordId = hasYear ? target.printedId! : `AUTO-${date}-${targetKey.slice(0,20)}`
      await ctx.db.insert('documentInventoryTargets', {
        documentId: document._id, snapshotId: document.snapshotId, policyId: policy._id, registryId: policy.registryId,
        targetKey, targetRecordId, locator: target.excerpt,
        sourceRecordIdProvenance: hasYear ? 'source_printed' : 'operator_assigned',
        sourceKind: args.inventory.sourceKind, meetingDate: date, state: 'pending',
        notificationEligible: document.notificationEligible && Date.parse(date) >= new Date(policy.activatedAt).setUTCHours(0, 0, 0, 0), createdAt: Date.now(), updatedAt: Date.now(),
      })
      added++
    }
    if (args.inventory.targets.length && args.inventory.meetingDate) {
      const observedAt = Date.parse(args.inventory.meetingDate)
      const expectations = await ctx.db.query('sourceExpectations').withIndex('by_registry_and_source_kind', q => q.eq('registryId', registry._id).eq('sourceKind', args.inventory.sourceKind)).take(30)
      for (const expectation of expectations) {
        const days = expectation.cadence === 'daily' ? 1 : expectation.cadence === 'weekly' ? 7 : expectation.cadence === 'monthly' ? 31 : null
        if (days && observedAt <= Date.now() && observedAt + days * DAY_MS > (expectation.expectedFrom ?? 0)) await ctx.db.patch(expectation._id, { expectedFrom: observedAt + days * DAY_MS, expectedBy: observedAt + (days + 7) * DAY_MS, matchedSnapshotId: document.snapshotId, basis: 'inferred' })
      }
    }
    await ctx.db.patch(document._id, { completedChunks: args.chunk + 1, chunkCount: args.chunks, inventoryComplete: args.chunk + 1 === args.chunks, ...(args.chunk + 1 === args.chunks ? { nextCheckAt: Date.now() + policy.intervalHours * 3_600_000 } : {}) })
    return added
  },
})
export const dispatchTargets = internalMutation({
  args: { runId: v.id('sourceMonitoringRuns') }, returns: v.number(),
  handler: async (ctx, args) => {
    const { policy } = await assertMonitoringRun(ctx, args.runId)
    const targets = await ctx.db.query('documentInventoryTargets').withIndex('by_policy_state_and_retry', q => q.eq('policyId', policy._id).eq('state', 'pending').lte('retryAt', Date.now())).take(policy.targetsPerRun)
    let started = 0
    for (const target of targets) {
      if ((target.retryAt ?? 0) > Date.now()) continue
      const document = await ctx.db.get(target.documentId)
      if (!document?.inventoryComplete) continue
      if (document.snapshotId !== target.snapshotId) {
        await ctx.db.patch(target._id, { state: 'failed', updatedAt: Date.now() })
        continue
      }
      try {
      const result = await ctx.runMutation(internal.operations.extract.startSnapshotExtraction, {
        registryId: target.registryId, snapshotId: target.snapshotId, sourceKind: target.sourceKind,
        targetRecordId: target.targetRecordId, sourceRecordIdProvenance: target.sourceRecordIdProvenance,
        monitorTargetId: target._id,
      })
      await ctx.db.patch(target._id, { pipelineRunId: result.runId, state: 'running', attempts: (target.attempts ?? 0) + 1, retryAt: undefined, updatedAt: Date.now() })
      started++
      } catch (error) {
        if (String(error).includes('monitoring_stopped')) throw error
        const attempts = (target.attempts ?? 0) + 1
        await ctx.db.patch(target._id, { state: attempts < 3 ? 'pending' : 'failed', attempts, retryAt: Date.now() + DAY_MS, updatedAt: Date.now() })
      }
    }
    return started
  },
})
export const finish = internalMutation({
  args: { runId: v.id('sourceMonitoringRuns'), state: monitorState, documentsChecked: v.number(), targetsStarted: v.number(), errorClass: v.optional(v.string()) }, returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId)
    if (!run || run.state !== 'running') return null
    const policy = await ctx.db.get(run.policyId)
    const now = Date.now()
    await ctx.db.patch(run._id, { state: args.state, documentsChecked: args.documentsChecked, targetsStarted: args.targetsStarted, errorClass: args.errorClass, completedAt: now })
    if (policy?.activeRunId === run._id && policy.generation === run.generation) {
      const remaining = await ctx.db.query('monitoredDocuments').withIndex('by_policy_id_and_next_check_at', q => q.eq('policyId', policy._id).lte('nextCheckAt', run.startedAt)).first()
      const pending = await ctx.db.query('documentInventoryTargets').withIndex('by_policy_id_and_state', q => q.eq('policyId', policy._id).eq('state', 'pending')).first()
      const unfinished = await ctx.db.query('monitoredDocuments').withIndex('by_policy_id_and_inventory_complete', q => q.eq('policyId', policy._id).eq('inventoryComplete', false)).first()
      const listingPending = Boolean(policy.discoveryPendingUrls?.length)
      const running = await ctx.db.query('documentInventoryTargets').withIndex('by_policy_id_and_state', q => q.eq('policyId', policy._id).eq('state', 'running')).first()
      const expectations = await ctx.db.query('sourceExpectations').withIndex('by_registry_and_source_kind', q => q.eq('registryId', policy.registryId)).take(30)
      const overdue = expectations.some(item => item.expectedBy !== undefined && item.expectedBy < now)
      const healthy = args.state === 'completed' && !overdue
      const budgetPaused = args.errorClass === 'monitoring_daily_limit'
      await ctx.db.patch(policy._id, { activeRunId: undefined, baselineComplete: policy.baselineComplete || (healthy && !remaining && !unfinished && !pending && !running && !listingPending), nextCheckAt: now + (remaining || pending || running || listingPending || !healthy ? 900_000 : policy.intervalHours * 3_600_000), failures: healthy ? 0 : budgetPaused || args.state === 'stopped' ? policy.failures : policy.failures + 1, ...(healthy && !remaining && !unfinished && !pending && !running && !listingPending ? { lastCompletedAt: now } : {}), updatedAt: now })
      if (!healthy && !budgetPaused && args.state !== 'stopped') await recordIncident(ctx, policy.registryId, overdue ? 'expected_artifact_missing' : args.errorClass ?? 'monitoring_failed')
    }
    return null
  },
})
async function recordIncident(ctx: MutationCtx, registryId: Id<'sourceRegistries'>, code: string) {
  const now = Date.now()
  const prior = await ctx.db.query('coverageIncidents').withIndex('by_registry_id_and_state', q => q.eq('registryId', registryId).eq('state', 'open')).first()
  if (prior) await ctx.db.patch(prior._id, { lastSeenAt: now, attempts: prior.attempts + 1 })
  else await ctx.db.insert('coverageIncidents', { registryId, code, state: 'open', summary: 'A scheduled source check could not complete. Dated accepted evidence remains available.', firstSeenAt: now, lastSeenAt: now, attempts: 1 })
  if (prior && prior.attempts >= 2) {
    const registry = await ctx.db.get(registryId)
    if (registry?.status === 'supported') {
      await ctx.db.patch(registryId, { status: 'degraded', statusGeneration: (registry.statusGeneration ?? 0) + 1 })
      await ctx.db.patch(registry.governmentBodyId, { publicStatus: 'degraded' })
      const body = await ctx.db.get(registry.governmentBodyId)
      const jurisdiction = body ? await ctx.db.get(body.jurisdictionId) : null
      if (jurisdiction?.publicStatus === 'supported') await ctx.db.patch(jurisdiction._id, { publicStatus: 'degraded' })
    }
  }
}
export const recordCall = internalMutation({
  args: { runId: v.id('sourceMonitoringRuns'), operation: v.string(), provider: v.string(), status: v.string(), modelId: v.optional(v.string()), modelRole: v.optional(v.union(v.literal('MODEL_STRONG'), v.literal('MODEL_FAST'))), promptTokens: v.optional(v.number()), completionTokens: v.optional(v.number()), estimatedCostUsd: v.optional(v.number()), creditsUsed: v.optional(v.number()), errorClass: v.optional(v.string()), errorDetail: v.optional(v.string()), latencyMs: v.number() },
  returns: v.null(), handler: async (ctx, args) => { await ctx.db.insert('monitoringProviderCalls', { ...args, createdAt: Date.now() }); return null },
})

export const reservePipelineCall = internalMutation({
  args: { runId: v.id('pipelineRuns') }, returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    await assertPipelineMonitoring(ctx, args.runId)
    const run = await ctx.db.get(args.runId)
    if (!run?.monitorPolicyId) return null
    const policy = await ctx.db.get(run.monitorPolicyId)
    if (!policy) throw new Error('monitoring_stopped')
    const options = { key: policy._id, count: 2, config: { kind: 'fixed window' as const, rate: policy.dailyCallLimit, period: DAY } }
    if (!(await limiter.check(ctx, 'calls', options)).ok || !(await limiter.check(ctx, 'globalCalls', { count: 2 })).ok) throw new Error('monitoring_daily_limit')
    await limiter.limit(ctx, 'calls', { ...options, throws: true })
    await limiter.limit(ctx, 'globalCalls', { count: 2, throws: true })
    return run.targetLocator ?? null
  },
})

export const reconcileTargets = internalMutation({
  args: { policyId: v.id('sourceMonitoringPolicies') }, returns: v.null(),
  handler: async (ctx, args) => {
    const targets = await ctx.db.query('documentInventoryTargets').withIndex('by_policy_id_and_state', q => q.eq('policyId', args.policyId).eq('state', 'running')).take(100)
    for (const target of targets) {
      const run = target.pipelineRunId ? await ctx.db.get(target.pipelineRunId) : null
      if (!run || run.state === 'failed_retryable' || run.state === 'failed_terminal' || run.state === 'superseded') {
        await ctx.db.patch(target._id, { state: (target.attempts ?? 1) < 3 ? 'pending' : 'failed', retryAt: Date.now() + DAY_MS, updatedAt: Date.now() })
        continue
      }
      if (run.state !== 'succeeded') continue
      const extraction = await ctx.db.query('extractions').withIndex('by_run', q => q.eq('runId', run._id)).unique()
      if (extraction?.state === 'not_found') {
        await ctx.db.patch(target._id, { state: 'not_found', updatedAt: Date.now() })
        continue
      }
      if (!extraction?.candidateId) continue
      const versions = await ctx.db.query('publicationVersions').withIndex('by_candidate', q => q.eq('candidateId', extraction.candidateId!)).order('desc').first()
      const version = versions
      if (!version) {
        const publication = await ctx.db.query('pipelineRuns').withIndex('by_upstream_run', q => q.eq('upstreamRunId', run._id)).order('desc').first()
        if (publication?.state === 'failed_terminal' || publication?.state === 'failed_retryable' || publication?.state === 'superseded' || (!publication && (run.completedAt ?? 0) < Date.now() - DAY_MS)) await ctx.db.patch(target._id, { state: (target.attempts ?? 1) < 3 ? 'pending' : 'failed', retryAt: Date.now() + DAY_MS, updatedAt: Date.now() })
      }
      if (version) await ctx.db.patch(target._id, { state: version.mode === 'withheld' ? 'withheld' : 'published', updatedAt: Date.now() })
    }
    return null
  },
})

export const deferDocument = internalMutation({
  args: { runId: v.id('sourceMonitoringRuns'), documentId: v.id('monitoredDocuments') }, returns: v.null(),
  handler: async (ctx, args) => {
    const { policy } = await assertMonitoringRun(ctx, args.runId)
    const document = await ctx.db.get(args.documentId)
    if (!document || document.policyId !== policy._id) throw new Error('Monitoring document mismatch.')
    await ctx.db.patch(document._id, { nextCheckAt: Date.now() + Math.max(DAY_MS, policy.intervalHours * 3_600_000), errorClass: 'source_check_incomplete' })
    return null
  },
})
export const retryTarget = mutation({
  args: { targetId: v.id('documentInventoryTargets') }, returns: v.boolean(),
  handler: async (ctx, args) => {
    await requireOwner(ctx)
    const target = await ctx.db.get(args.targetId)
    if (!target || target.state !== 'failed') return false
    const policy = await ctx.db.get(target.policyId)
    const document = await ctx.db.get(target.documentId)
    if (!policy?.enabled || document?.snapshotId !== target.snapshotId || !document.inventoryComplete) return false
    await ctx.db.patch(target._id, { state: 'pending', attempts: 0, retryAt: undefined, updatedAt: Date.now() })
    await ctx.db.patch(policy._id, { nextCheckAt: Date.now() })
    return true
  },
})

export const discoveryAttention = internalMutation({
  args: { runId: v.id('sourceMonitoringRuns'), code: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    const { registry } = await assertMonitoringRun(ctx, args.runId)
    await recordIncident(ctx, registry._id, args.code)
    return null
  },
})

export const retryDocument = mutation({
  args: { documentId: v.id('monitoredDocuments') }, returns: v.boolean(),
  handler: async (ctx, args) => {
    await requireOwner(ctx)
    const document = await ctx.db.get(args.documentId)
    const policy = document ? await ctx.db.get(document.policyId) : null
    if (!document || !policy?.enabled) return false
    await ctx.db.patch(document._id, { nextCheckAt: 0, errorClass: undefined })
    return true
  },
})
