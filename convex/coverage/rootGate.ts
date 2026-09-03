import type {
  CoverageFindingCode,
  CoverageFindingSeverity,
  CoverageRedirectHop,
} from './contracts'
import type { CoverageRootManifest } from './roots'
import type { RedirectWalk } from './redirectWalk'

export type RootGateFinding = {
  code: CoverageFindingCode
  severity: CoverageFindingSeverity
  summary: string
  subjectUrl?: string
}

export type RootGateEvaluation = {
  outcome: 'passed' | 'failed_retryable' | 'failed_terminal'
  finalUrl?: string
  hops: CoverageRedirectHop[]
  findings: RootGateFinding[]
}

export type HostDisposition = 'approved' | 'document_host' | 'unapproved'

export function canonicalizeRootUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return null
  }
  if (url.protocol !== 'https:') return null
  // A root with credentials hides its real host behind the userinfo segment.
  if (url.username !== '' || url.password !== '') return null
  url.hash = ''
  return url.toString()
}

function matchesHost(hostname: string, candidate: string): boolean {
  return hostname === candidate.trim().toLowerCase()
}

function matchesSubdomain(hostname: string, suffix: string): boolean {
  const normalized = suffix.trim().toLowerCase()
  if (!normalized) return false
  return hostname === normalized || hostname.endsWith(`.${normalized}`)
}

export function classifyHost(
  manifest: CoverageRootManifest,
  url: string,
): HostDisposition {
  let hostname: string
  let pathname: string
  try {
    const parsed = new URL(url)
    hostname = parsed.hostname.toLowerCase()
    pathname = parsed.pathname
  } catch {
    return 'unapproved'
  }
  if (manifest.allowedHosts.some((host) => matchesHost(hostname, host))) {
    return 'approved'
  }
  if (
    manifest.allowedSubdomainSuffixes.some((suffix) =>
      matchesSubdomain(hostname, suffix),
    )
  ) {
    return 'approved'
  }
  const documentHost = manifest.documentHosts.find((entry) =>
    matchesHost(hostname, entry.host),
  )
  if (
    documentHost &&
    documentHost.pathPrefixes.some((prefix) => pathname.startsWith(prefix))
  ) {
    return 'document_host'
  }
  return 'unapproved'
}

/** A root hop must stay on an approved host. Document hosts are not roots. */
export function isApprovedRootUrl(
  manifest: CoverageRootManifest,
  url: string,
): boolean {
  if (canonicalizeRootUrl(url) === null) return false
  return classifyHost(manifest, url) === 'approved'
}

function hostFinding(
  manifest: CoverageRootManifest,
  url: string,
): RootGateFinding {
  if (canonicalizeRootUrl(url) === null) {
    return {
      code: 'root_scheme_not_https',
      severity: 'blocking',
      summary: 'A redirect left HTTPS or carried embedded credentials.',
      subjectUrl: url,
    }
  }
  if (classifyHost(manifest, url) === 'document_host') {
    return {
      code: 'root_document_host_quarantined',
      severity: 'blocking',
      summary:
        'The root resolved to an approved document host, which stays quarantined until a candidate is checked.',
      subjectUrl: url,
    }
  }
  return {
    code: 'root_host_not_approved',
    severity: 'blocking',
    summary: 'A redirect left the hosts approved for this body.',
    subjectUrl: url,
  }
}

export function evaluateRootChain(
  manifest: CoverageRootManifest,
  walk: RedirectWalk,
): RootGateEvaluation {
  const findings: RootGateFinding[] = []
  const hops = walk.hops

  const approvedRoot = canonicalizeRootUrl(manifest.approvedRootUrl)
  if (approvedRoot === null) {
    findings.push({
      code: 'root_url_invalid',
      severity: 'blocking',
      summary: 'The checked manifest does not hold a usable HTTPS root.',
      subjectUrl: manifest.approvedRootUrl,
    })
    return { outcome: 'failed_terminal', hops, findings }
  }

  for (const hop of hops) {
    if (classifyHost(manifest, hop.requestedUrl) !== 'approved') {
      findings.push(hostFinding(manifest, hop.requestedUrl))
    }
  }

  if (walk.stopReason === 'blocked_host') {
    findings.push(hostFinding(manifest, walk.blockedUrl ?? ''))
    return { outcome: 'failed_terminal', hops, findings }
  }

  if (walk.stopReason === 'redirect_limit') {
    findings.push({
      code: 'root_redirect_limit',
      severity: 'blocking',
      summary: 'The root exceeded the allowed redirect depth.',
    })
    return { outcome: 'failed_terminal', hops, findings }
  }

  if (walk.stopReason === 'invalid_location') {
    findings.push({
      code: 'root_redirect_invalid',
      severity: 'blocking',
      summary: 'A redirect gave a location the gate could not resolve.',
      subjectUrl: walk.blockedUrl,
    })
    return { outcome: 'failed_terminal', hops, findings }
  }

  if (walk.stopReason === 'request_failed') {
    findings.push({
      code: 'root_request_failed',
      severity: 'blocking',
      summary: 'The root did not answer the verification request.',
    })
    return { outcome: 'failed_retryable', hops, findings }
  }

  const finalHop = hops[hops.length - 1]
  if (!finalHop) {
    findings.push({
      code: 'root_request_failed',
      severity: 'blocking',
      summary: 'The root did not answer the verification request.',
    })
    return { outcome: 'failed_retryable', hops, findings }
  }

  if (finalHop.status < 200 || finalHop.status > 299) {
    findings.push({
      code: 'root_status_unsuccessful',
      severity: 'blocking',
      summary: `The root answered with status ${finalHop.status}.`,
      subjectUrl: finalHop.requestedUrl,
    })
    return {
      outcome: finalHop.status >= 500 ? 'failed_retryable' : 'failed_terminal',
      hops,
      findings,
    }
  }

  const contentType = finalHop.contentType?.toLowerCase() ?? ''
  if (!contentType.includes('text/html') && !contentType.includes('xhtml')) {
    findings.push({
      code: 'root_content_type_unexpected',
      severity: 'blocking',
      summary: `The root answered with content type "${finalHop.contentType ?? 'none'}" instead of a page.`,
      subjectUrl: finalHop.requestedUrl,
    })
    return { outcome: 'failed_terminal', hops, findings }
  }

  const finalUrl = canonicalizeRootUrl(finalHop.requestedUrl) ?? undefined
  if (
    manifest.expectedFinalUrl !== undefined &&
    finalUrl !== canonicalizeRootUrl(manifest.expectedFinalUrl)
  ) {
    findings.push({
      code: 'root_final_url_mismatch',
      severity: 'blocking',
      summary: 'The root settled somewhere the manifest does not expect.',
      subjectUrl: finalHop.requestedUrl,
    })
    return { outcome: 'failed_terminal', hops, findings }
  }

  if (findings.length > 0) {
    return { outcome: 'failed_terminal', hops, findings }
  }

  return { outcome: 'passed', finalUrl, hops, findings }
}
