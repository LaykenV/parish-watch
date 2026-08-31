import { v } from 'convex/values'

export const analyticsAreaSlug = v.union(
  v.literal('lafayette-parish'),
  v.literal('east-baton-rouge-parish'),
  v.literal('rapides-parish'),
)

export type AnalyticsAreaSlug = typeof analyticsAreaSlug.type

export const ANALYTICS_SCOPE = 'production' as const
export const ANALYTICS_VISIT_WINDOW_MS = 30 * 60 * 1000
export const ANALYTICS_RETURN_WINDOW_MS = 24 * 60 * 60 * 1000
export const ANALYTICS_RETENTION_MS = 90 * 24 * 60 * 60 * 1000

export type AnalyticsAreaCounts = {
  lafayetteParish: number
  eastBatonRougeParish: number
  rapidesParish: number
}

export function emptyAreaCounts(): AnalyticsAreaCounts {
  return {
    lafayetteParish: 0,
    eastBatonRougeParish: 0,
    rapidesParish: 0,
  }
}

export function incrementAreaCount(
  counts: AnalyticsAreaCounts,
  areaSlug: AnalyticsAreaSlug,
): AnalyticsAreaCounts {
  switch (areaSlug) {
    case 'lafayette-parish':
      return { ...counts, lafayetteParish: counts.lafayetteParish + 1 }
    case 'east-baton-rouge-parish':
      return {
        ...counts,
        eastBatonRougeParish: counts.eastBatonRougeParish + 1,
      }
    case 'rapides-parish':
      return { ...counts, rapidesParish: counts.rapidesParish + 1 }
  }
}
