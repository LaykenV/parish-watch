import type { ExploreSearch, IssueCardData, ResultRowData } from './contracts'
import { FIXTURE_TODAY } from './fixtures'

export type ExploreEntry =
  | { date: string | undefined; kind: 'issue'; issue: IssueCardData }
  | {
      date: string | undefined
      kind: ResultRowData['kind']
      row: ResultRowData
    }

export type ExploreViewMode = 'browse' | 'empty' | 'results'

export function hasExploreResultsView(search: ExploreSearch): boolean {
  return Boolean(
    search.q ||
    search.place ||
    search.topic ||
    search.date ||
    search.body ||
    search.lifecycle ||
    search.source ||
    search.type,
  )
}

export function getExploreViewMode(
  search: ExploreSearch,
  entryCount: number,
): ExploreViewMode {
  if (search.fixture === 'no-results') return 'empty'
  if (!hasExploreResultsView(search)) return 'browse'
  return entryCount === 0 ? 'empty' : 'results'
}

export function getExploreEntries(
  search: ExploreSearch,
  issues: readonly IssueCardData[],
  rows: readonly ResultRowData[],
): ExploreEntry[] {
  if (!hasExploreResultsView(search)) return []

  const query = (search.q ?? '').toLowerCase()
  const matches = (text: string | undefined) =>
    Boolean(text && text.toLowerCase().includes(query))

  const issuePasses = (issue: IssueCardData) => {
    if (search.type === 'decision' || search.type === 'meeting') return false
    if (search.place && issue.place !== search.place) return false
    if (search.topic && !issue.topics.includes(search.topic)) return false
    if (search.body && issue.body !== search.body) return false
    if (search.lifecycle && issue.state !== search.lifecycle) return false
    if (search.source && issue.evidence.status !== search.source) return false
    if (
      search.date &&
      !inDateRange(
        issue.nextDate?.date ?? issue.latestOutcome?.date,
        search.date,
      )
    ) {
      return false
    }
    if (
      query &&
      !matches(issue.title) &&
      !matches(issue.body) &&
      !matches(issue.place) &&
      !issue.topics.some(matches)
    ) {
      return false
    }
    return true
  }

  const rowPasses = (row: ResultRowData) => {
    if (search.type === 'issue') return false
    if (search.type === 'decision' && row.kind !== 'Decision record') {
      return false
    }
    if (search.type === 'meeting' && row.kind !== 'Meeting') return false
    if (search.topic || search.source) return false
    if (search.place && row.place !== search.place) return false
    if (search.body && row.body !== search.body) return false
    if (search.lifecycle && row.state !== search.lifecycle) return false
    if (search.date && !inDateRange(row.date, search.date)) return false
    if (
      query &&
      !matches(row.title) &&
      !matches(row.body) &&
      !matches(row.place) &&
      !matches(row.id)
    ) {
      return false
    }
    return true
  }

  const entries: ExploreEntry[] = []
  for (const issue of issues) {
    if (issuePasses(issue)) {
      entries.push({
        date: issue.nextDate?.date ?? issue.latestOutcome?.date,
        issue,
        kind: 'issue',
      })
    }
  }
  for (const row of rows) {
    if (rowPasses(row)) {
      entries.push({ date: row.date, kind: row.kind, row })
    }
  }

  return entries.sort((left, right) =>
    compareExploreDates(left.date, right.date, search.sort ?? 'newest'),
  )
}

export function compareExploreDates(
  left: string | undefined,
  right: string | undefined,
  sort: 'newest' | 'oldest',
): number {
  if (left === right) return 0
  if (!left) return 1
  if (!right) return -1
  return left.localeCompare(right) * (sort === 'oldest' ? 1 : -1)
}

export function inDateRange(date: string | undefined, range: string): boolean {
  if (!date) return false
  const value = date.slice(0, 10)
  const now = FIXTURE_TODAY
  const plus30 = '2026-09-28'
  const minus30 = '2026-07-30'
  const minus365 = '2025-08-29'
  if (range === 'next-30') return value > now && value <= plus30
  if (range === 'past-30') return value >= minus30 && value <= now
  if (range === 'past-year') return value >= minus365 && value <= now
  return true
}
