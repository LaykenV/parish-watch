import { ConvexError, v } from 'convex/values'

import type { Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'
import { internalMutation, internalQuery } from '../_generated/server'
import { aiRoutes, estimateCostUsd, modelRoles } from '../ai/types'
import { sourceKindUnion } from '../pipeline/state'
import schema from '../schema'
import {
  MATERIAL_ARRAY_LIMITS,
  storedDecisionV1,
  storedFactsV1,
} from './contractV1'
import {
  EXTRACTION_PROCESSOR_VERSION,
  EXTRACTION_PROMPT_VERSION,
  EXTRACTION_SCHEMA_VERSION,
} from './versions'

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
    .take(8)
  for (const call of calls) {
    if (call.stageId === stageId && call.extractionId === undefined) {
      await ctx.db.patch(call._id, { extractionId })
    }
  }
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
  args: { runId: v.id('pipelineRuns') },
  returns: storedExtractionResult,
  handler: async (ctx, args) => {
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
  args: { stageId: v.id('pipelineStages') },
  returns: v.number(),
  handler: async (ctx, args) => {
    const stage = await ctx.db.get(args.stageId)
    if (!stage) {
      throw new ConvexError({
        code: 'stage_missing',
        message: `Stage ${args.stageId} does not exist`,
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
        completedAt: stage?.completedAt ?? Date.now(),
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
      promptVersion: args.promptVersion,
      schemaVersion: args.schemaVersion,
      processorVersion: EXTRACTION_PROCESSOR_VERSION,
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
        existing.state !== 'failed'
      ) {
        throw new ConvexError({
          code: 'extraction_idempotency_collision',
          message: `Run ${args.runId} already has a different extraction result`,
        })
      }
      await ctx.db.patch(args.stageId, {
        state: 'failed_terminal',
        completedAt: stage?.completedAt ?? Date.now(),
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
      promptVersion: args.promptVersion,
      schemaVersion: args.schemaVersion,
      processorVersion: EXTRACTION_PROCESSOR_VERSION,
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
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now()
    const run = await ctx.db.get(args.runId)
    if (!run) {
      throw new ConvexError({
        code: 'run_missing',
        message: `Pipeline run ${args.runId} does not exist`,
      })
    }
    if (
      run.state !== 'succeeded' &&
      run.state !== 'failed_terminal' &&
      run.state !== 'superseded'
    ) {
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

    const existingExtraction = await ctx.db
      .query('extractions')
      .withIndex('by_run', (q) => q.eq('runId', args.runId))
      .first()
    if (!existingExtraction && args.extractionSeed) {
      await ctx.db.insert('extractions', {
        runId: args.runId,
        registryId: args.extractionSeed.registryId,
        snapshotId: args.extractionSeed.snapshotId,
        sourceKind: args.extractionSeed.sourceKind,
        targetRecordId: args.extractionSeed.targetRecordId,
        promptVersion: EXTRACTION_PROMPT_VERSION,
        schemaVersion: EXTRACTION_SCHEMA_VERSION,
        processorVersion: EXTRACTION_PROCESSOR_VERSION,
        modelRole: 'MODEL_STRONG',
        state: 'failed',
        errorClass: args.errorClass,
        errorDetail: args.errorDetail.slice(0, 500),
        createdAt: now,
      })
    }
    return null
  },
})

export const completeExtractionRun = internalMutation({
  args: { runId: v.id('pipelineRuns') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId)
    if (!run) {
      throw new ConvexError({
        code: 'run_missing',
        message: `Pipeline run ${args.runId} does not exist`,
      })
    }
    if (
      run.state === 'succeeded' ||
      run.state === 'failed_terminal' ||
      run.state === 'superseded'
    ) {
      return null
    }
    await ctx.db.patch(args.runId, {
      state: 'succeeded',
      completedAt: Date.now(),
    })
    return null
  },
})

export const loadValidationRows = internalQuery({
  args: { extractionId: v.id('extractions') },
  returns: v.object({
    extraction: v.union(v.null(), schema.doc('extractions')),
    candidate: v.union(v.null(), schema.doc('decisionCandidates')),
    facts: v.union(v.null(), v.array(schema.doc('candidateFacts'))),
    snapshot: v.union(v.null(), schema.doc('sourceSnapshots')),
    officialDomains: v.union(v.null(), v.array(v.string())),
    registeredBodyName: v.union(v.null(), v.string()),
  }),
  handler: async (ctx, args) => {
    const extraction = await ctx.db.get(args.extractionId)
    if (!extraction) {
      return {
        extraction: null,
        candidate: null,
        facts: null,
        snapshot: null,
        officialDomains: null,
        registeredBodyName: null,
      }
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
    const now = Date.now()
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
    await ctx.db.patch(args.candidateId, { state: 'validation_failed' })
    await ctx.db.patch(args.validateStageId, {
      state: 'failed_terminal',
      completedAt: now,
      outputExtractionId: args.extractionId,
      errorClass: 'validation_failed',
      errorDetail: args.findings.map((finding) => finding.code).join(','),
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
    await ctx.db.patch(args.validateStageId, {
      state: 'succeeded',
      completedAt: Date.now(),
      outputExtractionId: args.extractionId,
    })
    return null
  },
})
