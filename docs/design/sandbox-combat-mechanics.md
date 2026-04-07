# Sandbox Arena — Combat Mechanics Proposal

**Author:** Jarlaxle (Systems Dev)  
**Date:** 2026-07-25  
**Status:** Proposal  
**Requested by:** dkirby-ms

---

## 1. Executive Summary

A sandbox combat arena for Refuge that lets designers rapidly test creature stats, weapon balance, ability timing, and combat flow without touching live game state. The arena runs an isolated `CombatSystem` instance with full per-tick introspection, stat overrides, and encounter replay.

---

## 2. Existing Combat System Analysis

### 2.1 Architecture (CombatSystem.ts, ~1170 lines)

The combat system is a **tick-based simultaneous-resolution engine**:

| Concept | Implementation |
|---|---|
| **Tick rate** | 1-second ticks, driven by `ZoneRoom.update()` |
| **Resolution** | Simultaneous — all damage calculated from start-of-tick HP, applied at once |
| **Actions** | `strike`, `heavy_strike`, `dodge`, `block`, `observe`, `flee`, `use_item`, `skill` |
| **Default** | No input defaults to auto-attack current target (not dodge as GDD originally stated — updated in implementation) |
| **Encounters** | Room-scoped. Multiple combatants per encounter. Encounter ID tracks membership. |
| **Determinism** | Configurable `RollFn` for dodge/flee. Default: always-fail-dodge for tests. |

### 2.2 Damage Pipeline

```
rawDmg = attackerAttack × abilityMultiplier
afterStance = rawDmg × stanceMultiplier(attacker, defender)
    strike vs strike = 1.0×
    strike vs dodge  = 0.5×
    strike vs block  = 1.0× (flat reduction instead)
    strike vs flee   = 1.0×
baseDmg = max(1, afterStance - armour - blockReduction)
finalDmg = floor(baseDmg × flankingBonus)
→ Dodge roll: if defenderAction=='dodge' && roll < dodgeChance → finalDmg = 0
```

**Dodge chance:** `min(75%, 20% + 2%×AGI + 3%×dodgeSkillRank)`

### 2.3 Combatant Stats

From `CombatState.ts`, a `Combatant` has: `hp`, `maxHp`, `attack`, `defence`, `armour`, `agility`, `dodgeSkillRank`, `evasionSkillRank`, `level`, `stamina`, `maxStamina`, `abilityCooldowns`, `position` (front/flank/rear), `positionCooldown`.

Default player: `HP:100 ATK:10 DEF:5 ARM:2 AGI:5 STA:100`

### 2.4 Position System (GDD §6.11)

Three spatial zones: **Front**, **Flank**, **Rear**.

- Melee creatures (front/flank) can hit front/flank but not rear
- Ranged and boss creatures hit any position
- Skirmisher repositions aggressively to chase highest-threat target
- Flanking bonus: +15% damage from flank when target is focused on a front combatant
- Reposition cooldown: 3 ticks

### 2.5 Creature Templates

Five templates exist: `drowned_revenant` (50HP/10ATK/3ARM), `gutterspawn` (15HP/5ATK/0ARM/7AGI), `rubble_scavenger`, `hollow_stalker`, `the_collapsed_one` (boss: 150HP/18ATK/10ARM).

Templates resolved via `ContentRegistry` (DB-backed) with hardcoded fallbacks. `CreatureManager.spawnSingleCreature()` already supports runtime admin spawning.

### 2.6 Abilities

Three player abilities: **Heavy Strike** (1.5× dmg, 3-tick CD, 15 stamina), **Block** (flat -5 reduction, 2-tick CD, 10 stamina), **Observe** (reveal stats, 0 CD, 5 stamina).

Creatures have **telegraphed abilities** with wind-up ticks (e.g., Crushing Blow: 18 dmg, 3-tick wind-up).

### 2.7 Existing Dev Tools

- `/peaceful` — toggle creature aggro immunity (gated by `devModeEnabled`)
- `/goto <room-slug>` — teleport to any room (gated by `devModeEnabled`)
- `/teleport <player>` — teleport another player to you

### 2.8 Death & Downing

`DowningSystem` — players at 0 HP enter downed state (10-tick bleed-out). Stabilization costs 2 ticks + bandage. No XP/progression system exists yet (Phase 1).

---

## 3. Sandbox Command Design

All sandbox commands are gated behind `devModeEnabled` (same as `/peaceful`, `/goto`). The sandbox operates **within a room** — creatures spawn in the player's current room.

### 3.1 `/sandbox spawn <creature_type> [count]`

Instantly spawn test creatures into the player's current room.

```
/sandbox spawn drowned_revenant       → 1 Drowned Revenant
/sandbox spawn gutterspawn 3          → 3 Gutterspawn
/sandbox spawn the_collapsed_one      → 1 The Collapsed One (boss)
```

**Implementation:**
- Uses `CreatureManager.spawnSingleCreature(template, roomId)` — already exists
- Creatures are tagged `sandbox: true` on the `Creature` instance (new field)
- Sandbox creatures are excluded from repop cycles
- Creatures auto-register with `CombatSystem` when spawned (no need to wait for behavior tick)
- Optionally supports an inline stat override: `/sandbox spawn drowned_revenant --hp 200 --atk 25`

**Template resolution:** Use `resolveCreatureTemplate(id)` from `ContentRegistry` → fallback templates. List available templates with `/sandbox list creatures`.

### 3.2 `/sandbox set <target> <stat> <value>`

Override combat stats at runtime for rapid tuning.

```
/sandbox set self hp 500              → Set your HP to 500
/sandbox set self attack 50           → Set your attack to 50
/sandbox set drowned_revenant atk 20  → Override all sandbox Drowned Revenants' attack
/sandbox set all armour 0             → Strip all combatants' armour
```

**Valid stats:** `hp`, `maxhp`, `attack` (`atk`), `defence` (`def`), `armour` (`arm`), `agility` (`agi`), `stamina` (`sta`), `dodgeskillrank`, `evasionskillrank`, `level`

**Implementation:**
- Modifies the `Combatant` record in `CombatSystem` directly
- For creature-type targets, iterates all sandbox creatures of that type
- Changes are volatile — lost on sandbox reset or encounter end
- Store original values in a `Map<string, Partial<Combatant>>` for restore

### 3.3 `/sandbox log [verbose]`

Toggle detailed per-tick combat logging for the player.

```
/sandbox log             → Enable combat log (default: summary)
/sandbox log verbose     → Enable verbose mode (full damage calc breakdown)
/sandbox log off         → Disable
```

**Summary mode output per tick:**
```
[Tick 3] You → Drowned Revenant: STRIKE 8 dmg (10×1.0 - 2 arm) [42/50 HP]
[Tick 3] Drowned Revenant → You: STRIKE 4 dmg (10×0.5 - 2 arm) [96/100 HP] (you dodged stance)
```

**Verbose mode adds:**
```
  raw=10 ×abilityMult=1.0 ×stanceMult=0.5 -armour=2 -block=0 =base=3 ×flank=1.0 =3
  dodgeChance=30% roll=0.72 → HIT
  threat: +8 on Drowned Revenant's table (total: 24)
```

**Implementation:**
- Add a `sandboxLogLevel: 'off' | 'summary' | 'verbose'` field to `PlayerState`
- After `CombatSystem.resolveTick()`, intercept the `TickResult` and format detailed narrations
- The `CombatSystem.debug()` method already logs internally — sandbox log hooks into the same data flow but routes to the player's narration channel instead of `console.log`
- Verbose mode requires exposing intermediate `DamageResult` values; `calculateDamage()` already returns `rawDamage`, `multiplier`, `armourReduction`, `finalDamage`, `dodged` — sufficient for verbose output

### 3.4 `/sandbox reset`

Clean slate — kill all sandbox creatures, heal player, clear combat state.

```
/sandbox reset           → Reset arena
```

**Actions:**
1. Remove all creatures tagged `sandbox: true` from `CreatureManager`
2. Remove their combatant records from `CombatSystem`
3. End any active encounters containing only sandbox entities
4. Restore player HP/stamina to max
5. Restore any stat overrides to original values
6. Clear downing state if player is downed
7. Clear sandbox combat log

### 3.5 `/sandbox replay`

Re-run the last encounter with the same (or modified) parameters.

```
/sandbox replay                      → Exact replay
/sandbox replay --seed 42            → Replay with fixed RNG seed
```

**Implementation:**
- Before each sandbox encounter, snapshot the **encounter params**: creature types, counts, stat overrides, player stats, RNG seed
- Store in a `SandboxEncounterSnapshot` on `PlayerState`
- `/sandbox replay` re-spawns creatures from the snapshot and re-applies stat overrides
- Combined with `/sandbox set`, this creates a tight iteration loop:
  1. `/sandbox spawn drowned_revenant 2` → fight
  2. `/sandbox set drowned_revenant atk 15` → tweak
  3. `/sandbox replay` → re-fight with new stats

**Snapshot structure:**
```typescript
interface SandboxEncounterSnapshot {
  creatures: Array<{ templateId: string; statOverrides?: Partial<CombatStats> }>;
  playerStatOverrides?: Partial<CombatStats>;
  rngSeed?: number;
}
```

### 3.6 `/sandbox speed <multiplier>`

Adjust tick resolution speed for observation.

```
/sandbox speed 0.25      → Quarter speed (4 seconds per tick)
/sandbox speed 1         → Normal (1 second per tick)
/sandbox speed 4         → Fast-forward (250ms per tick)
```

**Implementation:**
- Sandbox speed only affects combat tick scheduling, not the rest of the zone
- Add a `sandboxTickMultiplier` field to the player's sandbox state
- In `ZoneRoom.update()`, when sandbox mode is active, accumulate a fractional tick counter and only resolve combat ticks at the adjusted rate
- Alternatively (simpler): The sandbox combat system runs on its own timer independent of the zone tick. A `setInterval` at the modified rate calls `sandboxCombatSystem.resolveTick()`
- **Recommendation:** Separate timer approach. Avoids contaminating the zone tick loop.

### 3.7 `/sandbox pause` / `/sandbox step`

Frame-by-frame combat debugging.

```
/sandbox pause           → Freeze combat ticks
/sandbox step            → Advance exactly 1 tick (while paused)
/sandbox resume          → Resume normal ticking
```

**Implementation:**
- When paused, the sandbox combat system's tick timer is suspended
- `/sandbox step` manually calls `resolveTick()` once and delivers the result
- This is extremely valuable for understanding multi-combatant interactions tick by tick

### 3.8 `/sandbox roll <mode>`

Control the RNG for dodge/flee rolls.

```
/sandbox roll fixed 0.5  → All rolls return 0.5 (always dodge if chance > 50%)
/sandbox roll always     → All rolls return 0.0 (always succeed dodge/flee)
/sandbox roll never      → All rolls return 1.0 (never dodge/flee — deterministic)
/sandbox roll random     → True PRNG (default)
/sandbox roll seed 12345 → Seeded PRNG for reproducible sequences
```

**Implementation:**
- The `CombatSystem` constructor already accepts a `RollFn: () => number`
- The sandbox combat system is constructed with a configurable `RollFn`
- `/sandbox roll` swaps the function at runtime

### 3.9 `/sandbox list [creatures|abilities|stats]`

Discovery command for available content.

```
/sandbox list creatures  → All creature templates with stats
/sandbox list abilities  → All abilities with costs/cooldowns
/sandbox list stats      → Current player combat stats
```

---

## 4. Isolation Architecture

### 4.1 Separate CombatSystem Instance

**Key design:** The sandbox runs its **own `CombatSystem` instance**, distinct from the zone's real combat system.

```
ZoneRoom
├── combatSystem        (real — handles live encounters)
├── sandboxCombatSystem (sandbox — isolated, per-player)
└── creatureManager     (shared, but sandbox creatures tagged)
```

- Sandbox encounters never touch the zone's `combatSystem`
- The sandbox system has its own tick timer (controllable via `/sandbox speed` and `/sandbox pause`)
- Combat events from the sandbox system are only delivered to the sandbox player

### 4.2 No XP/Loot Leakage

Currently there is no XP system (Phase 1), but the sandbox architecture must prevent future leakage:

1. **Sandbox creatures have `sandbox: true` flag** — the `defeated` event handler in `ZoneRoom` checks this flag and skips:
   - Loot generation (`CreatureManager.removeCreature()` returns loot — sandbox skips this)
   - XP grants (when implemented)
   - Kill tracking / run history
   - Corpse system registration
2. **Sandbox player state is snapshotted** before entering sandbox mode and restored on `/sandbox reset` or exit
3. **Loot table items are displayed in combat log** (for tuning visibility) but never added to inventory

### 4.3 Player State Snapshot

On sandbox activation:

```typescript
interface PlayerSnapshot {
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  attack: number;
  defence: number;
  armour: number;
  agility: number;
  inventory: Map<string, InventoryEntry>;  // frozen copy
  position: PositionZone;
  deathPenalty: DeathPenaltyDebuff | null;
}
```

Snapshot taken when first sandbox command is issued. Restored on `/sandbox reset` or when leaving sandbox mode.

### 4.4 Creature Instance Isolation

Sandbox creatures are **distinct from real zone creatures:**

| Property | Real Creatures | Sandbox Creatures |
|---|---|---|
| ID prefix | `creature-N` | `sandbox-creature-N` |
| `sandbox` flag | `false` / absent | `true` |
| Repop | Yes (respawn cycle) | No |
| Behavior tree | Full (idle→alert→hostile→flee) | Immediate hostile (skip patrol) |
| Loot generation | Yes | Display-only |
| Threat propagation | Zone-wide sound system | None (contained to room) |
| Visibility to other players | Yes | Only sandbox owner sees them |

---

## 5. Implementation Plan

### Phase 1: Core Sandbox (MVP)

| Task | Files | Effort |
|---|---|---|
| Add `sandbox` flag to `Creature` interface | `creatures/types.ts` | S |
| Create `SandboxState` type on `PlayerState` | `state/PlayerState.ts` | S |
| Create `sandbox` command handler with subcommand router | `commands/handlers/sandbox.ts` | M |
| Implement `spawn`, `reset`, `list` subcommands | `commands/handlers/sandbox.ts` | M |
| Wire sandbox CombatSystem per-player in ZoneRoom | `rooms/ZoneRoom.ts` | M |
| Register `sandbox` in command registry | `commands/index.ts` | S |
| Gate behind `devModeEnabled` | `commands/handlers/sandbox.ts` | S |

### Phase 2: Introspection

| Task | Files | Effort |
|---|---|---|
| Implement `log` subcommand with summary/verbose | `commands/handlers/sandbox.ts` | M |
| Add detailed damage breakdown to tick result | `combat/CombatSystem.ts` | M |
| Implement `set` stat override with restore map | `commands/handlers/sandbox.ts` | M |

### Phase 3: Time Control & Replay

| Task | Files | Effort |
|---|---|---|
| Implement `speed` with separate tick timer | `commands/handlers/sandbox.ts`, `rooms/ZoneRoom.ts` | M |
| Implement `pause` / `step` / `resume` | `commands/handlers/sandbox.ts` | M |
| Implement `replay` with encounter snapshots | `commands/handlers/sandbox.ts` | L |
| Implement `roll` RNG control | `commands/handlers/sandbox.ts` | S |

### Phase 4: Polish

| Task | Files | Effort |
|---|---|---|
| Hide sandbox creatures from other players | `rooms/ZoneRoom.ts`, `commands/handlers/look.ts` | M |
| Sandbox combat log formatting with colors/icons | Client-side | M |
| Admin UI integration (stat sliders, template picker) | Client-side | L |

---

## 6. Design Decisions & Rationale

### Why a separate CombatSystem instance (not a flag on the existing one)?

The existing `CombatSystem` is zone-scoped and manages encounters for all players in the room. Adding sandbox-awareness to every method (damage calc, flee resolution, encounter cleanup) would pollute the core combat loop with conditional branches. A separate instance is cleaner, testable, and can be garbage-collected when sandbox mode ends.

### Why not a separate "arena zone"?

A dedicated zone would require zone lifecycle management, matchmaking, and room graph generation — all overhead for what should be a rapid in-place testing tool. Spawning sandbox creatures in the player's current room (in Refuge or any zone) keeps the context close to real gameplay conditions.

### Why tag creatures rather than a separate creature manager?

The `CreatureManager` already handles spawning, room queries, and combat registration. Duplicating it for sandbox would mean duplicating the `look` command's creature listing, the combat initiation flow, and the behavior update loop. Tagging is cheaper and the `sandbox` flag provides a clean filtering point.

### Why snapshot rather than undo-log?

Player state is small and flat. A full snapshot is simpler than tracking individual mutations, especially when stat overrides can stack.

---

## 7. Open Questions

1. **Multi-player sandbox?** Current design is single-player. Should two players be able to co-op in the same sandbox encounter? If so, whose speed/pause controls take priority?
2. **Sandbox in production?** Currently gated by `devModeEnabled`. Should there be a `/sandbox` for players (training dummy in Refuge inn) with restricted features (no stat override, no speed control)?
3. **Creature AI in sandbox?** Should sandbox creatures run the full behavior tree (patrol, alert transitions) or always start in hostile state? Proposal: default hostile, but `/sandbox ai full` enables the full tree for AI testing.
4. **Persistence?** Should encounter snapshots persist across sessions (for sharing balance configs between designers)? Could use a simple JSON export/import.

---

## 8. Example Session

```
> /sandbox spawn drowned_revenant 2
Two Drowned Revenants materialize before you. [SANDBOX MODE]

> /sandbox log verbose
Combat logging: VERBOSE

> /sandbox speed 0.5
Tick speed: 0.5× (2 seconds per tick)

> attack drowned revenant
You lunge at Drowned Revenant — combat begins!

[Tick 1] You → Drowned Revenant: STRIKE 8 dmg
  raw=10 ×abilityMult=1.0 ×stanceMult=1.0 -armour=3 =base=7 →final=7
[Tick 1] Drowned Revenant → You: STRIKE 4 dmg
  raw=10 ×abilityMult=1.0 ×stanceMult=0.5 -armour=2 =base=3 →final=3
[Tick 1] Drowned Revenant (2) → You: STRIKE 4 dmg
  ...

> /sandbox pause
Combat paused.

> /sandbox set drowned_revenant atk 25
Drowned Revenant attack: 10 → 25 (×2 creatures)

> /sandbox step
[Tick 2] You → Drowned Revenant: STRIKE 7 dmg [35/50 HP]
[Tick 2] Drowned Revenant → You: STRIKE 12 dmg
  raw=25 ×1.0 ×0.5 -2 =10.5 →10
  (!) Damage increased significantly — consider armour scaling

> /sandbox reset
Arena cleared. HP restored to 100/100.

> /sandbox replay
Re-spawning: 2× Drowned Revenant (atk=25 override preserved)
```
