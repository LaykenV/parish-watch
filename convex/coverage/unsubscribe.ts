import { internal } from '../_generated/api'
import { httpAction } from '../_generated/server'
import { hashAccessToken } from '../follows/secrets'

export const unsubscribe = httpAction(async (ctx, request) => {
  const token = new URL(request.url).pathname.split('/').pop() ?? ''
  if (!/^[A-Za-z0-9_-]{32,100}$/.test(token)) return new Response('Link unavailable', { status: 404 })
  let complete = false
  if (request.method === 'POST') {
    const result = await ctx.runMutation(internal.follows.management.unsubscribeEmailWithToken, { tokenHash: await hashAccessToken(token) })
    complete = result.unsubscribed
    if (!complete) return new Response('Link unavailable', { status: 404 })
  }
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Public Parish email notices</title></head><body><main><h1>${complete ? 'Email notices stopped' : 'Stop Public Parish email notices'}</h1><p>${complete ? 'This address will receive no further issue alerts or coverage launch notices unless you verify a new subscription.' : 'Confirm to stop all issue alerts and coverage launch notices for this address.'}</p>${complete ? '<a href="/coverage">View coverage</a>' : '<form method="post"><button type="submit">Stop email notices</button></form>'}</main></body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'none'; form-action 'self'; frame-ancestors 'none'" } })
})
