export const COVERAGE_EVALUATOR_VERSION = 'coverage-gates-v2'
import { coverageGoldSetVersion } from './goldSet'

export const COVERAGE_GOLD_SET_VERSION = coverageGoldSetVersion()

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
  staleExpectationCount: number
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
      'representative_samples_retrieved',
      input.expectedArtifactCount > 0 &&
        input.retrievedArtifactCount === input.expectedArtifactCount,
      `${input.retrievedArtifactCount} of ${input.expectedArtifactCount} required representative samples were retrieved.`,
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
      input.expectationCount > 0 && input.staleExpectationCount === 0,
      `${input.expectationCount} source freshness expectations are recorded; ${input.staleExpectationCount} are stale.`,
      ['sourceExpectations'],
    ),
    gate(
      9,
      'recent_agenda_and_minutes_runs',
      input.recentReplayPassed,
      input.recentReplayPassed
        ? 'Agenda and minutes pipeline runs both succeeded within 60 days.'
        : 'No successful agenda and minutes pipeline runs both fall within 60 days.',
      ['pipelineRuns'],
    ),
    gate(
      10,
      'production_source_urls_reachable',
      input.productionLinkCount > 0 &&
        input.productionLinkCount === input.passingProductionLinkCount,
      `${input.passingProductionLinkCount} of ${input.productionLinkCount} representative source URLs answered from the production backend.`,
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
