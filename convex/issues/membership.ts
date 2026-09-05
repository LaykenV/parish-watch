import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'

// This bounds one resident timeline response, not the model's input window.
// Extensions retain every accepted member. Overflow is an explicit owner task.
export const MAX_TIMELINE_MEMBERS = 200
export async function loadTimelineMembers(ctx: Pick<QueryCtx | MutationCtx, 'db'>, issueVersionId: Id<'issueVersions'>): Promise<Doc<'issueDecisionLinks'>[]> {
  const links = await ctx.db.query('issueDecisionLinks').withIndex('by_issue_version', q => q.eq('issueVersionId', issueVersionId)).take(MAX_TIMELINE_MEMBERS + 1)
  if (links.length > MAX_TIMELINE_MEMBERS) throw new Error('issue_timeline_capacity_requires_owner')
  return links
}

export async function extensionInputs(ctx: Pick<QueryCtx | MutationCtx, 'db'>, issueId: Id<'issues'>, recordId: Id<'decisionRecords'>, matchedRecordIds: Id<'decisionRecords'>[] = []): Promise<Id<'decisionRecords'>[]> {
  const issue = await ctx.db.get(issueId)
  if (!issue?.currentVersionId) throw new Error('issue_not_published')
  const links = await loadTimelineMembers(ctx, issue.currentVersionId)
  const changed = new Set<Id<'decisionRecords'>>([recordId])
  const retained = new Set(links.map(link => link.recordId))
  for (const match of matchedRecordIds) if (!retained.has(match)) changed.add(match)
  for (const link of links) {
    const record = await ctx.db.get(link.recordId)
    if (record?.currentPublishedVersionId !== link.publicationVersionId) changed.add(link.recordId)
  }
  if (changed.size > 9) throw new Error('issue_extension_requires_owner')
  for (const link of [...links].reverse()) {
    if (changed.size >= 10) break
    changed.add(link.recordId)
  }
  if (changed.size < 2) throw new Error('issue_extension_needs_anchor')
  return [...changed]
}
