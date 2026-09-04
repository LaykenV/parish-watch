import { recordConfirmedEvent } from '../analytics/civic'
import { saveMessage } from '@convex-dev/agent'
import { ConvexError, v } from 'convex/values'

import { components, internal } from '../_generated/api'
import type { Id } from '../_generated/dataModel'
import { internalMutation } from '../_generated/server'
import { aiRoutes, estimateCostUsd } from '../ai/types'
import { sha256HexOfText } from '../sources/hashing'
import { askModelAnswer } from './contracts'
import {
  ASK_RUN_LEASE_MS,
  ASK_TOKEN_RESERVATION,
  reserveAskCapacity,
  settleAskCapacity,
} from './limits'

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
    v.object({ kind: v.literal('in_progress'), retryAt: v.number() }),
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
      existing.startedAt + ASK_RUN_LEASE_MS > now
    ) {
      return {
        kind: 'in_progress' as const,
        retryAt: existing.startedAt + ASK_RUN_LEASE_MS,
      }
    }
    if (existing && existing.attempt >= MAX_ANSWER_ATTEMPTS) {
      return { kind: 'failed' as const }
    }

    const running = await ctx.db
      .query('askAnswerReceipts')
      .withIndex('by_session_and_state', (q) =>
        q.eq('sessionId', session._id).eq('state', 'running'),
      )
      .take(3)
    for (const receipt of running) {
      if (receipt._id === existing?._id) continue
      if (receipt.startedAt + ASK_RUN_LEASE_MS > now) {
        throw new ConvexError({
          code: 'answer_concurrent',
          message: 'Another answer is already running for this device',
          retryAt: receipt.startedAt + ASK_RUN_LEASE_MS,
        })
      }
      await settleAskCapacity(
        ctx,
        receipt,
        receipt.reservedTokens ?? ASK_TOKEN_RESERVATION,
        'reconciled',
      )
      await ctx.db.patch(receipt._id, {
        state: 'failed',
        completedAt: now,
        errorClass: 'answer_abandoned',
      })
    }

    if (existing?.reservationState === 'held') {
      await settleAskCapacity(
        ctx,
        existing,
        existing.reservedTokens ?? ASK_TOKEN_RESERVATION,
        'reconciled',
      )
    }
    const reservation = await reserveAskCapacity(ctx, session._id, now)
    if (existing) {
      const attempt = existing.attempt + 1
      await ctx.db.patch(existing._id, {
        state: 'running',
        attempt,
        startedAt: now,
        completedAt: undefined,
        errorClass: undefined,
        reservationState: 'held',
        accountedTokens: 0, accountedAttempts: 0, unknownUsage: false,
        reservedTokens: ASK_TOKEN_RESERVATION,
        ...reservation,
      })
      await scheduleAbandonedRelease(ctx, existing._id, now)
      return { kind: 'ready' as const, receiptId: existing._id, attempt }
    }

    const receiptId = await ctx.db.insert('askAnswerReceipts', {
      sessionId: session._id,
      threadId: args.threadId,
      questionMessageId: args.questionMessageId,
      state: 'running',
      attempt: 1,
      startedAt: now,
      reservationState: 'held',
      reservedTokens: ASK_TOKEN_RESERVATION,
      ...reservation,
    })
    await scheduleAbandonedRelease(ctx, receiptId, now)
    return { kind: 'ready' as const, receiptId, attempt: 1 }
  },
})

export const recordModelAttempt = internalMutation({
  args: {
    receiptId: v.id('askAnswerReceipts'),
    answerAttempt: v.number(),
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
    if (
      !receipt ||
      receipt.state !== 'running' ||
      receipt.attempt !== args.answerAttempt
    ) {
      throw askError('answer_state_mismatch', 'Answer attempt is not running')
    }
    const usage = {
      promptTokens: args.promptTokens ?? null,
      completionTokens: args.completionTokens ?? null,
      totalTokens: args.totalTokens ?? null,
      cachedTokens: args.cachedTokens ?? null,
      reasoningTokens: args.reasoningTokens ?? null,
    }
    await ctx.db.patch(receipt._id, { accountedTokens: (receipt.accountedTokens ?? 0) + (args.totalTokens ?? 0), accountedAttempts: (receipt.accountedAttempts ?? 0) + 1, unknownUsage: receipt.unknownUsage === true || args.totalTokens === undefined })
    await ctx.db.insert('askModelAttempts', {
      answerReceiptId: receipt._id,
      sessionId: receipt.sessionId,
      threadId: receipt.threadId,
      route: args.route,
      modelRole: 'MODEL_FAST',
      modelId: args.modelId,
      promptVersion: args.promptVersion,
      schemaVersion: args.schemaVersion,
      answerAttempt: args.answerAttempt,
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
    answerAttempt: v.number(),
    answer: askModelAnswer,
    modelId: v.optional(v.string()),
    provider: v.optional(v.string()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const receipt = await ctx.db.get(args.receiptId)
    if (
      !receipt ||
      receipt.state !== 'running' ||
      receipt.attempt !== args.answerAttempt
    ) {
      throw askError('answer_state_mismatch', 'Answer attempt is not running')
    }
    if (receipt.corpusRevision !== undefined) {
      const revision = (await ctx.db.query('publicCorpusState').withIndex('by_key', q => q.eq('key', 'published')).unique())?.revision ?? 0
      if (!receipt.selectorComplete || receipt.corpusRevision !== revision) throw askError('ask_evidence_changed', 'Published evidence changed. Retry the question.')
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
    const usage = await currentAttemptUsage(ctx, receipt)
    const consumedTokens = accountedUsage(receipt, usage)
    await settleAskCapacity(
      ctx,
      receipt,
      consumedTokens,
      usage.attempted ? 'reconciled' : 'released',
    )
    await ctx.db.patch(receipt._id, {
      state: 'succeeded',
      answerMessageId: saved.messageId,
      completedAt: Date.now(),
      errorClass: undefined,
    })
    if (args.answer.kind === 'answer') await recordConfirmedEvent(ctx, 'ask_answered', receipt._id)
    return saved.messageId
  },
})

export const failAnswer = internalMutation({
  args: {
    receiptId: v.id('askAnswerReceipts'),
    answerAttempt: v.number(),
    errorClass: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const receipt = await ctx.db.get(args.receiptId)
    if (
      receipt?.state === 'running' &&
      receipt.attempt === args.answerAttempt
    ) {
      const usage = await currentAttemptUsage(ctx, receipt)
      const consumedTokens = accountedUsage(receipt, usage)
      await settleAskCapacity(
        ctx,
        receipt,
        consumedTokens,
        usage.attempted ? 'reconciled' : 'released',
      )
      await ctx.db.patch(receipt._id, {
        state: 'failed',
        errorClass: args.errorClass.slice(0, 100),
        completedAt: Date.now(),
      })
    }
    return null
  },
})

export const releaseAbandonedAnswer = internalMutation({
  args: {
    receiptId: v.id('askAnswerReceipts'),
    expectedStartedAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const receipt = await ctx.db.get(args.receiptId)
    if (
      !receipt ||
      receipt.state !== 'running' ||
      receipt.startedAt !== args.expectedStartedAt ||
      receipt.startedAt + ASK_RUN_LEASE_MS > Date.now()
    ) {
      return null
    }
    const usage = await currentAttemptUsage(ctx, receipt)
    await settleAskCapacity(
      ctx,
      receipt,
      Math.max(
        accountedUsage(receipt, usage),
        receipt.reservedTokens ?? ASK_TOKEN_RESERVATION,
      ),
      'reconciled',
    )
    await ctx.db.patch(receipt._id, {
      state: 'failed',
      completedAt: Date.now(),
      errorClass: 'answer_abandoned',
    })
    return null
  },
})

async function scheduleAbandonedRelease(
  ctx: Parameters<typeof reserveAskCapacity>[0],
  receiptId: Id<'askAnswerReceipts'>,
  expectedStartedAt: number,
) {
  await ctx.scheduler.runAfter(
    ASK_RUN_LEASE_MS + 1_000,
    internal.ask.ledger.releaseAbandonedAnswer,
    { receiptId, expectedStartedAt },
  )
}

async function currentAttemptUsage(
  ctx: Parameters<typeof reserveAskCapacity>[0],
  receipt: { _id: Id<'askAnswerReceipts'>; attempt: number; accountedTokens?: number; accountedAttempts?: number; unknownUsage?: boolean },
) {
  if (receipt.accountedAttempts !== undefined) return { attempted: receipt.accountedAttempts > 0, hasUnknownUsage: receipt.unknownUsage === true, tokens: receipt.accountedTokens ?? 0 }
  const attempts = await ctx.db
    .query('askModelAttempts')
    .withIndex('by_answer_receipt_and_attempt', (q) =>
      q.eq('answerReceiptId', receipt._id),
    )
    .take(10)
  const current = attempts.filter(
    (attempt) =>
      attempt.answerAttempt === receipt.attempt ||
      (attempt.answerAttempt === undefined && receipt.attempt === 1),
  )
  const known = current.flatMap((attempt) =>
    attempt.totalTokens === undefined ? [] : [attempt.totalTokens],
  )
  return {
    attempted: current.length > 0,
    hasUnknownUsage: current.some(
      (attempt) => attempt.totalTokens === undefined,
    ),
    tokens: known.reduce((total, value) => total + value, 0),
  }
}

function accountedUsage(
  receipt: { reservedTokens?: number },
  usage: {
    attempted: boolean
    hasUnknownUsage: boolean
    tokens: number
  },
) {
  if (!usage.attempted) return 0
  return usage.hasUnknownUsage
    ? Math.max(usage.tokens, receipt.reservedTokens ?? ASK_TOKEN_RESERVATION)
    : usage.tokens
}

function askError(code: string, message: string) {
  return new ConvexError({ code, message })
}

export type AskAnswerReceiptId = Id<'askAnswerReceipts'>

export const beginCatalogScan = internalMutation({
  args: { receiptId: v.id('askAnswerReceipts'), answerAttempt: v.number() },
  returns: v.object({ revision: v.number(), cursor: v.union(v.string(), v.null()), complete: v.boolean(), evidenceIds: v.array(v.string()) }),
  handler: async (ctx, args) => {
    const receipt = await ctx.db.get(args.receiptId)
    if (!receipt || receipt.state !== 'running' || receipt.attempt !== args.answerAttempt) throw askError('answer_state_mismatch', 'Answer attempt is not running')
    const revision = (await ctx.db.query('publicCorpusState').withIndex('by_key', q => q.eq('key', 'published')).unique())?.revision ?? 0
    if (receipt.corpusRevision === revision) return { revision, cursor: receipt.selectorCursor ?? null, complete: receipt.selectorComplete ?? false, evidenceIds: receipt.selectorEvidenceIds ?? [] }
    await ctx.db.patch(receipt._id, { corpusRevision: revision, selectorCursor: null, selectorEvidenceIds: [], selectorComplete: false, selectorBatches: 0 })
    return { revision, cursor: null, complete: false, evidenceIds: [] }
  },
})
export const checkpointCatalogScan = internalMutation({
  args: { receiptId: v.id('askAnswerReceipts'), answerAttempt: v.number(), revision: v.number(), cursor: v.string(), complete: v.boolean(), evidenceIds: v.array(v.string()), batches: v.number() }, returns: v.null(),
  handler: async (ctx, args) => {
    const receipt = await ctx.db.get(args.receiptId)
    const revision = (await ctx.db.query('publicCorpusState').withIndex('by_key', q => q.eq('key', 'published')).unique())?.revision ?? 0
    if (!receipt || receipt.state !== 'running' || receipt.attempt !== args.answerAttempt || receipt.corpusRevision !== revision || args.revision !== revision) throw askError('ask_evidence_changed', 'Published evidence changed. Retry the question.')
    if (args.evidenceIds.length > 1_500) throw askError('ask_scope_too_large', 'Narrow the question to a place, issue or meeting.')
    await ctx.db.patch(receipt._id, { selectorCursor: args.cursor, selectorComplete: args.complete, selectorEvidenceIds: args.evidenceIds, selectorBatches: (receipt.selectorBatches ?? 0) + args.batches })
    return null
  },
})
