import { v } from 'convex/values'

export const searchEntry = v.object({
  key: v.string(), kind: v.union(v.literal('decision'), v.literal('issue'), v.literal('meeting'), v.literal('body')),
  revision: v.string(), href: v.string(), title: v.string(), summary: v.string(),
  bodyName: v.string(), placeName: v.string(), placeSlug: v.string(), mode: v.union(v.literal('full'), v.literal('limited')),
  lifecycle: v.string(), topics: v.array(v.string()), date: v.union(v.string(), v.null()), dateAt: v.number(),
  checkedAt: v.number(), searchText: v.string(),
})
export const publicSearchEntry = searchEntry.omit('searchText')
export type SearchEntry = typeof publicSearchEntry.type
