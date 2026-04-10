# Decision: Starter Kit → Inventory (Option B)

**Author:** Drizzt (Engine Dev)  
**Date:** 2025-07-24  
**Status:** Implemented

## Context

David directed that starter kit items (Rusty Blade, Tattered Leather, Waterlogged Potion) should go into player **inventory**, not **stash**. Inventory is in-memory on `PlayerState`; stash is the persistent bank in `player_stash`.

## Investigation Findings

- **Inventory is intentionally transient.** It exists only in-memory on `PlayerState`. Items are picked up from rooms (`take` command), dropped on death (non-soulbound), and lost on disconnect.
- **No inventory persistence exists.** There is no `player_inventory` DB table. The `transferToStash` system moves zone loot into the persistent stash at extraction points.
- **Stash is the bank.** Accessible only in `feature_stash` rooms, persisted in `player_stash`.

## Decision: Option B — Grant on first zone join with flag

Creating a full `player_inventory` table (Option A) would break the extraction-game design where inventory is ephemeral. Instead:

1. **New migration** (`012_starter_kit_granted.sql`): Adds `starter_kit_granted BOOLEAN` to `characters`.
2. **CharacterRepository** extended with `isStarterKitGranted()` / `markStarterKitGranted()` (both PG and InMemory).
3. **`starter-kit.ts` rewritten**: Loads item definitions from DB, calls `PlayerState.addItem()` to populate in-memory inventory. No writes to `player_stash`.
4. **Moved from character creation → zone join**: `grantStarterKit()` called in `ZoneRoom.onJoin` after `PlayerState` creation. Gated by the flag so it only fires once per character lifetime.
5. **`characters.ts`** no longer calls `grantStarterKit` at creation time.

## Trade-offs

- **Pro:** Respects the transient-inventory extraction design. Starter items behave like all other inventory — lost on death, transferable to stash at extraction.
- **Pro:** No new table needed. Minimal schema change (one boolean column).
- **Con:** If a character dies on their very first run before extracting, they lose starter items permanently. This is intentional per extraction-game design, but could surprise new players.
- **Mitigation:** A future "tutorial zone" or "soulbound starter items" could address the new-player experience if needed.

## Impact

- `starter-kit.ts` — rewritten (inventory grant, not stash insert)
- `character-starter-kit.test.ts` — rewritten (7 tests covering grant, flag, re-grant, weight limits)
- `CharacterRepository.ts` — 2 new interface methods
- `PgCharacterRepository.ts` — 2 new methods
- `InMemoryCharacterRepository.ts` — 2 new methods + Set
- `characters.ts` — removed `grantStarterKit` call
- `ZoneRoom.ts` — added starter kit grant in `onJoin`
- New migration: `012_starter_kit_granted.sql`
