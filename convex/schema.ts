import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

import { aiRoutes, modelRoles } from './ai/types'
import { monitorState, targetState } from './monitoring/contracts'
import {
  coverageFindingCodes,
  coverageFindingSeverities,
  coverageCadences,
  coverageCandidateStates,
  coverageHostDispositions,
  coverageProviderNames,
  coverageProposalStates,
  coverageRedirectHop,
  coverageRunStates,
  coverageSourceKinds,
  coverageSampleRoles,
  coverageSampleStates,
  coverageStageNames,
  coverageStageStates,
} from './coverage/contracts'
import {
  lifecycleStates,
  publicActionTypes,
  recordTypes,
} from './extraction/contractV1'
import { areaSlug, topicSlug } from './follows/contracts'
import {
  activeDeliveryCadence,
  deliveryCadence,
  emailSubscriberState,
  emailTokenKind,
  followTargetKind,
  verificationPurpose,
} from './follows/enrollmentContracts'
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
  users: defineTable({
    googleAccountId: v.string(),
    email: v.string(),
    emailVerified: v.literal(true),
    name: v.optional(v.string()),
    picture: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastSignedInAt: v.number(),
  }).index('by_google_account_id', ['googleAccountId']),

  savedAreas: defineTable({
    userId: v.id('users'),
    area: areaSlug,
    createdAt: v.number(),
  })
    .index('by_user_id', ['userId'])
    .index('by_user_id_and_area', ['userId', 'area']),

  savedTopics: defineTable({
    userId: v.id('users'),
    topic: topicSlug,
    createdAt: v.number(),
  })
    .index('by_user_id', ['userId'])
    .index('by_user_id_and_topic', ['userId', 'topic']),

  emailSubscribers: defineTable({
    addressHash: v.string(),
    encryptedAddress: v.string(),
    encryptionVersion: v.literal(1),
    state: emailSubscriberState,
    verifiedAt: v.optional(v.number()),
    unsubscribedAt: v.optional(v.number()),
    agentmailThreadId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_address_hash', ['addressHash'])
    .index('by_state_and_created_at', ['state', 'createdAt']),

  sourceProblemReports: defineTable({
    submissionHash: v.string(),
    browserHash: v.string(),
    category: v.union(
      v.literal('wrong-fact'),
      v.literal('broken-citation'),
      v.literal('missing-document'),
      v.literal('wrong-record'),
      v.literal('importance-factor'),
    ),
    recordPath: v.string(),
    outboundId: v.string(),
    deliveryStatus: v.optional(
      v.union(v.literal('sending'), v.literal('sent'), v.literal('failed')),
    ),
    deliveryCheckedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_submission_hash', ['submissionHash'])
    .index('by_browser_hash_and_created_at', ['browserHash', 'createdAt'])
    .index('by_created_at', ['createdAt']),

  emailVerificationChallenges: defineTable({
    subscriberId: v.id('emailSubscribers'),
    challengeId: v.string(),
    codeHash: v.string(),
    purpose: verificationPurpose,
    targetKind: followTargetKind,
    targetKey: v.string(),
    cadence: activeDeliveryCadence,
    expiresAt: v.number(),
    attempts: v.number(),
    consumedAt: v.optional(v.number()),
    outboundId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_challenge_id', ['challengeId'])
    .index('by_subscriber_id_and_purpose_and_created_at', [
      'subscriberId',
      'purpose',
      'createdAt',
    ])
    .index('by_expires_at', ['expiresAt']),

  follows: defineTable(
    v.union(
      v.object({
        ownerKind: v.literal('google'),
        ownerKey: v.string(),
        userId: v.id('users'),
        targetKind: followTargetKind,
        targetKey: v.string(),
        targetTitle: v.string(),
        targetDetail: v.string(),
        createdAt: v.number(),
        updatedAt: v.number(),
      }),
      v.object({
        ownerKind: v.literal('email'),
        ownerKey: v.string(),
        emailSubscriberId: v.id('emailSubscribers'),
        targetKind: followTargetKind,
        targetKey: v.string(),
        targetTitle: v.string(),
        targetDetail: v.string(),
        createdAt: v.number(),
        updatedAt: v.number(),
      }),
    ),
  )
    .index('by_owner_key_and_target_kind_and_target_key', [
      'ownerKey',
      'targetKind',
      'targetKey',
    ])
    .index('by_user_id_and_created_at', ['userId', 'createdAt'])
    .index('by_email_subscriber_id_and_created_at', [
      'emailSubscriberId',
      'createdAt',
    ])
    .index('by_target_kind_and_target_key_and_owner_kind', [
      'targetKind',
      'targetKey',
      'ownerKind',
    ]),

  notificationPreferences: defineTable({
    followId: v.id('follows'),
    cadence: deliveryCadence,
    resumeCadence: v.optional(activeDeliveryCadence),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_follow_id', ['followId']),

  notificationDefaults: defineTable({
    userId: v.id('users'),
    cadence: activeDeliveryCadence,
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_user_id', ['userId']),

  notificationMatches: defineTable({
    followId: v.id('follows'),
    materialChangeId: v.id('materialChanges'),
    ownerKind: v.union(v.literal('google'), v.literal('email')),
    ownerKey: v.string(),
    targetKind: followTargetKind,
    targetKey: v.string(),
    cadenceAtMatch: activeDeliveryCadence,
    matchedAt: v.number(),
  })
    .index('by_follow_id_and_material_change_id', [
      'followId',
      'materialChangeId',
    ])
    .index('by_material_change_id_and_owner_key', [
      'materialChangeId',
      'ownerKey',
    ])
    .index('by_owner_key_and_matched_at', ['ownerKey', 'matchedAt'])
    .index('by_matched_at', ['matchedAt']),

  notificationFanouts: defineTable({
    materialChangeId: v.id('materialChanges'),
    phase: v.union(v.literal('decision'), v.literal('issue')),
    issueVersionId: v.optional(v.id('issueVersions')),
    targetIndex: v.number(),
    cursor: v.optional(v.string()),
    state: v.union(v.literal('pending'), v.literal('complete')),
    matchesCreated: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_material_change_id_and_phase_and_issue_version_id', [
      'materialChangeId',
      'phase',
      'issueVersionId',
    ])
    .index('by_state_and_updated_at', ['state', 'updatedAt']),

  notificationDeliveries: defineTable({
    ownerKind: v.union(v.literal('google'), v.literal('email')),
    ownerKey: v.string(),
    kind: v.union(v.literal('immediate'), v.literal('weekly')),
    materialChangeId: v.optional(v.id('materialChanges')),
    roundupWindowId: v.optional(v.id('roundupWindows')),
    representativeFollowId: v.optional(v.id('follows')),
    state: v.union(
      v.literal('reserved'),
      v.literal('pending'),
      v.literal('sent'),
      v.literal('delivered'),
      v.literal('bounced'),
      v.literal('complained'),
      v.literal('rejected'),
      v.literal('failed'),
      v.literal('suppressed'),
    ),
    outboundId: v.optional(v.string()),
    providerIdempotencyKey: v.optional(v.string()),
    agentmailMessageId: v.optional(v.string()),
    agentmailThreadId: v.optional(v.string()),
    errorDetail: v.optional(v.string()),
    enqueueAttempts: v.number(),
    reconcileAttempts: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_owner_key_and_kind_and_material_change_id', [
      'ownerKey',
      'kind',
      'materialChangeId',
    ])
    .index('by_state_and_updated_at', ['state', 'updatedAt'])
    .index('by_roundup_window_id_and_owner_key', [
      'roundupWindowId',
      'ownerKey',
    ])
    .index('by_agentmail_thread_id', ['agentmailThreadId'])
    .index('by_owner_key_and_updated_at', ['ownerKey', 'updatedAt']),

  emailReplyThreads: defineTable({
    agentmailThreadId: v.string(),
    notificationDeliveryId: v.id('notificationDeliveries'),
    askThreadId: v.optional(v.string()),
    askExpiresAt: v.optional(v.number()),
    preparingEventId: v.optional(v.id('emailReplyEvents')),
    preparingStartedAt: v.optional(v.number()),
    scopeKind: v.union(
      v.literal('corpus'),
      v.literal('issue'),
      v.literal('meeting'),
    ),
    scopeKey: v.string(),
    officialContactUrl: v.optional(v.string()),
    ownerKind: v.union(v.literal('google'), v.literal('email')),
    ownerKey: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_agentmail_thread_id', ['agentmailThreadId'])
    .index('by_updated_at', ['updatedAt']),

  emailReplyEvents: defineTable({
    providerEventId: v.string(),
    agentmailThreadId: v.string(),
    inboundMessageId: v.string(),
    encryptedQuestion: v.optional(v.string()),
    replyThreadId: v.optional(v.id('emailReplyThreads')),
    questionMessageId: v.optional(v.string()),
    state: v.union(
      v.literal('ignored'),
      v.literal('queued'),
      v.literal('running'),
      v.literal('answered'),
      v.literal('not_found'),
      v.literal('failed'),
    ),
    preparationAttempts: v.number(),
    attempt: v.number(),
    outboundId: v.optional(v.string()),
    answerMessageId: v.optional(v.string()),
    errorClass: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    retryAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_provider_event_id', ['providerEventId'])
    .index('by_agentmail_thread_id_and_created_at', [
      'agentmailThreadId',
      'createdAt',
    ])
    .index('by_state_and_updated_at', ['state', 'updatedAt'])
    .index('by_state_and_retry_at', ['state', 'retryAt']),

  roundupWindows: defineTable({
    windowKey: v.string(),
    startsAt: v.number(),
    endsAt: v.number(),
    state: v.union(
      v.literal('collecting'),
      v.literal('delivering'),
      v.literal('complete'),
    ),
    matchCursor: v.optional(v.string()),
    deliveryCursor: v.optional(v.string()),
    entryCount: v.number(),
    deliveryCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index('by_window_key', ['windowKey'])
    .index('by_state_and_updated_at', ['state', 'updatedAt']),

  roundupEntries: defineTable({
    roundupWindowId: v.id('roundupWindows'),
    deliveryId: v.id('notificationDeliveries'),
    materialChangeId: v.id('materialChanges'),
    followIds: v.array(v.id('follows')),
    createdAt: v.number(),
  })
    .index('by_delivery_id_and_material_change_id', [
      'deliveryId',
      'materialChangeId',
    ])
    .index('by_delivery_id_and_created_at', ['deliveryId', 'createdAt']),

  emailAccessTokens: defineTable({
    subscriberId: v.id('emailSubscribers'),
    followId: v.optional(v.id('follows')),
    kind: emailTokenKind,
    tokenHash: v.string(),
    expiresAt: v.optional(v.number()),
    consumedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_token_hash', ['tokenHash'])
    .index('by_subscriber_id_and_kind_and_created_at', [
      'subscriberId',
      'kind',
      'createdAt',
    ])
    .index('by_follow_id_and_kind_and_created_at', [
      'followId',
      'kind',
      'createdAt',
    ]),

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
    statusGeneration: v.optional(v.number()),
    lastDiscoveryAt: v.optional(v.number()),
    lastHealthyAt: v.optional(v.number()),
    nextScheduledCheckAt: v.optional(v.number()),
  })
    .index('by_body_and_status', ['governmentBodyId', 'status'])
    .index('by_next_scheduled_check', ['nextScheduledCheckAt']),

  sourceMonitoringPolicies: defineTable({
    registryId: v.id('sourceRegistries'),
    proposalId: v.id('coverageRegistryProposals'),
    enabled: v.boolean(), generation: v.number(),
    intervalHours: v.number(), documentsPerRun: v.number(), targetsPerRun: v.number(),
    dailyCallLimit: v.number(), startsAt: v.number(), activatedAt: v.number(),
    baselineComplete: v.boolean(), nextCheckAt: v.number(),
    activeRunId: v.optional(v.id('sourceMonitoringRuns')),
    lastAttemptAt: v.optional(v.number()), lastRetrievalAt: v.optional(v.number()),
    lastCompletedAt: v.optional(v.number()), failures: v.number(),
    createdAt: v.number(), updatedAt: v.number(),
  }).index('by_registry_id', ['registryId'])
    .index('by_enabled_and_next_check_at', ['enabled', 'nextCheckAt']),

  sourceMonitoringRuns: defineTable({
    policyId: v.id('sourceMonitoringPolicies'), registryId: v.id('sourceRegistries'),
    generation: v.number(), registryGeneration: v.number(), state: monitorState,
    workflowId: v.optional(v.string()), baseline: v.boolean(),
    documentsChecked: v.number(), targetsStarted: v.number(), errorClass: v.optional(v.string()),
    startedAt: v.number(), completedAt: v.optional(v.number()),
  }).index('by_policy_id_and_started_at', ['policyId', 'startedAt'])
    .index('by_state_and_started_at', ['state', 'startedAt']),

  monitoredDocuments: defineTable({
    policyId: v.id('sourceMonitoringPolicies'), registryId: v.id('sourceRegistries'),
    canonicalUrl: v.string(), nextCheckAt: v.number(), firstSeenAt: v.number(),
    notificationEligible: v.boolean(), snapshotId: v.optional(v.id('sourceSnapshots')),
    normalizedHash: v.optional(v.string()), inventoryVersion: v.optional(v.string()),
    chunkCount: v.optional(v.number()), completedChunks: v.optional(v.number()),
    inventoryComplete: v.boolean(), lastCheckedAt: v.optional(v.number()),
    errorClass: v.optional(v.string()),
  }).index('by_policy_id_and_url', ['policyId', 'canonicalUrl'])
    .index('by_policy_id_and_inventory_complete', ['policyId', 'inventoryComplete'])
    .index('by_policy_id_and_next_check_at', ['policyId', 'nextCheckAt']),

  documentInventoryTargets: defineTable({
    documentId: v.id('monitoredDocuments'), snapshotId: v.id('sourceSnapshots'),
    policyId: v.id('sourceMonitoringPolicies'), registryId: v.id('sourceRegistries'),
    targetKey: v.string(), targetRecordId: v.string(), locator: v.string(),
    sourceRecordIdProvenance: sourceRecordIdProvenances, sourceKind: sourceKinds,
    meetingDate: v.string(), state: targetState, notificationEligible: v.boolean(),
    pipelineRunId: v.optional(v.id('pipelineRuns')),
    attempts: v.optional(v.number()), retryAt: v.optional(v.number()), createdAt: v.number(), updatedAt: v.number(),
  }).index('by_snapshot_id_and_target_key', ['snapshotId', 'targetKey'])
    .index('by_policy_id_and_state', ['policyId', 'state'])
    .index('by_policy_state_and_retry', ['policyId', 'state', 'retryAt'])
    .index('by_document_id_and_snapshot_id', ['documentId', 'snapshotId']),

  monitoringProviderCalls: defineTable({
    runId: v.id('sourceMonitoringRuns'), operation: v.string(), provider: v.string(),
    status: v.string(), modelId: v.optional(v.string()), modelRole: v.optional(modelRoles),
    promptTokens: v.optional(v.number()), completionTokens: v.optional(v.number()),
    estimatedCostUsd: v.optional(v.number()), creditsUsed: v.optional(v.number()),
    latencyMs: v.number(), createdAt: v.number(),
  }).index('by_run_id_and_created_at', ['runId', 'createdAt'])
    .index('by_created_at', ['createdAt']),

  coverageIncidents: defineTable({
    registryId: v.id('sourceRegistries'), code: v.string(), state: v.union(v.literal('open'), v.literal('resolved')),
    summary: v.string(), firstSeenAt: v.number(), lastSeenAt: v.number(), attempts: v.number(),
  }).index('by_registry_id_and_state', ['registryId', 'state'])
    .index('by_state_and_last_seen_at', ['state', 'lastSeenAt']),

  coverageCompilerRuns: defineTable({
    bodyKey: v.string(),
    jurisdictionSlug: v.string(),
    rootManifestVersion: v.string(),
    compilerVersion: v.string(),
    idempotencyKey: v.string(),
    attempt: v.number(),
    state: coverageRunStates,
    currentStage: v.optional(coverageStageNames),
    requestedByUserId: v.id('users'),
    budgetUsd: v.optional(v.number()),
    reservedCostUsd: v.optional(v.number()),
    estimatedSpentUsd: v.optional(v.number()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    canceledAt: v.optional(v.number()),
  })
    .index('by_idempotency_key', ['idempotencyKey'])
    .index('by_body_key_and_started_at', ['bodyKey', 'startedAt'])
    .index('by_state_and_started_at', ['state', 'startedAt']),

  coverageCompilerStages: defineTable({
    runId: v.id('coverageCompilerRuns'),
    stage: coverageStageNames,
    idempotencyKey: v.string(),
    inputHash: v.string(),
    attempt: v.number(),
    state: coverageStageStates,
    gateVersion: v.string(),
    requestedRootUrl: v.optional(v.string()),
    resolvedRootUrl: v.optional(v.string()),
    redirectChain: v.optional(v.array(coverageRedirectHop)),
    errorClass: v.optional(v.string()),
    errorDetail: v.optional(v.string()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index('by_idempotency_key', ['idempotencyKey'])
    .index('by_run_and_stage', ['runId', 'stage']),

  coverageCompilerFindings: defineTable({
    runId: v.id('coverageCompilerRuns'),
    stageId: v.optional(v.id('coverageCompilerStages')),
    code: coverageFindingCodes,
    severity: coverageFindingSeverities,
    summary: v.string(),
    subjectUrl: v.optional(v.string()),
    createdAt: v.number(),
  }).index('by_run_and_created_at', ['runId', 'createdAt']),

  coverageSourceCandidates: defineTable({
    runId: v.id('coverageCompilerRuns'),
    stageId: v.id('coverageCompilerStages'),
    canonicalUrl: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    discoveredFrom: v.array(v.string()),
    matchedTerms: v.array(v.string()),
    hostDisposition: coverageHostDispositions,
    state: coverageCandidateStates,
    sourceKind: v.optional(coverageSourceKinds),
    cadence: v.optional(coverageCadences),
    confidence: v.optional(v.number()),
    evidenceText: v.optional(v.string()),
    noGuessReason: v.optional(v.string()),
    createdAt: v.number(),
    classifiedAt: v.optional(v.number()),
  })
    .index('by_run_and_url', ['runId', 'canonicalUrl'])
    .index('by_run_and_state', ['runId', 'state']),

  coverageCompilerProviderCalls: defineTable({
    runId: v.id('coverageCompilerRuns'),
    stageId: v.id('coverageCompilerStages'),
    provider: coverageProviderNames,
    operation: v.string(),
    status: v.string(),
    requestHash: v.string(),
    responseHash: v.optional(v.string()),
    promptVersion: v.optional(v.string()),
    schemaVersion: v.optional(v.string()),
    modelRole: v.optional(modelRoles),
    modelId: v.optional(v.string()),
    latencyMs: v.number(),
    creditsUsed: v.optional(v.number()),
    creditsReported: v.boolean(),
    promptTokens: v.optional(v.number()),
    completionTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    estimatedCostUsd: v.optional(v.number()),
    errorClass: v.optional(v.string()),
    errorDetail: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_run_and_created_at', ['runId', 'createdAt'])
    .index('by_stage_and_created_at', ['stageId', 'createdAt']),

  coverageRegistryProposals: defineTable({
    runId: v.id('coverageCompilerRuns'),
    governmentBodyId: v.id('governmentBodies'),
    registryId: v.id('sourceRegistries'),
    bodyKey: v.string(),
    proposalVersion: v.number(),
    status: coverageProposalStates,
    rootManifestVersion: v.string(),
    goldSetVersion: v.string(),
    evaluatorVersion: v.string(),
    proposedDomains: v.array(v.string()),
    proposedSeedUrls: v.array(v.string()),
    proposedSourceKinds: v.array(sourceKinds),
    diffHash: v.string(),
    diffSummary: v.array(v.string()),
    createdAt: v.number(),
    evaluatedAt: v.optional(v.number()),
    promotedAt: v.optional(v.number()),
    promotedByUserId: v.optional(v.id('users')),
  })
    .index('by_run_and_version', ['runId', 'proposalVersion'])
    .index('by_body_and_status', ['bodyKey', 'status'])
    .index('by_body_and_created_at', ['bodyKey', 'createdAt']),

  coverageRepresentativeSamples: defineTable({
    proposalId: v.id('coverageRegistryProposals'),
    candidateId: v.optional(v.id('coverageSourceCandidates')),
    sourceKind: sourceKinds,
    role: coverageSampleRoles,
    required: v.boolean(),
    state: coverageSampleStates,
    pipelineRunId: v.optional(v.id('pipelineRuns')),
    snapshotId: v.optional(v.id('sourceSnapshots')),
    errorClass: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index('by_proposal_and_role', ['proposalId', 'role'])
    .index('by_proposal_and_state', ['proposalId', 'state']),

  coverageGateEvaluations: defineTable({
    proposalId: v.id('coverageRegistryProposals'),
    gateNumber: v.number(),
    gateKey: v.string(),
    passed: v.boolean(),
    detail: v.string(),
    evidenceRefs: v.array(v.string()),
    evaluatorVersion: v.string(),
    registryStatusGeneration: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_proposal_and_gate', ['proposalId', 'gateNumber'])
    .index('by_proposal_and_created_at', ['proposalId', 'createdAt']),

  sourceExpectations: defineTable({
    proposalId: v.id('coverageRegistryProposals'),
    registryId: v.id('sourceRegistries'),
    sourceKind: sourceKinds,
    cadence: cadenceKinds,
    basis: v.union(v.literal('official'), v.literal('inferred')),
    expectedWeekdays: v.optional(v.array(v.number())),
    createdAt: v.number(),
  }).index('by_registry_and_source_kind', ['registryId', 'sourceKind']),

  coverageDirectLinkChecks: defineTable({
    proposalId: v.id('coverageRegistryProposals'),
    canonicalUrl: v.string(),
    deployment: v.union(v.literal('development'), v.literal('production')),
    status: v.number(),
    passed: v.boolean(),
    checkedAt: v.number(),
  })
    .index('by_proposal_and_deployment', ['proposalId', 'deployment'])
    .index('by_proposal_and_deployment_and_checked_at', [
      'proposalId',
      'deployment',
      'checkedAt',
    ]),

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
    monitorPolicyId: v.optional(v.id('sourceMonitoringPolicies')),
    monitorGeneration: v.optional(v.number()),
    monitorRegistryGeneration: v.optional(v.number()),
    suppressNotifications: v.optional(v.boolean()),
    targetLocator: v.optional(v.string()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index('by_upstream_run', ['upstreamRunId'])
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
    .index('by_government_body_and_current_mode_and_updated_at', [
      'governmentBodyId',
      'currentMode',
      'updatedAt',
    ])
    .index('by_current_meeting_key', ['currentMeetingKey'])
    .index('by_registry_and_source_record', ['registryId', 'sourceRecordId'])
    .index('by_registry_and_updated_at', ['registryId', 'updatedAt']),

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
    .index('by_registry_and_created_at', ['registryId', 'createdAt'])
    .index('by_source_and_created_at', [
      'registryId',
      'canonicalUrl',
      'createdAt',
    ]),

  materialChanges: defineTable({
    recordId: v.id('decisionRecords'),
    previousPublicationVersionId: v.optional(v.id('publicationVersions')),
    currentPublicationVersionId: v.id('publicationVersions'),
    classification: v.union(
      v.literal('new_decision'),
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
    notificationEligible: v.optional(v.boolean()),
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
    .index('by_slug', ['slug'])
    .index('by_current_mode_and_updated_at', ['currentMode', 'updatedAt']),

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
