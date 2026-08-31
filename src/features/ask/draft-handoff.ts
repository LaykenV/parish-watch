/*
  In-memory Ask draft handoff. The issue and meeting Ask blocks place the
  draft here before navigating; the matching Ask scope consumes and clears it
  on mount. An unrelated scope leaves it alone because canceling a scope change
  promises to keep that draft available if the resident returns. It never
  enters history state, the URL, or storage, so a reload loses it and the page
  shows an empty composer while the public scope stays in the URL.

  A module store instead of React context: the resident shell remounts across
  routes, and the handoff has to survive that navigation.
*/

type AskDraftHandoff = { scopeKey: string; draft: string }

let handoff: AskDraftHandoff | null = null

export function setAskDraftHandoff(scopeKey: string, draft: string) {
  handoff = { scopeKey, draft }
}

export function takeAskDraftHandoff(scopeKey: string): string | null {
  if (!handoff || handoff.scopeKey !== scopeKey) return null
  const stored = handoff
  handoff = null
  return stored.draft
}
