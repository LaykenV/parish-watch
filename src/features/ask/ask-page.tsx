import { Link } from '@tanstack/react-router'
import { ArrowLeftIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

import { Spinner } from '../../components/ui/spinner'
import { resolveCitationId } from '../evidence/contracts'
import type { CitationMap } from '../evidence/contracts'
import { EvidencePanel, EvidenceProvider } from '../evidence/evidence-surface'
import { useKeyboardInset, useMediaQuery, useOnline } from '../discovery/hooks'
import {
  AskRequestError,
  askScopeIdentity,
  countAnswerSources,
  MAX_ASK_LENGTH,
} from './contracts'
import type {
  AskAdapter,
  AskAvailability,
  AskConversationView,
  AskRecentConversation,
  AskScope,
  AskTurnState,
} from './contracts'
import { takeAskDraftHandoff } from './draft-handoff'
import { AskComposer } from './ask-composer'
import { AskThread } from './ask-thread'
import {
  AskCaptchaNotice,
  AskCooldownNotice,
  AskExpiredNotice,
  AskOfflineNotice,
  AskRecent,
  AskScopeConfirm,
  AskStatusRegion,
  AskUnavailable,
} from './ask-states'
import type { AskRouteData } from '../../routes/ask.data'

import './ask.css'

/*
  Ask Public Parish. Composition owns the availability gate, the state model,
  and the draft; it does not own provider calls. Production without a proven
  chat adapter shows the honest unavailable state while Ask stays a stable
  navigation destination. Development scenarios load through a dev-only
  dynamic import and never ship.
*/

const ASK_EXAMPLES = [
  'What decisions changed this week?',
  'What was approved about drainage?',
]

const EXPIRY_SWEEP_MS = 30_000

export function AskPage({
  data,
  onSelectSource,
  source,
}: {
  data: AskRouteData
  onSelectSource: (id: string | null) => void
  source?: string
}) {
  const kbInset = useKeyboardInset()
  const online = useOnline()
  const wide = useMediaQuery('(min-width: 64.0625rem)')

  const [adapter, setAdapter] = useState<AskAdapter | null>(null)
  const [availability, setAvailability] = useState<AskAvailability>(
    data.availability,
  )
  const [conversation, setConversation] = useState<AskConversationView | null>(
    null,
  )
  const [recent, setRecent] = useState<AskRecentConversation[]>([])
  const [viewScope, setViewScope] = useState<AskScope>(data.scope)
  const [draft, setDraft] = useState('')
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(
    () => new Set(),
  )
  const [expired, setExpired] = useState(false)
  const [status, setStatus] = useState('')
  const [pendingHandle, setPendingHandle] =
    useState<AskRecentConversation | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const previousConversation = useRef<AskConversationView | null>(null)

  // Consume the in-memory draft handoff, and when the public scope changes by
  // navigation, drop the previous conversation instead of showing it under a
  // new scope. Opening a recent handle goes through openHandle instead and
  // keeps its own scope.
  const consumedScope = useRef<string | null>(null)
  useEffect(() => {
    const identity = askScopeIdentity(data.scope)
    const changed = consumedScope.current !== identity
    consumedScope.current = identity
    setViewScope(data.scope)
    if (!changed) return
    const handed = takeAskDraftHandoff(identity)
    setExpired(false)
    setDismissed(new Set())
    if (handed) {
      previousConversation.current = null
      setConversation(null)
      setDraft(handed)
      return
    }
    setConversation((current) => {
      if (!current || askScopeIdentity(current.scope) === identity) {
        return current
      }
      previousConversation.current = null
      return null
    })
  }, [data.scope])

  // Development scenarios load through a dynamic import; production never
  // reaches this branch because the loader leaves scenario null.
  useEffect(() => {
    if (!data.scenario) return
    let cancelled = false
    import('./fixtures').then(({ getAskFixtureAdapter }) => {
      if (!cancelled) setAdapter(getAskFixtureAdapter(data.scenario!))
    })
    return () => {
      cancelled = true
    }
  }, [data.scenario])

  const handleAvailability = useCallback((next: AskAvailability) => {
    setAvailability(next)
    if (next.kind === 'cooldown') {
      setStatus('Ask is taking a short pause on this device')
    }
    if (next.kind === 'captcha') {
      setStatus('Please complete this quick check')
    }
  }, [])

  const handleConversation = useCallback((next: AskConversationView | null) => {
    setConversation(next)
    const previous = previousConversation.current
    previousConversation.current = next
    if (!next || !previous || previous.id !== next.id) return

    const added = next.turns[next.turns.length - 1]
    if (next.turns.length > previous.turns.length) {
      if (added.state === 'checking') {
        setStatus('Checking the official record')
      }
    }
    for (const turn of next.turns) {
      const before = previous.turns.find((item) => item.id === turn.id)
      if (
        before?.state === 'checking' &&
        turn.state === 'complete' &&
        turn.answer
      ) {
        setStatus(
          turn.answer.kind === 'supported'
            ? `Answer ready with ${countAnswerSources(turn.answer)} sources`
            : 'The published evidence did not answer the question',
        )
      }
    }
  }, [])

  useEffect(() => {
    if (!adapter) return
    return adapter.subscribe((update) => {
      if (update.kind === 'conversation')
        handleConversation(update.conversation)
      else if (update.kind === 'availability')
        handleAvailability(update.availability)
      else setRecent(update.recent)
    })
  }, [adapter, handleConversation, handleAvailability])

  const turns = conversation?.turns ?? []
  const lastTurn = turns.length > 0 ? turns[turns.length - 1] : null
  const checking = turns.some((turn) => turn.state === 'checking')
  const blockingRetry =
    lastTurn?.state === 'retryable_failure' && !dismissed.has(lastTurn.id)
  const cooldown = availability.kind === 'cooldown'
  const captcha = availability.kind === 'captcha'
  const offline = !online || availability.kind === 'offline'
  const composerDisabled =
    checking || blockingRetry || cooldown || captcha || offline
  const canSubmit =
    !composerDisabled &&
    draft.trim().length > 0 &&
    draft.length <= MAX_ASK_LENGTH

  // Focus the frozen question after submission, and a retryable notice that
  // requires action. No focus move when the answer itself arrives.
  const lastTurnId = lastTurn?.id ?? null
  const lastTurnState: AskTurnState | null = lastTurn?.state ?? null
  useEffect(() => {
    if (lastTurnId && lastTurnState === 'checking') {
      document.getElementById(`ask-turn-${lastTurnId}`)?.focus()
    }
    if (
      lastTurnId &&
      lastTurnState === 'retryable_failure' &&
      !dismissed.has(lastTurnId)
    ) {
      document.getElementById(`ask-failure-${lastTurnId}`)?.focus()
    }
  }, [dismissed, lastTurnId, lastTurnState])

  // A paused device returns to Ask once its own retry time has passed.
  useEffect(() => {
    if (availability.kind !== 'cooldown') return
    const wait =
      Math.max(0, Date.parse(availability.retryAt) - Date.now()) + 1000
    const timer = window.setTimeout(
      () => setAvailability({ kind: 'available' }),
      wait,
    )
    return () => window.clearTimeout(timer)
  }, [availability])

  // Expiry removes private content from the page and the recent handles.
  useEffect(() => {
    if (!conversation || !adapter) return
    const sweep = () => {
      if (Date.parse(conversation.expiresAt) >= Date.now()) return
      previousConversation.current = null
      setConversation(null)
      setExpired(true)
      setDismissed(new Set())
      setDraft('')
      void adapter.listRecent().then(setRecent)
    }
    const timer = window.setInterval(sweep, EXPIRY_SWEEP_MS)
    return () => window.clearInterval(timer)
  }, [adapter, conversation])

  const openHandle = useCallback(
    async (handle: AskRecentConversation) => {
      if (!adapter) return
      const view = await adapter.open(handle.localHandle)
      if (!view) {
        setRecent((current) =>
          current.filter((item) => item.localHandle !== handle.localHandle),
        )
        setExpired(true)
        previousConversation.current = null
        setConversation(null)
        return
      }
      setExpired(false)
      setDismissed(new Set())
      setViewScope(view.scope)
      handleConversation(view)
    },
    [adapter, handleConversation],
  )

  const handleOpenRecent = useCallback(
    (handle: AskRecentConversation) => {
      if (turns.length > 0) {
        setPendingHandle(handle)
        return
      }
      void openHandle(handle)
    },
    [openHandle, turns.length],
  )

  const confirmScopeChange = useCallback(() => {
    const handle = pendingHandle
    setPendingHandle(null)
    if (handle) void openHandle(handle)
  }, [openHandle, pendingHandle])

  const handleClearRecent = useCallback(async () => {
    if (!adapter) return
    await adapter.clearRecent()
    setRecent([])
  }, [adapter])

  const handleSuggestion = useCallback((suggestion: string) => {
    setDraft(suggestion)
    inputRef.current?.focus()
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!adapter || !canSubmit) return
    const question = draft.trim()
    try {
      await adapter.submit({
        conversationId: conversation?.id,
        scope: viewScope,
        question,
        idempotencyKey: crypto.randomUUID(),
      })
    } catch (error) {
      if (!(error instanceof AskRequestError)) throw error
      // The adapter pushed the availability change. Keep the draft.
      return
    }
    // Clear the draft only after the submission is accepted.
    setDraft('')
    setStatus('Checking the official record')
  }, [adapter, canSubmit, conversation?.id, draft, viewScope])

  const handleRetry = useCallback(
    async (turnId: string) => {
      if (!adapter || !conversation) return
      try {
        await adapter.retry({
          conversationId: conversation.id,
          turnId,
          idempotencyKey: crypto.randomUUID(),
        })
      } catch (error) {
        if (!(error instanceof AskRequestError)) throw error
        return
      }
      setStatus('Checking the official record')
    },
    [adapter, conversation],
  )

  const handleDismiss = useCallback((turnId: string) => {
    setDismissed((current) => new Set(current).add(turnId))
  }, [])

  const handleResolveChallenge = useCallback(async () => {
    if (!adapter || availability.kind !== 'captcha') return
    await adapter.resolveChallenge(availability.challengeId)
  }, [adapter, availability])

  const citations: CitationMap = useMemo(() => {
    const merged: CitationMap = {}
    for (const turn of turns) {
      if (!turn.answer) continue
      Object.assign(merged, turn.answer.citations)
    }
    return merged
  }, [conversation])

  const selected = resolveCitationId(citations, source)
  const panelOpen = wide && selected != null
  const sticky = turns.length > 0
  const empty = turns.length === 0 && !expired
  const kbStyle = { '--ask-kb': `${kbInset}px` } as CSSProperties

  return (
    <main className="ask-page" id="resident-main" style={kbStyle}>
      <AskStatusRegion message={status} />

      <header className="ask-head">
        <h1 className="ask-title">Ask Public Parish</h1>
        <p className="ask-lede">
          Answers come only from published, validated official evidence.
        </p>
      </header>

      {data.availability.kind === 'unavailable' && !data.scenario ? (
        <AskUnavailable />
      ) : data.scenario && !adapter ? (
        <div className="ask-waiting" role="status">
          <Spinner aria-hidden="true" />
          <span className="visually-hidden">Preparing Ask</span>
        </div>
      ) : (
        <EvidenceProvider
          citations={citations}
          onSelect={onSelectSource}
          selected={selected}
        >
          <AskScopeBar scope={viewScope} />

          <div className="ask-layout" data-panel-open={panelOpen || undefined}>
            <div className="ask-reading">
              <section aria-label="Conversation" className="ask-thread-region">
                {expired ? (
                  <AskExpiredNotice
                    onRestart={() => {
                      setExpired(false)
                      void adapter?.startNew(viewScope)
                    }}
                  />
                ) : null}
                {turns.length > 0 ? (
                  <AskThread
                    dismissedTurnIds={dismissed}
                    onDismiss={handleDismiss}
                    onRetry={handleRetry}
                    onSuggestion={handleSuggestion}
                    turns={turns}
                  />
                ) : null}
                {!expired && availability.kind === 'cooldown' ? (
                  <AskCooldownNotice retryAt={availability.retryAt} />
                ) : null}
                {!expired && availability.kind === 'captcha' ? (
                  <AskCaptchaNotice
                    onResolve={() => void handleResolveChallenge()}
                  />
                ) : null}
                {offline ? <AskOfflineNotice /> : null}
              </section>

              <div className="ask-dock" data-sticky={sticky || undefined}>
                {pendingHandle ? (
                  <AskScopeConfirm
                    onCancel={() => setPendingHandle(null)}
                    onConfirm={confirmScopeChange}
                  />
                ) : (
                  <AskComposer
                    canSubmit={canSubmit}
                    draft={draft}
                    inputRef={inputRef}
                    label={
                      sticky
                        ? 'Ask another question'
                        : 'What do you want to understand?'
                    }
                    onDraftChange={setDraft}
                    onSubmit={() => void handleSubmit()}
                    pending={checking}
                    privacyNote={turns.length === 0}
                    sendLabel={sticky ? 'Send' : 'Send question'}
                  />
                )}
              </div>

              {empty && viewScope.kind === 'corpus' ? (
                <div className="ask-examples">
                  <h2 className="ask-examples-head">Try asking</h2>
                  <ul className="ask-suggestions-list">
                    {ASK_EXAMPLES.map((example) => (
                      <li key={example}>
                        <button
                          className="ask-suggestion"
                          onClick={() => handleSuggestion(example)}
                          type="button"
                        >
                          {example}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {empty ? (
                <AskRecent
                  onClear={() => void handleClearRecent()}
                  onOpen={handleOpenRecent}
                  recent={recent}
                />
              ) : null}
            </div>

            {panelOpen ? (
              <aside aria-label="Official source" className="ask-rail">
                <EvidencePanel />
              </aside>
            ) : null}
          </div>
        </EvidenceProvider>
      )}
    </main>
  )
}

function AskScopeBar({ scope }: { scope: AskScope }) {
  if (scope.kind === 'corpus') {
    return <p className="ask-scope-line">{scope.label}</p>
  }

  return (
    <div className="ask-scope">
      <p className="ask-scope-label">{scope.label}</p>
      <div className="ask-scope-row">
        <p className="ask-scope-title">{scope.recordTitle}</p>
        <Link className="ask-scope-back" to={scope.returnTo}>
          <ArrowLeftIcon aria-hidden="true" />
          {scope.kind === 'issue' ? 'Back to issue' : 'Back to meeting'}
        </Link>
      </div>
    </div>
  )
}
