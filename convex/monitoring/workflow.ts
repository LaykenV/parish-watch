import { v } from 'convex/values'
import { vResultValidator, vWorkflowId } from '@convex-dev/workflow'
import { internal } from '../_generated/api'
import { internalMutation } from '../_generated/server'
import { extractionWorkflowManager } from '../pipeline/workflowManager'

export const checkSources = extractionWorkflowManager.define({
  args: { runId: v.id('sourceMonitoringRuns') }, returns: v.null(),
}).handler(async (step, args): Promise<null> => {
  let documentsChecked = 0
  let targetsStarted = 0
  try {
    const { policy } = await step.runQuery(internal.monitoring.ledger.context, args)
    await step.runMutation(internal.monitoring.ledger.reconcileTargets, { policyId: policy._id })
    await step.runAction(internal.monitoring.actions.discover, args, { retry: false })
    const documents = await step.runQuery(internal.monitoring.ledger.dueDocuments, args)
    for (const document of documents) {
      const retrieval = await step.runAction(internal.operations.ingest.ingestRegistrySource, { registryId: document.registryId, urlOverride: document.canonicalUrl, monitorRunId: args.runId }, { retry: false })
      if (retrieval.outcome === 'failed') throw new Error(retrieval.errorClass)
      const reused = await step.runMutation(internal.monitoring.ledger.setSnapshot, { ...args, documentId: document._id, snapshotId: retrieval.snapshotId })
      if (!reused) {
        const current = await step.runQuery(internal.monitoring.ledger.documentContext, { ...args, documentId: document._id })
        let chunks = current.document.chunkCount ?? 1
        for (let chunk = current.document.completedChunks ?? 0; chunk < chunks; chunk++) {
          const result = await step.runAction(internal.monitoring.actions.inventoryChunk, { ...args, documentId: document._id, chunk }, { retry: false })
          chunks = result.chunks
          await step.runMutation(internal.monitoring.ledger.saveInventory, { ...args, documentId: document._id, chunk, ...result })
        }
      }
      documentsChecked++
    }
    targetsStarted = await step.runMutation(internal.monitoring.ledger.dispatchTargets, args)
    await step.runMutation(internal.monitoring.ledger.finish, { ...args, state: 'completed', documentsChecked, targetsStarted })
  } catch (error) {
    const stopped = String(error).includes('monitoring_stopped')
    await step.runMutation(internal.monitoring.ledger.finish, { ...args, state: stopped ? 'stopped' : 'incomplete', errorClass: stopped ? 'monitoring_stopped' : 'source_check_incomplete', documentsChecked, targetsStarted })
  }
  return null
})
export const completed = internalMutation({
  args: { workflowId: vWorkflowId, result: vResultValidator, context: v.object({ runId: v.id('sourceMonitoringRuns') }) }, returns: v.null(),
  handler: async (ctx, args) => {
    if (args.result.kind !== 'success') await ctx.runMutation(internal.monitoring.ledger.finish, { ...args.context, state: 'failed', errorClass: 'monitoring_workflow_failed', documentsChecked: 0, targetsStarted: 0 })
    return null
  },
})
