# Slice 9 development certification

The release candidate is the combined stack of PRs [#93](https://github.com/LaykenV/public-parish/pull/93),
[#94](https://github.com/LaykenV/public-parish/pull/94),
[#95](https://github.com/LaykenV/public-parish/pull/95),
[#96](https://github.com/LaykenV/public-parish/pull/96),
[#97](https://github.com/LaykenV/public-parish/pull/97),
[#98](https://github.com/LaykenV/public-parish/pull/98), and
[#99](https://github.com/LaykenV/public-parish/pull/99). All remain open.
Merging the stack deploys the production backend and frontend. No production
merge or source activation occurred in this work. Controlled development mail
used the configured shared updates inbox; provider ingress is qualified below.

The personal development deployment is `woozy-wren-227`, served at
https://woozy-wren-227.convex.site. One combined branch owns this deployment. The served frontend comes from
`7d2ed31`, hosting deployment `48bd933b-b4dd-40fe-8e1d-349f6785a597`.
The backend includes the same code. Subsequent certification edits change documentation only.
GitHub Actions runs type checks, tests, builds, lint, and browser checks. Its
frontend artifact is uploaded without rebuilding locally. Development delivery
and CI success do not establish production delivery or resident benefit.

Development runtime certification completed on September 5. The open PRs carry the exact-head CI and review status for production approval.

## Observed development evidence

| Requirement | Evidence and limit |
| --- | --- |
| Approved-source discovery | The Rapides August 10 agenda produced 41 targets without owner-supplied decision IDs. Its listed appointments published with limited claims and no invented approval. |
| Baseline suppression | Catch-up runs keep `notificationEligible=false`. Publishing historical agenda items does not email the backlog. |
| Bounded work | Runs stopped at both 200 and 400 daily admissions, preserved pending work, and did not turn budget exhaustion into a source-health failure. The development calibration reached the existing 500-admission maximum. One approved 100-admission credit preserved actual call history and the original daily reset; 69 were used and 31 remained when monitoring was paused. |
| Inventory continuation | Run `tn76pqbg65rgn4e8h9q22jyphd8dtmjs` completed the 31-page August 10 minutes from its saved first section. Both sections passed extraction and independent review against the same immutable snapshot. The complete document contains 42 targets. Increasing the reviewer completion budget from 4,000 to 8,000 tokens resolved a recorded truncation without weakening its acceptance rules. |
| Automatic issue proposal | Build `ms79mrk0v5h8z9zs0nzkxhn1ds8drzdy` published the limited Cotile Lake fees issue from two accepted decisions after independent review. No owner supplied the relationship. |
| Stable issue identity | Build `ms7btptfdk2fpyn547reat32kn8drbhg` extended the existing Pafford issue from two to three members. Issue ID and slug stayed fixed. The accepted version advanced to `n17bmzn138r0en2kzqpebq5k7h8ds372`. |
| Ambiguous links | Proposal `ts7cp7syynga4wjvc1wxas5bch8drqa2` found competing Pafford issues and stopped as ambiguous. It did not silently merge their histories. |
| Searchable history | Explore paginated accepted records and found CO-029-2026 through a Marshals search beyond the former latest-50 result. CI exercises 1,000 accepted records and selection beyond the former 75-record limit. |
| Live corpus Ask | Two related anonymous questions correctly identified the $13,564.80 Lafayette Police Department appropriation and distinguished an agenda item from a final vote. A question about a Mars spaceport returned not found. Each factual answer had citations. |
| Immutable citations | The bounded audit passed 575 citations across 108 current and immediately preceding publication versions. It rehashed stored source text and checked exact excerpt offsets. Of those citations, 222 use their historical normalization coordinate system. The audit changed no source, citation, or publication. The September 5 audit found no problems. The final audit followed the completed canary. |
| Coverage demand | A signed-out St. Landry Parish request saved one demand record. The newest compiler run still dated to September 3. The request started no source work. |
| Verified launch notice | A verified Rapides request waited while coverage was degraded, then received one launch notice after gated recovery. Repeated notice sweeps did not enqueue another notice. Wrong-requester verification failed; valid verification and replay behaved as intended. |
| Controlled notifications and reply | Immediate and weekly emails each arrived with an official source link. The repeat delivery request reused its existing roundup window. A controlled reply received one grounded response after signed development webhook replay. Invalid signature returned 401; valid and duplicate events returned 204 with one application reply event per provider message. A fresh verification and reply then proved readable numbered references and the official PDF link, without raw citation markers. The controlled address was unsubscribed again. |
| Private report | A controlled report submitted from the mobile issue page showed the private confirmation and reached provider state `sent`. It started no evidence pipeline. |
| Google account | Real Google OAuth returned to development. Creating, muting, and removing a test issue follow passed. The pre-existing Google follow remained unchanged. |
| Email-only management | Actual provider verification succeeded for the controlled inbox. Valid management worked, an invalid token failed closed, mute and resume passed. Removing the controlled Pafford follow passed. Unsubscribe GET left the Roundabout follow active; POST stopped the address and invalidated management access. Repeated POST returned success. |
| Sharing | Full and limited share HTML returned factual metadata and canonical development links. Missing and hostile slugs returned 404 with no-store. A gzip ETag replay returned 304 after the cache fix. Mobile copy confirmation passed. External social-platform cache previews are not claimed. |
| Global pause | With the deployment switch off, an explicit scheduler tick created no run or provider call and preserved all 54 pending targets. The same latest run and provider-call IDs remained after an explicit paused tick; 29 targets were published and none were running. |
| Usage reconciliation | All 360 pipeline calls, 41 Ask calls, 77 compiler calls, and 256 monitoring calls matched their daily aggregates. A separate Lafayette source retrieval reused its snapshot and recorded two successful retrieval calls, each reporting two credits. Both entered the separate aggregate. No row remained unaggregated. Counts include earlier development work; they are not all Slice 9 cost. |
| Owner reports | The signed-in mobile owner view loaded source policies, incidents, issue proposals, delivery problems, civic counters, provider pages, and daily aggregates. Unauthorized-access and retry-dedup cases pass CI. |
| Provider | AI Gateway handled extraction, independent review, issue linking, and Ask. `DIRECT_OPENAI_FALLBACK_ENABLED` is unset, so fallback is disabled. The owner explicitly accepted no direct-provider live test. |

## Browser review

Manual Chrome checks used desktop and 320-, 375-, and 390-pixel viewports.
Home, Explore, an old decision, its exact source excerpt, corpus Ask, Coverage,
issue timelines, sharing, private reporting, Google follows, and demand capture
were exercised against development data. The checked mobile pages had no
horizontal document overflow. Keyboard activation opened follow management;
Escape closed it and restored focus to its trigger.

The certification PR adds Chromium desktop and WebKit mobile browser checks in
GitHub Actions on PRs labeled `development-certification`. These integration
checks use the maintained Pafford source and Roundabout follow cases. All eight
and all 457 application tests passed on `7d2ed31` in
[Verify 33949802588](https://github.com/LaykenV/public-parish/actions/runs/33949802588). This includes stopped and sent notice reverification without another send.
The served frontend passed manual 320/375-pixel Coverage and privacy checks. A
350-character search URL rendered safely with a 300-character input limit, and
the Marshals search still found the older Lafayette decision. The uploaded frontend passed a fresh 375-pixel coverage and request-form review. Ordinary PR checks do not depend on mutable development data.
They exercise source opening and focus return, follow-dialog
focus containment, reduced-motion media settings, and 320/375-pixel Coverage.
These checks use the CI-built frontend with the development backend. This is
emulation. It is not a physical iPhone Safari or screen-reader test.

## Mail routing boundary

The configured development and production updates inbox is shared. The available
provider credential could read controlled messages but returned 403 for webhook
configuration. No provider routing was changed. The actual test reply did not
arrive at the development callback automatically, so the check fetched that
provider message and replayed it with the development webhook signature.
This proves signature validation, duplicate rejection, grounded answering, and
outbound receipt. It does not prove automatic provider routing into development.
Production alert-and-reply verification remains a separate release check.

## Coverage boundary

Seven development bodies have passed gate evaluations: Lafayette City Council,
Youngsville City Council, Alexandria City Council, Pineville City Council,
Rapides Parish Police Jury, Baton Rouge Metropolitan Council, and Baton Rouge
Planning and Zoning Commission. Rapides monitoring failures have also exercised
degradation and recovery. After PDF continuation, all ten fresh Rapides gates passed at 06:22:47 UTC on September 5. The owner recovery action restored support. The final public browser pass showed all seven bodies supported and the three planning bodies below still validating. Monitoring is paused after certification.

Lafayette Planning Commission, Lafayette Board of Zoning Adjustment, and
Lafayette Hearing Examiner remain validating. Their meeting-specific planning
records have not passed the same source and publication gates. Lafayette Parish
must not be labeled fully supported. Accepted dated records from passing bodies
remain readable with their actual limitations.

Production still has the five previously promoted Rapides and East Baton Rouge
bodies. Development promotion of Lafayette City Council and Youngsville does
not promote production. Production needs its own current Gate 10 and approval.

## Release boundary

Follow [the operations runbook](slice-9-operations-runbook.md) for ordered merges,
search backfill, the initial source window, proposed limits, stop/resume, cost
review, and fresh gated recovery. Initial production monitoring stays off.
After an authorized merge, watch its exact production workflow and run the
independent production smoke before calling that release ready.

The voter strip was checked against the [Louisiana Secretary of State calendar](https://www.sos.la.gov/elections-voting/election-dates)
on September 4. It names November 3, 2026 as the next statewide election.
Submission requirements, the demo, permissioned resident observations, and a
real production alert-and-reply round trip remain separate work.
