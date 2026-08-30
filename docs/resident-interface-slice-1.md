# Resident interface Slice 1

Status: deployed low-fidelity system; shell and discovery are superseded by Design Slice 2

Date: August 29, 2026

## Decision

Slice 1 is more than empty route files. It establishes the route graph, page
order, final control positions, responsive shell, overlay locations, shared
component vocabulary, and required states. It does not finish visual design or
connect an API.

The current marketing page remains at `/` inside the shared application shell.
Slice 2 owns its transition into the first-visit and returning resident Home.
This slice records both Home frames so that work cannot change the application
structure later.

Every routed screen in this slice is a labeled design fixture. Controls without
a real destination are intentionally inert. They cannot report a sent question,
follow, email, request, or source problem.

Internal navigation uses TanStack Router links, so route changes exercise the
fixed loading region instead of reloading the document. The four-item bottom
navigation remains available through tablet widths and moves into the desktop
header above 64 rem. The email management token route keeps only the Public
Parish Home link and its scoped content. It does not render the application nav.

## Release boundary

PR #14 deployed this slice as `6e46fd7`. It exposed only labeled prototype
routes and made no working resident-action claim. Design Slice 2 has since
replaced the Home, For You, and Explore blueprints with their high-fidelity
fixture-backed implementations. The remaining blueprint routes still label
unfinished behavior and keep inert controls from reporting success.

## Design plan

### Subject

A Louisiana resident is trying to understand one consequential local decision
from official records. The interface is a civic utility with an editorial
reading order. It is not a government portal or a generic dashboard.

### Foundation

| Role           | Value     | Slice 1 use                                     |
| -------------- | --------- | ----------------------------------------------- |
| Paper          | `#FAFAF9` | Page field                                      |
| Card           | `#FFFFFF` | Controls and state notes                        |
| Ink            | `#171717` | Identity, copy, primary actions                 |
| River blue     | `#315BEA` | Route blueprint marks and evidence relationship |
| Evidence green | `#10B981` | Reserved for confirmed evidence and success     |
| Warning amber  | `#F59E0B` | Reserved for limited and degraded states        |
| Muted ink      | `#686864` | Supporting copy                                 |

Inter carries navigation, headings, copy, and controls. Geist Mono carries
route parameters, fixture labels, dates, identifiers, and source metadata.

### Layout

The 375 pixel layout is one reading column with the final four-item bottom
navigation. The mark and product name in the top bar link to Home. State
contracts follow the page content in low fidelity. Above 48 rem, the state
contract moves to a narrow right rail. Above 64 rem, the mobile bottom
navigation becomes a desktop header.

The mobile and tablet top bar scrolls with the page. Only bottom navigation
stays fixed, so app chrome does not squeeze the reading window between two
pinned bars. The top bar is at most 3.5 rem and the bottom navigation is at most
4.25 rem before safe-area padding. Their controls keep 44-by-44-pixel targets.

The master widths are:

- shell: up to 80 rem;
- page heading and explanation: up to 48 rem;
- primary reading column: flexible, with a comfortable 55 to 72 character
  measure in later high-fidelity slices;
- state or evidence rail: 14 to 18 rem;
- mobile page gutter: 0.75 rem;
- tablet and desktop page gutter: 1.5 rem.

### Signature reservation

The evidence gutter is the only signature interaction. Slice 1 reserves a
river-blue evidence region beside Issue, Decision record, and Ask. On mobile,
the same Source action owns a bottom sheet. Slice 3 will design the excerpt,
connector rule, focus return, URL state, and official-document action.

Every mobile sheet opens from a written control. An open sheet has a grabber,
explicit Close control, safe backdrop dismissal, and downward drag dismissal.
Medium sheets may expand to full height. Closing returns to the exact opener.
The grabber never replaces Source, More filters, Follow, Choose area, or Report
a source problem.

### Anti-template review

The prototype avoids a hero and equal feature cards on application routes. It
does not use statistics, fake records, decorative pills, social signals,
government seals, campaign colors, or AI decoration. Dashed regions state
structure and fixture boundaries. They are not the final component treatment.

## Route and overlay map

```text
/
|-- /for-you
|-- /explore
|-- /ask
|-- /coverage
|   `-- /coverage/request
|-- /issues/:issueSlug
|-- /decisions/:recordKey
|-- /meetings/:meetingId
|-- /how-it-works
|-- /following
|   |-- /following/areas-and-topics
|   `-- /following/notifications
|-- /email/manage/:token
`-- route not found

Overlays and URL state
|-- area selector sheet or dialog
|-- mobile filter sheet
|-- desktop filter column
|-- evidence bottom sheet or desktop panel
|-- follow choice sheet or dialog
|   `-- email entry, code, and confirmation in one overlay
|-- private source-problem form
|-- confirmation for Unfollow all
`-- stable route-loading region owned above route content
```

`/share/issues/:slug` remains a Convex HTTP share page. It is not a resident SPA
screen. The private source-problem flow is an overlay, not a public discussion
route.

## Mobile interaction contract

- Preserve the nested route and scroll position for For You, Explore, Ask, and
  Coverage when switching destinations.
- Tapping the active destination scrolls its current page to the top.
- Let Safari own the screen-edge Back gesture. Do not swipe between top-level
  destinations.
- Use horizontal swipe only for finite issue rails. Keep part of the next card
  visible, use proximity snapping, and preserve vertical page scrolling.
- Do not add vertical page snapping or swipe-only management actions.
- Use the system share sheet when available and keep Copy link as the fallback.
- Apply safe-area insets to bottom navigation and sheet actions.
- Hide bottom navigation for the keyboard and full-height sheets.

The master plan defines starting sheet heights and the real-iPhone Safari
review that follows every deployed design slice.

## 375 pixel page frames

These frames establish reading order. Brackets mark controls. Braces mark
overlays or conditional regions.

### Home, first visit

```text
[top bar: Public Parish | area | account]
See how local government is changing.
[Choose a parish or city]
[Show local decisions]
[Browse major decisions]
[short Louisiana relief]
Major local decisions
  [lead issue] [next card visible]
Happening soon
Latest updates
{coverage warning}
{verified voter information strip}
[bottom navigation]
```

### Home, return visit

```text
[top bar]
Watching Lafayette Parish   [Change area]
Major local decisions
Happening soon
Latest updates
{coverage warning}
{verified voter information strip}
[bottom navigation]
```

### For You

```text
[top bar]
For You
[current area] [temporary filters]
{signed-out setup or Edit saved interests}
Why this appears
[issue card with View issue, Follow, Share]
[next issue]
{Update available  Refresh}
[bottom navigation]
```

### Explore

```text
[top bar]
Explore
[search field]
[Place] [Topic] [Date] [More filters]
{mobile filter sheet}
Current issues
[issue result]
Decision record
[compact result row]
Meeting
[compact result row]
{Update available  Refresh}
[bottom navigation]
```

### Issue

```text
[top bar]
[Back]
Place | body | state
Long plain-language title
Next date or latest outcome
Evidence status | last checked
[Follow] [Share]
What is happening       [Source]
{What the public can still do}
Why this may matter     [Source]
[Ask Public Parish]
Decision timeline
  [Source] [View decision]
What changed
Sources and update history
[Report a source problem]
{evidence bottom sheet}
[bottom navigation]
```

### Decision record

```text
[top bar]
[Related issue]
Plain-language title
Record identifier | body | type | state
Latest outcome or meeting date
Plain-language summary  [Source]
Accepted fields         [Source per value]
Official item title
Sources
Material update history
[Report a source problem]
[bottom navigation]
```

### Meeting

```text
[top bar]
Body | date | status | official location
[Agenda] [Packet] [Minutes] [Results] [Video]
Substantive issues and decisions
Routine records [collapsed count]
[Ask about this meeting]
Source availability and versions
[Report a source problem]
[bottom navigation]
```

### Ask

```text
[top bar]
Ask Public Parish
Evidence scope
{Back to issue or meeting}
[large question field]
[Send question]
[up to three example questions]
{recent same-device conversations}
{validated answer and Source controls}
{not-found answer and official next step}
[composer above bottom navigation]
[bottom navigation hidden with keyboard]
```

### Follow flow

```text
{Get updates about this issue}
[Immediate] [Weekly roundup] [Both]
[Continue with Google]
[Use email only]
  [email]
  [verification code]
  [confirm follow]
Inline confirmed or failed state
```

### Following

```text
[top bar]
Following
[view selector]
[Issues] [Topics] [Bodies] [Places]
Target
Latest change | next date | delivery | coverage
[Manage] [Mute] [Unfollow]
{inline Undo}
[bottom navigation]
```

### Areas and topics

```text
[top bar]
Areas and topics
[view selector]
Saved areas
[Change area] [Request coverage]
Saved topics
[Add topic]
[Save interests]
[bottom navigation]
```

### Notifications

```text
[top bar]
Notifications
[view selector]
[Immediate material updates]
[Weekly roundup]
[Both]
[Save notification settings]
{inline saved or delivery failure}
[bottom navigation]
```

### Coverage

```text
[top bar]
Coverage
[Request coverage] [How it works]
Lafayette Parish
  body | state
  sources | last check | next artifact
  limitation | [method] | [Follow body]
Rapides Parish
East Baton Rouge Parish
[bottom navigation]
```

### Request coverage

```text
[top bar]
Request coverage
[parish or municipality]
[optional official homepage]
[optional email for launch notice]
[Request coverage]
{neutral confirmation or provider failure}
[bottom navigation]
```

### How Public Parish works

```text
[top bar]
How Public Parish works
Official sources and Source controls
Checks and independent review
Limited information and update history
Neutrality and coverage standards
Privacy, open source, private reporting
{optional technical details}
[bottom navigation]
```

### Email-only management

```text
Public Parish
Manage this follow
Issue and verified destination
[Immediate] [Weekly roundup] [Both]
[Save delivery frequency]
[Mute] [Unfollow]
{expired link verification}
```

### Route not found

```text
[top bar]
This page does not exist.
[Return home] [Explore records]
[bottom navigation]
```

## 1440 pixel primary frames

### Home

```text
[brand links Home] For You Explore Ask Coverage    [area] [account]
----------------------------------------------------------------
hero or compact watching header
primary reading area                        optional status rail
major decisions in up to three columns
happening soon rail
latest updates list
coverage warning and voter strip
```

### Explore

```text
[desktop header]
Explore and search
[collapsible filters] | one mixed result sequence
                      | issue result
                      | decision row
                      | meeting row
```

### Issue

```text
[desktop header]
main explanation column      current issue rail     evidence panel
What is happening            state and date         exact excerpt
Why this may matter          evidence health        source metadata
Ask                          Follow and Share        official link
timeline and changes
```

### Ask

```text
[desktop header]
conversation and answers                     evidence panel
stable complete-answer loading region        exact cited excerpt
composer at the end of the reading column
```

### Following

```text
[desktop header]
Following | Areas and topics | Notifications
filters
plain management rows, not nested cards
```

### Coverage

```text
[desktop header]
Coverage                                      method and state key
region heading
stacked body rows with sources and freshness
```

Desktop expands the mobile reading order. It does not create a separate
dashboard hierarchy.

## Component registry version 1

| Component         | Slice 1 contract                                            | Detailed owner    |
| ----------------- | ----------------------------------------------------------- | ----------------- |
| Application shell | Router links, desktop header, mobile top bar, bottom nav    | Slice 2           |
| Area selector     | Supported, validating, unsupported, local and account areas | Slices 2 and 6    |
| Route spinner     | Router-driven fixed region, immediate and stable            | Slice 2           |
| Action spinner    | Fixed icon slot, unchanged label and width                  | Slice 2           |
| Issue card        | Lead, standard, rail, matched, limited, delayed, following  | Slice 2           |
| Result row        | Decision, meeting, government body, routine record          | Slice 2           |
| Filter control    | Selected, disabled, removable, mobile sheet, desktop column | Slice 2           |
| Status treatment  | Lifecycle, evidence, coverage, follow, artifact             | Slices 2, 3, 5, 6 |
| Source control    | Written label beside a material claim                       | Slice 3           |
| Evidence viewer   | Mobile sheet, desktop panel, warnings, original link        | Slice 3           |
| Timeline          | Decision state and uncertain relationship variants          | Slice 3           |
| Update entry      | Government update, more information, correction             | Slice 3           |
| Ask composer      | Empty, scoped, sending, cooldown, failed, keyboard open     | Slice 4           |
| Answer            | Supported, not found, citations, follow-up questions        | Slice 4           |
| Follow overlay    | Delivery choice, Google, email, code, result                | Slice 5           |
| Following row     | Active, muted, degraded, upcoming, changed                  | Slice 5           |
| Coverage row      | Supported, degraded, validating, paused, unsupported        | Slice 6           |
| Notice            | Offline, limited, delayed, live, expired, private           | Slice 7           |
| Inline result     | Copied, saved, followed, reported, undo                     | Slice 7           |
| Empty state       | Home, For You, Explore, Following, meeting artifacts        | Slice 7           |
| Error state       | Section, route, provider, form, management link             | Slice 7           |

## Connected flow map

1. `/` area selection to major issue to Source viewer.
2. `/explore` filters to `/decisions/:recordKey` to related `/issues/:issueSlug`.
3. Issue Ask action to `/ask?issue=:issueSlug`, two questions, then Source viewer.
4. Issue Follow to delivery choice to Google return to the original issue.
5. Issue Follow to email entry to code to confirmed email-only follow.
6. Alert link to changed issue to What changed to Source viewer.
7. `/coverage` degraded row to `/coverage/request` and neutral confirmation.
8. Issue, decision, or meeting to private source-problem overlay and private
   confirmation.
9. Returning `/` skips the full hero and opens with Watching area plus feeds.
10. Keyboard navigation completes Explore filters, Source viewer, and Follow,
    with focus returning to each opener.

## Required state map

- Home: first visit, return visit, loading, empty, degraded, signed out, signed
  in, live update.
- Issue: full, limited, degraded, historical, succeeded by newer, not found,
  live update.
- Ask: empty, active, scoped, supported, not found, cooldown, expired, provider
  failure.
- Follow: signed out, Google choice, email entry, code, success, failure.
- Coverage: supported, degraded, validating, paused, not supported.
- Global: fixed route loading, offline, authentication expiry, section failure,
  and route not found.

## Conflicts and missing data contracts

1. The resident issue projection and direct public query do not exist yet.
   Slice 3 interface work must not read the private issue ledger.
2. Public issue succession needs an explicit projection field for the newer
   timeline link before historical routes can show it.
3. Meeting, public coverage, source expectation, and coverage incident
   projections remain planned.
4. Ask, Google auth, follow ownership, email verification, AgentMail alerts,
   notification preferences, and coverage requests need typed adapters before
   any control can report success.
5. The private source-problem form needs its AgentMail endpoint and attached
   public record URL contract.
6. The real development issue has no public production counterpart. It may
   stress layout in development, but it cannot appear as a production claim.
7. The voter-information strip needs a fresh official election-date check. It
   stays a reserved Home region until that check happens.
8. Route search contracts for Explore filters, Ask scope, citation selection,
   and overlay return state still need typed schemas.

None of these gaps changes the page hierarchy. If later API work does, return to
this slice before wiring it.

## Approval gate

PR #14 passed the repository and responsive checks for this gate and deployed as
`6e46fd7`. The route graph remains the contract for later slices. The founder's
real-iPhone Safari review remains a device check for the current Slice 2 shell;
it does not turn fixture-backed actions into production features.
