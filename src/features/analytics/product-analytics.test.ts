import { describe, expect, it } from 'vitest'

import {
  getPersistentVisitorId,
  isAnalyticsRuntimeAllowed,
} from './product-analytics'

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

describe('persistent analytics identity', () => {
  it('uses a stored identifier or writes and reads back a new one', () => {
    let value: string | null = 'existing-id'
    const storage = {
      getItem: () => value,
      setItem: (_key: string, next: string) => {
        value = next
      },
    }

    expect(getPersistentVisitorId(storage, () => 'new-id')).toBe('existing-id')
    value = null
    expect(getPersistentVisitorId(storage, () => 'new-id')).toBe('new-id')
  })

  it('skips measurement when storage rejects or drops the identifier', () => {
    const rejected = {
      getItem: () => null,
      setItem: () => {
        throw new Error('storage blocked')
      },
    }
    const dropped = {
      getItem: () => null,
      setItem: () => undefined,
    }

    expect(getPersistentVisitorId(rejected, () => 'new-id')).toBeNull()
    expect(getPersistentVisitorId(dropped, () => 'new-id')).toBeNull()
  })
})
