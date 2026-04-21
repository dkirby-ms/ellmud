# Khelben — History

## Core Context

- **Project:** Ellmud — PvPvE Extraction RPG / Real-Time MUD
- **Stack:** Node.js, TypeScript, Colyseus (game server), React (client), WebSocket/SSH
- **Monorepo:** packages/server, packages/client, packages/shared
- **Branching:** dev → uat → prod (default branch is dev)
- **User:** dkirby-ms
- **Build:** `npm run build` (TypeScript compilation across packages)
- **Test:** `npx vitest run` (3,100+ tests across packages)
- **Lint:** Check package.json for lint command
- **Docker:** Dockerfile and docker-compose.yml at repo root
- **CI/CD:** .github/workflows/ — CI runs on push, release on prod
- **Infra:** infra/ directory for infrastructure config
- **Port:** Game server runs on port 2567

## Automated Version Bumping (2025-01)

**Status:** ✅ Complete (PR #425)

**Context:** Consolidated two release workflows and implemented automated version bumping to eliminate manual version management and reduce human error.

**Implementation:**

1. **New Versioning Model:**
   - **Patch (0.1.x):** Auto-bumped on dev → uat promotion (both manual and scheduled)
   - **Minor (0.x.0):** Auto-bumped on uat → prod promotion (resets patch to 0)
   - **Major (x.0.0):** Manual only — reserved for intentional breaking changes

2. **Modified Workflows:**
   - `scheduled-uat-promote.yml`: Added patch bump after merge
   - `squad-promote.yml`: Added patch bump (dev→uat) and minor bump (uat→prod)
   - `squad-release.yml`: Removed CHANGELOG version validation (versions now auto-bumped)
   - `release.yml`: Deprecated (renamed to DEPRECATED-release.yml with error stub)

3. **Version Bump Flow:**
   - Merge branches → npm version {patch|minor} --no-git-tag-version → npm run version:sync → commit with [skip ci] → push
   - Version bump happens BEFORE push so code has correct version
   - squad-release.yml reads the bumped version and creates tag + GitHub Release

4. **Safety Features:**
   - [skip ci] in commit messages prevents infinite CI loops
   - Idempotent: Multiple runs don't double-bump
   - Dry run mode shows what version WOULD be bumped to
   - Node.js setup + npm ci ensures clean dependency state

**Key Learnings:**

- **Version bump timing critical:** Must happen BEFORE push so pushed code has correct version, allowing squad-release.yml to read it
- **[skip ci] prevents loops:** Version bump commits trigger workflows, [skip ci] breaks the loop
- **CHANGELOG decoupling:** Removed version-specific CHANGELOG validation; CHANGELOG should document changes regardless of version numbers
- **Workspace version sync:** scripts/sync-versions.mjs critical for monorepo consistency
- **Dry run version preview:** Bash arithmetic for version calculation improves UX

**Impact:** Eliminates manual version management, ensures every UAT build has unique version, simplifies release process, reduces risk of version conflicts.

---

## Workflow Audit Fixes — Low Priority Items (2025-01, PR #428)

**Status:** ✅ PR Created

**Changes:**
1. **Action ref standardization:** All workflows now use tag references (`@v4`, `@v2`, `@v7`, `@v3`) — no more SHA-pinned refs. This is the team standard going forward.
2. **Merge error handling:** Promote workflows (`squad-promote.yml`, `scheduled-uat-promote.yml`) now properly distinguish "nothing to merge" from real merge failures instead of swallowing all errors with `|| true`.

**Learnings:**
- **Action ref convention is tags, not SHAs:** Team decided against SHA pinning for simplicity. All action refs use major version tags (e.g., `@v4`).
- **Merge error pattern:** Capture exit code with `|| MERGE_EXIT=$?`, then check `git diff --cached --quiet && git diff --quiet` to distinguish "trees identical" from real failures. Always `git merge --abort` in error path.
- **Prod promote uses force-push, not merge:** `squad-promote.yml` was switched from merge-based to force-push reset. Since there's no real prod system, prod is simply made to match uat (after stripping forbidden paths). This eliminates merge conflicts entirely. If a real prod system is added later, consider reverting to merge-based approach for traceability.
- **Prod branch reset (2026):** Force-pushed uat→prod to resolve accumulated divergence. Prod SHA now matches uat exactly.
- **Discord notifications in promote workflows:** `scheduled-uat-promote.yml` now posts to Discord (`DISCORD_TESTING_ALERTS` secret) when commits are promoted. Uses plain `curl` with `continue-on-error: true` so notifications never block the pipeline. Pattern reusable for `squad-promote.yml` if needed.
- **Discord UAT announce moved to ci-cd.yml (issue #451):** Notification removed from `scheduled-uat-promote.yml` and added as `notify-discord-uat` job in `ci-cd.yml` with `needs: deploy` + `github.ref_name == 'uat'`. Ensures Discord is only notified after a successful deploy, not just a code promotion. Same `DISCORD_TESTING_ALERTS` secret, same `continue-on-error: true` pattern.

---

## Branching Strategy Review (2026-04-15)

**Status:** ✅ Analysis Complete

**Current Model:** dev → uat → prod (default branch is dev, but prod has tag v0.2.1 and dev is at v0.2.0-dev.46)

**Scope:** Deep review of the three-tier branching strategy, workflow automation, pain points, and recommendations.

### 1. Branch Model & Code Flow

**Current State:**
- **dev:** Primary development branch. All PRs target here. Receives features, bug fixes, and routine commits. No deploy from this branch (CI only: build/test/lint).
- **uat:** Staging/QA branch. Code promoted from dev via `scheduled-uat-promote.yml` (4x daily: 01:00, 13:00, 17:00, 21:00 UTC) or manually via `squad-promote.yml`. Triggers full CI/CD pipeline including Docker build → ACR push → Azure Container App deployment.
- **prod:** Production branch. Code promoted from uat via manual `squad-promote.yml` (workflow_dispatch). Also triggers full CI/CD. Uses force-push to reset prod to uat (after stripping forbidden paths). Current SHA is v0.2.1; dev is at v0.2.0-dev.46.

**Workflow Automation:**
- `scheduled-uat-promote.yml`: Merges dev → uat on schedule (no-ff merge, strips forbidden paths, bumps patch version). Explicitly triggers `ci-cd.yml` on uat after push.
- `squad-promote.yml`: Manual uat → prod promotion with optional dry-run. Uses force-push (not merge) to reset prod to uat. Explicitly triggers `ci-cd.yml` on prod after push.
- `ci-cd.yml`: Runs on push to uat/prod OR on workflow_dispatch. Builds, tests, lints; if passed, builds Docker, pushes to ACR, deploys to Container App with health check + rollback on failure.

**Version Bumping:**
- Patch version bumped on dev → uat (both scheduled and manual squad-promote).
- Minor version bumped on uat → prod.
- Major version is manual-only (via explicit commit).

### 2. Pain Points & Observed Issues

**Critical:**
- **TS errors promoted to uat:** Commit 8aaea81 (Apr 15) fixed TS errors in death tests that were merged into uat by `scheduled-uat-promote.yml` before CI caught them. The scheduled promotion runs on a timer (not gated by CI success), so broken code on dev gets automatically promoted. While 8aaea81 was later fixed on dev, the broken code was already on uat for ~12 hours (from scheduled promote at 01:00 UTC on Apr 14 until 8aaea81 was committed Apr 15).
  - **Root cause:** `scheduled-uat-promote.yml` doesn't validate that dev CI passes before promoting. It just checks `git rev-list --count origin/uat..origin/dev` and merges.
  - **Impact:** Broken code reaches uat/staging, wasting QA time and potentially breaking downstream prod promotions.

**High:**
- **No branch protection rules visible:** Cannot confirm if `required-status-checks` or `require-branches-be-up-to-date` are enforced on uat/prod. Recommend checking GitHub Settings > Branches > Branch protection rules to see if any exist.
- **Prod divergence risk (mitigated but fragile):** Prod force-push model prevents merge conflicts but eliminates commit history traceability. If a real production system (with persistent state) is added, this model breaks—you'd need to merge/cherry-pick instead.
- **No pre-promotion validation step:** UAT promotion doesn't check if the commit to be promoted passed CI on dev. uat → prod promotion validates no forbidden files, but doesn't validate that uat itself is deployable (though that's implicit since uat CI must have passed to reach uat).

**Medium:**
- **Concurrency groups not fully aligned:** `scheduled-uat-promote.yml` uses `concurrency: { group: uat-promote, cancel-in-progress: false }`. `squad-promote.yml` for uat → prod uses `concurrency: { group: prod-promote, cancel-in-progress: false }`. These are separate groups, so they don't serialize with each other. If someone manually promotes uat → prod at the same moment scheduled-uat-promote is running, you could have overlapping CI/CD jobs on uat. Low risk (scheduled runs 4x/day, manual is ad-hoc), but possible.
- **Forbidden path maintenance burden:** Forbidden paths list exists in two places: inline in `scheduled-uat-promote.yml` (lines 85–86) AND in `.github/scripts/strip-forbidden-paths.sh`. While `strip-forbidden-paths.sh` is the source of truth for merges, the inline regex in `scheduled-uat-promote.yml` (the conflict check) can drift. Currently in sync, but future changes risk desynchronization.

**Low:**
- **UAT promote logs are quiet on success:** The log message "ℹ️ dev is not ahead of uat — nothing to promote" is fine, but it's easy to miss when scheduled-promote runs and silently does nothing (happens 3-4x daily).
- **Manual squad-promote has dry-run, but it's not tested in CI:** The dry-run mode is useful for validation, but there's no automated test that verifies the dry-run logic (e.g., that it correctly shows what *would* be promoted without actually pushing).

### 3. Recommendations

**Immediate (High Priority):**

1. **Add CI gating to scheduled promotion:**
   - Before `scheduled-uat-promote.yml` merges dev → uat, fetch the latest CI/CD run on dev's HEAD commit.
   - Check if `status: success` (or allow specific statuses like "failure-but-recoverable").
   - If CI failed, skip promotion and notify (Discord, email, or issue comment).
   - **Implementation:** Add job that uses GitHub API (via `gh run list`) to check dev's latest run status before attempting merge.

2. **Enforce branch protection rules (GitHub UI):**
   - **dev:** No protection needed (active development); allow direct pushes.
   - **uat:** Require status checks (`ci-cd.yml` build-and-test must pass on PRs). Allow direct pushes (for scheduled-promote) but enforce `require-branches-be-up-to-date` to avoid stale code.
   - **prod:** Require status checks (`ci-cd.yml` must pass on PRs). Enforce `require-branches-be-up-to-date`. Dismiss stale reviews on push.
   - **Note:** These rules apply to PRs; the promotion workflows (using `GITHUB_TOKEN`) bypass them, so explicit CI checks in the workflows are still needed.

3. **Consolidate forbidden-path detection:**
   - Extract the conflict-check regex from `scheduled-uat-promote.yml` (line 85) into a helper function or separate script.
   - Both workflows should source the forbidden paths from `.github/scripts/strip-forbidden-paths.sh` or a `.github/scripts/forbidden-paths.txt` file.
   - **Benefit:** Single source of truth; reduce maintenance risk.

**Short-term (Medium Priority):**

4. **Align concurrency groups to serialize promote workflows:**
   - Change `squad-promote.yml`'s concurrency group from `prod-promote` to include both dev→uat and uat→prod in one group.
   - **Option A (Simple):** Use single `concurrency: { group: code-promotion, cancel-in-progress: false }` in both promote workflows.
   - **Option B (Strict):** Use `concurrency: { group: promote-${{ github.ref_name }}, cancel-in-progress: false }` to allow parallel promotes on different branches.
   - Option A is safer; it ensures dev→uat and uat→prod never overlap (uat→prod must wait for dev→uat to finish).

5. **Improve promotion observability:**
   - Add summary line to `scheduled-uat-promote.yml`: "Skipped (dev not ahead)" vs "Promoted N commits" vs "Merge conflict (forbidden paths only — auto-resolved)".
   - Post to Discord for both success AND skipped (not failure, just info).
   - **Benefit:** Team sees when scheduled jobs run and what they did.

**Long-term (Strategic):**

6. **Consider release-branch model if real prod emerges:**
   - If real production users are added, the current force-push model becomes dangerous (loses production fix history).
   - Consider moving to a release-branch model: dev → uat → release/vX.Y → prod (with cherry-picks for hotfixes).
   - Keep merge-based promotion for traceability; reserve force-push for dev→uat only (which is test-only).

7. **Document the branching model:**
   - Add `.github/BRANCHING.md` with ASCII diagram:
     ```
     dev (active development, no deploy)
       ↓ [scheduled 4x/day OR manual]
     uat (staging/QA, auto-deploy)
       ↓ [manual only, gated]
     prod (production)
     ```
   - Include: When to PR to each branch, how to manually promote, what automatic workflows do, where to find logs.

### 4. Current State Summary

**What's Working Well:**
- Automated dev → uat promotion 4x/day keeps staging relatively fresh.
- Manual uat → prod gate ensures control over production releases.
- Forbidden path stripping prevents team tooling from reaching production.
- CI/CD pipeline on uat/prod is robust (health checks, rollback).
- Version bumping is automatic and prevents version conflicts.

**What Needs Improvement:**
- **No CI gating on automated dev → uat promotion** — broken code reaches uat undetected. **FIX PRIORITY: 1**
- **Branch protection rules need verification** — couldn't confirm from repo settings. Check GitHub UI.
- **Forbidden-path maintenance risk** — paths defined in two places, risk of drift.
- **Concurrency serialization** — dev→uat and uat→prod can overlap; low risk but cleanable.

---

## CI/CD Bug Fixes - Run #278 (2026-04-20)

**Status:** ✅ Complete

**Context:** CI/CD run #278 on `uat` branch failed with two distinct bugs. Both fixed in this session.

**Bugs Fixed:**

1. **Docker build failure - husky not found:**
   - **Problem:** Runtime stage's `npm ci --omit=dev` triggered the `prepare` script which tried to run `husky` (a devDependency not installed with `--omit=dev`). Build failed with `sh: husky: not found, npm error code 127`.
   - **Root cause:** The `prepare` script in package.json runs on ANY `npm ci`, even when devDependencies are omitted.
   - **Fix:** Added `--ignore-scripts` flag to the runtime stage's `npm ci` command in `Dockerfile` (line 28).
   - **Rationale:** Build stage (Step 7) runs full `npm ci` and needs `prepare` to install husky hooks for development. Runtime stage only needs production dependencies and has no need for git hooks, so skipping scripts is safe.

2. **Issue auto-creation skipped on workflow_dispatch:**
   - **Problem:** The `create-failure-issue` job in `.github/workflows/ci-cd.yml` had condition `github.event_name == 'push'`, which excluded `workflow_dispatch` triggers. Manual workflow runs that failed didn't create tracking issues.
   - **Fix:** Updated the `if` condition (line 361) to `(github.event_name == 'push' || github.event_name == 'workflow_dispatch')`.
   - **Rationale:** Issues are valuable for both automated and manual failures. The job already has proper failure detection via `needs.*.result == 'failure'`, so adding `workflow_dispatch` is safe and consistent with other jobs like `docker-build-push` and `deploy`.

**Learnings:**

- **npm scripts + --omit=dev behavior:** The `prepare` script ALWAYS runs during `npm ci`, even with `--omit=dev`. Use `--ignore-scripts` to prevent this when devDependencies aren't available. This is a common Docker multi-stage pattern: build stage runs scripts, runtime stage skips them.
- **workflow_dispatch event handling:** When adding `workflow_dispatch` triggers to workflows, audit all `if` conditions that filter on `github.event_name`. Jobs that should apply to manual runs (deploys, notifications, issue creation) need to include both `'push'` and `'workflow_dispatch'`.
- **Docker layer optimization preserved:** Adding `--ignore-scripts` doesn't affect caching (it's in the same RUN command), and has no performance impact (slightly faster if anything, since no scripts execute).

**Files Changed:**
- `Dockerfile`: Added `--ignore-scripts` to runtime stage npm ci (line 28)
- `.github/workflows/ci-cd.yml`: Updated `create-failure-issue` condition to include `workflow_dispatch` (line 361)

**Verification:** YAML lint passed. Changes are minimal and surgical — only the failing command and the incorrect condition were modified.
# Khelben — CI/CD Dev History

## Learnings

### 2026-04-17: Issue #468 — Flaky Test Failure on UAT CI

**Context:**
- CI/CD failed on uat branch (commit 36868d8, workflow run 24547330672)
- Three tests failed in death-spawn-routing.test.ts and player-death.test.ts
- All failures had the same symptom: `expect(foundDowned).toBe(true)` failing
- Tests passed locally but failed intermittently on CI

**Root Cause:**
- The `fastForwardDeath()` helper polls for 5 seconds (10 × 500ms) waiting for combat to down a player
- CI runners are slower than local development environments
- The combat tick processing takes longer on CI, especially after recent changes that added combat message formatting (round separators, combat begins messages)
- The 5-second timeout was insufficient on slower CI runners

**Solution:**
- Increased the polling timeout from 10 iterations (5s) to 20 iterations (10s)
- Changed comment from "up to 5 seconds" to "up to 10 seconds, increased for CI reliability"
- This gives combat ticks more time to process on slower runners

**Files Changed:**
- `packages/server/src/__tests__/death-spawn-routing.test.ts` — increased loop iterations from 10 to 20

**Commit:** 6020f2b — fix(tests): increase timeout for flaky death-spawn tests on CI

**Key Insight:**
Test timeouts should account for CI runner variance. When tests rely on async operations (combat ticks, database writes), use generous timeouts that work on the slowest expected runner, not just local dev machines.

**Related Changes in 36868d8:**
- CombatSystem.ts: Added `newEncounterRoomIds` tracking and `roundNumber` stamping on events
- ZoneRoom.ts: Added "Combat begins!" intro message and round separators (──────────)
- These additions increased per-tick processing time slightly, exposing the timeout issue


---

## Squad-Promote PR-Based Flow (2026-07)

**Status:** ✅ Complete

**Context:** `squad-promote.yml` used `git push --force` to prod, which violated branch protection rules (no force pushes, require PRs). Also had the same redundant CI/CD trigger bug we fixed in `scheduled-uat-promote.yml`.

**Changes:**
1. **Force-push → PR flow:** Creates temp branch `promote/uat-to-prod-{timestamp}` from uat, strips forbidden paths, opens PR to prod, enables auto-merge with `--delete-branch`.
2. **Removed redundant CI/CD trigger:** Replaced explicit `gh workflow run ci-cd.yml --ref prod` with a comment explaining ci-cd.yml auto-triggers on push (same pattern as uat fix, lines 115-117 of scheduled-uat-promote.yml).
3. **Added `pull-requests: write` permission** for `gh pr create` and `gh pr merge`.
4. **Improved dry-run:** Now shows commit log and diffstat of what would be promoted.
5. **Early exit refactored:** Moved "already matches" check into a separate step with output variable so subsequent steps can skip cleanly.

**Key Learnings:**
- Branch protection on prod prohibits force pushes — must use PRs for all code changes to protected branches.
- `gh pr merge --auto --merge --delete-branch` handles both "merge immediately if no required checks" and "wait for checks then merge" cases.
- PR body should include commit range summary for auditability.
- The `--delete-branch` flag on merge handles cleanup of the temp promotion branch automatically.

**Files Changed:**
- `.github/workflows/squad-promote.yml`: Full rewrite of promotion logic

