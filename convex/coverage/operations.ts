import { ConvexError, v } from 'convex/values'

import { internal } from '../_generated/api'
import { mutation, query } from '../_generated/server'
import { requireOwner } from '../auth/authorization'
import {
  coverageFindingCodes,
  coverageFindingSeverities,
  coverageCadences,
  coverageCandidateStates,
  coverageHostDispositions,
  coverageProviderNames,
  coverageRedirectHop,
  coverageRunStates,
  coverageStageNames,
  coverageStageStates,
  coverageSourceKinds,
} from './contracts'
import { cancelCoverageRun, retryCoverageRun, startCoverageRun } from './ledger'
import { beginDiscovery } from './discoveryLedger'
import { listRootManifests, resolveRootManifest } from './roots'

const MAX_LISTED_RUNS = 20
const MAX_LISTED_STAGES = 25
const MAX_LISTED_FINDINGS = 50

const rootView = v.object({
  bodyKey: v.string(),
  version: v.string(),
  bodyName: v.string(),
  jurisdictionName: v.string(),
  approvedRootUrl: v.string(),
  checkedAt: v.string(),
})

const runSummary = v.object({
  runId: v.id('coverageCompilerRuns'),
  bodyKey: v.string(),
  jurisdictionSlug: v.string(),
  rootManifestVersion: v.string(),
  compilerVersion: v.string(),
  attempt: v.number(),
  state: coverageRunStates,
  currentStage: v.union(coverageStageNames, v.null()),
  startedAt: v.number(),
  completedAt: v.union(v.number(), v.null()),
})

const stageView = v.object({
  stageId: v.id('coverageCompilerStages'),
  stage: coverageStageNames,
  attempt: v.number(),
  state: coverageStageStates,
  gateVersion: v.string(),
  requestedRootUrl: v.union(v.string(), v.null()),
  resolvedRootUrl: v.union(v.string(), v.null()),
  redirectChain: v.array(coverageRedirectHop),
  errorClass: v.union(v.string(), v.null()),
  errorDetail: v.union(v.string(), v.null()),
  startedAt: v.number(),
  completedAt: v.union(v.number(), v.null()),
})

const findingView = v.object({
  findingId: v.id('coverageCompilerFindings'),
  code: coverageFindingCodes,
  severity: coverageFindingSeverities,
  summary: v.string(),
  subjectUrl: v.union(v.string(), v.null()),
  createdAt: v.number(),
})

const candidateView = v.object({
  candidateId: v.id('coverageSourceCandidates'),
  canonicalUrl: v.string(),
  title: v.union(v.string(), v.null()),
  hostDisposition: coverageHostDispositions,
  state: coverageCandidateStates,
  sourceKind: v.union(coverageSourceKinds, v.null()),
  cadence: v.union(coverageCadences, v.null()),
  confidence: v.union(v.number(), v.null()),
})

const providerCallView = v.object({
  providerCallId: v.id('coverageCompilerProviderCalls'),
  provider: coverageProviderNames,
  operation: v.string(),
  status: v.string(),
  modelId: v.union(v.string(), v.null()),
  latencyMs: v.number(),
  creditsUsed: v.union(v.number(), v.null()),
  creditsReported: v.boolean(),
  totalTokens: v.union(v.number(), v.null()),
  estimatedCostUsd: v.union(v.number(), v.null()),
  createdAt: v.number(),
})

export const availableRoots = query({
  args: {},
  returns: v.array(rootView),
  handler: async (ctx) => {
    await requireOwner(ctx)
    return listRootManifests().map((manifest) => ({
      bodyKey: manifest.bodyKey,
      version: manifest.version,
      bodyName: manifest.bodyName,
      jurisdictionName: manifest.jurisdictionName,
      approvedRootUrl: manifest.approvedRootUrl,
      checkedAt: manifest.checkedAt,
    }))
  },
})

export const recentRuns = query({
  args: {},
  returns: v.array(runSummary),
  handler: async (ctx) => {
    await requireOwner(ctx)
    const runs = await ctx.db
      .query('coverageCompilerRuns')
      .order('desc')
      .take(MAX_LISTED_RUNS)
    return runs.map((run) => ({
      runId: run._id,
      bodyKey: run.bodyKey,
      jurisdictionSlug: run.jurisdictionSlug,
      rootManifestVersion: run.rootManifestVersion,
      compilerVersion: run.compilerVersion,
      attempt: run.attempt,
      state: run.state,
      currentStage: run.currentStage ?? null,
      startedAt: run.startedAt,
      completedAt: run.completedAt ?? null,
    }))
  },
})

export const run = query({
  args: { runId: v.id('coverageCompilerRuns') },
  returns: v.union(
    v.null(),
    v.object({
      run: runSummary,
      stages: v.array(stageView),
      findings: v.array(findingView),
      candidates: v.array(candidateView),
      providerCalls: v.array(providerCallView),
    }),
  ),
  handler: async (ctx, args) => {
    await requireOwner(ctx)
    const record = await ctx.db.get(args.runId)
    if (!record) return null

    const stages = (
      await ctx.db
        .query('coverageCompilerStages')
        .withIndex('by_run_and_stage', (index) => index.eq('runId', args.runId))
        .take(MAX_LISTED_STAGES)
    ).sort((left, right) => left._creationTime - right._creationTime)
    const findings = await ctx.db
      .query('coverageCompilerFindings')
      .withIndex('by_run_and_created_at', (index) =>
        index.eq('runId', args.runId),
      )
      .take(MAX_LISTED_FINDINGS)
    const candidates = await ctx.db
      .query('coverageSourceCandidates')
      .withIndex('by_run_and_url', (index) => index.eq('runId', args.runId))
      .take(100)
    const providerCalls = await ctx.db
      .query('coverageCompilerProviderCalls')
      .withIndex('by_run_and_created_at', (index) =>
        index.eq('runId', args.runId),
      )
      .take(100)

    return {
      run: {
        runId: record._id,
        bodyKey: record.bodyKey,
        jurisdictionSlug: record.jurisdictionSlug,
        rootManifestVersion: record.rootManifestVersion,
        compilerVersion: record.compilerVersion,
        attempt: record.attempt,
        state: record.state,
        currentStage: record.currentStage ?? null,
        startedAt: record.startedAt,
        completedAt: record.completedAt ?? null,
      },
      stages: stages.map((stage) => ({
        stageId: stage._id,
        stage: stage.stage,
        attempt: stage.attempt,
        state: stage.state,
        gateVersion: stage.gateVersion,
        requestedRootUrl: stage.requestedRootUrl ?? null,
        resolvedRootUrl: stage.resolvedRootUrl ?? null,
        redirectChain: stage.redirectChain ?? [],
        errorClass: stage.errorClass ?? null,
        errorDetail: stage.errorDetail ?? null,
        startedAt: stage.startedAt,
        completedAt: stage.completedAt ?? null,
      })),
      findings: findings.map((finding) => ({
        findingId: finding._id,
        code: finding.code,
        severity: finding.severity,
        summary: finding.summary,
        subjectUrl: finding.subjectUrl ?? null,
        createdAt: finding.createdAt,
      })),
      candidates: candidates.map((candidate) => ({
        candidateId: candidate._id,
        canonicalUrl: candidate.canonicalUrl,
        title: candidate.title ?? null,
        hostDisposition: candidate.hostDisposition,
        state: candidate.state,
        sourceKind: candidate.sourceKind ?? null,
        cadence: candidate.cadence ?? null,
        confidence: candidate.confidence ?? null,
      })),
      providerCalls: providerCalls.map((call) => ({
        providerCallId: call._id,
        provider: call.provider,
        operation: call.operation,
        status: call.status,
        modelId: call.modelId ?? null,
        latencyMs: call.latencyMs,
        creditsUsed: call.creditsUsed ?? null,
        creditsReported: call.creditsReported,
        totalTokens: call.totalTokens ?? null,
        estimatedCostUsd: call.estimatedCostUsd ?? null,
        createdAt: call.createdAt,
      })),
    }
  },
})

/**
 * A run targets a checked manifest by key and version. There is no URL argument,
 * so owner access cannot turn an unverified address into an official root.
 */
export const start = mutation({
  args: { bodyKey: v.string(), rootManifestVersion: v.string() },
  returns: v.object({
    runId: v.id('coverageCompilerRuns'),
    created: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const owner = await requireOwner(ctx)
    const manifest = resolveRootManifest(args.bodyKey, args.rootManifestVersion)
    if (manifest === null) {
      throw new ConvexError({
        code: 'UNKNOWN_ROOT',
        message: 'No checked root manifest matches that body and version.',
      })
    }
    const started = await startCoverageRun(ctx, {
      manifest,
      requestedByUserId: owner._id,
    })
    if (started.created && started.stageId !== null) {
      await ctx.scheduler.runAfter(
        0,
        internal.coverage.verifyRoot.verifyRootForRun,
        { runId: started.runId, stageId: started.stageId },
      )
    }
    return { runId: started.runId, created: started.created }
  },
})

export const cancel = mutation({
  args: { runId: v.id('coverageCompilerRuns') },
  returns: v.object({ canceled: v.boolean() }),
  handler: async (ctx, args) => {
    await requireOwner(ctx)
    return await cancelCoverageRun(ctx, args.runId)
  },
})

export const discover = mutation({
  args: { runId: v.id('coverageCompilerRuns') },
  returns: v.object({ started: v.boolean() }),
  handler: async (ctx, args) => {
    await requireOwner(ctx)
    const result = await beginDiscovery(ctx, args.runId)
    return { started: result.started }
  },
})

export const retry = mutation({
  args: { runId: v.id('coverageCompilerRuns') },
  returns: v.object({ retried: v.boolean() }),
  handler: async (ctx, args) => {
    await requireOwner(ctx)
    const record = await ctx.db.get(args.runId)
    if (!record) return { retried: false }
    const manifest = resolveRootManifest(
      record.bodyKey,
      record.rootManifestVersion,
    )
    if (manifest === null) {
      throw new ConvexError({
        code: 'UNKNOWN_ROOT',
        message: 'No checked root manifest matches that run.',
      })
    }
    const retried = await retryCoverageRun(ctx, args.runId, manifest)
    if (retried.retried && retried.stageId !== null) {
      const fn =
        retried.stage === 'verify_root'
          ? internal.coverage.verifyRoot.verifyRootForRun
          : retried.stage === 'discover_sources'
            ? internal.coverage.discovery.discoverForRun
            : internal.coverage.discovery.classifyForRun
      await ctx.scheduler.runAfter(0, fn, {
        runId: args.runId,
        stageId: retried.stageId,
      })
    }
    return { retried: retried.retried }
  },
})
