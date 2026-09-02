/// <reference types="vite/client" />

import { verifyAgentMailWebhook } from '@agentmail/convex'
import { convexTest } from 'convex-test'
import type { TestConvexForDataModelAndIdentity } from 'convex-test'
import { expect, test } from 'vitest'

import { api, internal } from './_generated/api'
import type { DataModel, Id } from './_generated/dataModel'
import schema from './schema'
import { canonicalTopicSlug } from './follows/targets'

const modules = import.meta.glob('./**/*.ts')
type TestConvex = TestConvexForDataModelAndIdentity<DataModel>

test('issue topics map only through the explicit follow aliases', () => {
  expect(canonicalTopicSlug('Public assets')).toBe('public-assets')
  expect(canonicalTopicSlug('land_use')).toBe('land-use')
  expect(canonicalTopicSlug('Taxes')).toBeNull()
})

test('email verification rejects wrong, expired, exhausted, replayed, and concurrent codes', async () => {
  const t = convexTest(schema, modules)
  const subscriberId = await createSubscriber(t, 'address-a')

  const wrongId = await createChallenge(t, subscriberId, 'wrong', 'right-hash')
  await expect(consume(t, 'wrong', 'bad-hash')).resolves.toEqual({
    status: 'wrong',
    attemptsRemaining: 2,
  })
  await consume(t, 'wrong', 'bad-hash')
  await expect(consume(t, 'wrong', 'bad-hash')).resolves.toEqual({
    status: 'exhausted',
  })
  await expect(consume(t, 'wrong', 'right-hash')).resolves.toEqual({
    status: 'exhausted',
  })

  await createChallenge(t, subscriberId, 'expired', 'code-hash', Date.now() - 1)
  await expect(consume(t, 'expired', 'code-hash')).resolves.toEqual({
    status: 'expired',
  })

  await createChallenge(t, subscriberId, 'replay', 'code-hash')
  await expect(consume(t, 'replay', 'code-hash')).resolves.toMatchObject({
    status: 'verified',
    created: true,
  })
  await expect(consume(t, 'replay', 'code-hash')).resolves.toEqual({
    status: 'replayed',
  })

  await createChallenge(
    t,
    subscriberId,
    'concurrent',
    'code-hash',
    undefined,
    'drainage',
  )
  const concurrent = await Promise.all([
    consume(t, 'concurrent', 'code-hash', 'management-concurrent-a'),
    consume(t, 'concurrent', 'code-hash', 'management-concurrent-b'),
  ])
  expect(concurrent.map((result) => result.status).sort()).toEqual([
    'replayed',
    'verified',
  ])

  await t.run(async (ctx) => {
    expect(
      await ctx.db.get('emailVerificationChallenges', wrongId),
    ).toMatchObject({
      attempts: 3,
    })
    expect(await ctx.db.query('users').take(10)).toHaveLength(0)
  })
})

test('Google and email owners can follow the same target without duplicates', async () => {
  const t = convexTest(schema, modules)
  const userId = await createGoogleUser(t, 'google-a', 'google@example.com')
  const google = t.withIdentity({ subject: userId })
  const subscriberId = await createSubscriber(t, 'address-b')
  await createChallenge(t, subscriberId, 'email-follow', 'code-hash')

  const googleFirst = await google.mutation(
    api.follows.enrollment.createGoogleFollow,
    {
      targetKind: 'topic',
      targetKey: 'public-money',
      cadence: 'weekly',
    },
  )
  const googleAgain = await google.mutation(
    api.follows.enrollment.createGoogleFollow,
    {
      targetKind: 'topic',
      targetKey: 'public-money',
      cadence: 'both',
    },
  )
  const email = await consume(t, 'email-follow', 'code-hash')

  expect(googleFirst.created).toBe(true)
  expect(googleAgain).toMatchObject({
    created: false,
    follow: { cadence: 'both' },
  })
  expect(email).toMatchObject({ status: 'verified', created: true })
  await t.run(async (ctx) => {
    const follows = await ctx.db
      .query('follows')
      .withIndex('by_target_kind_and_target_key_and_owner_kind', (index) =>
        index.eq('targetKind', 'topic').eq('targetKey', 'public-money'),
      )
      .take(10)
    expect(follows.map((follow) => follow.ownerKind).sort()).toEqual([
      'email',
      'google',
    ])
  })
})

test('Google follows accept every supported target kind and both place types', async () => {
  const t = convexTest(schema, modules)
  const userId = await createGoogleUser(
    t,
    'google-targets',
    'targets@example.com',
  )
  const google = t.withIdentity({ subject: userId })
  const targets = await t.run(async (ctx) => {
    const parishId = await ctx.db.insert('jurisdictions', {
      name: 'Lafayette Parish',
      slug: 'lafayette-parish',
      type: 'parish',
      state: 'LA',
      publicStatus: 'supported',
    })
    await ctx.db.insert('jurisdictions', {
      name: 'Youngsville',
      slug: 'youngsville',
      type: 'municipality',
      state: 'LA',
      parentJurisdictionId: parishId,
      publicStatus: 'degraded',
    })
    await ctx.db.insert('jurisdictions', {
      name: 'Candidate Parish',
      slug: 'candidate-parish',
      type: 'parish',
      state: 'LA',
      publicStatus: 'candidate',
    })
    const governmentBodyId = await ctx.db.insert('governmentBodies', {
      jurisdictionId: parishId,
      name: 'Lafayette City Council',
      slug: 'lafayette-city-council',
      bodyType: 'city_council',
      publicStatus: 'supported',
    })
    const registryId = await ctx.db.insert('sourceRegistries', {
      governmentBodyId,
      officialDomains: ['lafayettela.gov'],
      seedUrls: ['https://lafayettela.gov/council'],
      sourceKinds: ['agenda'],
      expectedCadence: { kind: 'meeting_cycle' },
      discoveryMode: 'dynamic',
      status: 'supported',
    })
    const runId = await ctx.db.insert('pipelineRuns', {
      registryId,
      trigger: 'manual_issue_build',
      state: 'succeeded',
      processorVersion: 'test',
      startedAt: 1,
      completedAt: 2,
    })
    const buildId = await ctx.db.insert('issueBuilds', {
      runId,
      registryId,
      governmentBodyId,
      issueKey: 'drainage-plan',
      idempotencyKey: 'issue-build-drainage-plan',
      inputHash: 'issue-input-drainage-plan',
      recordIds: [],
      publicationVersionIds: [],
      state: 'published',
      promptVersion: 'test',
      schemaVersion: 'test',
      processorVersion: 'test',
      modelRole: 'MODEL_STRONG',
      createdAt: 3,
      updatedAt: 4,
    })
    const issueId = await ctx.db.insert('issues', {
      issueKey: 'drainage-plan',
      slug: 'drainage-plan',
      governmentBodyId,
      createdAt: 3,
      updatedAt: 4,
    })
    const issueVersionId = await ctx.db.insert('issueVersions', {
      issueId,
      buildId,
      version: 1,
      mode: 'full',
      reasonCode: 'accepted',
      policyVersion: 'test',
      payloadVersion: 'test',
      payloadHash: 'issue-payload-drainage-plan',
      payload: {
        kind: 'full',
        title: 'Drainage plan',
        summary: 'A published drainage plan.',
        topics: ['Drainage'],
        importance: {
          score: 0,
          maxScore: 100,
          completenessPercent: 100,
          supportedFactorCount: 0,
          totalFactorCount: 4,
          hasNearTermPublicDeadline: false,
        },
      },
      createdAt: 4,
    })
    await ctx.db.patch('issues', issueId, {
      currentVersionId: issueVersionId,
      currentMode: 'full',
    })
    await ctx.db.patch('issueBuilds', buildId, { issueVersionId })
    return {
      parish: 'lafayette-parish',
      municipality: 'youngsville',
      unavailableParish: 'candidate-parish',
      governmentBody: 'lafayette-city-council',
      issue: 'drainage-plan',
    }
  })

  const cases = [
    {
      targetKind: 'topic',
      targetKey: 'land-use',
      title: 'Land use',
      detail: 'Published local decisions in this topic',
    },
    {
      targetKind: 'issue',
      targetKey: targets.issue,
      title: 'Drainage plan',
      detail: 'Lafayette City Council',
    },
    {
      targetKind: 'government_body',
      targetKey: targets.governmentBody,
      title: 'Lafayette City Council',
      detail: 'Lafayette Parish',
    },
    {
      targetKind: 'place',
      targetKey: targets.parish,
      title: 'Lafayette Parish',
      detail: 'Parish',
    },
    {
      targetKind: 'place',
      targetKey: targets.municipality,
      title: 'Youngsville',
      detail: 'Municipality',
    },
  ] as const

  for (const target of cases) {
    await expect(
      google.mutation(api.follows.enrollment.createGoogleFollow, {
        targetKind: target.targetKind,
        targetKey: target.targetKey,
        cadence: 'immediate',
      }),
    ).resolves.toMatchObject({
      created: true,
      follow: target,
    })
  }

  await expect(
    google.mutation(api.follows.enrollment.createGoogleFollow, {
      targetKind: 'place',
      targetKey: targets.unavailableParish,
      cadence: 'immediate',
    }),
  ).rejects.toThrow('target is unavailable')
})

test('follow mutations enforce owner scope and reject unsupported targets', async () => {
  const t = convexTest(schema, modules)
  const aliceId = await createGoogleUser(t, 'google-alice', 'alice@example.com')
  const bobId = await createGoogleUser(t, 'google-bob', 'bob@example.com')
  const alice = t.withIdentity({ subject: aliceId })
  const bob = t.withIdentity({ subject: bobId })
  const created = await alice.mutation(
    api.follows.enrollment.createGoogleFollow,
    {
      targetKind: 'topic',
      targetKey: 'housing',
      cadence: 'immediate',
    },
  )

  await expect(
    bob.mutation(api.follows.enrollment.updateGoogleFollow, {
      followId: created.follow.id as Id<'follows'>,
      cadence: 'muted',
    }),
  ).rejects.toThrow('follow is unavailable')
  await expect(
    bob.mutation(api.follows.enrollment.removeGoogleFollow, {
      followId: created.follow.id as Id<'follows'>,
    }),
  ).rejects.toThrow('follow is unavailable')
  await expect(
    alice.mutation(api.follows.enrollment.createGoogleFollow, {
      targetKind: 'topic',
      targetKey: 'secret-topic',
      cadence: 'weekly',
    }),
  ).rejects.toThrow('target is unavailable')
})

test('muting a follow preserves the cadence used when it resumes', async () => {
  const t = convexTest(schema, modules)
  const userId = await createGoogleUser(
    t,
    'google-cadence',
    'cadence@example.com',
  )
  const google = t.withIdentity({ subject: userId })
  const created = await google.mutation(
    api.follows.enrollment.createGoogleFollow,
    {
      targetKind: 'topic',
      targetKey: 'public-money',
      cadence: 'both',
    },
  )

  await google.mutation(api.follows.enrollment.updateGoogleFollow, {
    followId: created.follow.id as Id<'follows'>,
    cadence: 'muted',
  })
  const [muted] = await google.query(
    api.follows.enrollment.currentGoogleFollows,
    {},
  )
  expect(muted).toMatchObject({ cadence: 'muted', resumeCadence: 'both' })

  await google.mutation(api.follows.enrollment.updateGoogleFollow, {
    followId: created.follow.id as Id<'follows'>,
    cadence: muted.resumeCadence,
  })
  await expect(
    google.query(api.follows.enrollment.currentGoogleFollows, {}),
  ).resolves.toMatchObject([{ cadence: 'both', resumeCadence: 'both' }])
})

test('management tokens isolate one follow, rotate, expire, and remove', async () => {
  const t = convexTest(schema, modules)
  const subscriberId = await createSubscriber(t, 'address-c')
  await createChallenge(
    t,
    subscriberId,
    'first',
    'code-hash',
    undefined,
    'housing',
  )
  await createChallenge(
    t,
    subscriberId,
    'second',
    'code-hash',
    undefined,
    'drainage',
  )
  await consume(
    t,
    'first',
    'code-hash',
    'management-first',
    'unsubscribe-first',
  )
  await consume(
    t,
    'second',
    'code-hash',
    'management-second',
    'unsubscribe-second',
  )

  await expect(
    t.query(internal.follows.management.readManagement, {
      tokenHash: 'management-first',
      now: Date.now(),
    }),
  ).resolves.toMatchObject({
    status: 'valid',
    follows: [{ targetKey: 'housing' }],
  })
  await expect(
    t.query(internal.follows.management.readManagement, {
      tokenHash: 'management-second',
      now: Date.now(),
    }),
  ).resolves.toMatchObject({
    status: 'valid',
    follows: [{ targetKey: 'drainage' }],
  })

  await t.mutation(internal.follows.management.rotateManagementTokenWithHash, {
    tokenHash: 'management-second',
    replacementHash: 'management-rotated',
  })
  await expect(
    t.query(internal.follows.management.readManagement, {
      tokenHash: 'management-second',
      now: Date.now(),
    }),
  ).resolves.toEqual({ status: 'unavailable' })
  await expect(
    t.query(internal.follows.management.readManagement, {
      tokenHash: 'management-rotated',
      now: Date.now(),
    }),
  ).resolves.toMatchObject({ status: 'valid' })

  await t.run(async (ctx) => {
    const rotated = await ctx.db
      .query('emailAccessTokens')
      .withIndex('by_token_hash', (index) =>
        index.eq('tokenHash', 'management-rotated'),
      )
      .unique()
    expect(rotated).not.toBeNull()
    await ctx.db.patch('emailAccessTokens', rotated!._id, { expiresAt: 0 })
  })
  await expect(
    t.query(internal.follows.management.readManagement, {
      tokenHash: 'management-rotated',
      now: Date.now(),
    }),
  ).resolves.toEqual({ status: 'expired' })

  await t.mutation(internal.follows.management.removeEmailFollowWithToken, {
    tokenHash: 'management-first',
  })
  await expect(
    t.query(internal.follows.management.readManagement, {
      tokenHash: 'management-first',
      now: Date.now(),
    }),
  ).resolves.toEqual({ status: 'unavailable' })
  await expect(
    t.query(internal.follows.management.readManagement, {
      tokenHash: 'management-second',
      now: Date.now(),
    }),
  ).resolves.toEqual({ status: 'unavailable' })
})

test('repeated verification still revokes the newest management token', async () => {
  const t = convexTest(schema, modules)
  const subscriberId = await createSubscriber(t, 'address-many-tokens')

  for (let index = 0; index < 12; index += 1) {
    const challengeId = `repeat-${index}`
    await createChallenge(t, subscriberId, challengeId, 'code-hash')
    await consume(
      t,
      challengeId,
      'code-hash',
      `management-repeat-${index}`,
      `unsubscribe-repeat-${index}`,
    )
  }

  await expect(
    t.query(internal.follows.management.readManagement, {
      tokenHash: 'management-repeat-10',
      now: Date.now(),
    }),
  ).resolves.toEqual({ status: 'unavailable' })
  await expect(
    t.query(internal.follows.management.readManagement, {
      tokenHash: 'management-repeat-11',
      now: Date.now(),
    }),
  ).resolves.toMatchObject({ status: 'valid' })
})

test('subscriber management tokens list and manage every follow for one address', async () => {
  const t = convexTest(schema, modules)
  const subscriberId = await createSubscriber(t, 'subscriber-wide')
  await createChallenge(t, subscriberId, 'wide-one', 'code-hash', undefined, 'housing')
  await consume(t, 'wide-one', 'code-hash')
  await createChallenge(t, subscriberId, 'wide-two', 'code-hash', undefined, 'drainage')
  await consume(t, 'wide-two', 'code-hash')
  const [housingFollow, drainageFollow] = await t.run(async (ctx) => {
    await ctx.db.insert('emailAccessTokens', {
      subscriberId,
      kind: 'management',
      tokenHash: 'subscriber-wide-token',
      expiresAt: Date.now() + 60_000,
      createdAt: Date.now(),
    })
    return await ctx.db
      .query('follows')
      .withIndex('by_email_subscriber_id_and_created_at', (index) =>
        index.eq('emailSubscriberId', subscriberId),
      )
      .take(10)
  })
  await expect(
    t.query(internal.follows.management.readManagement, {
      tokenHash: 'subscriber-wide-token',
      now: Date.now(),
    }),
  ).resolves.toMatchObject({
    status: 'valid',
    follows: expect.arrayContaining([
      expect.objectContaining({ targetKey: 'housing' }),
      expect.objectContaining({ targetKey: 'drainage' }),
    ]),
  })
  await t.mutation(internal.follows.management.updateEmailFollowWithToken, {
    tokenHash: 'subscriber-wide-token',
    followId: housingFollow._id,
    cadence: 'weekly',
  })
  await t.mutation(internal.follows.management.removeEmailFollowWithToken, {
    tokenHash: 'subscriber-wide-token',
    followId: drainageFollow._id,
  })
  await expect(
    t.query(internal.follows.management.readManagement, {
      tokenHash: 'subscriber-wide-token',
      now: Date.now(),
    }),
  ).resolves.toMatchObject({
    status: 'valid',
    follows: [{ targetKey: 'housing', cadence: 'weekly' }],
  })
})

test('unsubscribe stops all email follows and a new verification re-enables only its target', async () => {
  const t = convexTest(schema, modules)
  const subscriberId = await createSubscriber(t, 'address-d')
  await createChallenge(
    t,
    subscriberId,
    'one',
    'code-hash',
    undefined,
    'housing',
  )
  await consume(t, 'one', 'code-hash', 'management-one', 'unsubscribe-one')
  await createChallenge(
    t,
    subscriberId,
    'two',
    'code-hash',
    undefined,
    'drainage',
  )
  await consume(t, 'two', 'code-hash', 'management-two', 'unsubscribe-two')

  await expect(
    t.mutation(internal.follows.management.unsubscribeEmailWithToken, {
      tokenHash: 'unsubscribe-two',
    }),
  ).resolves.toEqual({ unsubscribed: true })
  await expect(
    t.mutation(internal.follows.management.unsubscribeEmailWithToken, {
      tokenHash: 'unsubscribe-two',
    }),
  ).resolves.toEqual({ unsubscribed: true })
  await assertSubscriberState(t, subscriberId, 'unsubscribed', [
    ['drainage', 'muted'],
    ['housing', 'muted'],
  ])

  await createChallenge(
    t,
    subscriberId,
    'resubscribe',
    'code-hash',
    undefined,
    'housing',
  )
  await expect(
    consume(
      t,
      'resubscribe',
      'code-hash',
      'management-resubscribed',
      'unsubscribe-resubscribed',
    ),
  ).resolves.toMatchObject({ status: 'verified', created: false })
  await assertSubscriberState(t, subscriberId, 'verified', [
    ['drainage', 'muted'],
    ['housing', 'immediate'],
  ])
})

test('application tables keep only encrypted addresses and hashed codes', async () => {
  const t = convexTest(schema, modules)
  const subscriberId = await createSubscriber(t, 'hash-only')
  await createChallenge(t, subscriberId, 'private-data', 'code-hash')
  await t.run(async (ctx) => {
    const subscriber = await ctx.db.get('emailSubscribers', subscriberId)
    const challenges = await ctx.db
      .query('emailVerificationChallenges')
      .take(10)
    const stored = JSON.stringify({ subscriber, challenges })
    expect(stored).not.toContain('resident@example.com')
    expect(stored).not.toContain('123456')
    expect(stored).toContain('encrypted-address')
    expect(stored).toContain('code-hash')
  })
})

test('expired challenges are swept in bounded batches', async () => {
  const t = convexTest(schema, modules)
  const subscriberId = await createSubscriber(t, 'address-e')
  await createChallenge(t, subscriberId, 'expired-cleanup', 'code-hash', 0)
  await createChallenge(
    t,
    subscriberId,
    'active-cleanup',
    'code-hash',
    Date.now() + 60_000,
  )
  await expect(
    t.mutation(internal.follows.retention.removeExpiredChallenges, {}),
  ).resolves.toEqual({ deleted: 1, continued: false })
})

test('forged AgentMail webhooks fail signature verification', () => {
  expect(() =>
    verifyAgentMailWebhook(
      'whsec_ZmFrZS1zZWNyZXQ=',
      '{"event_type":"message.received"}',
      {
        'svix-id': 'msg_fake',
        'svix-timestamp': String(Math.floor(Date.now() / 1000)),
        'svix-signature': 'v1,fake',
      },
    ),
  ).toThrow()
})

async function createSubscriber(
  t: TestConvex,
  addressHash: string,
): Promise<Id<'emailSubscribers'>> {
  return await t.run(async (ctx) => {
    const now = Date.now()
    return await ctx.db.insert('emailSubscribers', {
      addressHash,
      encryptedAddress: 'v1.encrypted-address.ciphertext',
      encryptionVersion: 1,
      state: 'pending',
      createdAt: now,
      updatedAt: now,
    })
  })
}

async function createChallenge(
  t: TestConvex,
  subscriberId: Id<'emailSubscribers'>,
  challengeId: string,
  codeHash: string,
  expiresAt = Date.now() + 60_000,
  targetKey = 'public-money',
): Promise<Id<'emailVerificationChallenges'>> {
  return await t.run(async (ctx) => {
    return await ctx.db.insert('emailVerificationChallenges', {
      subscriberId,
      challengeId,
      codeHash,
      purpose: 'create_follow',
      targetKind: 'topic',
      targetKey,
      cadence: 'immediate',
      expiresAt,
      attempts: 0,
      createdAt: Date.now(),
    })
  })
}

async function consume(
  t: TestConvex,
  challengeId: string,
  codeHash: string,
  managementTokenHash = `management-${challengeId}`,
  unsubscribeTokenHash = `unsubscribe-${challengeId}`,
) {
  return await t.mutation(
    internal.follows.enrollment.consumeEmailFollowChallenge,
    {
      challengeId,
      codeHash,
      managementTokenHash,
      unsubscribeTokenHash,
    },
  )
}

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

async function assertSubscriberState(
  t: TestConvex,
  subscriberId: Id<'emailSubscribers'>,
  state: 'verified' | 'unsubscribed',
  expected: Array<[string, string]>,
): Promise<void> {
  await t.run(async (ctx) => {
    expect(await ctx.db.get('emailSubscribers', subscriberId)).toMatchObject({
      state,
    })
    const follows = await ctx.db
      .query('follows')
      .withIndex('by_email_subscriber_id_and_created_at', (index) =>
        index.eq('emailSubscriberId', subscriberId),
      )
      .take(10)
    const preferences = await Promise.all(
      follows.map(async (follow) => {
        const preference = await ctx.db
          .query('notificationPreferences')
          .withIndex('by_follow_id', (index) =>
            index.eq('followId', follow._id),
          )
          .unique()
        return [follow.targetKey, preference?.cadence]
      }),
    )
    expect(preferences.sort()).toEqual(expected.sort())
  })
}
