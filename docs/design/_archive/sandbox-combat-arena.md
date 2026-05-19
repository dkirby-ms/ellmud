# Design: Combat Sandbox Arena

**Author:** Elminster (Lead/Architect)  
**Date:** 2026-04-07  
**Status:** Proposal  
**Scope:** Dev/admin tool — NOT player-facing  

---

## 1. Problem Statement

Combat tuning requires fast iteration cycles: spawn a creature, fight it, observe damage numbers, adjust stats, repeat. Today, designers must enter a full adventure zone, find or wait for creatures, and have no way to control stat variables in real-time. Death means inventory loss and a respawn back to a stronghold. The feedback loop is measured in minutes when it should be seconds.

We need a **combat sandbox** — a controlled environment inside the Refuge where designers can:
- Spawn arbitrary creatures on demand
- Fight them with full combat system resolution
- Observe detailed combat logs and damage breakdowns
- Adjust creature and player stats mid-fight
- Reset state instantly
- Do all of the above with zero risk to player progression

---

## 2. Where It Lives

### 2.1 New Wing in the Refuge

The Refuge currently has 7 rooms in a hub-and-spoke layout anchored at `hearth`. The sandbox adds a **new wing** accessed from Training Grounds (thematic: "advanced training" area).

```
                    war-room
                       |
                       W
hearth ── N ── training-grounds ── N ── sandbox-lobby
  |                                        |
  E ── stash-alcove                   E ── sandbox-arena
  W ── expedition-board               W ── sandbox-stats-lab
  S ── market
         |
         E ── infirmary
```

New rooms:
| Room Slug | Name | RoomType | Purpose |
|---|---|---|---|
| `sandbox-lobby` | The Proving Grounds | `feature_sandbox` | Hub for sandbox commands: spawn, reset, list templates |
| `sandbox-arena` | The Arena | `feature_sandbox_arena` | Combat happens here. Full CombatSystem, creatures spawn here |
| `sandbox-stats-lab` | The Tuning Forge | `feature_sandbox_stats` | Stat inspection, adjustment, combat log review |

### 2.2 Why Three Rooms, Not One

Separation enforces clean state boundaries:
- **Lobby** is always safe. Designers browse and configure without being mid-combat.
- **Arena** runs a real CombatSystem instance. It's the only room with hostiles.
- **Stats Lab** provides read-only inspection and write-access to stat overrides, separate from active combat so stat changes can be prepared before the next test.

### 2.3 Why Feature Rooms, Not a Separate Zone

The Refuge is already a persistent dev zone with category `dev`. Sandbox rooms are feature rooms within it — same pattern as `feature_stash` or `feature_expedition_board`. This means:
- No new Colyseus Room type needed
- No new zone lifecycle to manage
- Sandbox commands are feature-gated to sandbox room types (existing pattern)
- All existing dev commands (`goto`, `teleport`, `peaceful`) work in the sandbox wing

---

## 3. New RoomTypes

Added to **both** type definitions (critical — they must stay in sync):

**`packages/shared/src/room-graph.ts`** — add to `RoomType` union:
```typescript
| 'feature_sandbox'
| 'feature_sandbox_arena'
| 'feature_sandbox_stats'
```

**`packages/server/src/generator/RoomGraph.ts`** — add to `RoomType` union:
```typescript
| 'feature_sandbox'
| 'feature_sandbox_arena'
| 'feature_sandbox_stats'
```

All three satisfy the `feature_` prefix convention, so `isFeatureRoomType()` returns `true` automatically. No changes needed to the feature-detection helpers.

---

## 4. State Isolation

This is the most important architectural constraint. Sandbox fights must **never** affect real game state.

### 4.1 Rules

| Concern | Sandbox Behavior | Rationale |
|---|---|---|
| **Loot drops** | No loot generated on creature death | Prevents item duplication |
| **XP / skill gain** | No XP awarded, no skill ranks gained | Prevents progression farming |
| **Player HP/death** | HP resets to max on leaving arena. No downed state, no corpse, no death penalty | Zero-consequence iteration |
| **Stash interaction** | Sandbox does not read/write player stash | Prevents accidental item loss |
| **Equipment** | Player's real loadout is used (read-only clone). Stat overrides are transient | Test with real gear without risk |
| **Run history** | No run record created | Not a real excursion |
| **Combat encounters** | Isolated CombatSystem instance per arena session | No bleed into zone-level encounter tracking |

### 4.2 Implementation: Sandbox Context Flag

The `CommandContext` gains an optional `sandboxMode?: boolean` flag. When `true`:
- `handleAttack` skips loot/XP/death-penalty hooks
- CombatSystem tick results are processed but filtered through a sandbox post-processor that strips progression side-effects
- The `DowningSystem` is replaced with a stub that auto-revives at 1 HP (or skipped entirely — designers can toggle)

### 4.3 Arena CombatSystem Instance

The arena room gets its own `CombatSystem` instance, scoped to `sandbox-arena` room ID only. It shares the same resolution code (damage formula, dodge, flee, abilities, positions, telegraphs) but its lifecycle is controlled by sandbox commands, not zone lifecycle.

On `sandbox reset`:
1. All encounters cleared
2. All creature combatants removed
3. Player combatant re-registered with fresh HP/stamina
4. Creatures despawned from room

---

## 5. Sandbox Commands

All commands are feature-gated to their respective sandbox room types.

### 5.1 Lobby Commands (`feature_sandbox`)

| Command | Args | Effect |
|---|---|---|
| `sandbox creatures` | — | List all available creature templates (type, name, stats summary) |
| `sandbox spawn <type> [count]` | creature type slug, optional count (default 1, max 5) | Spawn creature(s) in the arena room. Creates Creature instance from template and registers with arena CombatSystem |
| `sandbox reset` | — | Despawn all arena creatures, reset player HP, clear encounters |
| `sandbox status` | — | Show arena state: active creatures, encounter status, player HP |

### 5.2 Arena Commands (`feature_sandbox_arena`)

All standard combat commands work: `attack`, `strike`, `dodge`, `flee`, `target`, `position`. They resolve against the arena's CombatSystem exactly as they would in a real zone.

Additional sandbox-specific commands:

| Command | Args | Effect |
|---|---|---|
| `sandbox kill` | — | Instantly kill all creatures in the arena (for fast reset without leaving combat) |
| `sandbox heal` | — | Restore player HP/stamina to maximum |
| `sandbox spawn <type> [count]` | Same as lobby — also available mid-combat for adding creatures | |

### 5.3 Stats Lab Commands (`feature_sandbox_stats`)

| Command | Args | Effect |
|---|---|---|
| `sandbox log` | — | Display last combat encounter's full tick-by-tick log (damage values, dodge rolls, actions, positions) |
| `sandbox log <N>` | tick count | Display last N ticks of combat log |
| `sandbox set creature <stat> <value>` | stat name + numeric value | Override a stat on the *next* spawned creature (attack, defence, armour, hp, agility) |
| `sandbox set player <stat> <value>` | stat name + numeric value | Override player combat stat for sandbox only (does NOT persist) |
| `sandbox clear overrides` | — | Reset all stat overrides to template/loadout defaults |
| `sandbox info <creature-type>` | creature template slug | Display full stat block, abilities, loot table, position type |

---

## 6. Combat Log System

The sandbox needs detailed combat logging that doesn't exist in production (where we only emit narrated prose). The arena CombatSystem wraps tick resolution with a `CombatLogger` that records:

```typescript
interface CombatLogEntry {
  tick: number;
  timestamp: number;
  events: CombatLogEvent[];
}

interface CombatLogEvent {
  type: 'damage' | 'dodge' | 'flee' | 'death' | 'ability' | 'position' | 'telegraph' | 'heal';
  attackerId?: string;
  attackerName?: string;
  defenderId?: string;
  defenderName?: string;
  rawDamage?: number;
  finalDamage?: number;
  armourReduction?: number;
  dodgeChance?: number;
  dodgeRoll?: number;
  dodged?: boolean;
  action?: string;
  position?: string;
  flankingBonus?: number;
  abilityId?: string;
}
```

The logger is a simple ring buffer (last 200 ticks). The `sandbox log` command formats this into a readable table:

```
Tick 1: Player strikes Drowned Revenant → 10 raw, 8 final (2 armour)
Tick 1: Drowned Revenant strikes Player → 8 raw, 6 final (2 armour)
Tick 2: Player dodges (roll: 0.31, chance: 0.34) → DODGED
Tick 2: Drowned Revenant strikes Player → 8 raw, 6 final (2 armour)
```

This is the core value of the sandbox — **seeing the numbers** that the LLM normally obscures with prose.

---

## 7. Data Flow

```
Designer in Lobby                    Arena Room                 Stats Lab
─────────────────                    ──────────                 ─────────
sandbox spawn revenant ──→ CreatureManager.spawnSandbox()
                              │
                              ▼
                           Arena CombatSystem
                              │
                         attack revenant ──→ CombatSystem.initiateCombat()
                              │
                         [tick loop runs]
                              │
                              ▼
                           CombatLogger.record(tickResult)
                                                          ←── sandbox log
                                                          ←── sandbox set creature hp 500
sandbox reset ────────→ clear all state
```

---

## 8. Phased Implementation

### Phase 1: Minimum Viable Sandbox
**Goal:** Spawn a creature, fight it, reset. See damage numbers.

Scope:
- [ ] Add 3 RoomTypes to both type definitions
- [ ] Add migration: 3 rooms + exits in Refuge zone
- [ ] Implement `SandboxService` — manages arena creature lifecycle, stat overrides, combat log
- [ ] Implement sandbox commands: `spawn`, `reset`, `status`, `kill`, `heal`
- [ ] Feature-gate commands to sandbox room types
- [ ] Wire arena CombatSystem (isolated instance)
- [ ] State isolation: no loot, no XP, no death penalty, HP reset on arena exit
- [ ] Basic `sandbox log` — display raw damage numbers from last fight

**Estimated effort:** 2-3 sessions for implementation agent

### Phase 2: Tuning Tools
**Goal:** Adjust stats, compare builds, detailed combat analysis.

Scope:
- [ ] `sandbox set creature/player <stat> <value>` — transient stat overrides
- [ ] `sandbox info <creature-type>` — full template inspection
- [ ] Enhanced combat log: dodge chances, position bonuses, ability details
- [ ] `sandbox clear overrides` — reset to defaults
- [ ] `sandbox log` pagination (last N ticks)
- [ ] Multiple simultaneous creatures with individual stat overrides

**Estimated effort:** 1-2 sessions

### Phase 3: Scenario Builder
**Goal:** Reproducible test scenarios for regression testing combat changes.

Scope:
- [ ] `sandbox scenario save <name>` — serialize creature lineup + stat overrides + player overrides
- [ ] `sandbox scenario load <name>` — restore a saved configuration
- [ ] `sandbox scenario list` — show saved scenarios
- [ ] Deterministic PRNG seed for dodge/flee rolls (fully reproducible combat)
- [ ] `sandbox replay <scenario>` — auto-run a scenario with fixed inputs, output full log
- [ ] Scenario storage in DB or JSON files (persist across server restarts)

**Estimated effort:** 2-3 sessions

---

## 9. File Plan (Phase 1)

```
packages/shared/src/room-graph.ts          — Add 3 RoomType variants
packages/server/src/generator/RoomGraph.ts  — Add 3 RoomType variants (keep in sync)
packages/server/src/db/migrations/
  004_sandbox_rooms.sql                     — Add rooms + exits to the-refuge zone
packages/server/src/sandbox/
  SandboxService.ts                         — Core service: spawn, reset, stat overrides, logging
  CombatLogger.ts                           — Ring buffer for detailed tick logs
  index.ts                                  — Barrel export
packages/server/src/commands/handlers/
  sandbox.ts                                — All sandbox command handlers
packages/server/src/commands/index.ts       — Register sandbox commands in featureHandlers
packages/server/src/rooms/ZoneRoom.ts       — Wire SandboxService for sandbox room types
packages/server/src/__tests__/
  sandbox.test.ts                           — Unit tests for sandbox commands + isolation
```

---

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| State isolation leak (XP/loot awarded in sandbox) | Progression exploit | `sandboxMode` flag checked at every side-effect boundary. Test coverage for isolation. |
| RoomType drift between shared/server definitions | Type errors, runtime crashes | CI lint rule or shared source-of-truth (Phase 2: unify RoomType to shared package only) |
| Sandbox CombatSystem diverges from real CombatSystem | Sandbox results don't reflect real combat | Same CombatSystem class, same damage module. Sandbox only controls lifecycle, not resolution. |
| Performance: large creature counts in arena | Tick budget exceeded | Hard cap at 5 creatures per spawn command. Arena is single-room, O(1) room lookup. |

---

## 11. Open Questions

1. **Should sandbox be gated behind `DEV_MODE_ENABLED` like `peaceful`?** — Recommendation: yes. Sandbox commands check `getConfig().devModeEnabled` before executing. The rooms exist in the Refuge regardless, but the commands return "not available" on production.
2. **Should we support PvP sandbox?** — Not in Phase 1. Two players in the arena would test PvP, but the command set is designed for PvE iteration. PvP sandbox is a Phase 3+ consideration.
3. **Should the admin dashboard show sandbox?** — Not initially. The sandbox is command-driven (text interface). Admin dashboard integration is out of scope.

---

## 12. Decision

Sandbox rooms are **feature rooms inside the Refuge zone** — not a new zone type, not a new Colyseus Room class. This follows the established pattern (stash, expedition board, inn) and avoids architectural novelty. The combat resolution code is shared; only the lifecycle and side-effects differ.

Phase 1 is intentionally minimal: spawn, fight, see numbers, reset. If the tool proves useful (it will), Phases 2-3 expand from a solid foundation.
