/// <reference types="vite/client" />

import agentTest from '@convex-dev/agent/test'
import agentmailTest from '@agentmail/convex/test'
import type { OutboundId } from '@agentmail/convex'
import { convexTest } from 'convex-test'
import type { TestConvexForDataModelAndIdentity } from 'convex-test'
import { afterEach, expect, test, vi } from 'vitest'

import { components, internal } from './_generated/api'
import type { DataModel, Id } from './_generated/dataModel'
import type { AskAnswerResult } from './ask/contracts'
import { formatEmailReply } from './emailReplies/answer'
import {
  extractQuestion,
  MAX_EMAIL_QUESTION_LENGTH,
  parseAddress,
  parseInboundEmail,
} from './emailReplies/contracts'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')
type TestConvex = TestConvexForDataModelAndIdentity<DataModel>

function initTest(): TestConvex {
  vi.stubEnv('AGENTMAIL_API_KEY', 'agentmail-test-key')
  vi.stubEnv('AGENTMAIL_UPDATES_INBOX_ID', 'updates-test')
  vi.stubEnv('EMAIL_ADDRESS_HMAC_KEY', 'dGVzdC1obWFjLWtleQ==')
  vi.stubEnv(
    'EMAIL_ENCRYPTION_KEY',
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
  )
  const t = convexTest(schema, modules)
  agentTest.register(t)
  agentmailTest.register(t as never)
  return t
}

afterEach(() => vi.unstubAllEnvs())

test('inbound email parsing keeps only the new bounded question', () => {
  expect(parseAddress('Resident <Resident@Example.com>')).toBe(
    'resident@example.com',
  )
  expect(parseAddress('not-an-address')).toBeNull()
  expect(
    extractQuestion(
      'What changed?\n\nOn Tue, Sep 2, 2026 wrote:\n> Old alert text',
    ),
  ).toBe('What changed?')
  expect(extractQuestion('x'.repeat(MAX_EMAIL_QUESTION_LENGTH + 1))).toBeNull()
  expect(
    parseInboundEmail({
      inbox_id: 'updates-test',
      thread_id: 'thread-1',
      message_id: 'message-1',
      from: 'Resident <resident@example.com>',
      extracted_text: 'When will the council vote?',
    }),
  ).toEqual({
    inboxId: 'updates-test',
    threadId: 'thread-1',
    messageId: 'message-1',
    from: 'resident@example.com',
    question: 'When will the council vote?',
  })
})

test('reply intake rejects unknown senders and threads and deduplicates provider events', async () => {
  const t = initTest()
  const seeded = await seedReplyDelivery(t)
  await receive(
    t,
    'unknown-thread-event',
    'missing-thread',
    'resident@example.com',
  )
  await receive(
    t,
    'wrong-inbox-event',
    seeded.threadId,
    'resident@example.com',
    'other-inbox',
  )
  await receive(
    t,
    'unknown-sender-event',
    seeded.threadId,
    'stranger@example.com',
  )
  await receive(
    t,
    'accepted-event-0001',
    seeded.threadId,
    'resident@example.com',
  )
  const acceptedEventId = await t.run(async (ctx) => {
    const event = await ctx.db
      .query('emailReplyEvents')
      .withIndex('by_provider_event_id', (q) =>
        q.eq('providerEventId', 'accepted-event-0001'),
      )
      .unique()
    return event!._id
  })
  await t.action(internal.emailReplies.answer.prepareInbound, {
    eventId: acceptedEventId,
  })
  await receive(
    t,
    'accepted-event-0001',
    seeded.threadId,
    'resident@example.com',
  )

  await t.run(async (ctx) => {
    const events = await ctx.db.query('emailReplyEvents').take(10)
    expect(events).toHaveLength(4)
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          providerEventId: 'unknown-thread-event',
          state: 'ignored',
          errorClass: 'unknown_thread',
        }),
        expect.objectContaining({
          providerEventId: 'unknown-sender-event',
          state: 'ignored',
          errorClass: 'unknown_sender',
        }),
        expect.objectContaining({
          providerEventId: 'wrong-inbox-event',
          state: 'ignored',
          errorClass: 'wrong_inbox',
        }),
        expect.objectContaining({
          providerEventId: 'accepted-event-0001',
          state: 'queued',
          attempt: 0,
        }),
      ]),
    )
    expect(await ctx.db.query('emailReplyThreads').take(10)).toHaveLength(1)
    expect(await ctx.db.query('askQuestionReceipts').take(10)).toHaveLength(1)
  })
})

test('answer delivery queues one reply even when completion is replayed', async () => {
  const t = initTest()
  const eventId = await seedRunningEvent(t, 1)
  await t.mutation(internal.emailReplies.delivery.completeAnswer, {
    eventId,
    attempt: 1,
    answerMessageId: 'answer-message-1',
    kind: 'answer',
    text: 'The vote is scheduled.\n\nCited evidence\n- Minutes: /source/1',
  })
  const first = await t.run(async (ctx) => ctx.db.get(eventId))
  await t.mutation(internal.emailReplies.delivery.completeAnswer, {
    eventId,
    attempt: 1,
    answerMessageId: 'answer-message-2',
    kind: 'answer',
    text: 'A duplicate response that must not be queued.',
  })
  const replay = await t.run(async (ctx) => ctx.db.get(eventId))
  expect(replay).toMatchObject({
    state: 'answered',
    outboundId: first?.outboundId,
    answerMessageId: 'answer-message-1',
  })
  expect(first?.outboundId).toBeDefined()
  await expect(
    t.query(components.agentmail.lib.getOutboundStatus, {
      outboundId: first!.outboundId! as OutboundId,
    }),
  ).resolves.toMatchObject({ status: 'pending' })
})

test('answer attempts fence an active lease and stop after the bounded retry', async () => {
  const t = initTest()
  const eventId = await seedRunningEvent(t, 0, 'queued')
  const first = await t.mutation(internal.emailReplies.intake.claimAnswer, {
    eventId,
  })
  expect(first).toMatchObject({ kind: 'claimed', attempt: 1 })
  await expect(
    t.mutation(internal.emailReplies.intake.claimAnswer, { eventId }),
  ).resolves.toEqual({ kind: 'skip' })
  await t.mutation(internal.emailReplies.intake.failAnswer, {
    eventId,
    attempt: 1,
    errorClass: 'provider_unavailable',
  })
  await t.run(async (ctx) => {
    await ctx.db.patch(eventId, { retryAt: 0 })
  })
  const second = await t.mutation(internal.emailReplies.intake.claimAnswer, {
    eventId,
  })
  expect(second).toMatchObject({ kind: 'claimed', attempt: 2 })
  await t.mutation(internal.emailReplies.intake.failAnswer, {
    eventId,
    attempt: 2,
    errorClass: 'provider_unavailable',
  })
  await expect(
    t.mutation(internal.emailReplies.intake.claimAnswer, { eventId }),
  ).resolves.toEqual({ kind: 'skip' })
  await t.run(async (ctx) => {
    expect(await ctx.db.get(eventId)).toMatchObject({
      state: 'failed',
      attempt: 2,
      errorClass: 'provider_unavailable',
    })
  })
})

test('stale preparation and final answer leases can be reclaimed', async () => {
  const t = initTest()
  const waitingEventId = await seedStalePreparation(t)
  await expect(
    t.mutation(internal.emailReplies.intake.getPreparation, {
      eventId: waitingEventId,
    }),
  ).resolves.toMatchObject({
    kind: 'ready',
    ownsPreparation: true,
  })

  const staleAnswerId = await seedRunningEvent(t, 2)
  await t.run(async (ctx) => {
    await ctx.db.patch(staleAnswerId, { startedAt: 0, updatedAt: 0 })
  })
  await expect(
    t.mutation(internal.emailReplies.intake.claimAnswer, {
      eventId: staleAnswerId,
    }),
  ).resolves.toMatchObject({ kind: 'claimed', attempt: 2 })
})

test('email responses preserve grounded citations and the not-found contact path', () => {
  const grounded = answerResult('answer')
  expect(
    formatEmailReply(
      grounded,
      undefined,
      'https://public-parish-test.convex.site',
    ),
  ).toContain(
    '- Council minutes: https://public-parish-test.convex.site/decisions/drainage?evidence=evidence-1',
  )
  const missing = answerResult('not_found')
  const reply = formatEmailReply(missing, 'https://lafayettela.gov/council')
  expect(reply).toContain(
    'Official government site: https://lafayettela.gov/council',
  )
  expect(reply).not.toContain('Cited evidence')
})

async function seedReplyDelivery(t: TestConvex) {
  return await t.run(async (ctx) => {
    const jurisdictionId = await ctx.db.insert('jurisdictions', {
      name: 'Lafayette Parish',
      slug: 'lafayette-parish',
      type: 'parish',
      state: 'LA',
      publicStatus: 'supported',
    })
    const userId = await ctx.db.insert('users', {
      googleAccountId: 'google-reply-test',
      email: 'resident@example.com',
      emailVerified: true,
      createdAt: 1,
      updatedAt: 1,
      lastSignedInAt: 1,
    })
    const ownerKey = `google:${userId}`
    const followId = await ctx.db.insert('follows', {
      ownerKind: 'google',
      ownerKey,
      userId,
      targetKind: 'place',
      targetKey: 'lafayette-parish',
      targetTitle: 'Lafayette Parish',
      targetDetail: 'Parish',
      createdAt: 1,
      updatedAt: 1,
    })
    const threadId = 'agentmail-thread-accepted'
    await ctx.db.insert('notificationDeliveries', {
      ownerKind: 'google',
      ownerKey,
      kind: 'weekly',
      representativeFollowId: followId,
      state: 'delivered',
      outboundId: 'outbound-alert',
      agentmailMessageId: 'agentmail-alert-message',
      agentmailThreadId: threadId,
      enqueueAttempts: 1,
      reconcileAttempts: 1,
      createdAt: 1,
      updatedAt: 1,
    })
    return { jurisdictionId, threadId }
  })
}

async function receive(
  t: TestConvex,
  eventId: string,
  threadId: string,
  from: string,
  inboxId = 'updates-test',
) {
  return await t.mutation(internal.emailReplies.intake.onMessageReceived, {
    eventId,
    thread: {},
    message: {
      inbox_id: inboxId,
      thread_id: threadId,
      message_id: `message-${eventId}`,
      from,
      extracted_text: 'What changed in this update?',
    },
  })
}

async function seedRunningEvent(
  t: TestConvex,
  attempt: number,
  state: 'queued' | 'running' = 'running',
): Promise<Id<'emailReplyEvents'>> {
  return await t.run(async (ctx) => {
    const deliveryId = await ctx.db.insert('notificationDeliveries', {
      ownerKind: 'google',
      ownerKey: 'google:test',
      kind: 'weekly',
      state: 'delivered',
      enqueueAttempts: 1,
      reconcileAttempts: 1,
      createdAt: 1,
      updatedAt: 1,
    })
    const replyThreadId = await ctx.db.insert('emailReplyThreads', {
      agentmailThreadId: `running-thread-${attempt}`,
      notificationDeliveryId: deliveryId,
      askThreadId: `ask-thread-${attempt}`,
      askExpiresAt: Date.now() + 60_000,
      scopeKind: 'corpus',
      scopeKey: '*',
      ownerKind: 'google',
      ownerKey: 'google:test',
      createdAt: 1,
      updatedAt: 1,
    })
    return await ctx.db.insert('emailReplyEvents', {
      providerEventId: `running-event-${attempt}`,
      agentmailThreadId: `running-thread-${attempt}`,
      inboundMessageId: `inbound-message-${attempt}`,
      replyThreadId,
      questionMessageId: `question-message-${attempt}`,
      state,
      preparationAttempts: 0,
      attempt,
      startedAt: state === 'running' ? Date.now() : undefined,
      createdAt: 1,
      updatedAt: 1,
    })
  })
}

async function seedStalePreparation(
  t: TestConvex,
): Promise<Id<'emailReplyEvents'>> {
  return await t.run(async (ctx) => {
    const deliveryId = await ctx.db.insert('notificationDeliveries', {
      ownerKind: 'google',
      ownerKey: 'google:stale-preparation',
      kind: 'weekly',
      state: 'delivered',
      enqueueAttempts: 1,
      reconcileAttempts: 1,
      createdAt: 1,
      updatedAt: 1,
    })
    const replyThreadId = await ctx.db.insert('emailReplyThreads', {
      agentmailThreadId: 'stale-preparation-thread',
      notificationDeliveryId: deliveryId,
      scopeKind: 'corpus',
      scopeKey: '*',
      ownerKind: 'google',
      ownerKey: 'google:stale-preparation',
      createdAt: 1,
      updatedAt: 1,
    })
    const formerOwnerId = await ctx.db.insert('emailReplyEvents', {
      providerEventId: 'former-preparation-owner',
      agentmailThreadId: 'stale-preparation-thread',
      inboundMessageId: 'former-message',
      replyThreadId,
      encryptedQuestion: 'v1.former.encrypted',
      state: 'queued',
      preparationAttempts: 0,
      attempt: 0,
      createdAt: 1,
      updatedAt: 1,
    })
    await ctx.db.patch(replyThreadId, {
      preparingEventId: formerOwnerId,
      preparingStartedAt: 0,
    })
    return await ctx.db.insert('emailReplyEvents', {
      providerEventId: 'waiting-preparation-event',
      agentmailThreadId: 'stale-preparation-thread',
      inboundMessageId: 'waiting-message',
      replyThreadId,
      encryptedQuestion: 'v1.waiting.encrypted',
      state: 'queued',
      preparationAttempts: 0,
      attempt: 0,
      createdAt: 2,
      updatedAt: 2,
    })
  })
}

function answerResult(kind: 'answer' | 'not_found'): AskAnswerResult {
  return {
    kind,
    answer:
      kind === 'answer'
        ? 'The published minutes say the vote is scheduled.'
        : 'Public Parish could not find enough published evidence to answer that question.',
    citations:
      kind === 'answer'
        ? [
            {
              evidenceId: 'evidence-1',
              recordKey: 'drainage',
              fieldPath: '/meetingAt',
              documentTitle: 'Council minutes',
              bodyName: 'Lafayette City Council',
              sourceKind: 'minutes',
              officialUrl: 'https://lafayettela.gov/minutes.pdf',
              excerpt: 'The vote is scheduled.',
              page: 2,
              section: null,
              retrievedAt: 1,
              sourceHref: '/decisions/drainage?evidence=evidence-1',
            },
          ]
        : [],
    followUps: [],
    messageId: 'answer-message',
    replayed: false,
  }
}
