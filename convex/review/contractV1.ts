import { v } from 'convex/values'

import { REVIEW_SCHEMA_VERSION } from '../pipeline/state'
import type { SourceRecordIdProvenance } from '../pipeline/state'
import { evaluateReviewEvidenceV1 } from '../publication/evidenceRulesV1'

export const reviewAssessments = v.union(
  v.literal('supported'),
  v.literal('unclear'),
  v.literal('unsupported'),
)

export type ReviewAssessment = typeof reviewAssessments.type

export const reviewSeverities = v.union(
  v.literal('info'),
  v.literal('limited'),
  v.literal('fail'),
)

export type ReviewSeverity = typeof reviewSeverities.type

export const reviewVerdicts = v.union(
  v.literal('pass'),
  v.literal('limited'),
  v.literal('fail'),
)

export type ReviewVerdict = typeof reviewVerdicts.type

export const independentReviewV1 = v.object({
  verdict: reviewVerdicts,
  checks: v.array(
    v.object({
      factId: v.string(),
      fieldPath: v.string(),
      assessment: reviewAssessments,
      detail: v.string(),
    }),
  ),
  findings: v.array(
    v.object({
      code: v.string(),
      severity: reviewSeverities,
      fieldPath: v.union(v.string(), v.null()),
      detail: v.string(),
    }),
  ),
})

export type IndependentReviewV1 = typeof independentReviewV1.type

export type ExpectedReviewFact = {
  factId: string
  fieldPath: string
}

export const MAX_REVIEW_CHECKS = 100
const MAX_FINDINGS = 50
const MAX_DETAIL_LENGTH = 500

export function expectedReviewVerdictV1(input: {
  recordIdentityPresent: boolean
  sourceRecordIdProvenance: SourceRecordIdProvenance
  checks: IndependentReviewV1['checks']
  findings: IndependentReviewV1['findings']
}): ReviewVerdict {
  return evaluateReviewEvidenceV1(input).verdict
}

export function checkIndependentReviewContractV1(
  parsed: unknown,
  expectedFacts: ExpectedReviewFact[],
  recordIdentityPresent: boolean,
  sourceRecordIdProvenance: SourceRecordIdProvenance,
): string | null {
  const review = parsed as IndependentReviewV1
  if (review.checks.length > MAX_REVIEW_CHECKS) {
    return `checks exceeds the limit of ${MAX_REVIEW_CHECKS} entries`
  }
  if (review.findings.length > MAX_FINDINGS) {
    return `findings exceeds the limit of ${MAX_FINDINGS} entries`
  }

  const expectedById = new Map(
    expectedFacts.map((fact) => [fact.factId, fact.fieldPath]),
  )
  if (expectedById.size !== expectedFacts.length) {
    return 'The expected fact set contains duplicate IDs'
  }
  const seen = new Set<string>()
  for (const check of review.checks) {
    const expectedPath = expectedById.get(check.factId)
    if (!expectedPath) {
      return `Review check uses unknown fact ${check.factId}`
    }
    if (seen.has(check.factId)) {
      return `Review check repeats fact ${check.factId}`
    }
    if (check.fieldPath !== expectedPath) {
      return `Review check path ${check.fieldPath} does not match fact ${check.factId}`
    }
    if (check.detail.trim() === '' || check.detail.length > MAX_DETAIL_LENGTH) {
      return `Review detail for ${check.factId} must contain 1 to ${MAX_DETAIL_LENGTH} characters`
    }
    seen.add(check.factId)
  }
  if (seen.size !== expectedFacts.length) {
    const missing = expectedFacts.find((fact) => !seen.has(fact.factId))
    return `Review omitted fact ${missing?.factId ?? '<unknown>'}`
  }
  for (const finding of review.findings) {
    if (!/^[a-z0-9_]{1,80}$/.test(finding.code)) {
      return `Review finding code ${finding.code} is invalid`
    }
    if (
      finding.detail.trim() === '' ||
      finding.detail.length > MAX_DETAIL_LENGTH
    ) {
      return `Review finding ${finding.code} detail must contain 1 to ${MAX_DETAIL_LENGTH} characters`
    }
    if (
      finding.fieldPath !== null &&
      !expectedFacts.some((fact) => fact.fieldPath === finding.fieldPath)
    ) {
      return `Review finding ${finding.code} uses unknown path ${finding.fieldPath}`
    }
  }

  const expectedVerdict = expectedReviewVerdictV1({
    recordIdentityPresent,
    sourceRecordIdProvenance,
    checks: review.checks,
    findings: review.findings,
  })
  if (review.verdict !== expectedVerdict) {
    return `Review verdict ${review.verdict} does not match the required ${expectedVerdict} verdict`
  }
  return null
}

const nullableString = {
  anyOf: [{ type: 'string' as const }, { type: 'null' as const }],
}

export const independentReviewJsonSchemaV1: Record<string, unknown> = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['pass', 'limited', 'fail'] },
    checks: {
      type: 'array',
      maxItems: MAX_REVIEW_CHECKS,
      items: {
        type: 'object',
        properties: {
          factId: { type: 'string' },
          fieldPath: { type: 'string' },
          assessment: {
            type: 'string',
            enum: ['supported', 'unclear', 'unsupported'],
          },
          detail: { type: 'string' },
        },
        required: ['factId', 'fieldPath', 'assessment', 'detail'],
        additionalProperties: false,
      },
    },
    findings: {
      type: 'array',
      maxItems: MAX_FINDINGS,
      items: {
        type: 'object',
        properties: {
          code: { type: 'string', pattern: '^[a-z0-9_]{1,80}$' },
          severity: {
            type: 'string',
            enum: ['info', 'limited', 'fail'],
          },
          fieldPath: nullableString,
          detail: { type: 'string' },
        },
        required: ['code', 'severity', 'fieldPath', 'detail'],
        additionalProperties: false,
      },
    },
  },
  required: ['verdict', 'checks', 'findings'],
  additionalProperties: false,
}

export function schemaNameForIndependentReviewV1(): string {
  return `public_parish_independent_review_${REVIEW_SCHEMA_VERSION}`
}
