import { expect, test } from 'vitest'

import {
  coverageGoldSetExpectations,
  coverageGoldSetSamples,
  coverageGoldSetVersion,
} from './goldSet'

test('the checked manifest names exact official artifacts and extraction targets', () => {
  expect(coverageGoldSetVersion()).toBe('launch-bodies-v2')
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
