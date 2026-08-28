import { expect, test } from 'vitest'

import { collectDiscoveryCandidates } from './discovery'

test('keeps bounded official document candidates and preserves query URLs', () => {
  const candidates = collectDiscoveryCandidates(
    [
      {
        seedUrl: 'https://www.lafayettela.gov/councils/',
        links: [
          {
            url: 'https://apps.lafayettela.gov/OBCouncil/ViewDocument.aspx?docID=42#page=1',
            title: 'Regular meeting agenda',
          },
          {
            url: 'https://example.com/minutes.pdf',
            title: 'Council minutes',
          },
          {
            url: 'https://www.lafayettela.gov/about/',
            title: 'About Lafayette',
          },
        ],
      },
    ],
    ['lafayettela.gov', 'apps.lafayettela.gov'],
    1,
  )

  expect(candidates).toEqual([
    {
      url: 'https://apps.lafayettela.gov/OBCouncil/ViewDocument.aspx?docID=42',
      title: 'Regular meeting agenda',
      description: undefined,
      discoveredFrom: ['https://www.lafayettela.gov/councils/'],
      matchedTerms: ['agenda', 'council', 'document', 'meeting'],
    },
  ])
})
