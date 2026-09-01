import { ConvexError } from 'convex/values'

import type { Doc } from '../_generated/dataModel'
import { env } from '../_generated/server'
import type { MutationCtx, QueryCtx } from '../_generated/server'

type AuthzCtx = Pick<QueryCtx | MutationCtx, 'auth' | 'db'>

export async function currentUserOrNull(
  ctx: AuthzCtx,
): Promise<Doc<'users'> | null> {
  const identity = await ctx.auth.getUserIdentity()
  if (identity === null) return null

  // Convex Auth v2 signs the application user ID into the JWT subject.
  const userId = ctx.db.normalizeId('users', identity.subject)
  if (userId === null) return null
  return await ctx.db.get('users', userId)
}

export async function requireUser(ctx: AuthzCtx): Promise<Doc<'users'>> {
  const user = await currentUserOrNull(ctx)
  if (user === null) {
    throw new ConvexError({
      code: 'UNAUTHENTICATED',
      message: 'Sign in with Google to manage saved interests.',
    })
  }
  return user
}

export function isOwner(user: Doc<'users'>): boolean {
  const configuredEmail = normalizeEmail(env.ADMIN_EMAIL)
  return (
    configuredEmail !== null &&
    user.emailVerified === true &&
    user.email === configuredEmail
  )
}

export async function requireOwner(ctx: AuthzCtx): Promise<Doc<'users'>> {
  const user = await requireUser(ctx)
  if (!isOwner(user)) {
    throw new ConvexError({
      code: 'FORBIDDEN',
      message: 'Owner access is unavailable.',
    })
  }
  return user
}

function normalizeEmail(value: string | undefined): string | null {
  const normalized = value?.trim().toLowerCase() ?? ''
  return normalized.length > 0 && normalized.includes('@') ? normalized : null
}
