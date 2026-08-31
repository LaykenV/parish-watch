import { ConvexError, v } from 'convex/values'

import { internal } from '../_generated/api'
import type { Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'
import { internalMutation } from '../_generated/server'
import { recordMaterialChange } from '../changes/material'
import {
  PUBLICATION_PAYLOAD_VERSION,
  PUBLICATION_POLICY_VERSION,
  PUBLICATION_PROCESSOR_VERSION,
} from '../pipeline/state'
import type { IndependentReviewV1 } from '../review/contractV1'
import { reviewContextValidator } from '../review/prepare'
import { sha256HexOfText } from '../sources/hashing'
import { CORE_IDENTITY_FIELD_PATHS } from './evidenceRulesV1'
import { applyPublicationPolicyV1 } from './policyV1'

export const finalizePublication = internalMutation({
  args: {
    runId: v.id('pipelineRuns'),
    finalizeStageId: v.id('pipelineStages'),
    reviewId: v.id('reviews'),
    context: reviewContextValidator,
  },
  returns: v.object({
    publicationVersionId: v.id('publicationVersions'),
    mode: v.union(
      v.literal('full'),
      v.literal('limited'),
      v.literal('withheld'),
    ),
  }),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId)
    const stage = await ctx.db.get(args.finalizeStageId)
    const candidate = await ctx.db.get(args.context.candidateId)
    const review = await ctx.db.get(args.reviewId)
    if (
      !run ||
      !stage ||
      !candidate ||
      !review ||
      stage.runId !== run._id ||
      stage.stage !== 'finalize' ||
      run.processorVersion !== PUBLICATION_PROCESSOR_VERSION ||
      run.candidateId !== candidate._id ||
      run.upstreamRunId !== candidate.runId ||
      review.runId !== run._id ||
      review.candidateId !== candidate._id ||
      review.state !== 'succeeded' ||
      review.inputHash !== args.context.inputHash ||
      review.verdict === undefined
    ) {
      throw new ConvexError({
        code: 'publication_target_mismatch',
        message: 'Publication run, review, and candidate must agree',
      })
    }
    requireContextMatchesCandidate(candidate, args.context)

    const existingVersion = await ctx.db
      .query('publicationVersions')
      .withIndex('by_run', (q) => q.eq('runId', run._id))
      .unique()
    if (existingVersion) {
      return {
        publicationVersionId: existingVersion._id,
        mode: existingVersion.mode,
      }
    }

    const checks = await ctx.db
      .query('reviewChecks')
      .withIndex('by_review_and_field_path', (q) =>
        q.eq('reviewId', review._id),
      )
      .take(101)
    const findings = await ctx.db
      .query('reviewFindings')
      .withIndex('by_review', (q) => q.eq('reviewId', review._id))
      .take(51)
    if (
      checks.length !== args.context.facts.length ||
      checks.length > 100 ||
      findings.length > 50
    ) {
      throw new ConvexError({
        code: 'review_evidence_mismatch',
        message: 'Persisted review evidence is incomplete or over its limit',
      })
    }
    const contextFactsById = new Map(
      args.context.facts.map((fact) => [fact.factId, fact]),
    )
    if (
      contextFactsById.size !== args.context.facts.length ||
      new Set(checks.map((check) => check.candidateFactId)).size !==
        checks.length ||
      checks.some((check) => {
        const fact = contextFactsById.get(check.candidateFactId)
        return !fact || fact.fieldPath !== check.fieldPath
      })
    ) {
      throw new ConvexError({
        code: 'review_evidence_mismatch',
        message: 'Review checks no longer match the candidate facts',
      })
    }
    const reviewForPolicy: IndependentReviewV1 = {
      verdict: review.verdict,
      checks: checks.map((check) => ({
        factId: check.candidateFactId,
        fieldPath: check.fieldPath,
        assessment: check.assessment,
        detail: check.detail,
      })),
      findings: findings.map((finding) => ({
        code: finding.code,
        severity: finding.severity,
        fieldPath: finding.fieldPath ?? null,
        detail: finding.detail,
      })),
    }
    if (
      candidate.sourceRecordId === null ||
      candidate.sourceRecordId !== candidate.targetRecordId
    ) {
      throw new ConvexError({
        code: 'publication_target_mismatch',
        message: 'A publication candidate needs its exact source record ID',
      })
    }
    const sourceRecordId = candidate.sourceRecordId
    const policy = applyPublicationPolicyV1({
      sourceRecordId,
      recordType: args.context.recordType,
      review: reviewForPolicy,
    })

    // Convex tracks this indexed range read for OCC. Patching the parent below
    // also makes every later version writer contend on one document.
    let record = await ctx.db
      .query('decisionRecords')
      .withIndex('by_record_key', (q) =>
        q.eq('recordKey', args.context.recordKey),
      )
      .unique()
    const now = Date.now()
    if (record) {
      if (
        record.registryId !== candidate.registryId ||
        record.governmentBodyId !== args.context.governmentBodyId ||
        record.sourceRecordId !== sourceRecordId
      ) {
        throw new ConvexError({
          code: 'record_identity_collision',
          message: 'Stable record key belongs to another government record',
        })
      }
    } else {
      const recordId = await ctx.db.insert('decisionRecords', {
        recordKey: args.context.recordKey,
        registryId: candidate.registryId,
        governmentBodyId: args.context.governmentBodyId,
        sourceRecordId,
        createdAt: now,
        updatedAt: now,
      })
      record = await ctx.db.get(recordId)
    }
    if (!record) {
      throw new ConvexError({
        code: 'record_creation_failed',
        message: 'Decision record could not be created',
      })
    }
    const latestVersion = await ctx.db
      .query('publicationVersions')
      .withIndex('by_record_and_version', (q) => q.eq('recordId', record._id))
      .order('desc')
      .first()
    const version = (latestVersion?.version ?? 0) + 1
    const source = {
      snapshotId: candidate.snapshotId,
      sourceKind: candidate.sourceKind,
      officialUrl: args.context.officialUrl,
      retrievedAt: args.context.retrievedAt,
    }
    const payload =
      policy.mode === 'withheld'
        ? null
        : policy.mode === 'limited'
          ? {
              kind: 'limited' as const,
              sourceRecordId,
              title: candidate.title,
              bodyName: candidate.bodyName,
              source,
            }
          : {
              kind: 'full' as const,
              sourceRecordId,
              recordType: candidate.recordType,
              title: candidate.title,
              bodyName: candidate.bodyName,
              meetingAt: candidate.meetingAt,
              lifecycleState: candidate.lifecycleState,
              plainLanguageSummary: candidate.plainLanguageSummary,
              affectedPlaces: candidate.affectedPlaces,
              amounts: candidate.amounts,
              publicActions: candidate.publicActions,
              source,
            }
    const payloadHash = await sha256HexOfText(JSON.stringify(payload))
    const publicationVersionId = await ctx.db.insert('publicationVersions', {
      recordId: record._id,
      runId: run._id,
      candidateId: candidate._id,
      reviewId: review._id,
      snapshotId: candidate.snapshotId,
      version,
      mode: policy.mode,
      reasonCode: policy.reasonCode,
      policyVersion: PUBLICATION_POLICY_VERSION,
      payloadVersion: PUBLICATION_PAYLOAD_VERSION,
      payloadHash,
      payload,
      createdAt: now,
    })

    const citedFacts =
      policy.mode === 'full'
        ? args.context.facts
        : policy.mode === 'limited'
          ? args.context.facts.filter((fact) =>
              CORE_IDENTITY_FIELD_PATHS.has(fact.fieldPath),
            )
          : []

    const sourceRecordIdCheck = await ctx.db
      .query('reviewChecks')
      .withIndex('by_review_and_field_path', (q) =>
        q.eq('reviewId', review._id).eq('fieldPath', '/sourceRecordId'),
      )
      .unique()

    const numberedRecordTypes = new Set(['proposal', 'vote'])
    const shouldCiteSourceRecordId =
      !sourceRecordIdCheck ||
      sourceRecordIdCheck.assessment === 'supported' ||
      numberedRecordTypes.has(args.context.recordType)

    const factsToPublish = shouldCiteSourceRecordId
      ? citedFacts
      : citedFacts.filter((fact) => fact.fieldPath !== '/sourceRecordId')

    for (const fact of factsToPublish) {
      await ctx.db.insert('citations', {
        publicationVersionId,
        candidateFactId: fact.factId,
        fieldPath: fact.fieldPath,
        snapshotId: candidate.snapshotId,
        officialUrl: args.context.officialUrl,
        excerpt: fact.excerpt,
        page: fact.page ?? undefined,
        section: fact.section ?? undefined,
        normalizedStartOffset: fact.normalizedStartOffset,
        normalizedEndOffset: fact.normalizedEndOffset,
        retrievedAt: args.context.retrievedAt,
      })
    }
    if (
      policy.mode !== 'withheld' &&
      payload !== null &&
      record.currentPublishedVersionId
    ) {
      const previousVersion = await ctx.db.get(record.currentPublishedVersionId)
      if (!previousVersion || previousVersion.recordId !== record._id) {
        throw new ConvexError({
          code: 'publication_history_mismatch',
          message: 'Current publication pointer does not belong to this record',
        })
      }
      await recordMaterialChange(ctx, {
        recordId: record._id,
        previousVersion,
        currentPublicationVersionId: publicationVersionId,
        currentPayload: payload,
        createdAt: now,
      })
    }
    await ctx.db.patch(
      record._id,
      policy.mode === 'withheld'
        ? { updatedAt: now }
        : {
            currentPublishedVersionId: publicationVersionId,
            currentMode: policy.mode,
            updatedAt: now,
          },
    )
    if (policy.mode !== 'withheld') {
      await ctx.scheduler.runAfter(
        0,
        internal.operations.issues.refreshLinkedIssues,
        { recordId: record._id },
      )
    }
    await ctx.db.patch(stage._id, {
      state: 'succeeded',
      attempt: stage.attempt + 1,
      startedAt: stage.startedAt ?? now,
      completedAt: now,
      outputReviewId: review._id,
      outputPublicationVersionId: publicationVersionId,
    })
    await ctx.db.patch(run._id, {
      state: 'succeeded',
      completedAt: now,
    })
    return { publicationVersionId, mode: policy.mode }
  },
})

function requireContextMatchesCandidate(
  candidate: {
    _id: Id<'decisionCandidates'>
    extractionId: Id<'extractions'>
    registryId: Id<'sourceRegistries'>
    snapshotId: Id<'sourceSnapshots'>
    sourceKind: string
    targetRecordId: string
    sourceRecordId: string | null
    recordType: string
    title: string
    bodyName: string
    meetingAt: string | null
    lifecycleState: string
    plainLanguageSummary: string
    affectedPlaces: string[]
    amounts: Array<{ value: number; currency: 'USD'; context: string }>
    publicActions: Array<{
      type: string
      deadline: string | null
      instructions: string
    }>
  },
  context: typeof reviewContextValidator.type,
): void {
  const candidateValue = {
    candidateId: candidate._id,
    extractionId: candidate.extractionId,
    registryId: candidate.registryId,
    snapshotId: candidate.snapshotId,
    sourceKind: candidate.sourceKind,
    targetRecordId: candidate.targetRecordId,
    sourceRecordId: candidate.sourceRecordId,
    recordType: candidate.recordType,
    title: candidate.title,
    bodyName: candidate.bodyName,
    meetingAt: candidate.meetingAt,
    lifecycleState: candidate.lifecycleState,
    plainLanguageSummary: candidate.plainLanguageSummary,
    affectedPlaces: candidate.affectedPlaces,
    amounts: candidate.amounts,
    publicActions: candidate.publicActions,
  }
  const contextValue = {
    candidateId: context.candidateId,
    extractionId: context.extractionId,
    registryId: context.registryId,
    snapshotId: context.snapshotId,
    sourceKind: context.sourceKind,
    targetRecordId: context.targetRecordId,
    sourceRecordId: context.sourceRecordId,
    recordType: context.recordType,
    title: context.title,
    bodyName: context.bodyName,
    meetingAt: context.meetingAt,
    lifecycleState: context.lifecycleState,
    plainLanguageSummary: context.plainLanguageSummary,
    affectedPlaces: context.affectedPlaces,
    amounts: context.amounts,
    publicActions: context.publicActions,
  }
  if (JSON.stringify(candidateValue) !== JSON.stringify(contextValue)) {
    throw new ConvexError({
      code: 'candidate_changed_after_review',
      message: 'Candidate changed after the review input was prepared',
    })
  }
}

export const failPublicationRun = internalMutation({
  args: {
    runId: v.id('pipelineRuns'),
    errorClass: v.string(),
    errorDetail: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => failPublicationRunTransaction(ctx, args),
})

export async function failPublicationRunTransaction(
  ctx: MutationCtx,
  args: { runId: Id<'pipelineRuns'>; errorClass: string; errorDetail: string },
): Promise<null> {
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
  const now = Date.now()
  await ctx.db.patch(run._id, { state: 'failed_terminal', completedAt: now })
  const stages = await ctx.db
    .query('pipelineStages')
    .withIndex('by_run_and_stage', (q) => q.eq('runId', run._id))
    .take(8)
  for (const stage of stages) {
    if (
      stage.state !== 'succeeded' &&
      stage.state !== 'failed_terminal' &&
      stage.state !== 'superseded'
    ) {
      await ctx.db.patch(stage._id, {
        state: 'failed_terminal',
        completedAt: now,
        errorClass: args.errorClass,
        errorDetail: args.errorDetail.slice(0, 500),
      })
    }
  }
  return null
}
