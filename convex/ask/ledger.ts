import { saveMessage } from '@convex-dev/agent'
import { ConvexError, v } from 'convex/values'

import { components } from '../_generated/api'
import type { Id } from '../_generated/dataModel'
import { internalMutation } from '../_generated/server'
import { aiRoutes, estimateCostUsd } from '../ai/types'
import { sha256HexOfText } from '../sources/hashing'
import { askModelAnswer } from './contracts'

const RUN_LEASE_MS = 2 * 60 * 1000
const MAX_ANSWER_ATTEMPTS = 2

export const claimAnswer = internalMutation({
  args: {
    token: v.string(),
    threadId: v.string(),
    questionMessageId: v.string(),
  },
  returns: v.union(
    v.object({
      kind: v.literal('ready'),
      receiptId: v.id('askAnswerReceipts'),
      attempt: v.number(),
    }),
    v.object({
      kind: v.literal('replay'),
      receiptId: v.id('askAnswerReceipts'),
      answerMessageId: v.string(),
    }),
    v.object({ kind: v.literal('in_progress') }),
    v.object({ kind: v.literal('failed') }),
  ),
  handler: async (ctx, args) => {
    const now = Date.now()
    const tokenHash = await sha256HexOfText(args.token)
    const session = await ctx.db
      .query('anonymousSessions')
      .withIndex('by_token_hash', (q) => q.eq('tokenHash', tokenHash))
      .order('desc')
      .first()
    if (!session || session.state !== 'active' || session.expiresAt <= now) {
      throw askError('session_expired', 'Anonymous Ask session is unavailable')
    }
    const mapping = await ctx.db
      .query('askThreadAccess')
      .withIndex('by_session_and_thread_id', (q) =>
        q.eq('sessionId', session._id).eq('threadId', args.threadId),
      )
      .unique()
    if (!mapping || mapping.detachedAt) {
      throw askError(
        'thread_not_found',
        'Thread is unavailable for this session',
      )
    }
    const question = await ctx.db
      .query('askQuestionReceipts')
      .withIndex('by_session_and_message_id', (q) =>
        q.eq('sessionId', session._id).eq('messageId', args.questionMessageId),
      )
      .unique()
    if (!question || question.threadId !== args.threadId) {
      throw askError(
        'question_not_found',
        'Question is unavailable for this thread',
      )
    }

    const existing = await ctx.db
      .query('askAnswerReceipts')
      .withIndex('by_session_and_question_message_id', (q) =>
        q
          .eq('sessionId', session._id)
          .eq('questionMessageId', args.questionMessageId),
      )
      .unique()
    if (existing?.state === 'succeeded' && existing.answerMessageId) {
      return {
        kind: 'replay' as const,
        receiptId: existing._id,
        answerMessageId: existing.answerMessageId,
      }
    }
    if (
      existing?.state === 'running' &&
      existing.startedAt + RUN_LEASE_MS > now
    ) {
      return { kind: 'in_progress' as const }
    }
    if (existing && existing.attempt >= MAX_ANSWER_ATTEMPTS) {
      return { kind: 'failed' as const }
    }
    if (existing) {
      const attempt = existing.attempt + 1
      await ctx.db.patch(existing._id, {
        state: 'running',
        attempt,
        startedAt: now,
        completedAt: undefined,
        errorClass: undefined,
      })
      return { kind: 'ready' as const, receiptId: existing._id, attempt }
    }

    const receiptId = await ctx.db.insert('askAnswerReceipts', {
      sessionId: session._id,
      threadId: args.threadId,
      questionMessageId: args.questionMessageId,
      state: 'running',
      attempt: 1,
      startedAt: now,
    })
    return { kind: 'ready' as const, receiptId, attempt: 1 }
  },
})

export const recordModelAttempt = internalMutation({
  args: {
    receiptId: v.id('askAnswerReceipts'),
    route: aiRoutes,
    modelId: v.string(),
    promptVersion: v.string(),
    schemaVersion: v.string(),
    attempt: v.number(),
    status: v.string(),
    latencyMs: v.number(),
    requestId: v.optional(v.string()),
    promptTokens: v.optional(v.number()),
    completionTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    cachedTokens: v.optional(v.number()),
    reasoningTokens: v.optional(v.number()),
    errorClass: v.optional(v.string()),
    errorDetail: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const receipt = await ctx.db.get(args.receiptId)
    if (!receipt || receipt.state !== 'running') {
      throw askError('answer_state_mismatch', 'Answer attempt is not running')
    }
    const usage = {
      promptTokens: args.promptTokens ?? null,
      completionTokens: args.completionTokens ?? null,
      totalTokens: args.totalTokens ?? null,
      cachedTokens: args.cachedTokens ?? null,
      reasoningTokens: args.reasoningTokens ?? null,
    }
    await ctx.db.insert('askModelAttempts', {
      answerReceiptId: receipt._id,
      sessionId: receipt.sessionId,
      threadId: receipt.threadId,
      route: args.route,
      modelRole: 'MODEL_FAST',
      modelId: args.modelId,
      promptVersion: args.promptVersion,
      schemaVersion: args.schemaVersion,
      attempt: args.attempt,
      status: args.status,
      latencyMs: args.latencyMs,
      requestId: args.requestId,
      promptTokens: args.promptTokens,
      completionTokens: args.completionTokens,
      totalTokens: args.totalTokens,
      cachedTokens: args.cachedTokens,
      reasoningTokens: args.reasoningTokens,
      estimatedCostUsd: estimateCostUsd('MODEL_FAST', usage) ?? undefined,
      errorClass: args.errorClass,
      errorDetail: args.errorDetail?.slice(0, 500),
      createdAt: Date.now(),
    })
    return null
  },
})

export const persistAnswer = internalMutation({
  args: {
    receiptId: v.id('askAnswerReceipts'),
    answer: askModelAnswer,
    modelId: v.optional(v.string()),
    provider: v.optional(v.string()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const receipt = await ctx.db.get(args.receiptId)
    if (!receipt || receipt.state !== 'running') {
      throw askError('answer_state_mismatch', 'Answer attempt is not running')
    }
    const saved = await saveMessage(ctx, components.agent, {
      threadId: receipt.threadId,
      promptMessageId: receipt.questionMessageId,
      agentName: 'Public Parish Ask',
      message: {
        role: 'assistant',
        content: JSON.stringify(args.answer),
      },
      metadata: {
        ...(args.modelId ? { model: args.modelId } : {}),
        ...(args.provider ? { provider: args.provider } : {}),
      },
    })
    await ctx.db.patch(receipt._id, {
      state: 'succeeded',
      answerMessageId: saved.messageId,
      completedAt: Date.now(),
      errorClass: undefined,
    })
    return saved.messageId
  },
})

export const failAnswer = internalMutation({
  args: {
    receiptId: v.id('askAnswerReceipts'),
    errorClass: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const receipt = await ctx.db.get(args.receiptId)
    if (receipt?.state === 'running') {
      await ctx.db.patch(receipt._id, {
        state: 'failed',
        errorClass: args.errorClass.slice(0, 100),
        completedAt: Date.now(),
      })
    }
    return null
  },
})

function askError(code: string, message: string) {
  return new ConvexError({ code, message })
}

export type AskAnswerReceiptId = Id<'askAnswerReceipts'>
