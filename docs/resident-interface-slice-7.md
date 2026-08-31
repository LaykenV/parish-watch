# Resident interface Design Slice 7

Status: implemented for pull-request review on August 31, 2026

## What this slice closes

This slice treats the resident interface as one application. It keeps the
approved paper-and-ink hierarchy and corrects shared behavior that could drift
between routes.

- Route completion updates the document title and moves keyboard focus to the
  new page heading. The heading is read by the focus move, so the live region
  only speaks when a route has no heading to land on.
- Route and action loading states keep their written labels. Actions reserve a
  mirrored spinner slot on both sides of the label, so the control keeps a
  stable width and a centered label.
- Home, For You, and Explore announce accepted live refreshes without moving
  focus or reordering content.
- Every sheet moves focus to its written Close control after opening. Existing
  trigger ownership returns focus when the sheet closes, after an exit delay
  read from the `--dur-standard` motion token. The desktop dialog has no exit
  animation, so focus returns to its opener immediately.
- Explore's search input stretches to fill its search field, so the whole
  control height is a pointer target.
- Reduced-motion mode shortens resident transitions and both spinner types to
  one millisecond while preserving the state change.

No fixture became production data. Provider-backed actions keep the production
availability gates established by their owning slices.

## State matrix evidence

Each link selects an explicit development fixture used during the cross-page
review. The fixtures stay outside production builds.

| Route            | Reviewed state                   | Development frame                                                    |
| ---------------- | -------------------------------- | -------------------------------------------------------------------- |
| Home             | Accepted live update             | `/?fixture=update`                                                   |
| For You          | Degraded personalized feed       | `/for-you?fixture=degraded`                                          |
| Explore          | No matching results              | `/explore?fixture=no-results&q=unmatched`                            |
| Issue            | Full evidence and citation sheet | `/issues/surplus-pickup-donations?fixture=preview`                   |
| Decision         | Full evidence and citation sheet | `/decisions/CO-022-2026?fixture=preview`                             |
| Meeting          | Full evidence and citation sheet | `/meetings/lafayette-planning-commission-2026-09-03?fixture=preview` |
| Ask              | Cited active thread              | `/ask?fixture=thread`                                                |
| Following        | Degraded provider state          | `/following?fixture=degraded`                                        |
| Areas and topics | Active preferences               | `/following/areas-and-topics?fixture=active`                         |
| Notifications    | Active preferences               | `/following/notifications?fixture=active`                            |
| Coverage         | Degraded source health           | `/coverage?fixture=degraded`                                         |
| Coverage request | Rate limited submission          | `/coverage/request?fixture=rate-limited`                             |
| How it works     | Published method                 | `/how-it-works`                                                      |
| Email management | Delivery failure recovery        | `/email/manage/example?fixture=delivery-failure`                     |

The browser review covered all 14 routes at 320, 375, 414, 768, 1280, and
1440 CSS pixels. That is 84 route and width combinations. Each combination had
one main region, a visible level-one heading, no page-level horizontal overflow,
no unlabeled visible form field, and no undersized standalone written control.
Native radio and checkbox boxes were measured with their full written labels.

The loading-button interaction was measured before and during submission. It
kept a stable width, kept `Request coverage` visible, exposed `aria-busy`, and
added the spinner inside its reserved slot. A Home to For You keyboard
navigation moved focus to the For You heading without scrolling and set
`For You | Public Parish` as the title.

Review corrections applied after that sweep changed the measured button width,
so the earlier 168.90625-pixel figure no longer describes the shipped control.
The mirrored slot is what holds the width steady now.

The keyboard flow opened citation and filter sheets on their written Close
control and returned focus to the exact Source or More filters opener. Closed
sheets became inert while their exit motion finished. Ask accepted an Enter-key
submission, showed its checking state, and then rendered the fixture's cited
answer. The email-only Follow path reached verification and confirmed the
target, cadence, and destination before returning focus to Follow this issue.

## Accessibility checklist

- [x] One page heading and main region on every reviewed frame
- [x] Route completion focus and polite announcement
- [x] Written Close control receives initial sheet focus
- [x] Existing sheet trigger contract returns focus on close
- [x] Form controls have names and written targets meet 44 pixels
- [x] Action loading state keeps its label, width, and duplicate-submit guard
- [x] Live feed updates announce without moving focus
- [x] Reduced motion keeps every loading and completion state legible
- [x] Long fixture titles and excerpts wrap without page overflow
- [x] Provider failures leave unrelated reading available

## Final component registry

| Component                          | Final Slice 7 contract                                           | Owner                  |
| ---------------------------------- | ---------------------------------------------------------------- | ---------------------- |
| Application shell                  | Route title, heading focus, polite completion announcement       | Shared shell           |
| Route spinner                      | Router-driven fixed region with written status                   | Shared shell           |
| Action spinner                     | Reserved icon slot, stable label and width, duplicate prevention | Shared button          |
| Area selector                      | Supported, validating, unsupported, local and account areas      | Discovery and coverage |
| Issue card and result row          | Lead, standard, rail, matched, limited, delayed, following       | Discovery              |
| Filter control                     | Selected, disabled, removable, mobile sheet, desktop column      | Explore                |
| Source control and evidence viewer | Written trigger, mobile sheet, desktop rail, focus return        | Evidence               |
| Ask composer and answer            | Scoped, sending, cooldown, failure, cited result                 | Ask                    |
| Follow overlay and row             | Google, email, code, active, muted, degraded                     | Following              |
| Coverage row                       | Supported, degraded, validating, paused, unsupported             | Coverage               |
| Notice and inline result           | Offline, limited, delayed, live, expired, private, undo          | Owning feature         |
| Empty and error states             | Smallest useful recovery, no provider-wide page failure          | Owning feature         |

## Remaining defects and owners

No unresolved interface defect changes page structure.

- The founder still owns the real-iPhone Safari review. The six CSS widths do
  not prove browser chrome, safe-area, or physical keyboard behavior on that
  device. The corrected button width and search-input stretch were not
  re-measured in a browser after review.
- The shared sheet still layers Base UI `initialFocus`, `autoFocus`, and a
  manual frame-scheduled focus call on open, plus Base UI `finalFocus` and a
  manual timer on close. Each layer was added to fix a real browser defect and
  the suite has no DOM environment to prove which one is load-bearing.
  Collapsing them needs its own change with a browser to test in.
- Each feature owner still owns its production adapter and runtime gate. This
  slice does not connect resident detail, Ask, Auth, AgentMail, coverage request,
  or private report data.
- GitHub Actions owns automated typecheck, tests, build, prerender, and lint for
  this branch. They were not run locally under the repository validation rule.
