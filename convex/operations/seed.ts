import { v } from 'convex/values'

import type { Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'
import { internalMutation } from '../_generated/server'

const LAUNCH_REGISTRIES = [
  {
    jurisdiction: {
      name: 'Lafayette Parish',
      slug: 'lafayette-parish',
    },
    body: {
      name: 'Lafayette City Council',
      slug: 'lafayette-city-council',
      bodyType: 'city_council',
      officialUrl:
        'https://www.lafayettela.gov/your-government/city-and-parish-councils/',
    },
    registry: {
      officialDomains: ['lafayettela.gov', 'apps.lafayettela.gov'],
      seedUrls: [
        'https://www.lafayettela.gov/your-government/city-and-parish-councils/',
        'https://apps.lafayettela.gov/obcouncil/index.html',
        'https://www.lafayettela.gov/your-government/city-and-parish-councils/schedule-research-ord-reso/',
      ],
      sourceKinds: ['agenda', 'minutes', 'ordinance', 'resolution'],
      expectedWeekdays: [2],
      initialStatus: 'validating',
    },
  },
  {
    jurisdiction: {
      name: 'Rapides Parish',
      slug: 'rapides-parish',
    },
    body: {
      name: 'Rapides Parish Police Jury',
      slug: 'rapides-parish-police-jury',
      bodyType: 'parish_council',
      officialUrl: 'https://rppj.com/',
    },
    registry: {
      officialDomains: ['rppj.com'],
      seedUrls: ['https://rppj.com/agendas/'],
      sourceKinds: ['agenda', 'minutes', 'packet', 'ordinance', 'resolution'],
      expectedWeekdays: [1],
      initialStatus: 'candidate',
    },
  },
  {
    jurisdiction: {
      name: 'East Baton Rouge Parish',
      slug: 'east-baton-rouge-parish',
    },
    body: {
      name: 'Metropolitan Council of the Parish of East Baton Rouge and the City of Baton Rouge',
      slug: 'ebr-metropolitan-council',
      bodyType: 'parish_council',
      officialUrl: 'https://www.brla.gov/AgendaCenter',
    },
    registry: {
      officialDomains: ['brla.gov'],
      seedUrls: ['https://www.brla.gov/AgendaCenter'],
      sourceKinds: ['agenda', 'minutes', 'ordinance', 'resolution'],
      expectedWeekdays: [3],
      initialStatus: 'candidate',
    },
  },
] as const

type LaunchRegistryConfig = (typeof LAUNCH_REGISTRIES)[number]

async function seedRegistry(
  ctx: MutationCtx,
  config: LaunchRegistryConfig,
): Promise<{
  jurisdictionId: Id<'jurisdictions'>
  bodyId: Id<'governmentBodies'>
  registryId: Id<'sourceRegistries'>
}> {
  const existingJurisdiction = await ctx.db
    .query('jurisdictions')
    .withIndex('by_slug', (q) => q.eq('slug', config.jurisdiction.slug))
    .unique()
  const jurisdictionId =
    existingJurisdiction?._id ??
    (await ctx.db.insert('jurisdictions', {
      name: config.jurisdiction.name,
      slug: config.jurisdiction.slug,
      type: 'parish',
      state: 'LA',
      publicStatus: 'candidate',
    }))

  const existingBody = await ctx.db
    .query('governmentBodies')
    .withIndex('by_slug', (q) => q.eq('slug', config.body.slug))
    .unique()
  const bodyId =
    existingBody?._id ??
    (await ctx.db.insert('governmentBodies', {
      jurisdictionId,
      name: config.body.name,
      slug: config.body.slug,
      bodyType: config.body.bodyType,
      officialUrl: config.body.officialUrl,
      publicStatus: 'candidate',
    }))

  const registries = await ctx.db
    .query('sourceRegistries')
    .withIndex('by_body_and_status', (q) => q.eq('governmentBodyId', bodyId))
    .take(30)
  const protectedRegistry =
    registries.find((registry) => registry.status === 'supported') ??
    registries.find((registry) => registry.status === 'degraded') ??
    registries.find((registry) => registry.status === 'paused')
  const firstRegistry = registries.find((_registry, index) => index === 0)
  const existingSeedRegistry =
    registries.length === 1 &&
    firstRegistry !== undefined &&
    (firstRegistry.status === 'candidate' ||
      firstRegistry.status === 'validating')
      ? firstRegistry
      : null
  const retainedRegistry =
    protectedRegistry ?? existingSeedRegistry ?? firstRegistry
  const registryFields = {
    officialDomains: [...config.registry.officialDomains],
    seedUrls: [...config.registry.seedUrls],
    sourceKinds: [...config.registry.sourceKinds],
    expectedCadence: {
      kind: 'meeting_cycle' as const,
      expectedWeekdays: [...config.registry.expectedWeekdays],
    },
    discoveryMode: 'dynamic' as const,
  }
  const registryId = retainedRegistry
    ? retainedRegistry._id
    : await ctx.db.insert('sourceRegistries', {
        governmentBodyId: bodyId,
        ...registryFields,
        status: config.registry.initialStatus,
      })
  if (existingSeedRegistry) {
    await ctx.db.patch(registryId, registryFields)
  }

  return { jurisdictionId, bodyId, registryId }
}

export const seedLaunchCoverage = internalMutation({
  args: {},
  returns: v.object({
    jurisdictionId: v.id('jurisdictions'),
    bodyId: v.id('governmentBodies'),
    registryId: v.id('sourceRegistries'),
  }),
  handler: async (ctx) => {
    const lafayette = await seedRegistry(ctx, LAUNCH_REGISTRIES[0])
    for (const config of LAUNCH_REGISTRIES.slice(1)) {
      await seedRegistry(ctx, config)
    }
    return lafayette
  },
})
