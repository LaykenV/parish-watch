# Technical Architecture

Status: Phase 0, evidence-engine Slices 1 through 4, resident-interface Design Slices 1 through 8, and implementation Slice 6 are deployed

## Architecture Goal

Build one durable path from an official government source to a resident outcome:

```text
Official source changes
  -> Firecrawl discovers and retrieves the artifact
  -> Convex stores an immutable snapshot and pipeline state
  -> OpenAI through Convex AI Gateway extracts granular, cited records
  -> deterministic validators reject unsupported facts
  -> a separate OpenAI call reviews the evidence
  -> deterministic publication policy accepts, limits, or withholds
  -> records link into an issue timeline
  -> the public UI updates through Convex
  -> AgentMail sends a material-change alert
  -> resident replies or asks a grounded follow-up
```

The architecture should make this loop obvious in the live app and in the
under-three-minute demo.

## Current implementation checkpoint

Slice 1 implements the official registry, immutable source snapshots, raw and
normalized artifact hashes, file storage, and retrieval pipeline evidence.
Slice 2 registers `@convex-dev/workflow` 0.4.6 and adds the private
`extractSnapshotV1` path: prepare, Terra extraction, deterministic validation,
and completion. The model step has three attempts, workflow parallelism is
capped at two, and the run key covers the registry, snapshot, target record,
prompt, schema, and processor versions.

Slice 3 adds the separate `reviewAndPublishCandidateV1` workflow. It binds one
validated candidate to its extraction, snapshot, and exact fact set. Source and
input-hash checks run before and after the Luna call. The reviewer sees the
candidate and cited spans, cannot repair fields, and must judge every fact under
strict schema. A deterministic policy then writes a full, source-only limited,
or withheld immutable version. Withheld versions stay in history but never
replace the last full or limited current pointer. The projection tables exist,
and the discovery interface now reads the current accepted atomic publications
through one bounded public query. The query uses the current mode and update
time index, point-loads the accepted version and jurisdiction, returns only
resident-safe fields, and fails closed on stale or inconsistent pointers.
Development builds can still render typed fixtures through explicit QA URLs.
Production ignores those fixture parameters. A later integration slice owns the
ranked issue projection.

Slice 4 adds source-snapshot comparisons, publication material changes, and the
`buildIssueV1` durable workflow. Every accepted publication after the first is
compared with the previous accepted version. Formatting-only or lost time
precision does not create a material change. Atomic decisions keep their stable
record keys while issue versions point to the exact publication versions that
the linker saw.

The issue linker runs on `MODEL_STRONG` and must cite a concrete shared signal
across every input decision. `MODEL_FAST` independently reviews each proposed
fact from cited excerpts. Code then removes unsupported factors, computes the
fixed importance score, and writes a full, limited, or withheld immutable issue
version. A withheld version remains in history and cannot replace the current
full or limited pointer.

The extraction, publication, and issue ledgers remain internal. Resident-safe
queries expose only current accepted fields, exact public citations, bounded
history, and meeting groups derived from accepted meeting times. Issue reads
verify that every link still points at the linked decision's current accepted
publication before returning. The resident chat interface remains unavailable.
PR #13 merged as
`c162543`; production workflow `33273984552` deployed the Slice 4
backend and frontend, applied the registry seed, and passed smoke. The
independent production smoke then passed the direct Convex host, canonical
domain, apex redirect, and readiness query. Slice 4 development issue
`n57071y9n25rrs09yaanb1hz918dd1fs` links two real Lafayette decisions and
publishes a reviewed score of 5. No production extraction, model review, or
issue build had run at that release.

The later controlled production onboarding ran Terra extraction and Luna review
for launch atomic records. The August 31 batch published 26 records from 17
hash-matched official PDFs: 15 Lafayette, 9 Rapides, and 2 East Baton Rouge.
Fifteen are full and 11 are limited. Production now has two accepted issue
builds. The first links the two Lafayette surplus-pickup donation ordinances.
The second links the two Rapides 2026 millage records and arrived on an existing
resident subscription 10.8 seconds after its initial empty result. A September
1 one-time production data correction cleared the current publication pointers
from one older duplicate Lafayette board-vacancy record without deleting its
evidence. The resident query returns 26 publications and one canonical
board-vacancy card.

PR #24 merged resident-interface Design Slice 2 as `4e2ac67`. The application
shipped a responsive shell plus Home, For You, and Explore routes. Explicit
fixture query parameters drive deterministic QA states in development builds
without adding a resident-facing banner. Production ignores fixture parameters
and uses accepted-publication queries for the issue-led Home and Explore. The area
store, offline notice, URL-restored filters, result sorting, share fallback, and
responsive navigation run in the browser. The fixture adapter remains isolated
from production records and runs only from explicit development QA URLs.

The current route contract makes Home the resident's single local-news
destination. `/for-you` redirects to `/`, and `/issues` redirects to Home's
issue section. `/issues/$issueSlug` remains the stable cited timeline route.

PR #25 deployed the owner phone-review refinements as `b22e321`. The production
workflow and independent smoke passed. Production now ignores every fixture
scenario before Home or Explore derives page state, so fixture records,
signed-in areas, update rows, degraded notices, and failure states remain
development-only.

PR #27 deployed Design Slice 3 as `3a59e45`. It adds route-local typed adapters
for issue, decision, meeting, and citation views. Explicit `preview` and
`update` fixture values are accepted only when `import.meta.env.DEV` is true,
and development-only dynamic imports keep the evidence fixtures out of the
production JavaScript graph. Production builds resolve no fixture detail and
render the route recovery state. Citation selection lives in the `source` URL
parameter. The shared Coss drawer handles mobile citations, while desktop keeps
the selected excerpt in the evidence rail. No Convex schema, query,
publication, or ranking contract changed in this design slice.

PRs #28, #31, and #34 deployed the Ask, Following, account-entry, email,
Coverage, coverage-request, public-method, and private-report interfaces behind
their production availability gates. PR #37 unified route completion, loading,
sheet focus return, live announcements, and reduced motion. PR #43 deployed the
final connected prototype as `85d6947`. It carries validated resident return
paths and development evidence scenarios through route changes, and records the
typed contract, current gate, fixture owner, and future API owner for every
resident destination. Production workflow `33454522729` and the independent
production smoke passed.

The frontend contract is complete. Decision, meeting, issue, realtime, and
anonymous Ask evidence gates are proved. PR #45 deployed 24-hour anonymous
sessions, private Agent threads, component-owned message history, and
accepted-evidence retrieval. PR #47 deployed strict `MODEL_FAST` answers,
deterministic citation validation, and exact current-evidence replay. PR #49
connected the resident interface. PR #56 deployed the current answer path as
`adc0a34` through production workflow `33560561545`. High-reasoning Luna first
selects relevant targets from the complete current issue, meeting, decision,
and accepted-excerpt catalog. A second Luna call receives the selected records
and their hash-checked normalized official documents. Invalid, broad, and empty
selections expand to the full scope. A valid not-found selection skips the
second call. Per-session and app-wide request-frequency limits, private usage
telemetry, and deterministic citation validation remain. PR #57 deployed the
resident citation-display correction as `13f735b` through workflow
`33562735003`, so answer prose no longer exposes raw internal evidence IDs.
Production tests proved cited issue and corpus answers, exact Source controls,
evidence not found, and thread restoration.
Google account sessions and saved setup use the pinned Convex Auth v2 alpha.
Follow, AgentMail, coverage-request, and private-report adapters remain in the
post-Slice-5 plan.

## System Boundaries

Public Parish owns:

- the official-source registry;
- immutable source versions;
- extraction and review schemas;
- deterministic validation;
- issue linking and importance calculation;
- publication policy;
- public presentation;
- chat grounding;
- subscriptions, alerts, publication revisions, and source-problem intake;
- coverage health.

Public Parish does not own or replace:

- the official government record;
- a municipality's agenda or records system;
- legal notice;
- public-comment submission;
- a government employee's official answer.

The official record always wins. Public Parish is a connective and explanatory
layer.

## Planned Stack

| Layer         | Choice                                        | Reason                                                                                 |
| ------------- | --------------------------------------------- | -------------------------------------------------------------------------------------- |
| Web framework | TanStack Start                                | Typed routing and route data without adopting Next.js                                  |
| Rendering     | SPA with static prerendering                  | Compatible with the chosen Convex static host                                          |
| Route data    | TanStack Query plus `@convex-dev/react-query` | Official Convex path for TanStack Start route integration                              |
| Live UI       | Convex React hooks where clearer              | Realtime and pagination without unnecessary wrappers                                   |
| Backend       | Convex                                        | Queries, mutations, actions, schedules, HTTP routes, storage, auth, and reactive state |
| Hosting       | `@convex-dev/static-hosting` on `convex.site` | Public no-invite hackathon URL on the required stack                                   |
| Retrieval     | `@firecrawl/firecrawl-convex`                 | Durable source discovery, crawling, and change-aware ingestion                         |
| AI            | Convex AI Gateway to OpenAI Chat Completions  | Convex-scoped credentials, strict structured outputs, and per-function spend           |
| Chat history  | `@convex-dev/agent`                           | Durable threads and messages with application-owned published context                  |
| Rate limits   | `@convex-dev/rate-limiter`                    | Atomic request-frequency limits with private provider-usage telemetry                  |
| Strong model  | `openai/gpt-5.6-terra`                        | Record extraction, consequence factors, and issue linking                              |
| Fast model    | `openai/gpt-5.6-luna`                         | Discovery classification, ranking, independent review, and chat                        |
| Email         | `@agentmail/convex`                           | Verification, durable inbound threads, replies, and alerts                             |
| Auth          | Convex Auth v2 alpha                          | Google OAuth and backend authorization                                                 |

Install current official package versions during scaffolding, except Convex Auth
v2 alpha. Pin that alpha to the exact installed version because its APIs can
change. The lockfile and code become the implementation evidence.

## Environments and promotion

The hackathon uses two Convex environments, personal development and
production. There is no staging deployment.

`npm run dev` serves the frontend from the laptop and runs `convex dev` beside
it. Convex pushes backend changes from the current branch to the personal cloud
development deployment. The local UI connects to that remote backend, database,
actions, components, and file storage. This is one personal deployment, not one
deployment per branch. The last branch synced by `convex dev` determines the
backend code running there. Run `npm run dev` after switching branches.

Pull requests run `npm run verify`. A reviewed merge to `main` is the production
approval and triggers `.github/workflows/deploy-production.yml`. The workflow
verifies the merge commit, runs `npm run deploy`, applies the idempotent registry
seed, and runs the production smoke. The static-hosting deploy builds with the
production Convex URL, deploys the backend, and uploads the matching static
assets. Never upload a previously built `dist/` directory to production.

The Slice 4 release changed the extraction processor from v1.4 to v1.7 and the
extraction prompt from v1.2 to v1.4. Its deployment made no model calls. The
next extraction request for an existing snapshot and record will not reuse its
Slice 3 run, so a bulk production rerun would re-extract the corpus on
`MODEL_STRONG`. Estimate that spend and get approval before a bulk rerun.

`npm run hosting:smoke:dev` remains available for a change that needs the real
development HTTP router, caching, SPA fallback, or build-time URL. It is not a
normal pre-merge gate. Use a preview deployment only when auth, webhook,
routing, or schema work needs isolation from the personal development data.

Current Phase 0 hosts:

- development: `https://woozy-wren-227.convex.site` backed by
  `https://woozy-wren-227.convex.cloud`;
- public entry point: `https://publicparish.com`, a Vercel redirect-only host;
- primary production origin: `https://www.publicparish.com`, served directly by
  Convex;
- required hackathon and fallback production origin:
  `https://befitting-flamingo-587.convex.site` backed by
  `https://befitting-flamingo-587.convex.cloud`.

The `www` custom domain and `convex.site` origin serve the same production HTTP
router and static release. The bare domain preserves paths and query strings in
a permanent redirect to `www`; its complete configuration lives in
`infra/apex-redirect`. Keep `CONVEX_CLOUD_URL` on the production
`convex.cloud` endpoint for queries, mutations, actions, and realtime. The
production `CONVEX_SITE_URL` override is `https://www.publicparish.com`, so
Convex Auth will use the canonical public origin for its issuer and provider
callback. Production only allows `https://www.publicparish.com` as a Convex Auth
redirect origin. A Google sign-in started on the submission `convex.site` URL
first moves the resident to the same path and query on `www.publicparish.com`.
The OAuth flow state and callback therefore stay on one browser origin. Register
`https://woozy-wren-227.convex.site/oauth/google/callback` and
`https://www.publicparish.com/oauth/google/callback` with Google. Use a dedicated
Public Parish Google Cloud project so publishing its consent screen cannot
change another product's OAuth clients. The consent screen links to the public
home and `/privacy` pages. Test a complete sign-in started from each served
origin.

The redirect project exists because Vercel DNS rejects a literal apex CNAME and
Convex did not verify Vercel's flattened ALIAS record. DNS cannot send an HTTP
redirect, so the bare domain needs a small HTTP endpoint. That Vercel project
only returns the redirect. It does not build or serve the application.

For the hackathon, the qualifying and submission URL remains
`https://befitting-flamingo-587.convex.site`. It stays public, requires no
invitation, and serves the same production release as the custom domain. The
custom domain improves the resident-facing URL without replacing the required
Convex host.

Run each vendor integration through automated or bounded contract tests, then
development, then the post-merge production smoke. Keep
exploratory crawls, prompt iteration, synthetic records, and destructive failure
tests outside production. Use a preview deployment only when auth, webhook,
routing, or schema work needs isolation beyond the personal development
deployment.

## Frontend Shape

TanStack Start runs as a client application with static output and selected
prerendered routes. Do not design around request-time server rendering.
[`resident-interface-plan.md`](./resident-interface-plan.md) defines the final
page hierarchy, state matrix, and design-agent assignments. The complete
frontend may use typed local fixtures while APIs are unfinished. Public builds
must never simulate a successful integration.

Design Slices 1 through 8 implement the route blueprint, shared shell,
discovery, issue and evidence views, Ask, Following and accounts, Coverage,
cross-app QA, and the connected prototype. Typed local fixtures remain the
development proof for unfinished APIs. Production never treats them as data.

### Public Routes

| Route                   | Purpose                                            |
| ----------------------- | -------------------------------------------------- |
| `/`                     | Issue-led local home and area setup                |
| `/for-you`              | Legacy redirect to Home                            |
| `/explore`              | Issue-first search of published resident evidence  |
| `/issues`               | Legacy redirect to the issue section on Home       |
| `/issues/$issueSlug`    | Cited issue timeline                               |
| `/decisions/$recordKey` | Atomic decision record and publication history     |
| `/meetings/$meetingId`  | Meeting and source records                         |
| `/ask`                  | Corpus-wide and scoped anonymous Ask               |
| `/coverage`             | Public body and source health                      |
| `/coverage/request`     | Record demand for a new place                      |
| `/following`            | Follows, saved interests, and preferences          |
| `/email/manage/$token`  | Scoped email-only subscription management          |
| `/how-it-works`         | Method, neutrality, revision, and reporting policy |

Stable routes such as home, How it works, and coverage should be prerendered when
possible. Direct refreshes to dynamic routes must be tested on the final
`convex.site` host.

### Route Pattern

Keep route files small:

```text
src/routes/issues_.tsx
src/routes/issues.$issueSlug.tsx
src/features/discovery/home.tsx
src/features/evidence/issue-page.tsx
src/features/chat/
src/features/follows/
src/lib/convex/
src/lib/auth/
```

Each `.data.ts` module owns route query options, preloading, and the transition
from prefetched data to live Convex updates. Presentational components do not
know source-registry or pipeline internals.

### Social Sharing

Static SPA output cannot generate per-issue Open Graph metadata at request time.
Use an app-owned Convex HTTP route such as `/share/issues/:slug`. It returns
small HTML with factual metadata from the published issue projection and a link
to the canonical `/issues/:slug` route. It never reads raw pipeline data or asks
a model to create new share copy.

Register the static-hosting fallback after the app-owned route. Smoke-test the
preview and destination on Facebook, LinkedIn, X, direct browser navigation, and
the deployed host.

## Convex Backend Organization

Organize functions by domain instead of by page:

```text
convex/
  auth.ts
  auth.config.ts
  convex.config.ts
  crons.ts
  http.ts
  schema.ts
  coverage/
  sources/
  pipeline/
  meetings/
  decisions/
  issues/
  importance/
  publication/
  chat/
  follows/
  notifications/
  operations/
```

Rules:

- Public queries expose published projections, not raw pipeline objects.
- Mutations authorize writes centrally.
- Internal queries and mutations move pipeline state.
- Actions perform Firecrawl, Convex AI Gateway, OpenAI, and AgentMail side
  effects.
- `http.ts` only routes webhooks, auth, share pages, health endpoints, and
  tightly bounded public endpoints.
- Schedules and crons enqueue idempotent work. They do not perform one giant
  crawl-and-publish transaction.

## Source Registry

A registry record describes what Public Parish believes it should monitor:

```ts
type SourceRegistry = {
  jurisdictionId: Id<'jurisdictions'>
  governmentBodyId: Id<'governmentBodies'>
  officialDomains: string[]
  seedUrls: string[]
  expectedSourceKinds: SourceKind[]
  expectedCadence: {
    kind: 'daily' | 'weekly' | 'monthly' | 'meeting_cycle' | 'unknown'
    expectedWeekdays?: number[]
  }
  discoveryMode: 'dynamic' | 'adapter'
  status: 'candidate' | 'validating' | 'supported' | 'degraded' | 'paused'
  lastDiscoveryAt?: number
  lastHealthyAt?: number
}
```

Official-domain checks include allowed subdomains and explicit cross-domain
document hosts. A newly discovered domain is quarantined until validated.

## Dynamic Coverage Compiler

The coverage compiler is an owner-triggered internal pipeline:

1. Accept a jurisdiction name and official homepage candidate.
2. Verify that the root belongs to a government entity.
3. Use Firecrawl map and search to enumerate likely agenda, minutes, ordinance,
   public-notice, planning, zoning, and calendar sources.
4. Use an OpenAI discovery pass to classify candidates into the source contract.
5. Retrieve a representative set for each body and source kind.
6. Parse the set through the normal extraction pipeline.
7. Run deterministic domain, link, date, citation, and coverage checks.
8. Record a proposed source registry.
9. Mark the place supported only after it passes the public coverage gate.

The public coverage-request form records demand, an optional official homepage,
and an optional notification subscriber. It never starts this pipeline. The
operations view can show live Convex progress for selected compiler runs. This
keeps the dynamic onboarding proof without accepting arbitrary public crawl and
model jobs.

The autonomous pass is appropriate for initial onboarding, site redesigns, and
repair. Routine checks use the registry, Firecrawl change tracking, targeted
scrapes, PDF parsing, and known schedules.

If a portal fails repeatedly, record the failure and add the smallest
source-specific adapter that restores the shared output contract. Do not create
an adapter merely because a portal looks unfamiliar.

## Ingestion Pipeline

Every stage is separately retryable and idempotent.

| Stage    | Input                                    | Output                                        |
| -------- | ---------------------------------------- | --------------------------------------------- |
| Discover | source registry and last discovery state | candidate artifact URLs                       |
| Retrieve | candidate URL and retrieval policy       | immutable source snapshot                     |
| Classify | snapshot text and metadata               | source kind, body, meeting, document metadata |
| Extract  | snapshot plus strict schema              | granular decision candidates and citations    |
| Validate | extraction plus snapshot                 | deterministic pass/fail findings              |
| Review   | validated candidate plus cited excerpts  | independent structured verdict                |
| Finalize | review and deterministic checks          | full, limited, or withheld publication        |
| Link     | published atomic records                 | supported issue relationships                 |
| Rank     | cited consequence factors                | deterministic importance score                |
| Publish  | accepted records and issue graph         | versioned public projection                   |
| Monitor  | new snapshot or expected schedule        | material change or coverage incident          |
| Notify   | material published change and follows    | AgentMail delivery jobs                       |

### Idempotency Key

Each stage uses:

```text
stage name
+ input content hash
+ processor version
+ prompt version when applicable
+ output schema version
```

The same key returns the existing successful output. A changed source,
validator, prompt, schema, or processor creates a new run without overwriting
the previous result.

### Stage State

`queued -> running -> succeeded | failed_retryable | failed_terminal | superseded`

Retries use bounded exponential backoff and an attempt ceiling. A terminal
failure produces a coverage incident. It never silently promotes stale or
partially validated data.

## Immutable Source Ledger

Every retrieved artifact records:

- canonical source URL;
- exact retrieved URL after redirects;
- official body and registry;
- retrieval time;
- MIME type;
- raw or original artifact hash used for immutable version identity;
- normalized-content hash used by extraction and material-diff processing;
- Firecrawl request metadata;
- raw or original file in Convex storage when available;
- normalized text used by the model;
- page boundaries for PDFs;
- truncation or OCR flags;
- previous snapshot;
- processing history.

Firecrawl component results that are truncated or too large for a normal
document field must be persisted through file storage or retrieved in bounded
parts. The pipeline cannot publish from an unknowingly truncated artifact.

Snapshots are immutable. Version identity is scoped to the registry and the
canonical source URL. A new raw or original artifact hash creates a new version
in that source's chain and a material-diff check. A matching normalized-content
hash can suppress downstream formatting noise, but it never replaces the raw
artifact record. Old citations keep resolving to the version on which the
published claim was based. Normal retrieval accepts a redirected result only
when its final URL remains inside the registry's approved official domains and
its target HTTP status is successful.

PDF retrieval brackets a forced fresh Firecrawl extraction with two downloads
of the official file. The action commits only when both raw SHA-256 hashes,
resolved URLs, and PDF content types agree. A change during that interval marks
the run retryable and creates no snapshot. This uses two Firecrawl scrapes for
each PDF so the normalized text and immutable raw file come from one stable
source version.

The processor fails closed when Firecrawl omits the content type or reports a
type outside HTML, XHTML, and PDF. Direct PDF downloads must contain a `%PDF-`
signature within their first 1,024 bytes. Missing metadata and mislabeled files
never become source snapshots.

## Core Data Model

The schema through Slice 3 implements `jurisdictions`, `governmentBodies`,
`sourceRegistries`, `sourceSnapshots`, `pipelineRuns`, `pipelineStages`, the
private extraction evidence, independent reviews, stable decision records,
immutable publication versions, and publication citations described below.
Coverage expectations, incidents, meetings, issues, chat, auth-linked resident
data, and notifications remain planned.

### Coverage

#### `jurisdictions`

Fields: name, slug, type, state, parent jurisdiction, public status, quality-gate
time.
Indexes: slug; state plus public status.

#### `governmentBodies`

Fields: jurisdiction, name, slug, body type, official URL, public status.
Indexes: jurisdiction plus status; jurisdiction plus slug.

#### `sourceRegistries`

Fields: body, official domains, seed URLs, source kinds, cadence, discovery mode,
status, last discovery, last healthy time.
Indexes: body plus status; next scheduled check.

#### `sourceExpectations`

Fields: registry, expected artifact kind, date window, expected-by time, result,
matched snapshot.
Indexes: expected-by plus result; registry plus date window.

#### `coverageIncidents`

Fields: registry or body, incident type, first seen, last seen, attempts,
severity, public-safe summary, state.
Indexes: state plus severity; body plus state.

#### `coverageRequests`

Fields: normalized jurisdiction text, optional official homepage candidate,
optional verified email subscriber, anonymous-session dedupe reference, and
created time.
Indexes: normalized jurisdiction text plus created time; email subscriber plus
normalized jurisdiction text. The mutation deduplicates a request from the same
session or subscriber. Submissions only record demand. They never enqueue
compiler work.

### Evidence and Processing

#### `sourceSnapshots`

Fields: registry, canonical URL, retrieved URL, raw artifact hash, normalized
content hash, retrieval time, content type, storage IDs, normalized text
metadata, page map, truncation flags, previous snapshot.
Indexes: registry plus retrieval time; registry plus canonical URL plus
retrieval time; registry plus canonical URL plus raw artifact hash. The
retrieval mutation enforces deduplication for the same source and raw artifact
hash.

#### `pipelineRuns`

Fields: trigger, registry, snapshot, run state, created time, completed time,
processor bundle version.
Indexes: state plus created time; registry plus created time.

#### `pipelineStages`

Fields: run, stage, idempotency key, state, attempt, input references, output
reference, error class, retry time, timing, token and vendor cost metadata.
Indexes: idempotency key; state plus retry time; run plus stage.

#### `aiCalls`

Fields: run and stage, optional extraction, review, or issue build, route, model role and ID,
prompt and schema versions, attempt, status, HTTP evidence, latency, request ID,
token usage, estimated cost, retry evidence, error class, and created time.
Indexes: run plus created time; extraction; review.

#### `extractions`

Fields: run, registry, snapshot, source kind, target record, prompt, schema and
processor versions, model evidence, state, failure evidence, raw response
storage, response hash and size, candidate, and created time.
Indexes: run; snapshot plus created time.

#### `decisionCandidates`, `candidateFacts`, and `validationFindings`

Candidates store the private structured decision and validation state. Facts
bind one material JSON Pointer path and value to an exact snapshot excerpt,
with page or section evidence when verifiable. Findings record every
deterministic rejection by run, extraction, candidate, path, and code. These
tables remain private publication inputs.

#### `reviews`

Fields: exact run, stage, candidate, extraction, registry, snapshot, input hash,
reviewer role and model, route, processor, prompt and schema versions, verdict,
raw response evidence, failure evidence, and created time. Separate check rows
bind every judgment to one candidate fact. Finding rows record info, limited,
or fail severity.
Indexes: run; candidate plus created time; input hash; checks by review and
field path; findings by review.

#### `citations`

Fields: publication version, candidate fact, field path, source snapshot,
official URL, exact excerpt, PDF page or section, normalized offsets, and
retrieval time.
Indexes: publication version plus field path; source snapshot.

#### `sourceSnapshotChanges` and `materialChanges`

Source changes bind the previous and current immutable snapshots and distinguish
raw-only changes, normalized changes, hash-basis migrations, and unusable
predecessors. Material changes compare consecutive accepted publication
versions. They store a bounded list of changed field paths and old and new JSON
values, plus a deterministic classification such as decided, postponed,
amended, amount changed, date changed, information limited, or information
expanded. Withheld publication versions do not create material changes.

### Government Records

#### `meetings`

Fields: body, title, scheduled time, location text, status, agenda snapshot,
minutes snapshot, official video URL, publication state.
Indexes: body plus scheduled time; publication state plus scheduled time.

#### `decisionRecords`

Fields: stable record key, registry, government body, source record ID, current
published version, current mode, and creation and update times. Issue links
refer to these records without replacing them.
Indexes: stable record key; current mode plus update time; government body plus
current mode plus update time; current meeting key; registry plus source record
ID.

#### `issueBuilds`, `issueBuildReviews`, and `issueBuildReviewChecks`

Issue builds bind two to ten atomic records, their exact current publication
versions, the prompt and schema versions, raw model evidence, proposed issue
facts, review, deterministic result, and output version. Reviews use a separate
model and keep one supported, unclear, or unsupported check per issue fact.
Indexes cover the idempotency key, run, issue key, review input hash, and check
field path.

#### `issues` and `issueVersions`

An issue stores a stable issue key, slug, government body, and current accepted
version pointer. Slice 4 computes the key from the exact sorted atomic record
keys. Membership is frozen for that key. Adding or removing a record creates a
new issue rather than extending the old one. Slice 5 must define supersession or
redirect behavior before exposing overlapping issue routes. Immutable versions
store the build, monotonic version, full, limited, or withheld mode, reason,
payload hash, score summary, lifecycle, title, summary, and topics. Withheld
versions have no public payload and do not move the accepted pointer.
Indexes: issue key; slug; issue plus version; build.

#### `issueDecisionLinks`

Fields: issue version, atomic decision, exact publication version, relationship
type, cited reason, linker version, and creation time.
Indexes: issue version; decision plus creation time.

#### `importanceAssessments`

Fields: issue version, factor, accepted level, deterministic points, maximum
points, cited rationale, citation IDs, rubric version, and creation time.
Indexes: issue version plus factor; issue plus creation time.

#### `publicationVersions`

Fields: decision record, run, candidate, review, source snapshot, monotonic
version, full or limited or withheld mode, deterministic reason, policy and
payload versions, hashed structured payload, and created time.
Indexes: run; decision record plus version; candidate.

### Resident Product

#### `analyticsSubjects`, `analyticsEvents`, and `analyticsCounters`

The production client creates a random local browser identifier and sends only
its SHA-256 hash. Subject rows deduplicate unique browsers, 30-minute visits,
first area selection, and a return at least 24 hours after first use. Events are
an append-only union of `app_visit` and `area_selected`; no generic event name
or property bag exists. The area value is one fixed supported slug.

The same mutation writes the subject, event, and one production counter row, so
the owner report reads exact totals without scanning a growing table. The
report remains an internal function invoked through the authenticated Convex
CLI. Identifiers and event rows expire after 90 days through a bounded daily
cleanup. Aggregate counters retain no resident identifier. A browser that
returns after 90 inactive days can increment the cumulative visitor total
again. Development, unrecognized hosts, browsers that identify as automated,
and opted-out founder devices do not send telemetry. These counts measure
browsers and product actions, not proven people or residency.

The client posts to `/api/analytics` on its current origin. The HTTP action
rejects any origin other than the canonical domain and production
`convex.site` host, rejects payloads over 512 bytes or outside the exact event
union, then calls internal mutations. `@convex-dev/rate-limiter` enforces 12
requests per browser per minute, 120 requests across the app per minute, and
5,000 requests across the app per day. These controls bound casual abuse and
storage growth. A non-browser client can spoof an Origin header, so the numbers
remain unauthenticated telemetry rather than fraud-proof identity evidence.
The client must read back a newly written browser identifier before sending an
event. A browser that cannot persist that value sends no telemetry, which
prevents reloads from creating a series of false unique visitors.

Before using a production browser for internal checks, set
`public-parish.analytics.optout.v1` to `true` in that origin's local storage.
The opt-out prevents future writes from that browser. It does not rewrite
already recorded aggregate counters.

#### `anonymousSessions`

Fields: opaque session hash, state, created time, expires time, last-seen time.
Indexes: opaque hash; state plus expires time.

#### `askThreadAccess`

Fields: anonymous session, Agent thread reference, issue or meeting or corpus
scope, created time, last activity time, expiry, detached time.
Indexes: session plus activity; session plus thread; thread.

#### `askAnswerReceipts` and `askModelAttempts`

Answer receipts claim one saved user message at a time and record running,
succeeded, or failed state without copying its content. A running receipt
fences retries and prevents another answer from running for the same session.
Model attempts belong to a receipt and store the private route, model role,
model ID, prompt and schema versions, token use, latency, estimated cost, and
bounded safe failure metadata. They do not store resident questions or
answers.

#### `askTokenWindows`

Fields: anonymous session, short or daily window, window start, reserved
tokens, consumed tokens, and updated time. Index: session, kind, and window
start. These rows are now a usage ledger, not an admission gate. A completed or
failed provider attempt records known token use. Unknown or abandoned work
records zero rather than an invented reservation. The rate-limiter component
caps three answer attempts per minute and 20 per day for each anonymous session.
App-wide request ceilings of 60 per minute and 1,000 per day prevent session
rotation from creating unlimited model calls. There is no application-owned
input, output, per-session, or app-wide token ceiling for Ask.

#### Agent component threads and messages

`@convex-dev/agent` owns durable thread and message storage. Public Parish maps
each thread to an anonymous session and scope, authorizes access before every
component operation, and supplies its own accepted evidence context. The Agent
uses `MODEL_FAST` at high reasoning through `convexGateway` and Convex AI
Gateway. The first internal call receives the complete current issue, meeting,
and decision catalog for the thread scope, every accepted citation excerpt, and
the full prior conversation. It returns strict issue, meeting, or decision IDs
without writing a resident-visible message. Deterministic code expands issue
and meeting targets into decision records and deduplicates their documents. The
second internal call receives the selected records, accepted excerpts, full
prior conversation, and normalized official documents. The action verifies
each document's stored hash and byte count before adding its full text. Invalid,
broad, and empty selector results use the complete scope. A valid not-found
result skips the second model call and stores the standard evidence-not-found
answer. The service rejects an oversized scope before a model call instead of
truncating records, excerpts, or documents. There is no lexical, embedding, or
fixed top-k gate. Do not create parallel application message tables.
Deterministic code validates every returned evidence reference before the
answer becomes visible.

#### `emailSubscribers`

Fields: normalized delivery-address hash, encrypted or provider-owned delivery
reference, verification state, verified time, AgentMail thread reference, and
unsubscribe token hash.
Indexes: delivery-address hash; verification state plus created time.

#### `emailVerificationChallenges`

Fields: subscriber, code hash, purpose, expiry, attempt count, consumed time, and
created time.
Indexes: subscriber plus purpose; expiry. Challenges are short-lived and never
store the plain verification code.

#### `follows`

Fields: owner kind, Google-authenticated user or verified email subscriber,
target type and ID, created time. Exactly one owner reference is present.
Indexes: user plus target; email subscriber plus target; target plus owner kind.

#### `notificationPreferences`

Fields: owner kind and reference, immediate material changes, weekly roundup,
quiet preferences, verified delivery destination reference.
Indexes: user; email subscriber.

#### `notifications`

Fields: owner kind and reference, material change, dedupe key, AgentMail thread
and delivery state, created time, sent time.
Indexes: dedupe key; delivery state plus created time; user plus created time;
email subscriber plus created time.

Google-authenticated users should use the Convex Auth v2 alpha data model rather
than a parallel password system. Email subscribers are scoped delivery records,
not users and not authenticated sessions.

Do not add dedicated FAQ or correction-challenge tables during the hackathon.
The source-problem link opens a private AgentMail thread with the target record
URL. It does not create a public workflow or launch reprocessing.

## Extraction Contract

The exact JSON schema will be versioned in code. Its core shape is:

```ts
type DecisionCandidate = {
  sourceRecordId: string | null
  recordType:
    | 'proposal'
    | 'hearing'
    | 'vote'
    | 'contract'
    | 'appointment'
    | 'public_action'
    | 'other'
  title: string
  bodyName: string
  meetingAt: string | null
  lifecycleState:
    | 'discovered'
    | 'proposed'
    | 'scheduled'
    | 'amended'
    | 'postponed'
    | 'decided'
    | 'implementing'
    | 'completed'
    | 'canceled'
    | 'unknown'
  plainLanguageSummary: string
  affectedPlaces: string[]
  amounts: Array<{ value: number; currency: 'USD'; context: string }>
  publicActions: Array<{
    type: 'attend' | 'comment' | 'contact' | 'apply' | 'other'
    deadline: string | null
    instructions: string
  }>
  facts: Array<{
    fieldPath: string
    value: string
    citation: {
      sourceSnapshotId: string
      excerpt: string
      page: number | null
      section: string | null
    }
  }>
}
```

Strict output means:

- no additional properties;
- missing facts use explicit nulls or empty arrays;
- a model cannot emit a material field without a citation;
- the application rejects schema-invalid output;
- the application verifies excerpts against normalized source text;
- dates and amounts are parsed and range-checked by deterministic code;
- prompt, model, schema, and processor versions are stored.

### Implemented Slice 2 path

The current contract is schema v1, prompt v1.2, and processor v1.4. The action
sends the static system prompt first, treats source text as untrusted data, uses
high reasoning with `store: false`, and requires strict Chat Completions
Structured Outputs. Convex AI Gateway is the normal route. Direct OpenAI stays
behind the same provider interface and is disabled unless an operator enables
the documented fallback flag.

Deterministic validation rechecks snapshot identity, hash basis, stored hash and
size, truncation, approved domains, target record, body, citations, material
paths and values, dates, amounts, and agenda-versus-outcome rules. An excerpt
must occur in the immutable normalized source. A page is accepted only when a
page map proves it. Dates without a stated time require exact midnight. A
passing candidate becomes `deterministically_validated`, which means ready for
independent review, not published.

## OpenAI plan

Use [Convex AI Gateway](https://docs.convex.dev/ai-gateway/overview) as the
primary route from Convex actions to OpenAI. The gateway mints deployment-scoped
credentials, attributes spending to the calling project and function, and
removes the application-level OpenAI key.

The gateway requires a paid Convex team. The project team is on Professional at
$25 per developer per month, which qualifies; the gate is paid versus free, and
there is no separate AI Gateway tier. The gateway currently exposes
[Chat Completions](https://docs.convex.dev/ai-gateway/api). It forwards
`response_format`, so publication calls can use strict JSON Schema Structured
Outputs. The GPT-5.6 tiers support Chat Completions, Structured Outputs, and
selectable reasoning effort.

### Model roles

Refer to models by role everywhere except this table. This is the only place
that names a gateway model ID, so a tier change is a one-line edit.

| Role           | Gateway model ID       | List price per 1M input / output |
| -------------- | ---------------------- | -------------------------------- |
| `MODEL_STRONG` | `openai/gpt-5.6-terra` | $2.00 / $12.00                   |
| `MODEL_FAST`   | `openai/gpt-5.6-luna`  | $0.20 / $1.20                    |

There is no third tier. Two roles cover the whole pipeline, and a stage that
cannot pass its gate at `MODEL_STRONG` is a prompt, schema, or excerpt-window
problem to fix, not a stage to buy a larger model for.

### Stage assignment

| Stage                                       | Executor           | Reasoning | Why                                                                               |
| ------------------------------------------- | ------------------ | --------- | --------------------------------------------------------------------------------- |
| Source discovery and document-type routing  | `MODEL_FAST`       | low       | Real classification over short inputs, and the highest call volume in the system  |
| Record extraction and citation grounding    | `MODEL_STRONG`     | high      | Generative, long OCR-quality input, and the origin of every published claim       |
| Consequence factors and issue-link proposal | `MODEL_STRONG`     | high      | Both jobs must stay inside cited evidence and affect multiple public views        |
| Independent publication and issue review    | `MODEL_FAST`       | high      | Verification over cited facts after deterministic source checks have run          |
| Importance score and ordering               | Deterministic code | not used  | Fixed weights make the same accepted factors produce the same score               |
| Resident chat selector and answer           | `MODEL_FAST`       | high      | It selects from the full accepted catalog, then reasons over the chosen documents |

The strong tier sits on generation rather than on review because the two jobs
fail differently. Extraction originates the record, and a reviewer can reject a
bad extraction but cannot produce the right one, so a weak extractor does not
publish wrong claims; it publishes nothing and coverage collapses. Review is
verification over a small input, and its highest-severity failure class, a
citation that does not resolve to the snapshot, is already caught by
deterministic validation with no model involved. What remains for the reviewer
is narrower support judgment that the fast tier can carry.

Every stage that can produce or clear a published claim runs at high reasoning.
On review this is close to free: reasoning tokens bill as output at $1.20 per 1M
and the reviewer reads the candidate record and its cited spans rather than the
source packet, so the effort costs a fraction of a cent.

On extraction it is the largest single cost lever in the system. Reasoning
tokens bill as output at $12.00 per 1M on `MODEL_STRONG`, and a high-effort pass
over a full packet can spend several times the answer's own token count, so
expect roughly double the per-document cost of a medium-effort pass. That is
accepted deliberately: extraction is the stage where an error becomes a cited
claim in front of a resident, and there is no larger tier behind it.

Extraction and the Ask answer pass are where input volume concentrates because
they read official documents. Cache the fixed extraction system prompt and
schema, where cached input on `MODEL_STRONG` is $0.20 per 1M against $2.00
fresh. Extraction may use excerpt windows where document structure allows it.

Ask places the stable scoped catalog and accepted excerpts before the prior
thread and current question in the selector prompt. This keeps the reusable
prefix identical while the published scope is unchanged. The answer prompt
uses the same ordering for the selected evidence and documents.

### Before locking the split

1. confirm `getServiceToken("ai-gateway")` works on the selected paid Convex
   team;
2. confirm each role's model ID appears in `GET /v1/models` on the gateway;
3. set a team spending limit;
4. create a labeled set across every planned portal and document type;
5. score field accuracy, citation resolution, abstention, date and amount
   correctness, issue linking, latency, and cost;
6. downgrade a `MODEL_STRONG` stage to `MODEL_FAST` only when the labeled set
   shows the fast tier matching it on that stage;
7. retain deterministic checks regardless of model quality.

The only sanctioned direction of change is downgrade. Start each stage at the
tier that is clearly sufficient and earn the cost reduction with benchmark
evidence, because an extraction error that no one notices reaches a resident as
a cited claim. When a stage still misses its gate at `MODEL_STRONG` and high
reasoning, revise the prompt and schema, tighten the excerpt window, or split
the document. If it continues to miss, that stage withholds or produces a
limited source-only card. It does not guess, and it does not reach for a bigger
model.

Put gateway and direct OpenAI implementations behind one internal provider
interface. Direct OpenAI is an operational fallback for
`AiGatewayDisabled`, `AiGatewayUnavailable`, or a documented gateway outage. It
uses the same schemas, prompts, tests, and telemetry. The provider adapter maps
each role's gateway model ID to the direct OpenAI ID without
the `openai/` prefix. The submitted application should exercise the gateway,
and the demo should make that path visible.

For each call:

- send only the needed snapshot excerpts and public metadata;
- use strict `response_format` JSON schemas for structured stages;
- keep conversation state in Convex;
- use an opaque hashed session or user reference in safe request metadata;
- never send secrets, private email metadata, or unrelated user data;
- store structured output, usage, latency, gateway route, model ID, reasoning
  setting, and prompt version;
- never store or request hidden chain-of-thought;
- do not enable OpenAI web search for civic facts.

The independent reviewer runs on `MODEL_FAST` and receives the evidence and the
`MODEL_STRONG` candidate output, not a claim that the first model was correct.
It returns pass, limited, or fail plus structured findings. The final
deterministic policy owns publication. The reviewer always runs on a different
model than the extractor, because a model reviewing its own output shares its
blind spots and will wave through the errors it is most prone to make.

## Citation Validation

A citation passes only when:

- the snapshot exists and hash matches;
- the cited page or section exists;
- the normalized excerpt appears in the snapshot within a bounded fuzzy
  tolerance for OCR;
- the excerpt supports the exact field path;
- the URL belongs to the approved official registry;
- the citation points to the current or intentionally historical source version.

The final support check for “supports the exact field” can use the independent
reviewer, but deterministic checks still verify source, location, and excerpt.

## Issue Linking

Linking uses multiple signals:

- official matter, ordinance, resolution, case, parcel, or project identifiers;
- named counterparties;
- projects and transactions;
- locations;
- explicit cross-references in the source.

OpenAI proposes links with cited reasons. Deterministic policy requires one
link per input record and at least one concrete shared signal whose exact value
appears in cited evidence for every record. Each link reason cites its own
record and at least one other record. Similar titles, the government body's own
name, and its home jurisdiction fail the contract. Failed builds may retry the
same deterministic input. Active and successful builds still replay without a
second model call. Ambiguous records stay atomic and searchable.

## Importance Ranking

OpenAI extracts cited factor levels. Code computes the result.

| Factor            | Maximum points |
| ----------------- | -------------: |
| Public money      |             20 |
| Public assets     |             20 |
| Land use          |             15 |
| Health and safety |             15 |
| Rights and access |             10 |
| Service delivery  |             10 |
| Public deadline   |             10 |

Each factor must be absent or carry a citation and a short evidence-based reason.
The reason must state a documented consequence, not repeat the subject. Low is
25 percent of the factor maximum rounded up, moderate is 50 percent rounded up,
and high receives the maximum. Unsupported factors receive zero without
reducing another accepted factor. Completeness is the percentage of factors
with accepted evidence and never multiplies the score down. A cited public
deadline within seven days sets a separate hard trigger without adding points.

The user-facing "Why this may matter" text is generated from the accepted factor
record. Popularity, clicks, partisan valence, and social engagement do not
affect ranking.

## Anonymous Chat

### Retrieval

1. Resolve the issue, meeting, jurisdiction, or corpus scope from the thread.
2. Load every current full or limited decision publication in that scope.
3. Give high-reasoning Luna the complete issue, meeting, and decision catalog,
   every accepted citation excerpt, the prior thread, and the new question.
4. Require strict issue, meeting, or decision targets. Expand issue and meeting
   targets deterministically into current decision records. A broad,
   not-found, empty, or invalid selection expands to the whole scope.
5. Load and hash-check the normalized official documents for the selected
   records.
6. Ask a second high-reasoning Luna call on the same private thread for an
   answer whose factual claims cite the selected accepted evidence IDs.
7. Verify every returned citation ID against the selected current evidence
   before display. The answer model may still return not found.
8. Return not found without a model call only when the published scope itself
   is empty.

### Continuity

- Create an opaque same-device session.
- Retain conversation access for 24 hours.
- Store the opaque token in a secure browser mechanism appropriate for the
  deployed origin.
- Expire or detach anonymous conversation access after the window.
- Never use a fingerprint as identity.

### Abuse control

- rate-limit answer attempts by opaque session;
- allow three answer attempts per minute and 20 per day for each session;
- allow 60 answer attempts per minute and 1,000 per day across the app;
- record known provider tokens and estimated cost as private telemetry;
- do not reject a question because of an application-owned input, output,
  per-session, or app-wide token budget;
- keep normal limits invisible;
- return a cooldown at the request-frequency threshold;
- keep the CAPTCHA adapter inactive until observed abuse justifies it;
- block prompt attempts to escape the validated corpus;
- log safe error and cost metadata, not private content in public operations.

## Auth and authorization

Build order:

1. public reading;
2. anonymous chat;
3. pin and install Convex Auth v2 alpha;
4. Google OAuth;
5. account-managed follows;
6. AgentMail-verified email-only subscriptions.

Use Convex Auth v2 alpha despite its changing APIs because the hackathon asks
builders to test it. Pin the exact installed version and isolate product code
behind a small auth module. Do not combine v1 and v2. Do not build custom email
account authentication.

Google OAuth is the account path. Reading and chat remain unauthenticated. A
resident who only wants alerts can verify an email subscription through
AgentMail. That flow grants access only to the matching subscription and does
not create a user session. Passkeys remain an optional fallback only if testing
shows that Google sign-in blocks adoption.

Authorization rules:

- public users read only published projections;
- anonymous sessions can create bounded chat messages and coverage requests;
- Google-authenticated users manage only their own saved areas, follows,
  and preferences;
- verified email subscribers manage only their own subscriptions through a
  short-lived code or secure management token;
- internal pipeline functions are never client-callable;
- webhook routes verify provider signatures;
- operations views require an owner role.

## AgentMail workflow

For an email-only subscription:

1. create a pending subscriber and short-lived hashed verification challenge;
2. send the code or confirmation request through AgentMail;
3. enforce expiry, attempt limits, and single use;
4. mark the delivery reference verified without creating an authenticated user;
5. create the requested follow;
6. include a secure unsubscribe or management path in every message.

On a material publication change:

1. compute a stable dedupe key from owner, followed target, and publication
   version;
2. create a notification record;
3. send through AgentMail in a Convex action;
4. persist thread and delivery state;
5. retry safely without duplicate sends.

For the optional weekly roundup, a scheduled internal function groups material
publication changes for each subscriber's followed targets since the last
successful roundup. It sends one sourced message only when at least one change
exists. The subscriber and roundup window form the dedupe key.

The message includes the change, why it matters, official source links, and a
path back to Public Parish. A reply stays in the same thread and runs through the
same grounded answer path. If evidence does not answer it, the email says so and
provides the official contact. It never forwards automatically to an agency.

A separate AgentMail address accepts private source-problem reports. The report
includes the public record URL and the resident's description. It does not
automatically run Firecrawl, OpenAI, or publication functions. The owner decides
whether to start the normal evidence pipeline.

## Realtime Demonstration

The clearest Convex proof is:

1. a new official source version is ingested;
2. the pipeline publishes a material issue update;
3. an open issue page changes without a refresh;
4. coverage and processing state change live;
5. a follower's notification record appears and AgentMail sends the update.

Use real current records in production. Use a clearly labeled replay or
pre-captured source revision for a deterministic judge demo if live government
timing cannot be controlled.

## HTTP and Hosting Routes

The proposed app-owned root router needs:

- Convex Auth v2 alpha core and Google OAuth routes;
- Firecrawl webhook route;
- AgentMail inbound webhook route;
- email-subscription verification and management routes;
- dynamic `/share/*` Open Graph HTML;
- health or provider verification endpoints where required;
- static-hosting fallback last.

Keep `@convex-dev/static-hosting` unmounted (`app.use(staticHosting)` with no
`httpPrefix`) and register exact app routes in `convex/http.ts` before
`registerStaticRoutes`. Do not copy the package default that moves app HTTP
under `/api` and gives the component `/`. Exact provider paths come from the
installed component documentation. Do not invent or hard-code them from this
plan. Test route precedence after the component is registered.

## Reliability and Operations

Track:

- last successful check by registry;
- expected versus found artifacts;
- source hash and material changes;
- crawl and retrieval failures;
- truncation and OCR status;
- stage retries and terminal failures;
- extraction and review disagreement;
- citation-validation failures;
- publication mode counts;
- model tokens, Firecrawl use, AgentMail sends, and estimated cost;
- notification delivery and deduplication;
- user-facing freshness.

A brief vendor outage retries in the background. Persistent failure marks the
body degraded, changes the public coverage page, and alerts the owner. Stale
data remains dated and visible, never silently current.

## Privacy and Security

- Collect no exact residential address.
- Keep routine chat and email private.
- Store the minimum email/auth state required for service.
- Separate public civic evidence from private user data in queries and schemas.
- Verify webhook signatures and reject replays.
- Sanitize rendered source text and generated HTML.
- Treat scraped pages and resident questions as untrusted prompt input.
- Never let source text select tools, domains, or publication policy.
- Allow retrieval only from registered official domains during normal runs.
- Apply least privilege to actions and environment variables.
- Never place keys or live user data in `hackathon.md`, logs, fixtures, or demo
  recordings.

## Testing Strategy

### Unit

- URL and official-domain normalization
- hash and source-version behavior
- date, amount, and lifecycle parsing
- citation excerpt resolution
- importance score
- notification dedupe
- publication policy
- anonymous-session expiry

### Contract

- Convex AI Gateway token, model, `response_format`, usage, and error behavior
- strict `MODEL_STRONG` extraction and `MODEL_FAST` review schemas
- direct OpenAI fallback parity without using it in the normal demo path
- Firecrawl component outputs and truncation handling
- AgentMail verification, inbound, thread, retry, and dedupe behavior
- Convex Auth v2 alpha Google OAuth and authorization
- static-host route precedence

### Gold Set

Use representative agendas, minutes, amendments, ordinances or resolutions, and
planning cases from every planned body. Hand-label expected artifact discovery,
decision fields, citations, dates, amounts, and lifecycle changes.

The pipeline gate is:

- every known gold-set artifact is discovered;
- every accepted material field has a resolving citation;
- no unsupported name, date, vote, amount, or deadline is published;
- a changed source produces a new version;
- a failed source becomes limited or withheld;
- every public “supported” body passes the same tests.

### End to End

- choose a place and topic;
- discover and open an issue;
- inspect citations;
- ask anonymous multi-turn questions;
- sign in with Google through Convex Auth v2 alpha;
- follow an issue through an account;
- create and verify an email-only follow through AgentMail;
- ingest a material source revision;
- see the page update live;
- receive and reply to AgentMail;
- receive a deduplicated weekly roundup containing only material changes;
- open an issue through its share URL and verify its Open Graph metadata;
- submit a coverage request without starting compiler work;
- open the private source-problem reporting path;
- inspect coverage degradation;
- refresh every dynamic route on the deployed `convex.site` URL.

## Cost Controls

The event does not provide OpenAI or Convex credits. Before broad crawling:

- confirm that hackathon registration has provisioned the Firecrawl credits;
- confirm each role's model ID resolves on the gateway and set the Convex
  spending limit;
- cap crawl depth and retain source hashes;
- reprocess only changed snapshots;
- send excerpt windows instead of entire packets when possible;
- cache successful idempotent stage outputs;
- keep `MODEL_FAST` on every stage whose benchmark it passes, and spend
  `MODEL_STRONG` only on extraction, consequence factors, and linking;
- cache the fixed extraction system prompt and schema;
- enforce per-session chat budgets;
- record cost by stage and region;
- set an owner-visible daily spend ceiling.

## Implementation Slices

The PR-sized execution order for Slices 6 through 9 lives in
[`post-slice-5-pr-plan.md`](./post-slice-5-pr-plan.md). Each packet owns one
resident or operator outcome, its data boundary, negative tests, and production
proof. The packet split does not change the architecture or product scope below.

1. One Lafayette source becomes an immutable Convex snapshot.
2. One snapshot becomes a strict, cited atomic decision.
3. Validation plus independent review produces a versioned public projection.
4. A changed snapshot creates a material revision, and atomic decisions link
   into one issue timeline and importance record.
5. Design Slices 1 through 8 implement the complete resident interface with
   development-only typed fixtures. Accepted atomic records are live in
   discovery. Detail and action routes stay unavailable until their real
   adapters pass instead of presenting prototype success.
6. Anonymous chat answers only from the issue evidence.
7. Convex Auth v2 Google accounts, verified email-only follows, and AgentMail
   close the outcome loop.
8. The dynamic coverage compiler adds the rest of Lafayette, then Rapides and
   East Baton Rouge behind the same gate.
9. Public coverage, demand capture, per-issue share routes, and production
   hardening complete the submission.

Do not reverse this order to polish a dashboard before the evidence path works.
