'use node'

import { v } from 'convex/values'

import { api, internal } from '../_generated/api'
import { internalAction } from '../_generated/server'
import type { AskAnswerResult } from '../ask/contracts'
import { deriveEmailReplyToken } from '../follows/secrets'

export const prepareInbound = internalAction({
  args: {
    eventId: v.id('emailReplyEvents'),
    question: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const preparation = await ctx.runQuery(
      internal.emailReplies.intake.getPreparation,
      { eventId: args.eventId },
    )
    if (preparation.kind === 'skip') return null
    if (preparation.kind === 'wait') {
      await ctx.runMutation(internal.emailReplies.intake.retryPreparation, {
        ...args,
        errorClass: 'thread_preparation_in_progress',
      })
      return null
    }
    try {
      const token = await deriveEmailReplyToken(preparation.agentmailThreadId)
      const session = await ctx.runMutation(api.ask.threads.createSession, {
        token,
      })
      let askThreadId = preparation.askThreadId
      if (!askThreadId) {
        if (!preparation.ownsPreparation) {
          throw new Error('thread_preparation_in_progress')
        }
        const created = await ctx.runMutation(api.ask.threads.createThread, {
          token,
          scope: preparation.scope,
        })
        const attached = await ctx.runMutation(
          internal.emailReplies.intake.attachAskThread,
          {
            eventId: args.eventId,
            askThreadId: created.threadId,
            askExpiresAt: session.expiresAt,
          },
        )
        if (!attached) throw new Error('thread_preparation_lost')
        askThreadId = created.threadId
      }
      const receipt = await ctx.runMutation(api.ask.threads.appendQuestion, {
        token,
        threadId: askThreadId,
        question: args.question,
        idempotencyKey: `email-reply-${args.eventId}`,
      })
      await ctx.runMutation(internal.emailReplies.intake.completePreparation, {
        eventId: args.eventId,
        askThreadId,
        questionMessageId: receipt.messageId,
      })
    } catch (error) {
      await ctx.runMutation(internal.emailReplies.intake.retryPreparation, {
        ...args,
        errorClass: classifyError(error),
      })
    }
    return null
  },
})

export const answerInbound = internalAction({
  args: { eventId: v.id('emailReplyEvents') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const claim = await ctx.runMutation(
      internal.emailReplies.intake.claimAnswer,
      args,
    )
    if (claim.kind === 'skip') return null
    try {
      const answer: AskAnswerResult = await ctx.runAction(
        api.ask.answer.answerQuestion,
        {
          token: await deriveEmailReplyToken(claim.agentmailThreadId),
          threadId: claim.askThreadId,
          questionMessageId: claim.questionMessageId,
        },
      )
      await ctx.runMutation(internal.emailReplies.delivery.completeAnswer, {
        eventId: args.eventId,
        attempt: claim.attempt,
        answerMessageId: answer.messageId,
        kind: answer.kind,
        text: formatEmailReply(answer, claim.officialContactUrl),
      })
    } catch (error) {
      await ctx.runMutation(internal.emailReplies.intake.failAnswer, {
        eventId: args.eventId,
        attempt: claim.attempt,
        errorClass: classifyError(error),
      })
    }
    return null
  },
})

export function formatEmailReply(
  answer: AskAnswerResult,
  officialContactUrl?: string,
): string {
  const lines = [answer.answer.trim()]
  if (answer.kind === 'answer' && answer.citations.length > 0) {
    lines.push('', 'Cited evidence')
    const seen = new Set<string>()
    for (const citation of answer.citations) {
      if (seen.has(citation.sourceHref)) continue
      seen.add(citation.sourceHref)
      lines.push(`- ${citation.documentTitle}: ${citation.sourceHref}`)
    }
  }
  if (answer.kind === 'not_found') {
    lines.push(
      '',
      officialContactUrl
        ? `Official government site: ${officialContactUrl}`
        : 'Check the official source links in the alert above, or contact the government body that published them.',
    )
  }
  lines.push(
    '',
    'Public Parish answers only from published, checked evidence. Reply with another question about this alert to continue.',
  )
  return lines.join('\n')
}

function classifyError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message.slice(0, 100)
  }
  return 'answer_failed'
}
