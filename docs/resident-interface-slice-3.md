# Resident interface Slice 3

Status: implementation complete locally on `feat/resident-evidence-slice-3`;
not deployed

Date: August 30, 2026

## Decision

Slice 3 implements the issue, atomic decision, and meeting reading surfaces. It
also introduces the evidence gutter that connects a resident-facing claim to
the exact accepted source excerpt that supports it.

The visual subject is an annotated official record. Claims lead. A written
`Source` control sits beside each material claim and opens its citation. On a
phone the citation opens in the shared Coss drawer. Above 1,025 pixels it opens
in a 320-pixel rail beside the reading column. Closing either view returns
focus to the Source control that opened it.

## Routes

- `/issues/$issueSlug` shows the issue state, next date or outcome, evidence
  status, resident explanation, public actions, consequence factors, Ask
  handoff, decision timeline, changes, sources, and accepted version history.
- `/decisions/$recordKey` preserves the atomic government record, official
  title, body, record type, lifecycle, source-backed definition list, source
  history, and parent issue link.
- `/meetings/$meetingId` separates substantive issue cards and decision rows
  from routine records. Agenda, packet, minutes, and other artifact states stay
  explicit.
- `/ask` accepts an issue or meeting scope and optional question in the URL. The
  real source-grounded answer flow remains Design Slice 4 work.

## Evidence interaction

Every Source control has a 44-pixel target, an `aria-controls` relationship to
the viewer, and an expanded state. Mobile controls also expose that they open a
dialog. The selected citation id is stored in the `source` query parameter, so
Back and direct links preserve the citation state.

The viewer identifies the official document, locator, retrieval date, exact
excerpt, and original-document host. OCR or retrieval warnings remain attached
to the citation. The desktop panel receives focus when it opens. Both desktop
and mobile viewers return focus to the exact opening control when they close.
A direct citation URL falls back to the first matching Source control because
it has no opener.

## Publication states

- Full pages include only sections supported by accepted citations.
- Limited pages explain what the current source supports and omit unsupported
  consequence, deadline, or process sections.
- Delayed pages keep the last accepted facts and name the missing artifact.
- Historical pages preserve their accepted evidence and link to the newer
  issue that continues the timeline.
- Uncertain relationships remain labeled instead of being merged into the
  issue timeline.
- A development-only update scenario replaces the accepted version after four
  seconds and announces the change through a polite live region.

## Development fixtures

Typed fixtures cover full, limited, delayed, historical, uncertain, before
minutes, after minutes, and updated states. They require an explicit
`?fixture=preview` or `?fixture=update` parameter in a development build. The
parameter does not add a resident-facing banner. Links between fixture-backed
issues, decisions, and meetings preserve the parameter so the review path does
not fall into a production recovery state.

Production builds ignore both fixture values and show the route recovery page.
Development-only dynamic imports keep the evidence fixtures and fabricated
source excerpts out of the production JavaScript bundle. The fixtures do not
enter Convex, prerendered HTML, or public civic records. Real issue,
decision-detail, and meeting-detail queries remain integration work.

## Shared interface rules

Lifecycle states use the current compact status pill. Primary actions use the
black Coss button. Secondary actions use the shared outline or ghost treatment.
Source controls keep their evidence-specific treatment because they annotate a
claim rather than submit an action. The pages use the current resident shell,
one-color area treatment, Louisiana Coverage icon, and silent fixture boundary
from Slice 2.

## Verified states

The implementation tests issue, decision, meeting, citation, limited-data,
historical, and update behavior. Runtime checks cover the following paths:

- issue: scheduled, decided, limited, delayed, historical, and live update;
- decision: full, limited because the newest source supports less, and linked
  parent issue;
- meeting: before expected minutes, after minutes, and delayed artifacts;
- evidence: mobile drawer, desktop rail, direct citation URL, close, focus
  return, and original-document link;
- layout: 320, 390, and 1,440 CSS pixels without horizontal overflow.

The exact repository verification result belongs in the build log after the
final gate passes. This branch is not a production release.
