import { api } from '../_generated/api'
import { env, httpAction } from '../_generated/server'
import { issueShareHtml } from './html'

export const shareIssue = httpAction(async (ctx, request) => {
  const raw = new URL(request.url).pathname.slice('/share/issues/'.length)
  let slug: string
  try { slug = decodeURIComponent(raw) } catch { return unavailable() }
  if (!/^[a-z0-9][a-z0-9-]{0,199}$/.test(slug)) return unavailable()
  const issue = await ctx.runQuery(api.resident.evidence.getPublishedIssue, { slug })
  if (!issue) return unavailable()
  const base = env.CONVEX_SITE_URL.replace(/\/$/, '')
  const canonicalUrl = `${base}/issues/${encodeURIComponent(issue.slug)}`
  const shareUrl = `${base}/share/issues/${encodeURIComponent(issue.slug)}`
  const etag = `"${issue.revision}"`
  const headers = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=0, must-revalidate', ETag: etag, 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'", 'Referrer-Policy': 'strict-origin-when-cross-origin' }
  if (request.headers.get('If-None-Match') === etag) return new Response(null, { status: 304, headers })
  return new Response(issueShareHtml({ title: issue.title, summary: issue.summary, bodyName: issue.bodyName, placeName: issue.placeName, mode: issue.mode as 'full' | 'limited', canonicalUrl, shareUrl }), { headers })
})
function unavailable() {
  return new Response('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Issue unavailable | Public Parish</title></head><body><main><h1>This issue is not available</h1><p>Public Parish could not verify a current published timeline.</p><a href="/explore">Explore published evidence</a></main></body></html>', { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
}
