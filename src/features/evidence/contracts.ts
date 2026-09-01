import type {
  AreaSlug,
  EvidenceStatus,
  LifecycleState,
  UpdateKind,
} from '../discovery/contracts'
import { parseResidentReturnTo } from '../resident-handoff/navigation'

export type DocumentKind =
  | 'Agenda'
  | 'Agenda packet'
  | 'Meeting results'
  | 'Minutes'
  | 'Ordinance'
  | 'Public notice'
  | 'Resolution'

/*
  An excerpt keeps the words around the supporting sentence so a resident can
  see the quote was not cut out of context. `quote` is the supporting text.
*/
export type EvidenceExcerpt = {
  after?: string
  before?: string
  quote: string
}

export type CitationData = {
  body: string
  documentKind: DocumentKind
  documentTitle: string
  excerpt: EvidenceExcerpt
  id: string
  locator: string
  officialUrl: string
  page?: number
  retrievedAt: string
  section?: string
  warning?: string
}

export type CitationMap = Record<string, CitationData | undefined>

export type ClaimText = {
  citationId?: string
  text: string
}

export type ConsequenceFactor = {
  citationId: string
  factor: string
  text: string
}

export type PublicActionData = {
  citationId: string
  deadline?: string
  deadlineCitationId?: string
  instructions: string
  label: string
}

export type TimelineEntry = {
  citationId?: string
  date?: string
  meaningfulChange?: string
  recordKey?: string
  state: LifecycleState
  summary: string
  type: string
}

export type UncertainLink = {
  citationId?: string
  reason: string
  recordKey?: string
  title: string
}

export type ChangeEntry = {
  citationId?: string
  date: string
  from?: string
  kind: UpdateKind
  text: string
  to?: string
}

export type SourceDocument = {
  citationId?: string
  kind: DocumentKind
  note?: string
  officialUrl: string
  retrievedAt: string
  title: string
}

export type PublishedVersion = {
  date: string
  mode: 'Full' | 'Limited'
  note: string
  version: number
}

export type MarkedDate = {
  citationId?: string
  date: string
  label: string
  time?: string
}

export type IssueDetailData = {
  body: string
  changes: ChangeEntry[]
  deadline?: MarkedDate
  documents: SourceDocument[]
  evidence: { checked: string; note?: string; status: EvidenceStatus }
  factors: ConsequenceFactor[]
  happening: ClaimText[]
  historical?: { note: string; slug: string; title: string }
  latestOutcome?: MarkedDate
  limitedNote?: string
  mode: 'full' | 'limited'
  next?: MarkedDate
  place: string
  placeSlug: AreaSlug
  publicActions: PublicActionData[]
  slug: string
  state: LifecycleState
  timeline: TimelineEntry[]
  title: string
  uncertain: UncertainLink[]
  versions: PublishedVersion[]
}

export type IssueDetailFixture = {
  citations: CitationMap
  issue: IssueDetailData
  scenarioLabel: string
}

export type IssueLiveUpdate = {
  change: ChangeEntry
  next: MarkedDate
  version: PublishedVersion
}

export type DecisionField = {
  citationId?: string
  label: string
  note?: string
  value: string
}

export type DecisionDetailData = {
  body: string
  changes: ChangeEntry[]
  documents: SourceDocument[]
  fields: DecisionField[]
  issue?: { slug: string; title: string }
  latest?: MarkedDate
  limitedNote?: string
  meeting?: { id: string; title: string }
  mode: 'full' | 'limited'
  officialTitle: string
  officialTitleCitationId?: string
  place: string
  recordKey: string
  recordType: string
  state: LifecycleState
  summary: ClaimText[]
  title: string
  versions: PublishedVersion[]
}

export type DecisionDetailFixture = {
  citations: CitationMap
  decision: DecisionDetailData
  scenarioLabel: string
}

export type ArtifactStatus =
  | 'Available'
  | 'Delayed'
  | 'Expected after the meeting'
  | 'Not monitored'
  | 'Not published'

export type MeetingArtifact = {
  checked: string
  citationId?: string
  kind: string
  note?: string
  officialUrl?: string
  status: ArtifactStatus
}

export type MeetingDecisionRow = {
  citationId?: string
  recordKey: string
  state: LifecycleState
  summary: string
  title: string
}

export type MeetingDetailData = {
  artifacts: MeetingArtifact[]
  body: string
  date: string
  decisions: MeetingDecisionRow[]
  documents: SourceDocument[]
  id: string
  issueSlugs: string[]
  locationCitationId?: string
  locationText: string
  place: string
  placeSlug: AreaSlug
  routine: MeetingDecisionRow[]
  status: string
  timeKnown?: boolean
  title: string
  versions: PublishedVersion[]
}

export type MeetingDetailFixture = {
  citations: CitationMap
  meeting: MeetingDetailData
  scenarioLabel: string
}

export const EVIDENCE_SCENARIOS = ['preview', 'update'] as const

export type EvidenceScenario = (typeof EVIDENCE_SCENARIOS)[number]

export type EvidenceSearch = {
  fixture?: EvidenceScenario
  returnTo?: string
  source?: string
}

export function getActiveEvidenceFixture(
  scenario: EvidenceScenario | undefined,
): EvidenceScenario | undefined {
  return import.meta.env.DEV ? scenario : undefined
}

export function parseEvidenceSearch(
  search: Record<string, unknown>,
): EvidenceSearch {
  const fixture =
    typeof search.fixture === 'string' &&
    (EVIDENCE_SCENARIOS as readonly string[]).includes(search.fixture)
      ? (search.fixture as EvidenceScenario)
      : undefined
  const source =
    typeof search.source === 'string' && search.source.trim().length > 0
      ? search.source.trim()
      : undefined
  const returnTo = parseResidentReturnTo(search.returnTo)

  return { fixture, returnTo, source }
}

/*
  A citation id only survives the URL when the page actually publishes it, so a
  stale or edited link opens the page instead of an empty evidence panel.
*/
export function resolveCitationId(
  citations: CitationMap,
  candidate: string | undefined,
): string | null {
  if (!candidate) return null
  return Object.hasOwn(citations, candidate) ? candidate : null
}
