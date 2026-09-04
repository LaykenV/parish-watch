import { expect, test } from 'vitest'

import { evaluateCoverageGates } from './gates'
import type { CoverageGateInputs } from './gates'

const PASSING: CoverageGateInputs = {
  expectedArtifactCount: 8,
  retrievedArtifactCount: 8,
  officialDomainsOnly: true,
  currentArtifactCount: 4,
  historicalArtifactCount: 4,
  acceptedPublicationCount: 6,
  publicationsWithCompleteCitations: 6,
  unsupportedMaterialFactCount: 0,
  immutableRevisionCount: 1,
  failureHandlingObserved: true,
  expectationCount: 3,
  staleExpectationCount: 0,
  recentReplayPassed: true,
  productionLinkCount: 8,
  passingProductionLinkCount: 8,
}

test('all ten documented coverage gates pass only with complete evidence', () => {
  const results = evaluateCoverageGates(PASSING)
  expect(results).toHaveLength(10)
  expect(results.map((result) => result.gateNumber)).toEqual([
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  ])
  expect(results.every((result) => result.passed)).toBe(true)
})

test.each([
  ['gold set', { retrievedArtifactCount: 7 }, 1],
  ['official domains', { officialDomainsOnly: false }, 2],
  ['history', { historicalArtifactCount: 0 }, 3],
  ['citations', { publicationsWithCompleteCitations: 5 }, 4],
  ['unsupported fact', { unsupportedMaterialFactCount: 1 }, 5],
  ['revision', { immutableRevisionCount: 0 }, 6],
  ['failure handling', { failureHandlingObserved: false }, 7],
  ['schedule', { expectationCount: 0 }, 8],
  ['stale schedule', { staleExpectationCount: 1 }, 8],
  ['replay', { recentReplayPassed: false }, 9],
  ['production links', { passingProductionLinkCount: 7 }, 10],
] as const)(
  'the %s requirement independently blocks gate %s',
  (_, change, gateNumber) => {
    const results = evaluateCoverageGates({ ...PASSING, ...change })
    expect(
      results
        .filter((result) => !result.passed)
        .map((result) => result.gateNumber),
    ).toEqual([gateNumber])
  },
)

test('development link proof is named separately from the production gate', () => {
  const dev = evaluateCoverageGates({ ...PASSING, linkDeployment: 'development' })[9]
  expect(dev.gateKey).toBe('development_source_urls_reachable')
  expect(dev.detail).toContain('development backend')
  const prod = evaluateCoverageGates(PASSING)[9]
  expect(prod.gateKey).toBe('production_source_urls_reachable')
  expect(prod.detail).toContain('production backend')
})
