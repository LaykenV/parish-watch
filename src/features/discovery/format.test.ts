import { describe, expect, it } from 'vitest'

import { formatDate, formatDay } from './format'

describe('discovery date formatting', () => {
  it('keeps a date-only record on its Chicago calendar day abroad', () => {
    const previousTimezone = process.env.TZ

    try {
      process.env.TZ = 'Asia/Singapore'
      expect(formatDate('2026-09-15')).toBe('Sep 15, 2026')
      expect(formatDay('2026-09-15')).toBe('Sep 15')
    } finally {
      process.env.TZ = previousTimezone
    }
  })
})
