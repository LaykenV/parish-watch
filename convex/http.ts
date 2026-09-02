import { registerStaticRoutes } from '@convex-dev/static-hosting'
import { httpRouter } from 'convex/server'

import { components } from './_generated/api'
import { recordProductAnalytics } from './analytics/http'
import { handleAgentMailWebhook } from './follows/webhook'

const http = httpRouter()

// Exact app, webhook, auth, and share routes must be registered before this catch-all.
http.route({
  path: '/api/analytics',
  method: 'POST',
  handler: recordProductAnalytics,
})

http.route({
  path: '/agentmail/webhook',
  method: 'POST',
  handler: handleAgentMailWebhook,
})

registerStaticRoutes(http, components.staticHosting)

export default http
