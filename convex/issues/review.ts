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
import {
  checkIssueReviewContractV1,
  issueReviewJsonSchemaV1,
  issueReviewV1,
  schemaNameForIssueReviewV1,
} from './contractV1'
import type { IssueReviewV1 } from './contractV1'
import { buildIssueReviewPromptV1 } from './promptV1'

const MAX_STORED_RESPONSE_BYTES = 1_000_000

const issueReviewResult = v.union(
  v.object({
    kind: v.literal('reviewed'),
    reviewId: v.id('issueBuildReviews'),
  }),
  v.object({
    kind: v.literal('failed'),
    reviewId: v.optional(v.id('issueBuildReviews')),
    errorClass: v.string(),
    errorDetail: v.string(),
  }),
)

export type IssueReviewResult = typeof issueReviewResult.type

export const runIssueReview = internalAction({
  args: {
    issueBuildId: v.id('issueBuilds'),
    reviewStageId: v.id('pipelineStages'),
  },
  returns: issueReviewResult,
  handler: async (ctx, args): Promise<IssueReviewResult> => {
    const context = await ctx.runQuery(
      internal.issues.ledger.loadIssueReviewContext,
      args,
    )
    const existing = await ctx.runQuery(
      internal.issues.ledger.loadIssueReviewForBuild,
      { issueBuildId: args.issueBuildId, inputHash: context.inputHash },
    )
    if (existing) {
      return existing.state === 'succeeded'
        ? { kind: 'reviewed', reviewId: existing._id }
        : {
            kind: 'failed',
            reviewId: existing._id,
            errorClass: existing.errorClass ?? 'issue_review_failed',
            errorDetail: existing.errorDetail ?? 'Issue review failed',
          }
    }
    const configuredModel = env.MODEL_FAST_ID
    if (
      typeof configuredModel !== 'string' ||
      configuredModel.length === 0 ||
      configuredModel === context.linkerModelId
    ) {
      return await persistFailure(ctx, args, context.inputHash, {
        errorClass:
          typeof configuredModel !== 'string' || configuredModel.length === 0
            ? 'model_role_not_configured'
            : 'issue_review_model_not_independent',
        errorDetail:
          typeof configuredModel !== 'string' || configuredModel.length === 0
            ? 'No model ID is configured for role MODEL_FAST'
            : 'MODEL_FAST must differ from the issue linking model',
      })
    }
    const attempt = await ctx.runMutation(
      internal.issues.ledger.beginIssueStageAttempt,
      {
        issueBuildId: args.issueBuildId,
        stageId: args.reviewStageId,
        stage: 'review',
      },
    )
    const prompt = buildIssueReviewPromptV1({
      candidate: context.candidate,
      facts: context.facts,
    })
    const onAttempt = async (modelAttempt: AttemptRecord) => {
      await ctx.runMutation(internal.issues.ledger.recordIssueModelAttempt, {
        issueBuildId: args.issueBuildId,
        stageId: args.reviewStageId,
        stage: 'review',
        modelRole: 'MODEL_FAST',
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
        role: 'MODEL_FAST',
        messages: prompt.messages,
        schemaName: schemaNameForIssueReviewV1(),
        jsonSchema: issueReviewJsonSchemaV1,
        reasoningEffort: 'high',
        maxCompletionTokens: 8_000,
      },
      responseValidator: issueReviewV1,
      contractCheck: (parsed) =>
        checkIssueReviewContractV1(
          parsed,
          context.facts.map((fact) => fact.fieldPath),
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
      return await persistFailure(ctx, args, context.inputHash, {
        errorClass:
          readConvexErrorCode(error) ??
          (error instanceof PermanentModelError
            ? error.errorClass
            : 'unexpected_model_error'),
        errorDetail: safeDetail(error),
      })
    }
    if (outcome.outcome === 'failed') {
      return await persistFailure(ctx, args, context.inputHash, {
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
        internal.issues.ledger.persistIssueReviewSuccess,
        {
          issueBuildId: args.issueBuildId,
          reviewStageId: args.reviewStageId,
          inputHash: context.inputHash,
          modelId: outcome.result.modelId,
          route: outcome.result.route,
          rawResponseStorageId: stored.storageId,
          responseHash: stored.hash,
          responseByteLength: stored.byteLength,
          review: outcome.result.parsed as IssueReviewV1,
        },
      )
      return { kind: 'reviewed', reviewId }
    } catch (error) {
      await ctx.storage.delete(stored.storageId)
      throw error
    }
  },
})

async function persistFailure(
  ctx: ActionCtx,
  args: {
    issueBuildId: Id<'issueBuilds'>
    reviewStageId: Id<'pipelineStages'>
  },
  inputHash: string,
  failure: {
    errorClass: string
    errorDetail: string
    rawResponse?: string
    modelId?: string
    route?: 'ai_gateway' | 'direct_openai'
  },
): Promise<IssueReviewResult> {
  const stored = failure.rawResponse
    ? await storeResponse(ctx, failure.rawResponse)
    : null
  try {
    const reviewId = await ctx.runMutation(
      internal.issues.ledger.persistIssueReviewFailure,
      {
        issueBuildId: args.issueBuildId,
        reviewStageId: args.reviewStageId,
        inputHash,
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
    if (stored) await ctx.storage.delete(stored.storageId)
    throw error
  }
}

function safeDetail(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).slice(0, 500)
}

function readConvexErrorCode(error: unknown): string | null {
  if (!(error instanceof ConvexError)) return null
  const data = error.data
  return typeof data === 'object' &&
    data !== null &&
    'code' in data &&
    typeof data.code === 'string'
    ? data.code
    : null
}

async function storeResponse(
  ctx: ActionCtx,
  content: string,
): Promise<{
  storageId: Id<'_storage'>
  hash: string
  byteLength: number
}> {
  const byteLength = new TextEncoder().encode(content).byteLength
  if (byteLength > MAX_STORED_RESPONSE_BYTES) {
    throw new Error(
      `issue_review_response_too_large:${byteLength}:${MAX_STORED_RESPONSE_BYTES}`,
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
