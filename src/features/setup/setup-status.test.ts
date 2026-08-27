import { describe, expect, it } from 'vitest'

import { describeBackendState } from './setup-status'

describe('describeBackendState', () => {
  it('reports a live Convex connection', () => {
    expect(describeBackendState('ready')).toBe('Convex connected')
  })

  it('keeps the initial state honest', () => {
    expect(describeBackendState(undefined)).toBe('Connecting to Convex')
  })
})
