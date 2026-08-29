# Public Parish

Public Parish is a free, open-source, nonpartisan application that will help
Louisiana residents see consequential local-government decisions, inspect the
official evidence, ask questions, follow an issue, and learn what happened after
the vote.

This repository was created for the
[Convex All Gas Hackathon](https://www.convex.dev/hackathons/all-gas). It is a
fresh application. The existing Lafayette ITEP project contributes evidence and
revision principles, not code or a submission base.

## Current state

Phase 0 and evidence-engine Slices 1 through 3 are complete and deployed. The
repository has a TanStack Start SPA, separate Convex development and production
deployments, a realtime readiness query, Convex static hosting, Firecrawl
discovery and retrieval, immutable source snapshots, and a private durable
workflow that extracts, validates, independently reviews, and creates immutable
full, limited, or withheld publication versions for cited atomic decisions. The
real Terra extraction, Luna review, and idempotent replay proofs ran in the
personal development deployment. Slice 3 deployed through PR #12 as `8df651c`
and passed production smoke. No production extraction or model review was run.
The resident evidence interface remains unbuilt.

- Public production app: https://publicparish.com (redirects to the canonical
  Convex-served origin at https://www.publicparish.com)
- Required hackathon host: https://befitting-flamingo-587.convex.site
- Hosted development smoke: https://woozy-wren-227.convex.site

## Local setup

Requirements:

- Node.js 22
- npm 11
- a Convex account with access to the `public-parish` project

From a fresh clone:

```bash
npm ci
npx convex ai-files install
npx convex dev --once
npm run verify
npm run dev
```

Open `http://localhost:3000`. The page should report `Convex connected`.
`npx convex dev --once` creates the ignored `.env.local` file. Copy
`.env.example` only when documenting variable names. Never commit real values.

The frontend runs on the laptop. The backend does not. `npm run dev` runs Vite
locally and keeps the personal Convex development deployment synchronized with
the current branch. The local UI, development database, actions, and file
storage all use that remote development deployment. It is one shared personal
development deployment, not one deployment per branch. After switching
branches, run `npm run dev` so the remote backend matches the checked-out code.

Useful commands:

```bash
npm run dev:web
npm run dev:convex
npm run typecheck
npm run test
npm run build
npm run lint
npm run hosting:smoke:dev
npm run smoke:production
```

`npm run hosting:smoke:dev` builds with the development deployment URL and
uploads the result to that deployment's `convex.site` host. Use it only when a
change needs the real static host. Production builds fail when
`VITE_CONVEX_URL` is missing.

Pull requests run `npm run verify`. Merging a reviewed PR to `main` is the
production approval for this hackathon and triggers the `Deploy production`
workflow. It verifies the merge commit, runs `npm run deploy` to publish the
matching backend and frontend, applies the idempotent source-registry seed, and
runs `npm run smoke:production`. The smoke checks the direct `convex.site`, the
canonical custom domain, the apex redirect, and the production readiness query.

The bare-domain redirect is isolated in
[`infra/apex-redirect`](infra/apex-redirect/README.md). It preserves paths and
query strings but never hosts the application frontend. The hackathon submission
URL remains the public `convex.site` host; the custom domain is an additional
resident-facing entry point.

There is no staging environment during the hackathon. Test branches with the
local UI and personal development backend. Use a preview deployment only when
auth, webhook, routing, or schema work genuinely needs isolation.

## Canonical documents

- [Product and operating plan](PLAN.md)
- [Grilling decision record](docs/decisions.md)
- [Resident product specification](docs/product-spec.md)
- [Technical architecture](docs/architecture.md)
- [Initial official-source registry](docs/sources.md)
- [Four-week build plan](docs/build-plan.md)
- [Hackathon requirements and win plan](docs/hackathon.md)
- [Public build log](hackathon.md)

## Implemented setup and intended stack

- TanStack Start in SPA/static-prerender mode
- Convex backend and realtime queries, with static hosting registered
- Firecrawl for official-source discovery, retrieval, PDFs, and change detection
- `@convex-dev/workflow` for the private prepare, extract, validate, and complete
  pipeline
- Convex AI Gateway for OpenAI Chat Completions with strict structured outputs
- `openai/gpt-5.6-terra` for record extraction, consequence factors, and issue
  linking; `openai/gpt-5.6-luna` for discovery classification, ranking,
  independent review, and chat
- Convex Auth v2 alpha with Google OAuth
- AgentMail for verified email subscriptions, inbound threads, and
  material-change alerts

Direct dependencies and the lockfile use exact versions. Convex Auth v2 is
pinned to `2.0.0-alpha.1`; auth is not implemented yet. Terra extraction has
passed one real agenda case and its adversarial contract suite. Luna review and
the broader labeled-set benchmark remain Slice 3 work before publication code
can rely on the two-model split.

## License

MIT. See [LICENSE](LICENSE).
