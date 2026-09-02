import { parseResidentReturnTo } from '../resident-handoff/navigation'

export const FOLLOWING_SCENARIOS = [
  'signed-out',
  'active',
  'empty',
  'degraded',
] as const

export const EMAIL_MANAGEMENT_SCENARIOS = [
  'valid',
  'expired',
  'delivery-failure',
] as const

export type FollowingScenario = (typeof FOLLOWING_SCENARIOS)[number]
export type EmailManagementScenario =
  (typeof EMAIL_MANAGEMENT_SCENARIOS)[number]

export type DeliveryFrequency = 'immediate' | 'weekly' | 'both'
export type FollowKind = 'Issue' | 'Topic' | 'Government body' | 'Place'
export type FollowStatus = 'Following' | 'Muted' | 'Verification needed'

export const SAVED_AREA_SLUGS = [
  'lafayette-parish',
  'east-baton-rouge-parish',
  'rapides-parish',
] as const

export const SAVED_TOPIC_SLUGS = [
  'public-money',
  'public-assets',
  'public-safety',
  'housing',
  'drainage',
  'land-use',
] as const

export type SavedAreaSlug = (typeof SAVED_AREA_SLUGS)[number]
export type SavedTopicSlug = (typeof SAVED_TOPIC_SLUGS)[number]

export const SAVED_TOPIC_LABELS: Record<SavedTopicSlug, string> = {
  'public-money': 'Public money',
  'public-assets': 'Public assets',
  'public-safety': 'Public safety',
  housing: 'Housing',
  drainage: 'Drainage',
  'land-use': 'Land use',
}

export type FollowTarget = {
  key: string
  kind: FollowKind
  title: string
  detail: string
}

export type FollowedTarget = FollowTarget & {
  evidenceScenario?: 'preview' | 'update'
  href?: string
  id: string
  destination: string
  frequency: DeliveryFrequency
  latestChange: string
  nextDate?: string
  status: FollowStatus
  coverage?: {
    label: string
    note: string
  }
}

function pick<T extends string>(
  value: unknown,
  options: readonly T[],
): T | undefined {
  return typeof value === 'string' &&
    (options as readonly string[]).includes(value)
    ? (value as T)
    : undefined
}

export function parseFollowingSearch(search: Record<string, unknown>): {
  fixture?: FollowingScenario
  returnTo?: string
} {
  return {
    fixture: pick(search.fixture, FOLLOWING_SCENARIOS),
    returnTo: parseResidentReturnTo(search.returnTo),
  }
}

export function parseEmailManagementSearch(search: Record<string, unknown>): {
  fixture?: EmailManagementScenario
} {
  return { fixture: pick(search.fixture, EMAIL_MANAGEMENT_SCENARIOS) }
}

export function getActiveFollowingFixture<T extends string>(
  scenario: T | undefined,
): T | undefined {
  return import.meta.env.DEV && scenario ? scenario : undefined
}

export function frequencyLabel(frequency: DeliveryFrequency): string {
  switch (frequency) {
    case 'immediate':
      return 'Immediate material updates'
    case 'weekly':
      return 'Weekly roundup'
    case 'both':
      return 'Immediate updates and weekly roundup'
  }
}
