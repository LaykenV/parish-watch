import { v } from 'convex/values'

import { mutation, query } from '../_generated/server'
import { requireUser } from '../auth/authorization'
import { AREA_SLUGS, areaSlug, TOPIC_SLUGS, topicSlug } from './contracts'
import type { AreaSlug, TopicSlug } from './contracts'

const currentSavedSetup = v.object({
  areas: v.array(areaSlug),
  topics: v.array(topicSlug),
})

const createdResult = v.object({ created: v.boolean() })
const removedResult = v.object({ removed: v.boolean() })

export const current = query({
  args: {},
  returns: currentSavedSetup,
  handler: async (ctx) => {
    const user = await requireUser(ctx)
    const [areas, topics] = await Promise.all([
      ctx.db
        .query('savedAreas')
        .withIndex('by_user_id', (index) => index.eq('userId', user._id))
        .take(AREA_SLUGS.length),
      ctx.db
        .query('savedTopics')
        .withIndex('by_user_id', (index) => index.eq('userId', user._id))
        .take(TOPIC_SLUGS.length),
    ])
    return {
      areas: sortByContract(
        areas.map((saved) => saved.area),
        AREA_SLUGS,
      ),
      topics: sortByContract(
        topics.map((saved) => saved.topic),
        TOPIC_SLUGS,
      ),
    }
  },
})

export const saveArea = mutation({
  args: { area: areaSlug },
  returns: createdResult,
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    const existing = await ctx.db
      .query('savedAreas')
      .withIndex('by_user_id_and_area', (index) =>
        index.eq('userId', user._id).eq('area', args.area),
      )
      .unique()
    if (existing !== null) return { created: false }

    await ctx.db.insert('savedAreas', {
      userId: user._id,
      area: args.area,
      createdAt: Date.now(),
    })
    return { created: true }
  },
})

export const removeArea = mutation({
  args: { area: areaSlug },
  returns: removedResult,
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    const existing = await ctx.db
      .query('savedAreas')
      .withIndex('by_user_id_and_area', (index) =>
        index.eq('userId', user._id).eq('area', args.area),
      )
      .unique()
    if (existing === null) return { removed: false }

    await ctx.db.delete('savedAreas', existing._id)
    return { removed: true }
  },
})

export const saveTopic = mutation({
  args: { topic: topicSlug },
  returns: createdResult,
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    const existing = await ctx.db
      .query('savedTopics')
      .withIndex('by_user_id_and_topic', (index) =>
        index.eq('userId', user._id).eq('topic', args.topic),
      )
      .unique()
    if (existing !== null) return { created: false }

    await ctx.db.insert('savedTopics', {
      userId: user._id,
      topic: args.topic,
      createdAt: Date.now(),
    })
    return { created: true }
  },
})

export const removeTopic = mutation({
  args: { topic: topicSlug },
  returns: removedResult,
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    const existing = await ctx.db
      .query('savedTopics')
      .withIndex('by_user_id_and_topic', (index) =>
        index.eq('userId', user._id).eq('topic', args.topic),
      )
      .unique()
    if (existing === null) return { removed: false }

    await ctx.db.delete('savedTopics', existing._id)
    return { removed: true }
  },
})

function sortByContract<T extends AreaSlug | TopicSlug>(
  values: T[],
  contract: readonly T[],
): T[] {
  const positions = new Map(contract.map((value, index) => [value, index]))
  return values.sort(
    (left, right) => positions.get(left)! - positions.get(right)!,
  )
}
