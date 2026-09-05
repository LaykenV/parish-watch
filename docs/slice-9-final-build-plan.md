# Slice 9 final build plan

Status: development certification complete, authorized production rollout in progress
Date: September 4, 2026
Baseline: `8b03ac3`, matching local and remote `main` during this review

This is the detailed execution plan for the final build slice. It replaces the
original four-packet Slice 9 grouping in `post-slice-5-pr-plan.md`. It proposes
seven substantial PRs. Each delivers one outcome and includes the backend,
matching resident adapter, tests, and documentation needed for that outcome.
Unexpected independent defects still need narrow fixes. Seven is the planned
count, not a reason to combine unrelated repairs.

## Decisions settled in this planning session

- Include bounded automatic checks of approved sources, processing of new
  decisions, and proposals for new issue timelines.
- Finish with honest body-level coverage if Lafayette's planning sources remain
  blocked. Do not lower a gate or require an upstream portal repair to finish
  the application.
- Keep optional verified launch notices for coverage requests.
- Preserve searchable history and corpus Ask as the published corpus grows.
- Treat this as the final feature-building slice. Recruitment, operation,
  source repair, release fixes, recording, and submission continue afterward.

The owner subsequently authorized implementation, real open PRs, CI review, and
development certification for the complete stack. On September 5, the owner
authorized production merges, deployment, and bounded live tests. Submission
remains separate.

## What the repository currently proves

The local checkout was clean. Remote `main` matched `8b03ac3`, its production
workflow `33909886553` succeeded, and GitHub listed no open PRs or issues.
This review did not run a new production smoke or query resident data.

Slice 8 is closed. Its release documentation records five promoted bodies in
Rapides and East Baton Rouge. Lafayette remains validating. Lafayette City
Council and Youngsville's development evidence is not a production promotion.

The following gaps come from current source code, not an assumption that earlier
slices failed:

| Gap | Evidence | Consequence |
| --- | --- | --- |
| No routine source checks | `convex/crons.ts` | A source changing does not itself start the resident update loop. |
| Extraction needs a supplied decision ID | `convex/operations/extract.ts` | A new packet does not automatically become all of its useful atomic decisions. |
| Issue refresh uses existing membership | `convex/operations/issues.ts` | A later related decision does not automatically join a followed issue. |
| Issue keys hash the exact record set | `convex/pipeline/keys.ts` | Adding a decision currently creates a different issue identity. |
| Discovery returns at most 50 decisions | `convex/resident/discovery.ts` | Client-side Explore cannot search older records outside that result. |
| Ask caps a scope at 75 records | `convex/ask/evidence.ts` | Normal corpus growth can make corpus Ask unavailable. |
| Coverage and requests use development adapters | `src/features/coverage/coverage-page.data.ts` | Their completed interfaces remain unavailable in production. |
| No dynamic issue share route | `convex/http.ts` | The share button cannot provide issue-specific preview HTML. |
| Analytics events cover visits and area selection | `convex/analytics/` | Existing counts do not prove evidence use, questions, follows, or outcomes. |
| Smoke checks roots, assets, redirect, and readiness | `scripts/smoke-production.mjs`, `package.json` | A successful smoke does not certify every resident journey. |

There is documentation drift. The handoff registry still marks deployed
notification settings and source reports unavailable. The privacy page predates
the complete alert, reply, and report paths. Architecture sections disagree
about valid selector not-found behavior and describe two different expectation
shapes. Correct these in the packets that own the behavior, then reconcile all
current-status claims during certification. Preserve clearly dated history.

## Final operating contract

An owner approves a source registry and enables its bounded monitoring policy.
After that, ordinary source updates require no owner-supplied decision ID and no
manual publication review. Firecrawl retrieves official evidence. The existing
extraction, independent review, and deterministic policy decide what publishes.
Accepted changes reach stable issue pages and eligible followers.

Automatic work may use only approved registries and approved document paths.
New roots, unapproved hosts, broken portal repair, geographic promotion, and
public source reports remain outside routine automatic processing. A coverage
request records demand and may verify an email. It never starts evidence work.

Old accepted evidence remains readable with its date and any freshness warning.
A successful HTTP request is not proof that a missing agenda or outcome exists.
Record publication, body support, and parish availability remain separate facts.

## PR 9A: process approved source updates automatically

Suggested title: `feat: turn approved source updates into cited decisions`

Outcome: a newly posted or revised official document becomes validated atomic
records without the owner naming each target first.

Build:

- Add an owner-controlled monitoring policy on an approved registry. Store its
  enabled state, cadence, next check, last attempt, last successful retrieval,
  and evidence freshness separately. New policy fields must be additive.
- Start with targeted checks of approved listing pages and document URLs. Use
  official meeting windows when proved. Label daily or weekly fallback cadence
  as inferred. Do not run broad discovery on every tick.
- Claim due work atomically with a lease and registry generation. Bound active
  registries, documents per run, concurrent work, retry attempts, and daily
  provider admissions. Resume with a cursor instead of dropping overflow.
- Use the installed durable workflow component for the multistep work. Keep
  existing pipeline records as evidence of execution, not a second queue engine.
- Reuse immutable retrieval and hashing. A raw revision remains a new snapshot;
  formatting-only changes should not cause duplicate semantic processing.
- Add a versioned document inventory that identifies atomic targets and their
  exact source spans. Cover numbered and unnumbered items, repeated item numbers
  across years, multi-item packets, and repeated attachments. Record incomplete
  inventory explicitly. Do not call a partial pass a complete meeting.
- Use `MODEL_STRONG` for generative target extraction and the existing separate
  `MODEL_FAST` review boundary. Classification remains in its existing role.
  Every downstream record still passes the normal citation and publication
  checks. A target proposal is not itself a public fact.
- Establish stable target identity across an agenda and its minutes without
  inventing a government identifier. Uncertain identity stays separate or
  withheld. Reuse known record identity when its evidence supports the match.
- Distinguish baseline discovery from later changes. Initial inventory or
  historical catch-up must not email followers a backlog as new civic events.
- Record public-safe coverage incidents for repeated retrieval failure, missing
  expected artifacts, and incomplete processing. Keep technical details private.
- Preserve the existing generation-based degradation and recovery checks.
  Automatically recovering a HTTP fetch must not override an owner pause or
  restore support using an old ten-gate evaluation.

Operating bounds:

Start from the current meeting cycle and explicitly bounded catch-up. Do not
automatically backfill a year of documents. Calibrate batch and daily limits
from development measurements before enabling production. Expose a stop switch
that prevents further provider calls between steps and preserves resumable work.
Unknown Firecrawl credits remain unknown. A reservation is not a provider bill.
Do not reintroduce token-budget denial into resident Ask.

Proof:

- A checked multi-item agenda produces every labeled target, including a target
  that was not supplied to the run.
- Its minutes update the correct records and retain earlier snapshots.
- Unchanged input, duplicate ticks, and recovery after a crash produce no
  duplicate publication or notification event.
- Inventory overflow resumes. Missing pages or unresolved identity produce an
  explicit incomplete result, not silent omission.
- A stopped, paused, superseded, or unapproved registry makes no next paid call.
- Repeated failure changes health without deleting accepted evidence. Recovery
  respects the existing gate generation and manual pause.

Likely code owners: `convex/sources/`, `convex/operations/`,
`convex/extraction/`, `convex/coverage/`, `convex/crons.ts`, and `convex/schema.ts`.

Merge with production automation disabled. Activation waits for 9B, 9C, 9D,
and 9F and their runtime proof. A code merge must not silently start bulk work.

## PR 9B: keep followed issues intact as decisions arrive

Suggested title: `feat: keep issue timelines and follows intact as decisions arrive`

Outcome: a resident follows an issue once and later related decisions appear on
that same issue, with the same URL and follow ownership.

Build:

- Separate persistent issue identity from the hash of one build's inputs.
  Keep input hashes for replay safety and immutable version history.
- Preserve existing issue IDs, slugs, follows, email links, and citations.
  Prefer additive identity fields and an explicit existing-issue build target
  over rewriting the current published corpus.
- On accepted decision publication, generate bounded candidates for an existing
  issue or a new issue. Use explicit official identifiers and accepted shared
  evidence. Same body, topic, or similar title alone does not establish a link.
- Run the existing strong-model proposal, separate review, and deterministic
  link checks. Ambiguous records remain atomic and searchable. Do not create a
  human review queue for routine publication.
- Keep same-body linking for this release. Cross-body issue merging is not
  needed to finish this slice.
- Fence concurrent builds against the accepted version they read. A delayed
  build cannot replace newer membership or resurrect a rejected relationship.
- Page stored memberships and histories where they grow. The current two-to-ten
  input rule must not silently strand an eleventh valid decision. Use bounded,
  reviewed extensions while retaining previously accepted links and citations.
- Refresh the resident projection before issuing issue notifications. Preserve
  existing owner-plus-material-change deduplication across issue, body, topic,
  and place follows. Building an issue must not resend its old history.
- Define a fail-closed conflict outcome for competing issue matches. Do not
  invent automatic merge/split migration semantics to resolve an ambiguous case.

Proof:

Follow an existing issue, publish a genuinely related new atomic decision, and
show the original URL update over its existing subscription. The original follow
receives one eligible sourced change. Repeat with concurrent builds, a rejected
link, an eleventh member, stale input, and a retry. Old links and ownership still
resolve, and unrelated same-topic records remain separate.

Likely code owners: `convex/issues/`, `convex/operations/issues.ts`,
`convex/pipeline/keys.ts`, `convex/resident/evidence.ts`, and notification hooks.
Depends on the 9A publication contract. Existing accepted publications can drive
development tests before automatic monitoring is enabled.

## PR 9C: keep published history searchable and Ask usable as it grows

Suggested title: `feat: keep published history searchable and answerable as it grows`

Outcome: adding records does not remove older accepted evidence from Explore or
disable corpus Ask because the database crossed the old record threshold.

Build:

- Replace Explore's filtering of one latest-record array with bounded backend
  search and cursor pagination over accepted public data. Home may retain its
  intentionally short recent feed.
- Support the approved search targets and existing filters through accepted
  projections. Verify issue, decision, meeting, body, source-title, and accepted
  text search requirements against the current UI contract. Do not index raw
  extraction output, private messages, or withheld facts into public search.
- Keep publication indexes synchronized with accepted versions. Old text from a
  superseded version must not leak through a stale search document.
- Replace Ask's one-shot 75-record catalog load with resumable, bounded catalog
  reads and selection batches over the entire requested accepted scope.
  Selection must consider every batch, deduplicate targets, and expand issues
  and meetings through their current accepted decisions.
- Preserve model-based selection, exact citations, both existing model roles,
  and private Agent threads. Do not substitute lexical top-k or embeddings as
  an unproved answer gate. Additional selector batches require a versioned
  amendment to the existing two-call contract.
- Bind one answer attempt to a coherent publication manifest. Recheck selected
  versions before saving an answer. A concurrent update must cause a bounded
  refresh or an explicit retry, not a mixture of incompatible versions.
- A not-found answer requires completion of selection across the requested
  scope. A failed or unfinished batch cannot mean evidence not found.
- Retrieve and hash-check selected documents in bounded steps. Preserve the
  full-source grounding requirement. If the selected scope exceeds the safe
  answer size, offer a useful place, meeting, issue, or date narrowing action.
  Label that as scope too broad, never not found. Corpus growth alone must not
  prevent a specific answer from an older record.
- Keep request-frequency limits and usage reporting. Do not solve capacity by
  increasing every constant or by truncating unseen evidence.

Proof:

Use CI datasets at the old boundaries and at a larger explicit release target,
initially 1,000 accepted records across the launch regions. Search must find a
record older than the latest 50. Corpus Ask must find evidence beyond record 75,
combine relevant records across batches, retain follow-up context, and return
honest not-found only after complete selection. Test withheld and superseded
records, concurrent publications, failed batches, and broad-scope recovery.
The 1,000-record CI target is a proposed test workload, not a claimed production
benchmark. Measure real provider latency and cost with a bounded development
sample before activation.

Likely code owners: `convex/resident/`, `convex/ask/`,
`src/features/discovery/`, and `src/features/ask/`.
Depends on the stable issue contract in 9B. Production automation waits for it.

## PR 9D: complete public coverage and verified requests

Suggested title: `feat: show source health and record verified coverage requests`

Outcome: residents can inspect actual body health, request a Louisiana place,
and optionally receive one verified launch notice when that place qualifies.

Build:

- Replace Coverage's fixture adapter with a bounded reactive public projection.
  Show body, supported source kinds, actual last check, official or inferred
  expectation, status, and a public-safe explanation of any incident.
- Make Coverage, area selection, follow eligibility, Following warnings, and
  record freshness notices use the same status definitions. Preserve dated
  evidence during degradation. Do not reduce every failed state to an unexplained
  generic validating label.
- Keep the parish rule that all required launch bodies must pass. Show each
  body's actual certification separately. Lafayette may remain validating while
  accepted dated records stay readable. Promote a passing body only after its
  own production checks, even if the parish remains unavailable.
- Extend `sourceExpectations` compatibly with date windows, expected-by state,
  and matched artifacts where evidence exists. A recurring weekday alone is not
  a proved deadline for a particular set of minutes.
- Record demand before optional email verification. Deduplicate by opaque
  requester and normalized place, and by verified subscriber where available.
  Separate parish and municipality identity so equal names do not collide.
- Treat uncertain place names as unresolved requests. Require an owner-confirmed
  mapping before a request can match a launch event. Do not use an AI guess to
  decide who receives a notice.
- Bound text and URL inputs. Store an optional homepage as an untrusted hint;
  never fetch it or add it to the official registry from this submission.
- Apply per-requester and global rate limits. Return the same saved-request
  confirmation for duplicates without exposing other requesters or counts.
- Reuse subscriber encryption and AgentMail delivery, with a distinct
  verification purpose and access scope for launch notices. Verification creates
  no account and no unsolicited issue follow.
- Trigger delivery when the requested place, not just one constituent body,
  qualifies. Cover verification that completes after promotion as well as
  promotion that occurs after verification.
- Deduplicate one notice per verified subscription and place launch. Recheck
  support and address-wide unsubscribe at delivery. Recovery, repeated
  promotion, and provider retries must not produce another launch notice.
- Keep demand and address data private. Add bounded cleanup for challenges,
  requester identifiers, and delivery payloads while preserving anonymous demand
  totals and minimal deduplication evidence. State the retention policy in the
  privacy page when implemented.

Proof:

A signed-out request creates one demand record and zero compiler runs. Wrong,
expired, replayed, or cross-purpose codes cannot subscribe. Email failure leaves
the request saved. A failed candidate sends no notice. A qualifying place sends
one notice despite duplicate promotion and retry. Test unsubscribe races, late
verification, unknown place mapping, and a parish with only some bodies passed.

Likely code owners: `convex/coverage/`, `convex/follows/`, `convex/schema.ts`,
`src/features/coverage/`, area adapters, and affected privacy copy.
Depends on 9A health state and the existing Slice 7 email boundary.

## PR 9E: serve factual issue previews

Suggested title: `feat: show factual previews when residents share an issue`

Outcome: a shared issue URL has its own factual preview and opens the correct
canonical issue on both public origins.

Build:

- Add `/share/issues/:slug` as app-owned HTTP HTML before static fallback.
- Read only the same accepted issue projection used by residents. Use factual
  title, place, current state, canonical URL, and a restrained existing-brand
  preview image. No model-generated marketing claims.
- Escape all text and attributes, bound slugs, and keep the destination on the
  canonical origin. A missing or nonpublic issue must not leak private metadata.
- Return crawler-readable HTML and a human redirect with a visible link fallback.
  Preserve metadata for crawlers instead of immediately returning a redirect
  with no useful HTML. Test the actual hosting behavior before choosing cache
  headers.
- Make cache validation follow the accepted version. Document that external
  social platforms may retain previews outside the app's control.
- Point issue share controls at the canonical share URL. Keep the native share
  sheet and inline copy confirmation. Give an accessible retry or visible URL
  if clipboard access fails.

Proof:

Verify full and limited issue metadata, escaping, hostile input, unavailable
slugs, route precedence, publication changes, direct navigation, and canonical
destinations. Check Facebook, LinkedIn, and X preview behavior with available
preview tools. A successful local HTML test is not proof of an external preview.
Publishing a social post is separate work and needs its own authorization.

Likely code owners: `convex/http.ts`, a small share domain,
`src/features/discovery/share.tsx`, and issue share callers.
Depends on 9B stable routes. No new image-generation dependency is required.

## PR 9F: measure completed actions and operating failures privately

Suggested title: `feat: measure resident outcomes and operating failures privately`

Outcome: the owner can tell whether residents complete the loop and whether the
service is keeping up, without reading private content or guessing provider use.

Build:

- Extend the exact event allowlist to accepted record opens, citation and
  original-source opens, completed Ask, not-found, follow creation, report
  submission, coverage requests, and supported notification lifecycle events.
- Count confirmed server outcomes at their commit points. Use browser events for
  interactions the server cannot observe. Dedupe transport retries and exclude
  controlled proof traffic from organic counts.
- Preserve existing browser, visit, activation, return, and 90-day retention
  definitions. Anonymous browsers are not verified residents. Keep permissioned
  recruited-resident proof separate from telemetry.
- Reject arbitrary names and property bags. Do not store questions, answers,
  addresses, report descriptions, referrers, or arbitrary URLs in analytics.
- Add indexed daily aggregates over existing model, retrieval, compiler,
  delivery, and monitoring ledgers. Show estimates separately from reported
  usage, and unknown separately from zero.
- Report provider errors and latency, retry and terminal-failure counts, stale
  work, coverage incidents, daily admission limits, and the automation stop
  state. Add only a compact owner view or report to the existing operations
  tooling. Do not create a broad admin product.
- Surface notification failures and persistent source incidents to the owner.
  Any owner alert must contain safe metadata, not resident content.
- Record email opens and clicks only if the installed provider actually exposes
  trustworthy events. Do not add invasive tracking or invent an engagement
  count to fill a report.
- Reconcile privacy copy with actual email subscriptions, replies, reports,
  launch notices, analytics, retention, and the available deletion process.
  Access expiry and data deletion must not be described as the same thing.

Proof:

One completed operation records one outcome even after retries. Rejected or
failed operations do not increment success. Unauthorized users cannot read
provider or demand reports. Content-shaped telemetry is rejected. Daily reports
reconcile to bounded sampled ledger totals and remain usable after detailed
rows expire.

Likely code owners: `convex/analytics/`, provider ledgers,
`src/features/analytics/`, existing operations UI, and the privacy page.
Depends on the event contracts of 9A through 9E. Safety limits already ship in
9A; their enforcement must not wait for this reporting PR.

## PR 9G: certify the finished resident loop

Suggested title: `test: certify the complete public resident loop`

Outcome: one identified release has proof for the complete application, with
no required production interaction hidden behind fixture success.

Build and record:

- Expand CI and safe production smoke coverage for direct public routes,
  published issue and source links, share HTML, canonical redirects, and public
  health projections. Keep destructive failure injection and mass email out of
  the production smoke.
- Audit actual installed route ownership for Google auth and provider callbacks.
  Do not add a speculative webhook merely because an old plan lists one.
- Test signature verification, method and request-size bounds, duplicate
  callbacks, token expiry, cross-user ownership, retry exhaustion, and abuse
  limits at the boundary that owns each risk.
- Exercise signed-out selection, issue and decision reads, Source, two related
  Ask turns, not-found, Google follows, email-only verification, management,
  mute, removal, unsubscribe, and private reports.
- Prove a source change through publication, stable issue extension, an existing
  realtime subscriber, one immediate alert, a grounded inbound reply, and an
  eligible weekly roundup. Include suppression after coverage degradation.
- Prove the new request, notice, share, growing-corpus, pause, and recovery paths.
- Test desktop keyboard behavior, accessible names and structure, reduced motion,
  and 320- and 375-pixel mobile layouts. The owner replaced the physical iPhone
  Safari requirement with desktop and mobile emulation for this development
  review. Do not describe emulation as a physical-device or screen-reader pass.
- Check every published citation in the bounded release corpus and sample
  historical versions. Large corpus coverage belongs in paginated CI or remote
  checks, never a single unbounded browser request.
- Exercise the normal AI Gateway path and verify direct-provider fallback stays
  disabled. The owner accepted AI Gateway as the verified provider on September
  4 because development has no direct OpenAI key. A live fallback call is not a
  completion requirement.
- Reconcile current statuses in `PLAN.md`, `docs/decisions.md`,
  `docs/product-spec.md`, `docs/architecture.md`, `docs/sources.md`,
  `docs/build-plan.md`, `docs/hackathon.md`, root `hackathon.md`, and the code
  handoff registry. Tie each live claim to its actual evidence.
- Recheck the voter-information strip against the official Secretary of State
  source. Recheck event and submission requirements against the organizer before
  submission rather than treating an older planning date as current proof.
- Record a compact operational runbook for pause, resume, failures, pending
  work, cost review, and recovery. Keep prior publications intact during repair.

Testing and release rules:

Automated unit, contract, type, lint, build, and browser checks run in GitHub
Actions. Do not run local automated validation unless the user authorizes the
exact command. `git diff --check` and static review remain allowed.

Use the personal development deployment for controlled provider proof, with one
known branch owning it. Use temporary isolation only when a particular auth,
webhook, or migration case requires it. There is no new staging environment.
CI success and development delivery are not production delivery proof.

After an authorized merge, follow the workflow for that exact merge SHA and run
the required independent `npm run smoke:production`. Merging to `main` deploys
both backend and frontend. Provider sends, crawls, data operations, and enabling
recurring automation need an explicitly bounded authorized run.

For replay evidence, use real official prior and current versions and label the
replay. Do not roll production publications backward or send a historical replay
to uninvolved residents. A development replay and a real production delivery
can be separate proof items. Record exactly what each establishes.

Certification is not a miscellaneous repair PR. Independent defects found here
receive narrow fixes, then the affected certification checks run again against
the new release. Do not rewrite every passing proof after an unrelated doc edit.

## Dependency and activation order

Recommended merge order is 9A, 9B, 9C, 9D, 9E, 9F, then 9G. Keep one active
schema-changing packet at a time. Each packet carries meaningful tests and
development evidence; certification must not be the first end-to-end exercise.

The public request and share implementations have limited dependencies on corpus
work, but there is no need to create a large stack of concurrent branches.

Enable production source automation only after:

1. 9A through 9D and 9F are deployed and their relevant checks pass.
2. A bounded development run proves inventory completeness, stable issue
   extension, search, Ask, health, and no duplicate delivery.
3. The owner has reviewed the exact registries, cadence, initial date window,
   per-run limits, measured provider use, daily limits, and stop procedure.
4. One authorized production canary completes with current official evidence.

Expand activation across the approved bodies only after the canary passes.
Do not mistake deploying disabled automation for completing the source loop.

## Schedule and completion boundary

Use the existing September 17 feature freeze as the target. Put 9A through 9C
first because they contain the largest unresolved engineering work. Aim to have
the remaining public integrations and reporting ready by September 15, leaving
September 16 and 17 for complete certification and repairs. These are planning
targets, not measured delivery estimates. Source failures may narrow geography;
they may not weaken evidence checks or erase the agreed growth requirements.

Recruit the first testers as soon as the applicable deployed flow works. Do not
wait for 9G to discover that residents cannot understand the product. Preserve
the weekday 90-minute Varholdt sales block.

The build is complete when all seven packet exits pass, approved automation is
operating within its limits, no required public action depends on a fixture,
the exact production release and independent smoke pass, and the full resident
loop has recorded runtime proof. Remaining source limitations must be visible
and match public coverage claims.

Submission readiness additionally requires real resident observations, checked
public links, permissioned proof, a demo under three minutes, and the submission
artifacts. Targets such as 25 residents, 10 follows, and 10 substantive questions
remain targets until observed. They are not code acceptance tests or claims
that this plan has achieved them.

After build completion, allow correctness, source-data, privacy, reliability,
accessibility, and demo-blocking fixes. Do not start a Slice 10 for maps, public
discussion, new institution classes, video transcription, cross-device history,
political personalization, or a broader admin system.

## Work outside the planned code PRs

- Run a bounded Lafayette source recheck. If its official records still fail,
  retain the body findings and honest partial geographic rollout. A successful
  source run without code changes does not need a PR.
- Reconcile provider configuration and current spending settings before enabling
  scheduled work. Choose numeric production operating limits from actual
  measurements; this plan neither raises a spending threshold nor claims that
  the previous account balance is current.
- Complete a real production alert-and-reply round trip with an authorized
  recipient. The repository currently records development proof for that path.
- Observe recruited residents, record aggregate outcomes, and obtain permission
  for any quotes. Keep test traffic separate from organic use.
- Capture the source-change proof and record the demo. Choose an actually
  supported, useful issue; the old Lafayette-first storyboard is conditional on
  its source availability.
- Prepare social posts and submission materials. Sending messages, publishing
  posts, uploading a public demo, and submitting the entry are separate actions.

No further product-scope answer is required to begin implementation planning.
Production activation still needs its concrete operating limits and authorized
recipient or canary scope after development measurements exist.
