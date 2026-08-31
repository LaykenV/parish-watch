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
    })
    expect(parseFollowingSearch({ fixture: 'invented' })).toEqual({
      fixture: undefined,
    })
    expect(parseEmailManagementSearch({ fixture: 'valid' })).toEqual({
      fixture: 'valid',
    })
    expect(parseEmailManagementSearch({ fixture: 'admin' })).toEqual({
      fixture: undefined,
    })
  })

  it('uses resident-readable delivery labels', () => {
    expect(frequencyLabel('immediate')).toBe('Immediate material updates')
    expect(frequencyLabel('weekly')).toBe('Weekly roundup')
    expect(frequencyLabel('both')).toBe('Immediate updates and weekly roundup')
  })
})
