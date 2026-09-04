import { v } from 'convex/values'

import type { Doc } from '../_generated/dataModel'
import { query } from '../_generated/server'
import { lifecycleStates } from '../extraction/contractV1'
import { AREA_SLUGS, areaSlug } from '../follows/contracts'
import { sourceKindUnion } from '../pipeline/state'

const acceptedMode = v.union(v.literal('full'), v.literal('limited'))

const residentDecision = v.object({
  recordKey: v.string(),
  sourceRecordId: v.string(),
  placeName: v.string(),
  placeSlug: v.string(),
  bodyName: v.string(),
  mode: acceptedMode,
  title: v.string(),
  summary: v.union(v.string(), v.null()),
  lifecycleState: v.union(lifecycleStates, v.null()),
  meetingAt: v.union(v.string(), v.null()),
  source: v.object({
    officialUrl: v.string(),
    retrievedAt: v.number(),
    sourceKind: sourceKindUnion,
  }),
})

type ResidentDecision = typeof residentDecision.type

const coverageArea = v.object({
  slug: areaSlug,
  status: v.union(v.literal('available'), v.literal('validating')),
})

type CoverageArea = typeof coverageArea.type

export const listCoverageAreas = query({
  args: {},
  returns: v.array(coverageArea),
  handler: async (ctx): Promise<CoverageArea[]> => {
    return await Promise.all(
      AREA_SLUGS.map(async (slug) => {
        const jurisdictions = await ctx.db
          .query('jurisdictions')
          .withIndex('by_slug', (index) => index.eq('slug', slug))
          .take(2)
        return {
          slug,
          status:
            jurisdictions.length === 1 &&
            jurisdictions[0]?.publicStatus === 'supported'
              ? ('available' as const)
              : ('validating' as const),
        }
      }),
    )
  },
})

export const listPublishedDecisions = query({
  args: {},
  returns: v.array(residentDecision),
  handler: async (ctx): Promise<ResidentDecision[]> => {
    const [fullRecords, limitedRecords] = await Promise.all([
      ctx.db
        .query('decisionRecords')
        .withIndex('by_current_mode_and_updated_at', (q) =>
          q.eq('currentMode', 'full'),
        )
        .order('desc')
        .take(50),
      ctx.db
        .query('decisionRecords')
        .withIndex('by_current_mode_and_updated_at', (q) =>
          q.eq('currentMode', 'limited'),
        )
        .order('desc')
        .take(50),
    ])
    const records = [...fullRecords, ...limitedRecords]
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .slice(0, 50)

    const decisions = await Promise.all(
      records.map((record) => project(record)),
    )
    return decisions.filter(
      (decision): decision is ResidentDecision => decision !== null,
    )

    async function project(
      record: Doc<'decisionRecords'>,
    ): Promise<ResidentDecision | null> {
      if (!record.currentPublishedVersionId || !record.currentMode) return null

      const version = await ctx.db.get(record.currentPublishedVersionId)
      if (
        !version ||
        version.recordId !== record._id ||
        version.mode !== record.currentMode ||
        version.payload === null ||
        version.payload.kind !== record.currentMode
      ) {
        return null
      }

      const body = await ctx.db.get(record.governmentBodyId)
      if (!body) return null
      const jurisdiction = await ctx.db.get(body.jurisdictionId)
      if (!jurisdiction) return null

      return {
        recordKey: record.recordKey,
        sourceRecordId: record.sourceRecordId,
        placeName: jurisdiction.name,
        placeSlug: jurisdiction.slug,
        bodyName: version.payload.bodyName,
        mode: version.payload.kind,
        title: version.payload.title,
        summary:
          version.payload.kind === 'full'
            ? version.payload.plainLanguageSummary
            : null,
        lifecycleState:
          version.payload.kind === 'full'
            ? version.payload.lifecycleState
            : null,
        meetingAt:
          version.payload.kind === 'full' ? version.payload.meetingAt : null,
        source: {
          officialUrl: version.payload.source.officialUrl,
          retrievedAt: version.payload.source.retrievedAt,
          sourceKind: version.payload.source.sourceKind,
        },
      }
    }
  },
})
