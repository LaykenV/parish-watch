import { expect, test } from 'vitest'

import { classifyMaterialChange } from './changes/material'
import type { Doc } from './_generated/dataModel'

type Payload = Exclude<Doc<'publicationVersions'>['payload'], null>

const source = {
  snapshotId: 'snapshot' as Payload['source']['snapshotId'],
  sourceKind: 'agenda' as const,
  officialUrl: 'https://example.gov/agenda.pdf',
  retrievedAt: 1,
}

const limited: Payload = {
  kind: 'limited',
  sourceRecordId: 'CO-022-2026',
  title: 'Donate a surplus pickup',
  bodyName: 'Lafayette City Council',
  source,
}

const full: Payload = {
  kind: 'full',
  sourceRecordId: 'CO-022-2026',
  recordType: 'proposal',
  title: 'Donate a surplus pickup',
  bodyName: 'Lafayette City Council',
  meetingAt: '2026-04-21T17:30:00-05:00',
  lifecycleState: 'scheduled',
  plainLanguageSummary: 'The council will consider donating a surplus pickup.',
  affectedPlaces: ['Lafayette Parish'],
  amounts: [],
  publicActions: [],
  source,
}

test('a limited publication gaining supported fields is information expanded', () => {
  const change = classifyMaterialChange(limited, full)
  expect(change.classification).toBe('information_expanded')
  expect(change.material).toBe(true)
  expect(change.fieldChanges).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ fieldPath: '/recordType', kind: 'added' }),
      expect.objectContaining({ fieldPath: '/lifecycleState', kind: 'added' }),
    ]),
  )
})

test('an evidence downgrade is not mislabeled as a factual change', () => {
  const change = classifyMaterialChange(full, limited)
  expect(change.classification).toBe('information_limited')
  expect(change.material).toBe(true)
  expect(change.fieldChanges).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ fieldPath: '/recordType', kind: 'removed' }),
      expect.objectContaining({
        fieldPath: '/lifecycleState',
        kind: 'removed',
      }),
    ]),
  )
})

test('a decision outcome takes precedence over generic amended fields', () => {
  const decided: Payload = {
    ...full,
    recordType: 'vote',
    lifecycleState: 'decided',
    plainLanguageSummary: 'The council adopted the pickup donation.',
    source: { ...source, sourceKind: 'minutes' },
  }
  const change = classifyMaterialChange(full, decided)
  expect(change.classification).toBe('decided')
  expect(change.fieldChanges.map((field) => field.fieldPath)).toEqual(
    expect.arrayContaining([
      '/recordType',
      '/lifecycleState',
      '/plainLanguageSummary',
    ]),
  )
})

test('an unchanged decided record does not repeat the decision event', () => {
  const decided: Payload = {
    ...full,
    recordType: 'vote',
    lifecycleState: 'decided',
    plainLanguageSummary: 'The council adopted the pickup donation.',
    source: { ...source, sourceKind: 'minutes' },
  }
  const republished: Payload = {
    ...decided,
    source: {
      ...decided.source,
      snapshotId: 'new-snapshot' as typeof source.snapshotId,
    },
  }
  expect(classifyMaterialChange(decided, republished)).toEqual({
    classification: 'no_public_change',
    material: false,
    fieldChanges: [],
  })
})

test('an amount change on an already-decided record keeps the amount label', () => {
  const decided: Payload = {
    ...full,
    recordType: 'vote',
    lifecycleState: 'decided',
  }
  const changed = classifyMaterialChange(decided, {
    ...decided,
    amounts: [{ value: 18_500, currency: 'USD', context: 'Transfer value' }],
  })
  expect(changed).toMatchObject({
    classification: 'amount_changed',
    material: true,
    fieldChanges: [expect.objectContaining({ fieldPath: '/amounts' })],
  })
})

test('a limited record gaining a supported decision outcome is decided', () => {
  const decided: Payload = {
    ...full,
    recordType: 'vote',
    lifecycleState: 'decided',
    source: { ...source, sourceKind: 'minutes' },
  }
  expect(classifyMaterialChange(limited, decided).classification).toBe(
    'decided',
  )
})

test('a new source snapshot with the same public payload records no public change', () => {
  const samePayload: Payload = {
    ...full,
    source: {
      ...source,
      snapshotId: 'new-snapshot' as typeof source.snapshotId,
    },
  }
  expect(classifyMaterialChange(full, samePayload)).toEqual({
    classification: 'no_public_change',
    material: false,
    fieldChanges: [],
  })
})

test('missing time precision does not claim that the meeting date changed', () => {
  const withoutMeetingTime: Payload = {
    ...full,
    meetingAt: null,
    source: { ...source, sourceKind: 'minutes' },
  }
  const change = classifyMaterialChange(full, withoutMeetingTime)
  expect(change).toEqual({
    classification: 'no_public_change',
    material: false,
    fieldChanges: [],
  })
})

test('a newly supported meeting date is a public date change', () => {
  const withoutMeetingTime: Payload = { ...full, meetingAt: null }
  const change = classifyMaterialChange(withoutMeetingTime, full)
  expect(change).toMatchObject({
    classification: 'date_changed',
    material: true,
    fieldChanges: [
      expect.objectContaining({ fieldPath: '/meetingAt', kind: 'added' }),
    ],
  })
})

test('a date-only midnight placeholder does not replace a supported time', () => {
  const dateOnly: Payload = {
    ...full,
    meetingAt: '2026-04-21T00:00:00-05:00',
    source: { ...source, sourceKind: 'minutes' },
  }
  expect(classifyMaterialChange(full, dateOnly)).toEqual({
    classification: 'no_public_change',
    material: false,
    fieldChanges: [],
  })
})

test('a supported clock-time change on the same date is public', () => {
  const changed = classifyMaterialChange(full, {
    ...full,
    meetingAt: '2026-04-21T18:30:00-05:00',
  })
  expect(changed).toMatchObject({
    classification: 'date_changed',
    material: true,
    fieldChanges: [expect.objectContaining({ fieldPath: '/meetingAt' })],
  })
})

test('presentation-only title edits do not become amendments', () => {
  const restyled: Payload = {
    ...full,
    title: '  DONATE a surplus pickup. ',
  }
  expect(classifyMaterialChange(full, restyled)).toEqual({
    classification: 'no_public_change',
    material: false,
    fieldChanges: [],
  })

  const reworded: Payload = {
    ...full,
    title: 'Donate two surplus pickups',
  }
  expect(classifyMaterialChange(full, reworded)).toMatchObject({
    classification: 'amended',
    material: true,
    fieldChanges: [expect.objectContaining({ fieldPath: '/title' })],
  })
})
