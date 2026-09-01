export type IntegrationGate = 'live' | 'partial' | 'static' | 'unavailable'

export type ResidentRouteHandoff = {
  contract: string
  fixtureOwner?: string
  gate: IntegrationGate
  owner: string
  route: string
}

export const RESIDENT_ROUTE_HANDOFFS = [
  {
    route: '/',
    contract: 'issue-led home with accepted issue and decision projections',
    fixtureOwner: 'features/discovery/fixtures.ts',
    gate: 'partial',
    owner: 'public issue and decision queries plus saved areas',
  },
  {
    route: '/for-you',
    contract: 'legacy redirect to the issue-led home',
    gate: 'live',
    owner: 'resident navigation',
  },
  {
    route: '/explore',
    contract: 'mixed published search projection and URL filters',
    fixtureOwner: 'features/discovery/fixtures.ts',
    gate: 'partial',
    owner: 'public search',
  },
  {
    route: '/issues/$issueSlug',
    contract: 'IssuePageData',
    fixtureOwner: 'features/evidence/fixtures.ts',
    gate: 'unavailable',
    owner: 'public issue projection',
  },
  {
    route: '/decisions/$recordKey',
    contract: 'DecisionDetailFixture replacement adapter',
    fixtureOwner: 'features/evidence/record-fixtures.ts',
    gate: 'unavailable',
    owner: 'public decision detail projection',
  },
  {
    route: '/meetings/$meetingId',
    contract: 'MeetingPageData',
    fixtureOwner: 'features/evidence/record-fixtures.ts',
    gate: 'unavailable',
    owner: 'public meeting projection',
  },
  {
    route: '/ask',
    contract: 'AskAdapter',
    fixtureOwner: 'features/ask/fixtures.ts',
    gate: 'unavailable',
    owner: 'anonymous grounded chat',
  },
  {
    route: '/following',
    contract: 'FollowingPageData',
    fixtureOwner: 'features/following/fixtures.ts',
    gate: 'unavailable',
    owner: 'Convex Auth and follows',
  },
  {
    route: '/following/areas-and-topics',
    contract: 'FollowingPageData saved interests view',
    fixtureOwner: 'features/following/fixtures.ts',
    gate: 'unavailable',
    owner: 'Convex Auth and saved interests',
  },
  {
    route: '/following/notifications',
    contract: 'notification preferences projection',
    fixtureOwner: 'features/following/fixtures.ts',
    gate: 'unavailable',
    owner: 'follows and AgentMail',
  },
  {
    route: '/email/manage/$token',
    contract: 'EmailManagementData',
    fixtureOwner: 'features/following/fixtures.ts',
    gate: 'unavailable',
    owner: 'verified email subscription management',
  },
  {
    route: '/coverage',
    contract: 'CoveragePageData',
    fixtureOwner: 'features/coverage/fixtures.ts',
    gate: 'unavailable',
    owner: 'public coverage projection',
  },
  {
    route: '/coverage/request',
    contract: 'CoverageRequestPageData',
    fixtureOwner: 'features/coverage/fixtures.ts',
    gate: 'unavailable',
    owner: 'coverage requests and optional AgentMail notice',
  },
  {
    route: '/how-it-works',
    contract: 'resident-readable method copy',
    gate: 'static',
    owner: 'published product method',
  },
] as const satisfies readonly ResidentRouteHandoff[]

export const FIXTURE_INTERACTION_HANDOFFS = [
  ['Ask question', 'anonymous grounded chat'],
  ['Continue with Google', 'Convex Auth and follows'],
  ['Verify email-only follow', 'AgentMail and follows'],
  ['Save interests', 'Convex Auth and saved interests'],
  ['Save notification settings', 'follows and AgentMail'],
  ['Request coverage', 'coverage requests'],
  ['Report a source problem', 'private AgentMail intake'],
  ['Follow government body', 'Convex Auth or verified email follows'],
  ['Manage email-only follow', 'verified email subscription management'],
] as const

export const CONNECTED_PROTOTYPE_FLOWS = [
  'choose-area-open-issue-source',
  'explore-filter-decision-related-issue',
  'issue-two-question-ask-source',
  'follow-issue-google-return',
  'follow-issue-email-verification',
  'alert-changed-issue-source',
  'degraded-coverage-request',
  'private-source-report',
  'returning-home',
  'keyboard-filter-source-follow',
] as const
