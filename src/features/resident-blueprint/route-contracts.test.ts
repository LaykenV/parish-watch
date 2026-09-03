import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import type { FileRoutesByFullPath } from '../../routeTree.gen'
import {
  RESIDENT_BLUEPRINT_KEYS,
  getResidentBlueprint,
} from './route-contracts'

type ResidentRoutePath = Exclude<
  keyof FileRoutesByFullPath,
  '/' | '/operations/coverage'
>

const EXPECTED_RESIDENT_ROUTES = [
  '/for-you',
  '/explore',
  '/ask',
  '/coverage',
  '/coverage/request',
  '/issues',
  '/issues/$issueSlug',
  '/decisions/$recordKey',
  '/meetings/$meetingId',
  '/how-it-works',
  '/privacy',
  '/following',
  '/following/areas-and-topics',
  '/following/notifications',
  '/email/manage/$token',
] as const satisfies readonly ResidentRoutePath[]

const routeGraphIsComplete: Exclude<
  ResidentRoutePath,
  (typeof EXPECTED_RESIDENT_ROUTES)[number]
> extends never
  ? true
  : false = true

const forYouRoute = readFileSync(
  new URL('../../routes/for-you.tsx', import.meta.url),
  'utf8',
)
const issuesRoute = readFileSync(
  new URL('../../routes/issues_.tsx', import.meta.url),
  'utf8',
)

describe('resident interface Slice 1 contracts', () => {
  it('accounts for every resident route outside the existing home page', () => {
    expect(EXPECTED_RESIDENT_ROUTES).toHaveLength(15)
    expect(routeGraphIsComplete).toBe(true)
  })

  it.each(RESIDENT_BLUEPRINT_KEYS)(
    'keeps the %s hierarchy, controls, and state contract together',
    (key) => {
      const blueprint = getResidentBlueprint(key)

      expect(blueprint.title).not.toBe('')
      expect(blueprint.description).not.toBe('')
      expect(blueprint.actions.length).toBeGreaterThan(0)
      expect(blueprint.sections.length).toBeGreaterThan(0)
      expect(blueprint.states.length).toBeGreaterThan(0)
    },
  )

  it('folds the legacy discovery indexes into Home', () => {
    expect(forYouRoute).toContain("redirect({ replace: true, to: '/' })")
    expect(issuesRoute).toContain("hash: 'current-issues'")
    expect(issuesRoute).toContain("to: '/'")
  })
})
