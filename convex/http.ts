import { registerStaticRoutes } from '@convex-dev/static-hosting'
import { httpRouter } from 'convex/server'

import { components } from './_generated/api'

const http = httpRouter()

// Exact app, webhook, auth, and share routes must be registered before this catch-all.
registerStaticRoutes(http, components.staticHosting)

export default http
