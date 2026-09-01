export type AreaSlug =
  'lafayette-parish' | 'east-baton-rouge-parish' | 'rapides-parish'

export type AreaStatus = 'available' | 'validating'

export type AreaRecord = {
  name: string
  slug: AreaSlug
  status: AreaStatus
  note?: string
}

export type LifecycleState =
  | 'Developing'
  | 'Scheduled'
  | 'In progress'
  | 'Postponed'
  | 'Decided'
  | 'Canceled'
  | 'Completed'
  | 'Status not stated'

export type EvidenceStatus =
  | 'Evidence available'
  | 'Limited information'
  | 'Source delayed'
  | 'Outcome not posted'

export type IssueCardData = {
  body: string
  evidence: {
    checked: string
    note?: string
    status: EvidenceStatus
  }
  latestOutcome?: {
    date: string
    label: string
  }
  nextDate?: {
    date: string
    label: string
  }
  place: string
  placeSlug: AreaSlug
  href?: string
  primaryActionLabel?: string
  showSecondaryActions?: boolean
  slug: string
  state: LifecycleState
  title: string
  topics: string[]
  whyMatter?: string
}

export type UpcomingItemData = {
  body: string
  date: string
  detail: string
  href: string
  kind: 'meeting' | 'issue'
  place: string
  placeSlug: AreaSlug
  title: string
}

export type UpdateKind =
  | 'Government update'
  | 'More information posted'
  | 'Public Parish correction'
  | 'Outcome'

export type UpdateEntryData = {
  date: string
  issueSlug?: string
  issueTitle?: string
  kind: UpdateKind
  text: string
}

export type ResultRowData = {
  body?: string
  coverage?: 'Supported' | 'Validating sources'
  date?: string
  href: string
  id?: string
  kind: 'Decision record' | 'Meeting' | 'Government body' | 'Routine record'
  meta?: string
  place?: string
  sourceStatus?: EvidenceStatus
  state?: LifecycleState
  title: string
}

export type ExploreSearch = {
  body?: string
  date?: string
  fixture?: ExploreScenario
  lifecycle?: string
  place?: string
  q?: string
  sort?: 'newest' | 'oldest'
  source?: string
  topic?: string
  type?: string
}

export type HomeScenario =
  'no-issues' | 'degraded' | 'signed-in' | 'section-failure' | 'update'

export type ExploreScenario = 'no-results' | 'section-failure' | 'update'

export const HOME_SCENARIOS: readonly HomeScenario[] = [
  'no-issues',
  'degraded',
  'signed-in',
  'section-failure',
  'update',
]

export const EXPLORE_SCENARIOS: readonly ExploreScenario[] = [
  'no-results',
  'section-failure',
  'update',
]

export const TOPIC_OPTIONS = [
  'Public money',
  'Public assets',
  'Public safety',
  'Housing',
  'Drainage',
] as const

export const DATE_OPTIONS = [
  { label: 'Any time', value: '' },
  { label: 'Next 30 days', value: 'next-30' },
  { label: 'Past 30 days', value: 'past-30' },
  { label: 'Past year', value: 'past-year' },
] as const

export const BODY_OPTIONS = [
  'Lafayette City-Parish Council',
  'Lafayette City Council',
  'Baton Rouge Metropolitan Council',
  'Rapides Parish Police Jury',
] as const

export const LIFECYCLE_OPTIONS = [
  'Scheduled',
  'In progress',
  'Postponed',
  'Decided',
] as const

export const SOURCE_OPTIONS = [
  'Evidence available',
  'Limited information',
  'Source delayed',
] as const

export const TYPE_OPTIONS = [
  { label: 'Issues', value: 'issue' },
  { label: 'Decision records', value: 'decision' },
  { label: 'Meetings', value: 'meeting' },
] as const

export const PLACE_OPTIONS = [
  { label: 'All places', value: '' },
  { label: 'Lafayette Parish', value: 'Lafayette Parish' },
  { label: 'East Baton Rouge Parish', value: 'East Baton Rouge Parish' },
  { label: 'Rapides Parish', value: 'Rapides Parish' },
] as const

export const SORT_OPTIONS = [
  { label: 'Newest first', value: 'newest' },
  { label: 'Oldest first', value: 'oldest' },
] as const

export function areaName(slug: AreaSlug): string {
  switch (slug) {
    case 'lafayette-parish':
      return 'Lafayette Parish'
    case 'east-baton-rouge-parish':
      return 'East Baton Rouge Parish'
    case 'rapides-parish':
      return 'Rapides Parish'
  }
}

export function isDiscoveryFixtureEnabled(
  scenario: string | undefined,
): boolean {
  return import.meta.env.DEV && scenario !== undefined
}

export function getActiveDiscoveryFixture<T extends string>(
  scenario: T | undefined,
): T | undefined {
  return isDiscoveryFixtureEnabled(scenario) ? scenario : undefined
}

function pick<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | undefined {
  return typeof value === 'string' &&
    (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined
}

function pickText(value: unknown): string | undefined {
  const text = typeof value === 'string' ? value.trim() : ''
  return text.length > 0 ? text : undefined
}

export function parseHomeSearch(search: Record<string, unknown>): {
  fixture?: HomeScenario
} {
  return { fixture: pick(search.fixture, HOME_SCENARIOS) }
}

export function parseExploreSearch(
  search: Record<string, unknown>,
): ExploreSearch {
  return {
    body: pick(search.body, BODY_OPTIONS),
    date: pick(
      search.date,
      DATE_OPTIONS.map((option) => option.value).filter(
        Boolean,
      ) as unknown as readonly string[],
    ),
    fixture: pick(search.fixture, EXPLORE_SCENARIOS),
    lifecycle: pick(search.lifecycle, LIFECYCLE_OPTIONS),
    place: pick(
      search.place,
      PLACE_OPTIONS.map((option) => option.value).filter(
        Boolean,
      ) as unknown as readonly string[],
    ),
    q: pickText(search.q),
    sort: pick(search.sort, ['newest', 'oldest'] as const),
    source: pick(search.source, SOURCE_OPTIONS),
    topic: pick(search.topic, TOPIC_OPTIONS),
    type: pick(
      search.type,
      TYPE_OPTIONS.map(
        (option) => option.value,
      ) as unknown as readonly string[],
    ),
  }
}
