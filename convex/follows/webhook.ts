import { httpAction } from '../_generated/server'
import { agentmail } from './agentmailClient'

export const handleAgentMailWebhook = httpAction(async (ctx, request) => {
  return await agentmail.handleWebhook(
    ctx as unknown as Parameters<typeof agentmail.handleWebhook>[0],
    request,
  )
})
