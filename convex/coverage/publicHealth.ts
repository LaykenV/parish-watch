import { v } from 'convex/values'
import type { QueryCtx, MutationCtx } from '../_generated/server'
import { query } from '../_generated/server'
import { listRootManifests } from './roots'

const bodyView = v.object({ id: v.string(), name: v.string(), state: v.union(v.literal('Supported'), v.literal('Degraded'), v.literal('Paused'), v.literal('Validating sources'), v.literal('Not supported')), sourceKinds: v.array(v.string()), lastSuccessfulCheck: v.optional(v.string()), nextExpectedArtifact: v.optional(v.string()), limitation: v.string(), followAvailable: v.boolean() })
export const regions = query({
  args: {}, returns: v.array(v.object({ name: v.string(), bodies: v.array(bodyView) })),
  handler: async ctx => {
    const regions = new Map<string, { name: string; bodies: Array<typeof bodyView.type> }>()
    for (const manifest of listRootManifests()) {
      const body = await ctx.db.query('governmentBodies').withIndex('by_slug', q => q.eq('slug', manifest.bodyKey)).unique()
      const proposals = await ctx.db.query('coverageRegistryProposals').withIndex('by_body_and_status', q => q.eq('bodyKey', manifest.bodyKey).eq('status', 'promoted')).take(2)
      const proposal = proposals.length === 1 ? proposals[0] : null
      const registry = proposal ? await ctx.db.get(proposal.registryId) : null
      const policy = registry ? await ctx.db.query('sourceMonitoringPolicies').withIndex('by_registry_id', q => q.eq('registryId', registry._id)).unique() : null
      const status = body?.publicStatus === 'paused' ? 'paused' : registry?.status ?? body?.publicStatus ?? 'validating'
      const state = status === 'supported' && proposal ? 'Supported' as const : status === 'degraded' ? 'Degraded' as const : status === 'paused' ? 'Paused' as const : 'Validating sources' as const
      const expectations = registry ? await ctx.db.query('sourceExpectations').withIndex('by_registry_and_source_kind', q => q.eq('registryId', registry._id)).take(30) : []
      const next = expectations.filter(item => item.expectedBy !== undefined).sort((a, b) => a.expectedBy! - b.expectedBy!)[0]
      const nextExpectedArtifact = next ? `${next.sourceKind} expected by ${new Date(next.expectedBy!).toISOString().slice(0, 10)}, based on observed cadence. This is an estimate.` : 'The official sources have not established the next artifact date.'
      const last = policy?.lastCompletedAt ?? registry?.lastHealthyAt
      const limitation = state === 'Supported'
        ? `Coverage includes ${registry?.sourceKinds.join(', ') || 'the approved source types'} for this body. ${policy?.enabled ? 'Scheduled checks are enabled.' : 'An owner currently starts source updates.'} Other bodies and source types are not implied.`
        : state === 'Degraded' ? 'Current decisions may be missing after an incomplete source check. Previously accepted evidence remains available with its dates.'
        : state === 'Paused' ? 'Source monitoring is paused. Previously accepted evidence remains available with its dates.'
        : 'This body has not completed the publication and coverage checks. A reachable source page alone does not establish support.'
      const region = regions.get(manifest.jurisdictionSlug) ?? { name: manifest.jurisdictionName, bodies: [] }
      region.bodies.push({ id: manifest.bodyKey, name: manifest.bodyName, state, sourceKinds: registry?.sourceKinds ?? [], ...(last ? { lastSuccessfulCheck: new Date(last).toISOString() } : {}), nextExpectedArtifact, limitation, followAvailable: state === 'Supported' })
      regions.set(manifest.jurisdictionSlug, region)
    }
    return [...regions.values()]
  },
})

export async function placeIsSupported(ctx: Pick<QueryCtx | MutationCtx, 'db'>, slug: string): Promise<boolean> {
  const place = await ctx.db.query('jurisdictions').withIndex('by_slug', q => q.eq('slug', slug)).unique()
  if (place?.publicStatus !== 'supported') return false
  const required = listRootManifests().filter(manifest => manifest.jurisdictionSlug === slug)
  if (!required.length) return false
  for (const manifest of required) {
    const body = await ctx.db.query('governmentBodies').withIndex('by_slug', q => q.eq('slug', manifest.bodyKey)).unique()
    if (body?.publicStatus !== 'supported') return false
    const proposals = await ctx.db.query('coverageRegistryProposals').withIndex('by_body_and_status', q => q.eq('bodyKey', manifest.bodyKey).eq('status', 'promoted')).take(2)
    if (proposals.length !== 1 || (await ctx.db.get(proposals[0].registryId))?.status !== 'supported') return false
  }
  return true
}
