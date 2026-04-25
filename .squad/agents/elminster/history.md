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

### 2025-07-26: Review PRs #472 & #473 — Combat HP Persistence + Character Select Redesign

**Task:** Architecture review of two PRs targeting `dev` branch:
- PR #472: Combat consistency (HP persistence between encounters, terminal COMBAT_STATE signal, dead creature filtering)
- PR #473: Character select redesign (extended CharacterSummary with baseStats/equipment/statPoints, loadout query optimization)

**Verdict: BOTH APPROVED ✅**

**PR #472 — Combat HP Persistence:**
- Server-authoritative HP cache in ZoneRoom (`playerCurrentHp` Map) survives encounters but clears on death/disconnect
- Cache lifecycle correct: set on encounter end (HP>0), use on registration (3 sites), clear on disconnect/death/respawn
- Terminal empty COMBAT_STATE signal (`combatants: []`) eliminates client-side cleanup race — server broadcasts after caching HP, client dispatches `inCombat: false`
- Client reducer refactor: `SET_COMBAT_STATE inCombat:false` now clears ALL combat state (combatants, hostileIds, targetId, tick, enemyStatus, pendingAction)
- Moved combat clear to *before* hub check on room switch — combat now clears on every room transition, not just hubs
- Dead creature filtering in StatusPanel (`c.status === 'fighting'`) prevents targeting defeated creatures still in snapshot
- Test coverage: 11 server + 6 client tests with real assertions, no conditional guards

**PR #473 — Character Select Redesign:**
- CharacterSummary extended with `baseStats?` (8-stat Phase 1), `equipment?` (slot → item), `statPointsAvailable?` (Phase 2 prep)
- N+1 bug fixed: loadout query hoisted outside character loop (player has one loadout shared across all characters, saves N-1 queries)
- Type safety clean: no unsafe casts, `BaseStatKey = keyof NonNullable<CharacterSummary["baseStats"]>` for key narrowing
- Both PgCharacterRepository and InMemoryCharacterRepository updated, test mocks reordered to match hoisted query
- UI: three-panel layout (cards/detail/creation), click-to-highlight, keyboard nav, `e.stopPropagation()` on buttons
- Loadout query joins `player_loadout` → `item_definitions` (player-scoped, not character-scoped) — correct architecture

**Architecture Patterns Validated:**
1. **Server-auth state caching:** In-memory cache in ZoneRoom for inter-encounter persistence, cleared on state transitions (death/disconnect). No DB writes for transient combat state.
2. **Terminal signals:** Empty message broadcasts to eliminate client race conditions on state transitions.
3. **Client reducer consolidation:** Single action (`SET_COMBAT_STATE`) clears multiple related fields — reduces dispatch fragmentation.
4. **Query optimization:** Hoist player-scoped queries outside character loops when data is shared across entities.
5. **Type narrowing for dynamic keys:** `keyof NonNullable<T[K]>` pattern prevents index signature errors on optional nested objects.

**Key Finding:** PR #473 was previously rejected for N+1 bug and type cast — Minsc's revision correctly fixed both issues. This is the second time Minsc has successfully resolved architectural blockers after rejection (first was death-spawn-routing tests f48c993).

**Decision:** No inbox decision file needed — both PRs approved for merge, no team-wide policy changes.

---

### 2026-04-18: Architecture Review — PRs #472 & #473 (Character Select Redesign) — APPROVED

**Task:** Architecture review of PRs #472 & #473 extending character select with base stats and equipped items display.

**Verdict: APPROVE BOTH — No architecture violations. Patterns correct.**

**PR #472 Review:**
- ✅ Type system properly extends CharacterSummary with baseStats, equipment, statPointsAvailable
- ✅ Database query pattern validated—loadout query properly hoisted outside character loop (single query per player, not per character)
- ✅ No duplicate type definitions found (CharacterSummary correctly defined once)
- ✅ Follows established repository pattern; schema design sound

**PR #473 Review:**
- ✅ React component structure adheres to project conventions
- ✅ State management pattern consistent with other character-scoped components
- ✅ No type casting issues or bypass patterns detected
- ✅ Query strategy avoids N+1 anti-patterns
- ✅ Integrates cleanly with existing character lifecycle

**Actions Taken:**
- ✅ Posted architecture approval comments to both PRs
- ✅ Verified no blocking issues in architectural scope
- ✅ Confirmed adherence to established patterns and conventions

**Collaboration Note:** Minsc's test review confirmed full test coverage passing (3843 tests). Both agents' approvals aligned—no conflicts or follow-up concerns.

### 2026-04-19: Review PR #480 — Expand E2E Combat Coverage (APPROVE_WITH_NOTES)

**Task:** Evaluate whether Minsc addressed all 6 review notes from PR #479 (3 coverage gaps, 3 weak assertions).

**Verdict: APPROVE_WITH_NOTES — 5/6 fully addressed, 1/6 via honest proxy.**

**Coverage gaps addressed:**
- ✅ Combat completion: kills sludge_crawler, verifies "defeated" + "combat has ended". Uses `peaceful` mode to isolate from wandering creatures — clever.
- ✅ Movement block: exact message match on `go` rejection during combat. Kept in faction_hub zone (sync-only) — correct.
- ⚠️ Creature assist: no DB creatures have assist configs, so test proxies via two aggressive flood_scuttlers engaging independently. Proxy rationale documented honestly. `strikeMessages >= 1` should be `>= 2` to prove both engaged.

**Weak assertions tightened:**
- ✅ Observer: `seesAlice || seesCombat` → `waitForMessage(/strikes.*for \d+ damage/i)` — strong.
- ✅ Flee: `m.length > 20` → verifies `go` works after flee (proves not in combat) — strong.
- ✅ Aggressive: manual `attack` → player walks into creature's room, combat starts without `attack` — genuine auto-aggro test.

**Infrastructure:** DEV_MODE_ENABLED enables `goto`/`peaceful` for all e2e tests. `teleportToWarrens` helper with double zone-load confirmation. Good file-level JSDoc explaining faction_hub vs dungeon zone.

**Non-blocking suggestions:** (1) `strikeMessages >= 2` in multi-creature test, (2) explicit throw after flee retry loop exhaustion.

**Decision logged to:** `.squad/decisions/inbox/elminster-e2e-combat-review-480.md`

### 2025-07-24: Zustand Adoption Evaluation — Client State Management

**Task:** Architectural assessment of whether adopting Zustand would simplify client-side state management.

**Current pattern:** React Context + useReducer with a monolithic AppState (30+ fields), single appReducer (~25 action types), consumed via useAppContext() across ~30 files. WebSocket handlers in useZoneConnection (~450 lines) dispatch 3-5 actions per message.

**Verdict: RECOMMEND ✅ — Incremental migration**

**Key findings:**
- Re-render blast radius is the primary concern: every dispatch re-renders all context consumers. In a real-time game with combat ticks arriving 10-50x/sec, this is a performance landmine.
- Zustand selectors solve this directly — components subscribe only to the state they use.
- Store slices (auth, combat, inventory, connection) map cleanly to existing state domains.
- WebSocket handlers can call store methods directly without React dependency or dispatch ceremony.
- Migration scope: ~30-40 files, ~3-5 days, can be done in 4 incremental phases.
- Risk profile: manageable. Biggest risk is useZoneConnection rewrite (highest complexity, highest benefit).

**Conditions:** Incremental migration (no big-bang), move Colyseus Room out of store, split into domain slices from day one, keep connection.ts framework-agnostic.

## Learnings

- Client state is React Context + useReducer with a single monolithic AppState blob consumed by ~30 files. No selector layer exists — every dispatch triggers re-renders across the entire consumer tree.
- useZoneConnection.ts (~450 lines) is the central WebSocket→state bridge: 15+ Colyseus message handlers each dispatch multiple actions. This is both the most complex and most performance-critical file on the client.
- The Colyseus Room instance is stored in both AppState.room (reactive context) and roomRef (useRef). The context copy is unnecessary and should be a ref only.
- connection.ts uses a MessageHandlers interface pattern that cleanly decouples transport from state — any state management migration should preserve this separation.

---

### 2026-04-20: Zustand Client State Management Evaluation (Architect)

**Status:** ✅ Complete — Recommendation delivered

**Task:** Conduct architectural evaluation of adopting Zustand to replace React Context + useReducer for client state management.

**Scope:** 
- Assess Zustand fit for real-time multiplayer game architecture
- Compare alternatives (Redux Toolkit, Jotai, Valtio)
- Design incremental 4-phase migration strategy
- Estimate effort and identify risks

**Key Recommendation:** ✅ **ADOPT ZUSTAND**

**Highest-value win:** Selector-based subscriptions eliminate re-render blast radius from high-frequency WebSocket updates (10-50 state changes/sec during combat). Every context change currently triggers entire component tree re-render; Zustand selectors re-render only affected components.

**Proposed 4-Phase Migration:**
1. **Phase 1 (1 day):** Parallel store — Zustand coexists with Context, both functional
2. **Phase 2 (1 day):** Migrate WebSocket handlers — highest-risk/highest-reward. Eliminates dispatch ceremony from `useZoneConnection.ts` (577 lines)
3. **Phase 3 (1-2 days):** Migrate components (23 files) — mechanical find-replace to selectors
4. **Phase 4 (0.5 day):** Remove Context, cleanup tests

**Total effort:** 3.5-4.5 days focused work, incremental phases allow rollback at any point.

**Files affected:** ~30-40 files (store.ts, 8 hooks, 12 components, 6 pages, 1 service, 10-15 tests)

**Deliverable:** `.squad/decisions/inbox/elminster-zustand-evaluation.md` (139 lines) — merged to decisions.md

**Process:**
- Paired evaluation with Regis (frontend audit of current state)
- Both agreed on fit and migration approach
- Condition: move Colyseus Room out of store (belongs in ref, not reactive state)
- Condition: split into domain slices from day one (don't recreate monolithic store)

**Next:** Team planning for Phase 1 prep (store slices sketch, Zustand docs review)

