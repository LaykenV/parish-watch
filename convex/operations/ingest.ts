import { FirecrawlClient } from '@firecrawl/firecrawl-convex'
import { ConvexError, v } from 'convex/values'

import { components, internal } from '../_generated/api'
import type { ActionCtx } from '../_generated/server'
import { internalAction } from '../_generated/server'
import type { Id } from '../_generated/dataModel'
import {
  canonicalizeUrl,
  firstSeedUrl,
  isAllowedOfficialHost,
} from '../sources/domains'
import { sha256HexOfBytes, sha256HexOfText } from '../sources/hashing'
import { normalizeFirecrawlMetadata } from '../sources/metadata'
import { cleanupStoredArtifacts } from '../sources/storageCleanup'
import { retrievalContentKey } from '../pipeline/keys'

const firecrawl = new FirecrawlClient(components.firecrawl)

const ingestOutcome = v.union(
  v.object({
    outcome: v.literal('created'),
    snapshotId: v.id('sourceSnapshots'),
    version: v.number(),
  }),
  v.object({
    outcome: v.literal('reused'),
    snapshotId: v.id('sourceSnapshots'),
    version: v.number(),
  }),
  v.object({
    outcome: v.literal('failed'),
    errorClass: v.string(),
    errorDetail: v.string(),
    retryable: v.boolean(),
  }),
)

type IngestOutcome = typeof ingestOutcome.type

const TRANSIENT_STATUSES = new Set([0, 408, 425, 429, 500, 502, 503, 504])

function classifyError(error: unknown): {
  errorClass: string
  errorDetail: string
  retryable: boolean
} {
  if (
    error instanceof ConvexError &&
    typeof error.data === 'object' &&
    error.data !== null
  ) {
    const data = error.data as Record<string, unknown>
    const status = typeof data.status === 'number' ? data.status : null
    const detail =
      typeof data.message === 'string' ? data.message : String(error)
    if (typeof data.code === 'string') {
      if (!data.code.startsWith('firecrawl_')) {
        return {
          errorClass: data.code,
          errorDetail: detail,
          retryable: false,
        }
      }
      return {
        errorClass: `firecrawl:${data.code}`,
        errorDetail: detail,
        retryable:
          data.code === 'firecrawl_request_failed' &&
          status !== null &&
          TRANSIENT_STATUSES.has(status),
      }
    }
  }
  return {
    errorClass: 'unexpected',
    errorDetail: error instanceof Error ? error.message : String(error),
    retryable: true,
  }
}

export const ingestRegistrySource = internalAction({
  args: {
    registryId: v.id('sourceRegistries'),
    urlOverride: v.optional(v.string()),
  },
  returns: ingestOutcome,
  handler: async (ctx, args): Promise<IngestOutcome> => {
    const registry = await ctx.runQuery(internal.sources.registries.get, {
      registryId: args.registryId,
    })
    if (!registry) {
      return {
        outcome: 'failed',
        errorClass: 'config',
        errorDetail: `Unknown registry ${args.registryId}`,
        retryable: false,
      }
    }
    return ingestSeedUrl(
      ctx,
      registry._id,
      registry.officialDomains,
      args.urlOverride ?? firstSeedUrl(registry.seedUrls) ?? '',
    )
  },
})

export const ingestBodySource = internalAction({
  args: {
    bodySlug: v.string(),
    urlOverride: v.optional(v.string()),
  },
  returns: ingestOutcome,
  handler: async (ctx, args): Promise<IngestOutcome> => {
    const resolved = await ctx.runQuery(
      internal.sources.registries.getForBodySlug,
      { bodySlug: args.bodySlug },
    )
    if (!resolved) {
      return {
        outcome: 'failed',
        errorClass: 'config',
        errorDetail: `No source registry for body ${args.bodySlug}`,
        retryable: false,
      }
    }
    return ingestSeedUrl(
      ctx,
      resolved.registry._id,
      resolved.registry.officialDomains,
      args.urlOverride ?? firstSeedUrl(resolved.registry.seedUrls) ?? '',
    )
  },
})

async function ingestSeedUrl(
  ctx: ActionCtx,
  registryId: Id<'sourceRegistries'>,
  officialDomains: string[],
  rawUrl: string,
): Promise<IngestOutcome> {
  const url = canonicalizeUrl(rawUrl)
  if (!url) {
    return {
      outcome: 'failed',
      errorClass: 'config',
      errorDetail: `Invalid seed URL: ${rawUrl}`,
      retryable: false,
    }
  }

  const { runId, stageId } = await ctx.runMutation(
    internal.pipeline.runs.startRetrievalRun,
    { registryId, trigger: 'manual_ingest', url },
  )

  const failOutcome = async (
    errorClass: string,
    errorDetail: string,
    retryable: boolean,
  ): Promise<IngestOutcome> => {
    await ctx.runMutation(internal.pipeline.runs.failRetrievalRun, {
      runId,
      stageId,
      errorClass,
      errorDetail: errorDetail.slice(0, 500),
      retryable,
    })
    return { outcome: 'failed', errorClass, errorDetail, retryable }
  }

  if (!isAllowedOfficialHost(url, officialDomains)) {
    return await failOutcome(
      'domain_not_allowed',
      `URL is outside the registered official domains: ${url}`,
      false,
    )
  }

  let normalizedStorageId: Id<'_storage'> | undefined
  let rawStorageId: Id<'_storage'> | undefined

  try {
    const document = await firecrawl.scrape(ctx, url, {
      formats: ['markdown', 'rawHtml'],
      onlyMainContent: false,
    })

    const metadata = (document.metadata ?? {}) as Record<string, unknown>
    const retrievedUrl = canonicalizeUrl(
      typeof metadata.url === 'string'
        ? metadata.url
        : typeof metadata.sourceURL === 'string'
          ? metadata.sourceURL
          : url,
    )
    if (!retrievedUrl) {
      return await failOutcome(
        'invalid_retrieved_url',
        `Firecrawl returned an invalid retrieved URL for ${url}`,
        false,
      )
    }
    if (!isAllowedOfficialHost(retrievedUrl, officialDomains)) {
      return await failOutcome(
        'redirect_domain_not_allowed',
        `Retrieved URL is outside the registered official domains: ${retrievedUrl}`,
        false,
      )
    }

    const targetStatusCode =
      typeof metadata.statusCode === 'number' &&
      Number.isInteger(metadata.statusCode)
        ? metadata.statusCode
        : undefined
    if (targetStatusCode === undefined) {
      return await failOutcome(
        'missing_target_status',
        `Firecrawl returned no valid target HTTP status for ${retrievedUrl}`,
        true,
      )
    }
    if (targetStatusCode < 200 || targetStatusCode >= 300) {
      return await failOutcome(
        'target_http_status',
        `Official source returned HTTP ${targetStatusCode}: ${retrievedUrl}`,
        TRANSIENT_STATUSES.has(targetStatusCode),
      )
    }

    const markdown =
      typeof document.markdown === 'string' ? document.markdown : ''
    if (!markdown.trim()) {
      return await failOutcome(
        'empty_content',
        `Firecrawl returned no markdown for ${url}`,
        false,
      )
    }

    const rawHtml = typeof document.rawHtml === 'string' ? document.rawHtml : ''
    if (!rawHtml.trim()) {
      return await failOutcome(
        'missing_raw_artifact',
        `Firecrawl returned no raw HTML for ${url}`,
        true,
      )
    }

    const warning =
      typeof document.warning === 'string' ? document.warning : undefined

    const retrievalTime = Date.now()
    const markdownBytes = new TextEncoder().encode(markdown)
    const rawBytes = new TextEncoder().encode(rawHtml)
    const contentHash = await sha256HexOfBytes(rawBytes)
    const normalizedContentHash = await sha256HexOfText(markdown)
    const idempotencyKey = await retrievalContentKey(
      registryId,
      url,
      contentHash,
    )
    normalizedStorageId = await ctx.storage.store(
      new Blob([markdownBytes], { type: 'text/markdown' }),
    )
    rawStorageId = await ctx.storage.store(
      new Blob([rawBytes], { type: 'text/html' }),
    )

    const committed = await ctx.runMutation(
      internal.sources.snapshots.commitRetrieval,
      {
        registryId,
        runId,
        stageId,
        canonicalUrl: url,
        retrievedUrl,
        contentHash,
        normalizedContentHash,
        idempotencyKey,
        contentType:
          typeof metadata.contentType === 'string'
            ? metadata.contentType
            : 'unknown',
        targetStatusCode,
        retrievalTime,
        normalized: {
          storageId: normalizedStorageId,
          byteLength: markdownBytes.byteLength,
        },
        raw: {
          storageId: rawStorageId,
          contentType: 'text/html',
          byteLength: rawBytes.byteLength,
        },
        truncation: { truncated: warning !== undefined, detail: warning },
        firecrawlMetadata: normalizeFirecrawlMetadata(metadata),
        creditsUsed:
          typeof metadata.creditsUsed === 'number'
            ? metadata.creditsUsed
            : undefined,
      },
    )

    return committed.reused
      ? {
          outcome: 'reused',
          snapshotId: committed.snapshotId,
          version: committed.version,
        }
      : {
          outcome: 'created',
          snapshotId: committed.snapshotId,
          version: committed.version,
        }
  } catch (error) {
    const classified = classifyError(error)
    const cleanupFailures = await cleanupStoredArtifacts(
      [normalizedStorageId, rawStorageId].filter(
        (storageId): storageId is Id<'_storage'> => storageId !== undefined,
      ),
      async (storageId) => await ctx.storage.delete(storageId),
    )
    const errorDetail =
      cleanupFailures.length === 0
        ? classified.errorDetail
        : `${classified.errorDetail}; storage cleanup failed ${cleanupFailures.length} time(s)`
    return await failOutcome(
      classified.errorClass,
      errorDetail,
      classified.retryable,
    )
  }
}
