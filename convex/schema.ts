import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

import { processingStates, runTriggers, stageNames } from './pipeline/state'
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

const sourceKinds = v.union(
  v.literal('agenda'),
  v.literal('minutes'),
  v.literal('ordinance'),
  v.literal('resolution'),
  v.literal('notice'),
  v.literal('calendar'),
  v.literal('packet'),
  v.literal('planning_case'),
  v.literal('other'),
)

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
    ]),

  pipelineRuns: defineTable({
    registryId: v.id('sourceRegistries'),
    trigger: runTriggers,
    state: processingStates,
    processorVersion: v.string(),
    snapshotId: v.optional(v.id('sourceSnapshots')),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index('by_state_and_started_time', ['state', 'startedAt'])
    .index('by_registry_and_started_time', ['registryId', 'startedAt']),

  pipelineStages: defineTable({
    runId: v.id('pipelineRuns'),
    stage: stageNames,
    idempotencyKey: v.string(),
    state: processingStates,
    attempt: v.number(),
    inputUrl: v.string(),
    outputSnapshotId: v.optional(v.id('sourceSnapshots')),
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
})
