import { v } from 'convex/values'

import type { Doc } from '../_generated/dataModel'
import { internalQuery } from '../_generated/server'
import schema from '../schema'

export const get = internalQuery({
  args: { registryId: v.id('sourceRegistries') },
  returns: v.union(v.null(), schema.doc('sourceRegistries')),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.registryId)
  },
})

export const getForBodySlug = internalQuery({
  args: { bodySlug: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      registry: schema.doc('sourceRegistries'),
      body: schema.doc('governmentBodies'),
    }),
  ),
  handler: async (ctx, args) => {
    const body = await ctx.db
      .query('governmentBodies')
      .withIndex('by_slug', (q) => q.eq('slug', args.bodySlug))
      .unique()
    if (!body) {
      return null
    }
    let registry: Doc<'sourceRegistries'> | null = null
    for (const status of [
      'supported',
      'degraded',
      'validating',
      'candidate',
      'paused',
    ] as const) {
      registry = await ctx.db
        .query('sourceRegistries')
        .withIndex('by_body_and_status', (q) =>
          q.eq('governmentBodyId', body._id).eq('status', status),
        )
        .first()
      if (registry) break
    }
    if (!registry) {
      return null
    }
    return { registry, body }
  },
})
