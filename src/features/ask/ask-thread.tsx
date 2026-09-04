import { Spinner } from '../../components/ui/spinner'
import { AskAnswer } from './ask-answer'
import { AskTurnFailure } from './ask-states'
import type { AskTurnView } from './contracts'

/*
  One chronological thread. Every turn keeps its question and answer visible;
  nothing collapses behind an earlier turn. Turn headings are the h2 sequence
  with a visually hidden turn number.
*/

export function AskThread({
  dismissedTurnIds,
  onDismiss,
  onRetry,
  onSuggestion,
  turns,
}: {
  dismissedTurnIds: ReadonlySet<string>
  onDismiss: (turnId: string) => void
  onRetry: (turnId: string) => void
  onSuggestion: (suggestion: string) => void
  turns: AskTurnView[]
}) {
  return (
    <div className="ask-thread">
      {turns.map((turn, index) => (
        <AskTurn
          dismissed={dismissedTurnIds.has(turn.id)}
          index={index}
          key={turn.id}
          onDismiss={onDismiss}
          onRetry={onRetry}
          onSuggestion={onSuggestion}
          turn={turn}
        />
      ))}
    </div>
  )
}

function AskTurn({
  dismissed,
  index,
  onDismiss,
  onRetry,
  onSuggestion,
  turn,
}: {
  dismissed: boolean
  index: number
  onDismiss: (turnId: string) => void
  onRetry: (turnId: string) => void
  onSuggestion: (suggestion: string) => void
  turn: AskTurnView
}) {
  return (
    <article className="ask-turn">
      <h2 className="ask-turn-head" id={`ask-turn-${turn.id}`} tabIndex={-1}>
        You asked
        <span className="visually-hidden"> {`question ${index + 1}`}</span>
      </h2>
      <p className="ask-turn-question">{turn.question}</p>
      {turn.state === 'checking' ? <AskChecking /> : null}
      {turn.answer ? (
        <AskAnswer answer={turn.answer} onSuggestion={onSuggestion} />
      ) : null}
      {turn.state === 'retryable_failure' ||
      turn.state === 'terminal_failure' || turn.state === 'scope_too_large' ? (
        <div id={`ask-failure-${turn.id}`} tabIndex={-1}>
          <AskTurnFailure
            dismissed={dismissed}
            onDismiss={() => onDismiss(turn.id)}
            onRetry={() => onRetry(turn.id)}
            state={turn.state}
          />
        </div>
      ) : null}
    </article>
  )
}

/*
  A stable complete-answer wait. No word streaming, fake search steps, source
  counts, or model names. The page announces the check through its single
  status region, so the spinner stays hidden from assistive tech.
*/
export function AskChecking() {
  return (
    <div aria-busy="true" className="ask-checking">
      <Spinner aria-hidden="true" />
      <div>
        <p className="ask-checking-title">Checking the official record</p>
        <p className="ask-checking-note">
          The answer will appear after its sources pass validation.
        </p>
      </div>
    </div>
  )
}
