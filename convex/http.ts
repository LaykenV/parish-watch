import { registerStaticRoutes } from '@convex-dev/static-hosting'
import { httpRouter } from 'convex/server'

import { components } from './_generated/api'
import { recordProductAnalytics } from './analytics/http'

const http = httpRouter()

// Exact app, webhook, auth, and share routes must be registered before this catch-all.
http.route({
  path: '/api/analytics',
  method: 'POST',
  handler: recordProductAnalytics,
})

registerStaticRoutes(http, components.staticHosting)

export default http
