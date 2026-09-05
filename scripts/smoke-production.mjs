import { ConvexHttpClient } from 'convex/browser'
import { makeFunctionReference } from 'convex/server'

const DIRECT_ORIGIN = 'https://befitting-flamingo-587.convex.site'
const CANONICAL_ORIGIN = 'https://www.publicparish.com'
const APEX_ORIGIN = 'https://publicparish.com'

async function get(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`)
  }
  return response
}

async function getApp(origin) {
  const response = await get(`${origin}/`)
  const html = await response.text()
  if (!html.includes('<title>Public Parish')) {
    throw new Error(`${origin} did not serve the Public Parish document`)
  }
  const assetPath = html.match(/(?:src|href)="(\/assets\/[^"?]+\.js)"/)?.[1]
  if (!assetPath) {
    throw new Error(`${origin} did not reference a JavaScript asset`)
  }
  await get(new URL(assetPath, origin).toString())
  console.log(`passed: ${origin}`)
}

await getApp(DIRECT_ORIGIN)
await getApp(CANONICAL_ORIGIN)

const apexResponse = await get(`${APEX_ORIGIN}/smoke?source=github`)
const apexFinalUrl = new URL(apexResponse.url)
if (
  apexFinalUrl.origin !== CANONICAL_ORIGIN ||
  apexFinalUrl.pathname !== '/smoke' ||
  apexFinalUrl.searchParams.get('source') !== 'github'
) {
  throw new Error(`Apex redirect ended at ${apexResponse.url}`)
}
console.log(`passed: ${APEX_ORIGIN} redirects to ${CANONICAL_ORIGIN}`)

for (const path of ['/explore', '/ask', '/coverage', '/coverage/request', '/following', '/privacy']) {
  const response = await get(`${DIRECT_ORIGIN}${path}`)
  if (!(await response.text()).includes('<title>Public Parish')) throw new Error(`Direct route ${path} did not serve the application`)
}
const client = new ConvexHttpClient('https://befitting-flamingo-587.convex.cloud')
const health = await client.query(makeFunctionReference('coverage/publicHealth:regions'), {})
if (health.length !== 3 || health.flatMap(region => region.bodies).length !== 10) throw new Error('Coverage did not return the ten named launch bodies')
const search = await client.query(makeFunctionReference('resident/search:search'), { paginationOpts: { numItems: 5, cursor: null } })
if (!Array.isArray(search.page)) throw new Error('Published search did not return a page')
const issues = await client.query(makeFunctionReference('resident/evidence:listPublishedIssues'), {})
if (!issues.length) throw new Error('No published issue is available for the release smoke')
for (const issue of issues.slice(0, 2)) {
  await get(`${DIRECT_ORIGIN}/issues/${encodeURIComponent(issue.slug)}`)
  const detail = await client.query(makeFunctionReference('resident/evidence:getPublishedIssue'), { slug: issue.slug })
  if (!detail?.citations.length || detail.citations.some(citation => !citation.excerpt.trim() || !/^https:\/\//.test(citation.officialUrl))) throw new Error('Published issue citations are unavailable')
  const share = await get(`${DIRECT_ORIGIN}/share/issues/${encodeURIComponent(issue.slug)}`)
  const html = await share.text()
  if (!html.includes('property="og:title"') || !html.includes('rel="canonical"') || !share.headers.get('etag')) throw new Error('Issue share HTML is missing its metadata or revision')
}
const missing = await fetch(`${DIRECT_ORIGIN}/share/issues/smoke-nonexistent-issue`, { signal: AbortSignal.timeout(30_000) })
if (missing.status !== 404 || !missing.headers.get('cache-control')?.includes('no-store')) throw new Error('Missing share route did not fail closed')
console.log('passed: direct resident routes, coverage, search, issue evidence, and share HTML')
