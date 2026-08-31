import type { AreaSlug } from '../discovery/contracts'
import { areaName } from '../discovery/contracts'
import type { CitationData, CitationMap } from '../evidence/contracts'

/*
  Ask consumes a normalized projection owned by a typed adapter. The route and
  its components never read chat, review, citation, abuse, or identity tables,
  and never infer support from prose. The adapter normalizes backend states
  before anything renders.
*/

export type AskScope =
  | { kind: 'corpus'; areaKey?: AreaSlug; label: string }
  | {
      kind: 'issue'
      issueSlug: string
      label: string
      recordTitle: string
      returnTo: string
    }
  | {
      kind: 'meeting'
      meetingId: string
      label: string
      recordTitle: string
      returnTo: string
    }

export type AskClaimView = {
  id: string
  text: string
  citationIds: [string, ...string[]]
}

export type AskSupportedAnswer = {
  kind: 'supported'
  lead: AskClaimView
  claims: AskClaimView[]
  citations: CitationMap
  suggestions: string[]
}

export type AskNotFoundAnswer = {
  kind: 'not_found'
  statement: string
  explanation?: string
  closestNote?: string
  closestCitationId?: string
  citations: CitationMap
  suggestions: string[]
  officialContact?: { label: string; value: string; sourceId: string }
}

export type AskTurnState =
  'checking' | 'complete' | 'retryable_failure' | 'terminal_failure'

export type AskTurnView = {
  id: string
  question: string
  askedAt: string
  state: AskTurnState
  answer?: AskSupportedAnswer | AskNotFoundAnswer
}

export type AskConversationView = {
  id: string
  scope: AskScope
  expiresAt: string
  turns: AskTurnView[]
}

export type AskAvailability =
  | { kind: 'available' }
  | { kind: 'offline' }
  | { kind: 'unavailable' }
  | { kind: 'cooldown'; retryAt: string }
  | { kind: 'captcha'; challengeId: string }

/*
  The route search carries only public data: scope, a public record key, and
  the selected citation. A question is private conversation content and never
  enters the URL, history state, analytics, or server logs.
*/
export type AskRouteSearch =
  | { scope?: 'corpus'; area?: AreaSlug; source?: string }
  | { scope: 'issue'; issue: string; source?: string }
  | { scope: 'meeting'; meeting: string; source?: string }

/*
  Development presentation scenarios. They prove layout and state behavior
  only; they are never evidence that the chat backend works. parseAskSearch
  keeps the parameter so in-page navigation does not drop it, while
  loadAskPageData gates it behind DEV and production never loads the
  fixture module.
*/
export const ASK_SCENARIOS = [
  'empty-corpus',
  'empty-issue',
  'empty-meeting',
  'thread',
  'checking',
  'not-found',
  'retryable',
  'terminal',
  'cooldown',
  'captcha',
  'expired',
] as const

export type AskScenario = (typeof ASK_SCENARIOS)[number]

export type AskSearch = AskRouteSearch & { fixture?: AskScenario }

/*
  The anonymous chat adapter has not passed its integration gate, so only a
  development fixture session can answer a question. The route uses this to
  resolve the honest unavailable state, and the record pages use it to show
  the same message instead of inviting a question the product would drop on
  the way to /ask.
*/
export function askCanAnswer(): boolean {
  return import.meta.env.DEV
}

/*
  A scenario resolves only in development. Production keeps the parameter in
  the URL so in-page navigation does not drop it, but never resolves a
  scenario and never loads the fixture module.
*/
export function getActiveAskFixture(
  fixture: AskScenario | undefined,
): AskScenario | undefined {
  return import.meta.env.DEV ? fixture : undefined
}

export type AskRecentConversation = {
  localHandle: string
  scopeLabel: string
  latestActivityAt: string
  expiresAt: string
}

export type AskSubmission = {
  conversationId?: string
  scope: AskScope
  question: string
  idempotencyKey: string
}

/*
  A retry names the turn, not a new request. The adapter recorded the
  submission's idempotency key against that turn and replays it, so a retry
  cannot start a second answer for one question. Minting a key here would let
  the caller break that guarantee by forgetting.
*/
export type AskRetry = {
  conversationId: string
  turnId: string
}

/*
  Subscription deliveries stand in for the realtime channel the chat backend
  will provide, and resolveChallenge belongs to the abuse adapter: the page
  renders only the challenge the adapter selected and calls this when the
  resident completes it. Submit, retry, startNew, and clearRecent are the only
  write calls. clearRecent removes the same-device handles the adapter stores,
  so the control clears storage instead of only the rendered list.
*/
export type AskUpdate =
  | { kind: 'conversation'; conversation: AskConversationView | null }
  | { kind: 'availability'; availability: AskAvailability }
  | { kind: 'recent'; recent: AskRecentConversation[] }

export interface AskAdapter {
  resolveScope: (input: AskRouteSearch) => Promise<AskScope>
  listRecent: () => Promise<AskRecentConversation[]>
  open: (localHandle: string) => Promise<AskConversationView | null>
  submit: (input: AskSubmission) => Promise<void>
  retry: (input: AskRetry) => Promise<void>
  startNew: (scope: AskScope) => Promise<void>
  clearRecent: () => Promise<void>
  subscribe: (listener: (update: AskUpdate) => void) => () => void
  resolveChallenge: (challengeId: string) => Promise<void>
}

/*
  A submit or retry rejects only when the request was not accepted. State
  changes still arrive through subscribe; this error tells the page to keep
  the draft instead of freezing the question into the thread.
*/
export class AskRequestError extends Error {
  constructor(
    readonly failure:
      | { kind: 'cooldown'; retryAt: string }
      | { kind: 'captcha'; challengeId: string }
      | { kind: 'offline' },
  ) {
    super(`Ask request not accepted: ${failure.kind}`)
    this.name = 'AskRequestError'
  }
}

export const MAX_ASK_LENGTH = 500
export const NEAR_LIMIT = 60

const AREA_SLUGS: readonly AreaSlug[] = [
  'lafayette-parish',
  'east-baton-rouge-parish',
  'rapides-parish',
]

function pickText(value: unknown): string | undefined {
  const text = typeof value === 'string' ? value.trim() : ''
  return text.length > 0 ? text : undefined
}

export function parseAskSearch(search: Record<string, unknown>): AskSearch {
  const source = pickText(search.source)
  const fixture =
    typeof search.fixture === 'string' &&
    (ASK_SCENARIOS as readonly string[]).includes(search.fixture)
      ? (search.fixture as AskScenario)
      : undefined
  const scope =
    typeof search.scope === 'string' &&
    ['corpus', 'issue', 'meeting'].includes(search.scope)
      ? search.scope
      : undefined

  if (scope === 'issue') {
    const issue = pickText(search.issue)
    if (issue) return { scope: 'issue', issue, source, fixture }
  }

  if (scope === 'meeting') {
    const meeting = pickText(search.meeting)
    if (meeting) return { scope: 'meeting', meeting, source, fixture }
  }

  const area =
    typeof search.area === 'string' &&
    (AREA_SLUGS as readonly string[]).includes(search.area)
      ? (search.area as AreaSlug)
      : undefined

  return {
    scope: scope === 'corpus' ? 'corpus' : undefined,
    area,
    source,
    fixture,
  }
}

export function askScopeKey(search: AskSearch): string {
  if (search.scope === 'issue') return issueAskKey(search.issue)
  if (search.scope === 'meeting') return meetingAskKey(search.meeting)
  return search.area ? `corpus:${search.area}` : 'corpus'
}

export function routeSearchFromScopeKey(key: string): AskRouteSearch {
  if (key.startsWith('issue:')) return { scope: 'issue', issue: key.slice(6) }
  if (key.startsWith('meeting:'))
    return { scope: 'meeting', meeting: key.slice(8) }
  if (key.startsWith('corpus:'))
    return { scope: 'corpus', area: key.slice(7) as AreaSlug }
  return { scope: 'corpus' }
}

export function issueAskKey(issueSlug: string): string {
  return `issue:${issueSlug}`
}

export function meetingAskKey(meetingId: string): string {
  return `meeting:${meetingId}`
}

export function askScopeIdentity(scope: AskScope): string {
  switch (scope.kind) {
    case 'corpus':
      return 'corpus'
    case 'issue':
      return issueAskKey(scope.issueSlug)
    case 'meeting':
      return meetingAskKey(scope.meetingId)
  }
}

export function corpusScope(areaKey?: AreaSlug): AskScope {
  return {
    kind: 'corpus',
    areaKey,
    label: areaKey
      ? `Searching validated ${areaName(areaKey)} records`
      : 'Searching all validated Public Parish evidence',
  }
}

export function corpusScopeFromKey(key: string): AskScope {
  return corpusScope(
    key.startsWith('corpus:') ? (key.slice(7) as AreaSlug) : undefined,
  )
}

export function countAnswerSources(
  answer: AskSupportedAnswer | AskNotFoundAnswer,
): number {
  if (answer.kind === 'not_found') return 0
  return new Set(
    [answer.lead, ...answer.claims].flatMap((claim) => claim.citationIds),
  ).size
}

export function usedCitations(answer: AskSupportedAnswer): CitationData[] {
  const ids = new Set(
    [answer.lead, ...answer.claims].flatMap((claim) => claim.citationIds),
  )
  const citations: CitationData[] = []
  for (const id of ids) {
    const citation = answer.citations[id]
    if (citation) citations.push(citation)
  }
  return citations
}
