import { describe, expect, it } from 'vitest'

import { isAnalyticsRuntimeAllowed } from './product-analytics'

describe('product analytics runtime boundary', () => {
  it('records only non-automated production traffic on served hosts', () => {
    expect(
      isAnalyticsRuntimeAllowed({
        automated: false,
        hostname: 'www.publicparish.com',
        optedOut: false,
        production: true,
      }),
    ).toBe(true)
    expect(
      isAnalyticsRuntimeAllowed({
        automated: false,
        hostname: 'befitting-flamingo-587.convex.site',
        optedOut: false,
        production: true,
      }),
    ).toBe(true)
  })

  it.each([
    {
      automated: false,
      hostname: 'localhost',
      optedOut: false,
      production: true,
    },
    {
      automated: false,
      hostname: 'www.publicparish.com',
      optedOut: false,
      production: false,
    },
    {
      automated: true,
      hostname: 'www.publicparish.com',
      optedOut: false,
      production: true,
    },
    {
      automated: false,
      hostname: 'www.publicparish.com',
      optedOut: true,
      production: true,
    },
  ])('rejects non-evidence traffic %#', (runtime) => {
    expect(isAnalyticsRuntimeAllowed(runtime)).toBe(false)
  })
})
