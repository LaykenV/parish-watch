/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { expect, test } from 'vitest'
import { api } from './_generated/api'
import { recordConfirmedEvent } from './analytics/civic'
import schema from './schema'
const modules = import.meta.glob('./**/*.ts')

test('successful civic events deduplicate without retaining a resident identifier', async () => {
  const t = convexTest(schema, modules)
  await t.run(async ctx => {
    expect(await recordConfirmedEvent(ctx, 'ask_answered', 'private-receipt')).toBe(true)
    expect(await recordConfirmedEvent(ctx, 'ask_answered', 'private-receipt')).toBe(false)
    const receipts = await ctx.db.query('civicEventReceipts').collect()
    const counters = await ctx.db.query('civicEventCounters').collect()
    expect(receipts).toHaveLength(1)
    expect(JSON.stringify(receipts)).not.toContain('private-receipt')
    expect(counters[0].count).toBe(1)
    expect(Object.keys(receipts[0]).sort()).toEqual(['_creationTime', '_id', 'eventKey', 'expiresAt', 'kind'])
  })
})
test('monitoring, usage and demand reports are owner-only', async () => {
  const t = convexTest(schema, modules)
  await expect(t.query(api.operations.dashboard.monitoring, {})).rejects.toThrow()
  await expect(t.query(api.operations.dashboard.providerUsage, { kind: 'ask', paginationOpts: { numItems: 10, cursor: null } })).rejects.toThrow()
  await expect(t.query(api.operations.dashboard.demand, { paginationOpts: { numItems: 10, cursor: null } })).rejects.toThrow()
})
