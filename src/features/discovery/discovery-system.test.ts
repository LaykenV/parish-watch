import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { buttonVariants } from '../../components/ui/button'
import { withAllFilterOption } from './filter-pill'

const css = readFileSync(new URL('./discovery.css', import.meta.url), 'utf8')
const contracts = readFileSync(
  new URL('./contracts.ts', import.meta.url),
  'utf8',
)
const home = readFileSync(new URL('./home.tsx', import.meta.url), 'utf8')
const explore = readFileSync(new URL('./explore.tsx', import.meta.url), 'utf8')
const issueCard = readFileSync(
  new URL('./issue-card.tsx', import.meta.url),
  'utf8',
)
const notice = readFileSync(new URL('./notice.tsx', import.meta.url), 'utf8')
const sheet = readFileSync(new URL('./sheet.tsx', import.meta.url), 'utf8')
const blueprint = readFileSync(
  new URL('../resident-blueprint/blueprint-page.tsx', import.meta.url),
  'utf8',
)
const shell = readFileSync(
  new URL('../resident-blueprint/resident-shell.tsx', import.meta.url),
  'utf8',
)

describe('resident interface control system', () => {
  it('keeps the shared discovery button at a 44-pixel rendered height', () => {
    expect(buttonVariants({ size: 'touch' })).toContain('h-11')
  })

  it('uses the Coss primary and outline button treatments', () => {
    expect(buttonVariants({ variant: 'default' })).toContain('bg-primary')
    expect(buttonVariants({ variant: 'default' })).toContain(
      'shadow-primary/24',
    )
    expect(buttonVariants({ variant: 'outline' })).toContain('border-input')
    expect(buttonVariants({ variant: 'outline' })).toContain('bg-popover')
  })

  it('keeps card evidence and update-kind base rules singular', () => {
    expect(css.match(/^\.pp-card-evidence \{/gm)).toHaveLength(1)
    expect(css.match(/^\.pp-update-kind \{/gm)).toHaveLength(1)
  })

  it('uses the shared type and color tokens throughout discovery styles', () => {
    expect(css).not.toMatch(/font-size:\s*[0-9.]+rem/)
    expect(css).not.toContain('rgb(')
    expect(css).toContain('font-size: var(--pp-text-caption)')
  })

  it('keeps responsive hooks inside discovery instead of importing the shell', () => {
    expect(sheet).not.toContain('resident-blueprint/resident-shell')
    expect(sheet).toContain("from './hooks'")
  })

  it('offers one area-selection trigger in first-visit setup', () => {
    expect(home).not.toContain('Show local decisions')
  })

  it('keeps fixture scenarios as QA hooks without visible fixture banners', () => {
    expect(home).not.toContain('FixtureBanner')
    expect(explore).not.toContain('FixtureBanner')
    expect(notice).not.toContain('Design fixture')
    expect(blueprint).not.toContain('blueprint-fixture-notice')
    expect(contracts).toContain('import.meta.env.DEV')
    expect(home).toContain('usePublishedDecisions')
    expect(home).toContain('usePublishedIssues')
    expect(home).toContain('IssuesSection')
    expect(explore).toContain('fixturesEnabled')
  })

  it('uses a labeled lifecycle pill and a Louisiana coverage icon', () => {
    expect(issueCard).toContain('className="pp-card-state"')
    expect(issueCard).not.toContain('pp-dot')
    expect(shell).toContain('icon: LouisianaIcon')
    expect(shell).not.toContain('ShieldCheckIcon')
  })

  it('lets residents clear one More filters group', () => {
    expect(withAllFilterOption(['Scheduled', 'Decided'], 'All states')).toEqual(
      [
        { label: 'All states', value: '' },
        { label: 'Scheduled', value: 'Scheduled' },
        { label: 'Decided', value: 'Decided' },
      ],
    )
  })

  it('shows Sort only when Explore renders a sortable result sequence', () => {
    expect(explore).toContain("viewMode === 'results'")
    expect(explore).toContain('label="Sort"')
  })
})
