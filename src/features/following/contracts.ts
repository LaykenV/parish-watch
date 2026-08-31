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

export type FollowTarget = {
  kind: FollowKind
  title: string
  detail: string
}

export type FollowedTarget = FollowTarget & {
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
} {
  return { fixture: pick(search.fixture, FOLLOWING_SCENARIOS) }
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
