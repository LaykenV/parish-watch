# Resident interface Slice 6 handoff

Status: deployed through PR #34 as `0aa7474`; follow-up focus and copy fixes
deployed through PR #42 as `eafab66`; live area availability connected through
PR #92 as `2fa1cff`

Date: August 31, 2026

## Decision

Design Slice 6 replaces the Coverage, Request coverage, and How Public Parish
works blueprints with their final resident hierarchy. It also finishes the
private source-problem form and clarifies the difference between accepted
decision records and complete government-body coverage in the area selector.

At this design checkpoint, production had no public coverage adapter,
coverage-request mutation, or private AgentMail delivery path. The private
AgentMail report path arrived in Slice 7D. Slice 8 connected the area selector
to live jurisdiction status. The full public coverage projection and coverage
request mutation remain Slice 9 work. The method page contains only
repository-backed product and architecture rules, so it remains readable
without a fixture.

## Design direction

The resident needs one answer before following a body: can Public Parish see
enough of its official record to notice a consequential decision?

The coverage page uses an index-first structure. Launch regions stay in a
stable left column on larger screens while a ruled source-health ledger moves
body by body on the right. Phone layouts preserve the same order in one reading
column. Source kinds, the last successful check, the next expected artifact,
and the current limitation carry the design. There is no decorative civic
imagery competing with that record.

The page uses the shipped paper, ink, civic blue, evidence green, warning amber,
Inter, and Geist Mono tokens. No color or type token was added. Color is never
the only status signal. Every state has an icon, written label, and definition.

## Coverage states

Coverage uses five public states:

- `Supported` means the body passed the common source and evidence checks.
- `Degraded` keeps dated accepted records visible while warning that current
  decisions may be missing.
- `Validating sources` means the body is still being checked against the same
  gate.
- `Paused` names a known source problem that stopped monitoring.
- `Not supported` means the body has not passed the gate.

There is no beta label. A single accepted document or published decision does
not make a place supported. The original fixture demonstrated record
availability separately from complete coverage. Production now reads the live
jurisdiction gate: Rapides and East Baton Rouge say `Records available`, while
Lafayette says `Validating sources` and cannot be selected.

Supported fixture bodies can open the shared Follow flow. Other states explain
the limit without showing an unavailable Follow control as if it could work.

## Request behavior

The request form records one parish or municipality, an optional official
homepage, and an optional launch-notice email. Its copy states that a request
does not start discovery, retrieval, compilation, or a launch clock.

The request is recorded before optional email verification. A failed notice
therefore keeps the request and removes only the notice destination. Duplicate
requests receive the same neutral confirmation and expose no count. Rate limits
keep every entered field visible for a later retry.

Development scenarios cover `new`, `duplicate`, `notice-failure`, and
`rate-limited`. Production cannot simulate any of them.

## Resident method

How Public Parish works starts with the resident evidence loop:

1. find an approved official record;
2. keep an immutable source version;
3. check each material fact and citation;
4. publish, limit, or withhold.

The page then explains the common coverage gate, neutral framing, private
resident data, and update history. Convex, Firecrawl, AI Gateway, Terra, and
Luna live in a closed technical disclosure after the resident explanation.

## Private source reports

Issue, meeting, and decision pages now use one private report sheet. It records
the problem type, a required description, an optional official URL, an optional
reply email, and the attached Public Parish record URL.

The form says that it creates no public thread and starts no automatic
reprocessing. Success says only that the report was sent privately. It does not
promise a correction. A provider failure keeps the resident's description in
place for retry. Production shows the reporting path as unavailable until
private delivery can prove receipt without exposing resident messages.

## Fixture boundary

`src/features/coverage/fixtures.ts` contains the only government-body coverage
rows used by this slice. The coverage loader checks `import.meta.env.DEV` and an
explicit `?fixture=` scenario before dynamically importing that module.
Production loads no fixture coverage claims.

The request route uses the same development guard. Its scenarios contain no
real requester data. Evidence pages expose the private-report interaction only
when an explicit evidence fixture is active in development.

## Accessibility and responsive behavior

Written status labels accompany every icon and color. Form fields keep visible
labels, 44-pixel controls, reserved helper space, immediate focus rings, and
error descriptions connected with `aria-describedby`. Invalid submissions
move focus to the exact field that needs attention.

Sheets retain written triggers, titles, Close controls, Escape behavior, and
focus return. The technical disclosure uses native `details` and `summary`.
Buttons and navigation labels remain on one line.

Browser checks covered 320, 375, 414, 768, 1024, 1280, and 1440 CSS pixels.
Coverage, request, method, area selector, Follow, and private-report states had
no application overflow. Tablet ledgers stay stacked until three factual
columns have enough room.

## Manual checks completed

- all five coverage states and the degraded-body override;
- production coverage and request routes with no fixture claims or forms;
- request validation and focus recovery;
- optional email verification with invalid and accepted codes;
- duplicate, rate-limited, and notice-delivery-failure requests;
- field preservation after retryable failures;
- Follow opening, Escape close, and focus return;
- area-selector record availability versus source validation;
- private report validation, attached record, success, and focus recovery;
- resident method order and technical disclosure;
- keyboard order from Skip to content through the primary actions;
- responsive overflow and ledger layout at seven viewport widths;
- computed text, button, badge, and form contrast.

## Automated coverage added

The pull request adds contract and presentation checks for development-only
fixture loading, the five written statuses, production claim isolation,
request-versus-compiler separation, resident-first method order, private report
copy, and area-selector wording. Per repository policy, they were not run
locally. GitHub Actions owns the test, typecheck, build, prerender, and lint
gate.

## Known limits

1. Coverage rows and health timestamps are typed development fixtures.
2. Coverage requests remain in-memory development interactions.
3. Optional email verification does not call AgentMail.
4. Private source reports do not leave the development browser.
5. Follow body uses the existing Design Slice 5 development flow.

## Follow-up correction

An August 31 review found that successful coverage-request and private-report
state changes removed the focused submit control without moving focus into the
new state. The follow-up moves focus to the verification field, completion
heading, or next action. It keeps fixture parameters conditional on an active
development scenario and names the deterministic publication gate plainly on
the public method page.

Passing the data, request, and private-delivery gates replaces the adapters. It
does not reopen the page hierarchy, coverage vocabulary, or privacy language.
