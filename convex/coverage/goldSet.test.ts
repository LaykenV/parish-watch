import { expect, test } from 'vitest'

import { coverageGoldSetSlots, coverageGoldSetVersion } from './goldSet'

test('the checked manifest keeps missing sample kinds in a fixed denominator', () => {
  expect(coverageGoldSetVersion()).toBe('launch-bodies-v1')
  expect(coverageGoldSetSlots('youngsville-city-council')).toHaveLength(7)
  expect(coverageGoldSetSlots('lafayette-hearing-examiner')).toHaveLength(9)
  expect(
    coverageGoldSetSlots('lafayette-hearing-examiner').filter(
      (slot) => slot.sourceKinds[0] === 'planning_case',
    ),
  ).toEqual([
    { sourceKinds: ['planning_case'], role: 'current' },
    { sourceKinds: ['planning_case'], role: 'historical' },
  ])
})

test('an unlisted body cannot borrow another body gold set', () => {
  expect(() => coverageGoldSetSlots('invented-board')).toThrow(
    'has no body invented-board',
  )
})
