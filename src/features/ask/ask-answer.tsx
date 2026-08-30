import { CircleCheckIcon } from 'lucide-react'
import { useId } from 'react'

import { formatDate } from '../discovery/format'
import type { CitationData } from '../evidence/contracts'
import {
  Claim,
  SourceControl,
  useEvidenceSelect,
} from '../evidence/evidence-surface'
import { usedCitations } from './contracts'
import type { AskNotFoundAnswer, AskSupportedAnswer } from './contracts'

/*
  The answer is the reading point. Supported answers open with one direct
  cited sentence; every factual claim sits in the shared Claim structure with
  its own Source controls. Not found is a complete answer, not an error: no
  green marker, and a source is only ever shown as context, never as support
  for an absent fact.
*/

export function AskAnswer({
  answer,
  onSuggestion,
}: {
  answer: AskSupportedAnswer | AskNotFoundAnswer
  onSuggestion: (suggestion: string) => void
}) {
  return answer.kind === 'supported' ? (
    <SupportedAnswer answer={answer} onSuggestion={onSuggestion} />
  ) : (
    <NotFoundAnswer answer={answer} onSuggestion={onSuggestion} />
  )
}

function SupportedAnswer({
  answer,
  onSuggestion,
}: {
  answer: AskSupportedAnswer
  onSuggestion: (suggestion: string) => void
}) {
  const citations = usedCitations(answer)

  return (
    <div className="ask-answer">
      <p className="ask-answer-stamp">
        <CircleCheckIcon aria-hidden="true" />
        Answer checked against official sources
      </p>
      <AskClaim
        citationIds={answer.lead.citationIds}
        lead
        text={answer.lead.text}
      />
      {answer.claims.map((claim) => (
        <AskClaim
          citationIds={claim.citationIds}
          key={claim.id}
          text={claim.text}
        />
      ))}
      {citations.length > 0 ? <AskSourcesUsed citations={citations} /> : null}
      {answer.suggestions.length > 0 ? (
        <AskSuggestions
          onSuggestion={onSuggestion}
          suggestions={answer.suggestions}
        />
      ) : null}
    </div>
  )
}

/*
  One factual statement with one or more Source controls. The direct answer is
  a cited claim too, so its first sentence can never sit outside citation
  validation. Composes the shipped Claim and SourceControl pieces.
*/
export function AskClaim({
  citationIds,
  lead,
  text,
}: {
  citationIds: readonly string[]
  lead?: boolean
  text: string
}) {
  return (
    <div className={lead ? 'ask-lead' : undefined}>
      <Claim citationIds={citationIds}>
        <p className="ask-claim-text">{text}</p>
      </Claim>
    </div>
  )
}

/*
  Compact source inventory. Rows never repeat excerpts: the existing evidence
  viewer owns the exact context, the retrieval date, and the official link.
*/
export function AskSourcesUsed({ citations }: { citations: CitationData[] }) {
  const select = useEvidenceSelect()
  const rowId = useId()

  return (
    <details className="ask-sources">
      <summary>Sources used, {citations.length}</summary>
      <ul className="ask-sources-list">
        {citations.map((citation) => (
          <li className="ask-source-row" key={citation.id}>
            <p className="ask-source-title">{citation.documentTitle}</p>
            <p className="ask-source-meta">
              <span>{citation.documentKind}</span>
              <span>{formatDate(citation.retrievedAt)}</span>
              <span>{citation.locator}</span>
            </p>
            <button
              className="ask-source-inspect"
              id={`${rowId}-${citation.id}`}
              onClick={(event) => select(citation.id, event.currentTarget)}
              type="button"
            >
              Inspect source
            </button>
          </li>
        ))}
      </ul>
    </details>
  )
}

/*
  Backend-provided next questions only. Selecting one fills and focuses the
  composer; it never submits, spends a turn, or calls the provider.
*/
export function AskSuggestions({
  onSuggestion,
  suggestions,
}: {
  onSuggestion: (suggestion: string) => void
  suggestions: readonly string[]
}) {
  return (
    <div className="ask-suggestions">
      <h3 className="ask-suggestions-head">You can also ask</h3>
      <ul className="ask-suggestions-list">
        {suggestions.map((suggestion) => (
          <li key={suggestion}>
            <button
              className="ask-suggestion"
              onClick={() => onSuggestion(suggestion)}
              type="button"
            >
              {suggestion}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function NotFoundAnswer({
  answer,
  onSuggestion,
}: {
  answer: AskNotFoundAnswer
  onSuggestion: (suggestion: string) => void
}) {
  const closest = answer.closestCitationId
    ? answer.citations[answer.closestCitationId]
    : undefined

  return (
    <div className="ask-answer ask-answer-notfound">
      <p className="ask-notfound-statement">{answer.statement}</p>
      {answer.explanation ? (
        <p className="ask-notfound-explanation">{answer.explanation}</p>
      ) : null}
      {closest && answer.closestCitationId && answer.closestNote ? (
        <div className="ask-closest">
          <p className="ask-closest-note">{answer.closestNote}</p>
          <SourceControl citationId={answer.closestCitationId} />
        </div>
      ) : null}
      {answer.officialContact ? (
        <div className="ask-contact">
          <p className="ask-contact-label">
            Contact listed in the official record
          </p>
          <p className="ask-contact-value">{answer.officialContact.value}</p>
          <SourceControl citationId={answer.officialContact.sourceId} />
        </div>
      ) : null}
      {answer.suggestions.length > 0 ? (
        <AskSuggestions
          onSuggestion={onSuggestion}
          suggestions={answer.suggestions}
        />
      ) : null}
    </div>
  )
}
