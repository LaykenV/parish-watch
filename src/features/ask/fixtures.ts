import type { AreaSlug } from '../discovery/contracts'
import {
  DECISION_DETAIL_FIXTURES,
  MEETING_DETAIL_FIXTURES,
} from '../evidence/record-fixtures'
import type { CitationData, CitationMap } from '../evidence/contracts'
import type {
  AskAdapter,
  AskAvailability,
  AskConversationView,
  AskNotFoundAnswer,
  AskRecentConversation,
  AskRouteSearch,
  AskScope,
  AskScenario,
  AskSubmission,
  AskSupportedAnswer,
  AskTurnView,
  AskUpdate,
} from './contracts'
import { AskRequestError, corpusScope } from './contracts'

/*
  Development-only presentation fixtures for Ask. Nothing here is evidence
  that the chat backend works: these scenarios prove layout and state
  behavior while the anonymous chat adapter is still behind its integration
  gate. This module is loaded only through a DEV-gated dynamic import; a
  production bundle never requests it.

  The supported threads reuse the real development citation records for
  CO-022-2026 and CO-023-2026 so every claim matches its document. Two
  questions are the proof scenario, not a visible limit: the fixture
  recognizes the two proven questions and answers unknown questions with an
  honest not-found instead of inventing text.
*/

const ISSUE_SLUG = 'surplus-pickup-donations'
const MEETING_ID = 'lafayette-city-parish-council-2026-04-21'
const THREAD_HANDLE = 'ask-fixture-thread'
const DAY_MS = 24 * 60 * 60 * 1000
const SETTLE_MS = 1600

const AVAILABLE: AskAvailability = { kind: 'available' }

const CO_022 = DECISION_DETAIL_FIXTURES['CO-022-2026'].citations
const CO_023 = DECISION_DETAIL_FIXTURES['CO-023-2026'].citations

function citation(map: CitationMap, id: string): CitationData {
  const entry = map[id]
  if (!entry) throw new Error(`Missing ask fixture citation: ${id}`)
  return entry
}

const TRUCK_ANSWER: AskSupportedAnswer = {
  kind: 'supported',
  lead: {
    id: 'ask-claim-truck-lead',
    text: 'Lafayette donated the surplus 2016 Chevrolet Silverado pickup to Terrebonne Parish Consolidated Government.',
    citationIds: ['co022.title'],
  },
  claims: [
    {
      id: 'ask-claim-truck-vote',
      text: 'The City-Parish Council approved the donation on April 21, 2026, with a recorded vote of 9 yeas, 0 nays, and 0 absent.',
      citationIds: ['co022.vote'],
    },
    {
      id: 'ask-claim-truck-costs',
      text: 'No money went to Lafayette. The recipient parish pays the transfer, registration, and transportation costs.',
      citationIds: ['co022.payment', 'co023.title'],
    },
  ],
  citations: {
    'co022.title': citation(CO_022, 'co022.title'),
    'co022.vote': citation(CO_022, 'co022.vote'),
    'co022.payment': citation(CO_022, 'co022.payment'),
    'co023.title': citation(CO_023, 'co023.title'),
  },
  suggestions: ['Did Lafayette receive payment?', 'What was the vote?'],
}

const PAYMENT_ANSWER: AskSupportedAnswer = {
  kind: 'supported',
  lead: {
    id: 'ask-claim-payment-lead',
    text: 'No. The adopted records state that Lafayette received no payment for the truck.',
    citationIds: ['co022.payment'],
  },
  claims: [
    {
      id: 'ask-claim-payment-costs',
      text: 'The act of donation, CO-023-2026, repeats that all transfer, registration, and transportation costs fall on the recipient parish.',
      citationIds: ['co023.title'],
    },
  ],
  citations: {
    'co022.payment': citation(CO_022, 'co022.payment'),
    'co023.title': citation(CO_023, 'co023.title'),
  },
  suggestions: ['What was the vote?', 'Who received the truck?'],
}

const MAINTENANCE_NOT_FOUND: AskNotFoundAnswer = {
  kind: 'not_found',
  statement:
    'Public Parish did not find that answer in the official sources it has validated for this issue.',
  explanation:
    'I checked the records available for this issue, but they do not say who will maintain the property after the transfer.',
  closestNote:
    'The agreement describes the transfer, but not future maintenance.',
  closestCitationId: 'co022.title',
  citations: { 'co022.title': citation(CO_022, 'co022.title') },
  suggestions: ['Who received the truck?', 'What was the vote?'],
}

function unknownQuestionAnswer(question: string): AskNotFoundAnswer {
  return {
    kind: 'not_found',
    statement:
      'Public Parish did not find that answer in the official sources it has validated for this issue.',
    explanation: `The validated records for this issue cover the donation, the vote, and the transfer costs. They do not answer "${question}".`,
    citations: {},
    suggestions: ['Who received the truck?', 'Did Lafayette receive payment?'],
  }
}

/* Scopes */

function issueScope(
  slug: string = ISSUE_SLUG,
  returnTo?: string,
): AskScope | null {
  const record = Object.values(DECISION_DETAIL_FIXTURES).find(
    (fixture) => fixture.decision.issue?.slug === slug,
  )
  const issue = record?.decision.issue
  if (!record || !issue) return null
  return {
    kind: 'issue',
    issueSlug: slug,
    label: 'Answering from this issue',
    recordTitle: issue.title,
    returnTo: returnTo ?? `/issues/${slug}`,
  }
}

function meetingScope(
  meetingId: string = MEETING_ID,
  returnTo?: string,
): AskScope | null {
  if (!Object.hasOwn(MEETING_DETAIL_FIXTURES, meetingId)) return null
  const record = MEETING_DETAIL_FIXTURES[meetingId]
  return {
    kind: 'meeting',
    meetingId,
    label: 'Answering from this meeting',
    recordTitle: record.meeting.title,
    returnTo: returnTo ?? `/meetings/${meetingId}`,
  }
}

function fixtureCorpusScope(areaKey?: AreaSlug): AskScope {
  return corpusScope(areaKey)
}

/* Seeds */

type AdapterState = {
  availability: AskAvailability
  conversation: AskConversationView | null
  recent: AskRecentConversation[]
}

function minutesAgo(minutes: number, now: number): string {
  return new Date(now - minutes * 60_000).toISOString()
}

function buildThread(scope: AskScope, now: number): AskConversationView {
  const turns: AskTurnView[] = [
    {
      id: 'ask-turn-truck',
      question: 'Who received the truck?',
      askedAt: minutesAgo(9, now),
      state: 'complete',
      answer: TRUCK_ANSWER,
    },
    {
      id: 'ask-turn-payment',
      question: 'Did Lafayette receive payment?',
      askedAt: minutesAgo(6, now),
      state: 'complete',
      answer: PAYMENT_ANSWER,
    },
  ]
  return {
    id: THREAD_HANDLE,
    scope,
    expiresAt: new Date(now + DAY_MS).toISOString(),
    turns,
  }
}

/* Safe short scope titles for recent rows. Never question or answer text. */
const SHORT_SCOPE_LABELS: Record<string, string> = {
  'drainage-fee-credit-cap': 'Drainage fee credit cap',
  'short-term-rental-rules': 'Short-term rental rules',
  'surplus-pickup-donations': 'Surplus pickup donations',
  'water-meter-replacement': 'Water meter replacement',
}

function threadHandle(
  conversation: AskConversationView,
): AskRecentConversation {
  const lastTurn = conversation.turns[conversation.turns.length - 1]
  return {
    localHandle: conversation.id,
    scopeLabel:
      conversation.scope.kind === 'issue'
        ? (SHORT_SCOPE_LABELS[conversation.scope.issueSlug] ??
          conversation.scope.recordTitle)
        : conversation.scope.kind === 'meeting'
          ? conversation.scope.recordTitle
          : 'Public Parish evidence',
    latestActivityAt: lastTurn.askedAt,
    expiresAt: conversation.expiresAt,
  }
}

function seedState(scenario: AskScenario, now: number): AdapterState {
  const issue = issueScope()!

  switch (scenario) {
    case 'empty-corpus':
      return {
        availability: AVAILABLE,
        conversation: null,
        recent: [
          {
            localHandle: THREAD_HANDLE,
            scopeLabel: 'Surplus pickup donations',
            latestActivityAt: minutesAgo(128, now),
            expiresAt: new Date(now + DAY_MS).toISOString(),
          },
        ],
      }
    case 'empty-issue':
    case 'empty-meeting':
      return { availability: AVAILABLE, conversation: null, recent: [] }
    case 'thread': {
      const conversation = buildThread(issue, now)
      return {
        availability: AVAILABLE,
        conversation,
        recent: [threadHandle(conversation)],
      }
    }
    case 'checking': {
      const base = buildThread(issue, now)
      return {
        availability: AVAILABLE,
        conversation: {
          ...base,
          turns: [
            base.turns[0],
            {
              id: 'ask-turn-waiting',
              question: 'Did Lafayette receive payment?',
              askedAt: new Date(now - 30_000).toISOString(),
              state: 'checking',
            },
          ],
        },
        recent: [],
      }
    }
    case 'not-found':
      return {
        availability: AVAILABLE,
        conversation: {
          id: 'ask-fixture-not-found',
          scope: issue,
          expiresAt: new Date(now + DAY_MS).toISOString(),
          turns: [
            {
              id: 'ask-turn-seed',
              question: 'Who will maintain the property after the transfer?',
              askedAt: minutesAgo(5, now),
              state: 'complete',
              answer: MAINTENANCE_NOT_FOUND,
            },
          ],
        },
        recent: [],
      }
    case 'retryable': {
      const base = buildThread(issue, now)
      return {
        availability: AVAILABLE,
        conversation: {
          ...base,
          turns: [
            base.turns[0],
            {
              id: 'ask-turn-retry',
              question: 'How much is the truck worth today?',
              askedAt: new Date(now - 60_000).toISOString(),
              state: 'retryable_failure',
            },
          ],
        },
        recent: [],
      }
    }
    case 'terminal': {
      const base = buildThread(issue, now)
      return {
        availability: AVAILABLE,
        conversation: {
          ...base,
          turns: [
            base.turns[0],
            {
              id: 'ask-turn-terminal',
              question: 'What did the mayor say about the donation?',
              askedAt: new Date(now - 60_000).toISOString(),
              state: 'terminal_failure',
            },
          ],
        },
        recent: [],
      }
    }
    case 'cooldown': {
      const base = buildThread(issue, now)
      return {
        availability: {
          kind: 'cooldown',
          retryAt: new Date(now + 47 * 60_000).toISOString(),
        },
        conversation: { ...base, turns: [base.turns[0]] },
        recent: [],
      }
    }
    case 'captcha': {
      const base = buildThread(issue, now)
      return {
        availability: { kind: 'captcha', challengeId: 'ask-challenge-fixture' },
        conversation: { ...base, turns: [base.turns[0]] },
        recent: [],
      }
    }
    case 'expired':
      return {
        availability: AVAILABLE,
        conversation: null,
        recent: [
          {
            localHandle: 'ask-fixture-expired',
            scopeLabel: 'Surplus pickup donations',
            latestActivityAt: new Date(now - 26 * 60 * 60_000).toISOString(),
            expiresAt: new Date(now - 2 * 60 * 60_000).toISOString(),
          },
        ],
      }
  }
}

/* Adapter */

function createAskFixtureAdapter(scenario: AskScenario): AskAdapter {
  const now = Date.now()
  let state = seedState(scenario, now)
  const listeners = new Set<(update: AskUpdate) => void>()

  const push = (update: AskUpdate) => {
    for (const listener of listeners) listener(update)
  }
  const pushConversation = () =>
    push({ kind: 'conversation', conversation: state.conversation })
  const pushAvailability = () =>
    push({ kind: 'availability', availability: state.availability })

  const defaultScope = (): AskScope => {
    switch (scenario) {
      case 'empty-meeting':
        return meetingScope() ?? fixtureCorpusScope()
      case 'empty-corpus':
        return fixtureCorpusScope()
      default:
        return issueScope() ?? fixtureCorpusScope()
    }
  }

  const resolveForQuestion = (
    question: string,
  ): AskSupportedAnswer | AskNotFoundAnswer => {
    const text = question.toLowerCase()
    if (text.includes('who received the truck')) return TRUCK_ANSWER
    if (text.includes('payment')) return PAYMENT_ANSWER
    if (scenario === 'not-found') return MAINTENANCE_NOT_FOUND
    return unknownQuestionAnswer(question)
  }

  const settleTurn = (
    conversationId: string,
    turnId: string,
    isRetry: boolean,
  ) => {
    const conversation = state.conversation
    if (!conversation || conversation.id !== conversationId) return
    const turn = conversation.turns.find((item) => item.id === turnId)
    if (!turn || turn.state !== 'checking') return

    const fails =
      !isRetry && (scenario === 'retryable' || scenario === 'terminal')
    const nextTurn: AskTurnView = fails
      ? {
          ...turn,
          state:
            scenario === 'retryable' ? 'retryable_failure' : 'terminal_failure',
        }
      : {
          ...turn,
          state: 'complete',
          answer: resolveForQuestion(turn.question),
        }

    const updated: AskConversationView = {
      ...conversation,
      turns: conversation.turns.map((item) =>
        item.id === turnId ? nextTurn : item,
      ),
    }
    state = {
      ...state,
      conversation: updated,
      recent: state.recent.some((item) => item.localHandle === conversationId)
        ? state.recent
        : [threadHandle(updated), ...state.recent].slice(0, 5),
    }
    pushConversation()
  }

  return {
    async resolveScope(input: AskRouteSearch): Promise<AskScope> {
      if (input.scope === 'issue')
        return issueScope(input.issue, input.returnTo) ?? fixtureCorpusScope()
      if (input.scope === 'meeting')
        return (
          meetingScope(input.meeting, input.returnTo) ?? fixtureCorpusScope()
        )
      if (input.scope === 'corpus' || input.area) {
        return fixtureCorpusScope(input.area)
      }
      return defaultScope()
    },

    async listRecent() {
      return state.recent
    },

    async open(localHandle: string) {
      const conversation =
        localHandle === THREAD_HANDLE
          ? buildThread(issueScope()!, Date.now())
          : state.recent.some((item) => item.localHandle === localHandle) &&
              state.conversation?.id === localHandle
            ? state.conversation
            : null

      if (!conversation) {
        state = {
          ...state,
          recent: state.recent.filter(
            (item) => item.localHandle !== localHandle,
          ),
        }
        push({ kind: 'recent', recent: state.recent })
        return null
      }

      state = { ...state, conversation }
      pushConversation()
      return conversation
    },

    async submit(input: AskSubmission): Promise<void> {
      if (state.availability.kind === 'cooldown') {
        throw new AskRequestError({
          kind: 'cooldown',
          retryAt: state.availability.retryAt,
        })
      }
      if (state.availability.kind === 'captcha') {
        throw new AskRequestError({
          kind: 'captcha',
          challengeId: state.availability.challengeId,
        })
      }

      const submittedAt = Date.now()
      const conversation =
        state.conversation && state.conversation.id === input.conversationId
          ? state.conversation
          : {
              id: `ask-${submittedAt}`,
              scope: input.scope,
              expiresAt: new Date(submittedAt + DAY_MS).toISOString(),
              turns: [],
            }
      const turn: AskTurnView = {
        id: `ask-turn-${submittedAt}`,
        question: input.question,
        askedAt: new Date(submittedAt).toISOString(),
        state: 'checking',
      }

      state = {
        ...state,
        conversation: { ...conversation, turns: [...conversation.turns, turn] },
      }
      pushConversation()
      window.setTimeout(
        () => settleTurn(conversation.id, turn.id, false),
        SETTLE_MS,
      )
    },

    async retry(input) {
      const conversation = state.conversation
      if (!conversation || conversation.id !== input.conversationId) return
      const turn = conversation.turns.find((item) => item.id === input.turnId)
      if (
        !turn ||
        (turn.state !== 'retryable_failure' &&
          turn.state !== 'terminal_failure')
      ) {
        return
      }

      state = {
        ...state,
        conversation: {
          ...conversation,
          turns: conversation.turns.map((item) =>
            item.id === turn.id ? { ...item, state: 'checking' } : item,
          ),
        },
      }
      pushConversation()
      window.setTimeout(
        () => settleTurn(input.conversationId, input.turnId, true),
        SETTLE_MS,
      )
    },

    async startNew(_scope: AskScope) {
      state = { ...state, conversation: null }
      pushConversation()
    },

    async clearRecent() {
      state = { ...state, recent: [] }
      push({ kind: 'recent', recent: state.recent })
    },

    subscribe(listener: (update: AskUpdate) => void) {
      listeners.add(listener)
      listener({ kind: 'conversation', conversation: state.conversation })
      listener({ kind: 'availability', availability: state.availability })
      listener({ kind: 'recent', recent: state.recent })
      return () => {
        listeners.delete(listener)
      }
    },

    async resolveChallenge(challengeId: string) {
      if (
        state.availability.kind !== 'captcha' ||
        state.availability.challengeId !== challengeId
      ) {
        return
      }
      state = { ...state, availability: AVAILABLE }
      pushAvailability()
    },
  }
}

let activeAdapter: AskAdapter | null = null
let activeScenario: AskScenario | null = null

export function getAskFixtureAdapter(scenario: AskScenario): AskAdapter {
  if (!activeAdapter || activeScenario !== scenario) {
    activeAdapter = createAskFixtureAdapter(scenario)
    activeScenario = scenario
  }
  return activeAdapter
}
