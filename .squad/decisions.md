### 2026-04-05: NarrationService Factory Pattern for LLM Integration
**By:** Jarlaxle (Systems Dev)  
**Date:** 2026-04-05  
**Issue:** #277  
**PR:** #292

## Decision

The NarrationService is instantiated via a factory function (`createNarrationService()`) that conditionally creates an LLMClient based on Azure AI environment variables. When `AZURE_AI_ENDPOINT` and `AZURE_AI_KEY` are set, the factory wires in a real Azure AI Foundry transport. When not set, the service operates in template-only mode.

## Rationale

This pattern provides:
1. **Graceful degradation**: Local dev and tests work without Azure credentials
2. **Environment-based configuration**: Production gets LLM narration, dev gets fast templates
3. **Testability**: Mock transports can be injected for integration tests
4. **Single source of truth**: Config reading happens once at factory instantiation

Alternative considered: Lazy initialization (check config on every narrate() call). Rejected because it adds overhead and makes the LLM availability decision dynamic rather than static at startup.

## Architecture Impact

- **ZoneRoom**: Calls `createNarrationService()` in `onCreate()` — no config reading at room level
- **Config.ts**: Azure AI config is optional (`azureAI?: {...}`) — type system enforces null checks
- **Factory**: Pure function — no side effects, easy to test
- **NarrationService**: Unchanged — still accepts optional `llmClient` in constructor

## Team Impact

- **Minsc/Regis**: If building UI for narration settings, check `config.azureAI` to determine if LLM is available
- **Drizzt**: When adding new narration call sites (combat, movement), use `generateNarration()` helper and build rich NarrationContext
- **Future**: Redis-backed cache can be wired through factory similarly (already has cache parameter)

## Future Expansion

The initial wiring uses `generateNarration()` only for entry narration (proof-of-concept). Next steps:
1. Room descriptions (from `look` command) — highest value, moderate frequency
2. Combat actions — high frequency, needs careful context building
3. Movement events — medium frequency, low context complexity
4. Sound/trace narrations — already have system-level context available

Each expansion requires:
- Building a `NarrationContext` object with appropriate game state
- Calling `await narrationService.narrate(context)`
- Using the returned prose in place of template text

---

### 2026-04-05: ELK as Sole Zone Designer Layout Engine
**By:** Regis (Frontend Dev)
**Issue:** #273

## Decision
ELK (elkjs) is now the **sole layout engine** for the admin zone designer. The BFS/ELK toggle button and BFS fallback have been removed. If ELK fails, an error is shown instead of silently falling back.

## Rationale
The BFS engine (`computeLayout.ts`) was the original layout algorithm. Phases 2-4 introduced ELK as a replacement with better handling of complex graphs. With Phase 6, the toggle and fallback are removed to simplify the codebase.

## Impact
- **computeLayout.ts is deprecated** but retained — the player minimap (`useExplorationMap`) still uses it for synchronous layout
- **6 other components** import `RoomPosition` type from computeLayout.ts — these type imports can be migrated to elkLayout.ts when convenient
- **Zone designer** users no longer have a BFS fallback if ELK errors — this is acceptable since ELK has been stable through Phases 2-5
- **Future:** Once player minimap migrates away, computeLayout.ts (~2700 lines) can be fully removed

---

### 2026-04-04: GDD §6.7 Updated to Document DowningSystem
**By:** Elminster (Lead/Architect)
**Issue:** #286
**Status:** Executed

## Context
The combat audit identified that the codebase has a `DowningSystem` (`packages/server/src/systems/DowningSystem.ts`) implementing a downed/bleedout/stabilization flow, while GDD §6.7 stated: "The player dies immediately. There is no downed state in the base system." This was a positive divergence — the implementation is better than what was designed.

## Decision
Updated GDD §6.7 to accurately describe the implemented DowningSystem mechanics:

- **Downed state:** 0 HP → incapacitated, not dead. Removed from combat. 10-tick bleed-out timer.
- **Stabilization:** `stabilize [player]` command, 2-tick channel, bandage required, cannot self-stabilize, interruptible.
- **Death triggers:** Bleed-out timer expiry OR finishing blow (active combat in room with downed player).
- **Stabilized protection:** Stabilized players are not subject to finishing blows.
- **Attribution:** killerIds tracked for PvP attribution.

Also updated cross-references in §8.3 (PvP) and §8.5 (Groups) to reference the downing flow.

## Team Impact
- **Minsc/Regis:** If building combat UI or tests, §6.7 now accurately describes the downed overlay state and stabilize interactions.
- **Future work:** Revive mechanic for stabilized players is not yet designed or implemented — stabilized players currently stay downed until encounter ends or zone collapses.

---

### 2026-04-04: Sprint 3 PR Review — Migration Discipline
**By:** Elminster (Lead / Architect)
**Issues:** #236, #237, #238, #239

## Decision
Seed migration files (003_seed_zones.sql, 004_seed_siltgate.sql, etc.) must NOT be modified to change runtime data in existing databases. The migration runner tracks applied files by filename — once a file is in the `_migrations` table, it will never re-run. Any data changes to existing rows (category updates, description changes, column value modifications) must use a **new numbered migration file** with UPDATE statements.

Modifying seed files is acceptable ONLY for maintaining correctness on fresh installations (both the seed update AND a new migration are needed).

## Rationale
PR #260 modified 003_seed_zones.sql to change the Refuge category from `hub` → `dev`, but this change will not apply to existing databases. The Refuge will remain `category='hub'` on any database that has already run the migration set. This was caught in review and flagged as a blocking issue.

This is the second time this pattern has been noted (Jarlaxle's own history mentions "Migration ordering matters: Seed migrations reference columns by original name"). It needs to be a documented team rule.

## Impact
- PR #260 needs a new `014_repurpose_refuge.sql` migration before merge
- All future data modifications must follow the same pattern: new migration file + optional seed file update
- This rule applies to all seed migrations (003, 004, and any future seed files)
### 2026-04-01: Death & Spawn Routing — Faction Strongholds
**By:** Drizzt (Engine Dev)  
**Issue:** #238  

## Decision
Death routing and login routing now use faction-based stronghold resolution instead of hardcoded Refuge. Added `/api/spawn-zone` endpoint for client login routing.

## Routing Table
| Faction | Stronghold | Zone Target |
|---------|-----------|-------------|
| ironwright | The Foundry | zone:the-foundry |
| veil | The Cartographium | zone:the-cartographium |
| scarlet | The Counting House | zone:the-counting-house |
| _(none)_ | The Refuge | zone:the-refuge |

## Architecture
- **Death routing** is server-authoritative: `resolvePlayerHubTarget(factionSlug)` on death, cached from `playerFactionSlugs` map
- **Login routing** requires client cooperation: `GET /api/spawn-zone` returns `{ target, zoneSlug, factionSlug }` — client must call before connecting
- **Narration** uses `resolvePlayerHubName()` to inject the specific zone name ("You awaken in The Foundry…")

## Impact
- **Regis (Frontend):** Client needs to call `/api/spawn-zone` on login and connect to the returned zone target instead of hardcoded `zone:the-refuge`
- **Jarlaxle (Systems):** Faction stronghold zones must exist and be registered for routing to work; falls back to Refuge gracefully
- **All:** The Refuge is now the fallback hub for unaffiliated players only

---

### 2026-04-01: Refuge Repurposing — Designer/Debug Hub
**By:** Jarlaxle (Systems Dev)  
**Issue:** #239  

## Decision
The Refuge has been recategorized from `hub` (player spawn location) to `dev` (designer/debug workspace). This shift reflects the architectural move to faction-based strongholds for player spawning and respawning.

## Rationale
Players now respawn at faction-specific strongholds rather than a universal hub. The Refuge becomes a dedicated development environment where designers can safely test new room templates, spawn creatures, and debug zone mechanics without impacting production gameplay. This provides isolation and clear purpose separation.

## Changes
- Database: Room category changed from `hub` to `dev`
- Type definitions: Updated `RoomCategory` union
- Descriptions: Updated to reflect designer/developer purpose
- Tests: 13 tests updated for developer workflow context

## Impact
- **Refuge as fallback:** Remains as emergency routing fallback for unaffiliated/unroutable players
- **Designer workflows:** Provides isolated test environment for zone design iteration
- **Admin access:** Unchanged; admin/designer tools continue to use Refuge
- **Player experience:** No disruption; players route to faction strongholds via `/api/spawn-zone`

---

### 2026-04-01: Insert Room on Exit — Zone Designer Pattern
**By:** Regis (Frontend Dev)  
**Issue:** #252  

## Decision
Added "Insert Room on Exit" as a new zone designer action. When an exit is selected, the user can insert a new room between the two connected rooms. This creates the room, deletes the original exit pair, and wires two new bidirectional pairs through the inserted room. The operation is atomic (all-or-nothing via try/catch) and the BFS layout engine naturally positions the new room on the grid between the originals.

## Rationale
Zone designers frequently need to add intermediate rooms to existing connections — for topological correctness (bridge rooms), narrative pacing, or encounter placement. Previously this required manually creating a room, deleting the exit, and rewiring 4+ exits by hand. The new button reduces this to a single click.

## Impact
- Button appears in both the exit-pair and single-exit panels in the zone designer side panel
- Hidden for cross-zone portal exits (portals span zones and shouldn't be split)
- New rooms default to type `corridor` — designer renames/retypes after insertion
- Uses purple dashed border styling (matching feature-room accent) to distinguish from Save/Delete actions
