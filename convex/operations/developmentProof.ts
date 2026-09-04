import { v } from 'convex/values'
import { env, internalAction } from '../_generated/server'
import { agentmail } from '../follows/agentmailClient'

const PROOF_INBOX = 'public-parish-slice9-dev-20260904'
function requireDevelopment() {
  if (env.CONVEX_SITE_URL !== 'https://woozy-wren-227.convex.site') throw new Error('Development proof is unavailable on this deployment.')
}
export const createMailbox = internalAction({
  args: {}, returns: v.string(),
  handler: async ctx => {
    requireDevelopment()
    const inbox = await agentmail.createInbox(ctx, { username: PROOF_INBOX, displayName: 'Public Parish development proof', clientId: PROOF_INBOX }) as { inbox_id?: string }
    if (!inbox.inbox_id?.startsWith(`${PROOF_INBOX}@`)) throw new Error('Unexpected proof inbox.')
    return inbox.inbox_id
  },
})
export const mailboxReceipts = internalAction({
  args: { inboxId: v.string() }, returns: v.array(v.object({ subject: v.string(), messageId: v.string(), verificationCode: v.union(v.string(), v.null()), unsubscribeUrl: v.union(v.string(), v.null()) })),
  handler: async (ctx, args): Promise<Array<{ subject: string; messageId: string; verificationCode: string | null; unsubscribeUrl: string | null }>> => {
    requireDevelopment()
    if (!args.inboxId.startsWith(`${PROOF_INBOX}@`)) throw new Error('Only the controlled proof inbox is readable.')
    const result = await agentmail.listThreads(ctx, args.inboxId, { limit: 10 }) as { threads?: Array<{ thread_id: string }> }
    const receipts = []
    for (const thread of result.threads ?? []) {
      const detail = await agentmail.getThread(ctx, args.inboxId, thread.thread_id) as { messages?: Array<{ message_id: string; subject?: string; text?: string }> }
      for (const message of detail.messages ?? []) receipts.push({ subject: message.subject ?? '', messageId: message.message_id, verificationCode: message.text?.match(/verification code is (\d{6})/i)?.[1] ?? null, unsubscribeUrl: message.text?.match(/https:\/\/woozy-wren-227\.convex\.site\/coverage\/unsubscribe\/[A-Za-z0-9_-]+/)?.[0] ?? null })
    }
    return receipts
  },
})
