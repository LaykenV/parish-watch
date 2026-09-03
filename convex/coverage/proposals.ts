import { ConvexError, v } from 'convex/values'

import type { Doc, Id } from '../_generated/dataModel'
import { mutation } from '../_generated/server'
import type { MutationCtx } from '../_generated/server'
import { requireOwner } from '../auth/authorization'
import type { SourceKind } from '../pipeline/state'
import { sha256HexOfText } from '../sources/hashing'
import { COVERAGE_EVALUATOR_VERSION, COVERAGE_GOLD_SET_VERSION } from './gates'
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
    if (
      !run ||
      run.state !== 'succeeded' ||
      run.currentStage !== 'classify_sources'
    ) {
      throw proposalError(
        'run_not_classified',
        'A proposal needs a completed source-classification run.',
      )
    }
    const existing = await ctx.db
      .query('coverageRegistryProposals')
      .withIndex('by_run_and_version', (index) => index.eq('runId', run._id))
      .order('desc')
      .first()
    if (existing && existing.status !== 'superseded') {
      return { proposalId: existing._id, created: false }
    }

    const manifest = resolveRootManifest(run.bodyKey, run.rootManifestVersion)
    if (!manifest) {
      throw proposalError(
        'manifest_missing',
        'The checked root manifest for this run no longer exists.',
      )
    }
    const candidates = await ctx.db
      .query('coverageSourceCandidates')
      .withIndex('by_run_and_url', (index) => index.eq('runId', run._id))
      .take(100)
    const classified = candidates.filter(
      (candidate) =>
        candidate.state === 'classified' &&
        candidate.sourceKind !== undefined &&
        candidate.sourceKind !== 'unknown',
    )
    if (classified.length === 0) {
      throw proposalError(
        'no_classified_sources',
        'No classified official sources are available for a proposal.',
      )
    }

    const jurisdictionId = await ensureJurisdiction(ctx, manifest)
    const governmentBodyId = await ensureBody(ctx, jurisdictionId, manifest)
    const proposedSourceKinds = uniqueSourceKinds(classified)
    const proposedSeedUrls = classified
      .filter((candidate) => candidate.hostDisposition === 'approved')
      .map((candidate) => candidate.canonicalUrl)
      .slice(0, MAX_PROPOSAL_SEEDS)
    if (proposedSeedUrls.length === 0) {
      throw proposalError(
        'no_official_seeds',
        'Every classified source is still on a quarantined document host.',
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

    for (const kind of proposedSourceKinds) {
      const candidate = classified.find(
        (entry) => normalizeSourceKind(entry.sourceKind) === kind,
      )
      await ctx.db.insert('sourceExpectations', {
        proposalId,
        registryId,
        sourceKind: kind,
        cadence: cadenceFor(candidate?.cadence),
        basis: 'inferred',
        createdAt,
      })
    }
    for (const sample of selectSamples(candidates, manifest.bodyKey)) {
      await ctx.db.insert('coverageRepresentativeSamples', {
        proposalId,
        ...(sample.candidate ? { candidateId: sample.candidate._id } : {}),
        sourceKind: sample.sourceKind,
        role: sample.role,
        required: true,
        state: sample.candidate ? 'pending' : 'failed_terminal',
        ...(sample.candidate
          ? {}
          : { errorClass: 'missing_required_candidate' }),
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
  if (existing) return existing._id
  return await ctx.db.insert('governmentBodies', {
    jurisdictionId,
    name: manifest.bodyName,
    slug: manifest.bodyKey,
    bodyType: bodyTypeFor(manifest.bodyKey),
    officialUrl: manifest.approvedRootUrl,
    publicStatus: 'candidate',
  })
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

function uniqueSourceKinds(
  candidates: Array<Doc<'coverageSourceCandidates'>>,
): SourceKind[] {
  return [
    ...new Set(
      candidates
        .map((candidate) => normalizeSourceKind(candidate.sourceKind))
        .filter((kind): kind is SourceKind => kind !== null),
    ),
  ].sort()
}

function normalizeSourceKind(
  kind: Doc<'coverageSourceCandidates'>['sourceKind'],
): SourceKind | null {
  if (!kind || kind === 'unknown') return null
  if (kind === 'zoning_case') return 'planning_case'
  return kind
}

function cadenceFor(
  cadence: Doc<'coverageSourceCandidates'>['cadence'],
): 'daily' | 'weekly' | 'monthly' | 'meeting_cycle' | 'unknown' {
  if (
    cadence === 'weekly' ||
    cadence === 'monthly' ||
    cadence === 'meeting_cycle'
  )
    return cadence
  return 'unknown'
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

function selectSamples(
  candidates: Array<Doc<'coverageSourceCandidates'>>,
  bodyKey: string,
) {
  const selected: Array<{
    candidate?: Doc<'coverageSourceCandidates'>
    sourceKind: SourceKind
    role: 'current' | 'historical' | 'revision' | 'negative'
  }> = []
  const used = new Set<Id<'coverageSourceCandidates'>>()
  const take = (kinds: SourceKind[]) => {
    const candidate = candidates.find(
      (entry) =>
        entry.state === 'classified' &&
        !used.has(entry._id) &&
        kinds.includes(normalizeSourceKind(entry.sourceKind) ?? 'other'),
    )
    if (candidate) used.add(candidate._id)
    return candidate
  }
  selected.push(
    {
      candidate: take(['agenda', 'packet']),
      sourceKind: 'agenda',
      role: 'current',
    },
    {
      candidate: take(['agenda', 'packet']),
      sourceKind: 'agenda',
      role: 'current',
    },
    {
      candidate: take(['minutes']),
      sourceKind: 'minutes',
      role: 'current',
    },
    {
      candidate: take(['minutes']),
      sourceKind: 'minutes',
      role: 'historical',
    },
    {
      candidate: take(['ordinance', 'resolution']),
      sourceKind: 'resolution',
      role: 'current',
    },
  )
  const revision = candidates.find(
    (candidate) =>
      !used.has(candidate._id) &&
      /revis|amend|cancel|postpon|previous/i.test(
        `${candidate.canonicalUrl} ${candidate.title ?? ''}`,
      ),
  )
  if (revision) used.add(revision._id)
  selected.push({
    candidate: revision,
    sourceKind: 'other',
    role: 'revision',
  })
  const uncertain = candidates.find(
    (candidate) => candidate.state === 'uncertain',
  )
  selected.push({
    candidate: uncertain,
    sourceKind: 'other',
    role: 'negative',
  })
  if (
    bodyKey.includes('planning') ||
    bodyKey.includes('zoning') ||
    bodyKey.includes('hearing-examiner')
  ) {
    selected.push(
      {
        candidate: take(['planning_case']),
        sourceKind: 'planning_case',
        role: 'current',
      },
      {
        candidate: take(['planning_case']),
        sourceKind: 'planning_case',
        role: 'historical',
      },
    )
  }
  return selected
}

function proposalError(code: string, message: string) {
  return new ConvexError({ code, message })
}
