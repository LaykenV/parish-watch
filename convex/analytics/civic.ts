import { MINUTE, RateLimiter } from '@convex-dev/rate-limiter'
import { v } from 'convex/values'
import { components, internal } from '../_generated/api'
import type { MutationCtx } from '../_generated/server'
import { env, internalMutation } from '../_generated/server'
import { sha256HexOfText } from '../sources/hashing'
import { browserCivicEvent } from './civicContracts'
import type { CivicEvent } from './civicContracts'

const limiter = new RateLimiter(components.rateLimiter, { civicBrowser: { kind: 'fixed window', rate: 30, period: MINUTE }, civicGlobal: { kind: 'fixed window', rate: 1_000, period: MINUTE } })
export async function recordConfirmedEvent(ctx: MutationCtx, kind: CivicEvent, key: string): Promise<boolean> {
  const eventKey = await sha256HexOfText(`${kind}:${key}`)
  if (await ctx.db.query('civicEventReceipts').withIndex('by_event_key', q => q.eq('eventKey', eventKey)).unique()) return false
  const environment = env.CONVEX_SITE_URL === 'https://befitting-flamingo-587.convex.site' ? 'production' as const : 'development' as const
  const counter = await ctx.db.query('civicEventCounters').withIndex('by_kind_and_environment', q => q.eq('kind', kind).eq('environment', environment)).unique()
  if (counter) await ctx.db.patch(counter._id, { count: counter.count + 1, updatedAt: Date.now() })
  else await ctx.db.insert('civicEventCounters', { kind, environment, count: 1, updatedAt: Date.now() })
  await ctx.db.insert('civicEventReceipts', { eventKey, kind, expiresAt: Date.now() + 90 * 86_400_000 })
  return true
}
export const recordBrowserEvent = internalMutation({
  args: { kind: browserCivicEvent, visitorKeyHash: v.string(), eventKey: v.string() }, returns: v.boolean(),
  handler: async (ctx, args) => {
    if (!/^[a-f0-9]{64}$/.test(args.visitorKeyHash) || !/^[a-zA-Z0-9-]{16,80}$/.test(args.eventKey)) return false
    await limiter.limit(ctx, 'civicBrowser', { key: args.visitorKeyHash, throws: true })
    await limiter.limit(ctx, 'civicGlobal', { throws: true })
    return recordConfirmedEvent(ctx, args.kind, `${args.visitorKeyHash}:${args.eventKey}`)
  },
})
export const cleanup = internalMutation({
  args: {}, returns: v.null(), handler: async ctx => {
    const rows = await ctx.db.query('civicEventReceipts').withIndex('by_expires_at', q => q.lte('expiresAt', Date.now())).take(100)
    for (const row of rows) await ctx.db.delete(row._id)
    if (rows.length === 100) await ctx.scheduler.runAfter(0, internal.analytics.civic.cleanup, {})
    return null
  },
})
