import type { IndependentReviewV1 } from '../review/contractV1'
import { evaluateReviewEvidenceV1 } from './evidenceRulesV1'

export type PublicationMode = 'full' | 'limited' | 'withheld'

export type PublicationPolicyResult = {
  mode: PublicationMode
  reasonCode:
    | 'all_evidence_supported'
    | 'secondary_evidence_limited'
    | 'missing_record_identity'
    | 'core_evidence_failed'
    | 'reviewer_failed'
}

export function applyPublicationPolicyV1(input: {
  sourceRecordId: string | null
  recordType: string
  review: IndependentReviewV1
}): PublicationPolicyResult {
  const decision = evaluateReviewEvidenceV1({
    sourceRecordIdPresent:
      input.sourceRecordId !== null && input.sourceRecordId.trim() !== '',
    recordType: input.recordType,
    checks: input.review.checks,
    findings: input.review.findings,
  })
  return {
    mode:
      decision.verdict === 'pass'
        ? 'full'
        : decision.verdict === 'limited'
          ? 'limited'
          : 'withheld',
    reasonCode: decision.reasonCode,
  }
}
