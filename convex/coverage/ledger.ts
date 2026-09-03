import { v } from 'convex/values'

import type { Doc, Id } from '../_generated/dataModel'
import { internalMutation, internalQuery } from '../_generated/server'
import type { MutationCtx } from '../_generated/server'
import { sha256HexOfText } from '../sources/hashing'
import {
  COVERAGE_COMPILER_VERSION,
  ROOT_GATE_VERSION,
  coverageFindingCodes,
  coverageFindingSeverities,
  coverageRedirectHop,
} from './contracts'
import type { CoverageRootManifest } from './roots'

const MAX_STORED_HOPS = 8
const RUN_SCAN_LIMIT = 25

export async function coverageRunKey(input: {
  bodyKey: string
  rootManifestVersion: string
  compilerVersion: string
  attempt: number
}): Promise<string> {
  const inputHash = await sha256HexOfText(
    [
      input.bodyKey,
      input.rootManifestVersion,
      input.compilerVersion,
      String(input.attempt),
    ].join('\n'),
  )
  return `coverage-run:${input.compilerVersion}:${inputHash}`
}

export async function rootStageKey(input: {
  runId: Id<'coverageCompilerRuns'>
  attempt: number
}): Promise<{ idempotencyKey: string; inputHash: string }> {
  const inputHash = await sha256HexOfText(
    [input.runId, String(input.attempt)].join('\n'),
  )
  return {
    idempotencyKey: `coverage-root-gate:${ROOT_GATE_VERSION}:${inputHash}`,
    inputHash,
  }
}

async function recentRunsForBody(
  ctx: MutationCtx,
  bodyKey: string,
): Promise<Doc<'coverageCompilerRuns'>[]> {
  return await ctx.db
    .query('coverageCompilerRuns')
    .withIndex('by_body_key_and_started_at', (index) =>
      index.eq('bodyKey', bodyKey),
    )
    .order('desc')
    .take(RUN_SCAN_LIMIT)
}

function isActive(run: Doc<'coverageCompilerRuns'>): boolean {
  return run.state === 'queued' || run.state === 'running'
}

export type StartedRun = {
  runId: Id<'coverageCompilerRuns'>
  stageId: Id<'coverageCompilerStages'> | null
  created: boolean
}

/**
 * Replaying the same body, manifest version, and compiler version returns the
 * existing active or successful run. A terminal failure earns a new attempt.
 */
export async function startCoverageRun(
  ctx: MutationCtx,
  input: { manifest: CoverageRootManifest; requestedByUserId: Id<'users'> },
): Promise<StartedRun> {
  const { manifest } = input
  const runs = await recentRunsForBody(ctx, manifest.bodyKey)

  const matching = runs.filter(
    (run) =>
      run.rootManifestVersion === manifest.version &&
      run.compilerVersion === COVERAGE_COMPILER_VERSION,
  )
  const latest = matching[0]
  if (latest && (isActive(latest) || latest.state === 'succeeded')) {
    return { runId: latest._id, stageId: null, created: false }
  }

  // A newer manifest or compiler version retires work started under the old one.
  for (const run of runs) {
    if (
      isActive(run) &&
      (run.rootManifestVersion !== manifest.version ||
        run.compilerVersion !== COVERAGE_COMPILER_VERSION)
    ) {
      await ctx.db.patch(run._id, {
        state: 'superseded',
        completedAt: Date.now(),
      })
    }
  }

  const attempt = latest ? latest.attempt + 1 : 1
  const startedAt = Date.now()
  const runId = await ctx.db.insert('coverageCompilerRuns', {
    bodyKey: manifest.bodyKey,
    jurisdictionSlug: manifest.jurisdictionSlug,
    rootManifestVersion: manifest.version,
    compilerVersion: COVERAGE_COMPILER_VERSION,
    idempotencyKey: await coverageRunKey({
      bodyKey: manifest.bodyKey,
      rootManifestVersion: manifest.version,
      compilerVersion: COVERAGE_COMPILER_VERSION,
      attempt,
    }),
    attempt,
    state: 'running',
    currentStage: 'verify_root',
    requestedByUserId: input.requestedByUserId,
    startedAt,
  })
  const stageId = await openRootStage(ctx, runId, 1, manifest.approvedRootUrl)
  return { runId, stageId, created: true }
}

async function openRootStage(
  ctx: MutationCtx,
  runId: Id<'coverageCompilerRuns'>,
  attempt: number,
  requestedRootUrl: string,
): Promise<Id<'coverageCompilerStages'>> {
  const key = await rootStageKey({ runId, attempt })
  return await ctx.db.insert('coverageCompilerStages', {
    runId,
    stage: 'verify_root',
    idempotencyKey: key.idempotencyKey,
    inputHash: key.inputHash,
    attempt,
    state: 'running',
    gateVersion: ROOT_GATE_VERSION,
    requestedRootUrl,
    startedAt: Date.now(),
  })
}

export async function cancelCoverageRun(
  ctx: MutationCtx,
  runId: Id<'coverageCompilerRuns'>,
): Promise<{ canceled: boolean }> {
  const run = await ctx.db.get(runId)
  if (!run || !isActive(run)) return { canceled: false }
  const canceledAt = Date.now()
  await ctx.db.patch(runId, {
    state: 'canceled',
    canceledAt,
    completedAt: canceledAt,
  })
  // Running stages keep their state so a request already in flight can still
  // record what it found. A canceled run never advances on that result.
  return { canceled: true }
}

export async function retryCoverageRun(
  ctx: MutationCtx,
  runId: Id<'coverageCompilerRuns'>,
  manifest: CoverageRootManifest,
): Promise<{
  retried: boolean
  stageId: Id<'coverageCompilerStages'> | null
}> {
  const run = await ctx.db.get(runId)
  if (
    !run ||
    (run.state !== 'failed_retryable' && run.state !== 'failed_terminal')
  ) {
    return { retried: false, stageId: null }
  }
  const bodyRuns = await recentRunsForBody(ctx, run.bodyKey)
  const competingRun = bodyRuns.find(
    (candidate) => candidate._id !== run._id && isActive(candidate),
  )
  if (competingRun) return { retried: false, stageId: null }
  const stages = await ctx.db
    .query('coverageCompilerStages')
    .withIndex('by_run_and_stage', (index) => index.eq('runId', runId))
    .take(RUN_SCAN_LIMIT)
  const rootStages = stages.filter((stage) => stage.stage === 'verify_root')
  if (rootStages.some((stage) => stage.state === 'running')) {
    return { retried: false, stageId: null }
  }
  const attempt =
    rootStages.reduce((highest, stage) => Math.max(highest, stage.attempt), 0) +
    1
  const stageId = await openRootStage(
    ctx,
    runId,
    attempt,
    manifest.approvedRootUrl,
  )
  await ctx.db.patch(runId, {
    state: 'running',
    currentStage: 'verify_root',
    completedAt: undefined,
  })
  return { retried: true, stageId }
}

export const rootVerificationContext = internalQuery({
  args: {
    runId: v.id('coverageCompilerRuns'),
    stageId: v.id('coverageCompilerStages'),
  },
  returns: v.union(
    v.null(),
    v.object({
      bodyKey: v.string(),
      rootManifestVersion: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId)
    const stage = await ctx.db.get(args.stageId)
    if (!run || !stage || stage.runId !== args.runId) return null
    // A run canceled or superseded before the request starts spends nothing.
    if (!isActive(run) || stage.state !== 'running') return null
    return {
      bodyKey: run.bodyKey,
      rootManifestVersion: run.rootManifestVersion,
    }
  },
})

export const abandonStage = internalMutation({
  args: {
    runId: v.id('coverageCompilerRuns'),
    stageId: v.id('coverageCompilerStages'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const stage = await ctx.db.get(args.stageId)
    const run = await ctx.db.get(args.runId)
    if (!stage || !run || stage.runId !== args.runId) return null
    if (stage.state !== 'running' || isActive(run)) return null
    await ctx.db.patch(args.stageId, {
      state: 'canceled',
      completedAt: Date.now(),
    })
    return null
  },
})

export const completeRootVerification = internalMutation({
  args: {
    runId: v.id('coverageCompilerRuns'),
    stageId: v.id('coverageCompilerStages'),
    outcome: v.union(
      v.literal('passed'),
      v.literal('failed_retryable'),
      v.literal('failed_terminal'),
    ),
    resolvedRootUrl: v.optional(v.string()),
    redirectChain: v.array(coverageRedirectHop),
    findings: v.array(
      v.object({
        code: coverageFindingCodes,
        severity: coverageFindingSeverities,
        summary: v.string(),
        subjectUrl: v.optional(v.string()),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const stage = await ctx.db.get(args.stageId)
    const run = await ctx.db.get(args.runId)
    if (!stage || !run || stage.runId !== args.runId) return null
    if (stage.state !== 'running') return null

    const completedAt = Date.now()
    const blocking = args.findings.find(
      (finding) => finding.severity === 'blocking',
    )
    const stageState =
      args.outcome === 'passed' ? ('succeeded' as const) : args.outcome

    await ctx.db.patch(args.stageId, {
      state: stageState,
      resolvedRootUrl: args.resolvedRootUrl,
      redirectChain: args.redirectChain.slice(0, MAX_STORED_HOPS),
      errorClass: blocking ? `root_gate:${blocking.code}` : undefined,
      errorDetail: blocking ? blocking.summary : undefined,
      completedAt,
    })

    for (const finding of args.findings) {
      await ctx.db.insert('coverageCompilerFindings', {
        runId: args.runId,
        stageId: args.stageId,
        code: finding.code,
        severity: finding.severity,
        summary: finding.summary,
        subjectUrl: finding.subjectUrl,
        createdAt: completedAt,
      })
    }

    // A canceled or superseded run keeps the evidence and its stopped state.
    if (isActive(run)) {
      await ctx.db.patch(args.runId, { state: stageState, completedAt })
    }
    return null
  },
})

export const recordRunFailure = internalMutation({
  args: {
    runId: v.id('coverageCompilerRuns'),
    stageId: v.id('coverageCompilerStages'),
    code: coverageFindingCodes,
    summary: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const stage = await ctx.db.get(args.stageId)
    const run = await ctx.db.get(args.runId)
    if (!stage || !run || stage.runId !== args.runId) return null
    if (stage.state !== 'running') return null

    const completedAt = Date.now()
    await ctx.db.patch(args.stageId, {
      state: 'failed_terminal',
      errorClass: `root_gate:${args.code}`,
      errorDetail: args.summary,
      completedAt,
    })
    await ctx.db.insert('coverageCompilerFindings', {
      runId: args.runId,
      stageId: args.stageId,
      code: args.code,
      severity: 'blocking',
      summary: args.summary,
      createdAt: completedAt,
    })
    if (isActive(run)) {
      await ctx.db.patch(args.runId, {
        state: 'failed_terminal',
        completedAt,
      })
    }
    return null
  },
})
