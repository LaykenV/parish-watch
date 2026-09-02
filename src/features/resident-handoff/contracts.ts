export type IntegrationGate = 'live' | 'partial' | 'static' | 'unavailable'

export type ResidentRouteHandoff = {
  contract: string
  fixtureOwner?: string
  gate: IntegrationGate
  owner: string
  route: string
}

export type ResidentInteractionHandoff = {
  gate: IntegrationGate
  interaction: string
  owner: string
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
    gate: 'live',
    owner: 'public issue projection',
  },
  {
    route: '/decisions/$recordKey',
    contract: 'DecisionDetailFixture replacement adapter',
    fixtureOwner: 'features/evidence/record-fixtures.ts',
    gate: 'live',
    owner: 'public decision detail projection',
  },
  {
    route: '/meetings/$meetingId',
    contract: 'MeetingPageData',
    fixtureOwner: 'features/evidence/record-fixtures.ts',
    gate: 'live',
    owner: 'public meeting projection',
  },
  {
    route: '/ask',
    contract: 'AskAdapter',
    fixtureOwner: 'features/ask/fixtures.ts',
    gate: 'live',
    owner: 'anonymous grounded chat',
  },
  {
    route: '/following',
    contract: 'FollowingPageData',
    fixtureOwner: 'features/following/fixtures.ts',
    gate: 'live',
    owner: 'Convex Auth and follows',
  },
  {
    route: '/following/areas-and-topics',
    contract: 'FollowingPageData saved interests view',
    fixtureOwner: 'features/following/fixtures.ts',
    gate: 'live',
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
    gate: 'live',
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
  {
    route: '/privacy',
    contract: 'published resident privacy notice',
    gate: 'static',
    owner: 'privacy and data-retention policy',
  },
] as const satisfies readonly ResidentRouteHandoff[]

export const RESIDENT_INTERACTION_HANDOFFS = [
  {
    interaction: 'Ask question',
    gate: 'live',
    owner: 'anonymous grounded chat',
  },
  {
    interaction: 'Continue with Google',
    gate: 'live',
    owner: 'Convex Auth and follows',
  },
  {
    interaction: 'Verify email-only follow',
    gate: 'live',
    owner: 'AgentMail and follows',
  },
  {
    interaction: 'Save interests',
    gate: 'live',
    owner: 'Convex Auth and saved interests',
  },
  {
    interaction: 'Save default notification settings',
    gate: 'unavailable',
    owner: 'follows and AgentMail delivery',
  },
  {
    interaction: 'Request coverage',
    gate: 'unavailable',
    owner: 'coverage requests',
  },
  {
    interaction: 'Report a source problem',
    gate: 'unavailable',
    owner: 'private AgentMail intake',
  },
  {
    interaction: 'Follow government body from Coverage',
    gate: 'unavailable',
    owner: 'Convex Auth or verified email follows',
  },
  {
    interaction: 'Manage email-only follow',
    gate: 'live',
    owner: 'verified email subscription management',
  },
] as const satisfies readonly ResidentInteractionHandoff[]

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
