import { v } from 'convex/values'

export const processingStates = v.union(
  v.literal('queued'),
  v.literal('running'),
  v.literal('succeeded'),
  v.literal('failed_retryable'),
  v.literal('failed_terminal'),
  v.literal('superseded'),
)

export type ProcessingState = typeof processingStates.type

export const stageNames = v.union(
  v.literal('retrieve'),
  v.literal('extract'),
  v.literal('validate'),
)

export type StageName = typeof stageNames.type

export const runTriggers = v.union(
  v.literal('manual_ingest'),
  v.literal('manual_extraction'),
)

export type RunTrigger = typeof runTriggers.type

export const sourceKindUnion = v.union(
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

export type SourceKind = typeof sourceKindUnion.type

export const RETRIEVAL_PROCESSOR_VERSION = 'v2'

export const RETRIEVAL_RETRY_DELAY_MS = 15 * 60 * 1000

export const EXTRACTION_PROCESSOR_VERSION = 'v1.3'

export const EXTRACTION_PROMPT_VERSION = 'v1.2'

export const EXTRACTION_SCHEMA_VERSION = 'v1'

export const EXTRACTION_WORKFLOW_NAME = 'extractSnapshotV1'

export const MODEL_STEP_RETRY = {
  maxAttempts: 3,
  initialBackoffMs: 30_000,
  base: 2,
} as const
