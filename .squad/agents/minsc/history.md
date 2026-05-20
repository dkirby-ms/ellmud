# minsc — History

**For a quick overview, see [summary.md](./summary.md)**

---

### 2026-04-19: E2E Combat Coverage Expansion (PR #480)
**Status:** ✅ Complete — PR #480 merged to `dev`

**What was done:**
- Expanded `combat.spec.ts` from 7 → 10 tests (3 new, 3 tightened)
- New: combat-completion (defeat + end), movement-block, multi-creature aggro
- Tightened: observer (strike narrations), flee (post-flee movement), aggressive (real auto-aggro)
- All 39 e2e tests pass, zero regressions

**Review outcome (Elminster):**
- Verdict: APPROVE_WITH_NOTES — 5/6 notes fully addressed, 1/6 via acceptable proxy
- Two non-blocking suggestions: (1) Multi-creature assertion >= 2 instead of >= 1; (2) Explicit flee-fail error message
- PR #480 squash-merged to `dev` on 2026-04-19

**Critical discovery — zone category limitation:**
- `ZoneRoom.update()` skips combat/creature AI ticks in `faction_hub` zones (`isNonCombatZone`)
- ALL valid starting zones (reliquary, bloom-observatory, carrion-court) are `faction_hub`
- Original 7 combat tests only passed because they tested synchronous command responses, not tick resolution
- Fix: `DEV_MODE_ENABLED=true` + `goto warrens:shattered-gate` teleports to dungeon zone where ticks run
- `peaceful` command blocks creature-initiated aggro while allowing manual `attack`

**Key patterns for future e2e combat tests:**
1. Create player in `the-reliquary` (only valid starting zones accepted by API)
2. `goto warrens:shattered-gate` to reach a dungeon zone with active combat ticks
3. `peaceful` before teleport if you need to control which creatures engage
4. `adminSpawnCreature(id, room, 'warrens')` — must pass zoneSlug for non-reliquary zones
5. Flee is probabilistic (50% base) — use retry loop up to 5 attempts

## Learnings

### 2026-05-20T19:51:09.439+00:00 — Playwright load-test gameplay mix
- `packages/e2e/src/load-test.ts` keeps the existing auth, connection, reporter, and shutdown wiring; only the stress behavior should change for gameplay simulations.
- The browser-driven load test submits commands through `page.locator('input[aria-label="Command input"]')` with `fill()` + `press('Enter')`, so command generation should stay string-based.
- The richer gameplay loop now starts each connected user with `look`, then rotates weighted movement/combat/loot/chat/state/item/who commands to better mimic live zone activity.

### 2026-05-20T21:00:25.794+00:00 — Load-test navigation escape sequence
- Reliquary load-test users spawn in `reliquary-inn`, so random movement alone strands them unless they first reach `reliquary-commons` via `down`, `east`, `east`.
- `startStressLoop()` should treat that hub path as best-effort setup with 500–1000ms spacing between moves, then keep the existing 25% random movement weight once users are in the commons network.

### 2026-05-20T21:02:07.093+00:00 — Load-test Siltgate handoff
- The full best-effort load-test escape route from the Reliquary inn to Siltgate is `down`, then five `east` commands; the last `east` crosses zones from `reliquary-filtration-annex` into `the-siltgate/pipe-bridge`.
- `startStressLoop()` should pause about 3 seconds after that final `east` so the client can complete the Colyseus room handoff, then issue `look` to seed the stress loop with fresh room context in the new zone.
