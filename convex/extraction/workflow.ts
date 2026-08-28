import { v } from 'convex/values'
import { vResultValidator, vWorkflowId } from '@convex-dev/workflow'

import { internal } from '../_generated/api'
import { internalMutation } from '../_generated/server'
import { sourceKindUnion } from '../pipeline/state'
import { extractionWorkflowManager } from '../pipeline/workflowManager'
import { failExtractionRunTransaction } from './ledger'

const workflowResultValidator = v.object({
  outcome: v.union(
    v.literal('validated'),
    v.literal('not_found'),
    v.literal('failed'),
  ),
  extractionId: v.optional(v.id('extractions')),
  candidateId: v.optional(v.id('decisionCandidates')),
  errorClass: v.optional(v.string()),
  errorDetail: v.optional(v.string()),
})

type WorkflowResult = typeof workflowResultValidator.type

export const extractSnapshotV1 = extractionWorkflowManager
  .define({
    args: {
      runId: v.id('pipelineRuns'),
      registryId: v.id('sourceRegistries'),
      snapshotId: v.id('sourceSnapshots'),
      sourceKind: sourceKindUnion,
      targetRecordId: v.string(),
      extractStageId: v.id('pipelineStages'),
      validateStageId: v.id('pipelineStages'),
    },
    returns: workflowResultValidator,
  })
  .handler(async (step, args): Promise<WorkflowResult> => {
    const prepared = await step.runQuery(
      internal.extraction.prepare.prepareExtractionContext,
      {
        registryId: args.registryId,
        snapshotId: args.snapshotId,
        sourceKind: args.sourceKind,
        targetRecordId: args.targetRecordId,
      },
      { name: 'prepare-extraction-v1' },
    )

    const failArgs = {
      runId: args.runId,
      errorClass: '',
      errorDetail: '',
      extractionSeed: {
        registryId: args.registryId,
        snapshotId: args.snapshotId,
        sourceKind: args.sourceKind,
        targetRecordId: args.targetRecordId,
      },
    }

    if (!prepared.ok) {
      await step.runMutation(
        internal.extraction.ledger.failExtractionRun,
        {
          ...failArgs,
          errorClass: prepared.errorClass,
          errorDetail: prepared.errorDetail,
        },
        { name: 'fail-extraction-v1' },
      )
      return {
        outcome: 'failed',
        errorClass: prepared.errorClass,
        errorDetail: prepared.errorDetail,
      }
    }

    let extractionResult
    try {
      extractionResult = await step.runAction(
        internal.extraction.extract.runExtraction,
        {
          runId: args.runId,
          extractStageId: args.extractStageId,
          context: prepared.context,
        },
        { name: 'extract-model-v1', retry: true },
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const errorClass = message.startsWith('model_transient:')
        ? 'model_transient_exhausted'
        : 'extraction_step_failed'
      await step.runMutation(
        internal.extraction.ledger.failExtractionRun,
        {
          ...failArgs,
          errorClass,
          errorDetail: message.slice(0, 500),
        },
        { name: 'fail-extraction-v1' },
      )
      return {
        outcome: 'failed',
        errorClass,
        errorDetail: message.slice(0, 500),
      }
    }

    if (extractionResult.kind === 'failed') {
      await step.runMutation(
        internal.extraction.ledger.failExtractionRun,
        {
          ...failArgs,
          errorClass: extractionResult.errorClass,
          errorDetail: extractionResult.errorDetail,
        },
        { name: 'fail-extraction-v1' },
      )
      return {
        outcome: 'failed',
        extractionId: extractionResult.extractionId,
        errorClass: extractionResult.errorClass,
        errorDetail: extractionResult.errorDetail,
      }
    }

    const validation = await step.runAction(
      internal.extraction.validate.runValidation,
      {
        runId: args.runId,
        extractionId: extractionResult.extractionId,
        validateStageId: args.validateStageId,
      },
      { name: 'validate-citations-v1' },
    )

    if (validation.outcome === 'validation_failed') {
      await step.runMutation(
        internal.extraction.ledger.failExtractionRun,
        {
          ...failArgs,
          errorClass: 'validation_failed',
          errorDetail: validation.codes.join(',').slice(0, 500),
        },
        { name: 'fail-extraction-v1' },
      )
      return {
        outcome: 'failed',
        extractionId: extractionResult.extractionId,
        errorClass: 'validation_failed',
        errorDetail: validation.codes.join(',').slice(0, 500),
      }
    }
    if (validation.outcome === 'invariant_failed') {
      await step.runMutation(
        internal.extraction.ledger.failExtractionRun,
        {
          ...failArgs,
          errorClass: validation.errorClass,
          errorDetail: validation.errorDetail,
        },
        { name: 'fail-extraction-v1' },
      )
      return {
        outcome: 'failed',
        extractionId: extractionResult.extractionId,
        errorClass: validation.errorClass,
        errorDetail: validation.errorDetail,
      }
    }

    await step.runMutation(
      internal.extraction.ledger.completeExtractionRun,
      { runId: args.runId, extractionId: extractionResult.extractionId },
      { name: 'complete-extraction-v1' },
    )

    return validation.outcome === 'validated'
      ? {
          outcome: 'validated',
          extractionId: extractionResult.extractionId,
          candidateId: validation.candidateId,
        }
      : { outcome: 'not_found', extractionId: extractionResult.extractionId }
  })

export const handleExtractionComplete = internalMutation({
  args: {
    workflowId: vWorkflowId,
    result: vResultValidator,
    context: v.object({ runId: v.id('pipelineRuns') }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.result.kind === 'success') {
      return null
    }
    const run = await ctx.db.get(args.context.runId)
    if (!run) {
      return null
    }
    const errorClass =
      args.result.kind === 'canceled' ? 'workflow_canceled' : 'workflow_failed'
    const errorDetail =
      args.result.kind === 'canceled' ? 'canceled' : args.result.error
    await failExtractionRunTransaction(ctx, {
      runId: args.context.runId,
      errorClass,
      errorDetail,
      extractionSeed:
        run.snapshotId && run.sourceKind && run.targetRecordId
          ? {
              registryId: run.registryId,
              snapshotId: run.snapshotId,
              sourceKind: run.sourceKind,
              targetRecordId: run.targetRecordId,
            }
          : undefined,
    })
    return null
  },
})
