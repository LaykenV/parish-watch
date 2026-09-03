import { v } from 'convex/values'

import { internal } from '../_generated/api'
import { internalMutation } from '../_generated/server'

const BATCH_SIZE = 25
const PREPARATION_STALE_MS = 5 * 60 * 1_000
const ANSWER_STALE_MS = 10 * 60 * 1_000
const EVENT_RETENTION_MS = 30 * 24 * 60 * 60 * 1_000
const THREAD_RETENTION_MS = 31 * 24 * 60 * 60 * 1_000
const TERMINAL_STATES = [
  'ignored',
  'answered',
  'not_found',
  'failed',
] as const

export const recoverInterruptedReplies = internalMutation({
  args: {},
  returns: v.object({ preparation: v.number(), answer: v.number() }),
  handler: async (ctx) => {
    const now = Date.now()
    const queued = await ctx.db
      .query('emailReplyEvents')
      .withIndex('by_state_and_updated_at', (q) =>
        q.eq('state', 'queued').lte('updatedAt', now - PREPARATION_STALE_MS),
      )
      .take(BATCH_SIZE)
    for (const event of queued) {
      await ctx.db.patch(event._id, { updatedAt: now })
      await ctx.scheduler.runAfter(
        0,
        internal.emailReplies.answer.prepareInbound,
        { eventId: event._id },
      )
    }

    const running = await ctx.db
      .query('emailReplyEvents')
      .withIndex('by_state_and_updated_at', (q) =>
        q.eq('state', 'running').lte('updatedAt', now - ANSWER_STALE_MS),
      )
      .take(BATCH_SIZE)
    const retryable = await ctx.db
      .query('emailReplyEvents')
      .withIndex('by_state_and_retry_at', (q) =>
        q.eq('state', 'failed').lte('retryAt', now),
      )
      .take(BATCH_SIZE)
    for (const event of [...running, ...retryable]) {
      await ctx.db.patch(event._id, { updatedAt: now })
      await ctx.scheduler.runAfter(
        0,
        internal.emailReplies.answer.answerInbound,
        { eventId: event._id },
      )
    }
    return {
      preparation: queued.length,
      answer: running.length + retryable.length,
    }
  },
})

export const removeExpiredReplyMetadata = internalMutation({
  args: {},
  returns: v.object({ events: v.number(), threads: v.number() }),
  handler: async (ctx) => {
    const now = Date.now()
    let events = 0
    for (const state of TERMINAL_STATES) {
      const expired = await ctx.db
        .query('emailReplyEvents')
        .withIndex('by_state_and_updated_at', (q) =>
          q.eq('state', state).lte('updatedAt', now - EVENT_RETENTION_MS),
        )
        .take(BATCH_SIZE)
      for (const event of expired) await ctx.db.delete(event._id)
      events += expired.length
    }

    const expiredThreads = await ctx.db
      .query('emailReplyThreads')
      .withIndex('by_updated_at', (q) =>
        q.lte('updatedAt', now - THREAD_RETENTION_MS),
      )
      .take(BATCH_SIZE)
    let threads = 0
    for (const thread of expiredThreads) {
      const event = await ctx.db
        .query('emailReplyEvents')
        .withIndex('by_agentmail_thread_id_and_created_at', (q) =>
          q.eq('agentmailThreadId', thread.agentmailThreadId),
        )
        .first()
      if (event) continue
      await ctx.db.delete(thread._id)
      threads += 1
    }
    return { events, threads }
  },
})
