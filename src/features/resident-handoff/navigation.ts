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
  if (url.pathname === '/for-you') return '/'
  if (url.pathname === '/issues') return '/#current-issues'
  if (!RESIDENT_ROUTES.some((route) => matchesRoute(url.pathname, route))) {
    return undefined
  }

  return `${url.pathname}${url.search}${url.hash}`
}

/*
  Discovery routes carry their own presentation scenarios. Only the accepted
  update scenario has a matching evidence fixture, so every other development
  scenario opens the preview record.
*/
export function evidenceScenarioFromRouteSearch(
  search: unknown,
): EvidenceScenario | undefined {
  const fixture = (search as Record<string, unknown> | undefined)?.fixture
  if (typeof fixture !== 'string' || fixture.length === 0) return undefined
  return fixture === 'update' ? 'update' : 'preview'
}

export function evidenceJourneySearch({
  currentHref,
  scenario,
}: {
  currentHref: string
  scenario?: EvidenceScenario
}): EvidenceJourneySearch {
  return {
    fixture: scenario && import.meta.env.DEV ? scenario : undefined,
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
  const pathname = new URL(returnTo, 'https://public-parish.local').pathname
  if (pathname === '/' || pathname === '/for-you' || pathname === '/issues') {
    return 'Back to Home'
  }
  if (pathname === '/explore') return 'Back to Explore'
  if (pathname === '/following') return 'Back to Following'
  if (pathname.startsWith('/issues/')) return 'Back to issue'
  if (pathname.startsWith('/decisions/')) return 'Back to decision record'
  if (pathname.startsWith('/meetings/')) return 'Back to meeting'
  if (pathname === '/coverage') return 'Back to Coverage'
  if (pathname === '/ask') return 'Back to Ask'
  return 'Back'
}

function matchesRoute(
  pathname: string,
  route: (typeof RESIDENT_ROUTES)[number],
) {
  return route.endsWith('/') && route !== '/'
    ? pathname.startsWith(route)
    : pathname === route
}
