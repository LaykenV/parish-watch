import { cronJobs } from 'convex/server'

import { internal } from './_generated/api'

const crons = cronJobs()

crons.interval(
  'remove expired product telemetry',
  { hours: 24 },
  internal.analytics.retention.removeExpiredTelemetry,
  {},
)

crons.interval(
  'remove expired email verification challenges',
  { hours: 24 },
  internal.follows.retention.removeExpiredChallenges,
  {},
)

crons.interval(
  'remove finalized AgentMail verification payloads',
  { hours: 1 },
  internal.follows.retention.removeFinalizedAgentMailPayloads,
  {},
)

crons.interval(
  'claim the weekly sourced alert window',
  { hours: 1 },
  internal.follows.agentmailClient.claimWeeklyRoundup,
  {},
)

crons.interval(
  'remove expired private source report metadata',
  { hours: 24 },
  internal.sourceReports.reports.removeExpiredMetadata,
  {},
)

crons.interval(
  'recover interrupted sourced email replies',
  { minutes: 5 },
  internal.emailReplies.recovery.recoverInterruptedReplies,
  {},
)

crons.interval(
  'remove expired sourced email reply metadata',
  { hours: 24 },
  internal.emailReplies.recovery.removeExpiredReplyMetadata,
  {},
)

crons.interval('check approved government sources', { minutes: 15 }, internal.monitoring.ledger.tick, {})

crons.interval('deliver verified place launch notices', { minutes: 15 }, internal.coverage.requests.sweep, { paginationOpts: { numItems: 25, cursor: null } })
crons.interval('remove expired coverage request metadata', { hours: 24 }, internal.coverage.requests.cleanup, {})

crons.interval('remove expired civic event receipts', { hours: 24 }, internal.analytics.civic.cleanup, {})

for (const kind of ['pipeline', 'ask', 'compiler', 'monitoring', 'retrieval'] as const) crons.interval(`aggregate ${kind} provider usage`, { minutes: 5 }, internal.operations.usage.aggregate, { kind })

export default crons
