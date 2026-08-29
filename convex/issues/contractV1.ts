import { v } from 'convex/values'

export const issueLifecycleStates = v.union(
  v.literal('developing'),
  v.literal('scheduled'),
  v.literal('active'),
  v.literal('decided'),
  v.literal('postponed'),
  v.literal('canceled'),
  v.literal('complete'),
  v.literal('unknown'),
)

export type IssueLifecycleState = typeof issueLifecycleStates.type

export const issueRelationshipTypes = v.union(
  v.literal('same_government_action'),
  v.literal('same_project_or_contract'),
  v.literal('same_subject_and_counterparty'),
  v.literal('follow_up_or_outcome'),
)

export const sharedSignalKinds = v.union(
  v.literal('official_identifier'),
  v.literal('counterparty'),
  v.literal('project'),
  v.literal('location'),
  v.literal('transaction'),
)

export const importanceFactorNames = v.union(
  v.literal('public_money'),
  v.literal('public_assets'),
  v.literal('land_use'),
  v.literal('health_safety'),
  v.literal('rights_access'),
  v.literal('service_delivery'),
  v.literal('public_deadline'),
)

export type ImportanceFactorName = typeof importanceFactorNames.type

export const importanceLevels = v.union(
  v.literal('absent'),
  v.literal('low'),
  v.literal('moderate'),
  v.literal('high'),
)

export type ImportanceLevel = typeof importanceLevels.type

export const issueCandidateFactV1 = v.object({
  fieldPath: v.string(),
  value: v.string(),
  citationIds: v.array(v.string()),
})

export const issueCandidateV1 = v.object({
  title: v.string(),
  summary: v.string(),
  lifecycleState: issueLifecycleStates,
  nextKnownAction: v.union(
    v.null(),
    v.object({ description: v.string(), at: v.union(v.string(), v.null()) }),
  ),
  topics: v.array(v.string()),
  links: v.array(
    v.object({
      recordId: v.string(),
      relationship: issueRelationshipTypes,
      reason: v.string(),
    }),
  ),
  sharedSignals: v.array(
    v.object({
      kind: sharedSignalKinds,
      value: v.string(),
      citationIds: v.array(v.string()),
    }),
  ),
  importanceFactors: v.array(
    v.object({
      factor: importanceFactorNames,
      level: importanceLevels,
      rationale: v.string(),
    }),
  ),
  facts: v.array(issueCandidateFactV1),
})

export type IssueCandidateV1 = typeof issueCandidateV1.type

export const issueReviewV1 = v.object({
  verdict: v.union(v.literal('pass'), v.literal('limited'), v.literal('fail')),
  checks: v.array(
    v.object({
      fieldPath: v.string(),
      assessment: v.union(
        v.literal('supported'),
        v.literal('unclear'),
        v.literal('unsupported'),
      ),
      detail: v.string(),
    }),
  ),
  findings: v.array(
    v.object({
      code: v.string(),
      severity: v.union(
        v.literal('info'),
        v.literal('limited'),
        v.literal('fail'),
      ),
      fieldPath: v.union(v.string(), v.null()),
      detail: v.string(),
    }),
  ),
})

export type IssueReviewV1 = typeof issueReviewV1.type

const FACTORS: ImportanceFactorName[] = [
  'public_money',
  'public_assets',
  'land_use',
  'health_safety',
  'rights_access',
  'service_delivery',
  'public_deadline',
]

const MAX = {
  title: 180,
  summary: 1_200,
  action: 500,
  topic: 80,
  reason: 600,
  signal: 180,
  rationale: 600,
  factValue: 2_000,
  detail: 600,
  fieldPath: 180,
} as const

export const issueCandidateJsonSchemaV1 = {
  type: 'object',
  additionalProperties: false,
  required: [
    'title',
    'summary',
    'lifecycleState',
    'nextKnownAction',
    'topics',
    'links',
    'sharedSignals',
    'importanceFactors',
    'facts',
  ],
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    lifecycleState: {
      type: 'string',
      enum: [
        'developing',
        'scheduled',
        'active',
        'decided',
        'postponed',
        'canceled',
        'complete',
        'unknown',
      ],
    },
    nextKnownAction: {
      anyOf: [
        { type: 'null' },
        {
          type: 'object',
          additionalProperties: false,
          required: ['description', 'at'],
          properties: {
            description: { type: 'string' },
            at: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          },
        },
      ],
    },
    topics: { type: 'array', items: { type: 'string' } },
    links: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['recordId', 'relationship', 'reason'],
        properties: {
          recordId: { type: 'string' },
          relationship: {
            type: 'string',
            enum: [
              'same_government_action',
              'same_project_or_contract',
              'same_subject_and_counterparty',
              'follow_up_or_outcome',
            ],
          },
          reason: { type: 'string' },
        },
      },
    },
    sharedSignals: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['kind', 'value', 'citationIds'],
        properties: {
          kind: {
            type: 'string',
            enum: [
              'official_identifier',
              'counterparty',
              'project',
              'location',
              'transaction',
            ],
          },
          value: { type: 'string' },
          citationIds: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    importanceFactors: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['factor', 'level', 'rationale'],
        properties: {
          factor: { type: 'string', enum: FACTORS },
          level: {
            type: 'string',
            enum: ['absent', 'low', 'moderate', 'high'],
          },
          rationale: { type: 'string' },
        },
      },
    },
    facts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['fieldPath', 'value', 'citationIds'],
        properties: {
          fieldPath: { type: 'string' },
          value: { type: 'string' },
          citationIds: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
} as const

export const issueReviewJsonSchemaV1 = {
  type: 'object',
  additionalProperties: false,
  required: ['verdict', 'checks', 'findings'],
  properties: {
    verdict: { type: 'string', enum: ['pass', 'limited', 'fail'] },
    checks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['fieldPath', 'assessment', 'detail'],
        properties: {
          fieldPath: { type: 'string' },
          assessment: {
            type: 'string',
            enum: ['supported', 'unclear', 'unsupported'],
          },
          detail: { type: 'string' },
        },
      },
    },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['code', 'severity', 'fieldPath', 'detail'],
        properties: {
          code: { type: 'string' },
          severity: { type: 'string', enum: ['info', 'limited', 'fail'] },
          fieldPath: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          detail: { type: 'string' },
        },
      },
    },
  },
} as const

function requiredBounded(value: string, limit: number, name: string) {
  const length = value.trim().length
  if (length === 0) return `${name} must not be blank`
  if (length > limit) return `${name} exceeds ${limit} characters`
  return null
}

function factValueMap(candidate: IssueCandidateV1): Map<string, string> {
  const values = new Map<string, string>([
    ['/title', candidate.title],
    ['/summary', candidate.summary],
    ['/lifecycleState', candidate.lifecycleState],
  ])
  if (candidate.nextKnownAction) {
    values.set(
      '/nextKnownAction/description',
      candidate.nextKnownAction.description,
    )
    if (candidate.nextKnownAction.at !== null) {
      values.set('/nextKnownAction/at', candidate.nextKnownAction.at)
    }
  }
  candidate.topics.forEach((topic, index) =>
    values.set(`/topics/${index}`, topic),
  )
  candidate.links.forEach((link, index) =>
    values.set(`/links/${index}/reason`, link.reason),
  )
  candidate.sharedSignals.forEach((signal, index) =>
    values.set(`/sharedSignals/${index}/value`, signal.value),
  )
  candidate.importanceFactors.forEach((factor) => {
    if (factor.level !== 'absent') {
      values.set(
        `/importanceFactors/${factor.factor}/rationale`,
        factor.rationale,
      )
    }
  })
  return values
}

export function checkIssueCandidateContractV1(
  parsed: unknown,
  recordIds: string[],
): string | null {
  const candidate = parsed as IssueCandidateV1
  for (const [value, limit, name] of [
    [candidate.title, MAX.title, 'title'],
    [candidate.summary, MAX.summary, 'summary'],
  ] as const) {
    const mismatch = requiredBounded(value, limit, name)
    if (mismatch) return mismatch
  }
  if (candidate.nextKnownAction) {
    const mismatch = requiredBounded(
      candidate.nextKnownAction.description,
      MAX.action,
      'nextKnownAction.description',
    )
    if (mismatch) return mismatch
  }
  if (candidate.topics.length > 10) return 'topics exceeds 10 entries'
  if (
    new Set(candidate.topics.map((topic) => topic.trim().toLowerCase()))
      .size !== candidate.topics.length
  ) {
    return 'topics must be unique'
  }
  for (const topic of candidate.topics) {
    const mismatch = requiredBounded(topic, MAX.topic, 'topic')
    if (mismatch) return mismatch
  }
  if (candidate.links.length !== recordIds.length) {
    return 'links must contain exactly one entry for every input record'
  }
  const expectedRecords = [...recordIds].sort()
  const linkedRecords = candidate.links.map((link) => link.recordId).sort()
  if (JSON.stringify(expectedRecords) !== JSON.stringify(linkedRecords)) {
    return 'links must name every input record exactly once'
  }
  for (const link of candidate.links) {
    const mismatch = requiredBounded(link.reason, MAX.reason, 'link reason')
    if (mismatch) return mismatch
  }
  if (
    candidate.sharedSignals.length < 1 ||
    candidate.sharedSignals.length > 5
  ) {
    return 'sharedSignals must contain 1 to 5 entries'
  }
  for (const signal of candidate.sharedSignals) {
    const mismatch = requiredBounded(signal.value, MAX.signal, 'shared signal')
    if (mismatch) return mismatch
    if (signal.value.trim().length < 8) return 'shared signal is too short'
    if (
      signal.citationIds.length < recordIds.length ||
      signal.citationIds.length > 20 ||
      new Set(signal.citationIds).size !== signal.citationIds.length
    ) {
      return 'each shared signal needs unique citations spanning every record'
    }
  }
  if (
    candidate.importanceFactors.length !== FACTORS.length ||
    JSON.stringify(
      candidate.importanceFactors.map((item) => item.factor).sort(),
    ) !== JSON.stringify([...FACTORS].sort())
  ) {
    return 'importanceFactors must contain every factor exactly once'
  }
  for (const factor of candidate.importanceFactors) {
    if (factor.level === 'absent') {
      if (factor.rationale !== '')
        return `absent ${factor.factor} rationale must be blank`
    } else {
      const mismatch = requiredBounded(
        factor.rationale,
        MAX.rationale,
        `${factor.factor} rationale`,
      )
      if (mismatch) return mismatch
    }
  }
  if (candidate.facts.length < 3 || candidate.facts.length > 100) {
    return 'facts must contain 3 to 100 entries'
  }
  const expectedFacts = factValueMap(candidate)
  const actualFacts = new Map(
    candidate.facts.map((fact) => [fact.fieldPath, fact]),
  )
  if (
    actualFacts.size !== candidate.facts.length ||
    actualFacts.size !== expectedFacts.size
  ) {
    return 'facts must contain exactly one entry for every material field'
  }
  for (const [fieldPath, value] of expectedFacts) {
    const fact = actualFacts.get(fieldPath)
    if (!fact || fact.value !== value)
      return `fact ${fieldPath} does not match its field value`
    const pathMismatch = requiredBounded(
      fieldPath,
      MAX.fieldPath,
      'fact fieldPath',
    )
    if (pathMismatch) return pathMismatch
    const valueMismatch = requiredBounded(
      value,
      MAX.factValue,
      `fact ${fieldPath} value`,
    )
    if (valueMismatch) return valueMismatch
    if (
      fact.citationIds.length < 1 ||
      fact.citationIds.length > 20 ||
      new Set(fact.citationIds).size !== fact.citationIds.length
    ) {
      return `fact ${fieldPath} needs 1 to 20 unique citations`
    }
  }
  return null
}

export function expectedIssueReviewVerdictV1(
  review: Pick<IssueReviewV1, 'checks' | 'findings'>,
): IssueReviewV1['verdict'] {
  const fail =
    review.findings.some((finding) => finding.severity === 'fail') ||
    review.checks.some(
      (check) =>
        isCoreIssueFactPath(check.fieldPath) &&
        check.assessment !== 'supported',
    )
  if (fail) return 'fail'
  const limited =
    review.findings.some((finding) => finding.severity === 'limited') ||
    review.checks.some((check) => check.assessment !== 'supported')
  return limited ? 'limited' : 'pass'
}

export function checkIssueReviewContractV1(
  parsed: unknown,
  factPaths: string[],
): string | null {
  const review = parsed as IssueReviewV1
  if (review.checks.length !== factPaths.length || review.checks.length > 100) {
    return 'review must contain exactly one check for every issue fact'
  }
  const expected = [...factPaths].sort()
  const actual = review.checks.map((check) => check.fieldPath).sort()
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    return 'review checks must name every issue fact exactly once'
  }
  for (const check of review.checks) {
    const mismatch = requiredBounded(
      check.detail,
      MAX.detail,
      'review check detail',
    )
    if (mismatch) return mismatch
  }
  if (review.findings.length > 20) return 'review findings exceeds 20 entries'
  for (const finding of review.findings) {
    const mismatch = requiredBounded(
      finding.detail,
      MAX.detail,
      'review finding detail',
    )
    if (mismatch) return mismatch
    if (finding.fieldPath !== null && !factPaths.includes(finding.fieldPath)) {
      return `review finding names unknown fact ${finding.fieldPath}`
    }
  }
  if (review.verdict !== expectedIssueReviewVerdictV1(review)) {
    return 'review verdict does not match its checks and findings'
  }
  return null
}

export function isCoreIssueFactPath(fieldPath: string): boolean {
  return (
    fieldPath === '/title' ||
    fieldPath === '/summary' ||
    /^\/links\/\d+\/reason$/.test(fieldPath) ||
    /^\/sharedSignals\/\d+\/value$/.test(fieldPath)
  )
}

export function schemaNameForIssueCandidateV1() {
  return 'public_parish_issue_candidate_v1'
}

export function schemaNameForIssueReviewV1() {
  return 'public_parish_issue_review_v1'
}
