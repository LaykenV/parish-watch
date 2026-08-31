import type { FollowedTarget } from './contracts'

/*
  Development-only resident ownership fixtures. Routes load these through a
  guarded dynamic import. They never represent authenticated users, delivery
  records, or AgentMail state in a production build.
*/

export const FOLLOWED_TARGET_FIXTURES: FollowedTarget[] = [
  {
    id: 'drainage-credit-cap',
    href: '/issues/drainage-fee-credit-cap',
    evidenceScenario: 'update',
    kind: 'Issue',
    title: 'Drainage fee credit cap for large properties',
    detail: 'Lafayette Parish · Lafayette City-Parish Council',
    destination: 'resident@example.com',
    frequency: 'both',
    latestChange: 'Final vote scheduled for September 15',
    nextDate: 'Sep 15, 2026',
    status: 'Following',
  },
  {
    id: 'surplus-pickup-donations',
    href: '/issues/surplus-pickup-donations',
    evidenceScenario: 'preview',
    kind: 'Issue',
    title: 'Surplus 2016 Crew Cab pickup donations',
    detail: 'Lafayette Parish · Lafayette City Council',
    destination: 'Google account',
    frequency: 'immediate',
    latestChange: 'Council approved the cooperative agreement',
    status: 'Following',
  },
  {
    id: 'lafayette-council',
    kind: 'Government body',
    title: 'Lafayette City Council',
    detail: 'Lafayette Parish',
    destination: 'resident@example.com',
    frequency: 'weekly',
    latestChange: 'Agenda posted for the September 8 meeting',
    nextDate: 'Sep 8, 2026',
    status: 'Muted',
    coverage: {
      label: 'Source delayed',
      note: 'One agenda packet is posting later than expected. Dated accepted records remain available.',
    },
  },
]

export const EMAIL_SUBSCRIPTION_FIXTURE = FOLLOWED_TARGET_FIXTURES[0]

export const SAVED_AREAS = [
  {
    name: 'Lafayette Parish',
    detail: 'Watching current decisions and meetings',
  },
  {
    name: 'East Baton Rouge Parish',
    detail: 'Saved to this Google account',
  },
]

export const SAVED_TOPICS = [
  'Public money',
  'Public assets',
  'Drainage',
  'Land use',
] as const
