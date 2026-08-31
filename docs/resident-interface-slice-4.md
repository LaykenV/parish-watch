# Resident interface Slice 4 handoff

Status: implemented in PR #28, green on its checks, not merged and not
deployed. Updated August 30, 2026.

This handoff finishes the resident experience for Ask Public Parish. It covers
the route, scoped entry from an issue or meeting, a demonstrated two-question
anonymous thread, cited answers, honest not-found responses, expiry, abuse
controls, and mobile keyboard behavior. Two questions are the proof scenario,
not a visible product limit.

The work stays inside the product boundary already approved in
[`resident-interface-plan.md`](./resident-interface-plan.md). It does not add
open-web chat, account-gated reading, generated testimony, cross-device chat
history, or public records request automation.

## The outcome

A resident should be able to ask a plain question and read a short answer that
behaves like an annotated civic record. Every factual claim has a nearby Source
control. The answer appears only after the service validates its citations. If
the published evidence cannot answer the question, the product says so without
turning the result into an error screen.

The page should feel quieter than a consumer chatbot. There are no avatars,
speech bubbles, typing dots, model names, reasoning traces, or animated words.
The evidence gutter remains the product's one signature interaction.

## Product truth before polish

Evidence Slice 4 established the issue timeline contract. It did not ship the
resident chat service. The route therefore needs a hard availability gate while
Ask remains a stable production navigation destination.

- Development may use typed fixtures loaded through a development-only dynamic
  import.
- Production must not simulate an answer, a recent thread, a CAPTCHA challenge,
  or a provider error.
- Keep Ask visible in production navigation before and after the anonymous chat
  adapter passes its integration gate. Production is where the founder tests
  the route and shared navigation behavior.
- A production visit to `/ask` before that gate shows the finished unavailable
  state. It contains no composer and does not simulate a successful answer.
- Enabling the adapter replaces the route state without changing navigation or
  page hierarchy.

The unavailable state says:

> Ask is not available yet
>
> You can still browse published decisions and inspect every official source.
>
> Explore published records

Do not call this a beta or promise a date.

## Design direction

The subject is a resident checking a government record at a kitchen table. The
page should resemble a clear reading copy with margin notes, not a support chat
window.

The visual hierarchy has four levels:

1. The current evidence scope.
2. The resident's question.
3. The complete answer and its claim-level Source controls.
4. The composer for the next question.

The scope bar is the orientation point. The answer is the reading point. The
composer is useful but visually secondary while an answer is on screen.

### Anti-template critique

The first pass is too generic if it could be mistaken for an AI assistant after
removing the logo. Reject these patterns:

- rounded question and answer bubbles;
- a centered chatbot card inside a blank page;
- assistant avatars or a sparkle mark;
- rainbow borders, glowing composer effects, or typing animation;
- tabs for web, files, tools, or reasoning;
- action rows made from unlabeled icon buttons;
- source chips that open an external document without showing the exact cited
  passage;
- dashboards with a permanent empty evidence rail.

The revision should be recognizable from the ruled question band, the calm
reading column, and the same evidence gutter used on Issue and Decision pages.

## Beautiful UI review

[Beautiful UI](https://www.beautifului.dev/) has useful chat composition ideas,
but its registry components should not be installed for this slice. They bring
their own foundation layer and several interaction assumptions that conflict
with Public Parish.

| Component | Useful idea | Conflict | Decision |
| --- | --- | --- | --- |
| Chat | Compact conversation rhythm | Scripted replies, tabbed tool UI, small controls, and generic assistant styling | Do not install |
| Streaming Text | Sources disclosure and full-width follow-up rows | Word streaming, decorative avatars, tiny actions, and source chips that bypass the exact evidence viewer | Rebuild the two useful patterns locally |
| Prompt Bar | Strong composer affordance | Attachments, model choice, slash commands, dictation, open source selection, decorative shader, and an extra dependency | Reject |
| Thinking | A visible waiting region | Exposes a reasoning trace that residents cannot verify and do not need | Reject |
| Loading State | Distinct processing feedback | Decorative motion duplicates the stable Coss spinner | Reject |
| Context Cards | Retrieved material near an answer | Duplicates the shipped citation map and official source viewer | Reject |

Coss remains the behavior and token base. Use the existing `EvidenceProvider`,
`Claim`, `SourceControl`, `EvidencePanel`, and mobile evidence sheet. Build the
Ask layout in project code. Add no package and no registry CSS.

## Visual specification

Use the approved light theme without adding Ask-only tokens.

| Role | Token or value | Use |
| --- | --- | --- |
| Page | Paper `#FAFAF9` | Route background |
| Reading surface | Card `#FFFFFF` | Answer and composer surfaces |
| Primary text | Ink `#171717` | Questions, answers, headings |
| Action | River blue `#315BEA` | Send, links, selected Source |
| Verified evidence | Evidence green `#10B981` | Small validated answer marker only |
| Delay or limit | Warning amber `#F59E0B` | Cooldown and incomplete evidence notices |
| Secondary text | Muted `#686864` | Scope detail, timestamps, privacy note |
| Interface type | Inter | All resident copy |
| Data type | Geist Mono | Source locators and expiry time |

The route heading is an interface heading, not a marketing headline.

- Mobile route title: `2rem`, tight line height, no more than two lines.
- Desktop route title: `2.5rem` maximum.
- Answer lead: `1.125rem` mobile and `1.25rem` desktop.
- Body: `1rem` minimum with a comfortable reading line height.
- Metadata: `0.875rem` minimum.
- All interactive targets: at least `44px` by `44px`.

Use borders and spacing before shadows. The answer may use a one-pixel neutral
border. Do not give each turn its own floating card.

## Page layouts

### Empty Ask page on mobile

```text
Public Parish                         Area

Ask Public Parish
Answers come only from published,
validated official evidence.

[ Searching validated Lafayette records ]

What do you want to understand?
[                                            ]
[                                            ]
[ Send question                             ]
No account needed. This conversation is
available on this device for 24 hours.

Try asking
[ What decisions changed this week?        ]
[ What was approved about drainage?        ]

Recent on this device
[ Surplus pickup donations       2:14 PM   ]

For You       Explore       Ask       Coverage
```

The empty composer is in normal document flow. The page should not show a blank
evidence rail or pin the composer to the viewport.

### Active thread on mobile

```text
Ask Public Parish
[ Answering from this issue                 ]
[ Surplus pickup donations       Back       ]

You asked
Who received the truck?

Answer checked against 2 official sources

The city donated the surplus truck to...
[ Source  CO-022-2026, item 14               ]

The council approved the donation on...
[ Source  Minutes, page 6                    ]

[ Sources used, 2                       v    ]

You can also ask
[ Did Lafayette receive payment?            ]
[ What was the vote?                        ]

Ask another question
[                                            ]
[ Send                                      ]

For You       Explore       Ask       Coverage
```

After the first submission, keep the composer above the bottom navigation. Add
page padding equal to the composer, navigation, and safe area so the last Source
control can scroll fully above them.

When the software keyboard opens, hide the bottom navigation. Keep the composer
above the keyboard using the visual viewport behavior already owned by the
resident shell. The answer stays scrollable and the field never jumps behind
browser chrome.

### Active thread on desktop

```text
Top navigation

                 Ask Public Parish
                 [ issue scope and return ]

                 You asked                       Official source
                 Question                        selected citation

                 Complete cited answer           exact excerpt
             Source controls in gutter           official link

                 Sources used
                 Suggested questions

                 Ask another question
```

The reading column is no wider than `46rem`. Once a Source is selected at
`64.0625rem` and above, place the existing `320px` evidence panel beside it.
Before selection, the reading column remains centered. Do not reserve a blank
panel.

## Scope and URL rules

Ask supports three scopes.

| Scope | Resident label | URL fields | Return action |
| --- | --- | --- | --- |
| Corpus | Searching all validated Public Parish evidence | `scope=corpus` and optional public area key | Back to Explore when applicable |
| Issue | Answering from this issue | `scope=issue&issue=<public-slug>` | Back to issue |
| Meeting | Answering from this meeting | `scope=meeting&meeting=<public-id>` | Back to meeting |

The selected citation may use the existing public `source=<citation-id>` field.
No other conversation content belongs in the URL.

Remove the current `q=` handoff. A question is private conversation content and
must not appear in browser history, copied links, referrer data, analytics, or
server access logs. The resident shell should own an in-memory
`AskDraftHandoff` context. The issue and meeting Ask blocks place the draft in
that context before navigation. The Ask route consumes and clears it on mount.
Do not use router history state for the draft. If a reload loses the in-memory
draft, keep the public scope and show an empty composer.

Never put a thread ID, recovery token, email address, question, or answer in the
query string. Store the anonymous thread token only through the backend-approved
private client mechanism. The recent list stores a safe scope label and local
handle, not message text.

The scope bar must include a visible label, the public record title, and a
return action. If a resident changes scope after a turn exists, ask for
confirmation:

> Start a new conversation?
>
> Changing the evidence scope clears this conversation from this page.

Actions are `Keep this conversation` and `Start new conversation`. The safe
action receives initial focus.

## Conversation composition

### Resident question

Use a quiet ruled band with the label `You asked`. Preserve line breaks but cap
the displayed text to a sensible reading width. Do not add an avatar, timestamp,
edit control, or colored bubble.

For two turns, keep both questions and answers in chronological order. Do not
collapse the first answer. The composer follows the latest answer.

### Checking state

Submitting freezes the exact question into the thread and clears the field. The
answer region takes a stable minimum height so the page does not jump.

Show the shared spinner with:

> Checking the official record
>
> The answer will appear after its sources pass validation.

Do not stream words, show fake search steps, count sources before validation, or
display a model name. Announce `Checking the official record` once through a
polite live region. Do not announce spinner frames or elapsed seconds.

Disable Send while this turn is pending. Keep the prior answer and all Source
controls usable.

### Supported answer

Start with one direct sentence. Follow with only the context needed to
understand consequence, process, date, or uncertainty. Put each factual claim
inside the existing `Claim` component with one nearby `SourceControl`.

Use this header:

> Answer checked against official sources

The green marker communicates that the answer passed the publication rules. It
must not display a score or imply that the government decision itself is good.

### Sources used

After the answer, add a native disclosure labelled `Sources used, N`. Its
summary is a `44px` target. Each row contains:

- the official document title;
- the document kind and date;
- the precise section or page;
- an `Inspect source` control that selects the matching citation in the existing
  viewer.

Do not repeat full excerpts in the disclosure. The evidence viewer owns exact
context and the official external link.

### Suggested questions

Show up to three suggestions only when the backend returns them for the current
scope. Each suggestion is a full-width text button with a visible focus ring.
Selecting one puts its text in the composer and focuses the field. It does not
submit, spend a turn, or call the provider.

Use `You can also ask` as the heading. Do not invent client-side suggestions.

### Not found

Not found is a complete answer, not a failure state. Use the same answer region
without the green validated marker.

> Public Parish did not find that answer in the official sources it has
> validated for this issue.
>
> I checked the records available for this issue, but they do not say who will
> maintain the property after the transfer.

If the backend supplies a closest relevant source, show it with precise wording
such as `The agreement describes the transfer, but not future maintenance` and
a Source control. Never cite a source as support for an absent fact.

Offer a narrower backend-provided question when available. If the public record
contains a useful official contact, label it `Contact listed in the official
record`. Do not create a public records request or testimony draft.

## Typed frontend contract

The route consumes a projection owned by a typed adapter. It does not read raw
chat, model, review, citation, abuse, or identity tables.

```ts
export type AskScope =
  | { kind: 'corpus'; areaKey?: string; label: string }
  | {
      kind: 'issue'
      issueSlug: string
      label: string
      recordTitle: string
      returnTo: string
    }
  | {
      kind: 'meeting'
      meetingId: string
      label: string
      recordTitle: string
      returnTo: string
    }

export type AskClaimView = {
  id: string
  text: string
  citationIds: [string, ...string[]]
}

export type AskSupportedAnswer = {
  kind: 'supported'
  lead: AskClaimView
  claims: AskClaimView[]
  citations: CitationMap
  suggestions: string[]
}

export type AskNotFoundAnswer = {
  kind: 'not_found'
  statement: string
  explanation?: string
  closestCitationId?: string
  citations: CitationMap
  suggestions: string[]
  officialContact?: { label: string; value: string; sourceId: string }
}

export type AskTurnView = {
  id: string
  question: string
  askedAt: string
  state:
    | 'checking'
    | 'complete'
    | 'retryable_failure'
    | 'terminal_failure'
  answer?: AskSupportedAnswer | AskNotFoundAnswer
}

export type AskConversationView = {
  id: string
  scope: AskScope
  expiresAt: string
  turns: AskTurnView[]
}

export type AskAvailability =
  | { kind: 'available' }
  | { kind: 'offline' }
  | { kind: 'unavailable' }
  | { kind: 'cooldown'; retryAt: string }
  | { kind: 'captcha'; challengeId: string }

export type AskRouteSearch =
  | { scope?: 'corpus'; area?: string; source?: string }
  | { scope: 'issue'; issue: string; source?: string }
  | { scope: 'meeting'; meeting: string; source?: string }

export type AskRecentConversation = {
  localHandle: string
  scopeLabel: string
  latestActivityAt: string
  expiresAt: string
}

export type AskSubmission = {
  conversationId?: string
  scope: AskScope
  question: string
  idempotencyKey: string
}

export type AskRetry = {
  conversationId: string
  turnId: string
}

export interface AskAdapter {
  resolveScope(input: AskRouteSearch): Promise<AskScope>
  listRecent(): Promise<AskRecentConversation[]>
  open(localHandle: string): Promise<AskConversationView | null>
  submit(input: AskSubmission): Promise<void>
  retry(input: AskRetry): Promise<void>
  startNew(scope: AskScope): Promise<void>
}
```

The adapter normalizes backend states. Presentational components never infer
support from prose or assemble citations from a model response.

## Component ownership

| Component | Responsibility | Important rule |
| --- | --- | --- |
| `AskPage` | Route composition and availability gate | Does not own provider calls |
| `AskScopeBar` | Visible evidence scope and return action | Scope never changes silently |
| `AskComposer` | Draft, length, submit, keyboard placement | No attachments, model choice, or URL draft |
| `AskQuestion` | Readable resident turn | No bubble or avatar |
| `AskChecking` | Stable complete-answer wait | Shared spinner, no streaming |
| `AskAnswer` | Supported or not-found projection | Receives validated data only |
| `AskClaim` | One factual statement and one or more Source controls | The direct answer is a cited claim too |
| `AskSourcesUsed` | Compact source inventory | Selects existing evidence viewer |
| `AskSuggestions` | Backend-provided next questions | Populate and focus, never auto-submit |
| `AskRecent` | Same-device conversation handles | No message preview |
| `AskNotice` | Expiry, cooldown, offline, CAPTCHA, failure | One action and plain recovery copy |

Reuse Coss `Button`, `Badge` only where it has semantic value, and the shared
spinner. Reuse the Slice 3 sheet and evidence components without forking them.

## State model

```text
unavailable
    |
available empty -> drafting -> checking
                              |       |
                              |       +-> retryable failure -> checking
                              |       +-> terminal failure -> readable thread
                              |
                              +-> supported answer -> drafting next turn
                              |
                              +-> not found -> drafting next turn

any available state -> cooldown -> previous readable state
any submit -> CAPTCHA -> checking after success
active thread -> confirm scope change -> new empty thread
active thread -> expired -> private content removed
network loss -> offline read-only -> prior readable state after reconnect
```

| State | Page content | Composer | Primary action |
| --- | --- | --- | --- |
| Empty | Scope, source promise, examples, recent handles | Enabled | Send question |
| Drafting | Existing thread and draft | Enabled | Send |
| Checking | Prior thread and stable checking region | Disabled | None |
| Supported | Complete cited answer | Enabled | Ask another question |
| Not found | Honest evidence limit | Enabled | Ask a narrower question |
| Retryable failure | Prior thread and local failure notice | Disabled until retry or dismiss | Try again |
| Terminal failure | Prior thread and plain final notice | Enabled for a new question | Ask a different question |
| Cooldown | Prior content and exact retry time | Disabled | Return after time |
| CAPTCHA | Prior content and challenge | Disabled | Complete check |
| Expired | No private questions or answers | Empty new thread only | Start a new conversation |
| Offline | Previously loaded content only | Disabled | Try again when online |
| Unavailable | Explanation and Explore link | Hidden | Explore published records |

## Recovery copy

### Retryable provider failure

> The answer could not be checked
>
> Your question is still here. Try again without sending a second copy.

Action: `Try again`

The retry uses the original idempotency key. A resident should never wonder
whether two answers are processing.

### Terminal provider failure

> This question could not be answered
>
> Public Parish did not add an answer because it could not validate the result.
> You can ask a different question or keep reading the published records.

There is no retry action after the adapter marks a turn terminal. Keep prior
validated answers and their Source controls available.

### Cooldown

> Ask is taking a short pause on this device
>
> You can ask again at 2:18 PM. Published records and Sources still work.

Use a real local time, not a live countdown. Announce the notice once.

### CAPTCHA

> Please complete this quick check
>
> It helps keep anonymous Ask available without requiring an account.

Render only the challenge selected by the abuse adapter. Do not show a fake
challenge in production and do not frame it as suspicious behavior.

### Expired conversation

> This conversation has expired
>
> Anonymous conversations stay on this device for 24 hours. The questions and
> answers are no longer available here.

Action: `Start a new conversation`

Do not leave question text in the document, recent list, title, page source, or
accessibility tree after expiry.

### Offline

> Ask needs a connection to check official sources
>
> You can keep reading answers already loaded on this page.

Do not erase validated answers during a temporary network loss.

## Recent conversations

Show at most five unexpired same-device handles below the empty composer. Each
row contains a safe public scope title, the time of the latest activity, and the
expiry time. It never contains question or answer text.

Opening a missing or expired handle removes it locally and shows the expired
state. There is no account prompt and no claim of cross-device recovery.

Provide `Clear recent conversations` only when at least one handle exists. Ask
for confirmation, then remove the local handles and their accessible names.

## Composer behavior

- Use a real `textarea` with a visible label. Do not rely on placeholder text as
  the label.
- Begin at two text rows. Grow to six rows, then scroll inside the field.
- `Enter` submits on a desktop keyboard. `Shift+Enter` inserts a new line.
- Disable Send for whitespace, over-limit text, a pending turn, cooldown,
  CAPTCHA, or offline state.
- Show the character count only near the limit.
- Preserve a draft through a citation sheet open and close.
- Clear the draft only after the submission is accepted.
- After submission, move focus to the thread heading. Do not move focus again
  when the answer arrives.
- Announce answer completion through a polite live region. The announcement is
  `Answer ready with N sources` or `The published evidence did not answer the
  question`.
- Keep normal conversation and cost bounds invisible. The adapter may return a
  terminal limit state only when the resident reaches an enforced safety or
  resource limit. Do not display a turn counter.

The privacy note below the first composer reads:

> No account needed. This anonymous conversation is available on this device
> for 24 hours.

## Evidence interaction

Use the citation behavior shipped in Slice 3 without a second viewer.

- On mobile and tablet, Source opens the existing Coss sheet.
- On desktop, Source selects the existing docked evidence panel.
- The selected source lives in the public `source` URL field so browser Back can
  close or restore it.
- Closing the sheet or panel restores focus to the exact Source control that
  opened it.
- If two claims use the same source, each control keeps its own focus return.
- Escape closes the desktop panel before it affects the route.
- The composer remains drafted while a source is open.

The `Sources used` disclosure and claim controls must point to the same citation
map. No answer may show an external source link without the validated excerpt,
locator, retrieval date, and official document link in the evidence viewer.

`AskClaim` may show more than one Source control when one statement needs more
than one record. It should compose the shipped `Claim` and `SourceControl`
pieces, not duplicate their selection behavior. The direct answer is an
`AskClaim`, so its first factual sentence can never sit outside citation
validation.

## Responsive and keyboard rules

| Width | Reading layout | Evidence | Composer |
| --- | --- | --- | --- |
| `320px` to `47.99rem` | One column with `16px` side padding | Coss sheet | In flow when empty, sticky above nav when active |
| `48rem` to `64rem` | One column with evidence gutter controls | Coss sheet | Sticky within centered reading column |
| `64.0625rem` and wider | `46rem` reading column plus selected `320px` panel | Docked panel only after selection | Sticky to the reading column, not the viewport edge |

At `320px`, Source locators may wrap but labels and actions may not clip. Do not
put scope title and return action on one forced line.

At `375px`, the title, scope, composer label, two rows of input, Send action,
privacy note, and the first example should appear before needless decorative
space. This fixes the current low-fidelity route, whose large heading consumes
most of the first viewport.

Honor `env(safe-area-inset-bottom)` for the active composer and bottom
navigation. Test Safari with the top and bottom tab layouts, expanded controls,
collapsed controls, rotation, and 125 percent page zoom.

## Accessibility

- Keep one `h1`, then use chronological `h2` turn headings that include a
  visually hidden turn number.
- Use a `form` landmark for the composer and a named `section` for the thread.
- Do not mark the whole thread as live. Use one small status region.
- Supported and not-found answers must differ in text, not color alone.
- The green answer marker needs the text `Answer checked against official
  sources`.
- Error notices receive focus only when resident action is required.
- All visible icon actions need plain text or a specific accessible name. Never
  use `Action` as the accessible name.
- A suggestion's full sentence is its accessible name.
- `Sources used` uses native `details` and `summary` unless Base UI supplies a
  stronger accessible disclosure already in the project.
- Reduced Motion removes any composer or panel transition that is not needed to
  understand state.

## Motion

Use only the shared spinner and the established evidence sheet transition. A
short background change may mark the newly completed answer, then settle. Do
not animate text entry, source counts, borders, gradients, or suggestion rows.

## Development fixtures

Fixtures prove presentation states only. They are not evidence that the chat
backend works.

Use the existing development issue `surplus-pickup-donations` for the primary
thread:

1. `Who received the truck?`
2. `Did Lafayette receive payment?`

The supported fixture must use the existing CO-022-2026 and CO-023-2026 source
records where the claims match those documents. Add separate typed fixture
entries for not found, expired, cooldown, CAPTCHA, provider failure, and
offline. The primary fixture should prove at least two resident questions
without presenting two as a limit.

Development fixture parameters must follow the current fixture boundary and be
ignored by production. Production must never render the scenario picker or
fixture labels.

## File plan

Keep the route thin and put feature behavior under `src/features/ask`.

| File | Change |
| --- | --- |
| `src/routes/ask.tsx` | Parse public scope and source fields, render the route component, remove `q` |
| `src/routes/ask.data.ts` | Resolve public scope and the adapter-owned page projection |
| `src/features/ask/contracts.ts` | Add view, state, adapter, and route-search types |
| `src/features/ask/ask-page.tsx` | Compose availability, scope, thread, recent list, and evidence viewer |
| `src/features/ask/ask-composer.tsx` | Own draft and keyboard-safe submit behavior |
| `src/features/ask/ask-thread.tsx` | Render chronological questions, checking states, and answers |
| `src/features/ask/ask-answer.tsx` | Render supported and not-found claim projections, including multi-source claims |
| `src/features/ask/ask-states.tsx` | Render expiry, limit, cooldown, CAPTCHA, offline, and failure states |
| `src/features/ask/ask.css` | Implement the responsive reading layout with existing tokens |
| `src/features/ask/fixtures.ts` | Export development-only typed scenarios |
| `src/features/evidence/evidence-blocks.tsx` | Replace the private `q=` handoff with ephemeral same-tab draft state |
| `src/features/resident-blueprint/resident-shell.tsx` | No gating change. Verify Ask remains a stable production navigation destination |

Prefer extending the existing evidence projection types only when Ask needs the
same public data. Do not fork `SourceControl` or `EvidencePanel` into Ask-only
copies.

## Implementation sequence

This is one frontend concern. It can be one reviewable design PR if the diff
stays within the files above.

1. Add the typed route search, adapter contract, and production availability
   gate.
2. Remove private question content from the URL handoff before adding fixtures.
3. Build the empty corpus, issue, and meeting layouts with the real scope bar.
4. Build the chronological multi-turn thread and prove two questions with the
   primary fixture.
5. Connect supported and not-found answers to the shipped evidence viewer.
6. Add Sources used, suggestions, and recent handles.
7. Add expiry, cooldown, CAPTCHA, provider failure, offline, and unavailable
   states.
8. Finish sticky composer, keyboard, safe area, focus, and announcement behavior.
9. Run the anti-template critique again. Remove anything that reads like a
   general AI chat product.
10. Record fixture ownership and the chat integration gate in the PR.

Do not install Beautiful UI, copy its foundation stylesheet, or add `glimm`.
Do not touch Convex functions in this frontend slice.

## Review matrix

GitHub Actions owns automated validation under the repository rules. Static
review during implementation should still cover every row below.

| Scenario | `320px` | `375px` | `768px` | `1280px` | Keyboard | Screen reader |
| --- | --- | --- | --- | --- | --- | --- |
| Empty corpus scope | Required | Required | Required | Required | Required | Required |
| Empty issue scope | Required | Required | Required | Required | Required | Required |
| Empty meeting scope | Required | Required | Required | Required | Required | Required |
| First turn checking | Required | Required | Required | Required | Required | Required |
| Supported two-turn thread | Required | Required | Required | Required | Required | Required |
| Not found | Required | Required | Required | Required | Required | Required |
| Source open and focus return | Required | Required | Required | Required | Required | Required |
| Expired | Required | Required | Required | Required | Required | Required |
| Cooldown | Required | Required | Required | Required | Required | Required |
| CAPTCHA | Required | Required | Required | Required | Required | Required |
| Provider failure and retry | Required | Required | Required | Required | Required | Required |
| Terminal provider failure | Required | Required | Required | Required | Required | Required |
| Offline with prior answer | Required | Required | Required | Required | Required | Required |
| Production unavailable | Required | Required | Required | Required | Required | Required |

After an authorized merge, the founder iPhone Safari review in the resident
interface plan applies. Ask also needs these checks:

- open the software keyboard from empty and active threads;
- inspect a Source, close it, and confirm focus returns to the correct answer;
- rotate with the keyboard open and confirm the composer stays reachable;
- use browser Back while a Source is selected and confirm the private question
  never appears in the URL;
- wait for a complete answer and confirm no words appear before validation;
- open a recent handle and confirm no message preview exists outside the thread.

## What shipped differs from this handoff

The implementation follows this document except where recorded here. Each
departure is deliberate.

### Three additions to the adapter contract

The `AskAdapter` interface above does not close the state model. The shipped
interface adds:

- `subscribe(listener)`, the realtime channel a Convex backend will own.
  Conversation, availability, and recent-handle state arrive only through it,
  so no component infers state from a write call's return value.
- `resolveChallenge(challengeId)`, owned by the abuse adapter. The page renders
  only the challenge the adapter selected and calls this when the resident
  completes it.
- `clearRecent()`, because the adapter owns same-device handle storage. Without
  it, `Clear recent conversations` cleared the rendered list and the handles
  returned on the next mount.

`AskRetry` drops the `idempotencyKey` this document gave it. A retry names the
turn, and the adapter replays the key it recorded for that turn's submission.
The rule above, that a retry uses the original key, cannot hold if the caller
mints a new one, and no view type carries the original for the page to reuse.

A refused `submit` or `retry` also applies its own `AskRequestError.failure` to
availability rather than waiting for the adapter to push. A page that clears its
own cooldown while the adapter still refuses would otherwise show an enabled
composer whose Send does nothing.

### The decision page asks from its issue

This handoff names three scopes and no decision scope. `DecisionDetailData`
carries no meeting id, so the decision page's Ask block asks from the issue that
owns the record and falls back to the corpus when it belongs to none.

### The Ask blocks honor the availability gate

The file plan expected the record pages only to replace the `q=` handoff. A
composer that accepts a question and lands on the unavailable state discards it
silently, so the blocks now consult the same gate the route uses and show the
same honest message in place of the composer.

### The page container is the reading measure

The responsive table implies a reading column inside a wider page. Sizing the
container to `74rem` the way the record pages do left the conversation jammed
against the left edge with a rail's worth of dead space beside it, because Ask
has no always-present rail to fill that side. The container is now the reading
measure itself, so the heading, the scope bar, and the conversation share one
left edge and the block centers in the viewport. Docking the evidence panel
widens the container by exactly the rail and its gap, so the block re-centers
as a unit rather than the column sliding out from under a fixed heading.

The empty composer sits directly below the scope bar rather than after the
examples and recent list, so the field is the first thing a resident reaches in
both reading order and tab order.

### The composer is not sticky on desktop

The responsive table says the composer stays sticky to the reading column at
`64.0625rem` and above. It does not. A composer pinned over a long answer
covers the reading point and puts the last claim behind it, and a desktop page
has neither a bottom navigation bar nor a thumb-reach problem to justify that.
Phone and tablet keep the sticky composer for exactly those reasons.

### Back does not close the evidence panel

The evidence interaction rules say the selected source lives in the `source`
field so browser Back can close or restore it. Selecting a source replaces the
history entry instead of pushing one, so Back leaves the route. This matches
the Issue, Decision, and Meeting pages shipped in Slice 3, which all replace.
Ask follows the shipped behavior rather than becoming the one evidence surface
where Back means something different. Changing it is a Slice 3 decision, not a
Slice 4 one.

### Open work

No test covers Ask. The reviewer flagged the gap on every pass. The evidence
pages have tests and this feature does not.

## Acceptance gate

Slice 4 is ready for design approval when all of the following are true:

- Ask looks like an annotated record, not a generic chatbot.
- Corpus, issue, and meeting scope are visible and preserved.
- A private question never enters a URL, analytics payload, or public route
  state.
- No answer claim appears before citation validation completes.
- Every supported factual claim reaches the exact existing evidence viewer.
- Not found names the evidence limit without blaming the resident or the system.
- Anonymous reading and both questions work without sign-in.
- Expiry removes private content from the page and recent handle storage.
- Suggestions populate the composer without automatic submission.
- The active composer stays above mobile navigation and the software keyboard.
- The page works at `320px`, with keyboard only, at 125 percent zoom, and with
  Reduced Motion.
- Production keeps Ask in navigation and either uses the proven chat adapter or
  shows the honest unavailable route state.
- No Beautiful UI dependency, foundation CSS, decorative AI motion, model
  control, attachment flow, or reasoning trace ships.

## Stop conditions

Stop and reopen product review if implementation would require any of these:

- sources outside published, validated Public Parish evidence;
- a visible question counter or one-question limit;
- cross-device history;
- an account before the first question;
- a public conversation URL;
- generated testimony or a public records request;
- a second evidence viewer;
- streaming unvalidated text;
- exposing provider reasoning, model selection, or tool activity.
