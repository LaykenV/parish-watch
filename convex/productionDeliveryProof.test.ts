/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { afterEach, expect, test, vi } from 'vitest'
import { internal } from './_generated/api'
import { encryptAddress, hashAddress } from './follows/secrets'
import schema from './schema'
const modules = import.meta.glob('./**/*.ts')
const recipient = 'public-parish-reports@agentmail.to'
afterEach(() => vi.unstubAllEnvs())
function setup() {
  vi.stubEnv('CONVEX_SITE_URL', 'https://www.publicparish.com')
  vi.stubEnv('AGENTMAIL_REPORTS_INBOX_ID', recipient)
  vi.stubEnv('AGENTMAIL_UPDATES_INBOX_ID', 'updates-test@agentmail.to')
  vi.stubEnv('EMAIL_ADDRESS_HMAC_KEY', btoa('production-proof-test'))
  vi.stubEnv('EMAIL_ENCRYPTION_KEY', 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=')
  return convexTest(schema, modules)
}
test('production delivery replay refuses development and arbitrary recipients', async () => {
  const t = setup()
  vi.stubEnv('CONVEX_SITE_URL', 'https://woozy-wren-227.convex.site')
  await expect(t.mutation(internal.operations.developmentProof.replayProductionControlledDelivery, {})).rejects.toThrow('separate controlled inbox')
  vi.stubEnv('CONVEX_SITE_URL', 'https://www.publicparish.com')
  vi.stubEnv('AGENTMAIL_REPORTS_INBOX_ID', 'another@example.com')
  await expect(t.mutation(internal.operations.developmentProof.replayProductionControlledDelivery, {})).rejects.toThrow('separate controlled inbox')
})
test('production delivery replay requires actual verification', async () => {
  const t = setup()
  await expect(t.mutation(internal.operations.developmentProof.replayProductionControlledDelivery, {})).rejects.toThrow('not verified')
  await t.run(async ctx => ctx.db.insert('emailSubscribers', { addressHash: await hashAddress(recipient), encryptedAddress: await encryptAddress(recipient), encryptionVersion: 1, state: 'pending', createdAt: 1, updatedAt: 1 }))
  await expect(t.mutation(internal.operations.developmentProof.replayProductionControlledDelivery, {})).rejects.toThrow('not verified')
})
test('completed production replay cannot enqueue another delivery', async () => {
  const t = setup()
  const windowId = await t.run(async ctx => {
    const subscriberId = await ctx.db.insert('emailSubscribers', { addressHash: await hashAddress(recipient), encryptedAddress: await encryptAddress(recipient), encryptionVersion: 1, state: 'verified', createdAt: 1, updatedAt: 1 })
    const followId = await ctx.db.insert('follows', { ownerKind: 'email', ownerKey: `email:${subscriberId}`, emailSubscriberId: subscriberId, targetKind: 'issue', targetKey: 'traffic-impact-fees-for-the-bluebonnet-and-harveston-way-round-about-55702561', targetTitle: 'Roundabout', targetDetail: 'Accepted evidence', createdAt: 1, updatedAt: 1 })
    await ctx.db.insert('notificationPreferences', { followId, cadence: 'both', createdAt: 1, updatedAt: 1 })
    return ctx.db.insert('roundupWindows', { windowKey: 'production-slice9-controlled-replay-20260905', startsAt: 1, endsAt: 2, state: 'complete', entryCount: 1, deliveryCount: 1, createdAt: 1, updatedAt: 1 })
  })
  for (let i = 0; i < 2; i++) expect(await t.mutation(internal.operations.developmentProof.replayProductionControlledDelivery, {})).toBe(windowId)
  await t.run(async ctx => {
    expect(await ctx.db.query('notificationDeliveries').collect()).toHaveLength(0)
    expect(await ctx.db.query('notificationMatches').collect()).toHaveLength(0)
    expect(await ctx.db.system.query('_scheduled_functions').collect()).toHaveLength(0)
  })
})
