import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactNode } from 'react'

import { ISSUE_FIXTURES } from '../discovery/fixtures'
import type { EvidenceSearch } from './contracts'
import { ISSUE_DETAIL_FIXTURES, ISSUE_LIVE_UPDATE } from './fixtures'
import {
  DECISION_DETAIL_FIXTURES,
  MEETING_DETAIL_FIXTURES,
} from './record-fixtures'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="#">{children}</a>,
  useNavigate: () => () => {},
  useRouterState: ({
    select,
  }: {
    select: (state: { location: { search: { fixture: string } } }) => unknown
  }) => select({ location: { search: { fixture: 'preview' } } }),
}))

const { DecisionPage } = await import('./decision-page')
const { IssuePage } = await import('./issue-page')
const { MeetingPage } = await import('./meeting-page')

const noop = () => {}

function issue(slug: string, search: EvidenceSearch = { fixture: 'preview' }) {
  const fixture = search.fixture ? ISSUE_DETAIL_FIXTURES[slug] : undefined
  return renderToStaticMarkup(
    <IssuePage
      data={
        fixture
          ? {
              fixture,
              liveUpdate:
                search.fixture === 'update' ? ISSUE_LIVE_UPDATE : null,
            }
          : null
      }
      onSelectSource={noop}
      search={search}
      slug={slug}
    />,
  )
}

function decision(
  recordKey: string,
  search: EvidenceSearch = { fixture: 'preview' },
) {
  const fixture = search.fixture
    ? DECISION_DETAIL_FIXTURES[recordKey]
    : undefined
  return renderToStaticMarkup(
    <DecisionPage
      fixture={fixture ?? null}
      onSelectSource={noop}
      recordKey={recordKey}
      search={search}
    />,
  )
}

function meeting(
  meetingId: string,
  search: EvidenceSearch = { fixture: 'preview' },
) {
  const fixture = search.fixture
    ? MEETING_DETAIL_FIXTURES[meetingId]
    : undefined
  const issues = fixture
    ? fixture.meeting.issueSlugs
        .map((slug) => ISSUE_FIXTURES.find((entry) => entry.slug === slug))
        .filter((entry) => entry !== undefined)
    : []
  return renderToStaticMarkup(
    <MeetingPage
      data={fixture ? { fixture, issues } : null}
      meetingId={meetingId}
      onSelectSource={noop}
      search={search}
    />,
  )
}

function order(html: string, marks: string[]): number[] {
  return marks.map((mark) => {
    const index = html.indexOf(mark)
    expect(`${mark} present`).toBe(index >= 0 ? `${mark} present` : 'missing')
    return index
  })
}

function isSorted(positions: number[]): boolean {
  return positions.every(
    (value, index) => index === 0 || value > positions[index - 1],
  )
}

/* Every claim block must carry its own Source control. */
function claimsWithoutSource(html: string): number {
  return html
    .split('class="ev-claim"')
    .slice(1)
    .filter((segment) => !segment.includes('ev-source')).length
}

describe('resident interface Slice 3 pages', () => {
  it('keeps the issue reading order from place to sources', () => {
    const html = issue('drainage-fee-credit-cap')

    expect(
      isSorted(
        order(html, [
          'Lafayette City-Parish Council',
          'Lafayette plans to lower the cap',
          'Final vote',
          'Evidence available',
          'Follow this issue',
          'What is happening',
          'What the public can still do',
          'Why this may matter',
          'Ask Public Parish',
          'Decision timeline',
          'What changed',
          'Sources and update history',
        ]),
      ),
    ).toBe(true)
  })

  it('gives every material claim a Source control', () => {
    expect(claimsWithoutSource(issue('drainage-fee-credit-cap'))).toBe(0)
    expect(claimsWithoutSource(issue('surplus-pickup-donations'))).toBe(0)
    expect(claimsWithoutSource(decision('CO-022-2026'))).toBe(0)
  })

  it('opens the deep-linked citation and ignores an unknown one', () => {
    expect(
      issue('drainage-fee-credit-cap', {
        fixture: 'preview',
        source: 'drainage.next',
      }),
    ).toContain('data-selected=""')
    expect(
      issue('drainage-fee-credit-cap', {
        fixture: 'preview',
        source: 'surplus.outcome',
      }),
    ).not.toContain('data-selected=""')
  })

  it('does not render fixture records without an explicit QA scenario', () => {
    expect(issue('drainage-fee-credit-cap', {})).toContain(
      'Public Parish has no issue at this address.',
    )
    expect(decision('CO-022-2026', {})).toContain(
      'Public Parish has no decision record at this address.',
    )
    expect(meeting('lafayette-city-council-2026-09-08', {})).toContain(
      'Public Parish has no meeting at this address.',
    )
  })

  it('keeps fixture pages free of resident-facing fixture banners', () => {
    const html = issue('drainage-fee-credit-cap')
    expect(html).not.toContain('Design fixture')
    expect(html).not.toContain('design-only fixture data')
  })

  it('shows a decided issue without inventing a next date', () => {
    const html = issue('surplus-pickup-donations')

    expect(html).toContain('Council approved')
    expect(html).not.toContain('Final vote')
    expect(html).toContain('Public Parish correction')
  })

  it('removes unsupported sections from a limited issue', () => {
    const html = issue('downtown-late-night-permits')

    expect(html).toContain('Limited information')
    expect(html).not.toContain('Why this may matter')
    expect(html).not.toContain('What the public can still do')
    expect(html).toContain('Decision timeline')
  })

  it('keeps a delayed source visible with its date', () => {
    const html = issue('courthouse-security-contract')

    expect(html).toContain('Source delayed')
    expect(html).toContain('last version Public Parish accepted')
  })

  it('points a historical issue at the newer one without hiding its evidence', () => {
    const html = issue('lafayette-drainage-credit-review')

    expect(html).toContain('A newer issue continues this timeline')
    expect(html).toContain('View the newer issue')
    expect(html).toContain('Decision timeline')
  })

  it('offers recovery instead of guessing an unknown record', () => {
    expect(issue('not-a-real-issue')).toContain('Search records')
    expect(decision('not-a-real-record')).toContain('Search records')
    expect(meeting('not-a-real-meeting')).toContain('Check coverage')
  })

  it('leads a decision record with its issue and keeps the government wording', () => {
    const html = decision('CO-022-2026')

    expect(
      isSorted(
        order(html, [
          'Part of the issue',
          'Authorize a cooperative endeavor agreement',
          'CO-022-2026</span>',
          'What this record does',
          'Accepted details',
          'Official item title',
          'AN ORDINANCE AUTHORIZING THE LAFAYETTE CITY-PARISH PRESIDENT',
          'Sources and update history',
        ]),
      ),
    ).toBe(true)
  })

  it('keeps a record limited when its newest source supports less', () => {
    const html = decision('res-recycling-contract-2026')

    expect(html).toContain('Not stated in the available source')
    expect(html).toContain('newest official source supports less')
    expect(html).toContain('Version 2')
  })

  it('states when each meeting document is expected', () => {
    const before = meeting('lafayette-city-council-2026-09-08')
    const after = meeting('lafayette-city-parish-council-2026-04-21')
    const late = meeting('lafayette-planning-commission-2026-09-03')

    expect(before).toContain('Expected after the meeting')
    expect(before).toContain('Public Parish last checked')
    expect(after).toContain('Open minutes')
    expect(late).toContain('Delayed')
    expect(late).not.toContain('Open agenda<')
  })

  it('collapses routine meeting records behind a count', () => {
    const html = meeting('lafayette-city-parish-council-2026-04-21')

    expect(html).toContain('2 routine records')
    expect(html).toContain('Routine records stay searchable in Explore')
  })
})
