import { v } from 'convex/values'

import { internalMutation } from '../_generated/server'

// A 24-hour session can overlap two randomized daily limiter windows. Each
// allows 20 requests, producing at most 40 short-window rows and 2 daily rows.
const MAX_TOKEN_WINDOWS_PER_SESSION = 42

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
    const tokenWindows = await ctx.db
      .query('askTokenWindows')
      .withIndex('by_session_kind_and_window', (q) =>
        q.eq('sessionId', session._id),
      )
      .take(MAX_TOKEN_WINDOWS_PER_SESSION)
    for (const window of tokenWindows) await ctx.db.delete(window._id)
    await ctx.db.patch(session._id, { state: 'expired' })
    return null
  },
})
