/// <reference types="vite/client" />

import { convexTest } from 'convex-test'
import type { TestConvexForDataModelAndIdentity } from 'convex-test'
import { afterEach, expect, test, vi } from 'vitest'

import { api, internal } from './_generated/api'
import type { DataModel, Id } from './_generated/dataModel'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')
type TestConvex = TestConvexForDataModelAndIdentity<DataModel>

const LAFAYETTE_ROOT =
  'https://www.lafayettela.gov/your-government/city-and-parish-councils/'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

test('only the configured owner can operate coverage runs', async () => {
  const t = convexTest(schema, modules)
  vi.stubEnv('ADMIN_EMAIL', 'owner@example.com')
  const residentId = await createGoogleUser(
    t,
    'google-resident',
    'resident@example.com',
  )
  const resident = t.withIdentity({ subject: residentId })
  stubHtmlRoot()

  await expect(
    t.query(api.coverage.operations.availableRoots, {}),
  ).rejects.toThrow('Sign in with Google')
  await expect(
    t.mutation(api.coverage.operations.start, {
      bodyKey: 'lafayette-city-council',
      rootManifestVersion: 'v1',
    }),
  ).rejects.toThrow('Sign in with Google')

  await expect(
    resident.query(api.coverage.operations.availableRoots, {}),
  ).rejects.toThrow('Owner access is unavailable')
  await expect(
    resident.query(api.coverage.operations.recentRuns, {}),
  ).rejects.toThrow('Owner access is unavailable')
  await expect(
    resident.mutation(api.coverage.operations.start, {
      bodyKey: 'lafayette-city-council',
      rootManifestVersion: 'v1',
    }),
  ).rejects.toThrow('Owner access is unavailable')

  await expect(
    t.run(async (ctx) => await ctx.db.query('coverageCompilerRuns').collect()),
  ).resolves.toEqual([])
})

test('a run only targets a checked manifest', async () => {
  const t = convexTest(schema, modules)
  const owner = await signInOwner(t)
  const fetchMock = stubHtmlRoot()

  await expect(
    owner.mutation(api.coverage.operations.start, {
      bodyKey: 'https://www.lafayettela.gov/',
      rootManifestVersion: 'v1',
    }),
  ).rejects.toThrow('No checked root manifest')
  await expect(
    owner.mutation(api.coverage.operations.start, {
      bodyKey: 'lafayette-city-council',
      rootManifestVersion: 'v2',
    }),
  ).rejects.toThrow('No checked root manifest')

  expect(fetchMock).not.toHaveBeenCalled()
  await expect(
    t.run(async (ctx) => await ctx.db.query('coverageCompilerRuns').collect()),
  ).resolves.toEqual([])
})

test('a verified official root records its evidence and succeeds', async () => {
  const t = convexTest(schema, modules)
  const owner = await signInOwner(t)
  const fetchMock = stubHtmlRoot()

  const started = await owner.mutation(api.coverage.operations.start, {
    bodyKey: 'lafayette-city-council',
    rootManifestVersion: 'v1',
  })
  expect(started.created).toBe(true)
  await drainScheduled(t)

  const view = await owner.query(api.coverage.operations.run, {
    runId: started.runId,
  })
  expect(view?.run.state).toBe('succeeded')
  expect(view?.findings).toEqual([])
  expect(view?.stages).toHaveLength(1)
  expect(view?.stages[0]).toMatchObject({
    stage: 'verify_root',
    state: 'succeeded',
    attempt: 1,
    resolvedRootUrl: LAFAYETTE_ROOT,
  })
  expect(view?.stages[0].redirectChain).toEqual([
    {
      requestedUrl: LAFAYETTE_ROOT,
      status: 200,
      contentType: 'text/html; charset=utf-8',
    },
  ])
  expect(fetchMock).toHaveBeenCalledTimes(1)

  // The owner projection carries no internal identity or replay key.
  expect(Object.keys(view?.run ?? {})).not.toContain('requestedByUserId')
  expect(Object.keys(view?.run ?? {})).not.toContain('idempotencyKey')
})

test('replaying the same body and manifest version reuses the run', async () => {
  const t = convexTest(schema, modules)
  const owner = await signInOwner(t)
  const fetchMock = stubHtmlRoot()

  const first = await owner.mutation(api.coverage.operations.start, {
    bodyKey: 'lafayette-city-council',
    rootManifestVersion: 'v1',
  })
  const concurrent = await owner.mutation(api.coverage.operations.start, {
    bodyKey: 'lafayette-city-council',
    rootManifestVersion: 'v1',
  })
  expect(concurrent).toEqual({ runId: first.runId, created: false })

  await drainScheduled(t)

  const afterSuccess = await owner.mutation(api.coverage.operations.start, {
    bodyKey: 'lafayette-city-council',
    rootManifestVersion: 'v1',
  })
  expect(afterSuccess).toEqual({ runId: first.runId, created: false })
  expect(fetchMock).toHaveBeenCalledTimes(1)
  await expect(
    t.run(async (ctx) => await ctx.db.query('coverageCompilerRuns').collect()),
  ).resolves.toHaveLength(1)
})

test('a failed root gate makes no paid provider call and can be retried', async () => {
  const t = convexTest(schema, modules)
  const owner = await signInOwner(t)
  const fetchMock = vi.fn(() =>
    Promise.resolve(
      new Response(null, {
        status: 302,
        headers: { location: 'https://lafayettela.gov.evil.example/' },
      }),
    ),
  )
  vi.stubGlobal('fetch', fetchMock)

  const started = await owner.mutation(api.coverage.operations.start, {
    bodyKey: 'lafayette-city-council',
    rootManifestVersion: 'v1',
  })
  await drainScheduled(t)

  const failed = await owner.query(api.coverage.operations.run, {
    runId: started.runId,
  })
  expect(failed?.run.state).toBe('failed_terminal')
  expect(failed?.findings.map((finding) => finding.code)).toEqual([
    'root_host_not_approved',
  ])
  expect(failed?.stages[0].errorClass).toBe('root_gate:root_host_not_approved')
  // The gate stopped before requesting the lookalike host.
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(fetchMock).toHaveBeenCalledWith(
    LAFAYETTE_ROOT,
    expect.objectContaining({ redirect: 'manual' }),
  )

  await expect(
    t.run(async (ctx) => await ctx.db.query('aiCalls').collect()),
  ).resolves.toEqual([])
  await expect(
    t.run(async (ctx) => await ctx.db.query('sourceSnapshots').collect()),
  ).resolves.toEqual([])
  await expect(
    t.run(async (ctx) => await ctx.db.query('sourceRegistries').collect()),
  ).resolves.toEqual([])

  stubHtmlRoot()
  await expect(
    owner.mutation(api.coverage.operations.retry, { runId: started.runId }),
  ).resolves.toEqual({ retried: true })
  await drainScheduled(t)

  const retried = await owner.query(api.coverage.operations.run, {
    runId: started.runId,
  })
  expect(retried?.run.state).toBe('succeeded')
  expect(retried?.run.attempt).toBe(1)
  expect(retried?.stages).toHaveLength(2)
  expect(retried?.stages.map((stage) => stage.attempt).sort()).toEqual([1, 2])
})

test('stage retries never reuse a later run idempotency key', async () => {
  const t = convexTest(schema, modules)
  const owner = await signInOwner(t)
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(null, { status: 404 }))),
  )

  const first = await owner.mutation(api.coverage.operations.start, {
    bodyKey: 'lafayette-city-council',
    rootManifestVersion: 'v1',
  })
  await drainScheduled(t)
  await owner.mutation(api.coverage.operations.retry, { runId: first.runId })
  await drainScheduled(t)

  const second = await owner.mutation(api.coverage.operations.start, {
    bodyKey: 'lafayette-city-council',
    rootManifestVersion: 'v1',
  })
  await drainScheduled(t)
  await owner.mutation(api.coverage.operations.retry, { runId: second.runId })
  await drainScheduled(t)

  const third = await owner.mutation(api.coverage.operations.start, {
    bodyKey: 'lafayette-city-council',
    rootManifestVersion: 'v1',
  })
  const runs = await t.run(
    async (ctx) => await ctx.db.query('coverageCompilerRuns').collect(),
  )
  expect(runs.map((run) => run.attempt).sort()).toEqual([1, 2, 3])
  expect(new Set(runs.map((run) => run.idempotencyKey)).size).toBe(3)
  expect(third.runId).not.toEqual(second.runId)
})

test('a terminal failure earns a new attempt instead of reusing the failed run', async () => {
  const t = convexTest(schema, modules)
  const owner = await signInOwner(t)
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(null, { status: 404 }))),
  )

  const first = await owner.mutation(api.coverage.operations.start, {
    bodyKey: 'lafayette-city-council',
    rootManifestVersion: 'v1',
  })
  await drainScheduled(t)

  stubHtmlRoot()
  const second = await owner.mutation(api.coverage.operations.start, {
    bodyKey: 'lafayette-city-council',
    rootManifestVersion: 'v1',
  })
  expect(second.created).toBe(true)
  expect(second.runId).not.toEqual(first.runId)
  await drainScheduled(t)

  const runs = await owner.query(api.coverage.operations.recentRuns, {})
  expect(runs.map((entry) => entry.attempt).sort()).toEqual([1, 2])
  expect(runs.find((entry) => entry.runId === second.runId)?.state).toBe(
    'succeeded',
  )
})

test('a failed run cannot retry beside an active run on a newer compiler contract', async () => {
  const t = convexTest(schema, modules)
  const owner = await signInOwner(t)
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(null, { status: 404 }))),
  )

  const failed = await owner.mutation(api.coverage.operations.start, {
    bodyKey: 'lafayette-city-council',
    rootManifestVersion: 'v1',
  })
  await drainScheduled(t)

  const activeRunId = await t.run(async (ctx) => {
    const user = await ctx.db.query('users').first()
    if (!user) throw new Error('The owner fixture is missing')
    return await ctx.db.insert('coverageCompilerRuns', {
      bodyKey: 'lafayette-city-council',
      jurisdictionSlug: 'lafayette-parish',
      rootManifestVersion: 'v2',
      compilerVersion: 'v2',
      idempotencyKey: 'newer-active-contract',
      attempt: 2,
      state: 'running',
      currentStage: 'verify_root',
      requestedByUserId: user._id,
      startedAt: Date.now(),
    })
  })
  await expect(
    owner.mutation(api.coverage.operations.retry, { runId: failed.runId }),
  ).resolves.toEqual({ retried: false })

  const runs = await owner.query(api.coverage.operations.recentRuns, {})
  expect(runs.find((run) => run.runId === activeRunId)?.state).toBe('running')
  expect(runs.find((run) => run.runId === failed.runId)?.state).toBe(
    'failed_terminal',
  )
})

test('cancellation stops the run before it spends anything', async () => {
  const t = convexTest(schema, modules)
  const owner = await signInOwner(t)
  const fetchMock = stubHtmlRoot()
  const { runId, stageId } = await t.run(async (ctx) => {
    const user = await ctx.db.query('users').first()
    if (!user) throw new Error('The owner fixture is missing')
    const startedAt = Date.now()
    const runId = await ctx.db.insert('coverageCompilerRuns', {
      bodyKey: 'lafayette-city-council',
      jurisdictionSlug: 'lafayette-parish',
      rootManifestVersion: 'v1',
      compilerVersion: 'v1',
      idempotencyKey: 'canceled-before-worker-run',
      attempt: 1,
      state: 'running',
      currentStage: 'verify_root',
      requestedByUserId: user._id,
      startedAt,
    })
    const stageId = await ctx.db.insert('coverageCompilerStages', {
      runId,
      stage: 'verify_root',
      idempotencyKey: 'canceled-before-worker-stage',
      inputHash: 'canceled-before-worker-input',
      attempt: 1,
      state: 'running',
      gateVersion: 'v1',
      requestedRootUrl: LAFAYETTE_ROOT,
      startedAt,
    })
    return { runId, stageId }
  })
  await expect(
    owner.mutation(api.coverage.operations.cancel, { runId }),
  ).resolves.toEqual({ canceled: true })
  await t.action(internal.coverage.verifyRoot.verifyRootForRun, {
    runId,
    stageId,
  })

  const view = await owner.query(api.coverage.operations.run, {
    runId,
  })
  expect(view?.run.state).toBe('canceled')
  expect(view?.stages[0].state).toBe('canceled')
  expect(fetchMock).not.toHaveBeenCalled()
  await expect(
    owner.mutation(api.coverage.operations.cancel, { runId }),
  ).resolves.toEqual({ canceled: false })
})

test('a result that lands after cancellation is recorded but never promotes the run', async () => {
  const t = convexTest(schema, modules)
  const owner = await signInOwner(t)
  stubHtmlRoot()

  const started = await owner.mutation(api.coverage.operations.start, {
    bodyKey: 'lafayette-city-council',
    rootManifestVersion: 'v1',
  })
  await owner.mutation(api.coverage.operations.cancel, {
    runId: started.runId,
  })
  const stageId = await firstStageId(t, started.runId)

  await t.mutation(internal.coverage.ledger.completeRootVerification, {
    runId: started.runId,
    stageId,
    outcome: 'passed',
    resolvedRootUrl: LAFAYETTE_ROOT,
    redirectChain: [{ requestedUrl: LAFAYETTE_ROOT, status: 200 }],
    findings: [],
  })

  const view = await owner.query(api.coverage.operations.run, {
    runId: started.runId,
  })
  expect(view?.run.state).toBe('canceled')
  expect(view?.stages[0].state).toBe('succeeded')
  expect(view?.stages[0].resolvedRootUrl).toBe(LAFAYETTE_ROOT)
})

test('a newer manifest version supersedes an active run for the same body', async () => {
  const t = convexTest(schema, modules)
  const owner = await signInOwner(t)
  stubHtmlRoot()

  const stale = await owner.mutation(api.coverage.operations.start, {
    bodyKey: 'lafayette-city-council',
    rootManifestVersion: 'v1',
  })
  // Simulate a checked manifest moving to v2 while the first run is in flight.
  await t.run(async (ctx) => {
    await ctx.db.patch(stale.runId, { rootManifestVersion: 'v0' })
  })

  const current = await owner.mutation(api.coverage.operations.start, {
    bodyKey: 'lafayette-city-council',
    rootManifestVersion: 'v1',
  })
  expect(current.runId).not.toEqual(stale.runId)

  const runs = await owner.query(api.coverage.operations.recentRuns, {})
  expect(runs.find((entry) => entry.runId === stale.runId)?.state).toBe(
    'superseded',
  )
})

function stubHtmlRoot() {
  const fetchMock = vi.fn(() =>
    Promise.resolve(
      new Response(null, {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      }),
    ),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function drainScheduled(t: TestConvex): Promise<void> {
  vi.useFakeTimers()
  await t.finishAllScheduledFunctions(vi.runAllTimers)
  vi.useRealTimers()
}

async function firstStageId(
  t: TestConvex,
  runId: Id<'coverageCompilerRuns'>,
): Promise<Id<'coverageCompilerStages'>> {
  return await t.run(async (ctx) => {
    const stage = await ctx.db
      .query('coverageCompilerStages')
      .withIndex('by_run_and_stage', (index) => index.eq('runId', runId))
      .first()
    if (!stage) throw new Error('The run has no stage')
    return stage._id
  })
}

async function signInOwner(
  t: TestConvex,
): Promise<ReturnType<TestConvex['withIdentity']>> {
  vi.stubEnv('ADMIN_EMAIL', 'owner@example.com')
  const userId = await createGoogleUser(t, 'google-owner', 'owner@example.com')
  return t.withIdentity({ subject: userId })
}

async function createGoogleUser(
  t: TestConvex,
  providerAccountId: string,
  email: string,
): Promise<Id<'users'>> {
  return await t.mutation(internal.auth.users.createUserGoogle, {
    provider: 'google',
    providerAccountId,
    profile: {
      id: providerAccountId,
      email,
      emailVerified: true,
    },
  })
}
