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

export const stageNames = v.union(v.literal('retrieve'))

export type StageName = typeof stageNames.type

export const runTriggers = v.union(v.literal('manual_ingest'))

export type RunTrigger = typeof runTriggers.type

export const RETRIEVAL_PROCESSOR_VERSION = 'v2'

export const RETRIEVAL_RETRY_DELAY_MS = 15 * 60 * 1000
