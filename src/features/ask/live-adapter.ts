import type { ConvexReactClient } from 'convex/react'

import { api } from '../../../convex/_generated/api'
import type {
  AskAnswerResult,
  AskEvidence,
} from '../../../convex/ask/contracts'
import type {
  CitationData,
  CitationMap,
  DocumentKind,
} from '../evidence/contracts'
import { inactiveAskChallengeAdapter } from './abuse'
import type { AskChallengeAdapter } from './abuse'
import {
  AskRequestError,
  corpusScope,
  routeSearchFromScopeKey,
} from './contracts'
import type {
  AskAdapter,
  AskAvailability,
  AskConversationView,
  AskNotFoundAnswer,
  AskRecentConversation,
  AskRouteSearch,
  AskScope,
  AskSubmission,
  AskSupportedAnswer,
  AskTurnView,
  AskUpdate,
} from './contracts'
import { LiveAskThreadClient } from './live-thread-client'

const NOT_FOUND_STATEMENT =
  'Public Parish did not find that answer in the official sources it has validated for this scope.'

type Listener = (update: AskUpdate) => void

export class LiveAskAdapter implements AskAdapter {
  private readonly threads: LiveAskThreadClient
  private readonly listeners = new Set<Listener>()
  private conversation: AskConversationView | null = null
  private availability: AskAvailability = { kind: 'available' }

  constructor(
    private readonly client: ConvexReactClient,
    storage: Storage,
    private readonly challenge: AskChallengeAdapter = inactiveAskChallengeAdapter,
  ) {
    this.threads = new LiveAskThreadClient(client, storage)
  }

  async resolveScope(input: AskRouteSearch): Promise<AskScope> {
    if (input.scope === 'issue') {
      const issue = await this.client.query(
        api.resident.evidence.getPublishedIssue,
        { slug: input.issue },
      )
      return {
        kind: 'issue',
        issueSlug: input.issue,
        label: 'Answering from this issue',
        recordTitle: issue?.title ?? 'Issue evidence unavailable',
        returnTo: input.returnTo ?? `/issues/${input.issue}`,
      }
    }
    if (input.scope === 'meeting') {
      const meeting = await this.client.query(
        api.resident.evidence.getPublishedMeeting,
        { meetingKey: input.meeting },
      )
      return {
        kind: 'meeting',
        meetingId: input.meeting,
        label: 'Answering from this meeting',
        recordTitle: meeting
          ? `${meeting.bodyName}, ${formatMeetingDate(meeting.meetingAt)}`
          : 'Meeting evidence unavailable',
        returnTo: input.returnTo ?? `/meetings/${input.meeting}`,
      }
    }
    return corpusScope(input.area)
  }

  async listRecent(): Promise<AskRecentConversation[]> {
    const recent = await Promise.all(
      this.threads.recent().map(async (handle) => {
        const scope = await this.resolveScope(
          routeSearchFromScopeKey(handle.scopeKey),
        )
        return {
          localHandle: handle.threadId,
          scopeLabel: shortScopeLabel(scope),
          latestActivityAt: new Date(handle.lastActivityAt).toISOString(),
          expiresAt: new Date(handle.expiresAt).toISOString(),
        }
      }),
    )
    return recent
  }

  async open(localHandle: string): Promise<AskConversationView | null> {
    const handle = this.threads
      .recent()
      .find((item) => item.threadId === localHandle)
    if (!handle) return null
    try {
      const history = await this.threads.history(localHandle)
      const scope = await this.resolveScope(
        routeSearchFromScopeKey(handle.scopeKey),
      )
      const turns = await this.projectHistory(localHandle, history.page)
      this.conversation = {
        id: localHandle,
        scope,
        expiresAt: new Date(history.expiresAt).toISOString(),
        turns,
      }
      this.pushConversation()
      return this.conversation
    } catch (error) {
      if (errorCode(error) === 'session_expired') {
        this.threads.forget(localHandle)
        this.push({ kind: 'expired' })
        return null
      }
      throw error
    }
  }

  async submit(input: AskSubmission): Promise<void> {
    if (!navigator.onLine) {
      throw new AskRequestError({ kind: 'offline' })
    }
    const challenge = await this.challenge.challengeBeforeRequest()
    if (challenge) {
      throw new AskRequestError({
        kind: 'captcha',
        challengeId: challenge.challengeId,
      })
    }

    const temporaryId = `pending:${input.idempotencyKey}`
    const submittedAt = new Date().toISOString()
    const existing =
      this.conversation?.id === input.conversationId ? this.conversation : null
    this.conversation = {
      id: existing?.id ?? temporaryId,
      scope: input.scope,
      expiresAt:
        existing?.expiresAt ??
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      turns: [
        ...(existing?.turns ?? []),
        {
          id: temporaryId,
          question: input.question,
          askedAt: submittedAt,
          state: 'checking',
        },
      ],
    }
    this.pushConversation()

    let accepted = false
    let questionMessageId = temporaryId
    try {
      let threadId = existing?.id
      if (!threadId) {
        const started = await this.threads.start(input.scope)
        threadId = started.threadId
        this.replaceConversationIdentity(
          temporaryId,
          threadId,
          started.expiresAt,
        )
      }
      const appended = await this.threads.appendQuestion(
        threadId,
        input.question,
        input.idempotencyKey,
      )
      accepted = true
      questionMessageId = appended.messageId
      this.replaceTurnId(temporaryId, questionMessageId)
      const answer = await this.threads.answer(threadId, questionMessageId)
      this.completeTurn(questionMessageId, projectAnswer(answer))
      void this.pushRecent().catch(() => undefined)
    } catch (error) {
      this.handleRequestFailure(questionMessageId, error)
      if (!accepted) {
        this.removeTurn(questionMessageId)
        throw new AskRequestError(
          isOfflineError(error) ? { kind: 'offline' } : { kind: 'not_sent' },
        )
      }
    }
  }

  async retry(input: { conversationId: string; turnId: string }) {
    if (!navigator.onLine) throw new AskRequestError({ kind: 'offline' })
    if (!this.conversation || this.conversation.id !== input.conversationId)
      return
    this.updateTurn(input.turnId, (turn) => ({
      ...turn,
      state: 'checking',
      answer: undefined,
    }))
    try {
      const answer = await this.threads.answer(
        input.conversationId,
        input.turnId,
      )
      this.completeTurn(input.turnId, projectAnswer(answer))
    } catch (error) {
      this.handleRequestFailure(input.turnId, error)
    }
  }

  async startNew(_scope: AskScope) {
    this.conversation = null
    this.pushConversation()
  }

  async clearRecent() {
    this.threads.clearRecent()
    this.push({ kind: 'recent', recent: [] })
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener)
    listener({ kind: 'conversation', conversation: this.conversation })
    listener({ kind: 'availability', availability: this.availability })
    void this.listRecent()
      .then((recent) => listener({ kind: 'recent', recent }))
      .catch(() => listener({ kind: 'recent', recent: [] }))
    return () => this.listeners.delete(listener)
  }

  async resolveChallenge(challengeId: string) {
    if (!(await this.challenge.resolve(challengeId))) return
    this.availability = { kind: 'available' }
    this.push({ kind: 'availability', availability: this.availability })
  }

  private async projectHistory(
    threadId: string,
    messages: Array<{
      id: string
      role: 'user' | 'assistant'
      text: string
      createdAt: number
    }>,
  ): Promise<AskTurnView[]> {
    const pairs = messages.flatMap((message, index) =>
      message.role === 'user'
        ? [
            {
              question: message,
              answered: messages[index + 1]?.role === 'assistant',
            },
          ]
        : [],
    )
    return await Promise.all(
      pairs.map(async ({ question, answered }) => {
        if (!answered) {
          return {
            id: question.id,
            question: question.text,
            askedAt: new Date(question.createdAt).toISOString(),
            state: 'retryable_failure' as const,
          }
        }
        try {
          const answer = await this.threads.answer(threadId, question.id, false)
          return {
            id: question.id,
            question: question.text,
            askedAt: new Date(question.createdAt).toISOString(),
            state: 'complete' as const,
            answer: projectAnswer(answer),
          }
        } catch {
          return {
            id: question.id,
            question: question.text,
            askedAt: new Date(question.createdAt).toISOString(),
            state: 'terminal_failure' as const,
          }
        }
      }),
    )
  }

  private handleRequestFailure(turnId: string, error: unknown) {
    const code = errorCode(error)
    if (code === 'session_expired' || code === 'thread_not_found') {
      this.conversation = null
      this.pushConversation()
      this.push({ kind: 'expired' })
      return
    }
    const retryAt = errorRetryAt(error)
    if (
      code === 'ask_request_limited' ||
      code === 'ask_daily_limited' ||
      code === 'ask_token_limited' ||
      code === 'answer_concurrent' ||
      code === 'answer_in_progress'
    ) {
      this.availability = {
        kind: 'cooldown',
        retryAt: new Date(retryAt ?? Date.now() + 60_000).toISOString(),
      }
      this.push({ kind: 'availability', availability: this.availability })
      this.updateTurn(turnId, (turn) => ({
        ...turn,
        state: 'retryable_failure',
      }))
      return
    }
    const retryable =
      code === 'answer_provider_failed' ||
      code === 'answer_storage_failed' ||
      code === 'answer_abandoned' ||
      isOfflineError(error)
    this.updateTurn(turnId, (turn) => ({
      ...turn,
      state: retryable ? 'retryable_failure' : 'terminal_failure',
    }))
    if (isOfflineError(error)) {
      this.availability = { kind: 'offline' }
      this.push({ kind: 'availability', availability: this.availability })
    }
  }

  private replaceConversationIdentity(
    temporaryId: string,
    threadId: string,
    expiresAt: number,
  ) {
    if (!this.conversation || this.conversation.id !== temporaryId) return
    this.conversation = {
      ...this.conversation,
      id: threadId,
      expiresAt: new Date(expiresAt).toISOString(),
    }
    this.pushConversation()
  }

  private replaceTurnId(before: string, after: string) {
    this.updateTurn(before, (turn) => ({ ...turn, id: after }))
  }

  private completeTurn(
    turnId: string,
    answer: AskSupportedAnswer | AskNotFoundAnswer,
  ) {
    this.availability = { kind: 'available' }
    this.push({ kind: 'availability', availability: this.availability })
    this.updateTurn(turnId, (turn) => ({
      ...turn,
      state: 'complete',
      answer,
    }))
  }

  private removeTurn(turnId: string) {
    if (!this.conversation) return
    const next = {
      ...this.conversation,
      turns: this.conversation.turns.filter((turn) => turn.id !== turnId),
    }
    this.conversation =
      next.turns.length === 0 && next.id.startsWith('pending:') ? null : next
    this.pushConversation()
  }

  private updateTurn(
    turnId: string,
    update: (turn: AskTurnView) => AskTurnView,
  ) {
    if (!this.conversation) return
    this.conversation = {
      ...this.conversation,
      turns: this.conversation.turns.map((turn) =>
        turn.id === turnId ? update(turn) : turn,
      ),
    }
    this.pushConversation()
  }

  private async pushRecent() {
    this.push({ kind: 'recent', recent: await this.listRecent() })
  }

  private pushConversation() {
    this.push({ kind: 'conversation', conversation: this.conversation })
  }

  private push(update: AskUpdate) {
    for (const listener of this.listeners) listener(update)
  }
}

function projectAnswer(
  result: AskAnswerResult,
): AskSupportedAnswer | AskNotFoundAnswer {
  if (result.kind === 'not_found') {
    return {
      kind: 'not_found',
      statement: NOT_FOUND_STATEMENT,
      explanation: result.answer,
      citations: {},
      suggestions: result.followUps,
    }
  }
  const citationIds = result.citations.map((item) => item.evidenceId)
  if (citationIds.length === 0) {
    throw new Error('A supported Ask answer did not include a citation')
  }
  return {
    kind: 'supported',
    lead: {
      id: result.messageId,
      text: result.answer,
      citationIds: citationIds as [string, ...string[]],
    },
    claims: [],
    citations: citationMap(result.citations),
    suggestions: result.followUps,
  }
}

function citationMap(values: AskEvidence[]): CitationMap {
  return Object.fromEntries(
    values.map((citation) => {
      const value: CitationData = {
        body: citation.bodyName,
        documentKind: documentKind(citation.sourceKind),
        documentTitle: citation.documentTitle,
        excerpt: { quote: citation.excerpt },
        id: citation.evidenceId,
        locator:
          citation.section ??
          (citation.page ? `Page ${citation.page}` : citation.documentTitle),
        officialUrl: citation.officialUrl,
        page: citation.page ?? undefined,
        retrievedAt: new Date(citation.retrievedAt).toISOString(),
        section: citation.section ?? undefined,
      }
      return [value.id, value]
    }),
  )
}

function documentKind(kind: string): DocumentKind {
  switch (kind) {
    case 'agenda':
      return 'Agenda'
    case 'minutes':
      return 'Minutes'
    case 'ordinance':
      return 'Ordinance'
    case 'resolution':
      return 'Resolution'
    case 'notice':
    case 'calendar':
      return 'Public notice'
    case 'packet':
    case 'planning_case':
      return 'Agenda packet'
    default:
      return 'Meeting results'
  }
}

function shortScopeLabel(scope: AskScope) {
  if (scope.kind === 'corpus') return scope.label
  return scope.recordTitle
}

function formatMeetingDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeZone: 'America/Chicago',
  }).format(new Date(value))
}

function errorData(error: unknown): Record<string, unknown> | null {
  if (!error || typeof error !== 'object') return null
  if ('data' in error && error.data && typeof error.data === 'object') {
    return error.data as Record<string, unknown>
  }
  if ('cause' in error) return errorData(error.cause)
  return null
}

function errorCode(error: unknown) {
  const code = errorData(error)?.code
  return typeof code === 'string' ? code : null
}

function errorRetryAt(error: unknown) {
  const retryAt = errorData(error)?.retryAt
  return typeof retryAt === 'number' ? retryAt : null
}

function isOfflineError(error: unknown) {
  if (!navigator.onLine) return true
  return error instanceof TypeError && /fetch|network/i.test(error.message)
}

export function createLiveAskAdapter(
  client: ConvexReactClient,
  storage: Storage,
) {
  return new LiveAskAdapter(client, storage)
}
