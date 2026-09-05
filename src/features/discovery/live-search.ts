import { usePaginatedQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { SearchEntry } from '../../../convex/resident/searchContracts'
import type { ExploreSearch, IssueCardData, LifecycleState } from './contracts'
import type { ExploreEntry } from './explore-model'

export function usePublishedSearch(enabled: boolean, search: ExploreSearch) {
  return usePaginatedQuery(api.resident.search.search, enabled ? {
    q: search.q, kind: search.type === 'decision' || search.type === 'issue' || search.type === 'meeting' || search.type === 'body' ? search.type : undefined, place: search.place, body: search.body,
    lifecycle: search.lifecycle, source: search.source, topic: search.topic, date: search.date, sort: search.sort,
  } : 'skip', { initialNumItems: 25 })
}
export function toSearchEntry(row: SearchEntry): ExploreEntry {
  const state = row.lifecycle as LifecycleState
  if (row.kind === 'issue') {
    const issue: IssueCardData = {
      slug: row.key.slice('issue:'.length), href: row.href, title: row.title, whyMatter: row.summary,
      body: row.bodyName, place: row.placeName, placeSlug: row.placeSlug as IssueCardData['placeSlug'], state, topics: row.topics,
      evidence: { status: row.mode === 'full' ? 'Evidence available' : 'Limited information', checked: new Date(row.checkedAt).toISOString() },
      nextDate: row.date ? { date: row.date, label: 'Next known action' } : undefined,
    }
    return { kind: 'issue', date: row.date ?? undefined, issue }
  }
  const kind = row.kind === 'decision' ? 'Decision record' : row.kind === 'meeting' ? 'Meeting' : 'Government body'
  return { kind, date: row.date ?? undefined, row: { kind, href: row.href, title: row.title, body: row.bodyName, place: row.placeName, state: row.kind === 'decision' ? state : undefined, date: row.date ?? undefined, sourceStatus: row.kind === 'decision' ? row.mode === 'full' ? 'Evidence available' : 'Limited information' : undefined } }
}
