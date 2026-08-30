# Grilling Decision Record

Product grilling completed: August 26, 2026
Stack amendment completed: August 27, 2026
Environment and checkpoint amendment completed: August 27, 2026
Brand and domain amendment completed: August 27, 2026
Issue and importance contract amendment completed: August 29, 2026
Resident interface amendment completed: August 29, 2026
Product name: Public Parish

This file records the settled product decisions from the planning grill. It
exists so later implementation work does not reopen resolved branches or quietly
expand the promise.

## Strategic Decision

- Enter the Convex All Gas Hackathon.
- Build a fresh app. Do not convert or submit the existing Python/SQLite ITEP
  repository.
- Reuse the ITEP project's evidence-first principles, not its application code.
- Treat the project as a four-week contest, civic-service experiment, public
  artifact, content engine, and credibility asset.
- Do not treat prize money as contracted revenue or inbound business leads as an
  assumed result.
- Keep Public Parish separate from Varholdt's commercial positioning while using
  it as an honest case study.
- Preserve the weekday 90-minute Varholdt sales block and existing first-dollar
  plan.

## Product and Audience

- The name is Public Parish.
- The public entry point is `https://publicparish.com`, which permanently
  redirects to the canonical Convex-served origin at
  `https://www.publicparish.com`. Keep the production `convex.site` origin
  working for hackathon access and operational fallback.
- The GitHub repository and Convex project use the `public-parish` slug. The
  owner authorized both external renames on August 27.
- It is a free, open-source, nonpartisan resident product.
- The main promise is broader than council meetings: tell residents what local
  government is about to change that may affect them.
- The main object is an issue timeline backed by granular decisions and official
  source records.
- The inbox is one delivery surface, not the entire application.
- Normal public access and anonymous chat do not require an account.

## Geography

- Launch coverage includes defined bodies in Lafayette Parish, Rapides Parish,
  and East Baton Rouge Parish.
- Alexandria and Pineville are not publicly labeled “beta.” Every supported
  region gets the same trust and resident-outcome standard.
- Source shapes can differ across regions.
- "Request coverage" records resident demand and an optional notification
  address. It does not start discovery or publish an unsupported place.
- The owner runs the shared coverage compiler against selected official roots.
  Compiler progress remains internal and can be shown in a controlled demo.
- Build Lafayette's vertical pipeline first, then add Rapides and East Baton
  Rouge through the same system while UI work proceeds.
- Do not claim all-Louisiana coverage during the hackathon.

## Sources and Extraction

- Start from a registry of official domains, bodies, seed URLs, source kinds,
  expected cadence, and health.
- Firecrawl is the dynamic discovery and retrieval engine.
- Use Firecrawl map, search, crawl, scrape, browser rendering or interaction,
  PDF/OCR parsing, and change tracking where each is useful.
- Use an autonomous discovery pass for initial onboarding, structural change,
  and repair. Routine runs use targeted scraping and change tracking.
- Add custom source adapters only after a repeated, documented failure against a
  specific portal.
- Test the backend pipeline against representative real sources before building
  a polished UI.
- Keep current and upcoming decisions primary, with approximately 12 months of
  history for useful context.

## Included Government Work

- Include councils and planning/zoning bodies at launch.
- Include contracts and spending when they appear in the supported proceedings.
- Defer school boards, courts, sheriffs, assessors, and independent districts.
- Extract all useful agenda and meeting records for search and completeness.
- Promote only substantive decisions.

## Decision and Issue Model

- Preserve atomic records for proposals, hearings, votes, contracts,
  appointments, and public actions.
- Connect records into an issue only when the evidence supports the
  relationship.
- Keep uncertain links separate.
- Slice 4 issue identity is the exact sorted set of atomic record keys. Adding
  or removing a record creates a new issue key instead of changing the existing
  issue. Keep that limitation internal until Slice 5 defines how public routes
  supersede or redirect an older overlapping issue.
- Track discovered, proposed, scheduled, amended, postponed, decided,
  implementing, completed, canceled, and unknown states.
- Record prior source versions and meaningful change history.

## Ranking

- All published decisions remain searchable.
- Promote decisions by likely consequence, not document completeness or
  popularity.
- OpenAI extracts cited consequence factors; deterministic code computes the
  rank.
- Factors are public money, public assets, land use, health and safety, rights
  and access, service delivery, and public deadlines.
- Each non-absent factor needs a cited consequence statement. Naming the topic
  alone does not earn points.
- The fixed maximum weights are 20 for public money, 20 for public assets, 15
  for land use, 15 for health and safety, and 10 each for rights and access,
  service delivery, and public deadlines.
- A deadline within seven days is a separate hard trigger. It does not add
  points beyond the cited deadline factor.
- Source completeness changes confidence, not importance.
- A consequential but sparsely documented item can rank above a complete but
  trivial item, with its uncertainty shown.

## Resident Setup

- Do not ask for a street address.
- Ask for parish or municipality and optional topics.
- Signed-in users may save multiple areas.
- The main feeds are “For You” and “Major local decisions.”

## Chat

- Allow anonymous, multi-turn chat. Do not impose a visible one-question limit.
- Preserve anonymous same-device continuity for 24 hours.
- Let chat answer about the current issue or the full validated Public Parish
  corpus.
- Use invisible rate limits first, then CAPTCHA or cooldown when abuse appears.
- Chat never requires sign-in.
- Chat can only use published and validated official-source evidence.
- When evidence is missing, say so and provide the relevant official source or
  contact. Never invent an answer.
- Keep routine conversations private.
- Do not aggregate or publish chat questions as FAQs during the hackathon.

## Accounts and Auth

- Use Convex Auth v2 alpha deliberately for the hackathon.
- Pin the exact `@convex-dev/auth@alpha` version in the lockfile.
- Google OAuth is the account sign-in method.
- Do not use Convex Auth v1.
- Do not build custom email account authentication or a magic-link system.
- Google accounts exist for saved interests and managed follows.
- A resident can instead verify an email-only AgentMail subscription without
  creating an account. That verification does not create an authenticated user
  session.
- Build anonymous product behavior before account-dependent behavior.
- Keep reading, search, and multi-turn chat outside the authentication gate.
- Consider a v2 passkey provider only if real testers reject Google sign-in.

## AI gateway and models

- Route OpenAI calls from Convex actions through Convex AI Gateway.
- The gateway is the primary path for the submitted application.
- Keep direct OpenAI access behind the same interface only as an operational
  fallback when the gateway is unavailable.
- Refer to models by role. `docs/architecture.md` holds the only
  role-to-model table.
- `MODEL_STRONG` is `openai/gpt-5.6-terra`. It runs record extraction,
  consequence factors, and issue-link proposals.
- `MODEL_FAST` is `openai/gpt-5.6-luna`. It runs discovery and document-type
  classification, ranking, independent publication review, and chat.
- Put the strong tier on generation and the fast tier on verification.
  Extraction originates every published claim and a reviewer cannot repair a bad
  one, while deterministic validation already owns citation integrity.
- The reviewer never runs on the extraction model. Independence is the entire
  point of the second pass.
- Use Chat Completions with strict JSON Schema in `response_format`.
- Run every stage that produces or clears a published claim at high reasoning.
  Discovery, ranking, and chat stay low.
- There is no third model tier. A stage that misses its gate at `MODEL_STRONG`
  is fixed with a better prompt, schema, or excerpt window, or it withholds.
- Benchmark every stage against the labeled source set. A stage moves down to
  `MODEL_FAST` only when the benchmark shows the fast tier holds. Downgrade is
  the only sanctioned direction of change.
- Set a Convex AI Gateway spending limit and record cost by function and stage.

## Review and Publication

- The founder should be out of the normal review loop.
- Use an independent OpenAI model call as the reviewer, on a different model
  than the extractor.
- A reviewer cannot repair missing citations or invent evidence.
- Run deterministic validation before and after the reviewer.
- On failure, publish a clearly limited, source-only card or withhold the item.
- Do not create a manual owner queue for normal processing.
- Do not build a dedicated correction challenge workflow.
- Provide a private AgentMail path for reporting a wrong fact, broken citation,
  or missed official source. A report never launches automated processing.
- The owner may rerun the normal evidence pipeline. Publish a normal revision
  only when the validated evidence changes the record.

## Alerts and Email

- Google accounts and verified email-only subscribers may follow issues, topics,
  bodies, and municipalities.
- AgentMail verifies email-only subscriptions with a short-lived code or
  confirmation reply. This is subscription verification, not account
  authentication.
- Send alerts only for material changes.
- Offer an optional weekly roundup containing only material updates to followed
  targets.
- AgentMail owns threaded email delivery and replies.
- An unsupported email answer states that the evidence was not found and points
  to an official contact.
- Do not automatically forward resident messages to government.

## Frontend and Hosting

- Use TanStack Start, not Next.js or plain React.
- Run it as a SPA with static prerendering because the selected public host is
  Convex static hosting at `convex.site`.
- Do not claim request-time SSR.
- Use thin route files, route-level `.data.ts` contracts, a domain-first Convex
  backend, centralized authorization, actions for external side effects, and a
  small HTTP router.
- Use the official Convex TanStack Query integration where it helps route data
  and standard Convex hooks where they are clearer for live or paginated UI.
- Prerender stable public routes.
- Serve per-issue Open Graph HTML through a small Convex HTTP route backed only
  by published issue data.
- Test direct issue links, share links, and route precedence on the real host.
- Use the local UI with the personal Convex development deployment for normal
  branch integration. The backend, database, actions, and file storage remain
  remote while Vite serves the frontend locally.
- Do not add staging during the hackathon. A reviewed merge to `main` triggers
  the production backend and frontend deployment, registry seed, and smoke test.
- Keep the development `convex.site` upload as an optional hosting check, not a
  required step for every pull request.
- Use preview deployments selectively for auth, webhook, routing, or schema
  work that needs isolation.
- Build the production frontend with the production Convex URL during the same
  promotion; never publish a stale local `dist/` artifact.

## Resident Interface

- [`resident-interface-plan.md`](./resident-interface-plan.md) is the approved
  Slice 5 page, interaction, state, and design-agent contract.
- Build the complete frontend now so later API integration does not reorganize
  pages. Use typed local fixtures for unfinished integrations.
- Fixture-backed success is development proof only. Production cannot present
  an action as working before its real backend path passes.
- Primary navigation is Home, For You, Explore, Ask, and Coverage.
- Keep the existing first-visit hero and place area selection inside it. Return
  visits use a compact area header.
- Use the issue as the main resident object. Call an atomic record a Decision
  record and call citation controls Source.
- Use "Why this may matter" for accepted consequence factors.
- The evidence gutter is the app's distinctive interaction. It connects a claim
  to the exact official excerpt in a mobile sheet or desktop panel.
- Route loading shows an immediate spinner in one fixed region through redirect
  chains. Action labels stay fixed while a spinner occupies a stable icon slot.
- Keep success feedback inline. Use pills for useful filters, topics,
  selections, and compact statuses.
- Divide design work into the eight assignments in the resident interface plan.
  Each assignment works from the complete app and one shared component registry.

## Trust and Privacy

- Store immutable source snapshots, URLs, content hashes, retrieval times,
  citations, and processing history.
- Every published fact resolves to an official source snapshot.
- Show last checked, source status, uncertainty, and source-backed revisions.
- Do not collect exact home addresses.
- Do not expose private chat, email content, or user records.
- Use a hashed user or anonymous-session identifier for OpenAI safety
  identifiers, never personal data.
- Store conversation state in Convex.

## Content and Adoption

- X and LinkedIn carry the technical hackathon story.
- TikTok and Facebook carry the resident and community story.
- Reuse recordings rather than operating four independent content channels.
- Keep content production near 90 minutes per week.
- Do not publish a checkpoint for the Phase 0 setup shell alone. Start with the
  first real Lafayette source snapshot after Slice 1.
- Publish extraction, citation, review, and change proof after Slice 3 or 4; the
  first resident-facing TikTok or Facebook demonstration follows the real public
  issue page in Slice 5.
- Publish the AgentMail outcome loop when it works, tester evidence near
  September 15 or 16, and the final launch after feature freeze.
- Recruit real users in Lafayette and the Alexandria/Pineville area, then expand
  through supported Baton Rouge communities.
- Do not count views or resident use as Varholdt buyer traction.

## Deferred Features

- maps;
- exact-address matching;
- public discussion;
- testimony generation;
- public-records request handling;
- procurement radar;
- full video transcription;
- a government verification desk;
- broad municipal configuration tooling;
- statewide public coverage;
- FAQ aggregation;
- a productized public corrections workflow;
- public-triggered coverage compilation and live public compiler progress;
- cross-device chat history.

## Administrative choices

These do not reopen the product plan:

- GitHub owner: `LaykenV`; public remote:
  `https://github.com/LaykenV/public-parish`;
- license: MIT;
- exact scaffold versions are pinned in `package.json` and recorded in
  `package-lock.json`; Convex is 1.45.0, static hosting is 0.2.1, and Convex
  Auth v2 is pinned to 2.0.0-alpha.1;
- both role model IDs resolved through the AI Gateway on August 27, 2026;
- the Convex team spending thresholds are $20 warning and $60 disable per
  month;
- the `CONVEXALLGAS` Firecrawl grant added 20,000 participant credits on
  August 27, 2026;
- benchmark the strong and fast stage assignment against a labeled source set;
- verify official September meeting schedules before relying on a live cycle.
