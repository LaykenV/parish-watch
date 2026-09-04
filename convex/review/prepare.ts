import { ConvexError, v } from 'convex/values'

import { internal } from '../_generated/api'
import type { Doc } from '../_generated/dataModel'
import { internalAction, internalQuery } from '../_generated/server'
import {
  lifecycleStates,
  MATERIAL_ARRAY_LIMITS,
  materialFieldsV1,
  publicActionTypes,
  recordTypes,
} from '../extraction/contractV1'
import { locateExcerpt, normalizeForMatch } from '../extraction/textMatch'
import {
  PUBLICATION_PROCESSOR_VERSION,
  resolveSourceRecordIdProvenance,
  sourceKindUnion,
  sourceRecordIdProvenances,
} from '../pipeline/state'
import schema from '../schema'
import { isRegisteredSourceUrl } from '../sources/domains'
import { sha256HexOfText } from '../sources/hashing'

const reviewFactValidator = v.object({
  factId: v.id('candidateFacts'),
  fieldPath: v.string(),
  value: v.string(),
  excerpt: v.string(),
  page: v.union(v.number(), v.null()),
  section: v.union(v.string(), v.null()),
  normalizedStartOffset: v.number(),
  normalizedEndOffset: v.number(),
})

export const reviewContextValidator = v.object({
  candidateId: v.id('decisionCandidates'),
  extractionId: v.id('extractions'),
  registryId: v.id('sourceRegistries'),
  governmentBodyId: v.id('governmentBodies'),
  snapshotId: v.id('sourceSnapshots'),
  sourceKind: sourceKindUnion,
  targetRecordId: v.string(),
  sourceRecordIdProvenance: sourceRecordIdProvenances,
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
  extractionModelId: v.string(),
  officialUrl: v.string(),
  retrievedAt: v.number(),
  normalizedContentHash: v.string(),
  inputHash: v.string(),
  recordKey: v.string(),
  facts: v.array(reviewFactValidator),
})

export type ReviewContext = typeof reviewContextValidator.type

type PreparedReview =
  | { ok: true; context: ReviewContext }
  | { ok: false; errorClass: string; errorDetail: string }

type ReviewRows =
  | { ok: false; errorClass: string; errorDetail: string }
  | {
      ok: true
      candidate: Doc<'decisionCandidates'>
      extraction: Doc<'extractions'>
      snapshot: Doc<'sourceSnapshots'>
      registry: Doc<'sourceRegistries'>
      body: Doc<'governmentBodies'>
      facts: Array<Doc<'candidateFacts'>>
    }

const preparedReviewValidator = v.union(
  v.object({ ok: v.literal(true), context: reviewContextValidator }),
  v.object({
    ok: v.literal(false),
    errorClass: v.string(),
    errorDetail: v.string(),
  }),
)

const reviewRowsValidator = v.union(
  v.object({
    ok: v.literal(false),
    errorClass: v.string(),
    errorDetail: v.string(),
  }),
  v.object({
    ok: v.literal(true),
    candidate: schema.doc('decisionCandidates'),
    extraction: schema.doc('extractions'),
    snapshot: schema.doc('sourceSnapshots'),
    registry: schema.doc('sourceRegistries'),
    body: schema.doc('governmentBodies'),
    facts: v.array(schema.doc('candidateFacts')),
  }),
)

export const loadReviewRows = internalQuery({
  args: {
    runId: v.id('pipelineRuns'),
    reviewStageId: v.id('pipelineStages'),
    candidateId: v.id('decisionCandidates'),
  },
  returns: reviewRowsValidator,
  handler: async (ctx, args): Promise<ReviewRows> => {
    const run = await ctx.db.get(args.runId)
    const stage = await ctx.db.get(args.reviewStageId)
    if (
      !run ||
      !stage ||
      stage.runId !== run._id ||
      stage.stage !== 'review' ||
      run.processorVersion !== PUBLICATION_PROCESSOR_VERSION ||
      run.candidateId !== args.candidateId ||
      run.snapshotId === undefined ||
      run.sourceKind === undefined ||
      run.targetRecordId === undefined ||
      run.upstreamRunId === undefined
    ) {
      throw new ConvexError({
        code: 'review_target_mismatch',
        message: 'Review run, stage, and candidate must agree',
      })
    }
    const candidate = await ctx.db.get(args.candidateId)
    if (!candidate) {
      return {
        ok: false as const,
        errorClass: 'candidate_missing',
        errorDetail: `Candidate ${args.candidateId} does not exist`,
      }
    }
    const extraction = await ctx.db.get(candidate.extractionId)
    const upstreamRun = await ctx.db.get(run.upstreamRunId)
    if (
      !extraction ||
      !upstreamRun ||
      upstreamRun.state !== 'succeeded' ||
      candidate.state !== 'deterministically_validated' ||
      candidate.runId !== upstreamRun._id ||
      candidate.registryId !== run.registryId ||
      candidate.snapshotId !== run.snapshotId ||
      candidate.sourceKind !== run.sourceKind ||
      candidate.targetRecordId !== run.targetRecordId ||
      resolveSourceRecordIdProvenance(candidate.sourceRecordIdProvenance) !==
        resolveSourceRecordIdProvenance(run.sourceRecordIdProvenance) ||
      resolveSourceRecordIdProvenance(candidate.sourceRecordIdProvenance) !==
        resolveSourceRecordIdProvenance(
          upstreamRun.sourceRecordIdProvenance,
        ) ||
      extraction._id !== candidate.extractionId ||
      extraction.candidateId !== candidate._id ||
      extraction.runId !== upstreamRun._id ||
      resolveSourceRecordIdProvenance(extraction.sourceRecordIdProvenance) !==
        resolveSourceRecordIdProvenance(candidate.sourceRecordIdProvenance)
    ) {
      return {
        ok: false as const,
        errorClass: 'candidate_not_publishable',
        errorDetail:
          'Candidate must remain validated and bound to its successful extraction',
      }
    }
    const snapshot = await ctx.db.get(candidate.snapshotId)
    const registry = await ctx.db.get(candidate.registryId)
    const body = registry ? await ctx.db.get(registry.governmentBodyId) : null
    if (!snapshot || !registry || !body) {
      return {
        ok: false as const,
        errorClass: 'source_context_missing',
        errorDetail:
          'Candidate source, registry, or government body is missing',
      }
    }
    const facts = await ctx.db
      .query('candidateFacts')
      .withIndex('by_candidate_and_field_path', (q) =>
        q.eq('candidateId', candidate._id),
      )
      .take(MATERIAL_ARRAY_LIMITS.facts + 1)
    return {
      ok: true as const,
      candidate,
      extraction,
      snapshot,
      registry,
      body,
      facts,
    }
  },
})

export const prepareCandidateReview = internalAction({
  args: {
    runId: v.id('pipelineRuns'),
    reviewStageId: v.id('pipelineStages'),
    candidateId: v.id('decisionCandidates'),
  },
  returns: preparedReviewValidator,
  handler: async (ctx, args): Promise<PreparedReview> => {
    const rows: ReviewRows = await ctx.runQuery(
      internal.review.prepare.loadReviewRows,
      args,
    )
    if (!rows.ok) {
      return rows
    }
    const { candidate, extraction, snapshot, registry, body, facts } = rows
    const fail = (errorClass: string, errorDetail: string) => ({
      ok: false as const,
      errorClass,
      errorDetail,
    })

    if (facts.length > MATERIAL_ARRAY_LIMITS.facts) {
      return fail(
        'fact_limit_exceeded',
        `Candidate has more than ${MATERIAL_ARRAY_LIMITS.facts} facts`,
      )
    }
    if (
      snapshot.registryId !== registry._id ||
      snapshot.contentHashBasis !== 'raw_artifact_v2' ||
      !snapshot.normalizedContentHash ||
      snapshot.truncation.truncated ||
      !registry.sourceKinds.includes(candidate.sourceKind) ||
      !isRegisteredSourceUrl(
        snapshot.canonicalUrl,
        registry.officialDomains,
        registry.seedUrls,
        registry.approvedDocumentHosts,
      ) ||
      !isRegisteredSourceUrl(
        snapshot.retrievedUrl,
        registry.officialDomains,
        registry.seedUrls,
        registry.approvedDocumentHosts,
      )
    ) {
      return fail(
        'source_precheck_failed',
        'The source no longer passes its registry, completeness, and official-domain checks',
      )
    }
    const sourceRecordIdProvenance = resolveSourceRecordIdProvenance(
      candidate.sourceRecordIdProvenance,
    )
    const recordIdentityMatches =
      sourceRecordIdProvenance === 'operator_assigned'
        ? candidate.sourceRecordId === null
        : candidate.sourceRecordId === candidate.targetRecordId
    if (
      body._id !== registry.governmentBodyId ||
      normalizeForMatch(body.name) !== normalizeForMatch(candidate.bodyName) ||
      !recordIdentityMatches
    ) {
      return fail(
        'candidate_identity_changed',
        'The candidate no longer matches its registered body and target record',
      )
    }
    if (!extraction.modelId) {
      return fail(
        'extraction_model_missing',
        'The validated candidate has no recorded extraction model',
      )
    }

    const blob = await ctx.storage.get(snapshot.normalizedStorageId)
    if (!blob) {
      return fail(
        'snapshot_text_missing',
        'The snapshot normalized text is missing from storage',
      )
    }
    const sourceText = await blob.text()
    const byteLength = new TextEncoder().encode(sourceText).byteLength
    const contentHash = await sha256HexOfText(sourceText)
    if (
      contentHash !== snapshot.normalizedContentHash ||
      byteLength !== snapshot.normalizedByteLength
    ) {
      return fail(
        'snapshot_hash_mismatch',
        'Stored snapshot text no longer matches its recorded hash and size',
      )
    }

    const expectedFields = new Map(
      materialFieldsV1(candidate).map((field) => [
        field.fieldPath,
        field.value,
      ]),
    )
    const normalizedSource = normalizeForMatch(sourceText)
    const preparedFacts: ReviewContext['facts'] = []
    const seenPaths = new Set<string>()
    for (const fact of facts) {
      if (
        fact.extractionId !== extraction._id ||
        fact.sourceSnapshotId !== snapshot._id ||
        expectedFields.get(fact.fieldPath) !== fact.value ||
        seenPaths.has(fact.fieldPath)
      ) {
        return fail(
          'fact_set_changed',
          `Fact ${fact._id} no longer matches the validated candidate`,
        )
      }
      const normalizedExcerpt = normalizeForMatch(fact.excerpt)
      const startOffset = locateExcerpt(normalizedSource, fact.excerpt)
      if (normalizedExcerpt === '' || startOffset < 0) {
        return fail(
          'citation_not_found',
          `Citation for ${fact.fieldPath} no longer appears in the snapshot`,
        )
      }
      seenPaths.add(fact.fieldPath)
      preparedFacts.push({
        factId: fact._id,
        fieldPath: fact.fieldPath,
        value: fact.value,
        excerpt: fact.excerpt,
        page: fact.page ?? null,
        section: fact.section ?? null,
        normalizedStartOffset: startOffset,
        normalizedEndOffset: startOffset + normalizedExcerpt.length,
      })
    }
    if (
      preparedFacts.length !== expectedFields.size ||
      [...expectedFields.keys()].some((path) => !seenPaths.has(path))
    ) {
      return fail(
        'fact_set_incomplete',
        'Every material candidate field must have exactly one citation',
      )
    }
    preparedFacts.sort(
      (left, right) =>
        left.fieldPath.localeCompare(right.fieldPath) ||
        left.factId.localeCompare(right.factId),
    )

    const candidateForHash = {
      sourceRecordIdProvenance,
      sourceRecordId: candidate.sourceRecordId,
      recordType: candidate.recordType,
      title: candidate.title,
      bodyName: candidate.bodyName,
      meetingAt: candidate.meetingAt,
      lifecycleState: candidate.lifecycleState,
      plainLanguageSummary: candidate.plainLanguageSummary,
      affectedPlaces: candidate.affectedPlaces,
      amounts: candidate.amounts,
      publicActions: candidate.publicActions,
    }
    const inputHash = await sha256HexOfText(
      JSON.stringify({
        candidateId: candidate._id,
        extractionId: extraction._id,
        extractionProcessorVersion: extraction.processorVersion,
        extractionPromptVersion: extraction.promptVersion,
        extractionSchemaVersion: extraction.schemaVersion,
        extractionModelId: extraction.modelId,
        snapshotId: snapshot._id,
        snapshotContentHash: snapshot.contentHash,
        normalizedContentHash: snapshot.normalizedContentHash,
        normalizedByteLength: snapshot.normalizedByteLength,
        officialUrl: snapshot.canonicalUrl,
        retrievedAt: snapshot.retrievalTime,
        candidate: candidateForHash,
        facts: preparedFacts,
      }),
    )
    const stableRecordId =
      sourceRecordIdProvenance === 'operator_assigned'
        ? candidate.targetRecordId
        : candidate.sourceRecordId
    if (!stableRecordId) {
      return fail(
        'record_identity_missing',
        'The candidate has no stable record identity',
      )
    }
    const recordKey = await sha256HexOfText(
      `${candidate.registryId}\n${stableRecordId}`,
    )
    return {
      ok: true as const,
      context: {
        candidateId: candidate._id,
        extractionId: extraction._id,
        registryId: registry._id,
        governmentBodyId: body._id,
        snapshotId: snapshot._id,
        sourceKind: candidate.sourceKind,
        targetRecordId: candidate.targetRecordId,
        ...candidateForHash,
        extractionModelId: extraction.modelId,
        officialUrl: snapshot.canonicalUrl,
        retrievedAt: snapshot.retrievalTime,
        normalizedContentHash: snapshot.normalizedContentHash,
        inputHash,
        recordKey,
        facts: preparedFacts,
      },
    }
  },
})
