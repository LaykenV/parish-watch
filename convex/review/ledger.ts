import { ConvexError, v } from 'convex/values'

import type { Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'
import { internalMutation, internalQuery } from '../_generated/server'
import { aiRoutes, estimateCostUsd } from '../ai/types'
import {
  PUBLICATION_PROCESSOR_VERSION,
  MODEL_STEP_RETRY,
  REVIEW_PROMPT_VERSION,
  REVIEW_SCHEMA_VERSION,
} from '../pipeline/state'
import schema from '../schema'
import { independentReviewV1 } from './contractV1'

const MAX_MODEL_ROUTES_PER_ATTEMPT = 2
const MAX_REVIEW_AI_CALLS =
  MODEL_STEP_RETRY.maxAttempts * MAX_MODEL_ROUTES_PER_ATTEMPT

async function requireReviewTarget(
  ctx: MutationCtx,
  args: {
    runId: Id<'pipelineRuns'>
    reviewStageId: Id<'pipelineStages'>
    candidateId: Id<'decisionCandidates'>
  },
) {
  const run = await ctx.db.get(args.runId)
  const stage = await ctx.db.get(args.reviewStageId)
  const candidate = await ctx.db.get(args.candidateId)
  if (
    !run ||
    !stage ||
    !candidate ||
    stage.runId !== run._id ||
    stage.stage !== 'review' ||
    run.processorVersion !== PUBLICATION_PROCESSOR_VERSION ||
    run.candidateId !== candidate._id ||
    run.upstreamRunId !== candidate.runId ||
    run.registryId !== candidate.registryId ||
    run.snapshotId !== candidate.snapshotId ||
    run.sourceKind !== candidate.sourceKind ||
    run.targetRecordId !== candidate.targetRecordId ||
    candidate.state !== 'deterministically_validated'
  ) {
    throw new ConvexError({
      code: 'review_target_mismatch',
      message: 'Review run, stage, and validated candidate must agree',
    })
  }
  return { run, stage, candidate }
}

async function linkAiCallsToReview(
  ctx: MutationCtx,
  runId: Id<'pipelineRuns'>,
  stageId: Id<'pipelineStages'>,
  reviewId: Id<'reviews'>,
): Promise<void> {
  const calls = await ctx.db
    .query('aiCalls')
    .withIndex('by_run_and_created_at', (q) => q.eq('runId', runId))
    .take(MAX_REVIEW_AI_CALLS + 1)
  if (calls.length > MAX_REVIEW_AI_CALLS) {
    throw new ConvexError({
      code: 'ai_call_limit_exceeded',
      message: `Review run ${runId} has more than ${MAX_REVIEW_AI_CALLS} model calls`,
    })
  }
  for (const call of calls) {
    if (call.stageId === stageId && call.reviewId === undefined) {
      await ctx.db.patch(call._id, { reviewId })
    }
  }
}

export const loadReviewResultForRun = internalQuery({
  args: {
    runId: v.id('pipelineRuns'),
    candidateId: v.id('decisionCandidates'),
    inputHash: v.string(),
  },
  returns: v.union(v.null(), schema.doc('reviews')),
  handler: async (ctx, args) => {
    const review = await ctx.db
      .query('reviews')
      .withIndex('by_run', (q) => q.eq('runId', args.runId))
      .unique()
    if (
      review &&
      (review.candidateId !== args.candidateId ||
        review.inputHash !== args.inputHash)
    ) {
      throw new ConvexError({
        code: 'review_idempotency_collision',
        message: `Run ${args.runId} already reviewed different input`,
      })
    }
    return review
  },
})

export const beginReviewAttempt = internalMutation({
  args: {
    runId: v.id('pipelineRuns'),
    reviewStageId: v.id('pipelineStages'),
    candidateId: v.id('decisionCandidates'),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const { run, stage } = await requireReviewTarget(ctx, args)
    if (
      run.state === 'failed_terminal' ||
      run.state === 'superseded' ||
      stage.state === 'failed_terminal' ||
      stage.state === 'superseded'
    ) {
      throw new ConvexError({
        code: 'review_state_collision',
        message: `Review cannot start from run ${run.state} and stage ${stage.state}`,
      })
    }
    const attempt = stage.attempt + 1
    await ctx.db.patch(stage._id, {
      state: 'running',
      attempt,
      startedAt: stage.startedAt ?? Date.now(),
    })
    return attempt
  },
})

export const recordReviewModelAttempt = internalMutation({
  args: {
    runId: v.id('pipelineRuns'),
    reviewStageId: v.id('pipelineStages'),
    candidateId: v.id('decisionCandidates'),
    attempt: v.number(),
    route: aiRoutes,
    modelId: v.string(),
    status: v.string(),
    httpStatus: v.optional(v.number()),
    latencyMs: v.number(),
    requestId: v.optional(v.string()),
    promptTokens: v.optional(v.number()),
    completionTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    cachedTokens: v.optional(v.number()),
    reasoningTokens: v.optional(v.number()),
    retryAfterMs: v.optional(v.number()),
    errorClass: v.optional(v.string()),
    errorDetail: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { stage, candidate } = await requireReviewTarget(ctx, args)
    if (
      stage.state !== 'running' ||
      stage.attempt !== args.attempt ||
      args.modelId === candidate.modelId
    ) {
      throw new ConvexError({
        code: 'review_model_not_independent',
        message: 'The active review attempt must use a different model',
      })
    }
    await ctx.db.insert('aiCalls', {
      runId: args.runId,
      stageId: args.reviewStageId,
      route: args.route,
      modelRole: 'MODEL_FAST',
      modelId: args.modelId,
      promptVersion: REVIEW_PROMPT_VERSION,
      schemaVersion: REVIEW_SCHEMA_VERSION,
      attempt: args.attempt,
      status: args.status,
      httpStatus: args.httpStatus,
      latencyMs: args.latencyMs,
      requestId: args.requestId,
      promptTokens: args.promptTokens,
      completionTokens: args.completionTokens,
      totalTokens: args.totalTokens,
      cachedTokens: args.cachedTokens,
      reasoningTokens: args.reasoningTokens,
      estimatedCostUsd:
        estimateCostUsd('MODEL_FAST', {
          promptTokens: args.promptTokens ?? null,
          completionTokens: args.completionTokens ?? null,
          totalTokens: args.totalTokens ?? null,
          cachedTokens: args.cachedTokens ?? null,
          reasoningTokens: args.reasoningTokens ?? null,
        }) ?? undefined,
      retryAfterMs: args.retryAfterMs,
      errorClass: args.errorClass,
      errorDetail: args.errorDetail?.slice(0, 500),
      createdAt: Date.now(),
    })
    return null
  },
})

export const persistReviewSuccess = internalMutation({
  args: {
    runId: v.id('pipelineRuns'),
    reviewStageId: v.id('pipelineStages'),
    candidateId: v.id('decisionCandidates'),
    extractionId: v.id('extractions'),
    registryId: v.id('sourceRegistries'),
    snapshotId: v.id('sourceSnapshots'),
    inputHash: v.string(),
    modelId: v.string(),
    route: aiRoutes,
    rawResponseStorageId: v.id('_storage'),
    responseHash: v.string(),
    responseByteLength: v.number(),
    review: independentReviewV1,
  },
  returns: v.id('reviews'),
  handler: async (ctx, args) => {
    const { stage, candidate } = await requireReviewTarget(ctx, args)
    if (
      candidate.extractionId !== args.extractionId ||
      candidate.registryId !== args.registryId ||
      candidate.snapshotId !== args.snapshotId ||
      args.modelId === candidate.modelId
    ) {
      throw new ConvexError({
        code: 'review_model_not_independent',
        message: 'Review evidence and model must stay independent and bound',
      })
    }
    const existing = await ctx.db
      .query('reviews')
      .withIndex('by_run', (q) => q.eq('runId', args.runId))
      .unique()
    if (existing) {
      if (
        existing.state !== 'succeeded' ||
        existing.candidateId !== args.candidateId ||
        existing.inputHash !== args.inputHash
      ) {
        throw new ConvexError({
          code: 'review_idempotency_collision',
          message: `Run ${args.runId} already has a different review`,
        })
      }
      return existing._id
    }
    const facts = await ctx.db
      .query('candidateFacts')
      .withIndex('by_candidate_and_field_path', (q) =>
        q.eq('candidateId', candidate._id),
      )
      .take(MATERIAL_REVIEW_LIMIT + 1)
    const factsById = new Map(facts.map((fact) => [fact._id, fact]))
    if (
      facts.length !== args.review.checks.length ||
      new Set(args.review.checks.map((check) => check.factId)).size !==
        args.review.checks.length ||
      args.review.checks.some((check) => {
        const fact = factsById.get(check.factId as Id<'candidateFacts'>)
        return !fact || fact.fieldPath !== check.fieldPath
      })
    ) {
      throw new ConvexError({
        code: 'review_fact_mismatch',
        message: 'Review checks must match the persisted candidate facts',
      })
    }
    const reviewId = await ctx.db.insert('reviews', {
      runId: args.runId,
      stageId: args.reviewStageId,
      candidateId: args.candidateId,
      extractionId: args.extractionId,
      registryId: args.registryId,
      snapshotId: args.snapshotId,
      inputHash: args.inputHash,
      state: 'succeeded',
      verdict: args.review.verdict,
      modelRole: 'MODEL_FAST',
      modelId: args.modelId,
      route: args.route,
      promptVersion: REVIEW_PROMPT_VERSION,
      schemaVersion: REVIEW_SCHEMA_VERSION,
      processorVersion: PUBLICATION_PROCESSOR_VERSION,
      rawResponseStorageId: args.rawResponseStorageId,
      responseHash: args.responseHash,
      responseByteLength: args.responseByteLength,
      createdAt: Date.now(),
    })
    for (const check of args.review.checks) {
      await ctx.db.insert('reviewChecks', {
        reviewId,
        candidateFactId: check.factId as Id<'candidateFacts'>,
        fieldPath: check.fieldPath,
        assessment: check.assessment,
        detail: check.detail,
      })
    }
    for (const finding of args.review.findings) {
      await ctx.db.insert('reviewFindings', {
        reviewId,
        code: finding.code,
        severity: finding.severity,
        fieldPath: finding.fieldPath ?? undefined,
        detail: finding.detail,
      })
    }
    await linkAiCallsToReview(ctx, args.runId, args.reviewStageId, reviewId)
    await ctx.db.patch(stage._id, {
      state: 'succeeded',
      completedAt: Date.now(),
      outputReviewId: reviewId,
    })
    return reviewId
  },
})

const MATERIAL_REVIEW_LIMIT = 100

export const persistReviewFailure = internalMutation({
  args: {
    runId: v.id('pipelineRuns'),
    reviewStageId: v.id('pipelineStages'),
    candidateId: v.id('decisionCandidates'),
    extractionId: v.id('extractions'),
    registryId: v.id('sourceRegistries'),
    snapshotId: v.id('sourceSnapshots'),
    inputHash: v.string(),
    modelId: v.optional(v.string()),
    route: v.optional(aiRoutes),
    rawResponseStorageId: v.optional(v.id('_storage')),
    responseHash: v.optional(v.string()),
    responseByteLength: v.optional(v.number()),
    errorClass: v.string(),
    errorDetail: v.string(),
  },
  returns: v.id('reviews'),
  handler: async (ctx, args) => {
    const { run, stage, candidate } = await requireReviewTarget(ctx, args)
    if (
      candidate.extractionId !== args.extractionId ||
      candidate.registryId !== args.registryId ||
      candidate.snapshotId !== args.snapshotId ||
      args.modelId === candidate.modelId
    ) {
      throw new ConvexError({
        code: 'review_failure_mismatch',
        message: 'Review failure evidence does not match its candidate',
      })
    }
    const existing = await ctx.db
      .query('reviews')
      .withIndex('by_run', (q) => q.eq('runId', args.runId))
      .unique()
    if (existing) {
      if (
        existing.state !== 'failed' ||
        existing.stageId !== args.reviewStageId ||
        existing.candidateId !== args.candidateId ||
        existing.extractionId !== args.extractionId ||
        existing.registryId !== args.registryId ||
        existing.snapshotId !== args.snapshotId ||
        existing.inputHash !== args.inputHash ||
        existing.processorVersion !== PUBLICATION_PROCESSOR_VERSION ||
        existing.promptVersion !== REVIEW_PROMPT_VERSION ||
        existing.schemaVersion !== REVIEW_SCHEMA_VERSION
      ) {
        throw new ConvexError({
          code: 'review_idempotency_collision',
          message: `Run ${args.runId} already has a different review`,
        })
      }
      return existing._id
    }
    const reviewId = await ctx.db.insert('reviews', {
      runId: args.runId,
      stageId: args.reviewStageId,
      candidateId: args.candidateId,
      extractionId: args.extractionId,
      registryId: args.registryId,
      snapshotId: args.snapshotId,
      inputHash: args.inputHash,
      state: 'failed',
      modelRole: 'MODEL_FAST',
      modelId: args.modelId,
      route: args.route,
      promptVersion: REVIEW_PROMPT_VERSION,
      schemaVersion: REVIEW_SCHEMA_VERSION,
      processorVersion: PUBLICATION_PROCESSOR_VERSION,
      rawResponseStorageId: args.rawResponseStorageId,
      responseHash: args.responseHash,
      responseByteLength: args.responseByteLength,
      errorClass: args.errorClass,
      errorDetail: args.errorDetail.slice(0, 500),
      createdAt: Date.now(),
    })
    await linkAiCallsToReview(ctx, args.runId, args.reviewStageId, reviewId)
    const now = Date.now()
    await ctx.db.patch(stage._id, {
      state: 'failed_terminal',
      completedAt: now,
      outputReviewId: reviewId,
      errorClass: args.errorClass,
      errorDetail: args.errorDetail.slice(0, 500),
    })
    await ctx.db.patch(run._id, {
      state: 'failed_terminal',
      completedAt: now,
    })
    return reviewId
  },
})
