import { v } from 'convex/values'
import { paginationOptsValidator } from 'convex/server'
import { internal } from '../_generated/api'
import type { Id } from '../_generated/dataModel'
import { completeStructuredDirectFallback } from '../ai/provider'
import { decryptAddress } from '../follows/secrets'
import { normalizeForMatch } from '../extraction/textMatch'
import { sha256HexOfText } from '../sources/hashing'
import { env, internalAction, internalMutation, internalQuery } from '../_generated/server'

// Exact normalization used by the first published corpus at 74ce97e.
function originalCitationMatch(text: string): string {
  return text.replace(/\u00a0/g, ' ').replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\s+/g, ' ').trim()
}
// Frozen intermediate bases from 2fd6516 and 236f89d. Source snapshots and
// publication citations remain immutable when matching rules gain formatting support.
function historicalCitationMatches(text: string): string[] {
  const joined = text.replace(/([A-Za-z0-9])-[ \t]*\r?\n[ \t]*(?=[A-Za-z0-9])/g, '$1-')
  return [originalCitationMatch(text), originalCitationMatch(joined), originalCitationMatch(joined.replace(/<u(?:\s+[^<>]*?)?\s*>|<\/u\s*>/gi, '')), normalizeForMatch(text, { preserveBoldEmphasis: true }), normalizeForMatch(text, { preserveBoldEmphasis: true, preservePdfSuperscriptArtifacts: true })]
}
const PROOF_INBOX = 'public-parish-slice9-dev-20260904'
function requireDevelopment() {
  if (env.CONVEX_SITE_URL !== 'https://woozy-wren-227.convex.site') throw new Error('Development proof is unavailable on this deployment.')
}
async function mailboxApi(path: string, body?: object): Promise<unknown> {
  const response = await fetch(`https://api.agentmail.to/v0${path}`, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${env.AGENTMAIL_API_KEY}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) })
  if (!response.ok) {
    const detail = await response.json() as { name?: string; message?: string }
    throw new Error(`Proof mailbox request failed with HTTP ${response.status}: ${detail.name ?? ''} ${(detail.message ?? '').slice(0, 300)}`)
  }
  return response.json()
}
export const createMailbox = internalAction({
  args: {}, returns: v.string(),
  handler: async () => {
    requireDevelopment()
    const recipient = env.AGENTMAIL_REPORTS_INBOX_ID?.trim()
    if (!recipient || recipient === env.AGENTMAIL_UPDATES_INBOX_ID) throw new Error('A separate controlled reports inbox is required.')
    const inbox = await mailboxApi(`/inboxes/${encodeURIComponent(recipient)}`) as { inbox_id?: string }
    if (inbox.inbox_id !== recipient) throw new Error('Unexpected proof inbox.')
    return inbox.inbox_id
  },
})
export const mailboxReceipts = internalAction({
  args: { inboxId: v.string() }, returns: v.array(v.object({ subject: v.string(), messageId: v.string(), verificationCode: v.union(v.string(), v.null()), unsubscribeUrl: v.union(v.string(), v.null()) })),
  handler: async (_ctx, args): Promise<Array<{ subject: string; messageId: string; verificationCode: string | null; unsubscribeUrl: string | null }>> => {
    requireDevelopment()
    if (!args.inboxId.startsWith(`${PROOF_INBOX}@`) && args.inboxId !== env.AGENTMAIL_REPORTS_INBOX_ID) throw new Error('Only the controlled proof inbox is readable.')
    const result = await mailboxApi(`/inboxes/${encodeURIComponent(args.inboxId)}/threads?limit=10`) as { threads?: Array<{ thread_id: string }> }
    const receipts = []
    for (const thread of result.threads ?? []) {
      const detail = await mailboxApi(`/inboxes/${encodeURIComponent(args.inboxId)}/threads/${encodeURIComponent(thread.thread_id)}`) as { messages?: Array<{ message_id: string; subject?: string; text?: string }> }
      for (const message of detail.messages ?? []) if (message.subject === 'Your Public Parish verification code' || message.subject === 'Verify your Public Parish coverage notice' || message.subject?.startsWith('Public Parish coverage is available for ')) receipts.push({ subject: message.subject ?? '', messageId: message.message_id, verificationCode: message.text?.match(/(?:verification code is|verification code:|code is)\s*(\d{6})/i)?.[1] ?? message.text?.match(/\n\s*(\d{6})\s*\n/)?.[1] ?? null, unsubscribeUrl: message.text?.match(/https:\/\/woozy-wren-227\.convex\.site\/coverage\/unsubscribe\/[A-Za-z0-9_-]+/)?.[0] ?? null })
    }
    return receipts
  },
})

export const providerAccess = internalAction({
  args: {}, returns: v.array(v.object({ operation: v.string(), status: v.number() })),
  handler: async () => {
    requireDevelopment()
    const results = []
    for (const [operation, path] of [['list inboxes', '/inboxes?limit=1'], ['configured updates inbox', `/inboxes/${encodeURIComponent(env.AGENTMAIL_UPDATES_INBOX_ID ?? '')}`]]) {
      const response = await fetch(`https://api.agentmail.to/v0${path}`, { headers: { Authorization: `Bearer ${env.AGENTMAIL_API_KEY}` } })
      results.push({ operation, status: response.status })
    }
    return results
  },
})

export const publishedEvidencePage = internalQuery({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    requireDevelopment()
    if (args.paginationOpts.numItems > 10) throw new Error('Use at most ten records per audit page.')
    const page = await ctx.db.query('decisionRecords').paginate(args.paginationOpts)
    const evidence = []
    for (const record of page.page) {
      if (!record.currentPublishedVersionId) continue
      const current = await ctx.db.get(record.currentPublishedVersionId)
      const previous = current ? await ctx.db.query('publicationVersions').withIndex('by_record_and_version', q => q.eq('recordId', record._id).lt('version', current.version)).order('desc').take(1) : []
      for (const version of [current, ...previous]) {
      if (!version?.payload || version.mode === 'withheld') continue
      const citations = await ctx.db.query('citations').withIndex('by_publication_and_field_path', q => q.eq('publicationVersionId', version._id)).take(101)
      const snapshots = []
      for (const id of new Set(citations.map(citation => citation.snapshotId))) {
        const snapshot = await ctx.db.get(id)
        if (snapshot) snapshots.push(snapshot)
      }
      evidence.push({ recordKey: `${record.recordKey}:v${version.version}`, citations, snapshots })
      }
    }
    return { evidence, isDone: page.isDone, continueCursor: page.continueCursor }
  },
})
export const auditPublishedEvidence = internalAction({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args): Promise<{ records: number; citations: number; legacyOffsets: number; problems: string[]; isDone: boolean; continueCursor: string }> => {
    requireDevelopment()
    const page = await ctx.runQuery(internal.operations.developmentProof.publishedEvidencePage, args)
    const texts = new Map<string, { current: string; historical: string[] }>()
    const problems: string[] = []
    let citations = 0
    let legacyOffsets = 0
    for (const record of page.evidence) {
      if (!record.citations.length || record.citations.length > 100) problems.push(`${record.recordKey}: citation capacity`)
      for (const snapshot of record.snapshots) {
        if (texts.has(snapshot._id)) continue
        const blob = await ctx.storage.get(snapshot.normalizedStorageId)
        const text = blob ? await blob.text() : ''
        if (!blob || await sha256HexOfText(text) !== snapshot.normalizedContentHash) problems.push(`${record.recordKey}: snapshot hash`)
        texts.set(snapshot._id, { current: normalizeForMatch(text), historical: historicalCitationMatches(text) })
      }
      for (const citation of record.citations) {
        citations++
        const text = texts.get(citation.snapshotId)
        if (text?.current.slice(citation.normalizedStartOffset, citation.normalizedEndOffset) === normalizeForMatch(citation.excerpt)) continue
        const excerpts = historicalCitationMatches(citation.excerpt)
        if (text?.historical.some((source, index) => source.slice(citation.normalizedStartOffset, citation.normalizedEndOffset) === excerpts[index])) legacyOffsets++
        else problems.push(`${record.recordKey} ${citation.fieldPath}: citation offsets`)

      }
    }
    return { records: page.evidence.length, citations, legacyOffsets, problems, isDone: page.isDone, continueCursor: page.continueCursor }
  },
})

// Rebuild only derived development usage after changing the rollup algorithm.
export const resetUsageRollups = internalMutation({
  args: {}, returns: v.number(),
  handler: async ctx => {
    requireDevelopment()
    const daily = await ctx.db.query('providerUsageDaily').take(101)
    if (daily.length > 100) throw new Error('Development rollup reset exceeds its bound.')
    const rows = []
    for (const table of ['aiCalls', 'askModelAttempts', 'coverageCompilerProviderCalls', 'monitoringProviderCalls'] as const) {
      const page = await ctx.db.query(table).withIndex('by_usage_aggregated', q => q.gt('usageAggregatedAt', undefined)).take(1001)
      if (page.length > 1000) throw new Error('Development usage reset exceeds its bound.')
      rows.push(...page)
    }
    for (const row of rows) await ctx.db.patch(row._id, { usageAggregatedAt: undefined })
    for (const row of daily) await ctx.db.delete(row._id)
    return daily.length
  },
})

export const directFallbackProbe = internalAction({
  args: {}, returns: v.object({ outcome: v.string(), route: v.string(), model: v.string(), tokens: v.union(v.number(), v.null()) }),
  handler: async () => {
    requireDevelopment()
    const result = await completeStructuredDirectFallback({
      request: { role: 'MODEL_FAST', reasoningEffort: 'low', maxCompletionTokens: 200, schemaName: 'development_provider_probe', jsonSchema: { type: 'object', additionalProperties: false, required: ['status'], properties: { status: { type: 'string', enum: ['ready'] } } }, messages: [{ role: 'user', content: 'Return status ready. This checks the development provider route and makes no civic claim.' }] },
      responseValidator: v.object({ status: v.literal('ready') }), contractCheck: () => null,
    })
    if (result.outcome !== 'success') throw new Error('Development fallback probe did not produce valid structured output.')
    return { outcome: result.outcome, route: result.result.route, model: result.result.modelId, tokens: result.result.usage.totalTokens }
  },
})

// Controlled replay uses an existing accepted change. It never changes the
// evidence, publication time, follow time, or recipients outside this inbox.
export const replayControlledDelivery = internalMutation({
  args: {}, returns: v.id('roundupWindows'),
  handler: async ctx => {
    requireDevelopment()
    const follow = await ctx.db.query('follows').withIndex('by_owner_key_and_target_kind_and_target_key', q => q.eq('ownerKey', 'email:q57ek0j24jh68jvj7yzbcvftx18dsjad').eq('targetKind', 'issue').eq('targetKey', 'roundabout-funding-at-bluebonnet-and-harveston-way-824dde42')).unique()
    if (!follow || follow.ownerKind !== 'email') throw new Error('Controlled follow is missing.')
    const subscriber = await ctx.db.get(follow.emailSubscriberId)
    if (!subscriber || subscriber.state !== 'verified' || await decryptAddress(subscriber.encryptedAddress) !== env.AGENTMAIL_REPORTS_INBOX_ID) throw new Error('Controlled recipient is not verified.')
    const changeId = 'n978nde34swh68bshac2hkwh318dpcvq' as Id<'materialChanges'>
    const change = await ctx.db.get(changeId)
    const record = change ? await ctx.db.get(change.recordId) : null
    if (!change?.material || change.notificationEligible === false || record?.currentPublishedVersionId !== change.currentPublicationVersionId) throw new Error('Accepted replay evidence changed.')
    const windowKey = 'development-slice9-controlled-replay-20260904'
    const previous = await ctx.db.query('roundupWindows').withIndex('by_window_key', q => q.eq('windowKey', windowKey)).unique()
    if (previous) return previous._id
    const existing = await ctx.db.query('notificationMatches').withIndex('by_follow_id_and_material_change_id', q => q.eq('followId', follow._id).eq('materialChangeId', changeId)).unique()
    if (existing) throw new Error('Controlled replay already has a match without its window.')
    const now = Date.now()
    const otherMatches = await ctx.db.query('notificationMatches').withIndex('by_matched_at', q => q.gte('matchedAt', now).lt('matchedAt', now + 1)).take(1)
    if (otherMatches.length) throw new Error('Controlled replay time overlaps another match.')
    await ctx.db.insert('notificationMatches', { followId: follow._id, materialChangeId: changeId, ownerKind: follow.ownerKind, ownerKey: follow.ownerKey, targetKind: follow.targetKind, targetKey: follow.targetKey, cadenceAtMatch: 'both', matchedAt: now })
    const windowId = await ctx.db.insert('roundupWindows', { windowKey, startsAt: now, endsAt: now + 1, state: 'collecting', entryCount: 0, deliveryCount: 0, createdAt: now, updatedAt: now })
    await ctx.runMutation(internal.follows.agentmailClient.reserveImmediateDelivery, { materialChangeId: changeId, ownerKey: follow.ownerKey })
    await ctx.scheduler.runAfter(1, internal.follows.agentmailClient.collectWeeklyRoundupPage, { roundupWindowId: windowId, paginationOpts: { numItems: 50, cursor: null } })
    return windowId
  },
})

export const controlledNotificationReceipts = internalAction({
  args: {}, returns: v.array(v.object({ messageId: v.string(), threadId: v.string(), subject: v.string(), officialLinks: v.number(), isReply: v.boolean() })),
  handler: async () => {
    requireDevelopment()
    const inbox = env.AGENTMAIL_REPORTS_INBOX_ID
    if (!inbox || inbox === env.AGENTMAIL_UPDATES_INBOX_ID) throw new Error('Separate controlled inbox required.')
    const result = await mailboxApi(`/inboxes/${encodeURIComponent(inbox)}/threads?limit=20`) as { threads?: Array<{ thread_id: string }> }
    const receipts = []
    for (const thread of result.threads ?? []) {
      const detail = await mailboxApi(`/inboxes/${encodeURIComponent(inbox)}/threads/${encodeURIComponent(thread.thread_id)}`) as { messages?: Array<{ message_id: string; subject?: string; text?: string; in_reply_to?: string; from?: string }> }
      for (const message of detail.messages ?? []) {
        if (!message.from?.includes(env.AGENTMAIL_UPDATES_INBOX_ID ?? 'missing') || !message.subject || !/(?:Public Parish|^(?:New decision|Decision update):)/.test(message.subject)) continue
        if (message.subject.includes('verification') || message.subject.includes('coverage')) continue
        receipts.push({ messageId: message.message_id, threadId: thread.thread_id, subject: message.subject, officialLinks: (message.text?.match(/https:\/\/(?:rppj\.com|www\.rppj\.com|hdlegisuite\.brla\.gov)\//g) ?? []).length, isReply: Boolean(message.in_reply_to) })
      }
    }
    return receipts
  },
})

export const replyToControlledNotification = internalAction({
  args: { messageId: v.string() }, returns: v.object({ messageId: v.string(), threadId: v.string() }),
  handler: async (_ctx, args) => {
    requireDevelopment()
    const inbox = env.AGENTMAIL_REPORTS_INBOX_ID
    if (!inbox || inbox === env.AGENTMAIL_UPDATES_INBOX_ID) throw new Error('Separate controlled inbox required.')
    const message = await mailboxApi(`/inboxes/${encodeURIComponent(inbox)}/messages/${encodeURIComponent(args.messageId)}`) as { from?: string; subject?: string }
    if (!message.from?.includes(env.AGENTMAIL_UPDATES_INBOX_ID ?? 'missing') || !message.subject || !/(?:Public Parish|^(?:New decision|Decision update):)/.test(message.subject)) throw new Error('Only the controlled Public Parish delivery may receive this reply.')
    const reply = await mailboxApi(`/inboxes/${encodeURIComponent(inbox)}/messages/${encodeURIComponent(args.messageId)}/reply`, { text: 'Controlled development check: What amount does this roundabout update authorize, and what does the accepted source say it pays for? Please distinguish an authorization from proof of completed construction.' }) as { message_id: string; thread_id: string }
    return { messageId: reply.message_id, threadId: reply.thread_id }
  },
})
