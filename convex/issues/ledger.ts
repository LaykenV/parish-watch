import { ConvexError, v } from 'convex/values'

import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { internalMutation, internalQuery } from '../_generated/server'
import { aiRoutes, estimateCostUsd, modelRoles } from '../ai/types'
import {
  IMPORTANCE_RUBRIC_VERSION,
  ISSUE_BUILD_PROCESSOR_VERSION,
  ISSUE_LINK_PROMPT_VERSION,
  ISSUE_LINK_SCHEMA_VERSION,
  ISSUE_PAYLOAD_VERSION,
  ISSUE_POLICY_VERSION,
  ISSUE_REVIEW_PROMPT_VERSION,
  ISSUE_REVIEW_SCHEMA_VERSION,
} from '../pipeline/state'
import schema from '../schema'
import { sha256HexOfText } from '../sources/hashing'
import {
  checkIssueCandidateContractV1,
  checkIssueReviewContractV1,
  issueCandidateV1,
  issueReviewV1,
} from './contractV1'
import type { IssueCandidateV1, IssueReviewV1 } from './contractV1'
import { rankIssueCandidateV1 } from './scoringV1'

const evidenceCitation = v.object({
  citationId: v.string(),
  recordId: v.string(),
  sourceRecordId: v.string(),
  publicationVersionId: v.string(),
  fieldPath: v.string(),
  excerpt: v.string(),
  page: v.union(v.number(), v.null()),
  section: v.union(v.string(), v.null()),
})

const issueEvidenceRecord = v.object({
  recordId: v.string(),
  recordKey: v.string(),
  sourceRecordId: v.string(),
  publicationVersionId: v.string(),
  payloadJson: v.string(),
  citations: v.array(evidenceCitation),
})

export const issueBuildInput = v.object({
  issueBuildId: v.id('issueBuilds'),
  runId: v.id('pipelineRuns'),
  linkStageId: v.id('pipelineStages'),
  inputHash: v.string(),
  records: v.array(issueEvidenceRecord),
})

export type IssueBuildInput = typeof issueBuildInput.type

export const issueReviewContext = v.object({
  issueBuildId: v.id('issueBuilds'),
  runId: v.id('pipelineRuns'),
  reviewStageId: v.id('pipelineStages'),
  inputHash: v.string(),
  linkerModelId: v.string(),
  candidate: issueCandidateV1,
  facts: v.array(
    v.object({
      fieldPath: v.string(),
      value: v.string(),
      citations: v.array(evidenceCitation),
    }),
  ),
})

export type IssueReviewContext = typeof issueReviewContext.type

export const getIssueBuild = internalQuery({
  args: { issueBuildId: v.id('issueBuilds') },
  returns: v.union(v.null(), schema.doc('issueBuilds')),
  handler: async (ctx, args) => await ctx.db.get(args.issueBuildId),
})

type ReadCtx = QueryCtx | MutationCtx

type LoadedInputRecord = {
  record: Doc<'decisionRecords'>
  version: Doc<'publicationVersions'>
  citations: Doc<'citations'>[]
  governmentBodyName: string
  jurisdictionName: string
}

async function loadInputRecords(
  ctx: ReadCtx,
  build: Doc<'issueBuilds'>,
): Promise<LoadedInputRecord[]> {
  if (
    build.recordIds.length < 2 ||
    build.recordIds.length > 10 ||
    build.recordIds.length !== build.publicationVersionIds.length
  ) {
    throw new ConvexError({
      code: 'issue_input_bounds',
      message: 'Issue builds require 2 to 10 record and publication pairs',
    })
  }
  const governmentBody = await ctx.db.get(build.governmentBodyId)
  const jurisdiction = governmentBody
    ? await ctx.db.get(governmentBody.jurisdictionId)
    : null
  if (!governmentBody || !jurisdiction) {
    throw new ConvexError({
      code: 'issue_context_missing',
      message: 'Issue builds require their government body and jurisdiction',
    })
  }
  const loaded: LoadedInputRecord[] = []
  for (let index = 0; index < build.recordIds.length; index += 1) {
    const record = await ctx.db.get(build.recordIds[index])
    const version = await ctx.db.get(build.publicationVersionIds[index])
    if (
      !record ||
      !version ||
      record.governmentBodyId !== build.governmentBodyId ||
      record.currentPublishedVersionId !== version._id ||
      version.recordId !== record._id ||
      version.mode === 'withheld' ||
      version.payload === null
    ) {
      throw new ConvexError({
        code: 'issue_input_changed',
        message: 'Issue inputs must remain the current accepted publications',
      })
    }
    const citations = await ctx.db
      .query('citations')
      .withIndex('by_publication_and_field_path', (q) =>
        q.eq('publicationVersionId', version._id),
      )
      .take(101)
    if (citations.length === 0 || citations.length > 100) {
      throw new ConvexError({
        code: 'issue_citations_missing',
        message: 'Every issue input needs a bounded publication citation set',
      })
    }
    loaded.push({
      record,
      version,
      citations,
      governmentBodyName: governmentBody.name,
      jurisdictionName: jurisdiction.name,
    })
  }
  return loaded
}

function toEvidenceCitation(
  item: LoadedInputRecord,
  citation: Doc<'citations'>,
): typeof evidenceCitation.type {
  return {
    citationId: citation._id,
    recordId: item.record._id,
    sourceRecordId: item.record.sourceRecordId,
    publicationVersionId: item.version._id,
    fieldPath: citation.fieldPath,
    excerpt: citation.excerpt,
    page: citation.page ?? null,
    section: citation.section ?? null,
  }
}

export const loadIssueBuildInput = internalQuery({
  args: {
    issueBuildId: v.id('issueBuilds'),
    linkStageId: v.id('pipelineStages'),
  },
  returns: issueBuildInput,
  handler: async (ctx, args): Promise<IssueBuildInput> => {
    const build = await ctx.db.get(args.issueBuildId)
    const run = build ? await ctx.db.get(build.runId) : null
    const stage = await ctx.db.get(args.linkStageId)
    if (
      !build ||
      !run ||
      !stage ||
      run._id !== build.runId ||
      run.issueBuildId !== build._id ||
      stage.runId !== run._id ||
      stage.stage !== 'link'
    ) {
      throw new ConvexError({
        code: 'issue_build_target_mismatch',
        message: 'Issue build, run, and link stage must agree',
      })
    }
    const loaded = await loadInputRecords(ctx, build)
    return {
      issueBuildId: build._id,
      runId: run._id,
      linkStageId: stage._id,
      inputHash: build.inputHash,
      records: loaded.map((item) => ({
        recordId: item.record._id,
        recordKey: item.record.recordKey,
        sourceRecordId: item.record.sourceRecordId,
        publicationVersionId: item.version._id,
        payloadJson: JSON.stringify(item.version.payload),
        citations: item.citations.map((citation) =>
          toEvidenceCitation(item, citation),
        ),
      })),
    }
  },
})

async function requireIssueStage(
  ctx: MutationCtx,
  input: {
    issueBuildId: Id<'issueBuilds'>
    stageId: Id<'pipelineStages'>
    stage: 'link' | 'review' | 'rank' | 'publish'
  },
) {
  const build = await ctx.db.get(input.issueBuildId)
  const run = build ? await ctx.db.get(build.runId) : null
  const stage = await ctx.db.get(input.stageId)
  if (
    !build ||
    !run ||
    !stage ||
    run.issueBuildId !== build._id ||
    stage.runId !== run._id ||
    stage.stage !== input.stage ||
    run.processorVersion !== ISSUE_BUILD_PROCESSOR_VERSION
  ) {
    throw new ConvexError({
      code: 'issue_build_target_mismatch',
      message: `Issue build does not own the ${input.stage} stage`,
    })
  }
  return { build, run, stage }
}

export const beginIssueStageAttempt = internalMutation({
  args: {
    issueBuildId: v.id('issueBuilds'),
    stageId: v.id('pipelineStages'),
    stage: v.union(v.literal('link'), v.literal('review')),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const { run, stage } = await requireIssueStage(ctx, args)
    if (
      run.state === 'failed_terminal' ||
      stage.state === 'failed_terminal' ||
      stage.state === 'superseded'
    ) {
      throw new ConvexError({
        code: 'issue_stage_state_collision',
        message: `Issue ${args.stage} cannot start from a terminal state`,
      })
    }
    const attempt = stage.attempt + 1
    await ctx.db.patch(stage._id, {
      state: 'running',
      attempt,
      startedAt: stage.startedAt ?? Date.now(),
    })
    return attempt
  },
})

export const recordIssueModelAttempt = internalMutation({
  args: {
    issueBuildId: v.id('issueBuilds'),
    stageId: v.id('pipelineStages'),
    stage: v.union(v.literal('link'), v.literal('review')),
    modelRole: modelRoles,
    attempt: v.number(),
    route: aiRoutes,
    modelId: v.string(),
    status: v.string(),
    httpStatus: v.optional(v.number()),
    latencyMs: v.number(),
    requestId: v.optional(v.string()),
    promptTokens: v.optional(v.number()),
    completionTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    cachedTokens: v.optional(v.number()),
    reasoningTokens: v.optional(v.number()),
    retryAfterMs: v.optional(v.number()),
    errorClass: v.optional(v.string()),
    errorDetail: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { build, run, stage } = await requireIssueStage(ctx, args)
    const roleMatchesStage =
      (args.stage === 'link' && args.modelRole === 'MODEL_STRONG') ||
      (args.stage === 'review' && args.modelRole === 'MODEL_FAST')
    if (
      stage.state !== 'running' ||
      stage.attempt !== args.attempt ||
      !roleMatchesStage ||
      (args.stage === 'review' && build.modelId === args.modelId)
    ) {
      throw new ConvexError({
        code: 'issue_model_role_mismatch',
        message: 'Issue model attempt does not match the active stage and role',
      })
    }
    await ctx.db.insert('aiCalls', {
      runId: run._id,
      stageId: stage._id,
      issueBuildId: build._id,
      route: args.route,
      modelRole: args.modelRole,
      modelId: args.modelId,
      promptVersion:
        args.stage === 'link'
          ? ISSUE_LINK_PROMPT_VERSION
          : ISSUE_REVIEW_PROMPT_VERSION,
      schemaVersion:
        args.stage === 'link'
          ? ISSUE_LINK_SCHEMA_VERSION
          : ISSUE_REVIEW_SCHEMA_VERSION,
      attempt: args.attempt,
      status: args.status,
      httpStatus: args.httpStatus,
      latencyMs: args.latencyMs,
      requestId: args.requestId,
      promptTokens: args.promptTokens,
      completionTokens: args.completionTokens,
      totalTokens: args.totalTokens,
      cachedTokens: args.cachedTokens,
      reasoningTokens: args.reasoningTokens,
      estimatedCostUsd:
        estimateCostUsd(args.modelRole, {
          promptTokens: args.promptTokens ?? null,
          completionTokens: args.completionTokens ?? null,
          totalTokens: args.totalTokens ?? null,
          cachedTokens: args.cachedTokens ?? null,
          reasoningTokens: args.reasoningTokens ?? null,
        }) ?? undefined,
      retryAfterMs: args.retryAfterMs,
      errorClass: args.errorClass,
      errorDetail: args.errorDetail?.slice(0, 500),
      createdAt: Date.now(),
    })
    return null
  },
})

function normalizeEvidenceText(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

const GENERIC_SIGNALS = new Set([
  'government',
  'city council',
  'parish council',
  'public hearing',
  'meeting agenda',
  'meeting minutes',
  'ordinance',
  'resolution',
  'donation',
  'approved',
  'adopted',
  'scheduled',
])

function sameIds(left: string[], right: string[]): boolean {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort())
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(',')}]`
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([left], [right]) => left.localeCompare(right),
    )
    return `{${entries
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

function validateIssueCandidateEvidence(
  candidate: IssueCandidateV1,
  loaded: LoadedInputRecord[],
): string | null {
  const recordIds = loaded.map((item) => item.record._id)
  const contractError = checkIssueCandidateContractV1(candidate, recordIds)
  if (contractError) return contractError

  const allowedCitations = new Map<
    string,
    { citation: Doc<'citations'>; recordId: string }
  >()
  for (const item of loaded) {
    for (const citation of item.citations) {
      allowedCitations.set(citation._id, {
        citation,
        recordId: item.record._id,
      })
    }
  }
  for (const fact of candidate.facts) {
    if (
      fact.citationIds.some((citationId) => !allowedCitations.has(citationId))
    ) {
      return `fact ${fact.fieldPath} names a citation outside the issue inputs`
    }
  }
  const facts = new Map(candidate.facts.map((fact) => [fact.fieldPath, fact]))
  for (let index = 0; index < candidate.links.length; index += 1) {
    const link = candidate.links[index]
    const fact = facts.get(`/links/${index}/reason`)
    if (!fact) return `link ${index} is missing its reason fact`
    const citedRecords = new Set(
      fact.citationIds.map(
        (citationId) => allowedCitations.get(citationId)?.recordId,
      ),
    )
    if (!citedRecords.has(link.recordId) || citedRecords.size < 2) {
      return `link ${index} needs evidence from its record and another record`
    }
  }
  const governmentContext = new Set([
    normalizeEvidenceText(loaded[0].governmentBodyName),
    normalizeEvidenceText(loaded[0].jurisdictionName),
  ])
  for (let index = 0; index < candidate.sharedSignals.length; index += 1) {
    const signal = candidate.sharedSignals[index]
    const normalizedSignal = normalizeEvidenceText(signal.value)
    if (GENERIC_SIGNALS.has(normalizedSignal)) {
      return `shared signal ${index} is too generic to establish a link`
    }
    if (governmentContext.has(normalizedSignal)) {
      return `shared signal ${index} only names the issue's government body or jurisdiction`
    }
    const fact = facts.get(`/sharedSignals/${index}/value`)
    if (!fact || !sameIds(fact.citationIds, signal.citationIds)) {
      return `shared signal ${index} citations must match its fact`
    }
    for (const recordId of recordIds) {
      const appearsForRecord = signal.citationIds.some((citationId) => {
        const evidence = allowedCitations.get(citationId)
        return (
          evidence?.recordId === recordId &&
          normalizeEvidenceText(evidence.citation.excerpt).includes(
            normalizedSignal,
          )
        )
      })
      if (!appearsForRecord) {
        return `shared signal ${index} is not present in cited evidence for every record`
      }
    }
  }
  return null
}

export const persistIssueCandidate = internalMutation({
  args: {
    issueBuildId: v.id('issueBuilds'),
    linkStageId: v.id('pipelineStages'),
    inputHash: v.string(),
    modelId: v.string(),
    route: aiRoutes,
    rawResponseStorageId: v.id('_storage'),
    responseHash: v.string(),
    responseByteLength: v.number(),
    candidate: issueCandidateV1,
  },
  returns: v.object({ candidateHash: v.string() }),
  handler: async (ctx, args) => {
    const { build, stage } = await requireIssueStage(ctx, {
      issueBuildId: args.issueBuildId,
      stageId: args.linkStageId,
      stage: 'link',
    })
    if (build.inputHash !== args.inputHash) {
      throw new ConvexError({
        code: 'issue_input_changed',
        message: 'Issue input hash changed before candidate persistence',
      })
    }
    const loaded = await loadInputRecords(ctx, build)
    const evidenceError = validateIssueCandidateEvidence(args.candidate, loaded)
    if (evidenceError) {
      throw new ConvexError({
        code: 'issue_candidate_invalid',
        message: evidenceError,
      })
    }
    const candidateHash = await sha256HexOfText(JSON.stringify(args.candidate))
    if (build.candidate) {
      if (build.candidateHash !== candidateHash) {
        throw new ConvexError({
          code: 'issue_candidate_collision',
          message: 'Issue build already contains a different candidate',
        })
      }
      return { candidateHash }
    }
    const now = Date.now()
    await ctx.db.patch(build._id, {
      state: 'candidate_ready',
      modelId: args.modelId,
      route: args.route,
      rawResponseStorageId: args.rawResponseStorageId,
      responseHash: args.responseHash,
      responseByteLength: args.responseByteLength,
      candidate: args.candidate,
      candidateHash,
      updatedAt: now,
    })
    await ctx.db.patch(stage._id, {
      state: 'succeeded',
      completedAt: now,
    })
    return { candidateHash }
  },
})

export const persistIssueCandidateFailure = internalMutation({
  args: {
    issueBuildId: v.id('issueBuilds'),
    linkStageId: v.id('pipelineStages'),
    inputHash: v.string(),
    modelId: v.optional(v.string()),
    route: aiRoutes,
    rawResponseStorageId: v.id('_storage'),
    responseHash: v.string(),
    responseByteLength: v.number(),
    errorClass: v.string(),
    errorDetail: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { build } = await requireIssueStage(ctx, {
      issueBuildId: args.issueBuildId,
      stageId: args.linkStageId,
      stage: 'link',
    })
    if (build.inputHash !== args.inputHash || build.candidate) {
      throw new ConvexError({
        code: 'issue_candidate_collision',
        message: 'Failed issue response does not match an empty active build',
      })
    }
    await ctx.db.patch(build._id, {
      modelId: args.modelId,
      route: args.route,
      rawResponseStorageId: args.rawResponseStorageId,
      responseHash: args.responseHash,
      responseByteLength: args.responseByteLength,
      errorClass: args.errorClass,
      errorDetail: args.errorDetail.slice(0, 500),
      updatedAt: Date.now(),
    })
    return null
  },
})

export const loadIssueReviewContext = internalQuery({
  args: {
    issueBuildId: v.id('issueBuilds'),
    reviewStageId: v.id('pipelineStages'),
  },
  returns: issueReviewContext,
  handler: async (ctx, args): Promise<IssueReviewContext> => {
    const build = await ctx.db.get(args.issueBuildId)
    const stage = await ctx.db.get(args.reviewStageId)
    if (
      !build ||
      !stage ||
      stage.runId !== build.runId ||
      stage.stage !== 'review' ||
      !build.candidate ||
      !build.candidateHash ||
      !build.modelId
    ) {
      throw new ConvexError({
        code: 'issue_review_target_mismatch',
        message: 'Issue candidate and review stage must be ready',
      })
    }
    const loaded = await loadInputRecords(ctx, build)
    const citations = new Map<string, typeof evidenceCitation.type>()
    for (const item of loaded) {
      for (const citation of item.citations) {
        citations.set(citation._id, toEvidenceCitation(item, citation))
      }
    }
    return {
      issueBuildId: build._id,
      runId: build.runId,
      reviewStageId: stage._id,
      inputHash: build.candidateHash,
      linkerModelId: build.modelId,
      candidate: build.candidate,
      facts: build.candidate.facts.map((fact) => ({
        fieldPath: fact.fieldPath,
        value: fact.value,
        citations: fact.citationIds.map((citationId) => {
          const citation = citations.get(citationId)
          if (!citation) {
            throw new ConvexError({
              code: 'issue_citations_changed',
              message: `Issue fact ${fact.fieldPath} lost citation ${citationId}`,
            })
          }
          return citation
        }),
      })),
    }
  },
})

export const loadIssueReviewForBuild = internalQuery({
  args: { issueBuildId: v.id('issueBuilds'), inputHash: v.string() },
  returns: v.union(v.null(), schema.doc('issueBuildReviews')),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('issueBuildReviews')
      .withIndex('by_build_and_input_hash', (q) =>
        q.eq('issueBuildId', args.issueBuildId).eq('inputHash', args.inputHash),
      )
      .unique()
  },
})

export const persistIssueReviewSuccess = internalMutation({
  args: {
    issueBuildId: v.id('issueBuilds'),
    reviewStageId: v.id('pipelineStages'),
    inputHash: v.string(),
    modelId: v.string(),
    route: aiRoutes,
    rawResponseStorageId: v.id('_storage'),
    responseHash: v.string(),
    responseByteLength: v.number(),
    review: issueReviewV1,
  },
  returns: v.id('issueBuildReviews'),
  handler: async (ctx, args) => {
    const { build, run, stage } = await requireIssueStage(ctx, {
      issueBuildId: args.issueBuildId,
      stageId: args.reviewStageId,
      stage: 'review',
    })
    if (
      !build.candidate ||
      build.candidateHash !== args.inputHash ||
      !build.modelId ||
      build.modelId === args.modelId
    ) {
      throw new ConvexError({
        code: 'issue_review_model_not_independent',
        message:
          'Issue review must cover the stored candidate with another model',
      })
    }
    const contractError = checkIssueReviewContractV1(
      args.review,
      build.candidate.facts.map((fact) => fact.fieldPath),
    )
    if (contractError) {
      throw new ConvexError({
        code: 'issue_review_invalid',
        message: contractError,
      })
    }
    const existing = await ctx.db
      .query('issueBuildReviews')
      .withIndex('by_build_and_input_hash', (q) =>
        q.eq('issueBuildId', build._id).eq('inputHash', args.inputHash),
      )
      .unique()
    if (existing) {
      if (existing.state !== 'succeeded') {
        throw new ConvexError({
          code: 'issue_review_collision',
          message: 'Issue build already has a failed review for this input',
        })
      }
      return existing._id
    }
    const now = Date.now()
    const reviewId = await ctx.db.insert('issueBuildReviews', {
      runId: run._id,
      stageId: stage._id,
      issueBuildId: build._id,
      inputHash: args.inputHash,
      state: 'succeeded',
      verdict: args.review.verdict,
      modelRole: 'MODEL_FAST',
      modelId: args.modelId,
      route: args.route,
      promptVersion: ISSUE_REVIEW_PROMPT_VERSION,
      schemaVersion: ISSUE_REVIEW_SCHEMA_VERSION,
      processorVersion: ISSUE_BUILD_PROCESSOR_VERSION,
      rawResponseStorageId: args.rawResponseStorageId,
      responseHash: args.responseHash,
      responseByteLength: args.responseByteLength,
      findings: args.review.findings,
      createdAt: now,
    })
    for (const check of args.review.checks) {
      await ctx.db.insert('issueBuildReviewChecks', {
        reviewId,
        issueBuildId: build._id,
        fieldPath: check.fieldPath,
        assessment: check.assessment,
        detail: check.detail,
      })
    }
    await ctx.db.patch(build._id, {
      reviewId,
      state: 'reviewed',
      updatedAt: now,
    })
    await ctx.db.patch(stage._id, {
      state: 'succeeded',
      completedAt: now,
      outputIssueBuildReviewId: reviewId,
    })
    return reviewId
  },
})

export const persistIssueReviewFailure = internalMutation({
  args: {
    issueBuildId: v.id('issueBuilds'),
    reviewStageId: v.id('pipelineStages'),
    inputHash: v.string(),
    modelId: v.optional(v.string()),
    route: v.optional(aiRoutes),
    rawResponseStorageId: v.optional(v.id('_storage')),
    responseHash: v.optional(v.string()),
    responseByteLength: v.optional(v.number()),
    errorClass: v.string(),
    errorDetail: v.string(),
  },
  returns: v.id('issueBuildReviews'),
  handler: async (ctx, args) => {
    const { build, run, stage } = await requireIssueStage(ctx, {
      issueBuildId: args.issueBuildId,
      stageId: args.reviewStageId,
      stage: 'review',
    })
    const existing = await ctx.db
      .query('issueBuildReviews')
      .withIndex('by_build_and_input_hash', (q) =>
        q.eq('issueBuildId', build._id).eq('inputHash', args.inputHash),
      )
      .unique()
    if (existing) return existing._id
    const reviewId = await ctx.db.insert('issueBuildReviews', {
      runId: run._id,
      stageId: stage._id,
      issueBuildId: build._id,
      inputHash: args.inputHash,
      state: 'failed',
      modelRole: 'MODEL_FAST',
      modelId: args.modelId,
      route: args.route,
      promptVersion: ISSUE_REVIEW_PROMPT_VERSION,
      schemaVersion: ISSUE_REVIEW_SCHEMA_VERSION,
      processorVersion: ISSUE_BUILD_PROCESSOR_VERSION,
      rawResponseStorageId: args.rawResponseStorageId,
      responseHash: args.responseHash,
      responseByteLength: args.responseByteLength,
      findings: [],
      errorClass: args.errorClass,
      errorDetail: args.errorDetail.slice(0, 500),
      createdAt: Date.now(),
    })
    await ctx.db.patch(build._id, { reviewId, updatedAt: Date.now() })
    return reviewId
  },
})

async function loadPersistedReview(
  ctx: MutationCtx,
  build: Doc<'issueBuilds'>,
  reviewId: Id<'issueBuildReviews'>,
): Promise<IssueReviewV1> {
  const review = await ctx.db.get(reviewId)
  if (
    !review ||
    review.issueBuildId !== build._id ||
    review.state !== 'succeeded' ||
    review.verdict === undefined ||
    review.inputHash !== build.candidateHash
  ) {
    throw new ConvexError({
      code: 'issue_review_target_mismatch',
      message: 'Issue review does not cover the stored candidate',
    })
  }
  const checks = await ctx.db
    .query('issueBuildReviewChecks')
    .withIndex('by_review_and_field_path', (q) => q.eq('reviewId', review._id))
    .take(101)
  if (!build.candidate || checks.length !== build.candidate.facts.length) {
    throw new ConvexError({
      code: 'issue_review_evidence_mismatch',
      message: 'Persisted issue review checks are incomplete',
    })
  }
  const value: IssueReviewV1 = {
    verdict: review.verdict,
    checks: checks.map((check) => ({
      fieldPath: check.fieldPath,
      assessment: check.assessment,
      detail: check.detail,
    })),
    findings: review.findings,
  }
  const contractError = checkIssueReviewContractV1(
    value,
    build.candidate.facts.map((fact) => fact.fieldPath),
  )
  if (contractError) {
    throw new ConvexError({
      code: 'issue_review_evidence_mismatch',
      message: contractError,
    })
  }
  return value
}

function publicActionDeadlines(loaded: LoadedInputRecord[]): string[] {
  return loaded.flatMap(({ version }) =>
    version.payload?.kind === 'full'
      ? version.payload.publicActions.flatMap((action) =>
          action.deadline === null ? [] : [action.deadline],
        )
      : [],
  )
}

export const rankIssueBuild = internalMutation({
  args: {
    issueBuildId: v.id('issueBuilds'),
    rankStageId: v.id('pipelineStages'),
    reviewId: v.id('issueBuildReviews'),
  },
  returns: v.object({
    mode: v.union(
      v.literal('full'),
      v.literal('limited'),
      v.literal('withheld'),
    ),
    reasonCode: v.string(),
  }),
  handler: async (ctx, args) => {
    const { build, stage } = await requireIssueStage(ctx, {
      issueBuildId: args.issueBuildId,
      stageId: args.rankStageId,
      stage: 'rank',
    })
    if (!build.candidate) {
      throw new ConvexError({
        code: 'issue_candidate_missing',
        message: 'Issue candidate is missing before ranking',
      })
    }
    const review = await loadPersistedReview(ctx, build, args.reviewId)
    const loaded = await loadInputRecords(ctx, build)
    const ranked = rankIssueCandidateV1({
      candidate: build.candidate,
      review,
      now: build.createdAt,
      publicActionDeadlines: publicActionDeadlines(loaded),
    })
    const rankedResult = {
      mode: ranked.mode,
      reasonCode: ranked.reasonCode,
      supportedFactPaths: ranked.supportedFactPaths,
      importance: ranked.importance,
    }
    if (
      build.rankedResult &&
      canonicalJson(build.rankedResult) !== canonicalJson(rankedResult)
    ) {
      throw new ConvexError({
        code: 'issue_ranking_collision',
        message: 'Issue build already contains a different deterministic score',
      })
    }
    const now = Date.now()
    await ctx.db.patch(build._id, {
      state: 'ranked',
      rankedResult,
      updatedAt: now,
    })
    await ctx.db.patch(stage._id, {
      state: 'succeeded',
      attempt: stage.attempt + 1,
      startedAt: stage.startedAt ?? now,
      completedAt: now,
      outputIssueBuildReviewId: args.reviewId,
    })
    return { mode: ranked.mode, reasonCode: ranked.reasonCode }
  },
})

function slugForIssue(title: string, issueKey: string): string {
  const stem = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70)
  return `${stem || 'issue'}-${issueKey.slice(0, 8)}`
}

export const publishIssueBuild = internalMutation({
  args: {
    issueBuildId: v.id('issueBuilds'),
    publishStageId: v.id('pipelineStages'),
    reviewId: v.id('issueBuildReviews'),
  },
  returns: v.object({
    issueId: v.id('issues'),
    issueVersionId: v.id('issueVersions'),
    mode: v.union(
      v.literal('full'),
      v.literal('limited'),
      v.literal('withheld'),
    ),
  }),
  handler: async (ctx, args) => {
    const { build, run, stage } = await requireIssueStage(ctx, {
      issueBuildId: args.issueBuildId,
      stageId: args.publishStageId,
      stage: 'publish',
    })
    const existingVersion = await ctx.db
      .query('issueVersions')
      .withIndex('by_build', (q) => q.eq('buildId', build._id))
      .unique()
    if (existingVersion) {
      return {
        issueId: existingVersion.issueId,
        issueVersionId: existingVersion._id,
        mode: existingVersion.mode,
      }
    }
    if (!build.candidate || !build.rankedResult) {
      throw new ConvexError({
        code: 'issue_not_ranked',
        message:
          'Issue candidate must be reviewed and ranked before publication',
      })
    }
    const review = await loadPersistedReview(ctx, build, args.reviewId)
    const loaded = await loadInputRecords(ctx, build)
    const ranked = rankIssueCandidateV1({
      candidate: build.candidate,
      review,
      now: build.createdAt,
      publicActionDeadlines: publicActionDeadlines(loaded),
    })
    const rankedResult = {
      mode: ranked.mode,
      reasonCode: ranked.reasonCode,
      supportedFactPaths: ranked.supportedFactPaths,
      importance: ranked.importance,
    }
    if (canonicalJson(build.rankedResult) !== canonicalJson(rankedResult)) {
      throw new ConvexError({
        code: 'issue_ranking_changed',
        message: 'Issue score changed between ranking and publication',
      })
    }

    let issue = await ctx.db
      .query('issues')
      .withIndex('by_issue_key', (q) => q.eq('issueKey', build.issueKey))
      .unique()
    const now = Date.now()
    if (issue && issue.governmentBodyId !== build.governmentBodyId) {
      throw new ConvexError({
        code: 'issue_identity_collision',
        message: 'Stable issue key belongs to another government body',
      })
    }
    if (!issue) {
      const issueId = await ctx.db.insert('issues', {
        issueKey: build.issueKey,
        slug: slugForIssue(build.candidate.title, build.issueKey),
        governmentBodyId: build.governmentBodyId,
        createdAt: now,
        updatedAt: now,
      })
      issue = await ctx.db.get(issueId)
    }
    if (!issue) throw new Error('Issue creation failed')
    const latestVersion = await ctx.db
      .query('issueVersions')
      .withIndex('by_issue_and_version', (q) => q.eq('issueId', issue._id))
      .order('desc')
      .first()
    const version = (latestVersion?.version ?? 0) + 1
    const supported = new Set(ranked.supportedFactPaths)
    const candidate = build.candidate
    const payload =
      ranked.mode === 'withheld'
        ? null
        : {
            kind: ranked.mode,
            title: candidate.title,
            summary: candidate.summary,
            lifecycleState: supported.has('/lifecycleState')
              ? candidate.lifecycleState
              : undefined,
            nextKnownAction:
              candidate.nextKnownAction &&
              supported.has('/nextKnownAction/description') &&
              (candidate.nextKnownAction.at === null ||
                supported.has('/nextKnownAction/at'))
                ? candidate.nextKnownAction
                : undefined,
            topics: candidate.topics.filter((_topic, index) =>
              supported.has(`/topics/${index}`),
            ),
            importance: ranked.importance,
          }
    const payloadHash = await sha256HexOfText(JSON.stringify(payload))
    const issueVersionId = await ctx.db.insert('issueVersions', {
      issueId: issue._id,
      buildId: build._id,
      version,
      mode: ranked.mode,
      reasonCode: ranked.reasonCode,
      policyVersion: ISSUE_POLICY_VERSION,
      payloadVersion: ISSUE_PAYLOAD_VERSION,
      payloadHash,
      payload,
      createdAt: now,
    })
    if (ranked.mode !== 'withheld') {
      const facts = new Map(
        candidate.facts.map((fact) => [fact.fieldPath, fact]),
      )
      for (let index = 0; index < candidate.links.length; index += 1) {
        const link = candidate.links[index]
        const fact = facts.get(`/links/${index}/reason`)
        const recordId = ctx.db.normalizeId('decisionRecords', link.recordId)
        const publicationIndex = build.recordIds.findIndex(
          (id) => id === recordId,
        )
        if (!fact || !recordId || publicationIndex < 0) {
          throw new ConvexError({
            code: 'issue_link_changed',
            message: `Issue link ${index} no longer matches its evidence`,
          })
        }
        await ctx.db.insert('issueDecisionLinks', {
          issueId: issue._id,
          issueVersionId,
          recordId,
          publicationVersionId: build.publicationVersionIds[publicationIndex],
          relationship: link.relationship,
          reason: link.reason,
          citationIds: fact.citationIds as Id<'citations'>[],
          linkerVersion: ISSUE_BUILD_PROCESSOR_VERSION,
          createdAt: now,
        })
      }
      for (const assessment of ranked.assessments) {
        await ctx.db.insert('importanceAssessments', {
          issueId: issue._id,
          issueVersionId,
          ...assessment,
          rubricVersion: IMPORTANCE_RUBRIC_VERSION,
          createdAt: now,
        })
      }
      await ctx.db.patch(issue._id, {
        currentVersionId: issueVersionId,
        currentMode: ranked.mode,
        updatedAt: now,
      })
    } else {
      await ctx.db.patch(issue._id, { updatedAt: now })
    }
    await ctx.db.patch(build._id, {
      state: ranked.mode === 'withheld' ? 'withheld' : 'published',
      issueVersionId,
      updatedAt: now,
    })
    await ctx.db.patch(stage._id, {
      state: 'succeeded',
      attempt: stage.attempt + 1,
      startedAt: stage.startedAt ?? now,
      completedAt: now,
      outputIssueBuildReviewId: args.reviewId,
      outputIssueVersionId: issueVersionId,
    })
    await ctx.db.patch(run._id, { state: 'succeeded', completedAt: now })
    return { issueId: issue._id, issueVersionId, mode: ranked.mode }
  },
})

export const failIssueBuild = internalMutation({
  args: {
    issueBuildId: v.id('issueBuilds'),
    errorClass: v.string(),
    errorDetail: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) =>
    failIssueBuildTransaction(ctx, {
      issueBuildId: args.issueBuildId,
      errorClass: args.errorClass,
      errorDetail: args.errorDetail,
    }),
})

export async function failIssueBuildTransaction(
  ctx: MutationCtx,
  args: {
    issueBuildId: Id<'issueBuilds'>
    errorClass: string
    errorDetail: string
  },
): Promise<null> {
  const build = await ctx.db.get(args.issueBuildId)
  const run = build ? await ctx.db.get(build.runId) : null
  if (!build || !run) return null
  if (run.state === 'succeeded' || run.state === 'superseded') return null
  const now = Date.now()
  await ctx.db.patch(build._id, {
    state: 'failed',
    errorClass: args.errorClass,
    errorDetail: args.errorDetail.slice(0, 500),
    updatedAt: now,
  })
  await ctx.db.patch(run._id, { state: 'failed_terminal', completedAt: now })
  const stages = await ctx.db
    .query('pipelineStages')
    .withIndex('by_run_and_stage', (q) => q.eq('runId', run._id))
    .take(10)
  for (const stage of stages) {
    if (stage.state !== 'succeeded' && stage.state !== 'superseded') {
      await ctx.db.patch(stage._id, {
        state: 'failed_terminal',
        completedAt: now,
        errorClass: args.errorClass,
        errorDetail: args.errorDetail.slice(0, 500),
      })
    }
  }
  return null
}
