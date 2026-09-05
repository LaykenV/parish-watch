import { v } from 'convex/values'

import type { Doc } from '../_generated/dataModel'
import { env, internalMutation } from '../_generated/server'
import type { MutationCtx } from '../_generated/server'
import type { SourceKind } from '../pipeline/state'
import { evaluateCoverageGates, COVERAGE_EVALUATOR_VERSION } from './gates'
import { coverageGoldSetSample } from './goldSet'
import { classifyHost } from './rootGate'
import { resolveRootManifest } from './roots'

const MAX_EVIDENCE_RECORDS = 200
const RECENT_REPLAY_WINDOW_MS = 60 * 24 * 60 * 60 * 1000

export const evaluateProposal = internalMutation({
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
      !proposal ||
      !stage ||
      !run ||
      stage.runId !== proposal.runId ||
      stage.stage !== 'evaluate_gates' ||
      stage.state !== 'running'
    )
      return null
    if (run.state === 'canceled' || run.state === 'superseded') {
      await ctx.db.patch(stage._id, {
        state: 'canceled',
        completedAt: Date.now(),
      })
      return null
    }

    const registry = await ctx.db.get(proposal.registryId)
    const manifest = resolveRootManifest(
      proposal.bodyKey,
      proposal.rootManifestVersion,
    )
    const samples = await ctx.db
      .query('coverageRepresentativeSamples')
      .withIndex('by_proposal_and_role', (index) =>
        index.eq('proposalId', proposal._id),
      )
      .take(20)
    const candidates = await Promise.all(
      samples.map(async (sample) =>
        sample.candidateId ? await ctx.db.get(sample.candidateId) : null,
      ),
    )
    const records = await ctx.db
      .query('decisionRecords')
      .withIndex('by_registry_and_updated_at', (index) =>
        index.eq('registryId', proposal.registryId),
      )
      .order('desc')
      .take(MAX_EVIDENCE_RECORDS)
    const publicationEvidence = await inspectPublications(ctx, records)
    const immutableRevisionCount = await inspectImmutableRevisions(ctx, records)
    const changes = await ctx.db
      .query('sourceSnapshotChanges')
      .withIndex('by_registry_and_created_at', (index) =>
        index.eq('registryId', proposal.registryId),
      )
      .take(MAX_EVIDENCE_RECORDS)
    const expectations = await ctx.db
      .query('sourceExpectations')
      .withIndex('by_registry_and_source_kind', (index) =>
        index.eq('registryId', proposal.registryId),
      )
      .take(30)
    const pipelineRuns = await ctx.db
      .query('pipelineRuns')
      .withIndex('by_registry_and_started_time', (index) =>
        index.eq('registryId', proposal.registryId),
      )
      .order('desc')
      .take(MAX_EVIDENCE_RECORDS)
    const extractionEvidence = await inspectExtractions(ctx, pipelineRuns)
    const linkDeployment = env.CONVEX_SITE_URL === 'https://befitting-flamingo-587.convex.site' ? 'production' : 'development'
    const productionLinks = await ctx.db
      .query('coverageDirectLinkChecks')
      .withIndex('by_proposal_and_deployment_and_checked_at', (index) =>
        index.eq('proposalId', proposal._id).eq('deployment', linkDeployment),
      )
      .order('desc')
      .take(40)
    const latestProductionLinks = new Map<
      string,
      Doc<'coverageDirectLinkChecks'>
    >()
    for (const check of productionLinks) {
      const previous = latestProductionLinks.get(check.canonicalUrl)
      if (!previous || previous.checkedAt < check.checkedAt) {
        latestProductionLinks.set(check.canonicalUrl, check)
      }
    }
    const recentKinds = new Set(
      pipelineRuns
        .filter(
          (run) =>
            run.state === 'succeeded' &&
            (run.completedAt ?? 0) >= Date.now() - RECENT_REPLAY_WINDOW_MS,
        )
        .map((run) => run.sourceKind)
        .filter((kind): kind is SourceKind => kind !== undefined),
    )
    const recentRunsByTarget = new Map<string, Set<SourceKind>>()
    for (const pipelineRun of pipelineRuns) {
      if (
        pipelineRun.state !== 'succeeded' ||
        (pipelineRun.completedAt ?? 0) <
          Date.now() - RECENT_REPLAY_WINDOW_MS ||
        !pipelineRun.targetRecordId ||
        !pipelineRun.sourceKind
      ) {
        continue
      }
      const kinds =
        recentRunsByTarget.get(pipelineRun.targetRecordId) ??
        new Set<SourceKind>()
      kinds.add(pipelineRun.sourceKind)
      recentRunsByTarget.set(pipelineRun.targetRecordId, kinds)
    }
    const staleExpectationCount = expectations.filter(
      (expectation) => !recentKinds.has(expectation.sourceKind),
    ).length
    const requiredSamples = samples.filter((sample) => sample.required)
    const officialDomainsOnly =
      registry !== null &&
      manifest !== null &&
      sameStrings(registry.officialDomains, manifest.allowedHosts) &&
      candidates.every(
        (candidate, index) =>
          candidate !== null &&
          samples[index] !== undefined &&
          classifyHost(manifest, candidate.canonicalUrl) !== 'unapproved' &&
          coverageGoldSetSample(
            proposal.bodyKey,
            candidate.canonicalUrl,
            samples[index].sourceKind,
          ) !== null,
      )
    const results = evaluateCoverageGates({
      expectedArtifactCount: requiredSamples.length,
      retrievedArtifactCount: requiredSamples.filter(
        (sample) => sample.state === 'retrieved',
      ).length,
      officialDomainsOnly,
      currentArtifactCount: requiredSamples.filter(
        (sample) => sample.role === 'current' && sample.state === 'retrieved',
      ).length,
      historicalArtifactCount: requiredSamples.filter(
        (sample) =>
          sample.role === 'historical' && sample.state === 'retrieved',
      ).length,
      acceptedPublicationCount: publicationEvidence.accepted,
      publicationsWithCompleteCitations: publicationEvidence.cited,
      unsupportedMaterialFactCount: publicationEvidence.unsupportedFacts,
      immutableRevisionCount: changes.length + immutableRevisionCount,
      failureHandlingObserved:
        publicationEvidence.limitedOrWithheld ||
        extractionEvidence.failureHandled,
      expectationCount: expectations.length,
      staleExpectationCount,
      recentReplayPassed: [...recentRunsByTarget.values()].some(
        (kinds) => kinds.has('agenda') && kinds.has('minutes'),
      ),
      linkDeployment,
      productionLinkCount: latestProductionLinks.size,
      passingProductionLinkCount: [...latestProductionLinks.values()].filter(
        (check) => check.passed,
      ).length,
    })

    const now = Date.now()
    for (const result of results) {
      await ctx.db.insert('coverageGateEvaluations', {
        proposalId: proposal._id,
        ...result,
        evaluatorVersion: COVERAGE_EVALUATOR_VERSION,
        registryStatusGeneration: registry?.statusGeneration ?? 0,
        createdAt: now,
      })
      if (!result.passed) {
        await ctx.db.insert('coverageCompilerFindings', {
          runId: proposal.runId,
          stageId: stage._id,
          code: findingCodeForGate(result.gateNumber),
          severity: 'blocking',
          summary: `Gate ${result.gateNumber} failed: ${result.detail}`.slice(
            0,
            200,
          ),
          createdAt: now,
        })
      }
    }
    const ready = results.every((result) => result.passed)
    await ctx.db.patch(stage._id, { state: 'succeeded', completedAt: now })
    await ctx.db.patch(proposal._id, {
      evaluatorVersion: COVERAGE_EVALUATOR_VERSION,
      status:
        proposal.status === 'promoted'
          ? 'promoted'
          : ready
            ? 'ready'
            : 'blocked',
      evaluatedAt: now,
    })
    await ctx.db.patch(proposal.runId, {
      state: 'succeeded',
      currentStage: 'evaluate_gates',
      completedAt: now,
    })
    return null
  },
})

async function inspectPublications(
  ctx: Pick<MutationCtx, 'db'>,
  records: Array<Doc<'decisionRecords'>>,
): Promise<{
  accepted: number
  cited: number
  unsupportedFacts: number
  limitedOrWithheld: boolean
}> {
  let accepted = 0
  let cited = 0
  let unsupportedFacts = 0
  let limitedOrWithheld = false
  for (const record of records) {
    if (!record.currentPublishedVersionId) continue
    const publication = await ctx.db.get(record.currentPublishedVersionId)
    if (!publication) continue
    if (publication.mode === 'full' || publication.mode === 'limited')
      accepted += 1
    if (publication.mode === 'limited' || publication.mode === 'withheld') {
      limitedOrWithheld = true
    }
    const citations = await ctx.db
      .query('citations')
      .withIndex('by_publication_and_field_path', (index) =>
        index.eq('publicationVersionId', publication._id),
      )
      .take(100)
    const checks = await ctx.db
      .query('reviewChecks')
      .withIndex('by_review_and_field_path', (index) =>
        index.eq('reviewId', publication.reviewId),
      )
      .take(100)
    const checksByFact = new Map(
      checks.map((check) => [check.candidateFactId, check]),
    )
    if (
      citations.length > 0 &&
      citations.every(
        (citation) =>
          checksByFact.get(citation.candidateFactId)?.assessment ===
          'supported',
      )
    ) {
      cited += 1
    }
    unsupportedFacts += citations.filter(
      (citation) =>
        checksByFact.get(citation.candidateFactId)?.assessment !== 'supported',
    ).length
  }
  return { accepted, cited, unsupportedFacts, limitedOrWithheld }
}

async function inspectImmutableRevisions(
  ctx: Pick<MutationCtx, 'db'>,
  records: Array<Doc<'decisionRecords'>>,
): Promise<number> {
  let revisionCount = 0
  for (const record of records) {
    const versions = await ctx.db
      .query('publicationVersions')
      .withIndex('by_record_and_version', (index) =>
        index.eq('recordId', record._id),
      )
      .take(20)
    if (
      versions.length > 1 &&
      new Set(versions.map((version) => version.snapshotId)).size > 1
    ) {
      revisionCount += 1
    }
  }
  return revisionCount
}

async function inspectExtractions(
  ctx: Pick<MutationCtx, 'db'>,
  runs: Array<Doc<'pipelineRuns'>>,
): Promise<{ failureHandled: boolean }> {
  for (const run of runs) {
    const extraction = await ctx.db
      .query('extractions')
      .withIndex('by_run', (index) => index.eq('runId', run._id))
      .unique()
    if (extraction?.state === 'failed' || extraction?.state === 'not_found') {
      return { failureHandled: true }
    }
  }
  return { failureHandled: false }
}

function sameStrings(left: string[], right: string[]): boolean {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort())
}

function findingCodeForGate(
  gateNumber: number,
):
  | 'sample_missing'
  | 'sample_citation_incomplete'
  | 'sample_incomplete_source'
  | 'sample_stale'
  | 'coverage_gate_failed' {
  if (gateNumber === 1) return 'sample_missing'
  if (gateNumber === 4) return 'sample_citation_incomplete'
  if (gateNumber === 7) return 'sample_incomplete_source'
  if (gateNumber === 8) return 'sample_stale'
  return 'coverage_gate_failed'
}
