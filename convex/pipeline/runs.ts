import { v } from 'convex/values'

import { internalMutation, internalQuery } from '../_generated/server'
import schema from '../schema'
import { retrievalAttemptKey } from './keys'
import {
  RETRIEVAL_PROCESSOR_VERSION,
  RETRIEVAL_RETRY_DELAY_MS,
  runTriggers,
} from './state'

export const startRetrievalRun = internalMutation({
  args: {
    registryId: v.id('sourceRegistries'),
    trigger: runTriggers,
    url: v.string(),
  },
  returns: v.object({
    runId: v.id('pipelineRuns'),
    stageId: v.id('pipelineStages'),
  }),
  handler: async (ctx, args) => {
    const startedAt = Date.now()
    const runId = await ctx.db.insert('pipelineRuns', {
      registryId: args.registryId,
      trigger: args.trigger,
      state: 'running',
      processorVersion: RETRIEVAL_PROCESSOR_VERSION,
      startedAt,
    })
    const stageId = await ctx.db.insert('pipelineStages', {
      runId,
      stage: 'retrieve',
      idempotencyKey: await retrievalAttemptKey(args.registryId, args.url),
      state: 'running',
      attempt: 1,
      inputUrl: args.url,
      startedAt,
    })
    return { runId, stageId }
  },
})

export const failRetrievalRun = internalMutation({
  args: {
    runId: v.id('pipelineRuns'),
    stageId: v.id('pipelineStages'),
    errorClass: v.string(),
    errorDetail: v.string(),
    retryable: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const completedAt = Date.now()
    const state = args.retryable ? 'failed_retryable' : 'failed_terminal'
    await ctx.db.patch(args.stageId, {
      state,
      errorClass: args.errorClass,
      errorDetail: args.errorDetail,
      retryAt: args.retryable
        ? completedAt + RETRIEVAL_RETRY_DELAY_MS
        : undefined,
      completedAt,
    })
    await ctx.db.patch(args.runId, { state, completedAt })
    return null
  },
})

export const listForRegistry = internalQuery({
  args: { registryId: v.id('sourceRegistries') },
  returns: v.array(schema.doc('pipelineRuns')),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('pipelineRuns')
      .withIndex('by_registry_and_started_time', (q) =>
        q.eq('registryId', args.registryId),
      )
      .order('desc')
      .take(20)
  },
})

export const listForRun = internalQuery({
  args: { runId: v.id('pipelineRuns') },
  returns: v.array(schema.doc('pipelineStages')),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('pipelineStages')
      .withIndex('by_run_and_stage', (q) => q.eq('runId', args.runId))
      .take(20)
  },
})
