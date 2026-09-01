import {
  createThread as createAgentThread,
  listMessages,
  saveMessage,
} from '@convex-dev/agent'
import { paginationOptsValidator } from 'convex/server'
import { ConvexError, v } from 'convex/values'

import { api, components, internal } from '../_generated/api'
import type { Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { mutation, query } from '../_generated/server'
import { sha256HexOfText } from '../sources/hashing'
import { askScope, scopeKey, storedScope } from './contracts'
import type { AskScope } from './contracts'

const SESSION_TTL_MS = 24 * 60 * 60 * 1000
const MAX_THREADS_PER_SESSION = 20
const MAX_MESSAGES_PER_THREAD = 40

const sessionResult = v.object({
  expiresAt: v.number(),
})

const threadResult = v.object({
  threadId: v.string(),
  scope: askScope,
  expiresAt: v.number(),
})

const historyMessage = v.object({
  id: v.string(),
  role: v.union(v.literal('user'), v.literal('assistant')),
  text: v.string(),
  createdAt: v.number(),
})

export const createSession = mutation({
  args: { token: v.string() },
  returns: sessionResult,
  handler: async (ctx, args) => {
    requireOpaqueToken(args.token)
    const now = Date.now()
    const tokenHash = await sha256HexOfText(args.token)
    const existing = await ctx.db
      .query('anonymousSessions')
      .withIndex('by_token_hash', (q) => q.eq('tokenHash', tokenHash))
      .order('desc')
      .first()
    if (existing && existing.state === 'active' && existing.expiresAt > now) {
      await ctx.db.patch(existing._id, { lastSeenAt: now })
      return { expiresAt: existing.expiresAt }
    }

    if (existing?.state === 'active') {
      await detachSession(ctx, existing._id, now)
    }
    const expiresAt = now + SESSION_TTL_MS
    const sessionId = await ctx.db.insert('anonymousSessions', {
      tokenHash,
      state: 'active',
      createdAt: now,
      expiresAt,
      lastSeenAt: now,
    })
    await ctx.scheduler.runAt(expiresAt, internal.ask.sessions.expireSession, {
      sessionId,
      expectedExpiresAt: expiresAt,
    })
    return { expiresAt }
  },
})

export const createThread = mutation({
  args: { token: v.string(), scope: askScope },
  returns: threadResult,
  handler: async (ctx, args) => {
    const session = await authorizeMutation(ctx, args.token)
    await requirePublishedScope(ctx, args.scope)
    const current = await ctx.db
      .query('askThreadAccess')
      .withIndex('by_session_and_last_activity_at', (q) =>
        q.eq('sessionId', session._id),
      )
      .take(MAX_THREADS_PER_SESSION + 1)
    if (
      current.filter((item) => !item.detachedAt).length >=
      MAX_THREADS_PER_SESSION
    ) {
      throw askError(
        'thread_limit',
        'This session has reached its thread limit',
      )
    }

    const threadId = await createAgentThread(ctx, components.agent, {
      title: 'Public Parish Ask',
    })
    const now = Date.now()
    await ctx.db.insert('askThreadAccess', {
      sessionId: session._id,
      threadId,
      scopeKind: args.scope.kind,
      scopeKey: scopeKey(args.scope),
      createdAt: now,
      lastActivityAt: now,
      expiresAt: session.expiresAt,
    })
    return { threadId, scope: args.scope, expiresAt: session.expiresAt }
  },
})

export const appendQuestion = mutation({
  args: {
    token: v.string(),
    threadId: v.string(),
    question: v.string(),
    idempotencyKey: v.string(),
  },
  returns: v.object({ messageId: v.string(), replayed: v.boolean() }),
  handler: async (ctx, args) => {
    const question = args.question.trim()
    if (question.length === 0 || question.length > 500) {
      throw askError(
        'question_bounds',
        'Questions must contain 1 to 500 characters',
      )
    }
    if (args.idempotencyKey.length < 16 || args.idempotencyKey.length > 100) {
      throw askError('idempotency_key_bounds', 'Invalid question receipt key')
    }
    const access = await authorizeThreadMutation(ctx, args.token, args.threadId)
    const replay = await ctx.db
      .query('askQuestionReceipts')
      .withIndex('by_session_and_idempotency_key', (q) =>
        q
          .eq('sessionId', access.session._id)
          .eq('idempotencyKey', args.idempotencyKey),
      )
      .unique()
    if (replay) {
      if (replay.threadId !== args.threadId) {
        throw askError(
          'receipt_scope_mismatch',
          'Question receipt belongs to another thread',
        )
      }
      return { messageId: replay.messageId, replayed: true }
    }

    const history = await listMessages(ctx, components.agent, {
      threadId: args.threadId,
      paginationOpts: { numItems: MAX_MESSAGES_PER_THREAD + 1, cursor: null },
      excludeToolMessages: true,
    })
    if (history.page.length >= MAX_MESSAGES_PER_THREAD) {
      throw askError(
        'history_limit',
        'This conversation has reached its history limit',
      )
    }
    const saved = await saveMessage(ctx, components.agent, {
      threadId: args.threadId,
      prompt: question,
    })
    const now = Date.now()
    await ctx.db.insert('askQuestionReceipts', {
      sessionId: access.session._id,
      threadId: args.threadId,
      idempotencyKey: args.idempotencyKey,
      messageId: saved.messageId,
      createdAt: now,
    })
    await ctx.db.patch(access.mapping._id, { lastActivityAt: now })
    await ctx.db.patch(access.session._id, { lastSeenAt: now })
    return { messageId: saved.messageId, replayed: false }
  },
})

export const getHistory = query({
  args: {
    token: v.string(),
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    scope: askScope,
    expiresAt: v.number(),
    page: v.array(historyMessage),
    continueCursor: v.string(),
    isDone: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const access = await authorizeThreadRead(ctx, args.token, args.threadId)
    if (args.paginationOpts.numItems < 1 || args.paginationOpts.numItems > 40) {
      throw askError(
        'history_page_bounds',
        'History pages must contain 1 to 40 messages',
      )
    }
    const history = await listMessages(ctx, components.agent, {
      threadId: args.threadId,
      paginationOpts: args.paginationOpts,
      excludeToolMessages: true,
    })
    const page = history.page
      .flatMap((message) => {
        const role = message.message?.role
        if ((role !== 'user' && role !== 'assistant') || !message.text)
          return []
        return [
          {
            id: message._id,
            role,
            text: message.text,
            createdAt: message._creationTime,
          },
        ]
      })
      .reverse()
    return {
      scope: storedScope(access.mapping.scopeKind, access.mapping.scopeKey),
      expiresAt: access.session.expiresAt,
      page,
      continueCursor: history.continueCursor,
      isDone: history.isDone,
    }
  },
})

export async function authorizeThreadRead(
  ctx: QueryCtx,
  token: string,
  threadId: string,
) {
  const session = await authorizeRead(ctx, token)
  const mapping = await ctx.db
    .query('askThreadAccess')
    .withIndex('by_session_and_thread_id', (q) =>
      q.eq('sessionId', session._id).eq('threadId', threadId),
    )
    .unique()
  if (!mapping || mapping.detachedAt) {
    throw askError('thread_not_found', 'Thread is unavailable for this session')
  }
  return { mapping, session }
}

async function authorizeRead(ctx: QueryCtx, token: string) {
  requireOpaqueToken(token)
  const tokenHash = await sha256HexOfText(token)
  const session = await ctx.db
    .query('anonymousSessions')
    .withIndex('by_token_hash', (q) => q.eq('tokenHash', tokenHash))
    .order('desc')
    .first()
  if (!session || session.state !== 'active') {
    throw askError('session_expired', 'Anonymous Ask session is unavailable')
  }
  return session
}

async function authorizeMutation(ctx: MutationCtx, token: string) {
  requireOpaqueToken(token)
  const tokenHash = await sha256HexOfText(token)
  const session = await ctx.db
    .query('anonymousSessions')
    .withIndex('by_token_hash', (q) => q.eq('tokenHash', tokenHash))
    .order('desc')
    .first()
  const now = Date.now()
  if (!session || session.state !== 'active' || session.expiresAt <= now) {
    if (session?.state === 'active') await detachSession(ctx, session._id, now)
    throw askError('session_expired', 'Anonymous Ask session is unavailable')
  }
  return session
}

async function authorizeThreadMutation(
  ctx: MutationCtx,
  token: string,
  threadId: string,
) {
  const session = await authorizeMutation(ctx, token)
  const mapping = await ctx.db
    .query('askThreadAccess')
    .withIndex('by_session_and_thread_id', (q) =>
      q.eq('sessionId', session._id).eq('threadId', threadId),
    )
    .unique()
  if (!mapping || mapping.detachedAt) {
    throw askError('thread_not_found', 'Thread is unavailable for this session')
  }
  return { mapping, session }
}

async function requirePublishedScope(ctx: MutationCtx, scope: AskScope) {
  if (scope.kind === 'issue') {
    const issue = await ctx.runQuery(api.resident.evidence.getPublishedIssue, {
      slug: scope.issueSlug,
    })
    if (!issue)
      throw askError('scope_unavailable', 'Issue evidence is unavailable')
    return
  }
  if (scope.kind === 'meeting') {
    const meeting = await ctx.runQuery(
      api.resident.evidence.getPublishedMeeting,
      {
        meetingId: scope.meetingId,
      },
    )
    if (!meeting)
      throw askError('scope_unavailable', 'Meeting evidence is unavailable')
    return
  }
  if (scope.areaKey) {
    const jurisdiction = await ctx.db
      .query('jurisdictions')
      .withIndex('by_slug', (q) => q.eq('slug', scope.areaKey as string))
      .unique()
    if (!jurisdiction)
      throw askError('scope_unavailable', 'Area evidence is unavailable')
  }
}

async function detachSession(
  ctx: MutationCtx,
  sessionId: Id<'anonymousSessions'>,
  detachedAt: number,
) {
  const mappings = await ctx.db
    .query('askThreadAccess')
    .withIndex('by_session_and_last_activity_at', (q) =>
      q.eq('sessionId', sessionId),
    )
    .take(MAX_THREADS_PER_SESSION + 1)
  for (const mapping of mappings) {
    if (!mapping.detachedAt) await ctx.db.patch(mapping._id, { detachedAt })
  }
  await ctx.db.patch(sessionId, { state: 'expired' })
}

function requireOpaqueToken(token: string) {
  if (token.length < 32 || token.length > 256 || /\s/.test(token)) {
    throw askError('invalid_session_token', 'Anonymous Ask token is invalid')
  }
}

function askError(code: string, message: string) {
  return new ConvexError({ code, message })
}
