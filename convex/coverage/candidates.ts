import type { MapLink } from '@firecrawl/firecrawl-convex'

import { classifyHost } from './rootGate'
import type { CoverageRootManifest } from './roots'

export const MAX_DISCOVERY_CANDIDATES = 100

const SOURCE_TERMS = [
  'agenda',
  'calendar',
  'hearing',
  'meeting',
  'minutes',
  'notice',
  'ordinance',
  'packet',
  'planning',
  'resolution',
  'zoning',
]

const STABLE_PATTERNS = [
  '.pdf',
  '/agendacenter/',
  '/document/',
  'docid=',
  'id=',
  'viewdocument',
]

const TRACKING_PARAMETERS = new Set([
  'fbclid',
  'gclid',
  'mc_cid',
  'mc_eid',
  'utm_campaign',
  'utm_content',
  'utm_medium',
  'utm_source',
  'utm_term',
])

export type CandidateInput = {
  source: string
  links: MapLink[]
}

export type NormalizedCoverageCandidate = {
  canonicalUrl: string
  title?: string
  description?: string
  discoveredFrom: string[]
  matchedTerms: string[]
  hostDisposition: 'approved' | 'document_host'
}

export function canonicalizeCandidateUrl(raw: string): string | null {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return null
  }
  if (url.protocol !== 'https:' || url.username || url.password) return null
  url.hash = ''
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMETERS.has(key.toLowerCase())) url.searchParams.delete(key)
  }
  url.searchParams.sort()
  return url.toString()
}

export function collectCoverageCandidates(
  manifest: CoverageRootManifest,
  inputs: CandidateInput[],
  limit = MAX_DISCOVERY_CANDIDATES,
): NormalizedCoverageCandidate[] {
  const candidates = new Map<string, NormalizedCoverageCandidate>()

  for (const input of inputs) {
    for (const link of input.links) {
      const canonicalUrl = canonicalizeCandidateUrl(link.url)
      if (!canonicalUrl) continue
      const hostDisposition = classifyHost(manifest, canonicalUrl)
      if (hostDisposition === 'unapproved') continue

      const title = boundedOptional(link.title)
      const description = boundedOptional(link.description)
      const haystack = [canonicalUrl, title, description]
        .filter((value): value is string => value !== undefined)
        .join(' ')
        .toLowerCase()
      const matchedTerms = SOURCE_TERMS.filter((term) =>
        haystack.includes(term),
      )
      const stable = STABLE_PATTERNS.some((pattern) =>
        haystack.includes(pattern),
      )
      if (matchedTerms.length === 0 && !stable) continue

      const existing = candidates.get(canonicalUrl)
      if (existing) {
        if (!existing.discoveredFrom.includes(input.source)) {
          existing.discoveredFrom.push(input.source)
        }
        existing.matchedTerms = [
          ...new Set([...existing.matchedTerms, ...matchedTerms]),
        ].sort()
        if (!existing.title && title) existing.title = title
        if (!existing.description && description)
          existing.description = description
        continue
      }

      candidates.set(canonicalUrl, {
        canonicalUrl,
        ...(title ? { title } : {}),
        ...(description ? { description } : {}),
        discoveredFrom: [input.source],
        matchedTerms: matchedTerms.sort(),
        hostDisposition,
      })
    }
  }

  return [...candidates.values()]
    .sort((left, right) => {
      if (left.hostDisposition !== right.hostDisposition) {
        return left.hostDisposition === 'approved' ? -1 : 1
      }
      if (left.matchedTerms.length !== right.matchedTerms.length) {
        return right.matchedTerms.length - left.matchedTerms.length
      }
      return left.canonicalUrl.localeCompare(right.canonicalUrl)
    })
    .slice(0, Math.max(0, limit))
}

export function discoveryQueries(bodyName: string): string[] {
  return [
    `${bodyName} agenda minutes packet`,
    `${bodyName} ordinance resolution meeting calendar`,
    `${bodyName} planning zoning hearing notice`,
  ]
}

function boundedOptional(value: string | undefined): string | undefined {
  const normalized = value?.replace(/\s+/g, ' ').trim()
  if (!normalized) return undefined
  return normalized.slice(0, 500)
}
