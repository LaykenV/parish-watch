import { expect, test } from 'vitest'

import {
  canonicalizeCandidateUrl,
  collectCoverageCandidates,
  discoveryQueries,
} from './candidates'
import type { CoverageRootManifest } from './roots'

const MANIFEST: CoverageRootManifest = {
  bodyKey: 'test-council',
  version: 'v1',
  jurisdictionSlug: 'test-parish',
  jurisdictionName: 'Test Parish',
  bodyName: 'Test Council',
  approvedRootUrl: 'https://www.test.gov/council/',
  identityEvidenceUrls: ['https://www.test.gov/council/'],
  allowedHosts: ['www.test.gov'],
  allowedSubdomainSuffixes: ['records.test.gov'],
  documentHosts: [
    { host: 'files.shared.example', pathPrefixes: ['/test-tenant/'] },
  ],
  checkedAt: '2026-09-03',
}

test('candidate URLs keep document identifiers but discard tracking noise', () => {
  expect(
    canonicalizeCandidateUrl(
      'https://www.test.gov/ViewDocument?id=19&utm_source=email&docid=7#page=2',
    ),
  ).toBe('https://www.test.gov/ViewDocument?docid=7&id=19')
  expect(canonicalizeCandidateUrl('http://www.test.gov/agenda')).toBeNull()
  expect(canonicalizeCandidateUrl('not a url')).toBeNull()
})

test('bounded collection deduplicates official links and quarantines a tenant document host', () => {
  const candidates = collectCoverageCandidates(MANIFEST, [
    {
      source: 'map',
      links: [
        {
          url: 'https://www.test.gov/ViewDocument?id=19&utm_source=map',
          title: 'Council agenda',
        },
        {
          url: 'https://files.shared.example/test-tenant/packet.pdf',
          title: 'Meeting packet',
        },
        { url: 'https://evil.example/agenda.pdf', title: 'Agenda' },
      ],
    },
    {
      source: 'search',
      links: [
        {
          url: 'https://www.test.gov/ViewDocument?id=19',
          description: 'Regular meeting agenda',
        },
        {
          url: 'https://files.shared.example/other/agenda.pdf',
          title: 'Other tenant agenda',
        },
      ],
    },
  ])

  expect(candidates).toHaveLength(2)
  expect(candidates[0]).toMatchObject({
    canonicalUrl: 'https://www.test.gov/ViewDocument?id=19',
    hostDisposition: 'approved',
    discoveredFrom: ['map', 'search'],
  })
  expect(candidates[1]).toMatchObject({
    canonicalUrl: 'https://files.shared.example/test-tenant/packet.pdf',
    hostDisposition: 'document_host',
  })
})

test('search queries name the body and every bounded source family', () => {
  const text = discoveryQueries('Test Council').join(' ')
  expect(text).toContain('Test Council')
  for (const term of [
    'agenda',
    'minutes',
    'packet',
    'ordinance',
    'resolution',
    'planning',
    'zoning',
    'notice',
    'calendar',
  ]) {
    expect(text).toContain(term)
  }
})
