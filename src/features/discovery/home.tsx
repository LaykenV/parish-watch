import { ArrowUpRightIcon, SearchIcon } from 'lucide-react'
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useConvexAuth } from '@convex-dev/auth/react'

import { Button } from '../../components/ui/button'
import { LouisianaRelief } from '../landing/louisiana-relief'
import { AreaSelector } from './area-selector'
import { useArea } from './area-store'
import { areaName, getActiveDiscoveryFixture } from './contracts'
import type {
  AreaSlug,
  HomeScenario,
  IssueCardData,
  ResultRowData,
} from './contracts'
import { EXPLORE_ROW_FIXTURES, PUBLISHED_ISSUE_FIXTURES } from './fixtures'
import { useRepeatedAnnouncement } from './hooks'
import { IssueCard } from './issue-card'
import { useSavedSetup } from '../following/live-saved-setup'
import {
  toDecisionRow,
  toIssueCard,
  usePublishedDecisions,
  usePublishedIssues,
} from './live-publications'
import type { PublishedDecision, PublishedIssue } from './live-publications'
import { Notice, SectionFailure, UpdateRow } from './notice'
import { ResultRow } from './result-row'

const HOME_SECTION_LIMIT = 6

export function HomePage({ scenario }: { scenario?: HomeScenario }) {
  const area = useArea()
  const activeScenario = getActiveDiscoveryFixture(scenario)
  const fixturesEnabled = activeScenario !== undefined
  const auth = useConvexAuth()
  const savedSetup = useSavedSetup(!fixturesEnabled && auth.isAuthenticated)
  const publishedIssues = usePublishedIssues(!fixturesEnabled)
  const publishedDecisions = usePublishedDecisions(!fixturesEnabled)
  const watching: AreaSlug[] =
    activeScenario === 'signed-in'
      ? ['lafayette-parish', 'east-baton-rouge-parish']
      : auth.isAuthenticated && savedSetup?.areas.length
        ? savedSetup.areas
        : area
          ? [area]
          : []

  const [refreshed, setRefreshed] = useState(false)
  const [refreshAnnouncement, announceRefresh] = useRepeatedAnnouncement(
    'Home updated from the official record.',
  )

  return (
    <main className="pp-page" id="resident-main">
      <p aria-live="polite" className="visually-hidden" role="status">
        {refreshAnnouncement}
      </p>
      {watching.length === 0 ? (
        <FirstVisitHero />
      ) : (
        <WatchingHeader watching={watching} />
      )}
      <HomeFeed
        fixturesEnabled={fixturesEnabled}
        onRefresh={() => {
          setRefreshed(true)
          announceRefresh()
        }}
        publishedDecisions={publishedDecisions}
        publishedIssues={publishedIssues}
        refreshed={refreshed}
        scenario={activeScenario}
        watching={watching}
      />
    </main>
  )
}

function WatchingHeader({ watching }: { watching: AreaSlug[] }) {
  return (
    <header className="pp-watching">
      <div className="pp-watching-copy">
        <h1 className="pp-watching-title">
          <span>Watching</span>{' '}
          {watching.length === 1
            ? areaName(watching[0])
            : `${watching.length} areas`}
        </h1>
        {watching.length > 1 ? (
          <ul className="pp-watching-areas">
            {watching.map((slug) => (
              <li key={slug}>{areaName(slug)}</li>
            ))}
          </ul>
        ) : null}
      </div>
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
    </header>
  )
}

function FirstVisitHero() {
  return (
    <section className="pp-hero" data-relief-interaction>
      <div className="pp-hero-grid">
        <div className="pp-hero-intro">
          <p className="pp-hero-kicker">
            Louisiana local decisions, with receipts.
          </p>
          <h1 id="home-title">Follow the local issues taking shape.</h1>
        </div>
        <div className="pp-hero-details">
          <p className="pp-hero-lede">
            Public Parish connects related government decisions into issue
            timelines, with the official evidence beside every published fact.
          </p>
          <div className="pp-hero-actions">
            <AreaSelector
              trigger={(props) => (
                <button {...props} className="pp-area-field" type="button">
                  <SearchIcon
                    aria-hidden="true"
                    className="pp-area-field-icon"
                  />
                  <span className="pp-area-field-label">
                    Choose a parish or city
                  </span>
                </button>
              )}
            />
            <Button
              className="pp-hero-skip"
              render={<a href="#current-issues" />}
              size="touch"
              variant="link"
            >
              Browse current issues
            </Button>
            <p className="pp-hero-note">
              Free. Open source. No account needed to read.
            </p>
          </div>
        </div>
        <div className="pp-hero-relief">
          <LouisianaRelief />
        </div>
      </div>
    </section>
  )
}

function HomeFeed({
  watching,
  scenario,
  fixturesEnabled,
  publishedIssues,
  publishedDecisions,
  refreshed,
  onRefresh,
}: {
  watching: AreaSlug[]
  scenario?: HomeScenario
  fixturesEnabled: boolean
  publishedIssues: PublishedIssue[] | undefined
  publishedDecisions: PublishedDecision[] | undefined
  refreshed: boolean
  onRefresh: () => void
}) {
  const fixtureIssues = scenario === 'no-issues' ? [] : PUBLISHED_ISSUE_FIXTURES
  const issues = fixturesEnabled
    ? filterIssues(fixtureIssues, watching)
    : filterIssues(
        (publishedIssues ?? [])
          .map(toIssueCard)
          .filter((issue): issue is IssueCardData => issue !== null),
        watching,
      )
  const decisionRows = fixturesEnabled
    ? filterFixtureRows(
        EXPLORE_ROW_FIXTURES.filter((row) => row.kind === 'Decision record'),
        watching,
      )
    : (publishedDecisions ?? [])
        .filter((decision) => isWatched(decision.placeSlug, watching))
        .map(toDecisionRow)
  const loading =
    !fixturesEnabled &&
    (publishedIssues === undefined || publishedDecisions === undefined)
  const showUpdateRow = scenario === 'update' && !refreshed

  return (
    <div className="pp-home-feed">
      {showUpdateRow ? <UpdateRow onRefresh={onRefresh} /> : null}
      <IssuesSection
        issues={issues}
        loading={loading}
        scenario={scenario}
        watching={watching}
      />
      <DecisionRecordsSection loading={loading} rows={decisionRows} />
      {scenario === 'degraded' ? (
        <Notice
          action={
            <Button
              render={<Link to="/coverage" />}
              size="touch"
              variant="outline"
            >
              View coverage
            </Button>
          }
          title="Source delayed"
          tone="warning"
        >
          <p>
            Agenda packets from the Lafayette City-Parish Council are posting
            late. Public Parish last checked Aug 27. Decisions since Aug 1 may
            be missing.
          </p>
        </Notice>
      ) : null}
      <VoterStrip />
    </div>
  )
}

function IssuesSection({
  issues,
  loading,
  scenario,
  watching,
}: {
  issues: IssueCardData[]
  loading: boolean
  scenario?: HomeScenario
  watching: AreaSlug[]
}) {
  const [recovered, setRecovered] = useState(false)
  const showFailure = scenario === 'section-failure' && !recovered
  const title =
    watching.length === 1
      ? `Issues in ${areaName(watching[0])}`
      : watching.length > 1
        ? 'Issues in your saved areas'
        : 'Issues across launch areas'

  return (
    <section
      aria-labelledby="current-issues-title"
      className="pp-section pp-home-issues"
      id="current-issues"
    >
      <div className="pp-section-head">
        <div>
          <p className="pp-section-kicker">Connected decisions</p>
          <h2 id="current-issues-title">{title}</h2>
        </div>
        <Button
          className="pp-section-link"
          render={<Link to="/explore" search={{ type: 'issue' }} />}
          size="touch"
          variant="ghost"
        >
          Search issues
          <ArrowUpRightIcon aria-hidden="true" />
        </Button>
      </div>
      <p className="pp-section-copy">
        Each timeline connects related government actions without replacing the
        individual official records.
      </p>
      {showFailure ? (
        <SectionFailure
          label="Issue timelines"
          onRetry={() => setRecovered(true)}
        />
      ) : loading ? (
        <div className="pp-empty" role="status">
          <p className="pp-empty-title">Loading published issues...</p>
        </div>
      ) : issues.length > 0 ? (
        <div className="pp-card-grid">
          {issues.slice(0, HOME_SECTION_LIMIT).map((issue) => (
            <IssueCard issue={issue} key={issue.slug} />
          ))}
        </div>
      ) : (
        <EmptyIssues watching={watching} />
      )}
    </section>
  )
}

function EmptyIssues({ watching }: { watching: AreaSlug[] }) {
  const place = watching.length === 1 ? ` for ${areaName(watching[0])}` : ''
  return (
    <div className="pp-empty">
      <p className="pp-empty-title">
        No published issue timeline is available{place} yet.
      </p>
      <p className="pp-empty-text">
        Individual decision records appear below. Public Parish connects them
        only after the relationship and citations pass review.
      </p>
      <Button
        render={<Link to="/explore" search={{ type: 'issue' }} />}
        size="touch"
        variant="outline"
      >
        Search all issues
      </Button>
    </div>
  )
}

function DecisionRecordsSection({
  loading,
  rows,
}: {
  loading: boolean
  rows: ResultRowData[]
}) {
  return (
    <section aria-labelledby="decision-records-title" className="pp-section">
      <div className="pp-section-head">
        <div>
          <p className="pp-section-kicker">The official actions underneath</p>
          <h2 id="decision-records-title">Latest decision records</h2>
        </div>
        <Button
          className="pp-section-link"
          render={<Link to="/explore" search={{ type: 'decision' }} />}
          size="touch"
          variant="ghost"
        >
          Explore records
          <ArrowUpRightIcon aria-hidden="true" />
        </Button>
      </div>
      <p className="pp-section-copy">
        These are the atomic government actions preserved from agendas, minutes,
        and other official sources.
      </p>
      {loading ? (
        <div className="pp-empty" role="status">
          <p className="pp-empty-title">Loading decision records...</p>
        </div>
      ) : rows.length > 0 ? (
        <div className="pp-row-list">
          {rows.slice(0, HOME_SECTION_LIMIT).map((row, index) => (
            <ResultRow key={`${row.href}-${index}`} row={row} />
          ))}
        </div>
      ) : (
        <div className="pp-empty">
          <p className="pp-empty-title">
            No published decision records are available for this area.
          </p>
          <p className="pp-empty-text">
            New records appear after their official evidence passes the
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
      )}
    </section>
  )
}

function filterIssues(issues: IssueCardData[], watching: AreaSlug[]) {
  return issues.filter(
    (issue) => watching.length === 0 || watching.includes(issue.placeSlug),
  )
}

function isWatched(placeSlug: string, watching: AreaSlug[]) {
  return watching.length === 0 || watching.some((slug) => slug === placeSlug)
}

// Fixture rows carry no place slug, so dev-only scenarios match on the name.
function filterFixtureRows(rows: ResultRowData[], watching: AreaSlug[]) {
  const names = watching.map(areaName)
  return rows.filter(
    (row) => names.length === 0 || (row.place && names.includes(row.place)),
  )
}

function VoterStrip() {
  return (
    <aside aria-label="Voter information" className="pp-voter">
      <p className="pp-voter-date">
        Next statewide election <strong>Nov 3, 2026</strong>
      </p>
      <p className="pp-voter-text">
        Registration status and sample ballots are available at the{' '}
        <a
          href="https://voterportal.sos.la.gov"
          rel="noreferrer"
          target="_blank"
        >
          Louisiana Secretary of State voter portal
        </a>
        .
      </p>
      <p className="pp-voter-note">
        Public Parish does not run elections and does not cover candidates.
        Election date checked against the Secretary of State calendar on Aug 29,
        2026.
      </p>
    </aside>
  )
}
