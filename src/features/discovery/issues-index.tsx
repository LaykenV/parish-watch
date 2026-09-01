import { ArrowRightIcon } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'

import { Button } from '../../components/ui/button'
import type { IssuesSearch } from './contracts'
import { getActiveDiscoveryFixture } from './contracts'
import { PUBLISHED_ISSUE_FIXTURES } from './fixtures'
import { IssueCard } from './issue-card'
import { toIssueCard, usePublishedIssues } from './live-publications'

export function IssuesIndexPage({ search }: { search: IssuesSearch }) {
  const activeFixture = getActiveDiscoveryFixture(search.fixture)
  const fixturesEnabled = activeFixture !== undefined
  const publishedIssues = usePublishedIssues(!fixturesEnabled)
  const cards = useMemo(() => {
    if (fixturesEnabled) {
      return activeFixture === 'published' ? PUBLISHED_ISSUE_FIXTURES : []
    }
    return (publishedIssues ?? []).flatMap((issue) => {
      const card = toIssueCard(issue)
      return card ? [card] : []
    })
  }, [activeFixture, fixturesEnabled, publishedIssues])
  const decisionCount = fixturesEnabled
    ? activeFixture === 'published'
      ? 4
      : 0
    : (publishedIssues ?? []).reduce(
        (total, issue) => total + issue.decisionCount,
        0,
      )

  return (
    <main className="pp-page pp-issues-index" id="resident-main">
      <header className="pp-page-head">
        <p className="pp-issues-kicker">Published issue timelines</p>
        <h1>Issues</h1>
        <p className="pp-page-lede">
          See how related local-government decisions connect over time. Every
          timeline comes from published records and links back to the official
          evidence.
        </p>
      </header>

      {!fixturesEnabled && publishedIssues === undefined ? (
        <div className="pp-empty pp-issues-loading" role="status">
          <p className="pp-empty-title">Loading published issues...</p>
        </div>
      ) : cards.length === 0 ? (
        <div className="pp-empty pp-issues-empty">
          <p className="pp-empty-title">
            No issue timelines are published yet.
          </p>
          <p className="pp-empty-text">
            Public Parish publishes an issue only after multiple related
            decisions and their citations pass the evidence checks.
          </p>
          <Button
            render={<Link to="/explore" />}
            size="touch"
            variant="outline"
          >
            Explore decision records
          </Button>
        </div>
      ) : (
        <>
          <dl aria-label="Published issue totals" className="pp-issues-docket">
            <div>
              <dt>Issue timelines</dt>
              <dd>{cards.length}</dd>
            </div>
            <div>
              <dt>Linked decisions</dt>
              <dd>{decisionCount}</dd>
            </div>
          </dl>

          <section
            aria-labelledby="published-issues-heading"
            className="pp-section"
          >
            <div className="pp-section-head">
              <h2 id="published-issues-heading">Published timelines</h2>
              <Link className="pp-section-link" to="/explore">
                Browse decision records
                <ArrowRightIcon aria-hidden="true" />
              </Link>
            </div>
            <div className="pp-card-grid">
              {cards.map((issue) => (
                <IssueCard issue={issue} key={issue.slug} />
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  )
}
