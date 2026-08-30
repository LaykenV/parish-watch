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
- **AI models:** `openai/gpt-5.6-terra` for `MODEL_STRONG` extraction, consequence factors, and issue linking; `openai/gpt-5.6-luna` for `MODEL_FAST` independent review through Convex AI Gateway
- **Started:** 2026-08-27T04:38:41Z
- **Last updated:** 2026-08-30T05:14:49Z

## Log

### 2026-08-30 - working tree

Added a checked, metadata-only gold set for Lafayette City Council. It covers
four agendas, three corresponding minutes, one ordinance packet, lifecycle
changes, amounts, a public deadline, exact source excerpts, facts that must
remain unknown, expected record links, and a negative example. A narrow test
checks the manifest's domains, body labels, evidence, enums, references, and
required coverage shapes
(`docs/gold-sets/lafayette-city-council.v1.json`,
`scripts/gold-set-manifests.test.ts`).

Mapped Lafayette's separate planning and zoning bodies and their official
schedules. Broken agenda and result paths prevent a complete recent
meeting-cycle replay, so Public Parish will not onboard those bodies until each
one passes the same source and coverage checks as the City Council
(`docs/source-spikes/lafayette-planning-and-zoning-2026-08-29.md`).

Implemented resident-interface Design Slice 1 as labeled low-fidelity fixtures
for the approved route graph. Added thin TanStack Start routes, a shared
responsive shell with router-driven navigation and a fixed loading region,
typed page and state contracts, a standalone email-management frame, and a
route inventory check tied to the generated router types. The bottom navigation
remains available through 1024 pixels and becomes the desktop header at 1025
pixels. The mobile top bar now scrolls away while the safe-area-aware bottom
navigation stays fixed. The documented mobile contract adds written sheet
openers, grabbers after opening, medium and full heights, explicit dismissal,
native issue-rail snapping, browser-owned Back gestures, system sharing, and a
real-iPhone Safari review after every deployed design slice.

A controlled production run ingested the August 18 City Council minutes, the
September 1 agenda, and the 27-page CO-072 packet into three immutable source
snapshots. Firecrawl returned complete page counts and normalized text, but it
also attached an engine warning about unsupported `skipTlsVerification` to all
three PDFs. The ingest path conservatively marked every snapshot truncated.
Both approved CO-072 extraction starts then failed closed at the snapshot check
before Terra ran. Production still has no AI call, decision record, publication
version, or planning-body support.

The development backend now explicitly disables Firecrawl's unsupported PDF
TLS option. Re-ingesting the September 1 agenda produced the same source and
normalized-text hashes without a truncation warning. Retrieval now creates a
new immutable version when the raw artifact is unchanged but the prior
snapshot's normalized hash or truncation state differs. A clean replay after a
false truncation marker records the old version as an unusable predecessor. The
extraction contract accepts Lafayette's 549-character official
CO-072 caption, and citation matching joins a hyphenated PDF line break such as
`Sub-\nAward` before checking exact excerpts. Processor `v1.9` extracted CO-072
with Terra, then Luna independently supported all nine cited facts. Development
published a full record with the $3,982,500 amount and exact offsets into the
immutable agenda snapshot. Terra cost an estimated $0.024469 and Luna cost
$0.003019. Replaying the same extraction start returned the original run with
`reused: true`, so it made no second model call. These fixes are not deployed to
production.

Production extraction run `jd7exmg7z2m9p4m2n615vm1yyd8de9yq` sent the July
21 CO-062 agenda record to Terra successfully, then deterministic validation
failed closed on `/sourceRecordId`, `/title`, and `/plainLanguageSummary`.
Firecrawl preserved underline markup around `CO-062-2026`, while Terra returned
the same cited text without formatting tags. Citation normalization now ignores
only `<u>` tags, including underline tags with attributes, and preserves their
text. Extraction processor `v1.10` makes the corrected run distinct from the
failed attempt. A focused regression covers the exact council-agenda shape.
The hotfix is not deployed to production.

Extraction prompt `v1.4` and review prompt `v1` published the CO-062 source
and version history, but the August 4 minutes record exposed a lifecycle error.
Its cited text says the council approved a motion to defer indefinitely, while
publication version 3 labels the ordinance `decided` instead of `postponed`.
The July 21 introduction minutes used `decided` for an approved motion to
introduce, even though the ordinance remained proposed. The onboarding batch
stopped after CO-062, and no other decisions advanced. A new defense-in-depth
hotfix defines the underlying-item rule in extraction and independent review,
then rejects the two observed successful-motion mismatches deterministically.
No production correction is claimed.

The next controlled production extraction for the August 18 CO-069 minutes
failed closed after Terra returned its structured response. The `/title` fact's
citation exceeded the 600-character excerpt bound, even though Lafayette's
official item combines a long ordinance caption with the procedural clause in
one contiguous minutes span. The checked public-record shape is 664 characters.
The contract now permits at most 1,000 characters for any citation excerpt,
matching the existing bounded official-title limit, and processor `v1.11` keeps
the corrected attempt distinct from the failed run. A focused regression covers
the CO-069 shape and rejects a 1,001-character excerpt. No production retry or
publication is claimed.

Browser checks passed at 375, 768, 1024, 1025, and 1440 pixels without
horizontal overflow. A later computed-style check measured 125 pixels of
combined app chrome at 390 pixels wide, below the 8-rem budget, and confirmed
the sticky desktop header at 1280 pixels. `npm run verify` passed 136 tests,
typecheck, production client and server builds, prerender, and lint. Every
unfinished action remains inert and labeled. No API, resident data, provider
call, deployment, or working production feature is claimed
(`docs/resident-interface-plan.md`, `docs/resident-interface-slice-1.md`,
`src/features/resident-blueprint/`, `src/routes/`).

### 2026-08-30 - 3996bfc

Split implementation Slices 6 through 9 into 15 dependency-ordered PR packets:
three for anonymous Ask and four each for accounts and email, coverage expansion,
and release work. Each packet delivers a complete vertical capability with named
dependencies, exclusions, tests, and runtime proof. Planned chat uses
`@convex-dev/agent` for durable threads with `MODEL_FAST` through Convex AI
Gateway. No component, API, resident feature, provider call, commit, or
deployment is claimed
(`docs/post-slice-5-pr-plan.md`, `docs/architecture.md`).

### 2026-08-30 - e169cdf

Completed the Slice 5 resident-interface decision grill and wrote one master
plan for the full frontend. It fixes the sitemap, page hierarchy, responsive
shell, evidence interaction, state matrix, connected flows, and eight bounded
design-agent assignments. The plan uses real development evidence for the main
flow and labeled local fixtures for unfinished integrations. No API, deployment,
or working public feature is claimed (`docs/resident-interface-plan.md`,
`docs/product-spec.md`, `docs/architecture.md`, `docs/build-plan.md`).

### 2026-08-29 - c162543

Deployed Phase 1 Slice 4 through PR #13. Production workflow `33273984552`
verified the merge commit, deployed the backend and static frontend, applied the
idempotent registry seed, and passed its smoke. The independent production smoke
then passed the direct Convex host, canonical domain, apex redirect, and
readiness query. Production now has the Slice 4 evidence engine. No production
extraction, model review, or issue build ran, so the real issue proof remains in
the personal development deployment.

### 2026-08-29 - 1ad6a8a

Implemented Phase 1 Slice 4 in the personal development deployment. Added
immutable source-snapshot comparisons and publication material changes. The
change classifier distinguishes normalized source edits from raw-only churn and
records field-level amendments, date or amount changes, decisions,
postponements, cancellations, public-action changes, information limits, and
information expansion. Withheld publication versions do not create a public
change or replace the last accepted pointer (`convex/changes/`, `convex/publication/`,
`convex/sources/snapshots.ts`).

Added the `buildIssueV1` durable workflow with separate link, review, rank, and
publish stages. Terra proposes one issue only from exact published decision
versions and citations. A concrete shared signal must appear in evidence from
every record, and each link reason must cite its own record plus another. Luna
then reviews every proposed fact from the cited excerpts. Deterministic code
removes unsupported factors, assigns the fixed 100-point score, and writes a
full, limited, or withheld immutable issue version. The backend keeps atomic
decision records, exact issue links, review checks, importance assessments, raw
model response evidence, and idempotent build keys (`convex/issues/`,
`convex/operations/issues.ts`, `convex/schema.ts`).

Proved the path with real Lafayette agenda and minutes records `CO-022-2026` and
`CO-023-2026`. Extraction prompt v1.4 produced full minutes publications with
supported vote and approved-outcome facts. Issue
`n57071y9n25rrs09yaanb1hz918dd1fs` links both records through cited references
to Terrebonne Parish Consolidated Government. Luna accepted one
`public_assets` consequence factor, and rubric v1 assigned 5 of 100 points with
14 percent factor completeness. The evidence query returns both publication
histories, the scheduled-to-decided progression, and the earlier limited-to-full
expansion.

The proof failed closed twice before acceptance. The first linker response used
a mismatched fact value, which led to exact fact-copy instructions and raw
failure-response persistence. The next candidate named the asset topic without
stating what the approved action authorized, so Luna withheld issue version 1.
Prompt v1.2 required a cited consequence statement. Luna then passed every fact,
and deterministic policy wrote full issue version 2. Replaying the input records
in reverse order returned the same build with `reused: true` and created no new
model call or issue version. The accepted issue build used one Terra and one Luna
AI Gateway call at an estimated combined cost of $0.042153.

Reviewing the real development history caught two noisy change labels. A
trailing-period edit had been called an amendment, and a full-to-limited
evidence downgrade had been called an amount change because the limited payload
omitted an empty amounts array. The classifier now suppresses punctuation,
casing, and whitespace-only text edits and labels evidence downgrades
`information_limited`. The two stale development rows were recomputed from
their immutable publication payloads. The temporary internal repair operation
was removed after use.

A later code review found three more correctness gaps. Lifecycle labels now
require an actual state transition. Losing time precision stays quiet, while a
newly supported date or clock-time change is public. A terminal issue-build
failure no longer reserves the deterministic input key, so the same evidence
can retry and a later success resumes normal replay. Deterministic link
validation also rejects the government body's own name or home jurisdiction as
the only shared signal. Issue-link prompt v1.3 states the same rule.

`npm run verify` passes typechecking, 110 tests across 14 files, the production
build and prerender, and lint. The final schema and functions are ready on the
personal development deployment. No new model call, production deployment, or
public interface change was made.

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
