import { DAY, MINUTE, RateLimiter } from '@convex-dev/rate-limiter'
import { ConvexError } from 'convex/values'

import { components } from '../_generated/api'
import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'

// Token windows remain an exact usage ledger. They no longer deny a resident's
// answer before the provider reports actual use.
export const ASK_TOKEN_RESERVATION = 0
export const ASK_RUN_LEASE_MS = 10 * MINUTE

const SHORT_TOKEN_WINDOW_MS = MINUTE
const DAILY_TOKEN_WINDOW_MS = DAY

const askRequestLimiter = new RateLimiter(components.rateLimiter, {
  askRequestBurst: { kind: 'fixed window', rate: 3, period: MINUTE },
  askRequestDaily: { kind: 'fixed window', rate: 20, period: DAY },
})

type WindowKind = 'short' | 'daily'

type Reservation = Pick<
  Doc<'askAnswerReceipts'>,
  | '_id'
  | 'sessionId'
  | 'reservationState'
  | 'reservedTokens'
  | 'shortWindowStart'
  | 'dailyWindowStart'
>

export async function reserveAskCapacity(
  ctx: MutationCtx,
  sessionId: Id<'anonymousSessions'>,
  now: number,
) {
  const requestKey = sessionId.toString()
  const burst = await askRequestLimiter.limit(ctx, 'askRequestBurst', {
    key: requestKey,
  })
  if (!burst.ok) throwCooldown('ask_request_limited', now, burst.retryAfter)

  const daily = await askRequestLimiter.limit(ctx, 'askRequestDaily', {
    key: requestKey,
  })
  if (!daily.ok) throwCooldown('ask_daily_limited', now, daily.retryAfter)

  const shortWindowStart = windowStart(now, SHORT_TOKEN_WINDOW_MS)
  const dailyWindowStart = windowStart(now, DAILY_TOKEN_WINDOW_MS)
  await reserveWindow(ctx, {
    sessionId,
    kind: 'short',
    windowStart: shortWindowStart,
    now,
  })
  await reserveWindow(ctx, {
    sessionId,
    kind: 'daily',
    windowStart: dailyWindowStart,
    now,
  })
  return { shortWindowStart, dailyWindowStart }
}

export async function settleAskCapacity(
  ctx: MutationCtx,
  receipt: Reservation,
  actualTokens: number,
  outcome: 'reconciled' | 'released',
) {
  if (
    receipt.reservationState !== 'held' ||
    receipt.reservedTokens === undefined ||
    receipt.shortWindowStart === undefined ||
    receipt.dailyWindowStart === undefined
  ) {
    return
  }
  const consumed = Math.max(0, Math.ceil(actualTokens))
  await settleWindow(ctx, {
    sessionId: receipt.sessionId,
    kind: 'short',
    windowStart: receipt.shortWindowStart,
    reservedTokens: receipt.reservedTokens,
    consumedTokens: outcome === 'reconciled' ? consumed : 0,
  })
  await settleWindow(ctx, {
    sessionId: receipt.sessionId,
    kind: 'daily',
    windowStart: receipt.dailyWindowStart,
    reservedTokens: receipt.reservedTokens,
    consumedTokens: outcome === 'reconciled' ? consumed : 0,
  })
  await ctx.db.patch(receipt._id, { reservationState: outcome })
}

async function reserveWindow(
  ctx: MutationCtx,
  args: {
    sessionId: Id<'anonymousSessions'>
    kind: WindowKind
    windowStart: number
    now: number
  },
) {
  const existing = await ctx.db
    .query('askTokenWindows')
    .withIndex('by_session_kind_and_window', (q) =>
      q
        .eq('sessionId', args.sessionId)
        .eq('kind', args.kind)
        .eq('windowStart', args.windowStart),
    )
    .unique()
  if (existing) {
    await ctx.db.patch(existing._id, {
      reservedTokens: existing.reservedTokens + ASK_TOKEN_RESERVATION,
      updatedAt: args.now,
    })
    return
  }
  await ctx.db.insert('askTokenWindows', {
    sessionId: args.sessionId,
    kind: args.kind,
    windowStart: args.windowStart,
    reservedTokens: ASK_TOKEN_RESERVATION,
    consumedTokens: 0,
    updatedAt: args.now,
  })
}

async function settleWindow(
  ctx: MutationCtx,
  args: {
    sessionId: Id<'anonymousSessions'>
    kind: WindowKind
    windowStart: number
    reservedTokens: number
    consumedTokens: number
  },
) {
  const window = await ctx.db
    .query('askTokenWindows')
    .withIndex('by_session_kind_and_window', (q) =>
      q
        .eq('sessionId', args.sessionId)
        .eq('kind', args.kind)
        .eq('windowStart', args.windowStart),
    )
    .unique()
  if (!window) return
  await ctx.db.patch(window._id, {
    reservedTokens: Math.max(0, window.reservedTokens - args.reservedTokens),
    consumedTokens: window.consumedTokens + args.consumedTokens,
    updatedAt: Date.now(),
  })
}

function windowStart(now: number, duration: number) {
  return Math.floor(now / duration) * duration
}

function throwCooldown(code: string, now: number, retryAfter: number): never {
  throw new ConvexError({
    code,
    message: 'Ask is taking a short pause on this device',
    retryAt: now + retryAfter,
  })
}
