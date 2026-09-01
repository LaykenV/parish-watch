# Four-Week Build Plan

Event window: August 25 through September 22, 2026
Project start: August 26, 2026
Submission cutoff: September 22 at 12:00 PM Pacific

The founder can build the basic interface quickly, so the plan spends the extra
scope on evidence depth, source diversity, live changes, and real usage. It does
not spend it on decorative features.

## Operating Rules

- Protect the weekday 90-minute Varholdt sales block.
- Build the backend evidence vertical before a polished UI.
- Keep one shippable main branch. Avoid speculative platform branches.
- Update root `hackathon.md` after meaningful work sessions.
- Record vendor cost and quality from the first external call.
- End each day with a deployed or locally reproducible proof, a test, or a
  documented blocker.
- Run the UI locally against the personal Convex development deployment. A
  reviewed merge to `main` automatically deploys the matching backend and
  frontend to production, applies the safe registry seed, and runs the
  production smoke. Do not add staging during the hackathon.
- Use real public records. Mark synthetic fixtures and deterministic replays
  clearly.
- Feature-freeze on September 17.
- Submit before the deadline day if possible. Treat September 22 as contingency,
  not normal production time.

## Phase 0: Complete Setup

Target: August 27

Status: complete August 27, 2026.

- [x] Restart Codex/T3 so the newly installed Convex plugin becomes available.
- [x] Verify `convex@convex-codex-plugin` is enabled.
- [x] Confirm registration and redeem the 20,000 Firecrawl participant credits.
- [x] Confirm Convex AI Gateway access on the Professional team.
- [x] Confirm both role model IDs through the gateway's live `GET /v1/models`.
- [x] Set the team warning and disable thresholds to $20 and $60 per month.
- [x] Create the public repository, rename it to `LaykenV/public-parish`, and
      update the `origin` remote. The authorized initial source commit is public
      on `main`.
- [x] Add the MIT license before the first public push.
- [x] Scaffold TanStack Start in SPA/static-prerender mode and Convex in this
      existing repository.
- [x] Run `npx convex ai-files install` and read
      `convex/_generated/ai/guidelines.md`.
- [x] Register only the installed static-hosting component.
- [x] Pin Convex Auth v2 to `2.0.0-alpha.1` before auth implementation.
- [x] Add `.env.example` without secrets and keep `.env.local` ignored.
- [x] Pin direct dependency versions and declare the supported Node.js and npm
      major versions.
- [x] Fail production builds without `VITE_CONVEX_URL` and rebuild before the
      static-hosting deploy command can publish an old artifact.
- [x] Keep generated `.agents` and `.claude` guidance local and reproducible
      through `npx convex ai-files install` instead of vendoring both copies.
- [x] Confirm `npm ci`, local web startup, a cloud Convex push, the live
      readiness query, typechecking, tests, production build, and lint.
- [x] Upload the Phase 0 shell to the development `convex.site` host and smoke
      the real static-hosting path.
- [x] Deploy the verified shell to the production Convex deployment and public
      `convex.site` host.

Exit gate: one documented setup path works from a fresh install, and
`hackathon.md` reflects only what the code proves.

## Checkpoint posting cadence

- Do not spend a post on the setup shell alone.
- After Slice 1, publish the first X or LinkedIn technical checkpoint showing a
  real Lafayette source, its immutable snapshot, and idempotent repeat retrieval.
- After Slice 3 or 4, publish strict extraction, exact citation, independent
  review, and source-change proof.
- After Slice 5, publish the first TikTok or Facebook resident demonstration
  linked to a real public issue page.
- After the AgentMail outcome loop works, publish the live change and sourced
  email proof.
- Publish tester evidence near September 15 or 16 and the final launch and demo
  after feature freeze.

Reuse one recording for technical and resident edits. Keep content work near 90
minutes per week and preserve the weekday Varholdt sales block.

## Week 1: Prove the Evidence Engine

Dates: August 27 through September 2

### Slice 1: Immutable Source

Status: complete and deployed through PR #5 on August 28, 2026.

- Define jurisdictions, bodies, registries, snapshots, pipeline runs, and stage
  state.
- Register the Firecrawl component.
- Ingest one real Lafayette official source.
- Preserve URL, hash, retrieval time, page map, raw artifact, and Firecrawl
  metadata.
- Prove a repeat retrieval is idempotent.

Exit gate: the same source does not duplicate work, and a changed source creates
a new immutable snapshot.

### Slice 2: Cited Atomic Decision

Status: complete and deployed through PR #6 on August 29, 2026.

- Adopt `@convex-dev/workflow` to orchestrate the now multi-stage extraction
  flow durably. Workflow steps execute and retry the work; the pipelineRuns and
  pipelineStages tables remain the domain evidence ledger.
- Version the strict extraction schema.
- Build the Convex AI Gateway provider and verify its scoped service token.
- Call `MODEL_STRONG` through Chat Completions with a strict JSON Schema
  `response_format`.
- Add deterministic date, amount, body, domain, schema, and citation checks.
- Extract one real proposal or decision with exact page or excerpt receipts.
- Create gold-set tests before adding more source types.

Exit gate: every accepted material field resolves to the exact source snapshot.

Proof: processor v1.4, prompt v1.2, and schema v1 produced a private
`CO-029-2026` candidate with nine source-bound facts and no validation findings
in the personal development deployment. Replaying the starter reused the same
run and made no second model call. `npm run verify` passed 70 tests, including
40 extraction cases. Merge commit `74ce97e` deployed the Slice 2 backend and
passed production smoke. No Terra extraction was run in production.

### Slice 3: Independent Publication

Status: complete and deployed through PR #12 on August 29, 2026.

- Build the separate `MODEL_FAST` reviewer call and schema through AI Gateway.
  The reviewer must not run on the extraction model.
- Add final full, limited, and withheld publication policy.
- Record prompt, model, schema, token, latency, and cost metadata.
- Prove an unsupported fact is rejected.
- Prove an incomplete source does not produce a confident summary.

Exit gate: extraction and review disagreement cannot publish silently.

Proof: `reviewAndPublishCandidateV1` binds one validated candidate, snapshot,
and fact set to a separate strict-schema `MODEL_FAST` call, then rechecks the
input and applies deterministic policy. Fourteen Slice 3 tests cover full,
limited, withheld, dishonest-verdict, same-model, exact-check, history-pointer,
and replay behavior. Persistence and finalization both reject duplicate fact
checks. Extraction completion and publication scheduling share one mutation,
and replay repairs a successful extraction that lacks a publication run.
`npm run verify` passes 84 tests, typecheck, build, prerender, and lint.

Development run `jd75t07cb5m350nt3fyys67e8n8dckn5` reviewed the real
`CO-029-2026` v1.4 candidate with `openai/gpt-5.6-luna` through Convex AI
Gateway. Luna supported the core identity but rejected the `recordType` and
`lifecycleState` excerpts. Policy v1 wrote one limited source-only version with
three core citations, so neither disputed field appeared in the payload. The
call used 1,707 prompt tokens, 1,281 completion tokens, and 641 reasoning tokens
at an estimated cost of $0.001879. Replay reused the same run with one AI call
and one version. PR #12 merged as `8df651c`; production workflow `33261235916`
deployed the hardened backend and frontend and passed smoke. No production
extraction or model review was run.

### Slice 4: Issue, Rank, and Change

Status: implemented, proven in the personal development deployment, and
deployed to production through PR #13 on August 29, 2026.

- Preserve atomic decisions.
- Link one real issue across at least two records.
- Extract cited importance factors and compute the deterministic score.
- Add source-version material diff and publication history.
- Use a real prior/current document pair or a clearly labeled replay to produce
  an amendment, vote, or outcome.

Exit gate: one issue shows a correct timeline, "Why this may matter," and a visible
change with citations.

Proof: the internal `buildIssueV1` workflow runs Terra issue linking, separate
Luna review, deterministic ranking, and versioned publication. Real Lafayette
records `CO-022-2026` and `CO-023-2026` retain separate decision identities and
link through cited references to Terrebonne Parish Consolidated Government.
Issue `n57071y9n25rrs09yaanb1hz918dd1fs` has a full current version with two
decision links, a decided lifecycle, and one accepted `public_assets` factor.
Rubric v1 assigns 5 of 100 points and reports 14 percent factor completeness.

The same evidence query returns each record's agenda and minutes publication
history. It records the move from a scheduled proposal to an approved vote and
the expansion from a limited publication to a full cited payload. A failed
importance rationale produced a withheld issue version without replacing a
public pointer. Prompt v1.2 then produced the accepted version after Luna
confirmed every fact. Replaying the input records in reverse order returned
`reused: true`, kept the same run, and made no new model call or issue version.
The accepted build used two AI Gateway calls at an estimated combined cost of
$0.042153. `npm run verify` passes 110 tests, typecheck, build, prerender, and
lint. PR #13 merged as `c162543`; production workflow `33273984552` and the
independent production smoke passed. Production now includes the Slice 4
backend.

Post-proof review found three correctness gaps. Lifecycle labels were reading
the current state instead of the transition, lost meeting-time precision could
look like an amendment, and a failed issue build reserved its idempotency key.
The final release tests the corrected transition rules, permits a new attempt
after a terminal failure, and rejects the government's own name or home
jurisdiction as the only shared signal. Issue-link prompt v1.3 tells Terra the
same rule.

On August 30, a controlled production onboarding processed eight official
Lafayette City Council PDFs and exposed the first corrections through PRs #15
through #23. On August 31, the repeatable launch batch promoted 26 atomic
records from 17 hash-matched official PDFs: 15 Lafayette, 9 Rapides, and 2 East
Baton Rouge. Fifteen are full and 11 are limited. One negative control returned
`not_found`, three targets stayed out after exact-citation failures, and replay
reused all 27 successful extraction run IDs. A September 1 one-time production
data correction cleared the current publication pointers from one older
duplicate Lafayette board-vacancy record without deleting its evidence. The
resident query now returns 26 publications and exactly one board-vacancy card,
under `CITY-BOARD-APPLICATIONS-2026-09-15`.

Production still has no issue build, issue-decision link, or importance
assessment. Accepted atomic records may appear in the unranked "Published
decision records" verification view. They cannot enter "Major local decisions"
or another promoted issue feed until issue ranking passes. Any later bulk run
needs a cost estimate and separate approval.

### Slice 5: Complete Resident Interface

Status: interface design and implementation complete; production integration
exit gate remains open. Design Slice 1 deployed through PR #14 as `6e46fd7`.
Design Slice 2 deployed through PR #24 as `4e2ac67` on August 30, 2026. PR #25
deployed the owner phone-review refinements as `b22e321` later that day. Design
Slice 3 deployed through PR #27 as `3a59e45` on August 30, 2026. PR #28 merged
Design Slice 4 as `ff36c1b`; production workflow `33389489990` succeeded. PR
#31 deployed Design Slice 5 as `adfe81e`. Production workflow `33401768387` and
the independent production smoke passed. PR #34 deployed Design Slice 6 as
`0aa7474`, PR #37 deployed Design Slice 7 as `f854c2e`, and PR #43 deployed
Design Slice 8 as `85d6947`. Production workflow `33454522729` and the
independent production smoke passed. The complete interface remains
fixture-backed where account, email, detail, Ask, follow, coverage, request, and
private-report adapters have not passed their integration gates.

The deployed Slice 2 release includes the responsive shell plus Home, For You,
and Explore with development fixtures. The latest `npm run verify` passed 163
tests across 19 files, typecheck, production builds, prerender, and lint.
Production workflow `33324166404` and the independent production smoke passed
for `b22e321`. Explicit fixture URL scenarios remain available only in
development builds, and resident pages do not reserve a visible banner for them.
Production ignores every fixture scenario before deriving page state and shows
current accepted atomic publications through a bounded realtime query. Home,
For You, and Explore identify these as decision records and open the official
source. The integration does not create issues, scores, or complete coverage
claims.

The deployed Design Slice 3 code implements issue, atomic decision, meeting,
and citation-level evidence pages against explicit development fixtures. The
resident-evidence integration replaces the production decision and meeting
recovery states with bounded current accepted projections and exact citations.
Issue reads subscribe to the accepted pointer and fail closed when any link is
stale. Two bounded production issue builds passed AI Gateway linking,
independent review, deterministic validation, and publication. A live Convex
subscriber received the Rapides millage issue 10.8 seconds after its initial
empty result without reconnecting. The full Slice 5 exit is closed.

Design Slice 4 implements Ask Public Parish against the same development
fixtures and the shipped evidence viewer. It includes
focused Ask tests for route privacy, scope restoration, draft consumption,
citation accounting, production fixture gating, duplicate-submit protection,
the compact thread composer, and named official contacts. Production keeps Ask
in navigation behind the honest unavailable state while PR 6A is under review.
The PR 6A backend uses hashed 24-hour sessions, application-owned thread access,
Agent component history, and bounded retrieval over accepted evidence. It does
not call a model or expose the unfinished adapter in production.

Design Slice 5 replaces the Following and email-management blueprints with the
finished page hierarchy and interactions. It uses development-only typed
fixtures for Google return, email verification, ownership, preferences, and
alerts. Production shows an honest unavailable state and creates no follow
until the Auth and AgentMail adapters pass their gates. Pull-request verification
passed 221 tests across 27 files, typecheck, production builds, prerender, and
lint.

Design Slice 6 completes Coverage, coverage request, public method, area-state,
and private-report interfaces. Design Slice 7 makes loading, heading focus,
sheet focus return, announcements, and reduced motion consistent. Design Slice
8 connects the ten required resident journeys, preserves route and evidence
context across page changes, and records every fixture and API owner in code.
The UI vocabulary, component system, responsive hierarchy, and route structure
are closed. Backend integration work must replace adapters without redesigning
the pages.

Do not design or build resident pages one at a time during backend slices.
Slice 4 must first settle the issue, importance, timeline, and change contracts.
Then pause implementation and complete this design handoff:

- decide the full in-scope page inventory together;
- define each page's information, actions, navigation, mobile priority, and
  loading, empty, limited, error, signed-out, and signed-in states;
- prepare one reusable design context pack from the product specification,
  architecture, data contracts, copy constraints, and existing visual system;
- use [`resident-interface-plan.md`](./resident-interface-plan.md) as the master
  page contract and the source for the eight design-agent assignments;
- have the founder create and approve the complete interface in the selected
  design tool;
- design and build the approved page system in one cohesive frontend pass,
  including the final Ask, Follow, account, email, and coverage positions;
- after each design-slice pull request deploys and passes the exact production
  workflow and independent smoke, run the documented founder review on an
  actual iPhone in Safari before the next slice changes that shared pattern;
- use typed fixtures and local design adapters until each real API is ready;
- connect the issue, decision, citation, coverage, and realtime publication
  paths that already work;
- never promote fixture-backed success as working production behavior.

Exit gate: the approved resident interface is implemented as one responsive
system. The design portion is complete. The full Slice 5 exit gate remains open
until one real issue and its citations are live and a published change updates
that open production page without refresh. Later implementation slices connect
remaining actions without reopening page layout or visual direction.

After Slice 5, use
[`post-slice-5-pr-plan.md`](./post-slice-5-pr-plan.md) as the agent execution
queue. It splits implementation Slices 6 through 9 into dependency-ordered,
single-concern PR packets. The split changes delivery size, not product scope.

Use the first official September Lafayette meeting cycle if the posted schedule
and documents confirm it.

## Week 2: Complete the Resident Loop

Dates: September 3 through September 9

### Product Surfaces

- location and topic setup without an address;
- “For You” and “Major local decisions” feeds;
- searchable decisions;
- issue timeline;
- meeting and source page;
- landing-page voter-information strip with a verified election date and an
  outbound Secretary of State link;
- public method and coverage pages;
- private source-problem reporting link through AgentMail;
- responsive mobile layout.

### Anonymous Chat

- 24-hour same-device session;
- issue-scoped and corpus-scoped retrieval;
- multi-turn conversation;
- citation validation on every answer;
- explicit evidence-not-found response;
- invisible token and abuse limits;
- CAPTCHA or cooldown fallback.

PR 6A now provides the private 24-hour Agent threads and bounded published
evidence retrieval. PR 6B adds strict structured answers through Convex AI
Gateway, validates every evidence ID before saving an assistant message, and
records private usage and safe failure metadata. The stacked PR 6C working tree
connects the approved resident interface and reserves request and token
capacity before any model call. Production Ask stays unavailable until that PR
passes its pull-request and runtime gates and merges.

### Account Loop

- pin and install Convex Auth v2 alpha;
- add Google OAuth account sign-in;
- save multiple areas and topics;
- follow an issue, topic, body, or municipality through the account;
- protect user-owned records with centralized authz.

### AgentMail

- register the component and inbound route;
- verify an email-only subscription with a short-lived code or confirmation;
- create a follow without treating that verification as account authentication;
- send a material-change email with sources;
- offer an optional weekly roundup of material changes;
- persist the thread and delivery state;
- accept a reply;
- answer the reply through the same grounded path;
- prove retry deduplication.

### Hosting

- keep the existing public `convex.site` environment current at completed slice
  gates;
- verify direct route refreshes;
- prototype `/share/issues/:slug` Open Graph HTML from published issue data;
- test root route precedence for auth and provider webhooks.

Exit gate: a new resident can discover, understand, ask, follow, and receive a
real sourced change.

## Week 3: Expand Coverage and Get Use

Dates: September 10 through September 16

### Dynamic Coverage Compiler

- run the compiler only from an owner-controlled operation;
- map a selected jurisdiction from its official homepage;
- propose and validate a source registry;
- show internal compiler progress and source health through Convex;
- hold candidate coverage behind the quality gate;
- exercise repair on one changed or difficult portal.

### Public Coverage Requests

- record and deduplicate a requested parish or municipality;
- accept an optional official homepage and verified AgentMail subscriber;
- confirm that every source is validated before launch;
- never start Firecrawl or OpenAI work from a public submission;
- notify interested residents only after the place passes the coverage gate.

### Geographic Rollout

1. finish all defined Lafayette and Youngsville bodies;
2. pass Alexandria, Pineville, and Rapides Police Jury through the same gate;
3. pass Baton Rouge Metro Council and Planning Commission;
4. make every valid record searchable;
5. keep any failing body off the supported list while showing an honest
   candidate or degraded state.

Planning/zoning in Rapides remains required for the promised region only after
the official bodies and sources are identified. If they cannot pass in time,
narrow the named Rapides coverage in public copy instead of lowering the gate.

### Real User Sprint

- recruit an initial five Lafayette testers before UI assumptions harden;
- recruit Alexandria/Pineville testers through the founder's existing local
  reach;
- add Baton Rouge testers through direct invitations or relevant communities;
- ask residents to find a real issue, inspect a source, ask a question, and
  follow it;
- log completed actions, not compliments;
- correct confusing language and failed sources immediately.

Target by September 16:

- 25 unique real users;
- 10 follows;
- 10 substantive questions;
- at least several return visits or alert opens;
- one useful not-found case or source problem uncovered by a tester;
- one issue with an observed post-publication change.

### Content Sprint

- publish technical build evidence on X or LinkedIn;
- tag Convex, OpenAI, Firecrawl, and AgentMail as the event requires;
- publish resident-facing demonstrations on TikTok and Facebook;
- use tested per-issue share URLs when a post links to the app;
- use one captured workflow for multiple edits;
- keep product claims factual and nonpartisan;
- save public engagement evidence for submission.

Exit gate: all required integrations work publicly, multiple source shapes pass,
and real people have completed the core loop.

## Week 4: Prove, Freeze, and Submit

Dates: September 17 through September 22

### September 17: Feature Freeze

After the freeze, accept only:

- correctness fixes;
- reliability fixes;
- accessibility and mobile blockers;
- demo-path clarity;
- submission requirements;
- source-data or privacy fixes.

Do not add a map, new institution class, broad design system, or admin product.

### Reliability

- rerun every gold-set test;
- run typecheck, unit, contract, and end-to-end tests;
- exercise provider retries and duplicate webhooks;
- verify stale and degraded coverage;
- inspect cost by stage and region;
- remove secrets and personal data from repo and recordings;
- check every citation and original-source link;
- reconfirm the voter-information strip's election date and outbound link
  against the Secretary of State's official calendar;
- test the app from a signed-out browser and mobile viewport;
- test every enabled design slice on an actual iPhone in Safari with browser
  controls expanded and collapsed, portrait and landscape, the keyboard, 125
  percent page zoom, and Reduce Motion;
- test every direct `convex.site` route;
- test Convex Auth v2 alpha Google OAuth;
- test AgentMail email-subscription verification, management, and unsubscribe;
- test the normal AI path through Convex AI Gateway on both model roles;
- test the direct OpenAI fallback without using it in the demo;
- test anonymous chat expiry and abuse limits;
- test AgentMail send, reply, and dedupe.

### Live Proof

Use the September 15 Lafayette cycle only if the official schedule and published
documents confirm it. Capture:

- source before and after;
- snapshot hashes and version history;
- extracted and reviewed record;
- live UI change;
- notification send;
- resident outcome.

If the government timing is unsuitable, use a clearly labeled deterministic
replay of two real official source versions. Never describe a replay as a live
government event.

### Demo

- script a product-first story under three minutes;
- record backup takes before the last day;
- show real clicks, source receipts, live updates, and email;
- avoid terminal narration unless a backend proof cannot be shown in product;
- verify audio, legibility, and no private data;
- host or upload in the form accepted by vibeapps.dev.

### Submission

- make repository public;
- verify root `hackathon.md`;
- verify live URL without invitation;
- verify repo, live app, and video from a signed-out browser;
- verify social post links and required tags;
- fill the vibeapps.dev entry;
- submit before September 22 at 12:00 PM Pacific.

## Daily Cadence

Suggested sequence:

1. protected Varholdt sales block;
2. one backend or resident outcome for Public Parish;
3. tests and a real source check;
4. update `hackathon.md`;
5. capture a short proof clip or screenshot only when something changed;
6. write the next day's one exit gate.

Do not use content creation to postpone a failing pipeline.

## Scope Removed Before Implementation

- FAQ aggregation;
- a dedicated public corrections workflow;
- public-triggered coverage compilation and live public compiler progress;
- cross-device chat history.

The public "Request your parish" form remains as demand capture. The internal
compiler and controlled run viewer remain part of the technical proof.

## Further Cut Order

If the schedule still slips, cut in this order:

1. saved-area and topic-management polish beyond one working saved setup;
2. visual polish on meeting and atomic-decision pages;
3. historical depth beyond the minimum useful context;
4. additional bodies that have not passed the coverage gate, with public claims
   narrowed to match.

Never cut:

- immutable snapshots;
- exact citations;
- deterministic validation;
- independent review;
- honest limited or withheld states;
- one real issue timeline;
- anonymous grounded chat;
- one follow-to-AgentMail outcome;
- Convex live update;
- public no-invite deployment;
- real user proof;
- the submission requirements.

## Stop Rules

- If a source portal consumes more than half a day without yielding the shared
  contract, record the failure, try the smallest adapter, and move to the next
  body.
- If a body cannot pass the coverage gate by feature freeze, do not call it
  supported.
- If `MODEL_STRONG` misses labeled facts or citations for a stage, revise the
  prompt, schema, or excerpt window. Do not add a larger model tier. If the
  stage still misses, it withholds or publishes a limited source-only card.
- If an integration is only visible in code, expose its resident effect in the
  demo.
- If real testers do not understand "issue," "decision record," "Source," or
  "Why this may matter,"
  fix product language before adding scope.
- If sales work is being skipped, reduce hackathon scope that day rather than
  redefining the business plan.
