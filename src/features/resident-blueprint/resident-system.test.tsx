import { readFileSync } from 'node:fs'

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Button, buttonVariants } from '../../components/ui/button'
import { residentRouteLabel } from './resident-shell'

const shellSource = readFileSync(
  new URL('./resident-shell.tsx', import.meta.url),
  'utf8',
)
const shellCss = readFileSync(
  new URL('./resident-blueprint.css', import.meta.url),
  'utf8',
)
const homeSource = readFileSync(
  new URL('../discovery/home.tsx', import.meta.url),
  'utf8',
)
const forYouSource = readFileSync(
  new URL('../discovery/for-you.tsx', import.meta.url),
  'utf8',
)
const exploreSource = readFileSync(
  new URL('../discovery/explore.tsx', import.meta.url),
  'utf8',
)
const discoveryCss = readFileSync(
  new URL('../discovery/discovery.css', import.meta.url),
  'utf8',
)
const sheetSource = readFileSync(
  new URL('../discovery/sheet.tsx', import.meta.url),
  'utf8',
)
const evidenceSurfaceSource = readFileSync(
  new URL('../evidence/evidence-surface.tsx', import.meta.url),
  'utf8',
)

describe('resident interface Slice 7 system', () => {
  it('keeps action labels visible inside a stable loading slot', () => {
    const idle = renderToStaticMarkup(
      <Button loading={false}>Request coverage</Button>,
    )
    const loading = renderToStaticMarkup(
      <Button loading>Request coverage</Button>,
    )

    expect(buttonVariants()).not.toContain('data-loading:text-transparent')
    expect(idle).toContain('data-slot="button-loading-slot"')
    expect(loading).toContain('data-slot="button-loading-slot"')
    expect(loading).toContain('data-slot="button-loading-indicator"')
    expect(loading).toContain('aria-busy="true"')
    expect(loading).toContain('Request coverage')
  })

  it('names every resident route family for navigation announcements', () => {
    expect(residentRouteLabel('/')).toBe('Home')
    expect(residentRouteLabel('/for-you')).toBe('For You')
    expect(residentRouteLabel('/coverage/request')).toBe('Request coverage')
    expect(residentRouteLabel('/issues/drainage-fee-credit-cap')).toBe('Issue')
    expect(residentRouteLabel('/decisions/CO-022-2026')).toBe('Decision record')
    expect(residentRouteLabel('/meetings/lafayette-2026-09-15')).toBe('Meeting')
    expect(residentRouteLabel('/email/manage/example')).toBe(
      'Manage this follow',
    )
  })

  it('focuses the route heading and announces completion without moving scroll', () => {
    expect(shellSource).toContain("'#resident-main h1'")
    expect(shellSource).toContain("heading?.setAttribute('tabindex', '-1')")
    expect(shellSource).toContain('heading?.focus({ preventScroll: true })')
    expect(shellSource).toContain('page loaded.`')
    expect(shellSource).toContain('aria-atomic="true"')
  })

  it('announces accepted feed refreshes from all discovery routes', () => {
    expect(homeSource).toContain('Feed updated from the official record.')
    expect(forYouSource).toContain('Your feed is updated.')
    expect(exploreSource).toContain('Explore results are updated.')
  })

  it('applies reduced motion to route and action spinners', () => {
    expect(shellCss).toContain("[data-slot='button-loading-indicator']")
    expect(shellCss).toContain('animation-duration: 1ms !important')
    expect(shellCss).toContain('animation-iteration-count: 1 !important')
  })

  it('gives the Explore text input the full shared control height', () => {
    const searchInputRule = discoveryCss.match(
      /\.pp-search-field input \{[\s\S]*?\n\}/,
    )?.[0]

    expect(searchInputRule).toContain('min-height: var(--pp-control-height)')
  })

  it('moves focus into every sheet after its opening motion completes', () => {
    expect(sheetSource).toContain('initialFocus={resolveInitialFocus}')
    expect(sheetSource).not.toContain('onClick={() => onOpenChange(false)}')
    expect(sheetSource).toContain('inert={open ? undefined : true}')
    expect(sheetSource).toContain('target?.focus()')
    expect(sheetSource).toContain(
      'window.clearTimeout(focusReturnTimerRef.current)',
    )
    expect(sheetSource).toContain('openerRef.current = event.currentTarget')
    expect(sheetSource).toContain(
      'finalFocus={triggerId ? resolveFinalFocus : undefined}',
    )
    expect(evidenceSurfaceSource).toContain('restoreFocus()')
    expect(evidenceSurfaceSource).toContain('SHEET_FOCUS_RETURN_DELAY_MS')
  })
})
