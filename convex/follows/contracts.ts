import type { Infer } from 'convex/values'
import { v } from 'convex/values'

export const AREA_SLUGS = [
  'lafayette-parish',
  'east-baton-rouge-parish',
  'rapides-parish',
] as const

export const TOPIC_SLUGS = [
  'public-money',
  'public-assets',
  'public-safety',
  'housing',
  'drainage',
  'land-use',
] as const

export const areaSlug = v.union(
  v.literal('lafayette-parish'),
  v.literal('east-baton-rouge-parish'),
  v.literal('rapides-parish'),
)

export const topicSlug = v.union(
  v.literal('public-money'),
  v.literal('public-assets'),
  v.literal('public-safety'),
  v.literal('housing'),
  v.literal('drainage'),
  v.literal('land-use'),
)

export type AreaSlug = Infer<typeof areaSlug>
export type TopicSlug = Infer<typeof topicSlug>
