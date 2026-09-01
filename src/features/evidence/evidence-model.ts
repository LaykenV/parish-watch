import type {
  ArtifactStatus,
  CitationData,
  IssueDetailFixture,
  IssueLiveUpdate,
} from './contracts'

/*
  The live update replaces the accepted version in place. Only the drainage
  issue carries one, so every other page keeps a single stable version.
*/
export function supportsLiveUpdate(slug: string): boolean {
  return slug === 'drainage-fee-credit-cap'
}

export function applyLiveUpdate(
  fixture: IssueDetailFixture,
  liveUpdate: IssueLiveUpdate,
): IssueDetailFixture {
  if (!supportsLiveUpdate(fixture.issue.slug)) return fixture

  const previousNext = fixture.issue.next?.date

  return {
    ...fixture,
    issue: {
      ...fixture.issue,
      changes: [liveUpdate.change, ...fixture.issue.changes],
      next: liveUpdate.next,
      timeline: fixture.issue.timeline.map((entry) =>
        entry.date !== undefined && entry.date === previousNext
          ? {
              ...entry,
              date: liveUpdate.next.date,
              meaningfulChange:
                'The Clerk moved final adoption from September 15 to October 6.',
            }
          : entry,
      ),
      versions: [liveUpdate.version, ...fixture.issue.versions],
    },
  }
}

/*
  A limited issue omits unsupported sections rather than filling them, so the
  page decides section visibility from the accepted evidence alone.
*/
export function issueSections(fixture: IssueDetailFixture) {
  const { issue } = fixture
  return {
    changes: issue.changes.length > 0,
    factors: issue.factors.length > 0,
    happening: issue.happening.length > 0,
    publicActions: issue.publicActions.length > 0,
    timeline: issue.timeline.length > 0,
    uncertain: issue.uncertain.length > 0,
  }
}

export function artifactTone(
  status: ArtifactStatus,
): 'ok' | 'muted' | 'warning' {
  if (status === 'Available') return 'ok'
  if (status === 'Delayed') return 'warning'
  return 'muted'
}

/*
  A long excerpt, a retrieval warning, or a section reference needs the full
  sheet height on a phone. Everything else opens at medium height.
*/
export function evidenceSheetSize(citation: CitationData): 'full' | 'medium' {
  const length =
    citation.excerpt.quote.length +
    (citation.excerpt.before?.length ?? 0) +
    (citation.excerpt.after?.length ?? 0)
  return citation.warning || length > 320 ? 'full' : 'medium'
}

export function documentHost(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

export function citationSummary(citation: CitationData): string {
  const place =
    citation.section ?? (citation.page ? `page ${citation.page}` : '')
  return [citation.documentTitle, place].filter(Boolean).join(', ')
}
