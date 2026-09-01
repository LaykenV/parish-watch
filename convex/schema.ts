import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

import { aiRoutes, modelRoles } from './ai/types'
import {
  lifecycleStates,
  publicActionTypes,
  recordTypes,
} from './extraction/contractV1'
import {
  importanceFactorNames,
  importanceLevels,
  issueCandidateV1,
  issueLifecycleStates,
  issueRelationshipTypes,
} from './issues/contractV1'
import {
  processingStates,
  sourceRecordIdProvenances,
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

const publicationModes = v.union(
  v.literal('full'),
  v.literal('limited'),
  v.literal('withheld'),
)

const acceptedPublicationModes = v.union(
  v.literal('full'),
  v.literal('limited'),
)

const issueScore = v.object({
  score: v.number(),
  maxScore: v.number(),
  completenessPercent: v.number(),
  supportedFactorCount: v.number(),
  totalFactorCount: v.number(),
  hasNearTermPublicDeadline: v.boolean(),
})

const issuePayload = v.object({
  kind: acceptedPublicationModes,
  title: v.string(),
  summary: v.string(),
  lifecycleState: v.optional(issueLifecycleStates),
  nextKnownAction: v.optional(
    v.object({ description: v.string(), at: v.union(v.string(), v.null()) }),
  ),
  topics: v.array(v.string()),
  importance: issueScore,
})

const analyticsAreaSlug = v.union(
  v.literal('lafayette-parish'),
  v.literal('east-baton-rouge-parish'),
  v.literal('rapides-parish'),
)

const analyticsAreaCounts = v.object({
  lafayetteParish: v.number(),
  eastBatonRougeParish: v.number(),
  rapidesParish: v.number(),
})

export default defineSchema({
  analyticsSubjects: defineTable({
    visitorKeyHash: v.string(),
    firstSeenAt: v.number(),
    lastSeenAt: v.number(),
    lastVisitStartedAt: v.number(),
    visitCount: v.number(),
    firstAreaSelectedAt: v.optional(v.number()),
    firstAreaSlug: v.optional(analyticsAreaSlug),
    lastAreaSelectedAt: v.optional(v.number()),
    lastAreaSlug: v.optional(analyticsAreaSlug),
    areaSelectionCount: v.number(),
    returnedAt: v.optional(v.number()),
    expiresAt: v.number(),
  })
    .index('by_visitor_key_hash', ['visitorKeyHash'])
    .index('by_expires_at', ['expiresAt']),

  analyticsEvents: defineTable(
    v.union(
      v.object({
        eventKey: v.string(),
        subjectId: v.id('analyticsSubjects'),
        kind: v.literal('app_visit'),
        occurredAt: v.number(),
        expiresAt: v.number(),
      }),
      v.object({
        eventKey: v.string(),
        subjectId: v.id('analyticsSubjects'),
        kind: v.literal('area_selected'),
        areaSlug: analyticsAreaSlug,
        occurredAt: v.number(),
        expiresAt: v.number(),
      }),
    ),
  )
    .index('by_event_key', ['eventKey'])
    .index('by_subject_id_and_occurred_at', ['subjectId', 'occurredAt'])
    .index('by_kind_and_occurred_at', ['kind', 'occurredAt'])
    .index('by_expires_at', ['expiresAt']),

  analyticsCounters: defineTable({
    scope: v.literal('production'),
    startedAt: v.number(),
    updatedAt: v.number(),
    uniqueVisitors: v.number(),
    visits: v.number(),
    activatedVisitors: v.number(),
    returningVisitors: v.number(),
    areaSelections: v.number(),
    firstSelectionsByArea: analyticsAreaCounts,
    selectionsByArea: analyticsAreaCounts,
  }).index('by_scope', ['scope']),

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
    sourceRecordIdProvenance: v.optional(sourceRecordIdProvenances),
    candidateId: v.optional(v.id('decisionCandidates')),
    issueBuildId: v.optional(v.id('issueBuilds')),
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
    outputIssueBuildReviewId: v.optional(v.id('issueBuildReviews')),
    outputIssueVersionId: v.optional(v.id('issueVersions')),
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
    issueBuildId: v.optional(v.id('issueBuilds')),
    issueBuildReviewId: v.optional(v.id('issueBuildReviews')),
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
    .index('by_review', ['reviewId'])
    .index('by_issue_build', ['issueBuildId'])
    .index('by_issue_build_review', ['issueBuildReviewId']),

  extractions: defineTable({
    runId: v.id('pipelineRuns'),
    registryId: v.id('sourceRegistries'),
    snapshotId: v.id('sourceSnapshots'),
    sourceKind: sourceKinds,
    targetRecordId: v.string(),
    sourceRecordIdProvenance: v.optional(sourceRecordIdProvenances),
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
    sourceRecordIdProvenance: v.optional(sourceRecordIdProvenances),
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
    currentMeetingKey: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_record_key', ['recordKey'])
    .index('by_current_mode_and_updated_at', ['currentMode', 'updatedAt'])
    .index('by_current_meeting_key', ['currentMeetingKey'])
    .index('by_registry_and_source_record', ['registryId', 'sourceRecordId']),

  publicationVersions: defineTable({
    recordId: v.id('decisionRecords'),
    runId: v.id('pipelineRuns'),
    candidateId: v.id('decisionCandidates'),
    reviewId: v.id('reviews'),
    snapshotId: v.id('sourceSnapshots'),
    version: v.number(),
    mode: publicationModes,
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

  sourceSnapshotChanges: defineTable({
    registryId: v.id('sourceRegistries'),
    canonicalUrl: v.string(),
    previousSnapshotId: v.id('sourceSnapshots'),
    currentSnapshotId: v.id('sourceSnapshots'),
    classification: v.union(
      v.literal('raw_only'),
      v.literal('normalized_changed'),
      v.literal('hash_basis_migration'),
      v.literal('unusable_predecessor'),
    ),
    rawChanged: v.boolean(),
    normalizedChanged: v.boolean(),
    createdAt: v.number(),
  })
    .index('by_current_snapshot', ['currentSnapshotId'])
    .index('by_source_and_created_at', [
      'registryId',
      'canonicalUrl',
      'createdAt',
    ]),

  materialChanges: defineTable({
    recordId: v.id('decisionRecords'),
    previousPublicationVersionId: v.id('publicationVersions'),
    currentPublicationVersionId: v.id('publicationVersions'),
    classification: v.union(
      v.literal('information_expanded'),
      v.literal('information_limited'),
      v.literal('date_changed'),
      v.literal('amount_changed'),
      v.literal('amended'),
      v.literal('postponed'),
      v.literal('decided'),
      v.literal('canceled'),
      v.literal('public_action_changed'),
      v.literal('no_public_change'),
    ),
    material: v.boolean(),
    fieldChanges: v.array(
      v.object({
        fieldPath: v.string(),
        kind: v.union(
          v.literal('added'),
          v.literal('removed'),
          v.literal('changed'),
        ),
        previousValue: v.union(v.string(), v.null()),
        currentValue: v.union(v.string(), v.null()),
      }),
    ),
    createdAt: v.number(),
  })
    .index('by_current_publication', ['currentPublicationVersionId'])
    .index('by_record_and_created_at', ['recordId', 'createdAt']),

  issueBuilds: defineTable({
    runId: v.id('pipelineRuns'),
    registryId: v.id('sourceRegistries'),
    governmentBodyId: v.id('governmentBodies'),
    issueKey: v.string(),
    idempotencyKey: v.string(),
    inputHash: v.string(),
    recordIds: v.array(v.id('decisionRecords')),
    publicationVersionIds: v.array(v.id('publicationVersions')),
    state: v.union(
      v.literal('queued'),
      v.literal('candidate_ready'),
      v.literal('reviewed'),
      v.literal('ranked'),
      v.literal('published'),
      v.literal('withheld'),
      v.literal('failed'),
    ),
    promptVersion: v.string(),
    schemaVersion: v.string(),
    processorVersion: v.string(),
    modelRole: modelRoles,
    modelId: v.optional(v.string()),
    route: v.optional(aiRoutes),
    rawResponseStorageId: v.optional(v.id('_storage')),
    responseHash: v.optional(v.string()),
    responseByteLength: v.optional(v.number()),
    candidate: v.optional(issueCandidateV1),
    candidateHash: v.optional(v.string()),
    reviewId: v.optional(v.id('issueBuildReviews')),
    rankedResult: v.optional(
      v.object({
        mode: publicationModes,
        reasonCode: v.string(),
        supportedFactPaths: v.array(v.string()),
        importance: issueScore,
      }),
    ),
    issueVersionId: v.optional(v.id('issueVersions')),
    errorClass: v.optional(v.string()),
    errorDetail: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_idempotency_key', ['idempotencyKey'])
    .index('by_run', ['runId'])
    .index('by_issue_key_and_created_at', ['issueKey', 'createdAt']),

  issueBuildReviews: defineTable({
    runId: v.id('pipelineRuns'),
    stageId: v.id('pipelineStages'),
    issueBuildId: v.id('issueBuilds'),
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
    findings: v.array(
      v.object({
        code: v.string(),
        severity: v.union(
          v.literal('info'),
          v.literal('limited'),
          v.literal('fail'),
        ),
        fieldPath: v.union(v.string(), v.null()),
        detail: v.string(),
      }),
    ),
    errorClass: v.optional(v.string()),
    errorDetail: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_run', ['runId'])
    .index('by_build_and_input_hash', ['issueBuildId', 'inputHash']),

  issueBuildReviewChecks: defineTable({
    reviewId: v.id('issueBuildReviews'),
    issueBuildId: v.id('issueBuilds'),
    fieldPath: v.string(),
    assessment: v.union(
      v.literal('supported'),
      v.literal('unclear'),
      v.literal('unsupported'),
    ),
    detail: v.string(),
  })
    .index('by_review_and_field_path', ['reviewId', 'fieldPath'])
    .index('by_build', ['issueBuildId']),

  issues: defineTable({
    issueKey: v.string(),
    slug: v.string(),
    governmentBodyId: v.id('governmentBodies'),
    currentVersionId: v.optional(v.id('issueVersions')),
    currentMode: v.optional(acceptedPublicationModes),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_issue_key', ['issueKey'])
    .index('by_slug', ['slug']),

  issueVersions: defineTable({
    issueId: v.id('issues'),
    buildId: v.id('issueBuilds'),
    version: v.number(),
    mode: publicationModes,
    reasonCode: v.string(),
    policyVersion: v.string(),
    payloadVersion: v.string(),
    payloadHash: v.string(),
    payload: v.union(v.null(), issuePayload),
    createdAt: v.number(),
  })
    .index('by_issue_and_version', ['issueId', 'version'])
    .index('by_build', ['buildId']),

  issueDecisionLinks: defineTable({
    issueId: v.id('issues'),
    issueVersionId: v.id('issueVersions'),
    recordId: v.id('decisionRecords'),
    publicationVersionId: v.id('publicationVersions'),
    relationship: issueRelationshipTypes,
    reason: v.string(),
    citationIds: v.array(v.id('citations')),
    linkerVersion: v.string(),
    createdAt: v.number(),
  })
    .index('by_issue_version', ['issueVersionId'])
    .index('by_record_and_created_at', ['recordId', 'createdAt']),

  importanceAssessments: defineTable({
    issueId: v.id('issues'),
    issueVersionId: v.id('issueVersions'),
    factor: importanceFactorNames,
    level: importanceLevels,
    points: v.number(),
    maxPoints: v.number(),
    rationale: v.string(),
    citationIds: v.array(v.id('citations')),
    rubricVersion: v.string(),
    createdAt: v.number(),
  })
    .index('by_issue_version_and_factor', ['issueVersionId', 'factor'])
    .index('by_issue_and_created_at', ['issueId', 'createdAt']),

  anonymousSessions: defineTable({
    tokenHash: v.string(),
    state: v.union(v.literal('active'), v.literal('expired')),
    createdAt: v.number(),
    expiresAt: v.number(),
    lastSeenAt: v.number(),
  })
    .index('by_token_hash', ['tokenHash'])
    .index('by_state_and_expires_at', ['state', 'expiresAt']),

  askThreadAccess: defineTable({
    sessionId: v.id('anonymousSessions'),
    threadId: v.string(),
    scopeKind: v.union(
      v.literal('corpus'),
      v.literal('issue'),
      v.literal('meeting'),
    ),
    scopeKey: v.string(),
    createdAt: v.number(),
    lastActivityAt: v.number(),
    expiresAt: v.number(),
    detachedAt: v.optional(v.number()),
  })
    .index('by_session_and_last_activity_at', ['sessionId', 'lastActivityAt'])
    .index('by_session_and_thread_id', ['sessionId', 'threadId'])
    .index('by_thread_id', ['threadId']),

  askQuestionReceipts: defineTable({
    sessionId: v.id('anonymousSessions'),
    threadId: v.string(),
    idempotencyKey: v.string(),
    messageId: v.string(),
    createdAt: v.number(),
  })
    .index('by_session_and_idempotency_key', ['sessionId', 'idempotencyKey'])
    .index('by_session_and_message_id', ['sessionId', 'messageId'])
    .index('by_thread_id_and_created_at', ['threadId', 'createdAt']),

  askAnswerReceipts: defineTable({
    sessionId: v.id('anonymousSessions'),
    threadId: v.string(),
    questionMessageId: v.string(),
    state: v.union(
      v.literal('running'),
      v.literal('succeeded'),
      v.literal('failed'),
    ),
    attempt: v.number(),
    answerMessageId: v.optional(v.string()),
    errorClass: v.optional(v.string()),
    reservationState: v.optional(
      v.union(
        v.literal('held'),
        v.literal('reconciled'),
        v.literal('released'),
      ),
    ),
    reservedTokens: v.optional(v.number()),
    shortWindowStart: v.optional(v.number()),
    dailyWindowStart: v.optional(v.number()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index('by_session_and_question_message_id', [
      'sessionId',
      'questionMessageId',
    ])
    .index('by_thread_id_and_started_at', ['threadId', 'startedAt'])
    .index('by_session_and_state', ['sessionId', 'state']),

  askTokenWindows: defineTable({
    sessionId: v.id('anonymousSessions'),
    kind: v.union(v.literal('short'), v.literal('daily')),
    windowStart: v.number(),
    reservedTokens: v.number(),
    consumedTokens: v.number(),
    updatedAt: v.number(),
  }).index('by_session_kind_and_window', ['sessionId', 'kind', 'windowStart']),

  askModelAttempts: defineTable({
    answerReceiptId: v.id('askAnswerReceipts'),
    sessionId: v.id('anonymousSessions'),
    threadId: v.string(),
    route: aiRoutes,
    modelRole: v.literal('MODEL_FAST'),
    modelId: v.string(),
    promptVersion: v.string(),
    schemaVersion: v.string(),
    answerAttempt: v.optional(v.number()),
    attempt: v.number(),
    status: v.string(),
    latencyMs: v.number(),
    requestId: v.optional(v.string()),
    promptTokens: v.optional(v.number()),
    completionTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    cachedTokens: v.optional(v.number()),
    reasoningTokens: v.optional(v.number()),
    estimatedCostUsd: v.optional(v.number()),
    errorClass: v.optional(v.string()),
    errorDetail: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_answer_receipt_and_attempt', ['answerReceiptId', 'attempt'])
    .index('by_session_and_created_at', ['sessionId', 'createdAt']),
})
