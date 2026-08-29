import type { Id } from '../_generated/dataModel'
import { isCoreIssueFactPath } from './contractV1'
import type {
  ImportanceFactorName,
  ImportanceLevel,
  IssueCandidateV1,
  IssueReviewV1,
} from './contractV1'

export const IMPORTANCE_FACTOR_MAX_POINTS: Record<
  ImportanceFactorName,
  number
> = {
  public_money: 20,
  public_assets: 20,
  land_use: 15,
  health_safety: 15,
  rights_access: 10,
  service_delivery: 10,
  public_deadline: 10,
}

export function pointsForImportanceLevel(
  level: ImportanceLevel,
  maxPoints: number,
): number {
  if (level === 'absent') return 0
  if (level === 'low') return Math.ceil(maxPoints * 0.25)
  if (level === 'moderate') return Math.ceil(maxPoints * 0.5)
  return maxPoints
}

export function rankIssueCandidateV1(input: {
  candidate: IssueCandidateV1
  review: IssueReviewV1
  now: number
  publicActionDeadlines: string[]
}): {
  mode: 'full' | 'limited' | 'withheld'
  reasonCode: string
  supportedFactPaths: string[]
  importance: {
    score: number
    maxScore: number
    completenessPercent: number
    supportedFactorCount: number
    totalFactorCount: number
    hasNearTermPublicDeadline: boolean
  }
  assessments: Array<{
    factor: ImportanceFactorName
    level: Exclude<ImportanceLevel, 'absent'>
    points: number
    maxPoints: number
    rationale: string
    citationIds: Id<'citations'>[]
  }>
} {
  const checks = new Map(
    input.review.checks.map((check) => [check.fieldPath, check.assessment]),
  )
  const supportedFactPaths = input.review.checks
    .filter((check) => check.assessment === 'supported')
    .map((check) => check.fieldPath)
  const coreFailed = input.review.checks.some(
    (check) =>
      isCoreIssueFactPath(check.fieldPath) && check.assessment !== 'supported',
  )
  const globalFailure = input.review.findings.some(
    (finding) => finding.severity === 'fail',
  )

  const facts = new Map(
    input.candidate.facts.map((fact) => [fact.fieldPath, fact]),
  )
  const assessments: Array<{
    factor: ImportanceFactorName
    level: Exclude<ImportanceLevel, 'absent'>
    points: number
    maxPoints: number
    rationale: string
    citationIds: Id<'citations'>[]
  }> = []
  for (const factor of input.candidate.importanceFactors) {
    if (factor.level === 'absent') continue
    const path = `/importanceFactors/${factor.factor}/rationale`
    const fact = facts.get(path)
    if (!fact || checks.get(path) !== 'supported') continue
    const maxPoints = IMPORTANCE_FACTOR_MAX_POINTS[factor.factor]
    assessments.push({
      factor: factor.factor,
      level: factor.level,
      points: pointsForImportanceLevel(factor.level, maxPoints),
      maxPoints,
      rationale: factor.rationale,
      citationIds: fact.citationIds as Id<'citations'>[],
    })
  }
  const score = assessments.reduce((total, item) => total + item.points, 0)
  const totalFactorCount = Object.keys(IMPORTANCE_FACTOR_MAX_POINTS).length
  const importance = {
    score,
    maxScore: 100,
    completenessPercent: Math.round(
      (assessments.length / totalFactorCount) * 100,
    ),
    supportedFactorCount: assessments.length,
    totalFactorCount,
    hasNearTermPublicDeadline: input.publicActionDeadlines.some((deadline) => {
      const at = Date.parse(deadline)
      return (
        Number.isFinite(at) &&
        at >= input.now &&
        at - input.now <= 7 * 24 * 60 * 60 * 1000
      )
    }),
  }

  if (input.review.verdict === 'fail' || coreFailed || globalFailure) {
    return {
      mode: 'withheld',
      reasonCode: 'core_issue_evidence_failed',
      supportedFactPaths,
      importance,
      assessments,
    }
  }
  if (assessments.length === 0) {
    return {
      mode: 'withheld',
      reasonCode: 'importance_evidence_missing',
      supportedFactPaths,
      importance,
      assessments,
    }
  }
  const secondaryLimited =
    input.review.verdict === 'limited' ||
    input.review.findings.some((finding) => finding.severity === 'limited') ||
    input.review.checks.some(
      (check) =>
        !isCoreIssueFactPath(check.fieldPath) &&
        check.assessment !== 'supported',
    )
  return {
    mode: secondaryLimited ? 'limited' : 'full',
    reasonCode: secondaryLimited
      ? 'secondary_issue_evidence_limited'
      : 'issue_evidence_accepted',
    supportedFactPaths,
    importance,
    assessments,
  }
}
