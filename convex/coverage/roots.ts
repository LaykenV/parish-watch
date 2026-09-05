export type CoverageDocumentHost = {
  host: string
  pathPrefixes: string[]
}

export type CoverageRootManifest = {
  bodyKey: string
  version: string
  jurisdictionSlug: string
  jurisdictionName: string
  bodyName: string
  approvedRootUrl: string
  /** Official pages that establish the body and its root. */
  identityEvidenceUrls: string[]
  /** Exact hosts a root or redirect hop may use. */
  allowedHosts: string[]
  /** Hosts whose subdomains are also approved, matched on label boundaries. */
  allowedSubdomainSuffixes: string[]
  /**
   * Approved external document hosts. They stay quarantined until a later
   * slice checks the candidate that claims them, so a root may never land here.
   */
  documentHosts: CoverageDocumentHost[]
  /** When set, the final URL must match exactly after redirects. */
  expectedFinalUrl?: string
  /** Date the owner checked this record against `docs/sources.md`. */
  checkedAt: string
}

/**
 * A run may only target a manifest checked in here. Owner status never turns an
 * arbitrary URL into an official root. Roots on `.gov` get the same treatment as
 * every other host.
 */
const ROOT_MANIFESTS: CoverageRootManifest[] = [
  {
    bodyKey: 'lafayette-city-council',
    version: 'v1',
    jurisdictionSlug: 'lafayette-parish',
    jurisdictionName: 'Lafayette Parish',
    bodyName: 'Lafayette City Council',
    approvedRootUrl:
      'https://www.lafayettela.gov/your-government/city-and-parish-councils/',
    identityEvidenceUrls: [
      'https://www.lafayettela.gov/your-government/city-and-parish-councils/',
      'https://www.lafayettela.gov/your-government/city-and-parish-councils/schedule-research-ord-reso/',
      'https://apps.lafayettela.gov/obcouncil/index.html',
    ],
    allowedHosts: ['www.lafayettela.gov', 'apps.lafayettela.gov'],
    allowedSubdomainSuffixes: [],
    documentHosts: [
      {
        host: 'media-002-us.cdn.govstack.com',
        pathPrefixes: ['/lafayettela-us/media/'],
      },
    ],
    checkedAt: '2026-09-03',
  },
  {
    bodyKey: 'lafayette-planning-commission',
    version: 'v1',
    jurisdictionSlug: 'lafayette-parish',
    jurisdictionName: 'Lafayette Parish',
    bodyName: 'Lafayette Planning Commission',
    approvedRootUrl:
      'https://www.lafayettela.gov/business-development/planning-and-development/planning-commission/',
    identityEvidenceUrls: [
      'https://www.lafayettela.gov/business-development/planning-and-development/',
      'https://www.lafayettela.gov/business-development/planning-and-development/planning-commission/',
    ],
    allowedHosts: ['www.lafayettela.gov'],
    allowedSubdomainSuffixes: [],
    documentHosts: [
      {
        host: 'media-002-us.cdn.govstack.com',
        pathPrefixes: ['/lafayettela-us/media/'],
      },
    ],
    checkedAt: '2026-09-03',
  },
  {
    bodyKey: 'lafayette-board-of-zoning-adjustment',
    version: 'v1',
    jurisdictionSlug: 'lafayette-parish',
    jurisdictionName: 'Lafayette Parish',
    bodyName: 'Lafayette Board of Zoning Adjustment',
    approvedRootUrl:
      'https://www.lafayettela.gov/business-development/planning-and-development/board-of-zoning-and-adjustment/',
    identityEvidenceUrls: [
      'https://www.lafayettela.gov/business-development/planning-and-development/',
      'https://www.lafayettela.gov/business-development/planning-and-development/board-of-zoning-and-adjustment/',
    ],
    allowedHosts: ['www.lafayettela.gov'],
    allowedSubdomainSuffixes: [],
    documentHosts: [
      {
        host: 'media-002-us.cdn.govstack.com',
        pathPrefixes: ['/lafayettela-us/media/'],
      },
    ],
    checkedAt: '2026-09-03',
  },
  {
    bodyKey: 'lafayette-hearing-examiner',
    version: 'v1',
    jurisdictionSlug: 'lafayette-parish',
    jurisdictionName: 'Lafayette Parish',
    bodyName: 'Lafayette Hearing Examiner',
    approvedRootUrl:
      'https://www.lafayettela.gov/business-development/planning-and-development/planning-zoning-and-development-applications/hearing-examiner/',
    identityEvidenceUrls: [
      'https://www.lafayettela.gov/business-development/planning-and-development/',
      'https://www.lafayettela.gov/business-development/planning-and-development/planning-zoning-and-development-applications/hearing-examiner/',
    ],
    allowedHosts: ['www.lafayettela.gov'],
    allowedSubdomainSuffixes: [],
    documentHosts: [
      {
        host: 'media-002-us.cdn.govstack.com',
        pathPrefixes: ['/lafayettela-us/media/'],
      },
    ],
    checkedAt: '2026-09-03',
  },
  {
    bodyKey: 'youngsville-city-council',
    version: 'v1',
    jurisdictionSlug: 'lafayette-parish',
    jurisdictionName: 'Lafayette Parish',
    bodyName: 'Youngsville City Council',
    approvedRootUrl:
      'https://www.youngsville.us/city-services/mayor-city-council/',
    identityEvidenceUrls: [
      'https://www.youngsville.us/city-services/mayor-city-council/',
      'https://www.youngsville.us/council-documents/',
      'https://meetings.municode.com/PublishPage/index?cid=YOUNGSVILA&ppid=5d44059a-1e19-4452-a226-babc4b369c18&p=1',
    ],
    allowedHosts: ['www.youngsville.us'],
    allowedSubdomainSuffixes: [],
    documentHosts: [
      {
        host: 'meetings.municode.com',
        pathPrefixes: ['/PublishPage/', '/adaHtmlDocument/', '/d/f'],
      },
      {
        host: 'mccmeetings.blob.core.usgovcloudapi.net',
        pathPrefixes: ['/youngsvila-pubu/'],
      },
    ],
    checkedAt: '2026-09-03',
  },
  {
    bodyKey: 'alexandria-city-council',
    version: 'v1',
    jurisdictionSlug: 'rapides-parish',
    jurisdictionName: 'Rapides Parish',
    bodyName: 'Alexandria City Council',
    approvedRootUrl:
      'https://www.cityofalexandriala.com/government/city-council/',
    identityEvidenceUrls: [
      'https://www.cityofalexandriala.com/government/city-council/',
    ],
    allowedHosts: ['www.cityofalexandriala.com'],
    allowedSubdomainSuffixes: [],
    documentHosts: [],
    checkedAt: '2026-09-03',
  },
  {
    bodyKey: 'pineville-city-council',
    version: 'v1',
    jurisdictionSlug: 'rapides-parish',
    jurisdictionName: 'Rapides Parish',
    bodyName: 'Pineville City Council',
    approvedRootUrl:
      'https://www.pineville.net/egov/apps/document/center.egov?id=99&view=detail',
    identityEvidenceUrls: [
      'https://www.pineville.net/egov/apps/document/center.egov?id=99&view=detail',
    ],
    allowedHosts: ['www.pineville.net'],
    allowedSubdomainSuffixes: [],
    documentHosts: [
      {
        host: 'library.municode.com',
        pathPrefixes: ['/la/pineville/munidocs/'],
      },
      {
        host: 'mcclibraryfunctions.azurewebsites.us',
        pathPrefixes: ['/api/munidocDownload/31105/'],
      },
    ],
    checkedAt: '2026-09-03',
  },
  {
    bodyKey: 'rapides-parish-police-jury',
    version: 'v1',
    jurisdictionSlug: 'rapides-parish',
    jurisdictionName: 'Rapides Parish',
    bodyName: 'Rapides Parish Police Jury',
    approvedRootUrl: 'https://rppj.com/',
    identityEvidenceUrls: [
      'https://rppj.com/agendas/',
      'https://rppj.com/public-information/',
    ],
    allowedHosts: ['rppj.com', 'www.rppj.com'],
    allowedSubdomainSuffixes: [],
    documentHosts: [],
    checkedAt: '2026-09-03',
  },
  {
    bodyKey: 'ebr-metropolitan-council',
    version: 'v1',
    jurisdictionSlug: 'east-baton-rouge-parish',
    jurisdictionName: 'East Baton Rouge Parish',
    bodyName: 'Metropolitan Council',
    approvedRootUrl: 'https://www.brla.gov/AgendaCenter/Metropolitan-Council-3',
    identityEvidenceUrls: [
      'https://www.brla.gov/AgendaCenter/Metropolitan-Council-3',
    ],
    allowedHosts: ['www.brla.gov'],
    allowedSubdomainSuffixes: [],
    documentHosts: [],
    checkedAt: '2026-09-03',
  },
  {
    bodyKey: 'baton-rouge-planning-commission',
    version: 'v1',
    jurisdictionSlug: 'east-baton-rouge-parish',
    jurisdictionName: 'East Baton Rouge Parish',
    bodyName: 'Planning and Zoning Commission',
    approvedRootUrl:
      'https://www.brla.gov/agendacenter/planning-commission-12/',
    identityEvidenceUrls: [
      'https://www.brla.gov/2590/Planning-Commission',
      'https://www.brla.gov/agendacenter/planning-commission-12/',
      'https://www.brla.gov/2521/Planning-and-Zoning-Schedule',
    ],
    allowedHosts: ['www.brla.gov'],
    allowedSubdomainSuffixes: [],
    documentHosts: [],
    checkedAt: '2026-09-03',
  },
]

const LAFAYETTE_EVENT_BODIES = new Set([
  'lafayette-planning-commission',
  'lafayette-board-of-zoning-adjustment',
  'lafayette-hearing-examiner',
])

// Keep v1 resolvable for earlier runs. Only new runs use the checked event path.
const VERSIONED_ROOT_MANIFESTS: CoverageRootManifest[] = ROOT_MANIFESTS.map(
  (manifest) => LAFAYETTE_EVENT_BODIES.has(manifest.bodyKey)
    ? {
        ...manifest,
        version: 'v2',
        documentHosts: [
          ...manifest.documentHosts,
          { host: 'events.lafayettela.gov', pathPrefixes: ['/default/Detail/'] },
        ],
        checkedAt: '2026-09-05',
      }
    : manifest,
)

// The former placeholder had no published production records. Keep its versions
// for historical runs, but require separate evidence for each commission now.
const CURRENT_ROOT_MANIFESTS: CoverageRootManifest[] = VERSIONED_ROOT_MANIFESTS.flatMap(
  (manifest): CoverageRootManifest[] => manifest.bodyKey === 'lafayette-planning-commission'
    ? [
        { ...manifest, bodyKey: 'lafayette-city-planning-commission', bodyName: 'Lafayette City Planning Commission', version: 'v1' },
        { ...manifest, bodyKey: 'lafayette-parish-planning-commission', bodyName: 'Lafayette Parish Planning Commission', version: 'v1' },
        {
          ...manifest,
          bodyKey: 'lafayette-city-zoning-commission',
          bodyName: 'Lafayette City Zoning Commission',
          version: 'v1',
          approvedRootUrl: 'https://www.lafayettela.gov/business-development/planning-and-development/zoning-in-lafayette/rezoning/',
          identityEvidenceUrls: [
            'https://www.lafayettela.gov/business-development/planning-and-development/',
            'https://www.lafayettela.gov/business-development/planning-and-development/zoning-in-lafayette/rezoning/',
          ],
        },
      ]
    : [manifest],
)

export function listRootManifests(): CoverageRootManifest[] {
  return CURRENT_ROOT_MANIFESTS
}

export function resolveRootManifest(
  bodyKey: string,
  version: string,
): CoverageRootManifest | null {
  return (
    [...CURRENT_ROOT_MANIFESTS, ...VERSIONED_ROOT_MANIFESTS, ...ROOT_MANIFESTS].find(
      (manifest) =>
        manifest.bodyKey === bodyKey && manifest.version === version,
    ) ?? null
  )
}
