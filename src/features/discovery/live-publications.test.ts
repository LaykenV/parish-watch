import { describe, expect, it } from 'vitest'

import type { PublishedDecision } from './live-publications'
import {
  toDecisionCard,
  toDecisionRow,
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

describe('live publication discovery adapter', () => {
  it('maps accepted fields without inventing an issue or consequence score', () => {
    expect(toDecisionCard(fullDecision)).toMatchObject({
      body: 'Lafayette City Council',
      evidence: { status: 'Evidence available' },
      href: 'https://apps.lafayettela.gov/record.pdf',
      place: 'Lafayette Parish',
      primaryActionLabel: 'View source',
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
      href: 'https://apps.lafayettela.gov/record.pdf',
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
})
