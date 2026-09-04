import { ConvexError, v } from 'convex/values'

import { api } from '../_generated/api'
import type { Doc, Id } from '../_generated/dataModel'
import type { QueryCtx } from '../_generated/server'
import { internalQuery, query } from '../_generated/server'
import type {
  AskEvidence,
  AskEvidenceResult,
  AskIssueCatalogItem,
  AskMeetingCatalogItem,
  AskRecordContext,
} from './contracts'
import {
  askEvidenceResult,
  MAX_ANSWER_EVIDENCE_IDS,
  storedScope,
} from './contracts'
import { authorizeThreadRead } from './threads'

const MAX_SCOPE_RECORDS = 75
const MAX_SCOPE_EVIDENCE_ITEMS = 1_500
const MAX_SELECTED_DOCUMENT_BYTES = 2_000_000
const MAX_SCOPE_BODIES = 25

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
    const decisions = await scopedDecisions(ctx, scope)
    const records = decisions.map(recordContext)
    const meetings = meetingCatalog(decisions)
    const issues = await issueCatalog(ctx, decisions)
    const evidence = decisions.flatMap((decision) =>
      decision.citations.map((citation) => projectEvidence(decision, citation)),
    )
    if (evidence.length > MAX_SCOPE_EVIDENCE_ITEMS) {
      throw new ConvexError({
        code: 'ask_scope_too_large',
        message: 'This Ask scope has too many accepted evidence excerpts',
      })
    }

    const kind: AskEvidenceResult['kind'] =
      evidence.length > 0 ? 'evidence' : 'no_evidence'
    return {
      kind,
      scope,
      issues,
      meetings,
      records,
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
      args.evidenceIds.length > MAX_ANSWER_EVIDENCE_IDS ||
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
    const decisions = await loadDecisions(ctx, [
      ...new Set(accepted.map((item) => item.recordKey)),
    ])
    return {
      kind:
        accepted.length === args.evidenceIds.length
          ? 'evidence'
          : 'no_evidence',
      scope,
      issues: await issueCatalog(ctx, decisions),
      meetings: meetingCatalog(decisions),
      records: decisions.map(recordContext),
      evidence: accepted,
    }
  },
})

const publishedDocumentRef = v.object({
  snapshotId: v.id('sourceSnapshots'),
  normalizedStorageId: v.id('_storage'),
  normalizedContentHash: v.string(),
  normalizedByteLength: v.number(),
  officialUrl: v.string(),
  retrievedAt: v.number(),
  recordKeys: v.array(v.string()),
  evidenceIds: v.array(v.string()),
})

export type PublishedDocumentRef = typeof publishedDocumentRef.type

export const retrievePublishedDocumentRefs = internalQuery({
  args: {
    token: v.string(),
    threadId: v.string(),
    evidenceIds: v.array(v.string()),
  },
  returns: v.array(publishedDocumentRef),
  handler: async (ctx, args): Promise<PublishedDocumentRef[]> => {
    if (
      args.evidenceIds.length === 0 ||
      args.evidenceIds.length > MAX_SCOPE_EVIDENCE_ITEMS ||
      new Set(args.evidenceIds).size !== args.evidenceIds.length
    ) {
      throw new ConvexError({
        code: 'ask_scope_too_large',
        message: 'The selected evidence set is too large to load safely',
      })
    }
    const access = await authorizeThreadRead(ctx, args.token, args.threadId)
    const scope = storedScope(access.mapping.scopeKind, access.mapping.scopeKey)
    const issueKeys = await issueRecordKeys(ctx, scope)
    const refs = await Promise.all(
      [...new Set(args.evidenceIds)].map(async (evidenceId) => {
        const source = await loadAcceptedEvidenceSource(
          ctx,
          scope,
          issueKeys,
          evidenceId,
        )
        if (!source) {
          throw new ConvexError({
            code: 'ask_evidence_changed',
            message: 'Selected evidence is no longer current',
          })
        }
        const snapshot = await ctx.db.get(source.snapshotId)
        if (
          !snapshot?.normalizedContentHash ||
          snapshot.contentHashBasis !== 'raw_artifact_v2' ||
          snapshot.truncation.truncated
        ) {
          throw new ConvexError({
            code: 'ask_document_unavailable',
            message: 'A selected official document is not fully available',
          })
        }
        return {
          snapshotId: snapshot._id,
          normalizedStorageId: snapshot.normalizedStorageId,
          normalizedContentHash: snapshot.normalizedContentHash,
          normalizedByteLength: snapshot.normalizedByteLength,
          officialUrl: source.evidence.officialUrl,
          retrievedAt: source.evidence.retrievedAt,
          recordKeys: [source.evidence.recordKey],
          evidenceIds: [source.evidence.evidenceId],
        }
      }),
    )
    const bySnapshot = new Map<string, PublishedDocumentRef>()
    for (const ref of refs) {
      const existing = bySnapshot.get(ref.snapshotId)
      bySnapshot.set(
        ref.snapshotId,
        existing
          ? {
              ...existing,
              recordKeys: [
                ...new Set([...existing.recordKeys, ...ref.recordKeys]),
              ],
              evidenceIds: [
                ...new Set([...existing.evidenceIds, ...ref.evidenceIds]),
              ],
            }
          : ref,
      )
    }
    const documents = [...bySnapshot.values()]
    const documentBytes = documents.reduce(
      (total, document) => total + document.normalizedByteLength,
      0,
    )
    if (documentBytes > MAX_SELECTED_DOCUMENT_BYTES) {
      throw new ConvexError({
        code: 'ask_scope_too_large',
        message: 'The selected official documents are too large to load safely',
      })
    }
    return documents
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
  const source = await loadAcceptedEvidenceSource(
    ctx,
    scope,
    issueKeys,
    evidenceId,
  )
  return source?.evidence ?? null
}

async function loadAcceptedEvidenceSource(
  ctx: QueryCtx,
  scope: Scope,
  issueKeys: Set<string> | null,
  evidenceId: string,
): Promise<{
  evidence: AskEvidence
  snapshotId: Id<'sourceSnapshots'>
} | null> {
  const citationId = ctx.db.normalizeId('citations', evidenceId)
  if (!citationId) return null
  const citation = await ctx.db.get(citationId)
  if (!citation) return null
  const publication = await ctx.db.get(citation.publicationVersionId)
  if (!publication?.payload || publication.mode === 'withheld') return null
  if (
    citation.snapshotId !== publication.snapshotId ||
    citation.snapshotId !== publication.payload.source.snapshotId
  ) {
    return null
  }
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
    evidence: {
      evidenceId: citation._id,
      recordKey: record.recordKey,
      fieldPath: citation.fieldPath,
      documentTitle: publication.payload.title,
      bodyName: body.name,
      sourceKind: publication.payload.source.sourceKind,
      officialUrl: citation.officialUrl,
      excerpt: citation.excerpt,
      page: citation.page ?? null,
      section: citation.section ?? null,
      retrievedAt: citation.retrievedAt,
      sourceHref: `/decisions/${encodeURIComponent(record.recordKey)}?source=${encodeURIComponent(citation._id)}`,
    },
    snapshotId: citation.snapshotId,
  }
}

type EvidenceCitation = {
  id: string
  fieldPath: string
  documentTitle: string
  bodyName: string
  sourceKind: AskEvidence['sourceKind']
  officialUrl: string
  excerpt: string
  page: number | null
  section: string | null
  retrievedAt: number
}

type ScopedDecision = {
  recordKey: string
  sourceRecordId: string
  placeName: string
  placeSlug: string
  bodyName: string
  mode: 'full' | 'limited'
  title: string
  recordType: string | null
  lifecycleState: string | null
  summary: string | null
  meetingAt: string | null
  meetingKey: string | null
  affectedPlaces: string[]
  amounts: Array<{
    value: number
    currency: 'USD'
    context: string
    citationIds: string[]
  }>
  publicActions: Array<{
    type: string
    deadline: string | null
    instructions: string
    instructionCitationIds: string[]
    deadlineCitationIds: string[]
  }>
  issue: { slug: string; title: string } | null
  versions: Array<{
    version: number
    mode: 'full' | 'limited'
    reasonCode: string
    createdAt: number
  }>
  changes: Array<{
    id: string
    classification: string
    fieldPaths: string[]
    createdAt: number
  }>
  citations: EvidenceCitation[]
}

type IssueProjection = {
  slug: string
  placeName: string
  placeSlug: string
  bodyName: string
  title: string
  summary: string
  lifecycleState: string | null
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

async function scopedDecisions(
  ctx: QueryCtx,
  scope: Scope,
): Promise<ScopedDecision[]> {
  if (scope.kind === 'issue') {
    const issue: IssueProjection | null = await ctx.runQuery(
      api.resident.evidence.getPublishedIssue,
      { slug: scope.issueSlug },
    )
    if (!issue) return []
    const keys = issue.links.map((link) => link.recordKey)
    return await loadDecisions(ctx, keys)
  }

  if (scope.kind === 'meeting') {
    const meeting: MeetingProjection | null = await ctx.runQuery(
      api.resident.evidence.getPublishedMeeting,
      { meetingKey: scope.meetingId },
    )
    if (!meeting) return []
    return meeting.decisions
  }

  let records: Array<Doc<'decisionRecords'>>
  if (scope.areaKey) {
    const areaKey = scope.areaKey
    const jurisdiction = await ctx.db
      .query('jurisdictions')
      .withIndex('by_slug', (q) => q.eq('slug', areaKey))
      .unique()
    if (!jurisdiction) return []
    const bodies = await ctx.db
      .query('governmentBodies')
      .withIndex('by_jurisdiction_and_status', (q) =>
        q.eq('jurisdictionId', jurisdiction._id),
      )
      .take(MAX_SCOPE_BODIES + 1)
    if (bodies.length > MAX_SCOPE_BODIES) {
      throw new ConvexError({
        code: 'ask_scope_too_large',
        message: 'This Ask scope has too many government bodies',
      })
    }
    records = (
      await Promise.all(
        bodies.flatMap((body) =>
          (['full', 'limited'] as const).map((mode) =>
            ctx.db
              .query('decisionRecords')
              .withIndex(
                'by_government_body_and_current_mode_and_updated_at',
                (q) =>
                  q.eq('governmentBodyId', body._id).eq('currentMode', mode),
              )
              .order('desc')
              .take(MAX_SCOPE_RECORDS + 1),
          ),
        ),
      )
    ).flat()
  } else {
    const [fullRecords, limitedRecords] = await Promise.all([
      ctx.db
        .query('decisionRecords')
        .withIndex('by_current_mode_and_updated_at', (q) =>
          q.eq('currentMode', 'full'),
        )
        .order('desc')
        .take(MAX_SCOPE_RECORDS + 1),
      ctx.db
        .query('decisionRecords')
        .withIndex('by_current_mode_and_updated_at', (q) =>
          q.eq('currentMode', 'limited'),
        )
        .order('desc')
        .take(MAX_SCOPE_RECORDS + 1),
    ])
    records = [...fullRecords, ...limitedRecords]
  }
  if (records.length > MAX_SCOPE_RECORDS) {
    throw new ConvexError({
      code: 'ask_scope_too_large',
      message: 'This Ask scope is too large to load safely',
    })
  }
  records.sort((left, right) => right.updatedAt - left.updatedAt)
  const keys = records.map((record) => record.recordKey)
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

function projectEvidence(
  decision: ScopedDecision,
  citation: EvidenceCitation,
): AskEvidence {
  return {
    evidenceId: citation.id,
    recordKey: decision.recordKey,
    fieldPath: citation.fieldPath,
    documentTitle: citation.documentTitle,
    bodyName: citation.bodyName,
    sourceKind: citation.sourceKind,
    officialUrl: citation.officialUrl,
    excerpt: citation.excerpt,
    page: citation.page,
    section: citation.section,
    retrievedAt: citation.retrievedAt,
    sourceHref: `/decisions/${encodeURIComponent(decision.recordKey)}?source=${encodeURIComponent(citation.id)}`,
  }
}

function recordContext(decision: ScopedDecision): AskRecordContext {
  return {
    recordKey: decision.recordKey,
    sourceRecordId: decision.sourceRecordId,
    placeName: decision.placeName,
    placeSlug: decision.placeSlug,
    bodyName: decision.bodyName,
    mode: decision.mode,
    title: decision.title,
    recordType: decision.recordType,
    lifecycleState: decision.lifecycleState,
    summary: decision.summary,
    meetingAt: decision.meetingAt,
    meetingKey: decision.meetingKey,
    affectedPlaces: decision.affectedPlaces,
    amounts: decision.amounts.map((amount) => ({
      value: amount.value,
      currency: amount.currency,
      context: amount.context,
      evidenceIds: amount.citationIds,
    })),
    publicActions: decision.publicActions.map((action) => ({
      type: action.type,
      deadline: action.deadline,
      instructions: action.instructions,
      evidenceIds: [
        ...action.instructionCitationIds,
        ...action.deadlineCitationIds,
      ],
    })),
    issue: decision.issue,
    versions: decision.versions,
    changes: decision.changes,
    evidenceIds: decision.citations.map((citation) => citation.id),
  }
}

async function issueCatalog(
  ctx: QueryCtx,
  decisions: ScopedDecision[],
): Promise<AskIssueCatalogItem[]> {
  const scopedRecordKeys = new Set(
    decisions.map((decision) => decision.recordKey),
  )
  const issueSlugs = [
    ...new Set(
      decisions.flatMap((decision) =>
        decision.issue ? [decision.issue.slug] : [],
      ),
    ),
  ]
  const issues: Array<IssueProjection | null> = await Promise.all(
    issueSlugs.map((slug) =>
      ctx.runQuery(api.resident.evidence.getPublishedIssue, { slug }),
    ),
  )
  return issues.flatMap((issue) => {
    if (!issue) return []
    const recordKeys = issue.links
      .map((link) => link.recordKey)
      .filter((recordKey) => scopedRecordKeys.has(recordKey))
    if (recordKeys.length === 0) return []
    return [
      {
        issueSlug: issue.slug,
        placeName: issue.placeName,
        placeSlug: issue.placeSlug,
        bodyName: issue.bodyName,
        title: issue.title,
        summary: issue.summary,
        lifecycleState: issue.lifecycleState,
        topics: issue.topics,
        recordKeys,
      },
    ]
  })
}

function meetingCatalog(decisions: ScopedDecision[]): AskMeetingCatalogItem[] {
  const meetings = new Map<string, AskMeetingCatalogItem>()
  for (const decision of decisions) {
    if (!decision.meetingKey || !decision.meetingAt) continue
    const current = meetings.get(decision.meetingKey)
    if (current) {
      current.recordKeys.push(decision.recordKey)
      current.decisionTitles.push(decision.title)
      continue
    }
    meetings.set(decision.meetingKey, {
      meetingKey: decision.meetingKey,
      placeName: decision.placeName,
      placeSlug: decision.placeSlug,
      bodyName: decision.bodyName,
      meetingAt: decision.meetingAt,
      recordKeys: [decision.recordKey],
      decisionTitles: [decision.title],
    })
  }
  return [...meetings.values()].sort((left, right) =>
    left.meetingAt.localeCompare(right.meetingAt),
  )
}

export const retrieveCatalogPage = internalQuery({
  args: { token: v.string(), threadId: v.string(), cursor: v.union(v.string(), v.null()), revision: v.optional(v.number()) },
  returns: v.object({ catalog: askEvidenceResult, cursor: v.string(), isDone: v.boolean(), revision: v.number() }),
  handler: async (ctx, args) => {
    const access = await authorizeThreadRead(ctx, args.token, args.threadId)
    const scope = storedScope(access.mapping.scopeKind, access.mapping.scopeKey)
    const revision = (await ctx.db.query('publicCorpusState').withIndex('by_key', q => q.eq('key', 'published')).unique())?.revision ?? 0
    if (args.revision !== undefined && args.revision !== revision) throw new ConvexError({ code: 'ask_evidence_changed', message: 'Published evidence changed. Retry the question.' })
    const page = await ctx.db.query('decisionRecords').order('asc').paginate({ numItems: 25, cursor: args.cursor })
    const issueKeys = await issueRecordKeys(ctx, scope)
    const keys: string[] = []
    for (const record of page.page) {
      if (!record.currentPublishedVersionId || !record.currentMode) continue
      if (scope.kind === 'issue' && !issueKeys?.has(record.recordKey)) continue
      if (scope.kind === 'meeting' && record.currentMeetingKey !== scope.meetingId) continue
      if (scope.kind === 'corpus' && scope.areaKey) {
        const body = await ctx.db.get(record.governmentBodyId)
        const place = body ? await ctx.db.get(body.jurisdictionId) : null
        if (place?.slug !== scope.areaKey) continue
      }
      keys.push(record.recordKey)
    }
    const decisions = await loadDecisions(ctx, keys)
    const evidence = decisions.flatMap(decision => decision.citations.map(citation => projectEvidence(decision, citation)))
    if (evidence.length > MAX_SCOPE_EVIDENCE_ITEMS) throw new ConvexError({ code: 'ask_scope_too_large', message: 'One evidence batch is too large. Choose a decision or meeting.' })
    return { cursor: page.continueCursor, isDone: page.isDone, revision, catalog: { kind: evidence.length ? 'evidence' as const : 'no_evidence' as const, scope, issues: await issueCatalog(ctx, decisions), meetings: meetingCatalog(decisions), records: decisions.map(recordContext), evidence } }
  },
})

export const retrieveSelectedCatalog = internalQuery({
  args: { token: v.string(), threadId: v.string(), evidenceIds: v.array(v.string()), revision: v.number() }, returns: askEvidenceResult,
  handler: async (ctx, args): Promise<AskEvidenceResult> => {
    if (args.evidenceIds.length > MAX_SCOPE_EVIDENCE_ITEMS) throw new ConvexError({ code: 'ask_scope_too_large', message: 'Choose a place, issue, meeting or date to narrow this question.' })
    const revision = (await ctx.db.query('publicCorpusState').withIndex('by_key', q => q.eq('key', 'published')).unique())?.revision ?? 0
    if (revision !== args.revision) throw new ConvexError({ code: 'ask_evidence_changed', message: 'Published evidence changed. Retry the question.' })
    const access = await authorizeThreadRead(ctx, args.token, args.threadId)
    const scope = storedScope(access.mapping.scopeKind, access.mapping.scopeKey)
    const issueKeys = await issueRecordKeys(ctx, scope)
    const evidence: AskEvidence[] = []
    for (const evidenceId of args.evidenceIds) {
      const item = await loadAcceptedEvidenceById(ctx, scope, issueKeys, evidenceId)
      if (!item) throw new ConvexError({ code: 'ask_evidence_changed', message: 'Selected evidence changed. Retry the question.' })
      evidence.push(item)
    }
    const decisions = await loadDecisions(ctx, [...new Set(evidence.map(item => item.recordKey))])
    return { kind: evidence.length ? 'evidence' : 'no_evidence', scope, issues: await issueCatalog(ctx, decisions), meetings: meetingCatalog(decisions), records: decisions.map(recordContext), evidence }
  },
})

export const expandCatalogSelection = internalQuery({
  args: { token: v.string(), threadId: v.string(), revision: v.number(), targets: v.array(v.object({ kind: v.union(v.literal('issue'), v.literal('meeting')), id: v.string() })) }, returns: v.array(v.string()),
  handler: async (ctx, args) => {
    if (args.targets.length > 20) throw new ConvexError({ code: 'ask_scope_too_large', message: 'Choose one issue or meeting.' })
    const revision = (await ctx.db.query('publicCorpusState').withIndex('by_key', q => q.eq('key', 'published')).unique())?.revision ?? 0
    if (revision !== args.revision) throw new ConvexError({ code: 'ask_evidence_changed', message: 'Published evidence changed. Retry the question.' })
    const access = await authorizeThreadRead(ctx, args.token, args.threadId)
    const scope = storedScope(access.mapping.scopeKind, access.mapping.scopeKey)
    const issueKeys = await issueRecordKeys(ctx, scope)
    const keys = new Set<string>()
    for (const target of args.targets) {
      if (target.kind === 'issue') {
        const issue = await ctx.runQuery(api.resident.evidence.getPublishedIssue, { slug: target.id })
        for (const link of issue?.links ?? []) keys.add(link.recordKey)
      } else {
        const meeting = await ctx.runQuery(api.resident.evidence.getPublishedMeeting, { meetingKey: target.id })
        for (const decision of meeting?.decisions ?? []) keys.add(decision.recordKey)
      }
    }
    if (keys.size > 200) throw new ConvexError({ code: 'ask_scope_too_large', message: 'Choose one issue or meeting.' })
    const decisions = await loadDecisions(ctx, [...keys])
    const ids = decisions.filter(decision => scope.kind === 'corpus' ? !scope.areaKey || decision.placeSlug === scope.areaKey : scope.kind === 'issue' ? issueKeys?.has(decision.recordKey) : decision.meetingKey === scope.meetingId).flatMap(decision => decision.citations.map(citation => citation.id))
    if (ids.length > MAX_SCOPE_EVIDENCE_ITEMS) throw new ConvexError({ code: 'ask_scope_too_large', message: 'Choose a narrower question.' })
    return [...new Set(ids)]
  },
})
