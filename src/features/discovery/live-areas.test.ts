import { describe, expect, it } from 'vitest'

import { toAreaRecords } from './live-areas'

describe('live coverage areas', () => {
  it('enables only areas the backend marks available', () => {
    const areas = toAreaRecords([
      { slug: 'lafayette-parish', status: 'available' },
      { slug: 'east-baton-rouge-parish', status: 'validating' },
      { slug: 'rapides-parish', status: 'available' },
    ])

    expect(areas.map(({ slug, status }) => ({ slug, status }))).toEqual([
      { slug: 'lafayette-parish', status: 'available' },
      { slug: 'east-baton-rouge-parish', status: 'validating' },
      { slug: 'rapides-parish', status: 'available' },
    ])
  })

  it('keeps every area validating while live status is unavailable', () => {
    expect(
      toAreaRecords(undefined).every((area) => area.status === 'validating'),
    ).toBe(true)
  })
})
