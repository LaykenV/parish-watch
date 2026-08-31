import { v } from 'convex/values'

import { internal } from '../_generated/api'
import { internalMutation } from '../_generated/server'

const BATCH_SIZE = 100

export const removeExpiredTelemetry = internalMutation({
  args: {},
  returns: v.object({
    deletedEvents: v.number(),
    deletedSubjects: v.number(),
    continued: v.boolean(),
  }),
  handler: async (ctx) => {
    const now = Date.now()
    const events = await ctx.db
      .query('analyticsEvents')
      .withIndex('by_expires_at', (q) => q.lte('expiresAt', now))
      .take(BATCH_SIZE)
    for (const event of events)
      await ctx.db.delete('analyticsEvents', event._id)

    const subjects =
      events.length === BATCH_SIZE
        ? []
        : await ctx.db
            .query('analyticsSubjects')
            .withIndex('by_expires_at', (q) => q.lte('expiresAt', now))
            .take(BATCH_SIZE)
    for (const subject of subjects) {
      await ctx.db.delete('analyticsSubjects', subject._id)
    }

    const continued =
      events.length === BATCH_SIZE || subjects.length === BATCH_SIZE
    if (continued) {
      await ctx.scheduler.runAfter(
        0,
        internal.analytics.retention.removeExpiredTelemetry,
        {},
      )
    }
    return {
      deletedEvents: events.length,
      deletedSubjects: subjects.length,
      continued,
    }
  },
})
