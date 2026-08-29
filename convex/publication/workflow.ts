import { vResultValidator, vWorkflowId } from '@convex-dev/workflow'
import { v } from 'convex/values'

import { internal } from '../_generated/api'
import { internalMutation } from '../_generated/server'
import { publicationWorkflowManager } from '../pipeline/workflowManager'
import { failPublicationRunTransaction } from './ledger'

const publicationWorkflowResult = v.union(
  v.object({
    outcome: v.literal('published'),
    publicationVersionId: v.id('publicationVersions'),
    mode: v.union(v.literal('full'), v.literal('limited')),
  }),
  v.object({
    outcome: v.literal('withheld'),
    publicationVersionId: v.id('publicationVersions'),
  }),
  v.object({
    outcome: v.literal('failed'),
    errorClass: v.string(),
    errorDetail: v.string(),
  }),
)

type PublicationWorkflowResult = typeof publicationWorkflowResult.type

export const reviewAndPublishCandidateV1 = publicationWorkflowManager
  .define({
    args: {
      runId: v.id('pipelineRuns'),
      candidateId: v.id('decisionCandidates'),
      reviewStageId: v.id('pipelineStages'),
      finalizeStageId: v.id('pipelineStages'),
    },
    returns: publicationWorkflowResult,
  })
  .handler(async (step, args): Promise<PublicationWorkflowResult> => {
    const prepared = await step.runAction(
      internal.review.prepare.prepareCandidateReview,
      {
        runId: args.runId,
        reviewStageId: args.reviewStageId,
        candidateId: args.candidateId,
      },
      { name: 'prepare-independent-review-v1' },
    )
    if (!prepared.ok) {
      await step.runMutation(
        internal.publication.ledger.failPublicationRun,
        {
          runId: args.runId,
          errorClass: prepared.errorClass,
          errorDetail: prepared.errorDetail,
        },
        { name: 'fail-publication-v1' },
      )
      return {
        outcome: 'failed',
        errorClass: prepared.errorClass,
        errorDetail: prepared.errorDetail,
      }
    }

    let reviewed
    try {
      reviewed = await step.runAction(
        internal.review.review.runIndependentReview,
        {
          runId: args.runId,
          reviewStageId: args.reviewStageId,
          context: prepared.context,
        },
        { name: 'independent-review-model-v1', retry: true },
      )
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      await step.runMutation(
        internal.publication.ledger.failPublicationRun,
        {
          runId: args.runId,
          errorClass: detail.startsWith('model_transient:')
            ? 'model_transient_exhausted'
            : 'review_step_failed',
          errorDetail: detail.slice(0, 500),
        },
        { name: 'fail-publication-v1' },
      )
      return {
        outcome: 'failed',
        errorClass: detail.startsWith('model_transient:')
          ? 'model_transient_exhausted'
          : 'review_step_failed',
        errorDetail: detail.slice(0, 500),
      }
    }
    if (reviewed.kind === 'failed') {
      return {
        outcome: 'failed',
        errorClass: reviewed.errorClass,
        errorDetail: reviewed.errorDetail,
      }
    }

    const rechecked = await step.runAction(
      internal.review.prepare.prepareCandidateReview,
      {
        runId: args.runId,
        reviewStageId: args.reviewStageId,
        candidateId: args.candidateId,
      },
      { name: 'recheck-publication-input-v1' },
    )
    if (
      !rechecked.ok ||
      rechecked.context.inputHash !== prepared.context.inputHash
    ) {
      const errorClass = rechecked.ok
        ? 'review_input_changed'
        : rechecked.errorClass
      const errorDetail = rechecked.ok
        ? 'Candidate evidence changed while the independent review was running'
        : rechecked.errorDetail
      await step.runMutation(
        internal.publication.ledger.failPublicationRun,
        { runId: args.runId, errorClass, errorDetail },
        { name: 'fail-publication-v1' },
      )
      return { outcome: 'failed', errorClass, errorDetail }
    }

    const finalized = await step.runMutation(
      internal.publication.ledger.finalizePublication,
      {
        runId: args.runId,
        finalizeStageId: args.finalizeStageId,
        reviewId: reviewed.reviewId,
        context: rechecked.context,
      },
      { name: 'apply-publication-policy-v1' },
    )
    return finalized.mode === 'withheld'
      ? {
          outcome: 'withheld',
          publicationVersionId: finalized.publicationVersionId,
        }
      : {
          outcome: 'published',
          publicationVersionId: finalized.publicationVersionId,
          mode: finalized.mode,
        }
  })

export const handlePublicationComplete = internalMutation({
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
    await failPublicationRunTransaction(ctx, {
      runId: args.context.runId,
      errorClass:
        args.result.kind === 'canceled'
          ? 'workflow_canceled'
          : 'workflow_failed',
      errorDetail:
        args.result.kind === 'canceled' ? 'canceled' : args.result.error,
    })
    return null
  },
})
