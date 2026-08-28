import { v } from 'convex/values'

import { internal } from '../_generated/api'
import { internalMutation } from '../_generated/server'
import {
  EXTRACTION_PROCESSOR_VERSION,
  sourceKindUnion,
} from '../pipeline/state'
import { extractionRunKey } from '../pipeline/keys'
import { extractionWorkflowManager } from '../pipeline/workflowManager'
import {
  EXTRACTION_PROMPT_VERSION,
  EXTRACTION_SCHEMA_VERSION,
} from '../extraction/versions'

const startExtractionResultValidator = v.object({
  runId: v.id('pipelineRuns'),
  extractStageId: v.id('pipelineStages'),
  validateStageId: v.id('pipelineStages'),
  workflowId: v.union(v.string(), v.null()),
  reused: v.boolean(),
})

type StartExtractionResult = typeof startExtractionResultValidator.type

export const startSnapshotExtraction = internalMutation({
  args: {
    registryId: v.id('sourceRegistries'),
    snapshotId: v.id('sourceSnapshots'),
    sourceKind: sourceKindUnion,
    targetRecordId: v.string(),
  },
  returns: startExtractionResultValidator,
  handler: async (ctx, args): Promise<StartExtractionResult> => {
    const idempotencyKey = await extractionRunKey({
      registryId: args.registryId,
      snapshotId: args.snapshotId,
      sourceKind: args.sourceKind,
      targetRecordId: args.targetRecordId,
      promptVersion: EXTRACTION_PROMPT_VERSION,
      schemaVersion: EXTRACTION_SCHEMA_VERSION,
      processorVersion: EXTRACTION_PROCESSOR_VERSION,
    })

    const existing = await ctx.db
      .query('pipelineRuns')
      .withIndex('by_idempotency_key', (q) =>
        q.eq('idempotencyKey', idempotencyKey),
      )
      .order('desc')
      .first()
    if (
      existing &&
      (existing.state === 'succeeded' ||
        existing.state === 'running' ||
        existing.state === 'queued')
    ) {
      const stages = await ctx.db
        .query('pipelineStages')
        .withIndex('by_run_and_stage', (q) => q.eq('runId', existing._id))
        .take(8)
      const extractStage = stages.find((stage) => stage.stage === 'extract')
      const validateStage = stages.find((stage) => stage.stage === 'validate')
      if (extractStage && validateStage) {
        return {
          runId: existing._id,
          extractStageId: extractStage._id,
          validateStageId: validateStage._id,
          workflowId: existing.workflowId ?? null,
          reused: true,
        }
      }
    }

    const startedAt = Date.now()
    const runId = await ctx.db.insert('pipelineRuns', {
      registryId: args.registryId,
      trigger: 'manual_extraction',
      state: 'running',
      processorVersion: EXTRACTION_PROCESSOR_VERSION,
      snapshotId: args.snapshotId,
      sourceKind: args.sourceKind,
      targetRecordId: args.targetRecordId,
      idempotencyKey,
      startedAt,
    })
    const extractStageId = await ctx.db.insert('pipelineStages', {
      runId,
      stage: 'extract',
      idempotencyKey: `${idempotencyKey}:extract`,
      state: 'queued',
      attempt: 0,
      inputSnapshotId: args.snapshotId,
      promptVersion: EXTRACTION_PROMPT_VERSION,
      schemaVersion: EXTRACTION_SCHEMA_VERSION,
    })
    const validateStageId = await ctx.db.insert('pipelineStages', {
      runId,
      stage: 'validate',
      idempotencyKey: `${idempotencyKey}:validate`,
      state: 'queued',
      attempt: 0,
      inputSnapshotId: args.snapshotId,
    })

    const workflowId = await extractionWorkflowManager.start(
      ctx,
      internal.extraction.workflow.extractSnapshotV1,
      {
        runId,
        registryId: args.registryId,
        snapshotId: args.snapshotId,
        sourceKind: args.sourceKind,
        targetRecordId: args.targetRecordId,
        extractStageId,
        validateStageId,
      },
      {
        onComplete: internal.extraction.workflow.handleExtractionComplete,
        context: { runId },
      },
    )
    await ctx.db.patch(runId, { workflowId })

    return {
      runId,
      extractStageId,
      validateStageId,
      workflowId,
      reused: false,
    }
  },
})
