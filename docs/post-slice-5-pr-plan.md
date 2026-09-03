# Post-Slice-5 PR plan

Status: implementation Slice 6 and Slice 7 PRs 7A through 7C are deployed and production-proved; Slice 7 PR 7D is next

This plan turns the remaining implementation into a few substantial,
reviewable pull requests per slice. It does not add product scope. The page
hierarchy and interaction contracts remain in
[`resident-interface-plan.md`](./resident-interface-plan.md).

## Current checkpoint

Resident-interface Design Slices 1 through 8 are deployed through PR #43 as
`85d6947`. The complete route hierarchy, responsive behavior, development
fixtures, integration gates, and fixture-to-API handoff now exist. Production
discovery reads accepted atomic publications and accepted issue timelines, and
anonymous product telemetry is live. The known duplicate board-vacancy
projection is corrected. The Slice 5 data prerequisite is closed. Two bounded
production issue builds passed linking, independent review, validation, and
publication. The Rapides millage issue reached an existing subscriber 10.8
seconds after an initial empty result.

Implementation Slice 6 is closed. PRs #45, #47, #49, #56, and #57 deployed
private 24-hour Agent threads, bounded accepted-evidence retrieval, the real Ask
interface, the high-reasoning selector and answer flow, and corrected resident
citation display. Luna first selects issue, meeting, or decision IDs from every
current published record and accepted excerpt in scope. A second
high-reasoning call receives the expanded records and hash-checked normalized
official documents. Broad or invalid selections use the full scope. A valid
not-found selection skips the second call. Per-session and app-wide
request-frequency limits remain. Token use is private telemetry, not an
application-owned input or output budget. Oversized scopes fail instead of
truncating evidence or documents. Production tests proved related issue turns,
a corpus answer spanning two decisions, exact Source controls, evidence not
found, thread restoration, and answer prose without raw internal evidence IDs.
The original PR sections below remain as the historical delivery record.
Production now has mounted Convex Auth v2, Google account ownership, private
saved areas and topics, the public privacy notice, and the AgentMail follow
enrollment and alert-delivery paths. Slice 7C added durable matches,
deduplicated immediate email, weekly roundups, subscriber-wide management from
alert links, delivery reconciliation, and live notification settings. It does
not yet have grounded inbound replies or a coverage compiler.
Controlled corpus QA also found that one answer displayed Markdown emphasis
markers as literal text. PR #57 corrected that presentation defect. PR 7D is
the active capability.

## Original starting assumption

This plan assumes Slice 5 has passed its exit gate:

- the complete responsive resident interface exists;
- page code consumes typed data and action adapters;
- one real issue and its citations load from accepted public projections;
- a published material change updates an open page without refresh;
- unfinished integrations do not simulate success in production.

As of August 30, 2026, the repository has the evidence tables and workflows from
Slices 1 through 4. It does not yet have the Convex Agent component, anonymous
thread ownership, configured authentication, AgentMail, notification tables, or
a coverage compiler. `@convex-dev/auth` is pinned but not mounted. Static
hosting, Firecrawl, and durable workflow are the registered Convex components.

## PR sizing rule

The remaining path is 15 planned PRs:

- Slice 6 has 3 PRs.
- Slice 7 has 4 PRs.
- Slice 8 has 4 PRs.
- Slice 9 has 4 PRs.

Each PR delivers one complete vertical capability. A packet may cross schema,
Convex functions, adapters, and UI when all of those changes prove the same
resident or operator outcome.

Every PR must:

- be safe to merge without the next packet;
- keep deployed schema changes additive and compatible;
- expose public data only through accepted resident projections;
- keep external side effects in actions;
- use indexed, bounded reads for growing tables;
- include authorization, expiry, replay, retry, or deduplication tests where
  those risks apply;
- replace only the matching Slice 5 fixture adapter;
- update canonical status and root `hackathon.md` with proved behavior;
- pass `npm run verify` and `git diff --check`.

Every PR must exclude:

- a second authentication system;
- raw pipeline, resident, email, model, or operations records in public queries;
- public-triggered compiler work;
- fake fixture success in production;
- unrelated page redesigns;
- production crawling, model calls, email sends, data imports, or compiler
  promotion without separate authorization.

If review reveals a defect outside a packet's named outcome, open a separate
fix PR. Do not expand the current PR because nearby code is convenient.

## Dependency overview

```text
Slice 5 evidence and realtime
  |
  +-- 6A private evidence-scoped threads
  |     -> 6B validated grounded answers
  |     -> 6C complete bounded Ask experience
  |
  +-- 7A Google account and saved setup
        -> 7B Google or email follow enrollment
        -> 7C sourced alert delivery
        -> 7D grounded inbound email

7A owner authorization
  -> 8A controlled compiler foundation
     -> 8B source discovery and classification
     -> 8C representative validation and promotion
     -> 8D operations and geographic rollout

Slices 6 through 8
  -> 9A public coverage loop
  -> 9B factual issue sharing
  -> 9C private-safe measurement and provider health
  -> 9D release certification
```

Slice 7 can begin while Slice 6 is in progress. PR 7D depends on the validated
answer path in 6B. Slice 8 can begin after 7A establishes owner authorization.
Slice 9 begins only after the public behavior it exposes is real.

## Slice 6: anonymous grounded Ask

Slice 6 closes when a signed-out resident can hold a two-turn, source-cited
conversation and receive an honest evidence-not-found response. Sessions expire
after 24 hours, and normal use cannot create unbounded provider cost.

### PR 6A: establish private evidence-scoped Ask threads

Status on September 1: PR #45 merged as `c9ea441`. Production workflow
`33515579521` passed.

Suggested title: `feat: establish private evidence-scoped ask threads`

Outcome: a browser can create an opaque 24-hour session, start an issue,
meeting, or corpus thread, retrieve its bounded history, and obtain only the
accepted evidence available to that scope.

Include:

- pin and register `@convex-dev/agent`;
- use Agent component threads and durable messages instead of application
  message tables;
- add `anonymousSessions` and a thread-access mapping with required indexes;
- store only a hash of the opaque browser token;
- authorize every component read and write through the session mapping;
- enforce 24-hour access and detach expired sessions without fingerprinting;
- add bounded retrieval over published issues, accepted decision versions,
  meetings, and exact citations;
- enforce issue, meeting, jurisdiction, and corpus scopes;
- return stable evidence IDs that open the public Source viewer;
- return an explicit no-evidence result;
- implement the create, resume, history, and evidence methods in the Slice 5
  chat adapter.

Required tests:

- correct, wrong, and expired session tokens;
- cross-browser and cross-thread isolation;
- bounded history and retrieval;
- scope mismatch;
- withheld, raw, unrelated, and superseded evidence exclusion;
- unsupported question retrieval returning no evidence.

Exclude:

- model calls;
- natural-language answers;
- Google auth;
- vector search or embeddings unless a checked launch-corpus benchmark later
  proves bounded text retrieval inadequate.

Proof: two anonymous browsers cannot access each other's threads, and a labeled
question retrieves only its accepted citations.

### PR 6B: answer Ask with validated published evidence

Status on September 1: PR #47 merged as `9ae0467`. Production workflow
`33517184457` passed. Its exact stacked implementation first reached the
personal development deployment, where a real `MODEL_FAST` call returned a
strict answer with current Lafayette citations. A second turn used the prior
question to retrieve the same current records, and an unsupported question
returned not found without citations.

Suggested title: `feat: answer ask with validated published evidence`

Outcome: `MODEL_FAST` answers from the retrieved evidence and deterministic code
rejects unsupported citations before saving or displaying the answer.

Depends on: 6A.

Include:

- define the Public Parish Agent with `convexGateway(MODEL_FAST)` through
  `@convex-dev/ai-sdk-provider`;
- preserve the existing AI provider boundary and documented direct fallback;
- strict response schema for answer, evidence references, not-found state, and
  suggested grounded follow-ups;
- issue, meeting, and corpus prompt contracts that receive only retrieved
  evidence;
- bounded prior turns for multi-turn context;
- deterministic evidence-ID and citation validation after generation;
- Agent thread and message persistence;
- application-owned model, route, token, latency, cost, and safe error
  attribution;
- provider retry limits and failure mapping.

Required tests:

- correct citations;
- invented or missing evidence IDs;
- malformed structured output;
- not-found answers;
- prompt attempts to leave the validated corpus;
- provider error, retry, and direct-fallback policy;
- follow-up questions using only bounded prior turns.

Exclude:

- streaming;
- account history;
- open-web or unofficial-source answers;
- public question aggregation.

Proof: one labeled question returns a cited answer, one unsupported question
returns not found, and an invented citation fails closed.

### PR 6C: ship the bounded anonymous Ask experience

Status on September 1: PR #49 merged as `30dc267`. Production workflow
`33518827257` passed. Exact head `e1cd4b1` adds app-wide minute and daily token
ceilings that survive anonymous session rotation. The production issue-scoped
flow completed two related turns using the accepted `CO-022-2026` and
`CO-023-2026` citations. Both Source controls opened their exact minutes spans.
An unsupported question first entered the safe retry state; its fenced retry
returned evidence not found with no citations. After refresh, reopening the
preserved recent conversation restored all three turns. Earlier browser QA at
375 and 1280 pixels covered private local storage, Source controls, focus
return, offline behavior, live announcements, and overflow.

Suggested title: `feat: ship bounded anonymous ask`

Outcome: the approved Ask interface uses the real thread and answer path, while
atomic limits prevent concurrent or repeated requests from exceeding the model
budget.

Depends on: 6A and 6B.

Include:

- replace the remaining chat fixture adapter on issue, meeting, and `/ask`
  routes;
- reserve the immediate spinner inside the stable action slot;
- render full answer, citation, not-found, expired, offline, cooldown,
  retryable-error, and terminal-error states;
- open every answer citation in the approved Source panel;
- pin and register `@convex-dev/rate-limiter` for request frequency;
- add application-owned short-window and daily token reservations;
- cap question, history, retrieval, output, retry, and concurrent request sizes;
- reconcile actual provider usage and release failed reservations safely;
- retain an inactive CAPTCHA adapter unless observed abuse justifies activation;
- add keyboard and screen-reader announcements.

Required tests:

- first question, follow-up, refresh, and expiry;
- exact Source opening;
- concurrent requests at the limit;
- abandoned and failed reservations;
- cooldown rendering;
- no question text in public analytics;
- signed-out mobile flow and keyboard operation.

Exclude:

- visible question counters;
- browser fingerprinting;
- cross-device history;
- CAPTCHA activation without evidence.

Proof and release gate:

- run one real two-turn development conversation through AI Gateway;
- confirm every displayed claim resolves to accepted evidence;
- verify not-found, expiry, cooldown, and provider failure;
- pass the complete Ask browser flow at 375 pixels;
- do not call Slice 6 complete from fixture answers.

Status: passed in development and on the production issue-scoped flow.
Implementation Slice 6 is closed.

## Slice 7: accounts, follows, and AgentMail

Slice 7 closes when a resident can follow through Google or verified email and
receive one deduplicated sourced update. Weekly roundups, replies, and source
reports use the same delivery boundary.

### PR 7A: complete the Google account and saved setup

Suggested title: `feat: save resident setup with Google`

Outcome: Google sign-in returns the resident to the action that initiated it,
and the resident can save and manage only their own areas and topics.

Include:

- register and configure pinned Convex Auth v2 with Google;
- exact allowed redirect origins and safe return-target validation;
- HTTP route ordering that preserves Firecrawl and static hosting;
- centralized identity, ownership, and owner-role helpers;
- signed-in and signed-out provider states;
- saved-area and topic schema with indexes and public-target validation;
- idempotent save and remove mutations;
- replace the Slice 5 account and saved-interest adapters;
- preview-deployment proof for callback and direct-route behavior.

Required tests:

- anonymous reading and Ask remain available;
- valid sign-in returns to the original issue or Following route;
- invalid or external return target fails safely;
- two users cannot read or change each other's saved setup;
- unsupported targets and replay fail or reuse correctly;
- owner-only helpers fail closed.

Exclude:

- custom email login;
- passkeys;
- follows;
- email-only subscriptions.

Proof: a resident signs in from an issue, returns to it, saves an area and topic,
and another user cannot access either record.

Status on September 2: PR #58 merged as `04d4350`. PR #59 corrected the Convex
deployment environment access and merged as `f725094`. Exact production
workflow `33587446687` and the independent production smoke passed. Development
proved a saved area survives reload and can be removed. Production proved
Google sign-in and sign-out on the canonical domain and from the qualifying
`convex.site` origin through the canonical callback. Authorization tests cover
anonymous denial, cross-user isolation, idempotency, target validation,
verified Google profiles, and owner access that fails closed.

### PR 7B: complete Google and email-only follow enrollment

Suggested title: `feat: follow civic updates with Google or email`

Outcome: a resident can follow an issue, topic, body, or place through a
Google account or a verified email-only subscription, then manage that follow
through the correct ownership path.

Depends on: 7A.

Include:

- register the approved AgentMail integration and its environment contract;
- add email subscribers and short-lived verification challenges;
- store a normalized address hash, protected delivery reference, hashed code,
  expiry, attempts, purpose, and consumed time;
- enqueue verification mail from a mutation so the AgentMail component's
  workpool action performs the provider call with bounded retries;
- verify AgentMail webhook signatures before state changes;
- add a unified follow schema for Google and verified-email owners;
- validate all four target types and prevent duplicates;
- add notification preferences for immediate, weekly, both, and muted, while
  preserving the last active cadence for resume;
- add hashed, rotatable email management and unsubscribe tokens;
- make management tokens expire after 30 days and scope them to one follow;
- make unsubscribe stop all mail to the address until a new verification;
- sweep expired challenges daily and finalized AgentMail verification payloads
  hourly;
- replace verification, follow, Following, preference, mute, unfollow, and
  unsubscribe fixture adapters.

Required tests:

- wrong, expired, exhausted, replayed, and concurrently consumed codes;
- forged webhook and resend behavior;
- no authenticated user created by email verification;
- both owner kinds following the same target;
- cross-owner read and mutation denial;
- invalid target and duplicate follow;
- management-token isolation, rotation, and idempotent unsubscribe.

Exclude:

- magic-link authentication;
- follower counts;
- notification creation or delivery;
- use of an email management token as an account session.

Proof: Google and email-only residents independently follow the same issue, and
each can manage only their own follow.

Implementation uses two stacked PRs. The first adds enrollment, management,
webhook, retention, and tests. The second connects the shipped resident UI to
those functions and carries the complete browser proof.

Status on September 2: PR #66 merged as `fdfebd8` through production workflow
`33672529400`, and PR #67 merged as `8fc4642` through workflow `33675616509`.
PRs #68 and #69 recorded the release in `hackathon.md` and finished on exact
head `d1744a7` through workflow `33677352750`. Every deploy ran the independent
production smoke against the direct Convex host, the canonical `www` host, the
apex redirect, and backend readiness. The AgentMail component ships with a
pinned patch that declares its environment through the host app and makes
finalized outbound rows eligible for deletion after one hour. Until the hourly
bounded sweep removes them, the isolated component table still holds recipient
addresses and plain verification codes. Application tables do not. Cron sweeps
remove expired challenges and finalized provider payloads. Unsubscribe applies
to the whole address. It mutes every follow, revokes every unconsumed management
token, and marks the subscriber unsubscribed. Development proved real email
verification, token rotation, expired-token rejection, signed webhook
validation and idempotency, Google OAuth follow creation, reactive cadence
changes, mute, resume, and removal. Production browser QA loaded a published
issue, opened the live follow sheet, and confirmed development fixture
parameters cannot replace production data. No production subscriber was created
during that read-only pass. One boundary stays open. No natural
provider-signed delivery callback had been observed in production at that
checkpoint. Slice 7C later exercised the outbound path against controlled
development owners without creating a production subscriber.

### PR 7C: deliver immediate and weekly sourced alerts

Suggested title: `feat: deliver sourced follow alerts`

Outcome: accepted material changes record every eligible follow, send at most
one immediate email per owner when selected, and appear once in a non-empty
weekly roundup when selected.

Depends on: 7B and the Slice 5 realtime publication path.

Implementation was split into four stacked pull requests so each review had one
runtime concern: material events and match fanout; immediate delivery and
provider reconciliation; weekly roundups; live notification settings. The
combined stack passed controlled development proof before the first packet
merged.

Preflight status on September 2: PR #70 corrected the `place` resolver so a
supported parish or municipality can be followed. Its Convex regression test
covers every target kind, both place types, and an unsupported parish that must
still fail closed. Production workflow `33682483792` and the independent smoke
passed on merge commit `1ece03d`. Alert fanout can now depend on this contract.

Include:

- match ledger with a stable follow plus material-change dedupe key;
- delivery ledger with a stable owner plus material-change dedupe key so one
  resident does not receive duplicate email when several follows match;
- fanout for issue, topic, body, and place follows;
- map accepted issue topics to the six explicit follow-topic slugs and ignore an
  unknown topic instead of guessing a match;
- treat a newly accepted issue build and an accepted refresh as alert commit
  points for the material publication versions newly linked into that issue;
- do not infer an issue from a first decision publication, and match places
  through the publishing body's jurisdiction rather than `affectedPlaces`;
- wait to notify an issue follower until the refreshed accepted issue version
  contains the changed publication and its public route is readable;
- no notification for withheld, non-material, muted, or unsubscribed records;
- paginated or scheduled fanout within Convex limits;
- enqueue the delivery reservation and AgentMail outbound message in one
  mutation, then let the component action perform the provider request and
  bounded retries;
- concise sourced email, official source links, app link, and management link;
- subscriber-scoped management from a deduplicated email-only alert, while
  enrollment links remain scoped to the follow they created;
- pass the durable component outbound ID as AgentMail's provider idempotency
  key for retry-safe sends;
- provider thread and delivery state;
- an hourly scheduler that claims the Monday 7:00 AM `America/Chicago` window,
  preserves local time across daylight-saving changes, catches up a missed
  claim for 24 hours, and resumes stale pages from their stored cursors;
- owner and roundup-window deduplication, while each entry keeps the follows
  that contributed it so one removed follow cannot suppress another active
  weekly follow;
- suppression of empty roundups;
- connect `/following/notifications` to a Google-owned default cadence for new
  follows and the real immediate and weekly delivery states. Changing the
  default must not rewrite existing follows, and a reactive settings refresh
  must not replace a cadence the resident already chose in an open follow form.

Required tests:

- all target types and owner kinds;
- supported parish and municipality place targets plus unknown issue topics;
- delayed, failed, and accepted issue refresh before an issue-target alert;
- duplicate publication scheduling and partial batch retry;
- withheld and non-material changes;
- component enqueue replay, ambiguous provider result, and duplicate delivery
  webhook;
- unsubscribe race;
- retry to terminal failure;
- empty, duplicate, partial-failure, and preference-changed roundup windows;
- daylight-saving boundaries for the Monday 7:00 AM local claim;
- Google default-cadence changes affect new follows but not existing follows.

Exclude:

- generic newsletters;
- non-material updates;
- reply answers;
- coverage-launch notices.

Proof: one deterministic material change produces one immediate sourced email
per owner and one eligible weekly entry, while replay and overlapping follows
produce no duplicate send.

Status on September 2: PRs #72 through #75 deployed as `8ff1c79`, `d40983a`,
`ec08168`, and `6db32a3`. Production workflows `33706796984`, `33707795958`,
`33708562803`, and `33709247528` passed, followed by an independent smoke after
each merge. A controlled development replay matched government body, place,
issue, and topic follows. It sent two immediate and two weekly AgentMail
messages, resolved every official source, app, and management link, and sent
nothing on replay. The proof exercised both Google and email-only owners and
used no resident address.

### PR 7D: handle grounded replies and private source reports

Suggested title: `feat: handle private resident email replies`

Outcome: verified inbound AgentMail events either continue a sourced alert
thread through the Slice 6 answer path or create a private source-problem thread
without starting evidence processing.

Depends on: 6B, 7B, and 7C.

Include:

- verified inbound sender and thread association;
- add the reply invitation to sourced alert copy only when this handler is live;
- bounded issue context from the matching notification;
- reuse of Slice 6 retrieval and deterministic citation validation;
- one reply send per provider event;
- honest not-found reply with the official contact path;
- private source-report intake from issue, decision, meeting, and Source pages;
- report category, current public URL, short description, and optional official
  URL;
- input limits, rate limits, provider retry, and inline completion states;
- no automatic forwarding or pipeline scheduling.

Required tests:

- forged webhook, unknown sender, wrong thread, and duplicate event;
- grounded and not-found replies;
- provider retry without duplicate response;
- invalid report URL, oversized text, duplicate report, and rate limit;
- zero Firecrawl, OpenAI extraction, or publication jobs from a report.

Exclude:

- public report status;
- FAQ publication;
- correction challenge tables;
- automatic government forwarding.

Proof and release gate:

- Google sign-in and ownership pass in an isolated preview;
- one email-only resident verifies, follows, manages, and unsubscribes;
- one material change produces one sourced alert and no duplicate on replay;
- one non-empty roundup sends and one empty roundup does not;
- one resident reply receives a cited answer or honest not-found response;
- one private source report creates no pipeline run.

## Slice 8: owner-controlled coverage expansion

Slice 8 builds the compiler once, then runs separate onboarding assignments for
each government body. Public requests never start compiler work. A model may
classify candidate sources, but deterministic gates and an owner operation
control promotion.

### PR 8A: establish the controlled compiler and official-root gate

Suggested title: `feat: establish owner-controlled coverage runs`

Outcome: an authorized owner can start, inspect, retry, or cancel an idempotent
compiler run, and unofficial roots stop before paid discovery.

Depends on: 7A owner authorization.

Include:

- compiler run, stage, source-candidate, and finding records with indexes;
- durable stage, attempt, retry, cancellation, and terminal state;
- owner-only functions and stable compiler idempotency key;
- normalized root and redirect-chain contract;
- deterministic HTTPS, response, domain, and government-identity checks;
- allowed subdomains and quarantined cross-domain document hosts;
- stored official-root evidence and failure reasons.

Required tests:

- non-owner access;
- concurrent or replayed starts;
- retry after terminal failure;
- redirect changes, lookalike domains, dead roots, valid subdomains, and
  quarantined document hosts;
- no Firecrawl or model call after a failed root gate.

Exclude:

- public progress;
- source discovery;
- registry activation;
- trusting a model to establish official ownership.

Proof: a known official root creates one durable run, while a lookalike stops
before any paid provider action.

### PR 8B: discover and classify bounded source candidates

Suggested title: `feat: discover and classify official source candidates`

Outcome: Firecrawl maps a verified government root within fixed limits, and
`MODEL_FAST` classifies the resulting candidates without activating them.

Depends on: 8A.

Include:

- action-based Firecrawl map and search stages;
- bounded agenda, minutes, packet, ordinance, resolution, planning, zoning,
  notice, and calendar patterns;
- canonical URL normalization and deduplication;
- verified-domain enforcement and document-host quarantine;
- stored discovery evidence and credit use;
- strict source-classification schema for body, kind, cadence, confidence, and
  no-guess outcome;
- AI Gateway call through the shared provider;
- deterministic validation of every classified URL and copied fact;
- prompt, model, schema, latency, token, and cost evidence.

Required tests:

- recorded map and search responses;
- redirects, duplicates, off-domain links, and provider failure;
- malformed model output, invented URL, wrong domain, uncertain source kind,
  and replay;
- no candidate or model response changing public coverage.

Exclude:

- representative record ingestion;
- registry activation;
- a new model tier.

Proof: one recorded official site produces a bounded classified candidate list,
and rejected candidates remain private and inactive.

### PR 8C: validate representative records and enforce promotion

Suggested title: `feat: enforce evidence gates before coverage promotion`

Outcome: candidate sources run through a representative evidence sample, and an
owner can promote a body only when deterministic code confirms every coverage
requirement.

Depends on: 8B.

Include:

- source-kind and date-window sample selection;
- expected current and historical artifacts;
- reuse of immutable retrieval, extraction, review, and issue workflows;
- metadata-only gold-set linkage;
- missing, stale, parsing, citation, and incomplete-source findings;
- bounded parallelism and cost reservations;
- versioned evaluator for all ten coverage gates in `docs/sources.md`;
- registry proposal diff before activation;
- transactional supported, degraded, paused, and recovered transitions;
- owner confirmation that cannot override a failed gate.

Required tests:

- complete, missing, stale, changed, limited, and withheld samples;
- partial workflow failure and retry;
- each coverage requirement independently blocking promotion;
- concurrent promotion, degradation, recovery, and replay;
- historical public evidence preserved through degradation.

Exclude:

- manual force-pass;
- public beta status;
- deleting old evidence;
- one giant transaction for every source.

Proof: one failed gate blocks promotion, while a passing recorded sample creates
a versioned supported registry without weakening evidence rules.

### PR 8D: operate the compiler and roll out named bodies

Suggested title: `feat: operate coverage expansion by body`

Outcome: the owner can inspect live compiler stages, diagnose failures, retry
the smallest invalid stage, and complete separate evidence-gated onboarding
runs for the named launch bodies.

Depends on: 8A through 8C.

Include:

- owner-only paginated run, cost, finding, and source-health projections;
- realtime stage updates;
- retry from the earliest invalid stage;
- clear distinction between retry, repair, and a new compiler version;
- adapter recommendation only after a repeated documented portal failure;
- separate onboarding assignments for:
  1. Lafayette planning and zoning;
  2. Youngsville City Council;
  3. Alexandria City Council;
  4. Pineville City Council;
  5. Rapides Parish Police Jury;
  6. Baton Rouge Metropolitan Council;
  7. Baton Rouge Planning Commission;
- checked metadata-only gold sets and evidence notes for each body that changes
  repository files.

Required tests:

- owner authorization and bounded pagination;
- retry invalidation without repeating accepted stages;
- private and raw content absent from operations projections;
- current meeting-cycle replay for each promoted body;
- deployed direct source links for each supported body.

Exclude:

- public compiler progress;
- government staff accounts;
- arbitrary edits to accepted evidence;
- combining two portal adapters in one fix PR.

Operational rule: a successful compiler run with no checked-file change does not
need a code PR. If one portal needs an adapter, open one narrow adapter PR for
that portal rather than expanding PR 8D.

Proof and release gate:

- the compiler works without public-triggered provider jobs;
- one difficult portal demonstrates a bounded repair or documented failure;
- every named body has its own gate report;
- only passing bodies appear as supported;
- public claims narrow when a promised body cannot pass.

## Slice 9: public distribution and production hardening

Slice 9 connects the remaining public utilities, proves the full resident loop,
and records submission evidence. Defects found during certification receive
their own narrow PRs.

### PR 9A: complete the public coverage request loop

Suggested title: `feat: complete the public coverage request loop`

Outcome: residents see public-safe body health, can request an unsupported place
without starting compiler work, and may receive one notice after that place
actually passes the coverage gate.

Depends on: 7B, 7C, 8C, and the Slice 5 coverage adapter.

Include:

- bounded public projections for supported, degraded, validating, paused, and
  unsupported bodies;
- source kinds, last healthy time, expected artifact, and public-safe incident;
- area-selector availability from the same projection;
- degraded behavior that keeps dated evidence visible;
- anonymous coverage-request schema, normalization, deduplication, and rate
  limit;
- parish or municipality, optional official homepage, and opaque session owner;
- owner-only aggregate demand query;
- separate AgentMail verification purpose for optional launch notices;
- one promotion-triggered notice with stable dedupe and unsubscribe;
- replacement of coverage and request fixture adapters.

Required tests:

- raw compiler findings and candidate domains remain private;
- equivalent request replay creates one demand record and no compiler run;
- invalid homepage, rate limit, and cross-session privacy;
- unverified requester, failed coverage, duplicate promotion, unsubscribe, and
  provider retry;
- supported and degraded UI states from the same contract.

Exclude:

- public request lists;
- promised launch dates;
- public compiler progress;
- sending before promotion.

Proof: a request creates zero compiler runs, a failed candidate sends nothing,
and one successful promotion sends one notice.

### PR 9B: serve factual issue sharing

Suggested title: `feat: serve factual previews for shared issues`

Outcome: `/share/issues/:slug` returns safe factual metadata from the accepted
issue projection and sends human visitors to the canonical issue.

Depends on: Slice 5 public issue projection.

Include:

- app-owned Convex HTTP route before static-hosting fallback;
- title, place, current state, canonical URL, and restrained preview image;
- correct escaping and behavior for full, limited, withheld, missing, and
  unknown issues;
- cache behavior compatible with publication changes;
- Slice 5 inline copy-link confirmation;
- normal-browser redirect to the canonical issue.

Required tests:

- metadata and escaping;
- injection attempts;
- route precedence;
- canonical destination;
- unknown and withheld slugs;
- Facebook, LinkedIn, X, and normal-browser preview checks.

Exclude:

- model-generated share copy;
- new claims;
- resident-identifying tracking parameters.

Proof: each preview uses only the accepted issue projection and reaches the
correct public issue.

### PR 9C: add private-safe product and provider health

Suggested title: `feat: measure civic actions and provider health safely`

Outcome: Public Parish can count agreed resident actions and provider use
without exposing private chat, email, report, or resident content.

Depends on: working Slice 6 through 9 adapters and provider ledgers.

Production visit and location-setup telemetry landed earlier as a narrow
resident-activation release. This packet extends that allowlist to the completed
resident loop and provider ledgers. It does not replace or reinterpret the
existing browser-level counts.

Include:

- allowlisted aggregate product-event contract;
- events for location setup, evidence opening, Ask completion, not found,
  follows, notification lifecycle, return sessions, reports, and coverage
  requests;
- coarse target type only where needed;
- bounded retention and aggregate queries;
- owner-only model token and cost totals by role and stage;
- Firecrawl credits by source or compiler run;
- AgentMail sends, retries, and terminal failures;
- owner-visible daily ceiling state;
- indexes and bounded time windows.

Required tests:

- arbitrary event names and content-shaped properties rejected;
- question, email, report, and exact-address strings cannot enter analytics;
- owner authorization for provider health;
- empty windows and limit calculations;
- public queries cannot return private provider or resident data.

Exclude:

- page impressions as civic proof;
- user-facing popularity metrics;
- a broad admin product;
- raw resident content.

Proof: the owner sees bounded counts and costs, while private strings fail the
event contract and cannot be queried publicly.

### PR 9D: certify the production resident loop

Suggested title: `test: certify the production resident loop`

Outcome: the exact release proves public routing, provider security, the
resident loop, realtime change, email outcome, and submission claims.

Depends on: 9A through 9C and every Slice 6 through 8 release gate.

Include:

- explicit HTTP route order for auth, Firecrawl, AgentMail, share HTML, health,
  and static fallback;
- signature, request-size, and method bounds for webhooks;
- direct refresh checks for every dynamic public route;
- apex path and query preservation;
- end-to-end signed-out area, issue, Source, two-turn Ask, and not-found flows;
- Google and email-only follow paths;
- material change, realtime page update, alert, reply, roundup, and unsubscribe;
- degraded coverage, request, launch notice, and share flows;
- keyboard, screen-reader, reduced-motion, 320-pixel, and 375-pixel checks;
- negative authz, duplicate webhook, retry, expiry, and rate-limit checks;
- root `hackathon.md`, product status, architecture status, exact workflow,
  production smoke, costs, demo, and submission evidence;
- explicit real-versus-replay labels and confirmed user results only when proof
  exists.

Required proof:

- full suite passes against an isolated deployment before promotion;
- the exact production workflow passes after an authorized merge;
- independent production smoke passes;
- one real or clearly labeled replay demonstrates source change, publication,
  realtime UI, notification, and reply;
- a signed-out reviewer opens the repo, app, issue Source, share link, and demo;
- every written claim resolves to repository or runtime evidence.

Exclude:

- live personal email addresses in test fixtures;
- hidden production fixture success;
- invented users, outcomes, costs, or judge claims;
- submission itself without separate user authorization.

Any defect found during certification gets its own narrow fix PR. PR 9D records
and proves the finished release. It does not absorb unrelated repairs.

Slice 9 release gate:

- every required integration works publicly;
- exact production workflow and independent smoke pass;
- direct sources and dynamic routes work;
- final mobile, accessibility, privacy, authz, retry, and cost checks pass;
- feature scope is frozen before the final proof run.

## Agent assignment template

Give an implementation agent one packet at a time:

```text
Implement PR [ID] from docs/post-slice-5-pr-plan.md.

Read AGENTS.md and the canonical product documents first. Read
convex/_generated/ai/guidelines.md before touching convex/. Keep the PR to the
named outcome and obey its exclusions. Inspect the current branch because prior
packets may have changed the exact file layout.

Build the complete vertical behavior, including validators, indexes,
authorization, negative tests, the matching frontend adapter, and
evidence-based documentation. Do not call production services or operate on
production data without separate approval.

Run npm run verify and git diff --check. Report the changed behavior, tests,
remaining fixture boundary, deployment effect, and runtime proof still needed.
Do not merge or deploy unless explicitly asked.
```

Use the repository's `convex-expert` guidance for Convex code and
`convex-agent` guidance for Slice 6. Check pinned local packages and
version-current official documentation before using auth, provider, component,
or framework APIs.

## Merge and release rhythm

- Merge packets in dependency order.
- Keep at most one schema-changing PR per dependency lane in flight.
- A passing PR proves code, not a provider call or resident result.
- Use development runtime proof before requesting merge for model, auth,
  webhook, email, compiler, and cron behavior.
- State plainly that merging to `main` deploys production.
- After an authorized merge, watch the exact production workflow and run the
  independent production smoke before calling the release ready.
- Keep production crawling, model calls, email sends, and compiler promotion as
  separately authorized operations.

## Work outside pull requests

These tasks belong in the roadmap but should not become artificial code PRs:

- provider-account and callback configuration;
- cost approval and controlled production evidence runs;
- successful source onboarding runs with no checked-file changes;
- recruitment and observation of real residents;
- Facebook, TikTok, X, and LinkedIn publishing;
- live-source timing or deterministic replay capture;
- demo recording;
- vibeapps.dev submission.

Record those outcomes in `hackathon.md` only after direct evidence exists.
