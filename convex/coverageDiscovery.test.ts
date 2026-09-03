/// <reference types="vite/client" />

import { convexTest } from 'convex-test'
import type { TestConvexForDataModelAndIdentity } from 'convex-test'
import { afterEach, expect, test, vi } from 'vitest'

import { api, internal } from './_generated/api'
import type { DataModel, Id } from './_generated/dataModel'
import {
  overrideCoverageClassifierForTests,
  overrideCoverageDiscoveryForTests,
  resetCoverageProvidersForTests,
} from './coverage/discovery'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')
type TestConvex = TestConvexForDataModelAndIdentity<DataModel>

afterEach(() => {
  vi.useRealTimers()
  resetCoverageProvidersForTests()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

test('a verified run stores bounded candidates and model evidence without activating coverage', async () => {
  const t = convexTest(schema, modules)
  const owner = await signInOwner(t)
  stubRoot()
  stubSuccessfulProviders()

  const runId = await verifiedRun(t, owner)
  await expect(
    owner.mutation(api.coverage.operations.discover, { runId }),
  ).resolves.toEqual({ started: true })
  await drainScheduled(t)

  const view = await owner.query(api.coverage.operations.run, { runId })
  expect(view?.run).toMatchObject({
    state: 'succeeded',
    currentStage: 'classify_sources',
  })
  expect(view?.stages.map((stage) => stage.stage)).toEqual([
    'verify_root',
    'discover_sources',
    'classify_sources',
  ])
  expect(view?.candidates).toHaveLength(2)
  expect(view?.candidates.map((candidate) => candidate.canonicalUrl)).toEqual([
    'https://media-002-us.cdn.govstack.com/lafayettela-us/media/agenda.pdf',
    'https://www.lafayettela.gov/meeting/agenda.pdf?id=7',
  ])
  expect(view?.candidates.map((candidate) => candidate.state)).toEqual([
    'classified',
    'classified',
  ])
  expect(view?.providerCalls.map((call) => call.provider)).toEqual([
    'firecrawl',
    'ai_gateway',
    'direct_openai',
  ])
  const providerEvidence = await t.run(
    async (ctx) =>
      await ctx.db.query('coverageCompilerProviderCalls').collect(),
  )
  expect(
    providerEvidence.find((call) => call.provider === 'ai_gateway')
      ?.responseHash,
  ).toBeUndefined()
  expect(
    providerEvidence.find((call) => call.provider === 'direct_openai')
      ?.responseHash,
  ).toEqual(expect.any(String))
  expect(
    view?.findings.some(
      (finding) =>
        finding.code === 'candidate_document_host_quarantined' &&
        finding.severity === 'warning',
    ),
  ).toBe(true)
  await expect(
    owner.mutation(api.coverage.operations.discover, { runId }),
  ).resolves.toEqual({ started: false })

  await expect(
    t.run(async (ctx) => await ctx.db.query('governmentBodies').collect()),
  ).resolves.toEqual([])
  await expect(
    t.run(async (ctx) => await ctx.db.query('sourceRegistries').collect()),
  ).resolves.toEqual([])
})

test('a Firecrawl failure is recorded and retry resumes discovery', async () => {
  const t = convexTest(schema, modules)
  const owner = await signInOwner(t)
  stubRoot()
  overrideCoverageDiscoveryForTests(async () => {
    throw new Error('recorded Firecrawl outage')
  })

  const runId = await verifiedRun(t, owner)
  await owner.mutation(api.coverage.operations.discover, { runId })
  await drainScheduled(t)
  expect(
    (await owner.query(api.coverage.operations.run, { runId }))?.run.state,
  ).toBe('failed_retryable')

  stubSuccessfulProviders()
  await expect(
    owner.mutation(api.coverage.operations.retry, { runId }),
  ).resolves.toEqual({ retried: true })
  await drainScheduled(t)
  const retried = await owner.query(api.coverage.operations.run, { runId })
  expect(retried?.run.state).toBe('succeeded')
  expect(
    retried?.stages
      .filter((stage) => stage.stage === 'discover_sources')
      .map((stage) => stage.attempt),
  ).toEqual([1, 2])
})

test('an empty discovery fails its stage and can retry later', async () => {
  const t = convexTest(schema, modules)
  const owner = await signInOwner(t)
  stubRoot()
  overrideCoverageDiscoveryForTests(async () => ({
    inputs: [],
    evidence: [],
  }))

  const runId = await verifiedRun(t, owner)
  await owner.mutation(api.coverage.operations.discover, { runId })
  await drainScheduled(t)

  const failed = await owner.query(api.coverage.operations.run, { runId })
  expect(failed?.run.state).toBe('failed_terminal')
  expect(
    failed?.stages.find((stage) => stage.stage === 'discover_sources'),
  ).toMatchObject({
    state: 'failed_terminal',
    errorClass: 'coverage:discovery_no_candidates',
  })

  stubSuccessfulProviders()
  await expect(
    owner.mutation(api.coverage.operations.retry, { runId }),
  ).resolves.toEqual({ retried: true })
  await drainScheduled(t)
  expect(
    (await owner.query(api.coverage.operations.run, { runId }))?.run.state,
  ).toBe('succeeded')
})

test('cancellation stops the remaining paid discovery calls', async () => {
  const t = convexTest(schema, modules)
  const owner = await signInOwner(t)
  stubRoot()
  const runId = await verifiedRun(t, owner)
  overrideCoverageDiscoveryForTests(
    async (_ctx, _manifest, _rootUrl, shouldContinue) => {
      expect(await shouldContinue()).toBe(true)
      await owner.mutation(api.coverage.operations.cancel, { runId })
      expect(await shouldContinue()).toBe(false)
      return { inputs: [], evidence: [], canceled: true }
    },
  )

  await owner.mutation(api.coverage.operations.discover, { runId })
  await drainScheduled(t)

  const view = await owner.query(api.coverage.operations.run, { runId })
  expect(view?.run.state).toBe('canceled')
  expect(
    view?.stages.find((stage) => stage.stage === 'discover_sources')?.state,
  ).toBe('canceled')
  expect(view?.providerCalls).toEqual([])
  expect(view?.candidates).toEqual([])
})

function stubSuccessfulProviders() {
  overrideCoverageDiscoveryForTests(async () => ({
    inputs: [
      {
        source: 'map:official-root',
        links: [
          {
            url: 'https://www.lafayettela.gov/meeting/agenda.pdf?id=7&utm_source=test',
            title: 'September meeting agenda',
          },
          {
            url: 'https://media-002-us.cdn.govstack.com/lafayettela-us/media/agenda.pdf',
            title: 'Planning agenda packet',
          },
          {
            url: 'https://www.lafayettela.gov/meeting/agenda.pdf?id=7',
            description: 'Council agenda',
          },
          { url: 'https://lookalike.example/agenda.pdf', title: 'Agenda' },
        ],
      },
    ],
    evidence: [
      {
        provider: 'firecrawl',
        operation: 'map',
        status: 'success',
        requestHash: 'request-hash',
        responseHash: 'response-hash',
        latencyMs: 18,
        creditsReported: false,
      },
    ],
  }))
  overrideCoverageClassifierForTests(async (request, contractCheck) => {
    const input = JSON.parse(request.messages[1].content) as {
      bodyKey: string
      candidates: Array<{
        candidateId: string
        canonicalUrl: string
        title?: string
      }>
    }
    const parsed = {
      bodyKey: input.bodyKey,
      classifications: input.candidates.map((candidate) => ({
        candidateId: candidate.candidateId,
        outcome: 'classified' as const,
        sourceKind: 'agenda' as const,
        cadence: 'meeting_cycle' as const,
        confidence: 0.9,
        evidenceText: candidate.title ?? candidate.canonicalUrl,
        noGuessReason: '',
      })),
    }
    expect(contractCheck(parsed)).toBeNull()
    const content = JSON.stringify(parsed)
    return {
      outcome: 'success',
      result: {
        kind: 'success',
        route: 'direct_openai',
        modelId: 'openai/gpt-5.6-luna',
        requestId: 'request-1',
        finishReason: 'stop',
        content,
        parsed,
        usage: {
          promptTokens: 120,
          completionTokens: 80,
          totalTokens: 200,
          cachedTokens: 0,
          reasoningTokens: 0,
        },
        latencyMs: 42,
      },
      attempts: [
        {
          route: 'ai_gateway',
          modelId: 'openai/gpt-5.6-luna',
          status: 'failed',
          httpStatus: 503,
          latencyMs: 20,
          requestId: null,
          usage: null,
          retryAfterMs: null,
          errorClass: 'gateway_unavailable',
          errorDetail: 'Gateway unavailable',
        },
        {
          route: 'direct_openai',
          modelId: 'openai/gpt-5.6-luna',
          status: 'success',
          httpStatus: 200,
          latencyMs: 42,
          requestId: 'request-1',
          usage: {
            promptTokens: 120,
            completionTokens: 80,
            totalTokens: 200,
            cachedTokens: 0,
            reasoningTokens: 0,
          },
          retryAfterMs: null,
          errorClass: null,
          errorDetail: null,
        },
      ],
    }
  })
}

async function verifiedRun(
  t: TestConvex,
  owner: ReturnType<TestConvex['withIdentity']>,
): Promise<Id<'coverageCompilerRuns'>> {
  const started = await owner.mutation(api.coverage.operations.start, {
    bodyKey: 'lafayette-planning-commission',
    rootManifestVersion: 'v1',
  })
  await drainScheduled(t)
  return started.runId
}

async function drainScheduled(t: TestConvex): Promise<void> {
  vi.useFakeTimers()
  await t.finishAllScheduledFunctions(vi.runAllTimers)
  vi.useRealTimers()
}

function stubRoot() {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        new Response(null, {
          status: 200,
          headers: { 'content-type': 'text/html; charset=utf-8' },
        }),
      ),
    ),
  )
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
