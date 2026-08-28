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
  if (!html.includes('<title>Public Parish</title>')) {
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
