export const CORE_PUBLICATION_FIELD_PATHS: ReadonlySet<string> = new Set([
  '/title',
  '/bodyName',
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
  recordIdentityPresent: boolean
  sourceRecordIdProvenance: 'source_printed' | 'operator_assigned'
  checks: ReadonlyArray<{
    fieldPath: string
    assessment: 'supported' | 'unclear' | 'unsupported'
  }>
  findings: ReadonlyArray<{
    severity: 'info' | 'limited' | 'fail'
    fieldPath: string | null
  }>
}): ReviewEvidenceDecision {
  if (!input.recordIdentityPresent) {
    return { verdict: 'fail', reasonCode: 'missing_record_identity' }
  }
  if (input.findings.some((finding) => finding.severity === 'fail')) {
    return { verdict: 'fail', reasonCode: 'reviewer_failed' }
  }
  const requiresSourceRecordIdEvidence =
    input.sourceRecordIdProvenance === 'source_printed'
  const isCorePublicationPath = (fieldPath: string) =>
    CORE_PUBLICATION_FIELD_PATHS.has(fieldPath) ||
    (requiresSourceRecordIdEvidence && fieldPath === '/sourceRecordId')
  if (
    input.checks.some(
      (check) =>
        isCorePublicationPath(check.fieldPath) &&
        check.assessment !== 'supported',
    ) ||
    input.findings.some(
      (finding) =>
        finding.severity === 'limited' &&
        finding.fieldPath !== null &&
        isCorePublicationPath(finding.fieldPath),
    )
  ) {
    return { verdict: 'fail', reasonCode: 'core_evidence_failed' }
  }
  if (
    input.findings.some((finding) => finding.severity === 'limited') ||
    input.checks.some((check) => check.assessment !== 'supported')
  ) {
    return {
      verdict: 'limited',
      reasonCode: 'secondary_evidence_limited',
    }
  }
  return { verdict: 'pass', reasonCode: 'all_evidence_supported' }
}
