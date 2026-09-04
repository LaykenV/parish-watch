import { unsubscribe } from './coverage/unsubscribe'
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

http.route({ pathPrefix: '/coverage/unsubscribe/', method: 'GET', handler: unsubscribe })
http.route({ pathPrefix: '/coverage/unsubscribe/', method: 'POST', handler: unsubscribe })

registerStaticRoutes(http, components.staticHosting)

export default http
