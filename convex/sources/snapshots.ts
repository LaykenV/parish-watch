import { ConvexError, v } from 'convex/values'

import { internalMutation, internalQuery } from '../_generated/server'
import { recordSourceSnapshotChange } from '../changes/source'
import schema from '../schema'
import { firecrawlMetadataValue } from './metadata'

const pageMapEntry = v.object({
  page: v.number(),
  startOffset: v.number(),
  endOffset: v.number(),
})

const commitArgs = {
  registryId: v.id('sourceRegistries'),
  runId: v.id('pipelineRuns'),
  stageId: v.id('pipelineStages'),
  canonicalUrl: v.string(),
  retrievedUrl: v.string(),
  contentHash: v.string(),
  normalizedContentHash: v.string(),
  idempotencyKey: v.string(),
  contentType: v.string(),
  targetStatusCode: v.optional(v.number()),
  retrievalTime: v.number(),
  normalized: v.object({
    storageId: v.id('_storage'),
    byteLength: v.number(),
  }),
  raw: v.object({
    storageId: v.id('_storage'),
    contentType: v.string(),
    byteLength: v.number(),
  }),
  pageMap: v.optional(v.array(pageMapEntry)),
  truncation: v.object({
    truncated: v.boolean(),
    detail: v.optional(v.string()),
  }),
  firecrawlMetadata: v.record(v.string(), firecrawlMetadataValue),
  creditsUsed: v.optional(v.number()),
}

const commitReturns = v.object({
  snapshotId: v.id('sourceSnapshots'),
  version: v.number(),
  reused: v.boolean(),
})

export const commitRetrieval = internalMutation({
  args: commitArgs,
  returns: commitReturns,
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId)
    const stage = await ctx.db.get(args.stageId)
    if (
      !run ||
      run.registryId !== args.registryId ||
      !stage ||
      stage.runId !== args.runId ||
      stage.inputUrl !== args.canonicalUrl
    ) {
      throw new ConvexError({
        code: 'pipeline_invariant',
        message: 'Retrieval run, stage, registry, and source URL must agree',
      })
    }

    const priorStage = await ctx.db
      .query('pipelineStages')
      .withIndex('by_idempotency_key', (q) =>
        q.eq('idempotencyKey', args.idempotencyKey),
      )
      .order('desc')
      .first()

    const priorStageSnapshot = priorStage?.outputSnapshotId
      ? await ctx.db.get(priorStage.outputSnapshotId)
      : null
    if (
      priorStageSnapshot &&
      (priorStageSnapshot.registryId !== args.registryId ||
        priorStageSnapshot.canonicalUrl !== args.canonicalUrl ||
        priorStageSnapshot.contentHash !== args.contentHash)
    ) {
      throw new ConvexError({
        code: 'idempotency_collision',
        message: 'Retrieval idempotency key resolved to a different source',
      })
    }

    const indexedSnapshot = await ctx.db
      .query('sourceSnapshots')
      .withIndex('by_registry_and_canonical_url_and_content_hash', (q) =>
        q
          .eq('registryId', args.registryId)
          .eq('canonicalUrl', args.canonicalUrl)
          .eq('contentHash', args.contentHash),
      )
      .order('desc')
      .first()

    const previous = await ctx.db
      .query('sourceSnapshots')
      .withIndex('by_registry_and_canonical_url_and_version', (q) =>
        q
          .eq('registryId', args.registryId)
          .eq('canonicalUrl', args.canonicalUrl),
      )
      .order('desc')
      .first()
    const existing =
      previous?.contentHash === args.contentHash &&
      previous.normalizedContentHash === args.normalizedContentHash &&
      previous.truncation.truncated === args.truncation.truncated &&
      previous.truncation.detail === args.truncation.detail
        ? previous
        : null

    if (existing && indexedSnapshot?._id !== existing._id) {
      throw new ConvexError({
        code: 'snapshot_index_invariant',
        message: 'Latest source snapshot disagrees with the content hash index',
      })
    }

    const now = Date.now()

    if (existing) {
      const snapshot = existing
      await ctx.storage.delete(args.normalized.storageId)
      await ctx.storage.delete(args.raw.storageId)
      await ctx.db.patch(args.stageId, {
        idempotencyKey: args.idempotencyKey,
        state: 'succeeded',
        completedAt: now,
        outputSnapshotId: snapshot._id,
        creditsUsed: args.creditsUsed,
        retrievedUrl: args.retrievedUrl,
        targetStatusCode: args.targetStatusCode,
        outputContentHash: args.contentHash,
        normalizedContentHash: args.normalizedContentHash,
      })
      await ctx.db.patch(args.runId, {
        state: 'succeeded',
        completedAt: now,
        snapshotId: snapshot._id,
      })
      await ctx.db.patch(args.registryId, {
        lastDiscoveryAt: now,
        lastHealthyAt: now,
      })
      return {
        snapshotId: snapshot._id,
        version: snapshot.version,
        reused: true,
      }
    }

    const version = (previous?.version ?? 0) + 1

    const snapshotId = await ctx.db.insert('sourceSnapshots', {
      registryId: args.registryId,
      canonicalUrl: args.canonicalUrl,
      retrievedUrl: args.retrievedUrl,
      contentHash: args.contentHash,
      contentHashBasis: 'raw_artifact_v2',
      normalizedContentHash: args.normalizedContentHash,
      contentType: args.contentType,
      retrievalTime: args.retrievalTime,
      version,
      previousSnapshotId: previous?._id,
      normalizedStorageId: args.normalized.storageId,
      normalizedContentType: 'text/markdown',
      normalizedByteLength: args.normalized.byteLength,
      rawStorageId: args.raw.storageId,
      rawContentType: args.raw.contentType,
      rawByteLength: args.raw.byteLength,
      pageMap: args.pageMap,
      truncation: args.truncation,
      firecrawlMetadata: args.firecrawlMetadata,
    })

    if (previous) {
      await recordSourceSnapshotChange(ctx, {
        registryId: args.registryId,
        canonicalUrl: args.canonicalUrl,
        previousSnapshotId: previous._id,
        currentSnapshotId: snapshotId,
        previousContentHashBasis: previous.contentHashBasis,
        previousContentHash: previous.contentHash,
        currentContentHash: args.contentHash,
        previousNormalizedContentHash: previous.normalizedContentHash,
        currentNormalizedContentHash: args.normalizedContentHash,
        previousTruncated: previous.truncation.truncated,
        createdAt: now,
      })
    }

    await ctx.db.patch(args.stageId, {
      idempotencyKey: args.idempotencyKey,
      state: 'succeeded',
      completedAt: now,
      outputSnapshotId: snapshotId,
      creditsUsed: args.creditsUsed,
      retrievedUrl: args.retrievedUrl,
      targetStatusCode: args.targetStatusCode,
      outputContentHash: args.contentHash,
      normalizedContentHash: args.normalizedContentHash,
    })
    await ctx.db.patch(args.runId, {
      state: 'succeeded',
      completedAt: now,
      snapshotId,
    })
    await ctx.db.patch(args.registryId, {
      lastDiscoveryAt: now,
      lastHealthyAt: now,
    })

    return { snapshotId, version, reused: false }
  },
})

export const getLatestForRegistry = internalQuery({
  args: { registryId: v.id('sourceRegistries') },
  returns: v.union(v.null(), schema.doc('sourceSnapshots')),
  handler: async (ctx, args) => {
    const latest = await ctx.db
      .query('sourceSnapshots')
      .withIndex('by_registry_and_retrieval_time', (q) =>
        q.eq('registryId', args.registryId),
      )
      .order('desc')
      .first()
    return latest
  },
})

export const get = internalQuery({
  args: { snapshotId: v.id('sourceSnapshots') },
  returns: v.union(v.null(), schema.doc('sourceSnapshots')),
  handler: async (ctx, args) => await ctx.db.get(args.snapshotId),
})

export const getLatestForSource = internalQuery({
  args: {
    registryId: v.id('sourceRegistries'),
    canonicalUrl: v.string(),
  },
  returns: v.union(v.null(), schema.doc('sourceSnapshots')),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('sourceSnapshots')
      .withIndex('by_registry_and_canonical_url_and_version', (q) =>
        q
          .eq('registryId', args.registryId)
          .eq('canonicalUrl', args.canonicalUrl),
      )
      .order('desc')
      .first()
  },
})

export const listForRegistry = internalQuery({
  args: { registryId: v.id('sourceRegistries') },
  returns: v.array(schema.doc('sourceSnapshots')),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('sourceSnapshots')
      .withIndex('by_registry_and_retrieval_time', (q) =>
        q.eq('registryId', args.registryId),
      )
      .order('desc')
      .take(50)
  },
})

export const listForSource = internalQuery({
  args: {
    registryId: v.id('sourceRegistries'),
    canonicalUrl: v.string(),
  },
  returns: v.array(schema.doc('sourceSnapshots')),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('sourceSnapshots')
      .withIndex('by_registry_and_canonical_url_and_version', (q) =>
        q
          .eq('registryId', args.registryId)
          .eq('canonicalUrl', args.canonicalUrl),
      )
      .order('desc')
      .take(50)
  },
})
