/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { afterEach, expect, test, vi } from 'vitest'
import { api, internal } from './_generated/api'
import { inventoryContract } from './monitoring/contracts'
import type { InventoryResult } from './monitoring/contracts'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')
afterEach(() => vi.unstubAllEnvs())
const inventory: InventoryResult = { complete: true, bodyName: 'Test Council', sourceKind: 'agenda', meetingDate: '2026-09-04', dateExcerpt: 'September 4, 2026', targets: [{ printedId: '2026-14', title: 'Road repairs', excerpt: '2026-14 Road repairs' }] }
const text = 'Test Council. September 4, 2026. 2026-14 Road repairs'

test('inventory refuses fabricated locators, ambiguous items and invalid dates', () => {
  expect(inventoryContract(inventory, text, 'Test Council')).toBeNull()
  expect(inventoryContract({ ...inventory, targets: [{ ...inventory.targets[0], excerpt: 'Not in the source' }] }, text, 'Test Council')).toMatch(/citation/)
  expect(inventoryContract({ ...inventory, targets: [...inventory.targets, ...inventory.targets] }, text, 'Test Council')).toMatch(/duplicate/)
  expect(inventoryContract({ ...inventory, meetingDate: '2026-02-30' }, text, 'Test Council')).toMatch(/date/)
  expect(inventoryContract({ ...inventory, complete: false }, text, 'Test Council')).toMatch(/incomplete/)
  expect(inventoryContract(inventory, text, 'Another Council')).toMatch(/body/)
})

test('monitoring controls and ledgers require the owner', async () => {
  const t = convexTest(schema, modules)
  await expect(t.query(api.monitoring.ledger.policies, { paginationOpts: { numItems: 10, cursor: null } })).rejects.toThrow()
  const userId = await t.run(ctx => ctx.db.insert('users', { email: 'resident@example.test', googleAccountId: 'monitoring-test', emailVerified: true, createdAt: 1, updatedAt: 1, lastSignedInAt: 1 }))
  await expect(t.withIdentity({ subject: userId }).query(api.monitoring.ledger.policies, { paginationOpts: { numItems: 10, cursor: null } })).rejects.toThrow()
})

test('deployment switch keeps scheduled monitoring dormant', async () => {
  vi.stubEnv('SOURCE_MONITORING_ENABLED', 'false')
  const t = convexTest(schema, modules)
  await t.mutation(internal.monitoring.ledger.tick, {})
  expect(await t.run(ctx => ctx.db.query('sourceMonitoringRuns').collect())).toEqual([])
})
