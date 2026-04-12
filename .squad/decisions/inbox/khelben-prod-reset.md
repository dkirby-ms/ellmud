# Decision: Prod branch reset and force-push promote

**Author:** Khelben (CI/CD Dev)
**Date:** 2026-07-15
**Status:** Implemented

## Context

The `squad-promote.yml` workflow used `git merge` to promote uat→prod. Over time, the branches diverged significantly (forbidden-path conflicts, old commits on prod not on uat), causing recurring merge failures. Since there is no real prod deployment system, fighting these conflicts added no value.

## Decision

1. **Reset prod from uat:** Force-pushed `origin/uat` to `origin/prod`, giving prod a clean starting point identical to uat.
2. **Switched promote strategy:** Changed `squad-promote.yml` from merge-based to force-push reset. Each promotion now makes prod match uat exactly (after stripping forbidden paths via `strip-forbidden-paths.sh`).
3. **Removed Node.js/npm steps** from the promote workflow — no longer needed without version-bump-during-merge.

## Trade-offs

- **Pro:** Eliminates merge conflicts entirely. Simpler workflow. Faster execution.
- **Con:** Loses merge-commit history on prod. Force-push overwrites prod history.
- **Acceptable because:** No real prod system exists yet. When one is added, we can revisit and switch to a merge-based approach for traceability.

## Reversibility

If a real prod deployment pipeline is introduced, revert to merge-based promotion by restoring the old merge logic in `squad-promote.yml`. The `strip-forbidden-paths.sh` script remains the single source of truth either way.
