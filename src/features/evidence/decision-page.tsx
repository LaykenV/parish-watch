import { Link } from '@tanstack/react-router'

import { Button } from '../../components/ui/button'
import { formatDate } from '../discovery/format'
import { Notice } from '../discovery/notice'
import {
  AskBlock,
  BackLink,
  ChangeList,
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
import { resolveCitationId } from './contracts'
import type { DecisionDetailFixture, EvidenceSearch } from './contracts'

export function DecisionPage({
  fixture,
  onSelectSource,
  recordKey,
  search,
}: {
  fixture: DecisionDetailFixture | null
  onSelectSource: (id: string | null) => void
  recordKey: string
  search: EvidenceSearch
}) {
  if (!fixture) return <DecisionNotFound recordKey={recordKey} />

  const { citations, decision } = fixture
  const selected = resolveCitationId(citations, search.source)

  return (
    <EvidenceProvider
      citations={citations}
      onSelect={onSelectSource}
      selected={selected}
    >
      <main className="ev-page" id="resident-main">
        <BackLink label="Back to Explore" to="/explore" />

        {decision.issue ? (
          <p className="ev-parent">
            <span className="ev-parent-label">Part of the issue</span>
            <Link
              params={{ issueSlug: decision.issue.slug }}
              search={{ fixture: search.fixture }}
              to="/issues/$issueSlug"
            >
              {decision.issue.title}
            </Link>
          </p>
        ) : null}

        <header className="ev-head">
          <p className="ev-kicker">
            <span>{decision.place}</span>
          </p>
          <h1 className="ev-title">{decision.title}</h1>
          <p className="ev-record-line">
            <span className="ev-record-label">Official record</span>
            <span className="ev-record-key">{decision.recordKey}</span>
          </p>
        </header>

        {decision.limitedNote ? (
          <Notice title="Limited information" tone="warning">
            <p>{decision.limitedNote}</p>
          </Notice>
        ) : null}

        <div className="ev-layout">
          <aside aria-label="Record status" className="ev-rail">
            <EvidencePanel />
            <div className="ev-status">
              <p className="ev-status-row">
                <span className="ev-status-label">Government body</span>
                <span className="ev-status-value">{decision.body}</span>
              </p>
              <p className="ev-status-row">
                <span className="ev-status-label">Record type</span>
                <span className="ev-status-value">{decision.recordType}</span>
              </p>
              <p className="ev-status-row">
                <span className="ev-status-label">Current state</span>
                <StateLine state={decision.state} />
              </p>
              {decision.latest ? (
                <div className="ev-status-date" data-tone="outcome">
                  <p className="ev-status-label">{decision.latest.label}</p>
                  <p className="ev-status-value">
                    <time dateTime={decision.latest.date}>
                      {formatDate(decision.latest.date)}
                    </time>
                  </p>
                  {decision.latest.citationId ? (
                    <SourceControl citationId={decision.latest.citationId} />
                  ) : null}
                </div>
              ) : null}
            </div>
          </aside>

          <div className="ev-column">
            {decision.summary.length > 0 ? (
              <Section id="summary" title="What this record does">
                {decision.summary.map((claim, index) => (
                  <Claim citationId={claim.citationId} key={index}>
                    <p>{claim.text}</p>
                  </Claim>
                ))}
              </Section>
            ) : null}

            <Section id="fields" title="Accepted details">
              <dl className="ev-fields">
                {decision.fields.map((field) => (
                  <Claim citationId={field.citationId} key={field.label}>
                    <dt>{field.label}</dt>
                    <dd>
                      {field.value}
                      {field.note ? (
                        <span className="ev-field-note">{field.note}</span>
                      ) : null}
                    </dd>
                  </Claim>
                ))}
              </dl>
            </Section>

            <Section id="official-title" title="Official item title">
              <Claim citationId={decision.officialTitleCitationId}>
                <p className="ev-official-title">{decision.officialTitle}</p>
              </Claim>
            </Section>

            <Section id="ask" title="Ask Public Parish">
              <AskBlock
                scope={
                  decision.issue
                    ? { issueSlug: decision.issue.slug, kind: 'issue' }
                    : { kind: 'corpus' }
                }
                scopeLabel={
                  decision.issue
                    ? 'Answering from this issue'
                    : 'Searching all validated Public Parish evidence'
                }
              />
            </Section>

            {decision.changes.length > 0 ? (
              <Section id="what-changed" title="What changed">
                <ChangeList entries={decision.changes} />
              </Section>
            ) : null}

            <Section id="sources" title="Sources and update history">
              <DocumentList documents={decision.documents} />
              <VersionHistory versions={decision.versions} />
              <div className="ev-report-row">
                <p className="ev-report-lede">
                  Something here does not match the official record?
                </p>
                <ReportProblem
                  available={Boolean(search.fixture)}
                  recordUrl={`/decisions/${decision.recordKey}`}
                />
              </div>
            </Section>
          </div>
        </div>
      </main>
    </EvidenceProvider>
  )
}

function DecisionNotFound({ recordKey }: { recordKey: string }) {
  return (
    <main className="ev-page ev-page-recovery" id="resident-main">
      <header className="ev-head">
        <p className="ev-kicker">
          <span>Record not found</span>
        </p>
        <h1 className="ev-title">
          Public Parish has no decision record at this address.
        </h1>
        <p className="ev-recovery-text">
          Nothing is published under <code>{recordKey}</code>. Search the
          records Public Parish has accepted, or check whether the body is
          covered.
        </p>
      </header>
      <div className="ev-recovery-actions">
        <Button render={<Link to="/explore" />} size="touch">
          Search records
        </Button>
        <Button render={<Link to="/coverage" />} size="touch" variant="outline">
          Check coverage
        </Button>
      </div>
    </main>
  )
}
