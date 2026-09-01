import { describe, expect, it } from 'vitest'

import type { PublishedDecision, PublishedIssue } from './live-publications'
import {
  toDecisionCard,
  toDecisionRow,
  toIssueCard,
  toIssueLifecycleState,
  toLifecycleState,
} from './live-publications'

const fullDecision: PublishedDecision = {
  bodyName: 'Lafayette City Council',
  lifecycleState: 'postponed',
  meetingAt: null,
  mode: 'full',
  placeName: 'Lafayette Parish',
  placeSlug: 'lafayette-parish',
  recordKey: 'record-key',
  source: {
    officialUrl: 'https://apps.lafayettela.gov/record.pdf',
    retrievedAt: 1_788_000_000_000,
    sourceKind: 'minutes',
  },
  sourceRecordId: 'CO-062-2026',
  summary: 'The council postponed the ordinance.',
  title: 'An ordinance concerning Hellen Street',
}

const fullIssue: PublishedIssue = {
  bodyName: 'Rapides Parish Police Jury',
  decisionCount: 2,
  evidenceCheckedAt: 1_788_000_000_000,
  latestMeetingAt: '2026-06-09T00:00:00.000Z',
  lifecycleState: 'decided',
  mode: 'full',
  nextKnownAction: null,
  placeName: 'Rapides Parish',
  placeSlug: 'rapides-parish',
  revision: 'issue-version-id',
  slug: '2026-millage-levy',
  summary: 'The police jury set the 2026 property-tax millage levy.',
  title: '2026 millage levy on the Rapides Parish tax roll',
  topics: ['Public money'],
}

describe('live publication discovery adapter', () => {
  it('maps accepted fields without inventing an issue or consequence score', () => {
    expect(toDecisionCard(fullDecision)).toMatchObject({
      body: 'Lafayette City Council',
      evidence: { status: 'Evidence available' },
      href: '/decisions/record-key',
      place: 'Lafayette Parish',
      primaryActionLabel: 'View decision',
      showSecondaryActions: false,
      state: 'Postponed',
      topics: [],
      whyMatter: 'The council postponed the ordinance.',
    })
  })

  it('keeps a limited record visibly limited and omits unsupported details', () => {
    const card = toDecisionCard({
      ...fullDecision,
      lifecycleState: null,
      meetingAt: null,
      mode: 'limited',
      summary: null,
    })

    expect(card).toMatchObject({
      evidence: { status: 'Limited information' },
      state: 'Status not stated',
    })
    expect(card?.whyMatter).toBeUndefined()
  })

  it('labels Explore results as decision records with source status', () => {
    expect(toDecisionRow(fullDecision)).toMatchObject({
      href: '/decisions/record-key',
      id: 'CO-062-2026',
      kind: 'Decision record',
      sourceStatus: 'Evidence available',
      state: 'Postponed',
    })
  })

  it('maps every backend lifecycle into resident language', () => {
    expect(toLifecycleState('scheduled')).toBe('Scheduled')
    expect(toLifecycleState('implementing')).toBe('In progress')
    expect(toLifecycleState('decided')).toBe('Decided')
    expect(toLifecycleState(null)).toBe('Status not stated')
  })

  it('maps a published issue without dropping its linked-record context', () => {
    expect(toIssueCard(fullIssue)).toMatchObject({
      body: 'Rapides Parish Police Jury',
      evidence: {
        note: 'Built from 2 linked official decision records.',
        status: 'Evidence available',
      },
      href: '/issues/2026-millage-levy',
      latestOutcome: {
        date: '2026-06-09T00:00:00.000Z',
        label: 'Latest record',
      },
      place: 'Rapides Parish',
      state: 'Decided',
      whyMatter: 'The police jury set the 2026 property-tax millage levy.',
    })
  })

  it('maps issue-specific lifecycle labels into resident language', () => {
    expect(toIssueLifecycleState('active')).toBe('In progress')
    expect(toIssueLifecycleState('complete')).toBe('Completed')
    expect(toIssueLifecycleState('unknown')).toBe('Status not stated')
  })
})
