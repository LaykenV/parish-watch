import { ConvexError, v } from 'convex/values'

import { internal } from '../_generated/api'
import type { Id } from '../_generated/dataModel'
import type { ActionCtx } from '../_generated/server'
import { env, internalAction } from '../_generated/server'
import { completeStructured } from '../ai/provider'
import type { CompleteStructuredOptions } from '../ai/provider'
import type { AttemptRecord } from '../ai/types'
import {
  GatewayUnavailableError,
  PermanentModelError,
  TransientModelError,
} from '../ai/types'
import { sha256HexOfText } from '../sources/hashing'
import { reviewMaxCompletionTokens } from './completionBudget'
import {
  checkIndependentReviewContractV1,
  independentReviewJsonSchemaV1,
  independentReviewV1,
  schemaNameForIndependentReviewV1,
} from './contractV1'
import type { IndependentReviewV1 } from './contractV1'
import { buildIndependentReviewPromptV1 } from './promptV1'
import { reviewContextValidator } from './prepare'

const REVIEW_MODEL_ROLE = 'MODEL_FAST' as const
const MAX_STORED_RESPONSE_BYTES = 1_000_000

const reviewActionResult = v.union(
  v.object({ kind: v.literal('reviewed'), reviewId: v.id('reviews') }),
  v.object({
    kind: v.literal('failed'),
    reviewId: v.optional(v.id('reviews')),
    errorClass: v.string(),
    errorDetail: v.string(),
  }),
)

export type ReviewActionResult = typeof reviewActionResult.type

export const runIndependentReview = internalAction({
  args: {
    runId: v.id('pipelineRuns'),
    reviewStageId: v.id('pipelineStages'),
    context: reviewContextValidator,
  },
  returns: reviewActionResult,
  handler: async (ctx, args): Promise<ReviewActionResult> => {
    const existing = await ctx.runQuery(
      internal.review.ledger.loadReviewResultForRun,
      {
        runId: args.runId,
        candidateId: args.context.candidateId,
        inputHash: args.context.inputHash,
      },
    )
    if (existing) {
      return existing.state === 'succeeded'
        ? { kind: 'reviewed', reviewId: existing._id }
        : {
            kind: 'failed',
            reviewId: existing._id,
            errorClass: existing.errorClass ?? 'review_failed',
            errorDetail: existing.errorDetail ?? 'Review failed',
          }
    }

    const configuredModel = env.MODEL_FAST_ID
    if (
      typeof configuredModel !== 'string' ||
      configuredModel.length === 0 ||
      configuredModel === args.context.extractionModelId
    ) {
      return await persistFailure(ctx, args, {
        errorClass:
          typeof configuredModel !== 'string' || configuredModel.length === 0
            ? 'model_role_not_configured'
            : 'review_model_not_independent',
        errorDetail:
          typeof configuredModel !== 'string' || configuredModel.length === 0
            ? 'No model ID is configured for role MODEL_FAST'
            : 'MODEL_FAST must differ from the extraction model',
      })
    }

    const attempt = await ctx.runMutation(
      internal.review.ledger.beginReviewAttempt,
      {
        runId: args.runId,
        reviewStageId: args.reviewStageId,
        candidateId: args.context.candidateId,
      },
    )
    const prompt = buildIndependentReviewPromptV1({
      sourceKind: args.context.sourceKind,
      sourceRecordIdProvenance: args.context.sourceRecordIdProvenance,
      sourceRecordId: args.context.sourceRecordId,
      targetRecordId: args.context.targetRecordId,
      candidate: {
        recordType: args.context.recordType,
        title: args.context.title,
        bodyName: args.context.bodyName,
        meetingAt: args.context.meetingAt,
        lifecycleState: args.context.lifecycleState,
        plainLanguageSummary: args.context.plainLanguageSummary,
        affectedPlaces: args.context.affectedPlaces,
        amounts: args.context.amounts,
        publicActions: args.context.publicActions,
      },
      facts: args.context.facts.map((fact) => ({
        factId: fact.factId,
        fieldPath: fact.fieldPath,
        value: fact.value,
        excerpt: fact.excerpt,
        page: fact.page,
        section: fact.section,
      })),
    })
    const onAttempt = async (modelAttempt: AttemptRecord) => {
      await ctx.runMutation(internal.review.ledger.recordReviewModelAttempt, {
        runId: args.runId,
        reviewStageId: args.reviewStageId,
        candidateId: args.context.candidateId,
        attempt,
        route: modelAttempt.route,
        modelId: modelAttempt.modelId,
        status: modelAttempt.status,
        httpStatus: modelAttempt.httpStatus ?? undefined,
        latencyMs: modelAttempt.latencyMs,
        requestId: modelAttempt.requestId ?? undefined,
        promptTokens: modelAttempt.usage?.promptTokens ?? undefined,
        completionTokens: modelAttempt.usage?.completionTokens ?? undefined,
        totalTokens: modelAttempt.usage?.totalTokens ?? undefined,
        cachedTokens: modelAttempt.usage?.cachedTokens ?? undefined,
        reasoningTokens: modelAttempt.usage?.reasoningTokens ?? undefined,
        retryAfterMs: modelAttempt.retryAfterMs ?? undefined,
        errorClass: modelAttempt.errorClass ?? undefined,
        errorDetail: modelAttempt.errorDetail ?? undefined,
      })
    }
    const options: CompleteStructuredOptions = {
      request: {
        role: REVIEW_MODEL_ROLE,
        messages: prompt.messages,
        schemaName: schemaNameForIndependentReviewV1(),
        jsonSchema: independentReviewJsonSchemaV1,
        reasoningEffort: 'high',
        maxCompletionTokens: reviewMaxCompletionTokens(
          args.context.facts.length,
        ),
      },
      responseValidator: independentReviewV1,
      contractCheck: (parsed) =>
        checkIndependentReviewContractV1(
          parsed,
          args.context.facts.map((fact) => ({
            factId: fact.factId,
            fieldPath: fact.fieldPath,
          })),
          args.context.sourceRecordIdProvenance === 'operator_assigned'
            ? args.context.targetRecordId.trim() !== ''
            : args.context.sourceRecordId !== null,
          args.context.sourceRecordIdProvenance,
        ),
      onAttempt,
    }

    let outcome
    try {
      outcome = await completeStructured(options)
    } catch (error) {
      if (
        error instanceof TransientModelError ||
        error instanceof GatewayUnavailableError
      ) {
        throw new Error(
          `model_transient:${error.errorClass}:${error.message}`.slice(0, 500),
        )
      }
      const convexErrorClass = readConvexErrorCode(error)
      return await persistFailure(ctx, args, {
        errorClass:
          convexErrorClass ??
          (error instanceof PermanentModelError
            ? error.errorClass
            : 'unexpected_model_error'),
        errorDetail: error instanceof Error ? error.message : String(error),
      })
    }
    if (outcome.outcome === 'failed') {
      return await persistFailure(ctx, args, {
        errorClass: outcome.failure.kind,
        errorDetail: outcome.failure.detail,
        rawResponse: outcome.failure.content ?? undefined,
        modelId: outcome.failure.modelId ?? undefined,
        route: outcome.failure.route,
      })
    }

    const stored = await storeResponse(ctx, outcome.result.content)
    try {
      const reviewId = await ctx.runMutation(
        internal.review.ledger.persistReviewSuccess,
        {
          runId: args.runId,
          reviewStageId: args.reviewStageId,
          candidateId: args.context.candidateId,
          extractionId: args.context.extractionId,
          registryId: args.context.registryId,
          snapshotId: args.context.snapshotId,
          inputHash: args.context.inputHash,
          modelId: outcome.result.modelId,
          route: outcome.result.route,
          rawResponseStorageId: stored.storageId,
          responseHash: stored.hash,
          responseByteLength: stored.byteLength,
          review: outcome.result.parsed as IndependentReviewV1,
        },
      )
      return { kind: 'reviewed', reviewId }
    } catch (error) {
      await ctx.storage.delete(stored.storageId)
      throw error
    }
  },
})

function readConvexErrorCode(error: unknown): string | null {
  if (!(error instanceof ConvexError)) {
    return null
  }
  const data = error.data
  if (
    typeof data === 'object' &&
    data !== null &&
    'code' in data &&
    typeof data.code === 'string'
  ) {
    return data.code
  }
  return null
}

async function persistFailure(
  ctx: ActionCtx,
  args: {
    runId: Id<'pipelineRuns'>
    reviewStageId: Id<'pipelineStages'>
    context: typeof reviewContextValidator.type
  },
  failure: {
    errorClass: string
    errorDetail: string
    rawResponse?: string
    modelId?: string
    route?: 'ai_gateway' | 'direct_openai'
  },
): Promise<ReviewActionResult> {
  const stored = failure.rawResponse
    ? await storeResponse(ctx, failure.rawResponse)
    : null
  try {
    const reviewId = await ctx.runMutation(
      internal.review.ledger.persistReviewFailure,
      {
        runId: args.runId,
        reviewStageId: args.reviewStageId,
        candidateId: args.context.candidateId,
        extractionId: args.context.extractionId,
        registryId: args.context.registryId,
        snapshotId: args.context.snapshotId,
        inputHash: args.context.inputHash,
        modelId: failure.modelId,
        route: failure.route,
        rawResponseStorageId: stored?.storageId,
        responseHash: stored?.hash,
        responseByteLength: stored?.byteLength,
        errorClass: failure.errorClass,
        errorDetail: failure.errorDetail.slice(0, 500),
      },
    )
    return {
      kind: 'failed',
      reviewId,
      errorClass: failure.errorClass,
      errorDetail: failure.errorDetail.slice(0, 500),
    }
  } catch (error) {
    if (stored) {
      await ctx.storage.delete(stored.storageId)
    }
    throw error
  }
}

async function storeResponse(
  ctx: { storage: { store: (blob: Blob) => Promise<Id<'_storage'>> } },
  content: string,
): Promise<{
  storageId: Id<'_storage'>
  hash: string
  byteLength: number
}> {
  const byteLength = new TextEncoder().encode(content).byteLength
  if (byteLength > MAX_STORED_RESPONSE_BYTES) {
    throw new Error(
      `review_response_too_large:${byteLength}:${MAX_STORED_RESPONSE_BYTES}`,
    )
  }
  return {
    storageId: await ctx.storage.store(
      new Blob([content], { type: 'application/json' }),
    ),
    hash: await sha256HexOfText(content),
    byteLength,
  }
}
