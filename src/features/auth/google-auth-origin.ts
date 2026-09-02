const GOOGLE_SIGN_IN_HANDOFF = 'googleSignIn'
const PRODUCTION_APP_ORIGIN = 'https://www.publicparish.com'
const SUBMISSION_APP_ORIGIN = 'https://befitting-flamingo-587.convex.site'

export function googleSignInHandoffUrl(href: string): string | null {
  const current = parseUrl(href)
  if (!current || current.origin !== SUBMISSION_APP_ORIGIN) return null

  const handoff = new URL(
    `${current.pathname}${current.search}${current.hash}`,
    PRODUCTION_APP_ORIGIN,
  )
  handoff.searchParams.set(GOOGLE_SIGN_IN_HANDOFF, '1')
  return handoff.href
}

export function consumeGoogleSignInHandoff(href: string): string | null {
  const current = parseUrl(href)
  if (
    !current ||
    current.origin !== PRODUCTION_APP_ORIGIN ||
    current.searchParams.get(GOOGLE_SIGN_IN_HANDOFF) !== '1'
  ) {
    return null
  }

  current.searchParams.delete(GOOGLE_SIGN_IN_HANDOFF)
  return current.href
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value)
  } catch {
    return null
  }
}
