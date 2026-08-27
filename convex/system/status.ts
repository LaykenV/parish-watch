import { v } from 'convex/values'

import { query } from '../_generated/server'

export const readiness = query({
  args: {},
  returns: v.object({
    application: v.literal('Public Parish'),
    backend: v.literal('convex'),
    state: v.literal('ready'),
  }),
  handler: () => ({
    application: 'Public Parish' as const,
    backend: 'convex' as const,
    state: 'ready' as const,
  }),
})
