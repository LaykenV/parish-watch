# Slice 9 development certification

The release candidate is the combined stack of PRs 93 through 99. These PRs
remain open. Merging the stack would deploy the production backend and frontend.
Production activation and production delivery are separate release steps.

The personal development deployment is `woozy-wren-227`. Only one branch owns
it during certification. GitHub Actions runs type checks, tests, the frontend
build, and lint. Its verified frontend artifact is uploaded to development
without rebuilding it locally.

Certification is in progress. CI status alone does not establish that source
automation, provider delivery, or the resident loop works in development.
The evidence below will be filled with observed results before readiness is
reported.

| Requirement | Current proof |
| --- | --- |
| All seven PR heads pass CI and review | In progress |
| Approved-source automation and pause | In progress |
| Stable issue extension | In progress |
| Published history and corpus Ask | CI exercises 1,000 published records; development proof pending |
| Public coverage and verified launch notices | In progress |
| Server-rendered issue sharing | In progress |
| Private operations and outcome reporting | In progress |
| Combined development resident loop | In progress |

No production rollout or source activation has occurred in this work.
