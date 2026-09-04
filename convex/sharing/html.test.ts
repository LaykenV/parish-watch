import { expect, test } from 'vitest'
import { issueShareHtml } from './html'

test('share metadata escapes hostile title and summary content while retaining a usable canonical link', () => {
  const html = issueShareHtml({ title: '"><script>alert(1)</script>', summary: 'A & B "quoted"', bodyName: 'Council', placeName: 'Parish', mode: 'limited', canonicalUrl: 'https://example.test/issues/record', shareUrl: 'https://example.test/share/issues/record' })
  expect(html).not.toContain('<script>')
  expect(html).toContain('&lt;script&gt;')
  expect(html).toContain('property="og:title"')
  expect(html).toContain('name="twitter:card"')
  expect(html).toContain('Limited information')
  expect(html).toContain('href="https://example.test/issues/record"')
})
