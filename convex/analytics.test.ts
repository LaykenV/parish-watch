/// <reference types="vite/client" />

import rateLimiterTest from '@convex-dev/rate-limiter/test'
import { convexTest } from 'convex-test'
import { expect, test } from 'vitest'

import { internal } from './_generated/api'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')
const VISITOR_HASH = 'a'.repeat(64)

function createTest() {
  const t = convexTest(schema, modules)
  rateLimiterTest.register(t)
  return t
}

test('deduplicates repeat app loads inside one visit window', async () => {
  const t = createTest()

  await expect(
    t.mutation(internal.analytics.events.recordVisit, {
      visitorKeyHash: VISITOR_HASH,
      eventKey: 'visit-event-0001',
    }),
  ).resolves.toEqual({ recorded: true })
  await expect(
    t.mutation(internal.analytics.events.recordVisit, {
      visitorKeyHash: VISITOR_HASH,
      eventKey: 'visit-event-0002',
    }),
  ).resolves.toEqual({ recorded: false })

  await expect(
    t.query(internal.analytics.report.summary, {}),
  ).resolves.toMatchObject({
    uniqueVisitors: 1,
    visits: 1,
    activatedVisitors: 0,
    activationRatePercent: 0,
  })
  await t.run(async (ctx) => {
    const events = await ctx.db.query('analyticsEvents').take(10)
    expect(events.map((event) => event.kind)).toEqual(['app_visit'])
  })
})

test('counts one activated visitor while preserving real area changes', async () => {
  const t = createTest()

  await t.mutation(internal.analytics.events.recordAreaSelection, {
    visitorKeyHash: VISITOR_HASH,
    eventKey: 'area-event-00001',
    areaSlug: 'lafayette-parish',
  })
  await t.mutation(internal.analytics.events.recordAreaSelection, {
    visitorKeyHash: VISITOR_HASH,
    eventKey: 'area-event-00002',
    areaSlug: 'lafayette-parish',
  })
  await t.mutation(internal.analytics.events.recordAreaSelection, {
    visitorKeyHash: VISITOR_HASH,
    eventKey: 'area-event-00003',
    areaSlug: 'east-baton-rouge-parish',
  })

  await expect(
    t.query(internal.analytics.report.summary, {}),
  ).resolves.toMatchObject({
    uniqueVisitors: 1,
    visits: 1,
    activatedVisitors: 1,
    activationRatePercent: 100,
    areaSelections: 2,
    firstSelectionsByArea: {
      lafayetteParish: 1,
      eastBatonRougeParish: 0,
      rapidesParish: 0,
    },
    selectionsByArea: {
      lafayetteParish: 1,
      eastBatonRougeParish: 1,
      rapidesParish: 0,
    },
  })
  await t.run(async (ctx) => {
    const subject = await ctx.db
      .query('analyticsSubjects')
      .withIndex('by_visitor_key_hash', (q) =>
        q.eq('visitorKeyHash', VISITOR_HASH),
      )
      .unique()
    expect(subject).toMatchObject({
      visitCount: 1,
      areaSelectionCount: 2,
      firstAreaSlug: 'lafayette-parish',
      lastAreaSlug: 'east-baton-rouge-parish',
    })
  })
})

test('counts a returning visitor only after a later visit', async () => {
  const t = createTest()

  await t.mutation(internal.analytics.events.recordVisit, {
    visitorKeyHash: VISITOR_HASH,
    eventKey: 'visit-event-0001',
  })
  await t.run(async (ctx) => {
    const subject = await ctx.db
      .query('analyticsSubjects')
      .withIndex('by_visitor_key_hash', (q) =>
        q.eq('visitorKeyHash', VISITOR_HASH),
      )
      .unique()
    expect(subject).not.toBeNull()
    await ctx.db.patch('analyticsSubjects', subject!._id, {
      firstSeenAt: Date.now() - 25 * 60 * 60 * 1000,
      lastVisitStartedAt: Date.now() - 31 * 60 * 1000,
    })
  })
  await t.mutation(internal.analytics.events.recordVisit, {
    visitorKeyHash: VISITOR_HASH,
    eventKey: 'visit-event-0002',
  })

  await expect(
    t.query(internal.analytics.report.summary, {}),
  ).resolves.toMatchObject({
    uniqueVisitors: 1,
    visits: 2,
    returningVisitors: 1,
  })
})

test('rejects identifiers that could carry arbitrary resident content', async () => {
  const t = createTest()

  await expect(
    t.mutation(internal.analytics.events.recordVisit, {
      visitorKeyHash: 'resident@example.com',
      eventKey: 'visit-event-0001',
    }),
  ).rejects.toThrow('opaque hashes')
  await expect(
    t.mutation(internal.analytics.events.recordVisit, {
      visitorKeyHash: VISITOR_HASH,
      eventKey: 'question text is private',
    }),
  ).rejects.toThrow('opaque values')
})

test('removes expired identifiers and events but retains aggregate evidence', async () => {
  const t = createTest()

  await t.mutation(internal.analytics.events.recordVisit, {
    visitorKeyHash: VISITOR_HASH,
    eventKey: 'visit-event-0001',
  })
  await t.run(async (ctx) => {
    const subjects = await ctx.db.query('analyticsSubjects').take(10)
    const events = await ctx.db.query('analyticsEvents').take(10)
    for (const subject of subjects) {
      await ctx.db.patch('analyticsSubjects', subject._id, { expiresAt: 0 })
    }
    for (const event of events) {
      await ctx.db.patch('analyticsEvents', event._id, { expiresAt: 0 })
    }
  })

  await expect(
    t.mutation(internal.analytics.retention.removeExpiredTelemetry, {}),
  ).resolves.toMatchObject({
    deletedEvents: 1,
    deletedSubjects: 1,
    continued: false,
  })
  await t.run(async (ctx) => {
    expect(await ctx.db.query('analyticsSubjects').take(10)).toHaveLength(0)
    expect(await ctx.db.query('analyticsEvents').take(10)).toHaveLength(0)
  })
  await expect(
    t.query(internal.analytics.report.summary, {}),
  ).resolves.toMatchObject({ uniqueVisitors: 1, visits: 1 })
})

test('accepts only served origins and rate limits one browser', async () => {
  const t = createTest()
  const payload = {
    kind: 'app_visit',
    visitorKeyHash: VISITOR_HASH,
    eventKey: 'visit-event-000001',
  }

  const rejected = await t.fetch('/api/analytics', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://example.com',
    },
    body: JSON.stringify(payload),
  })
  expect(rejected.status).toBe(403)

  const privatePayload = await t.fetch('/api/analytics', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://www.publicparish.com',
    },
    body: JSON.stringify({ ...payload, question: 'private resident text' }),
  })
  expect(privatePayload.status).toBe(400)

  for (let index = 1; index <= 12; index += 1) {
    const accepted = await t.fetch('/api/analytics', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'https://www.publicparish.com',
      },
      body: JSON.stringify({
        ...payload,
        eventKey: `visit-event-${String(index).padStart(6, '0')}`,
      }),
    })
    expect(accepted.status).toBe(204)
  }

  const limited = await t.fetch('/api/analytics', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://www.publicparish.com',
    },
    body: JSON.stringify({ ...payload, eventKey: 'visit-event-000013' }),
  })
  expect(limited.status).toBe(429)
})
