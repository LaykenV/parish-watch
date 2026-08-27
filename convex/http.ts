import { registerStaticRoutes } from '@convex-dev/static-hosting'
import { httpRouter } from 'convex/server'

import { components } from './_generated/api'

const http = httpRouter()

registerStaticRoutes(http, components.staticHosting)

export default http
