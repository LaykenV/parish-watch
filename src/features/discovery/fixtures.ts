import type {
  AreaRecord,
  IssueCardData,
  ResultRowData,
  UpdateEntryData,
  UpcomingItemData,
} from './contracts'

/*
  Design fixtures for the discovery slices. These records drive deterministic
  QA scenarios and are not production civic claims. The surplus pickup issue
  mirrors the real development evidence (issue n57071y9n25rrs09yaanb1hz918dd1fs,
  records CO-022-2026 and CO-023-2026, meeting of April 21, 2026) and exists to
  stress long titles and sparse fields. Fixture data must never enter
  production data or public copy.
*/

export const FIXTURE_TODAY = '2026-08-29'

export const AREA_FIXTURES: AreaRecord[] = [
  {
    name: 'Lafayette Parish',
    slug: 'lafayette-parish',
    status: 'available',
    note: 'Accepted decision records are available. Complete government-body coverage is a separate gate.',
  },
  {
    name: 'East Baton Rouge Parish',
    slug: 'east-baton-rouge-parish',
    status: 'validating',
    note: 'Sources are being validated. This area opens after accepted decision records are available.',
  },
  {
    name: 'Rapides Parish',
    slug: 'rapides-parish',
    status: 'validating',
    note: 'Sources are being validated. This area opens after they pass the same evidence gate.',
  },
]

export const ISSUE_FIXTURES: IssueCardData[] = [
  {
    body: 'Lafayette City-Parish Council',
    evidence: { checked: '2026-08-27', status: 'Evidence available' },
    nextDate: { date: '2026-09-15', label: 'Final vote' },
    place: 'Lafayette Parish',
    placeSlug: 'lafayette-parish',
    slug: 'drainage-fee-credit-cap',
    state: 'Scheduled',
    title: 'Lafayette plans to lower the cap on drainage fee credits for 2027',
    topics: ['Drainage', 'Public money'],
    whyMatter:
      'The credit cap decides how much large property owners can reduce their drainage fees, which changes what is left in the drainage budget.',
  },
  {
    body: 'Lafayette City-Parish Council',
    evidence: { checked: '2026-08-25', status: 'Evidence available' },
    latestOutcome: { date: '2026-04-21', label: 'Council approved' },
    place: 'Lafayette Parish',
    placeSlug: 'lafayette-parish',
    slug: 'surplus-pickup-donations',
    state: 'Decided',
    title:
      'Lafayette donates a surplus 2016 Crew Cab pickup to Terrebonne Parish through a cooperative agreement',
    topics: ['Public assets'],
    whyMatter:
      'The donation moves a public asset between parishes through a cooperative agreement, with no payment to Lafayette.',
  },
  {
    body: 'Baton Rouge Metropolitan Council',
    evidence: { checked: '2026-08-26', status: 'Evidence available' },
    nextDate: { date: '2026-09-09', label: 'Final vote' },
    place: 'East Baton Rouge Parish',
    placeSlug: 'east-baton-rouge-parish',
    slug: 'water-meter-replacement',
    state: 'In progress',
    title:
      'Baton Rouge advances a citywide water meter replacement to a final vote',
    topics: ['Public money'],
    whyMatter:
      'Meter replacement changes how water bills are measured and disputed across the city.',
  },
  {
    body: 'Lafayette City Council',
    evidence: {
      checked: '2026-08-24',
      note: 'The council postponed this item on Aug 18. A new consideration date is not posted.',
      status: 'Limited information',
    },
    place: 'Lafayette Parish',
    placeSlug: 'lafayette-parish',
    slug: 'downtown-late-night-permits',
    state: 'In progress',
    title:
      'Lafayette considers later operating hours for downtown alcohol permits',
    topics: ['Public safety'],
    whyMatter:
      'The change affects when downtown venues may serve alcohol and how the area is patrolled.',
  },
  {
    body: 'Lafayette City-Parish Council',
    evidence: {
      checked: '2026-08-27',
      note: 'Agenda packets after July are posting late. The official source is delayed.',
      status: 'Source delayed',
    },
    nextDate: { date: '2026-09-08', label: 'Introduction' },
    place: 'Lafayette Parish',
    placeSlug: 'lafayette-parish',
    slug: 'courthouse-security-contract',
    state: 'Scheduled',
    title: 'Lafayette considers a contract for courthouse security staffing',
    topics: ['Public money', 'Public safety'],
    whyMatter:
      'The contract decides who staffs courthouse entrances and what the parish pays for coverage.',
  },
  {
    body: 'Lafayette City-Parish Council',
    evidence: { checked: '2026-08-25', status: 'Evidence available' },
    nextDate: { date: '2026-09-08', label: 'Agenda item' },
    place: 'Lafayette Parish',
    placeSlug: 'lafayette-parish',
    slug: 'curbside-recycling-contract',
    state: 'Scheduled',
    title: 'Lafayette considers a new curbside recycling contract',
    topics: ['Public money'],
    whyMatter:
      'The contract decides whether curbside recycling continues and what service costs the city.',
  },
  {
    body: 'Baton Rouge Metropolitan Council',
    evidence: { checked: '2026-08-26', status: 'Evidence available' },
    nextDate: { date: '2026-09-22', label: 'Planning vote' },
    place: 'East Baton Rouge Parish',
    placeSlug: 'east-baton-rouge-parish',
    slug: 'short-term-rental-rules',
    state: 'In progress',
    title: 'Baton Rouge updates its rules for short-term rentals',
    topics: ['Housing'],
    whyMatter:
      'The rules decide where short-term rentals may operate and what hosts must register.',
  },
]

export const PUBLISHED_ISSUE_FIXTURES: IssueCardData[] = [
  {
    body: 'Lafayette City-Parish Council',
    evidence: {
      checked: '2026-08-31',
      note: 'Built from 2 linked official decision records.',
      status: 'Evidence available',
    },
    href: '/issues/surplus-2016-crew-cab-pickup-donations-to-terrebonne-parish-consolidat-9c21a0b1',
    latestOutcome: { date: '2026-04-21', label: 'Latest record' },
    place: 'Lafayette Parish',
    placeSlug: 'lafayette-parish',
    slug: 'surplus-2016-crew-cab-pickup-donations-to-terrebonne-parish-consolidat-9c21a0b1',
    state: 'Decided',
    title:
      'Surplus 2016 crew-cab pickup donations to Terrebonne Parish Consolidated Government',
    topics: ['Public assets'],
    whyMatter:
      'Two related council actions document Lafayette donating a surplus public vehicle to Terrebonne Parish.',
  },
  {
    body: 'Rapides Parish Police Jury',
    evidence: {
      checked: '2026-08-31',
      note: 'Built from 2 linked official decision records.',
      status: 'Evidence available',
    },
    href: '/issues/2026-millage-levy-on-the-rapides-parish-tax-roll-755c2f58',
    latestOutcome: { date: '2026-06-09', label: 'Latest record' },
    place: 'Rapides Parish',
    placeSlug: 'rapides-parish',
    slug: '2026-millage-levy-on-the-rapides-parish-tax-roll-755c2f58',
    state: 'Decided',
    title: '2026 millage levy on the Rapides Parish tax roll',
    topics: ['Public money'],
    whyMatter:
      'The timeline connects the parish actions that set the 2026 property-tax millage levy.',
  },
]

export const UPCOMING_FIXTURES: UpcomingItemData[] = [
  {
    body: 'Lafayette Planning Commission',
    date: '2026-09-03T17:00:00-05:00',
    detail: 'Agenda available',
    href: '/meetings/lafayette-planning-commission-2026-09-03',
    kind: 'meeting',
    place: 'Lafayette Parish',
    placeSlug: 'lafayette-parish',
    title: 'Planning Commission meeting',
  },
  {
    body: 'Lafayette City Council',
    date: '2026-09-08T17:30:00-05:00',
    detail: 'Agenda available',
    href: '/meetings/lafayette-city-council-2026-09-08',
    kind: 'meeting',
    place: 'Lafayette Parish',
    placeSlug: 'lafayette-parish',
    title: 'City Council regular meeting',
  },
  {
    body: 'Baton Rouge Metropolitan Council',
    date: '2026-09-09T16:00:00-05:00',
    detail: 'Agenda expected Sep 4',
    href: '/meetings/baton-rouge-metro-council-2026-09-09',
    kind: 'meeting',
    place: 'East Baton Rouge Parish',
    placeSlug: 'east-baton-rouge-parish',
    title: 'Metropolitan Council meeting',
  },
  {
    body: 'Lafayette City-Parish Council',
    date: '2026-09-15T17:30:00-05:00',
    detail: 'Drainage fee credit cap, final vote',
    href: '/issues/drainage-fee-credit-cap',
    kind: 'issue',
    place: 'Lafayette Parish',
    placeSlug: 'lafayette-parish',
    title: 'City-Parish Council meeting',
  },
]

export const UPDATE_FIXTURES: UpdateEntryData[] = [
  {
    date: '2026-08-27',
    issueSlug: 'drainage-fee-credit-cap',
    issueTitle: 'drainage fee credit cap',
    kind: 'Government update',
    text: 'The City-Parish Council set the drainage fee credit cap for a final vote on Sep 15.',
  },
  {
    date: '2026-08-25',
    issueSlug: 'curbside-recycling-contract',
    issueTitle: 'recycling contract',
    kind: 'More information posted',
    text: 'The city posted the recycling contract agenda packet and the vendor scoring notes.',
  },
  {
    date: '2026-08-21',
    issueSlug: 'water-meter-replacement',
    issueTitle: 'water meter replacement',
    kind: 'Government update',
    text: 'The Metropolitan Council released the final contract draft for the meter program.',
  },
  {
    date: '2026-08-18',
    issueSlug: 'surplus-pickup-donations',
    issueTitle: 'surplus pickup donation',
    kind: 'Public Parish correction',
    text: 'Public Parish corrected the decision record. The council acted on Apr 21, not Aug 4.',
  },
  {
    date: '2026-04-21',
    issueSlug: 'surplus-pickup-donations',
    issueTitle: 'surplus pickup donation',
    kind: 'Outcome',
    text: 'The City-Parish Council approved donating a surplus 2016 Crew Cab pickup to Terrebonne Parish.',
  },
]

export const UPDATE_REFRESH_FIXTURE: UpdateEntryData = {
  date: '2026-08-29',
  issueSlug: 'downtown-late-night-permits',
  issueTitle: 'downtown late-night permits',
  kind: 'Government update',
  text: 'The council clerk posted a new consideration date for the permit item: Oct 6.',
}

export const EXPLORE_ROW_FIXTURES: ResultRowData[] = [
  {
    body: 'Lafayette City-Parish Council',
    date: '2026-09-15',
    href: '/decisions/ord-drainage-fee-credit-2027',
    id: 'ORD-2026-0915 (draft)',
    kind: 'Decision record',
    place: 'Lafayette Parish',
    state: 'Scheduled',
    title: 'Adopt the 2027 drainage fee credit cap',
  },
  {
    body: 'Lafayette City-Parish Council',
    date: '2026-09-08',
    href: '/decisions/res-recycling-contract-2026',
    id: 'RES-2026-084',
    kind: 'Decision record',
    place: 'Lafayette Parish',
    state: 'Scheduled',
    title: 'Award the curbside recycling collection contract',
  },
  {
    body: 'Baton Rouge Metropolitan Council',
    date: '2026-09-22',
    href: '/decisions/ord-short-term-rental-update',
    id: 'O-59642 (draft)',
    kind: 'Decision record',
    place: 'East Baton Rouge Parish',
    state: 'Scheduled',
    title: 'Update the short-term rental registration rules',
  },
  {
    body: 'Lafayette City Council',
    date: '2026-09-08',
    href: '/meetings/lafayette-city-council-2026-09-08',
    kind: 'Meeting',
    place: 'Lafayette Parish',
    title: 'City Council regular meeting',
  },
  {
    body: 'Baton Rouge Metropolitan Council',
    date: '2026-09-09',
    href: '/meetings/baton-rouge-metro-council-2026-09-09',
    kind: 'Meeting',
    place: 'East Baton Rouge Parish',
    title: 'Metropolitan Council meeting',
  },
  {
    coverage: 'Supported',
    href: '/coverage',
    kind: 'Government body',
    place: 'Lafayette Parish',
    title: 'Lafayette City-Parish Council',
  },
  {
    coverage: 'Supported',
    href: '/coverage',
    kind: 'Government body',
    place: 'Lafayette Parish',
    title: 'Lafayette City Council',
  },
  {
    coverage: 'Validating sources',
    href: '/coverage',
    kind: 'Government body',
    place: 'East Baton Rouge Parish',
    title: 'Baton Rouge Metropolitan Council',
  },
  {
    date: '2026-04-21',
    href: '/decisions/CO-022-2026',
    id: 'CO-022-2026',
    kind: 'Decision record',
    place: 'Lafayette Parish',
    state: 'Decided',
    title:
      'Authorize a cooperative endeavor agreement and act of donation with Terrebonne Parish',
  },
  {
    date: '2026-04-21',
    href: '/decisions/CO-023-2026',
    id: 'CO-023-2026',
    kind: 'Decision record',
    place: 'Lafayette Parish',
    state: 'Decided',
    title: 'Execute the act of donation for a surplus 2016 Crew Cab pickup',
  },
  {
    date: '2026-08-18',
    href: '/decisions/min-lafayette-city-council-2026-08-18',
    kind: 'Routine record',
    place: 'Lafayette Parish',
    title: 'Adopt the Aug 18 City Council meeting minutes',
  },
  {
    date: '2026-08-31',
    href: '/decisions/disbursement-report-2026-07',
    kind: 'Routine record',
    place: 'Lafayette Parish',
    title: 'Disbursement report for July 2026',
  },
  {
    date: '2026-09-01',
    href: '/decisions/public-comment-period-2026-09',
    kind: 'Routine record',
    place: 'East Baton Rouge Parish',
    title: 'Open the September public comment period',
  },
]
