import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

import { Button } from '../../components/ui/button'
import { formatTime } from '../discovery/format'
import type { AskRecentConversation, AskTurnState } from './contracts'

/*
  Recovery and availability states. One action per notice, plain recovery
  copy, and no blame. The page announces each notice once through its single
  status region, so these blocks stay quiet to assistive tech.
*/

export function AskUnavailable() {
  return (
    <section aria-label="Ask availability" className="ask-gate">
      <p className="ask-gate-title">Ask is not available yet</p>
      <p className="ask-gate-text">
        You can still browse published decisions and inspect every official
        source.
      </p>
      <div className="ask-notice-actions">
        <Button render={<Link to="/explore" />} size="touch">
          Explore published records
        </Button>
      </div>
    </section>
  )
}

export function AskExpiredNotice({ onRestart }: { onRestart: () => void }) {
  return (
    <section aria-label="Expired conversation" className="ask-notice">
      <p className="ask-notice-title">This conversation has expired</p>
      <p className="ask-notice-text">
        Anonymous conversations stay on this device for 24 hours. The questions
        and answers are no longer available here.
      </p>
      <div className="ask-notice-actions">
        <Button onClick={onRestart} size="touch">
          Start a new conversation
        </Button>
      </div>
    </section>
  )
}

export function AskCooldownNotice({ retryAt }: { retryAt: string }) {
  return (
    <div className="ask-notice" data-tone="warning">
      <p className="ask-notice-title">
        Ask is taking a short pause on this device
      </p>
      <p className="ask-notice-text">
        You can ask again at {formatTime(retryAt)}. Published records and
        Sources still work.
      </p>
    </div>
  )
}

/*
  Renders only the challenge the abuse adapter selected. The fixture adapter's
  local check resolves through adapter.resolveChallenge; production never
  reaches this control without a real adapter challenge behind it.
*/
export function AskCaptchaNotice({ onResolve }: { onResolve: () => void }) {
  return (
    <div className="ask-notice" data-tone="warning">
      <p className="ask-notice-title">Please complete this quick check</p>
      <p className="ask-notice-text">
        It helps keep anonymous Ask available without requiring an account.
      </p>
      <div className="ask-notice-actions">
        <Button onClick={onResolve} size="touch" variant="outline">
          Complete check
        </Button>
      </div>
    </div>
  )
}

export function AskOfflineNotice() {
  return (
    <div className="ask-notice" data-tone="warning">
      <p className="ask-notice-title">
        Ask needs a connection to check official sources
      </p>
      <p className="ask-notice-text">
        You can keep reading answers already loaded on this page.
      </p>
    </div>
  )
}

/*
  In-turn provider failure. Retryable keeps the question and one retry path;
  after a dismissal or a terminal mark the notice settles without a retry
  control, and prior validated answers stay readable.
*/
export function AskTurnFailure({
  dismissed,
  onDismiss,
  onRetry,
  state,
}: {
  dismissed: boolean
  onDismiss: () => void
  onRetry: () => void
  state: AskTurnState
}) {
  if (state === 'retryable_failure') {
    if (dismissed) {
      return (
        <div className="ask-notice" data-tone="muted">
          <p className="ask-notice-title">The answer could not be checked.</p>
        </div>
      )
    }
    return (
      <div className="ask-notice" data-tone="warning">
        <p className="ask-notice-title">The answer could not be checked</p>
        <p className="ask-notice-text">
          Your question is still here. Try again without sending a second copy.
        </p>
        <div className="ask-notice-actions">
          <Button onClick={onRetry} size="touch">
            Try again
          </Button>
          <Button onClick={onDismiss} size="touch" variant="ghost">
            Dismiss
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="ask-notice" data-tone="muted">
      <p className="ask-notice-title">This question could not be answered</p>
      <p className="ask-notice-text">
        Public Parish did not add an answer because it could not validate the
        result. You can ask a different question or keep reading the published
        records.
      </p>
    </div>
  )
}

/*
  Same-device conversation handles. A row holds a safe public scope title and
  times only: never question or answer text, and no claim of cross-device
  recovery.
*/
export function AskRecent({
  onClear,
  onOpen,
  recent,
}: {
  onClear: () => void
  onOpen: (handle: AskRecentConversation) => void
  recent: AskRecentConversation[]
}) {
  if (recent.length === 0) return null

  return (
    <section aria-label="Recent on this device" className="ask-recent">
      <h2 className="ask-recent-head">Recent on this device</h2>
      <ul className="ask-recent-list">
        {recent.map((handle) => (
          <li key={handle.localHandle}>
            <button
              className="ask-recent-row"
              onClick={() => onOpen(handle)}
              type="button"
            >
              <span className="ask-recent-scope">{handle.scopeLabel}</span>
              <span className="ask-recent-times">
                <time dateTime={handle.latestActivityAt}>
                  {formatTime(handle.latestActivityAt)}
                </time>
                <span>Expires {formatTime(handle.expiresAt)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <ClearRecent onClear={onClear} />
    </section>
  )
}

function ClearRecent({ onClear }: { onClear: () => void }) {
  const [confirming, setConfirming] = useState(false)

  if (!confirming) {
    return (
      <button
        className="ask-recent-clear"
        onClick={() => setConfirming(true)}
        type="button"
      >
        Clear recent conversations
      </button>
    )
  }

  return (
    <div className="ask-recent-confirm">
      <p>Clear saved conversations from this device?</p>
      <div className="ask-recent-confirm-actions">
        <Button
          onClick={() => {
            setConfirming(false)
            onClear()
          }}
          size="touch"
          variant="outline"
        >
          Clear
        </Button>
        <Button
          onClick={() => setConfirming(false)}
          size="touch"
          variant="ghost"
        >
          Keep
        </Button>
      </div>
    </div>
  )
}

/*
  The single polite status region. Checking, answers, and availability notices
  announce here once; the thread itself is never marked live.
*/
export function AskStatusRegion({ message }: { message: string }) {
  return (
    <p aria-live="polite" className="visually-hidden" role="status">
      {message}
    </p>
  )
}

/*
  Scope changes never happen silently. The safe action receives initial focus.
*/
export function AskScopeConfirm({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void
  onConfirm: () => void
}) {
  const keepRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    keepRef.current?.focus()
  }, [])

  return (
    <section aria-label="Start a new conversation?" className="ask-confirm">
      <p className="ask-confirm-title">Start a new conversation?</p>
      <p className="ask-confirm-text">
        Changing the evidence scope clears this conversation from this page.
      </p>
      <div className="ask-confirm-actions">
        <Button ref={keepRef} onClick={onCancel} size="touch" variant="outline">
          Keep this conversation
        </Button>
        <Button onClick={onConfirm} size="touch">
          Start new conversation
        </Button>
      </div>
    </section>
  )
}
