import firecrawl from '@firecrawl/firecrawl-convex/convex.config'
import agentmail from '@agentmail/convex/convex.config'
import agent from '@convex-dev/agent/convex.config'
import auth from '@convex-dev/auth/core/convex.config.js'
import oauth from '@convex-dev/auth/providers/oauth/convex.config.js'
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
    AUTH_PRIVATE_KEY: v.string(),
    AUTH_JWKS: v.string(),
    AUTH_GOOGLE_CLIENT_ID: v.string(),
    AUTH_GOOGLE_CLIENT_SECRET: v.string(),
    ADMIN_EMAIL: v.optional(v.string()),
    AGENTMAIL_API_KEY: v.string(),
    AGENTMAIL_WEBHOOK_SECRET: v.optional(v.string()),
    AGENTMAIL_UPDATES_INBOX_ID: v.optional(v.string()),
    EMAIL_ADDRESS_HMAC_KEY: v.optional(v.string()),
    EMAIL_ENCRYPTION_KEY: v.optional(v.string()),
  },
})

app.use(auth, {
  httpPrefix: '/auth',
  env: {
    AUTH_PRIVATE_KEY: app.env.AUTH_PRIVATE_KEY,
    AUTH_JWKS: app.env.AUTH_JWKS,
  },
})

app.use(oauth, {
  name: 'oauthGoogle',
  httpPrefix: '/oauth/google',
  env: {
    CLIENT_ID: app.env.AUTH_GOOGLE_CLIENT_ID,
    CLIENT_SECRET: app.env.AUTH_GOOGLE_CLIENT_SECRET,
  },
})

// App HTTP stays at the site root. Do not mount with httpPrefix: "/api".
app.use(staticHosting)

app.use(agent)

app.use(workflow)

app.use(rateLimiter)

app.use(agentmail, {
  env: {
    AGENTMAIL_API_KEY: app.env.AGENTMAIL_API_KEY,
  },
})

app.use(firecrawl, {
  httpPrefix: '/firecrawl/',
  env: {
    FIRECRAWL_API_KEY: app.env.FIRECRAWL_API_KEY,
    FIRECRAWL_WEBHOOK_SECRET: app.env.FIRECRAWL_WEBHOOK_SECRET,
  },
})

export default app
