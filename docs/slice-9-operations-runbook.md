# Slice 9 operations

PRs #93 through #99 and the controlled-replay repair #100 are deployed.
The owner authorized production release and bounded live testing on September 5.
See the [production certification record](slice-9-production-certification.md)
and the separate [development evidence](slice-9-development-certification.md).

Rapides Parish Police Jury is the only enabled monitoring policy. Its limits are
one document and one target per run, a 24-hour source cadence, a 30-day meeting
window, and 50 daily admissions. Catch-up checks can run every 15 minutes within
that daily limit. Initial inventory remains incomplete. The other six supported
bodies still require owner-started checks. Direct OpenAI fallback is disabled.

## Deployment and initial activation

Keep `SOURCE_MONITORING_ENABLED=false` through the code rollout. All added
schema fields are optional or belong to new tables. Existing source snapshots,
publication versions, issue IDs, issue slugs, follows, and citations remain.
New indexes deploy with the backend. The production Gate 10 classification
recognizes the current `www.publicparish.com` override and the built-in
`befitting-flamingo-587.convex.site` endpoint. Link checks and evaluation use
the same classification. Changing the
`CONVEX_SITE_URL` override or moving production requires an explicit update to
that classification and new Gate 10 evidence. For an already promoted proposal,
run the internal `coverage/validation:refreshSourceLinks` action with its
`proposalId`, then the owner `coverage/validation:reevaluate` mutation. The
refresh checks at most 20 representative links from the named backend, guards
every redirect against the approved manifest, and never retrieves evidence
through Firecrawl or republishes records. Watch that exact workflow to completion,
then run the independent `npm run smoke:production`.

Backfill the accepted search projection after PR #95 deploys. Run the internal
`resident/search:backfill` mutation separately for `decision` and `issue`, with
25 records per page and the returned cursor until `isDone`. This operation
indexes accepted publications. It does not republish records or send alerts.
Verify an older accepted record through Explore and corpus Ask before enabling
source automation. The current 1,000-record boundary proof is a CI workload,
not a measured production throughput claim.

The owner approved Rapides Parish Police Jury after its current production
coverage evaluation passed. The approved canary uses one document,
one target, a 24-hour cadence, a 30-day source window, and 50 provider admissions
per day. Keep other policies paused. The owner UI's default is three documents
and five targets, so set the narrower canary through `monitoring/ledger:configure`.
The development catch-up used a separate explicit historical window to exercise
existing official revisions. Do not copy that window into production.

An admission is a safety reservation, not a bill. Model steps reserve capacity
for the configured provider path. A 31-page PDF required two Firecrawl calls
and reported 62 credits during development. An incomplete inventory resumes its accepted immutable snapshot before another
retrieval. Completed inventories return to the source-check cadence. Checking a
completed PDF can still cost retrieval credits.
The development run hit both 200- and 400-admission limits and stopped without
losing pending work. Calibration reached the existing 500-admission maximum;
that is not a proposed production setting or a spending guarantee.
The owner approved one additional 100-admission development credit for the
window ending September 5 at 13:25:59 UTC. The internal proof helper credits
that exact exhausted canary once and records the grant separately. It retains
the 500 daily rate, original reset time, actual provider-call history, and
global limit. A repeat call adds nothing; the next window returns to 500.
This helper refuses other deployments and cannot grant a later window.

AI Gateway is the verified provider. Keep direct OpenAI fallback disabled.
The owner accepted this configuration because development has no direct
OpenAI key. Re-enabling fallback requires its own bounded provider check.

## Stop and resume

For a deployment-wide stop, set `SOURCE_MONITORING_ENABLED=false` on the named
deployment. For one source, use Pause checks in `/operations/coverage`.
Policy changes advance the generation. Every paid step and monitored publication
checks current authority. Already issued provider requests may finish, but the
next step cannot spend or publish under a revoked generation.

Pending documents, inventory sections, target decisions, and listing cursors
remain stored. Resume the same approved policy to continue that work. Changing
the approved proposal or source window restarts listing discovery. Changing a
quota does not erase admissions already consumed in the current window.
A completed listing waits until the next scheduled discovery time. An incomplete
listing resumes its cursor without repeating completed discovery.

Use Check now for a due source. It replaces an expired two-hour lease, not an
active lease. Retry incomplete document requeues one document. Retry failed
decision resets the selected target's bounded retry state. Do not repeatedly
retry a source without inspecting the specific failure and remaining quota.

## Diagnose incomplete work

Read the private monitoring run, provider ledger, document inventory, and issue
proposal records. Inventory completeness covers the complete immutable document,
including all checkpointed sections. Continuation sends accepted locators to
both models, rejects repeated excerpts deterministically, and requires independent
review to reject the same decision with different excerpts. Prior context stops
at 1,000 targets or 250,000 serialized characters. An accepted section alone does not permit
its targets to run while the document remains incomplete.

Repeated retrieval or processing failures open a public-safe incident and can
degrade coverage. Dated accepted evidence remains readable with a warning.
A successful fetch does not prove a missing outcome. A healthy scheduled run
does not restore support by itself. Re-evaluate all coverage gates and use the
owner recovery action against the current registry generation.

Issue proposals use accepted same-body records. Competing issue matches remain
atomic and searchable. The owner may inspect the reason; do not merge issues
by changing IDs, rewriting source citations, or bypassing independent review.
A proposal marked proposed names a build, not an accepted publication. Failed or
withheld builds update their proposals. Concurrent extensions retry at most twice
against the current timeline and keep their original accepted matches. Pause,
quota, and stale-publication checks still apply. Exhausted retries need owner
inspection. Automatic scans stop after 1,000 same-body records, more than 30
matches, or more than 200 historical links for a record. Current timelines retain
at most 200 members. These bounds produce visible failures or ambiguity; they do
not authorize dropped members or guessed relationships.

## Delivery and cost review

Inspect Notification delivery problems for pending, failed, rejected, bounced,
and complained states. Provider acceptance, receipt in the controlled inbox,
and a real resident receiving useful information are different evidence.
Notice sweeps read waiting and queued subscriptions through the state index;
sent and stopped history adds no polling work. Coverage launch notices require
verification and support for the requested
place. A body promotion alone cannot trigger a parish notice. Historical
monitoring backfill suppresses notifications.

Daily usage updates from bounded ledger batches every five minutes. Model cost
is an estimate. Missing token, credit, and cost fields remain unknown. Retrieval
calls outside monitoring enter a separate ledger from this release onward.
Earlier retrieval-stage summaries do not establish every historic provider call.
Monitoring retrieval remains in monitoring totals to avoid double counting.
No provider pricing for email is inferred from delivery counts.

Application analytics distinguish development from production. Both deployments
currently share the AgentMail updates inbox, so provider messages can reach the
production callback regardless of which deployment initiated a test. Verify the
matching production challenge, delivery, or reply record before claiming proof.
Browser counts do not prove
unique residents or civic benefit. Do not add questions, answers, email addresses,
report descriptions, or arbitrary URLs to analytics or public incident text.

## AgentMail inbound delivery

The production provider endpoint is
`https://befitting-flamingo-587.convex.site/agentmail/webhook`. Its subscribed
events must include `message.received` as well as the existing sent, delivered,
bounced, complained, and rejected events. The September 5 review found the
received event missing and enabled it without changing the endpoint or signing
secret. A fresh provider reply then reached the app and produced a grounded
answer received by the controlled inbox. Inbox receipt alone does not establish
callback routing. Do not subscribe to spam, blocked, or unauthenticated events
to compensate for a missing received event.

## Production closure

After the approved canary, check immutable citations, accepted record and issue
pages, an older Explore result, corpus Ask, current body health, share metadata,
and the stop switch. A real production alert-and-reply round trip needs an
explicit recipient and bounded send. Keep Lafayette's unpassed planning bodies
validating and name the supported bodies individually.

Production release proof, resident observations, the demo, and submission remain
separate from development certification. Correctness and source repairs can
continue after this final feature slice without starting another feature list.
