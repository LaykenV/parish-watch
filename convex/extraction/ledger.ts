import { ConvexError, v } from 'convex/values'

import type { Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'
import { internalMutation, internalQuery } from '../_generated/server'
import { aiRoutes, estimateCostUsd, modelRoles } from '../ai/types'
import {
  EXTRACTION_PROCESSOR_VERSION,
  EXTRACTION_PROMPT_VERSION,
  EXTRACTION_SCHEMA_VERSION,
  MODEL_STEP_RETRY,
  resolveSourceRecordIdProvenance,
  sourceKindUnion,
  sourceRecordIdProvenances,
} from '../pipeline/state'
import schema from '../schema'
import {
  MATERIAL_ARRAY_LIMITS,
  storedDecisionV1,
  storedFactsV1,
} from './contractV1'

const MAX_MODEL_ROUTES_PER_ATTEMPT = 2
const MAX_AI_CALLS_PER_EXTRACTION =
  MODEL_STEP_RETRY.maxAttempts * MAX_MODEL_ROUTES_PER_ATTEMPT

function requireRunStage(
  run: { _id: string; state: string } | null,
  stage: { runId: string; stage: string } | null,
  stageId: string,
): void {
  if (!run) {
    throw new ConvexError({
      code: 'run_missing',
      message: 'Pipeline run does not exist',
    })
  }
  if (!stage || stage.runId !== run._id) {
    throw new ConvexError({
      code: 'stage_mismatch',
      message: `Stage ${stageId} does not belong to the run`,
    })
  }
}

async function linkAiCallsToExtraction(
  ctx: MutationCtx,
  runId: Id<'pipelineRuns'>,
  stageId: Id<'pipelineStages'>,
  extractionId: Id<'extractions'>,
): Promise<void> {
  const calls = await ctx.db
    .query('aiCalls')
    .withIndex('by_run_and_created_at', (q) => q.eq('runId', runId))
    .take(MAX_AI_CALLS_PER_EXTRACTION + 1)
  if (calls.length > MAX_AI_CALLS_PER_EXTRACTION) {
    throw new ConvexError({
      code: 'ai_call_limit_exceeded',
      message: `Run ${runId} has more than ${MAX_AI_CALLS_PER_EXTRACTION} model calls`,
    })
  }
  for (const call of calls) {
    if (call.stageId === stageId && call.extractionId === undefined) {
      await ctx.db.patch(call._id, { extractionId })
    }
  }
}

async function requireValidationTargets(
  ctx: MutationCtx,
  args: {
    runId: Id<'pipelineRuns'>
    validateStageId: Id<'pipelineStages'>
    extractionId: Id<'extractions'>
    candidateId?: Id<'decisionCandidates'>
  },
  expectedExtractionState: 'extracted' | 'not_found',
): Promise<
  'extracted' | 'deterministically_validated' | 'validation_failed' | null
> {
  const run = await ctx.db.get(args.runId)
  const stage = await ctx.db.get(args.validateStageId)
  const extraction = await ctx.db.get(args.extractionId)
  requireRunStage(run, stage, args.validateStageId)
  if (stage?.stage !== 'validate') {
    throw new ConvexError({
      code: 'stage_mismatch',
      message: `Stage ${args.validateStageId} is not a validation stage`,
    })
  }
  if (
    !run ||
    !extraction ||
    extraction.runId !== run._id ||
    extraction.registryId !== run.registryId ||
    extraction.snapshotId !== run.snapshotId ||
    extraction.sourceKind !== run.sourceKind ||
    extraction.targetRecordId !== run.targetRecordId ||
    extraction.state !== expectedExtractionState
  ) {
    throw new ConvexError({
      code: 'validation_target_mismatch',
      message: 'Validation run, stage, extraction, and target must agree',
    })
  }
  if (expectedExtractionState === 'not_found') {
    if (
      args.candidateId !== undefined ||
      extraction.candidateId !== undefined
    ) {
      throw new ConvexError({
        code: 'validation_target_mismatch',
        message: 'A not-found extraction must not have a candidate',
      })
    }
    return null
  }
  if (!args.candidateId || extraction.candidateId !== args.candidateId) {
    throw new ConvexError({
      code: 'validation_target_mismatch',
      message: 'The extraction does not own the validation candidate',
    })
  }
  const candidate = await ctx.db.get(args.candidateId)
  if (
    !candidate ||
    candidate.runId !== run._id ||
    candidate.extractionId !== extraction._id ||
    candidate.registryId !== extraction.registryId ||
    candidate.snapshotId !== extraction.snapshotId ||
    candidate.sourceKind !== extraction.sourceKind ||
    candidate.targetRecordId !== extraction.targetRecordId ||
    resolveSourceRecordIdProvenance(candidate.sourceRecordIdProvenance) !==
      resolveSourceRecordIdProvenance(extraction.sourceRecordIdProvenance)
  ) {
    throw new ConvexError({
      code: 'validation_target_mismatch',
      message: 'The candidate does not match its extraction target',
    })
  }
  return candidate.state
}

const storedExtractionResult = v.union(
  v.null(),
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
    extractionId: v.id('extractions'),
    errorClass: v.string(),
    errorDetail: v.string(),
  }),
)

export const loadExtractionResultForRun = internalQuery({
  args: {
    runId: v.id('pipelineRuns'),
    registryId: v.id('sourceRegistries'),
    snapshotId: v.id('sourceSnapshots'),
    sourceKind: sourceKindUnion,
    targetRecordId: v.string(),
    sourceRecordIdProvenance: sourceRecordIdProvenances,
  },
  returns: storedExtractionResult,
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId)
    if (
      !run ||
      run.processorVersion !== EXTRACTION_PROCESSOR_VERSION ||
      run.registryId !== args.registryId ||
      run.snapshotId !== args.snapshotId ||
      run.sourceKind !== args.sourceKind ||
      run.targetRecordId !== args.targetRecordId ||
      resolveSourceRecordIdProvenance(run.sourceRecordIdProvenance) !==
        args.sourceRecordIdProvenance
    ) {
      throw new ConvexError({
        code: 'extraction_target_mismatch',
        message: 'Extraction action input must match its pipeline run',
      })
    }
    const extractions = await ctx.db
      .query('extractions')
      .withIndex('by_run', (q) => q.eq('runId', args.runId))
      .take(2)
    if (extractions.length > 1) {
      throw new ConvexError({
        code: 'duplicate_run_extractions',
        message: `Run ${args.runId} has more than one extraction`,
      })
    }
    if (extractions.length === 0) {
      return null
    }
    const extraction = extractions[0]
    if (
      extraction.registryId !== args.registryId ||
      extraction.snapshotId !== args.snapshotId ||
      extraction.sourceKind !== args.sourceKind ||
      extraction.targetRecordId !== args.targetRecordId ||
      extraction.processorVersion !== run.processorVersion
    ) {
      throw new ConvexError({
        code: 'extraction_idempotency_collision',
        message: `Run ${args.runId} has an extraction for another target or processor`,
      })
    }
    if (extraction.state === 'extracted') {
      if (!extraction.candidateId) {
        throw new ConvexError({
          code: 'candidate_missing',
          message: `Extraction ${extraction._id} has no candidate`,
        })
      }
      return {
        kind: 'extracted' as const,
        extractionId: extraction._id,
        candidateId: extraction.candidateId,
      }
    }
    if (extraction.state === 'not_found') {
      return {
        kind: 'not_found' as const,
        extractionId: extraction._id,
      }
    }
    return {
      kind: 'failed' as const,
      extractionId: extraction._id,
      errorClass: extraction.errorClass ?? 'extraction_failed',
      errorDetail: extraction.errorDetail ?? 'Extraction failed',
    }
  },
})

export const beginStageAttempt = internalMutation({
  args: {
    runId: v.id('pipelineRuns'),
    stageId: v.id('pipelineStages'),
    expectedStage: v.union(v.literal('extract'), v.literal('validate')),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId)
    const stage = await ctx.db.get(args.stageId)
    requireRunStage(run, stage, args.stageId)
    if (stage?.stage !== args.expectedStage) {
      throw new ConvexError({
        code: 'stage_mismatch',
        message: `Stage ${args.stageId} is not ${args.expectedStage}`,
      })
    }
    const attempt = stage.attempt + 1
    await ctx.db.patch(args.stageId, {
      state: 'running',
      attempt,
      startedAt: stage.startedAt ?? Date.now(),
    })
    return attempt
  },
})

export const recordModelAttempt = internalMutation({
  args: {
    runId: v.id('pipelineRuns'),
    stageId: v.id('pipelineStages'),
    attempt: v.number(),
    route: aiRoutes,
    modelRole: modelRoles,
    modelId: v.string(),
    promptVersion: v.string(),
    schemaVersion: v.string(),
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
    const run = await ctx.db.get(args.runId)
    const stage = await ctx.db.get(args.stageId)
    requireRunStage(run, stage, args.stageId)
    if (
      stage?.stage !== 'extract' ||
      stage.state !== 'running' ||
      stage.attempt !== args.attempt ||
      args.modelRole !== 'MODEL_STRONG' ||
      args.promptVersion !== EXTRACTION_PROMPT_VERSION ||
      args.schemaVersion !== EXTRACTION_SCHEMA_VERSION
    ) {
      throw new ConvexError({
        code: 'stage_mismatch',
        message: `Stage ${args.stageId} is not the active extraction attempt`,
      })
    }
    await ctx.db.insert('aiCalls', {
      runId: args.runId,
      stageId: args.stageId,
      route: args.route,
      modelRole: args.modelRole,
      modelId: args.modelId,
      promptVersion: args.promptVersion,
      schemaVersion: args.schemaVersion,
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
        estimateCostUsd(args.modelRole, {
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

export const persistExtractionSuccess = internalMutation({
  args: {
    runId: v.id('pipelineRuns'),
    stageId: v.id('pipelineStages'),
    registryId: v.id('sourceRegistries'),
    snapshotId: v.id('sourceSnapshots'),
    sourceKind: sourceKindUnion,
    targetRecordId: v.string(),
    sourceRecordIdProvenance: sourceRecordIdProvenances,
    modelRole: modelRoles,
    modelId: v.string(),
    route: aiRoutes,
    promptVersion: v.string(),
    schemaVersion: v.string(),
    requestId: v.optional(v.string()),
    rawResponseStorageId: v.optional(v.id('_storage')),
    responseHash: v.string(),
    responseByteLength: v.number(),
    status: v.union(v.literal('found'), v.literal('not_found')),
    reason: v.optional(v.string()),
    decision: v.optional(storedDecisionV1),
    facts: v.optional(storedFactsV1),
  },
  returns: v.object({
    extractionId: v.id('extractions'),
    candidateId: v.optional(v.id('decisionCandidates')),
  }),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId)
    const stage = await ctx.db.get(args.stageId)
    requireRunStage(run, stage, args.stageId)
    if (
      !run ||
      stage?.stage !== 'extract' ||
      run.processorVersion !== EXTRACTION_PROCESSOR_VERSION ||
      args.modelRole !== 'MODEL_STRONG' ||
      args.promptVersion !== EXTRACTION_PROMPT_VERSION ||
      args.schemaVersion !== EXTRACTION_SCHEMA_VERSION ||
      run.registryId !== args.registryId ||
      run.snapshotId !== args.snapshotId ||
      run.sourceKind !== args.sourceKind ||
      run.targetRecordId !== args.targetRecordId ||
      resolveSourceRecordIdProvenance(run.sourceRecordIdProvenance) !==
        args.sourceRecordIdProvenance
    ) {
      throw new ConvexError({
        code: 'extraction_target_mismatch',
        message: 'Extraction run, stage, snapshot, kind, and target must agree',
      })
    }
    if (
      (args.status === 'found' &&
        (!args.decision ||
          args.facts === undefined ||
          args.reason !== undefined)) ||
      (args.status === 'not_found' &&
        (args.decision !== undefined ||
          args.facts !== undefined ||
          args.reason === undefined))
    ) {
      throw new ConvexError({
        code: 'extraction_result_mismatch',
        message: 'Extraction status, decision, facts, and reason must agree',
      })
    }

    const existing = await ctx.db
      .query('extractions')
      .withIndex('by_run', (q) => q.eq('runId', args.runId))
      .unique()
    if (existing) {
      const expectedState = args.status === 'found' ? 'extracted' : 'not_found'
      if (
        existing.registryId !== args.registryId ||
        existing.snapshotId !== args.snapshotId ||
        existing.sourceKind !== args.sourceKind ||
        existing.targetRecordId !== args.targetRecordId ||
        resolveSourceRecordIdProvenance(existing.sourceRecordIdProvenance) !==
          args.sourceRecordIdProvenance ||
        existing.state !== expectedState ||
        (expectedState === 'extracted' && !existing.candidateId)
      ) {
        throw new ConvexError({
          code: 'extraction_idempotency_collision',
          message: `Run ${args.runId} already has a different extraction result`,
        })
      }
      await ctx.db.patch(args.stageId, {
        state: 'succeeded',
        completedAt: stage.completedAt ?? Date.now(),
        outputExtractionId: existing._id,
      })
      await linkAiCallsToExtraction(ctx, args.runId, args.stageId, existing._id)
      return {
        extractionId: existing._id,
        candidateId: existing.candidateId,
      }
    }

    const extractionId = await ctx.db.insert('extractions', {
      runId: args.runId,
      registryId: args.registryId,
      snapshotId: args.snapshotId,
      sourceKind: args.sourceKind,
      targetRecordId: args.targetRecordId,
      sourceRecordIdProvenance: args.sourceRecordIdProvenance,
      promptVersion: args.promptVersion,
      schemaVersion: args.schemaVersion,
      processorVersion: run.processorVersion,
      modelRole: args.modelRole,
      modelId: args.modelId,
      route: args.route,
      state: args.status === 'found' ? 'extracted' : 'not_found',
      reason: args.reason,
      rawResponseStorageId: args.rawResponseStorageId,
      responseHash: args.responseHash,
      responseByteLength: args.responseByteLength,
      createdAt: Date.now(),
    })

    let candidateId: Id<'decisionCandidates'> | undefined
    if (args.status === 'found' && args.decision && args.facts) {
      candidateId = await ctx.db.insert('decisionCandidates', {
        extractionId,
        runId: args.runId,
        registryId: args.registryId,
        snapshotId: args.snapshotId,
        sourceKind: args.sourceKind,
        targetRecordId: args.targetRecordId,
        sourceRecordIdProvenance: args.sourceRecordIdProvenance,
        sourceRecordId: args.decision.sourceRecordId,
        recordType: args.decision.recordType,
        title: args.decision.title,
        bodyName: args.decision.bodyName,
        meetingAt: args.decision.meetingAt,
        lifecycleState: args.decision.lifecycleState,
        plainLanguageSummary: args.decision.plainLanguageSummary,
        affectedPlaces: args.decision.affectedPlaces,
        amounts: args.decision.amounts,
        publicActions: args.decision.publicActions,
        state: 'extracted',
        promptVersion: args.promptVersion,
        schemaVersion: args.schemaVersion,
        modelRole: args.modelRole,
        modelId: args.modelId,
        route: args.route,
        createdAt: Date.now(),
      })
      for (const fact of args.facts) {
        await ctx.db.insert('candidateFacts', {
          candidateId,
          extractionId,
          fieldPath: fact.fieldPath,
          value: fact.value,
          sourceSnapshotId: fact.citation.sourceSnapshotId,
          excerpt: fact.citation.excerpt,
          page: fact.citation.page ?? undefined,
          section: fact.citation.section ?? undefined,
        })
      }
      await ctx.db.patch(extractionId, { candidateId })
    }

    await linkAiCallsToExtraction(ctx, args.runId, args.stageId, extractionId)

    await ctx.db.patch(args.stageId, {
      state: 'succeeded',
      completedAt: Date.now(),
      outputExtractionId: extractionId,
    })

    return { extractionId, candidateId }
  },
})

export const persistExtractionFailure = internalMutation({
  args: {
    runId: v.id('pipelineRuns'),
    stageId: v.id('pipelineStages'),
    registryId: v.id('sourceRegistries'),
    snapshotId: v.id('sourceSnapshots'),
    sourceKind: sourceKindUnion,
    targetRecordId: v.string(),
    sourceRecordIdProvenance: sourceRecordIdProvenances,
    modelRole: modelRoles,
    modelId: v.optional(v.string()),
    route: v.optional(aiRoutes),
    promptVersion: v.string(),
    schemaVersion: v.string(),
    errorClass: v.string(),
    errorDetail: v.string(),
    rawResponseStorageId: v.optional(v.id('_storage')),
    responseHash: v.optional(v.string()),
    responseByteLength: v.optional(v.number()),
  },
  returns: v.id('extractions'),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId)
    const stage = await ctx.db.get(args.stageId)
    requireRunStage(run, stage, args.stageId)
    if (
      !run ||
      stage?.stage !== 'extract' ||
      run.processorVersion !== EXTRACTION_PROCESSOR_VERSION ||
      args.modelRole !== 'MODEL_STRONG' ||
      args.promptVersion !== EXTRACTION_PROMPT_VERSION ||
      args.schemaVersion !== EXTRACTION_SCHEMA_VERSION ||
      run.registryId !== args.registryId ||
      run.snapshotId !== args.snapshotId ||
      run.sourceKind !== args.sourceKind ||
      run.targetRecordId !== args.targetRecordId ||
      resolveSourceRecordIdProvenance(run.sourceRecordIdProvenance) !==
        args.sourceRecordIdProvenance
    ) {
      throw new ConvexError({
        code: 'extraction_target_mismatch',
        message: 'Extraction run, stage, snapshot, kind, and target must agree',
      })
    }

    const existing = await ctx.db
      .query('extractions')
      .withIndex('by_run', (q) => q.eq('runId', args.runId))
      .unique()
    if (existing) {
      if (
        existing.registryId !== args.registryId ||
        existing.snapshotId !== args.snapshotId ||
        existing.sourceKind !== args.sourceKind ||
        existing.targetRecordId !== args.targetRecordId ||
        resolveSourceRecordIdProvenance(existing.sourceRecordIdProvenance) !==
          args.sourceRecordIdProvenance ||
        existing.state !== 'failed'
      ) {
        throw new ConvexError({
          code: 'extraction_idempotency_collision',
          message: `Run ${args.runId} already has a different extraction result`,
        })
      }
      await ctx.db.patch(args.stageId, {
        state: 'failed_terminal',
        completedAt: stage.completedAt ?? Date.now(),
        errorClass: existing.errorClass ?? args.errorClass,
        errorDetail: existing.errorDetail ?? args.errorDetail.slice(0, 500),
      })
      await linkAiCallsToExtraction(ctx, args.runId, args.stageId, existing._id)
      return existing._id
    }

    const extractionId = await ctx.db.insert('extractions', {
      runId: args.runId,
      registryId: args.registryId,
      snapshotId: args.snapshotId,
      sourceKind: args.sourceKind,
      targetRecordId: args.targetRecordId,
      sourceRecordIdProvenance: args.sourceRecordIdProvenance,
      promptVersion: args.promptVersion,
      schemaVersion: args.schemaVersion,
      processorVersion: run.processorVersion,
      modelRole: args.modelRole,
      modelId: args.modelId,
      route: args.route,
      state: 'failed',
      errorClass: args.errorClass,
      errorDetail: args.errorDetail.slice(0, 500),
      rawResponseStorageId: args.rawResponseStorageId,
      responseHash: args.responseHash,
      responseByteLength: args.responseByteLength,
      createdAt: Date.now(),
    })

    await linkAiCallsToExtraction(ctx, args.runId, args.stageId, extractionId)

    await ctx.db.patch(args.stageId, {
      state: 'failed_terminal',
      completedAt: Date.now(),
      errorClass: args.errorClass,
      errorDetail: args.errorDetail.slice(0, 500),
    })

    return extractionId
  },
})

export const failExtractionRun = internalMutation({
  args: {
    runId: v.id('pipelineRuns'),
    errorClass: v.string(),
    errorDetail: v.string(),
    extractionSeed: v.optional(
      v.object({
        registryId: v.id('sourceRegistries'),
        snapshotId: v.id('sourceSnapshots'),
        sourceKind: sourceKindUnion,
        targetRecordId: v.string(),
        sourceRecordIdProvenance: sourceRecordIdProvenances,
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => failExtractionRunTransaction(ctx, args),
})

type FailExtractionRunArgs = {
  runId: Id<'pipelineRuns'>
  errorClass: string
  errorDetail: string
  extractionSeed?: {
    registryId: Id<'sourceRegistries'>
    snapshotId: Id<'sourceSnapshots'>
    sourceKind: typeof sourceKindUnion.type
    targetRecordId: string
    sourceRecordIdProvenance: typeof sourceRecordIdProvenances.type
  }
}

export async function failExtractionRunTransaction(
  ctx: MutationCtx,
  args: FailExtractionRunArgs,
): Promise<null> {
  const now = Date.now()
  const run = await ctx.db.get(args.runId)
  if (!run) {
    throw new ConvexError({
      code: 'run_missing',
      message: `Pipeline run ${args.runId} does not exist`,
    })
  }
  if (run.state === 'succeeded' || run.state === 'superseded') {
    return null
  }
  if (
    run.trigger === 'manual_extraction' &&
    (!args.extractionSeed ||
      run.registryId !== args.extractionSeed.registryId ||
      run.snapshotId !== args.extractionSeed.snapshotId ||
      run.sourceKind !== args.extractionSeed.sourceKind ||
      run.targetRecordId !== args.extractionSeed.targetRecordId ||
      resolveSourceRecordIdProvenance(run.sourceRecordIdProvenance) !==
        args.extractionSeed.sourceRecordIdProvenance)
  ) {
    throw new ConvexError({
      code: 'extraction_target_mismatch',
      message: 'Failure evidence must match the extraction run target',
    })
  }
  if (run.state !== 'failed_terminal') {
    await ctx.db.patch(args.runId, {
      state: 'failed_terminal',
      completedAt: now,
    })
  }

  const stages = await ctx.db
    .query('pipelineStages')
    .withIndex('by_run_and_stage', (q) => q.eq('runId', args.runId))
    .take(8)
  for (const stage of stages) {
    if (
      stage.state !== 'succeeded' &&
      stage.state !== 'failed_terminal' &&
      stage.state !== 'superseded'
    ) {
      await ctx.db.patch(stage._id, {
        state: 'failed_terminal',
        errorClass: args.errorClass,
        errorDetail: args.errorDetail.slice(0, 500),
        completedAt: now,
      })
    }
  }

  let extraction = await ctx.db
    .query('extractions')
    .withIndex('by_run', (q) => q.eq('runId', args.runId))
    .unique()
  if (
    extraction &&
    args.extractionSeed &&
    (extraction.registryId !== args.extractionSeed.registryId ||
      extraction.snapshotId !== args.extractionSeed.snapshotId ||
      extraction.sourceKind !== args.extractionSeed.sourceKind ||
      extraction.targetRecordId !== args.extractionSeed.targetRecordId ||
      resolveSourceRecordIdProvenance(extraction.sourceRecordIdProvenance) !==
        args.extractionSeed.sourceRecordIdProvenance)
  ) {
    throw new ConvexError({
      code: 'extraction_target_mismatch',
      message: 'Existing extraction does not match the failed run target',
    })
  }
  const extractStage = stages.find((stage) => stage.stage === 'extract')
  if (!extraction && args.extractionSeed) {
    const extractionId = await ctx.db.insert('extractions', {
      runId: args.runId,
      registryId: args.extractionSeed.registryId,
      snapshotId: args.extractionSeed.snapshotId,
      sourceKind: args.extractionSeed.sourceKind,
      targetRecordId: args.extractionSeed.targetRecordId,
      sourceRecordIdProvenance: args.extractionSeed.sourceRecordIdProvenance,
      promptVersion: extractStage?.promptVersion ?? EXTRACTION_PROMPT_VERSION,
      schemaVersion: extractStage?.schemaVersion ?? EXTRACTION_SCHEMA_VERSION,
      processorVersion: run.processorVersion,
      modelRole: 'MODEL_STRONG',
      state: 'failed',
      errorClass: args.errorClass,
      errorDetail: args.errorDetail.slice(0, 500),
      createdAt: now,
    })
    extraction = await ctx.db.get(extractionId)
  }
  if (extraction && extractStage) {
    await linkAiCallsToExtraction(
      ctx,
      args.runId,
      extractStage._id,
      extraction._id,
    )
  }
  return null
}

export const completeExtractionRun = internalMutation({
  args: {
    runId: v.id('pipelineRuns'),
    extractionId: v.id('extractions'),
  },
  returns: v.null(),
  handler: async (ctx, args) => completeExtractionRunTransaction(ctx, args),
})

export async function completeExtractionRunTransaction(
  ctx: MutationCtx,
  args: { runId: Id<'pipelineRuns'>; extractionId: Id<'extractions'> },
): Promise<null> {
  const run = await ctx.db.get(args.runId)
  if (!run) {
    throw new ConvexError({
      code: 'run_missing',
      message: `Pipeline run ${args.runId} does not exist`,
    })
  }
  if (run.state === 'failed_terminal' || run.state === 'superseded') {
    throw new ConvexError({
      code: 'run_state_collision',
      message: `Run ${args.runId} cannot complete from ${run.state}`,
    })
  }
  const stages = await ctx.db
    .query('pipelineStages')
    .withIndex('by_run_and_stage', (q) => q.eq('runId', args.runId))
    .take(8)
  const extractStage = stages.find((stage) => stage.stage === 'extract')
  const validateStage = stages.find((stage) => stage.stage === 'validate')
  const extraction = await ctx.db.get(args.extractionId)
  if (
    !extractStage ||
    !validateStage ||
    run.processorVersion !== EXTRACTION_PROCESSOR_VERSION ||
    extractStage.state !== 'succeeded' ||
    validateStage.state !== 'succeeded' ||
    extractStage.outputExtractionId !== args.extractionId ||
    validateStage.outputExtractionId !== args.extractionId ||
    !extraction ||
    extraction.runId !== run._id ||
    extraction.registryId !== run.registryId ||
    extraction.snapshotId !== run.snapshotId ||
    extraction.sourceKind !== run.sourceKind ||
    extraction.targetRecordId !== run.targetRecordId
  ) {
    throw new ConvexError({
      code: 'run_completion_invariant_failed',
      message: 'Extraction and validation must both finish for the same target',
    })
  }
  if (extraction.state === 'failed') {
    throw new ConvexError({
      code: 'run_completion_invariant_failed',
      message: 'A failed extraction cannot complete successfully',
    })
  }
  if (extraction.state === 'not_found') {
    if (extraction.candidateId !== undefined) {
      throw new ConvexError({
        code: 'run_completion_invariant_failed',
        message: 'A not-found extraction cannot own a candidate',
      })
    }
  } else {
    const candidate = extraction.candidateId
      ? await ctx.db.get(extraction.candidateId)
      : null
    if (
      !candidate ||
      candidate.extractionId !== extraction._id ||
      candidate.runId !== run._id ||
      candidate.registryId !== extraction.registryId ||
      candidate.snapshotId !== extraction.snapshotId ||
      candidate.sourceKind !== extraction.sourceKind ||
      candidate.targetRecordId !== extraction.targetRecordId ||
      candidate.state !== 'deterministically_validated'
    ) {
      throw new ConvexError({
        code: 'run_completion_invariant_failed',
        message: 'A found extraction needs its validated candidate',
      })
    }
  }
  if (run.state === 'succeeded') {
    return null
  }
  await ctx.db.patch(args.runId, {
    state: 'succeeded',
    completedAt: Date.now(),
  })
  return null
}

export const loadValidationRows = internalQuery({
  args: {
    runId: v.id('pipelineRuns'),
    validateStageId: v.id('pipelineStages'),
    extractionId: v.id('extractions'),
  },
  returns: v.object({
    extraction: v.union(v.null(), schema.doc('extractions')),
    candidate: v.union(v.null(), schema.doc('decisionCandidates')),
    facts: v.union(v.null(), v.array(schema.doc('candidateFacts'))),
    snapshot: v.union(v.null(), schema.doc('sourceSnapshots')),
    officialDomains: v.union(v.null(), v.array(v.string())),
    seedUrls: v.union(v.null(), v.array(v.string())),
    approvedDocumentHosts: v.optional(v.array(v.object({ host: v.string(), pathPrefixes: v.array(v.string()) }))),
    registeredBodyName: v.union(v.null(), v.string()),
  }),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId)
    const stage = await ctx.db.get(args.validateStageId)
    requireRunStage(run, stage, args.validateStageId)
    if (
      !run ||
      stage?.stage !== 'validate' ||
      run.processorVersion !== EXTRACTION_PROCESSOR_VERSION
    ) {
      throw new ConvexError({
        code: 'validation_target_mismatch',
        message:
          'Validation action input must match its pipeline run and stage',
      })
    }
    const extraction = await ctx.db.get(args.extractionId)
    if (!extraction) {
      return {
        extraction: null,
        candidate: null,
        facts: null,
        snapshot: null,
        officialDomains: null,
        seedUrls: null,
        registeredBodyName: null,
      }
    }
    if (
      extraction.runId !== run._id ||
      extraction.registryId !== run.registryId ||
      extraction.snapshotId !== run.snapshotId ||
      extraction.sourceKind !== run.sourceKind ||
      extraction.targetRecordId !== run.targetRecordId ||
      extraction.processorVersion !== run.processorVersion
    ) {
      throw new ConvexError({
        code: 'validation_target_mismatch',
        message: 'Validation extraction must match its pipeline run target',
      })
    }
    const candidate = extraction.candidateId
      ? await ctx.db.get(extraction.candidateId)
      : null
    const facts = candidate
      ? await ctx.db
          .query('candidateFacts')
          .withIndex('by_candidate_and_field_path', (q) =>
            q.eq('candidateId', candidate._id),
          )
          .take(MATERIAL_ARRAY_LIMITS.facts)
      : null
    const snapshot = await ctx.db.get(extraction.snapshotId)
    const registry = await ctx.db.get(extraction.registryId)
    const body = registry ? await ctx.db.get(registry.governmentBodyId) : null
    return {
      extraction,
      candidate,
      facts,
      snapshot,
      officialDomains: registry?.officialDomains ?? null,
      seedUrls: registry?.seedUrls ?? null,
      approvedDocumentHosts: registry?.approvedDocumentHosts,
      registeredBodyName: body?.name ?? null,
    }
  },
})

export const persistValidationSuccess = internalMutation({
  args: {
    runId: v.id('pipelineRuns'),
    validateStageId: v.id('pipelineStages'),
    extractionId: v.id('extractions'),
    candidateId: v.id('decisionCandidates'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const candidateState = await requireValidationTargets(
      ctx,
      args,
      'extracted',
    )
    if (candidateState === 'validation_failed') {
      throw new ConvexError({
        code: 'validation_state_collision',
        message: 'A failed candidate cannot later pass validation',
      })
    }
    const now = Date.now()
    await ctx.db.patch(args.candidateId, {
      state: 'deterministically_validated',
    })
    await ctx.db.patch(args.validateStageId, {
      state: 'succeeded',
      completedAt: now,
      outputExtractionId: args.extractionId,
    })
    return null
  },
})

export const persistValidationFailure = internalMutation({
  args: {
    runId: v.id('pipelineRuns'),
    validateStageId: v.id('pipelineStages'),
    extractionId: v.id('extractions'),
    candidateId: v.id('decisionCandidates'),
    findings: v.array(
      v.object({
        code: v.string(),
        fieldPath: v.optional(v.string()),
        detail: v.string(),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const candidateState = await requireValidationTargets(
      ctx,
      args,
      'extracted',
    )
    if (candidateState === 'deterministically_validated') {
      throw new ConvexError({
        code: 'validation_state_collision',
        message: 'A validated candidate cannot later fail validation',
      })
    }
    const now = Date.now()
    const existing = await ctx.db
      .query('validationFindings')
      .withIndex('by_extraction', (q) =>
        q.eq('extractionId', args.extractionId),
      )
      .take(MATERIAL_ARRAY_LIMITS.facts + 1)
    if (
      existing.some(
        (finding) =>
          finding.runId !== args.runId ||
          finding.candidateId !== args.candidateId,
      )
    ) {
      throw new ConvexError({
        code: 'validation_idempotency_collision',
        message: `Extraction ${args.extractionId} has findings for another run or candidate`,
      })
    }
    if (existing.length === 0) {
      for (const finding of args.findings) {
        await ctx.db.insert('validationFindings', {
          runId: args.runId,
          extractionId: args.extractionId,
          candidateId: args.candidateId,
          code: finding.code,
          fieldPath: finding.fieldPath,
          detail: finding.detail.slice(0, 500),
          createdAt: now,
        })
      }
    }
    await ctx.db.patch(args.candidateId, { state: 'validation_failed' })
    await ctx.db.patch(args.validateStageId, {
      state: 'failed_terminal',
      completedAt: now,
      outputExtractionId: args.extractionId,
      errorClass: 'validation_failed',
      errorDetail: args.findings
        .map((finding) => finding.code)
        .join(',')
        .slice(0, 500),
    })
    return null
  },
})

export const closeNotFoundValidation = internalMutation({
  args: {
    runId: v.id('pipelineRuns'),
    validateStageId: v.id('pipelineStages'),
    extractionId: v.id('extractions'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireValidationTargets(ctx, args, 'not_found')
    await ctx.db.patch(args.validateStageId, {
      state: 'succeeded',
      completedAt: Date.now(),
      outputExtractionId: args.extractionId,
    })
    return null
  },
})
