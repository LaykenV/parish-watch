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
- [x] Confirm the existing team warning and disable thresholds of $20 and $40
      per month.
- [x] Create the public `LaykenV/parish-watch` GitHub repository and add the
      `origin` remote. The authorized initial source commit is public on `main`.
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

Exit gate: one documented setup path works from a fresh install, and
`hackathon.md` reflects only what the code proves.

## Week 1: Prove the Evidence Engine

Dates: August 27 through September 2

### Slice 1: Immutable Source

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

- Version the strict extraction schema.
- Build the Convex AI Gateway provider and verify its scoped service token.
- Call `MODEL_STRONG` through Chat Completions with a strict JSON Schema
  `response_format`.
- Add deterministic date, amount, body, domain, schema, and citation checks.
- Extract one real proposal or decision with exact page or excerpt receipts.
- Create gold-set tests before adding more source types.

Exit gate: every accepted material field resolves to the exact source snapshot.

### Slice 3: Independent Publication

- Build the separate `MODEL_FAST` reviewer call and schema through AI Gateway.
  The reviewer must not run on the extraction model.
- Add final full, limited, and withheld publication policy.
- Record prompt, model, schema, token, latency, and cost metadata.
- Prove an unsupported fact is rejected.
- Prove an incomplete source does not produce a confident summary.

Exit gate: extraction and review disagreement cannot publish silently.

### Slice 4: Issue, Rank, and Change

- Preserve atomic decisions.
- Link one real issue across at least two records.
- Extract cited importance factors and compute the deterministic score.
- Add source-version material diff and publication history.
- Use a real prior/current document pair or a clearly labeled replay to produce
  an amendment, vote, or outcome.

Exit gate: one issue shows a correct timeline, “Why this matters,” and a visible
change with citations.

### Slice 5: Thin Resident Proof

- Scaffold the minimal TanStack Start shell.
- Display major decisions, one issue page, citations, and coverage status.
- Subscribe to the public issue projection through Convex.
- Verify a published change updates an open page without refresh.

Exit gate: the backend vertical is visible and live. Visual polish is still
secondary.

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

- register Convex static hosting;
- deploy an early public `convex.site` build;
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
2. one backend or resident outcome for Parish Watch;
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
- If real testers do not understand “decision,” “issue,” or “why this matters,”
  fix product language before adding scope.
- If sales work is being skipped, reduce hackathon scope that day rather than
  redefining the business plan.
