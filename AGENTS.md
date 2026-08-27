# Public Parish Agent Instructions

Read `PLAN.md`, `docs/decisions.md`, `docs/product-spec.md`,
`docs/architecture.md`, `docs/sources.md`, `docs/build-plan.md`, and
`docs/hackathon.md` before changing product behavior or scope.

## Product Contract

- Public Parish is a free, open-source, nonpartisan Louisiana civic application.
- It helps residents discover consequential local-government decisions, inspect
  the official evidence, ask source-grounded questions, follow an issue, and
  learn what happened.
- The launch coverage is Lafayette Parish, Rapides Parish, and East Baton Rouge
  Parish as defined in `docs/sources.md`. Do not label a place supported until it
  passes the same publication and coverage gates.
- Preserve atomic government decisions and source snapshots. Issue timelines are
  a view over those records, not a replacement for them.
- Every published factual claim must resolve to an immutable source snapshot and
  a precise citation. Missing evidence produces a limited card or no publication,
  never a guess.
- The product does not take sides on a decision. Explain consequence, process,
  evidence, deadlines, and public actions without advocacy framing.

## Implementation Contract

- Build the evidence pipeline before the polished interface.
- Use TanStack Start in SPA/static-prerender mode, Convex for the backend and
  realtime state, and Convex static hosting at `convex.site`.
- Keep route files thin, put route-level data contracts in `.data.ts` modules,
  and organize Convex functions by domain.
- Put external side effects in Convex actions. Keep HTTP routing small and
  explicit.
- Firecrawl performs discovery, retrieval, rendering, PDF/OCR extraction, and
  change detection. Add a source-specific adapter only after a repeated,
  documented failure.
- OpenAI calls run from Convex actions through Convex AI Gateway. Refer to
  models by role and keep the only role-to-model table in
  `docs/architecture.md`. `MODEL_STRONG` (`openai/gpt-5.6-terra`) runs record
  extraction, consequence factors, and issue linking. `MODEL_FAST`
  (`openai/gpt-5.6-luna`) runs discovery classification, ranking, independent
  review, and chat. The reviewer never runs on the extraction model. Send strict
  JSON Schema through the Chat Completions `response_format` field.
  Deterministic validation runs after extraction and review.
- Keep direct OpenAI access behind the same provider interface as a documented
  fallback if AI Gateway is unavailable. The submitted app should use AI
  Gateway when the paid Convex team supports it.
- Chat can only answer from published, validated Public Parish evidence.
- Use the pinned Convex Auth v2 alpha for Google account sign-in. Do not add
  Convex Auth v1 or custom email authentication.
- Accounts are optional for reading and chat. Google sign-in exists for saved
  areas and managed follows. AgentMail can verify a
  separate email-only alert subscription without creating an account.
- Never expose secrets, private messages, user records, exact home addresses, or
  raw application data in public docs or logs.

## Scope Control

Do not add maps, public discussion, testimony generation, public-records request
automation, a procurement product, video transcription, or a government staff
portal before the core resident loop is complete, reliable, and used.

The hackathon build also excludes FAQ aggregation, a dedicated public
corrections workflow, public-triggered coverage compilation, live public
compiler progress, and cross-device chat history. Keep a simple source-problem
reporting path, a public coverage-request form that records demand, and an
owner-triggered internal coverage compiler. Weekly roundup emails and per-issue
share HTML remain in scope after the core resident loop works.

Protect the founder's weekday 90-minute Varholdt sales block. Hackathon work does
not replace the first-dollar plan.

## Hackathon Discipline

- Keep the root `hackathon.md` evidence-based and current. Invoke the local
  `convex-hackathon-skill` after meaningful work sessions.
- Do not claim a component, model, feature, deployment, or user result until
  repository or runtime evidence proves it.
- Keep the public app usable without an invitation.
- Test the direct public URL, source links, live updates, email path, and
  under-three-minute demo before submission.
- Never commit, push, deploy, publish, or submit unless the user asks for that
  action.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
