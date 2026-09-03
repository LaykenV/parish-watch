/// <reference types="vite/client" />

import agentmailTest from '@agentmail/convex/test'
import { convexTest } from 'convex-test'
import type { TestConvexForDataModelAndIdentity } from 'convex-test'
import { afterEach, expect, test, vi } from 'vitest'

import { api, internal } from './_generated/api'
import type { DataModel } from './_generated/dataModel'
import schema from './schema'
import { sha256HexOfText } from './sources/hashing'

const modules = import.meta.glob('./**/*.ts')
type TestConvex = TestConvexForDataModelAndIdentity<DataModel>

function initTest(): TestConvex {
  vi.stubEnv('AGENTMAIL_API_KEY', 'agentmail-test-key')
  vi.stubEnv('AGENTMAIL_REPORTS_INBOX_ID', 'reports-test')
  vi.stubEnv('ADMIN_EMAIL', 'owner@example.com')
  vi.stubEnv('CONVEX_SITE_URL', 'https://public-parish-test.convex.site')
  const t = convexTest(schema, modules)
  agentmailTest.register(t)
  return t
}

afterEach(() => vi.unstubAllEnvs())

test('private reports enqueue once and keep resident content out of app tables', async () => {
  const t = initTest()
  const input = reportInput('submission-private-0001')
  await expect(
    t.mutation(api.sourceReports.reports.submit, input),
  ).resolves.toEqual({ status: 'sending', replayed: false })
  await expect(
    t.mutation(api.sourceReports.reports.submit, input),
  ).resolves.toEqual({ status: 'sending', replayed: true })

  const report = await t.run(async (ctx) => {
    const reports = await ctx.db.query('sourceProblemReports').take(10)
    expect(reports).toHaveLength(1)
    expect(await ctx.db.query('pipelineRuns').take(10)).toHaveLength(0)
    expect(await ctx.db.query('sourceSnapshots').take(10)).toHaveLength(0)
    expect(await ctx.db.query('extractions').take(10)).toHaveLength(0)
    return reports[0]
  })
  expect(JSON.stringify(report)).not.toContain(input.description)
  expect(JSON.stringify(report)).not.toContain(input.replyEmail)
  expect(JSON.stringify(report)).not.toContain(input.officialUrl)
  expect(report).toMatchObject({
    category: 'broken-citation',
    recordPath: '/issues/drainage-project?source=evidence-7',
    deliveryStatus: 'sending',
  })
})

test('receipt access is scoped to the browser token', async () => {
  const t = initTest()
  const input = reportInput('submission-receipt-0001')
  await t.mutation(api.sourceReports.reports.submit, input)
  await expect(
    t.query(api.sourceReports.reports.receipt, {
      submissionId: input.submissionId,
      browserToken: input.browserToken,
    }),
  ).resolves.toEqual({ found: true, status: 'sending' })
  await expect(
    t.query(api.sourceReports.reports.receipt, {
      submissionId: input.submissionId,
      browserToken: 'different-browser-token-0000000000000000',
    }),
  ).resolves.toEqual({ found: false })
})

test('a terminal receipt survives provider payload cleanup', async () => {
  const t = initTest()
  const input = reportInput('submission-terminal-0001')
  const submissionHash = await sha256HexOfText(input.submissionId)
  const browserHash = await sha256HexOfText(input.browserToken)
  await t.run(async (ctx) => {
    await ctx.db.insert('sourceProblemReports', {
      submissionHash,
      browserHash,
      category: input.category,
      recordPath: '/issues/drainage-project',
      outboundId: 'already-cleaned-outbound',
      deliveryStatus: 'sent',
      deliveryCheckedAt: 2,
      createdAt: 1,
    })
  })

  await expect(
    t.query(api.sourceReports.reports.receipt, {
      submissionId: input.submissionId,
      browserToken: input.browserToken,
    }),
  ).resolves.toEqual({ found: true, status: 'sent' })
})

test('delivery reconciliation stops after the bounded provider window', async () => {
  const t = initTest()
  const input = reportInput('submission-reconcile-0001')
  await t.mutation(api.sourceReports.reports.submit, input)
  const submissionHash = await sha256HexOfText(input.submissionId)
  const reportId = await t.run(async (ctx) => {
    const report = await ctx.db
      .query('sourceProblemReports')
      .withIndex('by_submission_hash', (q) =>
        q.eq('submissionHash', submissionHash),
      )
      .unique()
    if (!report) throw new Error('Missing source report fixture')
    return report._id
  })
  await t.mutation(internal.sourceReports.reports.reconcileDelivery, {
    reportId,
    attempt: 70,
  })
  await t.run(async (ctx) => {
    expect(await ctx.db.get(reportId)).toMatchObject({
      deliveryStatus: 'failed',
    })
  })
})

test('issue, decision, meeting, and selected Source routes stay attached', async () => {
  const t = initTest()
  const paths = [
    '/issues/drainage-project?source=evidence-1',
    '/decisions/co-029-2026',
    '/meetings/council-2026-09-02',
  ]
  for (const [index, recordUrl] of paths.entries()) {
    await t.mutation(api.sourceReports.reports.submit, {
      ...reportInput(`submission-surface-000${index}`),
      browserToken: `browser-surface-${index}-000000000000000000000000`,
      recordUrl,
    })
  }
  await t.run(async (ctx) => {
    const reports = await ctx.db.query('sourceProblemReports').take(10)
    expect(reports.map((report) => report.recordPath).sort()).toEqual(
      [...paths].sort(),
    )
  })
})

test('source report input rejects unsafe URLs and oversized descriptions', async () => {
  const t = initTest()
  await expect(
    t.mutation(api.sourceReports.reports.submit, {
      ...reportInput('submission-record-url-0001'),
      recordUrl: 'https://example.com/issues/not-public-parish',
    }),
  ).rejects.toThrow('attached Public Parish page is invalid')
  await expect(
    t.mutation(api.sourceReports.reports.submit, {
      ...reportInput('submission-official-url-0001'),
      officialUrl: 'javascript:alert(1)',
    }),
  ).rejects.toThrow('valid public link')
  await expect(
    t.mutation(api.sourceReports.reports.submit, {
      ...reportInput('submission-reply-email-0001'),
      replyEmail: 'not-an-email',
    }),
  ).rejects.toThrow('valid email address')
  await expect(
    t.mutation(api.sourceReports.reports.submit, {
      ...reportInput('submission-description-0001'),
      description: 'x'.repeat(2_001),
    }),
  ).rejects.toThrow('10 to 2,000')
})

test('browser rate limits stop the fourth report inside one hour', async () => {
  const t = initTest()
  const browserToken = 'browser-rate-token-000000000000000000000000'
  const browserHash = await sha256HexOfText(browserToken)
  await t.run(async (ctx) => {
    for (let index = 0; index < 3; index += 1) {
      await ctx.db.insert('sourceProblemReports', {
        submissionHash: `prior-submission-${index}`,
        browserHash,
        category: 'wrong-fact',
        recordPath: '/decisions/prior-record',
        outboundId: `prior-outbound-${index}`,
        createdAt: Date.now() - index,
      })
    }
  })
  await expect(
    t.mutation(api.sourceReports.reports.submit, {
      ...reportInput('submission-rate-0001'),
      browserToken,
    }),
  ).rejects.toThrow('Too many reports')
})

test('the hourly cap names itself instead of blaming the browser', async () => {
  const t = initTest()
  await t.run(async (ctx) => {
    for (let index = 0; index < 100; index += 1) {
      await ctx.db.insert('sourceProblemReports', {
        submissionHash: `global-submission-${index}`,
        browserHash: `global-browser-${index}`,
        category: 'wrong-fact',
        recordPath: '/decisions/prior-record',
        outboundId: `global-outbound-${index}`,
        createdAt: Date.now() - index,
      })
    }
  })
  await expect(
    t.mutation(api.sourceReports.reports.submit, {
      ...reportInput('submission-global-001'),
      browserToken: 'browser-global-token-00000000000000000000',
    }),
  ).rejects.toThrow('hourly limit')
})

test('availability fails closed without the private inbox', async () => {
  vi.stubEnv('AGENTMAIL_API_KEY', 'agentmail-test-key')
  vi.stubEnv('AGENTMAIL_REPORTS_INBOX_ID', '')
  const t = convexTest(schema, modules)
  await expect(
    t.query(api.sourceReports.reports.availability, {}),
  ).resolves.toEqual({ available: false })
  await expect(
    t.mutation(
      api.sourceReports.reports.submit,
      reportInput('unavailable-0000001'),
    ),
  ).rejects.toThrow('unavailable')
})

test('expired private report metadata is removed in bounded batches', async () => {
  const t = initTest()
  await t.run(async (ctx) => {
    await ctx.db.insert('sourceProblemReports', {
      submissionHash: 'expired-submission',
      browserHash: 'expired-browser',
      category: 'wrong-fact',
      recordPath: '/decisions/expired-record',
      outboundId: 'expired-outbound',
      createdAt: 0,
    })
  })
  await expect(
    t.mutation(internal.sourceReports.reports.removeExpiredMetadata, {}),
  ).resolves.toEqual({ deleted: 1, continued: false })
})

function reportInput(submissionId: string) {
  return {
    submissionId,
    browserToken: 'browser-token-0000000000000000000000000001',
    category: 'broken-citation' as const,
    recordUrl: '/issues/drainage-project?returnTo=%2Fexplore&source=evidence-7',
    description: 'The Source button opens a different paragraph.',
    officialUrl: 'https://lafayettela.gov/minutes.pdf',
    replyEmail: 'resident@example.com',
  }
}
