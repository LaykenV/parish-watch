/// <reference types="vite/client" />

import { convexTest } from 'convex-test'
import type { TestConvexForDataModelAndIdentity } from 'convex-test'
import { afterEach, expect, test, vi } from 'vitest'

import { api, internal } from './_generated/api'
import type { DataModel, Id } from './_generated/dataModel'
import { requireOwner } from './auth/authorization'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')
type TestConvex = TestConvexForDataModelAndIdentity<DataModel>

afterEach(() => vi.unstubAllEnvs())

test('anonymous callers cannot read or change saved setup', async () => {
  const t = convexTest(schema, modules)

  await expect(t.query(api.follows.savedSetup.current, {})).rejects.toThrow(
    'Sign in with Google',
  )
  await expect(
    t.mutation(api.follows.savedSetup.saveArea, {
      area: 'lafayette-parish',
    }),
  ).rejects.toThrow('Sign in with Google')
  await expect(
    t.mutation(api.follows.savedSetup.saveTopic, { topic: 'public-money' }),
  ).rejects.toThrow('Sign in with Google')
  await expect(t.query(api.auth.currentUser, {})).resolves.toBeNull()
})

test('saved setup is idempotent and returned in contract order', async () => {
  const t = convexTest(schema, modules)
  const userId = await createGoogleUser(t, 'google-alice', 'alice@example.com')
  const alice = t.withIdentity({ subject: userId })

  await expect(
    alice.mutation(api.follows.savedSetup.saveArea, {
      area: 'rapides-parish',
    }),
  ).resolves.toEqual({ created: true })
  await expect(
    alice.mutation(api.follows.savedSetup.saveArea, {
      area: 'lafayette-parish',
    }),
  ).resolves.toEqual({ created: true })
  await expect(
    alice.mutation(api.follows.savedSetup.saveArea, {
      area: 'lafayette-parish',
    }),
  ).resolves.toEqual({ created: false })
  await expect(
    alice.mutation(api.follows.savedSetup.saveTopic, { topic: 'land-use' }),
  ).resolves.toEqual({ created: true })
  await expect(
    alice.mutation(api.follows.savedSetup.saveTopic, {
      topic: 'public-money',
    }),
  ).resolves.toEqual({ created: true })
  await expect(
    alice.mutation(api.follows.savedSetup.saveTopic, {
      topic: 'public-money',
    }),
  ).resolves.toEqual({ created: false })

  await expect(
    alice.query(api.follows.savedSetup.current, {}),
  ).resolves.toEqual({
    areas: ['lafayette-parish', 'rapides-parish'],
    topics: ['public-money', 'land-use'],
  })

  await expect(
    alice.mutation(api.follows.savedSetup.removeArea, {
      area: 'lafayette-parish',
    }),
  ).resolves.toEqual({ removed: true })
  await expect(
    alice.mutation(api.follows.savedSetup.removeArea, {
      area: 'lafayette-parish',
    }),
  ).resolves.toEqual({ removed: false })
  await expect(
    alice.mutation(api.follows.savedSetup.removeTopic, {
      topic: 'public-money',
    }),
  ).resolves.toEqual({ removed: true })
  await expect(
    alice.mutation(api.follows.savedSetup.removeTopic, {
      topic: 'public-money',
    }),
  ).resolves.toEqual({ removed: false })
})

test('one user cannot read or remove another user saved setup', async () => {
  const t = convexTest(schema, modules)
  const aliceId = await createGoogleUser(t, 'google-alice', 'alice@example.com')
  const bobId = await createGoogleUser(t, 'google-bob', 'bob@example.com')
  const alice = t.withIdentity({ subject: aliceId })
  const bob = t.withIdentity({ subject: bobId })

  await alice.mutation(api.follows.savedSetup.saveArea, {
    area: 'east-baton-rouge-parish',
  })
  await alice.mutation(api.follows.savedSetup.saveTopic, { topic: 'drainage' })

  await expect(bob.query(api.follows.savedSetup.current, {})).resolves.toEqual({
    areas: [],
    topics: [],
  })
  await expect(
    bob.mutation(api.follows.savedSetup.removeArea, {
      area: 'east-baton-rouge-parish',
    }),
  ).resolves.toEqual({ removed: false })
  await expect(
    bob.mutation(api.follows.savedSetup.removeTopic, { topic: 'drainage' }),
  ).resolves.toEqual({ removed: false })
  await expect(
    alice.query(api.follows.savedSetup.current, {}),
  ).resolves.toEqual({
    areas: ['east-baton-rouge-parish'],
    topics: ['drainage'],
  })
})

test('fixed validators reject unsupported saved targets', async () => {
  const t = convexTest(schema, modules)
  const userId = await createGoogleUser(t, 'google-alice', 'alice@example.com')
  const alice = t.withIdentity({ subject: userId })

  await expect(
    alice.mutation(api.follows.savedSetup.saveArea, {
      area: 'unsupported-parish' as never,
    }),
  ).rejects.toThrow('Validator error')
  await expect(
    alice.mutation(api.follows.savedSetup.saveTopic, {
      topic: 'anything-at-all' as never,
    }),
  ).rejects.toThrow('Validator error')
})

test('Google callbacks require a verified matching profile and refresh it', async () => {
  const t = convexTest(schema, modules)

  await expect(
    t.mutation(internal.auth.users.createUserGoogle, {
      provider: 'google',
      providerAccountId: 'google-unverified',
      profile: {
        id: 'google-unverified',
        email: 'resident@example.com',
        emailVerified: false,
      },
    }),
  ).rejects.toThrow('verified email')
  await expect(
    t.mutation(internal.auth.users.createUserGoogle, {
      provider: 'google',
      providerAccountId: 'google-account',
      profile: {
        id: 'different-google-account',
        email: 'resident@example.com',
        emailVerified: true,
      },
    }),
  ).rejects.toThrow('verified email')

  const userId = await createGoogleUser(
    t,
    'google-account',
    ' Resident@Example.com ',
  )
  await expect(
    t.mutation(internal.auth.users.onSignInGoogle, {
      provider: 'google',
      providerAccountId: 'google-account',
      profile: {
        id: 'google-account',
        email: 'RESIDENT@example.com',
        emailVerified: true,
        name: 'Resident Name',
      },
      userId,
    }),
  ).resolves.toBeNull()
  await expect(
    t.run(async (ctx) => await ctx.db.get('users', userId)),
  ).resolves.toMatchObject({
    email: 'resident@example.com',
    emailVerified: true,
    name: 'Resident Name',
  })

  const otherUserId = await createGoogleUser(
    t,
    'google-other',
    'other@example.com',
  )
  await expect(
    t.mutation(internal.auth.users.onSignInGoogle, {
      provider: 'google',
      providerAccountId: 'google-account',
      profile: {
        id: 'google-account',
        email: 'resident@example.com',
        emailVerified: true,
      },
      userId: otherUserId,
    }),
  ).rejects.toThrow('does not match')
})

test('owner access fails closed until ADMIN_EMAIL matches the verified user', async () => {
  const t = convexTest(schema, modules)
  const userId = await createGoogleUser(t, 'google-owner', 'owner@example.com')
  const owner = t.withIdentity({ subject: userId })

  vi.stubEnv('ADMIN_EMAIL', '')
  await expect(
    owner.run(async (ctx) => await requireOwner(ctx)),
  ).rejects.toThrow('Owner access is unavailable')

  vi.stubEnv('ADMIN_EMAIL', 'someone-else@example.com')
  await expect(
    owner.run(async (ctx) => await requireOwner(ctx)),
  ).rejects.toThrow('Owner access is unavailable')

  vi.stubEnv('ADMIN_EMAIL', ' OWNER@EXAMPLE.COM ')
  await expect(
    owner.run(async (ctx) => (await requireOwner(ctx))._id),
  ).resolves.toEqual(userId)
  await expect(owner.query(api.auth.currentUser, {})).resolves.toMatchObject({
    isOwner: true,
  })
})

async function createGoogleUser(
  t: TestConvex,
  providerAccountId: string,
  email: string,
): Promise<Id<'users'>> {
  return await t.mutation(internal.auth.users.createUserGoogle, {
    provider: 'google',
    providerAccountId,
    profile: {
      id: providerAccountId,
      email,
      emailVerified: true,
    },
  })
}
