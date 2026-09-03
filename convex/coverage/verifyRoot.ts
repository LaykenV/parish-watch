import { v } from 'convex/values'

import { internal } from '../_generated/api'
import { internalAction } from '../_generated/server'
import { evaluateRootChain, isApprovedRootUrl } from './rootGate'
import { walkRedirects } from './redirectWalk'
import { resolveRootManifest } from './roots'

export const verifyRootForRun = internalAction({
  args: {
    runId: v.id('coverageCompilerRuns'),
    stageId: v.id('coverageCompilerStages'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(
      internal.coverage.ledger.rootVerificationContext,
      { runId: args.runId, stageId: args.stageId },
    )
    if (context === null) {
      // The run was canceled or superseded before this request could start.
      await ctx.runMutation(internal.coverage.ledger.abandonStage, {
        runId: args.runId,
        stageId: args.stageId,
      })
      return null
    }

    const manifest = resolveRootManifest(
      context.bodyKey,
      context.rootManifestVersion,
    )
    if (manifest === null) {
      await ctx.runMutation(internal.coverage.ledger.recordRunFailure, {
        runId: args.runId,
        stageId: args.stageId,
        code: 'root_manifest_missing',
        summary:
          'No checked root manifest matches this body and manifest version.',
      })
      return null
    }

    const walk = await walkRedirects(manifest.approvedRootUrl, (url) =>
      isApprovedRootUrl(manifest, url),
    )
    const evaluation = evaluateRootChain(manifest, walk)

    await ctx.runMutation(internal.coverage.ledger.completeRootVerification, {
      runId: args.runId,
      stageId: args.stageId,
      outcome: evaluation.outcome,
      resolvedRootUrl: evaluation.finalUrl,
      redirectChain: evaluation.hops,
      findings: evaluation.findings,
    })
    return null
  },
})
