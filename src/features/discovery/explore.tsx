import { SearchIcon, SlidersHorizontalIcon, XIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'

import { Button } from '../../components/ui/button'
import { AreaSelector } from './area-selector'
import {
  DATE_OPTIONS,
  BODY_OPTIONS,
  LIFECYCLE_OPTIONS,
  PLACE_OPTIONS,
  SORT_OPTIONS,
  SOURCE_OPTIONS,
  TOPIC_OPTIONS,
  TYPE_OPTIONS,
  getActiveDiscoveryFixture,
} from './contracts'
import type { ExploreSearch, IssueCardData, ResultRowData } from './contracts'
import { EXPLORE_ROW_FIXTURES, ISSUE_FIXTURES } from './fixtures'
import { getExploreEntries, getExploreViewMode } from './explore-model'
import {
  FilterGroup,
  FilterPill,
  MoreFiltersPanel,
  ShowResultsButton,
} from './filter-pill'
import { IssueCard } from './issue-card'
import { SectionFailure, UpdateRow } from './notice'
import { ResultRow } from './result-row'
import { useMediaQuery, useRepeatedAnnouncement } from './hooks'
import { toDecisionRow, usePublishedDecisions } from './live-publications'
import { Sheet } from './sheet'

export function ExplorePage({ search }: { search: ExploreSearch }) {
  const navigate = useNavigate()
  const desktop = useMediaQuery('(min-width: 64.0625rem)')
  const activeFixture = getActiveDiscoveryFixture(search.fixture)
  const fixturesEnabled = activeFixture !== undefined
  const publishedDecisions = usePublishedDecisions(!fixturesEnabled)
  const publishedRows = useMemo(
    () => (publishedDecisions ?? []).map(toDecisionRow),
    [publishedDecisions],
  )
  const effectiveSearch = useMemo(
    () =>
      activeFixture === search.fixture
        ? search
        : { ...search, fixture: activeFixture },
    [activeFixture, search],
  )

  const [query, setQuery] = useState(search.q ?? '')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [refreshed, setRefreshed] = useState(false)
  const [refreshAnnouncement, announceRefresh] = useRepeatedAnnouncement(
    'Explore results are updated.',
  )
  const [recovered, setRecovered] = useState(false)
  const debounceRef = useRef(0)
  const searchRef = useRef(search)
  searchRef.current = search

  useEffect(() => {
    setQuery(search.q ?? '')
  }, [search.q])

  const patch = (next: Partial<ExploreSearch>) => {
    navigate({
      replace: true,
      search: { ...searchRef.current, ...next },
      to: '/explore',
    })
  }

  const setQueryDebounced = (value: string) => {
    setQuery(value)
    window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      patch({ q: value.trim() || undefined })
    }, 250)
  }

  useEffect(() => () => window.clearTimeout(debounceRef.current), [])

  const activeFilters = [
    search.place,
    search.topic,
    search.date,
    search.body,
    search.lifecycle,
    search.source,
    search.type,
  ].filter(Boolean).length

  const showUpdateRow = activeFixture === 'update' && !refreshed

  const entries = useMemo(
    () =>
      getExploreEntries(
        effectiveSearch,
        fixturesEnabled ? ISSUE_FIXTURES : [],
        fixturesEnabled ? EXPLORE_ROW_FIXTURES : publishedRows,
        { includeUnfiltered: !fixturesEnabled },
      ),
    [effectiveSearch, fixturesEnabled, publishedRows],
  )

  const browse = useMemo(() => {
    if (!fixturesEnabled) {
      return { current: [], outcomes: [], routine: [], upcoming: [] }
    }

    const current = ISSUE_FIXTURES.filter((issue) => issue.state !== 'Decided')
    const upcoming = EXPLORE_ROW_FIXTURES.filter(
      (row) => row.kind === 'Decision record' && row.state === 'Scheduled',
    )
    const outcomes = EXPLORE_ROW_FIXTURES.filter(
      (row) => row.kind === 'Decision record' && row.state === 'Decided',
    )
    const routine = EXPLORE_ROW_FIXTURES.filter(
      (row) => row.kind === 'Routine record',
    )
    return { current, outcomes, routine, upcoming }
  }, [fixturesEnabled])

  const showFailure = activeFixture === 'section-failure' && !recovered
  const viewMode = fixturesEnabled
    ? getExploreViewMode(effectiveSearch, entries.length)
    : entries.length === 0
      ? 'empty'
      : 'results'

  const moreFilters = (
    <MoreFiltersPanel activeCount={activeFilters} onClear={clearAll}>
      <FilterGroup
        allLabel="All bodies"
        label="Body"
        name="filter-body"
        onChange={(value) => patch({ body: value || undefined })}
        options={BODY_OPTIONS}
        value={search.body ?? ''}
      />
      <FilterGroup
        allLabel="All lifecycle states"
        label="Lifecycle"
        name="filter-lifecycle"
        onChange={(value) => patch({ lifecycle: value || undefined })}
        options={LIFECYCLE_OPTIONS}
        value={search.lifecycle ?? ''}
      />
      <FilterGroup
        allLabel="All record types"
        label="Record type"
        name="filter-type"
        onChange={(value) => patch({ type: value || undefined })}
        options={TYPE_OPTIONS}
        value={search.type ?? ''}
      />
      <FilterGroup
        allLabel="All source statuses"
        label="Source status"
        name="filter-source"
        onChange={(value) => patch({ source: value || undefined })}
        options={SOURCE_OPTIONS}
        value={search.source ?? ''}
      />
    </MoreFiltersPanel>
  )

  function clearAll() {
    window.clearTimeout(debounceRef.current)
    patch({
      body: undefined,
      date: undefined,
      lifecycle: undefined,
      place: undefined,
      q: undefined,
      source: undefined,
      topic: undefined,
      type: undefined,
    })
    setQuery('')
    setFiltersOpen(false)
  }

  return (
    <main className="pp-page" id="resident-main">
      <p aria-live="polite" className="visually-hidden" role="status">
        {refreshAnnouncement}
      </p>
      <header className="pp-page-head">
        <h1>Explore</h1>
        <p className="pp-page-lede">
          Search published decision records from the official sources Public
          Parish has checked. <Link to="/issues">Browse issue timelines</Link>{' '}
          to see related decisions together.
        </p>
      </header>

      <form
        onSubmit={(event) => event.preventDefault()}
        role="search"
        className="pp-search"
      >
        <div className="pp-search-field">
          <SearchIcon aria-hidden="true" />
          <input
            aria-label="Search issues and records"
            autoComplete="off"
            onChange={(event) => setQueryDebounced(event.target.value)}
            placeholder="Search issues, decision records, meetings"
            type="search"
            value={query}
          />
          {query ? (
            <Button
              aria-label="Clear search"
              className="pp-search-clear"
              onClick={() => setQueryDebounced('')}
              size="icon"
              variant="ghost"
            >
              <XIcon aria-hidden="true" />
            </Button>
          ) : null}
        </div>
        <Button
          aria-expanded={filtersOpen}
          aria-haspopup={desktop ? undefined : 'dialog'}
          id="explore-more-filters"
          onClick={() => setFiltersOpen((open) => !open)}
          size="touch"
          type="button"
          variant="outline"
        >
          <SlidersHorizontalIcon aria-hidden="true" />
          More filters
          {activeFilters > 0 ? (
            <span className="pp-pill-count">{activeFilters}</span>
          ) : null}
        </Button>
      </form>

      <div className="pp-pill-row">
        <FilterPill
          label="Place"
          onChange={(value) => patch({ place: value || undefined })}
          options={PLACE_OPTIONS}
          value={search.place ?? ''}
        />
        <FilterPill
          label="Topic"
          onChange={(value) => patch({ topic: value || undefined })}
          options={[
            { label: 'All topics', value: '' },
            ...TOPIC_OPTIONS.map((topic) => ({ label: topic, value: topic })),
          ]}
          value={search.topic ?? ''}
        />
        <FilterPill
          label="Date"
          onChange={(value) => patch({ date: value || undefined })}
          options={DATE_OPTIONS.map((option) => ({ ...option }))}
          value={search.date ?? ''}
        />
        {viewMode === 'results' ? (
          <FilterPill
            defaultValue="newest"
            label="Sort"
            onChange={(value) =>
              patch({ sort: (value || 'newest') as 'newest' | 'oldest' })
            }
            options={SORT_OPTIONS}
            value={search.sort ?? 'newest'}
          />
        ) : null}
      </div>

      {desktop && filtersOpen ? (
        <div className="pp-explore-layout">
          <aside aria-label="More filters" className="pp-filter-column">
            {moreFilters}
          </aside>
          <div className="pp-explore-results">{results()}</div>
        </div>
      ) : (
        <div className="pp-explore-results">{results()}</div>
      )}

      <Sheet
        footer={
          <div className="pp-sheet-footer-actions">
            <Button onClick={clearAll} size="touch" variant="ghost">
              Clear
            </Button>
            <ShowResultsButton onClick={() => setFiltersOpen(false)} />
          </div>
        }
        onOpenChange={setFiltersOpen}
        open={filtersOpen && !desktop}
        size="tall"
        title="More filters"
        triggerId="explore-more-filters"
      >
        {moreFilters}
      </Sheet>
    </main>
  )

  function results() {
    if (showFailure) {
      return (
        <SectionFailure label="Results" onRetry={() => setRecovered(true)} />
      )
    }

    if (showUpdateRow) {
      return (
        <>
          <UpdateRow
            label="Explore update"
            onRefresh={() => {
              setRefreshed(true)
              setRecovered(true)
              announceRefresh()
            }}
          />
          {resultsBody()}
        </>
      )
    }

    return resultsBody()
  }

  function resultsBody() {
    if (!fixturesEnabled && publishedDecisions === undefined) {
      return (
        <div className="pp-empty" role="status">
          <p className="pp-empty-title">Loading published records...</p>
        </div>
      )
    }

    if (viewMode === 'empty') {
      if (!fixturesEnabled && publishedRows.length === 0) {
        return (
          <div className="pp-empty">
            <p className="pp-empty-title">
              No published decision records are available yet.
            </p>
            <p className="pp-empty-text">
              Explore lists records after their official evidence passes the
              publication checks.
            </p>
            <Button
              render={<Link to="/coverage" />}
              size="touch"
              variant="outline"
            >
              View coverage
            </Button>
          </div>
        )
      }

      return (
        <div className="pp-empty">
          <p className="pp-empty-title">
            {search.q ? `No results for “${search.q}”.` : 'No results.'}
          </p>
          <p className="pp-empty-text">
            Clear filters to widen the search, or watch a different supported
            area from the header.
          </p>
          <div className="pp-empty-actions">
            <Button onClick={clearAll} size="touch" variant="outline">
              Clear filters
            </Button>
            <AreaSelector
              trigger={(props) => (
                <Button
                  {...props}
                  className="pp-inline-action"
                  size="touch"
                  variant="ghost"
                >
                  Change area
                </Button>
              )}
            />
          </div>
        </div>
      )
    }

    if (viewMode === 'browse') {
      return <BrowseSections browse={browse} />
    }

    return (
      <>
        <p className="pp-result-count" role="status">
          {entries.length} {entries.length === 1 ? 'result' : 'results'}
        </p>
        <div className="pp-result-sequence">
          {entries.map((entry, index) =>
            entry.kind === 'issue' ? (
              <IssueCard issue={entry.issue} key={entry.issue.slug} />
            ) : (
              <ResultRow key={`${entry.row.href}-${index}`} row={entry.row} />
            ),
          )}
        </div>
      </>
    )
  }
}

function BrowseSections({
  browse,
}: {
  browse: {
    current: IssueCardData[]
    outcomes: ResultRowData[]
    routine: ResultRowData[]
    upcoming: ResultRowData[]
  }
}) {
  return (
    <>
      <section aria-labelledby="explore-current-title" className="pp-section">
        <h2 id="explore-current-title">Current issues</h2>
        <div className="pp-card-grid">
          {browse.current.map((issue) => (
            <IssueCard issue={issue} key={issue.slug} />
          ))}
        </div>
      </section>
      <section aria-labelledby="explore-upcoming-title" className="pp-section">
        <h2 id="explore-upcoming-title">Upcoming decisions</h2>
        <div className="pp-row-list">
          {browse.upcoming.map((row, index) => (
            <ResultRow key={`${row.href}-${index}`} row={row} />
          ))}
        </div>
      </section>
      <section aria-labelledby="explore-outcomes-title" className="pp-section">
        <h2 id="explore-outcomes-title">Recent outcomes</h2>
        <div className="pp-row-list">
          {browse.outcomes.map((row, index) => (
            <ResultRow key={`${row.href}-${index}`} row={row} />
          ))}
        </div>
      </section>
      <section aria-labelledby="explore-routine-title" className="pp-section">
        <h2 id="explore-routine-title">Routine records</h2>
        <div className="pp-row-list">
          {browse.routine.map((row, index) => (
            <ResultRow key={`${row.href}-${index}`} row={row} />
          ))}
        </div>
      </section>
    </>
  )
}
