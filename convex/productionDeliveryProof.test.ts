/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { afterEach, expect, test, vi } from 'vitest'
import { internal } from './_generated/api'
import type { Doc } from './_generated/dataModel'
import { acceptedReplayChange } from './operations/developmentProof'
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


function legacyPublication(): Doc<'publicationVersions'> {
  return {
    _id: '10000publicationVersions', _creationTime: 1, recordId: '10001decisionRecords',
    runId: '10002pipelineRuns', candidateId: '10003decisionCandidates', reviewId: '10004reviews', snapshotId: '10005sourceSnapshots',
    version: 1, mode: 'limited', reasonCode: 'limited', policyVersion: 'v1', payloadVersion: 'v1', payloadHash: 'immutable', createdAt: 123,
    payload: { kind: 'limited', sourceRecordId: '58956', title: 'Roundabout authorization', bodyName: 'Metropolitan Council', source: { snapshotId: '10005sourceSnapshots', sourceKind: 'minutes', officialUrl: 'https://www.brla.gov/AgendaCenter/ViewFile/Minutes/_10082025-2224', retrievedAt: 100 } },
  } as Doc<'publicationVersions'>
}
test('legacy first-publication replay derives one original-dated change without publishing or fanning out', async () => {
  const t = setup()
  const version = legacyPublication()
  await t.run(async ctx => {
    const first = await acceptedReplayChange(ctx, version)
    const replay = await acceptedReplayChange(ctx, version)
    expect(first?._id).toBe(replay?._id)
    expect(first).toMatchObject({ classification: 'new_decision', material: true, createdAt: 123, currentPublicationVersionId: version._id })
    expect(await ctx.db.query('materialChanges').collect()).toHaveLength(1)
    expect(await ctx.db.query('publicationVersions').collect()).toHaveLength(0)
    expect(await ctx.db.query('notificationFanouts').collect()).toHaveLength(0)
    expect(await ctx.db.system.query('_scheduled_functions').collect()).toHaveLength(0)
  })
})
test('legacy replay never invents a revision change or revives a withheld publication', async () => {
  const t = setup()
  await t.run(async ctx => {
    expect(await acceptedReplayChange(ctx, { ...legacyPublication(), version: 2 })).toBeNull()
    expect(await acceptedReplayChange(ctx, { ...legacyPublication(), mode: 'withheld', payload: null })).toBeNull()
    expect(await ctx.db.query('materialChanges').collect()).toHaveLength(0)
  })
})
