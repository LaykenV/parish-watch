import { paginationOptsValidator, paginationResultValidator } from 'convex/server'
import { v } from 'convex/values'
import type { Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'
import { internalMutation, query } from '../_generated/server'
import { searchEntry } from './searchContracts'
import type { SearchEntry } from './searchContracts'

export async function advanceCorpusRevision(ctx: MutationCtx) {
  const state = await ctx.db.query('publicCorpusState').withIndex('by_key', q => q.eq('key', 'published')).unique()
  if (state) await ctx.db.patch(state._id, { revision: state.revision + 1 })
  else await ctx.db.insert('publicCorpusState', { key: 'published', revision: 1 })
}
async function upsert(ctx: MutationCtx, entry: SearchEntry) {
  const prior = await ctx.db.query('publishedSearchEntries').withIndex('by_key', q => q.eq('key', entry.key)).unique()
  if (prior) await ctx.db.replace(prior._id, entry)
  else await ctx.db.insert('publishedSearchEntries', entry)
}
const lifecycle: Record<string, string> = { proposed: 'Developing', developing: 'Developing', scheduled: 'Scheduled', active: 'In progress', amended: 'In progress', implementing: 'In progress', postponed: 'Postponed', decided: 'Decided', completed: 'Completed', complete: 'Completed', canceled: 'Canceled' }
export async function indexDecision(ctx: MutationCtx, recordId: Id<'decisionRecords'>) {
  const record = await ctx.db.get(recordId)
  const version = record?.currentPublishedVersionId ? await ctx.db.get(record.currentPublishedVersionId) : null
  const body = record ? await ctx.db.get(record.governmentBodyId) : null
  const place = body ? await ctx.db.get(body.jurisdictionId) : null
  if (!record || !version?.payload || version.mode === 'withheld' || !body || !place) return
  const payload = version.payload
  const citations = await ctx.db.query('citations').withIndex('by_publication_and_field_path', q => q.eq('publicationVersionId', version._id)).take(101)
  if (citations.length > 100) throw new Error('search_citation_capacity')
  const date = payload.kind === 'full' ? payload.meetingAt : null
  const base = { revision: version._id, bodyName: body.name, placeName: place.name, placeSlug: place.slug, mode: payload.kind, lifecycle: payload.kind === 'full' ? lifecycle[payload.lifecycleState] ?? 'Status not stated' : 'Status not stated', topics: [], date, dateAt: date ? Date.parse(date) : 0, checkedAt: payload.source.retrievedAt }
  const summary = payload.kind === 'full' ? payload.plainLanguageSummary : ''
  await upsert(ctx, { ...base, key: record.recordKey, kind: 'decision', href: `/decisions/${encodeURIComponent(record.recordKey)}`, title: payload.title, summary, searchText: [record.sourceRecordId, payload.title, summary, body.name, place.name, ...citations.map(c => c.excerpt)].join('\n') })
  if (record.currentMeetingKey && date) await upsert(ctx, { ...base, key: `meeting:${record.currentMeetingKey}`, kind: 'meeting', href: `/meetings/${encodeURIComponent(record.currentMeetingKey)}`, title: `${body.name}, ${date.slice(0, 10)}`, summary: 'Published decisions from this meeting.', searchText: `${body.name} ${place.name} ${date}` })
  await upsert(ctx, { ...base, date: null, dateAt: 0, key: `body:${body.slug}`, kind: 'body', href: `/explore?body=${encodeURIComponent(body.name)}`, title: body.name, summary: 'Browse this body\'s published decisions.', searchText: `${body.name} ${place.name}` })
  await advanceCorpusRevision(ctx)
}
export async function indexIssue(ctx: MutationCtx, issueId: Id<'issues'>) {
  const issue = await ctx.db.get(issueId)
  const version = issue?.currentVersionId ? await ctx.db.get(issue.currentVersionId) : null
  const body = issue ? await ctx.db.get(issue.governmentBodyId) : null
  const place = body ? await ctx.db.get(body.jurisdictionId) : null
  if (!issue || !version?.payload || version.mode === 'withheld' || !body || !place) return
  const payload = version.payload
  const date = payload.nextKnownAction?.at ?? null
  await upsert(ctx, { key: `issue:${issue.slug}`, revision: version._id, kind: 'issue', href: `/issues/${encodeURIComponent(issue.slug)}`, title: payload.title, summary: payload.summary, bodyName: body.name, placeName: place.name, placeSlug: place.slug, mode: payload.kind, lifecycle: lifecycle[payload.lifecycleState ?? 'unknown'] ?? 'Status not stated', topics: payload.topics, date, dateAt: date ? Date.parse(date) : 0, checkedAt: version.createdAt, searchText: [payload.title, payload.summary, body.name, place.name, ...payload.topics].join('\n') })
  await advanceCorpusRevision(ctx)
}
export const search = query({
  args: { paginationOpts: paginationOptsValidator, q: v.optional(v.string()), kind: v.optional(v.union(v.literal('decision'), v.literal('issue'), v.literal('meeting'), v.literal('body'))), place: v.optional(v.string()), body: v.optional(v.string()), lifecycle: v.optional(v.string()), source: v.optional(v.string()), topic: v.optional(v.string()), date: v.optional(v.string()), sort: v.optional(v.union(v.literal('newest'), v.literal('oldest'))) },
  returns: paginationResultValidator(searchEntry),
  handler: async (ctx, args) => {
    if ((args.q?.length ?? 0) > 300 || args.paginationOpts.numItems > 50) throw new Error('Search request exceeds its bounds.')
    const needle = args.q?.trim()
    const now = Date.now()
    const day = 86_400_000
    const lowerDate = args.date === 'next-30' ? now : args.date === 'past-30' ? now - 30 * day : args.date === 'past-year' ? now - 365 * day : undefined
    const upperDate = args.date === 'next-30' ? now + 30 * day : lowerDate !== undefined ? now : undefined
    const sourceMode = args.source === 'Evidence available' ? 'full' : args.source === 'Limited information' ? 'limited' : undefined
    let rows = needle ? ctx.db.query('publishedSearchEntries').withSearchIndex('search_text', q => {
      let search = q.search('searchText', needle)
      if (args.kind) search = search.eq('kind', args.kind)
      if (args.place) search = search.eq('placeName', args.place)
      if (args.body) search = search.eq('bodyName', args.body)
      if (args.lifecycle) search = search.eq('lifecycle', args.lifecycle)
      if (sourceMode) search = search.eq('mode', sourceMode)
      return search
    }) : ctx.db.query('publishedSearchEntries').withIndex('by_date', q => lowerDate !== undefined && upperDate !== undefined ? q.gte('dateAt', lowerDate).lte('dateAt', upperDate) : q).order(args.sort === 'oldest' ? 'asc' : 'desc')
    if (!needle) {
      if (args.kind) rows = rows.filter(q => q.eq(q.field('kind'), args.kind))
      if (args.place) rows = rows.filter(q => q.eq(q.field('placeName'), args.place))
      if (args.body) rows = rows.filter(q => q.eq(q.field('bodyName'), args.body))
      if (args.lifecycle) rows = rows.filter(q => q.eq(q.field('lifecycle'), args.lifecycle))
      if (sourceMode) rows = rows.filter(q => q.eq(q.field('mode'), sourceMode))
    } else if (lowerDate !== undefined && upperDate !== undefined) rows = rows.filter(q => q.and(q.gte(q.field('dateAt'), lowerDate), q.lte(q.field('dateAt'), upperDate)))
    const records = await rows.paginate({ ...args.paginationOpts, maximumRowsRead: 1_000 })
    const currentRows = []
    for (const row of records.page) {
      if (row.kind === 'issue') {
        const issue = await ctx.db.query('issues').withIndex('by_slug', q => q.eq('slug', row.key.slice('issue:'.length))).unique()
        if (!issue?.currentVersionId || issue.currentVersionId !== row.revision) continue
        const links = await ctx.db.query('issueDecisionLinks').withIndex('by_issue_version', q => q.eq('issueVersionId', issue.currentVersionId!)).take(201)
        if (links.length > 200) continue
        let current = true
        for (const link of links) if ((await ctx.db.get(link.recordId))?.currentPublishedVersionId !== link.publicationVersionId) current = false
        if (!current) continue
      } else {
        const versionId = ctx.db.normalizeId('publicationVersions', row.revision)
        const version = versionId ? await ctx.db.get(versionId) : null
        const record = version ? await ctx.db.get(version.recordId) : null
        if (!version?.payload || version.mode === 'withheld' || record?.currentPublishedVersionId !== version._id) continue
      }
      currentRows.push(row)
    }
    return { ...records, page: currentRows.filter(row => {
      if (args.kind && row.kind !== args.kind) return false
      if (args.place && row.placeName !== args.place) return false
      if (args.body && row.bodyName !== args.body) return false
      if (args.lifecycle && row.lifecycle !== args.lifecycle) return false
      if (args.source && (row.mode === 'full' ? 'Evidence available' : 'Limited information') !== args.source) return false
      if (args.topic && !row.topics.includes(args.topic)) return false
      if (args.date === 'next-30' && !(row.dateAt > now && row.dateAt <= now + 30 * day)) return false
      if (args.date === 'past-30' && !(row.dateAt >= now - 30 * day && row.dateAt <= now)) return false
      if (args.date === 'past-year' && !(row.dateAt >= now - 365 * day && row.dateAt <= now)) return false
      return true
    }).map(({ _id, _creationTime, ...entry }) => entry) }
  },
})
export const backfill = internalMutation({
  args: { kind: v.union(v.literal('decision'), v.literal('issue')), paginationOpts: paginationOptsValidator }, returns: v.object({ isDone: v.boolean(), continueCursor: v.string(), indexed: v.number() }),
  handler: async (ctx, args) => {
    if (args.paginationOpts.numItems > 25) throw new Error('Use backfill batches of at most 25.')
    if (args.kind === 'decision') {
      const page = await ctx.db.query('decisionRecords').paginate(args.paginationOpts)
      for (const record of page.page) await indexDecision(ctx, record._id)
      return { isDone: page.isDone, continueCursor: page.continueCursor, indexed: page.page.length }
    }
    const page = await ctx.db.query('issues').paginate(args.paginationOpts)
    for (const issue of page.page) await indexIssue(ctx, issue._id)
    return { isDone: page.isDone, continueCursor: page.continueCursor, indexed: page.page.length }
  },
})
