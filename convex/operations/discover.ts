import { FirecrawlClient } from '@firecrawl/firecrawl-convex'
import type {
  FirecrawlDocument,
  SearchResult,
} from '@firecrawl/firecrawl-convex'
import { v } from 'convex/values'

import { components, internal } from '../_generated/api'
import { internalAction } from '../_generated/server'
import { collectDiscoveryCandidates } from '../sources/discovery'
import type { DiscoveryLink } from '../sources/discovery'
import { canonicalizeUrl, isAllowedOfficialHost } from '../sources/domains'

const firecrawl = new FirecrawlClient(components.firecrawl)

const MAX_RESULTS_PER_SEED = 100
const MAX_RETURNED_CANDIDATES = 100
const DISCOVERY_SEARCH =
  'agenda minutes council meeting packet ordinance resolution'
const DOCUMENT_SEARCH_QUERIES = [
  'Lafayette City Council agenda',
  'Lafayette City Council minutes',
]

const candidateValidator = v.object({
  url: v.string(),
  title: v.optional(v.string()),
  description: v.optional(v.string()),
  discoveredFrom: v.array(v.string()),
  matchedTerms: v.array(v.string()),
})

const discoveryResultValidator = v.object({
  registryId: v.id('sourceRegistries'),
  mappedSeedCount: v.number(),
  searchQueryCount: v.number(),
  candidateCount: v.number(),
  candidates: v.array(candidateValidator),
})

type DiscoveryResult = typeof discoveryResultValidator.type

export const discoverRegistrySources = internalAction({
  args: { registryId: v.id('sourceRegistries') },
  returns: discoveryResultValidator,
  handler: async (ctx, args): Promise<DiscoveryResult> => {
    const registry = await ctx.runQuery(internal.sources.registries.get, {
      registryId: args.registryId,
    })
    if (!registry) {
      throw new Error(`Unknown registry ${args.registryId}`)
    }

    const mappedLinks: Array<{ seedUrl: string; links: DiscoveryLink[] }> = []
    for (const rawSeedUrl of registry.seedUrls) {
      const seedUrl = canonicalizeUrl(rawSeedUrl)
      if (
        !seedUrl ||
        !isAllowedOfficialHost(seedUrl, registry.officialDomains)
      ) {
        throw new Error(`Registry contains an invalid seed URL: ${rawSeedUrl}`)
      }
      const result = await firecrawl.map(ctx, seedUrl, {
        search: DISCOVERY_SEARCH,
        includeSubdomains: true,
        ignoreQueryParameters: false,
        limit: MAX_RESULTS_PER_SEED,
      })
      mappedLinks.push({ seedUrl, links: result.links })
    }

    for (const query of DOCUMENT_SEARCH_QUERIES) {
      const result = await firecrawl.search(ctx, query, {
        sources: ['web'],
        includeDomains: registry.officialDomains,
        limit: 25,
      })
      mappedLinks.push({
        seedUrl: `firecrawl-search:${query}`,
        links: (result.web ?? [])
          .map(searchResultToDiscoveryLink)
          .filter((link): link is DiscoveryLink => link !== null),
      })
    }

    const candidates = collectDiscoveryCandidates(
      mappedLinks,
      registry.officialDomains,
      MAX_RETURNED_CANDIDATES,
    )
    return {
      registryId: registry._id,
      mappedSeedCount: registry.seedUrls.length,
      searchQueryCount: DOCUMENT_SEARCH_QUERIES.length,
      candidateCount: candidates.length,
      candidates,
    }
  },
})

function searchResultToDiscoveryLink(
  result: SearchResult | FirecrawlDocument,
): DiscoveryLink | null {
  const metadata =
    'metadata' in result &&
    typeof result.metadata === 'object' &&
    result.metadata !== null
      ? (result.metadata as Record<string, unknown>)
      : undefined
  const metadataUrl =
    typeof metadata?.url === 'string'
      ? metadata.url
      : typeof metadata?.sourceURL === 'string'
        ? metadata.sourceURL
        : undefined
  const url =
    ('url' in result && typeof result.url === 'string'
      ? result.url
      : undefined) ?? metadataUrl
  if (!url) {
    return null
  }
  return {
    url,
    title:
      ('title' in result && typeof result.title === 'string'
        ? result.title
        : undefined) ??
      (typeof metadata?.title === 'string' ? metadata.title : undefined),
    description:
      ('description' in result && typeof result.description === 'string'
        ? result.description
        : undefined) ??
      (typeof metadata?.description === 'string'
        ? metadata.description
        : undefined),
  }
}
