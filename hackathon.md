# Hackathon log

- **Project:** Public Parish
- **Event:** Convex All Gas Hackathon
- **What it does:** Establishes a source-cited service for discovering, understanding, questioning, and following consequential Louisiana local-government decisions.
- **Live app:** https://befitting-flamingo-587.convex.site
- **Repo:** https://github.com/LaykenV/public-parish
- **Frontend:** Convex static hosting
- **Convex deployment:** https://befitting-flamingo-587.convex.cloud
- **Components:** `@convex-dev/static-hosting`, `@firecrawl/firecrawl-convex`, `@convex-dev/workflow`
- **Convex features:** queries, mutations, internal actions, HTTP actions, realtime queries, file storage, durable workflows
- **Auth:** none
- **AI models:** `openai/gpt-5.6-terra` for `MODEL_STRONG` extraction and `openai/gpt-5.6-luna` for `MODEL_FAST` independent review through Convex AI Gateway
- **Started:** 2026-08-27T04:38:41Z
- **Last updated:** 2026-08-29T16:33:30Z

## Log

### 2026-08-29 - 0b49718

Reconciled the public record with the release history. Slice 2 merged through
PR #6 as `74ce97e`; production workflow `33222925340` deployed the reviewed
private extraction backend and passed smoke. The real Terra extraction and
idempotent replay ran in the personal development deployment, not production.
At that checkpoint, release `0b49718` also passed its production workflow. The
Slice 2 backend was deployed, while publication and independent Luna review
remained unbuilt.

### 2026-08-29 - 28ba0c3

Selected Field Notes as the production landing page in `cf828ad`, then replaced
its hero note stack with an interactive three-dimensional Louisiana relief built
with vGPU and WebGPU. The relief now shares the hero's page plane instead of
sitting inside a card. Pointer movement anywhere across the hero controls its
tilt. The solid dark slab keeps three labeled static cobalt launch pins,
perimeter light, floor radiance, and one traveling flare behind the silhouette.
The flare has a visible core, halo, and rotating beam but no scanning line or
marker pulses. Ambient draws run at a low rate only while visible, pointer
settling briefly runs faster, and reduced-motion mode holds one static frame.
The ray walk and render resolution are capped, and the component keeps a static
SVG fallback (`src/features/landing/`).

Added Coss UI Button and Badge primitives, Base UI behavior, and semantic design
tokens. Replaced the placeholder mark with a path-based double-P SVG and recorded
the selected logo, Inter and Geist Mono typography, tokens, and component rules
in the design system (`src/components/ui/`, `public/brand-mark.svg`,
`docs/design-system.html`). Browser checks passed at desktop, 390-pixel, and
320-pixel widths with the WebGPU render ready, hero-wide tilt responding, all
three pin labels in view, and no horizontal overflow. The
marketing header now uses the live-text name without the mark. On mobile, the
headline appears before the Louisiana field while the state remains visible in
the first viewport. Supporting copy follows the field. Sequence labels use plain
numbers without leading zeroes, and the connector stops at step 4.
`npm run verify` passes typechecking, 70 tests, the production build and
prerender, and lint. No deployment was made.

### 2026-08-29 - ed9aebd

Reduced the desktop Louisiana field so it supports the headline without
filling the right side of the hero. Fine-pointer devices keep the hero-wide
tilt and low-rate flare. Touch-first devices render one static WebGPU frame with
no pointer listeners or ambient loop. Browser checks passed at 1414 by 872 and
390 by 844 with the WebGPU render ready and no horizontal overflow. No
deployment was made for that landing-page refinement at the time. The later
`8df651c` release carried it to production.

### 2026-08-29 - 8df651c

Implemented Slice 3 as a separate `reviewAndPublishCandidateV1` durable
workflow. A validated candidate now queues an exact candidate, snapshot, and
fact set for a high-reasoning `MODEL_FAST` review. Luna receives the candidate
and cited spans, not the full source document, and must return one check for
every stored fact under strict JSON Schema. The contract rejects missing,
duplicate, unknown, or mismatched checks. The review model cannot match the
Terra extraction model. Deterministic source and input-hash checks run before
and after the model step (`convex/review/`, `convex/publication/`,
`convex/extraction/workflow.ts`).

Added immutable review, check, finding, decision-record, publication-version,
and citation evidence. The final policy derives full, limited, or withheld from
the stored checks. Luna cannot repair fields or choose the public payload. A
limited version contains only source record ID, title, registered body, and
official-source metadata. A withheld version cannot replace the last full or
limited current pointer. The starter is internal and idempotent on the exact
candidate plus review, policy, and payload versions (`convex/schema.ts`,
`convex/operations/publication.ts`).

Fourteen Slice 3 tests cover full publication, incomplete-source limiting,
core evidence withholding, dishonest verdict rejection, same-model rejection,
exact-check enforcement, current-pointer preservation, and replay. They also
prove that a limited finding on a core field withholds the record, duplicate
checks fail at persistence and finalization, a late failure cannot reuse a
successful review, a gateway response cannot substitute the extraction model,
and replay repairs a successful extraction that has no publication run. The
extraction workflow now completes the extraction and starts publication in one
mutation, so a scheduling failure rolls back both changes. The full suite passes
84 tests, typecheck, build, prerender, and lint.

The original Slice 3 proof ran on personal development deployment
`woozy-wren-227` and set `MODEL_FAST_ID` there to
`openai/gpt-5.6-luna`. Run `jd75t07cb5m350nt3fyys67e8n8dckn5`
reviewed candidate `k571jxydqzev299r67v2d0ew2d8ddmcd` through Convex AI
Gateway in one 11.953-second call. It used 1,707 prompt tokens, 1,281 completion
tokens, 641 reasoning tokens, and an estimated $0.001879. Luna rejected the
`recordType` and `lifecycleState` excerpts while supporting the core identity.
The deterministic policy wrote limited version
`ks74a1k6nh3gc49f5bby3q7vcn8dc6kz` with only three core citations. Replaying
the starter returned `reused: true`, kept one AI call, and created no second
version. PR #12 merged the reviewed hardening as `8df651c`. Production workflow
`33261235916` verified the release, deployed the backend and frontend, applied
the registry seed, and passed its smoke. An independent production smoke then
passed the direct `convex.site` host, canonical domain, apex redirect, and
readiness query. No production extraction or model review was run.

### 2026-08-28 - 74ce97e

Implemented Slice 2, the cited atomic decision. Registered `@convex-dev/workflow`
0.4.6 and built `extractSnapshotV1`, a durable workflow that runs the pipeline
steps prepare, extract, validate, and complete, with the model step on a bounded
three-attempt retry and parallelism capped at two. The pipeline ledger gained
`extract` and `validate` stages, a `manual_extraction` trigger, and a private
evidence set of `aiCalls`, `extractions`, `decisionCandidates`,
`candidateFacts`, and `validationFindings` tables. The internal starter is
idempotent on a key that hashes prompt, schema, and processor versions plus
registry, snapshot, and target record, and it records the workflow ID on the run.

Built the strict extraction contract v1 (`convex/extraction/contractV1.ts`) with
a JSON Schema `response_format` for OpenAI Structured Outputs, a matching Convex
validator, constrained JSON Pointer fact paths, and bounded fields. Built the Convex AI
Gateway provider boundary (`convex/ai/`) that mints the scoped token in the
action, posts Chat Completions with `reasoning_effort: "high"` and `store:
false`, classifies refusals, length cutoffs, malformed and schema-invalid
responses, transient and permanent HTTP failures, and keeps a direct OpenAI
adapter behind the same interface, disabled unless configuration explicitly
enables it. Every vendor attempt is recorded with route, model role, usage,
cached and reasoning tokens, and an estimated cost from the architecture price
table.

Validation is fail-closed: snapshot basis, normalization, truncation, stored
hash and size, and official-domain checks run before any model call and again at
validation. The validator re-verifies the stored text, requires every cited
snapshot ID and excerpt to resolve inside normalized source text, gates page
numbers behind a page map, checks section-before-excerpt ordering, parses
Louisiana meeting dates and public-action deadlines as zoned ISO timestamps
supported by the cited date and time, requires amounts to be finite nonnegative
two-decimal values that appear as complete money tokens in the excerpt, blocks
agenda evidence from producing decided outcomes or votes, and requires exactly
one fact row for every non-null material leaf. Unknown paths, duplicate paths,
blank excerpts, and fact values that do not equal the stored candidate fail
validation. Passing validation moves the candidate to
`deterministically_validated`, which means ready for independent review, not
published. No public decision, citation, review, or publication table exists
yet.

Added 40 tests around a `CO-029-2026` fixture derived from the official agenda.
The tests ingest stubbed PDF and Firecrawl responses through `convex-test`, then
use stubbed Gateway responses to cover ordered stages, transient retry without
a second run, exhausted retry budgets, `Retry-After` evidence, permanent HTTP
errors, malformed envelopes, replay after persistence, key composition, exact
amount and time checks, page-map offsets, public-action deadlines, fact binding,
and fail-closed model and source errors. Direct mutation tests prove that a run
cannot complete before both stages agree, a workflow crash writes failure
evidence, target IDs cannot cross runs, and a validated candidate cannot flip to
failed. `npm run verify` passes typecheck, 70 tests, build, and lint.

A manual file-by-file review after the first pull request pass found and fixed
several gaps. Validation now checks page maps against the original source-text
offsets instead of whitespace-collapsed offsets. Date evidence must match
seconds when the source states them, and amount matching rejects numeric text
embedded in identifiers. Ledger mutations verify run, stage, extraction,
candidate, snapshot, source kind, and target ownership before changing state.
Workflow-level failures create a failed extraction row, and successful run
completion requires both stages to point to the same validated or not-found
extraction. Failed ledger handoffs delete any newly stored raw model response
instead of leaving an orphaned blob. Those changes used processor `v1.3`, so
runs made under the earlier validator could not be reused.

Proved the Slice 2 exit gate on the personal development deployment with the
real processor v2 agenda snapshot `js7facykrk86ep9rgf98ttj52n8dadh2`. Three
scoped Convex AI Gateway calls used `openai/gpt-5.6-terra`. The first response
invented fact-path syntax and the second joined a heading to a later record
line. Deterministic validation rejected both, and those failures led to prompt
versions `v1.1` and `v1.2`. The `v1.2` call completed in one model attempt with
2,418 prompt tokens, 1,609 completion tokens, 431 reasoning tokens, and an
estimated cost of $0.024144. It produced a private `CO-029-2026` proposal with
nine fact rows. Every excerpt resolved to the stored snapshot, every fact value
matched its candidate field, both workflow stages succeeded, and the candidate
reached `deterministically_validated`. Repeating the starter returned the same
successful run with `reused: true` and made no new model call. Production is
untouched.

After the hard-review fixes, processor `v1.3` ran the same immutable snapshot
again as workflow `jd77cjr93ffka05sxygsmk9cvs8dae8x`, pipeline run
`jd7fdefsdfnwqzqfje6j44t9zs8dap09`, extraction
`k97163nwwnsfn09ma10wvgaass8da9y2`, and candidate
`k5702garn0ve9czhxa51b9022x8damkw`. Terra completed in one attempt with 2,418
prompt tokens, 1,691 completion tokens, 469 reasoning tokens, and an estimated
cost of $0.020781. The request used 2,415 cached input tokens. Both stages
referenced the same extraction, the candidate reached
`deterministically_validated`, all nine fact rows persisted, and no validation
finding existed. Repeating the starter returned `reused: true`; the run still
had one AI call. Production remained untouched.

A second independent review found that a date-only citation accepted a
timestamp with nonzero seconds. Processor `v1.4` now requires exact midnight
when the source gives a date without a time. The same review added direct test
coverage for target-record mismatches, agenda evidence claiming an outcome, and
citations tied to another snapshot. It also replaced an unexplained AI-call
query limit with the retry-derived six-call ceiling, rejects a seventh call
instead of leaving it unlinked, caps validation-stage error details at 500
characters, removes the duplicate extraction-version re-export, and documents
why ESLint rather than TypeScript checks first-party unused symbols.

Processor `v1.4` then ran snapshot `js7facykrk86ep9rgf98ttj52n8dadh2`
as workflow `jd7bpj99vzmfbse5sq4z7zrsy18dcawg`, pipeline run
`jd73w9yar4s5hc0mh3swbhbce58dc9rf`, extraction
`k977t7yxh9fbmzv8y1edcaccy18ddnra`, and candidate
`k571jxydqzev299r67v2d0ew2d8ddmcd`. Terra completed in one attempt with 2,418
prompt tokens, 2,103 completion tokens, 816 reasoning tokens, and an estimated
cost of $0.030072. Both stages referenced the same extraction, all nine fact
rows persisted, the candidate reached `deterministically_validated`, and the
run had no validation finding. Repeating the starter returned `reused: true`
with the same run and workflow IDs; the run still had one AI call. Production
remained untouched.

### 2026-08-28 - 70ee961

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
production shell. The new release workflow has since run: this work merged through PR #5
(`70ee961`), deployed the production backend and frontend, and the production
smoke passed, so Slice 1 is live in production. No AI model call, AgentMail
integration, authentication, public evidence interface, or public pipeline
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
