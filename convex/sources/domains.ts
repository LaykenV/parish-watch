export function canonicalizeUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) {
    return null
  }
  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return null
    }
    url.hash = ''
    return url.toString()
  } catch {
    return null
  }
}

export function firstSeedUrl(urls: string[]): string | null {
  return urls.length > 0 ? urls[0] : null
}

export function isAllowedOfficialHost(
  url: string,
  officialDomains: string[],
): boolean {
  let hostname: string
  try {
    hostname = new URL(url).hostname.toLowerCase()
  } catch {
    return false
  }
  return officialDomains.some((domain) => {
    const normalized = domain.trim().toLowerCase()
    if (!normalized) {
      return false
    }
    return hostname === normalized || hostname.endsWith(`.${normalized}`)
  })
}

export function isRegisteredSourceUrl(
  url: string,
  officialDomains: string[],
  seedUrls: string[],
  documentHosts: Array<{ host: string; pathPrefixes: string[] }> = [],
): boolean {
  const parsed = canonicalizeUrl(url)
  if (!parsed) return false
  const candidate = new URL(parsed)
  if (candidate.username || candidate.password) return false
  if (isAllowedOfficialHost(url, officialDomains)) return true
  if (candidate.protocol === 'https:' && documentHosts.some(entry => candidate.hostname === entry.host && entry.pathPrefixes.some(prefix => candidate.pathname.startsWith(prefix)))) return true
  const canonicalUrl = canonicalizeUrl(url)
  return (
    canonicalUrl !== null &&
    seedUrls.some((seedUrl) => canonicalizeUrl(seedUrl) === canonicalUrl)
  )
}
