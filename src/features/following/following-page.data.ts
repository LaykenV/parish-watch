import type {
  EmailManagementScenario,
  FollowedTarget,
  FollowingScenario,
  SavedAreaSlug,
  SavedTopicSlug,
} from './contracts'
import { getActiveFollowingFixture } from './contracts'

export type FollowingPageData = {
  available: boolean
  areas: SavedArea[]
  mode: 'fixture' | 'live' | 'unavailable'
  notificationsAvailable: boolean
  signedIn: boolean
  targets: FollowedTarget[]
  topics: SavedTopicSlug[]
  scenario?: FollowingScenario
}

export type SavedArea = {
  detail: string
  name: string
  slug: SavedAreaSlug
}

export type EmailManagementData = {
  available: boolean
  managementState?: 'expired' | 'unavailable'
  scenario?: EmailManagementScenario
  subscription?: FollowedTarget
}

export async function loadFollowingPageData(
  scenario: FollowingScenario | undefined,
): Promise<FollowingPageData> {
  const active = getActiveFollowingFixture(scenario)
  if (!active) {
    return {
      areas: [],
      available: true,
      mode: 'live',
      notificationsAvailable: false,
      signedIn: false,
      targets: [],
      topics: [],
    }
  }
  if (active === 'signed-out') {
    return {
      areas: [],
      available: true,
      mode: 'fixture',
      notificationsAvailable: true,
      signedIn: false,
      scenario: active,
      targets: [],
      topics: [],
    }
  }
  const { FOLLOWED_TARGET_FIXTURES, SAVED_AREAS, SAVED_TOPICS } =
    await import('./fixtures')
  return {
    areas: SAVED_AREAS,
    available: true,
    mode: 'fixture',
    notificationsAvailable: true,
    signedIn: true,
    scenario: active,
    targets:
      active === 'empty'
        ? []
        : FOLLOWED_TARGET_FIXTURES.map((target) =>
            active === 'degraded' && target.id === 'drainage-credit-cap'
              ? {
                  ...target,
                  coverage: {
                    label: 'Source delayed',
                    note: 'The latest packet is late. Public Parish is keeping the last accepted record visible.',
                  },
                }
              : target,
          ),
    topics: [...SAVED_TOPICS],
  }
}

export async function loadEmailManagementData(
  scenario: EmailManagementScenario | undefined,
): Promise<EmailManagementData> {
  const active = getActiveFollowingFixture(scenario)
  if (!active) return { available: false }
  if (active === 'expired') {
    return { available: true, managementState: 'expired', scenario: active }
  }
  const { EMAIL_SUBSCRIPTION_FIXTURE } = await import('./fixtures')
  return {
    available: true,
    scenario: active,
    subscription: EMAIL_SUBSCRIPTION_FIXTURE,
  }
}
