import { describe, expect, it } from 'vitest'

import {
  CONNECTED_PROTOTYPE_FLOWS,
  FIXTURE_INTERACTION_HANDOFFS,
  RESIDENT_ROUTE_HANDOFFS,
} from './contracts'
import {
  evidenceJourneySearch,
  parseResidentReturnTo,
  residentReturnLabel,
} from './navigation'

describe('resident implementation handoff', () => {
  it('keeps one contract for every approved sitemap destination', () => {
    expect(RESIDENT_ROUTE_HANDOFFS).toHaveLength(14)
    expect(new Set(RESIDENT_ROUTE_HANDOFFS.map((item) => item.route)).size).toBe(
      14,
    )
    expect(
      RESIDENT_ROUTE_HANDOFFS.every(
        (item) => item.contract.length > 0 && item.owner.length > 0,
      ),
    ).toBe(true)
  })

  it('names an API owner for every fixture-backed write', () => {
    expect(FIXTURE_INTERACTION_HANDOFFS).toHaveLength(9)
    expect(
      FIXTURE_INTERACTION_HANDOFFS.every(
        ([interaction, owner]) => interaction.length > 0 && owner.length > 0,
      ),
    ).toBe(true)
  })

  it('keeps the ten approved connected prototype flows explicit', () => {
    expect(CONNECTED_PROTOTYPE_FLOWS).toHaveLength(10)
    expect(new Set(CONNECTED_PROTOTYPE_FLOWS).size).toBe(10)
  })

  it('accepts only bounded resident return paths', () => {
    expect(
      parseResidentReturnTo(
        '/explore?fixture=update&q=drainage&topic=Public+money',
      ),
    ).toBe('/explore?fixture=update&q=drainage&topic=Public+money')
    expect(parseResidentReturnTo('/issues/example?fixture=preview')).toBe(
      '/issues/example?fixture=preview',
    )
    expect(parseResidentReturnTo('https://example.com/explore')).toBeUndefined()
    expect(parseResidentReturnTo('//example.com/explore')).toBeUndefined()
    expect(parseResidentReturnTo('/explore\\evil')).toBeUndefined()
    expect(parseResidentReturnTo('/admin')).toBeUndefined()
    expect(parseResidentReturnTo(`/explore?q=${'x'.repeat(800)}`)).toBeUndefined()
  })

  it('labels return controls from the route they restore', () => {
    expect(residentReturnLabel('/')).toBe('Back to Home')
    expect(residentReturnLabel('/for-you?fixture=update')).toBe(
      'Back to For You',
    )
    expect(residentReturnLabel('/decisions/CO-022-2026')).toBe(
      'Back to decision record',
    )
  })

  it('pairs fixture evidence with the exact route state it came from', () => {
    expect(
      evidenceJourneySearch({
        currentHref: '/explore?fixture=update&q=drainage',
        fixture: true,
      }),
    ).toEqual({
      fixture: 'preview',
      returnTo: '/explore?fixture=update&q=drainage',
    })
  })
})
