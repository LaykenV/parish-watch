import { recordCivicEvent } from '../analytics/product-analytics'
import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'

import { Button } from '../../components/ui/button'
import { Spinner } from '../../components/ui/spinner'
import { formatDate } from '../discovery/format'
import { Notice } from '../discovery/notice'
import { ShareButton } from '../discovery/share'
import { FollowAction } from '../following/follow-action'
import { evidenceRouteHref } from '../resident-handoff/navigation'
import {
  AskBlock,
  BackLink,
  ChangeList,
  DocumentList,
  EvidenceStamp,
  ReportProblem,
  Section,
  StateLine,
  Timeline,
  UncertainList,
  VersionHistory,
} from './evidence-blocks'
import {
  Claim,
  EvidencePanel,
  EvidenceProvider,
  SourceControl,
} from './evidence-surface'
import {
  applyLiveUpdate,
  issueSections,
  supportsLiveUpdate,
} from './evidence-model'
import { resolveCitationId } from './contracts'
import type {
  EvidenceSearch,
  IssueDetailFixture,
  MarkedDate,
} from './contracts'
import type { IssuePageData } from './evidence-page.data'
import { toIssueFixture, usePublishedIssue } from './live-evidence'

export function IssuePage({
  data,
  onSelectSource,
  search,
  slug,
}: {
  data: IssuePageData | null
  onSelectSource: (id: string | null) => void
  search: EvidenceSearch
  slug: string
}) {
  if (data?.fixture) {
    return (
      <FixtureIssuePage
        data={data}
        onSelectSource={onSelectSource}
        search={search}
        slug={slug}
      />
    )
  }
  return (
    <PublishedIssuePage
      onSelectSource={onSelectSource}
      search={search}
      slug={slug}
    />
  )
}

function FixtureIssuePage({
  data,
  onSelectSource,
  search,
  slug,
}: {
  data: IssuePageData
  onSelectSource: (id: string | null) => void
  search: EvidenceSearch
  slug: string
}) {
  const fixture = data.fixture
  const liveUpdate = data.liveUpdate
  const live = Boolean(liveUpdate) && supportsLiveUpdate(slug)
  const [updated, setUpdated] = useState(false)

  useEffect(() => {
    if (!live) {
      setUpdated(false)
      return
    }
    const timer = window.setTimeout(() => setUpdated(true), 4000)
    return () => window.clearTimeout(timer)
  }, [live])

  const current =
    updated && liveUpdate ? applyLiveUpdate(fixture, liveUpdate) : fixture
  return (
    <IssueDetail
      fixture={current}
      liveFollow={false}
      onSelectSource={onSelectSource}
      search={search}
      updated={updated}
    />
  )
}

function PublishedIssuePage({
  onSelectSource,
  search,
  slug,
}: {
  onSelectSource: (id: string | null) => void
  search: EvidenceSearch
  slug: string
}) {
  const published = usePublishedIssue(slug)
  const publishedFixture = published ? toIssueFixture(published) : null
  const [updated, setUpdated] = useState(false)
  const previousRevision = useRef<string | null>(null)

  useEffect(() => {
    if (!published) return
    if (
      previousRevision.current !== null &&
      previousRevision.current !== published.revision
    ) {
      setUpdated(true)
    }
    previousRevision.current = published.revision
  }, [published])

  if (published === undefined) return <EvidenceLoading />
  if (!publishedFixture) return <IssueNotFound slug={slug} />

  return (
    <IssueDetail
      fixture={publishedFixture}
      liveFollow
      onSelectSource={onSelectSource}
      search={{ ...search, fixture: undefined }}
      updated={updated}
    />
  )
}

function EvidenceLoading() {
  return (
    <main className="ev-page" id="resident-main">
      <div className="ev-loading" role="status">
        <Spinner aria-hidden="true" />
        <span>Loading published evidence</span>
      </div>
    </main>
  )
}

function IssueDetail({
  fixture,
  liveFollow,
  onSelectSource,
  search,
  updated,
}: {
  fixture: IssueDetailFixture
  liveFollow: boolean
  onSelectSource: (id: string | null) => void
  search: EvidenceSearch
  updated: boolean
}) {
  useEffect(() => {
    if (!liveFollow) return
    const key = `pp-issue-visited:${issue.slug}`
    try { if (sessionStorage.getItem(key)) recordCivicEvent('issue_returned'); sessionStorage.setItem(key, '1') } catch { /* Reading remains available without storage. */ }
    if (!issue.latestOutcome || typeof IntersectionObserver === 'undefined') return
    const timeline = document.getElementById('timeline')
    if (!timeline) return
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { recordCivicEvent('outcome_read'); observer.disconnect() }
    }, { threshold: 0.5 })
    observer.observe(timeline)
    return () => observer.disconnect()
  }, [issue.slug, issue.latestOutcome, liveFollow])
  const { citations, issue } = fixture
  const sections = issueSections(fixture)
  const selected = resolveCitationId(citations, search.source)
  const currentIssueHref = evidenceRouteHref(`/issues/${issue.slug}`, search)

  return (
    <EvidenceProvider
      citations={citations}
      onSelect={onSelectSource}
      selected={selected}
    >
      <main className="ev-page" id="resident-main">
        <BackLink label="Back to Home" returnTo={search.returnTo} to="/" />

        <header className="ev-head">
          <p className="ev-kicker">
            <span>{issue.place}</span>
            <span>{issue.body}</span>
            <StateLine state={issue.state} />
          </p>
          <h1 className="ev-title">{issue.title}</h1>
        </header>
        {issue.coverageNote ? <p className="ev-limited-note">{issue.coverageNote}</p> : null}

        {issue.historical ? (
          <Notice
            action={
              <Button
                render={
                  <Link
                    params={{ issueSlug: issue.historical.slug }}
                    search={{ fixture: search.fixture }}
                    to="/issues/$issueSlug"
                  />
                }
                size="touch"
              >
                View the newer issue
              </Button>
            }
            title="A newer issue continues this timeline"
          >
            <p>
              {issue.historical.note} This page keeps the decisions and evidence
              accepted while it was current.
            </p>
          </Notice>
        ) : null}

        {issue.limitedNote ? (
          <Notice
            title={
              issue.evidence.status === 'Source delayed'
                ? 'Source delayed'
                : 'Limited information'
            }
            tone="warning"
          >
            <p>{issue.limitedNote}</p>
          </Notice>
        ) : null}

        <p
          aria-live="polite"
          className="ev-live"
          data-shown={updated || undefined}
        >
          {updated ? (
            <>
              <span>Updated from the official record.</span>{' '}
              <a className="ev-inline-link" href="#what-changed">
                See what changed.
              </a>
            </>
          ) : null}
        </p>

        <div className="ev-layout">
          <aside aria-label="Issue status" className="ev-rail">
            <EvidencePanel />
            <div className="ev-status">
              <p className="ev-status-row">
                <span className="ev-status-label">Current state</span>
                <StateLine state={issue.state} />
              </p>
              {issue.next ? (
                <MarkedDateRow marked={issue.next} tone="next" />
              ) : null}
              {issue.deadline ? (
                <MarkedDateRow marked={issue.deadline} tone="deadline" />
              ) : null}
              {issue.latestOutcome ? (
                <MarkedDateRow marked={issue.latestOutcome} tone="outcome" />
              ) : null}
              {!issue.next && !issue.latestOutcome ? (
                <p className="ev-status-row">
                  <span className="ev-status-label">Next date</span>
                  <span className="ev-status-value">No next date posted</span>
                </p>
              ) : null}
              <EvidenceStamp
                checked={issue.evidence.checked}
                note={issue.evidence.note}
                status={issue.evidence.status}
              />
              <div className="ev-status-actions">
                <FollowAction
                  available
                  label="Follow this issue"
                  live={liveFollow}
                  target={{
                    key: issue.slug,
                    kind: 'Issue',
                    title: issue.title,
                    detail: `${issue.place} · ${issue.body}`,
                  }}
                />
                <ShareButton
                  path={`/issues/${issue.slug}`}
                  title={issue.title}
                />
              </div>
            </div>
          </aside>

          <div className="ev-column">
            {sections.happening ? (
              <Section id="what-is-happening" title="What is happening">
                {issue.happening.map((claim, index) => (
                  <Claim citationId={claim.citationId} key={index}>
                    <p>{claim.text}</p>
                  </Claim>
                ))}
              </Section>
            ) : null}

            {sections.publicActions ? (
              <Section id="public-actions" title="What the public can still do">
                <ul className="ev-actions">
                  {issue.publicActions.map((action, index) => (
                    <Claim
                      citationId={action.citationId}
                      key={`${action.label}-${index}`}
                      tag="li"
                    >
                      <p className="ev-action-label">{action.label}</p>
                      {action.deadline ? (
                        <p className="ev-action-deadline">
                          By{' '}
                          <time dateTime={action.deadline}>
                            {formatDate(action.deadline)}
                          </time>
                          {action.deadlineCitationId ? (
                            <SourceControl
                              citationId={action.deadlineCitationId}
                            />
                          ) : null}
                        </p>
                      ) : null}
                      <p className="ev-action-text">{action.instructions}</p>
                    </Claim>
                  ))}
                </ul>
              </Section>
            ) : null}

            {sections.factors ? (
              <Section id="why-this-may-matter" title="Why this may matter">
                <ul className="ev-factors">
                  {issue.factors.map((factor) => (
                    <Claim
                      citationId={factor.citationId}
                      key={factor.factor}
                      tag="li"
                    >
                      <p className="ev-factor-name">{factor.factor}</p>
                      <p className="ev-factor-text">{factor.text}</p>
                    </Claim>
                  ))}
                </ul>
              </Section>
            ) : null}

            <Section id="ask" title="Ask Public Parish">
              <AskBlock
                scope={{ issueSlug: issue.slug, kind: 'issue' }}
                scopeLabel="Answering from this issue"
              />
            </Section>

            {sections.timeline ? (
              <Section id="timeline" title="Decision timeline">
                <Timeline
                  entries={issue.timeline}
                  fixture={search.fixture}
                  returnTo={currentIssueHref}
                />
                {sections.uncertain ? (
                  <UncertainList
                    fixture={search.fixture}
                    items={issue.uncertain}
                    returnTo={currentIssueHref}
                  />
                ) : null}
              </Section>
            ) : null}

            {sections.changes ? (
              <Section id="what-changed" title="What changed">
                <ChangeList entries={issue.changes} />
              </Section>
            ) : null}

            <Section id="sources" title="Sources and update history">
              <DocumentList documents={issue.documents} />
              <VersionHistory versions={issue.versions} />
              <div className="ev-report-row">
                <p className="ev-report-lede">
                  Something here does not match the official record?
                </p>
                <ReportProblem
                  available={Boolean(search.fixture)}
                  recordUrl={currentIssueHref}
                />
              </div>
            </Section>
          </div>
        </div>
      </main>
    </EvidenceProvider>
  )
}

function MarkedDateRow({
  marked,
  tone,
}: {
  marked: MarkedDate
  tone: 'deadline' | 'next' | 'outcome'
}) {
  return (
    <div className="ev-status-date" data-tone={tone}>
      <p className="ev-status-label">{marked.label}</p>
      <p className="ev-status-value">
        <time dateTime={marked.date}>{formatDate(marked.date)}</time>
        {marked.time ? <span> · {marked.time}</span> : null}
      </p>
      {marked.citationId ? (
        <SourceControl citationId={marked.citationId} />
      ) : null}
    </div>
  )
}

function IssueNotFound({ slug }: { slug: string }) {
  return (
    <main className="ev-page ev-page-recovery" id="resident-main">
      <header className="ev-head">
        <p className="ev-kicker">
          <span>Issue not found</span>
        </p>
        <h1 className="ev-title">
          Public Parish has no issue at this address.
        </h1>
        <p className="ev-recovery-text">
          Nothing is published under <code>{slug}</code>. The issue may have
          been replaced by a newer one, or the address may be mistyped. Public
          Parish does not guess which record you meant.
        </p>
      </header>
      <div className="ev-recovery-actions">
        <Button render={<Link to="/" />} size="touch">
          Back to Home
        </Button>
        <Button render={<Link to="/coverage" />} size="touch" variant="outline">
          Check coverage
        </Button>
      </div>
    </main>
  )
}
