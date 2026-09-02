import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'

type AcceptedPayload = Exclude<Doc<'publicationVersions'>['payload'], null>

type FieldChange = {
  fieldPath: string
  kind: 'added' | 'removed' | 'changed'
  previousValue: string | null
  currentValue: string | null
}

const MATERIAL_FIELDS = [
  'recordType',
  'title',
  'bodyName',
  'meetingAt',
  'lifecycleState',
  'plainLanguageSummary',
  'affectedPlaces',
  'amounts',
  'publicActions',
] as const

const PRESENTATION_TEXT_FIELDS = new Set<(typeof MATERIAL_FIELDS)[number]>([
  'title',
  'bodyName',
  'plainLanguageSummary',
])

function serializedField(
  payload: AcceptedPayload,
  field: (typeof MATERIAL_FIELDS)[number],
): string | null {
  if (!(field in payload)) return null
  if (
    field === 'meetingAt' &&
    'meetingAt' in payload &&
    payload.meetingAt === null
  ) {
    return null
  }
  const value = payload[field as keyof AcceptedPayload]
  return JSON.stringify(value)
}

function normalizedDisplayText(value: string | null): string | null {
  if (value === null) return null
  const parsed: unknown = JSON.parse(value)
  if (typeof parsed !== 'string') return null
  return parsed
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

function parsedMeetingAt(value: string | null): string | null {
  if (value === null) return null
  const parsed: unknown = JSON.parse(value)
  return typeof parsed === 'string' ? parsed : null
}

function lostMeetingTimePrecision(
  previousValue: string | null,
  currentValue: string | null,
): boolean {
  if (currentValue === null) return previousValue !== null
  if (previousValue === null) return false
  const previousMeetingAt = parsedMeetingAt(previousValue)
  const currentMeetingAt = parsedMeetingAt(currentValue)
  if (previousMeetingAt === null || currentMeetingAt === null) return false
  return (
    previousMeetingAt.slice(0, 10) === currentMeetingAt.slice(0, 10) &&
    previousMeetingAt.slice(11, 19) !== '00:00:00' &&
    currentMeetingAt.slice(11, 19) === '00:00:00'
  )
}

export function classifyMaterialChange(
  previous: AcceptedPayload,
  current: AcceptedPayload,
): {
  classification:
    | 'information_expanded'
    | 'information_limited'
    | 'date_changed'
    | 'amount_changed'
    | 'amended'
    | 'postponed'
    | 'decided'
    | 'canceled'
    | 'public_action_changed'
    | 'no_public_change'
  material: boolean
  fieldChanges: FieldChange[]
} {
  const fieldChanges: FieldChange[] = []
  for (const field of MATERIAL_FIELDS) {
    const previousValue = serializedField(previous, field)
    const currentValue = serializedField(current, field)
    if (previousValue === currentValue) continue
    if (PRESENTATION_TEXT_FIELDS.has(field)) {
      const previousText = normalizedDisplayText(previousValue)
      const currentText = normalizedDisplayText(currentValue)
      if (previousText !== null && previousText === currentText) continue
    }
    if (
      field === 'meetingAt' &&
      lostMeetingTimePrecision(previousValue, currentValue)
    ) {
      continue
    }
    fieldChanges.push({
      fieldPath: `/${field}`,
      kind:
        previousValue === null
          ? 'added'
          : currentValue === null
            ? 'removed'
            : 'changed',
      previousValue,
      currentValue,
    })
  }

  const currentLifecycle =
    current.kind === 'full' ? current.lifecycleState : null
  const lifecycleChanged = fieldChanges.some(
    (change) => change.fieldPath === '/lifecycleState',
  )
  const classification =
    previous.kind === 'full' && current.kind === 'limited'
      ? 'information_limited'
      : lifecycleChanged && currentLifecycle === 'postponed'
        ? 'postponed'
        : lifecycleChanged && currentLifecycle === 'decided'
          ? 'decided'
          : lifecycleChanged && currentLifecycle === 'canceled'
            ? 'canceled'
            : previous.kind === 'limited' && current.kind === 'full'
              ? 'information_expanded'
              : fieldChanges.some((change) => change.fieldPath === '/meetingAt')
                ? 'date_changed'
                : fieldChanges.some((change) => change.fieldPath === '/amounts')
                  ? 'amount_changed'
                  : fieldChanges.some(
                        (change) => change.fieldPath === '/publicActions',
                      )
                    ? 'public_action_changed'
                    : fieldChanges.length > 0
                      ? 'amended'
                      : 'no_public_change'

  return {
    classification,
    material: fieldChanges.length > 0,
    fieldChanges,
  }
}

export async function recordMaterialChange(
  ctx: MutationCtx,
  input: {
    recordId: Id<'decisionRecords'>
    previousVersion?: Doc<'publicationVersions'>
    currentPublicationVersionId: Id<'publicationVersions'>
    currentPayload: AcceptedPayload
    createdAt: number
  },
): Promise<Id<'materialChanges'>> {
  const existing = await ctx.db
    .query('materialChanges')
    .withIndex('by_current_publication', (q) =>
      q.eq('currentPublicationVersionId', input.currentPublicationVersionId),
    )
    .unique()
  if (existing) return existing._id
  if (input.previousVersion?.payload === null) {
    throw new Error(
      'Accepted publication history cannot point at a withheld payload',
    )
  }
  const change = input.previousVersion
    ? classifyMaterialChange(input.previousVersion.payload, input.currentPayload)
    : {
        classification: 'new_decision' as const,
        material: true,
        fieldChanges: [] as FieldChange[],
      }
  return await ctx.db.insert('materialChanges', {
    recordId: input.recordId,
    previousPublicationVersionId: input.previousVersion?._id,
    currentPublicationVersionId: input.currentPublicationVersionId,
    ...change,
    createdAt: input.createdAt,
  })
}
