import { MapPinIcon, SearchIcon } from 'lucide-react'
import { useState } from 'react'
import { Link } from '@tanstack/react-router'

import { Button } from '../../components/ui/button'
import { AreaSelector } from './area-selector'
import { useArea } from './area-store'
import { areaName, getActiveDiscoveryFixture } from './contracts'
import type { AreaSlug, ForYouScenario, IssueCardData } from './contracts'
import { ISSUE_FIXTURES } from './fixtures'
import { IssueCard } from './issue-card'
import { Notice, SectionFailure, UpdateRow } from './notice'

const REASONS: Record<string, string> = {
  'br-short-term-rental-rules': 'In East Baton Rouge Parish · Saved area',
  'courthouse-security-contract': 'In Lafayette Parish · New this week',
  'curbside-recycling-contract': 'In Lafayette Parish · Agenda posted Sep 8',
  'downtown-late-night-permits': 'In Lafayette Parish · Postponed Aug 18',
  'drainage-fee-credit-cap': 'In Lafayette Parish · Vote coming up Sep 15',
  'short-term-rental-rules': 'In East Baton Rouge Parish · Saved area',
  'surplus-pickup-donations': 'In Lafayette Parish · Outcome posted Apr 21',
  'water-meter-replacement': 'In East Baton Rouge Parish · Final vote Sep 9',
}

export function ForYouPage({ scenario }: { scenario?: ForYouScenario }) {
  const area = useArea()
  const activeScenario = getActiveDiscoveryFixture(scenario)
  const fixturesEnabled = activeScenario !== undefined
  const signedIn = activeScenario === 'signed-in'
  const forcedNoArea = activeScenario === 'no-area'
  const watching: AreaSlug[] = signedIn
    ? ['lafayette-parish', 'east-baton-rouge-parish']
    : area && !forcedNoArea
      ? [area]
      : activeScenario === 'no-matches'
        ? ['lafayette-parish']
        : []

  const [refreshed, setRefreshed] = useState(false)
  const [recovered, setRecovered] = useState(false)
  const showUpdateRow = activeScenario === 'update' && !refreshed && !recovered
  const showFailure = activeScenario === 'section-failure' && !recovered

  let feed: IssueCardData[] = fixturesEnabled
    ? ISSUE_FIXTURES.filter((issue) => watching.includes(issue.placeSlug))
    : []
  if (signedIn) {
    feed = fixturesEnabled
      ? ISSUE_FIXTURES.filter(
          (issue) => issue.slug !== 'courthouse-security-contract',
        )
      : []
  }
  if (refreshed || recovered) {
    feed = feed.filter((issue) => issue.slug !== 'downtown-late-night-permits')
  }
  if (activeScenario === 'no-matches') {
    feed = []
  }

  return (
    <main className="pp-page" id="resident-main">
      <header className="pp-page-head">
        <h1>For You</h1>
        <p className="pp-page-lede">
          One feed of local decisions, ordered by what is happening next. Each
          item says why it appears.
        </p>
      </header>

      {watching.length === 0 ? (
        <ForYouSetup showPreview={fixturesEnabled} />
      ) : (
        <>
          <div className="pp-foryou-bar">
            <ul className="pp-area-chips">
              {watching.map((slug) => (
                <li key={slug}>
                  <MapPinIcon aria-hidden="true" />
                  {areaName(slug)}
                </li>
              ))}
            </ul>
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
            <Button
              className="pp-inline-action"
              render={<Link to="/following/areas-and-topics" />}
              size="touch"
              variant="ghost"
            >
              Edit saved interests
            </Button>
          </div>

          {activeScenario === 'degraded' ? (
            <Notice title="Source delayed" tone="warning">
              <p>
                Agenda packets from the Lafayette City-Parish Council are
                posting late. Dated matches stay below. Decisions since Aug 1
                may be missing.
              </p>
            </Notice>
          ) : null}

          {showUpdateRow ? (
            <UpdateRow
              onRefresh={() => {
                setRefreshed(true)
                setRecovered(true)
              }}
            />
          ) : null}

          {showFailure ? (
            <SectionFailure
              label="Your feed"
              onRetry={() => setRecovered(true)}
            />
          ) : feed.length > 0 ? (
            <div className="pp-foryou-feed">
              {feed.map((issue) => (
                <IssueCard
                  issue={issue}
                  key={issue.slug}
                  reason={REASONS[issue.slug]}
                />
              ))}
            </div>
          ) : (
            <div className="pp-empty">
              <p className="pp-empty-title">
                No matches for your saved interests yet.
              </p>
              <p className="pp-empty-text">
                You can widen your interests or browse major decisions across
                launch areas.
              </p>
              <div className="pp-empty-actions">
                <Button
                  render={<Link to="/following/areas-and-topics" />}
                  size="touch"
                  variant="outline"
                >
                  Edit saved interests
                </Button>
                <Button
                  render={<Link to="/explore" />}
                  size="touch"
                  variant="ghost"
                >
                  Browse major decisions
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  )
}

function ForYouSetup({ showPreview }: { showPreview: boolean }) {
  const preview = ISSUE_FIXTURES.slice(0, 3)

  return (
    <section aria-label="Choose your area" className="pp-setup">
      <p className="pp-setup-title">
        Choose where you want to see decisions from.
      </p>
      <p className="pp-setup-text">
        Your area is stored on this device. No street address is needed, and no
        account is required to read.
      </p>
      <div className="pp-setup-actions">
        <AreaSelector
          trigger={(props) => (
            <button {...props} className="pp-area-field" type="button">
              <SearchIcon aria-hidden="true" className="pp-area-field-icon" />
              <span className="pp-area-field-label">
                Choose a parish or city
              </span>
            </button>
          )}
        />
      </div>
      {showPreview ? (
        <div className="pp-setup-preview">
          <h2>Major decisions across launch areas</h2>
          <div className="pp-foryou-feed">
            {preview.map((issue) => (
              <IssueCard issue={issue} key={issue.slug} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}
