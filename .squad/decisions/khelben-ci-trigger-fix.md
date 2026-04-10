# Decision: Trigger CI/CD After Promotion Pushes

**Status:** Implemented  
**PR:** #400  
**Author:** Khelben (CI/CD Dev)  
**Date:** 2025-01-XX

## Context

When `squad-promote.yml` or `scheduled-uat-promote.yml` push commits to the `uat` or `prod` branches using `GITHUB_TOKEN`, the `ci-cd.yml` workflow does not trigger automatically. This is a known GitHub Actions limitation designed to prevent infinite loops — workflows triggered by `GITHUB_TOKEN` (used by `github-actions[bot]`) do not trigger other workflows.

### Evidence
- `squad-promote.yml` ran at 17:33 UTC, pushed commit `07d0cc32` to uat as `github-actions[bot]`
- The last `ci-cd.yml` run on uat was from 00:19 UTC (PR #378 merge, by a real user)
- No `ci-cd.yml` run was triggered by the promotion push
- This created a gap where dev→uat promotion succeeded but CI/CD never ran

## Decision

Implement **Option 3** (user-approved): Have the promote workflows trigger CI/CD directly after pushing, using `workflow_dispatch`.

### Implementation

**1. `.github/workflows/ci-cd.yml`** — Add `workflow_dispatch` trigger:
- Added `workflow_dispatch:` to the `on:` block (no inputs needed)
- This allows the workflow to be triggered programmatically
- The `github.ref_name` will be the branch it was dispatched on
- **Important:** `workflow_dispatch` trigger does NOT support `paths-ignore`, but existing `push` and `pull_request` triggers keep their `paths-ignore` unchanged

**2. `.github/workflows/squad-promote.yml`** — Trigger CI/CD after pushing:
- In `dev-to-uat` job: After pushing to uat, added step to run `gh workflow run ci-cd.yml --ref uat`
- In `uat-to-prod` job: After pushing to prod, added step to run `gh workflow run ci-cd.yml --ref prod`
- Both steps only run when `inputs.dry_run == 'false'`
- 5-second sleep gives GitHub time to process the push before triggering

**3. `.github/workflows/scheduled-uat-promote.yml`** — Trigger CI/CD after pushing:
- After pushing to uat, added step to run `gh workflow run ci-cd.yml --ref uat`
- Step only runs when commits were actually pushed (`steps.check.outputs.commits_ahead != '0'`)
- Same 5-second sleep pattern

### Code Pattern

```yaml
- name: Trigger CI/CD on <branch>
  if: <condition>
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: |
    # Give GitHub a moment to process the push
    sleep 5
    gh workflow run ci-cd.yml --ref <branch>
    echo "✅ Triggered CI/CD pipeline on <branch>"
```

## Rationale

- **Explicit is better than implicit:** The promotion workflow now has clear responsibility for triggering CI/CD
- **Audit trail:** Workflow logs show exactly when and why CI/CD was triggered
- **No PAT required:** Uses standard `GITHUB_TOKEN` with `gh` CLI
- **Minimal changes:** Only adds `workflow_dispatch` trigger and trigger steps — no changes to existing push/PR logic

## Alternatives Considered

1. **Use a PAT with elevated permissions** — Rejected: requires creating and managing a separate token, more complex
2. **Use `repository_dispatch`** — Rejected: more complex, requires custom event handling
3. **Workflow chaining with `workflow_run`** — Rejected: doesn't work for this use case (still requires initial trigger)

## Testing Plan

1. Trigger `squad-promote.yml` manually (or wait for next scheduled run)
2. Verify that `ci-cd.yml` runs on uat after the push
3. Check Actions tab to confirm `workflow_dispatch` trigger shows correct branch
4. Monitor for any issues with the 5-second delay timing

## Impact

- **Promotion workflows:** Now trigger CI/CD explicitly after pushing
- **CI/CD workflow:** Can now be triggered manually or programmatically via `workflow_dispatch`
- **Scheduled promotions:** Will now properly trigger CI/CD builds on uat
- **Manual promotions:** Both dev→uat and uat→prod now trigger CI/CD

## Related Files

- `.github/workflows/ci-cd.yml`
- `.github/workflows/squad-promote.yml`
- `.github/workflows/scheduled-uat-promote.yml`
