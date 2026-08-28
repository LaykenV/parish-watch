# Hackathon log

- **Project:** Public Parish
- **Event:** Convex All Gas Hackathon
- **What it does:** Establishes a source-cited service for discovering, understanding, questioning, and following consequential Louisiana local-government decisions.
- **Live app:** https://befitting-flamingo-587.convex.site
- **Repo:** https://github.com/LaykenV/public-parish
- **Frontend:** Convex static hosting
- **Convex deployment:** https://befitting-flamingo-587.convex.cloud
- **Components:** `@convex-dev/static-hosting`, `@firecrawl/firecrawl-convex`
- **Convex features:** queries, mutations, internal actions, HTTP actions, realtime queries, file storage
- **Auth:** none
- **AI models:** none
- **Started:** 2026-08-27T04:38:41Z
- **Last updated:** 2026-08-28T19:56:20Z

## Log

### 2026-08-28 - working tree

Built and deployed the Slice 1 source ledger and retrieval processor v2 to the
personal development deployment `woozy-wren-227`. Production remained
untouched. The schema holds jurisdictions, bodies, registries, per-source
immutable snapshot chains, pipeline runs, and stage evidence. The processor
checks requested and final URLs, requires a successful target status, hashes
the raw artifact separately from normalized Markdown, reuses only the current
source-chain head with the same raw hash, and cleans redundant or failed file
uploads (`convex/schema.ts`, `convex/operations/ingest.ts`, `convex/sources/`,
`convex/pipeline/`).

The real Lafayette council hub created processor v2 snapshot
`js7c4pvv6xx0x1p8d9hk3zw64s8danvf`. It stores 37,372 bytes of normalized
Markdown and 131,799 bytes of raw HTML. The raw artifact hash starts
`d02b2171…`; its separate normalized hash starts `53188bd7…`. An immediate
repeat reused the same snapshot ID and version 2.

Expanded the Lafayette registry from one seed to the council hub, council
document search, and schedule/research pages. A bounded Firecrawl map found 19
official council pages. The portal did not expose individual records to the
map, so two official-domain-restricted Firecrawl searches found 50 ranked
candidates, including stable `/obcouncil/api/Document/<id>/` records. The
official portal query paired the April 21, 2026 Lafayette City Council agenda
with its minutes.

The first PDF spike revealed that Firecrawl's `rawHtml` is a rendered
representation, not the original PDF. The processor now keeps Firecrawl's
Markdown extraction and downloads the approved official PDF as the immutable
raw artifact. That download checks redirects, status, and content type, stops
after 60 seconds, and enforces a streamed 25 MB limit. The corrected agenda
snapshot `js7facykrk86ep9rgf98ttj52n8dadh2` stores a 172,034-byte, two-page PDF
and 4,274 bytes of Markdown. The corrected minutes snapshot
`js76769zsap7fwv3e1j6r2tqbh8db1cv` stores a 160,754-byte, seven-page PDF and
12,696 bytes of Markdown. Immediate repeats reused both version 2 snapshot IDs.
The earlier version 1 PDF snapshots remain in development as transparent spike
evidence and contain rendered HTML rather than the source PDFs.

`npm run verify` passes typechecking, 30 tests, the production build, and lint.
The Convex review found no public function, auth, query-scan, validator, or
unbounded-result issue in this change. A hosted development build was uploaded
to `https://woozy-wren-227.convex.site`; a direct GET and the live readiness
query passed. PR review caught a PDF body-stream timeout that could escape the
structured failure path after response headers arrived. The downloader now
records that case as retryable, and a regression test fails the stream after
its first chunk. A later review found that Firecrawl Markdown and the direct PDF
download could straddle an agency file replacement. PDF ingestion now brackets
a forced fresh Firecrawl scrape with official-file downloads and commits only
when both raw hashes agree. A regression test changes the PDF between those
downloads and proves that no mixed snapshot is created. The revised processor
was pushed to the personal development deployment and ingested the agenda again.
Both official downloads matched around the fresh Firecrawl scrape, and the run
reused snapshot `js7facykrk86ep9rgf98ttj52n8dadh2` at version 2. The final
fail-closed content-type and PDF-signature checks passed the same live dev run
and reused that snapshot again.

Added the hackathon release path in the working tree. Pull requests run the full
verification command. A reviewed merge to `main` will deploy the matching
backend and frontend, apply the idempotent registry seed, and run a production
smoke. The smoke script checks the direct `convex.site` origin, the canonical
custom domain, the path-preserving apex redirect, a built JavaScript asset, and
the live readiness query. Its read-only HTTP checks pass against the current
production shell. The new workflow has not run yet because this working tree
has not merged. No AI model call, AgentMail integration, authentication,
production promotion of Slice 1, public evidence interface, or public pipeline
function exists yet.

### 2026-08-27 - dd12d01

Established separate hosted development and production environments. The Phase
0 shell passed its hosted development smoke before the matching Convex backend
and static frontend were promoted to production. Renamed the product, GitHub
repository, local remote, and Convex project to Public Parish and
`public-parish`. GitHub redirects the former repository URL; the Convex
deployment names and public URLs remain unchanged.

Attached `https://www.publicparish.com` directly to the production Convex HTTP
router and set it as the production `CONVEX_SITE_URL`. Added a redirect-only
Vercel project for the bare domain so paths and query strings on
`https://publicparish.com` permanently redirect to `www`; Vercel does not host
the application frontend. Checked the isolated redirect configuration into
`infra/apex-redirect`. Kept the required
`https://befitting-flamingo-587.convex.site` origin public and functional.
Documented why the redirect is needed and why it does not replace the
hackathon's qualifying URL. The submission will use the public `convex.site`
host; the custom domain remains an additional resident-facing entry point.

Kept the team warning threshold at $20 per month and raised the hard disable
threshold from $40 to $60 per month before real AI Gateway calls begin. The
limit remains team-wide; model calls will also have application-level token,
retry, batch, and chat budgets.

Verified the custom-domain DNS and TLS certificate, the public root and direct
SPA routes on both served production origins, the production-bound JavaScript
asset, desktop and mobile layouts, and the live readiness query
(`package.json`, `README.md`, `docs/`). Convex Auth v2 and Google OAuth remain
planned but unconfigured. No Firecrawl ingestion, OpenAI model call, AgentMail
integration, authentication, or resident evidence experience exists yet.

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
