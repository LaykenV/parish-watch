import { describe, expect, it } from 'vitest'

import {
  frequencyLabel,
  parseEmailManagementSearch,
  parseFollowingSearch,
} from './contracts'

describe('following route contracts', () => {
  it('keeps only named development scenarios', () => {
    expect(parseFollowingSearch({ fixture: 'active' })).toEqual({
      fixture: 'active',
      returnTo: undefined,
    })
    expect(parseFollowingSearch({ fixture: 'invented' })).toEqual({
      fixture: undefined,
      returnTo: undefined,
    })
    expect(parseEmailManagementSearch({ fixture: 'valid' })).toEqual({
      fixture: 'valid',
    })
    expect(parseEmailManagementSearch({ fixture: 'admin' })).toEqual({
      fixture: undefined,
    })
  })

  it('keeps only safe resident return paths', () => {
    expect(
      parseFollowingSearch({
        returnTo: '/issues/drainage-fee-credit-cap?source=agenda#vote',
      }).returnTo,
    ).toBe('/issues/drainage-fee-credit-cap?source=agenda#vote')
    expect(
      parseFollowingSearch({ returnTo: 'https://example.com/account' })
        .returnTo,
    ).toBeUndefined()
    expect(
      parseFollowingSearch({ returnTo: '//example.com' }).returnTo,
    ).toBeUndefined()
  })

  it('uses resident-readable delivery labels', () => {
    expect(frequencyLabel('immediate')).toBe('Immediate material updates')
    expect(frequencyLabel('weekly')).toBe('Weekly roundup')
    expect(frequencyLabel('both')).toBe('Immediate updates and weekly roundup')
  })
})
