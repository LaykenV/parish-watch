import { useQuery } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'

import { api } from '../../../convex/_generated/api'
import type {
  AreaSlug,
  IssueCardData,
  LifecycleState,
  ResultRowData,
} from './contracts'

export type PublishedDecision = FunctionReturnType<
  typeof api.resident.discovery.listPublishedDecisions
>[number]

export function usePublishedDecisions(enabled: boolean) {
  return useQuery(
    api.resident.discovery.listPublishedDecisions,
    enabled ? {} : 'skip',
  )
}

export function toDecisionCard(
  decision: PublishedDecision,
): IssueCardData | null {
  const placeSlug = toAreaSlug(decision.placeSlug)
  if (!placeSlug) return null

  return {
    body: decision.bodyName,
    evidence: {
      checked: new Date(decision.source.retrievedAt).toISOString(),
      note:
        decision.mode === 'limited'
          ? 'The accepted source supports the title, government body, and official source. Other details remain unpublished.'
          : undefined,
      status:
        decision.mode === 'full' ? 'Evidence available' : 'Limited information',
    },
    href: decision.source.officialUrl,
    latestOutcome: outcomeDate(decision),
    nextDate: nextDate(decision),
    place: decision.placeName,
    placeSlug,
    primaryActionLabel: 'View source',
    showSecondaryActions: false,
    slug: decision.recordKey,
    state: toLifecycleState(decision.lifecycleState),
    title: decision.title,
    topics: [],
    whyMatter: decision.summary ?? undefined,
  }
}

export function toDecisionRow(decision: PublishedDecision): ResultRowData {
  return {
    body: decision.bodyName,
    date: decision.meetingAt ?? undefined,
    href: decision.source.officialUrl,
    id: decision.sourceRecordId,
    kind: 'Decision record',
    place: decision.placeName,
    sourceStatus:
      decision.mode === 'full' ? 'Evidence available' : 'Limited information',
    state: toLifecycleState(decision.lifecycleState),
    title: decision.title,
  }
}

export function toLifecycleState(
  state: PublishedDecision['lifecycleState'],
): LifecycleState {
  switch (state) {
    case 'proposed':
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
    case 'completed':
      return 'Completed'
    case 'canceled':
      return 'Canceled'
    case 'discovered':
    case 'unknown':
    case null:
      return 'Status not stated'
  }
}

function nextDate(
  decision: PublishedDecision,
): IssueCardData['nextDate'] | undefined {
  if (!decision.meetingAt) return undefined
  if (
    decision.lifecycleState === 'decided' ||
    decision.lifecycleState === 'completed' ||
    decision.lifecycleState === 'canceled' ||
    decision.lifecycleState === 'postponed'
  ) {
    return undefined
  }
  return { date: decision.meetingAt, label: 'Meeting' }
}

function outcomeDate(
  decision: PublishedDecision,
): IssueCardData['latestOutcome'] | undefined {
  if (!decision.meetingAt) return undefined
  if (
    decision.lifecycleState !== 'decided' &&
    decision.lifecycleState !== 'completed' &&
    decision.lifecycleState !== 'canceled' &&
    decision.lifecycleState !== 'postponed'
  ) {
    return undefined
  }
  return { date: decision.meetingAt, label: 'Meeting record' }
}

function toAreaSlug(slug: string): AreaSlug | null {
  if (
    slug === 'lafayette-parish' ||
    slug === 'east-baton-rouge-parish' ||
    slug === 'rapides-parish'
  ) {
    return slug
  }
  return null
}
