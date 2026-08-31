import type { EvidenceScenario } from '../evidence/contracts'

const RESIDENT_ROUTES = [
  '/',
  '/ask',
  '/coverage',
  '/coverage/request',
  '/decisions/',
  '/email/manage/',
  '/explore',
  '/following',
  '/following/areas-and-topics',
  '/following/notifications',
  '/for-you',
  '/how-it-works',
  '/issues/',
  '/meetings/',
] as const

export type EvidenceJourneySearch = {
  fixture?: EvidenceScenario
  returnTo?: string
}

export function parseResidentReturnTo(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const candidate = value.trim()
  if (!candidate || candidate.length > 768 || !candidate.startsWith('/')) {
    return undefined
  }
  if (candidate.startsWith('//') || candidate.includes('\\')) return undefined

  let url: URL
  try {
    url = new URL(candidate, 'https://public-parish.local')
  } catch {
    return undefined
  }

  if (url.origin !== 'https://public-parish.local') return undefined
  if (!RESIDENT_ROUTES.some((route) => matchesRoute(url.pathname, route))) {
    return undefined
  }

  return `${url.pathname}${url.search}${url.hash}`
}

export function evidenceJourneySearch({
  currentHref,
  fixture,
  scenario = 'preview',
}: {
  currentHref: string
  fixture: boolean
  scenario?: EvidenceScenario
}): EvidenceJourneySearch {
  return {
    fixture: fixture && import.meta.env.DEV ? scenario : undefined,
    returnTo: parseResidentReturnTo(currentHref),
  }
}

export function evidenceRouteHref(
  pathname: string,
  search: {
    fixture?: EvidenceScenario
    returnTo?: string
    source?: string
  },
): string {
  const params = new URLSearchParams()
  if (import.meta.env.DEV && search.fixture) {
    params.set('fixture', search.fixture)
  }
  const returnTo = parseResidentReturnTo(search.returnTo)
  if (returnTo) params.set('returnTo', returnTo)
  if (search.source) params.set('source', search.source)
  let query = params.toString()
  let href = query ? `${pathname}?${query}` : pathname

  if (href.length > 768 && returnTo) {
    params.delete('returnTo')
    query = params.toString()
    href = query ? `${pathname}?${query}` : pathname
  }

  return href
}

export function residentReturnLabel(returnTo: string): string {
  const pathname = new URL(
    returnTo,
    'https://public-parish.local',
  ).pathname
  if (pathname === '/') return 'Back to Home'
  if (pathname === '/for-you') return 'Back to For You'
  if (pathname === '/explore') return 'Back to Explore'
  if (pathname === '/following') return 'Back to Following'
  if (pathname.startsWith('/issues/')) return 'Back to issue'
  if (pathname.startsWith('/decisions/')) return 'Back to decision record'
  if (pathname.startsWith('/meetings/')) return 'Back to meeting'
  if (pathname === '/coverage') return 'Back to Coverage'
  if (pathname === '/ask') return 'Back to Ask'
  return 'Back'
}

function matchesRoute(pathname: string, route: (typeof RESIDENT_ROUTES)[number]) {
  return route.endsWith('/') && route !== '/'
    ? pathname.startsWith(route)
    : pathname === route
}
