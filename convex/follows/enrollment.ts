import { HOUR, MINUTE, RateLimiter } from '@convex-dev/rate-limiter'
import type { OutboundId } from '@agentmail/convex'
import { ConvexError, v } from 'convex/values'

import { components, internal } from '../_generated/api'
import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { action, internalMutation, mutation, query } from '../_generated/server'
import { requireUser } from '../auth/authorization'
import { agentmail, updatesInboxId } from './agentmailClient'
import {
  activeDeliveryCadence,
  deliveryCadence,
  followTargetKind,
  followView,
  MANAGEMENT_TOKEN_TTL_MS,
  MAX_FOLLOWS_PER_OWNER,
  VERIFICATION_CODE_LENGTH,
  VERIFICATION_MAX_ATTEMPTS,
  VERIFICATION_TTL_MS,
} from './enrollmentContracts'
import type { DeliveryCadence, FollowTargetKind } from './enrollmentContracts'
import {
  createOpaqueToken,
  createVerificationCode,
  encryptAddress,
  hashAccessToken,
  hashAddress,
  hashVerificationCode,
  normalizeEmail,
} from './secrets'
import { resolveFollowTarget } from './targets'

const emailFollowLimiter = new RateLimiter(components.rateLimiter, {
  emailFollowAddress: { kind: 'fixed window', rate: 5, period: HOUR },
  emailFollowGlobal: {
    kind: 'token bucket',
    rate: 60,
    period: MINUTE,
    capacity: 20,
  },
})

const requestResult = v.object({
  accepted: v.literal(true),
  challengeId: v.string(),
  expiresAt: v.number(),
})

const verificationResult = v.union(
  v.object({ status: v.literal('wrong'), attemptsRemaining: v.number() }),
  v.object({ status: v.literal('expired') }),
  v.object({ status: v.literal('exhausted') }),
  v.object({ status: v.literal('replayed') }),
  v.object({ status: v.literal('invalid') }),
  v.object({
    status: v.literal('verified'),
    created: v.boolean(),
    follow: followView,
    managementToken: v.string(),
    unsubscribeToken: v.string(),
  }),
)

const googleFollowResult = v.object({
  created: v.boolean(),
  follow: followView,
})

type RequestResult = {
  accepted: true
  challengeId: string
  expiresAt: number
}

type FollowView = {
  id: string
  targetKind: FollowTargetKind
  targetKey: string
  title: string
  detail: string
  cadence: DeliveryCadence
  createdAt: number
}

type ConsumeResult =
  | { status: 'wrong'; attemptsRemaining: number }
  | { status: 'expired' | 'exhausted' | 'replayed' | 'invalid' }
  | {
      status: 'verified'
      created: boolean
      follow: FollowView
    }

type VerificationResult =
  | Exclude<ConsumeResult, { status: 'verified' }>
  | {
      status: 'verified'
      created: boolean
      follow: FollowView
      managementToken: string
      unsubscribeToken: string
    }

export const requestEmailFollow = action({
  args: {
    email: v.string(),
    targetKind: followTargetKind,
    targetKey: v.string(),
    cadence: activeDeliveryCadence,
  },
  returns: requestResult,
  handler: async (ctx, args): Promise<RequestResult> => {
    const email = normalizeEmail(args.email)
    const challengeId = createOpaqueToken(24)
    const code = createVerificationCode()
    const [addressHash, encryptedAddress, codeHash] = await Promise.all([
      hashAddress(email),
      encryptAddress(email),
      hashVerificationCode(challengeId, code),
    ])

    return await ctx.runMutation(
      internal.follows.enrollment.prepareEmailFollow,
      {
        addressHash,
        encryptedAddress,
        recipient: email,
        challengeId,
        code,
        codeHash,
        targetKind: args.targetKind,
        targetKey: args.targetKey,
        cadence: args.cadence,
      },
    )
  },
})

export const prepareEmailFollow = internalMutation({
  args: {
    addressHash: v.string(),
    encryptedAddress: v.string(),
    recipient: v.string(),
    challengeId: v.string(),
    code: v.string(),
    codeHash: v.string(),
    targetKind: followTargetKind,
    targetKey: v.string(),
    cadence: activeDeliveryCadence,
  },
  returns: requestResult,
  handler: async (ctx, args): Promise<RequestResult> => {
    await resolveFollowTarget(ctx, args.targetKind, args.targetKey)
    const now = Date.now()
    const expiresAt = now + VERIFICATION_TTL_MS
    const [addressLimit, globalLimit] = await Promise.all([
      emailFollowLimiter.limit(ctx, 'emailFollowAddress', {
        key: args.addressHash,
      }),
      emailFollowLimiter.limit(ctx, 'emailFollowGlobal'),
    ])
    if (!addressLimit.ok || !globalLimit.ok) {
      return {
        accepted: true as const,
        challengeId: args.challengeId,
        expiresAt,
      }
    }

    const existing = await ctx.db
      .query('emailSubscribers')
      .withIndex('by_address_hash', (index) =>
        index.eq('addressHash', args.addressHash),
      )
      .unique()
    let subscriberId: Id<'emailSubscribers'>
    if (existing) {
      subscriberId = existing._id
      await ctx.db.patch('emailSubscribers', existing._id, {
        encryptedAddress: args.encryptedAddress,
        encryptionVersion: 1,
        updatedAt: now,
      })
    } else {
      subscriberId = await ctx.db.insert('emailSubscribers', {
        addressHash: args.addressHash,
        encryptedAddress: args.encryptedAddress,
        encryptionVersion: 1,
        state: 'pending',
        createdAt: now,
        updatedAt: now,
      })
    }

    const previousChallenges = await ctx.db
      .query('emailVerificationChallenges')
      .withIndex('by_subscriber_id_and_purpose_and_created_at', (index) =>
        index.eq('subscriberId', subscriberId).eq('purpose', 'create_follow'),
      )
      .order('desc')
      .take(VERIFICATION_MAX_ATTEMPTS + 2)
    for (const previous of previousChallenges) {
      if (!previous.consumedAt) {
        await ctx.db.patch('emailVerificationChallenges', previous._id, {
          consumedAt: now,
        })
      }
    }

    const challengeDocumentId = await ctx.db.insert(
      'emailVerificationChallenges',
      {
        subscriberId,
        challengeId: args.challengeId,
        codeHash: args.codeHash,
        purpose: 'create_follow',
        targetKind: args.targetKind,
        targetKey: args.targetKey,
        cadence: args.cadence,
        expiresAt,
        attempts: 0,
        createdAt: now,
      },
    )

    const outboundId = await agentmail.sendMessage(ctx, updatesInboxId(), {
      to: args.recipient,
      subject: 'Your Public Parish verification code',
      text: verificationEmailText(args.code),
      labels: ['public-parish', 'verification'],
    })
    await ctx.db.patch('emailVerificationChallenges', challengeDocumentId, {
      outboundId,
    })
    return { accepted: true as const, challengeId: args.challengeId, expiresAt }
  },
})

export const verificationDelivery = query({
  args: { challengeId: v.string() },
  returns: v.object({
    status: v.union(
      v.literal('pending'),
      v.literal('sent'),
      v.literal('failed'),
      v.literal('unavailable'),
    ),
    expiresAt: v.union(v.number(), v.null()),
  }),
  handler: async (ctx, args) => {
    const challenge = await ctx.db
      .query('emailVerificationChallenges')
      .withIndex('by_challenge_id', (index) =>
        index.eq('challengeId', args.challengeId),
      )
      .unique()
    if (!challenge) return { status: 'unavailable' as const, expiresAt: null }
    if (!challenge.outboundId) {
      return { status: 'pending' as const, expiresAt: challenge.expiresAt }
    }
    const outbound = await agentmail.status(
      ctx,
      challenge.outboundId as OutboundId,
    )
    if (!outbound) {
      return { status: 'unavailable' as const, expiresAt: challenge.expiresAt }
    }
    if (outbound.status === 'failed' || outbound.status === 'bounced') {
      return { status: 'failed' as const, expiresAt: challenge.expiresAt }
    }
    if (outbound.status === 'pending') {
      return { status: 'pending' as const, expiresAt: challenge.expiresAt }
    }
    return { status: 'sent' as const, expiresAt: challenge.expiresAt }
  },
})

export const verifyEmailFollow = action({
  args: { challengeId: v.string(), code: v.string() },
  returns: verificationResult,
  handler: async (ctx, args): Promise<VerificationResult> => {
    const code = args.code.trim()
    const checkedCode = new RegExp(`^\\d{${VERIFICATION_CODE_LENGTH}}$`).test(
      code,
    )
      ? code
      : 'invalid'
    const managementToken = createOpaqueToken()
    const unsubscribeToken = createOpaqueToken()
    const [codeHash, managementTokenHash, unsubscribeTokenHash] =
      await Promise.all([
        hashVerificationCode(args.challengeId, checkedCode),
        hashAccessToken(managementToken),
        hashAccessToken(unsubscribeToken),
      ])
    const result: ConsumeResult = await ctx.runMutation(
      internal.follows.enrollment.consumeEmailFollowChallenge,
      {
        challengeId: args.challengeId,
        codeHash,
        managementTokenHash,
        unsubscribeTokenHash,
      },
    )
    if (result.status !== 'verified') return result
    return { ...result, managementToken, unsubscribeToken }
  },
})

export const consumeEmailFollowChallenge = internalMutation({
  args: {
    challengeId: v.string(),
    codeHash: v.string(),
    managementTokenHash: v.string(),
    unsubscribeTokenHash: v.string(),
  },
  returns: v.union(
    v.object({ status: v.literal('wrong'), attemptsRemaining: v.number() }),
    v.object({ status: v.literal('expired') }),
    v.object({ status: v.literal('exhausted') }),
    v.object({ status: v.literal('replayed') }),
    v.object({ status: v.literal('invalid') }),
    v.object({
      status: v.literal('verified'),
      created: v.boolean(),
      follow: followView,
    }),
  ),
  handler: async (ctx, args) => {
    const challenge = await ctx.db
      .query('emailVerificationChallenges')
      .withIndex('by_challenge_id', (index) =>
        index.eq('challengeId', args.challengeId),
      )
      .unique()
    if (!challenge) return { status: 'invalid' as const }
    if (challenge.consumedAt) return { status: 'replayed' as const }
    const now = Date.now()
    if (challenge.expiresAt <= now) return { status: 'expired' as const }
    if (challenge.attempts >= VERIFICATION_MAX_ATTEMPTS) {
      return { status: 'exhausted' as const }
    }
    if (challenge.codeHash !== args.codeHash) {
      const attempts = challenge.attempts + 1
      await ctx.db.patch('emailVerificationChallenges', challenge._id, {
        attempts,
      })
      return attempts >= VERIFICATION_MAX_ATTEMPTS
        ? { status: 'exhausted' as const }
        : {
            status: 'wrong' as const,
            attemptsRemaining: VERIFICATION_MAX_ATTEMPTS - attempts,
          }
    }

    const subscriber = await ctx.db.get(
      'emailSubscribers',
      challenge.subscriberId,
    )
    if (!subscriber) return { status: 'invalid' as const }
    const target = await resolveFollowTarget(
      ctx,
      challenge.targetKind,
      challenge.targetKey,
    )
    const ownerKey = `email:${subscriber._id}`
    const existingFollow = await findFollow(
      ctx,
      ownerKey,
      target.targetKind,
      target.targetKey,
    )
    if (!existingFollow) await enforceFollowLimit(ctx, 'email', subscriber._id)

    await ctx.db.patch('emailVerificationChallenges', challenge._id, {
      consumedAt: now,
    })
    await ctx.db.patch('emailSubscribers', subscriber._id, {
      state: 'verified',
      verifiedAt: now,
      unsubscribedAt: undefined,
      updatedAt: now,
    })

    const followId =
      existingFollow?._id ??
      (await ctx.db.insert('follows', {
        ownerKind: 'email',
        ownerKey,
        emailSubscriberId: subscriber._id,
        targetKind: target.targetKind,
        targetKey: target.targetKey,
        targetTitle: target.title,
        targetDetail: target.detail,
        createdAt: now,
        updatedAt: now,
      }))
    if (existingFollow) {
      await ctx.db.patch('follows', existingFollow._id, {
        targetTitle: target.title,
        targetDetail: target.detail,
        updatedAt: now,
      })
    }
    await upsertPreference(ctx, followId, challenge.cadence, now)
    await rotateTokens(
      ctx,
      subscriber._id,
      followId,
      args.managementTokenHash,
      args.unsubscribeTokenHash,
      now,
    )
    const follow = await readFollowView(ctx, followId)
    if (!follow) throw new Error('Verified follow is unavailable')
    return {
      status: 'verified' as const,
      created: !existingFollow,
      follow,
    }
  },
})

export const createGoogleFollow = mutation({
  args: {
    targetKind: followTargetKind,
    targetKey: v.string(),
    cadence: activeDeliveryCadence,
  },
  returns: googleFollowResult,
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    const target = await resolveFollowTarget(
      ctx,
      args.targetKind,
      args.targetKey,
    )
    const ownerKey = `google:${user._id}`
    const existing = await findFollow(
      ctx,
      ownerKey,
      target.targetKind,
      target.targetKey,
    )
    if (!existing) await enforceFollowLimit(ctx, 'google', user._id)
    const now = Date.now()
    const followId =
      existing?._id ??
      (await ctx.db.insert('follows', {
        ownerKind: 'google',
        ownerKey,
        userId: user._id,
        targetKind: target.targetKind,
        targetKey: target.targetKey,
        targetTitle: target.title,
        targetDetail: target.detail,
        createdAt: now,
        updatedAt: now,
      }))
    if (existing) {
      await ctx.db.patch('follows', existing._id, {
        targetTitle: target.title,
        targetDetail: target.detail,
        updatedAt: now,
      })
    }
    await upsertPreference(ctx, followId, args.cadence, now)
    const follow = await readFollowView(ctx, followId)
    if (!follow) throw new Error('Follow is unavailable')
    return { created: !existing, follow }
  },
})

export const currentGoogleFollows = query({
  args: {},
  returns: v.array(followView),
  handler: async (ctx) => {
    const user = await requireUser(ctx)
    const rows = await ctx.db
      .query('follows')
      .withIndex('by_user_id_and_created_at', (index) =>
        index.eq('userId', user._id),
      )
      .order('desc')
      .take(MAX_FOLLOWS_PER_OWNER)
    const views = await Promise.all(
      rows.map((row) => followViewForRow(ctx, row)),
    )
    return views.filter((value): value is NonNullable<typeof value> => !!value)
  },
})

export const updateGoogleFollow = mutation({
  args: { followId: v.id('follows'), cadence: deliveryCadence },
  returns: v.object({ updated: v.boolean() }),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    const follow = await ctx.db.get('follows', args.followId)
    if (
      !follow ||
      follow.ownerKind !== 'google' ||
      follow.userId !== user._id
    ) {
      throw forbiddenFollow()
    }
    await upsertPreference(ctx, follow._id, args.cadence, Date.now())
    return { updated: true }
  },
})

export const removeGoogleFollow = mutation({
  args: { followId: v.id('follows') },
  returns: v.object({ removed: v.boolean() }),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    const follow = await ctx.db.get('follows', args.followId)
    if (
      !follow ||
      follow.ownerKind !== 'google' ||
      follow.userId !== user._id
    ) {
      throw forbiddenFollow()
    }
    const preference = await ctx.db
      .query('notificationPreferences')
      .withIndex('by_follow_id', (index) => index.eq('followId', follow._id))
      .unique()
    if (preference)
      await ctx.db.delete('notificationPreferences', preference._id)
    await ctx.db.delete('follows', follow._id)
    return { removed: true }
  },
})

function verificationEmailText(code: string): string {
  return [
    'Use this code to follow civic updates from Public Parish:',
    '',
    code,
    '',
    'This code expires in 10 minutes. If you did not request it, ignore this message.',
  ].join('\n')
}

async function findFollow(
  ctx: MutationCtx,
  ownerKey: string,
  targetKind: FollowTargetKind,
  targetKey: string,
): Promise<Doc<'follows'> | null> {
  return await ctx.db
    .query('follows')
    .withIndex('by_owner_key_and_target_kind_and_target_key', (index) =>
      index
        .eq('ownerKey', ownerKey)
        .eq('targetKind', targetKind)
        .eq('targetKey', targetKey),
    )
    .unique()
}

async function enforceFollowLimit(
  ctx: MutationCtx,
  ownerKind: 'google' | 'email',
  ownerId: Id<'users'> | Id<'emailSubscribers'>,
): Promise<void> {
  const rows =
    ownerKind === 'google'
      ? await ctx.db
          .query('follows')
          .withIndex('by_user_id_and_created_at', (index) =>
            index.eq('userId', ownerId as Id<'users'>),
          )
          .take(MAX_FOLLOWS_PER_OWNER)
      : await ctx.db
          .query('follows')
          .withIndex('by_email_subscriber_id_and_created_at', (index) =>
            index.eq('emailSubscriberId', ownerId as Id<'emailSubscribers'>),
          )
          .take(MAX_FOLLOWS_PER_OWNER)
  if (rows.length >= MAX_FOLLOWS_PER_OWNER) {
    throw new ConvexError('This owner has reached the follow limit')
  }
}

async function upsertPreference(
  ctx: MutationCtx,
  followId: Id<'follows'>,
  cadence: DeliveryCadence,
  now: number,
): Promise<void> {
  const existing = await ctx.db
    .query('notificationPreferences')
    .withIndex('by_follow_id', (index) => index.eq('followId', followId))
    .unique()
  if (existing) {
    await ctx.db.patch('notificationPreferences', existing._id, {
      cadence,
      updatedAt: now,
    })
  } else {
    await ctx.db.insert('notificationPreferences', {
      followId,
      cadence,
      createdAt: now,
      updatedAt: now,
    })
  }
}

async function rotateTokens(
  ctx: MutationCtx,
  subscriberId: Id<'emailSubscribers'>,
  followId: Id<'follows'>,
  managementTokenHash: string,
  unsubscribeTokenHash: string,
  now: number,
): Promise<void> {
  const [managementTokens, unsubscribeTokens] = await Promise.all([
    ctx.db
      .query('emailAccessTokens')
      .withIndex('by_follow_id_and_kind_and_created_at', (index) =>
        index.eq('followId', followId).eq('kind', 'management'),
      )
      .order('desc')
      .take(10),
    ctx.db
      .query('emailAccessTokens')
      .withIndex('by_subscriber_id_and_kind_and_created_at', (index) =>
        index.eq('subscriberId', subscriberId).eq('kind', 'unsubscribe'),
      )
      .order('desc')
      .take(10),
  ])
  for (const token of [...managementTokens, ...unsubscribeTokens]) {
    if (!token.revokedAt && !token.consumedAt) {
      await ctx.db.patch('emailAccessTokens', token._id, { revokedAt: now })
    }
  }
  await ctx.db.insert('emailAccessTokens', {
    subscriberId,
    followId,
    kind: 'management',
    tokenHash: managementTokenHash,
    expiresAt: now + MANAGEMENT_TOKEN_TTL_MS,
    createdAt: now,
  })
  await ctx.db.insert('emailAccessTokens', {
    subscriberId,
    kind: 'unsubscribe',
    tokenHash: unsubscribeTokenHash,
    createdAt: now,
  })
}

async function readFollowView(
  ctx: MutationCtx,
  followId: Id<'follows'>,
): Promise<{
  id: string
  targetKind: FollowTargetKind
  targetKey: string
  title: string
  detail: string
  cadence: DeliveryCadence
  createdAt: number
} | null> {
  const row = await ctx.db.get('follows', followId)
  return row ? await followViewForRow(ctx, row) : null
}

async function followViewForRow(
  ctx: Pick<QueryCtx, 'db'>,
  row: Doc<'follows'>,
) {
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
    createdAt: row.createdAt,
  }
}

function forbiddenFollow(): ConvexError<string> {
  return new ConvexError('This follow is unavailable')
}
