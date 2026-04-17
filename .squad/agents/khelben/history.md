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

