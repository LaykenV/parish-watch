import manifest from '../../docs/coverage-gold-sets/launch-bodies.v2.json'

import type { SourceKind } from '../pipeline/state'

type RawGoldSample = {
  key: string
  title: string
  url: string
  sourceKind: string
  role: string
  meetingDate?: string
  extraction?: {
    targetRecordId: string
    sourceRecordIdProvenance: string
  }
  negativeTargetRecordId?: string
}

type RawGoldBody = {
  bodyKey: string
  expectations: Array<{ sourceKind: string; cadence: string }>
  samples: RawGoldSample[]
}

const checkedManifest = manifest as {
  version: string
  bodies: RawGoldBody[]
}

export type CoverageSampleRole =
  | 'current'
  | 'historical'
  | 'revision'
  | 'negative'

export type CoverageExtractionExpectation = {
  targetRecordId: string
  sourceRecordIdProvenance: 'source_printed' | 'operator_assigned'
}

export type CoverageGoldSample = {
  key: string
  title: string
  url: string
  sourceKind: SourceKind
  role: CoverageSampleRole
  meetingDate?: string
  extraction?: CoverageExtractionExpectation
  negativeTargetRecordId?: string
}

export type CoverageSourceExpectation = {
  sourceKind: SourceKind
  cadence: 'weekly' | 'monthly' | 'meeting_cycle' | 'unknown'
}

export function coverageGoldSetSamples(bodyKey: string): CoverageGoldSample[] {
  const body = bodyFor(bodyKey)
  const seenKeys = new Set<string>()
  return body.samples.map((sample): CoverageGoldSample => {
    if (seenKeys.has(sample.key)) {
      throw new Error(`The coverage gold set repeats sample key ${sample.key}.`)
    }
    seenKeys.add(sample.key)
    return {
      key: sample.key,
      title: sample.title,
      url: sample.url,
      sourceKind: sourceKindFor(sample.sourceKind),
      role: roleFor(sample.role),
      ...(sample.meetingDate ? { meetingDate: sample.meetingDate } : {}),
      ...(sample.extraction
        ? {
            extraction: {
              targetRecordId: sample.extraction.targetRecordId,
              sourceRecordIdProvenance: provenanceFor(
                sample.extraction.sourceRecordIdProvenance,
              ),
            },
          }
        : {}),
      ...(sample.negativeTargetRecordId
        ? { negativeTargetRecordId: sample.negativeTargetRecordId }
        : {}),
    }
  })
}

export function coverageGoldSetExpectations(
  bodyKey: string,
): CoverageSourceExpectation[] {
  return bodyFor(bodyKey).expectations.map((expectation) => ({
    sourceKind: sourceKindFor(expectation.sourceKind),
    cadence: cadenceFor(expectation.cadence),
  }))
}

export function coverageGoldSetSample(
  bodyKey: string,
  canonicalUrl: string,
  sourceKind: SourceKind,
): CoverageGoldSample | null {
  return (
    coverageGoldSetSamples(bodyKey).find(
      (sample) =>
        sample.url === canonicalUrl && sample.sourceKind === sourceKind,
    ) ?? null
  )
}

export function coverageGoldSetVersion(): string {
  return checkedManifest.version
}

function bodyFor(bodyKey: string): RawGoldBody {
  const body = checkedManifest.bodies.find((entry) => entry.bodyKey === bodyKey)
  if (!body) throw new Error(`The coverage gold set has no body ${bodyKey}.`)
  return body
}

function sourceKindFor(value: string): SourceKind {
  switch (value) {
    case 'agenda':
    case 'packet':
    case 'minutes':
    case 'ordinance':
    case 'resolution':
    case 'planning_case':
    case 'notice':
    case 'calendar':
    case 'other':
      return value
    default:
      throw new Error(`Unknown coverage sample kind ${value}.`)
  }
}

function roleFor(value: string): CoverageSampleRole {
  switch (value) {
    case 'current':
    case 'historical':
    case 'revision':
    case 'negative':
      return value
    default:
      throw new Error(`Unknown coverage sample role ${value}.`)
  }
}

function cadenceFor(value: string): CoverageSourceExpectation['cadence'] {
  switch (value) {
    case 'weekly':
    case 'monthly':
    case 'meeting_cycle':
    case 'unknown':
      return value
    default:
      throw new Error(`Unknown coverage cadence ${value}.`)
  }
}

function provenanceFor(
  value: string,
): CoverageExtractionExpectation['sourceRecordIdProvenance'] {
  if (value === 'source_printed' || value === 'operator_assigned') return value
  throw new Error(`Unknown source record ID provenance ${value}.`)
}
