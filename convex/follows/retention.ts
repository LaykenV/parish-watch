import { v } from 'convex/values'

import { components, internal } from '../_generated/api'
import { internalMutation } from '../_generated/server'

const BATCH_SIZE = 100

export const removeExpiredChallenges = internalMutation({
  args: {},
  returns: v.object({ deleted: v.number(), continued: v.boolean() }),
  handler: async (ctx) => {
    const expired = await ctx.db
      .query('emailVerificationChallenges')
      .withIndex('by_expires_at', (index) => index.lte('expiresAt', Date.now()))
      .take(BATCH_SIZE)
    for (const challenge of expired) {
      await ctx.db.delete('emailVerificationChallenges', challenge._id)
    }
    const continued = expired.length === BATCH_SIZE
    if (continued) {
      await ctx.scheduler.runAfter(
        0,
        internal.follows.retention.removeExpiredChallenges,
        {},
      )
    }
    return { deleted: expired.length, continued }
  },
})

export const removeFinalizedAgentMailPayloads = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await ctx.runMutation(components.agentmail.lib.cleanupFinalizedOutbound, {})
    return null
  },
})
