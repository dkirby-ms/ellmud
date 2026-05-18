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

### 2026-05-18T09:42:59.318-05:00: SIMULATE_LOAD ACA wiring

- `infra/modules/container-apps.bicep` is the source of truth for Azure Container Apps runtime env injection; new demo toggles should land there as deploy-time parameters with safe empty-string defaults.
- `infra/main.bicep` and `infra/main.bicepparam` are the handoff path for ACA module parameters, so infra-facing env toggles need updates in both places.
- `.env.example` documents operator-facing runtime flags, and `infra/keda-scaledobject.yaml` carries reference comments for KEDA/ACA scaling demos.
- For open infra PR compatibility checks, `gh pr diff <number>` against `infra/modules/container-apps.bicep` is enough to confirm whether a new env var change overlaps with scaling-rule edits.


### 2026-05-18: SIMULATE_LOAD Infrastructure Wiring

**Status:** ✅ Complete — Bicep parameter added and documented

**What was done:**
- Added `simulateLoad` optional Bicep parameter to `infra/main.bicep` and `infra/modules/container-apps.bicep`
- Passed parameter as `SIMULATE_LOAD` environment variable to Azure Container App (default: empty string, demos off by default)
- Updated `infra/main.bicepparam` with parameter defaults
- Updated `.env.example` with `SIMULATE_LOAD` documentation
- Updated `infra/keda-scaledobject.yaml` with comments explaining the toggle

**PR #491 compatibility:** No conflicts found. This change adds a new parameter while PR #491 modifies scale rule metadata — different concerns, non-overlapping lines. Safe to merge in either order.

**Integration:** Works with Drizzt's load simulator module. Load simulator reads `SIMULATE_LOAD` env var at startup. See orchestration logs and decisions.md.

