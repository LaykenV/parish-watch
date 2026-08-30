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
import { expectedIssueReviewVerdictV1 } from './issues/contractV1'
import type { IssueCandidateV1 } from './issues/contractV1'
import schema from './schema'
import { sha256HexOfText } from './sources/hashing'

const modules = import.meta.glob('./**/*.ts')
const GATEWAY_URL = 'https://ai-gateway.convex.dev/v1/chat/completions'
const TERRA_MODEL = 'openai/gpt-5.6-terra'
const LUNA_MODEL = 'openai/gpt-5.6-luna'
const SHARED_COUNTERPARTY = 'Terrebonne Parish Consolidated Government'

type TestConvex = TestConvexForDataModelAndIdentity<DataModel>

type SeededIssueInput = {
  recordIds: Id<'decisionRecords'>[]
  currentVersionIds: Id<'publicationVersions'>[]
  citationsByRecord: Array<{
    recordId: Id<'decisionRecords'>
    titleCitationId: Id<'citations'>
    lifecycleCitationId: Id<'citations'>
  }>
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

async function seedIssueInput(t: TestConvex): Promise<SeededIssueInput> {
  return await t.run(async (ctx) => {
    const jurisdictionId = await ctx.db.insert('jurisdictions', {
      name: 'Lafayette Parish',
      slug: 'lafayette-parish-issues',
      type: 'parish',
      state: 'LA',
      publicStatus: 'validating',
    })
    const governmentBodyId = await ctx.db.insert('governmentBodies', {
      jurisdictionId,
      name: 'Lafayette City Council',
      slug: 'lafayette-city-council-issues',
      bodyType: 'city_council',
      officialUrl: 'https://www.lafayettela.gov',
      publicStatus: 'validating',
    })
    const registryId = await ctx.db.insert('sourceRegistries', {
      governmentBodyId,
      officialDomains: ['lafayettela.gov'],
      seedUrls: ['https://apps.lafayettela.gov/obcouncil/'],
      sourceKinds: ['agenda', 'minutes'],
      expectedCadence: { kind: 'meeting_cycle' },
      discoveryMode: 'dynamic',
      status: 'validating',
    })
    const records: SeededIssueInput['citationsByRecord'] = []
    const currentVersionIds: Id<'publicationVersions'>[] = []

    for (const [recordIndex, sourceRecordId] of [
      'CO-022-2026',
      'CO-023-2026',
    ].entries()) {
      const recordId = await ctx.db.insert('decisionRecords', {
        recordKey: `record-key-${sourceRecordId}`,
        registryId,
        governmentBodyId,
        sourceRecordId,
        createdAt: 1_788_000_000_000 + recordIndex,
        updatedAt: 1_788_000_000_000 + recordIndex,
      })
      let previousVersionId: Id<'publicationVersions'> | null = null
      let currentTitleCitationId: Id<'citations'> | null = null
      let currentLifecycleCitationId: Id<'citations'> | null = null

      for (const versionNumber of [1, 2]) {
        const sourceKind = versionNumber === 1 ? 'agenda' : 'minutes'
        const lifecycleState = versionNumber === 1 ? 'scheduled' : 'decided'
        const title = `Donate surplus 2016 Crew Cab pickup ${sourceRecordId} to ${SHARED_COUNTERPARTY} in Lafayette Parish`
        const summary =
          versionNumber === 1
            ? `The council will consider donating a surplus pickup to ${SHARED_COUNTERPARTY}.`
            : `The council adopted the donation of a surplus pickup to ${SHARED_COUNTERPARTY}.`
        const sourceText = `${sourceRecordId}\n${title}\n${lifecycleState}\n${summary}`
        const normalizedStorageId = await ctx.storage.store(
          new Blob([sourceText], { type: 'text/markdown' }),
        )
        const rawStorageId = await ctx.storage.store(
          new Blob([`%PDF-1.7 ${sourceText}`], { type: 'application/pdf' }),
        )
        const snapshotId = await ctx.db.insert('sourceSnapshots', {
          registryId,
          canonicalUrl: `https://apps.lafayettela.gov/obcouncil/${sourceKind}/${sourceRecordId}`,
          retrievedUrl: `https://apps.lafayettela.gov/obcouncil/${sourceKind}/${sourceRecordId}`,
          contentHash: await sha256HexOfText(`raw-${sourceText}`),
          contentHashBasis: 'raw_artifact_v2',
          normalizedContentHash: await sha256HexOfText(sourceText),
          contentType: 'application/pdf',
          retrievalTime: 1_788_000_000_000 + versionNumber,
          version: 1,
          normalizedStorageId,
          normalizedContentType: 'text/markdown',
          normalizedByteLength: sourceText.length,
          rawStorageId,
          rawContentType: 'application/pdf',
          rawByteLength: sourceText.length + 9,
          truncation: { truncated: false },
          firecrawlMetadata: {},
        })
        const extractionRunId = await ctx.db.insert('pipelineRuns', {
          registryId,
          trigger: 'manual_extraction',
          state: 'succeeded',
          processorVersion: 'v1.11',
          snapshotId,
          sourceKind,
          targetRecordId: sourceRecordId,
          startedAt: 1_788_000_000_100 + versionNumber,
          completedAt: 1_788_000_000_200 + versionNumber,
        })
        const extractionId = await ctx.db.insert('extractions', {
          runId: extractionRunId,
          registryId,
          snapshotId,
          sourceKind,
          targetRecordId: sourceRecordId,
          promptVersion: 'v1.5',
          schemaVersion: 'v1',
          processorVersion: 'v1.11',
          modelRole: 'MODEL_STRONG',
          modelId: TERRA_MODEL,
          route: 'ai_gateway',
          state: 'extracted',
          createdAt: 1_788_000_000_150 + versionNumber,
        })
        const candidateId = await ctx.db.insert('decisionCandidates', {
          extractionId,
          runId: extractionRunId,
          registryId,
          snapshotId,
          sourceKind,
          targetRecordId: sourceRecordId,
          sourceRecordId,
          recordType: versionNumber === 1 ? 'proposal' : 'vote',
          title,
          bodyName: 'Lafayette City Council',
          meetingAt: '2026-04-21T17:30:00-05:00',
          lifecycleState,
          plainLanguageSummary: summary,
          affectedPlaces: ['Lafayette Parish', 'Terrebonne Parish'],
          amounts: [],
          publicActions: [],
          state: 'deterministically_validated',
          promptVersion: 'v1.5',
          schemaVersion: 'v1',
          modelRole: 'MODEL_STRONG',
          modelId: TERRA_MODEL,
          route: 'ai_gateway',
          createdAt: 1_788_000_000_160 + versionNumber,
        })
        const publicationRunId = await ctx.db.insert('pipelineRuns', {
          registryId,
          trigger: 'manual_publication',
          state: 'succeeded',
          processorVersion: 'v1',
          snapshotId,
          sourceKind,
          targetRecordId: sourceRecordId,
          candidateId,
          upstreamRunId: extractionRunId,
          startedAt: 1_788_000_000_300 + versionNumber,
          completedAt: 1_788_000_000_400 + versionNumber,
        })
        const reviewStageId = await ctx.db.insert('pipelineStages', {
          runId: publicationRunId,
          stage: 'review',
          idempotencyKey: `review-${sourceRecordId}-${versionNumber}`,
          state: 'succeeded',
          attempt: 1,
        })
        const reviewId = await ctx.db.insert('reviews', {
          runId: publicationRunId,
          stageId: reviewStageId,
          candidateId,
          extractionId,
          registryId,
          snapshotId,
          inputHash: `review-input-${sourceRecordId}-${versionNumber}`,
          state: 'succeeded',
          verdict: 'pass',
          modelRole: 'MODEL_FAST',
          modelId: LUNA_MODEL,
          route: 'ai_gateway',
          promptVersion: 'v1.1',
          schemaVersion: 'v1',
          processorVersion: 'v1',
          createdAt: 1_788_000_000_350 + versionNumber,
        })
        const publicationVersionId = await ctx.db.insert(
          'publicationVersions',
          {
            recordId,
            runId: publicationRunId,
            candidateId,
            reviewId,
            snapshotId,
            version: versionNumber,
            mode: 'full',
            reasonCode: 'evidence_accepted',
            policyVersion: 'v1',
            payloadVersion: 'v1',
            payloadHash: await sha256HexOfText(
              `${sourceRecordId}-${versionNumber}`,
            ),
            payload: {
              kind: 'full',
              sourceRecordId,
              recordType: versionNumber === 1 ? 'proposal' : 'vote',
              title,
              bodyName: 'Lafayette City Council',
              meetingAt: '2026-04-21T17:30:00-05:00',
              lifecycleState,
              plainLanguageSummary: summary,
              affectedPlaces: ['Lafayette Parish', 'Terrebonne Parish'],
              amounts: [],
              publicActions: [],
              source: {
                snapshotId,
                sourceKind,
                officialUrl: `https://apps.lafayettela.gov/obcouncil/${sourceKind}/${sourceRecordId}`,
                retrievedAt: 1_788_000_000_000 + versionNumber,
              },
            },
            createdAt: 1_788_000_000_400 + versionNumber,
          },
        )
        const titleFactId = await ctx.db.insert('candidateFacts', {
          candidateId,
          extractionId,
          fieldPath: '/title',
          value: title,
          sourceSnapshotId: snapshotId,
          excerpt: title,
        })
        const lifecycleFactId = await ctx.db.insert('candidateFacts', {
          candidateId,
          extractionId,
          fieldPath: '/lifecycleState',
          value: lifecycleState,
          sourceSnapshotId: snapshotId,
          excerpt: `${sourceRecordId} ${lifecycleState}`,
        })
        const titleCitationId = await ctx.db.insert('citations', {
          publicationVersionId,
          candidateFactId: titleFactId,
          fieldPath: '/title',
          snapshotId,
          officialUrl: `https://apps.lafayettela.gov/obcouncil/${sourceKind}/${sourceRecordId}`,
          excerpt: title,
          normalizedStartOffset: 0,
          normalizedEndOffset: title.length,
          retrievedAt: 1_788_000_000_000 + versionNumber,
        })
        const lifecycleCitationId = await ctx.db.insert('citations', {
          publicationVersionId,
          candidateFactId: lifecycleFactId,
          fieldPath: '/lifecycleState',
          snapshotId,
          officialUrl: `https://apps.lafayettela.gov/obcouncil/${sourceKind}/${sourceRecordId}`,
          excerpt: `${sourceRecordId} ${lifecycleState}`,
          normalizedStartOffset: title.length + 1,
          normalizedEndOffset: title.length + lifecycleState.length + 2,
          retrievedAt: 1_788_000_000_000 + versionNumber,
        })
        await ctx.db.patch(extractionId, { candidateId })
        if (versionNumber === 2 && previousVersionId) {
          await ctx.db.insert('materialChanges', {
            recordId,
            previousPublicationVersionId: previousVersionId,
            currentPublicationVersionId: publicationVersionId,
            classification: 'decided',
            material: true,
            fieldChanges: [
              {
                fieldPath: '/lifecycleState',
                kind: 'changed',
                previousValue: JSON.stringify('scheduled'),
                currentValue: JSON.stringify('decided'),
              },
            ],
            createdAt: 1_788_000_000_500 + recordIndex,
          })
          currentTitleCitationId = titleCitationId
          currentLifecycleCitationId = lifecycleCitationId
          currentVersionIds.push(publicationVersionId)
          await ctx.db.patch(recordId, {
            currentPublishedVersionId: publicationVersionId,
            currentMode: 'full',
            updatedAt: 1_788_000_000_500 + recordIndex,
          })
        }
        previousVersionId = publicationVersionId
      }
      if (!currentTitleCitationId || !currentLifecycleCitationId) {
        throw new Error('Current publication citations were not seeded')
      }
      records.push({
        recordId,
        titleCitationId: currentTitleCitationId,
        lifecycleCitationId: currentLifecycleCitationId,
      })
    }
    records.sort((left, right) => left.recordId.localeCompare(right.recordId))
    currentVersionIds.sort((left, right) => left.localeCompare(right))
    return {
      recordIds: records.map((record) => record.recordId),
      currentVersionIds,
      citationsByRecord: records,
    }
  })
}

async function advanceCurrentVersions(
  t: TestConvex,
  seeded: SeededIssueInput,
): Promise<SeededIssueInput> {
  return await t.run(async (ctx) => {
    const citationsByRecord: SeededIssueInput['citationsByRecord'] = []
    const currentVersionIds: Id<'publicationVersions'>[] = []
    for (const seededRecord of seeded.citationsByRecord) {
      const record = await ctx.db.get(seededRecord.recordId)
      const previous = record?.currentPublishedVersionId
        ? await ctx.db.get(record.currentPublishedVersionId)
        : null
      if (!record || !previous || previous.payload === null) {
        throw new Error('Current publication is missing')
      }
      const currentPublicationVersionId = await ctx.db.insert(
        'publicationVersions',
        {
          recordId: record._id,
          runId: previous.runId,
          candidateId: previous.candidateId,
          reviewId: previous.reviewId,
          snapshotId: previous.snapshotId,
          version: previous.version + 1,
          mode: previous.mode,
          reasonCode: previous.reasonCode,
          policyVersion: previous.policyVersion,
          payloadVersion: previous.payloadVersion,
          payloadHash: await sha256HexOfText(`${previous.payloadHash}-refresh`),
          payload: previous.payload,
          createdAt: previous.createdAt + 1_000,
        },
      )
      const previousCitations = await ctx.db
        .query('citations')
        .withIndex('by_publication_and_field_path', (q) =>
          q.eq('publicationVersionId', previous._id),
        )
        .collect()
      let titleCitationId: Id<'citations'> | null = null
      let lifecycleCitationId: Id<'citations'> | null = null
      for (const citation of previousCitations) {
        const citationId = await ctx.db.insert('citations', {
          publicationVersionId: currentPublicationVersionId,
          candidateFactId: citation.candidateFactId,
          fieldPath: citation.fieldPath,
          snapshotId: citation.snapshotId,
          officialUrl: citation.officialUrl,
          excerpt: citation.excerpt,
          page: citation.page,
          section: citation.section,
          normalizedStartOffset: citation.normalizedStartOffset,
          normalizedEndOffset: citation.normalizedEndOffset,
          retrievedAt: citation.retrievedAt,
        })
        if (citation.fieldPath === '/title') titleCitationId = citationId
        if (citation.fieldPath === '/lifecycleState') {
          lifecycleCitationId = citationId
        }
      }
      if (!titleCitationId || !lifecycleCitationId) {
        throw new Error('Copied publication citations are incomplete')
      }
      await ctx.db.insert('materialChanges', {
        recordId: record._id,
        previousPublicationVersionId: previous._id,
        currentPublicationVersionId,
        classification: 'no_public_change',
        material: false,
        fieldChanges: [],
        createdAt: previous.createdAt + 1_000,
      })
      await ctx.db.patch(record._id, {
        currentPublishedVersionId: currentPublicationVersionId,
        currentMode: previous.mode === 'withheld' ? undefined : previous.mode,
        updatedAt: previous.createdAt + 1_000,
      })
      currentVersionIds.push(currentPublicationVersionId)
      citationsByRecord.push({
        recordId: record._id,
        titleCitationId,
        lifecycleCitationId,
      })
    }
    citationsByRecord.sort((left, right) =>
      left.recordId.localeCompare(right.recordId),
    )
    currentVersionIds.sort((left, right) => left.localeCompare(right))
    return {
      recordIds: citationsByRecord.map((item) => item.recordId),
      currentVersionIds,
      citationsByRecord,
    }
  })
}

function issueCandidate(
  seeded: SeededIssueInput,
  options: {
    genericSignal?: boolean
    jurisdictionSignal?: boolean
    secondFactor?: boolean
  } = {},
): IssueCandidateV1 {
  const titleCitations = seeded.citationsByRecord.map(
    (record) => record.titleCitationId,
  )
  const lifecycleCitations = seeded.citationsByRecord.map(
    (record) => record.lifecycleCitationId,
  )
  const links = seeded.recordIds.map((recordId, index) => ({
    recordId,
    relationship: 'same_subject_and_counterparty' as const,
    reason: `Decision ${index + 1} donates a surplus pickup to ${SHARED_COUNTERPARTY}.`,
  }))
  const signalValue = options.genericSignal
    ? 'donation'
    : options.jurisdictionSignal
      ? 'Lafayette Parish'
      : SHARED_COUNTERPARTY
  const importanceFactors: IssueCandidateV1['importanceFactors'] = [
    {
      factor: 'public_money',
      level: 'absent',
      rationale: '',
    },
    {
      factor: 'public_assets',
      level: 'low',
      rationale: 'The decisions transfer two surplus public pickup trucks.',
    },
    {
      factor: 'land_use',
      level: 'absent',
      rationale: '',
    },
    {
      factor: 'health_safety',
      level: 'absent',
      rationale: '',
    },
    {
      factor: 'rights_access',
      level: 'absent',
      rationale: '',
    },
    {
      factor: 'service_delivery',
      level: options.secondFactor ? 'low' : 'absent',
      rationale: options.secondFactor
        ? 'The recipient government may use the transferred vehicles for services.'
        : '',
    },
    {
      factor: 'public_deadline',
      level: 'absent',
      rationale: '',
    },
  ]
  const facts: IssueCandidateV1['facts'] = [
    {
      fieldPath: '/title',
      value: 'Donation of two surplus pickup trucks to Terrebonne Parish',
      citationIds: titleCitations,
    },
    {
      fieldPath: '/summary',
      value:
        'The Lafayette City Council adopted two separate donations of surplus pickup trucks to Terrebonne Parish Consolidated Government.',
      citationIds: titleCitations,
    },
    {
      fieldPath: '/lifecycleState',
      value: 'decided',
      citationIds: lifecycleCitations,
    },
    {
      fieldPath: '/topics/0',
      value: 'public assets',
      citationIds: titleCitations,
    },
    ...links.map((link, index) => ({
      fieldPath: `/links/${index}/reason`,
      value: link.reason,
      citationIds: titleCitations,
    })),
    {
      fieldPath: '/sharedSignals/0/value',
      value: signalValue,
      citationIds: titleCitations,
    },
    {
      fieldPath: '/importanceFactors/public_assets/rationale',
      value: 'The decisions transfer two surplus public pickup trucks.',
      citationIds: titleCitations,
    },
  ]
  if (options.secondFactor) {
    facts.push({
      fieldPath: '/importanceFactors/service_delivery/rationale',
      value:
        'The recipient government may use the transferred vehicles for services.',
      citationIds: titleCitations,
    })
  }
  return {
    title: 'Donation of two surplus pickup trucks to Terrebonne Parish',
    summary:
      'The Lafayette City Council adopted two separate donations of surplus pickup trucks to Terrebonne Parish Consolidated Government.',
    lifecycleState: 'decided',
    nextKnownAction: null,
    topics: ['public assets'],
    links,
    sharedSignals: [
      {
        kind: options.jurisdictionSignal ? 'location' : 'counterparty',
        value: signalValue,
        citationIds: titleCitations,
      },
    ],
    importanceFactors,
    facts,
  }
}

function issueReview(
  candidate: IssueCandidateV1,
  overrides: Partial<
    Record<string, 'supported' | 'unclear' | 'unsupported'>
  > = {},
) {
  const checks = candidate.facts.map((fact) => ({
    fieldPath: fact.fieldPath,
    assessment: overrides[fact.fieldPath] ?? 'supported',
    detail:
      (overrides[fact.fieldPath] ?? 'supported') === 'supported'
        ? 'The cited excerpts directly support this value.'
        : 'The cited excerpts do not directly support this value.',
  }))
  const findings: Array<{
    code: string
    severity: 'info' | 'limited' | 'fail'
    fieldPath: string | null
    detail: string
  }> = []
  return {
    verdict: expectedIssueReviewVerdictV1({ checks, findings }),
    checks,
    findings,
  }
}

function stubIssueFetch(
  responses: Array<{ model: string; content: unknown }>,
  requests: Array<Record<string, unknown>> = [],
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
      if (url !== GATEWAY_URL) throw new Error(`Unexpected URL ${url}`)
      requests.push(JSON.parse(String(init?.body)))
      const response = responses[Math.min(call, responses.length - 1)]
      call += 1
      return new Response(
        JSON.stringify({
          id: `issue-response-${call}`,
          object: 'chat.completion',
          model: response.model,
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: JSON.stringify(response.content),
                refusal: null,
              },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 1_000,
            completion_tokens: 500,
            total_tokens: 1_500,
            prompt_tokens_details: { cached_tokens: 100 },
            completion_tokens_details: { reasoning_tokens: 200 },
          },
        }),
        { status: 200 },
      )
    },
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function startAndDrain(
  t: TestConvex,
  recordIds: Id<'decisionRecords'>[],
) {
  const started = await t.mutation(internal.operations.issues.startIssueBuild, {
    recordIds,
    trigger: 'manual_issue_build',
  })
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

test('two atomic decisions publish one cited issue, score, timeline, and material change', async () => {
  const t = initTest()
  const seeded = await seedIssueInput(t)
  const candidate = issueCandidate(seeded)
  const requests: Array<Record<string, unknown>> = []
  const fetchMock = stubIssueFetch(
    [
      { model: TERRA_MODEL, content: candidate },
      { model: LUNA_MODEL, content: issueReview(candidate) },
    ],
    requests,
  )

  const started = await startAndDrain(t, seeded.recordIds)
  const evidence = await t.query(
    internal.operations.issues.readIssueBuildEvidence,
    { runId: started.runId },
  )
  expect(evidence.run?.state).toBe('succeeded')
  expect(evidence.build).toMatchObject({
    state: 'published',
    modelRole: 'MODEL_STRONG',
    modelId: TERRA_MODEL,
    rankedResult: {
      mode: 'full',
      importance: {
        score: 5,
        maxScore: 100,
        completenessPercent: 14,
        supportedFactorCount: 1,
        totalFactorCount: 7,
        hasNearTermPublicDeadline: false,
      },
    },
  })
  expect(evidence.review).toMatchObject({
    state: 'succeeded',
    verdict: 'pass',
    modelId: LUNA_MODEL,
  })
  expect(evidence.links).toHaveLength(2)
  expect(evidence.assessments).toEqual([
    expect.objectContaining({
      factor: 'public_assets',
      level: 'low',
      points: 5,
      maxPoints: 20,
    }),
  ])
  expect(evidence.aiCalls).toHaveLength(2)
  expect(evidence.issueVersion).toMatchObject({
    version: 1,
    mode: 'full',
    payload: {
      kind: 'full',
      lifecycleState: 'decided',
      topics: ['public assets'],
    },
  })
  const issueEvidence = await t.query(
    internal.operations.issues.readIssueEvidence,
    { issueId: evidence.issue?._id as Id<'issues'> },
  )
  expect(issueEvidence.decisions).toHaveLength(2)
  expect(issueEvidence.build?.candidate?.facts).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        fieldPath: '/summary',
        citationIds: seeded.citationsByRecord.map(
          (record) => record.titleCitationId,
        ),
      }),
    ]),
  )
  expect(issueEvidence.reviewChecks).toHaveLength(candidate.facts.length)
  expect(
    issueEvidence.decisions.every(
      (decision) =>
        decision.versions.length === 2 &&
        decision.changes.some(
          (change) => change.classification === 'decided' && change.material,
        ) &&
        decision.citations.length === 4,
    ),
  ).toBe(true)
  expect(requests[0]).toMatchObject({
    model: TERRA_MODEL,
    reasoning_effort: 'high',
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'public_parish_issue_candidate_v1', strict: true },
    },
  })
  expect(JSON.stringify(requests[0].messages)).toContain(
    'copy its corresponding output field exactly, character for character',
  )
  expect(JSON.stringify(requests[0].messages)).toContain(
    'must state the documented consequence',
  )
  expect(requests[1]).toMatchObject({
    model: LUNA_MODEL,
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'public_parish_issue_review_v1', strict: true },
    },
  })
  expect(JSON.stringify(requests[1].messages)).not.toContain('SOURCE BEGIN')

  const replay = await t.mutation(internal.operations.issues.startIssueBuild, {
    recordIds: [...seeded.recordIds].reverse(),
    trigger: 'manual_issue_build',
  })
  expect(replay).toMatchObject({
    runId: started.runId,
    issueBuildId: started.issueBuildId,
    reused: true,
  })
  expect(fetchMock).toHaveBeenCalledTimes(2)
})

test('a generic title-level similarity signal fails before independent review', async () => {
  const t = initTest()
  const seeded = await seedIssueInput(t)
  const candidate = issueCandidate(seeded, { genericSignal: true })
  const fetchMock = stubIssueFetch([{ model: TERRA_MODEL, content: candidate }])

  const started = await startAndDrain(t, seeded.recordIds)
  const evidence = await t.query(
    internal.operations.issues.readIssueBuildEvidence,
    { runId: started.runId },
  )
  expect(evidence.run?.state).toBe('failed_terminal')
  expect(evidence.build).toMatchObject({
    state: 'failed',
    errorClass: 'issue_candidate_invalid',
  })
  expect(evidence.build?.rawResponseStorageId).toBeDefined()
  expect(evidence.build?.responseHash).toBeDefined()
  expect(evidence.review).toBeNull()
  expect(evidence.issueVersion).toBeNull()
  expect(fetchMock).toHaveBeenCalledTimes(1)
})

test('the home jurisdiction cannot be the only shared signal', async () => {
  const t = initTest()
  const seeded = await seedIssueInput(t)
  const candidate = issueCandidate(seeded, { jurisdictionSignal: true })
  const fetchMock = stubIssueFetch([{ model: TERRA_MODEL, content: candidate }])

  const started = await startAndDrain(t, seeded.recordIds)
  const evidence = await t.query(
    internal.operations.issues.readIssueBuildEvidence,
    { runId: started.runId },
  )
  expect(evidence.run?.state).toBe('failed_terminal')
  expect(evidence.build).toMatchObject({
    state: 'failed',
    errorClass: 'issue_candidate_invalid',
    errorDetail: expect.stringContaining('government body or jurisdiction'),
  })
  expect(evidence.review).toBeNull()
  expect(fetchMock).toHaveBeenCalledTimes(1)
})

test('a failed issue build can retry the same deterministic input', async () => {
  const t = initTest()
  const seeded = await seedIssueInput(t)
  const rejectedCandidate = issueCandidate(seeded, { genericSignal: true })
  const acceptedCandidate = issueCandidate(seeded)
  const fetchMock = stubIssueFetch([
    { model: TERRA_MODEL, content: rejectedCandidate },
    { model: TERRA_MODEL, content: acceptedCandidate },
    { model: LUNA_MODEL, content: issueReview(acceptedCandidate) },
  ])

  const failed = await startAndDrain(t, seeded.recordIds)
  const retried = await startAndDrain(t, seeded.recordIds)
  expect(retried).toMatchObject({ reused: false })
  expect(retried.runId).not.toBe(failed.runId)
  expect(retried.issueBuildId).not.toBe(failed.issueBuildId)

  const evidence = await t.query(
    internal.operations.issues.readIssueBuildEvidence,
    { runId: retried.runId },
  )
  expect(evidence.run?.state).toBe('succeeded')
  expect(evidence.build?.state).toBe('published')

  const replay = await t.mutation(internal.operations.issues.startIssueBuild, {
    recordIds: [...seeded.recordIds].reverse(),
    trigger: 'manual_issue_build',
  })
  expect(replay).toMatchObject({
    runId: retried.runId,
    issueBuildId: retried.issueBuildId,
    reused: true,
  })
  expect(fetchMock).toHaveBeenCalledTimes(3)
})

test('a contract-invalid linker response keeps its raw evidence', async () => {
  const t = initTest()
  const seeded = await seedIssueInput(t)
  const candidate = issueCandidate(seeded)
  const rationaleFact = candidate.facts.find(
    (fact) => fact.fieldPath === '/importanceFactors/public_assets/rationale',
  )
  if (!rationaleFact) throw new Error('Public-assets rationale fact is missing')
  rationaleFact.value = 'The decisions transfer public pickup trucks.'
  const fetchMock = stubIssueFetch([{ model: TERRA_MODEL, content: candidate }])

  const started = await startAndDrain(t, seeded.recordIds)
  const evidence = await t.query(
    internal.operations.issues.readIssueBuildEvidence,
    { runId: started.runId },
  )
  expect(evidence.build).toMatchObject({
    state: 'failed',
    errorClass: 'schema_invalid',
  })
  expect(evidence.build?.rawResponseStorageId).toBeDefined()
  expect(evidence.build?.responseHash).toBeDefined()
  expect(evidence.review).toBeNull()
  expect(fetchMock).toHaveBeenCalledTimes(1)
})

test('a link reason with evidence from only its own record fails before review', async () => {
  const t = initTest()
  const seeded = await seedIssueInput(t)
  const candidate = issueCandidate(seeded)
  const firstLinkFact = candidate.facts.find(
    (fact) => fact.fieldPath === '/links/0/reason',
  )
  if (!firstLinkFact) throw new Error('First link fact is missing')
  firstLinkFact.citationIds = [seeded.citationsByRecord[0].titleCitationId]
  const fetchMock = stubIssueFetch([{ model: TERRA_MODEL, content: candidate }])

  const started = await startAndDrain(t, seeded.recordIds)
  const evidence = await t.query(
    internal.operations.issues.readIssueBuildEvidence,
    { runId: started.runId },
  )
  expect(evidence.build).toMatchObject({
    state: 'failed',
    errorClass: 'issue_candidate_invalid',
  })
  expect(evidence.review).toBeNull()
  expect(fetchMock).toHaveBeenCalledTimes(1)
})

test('changing a current publication after start closes the build before any model call', async () => {
  const t = initTest()
  const seeded = await seedIssueInput(t)
  const fetchMock = stubIssueFetch([])
  const started = await t.mutation(internal.operations.issues.startIssueBuild, {
    recordIds: seeded.recordIds,
    trigger: 'manual_issue_build',
  })
  await t.run(async (ctx) => {
    await ctx.db.patch(seeded.recordIds[0], {
      currentPublishedVersionId: undefined,
      currentMode: undefined,
    })
  })
  vi.useFakeTimers()
  await t.finishAllScheduledFunctions(vi.runAllTimers)
  vi.useRealTimers()

  const evidence = await t.query(
    internal.operations.issues.readIssueBuildEvidence,
    { runId: started.runId },
  )
  expect(evidence.run?.state).toBe('failed_terminal')
  expect(evidence.build).toMatchObject({
    state: 'failed',
    errorClass: 'issue_link_step_failed',
  })
  expect(fetchMock).not.toHaveBeenCalled()
})

test('an unsupported importance factor contributes zero without reducing another supported factor', async () => {
  const t = initTest()
  const seeded = await seedIssueInput(t)
  const candidate = issueCandidate(seeded, { secondFactor: true })
  const review = issueReview(candidate, {
    '/importanceFactors/public_assets/rationale': 'unsupported',
  })
  stubIssueFetch([
    { model: TERRA_MODEL, content: candidate },
    { model: LUNA_MODEL, content: review },
  ])

  const started = await startAndDrain(t, seeded.recordIds)
  const evidence = await t.query(
    internal.operations.issues.readIssueBuildEvidence,
    { runId: started.runId },
  )
  expect(evidence.issueVersion).toMatchObject({
    mode: 'limited',
    reasonCode: 'secondary_issue_evidence_limited',
    payload: {
      kind: 'limited',
      importance: {
        score: 3,
        supportedFactorCount: 1,
        completenessPercent: 14,
      },
    },
  })
  expect(evidence.assessments).toEqual([
    expect.objectContaining({
      factor: 'service_delivery',
      level: 'low',
      points: 3,
    }),
  ])
})

test('the independent issue reviewer cannot use the linking model', async () => {
  const t = initTest(TERRA_MODEL)
  const seeded = await seedIssueInput(t)
  const candidate = issueCandidate(seeded)
  const fetchMock = stubIssueFetch([{ model: TERRA_MODEL, content: candidate }])

  const started = await startAndDrain(t, seeded.recordIds)
  const evidence = await t.query(
    internal.operations.issues.readIssueBuildEvidence,
    { runId: started.runId },
  )
  expect(evidence.run?.state).toBe('failed_terminal')
  expect(evidence.review).toMatchObject({
    state: 'failed',
    errorClass: 'issue_review_model_not_independent',
  })
  expect(evidence.issueVersion).toBeNull()
  expect(fetchMock).toHaveBeenCalledTimes(1)
})

test('unsupported core issue evidence writes history without a current pointer', async () => {
  const t = initTest()
  const seeded = await seedIssueInput(t)
  const candidate = issueCandidate(seeded)
  stubIssueFetch([
    { model: TERRA_MODEL, content: candidate },
    {
      model: LUNA_MODEL,
      content: issueReview(candidate, { '/summary': 'unsupported' }),
    },
  ])

  const started = await startAndDrain(t, seeded.recordIds)
  const evidence = await t.query(
    internal.operations.issues.readIssueBuildEvidence,
    { runId: started.runId },
  )
  expect(evidence.run?.state).toBe('succeeded')
  expect(evidence.build?.state).toBe('withheld')
  expect(evidence.issueVersion).toMatchObject({
    mode: 'withheld',
    reasonCode: 'core_issue_evidence_failed',
    payload: null,
  })
  expect(evidence.issue?.currentVersionId).toBeUndefined()
  expect(evidence.issue?.currentMode).toBeUndefined()
  expect(evidence.links).toHaveLength(0)
  expect(evidence.assessments).toHaveLength(0)
})

test('a published decision refresh creates one new issue version and replays without duplicates', async () => {
  const t = initTest()
  const seeded = await seedIssueInput(t)
  const firstCandidate = issueCandidate(seeded)
  stubIssueFetch([
    { model: TERRA_MODEL, content: firstCandidate },
    { model: LUNA_MODEL, content: issueReview(firstCandidate) },
  ])
  const firstStarted = await startAndDrain(t, seeded.recordIds)
  const firstEvidence = await t.query(
    internal.operations.issues.readIssueBuildEvidence,
    { runId: firstStarted.runId },
  )
  vi.unstubAllGlobals()

  const refreshedInput = await advanceCurrentVersions(t, seeded)
  const refreshedCandidate = issueCandidate(refreshedInput)
  const refreshFetch = stubIssueFetch([
    { model: TERRA_MODEL, content: refreshedCandidate },
    { model: LUNA_MODEL, content: issueReview(refreshedCandidate) },
  ])
  await t.mutation(internal.operations.issues.refreshLinkedIssues, {
    recordId: seeded.recordIds[0],
  })
  vi.useFakeTimers()
  await t.finishAllScheduledFunctions(vi.runAllTimers)
  vi.useRealTimers()

  const issueEvidence = await t.query(
    internal.operations.issues.readIssueEvidence,
    { issueId: firstEvidence.issue?._id as Id<'issues'> },
  )
  expect(issueEvidence.versions.map((version) => version.version)).toEqual([
    2, 1,
  ])
  expect(issueEvidence.currentVersion?.version).toBe(2)
  expect(refreshFetch).toHaveBeenCalledTimes(2)

  await t.mutation(internal.operations.issues.refreshLinkedIssues, {
    recordId: seeded.recordIds[1],
  })
  vi.useFakeTimers()
  await t.finishAllScheduledFunctions(vi.runAllTimers)
  vi.useRealTimers()
  const replayed = await t.query(internal.operations.issues.readIssueEvidence, {
    issueId: firstEvidence.issue?._id as Id<'issues'>,
  })
  expect(replayed.versions).toHaveLength(2)
  expect(refreshFetch).toHaveBeenCalledTimes(2)

  vi.unstubAllGlobals()
  const withheldInput = await advanceCurrentVersions(t, refreshedInput)
  const withheldCandidate = issueCandidate(withheldInput)
  const withheldFetch = stubIssueFetch([
    { model: TERRA_MODEL, content: withheldCandidate },
    {
      model: LUNA_MODEL,
      content: issueReview(withheldCandidate, { '/summary': 'unsupported' }),
    },
  ])
  await t.mutation(internal.operations.issues.refreshLinkedIssues, {
    recordId: seeded.recordIds[0],
  })
  vi.useFakeTimers()
  await t.finishAllScheduledFunctions(vi.runAllTimers)
  vi.useRealTimers()
  const withheld = await t.query(internal.operations.issues.readIssueEvidence, {
    issueId: firstEvidence.issue?._id as Id<'issues'>,
  })
  expect(withheld.versions.map((version) => version.version)).toEqual([3, 2, 1])
  expect(withheld.versions[0].mode).toBe('withheld')
  expect(withheld.currentVersion?.version).toBe(2)
  expect(withheldFetch).toHaveBeenCalledTimes(2)

  await t.mutation(internal.operations.issues.refreshLinkedIssues, {
    recordId: seeded.recordIds[1],
  })
  vi.useFakeTimers()
  await t.finishAllScheduledFunctions(vi.runAllTimers)
  vi.useRealTimers()
  const finalReplay = await t.query(
    internal.operations.issues.readIssueEvidence,
    { issueId: firstEvidence.issue?._id as Id<'issues'> },
  )
  expect(finalReplay.versions).toHaveLength(3)
  expect(finalReplay.currentVersion?.version).toBe(2)
  expect(withheldFetch).toHaveBeenCalledTimes(2)
})
