import type { AreaSlug, LifecycleState } from '../discovery/contracts'
import type {
  CitationData,
  CitationMap,
  IssueDetailFixture,
  IssueLiveUpdate,
  MarkedDate,
} from './contracts'

/*
  Design fixtures for the issues-and-evidence slice. Nothing here is a
  production civic claim. The surplus pickup issue mirrors the real development
  evidence (issue n57071y9n25rrs09yaanb1hz918dd1fs, records CO-022-2026 and
  CO-023-2026, meeting of April 21, 2026) so long titles, sparse fields, and a
  limited-to-full history get stressed. Official document links point at the
  real council record search rather than an invented file URL. Fixture data must
  never enter production data or public copy.
*/

const LAFAYETTE_RECORDS = 'https://apps.lafayettela.gov/obcouncil/index.html'
const BATON_ROUGE_AGENDAS =
  'https://www.brla.gov/AgendaCenter/Metropolitan-Council-3'
const LAFAYETTE_SCHEDULE =
  'https://www.lafayettela.gov/your-government/city-and-parish-councils/schedule-research-ord-reso/'

const LCPC = 'Lafayette City-Parish Council'
const LCC = 'Lafayette City Council'
const BRMC = 'Baton Rouge Metropolitan Council'

function citations(list: CitationData[]): CitationMap {
  return Object.fromEntries(list.map((entry) => [entry.id, entry]))
}

/* Issue: surplus pickup donation. Real development evidence, decided, sparse. */

const SURPLUS_CITATIONS = citations([
  {
    body: LCPC,
    documentKind: 'Minutes',
    documentTitle: 'City-Parish Council minutes, April 21, 2026',
    excerpt: {
      after:
        'The vote was recorded as 9 yeas, 0 nays, 0 absent. The Chair declared the ordinance adopted.',
      before:
        'Item 14. Ordinance CO-022-2026 was called for final consideration.',
      quote:
        'On motion of Councilman Boudreaux, seconded by Councilwoman Guilbeau, the Council adopted an ordinance authorizing a cooperative endeavor agreement and act of donation with Terrebonne Parish Consolidated Government for one surplus 2016 Crew Cab pickup truck.',
    },
    id: 'surplus.outcome',
    locator: 'Minutes p.7',
    officialUrl: LAFAYETTE_RECORDS,
    page: 7,
    retrievedAt: '2026-08-25',
    warning:
      'This page came from a scanned PDF. Text was read by OCR and may contain character errors.',
  },
  {
    body: LCPC,
    documentKind: 'Ordinance',
    documentTitle: 'Ordinance CO-022-2026',
    excerpt: {
      after:
        'The vehicle is declared surplus and no longer needed for a public purpose of Lafayette Consolidated Government.',
      quote:
        'An ordinance authorizing the Lafayette City-Parish President to execute a cooperative endeavor agreement and an act of donation with the Terrebonne Parish Consolidated Government conveying one (1) surplus 2016 Chevrolet Silverado Crew Cab pickup truck, VIN ending 4417, at no cost to the recipient.',
    },
    id: 'surplus.happening-1',
    locator: 'CO-022-2026 §1',
    officialUrl: LAFAYETTE_RECORDS,
    retrievedAt: '2026-08-25',
    section: 'Section 1',
  },
  {
    body: LCPC,
    documentKind: 'Ordinance',
    documentTitle: 'Ordinance CO-023-2026',
    excerpt: {
      quote:
        'An ordinance authorizing the execution of the act of donation transferring title to the surplus 2016 Crew Cab pickup truck described in CO-022-2026, with all transfer costs borne by the recipient parish.',
    },
    id: 'surplus.happening-2',
    locator: 'CO-023-2026 §1',
    officialUrl: LAFAYETTE_RECORDS,
    retrievedAt: '2026-08-25',
    section: 'Section 1',
  },
  {
    body: LCPC,
    documentKind: 'Ordinance',
    documentTitle: 'Ordinance CO-022-2026',
    excerpt: {
      after:
        'No monetary consideration shall be paid to Lafayette Consolidated Government under this agreement.',
      quote:
        'The donation of the surplus vehicle is made pursuant to Article VII, Section 14(C) of the Louisiana Constitution for a public purpose, namely mutual assistance in parish public works operations.',
    },
    id: 'surplus.factor-assets',
    locator: 'CO-022-2026 §2',
    officialUrl: LAFAYETTE_RECORDS,
    retrievedAt: '2026-08-25',
    section: 'Section 2',
  },
  {
    body: LCPC,
    documentKind: 'Agenda',
    documentTitle: 'City-Parish Council agenda, April 21, 2026',
    excerpt: {
      before: 'FINAL ADOPTION',
      quote:
        'CO-022-2026 and CO-023-2026: ordinances authorizing a cooperative endeavor agreement, and the act of donation, with Terrebonne Parish Consolidated Government for a surplus 2016 Crew Cab pickup truck.',
    },
    id: 'surplus.timeline-scheduled',
    locator: 'Agenda p.3',
    officialUrl: LAFAYETTE_RECORDS,
    page: 3,
    retrievedAt: '2026-04-14',
  },
])

const SURPLUS_ISSUE: IssueDetailFixture = {
  citations: SURPLUS_CITATIONS,
  issue: {
    body: LCPC,
    changes: [
      {
        citationId: 'surplus.outcome',
        date: '2026-08-18',
        from: 'Council acted on Aug 4, 2026',
        kind: 'Public Parish correction',
        text: 'Public Parish read the wrong meeting date from the minutes index. The Council adopted both ordinances on Apr 21, 2026.',
        to: 'Council acted on Apr 21, 2026',
      },
      {
        citationId: 'surplus.outcome',
        date: '2026-04-28',
        kind: 'More information posted',
        text: 'The Council posted the April 21 minutes. The recorded vote and the adopted ordinance text replaced the agenda-only description.',
      },
      {
        citationId: 'surplus.timeline-scheduled',
        date: '2026-04-14',
        kind: 'Government update',
        text: 'Both ordinances were placed on the April 21 agenda for final adoption.',
      },
    ],
    documents: [
      {
        citationId: 'surplus.outcome',
        kind: 'Minutes',
        officialUrl: LAFAYETTE_RECORDS,
        retrievedAt: '2026-08-25',
        title: 'City-Parish Council minutes, April 21, 2026',
      },
      {
        citationId: 'surplus.happening-1',
        kind: 'Ordinance',
        officialUrl: LAFAYETTE_RECORDS,
        retrievedAt: '2026-08-25',
        title: 'Ordinance CO-022-2026',
      },
      {
        citationId: 'surplus.happening-2',
        kind: 'Ordinance',
        officialUrl: LAFAYETTE_RECORDS,
        retrievedAt: '2026-08-25',
        title: 'Ordinance CO-023-2026',
      },
      {
        citationId: 'surplus.timeline-scheduled',
        kind: 'Agenda',
        officialUrl: LAFAYETTE_RECORDS,
        retrievedAt: '2026-04-14',
        title: 'City-Parish Council agenda, April 21, 2026',
      },
    ],
    evidence: { checked: '2026-08-25', status: 'Evidence available' },
    factors: [
      {
        citationId: 'surplus.factor-assets',
        factor: 'Public assets',
        text: 'A vehicle owned by Lafayette leaves the parish at no cost, under a cooperative endeavor agreement rather than a sale.',
      },
    ],
    happening: [
      {
        citationId: 'surplus.happening-1',
        text: 'The City-Parish Council authorized the parish president to sign a cooperative endeavor agreement and an act of donation giving a surplus 2016 Crew Cab pickup to Terrebonne Parish Consolidated Government.',
      },
      {
        citationId: 'surplus.happening-2',
        text: 'A second ordinance authorized the act of donation itself. Terrebonne Parish pays the transfer costs. Lafayette receives no payment for the truck.',
      },
      {
        citationId: 'surplus.outcome',
        text: 'The Council adopted both ordinances on April 21, 2026 by a recorded vote of 9 to 0.',
      },
    ],
    latestOutcome: {
      citationId: 'surplus.outcome',
      date: '2026-04-21',
      label: 'Council approved',
    },
    mode: 'full',
    place: 'Lafayette Parish',
    placeSlug: 'lafayette-parish',
    publicActions: [],
    slug: 'surplus-pickup-donations',
    state: 'Decided',
    timeline: [
      {
        citationId: 'surplus.timeline-scheduled',
        date: '2026-04-14',
        recordKey: 'CO-022-2026',
        state: 'Scheduled',
        summary:
          'Both ordinances were set for final adoption at the April 21 meeting.',
        type: 'Scheduled for final adoption',
      },
      {
        citationId: 'surplus.outcome',
        date: '2026-04-21',
        meaningfulChange:
          'The recorded vote replaced the scheduled description with an adopted outcome.',
        recordKey: 'CO-022-2026',
        state: 'Decided',
        summary:
          'The Council adopted the cooperative endeavor agreement ordinance, 9 to 0.',
        type: 'Council vote',
      },
      {
        citationId: 'surplus.happening-2',
        date: '2026-04-21',
        recordKey: 'CO-023-2026',
        state: 'Decided',
        summary: 'The Council adopted the act of donation ordinance, 9 to 0.',
        type: 'Council vote',
      },
    ],
    title:
      'Lafayette donates a surplus 2016 Crew Cab pickup to Terrebonne Parish through a cooperative agreement',
    uncertain: [],
    versions: [
      {
        date: '2026-08-18',
        mode: 'Full',
        note: 'Corrected the adoption date to April 21, 2026.',
        version: 3,
      },
      {
        date: '2026-04-28',
        mode: 'Full',
        note: 'Minutes replaced the agenda-only description and added the recorded vote.',
        version: 2,
      },
      {
        date: '2026-04-14',
        mode: 'Limited',
        note: 'The agenda supported the title and body only. No explanation was published.',
        version: 1,
      },
    ],
  },
  scenarioLabel:
    'Decided issue with no next action, mirroring the real development evidence.',
}

/* Issue: drainage fee credit cap. Future action, deadline, uncertain link. */

const DRAINAGE_CITATIONS = citations([
  {
    body: LCPC,
    documentKind: 'Agenda',
    documentTitle: 'City-Parish Council agenda, September 15, 2026',
    excerpt: {
      after:
        'Public comment on this item will be received at the meeting and in writing through the Clerk of the Council.',
      before: 'FINAL ADOPTION, item 22.',
      quote:
        'An ordinance amending the drainage fee credit program to set the maximum annual credit at 25 percent of the assessed drainage fee for any single parcel, effective for the 2027 assessment year.',
    },
    id: 'drainage.next',
    locator: 'Agenda p.4',
    officialUrl: LAFAYETTE_RECORDS,
    page: 4,
    retrievedAt: '2026-08-27',
  },
  {
    body: LCPC,
    documentKind: 'Public notice',
    documentTitle: 'Notice of public hearing, drainage fee credit amendment',
    excerpt: {
      quote:
        'Written comment on the proposed amendment must be received by the Clerk of the Council no later than 4:30 p.m. on Friday, September 11, 2026 to be entered into the record of the September 15 meeting.',
    },
    id: 'drainage.deadline',
    locator: 'Notice §3',
    officialUrl: LAFAYETTE_SCHEDULE,
    retrievedAt: '2026-08-27',
    section: 'Section 3',
  },
  {
    body: LCPC,
    documentKind: 'Ordinance',
    documentTitle: 'Ordinance O-2026-0915, introduced August 18, 2026',
    excerpt: {
      after:
        'Nothing in this Section shall be construed to alter the drainage fee rate itself.',
      before:
        'Section 2. Amendment of Section 34-155 of the Code of Ordinances.',
      quote:
        'Subsection (b) is hereby amended to read: the credit granted to any parcel for on-site detention, retention, or other approved drainage improvements shall not exceed twenty-five percent (25%) of the drainage fee otherwise assessed against that parcel in any assessment year. The prior limit of fifty percent (50%) is repealed. Credits approved before the effective date of this ordinance shall be recalculated at the amended limit beginning with the 2027 assessment year, and the Department of Public Works shall notify each affected parcel owner in writing not less than sixty (60) days before the recalculated fee is assessed.',
    },
    id: 'drainage.happening-1',
    locator: 'O-2026-0915 §2',
    officialUrl: LAFAYETTE_RECORDS,
    retrievedAt: '2026-08-27',
    section: 'Section 2',
  },
  {
    body: LCPC,
    documentKind: 'Agenda packet',
    documentTitle: 'Public Works memorandum, drainage credit program review',
    excerpt: {
      after:
        'Staff recommends the amended limit to stabilize the drainage capital plan.',
      quote:
        'Under the current 50 percent limit, credited parcels reduced fiscal year 2026 drainage fee collections by approximately $2.1 million, of which 71 percent was credited to eleven commercial parcels.',
      before: 'Fiscal impact.',
    },
    id: 'drainage.factor-money',
    locator: 'Packet p.12',
    officialUrl: LAFAYETTE_RECORDS,
    page: 12,
    retrievedAt: '2026-08-27',
    warning:
      'The memorandum table continues past the retrieved page. Later pages were not part of this snapshot.',
  },
  {
    body: LCPC,
    documentKind: 'Ordinance',
    documentTitle: 'Ordinance O-2026-0915, introduced August 18, 2026',
    excerpt: {
      quote:
        'The Department of Public Works shall notify each affected parcel owner in writing not less than sixty (60) days before the recalculated fee is assessed.',
    },
    id: 'drainage.factor-service',
    locator: 'O-2026-0915 §2',
    officialUrl: LAFAYETTE_RECORDS,
    retrievedAt: '2026-08-27',
    section: 'Section 2',
  },
  {
    body: LCPC,
    documentKind: 'Minutes',
    documentTitle: 'City-Parish Council minutes, August 18, 2026',
    excerpt: {
      quote:
        'The ordinance was introduced and set for public hearing and final adoption on September 15, 2026.',
    },
    id: 'drainage.timeline-introduced',
    locator: 'Minutes p.5',
    officialUrl: LAFAYETTE_RECORDS,
    page: 5,
    retrievedAt: '2026-08-27',
  },
  {
    body: LCPC,
    documentKind: 'Agenda',
    documentTitle: 'City-Parish Council agenda, September 15, 2026',
    excerpt: {
      quote:
        'Item 27. A resolution accepting the fiscal year 2027 drainage capital improvement schedule as submitted by the Department of Public Works.',
    },
    id: 'drainage.uncertain',
    locator: 'Agenda p.6',
    officialUrl: LAFAYETTE_RECORDS,
    page: 6,
    retrievedAt: '2026-08-27',
  },
])

const DRAINAGE_ISSUE: IssueDetailFixture = {
  citations: DRAINAGE_CITATIONS,
  issue: {
    body: LCPC,
    changes: [
      {
        citationId: 'drainage.next',
        date: '2026-08-27',
        kind: 'Government update',
        text: 'The Clerk placed the ordinance on the September 15 agenda for final adoption.',
      },
      {
        citationId: 'drainage.factor-money',
        date: '2026-08-20',
        kind: 'More information posted',
        text: 'The agenda packet added the Public Works memorandum with the fiscal year 2026 credit totals.',
      },
      {
        citationId: 'drainage.timeline-introduced',
        date: '2026-08-18',
        kind: 'Government update',
        text: 'The Council introduced the ordinance and set the public hearing.',
      },
    ],
    deadline: {
      citationId: 'drainage.deadline',
      date: '2026-09-11',
      label: 'Written comment closes',
      time: '4:30 PM CDT',
    },
    documents: [
      {
        citationId: 'drainage.next',
        kind: 'Agenda',
        officialUrl: LAFAYETTE_RECORDS,
        retrievedAt: '2026-08-27',
        title: 'City-Parish Council agenda, September 15, 2026',
      },
      {
        citationId: 'drainage.happening-1',
        kind: 'Ordinance',
        officialUrl: LAFAYETTE_RECORDS,
        retrievedAt: '2026-08-27',
        title: 'Ordinance O-2026-0915, introduced August 18, 2026',
      },
      {
        citationId: 'drainage.factor-money',
        kind: 'Agenda packet',
        note: 'Retrieved page 12 only. Later pages of the table were not in this snapshot.',
        officialUrl: LAFAYETTE_RECORDS,
        retrievedAt: '2026-08-27',
        title: 'Public Works memorandum, drainage credit program review',
      },
      {
        citationId: 'drainage.deadline',
        kind: 'Public notice',
        officialUrl: LAFAYETTE_SCHEDULE,
        retrievedAt: '2026-08-27',
        title: 'Notice of public hearing, drainage fee credit amendment',
      },
      {
        citationId: 'drainage.timeline-introduced',
        kind: 'Minutes',
        officialUrl: LAFAYETTE_RECORDS,
        retrievedAt: '2026-08-27',
        title: 'City-Parish Council minutes, August 18, 2026',
      },
    ],
    evidence: { checked: '2026-08-27', status: 'Evidence available' },
    factors: [
      {
        citationId: 'drainage.factor-money',
        factor: 'Public money',
        text: 'Credited parcels reduced drainage fee collections by about $2.1 million in fiscal year 2026, and eleven commercial parcels took 71 percent of that amount.',
      },
      {
        citationId: 'drainage.factor-service',
        factor: 'Service delivery',
        text: 'Every parcel with an approved credit gets a recalculated fee, and Public Works must mail notice at least 60 days before it is assessed.',
      },
    ],
    happening: [
      {
        citationId: 'drainage.happening-1',
        text: 'The Council is considering an ordinance that would cut the drainage fee credit limit from 50 percent of the fee on a parcel to 25 percent, starting with the 2027 assessment year.',
      },
      {
        citationId: 'drainage.happening-1',
        text: 'Credits already approved would be recalculated at the lower limit rather than kept at the old one. Public Works would have to notify each affected owner in writing at least 60 days before the new fee is assessed.',
      },
      {
        citationId: 'drainage.next',
        text: 'The City-Parish Council decides. Final adoption is set for the September 15 meeting.',
      },
    ],
    mode: 'full',
    next: {
      citationId: 'drainage.next',
      date: '2026-09-15',
      label: 'Final vote',
      time: '5:30 PM CDT',
    },
    place: 'Lafayette Parish',
    placeSlug: 'lafayette-parish',
    publicActions: [
      {
        citationId: 'drainage.deadline',
        deadline: '2026-09-11',
        instructions:
          'Written comment must reach the Clerk of the Council by 4:30 PM on Friday, September 11 to enter the record of the September 15 meeting.',
        label: 'Send written comment to the Clerk of the Council',
      },
      {
        citationId: 'drainage.next',
        instructions:
          'The agenda states that public comment on this item will be received at the September 15 meeting.',
        label: 'Speak at the September 15 public hearing',
      },
    ],
    slug: 'drainage-fee-credit-cap',
    state: 'Scheduled',
    timeline: [
      {
        citationId: 'drainage.timeline-introduced',
        date: '2026-08-18',
        recordKey: 'ord-drainage-fee-credit-2027',
        state: 'In progress',
        summary:
          'The Council introduced the ordinance and set a public hearing.',
        type: 'Ordinance introduced',
      },
      {
        citationId: 'drainage.next',
        date: '2026-09-15',
        meaningfulChange:
          'The agenda moved this item from introduced to final adoption.',
        recordKey: 'ord-drainage-fee-credit-2027',
        state: 'Scheduled',
        summary:
          'Final adoption and public hearing are set for the September 15 meeting.',
        type: 'Scheduled for final adoption',
      },
    ],
    title: 'Lafayette plans to lower the cap on drainage fee credits for 2027',
    uncertain: [
      {
        citationId: 'drainage.uncertain',
        reason:
          'Both items are on the same agenda and both concern drainage funding, but no official document ties the capital schedule to the credit cap.',
        recordKey: 'res-drainage-capital-schedule-2027',
        title:
          'Resolution accepting the fiscal year 2027 drainage capital improvement schedule',
      },
    ],
    versions: [
      {
        date: '2026-08-27',
        mode: 'Full',
        note: 'Added the September 15 final adoption date and the comment deadline.',
        version: 3,
      },
      {
        date: '2026-08-20',
        mode: 'Full',
        note: 'Added the fiscal impact factor from the agenda packet.',
        version: 2,
      },
      {
        date: '2026-08-18',
        mode: 'Full',
        note: 'First accepted version from the introduced ordinance.',
        version: 1,
      },
    ],
  },
  scenarioLabel:
    'Upcoming issue with a sourced deadline and one uncertain relationship.',
}

/* Issue: postponed permits. Limited information from the source. */

const PERMITS_CITATIONS = citations([
  {
    body: LCC,
    documentKind: 'Minutes',
    documentTitle: 'City Council minutes, August 18, 2026',
    excerpt: {
      after: 'The Council proceeded to item 12.',
      before: 'Item 11.',
      quote:
        'On motion duly made and seconded, consideration of the ordinance amending permitted hours of alcohol service in the Downtown Development District was postponed. No date was set.',
    },
    id: 'permits.postponed',
    locator: 'Minutes p.4',
    officialUrl: LAFAYETTE_RECORDS,
    page: 4,
    retrievedAt: '2026-08-24',
  },
  {
    body: LCC,
    documentKind: 'Agenda',
    documentTitle: 'City Council agenda, August 18, 2026',
    excerpt: {
      quote:
        'An ordinance amending Chapter 6 of the Code of Ordinances relative to permitted hours of alcohol service within the Downtown Development District.',
    },
    id: 'permits.title',
    locator: 'Agenda p.2',
    officialUrl: LAFAYETTE_RECORDS,
    page: 2,
    retrievedAt: '2026-08-24',
  },
])

const PERMITS_ISSUE: IssueDetailFixture = {
  citations: PERMITS_CITATIONS,
  issue: {
    body: LCC,
    changes: [
      {
        citationId: 'permits.postponed',
        date: '2026-08-24',
        kind: 'Government update',
        text: 'The minutes recorded the postponement. No new consideration date was set.',
      },
      {
        citationId: 'permits.title',
        date: '2026-08-11',
        kind: 'Government update',
        text: 'The ordinance was placed on the August 18 agenda.',
      },
    ],
    documents: [
      {
        citationId: 'permits.postponed',
        kind: 'Minutes',
        officialUrl: LAFAYETTE_RECORDS,
        retrievedAt: '2026-08-24',
        title: 'City Council minutes, August 18, 2026',
      },
      {
        citationId: 'permits.title',
        kind: 'Agenda',
        officialUrl: LAFAYETTE_RECORDS,
        retrievedAt: '2026-08-24',
        title: 'City Council agenda, August 18, 2026',
      },
    ],
    evidence: {
      checked: '2026-08-24',
      note: 'The Council postponed this item on Aug 18. A new consideration date is not posted.',
      status: 'Limited information',
    },
    factors: [],
    happening: [
      {
        citationId: 'permits.postponed',
        text: 'The City Council postponed an ordinance about permitted hours of alcohol service in the Downtown Development District. The minutes record no new date.',
      },
    ],
    limitedNote:
      'The available source supports the official title, the body, and the postponement. It does not state what the ordinance would change, who it affects, or when the Council will take it up again. Public Parish publishes the limited record rather than filling the gaps.',
    mode: 'limited',
    place: 'Lafayette Parish',
    placeSlug: 'lafayette-parish',
    publicActions: [],
    slug: 'downtown-late-night-permits',
    state: 'In progress',
    timeline: [
      {
        citationId: 'permits.title',
        date: '2026-08-11',
        state: 'Scheduled',
        summary: 'The ordinance was placed on the August 18 agenda.',
        type: 'Scheduled for consideration',
      },
      {
        citationId: 'permits.postponed',
        date: '2026-08-18',
        meaningfulChange:
          'The item left the calendar without a replacement date.',
        state: 'In progress',
        summary: 'The Council postponed consideration. No date was set.',
        type: 'Postponed',
      },
    ],
    title:
      'Lafayette considers later operating hours for downtown alcohol permits',
    uncertain: [],
    versions: [
      {
        date: '2026-08-24',
        mode: 'Limited',
        note: 'The minutes recorded a postponement without a new date.',
        version: 2,
      },
      {
        date: '2026-08-11',
        mode: 'Limited',
        note: 'The agenda supported the official title and the body only.',
        version: 1,
      },
    ],
  },
  scenarioLabel:
    'Limited issue. The source supports the title and the postponement, nothing more.',
}

/* Issue: courthouse security contract. Source delayed, last accepted version. */

const COURTHOUSE_CITATIONS = citations([
  {
    body: LCPC,
    documentKind: 'Agenda',
    documentTitle: 'City-Parish Council agenda, July 21, 2026',
    excerpt: {
      quote:
        'An ordinance authorizing a professional services contract for courthouse entrance screening and security staffing for a term of three years.',
    },
    id: 'courthouse.title',
    locator: 'Agenda p.5',
    officialUrl: LAFAYETTE_RECORDS,
    page: 5,
    retrievedAt: '2026-07-21',
  },
  {
    body: LCPC,
    documentKind: 'Minutes',
    documentTitle: 'City-Parish Council minutes, July 21, 2026',
    excerpt: {
      quote:
        'The ordinance was introduced and referred to the Public Safety Committee for review before final consideration.',
    },
    id: 'courthouse.introduced',
    locator: 'Minutes p.6',
    officialUrl: LAFAYETTE_RECORDS,
    page: 6,
    retrievedAt: '2026-07-28',
  },
])

const COURTHOUSE_ISSUE: IssueDetailFixture = {
  citations: COURTHOUSE_CITATIONS,
  issue: {
    body: LCPC,
    changes: [
      {
        citationId: 'courthouse.introduced',
        date: '2026-07-28',
        kind: 'More information posted',
        text: 'The July 21 minutes added the referral to the Public Safety Committee.',
      },
    ],
    documents: [
      {
        citationId: 'courthouse.title',
        kind: 'Agenda',
        officialUrl: LAFAYETTE_RECORDS,
        retrievedAt: '2026-07-21',
        title: 'City-Parish Council agenda, July 21, 2026',
      },
      {
        citationId: 'courthouse.introduced',
        kind: 'Minutes',
        officialUrl: LAFAYETTE_RECORDS,
        retrievedAt: '2026-07-28',
        title: 'City-Parish Council minutes, July 21, 2026',
      },
    ],
    evidence: {
      checked: '2026-08-27',
      note: 'Agenda packets from this body have not published since July 28. Public Parish last checked Aug 27. Decisions after July 28 may be missing.',
      status: 'Source delayed',
    },
    factors: [],
    happening: [
      {
        citationId: 'courthouse.title',
        text: 'The City-Parish Council introduced an ordinance authorizing a three-year professional services contract for courthouse entrance screening and security staffing.',
      },
      {
        citationId: 'courthouse.introduced',
        text: 'The ordinance was referred to the Public Safety Committee before final consideration.',
      },
    ],
    limitedNote:
      'This page shows the last version Public Parish accepted, dated July 28, 2026. The official source has not published since then, so a later vote or amendment would not appear here yet.',
    mode: 'full',
    place: 'Lafayette Parish',
    placeSlug: 'lafayette-parish',
    publicActions: [],
    slug: 'courthouse-security-contract',
    state: 'In progress',
    timeline: [
      {
        citationId: 'courthouse.introduced',
        date: '2026-07-21',
        state: 'In progress',
        summary:
          'The Council introduced the ordinance and referred it to committee.',
        type: 'Ordinance introduced',
      },
    ],
    title: 'Lafayette considers a contract for courthouse security staffing',
    uncertain: [],
    versions: [
      {
        date: '2026-07-28',
        mode: 'Full',
        note: 'Last accepted version. The source has not published since.',
        version: 2,
      },
      {
        date: '2026-07-21',
        mode: 'Limited',
        note: 'The agenda supported the official title and the body only.',
        version: 1,
      },
    ],
  },
  scenarioLabel:
    'Source delayed. The last accepted version stays visible with its date.',
}

/* Issue: superseded spring credit review. Historical route with a successor. */

const SPRING_CITATIONS = citations([
  {
    body: LCPC,
    documentKind: 'Minutes',
    documentTitle: 'City-Parish Council minutes, May 19, 2026',
    excerpt: {
      quote:
        'The Council directed the Department of Public Works to review the drainage fee credit program and report findings before the 2027 assessment year.',
    },
    id: 'spring.directive',
    locator: 'Minutes p.3',
    officialUrl: LAFAYETTE_RECORDS,
    page: 3,
    retrievedAt: '2026-05-26',
  },
])

const SPRING_ISSUE: IssueDetailFixture = {
  citations: SPRING_CITATIONS,
  issue: {
    body: LCPC,
    changes: [
      {
        citationId: 'spring.directive',
        date: '2026-05-26',
        kind: 'Government update',
        text: 'The May 19 minutes recorded the review directive to Public Works.',
      },
    ],
    documents: [
      {
        citationId: 'spring.directive',
        kind: 'Minutes',
        officialUrl: LAFAYETTE_RECORDS,
        retrievedAt: '2026-05-26',
        title: 'City-Parish Council minutes, May 19, 2026',
      },
    ],
    evidence: { checked: '2026-08-27', status: 'Evidence available' },
    factors: [],
    happening: [
      {
        citationId: 'spring.directive',
        text: 'The Council asked Public Works to review the drainage fee credit program and report back before the 2027 assessment year.',
      },
    ],
    historical: {
      note: 'The August ordinance covers the same program and adds the decision records this page was built from.',
      slug: 'drainage-fee-credit-cap',
      title:
        'Lafayette plans to lower the cap on drainage fee credits for 2027',
    },
    latestOutcome: {
      citationId: 'spring.directive',
      date: '2026-05-19',
      label: 'Review directed',
    },
    mode: 'full',
    place: 'Lafayette Parish',
    placeSlug: 'lafayette-parish',
    publicActions: [],
    slug: 'lafayette-drainage-credit-review',
    state: 'Completed',
    timeline: [
      {
        citationId: 'spring.directive',
        date: '2026-05-19',
        state: 'Completed',
        summary:
          'The Council directed a staff review of the drainage fee credit program.',
        type: 'Council directive',
      },
    ],
    title: 'Lafayette orders a review of its drainage fee credit program',
    uncertain: [],
    versions: [
      {
        date: '2026-05-26',
        mode: 'Full',
        note: 'First and only accepted version.',
        version: 1,
      },
    ],
  },
  scenarioLabel:
    'Historical issue. A newer issue continues this timeline and this page keeps its evidence.',
}

/* Lean issues so every promoted card in the prototype opens a real page. */

function leanIssue(input: {
  body: string
  changeText: string
  checked: string
  documentKind: 'Agenda' | 'Minutes' | 'Public notice'
  documentTitle: string
  excerpt: string
  happening: string[]
  latestOutcome?: MarkedDate
  locator: string
  next?: MarkedDate
  officialUrl: string
  place: string
  placeSlug: AreaSlug
  recordKey: string
  scenarioLabel: string
  slug: string
  state: LifecycleState
  timelineDate: string
  timelineSummary: string
  timelineType: string
  title: string
  whyMatter: { factor: string; text: string }
}): IssueDetailFixture {
  const id = `${input.slug}.source`

  return {
    citations: citations([
      {
        body: input.body,
        documentKind: input.documentKind,
        documentTitle: input.documentTitle,
        excerpt: { quote: input.excerpt },
        id,
        locator: input.locator,
        officialUrl: input.officialUrl,
        retrievedAt: input.checked,
      },
    ]),
    issue: {
      body: input.body,
      changes: [
        {
          citationId: id,
          date: input.checked,
          kind: 'Government update',
          text: input.changeText,
        },
      ],
      documents: [
        {
          citationId: id,
          kind: input.documentKind,
          officialUrl: input.officialUrl,
          retrievedAt: input.checked,
          title: input.documentTitle,
        },
      ],
      evidence: { checked: input.checked, status: 'Evidence available' },
      factors: [
        {
          citationId: id,
          factor: input.whyMatter.factor,
          text: input.whyMatter.text,
        },
      ],
      happening: input.happening.map((text) => ({ citationId: id, text })),
      latestOutcome: input.latestOutcome,
      mode: 'full',
      next: input.next,
      place: input.place,
      placeSlug: input.placeSlug,
      publicActions: [],
      slug: input.slug,
      state: input.state,
      timeline: [
        {
          citationId: id,
          date: input.timelineDate,
          recordKey: input.recordKey,
          state: input.state,
          summary: input.timelineSummary,
          type: input.timelineType,
        },
      ],
      title: input.title,
      uncertain: [],
      versions: [
        {
          date: input.checked,
          mode: 'Full',
          note: 'Accepted from the posted agenda.',
          version: 1,
        },
      ],
    },
    scenarioLabel: input.scenarioLabel,
  }
}

const WATER_METER_ISSUE = leanIssue({
  body: BRMC,
  changeText:
    'The Metropolitan Council posted the September 9 agenda with the meter contract set for a final vote.',
  checked: '2026-08-26',
  documentKind: 'Agenda',
  documentTitle: 'Metropolitan Council agenda, September 9, 2026',
  excerpt:
    'An ordinance authorizing the citywide replacement of residential water meters with automated metering infrastructure over a five-year installation schedule.',
  happening: [
    'The Metropolitan Council is set to take a final vote on replacing residential water meters across the city with automated meters over five years.',
    'The Council decides. The vote is on the September 9 agenda.',
  ],
  locator: 'Agenda p.3',
  next: {
    citationId: 'water-meter-replacement.source',
    date: '2026-09-09',
    label: 'Final vote',
    time: '4:00 PM CDT',
  },
  officialUrl: BATON_ROUGE_AGENDAS,
  place: 'East Baton Rouge Parish',
  placeSlug: 'east-baton-rouge-parish',
  recordKey: 'ord-short-term-rental-update',
  scenarioLabel: 'Upcoming vote in the second launch parish.',
  slug: 'water-meter-replacement',
  state: 'In progress',
  timelineDate: '2026-09-09',
  timelineSummary: 'A final vote on the meter replacement is scheduled.',
  timelineType: 'Scheduled for final adoption',
  title:
    'Baton Rouge advances a citywide water meter replacement to a final vote',
  whyMatter: {
    factor: 'Service delivery',
    text: 'Automated meters change how water use is measured and how a resident disputes a bill.',
  },
})

const RECYCLING_ISSUE = leanIssue({
  body: LCPC,
  changeText:
    'The September 8 agenda replaced the July packet listing. The vendor and the contract term are no longer in a current source.',
  checked: '2026-08-25',
  documentKind: 'Agenda',
  documentTitle: 'City-Parish Council agenda, September 8, 2026',
  excerpt:
    'RES-2026-084: a resolution awarding the curbside recycling collection contract. Attachments pending.',
  happening: [
    'The Council is set to introduce a resolution awarding the curbside recycling collection contract on September 8. The current agenda marks the attachments pending, so the vendor is not stated in an available source.',
  ],
  locator: 'Agenda p.2',
  next: {
    citationId: 'curbside-recycling-contract.source',
    date: '2026-09-08',
    label: 'Introduction',
    time: '5:30 PM CDT',
  },
  officialUrl: LAFAYETTE_RECORDS,
  place: 'Lafayette Parish',
  placeSlug: 'lafayette-parish',
  recordKey: 'res-recycling-contract-2026',
  scenarioLabel:
    'Issue whose decision record lost detail when the newest agenda replaced the packet.',
  slug: 'curbside-recycling-contract',
  state: 'Scheduled',
  timelineDate: '2026-09-08',
  timelineSummary: 'The resolution is set for introduction.',
  timelineType: 'Scheduled for introduction',
  title: 'Lafayette considers a new curbside recycling contract',
  whyMatter: {
    factor: 'Service delivery',
    text: 'The contract decides whether curbside recycling continues and on what schedule.',
  },
})

const RENTALS_ISSUE = leanIssue({
  body: BRMC,
  changeText:
    'The Metropolitan Council placed the short-term rental amendment on the September 22 agenda.',
  checked: '2026-08-26',
  documentKind: 'Agenda',
  documentTitle: 'Metropolitan Council agenda, September 22, 2026',
  excerpt:
    'An ordinance amending Title 15 relative to the registration and operation of short-term rentals, including annual registration and occupancy limits.',
  happening: [
    'The Metropolitan Council is considering an ordinance that changes how short-term rentals register each year and how many people may occupy them.',
  ],
  locator: 'Agenda p.3',
  next: {
    citationId: 'short-term-rental-rules.source',
    date: '2026-09-22',
    label: 'Planning vote',
    time: '4:00 PM CDT',
  },
  officialUrl: BATON_ROUGE_AGENDAS,
  place: 'East Baton Rouge Parish',
  placeSlug: 'east-baton-rouge-parish',
  recordKey: 'ord-short-term-rental-update',
  scenarioLabel: 'Upcoming housing rule change in the second launch parish.',
  slug: 'short-term-rental-rules',
  state: 'In progress',
  timelineDate: '2026-09-22',
  timelineSummary: 'The amendment is set for consideration.',
  timelineType: 'Scheduled for consideration',
  title: 'Baton Rouge updates its rules for short-term rentals',
  whyMatter: {
    factor: 'Housing',
    text: 'The rules decide where short-term rentals may operate and what a host must register.',
  },
})

export const ISSUE_DETAIL_FIXTURES: Record<string, IssueDetailFixture> = {
  'courthouse-security-contract': COURTHOUSE_ISSUE,
  'curbside-recycling-contract': RECYCLING_ISSUE,
  'downtown-late-night-permits': PERMITS_ISSUE,
  'drainage-fee-credit-cap': DRAINAGE_ISSUE,
  'lafayette-drainage-credit-review': SPRING_ISSUE,
  'short-term-rental-rules': RENTALS_ISSUE,
  'surplus-pickup-donations': SURPLUS_ISSUE,
  'water-meter-replacement': WATER_METER_ISSUE,
}

export const ISSUE_LIVE_UPDATE: IssueLiveUpdate = {
  change: {
    citationId: 'drainage.next',
    date: '2026-08-29',
    kind: 'Government update',
    text: 'The Clerk moved final adoption from September 15 to October 6 and reopened written comment.',
  },
  next: {
    citationId: 'drainage.next',
    date: '2026-10-06',
    label: 'Final vote',
    time: '5:30 PM CDT',
  },
  version: {
    date: '2026-08-29',
    mode: 'Full',
    note: 'The agenda moved final adoption to October 6.',
    version: 4,
  },
}
