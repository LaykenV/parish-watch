import { v } from 'convex/values'

import { sourceKindUnion } from '../pipeline/state'

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

export const askEvidenceResult = v.object({
  kind: v.union(v.literal('evidence'), v.literal('no_evidence')),
  scope: askScope,
  evidence: v.array(askEvidence),
})

export type AskEvidenceResult = typeof askEvidenceResult.type

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
