import type { ConvexReactClient } from 'convex/react'
import { beforeEach, expect, test, vi } from 'vitest'

import { corpusScope } from './contracts'
import type { AskConversationView, AskUpdate } from './contracts'
import { LiveAskAdapter } from './live-adapter'

beforeEach(() => {
  vi.stubGlobal('navigator', { onLine: true })
})

test('shows the first question immediately and completes two cited turns', async () => {
  const storage = memoryStorage()
  const firstAnswer = deferred<ReturnType<typeof answerResult>>()
  const mutation = vi
    .fn()
    .mockResolvedValueOnce({ expiresAt: 2_000_000_000_000 })
    .mockResolvedValueOnce({
      threadId: 'agent-thread-1',
      expiresAt: 2_000_000_000_000,
      scope: { kind: 'corpus', areaKey: 'lafayette-parish' },
    })
    .mockResolvedValueOnce({ messageId: 'question-1', replayed: false })
    .mockResolvedValueOnce({ messageId: 'question-2', replayed: false })
  const action = vi
    .fn()
    .mockReturnValueOnce(firstAnswer.promise)
    .mockResolvedValueOnce(
      answerResult({
        kind: 'not_found',
        answer: 'The accepted records do not state the maintenance schedule.',
        citations: [],
        messageId: 'answer-2',
      }),
    )
  const adapter = new LiveAskAdapter(
    { mutation, action, query: vi.fn() } as unknown as ConvexReactClient,
    storage,
  )
  const updates: AskUpdate[] = []
  adapter.subscribe((update) => updates.push(update))

  const first = adapter.submit({
    scope: corpusScope('lafayette-parish'),
    question: 'What changed about drainage?',
    idempotencyKey: 'question-key-000000000001',
  })
  await vi.waitFor(() => {
    expect(latestConversation(updates)?.turns[0]).toMatchObject({
      question: 'What changed about drainage?',
      state: 'checking',
    })
  })
  firstAnswer.resolve(answerResult())
  await first

  const firstConversation = latestConversation(updates)
  expect(firstConversation?.turns[0]).toMatchObject({
    id: 'question-1',
    state: 'complete',
    answer: {
      kind: 'supported',
      citations: {
        'citation-1': {
          excerpt: { quote: 'The council approved the drainage agreement.' },
          officialUrl: 'https://lafayettela.gov/official.pdf',
        },
      },
    },
  })

  await adapter.submit({
    conversationId: firstConversation!.id,
    scope: firstConversation!.scope,
    question: 'Who maintains it?',
    idempotencyKey: 'question-key-000000000002',
  })
  expect(latestConversation(updates)?.turns).toMatchObject([
    { id: 'question-1', state: 'complete' },
    {
      id: 'question-2',
      state: 'complete',
      answer: { kind: 'not_found' },
    },
  ])
  expect(JSON.stringify([...storage.entries()])).not.toContain(
    'What changed about drainage?',
  )
})

test('rebuilds a refreshed conversation from Agent history and exact citations', async () => {
  const storage = memoryStorage()
  const mutation = vi
    .fn()
    .mockResolvedValueOnce({ expiresAt: 2_000_000_000_000 })
    .mockResolvedValueOnce({
      threadId: 'agent-thread-refresh',
      expiresAt: 2_000_000_000_000,
      scope: { kind: 'corpus', areaKey: 'lafayette-parish' },
    })
    .mockResolvedValueOnce({ messageId: 'question-refresh', replayed: false })
  const firstClient = {
    mutation,
    action: vi.fn().mockResolvedValue(answerResult()),
    query: vi.fn(),
  } as unknown as ConvexReactClient
  const firstAdapter = new LiveAskAdapter(firstClient, storage)
  await firstAdapter.submit({
    scope: corpusScope('lafayette-parish'),
    question: 'What changed about drainage?',
    idempotencyKey: 'question-key-refresh-0001',
  })

  const refreshedClient = {
    query: vi.fn().mockResolvedValue({
      scope: { kind: 'corpus', areaKey: 'lafayette-parish' },
      expiresAt: 2_000_000_000_000,
      page: [
        {
          id: 'question-refresh',
          role: 'user',
          text: 'What changed about drainage?',
          createdAt: 1_900_000_000_000,
        },
        {
          id: 'answer-refresh',
          role: 'assistant',
          text: '{}',
          createdAt: 1_900_000_000_001,
        },
      ],
      continueCursor: '',
      isDone: true,
    }),
    action: vi.fn().mockResolvedValue(answerResult({ replayed: true })),
    mutation: vi.fn(),
  } as unknown as ConvexReactClient
  const refreshed = new LiveAskAdapter(refreshedClient, storage)
  await expect(refreshed.open('agent-thread-refresh')).resolves.toMatchObject({
    id: 'agent-thread-refresh',
    turns: [{ id: 'question-refresh', state: 'complete' }],
  })
})

test('turns server cooldown and expiry into resident states', async () => {
  const retryAt = Date.now() + 60_000
  const storage = memoryStorage()
  const mutation = vi
    .fn()
    .mockResolvedValueOnce({ expiresAt: 2_000_000_000_000 })
    .mockResolvedValueOnce({
      threadId: 'agent-thread-cooldown',
      expiresAt: 2_000_000_000_000,
      scope: { kind: 'corpus', areaKey: 'lafayette-parish' },
    })
    .mockResolvedValueOnce({ messageId: 'question-cooldown', replayed: false })
  const client = {
    mutation,
    action: vi.fn().mockRejectedValue({
      data: { code: 'ask_token_limited', retryAt },
    }),
    query: vi.fn(),
  } as unknown as ConvexReactClient
  const adapter = new LiveAskAdapter(client, storage)
  const updates: AskUpdate[] = []
  adapter.subscribe((update) => updates.push(update))
  await adapter.submit({
    scope: corpusScope('lafayette-parish'),
    question: 'What changed?',
    idempotencyKey: 'question-key-cooldown-001',
  })
  expect(updates).toContainEqual({
    kind: 'availability',
    availability: {
      kind: 'cooldown',
      retryAt: new Date(retryAt).toISOString(),
    },
  })
  expect(latestConversation(updates)?.turns[0]?.state).toBe('retryable_failure')

  const expiredClient = {
    query: vi.fn().mockRejectedValue({
      data: { code: 'session_expired' },
    }),
    action: vi.fn(),
    mutation: vi.fn(),
  } as unknown as ConvexReactClient
  const expired = new LiveAskAdapter(expiredClient, storage)
  const expiredUpdates: AskUpdate[] = []
  expired.subscribe((update) => expiredUpdates.push(update))
  await expect(expired.open('agent-thread-cooldown')).resolves.toBeNull()
  expect(expiredUpdates).toContainEqual({ kind: 'expired' })
})

function answerResult(
  overrides: Partial<{
    kind: 'answer' | 'not_found'
    answer: string
    citations: ReturnType<typeof citation>[]
    followUps: string[]
    messageId: string
    replayed: boolean
  }> = {},
) {
  return {
    kind: 'answer' as const,
    answer: 'The council approved the drainage agreement.',
    citations: [citation()],
    followUps: ['Which body approved it?'],
    messageId: 'answer-1',
    replayed: false,
    ...overrides,
  }
}

function citation() {
  return {
    evidenceId: 'citation-1',
    recordKey: 'CO-100-2026',
    fieldPath: '/plainLanguageSummary',
    documentTitle: 'Drainage agreement',
    bodyName: 'Lafayette City Council',
    sourceKind: 'resolution',
    officialUrl: 'https://lafayettela.gov/official.pdf',
    excerpt: 'The council approved the drainage agreement.',
    page: 4,
    section: null,
    retrievedAt: 1_900_000_000_000,
    sourceHref: '/decisions/CO-100-2026?source=citation-1',
  }
}

function latestConversation(updates: AskUpdate[]): AskConversationView | null {
  return (
    updates
      .filter(
        (update): update is Extract<AskUpdate, { kind: 'conversation' }> =>
          update.kind === 'conversation',
      )
      .at(-1)?.conversation ?? null
  )
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

function memoryStorage(): Storage & { entries: () => Array<[string, string]> } {
  const values = new Map<string, string>()
  return {
    get length() {
      return values.size
    },
    clear: () => values.clear(),
    entries: () => [...values.entries()],
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => void values.delete(key),
    setItem: (key, value) => void values.set(key, value),
  }
}
