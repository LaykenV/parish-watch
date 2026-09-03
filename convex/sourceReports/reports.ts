import type { OutboundId } from '@agentmail/convex'
import { ConvexError, v } from 'convex/values'

import type { MutationCtx, QueryCtx } from '../_generated/server'
import { internal } from '../_generated/api'
import { env, internalMutation, mutation, query } from '../_generated/server'
import { agentmail } from '../follows/agentmailClient'
import { normalizeEmail } from '../follows/secrets'
import { sha256HexOfText } from '../sources/hashing'

const MAX_DESCRIPTION_LENGTH = 2_000
const MIN_DESCRIPTION_LENGTH = 10
const MAX_REPORTS_PER_BROWSER_HOUR = 3
const MAX_REPORTS_GLOBAL_HOUR = 100
const ONE_HOUR_MS = 60 * 60 * 1_000
const REPORT_RETENTION_MS = 30 * 24 * 60 * 60 * 1_000
const RETENTION_BATCH_SIZE = 100

const category = v.union(
  v.literal('wrong-fact'),
  v.literal('broken-citation'),
  v.literal('missing-document'),
  v.literal('wrong-record'),
  v.literal('importance-factor'),
)

const receiptStatus = v.union(
  v.literal('sending'),
  v.literal('sent'),
  v.literal('failed'),
)

export const availability = query({
  args: {},
  returns: v.object({ available: v.boolean() }),
  handler: async () => ({ available: reportsAvailable() }),
})

export const submit = mutation({
  args: {
    submissionId: v.string(),
    browserToken: v.string(),
    category,
    recordUrl: v.string(),
    description: v.string(),
    officialUrl: v.optional(v.string()),
    replyEmail: v.optional(v.string()),
  },
  returns: v.object({ status: receiptStatus, replayed: v.boolean() }),
  handler: async (ctx, args) => {
    const config = reportConfig()
    requireOpaqueId(args.submissionId, 'submission')
    requireOpaqueId(args.browserToken, 'browser')
    const submissionHash = await sha256HexOfText(args.submissionId)
    const browserHash = await sha256HexOfText(args.browserToken)
    const replay = await ctx.db
      .query('sourceProblemReports')
      .withIndex('by_submission_hash', (q) =>
        q.eq('submissionHash', submissionHash),
      )
      .unique()
    if (replay) {
      if (replay.browserHash !== browserHash) throw reportError('not_found')
      return {
        status: await currentStatus(ctx, replay.outboundId),
        replayed: true,
      } as const
    }

    const now = Date.now()
    await requireRateCapacity(ctx, browserHash, now)
    const description = args.description.trim()
    if (
      description.length < MIN_DESCRIPTION_LENGTH ||
      description.length > MAX_DESCRIPTION_LENGTH
    ) {
      throw reportError('description_bounds')
    }
    const recordPath = normalizeRecordPath(args.recordUrl)
    const officialUrl = args.officialUrl
      ? normalizeExternalUrl(args.officialUrl, 'official_url')
      : undefined
    const replyEmail = args.replyEmail
      ? normalizeEmail(args.replyEmail)
      : undefined
    const publicUrl = `${config.siteOrigin}${recordPath}`
    const text = projectReport({
      category: args.category,
      publicUrl,
      description,
      officialUrl,
      replyEmail,
    })
    const outboundId = await agentmail.sendMessage(ctx, config.inboxId, {
      to: config.recipient,
      subject: `Private source report: ${categoryLabel(args.category)}`,
      text,
      replyTo: replyEmail,
      labels: ['public-parish', 'private-source-report'],
    })
    await ctx.db.insert('sourceProblemReports', {
      submissionHash,
      browserHash,
      category: args.category,
      recordPath,
      outboundId,
      createdAt: now,
    })
    return { status: 'sending', replayed: false } as const
  },
})

export const receipt = query({
  args: {
    submissionId: v.string(),
    browserToken: v.string(),
  },
  returns: v.union(
    v.object({ found: v.literal(false) }),
    v.object({ found: v.literal(true), status: receiptStatus }),
  ),
  handler: async (ctx, args) => {
    requireOpaqueId(args.submissionId, 'submission')
    requireOpaqueId(args.browserToken, 'browser')
    const submissionHash = await sha256HexOfText(args.submissionId)
    const report = await ctx.db
      .query('sourceProblemReports')
      .withIndex('by_submission_hash', (q) =>
        q.eq('submissionHash', submissionHash),
      )
      .unique()
    if (!report) return { found: false } as const
    if (report.browserHash !== (await sha256HexOfText(args.browserToken))) {
      return { found: false } as const
    }
    return {
      found: true,
      status: await currentStatus(ctx, report.outboundId),
    } as const
  },
})

export const removeExpiredMetadata = internalMutation({
  args: {},
  returns: v.object({ deleted: v.number(), continued: v.boolean() }),
  handler: async (ctx) => {
    const expired = await ctx.db
      .query('sourceProblemReports')
      .withIndex('by_created_at', (q) =>
        q.lte('createdAt', Date.now() - REPORT_RETENTION_MS),
      )
      .take(RETENTION_BATCH_SIZE)
    for (const report of expired) await ctx.db.delete(report._id)
    const continued = expired.length === RETENTION_BATCH_SIZE
    if (continued) {
      await ctx.scheduler.runAfter(
        0,
        internal.sourceReports.reports.removeExpiredMetadata,
        {},
      )
    }
    return { deleted: expired.length, continued }
  },
})

type ReportCategory = typeof category.type

async function requireRateCapacity(
  ctx: MutationCtx,
  browserHash: string,
  now: number,
): Promise<void> {
  const since = now - ONE_HOUR_MS
  const browserReports = await ctx.db
    .query('sourceProblemReports')
    .withIndex('by_browser_hash_and_created_at', (q) =>
      q.eq('browserHash', browserHash).gte('createdAt', since),
    )
    .order('desc')
    .take(MAX_REPORTS_PER_BROWSER_HOUR)
  if (browserReports.length >= MAX_REPORTS_PER_BROWSER_HOUR) {
    throw reportError('rate_limited')
  }
  const globalReports = await ctx.db
    .query('sourceProblemReports')
    .withIndex('by_created_at', (q) => q.gte('createdAt', since))
    .order('desc')
    .take(MAX_REPORTS_GLOBAL_HOUR)
  if (globalReports.length >= MAX_REPORTS_GLOBAL_HOUR) {
    throw reportError('capacity_reached')
  }
}

async function currentStatus(
  ctx: QueryCtx | MutationCtx,
  outboundId: string,
): Promise<typeof receiptStatus.type> {
  const status = await agentmail.status(ctx, outboundId as OutboundId)
  if (!status || status.status === 'pending') return 'sending'
  if (status.status === 'sent' || status.status === 'delivered') return 'sent'
  return 'failed'
}

function reportConfig(): {
  inboxId: string
  recipient: string
  siteOrigin: string
} {
  const inboxId = env.AGENTMAIL_REPORTS_INBOX_ID?.trim()
  const recipient = env.ADMIN_EMAIL?.trim()
  if (!inboxId || !recipient) throw reportError('unavailable')
  const siteOrigin = env.CONVEX_SITE_URL.trim().replace(/\/$/, '')
  return { inboxId, recipient: normalizeEmail(recipient), siteOrigin }
}

function reportsAvailable(): boolean {
  return Boolean(
    env.AGENTMAIL_REPORTS_INBOX_ID?.trim() &&
      env.ADMIN_EMAIL?.trim(),
  )
}

function normalizeRecordPath(value: string): string {
  if (!value || value.length > 768) throw reportError('record_url')
  let url: URL
  try {
    url = new URL(value, 'https://public-parish.local')
  } catch {
    throw reportError('record_url')
  }
  if (url.origin !== 'https://public-parish.local' || url.hash) {
    throw reportError('record_url')
  }
  if (
    !/^\/(issues|decisions|meetings)\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
      url.pathname,
    )
  ) {
    throw reportError('record_url')
  }
  const source = url.searchParams.get('source')
  const search = source
    ? `?source=${encodeURIComponent(source.slice(0, 200))}`
    : ''
  return `${url.pathname}${search}`
}

function normalizeExternalUrl(value: string, code: string): string {
  if (value.length > 2_048) throw reportError(code)
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw reportError(code)
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw reportError(code)
  }
  return url.toString()
}

function requireOpaqueId(value: string, label: string): void {
  if (value.length < 16 || value.length > 100 || /\s/.test(value)) {
    throw reportError(`${label}_id`)
  }
}

function projectReport(input: {
  category: ReportCategory
  publicUrl: string
  description: string
  officialUrl?: string
  replyEmail?: string
}): string {
  const lines = [
    'A resident sent a private source report.',
    '',
    `Problem type: ${categoryLabel(input.category)}`,
    `Public Parish page: ${input.publicUrl}`,
    '',
    'What they found',
    input.description,
  ]
  if (input.officialUrl) {
    lines.push('', `Suggested official document: ${input.officialUrl}`)
  }
  if (input.replyEmail) lines.push('', `Reply requested: ${input.replyEmail}`)
  lines.push(
    '',
    'Do not change published content until checked official evidence supports it.',
  )
  return lines.join('\n')
}

function categoryLabel(value: ReportCategory): string {
  const labels: Record<ReportCategory, string> = {
    'wrong-fact': 'A fact does not match the source',
    'broken-citation': 'A Source opens the wrong excerpt',
    'missing-document': 'A newer official document is missing',
    'wrong-record': 'This record belongs to another issue',
    'importance-factor': 'A why-it-matters reason is unsupported',
  }
  return labels[value]
}

function reportError(code: string) {
  const messages: Record<string, string> = {
    unavailable: 'Private source reporting is unavailable right now.',
    not_found: 'This report receipt is unavailable.',
    description_bounds: 'Describe the problem in 10 to 2,000 characters.',
    record_url: 'The attached Public Parish page is invalid.',
    official_url: 'Enter a valid public link to the official document.',
    rate_limited:
      'Too many reports were sent from this browser. Try again later.',
    capacity_reached:
      'Private reporting has reached its hourly limit. Try again in a little while.',
    submission_id: 'The report receipt is invalid.',
    browser_id: 'The private browser receipt is invalid.',
  }
  return new ConvexError({
    code,
    message: messages[code] ?? 'Report rejected.',
  })
}
