import type { CoverageRegion } from './contracts'

/*
  Development-only presentation fixtures for Design Slice 6. They exercise the
  five public coverage states and must never be read as current production
  coverage claims. The route loader imports this module only for explicit
  development fixture URLs.
*/
export const COVERAGE_REGION_FIXTURES: CoverageRegion[] = [
  {
    name: 'Lafayette Parish',
    bodies: [
      {
        id: 'lafayette-city-council',
        name: 'Lafayette City Council',
        state: 'Supported',
        sourceKinds: ['Agendas', 'Minutes', 'Ordinances and resolutions'],
        lastSuccessfulCheck: 'August 30, 2026 at 4:42 PM CDT',
        nextExpectedArtifact: 'Agenda before the next confirmed meeting',
        limitation:
          'Meeting packets and results are checked against the same accepted source set.',
        followAvailable: true,
      },
      {
        id: 'lafayette-parish-council',
        name: 'Lafayette Parish Council',
        state: 'Degraded',
        sourceKinds: ['Agendas', 'Minutes'],
        lastSuccessfulCheck: 'August 26, 2026 at 9:18 AM CDT',
        nextExpectedArtifact: 'Council agenda, now overdue',
        limitation:
          'The expected agenda has not appeared. Dated accepted records remain available, but current decisions may be missing.',
        followAvailable: true,
      },
      {
        id: 'youngsville-city-council',
        name: 'Youngsville City Council',
        state: 'Validating sources',
        sourceKinds: ['Meeting notices', 'Agendas', 'Minutes'],
        nextExpectedArtifact: 'A complete meeting-cycle replay',
        limitation:
          'Source discovery is still being checked. This body cannot appear as supported or become an active area yet.',
        followAvailable: false,
      },
      {
        id: 'lafayette-planning-zoning',
        name: 'Lafayette planning and zoning bodies',
        state: 'Paused',
        sourceKinds: ['Calendars', 'Agendas', 'Case packets'],
        lastSuccessfulCheck: 'August 24, 2026 at 2:05 PM CDT',
        limitation:
          'A document-host change broke repeat retrieval. Monitoring resumes after the source path passes the same checks again.',
        followAvailable: false,
      },
    ],
  },
  {
    name: 'Rapides Parish',
    bodies: [
      {
        id: 'alexandria-city-council',
        name: 'Alexandria City Council',
        state: 'Validating sources',
        sourceKinds: ['Agendas', 'Minutes', 'Official video links'],
        nextExpectedArtifact: 'Representative agenda and minutes set',
        limitation:
          'The source set has not passed a complete meeting-cycle replay.',
        followAvailable: false,
      },
      {
        id: 'pineville-city-council',
        name: 'Pineville City Council',
        state: 'Not supported',
        sourceKinds: ['Document center records'],
        limitation:
          'Public Parish has not validated enough current and historical records to publish this body as supported.',
        followAvailable: false,
      },
      {
        id: 'rapides-police-jury',
        name: 'Rapides Parish Police Jury',
        state: 'Validating sources',
        sourceKinds: ['Agendas', 'Meeting schedules', 'Public notices'],
        nextExpectedArtifact:
          'A current agenda matched to the official schedule',
        limitation:
          'The index may contain stale records. Dates and linked documents still need to agree.',
        followAvailable: false,
      },
    ],
  },
  {
    name: 'East Baton Rouge Parish',
    bodies: [
      {
        id: 'ebr-metropolitan-council',
        name: 'Metropolitan Council',
        state: 'Validating sources',
        sourceKinds: ['Agendas', 'Minutes', 'Document versions'],
        nextExpectedArtifact: 'A revised-packet replay',
        limitation:
          'Previous document versions are still being checked against the immutable source rules.',
        followAvailable: false,
      },
      {
        id: 'ebr-planning-commission',
        name: 'Planning Commission',
        state: 'Not supported',
        sourceKinds: ['Agendas', 'Results', 'Case packets'],
        limitation:
          'The planning source set has not passed the common gold-set and freshness gate.',
        followAvailable: false,
      },
    ],
  },
]
