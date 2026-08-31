export const CORE_SOURCED_FIELD_PATHS: ReadonlySet<string> = new Set([
  '/title',
  '/bodyName',
])

export const CORE_IDENTITY_FIELD_PATHS: ReadonlySet<string> = new Set([
  '/sourceRecordId',
  '/title',
  '/bodyName',
])

export const NUMBERED_RECORD_TYPES: ReadonlySet<string> = new Set([
  'proposal',
  'vote',
])

export type ReviewEvidenceDecision = {
  verdict: 'pass' | 'limited' | 'fail'
  reasonCode:
    | 'all_evidence_supported'
    | 'secondary_evidence_limited'
    | 'missing_record_identity'
    | 'core_evidence_failed'
    | 'reviewer_failed'
}

export function evaluateReviewEvidenceV1(input: {
  sourceRecordIdPresent: boolean
  recordType: string
  checks: ReadonlyArray<{
    fieldPath: string
    assessment: 'supported' | 'unclear' | 'unsupported'
  }>
  findings: ReadonlyArray<{
    severity: 'info' | 'limited' | 'fail'
    fieldPath: string | null
  }>
}): ReviewEvidenceDecision {
  if (!input.sourceRecordIdPresent) {
    return { verdict: 'fail', reasonCode: 'missing_record_identity' }
  }
  if (input.findings.some((finding) => finding.severity === 'fail')) {
    return { verdict: 'fail', reasonCode: 'reviewer_failed' }
  }

  const sourceRecordIdRequiresCitation = NUMBERED_RECORD_TYPES.has(
    input.recordType,
  )

  if (
    input.checks.some(
      (check) =>
        (CORE_SOURCED_FIELD_PATHS.has(check.fieldPath) ||
          (check.fieldPath === '/sourceRecordId' &&
            sourceRecordIdRequiresCitation)) &&
        check.assessment !== 'supported',
    ) ||
    input.findings.some(
      (finding) =>
        finding.severity === 'limited' &&
        finding.fieldPath !== null &&
        (CORE_SOURCED_FIELD_PATHS.has(finding.fieldPath) ||
          (finding.fieldPath === '/sourceRecordId' &&
            sourceRecordIdRequiresCitation)),
    )
  ) {
    return { verdict: 'fail', reasonCode: 'core_evidence_failed' }
  }
  if (
    input.findings.some((finding) => finding.severity === 'limited') ||
    input.checks.some(
      (check) =>
        check.assessment !== 'supported' &&
        !(
          check.fieldPath === '/sourceRecordId' && !sourceRecordIdRequiresCitation
        ),
    )
  ) {
    return {
      verdict: 'limited',
      reasonCode: 'secondary_evidence_limited',
    }
  }
  return { verdict: 'pass', reasonCode: 'all_evidence_supported' }
}
