import { cronJobs } from 'convex/server'

import { internal } from './_generated/api'

const crons = cronJobs()

crons.interval(
  'remove expired product telemetry',
  { hours: 24 },
  internal.analytics.retention.removeExpiredTelemetry,
  {},
)

export default crons
