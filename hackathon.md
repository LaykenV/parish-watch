# Hackathon log

- **Project:** Public Parish
- **Event:** Convex All Gas Hackathon
- **What it does:** Establishes a source-cited service for discovering, understanding, questioning, and following consequential Louisiana local-government decisions.
- **Live app:** https://befitting-flamingo-587.convex.site
- **Repo:** https://github.com/LaykenV/public-parish
- **Frontend:** Convex static hosting
- **Convex deployment:** https://befitting-flamingo-587.convex.cloud
- **Components:** `@convex-dev/static-hosting`, `@firecrawl/firecrawl-convex`, `@convex-dev/workflow`, `@convex-dev/rate-limiter`, `@convex-dev/agent`, `@convex-dev/auth`, `@agentmail/convex`
- **Convex features:** queries, mutations, internal actions, HTTP actions, realtime queries, file storage, scheduled functions, durable workflows, authentication
- **Auth:** Convex Auth with Google OAuth, verified on the development, production custom-domain, and qualifying `convex.site` flows
- **AI models:** `openai/gpt-5.6-terra` for `MODEL_STRONG` extraction, consequence factors, and issue linking; `openai/gpt-5.6-luna` for `MODEL_FAST` independent review and Ask through Convex AI Gateway
- **Started:** 2026-08-27T04:38:41Z
- **Last updated:** 2026-09-02T20:52:56Z

## Log

### 2026-09-02 - working tree

Corrected Place follow validation so supported parishes and municipalities use
the same enrollment path. Added deterministic Convex tests for issue, topic,
government-body, parish, and municipality targets, plus rejection of a parish
that has not passed the coverage gate (`convex/follows/targets.ts`,
`convex/follows.test.ts`). Automated validation remains with pull-request CI.

### 2026-09-02 - 8fc4642

Built the two-PR Slice 7B follow stack. The backend adds verified email
subscribers, hashed challenges and access tokens, encrypted delivery addresses,
Google-owned and email-owned follows, notification preferences, signed AgentMail
webhooks, bounded rate limits, and cleanup for expired verification data and
finalized component messages. The AgentMail component receives its declared
environment through the host app and keeps remote maintenance functions private
(`convex/follows/`, `convex/http.ts`, `convex/crons.ts`,
`patches/@agentmail+convex+0.1.0.patch`).

The resident follow sheet now sends and verifies real email codes, resumes a
Google follow through a URL-safe one-time intent, and reports expiry, retry, and
provider failures. The email management route loads one token-scoped follow,
updates its cadence, rotates the token, and removes the follow. Signed-in Google
users receive a reactive Following page with update and removal controls
(`src/features/following/`, `src/features/auth/google-auth.ts`). A development
browser completed enrollment, token rotation, old-token rejection, signed
webhook idempotency, and a Google-owned follow through the full OAuth return.
The signed-in Following page showed the new target, changed its cadence
reactively, and restored the requested weekly setting before the test session
signed out. A second development proof muted that weekly follow, kept weekly as
its resume cadence, and restored weekly delivery. The email-only management
fixture also changed from muted to following when its schedule-save action
resumed delivery.

PR #66 deployed the backend as `fdfebd8` through production workflow
`33672529400`. The workflow and independent production smoke passed the direct
Convex host, canonical `www` host, apex redirect, and backend readiness query.
The updates inbox and two new cryptographic keys are configured in production.
The AgentMail webhook is registered for outbound lifecycle events, and its
provider-issued signing secret is configured without exposing it in repository
history or logs.

PR #67 deployed the resident enrollment and management interface as `8fc4642`
through production workflow `33675616509`. Fresh PR checks ran against the
merged backend before release. The workflow and a second independent production
smoke passed both served hosts, the apex redirect, and backend readiness. A
production browser loaded a published issue, opened the live follow sheet, and
confirmed that a development fixture query could not replace production data.
The complete email, token rotation, signed webhook, Google OAuth, and reactive
management flows passed in development. A natural provider-signed production
delivery callback was not forced during the read-only production browser proof.

### 2026-09-02 - 8ea38af

Hardened issue linking after real launch-data runs exposed two evidence gaps.
PR #61 requires each issue claim to cite every excerpt needed for its complete
wording. PR #63 accepts scaled currency such as `$1.2 million` without treating
an unmarked quantity such as `1.2 million residents` as money. PR #64 moves the
linker to prompt v1.5 and names every allowed dynamic fact path, including the
required lifecycle fact, while excluding link relationship fields. The full,
limited, or withheld publication policy stays unchanged (`convex/issues/`,
`convex/extraction/textMatch.ts`, `convex/pipeline/state.ts`).

### 2026-09-02 - f725094

PR #58 deployed Google account sign-in and private saved areas and topics. It
also published the resident privacy notice. The first production workflow
stopped before deployment because the Convex auth config read the platform site
URL through the unavailable Node `process` global. PR #59 replaced that access
with Convex's generated typed environment value and merged as `f725094`.
Production workflow `33587446687` then deployed the backend and frontend,
seeded source configuration, and passed its smoke. The independent production
smoke passed both served origins, the apex redirect, and the backend readiness
query.

A real Google sign-in completed on `https://www.publicparish.com`, returned to
the saved areas and topics page, and signed out. A second sign-in started on the
qualifying `https://befitting-flamingo-587.convex.site` origin, handed the flow
to the canonical `www` origin, used the canonical callback, and returned signed
in without a cross-origin flow error. The test account signed out after the
proof. The privacy notice and its deletion contact rendered on both production
origins. No saved area or topic was added during production testing.

### 2026-09-01 - working tree

Mounted the pinned Convex Auth v2 alpha core and Google OAuth for Slice 7A.
Verified Google profiles create private users, and every saved-area or topic
query derives ownership from the signed JWT subject. Indexed, idempotent
mutations reject anonymous callers and unsupported launch targets. The resident
account route now separates the live Google setup from the development follow
and notification fixtures. A real development Google callback completed, saved
Lafayette Parish, survived a reload, and removed the saved area after the proof.
The production release and production callback proof remain pending
(`convex/auth.ts`, `convex/auth/`, `convex/follows/savedSetup.ts`,
`src/features/auth/`, `src/features/following/`). A public privacy notice now
states the live account, Ask, analytics, provider, retention, and deletion
boundaries required before publishing the dedicated Google consent screen
(`src/routes/privacy.tsx`, `src/features/privacy/`).

### 2026-09-01 - 13f735b

PR #56 deployed the high-reasoning Luna selector and answer flow as `adc0a34`
through production workflow `33560561545`. The selector sees the complete
current catalog and every accepted excerpt in scope. Code expands its selected
records, then the answer call receives their hash-checked normalized official
documents. Broad or invalid selections use the full scope, while a valid
not-found selection skips the answer call. App-wide request limits prevent
anonymous session rotation from creating unlimited calls. Record, excerpt, and
document-byte guards fail before model generation instead of truncating the
prompt. Provider token use remains private telemetry, not an answer limit.

PR #57 deployed the citation-display correction as `13f735b` through workflow
`33562735003`. A controlled production corpus question selected both Lafayette
surplus-pickup decisions and named Terrebonne Parish Consolidated Government
from accepted evidence. Four Source controls opened official evidence, and the
answer showed no raw internal evidence IDs. The exact issue Ask path and the
production smoke passed again. One answer rendered Markdown emphasis markers as
literal text, so that pre-demo display correction remains. This was test
traffic, not resident adoption.

### 2026-09-01 - 5679fa3

Deployed the resident-facing issue index and For You replacement through PR
#54 as `5679fa3`. Home reads the bounded accepted-issue and
decision queries, shows Lafayette and Rapides timelines before compact atomic
records, and keeps equal-weight issue cards because no resident-facing
importance score is published. Explore now searches accepted issues before
individual records. Primary navigation is Home, Explore, Ask, and Coverage.
`/for-you` redirects to Home, `/issues` redirects to Home's issue section, and
the cited issue detail routes remain stable. Development fixtures passed browser
inspection at 375 and 1280 CSS pixels with no horizontal overflow.
Production workflow `33533462706` and the independent production smoke passed
(`src/features/discovery/home.tsx`, `src/features/discovery/explore.tsx`,
`src/features/discovery/explore-model.ts`, `src/routes/for-you.tsx`,
`src/routes/issues_.tsx`).

Closed the Slice 5 data gate with two production issue builds. Terra linked
the accepted records, Luna reviewed the proposed facts independently, and
deterministic checks published full issue versions. The two builds used AI
Gateway and cost an estimated $0.088413 combined. A live subscriber first
received no Rapides millage issue, then received the accepted issue 10.8
seconds later on the same connection.

Added private evidence-scoped Ask threads for PR 6A. The browser keeps an opaque
token while Convex stores its SHA-256 hash. Scheduled expiry detaches access
after 24 hours. The Agent component owns threads and messages, while Public
Parish authorizes each call and retrieves only bounded current citations. A
development proof created a thread, saved one question, resumed its history,
and returned the exact LOATF Source links. Model answers remain out of this PR.

Built the stacked PR 6B answer path in the working tree. It pins
`@convex-dev/ai-sdk-provider` 0.1.0 and AI SDK 7.0.34, calls `MODEL_FAST`
through the Convex gateway, sends only bounded thread context and retrieved
published evidence, and validates every returned evidence ID before the Agent
component stores the assistant message. A private receipt and attempt ledger
records route, model, tokens, latency, estimated cost, and bounded safe errors
without copying resident questions or answers. Deterministic not-found answers
skip the model call. The exact stacked answer head later reached the personal
development deployment. A real `openai/gpt-5.6-luna` call returned a strict
answer with current Lafayette citations. A follow-up first exposed retrieval
that ignored its prior question. The corrected path combined that bounded prior
question with the current turn and returned the same current pickup records.
An unsupported volcano question returned not found without citations. PR #47
later deployed this answer path as `9ae0467` through production workflow
`33517184457`.

Built the stacked PR 6C resident connection in the working tree. The real
adapter keeps only opaque session and thread handles in browser storage, opens
Agent history after refresh, and projects accepted citation records into the
existing Source panel. It covers supported, not-found, expired, offline,
cooldown, retryable, and terminal states. One mutation now claims one answer at
a time, applies per-session request limits, and reserves 15,000 tokens against
both a 30,000-token minute and a 150,000-token day before any model call. The
same reservation counts against app-wide ceilings of 150,000 tokens per minute
and 1,500,000 tokens per day, so rotating browser sessions cannot remove the
production spend bound. The app-wide counter keeps the full reservation after
an accepted claim, including no-evidence results. That trades some daily
capacity for a simple hard ceiling.
Successful attempts reconcile known usage. Unknown failed work and abandoned
work consume the reservation. A no-evidence path releases it because that path
skips the model. The CAPTCHA adapter remains inactive. Automated
pull-request checks run in GitHub Actions. The exact stacked head reached the
personal development deployment. At 375 pixels, a signed-out browser completed
the real two-turn conversation, restored both turns from Agent history after a
refresh, and opened exact citation records in the mobile Source drawer. Escape
returned focus to the Source control. Browser storage contained only the opaque
session token and thread handles, not question or answer text. The not-found and
offline states passed, live status announced the completed answer with its
source count, and the page had no horizontal overflow. At 1280 pixels the same
source opened in the 320-pixel docked evidence rail.

PR #45 deployed the private thread foundation as `c9ea441` through workflow
`33515579521`. PR #49 deployed the final bounded Ask interface as `30dc267`
through workflow `33518827257`. Exact head `e1cd4b1` adds app-wide minute and
daily token ceilings that survive anonymous session rotation. A production
issue-scoped test then completed two related cited turns. Both answers used the
accepted `CO-022-2026` and `CO-023-2026` citations, and their Source controls
opened the exact supporting minutes spans. An unsupported question first
entered the safe retry state; its fenced retry returned evidence not found with
no citations. After refresh, the issue thread remained in Recent on this device,
and reopening it restored all three turns. Implementation Slice 6 is closed.

### 2026-09-01 - bdc0195

Connected accepted decision publications and exact citations to the finished
resident decision and meeting routes. Discovery now opens the Public Parish
record before the original source. A bounded development backfill grouped three
meeting-bearing records, and the Aug. 25 Rapides view resolved two current full
decisions from one accepted meeting time. The issue query stays closed when an
issue points at superseded decision versions. PR #44 deployed through workflow
`33463800155`; its workflow smoke and the independent production smoke passed.

### 2026-09-01 - 070958e

Removed the stale Lafayette board-vacancy projection from the production
resident feed without deleting its decision record or linked publication
evidence. The legacy record now has no current publication pointers. The
production resident query returns 26 publications and exactly one
board-vacancy card, under `CITY-BOARD-APPLICATIONS-2026-09-15`. This was a
one-time data correction. It did not add a withdrawal workflow or resident
correction product.

### 2026-09-01 - 85d6947

Deployed resident-interface Design Slice 8 through PR #43. Bounded return paths
preserve Explore filters, record context, Ask scope, and Following context across
route changes. Discovery and meeting links keep the matching development
evidence scenario, and Coverage uses one written request vocabulary. The code
handoff names the contract, readiness gate, fixture owner, and future API owner
for every resident destination. GitHub Verify and PR-Agent passed on the final
head. Production workflow `33454522729`, the independent production smoke, and a
live fixture-boundary check passed (`src/features/resident-handoff/`,
`docs/resident-interface-slice-8.md`).

### 2026-08-31 - c180659

Corrected the public coverage flow after a focused review. Successful request
and private-report states now move keyboard focus into the next useful control
or heading. Fixture parameters stay tied to active development scenarios, and
the public method page names deterministic checks as the final publication
gate. Automated validation is pending in pull-request CI
(`src/features/coverage/`, `docs/resident-interface-slice-6.md`).

### 2026-08-31 - d1bcdb8

Deployed anonymous resident telemetry through PR #41. Pull-request verification
passed, production workflow `33444625765` deployed the exact merge, and an
independent production smoke passed both served origins, the canonical asset,
the apex redirect, and the readiness query.

A controlled browser check started from zero counters. Loading the canonical
domain and the required `convex.site` origin, then selecting Lafayette on the
clean origin, produced 2 unique browser identifiers, 2 visits, 1 activated
visitor, and 1 Lafayette selection. One human tester created both identifiers
because browser storage is origin-specific. These rows prove that production
visit and activation writes reach the private report. They are controlled test
traffic, not two users or evidence of resident adoption.

### 2026-08-31 - 3393b19

Added production-only anonymous visit and area-selection telemetry. Fixed event
contracts update deduplicated browser, event, and aggregate rows in one Convex
mutation. The private report separates unique browsers, 30-minute visits,
activated visitors, 24-hour returns, and area counts. A bounded daily cleanup
removes browser identifiers and events after 90 days. The browser sends a hash
of a random local identifier, never resident content. A same-origin HTTP route
keeps the write mutations internal, validates the exact payload, and applies
per-browser and global limits. The counts remain unauthenticated product
signals. Browsers that cannot persist the random identifier are excluded rather
than recounted after each reload. Automated validation is pending in pull-request CI (`convex/analytics/`,
`src/features/analytics/product-analytics.tsx`).

### 2026-08-31 - dd5501e

Deployed the repeatable launch-data promotion through production workflow
`33435833908`; the independent production smoke passed the Convex origin,
canonical domain, apex redirect, and readiness query. Seventeen included
official PDFs matched their development hashes before extraction.

The run published 26 launch records: 15 Lafayette, 9 Rapides, and 2 East Baton
Rouge. Fifteen are full and 11 are limited. The Rapides negative control
returned `not_found`, and replay reused all 27 successful extraction run IDs
without new model calls. Three targets stayed out after repeat exact-citation
validation failures. At promotion time, the resident query also exposed one
older duplicate Lafayette board-vacancy card, which raised the public count to 27. The September 1 production-data correction above removed that stale
projection while preserving its record and evidence
(`docs/production-batches/launch-data-2026-08-31.v1.json`,
`convex/operations/seed.ts`).

### 2026-08-31 - 432645b

PR #33 fixed review completion budgets for high reasoning effort, merged as
`fd03192`, deployed to production, and passed the independent production smoke.
PR #35 moved review findings onto exact fact paths or `null`; a development
retry then published the previously blocked Rapides millage-election record as
limited. It merged as `434c263`. Exact production workflow `33419095880` and an
independent production smoke passed.

PR #36 fixed displaced PDF superscript text that blocked a valid lifecycle
citation. Extraction processor v1.17 restores the paired ordinal suffix without
weakening changed-text checks; the Pafford EMS contract then validated,
reviewed, and published limited. It merged as `432645b`. Production workflow
`33419981241` timed out during its first static-file upload after deploying the
backend. Attempt 2 completed the backend and frontend deploy, production seed,
and workflow smoke. An independent production smoke also passed.

The bounded data runs ingested four East Baton Rouge and four Rapides official
PDFs, published seven limited records, retained two negative cases, and replayed
without new snapshots or model calls. Production was not used for those data
runs (`convex/extraction/textMatch.ts`, `convex/review/`,
`convex/pipeline/state.ts`).

### 2026-08-31 - Design Slice 7 review

Implemented resident-interface Design Slice 7 for pull-request review. Shared
route completion now updates the page title and focuses the new heading, which
reads the page name once instead of twice. Loading actions keep their written
label inside a mirrored spinner slot that holds the width and keeps the label
centered. Discovery refreshes announce accepted updates, sheets focus their
written Close control and return focus after a delay read from the
`--dur-standard` motion token, Explore's search input stretches to fill its
field, and reduced-motion rules cover resident transitions and spinners. A browser sweep
checked 14 development routes at 320, 375, 414, 768, 1280, and 1440 CSS pixels.
All 84 frames had one main region, a visible page heading, named visible form
fields, full-size written controls, and no page-level horizontal overflow.
Automated validation remains with pull-request CI
(`src/features/resident-blueprint/`, `src/features/discovery/`,
`src/components/ui/button.tsx`).

### 2026-08-31 - 0853f69

Implemented resident-interface Design Slice 6 against explicit development
fixtures. Coverage now explains five written source-health states body by body,
keeps accepted records distinct from complete coverage, records coverage demand
without starting source work, explains the evidence method, and sends source
problems through a private form. Production routes remain unavailable until
their real coverage, request, and private-delivery paths pass their gates.
Browser checks covered the request, email verification, duplicate, rate-limit,
notice-delivery failure, follow, area-selector, and report paths from 320
through 1440 CSS pixels without application overflow. Automated validation
remains with the pull-request checks (`src/features/coverage/`,
`src/routes/coverage*`, `src/routes/how-it-works.tsx`).

### 2026-08-31 - adfe81e

PR #31 deployed resident-interface Design Slice 5. Exact production workflow
`33401768387` and the independent smoke passed the Convex host, canonical
domain, apex redirect, asset delivery, and production readiness query. The
deployed code keeps follows unavailable until Auth and AgentMail pass their
integration gates.

### 2026-08-31 - 9d6751d

PR #31 review found that muting a target could discard a cadence change that
the resident had not saved yet. The management sheet now owns one cadence draft
per opening. Mute and resume leave that draft visible, while closing without
saving discards it. The exact choose-weekly, mute, close, and reopen sequence
was replayed in the browser without overflow or runtime warnings. GitHub Actions
will rerun the automated gate after the fix is pushed.

### 2026-08-31 - f0b46ec

Implemented resident-interface Design Slice 5 against development-only typed
fixtures. The new follow flow preserves the chosen cadence through equal Google
and email-only paths, keeps the target, cadence, and destination visible, and
does not show `Following` before the fixture confirms the action. Following,
saved areas and topics, notification preferences, immediate and roundup email
layouts, and scoped email-only management now replace their low-fidelity route
blueprints.

Production still has no Convex Auth or AgentMail follow integration. Routes
without an explicit development fixture show an honest unavailable state and
load no fixture subscription data. Browser checks covered 320, 375, 390, 1280,
and 1440 CSS pixels without horizontal overflow. The email verification path,
Google return, empty and degraded lists, frequency changes, mute, one-target
unfollow with Undo, saved-area add and removal, and expired management links
were exercised manually. The email management page also opens on the cadence
saved by that subscription.
Automated validation remains deferred to pull-request CI
(`src/features/following/`, `src/routes/following*`,
`src/routes/email.manage.$token.tsx`).

### 2026-08-31 - ff36c1b

PR #28 merged the Ask Public Parish interface as `ff36c1b`. Production workflow
`33389489990` succeeded for that exact commit. This session did not repeat the
independent production smoke.

### 2026-08-30 - PR #28 review

Implemented resident-interface Design Slice 4 (Ask Public Parish) and opened
PR #28. The review record below predates the later `ff36c1b` merge.

The route renders corpus, issue, and meeting scope behind a hard production
availability gate: a two-question cited thread on the real CO-022-2026 and
CO-023-2026 records, not-found, checking, expiry, cooldown, CAPTCHA, retryable
and terminal provider failures, offline, recent same-device handles, and the
shipped evidence viewer with multi-source claims. The private `q=` URL handoff
is replaced by an in-memory draft that never enters a URL or history state.
Eleven presentation scenarios load through a DEV-only dynamic import;
production never requests the fixture module.

The first `npm run verify` run passed on the branch with 194 tests across 23
files, typecheck, the production build, prerender, and lint. A later ship review
added focused Ask coverage for route privacy, scope restoration, in-memory draft
consumption, citation accounting, production fixture gating, duplicate-submit
protection, the compact thread composer, and named official contacts. GitHub
Actions owns validation for the follow-up commit.

The follow-up reviewer found that the existing scope-change confirmation was
attached to a recent-list branch that could not run. Route scope changes could
therefore clear an active thread without asking. The confirmation now intercepts
the real route transition, keeps the current scope and conversation on cancel,
and starts the new scope only after confirmation.

The next reviews caught four related edge cases. Corpus scope identity dropped
the selected public area, and canceling a cross-scope handoff discarded its
draft. Corpus identities now retain the area key. Cancel restores the old route
after saving the incoming draft to its in-memory scope handoff, and unrelated
scope transitions no longer consume that draft. Opening a recent conversation
now updates the public route to the conversation's scope instead of leaving the
URL on the previous evidence scope.

Four checked-in fixes came out of CI and review rather than from me reading the
diff first. Verify caught a decision page still passing the old string scope,
then seventeen lint errors in the new module. The reviewer then found two real
defects: the record pages invited a question and dropped it at the unavailable
gate, and the page cleared its own cooldown while the adapter kept refusing, so
Send did nothing at all. A third finding about a stale closure in the expiry
sweep was wrong and was dismissed with a written reason; the effect closes over
the conversation object, so the field is read fresh on every tick.

The adapter contract needed three additions the handoff did not specify:
`subscribe` for the realtime channel a Convex backend will own,
`resolveChallenge` for the abuse adapter, and `clearRecent` because the adapter
owns same-device handle storage.

No chat backend exists behind any of this. Ask stays in production navigation
showing the honest unavailable state, and the record pages show that same
message instead of a composer.

### 2026-08-30 - 3a59e45

PR #27 passed its first GitHub verification run. PR-Agent found an inherited-key
crash in citation URL validation and three fixture rows whose destination did
not match their displayed record. Citation lookup now requires an own property.
The unsupported water-meter record link is gone, and the April meeting rows
open matching routine records. New invariants cover inherited citation ids and
meeting-row title mismatches. Revalidation is deferred to the next PR checks
(`src/features/evidence/contracts.ts`, `src/features/evidence/record-fixtures.ts`).

The next full-context review found two responsive defects. Accepted detail
labels and values now stay together in the content column instead of entering
the evidence gutter. The mobile drawer retains its last citation and size until
the close transition finishes. Browser checks measured aligned definition rows
at 1,280 pixels with no overflow and kept the excerpt visible during the
390-pixel drawer exit. Automated revalidation remains with PR checks
(`src/features/evidence/decision-page.tsx`,
`src/features/evidence/evidence-surface.tsx`).

The final full-context review found that static imports still placed the
development evidence fixtures in the production JavaScript graph even though
the runtime gate prevented rendering them. Route loaders now fetch the fixture
modules through development-only dynamic imports. The production build can
drop the fabricated excerpts entirely. Citation URLs opened without a click
now record the first matching Source control as their focus-return target. The
next PR checks own automated revalidation
(`src/features/evidence/evidence-page.data.ts`,
`src/features/evidence/evidence-surface.tsx`).

PR #27 merged as `3a59e45`. GitHub verified typecheck, 194 tests across 23
files, the client and server builds, prerender, and lint on the final branch
head. PR-Agent reviewed that exact head with no major or security findings.
Production workflow `33332573558` deployed the backend and frontend, seeded the
source configuration, and passed its smoke. The independent production smoke
then passed the direct Convex host, canonical domain, apex redirect, and backend
readiness query.

### 2026-08-30 - ac0cc55

Implemented resident issue, atomic decision, meeting, and citation-level
evidence pages against explicit development fixtures. Material claims open an
exact official excerpt in a mobile Coss drawer or desktop evidence rail, keep
the selected citation in the URL, and return focus to the opening Source
control. Full, limited, delayed, historical, uncertain, before-minutes,
after-minutes, and live-update states are covered. Production builds ignore the
fixture parameters and render recovery pages because real detail queries are
not connected. Runtime checks at 320, 390, and 1,440 pixels found no horizontal
overflow. `npm run verify` passed typecheck, 194 tests across 23 files, the
production builds, prerender, and lint. No deployment is claimed
(`src/features/evidence/`, `docs/resident-interface-slice-3.md`).

A review pass then hardened the evidence viewer. Closing the desktop panel
returns focus to the opening Source control in an effect after the commit
instead of inside a requestAnimationFrame, so the restore no longer depends on
the browser painting a frame. Escape closes the panel, the Source controls
aria-controls target exists while nothing is selected, and the live-update
fixture matches the timeline entry it moves by its date instead of a
hard-coded string. The open, close, Escape, focus-return, and deep-link paths
were checked in the local browser. Suite re-validation is deferred to the pull
request checks (`src/features/evidence/evidence-surface.tsx`,
`src/features/evidence/evidence-model.ts`).

### 2026-08-30 - 409a3e1

Connected Home, For You, and Explore to current full and limited atomic
publications through a bounded public Convex query. The query returns only
accepted resident fields, hides withheld versions, and fails closed on stale
publication pointers. Live cards identify themselves as published decision
records and open the accepted official source. They do not invent issue
ranking, topics, or consequence text. Explicit fixture URLs still drive
development QA and remain disabled in production. The development deployment
returned four accepted records. `npm run verify` passed typecheck, 169 tests
across 21 files, the production builds, prerender, and lint. Production-preview
checks at 390 and 1,440 pixels found no horizontal overflow, rendered four
official-source links, and ignored fixture parameters. PR #26 merged this exact
commit and the production release passed its workflow and independent smoke
(`convex/resident/discovery.ts`, `src/features/discovery/`).

### 2026-08-30 - b22e321

Deployed the Slice 2 owner phone-review refinements through PR #25. Production
workflow `33324166404` verified the merge, deployed the backend and frontend,
seeded source configuration, and passed its smoke. The independent production
smoke then passed the direct Convex host, canonical domain, apex redirect, and
backend readiness query. A live 390-pixel check confirmed one-color Watching
text, the Louisiana Coverage icon, 44-pixel Coverage actions, no fixture banner,
and no fixture state at `?fixture=update`. The fixture URLs remain
development-only. No production resident projection is claimed.

### 2026-08-30 - 0eed59c

Extended the production fixture gate to every scenario-derived state, including
signed-in areas, update rows, degraded notices, empty scenarios, and section
failures. A production preview at 390 pixels checked all 14 Home, For You, and
Explore fixture scenarios. Each rendered zero fixture cards, update rows,
failure states, fixture notices, and known fixture copy without horizontal
overflow. Development checks still rendered the explicit update, signed-in, and
section-failure scenarios. `npm run verify` passed typecheck, 163 tests across 19
files, the production client and server builds, prerender, and lint. No
deployment is claimed (`src/features/discovery/`).

### 2026-08-30 - ee05d8d

Closed a review finding that unlabeled fixtures could look like real civic
records. Development builds now require an explicit `?fixture=` scenario before
rendering fixture records. Production builds ignore fixture parameters and show
an honest empty state until the resident projection is connected. A production
preview at 390 pixels rendered zero fixture cards on Home, For You, and Explore,
including URLs with `?fixture=update`. The same URLs still rendered the full QA
states on the development server. `npm run verify` passed typecheck, 163 tests
across 19 files, the production client and server builds, prerender, and lint.
No deployment is claimed (`src/features/discovery/`).

### 2026-08-30 - 6cd03da

Refined the Slice 2 resident hierarchy after a phone review. Decision cards now
use a ruled header, status pill, evidence footer, and the shared Coss primary
and outline button treatments. "Watching" uses the main text color, and the
Coverage navigation item uses the Louisiana outline instead of a shield.
Resident pages no longer show fixture banners. The existing `?fixture=` query
states remain silent QA controls and do not prove production data. Browser
checks at 320, 375, 390, 414, 768, 1280, and 1440 pixels found no horizontal
overflow. At 390 pixels, every tested standalone resident control measured 44
pixels tall. `npm run verify` passed typecheck, 162 tests across 19 files, the
production client and server builds, prerender, and lint. No backend, provider,
production feed, or deployment is claimed
(`src/features/discovery/`, `src/features/resident-blueprint/`).

### 2026-08-30 - 64e3f72

Completed a controlled Lafayette City Council production onboarding from eight
official PDFs. Production now has full current publications for CO-062 as
postponed, CO-069 as decided, and CO-072 as scheduled. Every published material
field has an exact citation into an immutable snapshot. The board-vacancy item
remains a limited source-only publication because the agenda does not support
the required timezone offset for its deadline. PRs #15 through #23 deployed the
retrieval, lifecycle, review, and Firecrawl formatting fixes that the batch
exposed. No production issue build, importance assessment, or resident feed
projection ran.

### 2026-08-30 - 4e2ac67

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

The September 1 agenda exposed a separate citation mismatch after Terra copied
visible paragraph text from Firecrawl Markdown. Firecrawl wrapped each PDF line
in underscore emphasis and expanded the visible council email address into a
matching `mailto:` link, so seven exact citations failed deterministic checks.
Citation normalization now removes only whitespace-bounded underscore emphasis
and matching email link syntax while preserving displayed text and punctuation.
Processor `v1.12` prevents reuse of those failed attempts. Tests cover the exact
agenda shape and reject changed addresses, dates, punctuation, and mismatched
link destinations. No production retry or publication is claimed.

That deadline record exposed one more deterministic mismatch. Its official
text says resumes are due at "noon," while the candidate stores the exact
zoned time as 12:00. Time matching now recognizes deadline phrases ending in
that word and rejects incidental mentions, other times, and unsupported
seconds. Extraction processor
`v1.13` keeps the corrected attempt distinct from the earlier failed runs. No
production retry or publication is claimed.

Production deadline run `jd7f5xh088k0zwepdh2nfxpx918dewb3` on processor
`v1.13` reached Terra, then failed closed with six `citation_not_found`
findings. A forced-fresh Firecrawl reproduction with `maxAge: 0`, matching the
second PDF scrape during ingest, wrapped each visible deadline paragraph line
in single-star emphasis, kept the email address as plain text, and inserted
repeated spaces between spans. Citation normalization now unwraps only complete
whitespace-bounded `*span*` runs. It preserves bullets, horizontal rules,
double-star formatting, unmatched or internal asterisks, dates, punctuation,
and changed source text. Extraction processor `v1.14` makes a corrected attempt
distinct. No production retry or publication is claimed.

Browser checks passed at 375, 768, 1024, 1025, and 1440 pixels without
horizontal overflow. A later computed-style check measured 125 pixels of
combined app chrome at 390 pixels wide, below the 8-rem budget, and confirmed
the sticky desktop header at 1280 pixels. `npm run verify` passed 146 tests,
typecheck, production client and server builds, prerender, and lint. Every
unfinished action remains inert and labeled. No API, resident data, provider
call, or working production feature is claimed. PR #14 deployed the labeled
blueprint as `6e46fd7`
(`docs/resident-interface-plan.md`, `docs/resident-interface-slice-1.md`,
`src/features/resident-blueprint/`, `src/routes/`).

Completed Slice 2 repair work after code and responsive-layout review. Every
fixture view now identifies its data as design-only. Explore restores only
supported URL filters, applies topic and evidence filters to matching record
types, sorts dated and undated results correctly, and lets the forced empty
fixture override the browse catalog. Mobile filters and area selection use a
downward-swipe Base UI drawer, while desktop uses a dialog. One Coss UI Button
size now gives standalone discovery actions a measured 44-pixel height.
The area setup has one trigger, rail-card actions align, and the lead issue
action has clear priority. Computed DOM checks passed at 320, 375, 390, 414,
768, and 1280 pixels without horizontal overflow. Date-only records now keep
their Chicago calendar day in other visitor timezones. Each More filters group
can be cleared without removing the query or unrelated filters. Sort appears
only when Explore shows a sortable result sequence. `npm run verify` passed 160
tests across 19 files, typecheck, production client and server builds,
prerender, and lint. PR #24 deployed the release as `4e2ac67`. Production
workflow `33318753459` and the independent production smoke passed the direct
Convex host, canonical domain, apex redirect, and readiness query. No API,
provider call, production feed projection, or working civic action is claimed
(`docs/resident-interface-slice-2.md`, `src/features/discovery/`).

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
