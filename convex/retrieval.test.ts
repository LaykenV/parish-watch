/// <reference types="vite/client" />

import firecrawlTest from '@firecrawl/firecrawl-convex/test'
import { convexTest } from 'convex-test'
import { afterEach, expect, test, vi } from 'vitest'

import { internal } from './_generated/api'
import schema from './schema'
import { sha256HexOfText } from './sources/hashing'

const modules = import.meta.glob('./**/*.ts')

const HUB_URL =
  'https://www.lafayettela.gov/your-government/city-and-parish-councils/'
const ALT_URL = 'https://apps.lafayettela.gov/obcouncil/index.html'
const PDF_URL = 'https://apps.lafayettela.gov/obcouncil/api/Document/2553291/'

const MD_1 =
  '# Lafayette City and Parish Councils\n\nRegular meetings occur on the first and third Tuesday of each month.'
const RAW_1 =
  '<html><body><h1>Lafayette City and Parish Councils</h1><p>Regular meetings occur on the first and third Tuesday of each month.</p></body></html>'
const MD_2 = `${MD_1}\n\nThe agenda for the September 1, 2026 regular meeting is now posted.`
const RAW_2 =
  '<html><body><h1>Lafayette City and Parish Councils</h1><p>Agenda for September 1, 2026 posted.</p></body></html>'
const RAW_1_FORMATTING_CHANGE = `<html>
  <body><h1>Lafayette City and Parish Councils</h1><p>Regular meetings occur on the first and third Tuesday of each month.</p></body>
</html>`

function initTest() {
  vi.stubEnv('FIRECRAWL_API_KEY', 'fc-test-key')
  const t = convexTest(schema, modules)
  firecrawlTest.register(t)
  return t
}

function stubScrape(
  markdown: string,
  rawHtml: string | undefined,
  metadataOverrides: Record<string, unknown> = {},
) {
  const fetchMock = vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          success: true,
          data: {
            markdown,
            rawHtml,
            metadata: {
              sourceURL: HUB_URL,
              url: HUB_URL,
              statusCode: 200,
              contentType: 'text/html; charset=utf-8',
              creditsUsed: 1,
              ...metadataOverrides,
            },
          },
        }),
        { status: 200 },
      ),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function snapshotIdOf(result: {
  outcome: string
  snapshotId?: string
}): string {
  if (result.outcome === 'failed' || !result.snapshotId) {
    throw new Error(`Expected a snapshot, got ${result.outcome}`)
  }
  return result.snapshotId
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

test('first retrieval creates an immutable snapshot with run and stage records', async () => {
  const t = initTest()
  stubScrape(MD_1, RAW_1)
  const { registryId } = await t.mutation(
    internal.operations.seed.seedLaunchCoverage,
    {},
  )

  const result = await t.action(
    internal.operations.ingest.ingestRegistrySource,
    { registryId },
  )

  expect(result).toMatchObject({ outcome: 'created', version: 1 })

  const snapshot = await t.query(
    internal.sources.snapshots.getLatestForSource,
    {
      registryId,
      canonicalUrl: HUB_URL,
    },
  )
  expect(snapshot).toMatchObject({
    version: 1,
    canonicalUrl: HUB_URL,
    retrievedUrl: HUB_URL,
    normalizedContentType: 'text/markdown',
    rawContentType: 'text/html',
    contentHashBasis: 'raw_artifact_v2',
    truncation: { truncated: false },
    firecrawlMetadata: { statusCode: 200, creditsUsed: 1 },
  })
  expect(snapshot?.previousSnapshotId).toBeUndefined()
  expect(snapshot?.normalizedByteLength).toBe(MD_1.length)
  expect(snapshot?.rawByteLength).toBe(RAW_1.length)
  expect(snapshot?.contentHash).not.toBe(snapshot?.normalizedContentHash)
  expect(snapshot?.normalizedContentHash).toBe(await sha256HexOfText(MD_1))

  const runs = await t.query(internal.pipeline.runs.listForRegistry, {
    registryId,
  })
  const stages = await t.query(internal.pipeline.runs.listForRun, {
    runId: runs[0]._id,
  })
  expect(stages).toHaveLength(1)
  expect(stages[0]).toMatchObject({
    state: 'succeeded',
    retrievedUrl: HUB_URL,
    targetStatusCode: 200,
    outputContentHash: snapshot?.contentHash,
    normalizedContentHash: snapshot?.normalizedContentHash,
  })
  expect(stages[0].idempotencyKey).toMatch(/^retrieve:v2:/)
})

test('repeat retrieval of unchanged content reuses the existing snapshot', async () => {
  const t = initTest()
  stubScrape(MD_1, RAW_1)
  const { registryId } = await t.mutation(
    internal.operations.seed.seedLaunchCoverage,
    {},
  )

  const first = await t.action(
    internal.operations.ingest.ingestRegistrySource,
    { registryId },
  )
  const second = await t.action(
    internal.operations.ingest.ingestRegistrySource,
    { registryId },
  )

  expect(second).toMatchObject({
    outcome: 'reused',
    snapshotId: snapshotIdOf(first),
    version: 1,
  })

  const snapshots = await t.query(internal.sources.snapshots.listForRegistry, {
    registryId,
  })
  expect(snapshots).toHaveLength(1)

  const runs = await t.query(internal.pipeline.runs.listForRegistry, {
    registryId,
  })
  const stageKeys = await Promise.all(
    runs.map(async (run) => {
      const stages = await t.query(internal.pipeline.runs.listForRun, {
        runId: run._id,
      })
      return stages[0].idempotencyKey
    }),
  )
  expect(new Set(stageKeys)).toEqual(new Set([stageKeys[0]]))

  const storageCount = await t.run(async (ctx) => {
    let count = 0
    for await (const _file of ctx.db.system.query('_storage')) {
      count += 1
    }
    return count
  })
  expect(storageCount).toBe(2)
})

test('changed content creates a new immutable version linked to the previous snapshot', async () => {
  const t = initTest()
  stubScrape(MD_1, RAW_1)
  const { registryId } = await t.mutation(
    internal.operations.seed.seedLaunchCoverage,
    {},
  )
  const first = await t.action(
    internal.operations.ingest.ingestRegistrySource,
    { registryId },
  )
  const firstId = snapshotIdOf(first)

  stubScrape(MD_2, RAW_2)
  const second = await t.action(
    internal.operations.ingest.ingestRegistrySource,
    { registryId },
  )

  expect(second).toMatchObject({ outcome: 'created', version: 2 })

  const snapshots = await t.query(internal.sources.snapshots.listForRegistry, {
    registryId,
  })
  expect(snapshots).toHaveLength(2)

  const latest = await t.query(internal.sources.snapshots.getLatestForSource, {
    registryId,
    canonicalUrl: HUB_URL,
  })
  expect(latest?.previousSnapshotId).toBe(firstId)
  expect(latest?.contentHash).not.toBe(
    snapshots.find((s) => s._id === firstId)?.contentHash,
  )
})

test('content reverting to an older hash creates a new head in the version chain', async () => {
  const t = initTest()
  stubScrape(MD_1, RAW_1)
  const { registryId } = await t.mutation(
    internal.operations.seed.seedLaunchCoverage,
    {},
  )
  const first = await t.action(
    internal.operations.ingest.ingestRegistrySource,
    { registryId },
  )

  stubScrape(MD_2, RAW_2)
  const second = await t.action(
    internal.operations.ingest.ingestRegistrySource,
    { registryId },
  )

  stubScrape(MD_1, RAW_1)
  const reverted = await t.action(
    internal.operations.ingest.ingestRegistrySource,
    { registryId },
  )

  expect(reverted).toMatchObject({ outcome: 'created', version: 3 })
  expect(snapshotIdOf(reverted)).not.toBe(snapshotIdOf(first))

  const latest = await t.query(internal.sources.snapshots.getLatestForSource, {
    registryId,
    canonicalUrl: HUB_URL,
  })
  expect(latest).toMatchObject({
    _id: snapshotIdOf(reverted),
    previousSnapshotId: snapshotIdOf(second),
    version: 3,
  })

  const repeated = await t.action(
    internal.operations.ingest.ingestRegistrySource,
    { registryId },
  )
  expect(repeated).toMatchObject({
    outcome: 'reused',
    snapshotId: snapshotIdOf(reverted),
    version: 3,
  })

  const snapshots = await t.query(internal.sources.snapshots.listForSource, {
    registryId,
    canonicalUrl: HUB_URL,
  })
  expect(snapshots).toHaveLength(3)
})

test('version order keeps the chain head stable when retrieval timestamps arrive out of order', async () => {
  const t = initTest()
  const now = vi.spyOn(Date, 'now')
  now.mockReturnValue(2_000)
  stubScrape(MD_1, RAW_1)
  const { registryId } = await t.mutation(
    internal.operations.seed.seedLaunchCoverage,
    {},
  )
  const first = await t.action(
    internal.operations.ingest.ingestRegistrySource,
    { registryId },
  )

  now.mockReturnValue(1_000)
  stubScrape(MD_2, RAW_2)
  const second = await t.action(
    internal.operations.ingest.ingestRegistrySource,
    { registryId },
  )
  now.mockRestore()

  expect(second).toMatchObject({ outcome: 'created', version: 2 })
  const latest = await t.query(internal.sources.snapshots.getLatestForSource, {
    registryId,
    canonicalUrl: HUB_URL,
  })
  expect(latest).toMatchObject({
    _id: snapshotIdOf(second),
    previousSnapshotId: snapshotIdOf(first),
    retrievalTime: 1_000,
    version: 2,
  })

  const snapshots = await t.query(internal.sources.snapshots.listForSource, {
    registryId,
    canonicalUrl: HUB_URL,
  })
  expect(snapshots.map((snapshot) => snapshot.version)).toEqual([2, 1])
})

test('a raw artifact change creates a new version even when normalized markdown is unchanged', async () => {
  const t = initTest()
  stubScrape(MD_1, RAW_1)
  const { registryId } = await t.mutation(
    internal.operations.seed.seedLaunchCoverage,
    {},
  )
  const first = await t.action(
    internal.operations.ingest.ingestRegistrySource,
    { registryId },
  )

  stubScrape(MD_1, RAW_1_FORMATTING_CHANGE)
  const second = await t.action(
    internal.operations.ingest.ingestRegistrySource,
    { registryId },
  )

  expect(second).toMatchObject({ outcome: 'created', version: 2 })
  const snapshots = await t.query(internal.sources.snapshots.listForSource, {
    registryId,
    canonicalUrl: HUB_URL,
  })
  expect(snapshots).toHaveLength(2)
  expect(snapshots[0].previousSnapshotId).toBe(snapshotIdOf(first))
  expect(snapshots[0].contentHash).not.toBe(snapshots[1].contentHash)
  expect(snapshots[0].normalizedContentHash).toBe(
    snapshots[1].normalizedContentHash,
  )
})

test('different source urls keep separate version chains even when their content hashes match', async () => {
  const t = initTest()
  stubScrape(MD_1, RAW_1)
  const { registryId } = await t.mutation(
    internal.operations.seed.seedLaunchCoverage,
    {},
  )
  const hubFirst = await t.action(
    internal.operations.ingest.ingestRegistrySource,
    { registryId },
  )

  stubScrape(MD_1, RAW_1, { sourceURL: ALT_URL, url: ALT_URL })
  const alternate = await t.action(
    internal.operations.ingest.ingestRegistrySource,
    { registryId, urlOverride: ALT_URL },
  )

  expect(alternate).toMatchObject({ outcome: 'created', version: 1 })
  expect(snapshotIdOf(alternate)).not.toBe(snapshotIdOf(hubFirst))

  stubScrape(MD_2, RAW_2)
  const hubSecond = await t.action(
    internal.operations.ingest.ingestRegistrySource,
    { registryId },
  )
  expect(hubSecond).toMatchObject({ outcome: 'created', version: 2 })

  const hubSnapshots = await t.query(internal.sources.snapshots.listForSource, {
    registryId,
    canonicalUrl: HUB_URL,
  })
  const alternateSnapshots = await t.query(
    internal.sources.snapshots.listForSource,
    { registryId, canonicalUrl: ALT_URL },
  )
  expect(hubSnapshots).toHaveLength(2)
  expect(hubSnapshots[0].previousSnapshotId).toBe(snapshotIdOf(hubFirst))
  expect(alternateSnapshots).toHaveLength(1)
  expect(alternateSnapshots[0].previousSnapshotId).toBeUndefined()
})

test('a url outside the official domains is rejected before any retrieval', async () => {
  const t = initTest()
  const fetchMock = stubScrape(MD_1, RAW_1)
  const { registryId } = await t.mutation(
    internal.operations.seed.seedLaunchCoverage,
    {},
  )

  const result = await t.action(
    internal.operations.ingest.ingestRegistrySource,
    {
      registryId,
      urlOverride: 'https://example.com/agenda.html',
    },
  )

  expect(result).toMatchObject({
    outcome: 'failed',
    errorClass: 'domain_not_allowed',
    retryable: false,
  })
  expect(fetchMock).not.toHaveBeenCalled()

  const snapshots = await t.query(internal.sources.snapshots.listForRegistry, {
    registryId,
  })
  expect(snapshots).toHaveLength(0)
})

test('a redirect outside the official domains is rejected after retrieval', async () => {
  const t = initTest()
  const fetchMock = stubScrape(MD_1, RAW_1, {
    url: 'https://attacker.example/council-copy',
  })
  const { registryId } = await t.mutation(
    internal.operations.seed.seedLaunchCoverage,
    {},
  )

  const result = await t.action(
    internal.operations.ingest.ingestRegistrySource,
    { registryId },
  )

  expect(result).toMatchObject({
    outcome: 'failed',
    errorClass: 'redirect_domain_not_allowed',
    retryable: false,
  })
  expect(fetchMock).toHaveBeenCalledTimes(1)
  const snapshots = await t.query(internal.sources.snapshots.listForRegistry, {
    registryId,
  })
  expect(snapshots).toHaveLength(0)
})

test('an unsuccessful target status is not recorded as a healthy snapshot', async () => {
  const t = initTest()
  stubScrape('# Not found', '<html><body>Not found</body></html>', {
    statusCode: 404,
  })
  const { registryId } = await t.mutation(
    internal.operations.seed.seedLaunchCoverage,
    {},
  )

  const result = await t.action(
    internal.operations.ingest.ingestRegistrySource,
    { registryId },
  )

  expect(result).toMatchObject({
    outcome: 'failed',
    errorClass: 'target_http_status',
    retryable: false,
  })
  const runs = await t.query(internal.pipeline.runs.listForRegistry, {
    registryId,
  })
  expect(runs[0].state).toBe('failed_terminal')
  const snapshots = await t.query(internal.sources.snapshots.listForRegistry, {
    registryId,
  })
  expect(snapshots).toHaveLength(0)
})

test('a missing target status fails closed without creating a snapshot', async () => {
  const t = initTest()
  stubScrape(MD_1, RAW_1, { statusCode: undefined })
  const { registryId } = await t.mutation(
    internal.operations.seed.seedLaunchCoverage,
    {},
  )

  const result = await t.action(
    internal.operations.ingest.ingestRegistrySource,
    { registryId },
  )

  expect(result).toMatchObject({
    outcome: 'failed',
    errorClass: 'missing_target_status',
    retryable: true,
  })
  const runs = await t.query(internal.pipeline.runs.listForRegistry, {
    registryId,
  })
  expect(runs[0].state).toBe('failed_retryable')
  const snapshots = await t.query(internal.sources.snapshots.listForRegistry, {
    registryId,
  })
  expect(snapshots).toHaveLength(0)
})

test('missing raw html fails instead of mislabeling markdown as the raw artifact', async () => {
  const t = initTest()
  stubScrape(MD_1, undefined)
  const { registryId } = await t.mutation(
    internal.operations.seed.seedLaunchCoverage,
    {},
  )

  const result = await t.action(
    internal.operations.ingest.ingestRegistrySource,
    { registryId },
  )

  expect(result).toMatchObject({
    outcome: 'failed',
    errorClass: 'missing_raw_artifact',
    retryable: true,
  })
  const snapshots = await t.query(internal.sources.snapshots.listForRegistry, {
    registryId,
  })
  expect(snapshots).toHaveLength(0)
})

test('a PDF stores the official source bytes alongside Firecrawl markdown', async () => {
  const t = initTest()
  const pdfBytes = new TextEncoder().encode('%PDF-1.7 official agenda bytes')
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const requestUrl =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url
    if (requestUrl === PDF_URL) {
      const response = new Response(pdfBytes, {
        status: 200,
        headers: { 'content-type': 'application/pdf' },
      })
      Object.defineProperty(response, 'url', { value: PDF_URL })
      return response
    }
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          markdown: '# Regular meeting agenda',
          rawHtml: '<html><body>Firecrawl PDF rendering</body></html>',
          metadata: {
            sourceURL: PDF_URL,
            url: PDF_URL,
            statusCode: 200,
            contentType: 'application/pdf',
            creditsUsed: 2,
          },
        },
      }),
      { status: 200 },
    )
  })
  vi.stubGlobal('fetch', fetchMock)
  const { registryId } = await t.mutation(
    internal.operations.seed.seedLaunchCoverage,
    {},
  )

  const result = await t.action(
    internal.operations.ingest.ingestRegistrySource,
    { registryId, urlOverride: PDF_URL },
  )

  expect(result).toMatchObject({ outcome: 'created', version: 1 })
  const snapshot = await t.query(
    internal.sources.snapshots.getLatestForSource,
    { registryId, canonicalUrl: PDF_URL },
  )
  expect(snapshot).toMatchObject({
    contentType: 'application/pdf',
    rawContentType: 'application/pdf',
    rawByteLength: pdfBytes.byteLength,
    normalizedContentType: 'text/markdown',
  })
  expect(snapshot?.contentHash).toBe(
    await sha256HexOfText('%PDF-1.7 official agenda bytes'),
  )
  expect(fetchMock).toHaveBeenCalledTimes(4)
})

test('a PDF that changes during extraction creates no mixed snapshot', async () => {
  const t = initTest()
  const firstPdf = new TextEncoder().encode('%PDF-1.7 first version')
  const secondPdf = new TextEncoder().encode('%PDF-1.7 revised version')
  let rawDownloadCount = 0
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const requestUrl =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url
      if (requestUrl === PDF_URL) {
        const bytes = rawDownloadCount === 0 ? firstPdf : secondPdf
        rawDownloadCount += 1
        const response = new Response(bytes, {
          status: 200,
          headers: { 'content-type': 'application/pdf' },
        })
        Object.defineProperty(response, 'url', { value: PDF_URL })
        return response
      }
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            markdown: '# Regular meeting agenda',
            metadata: {
              sourceURL: PDF_URL,
              url: PDF_URL,
              statusCode: 200,
              contentType: 'application/pdf',
              creditsUsed: 2,
            },
          },
        }),
        { status: 200 },
      )
    }),
  )
  const { registryId } = await t.mutation(
    internal.operations.seed.seedLaunchCoverage,
    {},
  )

  const result = await t.action(
    internal.operations.ingest.ingestRegistrySource,
    { registryId, urlOverride: PDF_URL },
  )

  expect(result).toMatchObject({
    outcome: 'failed',
    errorClass: 'source_changed_during_retrieval',
    retryable: true,
  })
  const snapshots = await t.query(internal.sources.snapshots.listForRegistry, {
    registryId,
  })
  expect(snapshots).toHaveLength(0)
})

test('a firecrawl failure marks the run failed without creating a snapshot', async () => {
  const t = initTest()
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify({ error: 'Payment Required' }), {
          status: 402,
        }),
    ),
  )
  const { registryId } = await t.mutation(
    internal.operations.seed.seedLaunchCoverage,
    {},
  )

  const result = await t.action(
    internal.operations.ingest.ingestRegistrySource,
    { registryId },
  )

  expect(result).toMatchObject({
    outcome: 'failed',
    errorClass: 'firecrawl:firecrawl_request_failed',
    retryable: false,
  })

  const snapshots = await t.query(internal.sources.snapshots.listForRegistry, {
    registryId,
  })
  expect(snapshots).toHaveLength(0)
})

test('seeding is idempotent by slug', async () => {
  const t = initTest()
  const first = await t.mutation(
    internal.operations.seed.seedLaunchCoverage,
    {},
  )
  const second = await t.mutation(
    internal.operations.seed.seedLaunchCoverage,
    {},
  )

  expect(second).toEqual(first)

  const registry = await t.query(internal.sources.registries.get, {
    registryId: first.registryId,
  })
  expect(registry?.seedUrls).toEqual([
    HUB_URL,
    ALT_URL,
    'https://www.lafayettela.gov/your-government/city-and-parish-councils/schedule-research-ord-reso/',
  ])
})
