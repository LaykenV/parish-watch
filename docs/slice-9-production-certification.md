# Slice 9 production certification

Recorded September 5, 2026, after the owner authorized production merges and
bounded live testing. The application release is `48dedf3a72a21084628aac59025db86b4623ca0f`
on `befitting-flamingo-587`. This record closes the final feature build slice.
Initial source catch-up and the limits below remain visible operating work.

The canonical app is [Public Parish](https://www.publicparish.com). The
[direct Convex app](https://befitting-flamingo-587.convex.site) remains public
without an invitation. Development proof has its own
[certification record](slice-9-development-certification.md).

## Release evidence

All eight PRs were reviewed, merged in order, and deployed successfully. Each
merge received an independent `npm run smoke:production` against the named
production deployment after its exact deployment workflow succeeded.

| PR | Production merge | Deployment run | Independent smoke |
| --- | --- | --- | --- |
| [#93](https://github.com/LaykenV/public-parish/pull/93) | `5c2aa40` | [33953712401](https://github.com/LaykenV/public-parish/actions/runs/33953712401) | Passed |
| [#94](https://github.com/LaykenV/public-parish/pull/94) | `b49252a` | [33953936938](https://github.com/LaykenV/public-parish/actions/runs/33953936938) | Passed |
| [#95](https://github.com/LaykenV/public-parish/pull/95) | `1476c88` | [33954397481](https://github.com/LaykenV/public-parish/actions/runs/33954397481) | Passed |
| [#96](https://github.com/LaykenV/public-parish/pull/96) | `e99fcd0` | [33955878348](https://github.com/LaykenV/public-parish/actions/runs/33955878348) | Passed |
| [#97](https://github.com/LaykenV/public-parish/pull/97) | `a82f44d` | [33956036844](https://github.com/LaykenV/public-parish/actions/runs/33956036844) | Passed |
| [#98](https://github.com/LaykenV/public-parish/pull/98) | `a9892c3` | [33956441383](https://github.com/LaykenV/public-parish/actions/runs/33956441383) | Passed |
| [#99](https://github.com/LaykenV/public-parish/pull/99) | `88621f4` | [33956755389](https://github.com/LaykenV/public-parish/actions/runs/33956755389) | Passed |
| [#100](https://github.com/LaykenV/public-parish/pull/100) | `48dedf3` | [33957507099](https://github.com/LaykenV/public-parish/actions/runs/33957507099) | Passed |

The seven planned PRs delivered approved-source automation, stable issue
extension, growing-corpus search and Ask, public coverage and verified requests,
issue share HTML, private operating reports, and certification. PR #100 repaired
a controlled replay of accepted legacy publications that predated the change
ledger. It preserves the original publication time, never invents a revision,
and does not fan out to resident follows.

Verify [33957319248](https://github.com/LaykenV/public-parish/actions/runs/33957319248)
passed 473 application tests for the final application code. The unchanged
frontend passed eight desktop and mobile browser checks in
[33956555671](https://github.com/LaykenV/public-parish/actions/runs/33956555671).
CI owns tests, typechecks, lint, and builds. No local automated validation ran.
The 1,000-record search and Ask proof is a CI workload, not production scale.

## Public coverage

All seven supported bodies passed ten fresh gates against their current registry
generation. The production backend checked all 28 representative source URLs.
Support covers the approved agenda and minutes sources for the named bodies.
It does not imply all parish government, every source kind, or a complete archive.

| Place | Supported bodies | Remaining limits |
| --- | --- | --- |
| Lafayette | Lafayette City Council; Youngsville City Council | Parish remains validating. Planning Commission, Board of Zoning Adjustment, and Hearing Examiner have not passed the complete gates. |
| Rapides | Alexandria City Council; Pineville City Council; Rapides Parish Police Jury | Available for these bodies and their approved agenda and minutes sources. Only the Police Jury has automatic checks enabled. |
| East Baton Rouge | Baton Rouge Metropolitan Council; Baton Rouge Planning and Zoning Commission | Available for these bodies and their approved agenda and minutes sources. Checks remain owner-started. |

The three Lafayette planning root pages returned HTTP 200 with the expected
body titles during the production review. Their earlier retrieval failures are
historical evidence, not their current HTTP status. Reachable roots alone do
not justify promotion. Lafayette City Council and Youngsville passed their own
production compiler, publication, revision, failure, and coverage checks before
promotion.

## Automation and operating limits

The only enabled policy is Rapides Parish Police Jury. It uses one document and
one target per run, a 24-hour source cadence, a 30-day meeting window beginning
August 6, and 50 daily provider admissions. Incomplete catch-up can schedule a
run every 15 minutes. Admissions reserve capacity; they are not a provider bill.
The development-only extra 100 admissions were not applied to production.

The first canary completed an inventory of 41 targets from the official August
10 revised agenda and published an independently reviewed limited decision.
A second accepted agenda decision followed. Both suppressed historical alerts.
Issue proposals ran and returned no match rather than forcing a timeline.
Production did not independently reproduce a new stable issue extension; the
accepted same-issue extension and replay proof remain in development and CI.

The scheduler started a later run without an owner action and completed another
document check. As of 09:58 UTC, 59 targets were stored, two were published,
56 pending, and one extraction had failed while awaiting reconciliation. The
August minutes inventory retained its accepted first section and deferred a
rejected continuation. Its incomplete document cannot dispatch targets. The
initial baseline is not complete. The 50 daily admissions were exhausted; the
existing window resets at 12:13:46 UTC, 7:13 a.m. Central. No quota was raised.

Discovery can retrieve older documents within the same calendar year before
extracting their actual meeting date. The meeting window prevents their targets
from entering processing. A June agenda check completed without adding June
targets. This costs retrieval and inventory admissions and limits catch-up speed.

Global stop and policy pause each refused Check now without consuming more
admissions. Resume advanced the policy generation and preserved the same quota
window. Rejected inventory, failed extraction, and pending work remain private
and retry under the existing bounds. They do not create unsupported public facts.
The latest source run completed and the seven coverage evaluations remained
current. Further activation is an operating decision after reviewing this canary.

## Resident and provider proof

- Production search backfill scanned 41 decision records in two pages and five
  issues in one page. It completed without republication or alerts. Explore
  found an older Marshals appropriation record, and corpus Ask answered from its
  official evidence. An unrelated Mars-spaceport question returned not found.
- Two related issue Ask turns correctly explained the $1.2 million roundabout
  appropriation and transfer. The follow-up did not double-count it as $2.4 million
  or claim construction completion. Both turns had precise source citations.
  AI Gateway ran the normal provider path. Direct OpenAI fallback remains disabled.
- An existing Google session created, muted, and removed a managed issue follow.
  The account returned to its original zero-follow state. This was not a fresh
  OAuth sign-in proof. Anonymous requests to owner monitoring, demand, and provider
  reports were refused.
- A controlled email-only subscription completed verification. Immediate and
  weekly replay emails arrived with official links. One verified coverage launch
  notice arrived; replay produced no second production notice. The replay used
  accepted official evidence and did not send historical alerts to other residents.
- The AgentMail endpoint omitted `message.received`. Enabling that event repaired
  provider-to-production routing. A fresh inbound provider reply then produced a
  grounded response that arrived in the controlled inbox. This was a real callback,
  not a manually signed webhook replay. The endpoint and signing secret stayed.
- Management read, mute, resume, nonmutating unsubscribe GET, unsubscribe POST,
  repeat unsubscribe, and management-token revocation passed. The controlled
  subscriber is unsubscribed. A private source-problem report was accepted without
  changing public evidence or starting source processing.
- Desktop and 320- and 375-pixel mobile emulation passed the reviewed Coverage,
  Source, Ask, and share interactions. Source dialog keyboard focus stayed inside,
  Escape restored trigger focus, and the checked mobile pages had no horizontal
  overflow. No physical iPhone or screen-reader pass is claimed.
- Share HTML passed on canonical and direct origins with factual limited metadata,
  canonical navigation, conditional ETag 304, and missing-slug 404 with no-store.
  External social-platform preview caches were not independently certified.

The production immutable-evidence audit passed 283 citations across 51 accepted
current and prior publication versions, checking all 36 referenced snapshot
hashes. It verified 138 legacy citation offsets without rewriting them. Zero
problems were found. The production corpus contained 43 decision records after
the two canary publications. This does not claim a live corpus above 50 records.

Provider usage aggregates reconciled with their bounded underlying ledger reads.
Historical failures and schema-rejected model attempts remain in totals. Missing
pricing or credit data stays unknown. Counts do not establish a provider invoice.
The shared AgentMail inbox can receive development and production traffic; every
production delivery claim above was matched to its production record and links.
Controlled tests are not evidence of organic resident benefit.

## Completion boundary

The feature slice is deployed and the bounded production checks are recorded.
The [operations runbook](slice-9-operations-runbook.md) owns pause, continuation,
retry, incident review, quota review, and gate-based recovery. The remaining work
is initial catch-up, resolving rejected source items, validating Lafayette's
three planning bodies, and deciding whether to activate more approved sources.
These tasks must preserve publication gates and the approved daily limits.

Resident recruitment, observed benefit, a newly timed under-three-minute demo,
external social previews, and submission remain separate. No submission, social
post, physical-device result, complete historical archive, or organic resident
outcome is claimed by this release.
