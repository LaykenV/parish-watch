import { ConvexError, v } from 'convex/values'

import type { Doc, Id } from '../_generated/dataModel'
import { mutation } from '../_generated/server'
import type { MutationCtx } from '../_generated/server'
import { requireOwner } from '../auth/authorization'
import type { SourceKind } from '../pipeline/state'
import { sha256HexOfText } from '../sources/hashing'
import { COVERAGE_EVALUATOR_VERSION, COVERAGE_GOLD_SET_VERSION } from './gates'
import {
  coverageGoldSetExpectations,
  coverageGoldSetSamples,
} from './goldSet'
import { classifyHost } from './rootGate'
import { resolveRootManifest } from './roots'

const MAX_PROPOSAL_SEEDS = 20

export const prepareProposal = mutation({
  args: { runId: v.id('coverageCompilerRuns') },
  returns: v.object({
    proposalId: v.id('coverageRegistryProposals'),
    created: v.boolean(),
  }),
  handler: async (ctx, args) => {
    await requireOwner(ctx)
    const run = await ctx.db.get(args.runId)
    if (!run || run.state !== 'succeeded') {
      throw proposalError(
        'run_not_classified',
        'A proposal needs a completed source-classification run.',
      )
    }
    const manifest = resolveRootManifest(run.bodyKey, run.rootManifestVersion)
    if (!manifest) {
      throw proposalError(
        'manifest_missing',
        'The checked root manifest for this run no longer exists.',
      )
    }
    const existing = await ctx.db
      .query('coverageRegistryProposals')
      .withIndex('by_run_and_version', (index) => index.eq('runId', run._id))
      .order('desc')
      .first()
    if (
      existing &&
      existing.status !== 'superseded' &&
      (existing.status === 'promoted' ||
        (existing.goldSetVersion === COVERAGE_GOLD_SET_VERSION &&
          existing.evaluatorVersion === COVERAGE_EVALUATOR_VERSION))
    ) {
      await syncCandidateBody(ctx, existing.governmentBodyId, manifest)
      return { proposalId: existing._id, created: false }
    }
    if (existing && existing.status !== 'superseded') {
      await ctx.db.patch(existing._id, { status: 'superseded' })
    }

    const candidates = await ctx.db
      .query('coverageSourceCandidates')
      .withIndex('by_run_and_url', (index) => index.eq('runId', run._id))
      .take(100)
    const goldSamples = coverageGoldSetSamples(manifest.bodyKey)
    const expectations = coverageGoldSetExpectations(manifest.bodyKey)
    const classificationStage = await ctx.db
      .query('coverageCompilerStages')
      .withIndex('by_run_and_stage', (index) =>
        index.eq('runId', run._id).eq('stage', 'classify_sources'),
      )
      .order('desc')
      .first()
    if (!classificationStage || classificationStage.state !== 'succeeded') {
      throw proposalError(
        'classification_stage_missing',
        'A proposal needs its completed classification stage.',
      )
    }
    const sampleCandidates = await ensureGoldCandidates(
      ctx,
      run._id,
      classificationStage._id,
      candidates,
      manifest,
      goldSamples,
      expectations,
    )

    const jurisdictionId = await ensureJurisdiction(ctx, manifest)
    const governmentBodyId = await ensureBody(ctx, jurisdictionId, manifest)
    const proposedSourceKinds = [
      ...new Set(goldSamples.map((sample) => sample.sourceKind)),
    ].sort()
    const proposedSeedUrls = [
      ...new Set(goldSamples.map((sample) => sample.url)),
    ].slice(0, MAX_PROPOSAL_SEEDS)
    if (proposedSeedUrls.length === 0) {
      throw proposalError(
        'no_official_seeds',
        'The checked gold set has no official source seeds.',
      )
    }

    const registryId = await ctx.db.insert('sourceRegistries', {
      governmentBodyId,
      officialDomains: [...manifest.allowedHosts],
      seedUrls: proposedSeedUrls,
      sourceKinds: proposedSourceKinds,
      expectedCadence: { kind: 'meeting_cycle' },
      discoveryMode: 'dynamic',
      status: 'validating',
    })
    const priorRegistry = await firstPriorRegistry(
      ctx,
      governmentBodyId,
      registryId,
    )
    const diffSummary = registryDiff(
      priorRegistry,
      manifest.allowedHosts,
      proposedSeedUrls,
      proposedSourceKinds,
    )
    const proposalVersion = (existing?.proposalVersion ?? 0) + 1
    const diffHash = await sha256HexOfText(JSON.stringify(diffSummary))
    const createdAt = Date.now()
    const proposalId = await ctx.db.insert('coverageRegistryProposals', {
      runId: run._id,
      governmentBodyId,
      registryId,
      bodyKey: run.bodyKey,
      proposalVersion,
      status: 'draft',
      rootManifestVersion: run.rootManifestVersion,
      goldSetVersion: COVERAGE_GOLD_SET_VERSION,
      evaluatorVersion: COVERAGE_EVALUATOR_VERSION,
      proposedDomains: [...manifest.allowedHosts],
      proposedSeedUrls,
      proposedSourceKinds,
      diffHash,
      diffSummary,
      createdAt,
    })

    for (const expectation of expectations) {
      await ctx.db.insert('sourceExpectations', {
        proposalId,
        registryId,
        sourceKind: expectation.sourceKind,
        cadence: expectation.cadence,
        basis: 'official',
        createdAt,
      })
    }
    for (const sample of goldSamples) {
      await ctx.db.insert('coverageRepresentativeSamples', {
        proposalId,
        candidateId: sampleCandidates.get(sample.key)!,
        sourceKind: sample.sourceKind,
        role: sample.role,
        required: true,
        state: 'pending',
        createdAt,
      })
    }
    return { proposalId, created: true }
  },
})

async function ensureJurisdiction(
  ctx: MutationCtx,
  manifest: NonNullable<ReturnType<typeof resolveRootManifest>>,
): Promise<Id<'jurisdictions'>> {
  const existing = await ctx.db
    .query('jurisdictions')
    .withIndex('by_slug', (index) =>
      index.eq('slug', manifest.jurisdictionSlug),
    )
    .unique()
  return (
    existing?._id ??
    (await ctx.db.insert('jurisdictions', {
      name: manifest.jurisdictionName,
      slug: manifest.jurisdictionSlug,
      type: 'parish',
      state: 'LA',
      publicStatus: 'candidate',
    }))
  )
}

async function ensureBody(
  ctx: MutationCtx,
  jurisdictionId: Id<'jurisdictions'>,
  manifest: NonNullable<ReturnType<typeof resolveRootManifest>>,
): Promise<Id<'governmentBodies'>> {
  const existing = await ctx.db
    .query('governmentBodies')
    .withIndex('by_slug', (index) => index.eq('slug', manifest.bodyKey))
    .unique()
  if (existing) {
    await syncCandidateBody(ctx, existing._id, manifest)
    return existing._id
  }
  return await ctx.db.insert('governmentBodies', {
    jurisdictionId,
    name: manifest.bodyName,
    slug: manifest.bodyKey,
    bodyType: bodyTypeFor(manifest.bodyKey),
    officialUrl: manifest.approvedRootUrl,
    publicStatus: 'candidate',
  })
}

async function syncCandidateBody(
  ctx: MutationCtx,
  bodyId: Id<'governmentBodies'>,
  manifest: NonNullable<ReturnType<typeof resolveRootManifest>>,
): Promise<void> {
  const body = await ctx.db.get(bodyId)
  if (!body || body.publicStatus !== 'candidate') return
  if (
    body.name !== manifest.bodyName ||
    body.officialUrl !== manifest.approvedRootUrl
  ) {
    await ctx.db.patch(body._id, {
      name: manifest.bodyName,
      officialUrl: manifest.approvedRootUrl,
    })
  }
}

async function firstPriorRegistry(
  ctx: MutationCtx,
  bodyId: Id<'governmentBodies'>,
  excluding: Id<'sourceRegistries'>,
): Promise<Doc<'sourceRegistries'> | null> {
  const registries = await ctx.db
    .query('sourceRegistries')
    .withIndex('by_body_and_status', (index) =>
      index.eq('governmentBodyId', bodyId),
    )
    .take(20)
  return registries.find((registry) => registry._id !== excluding) ?? null
}

async function ensureGoldCandidates(
  ctx: MutationCtx,
  runId: Id<'coverageCompilerRuns'>,
  stageId: Id<'coverageCompilerStages'>,
  existingCandidates: Array<Doc<'coverageSourceCandidates'>>,
  rootManifest: NonNullable<ReturnType<typeof resolveRootManifest>>,
  samples: ReturnType<typeof coverageGoldSetSamples>,
  expectations: ReturnType<typeof coverageGoldSetExpectations>,
): Promise<Map<string, Id<'coverageSourceCandidates'>>> {
  const candidatesByUrl = new Map(
    existingCandidates.map((candidate) => [candidate.canonicalUrl, candidate]),
  )
  const candidateIds = new Map<string, Id<'coverageSourceCandidates'>>()
  for (const sample of samples) {
    const hostDisposition = classifyHost(rootManifest, sample.url)
    if (hostDisposition === 'unapproved') {
      throw proposalError(
        'gold_set_host_not_approved',
        `The checked sample ${sample.key} left the approved source hosts.`,
      )
    }
    const cadence =
      expectations.find(
        (expectation) => expectation.sourceKind === sample.sourceKind,
      )?.cadence ?? 'unknown'
    const existing = candidatesByUrl.get(sample.url)
    const fields = {
      title: sample.title,
      discoveredFrom: [`coverage-gold-set:${COVERAGE_GOLD_SET_VERSION}`],
      matchedTerms: [sample.sourceKind],
      hostDisposition,
      state: 'classified' as const,
      sourceKind: sample.sourceKind,
      cadence,
      confidence: 1,
      evidenceText: `Checked sample: ${sample.title}`,
      noGuessReason: undefined,
      classifiedAt: Date.now(),
    }
    let candidateId: Id<'coverageSourceCandidates'>
    if (existing) {
      await ctx.db.patch(existing._id, fields)
      candidateId = existing._id
    } else {
      candidateId = await ctx.db.insert('coverageSourceCandidates', {
        runId,
        stageId,
        canonicalUrl: sample.url,
        description: `Required by ${COVERAGE_GOLD_SET_VERSION}.`,
        createdAt: Date.now(),
        ...fields,
      })
    }
    candidateIds.set(sample.key, candidateId)
  }
  return candidateIds
}

function bodyTypeFor(
  bodyKey: string,
): 'city_council' | 'parish_council' | 'planning_commission' | 'other' {
  if (bodyKey.includes('planning')) return 'planning_commission'
  if (
    bodyKey.includes('police-jury') ||
    bodyKey === 'ebr-metropolitan-council'
  ) {
    return 'parish_council'
  }
  if (bodyKey.includes('city-council')) return 'city_council'
  return 'other'
}

function registryDiff(
  prior: Doc<'sourceRegistries'> | null,
  domains: string[],
  seeds: string[],
  kinds: SourceKind[],
): string[] {
  if (!prior) return ['Create a validating registry for this body.']
  const changes: string[] = []
  if (JSON.stringify(prior.officialDomains) !== JSON.stringify(domains)) {
    changes.push('Replace the official-domain set.')
  }
  if (JSON.stringify(prior.seedUrls) !== JSON.stringify(seeds)) {
    changes.push('Replace the source seed set.')
  }
  if (JSON.stringify(prior.sourceKinds) !== JSON.stringify(kinds)) {
    changes.push('Replace the source-kind set.')
  }
  return changes.length > 0 ? changes : ['No registry field changes.']
}

function proposalError(code: string, message: string) {
  return new ConvexError({ code, message })
}
