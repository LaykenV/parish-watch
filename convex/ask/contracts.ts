import { v } from 'convex/values'

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
  officialUrl: v.string(),
  excerpt: v.string(),
  page: v.union(v.number(), v.null()),
  section: v.union(v.string(), v.null()),
  sourceHref: v.string(),
})

export const askEvidenceResult = v.object({
  kind: v.union(v.literal('evidence'), v.literal('no_evidence')),
  scope: askScope,
  evidence: v.array(askEvidence),
})

export type AskEvidenceResult = typeof askEvidenceResult.type

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
