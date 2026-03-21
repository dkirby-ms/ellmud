# Jarlaxle — History

## Project Context

- **Project:** Ellmud — PvPvE Extraction RPG / Real-Time MUD
- **Stack:** Node.js, WebSocket/SSH, LLM integration for narrative
- **What:** Procedurally generated shard instances, tick-based combat, server-authoritative game state, LLM narration layer
- **User:** dkirby-ms
- **GDD:** GDD.md (comprehensive design document covering all game systems)

## Core Context (Phase 1 Foundation — Completed)

**Completed work (high-level summary):**
- ✅ PostgreSQL schema: Player/identity normalization, faction/skill types, JSONB item stats (Issue #3)
- ✅ Room graph generation: Biome templates, PRNG, distance enforcement, 101 tests (Issue #5)
- ✅ Combat system: Strike/dodge/flee, simultaneous resolution, pure game logic, 32 tests (Issue #6)
- ✅ Creature AI: Behavior trees, deterministic spawning, loot system, 41 tests (Issue #7)
- ✅ Shard exploration UI: Sidebar, combat overlay, HP tiers, 68 tests (Issue #66)
- ✅ ACA deployment fix: Clear bootstrap args, improved health check validation

**All tests passing, zero regressions. Phase 1 client UI 70% complete.**

---

## Learnings (Archived — See Detailed Session Records)

### 2026-03-19: PostgreSQL schema (Issue #3)
- Created 5 migration files under `packages/server/src/db/migrations/` (001–005).
- Player identity is normalized separately from player profile — `player_identities` table has provider/provider_id for OAuth bolt-on in Phase 4.
- Used GDD as source of truth for faction names (Ironwright Compact, Veil Cartographers, Scarlet Ledger) and skill categories (6 categories: combat, defence, survival, subterfuge, awareness, social) — the issue text had slightly different names.
- Item stats stored as JSONB for flexibility across item types.
- Faction membership enforces one-faction-at-a-time via UNIQUE constraint on player_id.
- TypeScript types in `db/types.ts` import GearTier, BiomeType, ShardTier from @ellmud/shared to stay in sync.
- DB connection module uses `pg.Pool` with `DATABASE_URL` env var. Migration runner uses a `_migrations` meta-table for idempotency.
- Pre-existing build errors exist in `state.ts` (@colyseus/schema missing) and client `vite.config.ts` — not related to this work.

### 2025-07-25: Room Graph Generation (Issue #5)
- Created 6 files: shared types (`room-graph.ts`), PRNG (`prng.ts`), Flooded Crypt biome (`flooded-crypt.ts`), graph generator (`generator.ts`), and 15 unit tests (`shard-gen.test.ts`).
- **Graph algorithm:** Backbone chain through fill rooms, entries attached at start, extractions at end, boss in middle. Cycles added with proximity constraint to avoid shortcutting the backbone.
- **Distance enforcement is iterative:** Cut edges on shortest entry→extraction paths, then repair connectivity with distance-aware reconnection. This was tricky — naive repair re-introduces shortcuts. The fix: after each repair link, BFS-check the distance constraint and undo if violated.
- **PRNG:** mulberry32 algorithm, fully deterministic. `createPRNG(seed)` returns `next()`, `nextInt()`, `pick()`, `shuffle()`.
- Shared types re-exported from `@ellmud/shared` barrel — cannot use subpath imports (`@ellmud/shared/room-graph.js`) without package.json `exports` field.
- Biome templates are separate from the generator — adding a new biome only requires a new template file, no generator changes.
- Serialization uses `Map → Object.fromEntries` for JSON compat, `deserialize` reconstructs Maps.
- All 8 server test files pass (101 tests, 24 skipped). Shared tests also pass (38 tests).

### 2025-07-25: Basic Combat System (Issue #6)
- Created 6 files in `packages/server/src/combat/`: CombatState, CombatSystem, damage, actions, index barrel.
- **Damage formula:** `max(1, floor(raw_dmg × stance_multiplier - armour))`. Stance multipliers: Strike vs Strike=1.0, Strike vs Dodge=0.5, Strike vs Flee=1.0. Non-strike actions deal 0 damage.
- **Simultaneous resolution:** All damage calculated from start-of-tick HP, then applied at once. Two combatants can kill each other in the same tick.
- **No-input defaults to dodge** — if a combatant doesn't submit an action before tick resolution, they automatically dodge.
- **Combat timeout:** 10 consecutive ticks with no strike actions ends the encounter. Immediate end if ≤1 combatant remains.
- **CombatSystem is pure game logic** — no Colyseus dependency. Takes an `ExitResolver` callback for flee mechanics. ShardRoom calls `resolveTick()` in its existing `update()` method.
- **Encounter model:** Per-room, multiple combatants can join. `initiateCombat()` creates or joins existing encounter. Each combatant maps to one encounter via `combatantEncounter` index.
- **Flee:** Combatant moves to first available exit (or specified direction). Takes full damage from strikers that tick (flee provides no defense). Removed from encounter after resolution.
- Added 4 command handlers: `attack`, `strike`, `dodge`, `flee`. Extended `CommandContext` with optional `combatSystem` field (type-only import, no runtime coupling).
- Added `strike`, `dodge`, `flee` to parser's KNOWN_VERBS. `attack` was already there with `k` alias.
- Appended `CombatResultMessage` and `COMBAT_RESULT` message type to shared (append-only as required).
- 32 unit tests covering all stance combos, simultaneous resolution, default dodge, timeout, flee success/failure, HP tracking, multi-combatant, and resolution order.
- Pre-existing test failures: shard-lifecycle (hook timeout), narrative (timing). Not related to combat changes.

### 2026-03-19: Command System (Drizzt Issue #8) — Cross-Team Context
- Drizzt completed Issue #8: command parser, movement/inventory handlers, ShardRoom integration (44 new tests, 100 total passing).
- **Key for you:** Movement handlers consume `RoomGraph` from your generator. Each handler validates exits against `room.exits` map (Direction → string room ID).
- **API contract:** `Room` interface in `room-graph.ts` is stable. Drizzt's movement handler expects `room.exits: Map<Direction, string>`. If you change this, let Drizzt know.
- **Combat integration (your Issue #6):** Strike/dodge/flee handlers will follow identical pattern — handler file + registry line. No parser or delivery changes. Reuse the same `CommandContext` and `CommandResult` types.
- **Narration structure:** All handlers return narration entries with `{type: string, text: string}`. Volo (Issue #9) will enrich these with LLM. Handlers never change.
- **Wave 4 context:** You're starting Issue #6 (combat) now. Drizzt #8 is stable foundation. Volo #9 (LLM narration) will land in parallel. Drizzt #12 (auth) won't block your work.

### 2025-07-25: Drowned Revenant Creature + AI Behavior Tree (Issue #7)
- Created 7 files: types, behavior tree, CreatureManager, loot system, Drowned Revenant template, barrel export, and 41 unit tests.
- **Behavior tree is pure state machine:** idle→alert→hostile→fleeing. All transitions deterministic — no Math.random anywhere. Uses `simpleHash(creature.id + idleTicks)` for patrol room selection.
- **Fleeing is terminal in Phase 1:** Once a creature enters fleeing state, it never recovers. Simplifies reasoning. If cornered (no exits), falls back to dodge.
- **Berserker archetype:** Drowned Revenant always strikes in hostile state, targets first player in room (deterministic ordering).
- **Combat integration is clean:** `toCombatant()` converts Creature→Combatant, `syncFromCombat()` syncs HP/room back. No modifications to CombatSystem needed — the Combatant interface already had `isPlayer: boolean`.
- **Spawn placement uses PRNG shuffle:** Eligible rooms filtered by template rules (forbid entry/extraction, prefer corridors/dead-ends), then shuffled with seeded PRNG. First N rooms from shuffle get creatures.
- **Loot is fully deterministic Phase 1:** Every loot table entry drops on death. Item IDs namespaced by creature ID for uniqueness.
- **CreatureWorldState is a minimal view interface:** `playersInRoom`, `roomExits`, `noisyRooms`. ShardRoom constructs this each tick from its own state. Keeps creature AI decoupled from Colyseus.
- Pre-existing test failure in `commands.test.ts` (expects 5 rooms but test graph now has 6) — not related to creature changes.
- All 41 creature tests pass. All 208 pre-existing tests unaffected.

---
### 2025-07-25: Login Screen Figma Rebuild
- Rebuilt AuthScreen.tsx and styles.css to match `docs/figma-design-prompt.md` — the authoritative Figma design spec.
- **CSS theme overhaul:** Replaced entire `:root` variable block with Figma palette (`#0A0B0F` bg, `#C9A84C` gold accent, `#E8E0D0` warm-bone text, `#12131A` panel, etc.). Added `--font-display` (Cinzel), `--font-serif` (Crimson Text), `--font-sans` (Inter), updated `--font-mono` to JetBrains Mono. Old cyan accent (`#4a9eff`) eliminated.
- **AuthScreen:** Tab-based Login/Register (role="tab"), "ELLMUD" gold display title, static italic subtitle, confirm password field with validation, "Enter the Refuge" / "Create Shardwalker" button labels, rotating flavor text below card.
- **Test updates:** All 8 auth tests updated for new selectors (tab roles, new button names). Added password-mismatch validation test. 45/45 client tests pass.
- **Google Fonts** added to `index.html` via `<link>` preconnect.
- **Lesson:** When the Figma spec exists, it's the source of truth for all color, typography, and layout decisions — don't invent. The old "Phase 1: functional first" CSS was completely wrong on colors, fonts, and card dimensions.

---

## Cross-Team Updates (2026-03-19T22:30)

### Figma Design Tokens Now Team Standard
**Relevant to:** Drizzt (static serving), Minsc (all future screens)
- CSS variables and typography locked in as baseline for all new UI work
- 4 font families loaded from Google Fonts: Cinzel, Crimson Text, Inter, JetBrains Mono
- Color palette: `#0A0B0F` (primary bg), `#12131A` (panels), `#1C1D27` (elevated), `#C9A84C` (gold accent)
- All new screens must reference `:root` CSS variables; no hardcoded colors

### Static Serving Pattern Deployed
**Relevant to:** Drizzt committed; Minsc should test
- React client now served from Express in production (`/public/` directory)
- API routes (`/auth`, `/colyseus`, etc.) take precedence over SPA catch-all
- Dockerfile multi-stage build ensures client artifacts are preserved

## Cross-Team Updates (Wave 1 completion — 2026-03-20T17:00)

### Room Switching Enables Generator Wiring to Thrive
**Relevant to:** Drizzt (#65), Minsc (integration), Elminster (infra)
- Drizzt's ROOM_SWITCH message now wires to your generator-powered ShardRoom instances
- `enter` command in RefugeRoom instantiates ShardRoom with `generateShardGraph()` by default
- Graph-adapter automatically handles your shared RoomGraph format (LootContainer[]) conversion to local Item[] format
- Full shard entry/exit flow now testable without mocking generators

### Command System Remains Stable
**For Drizzt:** Room and Item interfaces from your room-graph.ts are frozen. Movement handlers consume `room.exits: Map<Direction, string>` as designed. No breaking changes to command API.

### Test Mode Fallback Ready for Integration
**For Minsc:** Hardcoded 6-room test graph available via `{ useTestGraph: true }` room option. Integration tests can use deterministic fixtures without procedural generation variability.

### Adapter Pattern Enables Future Shards
**For Phase 2:** Adding Tier 2/3 shards only requires generator config changes. Adapter handles conversion for all biomes automatically. No command system or client rewrite needed.

### 2025-07-25: Creature Spawning + AI Tick Wiring (Issue #7 completion)
- Wired CreatureManager into ShardRoom: spawning in `onCreate()`, AI tick in `update()`, loot drops on death, creature display in `look` command.
- **Spawn uses derived PRNG seed** (`seed + 7919`) to keep creature placement deterministic but independent from the graph generator's PRNG sequence. Both share the same mulberry32 algorithm.
- **Creature AI tick runs BEFORE combat resolution** — creatures evaluate behavior trees, queue combat actions, then `resolveTick()` processes everyone simultaneously. Order: creature tick → combat resolve → sync deaths → extraction tick.
- **Death/loot order matters:** `removeCreature()` must be called BEFORE `syncFromCombat()` for dead creatures, because `syncFromCombat` sets `isAlive = false` and `removeCreature` guards on `isAlive`. ShardRoom processes defeated events first, then syncs survivors.
- **Test graph isolation preserved:** `useTestGraph: true` skips creature spawning entirely. Existing tests (44+ using test graph) remain unaffected. New `creature-wiring.test.ts` uses procedural graphs with seed for deterministic creature testing.
- **CommandContext extended with `creaturesInRoom`:** Lightweight `{id, name}` refs. Look handler shows "A Drowned Revenant lurks here." Attack handler resolves creature targets by partial name match (same pattern as player targeting).
- **CombatSystem.getActiveEncounterRoomIds()** added for creature noise detection (rooms with combat → noise → alert state transitions).
- **Attack handler updated for creature targeting:** `resolveTarget` now checks creature names (exact then partial match) before falling back to player IDs. Creatures registered with `isPlayer: false`.
- 18 new tests in `creature-wiring.test.ts`: spawning (5), AI tick (4), loot drops (2), look (3), attack (2), CombatSystem API (2). Total: 579 server tests passing.

### 2025-07-25: PR #76 Rebase — Bicep IaC Branch Conflict Resolution
- Rebased `squad/18-bicep-iac` onto latest `origin/dev` to resolve merge conflicts blocking PR #76.
- **Conflicts were in `infra/` files only** (main.bicep, main.bicepparam, container-apps.bicep) — someone had added placeholder infra files on dev that collided with my Bicep templates. Resolved by taking my (branch) versions since those are the fully developed templates.
- **No `.squad/` conflicts** in this case — the branch divergence was from creature wiring (#7), extraction (#10), and room switching (#65) landing on dev after my branch was cut.
- **Lesson:** During `git rebase`, terminology is inverted — `--theirs` gives you *your* branch's version (the commits being replayed), `--ours` gives you the base branch. This is backwards from merge. Always verify with `grep` for conflict markers after resolution.
- **Lesson:** Force push with `--force-with-lease` is the safe way to update after rebase — it fails if someone else pushed to the branch since your last fetch.
### 2025-07-25: Bicep IaC Refinement (Issue #18)
- Fixed critical Bicep compilation error: `dependsOn` on `existing` resource is invalid. Role assignment `name` and `scope` must use compile-time deterministic values, not module outputs.
- Fixed Container Apps port from 3000 → 2567 (Colyseus default). NODE_ENV from development → production.
- Aligned allowed environments to uat/prod only (no dev in Azure, per team decision).
- Refactored container-apps module: added `existingEnvironmentId` param so the second invocation reuses the environment instead of redundantly declaring the same resource. Cleaner ARM template.
- Suppressed intentional `listKeys()` linter warning in monitoring module (Key Vault is Phase 2).
- Updated `docs/deployment.md` with correct values and deployment order docs.
- **Lesson:** Bicep `existing` resources cannot have `dependsOn`. Role assignments require deterministic `name`/`scope` at deployment start — use local variables computed from params, not module outputs.
- **Lesson:** This was infrastructure work outside my game systems domain. Bicep's compile-time vs runtime distinction is the main gotcha — ARM template generation happens before deployment, so certain properties must resolve from the template itself.
## Cross-Team Updates (Wave 2 completion — 2026-03-20T18:38)

### Bicep IaC Hardening Complete — PR #76 Ready
**Relevant to:** Deployment infrastructure, Elminster (infra coordination)
- Fixed 4 critical bugs: dependsOn syntax, port 3000→2567, NODE_ENV, allowed environments list
- Refactored container-apps module for existingEnvironmentId pattern (reduces circular dependencies)
- Updated docs/deployment.md with corrected configuration examples
- Zero Bicep validation errors/warnings
- **For you:** Deployment docs now serve as single source of truth. When you wire generator into ShardRoom, the infrastructure team has correct port/env mappings to reference.

### Minsc's Contract Test Pattern Proven — 125 Tests Ready
**Relevant to:** Testing validation, Drizzt's persistence layer
- Minsc wrote PlayerRepository (27), StashRepository (39), Schema validation (59) tests
- All use factory pattern: identical tests run against InMemory today, will run against PG implementation in PR #77
- **For you:** These 125 tests are proven infrastructure. When you add item system (#16), persistence tests can reuse this pattern for new repositories (skills, factions, run history). No duplication, guaranteed behavioral equivalence.

### 2025-07-25: Room Graph Quality Hardening (Issue #5 — reopened)
- Issue was reopened after initial implementation. Generator existed and was wired into ShardRoom, but room type topology wasn't enforced.
- **Dead-end fix:** Excluded dead_end rooms from the backbone chain. They now attach as single branches with exactly 1 exit. The old code put them in the backbone (giving them 2 backbone edges) and added cycle edges to them (up to 4 exits total). Fixed by: (a) separate backbone pool excluding dead_ends, (b) skip dead_ends in cycle addition pool, (c) skip connected dead_ends in distance enforcement repairs, (d) exclude dead_ends as reconnection targets.
- **Junction fix:** Added `ensureJunctionExits()` post-processing that guarantees ≥ 3 exits per junction room. Runs AFTER distance enforcement (not before — learned that the hard way, because edge cuts reduced junction exits). Each added edge is checked against the min-distance constraint and undone if it creates a shortcut.
- **Dead-end guarantee:** Random roll (15% chance) could produce 0 dead_ends for some seeds. Added fallback: if no dead_end was generated, convert the last fill room to dead_end.
- **Repair bug:** `repairConnectivitySafe` inner loop doesn't re-run BFS after each reconnection — it only marks the directly connected room. Dead_end rooms attached to a newly reconnected backbone node appeared in the `disconnected` list and got extra edges. Fixed by skipping dead_end rooms with exits ≥ 1 in the repair loop.
- **Lesson:** Room type semantics (dead_end = 1 exit, junction = 3+ exits) must be enforced structurally, not just by name. The old code assigned types randomly but never guaranteed the connectivity matched the type.
- **Lesson:** Order of post-processing matters. Junction enforcement before distance cuts = junctions lose exits. Junction enforcement after = need distance checking inside junction enforcement to prevent shortcuts.
- Added 7 new tests (22 total in shard-gen.test.ts). All 1009 tests pass. PR #81.

## Wave 4b Completion — Creature Admin Dashboard (2026-03-20T22:11Z)

**Status:** ✅ Complete
**PR:** #82 merged to dev
**Issue:** #7 Drowned Revenant (Creature System)
**Test Status:** Admin telemetry added, all 949 server tests passing

### What I Built (PR #82)
1. **Admin dashboard creature visibility** — Real-time creature spawns/despawns via SSE
2. **Creature type distribution** — Admin routes report active creatureManager counts by type
3. **Health/state telemetry** — HTML table shows creature population, health ranges
4. **Integration with stash (#80)** — Creature loot drops work with persistent stash system
5. **Integration with topology (#81)** — Creature patrol logic relies on room type semantics (dead_end=1 exit, junction≥3 exits)

### Key Integration Points
- **PR #80 Stash:** Creature loot transfers to persistent stash on kill
- **PR #81 Room Topology:** Patrol AI respects room type semantics
  - Dead_ends: Terminal nodes, no continuous patrol
  - Junctions: Hubs, natural waypoints for patrol logic
- **PR #83 Extraction:** Creatures do not interfere with extraction mechanics (tested)

### Architecture Note (Phase 2 Follow-Up)
- **Minor note from Elminster:** Extract the `creatureManager` admin access pattern (`as any` bracket-access) to a typed helper method to eliminate 3x duplication across admin routes
- **Impact:** Before Phase 2, refactor admin routes to use `shardRoom.getAdminSnapshot()` instead of direct field access

### Integration Complete
Creature system was built in Wave 3; Wave 4b added operator visibility. System is production-ready from game logic perspective.

---

**Phase 1 Server Block Status:** ✅ **COMPLETE**
All topology enforcement in place. Creature AI can trust room types. Patrol logic is solid.

### 2025-07-25: Toast Notification System (Issue #75)
- Created 3 files: `services/toast.ts` (event-driven pub/sub), `components/ToastContainer.tsx` (React component with animation), CSS additions in `styles.css`.
- **Architecture:** Toast service is a standalone module — no React dependency, no store coupling. Emits `onAdd`/`onDismiss` events. Component subscribes and manages its own animation state (enter/exit).
- **Max 3 enforcement lives in the component**, not the service. When a 4th toast arrives, oldest is auto-dismissed via `setTimeout(0)` to avoid re-entrancy in the subscriber callback.
- **Exit animations use a two-phase approach:** mark toast as `exiting` (applies `toast-exit` CSS class with fade-out keyframes), then remove from DOM after 300ms timer.
- **Icons are inline SVGs matching Lucide paths** — no `lucide-react` dependency added. Keeps bundle minimal.
- **All colors use CSS variables** — `--text-secondary` (system), `--success`, `--warning`, `--danger` for accent bars and icons. `--bg-elevated` for background, `--border-muted` for border, `--accent` for close button hover.
- **Testing insight:** `userEvent.click()` with `vi.useFakeTimers()` causes timeouts in jsdom. Use `fireEvent.click()` instead for synchronous click tests under fake timers.
- **Pre-existing test failures** found: `Toast.test.tsx` (capitalized, references `clearAllToasts` that doesn't exist) and `ClickableExits.test.tsx` (imports missing component) — both from other agents, not related to this work.
- 18 tests total: 6 service unit + 12 component integration. All pass. PR #85.

---

## Wave 5 Cross-Team Client UI Batch Context (2026-03-20T23:27:56Z)

### What Other Agents Are Doing

**Drizzt (Engine Dev) — Issue #74, PR #84: Button Design System**
- `<Button>` component: `type` prop (primary/secondary/danger/ghost), `size` (small/medium/large), `icon`, `disabled`
- CSS variables: `--border-muted` added to `:root` for shared use
- BEM naming: `.btn--{variant}` and `.btn--{size}` with full words
- **For you:** Use `<Button>` for inventory/stats UI instead of raw `<button>` elements
- Tests: 52 passing

**Volo (Narrative Dev) — Issue #67, PR #86: Clickable Exits**
- Narrative panel uses server hints (`RoomHeaderMessage.exits`) not regex
- Terminal accepts `availableExits` and `onExitClick` props
- **For you:** Combined with toast system, can notify when exits clicked
- Tests: 28 passing

**Minsc (Tester) — Anticipatory tests across 3 issues**
- 100 tests total: Button (40), Toast (35), ClickableExits (25)
- Import-failure pattern activates immediately when feature branches merge
- Toast patterns: timer tests use `vi.useFakeTimers()` + `vi.useRealTimers()` for userEvent
- **For you:** Toast test conventions established; build on them for notification UI work

**Elminster (Lead/Architect) — Content Admin Tool design complete**
- 1,463-line design document at `docs/content-admin-tool.md`
- **For you:** Creature templates, biome data, loot tables currently hardcoded will load from DB (Phase 2)

### Implications for Your Work

1. **Button API locked** — Use `<Button>` for all new UI pages
2. **Toast service ready** — `import { toast } from '../services/toast.js'`; call `toast.success()` from anywhere
3. **Test patterns established** — Future component tests follow Button/Toast/ClickableExits conventions
4. **Anticipatory tests active** — 35 toast tests now validating your API; tests will pass immediately when feature branch merges

**Next Issues (7 remaining for Phase 1 client UI):** #66, #68, #69, #70, #71, #72, #73

## Wave 6 — Phase 1 Client UI Batch Continued

**Status:** ✅ Complete — Shard Exploration Sidebar & Combat Overlay (#66, PR #90) merged to dev

### What Happened

Wave 6 delivered your Shard Exploration Sidebar & Combat Overlay component. This is the first major interactive client UI component, integrating real-time creature/player state into the game viewport. Combat overlay enables player-to-creature targeting. Sidebar provides exploration HUD with creature/item tracking.

### Phase 1 Client UI Progress

- ✅ #74 Button Design System (PR #84) — Wave 5
- ✅ #75 Toast Notifications (PR #85) — Wave 5
- ✅ #67 Clickable Exits (PR #86) — Wave 5
- ✅ #70 Reconnection Overlay (PR #88) — Wave 6 (Drizzt)
- ✅ #71 Loading & Transition States (PR #89) — Wave 6 (Drizzt)
- ✅ #66 Shard Exploration Sidebar & Combat Overlay (PR #90) — Wave 6 (you)
- ✅ #69 Shardboard Cards (PR #87) — Wave 6 (Volo)
- 🟠 #68 Refuge Hub — Wave 7 (anticipatory tests ready)
- 🟠 #72 Extraction Screen — Wave 7 (anticipatory tests ready)
- 🟠 #73 Chat & Social Panel — Wave 7 (anticipatory tests ready)

### Test Coverage Wave 6

- Your PR #90: 68 new tests, 181 total client tests passing (113 prior + 68 new)
- Drizzt PRs #88 + #89: 68 tests total
- Volo PR #87: 37 tests
- Minsc anticipatory: 153 tests across 5 files
- **Wave 6 total:** 322 new tests, 0 regressions
- **Phase 1 total:** 1,247+ passing (949 server + 80 shared + 218 client)

### Technical Highlights

- **Combat overlay integration:** Creature targeting fully functional with attack system
- **Sidebar exploration HUD:** Real-time creature/item tracking with visual indicators
- **Anticipatory tests activate:** When #68, #72, #73 implementations merge, 91 more tests will activate automatically
- **Ready for next phase:** All infrastructure for Wave 7 in place

### Next Phase (Wave 7)

Wave 7 will deliver final 3 client UI issues (#68 Refuge Hub, #72 Extraction Screen, #73 Chat & Social Panel). Your combat overlay will integrate with character stats and extraction mechanics.
---

## Session: Issue #66 — Shard Exploration Sidebar & Combat Overlay

**Date:** 2025-07-21
**PR:** #90 (branch: `squad/66-shard-exploration-sidebar`)
**Status:** PR opened, 181 tests passing

### What Was Built

**ShardSidebar** (30% right panel):
- Room name (gold serif), collapse timer (color transitions), scrollable sound cues, quick inventory (5 items, tier colors), mini-action buttons (Look/Map/Evasion/Loot)

**CombatOverlay**:
- "⚔ COMBAT" banner, 1s tick timer with requestAnimationFrame + pulse at <200ms, 8 action buttons with keyboard shortcuts 1-8, fade transitions

**EnemyStatusPanel**:
- Replaces sound cues during combat. Enemy name, HP tier (Uninjured→Near Death with colors), telegraphed action display

**Store extensions**: 8 new state fields, 8 action types, `getHpTier()` helper
**GameScreen**: game-body 70/30 layout, message handlers for combat/sound cues/inventory

### Learnings

1. **Git worktree is essential for concurrent squad work.** Multiple agents switching branches in the main repo caused total loss of uncommitted changes 3+ times. Solution: `git worktree add /home/saitcho/ellmud-66 squad/66-shard-exploration-sidebar`. Always use worktrees when other agents may be active.

2. **jsdom quirks**: `scrollTo` and `scrollIntoView` are not implemented. Guard with `if (ref.current?.scrollTo)` in components. The test setup already mocks `scrollIntoView` via `vi.fn()`.

3. **Timer testing**: Use `vi.useFakeTimers({ shouldAdvanceTime: true })` for RAF-based animations. The `shouldAdvanceTime` flag is critical for requestAnimationFrame to work in vitest.

4. **Keyboard shortcut pattern**: Global `keydown` listener on `window` in `useEffect`, cleaned up on unmount. Guard with `inCombat` check to avoid shortcuts firing outside combat. Use `parseInt(e.key)` for number key mapping.

5. **Collapse timer max tracking**: Server sends current timer value but not max. Track max on first appearance, preserve across updates. Color thresholds use ratio to max (>60% white, 30-60% amber, <30% red).

6. **Sound cue extraction**: Filter `NarrateMessage` where `type === 'sound'`. Cap at 20 entries FIFO to prevent memory growth.

### Files Changed
- `packages/client/src/store.ts` — types, reducer, getHpTier
- `packages/client/src/components/GameScreen.tsx` — layout + handlers
- `packages/client/src/components/ShardSidebar.tsx` — new
- `packages/client/src/components/CombatOverlay.tsx` — new
- `packages/client/src/components/EnemyStatusPanel.tsx` — new
- `packages/client/src/styles.css` — ~200 lines appended
- `packages/client/src/__tests__/sidebar.test.tsx` — 19 tests
- `packages/client/src/__tests__/combat-overlay.test.tsx` — 26 tests
- `packages/client/src/__tests__/store.test.ts` — 23 tests (15 new)

### 2026-03-21: ACA Deploy Entrypoint Fix (CI/CD)
- **Root cause:** `az containerapp update --command` sets the container command but does NOT clear `args`. The Bicep bootstrap sets `command: ['/bin/sh', '-c']` and `args: [bootstrapCommand]`. When CI/CD changed command to `["node", "packages/server/dist/index.js"]`, the old args persisted, so the placeholder kept running.
- **Fix:** Added `--args ""` to the deploy step in `.github/workflows/ci-cd.yml`. Azure CLI treats empty string args as "clear existing values".
- **Health check gap:** Old check grepped for `"status":"ok"` which both placeholder and real server return. Updated to check for `"uptime"` field (only in real server's `/health` response from `packages/server/src/health.ts`). Placeholder detection logs clearly during retries.
- **Key files:** `.github/workflows/ci-cd.yml` (deploy step + health check), `infra/modules/container-apps.bicep` (bootstrap comment), `packages/server/src/health.ts` (real health response shape).
- **Pattern:** Bicep provisions with bootstrap placeholder → CI/CD overrides on first deploy. Both command AND args must be explicitly set to fully replace the bootstrap.

---

## 2026-03-21T15:09:00Z: Orchestration Complete

**Status:** ✅ Session complete, decisions archived

- ACA entrypoint fix merged to decisions.md (decision: ACA Deploy Must Clear Both Command and Args)
- Orchestration logs written to .squad/orchestration-log/2026-03-21T15-09-jarlaxle.md
- Docker port isolation decision merged (Drizzt co-authored)
- CSS variable compliance decisions enforced
