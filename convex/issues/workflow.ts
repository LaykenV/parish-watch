import { vResultValidator, vWorkflowId } from '@convex-dev/workflow'
import { v } from 'convex/values'

import { internal } from '../_generated/api'
import { internalMutation } from '../_generated/server'
import { issueWorkflowManager } from '../pipeline/workflowManager'
import { failIssueBuildTransaction } from './ledger'

const issueWorkflowResult = v.union(
  v.object({
    outcome: v.literal('published'),
    issueId: v.id('issues'),
    issueVersionId: v.id('issueVersions'),
    mode: v.union(v.literal('full'), v.literal('limited')),
  }),
  v.object({
    outcome: v.literal('withheld'),
    issueId: v.id('issues'),
    issueVersionId: v.id('issueVersions'),
  }),
  v.object({
    outcome: v.literal('failed'),
    errorClass: v.string(),
    errorDetail: v.string(),
  }),
)

type IssueWorkflowResult = typeof issueWorkflowResult.type

export const buildIssueV1 = issueWorkflowManager
  .define({
    args: {
      issueBuildId: v.id('issueBuilds'),
      linkStageId: v.id('pipelineStages'),
      reviewStageId: v.id('pipelineStages'),
      rankStageId: v.id('pipelineStages'),
      publishStageId: v.id('pipelineStages'),
    },
    returns: issueWorkflowResult,
  })
  .handler(async (step, args): Promise<IssueWorkflowResult> => {
    let linked
    try {
      linked = await step.runAction(
        internal.issues.build.runIssueLinker,
        {
          issueBuildId: args.issueBuildId,
          linkStageId: args.linkStageId,
        },
        { name: 'link-issue-model-v1', retry: true },
      )
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      const errorClass = detail.startsWith('model_transient:')
        ? 'model_transient_exhausted'
        : 'issue_link_step_failed'
      await step.runMutation(
        internal.issues.ledger.failIssueBuild,
        {
          issueBuildId: args.issueBuildId,
          errorClass,
          errorDetail: detail.slice(0, 500),
        },
        { name: 'fail-issue-build-v1' },
      )
      return {
        outcome: 'failed',
        errorClass,
        errorDetail: detail.slice(0, 500),
      }
    }
    if (linked.kind === 'failed') {
      await step.runMutation(
        internal.issues.ledger.failIssueBuild,
        {
          issueBuildId: args.issueBuildId,
          errorClass: linked.errorClass,
          errorDetail: linked.errorDetail,
        },
        { name: 'fail-issue-build-v1' },
      )
      return {
        outcome: 'failed',
        errorClass: linked.errorClass,
        errorDetail: linked.errorDetail,
      }
    }

    let reviewed
    try {
      reviewed = await step.runAction(
        internal.issues.review.runIssueReview,
        {
          issueBuildId: args.issueBuildId,
          reviewStageId: args.reviewStageId,
        },
        { name: 'review-issue-model-v1', retry: true },
      )
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      const errorClass = detail.startsWith('model_transient:')
        ? 'model_transient_exhausted'
        : 'issue_review_step_failed'
      await step.runMutation(
        internal.issues.ledger.failIssueBuild,
        {
          issueBuildId: args.issueBuildId,
          errorClass,
          errorDetail: detail.slice(0, 500),
        },
        { name: 'fail-issue-build-v1' },
      )
      return {
        outcome: 'failed',
        errorClass,
        errorDetail: detail.slice(0, 500),
      }
    }
    if (reviewed.kind === 'failed') {
      await step.runMutation(
        internal.issues.ledger.failIssueBuild,
        {
          issueBuildId: args.issueBuildId,
          errorClass: reviewed.errorClass,
          errorDetail: reviewed.errorDetail,
        },
        { name: 'fail-issue-build-v1' },
      )
      return {
        outcome: 'failed',
        errorClass: reviewed.errorClass,
        errorDetail: reviewed.errorDetail,
      }
    }

    await step.runMutation(
      internal.issues.ledger.rankIssueBuild,
      {
        issueBuildId: args.issueBuildId,
        rankStageId: args.rankStageId,
        reviewId: reviewed.reviewId,
      },
      { name: 'rank-issue-deterministically-v1' },
    )
    const published = await step.runMutation(
      internal.issues.ledger.publishIssueBuild,
      {
        issueBuildId: args.issueBuildId,
        publishStageId: args.publishStageId,
        reviewId: reviewed.reviewId,
      },
      { name: 'publish-issue-version-v1' },
    )
    return published.mode === 'withheld'
      ? {
          outcome: 'withheld',
          issueId: published.issueId,
          issueVersionId: published.issueVersionId,
        }
      : {
          outcome: 'published',
          issueId: published.issueId,
          issueVersionId: published.issueVersionId,
          mode: published.mode,
        }
  })

export const handleIssueBuildComplete = internalMutation({
  args: {
    workflowId: vWorkflowId,
    result: vResultValidator,
    context: v.object({ issueBuildId: v.id('issueBuilds') }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.result.kind !== 'success') await failIssueBuildTransaction(ctx, {
      issueBuildId: args.context.issueBuildId,
      errorClass:
        args.result.kind === 'canceled'
          ? 'workflow_canceled'
          : 'workflow_failed',
      errorDetail:
        args.result.kind === 'canceled' ? 'canceled' : args.result.error,
    })
    await ctx.scheduler.runAfter(0, internal.issues.proposals.settleBuild, {
      issueBuildId: args.context.issueBuildId,
      paginationOpts: { numItems: 25, cursor: null },
    })
    return null
  },
})
