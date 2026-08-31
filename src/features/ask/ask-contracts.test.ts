import { describe, expect, it } from 'vitest'

import type { CitationData } from '../evidence/contracts'
import {
  askScopeKey,
  askScopeIdentity,
  countAnswerSources,
  parseAskSearch,
  routeSearchFromScopeKey,
  shouldConfirmAskScopeChange,
  usedCitations,
} from './contracts'
import type { AskSupportedAnswer } from './contracts'
import { setAskDraftHandoff, takeAskDraftHandoff } from './draft-handoff'

function citation(id: string): CitationData {
  return {
    body: 'Official record body',
    documentKind: 'Minutes',
    documentTitle: `Record ${id}`,
    excerpt: { quote: 'Official record body' },
    id,
    locator: 'Page 1',
    officialUrl: 'https://example.gov/record.pdf',
    retrievedAt: '2026-08-30T12:00:00.000Z',
  }
}

describe('Ask public contracts', () => {
  it('keeps private question text out of parsed route search', () => {
    expect(
      parseAskSearch({
        fixture: 'thread',
        issue: ' drainage-fee-credit-cap ',
        q: 'private question',
        scope: 'issue',
        source: ' drainage.vote ',
      }),
    ).toEqual({
      fixture: 'thread',
      issue: 'drainage-fee-credit-cap',
      scope: 'issue',
      source: 'drainage.vote',
    })
  })

  it('rejects unsupported areas and fixture names', () => {
    expect(
      parseAskSearch({ area: 'outside-coverage', fixture: 'invented' }),
    ).toEqual({
      area: undefined,
      fixture: undefined,
      scope: undefined,
      source: undefined,
    })
  })

  it('round-trips public issue, meeting, and corpus scope keys', () => {
    const searches = [
      { scope: 'issue' as const, issue: 'drainage-fee-credit-cap' },
      { scope: 'meeting' as const, meeting: 'council-2026-08-30' },
      { scope: 'corpus' as const, area: 'lafayette-parish' as const },
    ]

    for (const search of searches) {
      expect(routeSearchFromScopeKey(askScopeKey(search))).toEqual(search)
    }
  })

  it('consumes a private draft once and discards a scope mismatch', () => {
    setAskDraftHandoff('issue:one', 'What changed?')
    expect(takeAskDraftHandoff('issue:one')).toBe('What changed?')
    expect(takeAskDraftHandoff('issue:one')).toBeNull()

    setAskDraftHandoff('issue:one', 'Who voted?')
    expect(takeAskDraftHandoff('issue:two')).toBeNull()
    expect(takeAskDraftHandoff('issue:one')).toBeNull()
  })

  it('confirms only when a populated thread changes evidence scope', () => {
    const issueScope = {
      kind: 'issue' as const,
      issueSlug: 'one',
      label: 'Answering from this issue',
      recordTitle: 'Issue one',
      returnTo: '/issues/one',
    }
    const meetingScope = {
      kind: 'meeting' as const,
      meetingId: 'two',
      label: 'Answering from this meeting',
      recordTitle: 'Meeting two',
      returnTo: '/meetings/two',
    }
    const conversation = {
      id: 'conversation',
      scope: issueScope,
      expiresAt: '2026-09-01T12:00:00.000Z',
      turns: [
        {
          id: 'turn',
          question: 'What changed?',
          askedAt: '2026-08-31T12:00:00.000Z',
          state: 'checking' as const,
        },
      ],
    }

    expect(shouldConfirmAskScopeChange(conversation, meetingScope)).toBe(true)
    expect(shouldConfirmAskScopeChange(conversation, issueScope)).toBe(false)
    expect(
      shouldConfirmAskScopeChange({ ...conversation, turns: [] }, meetingScope),
    ).toBe(false)
  })

  it('keeps area-scoped corpus identities distinct', () => {
    expect(
      askScopeIdentity({
        kind: 'corpus',
        areaKey: 'lafayette-parish',
        label: 'Searching Lafayette Parish',
      }),
    ).toBe('corpus:lafayette-parish')
    expect(
      askScopeIdentity({
        kind: 'corpus',
        areaKey: 'rapides-parish',
        label: 'Searching Rapides Parish',
      }),
    ).toBe('corpus:rapides-parish')
  })

  it('deduplicates cited sources and ignores uncited map entries', () => {
    const answer: AskSupportedAnswer = {
      kind: 'supported',
      lead: { id: 'lead', text: 'Lead', citationIds: ['one'] },
      claims: [{ id: 'detail', text: 'Detail', citationIds: ['one', 'two'] }],
      citations: {
        one: citation('one'),
        two: citation('two'),
        unused: citation('unused'),
      },
      suggestions: [],
    }

    expect(countAnswerSources(answer)).toBe(2)
    expect(usedCitations(answer).map((item) => item.id)).toEqual(['one', 'two'])
  })
})
