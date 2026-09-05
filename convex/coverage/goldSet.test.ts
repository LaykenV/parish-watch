import { expect, test } from 'vitest'

import {
  coverageGoldSetExpectations,
  coverageGoldSetSamples,
  coverageGoldSetVersion,
} from './goldSet'

test('the checked manifest names exact official artifacts and extraction targets', () => {
  expect(coverageGoldSetVersion()).toBe('launch-bodies-v3')
  expect(coverageGoldSetSamples('youngsville-city-council')).toHaveLength(4)
  expect(
    coverageGoldSetSamples('lafayette-city-council').map(
      (sample) => sample.url,
    ),
  ).toContain(
    'https://apps.lafayettela.gov/obcouncil/api/Document/2581071/',
  )
  expect(
    coverageGoldSetSamples('ebr-metropolitan-council').find(
      (sample) => sample.key === '2026-08-12-agenda',
    )?.extraction,
  ).toEqual({
    targetRecordId: 'EBR-2026-08-12-CORTANA-CITY-SALES-TAX-REBATE',
    sourceRecordIdProvenance: 'operator_assigned',
  })
  expect(coverageGoldSetExpectations('pineville-city-council')).toEqual([
    { sourceKind: 'agenda', cadence: 'meeting_cycle' },
    { sourceKind: 'minutes', cadence: 'meeting_cycle' },
  ])
})

test('an unlisted body cannot borrow another body gold set', () => {
  expect(() => coverageGoldSetSamples('invented-board')).toThrow(
    'has no body invented-board',
  )
})

test('Lafayette commissions keep their own schedule without borrowing decision samples', () => {
  const city = coverageGoldSetSamples('lafayette-city-planning-commission')
  const parish = coverageGoldSetSamples('lafayette-parish-planning-commission')
  const zoning = coverageGoldSetSamples('lafayette-city-zoning-commission')
  expect(city.map(sample => sample.key)).toEqual(['2026-city-schedule'])
  expect(parish.map(sample => sample.key)).toEqual(['2026-parish-schedule'])
  expect(zoning.map(sample => sample.key)).toEqual(['2026-city-zoning-schedule'])
  for (const samples of [city, parish, zoning]) {
    expect(samples.every(sample => sample.sourceKind === 'calendar')).toBe(true)
    expect(samples.some(sample => sample.extraction !== undefined)).toBe(false)
  }
})
