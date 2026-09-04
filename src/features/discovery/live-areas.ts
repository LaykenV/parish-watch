import { useQuery } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'

import { api } from '../../../convex/_generated/api'
import type { AreaRecord } from './contracts'
import { AREA_FIXTURES } from './fixtures'

type CoverageArea = FunctionReturnType<
  typeof api.resident.discovery.listCoverageAreas
>[number]

export function useCoverageAreas(): AreaRecord[] {
  return toAreaRecords(useQuery(api.resident.discovery.listCoverageAreas))
}

export function toAreaRecords(
  coverage: CoverageArea[] | undefined,
): AreaRecord[] {
  const statusBySlug = new Map(
    coverage?.map((area) => [area.slug, area.status] as const) ?? [],
  )
  return AREA_FIXTURES.map((area) => {
    const status = statusBySlug.get(area.slug) ?? 'validating'
    return {
      ...area,
      status,
      note:
        status === 'available'
          ? 'Every launch body in this parish passed the publication and coverage gates.'
          : 'This area opens after every launch body passes the same evidence gate.',
    }
  })
}
