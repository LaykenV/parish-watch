import { ConvexError, v } from 'convex/values'

import type { Doc } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'
import { mutation } from '../_generated/server'
import {
  ANALYTICS_RETENTION_MS,
  ANALYTICS_RETURN_WINDOW_MS,
  ANALYTICS_SCOPE,
  ANALYTICS_VISIT_WINDOW_MS,
  analyticsAreaSlug,
  emptyAreaCounts,
  incrementAreaCount,
} from './contracts'
import type { AnalyticsAreaSlug } from './contracts'

const eventResult = v.object({ recorded: v.boolean() })

type VisitState = {
  subject: Doc<'analyticsSubjects'>
  isNewVisitor: boolean
  isNewVisit: boolean
  becameReturning: boolean
}

export const recordVisit = mutation({
  args: {
    visitorKeyHash: v.string(),
    eventKey: v.string(),
  },
  returns: eventResult,
  handler: async (ctx, args) => {
    validateOpaqueInputs(args)
    const eventKey = `${args.eventKey}:visit`
    if (await eventExists(ctx, eventKey)) return { recorded: false }

    const now = Date.now()
    const state = await applyVisit(ctx, args.visitorKeyHash, now)
    if (!state.isNewVisit) return { recorded: false }

    await ctx.db.insert('analyticsEvents', {
      eventKey,
      subjectId: state.subject._id,
      kind: 'app_visit',
      occurredAt: now,
      expiresAt: now + ANALYTICS_RETENTION_MS,
    })
    await updateCounters(ctx, now, {
      uniqueVisitors: state.isNewVisitor ? 1 : 0,
      visits: 1,
      returningVisitors: state.becameReturning ? 1 : 0,
    })
    return { recorded: true }
  },
})

export const recordAreaSelection = mutation({
  args: {
    visitorKeyHash: v.string(),
    eventKey: v.string(),
    areaSlug: analyticsAreaSlug,
  },
  returns: eventResult,
  handler: async (ctx, args) => {
    validateOpaqueInputs(args)
    const eventKey = `${args.eventKey}:area`
    if (await eventExists(ctx, eventKey)) return { recorded: false }

    const now = Date.now()
    const state = await applyVisit(ctx, args.visitorKeyHash, now)
    const subject = state.subject
    const areaChanged = subject.lastAreaSlug !== args.areaSlug
    const becameActivated = subject.firstAreaSelectedAt === undefined

    if (state.isNewVisit) {
      await ctx.db.insert('analyticsEvents', {
        eventKey: `${args.eventKey}:visit`,
        subjectId: subject._id,
        kind: 'app_visit',
        occurredAt: now,
        expiresAt: now + ANALYTICS_RETENTION_MS,
      })
    }

    if (!areaChanged) {
      await updateCounters(ctx, now, {
        uniqueVisitors: state.isNewVisitor ? 1 : 0,
        visits: state.isNewVisit ? 1 : 0,
        returningVisitors: state.becameReturning ? 1 : 0,
      })
      return { recorded: false }
    }

    await ctx.db.patch('analyticsSubjects', subject._id, {
      firstAreaSelectedAt: subject.firstAreaSelectedAt ?? now,
      firstAreaSlug: subject.firstAreaSlug ?? args.areaSlug,
      lastAreaSelectedAt: now,
      lastAreaSlug: args.areaSlug,
      areaSelectionCount: subject.areaSelectionCount + 1,
      expiresAt: now + ANALYTICS_RETENTION_MS,
    })
    await ctx.db.insert('analyticsEvents', {
      eventKey,
      subjectId: subject._id,
      kind: 'area_selected',
      areaSlug: args.areaSlug,
      occurredAt: now,
      expiresAt: now + ANALYTICS_RETENTION_MS,
    })
    await updateCounters(ctx, now, {
      uniqueVisitors: state.isNewVisitor ? 1 : 0,
      visits: state.isNewVisit ? 1 : 0,
      activatedVisitors: becameActivated ? 1 : 0,
      returningVisitors: state.becameReturning ? 1 : 0,
      areaSelections: 1,
      firstSelectionArea: becameActivated ? args.areaSlug : undefined,
      selectionArea: args.areaSlug,
    })
    return { recorded: true }
  },
})

async function applyVisit(
  ctx: MutationCtx,
  visitorKeyHash: string,
  now: number,
): Promise<VisitState> {
  const existing = await ctx.db
    .query('analyticsSubjects')
    .withIndex('by_visitor_key_hash', (q) =>
      q.eq('visitorKeyHash', visitorKeyHash),
    )
    .unique()

  if (!existing) {
    const subjectId = await ctx.db.insert('analyticsSubjects', {
      visitorKeyHash,
      firstSeenAt: now,
      lastSeenAt: now,
      lastVisitStartedAt: now,
      visitCount: 1,
      areaSelectionCount: 0,
      expiresAt: now + ANALYTICS_RETENTION_MS,
    })
    const subject = await ctx.db.get('analyticsSubjects', subjectId)
    if (!subject) throw new Error('Inserted analytics subject is unavailable')
    return {
      subject,
      isNewVisitor: true,
      isNewVisit: true,
      becameReturning: false,
    }
  }

  const isNewVisit =
    now - existing.lastVisitStartedAt >= ANALYTICS_VISIT_WINDOW_MS
  const becameReturning =
    isNewVisit &&
    existing.returnedAt === undefined &&
    now - existing.firstSeenAt >= ANALYTICS_RETURN_WINDOW_MS

  await ctx.db.patch('analyticsSubjects', existing._id, {
    lastSeenAt: now,
    lastVisitStartedAt: isNewVisit ? now : existing.lastVisitStartedAt,
    visitCount: isNewVisit ? existing.visitCount + 1 : existing.visitCount,
    returnedAt: becameReturning ? now : existing.returnedAt,
    expiresAt: now + ANALYTICS_RETENTION_MS,
  })
  const subject = await ctx.db.get('analyticsSubjects', existing._id)
  if (!subject) throw new Error('Updated analytics subject is unavailable')
  return {
    subject,
    isNewVisitor: false,
    isNewVisit,
    becameReturning,
  }
}

async function eventExists(ctx: MutationCtx, eventKey: string) {
  return (
    (await ctx.db
      .query('analyticsEvents')
      .withIndex('by_event_key', (q) => q.eq('eventKey', eventKey))
      .unique()) !== null
  )
}

function validateOpaqueInputs(args: {
  visitorKeyHash: string
  eventKey: string
}) {
  if (!/^[a-f0-9]{64}$/.test(args.visitorKeyHash)) {
    throw new ConvexError({
      code: 'invalid_analytics_visitor',
      message: 'Analytics visitor identifiers must be opaque hashes',
    })
  }
  if (!/^[a-zA-Z0-9-]{16,80}$/.test(args.eventKey)) {
    throw new ConvexError({
      code: 'invalid_analytics_event',
      message: 'Analytics event identifiers must be opaque values',
    })
  }
}

type CounterIncrement = {
  uniqueVisitors?: number
  visits?: number
  activatedVisitors?: number
  returningVisitors?: number
  areaSelections?: number
  firstSelectionArea?: AnalyticsAreaSlug
  selectionArea?: AnalyticsAreaSlug
}

async function updateCounters(
  ctx: MutationCtx,
  now: number,
  increment: CounterIncrement,
) {
  const existing = await ctx.db
    .query('analyticsCounters')
    .withIndex('by_scope', (q) => q.eq('scope', ANALYTICS_SCOPE))
    .unique()
  const firstSelectionsByArea = increment.firstSelectionArea
    ? incrementAreaCount(
        existing?.firstSelectionsByArea ?? emptyAreaCounts(),
        increment.firstSelectionArea,
      )
    : (existing?.firstSelectionsByArea ?? emptyAreaCounts())
  const selectionsByArea = increment.selectionArea
    ? incrementAreaCount(
        existing?.selectionsByArea ?? emptyAreaCounts(),
        increment.selectionArea,
      )
    : (existing?.selectionsByArea ?? emptyAreaCounts())
  const counters = {
    scope: ANALYTICS_SCOPE,
    startedAt: existing?.startedAt ?? now,
    updatedAt: now,
    uniqueVisitors:
      (existing?.uniqueVisitors ?? 0) + (increment.uniqueVisitors ?? 0),
    visits: (existing?.visits ?? 0) + (increment.visits ?? 0),
    activatedVisitors:
      (existing?.activatedVisitors ?? 0) + (increment.activatedVisitors ?? 0),
    returningVisitors:
      (existing?.returningVisitors ?? 0) + (increment.returningVisitors ?? 0),
    areaSelections:
      (existing?.areaSelections ?? 0) + (increment.areaSelections ?? 0),
    firstSelectionsByArea,
    selectionsByArea,
  }

  if (existing) {
    await ctx.db.replace('analyticsCounters', existing._id, counters)
  } else {
    await ctx.db.insert('analyticsCounters', counters)
  }
}
