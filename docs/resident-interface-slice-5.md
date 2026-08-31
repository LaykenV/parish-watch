# Resident interface Slice 5 handoff

Status: implemented for review; automated validation belongs to pull-request CI

Date: August 31, 2026

## Decision

Design Slice 5 finishes the resident interface for following an issue and
managing saved targets. It replaces the Following, Areas and topics,
Notifications, and secure email-management blueprints with their final page
hierarchy. It also connects the existing issue-page and issue-card Follow
positions to the shared flow.

This is still an interface slice. Convex Auth and AgentMail are not connected.
Production creates no follow, account, verification challenge, email, or saved
preference. Routes without an explicit development fixture show the finished
unavailable state.

## Design direction

The subject is a resident trying to keep one local-government decision from
quietly changing after they close the page. The interface has one job: make it
obvious what they follow, how often Public Parish will write, and where the
message will go.

The visual signature is a delivery receipt. Target, cadence, and destination
stay together before verification and after confirmation. A civic alert is an
owned instruction, not a vague account preference. The receipt makes that
ownership readable without adding a dashboard full of cards.

The page uses the shipped paper, ink, civic blue, evidence green, warning amber,
Inter, and Geist Mono tokens. Lists use rules and spacing. Cards remain limited
to entry choices, email examples, and overlays. No new color or type token was
added.

## Routes and states

- `/following` covers signed out, active, empty, muted, and degraded lists.
- `/following/areas-and-topics` covers saved areas, optional topics, and a
  coverage-request exit.
- `/following/notifications` covers the default cadence, inline save feedback,
  immediate-alert anatomy, and the weekly roundup order.
- `/email/manage/$token` covers one valid email-only subscription, delivery
  failure, expired-link recovery, mute, and one-target unfollow.
- Issue pages and promoted issue cards open the shared Follow drawer or desktop
  dialog.

Desktop uses compact tabs. Mobile uses one native view selector above the page
content. The account control still opens Following. Reading, search, and Ask do
not require an account.

## Follow flow

The resident chooses Immediate material updates, Weekly roundup, or Both before
choosing identity. Immediate material updates remain the default.

Continue with Google and Use email only have equal width and weight. Google
returns to the original target and confirms the saved follow. Email-only stays
inside one sheet through email entry, six-digit verification, expiry, retry,
and confirmation. Its copy says that the result is an alert subscription, not
an account.

The fixture flow has explicit failure recovery. A Google failure keeps the
cadence and offers Google retry or email-only. An expired email code creates no
follow and offers a new code or another email. The confirmed state repeats the
target, cadence, and destination before returning to the issue.

`Follow`, `Verification needed`, `Following`, `Muted`, and `Unavailable` are
written states. The interface does not show `Following` before confirmation.

## Following and preferences

The Following list shows target kind, status, title, place or body, latest
material change, next date, cadence, destination, and coverage health. Filters
cover issues, topics, bodies, and places. Sorting stays latest-change-first.

Manage edits one target. Mute preserves the follow and stops delivery. Unfollow
removes one target and exposes inline Undo. Unfollow all lives in a separate
section, names the number of affected targets, and requires confirmation. Its
wording cannot be confused with one-target removal.

Areas and topics keeps saved preferences separate from temporary Explore
filters. It does not request an address. Unsupported places continue to the
neutral coverage-request route instead of appearing saved.

## Notifications and email ownership

The immediate email example orders information by resident use: what changed,
the current state or next date, then official sources. Its footer keeps Open in
Public Parish, Reply with a question, and Manage delivery visible.

The weekly example groups a place before an issue and says that no changes
means no email. There is no filler roundup state.

The secure email route displays one subscription only. It cannot reveal a list
of other subscriptions or imply an authenticated session. Delivery failure
stays beside that subscription. Expired links can request another short-lived
code without creating an account.

## Fixture boundary

`src/features/following/fixtures.ts` holds the only followed targets, saved
areas, topics, and email subscription used for QA. Route loaders check
`import.meta.env.DEV` and an explicit `?fixture=` value before dynamically
importing that module. Production returns no fixture ownership data.

Following scenarios are `signed-out`, `active`, `empty`, and `degraded`. Email
management scenarios are `valid`, `expired`, and `delivery-failure`. The Google
provider failure and email code expiry remain written controls inside the
development follow flow.

## Accessibility and responsive behavior

Every sheet has a written trigger, title, Close control, and focus return. A
keyboard-open sheet moves focus to Close. Closing returns to its opener. The
mobile bottom navigation hides while a sheet is open. Swiping remains optional.

Native radio, checkbox, select, email, and one-time-code controls retain visible
labels. Save, follow, mute, and removal results use polite live regions. Failure
copy names what did not happen and gives a next action.

Browser checks covered 320, 375, 390, 1280, and 1440 CSS pixels. Following,
preferences, notifications, the issue Follow flow, and email management had no
horizontal overflow. Mobile sheets stayed within the viewport and scrolled
their own body. Desktop rows kept the target, ledger, and Manage action aligned.

## Manual checks completed

- issue Follow through weekly cadence, email verification, and confirmation;
- Google return to the Following destination;
- signed-out, active, empty, muted, and degraded list states;
- one-target cadence change and mute;
- one-target unfollow with Undo;
- separate Unfollow all confirmation;
- saved-area add and one-area removal;
- saved-topic editing and inline save feedback;
- immediate email and weekly roundup layouts;
- valid, delivery-failed, and expired email-management states;
- production route without a fixture showing unavailable and no fixture email;
- keyboard focus entering the sheet and bottom-navigation suppression;
- mobile and desktop overflow measurements.

## Automated coverage added

The pull request adds contract and presentation tests for scenario validation,
production fixture isolation, the delivery receipt, equal Google and email-only
actions, written cadence controls, managed-row ownership fields, honest
production unavailability, one-subscription email management, and alert order.
Per repository policy, they were not run locally. GitHub Actions owns the test,
typecheck, build, prerender, and lint gate.

## Known limits

1. Google sign-in is a development interaction, not Convex Auth.
2. Email verification and delivery are development interactions, not AgentMail.
3. Changes on Following pages are in-memory fixture state and do not persist.
4. Coverage warnings are typed examples until the public coverage adapter is
   connected in Design Slice 6.
5. Email previews show structure with bracketed placeholders. They are not sent
   messages or production records.

## Integration gates

The Google adapter must prove return to the original target and centralized
ownership checks. The email adapter must prove code expiry, attempt limits,
single use, secure scoped management, and unsubscribe. AgentMail must prove
send, retry deduplication, reply grounding, and empty-roundup suppression.

Passing those gates replaces the adapters. It does not reopen the page
hierarchy, delivery receipt, or ownership language.
