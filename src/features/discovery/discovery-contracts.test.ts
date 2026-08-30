import { describe, expect, it } from 'vitest'

import { getActiveDiscoveryFixture, parseExploreSearch } from './contracts'
import {
  compareExploreDates,
  getExploreEntries,
  getExploreViewMode,
} from './explore-model'
import { EXPLORE_ROW_FIXTURES, ISSUE_FIXTURES } from './fixtures'

describe('resident interface Slice 2 discovery contracts', () => {
  it('requires an explicit scenario before development fixtures can render', () => {
    expect(getActiveDiscoveryFixture(undefined)).toBeUndefined()
    expect(getActiveDiscoveryFixture('update')).toBe('update')
  })

  it('drops URL filter values that the interface cannot display', () => {
    expect(
      parseExploreSearch({
        body: 'Invented board',
        lifecycle: 'Secret state',
        place: 'Unknown Parish',
        q: ' drainage ',
        source: 'Trust me',
        topic: 'Politics',
        type: 'article',
      }),
    ).toEqual({ q: 'drainage' })
  })

  it('restores valid URL filters', () => {
    expect(
      parseExploreSearch({
        body: 'Lafayette City Council',
        date: 'next-30',
        lifecycle: 'Scheduled',
        place: 'Lafayette Parish',
        sort: 'oldest',
        source: 'Evidence available',
        topic: 'Public money',
        type: 'issue',
      }),
    ).toEqual({
      body: 'Lafayette City Council',
      date: 'next-30',
      lifecycle: 'Scheduled',
      place: 'Lafayette Parish',
      sort: 'oldest',
      source: 'Evidence available',
      topic: 'Public money',
      type: 'issue',
    })
  })

  it('shows the forced no-results state before the default browse view', () => {
    expect(getExploreViewMode({ fixture: 'no-results' }, 0)).toBe('empty')
    expect(getExploreViewMode({}, 0)).toBe('browse')
    expect(getExploreViewMode({ sort: 'oldest' }, 0)).toBe('browse')
  })

  it('sorts dated results in the requested direction and leaves undated rows last', () => {
    expect(compareExploreDates('2026-04-21', '2026-09-15', 'newest')).toBe(1)
    expect(compareExploreDates('2026-04-21', '2026-09-15', 'oldest')).toBe(-1)
    expect(compareExploreDates(undefined, '2026-09-15', 'newest')).toBe(1)
  })

  it('does not leak unclassified rows through topic or source filters', () => {
    const topicEntries = getExploreEntries(
      { topic: 'Public money' },
      ISSUE_FIXTURES,
      EXPLORE_ROW_FIXTURES,
    )
    const sourceEntries = getExploreEntries(
      { source: 'Evidence available' },
      ISSUE_FIXTURES,
      EXPLORE_ROW_FIXTURES,
    )

    expect(topicEntries.length).toBeGreaterThan(0)
    expect(sourceEntries.length).toBeGreaterThan(0)
    expect(topicEntries.every((entry) => entry.kind === 'issue')).toBe(true)
    expect(sourceEntries.every((entry) => entry.kind === 'issue')).toBe(true)
    expect(
      topicEntries.every(
        (entry) =>
          entry.kind === 'issue' && entry.issue.topics.includes('Public money'),
      ),
    ).toBe(true)
    expect(
      sourceEntries.every(
        (entry) =>
          entry.kind === 'issue' &&
          entry.issue.evidence.status === 'Evidence available',
      ),
    ).toBe(true)
  })
})
