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

export default crons
