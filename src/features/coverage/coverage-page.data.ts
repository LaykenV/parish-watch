import type {
  CoverageRegion,
  CoverageRequestScenario,
  CoverageScenario,
} from './contracts'
import { getActiveCoverageFixture } from './contracts'

export type CoveragePageData = {
  available: boolean
  regions: CoverageRegion[]
  scenario?: CoverageScenario
}

export type CoverageRequestPageData = {
  available: boolean
  scenario?: CoverageRequestScenario
}

export async function loadCoveragePageData(
  scenario: CoverageScenario | undefined,
): Promise<CoveragePageData> {
  const active = getActiveCoverageFixture(scenario)
  if (!active) return { available: false, regions: [] }

  const { COVERAGE_REGION_FIXTURES } = await import('./fixtures')
  const regions = structuredClone(COVERAGE_REGION_FIXTURES)

  if (active === 'degraded') {
    const cityCouncil = regions[0]?.bodies.find(
      (body) => body.id === 'lafayette-city-council',
    )
    if (cityCouncil) {
      cityCouncil.state = 'Degraded'
      cityCouncil.nextExpectedArtifact = 'Minutes, now overdue'
      cityCouncil.limitation =
        'The expected minutes have not appeared. The last accepted records stay visible with their dates.'
    }
  }

  return { available: true, regions, scenario: active }
}

export async function loadCoverageRequestPageData(
  scenario: CoverageRequestScenario | undefined,
): Promise<CoverageRequestPageData> {
  const active = getActiveCoverageFixture(scenario)
  return active ? { available: true, scenario: active } : { available: false }
}
