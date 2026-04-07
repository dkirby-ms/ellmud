# Combat Sandbox — Server Infrastructure Proposal

> Author: Drizzt (Engine Dev)  
> Date: 2025-07-24  
> Status: Draft / Proposal  

---

## 1. Executive Summary

A **combat sandbox** is a dev/admin feature room in Refuge where designers can spawn creatures, tweak stats, and fight — without affecting live game state. It piggybacks on the existing feature-room + command-dispatch architecture with minimal new plumbing.

**Key design choice:** The sandbox is a *feature room type* inside persistent zones (like The Refuge), not a separate Colyseus room. It reuses the zone's tick loop, CombatSystem, and CreatureManager — but with an isolated "sandbox context" that prevents leaking state.

---

## 2. Architecture Analysis

### 2.1 Command Dispatch Pipeline

The command flow is clean and extensible:

```
Client → COMMAND message → ZoneRoom.handleCommandMessage()
  → parseCommand() (parser.ts — aliases, KNOWN_VERBS whitelist)
  → handleCommand() (commands/index.ts — feature-gate check, then registry lookup)
  → CommandHandler(ctx) → CommandResult
  → ZoneRoom.deliverResult() → NARRATE message to client
```

**Feature-gated commands** live in the `featureHandlers` map:
```ts
featureHandlers.set('board', { handler: handleBoard, requiredRoomType: 'feature_expedition_board' });
featureHandlers.set('stash', { handler: handleStashView, requiredRoomType: 'feature_stash' });
featureHandlers.set('rent',  { handler: handleRent, requiredRoomType: 'feature_inn' });
```

The pattern is: register verb → handler + required room type. If the player isn't in the right room, they get `"You can't do that here."` This is exactly what we need.

### 2.2 Dev Command Precedent

`goto` and `teleport` already demonstrate dev-gated commands:
- Registered in the global `handlers` map (not `featureHandlers`)
- Gated by `getConfig().devModeEnabled` inside the handler itself
- Available in any room, any zone

The sandbox needs **both** gates: room-type gate (you must be in the arena) + dev-mode gate (only when DEV_MODE_ENABLED).

### 2.3 Room Types & Feature Rooms

Room types are a shared union in `packages/shared/src/room-graph.ts`:
```ts
export type RoomType =
  | 'entry' | 'boss' | 'corridor' | 'junction' | 'dead_end'
  | 'feature_stash' | 'feature_expedition_board' | 'feature_marketplace'
  | 'feature_crafting' | 'feature_training' | ...
```

Any type starting with `feature_` is auto-detected by `isFeatureRoomType()`. Adding `feature_sandbox` follows the convention perfectly.

### 2.4 Zone & Tick Architecture

- **Tick loop:** `ZoneRoom.update()` runs every 1000ms via `setSimulationInterval`.
- **Non-combat zones** (hub/social/dev categories) skip combat and creature ticking:
  ```ts
  const isNonCombatZone = this.isZone && this.zoneData &&
    (category === 'hub' || category === 'faction_hub' || category === 'social' || category === 'dev');
  ```
- The Refuge is category `'dev'` — so **combat is already disabled zone-wide**. This is a problem for the sandbox, which needs combat.

### 2.5 Creature System

`CreatureManager` handles spawn, tick, and loot. Key methods:
- `spawnCreatures(roomGraph, template, prng)` — procedural spawn
- `spawnCreaturesFromZone(zoneData)` — zone NPC definitions
- `getCreaturesInRoom(roomId)` — room query for look/combat

Currently creatures are spawned at zone creation time. The sandbox needs **on-demand spawning** at runtime.

---

## 3. Proposed Design

### 3.1 New Room Type: `feature_sandbox`

Add to the `RoomType` union in `packages/shared/src/room-graph.ts`:
```ts
export type RoomType =
  | 'entry' | 'boss' | 'corridor' | 'junction' | 'dead_end'
  | 'feature_stash' | 'feature_expedition_board' | ...
  | 'feature_sandbox';  // ← NEW
```

Mirror in `packages/server/src/generator/RoomGraph.ts`.

### 3.2 Sandbox Commands

Create a new handler file: `packages/server/src/commands/handlers/sandbox.ts`

Sub-commands dispatched from a single `sandbox` verb:

| Command | Description | Example |
|---------|-------------|---------|
| `sandbox spawn <creature>` | Spawn creature from template registry | `sandbox spawn drowned_revenant` |
| `sandbox spawn <creature> <count>` | Spawn multiple | `sandbox spawn drowned_revenant 3` |
| `sandbox kill all` | Despawn all sandbox creatures in room | `sandbox kill all` |
| `sandbox stats <target> <stat> <value>` | Override a stat | `sandbox stats self hp 999` |
| `sandbox reset` | Reset player to default stats, clear encounters | `sandbox reset` |
| `sandbox list` | List all creatures in room with stats | `sandbox list` |
| `sandbox log` | Show recent combat events | `sandbox log` |

**Access control:** Double-gated.
1. `featureHandlers` gate — must be in a `feature_sandbox` room
2. `devModeEnabled` check inside the handler — hard block in production

```ts
// commands/index.ts — registration
featureHandlers.set('sandbox', { handler: handleSandbox, requiredRoomType: 'feature_sandbox' });

// commands/handlers/sandbox.ts — handler
export function handleSandbox(ctx: CommandContext): CommandResult {
  if (!getConfig().devModeEnabled) {
    return { narrations: [{ text: 'The arena is dormant.', type: 'system' }] };
  }
  const subcommand = ctx.args[0]?.toLowerCase();
  // dispatch to spawn/kill/stats/reset/list/log...
}
```

### 3.3 Parser Registration

Add `'sandbox'` to `KNOWN_VERBS` in `commands/parser.ts`.

### 3.4 Sandbox State Management

The sandbox needs isolated combat state that doesn't leak into the zone. Two approaches:

**Option A: Shared CombatSystem (Recommended)**  
Reuse the zone's existing CombatSystem and CreatureManager. Sandbox creatures are regular creatures spawned into the sandbox room. The tick loop processes them normally.

**Problem:** The Refuge is category `'dev'`, which skips `tickCreatures()` and combat resolution.

**Fix:** Change the `isNonCombatZone` guard to check room-level, not zone-level:
```ts
// Before: zone-wide combat skip
if (!isNonCombatZone && this.combatSystem.hasActiveEncounters()) { ... }

// After: skip only if NO sandbox rooms have active entities
const hasSandboxCombat = this.combatSystem.hasActiveEncounters();
if ((!isNonCombatZone || hasSandboxCombat) && this.combatSystem.hasActiveEncounters()) { ... }
```

A cleaner approach: make the `isNonCombatZone` check per-room by tracking which rooms are sandbox rooms, and only ticking creatures/combat in those rooms. This avoids enabling combat zone-wide.

**Option B: Isolated Sandbox CombatSystem**  
Create a second `CombatSystem` instance owned by the sandbox. Cleaner isolation but duplicates tick integration.

**Recommendation:** Option A with per-room gating. The CombatSystem already tracks encounters per-room. We just need to selectively tick creatures in sandbox rooms even when the zone is non-combat.

### 3.5 Selective Combat Ticking

Introduce a room-level combat opt-in tracked in ZoneRoom:

```ts
// ZoneRoom — new field
private sandboxRoomIds = new Set<string>();

// In update(), replace the blanket skip:
private update(_deltaTime: number): void {
  // ...
  const hasSandboxActivity = this.sandboxRoomIds.size > 0 &&
    this.combatSystem.hasActiveEncounters();

  // Creature AI tick — sandbox rooms always tick, others follow zone rules
  if (!isNonCombatZone || hasSandboxActivity) {
    this.tickCreatures();  // filter to sandbox rooms internally
  }

  // Combat resolution
  if ((!isNonCombatZone || hasSandboxActivity) && this.combatSystem.hasActiveEncounters()) {
    const tickResult = this.combatSystem.resolveTick();
    // ... deliver results ...
  }
}
```

The `sandboxRoomIds` set is populated at zone init by scanning for `feature_sandbox` rooms.

### 3.6 CreatureManager Extension

Add a public method for on-demand spawning:

```ts
// CreatureManager
spawnCreatureInRoom(templateId: string, roomId: string, count?: number): Creature[] {
  const template = resolveCreatureTemplate(templateId);
  if (!template) return [];
  const spawned: Creature[] = [];
  for (let i = 0; i < (count ?? 1); i++) {
    const creature = this.createCreatureFromTemplate(template, roomId);
    this.creatures.set(creature.id, creature);
    spawned.push(creature);
  }
  return spawned;
}

/** Despawn all creatures in a specific room. */
clearCreaturesInRoom(roomId: string): number {
  let count = 0;
  for (const [id, creature] of this.creatures) {
    if (creature.currentRoomId === roomId) {
      this.creatures.delete(id);
      count++;
    }
  }
  return count;
}
```

### 3.7 CommandContext Extension

Add sandbox-specific context fields:

```ts
export interface CommandContext {
  // ... existing fields ...
  /** Creature manager for sandbox spawning (available in feature_sandbox rooms). */
  creatureManager?: CreatureManager;
  /** All creature templates (for sandbox listing). */
  creatureTemplates?: CreatureTemplate[];
}
```

`buildCommandContext()` in ZoneRoom populates these only when the player is in a `feature_sandbox` room.

### 3.8 Integration with CombatSystem

The sandbox handler calls `combatSystem` methods already available on the context:
- `ctx.combatSystem.register(combatant)` — when spawning (uses existing `createCombatant()`)
- `ctx.combatSystem.removeFromCombat(id)` — when despawning

The handler builds `Combatant` objects from the spawned `Creature` data, same as the attack handler does today.

---

## 4. Room Placement

### 4.1 Refuge Layout Integration

Add a sandbox room to The Refuge's layout. The fallback graph (`createFallbackRefugeGraph()`) and DB seed both need updating.

**Fallback graph** (ZoneRoom.ts):
```ts
rooms.set('sandbox-arena', {
  id: 'sandbox-arena',
  name: 'The Sandbox Arena',
  description: 'A warded chamber where reality bends to the designer\'s will. '
    + 'Test dummies and spawn circles line the floor. '
    + 'What happens here, stays here.',
  type: 'feature_sandbox',
  exits: new Map([['south', 'training-grounds']]),
  items: [],
});
// Add reverse exit from training-grounds → sandbox-arena (north)
```

### 4.2 DB Migration

New migration `005_sandbox_arena.sql`:
```sql
-- Add sandbox arena room to The Refuge
INSERT INTO zone_rooms (zone_id, slug, name, description, type, properties, npcs, loot_containers, hazards)
SELECT z.id, 'sandbox-arena', 'The Sandbox Arena',
  'A warded chamber where reality bends to the designer''s will. Test dummies and spawn circles line the floor. What happens here, stays here.',
  'feature_sandbox', '{}', '[]', '[]', '[]'
FROM zones z WHERE z.slug = 'the-refuge'
ON CONFLICT DO NOTHING;

-- Exit: training-grounds → sandbox-arena (north)
INSERT INTO zone_exits (zone_id, from_room_slug, direction, to_room_slug, locked, hidden)
SELECT z.id, 'training-grounds', 'north', 'sandbox-arena', false, false
FROM zones z WHERE z.slug = 'the-refuge'
ON CONFLICT DO NOTHING;

-- Exit: sandbox-arena → training-grounds (south)
INSERT INTO zone_exits (zone_id, from_room_slug, direction, to_room_slug, locked, hidden)
SELECT z.id, 'sandbox-arena', 'south', 'training-grounds', false, false
FROM zones z WHERE z.slug = 'the-refuge'
ON CONFLICT DO NOTHING;
```

---

## 5. File Structure

```
packages/shared/src/room-graph.ts          — Add 'feature_sandbox' to RoomType
packages/server/src/generator/RoomGraph.ts — Mirror RoomType addition
packages/server/src/commands/parser.ts     — Add 'sandbox' to KNOWN_VERBS
packages/server/src/commands/index.ts      — Register in featureHandlers
packages/server/src/commands/handlers/sandbox.ts  — NEW: sandbox command handler
packages/server/src/rooms/ZoneRoom.ts      — Sandbox room tracking, selective combat tick
packages/server/src/creatures/CreatureManager.ts  — spawnCreatureInRoom(), clearCreaturesInRoom()
packages/server/src/db/migrations/005_sandbox_arena.sql — NEW: Refuge room seed
```

---

## 6. Access Control Matrix

| Gate | Mechanism | When |
|------|-----------|------|
| Room type | `featureHandlers` map — `requiredRoomType: 'feature_sandbox'` | Always |
| Dev mode | `getConfig().devModeEnabled` check in handler | Always |
| Auth role | Future: check `player.role === 'admin'` | Phase 2 |
| Zone category | Sandbox rooms only in `'dev'` category zones | By convention |

**Phase 1:** Double-gated (room type + dev mode). Safe for production — the `feature_sandbox` room type won't exist in non-dev zones, and devModeEnabled defaults to false.

**Phase 2:** Add role-based gating once admin roles are integrated with the auth system.

---

## 7. Tick System Impact

| Concern | Decision |
|---------|----------|
| Same tick loop? | **Yes.** Sandbox combat runs on the zone's 1-second `setSimulationInterval`. No separate loop. |
| Performance risk? | **Minimal.** Sandbox is 1 room with O(10) creatures max. The tick already handles full zones. |
| Isolation? | Combat encounters are per-room. Sandbox creatures can't wander to non-sandbox rooms (no exits to combat-enabled areas). |
| Death handling? | Sandbox deaths should be non-penalizing. Add a `sandboxRoomIds.has(roomId)` check to skip death penalty, stash loss, and run-history recording. |

---

## 8. Combat Log Feature

Store recent combat events in a ring buffer for the `sandbox log` command:

```ts
// In sandbox handler state (module-level or on CommandContext)
const combatLogs = new Map<string, CombatEvent[]>(); // roomId → last N events

// After combat tick, capture events for sandbox rooms
if (sandboxRoomIds.has(event.roomId)) {
  appendToLog(event.roomId, event);
}
```

This gives designers a `sandbox log` command to review what happened tick-by-tick — essential for balance tuning.

---

## 9. Open Questions

1. **Should sandbox persist creature state across zone restarts?** Recommendation: No. Sandbox is ephemeral. Creatures despawn on zone restart. Keeps it simple.

2. **Should sandbox support PvP testing?** The CombatSystem already supports player-vs-player. No extra work needed — just spawn two players in the sandbox room and attack.

3. **Should sandbox allow stat override persistence?** Recommendation: No. Stat overrides are session-scoped. `sandbox reset` reverts to DB-loaded stats.

4. **Future: sandbox scripting?** A `sandbox script <filename>` command could replay a sequence of spawn/attack actions for automated balance testing. Out of scope for Phase 1.

---

## 10. Implementation Order

1. **Shared types** — Add `feature_sandbox` to RoomType (shared + server)
2. **Parser** — Register `sandbox` verb
3. **Command handler** — `sandbox.ts` with spawn/kill/list/reset sub-commands
4. **Command registry** — Wire into featureHandlers
5. **CreatureManager** — Add `spawnCreatureInRoom()` and `clearCreaturesInRoom()`
6. **ZoneRoom** — Sandbox room tracking, selective combat ticking, death penalty bypass
7. **Refuge layout** — Fallback graph + DB migration
8. **Tests** — Command dispatch, spawn/despawn, combat tick in sandbox rooms
