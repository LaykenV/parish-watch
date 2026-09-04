import { ConvexError, v } from 'convex/values'

import { internal } from '../_generated/api'
import type { Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'
import { internalMutation, internalQuery } from '../_generated/server'
import { completeExtractionRunTransaction } from '../extraction/ledger'
import { publicationRunKey } from '../pipeline/keys'
import {
  PUBLICATION_PAYLOAD_VERSION,
  PUBLICATION_POLICY_VERSION,
  PUBLICATION_PROCESSOR_VERSION,
  REVIEW_PROMPT_VERSION,
  REVIEW_SCHEMA_VERSION,
  resolveSourceRecordIdProvenance,
} from '../pipeline/state'
import { publicationWorkflowManager } from '../pipeline/workflowManager'
import schema from '../schema'

const publicationTrigger = v.union(
  v.literal('validated_candidate'),
  v.literal('manual_publication'),
)

const startPublicationResult = v.object({
  runId: v.id('pipelineRuns'),
  reviewStageId: v.id('pipelineStages'),
  finalizeStageId: v.id('pipelineStages'),
  workflowId: v.union(v.string(), v.null()),
  reused: v.boolean(),
})

type StartPublicationResult = typeof startPublicationResult.type

export const startCandidatePublication = internalMutation({
  args: {
    candidateId: v.id('decisionCandidates'),
    trigger: publicationTrigger,
  },
  returns: startPublicationResult,
  handler: async (ctx, args): Promise<StartPublicationResult> =>
    startCandidatePublicationTransaction(ctx, args),
})

export async function startCandidatePublicationTransaction(
  ctx: MutationCtx,
  args: {
    candidateId: Id<'decisionCandidates'>
    trigger: typeof publicationTrigger.type
  },
): Promise<StartPublicationResult> {
  const candidate = await ctx.db.get(args.candidateId)
  if (!candidate || candidate.state !== 'deterministically_validated') {
    throw new ConvexError({
      code: 'candidate_not_publishable',
      message: 'Only a deterministically validated candidate can be reviewed',
    })
  }
  const upstreamRun = await ctx.db.get(candidate.runId)
  const extraction = await ctx.db.get(candidate.extractionId)
  if (
    !upstreamRun ||
    upstreamRun.state !== 'succeeded' ||
    upstreamRun.registryId !== candidate.registryId ||
    upstreamRun.snapshotId !== candidate.snapshotId ||
    upstreamRun.sourceKind !== candidate.sourceKind ||
    upstreamRun.targetRecordId !== candidate.targetRecordId ||
    resolveSourceRecordIdProvenance(upstreamRun.sourceRecordIdProvenance) !==
      resolveSourceRecordIdProvenance(candidate.sourceRecordIdProvenance) ||
    !extraction ||
    extraction.runId !== upstreamRun._id ||
    extraction.registryId !== candidate.registryId ||
    extraction.snapshotId !== candidate.snapshotId ||
    extraction.sourceKind !== candidate.sourceKind ||
    extraction.targetRecordId !== candidate.targetRecordId ||
    resolveSourceRecordIdProvenance(extraction.sourceRecordIdProvenance) !==
      resolveSourceRecordIdProvenance(candidate.sourceRecordIdProvenance) ||
    extraction.candidateId !== candidate._id ||
    extraction.state !== 'extracted'
  ) {
    throw new ConvexError({
      code: 'candidate_not_publishable',
      message: 'Candidate must belong to a successful extraction run',
    })
  }
  const idempotencyKey = await publicationRunKey({
    candidateId: candidate._id,
    processorVersion: PUBLICATION_PROCESSOR_VERSION,
    promptVersion: REVIEW_PROMPT_VERSION,
    schemaVersion: REVIEW_SCHEMA_VERSION,
    policyVersion: PUBLICATION_POLICY_VERSION,
    payloadVersion: PUBLICATION_PAYLOAD_VERSION,
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
    const reviewStage = stages.find((stage) => stage.stage === 'review')
    const finalizeStage = stages.find((stage) => stage.stage === 'finalize')
    if (reviewStage && finalizeStage) {
      return {
        runId: existing._id,
        reviewStageId: reviewStage._id,
        finalizeStageId: finalizeStage._id,
        workflowId: existing.workflowId ?? null,
        reused: true,
      }
    }
  }

  const startedAt = Date.now()
  const runId = await ctx.db.insert('pipelineRuns', {
    registryId: candidate.registryId,
    trigger: args.trigger,
    state: 'running',
    processorVersion: PUBLICATION_PROCESSOR_VERSION,
    snapshotId: candidate.snapshotId,
    sourceKind: candidate.sourceKind,
    targetRecordId: candidate.targetRecordId,
    sourceRecordIdProvenance: resolveSourceRecordIdProvenance(
      candidate.sourceRecordIdProvenance,
    ),
    candidateId: candidate._id,
    upstreamRunId: upstreamRun._id,
    monitorPolicyId: upstreamRun.monitorPolicyId,
    monitorGeneration: upstreamRun.monitorGeneration,
    monitorRegistryGeneration: upstreamRun.monitorRegistryGeneration,
    suppressNotifications: upstreamRun.suppressNotifications,
    idempotencyKey,
    startedAt,
  })
  const reviewStageId = await ctx.db.insert('pipelineStages', {
    runId,
    stage: 'review',
    idempotencyKey: `${idempotencyKey}:review`,
    state: 'queued',
    attempt: 0,
    inputSnapshotId: candidate.snapshotId,
    outputExtractionId: candidate.extractionId,
    promptVersion: REVIEW_PROMPT_VERSION,
    schemaVersion: REVIEW_SCHEMA_VERSION,
  })
  const finalizeStageId = await ctx.db.insert('pipelineStages', {
    runId,
    stage: 'finalize',
    idempotencyKey: `${idempotencyKey}:finalize`,
    state: 'queued',
    attempt: 0,
    inputSnapshotId: candidate.snapshotId,
    outputExtractionId: candidate.extractionId,
  })
  const workflowId = await publicationWorkflowManager.start(
    ctx,
    internal.publication.workflow.reviewAndPublishCandidateV1,
    { runId, candidateId: candidate._id, reviewStageId, finalizeStageId },
    {
      onComplete: internal.publication.workflow.handlePublicationComplete,
      context: { runId },
    },
  )
  await ctx.db.patch(runId, { workflowId })
  return {
    runId,
    reviewStageId,
    finalizeStageId,
    workflowId,
    reused: false,
  }
}

export const completeExtractionAndStartPublication = internalMutation({
  args: {
    runId: v.id('pipelineRuns'),
    extractionId: v.id('extractions'),
    candidateId: v.id('decisionCandidates'),
  },
  returns: startPublicationResult,
  handler: async (ctx, args): Promise<StartPublicationResult> => {
    const extraction = await ctx.db.get(args.extractionId)
    if (!extraction || extraction.candidateId !== args.candidateId) {
      throw new ConvexError({
        code: 'publication_target_mismatch',
        message: 'The completed extraction must own the publication candidate',
      })
    }
    await completeExtractionRunTransaction(ctx, {
      runId: args.runId,
      extractionId: args.extractionId,
    })
    return await startCandidatePublicationTransaction(ctx, {
      candidateId: args.candidateId,
      trigger: 'validated_candidate',
    })
  },
})

export const readPublicationEvidence = internalQuery({
  args: { runId: v.id('pipelineRuns') },
  returns: v.object({
    run: v.union(v.null(), schema.doc('pipelineRuns')),
    review: v.union(v.null(), schema.doc('reviews')),
    checks: v.array(schema.doc('reviewChecks')),
    findings: v.array(schema.doc('reviewFindings')),
    version: v.union(v.null(), schema.doc('publicationVersions')),
    record: v.union(v.null(), schema.doc('decisionRecords')),
    citations: v.array(schema.doc('citations')),
    aiCalls: v.array(schema.doc('aiCalls')),
  }),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId)
    const review = await ctx.db
      .query('reviews')
      .withIndex('by_run', (q) => q.eq('runId', args.runId))
      .unique()
    const version = await ctx.db
      .query('publicationVersions')
      .withIndex('by_run', (q) => q.eq('runId', args.runId))
      .unique()
    const checks = review
      ? await ctx.db
          .query('reviewChecks')
          .withIndex('by_review_and_field_path', (q) =>
            q.eq('reviewId', review._id),
          )
          .take(100)
      : []
    const findings = review
      ? await ctx.db
          .query('reviewFindings')
          .withIndex('by_review', (q) => q.eq('reviewId', review._id))
          .take(50)
      : []
    const record = version ? await ctx.db.get(version.recordId) : null
    const citations = version
      ? await ctx.db
          .query('citations')
          .withIndex('by_publication_and_field_path', (q) =>
            q.eq('publicationVersionId', version._id),
          )
          .take(100)
      : []
    const aiCalls = await ctx.db
      .query('aiCalls')
      .withIndex('by_run_and_created_at', (q) => q.eq('runId', args.runId))
      .take(6)
    return {
      run,
      review,
      checks,
      findings,
      version,
      record,
      citations,
      aiCalls,
    }
  },
})
