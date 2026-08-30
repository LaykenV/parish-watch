# PR-Agent setup

How this repo got an automated PR reviewer that costs a fraction of a cent per review,
with no third-party SaaS touching the code.

## What runs

[PR-Agent](https://github.com/The-PR-Agent/pr-agent) reviews every pull request here.
It is the original open-source reviewer (Apache 2.0, ~12.7k stars), community-maintained
after Qodo split off its commercial product. That split matters: the Action runs from the
open repo and calls the model we choose, so PR diffs go to OpenRouter and nowhere else.
No Qodo account, no hosted app, no invitation-only tier.

The model is `openrouter/z-ai/glm-5.3-flash`, routed through LiteLLM's `openrouter/`
prefix. At setup time OpenRouter listed it at $0.075 per million input tokens and $0.25
per million output tokens, with a 1,310,720-token context window.

Two files make it work:

- `.pr_agent.toml` sits in the repo root. PR-Agent reads it at runtime for model choice,
  token limits, and which tools run on which events.
- `.github/workflows/pr-agent.yml` triggers on `pull_request` and `issue_comment`
  events and runs `the-pr-agent/pr-agent@v0.43.0`, pinned to a release tag.

One secret is required: `OPENROUTER_API_KEY` (Settings → Secrets and variables →
Actions). `GITHUB_TOKEN` is provided automatically. The workflow passes it to PR-Agent
as `OPENROUTER__KEY`, because PR-Agent maps double underscores to config sections.

## Config choices worth explaining

Two settings raise the review ceiling to one million tokens. They do different jobs.
`custom_model_max_tokens = 1000000` tells PR-Agent how much context GLM supports because
the model is not in PR-Agent's built-in token table. `max_model_tokens = 1000000`
replaces PR-Agent's separate 32,000-token quality cap. Without the second setting,
PR-Agent prunes larger diffs even though the model can accept them. One million leaves
room inside the model's 1.31M-token context window for the response.

`persistent_inline_comments = true` (a v0.40 feature) stops the same finding from being
posted again on every push. `persistent_comment = true` keeps the score-and-summary as a
single comment that gets rewritten instead of a thread of stale reviews. Together they
make the fix-push-recheck loop usable: the review reflects the latest commit, and you
never scroll a changelog of dead scores.

`restricted_mode = true` lets the workflow run with `contents: read`. Without it,
PR-Agent's examples ask for `contents: write`, which a review bot does not need.

The `[openrouter] provider_only = ["z-ai"]` line is commented out. It would pin routing
to Z.ai's infrastructure. The default routing works, so it stays off until there is a
reason to turn it on.

## Event flow

The behavior comes from both files and one non-obvious fact about the runner.

| Event                                           | What runs                                                     |
| ----------------------------------------------- | ------------------------------------------------------------- |
| PR opened, reopened, or marked ready            | `/describe` and `/review`, one LLM call each                  |
| Push to an open PR                              | `/review` only, via `handle_push_trigger` and `push_commands` |
| Comment `/review`, `/describe`, or `/ask "..."` | That tool, on demand                                          |

The non-obvious part: the original setup guide suggested putting `synchronize` in both
`pr_actions` and the workflow trigger types while also setting `handle_push_trigger =
true`. That looks like a double-run waiting to happen. Reading
`pr_agent/servers/github_action_runner.py` settled it. The runner handles `synchronize`
before it checks `pr_actions`, runs the push commands, and returns. The `synchronize`
entry in `pr_actions` is inert. Nothing runs twice.

Two guards matter. The job's `if: github.event.sender.type != 'Bot'` condition stops
the agent's own comments from retriggering it, which would otherwise loop forever on
`issue_comment`. The `concurrency` group cancels a stale run when you push again before
the previous review finishes.

A bonus from v0.39: PR-Agent feeds the repo's `AGENTS.md` to the reviewer by default,
so this project's conventions reach the model without any extra wiring.

## Verification

A throwaway PR (`#1`) with a markdown file containing two planted issues put the
pipeline through its paces:

- First run: the bot posted a description and a review with a score of 85. It caught the
  planted impossible date (`2026-02-30`) and correctly refused to treat the second
  planted issue as real, since the referenced `let` variable existed only in the prose.
  End-to-end runtime was 2 minutes 25 seconds.
- A fix commit went up without any manual trigger. The workflow re-ran `/review`,
  edited the existing review comment in place, raised the score to 92, and dropped the
  resolved finding. No duplicate inline comments.
- The action logs confirmed every call was served by
  `openrouter/z-ai/glm-5.3-flash`.
- Three LLM calls total, less than half a cent on the OpenRouter dashboard.
- Later production reviews exposed PR-Agent's separate 32,000-token cap. Diffs with
  41,590, 43,233, and 63,145 tokens all logged `pruning diff` even though
  `custom_model_max_tokens` was already one million. Setting `max_model_tokens` to one
  million moved those diff sizes below the pruning threshold.
- Full-context runtime grows with the diff. PR #24's large resident-interface
  review took 7 minutes 8 seconds and completed normally. Babysitting should set
  a six-to-nine-minute expectation for large PRs instead of applying the
  throwaway PR's 2-minute-25-second timing to every review.

## Notes for future changes

- Both files must be on the default branch before the bot activates on new PRs.
- If a review appears to omit files, inspect the Action log for `total tokens over
limit` and `pruning diff`. The model-capacity setting and PR-Agent's own cap are
  independent.
- Each push leaves a one-line "Persistent review updated" stub comment under the
  main review. The summary itself never duplicates, but stubs do accumulate on
  busy PRs.
- The `fallback_models` entry repeats the primary model, which acts as a retry. A real
  fallback (for example `openrouter/z-ai/glm-5.3`) is a one-line change if Flash is ever
  unavailable.
- To upgrade, bump the tag in the workflow file. Check the
  [releases page](https://github.com/The-PR-Agent/pr-agent/releases) for breaking
  changes first.

## The agent loop around the bot

Two local skills (in `.agents/skills/`, mirrored into `.claude/skills/`) turn
the bot into Theo's T3-style PR flow. The human prompt collapses to
"diagnose and fix, file and babysit".

- `file-pr` runs the pre-flight (clean tree, existing-PR check,
  `git diff --check`, diff read), writes the title and problem-first body, and
  opens a real PR. It leaves tests, typechecks, builds, and lint to GitHub
  Actions so parallel local reviewers do not compete for the developer's CPU.
  The body survives `/describe` because PR-Agent keeps user content above its
  generated section (`add_original_user_description`, default true) and only
  rewrites the title when `generate_ai_title` is on (default false). Editing the
  body while the bot runs can race and lose text, so the skill files the final
  body in one `gh pr create` call.
- `babysit-pr` polls checks, review threads, and labels newer than the last
  push, verifies every bot finding against source, fixes real ones, dismisses
  false positives with a written reason and a resolved thread, and repeats
  until the review is clean on the latest commit. At the start of every thread,
  it tells the user that small reviews often take two to three minutes and large
  full-context reviews normally take six to nine. It reports active wait status
  at least once a minute. It then asks "All passing.
  Merging deploys production, then I will smoke-test it. Good to merge?"
  through the harness's interactive question tool. A plain chat question works
  where none exists. On a clear yes, it squash-merges, deletes the branch,
  returns to `main`, watches the `Deploy production` workflow for the exact
  merge commit, and runs `npm run smoke:production` independently. Anything
  short of a clear yes merges nothing.

The PR-shape rules (one concern, no drafts, no scope growth) also live in
`AGENTS.md` as standing law, which PR-Agent feeds to the reviewer on every
pass (a v0.39+ default).
