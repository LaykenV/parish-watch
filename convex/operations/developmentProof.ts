import { v } from 'convex/values'
import { paginationOptsValidator } from 'convex/server'
import { internal } from '../_generated/api'
import { normalizeForMatch } from '../extraction/textMatch'
import { sha256HexOfText } from '../sources/hashing'
import { env, internalAction, internalMutation, internalQuery } from '../_generated/server'

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
    const texts = new Map<string, { current: string; legacy: string }>()
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
        texts.set(snapshot._id, { current: normalizeForMatch(text), legacy: normalizeForMatch(text, { preserveBoldEmphasis: true }) })
      }
      for (const citation of record.citations) {
        citations++
        const text = texts.get(citation.snapshotId)
        if (text?.current.slice(citation.normalizedStartOffset, citation.normalizedEndOffset) === normalizeForMatch(citation.excerpt)) continue
        // Publication offsets before 78df4a6 retained bold Markdown markers.
        if (text?.legacy.slice(citation.normalizedStartOffset, citation.normalizedEndOffset) === normalizeForMatch(citation.excerpt, { preserveBoldEmphasis: true })) legacyOffsets++
        else problems.push(`${record.recordKey}: citation offsets`)
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
