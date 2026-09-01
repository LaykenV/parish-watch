import { paginationOptsValidator } from 'convex/server'
import { v } from 'convex/values'

import type { Doc, Id } from '../_generated/dataModel'
import type { QueryCtx } from '../_generated/server'
import { internalMutation, query } from '../_generated/server'
import { importanceFactorNames, importanceLevels } from '../issues/contractV1'
import {
  lifecycleStates,
  publicActionTypes,
  recordTypes,
} from '../extraction/contractV1'
import { sourceKindUnion } from '../pipeline/state'
import { residentMeetingKey } from './meetingKey'

const acceptedMode = v.union(v.literal('full'), v.literal('limited'))
const nullableLifecycle = v.union(lifecycleStates, v.null())
const citation = v.object({
  id: v.string(),
  fieldPath: v.string(),
  bodyName: v.string(),
  documentTitle: v.string(),
  sourceKind: sourceKindUnion,
  officialUrl: v.string(),
  excerpt: v.string(),
  page: v.union(v.number(), v.null()),
  section: v.union(v.string(), v.null()),
  retrievedAt: v.number(),
})
const version = v.object({
  version: v.number(),
  mode: acceptedMode,
  reasonCode: v.string(),
  createdAt: v.number(),
})
const materialChange = v.object({
  id: v.string(),
  classification: v.string(),
  fieldPaths: v.array(v.string()),
  createdAt: v.number(),
})
const amount = v.object({
  value: v.number(),
  currency: v.literal('USD'),
  context: v.string(),
  citationIds: v.array(v.string()),
})
const publicAction = v.object({
  type: publicActionTypes,
  deadline: v.union(v.string(), v.null()),
  instructions: v.string(),
  instructionCitationIds: v.array(v.string()),
  deadlineCitationIds: v.array(v.string()),
})
const decision = v.object({
  recordKey: v.string(),
  sourceRecordId: v.string(),
  placeName: v.string(),
  placeSlug: v.string(),
  bodyName: v.string(),
  mode: acceptedMode,
  title: v.string(),
  recordType: v.union(recordTypes, v.null()),
  lifecycleState: nullableLifecycle,
  summary: v.union(v.string(), v.null()),
  meetingAt: v.union(v.string(), v.null()),
  meetingKey: v.union(v.string(), v.null()),
  affectedPlaces: v.array(v.string()),
  amounts: v.array(amount),
  publicActions: v.array(publicAction),
  citations: v.array(citation),
  versions: v.array(version),
  changes: v.array(materialChange),
  issue: v.union(v.null(), v.object({ slug: v.string(), title: v.string() })),
})

const issueResult = v.object({
  revision: v.string(),
  slug: v.string(),
  placeName: v.string(),
  placeSlug: v.string(),
  bodyName: v.string(),
  mode: acceptedMode,
  title: v.string(),
  summary: v.string(),
  lifecycleState: v.union(v.string(), v.null()),
  nextKnownAction: v.union(
    v.null(),
    v.object({ description: v.string(), at: v.union(v.string(), v.null()) }),
  ),
  topics: v.array(v.string()),
  claimCitationIds: v.object({
    title: v.array(v.string()),
    summary: v.array(v.string()),
    lifecycleState: v.array(v.string()),
    nextDescription: v.array(v.string()),
    nextAt: v.array(v.string()),
  }),
  links: v.array(
    v.object({
      recordKey: v.string(),
      title: v.string(),
      summary: v.union(v.string(), v.null()),
      lifecycleState: nullableLifecycle,
      meetingAt: v.union(v.string(), v.null()),
      relationship: v.string(),
      reason: v.string(),
      citationIds: v.array(v.string()),
    }),
  ),
  factors: v.array(
    v.object({
      factor: importanceFactorNames,
      level: importanceLevels,
      rationale: v.string(),
      citationIds: v.array(v.string()),
    }),
  ),
  publicActions: v.array(publicAction),
  citations: v.array(citation),
  versions: v.array(version),
  changes: v.array(materialChange),
})

const meetingResult = v.object({
  id: v.string(),
  placeName: v.string(),
  placeSlug: v.string(),
  bodyName: v.string(),
  meetingAt: v.string(),
  decisions: v.array(decision),
  citations: v.array(citation),
})

type AcceptedVersion = Doc<'publicationVersions'> & {
  mode: 'full' | 'limited'
  payload: Exclude<Doc<'publicationVersions'>['payload'], null>
}

function acceptedCurrentVersion(
  record: Doc<'decisionRecords'>,
  current: Doc<'publicationVersions'> | null,
): AcceptedVersion | null {
  if (
    !record.currentPublishedVersionId ||
    !record.currentMode ||
    !current ||
    current._id !== record.currentPublishedVersionId ||
    current.recordId !== record._id ||
    current.mode !== record.currentMode ||
    !current.payload ||
    current.payload.kind !== current.mode
  ) {
    return null
  }
  return current as AcceptedVersion
}

async function loadCitations(
  ctx: QueryCtx,
  publication: AcceptedVersion,
  bodyName: string,
): Promise<Array<typeof citation.type> | null> {
  const rows = await ctx.db
    .query('citations')
    .withIndex('by_publication_and_field_path', (q) =>
      q.eq('publicationVersionId', publication._id),
    )
    .take(101)
  if (rows.length > 100) return null
  return rows.map((row) => ({
    id: row._id,
    fieldPath: row.fieldPath,
    bodyName,
    documentTitle: publication.payload.title,
    sourceKind: publication.payload.source.sourceKind,
    officialUrl: row.officialUrl,
    excerpt: row.excerpt,
    page: row.page ?? null,
    section: row.section ?? null,
    retrievedAt: row.retrievedAt,
  }))
}

function citationsForPath(
  citations: Array<typeof citation.type>,
  fieldPath: string,
): string[] {
  return citations
    .filter((item) => item.fieldPath === fieldPath)
    .map((item) => item.id)
}

async function projectDecision(
  ctx: QueryCtx,
  record: Doc<'decisionRecords'>,
  options: { includeIssue: boolean; includeHistory: boolean },
): Promise<typeof decision.type | null> {
  const current = record.currentPublishedVersionId
    ? await ctx.db.get(record.currentPublishedVersionId)
    : null
  const publication = acceptedCurrentVersion(record, current)
  if (!publication) return null
  const body = await ctx.db.get(record.governmentBodyId)
  if (!body) return null
  const place = await ctx.db.get(body.jurisdictionId)
  if (!place) return null
  const citations = await loadCitations(ctx, publication, body.name)
  if (
    !citations ||
    citationsForPath(citations, '/title').length === 0 ||
    citationsForPath(citations, '/bodyName').length === 0
  ) {
    return null
  }
  const payload = publication.payload
  const full = payload.kind === 'full' ? payload : null
  const versions = options.includeHistory
    ? await loadVersions(ctx, record._id)
    : [projectVersion(publication)]
  const changes = options.includeHistory
    ? await loadChanges(ctx, record._id)
    : []
  const issue = options.includeIssue
    ? await loadCurrentIssueForRecord(ctx, record._id, publication._id)
    : null
  const expectedMeetingKey = full?.meetingAt
    ? residentMeetingKey(body.slug, full.meetingAt)
    : null
  const meetingKey =
    expectedMeetingKey && record.currentMeetingKey === expectedMeetingKey
      ? expectedMeetingKey
      : null

  return {
    recordKey: record.recordKey,
    sourceRecordId: record.sourceRecordId,
    placeName: place.name,
    placeSlug: place.slug,
    bodyName: body.name,
    mode: publication.mode,
    title: payload.title,
    recordType: full?.recordType ?? null,
    lifecycleState: full?.lifecycleState ?? null,
    summary: full?.plainLanguageSummary ?? null,
    meetingAt: full?.meetingAt ?? null,
    meetingKey,
    affectedPlaces: full?.affectedPlaces ?? [],
    amounts: (full?.amounts ?? []).map((item, index) => ({
      ...item,
      citationIds: [
        ...citationsForPath(citations, `/amounts/${index}/value`),
        ...citationsForPath(citations, `/amounts/${index}/currency`),
        ...citationsForPath(citations, `/amounts/${index}/context`),
      ],
    })),
    publicActions: (full?.publicActions ?? []).map((item, index) => ({
      ...item,
      instructionCitationIds: citationsForPath(
        citations,
        `/publicActions/${index}/instructions`,
      ),
      deadlineCitationIds: citationsForPath(
        citations,
        `/publicActions/${index}/deadline`,
      ),
    })),
    citations,
    versions,
    changes,
    issue,
  }
}

async function loadVersions(
  ctx: QueryCtx,
  recordId: Id<'decisionRecords'>,
): Promise<Array<typeof version.type>> {
  const rows = await ctx.db
    .query('publicationVersions')
    .withIndex('by_record_and_version', (q) => q.eq('recordId', recordId))
    .order('desc')
    .take(21)
  return rows
    .filter(
      (row): row is AcceptedVersion =>
        row.mode !== 'withheld' && row.payload !== null,
    )
    .slice(0, 20)
    .map(projectVersion)
}

function projectVersion(row: AcceptedVersion): typeof version.type {
  return {
    version: row.version,
    mode: row.mode,
    reasonCode: row.reasonCode,
    createdAt: row.createdAt,
  }
}

async function loadChanges(
  ctx: QueryCtx,
  recordId: Id<'decisionRecords'>,
): Promise<Array<typeof materialChange.type>> {
  const rows = await ctx.db
    .query('materialChanges')
    .withIndex('by_record_and_created_at', (q) => q.eq('recordId', recordId))
    .order('desc')
    .take(20)
  return rows
    .filter((row) => row.material)
    .map((row) => ({
      id: row._id,
      classification: row.classification,
      fieldPaths: row.fieldChanges.map((change) => change.fieldPath),
      createdAt: row.createdAt,
    }))
}

async function loadCurrentIssueForRecord(
  ctx: QueryCtx,
  recordId: Id<'decisionRecords'>,
  publicationVersionId: Id<'publicationVersions'>,
): Promise<{ slug: string; title: string } | null> {
  const links = await ctx.db
    .query('issueDecisionLinks')
    .withIndex('by_record_and_created_at', (q) => q.eq('recordId', recordId))
    .order('desc')
    .take(20)
  for (const link of links) {
    if (link.publicationVersionId !== publicationVersionId) continue
    const issue = await ctx.db.get(link.issueId)
    if (!issue || issue.currentVersionId !== link.issueVersionId) continue
    const issueVersion = await ctx.db.get(link.issueVersionId)
    if (!issueVersion?.payload || issueVersion.mode === 'withheld') continue
    return { slug: issue.slug, title: issueVersion.payload.title }
  }
  return null
}

export const getPublishedDecision = query({
  args: { recordKey: v.string() },
  returns: v.union(v.null(), decision),
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query('decisionRecords')
      .withIndex('by_record_key', (q) => q.eq('recordKey', args.recordKey))
      .unique()
    return record
      ? await projectDecision(ctx, record, {
          includeIssue: true,
          includeHistory: true,
        })
      : null
  },
})

export const getPublishedMeeting = query({
  args: { meetingKey: v.string() },
  returns: v.union(v.null(), meetingResult),
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query('decisionRecords')
      .withIndex('by_current_meeting_key', (q) =>
        q.eq('currentMeetingKey', args.meetingKey),
      )
      .take(31)
    if (records.length === 0 || records.length > 30) return null
    const decisions = (
      await Promise.all(
        records.map((record) =>
          projectDecision(ctx, record, {
            includeIssue: false,
            includeHistory: false,
          }),
        ),
      )
    ).filter((item): item is typeof decision.type => item !== null)
    const first = decisions[0]
    if (
      !first?.meetingAt ||
      decisions.length !== records.length ||
      decisions.some(
        (item) =>
          item.bodyName !== first.bodyName ||
          item.meetingAt !== first.meetingAt,
      )
    ) {
      return null
    }
    return {
      id: args.meetingKey,
      placeName: first.placeName,
      placeSlug: first.placeSlug,
      bodyName: first.bodyName,
      meetingAt: first.meetingAt,
      decisions,
      citations: dedupeCitations(decisions.flatMap((item) => item.citations)),
    }
  },
})

export const getPublishedIssue = query({
  args: { slug: v.string() },
  returns: v.union(v.null(), issueResult),
  handler: async (ctx, args) => {
    const issue = await ctx.db
      .query('issues')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()
    if (!issue?.currentVersionId || !issue.currentMode) return null
    const [current, body] = await Promise.all([
      ctx.db.get(issue.currentVersionId),
      ctx.db.get(issue.governmentBodyId),
    ])
    if (
      !current?.payload ||
      current.issueId !== issue._id ||
      current.mode !== issue.currentMode ||
      current.payload.kind !== current.mode ||
      !body
    ) {
      return null
    }
    const [place, build, links, factors, versions] = await Promise.all([
      ctx.db.get(body.jurisdictionId),
      ctx.db.get(current.buildId),
      ctx.db
        .query('issueDecisionLinks')
        .withIndex('by_issue_version', (q) =>
          q.eq('issueVersionId', current._id),
        )
        .take(11),
      ctx.db
        .query('importanceAssessments')
        .withIndex('by_issue_version_and_factor', (q) =>
          q.eq('issueVersionId', current._id),
        )
        .take(8),
      ctx.db
        .query('issueVersions')
        .withIndex('by_issue_and_version', (q) => q.eq('issueId', issue._id))
        .order('desc')
        .take(20),
    ])
    if (
      !place ||
      !build?.candidate ||
      !build.rankedResult ||
      links.length > 10 ||
      factors.length > 7
    ) {
      return null
    }
    const decisions = (
      await Promise.all(
        links.map(async (link) => {
          const record = await ctx.db.get(link.recordId)
          if (!record) return null
          const projected = await projectDecision(ctx, record, {
            includeIssue: false,
            includeHistory: false,
          })
          if (
            !projected ||
            record.currentPublishedVersionId !== link.publicationVersionId
          ) {
            return null
          }
          return { link, projected }
        }),
      )
    ).filter(
      (
        item,
      ): item is {
        link: Doc<'issueDecisionLinks'>
        projected: typeof decision.type
      } => item !== null,
    )
    if (decisions.length !== links.length) return null
    const citations = dedupeCitations(
      decisions.flatMap(({ projected }) => projected.citations),
    )
    const citationIds = new Set(citations.map((item) => item.id))
    const supported = new Set(build.rankedResult.supportedFactPaths)
    const factIds = (fieldPath: string): string[] => {
      if (!supported.has(fieldPath)) return []
      const fact = build.candidate?.facts.find(
        (candidateFact) => candidateFact.fieldPath === fieldPath,
      )
      return (fact?.citationIds ?? []).filter((id) => citationIds.has(id))
    }
    const titleCitationIds = factIds('/title')
    const summaryCitationIds = factIds('/summary')
    if (
      titleCitationIds.length === 0 ||
      summaryCitationIds.length === 0 ||
      decisions.some(({ link }) =>
        link.citationIds.every((id) => !citationIds.has(id)),
      )
    ) {
      return null
    }
    const changes = (
      await Promise.all(
        decisions.map(({ link }) => loadChanges(ctx, link.recordId)),
      )
    )
      .flat()
      .sort((left, right) => right.createdAt - left.createdAt)
      .slice(0, 20)
    const publicActions = decisions.flatMap(
      ({ projected }) => projected.publicActions,
    )

    return {
      revision: current._id,
      slug: issue.slug,
      placeName: place.name,
      placeSlug: place.slug,
      bodyName: body.name,
      mode: current.mode,
      title: current.payload.title,
      summary: current.payload.summary,
      lifecycleState: current.payload.lifecycleState ?? null,
      nextKnownAction: current.payload.nextKnownAction ?? null,
      topics: current.payload.topics,
      claimCitationIds: {
        title: titleCitationIds,
        summary: summaryCitationIds,
        lifecycleState: factIds('/lifecycleState'),
        nextDescription: factIds('/nextKnownAction/description'),
        nextAt: factIds('/nextKnownAction/at'),
      },
      links: decisions.map(({ link, projected }) => ({
        recordKey: projected.recordKey,
        title: projected.title,
        summary: projected.summary,
        lifecycleState: projected.lifecycleState,
        meetingAt: projected.meetingAt,
        relationship: link.relationship,
        reason: link.reason,
        citationIds: link.citationIds.filter((id) => citationIds.has(id)),
      })),
      factors: factors.map((factor) => ({
        factor: factor.factor,
        level: factor.level,
        rationale: factor.rationale,
        citationIds: factor.citationIds.filter((id) => citationIds.has(id)),
      })),
      publicActions,
      citations,
      versions: versions
        .filter((row) => row.mode !== 'withheld' && row.payload !== null)
        .map((row) => ({
          version: row.version,
          mode: row.mode as 'full' | 'limited',
          reasonCode: row.reasonCode,
          createdAt: row.createdAt,
        })),
      changes,
    }
  },
})

function dedupeCitations(
  values: Array<typeof citation.type>,
): Array<typeof citation.type> {
  return [...new Map(values.map((item) => [item.id, item])).values()]
}

export const backfillCurrentMeetingKeys = internalMutation({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.object({
    continueCursor: v.string(),
    isDone: v.boolean(),
    updated: v.number(),
  }),
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query('decisionRecords')
      .order('asc')
      .paginate(args.paginationOpts)
    let updated = 0
    for (const record of page.page) {
      const current = record.currentPublishedVersionId
        ? await ctx.db.get(record.currentPublishedVersionId)
        : null
      const publication = acceptedCurrentVersion(record, current)
      const body = await ctx.db.get(record.governmentBodyId)
      const meetingAt =
        publication?.payload.kind === 'full'
          ? publication.payload.meetingAt
          : null
      const meetingKey =
        body && meetingAt ? residentMeetingKey(body.slug, meetingAt) : undefined
      if (record.currentMeetingKey !== meetingKey) {
        await ctx.db.patch(record._id, { currentMeetingKey: meetingKey })
        updated += 1
      }
    }
    return {
      continueCursor: page.continueCursor,
      isDone: page.isDone,
      updated,
    }
  },
})
