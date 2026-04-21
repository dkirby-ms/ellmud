# Decision: PR-Based Promotion to Protected Branches

**Author:** Khelben (CI/CD Dev)
**Date:** 2026-07
**Status:** Implemented

## Context

The `squad-promote.yml` workflow used `git push --force` to update the prod branch. This violated branch protection rules that:
- Prohibit force pushes
- Require changes via pull request

## Decision

All promotions to branch-protected targets (prod) now use the PR flow:
1. Create a temporary branch (`promote/uat-to-prod-{timestamp}`)
2. Strip forbidden paths on that branch
3. Open a PR from temp branch → prod
4. Enable auto-merge (`gh pr merge --auto --merge --delete-branch`)
5. ci-cd.yml auto-triggers on the merge push (no explicit dispatch needed)

## Consequences

- **Pro:** Respects branch protection, creates audit trail via PR history
- **Pro:** No duplicate CI/CD runs (removed manual `gh workflow run` dispatch)
- **Pro:** Auto-cleanup of temp branches via `--delete-branch`
- **Con:** Slightly longer promotion time (PR must pass checks before merge)
- **Con:** If auto-merge is not enabled in repo settings, the PR will sit open until manually merged

## Notes

If the repo doesn't have "Allow auto-merge" enabled in Settings → General, enable it or the `--auto` flag will fail. In that case, fall back to `gh pr merge --merge --delete-branch` (immediate merge, requires no required status checks or admin bypass).
