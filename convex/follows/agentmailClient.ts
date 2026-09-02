import { AgentMail } from '@agentmail/convex'

import { components } from '../_generated/api'
import { env } from '../_generated/server'

export const agentmail = new AgentMail(components.agentmail, {
  webhookSecret: env.AGENTMAIL_WEBHOOK_SECRET ?? '',
  retryAttempts: 5,
  initialBackoffMs: 30_000,
})

export function updatesInboxId(): string {
  const inboxId = env.AGENTMAIL_UPDATES_INBOX_ID?.trim()
  if (!inboxId) throw new Error('AGENTMAIL_UPDATES_INBOX_ID is not configured')
  return inboxId
}
