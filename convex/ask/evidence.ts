import { ConvexError, v } from 'convex/values'

import { api } from '../_generated/api'
import type { QueryCtx } from '../_generated/server'
import { query } from '../_generated/server'
import type { AskEvidenceResult } from './contracts'
import { askEvidenceResult, storedScope } from './contracts'
import { authorizeThreadRead } from './threads'

const MAX_EVIDENCE_RECORDS = 8
const MAX_EVIDENCE_ITEMS = 24

const STOP_WORDS = new Set([
  'and',
  'about',
  'after',
  'again',
  'are',
  'been',
  'before',
  'did',
  'could',
  'does',
  'from',
  'happened',
  'have',
  'how',
  'into',
  'its',
  'official',
  'parish',
  'public',
  'record',
  'records',
  'that',
  'the',
  'their',
  'there',
  'these',
  'this',
  'was',
  'were',
  'what',
  'when',
  'where',
  'which',
  'with',
  'would',
])

export const retrieveEvidence = query({
  args: {
    token: v.string(),
    threadId: v.string(),
    question: v.string(),
  },
  returns: askEvidenceResult,
  handler: async (ctx, args): Promise<AskEvidenceResult> => {
    const question = args.question.trim()
    if (question.length === 0 || question.length > 500) {
      throw new ConvexError({
        code: 'question_bounds',
        message: 'Questions must contain 1 to 500 characters',
      })
    }
    const access = await authorizeThreadRead(ctx, args.token, args.threadId)
    const scope = storedScope(access.mapping.scopeKind, access.mapping.scopeKey)
    const terms = searchTerms(question)
    if (terms.length === 0) return { kind: 'no_evidence', scope, evidence: [] }

    const decisions = await scopedDecisions(ctx, scope, terms)
    const evidence = decisions
      .flatMap((decision) =>
        decision.citations.map((citation) => ({
          evidenceId: citation.id,
          recordKey: decision.recordKey,
          fieldPath: citation.fieldPath,
          documentTitle: citation.documentTitle,
          bodyName: citation.bodyName,
          officialUrl: citation.officialUrl,
          excerpt: citation.excerpt,
          page: citation.page,
          section: citation.section,
          sourceHref: `/decisions/${encodeURIComponent(decision.recordKey)}?source=${encodeURIComponent(citation.id)}`,
        })),
      )
      .sort(
        (left, right) =>
          evidenceScore(right, terms) - evidenceScore(left, terms),
      )
      .slice(0, MAX_EVIDENCE_ITEMS)

    const kind: AskEvidenceResult['kind'] =
      evidence.length > 0 ? 'evidence' : 'no_evidence'
    return {
      kind,
      scope,
      evidence,
    }
  },
})

export const retrieveEvidenceByIds = query({
  args: {
    token: v.string(),
    threadId: v.string(),
    evidenceIds: v.array(v.string()),
  },
  returns: askEvidenceResult,
  handler: async (ctx, args): Promise<AskEvidenceResult> => {
    if (
      args.evidenceIds.length === 0 ||
      args.evidenceIds.length > 8 ||
      new Set(args.evidenceIds).size !== args.evidenceIds.length
    ) {
      throw new ConvexError({
        code: 'evidence_id_bounds',
        message: 'Answer evidence IDs are invalid',
      })
    }
    const access = await authorizeThreadRead(ctx, args.token, args.threadId)
    const scope = storedScope(access.mapping.scopeKind, access.mapping.scopeKey)
    const issueKeys = await issueRecordKeys(ctx, scope)
    const evidence = await Promise.all(
      args.evidenceIds.map((evidenceId) =>
        loadAcceptedEvidenceById(ctx, scope, issueKeys, evidenceId),
      ),
    )
    const accepted = evidence.filter(
      (item): item is NonNullable<typeof item> => item !== null,
    )
    return {
      kind:
        accepted.length === args.evidenceIds.length
          ? 'evidence'
          : 'no_evidence',
      scope,
      evidence: accepted,
    }
  },
})

type Scope = ReturnType<typeof storedScope>

async function issueRecordKeys(
  ctx: QueryCtx,
  scope: Scope,
): Promise<Set<string> | null> {
  if (scope.kind !== 'issue') return null
  const issue: IssueProjection | null = await ctx.runQuery(
    api.resident.evidence.getPublishedIssue,
    { slug: scope.issueSlug },
  )
  return issue
    ? new Set(issue.links.map((link) => link.recordKey))
    : new Set<string>()
}

async function loadAcceptedEvidenceById(
  ctx: QueryCtx,
  scope: Scope,
  issueKeys: Set<string> | null,
  evidenceId: string,
) {
  const citationId = ctx.db.normalizeId('citations', evidenceId)
  if (!citationId) return null
  const citation = await ctx.db.get(citationId)
  if (!citation) return null
  const publication = await ctx.db.get(citation.publicationVersionId)
  if (!publication?.payload || publication.mode === 'withheld') return null
  const record = await ctx.db.get(publication.recordId)
  if (
    !record ||
    record.currentPublishedVersionId !== publication._id ||
    record.currentMode !== publication.mode
  ) {
    return null
  }
  const body = await ctx.db.get(record.governmentBodyId)
  if (!body) return null
  const place = await ctx.db.get(body.jurisdictionId)
  if (!place) return null
  const inScope =
    scope.kind === 'issue'
      ? (issueKeys?.has(record.recordKey) ?? false)
      : scope.kind === 'meeting'
        ? record.currentMeetingKey === scope.meetingId
        : !scope.areaKey || place.slug === scope.areaKey
  if (!inScope) return null
  return {
    evidenceId: citation._id,
    recordKey: record.recordKey,
    fieldPath: citation.fieldPath,
    documentTitle: publication.payload.title,
    bodyName: body.name,
    officialUrl: citation.officialUrl,
    excerpt: citation.excerpt,
    page: citation.page ?? null,
    section: citation.section ?? null,
    sourceHref: `/decisions/${encodeURIComponent(record.recordKey)}?source=${encodeURIComponent(citation._id)}`,
  }
}

type EvidenceCitation = {
  id: string
  fieldPath: string
  documentTitle: string
  bodyName: string
  officialUrl: string
  excerpt: string
  page: number | null
  section: string | null
}

type ScopedDecision = {
  recordKey: string
  citations: EvidenceCitation[]
}

type IssueProjection = {
  title: string
  summary: string
  topics: string[]
  links: Array<{
    recordKey: string
    title: string
    summary: string | null
    reason: string
  }>
}

type MeetingProjection = {
  bodyName: string
  placeName: string
  meetingAt: string
  decisions: Array<
    ScopedDecision & {
      title: string
      summary: string | null
      sourceRecordId: string
    }
  >
}

type DiscoveryProjection = {
  recordKey: string
  sourceRecordId: string
  placeSlug: string
  bodyName: string
  title: string
  summary: string | null
}

async function scopedDecisions(
  ctx: QueryCtx,
  scope: Scope,
  terms: string[],
): Promise<ScopedDecision[]> {
  if (scope.kind === 'issue') {
    const issue: IssueProjection | null = await ctx.runQuery(
      api.resident.evidence.getPublishedIssue,
      { slug: scope.issueSlug },
    )
    if (!issue) return []
    const issueMatches = score(
      `${issue.title} ${issue.summary} ${issue.topics.join(' ')}`,
      terms,
    )
    const keys = issue.links
      .map((link) => ({
        key: link.recordKey,
        score: score(
          `${link.title} ${link.summary ?? ''} ${link.reason}`,
          terms,
        ),
      }))
      .filter((item) => issueMatches > 0 || item.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, MAX_EVIDENCE_RECORDS)
      .map((item) => item.key)
    return await loadDecisions(ctx, keys)
  }

  if (scope.kind === 'meeting') {
    const meeting: MeetingProjection | null = await ctx.runQuery(
      api.resident.evidence.getPublishedMeeting,
      { meetingKey: scope.meetingId },
    )
    if (!meeting) return []
    const meetingMatches = score(
      `${meeting.bodyName} ${meeting.placeName} ${meeting.meetingAt}`,
      terms,
    )
    return meeting.decisions
      .map((decision) => ({
        decision,
        score: score(
          `${decision.title} ${decision.summary ?? ''} ${decision.sourceRecordId}`,
          terms,
        ),
      }))
      .filter((item) => meetingMatches > 0 || item.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, MAX_EVIDENCE_RECORDS)
      .map((item) => item.decision)
  }

  const published: DiscoveryProjection[] = await ctx.runQuery(
    api.resident.discovery.listPublishedDecisions,
    {},
  )
  const keys = published
    .filter(
      (decision) => !scope.areaKey || decision.placeSlug === scope.areaKey,
    )
    .map((decision) => ({
      key: decision.recordKey,
      score: score(
        `${decision.title} ${decision.summary ?? ''} ${decision.sourceRecordId} ${decision.bodyName}`,
        terms,
      ),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, MAX_EVIDENCE_RECORDS)
    .map((item) => item.key)
  return await loadDecisions(ctx, keys)
}

async function loadDecisions(
  ctx: QueryCtx,
  recordKeys: string[],
): Promise<ScopedDecision[]> {
  const decisions: Array<ScopedDecision | null> = await Promise.all(
    recordKeys.map((recordKey) =>
      ctx.runQuery(api.resident.evidence.getPublishedDecision, { recordKey }),
    ),
  )
  return decisions.filter(
    (decision): decision is ScopedDecision => decision !== null,
  )
}

function searchTerms(question: string): string[] {
  return [
    ...new Set(
      question
        .toLowerCase()
        .normalize('NFKD')
        .split(/[^a-z0-9]+/)
        .filter((term) => term.length >= 3 && !STOP_WORDS.has(term)),
    ),
  ].slice(0, 12)
}

function score(value: string, terms: string[]): number {
  const normalized = value.toLowerCase().normalize('NFKD')
  return terms.reduce(
    (total, term) => total + (normalized.includes(term) ? 1 : 0),
    0,
  )
}

function evidenceScore(
  evidence: { fieldPath: string; documentTitle: string; excerpt: string },
  terms: string[],
): number {
  return (
    score(`${evidence.documentTitle} ${evidence.excerpt}`, terms) * 10 +
    (evidence.fieldPath === '/title' ||
    evidence.fieldPath === '/plainLanguageSummary'
      ? 1
      : 0)
  )
}
