import { v } from 'convex/values'

import { internalMutation } from '../_generated/server'

const LAFAYETTE_COUNCIL_HUB_URL =
  'https://www.lafayettela.gov/your-government/city-and-parish-councils/'
const LAFAYETTE_OFFICIAL_DOMAINS = ['lafayettela.gov', 'apps.lafayettela.gov']

export const seedLaunchCoverage = internalMutation({
  args: {},
  returns: v.object({
    jurisdictionId: v.id('jurisdictions'),
    bodyId: v.id('governmentBodies'),
    registryId: v.id('sourceRegistries'),
  }),
  handler: async (ctx) => {
    const existingJurisdiction = await ctx.db
      .query('jurisdictions')
      .withIndex('by_slug', (q) => q.eq('slug', 'lafayette-parish'))
      .unique()
    const jurisdictionId =
      existingJurisdiction?._id ??
      (await ctx.db.insert('jurisdictions', {
        name: 'Lafayette Parish',
        slug: 'lafayette-parish',
        type: 'parish',
        state: 'LA',
        publicStatus: 'candidate',
      }))

    const existingBody = await ctx.db
      .query('governmentBodies')
      .withIndex('by_slug', (q) => q.eq('slug', 'lafayette-city-council'))
      .unique()
    const bodyId =
      existingBody?._id ??
      (await ctx.db.insert('governmentBodies', {
        jurisdictionId,
        name: 'Lafayette City Council',
        slug: 'lafayette-city-council',
        bodyType: 'city_council',
        officialUrl: LAFAYETTE_COUNCIL_HUB_URL,
        publicStatus: 'candidate',
      }))

    const existingRegistry = await ctx.db
      .query('sourceRegistries')
      .withIndex('by_body_and_status', (q) => q.eq('governmentBodyId', bodyId))
      .first()
    const registryId =
      existingRegistry?._id ??
      (await ctx.db.insert('sourceRegistries', {
        governmentBodyId: bodyId,
        officialDomains: LAFAYETTE_OFFICIAL_DOMAINS,
        seedUrls: [LAFAYETTE_COUNCIL_HUB_URL],
        sourceKinds: ['agenda', 'minutes', 'ordinance', 'resolution'],
        expectedCadence: {
          kind: 'meeting_cycle',
          expectedWeekdays: [2],
        },
        discoveryMode: 'dynamic',
        status: 'validating',
      }))

    return { jurisdictionId, bodyId, registryId }
  },
})
