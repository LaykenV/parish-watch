import { DAY, HOUR, MINUTE, RateLimiter } from '@convex-dev/rate-limiter'
import { paginationOptsValidator } from 'convex/server'
import type { OutboundId } from '@agentmail/convex'
import { v } from 'convex/values'
import { components, internal } from '../_generated/api'
import type { Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'
import { action, env, internalMutation, mutation } from '../_generated/server'
import { requireOwner } from '../auth/authorization'
import { agentmail, updatesInboxId } from '../follows/agentmailClient'
import { createOpaqueToken, createVerificationCode, decryptAddress, encryptAddress, hashAccessToken, hashAddress, hashVerificationCode, normalizeEmail } from '../follows/secrets'
import { sha256HexOfText } from '../sources/hashing'
import { placeIsSupported } from './publicHealth'

const limiter = new RateLimiter(components.rateLimiter, {
  demand: { kind: 'fixed window', rate: 5, period: DAY }, globalDemand: { kind: 'fixed window', rate: 100, period: HOUR },
  verification: { kind: 'fixed window', rate: 5, period: HOUR }, globalVerification: { kind: 'fixed window', rate: 30, period: MINUTE },
})
const placeKind = v.union(v.literal('parish'), v.literal('municipality'), v.literal('unknown'))
export function normalizePlace(name: string, kind: typeof placeKind.type) {
  const clean = name.trim().replace(/\s+/g, ' ')
  if (clean.length < 2 || clean.length > 100 || /[\r\n<>]/.test(clean)) throw new Error('Enter a parish or municipality name, up to 100 characters.')
  return { name: clean, key: `${kind}:${clean.toLowerCase()}` }
}
export const record = mutation({
  args: { requesterToken: v.string(), placeName: v.string(), placeKind, homepage: v.optional(v.string()) }, returns: v.object({ saved: v.literal(true), requestId: v.id('coverageRequests') }),
  handler: async (ctx, args) => {
    if (!/^[A-Za-z0-9_-]{32,100}$/.test(args.requesterToken)) throw new Error('Request token is invalid.')
    const place = normalizePlace(args.placeName, args.placeKind)
    const requesterHash = await sha256HexOfText(args.requesterToken)
    const requestKey = await sha256HexOfText(`${requesterHash}:${place.key}`)
    const existing = await ctx.db.query('coverageRequests').withIndex('by_request_key', q => q.eq('requestKey', requestKey)).unique()
    if (existing) return { saved: true as const, requestId: existing._id }
    if (args.homepage) {
      if (args.homepage.length > 2_048) throw new Error('Homepage URL is too long.')
      const url = new URL(args.homepage)
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Enter an ordinary public homepage URL.')
    }
    await limiter.limit(ctx, 'demand', { key: requesterHash, throws: true })
    await limiter.limit(ctx, 'globalDemand', { throws: true })
    const requestId = await ctx.db.insert('coverageRequests', { requestKey, requesterHash, placeKey: place.key, placeName: place.name, placeKind: args.placeKind, homepage: args.homepage, createdAt: Date.now() })
    const count = await ctx.db.query('coverageDemandCounts').withIndex('by_place_key', q => q.eq('placeKey', place.key)).unique()
    if (count) await ctx.db.patch(count._id, { count: count.count + 1, updatedAt: Date.now() })
    else await ctx.db.insert('coverageDemandCounts', { placeKey: place.key, placeName: place.name, count: 1, updatedAt: Date.now() })
    return { saved: true as const, requestId }
  },
})
export const confirmPlace = mutation({
  args: { placeKey: v.string(), jurisdictionSlug: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    const owner = await requireOwner(ctx)
    if (!await ctx.db.query('jurisdictions').withIndex('by_slug', q => q.eq('slug', args.jurisdictionSlug)).unique()) throw new Error('Unknown jurisdiction.')
    const prior = await ctx.db.query('coveragePlaceAliases').withIndex('by_place_key', q => q.eq('placeKey', args.placeKey)).unique()
    if (prior && prior.jurisdictionSlug !== args.jurisdictionSlug) throw new Error('Review existing subscriptions before changing a place mapping.')
    if (!prior) await ctx.db.insert('coveragePlaceAliases', { ...args, confirmedBy: owner._id, createdAt: Date.now() })
    return null
  },
})
export const requestNotice = action({
  args: { requestId: v.id('coverageRequests'), requesterToken: v.string(), email: v.string() }, returns: v.object({ challengeId: v.string() }),
  handler: async (ctx, args): Promise<{ challengeId: string }> => {
    const email = normalizeEmail(args.email)
    const challengeId = createOpaqueToken(24)
    const code = createVerificationCode()
    return ctx.runMutation(internal.coverage.requests.prepareNotice, { requestId: args.requestId, requesterHash: await sha256HexOfText(args.requesterToken), email, addressHash: await hashAddress(email), encryptedAddress: await encryptAddress(email), challengeId, code, codeHash: await hashVerificationCode(`coverage:${challengeId}`, code) })
  },
})
export const prepareNotice = internalMutation({
  args: { requestId: v.id('coverageRequests'), requesterHash: v.string(), email: v.string(), addressHash: v.string(), encryptedAddress: v.string(), challengeId: v.string(), code: v.string(), codeHash: v.string() }, returns: v.object({ challengeId: v.string() }),
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId)
    if (!request || request.requesterHash !== args.requesterHash) throw new Error('Request is unavailable for this device.')
    await limiter.limit(ctx, 'verification', { key: args.addressHash, throws: true })
    await limiter.limit(ctx, 'globalVerification', { throws: true })
    const prior = await ctx.db.query('emailSubscribers').withIndex('by_address_hash', q => q.eq('addressHash', args.addressHash)).unique()
    const now = Date.now()
    const subscriberId = prior?._id ?? await ctx.db.insert('emailSubscribers', { addressHash: args.addressHash, encryptedAddress: args.encryptedAddress, encryptionVersion: 1, state: 'pending', createdAt: now, updatedAt: now })
    const challenge = await ctx.db.insert('coverageNoticeChallenges', { requestId: request._id, subscriberId, challengeId: args.challengeId, codeHash: args.codeHash, expiresAt: now + 15 * MINUTE, attempts: 0, createdAt: now })
    const outboundId = await agentmail.sendMessage(ctx, updatesInboxId(), { to: args.email, subject: 'Verify your Public Parish coverage notice', text: `Your verification code is ${args.code}. It expires in 15 minutes.\n\nYour request for ${request.placeName} is already saved. Verification enables one notice when that place becomes supported. It creates no account and no issue follow.\n\nIf you did not request this code, ignore it.`, labels: ['public-parish', 'coverage-verification'] })
    await ctx.db.patch(challenge, { outboundId })
    return { challengeId: args.challengeId }
  },
})
export const verifyNotice = mutation({
  args: { challengeId: v.string(), code: v.string(), requesterToken: v.string() }, returns: v.object({ verified: v.boolean(), noticeState: v.optional(v.union(v.literal('sent'), v.literal('stopped'))) }),
  handler: async (ctx, args) => {
    if (!/^\d{6}$/.test(args.code) || args.challengeId.length > 100) return { verified: false }
    const challenge = await ctx.db.query('coverageNoticeChallenges').withIndex('by_challenge_id', q => q.eq('challengeId', args.challengeId)).unique()
    if (!challenge || challenge.expiresAt <= Date.now() || challenge.attempts >= 5) return { verified: false }
    const request = await ctx.db.get(challenge.requestId)
    const subscriber = await ctx.db.get(challenge.subscriberId)
    if (!request || !subscriber || request.requesterHash !== await sha256HexOfText(args.requesterToken) || (subscriber.unsubscribedAt ?? 0) >= challenge.createdAt) return { verified: false }
    const existing = await ctx.db.query('coverageNoticeSubscriptions').withIndex('by_subscriber_and_place', q => q.eq('subscriberId', subscriber._id).eq('placeKey', request.placeKey)).unique()
    const terminal = existing?.state === 'sent' || (existing?.state === 'stopped' && Boolean(existing.outboundId || existing.launchedSlug))
      ? { noticeState: existing.state as 'sent' | 'stopped' } : {}
    if (challenge.consumedAt) return { verified: true, ...terminal }
    await ctx.db.patch(challenge._id, { attempts: challenge.attempts + 1 })
    if (challenge.codeHash !== await hashVerificationCode(`coverage:${args.challengeId}`, args.code)) return { verified: false }
    await ctx.db.patch(challenge._id, { consumedAt: Date.now() })
    await ctx.db.patch(subscriber._id, { state: 'verified', verifiedAt: subscriber.verifiedAt ?? Date.now(), unsubscribedAt: undefined, updatedAt: Date.now() })
    if (terminal.noticeState) return { verified: true, ...terminal }
    if (!existing) {
      const subscriptions = await ctx.db.query('coverageNoticeSubscriptions').withIndex('by_subscriber', q => q.eq('subscriberId', subscriber._id)).take(100)
      if (subscriptions.length >= 100) throw new Error('This address has reached its coverage-notice limit.')
    }
    if (existing?.state === 'stopped' && !existing.outboundId && !existing.launchedSlug) await ctx.db.patch(existing._id, { state: 'waiting', updatedAt: Date.now() })
    const subscriptionId = existing?._id ?? await ctx.db.insert('coverageNoticeSubscriptions', { subscriberId: subscriber._id, placeKey: request.placeKey, placeName: request.placeName, state: 'waiting', createdAt: Date.now(), updatedAt: Date.now() })
    await ctx.scheduler.runAfter(0, internal.coverage.requests.deliver, { subscriptionId })
    return { verified: true }
  },
})
async function resolvePlace(ctx: MutationCtx, placeKey: string): Promise<string | null> {
  const exact: Record<string, string> = { 'parish:lafayette parish': 'lafayette-parish', 'parish:rapides parish': 'rapides-parish', 'parish:east baton rouge parish': 'east-baton-rouge-parish' }
  if (exact[placeKey]) return exact[placeKey]
  return (await ctx.db.query('coveragePlaceAliases').withIndex('by_place_key', q => q.eq('placeKey', placeKey)).unique())?.jurisdictionSlug ?? null
}
export const deliver = internalMutation({
  args: { subscriptionId: v.id('coverageNoticeSubscriptions') }, returns: v.null(),
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.subscriptionId)
    if (!subscription || subscription.state !== 'waiting' || subscription.outboundId) return null
    const subscriber = await ctx.db.get(subscription.subscriberId)
    if (subscriber?.state !== 'verified') return null
    const slug = await resolvePlace(ctx, subscription.placeKey)
    if (!slug || !await placeIsSupported(ctx, slug)) return null
    const priorLaunch = await ctx.db.query('coverageNoticeSubscriptions').withIndex('by_subscriber_and_launched_slug', q => q.eq('subscriberId', subscriber._id).eq('launchedSlug', slug)).first()
    if (priorLaunch) { await ctx.db.patch(subscription._id, { state: 'stopped', providerStatus: 'duplicate_place_launch', updatedAt: Date.now() }); return null }
    const token = createOpaqueToken()
    await ctx.db.insert('emailAccessTokens', { subscriberId: subscriber._id, kind: 'unsubscribe', tokenHash: await hashAccessToken(token), createdAt: Date.now() })
    const base = env.CONVEX_SITE_URL.replace(/\/$/, '')
    const outboundId = await agentmail.sendMessage(ctx, updatesInboxId(), { to: await decryptAddress(subscriber.encryptedAddress), subject: `Public Parish coverage is available for ${subscription.placeName}`, text: `${subscription.placeName} now meets Public Parish's coverage checks. Read the exact supported government bodies and limitations at ${base}/coverage.\n\nThis is the one launch notice you requested. Public Parish is free and nonpartisan.\n\nUnsubscribe from all email notices: ${base}/coverage/unsubscribe/${encodeURIComponent(token)}`, labels: ['public-parish', 'coverage-launch'] })
    await ctx.db.patch(subscription._id, { state: 'queued', launchedSlug: slug, outboundId, updatedAt: Date.now() })
    return null
  },
})
export async function stopSubscriberNotices(ctx: MutationCtx, subscriberId: Id<'emailSubscribers'>) {
  const subscriptions = await ctx.db.query('coverageNoticeSubscriptions').withIndex('by_subscriber', q => q.eq('subscriberId', subscriberId)).take(101)
  for (const subscription of subscriptions) {
    if (subscription.outboundId && subscription.state === 'queued') {
      const status = await agentmail.status(ctx, subscription.outboundId as OutboundId)
      if (status?.status === 'pending') await agentmail.cancel(ctx, subscription.outboundId as OutboundId)
    }
    if (subscription.state !== 'sent') await ctx.db.patch(subscription._id, { state: 'stopped', updatedAt: Date.now() })
  }
}
export const sweep = internalMutation({
  args: { paginationOpts: paginationOptsValidator, state: v.optional(v.union(v.literal('waiting'), v.literal('queued'))) }, returns: v.null(),
  handler: async (ctx, args) => {
    const state = args.state ?? 'waiting'
    const page = await ctx.db.query('coverageNoticeSubscriptions').withIndex('by_state', q => q.eq('state', state)).paginate(args.paginationOpts)
    for (const subscription of page.page) {
      if (subscription.state === 'waiting') await ctx.scheduler.runAfter(0, internal.coverage.requests.deliver, { subscriptionId: subscription._id })
      if (subscription.state === 'queued' && subscription.outboundId) {
        const status = await agentmail.status(ctx, subscription.outboundId as OutboundId)
        if (status && status.status !== 'pending') await ctx.db.patch(subscription._id, { state: ['sent', 'delivered'].includes(status.status) ? 'sent' : 'stopped', providerStatus: status.status, updatedAt: Date.now() })
      }
    }
    if (!page.isDone) await ctx.scheduler.runAfter(0, internal.coverage.requests.sweep, { state, paginationOpts: { numItems: 25, cursor: page.continueCursor } })
    else if (state === 'waiting') await ctx.scheduler.runAfter(0, internal.coverage.requests.sweep, { state: 'queued', paginationOpts: { numItems: 25, cursor: null } })
    return null
  },
})
export const cleanup = internalMutation({
  args: {}, returns: v.null(),
  handler: async ctx => {
    const expired = await ctx.db.query('coverageNoticeChallenges').withIndex('by_expires_at', q => q.lt('expiresAt', Date.now())).take(100)
    for (const challenge of expired) await ctx.db.delete(challenge._id)
    const requests = await ctx.db.query('coverageRequests').withIndex('by_created_at', q => q.lt('createdAt', Date.now() - 90 * DAY)).take(100)
    for (const request of requests) await ctx.db.delete(request._id)
    if (expired.length === 100 || requests.length === 100) await ctx.scheduler.runAfter(0, internal.coverage.requests.cleanup, {})
    return null
  },
})
