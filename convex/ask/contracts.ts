import { v } from 'convex/values'

import { sourceKindUnion } from '../pipeline/state'

export const MAX_ANSWER_EVIDENCE_IDS = 256

export const askScope = v.union(
  v.object({
    kind: v.literal('corpus'),
    areaKey: v.optional(v.string()),
  }),
  v.object({ kind: v.literal('issue'), issueSlug: v.string() }),
  v.object({ kind: v.literal('meeting'), meetingId: v.string() }),
)

export type AskScope = typeof askScope.type

export const askEvidence = v.object({
  evidenceId: v.string(),
  recordKey: v.string(),
  fieldPath: v.string(),
  documentTitle: v.string(),
  bodyName: v.string(),
  sourceKind: sourceKindUnion,
  officialUrl: v.string(),
  excerpt: v.string(),
  page: v.union(v.number(), v.null()),
  section: v.union(v.string(), v.null()),
  retrievedAt: v.number(),
  sourceHref: v.string(),
})

export type AskEvidence = typeof askEvidence.type

export const askRecordContext = v.object({
  recordKey: v.string(),
  sourceRecordId: v.string(),
  placeName: v.string(),
  placeSlug: v.string(),
  bodyName: v.string(),
  mode: v.union(v.literal('full'), v.literal('limited')),
  title: v.string(),
  recordType: v.union(v.string(), v.null()),
  lifecycleState: v.union(v.string(), v.null()),
  summary: v.union(v.string(), v.null()),
  meetingAt: v.union(v.string(), v.null()),
  meetingKey: v.union(v.string(), v.null()),
  affectedPlaces: v.array(v.string()),
  amounts: v.array(
    v.object({
      value: v.number(),
      currency: v.literal('USD'),
      context: v.string(),
      evidenceIds: v.array(v.string()),
    }),
  ),
  publicActions: v.array(
    v.object({
      type: v.string(),
      deadline: v.union(v.string(), v.null()),
      instructions: v.string(),
      evidenceIds: v.array(v.string()),
    }),
  ),
  issue: v.union(v.null(), v.object({ slug: v.string(), title: v.string() })),
  versions: v.array(
    v.object({
      version: v.number(),
      mode: v.union(v.literal('full'), v.literal('limited')),
      reasonCode: v.string(),
      createdAt: v.number(),
    }),
  ),
  changes: v.array(
    v.object({
      id: v.string(),
      classification: v.string(),
      fieldPaths: v.array(v.string()),
      createdAt: v.number(),
    }),
  ),
  evidenceIds: v.array(v.string()),
})

export type AskRecordContext = typeof askRecordContext.type

export const askIssueCatalogItem = v.object({
  issueSlug: v.string(),
  placeName: v.string(),
  placeSlug: v.string(),
  bodyName: v.string(),
  title: v.string(),
  summary: v.string(),
  lifecycleState: v.union(v.string(), v.null()),
  topics: v.array(v.string()),
  recordKeys: v.array(v.string()),
})

export type AskIssueCatalogItem = typeof askIssueCatalogItem.type

export const askMeetingCatalogItem = v.object({
  meetingKey: v.string(),
  placeName: v.string(),
  placeSlug: v.string(),
  bodyName: v.string(),
  meetingAt: v.string(),
  recordKeys: v.array(v.string()),
  decisionTitles: v.array(v.string()),
})

export type AskMeetingCatalogItem = typeof askMeetingCatalogItem.type

export const askEvidenceResult = v.object({
  kind: v.union(v.literal('evidence'), v.literal('no_evidence')),
  scope: askScope,
  issues: v.array(askIssueCatalogItem),
  meetings: v.array(askMeetingCatalogItem),
  records: v.array(askRecordContext),
  evidence: v.array(askEvidence),
})

export type AskEvidenceResult = typeof askEvidenceResult.type

export const askSelectionTarget = v.object({
  kind: v.union(
    v.literal('issue'),
    v.literal('meeting'),
    v.literal('decision'),
  ),
  id: v.string(),
})

export const askModelSelection = v.object({
  retrievalMode: v.union(
    v.literal('focused'),
    v.literal('broad'),
    v.literal('not_found'),
  ),
  targets: v.array(askSelectionTarget),
})

export type AskModelSelection = typeof askModelSelection.type

export const askModelAnswer = v.object({
  kind: v.union(v.literal('answer'), v.literal('not_found')),
  answer: v.string(),
  evidenceIds: v.array(v.string()),
  followUps: v.array(v.string()),
})

export type AskModelAnswer = typeof askModelAnswer.type

export const askAnswerResult = v.object({
  kind: v.union(v.literal('answer'), v.literal('not_found')),
  answer: v.string(),
  citations: v.array(askEvidence),
  followUps: v.array(v.string()),
  messageId: v.string(),
  replayed: v.boolean(),
})

export type AskAnswerResult = typeof askAnswerResult.type

export function scopeKey(scope: AskScope): string {
  if (scope.kind === 'issue') return scope.issueSlug
  if (scope.kind === 'meeting') return scope.meetingId
  return scope.areaKey ?? '*'
}

export function storedScope(kind: AskScope['kind'], key: string): AskScope {
  if (kind === 'issue') return { kind, issueSlug: key }
  if (kind === 'meeting') return { kind, meetingId: key }
  return key === '*' ? { kind } : { kind, areaKey: key }
}
