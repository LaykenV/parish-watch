# Resident Product Specification

Status: approved product plan; evidence Slices 1 through 4 and resident-interface Design Slices 1 through 3 are deployed

## Product Sentence

Public Parish tells Louisiana residents what supported local governments are
about to decide, shows the official evidence, answers source-grounded questions,
and alerts followers when the issue changes or reaches an outcome.

## Experience Principles

### Design The Resident Interface As One System

Do not design resident pages incrementally during backend work. Slice 4 settled
the issue, importance, timeline, and change contracts. The complete page
inventory, content, actions, navigation, mobile priority, system states, and
design-agent assignments live in
[`resident-interface-plan.md`](./resident-interface-plan.md). Design and build
the full frontend against typed local fixtures so later API work does not reopen
the page system. Fixture-backed success is development proof only. A production
build cannot present an action as working until its real backend path passes.

Design Slices 1 and 2 implement the route blueprint, responsive shell, Home,
For You, and Explore with development-only typed QA fixtures and no
resident-facing fixture banner. Production ignores fixture query parameters and
uses a bounded Convex query to show current full and limited atomic
publications. These views call them published decision records, open the
accepted official source, and do not imply issue ranking or complete place
coverage. Withheld versions remain private.

PR #27 deployed Design Slice 3 as `3a59e45`. It implements the issue, atomic
decision, meeting, and citation-level evidence pages. Source controls keep
citation selection in the URL, open a Coss drawer on mobile or a docked rail on
desktop, and return focus when closed. Its typed records remain explicit
development fixtures loaded through development-only imports. Production shows
recovery pages until real detail queries exist. The later design slices still
own Ask answers, follows and accounts, coverage, and cross-app QA.

### Start With Consequence

Residents do not arrive wanting a meeting packet. Lead with what may change,
where, when, and what action remains. Preserve the government body's exact item
title as supporting context.

### Put Receipts Beside Claims

A source link hidden at the bottom is not enough. Dates, amounts, votes,
deadlines, and "Why this may matter" factors should open their supporting excerpt
or page directly.

### Make Uncertainty Useful

Show “Limited information available,” “Outcome not posted,” “Source delayed,” or
“Relationship uncertain” at the point of uncertainty. Do not replace a missing
fact with generic confident prose.

### Stay Politically Neutral

Use the visual and written language of a public utility, not a campaign. Avoid
party colors, outrage labels, popularity scores, and framing that tells a
resident what conclusion to reach.

### Work Signed Out

A new visitor can select a place, browse decisions, open evidence, search, and
hold a multi-turn chat. Google sign-in appears only when the resident asks for
saved areas or managed follows. A resident can verify an
email-only alert without signing in.

### Design for a Phone

Facebook and TikTok distribution will send many residents to a mobile browser.
The issue title, current state, next date, "Why this may matter," ask box, and
follow action must work in one narrow column.

Protect the reading window from app chrome. The mobile top bar scrolls away,
only the four-item bottom navigation remains fixed, and the initial top and
bottom bars consume no more than 8 rem before safe-area padding on a
375-by-667-pixel viewport. No action depends on a hidden swipe or drag.

## Information Architecture

Primary navigation:

- For You
- Explore
- Ask
- Coverage

The double-P mark and live-text name link to Home from every page. Home uses the
same application shell as the rest of the resident interface.

Account area:

- Following
- Saved areas and topics
- Notification preferences

Contextual paths:

- issue timeline;
- atomic decision;
- meeting;
- source citation;
- request coverage.

The product defaults to issues for comprehension while keeping underlying
decisions and sources inspectable.

## First Visit

### Entry

The home page asks:

> What should Public Parish keep an eye on for you?

Inputs:

- one parish or municipality;
- optional topics such as land use, roads and drainage, public money,
  environment, housing, utilities, public safety, or boards and appointments.

No exact address. Allow skip to “Major local decisions.”

### Immediate Result

After selection, show:

1. a short line describing current supported bodies;
2. up to three high-consequence current issues;
3. recent material changes;
4. a search entry;
5. a quiet sign-in prompt for saving the setup.

Persist the anonymous selection locally. If the visitor later signs in, offer to
save it.

## Decision Card

Every promoted card contains:

- plain-language issue title;
- body and place;
- current lifecycle state;
- next date or latest outcome;
- one-sentence "Why this may matter" reason;
- one or two consequence markers, such as public money or public deadline;
- last checked;
- evidence status;
- follow action for Google accounts or verified email-only subscribers;
- clear open action.

Do not show a model confidence percentage as a substitute for plain language.
Use statuses such as "Evidence available," "Limited information," or "Source delayed,"
with an explanation.

Routine valid items can use a compact searchable row instead of a promoted card.

## Home and Major Decisions

### Main Sections

- Major local decisions
- Happening soon
- Recently changed
- Recently decided
- Coverage status when a followed source is degraded
- Voter information strip

### Acceptance

- useful before location setup;
- filterable by supported region and topic;
- sorted by deterministic importance and relevant time;
- no popularity ranking;
- every card opens a published record;
- empty states link to coverage or another supported place.

## Voter Information Strip

One compact strip on the landing page, placed below the decision sections. It
contains:

- the next statewide election date;
- a link to the Louisiana Secretary of State's voter portal for registration
  status and a resident's sample ballot;
- one line stating that Public Parish does not run elections and does not cover
  candidates.

### Rules

- Static hand-authored content. No crawl, no extraction, no model call, and no
  citation pipeline.
- No candidate, party, office, position, endorsement, or ranking.
- Link out instead of restating. The official portal is the record for
  registration and ballots.
- Verify the date against the Secretary of State's official election calendar
  before it ships and again at feature freeze. Never write the date from memory.
- Remove or advance the strip once the date passes. A stale election date is a
  correctness bug, not cosmetic drift.

### Acceptance

- the strip renders signed out and in a narrow column;
- the outbound link is checked in the Week 4 reliability pass;
- the strip never appears inside a decision card, issue page, feed ranking, or
  chat answer.

## For You

Inputs:

- saved or anonymous areas;
- optional topics;
- followed bodies or issues;
- current and upcoming time window.

Ranking uses eligibility and relevance after the global importance score. It
does not infer a resident's politics.

### Acceptance

- explain why an item appears, such as “Youngsville” or “Land use”;
- allow temporary filter changes without editing saved preferences;
- keep all valid decisions available through search;
- prompt sign-in only when the user asks to persist the feed.

## Issue Page

This is the main product surface.

### Header

- issue title;
- place and responsible bodies;
- lifecycle state;
- next known date or latest outcome;
- follow button;
- share action;
- last checked and coverage status.

### Plain-Language Block

Answer:

- What is being proposed or decided?
- Who decides?
- When?
- What can the public still do?

Every material answer carries a citation affordance.

### Why This May Matter

Show only accepted consequence factors:

- public money;
- public assets;
- land use;
- health and safety;
- rights and access;
- service delivery;
- public deadlines.

Each factor opens its evidence. Unknown factors stay absent instead of becoming
boilerplate.

### Timeline

Show linked atomic records in chronological order:

- proposal;
- scheduling or hearing;
- amendment or postponement;
- vote;
- contract or implementation;
- completion or cancellation.

An uncertain proposed link appears separately with its uncertainty and does not
alter the canonical lifecycle.

### Source Panel

For each citation:

- official body;
- document title;
- version and retrieval time;
- page or section;
- exact supporting excerpt;
- open-original action;
- any OCR or truncation warning.

### Revision History

Show material changes such as:

- date moved;
- amount changed;
- language amended;
- vote or result posted;
- prior interpretation corrected.

Do not create noise for formatting-only source changes.

### Acceptance

- every material fact has a resolving citation;
- anonymous chat is scoped to the issue by default;
- direct route refresh works on `convex.site`;
- a publication update appears without refresh;
- the page works at a narrow mobile width;
- source failure is visible.

## Atomic Decision Page

An atomic record can be opened from search, a meeting, or an issue timeline. It
shows the exact government item, record type, current state, accepted extracted
fields, citations, related issue if proven, and publication history.

This page prevents the issue abstraction from hiding the underlying record.

## Meeting Page

Show:

- body, date, status, and official location text;
- agenda, packet, minutes, result, and official video links when available;
- every extracted decision grouped by substantive and routine;
- source versions and missing expected artifacts;
- meeting-level ask box.

Do not position the meeting page as the main way residents discover information.

## Ask Public Parish

### Modes

- issue scoped from an issue page;
- meeting scoped from a meeting page;
- corpus wide from `/ask`.

### Answer Shape

- direct answer;
- short explanation;
- inline citation chips;
- official-source list;
- a visible not-found statement when needed;
- suggested evidence-backed follow-ups.

### Anonymous Flow

- no sign-in modal before the first question;
- multi-turn thread;
- 24-hour same-device continuity;
- quiet notice that answers use official sources and may be incomplete;
- Google sign-in offer only for saved areas or managed follows;
- separate AgentMail email verification only when the resident requests alerts.

### Failure Language

Use:

> Public Parish did not find that answer in the official sources it has validated
> for this issue.

Then show the closest official source and contact path. Do not say “I think,”
generate a likely answer, or direct the resident to an unofficial source.

## Following

Followable targets:

- issue;
- topic;
- government body;
- municipality.

Following does not require an account. A signed-out follow click offers two
paths:

- continue with Google through Convex Auth v2 alpha to save and manage follows;
- enter an email address and verify a short-lived AgentMail code to create an
  email-only subscription.

Email verification does not create an authenticated account. It grants access
only to the matching subscription. The resident can later use Google sign-in for
saved areas and a full following dashboard.

The signed-in page shows:

- active follows;
- latest material change;
- next known date;
- delivery preference;
- mute or unfollow;
- degraded coverage affecting a follow.

Do not expose a social follower count.

Each email-only alert contains a secure unsubscribe or management link. A
resident must verify another code before adding follows or changing delivery
preferences outside that link.

## Email Alert

Subject pattern:

> Public Parish update: [factual issue title]

Body:

1. what materially changed;
2. current stage or next date;
3. why it may matter;
4. official source receipts;
5. open in Public Parish;
6. invitation to reply with a question;
7. delivery preference link.

The message must be useful without clicking, but concise enough to scan.

Before the first alert, AgentMail sends a short-lived verification code or
confirmation request. Public Parish stores only the hashed challenge, expiry,
attempt count, and verified delivery reference. It does not treat that flow as
account authentication.

Residents can choose immediate material-change alerts, a weekly roundup, or
both. The roundup groups only published material updates for followed targets.
Do not send an empty roundup.

## Sharing

Every published issue has a stable share URL. The share action uses per-issue
Open Graph HTML with the factual title, place, current state, and a restrained
preview image. The metadata comes from the published issue projection. It does
not generate new claims or political framing. Human visitors continue to the
canonical issue page.

On supported mobile browsers, Share opens the system share sheet. Copy link is
the fallback and reports success inline.

Test the preview and destination on Facebook, LinkedIn, X, and a normal browser.

## Coverage

Public body rows show:

- jurisdiction and body;
- supported, degraded, validating, paused, or not supported;
- source kinds monitored;
- last successful check;
- next expected artifact when known;
- current incident in public-safe language;
- method link.

“Supported” is earned through the common source and gold-set gate. Do not use a
public “beta” label to excuse weaker evidence.

## Request Coverage

Ask for:

- parish or municipality;
- optional official government homepage;
- optional email address for a launch notification.

Do not require an account to submit. Convex stores and deduplicates the request.
After submission, show:

> Requested. We validate every source before coverage goes live.

The request does not start Firecrawl or OpenAI work. It has no public compiler
progress states. The owner may select a requested place for the internal
coverage compiler. If the place passes the coverage gate, AgentMail can notify
residents who supplied and verified an email address. Rate-limit submissions.
A request is not a promise of coverage.

## Report a Source Problem

Issue, decision, meeting, and source views provide a private reporting link for:

- a wrong fact;
- a broken or mismatched citation;
- a missed newer official source;
- an incorrectly linked issue;
- an inappropriate importance factor.

The link opens a dedicated AgentMail path with the current record URL included.
Ask for a short description and, if available, an official URL. Keep the report
private. Do not create a challenge table, public thread, status dashboard, or
automatic reprocessing trigger. The owner may run the normal retrieval and
publication pipeline. If validated evidence changes the record, show that change
in the normal revision history.

## Search

Search across:

- issues;
- atomic decisions;
- meetings;
- bodies;
- official source titles and accepted text fields.

Filters:

- place;
- body;
- topic;
- lifecycle state;
- date;
- record type;
- source status.

Search results distinguish an issue from an atomic decision and a meeting.

## Content Language

Prefer:

- “The council is scheduled to consider…”
- “The packet lists…”
- “Minutes report the vote as…”
- “The available source does not state…”
- “Public comment is listed for…”

Avoid:

- “Officials are trying to…”
- “This proves…”
- “Shocking”
- “Massive” without a documented comparison
- “Everyone”
- political motive or intent not stated in an official source

The system can describe documented consequence without pretending consequence
is political consensus.

## Visual Direction

- calm civic utility rather than government clip art or campaign branding;
- high-contrast typography and clear evidence hierarchy;
- restrained neutral base with one distinctive action color;
- lifecycle labels use text and icons, not color alone;
- source receipts feel inspectable, not buried in footnotes;
- no decorative AI sparkle treatment;
- no red-versus-blue framing;
- real document snippets only where legible and useful.

The mobile issue page gets design priority over a desktop dashboard.

## Accessibility

- meet WCAG 2.2 AA contrast and interaction targets;
- complete keyboard navigation;
- visible focus;
- semantic headings and landmarks;
- labels for every status and icon;
- reduced-motion behavior;
- screen-reader announcement for live material changes;
- citation drawers return focus correctly;
- mobile sheets have written openers and explicit close controls in addition to
  any grabber or drag gesture;
- dates use readable local time plus machine-readable timestamps;
- links identify the official source destination.

After each deployed design slice passes automated production checks, the
founder tests its direct route on an actual iPhone in Safari. The review covers
safe areas, Safari chrome, sheet heights, horizontal and vertical gestures,
keyboard behavior, rotation, page zoom, and reduced motion.

## Product Analytics

Track aggregate product actions separately from personal content:

- production app visit;
- location setup completed;
- decision card opened;
- issue citation opened;
- original source opened;
- chat question completed;
- evidence-not-found returned;
- follow created;
- notification sent, delivered, opened, and clicked where provider data allows;
- return session;
- source problem reported;
- coverage request submitted.

Do not treat a page impression as civic proof. Do not expose private question
text in analytics.

The initial telemetry release uses these exact terms:

- a unique visitor is one opaque browser identifier seen on a production host
  during its 90-day active identity window;
- a visit is a load at least 30 minutes after that browser's prior visit;
- an activated visitor has selected at least one supported area;
- a returning visitor has a later visit at least 24 hours after first use;
- activation rate is activated visitors divided by unique visitors.

These are browser-level product signals. They do not prove a unique person,
Louisiana residency, or completion of the resident loop. Call a known tester a
real resident only when recruitment or permission provides that evidence.

The browser hashes a random local identifier before sending it. Application
analytics rows store only allowlisted events, fixed area slugs, server times,
and aggregate counts. They do not store IP addresses, referrer URLs, user-agent
strings, questions, emails, exact locations, or arbitrary event properties.
Identifiers and event rows expire after 90 days. A browser that returns after
90 inactive days can increment the cumulative visitor total again. Aggregate
counters remain for submission evidence. The owner reads the summary through
the authenticated
`npm run analytics:report:production` Convex CLI operation. The resident
interface never shows popularity counts.

The browser sends these events to one same-origin HTTP route. That route accepts
only the two served production origins, validates an exact payload shape, and
calls internal Convex mutations. The official rate-limiter component caps one
browser at 12 requests per minute, the app at 120 requests per minute, and the
app at 5,000 requests per day. Origin checks and rate limits reduce accidental
or scripted inflation but cannot prove that anonymous traffic came from a
human. Treat the report as unauthenticated product telemetry, not an audited
resident count.

If the browser cannot write and read back its random identifier, it sends no
telemetry. This avoids counting a new visitor on every reload when site storage
is blocked, at the cost of excluding those browsers from the report.

## Empty and Error States

- No current decisions: show recent outcomes, search, and coverage status.
- Source delayed: state the expected artifact and last successful check.
- Evidence limited: show known source-only facts and missing fields.
- Chat not found: link the closest official source or contact.
- Body degraded: keep dated records available with a prominent freshness notice.
- Notification failed: retry without duplicate sends and surface the state in
  the owner's operations view.
- Unsupported place: explain the coverage gate and offer request coverage.

## Launch Acceptance

The resident product is submission-ready when a signed-out mobile visitor can:

1. select a supported place;
2. find a real consequential issue;
3. understand the next decision and public action;
4. open an exact official receipt;
5. ask two related questions;
6. receive an honest not-found answer when the corpus lacks evidence;
7. choose Google sign-in or an AgentMail-verified email subscription only when
   choosing to follow;
8. receive and reply to a material-change email;
9. return to a live updated issue;
10. inspect coverage and revision history.
