import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

import { aiRoutes, modelRoles } from './ai/types'
import {
  lifecycleStates,
  publicActionTypes,
  recordTypes,
} from './extraction/contractV1'
import {
  processingStates,
  runTriggers,
  sourceKindUnion,
  stageNames,
} from './pipeline/state'
import { firecrawlMetadataValue } from './sources/metadata'

const coverageStatuses = v.union(
  v.literal('candidate'),
  v.literal('validating'),
  v.literal('supported'),
  v.literal('degraded'),
  v.literal('paused'),
)

const cadenceKinds = v.union(
  v.literal('daily'),
  v.literal('weekly'),
  v.literal('monthly'),
  v.literal('meeting_cycle'),
  v.literal('unknown'),
)

const sourceKinds = sourceKindUnion

export default defineSchema({
  jurisdictions: defineTable({
    name: v.string(),
    slug: v.string(),
    type: v.union(v.literal('parish'), v.literal('municipality')),
    state: v.string(),
    parentJurisdictionId: v.optional(v.id('jurisdictions')),
    publicStatus: coverageStatuses,
    qualityGateAt: v.optional(v.number()),
  })
    .index('by_slug', ['slug'])
    .index('by_state_and_public_status', ['state', 'publicStatus']),

  governmentBodies: defineTable({
    jurisdictionId: v.id('jurisdictions'),
    name: v.string(),
    slug: v.string(),
    bodyType: v.union(
      v.literal('city_council'),
      v.literal('parish_council'),
      v.literal('planning_commission'),
      v.literal('other'),
    ),
    officialUrl: v.optional(v.string()),
    publicStatus: coverageStatuses,
  })
    .index('by_slug', ['slug'])
    .index('by_jurisdiction_and_status', ['jurisdictionId', 'publicStatus'])
    .index('by_jurisdiction_and_slug', ['jurisdictionId', 'slug']),

  sourceRegistries: defineTable({
    governmentBodyId: v.id('governmentBodies'),
    officialDomains: v.array(v.string()),
    seedUrls: v.array(v.string()),
    sourceKinds: v.array(sourceKinds),
    expectedCadence: v.object({
      kind: cadenceKinds,
      expectedWeekdays: v.optional(v.array(v.number())),
    }),
    discoveryMode: v.union(v.literal('dynamic'), v.literal('adapter')),
    status: coverageStatuses,
    lastDiscoveryAt: v.optional(v.number()),
    lastHealthyAt: v.optional(v.number()),
    nextScheduledCheckAt: v.optional(v.number()),
  })
    .index('by_body_and_status', ['governmentBodyId', 'status'])
    .index('by_next_scheduled_check', ['nextScheduledCheckAt']),

  sourceSnapshots: defineTable({
    registryId: v.id('sourceRegistries'),
    canonicalUrl: v.string(),
    retrievedUrl: v.string(),
    contentHash: v.string(),
    contentHashBasis: v.optional(
      v.union(
        v.literal('normalized_markdown_v1'),
        v.literal('raw_artifact_v2'),
      ),
    ),
    normalizedContentHash: v.optional(v.string()),
    contentType: v.string(),
    retrievalTime: v.number(),
    version: v.number(),
    previousSnapshotId: v.optional(v.id('sourceSnapshots')),
    normalizedStorageId: v.id('_storage'),
    normalizedContentType: v.string(),
    normalizedByteLength: v.number(),
    rawStorageId: v.id('_storage'),
    rawContentType: v.string(),
    rawByteLength: v.number(),
    pageMap: v.optional(
      v.array(
        v.object({
          page: v.number(),
          startOffset: v.number(),
          endOffset: v.number(),
        }),
      ),
    ),
    truncation: v.object({
      truncated: v.boolean(),
      detail: v.optional(v.string()),
    }),
    firecrawlMetadata: v.record(v.string(), firecrawlMetadataValue),
  })
    .index('by_registry_and_retrieval_time', ['registryId', 'retrievalTime'])
    .index('by_registry_and_canonical_url_and_content_hash', [
      'registryId',
      'canonicalUrl',
      'contentHash',
    ])
    .index('by_registry_and_canonical_url_and_retrieval_time', [
      'registryId',
      'canonicalUrl',
      'retrievalTime',
    ])
    .index('by_registry_and_canonical_url_and_version', [
      'registryId',
      'canonicalUrl',
      'version',
    ]),

  pipelineRuns: defineTable({
    registryId: v.id('sourceRegistries'),
    trigger: runTriggers,
    state: processingStates,
    processorVersion: v.string(),
    snapshotId: v.optional(v.id('sourceSnapshots')),
    idempotencyKey: v.optional(v.string()),
    workflowId: v.optional(v.string()),
    sourceKind: v.optional(sourceKinds),
    targetRecordId: v.optional(v.string()),
    candidateId: v.optional(v.id('decisionCandidates')),
    upstreamRunId: v.optional(v.id('pipelineRuns')),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index('by_state_and_started_time', ['state', 'startedAt'])
    .index('by_registry_and_started_time', ['registryId', 'startedAt'])
    .index('by_idempotency_key', ['idempotencyKey']),

  pipelineStages: defineTable({
    runId: v.id('pipelineRuns'),
    stage: stageNames,
    idempotencyKey: v.string(),
    state: processingStates,
    attempt: v.number(),
    inputUrl: v.optional(v.string()),
    inputSnapshotId: v.optional(v.id('sourceSnapshots')),
    outputSnapshotId: v.optional(v.id('sourceSnapshots')),
    outputExtractionId: v.optional(v.id('extractions')),
    outputReviewId: v.optional(v.id('reviews')),
    outputPublicationVersionId: v.optional(v.id('publicationVersions')),
    promptVersion: v.optional(v.string()),
    schemaVersion: v.optional(v.string()),
    errorClass: v.optional(v.string()),
    errorDetail: v.optional(v.string()),
    retryAt: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    creditsUsed: v.optional(v.number()),
    retrievedUrl: v.optional(v.string()),
    targetStatusCode: v.optional(v.number()),
    outputContentHash: v.optional(v.string()),
    normalizedContentHash: v.optional(v.string()),
  })
    .index('by_idempotency_key', ['idempotencyKey'])
    .index('by_state_and_retry_time', ['state', 'retryAt'])
    .index('by_run_and_stage', ['runId', 'stage']),

  aiCalls: defineTable({
    runId: v.id('pipelineRuns'),
    stageId: v.optional(v.id('pipelineStages')),
    extractionId: v.optional(v.id('extractions')),
    reviewId: v.optional(v.id('reviews')),
    route: aiRoutes,
    modelRole: modelRoles,
    modelId: v.string(),
    promptVersion: v.string(),
    schemaVersion: v.string(),
    attempt: v.number(),
    status: v.string(),
    httpStatus: v.optional(v.number()),
    latencyMs: v.number(),
    requestId: v.optional(v.string()),
    promptTokens: v.optional(v.number()),
    completionTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    cachedTokens: v.optional(v.number()),
    reasoningTokens: v.optional(v.number()),
    estimatedCostUsd: v.optional(v.number()),
    retryAfterMs: v.optional(v.number()),
    errorClass: v.optional(v.string()),
    errorDetail: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_run_and_created_at', ['runId', 'createdAt'])
    .index('by_extraction', ['extractionId'])
    .index('by_review', ['reviewId']),

  extractions: defineTable({
    runId: v.id('pipelineRuns'),
    registryId: v.id('sourceRegistries'),
    snapshotId: v.id('sourceSnapshots'),
    sourceKind: sourceKinds,
    targetRecordId: v.string(),
    promptVersion: v.string(),
    schemaVersion: v.string(),
    processorVersion: v.string(),
    modelRole: modelRoles,
    modelId: v.optional(v.string()),
    route: v.optional(aiRoutes),
    state: v.union(
      v.literal('failed'),
      v.literal('not_found'),
      v.literal('extracted'),
    ),
    reason: v.optional(v.string()),
    errorClass: v.optional(v.string()),
    errorDetail: v.optional(v.string()),
    rawResponseStorageId: v.optional(v.id('_storage')),
    responseHash: v.optional(v.string()),
    responseByteLength: v.optional(v.number()),
    candidateId: v.optional(v.id('decisionCandidates')),
    createdAt: v.number(),
  })
    .index('by_run', ['runId'])
    .index('by_snapshot_and_created_at', ['snapshotId', 'createdAt']),

  decisionCandidates: defineTable({
    extractionId: v.id('extractions'),
    runId: v.id('pipelineRuns'),
    registryId: v.id('sourceRegistries'),
    snapshotId: v.id('sourceSnapshots'),
    sourceKind: sourceKinds,
    targetRecordId: v.string(),
    sourceRecordId: v.union(v.string(), v.null()),
    recordType: recordTypes,
    title: v.string(),
    bodyName: v.string(),
    meetingAt: v.union(v.string(), v.null()),
    lifecycleState: lifecycleStates,
    plainLanguageSummary: v.string(),
    affectedPlaces: v.array(v.string()),
    amounts: v.array(
      v.object({
        value: v.number(),
        currency: v.literal('USD'),
        context: v.string(),
      }),
    ),
    publicActions: v.array(
      v.object({
        type: publicActionTypes,
        deadline: v.union(v.string(), v.null()),
        instructions: v.string(),
      }),
    ),
    state: v.union(
      v.literal('extracted'),
      v.literal('deterministically_validated'),
      v.literal('validation_failed'),
    ),
    promptVersion: v.string(),
    schemaVersion: v.string(),
    modelRole: modelRoles,
    modelId: v.string(),
    route: aiRoutes,
    createdAt: v.number(),
  })
    .index('by_extraction', ['extractionId'])
    .index('by_snapshot_and_created_at', ['snapshotId', 'createdAt']),

  candidateFacts: defineTable({
    candidateId: v.id('decisionCandidates'),
    extractionId: v.id('extractions'),
    fieldPath: v.string(),
    value: v.string(),
    sourceSnapshotId: v.string(),
    excerpt: v.string(),
    page: v.optional(v.number()),
    section: v.optional(v.string()),
  })
    .index('by_candidate_and_field_path', ['candidateId', 'fieldPath'])
    .index('by_extraction', ['extractionId']),

  validationFindings: defineTable({
    runId: v.id('pipelineRuns'),
    extractionId: v.id('extractions'),
    candidateId: v.optional(v.id('decisionCandidates')),
    code: v.string(),
    fieldPath: v.optional(v.string()),
    detail: v.string(),
    createdAt: v.number(),
  })
    .index('by_extraction', ['extractionId'])
    .index('by_run', ['runId']),

  reviews: defineTable({
    runId: v.id('pipelineRuns'),
    stageId: v.id('pipelineStages'),
    candidateId: v.id('decisionCandidates'),
    extractionId: v.id('extractions'),
    registryId: v.id('sourceRegistries'),
    snapshotId: v.id('sourceSnapshots'),
    inputHash: v.string(),
    state: v.union(v.literal('succeeded'), v.literal('failed')),
    verdict: v.optional(
      v.union(v.literal('pass'), v.literal('limited'), v.literal('fail')),
    ),
    modelRole: modelRoles,
    modelId: v.optional(v.string()),
    route: v.optional(aiRoutes),
    promptVersion: v.string(),
    schemaVersion: v.string(),
    processorVersion: v.string(),
    rawResponseStorageId: v.optional(v.id('_storage')),
    responseHash: v.optional(v.string()),
    responseByteLength: v.optional(v.number()),
    errorClass: v.optional(v.string()),
    errorDetail: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_run', ['runId'])
    .index('by_candidate_and_created_at', ['candidateId', 'createdAt'])
    .index('by_input_hash', ['inputHash']),

  reviewChecks: defineTable({
    reviewId: v.id('reviews'),
    candidateFactId: v.id('candidateFacts'),
    fieldPath: v.string(),
    assessment: v.union(
      v.literal('supported'),
      v.literal('unclear'),
      v.literal('unsupported'),
    ),
    detail: v.string(),
  })
    .index('by_review_and_field_path', ['reviewId', 'fieldPath'])
    .index('by_candidate_fact', ['candidateFactId']),

  reviewFindings: defineTable({
    reviewId: v.id('reviews'),
    code: v.string(),
    severity: v.union(
      v.literal('info'),
      v.literal('limited'),
      v.literal('fail'),
    ),
    fieldPath: v.optional(v.string()),
    detail: v.string(),
  }).index('by_review', ['reviewId']),

  decisionRecords: defineTable({
    recordKey: v.string(),
    registryId: v.id('sourceRegistries'),
    governmentBodyId: v.id('governmentBodies'),
    sourceRecordId: v.string(),
    currentPublishedVersionId: v.optional(v.id('publicationVersions')),
    currentMode: v.optional(v.union(v.literal('full'), v.literal('limited'))),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_record_key', ['recordKey'])
    .index('by_registry_and_source_record', ['registryId', 'sourceRecordId']),

  publicationVersions: defineTable({
    recordId: v.id('decisionRecords'),
    runId: v.id('pipelineRuns'),
    candidateId: v.id('decisionCandidates'),
    reviewId: v.id('reviews'),
    snapshotId: v.id('sourceSnapshots'),
    version: v.number(),
    mode: v.union(
      v.literal('full'),
      v.literal('limited'),
      v.literal('withheld'),
    ),
    reasonCode: v.string(),
    policyVersion: v.string(),
    payloadVersion: v.string(),
    payloadHash: v.string(),
    payload: v.union(
      v.null(),
      v.object({
        kind: v.literal('limited'),
        sourceRecordId: v.string(),
        title: v.string(),
        bodyName: v.string(),
        source: v.object({
          snapshotId: v.id('sourceSnapshots'),
          sourceKind: sourceKinds,
          officialUrl: v.string(),
          retrievedAt: v.number(),
        }),
      }),
      v.object({
        kind: v.literal('full'),
        sourceRecordId: v.string(),
        recordType: recordTypes,
        title: v.string(),
        bodyName: v.string(),
        meetingAt: v.union(v.string(), v.null()),
        lifecycleState: lifecycleStates,
        plainLanguageSummary: v.string(),
        affectedPlaces: v.array(v.string()),
        amounts: v.array(
          v.object({
            value: v.number(),
            currency: v.literal('USD'),
            context: v.string(),
          }),
        ),
        publicActions: v.array(
          v.object({
            type: publicActionTypes,
            deadline: v.union(v.string(), v.null()),
            instructions: v.string(),
          }),
        ),
        source: v.object({
          snapshotId: v.id('sourceSnapshots'),
          sourceKind: sourceKinds,
          officialUrl: v.string(),
          retrievedAt: v.number(),
        }),
      }),
    ),
    createdAt: v.number(),
  })
    .index('by_run', ['runId'])
    .index('by_record_and_version', ['recordId', 'version'])
    .index('by_candidate', ['candidateId']),

  citations: defineTable({
    publicationVersionId: v.id('publicationVersions'),
    candidateFactId: v.id('candidateFacts'),
    fieldPath: v.string(),
    snapshotId: v.id('sourceSnapshots'),
    officialUrl: v.string(),
    excerpt: v.string(),
    page: v.optional(v.number()),
    section: v.optional(v.string()),
    normalizedStartOffset: v.number(),
    normalizedEndOffset: v.number(),
    retrievedAt: v.number(),
  })
    .index('by_publication_and_field_path', [
      'publicationVersionId',
      'fieldPath',
    ])
    .index('by_snapshot', ['snapshotId']),
})
