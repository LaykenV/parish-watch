import firecrawl from '@firecrawl/firecrawl-convex/convex.config'
import staticHosting from '@convex-dev/static-hosting/convex.config'
import { v } from 'convex/values'
import { defineApp } from 'convex/server'

const app = defineApp({
  env: {
    FIRECRAWL_API_KEY: v.string(),
    FIRECRAWL_WEBHOOK_SECRET: v.optional(v.string()),
  },
})

// App HTTP stays at the site root. Do not mount with httpPrefix: "/api".
app.use(staticHosting)

app.use(firecrawl, {
  httpPrefix: '/firecrawl/',
  env: {
    FIRECRAWL_API_KEY: app.env.FIRECRAWL_API_KEY,
    FIRECRAWL_WEBHOOK_SECRET: app.env.FIRECRAWL_WEBHOOK_SECRET,
  },
})

export default app
