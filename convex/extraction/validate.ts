import { v } from 'convex/values'

import { internal } from '../_generated/api'
import { internalAction } from '../_generated/server'
import { isAllowedOfficialHost } from '../sources/domains'
import { sha256HexOfText } from '../sources/hashing'
import {
  AGENDA_FORBIDDEN_OUTCOME_STATES,
  MATERIAL_FIELD_PATHS,
  materialFieldsV1,
} from './contractV1'
import {
  centsOf,
  locateExcerpt,
  normalizeForMatch,
  parseZonedIsoDateTime,
  textSupportsAmount,
  textSupportsZonedDateTime,
} from './textMatch'

type Finding = {
  code: string
  fieldPath?: string
  detail: string
}

const MAX_FINDINGS = 100

function requiredLifecycleForProceduralMotion(
  excerpt: string,
): 'proposed' | 'postponed' | null {
  const normalized = normalizeForMatch(excerpt).toLowerCase()
  if (
    /\bmotion to introduce\b[^.;!?]{0,160}\bwas approved\b/.test(normalized)
  ) {
    return 'proposed'
  }
  if (
    /\bmotion to (?:defer|postpone)\b[^.;!?]{0,160}\bwas approved\b/.test(
      normalized,
    )
  ) {
    return 'postponed'
  }
  return null
}

const validationOutcomeValidator = v.union(
  v.object({
    outcome: v.literal('validated'),
    candidateId: v.id('decisionCandidates'),
  }),
  v.object({ outcome: v.literal('closed_not_found') }),
  v.object({
    outcome: v.literal('validation_failed'),
    codes: v.array(v.string()),
  }),
  v.object({
    outcome: v.literal('invariant_failed'),
    errorClass: v.string(),
    errorDetail: v.string(),
  }),
)

type ValidationOutcome = typeof validationOutcomeValidator.type

export const runValidation = internalAction({
  args: {
    runId: v.id('pipelineRuns'),
    extractionId: v.id('extractions'),
    validateStageId: v.id('pipelineStages'),
  },
  returns: validationOutcomeValidator,
  handler: async (ctx, args): Promise<ValidationOutcome> => {
    const rows = await ctx.runQuery(
      internal.extraction.ledger.loadValidationRows,
      {
        runId: args.runId,
        validateStageId: args.validateStageId,
        extractionId: args.extractionId,
      },
    )
    await ctx.runMutation(internal.extraction.ledger.beginStageAttempt, {
      runId: args.runId,
      stageId: args.validateStageId,
      expectedStage: 'validate',
    })
    const extraction = rows.extraction
    if (!extraction) {
      return {
        outcome: 'invariant_failed' as const,
        errorClass: 'extraction_missing',
        errorDetail: `Extraction ${args.extractionId} does not exist`,
      }
    }
    if (extraction.state === 'not_found') {
      await ctx.runMutation(
        internal.extraction.ledger.closeNotFoundValidation,
        {
          runId: args.runId,
          validateStageId: args.validateStageId,
          extractionId: args.extractionId,
        },
      )
      return { outcome: 'closed_not_found' as const }
    }
    const candidate = rows.candidate
    const facts = rows.facts
    if (
      extraction.state !== 'extracted' ||
      !candidate ||
      !facts ||
      candidate.extractionId !== extraction._id
    ) {
      return {
        outcome: 'invariant_failed' as const,
        errorClass: 'candidate_missing',
        errorDetail: 'The extraction has no candidate to validate',
      }
    }
    const snapshot = rows.snapshot
    if (!snapshot || snapshot._id !== candidate.snapshotId) {
      return {
        outcome: 'invariant_failed' as const,
        errorClass: 'snapshot_missing',
        errorDetail: 'The candidate snapshot does not exist',
      }
    }

    const findings: Finding[] = []
    const addFinding = (finding: Finding) => {
      if (findings.length < MAX_FINDINGS) {
        findings.push(finding)
      }
    }

    let sourceText: string | null = null
    const blob = await ctx.storage.get(snapshot.normalizedStorageId)
    if (blob) {
      sourceText = await blob.text()
      const byteLength = new TextEncoder().encode(sourceText).byteLength
      const contentHash = await sha256HexOfText(sourceText)
      if (
        contentHash !== snapshot.normalizedContentHash ||
        byteLength !== snapshot.normalizedByteLength
      ) {
        addFinding({
          code: 'snapshot_hash_mismatch',
          detail:
            'Stored snapshot text no longer matches its recorded hash and size',
        })
      }
    } else {
      addFinding({
        code: 'snapshot_text_missing',
        detail: 'The snapshot normalized text is missing from storage',
      })
    }

    if (snapshot.contentHashBasis !== 'raw_artifact_v2') {
      addFinding({
        code: 'snapshot_basis_unsupported',
        detail: `Snapshot hash basis ${snapshot.contentHashBasis ?? 'unset'} is not raw_artifact_v2`,
      })
    }
    if (!snapshot.normalizedContentHash) {
      addFinding({
        code: 'snapshot_unnormalized',
        detail: 'Snapshot has no normalized content hash',
      })
    }
    if (snapshot.truncation.truncated) {
      addFinding({
        code: 'snapshot_truncated',
        detail: snapshot.truncation.detail ?? 'Snapshot is truncated',
      })
    }

    const officialDomains = rows.officialDomains
    if (officialDomains) {
      const canonicalAllowed = isAllowedOfficialHost(
        snapshot.canonicalUrl,
        officialDomains,
      )
      const retrievedAllowed = isAllowedOfficialHost(
        snapshot.retrievedUrl,
        officialDomains,
      )
      if (!canonicalAllowed || !retrievedAllowed) {
        addFinding({
          code: 'domain_not_allowed',
          detail: `Snapshot URL ${snapshot.retrievedUrl} is outside the registered official domains`,
        })
      }
    } else {
      addFinding({
        code: 'registry_missing',
        detail: 'The snapshot registry does not exist',
      })
    }

    const registeredBodyName = rows.registeredBodyName
    if (
      !registeredBodyName ||
      normalizeForMatch(candidate.bodyName) !==
        normalizeForMatch(registeredBodyName)
    ) {
      addFinding({
        code: 'body_mismatch',
        fieldPath: MATERIAL_FIELD_PATHS.bodyName,
        detail: `Candidate body "${candidate.bodyName}" does not match the registered body "${registeredBodyName ?? 'missing'}"`,
      })
    }

    if (candidate.sourceRecordId !== candidate.targetRecordId) {
      addFinding({
        code: 'target_record_mismatch',
        fieldPath: MATERIAL_FIELD_PATHS.sourceRecordId,
        detail: `Candidate record "${candidate.sourceRecordId ?? 'null'}" does not match the requested record "${candidate.targetRecordId}"`,
      })
    }

    if (
      candidate.sourceKind === 'agenda' &&
      (candidate.recordType === 'vote' ||
        AGENDA_FORBIDDEN_OUTCOME_STATES.includes(candidate.lifecycleState))
    ) {
      addFinding({
        code: 'agenda_outcome_unsupported',
        detail: 'Agenda evidence cannot produce a decided outcome or vote',
      })
    }

    const normalizedSource =
      sourceText === null ? null : normalizeForMatch(sourceText)
    const expectedFields = new Map(
      materialFieldsV1(candidate).map((field) => [
        field.fieldPath,
        field.value,
      ]),
    )
    const factsByPath = new Map<string, typeof facts>()

    for (const fact of facts) {
      const existing = factsByPath.get(fact.fieldPath) ?? []
      existing.push(fact)
      factsByPath.set(fact.fieldPath, existing)

      const expectedValue = expectedFields.get(fact.fieldPath)
      if (expectedValue === undefined) {
        addFinding({
          code: 'material_field_unknown',
          fieldPath: fact.fieldPath,
          detail: `Fact path ${fact.fieldPath} does not identify a material candidate field`,
        })
      } else if (fact.value !== expectedValue) {
        addFinding({
          code: 'material_value_mismatch',
          fieldPath: fact.fieldPath,
          detail: `Fact value for ${fact.fieldPath} does not equal the candidate value`,
        })
      }
      if (normalizeForMatch(fact.excerpt) === '') {
        addFinding({
          code: 'citation_blank',
          fieldPath: fact.fieldPath,
          detail: `The cited excerpt for ${fact.fieldPath} is blank`,
        })
        continue
      }
      if (fact.sourceSnapshotId !== snapshot._id) {
        addFinding({
          code: 'citation_snapshot_mismatch',
          fieldPath: fact.fieldPath,
          detail: `Fact for ${fact.fieldPath} cites snapshot ${fact.sourceSnapshotId}, not ${snapshot._id}`,
        })
        continue
      }
      if (normalizedSource === null) {
        continue
      }
      const excerptIndex = locateExcerpt(normalizedSource, fact.excerpt)
      if (excerptIndex === -1) {
        addFinding({
          code: 'citation_not_found',
          fieldPath: fact.fieldPath,
          detail: `The cited excerpt for ${fact.fieldPath} does not appear in the snapshot text`,
        })
        continue
      }
      if (fact.fieldPath === MATERIAL_FIELD_PATHS.lifecycleState) {
        const requiredLifecycle = requiredLifecycleForProceduralMotion(
          fact.excerpt,
        )
        if (
          requiredLifecycle !== null &&
          candidate.lifecycleState !== requiredLifecycle
        ) {
          addFinding({
            code: 'procedural_lifecycle_mismatch',
            fieldPath: fact.fieldPath,
            detail: `The cited procedural motion requires lifecycleState ${requiredLifecycle}, not ${candidate.lifecycleState}`,
          })
        }
      }
      if (fact.page !== undefined) {
        const proved = (snapshot.pageMap ?? []).some((entry) => {
          if (
            entry.page !== fact.page ||
            sourceText === null ||
            entry.startOffset < 0 ||
            entry.endOffset <= entry.startOffset ||
            entry.endOffset > sourceText.length
          ) {
            return false
          }
          const normalizedPage = normalizeForMatch(
            sourceText.slice(entry.startOffset, entry.endOffset),
          )
          return locateExcerpt(normalizedPage, fact.excerpt) !== -1
        })
        if (!proved) {
          addFinding({
            code: 'citation_page_unverified',
            fieldPath: fact.fieldPath,
            detail: `Cited page ${fact.page} for ${fact.fieldPath} is not proven by a page map`,
          })
        }
      }
      if (fact.section !== undefined) {
        const sectionIndex = normalizedSource.indexOf(
          normalizeForMatch(fact.section),
        )
        if (sectionIndex === -1 || sectionIndex > excerptIndex) {
          addFinding({
            code: 'citation_not_found',
            fieldPath: fact.fieldPath,
            detail: `The cited section for ${fact.fieldPath} does not appear before its excerpt`,
          })
        }
      }
    }

    for (const fieldPath of expectedFields.keys()) {
      const matchingFacts = factsByPath.get(fieldPath) ?? []
      if (matchingFacts.length === 0) {
        addFinding({
          code: 'material_field_uncited',
          fieldPath,
          detail: `Material field ${fieldPath} has no fact row`,
        })
      } else if (matchingFacts.length > 1) {
        addFinding({
          code: 'material_field_duplicate',
          fieldPath,
          detail: `Material field ${fieldPath} has ${matchingFacts.length} fact rows`,
        })
      }
    }

    if (candidate.meetingAt !== null) {
      const meetingDate = parseZonedIsoDateTime(candidate.meetingAt)
      if (!meetingDate) {
        addFinding({
          code: 'date_invalid',
          fieldPath: MATERIAL_FIELD_PATHS.meetingAt,
          detail: `meetingAt "${candidate.meetingAt}" is not a valid zoned ISO 8601 timestamp`,
        })
      } else {
        const meetingFacts =
          factsByPath.get(MATERIAL_FIELD_PATHS.meetingAt) ?? []
        const supported = meetingFacts.some(
          (fact) =>
            fact.sourceSnapshotId === snapshot._id &&
            textSupportsZonedDateTime(fact.excerpt, meetingDate),
        )
        if (!supported) {
          addFinding({
            code: 'date_not_supported',
            fieldPath: MATERIAL_FIELD_PATHS.meetingAt,
            detail: `No cited excerpt for ${MATERIAL_FIELD_PATHS.meetingAt} contains the meeting date`,
          })
        }
      }
    }

    candidate.amounts.forEach((amount, index) => {
      const fieldPath = MATERIAL_FIELD_PATHS.amountValue(index)
      const cents = centsOf(amount.value)
      if (cents === null) {
        addFinding({
          code: 'amount_invalid',
          fieldPath,
          detail: `Amount ${amount.value} is not a finite nonnegative value with at most two decimal places`,
        })
        return
      }
      const amountFacts = factsByPath.get(fieldPath) ?? []
      const supported = amountFacts.some(
        (fact) =>
          fact.sourceSnapshotId === snapshot._id &&
          textSupportsAmount(fact.excerpt, amount.value),
      )
      if (!supported) {
        addFinding({
          code: 'amount_not_supported',
          fieldPath,
          detail: `No cited excerpt for ${fieldPath} contains the amount`,
        })
      }
    })

    candidate.publicActions.forEach((action, index) => {
      if (action.deadline === null) {
        return
      }
      const fieldPath = MATERIAL_FIELD_PATHS.publicActionDeadline(index)
      const deadline = parseZonedIsoDateTime(action.deadline)
      if (!deadline) {
        addFinding({
          code: 'date_invalid',
          fieldPath,
          detail: `Deadline "${action.deadline}" is not a valid Louisiana zoned ISO 8601 timestamp`,
        })
        return
      }
      const deadlineFacts = factsByPath.get(fieldPath) ?? []
      const supported = deadlineFacts.some(
        (fact) =>
          fact.sourceSnapshotId === snapshot._id &&
          textSupportsZonedDateTime(fact.excerpt, deadline),
      )
      if (!supported) {
        addFinding({
          code: 'date_not_supported',
          fieldPath,
          detail: `No cited excerpt for ${fieldPath} contains the deadline date and time`,
        })
      }
    })

    if (findings.length > 0) {
      await ctx.runMutation(
        internal.extraction.ledger.persistValidationFailure,
        {
          runId: args.runId,
          validateStageId: args.validateStageId,
          extractionId: args.extractionId,
          candidateId: candidate._id,
          findings: findings.map((finding) => ({
            code: finding.code,
            fieldPath: finding.fieldPath,
            detail: finding.detail,
          })),
        },
      )
      return {
        outcome: 'validation_failed' as const,
        codes: findings.map((finding) => finding.code),
      }
    }

    await ctx.runMutation(internal.extraction.ledger.persistValidationSuccess, {
      runId: args.runId,
      validateStageId: args.validateStageId,
      extractionId: args.extractionId,
      candidateId: candidate._id,
    })
    return { outcome: 'validated' as const, candidateId: candidate._id }
  },
})
