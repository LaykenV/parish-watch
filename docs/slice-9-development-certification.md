# Slice 9 development certification

The release candidate is the combined stack of PRs [#93](https://github.com/LaykenV/public-parish/pull/93),
[#94](https://github.com/LaykenV/public-parish/pull/94),
[#95](https://github.com/LaykenV/public-parish/pull/95),
[#96](https://github.com/LaykenV/public-parish/pull/96),
[#97](https://github.com/LaykenV/public-parish/pull/97),
[#98](https://github.com/LaykenV/public-parish/pull/98), and
[#99](https://github.com/LaykenV/public-parish/pull/99). All remain open.
Merging the stack deploys the production backend and frontend. No production
merge, data change, source activation, or provider send occurred in this work.

The personal development deployment is `woozy-wren-227`, served at
https://woozy-wren-227.convex.site. One combined branch owns this deployment.
GitHub Actions runs type checks, tests, builds, lint, and browser checks. Its
frontend artifact is uploaded without rebuilding locally. Development delivery
and CI success do not establish production delivery or resident benefit.

Certification remains in progress until the source continuation, controlled
notification replay, browser CI, and exact-head reviews below finish.

## Observed development evidence

| Requirement | Evidence and limit |
| --- | --- |
| Approved-source discovery | The Rapides August 10 agenda produced 41 targets without owner-supplied decision IDs. Its listed appointments published with limited claims and no invented approval. |
| Baseline suppression | Catch-up runs keep `notificationEligible=false`. Publishing historical agenda items does not email the backlog. |
| Bounded work | Runs stopped at both 200 and 400 daily admissions, preserved pending work, and did not turn budget exhaustion into a source-health failure. The temporary development calibration reached the existing 500-admission maximum. |
| Inventory continuation | The 31-page August 10 minutes retain an accepted first section while the remaining section passes extraction and independent review. Completion is still being checked. |
| Automatic issue proposal | Build `ms79mrk0v5h8z9zs0nzkxhn1ds8drzdy` published the limited Cotile Lake fees issue from two accepted decisions after independent review. No owner supplied the relationship. |
| Stable issue identity | Build `ms7btptfdk2fpyn547reat32kn8drbhg` extended the existing Pafford issue from two to three members. Issue ID and slug stayed fixed. The accepted version advanced to `n17bmzn138r0en2kzqpebq5k7h8ds372`. |
| Ambiguous links | Proposal `ts7cp7syynga4wjvc1wxas5bch8drqa2` found competing Pafford issues and stopped as ambiguous. It did not silently merge their histories. |
| Searchable history | Explore paginated accepted records and found CO-029-2026 through a Marshals search beyond the former latest-50 result. CI exercises 1,000 accepted records and selection beyond the former 75-record limit. |
| Live corpus Ask | Two related anonymous questions correctly identified the $13,564.80 Lafayette Police Department appropriation and distinguished an agenda item from a final vote. A question about a Mars spaceport returned not found. Each factual answer had citations. |
| Immutable citations | The bounded audit passed 558 citations across 105 current and immediately preceding publication versions. It rehashed stored source text and checked exact excerpt offsets. Of those citations, 222 use their historical normalization coordinate system. The audit changed no source, citation, or publication. The September 5 audit found no problems. Repeat it if the remaining canary publishes more evidence. |
| Coverage demand | A signed-out St. Landry Parish request saved one demand record. The newest compiler run still dated to September 3. The request started no source work. |
| Verified launch notice | A verified Rapides request waited while coverage was degraded, then received one launch notice after gated recovery. Repeated notice sweeps did not enqueue another notice. Wrong-requester verification failed; valid verification and replay behaved as intended. |
| Private report | A controlled report submitted from the mobile issue page showed the private confirmation and reached provider state `sent`. It started no evidence pipeline. |
| Google account | Real Google OAuth returned to development. Creating, muting, and removing a test issue follow passed. The pre-existing Google follow remained unchanged. |
| Email-only management | Actual provider verification succeeded for the controlled inbox. Valid management worked, an invalid token failed closed, mute and resume passed. Removal and address-wide unsubscribe remain in the final delivery pass. |
| Sharing | Full and limited share HTML returned factual metadata and canonical development links. Missing and hostile slugs returned 404 with no-store. A gzip ETag replay returned 304 after the cache fix. Mobile copy confirmation passed. External social-platform cache previews are not claimed. |
| Global pause | With the deployment switch off, an explicit scheduler tick created no run or provider call and preserved all 33 pending targets. |
| Usage reconciliation | All 354 pipeline calls, 31 Ask calls, 77 compiler calls, and 224 monitoring calls matched their daily aggregates. No row remained unaggregated. Counts include earlier development work; they are not all Slice 9 cost. |
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
checks use the maintained Pafford evidence case and run after the development
canary settles. Ordinary PR checks do not depend on mutable development data.
They exercise source opening and focus return, follow-dialog
focus containment, reduced-motion media settings, and 320/375-pixel Coverage.
These checks use the CI-built frontend with the development backend. This is
emulation. It is not a physical iPhone Safari or screen-reader test.

## Coverage boundary

Development gate evaluations support seven bodies: Lafayette City Council,
Youngsville City Council, Alexandria City Council, Pineville City Council,
Rapides Parish Police Jury, Baton Rouge Metropolitan Council, and Baton Rouge
Planning and Zoning Commission. Rapides monitoring failures have also exercised
degradation and recovery; the final public status is checked after the canary.

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
