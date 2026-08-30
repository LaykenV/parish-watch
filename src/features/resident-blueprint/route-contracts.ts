export type BlueprintAction = {
  href?: string
  label: string
  treatment?: 'primary' | 'secondary' | 'text'
}

export type BlueprintSection = {
  actions?: BlueprintAction[]
  items: string[]
  title: string
}

export type ResidentBlueprint = {
  actions: BlueprintAction[]
  description: string
  eyebrow: string
  fixture: string
  sections: BlueprintSection[]
  states: string[]
  title: string
}

export type BlueprintKey =
  | 'for-you'
  | 'explore'
  | 'ask'
  | 'coverage'
  | 'coverage-request'
  | 'issue'
  | 'decision'
  | 'meeting'
  | 'how-it-works'
  | 'following'
  | 'areas-and-topics'
  | 'notifications'
  | 'email-management'

const REAL_ISSUE_NOTE =
  'Structure is stressed with the development issue about two Lafayette surplus 2016 Crew Cab pickup donations. No fixture is a production civic claim.'

const BLUEPRINTS: Record<BlueprintKey, ResidentBlueprint> = {
  'for-you': {
    eyebrow: 'For You',
    title: 'Decisions matched to your places and interests',
    description:
      'One ranked feed explains why each issue appears. Temporary filters never change saved interests.',
    fixture: 'Design fixture: signed-out resident watching Lafayette Parish.',
    actions: [
      { label: 'Choose an area', treatment: 'primary' },
      { href: '/following/areas-and-topics', label: 'Edit saved interests' },
    ],
    states: [
      'Signed out with one local area',
      'Signed in with several areas',
      'No personalized matches',
      'Coverage degraded',
      'Update available',
    ],
    sections: [
      {
        title: 'Your current match settings',
        items: [
          'Lafayette Parish',
          'Topics are optional',
          'No street address needed',
        ],
      },
      {
        title: 'Ranked issue feed',
        items: [
          'Match reason beside every item',
          'Plain-language title, body, state, date, consequence, and evidence status',
          'Follow and Share remain separate from View issue',
        ],
        actions: [
          { href: '/issues/surplus-pickup-donations', label: 'View issue' },
          { label: 'Follow' },
        ],
      },
      {
        title: 'Feed refresh',
        items: ['Realtime changes wait behind one quiet Update available row'],
      },
    ],
  },
  explore: {
    eyebrow: 'Explore',
    title: 'Search issues and official records',
    description:
      'Explore keeps one result sequence and stores the query, filters, and sort in the URL.',
    fixture: 'Design fixture: mixed Lafayette results before API integration.',
    actions: [
      { label: 'Search published evidence', treatment: 'primary' },
      { label: 'More filters' },
    ],
    states: [
      'Before search',
      'Mixed results',
      'No results',
      'Limited result',
      'Update available',
    ],
    sections: [
      {
        title: 'Search and filters',
        items: [
          'Place, Topic, and Date stay near search',
          'Body, Lifecycle, Record type, and Source status live under More filters',
          'Mobile uses a sheet; desktop uses a collapsible column',
        ],
      },
      {
        title: 'Current issues',
        items: ['Rich issue result with type label and evidence state'],
        actions: [
          { href: '/issues/surplus-pickup-donations', label: 'View issue' },
        ],
      },
      {
        title: 'Decision records and meetings',
        items: [
          'Compact rows with visible result type',
          'Government body results lead to Coverage',
        ],
        actions: [
          { href: '/decisions/CO-022-2026', label: 'Open decision record' },
          {
            href: '/meetings/lafayette-city-council-2026-08-18',
            label: 'Open meeting',
          },
        ],
      },
    ],
  },
  ask: {
    eyebrow: 'Ask Public Parish',
    title: 'Ask from validated official evidence',
    description:
      'Questions stay within the visible issue, meeting, or full Public Parish evidence scope. Answers appear only after citation validation.',
    fixture:
      'Design fixture: empty anonymous conversation, available on this device for 24 hours.',
    actions: [{ label: 'Send question', treatment: 'primary' }],
    states: [
      'Empty corpus-wide Ask',
      'Issue scoped',
      'Meeting scoped',
      'Supported two-turn answer',
      'Evidence not found',
      'Cooldown and expired thread',
    ],
    sections: [
      {
        title: 'Evidence scope',
        items: [
          'Searching all validated Public Parish evidence',
          'Current area: Lafayette Parish',
        ],
      },
      {
        title: 'Question composer',
        items: [
          'Large question field with explicit Send control',
          'No more than three evidence-based examples',
          'Composer stays above mobile bottom navigation',
        ],
      },
      {
        title: 'Validated answer',
        items: [
          'Direct answer, short explanation, and Source controls',
          'Collapsed Sources used list',
          'Up to three supported follow-up questions',
        ],
        actions: [{ label: 'Source' }, { label: 'Ask a follow-up' }],
      },
    ],
  },
  coverage: {
    eyebrow: 'Coverage',
    title: 'Source health for launch government bodies',
    description:
      'Coverage reports whether official sources pass the common evidence gate. It does not rank political importance.',
    fixture:
      'Design fixture: launch bodies shown in supported, degraded, and validating states.',
    actions: [
      {
        href: '/coverage/request',
        label: 'Request coverage',
        treatment: 'primary',
      },
      { href: '/how-it-works', label: 'How it works' },
    ],
    states: [
      'Supported',
      'Degraded',
      'Validating sources',
      'Paused',
      'Not supported',
    ],
    sections: [
      {
        title: 'Lafayette Parish',
        items: [
          'Government body, monitored sources, and coverage state',
          'Last successful check and next expected artifact',
          'Public-safe limitation and method link',
        ],
        actions: [
          { label: 'Follow body' },
          { href: '/how-it-works', label: 'View method' },
        ],
      },
      {
        title: 'Rapides Parish',
        items: ['Validating sources remains unavailable for area selection'],
      },
      {
        title: 'East Baton Rouge Parish',
        items: [
          'No public compiler progress, request counts, or weaker beta standard',
        ],
      },
    ],
  },
  'coverage-request': {
    eyebrow: 'Request coverage',
    title: 'Tell Public Parish which place to validate next',
    description:
      'A request records demand. It never starts a crawl or promises a launch date.',
    fixture: 'Design fixture: new request form. No request is sent.',
    actions: [{ label: 'Request coverage', treatment: 'primary' }],
    states: [
      'New request',
      'Duplicate request',
      'Request recorded',
      'Optional email verification failed',
      'Rate limited',
    ],
    sections: [
      {
        title: 'Place',
        items: [
          'Parish or municipality',
          'Optional official government homepage',
        ],
      },
      {
        title: 'Optional launch notice',
        items: [
          'Email is optional',
          'The request is recorded before verification',
          'Verification failure removes only notification interest',
        ],
      },
      {
        title: 'Confirmation',
        items: [
          'Requested. We validate every source before coverage goes live.',
        ],
      },
    ],
  },
  issue: {
    eyebrow: 'Issue',
    title: 'Surplus 2016 Crew Cab pickup donations',
    description:
      'The issue is the main resident object. Its reading order stays stable while evidence and actions expand around it.',
    fixture: `Design fixture based on real development evidence. ${REAL_ISSUE_NOTE}`,
    actions: [
      { label: 'Follow', treatment: 'primary' },
      { label: 'Share' },
      {
        href: '/ask?issue=surplus-pickup-donations',
        label: 'Ask about this issue',
      },
    ],
    states: [
      'Full decided issue',
      'Limited source-only issue',
      'Coverage degraded',
      'Succeeded by newer issue',
      'Updated from official record',
    ],
    sections: [
      {
        title: 'Current state and evidence',
        items: [
          'Next known date or latest outcome',
          'Evidence status and last checked time',
        ],
      },
      {
        title: 'What is happening',
        items: [
          'Plain-language explanation with a nearby Source control',
          'What the public can still do, when the official record states an action',
        ],
        actions: [{ label: 'Source' }],
      },
      {
        title: 'Why this may matter',
        items: [
          'Accepted public-assets consequence with a nearby Source control',
        ],
        actions: [{ label: 'Source' }],
      },
      {
        title: 'Decision timeline',
        items: [
          'Agenda proposal',
          'Minutes and decided outcome',
          'Meaningful change',
        ],
        actions: [
          { href: '/decisions/CO-022-2026', label: 'View decision' },
          { label: 'Source' },
        ],
      },
      {
        title: 'What changed',
        items: [
          'Government update',
          'More information posted',
          'Public Parish correction',
        ],
      },
      {
        title: 'Sources and update history',
        items: [
          'Exact excerpt viewer opens beside the claim on desktop and in a sheet on mobile',
        ],
        actions: [{ label: 'Report a source problem' }],
      },
    ],
  },
  decision: {
    eyebrow: 'Decision record',
    title: 'Donate a surplus pickup through a cooperative agreement',
    description:
      'The atomic record preserves the government action and its accepted history without replacing the related issue.',
    fixture: `Design fixture keyed by the route record identifier. ${REAL_ISSUE_NOTE}`,
    actions: [
      { href: '/issues/surplus-pickup-donations', label: 'View related issue' },
    ],
    states: [
      'Full current version',
      'Current limited version',
      'Earlier dated version',
      'Route not found',
    ],
    sections: [
      {
        title: 'Record identity',
        items: [
          'Official record identifier',
          'Government body, record type, and current state',
        ],
      },
      {
        title: 'Plain-language summary',
        items: [
          'Each accepted field uses a definition list and nearby Source control',
        ],
        actions: [{ label: 'Source' }],
      },
      {
        title: 'Official item title',
        items: [
          'Complete government wording remains available without dominating the page',
        ],
      },
      {
        title: 'Sources and material update history',
        items: [
          'Scheduled for consideration',
          'More information became available',
          'Council approved the ordinance',
        ],
        actions: [{ label: 'Report a source problem' }],
      },
    ],
  },
  meeting: {
    eyebrow: 'Meeting',
    title: 'Lafayette City Council meeting',
    description:
      'Meeting pages group official artifacts, substantive decisions, routine records, and a meeting-scoped Ask entry.',
    fixture: 'Design fixture: meeting before minutes are due.',
    actions: [
      {
        href: '/ask?meeting=lafayette-city-council-2026-08-18',
        label: 'Ask about this meeting',
      },
    ],
    states: [
      'Before minutes are due',
      'Minutes delayed',
      'Artifact not published',
      'Substantive records available',
      'Route not found',
    ],
    sections: [
      {
        title: 'Meeting details',
        items: ['Government body, date, status, and official location text'],
      },
      {
        title: 'Official artifacts',
        items: [
          'Agenda: Available',
          'Packet: Available',
          'Minutes: Expected after the meeting',
          'Official video: Not monitored',
        ],
        actions: [{ label: 'Open official document' }],
      },
      {
        title: 'Substantive issues and decisions',
        items: ['Compact issue cards and unlinked decision rows'],
        actions: [
          { href: '/issues/surplus-pickup-donations', label: 'View issue' },
        ],
      },
      {
        title: 'Routine records',
        items: [
          'Collapsed by default with a visible count and full search access',
        ],
      },
      {
        title: 'Source availability and versions',
        items: ['Last checked and expected artifact status'],
        actions: [{ label: 'Report a source problem' }],
      },
    ],
  },
  'how-it-works': {
    eyebrow: 'Method',
    title: 'How Public Parish works',
    description:
      'The public method explains where claims come from, when information stays limited, and how corrections enter normal update history.',
    fixture:
      'Design fixture: resident-readable method outline. No integration behavior is simulated.',
    actions: [
      { href: '/coverage', label: 'View coverage', treatment: 'primary' },
      {
        href: 'https://github.com/LaykenV/public-parish',
        label: 'Open-source code',
      },
    ],
    states: ['Resident explanation', 'Optional technical details'],
    sections: [
      {
        title: 'Official sources and Source controls',
        items: [
          'Claims stay attached to exact excerpts from validated official records',
        ],
      },
      {
        title: 'Checks, review, and limited information',
        items: [
          'Deterministic checks and independent review run before publication',
          'Missing evidence stays missing',
        ],
      },
      {
        title: 'Neutrality, privacy, and coverage',
        items: [
          'No position-taking',
          'No street address required',
          'One evidence standard for every supported body',
        ],
      },
      {
        title: 'Technical details',
        items: [
          'Optional disclosure for model roles, hashes, pipeline stages, and providers',
        ],
      },
    ],
  },
  following: {
    eyebrow: 'Following',
    title: 'Manage the updates you asked for',
    description:
      'Following orders saved targets by the latest material change or next known date.',
    fixture: 'Design fixture: signed-in resident with one active issue follow.',
    actions: [
      {
        href: '/explore',
        label: 'Browse current issues',
        treatment: 'primary',
      },
    ],
    states: [
      'Signed out',
      'Signed in',
      'Empty',
      'Active',
      'Muted',
      'Coverage degraded',
    ],
    sections: [
      {
        title: 'Views',
        items: ['Following', 'Areas and topics', 'Notifications'],
        actions: [
          { href: '/following', label: 'Following' },
          { href: '/following/areas-and-topics', label: 'Areas and topics' },
          { href: '/following/notifications', label: 'Notifications' },
        ],
      },
      {
        title: 'Followed targets',
        items: [
          'Target, latest change, next date, delivery frequency, coverage health, and Manage',
        ],
        actions: [
          { label: 'Manage' },
          { label: 'Mute' },
          { label: 'Unfollow' },
        ],
      },
    ],
  },
  'areas-and-topics': {
    eyebrow: 'Following',
    title: 'Areas and topics',
    description:
      'Saved interests affect For You. Temporary Explore filters stay separate.',
    fixture: 'Design fixture: one saved area and no saved topics.',
    actions: [{ label: 'Save interests', treatment: 'primary' }],
    states: [
      'One signed-out area',
      'Several signed-in areas',
      'No topics',
      'Unsupported place',
    ],
    sections: [
      {
        title: 'Following views',
        items: ['Following', 'Areas and topics', 'Notifications'],
        actions: [
          { href: '/following', label: 'Following' },
          { href: '/following/notifications', label: 'Notifications' },
        ],
      },
      {
        title: 'Saved areas',
        items: [
          'Lafayette Parish',
          'No street address needed',
          'Validating areas cannot be selected',
        ],
        actions: [
          { label: 'Change area' },
          { href: '/coverage/request', label: 'Request coverage' },
        ],
      },
      {
        title: 'Saved topics',
        items: ['Topic choices remain optional and editable'],
        actions: [{ label: 'Add topic' }],
      },
    ],
  },
  notifications: {
    eyebrow: 'Following',
    title: 'Notification preferences',
    description:
      'Residents can choose immediate material updates, a weekly roundup, or both. Empty roundups are never sent.',
    fixture: 'Design fixture: immediate updates enabled.',
    actions: [{ label: 'Save notification settings', treatment: 'primary' }],
    states: [
      'Immediate',
      'Weekly roundup',
      'Both',
      'Delivery degraded',
      'Saved inline',
    ],
    sections: [
      {
        title: 'Following views',
        items: ['Following', 'Areas and topics', 'Notifications'],
        actions: [
          { href: '/following', label: 'Following' },
          { href: '/following/areas-and-topics', label: 'Areas and topics' },
        ],
      },
      {
        title: 'Delivery schedule',
        items: ['Immediate material updates', 'Weekly roundup', 'Both'],
      },
      {
        title: 'Alert anatomy',
        items: [
          'What changed first',
          'Current state or next date',
          'Why it may matter',
          'Official source receipts',
          'Manage delivery',
        ],
      },
    ],
  },
  'email-management': {
    eyebrow: 'Email-only follow',
    title: 'Manage this follow',
    description:
      'This secure page changes one email-only subscription. It does not create an account or reveal other follows.',
    fixture:
      'Design fixture: scoped management token. No preference is changed.',
    actions: [
      { label: 'Save delivery frequency', treatment: 'primary' },
      { label: 'Mute' },
      { label: 'Unfollow' },
    ],
    states: [
      'Valid link',
      'Expired link',
      'Muted',
      'Delivery failure',
      'Saved inline',
    ],
    sections: [
      {
        title: 'Subscription',
        items: [
          'Issue title',
          'Verified delivery destination',
          'Only you can manage these settings',
        ],
      },
      {
        title: 'Delivery frequency',
        items: ['Immediate material updates', 'Weekly roundup', 'Both'],
      },
      {
        title: 'Expired link recovery',
        items: [
          'Verify another short-lived code without creating a user session',
        ],
      },
    ],
  },
}

export function getResidentBlueprint(key: BlueprintKey): ResidentBlueprint {
  return BLUEPRINTS[key]
}

export const RESIDENT_BLUEPRINT_KEYS = [
  'for-you',
  'explore',
  'ask',
  'coverage',
  'coverage-request',
  'issue',
  'decision',
  'meeting',
  'how-it-works',
  'following',
  'areas-and-topics',
  'notifications',
  'email-management',
] as const satisfies readonly BlueprintKey[]
