# jarlaxle — History

**For a quick overview, see [summary.md](./summary.md)**

---

### 2026-04-13: Permadeath Death Handler Implementation
**Status:** ✅ Complete

**Task:** Implement permadeath death handler logic as a server-wide mode (not per-character opt-in). When enabled via env vars, all characters face permanent death after reaching a configurable death threshold.

**Implementation:**
1. **Server Config** (config.ts):
   - Added `permadeath: { enabled: boolean, threshold: number }` to ServerConfig
   - Reads from `PERMADEATH_ENABLED` and `PERMADEATH_THRESHOLD` env vars
   - Default threshold: 1 (single death = permadeath)

2. **Death Handler Logic** (ZoneRoom.ts):
   - Modified `handlePlayerDeath()` to check permadeath condition AFTER normal death flow
   - Death count increment is now awaited (was async void) to ensure synchronous permadeath check
   - If permadeath triggered, calls `executePermadeath()` and returns early (skips normal respawn)
   - Normal death flow (corpse creation, item drops, death penalty) happens BEFORE permadeath check

3. **Permadeath Execution** (executePermadeath method):
   - Calculates survival time (from zone join to death)
   - Determines cause of death (creature name or player name) and zone of death
   - Queries total kills/deaths from `game_metrics` table
   - Records character to `hall_of_fame` table (migration 017 already exists)
   - Soft-deletes character via `characterRepo.softDelete()`
   - Sends special 'permadeath' overlay message to client with full stats
   - Schedules disconnection after 5 seconds (allows client to show permadeath screen)
   - Cleans up player from all zone systems (players, combat, downing, etc.)

4. **Client Messaging** (shared/index.ts):
   - Extended `OverlayMessage.state` to include 'permadeath' type
   - Added optional `permadeathStats` field with character name, level, kills, deaths, survival time, cause/zone of death
   - Client can now differentiate between normal death and permadeath screens

**Edge Cases Handled:**
- Player disconnects during permadeath: Character still soft-deleted (DB persistence)
- Multiple simultaneous deaths: Each death is atomic (await on death count increment)
- Missing metrics data: Defaults to 0 kills/deaths if query fails
- Missing zone/creature names: Falls back to "unknown zone" / "a creature"

**Compilation:** ✅ Server compiles successfully (npx tsc --noEmit passes)

**Key Design Decisions:**
- Permadeath check is synchronous and happens immediately after death count increment
- Normal death flow (corpse, items, penalties) proceeds normally even for permadeath deaths
- Permadeath short-circuits the normal respawn flow by returning early
- 5-second delay before disconnect gives client time to render the permadeath screen
- Hall of fame stats are fire-and-forget (logged but don't block permadeath execution)

