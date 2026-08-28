import { v } from 'convex/values'

import { EXTRACTION_SCHEMA_VERSION } from '../pipeline/state'

export const recordTypes = v.union(
  v.literal('proposal'),
  v.literal('hearing'),
  v.literal('vote'),
  v.literal('contract'),
  v.literal('appointment'),
  v.literal('public_action'),
  v.literal('other'),
)

export type RecordType = typeof recordTypes.type

export const lifecycleStates = v.union(
  v.literal('discovered'),
  v.literal('proposed'),
  v.literal('scheduled'),
  v.literal('amended'),
  v.literal('postponed'),
  v.literal('decided'),
  v.literal('implementing'),
  v.literal('completed'),
  v.literal('canceled'),
  v.literal('unknown'),
)

export type LifecycleState = typeof lifecycleStates.type

export const publicActionTypes = v.union(
  v.literal('attend'),
  v.literal('comment'),
  v.literal('contact'),
  v.literal('apply'),
  v.literal('other'),
)

export type PublicActionType = typeof publicActionTypes.type

export const decisionCandidateV1 = v.object({
  sourceRecordId: v.union(v.string(), v.null()),
  recordType: recordTypes,
  title: v.string(),
  bodyName: v.string(),
  meetingAt: v.union(v.string(), v.null()),
  lifecycleState: lifecycleStates,
  plainLanguageSummary: v.string(),
  affectedPlaces: v.array(v.string()),
  amounts: v.array(
    v.object({
      value: v.number(),
      currency: v.literal('USD'),
      context: v.string(),
    }),
  ),
  publicActions: v.array(
    v.object({
      type: publicActionTypes,
      deadline: v.union(v.string(), v.null()),
      instructions: v.string(),
    }),
  ),
  facts: v.array(
    v.object({
      fieldPath: v.string(),
      value: v.string(),
      citation: v.object({
        sourceSnapshotId: v.string(),
        excerpt: v.string(),
        page: v.union(v.number(), v.null()),
        section: v.union(v.string(), v.null()),
      }),
    }),
  ),
})

export type DecisionCandidateV1 = typeof decisionCandidateV1.type

export const extractionResponseV1 = v.object({
  status: v.union(v.literal('found'), v.literal('not_found')),
  decision: v.union(decisionCandidateV1, v.null()),
  reason: v.union(v.string(), v.null()),
})

export type ExtractionResponseV1 = typeof extractionResponseV1.type

export const storedDecisionV1 = decisionCandidateV1.omit('facts')

export type StoredDecisionV1 = typeof storedDecisionV1.type

export const storedFactsV1 = v.array(decisionCandidateV1.fields.facts.element)

export type StoredFactV1 = typeof storedFactsV1.type

export const MATERIAL_STRING_LIMITS = {
  sourceRecordId: 120,
  title: 300,
  bodyName: 200,
  meetingAt: 40,
  plainLanguageSummary: 2000,
  amountContext: 300,
  publicActionInstructions: 500,
  affectedPlace: 200,
  factFieldPath: 100,
  factValue: 2000,
  excerpt: 600,
  section: 200,
  reason: 500,
} as const

export const MATERIAL_ARRAY_LIMITS = {
  affectedPlaces: 20,
  amounts: 10,
  publicActions: 10,
  facts: 100,
} as const

const nullable = (schema: Record<string, unknown>) => ({
  anyOf: [schema, { type: 'null' as const }],
})

const stringSchema = { type: 'string' as const }

const materialFieldPathPattern =
  '^/(sourceRecordId|recordType|title|bodyName|meetingAt|lifecycleState|plainLanguageSummary|affectedPlaces/[0-9]+|amounts/[0-9]+/(value|currency|context)|publicActions/[0-9]+/(type|deadline|instructions))$'

const citationSchema = {
  type: 'object',
  properties: {
    sourceSnapshotId: stringSchema,
    excerpt: stringSchema,
    page: nullable({ type: 'integer', minimum: 1 }),
    section: nullable(stringSchema),
  },
  required: ['sourceSnapshotId', 'excerpt', 'page', 'section'],
  additionalProperties: false,
}

const factSchema = {
  type: 'object',
  properties: {
    fieldPath: { type: 'string', pattern: materialFieldPathPattern },
    value: stringSchema,
    citation: { $ref: '#/$defs/citation' },
  },
  required: ['fieldPath', 'value', 'citation'],
  additionalProperties: false,
}

const amountSchema = {
  type: 'object',
  properties: {
    value: { type: 'number', minimum: 0 },
    currency: { type: 'string', enum: ['USD'] },
    context: stringSchema,
  },
  required: ['value', 'currency', 'context'],
  additionalProperties: false,
}

const publicActionSchema = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['attend', 'comment', 'contact', 'apply', 'other'],
    },
    deadline: nullable(stringSchema),
    instructions: stringSchema,
  },
  required: ['type', 'deadline', 'instructions'],
  additionalProperties: false,
}

const decisionSchema = {
  type: 'object',
  properties: {
    sourceRecordId: nullable(stringSchema),
    recordType: {
      type: 'string',
      enum: [
        'proposal',
        'hearing',
        'vote',
        'contract',
        'appointment',
        'public_action',
        'other',
      ],
    },
    title: stringSchema,
    bodyName: stringSchema,
    meetingAt: nullable(stringSchema),
    lifecycleState: {
      type: 'string',
      enum: [
        'discovered',
        'proposed',
        'scheduled',
        'amended',
        'postponed',
        'decided',
        'implementing',
        'completed',
        'canceled',
        'unknown',
      ],
    },
    plainLanguageSummary: stringSchema,
    affectedPlaces: { type: 'array', items: stringSchema },
    amounts: { type: 'array', items: { $ref: '#/$defs/amount' } },
    publicActions: {
      type: 'array',
      items: { $ref: '#/$defs/publicAction' },
    },
    facts: { type: 'array', items: { $ref: '#/$defs/fact' } },
  },
  required: [
    'sourceRecordId',
    'recordType',
    'title',
    'bodyName',
    'meetingAt',
    'lifecycleState',
    'plainLanguageSummary',
    'affectedPlaces',
    'amounts',
    'publicActions',
    'facts',
  ],
  additionalProperties: false,
}

export const extractionJsonSchemaV1: Record<string, unknown> = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['found', 'not_found'] },
    decision: nullable(decisionSchema),
    reason: nullable(stringSchema),
  },
  required: ['status', 'decision', 'reason'],
  additionalProperties: false,
  $defs: {
    decision: decisionSchema,
    amount: amountSchema,
    publicAction: publicActionSchema,
    fact: factSchema,
    citation: citationSchema,
  },
}

export function schemaNameForExtractionV1(): string {
  return `public_parish_extraction_${EXTRACTION_SCHEMA_VERSION}`
}

export const MATERIAL_FIELD_PATHS = {
  sourceRecordId: '/sourceRecordId',
  recordType: '/recordType',
  title: '/title',
  bodyName: '/bodyName',
  meetingAt: '/meetingAt',
  lifecycleState: '/lifecycleState',
  plainLanguageSummary: '/plainLanguageSummary',
  affectedPlace: (index: number) => `/affectedPlaces/${index}`,
  amountValue: (index: number) => `/amounts/${index}/value`,
  amountCurrency: (index: number) => `/amounts/${index}/currency`,
  amountContext: (index: number) => `/amounts/${index}/context`,
  publicActionType: (index: number) => `/publicActions/${index}/type`,
  publicActionDeadline: (index: number) => `/publicActions/${index}/deadline`,
  publicActionInstructions: (index: number) =>
    `/publicActions/${index}/instructions`,
} as const

export type MaterialFieldV1 = { fieldPath: string; value: string }

export function materialFieldsV1(
  decision: Omit<DecisionCandidateV1, 'facts'>,
): MaterialFieldV1[] {
  const fields: MaterialFieldV1[] = [
    { fieldPath: MATERIAL_FIELD_PATHS.recordType, value: decision.recordType },
    { fieldPath: MATERIAL_FIELD_PATHS.title, value: decision.title },
    { fieldPath: MATERIAL_FIELD_PATHS.bodyName, value: decision.bodyName },
    {
      fieldPath: MATERIAL_FIELD_PATHS.lifecycleState,
      value: decision.lifecycleState,
    },
    {
      fieldPath: MATERIAL_FIELD_PATHS.plainLanguageSummary,
      value: decision.plainLanguageSummary,
    },
  ]
  if (decision.sourceRecordId !== null) {
    fields.push({
      fieldPath: MATERIAL_FIELD_PATHS.sourceRecordId,
      value: decision.sourceRecordId,
    })
  }
  if (decision.meetingAt !== null) {
    fields.push({
      fieldPath: MATERIAL_FIELD_PATHS.meetingAt,
      value: decision.meetingAt,
    })
  }
  decision.affectedPlaces.forEach((place, index) => {
    fields.push({
      fieldPath: MATERIAL_FIELD_PATHS.affectedPlace(index),
      value: place,
    })
  })
  decision.amounts.forEach((amount, index) => {
    fields.push(
      {
        fieldPath: MATERIAL_FIELD_PATHS.amountValue(index),
        value: String(amount.value),
      },
      {
        fieldPath: MATERIAL_FIELD_PATHS.amountCurrency(index),
        value: amount.currency,
      },
      {
        fieldPath: MATERIAL_FIELD_PATHS.amountContext(index),
        value: amount.context,
      },
    )
  })
  decision.publicActions.forEach((action, index) => {
    fields.push({
      fieldPath: MATERIAL_FIELD_PATHS.publicActionType(index),
      value: action.type,
    })
    if (action.deadline !== null) {
      fields.push({
        fieldPath: MATERIAL_FIELD_PATHS.publicActionDeadline(index),
        value: action.deadline,
      })
    }
    fields.push({
      fieldPath: MATERIAL_FIELD_PATHS.publicActionInstructions(index),
      value: action.instructions,
    })
  })
  return fields
}

export const AGENDA_FORBIDDEN_OUTCOME_STATES: LifecycleState[] = [
  'decided',
  'implementing',
  'completed',
  'canceled',
]

function bounded(value: string, limit: number, label: string): string | null {
  return value.length > limit
    ? `${label} exceeds the ${limit} character limit`
    : null
}

function requiredString(
  value: string,
  limit: number,
  label: string,
): string | null {
  if (value.trim() === '') {
    return `${label} must not be blank`
  }
  return bounded(value, limit, label)
}

export function checkExtractionContractV1(parsed: unknown): string | null {
  const response = parsed as ExtractionResponseV1
  if (response.status === 'found') {
    if (response.decision === null) {
      return 'status "found" requires a non-null decision'
    }
    if (response.reason !== null) {
      return 'status "found" requires reason to be null'
    }
    return checkDecisionBoundsV1(response.decision)
  }
  if (response.decision !== null) {
    return 'status "not_found" requires decision to be null'
  }
  if (response.reason === null) {
    return 'status "not_found" requires a reason'
  }
  return requiredString(
    response.reason,
    MATERIAL_STRING_LIMITS.reason,
    'reason',
  )
}

function checkDecisionBoundsV1(decision: DecisionCandidateV1): string | null {
  if (decision.sourceRecordId !== null) {
    const mismatch = requiredString(
      decision.sourceRecordId,
      MATERIAL_STRING_LIMITS.sourceRecordId,
      'sourceRecordId',
    )
    if (mismatch) return mismatch
  }
  for (const [field, key] of [
    [decision.title, 'title'],
    [decision.bodyName, 'bodyName'],
    [decision.plainLanguageSummary, 'plainLanguageSummary'],
  ] as const) {
    const mismatch = requiredString(field, MATERIAL_STRING_LIMITS[key], key)
    if (mismatch) return mismatch
  }
  if (decision.meetingAt !== null) {
    const mismatch = requiredString(
      decision.meetingAt,
      MATERIAL_STRING_LIMITS.meetingAt,
      'meetingAt',
    )
    if (mismatch) return mismatch
  }
  if (decision.affectedPlaces.length > MATERIAL_ARRAY_LIMITS.affectedPlaces) {
    return 'affectedPlaces exceeds the limit of 20 entries'
  }
  if (decision.amounts.length > MATERIAL_ARRAY_LIMITS.amounts) {
    return 'amounts exceeds the limit of 10 entries'
  }
  if (decision.publicActions.length > MATERIAL_ARRAY_LIMITS.publicActions) {
    return 'publicActions exceeds the limit of 10 entries'
  }
  if (decision.facts.length > MATERIAL_ARRAY_LIMITS.facts) {
    return 'facts exceeds the limit of 100 entries'
  }
  for (const place of decision.affectedPlaces) {
    const mismatch = requiredString(
      place,
      MATERIAL_STRING_LIMITS.affectedPlace,
      'affectedPlaces entry',
    )
    if (mismatch) return mismatch
  }
  for (const amount of decision.amounts) {
    const mismatch = requiredString(
      amount.context,
      MATERIAL_STRING_LIMITS.amountContext,
      'amounts entry context',
    )
    if (mismatch) return mismatch
  }
  for (const action of decision.publicActions) {
    const mismatch = requiredString(
      action.instructions,
      MATERIAL_STRING_LIMITS.publicActionInstructions,
      'publicActions entry instructions',
    )
    if (mismatch) return mismatch
    if (action.deadline !== null) {
      const deadlineMismatch = requiredString(
        action.deadline,
        MATERIAL_STRING_LIMITS.meetingAt,
        'publicActions entry deadline',
      )
      if (deadlineMismatch) return deadlineMismatch
    }
  }
  for (const fact of decision.facts) {
    for (const [value, key] of [
      [fact.fieldPath, 'factFieldPath'],
      [fact.value, 'factValue'],
      [fact.citation.excerpt, 'excerpt'],
    ] as const) {
      const mismatch = requiredString(
        value,
        MATERIAL_STRING_LIMITS[key],
        `fact ${fact.fieldPath || '<blank>'} ${key}`,
      )
      if (mismatch) return mismatch
    }
    if (fact.citation.section !== null) {
      const mismatch = requiredString(
        fact.citation.section,
        MATERIAL_STRING_LIMITS.section,
        `fact ${fact.fieldPath} section`,
      )
      if (mismatch) return mismatch
    }
    if (
      fact.citation.page !== null &&
      (!Number.isInteger(fact.citation.page) || fact.citation.page < 1)
    ) {
      return `fact ${fact.fieldPath} page must be a positive integer or null`
    }
  }
  return null
}
