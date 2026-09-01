import { Link } from '@tanstack/react-router'
import { useConvex } from 'convex/react'
import { ArrowLeftIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

import { Button } from '../../components/ui/button'
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
  shouldConfirmAskScopeChange,
} from './contracts'
import type {
  AskAdapter,
  AskAvailability,
  AskConversationView,
  AskRecentConversation,
  AskScope,
  AskTurnState,
} from './contracts'
import { setAskDraftHandoff, takeAskDraftHandoff } from './draft-handoff'
import { AskComposer } from './ask-composer'
import { createLiveAskAdapter } from './live-adapter'
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
  and the draft; it does not own provider calls. The live adapter owns private
  session and provider work. Explicit development scenarios still load through
  a dev-only dynamic import and never ship.
*/

const ASK_EXAMPLES = [
  'What decisions changed this week?',
  'What was approved about drainage?',
]

const EXPIRY_SWEEP_MS = 30_000

export function AskPage({
  data,
  onRestoreScope,
  onSelectSource,
  source,
}: {
  data: AskRouteData
  onRestoreScope: (scope: AskScope) => Promise<void>
  onSelectSource: (id: string | null) => void
  source?: string
}) {
  const kbInset = useKeyboardInset()
  const convex = useConvex()
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
  const [composerExpanded, setComposerExpanded] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState('')
  const [pendingScope, setPendingScope] = useState<{
    draft: string | null
    scope: AskScope
  } | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const previousConversation = useRef<AskConversationView | null>(null)
  const submitLock = useRef(false)

  // Consume the in-memory draft handoff, and when the public scope changes by
  // navigation, drop the previous conversation instead of showing it under a
  // new scope. Opening a recent handle goes through openHandle instead and
  // keeps its own scope.
  const consumedScope = useRef<string | null>(null)
  useEffect(() => {
    const identity = askScopeIdentity(data.scope)
    const changed = consumedScope.current !== identity
    consumedScope.current = identity
    if (!changed) return
    const handed = takeAskDraftHandoff(identity)
    const activeConversation = previousConversation.current
    if (shouldConfirmAskScopeChange(activeConversation, data.scope)) {
      setPendingScope({ draft: handed, scope: data.scope })
      return
    }
    setPendingScope(null)
    setViewScope(data.scope)
    setExpired(false)
    setComposerExpanded(false)
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

  useEffect(() => {
    if (!import.meta.env.DEV || !data.scenario) {
      setAdapter(createLiveAskAdapter(convex, window.localStorage))
      return
    }
    let cancelled = false
    import('./fixtures').then(({ getAskFixtureAdapter }) => {
      if (!cancelled) setAdapter(getAskFixtureAdapter(data.scenario!))
    })
    return () => {
      cancelled = true
    }
  }, [convex, data.scenario])

  useEffect(() => {
    if (!adapter) return
    let cancelled = false
    void adapter
      .resolveScope(data.routeSearch)
      .then((resolved) => {
        if (cancelled) return
        const activeConversation = previousConversation.current
        if (shouldConfirmAskScopeChange(activeConversation, resolved)) {
          setPendingScope((current) =>
            current ? { ...current, scope: resolved } : current,
          )
          return
        }
        setViewScope(resolved)
      })
      .catch(() => {
        if (!cancelled) setAvailability({ kind: 'offline' })
      })
    return () => {
      cancelled = true
    }
  }, [adapter, data.routeSearch])

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
    // A conversation on the page is not an expired one. Without this the
    // notice outlives the thread that replaced it, and its restart action
    // would then clear the conversation the resident just started.
    if (next) setExpired(false)
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
      else if (update.kind === 'recent') setRecent(update.recent)
      else {
        previousConversation.current = null
        setConversation(null)
        setExpired(true)
        setDraft('')
      }
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
    submitting || checking || blockingRetry || cooldown || captcha || offline
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

  useEffect(() => {
    if (online && availability.kind === 'offline') {
      setAvailability({ kind: 'available' })
    }
  }, [availability.kind, online])

  // Expiry removes private content from the page and the recent handles.
  useEffect(() => {
    if (!conversation || !adapter) return
    const sweep = () => {
      if (Date.parse(conversation.expiresAt) >= Date.now()) return
      previousConversation.current = null
      setConversation(null)
      setExpired(true)
      setComposerExpanded(false)
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
        setComposerExpanded(false)
        previousConversation.current = null
        setConversation(null)
        return
      }
      setExpired(false)
      setComposerExpanded(false)
      setDismissed(new Set())
      setViewScope(view.scope)
      // Install the conversation first so the route-sync effect recognizes
      // the same scope and does not ask to clear the thread just opened.
      handleConversation(view)
      await onRestoreScope(view.scope)
    },
    [adapter, handleConversation, onRestoreScope],
  )

  const handleOpenRecent = useCallback(
    (handle: AskRecentConversation) => {
      void openHandle(handle)
    },
    [openHandle],
  )

  const confirmScopeChange = useCallback(() => {
    const pending = pendingScope
    if (!pending) return
    setPendingScope(null)
    previousConversation.current = null
    setConversation(null)
    setViewScope(pending.scope)
    setExpired(false)
    setComposerExpanded(false)
    setDismissed(new Set())
    setDraft(pending.draft ?? '')
    void adapter?.startNew(pending.scope)
  }, [adapter, pendingScope])

  const cancelScopeChange = useCallback(() => {
    const pending = pendingScope
    setPendingScope(null)
    if (pending?.draft) {
      setAskDraftHandoff(askScopeIdentity(pending.scope), pending.draft)
      setStatus(
        'That draft is still available if you return to the new evidence scope',
      )
    }
    void onRestoreScope(viewScope)
  }, [onRestoreScope, pendingScope, viewScope])

  const handleClearRecent = useCallback(async () => {
    if (!adapter) return
    await adapter.clearRecent()
    setRecent([])
  }, [adapter])

  const expandComposer = useCallback(() => {
    setComposerExpanded(true)
    window.requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

  const handleSuggestion = useCallback(
    (suggestion: string) => {
      setDraft(suggestion)
      expandComposer()
    },
    [expandComposer],
  )

  const handleSubmit = useCallback(async () => {
    if (!adapter || !canSubmit || submitLock.current) return
    submitLock.current = true
    setSubmitting(true)
    setStatus('Checking the official record')
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
      // A refusal carries the state that caused it. Apply it here instead of
      // waiting for the adapter to push, so the page can never leave an
      // enabled composer whose Send silently does nothing. Keep the draft.
      handleAvailability(error.failure)
      return
    } finally {
      submitLock.current = false
      setSubmitting(false)
    }
    // Clear the draft only after the submission is accepted.
    setDraft('')
    setExpired(false)
    setComposerExpanded(false)
  }, [
    adapter,
    canSubmit,
    conversation?.id,
    draft,
    handleAvailability,
    viewScope,
  ])

  const handleRetry = useCallback(
    async (turnId: string) => {
      if (!adapter || !conversation) return
      setStatus('Checking the official record')
      try {
        await adapter.retry({ conversationId: conversation.id, turnId })
      } catch (error) {
        if (!(error instanceof AskRequestError)) throw error
        handleAvailability(error.failure)
        return
      }
    },
    [adapter, conversation, handleAvailability],
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
    <main
      className="ask-page"
      data-panel-open={panelOpen || undefined}
      id="resident-main"
      style={kbStyle}
    >
      <AskStatusRegion message={status} />

      <header className="ask-head">
        <h1 className="ask-title">Ask Public Parish</h1>
        <p className="ask-lede">
          Answers come only from published, validated official evidence.
        </p>
      </header>

      {data.availability.kind === 'unavailable' && !data.scenario ? (
        <AskUnavailable />
      ) : !adapter ? (
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
                      void adapter.startNew(viewScope)
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

              {!expired ? (
                <div className="ask-dock" data-sticky={sticky || undefined}>
                  {pendingScope ? (
                    <AskScopeConfirm
                      onCancel={cancelScopeChange}
                      onConfirm={confirmScopeChange}
                    />
                  ) : sticky && !composerExpanded && draft.length === 0 ? (
                    <Button
                      className="ask-compose-open"
                      disabled={composerDisabled}
                      onClick={expandComposer}
                      size="touch"
                      variant="outline"
                    >
                      Ask another question
                    </Button>
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
                      pending={checking || submitting}
                      privacyNote={turns.length === 0}
                      sendLabel={sticky ? 'Send' : 'Send question'}
                    />
                  )}
                </div>
              ) : null}

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
