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
import {
  EXTRACTION_PROMPT_VERSION,
  EXTRACTION_SCHEMA_VERSION,
} from './versions'
import {
  checkExtractionContractV1,
  extractionJsonSchemaV1,
  extractionResponseV1,
  schemaNameForExtractionV1,
} from './contractV1'
import type { ExtractionResponseV1 } from './contractV1'
import { buildExtractionPromptV1 } from './promptV1'
import type { ExtractionContext } from './prepare'
import { extractionContextValidator } from './prepare'
import { sha256HexOfText } from '../sources/hashing'

const EXTRACTION_MODEL_ROLE = 'MODEL_STRONG' as const
const EXTRACTION_REASONING_EFFORT = 'high' as const
const EXTRACTION_MAX_COMPLETION_TOKENS = 8000
const MAX_STORED_RESPONSE_BYTES = 1_000_000

const extractionResultValidator = v.union(
  v.object({
    kind: v.literal('extracted'),
    extractionId: v.id('extractions'),
    candidateId: v.id('decisionCandidates'),
  }),
  v.object({
    kind: v.literal('not_found'),
    extractionId: v.id('extractions'),
  }),
  v.object({
    kind: v.literal('failed'),
    extractionId: v.optional(v.id('extractions')),
    errorClass: v.string(),
    errorDetail: v.string(),
  }),
)

type ExtractionResult = typeof extractionResultValidator.type

export const runExtraction = internalAction({
  args: {
    runId: v.id('pipelineRuns'),
    extractStageId: v.id('pipelineStages'),
    context: extractionContextValidator,
  },
  returns: extractionResultValidator,
  handler: async (ctx, args): Promise<ExtractionResult> => {
    const context = args.context
    const existing = await ctx.runQuery(
      internal.extraction.ledger.loadExtractionResultForRun,
      { runId: args.runId },
    )
    if (existing) {
      return existing
    }
    const attemptNumber = await ctx.runMutation(
      internal.extraction.ledger.beginStageAttempt,
      { stageId: args.extractStageId },
    )

    const blob = await ctx.storage.get(context.normalizedStorageId)
    if (!blob) {
      return await failExtraction(ctx, args, {
        errorClass: 'snapshot_text_missing',
        errorDetail: 'The snapshot normalized text is missing from storage',
      })
    }
    const sourceText = await blob.text()
    const byteLength = new TextEncoder().encode(sourceText).byteLength
    const contentHash = await sha256HexOfText(sourceText)
    if (
      contentHash !== context.normalizedContentHash ||
      byteLength !== context.normalizedByteLength
    ) {
      return await failExtraction(ctx, args, {
        errorClass: 'snapshot_hash_mismatch',
        errorDetail:
          'Stored snapshot text no longer matches its recorded hash and size',
      })
    }

    const prompt = buildExtractionPromptV1({
      snapshotId: context.snapshotId,
      sourceKind: context.sourceKind,
      bodyName: context.bodyName,
      targetRecordId: context.targetRecordId,
      sourceText,
    })

    const request = {
      role: EXTRACTION_MODEL_ROLE,
      messages: prompt.messages,
      schemaName: schemaNameForExtractionV1(),
      jsonSchema: extractionJsonSchemaV1,
      reasoningEffort: EXTRACTION_REASONING_EFFORT,
      maxCompletionTokens: EXTRACTION_MAX_COMPLETION_TOKENS,
    } as const

    const onAttempt = async (attempt: AttemptRecord) => {
      await ctx.runMutation(internal.extraction.ledger.recordModelAttempt, {
        runId: args.runId,
        stageId: args.extractStageId,
        attempt: attemptNumber,
        route: attempt.route,
        modelRole: EXTRACTION_MODEL_ROLE,
        modelId: attempt.modelId,
        promptVersion: EXTRACTION_PROMPT_VERSION,
        schemaVersion: EXTRACTION_SCHEMA_VERSION,
        status: attempt.status,
        httpStatus: attempt.httpStatus ?? undefined,
        latencyMs: attempt.latencyMs,
        requestId: attempt.requestId ?? undefined,
        promptTokens: attempt.usage?.promptTokens ?? undefined,
        completionTokens: attempt.usage?.completionTokens ?? undefined,
        totalTokens: attempt.usage?.totalTokens ?? undefined,
        cachedTokens: attempt.usage?.cachedTokens ?? undefined,
        reasoningTokens: attempt.usage?.reasoningTokens ?? undefined,
        retryAfterMs: attempt.retryAfterMs ?? undefined,
        errorClass: attempt.errorClass ?? undefined,
        errorDetail: attempt.errorDetail ?? undefined,
      })
    }

    const options: CompleteStructuredOptions = {
      request,
      responseValidator: extractionResponseV1,
      contractCheck: checkExtractionContractV1,
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
      const errorClass =
        error instanceof PermanentModelError
          ? error.errorClass
          : 'unexpected_model_error'
      const errorDetail = error instanceof Error ? error.message : String(error)
      return await failExtraction(ctx, args, { errorClass, errorDetail })
    }

    if (outcome.outcome === 'failed') {
      const failure = outcome.failure
      return await failExtraction(ctx, args, {
        errorClass: failure.kind,
        errorDetail: failure.detail,
        rawResponse: failure.content ?? undefined,
        modelId: failure.modelId ?? undefined,
        route: failure.route,
      })
    }

    const parsed = outcome.result.parsed as ExtractionResponseV1
    if (parsed.status === 'not_found') {
      const stored = await storeResponse(ctx, outcome.result.content)
      const { extractionId } = await ctx.runMutation(
        internal.extraction.ledger.persistExtractionSuccess,
        {
          runId: args.runId,
          stageId: args.extractStageId,
          registryId: context.registryId,
          snapshotId: context.snapshotId,
          sourceKind: context.sourceKind,
          targetRecordId: context.targetRecordId,
          modelRole: EXTRACTION_MODEL_ROLE,
          modelId: outcome.result.modelId,
          route: outcome.result.route,
          promptVersion: EXTRACTION_PROMPT_VERSION,
          schemaVersion: EXTRACTION_SCHEMA_VERSION,
          requestId: outcome.result.requestId ?? undefined,
          rawResponseStorageId: stored.storageId,
          responseHash: stored.hash,
          responseByteLength: stored.byteLength,
          status: 'not_found',
          reason: parsed.reason ?? undefined,
        },
      )
      return { kind: 'not_found', extractionId }
    }

    const decision = parsed.decision
    if (!decision) {
      return await failExtraction(ctx, args, {
        errorClass: 'schema_invalid',
        errorDetail: 'status "found" without a decision',
      })
    }

    const stored = await storeResponse(ctx, outcome.result.content)
    const persisted = await ctx.runMutation(
      internal.extraction.ledger.persistExtractionSuccess,
      {
        runId: args.runId,
        stageId: args.extractStageId,
        registryId: context.registryId,
        snapshotId: context.snapshotId,
        sourceKind: context.sourceKind,
        targetRecordId: context.targetRecordId,
        modelRole: EXTRACTION_MODEL_ROLE,
        modelId: outcome.result.modelId,
        route: outcome.result.route,
        promptVersion: EXTRACTION_PROMPT_VERSION,
        schemaVersion: EXTRACTION_SCHEMA_VERSION,
        requestId: outcome.result.requestId ?? undefined,
        rawResponseStorageId: stored.storageId,
        responseHash: stored.hash,
        responseByteLength: stored.byteLength,
        status: 'found',
        decision: {
          sourceRecordId: decision.sourceRecordId,
          recordType: decision.recordType,
          title: decision.title,
          bodyName: decision.bodyName,
          meetingAt: decision.meetingAt,
          lifecycleState: decision.lifecycleState,
          plainLanguageSummary: decision.plainLanguageSummary,
          affectedPlaces: decision.affectedPlaces,
          amounts: decision.amounts,
          publicActions: decision.publicActions,
        },
        facts: decision.facts.map((fact) => ({
          fieldPath: fact.fieldPath,
          value: fact.value,
          citation: {
            sourceSnapshotId: fact.citation.sourceSnapshotId,
            excerpt: fact.citation.excerpt,
            page: fact.citation.page,
            section: fact.citation.section,
          },
        })),
      },
    )
    if (!persisted.candidateId) {
      throw new ConvexError({
        code: 'candidate_missing',
        message: 'A found extraction did not produce a candidate',
      })
    }
    return {
      kind: 'extracted',
      extractionId: persisted.extractionId,
      candidateId: persisted.candidateId,
    }
  },
})

async function failExtraction(
  ctx: ActionCtx,
  args: {
    runId: Id<'pipelineRuns'>
    extractStageId: Id<'pipelineStages'>
    context: ExtractionContext
  },
  failure: {
    errorClass: string
    errorDetail: string
    rawResponse?: string
    modelId?: string
    route?: 'ai_gateway' | 'direct_openai'
  },
): Promise<ExtractionResult> {
  let rawResponseStorageId: Id<'_storage'> | undefined
  let responseHash: string | undefined
  let responseByteLength: number | undefined
  if (failure.rawResponse !== undefined) {
    const stored = await storeResponse(ctx, failure.rawResponse)
    rawResponseStorageId = stored.storageId
    responseHash = stored.hash
    responseByteLength = stored.byteLength
  }
  const extractionId = await ctx.runMutation(
    internal.extraction.ledger.persistExtractionFailure,
    {
      runId: args.runId,
      stageId: args.extractStageId,
      registryId: args.context.registryId,
      snapshotId: args.context.snapshotId,
      sourceKind: args.context.sourceKind,
      targetRecordId: args.context.targetRecordId,
      modelRole: EXTRACTION_MODEL_ROLE,
      modelId: failure.modelId,
      route: failure.route,
      promptVersion: EXTRACTION_PROMPT_VERSION,
      schemaVersion: EXTRACTION_SCHEMA_VERSION,
      errorClass: failure.errorClass,
      errorDetail: failure.errorDetail,
      rawResponseStorageId,
      responseHash,
      responseByteLength,
    },
  )
  return {
    kind: 'failed',
    extractionId,
    errorClass: failure.errorClass,
    errorDetail: failure.errorDetail,
  }
}

async function storeResponse(
  ctx: ActionCtx,
  rawResponse: string,
): Promise<{
  storageId: Id<'_storage'> | undefined
  hash: string
  byteLength: number
}> {
  const bytes = new TextEncoder().encode(rawResponse)
  const hash = await sha256HexOfText(rawResponse)
  if (bytes.byteLength > MAX_STORED_RESPONSE_BYTES) {
    return { storageId: undefined, hash, byteLength: bytes.byteLength }
  }
  const storageId = await ctx.storage.store(
    new Blob([bytes], { type: 'application/json' }),
  )
  return { storageId, hash, byteLength: bytes.byteLength }
}
