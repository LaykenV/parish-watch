/// <reference types="vite/client" />

import { convexTest } from 'convex-test'
import type { TestConvexForDataModelAndIdentity } from 'convex-test'
import { afterEach, expect, test, vi } from 'vitest'

import { api, internal } from './_generated/api'
import type { DataModel } from './_generated/dataModel'
import { COVERAGE_EVALUATOR_VERSION } from './coverage/gates'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')
type TestConvex = TestConvexForDataModelAndIdentity<DataModel>

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

test('ten passing gates promote once and preserve the previous registry', async () => {
  const t = convexTest(schema, modules)
  const owner = await signInOwner(t)
  const seeded = await seedReadyProposal(t, true)

  const [first, second] = await Promise.all([
    owner.mutation(api.coverage.promotion.confirmPromotion, {
      proposalId: seeded.proposalId,
    }),
    owner.mutation(api.coverage.promotion.confirmPromotion, {
      proposalId: seeded.proposalId,
    }),
  ])
  expect([first.replayed, second.replayed].sort()).toEqual([false, true])

  await t.run(async (ctx) => {
    expect((await ctx.db.get(seeded.bodyId))?.publicStatus).toBe('supported')
    expect((await ctx.db.get(seeded.registryId))?.status).toBe('supported')
    expect((await ctx.db.get(seeded.previousRegistryId))?.status).toBe('paused')
  })

  const firstPage = await owner.query(api.coverage.operations.paginatedRuns, {
    paginationOpts: { numItems: 1, cursor: null },
  })
  expect(firstPage.page).toHaveLength(1)
  expect(firstPage.page[0].runId).toBe(seeded.runId)
  const ownerView = await owner.query(api.coverage.operations.run, {
    runId: seeded.runId,
  })
  expect(ownerView?.proposals[0].samples).toEqual([
    {
      sourceKind: 'agenda',
      role: 'current',
      state: 'failed_terminal',
      canonicalUrl: null,
      errorClass: 'missing_required_candidate',
    },
  ])
  expect(ownerView?.proposals[0].samples[0]).not.toHaveProperty('snapshotId')

  await expect(
    owner.mutation(api.coverage.promotion.setCoverageStatus, {
      proposalId: seeded.proposalId,
      status: 'degraded',
    }),
  ).resolves.toEqual({ changed: true, recovered: false })
  await expect(
    owner.mutation(api.coverage.promotion.setCoverageStatus, {
      proposalId: seeded.proposalId,
      status: 'supported',
    }),
  ).rejects.toThrow('cannot recover')

  await expect(
    owner.mutation(api.coverage.validation.reevaluate, {
      proposalId: seeded.proposalId,
    }),
  ).resolves.toEqual({ started: true })
  await drainScheduled(t)
  await t.run(async (ctx) => {
    expect((await ctx.db.get(seeded.proposalId))?.status).toBe('promoted')
  })
  await expect(
    owner.mutation(api.coverage.promotion.setCoverageStatus, {
      proposalId: seeded.proposalId,
      status: 'supported',
    }),
  ).rejects.toThrow('cannot recover')

  await t.run(async (ctx) => {
    const generation =
      (await ctx.db.get(seeded.registryId))?.statusGeneration ?? 0
    for (let gateNumber = 1; gateNumber <= 10; gateNumber += 1) {
      await ctx.db.insert('coverageGateEvaluations', {
        proposalId: seeded.proposalId,
        gateNumber,
        gateKey: `gate_${gateNumber}`,
        passed: true,
        detail: 'Fresh test evidence.',
        evidenceRefs: ['test'],
        evaluatorVersion: COVERAGE_EVALUATOR_VERSION,
        registryStatusGeneration: generation,
        createdAt: Date.now(),
      })
    }
  })
  await expect(
    owner.mutation(api.coverage.promotion.setCoverageStatus, {
      proposalId: seeded.proposalId,
      status: 'supported',
    }),
  ).resolves.toEqual({ changed: true, recovered: true })

  await t.run(async (ctx) => {
    expect(await ctx.db.get(seeded.previousRegistryId)).not.toBeNull()
    expect((await ctx.db.get(seeded.bodyId))?.publicStatus).toBe('supported')
  })
})

test('one failed gate cannot be overridden by owner confirmation', async () => {
  const t = convexTest(schema, modules)
  const owner = await signInOwner(t)
  const seeded = await seedReadyProposal(t, false)

  await expect(
    owner.mutation(api.coverage.promotion.confirmPromotion, {
      proposalId: seeded.proposalId,
    }),
  ).rejects.toThrow('cannot override')
  await t.run(async (ctx) => {
    expect((await ctx.db.get(seeded.bodyId))?.publicStatus).toBe('candidate')
    expect((await ctx.db.get(seeded.registryId))?.status).toBe('validating')
  })
})

test('canceled coverage runs cannot restart validation or evaluation', async () => {
  const t = convexTest(schema, modules)
  const owner = await signInOwner(t)
  const seeded = await seedReadyProposal(t, false)
  await t.run(async (ctx) => {
    await ctx.db.patch(seeded.runId, {
      state: 'canceled',
      canceledAt: Date.now(),
    })
  })

  await expect(
    owner.mutation(api.coverage.validation.startValidation, {
      proposalId: seeded.proposalId,
    }),
  ).resolves.toEqual({ started: false })
  await expect(
    owner.mutation(api.coverage.validation.reevaluate, {
      proposalId: seeded.proposalId,
    }),
  ).resolves.toEqual({ started: false })
  await expect(
    t.run(async (ctx) => {
      return await ctx.db.query('coverageCompilerStages').collect()
    }),
  ).resolves.toEqual([])
})

test('gate evaluation cannot interrupt sample validation', async () => {
  const t = convexTest(schema, modules)
  const owner = await signInOwner(t)
  const seeded = await seedReadyProposal(t, false)
  await t.run(async (ctx) => {
    await ctx.db.patch(seeded.proposalId, { status: 'validating' })
    await ctx.db.patch(seeded.runId, {
      state: 'running',
      currentStage: 'validate_sample',
      completedAt: undefined,
    })
    await ctx.db.insert('coverageCompilerStages', {
      runId: seeded.runId,
      stage: 'validate_sample',
      idempotencyKey: 'validation-in-progress',
      inputHash: 'validation-in-progress',
      attempt: 1,
      state: 'running',
      gateVersion: 'representative-sample-v1',
      startedAt: Date.now(),
    })
  })

  await expect(
    owner.mutation(api.coverage.validation.reevaluate, {
      proposalId: seeded.proposalId,
    }),
  ).resolves.toEqual({ started: false })
  await t.run(async (ctx) => {
    const stages = await ctx.db.query('coverageCompilerStages').collect()
    expect(stages.map((stage) => stage.stage)).toEqual(['validate_sample'])
    expect((await ctx.db.get(seeded.runId))?.state).toBe('running')
  })
})

test('gate 10 keeps a newer failure inside the bounded link-check window', async () => {
  const t = convexTest(schema, modules)
  await signInOwner(t)
  const seeded = await seedReadyProposal(t, false)
  const stageId = await t.run(async (ctx) => {
    await ctx.db.patch(seeded.runId, {
      state: 'running',
      currentStage: 'evaluate_gates',
      completedAt: undefined,
    })
    const stageId = await ctx.db.insert('coverageCompilerStages', {
      runId: seeded.runId,
      stage: 'evaluate_gates',
      idempotencyKey: 'latest-link-check',
      inputHash: 'latest-link-check',
      attempt: 1,
      state: 'running',
      gateVersion: 'representative-sample-v1',
      startedAt: Date.now(),
    })
    for (let checkedAt = 1; checkedAt <= 40; checkedAt += 1) {
      await ctx.db.insert('coverageDirectLinkChecks', {
        proposalId: seeded.proposalId,
        canonicalUrl: 'https://www.lafayettela.gov/current',
        deployment: 'production',
        status: 200,
        passed: true,
        checkedAt,
      })
    }
    await ctx.db.insert('coverageDirectLinkChecks', {
      proposalId: seeded.proposalId,
      canonicalUrl: 'https://www.lafayettela.gov/current',
      deployment: 'production',
      status: 503,
      passed: false,
      checkedAt: 41,
    })
    return stageId
  })

  await t.mutation(internal.coverage.evaluator.evaluateProposal, {
    proposalId: seeded.proposalId,
    stageId,
  })

  await t.run(async (ctx) => {
    const result = await ctx.db
      .query('coverageGateEvaluations')
      .withIndex('by_proposal_and_gate', (query) =>
        query.eq('proposalId', seeded.proposalId).eq('gateNumber', 10),
      )
      .order('desc')
      .first()
    expect(result?.passed).toBe(false)
    expect(result?.detail).toBe(
      '0 of 1 source links passed from the production deployment.',
    )
  })
})

async function seedReadyProposal(t: TestConvex, allPass: boolean) {
  const ids = await t.run(async (ctx) => {
    const user = await ctx.db.query('users').first()
    if (!user) throw new Error('Owner user was not created')
    const jurisdictionId = await ctx.db.insert('jurisdictions', {
      name: 'Lafayette Parish',
      slug: 'lafayette-parish',
      type: 'parish',
      state: 'LA',
      publicStatus: 'candidate',
    })
    const bodyId = await ctx.db.insert('governmentBodies', {
      jurisdictionId,
      name: 'Lafayette Planning Commission',
      slug: 'lafayette-planning-commission',
      bodyType: 'planning_commission',
      publicStatus: 'candidate',
    })
    const previousRegistryId = await ctx.db.insert('sourceRegistries', {
      governmentBodyId: bodyId,
      officialDomains: ['www.lafayettela.gov'],
      seedUrls: ['https://www.lafayettela.gov/old'],
      sourceKinds: ['agenda'],
      expectedCadence: { kind: 'meeting_cycle' },
      discoveryMode: 'dynamic',
      status: 'supported',
    })
    const registryId = await ctx.db.insert('sourceRegistries', {
      governmentBodyId: bodyId,
      officialDomains: ['www.lafayettela.gov'],
      seedUrls: ['https://www.lafayettela.gov/current'],
      sourceKinds: ['agenda', 'minutes'],
      expectedCadence: { kind: 'meeting_cycle' },
      discoveryMode: 'dynamic',
      status: 'validating',
    })
    const runId = await ctx.db.insert('coverageCompilerRuns', {
      bodyKey: 'lafayette-planning-commission',
      jurisdictionSlug: 'lafayette-parish',
      rootManifestVersion: 'v1',
      compilerVersion: 'v1',
      idempotencyKey: 'promotion-test',
      attempt: 1,
      state: 'succeeded',
      currentStage: 'evaluate_gates',
      requestedByUserId: user._id,
      startedAt: Date.now(),
      completedAt: Date.now(),
    })
    const proposalId = await ctx.db.insert('coverageRegistryProposals', {
      runId,
      governmentBodyId: bodyId,
      registryId,
      bodyKey: 'lafayette-planning-commission',
      proposalVersion: 1,
      status: allPass ? 'ready' : 'blocked',
      rootManifestVersion: 'v1',
      goldSetVersion: 'launch-bodies-v1',
      evaluatorVersion: COVERAGE_EVALUATOR_VERSION,
      proposedDomains: ['www.lafayettela.gov'],
      proposedSeedUrls: ['https://www.lafayettela.gov/current'],
      proposedSourceKinds: ['agenda', 'minutes'],
      diffHash: 'diff-hash',
      diffSummary: ['Replace the source seed set.'],
      createdAt: Date.now(),
      evaluatedAt: Date.now(),
    })
    await ctx.db.insert('coverageRepresentativeSamples', {
      proposalId,
      sourceKind: 'agenda',
      role: 'current',
      required: true,
      state: 'failed_terminal',
      errorClass: 'missing_required_candidate',
      createdAt: Date.now(),
      completedAt: Date.now(),
    })
    for (let gateNumber = 1; gateNumber <= 10; gateNumber += 1) {
      await ctx.db.insert('coverageGateEvaluations', {
        proposalId,
        gateNumber,
        gateKey: `gate_${gateNumber}`,
        passed: allPass || gateNumber !== 6,
        detail: 'Recorded test evidence.',
        evidenceRefs: ['test'],
        evaluatorVersion: COVERAGE_EVALUATOR_VERSION,
        createdAt: Date.now(),
      })
    }
    return { bodyId, previousRegistryId, proposalId, registryId, runId }
  })
  return ids
}

async function drainScheduled(t: TestConvex): Promise<void> {
  vi.useFakeTimers()
  await t.finishAllScheduledFunctions(vi.runAllTimers)
  vi.useRealTimers()
}

async function signInOwner(
  t: TestConvex,
): Promise<ReturnType<TestConvex['withIdentity']>> {
  vi.stubEnv('ADMIN_EMAIL', 'owner@example.com')
  const userId = await t.mutation(internal.auth.users.createUserGoogle, {
    provider: 'google',
    providerAccountId: 'google-owner',
    profile: {
      id: 'google-owner',
      email: 'owner@example.com',
      emailVerified: true,
    },
  })
  return t.withIdentity({ subject: userId })
}
