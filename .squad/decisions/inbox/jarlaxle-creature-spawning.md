# Creature Spawning + AI Tick Wiring

**By:** Jarlaxle (Game Systems Dev)
**Date:** 2025-07-25
**Issue:** #7

## What
Wired the creature system (CreatureManager, behavior tree, loot, Drowned Revenant) into ShardRoom's live game loop: spawning during shard creation, AI evaluation on every tick, loot drops on death, and creature visibility in room descriptions.

## Key Decisions

### 1. Creature spawning uses derived PRNG seed
Creature placement uses `seed + 7919` (a large prime offset) to keep spawning deterministic but independent from the graph generator's PRNG sequence. This avoids coupling creature placement to graph topology changes.

### 2. AI tick runs before combat resolution
Order per tick: creature AI → combat resolve → sync deaths → extraction tick. This ensures creature actions (strike/dodge/flee) are queued before the same tick's resolution, matching the "simultaneous resolution" design.

### 3. Death processing before HP sync
`removeCreature()` (generates loot) must happen before `syncFromCombat()` (marks dead), because the loot method guards on `isAlive`. This ordering is critical and covered by tests.

### 4. Test graph skips creature spawning
`useTestGraph: true` creates no creatures. This preserves all 44+ existing tests that use the test graph without modification. Tests that need creatures use the procedural generator with a fixed seed.

### 5. CommandContext gets `creaturesInRoom` field
Lightweight `{id, name}` refs — keeps creature implementation details out of command handlers. Look and attack handlers consume this. Other handlers can ignore it.

## Impact
- **Drizzt:** `CommandContext` now has optional `creaturesInRoom` field. Attack handler accepts creature targets via partial name match. No breaking changes to existing handler API.
- **Volo:** Combat events include creature names (e.g., "Drowned Revenant strikes player-1"). Narration pipeline receives these for flavor text enrichment.
- **Minsc:** Room descriptions now include creature lines. Web terminal needs no changes — same narration message format.
