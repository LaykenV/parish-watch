import { ConvexError, v } from 'convex/values'

import { internal } from '../_generated/api'
import type { Id } from '../_generated/dataModel'
import type { ActionCtx } from '../_generated/server'
import { internalAction } from '../_generated/server'
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
  checkIssueCandidateContractV1,
  issueCandidateJsonSchemaV1,
  issueCandidateV1,
  schemaNameForIssueCandidateV1,
} from './contractV1'
import type { IssueCandidateV1 } from './contractV1'
import { buildIssueLinkPromptV1 } from './promptV1'

const MAX_STORED_RESPONSE_BYTES = 1_000_000

const issueLinkResult = v.union(
  v.object({ kind: v.literal('linked'), candidateHash: v.string() }),
  v.object({
    kind: v.literal('failed'),
    errorClass: v.string(),
    errorDetail: v.string(),
  }),
)

export type IssueLinkResult = typeof issueLinkResult.type

export const runIssueLinker = internalAction({
  args: {
    issueBuildId: v.id('issueBuilds'),
    linkStageId: v.id('pipelineStages'),
  },
  returns: issueLinkResult,
  handler: async (ctx, args): Promise<IssueLinkResult> => {
    const existing = await ctx.runQuery(internal.issues.ledger.getIssueBuild, {
      issueBuildId: args.issueBuildId,
    })
    if (existing?.candidateHash && existing.candidate) {
      return { kind: 'linked', candidateHash: existing.candidateHash }
    }
    const context = await ctx.runQuery(
      internal.issues.ledger.loadIssueBuildInput,
      args,
    )
    const attempt = await ctx.runMutation(
      internal.issues.ledger.beginIssueStageAttempt,
      {
        issueBuildId: args.issueBuildId,
        stageId: args.linkStageId,
        stage: 'link',
      },
    )
    const prompt = buildIssueLinkPromptV1({ records: context.records })
    const onAttempt = async (modelAttempt: AttemptRecord) => {
      await ctx.runMutation(internal.issues.ledger.recordIssueModelAttempt, {
        issueBuildId: args.issueBuildId,
        stageId: args.linkStageId,
        stage: 'link',
        modelRole: 'MODEL_STRONG',
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
        role: 'MODEL_STRONG',
        messages: prompt.messages,
        schemaName: schemaNameForIssueCandidateV1(),
        jsonSchema: issueCandidateJsonSchemaV1,
        reasoningEffort: 'high',
        maxCompletionTokens: 10_000,
      },
      responseValidator: issueCandidateV1,
      contractCheck: (parsed) =>
        checkIssueCandidateContractV1(
          parsed,
          context.records.map((record) => record.recordId),
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
      return {
        kind: 'failed',
        errorClass:
          readConvexErrorCode(error) ??
          (error instanceof PermanentModelError
            ? error.errorClass
            : 'unexpected_model_error'),
        errorDetail: safeDetail(error),
      }
    }
    if (outcome.outcome === 'failed') {
      const rawResponse = outcome.failure.content
      if (rawResponse !== null) {
        const stored = await storeResponse(ctx, rawResponse)
        try {
          await ctx.runMutation(
            internal.issues.ledger.persistIssueCandidateFailure,
            {
              issueBuildId: args.issueBuildId,
              linkStageId: args.linkStageId,
              inputHash: context.inputHash,
              modelId: outcome.failure.modelId ?? undefined,
              route: outcome.failure.route,
              rawResponseStorageId: stored.storageId,
              responseHash: stored.hash,
              responseByteLength: stored.byteLength,
              errorClass: outcome.failure.kind,
              errorDetail: outcome.failure.detail,
            },
          )
        } catch (error) {
          await ctx.storage.delete(stored.storageId)
          return {
            kind: 'failed',
            errorClass: 'issue_candidate_failure_persistence_failed',
            errorDetail: safeDetail(error),
          }
        }
      }
      return {
        kind: 'failed',
        errorClass: outcome.failure.kind,
        errorDetail: outcome.failure.detail.slice(0, 500),
      }
    }
    const stored = await storeResponse(ctx, outcome.result.content)
    try {
      const persisted = await ctx.runMutation(
        internal.issues.ledger.persistIssueCandidate,
        {
          issueBuildId: args.issueBuildId,
          linkStageId: args.linkStageId,
          inputHash: context.inputHash,
          modelId: outcome.result.modelId,
          route: outcome.result.route,
          rawResponseStorageId: stored.storageId,
          responseHash: stored.hash,
          responseByteLength: stored.byteLength,
          candidate: outcome.result.parsed as IssueCandidateV1,
        },
      )
      return { kind: 'linked', candidateHash: persisted.candidateHash }
    } catch (error) {
      const errorClass =
        readConvexErrorCode(error) ?? 'issue_candidate_persistence_failed'
      const errorDetail = safeDetail(error)
      try {
        await ctx.runMutation(
          internal.issues.ledger.persistIssueCandidateFailure,
          {
            issueBuildId: args.issueBuildId,
            linkStageId: args.linkStageId,
            inputHash: context.inputHash,
            modelId: outcome.result.modelId,
            route: outcome.result.route,
            rawResponseStorageId: stored.storageId,
            responseHash: stored.hash,
            responseByteLength: stored.byteLength,
            errorClass,
            errorDetail,
          },
        )
        return { kind: 'failed', errorClass, errorDetail }
      } catch (persistenceError) {
        await ctx.storage.delete(stored.storageId)
        return {
          kind: 'failed',
          errorClass: 'issue_candidate_failure_persistence_failed',
          errorDetail: safeDetail(persistenceError),
        }
      }
    }
  },
})

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
      `issue_response_too_large:${byteLength}:${MAX_STORED_RESPONSE_BYTES}`,
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
