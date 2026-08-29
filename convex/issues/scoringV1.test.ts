import { expect, test } from 'vitest'

import type { Id } from '../_generated/dataModel'
import type { IssueCandidateV1, IssueReviewV1 } from './contractV1'
import { rankIssueCandidateV1 } from './scoringV1'

test('a near-term public deadline is a separate hard trigger and adds no points', () => {
  const citationId = 'citation' as Id<'citations'>
  const candidate: IssueCandidateV1 = {
    title: 'Surplus vehicle donation',
    summary: 'The council will consider donating a surplus vehicle.',
    lifecycleState: 'scheduled',
    nextKnownAction: null,
    topics: [],
    links: [
      {
        recordId: 'record-1',
        relationship: 'same_government_action',
        reason: 'The record concerns the same vehicle donation.',
      },
      {
        recordId: 'record-2',
        relationship: 'same_government_action',
        reason: 'The record concerns the same vehicle donation.',
      },
    ],
    sharedSignals: [
      {
        kind: 'official_identifier',
        value: 'vehicle-donation-2026',
        citationIds: [citationId],
      },
    ],
    importanceFactors: [
      { factor: 'public_money', level: 'absent', rationale: '' },
      {
        factor: 'public_assets',
        level: 'low',
        rationale: 'The decision transfers a public vehicle.',
      },
      { factor: 'land_use', level: 'absent', rationale: '' },
      { factor: 'health_safety', level: 'absent', rationale: '' },
      { factor: 'rights_access', level: 'absent', rationale: '' },
      { factor: 'service_delivery', level: 'absent', rationale: '' },
      { factor: 'public_deadline', level: 'absent', rationale: '' },
    ],
    facts: [
      {
        fieldPath: '/title',
        value: 'Surplus vehicle donation',
        citationIds: [citationId],
      },
      {
        fieldPath: '/summary',
        value: 'The council will consider donating a surplus vehicle.',
        citationIds: [citationId],
      },
      {
        fieldPath: '/lifecycleState',
        value: 'scheduled',
        citationIds: [citationId],
      },
      {
        fieldPath: '/links/0/reason',
        value: 'The record concerns the same vehicle donation.',
        citationIds: [citationId],
      },
      {
        fieldPath: '/links/1/reason',
        value: 'The record concerns the same vehicle donation.',
        citationIds: [citationId],
      },
      {
        fieldPath: '/sharedSignals/0/value',
        value: 'vehicle-donation-2026',
        citationIds: [citationId],
      },
      {
        fieldPath: '/importanceFactors/public_assets/rationale',
        value: 'The decision transfers a public vehicle.',
        citationIds: [citationId],
      },
    ],
  }
  const review: IssueReviewV1 = {
    verdict: 'pass',
    checks: candidate.facts.map((fact) => ({
      fieldPath: fact.fieldPath,
      assessment: 'supported',
      detail: 'Supported.',
    })),
    findings: [],
  }
  const now = Date.parse('2026-09-01T12:00:00Z')
  const ranked = rankIssueCandidateV1({
    candidate,
    review,
    now,
    publicActionDeadlines: ['2026-09-05T12:00:00Z'],
  })
  expect(ranked.importance).toMatchObject({
    score: 5,
    completenessPercent: 14,
    hasNearTermPublicDeadline: true,
  })
  expect(ranked.assessments).toHaveLength(1)
  expect(ranked.assessments[0].factor).toBe('public_assets')
})
