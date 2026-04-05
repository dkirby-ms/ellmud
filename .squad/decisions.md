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
### 2026-04-05: Fire-and-Forget Pattern for Async Narration in Colyseus Hooks
**By:** Elminster (Lead/Architect) & Volo (Narrative Developer)
**Issues:** #292, #277

## Decision

LLM narration calls on critical path (player join, command response, state transitions) MUST use the **fire-and-forget pattern** instead of awaiting:

```typescript
// ✅ FIRE-AND-FORGET (correct)
this.generateNarration('event', playerId, roomId, fallback)
  .then((text) => {
    this.sendNarrate(client, { text, type: 'system', timestamp: Date.now() });
  })
  .catch((err) => {
    this.log(`Narration error: ${err}`);
  });
```

## Rationale

- **GDD §4.5 enforcement:** LLM never blocks critical path
- **Colyseus lifecycle:** `onJoin()` awaiting LLM calls adds 0-2000ms latency to player connection
- **UX impact:** Player sees "connecting..." spinner for 2+ seconds on first zone entry (cache miss)
- **Not critical:** Narration is optional enrichment. Game state (HP, items, position) is what matters
- **Client protocol:** Async narration already supported — client displays narration whenever it arrives
- **Fallback ready:** NarrationService has 2000ms timeout and template fallback — service handles errors gracefully

## When to Use

| Call Site | Critical? | Pattern |
|-----------|----------|---------|
| Entry narration (`onJoin`) | No | Fire-and-forget ✅ |
| Room description (`look` command) | Yes (user requested) | Await with timeout ✅ |
| Combat action narration | No | Fire-and-forget ✅ |
| Movement narration | No | Fire-and-forget ✅ |
| Sound/trace narration | No | Fire-and-forget ✅ |

**Key Principle:** "Await only when the user or game state depends on the result. Narration is flavor. Game state is truth. Never block truth waiting for flavor."

## Implementation Notes

- Always use `.catch()` to log errors — never swallow promise rejections
- Tests expecting narration: await 1000ms+ and search message arrays (order-independent)
- Exception: `look` command SHOULD await (user explicitly requested), but respect 2000ms timeout from NarrationService

## Team Impact

- **All:** When integrating async services into Colyseus rooms, ask: "Does this need to complete before the player can proceed?" If no → fire-and-forget
- **Drizzt/Jarlaxle:** When adding narration to other lifecycle events (death, zone collapse), use fire-and-forget for non-critical narration

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

---

### 2026-04-05: Ability System Architecture — Cooldowns, Stamina, Damage Model
**By:** Jarlaxle (Systems Dev)  
**Issue:** #279  
**PR:** #296 (pending review)

## Decision

The ability system (GDD §6.3) is implemented as a data-driven layer on top of the existing combat system with minimal invasive changes:

1. **Ability definitions** stored in a registry (Map) with id, type, cooldown ticks, stamina cost, and effects
2. **Stamina tracking** added to Combatant interface as optional fields (players only)
3. **Cooldown tracking** via `Map<abilityId, ticksRemaining>` per combatant
4. **Damage multipliers** passed through DamageOptions (e.g., Heavy Strike: 1.5x)
5. **Block reduction** implemented as flat armour bonus during stance resolution

## Rationale

**Why optional fields for stamina/cooldowns?**  
Creatures don't use the ability system in Phase 1 — only players have stamina and ability slots. Making these fields optional avoids memory waste and keeps the Combatant interface clean. Future creature abilities can set these fields when needed.

**Why cooldowns decrement at START of tick?**  
Cooldown represents "ticks remaining until usable". If set to 3 after use, the ability should be unavailable for the current tick, tick+1, tick+2, then usable at tick+3. Decrementing at start ensures cooldownTicks accurately reflects "how many ticks from now" rather than a confusing mix of "this tick or next tick".

**Why separate damageMultiplier from stance multiplier?**  
Stance multiplier (strike vs dodge: 0.5x) is a combat interaction rule. Damage multiplier (Heavy Strike: 1.5x) is an ability property. Separating them keeps damage calculation clean: `rawDamage = attack × abilityMult`, then `afterStance = rawDamage × stanceMult`, then `finalDamage = afterStance - (armour + block)`.

**Why Map for cooldowns instead of object?**  
TypeScript Maps provide cleaner semantics for dynamic ability IDs, better iteration, and no prototype pollution concerns. The cooldown map is never serialized (it's runtime-only combat state), so JSON compat isn't needed.

## Implementation Notes

**Completed in PR #296:**
- `abilities.ts`: AbilityDefinition, DEFAULT_ABILITIES registry, HEAVY_STRIKE/BLOCK/OBSERVE
- `CombatState.ts`: Combatant stamina/cooldown fields, QueuedAction.abilityId
- `damage.ts`: DamageOptions.damageMultiplier, DamageOptions.blockReduction, stance support for heavy_strike/block
- `index.ts`: Export all ability types and definitions
- `abilities.test.ts`: 18 tests (cooldown, stamina, fallback, edge cases)

**Pending (next PR after review):**
- `CombatSystem.validateAbilityAction()`: Check cooldowns/stamina, fallback to auto-attack if validation fails
- `CombatSystem.updateCooldowns()`: Decrement all cooldowns at tick start
- `CombatSystem.resolveEncounterTick()`: Integrate validation step, handle heavy_strike/block/observe actions
- Ability use narration (Heavy Strike messages, Block stance text)

## Team Impact

- **Regis (Frontend):** PlayerStateMessage already has stamina/maxStamina fields — these will be populated once CombatSystem integration is complete. Client can display ability bars with cooldown overlays using the cooldown tick values.
- **Volo (Narrative Dev):** Ability narration (Heavy Strike critical hit text, Block successful reduction text) integrates with fire-and-forget pattern from PR #292. Narration context should include damage dealt and ability name.
- **Drizzt (Engine Dev):** Threat generation will scale with ability damage multipliers (Heavy Strike = higher threat). Creature AI will select targets based on highest threat when multiple valid targets exist.
- **Minsc (Tests):** Existing combat tests continue to pass — ability system is additive. New ability tests are comprehensive but currently waiting on CombatSystem integration.

## Alternatives Considered

**Cooldown as "tick when usable again" (absolute timestamp):**  
Rejected because it requires tick-count state in every encounter and complicates cooldown display ("3 ticks remaining" is clearer than "usable at tick 47").

**Stamina as separate resource pool (not part of Combatant):**  
Rejected because stamina is combat state — it needs to be checked during tick resolution. Keeping it on Combatant avoids additional lookups and state synchronization.

**Block as stance multiplier instead of flat reduction:**  
GDD §6.3 specifies "damage reduction", implying flat. Using flat reduction makes Block distinct from Dodge (which uses multiplier). This also allows Block to synergize with high armour (stacking reductions).

---

### 2026-04-05: Threat/Aggro System for Creature Target Selection
**By:** Drizzt (Engine Dev)  
**Issue:** #281  
**PR:** #297 (pending review)

## Decision

The threat system (GDD §5.4) is implemented as a per-encounter ThreatTable that tracks damage-based threat generation and drives creature target selection:

1. **ThreatTable class** maintains threat scores per target (damage dealt = threat generated)
2. **Damage-based threat** scales 1:1 with damage inflicted (no multiplier in base system, but abilities can modulate)
3. **Target selection** picks highest-threat target as primary, with fallback to secondary targets if primary is dead/fled
4. **Multi-source threat** allows N players attacking = N threat sources (stacking)
5. **Cleanup on death/flee** automatically removes target from threat table

## Rationale

**Why damage = threat (1:1)?**  
Simplicity and alignment with GDD §5.4. Creatures prioritize whoever is hurting them most. This creates intuitive gameplay: "I attack the creature, it attacks me back." Secondary mechanics (armor reducing threat, abilities generating variable threat) can be layered later without changing core logic.

**Why ThreatTable is per-encounter?**  
Threat is local to the encounter. When a creature flees and despawns, its threat table is discarded. When a new creature spawns, it has a fresh table. This keeps state management simple and avoids cross-encounter contamination.

**Why highest threat = primary target (deterministic)?**  
Creatures should focus fire intelligently. "Whoever hurt me most" is intuitive and leads to emergent PvPvE dynamics (players cluster threat on one target, creature pursues, other players kite). Non-deterministic (random selection) would feel chaotic.

## Implementation Notes

**Completed in PR #297:**
- `threat.ts`: ThreatTable class with add/get/remove/cleanup methods
- `CombatState.ts`: Threat table wired into Encounter state (created on encounter start)
- `damage.ts`: Threat generation triggered after damage resolution
- `threat.test.ts`: 27 tests (basic threat, multi-source, cleanup, edge cases)

**Known issues (pending refinement):**
- Threat reset on flee: Should threat persist if creature re-engages? Current behavior clears on flee.
- Decay over time: Long encounters (10+ ticks) may need threat decay to prevent early players from being permanently focused.

**Pending (next PR after review):**
- `CombatSystem.resolveEncounterTick()`: Integrate ThreatTable into target selection
- Creature AI decision tree: Query highest threat at tick start, pursue primary target
- Integration with Jarlaxle's ability system: Heavy Strike generates 2x threat (configurable)
- Narration: "Creature focuses on {target}!" when threat shift detected

## Team Impact

- **Jarlaxle (Ability System):** Heavy Strike and other high-damage abilities can generate more threat (configurable per ability). Block reduces threat (defensive stance). Coordinate cooldown timing with threat focus shifts.
- **Volo (Narration):** Threat shifts ("The creature turns its gaze to you!") are high-drama moments worth narrating. Integrate with fire-and-forget pattern.
- **Regis (Frontend):** Threat values don't need to be exposed to client initially (creature focus is visible in combat messaging). Future: threat bar showing "how much threat do I have?" would be useful for PvPvE strategy.
- **Minsc (Tests):** Multi-creature encounters will inherit ThreatTable naturally. Tests should verify threat stacking across creature groups.

## Alternatives Considered

**Round-robin target selection:**  
Rejected because it ignores game state. Creatures would waste time attacking low-damage players instead of focusing pressure on the actual threat.

**Threat as exponential (damage^2, etc.):**  
Rejected because it overweights early damage. Better to keep threat linear and modulate via abilities (Heavy Strike = 2x threat multiplier).

**Player-visible threat bar:**  
Considered for future (UI shows "creature is focusing on you at 75%"). Deferred to Phase 2 because it adds frontend complexity and isn't critical for Phase 1 PvPvE gameplay.
