# Resident Product Specification

Status: approved product plan; evidence Slices 1 through 3 are deployed, Slice 4 is proven in development, and resident interface design is next

## Product Sentence

Public Parish tells Louisiana residents what supported local governments are
about to decide, shows the official evidence, answers source-grounded questions,
and alerts followers when the issue changes or reaches an outcome.

## Experience Principles

### Design The Resident Interface As One System

Do not design or implement resident pages incrementally during backend work.
After Slice 4 settles the issue, importance, timeline, and change contracts,
define the complete page inventory and every page's content, actions,
navigation, mobile priority, and system states. The founder then creates and
approves the complete interface in the selected design tool. Implement that
approved frontend as one cohesive pass. Later backend slices connect chat,
follows, email, and coverage behavior without reopening the visual system.
Hide any action that does not work yet.

### Start With Consequence

Residents do not arrive wanting a meeting packet. Lead with what may change,
where, when, and what action remains. Preserve the government body's exact item
title as supporting context.

### Put Receipts Beside Claims

A source link hidden at the bottom is not enough. Dates, amounts, votes,
deadlines, and “Why this matters” factors should open their supporting excerpt
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
The issue title, current state, next date, “Why this matters,” ask box, and
follow action must work in one narrow column.

## Information Architecture

Primary navigation:

- Home
- For You
- Decisions
- Ask
- Coverage

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
- one-sentence “Why this matters” reason;
- one or two consequence markers, such as public money or public deadline;
- last checked;
- evidence status;
- follow action for Google accounts or verified email-only subscribers;
- clear open action.

Do not show a model confidence percentage as a substitute for plain language.
Use statuses such as “Source complete,” “Limited source,” or “Source delayed,”
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

### Why This Matters

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
- dates use readable local time plus machine-readable timestamps;
- links identify the official source destination.

## Product Analytics

Track aggregate product actions separately from personal content:

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
