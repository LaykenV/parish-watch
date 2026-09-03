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
    ],
    allowedHosts: ['www.youngsville.us'],
    allowedSubdomainSuffixes: [],
    documentHosts: [],
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
    documentHosts: [],
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
    bodyKey: 'baton-rouge-metropolitan-council',
    version: 'v1',
    jurisdictionSlug: 'east-baton-rouge-parish',
    jurisdictionName: 'East Baton Rouge Parish',
    bodyName: 'Baton Rouge Metropolitan Council',
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
    bodyName: 'Baton Rouge Planning Commission',
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

export function listRootManifests(): CoverageRootManifest[] {
  return ROOT_MANIFESTS
}

export function resolveRootManifest(
  bodyKey: string,
  version: string,
): CoverageRootManifest | null {
  return (
    ROOT_MANIFESTS.find(
      (manifest) =>
        manifest.bodyKey === bodyKey && manifest.version === version,
    ) ?? null
  )
}
