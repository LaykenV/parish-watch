export const COVERAGE_EVALUATOR_VERSION = 'coverage-gates-v1'
export const COVERAGE_GOLD_SET_VERSION = 'launch-bodies-v1'

export type CoverageGateInputs = {
  expectedArtifactCount: number
  retrievedArtifactCount: number
  officialDomainsOnly: boolean
  currentArtifactCount: number
  historicalArtifactCount: number
  acceptedPublicationCount: number
  publicationsWithCompleteCitations: number
  unsupportedMaterialFactCount: number
  immutableRevisionCount: number
  failureHandlingObserved: boolean
  expectationCount: number
  recentReplayPassed: boolean
  productionLinkCount: number
  passingProductionLinkCount: number
}

export type CoverageGateResult = {
  gateNumber: number
  gateKey: string
  passed: boolean
  detail: string
  evidenceRefs: string[]
}

export function evaluateCoverageGates(
  input: CoverageGateInputs,
): CoverageGateResult[] {
  return [
    gate(
      1,
      'gold_set_complete',
      input.expectedArtifactCount > 0 &&
        input.retrievedArtifactCount === input.expectedArtifactCount,
      `${input.retrievedArtifactCount} of ${input.expectedArtifactCount} required artifacts were retrieved.`,
      ['coverageRepresentativeSamples'],
    ),
    gate(
      2,
      'official_domains_only',
      input.officialDomainsOnly,
      input.officialDomainsOnly
        ? 'Every proposed source stays on a checked official host.'
        : 'One or more proposed sources left the checked official hosts.',
      ['coverageSourceCandidates', 'coverageRootManifests'],
    ),
    gate(
      3,
      'current_and_historical_separated',
      input.currentArtifactCount > 0 && input.historicalArtifactCount > 0,
      `${input.currentArtifactCount} current and ${input.historicalArtifactCount} historical artifacts were identified.`,
      ['coverageRepresentativeSamples'],
    ),
    gate(
      4,
      'accepted_facts_cited',
      input.acceptedPublicationCount > 0 &&
        input.publicationsWithCompleteCitations ===
          input.acceptedPublicationCount,
      `${input.publicationsWithCompleteCitations} of ${input.acceptedPublicationCount} accepted publications have complete citations.`,
      ['publicationVersions', 'citations'],
    ),
    gate(
      5,
      'no_unsupported_material_facts',
      input.acceptedPublicationCount > 0 &&
        input.unsupportedMaterialFactCount === 0,
      `${input.unsupportedMaterialFactCount} unsupported material facts remain.`,
      ['reviewChecks'],
    ),
    gate(
      6,
      'revisions_immutable',
      input.immutableRevisionCount > 0,
      `${input.immutableRevisionCount} immutable source revision checks passed.`,
      ['sourceSnapshotChanges'],
    ),
    gate(
      7,
      'failures_limited_or_withheld',
      input.failureHandlingObserved,
      input.failureHandlingObserved
        ? 'A failed or incomplete source produced a limited, withheld, or not-found result.'
        : 'The sample has not proved how an incomplete source is handled.',
      ['reviews', 'extractions', 'publicationVersions'],
    ),
    gate(
      8,
      'freshness_expectation_present',
      input.expectationCount > 0,
      `${input.expectationCount} source freshness expectations are recorded.`,
      ['sourceExpectations'],
    ),
    gate(
      9,
      'recent_cycle_replayed',
      input.recentReplayPassed,
      input.recentReplayPassed
        ? 'A recent meeting-cycle replay completed.'
        : 'No recent meeting-cycle replay has completed.',
      ['pipelineRuns'],
    ),
    gate(
      10,
      'deployed_source_links_work',
      input.productionLinkCount > 0 &&
        input.productionLinkCount === input.passingProductionLinkCount,
      `${input.passingProductionLinkCount} of ${input.productionLinkCount} source links passed from the production deployment.`,
      ['coverageDirectLinkChecks'],
    ),
  ]
}

function gate(
  gateNumber: number,
  gateKey: string,
  passed: boolean,
  detail: string,
  evidenceRefs: string[],
): CoverageGateResult {
  return { gateNumber, gateKey, passed, detail, evidenceRefs }
}
