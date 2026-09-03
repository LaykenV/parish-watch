import { v } from 'convex/values'

import { internal } from '../_generated/api'
import type { Id } from '../_generated/dataModel'
import { internalMutation, internalQuery } from '../_generated/server'
import type { MutationCtx } from '../_generated/server'
import { estimateCostUsd } from '../ai/types'
import { sha256HexOfText } from '../sources/hashing'
import {
  boundedDetail,
  coverageCadences,
  coverageFindingCodes,
  coverageHostDispositions,
  coverageProviderNames,
  coverageSourceKinds,
} from './contracts'
import {
  SOURCE_CLASSIFIER_PROMPT_VERSION,
  SOURCE_CLASSIFIER_SCHEMA_VERSION,
  sourceClassification,
} from './classifier'
import { resolveRootManifest } from './roots'

const STAGE_SCAN_LIMIT = 30

async function stageKey(
  runId: Id<'coverageCompilerRuns'>,
  stage: 'discover_sources' | 'classify_sources',
  attempt: number,
): Promise<{ idempotencyKey: string; inputHash: string }> {
  const inputHash = await sha256HexOfText(
    [runId, stage, String(attempt)].join('\n'),
  )
  return { idempotencyKey: `coverage:${stage}:v1:${inputHash}`, inputHash }
}

async function openStage(
  ctx: MutationCtx,
  runId: Id<'coverageCompilerRuns'>,
  stage: 'discover_sources' | 'classify_sources',
  attempt: number,
): Promise<Id<'coverageCompilerStages'>> {
  const key = await stageKey(runId, stage, attempt)
  return await ctx.db.insert('coverageCompilerStages', {
    runId,
    stage,
    idempotencyKey: key.idempotencyKey,
    inputHash: key.inputHash,
    attempt,
    state: 'running',
    gateVersion: 'v1',
    startedAt: Date.now(),
  })
}

export async function beginDiscovery(
  ctx: MutationCtx,
  runId: Id<'coverageCompilerRuns'>,
): Promise<{
  started: boolean
  stageId: Id<'coverageCompilerStages'> | null
}> {
  const run = await ctx.db.get(runId)
  if (!run || run.state !== 'succeeded' || run.currentStage !== 'verify_root') {
    return { started: false, stageId: null }
  }
  const stages = await ctx.db
    .query('coverageCompilerStages')
    .withIndex('by_run_and_stage', (index) => index.eq('runId', runId))
    .take(STAGE_SCAN_LIMIT)
  if (
    !stages.some(
      (stage) => stage.stage === 'verify_root' && stage.state === 'succeeded',
    ) ||
    stages.some((stage) => stage.stage === 'discover_sources')
  ) {
    return { started: false, stageId: null }
  }
  const stageId = await openStage(ctx, runId, 'discover_sources', 1)
  await ctx.db.patch(runId, {
    state: 'running',
    currentStage: 'discover_sources',
    completedAt: undefined,
  })
  await ctx.scheduler.runAfter(0, internal.coverage.discovery.discoverForRun, {
    runId,
    stageId,
  })
  return { started: true, stageId }
}

export async function openRetryStage(
  ctx: MutationCtx,
  runId: Id<'coverageCompilerRuns'>,
  stage: 'discover_sources' | 'classify_sources',
  attempt: number,
): Promise<Id<'coverageCompilerStages'>> {
  return await openStage(ctx, runId, stage, attempt)
}

export const discoveryContext = internalQuery({
  args: {
    runId: v.id('coverageCompilerRuns'),
    stageId: v.id('coverageCompilerStages'),
  },
  returns: v.union(
    v.null(),
    v.object({
      bodyKey: v.string(),
      bodyName: v.string(),
      rootManifestVersion: v.string(),
      resolvedRootUrl: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId)
    const stage = await ctx.db.get(args.stageId)
    if (
      !run ||
      !stage ||
      stage.runId !== run._id ||
      run.state !== 'running' ||
      run.currentStage !== 'discover_sources' ||
      stage.stage !== 'discover_sources' ||
      stage.state !== 'running'
    )
      return null
    const rootStages = await ctx.db
      .query('coverageCompilerStages')
      .withIndex('by_run_and_stage', (index) =>
        index.eq('runId', run._id).eq('stage', 'verify_root'),
      )
      .order('desc')
      .take(STAGE_SCAN_LIMIT)
    const verified = rootStages.find(
      (entry) => entry.state === 'succeeded' && entry.resolvedRootUrl,
    )
    const manifest = resolveRootManifest(run.bodyKey, run.rootManifestVersion)
    if (!verified?.resolvedRootUrl || !manifest) return null
    return {
      bodyKey: run.bodyKey,
      bodyName: manifest.bodyName,
      rootManifestVersion: run.rootManifestVersion,
      resolvedRootUrl: verified.resolvedRootUrl,
    }
  },
})

const discoveredCandidate = v.object({
  canonicalUrl: v.string(),
  title: v.optional(v.string()),
  description: v.optional(v.string()),
  discoveredFrom: v.array(v.string()),
  matchedTerms: v.array(v.string()),
  hostDisposition: coverageHostDispositions,
})

export const persistDiscovery = internalMutation({
  args: {
    runId: v.id('coverageCompilerRuns'),
    stageId: v.id('coverageCompilerStages'),
    candidates: v.array(discoveredCandidate),
  },
  returns: v.object({
    candidateCount: v.number(),
    classificationStageId: v.union(v.id('coverageCompilerStages'), v.null()),
  }),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId)
    const stage = await ctx.db.get(args.stageId)
    if (
      !run ||
      !stage ||
      stage.runId !== run._id ||
      run.state !== 'running' ||
      run.currentStage !== 'discover_sources' ||
      stage.stage !== 'discover_sources' ||
      stage.state !== 'running'
    )
      return { candidateCount: 0, classificationStageId: null }

    const now = Date.now()
    for (const candidate of args.candidates) {
      const existing = await ctx.db
        .query('coverageSourceCandidates')
        .withIndex('by_run_and_url', (index) =>
          index.eq('runId', run._id).eq('canonicalUrl', candidate.canonicalUrl),
        )
        .unique()
      if (existing) continue
      await ctx.db.insert('coverageSourceCandidates', {
        runId: run._id,
        stageId: stage._id,
        ...candidate,
        state: 'pending',
        createdAt: now,
      })
      if (candidate.hostDisposition === 'document_host') {
        await ctx.db.insert('coverageCompilerFindings', {
          runId: run._id,
          stageId: stage._id,
          code: 'candidate_document_host_quarantined',
          severity: 'warning',
          summary:
            'A linked document host remains quarantined pending candidate validation.',
          subjectUrl: candidate.canonicalUrl,
          createdAt: now,
        })
      }
    }

    await ctx.db.patch(stage._id, { state: 'succeeded', completedAt: now })
    if (args.candidates.length === 0) {
      await ctx.db.insert('coverageCompilerFindings', {
        runId: run._id,
        stageId: stage._id,
        code: 'discovery_no_candidates',
        severity: 'blocking',
        summary: 'Bounded discovery found no source candidates for this body.',
        createdAt: now,
      })
      await ctx.db.patch(run._id, {
        state: 'failed_terminal',
        completedAt: now,
      })
      return { candidateCount: 0, classificationStageId: null }
    }

    const classificationStageId = await openStage(
      ctx,
      run._id,
      'classify_sources',
      1,
    )
    await ctx.db.patch(run._id, { currentStage: 'classify_sources' })
    await ctx.scheduler.runAfter(
      0,
      internal.coverage.discovery.classifyForRun,
      { runId: run._id, stageId: classificationStageId },
    )
    return { candidateCount: args.candidates.length, classificationStageId }
  },
})

export const classificationContext = internalQuery({
  args: {
    runId: v.id('coverageCompilerRuns'),
    stageId: v.id('coverageCompilerStages'),
  },
  returns: v.union(
    v.null(),
    v.object({
      bodyKey: v.string(),
      bodyName: v.string(),
      candidates: v.array(
        v.object({
          candidateId: v.id('coverageSourceCandidates'),
          canonicalUrl: v.string(),
          title: v.optional(v.string()),
          description: v.optional(v.string()),
          matchedTerms: v.array(v.string()),
          hostDisposition: coverageHostDispositions,
        }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId)
    const stage = await ctx.db.get(args.stageId)
    if (
      !run ||
      !stage ||
      stage.runId !== run._id ||
      run.state !== 'running' ||
      run.currentStage !== 'classify_sources' ||
      stage.stage !== 'classify_sources' ||
      stage.state !== 'running'
    )
      return null
    const manifest = resolveRootManifest(run.bodyKey, run.rootManifestVersion)
    if (!manifest) return null
    const candidates = await ctx.db
      .query('coverageSourceCandidates')
      .withIndex('by_run_and_state', (index) =>
        index.eq('runId', run._id).eq('state', 'pending'),
      )
      .take(100)
    return {
      bodyKey: run.bodyKey,
      bodyName: manifest.bodyName,
      candidates: candidates.map((candidate) => ({
        candidateId: candidate._id,
        canonicalUrl: candidate.canonicalUrl,
        ...(candidate.title ? { title: candidate.title } : {}),
        ...(candidate.description
          ? { description: candidate.description }
          : {}),
        matchedTerms: candidate.matchedTerms,
        hostDisposition: candidate.hostDisposition,
      })),
    }
  },
})

export const persistClassifications = internalMutation({
  args: {
    runId: v.id('coverageCompilerRuns'),
    stageId: v.id('coverageCompilerStages'),
    classifications: v.array(sourceClassification),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId)
    const stage = await ctx.db.get(args.stageId)
    if (
      !run ||
      !stage ||
      stage.runId !== run._id ||
      run.state !== 'running' ||
      run.currentStage !== 'classify_sources' ||
      stage.stage !== 'classify_sources' ||
      stage.state !== 'running'
    )
      return null
    const now = Date.now()
    for (const classification of args.classifications) {
      const candidateId = ctx.db.normalizeId(
        'coverageSourceCandidates',
        classification.candidateId,
      )
      if (!candidateId) continue
      const candidate = await ctx.db.get(candidateId)
      if (!candidate || candidate.runId !== run._id) continue
      await ctx.db.patch(candidateId, {
        state: classification.outcome,
        sourceKind: classification.sourceKind,
        cadence: classification.cadence,
        confidence: classification.confidence,
        evidenceText: classification.evidenceText,
        noGuessReason: classification.noGuessReason || undefined,
        classifiedAt: now,
      })
    }
    await ctx.db.patch(stage._id, { state: 'succeeded', completedAt: now })
    await ctx.db.patch(run._id, { state: 'succeeded', completedAt: now })
    return null
  },
})

export const failStage = internalMutation({
  args: {
    runId: v.id('coverageCompilerRuns'),
    stageId: v.id('coverageCompilerStages'),
    code: coverageFindingCodes,
    summary: v.string(),
    retryable: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId)
    const stage = await ctx.db.get(args.stageId)
    if (
      !run ||
      !stage ||
      stage.runId !== run._id ||
      stage.state !== 'running'
    ) {
      return null
    }
    const state = args.retryable ? 'failed_retryable' : 'failed_terminal'
    const now = Date.now()
    const summary = boundedDetail(args.summary)
    await ctx.db.patch(stage._id, {
      state,
      errorClass: `coverage:${args.code}`,
      errorDetail: summary,
      completedAt: now,
    })
    await ctx.db.insert('coverageCompilerFindings', {
      runId: run._id,
      stageId: stage._id,
      code: args.code,
      severity: 'blocking',
      summary,
      createdAt: now,
    })
    if (run.state === 'running') {
      await ctx.db.patch(run._id, { state, completedAt: now })
    }
    return null
  },
})

export const recordProviderCall = internalMutation({
  args: {
    runId: v.id('coverageCompilerRuns'),
    stageId: v.id('coverageCompilerStages'),
    provider: coverageProviderNames,
    operation: v.string(),
    status: v.string(),
    requestHash: v.string(),
    responseHash: v.optional(v.string()),
    promptVersion: v.optional(v.string()),
    schemaVersion: v.optional(v.string()),
    modelId: v.optional(v.string()),
    latencyMs: v.number(),
    creditsUsed: v.optional(v.number()),
    creditsReported: v.boolean(),
    promptTokens: v.optional(v.number()),
    completionTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    errorClass: v.optional(v.string()),
    errorDetail: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const stage = await ctx.db.get(args.stageId)
    if (!stage || stage.runId !== args.runId) return null
    const usage = {
      promptTokens: args.promptTokens ?? null,
      completionTokens: args.completionTokens ?? null,
      totalTokens: args.totalTokens ?? null,
      cachedTokens: null,
      reasoningTokens: null,
    }
    const estimatedCostUsd =
      args.provider === 'firecrawl'
        ? null
        : estimateCostUsd('MODEL_FAST', usage)
    await ctx.db.insert('coverageCompilerProviderCalls', {
      runId: args.runId,
      stageId: args.stageId,
      provider: args.provider,
      operation: args.operation,
      status: args.status,
      requestHash: args.requestHash,
      ...(args.responseHash === undefined
        ? {}
        : { responseHash: args.responseHash }),
      ...(args.promptVersion === undefined
        ? {}
        : { promptVersion: args.promptVersion }),
      ...(args.schemaVersion === undefined
        ? {}
        : { schemaVersion: args.schemaVersion }),
      ...(args.modelId === undefined ? {} : { modelId: args.modelId }),
      latencyMs: args.latencyMs,
      ...(args.creditsUsed === undefined
        ? {}
        : { creditsUsed: args.creditsUsed }),
      creditsReported: args.creditsReported,
      ...(args.promptTokens === undefined
        ? {}
        : { promptTokens: args.promptTokens }),
      ...(args.completionTokens === undefined
        ? {}
        : { completionTokens: args.completionTokens }),
      ...(args.totalTokens === undefined
        ? {}
        : { totalTokens: args.totalTokens }),
      ...(args.errorClass === undefined ? {} : { errorClass: args.errorClass }),
      ...(args.provider === 'firecrawl'
        ? {}
        : { modelRole: 'MODEL_FAST' as const }),
      ...(estimatedCostUsd === null ? {} : { estimatedCostUsd }),
      ...(args.errorDetail === undefined
        ? {}
        : { errorDetail: boundedDetail(args.errorDetail) }),
      createdAt: Date.now(),
    })
    return null
  },
})

export const sourceClassifierVersions = {
  prompt: SOURCE_CLASSIFIER_PROMPT_VERSION,
  schema: SOURCE_CLASSIFIER_SCHEMA_VERSION,
} as const
