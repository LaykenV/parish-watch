# Hackathon Requirements and Win Plan

Official event:
[Convex All Gas Hackathon](https://www.convex.dev/hackathons/all-gas)

This document translates the event rules and judging criteria into Public Parish
acceptance criteria. Re-check the official page before submission in case the
organizers change a detail.

## Verified Event Facts

- Kickoff: August 25, 2026
- Submission deadline: September 22, 2026 at 12:00 PM Pacific
- Winners announced: September 25, 2026
- The app must have started on or after August 25 at 12:00 PM Pacific.
- It must be a new full-stack app with Convex as the backend.
- Firecrawl must feed application data.
- AgentMail must provide an inbox.
- The project must use Codex or another agent with the Convex plugin.
- The repository must be public.
- A root `hackathon.md` build log is required.
- The live app must be publicly accessible at a `convex.site` or
  `chatgpt.site` URL without an invite.
- Submission includes the public repo, live URL, and a video through
  [vibeapps.dev](https://vibeapps.dev/).
- The demo must be under three minutes.
- Builders should share on X or LinkedIn and tag `@convex`, `@OpenAI`,
  `@firecrawl`, and `@agentmail`.

The event page lists $10,000, $5,000, and $1,500 cash prizes, with additional
provider benefits. Contest results are uncertain. The build is justified by the
combined value of a useful public product, skill, distribution, credibility, and
prize probability.

## Custom domain and qualifying URL

The official event page was re-checked on August 27. It requires a public
`convex.site` or `chatgpt.site` URL that judges or an agent can open without an
invitation, and its submission checklist asks for a live URL on one of those
hosts. It does not state that an app cannot also use a custom domain.

Public Parish does not depend on that omission. Submit
`https://befitting-flamingo-587.convex.site` as the live app URL and keep it
functional through judging. It is the qualifying host and serves the production
application through Convex static hosting.

`https://publicparish.com` is a resident-facing entry point. Vercel handles only
its permanent redirect to `https://www.publicparish.com`; it does not host the
application frontend. Convex serves both the `www` custom domain and the
required `convex.site` origin from the same production HTTP router and static
release. The custom domain therefore supplements the required host instead of
replacing it.

## Setup and registration status

The official setup prompt was followed on August 26:

- read the Convex agent setup instructions;
- identified this environment as Codex with shell and project-local skill
  support;
- selected Convex static hosting after the user chose `convex.site`;
- added the `get-convex/convex-codex-plugin` marketplace;
- installed and enabled `convex@convex-codex-plugin` version 1.10.0;
- initialized this fresh Git repository;
- installed the official project-local hackathon logging skill files;
- did not install Convex project AI files because the repository is not yet a
  scaffolded Convex project.

The user completed Luma registration. Confirm that the Firecrawl account has
received the listed participant credits before broad crawling.

The selected optional Convex resources are:

- Convex AI Gateway as the primary OpenAI route;
- `openai/gpt-5.6-terra` for record extraction, consequence factors, and issue
  linking;
- `openai/gpt-5.6-luna` for discovery classification, ranking, independent
  publication review, and chat;
- pinned Convex Auth v2 alpha with Google OAuth;
- AgentMail verification for email-only alert subscriptions.

Phase 0 was completed on August 27:

- the Convex plugin is visible and enabled;
- the Firecrawl `CONVEXALLGAS` code added the advertised 20,000 participant
  credits;
- TanStack Start is configured in SPA/static-prerender mode;
- a Convex cloud development deployment exists and the static-hosting component
  is registered;
- the Phase 0 shell passed a hosted development smoke, then the matching backend
  and frontend were promoted to `https://befitting-flamingo-587.convex.site`;
- the product was renamed to Public Parish; `https://www.publicparish.com` was
  attached directly to the production HTTP router, and the bare domain was
  configured as a path-preserving redirect; the required `convex.site` URL
  remains public and functional;
- `npx convex ai-files install` completed and the generated guidelines were
  read;
- Convex Auth v2 is pinned to `2.0.0-alpha.1` but not configured;
- every direct dependency is pinned to its resolved version, and production
  builds fail if `VITE_CONVEX_URL` is missing;
- generated agent guidance remains local and can be recreated with
  `npx convex ai-files install` instead of adding duplicate generated copies to
  the public repository;
- the live AI Gateway model list contains `openai/gpt-5.6-terra` and
  `openai/gpt-5.6-luna`;
- the team spending limits are a $20 warning threshold and $60 disable threshold
  per month;
- the public `LaykenV/public-parish` GitHub repository and matching `origin`
  remote exist, with the initial source commit published on `main`;
- the MIT license is present;
- `npm ci`, typechecking, three tests, the production build, lint, cloud Convex
  pushes, and local, hosted-development, and production readiness queries all
  pass;
- the public root, production-bound asset, direct not-found route, and desktop
  and mobile layouts were tested signed out.

The public landing page and evidence backend through Slice 3 are live in
production.
Slice 1 was proven on the personal development deployment with the official
Lafayette council hub, an agenda PDF, and its minutes PDF. Slice 2 made real
`MODEL_STRONG` extraction calls through Convex AI Gateway and produced a private,
deterministically validated agenda candidate. PR #6 merged the reviewed Slice 2
backend as `74ce97e`; production workflow `33222925340` deployed it and passed
smoke. The real Terra extraction and replay ran in development, not production.
Slice 3 then ran a real independent Luna review in development. Luna rejected
two secondary fields, and the deterministic policy produced one limited
source-only version with three core citations. Replay made no second model call
or version. PR #12 merged as `8df651c`; production workflow `33261235916`
deployed the hardened Slice 3 backend and frontend, applied the registry seed,
and passed smoke. No production extraction or model review was run. The resident
evidence interface and vibeapps.dev submission remain pending. No AgentMail
integration or authentication flow exists yet.

During the hackathon, branches use the local Vite frontend with the personal
Convex development deployment. There is no staging deployment. Pull requests
run the full verification command. A reviewed merge to `main` is the production
approval and deploys the matching Convex backend and static frontend, applies
the idempotent registry seed, and runs the production smoke. The development
`convex.site` upload remains available for changes that need a hosted check.

## Judging Map

### Everyday App

Judge question: can a normal person use this this week?

Public Parish proof:

- no account needed to browse or ask questions;
- choose a parish or municipality, not a technical data source;
- discover one current decision;
- understand it in plain language;
- inspect official receipts;
- follow it and receive the outcome.

Failure mode: a developer-facing crawler dashboard or a generic AI digest.

### Creativity and Usefulness

Judge question: is this a real product, and does it solve a recognizable problem?

Public Parish proof:

- connects fragmented official sources into issue timelines;
- makes public deadlines and later outcomes visible;
- combines search, anonymous chat, change tracking, and alerts;
- works on real Louisiana portal diversity;
- exposes uncertainty, source revisions, and a private problem-reporting path.

Failure mode: summarizing a PDF without a continuing resident workflow.

### Convex Depth

Judge question: does Convex do meaningful application work?

Public Parish proof:

- normalized schema and indexes;
- queries, mutations, internal functions, and actions;
- realtime issue and coverage updates;
- idempotent staged processing;
- schedules or crons for expected records;
- Convex Auth v2 alpha Google OAuth and user-owned follows;
- Convex AI Gateway calls attributed by project and function;
- file storage for evidence artifacts;
- registered Firecrawl, AgentMail, and static-hosting components;
- HTTP actions for provider callbacks, share routes, and health routes.

Failure mode: using Convex as a thin key-value store behind a mostly external
demo.

### Sponsor Integration

Judge question: do OpenAI, Firecrawl, and AgentMail do necessary work?

Public Parish proof:

- Firecrawl discovers, retrieves, parses, and versions difficult official
  sources;
- OpenAI through Convex AI Gateway performs strict Terra extraction,
  consequence-factor extraction, issue-link proposals, independent Luna review,
  and evidence-grounded answers;
- AgentMail sends and receives persistent issue threads and material-change
  alerts;
- all state and the visible realtime result live in Convex.

Failure mode: a sponsor API call that can be removed without changing the
resident outcome.

### Live App

Judge question: can judges and agents open and use it?

Public Parish proof:

- public `convex.site` URL;
- no invitation;
- useful signed-out path;
- demo data is real current public evidence;
- direct dynamic routes and official source links work.

### Social Proof

Judge question: did anyone care enough to use or engage with it?

Public Parish proof:

- real resident sessions;
- follows and substantive questions;
- return visits or alert opens;
- public technical build posts with sponsor tags;
- resident-facing posts and local distribution.

Do not substitute impressions for completed product actions.

### Demo

Judge question: does the video prove the product quickly?

Public Parish proof:

- under three minutes;
- little narration;
- real clicks;
- visible source citations;
- a live Convex update;
- a real AgentMail alert;
- a glimpse of dynamic coverage across different portals.

## Demo Storyboard

Target length: 2 minutes 45 seconds

### 0:00 to 0:15: The Resident Problem

Open Public Parish signed out. Select Lafayette and a topic. State one sentence:
local decisions are public, but spread across packets, portals, and updates.

### 0:15 to 0:45: Find What Matters

Show “For You” and “Major local decisions.” Open one real, current consequential
issue. Point to “Why this matters,” the next date, and remaining public action.

### 0:45 to 1:15: Inspect the Receipts

Move through the issue timeline. Open one citation to the exact official PDF page
or excerpt. Show last checked, source version, and a visible uncertainty or
limited state if appropriate.

### 1:15 to 1:40: Ask Without an Account

Ask a substantive anonymous follow-up. Show a multi-turn answer with citations.
Ask something the evidence does not contain if time permits and show the honest
not-found path.

### 1:40 to 2:10: Follow the Change

Sign in or use a prepared signed-in state, follow the issue, and run a clearly
identified current source update or deterministic replay. Show the issue change
live without refresh.

### 2:10 to 2:30: Receive the Outcome

Open the AgentMail message with the material change and source. Reply with a
question and show the persistent thread.

### 2:30 to 2:45: Prove the Platform

Show the coverage page with Lafayette, Rapides, and East Baton Rouge source
shapes. Briefly show one controlled internal compiler run that produced a source
registry. End on the resident promise, not a roadmap.

## User Proof Plan

Recruit before the app feels finished.

### First Five

- three Lafayette-area residents;
- two Alexandria/Pineville-area residents.

Ask each to:

1. select their location;
2. find a decision they recognize or care about;
3. inspect an official source;
4. ask a real question;
5. follow the issue if useful;
6. describe what they expected next.

### Submission Targets

- 25 real residents;
- 10 follows;
- 10 substantive questions;
- several return visits or alert opens;
- one issue followed through a later official outcome;
- zero unsupported published claims.

Capture aggregate event counts and anonymized quotes only with permission.
Never expose private chat, email addresses, or resident identities in the demo.

## Social Plan

### X and LinkedIn

Post evidence of:

- the first immutable Lafayette snapshot after Slice 1;
- dynamic official-source discovery;
- an immutable source revision;
- strict extraction and independent review;
- a live Convex update;
- AgentMail thread behavior;
- the final public app and demo.

Tag all sponsors as required. Explain the resident outcome before technical
detail. Do not spend a checkpoint on the setup shell alone.

### TikTok and Facebook

Post:

- why residents miss local decisions;
- one real source-backed issue;
- how Public Parish shows the deadline and receipts;
- what changed after a meeting;
- an invitation to test the free tool through the issue's share URL.

Start resident-facing posts only after the thin resident proof exposes a real
public issue page. Reuse the technical recording with a resident-first edit.

Be transparent that the builder created it. Follow local group rules. Do not
frame the product as supporting or opposing CCS, a data center, SpaceX, or any
other contested project.

## Evidence to Save

- screenshots or recordings of live source changes;
- source URLs and hashes used in the demo;
- aggregate users, questions, follows, and return actions;
- email delivery proof with personal details hidden;
- public social links and visible engagement;
- passing test output near feature freeze;
- public repo and deployment timestamps;
- provider integration configuration that contains no secrets.

## Submission Checklist

### Eligibility

- [x] Event registration completed
- [x] Fresh local repository created after the eligible start time
- [x] Convex project scaffolded
- [x] Convex plugin visible after session restart
- [x] Convex AI files installed after project scaffolding

### Product

- [x] Convex is the application backend
- [x] Firecrawl feeds real official data
- [x] Convex AI Gateway calls OpenAI from actions
- [x] `openai/gpt-5.6-terra` does meaningful structured extraction work
- [x] `openai/gpt-5.6-luna` independently reviews publication candidates
- [ ] Convex Auth v2 alpha Google OAuth works
- [ ] AgentMail verifies an email-only subscription
- [ ] AgentMail inbox and outbound alert both work
- [ ] Signed-out resident path works
- [ ] Three named launch regions pass or public claims are narrowed honestly
- [ ] One issue reaches a later change or outcome
- [ ] Citations, revisions, uncertainty, and coverage health work

### Public Artifacts

- [x] Public GitHub repository contains the initial source commit
- [x] Root `hackathon.md` exists
- [x] Root `hackathon.md` current and free of secrets or personal data
- [x] Public `convex.site` app
- [x] App opens without invitation
- [x] Direct links and mobile path tested signed out
- [x] Open-source license added

### Proof

- [ ] Real resident actions collected
- [ ] X or LinkedIn post published
- [ ] `@convex` tagged
- [ ] `@OpenAI` tagged
- [ ] `@firecrawl` tagged
- [ ] `@agentmail` tagged
- [ ] Under-three-minute video recorded
- [ ] Video shows real product interaction
- [ ] Private data removed from video

### Submission

- [x] Public repo URL verified
- [ ] Live app URL verified
- [ ] Video URL verified
- [ ] vibeapps.dev entry completed
- [ ] Submitted before September 22 at 12:00 PM Pacific

## Risk Register

| Risk                                 | Early signal                                          | Response                                                                       |
| ------------------------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| Dynamic discovery misses a portal    | gold set has missing artifacts                        | add the smallest adapter after documenting the failure                         |
| Statewide ambition dilutes quality   | named body cannot pass the gate                       | narrow public coverage, keep shared compiler                                   |
| AI publishes unsupported facts       | citation or labeled-set failure                       | withhold, strengthen validation, move stage to benchmark winner                |
| Product feels like a council digest  | users browse but do not ask or follow                 | center issue consequence, action, change, and outcome                          |
| Chat consumes time and money         | high tokens without useful answers                    | smaller retrieval sets, budgets, cached evidence, stronger abstention          |
| AI Gateway is unavailable            | service token returns a disabled or unavailable error | confirm paid-team access early and keep a tested direct OpenAI fallback        |
| Static hosting breaks dynamic routes | direct refresh or webhook fails                       | fix root route ownership early, before UI polish                               |
| Auth v2 alpha changes                | package or API changes break Google login             | pin the exact version, isolate auth code, and keep the anonymous path complete |
| Content replaces building            | posts increase while exits fail                       | cap content time and publish only shipped proof                                |
| Hackathon replaces sales             | weekday sales block is skipped                        | cut hackathon scope that day                                                   |
| Demo depends on meeting timing       | no useful source change                               | replay real source versions and label the replay                               |

## Final Standard

No plan can promise a win. Public Parish earns a credible first-place attempt by
being more than large: it must be coherent, live, trusted, useful this week, and
easy to prove in under three minutes.
