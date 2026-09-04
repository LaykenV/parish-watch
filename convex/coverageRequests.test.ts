/// <reference types="vite/client" />
import rateLimiterTest from '@convex-dev/rate-limiter/test'
import { convexTest } from 'convex-test'
import { afterEach, expect, test, vi } from 'vitest'
import { api, internal } from './_generated/api'
import schema from './schema'
import { hashVerificationCode } from './follows/secrets'

const modules = import.meta.glob('./**/*.ts')
afterEach(() => vi.unstubAllEnvs())
test('demand deduplicates by device and typed place without starting source work', async () => {
  const t = convexTest(schema, modules)
  rateLimiterTest.register(t)
  const args = { requesterToken: 'a'.repeat(64), placeName: '  Lafayette Parish  ', placeKind: 'parish' as const, homepage: 'https://example.test/untrusted' }
  const first = await t.mutation(api.coverage.requests.record, args)
  const second = await t.mutation(api.coverage.requests.record, { ...args, placeName: 'lafayette parish' })
  expect(first).toEqual(second)
  await t.run(async ctx => {
    expect(await ctx.db.query('coverageRequests').collect()).toHaveLength(1)
    expect((await ctx.db.query('coverageDemandCounts').first())?.count).toBe(1)
    expect(await ctx.db.query('coverageCompilerRuns').collect()).toEqual([])
    expect(await ctx.db.query('sourceMonitoringRuns').collect()).toEqual([])
    expect(await ctx.db.query('emailSubscribers').collect()).toEqual([])
  })
  const municipality = await t.mutation(api.coverage.requests.record, { ...args, placeKind: 'municipality' })
  expect(municipality.requestId).not.toBe(first.requestId)
})
test('coverage verification is purpose-bound and creates no account or follow', async () => {
  vi.stubEnv('EMAIL_ADDRESS_HMAC_KEY', btoa('test-key-for-coverage-verification'))
  const t = convexTest(schema, modules)
  rateLimiterTest.register(t)
  const requesterToken = 'b'.repeat(64)
  const request = await t.mutation(api.coverage.requests.record, { requesterToken, placeName: 'Unknown place', placeKind: 'unknown' })
  const challengeId = 'coverage-test-challenge'
  await t.run(async ctx => {
    const subscriberId = await ctx.db.insert('emailSubscribers', { addressHash: 'private-address', encryptedAddress: 'encrypted', encryptionVersion: 1, state: 'pending', createdAt: 1, updatedAt: 1 })
    await ctx.db.insert('coverageNoticeChallenges', { requestId: request.requestId, subscriberId, challengeId, codeHash: await hashVerificationCode(`coverage:${challengeId}`, '123456'), expiresAt: Date.now() + 60_000, attempts: 0, createdAt: Date.now() })
  })
  expect(await t.mutation(api.coverage.requests.verifyNotice, { challengeId, code: '000000', requesterToken })).toEqual({ verified: false })
  expect(await t.mutation(api.coverage.requests.verifyNotice, { challengeId, code: '123456', requesterToken: 'c'.repeat(64) })).toEqual({ verified: false })
  expect(await t.mutation(api.coverage.requests.verifyNotice, { challengeId, code: '123456', requesterToken })).toEqual({ verified: true })
  expect(await t.mutation(api.coverage.requests.verifyNotice, { challengeId, code: '123456', requesterToken })).toEqual({ verified: true })
  await t.run(async ctx => {
    expect(await ctx.db.query('coverageNoticeSubscriptions').collect()).toHaveLength(1)
    expect(await ctx.db.query('users').collect()).toEqual([])
    expect(await ctx.db.query('follows').collect()).toEqual([])
    const subscription = await ctx.db.query('coverageNoticeSubscriptions').first()
    if (subscription) await ctx.runMutation(internal.coverage.requests.deliver, { subscriptionId: subscription._id })
    expect((await ctx.db.query('coverageNoticeSubscriptions').first())?.state).toBe('waiting')
  })
})

test('rejected verification rolls back challenge consumption and verification state', async () => {
  vi.stubEnv('EMAIL_ADDRESS_HMAC_KEY', btoa('test-key-for-coverage-verification'))
  const t = convexTest(schema, modules)
  rateLimiterTest.register(t)
  const requesterToken = 'd'.repeat(64)
  const request = await t.mutation(api.coverage.requests.record, { requesterToken, placeName: 'New place', placeKind: 'unknown' })
  const challengeId = 'capacity-challenge'
  const ids = await t.run(async ctx => {
    const subscriberId = await ctx.db.insert('emailSubscribers', { addressHash: 'capacity-address', encryptedAddress: 'encrypted', encryptionVersion: 1, state: 'pending', createdAt: 1, updatedAt: 1 })
    for (let i = 0; i < 100; i++) await ctx.db.insert('coverageNoticeSubscriptions', { subscriberId, placeKey: `unknown:place-${i}`, placeName: `Place ${i}`, state: 'waiting', createdAt: 1, updatedAt: 1 })
    const challenge = await ctx.db.insert('coverageNoticeChallenges', { requestId: request.requestId, subscriberId, challengeId, codeHash: await hashVerificationCode(`coverage:${challengeId}`, '123456'), expiresAt: Date.now() + 60_000, attempts: 0, createdAt: Date.now() })
    return { subscriberId, challenge }
  })
  for (let i = 0; i < 2; i++) await expect(t.mutation(api.coverage.requests.verifyNotice, { challengeId, code: '123456', requesterToken })).rejects.toThrow('coverage-notice limit')
  await t.run(async ctx => {
    expect((await ctx.db.get(ids.challenge))?.consumedAt).toBeUndefined()
    expect((await ctx.db.get(ids.subscriberId))?.state).toBe('pending')
    expect(await ctx.db.query('coverageNoticeSubscriptions').collect()).toHaveLength(100)
  })
})
