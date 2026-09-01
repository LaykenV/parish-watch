import type { ConvexReactClient } from 'convex/react'

import { api } from '../../../convex/_generated/api'
import { askScopeIdentity } from './contracts'
import type { AskScope } from './contracts'

const TOKEN_STORAGE_KEY = 'public-parish.ask.session-token.v1'
const THREAD_STORAGE_KEY = 'public-parish.ask.thread-handles.v1'
const MAX_LOCAL_HANDLES = 20

export type LiveAskThreadHandle = {
  threadId: string
  scopeKey: string
  expiresAt: number
  lastActivityAt: number
}

export class LiveAskThreadClient {
  constructor(
    private readonly client: ConvexReactClient,
    private readonly storage: Storage,
  ) {}

  async createSession() {
    const token = this.sessionToken()
    return await this.client.mutation(api.ask.threads.createSession, { token })
  }

  async start(scope: AskScope): Promise<LiveAskThreadHandle> {
    const token = this.sessionToken()
    await this.client.mutation(api.ask.threads.createSession, { token })
    const created = await this.client.mutation(api.ask.threads.createThread, {
      token,
      scope: backendScope(scope),
    })
    const handle = {
      threadId: created.threadId,
      scopeKey: askScopeIdentity(scope),
      expiresAt: created.expiresAt,
      lastActivityAt: Date.now(),
    }
    this.remember(handle)
    return handle
  }

  async appendQuestion(
    threadId: string,
    question: string,
    idempotencyKey: string,
  ) {
    const result = await this.client.mutation(api.ask.threads.appendQuestion, {
      token: this.sessionToken(),
      threadId,
      question,
      idempotencyKey,
    })
    this.touch(threadId)
    return result
  }

  async history(threadId: string, cursor: string | null = null) {
    return await this.client.query(api.ask.threads.getHistory, {
      token: this.sessionToken(),
      threadId,
      paginationOpts: { numItems: 40, cursor },
    })
  }

  async retrieveEvidence(threadId: string, question: string) {
    return await this.client.query(api.ask.evidence.retrieveEvidence, {
      token: this.sessionToken(),
      threadId,
      question,
    })
  }

  recent(): LiveAskThreadHandle[] {
    const now = Date.now()
    const handles = parseHandles(this.storage.getItem(THREAD_STORAGE_KEY))
      .filter((handle) => handle.expiresAt > now)
      .sort((left, right) => right.lastActivityAt - left.lastActivityAt)
      .slice(0, MAX_LOCAL_HANDLES)
    this.storage.setItem(THREAD_STORAGE_KEY, JSON.stringify(handles))
    return handles
  }

  clearRecent() {
    this.storage.removeItem(THREAD_STORAGE_KEY)
  }

  private sessionToken(): string {
    const stored = this.storage.getItem(TOKEN_STORAGE_KEY)
    if (stored && stored.length >= 32 && !/\s/.test(stored)) return stored
    const bytes = crypto.getRandomValues(new Uint8Array(32))
    const token = Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('')
    this.storage.setItem(TOKEN_STORAGE_KEY, token)
    return token
  }

  private remember(handle: LiveAskThreadHandle) {
    const handles = [
      handle,
      ...this.recent().filter((item) => item.threadId !== handle.threadId),
    ].slice(0, MAX_LOCAL_HANDLES)
    this.storage.setItem(THREAD_STORAGE_KEY, JSON.stringify(handles))
  }

  private touch(threadId: string) {
    const handles = this.recent().map((handle) =>
      handle.threadId === threadId
        ? { ...handle, lastActivityAt: Date.now() }
        : handle,
    )
    this.storage.setItem(THREAD_STORAGE_KEY, JSON.stringify(handles))
  }
}

function backendScope(scope: AskScope) {
  if (scope.kind === 'issue') {
    return { kind: 'issue' as const, issueSlug: scope.issueSlug }
  }
  if (scope.kind === 'meeting') {
    return { kind: 'meeting' as const, meetingId: scope.meetingId }
  }
  return { kind: 'corpus' as const, areaKey: scope.areaKey }
}

function parseHandles(value: string | null): LiveAskThreadHandle[] {
  if (!value) return []
  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((item) => {
      if (
        !item ||
        typeof item !== 'object' ||
        !('threadId' in item) ||
        !('scopeKey' in item) ||
        !('expiresAt' in item) ||
        !('lastActivityAt' in item) ||
        typeof item.threadId !== 'string' ||
        typeof item.scopeKey !== 'string' ||
        typeof item.expiresAt !== 'number' ||
        typeof item.lastActivityAt !== 'number'
      ) {
        return []
      }
      return [
        {
          threadId: item.threadId,
          scopeKey: item.scopeKey,
          expiresAt: item.expiresAt,
          lastActivityAt: item.lastActivityAt,
        },
      ]
    })
  } catch {
    return []
  }
}
