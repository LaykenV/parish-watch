import { expect, test } from 'vitest'

import { weeklyRoundupWindowAt } from './roundupTime'

test('claims the Monday 7 AM America Chicago window with a one-day catch-up', () => {
  expect(
    weeklyRoundupWindowAt(Date.parse('2026-03-09T12:30:00.000Z')),
  ).toEqual({
    key: '2026-03-09',
    startsAt: Date.parse('2026-03-02T13:00:00.000Z'),
    endsAt: Date.parse('2026-03-09T12:00:00.000Z'),
  })
  expect(
    weeklyRoundupWindowAt(Date.parse('2026-11-02T13:30:00.000Z')),
  ).toEqual({
    key: '2026-11-02',
    startsAt: Date.parse('2026-10-26T12:00:00.000Z'),
    endsAt: Date.parse('2026-11-02T13:00:00.000Z'),
  })
  expect(
    weeklyRoundupWindowAt(Date.parse('2026-11-02T14:00:00.000Z')),
  ).toEqual({
    key: '2026-11-02',
    startsAt: Date.parse('2026-10-26T12:00:00.000Z'),
    endsAt: Date.parse('2026-11-02T13:00:00.000Z'),
  })
  expect(
    weeklyRoundupWindowAt(Date.parse('2026-11-03T12:30:00.000Z')),
  ).toEqual({
    key: '2026-11-02',
    startsAt: Date.parse('2026-10-26T12:00:00.000Z'),
    endsAt: Date.parse('2026-11-02T13:00:00.000Z'),
  })
  expect(
    weeklyRoundupWindowAt(Date.parse('2026-11-03T13:00:00.000Z')),
  ).toBeNull()
})
