import { FirecrawlClient } from '@firecrawl/firecrawl-convex'
import type { FirecrawlDocument } from '@firecrawl/firecrawl-convex'
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
import { downloadOfficialPdf } from '../sources/rawArtifact'
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

type ValidatedScrape =
  | {
      ok: true
      metadata: Record<string, unknown>
      retrievedUrl: string
      targetStatusCode: number
      markdown: string
      sourceContentType: string
      warning?: string
    }
  | {
      ok: false
      errorClass: string
      errorDetail: string
      retryable: boolean
    }

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

function validateScrape(
  document: FirecrawlDocument,
  requestedUrl: string,
  officialDomains: string[],
): ValidatedScrape {
  const metadata = (document.metadata ?? {}) as Record<string, unknown>
  const retrievedUrl = canonicalizeUrl(
    typeof metadata.url === 'string'
      ? metadata.url
      : typeof metadata.sourceURL === 'string'
        ? metadata.sourceURL
        : requestedUrl,
  )
  if (!retrievedUrl) {
    return {
      ok: false,
      errorClass: 'invalid_retrieved_url',
      errorDetail: `Firecrawl returned an invalid retrieved URL for ${requestedUrl}`,
      retryable: false,
    }
  }
  if (!isAllowedOfficialHost(retrievedUrl, officialDomains)) {
    return {
      ok: false,
      errorClass: 'redirect_domain_not_allowed',
      errorDetail: `Retrieved URL is outside the registered official domains: ${retrievedUrl}`,
      retryable: false,
    }
  }

  const targetStatusCode =
    typeof metadata.statusCode === 'number' &&
    Number.isInteger(metadata.statusCode)
      ? metadata.statusCode
      : undefined
  if (targetStatusCode === undefined) {
    return {
      ok: false,
      errorClass: 'missing_target_status',
      errorDetail: `Firecrawl returned no valid target HTTP status for ${retrievedUrl}`,
      retryable: true,
    }
  }
  if (targetStatusCode < 200 || targetStatusCode >= 300) {
    return {
      ok: false,
      errorClass: 'target_http_status',
      errorDetail: `Official source returned HTTP ${targetStatusCode}: ${retrievedUrl}`,
      retryable: TRANSIENT_STATUSES.has(targetStatusCode),
    }
  }

  const markdown =
    typeof document.markdown === 'string' ? document.markdown : ''
  if (!markdown.trim()) {
    return {
      ok: false,
      errorClass: 'empty_content',
      errorDetail: `Firecrawl returned no markdown for ${requestedUrl}`,
      retryable: false,
    }
  }

  return {
    ok: true,
    metadata,
    retrievedUrl,
    targetStatusCode,
    markdown,
    sourceContentType:
      typeof metadata.contentType === 'string'
        ? metadata.contentType
        : 'unknown',
    warning:
      typeof document.warning === 'string' ? document.warning : undefined,
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
    let document = await firecrawl.scrape(ctx, url, {
      formats: ['markdown', 'rawHtml'],
      onlyMainContent: false,
    })
    let scraped = validateScrape(document, url, officialDomains)
    if (!scraped.ok) {
      return await failOutcome(
        scraped.errorClass,
        scraped.errorDetail,
        scraped.retryable,
      )
    }
    let creditsUsed =
      typeof scraped.metadata.creditsUsed === 'number'
        ? scraped.metadata.creditsUsed
        : undefined
    let rawBytes: Uint8Array<ArrayBuffer>
    let rawContentType: string
    if (scraped.sourceContentType.toLowerCase().startsWith('application/pdf')) {
      const beforeArtifact = await downloadOfficialPdf(
        scraped.retrievedUrl,
        officialDomains,
      )
      if (!beforeArtifact.ok) {
        return await failOutcome(
          beforeArtifact.errorClass,
          beforeArtifact.errorDetail,
          beforeArtifact.retryable,
        )
      }

      document = await firecrawl.scrape(ctx, scraped.retrievedUrl, {
        formats: ['markdown', 'rawHtml'],
        onlyMainContent: false,
        maxAge: 0,
      })
      const verifiedScrape = validateScrape(
        document,
        scraped.retrievedUrl,
        officialDomains,
      )
      if (!verifiedScrape.ok) {
        return await failOutcome(
          verifiedScrape.errorClass,
          verifiedScrape.errorDetail,
          verifiedScrape.retryable,
        )
      }
      if (
        verifiedScrape.retrievedUrl !== scraped.retrievedUrl ||
        !verifiedScrape.sourceContentType
          .toLowerCase()
          .startsWith('application/pdf')
      ) {
        return await failOutcome(
          'source_changed_during_retrieval',
          `Official PDF changed its resolved URL or content type during retrieval: ${url}`,
          true,
        )
      }

      const afterArtifact = await downloadOfficialPdf(
        verifiedScrape.retrievedUrl,
        officialDomains,
      )
      if (!afterArtifact.ok) {
        return await failOutcome(
          afterArtifact.errorClass,
          afterArtifact.errorDetail,
          afterArtifact.retryable,
        )
      }
      const beforeHash = await sha256HexOfBytes(beforeArtifact.bytes)
      const afterHash = await sha256HexOfBytes(afterArtifact.bytes)
      if (
        beforeHash !== afterHash ||
        beforeArtifact.finalUrl !== afterArtifact.finalUrl ||
        afterArtifact.finalUrl !== verifiedScrape.retrievedUrl ||
        beforeArtifact.contentType !== afterArtifact.contentType
      ) {
        return await failOutcome(
          'source_changed_during_retrieval',
          `Official PDF changed while Firecrawl extracted it: ${url}`,
          true,
        )
      }

      const verificationCredits =
        typeof verifiedScrape.metadata.creditsUsed === 'number'
          ? verifiedScrape.metadata.creditsUsed
          : undefined
      creditsUsed =
        creditsUsed === undefined && verificationCredits === undefined
          ? undefined
          : (creditsUsed ?? 0) + (verificationCredits ?? 0)
      scraped = verifiedScrape
      rawBytes = afterArtifact.bytes
      rawContentType = afterArtifact.contentType
    } else {
      const rawHtml =
        typeof document.rawHtml === 'string' ? document.rawHtml : ''
      if (!rawHtml.trim()) {
        return await failOutcome(
          'missing_raw_artifact',
          `Firecrawl returned no raw HTML for ${url}`,
          true,
        )
      }
      rawBytes = new TextEncoder().encode(rawHtml)
      rawContentType = 'text/html'
    }
    const retrievalTime = Date.now()
    const markdownBytes = new TextEncoder().encode(scraped.markdown)
    const contentHash = await sha256HexOfBytes(rawBytes)
    const normalizedContentHash = await sha256HexOfText(scraped.markdown)
    const idempotencyKey = await retrievalContentKey(
      registryId,
      url,
      contentHash,
    )
    normalizedStorageId = await ctx.storage.store(
      new Blob([markdownBytes], { type: 'text/markdown' }),
    )
    rawStorageId = await ctx.storage.store(
      new Blob([rawBytes], { type: rawContentType }),
    )

    const committed = await ctx.runMutation(
      internal.sources.snapshots.commitRetrieval,
      {
        registryId,
        runId,
        stageId,
        canonicalUrl: url,
        retrievedUrl: scraped.retrievedUrl,
        contentHash,
        normalizedContentHash,
        idempotencyKey,
        contentType: scraped.sourceContentType,
        targetStatusCode: scraped.targetStatusCode,
        retrievalTime,
        normalized: {
          storageId: normalizedStorageId,
          byteLength: markdownBytes.byteLength,
        },
        raw: {
          storageId: rawStorageId,
          contentType: rawContentType,
          byteLength: rawBytes.byteLength,
        },
        truncation: {
          truncated: scraped.warning !== undefined,
          detail: scraped.warning,
        },
        firecrawlMetadata: normalizeFirecrawlMetadata(scraped.metadata),
        creditsUsed,
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
