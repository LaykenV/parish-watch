import { setupCore } from '@convex-dev/auth/core/setup'
import { setupGoogle } from '@convex-dev/auth/providers/oauth/google'
import { v } from 'convex/values'

import { components, internal } from './_generated/api'
import { env, query } from './_generated/server'
import { currentUserOrNull, isOwner } from './auth/authorization'

const core = setupCore({ component: components.auth })

export const { signOut, refreshSession, isAuthenticated } = core

const allowedRedirectOrigins = redirectOriginsFor(env.CONVEX_SITE_URL)

export const { startSignInGoogle, completeSignInGoogle } = setupGoogle(core, {
  component: components.oauthGoogle,
  allowedRedirectOrigins,
}).attachUserCallbacks({
  createUser: internal.auth.users.createUserGoogle,
  onSignIn: internal.auth.users.onSignInGoogle,
})

export const currentUser = query({
  args: {},
  returns: v.union(
    v.object({
      name: v.optional(v.string()),
      picture: v.optional(v.string()),
      isOwner: v.boolean(),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const user = await currentUserOrNull(ctx)
    if (user === null) return null
    return {
      ...(user.name === undefined ? {} : { name: user.name }),
      ...(user.picture === undefined ? {} : { picture: user.picture }),
      isOwner: isOwner(user),
    }
  },
})

function redirectOriginsFor(siteUrl: string | undefined): string[] {
  if (!siteUrl) return []
  const siteOrigin = new URL(siteUrl).origin
  const origins = [siteOrigin, 'https://www.publicparish.com']
  if (siteOrigin === 'https://woozy-wren-227.convex.site') {
    origins.push('http://localhost:3000')
  }
  return [...new Set(origins)]
}
