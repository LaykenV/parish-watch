import type { CoverageRedirectHop } from './contracts'
import {
  MAX_ROOT_REDIRECTS,
  ROOT_REQUEST_TIMEOUT_MS,
  boundedDetail,
} from './contracts'

export type RedirectStopReason =
  | 'final_response'
  | 'redirect_limit'
  | 'blocked_host'
  | 'invalid_location'
  | 'request_failed'

export type RedirectWalk = {
  hops: CoverageRedirectHop[]
  stopReason: RedirectStopReason
  blockedUrl?: string
  failureDetail?: string
}

/** Convex rejects `undefined` inside stored values, so absent fields stay absent. */
function buildHop(
  requestedUrl: string,
  status: number,
  contentType?: string,
  locationUrl?: string,
): CoverageRedirectHop {
  const hop: CoverageRedirectHop = { requestedUrl, status }
  if (locationUrl !== undefined) hop.locationUrl = locationUrl
  if (contentType !== undefined) hop.contentType = contentType
  return hop
}

function resolveLocation(base: string, location: string): string | null {
  try {
    const resolved = new URL(location, base)
    return resolved.toString()
  } catch {
    return null
  }
}

/**
 * Walks a redirect chain without paying a provider. Every hop is checked before
 * it is requested, so a redirect toward an unapproved host is recorded and
 * stopped instead of fetched.
 */
export async function walkRedirects(
  startUrl: string,
  isAllowed: (url: string) => boolean,
  maxRedirects: number = MAX_ROOT_REDIRECTS,
): Promise<RedirectWalk> {
  const hops: CoverageRedirectHop[] = []
  let current = startUrl

  for (let attempt = 0; attempt <= maxRedirects; attempt += 1) {
    if (!isAllowed(current)) {
      return { hops, stopReason: 'blocked_host', blockedUrl: current }
    }

    const controller = new AbortController()
    const timeout = setTimeout(
      () => controller.abort(),
      ROOT_REQUEST_TIMEOUT_MS,
    )
    let response: Response
    try {
      response = await fetch(current, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: { accept: 'text/html' },
      })
    } catch (error) {
      return {
        hops,
        stopReason: 'request_failed',
        failureDetail: boundedDetail(
          error instanceof Error ? error.message : String(error),
        ),
      }
    } finally {
      clearTimeout(timeout)
    }

    // The gate reads status, location, and content type. It never needs bytes.
    try {
      await response.body?.cancel()
    } catch {
      // An already released body is not a verification failure.
    }

    const status = response.status
    const contentType = response.headers.get('content-type') ?? undefined
    const location = response.headers.get('location')

    if (status >= 300 && status < 400 && location) {
      const next = resolveLocation(current, location)
      hops.push(
        buildHop(current, status, contentType, next ?? location),
      )
      if (next === null) {
        return { hops, stopReason: 'invalid_location', blockedUrl: location }
      }
      if (hops.length > maxRedirects) {
        return { hops, stopReason: 'redirect_limit', blockedUrl: next }
      }
      current = next
      continue
    }

    hops.push(buildHop(current, status, contentType))
    return { hops, stopReason: 'final_response' }
  }

  return { hops, stopReason: 'redirect_limit', blockedUrl: current }
}
