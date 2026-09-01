import { describe, expect, it } from 'vitest'

import type { Id } from '../../../convex/_generated/dataModel'
import type { PublishedIssue } from './live-evidence'
import { toIssueFixture } from './live-evidence'

const citationId = (value: string) => value as Id<'citations'>

const citation = {
  bodyName: 'Rapides Parish Police Jury',
  documentTitle: 'Regular meeting minutes',
  excerpt: 'The jury adopted the millage levy.',
  fieldPath: '/title',
  id: 'citation-dated',
  officialUrl: 'https://www.rapidesparish.gov/minutes.pdf',
  page: 3,
  retrievedAt: 1_788_000_000_000,
  section: null,
  sourceKind: 'minutes' as const,
}

const publishedIssue: PublishedIssue = {
  bodyName: 'Rapides Parish Police Jury',
  changes: [],
  citations: [citation, { ...citation, id: 'citation-undated' }],
  claimCitationIds: {
    lifecycleState: [],
    nextAt: [],
    nextDescription: [],
    summary: ['citation-dated'],
    title: ['citation-dated'],
  },
  factors: [],
  lifecycleState: 'decided',
  links: [
    {
      citationIds: [citationId('citation-undated')],
      lifecycleState: null,
      meetingAt: null,
      reason: 'The minutes name the same millage levy.',
      recordKey: 'record-undated',
      relationship: 'same_government_action',
      summary: null,
      title: 'A limited record with no published meeting date',
    },
    {
      citationIds: [citationId('citation-dated')],
      lifecycleState: 'decided',
      meetingAt: '2026-02-09T00:00:00.000Z',
      reason: 'The minutes record the adoption.',
      recordKey: 'record-dated',
      relationship: 'same_government_action',
      summary: 'The jury adopted the levy.',
      title: 'A full record with a published meeting date',
    },
  ],
  mode: 'full',
  nextKnownAction: null,
  placeName: 'Rapides Parish',
  placeSlug: 'rapides-parish',
  publicActions: [],
  revision: 'issue-version-1',
  slug: 'millage-levy',
  summary: 'The jury set the 2026 millage levy.',
  title: '2026 millage levy',
  topics: ['Taxes'],
  versions: [],
}

describe('published issue timeline', () => {
  it('leaves an undated link undated instead of showing the retrieval date', () => {
    const fixture = toIssueFixture(publishedIssue)
    const undated = fixture?.issue.timeline.find(
      (entry) => entry.recordKey === 'record-undated',
    )

    expect(undated?.date).toBeUndefined()
  })

  it('keeps undated links after the dated ones', () => {
    const fixture = toIssueFixture(publishedIssue)

    expect(fixture?.issue.timeline.map((entry) => entry.recordKey)).toEqual([
      'record-dated',
      'record-undated',
    ])
  })
})
