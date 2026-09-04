import { v } from 'convex/values'

import { internal } from '../_generated/api'
import type { Id } from '../_generated/dataModel'
import {
  env,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
} from '../_generated/server'
import type { ActionCtx, MutationCtx } from '../_generated/server'
import { requireOwner } from '../auth/authorization'
import { sha256HexOfText } from '../sources/hashing'
import { classifyHost } from './rootGate'
import { SAMPLE_VALIDATION_RESERVATION_USD } from './contracts'
import { walkRedirects } from './redirectWalk'
import { resolveRootManifest } from './roots'

const VALIDATION_STAGE_VERSION = 'representative-sample-v1'

export const startValidation = mutation({
  args: { proposalId: v.id('coverageRegistryProposals') },
  returns: v.object({ started: v.boolean() }),
  handler: async (ctx, args) => {
    await requireOwner(ctx)
    const proposal = await ctx.db.get(args.proposalId)
    if (!proposal || !['draft', 'blocked'].includes(proposal.status)) {
      return { started: false }
    }
    const run = await ctx.db.get(proposal.runId)
    if (
      !run ||
      !['succeeded', 'failed_retryable', 'failed_terminal'].includes(run.state)
    ) {
      return { started: false }
    }
    const runningStage = await ctx.db
      .query('coverageCompilerStages')
      .withIndex('by_run_and_stage', (index) =>
        index.eq('runId', proposal.runId).eq('stage', 'validate_sample'),
      )
      .order('desc')
      .first()
    if (runningStage?.state === 'running') return { started: false }
    const reserved = run.reservedCostUsd ?? 0
    const reservation = runningStage ? 0 : SAMPLE_VALIDATION_RESERVATION_USD
    const budget = run.budgetUsd ?? 1
    if (reserved + reservation > budget) {
      throw new Error(
        'The run budget cannot reserve representative validation.',
      )
    }
    const attempt = (runningStage?.attempt ?? 0) + 1
    const stageId = await openStage(
      ctx,
      proposal.runId,
      'validate_sample',
      attempt,
    )
    await ctx.db.patch(proposal._id, { status: 'validating' })
    await ctx.db.patch(proposal.runId, {
      state: 'running',
      currentStage: 'validate_sample',
      completedAt: undefined,
      reservedCostUsd: reserved + reservation,
    })
    await ctx.scheduler.runAfter(
      0,
      internal.coverage.validation.validateSample,
      {
        proposalId: proposal._id,
        stageId,
      },
    )
    return { started: true }
  },
})

export const reevaluate = mutation({
  args: { proposalId: v.id('coverageRegistryProposals') },
  returns: v.object({ started: v.boolean() }),
  handler: async (ctx, args) => {
    await requireOwner(ctx)
    const proposal = await ctx.db.get(args.proposalId)
    if (
      !proposal ||
      !['blocked', 'ready', 'promoted'].includes(proposal.status)
    ) {
      return { started: false }
    }
    const run = await ctx.db.get(proposal.runId)
    if (
      !run ||
      !['succeeded', 'failed_retryable', 'failed_terminal'].includes(run.state)
    ) {
      return { started: false }
    }
    const latestStage = await ctx.db
      .query('coverageCompilerStages')
      .withIndex('by_run_and_stage', (index) =>
        index.eq('runId', proposal.runId).eq('stage', 'evaluate_gates'),
      )
      .order('desc')
      .first()
    if (latestStage?.state === 'running') return { started: false }
    const stageId = await openStage(
      ctx,
      proposal.runId,
      'evaluate_gates',
      (latestStage?.attempt ?? 0) + 1,
    )
    await ctx.db.patch(proposal.runId, {
      state: 'running',
      currentStage: 'evaluate_gates',
      completedAt: undefined,
    })
    await ctx.scheduler.runAfter(
      0,
      internal.coverage.evaluator.evaluateProposal,
      {
        proposalId: proposal._id,
        stageId,
      },
    )
    return { started: true }
  },
})

async function openStage(
  ctx: MutationCtx,
  runId: Id<'coverageCompilerRuns'>,
  stage: 'validate_sample' | 'evaluate_gates',
  attempt: number,
): Promise<Id<'coverageCompilerStages'>> {
  const inputHash = await sha256HexOfText(
    [runId, stage, VALIDATION_STAGE_VERSION, String(attempt)].join('\n'),
  )
  return await ctx.db.insert('coverageCompilerStages', {
    runId,
    stage,
    idempotencyKey: `coverage:${stage}:${inputHash}`,
    inputHash,
    attempt,
    state: 'running',
    gateVersion: VALIDATION_STAGE_VERSION,
    startedAt: Date.now(),
  })
}

export const validationContext = internalQuery({
  args: {
    proposalId: v.id('coverageRegistryProposals'),
    stageId: v.id('coverageCompilerStages'),
  },
  returns: v.union(
    v.null(),
    v.object({
      runId: v.id('coverageCompilerRuns'),
      registryId: v.id('sourceRegistries'),
      bodyKey: v.string(),
      rootManifestVersion: v.string(),
      samples: v.array(
        v.object({
          sampleId: v.id('coverageRepresentativeSamples'),
          canonicalUrl: v.string(),
          state: v.union(
            v.literal('pending'),
            v.literal('retrieved'),
            v.literal('failed_retryable'),
            v.literal('failed_terminal'),
          ),
        }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const proposal = await ctx.db.get(args.proposalId)
    const stage = await ctx.db.get(args.stageId)
    const run = proposal ? await ctx.db.get(proposal.runId) : null
    if (
      !proposal ||
      !stage ||
      !run ||
      stage.runId !== proposal.runId ||
      run.state !== 'running' ||
      run.currentStage !== 'validate_sample' ||
      proposal.status !== 'validating' ||
      stage.stage !== 'validate_sample' ||
      stage.state !== 'running'
    )
      return null
    const samples = await ctx.db
      .query('coverageRepresentativeSamples')
      .withIndex('by_proposal_and_role', (index) =>
        index.eq('proposalId', proposal._id),
      )
      .take(12)
    const withCandidates = await Promise.all(
      samples.map(async (sample) => ({
        sample,
        candidate: sample.candidateId
          ? await ctx.db.get(sample.candidateId)
          : null,
      })),
    )
    return {
      runId: proposal.runId,
      registryId: proposal.registryId,
      bodyKey: proposal.bodyKey,
      rootManifestVersion: proposal.rootManifestVersion,
      samples: withCandidates
        .filter((entry) => entry.candidate !== null)
        .map((entry) => ({
          sampleId: entry.sample._id,
          canonicalUrl: entry.candidate!.canonicalUrl,
          state: entry.sample.state,
        })),
    }
  },
})

export const validateSample = internalAction({
  args: {
    proposalId: v.id('coverageRegistryProposals'),
    stageId: v.id('coverageCompilerStages'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      const context = await ctx.runQuery(
        internal.coverage.validation.validationContext,
        args,
      )
      if (!context) {
        await ctx.runMutation(
          internal.coverage.validation.abandonValidation,
          args,
        )
        return null
      }
      const manifest = resolveRootManifest(
        context.bodyKey,
        context.rootManifestVersion,
      )
      if (!manifest) {
        await finishValidation(
          ctx,
          args,
          false,
          'The checked root manifest disappeared.',
        )
        return null
      }

      for (let index = 0; index < context.samples.length; index += 2) {
        if (
          index > 0 &&
          (await ctx.runQuery(
            internal.coverage.validation.validationContext,
            args,
          )) === null
        ) {
          await ctx.runMutation(
            internal.coverage.validation.abandonValidation,
            args,
          )
          return null
        }
        await Promise.all(
          context.samples.slice(index, index + 2).map(async (sample) => {
            if (sample.state === 'retrieved') return
            if (classifyHost(manifest, sample.canonicalUrl) !== 'approved') {
              await recordSample(ctx, sample.sampleId, {
                outcome: 'failed_terminal',
                errorClass: 'document_host_quarantined',
              })
              return
            }
            try {
              const outcome = await ctx.runAction(
                internal.operations.ingest.ingestRegistrySource,
                {
                  registryId: context.registryId,
                  urlOverride: sample.canonicalUrl,
                },
              )
              await recordSample(
                ctx,
                sample.sampleId,
                outcome.outcome === 'created' || outcome.outcome === 'reused'
                  ? { outcome: 'retrieved', snapshotId: outcome.snapshotId }
                  : {
                      outcome: outcome.retryable
                        ? 'failed_retryable'
                        : 'failed_terminal',
                      errorClass: outcome.errorClass,
                    },
              )
              await checkLink(
                ctx,
                args.proposalId,
                sample.canonicalUrl,
                manifest,
              )
            } catch (error) {
              await recordSample(ctx, sample.sampleId, {
                outcome: 'failed_retryable',
                errorClass:
                  error instanceof Error && error.name
                    ? `unexpected:${error.name}`
                    : 'unexpected:sample_validation',
              })
            }
          }),
        )
      }
      await finishValidation(ctx, args, true)
      return null
    } catch (error) {
      await finishValidation(
        ctx,
        args,
        false,
        error instanceof Error
          ? `Representative validation stopped: ${error.name}`
          : 'Representative validation stopped unexpectedly.',
      )
      return null
    }
  },
})

export const recordSampleResult = internalMutation({
  args: {
    sampleId: v.id('coverageRepresentativeSamples'),
    outcome: v.union(
      v.literal('retrieved'),
      v.literal('failed_retryable'),
      v.literal('failed_terminal'),
    ),
    snapshotId: v.optional(v.id('sourceSnapshots')),
    errorClass: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const sample = await ctx.db.get(args.sampleId)
    if (!sample) return null
    await ctx.db.patch(sample._id, {
      state: args.outcome,
      ...(args.snapshotId ? { snapshotId: args.snapshotId } : {}),
      ...(args.errorClass ? { errorClass: args.errorClass.slice(0, 120) } : {}),
      completedAt: Date.now(),
    })
    return null
  },
})

export const abandonValidation = internalMutation({
  args: {
    proposalId: v.id('coverageRegistryProposals'),
    stageId: v.id('coverageCompilerStages'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const proposal = await ctx.db.get(args.proposalId)
    const stage = await ctx.db.get(args.stageId)
    const run = proposal ? await ctx.db.get(proposal.runId) : null
    if (
      proposal &&
      stage &&
      run &&
      stage.state === 'running' &&
      (run.state === 'canceled' || run.state === 'superseded')
    ) {
      await ctx.db.patch(stage._id, {
        state: 'canceled',
        completedAt: Date.now(),
      })
      await ctx.db.patch(proposal._id, { status: 'blocked' })
    }
    return null
  },
})

export const recordLinkCheck = internalMutation({
  args: {
    proposalId: v.id('coverageRegistryProposals'),
    canonicalUrl: v.string(),
    deployment: v.union(v.literal('development'), v.literal('production')),
    status: v.number(),
    passed: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert('coverageDirectLinkChecks', {
      ...args,
      checkedAt: Date.now(),
    })
    return null
  },
})

export const finishSampleValidation = internalMutation({
  args: {
    proposalId: v.id('coverageRegistryProposals'),
    stageId: v.id('coverageCompilerStages'),
    completed: v.boolean(),
    errorDetail: v.optional(v.string()),
  },
  returns: v.union(v.id('coverageCompilerStages'), v.null()),
  handler: async (ctx, args) => {
    const proposal = await ctx.db.get(args.proposalId)
    const stage = await ctx.db.get(args.stageId)
    const run = proposal ? await ctx.db.get(proposal.runId) : null
    if (!proposal || !stage || !run || stage.state !== 'running') return null
    if (run.state === 'canceled' || run.state === 'superseded') {
      await ctx.db.patch(stage._id, {
        state: 'canceled',
        completedAt: Date.now(),
      })
      await ctx.db.patch(proposal._id, { status: 'blocked' })
      return null
    }
    const now = Date.now()
    if (!args.completed) {
      await ctx.db.patch(stage._id, {
        state: 'failed_terminal',
        errorClass: 'coverage:proposal_invalid',
        errorDetail: args.errorDetail?.slice(0, 200),
        completedAt: now,
      })
      await ctx.db.patch(proposal._id, { status: 'blocked', evaluatedAt: now })
      await ctx.db.patch(proposal.runId, {
        state: 'failed_terminal',
        completedAt: now,
      })
      return null
    }
    await ctx.db.patch(stage._id, { state: 'succeeded', completedAt: now })
    const priorGateStage = await ctx.db
      .query('coverageCompilerStages')
      .withIndex('by_run_and_stage', (index) =>
        index.eq('runId', proposal.runId).eq('stage', 'evaluate_gates'),
      )
      .order('desc')
      .first()
    const gateStageId = await openStage(
      ctx,
      proposal.runId,
      'evaluate_gates',
      (priorGateStage?.attempt ?? 0) + 1,
    )
    await ctx.db.patch(proposal.runId, { currentStage: 'evaluate_gates' })
    await ctx.scheduler.runAfter(
      0,
      internal.coverage.evaluator.evaluateProposal,
      { proposalId: proposal._id, stageId: gateStageId },
    )
    return gateStageId
  },
})

async function recordSample(
  ctx: ActionCtx,
  sampleId: Id<'coverageRepresentativeSamples'>,
  result:
    | { outcome: 'retrieved'; snapshotId: Id<'sourceSnapshots'> }
    | {
        outcome: 'failed_retryable' | 'failed_terminal'
        errorClass: string
      },
): Promise<void> {
  await ctx.runMutation(internal.coverage.validation.recordSampleResult, {
    sampleId,
    ...result,
  })
}

async function checkLink(
  ctx: ActionCtx,
  proposalId: Id<'coverageRegistryProposals'>,
  canonicalUrl: string,
  manifest: NonNullable<ReturnType<typeof resolveRootManifest>>,
): Promise<void> {
  const walk = await walkRedirects(
    canonicalUrl,
    (url) => classifyHost(manifest, url) === 'approved',
    5,
  )
  const final = walk.hops[walk.hops.length - 1]
  const passed =
    walk.stopReason === 'final_response' &&
    final !== undefined &&
    final.status >= 200 &&
    final.status < 300
  await ctx.runMutation(internal.coverage.validation.recordLinkCheck, {
    proposalId,
    canonicalUrl,
    deployment:
      env.CONVEX_SITE_URL === 'https://www.publicparish.com'
        ? 'production'
        : 'development',
    status: final?.status ?? 0,
    passed,
  })
}

async function finishValidation(
  ctx: ActionCtx,
  ids: {
    proposalId: Id<'coverageRegistryProposals'>
    stageId: Id<'coverageCompilerStages'>
  },
  completed: boolean,
  errorDetail?: string,
): Promise<void> {
  await ctx.runMutation(internal.coverage.validation.finishSampleValidation, {
    ...ids,
    completed,
    ...(errorDetail ? { errorDetail } : {}),
  })
}
