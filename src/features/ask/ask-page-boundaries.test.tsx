import { readFileSync } from 'node:fs'

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { CitationData } from '../evidence/contracts'
import { EvidenceProvider } from '../evidence/evidence-surface'
import { AskAnswer } from './ask-answer'
import type { AskNotFoundAnswer } from './contracts'

const page = readFileSync(new URL('./ask-page.tsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('./ask.css', import.meta.url), 'utf8')
const route = readFileSync(
  new URL('../../routes/ask.tsx', import.meta.url),
  'utf8',
)

const contactCitation: CitationData = {
  body: 'Call the Clerk of Council at 337-555-0100.',
  documentKind: 'Public notice',
  documentTitle: 'Council public notice',
  excerpt: { quote: 'Call the Clerk of Council at 337-555-0100.' },
  id: 'contact',
  locator: 'Contact section',
  officialUrl: 'https://example.gov/public-notice',
  retrievedAt: '2026-08-30T12:00:00.000Z',
}

describe('Ask page ship boundaries', () => {
  it('compile-time gates the fixture import from production', () => {
    expect(page).toContain('if (!import.meta.env.DEV || !data.scenario) return')
    expect(page.indexOf('!import.meta.env.DEV')).toBeLessThan(
      page.indexOf("import('./fixtures')"),
    )
  })

  it('locks submission before awaiting the adapter', () => {
    expect(page.indexOf('submitLock.current = true')).toBeLessThan(
      page.indexOf('await adapter.submit'),
    )
    expect(page).toContain('if (!adapter || !canSubmit || submitLock.current)')
    expect(page).toContain('checking || submitting')
  })

  it('uses one compact active-thread control instead of covering the answer', () => {
    expect(page).toContain('className="ask-compose-open"')
    expect(page).toContain('sticky && !composerExpanded && draft.length === 0')
    expect(css).toContain('.ask-compose-open')
    expect(css).toContain('width: fit-content')
    expect(css).toContain('margin-left: auto')
  })

  it('attaches scope confirmation to the route-change path', () => {
    expect(page).toContain(
      'shouldConfirmAskScopeChange(activeConversation, data.scope)',
    )
    expect(page).toContain(
      'setPendingScope({ draft: handed, scope: data.scope })',
    )
    expect(page).toContain('onRestoreScope(viewScope)')
    expect(page).not.toContain('turns.length > 0) {\n        setPendingHandle')
    expect(route).toContain('routeSearchFromScopeKey(askScopeIdentity(scope))')
  })

  it('renders the named official contact and its cited value', () => {
    const answer: AskNotFoundAnswer = {
      kind: 'not_found',
      statement: 'The published evidence does not answer that question.',
      citations: { contact: contactCitation },
      officialContact: {
        label: 'Clerk of Council',
        value: '337-555-0100',
        sourceId: 'contact',
      },
      suggestions: [],
    }
    const html = renderToStaticMarkup(
      <EvidenceProvider
        citations={answer.citations}
        onSelect={() => {}}
        selected={null}
      >
        <AskAnswer answer={answer} onSuggestion={() => {}} />
      </EvidenceProvider>,
    )

    expect(html).toContain('Clerk of Council')
    expect(html).toContain('337-555-0100')
    expect(html).toContain('Source')
  })
})
