# drizzt — History

**For a quick overview, see [summary.md](./summary.md)**

---

### 2026-04-13: Permadeath DB Schema & Hall of Fame API (DELIVERED)

**Task:** Build permadeath database schema, server config, and Hall of Fame REST API.

**Outcome:** ✅ DELIVERED — Migration 017 created, config integrated, leaderboard API ready.

**Deliverable:** 
- **Migration 017:** `hall_of_fame` table with character/player metadata, survival metrics, death info
- **Config:** Permadeath env vars integrated (PERMADEATH_ENABLED, PERMADEATH_THRESHOLD)
- **API Endpoints:** `GET /api/hall-of-fame` paginated leaderboard + `/api/hall-of-fame/stats` aggregate stats

**Design Note:** Initial implementation used threshold model (multiple deaths before permadeath). User directive simplified to boolean toggle — removed threshold from active logic, kept config field for backward compatibility.

**Integration:** System ready for Jarlaxle death handler, Regis UI, and Minsc test coverage.

## Learnings

### 2026-05-18: External Load Test Tool (DELIVERED)

**Task:** Create an external load testing script in `packages/e2e/` that drives real browser contexts via Playwright to generate WebSocket connections against the deployed server, triggering KEDA autoscaling.

**Outcome:** ✅ DELIVERED

**Deliverables:**
- **Script:** `packages/e2e/src/load-test.ts` — standalone tsx script (not a test)
- **package.json entry:** `"load-test": "tsx src/load-test.ts"` in `packages/e2e/package.json`
- **tsx** added as devDependency to `packages/e2e/package.json`

**Design decisions:**
- Two auth modes: AUTO (self-registers a unique user per connection via `/auth/register`) and TOKEN (shared pre-seeded JWT injected into every context's localStorage).
- Auto-registered accounts are NOT cleaned up — by design, since clean-up would drop WS connections.
- Ramp logic: spawns `--ramp-rate` (default 2) contexts per second, waits for each batch to settle before spawning the next.
- Connection alive signal: Playwright holds the browser page open; SIGINT/SIGTERM triggers graceful close of all contexts then `browser.close()`.
- Reporter fires every 5 s: prints connected / connecting / failed / closed counts.

**Key patterns learned:**
- `packages/e2e/src/fixtures/player-fixture.ts` shows the full auth flow: register → inject localStorage → goto('/zone') → wait for `input[aria-label="Command input"]:not([disabled])`.
- tsx is available globally at v4.21.0 and declared as `^4.19.0` in `packages/server/package.json`; safe to declare same range in e2e.
- `packages/e2e/playwright.config.ts` uses `baseURL: http://localhost:3000` for tests, but the load-test passes its own `--url` and sets `baseURL` per context — no config coupling needed.
- Colyseus WS join is confirmed live when the command input element becomes enabled.

- Disconnect and death cleanup both persist progression through `packages/server/src/rooms/ZoneRoom.ts`, which calls `savePlayerProfile()` before player state is removed.
- `packages/server/src/player/PgPlayerProfileRepository.ts` still treats profile persistence as player-scoped: it loads by `player_id`, saves skills with `ON CONFLICT (player_id, skill_name)`, and never writes `character_id` for those skill rows.
- The schema drift is in `player_skills`, not `player_profile`: `packages/server/src/db/migrations/001_schema.sql` defines `uq_player_skill` on `(player_id, skill_name)`, but `packages/server/src/db/migrations/021_fix_player_skills_unique_constraint.sql` replaces that with `uq_character_skill` on `(character_id, skill_name)` for multi-character support.
- Existing guardrails missed this drift: `packages/server/src/__tests__/pg-profile-repository.test.ts` and `packages/server/src/__tests__/persistence-schema-validation.test.ts` still assert the old player-scoped skill uniqueness, so repo tests pass even when runtime schema and save code disagree.
- `packages/server/src/player/PlayerProfileRepository.ts` now needs both IDs: `playerId` for `player_profile` rows and `characterId` for `player_skills` rows, because profile data stayed account-scoped while skills moved to character scope in migration 021.
- `packages/server/src/rooms/ZoneRoom.ts` is the bridge between runtime IDs and persistence IDs: room-level `playerId` is the character ID, while `dbPlayerId(characterId)` resolves the owning `players.id` UUID before calling persistence repositories.
- Guardrails now need to validate both layers together: repo tests should assert `ON CONFLICT (character_id, skill_name)` in `PgPlayerProfileRepository`, and schema validation should treat `001_schema.sql` as the original constraint plus `021_fix_player_skills_unique_constraint.sql` as the migration that flips skills to character scope.
