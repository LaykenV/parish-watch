import staticHosting from '@convex-dev/static-hosting/convex.config'
import { defineApp } from 'convex/server'

const app = defineApp()

// App HTTP stays at the site root. Do not mount with httpPrefix: "/api".
app.use(staticHosting)

export default app
