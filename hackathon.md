# Hackathon log

- **Project:** Parish Watch
- **Event:** Convex All Gas Hackathon
- **What it does:** Establishes a source-cited service for discovering, understanding, questioning, and following consequential Louisiana local-government decisions.
- **Live app:** https://befitting-flamingo-587.convex.site
- **Repo:** https://github.com/LaykenV/parish-watch
- **Frontend:** Convex static hosting
- **Convex deployment:** https://befitting-flamingo-587.convex.cloud
- **Components:** `@convex-dev/static-hosting`
- **Convex features:** queries, internal actions, HTTP actions, realtime queries
- **Auth:** none
- **AI models:** none
- **Started:** 2026-08-27T04:38:41Z
- **Last updated:** 2026-08-27T17:54:34Z

## Log

### 2026-08-27 - working tree

Established separate hosted development and production environments. The Phase
0 shell passed its hosted development smoke before the matching Convex backend
and static frontend were promoted to production. Verified the public root,
production-bound JavaScript asset, direct not-found route, desktop and mobile
layouts, and live readiness query (`package.json`, `README.md`, `docs/`). No
Firecrawl ingestion, OpenAI model call, AgentMail integration, authentication,
or resident evidence experience exists yet.

### 2026-08-27 - 96938c4

Initialized a fresh repository and completed the product grilling. Documented
the agreed scope, resident experience, evidence policy, source plan,
architecture, sponsor roles, four-week build order, demo, user-proof targets,
and stop rules. Completed event registration and selected Convex AI Gateway,
Convex Auth v2 alpha, and a two-tier GPT-5.6 model split for the implementation
plan.
Narrowed the plan before implementation by removing FAQ aggregation, the public
correction workflow, public-triggered compiler runs, and cross-device chat
history. Kept a private source-problem inbox, public coverage demand capture,
the owner-triggered coverage compiler, weekly roundup emails, and per-issue share
HTML.
Confirmed that the Convex Professional plan satisfies the AI Gateway paid-team
requirement. Revised the model assignment so that GPT-5.6 Terra performs record
extraction, consequence factors, and issue linking, while GPT-5.6 Luna performs
discovery classification, ranking, independent publication review, and chat.
Dropped GPT-5.6 Sol from the plan entirely; two tiers cover the pipeline.
Documented the roles `MODEL_STRONG` and `MODEL_FAST` with a single
role-to-model table in `docs/architecture.md`, and set every stage that produces
or clears a published claim to high reasoning.
Scaffolded TanStack Start in SPA/static-prerender mode and created a Convex
development deployment. Added the static-hosting component, a live readiness
query and React subscription, a checked-in environment template, an MIT
license, and a public GitHub remote (`package.json`, `vite.config.ts`, `convex/`,
`src/`, `.env.example`, `LICENSE`).

Installed Convex's generated AI guidance and pinned Convex Auth v2 alpha without
configuring authentication. Verified an AI Gateway service token and confirmed
that the planned Terra and Luna model IDs are available through the gateway's
model-list endpoint; this was not an AI model call. Redeemed the official
Firecrawl participant credit grant.

Proved a clean dependency install, generated guidance status, three tests,
typechecking, a production build, linting, a Convex cloud push, and a local
"Convex connected" runtime. No public app deployment, Firecrawl ingestion,
OpenAI model call, AgentMail integration, or authentication exists yet.

Hardened the first public release by pinning every direct dependency, declaring
the supported Node.js and npm majors, and making production builds reject a
missing Convex URL. The deploy command now rebuilds before publishing. Generated
agent guidance stays local and is reproducible through the documented install
command (`package.json`, `package-lock.json`, `vite.config.ts`, `.gitignore`,
`README.md`).

Added a narrowly bounded plan for one static landing-page voter-information
strip. It will link to the Louisiana Secretary of State and show a date verified
against the official calendar. Candidate coverage, ballot matching, crawling,
and model-generated election content remain out of scope (`PLAN.md`,
`docs/product-spec.md`, `docs/build-plan.md`).

Published the initial Phase 0 source commit to the public `main` branch. The app
itself remains undeployed.
