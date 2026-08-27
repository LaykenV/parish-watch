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

Phase 0 setup is complete. The repository has a TanStack Start SPA shell,
separate Convex development and production deployments, one realtime readiness
query, Convex static hosting, tests, and a reproducible local setup path. The
public setup shell is live; the evidence pipeline has not started.

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

Useful commands:

```bash
npm run dev:web
npm run dev:convex
npm run typecheck
npm run test
npm run build
npm run lint
npm run hosting:smoke:dev
```

`npm run hosting:smoke:dev` builds with the development deployment URL and
uploads the result to that deployment's `convex.site` host. Production builds
fail when `VITE_CONVEX_URL` is missing. `npm run deploy` lets the static-hosting
CLI build with the production URL, deploy the Convex backend, and upload the
matching frontend. Production promotion requires explicit owner approval.

The bare-domain redirect is isolated in
[`infra/apex-redirect`](infra/apex-redirect/README.md). It preserves paths and
query strings but never hosts the application frontend. The hackathon submission
URL remains the public `convex.site` host; the custom domain is an additional
resident-facing entry point.

Development is the normal integration environment. Promote a completed slice
to production only after its tests and hosted development smoke pass. Use a
preview deployment for auth, webhook, routing, or schema work that needs an
isolated hosted check.

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
- Convex AI Gateway for OpenAI Chat Completions with strict structured outputs
- `openai/gpt-5.6-terra` for record extraction, consequence factors, and issue
  linking; `openai/gpt-5.6-luna` for discovery classification, ranking,
  independent review, and chat
- Convex Auth v2 alpha with Google OAuth
- AgentMail for verified email subscriptions, inbound threads, and
  material-change alerts

Direct dependencies and the lockfile use exact versions. Convex Auth v2 is
pinned to `2.0.0-alpha.1`; auth is not implemented yet. The planned model split
must still pass the labeled-set benchmark before publication code relies on it.

## License

MIT. See [LICENSE](LICENSE).
