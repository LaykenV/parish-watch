import firecrawl from '@firecrawl/firecrawl-convex/convex.config'
import rateLimiter from '@convex-dev/rate-limiter/convex.config'
import staticHosting from '@convex-dev/static-hosting/convex.config'
import workflow from '@convex-dev/workflow/convex.config'
import { v } from 'convex/values'
import { defineApp } from 'convex/server'

const app = defineApp({
  env: {
    FIRECRAWL_API_KEY: v.string(),
    FIRECRAWL_WEBHOOK_SECRET: v.optional(v.string()),
    MODEL_STRONG_ID: v.optional(v.string()),
    MODEL_FAST_ID: v.optional(v.string()),
    DIRECT_OPENAI_FALLBACK_ENABLED: v.optional(v.string()),
    OPENAI_API_KEY: v.optional(v.string()),
  },
})

// App HTTP stays at the site root. Do not mount with httpPrefix: "/api".
app.use(staticHosting)

app.use(workflow)

app.use(rateLimiter)

app.use(firecrawl, {
  httpPrefix: '/firecrawl/',
  env: {
    FIRECRAWL_API_KEY: app.env.FIRECRAWL_API_KEY,
    FIRECRAWL_WEBHOOK_SECRET: app.env.FIRECRAWL_WEBHOOK_SECRET,
  },
})

export default app
