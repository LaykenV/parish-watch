import { extensionInputs, loadTimelineMembers } from '../issues/membership'
import { assertPipelineMonitoring } from '../monitoring/ledger'
import { ConvexError, v } from 'convex/values'

import { internal } from '../_generated/api'
import type { Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'
import { internalMutation, internalQuery } from '../_generated/server'
import { issueBuildRunKey } from '../pipeline/keys'
import {
  IMPORTANCE_RUBRIC_VERSION,
  ISSUE_BUILD_PROCESSOR_VERSION,
  ISSUE_LINK_PROMPT_VERSION,
  ISSUE_LINK_SCHEMA_VERSION,
  ISSUE_PAYLOAD_VERSION,
  ISSUE_POLICY_VERSION,
  ISSUE_REVIEW_PROMPT_VERSION,
  ISSUE_REVIEW_SCHEMA_VERSION,
} from '../pipeline/state'
import { issueWorkflowManager } from '../pipeline/workflowManager'
import schema from '../schema'

const issueBuildTrigger = v.union(
  v.literal('manual_issue_build'),
  v.literal('decision_published'),
)

const startIssueBuildResult = v.object({
  runId: v.id('pipelineRuns'),
  issueBuildId: v.id('issueBuilds'),
  linkStageId: v.id('pipelineStages'),
  reviewStageId: v.id('pipelineStages'),
  rankStageId: v.id('pipelineStages'),
  publishStageId: v.id('pipelineStages'),
  workflowId: v.union(v.string(), v.null()),
  reused: v.boolean(),
})

type StartIssueBuildResult = typeof startIssueBuildResult.type

export const startIssueBuild = internalMutation({
  args: {
    recordIds: v.array(v.id('decisionRecords')),
    trigger: issueBuildTrigger,
    targetIssueId: v.optional(v.id('issues')),
    originRunId: v.optional(v.id('pipelineRuns')),
  },
  returns: startIssueBuildResult,
  handler: async (ctx, args): Promise<StartIssueBuildResult> =>
    startIssueBuildTransaction(ctx, args),
})

export async function startIssueBuildTransaction(
  ctx: MutationCtx,
  args: {
    recordIds: Id<'decisionRecords'>[]
    trigger: typeof issueBuildTrigger.type
    targetIssueId?: Id<'issues'>
    originRunId?: Id<'pipelineRuns'>
  },
): Promise<StartIssueBuildResult> {
  if (
    args.recordIds.length < 2 ||
    args.recordIds.length > 10 ||
    new Set(args.recordIds).size !== args.recordIds.length
  ) {
    throw new ConvexError({
      code: 'issue_input_bounds',
      message: 'An issue build needs 2 to 10 unique decision records',
    })
  }
  const targetIssue = args.targetIssueId ? await ctx.db.get(args.targetIssueId) : null
  if (args.targetIssueId && !targetIssue?.currentVersionId) throw new Error('issue_not_published')
  const originRun = args.originRunId ? await ctx.db.get(args.originRunId) : null
  if (args.originRunId) await assertPipelineMonitoring(ctx, args.originRunId)
  const records = []
  for (const recordId of args.recordIds) {
    const record = await ctx.db.get(recordId)
    const version = record?.currentPublishedVersionId
      ? await ctx.db.get(record.currentPublishedVersionId)
      : null
    if (
      !record ||
      !version ||
      version.recordId !== record._id ||
      version.mode === 'withheld' ||
      version.payload === null
    ) {
      throw new ConvexError({
        code: 'issue_input_not_published',
        message: 'Every issue input must have a current accepted publication',
      })
    }
    records.push({ record, version })
  }
  const governmentBodyId = records[0].record.governmentBodyId
  if (
    records.some((item) => item.record.governmentBodyId !== governmentBodyId)
  ) {
    throw new ConvexError({
      code: 'issue_cross_body_not_supported',
      message: 'Issue linker v1 only links decisions from one government body',
    })
  }
  if (targetIssue && targetIssue.governmentBodyId !== governmentBodyId) throw new Error('issue_cross_body_not_supported')
  records.sort((left, right) => left.record._id.localeCompare(right.record._id))
  const keyed = await issueBuildRunKey({
    publicationVersionIds: records.map((item) => item.version._id),
    recordKeys: records.map((item) => item.record.recordKey),
    processorVersion: ISSUE_BUILD_PROCESSOR_VERSION,
    linkPromptVersion: ISSUE_LINK_PROMPT_VERSION,
    linkSchemaVersion: ISSUE_LINK_SCHEMA_VERSION,
    reviewPromptVersion: ISSUE_REVIEW_PROMPT_VERSION,
    reviewSchemaVersion: ISSUE_REVIEW_SCHEMA_VERSION,
    policyVersion: ISSUE_POLICY_VERSION,
    payloadVersion: ISSUE_PAYLOAD_VERSION,
    rubricVersion: IMPORTANCE_RUBRIC_VERSION,
  })
  if (targetIssue) {
    keyed.issueKey = targetIssue.issueKey
    keyed.idempotencyKey = `${keyed.idempotencyKey}:${targetIssue._id}:${targetIssue.currentVersionId}`
  }
  const existing = await ctx.db
    .query('issueBuilds')
    .withIndex('by_idempotency_key', (q) =>
      q.eq('idempotencyKey', keyed.idempotencyKey),
    )
    .order('desc')
    .first()
  const existingRun = existing ? await ctx.db.get(existing.runId) : null
  if (
    existing &&
    existingRun &&
    (existingRun.state === 'succeeded' ||
      existingRun.state === 'running' ||
      existingRun.state === 'queued')
  ) {
    const stages = await ctx.db
      .query('pipelineStages')
      .withIndex('by_run_and_stage', (q) => q.eq('runId', existing.runId))
      .take(10)
    const linkStage = stages.find((stage) => stage.stage === 'link')
    const reviewStage = stages.find((stage) => stage.stage === 'review')
    const rankStage = stages.find((stage) => stage.stage === 'rank')
    const publishStage = stages.find((stage) => stage.stage === 'publish')
    if (!linkStage || !reviewStage || !rankStage || !publishStage) {
      throw new ConvexError({
        code: 'issue_idempotency_collision',
        message:
          'Existing issue build is missing its durable workflow evidence',
      })
    }
    return {
      runId: existingRun._id,
      issueBuildId: existing._id,
      linkStageId: linkStage._id,
      reviewStageId: reviewStage._id,
      rankStageId: rankStage._id,
      publishStageId: publishStage._id,
      workflowId: existingRun.workflowId ?? null,
      reused: true,
    }
  }

  const now = Date.now()
  const primary = records[0].record
  const runId = await ctx.db.insert('pipelineRuns', {
    registryId: primary.registryId,
    trigger: args.trigger,
    monitorPolicyId: originRun?.monitorPolicyId,
    monitorGeneration: originRun?.monitorGeneration,
    monitorRegistryGeneration: originRun?.monitorRegistryGeneration,
    suppressNotifications: originRun?.suppressNotifications,
    state: 'running',
    processorVersion: ISSUE_BUILD_PROCESSOR_VERSION,
    idempotencyKey: keyed.idempotencyKey,
    startedAt: now,
  })
  const issueBuildId = await ctx.db.insert('issueBuilds', {
    runId,
    registryId: primary.registryId,
    governmentBodyId,
    issueKey: keyed.issueKey,
    targetIssueId: targetIssue?._id,
    expectedIssueVersionId: targetIssue?.currentVersionId,
    idempotencyKey: keyed.idempotencyKey,
    inputHash: keyed.inputHash,
    recordIds: records.map((item) => item.record._id),
    publicationVersionIds: records.map((item) => item.version._id),
    state: 'queued',
    promptVersion: ISSUE_LINK_PROMPT_VERSION,
    schemaVersion: ISSUE_LINK_SCHEMA_VERSION,
    processorVersion: ISSUE_BUILD_PROCESSOR_VERSION,
    modelRole: 'MODEL_STRONG',
    createdAt: now,
    updatedAt: now,
  })
  await ctx.db.patch(runId, { issueBuildId })
  const linkStageId = await ctx.db.insert('pipelineStages', {
    runId,
    stage: 'link',
    idempotencyKey: `${keyed.idempotencyKey}:link`,
    state: 'queued',
    attempt: 0,
    promptVersion: ISSUE_LINK_PROMPT_VERSION,
    schemaVersion: ISSUE_LINK_SCHEMA_VERSION,
  })
  const reviewStageId = await ctx.db.insert('pipelineStages', {
    runId,
    stage: 'review',
    idempotencyKey: `${keyed.idempotencyKey}:review`,
    state: 'queued',
    attempt: 0,
    promptVersion: ISSUE_REVIEW_PROMPT_VERSION,
    schemaVersion: ISSUE_REVIEW_SCHEMA_VERSION,
  })
  const rankStageId = await ctx.db.insert('pipelineStages', {
    runId,
    stage: 'rank',
    idempotencyKey: `${keyed.idempotencyKey}:rank`,
    state: 'queued',
    attempt: 0,
  })
  const publishStageId = await ctx.db.insert('pipelineStages', {
    runId,
    stage: 'publish',
    idempotencyKey: `${keyed.idempotencyKey}:publish`,
    state: 'queued',
    attempt: 0,
  })
  const workflowId = await issueWorkflowManager.start(
    ctx,
    internal.issues.workflow.buildIssueV1,
    {
      issueBuildId,
      linkStageId,
      reviewStageId,
      rankStageId,
      publishStageId,
    },
    {
      onComplete: internal.issues.workflow.handleIssueBuildComplete,
      context: { issueBuildId },
    },
  )
  await ctx.db.patch(runId, { workflowId })
  return {
    runId,
    issueBuildId,
    linkStageId,
    reviewStageId,
    rankStageId,
    publishStageId,
    workflowId,
    reused: false,
  }
}

export const refreshLinkedIssues = internalMutation({
  args: { recordId: v.id('decisionRecords'), originRunId: v.optional(v.id('pipelineRuns')) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query('issueDecisionLinks')
      .withIndex('by_record_and_created_at', (q) =>
        q.eq('recordId', args.recordId),
      )
      .order('desc')
      .take(50)
    const refreshed = new Set<string>()
    for (const link of links) {
      if (refreshed.size >= 10 || refreshed.has(link.issueId)) continue
      const issue = await ctx.db.get(link.issueId)
      if (!issue || issue.currentVersionId !== link.issueVersionId) continue
      const accepted = await loadTimelineMembers(ctx, issue.currentVersionId)
      let changed = false
      for (const member of accepted) {
        const record = await ctx.db.get(member.recordId)
        if (record?.currentPublishedVersionId !== member.publicationVersionId) changed = true
      }
      if (!changed) continue
      const recordIds = await extensionInputs(ctx, issue._id, args.recordId)
      refreshed.add(issue._id)
      await startIssueBuildTransaction(ctx, { recordIds, targetIssueId: issue._id, trigger: 'decision_published', originRunId: args.originRunId })
    }
    return null
  },
})

export const readIssueBuildEvidence = internalQuery({
  args: { runId: v.id('pipelineRuns') },
  returns: v.object({
    run: v.union(v.null(), schema.doc('pipelineRuns')),
    stages: v.array(schema.doc('pipelineStages')),
    build: v.union(v.null(), schema.doc('issueBuilds')),
    review: v.union(v.null(), schema.doc('issueBuildReviews')),
    checks: v.array(schema.doc('issueBuildReviewChecks')),
    issue: v.union(v.null(), schema.doc('issues')),
    issueVersion: v.union(v.null(), schema.doc('issueVersions')),
    links: v.array(schema.doc('issueDecisionLinks')),
    assessments: v.array(schema.doc('importanceAssessments')),
    aiCalls: v.array(schema.doc('aiCalls')),
  }),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId)
    const stages = await ctx.db
      .query('pipelineStages')
      .withIndex('by_run_and_stage', (q) => q.eq('runId', args.runId))
      .take(10)
    const build = await ctx.db
      .query('issueBuilds')
      .withIndex('by_run', (q) => q.eq('runId', args.runId))
      .unique()
    const review = build?.reviewId ? await ctx.db.get(build.reviewId) : null
    const checks = review
      ? await ctx.db
          .query('issueBuildReviewChecks')
          .withIndex('by_review_and_field_path', (q) =>
            q.eq('reviewId', review._id),
          )
          .take(100)
      : []
    const issueVersion = build?.issueVersionId
      ? await ctx.db.get(build.issueVersionId)
      : null
    const issue = issueVersion ? await ctx.db.get(issueVersion.issueId) : null
    const links = issueVersion
      ? await ctx.db
          .query('issueDecisionLinks')
          .withIndex('by_issue_version', (q) =>
            q.eq('issueVersionId', issueVersion._id),
          )
          .take(10)
      : []
    const assessments = issueVersion
      ? await ctx.db
          .query('importanceAssessments')
          .withIndex('by_issue_version_and_factor', (q) =>
            q.eq('issueVersionId', issueVersion._id),
          )
          .take(7)
      : []
    const aiCalls = await ctx.db
      .query('aiCalls')
      .withIndex('by_run_and_created_at', (q) => q.eq('runId', args.runId))
      .take(12)
    return {
      run,
      stages,
      build,
      review,
      checks,
      issue,
      issueVersion,
      links,
      assessments,
      aiCalls,
    }
  },
})

const decisionTimeline = v.object({
  record: schema.doc('decisionRecords'),
  versions: v.array(schema.doc('publicationVersions')),
  changes: v.array(schema.doc('materialChanges')),
  citations: v.array(schema.doc('citations')),
  sourceChanges: v.array(schema.doc('sourceSnapshotChanges')),
})

export const readIssueEvidence = internalQuery({
  args: { issueId: v.id('issues') },
  returns: v.object({
    issue: v.union(v.null(), schema.doc('issues')),
    currentVersion: v.union(v.null(), schema.doc('issueVersions')),
    build: v.union(v.null(), schema.doc('issueBuilds')),
    review: v.union(v.null(), schema.doc('issueBuildReviews')),
    reviewChecks: v.array(schema.doc('issueBuildReviewChecks')),
    versions: v.array(schema.doc('issueVersions')),
    links: v.array(schema.doc('issueDecisionLinks')),
    assessments: v.array(schema.doc('importanceAssessments')),
    decisions: v.array(decisionTimeline),
  }),
  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId)
    const versions = await ctx.db
      .query('issueVersions')
      .withIndex('by_issue_and_version', (q) => q.eq('issueId', args.issueId))
      .order('desc')
      .take(20)
    const currentVersion = issue?.currentVersionId
      ? await ctx.db.get(issue.currentVersionId)
      : null
    const build = currentVersion
      ? await ctx.db.get(currentVersion.buildId)
      : null
    const review = build?.reviewId ? await ctx.db.get(build.reviewId) : null
    const reviewChecks = review
      ? await ctx.db
          .query('issueBuildReviewChecks')
          .withIndex('by_review_and_field_path', (q) =>
            q.eq('reviewId', review._id),
          )
          .take(100)
      : []
    const links = currentVersion
      ? await ctx.db
          .query('issueDecisionLinks')
          .withIndex('by_issue_version', (q) =>
            q.eq('issueVersionId', currentVersion._id),
          )
          .take(10)
      : []
    const assessments = currentVersion
      ? await ctx.db
          .query('importanceAssessments')
          .withIndex('by_issue_version_and_factor', (q) =>
            q.eq('issueVersionId', currentVersion._id),
          )
          .take(7)
      : []
    const decisions = []
    for (const link of links) {
      const record = await ctx.db.get(link.recordId)
      if (!record) continue
      const publicationVersions = await ctx.db
        .query('publicationVersions')
        .withIndex('by_record_and_version', (q) => q.eq('recordId', record._id))
        .order('desc')
        .take(10)
      const changes = await ctx.db
        .query('materialChanges')
        .withIndex('by_record_and_created_at', (q) =>
          q.eq('recordId', record._id),
        )
        .order('desc')
        .take(20)
      const citations = []
      const sourceChanges = []
      for (const publicationVersion of publicationVersions) {
        const remainingCitationSlots: number = 200 - citations.length
        if (remainingCitationSlots > 0) {
          citations.push(
            ...(await ctx.db
              .query('citations')
              .withIndex('by_publication_and_field_path', (q) =>
                q.eq('publicationVersionId', publicationVersion._id),
              )
              .take(Math.min(100, remainingCitationSlots))),
          )
        }
        const sourceChange = await ctx.db
          .query('sourceSnapshotChanges')
          .withIndex('by_current_snapshot', (q) =>
            q.eq('currentSnapshotId', publicationVersion.snapshotId),
          )
          .unique()
        if (sourceChange) sourceChanges.push(sourceChange)
      }
      decisions.push({
        record,
        versions: publicationVersions,
        changes,
        citations,
        sourceChanges,
      })
    }
    return {
      issue,
      currentVersion,
      build,
      review,
      reviewChecks,
      versions,
      links,
      assessments,
      decisions,
    }
  },
})
