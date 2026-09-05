# Official-Source Plan

Status: seven bodies supported after Slice 9; Lafayette planning sources still need complete certification
Last verified: September 5, 2026

This document supplies starting points, not a claim of complete coverage. Every
URL must be checked during the Firecrawl source spike, and every public body must
pass the same gold-set and freshness gate before Public Parish marks it
supported.

## Current Lafayette source repair

Lafayette City Council and Youngsville City Council passed production coverage
checks during Slice 9. The remaining planning sources are still validating.
The official events service briefly exposed meeting attachments, then returned
502 again during the September 5 recheck. New version 2 manifests admit only
its checked event-document path; the old manifests remain unchanged for prior
runs. No coverage gate or public support state changes with that permission.

The generic Planning Commission entry still needs separate City and Parish body
identities before certification. The
[September 5 source recheck](source-spikes/lafayette-planning-recheck-2026-09-05.md)
records the recovered path, current failures, and remaining evidence work.
The checkpoints below retain their dated historical findings.

## Implemented checkpoint

Slice 1 seeded the Lafayette City Council registry with the council hub,
document search, and schedule/research URLs. The first checked gold set covered
four agendas, three corresponding minutes, and one ordinance packet.

The August 31 launch batch promoted 26 cited atomic records from 17 official
PDFs whose production content hashes matched the reviewed development inputs.
The result is 15 Lafayette, 9 Rapides, and 2 East Baton Rouge records. Fifteen
are full and 11 are limited. One Rapides negative control returned `not_found`,
three targets stayed out after repeat exact-citation failures, and replay reused
all 27 successful extraction run IDs without new model calls. The batch evidence
lives in `docs/production-batches/launch-data-2026-08-31.v1.json`.

The resident query now exposes those 26 publications. A September 1 one-time
production data correction cleared the current publication pointers from one
older duplicate Lafayette board-vacancy record without deleting its evidence.
Exactly one board-vacancy card remains, under
`CITY-BOARD-APPLICATIONS-2026-09-15`. The duplicate was a legacy projection
defect, not another launch record.

The August 31 proof covers selected official PDF source families. It did not by
itself mark a government body supported. Slice 8 later ran exact checked
artifacts through retrieval, extraction, deterministic validation, independent
review, publication, a missing-record probe, paired agenda and minutes replay,
and production source-link checks. Production promoted Alexandria City Council,
Pineville City Council, Rapides Parish Police Jury, Baton Rouge Metropolitan
Council, and Baton Rouge Planning and Zoning Commission after each passed all ten gates.
That makes Rapides and East Baton Rouge supported in the resident selector.

Lafayette City Council and Youngsville City Council passed gates 1 through 9 in
development. They were not promoted because Lafayette's public place status
requires every checked body in the parish, and the three planning bodies remain
blocked. Their government pages and 2026 schedule PDFs answered 200 on September
4, but `events.lafayettela.gov` still answered 502 and no stable current and
historical agenda-and-outcome set exists for those bodies. Lafayette therefore
remains validating. This is a documented source failure, not a lower coverage
standard.

## Source Policy

Public Parish publishes from primary government records:

- agendas and meeting packets;
- minutes;
- ordinances and resolutions;
- planning and zoning agendas, results, and case packets;
- official meeting calendars and notices;
- official contract or spending material contained in supported proceedings;
- official video links as supporting references, not an initial transcription
  corpus.

News, advocacy sites, social posts, and search snippets can help a person notice
an issue, but they are not publication evidence. Evidence retrieval stays inside
registered official domains and approved government document hosts.

## Initial Registry Seeds

### Lafayette Parish

| Body                               | Candidate official seed                                                                                                   | Expected records                                            | First spike                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------- |
| Lafayette City and Parish Councils | [Council hub](https://www.lafayettela.gov/your-government/city-and-parish-councils/)                                      | schedule, procedures, links to agendas and records          | discover all linked repositories and current meeting cycle     |
| Lafayette City and Parish Councils | [Council document search](https://apps.lafayettela.gov/obcouncil/index.html)                                              | agendas, minutes, ordinances, resolutions                   | test search discovery, stable document URLs, and pagination    |
| Lafayette City and Parish Councils | [Schedule and research](https://www.lafayettela.gov/your-government/city-and-parish-councils/schedule-research-ord-reso/) | agendas, briefings, minutes, ordinances, resolutions        | compare duplicate and revised artifacts                        |
| Lafayette planning and zoning      | [LCG planning and development](https://www.lafayettela.gov/business-development/planning-and-development/)                | body pages, calendars, zoning documents, linked agenda PDFs | map the site and identify every current official packet source |
| Youngsville City Council           | [Mayor and City Council](https://www.youngsville.us/city-services/mayor-city-council/)                                    | schedule, agendas or packets, minutes, contacts             | test archives, current documents, and Municode-linked material |

The LCG council hub states the normal first-and-third-Tuesday pattern and that
regular-meeting agendas are published shortly before meetings. Treat September
1 and September 15 as target live cycles only after the official 2026 schedule
and posted agenda confirm them.

Planning and zoning documents may appear as calendar PDFs under the LCG document
host. Discovery should still find the current pattern. The certification gold
set pins exact public examples so a classifier cannot substitute an unrelated
LCG document.

As of September 4, 2026, the planning body pages, main LCG calendar, and 2026
schedule PDFs answer 200. Search indexes still describe planning agendas and
action summaries at former LCG document paths, while current meeting-detail
links route through the LCG events service, which returns 502. Schedules prove
cadence, not decisions or outcomes. Keep the affected bodies unavailable until
stable current and historical agenda and outcome artifacts pass the same checks
as every other body.

Youngsville's city page embeds its current agendas, packets, and minutes from
Municode. The checked source boundary therefore includes only the Youngsville
publish page and its `youngsvila-pubu` document path. A broad Municode host is
not an official source for this body.

### Rapides Parish

| Body                                               | Candidate official seed                                                                | Expected records                                    | First spike                                                           |
| -------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------- |
| Alexandria City Council                            | [City Council](https://www.cityofalexandriala.com/government/city-council/)            | schedule, agendas, minutes, committees, video links | map current and archived council records                              |
| Alexandria City Council                            | [Official videos](https://www.cityofalexandriala.com/videos/)                          | council video references                            | link videos to meetings; defer transcription                          |
| Pineville City Council                             | [City Clerk document center](https://www.pineville.net/egov/apps/document/center.egov) | agendas, minutes, public documents                  | test filters, stable document URLs, and archives                      |
| Rapides Parish Police Jury                         | [Agendas](https://rppj.com/agendas/)                                                   | jury and committee agendas                          | compare current page with actual posted documents                     |
| Rapides Parish Police Jury                         | [Public information](https://rppj.com/public-information/)                             | meeting schedule, notices, public records links     | validate the 2026 schedule and committee structure                    |
| Alexandria, Pineville, and Rapides planning/zoning | official sources to be discovered from the sites above                                 | agendas, hearings, cases, results                   | do not claim coverage until bodies and current records are identified |

The Rapides source spike must explicitly catch stale index pages. A page titled
"Agendas" is not proof that the listing is current. Expected-meeting schedules,
document dates, and linked file versions must agree.

Pineville's old `/egov/documents/` PDF addresses now return 404. Its city
document center redirects council records to Pineville's MuniDocs collection.
Certification uses the collection's exact Pineville product and document IDs.

### East Baton Rouge Parish

| Body                 | Candidate official seed                                                                        | Expected records                                | First spike                                           |
| -------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------- |
| Metropolitan Council | [Agenda Center](https://www.brla.gov/AgendaCenter/Metropolitan-Council-3)                      | agendas, minutes, amendments, previous versions | use version history as a change-detection test        |
| Planning Commission  | [Planning Commission Agenda Center](https://www.brla.gov/agendacenter/planning-commission-12/) | agendas, results, previous versions             | test current plus historical files                    |
| Planning Commission  | [Official commission page](https://www.brla.gov/2590/Planning-Commission)                      | body information, links, public process         | discover related packet and case sources              |
| Planning Commission  | [Planning and zoning schedule](https://www.brla.gov/2521/Planning-and-Zoning-Schedule)         | meeting and deadline schedule                   | create source expectations from the official calendar |

The CivicEngage agenda centers expose revised or previous versions. They are a
strong test of the immutable snapshot and visible-change model.

## Registry Output Contract

The source compiler should turn the seeds into a checked record resembling:

```json
{
  "jurisdiction": "Lafayette Parish",
  "body": "Lafayette City Council",
  "officialDomains": ["lafayettela.gov", "apps.lafayettela.gov"],
  "sourceKinds": [
    {
      "kind": "agenda",
      "discoveryUrl": "official URL",
      "expectedCadence": "meeting_cycle"
    },
    {
      "kind": "minutes",
      "discoveryUrl": "official URL",
      "expectedCadence": "meeting_cycle"
    }
  ],
  "discoveryMode": "dynamic",
  "status": "validating"
}
```

The compiler stores why a domain is official, representative documents, the
date window it tested, and every failed expectation. It does not activate a
body from a model's classification alone.

## Firecrawl Playbook

For each candidate body:

1. Map the official root and candidate source pages.
2. Search the official domain for agenda, minutes, ordinance, resolution,
   planning, zoning, meeting, hearing, notice, and packet patterns.
3. Retrieve current list pages and representative documents.
4. Render or interact when a client-side portal hides links.
5. Parse PDFs with page boundaries and OCR flags.
6. Record canonical and redirected URLs.
7. Hash every artifact and compare repeat retrievals.
8. Identify document-version behavior, including overwritten files.
9. Define expected cadence from an official schedule where possible.
10. Propose the source registry and run the gold set.

Use the Firecrawl agent only for source onboarding, structural change, or repair.
Once the registry is stable, use targeted operations and change tracking to
control cost and improve determinism.

## Gold Set

Create a checked-in, metadata-only manifest of exact public representative
artifacts. Store each URL, body, artifact type, date role, expected cadence, and
the record ID used for extraction. The compiler may add discovery candidates
around that set, but it may not substitute a model-selected URL for a required
sample. Missing artifacts remain failed requirements. Do not copy private data
or huge generated output into Git.

For each launch body, collect when available:

- two recent agendas or meeting packets;
- two corresponding minutes or results;
- one ordinance, resolution, or official decision artifact;
- one revised, amended, postponed, or canceled item;
- one item with a date;
- one item with a monetary amount;
- one item with a public deadline or hearing;
- for planning bodies, two case or zoning records;
- one negative example that must not become a substantive decision.

For final source certification, hand-label:

- artifact type and official body;
- expected meeting date;
- atomic decisions;
- names, amounts, deadlines, votes, and lifecycle state;
- exact page or excerpt supporting each fact;
- expected links between records;
- expected importance factors;
- facts that must remain unknown.

## Coverage Gate

A body becomes publicly supported only when:

1. every exact representative artifact in the checked manifest is retrieved;
2. the source registry uses only checked official hosts and document paths;
3. current and historical records can be separated;
4. every accepted material fact resolves to a source citation;
5. no unsupported name, date, amount, vote, deadline, or status is published;
6. source changes or a record's agenda-to-outcome update create immutable
   snapshots and publication versions;
7. an incomplete or failed source becomes limited or withheld;
8. an expected schedule can detect stale or missing coverage;
9. successful agenda and minutes runs for the same record both fall within the
   last 60 days;
10. every representative official source URL answers when checked from the
    production backend.

All public regions use this gate. There is no lower "beta" evidence standard.

## Promotion Gate

Coverage and promotion are different.

- A record can be valid and searchable without appearing in a main feed.
- Consequence ranking uses cited factors.
- Completeness becomes visible confidence.
- A consequential item with limited material can be promoted with a limited
  label if its importance itself is supported.
- A routine ceremonial or procedural item stays searchable but is not promoted.

## Freshness Expectations

The source registry should generate checks from official schedules:

- before the expected agenda publication window;
- at the expected publication window;
- before a hearing or meeting;
- after the meeting for minutes, results, vote, or updated packet;
- on a slower cadence for ordinances, implementation, and completed outcomes.

When no schedule is known, use a conservative daily or weekly check and mark the
expectation as inferred. The coverage page distinguishes official expectations
from inferred ones.

## First Backend Test Order

1. Lafayette council hub and document search
2. one Lafayette current agenda and one corresponding outcome
3. Lafayette planning/zoning packet
4. Youngsville current and archived records
5. Alexandria council
6. Pineville document center
7. Rapides Police Jury, including stale-page detection
8. Baton Rouge Metro Council version history
9. Planning and Zoning Commission in Baton Rouge

This order establishes the local demo first, then tests different portal shapes
before Public Parish claims geographic breadth.


## Slice 9 production release

PRs #93 through #99 and the narrow controlled-replay repair #100 are deployed
on production `befitting-flamingo-587`. Every merge passed its exact deployment
workflow and an independent live smoke. The bounded Rapides Parish Police Jury
canary is enabled, with one document and one target per run and 50 provider
admissions per day. The other six supported bodies remain owner-started.
[The production certification record](slice-9-production-certification.md),
[development certification](slice-9-development-certification.md)
and [operations runbook](slice-9-operations-runbook.md) keep development
proof separate from production proof.

Approved-source monitoring remains bounded by an owner policy and a deployment
switch. Accepted history uses paginated search and corpus Ask scans evidence in
batches. Coverage requests save demand without starting source work. Verified
launch notices, current issue share HTML, and private operating reports complete
the remaining public integrations.
