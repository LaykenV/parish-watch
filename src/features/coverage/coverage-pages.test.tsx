import { readFileSync } from 'node:fs'

import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { CoveragePage, CoverageRequestPage } from './coverage-page'
import { HowItWorksPage } from './how-it-works-page'
import { COVERAGE_REGION_FIXTURES } from './fixtures'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="#">{children}</a>,
}))

vi.mock('convex/react', () => ({
  useAction: () => vi.fn(),
  useMutation: () => vi.fn(),
  useQuery: () => null,
}))

vi.mock('../auth/google-auth', () => ({
  useGoogleAuth: () => ({
    error: null,
    isAuthenticated: false,
    isLoading: false,
    isSigningIn: false,
    signInGoogle: vi.fn(),
  }),
}))

const loaderSource = readFileSync(
  new URL('./coverage-page.data.ts', import.meta.url),
  'utf8',
)
const coveragePageSource = readFileSync(
  new URL('./coverage-page.tsx', import.meta.url),
  'utf8',
)
const reportSource = readFileSync(
  new URL('./source-report.tsx', import.meta.url),
  'utf8',
)
const areaSelectorSource = readFileSync(
  new URL('../discovery/area-selector.tsx', import.meta.url),
  'utf8',
)

describe('resident coverage interface', () => {
  it('keeps coverage records behind an explicit development fixture', () => {
    expect(loaderSource).toContain('const active = getActiveCoverageFixture')
    expect(loaderSource.indexOf('if (!active)')).toBeLessThan(
      loaderSource.indexOf("await import('./fixtures')"),
    )
  })

  it('renders every written coverage state without a beta label', () => {
    const html = renderToStaticMarkup(
      <CoveragePage
        data={{
          available: true,
          regions: COVERAGE_REGION_FIXTURES,
          scenario: 'preview',
        }}
      />,
    )
    expect(html).toContain('Lafayette Parish')
    expect(html).toContain('Rapides Parish')
    expect(html).toContain('East Baton Rouge Parish')
    expect(html).toContain('Supported')
    expect(html).toContain('Degraded')
    expect(html).toContain('Validating sources')
    expect(html).toContain('Paused')
    expect(html).toContain('Not supported')
    expect(html.toLowerCase()).not.toContain('beta')
  })

  it('does not expose fixture body claims when coverage is unavailable', () => {
    const html = renderToStaticMarkup(
      <CoveragePage data={{ available: false, regions: [] }} />,
    )
    expect(html).toContain('Coverage status is not connected yet')
    expect(html).not.toContain('Youngsville City Council')
    expect(html).toContain('accepted Lafayette decision records')
  })

  it('keeps coverage requests separate from source compilation', () => {
    const html = renderToStaticMarkup(
      <CoverageRequestPage data={{ available: true, scenario: 'new' }} />,
    )
    expect(html).toContain('A request records interest')
    expect(html).toContain('does not start source work')
    expect(html).toContain('Email for a launch notice, optional')
    expect(html).toContain('No account or street address is needed')
    expect(html).not.toContain('request count')
  })

  it('keeps fixture parameters conditional on an active development scenario', () => {
    expect(coveragePageSource).not.toContain(
      'search={{ fixture: \'new\' }}',
    )
    expect(coveragePageSource).not.toContain(
      'search={{ fixture: \'preview\' }}',
    )
    expect(coveragePageSource).toContain(
      "data.scenario ? { fixture: 'preview' } : {}",
    )
    expect(coveragePageSource).toContain(
      "data.scenario ? { fixture: 'new' as const } : {}",
    )
  })

  it('moves focus to the next useful action after successful transitions', () => {
    expect(coveragePageSource).toContain(
      "if (step === 'verify') codeRef.current?.focus()",
    )
    expect(coveragePageSource).toContain(
      "if (step === 'complete') completeHeadingRef.current?.focus()",
    )
    expect(reportSource).toContain(
      "if (result === 'sent') returnActionRef.current?.focus()",
    )
  })

  it('puts the resident method before optional technical detail', () => {
    const html = renderToStaticMarkup(<HowItWorksPage />)
    const source = html.indexOf('The source stays beside the claim')
    const standard = html.indexOf('What supported coverage means')
    const technical = html.indexOf('Technical details')
    expect(source).toBeGreaterThan(-1)
    expect(source).toBeLessThan(standard)
    expect(standard).toBeLessThan(technical)
    expect(html).toContain('Publish, limit, or withhold')
    expect(html).toContain(
      'Deterministic checks run the final citation and publication gate.',
    )
    expect(html).not.toContain(
      'Code runs the final citation and publication checks.',
    )
  })

  it('keeps private reporting factual and preserves the attached record', () => {
    expect(reportSource).toContain('Report sent privately')
    expect(reportSource).toContain('does not open a public thread')
    expect(reportSource).toContain('recordUrl')
    expect(reportSource).toContain('provider-failure')
  })

  it('distinguishes available records from complete coverage in area selection', () => {
    expect(areaSelectorSource).toContain('Records available')
    expect(areaSelectorSource).toContain('Validating sources')
    expect(areaSelectorSource).not.toContain('Supported')
  })
})
