import { v } from 'convex/values'
import { env, internalAction } from '../_generated/server'

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
    const inbox = await mailboxApi('/inboxes', { username: PROOF_INBOX, display_name: 'Public Parish development proof', client_id: PROOF_INBOX }) as { inbox_id?: string }
    if (!inbox.inbox_id?.startsWith(`${PROOF_INBOX}@`)) throw new Error('Unexpected proof inbox.')
    return inbox.inbox_id
  },
})
export const mailboxReceipts = internalAction({
  args: { inboxId: v.string() }, returns: v.array(v.object({ subject: v.string(), messageId: v.string(), verificationCode: v.union(v.string(), v.null()), unsubscribeUrl: v.union(v.string(), v.null()) })),
  handler: async (_ctx, args): Promise<Array<{ subject: string; messageId: string; verificationCode: string | null; unsubscribeUrl: string | null }>> => {
    requireDevelopment()
    if (!args.inboxId.startsWith(`${PROOF_INBOX}@`)) throw new Error('Only the controlled proof inbox is readable.')
    const result = await mailboxApi(`/inboxes/${encodeURIComponent(args.inboxId)}/threads?limit=10`) as { threads?: Array<{ thread_id: string }> }
    const receipts = []
    for (const thread of result.threads ?? []) {
      const detail = await mailboxApi(`/inboxes/${encodeURIComponent(args.inboxId)}/threads/${encodeURIComponent(thread.thread_id)}`) as { messages?: Array<{ message_id: string; subject?: string; text?: string }> }
      for (const message of detail.messages ?? []) receipts.push({ subject: message.subject ?? '', messageId: message.message_id, verificationCode: message.text?.match(/verification code is (\d{6})/i)?.[1] ?? null, unsubscribeUrl: message.text?.match(/https:\/\/woozy-wren-227\.convex\.site\/coverage\/unsubscribe\/[A-Za-z0-9_-]+/)?.[0] ?? null })
    }
    return receipts
  },
})
