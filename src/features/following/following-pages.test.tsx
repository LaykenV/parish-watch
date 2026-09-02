import { readFileSync } from 'node:fs'

import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { DeliveryReceipt, FrequencyOptions } from './follow-action'
import { EmailManagementPage } from './email-management-page'
import { FollowingPage } from './following-page'
import { loadFollowingPageData } from './following-page.data'
import type { FollowingPageData } from './following-page.data'
import {
  EMAIL_SUBSCRIPTION_FIXTURE,
  FOLLOWED_TARGET_FIXTURES,
  SAVED_AREAS,
  SAVED_TOPICS,
} from './fixtures'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="#">{children}</a>,
  useNavigate: () => () => {},
  useRouterState: ({
    select,
  }: {
    select: (state: { location: { pathname: string } }) => unknown
  }) => select({ location: { pathname: '/following' } }),
}))

const loaderSource = readFileSync(
  new URL('./following-page.data.ts', import.meta.url),
  'utf8',
)
const followSource = readFileSync(
  new URL('./follow-action.tsx', import.meta.url),
  'utf8',
)
const followingPageSource = readFileSync(
  new URL('./following-page.tsx', import.meta.url),
  'utf8',
)

const active: FollowingPageData = {
  areas: SAVED_AREAS,
  available: true,
  mode: 'fixture',
  notificationsAvailable: true,
  scenario: 'active',
  signedIn: true,
  targets: FOLLOWED_TARGET_FIXTURES,
  topics: [...SAVED_TOPICS],
}

describe('resident following interface', () => {
  it('keeps development records behind a guarded dynamic import', () => {
    expect(loaderSource).toContain('const active = getActiveFollowingFixture')
    expect(loaderSource.indexOf('if (!active)')).toBeLessThan(
      loaderSource.indexOf('await import('),
    )
  })

  it('loads the real account adapter without a development fixture', async () => {
    await expect(loadFollowingPageData(undefined)).resolves.toMatchObject({
      areas: [],
      available: true,
      mode: 'live',
      notificationsAvailable: false,
      targets: [],
      topics: [],
    })
  })

  it('resyncs saved setup when another browser tab changes it', () => {
    expect(followingPageSource).toContain('setAreas(data.areas)')
    expect(followingPageSource).toContain('setTopics(new Set(data.topics))')
  })

  it('shows the target, cadence, and destination together', () => {
    const html = renderToStaticMarkup(
      <DeliveryReceipt
        destination="resident@example.com"
        frequency="both"
        target={{
          key: 'drainage-fee-credit-cap',
          kind: 'Issue',
          title: 'Drainage fee credit cap',
          detail: 'Lafayette Parish',
        }}
      />,
    )
    expect(html).toContain('Target')
    expect(html).toContain('Cadence')
    expect(html).toContain('Destination')
    expect(html).toContain('resident@example.com')
  })

  it('gives email-only and Google equal visible actions', () => {
    expect(followSource).toContain('Continue with Google')
    expect(followSource).toContain('Use email only')
    expect(followSource).toContain(
      'This creates an alert subscription, not an account.',
    )
    expect(followSource.indexOf('<FrequencyOptions')).toBeLessThan(
      followSource.indexOf('Continue with Google'),
    )
  })

  it('renders all three delivery schedules as written controls', () => {
    const html = renderToStaticMarkup(
      <FrequencyOptions onChange={() => {}} value="immediate" />,
    )
    expect(html).toContain('Immediate material updates')
    expect(html).toContain('Weekly roundup')
    expect(html).toContain('Both')
    expect(html.match(/type="radio"/g)).toHaveLength(3)
  })

  it('keeps destination and coverage health on each managed row', () => {
    const html = renderToStaticMarkup(
      <FollowingPage data={active} view="following" />,
    )
    expect(html).toContain('Latest change')
    expect(html).toContain('Next date')
    expect(html).toContain('Delivery')
    expect(html).toContain('Destination')
    expect(html).toContain('Source delayed')
    expect(html).toContain('Unfollow all')
  })

  it('does not simulate follows without an active fixture', () => {
    const html = renderToStaticMarkup(
      <FollowingPage
        data={{
          areas: [],
          available: false,
          mode: 'unavailable',
          notificationsAvailable: false,
          signedIn: false,
          targets: [],
          topics: [],
        }}
        view="following"
      />,
    )
    expect(html).toContain('Updates are not available yet')
    expect(html).not.toContain('resident@example.com')
  })

  it('keeps email management scoped to one subscription', () => {
    const html = renderToStaticMarkup(
      <EmailManagementPage
        data={{
          available: true,
          scenario: 'valid',
          subscription: EMAIL_SUBSCRIPTION_FIXTURE,
        }}
      />,
    )
    expect(html).toContain('Manage this follow')
    expect(html).toContain('one subscription')
    expect(html).toContain('Unfollow this issue')
    expect(html).not.toContain('Unfollow all')

    const bothValue = html.indexOf('value="both"')
    const bothOption = html.slice(
      html.lastIndexOf('<label', bothValue),
      html.indexOf('</label>', bothValue),
    )
    expect(bothOption).toContain('data-selected=""')
    expect(bothOption).toContain('checked=""')
  })

  it('orders immediate alert content around the resident consequence', () => {
    const html = renderToStaticMarkup(
      <FollowingPage data={active} view="notifications" />,
    )
    const changed = html.indexOf('What changed')
    const current = html.indexOf('Current state or next date')
    const consequence = html.indexOf('Why it may matter')
    const sources = html.indexOf('Official sources')
    expect(changed).toBeGreaterThan(-1)
    expect(changed).toBeLessThan(current)
    expect(current).toBeLessThan(consequence)
    expect(consequence).toBeLessThan(sources)
    expect(html).toContain('No changes means no email.')
  })
})
