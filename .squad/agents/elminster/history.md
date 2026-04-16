# elminster — History

**For a quick overview, see [summary.md](./summary.md)**

---

## Core Context

**Role:** Workflow Engine

**Key Focus Areas:**
- Core responsibilities for this agent
- Integration with wider system architecture  
- Test coverage and reliability
- Documentation and knowledge transfer

**Recent Work (Last 30 Lines):**


---

**Decisions Logged to:** `.squad/decisions/inbox/elminster-research-417-418.md`
**GitHub Comments:** Both issues annotated with research summary and architect recommendations
**Labels Updated:** Both issues transitioned from go:needs-research to go:ready, assigned squad member labels

**Process Notes:**
- Directives review confirmed inventory/stash separation and user flags architecture fit both issues
- No conflicts with existing architecture patterns
- Both issues are self-contained with clear acceptance criteria
- No cross-system dependencies or blocking work identified

### 2025-07-22: Re-Review PR #442 — Unified Corpse System (REJECTED)

**Task:** Re-review corpse system PR after Drizzt's revision and Minsc's test rewrite.

**Verdict: REJECT — Test quality failure persists**

**Implementation (4 of 5 points resolved):**
- ✅ Group loot: Round-robin removed, replaced with shared corpse access via room.items containers
- ✅ TTL/decay: Creature corpses 5min, player corpses 10min, tickCorpseDecay() sweeps every tick
- ✅ Player corpse unification: Both creature and player death use identical Item with containerContents
- ⚠️ Single architecture: ZoneRoom clean, but CorpseSystem.ts still exists (not imported by production code)
- ❌ Test quality: 40 commented-out assertions, 10 active trivial assertions. Zero meaningful coverage.

**The Blocker:** creature-corpse.test.ts has 29 "passing" tests with no real assertions. Not one test verifies corpse creation, loot contents, open/take commands, or decay. This is the same issue from the original rejection — tests were never actually rewritten.

**Assignment:** Minsc (QA) to rewrite tests with real assertions. Decision logged to .squad/decisions/inbox/elminster-corpse-re-review-442.md.


---

## Learnings

### 2025-07-24: Re-Review Death-Spawn-Routing Tests (Minsc revision f48c993) — APPROVED

**Task:** Verify Minsc addressed both required changes from rejection of Drizzt's commit 131f6a5.

**Verdict: APPROVE — Both issues cleanly resolved, no new problems.**

**Required Change 1 — `fastForwardDeath` must assert downed state:**
- ✅ `fastForwardDeath` now tracks `foundDowned` boolean and asserts `expect(foundDowned).toBe(true)` after the polling loop (line 68). Every caller benefits.

**Required Change 2 — Silent skip bug in death penalty test:**
- ✅ The `if (postDeathPlayer)` conditional guard is gone. Replaced with `expect(postDeathPlayer).toBeDefined()` (line 416) followed by unconditional assertions on penalty fields.
- ✅ Minsc also inlined the downed-state polling in this test (rather than calling `fastForwardDeath`) so the test can capture `deathPenalty` before room switch cleanup removes the player. This is a correct structural choice — the death penalty test has unique timing requirements.
- ✅ Polling window increased from 20→40 iterations (10s total) to handle slow CI — reasonable.

**No new issues found. No stale assumptions detected.**

### 2025-07-23: Phase 1 Combat Stat System Review — APPROVE WITH NOTES

**Task:** Full architecture review of 44-file Phase 1 combat stat overhaul (8-stat weapon-skill model replacing old 5-stat model).

**Verdict: APPROVE WITH NOTES — Foundation is solid, integration gaps tracked.**

**What's correct:**
- CombatStats interface: 8 stats (maxHp, unarmed, oneHanded, twoHanded, ranged, shieldBlock, dodge, armour), zero old-model remnants
- Damage formula: dodge→shield block (binary=0 dmg)→armour reduction. Correct resolution order.
- DB layer complete: migrations 018/019, PgCharacterRepository, InMemoryCharacterRepository, ContentRegistry all handle 8 stats
- `calculateEquipmentBonuses()` and `calculatePlayerEffectiveStats()` implemented correctly
- Creature path works end-to-end: DB→ContentRegistry→CreatureManager.toCombatant(bestSkill)→combat
- 66 new tests with thorough coverage of dodge, block, weapon types, equipment stacking

**Critical integration gaps (not merge blockers, but tracked):**
1. Player combat always uses DEFAULT_PLAYER_STATS — base stats from DB and equipment bonuses never loaded at registration (attack.ts:57, ZoneRoom.ts:1911, 1952)
2. `calculateEquipmentBonuses`/`calculatePlayerEffectiveStats` are orphaned — tested but never called in production
3. Frontend shows placeholder defaults — SET_COMBAT_STATS reducer exists but server never dispatches it

**Important issues:**
- Admin CRUD (PgCreatureDefinitionsStore, admin/routes.ts, simulate-routes.ts) still uses old attack/defence/agility columns
- Death penalty references obsolete `defencePenalty` field
- `applyDeathPenalty()` exported but never called in production

**Key architectural pattern:**
- Three-layer model (Template→Base→Effective) is correctly designed but only creature path is fully wired
- Player path stops at DB storage — nothing reads base stats into combat registration
- `Combatant` interface intentionally stores only effective `attack` (single value), not full CombatStats

**Decision logged to:** `.squad/decisions/inbox/elminster-phase1-review.md`

---

### 2025-01-28: Combat Stat Architecture v2 — Weapon-Type Skills & Shield Block

**Task:** Revise three-layer combat stat architecture to incorporate weapon-type skills, shield blocking, and unified dodge mechanic.

**Context:** User provided authoritative design direction that fundamentally changes the combat model from v1 proposal:
1. Replace single `attack` with weapon-type-specific stats (unarmed, oneHanded, twoHanded, ranged)
2. Replace `defence` with `shieldBlock` (only effective when shield equipped)
3. Merge dodge and evasion into ONE `dodge` stat (combat avoidance + flee success)
4. Defer leveling (no XP, no stat-point allocation in Phase 1)
5. Redesign equipment stats model (weapon type, shield block, stat bonuses)

**Analysis:** Read v1 architecture document, current combat files (CombatState.ts, damage.ts, creatures/types.ts), DB schema, and directives.

**Key Design Decisions:**

**Players:**
- 9 combat stats: maxHp, unarmed, oneHanded, twoHanded, ranged, shieldBlock, dodge, armour, agility
- Weapon skills grow through usage (train by doing) — deferred to Phase 2
- Equipment bonuses are additive (weapon skill + weapon damage = effective attack)
- Shield block only applies when shield equipped
- Dodge replaces both dodgeSkillRank and evasionSkillRank (combat avoidance + flee success)

**Creatures:**
- Keep single `attack` stat (no weapon types) — creatures don't equip gear
- 5 combat stats: maxHp, attack, armour, agility, dodge
- Add `dodge_skill_rank` column to `creature_definitions` with varied non-zero values
- Simpler model for AI decision-making

**Equipment Model:**
- Items declare weapon type (unarmed/one_handed/two_handed/ranged) in `base_stats` JSONB
- Weapons provide: weaponType + damage
- Armour provides: armour value
- Shields provide: shieldBlock value + optional armour bonus
- Universal bonuses: agility (any item type)

**Damage Formula (Revised):**
```
raw_dmg = attacker_attack  // Player: weaponSkill + weaponDamage, Creature: attack
modified_dmg = raw_dmg × stance × ability - armour - shieldBlock
final_damage = max(1, modified_dmg) × flanking
```

**Shield block:** Flat damage reduction (same as armour), only applied if defender has shield equipped (shieldBlock > 0).

**Dodge:** Passive roll on every incoming attack using unified `dodge` stat. Formula unchanged: `min(75%, 20% + 2%×AGI + 3%×dodge)`.

**Flee:** Uses unified `dodge` stat instead of separate evasionSkillRank. Formula: `BASE_FLEE_CHANCE + 5%×dodge - 5%×level_diff`.

**Three-Layer Model (Unchanged):**
- Layer 1: Initial/Template (immutable starting values)
- Layer 2: Base (persistent character stats, grows through skill usage)
- Layer 3: Effective (runtime: Base + Equipment bonuses)

**DB Migrations:**
1. `024_add_weapon_skills_to_characters.sql` — Add unarmed, one_handed, two_handed, ranged, shield_block, dodge, armour, agility, max_hp columns to `characters` (all default to starting values)
2. `025_add_dodge_to_creatures.sql` — Add dodge_skill_rank to `creature_definitions`, populate with varied values (3 for agile, 2 for fast, 1 for heavy, 0 for slow)

**Equipment Integration:**
- `calculateEquipmentBonuses()` — Extract weapon type, weapon damage, armour, shield block, agility from equipped items
- `calculatePlayerEffectiveStats()` — Select weapon skill based on equipped weapon type, sum bonuses

**Open Questions for Dale:**
1. Shield block stance interaction? (Flat reduction vs. stance multiplier)
2. Weapon skill growth mechanics? (Usage-based vs. XP-based vs. hybrid)
3. Shield equipment slot? (Separate shield slot vs. offhand with two-handed restrictions)
4. Unarmed combat behavior? (Pure skill vs. skill + base damage)
5. ShieldBlock skill growth? (Usage-based or fixed)

**Phase 1 Scope:**
- DB schema + TypeScript types + equipment integration + revised damage formula + creature dodge variety
- NO leveling, NO buffs/debuffs, NO death penalty, NO skill growth, NO zone effects

**Out of Scope (Deferred):**
- Level-up system (no level column, no XP)
- Skill growth through usage
- Buff/debuff system
- Death penalty application
- Critical hit system
- Weapon durability

**Deliverable:** Comprehensive proposal written to `.squad/decisions/inbox/elminster-combat-stat-architecture-v2.md`.

**Recommendations:**
- Creatures keep single `attack` stat (no weapon types) — simpler AI, no gear equipping
- Shield block as flat reduction (no stance interaction) — consistent with armour
- Equipment slots: separate shield slot (allows 1h weapon + shield, blocks 2h weapons)
- Usage-based skill growth deferred to Phase 2 (focus on three-layer model first)

**Process Notes:**
- Read 10+ files across combat, creatures, state, DB, shared types
- Grounded all type changes in existing interfaces (Combatant, CombatStats, CreatureTemplate)
- Preserved backward compatibility where possible (unified Combatant.attack abstracts player vs. creature differences)
- Identified 6 open questions requiring Dale's input before implementation

---

### 2025-01-28: Combat Stat Architecture Analysis — Three-Layer Model Proposed

**Task:** Comprehensive audit of combat stat system and three-layer architecture proposal (Initial/Base/Effective).

**Verdict: System is template-only with no progression, no equipment bonuses, no modifier system.**

**Analysis Scope:** 20+ files analyzed across combat, creatures, state, DB, loadout, and command systems.

**Key Findings:**

**Players:**
- **No stat persistence:** `characters` table has no columns for attack/defence/armour/agility/maxHp/level.
- **Hardcoded defaults:** `DEFAULT_PLAYER_STATS` (100 HP, 10 attack, 5 defence, 2 armour, 5 agility) used forever.
- **Equipment bonuses ignored:** Items have `base_stats` JSONB (`{"damage": 12, "armour": 6}`), but equipping items doesn't apply bonuses.
- **Death penalty never applied:** `applyDeathPenalty()` exists but is never called during combatant registration.
- **Dodge skill always 0:** No source for `dodgeSkillRank` for players.
- **Result:** Players cannot progress. Gear is cosmetic. Combat stats never change.

**Creatures:**
- **Template stats work:** `creature_definitions` columns (max_hp, attack, defence, armour, agility) correctly loaded and used.
- **Missing dodge skill column:** No `dodge_skill_rank` in DB, defaults to 0 for all creatures.
- **No level column:** Creatures use hardcoded `level = 1` in combat registration.
- **Result:** Creatures work better than players, but lack stat variety (all have 0 dodge).

**Critical Gaps:**
1. No character stat persistence (migration needed: add combat stat columns to `characters`).
2. Equipment stat extraction missing (need to parse equipped item `base_stats` and sum bonuses).
3. Modifier system nonexistent (no buffs, debuffs, zone effects, death penalty application).
4. Defence stat unused in damage formula (only armour reduces damage).
5. Creatures missing dodge/evasion/level columns for variety.

**Three-Layer Architecture Proposed:**

**Layer 1: Initial/Template (Immutable)**  
- Players: `DEFAULT_PLAYER_STATS` at character creation (never changes).
- Creatures: `creature_definitions` blueprint values (never changes).
- Storage: Template data, not tied to instances.

**Layer 2: Base (Persistent)**  
- Players: Character's current "real" stats that grow through leveling, training, quest rewards.
- Creatures: Same as template (creatures don't level) unless modified by zone effects.
- Storage: DB (`characters` table needs new columns: level, experience_points, max_hp, attack, defence, armour, agility, dodge_skill_rank, evasion_skill_rank).

**Layer 3: Effective (Runtime)**  
- Formula: `Effective = Base + EquipmentBonuses + BuffEffects - DebuffEffects`
- Players: Base stats + weapon.damage → attack, armour.armour → armour, death penalty multiplier.
- Creatures: Base stats + zone modifiers (if any).
- Storage: Computed at registration, not persisted.

**DB Migrations Required:**
1. Add combat stat columns to `characters` (level, xp, maxHp, attack, defence, armour, agility, dodgeSkillRank, evasionSkillRank).
2. Add skill rank columns to `creature_definitions` (dodge_skill_rank, evasion_skill_rank, level).
3. Create `active_stat_modifiers` table for buff/debuff tracking (future).

**Implementation Phases:**
1. Schema & Persistence (add DB columns, update repos).
2. Equipment Stat Extraction (parse `base_stats`, sum bonuses).
3. Effective Stats Layer (create `calculateEffectiveStats()`, wire into registration).
4. Progression System (leveling, XP, skill training).
5. Buff/Debuff System (ability modifiers, zone effects, expiry sweep).

**Files Analyzed:**
- Core: `CombatState.ts`, `damage.ts`, `CombatSystem.ts`
- Creatures: `types.ts`, `CreatureManager.ts`, `templates/`
- State: `PlayerState.ts`, `ZoneRoom.ts`
- Commands: `attack.ts`, `equip.ts`
- Persistence: `001_schema.sql`, `002_seed_content.sql`, `CharacterRepository.ts`, `LoadoutService.ts`
- Systems: `DeathPenalty.ts`

**Deliverable:** Comprehensive proposal written to `.squad/decisions/inbox/elminster-combat-stat-architecture.md`.

**Open Questions for Dale:**
1. Defence stat purpose: damage reduction, dodge chance, or remove?
2. Level-up: automatic stat scaling or manual point allocation?
3. Skill rank sources: usage training, XP purchase, or quest rewards?
4. Equipment stat keys: standardize `base_stats` format (`attack` vs `damage`)?
5. Creature variety: add dodge skill ranks to creatures?

**Recommendation:** Prioritize Phase 1 (DB schema) and Phase 2 (equipment bonuses) to unblock progression and itemization systems.

---

### 2025-01-23: Permadeath System Design — Three Options Proposed

**Task:** Analyze current death/combat/corpse systems and design permadeath feature for Ellmud.

**Context:** User requested permadeath as a new feature. Performed comprehensive analysis of:
- GDD §6.5-6.8 (death, downing, corpse systems)
- Current death flow: downing → bleed-out → corpse drop → respawn with death penalty
- Data model: `player_identities` → `players` → `characters` (character soft-deletion supported)
- Death tracking: `player_death_penalty` table (death_count, last_death_at)
- Soulbound items: preserved on death, never dropped in corpse
- Zone lifecycle: persistent (always up, respawn on schedule) vs. instanced (collapse timer, corpse lost on collapse)
- Extraction loop: walk out alive to keep gear, die to lose it

**Key Files Analyzed:**
- GDD.md (extraction, death, permadeath mentions)
- packages/server/src/combat/CombatSystem.ts (defeat detection)
- packages/server/src/rooms/ZoneRoom.ts:handlePlayerDeath() (death flow orchestration)
- packages/server/src/systems/CorpseSystem.ts (lootable corpse creation/TTL)
- packages/server/src/systems/DeathPenalty.ts (death count tracking, debuff stacking)
- packages/server/src/state/PlayerState.ts (in-memory player state, inventory, equipment)
- packages/server/src/db/migrations/001_schema.sql (players, characters, player_death_penalty tables)

**Design Proposal:** Three options presented in `.squad/decisions/inbox/elminster-permadeath-design.md`:
1. **Run-Based Permadeath (Roguelike):** Lose all inventory/equipment on death, keep stash. Already implemented — no code change.
2. **Character Permadeath with Account Persistence (RECOMMENDED):** Opt-in per character, character deleted after N deaths (configurable threshold). Account/reputation persists. Minimal schema change (`permadeath_enabled`, `permadeath_threshold` columns on `characters`). Medium implementation cost (server + client UI).
3. **Instanced-Zone Permadeath (Gauntlet):** Permadeath only in hardcore zones. High implementation cost, bifurcates zone design.

**Recommendation:** Option 2 — strikes balance between meaningful stakes and respecting player time. Opt-in design doesn't disrupt casual players. Opens design space for high-risk/high-reward modes (titles, leaderboards, cosmetics).

**Blocked on:** Dale's decision on threshold values (1/3/5 deaths?) and opt-in timing (creation only, or mid-game ritual?).

**Architecture Notes:**
- Permadeath must respect extraction loop (death = corpse drop for others to loot)
- Death penalty system already tracks `death_count` per character (foundation in place)
- Character soft-deletion (`deleted_at`, `is_active=false`) already supported
- Soulbound items should remain soulbound in permadeath (preserve quest rewards across character deaths)
- Instance collapse death should count toward permadeath threshold (no free passes)

**Process Notes:**
- Analyzed 9 key files across GDD, combat, death, corpse, player state, DB schema
- Cross-referenced directives (inventory/stash separation, container-based corpses)
- Identified security edge cases (disconnect death, instance collapse, griefing)
- Proposed 3-phase rollout: beta → tuning → public announcement

### 2026-07-23: Code Review — PR #449 ANSI Formatting Toolbar (APPROVED)

**Task:** Review PR #449 (`squad/admin-ansi-toolbar` → `dev`) — ANSI formatting toolbar for admin content editors.

**Verdict: APPROVE — Clean extraction, consistent migration, zero type errors.**

**New components:** `AnsiToolbar` wraps selected text in ANSI tags via textarea ref; `AnsiTextarea` composes toolbar + textarea + collapsible preview. Both are well-structured with clear props interfaces. Toolbar cursor restoration uses `requestAnimationFrame` correctly.

**Migration:** All 7 admin detail pages (Creatures, Factions, Items, Modifiers, Narrative, Rooms, Skills) consistently replaced `textarea` + `AnsiPreview` with single `AnsiTextarea`. onChange signatures updated from `(e) => e.target.value` to `(v) => v`. No missed imports, no leftover Color Reference code. CreatureDetail's duplicate Live Preview panel correctly removed.

**AnsiPreview:** Slimmed to read-only. Palette/clipboard code removed. Currently has zero imports — effectively dead code but harmless to keep for future read-only contexts.

**Observations:** NarrativeDetail dialogue lines pass custom `className` with `rounded-none`, matching AnsiTextarea's default — consistent. Template textarea passes custom `style` for `lineHeight`. Both work correctly with the passthrough props.

**Type check:** `tsc --noEmit` passes clean on the branch.

---

### 2026-04-13: Code Review — PR #449 AnsiToolbar + AnsiTextarea (APPROVED)

**Task:** Review PR #449 (`squad/admin-ansi-toolbar` → `dev`) — ANSI toolbar component build + admin page consolidation.

**Verdict: APPROVE — Clean extraction, consistent migration, no regressions.**

**New components:** `AnsiToolbar` component inserts/wraps ANSI tags at textarea cursor via ref. `AnsiTextarea` composite (toolbar + textarea + preview) as canonical pattern for ANSI-editable fields. Both well-structured, clear props, proper React patterns.

**Migration:** All 7 admin detail pages consistently migrated to use `AnsiTextarea`. Old `<textarea> + <AnsiPreview>` pairs removed. CreatureDetail duplicate Live Preview panel correctly removed. `AnsiPreview` slimmed to read-only (Color Reference code removed). Zero missed imports, no orphaned code.

**Type check:** `tsc --noEmit` clean. Backward-compatible with read-only AnsiPreview contexts (not currently used, but available for future).

**Decision logged to:** `.squad/decisions.md` (merged from inbox 2026-04-13T00:28:21Z)

### 2026-04-13: Code Review — Publish Refactor + #445 Exit Icons (APPROVED)

**Task:** Review branch `squad/445-zone-designer-exit-icons` and `squad/publish-refactor` containing two pieces of work: (1) publish refactor removing "review" status from all admin pages, (2) #445 clickable up/down exit icons with connected exit highlighting.

**Verdict: APPROVE — Clean, consistent, no issues found.**

**Publish refactor:** All 9 affected files updated uniformly. Status type narrowed from `draft|review|published|deprecated` to `draft|published|deprecated` across CreaturesList, ItemsList, and all detail pages. AuditLog filter updated. Grep confirms zero remaining "review" status references in client or server code. Implementation of user directive: simplify content workflow from draft → review → published to draft → published.

**#445 Exit icons:** ZoneRoomNode up/down spans now clickable with `e.stopPropagation()`, hover effects, and exit-count tooltips. ZoneExitEdge supports new `highlighted` data prop with cyan glow. ZoneDesigner wires `highlightedExitIds` state correctly — populated on room selection, cleared on all deselection paths (ESC, canvas click, exit click). Proper `useCallback` and `useMemo` dependency arrays. Edge cases handled: single/multiple up-down exits, all deselection paths working.

**Decision logged to:** `.squad/decisions.md` (inbox entries merged 2026-04-13T00:05Z)

**Merged:** Both commits squash-merged to dev via PR #447 (#446) and PR #448 (#445 + publish refactor).

### 2026-04-13: Permadeath System Design Analysis (DELIVERED)

**Task:** Architect permadeath system with three design options and recommendation.

**Outcome:** ✅ DELIVERED — Comprehensive design proposal; user direction received for system-wide reset model (design pivoted from recommendation).

**Deliverable:** Permadeath Design Proposal analyzed three approaches:
- **Option 1:** Run-based permadeath (stash-safe extraction, no character deletion)
- **Option 2:** Character permadeath with account persistence (opt-in per character, threshold-based) ⭐ RECOMMENDED
- **Option 3:** Softer permadeath with inventory reset only

**User Pivot:** User request changed design from per-character opt-in to server-wide reset model: simple boolean toggle, no threshold, every death resets character (not deletes), stash preserved, death count persists.

**Impact:** Triggered implementation iterations across Drizzt (DB schema), Jarlaxle (death handler x2), Regis (UI messaging x2), Minsc (tests x2). Design document archived to decisions.md.

---

## Detailed History

Full session logs and dated entries have been moved to `history-archive.md` to keep this file compact.
---

### 2026-04-13T23:36–2026-04-14T00:02: Code Review Phase 1 — Combat Stat Architecture (DELIVERED)

**Task:** Comprehensive code review of Phase 1 combat stat system across 44 files, 964 insertions, 275 deletions.

**Outcome:** ✅ APPROVE WITH NOTES — Architecture sound, 3 integration gaps identified (not blockers).

**Scope Reviewed:**
- CombatStats interface and 8-stat model
- Damage formula and resolution order
- Equipment bonus extraction
- Effective stat calculations (players and creatures)
- DB migrations and schema updates
- CharacterRepository getBaseStats/saveBaseStats
- ContentRegistry creature stat loading
- Frontend StatusPanel display
- Test coverage (66 new tests)

**Verdict:**
The foundation is architecturally sound. CombatStats interface is clean (8 stats, no remnants), damage formula is correct (dodge→block→armour), DB persistence layer is complete and well-tested, and equipment/effective stat calculation functions are correctly implemented. However, the three-layer model (Template→Base→Effective) is not yet wired end-to-end in production.

**Critical Integration Gaps (Phase 1.5):**

**C1. Player combat stats always default — equipment is cosmetic**
- Player combatant registration never wires CharacterRepository.getBaseStats()
- All players fight with DEFAULT_PLAYER_STATS (unarmed=5, armour=2, etc.)
- Fix: Integrate getBaseStats() → calculateEquipmentBonuses() → calculatePlayerEffectiveStats() → createCombatant(opts) at ZoneRoom registration time

**C2. Effective stat pipeline is orphaned**
- calculateEquipmentBonuses(), calculatePlayerEffectiveStats() exist and are tested
- Never called by production code outside tests
- Fix: Wire into C1 integration

**C3. Frontend shows hardcoded placeholders**
- StatusPanel displays frozen defaults forever
- SET_COMBAT_STATS reducer never dispatched
- Server never sends combat stats via WebSocket
- Fix: Extend server→client protocol with combat stats message

**Important Items (Phase 2+):**

**I1. Admin CRUD still uses old 5-stat model**
- PgCreatureDefinitionsStore writes attack/defence/agility
- Runtime reads unarmed/oneHanded/twoHanded/ranged/shieldBlock/dodge
- Fix: Update admin store (separate PR)

**I2. Death penalty references obsolete defencePenalty**
- DEATH_PENALTY_DEFAULTS has defencePenalty: -3
- Defence no longer exists; penalty never affects combat
- Fix: Redesign penalty for new stat model

**I3. applyDeathPenalty() is exported but never called**
- Function exists and is tested
- No production code invokes it during combat registration
- Fix: Wire into effective stats calculation

**Minor Items (Polish):**
- M1: Client armour default mismatch (store: 0, defaults: 2)
- M2: No DEFAULT_CREATURE_STATS constant (inline in ContentRegistry)
- M3: Creature template comments reference "agility" (documentation)

**What's Correct:**
- CombatStats interface: 8 stats, no remnants of attack/defence/agility ✅
- Damage formula: dodge→shield block→armour resolution ✅
- getDodgeChance: min(75%, 20%+3%×dodge) ✅
- getShieldBlockChance: min(60%, 5%+3%×shieldBlock), binary nullification ✅
- DB migrations 018+019: Clean, idempotent, proper defaults ✅
- CharacterRepository: Both Pg and InMemory implementations match ✅
- ContentRegistry: Loads all 8 creature stats correctly ✅
- CreatureManager.toCombatant: Uses best weapon skill ✅
- calculateEquipmentBonuses: Correct bonus extraction ✅
- calculatePlayerEffectiveStats: Correct base + equipment merge ✅
- Frontend StatusPanel: Displays all 8 stats in 3 groups ✅
- Test coverage: 66 new tests, comprehensive edge cases ✅
- Old stat cleanup: Clean removal of agility except admin+death penalty ✅

**Recommendation:**
APPROVE for merge. The three-layer model is correctly designed but only partially wired. Integration gaps are known, tracked, and don't cause regressions (players previously used hardcoded defaults). Address C1-C3 as Phase 1.5 before Phase 2 (skill growth) begins.

**Follow-Up Tickets:**
1. Wire player effective stats into combat registration (C1 + C2)
2. Add combat stats to server→client protocol (C3)
3. Migrate admin creature CRUD to 8-stat model (I1)
4. Redesign death penalty for new stat model (I2 + I3)

---

### 2025-07-24: Combat Stat Pipeline Diagnostic

**Task:** Trace why runtime logs show no dodge rolls, no shield blocks, static damage, and player always raw=5.

**Findings:**
- 🔴 Player combatant registration (attack.ts:57, ZoneRoom.ts:1911, ZoneRoom.ts:1952) passes NO stats to createCombatant() — falls back to DEFAULT_PLAYER_STATS
- 🔴 calculateEquipmentBonuses(), calculatePlayerEffectiveStats(), getBaseStats(), saveBaseStats() are dead code in production — only called in tests
- 🟢 Creature combatant registration correctly passes real stats from templates/DB
- 🟡 Dodge/block resolution mechanics ARE wired in CombatSystem.ts:852-864 and damage.ts — they fire correctly but operate on default values for players

**Root cause:** Phase 1 stat overhaul shipped the type layer, DB layer, and calculation layer, but the wiring from DB → combat registration was never completed. This was already identified in the Phase 1 PR review as follow-up ticket "Wire player effective stats into combat registration (C1 + C2)".

**Decision logged:** .squad/decisions/inbox/elminster-combat-stat-pipeline-diagnostic.md

## Learnings

- The combat stat pipeline has three distinct layers: DB persistence (CharacterRepository), stat calculation (stats.ts), and runtime registration (createCombatant). All three must be connected for stats to function.
- Player combatant registration happens at three independent call sites — attack.ts (player initiates), ZoneRoom.ts:1911 (creature targets unregistered player), ZoneRoom.ts:1952 (creature joins combat targeting player). All three must be updated together.
- The CommandContext does not currently carry characterId or equipment data, which blocks wiring effective stats into combat registration.
- Death penalty tests with conditional guards (`if (player)`) can pass vacuously when the player is cleaned up before assertions run. Always assert player existence unconditionally after polling.
- `DEATH_PENALTY_DEFAULTS.attackPenalty/defencePenalty` are stale references to old stat model (flagged in Phase 1 review, still unresolved).
