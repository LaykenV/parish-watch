import { v } from 'convex/values'

import { internalMutation } from '../_generated/server'

export const expireSession = internalMutation({
  args: {
    sessionId: v.id('anonymousSessions'),
    expectedExpiresAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId)
    if (
      !session ||
      session.state !== 'active' ||
      session.expiresAt !== args.expectedExpiresAt
    ) {
      return null
    }

    const mappings = await ctx.db
      .query('askThreadAccess')
      .withIndex('by_session_and_last_activity_at', (q) =>
        q.eq('sessionId', session._id),
      )
      .take(21)
    const detachedAt = Date.now()
    for (const mapping of mappings) {
      if (!mapping.detachedAt) await ctx.db.patch(mapping._id, { detachedAt })
    }
    await ctx.db.patch(session._id, { state: 'expired' })
    return null
  },
})
