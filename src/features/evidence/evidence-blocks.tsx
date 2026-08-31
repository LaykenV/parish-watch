import {
  ArrowLeftIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  Clock3Icon,
  ExternalLinkIcon,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'

import { Button } from '../../components/ui/button'
import { askCanAnswer, issueAskKey, meetingAskKey } from '../ask/contracts'
import { setAskDraftHandoff } from '../ask/draft-handoff'
import { formatDate } from '../discovery/format'
import { Sheet } from '../discovery/sheet'
import type { EvidenceStatus, LifecycleState } from '../discovery/contracts'
import { documentHost } from './evidence-model'
import { Claim, SourceControl } from './evidence-surface'
import type {
  ChangeEntry,
  EvidenceScenario,
  PublishedVersion,
  SourceDocument,
  TimelineEntry,
  UncertainLink,
} from './contracts'

export function BackLink({ label, to }: { label: string; to: string }) {
  return (
    <Link className="ev-back" to={to}>
      <ArrowLeftIcon aria-hidden="true" />
      {label}
    </Link>
  )
}

export function Section({
  children,
  id,
  title,
}: {
  children: ReactNode
  id: string
  title: string
}) {
  return (
    <section aria-labelledby={`${id}-title`} className="ev-section" id={id}>
      <h2 className="ev-section-title" id={`${id}-title`}>
        {title}
      </h2>
      {children}
    </section>
  )
}

export function StateLine({ state }: { state: LifecycleState }) {
  const tone =
    state === 'Decided' || state === 'Completed' || state === 'Postponed'
      ? 'settled'
      : state === 'Canceled' || state === 'Status not stated'
        ? 'muted'
        : 'active'

  return (
    <span className="ev-state" data-tone={tone}>
      {state}
    </span>
  )
}

const EVIDENCE_ICONS: Record<EvidenceStatus, LucideIcon> = {
  'Evidence available': CircleCheckIcon,
  'Limited information': CircleAlertIcon,
  'Outcome not posted': CircleAlertIcon,
  'Source delayed': Clock3Icon,
}

export function EvidenceStamp({
  checked,
  note,
  status,
}: {
  checked: string
  note?: string
  status: EvidenceStatus
}) {
  const Icon = EVIDENCE_ICONS[status]

  return (
    <div
      className="ev-stamp"
      data-tone={status === 'Evidence available' ? 'ok' : 'warning'}
    >
      <p className="ev-stamp-line">
        <Icon aria-hidden="true" />
        <span>
          {status} · Checked {formatDate(checked)}
        </span>
      </p>
      {note ? <p className="ev-stamp-note">{note}</p> : null}
    </div>
  )
}

export function Timeline({
  entries,
  fixture,
}: {
  entries: TimelineEntry[]
  fixture?: EvidenceScenario
}) {
  return (
    <ol className="ev-timeline">
      {entries.map((entry, index) => {
        const settled = entry.state === 'Decided' || entry.state === 'Completed'
        return (
          <Claim
            citationId={entry.citationId}
            key={`${entry.date}-${entry.type}-${index}`}
            tag="li"
          >
            <div
              className="ev-timeline-entry"
              data-marker={settled ? 'settled' : 'pending'}
            >
              <p className="ev-timeline-date">
                <time dateTime={entry.date}>{formatDate(entry.date)}</time>
              </p>
              <div className="ev-timeline-main">
                <p className="ev-timeline-type">
                  {entry.type}
                  <StateLine state={entry.state} />
                </p>
                <p className="ev-timeline-summary">{entry.summary}</p>
                {entry.meaningfulChange ? (
                  <p className="ev-timeline-change">{entry.meaningfulChange}</p>
                ) : null}
                {entry.recordKey ? (
                  <Link
                    className="ev-inline-link"
                    params={{ recordKey: entry.recordKey }}
                    search={{ fixture }}
                    to="/decisions/$recordKey"
                  >
                    View decision {entry.recordKey}
                  </Link>
                ) : null}
              </div>
            </div>
          </Claim>
        )
      })}
    </ol>
  )
}

export function UncertainList({
  fixture,
  items,
}: {
  fixture?: EvidenceScenario
  items: UncertainLink[]
}) {
  return (
    <div className="ev-uncertain">
      <p className="ev-uncertain-lede">
        These records may be connected to this issue. No official document
        states the connection, so they stay out of the timeline above.
      </p>
      <ul className="ev-uncertain-list">
        {items.map((item) => (
          <Claim citationId={item.citationId} key={item.title} tag="li">
            <p className="ev-uncertain-status">Relationship uncertain</p>
            <p className="ev-uncertain-title">{item.title}</p>
            <p className="ev-uncertain-reason">{item.reason}</p>
            {item.recordKey ? (
              <Link
                className="ev-inline-link"
                params={{ recordKey: item.recordKey }}
                search={{ fixture }}
                to="/decisions/$recordKey"
              >
                View decision {item.recordKey}
              </Link>
            ) : null}
          </Claim>
        ))}
      </ul>
    </div>
  )
}

export function ChangeList({ entries }: { entries: ChangeEntry[] }) {
  return (
    <ol className="ev-changes">
      {entries.map((entry, index) => (
        <Claim
          citationId={entry.citationId}
          key={`${entry.date}-${index}`}
          tag="li"
        >
          <div
            className="ev-change"
            data-correction={
              entry.kind === 'Public Parish correction' ? '' : undefined
            }
          >
            <p className="ev-change-head">
              {entry.kind === 'Public Parish correction' ? (
                <img alt="" className="ev-change-mark" src="/brand-mark.svg" />
              ) : (
                <span aria-hidden="true" className="ev-change-tick" />
              )}
              <span className="ev-change-kind">{entry.kind}</span>
              <time dateTime={entry.date}>{formatDate(entry.date)}</time>
            </p>
            <p className="ev-change-text">{entry.text}</p>
            {entry.from && entry.to ? (
              <p className="ev-change-diff">
                <span className="ev-change-from">{entry.from}</span>
                <span className="ev-change-to">{entry.to}</span>
              </p>
            ) : null}
          </div>
        </Claim>
      ))}
    </ol>
  )
}

export function DocumentList({ documents }: { documents: SourceDocument[] }) {
  return (
    <ul className="ev-documents">
      {documents.map((document) => (
        <li className="ev-document" key={`${document.title}-${document.kind}`}>
          <div className="ev-document-main">
            <p className="ev-document-kind">{document.kind}</p>
            <p className="ev-document-title">{document.title}</p>
            <p className="ev-document-meta">
              Retrieved {formatDate(document.retrievedAt)}
            </p>
            {document.note ? (
              <p className="ev-document-note">{document.note}</p>
            ) : null}
          </div>
          <div className="ev-document-actions">
            {document.citationId ? (
              <SourceControl citationId={document.citationId} />
            ) : null}
            <a
              className="ev-inline-link"
              href={document.officialUrl}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLinkIcon aria-hidden="true" />
              Open official document
              <span className="ev-document-host">
                {documentHost(document.officialUrl)}
              </span>
            </a>
          </div>
        </li>
      ))}
    </ul>
  )
}

export function VersionHistory({ versions }: { versions: PublishedVersion[] }) {
  return (
    <details className="ev-versions">
      <summary>Published versions ({versions.length})</summary>
      <ol className="ev-version-list">
        {versions.map((version) => (
          <li className="ev-version" key={version.version}>
            <p className="ev-version-head">
              <span>Version {version.version}</span>
              <time dateTime={version.date}>{formatDate(version.date)}</time>
              <span data-mode={version.mode.toLowerCase()}>{version.mode}</span>
            </p>
            <p className="ev-version-note">{version.note}</p>
          </li>
        ))}
      </ol>
    </details>
  )
}

/*
  Scoped Ask entry from a record page. The draft is private conversation
  content: it travels through the in-memory handoff, never the URL, and the
  Ask route consumes it on mount.

  Ask supports corpus, issue, and meeting scope. A decision record has no
  scope of its own, so the decision page asks from the issue that owns it and
  falls back to the corpus when it belongs to no issue.
*/
export type AskBlockScope =
  | { kind: 'corpus' }
  | { kind: 'issue'; issueSlug: string }
  | { kind: 'meeting'; meetingId: string }

function askBlockScopeKey(scope: AskBlockScope): string {
  if (scope.kind === 'issue') return issueAskKey(scope.issueSlug)
  if (scope.kind === 'meeting') return meetingAskKey(scope.meetingId)
  return 'corpus'
}

export function AskBlock({
  scope,
  scopeLabel,
}: {
  scope: AskBlockScope
  scopeLabel: string
}) {
  const navigate = useNavigate()
  const [question, setQuestion] = useState('')
  const fieldId = useId()

  if (!askCanAnswer()) {
    return (
      <div className="ev-ask">
        <p className="ev-ask-scope">{scopeLabel}</p>
        <p className="ev-ask-label">Ask is not available yet</p>
        <p className="ev-ask-note">
          You can still inspect every official source on this page.
        </p>
      </div>
    )
  }

  const navigateToAsk = () => {
    const draft = question.trim()
    if (!draft) return
    setAskDraftHandoff(askBlockScopeKey(scope), draft)
    if (scope.kind === 'issue') {
      navigate({
        search: { scope: 'issue', issue: scope.issueSlug },
        to: '/ask',
      })
    } else if (scope.kind === 'meeting') {
      navigate({
        search: { scope: 'meeting', meeting: scope.meetingId },
        to: '/ask',
      })
    } else {
      navigate({ search: { scope: 'corpus' }, to: '/ask' })
    }
  }

  return (
    <form
      className="ev-ask"
      onSubmit={(event) => {
        event.preventDefault()
        navigateToAsk()
      }}
    >
      <p className="ev-ask-scope">{scopeLabel}</p>
      <label className="ev-ask-label" htmlFor={fieldId}>
        Ask a question about this record
      </label>
      <textarea
        className="ev-ask-field"
        id={fieldId}
        onChange={(event) => setQuestion(event.target.value)}
        placeholder="What happens to credits that were already approved?"
        rows={2}
        value={question}
      />
      <div className="ev-ask-actions">
        <Button
          disabled={question.trim().length === 0}
          size="touch"
          type="submit"
        >
          Send question
        </Button>
        <p className="ev-ask-note">
          Answers come only from published Public Parish evidence. No account
          needed.
        </p>
      </div>
    </form>
  )
}

export function ReportProblem({ recordUrl }: { recordUrl: string }) {
  const [open, setOpen] = useState(false)
  const noteId = useId()

  return (
    <>
      <Button
        className="ev-report-open"
        onClick={() => setOpen(true)}
        size="touch"
        variant="ghost"
      >
        Report a source problem
      </Button>
      <Sheet
        className="ev-report-sheet"
        description="This goes to Public Parish privately. It does not open a public thread."
        onOpenChange={setOpen}
        open={open}
        size="full"
        title="Report a source problem"
      >
        <div className="ev-report">
          <label className="ev-field">
            <span>What is wrong?</span>
            <select defaultValue="wrong-fact">
              <option value="wrong-fact">
                A fact does not match the source
              </option>
              <option value="missing-document">
                An official document is missing
              </option>
              <option value="broken-link">The document link is broken</option>
              <option value="wrong-record">
                This record belongs to a different issue
              </option>
            </select>
          </label>
          <label className="ev-field">
            <span>What did you see?</span>
            <textarea
              placeholder="Describe the problem in a sentence or two."
              rows={4}
            />
          </label>
          <label className="ev-field">
            <span>Official document link, if you have one</span>
            <input inputMode="url" placeholder="https://" type="url" />
          </label>
          <label className="ev-field">
            <span>Your email, only if you want a reply</span>
            <input
              autoComplete="email"
              placeholder="you@example.com"
              type="email"
            />
          </label>
          <p className="ev-report-attached">
            Attached automatically: <code>{recordUrl}</code>
          </p>
          <ul className="ev-report-privacy">
            <li>Sent privately</li>
            <li>No street address needed</li>
            <li>
              Public Parish will not change this page unless validated official
              evidence supports the correction.
            </li>
          </ul>
          <Button aria-describedby={noteId} size="touch">
            Send report
          </Button>
          <p className="ev-report-note" id={noteId}>
            This form shows its final placement. Sending connects with the
            source-reporting work, so nothing is transmitted yet.
          </p>
        </div>
      </Sheet>
    </>
  )
}
