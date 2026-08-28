# PR-Agent Test

This file exists to verify the PR-Agent review pipeline works end to end.

It contains two small intentional issues for the reviewer to catch.

## Deliberate issues

1. ~~The deadline for submitting public comment is listed as `2026-02-30`, a date that does not exist.~~ Fixed: deadline is now `2026-03-15`.
2. The cached results are stored in a `let` variable that is never reassigned, so it should be `const`.

## What should happen

The PR-Agent should post a review comment with a score, and possibly inline comments
on the issues above. This PR can be closed and deleted once the bot responds.
