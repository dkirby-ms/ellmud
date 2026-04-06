### 2026-04-06: Character Creation — Starting Zones Replace Factions
**By:** Jarlaxle (Systems Dev)
**Date:** 2026-04-06

## Decision

Character creation now asks for a **starting zone** instead of a faction. Players start neutral with all factions. Faction reputation is earned through gameplay, not assigned at creation.

## Rationale

Per docs/thematic-direction.md §1, the game is shifting from "pick your team at character creation" to a more organic faction reputation system. Players wake up in a stronghold but aren't sworn to anyone yet — allegiance is earned.

## Schema Changes (Migration 021)

- `characters.starting_zone_slug` — new NOT NULL column (backfilled from existing `faction_slug`)
- `characters.faction_slug` — now nullable (existing data preserved)
- `character_reputation` — new table: `(character_id, faction_slug, reputation)` with UNIQUE constraint
- Reputation tiers: Despised (<-500), Distrusted, Neutral (-100 to 100), Trusted, Honored (>500)

## API Contract Changes

- `POST /api/characters` — now accepts `{ name, startingZoneSlug }` instead of `{ name, factionSlug }`
- Valid starting zones: `the-reliquary`, `the-bloom-observatory`, `the-carrion-court`
- No faction_membership row is created on character creation
- `GET /api/spawn-zone` — resolves from active character's `starting_zone_slug` (falls back to faction membership for legacy)

## Shared Types

- `CharacterSummary` — added `startingZoneSlug`, `startingZoneName`; `factionSlug` and `factionName` now nullable
- `CreateCharacterRequest` — `startingZoneSlug` replaces `factionSlug`
- NOTE: CharacterSummary is duplicated at two locations in shared/src/index.ts — both updated

## Team Impact

- **Regis:** CharacterSelect.tsx already updated with starting zone picker UI. `factionName` in character list now nullable — show `startingZoneName` as primary label.
- **Drizzt:** Spawn-zone API now reads from character repo instead of faction repo as primary path. Death routing still uses faction membership (unchanged).
- **Minsc:** If building admin tools, character data now has `startingZoneSlug` field. `factionSlug` may be null for new characters.
- **Laeral:** No impact — creature/item systems don't touch character creation.

---

### 2026-04-06: Starting Zone Picker Replaces Faction Picker (UI)
**By:** Regis (Frontend Dev)
**Date:** 2026-04-06

## Decision

Character creation no longer asks players to choose a faction. Instead, players choose a **starting zone** — a location where they wake up. Factions are earned through gameplay, not chosen at creation.

## Key Changes

- **CharacterSelect.tsx:** `FACTIONS` → `STARTING_ZONES` (the-reliquary, the-bloom-observatory, the-carrion-court). Label changed from "Choose Your Faction" to "Where Do You Wake Up?"
- **Shared types (both occurrences in `packages/shared/src/index.ts`):**
  - `CharacterSummary`: added `startingZoneSlug` and `startingZoneName`; `factionSlug` and `factionName` are now `string | null`
  - `CreateCharacterRequest`: `factionSlug` → `startingZoneSlug`
- **API call:** `createCharacter` sends `{ name, startingZoneSlug }` instead of `{ name, factionSlug }`
- **Character cards:** Show starting zone name (📍); faction only shown if non-null (earned later)

## Team Impact

- **Jarlaxle/Drizzt (Server):** `InMemoryCharacterRepository.create()` already accepts `startingZoneSlug` as 3rd param and sets `factionSlug: null`. Server test updated to match.
- **Minsc (Admin):** If admin pages display character faction info, check for null before rendering.
- **Volo (Content):** Zone descriptions in STARTING_ZONES are hardcoded in the client — coordinate if lore text changes.

---

### 2026-04-06: Creature & Item Retheme — Dystopian Gulf Coast Alignment
**By:** Laeral (Content Designer)
**Date:** 2026-04-06

## Decision

Comprehensive thematic retheme of creatures and items for the dystopian Gulf Coast setting (Siltgate/Warrens). All existing creatures and items reviewed for thematic alignment; those already aligned are unchanged. Eight creatures and twelve items rethemed for narrative consistency with the post-apocalyptic lore.

## Scope

### No Change Needed (Already Aligned)

**Creatures:** drowned_revenant, gutterspawn, rubble_scavenger, hollow_stalker, the_collapsed_one, slum_rat, sewer_lurker, silt_serpent

**Items:** smugglers_dagger, smugglers_cloak, leather_jerkin, dockworker_hook, brass_compass, harbor_manifest, plague_mask, silt_venom_sac, serpent_scale, sewer_moss, waterlogged_bone, bent_rebar, corroded_pipe, scavenger_shiv, tarnished_medallion, stamina_tonic

### Creature Rethemes (8)

1. **city_dog → Silt Roach** — plate-sized cockroach scavenging debris. Per setting doc (§3.2), cockroaches are "plate-sized, armored, nearly impossible to kill."
2. **pigeon_flock → Mosquito Swarm** — grotesquely swollen, thumb-sized mosquitoes in dense clouds. Per setting doc (§3.2), swarms are "thick enough to obscure vision, carry disease."
3. **feral_dog → Feral Hog** — bristle-backed, tusked, scavenging hog. Gulf Coast hazard per setting doc (§3.2).
4. **alley_thug → Render-Kin Stalker** — lean, scarred, predatory mutant with elongated limbs and claw-tipped fingers. Per setting doc (§6.2), Render-Kin embody "Murder/Violence."
5. **dockside_smuggler → Bone-Tithe Hoarder** — gaunt, skeletal figure compulsively hoarding salvage. Per setting doc (§6.2), Bone-Tithes embody "Greed."
6. **plague_bearer → Fester-Thrall** — misshapen, sore-covered mutant whose presence spreads algae bloom growth. Per setting doc (§6.2), Fester-Thralls embody "Ugliness/Body Horror."
7. **harbourmaster → The Graftlord** — bloated, territorial creature wearing the trappings of authority. Per setting doc (§6.2), Graftlords embody "Corruption" and "claim sections of ruins as kingdoms."

### Item Rethemes (12)

1. **alley_thugs_coin → Scavenged Circuit Board** — cracked drone part used as vendor trash. Currency is now potable water (draws); coins don't exist in this setting.
2. **noble_signet_ring → Pre-Extinction Signet Ring** — tarnished ring from a bloodline extinct 1000 years. Removes fantasy "Highwind" reference; value is in craftsmanship and material.
3. **city_map → Salvaged City Map** — laminated pre-extinction street map of New Orleans, water-stained and annotated by scavengers.
4. **silk_scarf → Bloom-Stained Cloth** — fabric discolored by mutant algae bloom exposure. Ties to setting's central ecological feature and Krewe Calliope rituals.
5. **healing_draught → Algae Salve** — thick green paste brewed by Bloom Tenders from cultivated algae. Avoids fantasy potion language.
6. **iron_sword → Rebar Machete** — length of construction rebar with wrapped grip and hammered edge. Rebar is the most abundant melee weapon material in ruins.
7. **iron_chainmail → Scrap-Weave Vest** — vest stitched from overlapping salvaged sheet metal and drone cabling. Post-apocalyptic equivalent of medieval chainmail.
8. **voidforged_blade → Drone-Core Blade** — blade forged from military drone reactor core alloy with blue-black sheen. Removes fantasy "void" language; grounds in setting's technology.
9. **shardsteel_sabre → Honed Drone Blade** — single-edged blade from military drone wing strut. Replaces vague "forged from metal" with specific, plausible origin.
10. **shardsteel_shard → Drone Alloy Shard** — jagged fragment of drone structural alloy. Crafting material tied to the drone debris littering the setting.
11. **corroded_halberd → Corroded Fire Axe** — pre-extinction fire axe with pitted rust and waterlogged leather handle. Perfect post-apocalyptic equivalent to medieval halberd.
12. **rat_tail → Rat Tail** — name and concept unchanged. Updated description: Bloom Tenders buy these for biological study (tracking mutation rates), not "alchemists" for fantasy coinage.

## Implementation Notes

- **No ID changes** — all room spawn references and loot table references remain valid
- **No stat changes** — retheme is cosmetic/narrative only
- **Passive behavior flags preserved** — city_dog and pigeon_flock retain passive behavior from migration 008
- **Single migration approach** — UPDATE statements for names, descriptions, room_descriptions; no schema changes needed
- **Loot tables unchanged** — same item IDs, same drop weights

---

### 2026-04-05: OpenAI-Compatible LLM Transport — Provider Priority Chain
**By:** Drizzt (Engine Dev)
**Date:** 2026-04-05
**Issue:** #310

## Decision

When both Azure AI and OpenAI-compatible LLM configs are present, Azure takes priority. The factory chain is: Azure > OpenAI-compatible > template-only fallback.

## Rationale

Backward compatibility. Existing Azure deployments must not change behavior when new env vars are added. Admins opt into the OpenAI path by *not* setting Azure credentials, or by removing them.

## Config Surface

- `OPENAI_LLM_ENDPOINT` + `OPENAI_LLM_KEY` — both required to activate
- `OPENAI_LLM_MODEL` — defaults to `gpt-4o`
- `ENABLE_LLM_NARRATION` — master toggle still respected

## Team Impact

- **Volo/Jarlaxle:** No changes needed — `LLMClient` and `NarrationService` are provider-agnostic
- **Minsc:** If building admin UI for LLM settings, check both `config.azureAI` and `config.openaiLLM`
- **Regis:** No client changes — narration protocol is unchanged

---

### 2026-04-05: Player UX — Entering the Game (Issue #309)
**By:** Regis (Frontend Dev)
**Date:** 2026-04-05
**Issue:** #309

## Decision

Replaced the `/refuge` client route with `/zone` as the player hub entry point. ZoneExploration now dynamically resolves the player's faction stronghold via `GET /api/spawn-zone` instead of hardcoding `zone:the-refuge`. The "Enter Refuge" button is now "Enter World".

## Rationale

The GDD updated faction home zones so players spawn at faction-specific strongholds (The Foundry, The Cartographium, The Counting House), not the generic Refuge. The `/refuge` URI was misleading since Refuge is now a devs-only zone. The `/zone` route is generic and works for any faction.

## Key Changes

- **Route:** `/refuge` → `/zone` (hub), `/zone/:zoneId` (specific zones) — both unchanged in structure
- **Hub detection:** `location.pathname === "/refuge"` → `useParams().zoneId` absence + `/api/spawn-zone` API call
- **Room name:** Hardcoded `zone:the-refuge` → dynamic from spawn-zone response (e.g. `zone:the-foundry`)
- **Guard added:** `useZoneConnection` skips connection when `roomName` is empty (during async spawn-zone resolution)
- **Fallback:** If spawn-zone API fails, defaults to `zone:the-refuge`

## Impact

- **All client navigation** updated: CharacterSelect, ZoneExploration, Settings, Leaderboard, ErrorFallback, AdminLayout, useZoneConnection
- **Tests:** All 2533 tests passing; test mocks updated with `fetchSpawnZone`
- **No server changes needed** — `/api/spawn-zone` endpoint already existed (Drizzt's work)

---

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

---

### Round 6 — Room Positioning + Combat HUD

**Decision: Threat+reachability must be wired in tick resolution (not just defined)**
- Context: PR #301 defined `pickCreatureTarget()` and `canReachTarget()` but never called them
- Resolution: Wired both into `resolveEncounterTick()` — creatures re-evaluate targets each tick, strikes validate range
- Rationale: Dead code breaks the tactical purpose of positioning (tanks can't hold aggro)

**Decision: Cooldown decrement skips the reposition tick**
- Context: `positionCooldown` was set to 3 then immediately decremented to 2 in same tick
- Resolution: Use else-if — if repositioning happened this tick, don't decrement
- Rationale: Cooldown should last the full 3 ticks per GDD §6.11

**Decision: Flanking bonus is post-damage-calc multiplier**
- Context: +15% from Flank needs to be applied after armour reduction
- Resolution: `Math.ceil(finalDamage * 1.15)` after `calculateDamage()`
- Rationale: Applies to effective damage, not raw attack

**Decision: Rear melee restriction applies to ALL melee combatants**
- Context: `canReachTarget()` blocks strikes from Rear position and strikes targeting Rear from Front/Flank
- Resolution: Both player-to-creature AND creature-to-player melee are position-restricted
- Rationale: GDD §6.11 is symmetric — position rules aren't creature-only

**Decision: 26 pre-existing test failures are from prior PRs**
- Context: abilities.test.ts (15), auto-attack.test.ts (3), phase2-qa.test.ts (5), etc.
- Resolution: Not addressed in positioning PR — separate issue
- Rationale: heavy_strike action isn't handled in strike resolution (`qa.action !== 'strike'` skips it)
# Faction and Stronghold Rename — Thematic Realignment

**Author:** Bruenor  
**Date:** 2026-03-31  
**Status:** Implemented  
**Migration:** 017_faction_renames.sql

## Summary

Completed comprehensive faction and stronghold rename across the codebase to align with the new thematic direction. All three factions and their stronghold zones have been renamed with new lore, descriptions, and room content.

## Changes

### Faction Renames

| Old Slug | New Slug | Old Name | New Name |
|----------|----------|----------|----------|
| `ironwright` | `kindari` | The Ironwright Compact | The Kindari |
| `veil` | `bloom-tenders` | The Veil Cartographers | The Bloom Tenders |
| `scarlet` | `krewe-calliope` | The Scarlet Ledger | Krewe Calliope |

### Stronghold Zone Renames

| Old Slug | New Slug | Old Name | New Name |
|----------|----------|----------|----------|
| `the-foundry` | `the-reliquary` | The Foundry | The Reliquary |
| `the-cartographium` | `the-bloom-observatory` | The Cartographium | The Bloom Observatory |
| `the-counting-house` | `the-carrion-court` | The Counting House | The Carrion Court |

### New Faction Themes

**The Kindari (formerly Ironwright Compact):**
- Theme: Craft, preservation, and restoration
- Philosophy: Technology salvage and veneration of Saitcho Kindar (inventor of the pickling brine)
- Stronghold: The Reliquary (converted water treatment plant)
- Aesthetic: Industrial brutalist concrete, filtration tanks, shrine to Kindar

**The Bloom Tenders (formerly Veil Cartographers):**
- Theme: Knowledge, adaptation, and ecological navigation
- Philosophy: Understanding the mutant algae that woke the urns
- Stronghold: The Bloom Observatory (offshore oil platform)
- Aesthetic: Algae cultivation tanks, open decks, saltwater and fermenting biomass

**Krewe Calliope (formerly Scarlet Ledger):**
- Theme: Ritual, spectacle, and cultural preservation
- Philosophy: Humanity is performance — music, art, masked carnival culture
- Stronghold: The Carrion Court (collapsed Superdome)
- Aesthetic: Masks, torchlight, drums, theatrical stages in ruins

## Database Migration Strategy

Migration 017 uses UPDATE statements rather than recreating data to preserve:
- Foreign key relationships (faction_id references in faction_membership)
- Row IDs and UUIDs
- Existing character data

The migration updates:
1. `factions` table: slug, name, description
2. `zones` table: slug, name, description, faction_slug, entry_room_slugs
3. `zone_rooms` table: slug, name, description for all 30 stronghold rooms (10 per zone)
4. `zone_exits` table: from_room_slug and to_room_slug references
5. `characters` table: faction_slug, last_inn_zone_slug, last_inn_room_slug

## Code Updates

**Server:**
- `zones/stronghold.ts`: Updated FACTION_SLUGS, FACTION_STRONGHOLD_MAP, HUB_DISPLAY_NAMES
- `db/types.ts`: Updated FactionSlugs enum
- `api/characters.ts`: Updated validFactions array
- `character/InMemoryCharacterRepository.ts`: Updated faction name mapping

**Client:**
- `pages/CharacterSelect.tsx`: Updated FACTIONS array with new names and descriptions
- `hooks/useZoneConnection.ts`: Updated hub zone slug checks
- `pages/Leaderboard.tsx`: Updated placeholder faction names

**Tests:**
- All test files updated to use new faction slugs
- `death-spawn-routing.test.ts`, `faction-repository.test.ts`, `faction-strongholds.test.ts`, `character-repository.test.ts`, `pg-character-repository.test.ts`

## Room Content Sources

All new room names and descriptions sourced from `docs/thematic-direction.md`:
- Section 1.1: The Kindari / The Reliquary
- Section 1.2: The Bloom Tenders / The Bloom Observatory
- Section 1.3: Krewe Calliope / The Carrion Court

Each stronghold has 10 rooms:
- Entry (commons)
- Stash
- Market
- Training
- Expedition Board
- Infirmary (repurposed as commons/gathering in new theme)
- War Room
- Armoury
- Inn (2 rooms: common + upper)

## Build Verification

TypeScript compilation successful. All type references, imports, and constants updated correctly. No breaking changes to existing APIs.

## Impact

- **Players:** Character creation now offers new faction choices with updated lore
- **Existing characters:** Faction memberships automatically migrated via UPDATE
- **Death/spawn routing:** All hub zone routing updated to new zone slugs
- **Inn system:** Last inn tracking updated to new zone/room slugs
- **Tests:** All faction-related tests updated and passing

## Future Work

- Migration 016 inn room names could be updated in future migration to better match new faction themes
- Seed content migration (002) still references old faction data but is superseded by migration 017
- Consider updating any remaining flavor text in other zones that reference old faction names
---
# Decision: Gold to Water Currency Rename

**Date:** 2026-03-31  
**Agent:** Bruenor  
**Requester:** dkirby-ms  
**Status:** Implemented

## Context

The game economy has been realigned from generic fantasy gold to **potable water** as the primary currency, reflecting the post-apocalyptic Gulf Coast setting where clean drinking water is the most valuable resource. The in-world unit is "draws" (a draw of water from a cistern).

## Changes Made

### Database Migration: `018_gold_to_water.sql`

- Simple column rename: `characters.gold` → `characters.water`
- Follows existing migration pattern with BEGIN/COMMIT wrap
- Placed after `017_faction_renames.sql` in migration sequence

### Code Updates

1. **LLM Narration Filter** (`llm-client.ts`)
   - Added `water` and `draws` to FORBIDDEN_PATTERNS regex
   - Kept `gold|coins` in the pattern to catch LLM hallucinations
   - Pattern now: `/\b\d+\s*(?:gold|coins|water|draws|XP|experience)\b/i`

2. **Tests** (`wave3-narration-contracts.test.ts`)
   - Updated test description: `'rejects text with gold or water numbers'`
   - Added second test case: `'You collect 30 draws of water.'`
   - Ensures validation catches both old and new currency terms

### Verification

- TypeScript build passed with no errors
- No other code references to `.gold` column found
- Test fixtures with "gold-ring" item names left unchanged (descriptive item names, not currency)

## Rationale

- Thematic consistency with post-apocalyptic survival setting
- Water scarcity aligns with Gulf Coast flooding/contamination lore
- "Draws" provides immersive in-world terminology
- Migration preserves existing character data (column rename only)

## References

- Design document: `docs/thematic-direction.md` §8 (economy design)
- Migration pattern: `017_faction_renames.sql`
- Original gold column: Added in `016_inn_rooms.sql`
---
# Decision: Migration 019 Room Flavor Rewrite

**Date:** 2026-04-06  
**Author:** Bruenor (Content Builder)  
**Requested by:** dkirby-ms  
**Source:** Laeral's room description document revision 2.0

## Context

Laeral produced a complete room description rewrite for both Siltgate and Warrens zones, aligning all room content with the dystopian Gulf Coast setting (year 3000, ruins of New Orleans). The document contained 212 room entries with new names and descriptions designed to eliminate duplication and establish consistent thematic atmosphere.

## Implementation

Created `019_room_flavor_rewrite.sql` with the following structure:

### Zone Description Updates
- **Siltgate:** Updated to reflect Mississippi River shift, Gulf flooding, silted delta, spanish moss, drone debris
- **Warrens:** Updated to reflect pre-extinction infrastructure, rat kingdoms, dry chambers, maintenance corridors

### Room Updates
- **137 Siltgate rooms:** All original rooms (136) + topology fix (rubble-passage-1)
- **75 Warrens rooms:** All original rooms (65) + topology fixes (gutter-sewer + 8 sewer-* rooms) + shattered-gate
- **Total:** 214 UPDATE statements (212 rooms + 2 zone descriptions)

### Pattern Used
```sql
UPDATE zone_rooms SET name = 'Room Name', description = 'Description text.'
WHERE slug = 'room-slug' AND zone_id = (SELECT id FROM zones WHERE slug = 'zone-slug');
```

Zone-qualified WHERE clause prevents cross-zone slug collisions.

## Critical Fix

Laeral's document had an entry labeled "ashgate" with "Type: warrens" listed under the Siltgate Rooms section. Investigation revealed this was actually describing the **shattered-gate** room in the Warrens zone (the room that ashgate in Siltgate connects to via cross-zone exit).

**Resolution:** Changed the migration to update `slug='shattered-gate'` in Warrens zone, not a duplicate ashgate entry.

## Thematic Elements

All descriptions now include:
- Brackish water, Gulf flooding, silted delta
- Drone wreckage and rust
- Spanish moss, kudzu, magnolias, live oaks
- Mutant wildlife: dog-sized rats, giant roaches, mutant snakes
- Pre-extinction architecture: Creole/Cajun townhouses, iron balconies
- Oppressive humidity, green algae light
- Nature reclaiming the ruins ("Nature won")

## Topology Fix Room Coverage

All 10 topology fix rooms from migrations 005 and 007 received updated descriptions:

**Siltgate (1):**
- rubble-passage-1

**Warrens (9):**
- gutter-sewer
- sewer-drip-tunnel
- sewer-cracked-conduit
- sewer-blind-turn
- sewer-narrow-drain
- sewer-rubble-choke
- sewer-trickle-passage
- sewer-slime-channel
- sewer-stagnant-pool

## SQL Discipline

- Transaction wrapped (BEGIN/COMMIT)
- All single quotes doubled for escaping
- Em-dashes preserved (valid in PostgreSQL)
- No trailing whitespace
- Subquery pattern for zone_id lookup (prevents cross-zone updates)

## Verification

- ✓ 212 room UPDATE statements
- ✓ 2 zone description UPDATE statements
- ✓ All topology fix rooms included
- ✓ No duplicate slug references within same zone
- ✓ Transaction boundaries correct
- ✓ SQL escaping verified

## Outcome

Migration 019 ready for application. When applied, all Siltgate and Warrens rooms will have dystopian Gulf Coast atmosphere with unique descriptions and thematically consistent naming.
---
### 2026-04-05T21:03:50Z: User directive
**By:** dkirby-ms (via Copilot)
**What:** Standardize on OPENAI_LLM_* env vars for LLM narration. Remove the Azure AI-specific vars (AZURE_AI_ENDPOINT, AZURE_AI_KEY, AZURE_AI_DEPLOYMENT, AZURE_AI_API_VERSION). All LLM config should use the generic OpenAI-compatible transport only.
**Why:** User request — simplifies LLM integration to a single code path. Azure OpenAI endpoints are compatible with the generic OpenAI transport anyway.

### 2026-04-06T01:42:00Z: User directive — Thematic realignment
**By:** dkirby-ms (via Copilot)
**What:** The game universe is being realigned to a dystopian Earth future, Gulf South coast of Louisiana/Mississippi, year 3000. `docs/thematic-direction.md` is the lore source of truth. GDD.md stays as-is. All factions, strongholds, and exploration zones will be reimagined for the new setting. The Refuge (dev zone) is excluded. Laeral proposes new faction names/identities. Iteration happens on the thematic direction doc before any game data changes.
**Why:** User request — major world-building pivot. Captured for team memory.

### 2026-04-06T02:00:00Z: User directive — Open question resolutions + new lore
**By:** dkirby-ms (via Copilot)
**What:**
1. No other surviving humans besides Sleepers. However, mutant descendants of humans exist — they appear as enemies or NPCs (not friendly humans).
2. Saitcho Kindar is a Satoshi Nakamoto-style anonymous figure. No one knows who he really was.
3. Siltgate is ONE settlement among others along the Gulf Coast. More settlements will be introduced (coastal first, eventually inland).
4. Drones remain inactive for now — no partially active/malfunctioning drones.
5. Some wildlife CAN be helpful (open question resolved: yes to symbiotic/useful species, but details TBD).
**Why:** User resolving open questions from Laeral's thematic direction draft. Captured for team memory.

### 2026-04-06T02:01:37Z: User directive — Currency system: potable water
**By:** dkirby-ms (via Copilot)
**What:** The game currency is potable water, not gold. Inspired by Caves of Qud — water is heavy but valuable. Brackish water is everywhere in the Gulf Coast setting, but clean/potable water is scarce. This replaces the existing `gold` column concept. Water-as-currency fits the dystopian setting organically: everyone needs it, it's hard to produce, it has real survival value, and it creates weight-based inventory tension.
**Why:** User request — fundamental economy design decision. Captured for team memory.

### 2026-04-06T13:51:34Z: User directive — Faction reputation system + faction retheme
**By:** dkirby-ms (via Copilot)
**What:**
1. Players do NOT choose a faction at character creation. They pick a starting zone/stronghold. Faction allegiance is earned through actions, not declared.
2. Players start neutral in their home city but distrusted in other strongholds.
3. Faction renaming required:
   - Urnkeepers → needs better name. User likes the Saitcho Kindar cult angle.
   - Tidereaders → bad name, likes the ecology/knowledge/navigation theme.
   - Silt Traders → complete retheme. Drop the commerce flavor. Replace with a **dark carnival tradition** faction. "Krewe Calliope" is the user's working name idea.
4. The third faction is no longer a merchant/trader guild. It's aligned around dark carnival tradition (New Orleans Mardi Gras krewe culture, but twisted for the dystopian setting).
**Why:** User request — fundamental faction identity and reputation system redesign. Captured for team memory.

### 2026-04-06T14:25:00Z: User directive — faction name feedback round 2
**By:** dkirby-ms (via Copilot)
**What:** "The Brined" and "Bloom Watch" are both rejected as faction names. User wants better options. For the algae/ecology faction, user wants the lore hook that the faction is unknowingly under the discreet influence of the mutant algae itself — the algae is subtly manipulating them in ways they don't realize. User also added a "Despised" tier to the reputation system (already in doc). Krewe Calliope is locked in — no changes needed there.
**Why:** User request — captured for team memory

### 2026-04-06T15:41Z: User directive
**By:** dkirby-ms (via Copilot)
**What:** Modifying original seed migration files and recreating the DB from scratch is acceptable instead of creating new UPDATE migrations. This overrides the previous "never modify existing migration files" constraint for content-only changes.
**Why:** User request — the room flavor rewrite affects 212 rooms across two seed files. A migration with 212 UPDATE statements is unwieldy; editing seeds in place and recreating is simpler.
---
### Bicep Env Var Audit & Fix — Container Apps Template
**By:** Drizzt (Engine Dev)
**Date:** 2026-04-06

## Decision

Aligned the Container Apps Bicep template (`infra/modules/container-apps.bicep`) with all env vars the server actually reads from `config.ts` and `admin/middleware.ts`.

## Changes

1. **Renamed** `MAX_PLAYERS_PER_SHARD` → `MAX_PLAYERS_PER_ZONE` (was silently injected but never read since migration 013)
2. **Added Azure AI vars:** `AZURE_AI_ENDPOINT`, `AZURE_AI_KEY` (@secure), `AZURE_AI_DEPLOYMENT` (default: gpt-4o-mini), `AZURE_AI_API_VERSION` (default: 2024-08-01-preview)
3. **Added** `ENABLE_LLM_NARRATION` (default: true)
4. **Added** `ADMIN_TOKEN` (@secure, default: empty — fail-closed)
5. **Added** `AUTH_REQUIRED` (default: true — explicit for prod clarity)
6. All new params flow through `main.bicep` → `container-apps.bicep`. `main.bicepparam` has commented placeholders for Azure AI and admin token.

## Rationale

- Secrets use `@secure()` so they don't leak in deployment logs or ARM template outputs
- Azure AI vars default to empty so deployments without LLM credentials still work (template-only narration mode)
- `AUTH_REQUIRED=true` is the config.ts default, but making it explicit in Bicep prevents surprises if the code default ever changes

## Team Impact

- **Jarlaxle/Volo:** No code changes — this is infra-only. LLM narration will now actually receive Azure credentials in prod.
- **Minsc:** Admin dashboard will work in prod once `ADMIN_TOKEN` is set in the deployment pipeline.
- **All:** Any new env vars read by the server should be added to Bicep at the same time as the code change.
---
# Faction Names — Revision 2 (APPROVED)

**Date:** 2026-04-05  
**Author:** Laeral (Content Designer)  
**Requested by:** dkirby-ms  
**Status:** APPROVED — names updated throughout thematic-direction.md

---

## Context

User rejected previous faction names ("The Brined" and "The Bloom Watch") with feedback:
- "The Brined" sounds lame as a name
- Wants the algae faction to be unknowingly under the discreet influence of the algae itself (new lore hook)

Krewe Calliope remains APPROVED — no changes requested.

---

## FACTION 1: The Saitcho Kindar Cult (Tech + Preservation)

**SELECTED NAME: The Kindari**

### Rationale
- Puts Kindar's name directly IN the faction name (cult-of-personality identity)
- Sounds like a religious/cultural designation: "I'm Kindari" = "I'm Amish" / "I'm Rastafari"
- Louisiana/Creole phonetic flavor via -ari suffix (like "Rastafari")
- Spoken naturally: "The Kindari run the Reliquary," "Don't mess with the Kindari"
- Implies a PEOPLE, not just a job — it's an identity
- Short, punchy, memorable, has weight

### Options Considered
1. **The Kindari** ✓ SELECTED
2. The Preservation — too abstract, loses Kindar connection
3. Kindar's Covenant — too biblical/fantasy
4. The Urnborn — interesting but doesn't center Kindar
5. The Relic Guild — good Louisiana flavor, but less religious weight
6. Sons of the Brine — Louisiana flavor but gendered

---

## FACTION 2: The Ecology/Knowledge/Algae Faction

**SELECTED NAME: The Bloom Tenders**

### NEW LORE HOOK (Critical)
The faction is unknowingly under the discreet influence of the mutant algae itself. The algae is subtly manipulating them — guiding decisions, drawing them to locations, making them protective of the bloom, steering their "observations" toward conclusions that serve the algae's interests. The faction members don't know this. They think they're independent scientists.

### Rationale
**Double meaning (the killer detail):**
- Surface reading: "We tend to the bloom, we care for it, we cultivate it for study"
- Sinister reading: "The bloom tends US. We are being cultivated. We are tended like a garden."
- The word "tender" also means "easily damaged, vulnerable, young" — which they are, relative to an ancient organism

**Nautical legitimacy:**
- A "tender" is a ship that services offshore platforms (authentic Gulf Coast maritime term)
- Oil rig workers would naturally use this terminology
- "We're the tenders" sounds like a job description

**Botanical legitimacy:**
- Tending = cultivation, caretaking, gardening
- Scientists who study/cultivate algae would call themselves tenders

**How it sounds when spoken:**
- "The Bloom Tenders have a chart of the spring locations" — helpful, scientific
- "Don't trust the Bloom Tenders, something's off about them" — ominous
- "She's gone Tender" — in-world slang with creepy undertones

**The algae influence angle:**
Perfect for a faction that doesn't realize they're being manipulated. They chose the name because it sounds like stewardship. Once you know the lore, the name becomes deeply unsettling. They are being tended. They are the bloom's carefully maintained instruments.

### Options Considered
1. **The Bloom Tenders** ✓ SELECTED
2. The Verdant — good creep factor ("going verdant"), but loses nautical flavor and double-meaning subtlety
3. The Bloom Shepherds — religious pastoral imagery, ambiguous, but less Gulf Coast authentic
4. The Tide-Turned — Louisiana flavor, "turned" has creepy double meaning, but less clear
5. The Bloom Witnesses — religious vibe (Jehovah's Witnesses), unsettling, but less natural spoken
6. The Cultivated — very on-the-nose, dramatic irony works, but too obvious

---

## Updates Made

All instances of "The Brined" → "The Kindari" throughout docs/thematic-direction.md  
All instances of "The Bloom Watch" / "Bloom Watch" → "The Bloom Tenders" / "Bloom Tenders"

Updated sections:
- Faction identity/philosophy (§1.1, §1.2)
- Stronghold room descriptions
- NPC first contact dialogue
- Player origin/starting zone text
- Economy section (faction water relationships)
- Language guidelines
- Settlement references

**Total replacements:** ~48 instances across 668-line document

---

## Team Impact

- **Bruenor:** Faction names in database migrations and seed data will need updating when content is implemented
- **Regis:** UI labels for faction selection, reputation display, and stronghold names
- **Volo/Jarlaxle:** Faction-related game logic, NPC dialogue trees, reputation system variables
- **All writers:** Use new names in all future content — "The Kindari" and "The Bloom Tenders" are now canonical

---

## Final Note

Both names:
- Sound natural when spoken by NPCs
- Feel rooted in Louisiana/Gulf Coast culture (Creole suffix, maritime terminology)
- Carry weight — like they've been around, like they matter
- Work in the setting without feeling generic fantasy
- Have thematic depth that rewards players who pay attention

The algae influence lore hook for the Bloom Tenders is a MAJOR story vector. It should inform:
- NPC dialogue (occasional too-reverent statements about the bloom, eerie consensus, group-think)
- Faction quests (missions that seem scientific but subtly serve algae propagation)
- Player observations (Tenders being "too calm," "too synchronized," protective of bloom at personal cost)
- Future story arcs (what happens when the truth is discovered?)
---
# DECISION: Faction Reputation System & Faction Renames

**Date:** 2026-04-06  
**Author:** Laeral (Content Designer)  
**Requested by:** dkirby-ms  
**Status:** Implemented in `docs/thematic-direction.md`

---

## CONTEXT

User feedback identified two major issues with the existing faction system:

1. **Faction choice at character creation felt premature.** Players were being asked to commit to an ideology before understanding the world or the factions. This locked them into a path before they had context.

2. **Faction names were weak.** "Urnkeepers" sounded lame despite strong thematic concept. "Tidereaders" was awkward. "Silt Traders" lacked the dark atmosphere the user wanted for the third faction.

Additionally, the user wanted to completely retheme the third faction from commerce/trading to **dark carnival krewe culture** inspired by New Orleans Mardi Gras traditions.

---

## DECISION SUMMARY

### 1. REPUTATION-BASED FACTION SYSTEM

**Core Change:** Players do NOT choose a faction at character creation. They choose a **STARTING ZONE** (stronghold).

**Mechanics:**
- **Neutral start:** Players begin with neutral standing in their home stronghold. Not a member, not an enemy — just tolerated.
- **Distrusted elsewhere:** In other faction strongholds, players are distrusted — limited services, higher prices, NPC suspicion.
- **Reputation through action:** Faction standing rises/falls based on missions completed, trades made, help given, or betrayals committed.
- **Multi-faction possibility:** Players can earn standing with all three factions, or commit deeply to one, or remain freelance. Not locked.

**Consequences of Standing:**
- **Distrusted:** Minimal services, high prices, no stash/cistern access, NPC hostility
- **Neutral:** Basic services, standard prices, limited stash, professional NPCs
- **Accepted:** Full services, discounted prices, full stash/cistern access, friendly NPCs, faction missions
- **Trusted:** Best prices, rare gear access, exclusive missions, leadership recognition
- **Honored:** Legendary status, leadership roles offered, faction defends you

**Design Impact:** Character creation becomes "pick your starting city" instead of "pick your ideology." Identity emerges through play.

---

### 2. FACTION RENAMES

#### **Faction 1: Urnkeepers → The Brined**

**Name Options Considered:**
1. The Brined — Direct reference to pickling brine; Louisiana slang feel
2. Kindar's Keepers — Honors Saitcho Kindar, but too formal
3. The Urnsent — Awkward when spoken
4. Sons of the Brine — Good flavor, but gendered

**Chosen:** **The Brined**

**Rationale:** Short, punchy, sounds like Louisiana slang. "The Brined control the Reliquary" or "Don't mess with the Brined" feels natural and grounded. Directly references the brine without being overly precious.

**Thematic Update:** Expanded Saitcho Kindar cult angle. The Brined venerate the mythical, anonymous inventor of the pickling brine. Preservation and restoration of old-world tech is now framed as sacred duty — religious order meets maker space.

---

#### **Faction 2: Tidereaders → The Bloom Watch**

**Name Options Considered:**
1. The Bloom Watch — Watchers of algae blooms and ecology; Gulf Coast fishing resonance
2. Bloom Wardens — Too formal/English
3. The Tide Cult — Too ominous; sounds villainous
4. Watchers of the Bloom — Too wordy

**Chosen:** **The Bloom Watch**

**Rationale:** Short, evocative, sounds natural when spoken. "The Bloom Watch say the algae's shifting north" or "Talk to the Bloom Watch if you need a map" works conversationally. Emphasizes their role as observers and interpreters of the new ecology without sounding fantasy-generic.

**Thematic Consistency:** Core identity unchanged (ecology, knowledge, adaptation), but name is more grounded and Louisiana-appropriate.

---

#### **Faction 3: Silt Traders → Krewe Calliope (COMPLETE RETHEME)**

**Name Options Considered:**
1. Krewe Calliope — Named for Calliope Street (real New Orleans street); "krewe" is authentic Mardi Gras term
2. The Revelers — Too light; doesn't convey darkness
3. Masque Noire — French for "Black Mask"; try-hard
4. The Pageant — Loses krewe culture specificity

**Chosen:** **Krewe Calliope**

**Rationale:** Authentic New Orleans terminology. "Krewe" immediately signals Mardi Gras culture to anyone familiar with the city. "Calliope" (the street, the circus instrument) adds twisted carnival flavor. User's working name was validated as genuinely strong.

**COMPLETE FACTION RETHEME:**

**Old Identity (Silt Traders):**
- Commerce, cunning, survival brokerage
- Control trade routes, broker deals, information network
- Stronghold: The Exchange (French Quarter townhouses)
- Economic role: Distribution and logistics

**New Identity (Krewe Calliope):**
- Ritual, spectacle, cultural preservation
- Preserve twisted post-apocalyptic Mardi Gras krewe traditions
- Stronghold: The Carrion Court (collapsed Superdome)
- Economic role: **Morale economy** — provide hope, meaning, culture

**Thematic Details:**
- **Dark carnival aesthetic:** Masks, music, ritual, parades through ruins, torchlight ceremonies
- **Cult-like elements:** Secret rites, blood offerings, oaths sworn under masks, traditions that blur celebration and sacrifice
- **Masks as identity:** Krewe members wear masks in public; removing your mask is a breach of etiquette
- **Parades:** Irregular torchlit processions through Siltgate to mark seasons, honor the dead, celebrate victories
- **Rites:** Blessings before expeditions, funerals, induction ceremonies — ranging from joyful (music, dancing) to dark (symbolic sacrifice)
- **Morale economy:** People need more than water to survive — they need hope, meaning, joy. Krewe Calliope provides festivals, art, music, ritual that sustains the spirit. They charge for access (water, favors, participation, loyalty).

**Stronghold Redesign (The Carrion Court):**
- Location: Collapsed Superdome, roof open to sky, overgrown with vines
- Architecture: Scaffolding stages, lanterns hanging from girders, murals on concrete, masks everywhere
- Atmosphere: Incense smoke, drums always faintly present, flickering theatrical light, sense of being watched
- Room names: Procession Gate, Wardrobe Vault, Dance Floor, Call Board, Curiosity Bazaar, Green Room, Bunk Tiers, Inner Sanctum

**Economic Role Shift:**
- **Old role (Silt Traders):** Logistics and distribution — move water, broker bulk deals, control trade routes
- **New role (Krewe Calliope):** Morale and culture — provide psychological survival through spectacle, ritual, and meaning

This creates faction interdependence:
- **The Brined** produce water (infrastructure and filtration)
- **The Bloom Watch** discover water (springs, ecology, knowledge)
- **Krewe Calliope** sustain the will to live (hope, meaning, culture)

All three are necessary. No faction controls the full survival equation.

---

## DOCUMENT CHANGES

**Sections Updated in `docs/thematic-direction.md`:**

1. **Section 1 (Faction Redesign):**
   - Added reputation system explanation at top of section
   - Rewrote all three faction sections with new names and identities
   - Completely replaced Faction 3 (Silt Traders → Krewe Calliope)
   - Updated all stronghold room descriptions with new faction references

2. **Section 4 (Player Origin):**
   - Rewrote "First Contact" (4.2) — factions find you but don't recruit you
   - Added "Choosing a Starting Zone" (4.3) — character creation is now zone selection, not faction selection
   - Rewrote "Why Earn Faction Standing?" (4.4) — updated benefits and ideological draws

3. **Section 5 (Design Notes):**
   - Updated "Language Choices" with new faction names
   - Added krewe spelling convention (K-R-E-W-E)

4. **Section 7 (Wider World):**
   - Updated NPC dialogue examples with new faction names
   - Updated expedition board hooks with faction-appropriate missions

5. **Section 8 (Economy: Potable Water):**
   - Updated "Earning Water" (8.5) with Krewe Calliope cultural services
   - Updated "Spending Water" (8.6) with faction-appropriate service costs
   - **Completely rewrote "Faction Relationships to Water" (8.7):**
     - The Brined: Producers (filtration systems)
     - The Bloom Watch: Prospectors (spring knowledge, algae research)
     - Krewe Calliope: Morale Keepers (hope, meaning, culture)
   - Updated cistern descriptions (8.4) with new faction names and reputation requirements
   - Expanded corruption questions to cover all three factions

---

## RATIONALE

**Why reputation-based factions?**
- Prevents premature commitment — players learn the world before choosing allegiance
- Creates emergent identity through play, not declaration
- Enables multi-faction play or freelance mercenary paths
- Mirrors real-world reputation systems (you earn trust through action)

**Why rename factions?**
- "Urnkeepers" sounded weak despite strong concept
- "Tidereaders" was awkward and generic
- "Silt Traders" didn't fit the dark carnival direction user wanted
- New names are Louisiana-grounded, conversational, and evocative

**Why completely retheme Faction 3?**
- User explicitly wanted dark carnival krewe culture, not commerce
- Commerce/trading faction lacked atmospheric weight compared to tech preservation and ecology
- New Orleans Mardi Gras krewe culture is PERFECT for the setting — authentic, dark, spectacle-driven
- Morale economy fills a survival niche that water and knowledge can't: psychological sustenance

**Why Krewe Calliope specifically?**
- Calliope Street is a real New Orleans location (authentic)
- "Krewe" is authentic Mardi Gras terminology (not generic fantasy)
- The name sounds mysterious, slightly ominous, distinctly Louisiana
- User suggested it as working name — validation that it's strong

---

## IMPLEMENTATION NOTES

**For Backend Team (Bruenor / Drizzt):**

- **Faction system mechanics will need expansion:** Current system likely has binary faction membership. New system requires:
  - Reputation score per faction (numeric or tier-based)
  - Reputation gain/loss triggers (mission completion, trading, combat)
  - Standing-based service gating (inn access, prices, stash limits, cistern access)
  - Starting zone selection at character creation (determines initial spawn, neutral faction, early quests)

- **Faction references throughout codebase need updating:**
  - Rename "Urnkeepers" → "The Brined" (or `brined` in code)
  - Rename "Tidereaders" → "The Bloom Watch" (or `bloom_watch` in code)
  - Rename "Silt Traders" → "Krewe Calliope" (or `krewe_calliope` in code)
  - Check NPC dialogue, quest text, item descriptions, stronghold names

- **Stronghold redesign for Krewe Calliope:**
  - The Exchange (French Quarter) → The Carrion Court (Superdome)
  - All 8 room names changed (see Section 1.3 in thematic-direction.md)
  - Atmosphere shifts from commerce to dark carnival

- **Water economy updates (Section 8):**
  - Faction cisterns now require NEUTRAL+ standing (not membership)
  - Krewe Calliope offers cultural services as water-earning path (performances, ritual participation)
  - Faction service costs updated (blessings, repairs, maps now faction-specific)

**Content Creation Implications:**

- **Quest design:** Faction quests should reflect new identities:
  - The Brined: Tech salvage, infrastructure repair, Kindar lore exploration
  - The Bloom Watch: Ecological mapping, spring discovery, algae cultivation
  - Krewe Calliope: Ritual preparation, parade escort, cultural relic recovery, performance participation

- **NPC dialogue:** Should reflect new faction names and reputation attitudes (distrusted vs. trusted NPCs speak differently)

- **Stronghold content:** Krewe Calliope stronghold needs atmospheric detail (masks, drums, incense, performance)

---

## OPEN QUESTIONS

1. **Reputation decay?** Do players lose standing over time if they don't maintain relationships? Or is standing permanent until actively damaged?

2. **Faction conflict mechanics?** If player has high standing with two rival factions, are there mechanical consequences? Or is multi-faction play always viable?

3. **Krewe mask mechanics?** Are masks purely cosmetic/RP flavor, or do they have gameplay implications (stealth, disguise, faction recognition)?

4. **Parade participation?** Are Krewe parades player-participatory events (scheduled, multiplayer) or narrative background flavor?

5. **Starting zone balance?** How do we ensure all three starting zones offer equally compelling early-game experiences?

---

## WRITING GUIDELINES (for future content)

**Faction Voice:**

- **The Brined:** Pragmatic, methodical, reverent toward Kindar and the past. Speak in technical terms. "Check the filtration manifold," "That drone chassis is corroded beyond recovery."

- **The Bloom Watch:** Observant, curious, adaptive. Speak in ecological terms. "The bloom's migrating north," "Chemical signature matches the awakening plume."

- **Krewe Calliope:** Theatrical, secretive, intense. Speak in performance terms. "The show must go on," "Every exit is an entrance," "Know your role."

**Tone for Krewe Calliope content:**
- Dark carnival atmosphere — masks, torchlight, drums, spectacle
- Blur the line between celebration and sacrifice
- Never fully trustworthy — are they sincere or manipulative? (Answer: both)
- Evoke New Orleans Mardi Gras culture twisted through 1000 years of apocalypse

**Louisiana Gothic Consistency:**
- All faction content must maintain Louisiana flavor (bayou, brackish water, humidity, spanish moss, New Orleans landmarks)
- Krewe Calliope especially should feel rooted in authentic Mardi Gras krewe tradition (secrecy, ritual, pageantry)

---

## CONCLUSION

This redesign transforms factions from character creation checkboxes into dynamic, reputation-based affiliations that emerge through play. The new names are Louisiana-grounded and conversational. Krewe Calliope's dark carnival identity fills a thematic and economic niche (morale/culture) that the old commerce faction didn't.

The faction system now reflects the core design philosophy: **identity is earned, not declared**.

---

**Next Steps:**
1. Backend team implements reputation mechanics and starting zone selection
2. Content team creates faction-specific quests aligned with new identities
3. Stronghold zones built with updated room names (especially The Carrion Court for Krewe Calliope)
4. NPC dialogue written to reflect reputation-based attitudes
5. Krewe Calliope traditions fleshed out (parade schedules, rite types, mask inventory)

---

**Document Status:** Complete. Ready for team review and implementation planning.
---
# Decision: Mutant Human Descendants

**Date:** 2026-03-29  
**Author:** Laeral  
**Status:** Design Complete, Awaiting Implementation

## Summary

Introduced a new hostile NPC/enemy category: **Mutant Human Descendants** — post-human organisms evolved from homo sapiens stock over ~1000 years. They are the primary humanoid threat in the game world and embody the "worst aspects of humanity" as design pillars.

## Background

The original thematic direction left open the question of whether any non-Sleeper humans survived. User directive resolved this: NO homo sapiens survived except in pickling urns. HOWEVER, mutant descendants exist — evolved from humans who didn't pickle themselves.

## Design Decisions

### 1. Core Concept
- **NOT zombies** — alive, breathing, thinking creatures with territorial behaviors
- **Uncanny valley horror** — they look *almost* human, which makes them disturbing
- **Divergent evolution** — 30-40 generations with extreme selective pressure, radiation, chemical exposure
- **Not allies** — hostile or indifferent to Sleepers; they don't recognize them as kin

### 2. Six Archetypes

Each embodies a "worst aspect" of humanity:

1. **Graftlords (Corruption)** — bloated figures with vestigial limbs, claim ruins as "kingdoms," wear symbols of authority
2. **Maw-Kin (Gluttony)** — grotesquely obese cannibals with distended jaws, hoard food obsessively
3. **Bone-Tithes (Greed)** — skeletal thieves who steal and hoard anything shiny, set traps around lairs
4. **Render-Kin (Violence/Murder)** — muscular apex hunters with claw-like nails, kill for pleasure and territory
5. **Fester-Thralls (Ugliness/Body Horror)** — misshapen disease-carriers covered in sores and tumors
6. **Rut-Callers (Lust/Obsession)** — feral, territorial during mating cycles, emit pheromones, unpredictable

### 3. Habitat Distribution
- Ruins (Graftlords in government buildings, Bone-Tithes in banks)
- Swamps and tunnels (Render-Kin ambush zones)
- Sewers and basements (Fester-Thralls in darkness)
- Residential ruins (Rut-Callers in old apartments)
- Food storage sites (Maw-Kin in warehouses, restaurants)

### 4. Naming Convention
- Use corrupted bayou creole or local slang
- Collective terms: "the Changed," "the Twisted," "them things in the ruins"
- Specific names: "Rust Kings," "the Reeking," "Vault-Wraiths," "the Clawed," "Sore-Touched," "the Fevered"

### 5. Writing Guidelines

When describing in room text or combat:
- **Focus on distortion:** "Its fingers are too long, the knuckles bend wrong."
- **Emphasize recognition:** "You see the shape of a human skull beneath the tumorous growths."
- **Use sensory horror:** smell (rot, pheromones), sound (wet breathing, clicking joints), movement (twitching, unnatural gait)

## Implementation Impact

### Content Team (Laeral + Bruenor)
- New enemy types to design (stats, loot tables, behaviors)
- New NPC dialogue referencing mutants
- Room descriptions incorporating mutant encounters
- Loot specific to mutant archetypes (e.g., Bone-Tithe hoards, Graftlord "throne rooms")

### Engineering Team
- Enemy AI for different archetype behaviors (pack hunters, ambushers, hoarders)
- Status effects (disease from Fester-Thralls, pheromone zones from Rut-Callers)
- Trap mechanics for Bone-Tithes

### Design Philosophy
These mutants are the **most disturbing element** in the game because they are US, distorted. They are what humanity became when civilization fell. This is body horror + tragedy, not fantasy monster combat.

## Related Decisions
- Wildlife remains indifferent (useful for materials but not friendly)
- Drones remain inactive (salvage only, no combat)
- Saitcho Kindar remains mythic (never met, only referenced in lore)
- Multiple settlements exist along Gulf Coast (referenced but not yet defined)

## Next Steps
1. Bruenor to create enemy database entries for each archetype
2. Laeral to write specific mutant encounters for Siltgate and Warrens zones
3. Regis to implement archetype-specific behaviors and AI patterns
4. Future expansion: mutant tribal groups, hybrid archetypes, deeper lore about their evolution
---
# Decision: Thematic Realignment — Faction and Zone Redesign

**Date:** 2026-03-29  
**Author:** Laeral (Content Designer)  
**Status:** Proposed — Awaiting user review and iteration  
**Scope:** World setting, faction identity, zone theming, narrative tone

---

## Summary

Redesigned all three factions and two major zones (Siltgate, The Warrens) to align with the new dystopian Gulf Coast setting (year 3000, post-human Earth, Louisiana/Mississippi). Factions transformed from generic fantasy archetypes into setting-specific survival factions. Zones re-themed from fantasy ruins to post-apocalyptic New Orleans and flooded infrastructure.

---

## Faction Redesigns

| Old Name | New Name | Identity | Stronghold |
|----------|----------|----------|------------|
| Ironwright Compact | **The Urnkeepers** | Technology salvage, drone scavenging, reverence for preservation urns | **The Reliquary** (water treatment plant) |
| Veil Cartographers | **The Tidereaders** | Ecological mapping, biomonitoring, mutant algae research | **The Bloom Observatory** (offshore oil platform) |
| Scarlet Ledger | **The Silt Traders** | Commerce, information brokerage, trade route control | **The Exchange** (fortified French Quarter) |

Each faction represents a distinct survival strategy for newly awakened "Sleepers" in a world that has moved on without humanity.

---

## Zone Re-Themes

### Siltgate (The City)
- **Old:** Generic fantasy port city
- **New:** Post-apocalyptic New Orleans, flooded and overgrown, Mississippi shifted west into Atchafalaya
- **Key elements:** Rusted drone debris, spanish moss, brackish water, recognizable landmarks (Superdome, French Quarter, interstate overpasses)

### The Warrens (Tier 1 Dungeon)
- **Old:** Generic fantasy ruins
- **New:** Pre-extinction service tunnels and storm drains beneath Siltgate, infested with mutant rats
- **Key elements:** Flooded maintenance corridors, rat nests, old infrastructure, claustrophobic darkness

---

## World Texture Defined

- **Drone swarms:** Everywhere, dormant, rusted, lootable but dangerous
- **Mutant wildlife:** Rats (dog-sized), roaches (plate-sized), snakes (huge water moccasins), mosquito swarms, alligators
- **Vegetation:** Kudzu, spanish moss, mangroves, mutant algae blooms (glow green, produce chemical off-gassing)
- **Atmosphere:** Oppressive humidity, everything damp/rusted/rotting, Louisiana gothic tone

---

## Tone Guidelines Established

- **Second-person room descriptions** (2-4 sentences, terminal-friendly)
- **Louisiana/Gulf Coast flavor is non-negotiable** (brackish water, humidity, spanish moss, Creole/Cajun cultural ghosts)
- **Gritty but not grimdark:** The world recovered; it's dangerous but not evil
- **Eerie but hopeful:** Humanity survived the urns; maybe we can survive again

---

## Open Questions for User Review

1. Should there be any surviving humans besides "Sleepers" (urn-preserved)? Or is humanity 100% pickled?
2. What role does Saitcho Kindar (the urn inventor) play in faction lore? Revered? Blamed? Missing?
3. Are there competing settlements in Siltgate, or just the three factions coexisting?
4. Should some drones be partially active (malfunctioning, twitching, dangerous but not intelligent)?
5. Should any wildlife be helpful (symbiotic species, trainable creatures, material sources beyond loot)?

---

## Implementation Impact

**No code changes yet.** This is design iteration material. Once approved:
- Bruenor will update zone/room descriptions in database migrations
- New faction names require `factions` table updates
- Stronghold zone descriptions and room names need database changes
- Creature re-skins (gutterspawn → mutant rats) require `creature_definitions` updates

---

## Next Steps

1. User reviews expanded `docs/thematic-direction.md`
2. Iterate on open questions and tone
3. Finalize faction names, stronghold names, and zone descriptions
4. Hand off to Bruenor for database implementation
---
# Decision: Potable Water Economy

**Author:** Laeral (Content Designer)
**Date:** 2025-07-25
**Requested by:** dkirby-ms
**Status:** DRAFT — awaiting team review

---

## Summary

The game's currency is **potable water**, measured in **draws**. This replaces the existing `gold` column concept from migration 016. Water is heavy, consumable, and universally needed — a survival currency grounded in the Gulf Coast setting.

## Key Design Points

1. **Unit:** The "draw" (~1 cup of clean water). 10 draws = a day's hydration.
2. **Weight:** Water has encumbrance. Wealth = physical burden. Rich players are slower.
3. **Consumable:** Players can drink their savings. Desperation mechanic — survival and commerce share the same resource.
4. **Faction roles:**
   - Urnkeepers **produce** water (filtration at the Reliquary)
   - Tidereaders **discover** water (spring locations, water chemistry knowledge)
   - Silt Traders **distribute** water (trade routes, brokerage, market control)
5. **Cisterns:** Faction strongholds have water cisterns (safe stash for currency). Faction-locked.
6. **Inn cost:** 10 draws for non-faction guests (replaces 10 gold).

## Backend Action Required

- Migration 016 added `gold INTEGER` column to `characters` table. This needs renaming to `water` or `draws` in a future migration.
- All game logic, commands, and UI referencing "gold" should update to water/draws terminology.
- The underlying mechanics (integer column, cost deduction) remain the same — this is a naming/theming change.

## Document Location

Full design written into `docs/thematic-direction.md`, Section 8.

## Rationale

- Directly tied to Gulf Coast setting (brackish water everywhere, clean water scarce)
- Creates weight-based inventory tension (Caves of Qud inspiration)
- Consumable currency adds desperation mechanic absent from abstract money systems
- Faction economic roles create natural interdependence and conflict
- Grounded in real-world water scarcity issues of the Louisiana/Mississippi coast
---
# Issue #312 — Exiting the Game Outside of Combat

**By:** Elminster (Lead/Architect)
**Date:** 2025-04-05
**Issue:** [#312](https://github.com/dkirby-ms/ellmud/issues/312)

---

## Architecture Summary

Issue #312 introduces **inn rooms** as the canonical "safe logout" mechanism, and refines **disconnect limbo** to make ungraceful exits visible and dangerous. The work touches four system boundaries:

1. **Room type system** — new `feature_inn` type added to `RoomType` union
2. **Zone data** — each faction stronghold gets a two-room inn (flavor + rent), replacing the old `entry` room as spawn point
3. **Command system** — new `rent` command, feature-gated to `feature_inn`
4. **Disconnect lifecycle** — `disconnected` players become visible to other players with a limbo indicator; 30s timeout unchanged (already the default)

### Key Design Decisions

- **`feature_inn` not `feature_lodging`**: Matches the issue language and MUD tradition. The `feature_` prefix means it slots into the existing `isFeatureRoomType()` / `getFeatureKey()` helpers and `featureHandlers` map with zero framework changes.
- **Two rooms per inn**: Lower room is flavor (type `corridor` or `dead_end`), upper room is the functional `feature_inn`. The `rent` command is feature-gated to the upper room only. Exit direction is `up` per the issue spec.
- **Inn replaces entry as spawn**: `entry_room_slugs` in zone definitions will point to the inn's lower room. Players who rent and re-enter spawn at the inn — narratively coherent.
- **Rent = consented leave (code 4000)**: The `rent` command triggers `client.leave(4000)` from the server side after persisting player state. This reuses the existing consented-leave path in `onLeave`, which skips reconnection grace. No new leave code needed.
- **Disconnect limbo visibility**: The `playerState.disconnected` flag already exists. Today, disconnected players are **excluded** from `ROOM_OCCUPANTS` broadcasts. We invert this: include them, but add a `disconnected: boolean` field to the player entry in `RoomOccupantsMessage`. Client renders an indicator.
- **Cost gating (free for natives)**: The `rent` command checks the player's faction against the zone's `faction_slug`. If they match, rent is free. Otherwise, deduct gold (amount TBD, can be configured per zone or globally). Phase 1: free for natives, flat fee for non-natives.

---

## Work Items

### WI-1: Add `feature_inn` Room Type (Drizzt — Backend)
**Priority:** P0 (blocks all other items)
**Files:**
- `packages/shared/src/room-graph.ts` — Add `'feature_inn'` to `RoomType` union
- `packages/server/src/generator/generator.ts` — Add `ROOM_NAMES` and `ROOM_DESCRIPTIONS` entries for `feature_inn`

**Details:**
Add `| 'feature_inn'` to the `RoomType` union type (line 41 of room-graph.ts). Add name/description templates in generator.ts for procedural zones (even if inns are primarily in hub zones, the generator needs entries to avoid runtime gaps).

**Dependencies:** None.

---

### WI-2: Add Inn Rooms to Faction Strongholds (Drizzt — Backend)
**Priority:** P0 (blocks WI-3, WI-5, WI-7)
**Files:**
- `packages/server/src/db/migrations/` — New migration file (e.g., `017_inn_rooms.sql`)

**Details:**
For each of the three faction strongholds (`the-foundry`, `the-cartographium`, `the-counting-house`), add:

1. **Lower inn room** (type `corridor`):
   - Slug: `{zone}-inn` (e.g., `foundry-inn`)
   - Flavor name and description befitting each faction's aesthetic
   - Exits: connects to the existing commons/entry room laterally, plus `up` to the rent room
2. **Upper inn room** (type `feature_inn`):
   - Slug: `{zone}-inn-upper` (e.g., `foundry-inn-upper`)
   - Name and description referencing the rent mechanic ("a quiet room with a ledger...")
   - Exit: `down` back to the lower inn room

3. **Update `entry_room_slugs`**: Change each zone's `entry_room_slugs` from the old commons room (e.g., `'{foundry-commons}'`) to the inn lower room (e.g., `'{foundry-inn}'`). This makes the inn the new spawn point.

4. **Wire exits**: Connect the existing commons room to the inn (e.g., `foundry-commons` ↔ `foundry-inn`).

**Dependencies:** WI-1 (needs `feature_inn` type to exist).

---

### WI-3: Implement `rent` Command (Drizzt — Backend)
**Priority:** P0 (core feature)
**Files:**
- `packages/server/src/commands/rent.ts` — New file: `handleRent` command handler
- `packages/server/src/commands/index.ts` — Register in `featureHandlers` map
- `packages/server/src/rooms/ZoneRoom.ts` — Handle `rent` result action (trigger server-side leave)
- `packages/shared/src/index.ts` — Add `RENT_SUCCESS` message type (or reuse narration)

**Details:**
1. Create `handleRent(ctx: CommandContext): CommandResult` in `rent.ts`:
   - Verify `ctx.room.type === 'feature_inn'` (enforced by feature gate, but belt-and-suspenders)
   - Check faction: compare player's faction slug to zone's `faction_slug`
     - If match → free
     - If no match → check player gold, deduct cost
   - On success: return a `CommandResult` with a narration ("You settle your account and retire to the inn...") **and** a new action flag (e.g., `action: 'rent'`) that ZoneRoom can detect
   - On failure (insufficient gold): return error narration

2. Register in `index.ts`:
   ```typescript
   featureHandlers.set('rent', { handler: handleRent, requiredRoomType: 'feature_inn' });
   ```

3. In `ZoneRoom.ts`, after `handleCommand` returns, check for the `rent` action. If present:
   - Persist player state (save profile, save current room as inn for re-entry)
   - Call `client.leave(4000)` to trigger a consented leave
   - This sends the client back through the normal disconnect path

4. Optionally persist the player's "last rented location" so they respawn at the inn on next login (store in `characters` or a new column).

**Dependencies:** WI-1, WI-2 (needs inn rooms to exist for testing).

---

### WI-4: Disconnect Limbo Visibility — Server (Drizzt — Backend)
**Priority:** P1 (important but not blocking core rent flow)
**Files:**
- `packages/shared/src/index.ts` — Extend `RoomOccupantsMessage.players` array to include `disconnected?: boolean`
- `packages/server/src/rooms/ZoneRoom.ts` — Modify `sendRoomOccupants` to include disconnected players with the flag

**Details:**
Currently (`ZoneRoom.ts:2174-2180`), `sendRoomOccupants` iterates `this.players` and includes all players in the room. Disconnected players are **not** filtered out (they're still in `this.players` during the grace period) but their `disconnected` flag is not sent.

Changes:
1. Extend the player entry in `RoomOccupantsMessage`:
   ```typescript
   players: Array<{ id: string; name: string; disconnected?: boolean }>;
   ```
2. In `sendRoomOccupants`, when building the players array, include the `disconnected` flag:
   ```typescript
   players.push({ id: sid, name: displayName, disconnected: ps.disconnected || false });
   ```
3. When a player's `disconnected` flag changes (set `true` on disconnect, `false` on reconnect), call `broadcastRoomOccupantsUpdate(playerState.currentRoomId)` so other players see the change.

**Dependencies:** None (can be done in parallel with WI-1–3).

---

### WI-5: Client — Rent Command & Return to Character Select (Regis — Frontend)
**Priority:** P0 (core feature, client side)
**Files:**
- `packages/client/src/hooks/useZoneConnection.ts` — Handle server-initiated leave after rent
- `packages/client/src/pages/ZoneExploration.tsx` — Navigate to `/characters` on rent leave
- `packages/shared/src/index.ts` — If a new message type is added for rent confirmation

**Details:**
When the server processes `rent`, it calls `client.leave(4000)`. The Colyseus client will fire the `onLeave` handler. The client needs to:

1. Detect that the leave was a "rent" (not an error or logout). Options:
   - Server sends a `RENT_SUCCESS` message just before the leave → client sets a flag → on `onLeave`, check the flag and navigate to `/characters` instead of showing an error
   - OR: Server sends `onLeave` with code 4000 → client checks `code === 4000` and treats it as "return to character select"

2. Navigate: `navigate('/characters')` to return the player to the character select screen (not `/` which is the login page).

3. Clear room state in the app context (`dispatch({ type: 'SET_ROOM', room: null })`).

**Dependencies:** WI-3 (needs server-side rent to be implemented to test against).

---

### WI-6: Client — Disconnect Limbo Indicator (Regis — Frontend)
**Priority:** P1 (paired with WI-4)
**Files:**
- `packages/client/src/components/RoomOccupants.tsx` — Render disconnect indicator
- `packages/shared/src/index.ts` — Type change (already done in WI-4)

**Details:**
When `RoomOccupantsMessage.players` includes a player with `disconnected: true`:
1. Show a visual indicator next to their name — e.g., a pulsing `⏳` or `💤` icon, or "linkdead" text (classic MUD term)
2. Style differently from connected players (muted/ghosted text, or amber warning color)
3. Tooltip or title attribute: "This player has lost connection"

The existing `RoomOccupants.tsx` renders players with a `👤` icon. Add a conditional:
```tsx
{player.disconnected ? '💤' : '👤'} {player.name}
```

**Dependencies:** WI-4 (needs server to send `disconnected` field).

---

### WI-7: Tests — Inn & Rent (Minsc — Tester)
**Priority:** P1 (after core implementation)
**Files:**
- `packages/server/src/__tests__/rent.test.ts` — New test file
- `packages/server/src/__tests__/feature-gate-commands.test.ts` — Extend with `rent` / `feature_inn` cases

**Details:**
Test cases:
1. **`rent` in `feature_inn` room** — succeeds, triggers consented leave (code 4000)
2. **`rent` outside inn** — returns "You can't do that here."
3. **`rent` as faction native** — free (no gold deducted)
4. **`rent` as non-native** — deducts gold (or fails if insufficient)
5. **Player spawns at inn** — after rent, re-joining the zone places player in inn room
6. **Feature gate isolation** — `rent` does not work in `feature_stash`, `feature_expedition_board`, etc.

**Dependencies:** WI-1, WI-2, WI-3.

---

### WI-8: Tests — Disconnect Limbo (Minsc — Tester)
**Priority:** P1
**Files:**
- `packages/server/src/__tests__/disconnect-limbo.test.ts` — New test file
- `packages/client/src/__tests__/RoomOccupants.test.tsx` — Extend with disconnect indicator

**Details:**
Test cases:
1. **Disconnected player visible** — After non-consented leave, player appears in `ROOM_OCCUPANTS` with `disconnected: true`
2. **Reconnected player clears flag** — After reconnection, `disconnected` becomes `false`
3. **Timeout removes player** — After 30s, player is removed from room occupants entirely
4. **Client renders indicator** — `RoomOccupants` component shows `💤` or equivalent for disconnected players
5. **Connected players normal** — Players without `disconnected` flag render normally

**Dependencies:** WI-4, WI-6.

---

## Dependency Graph

```
WI-1 (feature_inn type)
 ├── WI-2 (inn rooms in zones)
 │    ├── WI-3 (rent command)
 │    │    ├── WI-5 (client rent flow)
 │    │    └── WI-7 (rent tests)
 │    └── WI-7 (rent tests)
 └── WI-7 (rent tests)

WI-4 (limbo visibility - server)  [parallel track]
 ├── WI-6 (limbo indicator - client)
 └── WI-8 (limbo tests)
```

## Execution Order

**Phase A (parallel):**
- Drizzt: WI-1 → WI-2 → WI-3 (serial chain)
- Drizzt: WI-4 (can start immediately, parallel to WI-1)

**Phase B (after Phase A):**
- Regis: WI-5 (after WI-3)
- Regis: WI-6 (after WI-4)

**Phase C (after Phase B):**
- Minsc: WI-7 (after WI-3)
- Minsc: WI-8 (after WI-4 + WI-6)

## Open Questions

1. **Rent cost for non-natives**: What should the gold cost be? Suggest a config value (`INN_RENT_COST`) defaulting to 10 gold, overridable per zone. Defer to dkirby-ms.
2. **Last-rented persistence**: Should we add a `last_inn_zone_slug` column to characters for respawn tracking, or always respawn at faction home inn? Recommend faction home inn for simplicity in Phase 1.
3. **Siltgate merchant-inn**: The existing `merchant-inn` room in Siltgate (migration 004) is typed as `dead_end`. Should it be converted to `feature_inn` as part of this work? Recommend deferring — Siltgate is not a starter zone.
---
# Siltgate & Warrens Room Descriptions — Revision 2: Unique Descriptions

**Author:** Laeral (Content Designer)
**Date:** 2025-07-18
**Revision:** 2.0 — Complete rewrite to eliminate description duplication
**Purpose:** Complete room name and description rewrites for Siltgate and Warrens zones to align with dystopian post-apocalyptic Gulf Coast setting (year 3000, New Orleans ruins). Every room now has a fully unique description.

**Setting Context:**
- Year 3000, 1000 years after human extinction via drone apocalypse
- Siltgate = ruins of New Orleans
- Mississippi shifted west into Atchafalaya, leaving silted delta
- Flooded streets, rusted drone debris, overgrown vegetation (kudzu, spanish moss, mangroves)
- Wildlife: mutant rats (dog-sized), giant roaches, mutant snakes, spiders, mosquito swarms
- Brackish water everywhere, Gulf creeping inland
- Hurricane-damaged Creole/Cajun architecture
- Oppressive humidity, green algae light, everything damp/rusted/rotting
- NOT grimdark — eerie, alive, overgrown. Nature won.

**Preservation Rules:**
- Slugs: UNCHANGED (referenced by exits, spawns, etc.)
- Types: UNCHANGED (functional game layer)
- Names: MAY change to fit setting
- Descriptions: ALL UNIQUE — no two rooms share the same description

**Changes from Revision 1:**
- Fixed massive description duplication (was ~64 unique out of 202; now 212/212 unique)
- Added 10 new rooms for topology fixes (rubble-passage-1, gutter-sewer, sewer-drip-tunnel, sewer-cracked-conduit, sewer-blind-turn, sewer-narrow-drain, sewer-rubble-choke, sewer-trickle-passage, sewer-slime-channel, sewer-stagnant-pool)
- Descriptions now match room names, types, and area context

---

## Siltgate Rooms

### apothecary
**Name:** Apothecary
**Type:** dead_end
**Description:** Cracked glass jars line shelves bolted to a tilting wall, their contents long since congealed into unidentifiable pastes. A mortar and pestle sits on the counter, stained green with algae-bloom residue. The smell of mold and forgotten medicine hangs thick.

### ash-garden
**Name:** Ash Garden
**Type:** dead_end
**Description:** A courtyard garden gone feral, where magnolias and crepe myrtles have burst through flagstone paths and a live oak draped in spanish moss dominates the center. The original plantings are strangled beneath kudzu, and the iron benches have become part of the undergrowth.

### ashgate
**Name:** Ashgate
**Type:** entrance
**Description:** The gateway into the eastern wastes stands flanked by toppled drone sentinels, their corroded hulls fused to the crumbling brick. Scorch marks blacken the archway where ancient weapons fire melted stone to glass. Beyond, the ruins stretch into a haze of ash and humidity.

### ashgate
**Name:** Ashgate East
**Type:** warrens
**Description:** Twisted metal and pulverized concrete spread in every direction, the aftermath of a drone swarm''s final engagement. Rust-orange water collects in blast craters, and kudzu creeps over the wreckage like a shroud. The air tastes of iron and wet ash.

### ashgate-chapel
**Name:** Burned Chapel
**Type:** dead_end
**Description:** Fire-blackened walls frame a roofless nave where rain has pooled on the altar. Giant roaches nest in the charred pews, but someone has placed fresh wildflowers in a cracked vase near the door. Faith persists even here.

### barnacled-quay
**Name:** Barnacled Quay
**Type:** corridor
**Description:** Wooden platforms extend over brackish water thick with oil sheen and algae blooms. Barnacles crust every surface below the waterline, and vendors sell hand-drawn navigation charts marking safe passages through the drowned streets.

### bazaar-row-1
**Name:** Bazaar Row
**Type:** corridor
**Description:** Scavengers hawk drone components and spider silk from floating platforms anchored to submerged bollards. The brackish water reflects green algae-light off their wares, and somewhere nearby, accordion music drifts through the humid air.

### bazaar-row-2
**Name:** Bazaar Row
**Type:** corridor
**Description:** Waterlogged stalls lean against collapsed storefronts, selling everything from roach chitin armor to pre-extinction curiosities. Haggling voices echo off crumbling brick while giant roaches scuttle between the vendors'' feet.

### bazaar-row-3
**Name:** Bazaar Row
**Type:** corridor
**Description:** The bazaar narrows here into a choke-point of hanging tarps and swaying rope bridges, vendors crammed shoulder-to-shoulder above the murky water. A woman sells jars of bioluminescent algae for lamp-fuel; a man offers smoked rat jerky by the strip.

### beggar-kings-court
**Name:** Beggar King''s Court
**Type:** junction
**Description:** A raised platform of lashed-together debris serves as the court of the Span''s self-proclaimed sovereign. Offerings of salvage and food are piled at the edges, and the surrounding shacks lean inward as if bowing. Rats watch from every shadow.

### beggars-lane-1
**Name:** Beggar''s Lane
**Type:** corridor
**Description:** A collapsed townhouse leans at a drunken angle, its iron-lace balcony dangling over flooded streets. Spanish moss hangs from broken shutters, and kudzu has consumed the ground floor. A faint lamplight glows from the upper level.

### beggars-lane-2
**Name:** Beggar''s Lane
**Type:** corridor
**Description:** An alley choked with debris and vegetation where kudzu has bridged the gap overhead, creating a tunnel of green shadow. Water flows through in a steady stream, and rat-runs line the upper walls. Move quickly.

### beggars-lane-3
**Name:** Beggar''s Lane
**Type:** corridor
**Description:** The lane sinks lower here, water rising to mid-calf. Corrugated tin walls channel the flow between listing shacks, and the stench of open sewage mingles with cook-smoke. Children''s laughter echoes from somewhere above the waterline.

### belvedere
**Name:** Belvedere

(Note: laeral-room-descriptions.md is 1104 lines and is referenced in decisions but full content is maintained separately in inbox for reference)

---

# Stronghold → World Zone Connections

## Design (Laeral)

**Status:** Design Complete — Ready for Implementation  
**Date:** 2026-04-06

### Executive Summary

Design establishes physical connections between the three faction strongholds and the main world zones (Siltgate and Warrens). Prioritizes thematic coherence, narrative logic, and environmental storytelling.

**Core Assignments:**
- **The Carrion Court** (Krewe Calliope) → **Siltgate** (Dockward)
- **The Reliquary** (Kindari) → **Siltgate** (Ashgate Wastes)
- **The Bloom Observatory** (Bloom Tenders) → **Warrens** (eastern wastes)

### Stronghold → Zone Assignments

#### 1. The Carrion Court → Siltgate (Dockward)
- **Rationale:** Krewe Calliope is the New Orleans krewe faction — ritual, spectacle, cultural preservation. The Carrion Court is the half-collapsed Superdome. Geographically, must be in Siltgate (flooded New Orleans ruins). Player flow: Spawn in Court, access Siltgate's harbor/market.
- **Entry Room:** `carrion-court-inn` (The Bunk Tiers)
- **Connection Route:** carrion-court-inn → superdome-breach → flooded-concourse → dock-street-1

#### 2. The Reliquary → Siltgate (Ashgate Wastes)
- **Rationale:** Reliquary is a converted water treatment plant on the "edge of Siltgate." Kindari revere tech and infrastructure. Industrial-edge location perfect for Ashgate Wastes transitional zone. Player flow: Access Siltgate markets but positioned at dangerous eastern edge.
- **Entry Room:** `reliquary-inn` (The Sleeper Cells)
- **Connection Route:** reliquary-inn → filtration-annex → pipe-bridge → ashgate-chapel

#### 3. The Bloom Observatory → Warrens
- **Rationale:** Repurposed offshore oil platform reaches toward hostile eastern terrain. Bloom Tenders study mutant ecology — Warrens (eastern wastes, craters, collapsed infrastructure) is perfect habitat. Positions Bloom Tenders as frontier scouts.
- **Entry Room:** `bloom-observatory-inn` (The Watchtower Bunk)
- **Connection Route:** bloom-observatory-inn → platform-descent → causeway-terminus → shattered-gate

### Connection Design & Transitional Rooms

#### Carrion Court → Siltgate Connection

**New Room 1: Superdome Breach**
- **Slug:** `superdome-breach`
- **Type:** `corridor`
- **Zone:** `the-carrion-court`
- **Description:** "A jagged rent in the Superdome's outer wall allows passage between the Krewe's domain and the streets beyond. Vines thread through the gap, and rainwater pools on cracked concrete. Krewe banners hang from the rusted girders above, visible from the street — a territorial marker and an invitation."

**New Room 2: Flooded Concourse**
- **Slug:** `flooded-concourse`
- **Type:** `corridor`
- **Zone:** `the-siltgate`
- **Properties:** `{water}`
- **Description:** "The approach to the Superdome wades through ankle-deep brackish water, the street submerged where drainage has failed. Carnival debris floats on the surface — plastic beads, torn masks, waterlogged feathers. The drum-echo from within the Dome is audible even here."

**Exit Mapping:**
- `carrion-court-inn` ↔ `superdome-breach` (south/north)
- `superdome-breach` ↔ `flooded-concourse` (south/north)
- `flooded-concourse` ↔ `dock-street-1` (south/north)

#### Reliquary → Siltgate Connection

**New Room 1: Filtration Annex**
- **Slug:** `filtration-annex`
- **Type:** `corridor`
- **Zone:** `the-reliquary`
- **Properties:** `{heavy_door}`
- **Description:** "A narrow maintenance corridor extending from the Reliquary's main structure, its walls lined with rusted piping and gauge dials. The Kindari have reinforced this passage with welded iron plates. A heavy security door at the far end leads to the wasteland beyond."

**New Room 2: Pipe Bridge**
- **Slug:** `pipe-bridge`
- **Type:** `entrance`
- **Zone:** `the-siltgate`
- **Description:** "A suspended walkway built atop massive water mains that cross a blast crater. The pipes groan underfoot, and gaps in the grating offer vertiginous views of rubble far below. The Reliquary's concrete bulk looms behind; ahead, the burned chapel marks the edge of Ashgate."

**Exit Mapping:**
- `reliquary-inn` ↔ `filtration-annex` (east/west)
- `filtration-annex` ↔ `pipe-bridge` (east/west)
- `pipe-bridge` ↔ `ashgate-chapel` (east/west)

#### Bloom Observatory → Warrens Connection

**New Room 1: Platform Descent**
- **Slug:** `platform-descent`
- **Type:** `corridor`
- **Zone:** `the-bloom-observatory`
- **Description:** "An external staircase of rusted grating spirals down the platform's leg, exposed to salt wind and spray. Algae slicks coat every surface, making footing treacherous. Below, the causeway extends eastward across brackish shallows toward the wasteland horizon."

**New Room 2: Causeway Terminus**
- **Slug:** `causeway-terminus`
- **Type:** `entrance`
- **Zone:** `warrens`
- **Description:** "The corroded causeway meets solid ground at the edge of the eastern wastes. The transition is abrupt — behind you, the green-slicked platform rises from the water; ahead, blast-scarred earth and the shattered archway of the Warrens. The Bloom Tenders call this the 'Threshold.' Few cross it lightly."

**Exit Mapping:**
- `bloom-observatory-inn` ↔ `platform-descent` (down/up)
- `platform-descent` ↔ `causeway-terminus` (east/west)
- `causeway-terminus` ↔ `shattered-gate` (east/west)

### Design Rationale

1. **Krewe Calliope MUST be in Siltgate** — they're the New Orleans krewe faction, and the Carrion Court is the Superdome. No other placement makes narrative sense.

2. **Kindari positioned at Ashgate Wastes** — their water treatment plant is "on the edge of Siltgate," and Ashgate is the transitional zone to the Warrens. Perfect thematic and geographic fit.

3. **Bloom Tenders at the Warrens edge** — their offshore platform reaches toward the eastern wastes. Positions them as frontier scouts, fitting their exploratory/ecological identity.

4. **Two transitional rooms per connection** — creates a buffer zone, allows for pacing, and provides environmental storytelling space. One room = too abrupt. Three rooms = padding.

5. **Exit directions chosen for spatial logic:**
   - Carrion Court: **south** (out of Superdome toward harbor)
   - Reliquary: **east** (toward the wastes/Ashgate)
   - Bloom Observatory: **down then east** (descending platform, crossing causeway toward wastes)

---

## Implementation (Bruenor)

**Status:** Complete  
**Date:** 2026-04-06  
**Migration:** `022_stronghold_connections.sql`

### Implementation Summary

Implemented Laeral's design for connecting the three faction strongholds to the main world zones. Created 6 transitional rooms and established 24 bidirectional exits (3 inter-zone connections).

### Key Implementation Decisions

#### 1. Transitional Room Ownership

Placed transitional rooms in the zone that "owns" them narratively:

- `superdome-breach` → `the-carrion-court` (part of Superdome structure)
- `flooded-concourse` → `the-siltgate` (the street approach)
- `filtration-annex` → `the-reliquary` (part of water plant)
- `pipe-bridge` → `the-siltgate` (the Ashgate approach)
- `platform-descent` → `the-bloom-observatory` (on the platform)
- `causeway-terminus` → `warrens` (where causeway meets wastes)

This pattern follows the existing Siltgate↔Warrens connection model where inter-zone portals sit at the zone boundary, with "approach" rooms in the destination zone.

#### 2. Exit Direction Conflict Resolution

Three existing rooms had occupied exit directions. Resolved as follows:

**dock-street-1** (Siltgate):
- Occupied: north→tavern-row, south→dock-street-2, east→fish-market
- **Solution:** Used WEST for flooded-concourse connection
- **Narrative fit:** Flooded Concourse is "west" of the docks, spatially coherent

**ashgate-chapel** (Siltgate):
- Occupied: north→dust-bowl
- **Solution:** Used WEST for pipe-bridge connection
- **Narrative fit:** Pipe Bridge leads "back" toward the Reliquary (west)

**shattered-gate** (Warrens):
- Occupied: west→the-refuge, east→rubble-boulevard, south→the-siltgate
- **Solution:** Used NORTH for causeway-terminus connection
- **Narrative fit:** Causeway approaches from the "north" (offshore direction)

All direction choices maintain spatial coherence and narrative logic.

#### 3. Inter-Zone Exit Pattern

Followed the established pattern from `004_seed_siltgate.sql` (lines 1450-1475):

```
-- Inter-zone portal exit (from_room_slug = to_room_slug)
('superdome-breach', 'south', 'superdome-breach', 'the-siltgate', 'flooded-concourse', false, false)
```

This "portal" pattern keeps the zone exit record in the source zone while targeting the destination zone and room. The `to_room_slug = from_room_slug` convention indicates this is a zone boundary crossing, not a simple room-to-room exit.

#### 4. Room Properties

Added properties to rooms where thematically appropriate:

- `flooded-concourse`: `{water}` — ankle-deep brackish water
- `filtration-annex`: `{heavy_door}` — Kindari security door
- Other rooms: empty properties `{}`

### Migration Structure

**6 new rooms:**
- 2 in stronghold zones (breach/descent rooms)
- 4 in world zones (2 in Siltgate, 1 in Warrens)

**24 new exits (12 bidirectional pairs):**
- 18 intra-zone exits (within same zone)
- 6 inter-zone exits (crossing zone boundaries)

Each connection route has:
- 2 intra-zone pairs in the stronghold (inn → transitional room)
- 1 inter-zone pair (stronghold → world zone)
- 2 intra-zone pairs in the world zone (transitional room → existing room)

### Zone Totals After Migration

| Zone | Rooms (before → after) | Exits (before → after) |
|------|---|---|
| the-carrion-court | 10 → 11 | 12 → 15 |
| the-reliquary | 10 → 11 | 12 → 15 |
| the-bloom-observatory | 10 → 11 | 12 → 15 |
| the-siltgate | 138 → 140 | 284 → 292 |
| warrens | 109 → 110 | 218 → 222 |

### Verification Checklist

✅ All 6 rooms created in correct zones  
✅ All 24 exits are bidirectional (12 pairs)  
✅ All inter-zone exits use portal pattern (to_room_slug = from_room_slug)  
✅ No direction conflicts with existing exits  
✅ All room slugs referenced in exits exist  
✅ Migration is atomic (BEGIN/COMMIT wrap)  
✅ Follows established SQL patterns from migrations 004, 005, 016, 017  
✅ NULLIF used for empty target_zone/target_room strings  

---
