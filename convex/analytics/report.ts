import { v } from 'convex/values'

import { internalQuery } from '../_generated/server'
import { ANALYTICS_SCOPE, emptyAreaCounts } from './contracts'

const areaCounts = v.object({
  lafayetteParish: v.number(),
  eastBatonRougeParish: v.number(),
  rapidesParish: v.number(),
})

export const summary = internalQuery({
  args: {},
  returns: v.object({
    startedAt: v.union(v.number(), v.null()),
    updatedAt: v.union(v.number(), v.null()),
    uniqueVisitors: v.number(),
    visits: v.number(),
    activatedVisitors: v.number(),
    activationRatePercent: v.number(),
    returningVisitors: v.number(),
    areaSelections: v.number(),
    firstSelectionsByArea: areaCounts,
    selectionsByArea: areaCounts,
  }),
  handler: async (ctx) => {
    const counters = await ctx.db
      .query('analyticsCounters')
      .withIndex('by_scope', (q) => q.eq('scope', ANALYTICS_SCOPE))
      .unique()
    if (!counters) {
      return {
        startedAt: null,
        updatedAt: null,
        uniqueVisitors: 0,
        visits: 0,
        activatedVisitors: 0,
        activationRatePercent: 0,
        returningVisitors: 0,
        areaSelections: 0,
        firstSelectionsByArea: emptyAreaCounts(),
        selectionsByArea: emptyAreaCounts(),
      }
    }

    return {
      startedAt: counters.startedAt,
      updatedAt: counters.updatedAt,
      uniqueVisitors: counters.uniqueVisitors,
      visits: counters.visits,
      activatedVisitors: counters.activatedVisitors,
      activationRatePercent:
        counters.uniqueVisitors === 0
          ? 0
          : Math.round(
              (counters.activatedVisitors / counters.uniqueVisitors) * 1000,
            ) / 10,
      returningVisitors: counters.returningVisitors,
      areaSelections: counters.areaSelections,
      firstSelectionsByArea: counters.firstSelectionsByArea,
      selectionsByArea: counters.selectionsByArea,
    }
  },
})
