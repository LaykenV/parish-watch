import { v } from 'convex/values'

import { internal } from '../_generated/api'
import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { action, internalMutation, internalQuery } from '../_generated/server'
import { createOpaqueToken, hashAccessToken } from './secrets'
import {
  deliveryCadence,
  followView,
  MANAGEMENT_TOKEN_TTL_MS,
  MAX_FOLLOWS_PER_OWNER,
} from './enrollmentContracts'
import type {
  ActiveDeliveryCadence,
  DeliveryCadence,
} from './enrollmentContracts'

const managementResult = v.union(
  v.object({ status: v.literal('unavailable') }),
  v.object({ status: v.literal('expired') }),
  v.object({ status: v.literal('valid'), follow: followView }),
)

type ManagementResult =
  | { status: 'unavailable' | 'expired' }
  | {
      status: 'valid'
      follow: {
        id: string
        targetKind: Doc<'follows'>['targetKind']
        targetKey: string
        title: string
        detail: string
        cadence: DeliveryCadence
        resumeCadence: ActiveDeliveryCadence
        createdAt: number
      }
    }

export const getEmailManagement = action({
  args: { token: v.string() },
  returns: managementResult,
  handler: async (ctx, args): Promise<ManagementResult> => {
    const tokenHash = await hashAccessToken(args.token)
    const result: ManagementResult = await ctx.runQuery(
      internal.follows.management.readManagement,
      {
        tokenHash,
        now: Date.now(),
      },
    )
    return result
  },
})

export const readManagement = internalQuery({
  args: { tokenHash: v.string(), now: v.number() },
  returns: managementResult,
  handler: async (ctx, args): Promise<ManagementResult> => {
    const token = await tokenByHash(ctx, args.tokenHash)
    if (
      !token ||
      token.kind !== 'management' ||
      token.revokedAt ||
      token.consumedAt ||
      !token.followId
    ) {
      return { status: 'unavailable' as const }
    }
    if (token.expiresAt === undefined || token.expiresAt <= args.now) {
      return { status: 'expired' as const }
    }
    const subscriber = await ctx.db.get('emailSubscribers', token.subscriberId)
    const follow = await ctx.db.get('follows', token.followId)
    if (
      !subscriber ||
      subscriber.state !== 'verified' ||
      !follow ||
      follow.ownerKind !== 'email' ||
      follow.emailSubscriberId !== subscriber._id
    ) {
      return { status: 'unavailable' as const }
    }
    const view = await followViewForRow(ctx, follow)
    return view
      ? { status: 'valid' as const, follow: view }
      : { status: 'unavailable' as const }
  },
})

export const updateEmailFollow = action({
  args: { token: v.string(), cadence: deliveryCadence },
  returns: v.object({ updated: v.boolean() }),
  handler: async (ctx, args): Promise<{ updated: boolean }> => {
    const tokenHash = await hashAccessToken(args.token)
    return await ctx.runMutation(
      internal.follows.management.updateEmailFollowWithToken,
      { tokenHash, cadence: args.cadence },
    )
  },
})

export const updateEmailFollowWithToken = internalMutation({
  args: { tokenHash: v.string(), cadence: deliveryCadence },
  returns: v.object({ updated: v.boolean() }),
  handler: async (ctx, args): Promise<{ updated: boolean }> => {
    const access = await requireManagementAccess(ctx, args.tokenHash)
    await upsertPreference(ctx, access.follow._id, args.cadence)
    return { updated: true }
  },
})

export const removeEmailFollow = action({
  args: { token: v.string() },
  returns: v.object({ removed: v.boolean() }),
  handler: async (ctx, args): Promise<{ removed: boolean }> => {
    const tokenHash = await hashAccessToken(args.token)
    return await ctx.runMutation(
      internal.follows.management.removeEmailFollowWithToken,
      { tokenHash },
    )
  },
})

export const removeEmailFollowWithToken = internalMutation({
  args: { tokenHash: v.string() },
  returns: v.object({ removed: v.boolean() }),
  handler: async (ctx, args): Promise<{ removed: boolean }> => {
    const access = await requireManagementAccess(ctx, args.tokenHash)
    const preference = await ctx.db
      .query('notificationPreferences')
      .withIndex('by_follow_id', (index) =>
        index.eq('followId', access.follow._id),
      )
      .unique()
    if (preference)
      await ctx.db.delete('notificationPreferences', preference._id)
    await ctx.db.delete('follows', access.follow._id)
    await ctx.db.patch('emailAccessTokens', access.token._id, {
      consumedAt: Date.now(),
    })
    return { removed: true }
  },
})

export const rotateEmailManagementToken = action({
  args: { token: v.string() },
  returns: v.object({ token: v.string(), expiresAt: v.number() }),
  handler: async (ctx, args): Promise<{ token: string; expiresAt: number }> => {
    const replacement = createOpaqueToken()
    const [tokenHash, replacementHash] = await Promise.all([
      hashAccessToken(args.token),
      hashAccessToken(replacement),
    ])
    const result: { expiresAt: number } = await ctx.runMutation(
      internal.follows.management.rotateManagementTokenWithHash,
      { tokenHash, replacementHash },
    )
    return { token: replacement, expiresAt: result.expiresAt }
  },
})

export const rotateManagementTokenWithHash = internalMutation({
  args: { tokenHash: v.string(), replacementHash: v.string() },
  returns: v.object({ expiresAt: v.number() }),
  handler: async (ctx, args): Promise<{ expiresAt: number }> => {
    const access = await requireManagementAccess(ctx, args.tokenHash)
    const now = Date.now()
    const expiresAt = now + MANAGEMENT_TOKEN_TTL_MS
    await ctx.db.patch('emailAccessTokens', access.token._id, {
      revokedAt: now,
    })
    await ctx.db.insert('emailAccessTokens', {
      subscriberId: access.subscriber._id,
      followId: access.follow._id,
      kind: 'management',
      tokenHash: args.replacementHash,
      expiresAt,
      createdAt: now,
    })
    return { expiresAt }
  },
})

export const unsubscribeEmail = action({
  args: { token: v.string() },
  returns: v.object({ unsubscribed: v.boolean() }),
  handler: async (ctx, args): Promise<{ unsubscribed: boolean }> => {
    const tokenHash = await hashAccessToken(args.token)
    return await ctx.runMutation(
      internal.follows.management.unsubscribeEmailWithToken,
      { tokenHash },
    )
  },
})

export const unsubscribeEmailWithToken = internalMutation({
  args: { tokenHash: v.string() },
  returns: v.object({ unsubscribed: v.boolean() }),
  handler: async (ctx, args): Promise<{ unsubscribed: boolean }> => {
    const token = await ctx.db
      .query('emailAccessTokens')
      .withIndex('by_token_hash', (index) =>
        index.eq('tokenHash', args.tokenHash),
      )
      .unique()
    if (!token || token.kind !== 'unsubscribe' || token.revokedAt) {
      return { unsubscribed: false }
    }
    if (token.consumedAt) return { unsubscribed: true }
    const subscriber = await ctx.db.get('emailSubscribers', token.subscriberId)
    if (!subscriber) return { unsubscribed: false }
    const now = Date.now()
    const follows = await ctx.db
      .query('follows')
      .withIndex('by_email_subscriber_id_and_created_at', (index) =>
        index.eq('emailSubscriberId', subscriber._id),
      )
      .take(MAX_FOLLOWS_PER_OWNER)
    for (const follow of follows) {
      await upsertPreference(ctx, follow._id, 'muted')
    }
    const managementTokens = await ctx.db
      .query('emailAccessTokens')
      .withIndex('by_subscriber_id_and_kind_and_created_at', (index) =>
        index.eq('subscriberId', subscriber._id).eq('kind', 'management'),
      )
      .take(MAX_FOLLOWS_PER_OWNER * 2)
    for (const managementToken of managementTokens) {
      if (!managementToken.revokedAt && !managementToken.consumedAt) {
        await ctx.db.patch('emailAccessTokens', managementToken._id, {
          revokedAt: now,
        })
      }
    }
    await ctx.db.patch('emailSubscribers', subscriber._id, {
      state: 'unsubscribed',
      unsubscribedAt: now,
      updatedAt: now,
    })
    await ctx.db.patch('emailAccessTokens', token._id, { consumedAt: now })
    return { unsubscribed: true }
  },
})

async function requireManagementAccess(ctx: MutationCtx, tokenHash: string) {
  const token = await ctx.db
    .query('emailAccessTokens')
    .withIndex('by_token_hash', (index) => index.eq('tokenHash', tokenHash))
    .unique()
  if (
    !token ||
    token.kind !== 'management' ||
    token.revokedAt ||
    token.consumedAt ||
    !token.followId ||
    token.expiresAt === undefined ||
    token.expiresAt <= Date.now()
  ) {
    throw new Error('This management link is unavailable')
  }
  const subscriber = await ctx.db.get('emailSubscribers', token.subscriberId)
  const follow = await ctx.db.get('follows', token.followId)
  if (
    !subscriber ||
    subscriber.state !== 'verified' ||
    !follow ||
    follow.ownerKind !== 'email' ||
    follow.emailSubscriberId !== subscriber._id
  ) {
    throw new Error('This management link is unavailable')
  }
  return { token, subscriber, follow }
}

async function tokenByHash(
  ctx: QueryCtx,
  tokenHash: string,
): Promise<Doc<'emailAccessTokens'> | null> {
  return await ctx.db
    .query('emailAccessTokens')
    .withIndex('by_token_hash', (index) => index.eq('tokenHash', tokenHash))
    .unique()
}

async function followViewForRow(
  ctx: QueryCtx,
  row: Doc<'follows'>,
): Promise<{
  id: string
  targetKind: Doc<'follows'>['targetKind']
  targetKey: string
  title: string
  detail: string
  cadence: DeliveryCadence
  resumeCadence: ActiveDeliveryCadence
  createdAt: number
} | null> {
  const preference = await ctx.db
    .query('notificationPreferences')
    .withIndex('by_follow_id', (index) => index.eq('followId', row._id))
    .unique()
  if (!preference) return null
  return {
    id: row._id,
    targetKind: row.targetKind,
    targetKey: row.targetKey,
    title: row.targetTitle,
    detail: row.targetDetail,
    cadence: preference.cadence,
    resumeCadence:
      preference.cadence === 'muted'
        ? (preference.resumeCadence ?? 'immediate')
        : preference.cadence,
    createdAt: row.createdAt,
  }
}

async function upsertPreference(
  ctx: MutationCtx,
  followId: Id<'follows'>,
  cadence: DeliveryCadence,
): Promise<void> {
  const now = Date.now()
  const existing = await ctx.db
    .query('notificationPreferences')
    .withIndex('by_follow_id', (index) => index.eq('followId', followId))
    .unique()
  if (existing) {
    const resumeCadence = cadenceAfterMute(cadence, existing)
    await ctx.db.patch('notificationPreferences', existing._id, {
      cadence,
      resumeCadence,
      updatedAt: now,
    })
    return
  }
  await ctx.db.insert('notificationPreferences', {
    followId,
    cadence,
    resumeCadence: cadence === 'muted' ? 'immediate' : cadence,
    createdAt: now,
    updatedAt: now,
  })
}

function cadenceAfterMute(
  cadence: DeliveryCadence,
  existing: Doc<'notificationPreferences'>,
): ActiveDeliveryCadence {
  if (cadence !== 'muted') return cadence
  if (existing.cadence !== 'muted') return existing.cadence
  return existing.resumeCadence ?? 'immediate'
}
