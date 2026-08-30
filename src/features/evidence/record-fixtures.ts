import type {
  CitationData,
  CitationMap,
  DecisionDetailFixture,
  MeetingDetailFixture,
} from './contracts'

/*
  Design fixtures for decision records and meetings. Nothing here is a
  production civic claim. CO-022-2026, CO-023-2026, and the April 21, 2026
  meeting mirror the real development evidence. Official document links point at
  the real council record search rather than an invented file URL.
*/

const LAFAYETTE_RECORDS = 'https://apps.lafayettela.gov/obcouncil/index.html'
const LAFAYETTE_PLANNING =
  'https://www.lafayettela.gov/business-development/planning-and-development/'
const BATON_ROUGE_AGENDAS =
  'https://www.brla.gov/AgendaCenter/Metropolitan-Council-3'

const LCPC = 'Lafayette City-Parish Council'
const LCC = 'Lafayette City Council'
const LPC = 'Lafayette Planning Commission'
const BRMC = 'Baton Rouge Metropolitan Council'

function citations(list: CitationData[]): CitationMap {
  return Object.fromEntries(list.map((entry) => [entry.id, entry]))
}

/* CO-022-2026: the cooperative endeavor agreement. */

const CO_022: DecisionDetailFixture = {
  citations: citations([
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
      id: 'co022.title',
      locator: 'CO-022-2026 §1',
      officialUrl: LAFAYETTE_RECORDS,
      retrievedAt: '2026-08-25',
      section: 'Section 1',
    },
    {
      body: LCPC,
      documentKind: 'Minutes',
      documentTitle: 'City-Parish Council minutes, April 21, 2026',
      excerpt: {
        after: 'The Chair declared the ordinance adopted.',
        before: 'Item 14, final adoption.',
        quote:
          'The vote was recorded as 9 yeas, 0 nays, 0 absent on the ordinance authorizing the cooperative endeavor agreement and act of donation with Terrebonne Parish Consolidated Government.',
      },
      id: 'co022.vote',
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
        quote:
          'No monetary consideration shall be paid to Lafayette Consolidated Government under this agreement. All costs of transfer, registration, and transportation shall be borne by the recipient.',
      },
      id: 'co022.payment',
      locator: 'CO-022-2026 §3',
      officialUrl: LAFAYETTE_RECORDS,
      retrievedAt: '2026-08-25',
      section: 'Section 3',
    },
  ]),
  decision: {
    body: LCPC,
    changes: [
      {
        citationId: 'co022.vote',
        date: '2026-08-18',
        from: 'Council acted on Aug 4, 2026',
        kind: 'Public Parish correction',
        text: 'Public Parish read the wrong meeting date from the minutes index and corrected it to the recorded date.',
        to: 'Council acted on Apr 21, 2026',
      },
      {
        citationId: 'co022.vote',
        date: '2026-04-28',
        kind: 'More information posted',
        text: 'The April 21 minutes added the recorded vote and the adopted text.',
      },
    ],
    documents: [
      {
        citationId: 'co022.title',
        kind: 'Ordinance',
        officialUrl: LAFAYETTE_RECORDS,
        retrievedAt: '2026-08-25',
        title: 'Ordinance CO-022-2026',
      },
      {
        citationId: 'co022.vote',
        kind: 'Minutes',
        officialUrl: LAFAYETTE_RECORDS,
        retrievedAt: '2026-08-25',
        title: 'City-Parish Council minutes, April 21, 2026',
      },
    ],
    fields: [
      {
        citationId: 'co022.title',
        label: 'Government body',
        value: LCPC,
      },
      { citationId: 'co022.title', label: 'Record type', value: 'Ordinance' },
      { citationId: 'co022.vote', label: 'Current state', value: 'Decided' },
      {
        citationId: 'co022.vote',
        label: 'Meeting',
        value: 'April 21, 2026',
      },
      {
        citationId: 'co022.vote',
        label: 'Recorded vote',
        value: '9 yeas, 0 nays, 0 absent',
      },
      {
        citationId: 'co022.title',
        label: 'Recipient',
        value: 'Terrebonne Parish Consolidated Government',
      },
      {
        citationId: 'co022.payment',
        label: 'Payment to Lafayette',
        note: 'The ordinance states the donation carries no monetary consideration, so the absence of an amount is the decision, not a gap.',
        value: 'None. All transfer costs fall on the recipient parish.',
      },
      {
        citationId: 'co022.title',
        label: 'Affected place',
        value: 'Lafayette Parish',
      },
    ],
    issue: {
      slug: 'surplus-pickup-donations',
      title:
        'Lafayette donates a surplus 2016 Crew Cab pickup to Terrebonne Parish through a cooperative agreement',
    },
    latest: {
      citationId: 'co022.vote',
      date: '2026-04-21',
      label: 'Council approved',
    },
    mode: 'full',
    officialTitle:
      'AN ORDINANCE AUTHORIZING THE LAFAYETTE CITY-PARISH PRESIDENT TO EXECUTE A COOPERATIVE ENDEAVOR AGREEMENT AND AN ACT OF DONATION WITH THE TERREBONNE PARISH CONSOLIDATED GOVERNMENT CONVEYING ONE (1) SURPLUS 2016 CHEVROLET SILVERADO CREW CAB PICKUP TRUCK, AND OTHERWISE PROVIDING WITH RESPECT THERETO.',
    officialTitleCitationId: 'co022.title',
    place: 'Lafayette Parish',
    recordKey: 'CO-022-2026',
    recordType: 'Ordinance',
    state: 'Decided',
    summary: [
      {
        citationId: 'co022.title',
        text: 'This ordinance let the parish president sign a cooperative endeavor agreement and an act of donation transferring a surplus 2016 Crew Cab pickup to Terrebonne Parish.',
      },
      {
        citationId: 'co022.payment',
        text: 'Lafayette receives no payment. Terrebonne Parish pays the transfer, registration, and transportation costs.',
      },
    ],
    title:
      'Authorize a cooperative endeavor agreement and act of donation with Terrebonne Parish',
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
        note: 'Minutes added the recorded vote and the adopted text.',
        version: 2,
      },
      {
        date: '2026-04-14',
        mode: 'Limited',
        note: 'The agenda supported the official title and the body only.',
        version: 1,
      },
    ],
  },
  scenarioLabel:
    'Decided record from the real development evidence, with an OCR warning on the minutes.',
}

/* CO-023-2026: the act of donation. */

const CO_023: DecisionDetailFixture = {
  citations: citations([
    {
      body: LCPC,
      documentKind: 'Ordinance',
      documentTitle: 'Ordinance CO-023-2026',
      excerpt: {
        quote:
          'An ordinance authorizing the execution of the act of donation transferring title to the surplus 2016 Crew Cab pickup truck described in CO-022-2026, with all transfer costs borne by the recipient parish.',
      },
      id: 'co023.title',
      locator: 'CO-023-2026 §1',
      officialUrl: LAFAYETTE_RECORDS,
      retrievedAt: '2026-08-25',
      section: 'Section 1',
    },
    {
      body: LCPC,
      documentKind: 'Minutes',
      documentTitle: 'City-Parish Council minutes, April 21, 2026',
      excerpt: {
        before: 'Item 15, final adoption.',
        quote:
          'The vote was recorded as 9 yeas, 0 nays, 0 absent on the ordinance authorizing the act of donation.',
      },
      id: 'co023.vote',
      locator: 'Minutes p.7',
      officialUrl: LAFAYETTE_RECORDS,
      page: 7,
      retrievedAt: '2026-08-25',
    },
  ]),
  decision: {
    body: LCPC,
    changes: [
      {
        citationId: 'co023.vote',
        date: '2026-04-28',
        kind: 'More information posted',
        text: 'The April 21 minutes added the recorded vote.',
      },
    ],
    documents: [
      {
        citationId: 'co023.title',
        kind: 'Ordinance',
        officialUrl: LAFAYETTE_RECORDS,
        retrievedAt: '2026-08-25',
        title: 'Ordinance CO-023-2026',
      },
      {
        citationId: 'co023.vote',
        kind: 'Minutes',
        officialUrl: LAFAYETTE_RECORDS,
        retrievedAt: '2026-08-25',
        title: 'City-Parish Council minutes, April 21, 2026',
      },
    ],
    fields: [
      { citationId: 'co023.title', label: 'Government body', value: LCPC },
      { citationId: 'co023.title', label: 'Record type', value: 'Ordinance' },
      { citationId: 'co023.vote', label: 'Current state', value: 'Decided' },
      { citationId: 'co023.vote', label: 'Meeting', value: 'April 21, 2026' },
      {
        citationId: 'co023.vote',
        label: 'Recorded vote',
        value: '9 yeas, 0 nays, 0 absent',
      },
      {
        citationId: 'co023.title',
        label: 'Related record',
        value: 'CO-022-2026',
      },
    ],
    issue: {
      slug: 'surplus-pickup-donations',
      title:
        'Lafayette donates a surplus 2016 Crew Cab pickup to Terrebonne Parish through a cooperative agreement',
    },
    latest: {
      citationId: 'co023.vote',
      date: '2026-04-21',
      label: 'Council approved',
    },
    mode: 'full',
    officialTitle:
      'AN ORDINANCE AUTHORIZING THE EXECUTION OF AN ACT OF DONATION TRANSFERRING TITLE TO ONE (1) SURPLUS 2016 CHEVROLET SILVERADO CREW CAB PICKUP TRUCK AS DESCRIBED IN ORDINANCE CO-022-2026, AND OTHERWISE PROVIDING WITH RESPECT THERETO.',
    officialTitleCitationId: 'co023.title',
    place: 'Lafayette Parish',
    recordKey: 'CO-023-2026',
    recordType: 'Ordinance',
    state: 'Decided',
    summary: [
      {
        citationId: 'co023.title',
        text: 'This ordinance authorized the act of donation itself, transferring title to the truck described in CO-022-2026.',
      },
    ],
    title: 'Execute the act of donation for a surplus 2016 Crew Cab pickup',
    versions: [
      {
        date: '2026-04-28',
        mode: 'Full',
        note: 'Minutes added the recorded vote.',
        version: 2,
      },
      {
        date: '2026-04-14',
        mode: 'Limited',
        note: 'The agenda supported the official title and the body only.',
        version: 1,
      },
    ],
  },
  scenarioLabel:
    'Second record in the same real decision, adopted the same day.',
}

/* Drainage credit ordinance: scheduled, tied to the upcoming issue. */

const ORD_DRAINAGE: DecisionDetailFixture = {
  citations: citations([
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
          'Subsection (b) is hereby amended to read: the credit granted to any parcel for on-site detention, retention, or other approved drainage improvements shall not exceed twenty-five percent (25%) of the drainage fee otherwise assessed against that parcel in any assessment year. The prior limit of fifty percent (50%) is repealed.',
      },
      id: 'orddrainage.text',
      locator: 'O-2026-0915 §2',
      officialUrl: LAFAYETTE_RECORDS,
      retrievedAt: '2026-08-27',
      section: 'Section 2',
    },
    {
      body: LCPC,
      documentKind: 'Agenda',
      documentTitle: 'City-Parish Council agenda, September 15, 2026',
      excerpt: {
        before: 'FINAL ADOPTION, item 22.',
        quote:
          'An ordinance amending the drainage fee credit program to set the maximum annual credit at 25 percent of the assessed drainage fee for any single parcel, effective for the 2027 assessment year.',
      },
      id: 'orddrainage.schedule',
      locator: 'Agenda p.4',
      officialUrl: LAFAYETTE_RECORDS,
      page: 4,
      retrievedAt: '2026-08-27',
    },
  ]),
  decision: {
    body: LCPC,
    changes: [
      {
        citationId: 'orddrainage.schedule',
        date: '2026-08-27',
        kind: 'Government update',
        text: 'The September 15 agenda set this ordinance for final adoption.',
      },
    ],
    documents: [
      {
        citationId: 'orddrainage.text',
        kind: 'Ordinance',
        officialUrl: LAFAYETTE_RECORDS,
        retrievedAt: '2026-08-27',
        title: 'Ordinance O-2026-0915, introduced August 18, 2026',
      },
      {
        citationId: 'orddrainage.schedule',
        kind: 'Agenda',
        officialUrl: LAFAYETTE_RECORDS,
        retrievedAt: '2026-08-27',
        title: 'City-Parish Council agenda, September 15, 2026',
      },
    ],
    fields: [
      { citationId: 'orddrainage.text', label: 'Government body', value: LCPC },
      {
        citationId: 'orddrainage.text',
        label: 'Record type',
        value: 'Ordinance',
      },
      {
        citationId: 'orddrainage.schedule',
        label: 'Current state',
        value: 'Scheduled for final adoption',
      },
      {
        citationId: 'orddrainage.schedule',
        label: 'Meeting',
        value: 'September 15, 2026',
      },
      {
        citationId: 'orddrainage.text',
        label: 'Credit limit',
        value: '25 percent of the assessed drainage fee, down from 50 percent',
      },
      {
        citationId: 'orddrainage.text',
        label: 'First assessment year',
        value: '2027',
      },
    ],
    issue: {
      slug: 'drainage-fee-credit-cap',
      title:
        'Lafayette plans to lower the cap on drainage fee credits for 2027',
    },
    latest: {
      citationId: 'orddrainage.schedule',
      date: '2026-09-15',
      label: 'Final vote scheduled',
    },
    mode: 'full',
    officialTitle:
      'AN ORDINANCE AMENDING SECTION 34-155 OF THE CODE OF ORDINANCES OF THE LAFAYETTE CITY-PARISH CONSOLIDATED GOVERNMENT RELATIVE TO THE MAXIMUM ANNUAL CREDIT AGAINST DRAINAGE FEES FOR APPROVED ON-SITE DETENTION AND RETENTION IMPROVEMENTS, AND OTHERWISE PROVIDING WITH RESPECT THERETO.',
    officialTitleCitationId: 'orddrainage.text',
    place: 'Lafayette Parish',
    recordKey: 'ord-drainage-fee-credit-2027',
    recordType: 'Ordinance',
    state: 'Scheduled',
    summary: [
      {
        citationId: 'orddrainage.text',
        text: 'The ordinance would cut the drainage fee credit limit from 50 percent of the fee on a parcel to 25 percent, beginning with the 2027 assessment year.',
      },
    ],
    title: 'Adopt the 2027 drainage fee credit cap',
    versions: [
      {
        date: '2026-08-27',
        mode: 'Full',
        note: 'The agenda added the final adoption date.',
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
  scenarioLabel: 'Scheduled record with a sourced meeting date.',
}

/* Recycling contract: the newest source supports less than an earlier one. */

const RES_RECYCLING: DecisionDetailFixture = {
  citations: citations([
    {
      body: LCPC,
      documentKind: 'Agenda',
      documentTitle: 'City-Parish Council agenda, September 8, 2026',
      excerpt: {
        before: 'INTRODUCTION, item 9.',
        quote:
          'RES-2026-084: a resolution awarding the curbside recycling collection contract. Attachments pending.',
      },
      id: 'recycling.current',
      locator: 'Agenda p.2',
      officialUrl: LAFAYETTE_RECORDS,
      page: 2,
      retrievedAt: '2026-08-25',
    },
  ]),
  decision: {
    body: LCPC,
    changes: [
      {
        citationId: 'recycling.current',
        date: '2026-08-25',
        kind: 'Government update',
        text: 'The September 8 agenda replaced the July packet listing. The replacement names the resolution and marks the attachments pending, so the vendor and contract term are no longer supported by a current source.',
      },
      {
        date: '2026-07-30',
        kind: 'More information posted',
        text: 'The July agenda packet named the recommended vendor and the five-year term. That version stays in the history below with its date.',
      },
    ],
    documents: [
      {
        citationId: 'recycling.current',
        kind: 'Agenda',
        officialUrl: LAFAYETTE_RECORDS,
        retrievedAt: '2026-08-25',
        title: 'City-Parish Council agenda, September 8, 2026',
      },
    ],
    fields: [
      {
        citationId: 'recycling.current',
        label: 'Government body',
        value: LCPC,
      },
      {
        citationId: 'recycling.current',
        label: 'Record type',
        value: 'Resolution',
      },
      {
        citationId: 'recycling.current',
        label: 'Current state',
        value: 'Scheduled for introduction',
      },
      {
        citationId: 'recycling.current',
        label: 'Meeting',
        value: 'September 8, 2026',
      },
      {
        label: 'Vendor',
        note: 'A July packet named a recommended vendor. The current agenda marks the attachments pending, so Public Parish does not carry the earlier name forward as a present fact.',
        value: 'Not stated in the available source',
      },
    ],
    limitedNote:
      'The newest official source supports less than an earlier one. Public Parish publishes the current limited record and keeps the earlier version in the history with its own date instead of carrying old fields forward.',
    mode: 'limited',
    officialTitle:
      'A RESOLUTION AWARDING THE CONTRACT FOR CURBSIDE RECYCLING COLLECTION SERVICES AND AUTHORIZING THE EXECUTION OF ALL DOCUMENTS IN CONNECTION THEREWITH.',
    officialTitleCitationId: 'recycling.current',
    place: 'Lafayette Parish',
    recordKey: 'res-recycling-contract-2026',
    recordType: 'Resolution',
    state: 'Scheduled',
    summary: [
      {
        citationId: 'recycling.current',
        text: 'The Council is set to introduce a resolution awarding the curbside recycling collection contract on September 8. The agenda marks the attachments as pending.',
      },
    ],
    title: 'Award the curbside recycling collection contract',
    versions: [
      {
        date: '2026-08-25',
        mode: 'Limited',
        note: 'Current version. The replacement agenda dropped the vendor and the contract term.',
        version: 3,
      },
      {
        date: '2026-07-30',
        mode: 'Full',
        note: 'The July packet named the recommended vendor and a five-year term.',
        version: 2,
      },
      {
        date: '2026-07-14',
        mode: 'Limited',
        note: 'The agenda supported the official title and the body only.',
        version: 1,
      },
    ],
  },
  scenarioLabel:
    'The newest source supports less than an earlier one. The limited record is current.',
}

/* Lean records so no link in the prototype dead-ends. */

const RES_CAPITAL: DecisionDetailFixture = {
  citations: citations([
    {
      body: LCPC,
      documentKind: 'Agenda',
      documentTitle: 'City-Parish Council agenda, September 15, 2026',
      excerpt: {
        quote:
          'Item 27. A resolution accepting the fiscal year 2027 drainage capital improvement schedule as submitted by the Department of Public Works.',
      },
      id: 'capital.title',
      locator: 'Agenda p.6',
      officialUrl: LAFAYETTE_RECORDS,
      page: 6,
      retrievedAt: '2026-08-27',
    },
  ]),
  decision: {
    body: LCPC,
    changes: [],
    documents: [
      {
        citationId: 'capital.title',
        kind: 'Agenda',
        officialUrl: LAFAYETTE_RECORDS,
        retrievedAt: '2026-08-27',
        title: 'City-Parish Council agenda, September 15, 2026',
      },
    ],
    fields: [
      { citationId: 'capital.title', label: 'Government body', value: LCPC },
      {
        citationId: 'capital.title',
        label: 'Record type',
        value: 'Resolution',
      },
      {
        citationId: 'capital.title',
        label: 'Current state',
        value: 'Scheduled for consideration',
      },
      {
        citationId: 'capital.title',
        label: 'Meeting',
        value: 'September 15, 2026',
      },
    ],
    limitedNote:
      'The agenda supports the official title, the body, and the meeting date. It does not describe the schedule itself, so no explanation is published.',
    mode: 'limited',
    officialTitle:
      'A RESOLUTION ACCEPTING THE FISCAL YEAR 2027 DRAINAGE CAPITAL IMPROVEMENT SCHEDULE AS SUBMITTED BY THE DEPARTMENT OF PUBLIC WORKS.',
    officialTitleCitationId: 'capital.title',
    place: 'Lafayette Parish',
    recordKey: 'res-drainage-capital-schedule-2027',
    recordType: 'Resolution',
    state: 'Scheduled',
    summary: [],
    title: 'Accept the 2027 drainage capital improvement schedule',
    versions: [
      {
        date: '2026-08-27',
        mode: 'Limited',
        note: 'The agenda supported the official title and the body only.',
        version: 1,
      },
    ],
  },
  scenarioLabel:
    'Limited record. It is the uncertain relationship shown on the drainage issue.',
}

const ORD_RENTALS: DecisionDetailFixture = {
  citations: citations([
    {
      body: BRMC,
      documentKind: 'Agenda',
      documentTitle: 'Metropolitan Council agenda, September 22, 2026',
      excerpt: {
        quote:
          'An ordinance amending Title 15 relative to the registration and operation of short-term rentals, including annual registration and occupancy limits.',
      },
      id: 'rentals.title',
      locator: 'Agenda p.3',
      officialUrl: BATON_ROUGE_AGENDAS,
      page: 3,
      retrievedAt: '2026-08-26',
    },
  ]),
  decision: {
    body: BRMC,
    changes: [],
    documents: [
      {
        citationId: 'rentals.title',
        kind: 'Agenda',
        officialUrl: BATON_ROUGE_AGENDAS,
        retrievedAt: '2026-08-26',
        title: 'Metropolitan Council agenda, September 22, 2026',
      },
    ],
    fields: [
      { citationId: 'rentals.title', label: 'Government body', value: BRMC },
      { citationId: 'rentals.title', label: 'Record type', value: 'Ordinance' },
      {
        citationId: 'rentals.title',
        label: 'Current state',
        value: 'Scheduled for consideration',
      },
      {
        citationId: 'rentals.title',
        label: 'Meeting',
        value: 'September 22, 2026',
      },
    ],
    issue: {
      slug: 'short-term-rental-rules',
      title: 'Baton Rouge updates its rules for short-term rentals',
    },
    mode: 'full',
    officialTitle:
      'AN ORDINANCE AMENDING TITLE 15 OF THE CODE OF ORDINANCES OF THE CITY OF BATON ROUGE AND PARISH OF EAST BATON ROUGE RELATIVE TO THE REGISTRATION AND OPERATION OF SHORT-TERM RENTALS.',
    officialTitleCitationId: 'rentals.title',
    place: 'East Baton Rouge Parish',
    recordKey: 'ord-short-term-rental-update',
    recordType: 'Ordinance',
    state: 'Scheduled',
    summary: [
      {
        citationId: 'rentals.title',
        text: 'The ordinance would change how short-term rentals register and how many people may occupy them.',
      },
    ],
    title: 'Update the short-term rental registration rules',
    versions: [
      {
        date: '2026-08-26',
        mode: 'Full',
        note: 'First accepted version from the September 22 agenda.',
        version: 1,
      },
    ],
  },
  scenarioLabel: 'Scheduled record in the second launch parish.',
}

function routineRecord(input: {
  body: string
  citationId: string
  date: string
  documentKind: 'Agenda' | 'Minutes' | 'Public notice'
  documentTitle: string
  excerpt: string
  locator: string
  officialTitle: string
  officialUrl: string
  place: string
  recordKey: string
  recordType: string
  retrievedAt: string
  summary: string
  title: string
}): DecisionDetailFixture {
  return {
    citations: citations([
      {
        body: input.body,
        documentKind: input.documentKind,
        documentTitle: input.documentTitle,
        excerpt: { quote: input.excerpt },
        id: input.citationId,
        locator: input.locator,
        officialUrl: input.officialUrl,
        retrievedAt: input.retrievedAt,
      },
    ]),
    decision: {
      body: input.body,
      changes: [],
      documents: [
        {
          citationId: input.citationId,
          kind: input.documentKind,
          officialUrl: input.officialUrl,
          retrievedAt: input.retrievedAt,
          title: input.documentTitle,
        },
      ],
      fields: [
        {
          citationId: input.citationId,
          label: 'Government body',
          value: input.body,
        },
        {
          citationId: input.citationId,
          label: 'Record type',
          value: input.recordType,
        },
        {
          citationId: input.citationId,
          label: 'Meeting',
          value: input.date,
        },
      ],
      mode: 'full',
      officialTitle: input.officialTitle,
      officialTitleCitationId: input.citationId,
      place: input.place,
      recordKey: input.recordKey,
      recordType: input.recordType,
      state: 'Completed',
      summary: [{ citationId: input.citationId, text: input.summary }],
      title: input.title,
      versions: [
        {
          date: input.retrievedAt,
          mode: 'Full',
          note: 'First accepted version.',
          version: 1,
        },
      ],
    },
    scenarioLabel: 'Routine record. It stays searchable but is never promoted.',
  }
}

export const DECISION_DETAIL_FIXTURES: Record<string, DecisionDetailFixture> = {
  'CO-022-2026': CO_022,
  'CO-023-2026': CO_023,
  'disbursement-report-2026-03': routineRecord({
    body: LCPC,
    citationId: 'march-disbursement.title',
    date: 'April 21, 2026',
    documentKind: 'Minutes',
    documentTitle: 'City-Parish Council minutes, April 21, 2026',
    excerpt:
      'Receipt and filing of the disbursement report for the month of March 2026 as submitted by the Chief Financial Officer.',
    locator: 'Minutes p.1',
    officialTitle:
      'RECEIPT AND FILING OF THE DISBURSEMENT REPORT FOR THE MONTH OF MARCH 2026.',
    officialUrl: LAFAYETTE_RECORDS,
    place: 'Lafayette Parish',
    recordKey: 'disbursement-report-2026-03',
    recordType: 'Routine filing',
    retrievedAt: '2026-08-25',
    summary:
      'The Council received and filed the monthly disbursement report for March 2026.',
    title: 'Receipt and filing of the March 2026 disbursement report',
  }),
  'disbursement-report-2026-07': routineRecord({
    body: LCPC,
    citationId: 'disbursement.title',
    date: 'August 31, 2026',
    documentKind: 'Agenda',
    documentTitle: 'City-Parish Council agenda, August 31, 2026',
    excerpt:
      'Receipt and filing of the disbursement report for the month of July 2026 as submitted by the Chief Financial Officer.',
    locator: 'Agenda p.1',
    officialTitle:
      'RECEIPT AND FILING OF THE DISBURSEMENT REPORT FOR THE MONTH OF JULY 2026.',
    officialUrl: LAFAYETTE_RECORDS,
    place: 'Lafayette Parish',
    recordKey: 'disbursement-report-2026-07',
    recordType: 'Routine filing',
    retrievedAt: '2026-08-27',
    summary:
      'The Council received and filed the monthly disbursement report for July 2026.',
    title: 'Disbursement report for July 2026',
  }),
  'min-lafayette-city-council-2026-08-18': routineRecord({
    body: LCC,
    citationId: 'minutes.title',
    date: 'August 18, 2026',
    documentKind: 'Minutes',
    documentTitle: 'City Council minutes, August 18, 2026',
    excerpt:
      'On motion duly made and seconded, the minutes of the regular meeting of August 4, 2026 were adopted as written.',
    locator: 'Minutes p.1',
    officialTitle:
      'ADOPTION OF THE MINUTES OF THE REGULAR MEETING OF AUGUST 4, 2026.',
    officialUrl: LAFAYETTE_RECORDS,
    place: 'Lafayette Parish',
    recordKey: 'min-lafayette-city-council-2026-08-18',
    recordType: 'Routine filing',
    retrievedAt: '2026-08-24',
    summary:
      'The Council adopted the minutes of its August 4 meeting as written.',
    title: 'Adopt the Aug 18 City Council meeting minutes',
  }),
  'min-lafayette-city-parish-council-2026-04-07': routineRecord({
    body: LCPC,
    citationId: 'april-minutes.title',
    date: 'April 21, 2026',
    documentKind: 'Minutes',
    documentTitle: 'City-Parish Council minutes, April 21, 2026',
    excerpt:
      'On motion duly made and seconded, the minutes of the regular meeting of April 7, 2026 were adopted as written.',
    locator: 'Minutes p.1',
    officialTitle:
      'ADOPTION OF THE MINUTES OF THE REGULAR MEETING OF APRIL 7, 2026.',
    officialUrl: LAFAYETTE_RECORDS,
    place: 'Lafayette Parish',
    recordKey: 'min-lafayette-city-parish-council-2026-04-07',
    recordType: 'Routine filing',
    retrievedAt: '2026-08-25',
    summary:
      'The Council adopted the minutes of its April 7 meeting as written.',
    title: 'Adopt the minutes of the April 7 meeting',
  }),
  'ord-drainage-fee-credit-2027': ORD_DRAINAGE,
  'ord-short-term-rental-update': ORD_RENTALS,
  'public-comment-period-2026-09': routineRecord({
    body: BRMC,
    citationId: 'comment.title',
    date: 'September 1, 2026',
    documentKind: 'Public notice',
    documentTitle: 'Metropolitan Council public notice, September 2026',
    excerpt:
      'Notice is hereby given that the public comment period for the September docket opens September 1, 2026 and closes at 4:30 p.m. on September 18, 2026.',
    locator: 'Notice §1',
    officialTitle:
      'NOTICE OF THE OPENING OF THE SEPTEMBER 2026 PUBLIC COMMENT PERIOD.',
    officialUrl: BATON_ROUGE_AGENDAS,
    place: 'East Baton Rouge Parish',
    recordKey: 'public-comment-period-2026-09',
    recordType: 'Routine filing',
    retrievedAt: '2026-08-26',
    summary:
      'The September public comment period opens September 1 and closes September 18 at 4:30 PM.',
    title: 'Open the September public comment period',
  }),
  'res-drainage-capital-schedule-2027': RES_CAPITAL,
  'res-recycling-contract-2026': RES_RECYCLING,
}

/* Meetings. */

const APRIL_MEETING: MeetingDetailFixture = {
  citations: citations([
    {
      body: LCPC,
      documentKind: 'Agenda',
      documentTitle: 'City-Parish Council agenda, April 21, 2026',
      excerpt: {
        quote:
          'Regular meeting of the Lafayette City-Parish Council, Tuesday, April 21, 2026, 5:30 p.m., Ted A. Ardoin Council Auditorium, 705 West University Avenue, Lafayette, Louisiana.',
      },
      id: 'april.location',
      locator: 'Agenda p.1',
      officialUrl: LAFAYETTE_RECORDS,
      page: 1,
      retrievedAt: '2026-04-14',
    },
    {
      body: LCPC,
      documentKind: 'Minutes',
      documentTitle: 'City-Parish Council minutes, April 21, 2026',
      excerpt: {
        before: 'Item 14 and item 15, final adoption.',
        quote:
          'Both ordinances relating to the surplus 2016 Crew Cab pickup truck were adopted by a recorded vote of 9 yeas, 0 nays, 0 absent.',
      },
      id: 'april.votes',
      locator: 'Minutes p.7',
      officialUrl: LAFAYETTE_RECORDS,
      page: 7,
      retrievedAt: '2026-08-25',
      warning:
        'This page came from a scanned PDF. Text was read by OCR and may contain character errors.',
    },
  ]),
  meeting: {
    artifacts: [
      {
        checked: '2026-08-25',
        citationId: 'april.location',
        kind: 'Agenda',
        officialUrl: LAFAYETTE_RECORDS,
        status: 'Available',
      },
      {
        checked: '2026-08-25',
        kind: 'Agenda packet',
        officialUrl: LAFAYETTE_RECORDS,
        status: 'Available',
      },
      {
        checked: '2026-08-25',
        citationId: 'april.votes',
        kind: 'Minutes',
        officialUrl: LAFAYETTE_RECORDS,
        status: 'Available',
      },
      {
        checked: '2026-08-25',
        citationId: 'april.votes',
        kind: 'Meeting results',
        note: 'The recorded votes appear inside the minutes. This body does not publish a separate results file.',
        officialUrl: LAFAYETTE_RECORDS,
        status: 'Available',
      },
      {
        checked: '2026-08-25',
        kind: 'Official video',
        note: 'Public Parish does not monitor video for this body. Video is not part of the evidence gate.',
        status: 'Not monitored',
      },
    ],
    body: LCPC,
    date: '2026-04-21T17:30:00-05:00',
    decisions: [],
    documents: [
      {
        citationId: 'april.location',
        kind: 'Agenda',
        officialUrl: LAFAYETTE_RECORDS,
        retrievedAt: '2026-04-14',
        title: 'City-Parish Council agenda, April 21, 2026',
      },
      {
        citationId: 'april.votes',
        kind: 'Minutes',
        officialUrl: LAFAYETTE_RECORDS,
        retrievedAt: '2026-08-25',
        title: 'City-Parish Council minutes, April 21, 2026',
      },
    ],
    id: 'lafayette-city-parish-council-2026-04-21',
    issueSlugs: ['surplus-pickup-donations'],
    locationCitationId: 'april.location',
    locationText:
      'Ted A. Ardoin Council Auditorium, 705 West University Avenue, Lafayette',
    place: 'Lafayette Parish',
    placeSlug: 'lafayette-parish',
    routine: [
      {
        citationId: 'april.location',
        recordKey: 'min-lafayette-city-parish-council-2026-04-07',
        state: 'Completed',
        summary: 'Adopted as written.',
        title: 'Adopt the minutes of the April 7 meeting',
      },
      {
        citationId: 'april.location',
        recordKey: 'disbursement-report-2026-03',
        state: 'Completed',
        summary: 'Received and filed.',
        title: 'Receipt and filing of the March 2026 disbursement report',
      },
    ],
    status: 'Held',
    title: 'City-Parish Council regular meeting',
    versions: [
      {
        date: '2026-08-25',
        mode: 'Full',
        note: 'Minutes and recorded votes replaced the agenda-only listing.',
        version: 2,
      },
      {
        date: '2026-04-14',
        mode: 'Limited',
        note: 'The agenda supported the meeting, the location, and the item list.',
        version: 1,
      },
    ],
  },
  scenarioLabel:
    'Meeting after minutes are published, mirroring the real development evidence.',
}

const SEPTEMBER_CITY_MEETING: MeetingDetailFixture = {
  citations: citations([
    {
      body: LCC,
      documentKind: 'Agenda',
      documentTitle: 'City Council agenda, September 8, 2026',
      excerpt: {
        quote:
          'Regular meeting of the Lafayette City Council, Tuesday, September 8, 2026, 5:30 p.m., Ted A. Ardoin Council Auditorium, 705 West University Avenue, Lafayette, Louisiana.',
      },
      id: 'sept8.location',
      locator: 'Agenda p.1',
      officialUrl: LAFAYETTE_RECORDS,
      page: 1,
      retrievedAt: '2026-08-25',
    },
    {
      body: LCC,
      documentKind: 'Agenda',
      documentTitle: 'City Council agenda, September 8, 2026',
      excerpt: {
        before: 'INTRODUCTION, item 9.',
        quote:
          'RES-2026-084: a resolution awarding the curbside recycling collection contract. Attachments pending.',
      },
      id: 'sept8.recycling',
      locator: 'Agenda p.2',
      officialUrl: LAFAYETTE_RECORDS,
      page: 2,
      retrievedAt: '2026-08-25',
    },
  ]),
  meeting: {
    artifacts: [
      {
        checked: '2026-08-27',
        citationId: 'sept8.location',
        kind: 'Agenda',
        officialUrl: LAFAYETTE_RECORDS,
        status: 'Available',
      },
      {
        checked: '2026-08-27',
        kind: 'Agenda packet',
        officialUrl: LAFAYETTE_RECORDS,
        status: 'Available',
      },
      {
        checked: '2026-08-27',
        kind: 'Minutes',
        note: 'This body normally publishes minutes after they are adopted at the following meeting.',
        status: 'Expected after the meeting',
      },
      {
        checked: '2026-08-27',
        kind: 'Meeting results',
        note: 'Recorded votes appear in the minutes for this body.',
        status: 'Expected after the meeting',
      },
      {
        checked: '2026-08-27',
        kind: 'Official video',
        note: 'Public Parish does not monitor video for this body.',
        status: 'Not monitored',
      },
    ],
    body: LCC,
    date: '2026-09-08T17:30:00-05:00',
    decisions: [
      {
        citationId: 'sept8.recycling',
        recordKey: 'res-recycling-contract-2026',
        state: 'Scheduled',
        summary:
          'Set for introduction. The agenda marks the attachments pending, so the vendor is not in a current source.',
        title: 'Award the curbside recycling collection contract',
      },
    ],
    documents: [
      {
        citationId: 'sept8.location',
        kind: 'Agenda',
        officialUrl: LAFAYETTE_RECORDS,
        retrievedAt: '2026-08-25',
        title: 'City Council agenda, September 8, 2026',
      },
    ],
    id: 'lafayette-city-council-2026-09-08',
    issueSlugs: ['downtown-late-night-permits'],
    locationCitationId: 'sept8.location',
    locationText:
      'Ted A. Ardoin Council Auditorium, 705 West University Avenue, Lafayette',
    place: 'Lafayette Parish',
    placeSlug: 'lafayette-parish',
    routine: [
      {
        citationId: 'sept8.location',
        recordKey: 'min-lafayette-city-council-2026-08-18',
        state: 'Scheduled',
        summary: 'Set for adoption as written.',
        title: 'Adopt the Aug 18 City Council meeting minutes',
      },
    ],
    status: 'Scheduled',
    title: 'City Council regular meeting',
    versions: [
      {
        date: '2026-08-25',
        mode: 'Full',
        note: 'First accepted version from the posted agenda.',
        version: 1,
      },
    ],
  },
  scenarioLabel:
    'Meeting before minutes are due. Post-meeting artifacts state when they are expected.',
}

const PLANNING_MEETING: MeetingDetailFixture = {
  citations: citations([
    {
      body: LPC,
      documentKind: 'Public notice',
      documentTitle: 'Planning Commission meeting calendar, 2026',
      excerpt: {
        quote:
          'The Lafayette Planning Commission meets on the first Thursday of each month at 5:00 p.m. in the Council Auditorium. Agendas are posted no later than ten days before each meeting.',
      },
      id: 'planning.calendar',
      locator: 'Calendar §2',
      officialUrl: LAFAYETTE_PLANNING,
      retrievedAt: '2026-08-27',
      section: 'Section 2',
    },
  ]),
  meeting: {
    artifacts: [
      {
        checked: '2026-08-27',
        citationId: 'planning.calendar',
        kind: 'Agenda',
        note: 'The published calendar says agendas post at least ten days ahead. That date passed on August 24 and no agenda has appeared.',
        status: 'Delayed',
      },
      {
        checked: '2026-08-27',
        kind: 'Agenda packet',
        note: 'The packet normally posts with the agenda.',
        status: 'Delayed',
      },
      {
        checked: '2026-08-27',
        kind: 'Minutes',
        status: 'Expected after the meeting',
      },
      {
        checked: '2026-08-27',
        kind: 'Meeting results',
        status: 'Expected after the meeting',
      },
      {
        checked: '2026-08-27',
        kind: 'Official video',
        note: 'Public Parish does not monitor video for this body.',
        status: 'Not monitored',
      },
    ],
    body: LPC,
    date: '2026-09-03T17:00:00-05:00',
    decisions: [],
    documents: [
      {
        citationId: 'planning.calendar',
        kind: 'Public notice',
        officialUrl: LAFAYETTE_PLANNING,
        retrievedAt: '2026-08-27',
        title: 'Planning Commission meeting calendar, 2026',
      },
    ],
    id: 'lafayette-planning-commission-2026-09-03',
    issueSlugs: [],
    locationCitationId: 'planning.calendar',
    locationText: 'Council Auditorium, 705 West University Avenue, Lafayette',
    place: 'Lafayette Parish',
    placeSlug: 'lafayette-parish',
    routine: [],
    status: 'Scheduled',
    title: 'Planning Commission meeting',
    versions: [
      {
        date: '2026-08-27',
        mode: 'Limited',
        note: 'Only the published calendar supports this meeting. No agenda has posted.',
        version: 1,
      },
    ],
  },
  scenarioLabel:
    'Overdue artifact. The agenda passed its published posting date and no items are known.',
}

const METRO_MEETING: MeetingDetailFixture = {
  citations: citations([
    {
      body: BRMC,
      documentKind: 'Public notice',
      documentTitle: 'Metropolitan Council meeting schedule, 2026',
      excerpt: {
        quote:
          'The Metropolitan Council meets at 4:00 p.m. in the Council Chambers, 222 St. Louis Street, Baton Rouge. Agendas are posted five days before each meeting.',
      },
      id: 'metro.schedule',
      locator: 'Schedule §1',
      officialUrl: BATON_ROUGE_AGENDAS,
      retrievedAt: '2026-08-26',
      section: 'Section 1',
    },
  ]),
  meeting: {
    artifacts: [
      {
        checked: '2026-08-26',
        citationId: 'metro.schedule',
        kind: 'Agenda',
        note: 'The published schedule puts this agenda on September 4. It is not overdue yet.',
        status: 'Not published',
      },
      {
        checked: '2026-08-26',
        kind: 'Agenda packet',
        note: 'The packet normally posts with the agenda.',
        status: 'Not published',
      },
      {
        checked: '2026-08-26',
        kind: 'Minutes',
        status: 'Expected after the meeting',
      },
      {
        checked: '2026-08-26',
        kind: 'Meeting results',
        note: 'This body publishes a separate results file after each meeting.',
        status: 'Expected after the meeting',
      },
      {
        checked: '2026-08-26',
        kind: 'Official video',
        note: 'Public Parish does not monitor video for this body.',
        status: 'Not monitored',
      },
    ],
    body: BRMC,
    date: '2026-09-09T16:00:00-05:00',
    decisions: [],
    documents: [
      {
        citationId: 'metro.schedule',
        kind: 'Public notice',
        officialUrl: BATON_ROUGE_AGENDAS,
        retrievedAt: '2026-08-26',
        title: 'Metropolitan Council meeting schedule, 2026',
      },
    ],
    id: 'baton-rouge-metro-council-2026-09-09',
    issueSlugs: ['water-meter-replacement'],
    locationCitationId: 'metro.schedule',
    locationText: 'Council Chambers, 222 St. Louis Street, Baton Rouge',
    place: 'East Baton Rouge Parish',
    placeSlug: 'east-baton-rouge-parish',
    routine: [],
    status: 'Scheduled',
    title: 'Metropolitan Council meeting',
    versions: [
      {
        date: '2026-08-26',
        mode: 'Limited',
        note: 'Only the published schedule supports this meeting so far.',
        version: 1,
      },
    ],
  },
  scenarioLabel:
    'Meeting whose agenda is not published yet and is not late by the official schedule.',
}

export const MEETING_DETAIL_FIXTURES: Record<string, MeetingDetailFixture> = {
  'baton-rouge-metro-council-2026-09-09': METRO_MEETING,
  'lafayette-city-council-2026-09-08': SEPTEMBER_CITY_MEETING,
  'lafayette-city-parish-council-2026-04-21': APRIL_MEETING,
  'lafayette-planning-commission-2026-09-03': PLANNING_MEETING,
}
