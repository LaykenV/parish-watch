import { v } from 'convex/values'

import { internalQuery } from '../_generated/server'
import {
  sourceKindUnion,
  sourceRecordIdProvenances,
} from '../pipeline/state'
import { isAllowedOfficialHost } from '../sources/domains'

export const MAX_EXTRACTION_SOURCE_BYTES = 200_000

export const extractionContextValidator = v.object({
  registryId: v.id('sourceRegistries'),
  snapshotId: v.id('sourceSnapshots'),
  sourceKind: sourceKindUnion,
  targetRecordId: v.string(),
  sourceRecordIdProvenance: sourceRecordIdProvenances,
  bodyName: v.string(),
  normalizedStorageId: v.id('_storage'),
  normalizedContentHash: v.string(),
  normalizedByteLength: v.number(),
  canonicalUrl: v.string(),
})

export type ExtractionContext = typeof extractionContextValidator.type

export const prepareExtractionContext = internalQuery({
  args: {
    registryId: v.id('sourceRegistries'),
    snapshotId: v.id('sourceSnapshots'),
    sourceKind: sourceKindUnion,
    targetRecordId: v.string(),
    sourceRecordIdProvenance: sourceRecordIdProvenances,
  },
  returns: v.union(
    v.object({ ok: v.literal(true), context: extractionContextValidator }),
    v.object({
      ok: v.literal(false),
      errorClass: v.string(),
      errorDetail: v.string(),
    }),
  ),
  handler: async (
    ctx,
    args,
  ): Promise<
    | { ok: true; context: ExtractionContext }
    | { ok: false; errorClass: string; errorDetail: string }
  > => {
    const snapshot = await ctx.db.get(args.snapshotId)
    if (!snapshot) {
      return {
        ok: false,
        errorClass: 'snapshot_missing',
        errorDetail: `Snapshot ${args.snapshotId} does not exist`,
      }
    }
    if (snapshot.registryId !== args.registryId) {
      return {
        ok: false,
        errorClass: 'snapshot_mismatch',
        errorDetail: 'Snapshot belongs to a different registry',
      }
    }
    if (snapshot.contentHashBasis !== 'raw_artifact_v2') {
      return {
        ok: false,
        errorClass: 'snapshot_basis_unsupported',
        errorDetail: `Snapshot hash basis ${snapshot.contentHashBasis ?? 'unset'} is not raw_artifact_v2`,
      }
    }
    if (!snapshot.normalizedContentHash) {
      return {
        ok: false,
        errorClass: 'snapshot_unnormalized',
        errorDetail: 'Snapshot has no normalized content hash',
      }
    }
    if (snapshot.truncation.truncated) {
      return {
        ok: false,
        errorClass: 'snapshot_truncated',
        errorDetail: snapshot.truncation.detail ?? 'Snapshot is truncated',
      }
    }
    const registry = await ctx.db.get(args.registryId)
    if (!registry) {
      return {
        ok: false,
        errorClass: 'registry_missing',
        errorDetail: `Registry ${args.registryId} does not exist`,
      }
    }
    if (!registry.sourceKinds.includes(args.sourceKind)) {
      return {
        ok: false,
        errorClass: 'source_kind_not_registered',
        errorDetail: `Source kind ${args.sourceKind} is not registered for this body`,
      }
    }
    const body = await ctx.db.get(registry.governmentBodyId)
    if (!body) {
      return {
        ok: false,
        errorClass: 'body_missing',
        errorDetail: 'The registry has no government body',
      }
    }
    if (
      !isAllowedOfficialHost(snapshot.canonicalUrl, registry.officialDomains) ||
      !isAllowedOfficialHost(snapshot.retrievedUrl, registry.officialDomains)
    ) {
      return {
        ok: false,
        errorClass: 'domain_not_allowed',
        errorDetail: `Snapshot URL ${snapshot.retrievedUrl} is outside the registered official domains`,
      }
    }
    if (snapshot.normalizedByteLength > MAX_EXTRACTION_SOURCE_BYTES) {
      return {
        ok: false,
        errorClass: 'source_too_large',
        errorDetail: `Snapshot normalized content is ${snapshot.normalizedByteLength} bytes, over the ${MAX_EXTRACTION_SOURCE_BYTES} byte extraction limit`,
      }
    }
    return {
      ok: true,
      context: {
        registryId: args.registryId,
        snapshotId: args.snapshotId,
        sourceKind: args.sourceKind,
        targetRecordId: args.targetRecordId,
        sourceRecordIdProvenance: args.sourceRecordIdProvenance,
        bodyName: body.name,
        normalizedStorageId: snapshot.normalizedStorageId,
        normalizedContentHash: snapshot.normalizedContentHash,
        normalizedByteLength: snapshot.normalizedByteLength,
        canonicalUrl: snapshot.canonicalUrl,
      },
    }
  },
})
