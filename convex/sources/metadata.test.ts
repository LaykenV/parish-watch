import { expect, test } from 'vitest'

import { normalizeFirecrawlMetadata } from './metadata'

test('normalizes provider metadata into bounded Convex-safe values', () => {
  expect(
    normalizeFirecrawlMetadata({
      statusCode: 200,
      sourceURL: 'https://lafayettela.gov/',
      position: ['1', '2'],
      nested: { provider: 'firecrawl' },
      mixed: ['one', 2],
      _private: 'drop',
    }),
  ).toEqual({
    statusCode: 200,
    sourceURL: 'https://lafayettela.gov/',
    position: ['1', '2'],
    nested: '{"provider":"firecrawl"}',
    mixed: '["one",2]',
  })
})
