import { ArrowUpRightIcon, SearchIcon } from 'lucide-react'
import { useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'

import { Button } from '../../components/ui/button'
import { LouisianaRelief } from '../landing/louisiana-relief'
import { evidenceJourneySearch } from '../resident-handoff/navigation'
import { AreaSelector } from './area-selector'
import { useArea } from './area-store'
import { areaName, getActiveDiscoveryFixture } from './contracts'
import type { AreaSlug, HomeScenario } from './contracts'
import {
  ISSUE_FIXTURES,
  UPDATE_FIXTURES,
  UPDATE_REFRESH_FIXTURE,
  UPCOMING_FIXTURES,
} from './fixtures'
import { formatDate } from './format'
import { IssueCard, UpcomingCard } from './issue-card'
import { useRepeatedAnnouncement } from './hooks'
import { toDecisionCard, usePublishedDecisions } from './live-publications'
import type { PublishedDecision } from './live-publications'
import { Notice, SectionFailure, UpdateRow } from './notice'
import { Rail } from './rail'
import { ResultRow } from './result-row'

export function HomePage({ scenario }: { scenario?: HomeScenario }) {
  const area = useArea()
  const activeScenario = getActiveDiscoveryFixture(scenario)
  const fixturesEnabled = activeScenario !== undefined
  const publishedDecisions = usePublishedDecisions(!fixturesEnabled)
  const signedIn = activeScenario === 'signed-in'
  const watching: AreaSlug[] = signedIn
    ? ['lafayette-parish', 'east-baton-rouge-parish']
    : area
      ? [area]
      : []

  const [refreshed, setRefreshed] = useState(false)
  const [refreshAnnouncement, announceRefresh] = useRepeatedAnnouncement(
    'Feed updated from the official record.',
  )
  const onRefresh = () => {
    setRefreshed(true)
    announceRefresh()
  }

  if (watching.length === 0) {
    return (
      <main className="pp-page" id="resident-main">
        <FeedUpdateStatus announcement={refreshAnnouncement} />
        <FirstVisitHero />
        <HomeFeed
          onRefresh={onRefresh}
          refreshed={refreshed}
          scenario={activeScenario}
          fixturesEnabled={fixturesEnabled}
          publishedDecisions={publishedDecisions}
          watching={[]}
        />
      </main>
    )
  }

  return (
    <main className="pp-page" id="resident-main">
      <FeedUpdateStatus announcement={refreshAnnouncement} />
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

      <HomeFeed
        onRefresh={onRefresh}
        refreshed={refreshed}
        scenario={activeScenario}
        fixturesEnabled={fixturesEnabled}
        publishedDecisions={publishedDecisions}
        watching={watching}
      />
    </main>
  )
}

function FeedUpdateStatus({ announcement }: { announcement: string }) {
  return (
    <p aria-live="polite" className="visually-hidden" role="status">
      {announcement}
    </p>
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
          <h1 id="home-title">See how local government is changing.</h1>
        </div>
        <div className="pp-hero-details">
          <p className="pp-hero-lede">
            Public Parish connects Louisiana decisions to the official record,
            public deadlines, and what happens next.
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
              render={<a href="#major-decisions" />}
              size="touch"
              variant="link"
            >
              Browse published records
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
  publishedDecisions,
  refreshed,
  onRefresh,
}: {
  watching: AreaSlug[]
  scenario?: HomeScenario
  fixturesEnabled: boolean
  publishedDecisions: PublishedDecision[] | undefined
  refreshed: boolean
  onRefresh: () => void
}) {
  if (!fixturesEnabled) {
    return (
      <PublishedHomeFeed decisions={publishedDecisions} watching={watching} />
    )
  }

  const degraded = scenario === 'degraded'
  const showUpdateRow = scenario === 'update' && !refreshed

  const updates = refreshed
    ? [UPDATE_REFRESH_FIXTURE, ...UPDATE_FIXTURES]
    : UPDATE_FIXTURES
  const relevantUpdates = updates.filter(
    (entry) =>
      watching.length === 0 ||
      updatePlaces(entry.issueSlug).some((slug) => watching.includes(slug)),
  )

  return (
    <div className="pp-home-feed">
      {showUpdateRow ? <UpdateRow onRefresh={onRefresh} /> : null}
      <MajorDecisionsSection scenario={scenario} watching={watching} />
      <HappeningSoonSection watching={watching} />
      <LatestUpdatesSection
        entries={relevantUpdates}
        evidenceScenario={refreshed ? 'update' : 'preview'}
      />
      {degraded ? (
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

function PublishedHomeFeed({
  decisions,
  watching,
}: {
  decisions: PublishedDecision[] | undefined
  watching: AreaSlug[]
}) {
  const cards = (decisions ?? [])
    .map(toDecisionCard)
    .filter((card): card is NonNullable<typeof card> => card !== null)
    .filter(
      (card) => watching.length === 0 || watching.includes(card.placeSlug),
    )
  const rest = cards.slice(1, 6)

  return (
    <div className="pp-home-feed">
      <section
        aria-labelledby="major-decisions-title"
        className="pp-section"
        id="major-decisions"
      >
        <div className="pp-section-head">
          <h2 id="major-decisions-title">Published decision records</h2>
          <Button
            className="pp-section-link"
            render={<Link to="/explore" />}
            size="touch"
            variant="ghost"
          >
            Explore all
            <ArrowUpRightIcon aria-hidden="true" />
          </Button>
        </div>
        {decisions === undefined ? (
          <div className="pp-empty" role="status">
            <p className="pp-empty-title">Loading published records...</p>
          </div>
        ) : cards.length > 0 ? (
          <>
            <IssueCard issue={cards[0]} variant="lead" />
            {rest.length > 0 ? (
              <Rail ariaLabel="More published decision records">
                {rest.map((card) => (
                  <IssueCard issue={card} key={card.slug} variant="rail" />
                ))}
              </Rail>
            ) : null}
          </>
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
      <VoterStrip />
    </div>
  )
}

function updatePlaces(issueSlug: string | undefined): AreaSlug[] {
  const issue = ISSUE_FIXTURES.find((item) => item.slug === issueSlug)
  return issue ? [issue.placeSlug] : ['lafayette-parish']
}

function MajorDecisionsSection({
  watching,
  scenario,
}: {
  watching: AreaSlug[]
  scenario?: HomeScenario
}) {
  const [recovered, setRecovered] = useState(false)
  const showFailure = scenario === 'section-failure' && !recovered
  const pool =
    watching.length === 0
      ? ISSUE_FIXTURES
      : ISSUE_FIXTURES.filter((issue) => watching.includes(issue.placeSlug))
  const showEmpty = scenario === 'no-issues' || pool.length === 0
  const lead = pool[0]
  const rest = pool.slice(1, watching.length === 0 ? 6 : 5)

  return (
    <section
      aria-labelledby="major-decisions-title"
      className="pp-section"
      id="major-decisions"
    >
      <div className="pp-section-head">
        <h2 id="major-decisions-title">Major local decisions</h2>
        <Button
          className="pp-section-link"
          render={<Link to="/explore" />}
          size="touch"
          variant="ghost"
        >
          Explore all
          <ArrowUpRightIcon aria-hidden="true" />
        </Button>
      </div>

      {showFailure ? (
        <SectionFailure
          label="Major local decisions"
          onRetry={() => setRecovered(true)}
        />
      ) : showEmpty ? (
        <EmptyDecisions watching={watching} />
      ) : (
        <>
          <IssueCard issue={lead} variant="lead" />
          {rest.length > 0 ? (
            <Rail ariaLabel="More major decisions">
              {rest.map((issue) => (
                <IssueCard issue={issue} key={issue.slug} variant="rail" />
              ))}
            </Rail>
          ) : null}
        </>
      )}
    </section>
  )
}

function EmptyDecisions({ watching }: { watching: AreaSlug[] }) {
  const place = watching.length === 1 ? areaName(watching[0]) : 'your area'

  return (
    <div className="pp-empty">
      <p className="pp-empty-title">No current decisions in {place}.</p>
      <p className="pp-empty-text">
        Recent outcomes are below. New decisions appear here when they are
        published.
      </p>
      <Button render={<Link to="/explore" />} size="touch" variant="outline">
        Explore records
      </Button>
      <div className="pp-empty-outcomes">
        <h3>Recent outcomes</h3>
        <div className="pp-row-list">
          <ResultRow
            row={{
              date: '2026-04-21',
              href: '/issues/surplus-pickup-donations',
              kind: 'Decision record',
              place: 'Lafayette Parish',
              state: 'Decided',
              title:
                'Donate a surplus 2016 Crew Cab pickup to Terrebonne Parish',
            }}
          />
          <ResultRow
            row={{
              date: '2026-08-18',
              href: '/issues/downtown-late-night-permits',
              kind: 'Decision record',
              place: 'Lafayette Parish',
              title: 'Later hours for downtown alcohol permits, postponed',
            }}
          />
        </div>
      </div>
    </div>
  )
}

function HappeningSoonSection({ watching }: { watching: AreaSlug[] }) {
  const items = UPCOMING_FIXTURES.filter(
    (item) => watching.length === 0 || watching.includes(item.placeSlug),
  )
  if (items.length === 0) return null

  return (
    <section aria-labelledby="happening-soon-title" className="pp-section">
      <div className="pp-section-head">
        <h2 id="happening-soon-title">Happening soon</h2>
      </div>
      <Rail ariaLabel="Happening soon">
        {items.map((item) => (
          <UpcomingCard item={item} key={item.href} />
        ))}
      </Rail>
    </section>
  )
}

function LatestUpdatesSection({
  entries,
  evidenceScenario,
}: {
  entries: typeof UPDATE_FIXTURES
  evidenceScenario: 'preview' | 'update'
}) {
  const currentHref = useRouterState({
    select: (state) => state.location.href,
  })
  const detailSearch = evidenceJourneySearch({
    currentHref,
    scenario: evidenceScenario,
  })

  return (
    <section aria-labelledby="latest-updates-title" className="pp-section">
      <div className="pp-section-head">
        <h2 id="latest-updates-title">Latest updates</h2>
      </div>
      <ol className="pp-updates">
        {entries.map((entry, index) => (
          <li className="pp-update-entry" key={`${entry.date}-${index}`}>
            <time dateTime={entry.date}>{formatDate(entry.date)}</time>
            <div>
              <p className="pp-update-kind">{entry.kind}</p>
              <p className="pp-update-text">
                {entry.issueSlug ? (
                  <Link
                    search={detailSearch}
                    to={'/issues/' + entry.issueSlug}
                  >
                    {entry.issueTitle}
                  </Link>
                ) : null}
                {entry.issueSlug ? ' — ' : null}
                {entry.text}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
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
