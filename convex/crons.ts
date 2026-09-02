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

export default crons
