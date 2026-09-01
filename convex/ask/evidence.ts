import { ConvexError, v } from 'convex/values'

import { api } from '../_generated/api'
import type { QueryCtx } from '../_generated/server'
import { query } from '../_generated/server'
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
  handler: async (ctx, args) => {
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

    return {
      kind: evidence.length > 0 ? 'evidence' : 'no_evidence',
      scope,
      evidence,
    }
  },
})

type Scope = ReturnType<typeof storedScope>

async function scopedDecisions(ctx: QueryCtx, scope: Scope, terms: string[]) {
  if (scope.kind === 'issue') {
    const issue = await ctx.runQuery(api.resident.evidence.getPublishedIssue, {
      slug: scope.issueSlug,
    })
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
    const meeting = await ctx.runQuery(
      api.resident.evidence.getPublishedMeeting,
      { meetingId: scope.meetingId },
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

  const published = await ctx.runQuery(
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

async function loadDecisions(ctx: QueryCtx, recordKeys: string[]) {
  const decisions = await Promise.all(
    recordKeys.map((recordKey) =>
      ctx.runQuery(api.resident.evidence.getPublishedDecision, { recordKey }),
    ),
  )
  return decisions.filter(
    (decision): decision is NonNullable<typeof decision> => decision !== null,
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
