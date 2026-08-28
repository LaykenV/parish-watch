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

## Pull requests

- One concern per PR. If the description needs "also", split it into another PR.
- Real PRs, never drafts.
- Titles: conventional prefix plus the user-facing why, never an inventory of
  files touched. Bodies: problem first, then the fix. No file changelog.
- Keep changes simple and concise. Ship the smallest change that makes the
  behavior obvious.
- Review feedback never grows a PR past its original goal. Verify every bot
  finding against source before changing code; dismiss false positives with a
  written reason and resolve the thread.
- PR-Agent runs `/describe` and `/review` on PR open, and `/review` on push
  (see `pr-agent.md`). The `file-pr` and `babysit-pr` skills carry the full
  procedure; these rules apply even when the skills do not fire.
- Merging to `main` deploys the production backend and frontend. The merge
  question must say that plainly. After an authorized merge, babysit the exact
  production workflow run and execute `npm run smoke:production` before calling
  the release ready.

## Unslop (always apply)

Apply these rules to every sentence you write: docs, PR titles and bodies,
commit messages, UI copy, chat replies. This section is standing law, not an
optional skill.

### Process

1. Scan for the patterns below.
2. Rewrite. Preserve meaning, match intended tone.
3. Add soul (see next section).
4. Self-audit: "What makes this obviously AI generated?" Fix remaining tells.

### Adding soul

Removing patterns is half the job. Sterile, voiceless writing is just as obvious.

- **Have opinions.** React to facts instead of neutrally listing pros and cons.
- **Vary rhythm.** Short sentences. Then longer ones that take their time. Mix it up.
- **Acknowledge complexity.** "Impressive but also kind of unsettling" beats "impressive."
- **Use "I" when it fits.** First person isn't unprofessional.
- **Let some mess in.** Perfect structure looks machine-made.
- **Be specific.** Not "this is concerning" but "there's something unsettling about agents churning away at 3am."

### Patterns to detect and fix

#### Content

1. **Puffery.** "pivotal moment", "testament to", "evolving landscape", "setting the stage for", "indelible mark", "deeply rooted". Cut puffery, state what happened.
2. **Name-dropping.** Listing media outlets without context. Pick one, say what was said.
3. **Superficial -ing phrases.** "highlighting...", "ensuring...", "reflecting...", "showcasing...", "fostering...". Delete or expand with real sources.
4. **Promotional language.** "nestled", "vibrant", "breathtaking", "groundbreaking", "renowned", "stunning", "must-visit". Use neutral descriptions.
5. **Vague attributions.** "Experts believe", "Industry reports suggest", "Some critics argue". Name the source or delete.
6. **Formulaic challenges.** "Despite challenges... continues to thrive." Replace with specific facts.

#### Language

7. **AI vocabulary.** Additionally, crucial, delve, enduring, enhance, fostering, garner, interplay, intricate, landscape (abstract), pivotal, showcase, tapestry (abstract), testament, underscore, vibrant. Replace with plain words.
8. **Fancy ways to say "is".** "serves as", "stands as", "boasts", "features". Just say "is" or "has".
9. **"Not just X, but Y."** State the point directly instead.
10. **Rule of three.** Forcing ideas into groups of three. Use the natural number.
11. **Synonym cycling.** Protagonist, main character, central figure, hero all in one paragraph. Pick one, repeat it.
12. **False ranges.** "from X to Y" where X and Y aren't on a meaningful scale. List topics directly.

#### Style

13. **Em dash overuse.** Avoid em dashes entirely. Use periods or commas only (no parentheses, no en dashes, no hyphen-as-dash substitutes). Em dashes are an AI tell, and reaching for parentheses instead just trades one tell for another. If a thought needs separation, end the sentence or use a comma.
14. **Colon overuse.** Colons are fine before a list or example. Not as mid-sentence connectors. "If you're coming from traditional automation: instead of registering event handlers, you describe conditions" adds nothing with the colon. Rewrite to let the point stand on its own without comparison framing. "Describing when the scheduler should fire works best as plain English." Same meaning, no crutch punctuation.
15. **Boldface overuse.** Don't bold every proper noun or acronym.
16. **Inline-header lists.** The tell is a bold label and colon that restates the line: "**Performance:** Performance improved...". Convert those to prose. A bold lead-in that ends in a period, names the item, and is followed by genuinely new detail ("**Schema in TypeScript.** Tables live in one file.") is fine, not a tell.
17. **Title case headings.** Use sentence case.
18. **Decorative emojis.** Remove from headings and bullets.
19. **Curly quotes.** Replace with straight quotes.

#### Communication artifacts

20. **Chatbot phrases.** "I hope this helps!", "Let me know if...", "Of course!", "Certainly!", "Found the smoking gun!" Remove.
21. **Cutoff disclaimers.** "While specific details are limited..." Find sources or remove.
22. **Sycophantic tone.** "Great question! You're absolutely right!" Respond directly.

#### Filler

23. **Filler phrases.** "In order to" becomes "To". "Due to the fact that" becomes "Because". "It is important to note that" gets deleted.
24. **Excessive hedging.** "could potentially possibly be argued that it might" becomes "may".
25. **Generic conclusions.** "The future looks bright." State specific plans or facts.

#### Jargon

26. **Abstract metaphor nouns.** Substrate, wedge, vector, locus, vantage, nexus, primitive (as noun), harness (as metaphor), surface (as in "API surface"), bedrock, scaffolding (as metaphor), modality, paradigm, gold-plating, ratchet (as metaphor), evacuate (for moving code), endgame, north star, flywheel. These read as technical but usually have a plainer concrete word. "Substrate" becomes "base". "Wedge in" becomes "add". "Vector" becomes "way" or "method". "Gold-plating" becomes "more than the job needs". "Ratchet" becomes the mechanism's real name or "a limit that only tightens". "Evacuate" becomes "move out". "Endgame" becomes "the last phase". Pick the concrete word.

#### Plain speech

27. **Say what it does, not how it feels.** "the database stays close at hand", "SQL you can read", "types that follow your schema" name a feeling. The fix names the mechanism or a number: "`.toSQL()` returns the exact string sent to the database", "a column rename fails the build". Ask what the sentence tells the reader to do or know, then write that. If you can't restate it as a concrete instruction, fact, or number, cut it. One more check: if the sentence could appear unchanged in another project's docs, it says nothing about this one. Cut it.
28. **Shorten or split dense sentences.** If the reader has to backtrack to parse a sentence, break it in two or drop clauses. One idea per sentence.
29. **Active voice.** Prefer it. Catch "is/are/was/were + past participle" and name the actor: "queries are validated" becomes "the compiler validates queries", "the file is parsed by the loader" becomes "the loader parses the file". Passive is fine only when the actor is unknown or genuinely doesn't matter.
30. **Cut adverbs, or use a stronger verb.** "runs quickly" becomes "is fast" or the number. "significantly improves" becomes the measured delta. An adverb propping up a weak verb means the verb is wrong.
31. **Prefer the plain word.** "utilize" becomes "use", "leverage" becomes "use", "facilitate" becomes "help", "numerous" becomes "many", "in the event that" becomes "if". The fancier synonym is rarely clearer.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
