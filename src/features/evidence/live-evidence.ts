import { useQuery } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'

import { api } from '../../../convex/_generated/api'
import type {
  AreaSlug,
  LifecycleState,
  UpdateKind,
} from '../discovery/contracts'
import type {
  CitationData,
  CitationMap,
  DecisionDetailFixture,
  DocumentKind,
  IssueDetailFixture,
  MeetingDetailFixture,
  PublishedVersion,
  SourceDocument,
} from './contracts'

export type PublishedIssue = NonNullable<
  FunctionReturnType<typeof api.resident.evidence.getPublishedIssue>
>
type PublishedDecision = NonNullable<
  FunctionReturnType<typeof api.resident.evidence.getPublishedDecision>
>
type PublishedMeeting = NonNullable<
  FunctionReturnType<typeof api.resident.evidence.getPublishedMeeting>
>
type PublishedCitation = PublishedDecision['citations'][number]

export function usePublishedIssue(slug: string) {
  return useQuery(api.resident.evidence.getPublishedIssue, { slug })
}

export function usePublishedDecision(recordKey: string) {
  return useQuery(api.resident.evidence.getPublishedDecision, { recordKey })
}

export function usePublishedMeeting(meetingKey: string) {
  return useQuery(api.resident.evidence.getPublishedMeeting, { meetingKey })
}

export function toIssueFixture(
  published: PublishedIssue,
): IssueDetailFixture | null {
  const placeSlug = toAreaSlug(published.placeSlug)
  if (!placeSlug) return null
  const citations = toCitationMap(published.citations, coverageWarning(published.coverageStatus))
  const firstCitation = (ids: string[]) =>
    ids.find((id) => citations[id] !== undefined)
  const checked = newestRetrieval(published.citations)
  const nextAt = published.nextKnownAction?.at ?? undefined
  const timeline = [...published.links]
    .sort((left, right) => {
      if (!left.meetingAt) return right.meetingAt ? 1 : 0
      if (!right.meetingAt) return -1
      return left.meetingAt.localeCompare(right.meetingAt)
    })
    .map((link) => ({
      citationId: firstCitation(link.citationIds),
      date: link.meetingAt ?? undefined,
      recordKey: link.recordKey,
      state: toLifecycleState(link.lifecycleState),
      summary: link.summary ?? link.reason,
      type: relationshipLabel(link.relationship),
    }))
  const documents = toDocuments(published.citations)

  return {
    citations,
    issue: {
      body: published.bodyName,
      coverageNote: coverageWarning(published.coverageStatus),
      changes: published.changes.map((change) => ({
        citationId: published.citations.find((citation) =>
          change.fieldPaths.includes(citation.fieldPath),
        )?.id,
        date: new Date(change.createdAt).toISOString(),
        kind: changeKind(change.classification),
        text: changeLabel(change.classification),
      })),
      documents,
      evidence: {
        checked: new Date(checked).toISOString(),
        note:
          published.mode === 'limited'
            ? 'Public Parish shows only the issue claims supported by the accepted evidence.'
            : undefined,
        status:
          published.mode === 'full'
            ? 'Evidence available'
            : 'Limited information',
      },
      factors: published.factors.flatMap((factor) => {
        const citationId = firstCitation(factor.citationIds)
        return citationId
          ? [
              {
                citationId,
                factor: factorLabel(factor.factor),
                text: factor.rationale,
              },
            ]
          : []
      }),
      happening: [
        {
          citationId: firstCitation(published.claimCitationIds.summary),
          text: published.summary,
        },
      ],
      latestOutcome: latestOutcome(published.links, firstCitation),
      limitedNote:
        published.mode === 'limited'
          ? 'Some issue claims remain unpublished because the accepted evidence does not support them.'
          : undefined,
      mode: published.mode,
      next:
        nextAt === undefined
          ? undefined
          : {
              citationId: firstCitation(published.claimCitationIds.nextAt),
              date: nextAt,
              label: published.nextKnownAction?.description ?? 'Next action',
            },
      place: published.placeName,
      placeSlug,
      publicActions: published.publicActions.flatMap((action) => {
        const citationId = firstCitation(action.instructionCitationIds)
        const deadlineCitationId = firstCitation(action.deadlineCitationIds)
        return citationId
          ? [
              {
                citationId,
                deadline:
                  action.deadline && deadlineCitationId
                    ? action.deadline
                    : undefined,
                deadlineCitationId,
                instructions: action.instructions,
                label: actionLabel(action.type),
              },
            ]
          : []
      }),
      slug: published.slug,
      state: toIssueLifecycleState(published.lifecycleState),
      timeline,
      title: published.title,
      uncertain: [],
      versions: published.versions.map(toVersion),
    },
    scenarioLabel: 'Published resident evidence',
  }
}

export function toDecisionFixture(
  published: PublishedDecision,
): DecisionDetailFixture | null {
  if (!toAreaSlug(published.placeSlug)) return null
  const citations = toCitationMap(published.citations, coverageWarning(published.coverageStatus))
  const citationFor = (path: string) =>
    published.citations.find((citation) => citation.fieldPath === path)?.id
  const fields = [
    {
      citationId: citationFor('/bodyName'),
      label: 'Government body',
      value: published.bodyName,
    },
    {
      citationId: citationFor('/recordType'),
      label: 'Record type',
      value: published.recordType
        ? sentenceCase(published.recordType)
        : 'Not stated',
    },
    {
      citationId: citationFor('/lifecycleState'),
      label: 'Current state',
      value: toLifecycleState(published.lifecycleState),
    },
    ...published.affectedPlaces.map((place, index) => ({
      citationId: citationFor(`/affectedPlaces/${index}`),
      label: index === 0 ? 'Affected place' : 'Also affects',
      value: place,
    })),
    ...published.amounts.flatMap((amount, index) => {
      const valueCitationId = citationFor(`/amounts/${index}/value`)
      const contextCitationId = citationFor(`/amounts/${index}/context`)
      return [
        ...(valueCitationId
          ? [
              {
                citationId: valueCitationId,
                label: 'Public money',
                value: new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: amount.currency,
                  maximumFractionDigits: 0,
                }).format(amount.value),
              },
            ]
          : []),
        ...(contextCitationId
          ? [
              {
                citationId: contextCitationId,
                label: 'Money context',
                value: amount.context,
              },
            ]
          : []),
      ]
    }),
  ]

  return {
    citations,
    decision: {
      body: published.bodyName,
      coverageNote: coverageWarning(published.coverageStatus),
      changes: published.changes.map((change) => ({
        citationId: published.citations.find((citation) =>
          change.fieldPaths.includes(citation.fieldPath),
        )?.id,
        date: new Date(change.createdAt).toISOString(),
        kind: changeKind(change.classification),
        text: changeLabel(change.classification),
      })),
      documents: toDocuments(published.citations),
      fields,
      issue: published.issue ?? undefined,
      latest: published.meetingAt
        ? {
            citationId: citationFor('/meetingAt'),
            date: published.meetingAt,
            label: 'Meeting record',
          }
        : undefined,
      limitedNote:
        published.mode === 'limited'
          ? 'The accepted source supports the title, government body, and official source. Other details remain unpublished.'
          : undefined,
      meeting:
        published.meetingKey && published.meetingAt
          ? {
              id: published.meetingKey,
              title: `${published.bodyName} meeting`,
            }
          : undefined,
      mode: published.mode,
      officialTitle: published.title,
      officialTitleCitationId: citationFor('/title'),
      place: published.placeName,
      recordKey: published.recordKey,
      recordType: published.recordType
        ? sentenceCase(published.recordType)
        : 'Decision record',
      state: toLifecycleState(published.lifecycleState),
      summary: published.summary
        ? [
            {
              citationId: citationFor('/plainLanguageSummary'),
              text: published.summary,
            },
          ]
        : [],
      title: published.title,
      versions: published.versions.map(toVersion),
    },
    scenarioLabel: 'Published resident evidence',
  }
}

export function toMeetingFixture(
  published: PublishedMeeting,
): { fixture: MeetingDetailFixture; issues: [] } | null {
  const placeSlug = toAreaSlug(published.placeSlug)
  if (!placeSlug) return null
  const citations = toCitationMap(published.citations, coverageWarning(published.coverageStatus))
  const documents = toDocuments(published.citations)
  const checked = newestRetrieval(published.citations)
  const issueSlugs = [
    ...new Set(
      published.decisions.flatMap((decision) =>
        decision.issue ? [decision.issue.slug] : [],
      ),
    ),
  ]

  return {
    fixture: {
      citations,
      meeting: {
        artifacts: documents.map((document) => ({
          checked: document.retrievedAt,
          citationId: document.citationId,
          kind: document.kind,
          officialUrl: document.officialUrl,
          status: 'Available',
        })),
        body: published.bodyName,
      coverageNote: coverageWarning(published.coverageStatus),
        date: published.meetingAt,
        decisions: published.decisions.map((decision) => ({
          citationId: decision.citations.find(
            (citation) => citation.fieldPath === '/title',
          )?.id,
          recordKey: decision.recordKey,
          state: toLifecycleState(decision.lifecycleState),
          summary:
            decision.summary ??
            'The accepted source does not publish a plain-language summary.',
          title: decision.title,
        })),
        documents,
        id: published.id,
        issueSlugs,
        locationText: 'The accepted official records do not state a location.',
        place: published.placeName,
        placeSlug,
        routine: [],
        status: meetingStatus(published.decisions),
        timeKnown: !/T00:00:00(?:\.000)?(?:Z|[+-]\d{2}:\d{2})?$/.test(
          published.meetingAt,
        ),
        title: `${published.bodyName} meeting`,
        versions: [
          {
            date: new Date(checked).toISOString(),
            mode: published.decisions.some(
              (decision) => decision.mode === 'limited',
            )
              ? 'Limited'
              : 'Full',
            note: 'Current accepted meeting evidence',
            version: 1,
          },
        ],
      },
      scenarioLabel: 'Published resident evidence',
    },
    issues: [],
  }
}

function toCitationMap(values: PublishedCitation[], warning?: string): CitationMap {
  return Object.fromEntries(
    values.map((citation) => {
      const value: CitationData = {
        body: citation.bodyName,
        warning,
        documentKind: documentKind(citation.sourceKind),
        documentTitle: citation.documentTitle,
        excerpt: { quote: citation.excerpt },
        id: citation.id,
        locator:
          citation.section ??
          (citation.page ? `Page ${citation.page}` : citation.documentTitle),
        officialUrl: citation.officialUrl,
        page: citation.page ?? undefined,
        retrievedAt: new Date(citation.retrievedAt).toISOString(),
        section: citation.section ?? undefined,
      }
      return [value.id, value]
    }),
  )
}

function toDocuments(values: PublishedCitation[]): SourceDocument[] {
  const documents = new Map<string, SourceDocument>()
  for (const citation of values) {
    const key = `${citation.officialUrl}:${citation.retrievedAt}`
    if (documents.has(key)) continue
    documents.set(key, {
      citationId: citation.id,
      kind: documentKind(citation.sourceKind),
      officialUrl: citation.officialUrl,
      retrievedAt: new Date(citation.retrievedAt).toISOString(),
      title: citation.documentTitle,
    })
  }
  return [...documents.values()]
}

function documentKind(kind: PublishedCitation['sourceKind']): DocumentKind {
  switch (kind) {
    case 'agenda':
      return 'Agenda'
    case 'minutes':
      return 'Minutes'
    case 'ordinance':
      return 'Ordinance'
    case 'resolution':
      return 'Resolution'
    case 'notice':
    case 'calendar':
      return 'Public notice'
    case 'packet':
    case 'planning_case':
      return 'Agenda packet'
    case 'other':
      return 'Meeting results'
  }
}

function toVersion(
  value: PublishedDecision['versions'][number],
): PublishedVersion {
  return {
    date: new Date(value.createdAt).toISOString(),
    mode: value.mode === 'full' ? 'Full' : 'Limited',
    note: sentenceCase(value.reasonCode),
    version: value.version,
  }
}

function toAreaSlug(value: string): AreaSlug | null {
  if (
    value === 'lafayette-parish' ||
    value === 'east-baton-rouge-parish' ||
    value === 'rapides-parish'
  ) {
    return value
  }
  return null
}

function toLifecycleState(
  value: PublishedDecision['lifecycleState'],
): LifecycleState {
  switch (value) {
    case 'proposed':
    case 'discovered':
      return 'Developing'
    case 'scheduled':
      return 'Scheduled'
    case 'amended':
    case 'implementing':
      return 'In progress'
    case 'postponed':
      return 'Postponed'
    case 'decided':
      return 'Decided'
    case 'canceled':
      return 'Canceled'
    case 'completed':
      return 'Completed'
    case 'unknown':
    case null:
      return 'Status not stated'
  }
}

function toIssueLifecycleState(value: string | null): LifecycleState {
  switch (value) {
    case 'developing':
      return 'Developing'
    case 'scheduled':
      return 'Scheduled'
    case 'active':
      return 'In progress'
    case 'decided':
      return 'Decided'
    case 'postponed':
      return 'Postponed'
    case 'canceled':
      return 'Canceled'
    case 'complete':
      return 'Completed'
    default:
      return 'Status not stated'
  }
}

function latestOutcome(
  links: PublishedIssue['links'],
  firstCitation: (ids: string[]) => string | undefined,
) {
  const outcomes = links
    .filter(
      (link) =>
        link.meetingAt &&
        ['decided', 'completed', 'canceled'].includes(
          link.lifecycleState ?? '',
        ),
    )
    .sort((left, right) =>
      (right.meetingAt ?? '').localeCompare(left.meetingAt ?? ''),
    )
  const latest = outcomes[0]
  return outcomes.length > 0 && latest.meetingAt
    ? {
        citationId: firstCitation(latest.citationIds),
        date: latest.meetingAt,
        label: 'Latest recorded outcome',
      }
    : undefined
}

function factorLabel(value: PublishedIssue['factors'][number]['factor']) {
  return sentenceCase(value.replace('_', ' and '))
}

function relationshipLabel(value: string): string {
  return sentenceCase(value.replaceAll('_', ' '))
}

function actionLabel(value: string): string {
  switch (value) {
    case 'attend':
      return 'Attend'
    case 'comment':
      return 'Comment'
    case 'contact':
      return 'Contact the government body'
    case 'apply':
      return 'Apply'
    default:
      return 'Public action'
  }
}

function sentenceCase(value: string): string {
  const text = value.replaceAll('_', ' ').trim()
  return text ? `${text[0].toUpperCase()}${text.slice(1)}` : text
}

function changeKind(classification: string): UpdateKind {
  if (classification === 'decided' || classification === 'canceled') {
    return 'Outcome'
  }
  if (
    classification === 'information_expanded' ||
    classification === 'information_limited'
  ) {
    return 'More information posted'
  }
  return 'Government update'
}

function changeLabel(classification: string): string {
  switch (classification) {
    case 'information_expanded':
      return 'The accepted official record added material information.'
    case 'information_limited':
      return 'The current official record supports less information than the prior version.'
    case 'date_changed':
      return 'The accepted official record changed a date.'
    case 'amount_changed':
      return 'The accepted official record changed an amount.'
    case 'public_action_changed':
      return 'The accepted official record changed a public action or deadline.'
    case 'decided':
      return 'The accepted official record reports a decision.'
    case 'postponed':
      return 'The accepted official record reports a postponement.'
    case 'canceled':
      return 'The accepted official record reports a cancellation.'
    case 'amended':
      return 'The accepted official record reports an amendment.'
    default:
      return 'The accepted official record changed.'
  }
}

function newestRetrieval(citations: PublishedCitation[]): number {
  return citations.reduce(
    (latest, citation) => Math.max(latest, citation.retrievedAt),
    0,
  )
}

function meetingStatus(decisions: PublishedMeeting['decisions']): string {
  if (decisions.some((decision) => decision.lifecycleState === 'scheduled')) {
    return 'Scheduled'
  }
  if (
    decisions.some((decision) =>
      ['decided', 'completed'].includes(decision.lifecycleState ?? ''),
    )
  ) {
    return 'Outcome posted'
  }
  if (decisions.some((decision) => decision.lifecycleState === 'postponed')) {
    return 'Postponed'
  }
  return 'Status not stated'
}

export function coverageWarning(status?: string): string | undefined {
  if (status === 'degraded') return 'Some source checks for this government body are incomplete. Dated accepted evidence remains available; newer decisions may be missing. See Coverage for current limitations.'
  if (status === 'paused') return 'Source checks for this government body are paused. This page preserves dated accepted evidence and does not promise current coverage.'
  if (status && status !== 'supported') return 'Coverage for this government body is still being validated. This page shows only its dated accepted evidence.'
  return undefined
}
