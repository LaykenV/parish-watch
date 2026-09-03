import { v } from 'convex/values'

import { internalMutation } from '../_generated/server'
import { agentmail, updatesInboxId } from '../follows/agentmailClient'

export const completeAnswer = internalMutation({
  args: {
    eventId: v.id('emailReplyEvents'),
    attempt: v.number(),
    answerMessageId: v.string(),
    kind: v.union(v.literal('answer'), v.literal('not_found')),
    text: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId)
    if (
      !event ||
      event.state !== 'running' ||
      event.attempt !== args.attempt ||
      event.outboundId !== undefined
    ) {
      return null
    }
    const outboundId = await agentmail.replyToMessage(
      ctx,
      updatesInboxId(),
      event.inboundMessageId,
      {
        text: args.text,
        labels: ['public-parish', 'grounded-reply'],
      },
    )
    await ctx.db.patch(event._id, {
      state: args.kind === 'answer' ? 'answered' : 'not_found',
      outboundId,
      answerMessageId: args.answerMessageId,
      errorClass: undefined,
      completedAt: Date.now(),
      updatedAt: Date.now(),
    })
    return null
  },
})
