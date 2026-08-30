/// <reference types="vite/client" />

import workflowTest from '@convex-dev/workflow/test'
import { convexTest } from 'convex-test'
import type { TestConvexForDataModelAndIdentity } from 'convex-test'
import { afterEach, expect, test, vi } from 'vitest'

import { internal } from './_generated/api'
import type { DataModel, Id } from './_generated/dataModel'
import {
  overrideGatewayTokenMinterForTests,
  resetGatewayTokenMinterForTests,
} from './ai/chatCompletions'
import {
  checkIndependentReviewContractV1,
  expectedReviewVerdictV1,
} from './review/contractV1'
import { buildIndependentReviewPromptV1 } from './review/promptV1'
import { extractionRunKey, publicationRunKey } from './pipeline/keys'
import { applyPublicationPolicyV1 } from './publication/policyV1'
import schema from './schema'
import { sha256HexOfBytes, sha256HexOfText } from './sources/hashing'

const modules = import.meta.glob('./**/*.ts')
const GATEWAY_URL = 'https://ai-gateway.convex.dev/v1/chat/completions'
const TERRA_MODEL = 'openai/gpt-5.6-terra'
const LUNA_MODEL = 'openai/gpt-5.6-luna'
const OFFICIAL_URL = 'https://www.lafayettela.gov/agenda/CO-029-2026'
const SOURCE_TEXT = `Lafayette City Council
CO-029-2026
proposal
Accept grant revenue
scheduled
The council will consider accepting grant revenue.`

type TestConvex = TestConvexForDataModelAndIdentity<DataModel>

type SeededCandidate = {
  registryId: Id<'sourceRegistries'>
  snapshotId: Id<'sourceSnapshots'>
  runId: Id<'pipelineRuns'>
  extractionId: Id<'extractions'>
  candidateId: Id<'decisionCandidates'>
  factIds: Array<{ factId: Id<'candidateFacts'>; fieldPath: string }>
}

function initTest(fastModel: string = LUNA_MODEL): TestConvex {
  vi.stubEnv('FIRECRAWL_API_KEY', 'fc-test-key')
  vi.stubEnv('MODEL_STRONG_ID', TERRA_MODEL)
  vi.stubEnv('MODEL_FAST_ID', fastModel)
  overrideGatewayTokenMinterForTests(async () => 'test-scoped-token')
  const t = convexTest(schema, modules)
  workflowTest.register(t)
  return t
}

async function seedValidatedCandidate(
  t: TestConvex,
  suffix: string = '',
): Promise<SeededCandidate> {
  const normalizedBytes = new TextEncoder().encode(SOURCE_TEXT)
  const rawBytes = new TextEncoder().encode(`%PDF-1.7 ${SOURCE_TEXT}`)
  const normalizedHash = await sha256HexOfText(SOURCE_TEXT)
  const rawHash = await sha256HexOfBytes(rawBytes)
  return await t.run(async (ctx) => {
    const normalizedStorageId = await ctx.storage.store(
      new Blob([normalizedBytes], { type: 'text/markdown' }),
    )
    const rawStorageId = await ctx.storage.store(
      new Blob([rawBytes], { type: 'application/pdf' }),
    )
    const jurisdictionId = await ctx.db.insert('jurisdictions', {
      name: `Lafayette Parish${suffix}`,
      slug: `lafayette-parish${suffix}`,
      type: 'parish',
      state: 'LA',
      publicStatus: 'validating',
    })
    const governmentBodyId = await ctx.db.insert('governmentBodies', {
      jurisdictionId,
      name: 'Lafayette City Council',
      slug: `lafayette-city-council${suffix}`,
      bodyType: 'city_council',
      officialUrl: 'https://www.lafayettela.gov',
      publicStatus: 'validating',
    })
    const registryId = await ctx.db.insert('sourceRegistries', {
      governmentBodyId,
      officialDomains: ['lafayettela.gov'],
      seedUrls: ['https://www.lafayettela.gov'],
      sourceKinds: ['agenda'],
      expectedCadence: { kind: 'meeting_cycle' },
      discoveryMode: 'dynamic',
      status: 'validating',
    })
    const snapshotId = await ctx.db.insert('sourceSnapshots', {
      registryId,
      canonicalUrl: OFFICIAL_URL,
      retrievedUrl: OFFICIAL_URL,
      contentHash: rawHash,
      contentHashBasis: 'raw_artifact_v2',
      normalizedContentHash: normalizedHash,
      contentType: 'application/pdf',
      retrievalTime: 1_788_000_000_000,
      version: 1,
      normalizedStorageId,
      normalizedContentType: 'text/markdown',
      normalizedByteLength: normalizedBytes.byteLength,
      rawStorageId,
      rawContentType: 'application/pdf',
      rawByteLength: rawBytes.byteLength,
      truncation: { truncated: false },
      firecrawlMetadata: {},
    })
    const runId = await ctx.db.insert('pipelineRuns', {
      registryId,
      trigger: 'manual_extraction',
      state: 'succeeded',
      processorVersion: 'v1.14',
      snapshotId,
      sourceKind: 'agenda',
      targetRecordId: 'CO-029-2026',
      startedAt: 1_788_000_000_100,
      completedAt: 1_788_000_000_200,
    })
    const extractionId = await ctx.db.insert('extractions', {
      runId,
      registryId,
      snapshotId,
      sourceKind: 'agenda',
      targetRecordId: 'CO-029-2026',
      promptVersion: 'v1.5',
      schemaVersion: 'v1',
      processorVersion: 'v1.14',
      modelRole: 'MODEL_STRONG',
      modelId: TERRA_MODEL,
      route: 'ai_gateway',
      state: 'extracted',
      createdAt: 1_788_000_000_150,
    })
    const candidateId = await ctx.db.insert('decisionCandidates', {
      extractionId,
      runId,
      registryId,
      snapshotId,
      sourceKind: 'agenda',
      targetRecordId: 'CO-029-2026',
      sourceRecordId: 'CO-029-2026',
      recordType: 'proposal',
      title: 'Accept grant revenue',
      bodyName: 'Lafayette City Council',
      meetingAt: null,
      lifecycleState: 'scheduled',
      plainLanguageSummary:
        'The council will consider accepting grant revenue.',
      affectedPlaces: [],
      amounts: [],
      publicActions: [],
      state: 'deterministically_validated',
      promptVersion: 'v1.5',
      schemaVersion: 'v1',
      modelRole: 'MODEL_STRONG',
      modelId: TERRA_MODEL,
      route: 'ai_gateway',
      createdAt: 1_788_000_000_160,
    })
    const factSpecs = [
      ['/sourceRecordId', 'CO-029-2026', 'CO-029-2026'],
      ['/recordType', 'proposal', 'proposal'],
      ['/title', 'Accept grant revenue', 'Accept grant revenue'],
      ['/bodyName', 'Lafayette City Council', 'Lafayette City Council'],
      ['/lifecycleState', 'scheduled', 'scheduled'],
      [
        '/plainLanguageSummary',
        'The council will consider accepting grant revenue.',
        'The council will consider accepting grant revenue.',
      ],
    ] as const
    const factIds: SeededCandidate['factIds'] = []
    for (const [fieldPath, value, excerpt] of factSpecs) {
      const factId = await ctx.db.insert('candidateFacts', {
        candidateId,
        extractionId,
        fieldPath,
        value,
        sourceSnapshotId: snapshotId,
        excerpt,
      })
      factIds.push({ factId, fieldPath })
    }
    await ctx.db.patch(extractionId, { candidateId })
    return {
      registryId,
      snapshotId,
      runId,
      extractionId,
      candidateId,
      factIds,
    }
  })
}

function reviewResponse(
  facts: SeededCandidate['factIds'],
  overrides: Partial<
    Record<string, 'supported' | 'unclear' | 'unsupported'>
  > = {},
  verdict?: 'pass' | 'limited' | 'fail',
) {
  const checks = facts.map((fact) => ({
    factId: fact.factId,
    fieldPath: fact.fieldPath,
    assessment: overrides[fact.fieldPath] ?? 'supported',
    detail:
      (overrides[fact.fieldPath] ?? 'supported') === 'supported'
        ? 'The cited span directly supports this value.'
        : 'The cited span does not support this value.',
  }))
  return {
    verdict:
      verdict ??
      expectedReviewVerdictV1({
        sourceRecordIdPresent: true,
        checks,
        findings: [],
      }),
    checks,
    findings: [],
  }
}

function stubReviewFetch(
  content: string | string[],
  requests: Array<Record<string, unknown>> = [],
  responseModel: string = LUNA_MODEL,
) {
  let call = 0
  const fetchMock = vi.fn(
    async (input: string | URL | Request, init?: RequestInit) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url
      if (url !== GATEWAY_URL) {
        throw new Error(`Unexpected URL ${url}`)
      }
      requests.push(JSON.parse(String(init?.body)))
      const responseContent = Array.isArray(content)
        ? content[Math.min(call, content.length - 1)]
        : content
      call += 1
      return new Response(
        JSON.stringify({
          id: 'review-response-1',
          object: 'chat.completion',
          model: responseModel,
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: responseContent,
                refusal: null,
              },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 600,
            completion_tokens: 300,
            total_tokens: 900,
            prompt_tokens_details: { cached_tokens: 100 },
            completion_tokens_details: { reasoning_tokens: 120 },
          },
        }),
        { status: 200 },
      )
    },
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function seedReextractedCandidate(
  t: TestConvex,
  seeded: SeededCandidate,
): Promise<SeededCandidate> {
  return await t.run(async (ctx) => {
    const original = await ctx.db.get(seeded.candidateId)
    if (!original) {
      throw new Error('Seed candidate is missing')
    }
    const runId = await ctx.db.insert('pipelineRuns', {
      registryId: original.registryId,
      trigger: 'manual_extraction',
      state: 'succeeded',
      processorVersion: 'v1.14',
      snapshotId: original.snapshotId,
      sourceKind: original.sourceKind,
      targetRecordId: original.targetRecordId,
      startedAt: 1_788_000_001_100,
      completedAt: 1_788_000_001_200,
    })
    const extractionId = await ctx.db.insert('extractions', {
      runId,
      registryId: original.registryId,
      snapshotId: original.snapshotId,
      sourceKind: original.sourceKind,
      targetRecordId: original.targetRecordId,
      promptVersion: original.promptVersion,
      schemaVersion: original.schemaVersion,
      processorVersion: 'v1.14',
      modelRole: 'MODEL_STRONG',
      modelId: TERRA_MODEL,
      route: 'ai_gateway',
      state: 'extracted',
      createdAt: 1_788_000_001_150,
    })
    const candidateId = await ctx.db.insert('decisionCandidates', {
      extractionId,
      runId,
      registryId: original.registryId,
      snapshotId: original.snapshotId,
      sourceKind: original.sourceKind,
      targetRecordId: original.targetRecordId,
      sourceRecordId: original.sourceRecordId,
      recordType: original.recordType,
      title: original.title,
      bodyName: original.bodyName,
      meetingAt: original.meetingAt,
      lifecycleState: original.lifecycleState,
      plainLanguageSummary: original.plainLanguageSummary,
      affectedPlaces: original.affectedPlaces,
      amounts: original.amounts,
      publicActions: original.publicActions,
      state: 'deterministically_validated',
      promptVersion: original.promptVersion,
      schemaVersion: original.schemaVersion,
      modelRole: original.modelRole,
      modelId: original.modelId,
      route: original.route,
      createdAt: 1_788_000_001_160,
    })
    const originalFacts = await ctx.db
      .query('candidateFacts')
      .withIndex('by_candidate_and_field_path', (q) =>
        q.eq('candidateId', original._id),
      )
      .collect()
    const factIds: SeededCandidate['factIds'] = []
    for (const fact of originalFacts) {
      const factId = await ctx.db.insert('candidateFacts', {
        candidateId,
        extractionId,
        fieldPath: fact.fieldPath,
        value: fact.value,
        sourceSnapshotId: fact.sourceSnapshotId,
        excerpt: fact.excerpt,
        page: fact.page,
        section: fact.section,
      })
      factIds.push({ factId, fieldPath: fact.fieldPath })
    }
    await ctx.db.patch(extractionId, { candidateId })
    return {
      registryId: original.registryId,
      snapshotId: original.snapshotId,
      runId,
      extractionId,
      candidateId,
      factIds,
    }
  })
}

async function startAndDrain(
  t: TestConvex,
  candidateId: Id<'decisionCandidates'>,
) {
  const started = await t.mutation(
    internal.operations.publication.startCandidatePublication,
    { candidateId, trigger: 'manual_publication' },
  )
  vi.useFakeTimers()
  await t.finishAllScheduledFunctions(vi.runAllTimers)
  vi.useRealTimers()
  return started
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  resetGatewayTokenMinterForTests()
})

function buildCo072AgendaReviewPrompt(section: string | null) {
  return buildIndependentReviewPromptV1({
    sourceKind: 'agenda',
    sourceRecordId: 'CO-072-2026',
    targetRecordId: 'CO-072-2026',
    candidate: {
      recordType: 'proposal',
      title:
        'CO-072-2026 An ordinance of the Lafayette City Council amending the FY 25/26 operating and capital budget',
      bodyName: 'Lafayette City Council',
      meetingAt: '2026-09-01T17:30:00-05:00',
      lifecycleState: 'scheduled',
      plainLanguageSummary:
        'The council is scheduled to consider CO-072-2026 for final adoption.',
      affectedPlaces: [],
      amounts: [],
      publicActions: [],
    },
    facts: [
      {
        factId: 'co-072-lifecycle',
        fieldPath: '/lifecycleState',
        value: 'scheduled',
        excerpt: 'CO-072-2026 An ordinance of the Lafayette City Council',
        page: 1,
        section,
      },
    ],
  })
}

test('the review prompt treats CO-072 final-adoption placement as scheduled consideration', () => {
  const prompt = buildCo072AgendaReviewPrompt('Final Adoption of Ordinances')

  expect(prompt.promptVersion).toBe('v1.2')
  expect(prompt.messages[0].content).toContain(
    'an item under Final Adoption of Ordinances is scheduled for final-adoption consideration',
  )
  expect(prompt.messages[0].content).toContain(
    'the agenda does not prove that adoption happened',
  )
  expect(prompt.messages[1].content).toContain(
    '"section":"Final Adoption of Ordinances"',
  )
  expect(prompt.messages[1].content).toContain(
    'CO-072-2026 An ordinance of the Lafayette City Council',
  )
})

test('the review prompt does not treat a bare agenda mention as scheduled', () => {
  const prompt = buildCo072AgendaReviewPrompt(null)

  expect(prompt.messages[0].content).toContain(
    'merely appears elsewhere in an agenda without explicit scheduling language or a scheduling section does not by itself support scheduled',
  )
  expect(prompt.messages[1].content).toContain('"section":null')
})

test('review prompt v1.2 creates a new publication idempotency key', async () => {
  const t = initTest()
  const seeded = await seedValidatedCandidate(t, '-review-prompt-version')
  const keyFor = (promptVersion: string) =>
    publicationRunKey({
      candidateId: seeded.candidateId,
      processorVersion: 'v1',
      promptVersion,
      schemaVersion: 'v1',
      policyVersion: 'v1',
      payloadVersion: 'v1',
    })

  expect(await keyFor('v1.2')).not.toBe(await keyFor('v1.1'))
})

test('a second model review publishes one full immutable version with exact citations', async () => {
  const t = initTest()
  const seeded = await seedValidatedCandidate(t)
  const requests: Array<Record<string, unknown>> = []
  const fetchMock = stubReviewFetch(
    JSON.stringify(reviewResponse(seeded.factIds)),
    requests,
  )

  const started = await startAndDrain(t, seeded.candidateId)
  const run = await t.query(internal.pipeline.runs.getRun, {
    runId: started.runId,
  })
  expect(run).toMatchObject({
    state: 'succeeded',
    trigger: 'manual_publication',
    candidateId: seeded.candidateId,
  })
  const stages = await t.query(internal.pipeline.runs.listForRun, {
    runId: started.runId,
  })
  expect(
    stages
      .map((stage) => [stage.stage, stage.state])
      .sort(([left], [right]) => left.localeCompare(right)),
  ).toEqual([
    ['finalize', 'succeeded'],
    ['review', 'succeeded'],
  ])

  const evidence = await t.run(async (ctx) => {
    const review = await ctx.db
      .query('reviews')
      .withIndex('by_run', (q) => q.eq('runId', started.runId))
      .unique()
    const version = await ctx.db
      .query('publicationVersions')
      .withIndex('by_run', (q) => q.eq('runId', started.runId))
      .unique()
    const record = version ? await ctx.db.get(version.recordId) : null
    const citations = version
      ? await ctx.db
          .query('citations')
          .withIndex('by_publication_and_field_path', (q) =>
            q.eq('publicationVersionId', version._id),
          )
          .collect()
      : []
    const calls = await ctx.db
      .query('aiCalls')
      .withIndex('by_run_and_created_at', (q) => q.eq('runId', started.runId))
      .collect()
    return { review, version, record, citations, calls }
  })
  expect(evidence.review).toMatchObject({
    state: 'succeeded',
    verdict: 'pass',
    modelRole: 'MODEL_FAST',
    modelId: LUNA_MODEL,
    promptVersion: 'v1.2',
    schemaVersion: 'v1',
  })
  expect(evidence.version).toMatchObject({
    mode: 'full',
    reasonCode: 'all_evidence_supported',
    version: 1,
    policyVersion: 'v1',
    payloadVersion: 'v1',
    payload: {
      kind: 'full',
      plainLanguageSummary:
        'The council will consider accepting grant revenue.',
    },
  })
  expect(evidence.record?.currentPublishedVersionId).toBe(evidence.version?._id)
  expect(evidence.citations).toHaveLength(seeded.factIds.length)
  expect(
    evidence.citations.every(
      (citation) =>
        citation.snapshotId === seeded.snapshotId &&
        citation.officialUrl === OFFICIAL_URL &&
        citation.normalizedEndOffset > citation.normalizedStartOffset,
    ),
  ).toBe(true)
  expect(evidence.calls).toHaveLength(1)
  expect(evidence.calls[0]).toMatchObject({
    modelRole: 'MODEL_FAST',
    modelId: LUNA_MODEL,
    status: 'success',
    promptTokens: 600,
    completionTokens: 300,
    cachedTokens: 100,
    reasoningTokens: 120,
  })
  expect(evidence.calls[0].estimatedCostUsd).toBeGreaterThan(0)
  expect(requests[0]).toMatchObject({
    model: LUNA_MODEL,
    reasoning_effort: 'high',
    max_completion_tokens: 6000,
    store: false,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'public_parish_independent_review_v1',
        strict: true,
      },
    },
  })
  const prompt = JSON.stringify(requests[0].messages)
  expect(prompt).toContain('CANDIDATE AND CITATIONS BEGIN')
  expect(prompt).toContain('An approved introduction means proposed')
  expect(prompt).toContain('Final Adoption of Ordinances')
  expect(prompt).toContain('merely appears elsewhere in an agenda')
  expect(prompt).not.toContain('SOURCE BEGIN')

  const replay = await t.mutation(
    internal.operations.publication.startCandidatePublication,
    { candidateId: seeded.candidateId, trigger: 'manual_publication' },
  )
  expect(replay).toMatchObject({ runId: started.runId, reused: true })
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(
    await t.run(async (ctx) => ctx.db.query('publicationVersions').collect()),
  ).toHaveLength(1)
})

test('an incomplete source cannot produce a confident summary', async () => {
  const t = initTest()
  const seeded = await seedValidatedCandidate(t, '-limited')
  await t.run(async (ctx) => {
    const candidate = await ctx.db.get(seeded.candidateId)
    if (!candidate) throw new Error('Seed candidate is missing')
    await ctx.db.patch(candidate._id, {
      plainLanguageSummary: 'The council approved the grant revenue.',
    })
    const summaryFacts = await ctx.db
      .query('candidateFacts')
      .withIndex('by_candidate_and_field_path', (q) =>
        q
          .eq('candidateId', candidate._id)
          .eq('fieldPath', '/plainLanguageSummary'),
      )
      .unique()
    if (!summaryFacts) throw new Error('Summary fact is missing')
    await ctx.db.patch(summaryFacts._id, {
      value: 'The council approved the grant revenue.',
      excerpt: 'Accept grant revenue',
    })
  })
  stubReviewFetch(
    JSON.stringify(
      reviewResponse(seeded.factIds, {
        '/plainLanguageSummary': 'unsupported',
      }),
    ),
  )
  const started = await startAndDrain(t, seeded.candidateId)
  const result = await t.run(async (ctx) => {
    const version = await ctx.db
      .query('publicationVersions')
      .withIndex('by_run', (q) => q.eq('runId', started.runId))
      .unique()
    const citations = version
      ? await ctx.db
          .query('citations')
          .withIndex('by_publication_and_field_path', (q) =>
            q.eq('publicationVersionId', version._id),
          )
          .collect()
      : []
    return { version, citations }
  })
  expect(result.version).toMatchObject({
    mode: 'limited',
    reasonCode: 'secondary_evidence_limited',
    payload: {
      kind: 'limited',
      sourceRecordId: 'CO-029-2026',
      title: 'Accept grant revenue',
      bodyName: 'Lafayette City Council',
    },
  })
  expect(JSON.stringify(result.version?.payload)).not.toContain(
    'plainLanguageSummary',
  )
  expect(JSON.stringify(result.version?.payload)).not.toContain('approved')
  expect(result.citations.map((citation) => citation.fieldPath).sort()).toEqual(
    ['/bodyName', '/sourceRecordId', '/title'],
  )
})

test('core evidence disagreement is recorded as withheld and never becomes current', async () => {
  const t = initTest()
  const seeded = await seedValidatedCandidate(t, '-withheld')
  stubReviewFetch(
    JSON.stringify(reviewResponse(seeded.factIds, { '/title': 'unsupported' })),
  )
  const started = await startAndDrain(t, seeded.candidateId)
  const result = await t.run(async (ctx) => {
    const version = await ctx.db
      .query('publicationVersions')
      .withIndex('by_run', (q) => q.eq('runId', started.runId))
      .unique()
    const record = version ? await ctx.db.get(version.recordId) : null
    const citations = await ctx.db.query('citations').collect()
    return { version, record, citations }
  })
  expect(result.version).toMatchObject({
    mode: 'withheld',
    reasonCode: 'core_evidence_failed',
    payload: null,
  })
  expect(result.record?.currentPublishedVersionId).toBeUndefined()
  expect(result.record?.currentMode).toBeUndefined()
  expect(result.citations).toHaveLength(0)
})

test('a later withheld review does not replace the last published version', async () => {
  const t = initTest()
  const first = await seedValidatedCandidate(t, '-history')
  const second = await seedReextractedCandidate(t, first)
  stubReviewFetch([
    JSON.stringify(reviewResponse(first.factIds)),
    JSON.stringify(reviewResponse(second.factIds, { '/title': 'unsupported' })),
  ])
  const firstRun = await startAndDrain(t, first.candidateId)
  const secondRun = await startAndDrain(t, second.candidateId)
  const result = await t.run(async (ctx) => {
    const versions = await ctx.db
      .query('publicationVersions')
      .withIndex('by_candidate', (q) => q.eq('candidateId', first.candidateId))
      .collect()
    const firstVersion = versions[0]
    const secondVersion = await ctx.db
      .query('publicationVersions')
      .withIndex('by_run', (q) => q.eq('runId', secondRun.runId))
      .unique()
    const record = await ctx.db.get(firstVersion.recordId)
    const changes = await ctx.db
      .query('materialChanges')
      .withIndex('by_record_and_created_at', (q) =>
        q.eq('recordId', firstVersion.recordId),
      )
      .collect()
    return { firstVersion, secondVersion, record, changes }
  })
  expect(result.firstVersion).toMatchObject({
    runId: firstRun.runId,
    version: 1,
    mode: 'full',
  })
  expect(result.secondVersion).toMatchObject({
    version: 2,
    mode: 'withheld',
  })
  expect(result.record?.currentPublishedVersionId).toBe(result.firstVersion._id)
  expect(result.record?.currentMode).toBe('full')
  expect(result.changes).toHaveLength(0)
})

test('a later accepted version records a comparison even when the public payload is unchanged', async () => {
  const t = initTest()
  const first = await seedValidatedCandidate(t, '-same-public-payload')
  const second = await seedReextractedCandidate(t, first)
  stubReviewFetch([
    JSON.stringify(reviewResponse(first.factIds)),
    JSON.stringify(reviewResponse(second.factIds)),
  ])
  await startAndDrain(t, first.candidateId)
  await startAndDrain(t, second.candidateId)

  const result = await t.run(async (ctx) => {
    const versions = await ctx.db
      .query('publicationVersions')
      .withIndex('by_candidate', (q) => q.eq('candidateId', second.candidateId))
      .collect()
    const secondVersion = versions[0]
    const changes = await ctx.db
      .query('materialChanges')
      .withIndex('by_current_publication', (q) =>
        q.eq('currentPublicationVersionId', secondVersion._id),
      )
      .collect()
    return { secondVersion, changes }
  })
  expect(result.secondVersion).toMatchObject({ version: 2, mode: 'full' })
  expect(result.changes).toEqual([
    expect.objectContaining({
      currentPublicationVersionId: result.secondVersion._id,
      classification: 'no_public_change',
      material: false,
      fieldChanges: [],
    }),
  ])
})

test('a reviewer verdict that hides its own disagreement fails without a publication version', async () => {
  const t = initTest()
  const seeded = await seedValidatedCandidate(t, '-mismatch')
  stubReviewFetch(
    JSON.stringify(
      reviewResponse(
        seeded.factIds,
        { '/plainLanguageSummary': 'unsupported' },
        'pass',
      ),
    ),
  )
  const started = await startAndDrain(t, seeded.candidateId)
  const result = await t.run(async (ctx) => {
    const run = await ctx.db.get(started.runId)
    const review = await ctx.db
      .query('reviews')
      .withIndex('by_run', (q) => q.eq('runId', started.runId))
      .unique()
    const versions = await ctx.db
      .query('publicationVersions')
      .withIndex('by_run', (q) => q.eq('runId', started.runId))
      .collect()
    return { run, review, versions }
  })
  expect(result.run?.state).toBe('failed_terminal')
  expect(result.review).toMatchObject({
    state: 'failed',
    errorClass: 'schema_invalid',
  })
  expect(result.versions).toHaveLength(0)
})

test('the reviewer cannot use the extraction model', async () => {
  const t = initTest(TERRA_MODEL)
  const seeded = await seedValidatedCandidate(t, '-same-model')
  const fetchMock = stubReviewFetch(
    JSON.stringify(reviewResponse(seeded.factIds)),
  )
  const started = await startAndDrain(t, seeded.candidateId)
  const result = await t.run(async (ctx) => {
    const run = await ctx.db.get(started.runId)
    const review = await ctx.db
      .query('reviews')
      .withIndex('by_run', (q) => q.eq('runId', started.runId))
      .unique()
    return { run, review }
  })
  expect(result.run?.state).toBe('failed_terminal')
  expect(result.review).toMatchObject({
    state: 'failed',
    errorClass: 'review_model_not_independent',
  })
  expect(fetchMock).not.toHaveBeenCalled()
})

test('a gateway response cannot substitute the extraction model for review', async () => {
  const t = initTest()
  const seeded = await seedValidatedCandidate(t, '-gateway-model')
  stubReviewFetch(
    JSON.stringify(reviewResponse(seeded.factIds)),
    [],
    TERRA_MODEL,
  )
  const started = await startAndDrain(t, seeded.candidateId)
  const result = await t.run(async (ctx) => {
    const run = await ctx.db.get(started.runId)
    const review = await ctx.db
      .query('reviews')
      .withIndex('by_run', (q) => q.eq('runId', started.runId))
      .unique()
    return { run, review }
  })
  expect(result.run?.state).toBe('failed_terminal')
  expect(result.review).toMatchObject({
    state: 'failed',
    errorClass: 'review_model_not_independent',
  })
})

test('replaying a succeeded extraction repairs a missing publication run', async () => {
  const t = initTest()
  const seeded = await seedValidatedCandidate(t, '-replay')
  const idempotencyKey = await extractionRunKey({
    registryId: seeded.registryId,
    snapshotId: seeded.snapshotId,
    sourceKind: 'agenda',
    targetRecordId: 'CO-029-2026',
    promptVersion: 'v1.5',
    schemaVersion: 'v1',
    processorVersion: 'v1.14',
  })
  await t.run(async (ctx) => {
    await ctx.db.patch(seeded.runId, { idempotencyKey })
    await ctx.db.insert('pipelineStages', {
      runId: seeded.runId,
      stage: 'extract',
      idempotencyKey: `${idempotencyKey}:extract`,
      state: 'succeeded',
      attempt: 1,
      inputSnapshotId: seeded.snapshotId,
      outputExtractionId: seeded.extractionId,
      promptVersion: 'v1.5',
      schemaVersion: 'v1',
    })
    await ctx.db.insert('pipelineStages', {
      runId: seeded.runId,
      stage: 'validate',
      idempotencyKey: `${idempotencyKey}:validate`,
      state: 'succeeded',
      attempt: 1,
      inputSnapshotId: seeded.snapshotId,
      outputExtractionId: seeded.extractionId,
    })
  })
  stubReviewFetch(JSON.stringify(reviewResponse(seeded.factIds)))

  const replay = await t.mutation(
    internal.operations.extract.startSnapshotExtraction,
    {
      registryId: seeded.registryId,
      snapshotId: seeded.snapshotId,
      sourceKind: 'agenda',
      targetRecordId: 'CO-029-2026',
    },
  )
  expect(replay).toMatchObject({ runId: seeded.runId, reused: true })
  vi.useFakeTimers()
  await t.finishAllScheduledFunctions(vi.runAllTimers)
  vi.useRealTimers()

  const result = await t.run(async (ctx) => {
    const publicationRun = (await ctx.db.query('pipelineRuns').collect()).find(
      (run) => run.candidateId === seeded.candidateId,
    )
    const version = publicationRun
      ? await ctx.db
          .query('publicationVersions')
          .withIndex('by_run', (q) => q.eq('runId', publicationRun._id))
          .unique()
      : null
    return { publicationRun, version }
  })
  expect(result.publicationRun).toMatchObject({
    state: 'succeeded',
    trigger: 'validated_candidate',
  })
  expect(result.version).toMatchObject({ mode: 'full', version: 1 })
})

test('review persistence rejects duplicate fact checks', async () => {
  const t = initTest()
  const seeded = await seedValidatedCandidate(t, '-persist-duplicates')
  const started = await t.mutation(
    internal.operations.publication.startCandidatePublication,
    { candidateId: seeded.candidateId, trigger: 'manual_publication' },
  )
  const prepared = await t.action(
    internal.review.prepare.prepareCandidateReview,
    {
      runId: started.runId,
      reviewStageId: started.reviewStageId,
      candidateId: seeded.candidateId,
    },
  )
  if (!prepared.ok) throw new Error(prepared.errorDetail)
  const review = reviewResponse(seeded.factIds)
  review.checks[1] = { ...review.checks[0] }
  const rawResponseStorageId = await t.run(async (ctx) =>
    ctx.storage.store(new Blob(['{}'], { type: 'application/json' })),
  )

  await expect(
    t.mutation(internal.review.ledger.persistReviewSuccess, {
      runId: started.runId,
      reviewStageId: started.reviewStageId,
      candidateId: seeded.candidateId,
      extractionId: seeded.extractionId,
      registryId: seeded.registryId,
      snapshotId: seeded.snapshotId,
      inputHash: prepared.context.inputHash,
      modelId: LUNA_MODEL,
      route: 'ai_gateway',
      rawResponseStorageId,
      responseHash: await sha256HexOfText('{}'),
      responseByteLength: 2,
      review,
    }),
  ).rejects.toThrow('Review checks must match the persisted candidate facts')
})

test('publication finalization rejects persisted duplicate fact checks', async () => {
  const t = initTest()
  const seeded = await seedValidatedCandidate(t, '-finalize-duplicates')
  const started = await t.mutation(
    internal.operations.publication.startCandidatePublication,
    { candidateId: seeded.candidateId, trigger: 'manual_publication' },
  )
  const prepared = await t.action(
    internal.review.prepare.prepareCandidateReview,
    {
      runId: started.runId,
      reviewStageId: started.reviewStageId,
      candidateId: seeded.candidateId,
    },
  )
  if (!prepared.ok) throw new Error(prepared.errorDetail)
  const reviewId = await t.run(async (ctx) => {
    const insertedReviewId = await ctx.db.insert('reviews', {
      runId: started.runId,
      stageId: started.reviewStageId,
      candidateId: seeded.candidateId,
      extractionId: seeded.extractionId,
      registryId: seeded.registryId,
      snapshotId: seeded.snapshotId,
      inputHash: prepared.context.inputHash,
      state: 'succeeded',
      verdict: 'pass',
      modelRole: 'MODEL_FAST',
      modelId: LUNA_MODEL,
      route: 'ai_gateway',
      promptVersion: 'v1.2',
      schemaVersion: 'v1',
      processorVersion: 'v1',
      createdAt: 1_788_000_000_300,
    })
    const checks = prepared.context.facts.map((fact) => ({
      candidateFactId: fact.factId,
      fieldPath: fact.fieldPath,
    }))
    checks[1] = { ...checks[0] }
    for (const check of checks) {
      await ctx.db.insert('reviewChecks', {
        reviewId: insertedReviewId,
        ...check,
        assessment: 'supported',
        detail: 'The cited span directly supports this value.',
      })
    }
    return insertedReviewId
  })

  await expect(
    t.mutation(internal.publication.ledger.finalizePublication, {
      runId: started.runId,
      finalizeStageId: started.finalizeStageId,
      reviewId,
      context: prepared.context,
    }),
  ).rejects.toThrow('Review checks no longer match the candidate facts')
})

test('a late failure cannot reuse a succeeded review', async () => {
  const t = initTest()
  const seeded = await seedValidatedCandidate(t, '-failure-collision')
  const started = await t.mutation(
    internal.operations.publication.startCandidatePublication,
    { candidateId: seeded.candidateId, trigger: 'manual_publication' },
  )
  const prepared = await t.action(
    internal.review.prepare.prepareCandidateReview,
    {
      runId: started.runId,
      reviewStageId: started.reviewStageId,
      candidateId: seeded.candidateId,
    },
  )
  if (!prepared.ok) throw new Error(prepared.errorDetail)
  await t.run(async (ctx) => {
    await ctx.db.insert('reviews', {
      runId: started.runId,
      stageId: started.reviewStageId,
      candidateId: seeded.candidateId,
      extractionId: seeded.extractionId,
      registryId: seeded.registryId,
      snapshotId: seeded.snapshotId,
      inputHash: prepared.context.inputHash,
      state: 'succeeded',
      verdict: 'pass',
      modelRole: 'MODEL_FAST',
      modelId: LUNA_MODEL,
      route: 'ai_gateway',
      promptVersion: 'v1.2',
      schemaVersion: 'v1',
      processorVersion: 'v1',
      createdAt: 1_788_000_000_300,
    })
  })

  await expect(
    t.mutation(internal.review.ledger.persistReviewFailure, {
      runId: started.runId,
      reviewStageId: started.reviewStageId,
      candidateId: seeded.candidateId,
      extractionId: seeded.extractionId,
      registryId: seeded.registryId,
      snapshotId: seeded.snapshotId,
      inputHash: prepared.context.inputHash,
      modelId: LUNA_MODEL,
      route: 'ai_gateway',
      errorClass: 'review_timeout',
      errorDetail: 'The later review attempt timed out.',
    }),
  ).rejects.toThrow('already has a different review')
})

test('the review contract rejects missing, duplicate, and unknown fact checks', () => {
  const expected = [
    { factId: 'fact-1', fieldPath: '/sourceRecordId' },
    { factId: 'fact-2', fieldPath: '/title' },
  ]
  const supported = (factId: string, fieldPath: string) => ({
    factId,
    fieldPath,
    assessment: 'supported' as const,
    detail: 'The excerpt supports the value.',
  })
  expect(
    checkIndependentReviewContractV1(
      {
        verdict: 'pass',
        checks: [supported('fact-1', '/sourceRecordId')],
        findings: [],
      },
      expected,
      true,
    ),
  ).toContain('omitted fact')
  expect(
    checkIndependentReviewContractV1(
      {
        verdict: 'pass',
        checks: [
          supported('fact-1', '/sourceRecordId'),
          supported('fact-1', '/sourceRecordId'),
        ],
        findings: [],
      },
      expected,
      true,
    ),
  ).toContain('repeats fact')
  expect(
    checkIndependentReviewContractV1(
      {
        verdict: 'pass',
        checks: [
          supported('fact-1', '/sourceRecordId'),
          supported('fact-3', '/title'),
        ],
        findings: [],
      },
      expected,
      true,
    ),
  ).toContain('unknown fact')
})

test('the deterministic policy never trusts the review verdict by itself', () => {
  const review = {
    verdict: 'pass' as const,
    checks: [
      {
        factId: 'fact-1',
        fieldPath: '/title',
        assessment: 'unsupported' as const,
        detail: 'The excerpt does not support the title.',
      },
    ],
    findings: [],
  }
  expect(
    applyPublicationPolicyV1({ sourceRecordId: 'CO-029-2026', review }),
  ).toEqual({ mode: 'withheld', reasonCode: 'core_evidence_failed' })
})

test('a limited finding on a core field is withheld', () => {
  const review = {
    verdict: 'limited' as const,
    checks: [
      {
        factId: 'fact-1',
        fieldPath: '/title',
        assessment: 'supported' as const,
        detail: 'The excerpt supports the title text.',
      },
    ],
    findings: [
      {
        code: 'title_paraphrased',
        severity: 'limited' as const,
        fieldPath: '/title',
        detail: 'The title adds wording that does not appear in the source.',
      },
    ],
  }
  expect(
    expectedReviewVerdictV1({
      sourceRecordIdPresent: true,
      checks: review.checks,
      findings: review.findings,
    }),
  ).toBe('fail')
  expect(
    applyPublicationPolicyV1({ sourceRecordId: 'CO-029-2026', review }),
  ).toEqual({ mode: 'withheld', reasonCode: 'core_evidence_failed' })
})
