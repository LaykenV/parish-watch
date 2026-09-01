import { ExternalLinkIcon } from 'lucide-react'
import { Link } from '@tanstack/react-router'

import { Button } from '../../components/ui/button'
import { formatDate, formatTime } from '../discovery/format'
import { IssueCard } from '../discovery/issue-card'
import { evidenceRouteHref } from '../resident-handoff/navigation'
import {
  AskBlock,
  BackLink,
  DocumentList,
  ReportProblem,
  Section,
  StateLine,
  VersionHistory,
} from './evidence-blocks'
import {
  Claim,
  EvidencePanel,
  EvidenceProvider,
  SourceControl,
} from './evidence-surface'
import { artifactTone } from './evidence-model'
import { resolveCitationId } from './contracts'
import type { EvidenceSearch, MeetingDecisionRow } from './contracts'
import type { MeetingPageData } from './evidence-page.data'

export function MeetingPage({
  data,
  meetingId,
  onSelectSource,
  search,
}: {
  data: MeetingPageData | null
  meetingId: string
  onSelectSource: (id: string | null) => void
  search: EvidenceSearch
}) {
  if (!data) return <MeetingNotFound meetingId={meetingId} />

  const { fixture, issues } = data
  const { citations, meeting } = fixture
  const selected = resolveCitationId(citations, search.source)
  const currentMeetingHref = evidenceRouteHref(
    `/meetings/${meeting.id}`,
    search,
  )

  return (
    <EvidenceProvider
      citations={citations}
      onSelect={onSelectSource}
      selected={selected}
    >
      <main className="ev-page" id="resident-main">
        <BackLink
          label="Back to Explore"
          returnTo={search.returnTo}
          to="/explore"
        />

        <header className="ev-head">
          <p className="ev-kicker">
            <span>{meeting.place}</span>
            <span>{meeting.body}</span>
          </p>
          <h1 className="ev-title">{meeting.title}</h1>
        </header>

        <div className="ev-layout">
          <aside aria-label="Meeting status" className="ev-rail">
            <EvidencePanel />
            <div className="ev-status">
              <div className="ev-status-date" data-tone="next">
                <p className="ev-status-label">Meeting</p>
                <p className="ev-status-value">
                  <time dateTime={meeting.date}>
                    {formatDate(meeting.date)}
                  </time>
                  <span> · {formatTime(meeting.date)}</span>
                </p>
              </div>
              <p className="ev-status-row">
                <span className="ev-status-label">Status</span>
                <span className="ev-status-value">{meeting.status}</span>
              </p>
              <div className="ev-status-location">
                <p className="ev-status-label">Official location</p>
                <p className="ev-status-value">{meeting.locationText}</p>
                {meeting.locationCitationId ? (
                  <SourceControl citationId={meeting.locationCitationId} />
                ) : null}
              </div>
            </div>
          </aside>

          <div className="ev-column">
            <Section id="artifacts" title="Official documents for this meeting">
              <ul className="ev-artifacts">
                {meeting.artifacts.map((artifact) => (
                  <Claim
                    citationId={artifact.citationId}
                    key={artifact.kind}
                    tag="li"
                  >
                    <div className="ev-artifact">
                      <p className="ev-artifact-kind">{artifact.kind}</p>
                      <p
                        className="ev-artifact-status"
                        data-tone={artifactTone(artifact.status)}
                      >
                        {artifact.status}
                      </p>
                      {artifact.note ? (
                        <p className="ev-artifact-note">{artifact.note}</p>
                      ) : null}
                      <p className="ev-artifact-checked">
                        Public Parish last checked{' '}
                        {formatDate(artifact.checked)}
                      </p>
                      {artifact.officialUrl ? (
                        <a
                          className="ev-inline-link"
                          href={artifact.officialUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <ExternalLinkIcon aria-hidden="true" />
                          Open {artifact.kind.toLowerCase()}
                        </a>
                      ) : null}
                    </div>
                  </Claim>
                ))}
              </ul>
            </Section>

            <Section id="substantive" title="What this meeting decides">
              {issues.length === 0 && meeting.decisions.length === 0 ? (
                <p className="ev-empty-note">
                  No substantive items are known yet. Items appear here when an
                  official agenda or minutes publish.
                </p>
              ) : null}
              {issues.length > 0 ? (
                <div className="ev-issue-grid">
                  {issues.map((issue) => (
                    <IssueCard issue={issue} key={issue.slug} variant="rail" />
                  ))}
                </div>
              ) : null}
              {meeting.decisions.length > 0 ? (
                <DecisionRows
                  fixture={search.fixture}
                  returnTo={currentMeetingHref}
                  rows={meeting.decisions}
                />
              ) : null}
            </Section>

            {meeting.routine.length > 0 ? (
              <Section id="routine" title="Routine records">
                <details className="ev-routine">
                  <summary>
                    {meeting.routine.length} routine record
                    {meeting.routine.length === 1 ? '' : 's'}
                  </summary>
                  <DecisionRows
                    fixture={search.fixture}
                    returnTo={currentMeetingHref}
                    rows={meeting.routine}
                  />
                </details>
                <p className="ev-routine-note">
                  Routine records stay searchable in Explore. They are never
                  promoted into a feed.
                </p>
              </Section>
            ) : null}

            <Section id="ask" title="Ask Public Parish">
              <AskBlock
                scope={{ kind: 'meeting', meetingId: meeting.id }}
                scopeLabel="Answering from this meeting"
              />
            </Section>

            <Section id="sources" title="Sources and update history">
              <DocumentList documents={meeting.documents} />
              <VersionHistory versions={meeting.versions} />
              <div className="ev-report-row">
                <p className="ev-report-lede">
                  A document is missing or does not match the official record?
                </p>
                <ReportProblem
                  available={Boolean(search.fixture)}
                  recordUrl={`/meetings/${meeting.id}`}
                />
              </div>
            </Section>
          </div>
        </div>
      </main>
    </EvidenceProvider>
  )
}

function DecisionRows({
  fixture,
  returnTo,
  rows,
}: {
  fixture: EvidenceSearch['fixture']
  returnTo?: string
  rows: MeetingDecisionRow[]
}) {
  return (
    <ul className="ev-decision-rows">
      {rows.map((row) => (
        <Claim citationId={row.citationId} key={row.recordKey} tag="li">
          <p className="ev-decision-title">
            <Link
              params={{ recordKey: row.recordKey }}
              search={{ fixture, returnTo }}
              to="/decisions/$recordKey"
            >
              {row.title}
            </Link>
          </p>
          <p className="ev-decision-meta">
            <span className="ev-record-key">{row.recordKey}</span>
            <StateLine state={row.state} />
          </p>
          <p className="ev-decision-summary">{row.summary}</p>
        </Claim>
      ))}
    </ul>
  )
}

function MeetingNotFound({ meetingId }: { meetingId: string }) {
  return (
    <main className="ev-page ev-page-recovery" id="resident-main">
      <header className="ev-head">
        <p className="ev-kicker">
          <span>Meeting not found</span>
        </p>
        <h1 className="ev-title">
          Public Parish has no meeting at this address.
        </h1>
        <p className="ev-recovery-text">
          Nothing is published under <code>{meetingId}</code>. Coverage lists
          every body Public Parish monitors and how current each source is.
        </p>
      </header>
      <div className="ev-recovery-actions">
        <Button render={<Link to="/coverage" />} size="touch">
          Check coverage
        </Button>
        <Button render={<Link to="/explore" />} size="touch" variant="outline">
          Search records
        </Button>
      </div>
    </main>
  )
}
