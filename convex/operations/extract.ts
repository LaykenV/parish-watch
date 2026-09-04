import { ConvexError, v } from 'convex/values'

import { internal } from '../_generated/api'
import { internalMutation } from '../_generated/server'
import {
  EXTRACTION_PROCESSOR_VERSION,
  EXTRACTION_PROMPT_VERSION,
  EXTRACTION_SCHEMA_VERSION,
  resolveSourceRecordIdProvenance,
  sourceRecordIdProvenances,
  sourceKindUnion,
} from '../pipeline/state'
import { extractionRunKey } from '../pipeline/keys'
import { extractionWorkflowManager } from '../pipeline/workflowManager'
import { MATERIAL_STRING_LIMITS } from '../extraction/contractV1'
import { assertMonitoringRun } from '../monitoring/ledger'
import { startCandidatePublicationTransaction } from './publication'

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
    monitorTargetId: v.optional(v.id('documentInventoryTargets')),
    registryId: v.id('sourceRegistries'),
    snapshotId: v.id('sourceSnapshots'),
    sourceKind: sourceKindUnion,
    targetRecordId: v.string(),
    sourceRecordIdProvenance: v.optional(sourceRecordIdProvenances),
  },
  returns: startExtractionResultValidator,
  handler: async (ctx, args): Promise<StartExtractionResult> => {
    if (
      args.targetRecordId.trim() === '' ||
      args.targetRecordId.length > MATERIAL_STRING_LIMITS.sourceRecordId ||
      /[\r\n]/.test(args.targetRecordId)
    ) {
      throw new ConvexError({
        code: 'invalid_target_record_id',
        message: `Target record ID must be one line with 1 to ${MATERIAL_STRING_LIMITS.sourceRecordId} characters`,
      })
    }
    const target = args.monitorTargetId ? await ctx.db.get(args.monitorTargetId) : null
    const policy = target ? await ctx.db.get(target.policyId) : null
    const monitoring = policy?.activeRunId ? await assertMonitoringRun(ctx, policy.activeRunId) : null
    if (args.monitorTargetId && (!target || !monitoring || target.registryId !== args.registryId || target.snapshotId !== args.snapshotId || target.targetRecordId !== args.targetRecordId || target.sourceKind !== args.sourceKind || target.sourceRecordIdProvenance !== args.sourceRecordIdProvenance)) throw new Error('Monitoring target mismatch.')
    const sourceRecordIdProvenance = resolveSourceRecordIdProvenance(
      args.sourceRecordIdProvenance,
    )
    const idempotencyKey = await extractionRunKey({
      registryId: args.registryId,
      snapshotId: args.snapshotId,
      sourceKind: args.sourceKind,
      targetRecordId: args.targetRecordId,
      sourceRecordIdProvenance,
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
        if (existing.state === 'succeeded') {
          const extraction = await ctx.db
            .query('extractions')
            .withIndex('by_run', (q) => q.eq('runId', existing._id))
            .unique()
          if (!extraction || extraction.state === 'failed') {
            throw new ConvexError({
              code: 'run_completion_invariant_failed',
              message: 'A successful extraction run needs its result',
            })
          }
          if (extraction.state === 'extracted') {
            if (extraction.candidateId === undefined) {
              throw new ConvexError({
                code: 'run_completion_invariant_failed',
                message: 'A found extraction needs its validated candidate',
              })
            }
            await startCandidatePublicationTransaction(ctx, {
              candidateId: extraction.candidateId,
              trigger: 'validated_candidate',
            })
          }
        }
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
      ...(monitoring && target ? { monitorPolicyId: monitoring.policy._id, monitorGeneration: monitoring.policy.generation, monitorRegistryGeneration: monitoring.run.registryGeneration, suppressNotifications: !target.notificationEligible, targetLocator: target.locator } : {}),
      state: 'running',
      processorVersion: EXTRACTION_PROCESSOR_VERSION,
      snapshotId: args.snapshotId,
      sourceKind: args.sourceKind,
      targetRecordId: args.targetRecordId,
      sourceRecordIdProvenance,
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
        sourceRecordIdProvenance,
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
