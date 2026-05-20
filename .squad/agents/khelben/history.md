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

### 2026-05-19T21:59:42.077+00:00: ACA image source investigation

- `infra/modules/container-apps.bicep` intentionally defines a bootstrap image (`node:22-alpine`) and placeholder command; the real server image is expected to be applied later.
- `.github/workflows/ci-cd.yml` deploys with `az containerapp update --image ... --command ...`, so CI/CD overrides the Bicep default image at deploy time rather than consuming the Bicep image directly.
- `ci-cd.yml` ignores `infra/**` and `.github/**` on push/PR, so infra-only changes do not automatically trigger the image-override deploy.
- Any `az deployment group create` using `infra/main.bicep` can reapply the Container App module's bootstrap image. Recent infra commits `4095b659` (`activeRevisionsMode: 'Single'`) and `62cca97c` (AI Foundry disabled) are plausible redeploy points that could leave the app on the placeholder image if no follow-up CI/CD or manual `az containerapp update` ran.

### 2026-05-19T22:04:11.514+00:00: ACA infra redeploy image preservation

- `infra/main.bicep` and `infra/modules/container-apps.bicep` now accept `containerImage`, `containerCommand`, and `containerArgs` parameters, with the existing `node:22-alpine` placeholder preserved as the greenfield default.
- `infra/deploy.sh` now queries the current ACA container spec (`image`, `command`, `args`) before `az deployment group create` and feeds those values back into the Bicep deployment for brownfield redeploys.
- This keeps first deploys bootstrappable while making infra-only redeploys idempotent: the live app entrypoint is preserved unless CI/CD intentionally changes it later.
- Key paths for this pattern: `infra/deploy.sh`, `infra/main.bicep`, and `infra/modules/container-apps.bicep`.

### 2026-05-20T13:37:30.442+00:00: Discord release chirp — stale changelog fix

**Status:** ✅ Complete

**Problem:** The Discord UAT deploy notification was always showing the same stale v0.2.0-dev.64 changelog entry. Root cause: the changelog extraction step only ran the `git log` path for `push` events. For `workflow_dispatch` (how `scheduled-uat-promote.yml` triggers ci-cd.yml), `github.event.before` is empty, so it always fell back to `CHANGELOG.md` — which always showed the same latest release entry regardless of what actually shipped.

**What changed (`ci-cd.yml`, `notify-discord-uat` job, "Extract changelog from commits" step):**

1. **`workflow_dispatch` path added:** When the event is `workflow_dispatch`, the step now checks if `HEAD` is a merge commit (has a second parent). If yes — which is the case for scheduled promotes — it extracts commits via `git log --no-merges HEAD^1..HEAD^2`, capturing exactly what dev brought in. If HEAD is not a merge commit (manual dispatch for a non-merge state), it falls back to commits since the last tag.

2. **Expanded noise filters:** Added `grep -v "^\• chore:"` and `grep -v "^\• chore("` to the filter pipeline (both push and dispatch paths), catching all scoped/unscoped chore commits that aren't player-facing, not just `chore(release):`.

3. **Removed CHANGELOG.md fallback:** If after filtering the changelog is empty, the step now emits empty `content` rather than reading `CHANGELOG.md`. This prevents stale content.

4. **Skip notification when empty:** Added `if: steps.changelog.outputs.content != ''` to the "Announce UAT deploy to Discord" step. If all commits were noise (or nothing new shipped), the chirp is suppressed entirely instead of posting stale data.

**Files changed:**
- `.github/workflows/ci-cd.yml`: rewritten "Extract changelog from commits" step + `if` guard on Discord announce step

**Key insight:** `github.event.before` is undefined for `workflow_dispatch`. Always check event type before using SHA-range git log. For merge-based promote flows, the second parent (`HEAD^2`) is the canonical source of "what got merged in."

### 2026-05-20T15:36:05.073+00:00: Azure Managed Grafana infra wiring

- `infra/modules/monitoring.bicep` already provisions workspace-based Application Insights plus Log Analytics, and `infra/modules/container-apps.bicep` already injects `APPLICATIONINSIGHTS_CONNECTION_STRING` into the ACA workload.
- `infra/modules/grafana.bicep` is the new observability module for Azure Managed Grafana: use `Microsoft.Dashboard/grafana` with `sku.name = 'Standard'`, `identity.type = 'SystemAssigned'`, shared tags, and a resource-group-scope `Monitoring Reader` role assignment for Grafana's managed identity.
- The Container App does not need extra Azure RBAC just to emit telemetry when it uses the App Insights connection string; ingestion is connection-string based, so Grafana is the identity that needs read access.
- `infra/main.bicep` should wire Grafana after the ACA app module so observability resources come up after the workload and expose `grafanaName` / `grafanaEndpoint` as deployment outputs.

