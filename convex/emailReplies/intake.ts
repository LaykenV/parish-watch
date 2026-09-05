import { v } from 'convex/values'

import { internal } from '../_generated/api'
import type { Doc } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'
import { env, internalMutation } from '../_generated/server'
import { scopeKey, storedScope } from '../ask/contracts'
import type { AskScope } from '../ask/contracts'
import {
  encryptPrivateText,
  hashAddress,
  normalizeEmail,
} from '../follows/secrets'
import { parseInboundEmail } from './contracts'

const RUNNING_LEASE_MS = 10 * 60 * 1000
const MAX_ANSWER_ATTEMPTS = 2
const MAX_PREPARATION_ATTEMPTS = 3
const PREPARATION_RETRY_DELAY_MS = 5_000
const PREPARATION_LEASE_MS = 2 * 60 * 1_000
const RETRY_DELAY_MS = 60_000

export const onMessageReceived = internalMutation({
  args: { message: v.any(), thread: v.optional(v.any()), eventId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const duplicate = await ctx.db
      .query('emailReplyEvents')
      .withIndex('by_provider_event_id', (q) =>
        q.eq('providerEventId', args.eventId),
      )
      .unique()
    if (duplicate) return null

    const now = Date.now()
    const inbound = parseInboundEmail(args.message)
    const eventId = await ctx.db.insert('emailReplyEvents', {
      providerEventId: args.eventId,
      agentmailThreadId: inbound?.threadId ?? '',
      inboundMessageId: inbound?.messageId ?? '',
      state: 'ignored',
      preparationAttempts: 0,
      attempt: 0,
      errorClass: inbound ? undefined : 'invalid_message',
      completedAt: inbound ? undefined : now,
      createdAt: now,
      updatedAt: now,
    })
    if (!inbound) return null

    const configuredInboxId = env.AGENTMAIL_UPDATES_INBOX_ID?.trim()
    if (!configuredInboxId || inbound.inboxId !== configuredInboxId) {
      await ignoreEvent(ctx, eventId, 'wrong_inbox')
      return null
    }
    // AgentMail can group two of our sends into one thread, so take the most
    // recent delivery rather than throwing on a second match.
    const delivery = await ctx.db
      .query('notificationDeliveries')
      .withIndex('by_agentmail_thread_id', (q) =>
        q.eq('agentmailThreadId', inbound.threadId),
      )
      .order('desc')
      .first()
    if (!delivery) {
      await ignoreEvent(ctx, eventId, 'unknown_thread')
      return null
    }
    if (!(await senderOwnsDelivery(ctx, delivery, inbound.from))) {
      await ignoreEvent(ctx, eventId, 'unknown_sender')
      return null
    }

    const context = await replyContext(ctx, delivery)
    if (!context) {
      await ignoreEvent(ctx, eventId, 'evidence_unavailable')
      return null
    }
    let replyThread = await ctx.db
      .query('emailReplyThreads')
      .withIndex('by_agentmail_thread_id', (q) =>
        q.eq('agentmailThreadId', inbound.threadId),
      )
      .unique()
    const needsAskThread =
      !replyThread?.askThreadId ||
      replyThread.askExpiresAt === undefined ||
      replyThread.askExpiresAt <= now
    if (!replyThread) {
      const replyThreadId = await ctx.db.insert('emailReplyThreads', {
        agentmailThreadId: inbound.threadId,
        notificationDeliveryId: delivery._id,
        preparingEventId: eventId,
        preparingStartedAt: now,
        scopeKind: context.scope.kind,
        scopeKey: scopeKey(context.scope),
        officialContactUrl: context.officialContactUrl,
        ownerKind: delivery.ownerKind,
        ownerKey: delivery.ownerKey,
        createdAt: now,
        updatedAt: now,
      })
      replyThread = (await ctx.db.get(replyThreadId))!
    } else if (needsAskThread && !replyThread.preparingEventId) {
      await ctx.db.patch(replyThread._id, {
        preparingEventId: eventId,
        preparingStartedAt: now,
        scopeKind: context.scope.kind,
        scopeKey: scopeKey(context.scope),
        officialContactUrl: context.officialContactUrl,
        updatedAt: now,
      })
      replyThread = (await ctx.db.get(replyThread._id))!
    }
    await ctx.db.patch(eventId, {
      replyThreadId: replyThread._id,
      encryptedQuestion: await encryptPrivateText(inbound.question),
      state: 'queued',
      errorClass: undefined,
      updatedAt: Date.now(),
    })
    await ctx.scheduler.runAfter(
      0,
      internal.emailReplies.answer.prepareInbound,
      { eventId },
    )
    return null
  },
})

export const getPreparation = internalMutation({
  args: { eventId: v.id('emailReplyEvents') },
  returns: v.union(
    v.object({ kind: v.literal('skip') }),
    v.object({ kind: v.literal('wait') }),
    v.object({
      kind: v.literal('ready'),
      agentmailThreadId: v.string(),
      askThreadId: v.optional(v.string()),
      askExpiresAt: v.optional(v.number()),
      ownsPreparation: v.boolean(),
      encryptedQuestion: v.string(),
      scope: v.union(
        v.object({
          kind: v.literal('corpus'),
          areaKey: v.optional(v.string()),
        }),
        v.object({ kind: v.literal('issue'), issueSlug: v.string() }),
        v.object({ kind: v.literal('meeting'), meetingId: v.string() }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId)
    if (
      !event?.replyThreadId ||
      event.state !== 'queued' ||
      event.questionMessageId ||
      !event.encryptedQuestion
    ) {
      return { kind: 'skip' } as const
    }
    const thread = await ctx.db.get(event.replyThreadId)
    if (!thread) return { kind: 'skip' } as const
    const hasActiveThread =
      thread.askThreadId !== undefined &&
      thread.askExpiresAt !== undefined &&
      thread.askExpiresAt > Date.now()
    let ownsPreparation = thread.preparingEventId === event._id
    if (!hasActiveThread && !ownsPreparation) {
      const preparationIsActive =
        thread.preparingStartedAt !== undefined &&
        thread.preparingStartedAt > Date.now() - PREPARATION_LEASE_MS
      if (preparationIsActive) return { kind: 'wait' } as const
      ownsPreparation = true
      await ctx.db.patch(thread._id, {
        preparingEventId: event._id,
        preparingStartedAt: Date.now(),
        updatedAt: Date.now(),
      })
    }
    return {
      kind: 'ready',
      agentmailThreadId: event.agentmailThreadId,
      askThreadId: hasActiveThread ? thread.askThreadId : undefined,
      askExpiresAt: hasActiveThread ? thread.askExpiresAt : undefined,
      ownsPreparation,
      encryptedQuestion: event.encryptedQuestion,
      scope: storedScope(thread.scopeKind, thread.scopeKey),
    } as const
  },
})

export const attachAskThread = internalMutation({
  args: {
    eventId: v.id('emailReplyEvents'),
    askThreadId: v.string(),
    askExpiresAt: v.number(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId)
    const thread = event?.replyThreadId
      ? await ctx.db.get(event.replyThreadId)
      : null
    if (!event || !thread || thread.preparingEventId !== event._id) return false
    await ctx.db.patch(thread._id, {
      askThreadId: args.askThreadId,
      askExpiresAt: args.askExpiresAt,
      preparingEventId: undefined,
      preparingStartedAt: undefined,
      updatedAt: Date.now(),
    })
    return true
  },
})

export const completePreparation = internalMutation({
  args: {
    eventId: v.id('emailReplyEvents'),
    askThreadId: v.string(),
    questionMessageId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId)
    const thread = event?.replyThreadId
      ? await ctx.db.get(event.replyThreadId)
      : null
    if (
      !event ||
      !thread ||
      event.state !== 'queued' ||
      event.questionMessageId ||
      thread.askThreadId !== args.askThreadId
    ) {
      return null
    }
    await ctx.db.patch(event._id, {
      questionMessageId: args.questionMessageId,
      encryptedQuestion: undefined,
      errorClass: undefined,
      updatedAt: Date.now(),
    })
    await ctx.scheduler.runAfter(
      0,
      internal.emailReplies.answer.answerInbound,
      {
        eventId: event._id,
      },
    )
    return null
  },
})

export const deferPreparation = internalMutation({
  args: { eventId: v.id('emailReplyEvents') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId)
    if (!event || event.state !== 'queued' || event.questionMessageId)
      return null
    await ctx.scheduler.runAfter(
      PREPARATION_RETRY_DELAY_MS,
      internal.emailReplies.answer.prepareInbound,
      { eventId: event._id },
    )
    return null
  },
})

export const retryPreparation = internalMutation({
  args: {
    eventId: v.id('emailReplyEvents'),
    errorClass: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId)
    if (!event || event.state !== 'queued' || event.questionMessageId)
      return null
    const preparationAttempts = event.preparationAttempts + 1
    const terminal = preparationAttempts >= MAX_PREPARATION_ATTEMPTS
    await ctx.db.patch(event._id, {
      state: terminal ? 'failed' : 'queued',
      encryptedQuestion: terminal ? undefined : event.encryptedQuestion,
      preparationAttempts,
      errorClass: args.errorClass.slice(0, 100),
      completedAt: terminal ? Date.now() : undefined,
      updatedAt: Date.now(),
    })
    if (terminal && event.replyThreadId) {
      const thread = await ctx.db.get(event.replyThreadId)
      if (thread?.preparingEventId === event._id) {
        await ctx.db.patch(thread._id, {
          preparingEventId: undefined,
          preparingStartedAt: undefined,
          updatedAt: Date.now(),
        })
      }
    }
    if (!terminal) {
      await ctx.scheduler.runAfter(
        PREPARATION_RETRY_DELAY_MS,
        internal.emailReplies.answer.prepareInbound,
        { eventId: event._id },
      )
    }
    return null
  },
})

export const claimAnswer = internalMutation({
  args: { eventId: v.id('emailReplyEvents') },
  returns: v.union(
    v.object({ kind: v.literal('skip') }),
    v.object({
      kind: v.literal('claimed'),
      attempt: v.number(),
      agentmailThreadId: v.string(),
      inboundMessageId: v.string(),
      askThreadId: v.string(),
      questionMessageId: v.string(),
      officialContactUrl: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId)
    if (!event?.replyThreadId || !event.questionMessageId)
      return { kind: 'skip' } as const
    const now = Date.now()
    const staleRunning =
      event.state === 'running' &&
      event.startedAt !== undefined &&
      event.startedAt <= now - RUNNING_LEASE_MS
    if (
      event.state === 'answered' ||
      event.state === 'not_found' ||
      event.state === 'ignored' ||
      (event.state === 'running' &&
        event.startedAt !== undefined &&
        event.startedAt > now - RUNNING_LEASE_MS) ||
      (event.state === 'failed' &&
        event.retryAt !== undefined &&
        event.retryAt > now) ||
      (event.attempt >= MAX_ANSWER_ATTEMPTS && !staleRunning)
    ) {
      return { kind: 'skip' } as const
    }
    const thread = await ctx.db.get(event.replyThreadId)
    if (!thread?.askThreadId) return { kind: 'skip' } as const
    const attempt = staleRunning ? event.attempt : event.attempt + 1
    await ctx.db.patch(event._id, {
      state: 'running',
      attempt,
      startedAt: now,
      retryAt: undefined,
      updatedAt: now,
    })
    return {
      kind: 'claimed',
      attempt,
      agentmailThreadId: event.agentmailThreadId,
      inboundMessageId: event.inboundMessageId,
      askThreadId: thread.askThreadId,
      questionMessageId: event.questionMessageId,
      officialContactUrl: thread.officialContactUrl,
    } as const
  },
})

export const failAnswer = internalMutation({
  args: {
    eventId: v.id('emailReplyEvents'),
    attempt: v.number(),
    errorClass: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId)
    if (!event || event.state !== 'running' || event.attempt !== args.attempt) {
      return null
    }
    const terminal = args.attempt >= MAX_ANSWER_ATTEMPTS
    const retryAt = terminal ? undefined : Date.now() + RETRY_DELAY_MS
    await ctx.db.patch(event._id, {
      state: 'failed',
      errorClass: args.errorClass.slice(0, 100),
      retryAt,
      completedAt: terminal ? Date.now() : undefined,
      updatedAt: Date.now(),
    })
    if (!terminal) {
      await ctx.scheduler.runAfter(
        RETRY_DELAY_MS,
        internal.emailReplies.answer.answerInbound,
        { eventId: event._id },
      )
    }
    return null
  },
})

async function ignoreEvent(
  ctx: MutationCtx,
  eventId: Doc<'emailReplyEvents'>['_id'],
  errorClass: string,
): Promise<void> {
  await ctx.db.patch(eventId, {
    state: 'ignored',
    errorClass,
    completedAt: Date.now(),
    updatedAt: Date.now(),
  })
}

async function senderOwnsDelivery(
  ctx: MutationCtx,
  delivery: Doc<'notificationDeliveries'>,
  sender: string,
): Promise<boolean> {
  if (delivery.ownerKind === 'google') {
    const userId = ctx.db.normalizeId('users', delivery.ownerKey.slice(7))
    const user = userId ? await ctx.db.get(userId) : null
    return user ? normalizeEmail(user.email) === sender : false
  }
  const subscriberId = ctx.db.normalizeId(
    'emailSubscribers',
    delivery.ownerKey.slice(6),
  )
  const subscriber = subscriberId ? await ctx.db.get(subscriberId) : null
  return subscriber?.state === 'verified'
    ? subscriber.addressHash === (await hashAddress(sender))
    : false
}

async function replyContext(
  ctx: MutationCtx,
  delivery: Doc<'notificationDeliveries'>,
): Promise<{ scope: AskScope; officialContactUrl?: string } | null> {
  if (delivery.kind === 'weekly') {
    // A roundup can contain updates from several follows, bodies, and places.
    // Its reply thread must cover every item named in the message.
    return { scope: { kind: 'corpus' } }
  }
  if (!delivery.materialChangeId) return null
  const change = await ctx.db.get(delivery.materialChangeId)
  const record = change ? await ctx.db.get(change.recordId) : null
  const body = record ? await ctx.db.get(record.governmentBodyId) : null
  const place = body ? await ctx.db.get(body.jurisdictionId) : null
  if (!change || !record || !body || !place) return null
  const links = await ctx.db
    .query('issueDecisionLinks')
    .withIndex('by_record_and_created_at', (q) => q.eq('recordId', record._id))
    .order('desc')
    .take(20)
  for (const link of links) {
    if (link.publicationVersionId !== change.currentPublicationVersionId)
      continue
    const issue = await ctx.db.get(link.issueId)
    if (issue?.currentVersionId === link.issueVersionId) {
      return {
        scope: { kind: 'issue', issueSlug: issue.slug },
        officialContactUrl: body.officialUrl,
      }
    }
  }
  return {
    scope: { kind: 'corpus', areaKey: place.slug },
    officialContactUrl: body.officialUrl,
  }
}
