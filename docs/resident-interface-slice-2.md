# Resident interface Slice 2

Status: deployed through PR #24 as `4e2ac67`; owner device review is next

Date: August 30, 2026

## Decision

Slice 2 turns the low-fidelity shell into the high-fidelity application shell
and ships the three discovery surfaces: first-visit and returning Home, For
You, and Explore. It also introduces the typed fixture boundary that later
slices build on.

The marketing landing page is retired. Its hero character (kicker, tight
display headline, lede, Louisiana relief with launch pins) moves into the
first-visit resident Home, and the GitHub CTA is replaced by area selection,
and `Browse major decisions`.

Every record shown on these pages is a design fixture. The surplus pickup issue
mirrors the real development evidence for layout stress. Fixture scenarios are
reachable through a `?fixture=` URL parameter for deterministic QA. The query
parameter changes the scenario without adding a banner or resident-facing
label. No fixture is a production civic claim.

## Application shell

The shell (`ResidentShell`) is now the real navigation frame on `/`,
`/for-you`, and `/explore`. Blueprint routes keep it unchanged.

- Desktop header (sticky above `64.0625rem`): mark and live-text name linking
  Home on every route, For You, Explore, Ask, Coverage, the area control, and
  the account control. Height 4rem.
- Mobile top bar (scrolls away): compact mark and name, area control, account
  control. Height at most 3.5rem. Controls keep 44-pixel targets.
- Mobile bottom navigation (fixed): For You, Explore, Ask, Coverage. Height at
  most 4.25rem before safe-area padding.
- Combined initial chrome stays inside the 8-rem budget at 375 pixels.
- Tapping the active destination scrolls the current page to the top. Route
  and scroll state restore through the router's scroll restoration.
- The bottom navigation hides while the keyboard is open
  (`visualViewport` delta over 150px) and while any sheet or dialog is open.
- The area control is live: it opens the area selector and reflects the stored
  area (`Choose area` or the area name).
- A real offline notice renders under the header from `navigator.onLine`
  events: "You are offline. Showing the information already loaded."
- The route loading region is unchanged: fixed, top-center, stable through
  redirect chains.
- Blueprint pages keep the ruled-paper backdrop through a
  `.blueprint-backdrop` wrapper; discovery pages sit on clean paper.

## Design plan

### Subject

A Louisiana resident checking what their local government may change. The
interface is a civic utility with an editorial reading rhythm. The visual
voice for this slice is a record stamp: Geist Mono carries dates, evidence
status, `Checked` times, record identifiers, and match reasons, so every card
and row reads like an official filing, not a dashboard tile.

### Foundation

Unchanged from `design-system.html`: Paper `#FAFAF9`, Card `#FFFFFF`, Ink
`#171717`, River blue `#315BEA`, Evidence green `#10B981`, Warning amber
`#F59E0B`, Muted ink `#686864`. Inter for headings, body, and controls; Geist
Mono for the stamp line. One light theme.

### Signature

The evidence stamp line. Every issue card closes with a hairline-ruled mono
line: icon, evidence status, and `Checked {date}`. Limited and delayed issues
add a dated note. The lead card earns its size through scale and a darker ink
border, not color blocks. The returning-Home masthead (`Watching Lafayette
Parish`) is the second memorable element. Everything else stays quiet.

### Anti-template check

No stat tiles, no equal feature-card rows on Home, and no colored status blocks.
Color never carries a state alone. Lifecycle uses a text pill, evidence uses an
icon plus text, and lists are ruled rows rather than nested cards.

## Pages

### Home, first visit

Order: kicker, display headline, lede, `Choose a parish or city` field,
`Browse major decisions` skip link, short relief, Major local decisions (lead
plus rail), Happening soon (rail), Latest updates (list), conditional coverage
notice, voter strip. On mobile the area control sits before the relief so the
first useful control stays near the top.

The area field opens the selector. Selecting a supported area stores it on the
device and Home switches to the returning view, so the feed follows
immediately.

### Home, returning

Compact masthead: `Watching Lafayette Parish` (or `Watching N areas` with area
chips for the signed-in fixture) plus `Change area`. The feed follows with no
full hero. Sections filter to the watched area; the first visit shows launch
areas with place labels.

Sections:

- Major local decisions: one lead issue card, then a finite rail of standard
  rail cards. Empty area shows recent outcomes plus `Explore records`.
- Happening soon: rail of date-first meeting and vote cards with agenda
  availability.
- Latest updates: chronological list with mono date, update kind (Government
  update, More information posted, Public Parish correction, Outcome), linked
  issue title, and one sentence.
- Coverage warning renders only in the degraded fixture.
- Voter strip: next statewide election Nov 3, 2026, checked against the
  Secretary of State calendar on Aug 29, 2026; voter portal link; the
  non-endorsement line. Recheck the date at feature freeze.

### For You

One ranked feed. Each card carries a mono match reason line, for example
`In Lafayette Parish · Vote coming up Sep 15`. A bar holds the area chips,
`Change area`, and `Edit saved interests`. Signed out with no area, the page
stays and shows a compact setup block plus a three-card preview of major
decisions. Empty matches show the honest empty state with `Edit saved
interests` and `Browse major decisions`.

### Explore

Search field with debounced URL sync (`q`), Place, Topic, Date, and Sort
pills, and `More filters` with an active count. Before a query: Current issues
(card grid), Upcoming decisions, Recent outcomes, and Routine records as ruled
rows. With a query or active filters: one result sequence with mono type
labels where issues keep the rich card and the rest use compact rows. Sorting
is Newest first or Oldest first.

More filters (Body, Lifecycle, Record type, Source status) is a bottom sheet
on mobile with `Clear` and `Show results`, and a sticky collapsible column on
desktop from the same control. The mobile sheet uses the Base UI Drawer pattern
recommended by Coss UI, including downward swipe dismissal and an explicit
close control. Query, filters, sort, and scenario all restore from the URL on a
direct load. The route parser drops filter values that are not present in the
visible option lists.

No results offers `Clear filters` and `Change area`. During search the
keyboard-open state hides the bottom navigation.

## Repair verification

The August 30 review repair added focused tests for fixture scenario isolation,
direct URL validation, the forced no-results view, date sorting, topic and source
filter isolation, timezone-stable date-only records, independent More filters
groups, and conditional Sort visibility. The final verification result appears
below.

## Component specifications

Spacing uses the 4-pixel base. Cards use `--radius-lg` (0.625rem) and 1px
`--border`; no shadows except overlays.

| Element           | Type           | Key values                                                                                               |
| ----------------- | -------------- | -------------------------------------------------------------------------------------------------------- |
| Page container    | width          | `min(100% - 2rem, 74rem)`; 3rem gutters at 48rem                                                         |
| Hero headline     | Inter 650      | `clamp(2.9rem, 13vw, 4.1rem)`, mobile; `clamp(3.25rem, 6.2vw, 5.75rem)` desktop; -0.055em; line-height 1 |
| Watching masthead | Inter 650      | `clamp(1.9rem, 5.5vw, 2.75rem)`; -0.045em; one foreground ink color                                      |
| Page h1           | Inter 650      | `clamp(1.85rem, 5vw, 2.6rem)`; -0.04em                                                                   |
| Section h2        | Inter 700      | `--pp-text-subhead` (1.125rem); -0.015em                                                                 |
| Card title        | Inter 600      | `--pp-text-subhead`, 3-line clamp; lead `clamp(1.45rem, 1.05rem + 2vw, 2.05rem)` 650                     |
| Date line         | Geist Mono 600 | `--pp-text-caption` (0.75rem) ink; `No next date posted` fallback                                        |
| Evidence stamp    | Geist Mono     | `--pp-text-caption` muted; ruled top border; icon tinted success or warning                              |
| Match reason      | Geist Mono 600 | `--pp-text-caption`, uppercase, river-blue text                                                          |
| Update kind       | Geist Mono 600 | `--pp-text-caption`, uppercase                                                                           |
| Body small        | Inter          | `--pp-text-small` (0.875rem) muted, line-height 1.55                                                     |
| Pills             | Inter 600      | `--pp-text-small`; 2.75rem height; selected = ink border and inset ring                                  |
| Card padding      | --             | 1.25rem; lead 1.5rem; rail 1.1rem                                                                        |
| Section rhythm    | --             | 1.5rem top padding after 1px rule; 2rem section gap                                                      |

### Issue card

Variants: `lead`, `standard`, `rail`, plus the For You reason line. Content
order: optional reason, place and body, lifecycle state (dot plus text:
river-blue active, ink settled, muted unknown), title (link), date line
(`Final vote · Sep 15, 2026` or `Council approved · Apr 21, 2026` or `No next
date posted`), why-matter sentence, evidence stamp, optional dated note, and
an action row. The lead card uses a dark primary `View issue`; standard and rail
cards use the outlined treatment. `Follow` and `Share` stay quiet on lead and
standard cards; rail cards keep `View issue` only. The title and `View issue`
navigate; the rest of the card is not a link.
`Follow` is inert with a hidden note saying so; `Share` uses the system share
sheet and falls back to copy with an inline check icon and green ring for
about two seconds.

Evidence tones: `Evidence available` green check; `Limited information` and
`Source delayed` amber alert or clock, plus a note line.

### Upcoming card

Date block (mono `Sep 3` plus `5:00 PM CDT`), body, title link (two-line
clamp), and availability detail (`Agenda available`, `Agenda expected Sep 4`).

### Result row

Mono type label (Decision record, Meeting, Government body, Routine record),
title, meta line (place · body · date · state · identifier), chevron.
Government body rows show a colored coverage status and lead to Coverage.
Routine rows are muted. Rows stack in lists separated by hairlines; inside
the search sequence they become quiet bordered rows beside issue cards.

### Rails

Native overflow with `scroll-snap-type: x proximity`, full-bleed track,
scroll padding matching the page gutter, and about 85 percent card width on
mobile so the next card peeks. Desktop shows three cards and adds
previous/next arrows only when overflow exists. Vertical page scrolling is
never trapped. `prefers-reduced-motion` uses instant scrolling.

### Update available row

One quiet row between the masthead and the feed: mono `Update available` plus
`Refresh`. Content changes only after the resident accepts the refresh; the
row then disappears and the new entry appears at the top of Latest updates.
The same pattern covers For You and Explore.

### Area selector

One dialog that is a bottom sheet on mobile (grabber, explicit Close, safe
backdrop, focus return) and a centered dialog on desktop. Contents: search
field, supported rows (`Supported`, selected row reads `Watching` with an ink
border), validating rows disabled with a written status note, and
`Not seeing your area? Request coverage.` The shell control, the hero field,
and the For You setup block all open it.

### Notices and states

`Notice` (info or warning, left rule), `SectionFailure` (dashed amber, `Retry`
keeps other sections available), `UpdateRow`, and empty states with one useful
next action. Fixture URL scenarios do not add a page-top banner. Offline is a
real global bar. Route loading uses the existing fixed
region; action loading uses the Button loading slot with a stable label and
width.

## State and scenario map

Reachable states (beyond the stored-area behavior) via `?fixture=`:

| Page       | Scenarios                                                                     |
| ---------- | ----------------------------------------------------------------------------- |
| `/`        | `no-issues`, `degraded`, `signed-in`, `section-failure`, `update`             |
| `/for-you` | `no-area`, `no-matches`, `signed-in`, `degraded`, `section-failure`, `update` |
| `/explore` | `no-results`, `section-failure`, `update`                                     |

Real behaviors, not fixtures: stored area (first visit vs returning), offline
notice, copy-link inline success, keyboard-open hiding the bottom navigation,
overlay-open hiding the bottom navigation, active-destination scroll to top,
URL query/filter/sort restoration, route loading region.

## Fixture boundary

`src/features/discovery/fixtures.ts` holds the only fixture records and names
their QA-only boundary in source. The area store persists one signed-out area
under `public-parish.area.v1`. No fixture reaches Convex tables or production
data. `FIXTURE_TODAY` anchors relative date filters so fixture scenarios stay
stable. Resident pages do not show a fixture banner.

## URL contracts

- `/`: `fixture` (scenario whitelist).
- `/for-you`: `fixture`.
- `/explore`: `q`, `place`, `topic`, `date`, `body`, `lifecycle`, `type`,
  `source`, `sort`, `fixture`. All validated and whitelisted; unknown values
  drop. Updates use `replace` navigation so typing keeps history clean.

## Acceptance check

- The area control appears before the mobile relief consumes the viewport:
  pass (375px and 320px verified, no horizontal overflow at 320).
- A returning resident reaches local content without the full hero: pass
  (masthead plus feed verified).
- Cards survive the real long issue title: pass (surplus pickup title wraps
  and clamps to three lines on cards).
- Rails expose the next item without trapping vertical scroll: pass (peek
  verified at 375px; native scrolling with proximity snap).
- Realtime content never jumps before the resident accepts the refresh: pass
  (Update available row verified on Home).
- Route and action spinners never change layout: pass (fixed region; Button
  loading keeps label and width).
- Standalone discovery controls use one 44-pixel Button size: pass at 320,
  375, 390, 414, 768, and 1280 pixels. Search, filter pills, and nearby
  actions now share the same height and 14-pixel label size.
- Rail-card actions align: pass. All five desktop rail actions share one
  baseline, and the lead card uses a dark primary `View issue` action.
- Area setup has one trigger: pass. The area field opens the selector without
  a duplicate button below it on Home or For You.

## Known limits

1. `Follow` on cards is inert with a hidden prototype note; the follow flow
   is Slice 5.
2. Coverage warning copy is fixture-driven until Coverage projections exist
   (Slice 6 owns real states).
3. The signed-in scenarios demonstrate the state contract only; no auth is
   wired.
4. The voter strip date is hand-verified against the Secretary of State site
   on Aug 29, 2026 and needs a recheck at feature freeze.
5. The retired marketing page's `How it works` and trust copy now live in the
   How it works blueprint and the Home coverage lines; the Slice 6 method page
   will absorb them fully.

## Repair verification

`npm run verify` passes 160 tests across 19 files, typecheck, production client
and server builds, prerender, and lint. Discovery typography uses four shared
size tokens, control borders and shadows use semantic tokens, and the shared
responsive media hook no longer imports through the resident shell. Date-only
records keep their Chicago calendar day regardless of the visitor's timezone.
Each More filters group has its own `All` option, so residents can remove one
filter without clearing the query or unrelated filters. Sort appears only for
the flat result sequence, where it changes the displayed order; the grouped
browse catalog no longer shows an inert Sort control.

## Approval gate

PR #24 deployed as `4e2ac67`. Production workflow `33318753459` and the
independent production smoke passed. The remaining owner gate is the laptop and
real-iPhone Safari review of the shell, first-visit and returning Home, For You,
Explore, card and row families, area selector, and fixture scenarios before
Slice 3 changes shared patterns.
