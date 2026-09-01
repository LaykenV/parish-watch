# Public Parish Plan

Status: Phase 0, evidence-engine Slices 1 through 4, and resident-interface Design Slices 1 through 8 are deployed
Event: Convex All Gas Hackathon
Submission deadline: September 22, 2026 at 12:00 PM Pacific

The production backend stores immutable official-source snapshots, extracts and
deterministically validates cited atomic decisions, runs a separate independent
review, and writes full, limited, or withheld immutable publication versions.
The first issue-link and importance proof ran in the personal development
deployment. PR #12 deployed the hardened Slice 3 backend as `8df651c`. PR #13
deployed Slice 4 as `c162543`; production workflow `33273984552` and the
independent production smoke passed. The controlled launch-data batch then
published 26 cited atomic records after Terra extraction, Luna review, and
deterministic policy: 15 Lafayette, 9 Rapides, and 2 East Baton Rouge records.
Fifteen are full and 11 are limited. Three targets stayed out after exact-citation
validation failures, and one negative control returned `not_found`. The
resident integration reads current full and limited atomic publications through
one bounded public query. Home, For You, and Explore label them as published
decision records and open the accepted official source. Withheld versions stay
hidden. No production issue build, importance assessment, or ranked issue feed
has run. Publication counts do not prove complete body coverage.

Resident-interface Design Slice 1 established the complete route blueprint.
Design Slice 2 then shipped the responsive shell plus fixture-backed Home, For
You, and Explore pages through PR #24 as `4e2ac67`. Explicit fixture URL
scenarios remain available for deterministic QA in development builds. The
resident pages do not show a fixture banner, and production ignores fixture
parameters instead of presenting fixture records. PR #25 deployed the owner
phone-review refinements as `b22e321`, including structured card headers and
status pills, Coss action treatments, one-color Watching text, and a Louisiana
Coverage icon. Production workflow `33324166404` and the independent smoke
passed. The current integration replaces the production discovery empty states
with accepted atomic records.

PR #27 deployed Design Slice 3 as `3a59e45`. It implements the issue, atomic
decision, meeting, and citation-level evidence surfaces. Its explicit typed
fixtures load only through development-only imports, add no resident-facing
banner, and stay out of production JavaScript. Production routes show an honest
recovery page until real issue, decision-detail, and meeting-detail queries
exist.

PR #28 merged resident-interface Design Slice 4 as `ff36c1b`. Its production
workflow `33389489990` succeeded. Ask resolves corpus, issue, and meeting scope
through a typed adapter, renders cited answers
in the existing evidence gutter, and moves the resident's question out of the
URL into an in-memory handoff. No chat backend exists behind it. Production
keeps Ask in navigation and shows the honest unavailable state, and the record
pages show that same message in place of a composer, so no resident is asked
for a question the product cannot take. Eleven presentation scenarios load only
through a development-only dynamic import.

PR #31 deployed Design Slice 5 as `adfe81e`. Production workflow `33401768387`
and the independent production smoke passed. The fixture-backed follow and
ownership interface covers Google return, email-only verification, Following,
areas and topics, notification preferences, scoped email management, and alert
layouts. The production routes remain unavailable until Convex Auth and
AgentMail pass their integration gates.

PR #34 deployed Design Slice 6 as `0aa7474`, including Coverage, coverage
requests, the public method page, area states, and private source-problem
reporting. PR #37 deployed Design Slice 7 as `f854c2e` and made route focus,
loading, sheets, live announcements, and reduced motion consistent across the
application. PR #43 deployed the final connected prototype as `85d6947`.
Production workflow `33454522729` and the independent production smoke passed.
The final UI carries development evidence scenarios and bounded return routes
across discovery, records, Ask, Following, and Coverage without exposing
fixtures in production.

The resident UI design and implementation track is complete. The production
resident loop is not. The resident-evidence integration connects current
accepted decisions, grouped meeting evidence, exact citations, and fail-closed
issue subscriptions to the finished routes. A fresh production issue build and
realtime change proof still gate issue availability and PR 6A. Ask, account,
follow, AgentMail, coverage, request, and private-report adapters remain in the
post-Slice-5 implementation plan.

## Executive Decision

Enter the hackathon with Public Parish, a fresh application built around one
complete resident outcome:

> See what local government is about to change, understand the official evidence,
> ask a question, follow the issue, and learn what happened.

This is a justified four-week exception to the normal business plan because the
founder has previously won this Convex hackathon, cares about the domain, has
credible local distribution, and can turn the work into a public case study.
It is not a substitute for selling Varholdt services. The weekday 90-minute
sales block, partner outreach, and first-dollar goals remain protected.

The project can be broad in capability without becoming broad in promise. It
will launch with defined bodies in three Louisiana regions, use a dynamic
coverage compiler instead of hand-coding every portal, and hold every supported
place to one evidence standard. The product will not claim statewide coverage.

## Winning Thesis

The project is strong enough to contend if the submission proves all of these at
once:

1. A normal resident can use it immediately, without learning government jargon.
2. It operates on real, current Louisiana records across more than one portal
   shape.
3. Every meaningful statement has an official-source receipt and visible
   uncertainty.
4. Firecrawl, OpenAI, AgentMail, and Convex each perform essential work in one
   live workflow.
5. A source change becomes a validated update, a realtime interface change, and
   a useful email alert.
6. Real residents use the product before judging.
7. The demo shows the product doing the work instead of describing future scope.

The winning version is not “AI summarizes council meetings.” It is a live civic
evidence system that connects a resident, a consequential issue, the official
record, a question, a change, and an outcome.

## Problem

Louisiana local-government information exists, but it is split across agenda
centers, document searches, PDFs, minutes, ordinances, calendars, and videos.
Residents usually encounter a controversy after the important deadline or must
read an entire meeting packet to understand one item.

The missing layer connects:

- the issue a resident cares about;
- the granular decisions and meetings that move it;
- what changed and when;
- the official evidence for each claim;
- what the public can still do;
- the final decision and later implementation.

## Product Promise

Public Parish is free, open source, nonpartisan, source-cited, and correctable.
It tells residents what a supported local body is considering, why a decision
may matter, when action is expected, how to inspect the original record, and
what happened next.

It does not tell residents what political position to take. "Why this may matter"
describes cited effects on public money, public assets, land use, health and
safety, rights and access, service delivery, and public deadlines. It does not
use outrage, popularity, or the founder's opinion as a ranking signal.

## Launch Coverage

### Lafayette Parish

- Lafayette City Council
- Lafayette Parish Council
- Youngsville City Council
- Lafayette planning and zoning bodies

### Rapides Parish

- Alexandria City Council
- Pineville City Council
- Rapides Parish Police Jury
- relevant planning and zoning bodies after official-source discovery

### East Baton Rouge Parish

- Metropolitan Council
- Planning Commission

All three regions receive the same public trust standard. Their source adapters
and body structures can differ. The internal coverage compiler may discover and
validate a new jurisdiction, but it does not make that jurisdiction public until
its source set passes the coverage gate. The public coverage-request form only
records demand and an optional notification address. It never starts a crawl.

## Core Resident Experience

### 1. Choose What Is Local

The resident selects a parish or municipality and optional topics. No street
address is requested. Signed-in users can save multiple areas.

### 2. Discover Decisions

The home experience has:

- **For You:** decisions matching saved areas and topics;
- **Major local decisions:** consequential current decisions in supported areas;
- **Search:** every published decision and source record, including items that
  are not promoted.

### 3. Understand an Issue

An issue page connects the underlying proposal, hearing, agenda item, amendment,
vote, contract, and outcome when the official record supports that relationship.
It shows:

- a plain-language explanation;
- "Why this may matter" factors with citations;
- current stage and next known date;
- remaining public actions and deadlines;
- a chronological decision timeline;
- exact citations and original sources;
- last-checked time, confidence, and coverage health;
- source revisions and published fixes.

Atomic decisions remain available. Uncertain relationships remain separate.

### 4. Ask Public Parish

Anonymous visitors can hold a multi-turn chat about the current issue or any
published Public Parish evidence. The same device keeps continuity for 24 hours.
Chat never requires sign-in and never searches the open web for civic facts.

When the validated corpus does not answer a question, Public Parish says that the
answer was not found and links the relevant official contact or source. It does
not improvise.

### 5. Follow and Receive an Outcome

Accounts are optional. Google accounts provide saved interests and managed
follows. A resident who does not want an account can verify an email-only
subscription through AgentMail. Either owner can follow an issue, topic, body,
or municipality. AgentMail sends immediate material-change alerts and an
optional weekly roundup of material updates.

Material changes include a new decision, amendment, deadline, meeting change,
vote, contract award, implementation update, or outcome.

### 6. Inspect Coverage and Report a Source Problem

A public coverage page shows bodies, source health, last successful check, and
known limits. A resident can report a wrong fact, broken citation, or missed
official source through a dedicated AgentMail address. Reports stay private and
do not start an automated workflow. The owner may rerun the normal evidence
pipeline. If the accepted public record changes, the issue's normal revision
history shows the fix.

### 7. Find Voting Information

The landing page carries one small, dated voter-information strip: the next
statewide election date and an outbound link to the Louisiana Secretary of
State's official voter portal for registration status and a resident's sample
ballot.

The strip is static hand-authored content. It runs no crawl, no extraction, and
no model call. It names no candidate, party, office, or position, and it ranks
nothing. Public Parish points at the official voter portal instead of restating
what that portal already publishes, so the strip sits outside the publication
contract without weakening it.

Confirm the election date against the Secretary of State's official calendar
before the strip goes live. Do not write the date from memory. Remove or advance
the strip once that date passes.

## Government Record Model

The system extracts granular records such as proposals, hearings, votes,
contracts, appointments, and public actions. It can connect them into an issue
timeline with these lifecycle states:

1. discovered
2. proposed
3. scheduled
4. amended
5. postponed
6. decided
7. implementing
8. completed
9. canceled
10. unknown

The pipeline extracts all useful official records for completeness and search.
Promotion to the main feeds requires a substantive decision and a valid
importance assessment.

## Sponsor Roles

| Provider  | Essential responsibility                                                                                                              | Visible proof                                                |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Convex    | Evidence graph, workflow state, source versions, live queries, AI Gateway, chat state, follows, schedules, Auth v2 alpha, and hosting | A validated source change updates the resident UI live       |
| Firecrawl | Maps official sites, discovers sources, retrieves pages and PDFs, renders difficult pages, parses documents, and detects change       | A new or changed government artifact enters the pipeline     |
| OpenAI    | Produces strict structured extraction, independent review, consequence factors, issue-link proposals, and grounded answers            | The app turns a source packet into cited records and answers |
| AgentMail | Persists civic email threads and sends material-change and outcome alerts                                                             | A follower receives and can reply to a sourced update        |

No provider is present only for a logo or a trivial API call.

## Technical Direction

- Frontend: TanStack Start in SPA/static-prerender mode
- Hosting: Convex static hosting on a public `convex.site` URL
- Sharing: per-issue Open Graph HTML from a Convex HTTP route that reads only
  published issue data and points visitors to the canonical issue page
- Backend: Convex queries, mutations, actions, scheduling, HTTP actions, and
  realtime subscriptions
- Auth: pinned Convex Auth v2 alpha with Google OAuth
- Retrieval: Firecrawl through its Convex component
- Email: AgentMail through its Convex component, including verification of
  email-only alert subscriptions
- AI: OpenAI Chat Completions through Convex AI Gateway with strict
  `response_format` JSON schemas
- Models: `openai/gpt-5.6-terra` for record extraction, consequence factors,
  and issue linking; `openai/gpt-5.6-luna` for discovery classification,
  ranking, independent publication review, and chat
- Evidence: immutable source snapshots, content hashes, precise excerpts, PDF
  pages or sections, retrieval times, processing history, and published versions

See `docs/architecture.md` for the full design.

## Publication Contract

A claim may become public only when:

1. the source belongs to the body's approved official-domain registry;
2. an immutable source snapshot exists;
3. extraction returns the strict schema;
4. every material fact resolves to a citation in that snapshot;
5. deterministic checks pass for names, dates, amounts, links, and source
   versions;
6. an independent OpenAI review returns a valid verdict;
7. the final publication policy passes.

If the source is incomplete, the product shows “Limited information available”
or withholds the card. A second model call cannot turn absent evidence into a
fact.

## Success Scorecards

### Civic Proof

- 25 real residents use the live app
- 10 issue or topic follows
- 10 substantive chat questions
- several users return or open an update
- one real decision is followed from discovery through a later outcome
- zero published claims without a resolving citation

### Hackathon Proof

- fresh Convex application and public repository
- public `convex.site` app usable without an invite
- meaningful Convex, Firecrawl, OpenAI, and AgentMail integrations
- Convex AI Gateway and Auth v2 alpha working in the public app
- live source-change demonstration
- current root `hackathon.md`
- under-three-minute demo dominated by product interaction
- technical build posts on X or LinkedIn that tag all required sponsors
- submission on vibeapps.dev before the deadline

### Business Proof

Keep this separate from civic usage:

- qualified business conversations
- Workflow Diagnostics
- proposals
- deposits
- inbound requests from actual buyers or partners

Views, resident signups, and hackathon attention are not counted as business
leads.

## Distribution

- X and LinkedIn: technical build progress, sponsor integration, reliability,
  and hackathon story
- TikTok and Facebook: resident problem, official evidence, current local issue,
  and how to use Public Parish

One recording can produce separate edits. Content work is capped near 90 minutes
per week. Posts in local Facebook groups must follow group rules and identify the
builder transparently.

The product voice stays nonpartisan even when the surrounding issue is
controversial.

## Scope Guardrails

Do not build these before the complete loop is working and used:

- exact-address personalization;
- maps;
- public comments or discussion;
- testimony generation;
- public-records request automation;
- a separate procurement product;
- full meeting-video transcription;
- a municipal staff portal;
- every Louisiana parish;
- generic civic-platform configuration work.

The hackathon scope permanently excludes FAQ aggregation, a productized public
corrections workflow, public-triggered coverage compilation, live public
compiler progress, and cross-device chat history. It also permanently excludes candidate
profiles, ballot matching, and any district-level election feature. The
landing-page voter-information strip is the only election surface, and it makes
no claim of its own. Keep the public "Request your
parish" form as demand capture, and run the coverage compiler only from an
owner-controlled operation. Weekly roundup emails and per-issue dynamic share
HTML remain part of the planned product.

If schedule pressure appears, cut geographic breadth behind the public coverage
gate before weakening citation, review, source versioning, chat grounding, or the
end-to-end Lafayette demo.

## Post-Hackathon Rule

After submission, continue adding product features only if at least one of these
is true:

- residents repeatedly use alerts or return for outcomes;
- a named newsroom, civic group, or government body will distribute or verify
  the service;
- a qualified commercial opportunity emerges.

Otherwise, preserve Public Parish as a useful open-source civic service and a
strong technical case study, then return product time to the core business.
