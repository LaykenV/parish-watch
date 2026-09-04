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
): boolean {
  if (isAllowedOfficialHost(url, officialDomains)) return true
  const canonicalUrl = canonicalizeUrl(url)
  return (
    canonicalUrl !== null &&
    seedUrls.some((seedUrl) => canonicalizeUrl(seedUrl) === canonicalUrl)
  )
}
