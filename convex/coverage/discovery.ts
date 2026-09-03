import { FirecrawlClient } from '@firecrawl/firecrawl-convex'
import type {
  FirecrawlDocument,
  MapLink,
  SearchResult,
} from '@firecrawl/firecrawl-convex'
import { v } from 'convex/values'

import { components, internal } from '../_generated/api'
import type { Id } from '../_generated/dataModel'
import type { ActionCtx } from '../_generated/server'
import { internalAction } from '../_generated/server'
import { completeStructured } from '../ai/provider'
import type { AttemptRecord, StructuredOutcome } from '../ai/types'
import { sha256HexOfText } from '../sources/hashing'
import {
  collectCoverageCandidates,
  discoveryQueries,
  MAX_DISCOVERY_CANDIDATES,
} from './candidates'
import {
  classificationContractError,
  classifierRequest,
  SOURCE_CLASSIFIER_PROMPT_VERSION,
  SOURCE_CLASSIFIER_SCHEMA_VERSION,
  sourceClassificationResponse,
} from './classifier'
import { resolveRootManifest } from './roots'
import type { CoverageRootManifest } from './roots'

const firecrawl = new FirecrawlClient(components.firecrawl)
const MAP_SEARCH =
  'agenda minutes meeting packet ordinance resolution planning zoning notice calendar hearing'
const MAP_LIMIT = 100
const SEARCH_LIMIT = 25

type ProviderEvidence = {
  provider: 'firecrawl'
  operation: string
  status: string
  requestHash: string
  responseHash?: string
  latencyMs: number
  creditsUsed?: number
  creditsReported: boolean
  errorClass?: string
  errorDetail?: string
}

type DiscoveryProviderResult = {
  inputs: Array<{ source: string; links: MapLink[] }>
  evidence: ProviderEvidence[]
}

type DiscoveryProvider = (
  ctx: ActionCtx,
  manifest: CoverageRootManifest,
  rootUrl: string,
) => Promise<DiscoveryProviderResult>

type ClassifierProvider = (
  request: ReturnType<typeof classifierRequest>,
  contractCheck: (parsed: unknown) => string | null,
) => Promise<StructuredOutcome>

let discoverWithProvider: DiscoveryProvider = runFirecrawlDiscovery
let classifyWithProvider: ClassifierProvider = async (request, contractCheck) =>
  await completeStructured({
    request,
    responseValidator: sourceClassificationResponse,
    contractCheck,
  })

export function overrideCoverageDiscoveryForTests(
  provider: DiscoveryProvider,
): void {
  discoverWithProvider = provider
}

export function overrideCoverageClassifierForTests(
  provider: ClassifierProvider,
): void {
  classifyWithProvider = provider
}

export function resetCoverageProvidersForTests(): void {
  discoverWithProvider = runFirecrawlDiscovery
  classifyWithProvider = async (request, contractCheck) =>
    await completeStructured({
      request,
      responseValidator: sourceClassificationResponse,
      contractCheck,
    })
}

export const discoverForRun = internalAction({
  args: {
    runId: v.id('coverageCompilerRuns'),
    stageId: v.id('coverageCompilerStages'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(
      internal.coverage.discoveryLedger.discoveryContext,
      args,
    )
    if (!context) return null
    const manifest = resolveRootManifest(
      context.bodyKey,
      context.rootManifestVersion,
    )
    if (!manifest) {
      await fail(
        ctx,
        args,
        'discovery_provider_failed',
        'The checked root manifest disappeared before discovery.',
        false,
      )
      return null
    }

    let result: DiscoveryProviderResult
    try {
      result = await discoverWithProvider(
        ctx,
        manifest,
        context.resolvedRootUrl,
      )
    } catch (error) {
      const providerEvidence = (
        error as Error & { evidence?: ProviderEvidence }
      ).evidence
      if (providerEvidence) {
        await ctx.runMutation(
          internal.coverage.discoveryLedger.recordProviderCall,
          { runId: args.runId, stageId: args.stageId, ...providerEvidence },
        )
      }
      await fail(
        ctx,
        args,
        'discovery_provider_failed',
        error instanceof Error ? error.message : String(error),
        true,
      )
      return null
    }

    for (const evidence of result.evidence) {
      await ctx.runMutation(
        internal.coverage.discoveryLedger.recordProviderCall,
        { runId: args.runId, stageId: args.stageId, ...evidence },
      )
    }
    const candidates = collectCoverageCandidates(
      manifest,
      result.inputs,
      MAX_DISCOVERY_CANDIDATES,
    )
    await ctx.runMutation(internal.coverage.discoveryLedger.persistDiscovery, {
      ...args,
      candidates,
    })
    return null
  },
})

export const classifyForRun = internalAction({
  args: {
    runId: v.id('coverageCompilerRuns'),
    stageId: v.id('coverageCompilerStages'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(
      internal.coverage.discoveryLedger.classificationContext,
      args,
    )
    if (!context) return null
    const request = classifierRequest(
      context.bodyKey,
      context.bodyName,
      context.candidates,
    )
    const requestHash = await sha256HexOfText(JSON.stringify(request))
    let outcome: StructuredOutcome
    try {
      outcome = await classifyWithProvider(request, (parsed) =>
        classificationContractError(
          context.bodyKey,
          context.candidates,
          parsed,
        ),
      )
    } catch (error) {
      await recordThrownModelCall(ctx, args, requestHash, error)
      await fail(
        ctx,
        args,
        'classification_provider_failed',
        error instanceof Error ? error.message : String(error),
        true,
      )
      return null
    }

    const responseContent =
      outcome.outcome === 'success'
        ? outcome.result.content
        : outcome.failure.content
    const responseHash = responseContent
      ? await sha256HexOfText(responseContent)
      : undefined
    for (const attempt of outcome.attempts) {
      await recordModelAttempt(ctx, args, requestHash, responseHash, attempt)
    }
    if (outcome.outcome === 'failed') {
      await fail(
        ctx,
        args,
        'classification_contract_invalid',
        outcome.failure.detail,
        false,
      )
      return null
    }
    const parsed = outcome.result.parsed as {
      bodyKey: string
      classifications: Array<{
        candidateId: string
        outcome: 'classified' | 'uncertain'
        sourceKind:
          | 'agenda'
          | 'minutes'
          | 'packet'
          | 'ordinance'
          | 'resolution'
          | 'planning_case'
          | 'zoning_case'
          | 'notice'
          | 'calendar'
          | 'other'
          | 'unknown'
        cadence:
          | 'meeting_cycle'
          | 'weekly'
          | 'monthly'
          | 'annual'
          | 'irregular'
          | 'unknown'
        confidence: number
        evidenceText: string
        noGuessReason: string
      }>
    }
    await ctx.runMutation(
      internal.coverage.discoveryLedger.persistClassifications,
      { ...args, classifications: parsed.classifications },
    )
    return null
  },
})

async function runFirecrawlDiscovery(
  ctx: ActionCtx,
  manifest: CoverageRootManifest,
  rootUrl: string,
): Promise<DiscoveryProviderResult> {
  const inputs: DiscoveryProviderResult['inputs'] = []
  const evidence: ProviderEvidence[] = []
  const mapOptions = {
    search: MAP_SEARCH,
    includeSubdomains: true,
    ignoreQueryParameters: false,
    limit: MAP_LIMIT,
  } as const
  const mapRequest = { operation: 'map', rootUrl, options: mapOptions }
  const mapped = await callFirecrawl(mapRequest, () =>
    firecrawl.map(ctx, rootUrl, mapOptions),
  )
  evidence.push(mapped.evidence)
  inputs.push({ source: `map:${rootUrl}`, links: mapped.value.links })

  for (const query of discoveryQueries(manifest.bodyName)) {
    const options = {
      sources: ['web'] as Array<'web'>,
      includeDomains: manifest.allowedHosts,
      limit: SEARCH_LIMIT,
    }
    const searched = await callFirecrawl(
      { operation: 'search', query, options },
      () => firecrawl.search(ctx, query, options),
    )
    evidence.push(searched.evidence)
    inputs.push({
      source: `search:${query}`,
      links: (searched.value.web ?? [])
        .map(searchLink)
        .filter((link): link is MapLink => link !== null),
    })
  }
  return { inputs, evidence }
}

async function callFirecrawl<T>(
  request: { operation: string; [key: string]: unknown },
  call: () => Promise<T>,
): Promise<{ value: T; evidence: ProviderEvidence }> {
  const startedAt = Date.now()
  const requestHash = await sha256HexOfText(JSON.stringify(request))
  try {
    const value = await call()
    return {
      value,
      evidence: {
        provider: 'firecrawl',
        operation: request.operation,
        status: 'success',
        requestHash,
        responseHash: await sha256HexOfText(JSON.stringify(value)),
        latencyMs: Date.now() - startedAt,
        creditsReported: false,
      },
    }
  } catch (error) {
    const failure = new Error(
      `Firecrawl ${request.operation} failed: ${error instanceof Error ? error.message : String(error)}`,
    )
    ;(failure as Error & { evidence?: ProviderEvidence }).evidence = {
      provider: 'firecrawl',
      operation: request.operation,
      status: 'failed',
      requestHash,
      latencyMs: Date.now() - startedAt,
      creditsReported: false,
      errorClass: 'firecrawl_request_failed',
      errorDetail: failure.message,
    }
    throw failure
  }
}

function searchLink(result: SearchResult | FirecrawlDocument): MapLink | null {
  const metadata =
    'metadata' in result &&
    result.metadata &&
    typeof result.metadata === 'object'
      ? result.metadata
      : undefined
  const url =
    ('url' in result && typeof result.url === 'string'
      ? result.url
      : undefined) ??
    (typeof metadata?.url === 'string'
      ? metadata.url
      : typeof metadata?.sourceURL === 'string'
        ? metadata.sourceURL
        : undefined)
  if (!url) return null
  const title =
    'title' in result && typeof result.title === 'string'
      ? result.title
      : typeof metadata?.title === 'string'
        ? metadata.title
        : undefined
  const description =
    'description' in result && typeof result.description === 'string'
      ? result.description
      : typeof metadata?.description === 'string'
        ? metadata.description
        : undefined
  return {
    url,
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
  }
}

async function recordModelAttempt(
  ctx: ActionCtx,
  ids: {
    runId: Id<'coverageCompilerRuns'>
    stageId: Id<'coverageCompilerStages'>
  },
  requestHash: string,
  responseHash: string | undefined,
  attempt: AttemptRecord,
): Promise<void> {
  await ctx.runMutation(internal.coverage.discoveryLedger.recordProviderCall, {
    runId: ids.runId,
    stageId: ids.stageId,
    provider: attempt.route,
    operation: 'classify_sources',
    status: attempt.status,
    requestHash,
    ...(responseHash ? { responseHash } : {}),
    promptVersion: SOURCE_CLASSIFIER_PROMPT_VERSION,
    schemaVersion: SOURCE_CLASSIFIER_SCHEMA_VERSION,
    modelId: attempt.modelId,
    latencyMs: attempt.latencyMs,
    creditsReported: false,
    ...(attempt.usage?.promptTokens == null
      ? {}
      : { promptTokens: attempt.usage.promptTokens }),
    ...(attempt.usage?.completionTokens == null
      ? {}
      : { completionTokens: attempt.usage.completionTokens }),
    ...(attempt.usage?.totalTokens == null
      ? {}
      : { totalTokens: attempt.usage.totalTokens }),
    ...(attempt.errorClass ? { errorClass: attempt.errorClass } : {}),
    ...(attempt.errorDetail ? { errorDetail: attempt.errorDetail } : {}),
  })
}

async function recordThrownModelCall(
  ctx: ActionCtx,
  ids: {
    runId: Id<'coverageCompilerRuns'>
    stageId: Id<'coverageCompilerStages'>
  },
  requestHash: string,
  error: unknown,
): Promise<void> {
  await ctx.runMutation(internal.coverage.discoveryLedger.recordProviderCall, {
    ...ids,
    provider: 'ai_gateway',
    operation: 'classify_sources',
    status: 'failed',
    requestHash,
    promptVersion: SOURCE_CLASSIFIER_PROMPT_VERSION,
    schemaVersion: SOURCE_CLASSIFIER_SCHEMA_VERSION,
    latencyMs: 0,
    creditsReported: false,
    errorClass: error instanceof Error ? error.name : 'model_error',
    errorDetail: error instanceof Error ? error.message : String(error),
  })
}

async function fail(
  ctx: ActionCtx,
  ids: {
    runId: Id<'coverageCompilerRuns'>
    stageId: Id<'coverageCompilerStages'>
  },
  code:
    | 'discovery_provider_failed'
    | 'classification_provider_failed'
    | 'classification_contract_invalid',
  summary: string,
  retryable: boolean,
): Promise<void> {
  await ctx.runMutation(internal.coverage.discoveryLedger.failStage, {
    ...ids,
    code,
    summary,
    retryable,
  })
}
