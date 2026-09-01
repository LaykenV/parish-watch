import { describe, expect, it } from 'vitest'

import {
  EXPLORE_ROW_FIXTURES,
  ISSUE_FIXTURES,
  UPCOMING_FIXTURES,
} from '../discovery/fixtures'
import { parseEvidenceSearch, resolveCitationId } from './contracts'
import {
  applyLiveUpdate,
  artifactTone,
  documentHost,
  evidenceSheetSize,
  issueSections,
} from './evidence-model'
import { ISSUE_DETAIL_FIXTURES, ISSUE_LIVE_UPDATE } from './fixtures'
import {
  DECISION_DETAIL_FIXTURES,
  MEETING_DETAIL_FIXTURES,
} from './record-fixtures'
import type { CitationMap } from './contracts'

function collectCitationIds(value: unknown, found: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const entry of value) collectCitationIds(entry, found)
    return found
  }
  if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      if (key === 'citationId' && typeof entry === 'string') found.push(entry)
      else collectCitationIds(entry, found)
    }
  }
  return found
}

function expectResolvable(
  citations: CitationMap,
  page: unknown,
  label: string,
) {
  for (const id of collectCitationIds(page)) {
    expect(`${label}: ${id}`).toBe(
      `${label}: ${resolveCitationId(citations, id) ?? 'unresolved'}`,
    )
  }
}

describe('resident interface Slice 3 evidence contracts', () => {
  it('keeps only citation ids the page actually publishes', () => {
    const fixture = ISSUE_DETAIL_FIXTURES['drainage-fee-credit-cap']
    expect(fixture).not.toBeNull()
    expect(resolveCitationId(fixture.citations, 'drainage.next')).toBe(
      'drainage.next',
    )
    expect(resolveCitationId(fixture.citations, 'surplus.outcome')).toBeNull()
    expect(resolveCitationId(fixture.citations, 'toString')).toBeNull()
    expect(resolveCitationId(fixture.citations, undefined)).toBeNull()
  })

  it('validates the citation and development scenario URL state', () => {
    expect(parseEvidenceSearch({ fixture: 'preview' })).toEqual({
      fixture: 'preview',
      returnTo: undefined,
      source: undefined,
    })
    expect(parseEvidenceSearch({ fixture: 'update', source: ' x ' })).toEqual({
      fixture: 'update',
      returnTo: undefined,
      source: 'x',
    })
    expect(parseEvidenceSearch({ fixture: 'invented', source: '   ' })).toEqual(
      { fixture: undefined, returnTo: undefined, source: undefined },
    )
  })

  it('omits sections a limited source cannot support', () => {
    const limited = ISSUE_DETAIL_FIXTURES['downtown-late-night-permits']
    const full = ISSUE_DETAIL_FIXTURES['drainage-fee-credit-cap']

    expect(issueSections(limited).factors).toBe(false)
    expect(issueSections(limited).publicActions).toBe(false)
    expect(limited.issue.limitedNote).toBeTruthy()
    expect(issueSections(full).factors).toBe(true)
    expect(issueSections(full).publicActions).toBe(true)
    expect(issueSections(full).uncertain).toBe(true)
  })

  it('moves the accepted date in place when a live update arrives', () => {
    const before = ISSUE_DETAIL_FIXTURES['drainage-fee-credit-cap']
    const after = applyLiveUpdate(before, ISSUE_LIVE_UPDATE)

    expect(before.issue.next?.date).toBe('2026-09-15')
    expect(after.issue.next?.date).toBe('2026-10-06')
    expect(after.issue.changes[0].date).toBe('2026-08-29')
    expect(after.issue.versions[0].version).toBe(4)
    expect(after.issue.timeline.some((e) => e.date === '2026-09-15')).toBe(
      false,
    )
  })

  it('leaves issues without a live update untouched', () => {
    const surplus = ISSUE_DETAIL_FIXTURES['surplus-pickup-donations']
    expect(applyLiveUpdate(surplus, ISSUE_LIVE_UPDATE)).toBe(surplus)
  })

  it('opens the full sheet for a warning or a long excerpt', () => {
    const surplus = ISSUE_DETAIL_FIXTURES['surplus-pickup-donations']
    const permits = ISSUE_DETAIL_FIXTURES['downtown-late-night-permits']

    expect(evidenceSheetSize(surplus.citations['surplus.outcome']!)).toBe(
      'full',
    )
    expect(evidenceSheetSize(permits.citations['permits.title']!)).toBe(
      'medium',
    )
  })

  it('separates healthy, late, and unmonitored meeting artifacts', () => {
    expect(artifactTone('Available')).toBe('ok')
    expect(artifactTone('Delayed')).toBe('warning')
    expect(artifactTone('Not published')).toBe('muted')
    expect(artifactTone('Expected after the meeting')).toBe('muted')
    expect(artifactTone('Not monitored')).toBe('muted')
  })

  it('names the destination of every official document link', () => {
    expect(
      documentHost('https://apps.lafayettela.gov/obcouncil/index.html'),
    ).toBe('apps.lafayettela.gov')
    expect(documentHost('not a url')).toBe('not a url')
  })

  it('resolves every Source control against its own page evidence', () => {
    for (const [slug, fixture] of Object.entries(ISSUE_DETAIL_FIXTURES)) {
      expectResolvable(fixture.citations, fixture.issue, `issue ${slug}`)
    }
    for (const [key, fixture] of Object.entries(DECISION_DETAIL_FIXTURES)) {
      expectResolvable(fixture.citations, fixture.decision, `decision ${key}`)
    }
    for (const [id, fixture] of Object.entries(MEETING_DETAIL_FIXTURES)) {
      expectResolvable(fixture.citations, fixture.meeting, `meeting ${id}`)
    }
  })

  it('opens a real page for every record the prototype links to', () => {
    const issues = new Set(Object.keys(ISSUE_DETAIL_FIXTURES))
    const decisions = new Set(Object.keys(DECISION_DETAIL_FIXTURES))
    const meetings = new Set(Object.keys(MEETING_DETAIL_FIXTURES))

    for (const card of ISSUE_FIXTURES) expect(issues).toContain(card.slug)

    for (const item of [...UPCOMING_FIXTURES, ...EXPLORE_ROW_FIXTURES]) {
      const [, kind, key] = item.href.split('/')
      if (kind === 'issues') expect(issues).toContain(key)
      if (kind === 'decisions') expect(decisions).toContain(key)
      if (kind === 'meetings') expect(meetings).toContain(key)
    }

    for (const fixture of Object.values(ISSUE_DETAIL_FIXTURES)) {
      for (const entry of fixture.issue.timeline) {
        if (entry.recordKey) expect(decisions).toContain(entry.recordKey)
      }
      for (const entry of fixture.issue.uncertain) {
        if (entry.recordKey) expect(decisions).toContain(entry.recordKey)
      }
      if (fixture.issue.historical) {
        expect(issues).toContain(fixture.issue.historical.slug)
      }
    }

    for (const fixture of Object.values(DECISION_DETAIL_FIXTURES)) {
      if (fixture.decision.issue) {
        expect(issues).toContain(fixture.decision.issue.slug)
      }
    }

    for (const fixture of Object.values(MEETING_DETAIL_FIXTURES)) {
      for (const slug of fixture.meeting.issueSlugs) {
        expect(issues).toContain(slug)
      }
      for (const row of [
        ...fixture.meeting.decisions,
        ...fixture.meeting.routine,
      ]) {
        expect(decisions).toContain(row.recordKey)
        expect(DECISION_DETAIL_FIXTURES[row.recordKey].decision.title).toBe(
          row.title,
        )
      }
    }
  })

  it('keeps every fixture description as internal QA metadata', () => {
    const fixtures = [
      ...Object.values(ISSUE_DETAIL_FIXTURES),
      ...Object.values(DECISION_DETAIL_FIXTURES),
      ...Object.values(MEETING_DETAIL_FIXTURES),
    ]
    expect(fixtures.every((fixture) => fixture.scenarioLabel.length > 0)).toBe(
      true,
    )
  })
})
