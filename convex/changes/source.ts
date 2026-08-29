import type { Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'

export async function recordSourceSnapshotChange(
  ctx: MutationCtx,
  input: {
    registryId: Id<'sourceRegistries'>
    canonicalUrl: string
    previousSnapshotId: Id<'sourceSnapshots'>
    currentSnapshotId: Id<'sourceSnapshots'>
    previousContentHashBasis:
      'normalized_markdown_v1' | 'raw_artifact_v2' | undefined
    previousContentHash: string
    currentContentHash: string
    previousNormalizedContentHash: string | undefined
    currentNormalizedContentHash: string
    createdAt: number
  },
): Promise<Id<'sourceSnapshotChanges'>> {
  const existing = await ctx.db
    .query('sourceSnapshotChanges')
    .withIndex('by_current_snapshot', (q) =>
      q.eq('currentSnapshotId', input.currentSnapshotId),
    )
    .unique()
  if (existing) return existing._id

  const normalizedChanged =
    input.previousNormalizedContentHash === undefined ||
    input.previousNormalizedContentHash !== input.currentNormalizedContentHash
  const classification =
    input.previousContentHashBasis !== 'raw_artifact_v2'
      ? 'hash_basis_migration'
      : input.previousNormalizedContentHash === undefined
        ? 'unusable_predecessor'
        : normalizedChanged
          ? 'normalized_changed'
          : 'raw_only'

  return await ctx.db.insert('sourceSnapshotChanges', {
    registryId: input.registryId,
    canonicalUrl: input.canonicalUrl,
    previousSnapshotId: input.previousSnapshotId,
    currentSnapshotId: input.currentSnapshotId,
    classification,
    rawChanged: input.previousContentHash !== input.currentContentHash,
    normalizedChanged,
    createdAt: input.createdAt,
  })
}
