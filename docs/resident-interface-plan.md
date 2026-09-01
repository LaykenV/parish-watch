# Public Parish resident interface plan

Status: approved resident design; Design Slices 1 through 8 are deployed

Decision grill completed: August 29, 2026

Implementation checkpoint: Design Slice 1 deployed through PR #14 as
`6e46fd7`. Design Slice 2 deployed through PR #24 as `4e2ac67` with the
responsive shell plus fixture-backed Home, For You, and Explore. PR #25 deployed
the owner phone-review refinements as `b22e321`. PR #27 deployed Design Slice 3
as `3a59e45`, including the issue, decision, meeting, and citation surfaces. PR
#28 merged Design Slice 4 as `ff36c1b`; production workflow `33389489990`
succeeded. PR #31 deployed Design Slice 5 as `adfe81e`; production workflow
`33401768387` and the independent production smoke passed. PR #34 deployed
Design Slice 6 as `0aa7474`. PR #37 deployed Design Slice 7 as `f854c2e`. PR
#43 deployed Design Slice 8 as `85d6947`; production workflow `33454522729`
and the independent production smoke passed. The complete design and frontend
contract is closed. Later releases connected accepted issue, decision, meeting,
citation, and bounded anonymous Ask adapters without reopening the design.
Account, follow, email, coverage-request, and private-report API connections are
not complete. The current primary navigation is Home, Explore, Ask, and
Coverage; legacy `/for-you` and `/issues` index routes redirect to the issue-led
Home.

## Purpose

This plan defines the complete resident interface before API integration changes
page structure. It gives a design agent eight bounded assignments that still
produce one application.

Public Parish helps a Louisiana resident see what a supported local government
may change, understand the official evidence, ask a source-grounded question,
follow the issue, and learn what happened.

Read these files before starting any design slice:

- [`../PLAN.md`](../PLAN.md)
- [`decisions.md`](./decisions.md)
- [`product-spec.md`](./product-spec.md)
- [`architecture.md`](./architecture.md)
- [`sources.md`](./sources.md)
- [`build-plan.md`](./build-plan.md)
- [`hackathon.md`](./hackathon.md)
- [`design-system.html`](./design-system.html)
- [`marketing-page.md`](./marketing-page.md)

This file resolves the page and interaction choices those documents left open.
It does not weaken the publication, privacy, source, accessibility, or coverage
contracts.

## Build and truth boundary

Design and build the complete frontend now. Include Ask, Follow, Google sign-in,
email-only verification, Following, notification preferences, coverage requests,
and private source reporting in their final page positions. Do not design a
partial page that must be reorganized when those APIs arrive.

Use typed fixtures and local design adapters while an integration is unfinished.
Fixtures may demonstrate success, failure, loading, limited evidence, and signed
in states in development. They must remain clearly labeled in design files and
must never become public civic claims or production seed data.

Frontend-complete does not mean production-ready. A production build cannot
simulate a sent alert, created follow, verified account, chat answer, coverage
request, or source report. Promote each interaction only after its real backend
path passes its acceptance gate.

The design slices below divide work. They do not divide the product promise.

## Experience contract

The interface must make these facts obvious without teaching pipeline terms:

1. The issue is the main resident object.
2. A decision record preserves the granular government action.
3. Every material claim can open the official evidence that supports it.
4. Missing evidence produces a limited explanation, not a guess.
5. Reading, browsing, search, and Ask work without an account.
6. Sign-in appears only when a resident wants saved interests or managed follows.
7. Email-only alerts do not create an account.
8. Coverage status describes source health, not political importance.
9. A live publication change updates the page without a refresh.
10. The interface never tells a resident what political position to take.

## Design direction

### Subject

The subject is a Louisiana resident trying to understand one consequential local
decision from official records. The application is a civic utility with an
editorial reading rhythm. It is not a government portal, campaign, newsroom, or
generic AI assistant.

### Visual foundation

Keep the selected system in [`design-system.html`](./design-system.html):

| Role           | Value     | Use                                             |
| -------------- | --------- | ----------------------------------------------- |
| Paper          | `#FAFAF9` | Page background                                 |
| Card           | `#FFFFFF` | Cards, sheets, and focused controls             |
| Ink            | `#171717` | Identity, body text, and primary actions        |
| River blue     | `#315BEA` | Information, links, evidence, and focus support |
| Evidence green | `#10B981` | Confirmed success and healthy evidence          |
| Warning amber  | `#F59E0B` | Delayed, limited, and degraded states           |
| Muted ink      | `#686864` | Secondary information                           |

Inter handles headings, body text, navigation, and controls. Geist Mono handles
dates, source metadata, record identifiers, and compact data. Keep the existing
double-P mark. Ship one light theme for the hackathon.

Pills are allowed in the application when they represent a filter, topic,
selection, or compact status. Do not use pills as decoration, headings, or page
containers. The landing-page restriction against pills does not ban useful app
controls.

### Signature interaction

The evidence gutter is the application's one deliberate visual risk. A material
claim has a compact written Source control aligned with it. Activating the
control highlights the claim and opens the exact excerpt beside the reading
column on desktop. A thin river-blue rule may connect the selected claim to the
panel. Mobile uses the same Source control and opens a bottom sheet.

This interaction belongs to Public Parish because it exposes the connection
between a resident explanation and the official record. Keep the rest of the
application quiet so the evidence relationship remains memorable.

### Anti-template check

The design fails if it could describe an unrelated dashboard after changing the
logo. Reject these patterns:

- a generic hero followed by equal feature cards;
- statistics used as decoration;
- nested rounded cards around every section;
- colored blocks that give blue, green, and amber equal visual weight;
- fake document screenshots or invented civic claims;
- floating chat widgets;
- social popularity treatments;
- government seals, campaign colors, or tourism imagery;
- model confidence, importance scores, or evidence-completeness percentages.

## Responsive system

Design the 375-pixel frame first. Expand the same reading order at larger
widths.

| Width                   | Required behavior                                                         |
| ----------------------- | ------------------------------------------------------------------------- |
| Below `48rem`           | One-column pages, mobile top bar, persistent bottom navigation            |
| `48rem` through `64rem` | Wider reading column and simple two-column collections where useful       |
| Above `64rem`           | Desktop header, up to three issue cards, optional evidence or status rail |

Every slice must provide 375-pixel mobile and 1440-pixel desktop frames. Add
320, 414, 768, and 1280 frames when the layout changes or content may fail.
The final QA slice checks all six widths.

Global requirements:

- no page-level horizontal overflow;
- 44 by 44 CSS pixel minimum touch targets;
- no more than 8 rem of combined app-owned top and bottom chrome on a
  375-by-667-pixel viewport before safe-area insets;
- only the bottom navigation remains fixed on mobile after the top bar scrolls
  away;
- no essential hover-only interaction;
- no drag-only control;
- visible focus and logical keyboard order;
- source panels and sheets return focus to their opener;
- reduced motion preserves every state change;
- long civic titles wrap without losing words on detail pages.

## Application shell

### Desktop

The desktop header contains the double-P mark and live-text name, Home,
Explore, Ask, Coverage, the current area control, and the account control. The
mark and name link to Home from every route, including Home itself. Keep the
header available while scrolling, but do not let it cover anchored claims or
headings.

### Mobile

The mobile top bar contains the compact mark and name, current area control, and
account control. The mark and name link to Home. A persistent bottom bar
contains Home, Explore, Ask, and Coverage. Hide the bottom bar while the
keyboard is open and while a full-screen sheet or dialog owns focus.

The top bar scrolls with the page. Do not pin both bars around a narrow reading
window. Keep the top bar at or below 3.5 rem and the bottom navigation at or
below 4.25 rem before safe-area padding. The controls inside both bars retain
their 44-by-44-pixel targets.

Detail-page Back links sit inside page content. They do not replace the global
header.

### Top-level navigation behavior

Treat Home, Explore, Ask, and Coverage as stable top-level destinations.
Preserve each destination's nested route and scroll position while the resident
moves among them. Tapping the active destination again scrolls its current page
to the top. Keep icon labels visible, and never put contextual actions such as
Follow or Share in the bottom navigation.

The browser owns the screen-edge Back gesture. Do not add horizontal swipe
navigation between top-level destinations.

### Mobile sheets

A written control opens every sheet. Source, More filters, Follow, Choose area,
and Report a source problem remain discoverable without a gesture. A visible
grabber appears after the sheet opens and signals drag support. It is not an
opener or the only way to operate the sheet.

Every sheet provides an explicit Close control, backdrop dismissal when safe,
and downward drag dismissal. Closing returns focus and scroll position to the
exact opener. Long content scrolls inside the sheet without fighting the
dismiss gesture. Reduced motion preserves the same open, expanded, and closed
states.

Use these starting heights:

- Evidence opens at a medium height and expands to full height for a long
  excerpt, warning, or document metadata.
- More filters opens tall with Clear and Show results above the safe area.
- Follow opens at a medium height and expands in place for email verification.
  Never nest a second sheet inside it.
- Area selection opens tall and becomes full height when search opens the
  keyboard or the available height is short.
- Report a source problem uses a full-height sheet on mobile when its form opens
  the keyboard.
- Unfollow all uses a focused confirmation dialog rather than a draggable
  sheet.

Hide the bottom navigation when a sheet reaches full height. Medium sheets may
cover it instead of leaving two competing control bars visible. Apply top,
right, bottom, and left safe-area insets to fixed controls and sheet actions.

### Gestures, rails, and sharing

The initial gesture vocabulary is horizontal rail scrolling, sheet resizing or
dismissal, and the browser's native Back gesture. Do not make swipe the only way
to reveal Mute, Unfollow, filters, evidence, or another action. Do not add
vertical page snapping.

Issue rails use native momentum, proximity snapping, the page gutter as scroll
padding, and a visible part of the next card. A vertical gesture that begins on
a rail must still scroll the page. Desktop arrows duplicate horizontal scrolling
only when overflow exists.

On supported devices, Share opens the system share sheet. Copy link remains the
fallback and reports success inline.

### Route loading

Show a spinner immediately when route loading starts. Place it inside one fixed,
reserved loading region. A redirect chain reuses the same region and spinner
instance. The spinner rotates in place but never remounts, shifts, resizes, or
jumps between containers.

During background refresh, preserve loaded content. Do not replace it with a
spinner.

### Action loading and success

Keep the action label unchanged while it runs. Put a spinner in a fixed icon
slot, keep the control width stable, mark it busy, and prevent duplicate input.

Keep feedback inline. Copy changes its icon to a check and briefly receives a
green success border. Use no toast when the initiating control can show the
result. A toast is a last resort for a result with no natural location.

## Sitemap

```text
/
|-- /explore
|-- /ask
|-- /coverage
|   `-- /coverage/request
|-- /issues/:issueSlug
|-- /decisions/:recordKey
|-- /meetings/:meetingId
|-- /how-it-works
|-- /following
|   |-- following
|   |-- areas-and-topics
|   `-- notifications
|-- /email/manage/:token
`-- private source-problem flow
```

`/share/issues/:slug` is a small server-generated Open Graph page. Human
visitors continue to the canonical issue route. Citation selection uses URL
state on the issue, decision, meeting, or Ask page rather than a separate public
source page.

Do not add a government-body detail route during the hackathon. Coverage owns
body status and method information. Explore may filter by body and link to the
matching Coverage entry.

### Issue succession

The current issue key freezes the exact decision membership. If later evidence
creates a newer overlapping issue, preserve the historical route. Add a notice
that links to the newer timeline. Feeds and search promote the newer issue.
Never silently rewrite the older page or discard its evidence history.

## Shared vocabulary

Use these resident terms consistently:

| Internal concept       | Resident term       |
| ---------------------- | ------------------- |
| Linked issue record    | Issue               |
| Atomic record          | Decision record     |
| Government institution | Government body     |
| Citation affordance    | Source              |
| Publication history    | Update history      |
| Exact extracted title  | Official item title |
| Developing             | Developing          |
| Scheduled              | Scheduled           |
| Active                 | In progress         |
| Decided                | Decided             |
| Canceled               | Canceled            |
| Complete               | Completed           |
| Unknown                | Status not stated   |

Use `Why this may matter` for accepted consequence factors. Use `What the public
can still do` only when an official source supports an available action. Omit
the section when no action is supported.

Standard evidence language:

- Evidence available
- Limited information
- Source delayed
- Outcome not posted
- Relationship uncertain
- Coverage degraded

Name controls by their result. Prefer Choose area, View issue, Open
official document, Send question, Follow, Save interests, Request coverage, and
Report a source problem. Avoid Submit, Continue, Learn more, and OK when a
specific verb is available.

## Page contracts

### Home

The home page is useful before setup and more compact after setup.

First visit order:

1. Existing hero headline and Louisiana relief
2. Searchable `Choose a parish or city` control
3. `Browse current issues` skip action
4. Issue timelines for the selected or saved areas
5. Latest atomic decision records
6. Conditional coverage warning
7. Voter information strip

Keep the relief as the visual, not the required selection control. On mobile,
place the area control before a shorter relief so the first useful control stays
near the top. Ask only for location in the hero. Topic selection belongs in the
saved-interest controls after the resident has seen useful records. The searchable area field opens
the selector directly; do not stack a second button that opens the same dialog.

After the browser stores an area, replace the full hero with a compact
`Watching [area]` header and Change area action. The feed follows immediately.

Issue timelines use equal-weight cards because the live projection does not yet
publish a resident-facing importance score. Decision records use compact rows
underneath. A record remains discoverable even when Public Parish has not
validated its relationship to an issue.

The voter strip remains below the decision content. It follows the exact scope
and verification rules in [`product-spec.md`](./product-spec.md).

### Legacy discovery routes

`/for-you` redirects to Home. `/issues` redirects to the issue section on Home.
The cited `/issues/:issueSlug` detail routes remain stable. Store one active
signed-out area on the device. A signed-in resident may save several areas.
Temporary Explore filters do not rewrite saved preferences.

### Explore

Explore is a browse and search page. Before a query, show current issues,
upcoming decisions, recent outcomes, and routine searchable records. Search
across issues, decision records, meetings, bodies, official source titles, and
accepted text fields.

Use one result sequence with a visible type label. Issues appear before
individual records and get the richest treatment. Decision records and meetings
use compact rows. Body results link to Coverage.

Show Place, Topic, and Date near the search field. Put Body, Lifecycle, Record
type, and Source status in More filters. Mobile uses a sheet. Desktop uses a
collapsible filter column. Store the query, filters, and sort in the URL.

Realtime changes never reorder content under the resident's pointer. Show one
quiet `Update available` row with a refresh action. Use no animation, counter,
or activity stream.

### Shared issue card

Every promoted issue card shows:

1. Plain-language title
2. Place and responsible body
3. Current state
4. Next date or latest outcome
5. One sentence explaining why it may matter
6. Evidence status and last checked time
7. View issue action

Home makes the selected or saved area visible. Do not show a numeric importance
score, model confidence, completeness percentage, source kind, or a row of
topic metadata.

The title and View issue control navigate. The rest of the card is not one giant
link. This leaves a separate action row for Follow and Share without nested
interactive controls. Cards may clamp an unusually long title to three lines.
Detail pages never truncate it.

Mobile rails show about 85 percent of the first card and part of the next. Use
native overflow and proximity snapping. Desktop shows up to three cards and
adds previous and next controls only when overflow exists.

### Issue

The issue page is the main product page.

Mobile order:

1. Place, responsible body, and current state
2. Plain-language title
3. Next known date or latest outcome
4. Evidence status and last checked time
5. Follow and Share
6. What is happening
7. What the public can still do when supported
8. Why this may matter
9. Ask Public Parish
10. Decision timeline
11. What changed
12. Sources, update history, and problem reporting

Desktop keeps the same reading order. A narrow right rail holds current state,
next date or outcome, evidence health, last checked time, Follow, and Share. The
main column holds explanation, consequences, Ask, timeline, and revisions.

Each material claim has a written Source control. Mobile opens a bottom sheet.
Desktop opens the evidence panel beside the claim. The viewer contains the
exact excerpt, official body, document title and kind, page or section,
retrieval date, OCR or truncation warning, and Open official document action.

Timeline entries show date, decision type, state, short summary, and meaningful
change without requiring expansion. Separate Source and View decision actions
open the evidence and atomic record.

What changed distinguishes Government update, More information posted, and
Public Parish correction. Omit formatting-only source changes and internal run
history.

A limited issue keeps the supported title and source context, states that the
official source does not support a full explanation, and omits unsupported
sections. A degraded source keeps the last accepted issue visible with its date
and a factual warning.

When a live issue version arrives, update the content without a refresh and show
one quiet line: `Updated from the official record. See what changed.` Do not add
a toast, animation, countdown, or activity indicator.

### Decision record

Use the plain-language title as the heading. Put the complete government wording
under Official item title.

Page order:

1. Proven related issue link
2. Plain-language title
3. Official record identifier
4. Government body, record type, and current state
5. Latest outcome or meeting date
6. Plain-language summary
7. Accepted fields
8. Official item title
9. Sources
10. Material update history
11. Report a source problem

Use a definition list for accepted fields. Each value has a nearby Source
control. Omit unsupported fields. Use `Not stated in the available source` only
when the absence explains a meaningful limit.

Translate internal versions into resident events such as Scheduled for
consideration, More information became available, and Council approved the
ordinance. Put technical policy and payload versions inside an optional details
disclosure.

If the newest source supports less information than an earlier accepted version,
show the current limited record as current. Keep the earlier dated version in
history without carrying old fields forward as present facts.

### Meeting

Page order:

1. Body, date, status, and official location text
2. Agenda, packet, minutes, results, and official video links
3. Substantive issues and decisions
4. Routine records
5. Meeting-scoped Ask
6. Source availability and versions
7. Report a source problem

Use compact issue cards for substantive items with a proven issue. Use decision
rows for unlinked substantive records. Put routine and procedural records in a
collapsed section with a count while keeping them searchable.

Meeting artifacts use Available, Expected after the meeting, Delayed, Not
published, or Not monitored. Explain when Public Parish last checked. Do not use
disabled document buttons or empty placeholders.

### Ask Public Parish

The empty Ask page contains a short source statement, current area and evidence
scope, one large question field, no more than three evidence-based example
questions, and recent same-device conversations when available. Do not use a
mascot, fake greeting, or empty chat bubbles.

Submitting from an issue or meeting opens the dedicated Ask route with that
scope attached. Show Back to issue or Back to meeting. Scope language is
explicit:

- Answering from this issue
- Answering from this meeting
- Searching all validated Public Parish evidence

Changing scope starts a new conversation. Never broaden a question silently.

The mobile composer stays above bottom navigation. When the keyboard opens, hide
bottom navigation and keep the composer above the keyboard. Enter sends on a
desktop keyboard. Shift plus Enter adds a line break. Touch users get an
explicit Send control.

Do not stream unvalidated answer text. Show a stable working spinner, validate
the complete answer and sources, then display:

1. Direct answer
2. Short explanation
3. Source controls beside supported claims
4. Collapsed Sources used list
5. Up to three supported follow-up questions

Source controls reuse the evidence viewer. A not-found result is a valid answer,
not a red error. Use the approved not-found language, then show the closest
official source, relevant contact when available, and a narrower supported
question.

Explain the 24-hour same-device limit once near the first anonymous
conversation. An expired thread no longer displays its private messages and
offers a new question. Normal abuse limits remain invisible. A cooldown keeps
the thread, disables Send, and states when the resident may try again.

### Follow and account flows

A signed-out Follow action opens a mobile sheet or desktop dialog titled `Get
updates about this issue`. Give Continue with Google and Use email only equal
weight.

Choose Immediate material updates, Weekly roundup, or Both before authentication
or email verification. Default to immediate updates and preserve the choice
through the flow.

The email-only sheet keeps three states in one place: enter email, enter the
short-lived code, and confirm the follow. Explain that this creates an alert
subscription, not an account. Google returns the resident to the original
target and completes the saved follow.

Follow control states are Follow, Verification needed, Following, Muted, and
Unavailable. Do not show Following before the backend confirms it.

Place follow actions where the target makes sense:

- issue follow on issue pages and promoted cards;
- topic follow in saved interests;
- body follow in Coverage;
- municipality follow in area selection and saved areas.

### Following

`/following` has three views: Following, Areas and topics, and Notifications.
Desktop uses compact tabs. Mobile uses a simple view selector.

The Following list orders targets by latest material change or next known date.
Filters cover Issues, Topics, Bodies, and Places. Each row shows target, latest
change, next date, delivery frequency, coverage health, and Manage.

Mute stops delivery and preserves the follow. Unfollow removes one target and
offers a short inline Undo. Unfollow all requires confirmation.

Email-only messages include a secure Manage this follow link. Its narrow page
can change frequency, mute, or unfollow that subscription. It does not create a
user session or reveal other subscriptions.

### Notifications

Immediate email order:

1. What changed
2. Current state or next date
3. Why it may matter
4. Official source receipts
5. Open the issue
6. Reply with a question
7. Manage delivery

Weekly roundups group by followed place, then issue. Put deadlines and outcomes
before lower-priority changes. Send nothing when no material change exists.

A source delay does not create a normal material-change alert. Show it beside
the affected follow and in the next relevant roundup. Send a separate service
notice only when monitoring of that target is materially blocked.

An email reply stays scoped to the issue that produced the alert and uses the
same grounded answer and not-found behavior as Ask.

### Coverage

Group bodies under Lafayette Parish, Rapides Parish, and East Baton Rouge
Parish. Use stacked mobile rows rather than a wide table.

Each row contains body, coverage state, monitored sources, last successful
check, next expected artifact when known, public-safe limitation, method link,
and Follow body when available.

Public states are Supported, Degraded, Validating sources, Paused, and Not
supported. Do not use Beta. Show Validating sources only for the defined launch
bodies. Never expose request counts, internal compiler progress, failed
discovery attempts, or a public queue.

Degraded bodies retain accepted dated records and state what expected source is
delayed, when the last successful check occurred, and whether current decisions
may be missing.

### Area selection and coverage requests

The area selector lists supported places first. Defined launch areas still
being validated appear as unavailable rows with written status. End with `Not
seeing your area? Request coverage.` Do not select an unsupported area into an
empty Home feed.

The request form asks for parish or municipality, optional official government
homepage, and optional email for a launch notice. Record the request before
email verification. Verification failure removes only notification interest.

Duplicate requests receive the same neutral confirmation. Do not reveal demand
counts, other requesters, ranking, or a promised timeline.

### How Public Parish works

Use `How it works` as the link and `How Public Parish works` as the heading.
Explain official sources, Source controls, deterministic checks, independent
review, limited information, update history, neutrality, coverage standards,
privacy, open-source code, and private problem reporting.

Keep the main explanation resident-readable. Put model roles, hashes, pipeline
stages, provider details, and architecture in an optional technical section.
Sponsor and hackathon information remains secondary.

### Report a source problem

Open a small private form with problem type, short description, optional
official URL, optional reply email, and the automatically attached Public Parish
record URL. Send it to the dedicated AgentMail inbox. It does not open a public
thread or trigger automatic processing.

Use this confirmation:

> Report sent privately. Public Parish will not change this page unless
> validated official evidence supports the correction.

## Shared component inventory

The design agent owns the composition and variants for these components:

| Component          | Required variants and behavior                                                       |
| ------------------ | ------------------------------------------------------------------------------------ |
| Application shell  | Desktop header, mobile header, bottom navigation, active route, keyboard-open state  |
| Area selector      | Supported, validating, unsupported, signed-out stored area, multiple signed-in areas |
| Route spinner      | Immediate, fixed region, stable through redirects, accessible busy state             |
| Action spinner     | Fixed icon slot, stable label and width, duplicate prevention                        |
| Issue card         | Standard, limited, delayed, following                                                |
| Compact result row | Decision, meeting, body, routine record                                              |
| Filter pill        | Default, hover, focus, selected, disabled, removable                                 |
| Status treatment   | Lifecycle, evidence, coverage, follow, artifact availability                         |
| Source control     | Inline claim, page number, selected, keyboard focus                                  |
| Evidence viewer    | Mobile sheet, desktop panel, long excerpt, OCR warning, original link                |
| Timeline           | Proposal, scheduling, postponement, vote, implementation, completion, uncertain link |
| Update entry       | Government update, more information, Public Parish correction                        |
| Ask composer       | Empty, scoped, sending, cooldown, failed, keyboard-open                              |
| Answer             | Supported, not found, citations, suggested follow-ups                                |
| Follow sheet       | Delivery choice, Google return, email entry, code, success, failure                  |
| Following row      | Active, muted, degraded, upcoming, changed                                           |
| Coverage row       | Supported, degraded, validating, paused, not supported                               |
| Notice             | Offline, limited, delayed, live update, expired, private confirmation                |
| Inline success     | Copied, saved, followed, reported, undo                                              |
| Empty state        | Home, Explore, Following, meeting artifacts                                          |
| Error state        | Section, route, provider, form, expired management link                              |

Use cards only for promoted issues, focused actions, and overlays. Use spacing
and horizontal rules for timelines, search rows, artifacts, histories, and
account lists. Keep the current restrained radius. Avoid large shadows except
for overlays that need separation.

## Cross-page state matrix

| Page             | Loading                 | Empty                                | Limited or degraded                               | Signed out                         | Signed in                                    | Live change                           |
| ---------------- | ----------------------- | ------------------------------------ | ------------------------------------------------- | ---------------------------------- | -------------------------------------------- | ------------------------------------- |
| Home             | Immediate route spinner | Recent outcomes, Explore, Coverage   | Conditional source warning                        | One stored area or skip            | Compact multi-area summary                   | Simple Update available row           |
| Explore          | Immediate route spinner | Clear filters or search another area | Result-level evidence state                       | Full access                        | Full access                                  | Refresh row, no automatic reorder     |
| Issue            | Immediate route spinner | Route not found recovery             | Omit unsupported sections and date accepted facts | Full reading, Ask, email follow    | Managed follow                               | Inline update line and What changed   |
| Decision         | Immediate route spinner | Search records recovery              | Current limited version and dated history         | Full reading                       | Full reading                                 | History updates in place              |
| Meeting          | Immediate route spinner | Coverage body recovery               | Missing artifacts with expected state             | Full reading and Ask               | Full reading and Ask                         | Artifact and decision update in place |
| Ask              | Immediate route spinner | Question composer and examples       | Not-found answer                                  | 24-hour local thread               | Same answer access without requiring account | New evidence applies to later answer  |
| Following        | Immediate route spinner | Browse current issues                | Follow-level coverage warning                     | Google or email verification entry | Managed list and preferences                 | Rows update without jumping           |
| Coverage         | Immediate route spinner | Defined launch coverage explanation  | Degraded body keeps dated records                 | Full access                        | Full access and body follow                  | Row updates in place                  |
| Coverage request | Immediate route spinner | Form                                 | Provider failure preserves request                | No account required                | Account remains optional                     | Not applicable                        |
| How it works     | Immediate route spinner | Not applicable                       | Current method language                           | Full access                        | Full access                                  | Not applicable                        |
| Email management | Immediate route spinner | Expired-link verification            | Delivery failure with recovery                    | Secure scoped access               | Secure scoped access                         | Preference result inline              |

## Global state rules

### Empty states

Use plain explanations and one useful next action. Do not use decorative empty
state illustrations.

- No current issues shows recent outcomes and Explore.
- No personalized matches offers interest changes and major decisions.
- No search results offers filter reset or another supported area.
- No follows links to current issues.

### Partial failures

Fail the smallest useful section. Keep unaffected sections available. Use a
full-page error only when the route cannot load its primary object.

Provider failures remain isolated. A chat outage does not block reading. An
AgentMail outage does not block Google follows. A Google outage keeps email-only
following. A source retrieval problem keeps dated accepted evidence visible.

### Offline

If the connection drops after a page loads, keep the last loaded published
information and show `You are offline. Showing the information already loaded.`
Disable network actions. Do not promise a cold offline start without proof.

### Authentication expiry

Keep public content and local area selection. Account-only pages ask for sign-in
and preserve the attempted action for return.

### Focus and announcements

After a new route loads, focus the page heading unless navigation restores a
previous scroll position. Closing a sheet, panel, filter, or dialog returns focus
to its opener. A failed form focuses its first invalid field only after submit.

Announce completed meaningful changes politely. Examples include a loaded answer,
verified follow, or issue update. Do not announce every loading stage or Convex
query event. Never move focus because live data changed.

### Dates and freshness

Use absolute dates as the source of truth. Relative time may appear secondarily
but never alone. Use local readable times and machine-readable timestamps. Name
a different timezone when it matters.

### Private-state language

Explain privacy at the point of action:

- `No street address needed`
- `Available on this device for 24 hours`
- `This creates an alert subscription, not an account`
- `Sent privately`
- `Only you can manage these settings`

Do not add a cookie banner while analytics remain aggregate and avoid
nonessential cross-site tracking.

## Real and design-only content

Use the real development evidence as the main stress test. Issue
`n57071y9n25rrs09yaanb1hz918dd1fs` links two Lafayette decision records about
surplus 2016 Crew Cab pickup donations. Its accepted version has a long title,
a decided state, no next action, no meeting time, one accepted public-assets
factor, two atomic records, agenda-to-minutes history, exact excerpts, and an
earlier withheld version.

That record must prove long-title wrapping, sparse fields, a short timeline,
accepted evidence, a limited-to-full decision history, and a decided outcome.

Create typed design fixtures for:

- an upcoming issue with a sourced deadline;
- a postponed issue;
- a limited source-only issue;
- degraded coverage;
- an uncertain relationship;
- an empty local feed;
- a meeting before minutes are due;
- a missing overdue artifact;
- a supported chat answer;
- an honest not-found answer;
- Google and email follow success and failure;
- an immediate alert and weekly roundup;
- a duplicate coverage request;
- offline and provider failures.

Keep fixtures outside production data and public copy.

## Design-agent slices

Each slice begins by reading this entire file and the required product sources.
The agent must inspect the latest approved component registry before changing a
shared pattern. Every slice returns the exact artifacts listed below.

### Design slice 1: Foundation and complete low-fidelity system

Status: deployed through PR #14 as `6e46fd7` on August 30, 2026.

#### Objective

Map every route, page hierarchy, state, and connected flow before high-fidelity
work begins. Prove that the complete application fits one responsive shell.

#### Prerequisites

- All source documents listed under Purpose
- Current landing page at `/`
- Real development issue and decision evidence

#### Work

- Draw the complete sitemap and route relationships.
- Produce 375-pixel low-fidelity frames for every page in the Sitemap section.
- Produce 1440-pixel frames for Home, Explore, Issue, Ask, Following, and Coverage.
- Place every final active control, including integration-backed controls.
- Define the master grid, reading widths, header, bottom navigation, route
  loading region, sheets, dialogs, and evidence panel.
- Map the ten connected prototype flows listed under Final prototype.
- Create the first shared component registry.

#### Required states

- first and return Home;
- signed-out and signed-in shell;
- issue full, limited, and degraded;
- Ask empty and active;
- follow choice and email verification;
- Coverage supported and validating;
- route loading and not found.

#### Deliverables

- Full low-fidelity page set
- Route and overlay map
- Component registry version 1
- Flow map
- List of conflicts or missing data contracts

#### Acceptance

- No page or primary flow is missing.
- Mobile hierarchy works without desktop assumptions.
- No later API requires moving a primary section.
- Fixture scenarios remain traceable in code and tests without page-top labels.
  They render only in development builds through an explicit fixture URL.
- The owner approves the whole low-fidelity system before Slice 2.

### Design slice 2: Application shell and discovery

Status: deployed through PR #24 as `4e2ac67` and refined through PR #25 as
`b22e321` on August 30, 2026.

#### Objective

Finish the responsive shell, hero transition, Home, Explore, issue
cards, result rows, filters, and feed update behavior.

#### Prerequisites

- Approved Design slice 1
- Current hero and Louisiana relief
- Shared vocabulary and responsive system in this file

#### Work

- Preserve the current hero character while adding area selection.
- Design first-visit and returning Home.
- Design standard, limited, and delayed issue cards.
- Design the issue-led Home and compact decision-record rows.
- Design Explore before search, during search, mixed results, filters, and URL
  restoration.
- Design desktop header, mobile header, and four-item bottom navigation.
- Design the immediate stable route spinner and inline action spinner.
- Design the simple Update available row.

#### Required states

- no area, one local area, and several signed-in areas;
- no current issues;
- no published issue timelines;
- no search results;
- limited and delayed cards;
- loading, offline, and section failure;
- copied link inline success.

#### Deliverables

- High-fidelity Home and Explore frames
- Responsive shell specification
- Issue-card and result-row component set
- Filter and rail interaction specification
- Implementation-ready spacing, type, and state annotations

#### Acceptance

- The area control appears before the mobile relief consumes the viewport.
- A returning resident reaches local content without the full hero.
- Cards survive the real long issue title.
- Rails expose the next item without trapping vertical scroll.
- Realtime content never jumps before the resident accepts the refresh.
- Route and action spinners never change layout.

### Design slice 3: Issues and evidence

Implementation checkpoint: deployed through PR #27 as `3a59e45`. The
implementation and fixture boundary are recorded in
[`resident-interface-slice-3.md`](./resident-interface-slice-3.md).

#### Objective

Finish the main issue page, decision record, meeting, evidence gutter, citation
viewer, timeline, and update history from real evidence.

#### Prerequisites

- Approved slices 1 and 2
- Real development issue, decision versions, citations, and changes
- Source and publication contracts

#### Work

- Design full, limited, degraded, historical, and succeeded-by-newer issue pages.
- Design mobile and desktop evidence-gutter behavior.
- Design short and long excerpts, page references, OCR warnings, and original
  document links.
- Design the atomic decision definition list and update history.
- Design the meeting artifact list, substantive items, routine records, and
  missing-source states.
- Design Government update, More information posted, and Public Parish
  correction entries.
- Specify focus, Back behavior, citation URL state, and live update handling.

#### Required states

- real decided issue with no next action;
- fixture with future action and deadline;
- limited issue;
- source delayed;
- uncertain relationship;
- historical issue with continuation link;
- decision with less information in its latest source;
- meeting before and after expected minutes.

#### Deliverables

- High-fidelity Issue, Decision, Meeting, and citation frames
- Evidence gutter and viewer component specification
- Timeline and history component set
- Source-problem entry point placement
- Accessibility interaction notes

#### Acceptance

- Every material claim has a nearby Source control.
- The main issue answer appears before process detail.
- A 320-pixel issue page keeps title, state, Source controls, and actions intact.
- The exact government title remains available without dominating the page.
- Limited evidence removes unsupported sections rather than filling them.
- The live update is obvious enough to demonstrate and quiet enough to read.

### Design slice 4: Ask Public Parish

Implementation checkpoint: implemented in PR #28, green on its checks, not
merged and not deployed. The implementation, the fixture boundary, and the
three additions to the adapter contract are recorded in
[`resident-interface-slice-4.md`](./resident-interface-slice-4.md).

#### Objective

Finish corpus-wide, issue-scoped, and meeting-scoped Ask behavior with validated
answers, citations, expiry, and abuse states.

#### Prerequisites

- Approved evidence viewer from Slice 3
- Chat scope, privacy, and not-found contracts
- Shared spinner and application shell

#### Work

- Design the empty Ask page and scoped entry from Issue and Meeting.
- Design mobile keyboard-open behavior and fixed composer placement.
- Design a two-question thread with a supported answer.
- Design the complete-answer loading state without word streaming.
- Design answer Source controls and Sources used disclosure.
- Design supported suggested questions as full-width actions.
- Design not found, expired, cooldown, CAPTCHA, provider failure, and retry.
- Design recent same-device conversation access within 24 hours.

#### Deliverables

- High-fidelity Ask frames for every scope
- Composer, message, answer, and suggestion components
- Mobile keyboard and bottom-navigation behavior
- Conversation state diagram
- Screen-reader announcement notes

#### Acceptance

- Ask never requests sign-in before a question.
- Scope is visible and cannot change silently.
- No claim appears before citation validation completes.
- Not found reads as an honest answer, not a system crash.
- Expired private content is not shown.
- Citation inspection returns to the correct answer position.

### Design slice 5: Following, accounts, and notifications

#### Objective

Finish Follow, Google return, email-only verification, Following, saved areas and
topics, notification preferences, email management, and alert layouts.

#### Prerequisites

- Approved shell, issue cards, and issue page
- Follow ownership and AgentMail product contracts
- Google account and email-only distinction

#### Work

- Design equal Google and email-only follow paths.
- Design frequency selection before verification.
- Design email entry, code, retry, expiry, success, and failure.
- Design Google return to the original target.
- Design Follow, Verification needed, Following, Muted, and Unavailable.
- Design Following, Areas and topics, and Notifications views.
- Design secure email-only management, mute, unfollow, Undo, and Unfollow all.
- Design immediate email, weekly roundup, and grounded reply examples.
- Design coverage degradation beside a followed target.

#### Deliverables

- High-fidelity follow and account flows
- Following and preference page set
- Email-management page
- Immediate alert and weekly roundup layouts
- Ownership and privacy annotations

#### Acceptance

- Email-only never looks like a lesser or hidden option.
- Verification does not imply account creation.
- Google returns to and completes the original action.
- A resident can tell which target, frequency, and destination they manage.
- Unfollow one and Unfollow all cannot be confused.
- Empty roundups do not have a designed filler state because they are not sent.

### Design slice 6: Coverage, method, and source reporting

#### Objective

Finish Coverage, area selection states, coverage request, How Public Parish
works, and private source reporting.

#### Prerequisites

- Approved shell and area selector
- Launch body and coverage-gate contracts
- Coverage request and private report rules

#### Work

- Design grouped region and government-body coverage rows.
- Design Supported, Degraded, Validating sources, Paused, and Not supported.
- Design source kinds, last check, next expected artifact, and public incident.
- Design the supported and unavailable rows in area selection.
- Design request submission, optional notification verification, duplicate
  request, rate limit, and provider failure.
- Design the resident-readable and technical sections of How it works.
- Design the private report form and factual confirmation.

#### Deliverables

- High-fidelity Coverage and Request coverage pages
- Area-selector coverage variants
- How it works page
- Source-problem form flow
- Coverage-state component set

#### Acceptance

- No validating body appears supported.
- No public compiler progress or request popularity appears.
- A degraded row explains freshness without erasing dated records.
- A coverage request does not promise work or trigger visible compilation.
- Private reporting does not resemble a public corrections forum.

### Design slice 7: Cross-app states, accessibility, and responsive QA

#### Objective

Apply the shared state system to every page, test all target widths, and remove
local component variants or accessibility failures.

#### Prerequisites

- Approved high-fidelity slices 2 through 6
- Complete component registry
- Cross-page state matrix

#### Work

- Render every page's required loading, empty, limited, failure, signed-out,
  signed-in, offline, and live states.
- Verify immediate route spinners through redirect chains.
- Verify action-spinner width and label stability.
- Verify inline success and remove avoidable toasts.
- Test 320, 375, 414, 768, 1280, and 1440 layouts.
- Audit keyboard order, focus return, heading structure, labels, contrast, target
  size, reduced motion, and live announcements.
- Audit long titles, long excerpts, record identifiers, dates, amounts, and
  translated lifecycle states.
- Consolidate every component variant into the registry.

#### Deliverables

- Completed state matrix with frame links
- Responsive QA evidence
- Accessibility checklist and corrections
- Final component registry
- Remaining defect list with owners

#### Acceptance

- No route or action spinner jitters or shifts.
- No 320-pixel frame clips text or a primary action.
- Keyboard-only users can complete citation, filter, Ask, and Follow flows.
- Sheets and panels return focus correctly.
- Reduced motion preserves every state.
- No provider failure blocks unrelated reading.
- No unresolved defect can change page structure.

### Design slice 8: Final connected prototype and implementation handoff

Implementation checkpoint: deployed through PR #43 as `85d6947`. The connected
resident journeys and implementation handoff are recorded in
`docs/resident-interface-slice-8.md`. The typed route contract is in
`src/features/resident-handoff/contracts.ts`.

#### Objective

Connect the approved pages into the complete resident journey and package the
design for frontend and API integration without reopening layout.

#### Prerequisites

- Approved slices 1 through 7
- Final component registry
- All defects that affect structure resolved

#### Work

- Connect the ten required prototype flows.
- Verify navigation, Back behavior, preserved scope, overlays, and return state.
- Record every fixture-backed interaction and its future API owner in code and
  tests, not in a resident-facing banner. Production ignores fixture parameters.
- Map every page to a typed data contract and integration readiness gate.
- Record every route, component, icon, token, content fixture, and responsive
  frame needed for implementation.
- Run one final anti-template and content-truth critique.

#### Deliverables

- Connected mobile-first prototype
- Desktop proof for primary flows
- Complete implementation handoff
- Fixture-to-API map
- Approved design-state record

#### Acceptance

- Every primary flow completes in the prototype.
- Every sitemap destination has an approved frame and state contract.
- All pages use one vocabulary and component system.
- The evidence gutter remains the only prominent signature interaction.
- Fixture behavior is identifiable and cannot be mistaken for production proof.
- No open question can materially change a route, page hierarchy, or shared
  interaction.

## Final prototype

The connected prototype must prove:

1. First visit, choose area, open a major issue, inspect a Source.
2. Explore, filter, open a decision record, return to its issue.
3. Open an issue, ask two questions, inspect an answer Source.
4. Follow an issue with Google.
5. Follow an issue with email-only verification.
6. Receive an update, open the changed issue, inspect What changed.
7. Inspect degraded coverage and request another area.
8. Report a source problem privately.
9. Return with a stored area and use the compact Home page.
10. Complete citation, filter, and follow flows with a keyboard.

## Frontend build sequence

The frontend build may proceed while backend work continues. Build against typed
page contracts, not direct table shapes.

1. Implement the shell, tokens, routing, immediate stable spinner, responsive
   structure, and local fixture boundary.
2. Implement Home, Explore, shared cards, filters, and inline feedback.
3. Implement Issue, Decision, Meeting, evidence gutter, citation viewer,
   timelines, and update history.
4. Implement Ask pages, thread behavior, answer layouts, and error states against
   a typed chat adapter.
5. Implement Follow, account, email verification, Following, preferences, and
   notification layouts against typed ownership and delivery adapters.
6. Implement Coverage, requests, How it works, and private reporting against
   typed coverage and message adapters.
7. Run the complete state, responsive, accessibility, and fixture audit.
8. Connect APIs and remove each fixture adapter only after its integration gate
   passes.

Keep route files thin. Put route-level data requirements in `.data.ts` modules.
Presentational components consume public resident projections and never read raw
pipeline, review, user, or email records.

## API integration sequence

After the Slice 5 public evidence and realtime gates pass, implement the
remaining adapters through the PR-sized packets in
[`post-slice-5-pr-plan.md`](./post-slice-5-pr-plan.md). Those packets must replace
fixtures without reopening the approved page hierarchy or interaction design.

| Integration       | Frontend contract                                      | Gate before production claim                                                                  |
| ----------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Public evidence   | Home, Explore, Issue, Decision, Meeting, Source viewer | Public projection exposes only accepted evidence, direct routes refresh, one real issue loads |
| Realtime          | Feed refresh row and issue update line                 | Published change updates an open page without refresh and screen-reader announcement works    |
| Ask               | Scoped conversation and validated answers              | Anonymous two-turn thread, source validation, not-found, expiry, and abuse limits pass        |
| Google auth       | Saved interests and managed follows                    | Auth v2 Google flow returns to the original target and ownership checks pass                  |
| Email-only follow | Verification and scoped management                     | Code expiry, attempts, single use, secure management, and unsubscribe pass                    |
| AgentMail alerts  | Immediate, roundup, reply, and private report          | Send, retry dedupe, reply grounding, empty-roundup suppression, and private intake pass       |
| Coverage          | Body states and area availability                      | Public statuses derive from the coverage gate and no request starts compiler work             |
| Coverage request  | Demand and optional notice                             | Dedupe, rate limit, separate email verification, and neutral confirmation pass                |
| Share HTML        | Issue Share action                                     | Metadata uses the published issue projection and destination works on the production host     |

## Verification gates

### Founder iPhone Safari review after each deployed design slice

After a design-slice pull request merges and the exact production workflow and
independent smoke pass, the founder tests that slice on an actual iPhone in
Safari. This review is required before the next slice changes the same shared
pattern. It adds touch and viewport evidence. It does not replace automated
accessibility, keyboard, or production checks.

Use the canonical production origin first, then repeat the slice's direct route
on the public `convex.site` origin. Record the pull request, merge commit, iPhone
model, iOS version, tested URL, and whether Safari used its top or bottom tab
layout.

For every deployed slice:

1. Open a new Private Browsing tab and load the direct route without visiting
   Home first. This is the signed-out check.
2. Test portrait with Safari controls expanded, scroll until they collapse,
   then return to the top.
3. Rotate to landscape and back. Confirm that no control, title, or sheet action
   enters a sensor, corner, browser-control, or Home-indicator area.
4. Use one thumb to reach primary actions. Confirm that the mobile top bar
   scrolls away, the bottom navigation stays usable, and content is not trapped
   between app chrome and Safari chrome.
5. Switch among all available top-level destinations. Confirm active state,
   scroll restoration, direct Back behavior, and active-tab scroll to top.
6. Exercise the slice's available sheets through their written openers. Test the
   grabber, medium and full heights, long content, Close, backdrop, and downward
   dismissal. Confirm the opener remains in the same place afterward.
7. Swipe each available horizontal rail, then begin a vertical page scroll on a
   card. Confirm proximity snapping without a trapped gesture.
8. Open every available text field. Confirm the focused control remains visible,
   the bottom navigation hides when required, fixed actions stay above the
   keyboard, and closing the keyboard restores the viewport.
9. Repeat the primary flow at 125 percent Safari page zoom and with Reduce
   Motion enabled.
10. Test Share through the system sheet when the slice includes it, then test
    Copy link.

Save a short screen recording for motion, sheet, keyboard, or scroll defects.
Record each defect with route, action, expected result, actual result, and
orientation. Do not describe an inert fixture control as a working production
feature.

### Design approval

- every sitemap destination has an approved page and state contract;
- every primary flow works at 375 pixels;
- 320-pixel layouts keep text and actions intact;
- the initial mobile chrome stays within the 8-rem budget before safe areas;
- desktop expands the mobile hierarchy without becoming a dashboard;
- every material claim can reach its exact Source;
- the spinner stays fixed through redirects and action loading;
- signed-out use remains complete;
- components use one vocabulary and visual system;
- no unresolved question can change page structure.

### Frontend approval

- typed fixture adapters are isolated and identifiable;
- fixture data never enters production civic records;
- direct route refresh works for every public route;
- keyboard, focus, reduced-motion, and screen-reader behavior match this plan;
- no avoidable toast, nested interactive card, or page-level spinner remains;
- top-level destinations preserve route and scroll state;
- loading, empty, limited, error, offline, and live states render from the same
  component contracts as real data.

### Production approval

- no fixture-backed success path is visible as a working public action;
- every enabled integration passes its API gate;
- one real issue and its citations load from accepted public projections;
- a published change updates the open issue without refresh;
- official document links work from the deployed host;
- signed-out mobile use completes the available resident loop;
- the founder's real-iPhone Safari review passes for every enabled design slice;
- production promotion follows the repository's explicit merge approval and
  independent smoke-test rules.

## Stop rules

- If a design slice needs a new route or changes the main page order, stop and
  update the master low-fidelity system before continuing.
- If a fixture cannot map to a typed public projection, fix the contract instead
  of coupling the UI to raw Convex tables.
- If a control cannot perform its stated result in production, do not simulate
  success publicly.
- If the evidence gutter becomes decoration or hides the claim, simplify it.
- If a page needs a second navigation system, revise the global shell instead.
- If a 320-pixel layout requires hiding a material fact, revise the composition.
- If real residents do not understand Issue, Decision record, Source, or Why
  this may matter, fix the language before adding more content.
- If a later integration requires moving major page sections, return to the
  approved plan and resolve the contract mismatch before wiring it.
