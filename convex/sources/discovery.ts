import { canonicalizeUrl, isAllowedOfficialHost } from './domains'

export type DiscoveryLink = {
  url: string
  title?: string
  description?: string
}

export type DiscoveryCandidate = DiscoveryLink & {
  discoveredFrom: string[]
  matchedTerms: string[]
}

const DOCUMENT_TERMS = [
  'agenda',
  'briefing',
  'council',
  'document',
  'meeting',
  'minutes',
  'ordinance',
  'packet',
  'resolution',
]

const STABLE_DOCUMENT_PATTERNS = [
  '/obcouncil/',
  'viewdocument.aspx',
  'docid=',
  '.pdf',
]

export function collectDiscoveryCandidates(
  mappedLinks: Array<{ seedUrl: string; links: DiscoveryLink[] }>,
  officialDomains: string[],
  limit: number,
): DiscoveryCandidate[] {
  const candidates = new Map<string, DiscoveryCandidate>()

  for (const mapped of mappedLinks) {
    for (const link of mapped.links) {
      const url = canonicalizeUrl(link.url)
      if (!url || !isAllowedOfficialHost(url, officialDomains)) {
        continue
      }

      const haystack = [url, link.title, link.description]
        .filter((value): value is string => typeof value === 'string')
        .join(' ')
        .toLowerCase()
      const matchedTerms = DOCUMENT_TERMS.filter((term) =>
        haystack.includes(term),
      )
      const hasStableDocumentPattern = STABLE_DOCUMENT_PATTERNS.some(
        (pattern) => url.toLowerCase().includes(pattern),
      )
      if (matchedTerms.length === 0 && !hasStableDocumentPattern) {
        continue
      }

      const existing = candidates.get(url)
      if (existing) {
        if (!existing.discoveredFrom.includes(mapped.seedUrl)) {
          existing.discoveredFrom.push(mapped.seedUrl)
        }
        existing.matchedTerms = Array.from(
          new Set([...existing.matchedTerms, ...matchedTerms]),
        ).sort()
        continue
      }

      candidates.set(url, {
        url,
        title: link.title,
        description: link.description,
        discoveredFrom: [mapped.seedUrl],
        matchedTerms: matchedTerms.sort(),
      })
    }
  }

  return Array.from(candidates.values())
    .sort((left, right) => {
      const leftStable = STABLE_DOCUMENT_PATTERNS.some((pattern) =>
        left.url.toLowerCase().includes(pattern),
      )
      const rightStable = STABLE_DOCUMENT_PATTERNS.some((pattern) =>
        right.url.toLowerCase().includes(pattern),
      )
      if (leftStable !== rightStable) {
        return leftStable ? -1 : 1
      }
      if (left.matchedTerms.length !== right.matchedTerms.length) {
        return right.matchedTerms.length - left.matchedTerms.length
      }
      return left.url.localeCompare(right.url)
    })
    .slice(0, limit)
}
