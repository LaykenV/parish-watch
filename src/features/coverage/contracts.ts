export const COVERAGE_SCENARIOS = ['preview', 'degraded'] as const
export const COVERAGE_REQUEST_SCENARIOS = [
  'new',
  'duplicate',
  'notice-failure',
  'rate-limited',
] as const

export type CoverageScenario = (typeof COVERAGE_SCENARIOS)[number]
export type CoverageRequestScenario =
  (typeof COVERAGE_REQUEST_SCENARIOS)[number]

export type CoverageState =
  'Supported' | 'Degraded' | 'Validating sources' | 'Paused' | 'Not supported'

export type CoverageBody = {
  id: string
  name: string
  state: CoverageState
  sourceKinds: string[]
  lastSuccessfulCheck?: string
  nextExpectedArtifact?: string
  limitation: string
  followAvailable: boolean
}

export type CoverageRegion = {
  name: string
  bodies: CoverageBody[]
}

function pick<T extends string>(
  value: unknown,
  options: readonly T[],
): T | undefined {
  return typeof value === 'string' &&
    (options as readonly string[]).includes(value)
    ? (value as T)
    : undefined
}

export function parseCoverageSearch(search: Record<string, unknown>): {
  fixture?: CoverageScenario
} {
  return { fixture: pick(search.fixture, COVERAGE_SCENARIOS) }
}

export function parseCoverageRequestSearch(search: Record<string, unknown>): {
  fixture?: CoverageRequestScenario
} {
  return {
    fixture: pick(search.fixture, COVERAGE_REQUEST_SCENARIOS),
  }
}

export function getActiveCoverageFixture<T extends string>(
  scenario: T | undefined,
): T | undefined {
  return import.meta.env.DEV && scenario ? scenario : undefined
}

export function coverageStateDescription(state: CoverageState): string {
  switch (state) {
    case 'Supported':
      return 'The body passed the common source and evidence checks.'
    case 'Degraded':
      return 'Dated accepted records remain visible, but current decisions may be missing.'
    case 'Validating sources':
      return 'Public Parish is checking the body against the same coverage gate.'
    case 'Paused':
      return 'Monitoring stopped until a known source problem is resolved.'
    case 'Not supported':
      return 'This body has not passed the coverage gate.'
  }
}
