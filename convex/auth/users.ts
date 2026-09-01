import { ConvexError, v } from 'convex/values'
import { vGoogleProfile } from '@convex-dev/auth/providers/oauth/google'

import { internalMutation } from '../_generated/server'

const googleCallbackArgs = {
  provider: v.literal('google'),
  providerAccountId: v.string(),
  profile: vGoogleProfile,
}

export const createUserGoogle = internalMutation({
  args: googleCallbackArgs,
  returns: v.id('users'),
  handler: async (ctx, args) => {
    const profile = verifiedGoogleProfile(args)
    const existing = await ctx.db
      .query('users')
      .withIndex('by_google_account_id', (query) =>
        query.eq('googleAccountId', args.providerAccountId),
      )
      .unique()
    if (existing !== null) {
      throw new ConvexError({
        code: 'ACCOUNT_EXISTS',
        message: 'This Google account is already connected.',
      })
    }

    const now = Date.now()
    return await ctx.db.insert('users', {
      googleAccountId: args.providerAccountId,
      email: profile.email,
      emailVerified: true,
      ...(profile.name === undefined ? {} : { name: profile.name }),
      ...(profile.picture === undefined ? {} : { picture: profile.picture }),
      createdAt: now,
      updatedAt: now,
      lastSignedInAt: now,
    })
  },
})

export const onSignInGoogle = internalMutation({
  args: {
    ...googleCallbackArgs,
    userId: v.id('users'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = verifiedGoogleProfile(args)
    const user = await ctx.db.get('users', args.userId)
    if (user === null || user.googleAccountId !== args.providerAccountId) {
      throw new ConvexError({
        code: 'ACCOUNT_MISMATCH',
        message: 'This Google account does not match the saved user.',
      })
    }

    const now = Date.now()
    await ctx.db.patch('users', user._id, {
      email: profile.email,
      ...(profile.name === undefined ? {} : { name: profile.name }),
      ...(profile.picture === undefined ? {} : { picture: profile.picture }),
      updatedAt: now,
      lastSignedInAt: now,
    })
    return null
  },
})

function verifiedGoogleProfile(args: {
  providerAccountId: string
  profile: {
    id: string
    email?: string
    emailVerified: boolean
    name?: string
    picture?: string
  }
}) {
  const email = args.profile.email?.trim().toLowerCase() ?? ''
  if (
    args.profile.id !== args.providerAccountId ||
    !args.profile.emailVerified ||
    email.length === 0 ||
    !email.includes('@')
  ) {
    throw new ConvexError({
      code: 'UNVERIFIED_GOOGLE_PROFILE',
      message: 'Google did not provide a verified email for this account.',
    })
  }
  return { ...args.profile, email }
}
