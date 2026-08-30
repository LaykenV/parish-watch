// @vitest-environment node

import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, test } from 'vitest'

const GOLD_SET_DIRECTORY = path.resolve('docs/gold-sets')

const SOURCE_KINDS = new Set([
  'agenda',
  'minutes',
  'ordinance',
  'resolution',
  'notice',
  'calendar',
  'packet',
  'planning_case',
  'other',
])

const IMPORTANCE_FACTORS = new Set([
  'public_money',
  'public_assets',
  'land_use',
  'health_safety',
  'rights_access',
  'service_delivery',
  'public_deadline',
])

const IMPORTANCE_LEVELS = new Set(['absent', 'low', 'moderate', 'high'])

const RELATIONSHIPS = new Set([
  'same_government_action',
  'same_project_or_contract',
  'same_subject_and_counterparty',
  'follow_up_or_outcome',
])

const MATERIAL_FIELD_PATH =
  /^\/(sourceRecordId|recordType|title|bodyName|meetingAt|lifecycleState|plainLanguageSummary|affectedPlaces\/\d+|amounts\/\d+\/(value|currency|context)|publicActions\/\d+\/(type|deadline|instructions))$/

type Evidence = {
  artifactId?: string
  page: number | null
  section: string | null
  excerpt: string
}

type Artifact = {
  artifactId: string
  bodySlug: string
  sourceKind: string
  sourceUrl: string
  expectedCanonicalUrl: string | null
  meetingDate: string | null
  documentDate: string | null
  bodyEvidence: Evidence
  kindEvidence: Evidence
  correspondingArtifactIds: string[]
  revisionOfArtifactId: string | null
}

type DecisionCase = {
  caseId: string
  targetRecordId: string
  artifactIds: string[]
  expectedFacts: Array<{
    fieldPath: string
    value: string
    evidence: Evidence & { artifactId: string }
  }>
  requiredCitedFieldPaths: string[]
  mustRemainUnknownClaims: Array<{ claim: string; reason: string }>
  expectedImportanceFactors: Array<{
    factor: string
    level: string
    evidenceArtifactIds: string[]
  }>
}

type Manifest = {
  schemaVersion: string
  body: {
    jurisdictionSlug: string
    slug: string
    name: string
    bodyType: string
  }
  registryExpectation: {
    officialDomains: string[]
    sourceKinds: string[]
    discoveryMode: string
    expectedCadence: {
      kind: string
      expectedWeekdays: number[]
    }
  }
  dateWindow: { from: string; through: string }
  artifacts: Artifact[]
  decisionCases: DecisionCase[]
  expectedRecordLinks: Array<{
    fromCaseId: string
    toCaseId: string
    relationship: string
    evidenceArtifactIds: string[]
  }>
  negativeCases: Array<{
    caseId: string
    artifactId: string
    locator: Evidence
    reason: string
  }>
}

function expectUnique(values: string[]) {
  expect(new Set(values).size).toBe(values.length)
}

function expectEvidence(evidence: Evidence) {
  expect(evidence.excerpt.trim().length).toBeGreaterThan(0)
  expect(evidence.page === null || Number.isInteger(evidence.page)).toBe(true)
  if (evidence.page !== null) expect(evidence.page).toBeGreaterThan(0)
  expect(evidence.section === null || evidence.section.trim().length > 0).toBe(
    true,
  )
}

async function loadManifests() {
  const names = (await readdir(GOLD_SET_DIRECTORY))
    .filter((name) => name.endsWith('.json'))
    .sort()

  expect(names.length).toBeGreaterThan(0)

  return await Promise.all(
    names.map(async (name) => ({
      name,
      manifest: JSON.parse(
        await readFile(path.join(GOLD_SET_DIRECTORY, name), 'utf8'),
      ) as Manifest,
    })),
  )
}

describe('gold-set manifests', () => {
  test('keep source, body, evidence, and reference contracts valid', async () => {
    for (const { manifest } of await loadManifests()) {
      expect(manifest.schemaVersion).toBe('public_parish_gold_set_v1')
      expect(manifest.body.slug.trim().length).toBeGreaterThan(0)
      expect(manifest.body.name.trim().length).toBeGreaterThan(0)
      expect(manifest.dateWindow.from <= manifest.dateWindow.through).toBe(true)

      const officialDomains = new Set(
        manifest.registryExpectation.officialDomains,
      )
      expect(officialDomains.size).toBeGreaterThan(0)
      for (const sourceKind of manifest.registryExpectation.sourceKinds) {
        expect(SOURCE_KINDS.has(sourceKind)).toBe(true)
      }

      const artifactIds = manifest.artifacts.map(({ artifactId }) => artifactId)
      const caseIds = manifest.decisionCases.map(({ caseId }) => caseId)
      const negativeCaseIds = manifest.negativeCases.map(({ caseId }) => caseId)
      expectUnique(artifactIds)
      expectUnique(caseIds)
      expectUnique(negativeCaseIds)

      const knownArtifactIds = new Set(artifactIds)
      const knownCaseIds = new Set(caseIds)

      for (const artifact of manifest.artifacts) {
        expect(artifact.bodySlug).toBe(manifest.body.slug)
        expect(SOURCE_KINDS.has(artifact.sourceKind)).toBe(true)
        expect(
          manifest.registryExpectation.sourceKinds.includes(
            artifact.sourceKind,
          ),
        ).toBe(true)

        const sourceUrl = new URL(artifact.sourceUrl)
        expect(sourceUrl.protocol).toBe('https:')
        expect(officialDomains.has(sourceUrl.hostname)).toBe(true)
        if (artifact.expectedCanonicalUrl !== null) {
          const canonicalUrl = new URL(artifact.expectedCanonicalUrl)
          expect(canonicalUrl.protocol).toBe('https:')
          expect(officialDomains.has(canonicalUrl.hostname)).toBe(true)
        }

        if (artifact.meetingDate !== null) {
          expect(artifact.meetingDate >= manifest.dateWindow.from).toBe(true)
          expect(artifact.meetingDate <= manifest.dateWindow.through).toBe(true)
        }
        expectEvidence(artifact.bodyEvidence)
        expectEvidence(artifact.kindEvidence)

        for (const relatedId of artifact.correspondingArtifactIds) {
          expect(knownArtifactIds.has(relatedId)).toBe(true)
        }
        if (artifact.revisionOfArtifactId !== null) {
          expect(knownArtifactIds.has(artifact.revisionOfArtifactId)).toBe(true)
          expect(artifact.revisionOfArtifactId).not.toBe(artifact.artifactId)
        }
      }

      for (const decisionCase of manifest.decisionCases) {
        expect(decisionCase.targetRecordId.trim().length).toBeGreaterThan(0)
        expect(decisionCase.artifactIds.length).toBeGreaterThan(0)
        expect(decisionCase.expectedFacts.length).toBeGreaterThan(0)
        expect(decisionCase.requiredCitedFieldPaths.length).toBeGreaterThan(0)
        expect(decisionCase.mustRemainUnknownClaims.length).toBeGreaterThan(0)

        for (const artifactId of decisionCase.artifactIds) {
          expect(knownArtifactIds.has(artifactId)).toBe(true)
        }
        for (const fact of decisionCase.expectedFacts) {
          expect(MATERIAL_FIELD_PATH.test(fact.fieldPath)).toBe(true)
          expect(fact.value.trim().length).toBeGreaterThan(0)
          expect(knownArtifactIds.has(fact.evidence.artifactId)).toBe(true)
          expect(decisionCase.artifactIds).toContain(fact.evidence.artifactId)
          expectEvidence(fact.evidence)
        }
        for (const fieldPath of decisionCase.requiredCitedFieldPaths) {
          expect(MATERIAL_FIELD_PATH.test(fieldPath)).toBe(true)
        }
        for (const unknown of decisionCase.mustRemainUnknownClaims) {
          expect(unknown.claim.trim().length).toBeGreaterThan(0)
          expect(unknown.reason.trim().length).toBeGreaterThan(0)
          expect(
            decisionCase.expectedFacts.some(
              (fact) => fact.value.trim() === unknown.claim.trim(),
            ),
          ).toBe(false)
        }
        for (const factor of decisionCase.expectedImportanceFactors) {
          expect(IMPORTANCE_FACTORS.has(factor.factor)).toBe(true)
          expect(IMPORTANCE_LEVELS.has(factor.level)).toBe(true)
          expect(factor.evidenceArtifactIds.length).toBeGreaterThan(0)
          for (const artifactId of factor.evidenceArtifactIds) {
            expect(knownArtifactIds.has(artifactId)).toBe(true)
            expect(decisionCase.artifactIds).toContain(artifactId)
          }
        }
      }

      for (const link of manifest.expectedRecordLinks) {
        expect(knownCaseIds.has(link.fromCaseId)).toBe(true)
        expect(knownCaseIds.has(link.toCaseId)).toBe(true)
        expect(link.fromCaseId).not.toBe(link.toCaseId)
        expect(RELATIONSHIPS.has(link.relationship)).toBe(true)
        for (const artifactId of link.evidenceArtifactIds) {
          expect(knownArtifactIds.has(artifactId)).toBe(true)
        }
      }

      for (const negativeCase of manifest.negativeCases) {
        expect(knownArtifactIds.has(negativeCase.artifactId)).toBe(true)
        expect(negativeCase.reason.trim().length).toBeGreaterThan(0)
        expectEvidence(negativeCase.locator)
      }
    }
  })

  test('the Lafayette City Council set covers the required evidence shapes', async () => {
    const manifests = await loadManifests()
    const result = manifests.find(
      ({ manifest }) => manifest.body.slug === 'lafayette-city-council',
    )
    expect(result).toBeDefined()
    const manifest = result!.manifest
    const factPaths = manifest.decisionCases.flatMap((decisionCase) =>
      decisionCase.expectedFacts.map((fact) => fact.fieldPath),
    )
    const lifecycleValues = manifest.decisionCases.flatMap((decisionCase) =>
      decisionCase.expectedFacts
        .filter((fact) => fact.fieldPath === '/lifecycleState')
        .map((fact) => fact.value),
    )

    expect(
      manifest.artifacts.filter(({ sourceKind }) => sourceKind === 'agenda'),
    ).toHaveLength(4)
    expect(
      manifest.artifacts.filter(({ sourceKind }) => sourceKind === 'minutes'),
    ).toHaveLength(3)
    expect(
      manifest.artifacts.some(({ sourceKind }) =>
        ['ordinance', 'resolution'].includes(sourceKind),
      ),
    ).toBe(true)
    expect(
      lifecycleValues.some((value) =>
        ['amended', 'postponed', 'canceled'].includes(value),
      ),
    ).toBe(true)
    expect(factPaths).toContain('/meetingAt')
    expect(
      factPaths.some((fieldPath) => /^\/amounts\/\d+\/value$/.test(fieldPath)),
    ).toBe(true)
    expect(
      factPaths.some((fieldPath) =>
        /^\/publicActions\/\d+\/deadline$/.test(fieldPath),
      ),
    ).toBe(true)
    expect(manifest.negativeCases.length).toBeGreaterThan(0)
  })
})
