/// <reference types="vite/client" />

import { convexTest } from 'convex-test'
import type { TestConvexForDataModelAndIdentity } from 'convex-test'
import { expect, test } from 'vitest'

import { api } from './_generated/api'
import type { DataModel, Id } from './_generated/dataModel'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')
type TestConvex = TestConvexForDataModelAndIdentity<DataModel>
type TestCtx = Parameters<Parameters<TestConvex['run']>[0]>[0]

test('returns only current accepted publication fields to residents', async () => {
  const t = convexTest(schema, modules)

  await t.run(async (ctx) => {
    const jurisdictionId = await ctx.db.insert('jurisdictions', {
      name: 'Lafayette Parish',
      slug: 'lafayette-parish',
      type: 'parish',
      state: 'LA',
      publicStatus: 'validating',
    })
    const governmentBodyId = await ctx.db.insert('governmentBodies', {
      jurisdictionId,
      name: 'Lafayette City Council',
      slug: 'lafayette-city-council',
      bodyType: 'city_council',
      publicStatus: 'validating',
    })
    const registryId = await ctx.db.insert('sourceRegistries', {
      governmentBodyId,
      officialDomains: ['lafayettela.gov'],
      seedUrls: ['https://apps.lafayettela.gov/obcouncil/'],
      sourceKinds: ['agenda'],
      expectedCadence: { kind: 'meeting_cycle' },
      discoveryMode: 'dynamic',
      status: 'validating',
    })

    await seedPublication({
      ctx,
      registryId,
      governmentBodyId,
      sourceRecordId: 'CO-FULL-2026',
      mode: 'full',
      updatedAt: 30,
    })
    await seedPublication({
      ctx,
      registryId,
      governmentBodyId,
      sourceRecordId: 'CO-LIMITED-2026',
      mode: 'limited',
      updatedAt: 40,
    })
    await seedPublication({
      ctx,
      registryId,
      governmentBodyId,
      sourceRecordId: 'CO-WITHHELD-2026',
      mode: 'withheld',
      updatedAt: 50,
    })
  })

  const decisions = await t.query(
    api.resident.discovery.listPublishedDecisions,
    {},
  )

  expect(decisions.map((decision) => decision.sourceRecordId)).toEqual([
    'CO-LIMITED-2026',
    'CO-FULL-2026',
  ])
  expect(decisions[0]).toMatchObject({
    mode: 'limited',
    lifecycleState: null,
    meetingAt: null,
    summary: null,
  })
  expect(decisions[1]).toMatchObject({
    bodyName: 'Lafayette City Council',
    lifecycleState: 'scheduled',
    meetingAt: '2026-09-15T17:30:00-05:00',
    mode: 'full',
    placeName: 'Lafayette Parish',
    placeSlug: 'lafayette-parish',
    summary: 'The council is scheduled to consider the ordinance.',
  })
  expect(JSON.stringify(decisions)).not.toContain('reviewId')
  expect(JSON.stringify(decisions)).not.toContain('snapshotId')
})

async function seedPublication({
  ctx,
  registryId,
  governmentBodyId,
  sourceRecordId,
  mode,
  updatedAt,
}: {
  ctx: TestCtx
  registryId: Id<'sourceRegistries'>
  governmentBodyId: Id<'governmentBodies'>
  sourceRecordId: string
  mode: 'full' | 'limited' | 'withheld'
  updatedAt: number
}) {
  const normalizedStorageId = await ctx.storage.store(
    new Blob([sourceRecordId], { type: 'text/markdown' }),
  )
  const rawStorageId = await ctx.storage.store(
    new Blob([`%PDF-1.7 ${sourceRecordId}`], { type: 'application/pdf' }),
  )
  const snapshotId = await ctx.db.insert('sourceSnapshots', {
    registryId,
    canonicalUrl: `https://apps.lafayettela.gov/${sourceRecordId}.pdf`,
    retrievedUrl: `https://apps.lafayettela.gov/${sourceRecordId}.pdf`,
    contentHash: `raw-${sourceRecordId}`,
    normalizedContentHash: `normalized-${sourceRecordId}`,
    contentType: 'application/pdf',
    retrievalTime: 20,
    version: 1,
    normalizedStorageId,
    normalizedContentType: 'text/markdown',
    normalizedByteLength: sourceRecordId.length,
    rawStorageId,
    rawContentType: 'application/pdf',
    rawByteLength: sourceRecordId.length + 9,
    truncation: { truncated: false },
    firecrawlMetadata: {},
  })
  const extractionRunId = await ctx.db.insert('pipelineRuns', {
    registryId,
    trigger: 'manual_extraction',
    state: 'succeeded',
    processorVersion: 'test',
    snapshotId,
    sourceKind: 'agenda',
    targetRecordId: sourceRecordId,
    startedAt: 1,
    completedAt: 2,
  })
  const extractionId = await ctx.db.insert('extractions', {
    runId: extractionRunId,
    registryId,
    snapshotId,
    sourceKind: 'agenda',
    targetRecordId: sourceRecordId,
    promptVersion: 'test',
    schemaVersion: 'test',
    processorVersion: 'test',
    modelRole: 'MODEL_STRONG',
    modelId: 'test-strong',
    route: 'ai_gateway',
    state: 'extracted',
    createdAt: 3,
  })
  const candidateId = await ctx.db.insert('decisionCandidates', {
    extractionId,
    runId: extractionRunId,
    registryId,
    snapshotId,
    sourceKind: 'agenda',
    targetRecordId: sourceRecordId,
    sourceRecordId,
    recordType: 'proposal',
    title: `Title for ${sourceRecordId}`,
    bodyName: 'Lafayette City Council',
    meetingAt: '2026-09-15T17:30:00-05:00',
    lifecycleState: 'scheduled',
    plainLanguageSummary: 'The council is scheduled to consider the ordinance.',
    affectedPlaces: ['Lafayette Parish'],
    amounts: [],
    publicActions: [],
    state: 'deterministically_validated',
    promptVersion: 'test',
    schemaVersion: 'test',
    modelRole: 'MODEL_STRONG',
    modelId: 'test-strong',
    route: 'ai_gateway',
    createdAt: 4,
  })
  const publicationRunId = await ctx.db.insert('pipelineRuns', {
    registryId,
    trigger: 'manual_publication',
    state: 'succeeded',
    processorVersion: 'test',
    snapshotId,
    sourceKind: 'agenda',
    targetRecordId: sourceRecordId,
    candidateId,
    upstreamRunId: extractionRunId,
    startedAt: 5,
    completedAt: 6,
  })
  const reviewStageId = await ctx.db.insert('pipelineStages', {
    runId: publicationRunId,
    stage: 'review',
    idempotencyKey: `review-${sourceRecordId}`,
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
    inputHash: `input-${sourceRecordId}`,
    state: 'succeeded',
    verdict: mode === 'withheld' ? 'fail' : 'pass',
    modelRole: 'MODEL_FAST',
    modelId: 'test-fast',
    route: 'ai_gateway',
    promptVersion: 'test',
    schemaVersion: 'test',
    processorVersion: 'test',
    createdAt: 7,
  })
  const recordId = await ctx.db.insert('decisionRecords', {
    recordKey: `record-${sourceRecordId}`,
    registryId,
    governmentBodyId,
    sourceRecordId,
    createdAt: updatedAt - 1,
    updatedAt,
  })
  const source = {
    snapshotId,
    sourceKind: 'agenda' as const,
    officialUrl: `https://apps.lafayettela.gov/${sourceRecordId}.pdf`,
    retrievedAt: 20,
  }
  const payload =
    mode === 'withheld'
      ? null
      : mode === 'limited'
        ? {
            kind: 'limited' as const,
            sourceRecordId,
            title: `Title for ${sourceRecordId}`,
            bodyName: 'Lafayette City Council',
            source,
          }
        : {
            kind: 'full' as const,
            sourceRecordId,
            recordType: 'proposal' as const,
            title: `Title for ${sourceRecordId}`,
            bodyName: 'Lafayette City Council',
            meetingAt: '2026-09-15T17:30:00-05:00',
            lifecycleState: 'scheduled' as const,
            plainLanguageSummary:
              'The council is scheduled to consider the ordinance.',
            affectedPlaces: ['Lafayette Parish'],
            amounts: [],
            publicActions: [],
            source,
          }
  const publicationVersionId = await ctx.db.insert('publicationVersions', {
    recordId,
    runId: publicationRunId,
    candidateId,
    reviewId,
    snapshotId,
    version: 1,
    mode,
    reasonCode: `test-${mode}`,
    policyVersion: 'test',
    payloadVersion: 'test',
    payloadHash: `payload-${sourceRecordId}`,
    payload,
    createdAt: updatedAt,
  })
  if (mode !== 'withheld') {
    await ctx.db.patch(recordId, {
      currentPublishedVersionId: publicationVersionId,
      currentMode: mode,
    })
  }
}
