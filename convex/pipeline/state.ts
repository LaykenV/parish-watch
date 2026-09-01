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
  v.literal('review'),
  v.literal('finalize'),
  v.literal('link'),
  v.literal('rank'),
  v.literal('publish'),
)

export type StageName = typeof stageNames.type

export const runTriggers = v.union(
  v.literal('manual_ingest'),
  v.literal('manual_extraction'),
  v.literal('validated_candidate'),
  v.literal('manual_publication'),
  v.literal('manual_issue_build'),
  v.literal('decision_published'),
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

export const sourceRecordIdProvenances = v.union(
  v.literal('source_printed'),
  v.literal('operator_assigned'),
)

export type SourceRecordIdProvenance = typeof sourceRecordIdProvenances.type

export function resolveSourceRecordIdProvenance(
  value: SourceRecordIdProvenance | undefined,
): SourceRecordIdProvenance {
  return value ?? 'source_printed'
}

export const RETRIEVAL_PROCESSOR_VERSION = 'v3'

export const RETRIEVAL_RETRY_DELAY_MS = 15 * 60 * 1000

export const EXTRACTION_PROCESSOR_VERSION = 'v1.18'

export const EXTRACTION_PROMPT_VERSION = 'v1.7'

export const EXTRACTION_SCHEMA_VERSION = 'v1'

export const EXTRACTION_WORKFLOW_NAME = 'extractSnapshotV1'

export const PUBLICATION_PROCESSOR_VERSION = 'v1'

export const REVIEW_PROMPT_VERSION = 'v1.4'

export const REVIEW_SCHEMA_VERSION = 'v1'

export const PUBLICATION_POLICY_VERSION = 'v1.1'

export const PUBLICATION_PAYLOAD_VERSION = 'v1'

export const PUBLICATION_WORKFLOW_NAME = 'reviewAndPublishCandidateV1'

export const ISSUE_BUILD_PROCESSOR_VERSION = 'v1'

export const ISSUE_LINK_PROMPT_VERSION = 'v1.3'

export const ISSUE_LINK_SCHEMA_VERSION = 'v1'

export const ISSUE_REVIEW_PROMPT_VERSION = 'v1'

export const ISSUE_REVIEW_SCHEMA_VERSION = 'v1'

export const ISSUE_POLICY_VERSION = 'v1'

export const ISSUE_PAYLOAD_VERSION = 'v1'

export const IMPORTANCE_RUBRIC_VERSION = 'v1'

export const ISSUE_WORKFLOW_NAME = 'buildIssueV1'

export const MODEL_STEP_RETRY = {
  maxAttempts: 3,
  initialBackoffMs: 30_000,
  base: 2,
} as const
