import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { buttonVariants } from '../../components/ui/button'

const css = readFileSync(new URL('./discovery.css', import.meta.url), 'utf8')
const home = readFileSync(new URL('./home.tsx', import.meta.url), 'utf8')
const forYou = readFileSync(new URL('./for-you.tsx', import.meta.url), 'utf8')
const sheet = readFileSync(new URL('./sheet.tsx', import.meta.url), 'utf8')

describe('resident interface control system', () => {
  it('keeps the shared discovery button at a 44-pixel rendered height', () => {
    expect(buttonVariants({ size: 'touch' })).toContain('h-11')
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
    expect(forYou).not.toContain('Show local decisions')
  })
})
