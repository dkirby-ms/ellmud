## 2026-04-13T19:10:00Z: Permadeath System — Server-Wide Reset Model

**By:** Elminster (Design), Drizzt (DB), Jarlaxle (Systems), Regis (UI), Minsc (Tests)  
**Date:** 2026-04-13  
**Status:** Implemented — all agents delivered; design pivot executed  
**Scope:** Game feature — permadeath mode, character reset mechanics, leaderboard

### Executive Summary

Permadeath implementation pivoted during session from Elminster's recommended Option 2 (character-level opt-in with threshold) to user-directed **server-wide reset model**: all characters reset on every death when enabled, no threshold logic, simple boolean toggle. Stash preserved, death count persists as lifetime metric. Feature fully implemented across backend (DB, config, API), systems (death handler), and frontend (UI messaging, Hall of Fame page).

### Design Context

Elminster's analysis proposed three permadeath options:
- **Option 1:** Run-based permadeath (stash-safe, no character deletion)
- **Option 2:** Character permadeath with account persistence (opt-in per character, threshold-based) ⭐ Recommended
- **Option 3:** Softer permadeath with inventory reset only

**User pivot:** Rejected all options; requested **server-wide reset model** (every death resets character if enabled).

### Final Decision

**Server Configuration:**
- Single boolean env var: `PERMADEATH_ENABLED=true/false`
- No per-character opt-in; no threshold logic
- When enabled, EVERY death triggers character reset

**Reset Mechanics (When Permadeath Triggers):**
1. Inventory cleared (DB + in-memory)
2. Equipment cleared
3. Level reset to 1
4. Skills reset to defaults
5. **Stash PRESERVED** (extraction incentive maintained)
6. **Death count PERSISTED** (lifetime stat, not reset)
7. Character respawns in-game immediately

**Database:**
- Migration 017: `hall_of_fame` table preserves reset records for leaderboard
- Existing `characters.deleted_at` or reset flag (implementation choice)
- Existing `player_death_penalty.death_count` used for persistence

**API Endpoints:**
- `GET /api/hall-of-fame` — Paginated leaderboard (survival time ranking)

### Rationale

1. **Simple toggle vs threshold:** Boolean config is operationally simpler; no cumulative death counting edge cases
2. **Reset vs deletion:** Preserves stash (extraction loop incentive) while maintaining meaningful stakes (current gear lost)
3. **Server-wide vs per-character:** Simplifies design; no per-character configuration overhead; enables "hardcore mode" servers
4. **Death count persistence:** Tracks player effort/survivability across resets; leaderboard metric

### Impact & Deliverables

**Backend (Drizzt):**
- ✅ Migration 017: `hall_of_fame` table with indexes
- ✅ Config structure: `permadeath.enabled` boolean
- ✅ Hall of Fame REST API endpoint

**Systems (Jarlaxle — 2 rounds):**
- ✅ Round 1: Soft-delete handler with threshold (deprecated)
- ✅ Round 2: Reset handler, simple toggle, cleared inventory/equipment, preserved stash
- ✅ Death count increment preserved across resets

**Frontend (Regis — 2 rounds):**
- ✅ Round 1: PermadeathOverlay component, dramatic "Permanent Death" tone (deprecated)
- ✅ Round 2: "Death & Rebirth" messaging, "Rise Again" button, "Past Lives" leaderboard framing

**Testing (Minsc — 2 rounds):**
- ✅ Round 1: 27 tests for threshold+soft-delete model (deprecated)
- ✅ Round 2: 26 tests for reset model; all 3565 tests passing
- ✅ Coverage: toggle config, every-death reset, inventory/equipment clear, stash preserve, death count persist

### Artifacts

- 8 Orchestration log entries (Elminster, Drizzt, Jarlaxle x2, Regis x2, Minsc x2)
- Session log: `.squad/log/2026-04-13T19-10Z-permadeath-session.md`
- Decision inbox files (10 consolidated here, removed post-merge)

### Related Learning

**Design Evolution:**
- Initial proposal (Elminster) recommended per-character opt-in with threshold for nuance
- User direction simplified to server-wide reset model for operational clarity
- Two implementation iterations (Jarlaxle, Regis) required to align with final model

**Team Pattern:**
- When design pivots mid-session, agent deliverables may be deprecated (Jarlaxle R1, Regis R1)
- Orchestration logs document both iterations for process transparency
- Test suite redesigns confirm correctness before final merge

---

## 2026-04-12T15:31:26Z: Async Command Pattern for Toggle (#432)

**By:** Drizzt (Engine Dev)  
**Issue:** #432 — Toggle follow response not descriptive enough  
**PR:** #436  
**Scope:** Command handler patterns  

### Decision

When a command needs to await database I/O to produce its response (e.g., reading current state before sending feedback), follow the established `who` command async pattern instead of modifying the synchronous `CommandHandler` type signature:

1. Intercept the verb in `ZoneRoom.handleCommandMessage` before sync dispatch
2. Delegate to a dedicated async handler method on `ZoneRoom`
3. The async handler builds context, awaits command logic, then calls `deliverResult`

Do not modify the `CommandHandler` type signature (breaks 200+ call sites).

### Rationale

The `toggle` command needed to report actual ON/OFF state using `enabledMsg`/`disabledMsg` from the object registry. A synchronous handler cannot read the database before responding. The `who` command already established this pattern; reusing it maintains consistency and avoids type-breaking changes.

### Impact

- **Jarlaxle/Minsc:** Use this pattern for future commands requiring async DB/network access instead of fire-and-forget
- **Regis:** Client UI may want to parse and display the descriptive ON/OFF state in the server response
- **Code Quality:** Toggle now reports actual state; no-args invocation lists current toggleable items

### Related Learning

Pattern established in #432 (toggle fix) as a reusable solution. The interceptor approach in `ZoneRoom.handleCommandMessage` enables async delegation without breaking existing sync call sites.

### Deliverables

- Toggle command now async, reports descriptive ON/OFF state
- All 2975 tests passing
- Pattern documented for team reference
- PR #436 ready for review

---

## 2026-04-04T17:24:38Z: Migration Discipline — Seed Files Pair with Numbered Migrations

**By:** Elminster (Reviewer), enforced by Drizzt (Engine Dev)  
**Issue:** #260 (Repurpose Refuge) — Rejection & Fix  
**Scope:** Database migration patterns  

### Decision

Any modification to data in seed files (e.g., `003_seed_zones.sql`) must be paired with a corresponding numbered migration file (e.g., `014_repurpose_refuge.sql`) that makes the same change for existing databases where the seed file has already been applied. The migration system tracks applied files by filename — once executed, seed files are never re-run.

### Rationale

Seed files execute once per fresh database installation. For existing databases in development or production, data changes require numbered migrations that the Flyway/migration runner will execute on every startup. Without the numbered migration, existing data will remain in the old state indefinitely.

**Example from PR #260:**
- Seed file change: `003_seed_zones.sql` changed Refuge category from `hub` to `dev`
- Numbered migration added: `014_repurpose_refuge.sql` with UPDATE statement to apply the same change to existing databases
- Result: Fresh installs get `dev` category via seed. Existing databases get `dev` category via migration 014.

### Impact

- **Team Policy:** All seed file edits must have corresponding numbered migrations
- **Review Checklist:** Reviewers must flag seed file edits without migrations as blocking issues
- **Pattern:** Edit seed file + add numbered migration = correct pattern
- **Anti-Pattern:** Edit seed file only (will miss existing databases)

### Related Learning

PR #260 initially lacked the numbered migration and was rejected by Elminster. Drizzt applied the fix (adding migration 014) instead of Jarlaxle (original author), establishing the pattern that migration discipline is an engine-team responsibility. This prevents recurrence of the same issue.

### Deliverables

- Migration `014_repurpose_refuge.sql` added and verified
- Decision documented for team reference
- Pattern now part of standard review checklist

---

## 2026-04-04T19:54:00Z: Architecture Decision — Zone Designer Migration Plan (6 Phases)

**By:** Elminster (Lead / Architect)  
**Date:** 2026-04-04  
**Related Issues:** Zone designer UX/layout improvements  
**Decision Status:** Approved for Architecture Phase

**Decision:** The zone designer will migrate from its current hand-rolled architecture to a phased, production-grade system using elkjs + ReactFlow.

**Migration Approach:**
1. Layout engine: BFS (`computeLayout.ts`) → ELK.js for crossing minimization & layered layout
2. Rendering: Hand-crafted SVG → ReactFlow (@xyflow/react) for pan/zoom/minimap/edge routing
3. Execution: 6 phased milestones, each delivering standalone value (no big-bang rewrite)
4. Visual enhancements: Bezier curves, direction coloring, room shape variety (phases 1 & 4)

**Phases Summary:**

| Phase | Focus | Duration | Effort |
|-------|-------|----------|--------|
| 0 | Foundation (install, wrap modules) | 2–3 days | Foundation |
| 1 | Visual Polish (curves, colors, shapes) | 1–2 weeks | Immediate UX |
| 2 | Layout Engine Swap (ELK integration) | 1–2 weeks | Crossing reduction |
| 3 | ReactFlow Integration (pan/zoom/minimap) | 2–3 weeks | Major UX leap |
| 4 | Advanced Polish (animations, shapes) | 1–2 weeks | Refinement |
| 5 | Optional Features (undo/redo, search) | 1–2 weeks | Quality-of-life |
| 6 | Cleanup & Docs | 1 week | Maintenance |

**Total Timeline:** 6–8 weeks

**Rationale:**

*Current State Problems:*
- Exit crossings: Hand-rolled BFS places rooms greedily; no crossing penalty. 15–30% unnecessary line crossings.
- No pan/zoom/minimap: 100×100 cell grid forces tiny room nodes; navigating large zones tedious.
- No edge routing: Straight lines cross visually even when exits don't topologically cross.
- Visual polish ceiling: SVG rendering is low-level; curves/glow/shapes require substantial manual work.
- Maintenance cost: 2700 + 3600 lines of tightly coupled layout + rendering logic.

*Why elkjs:*
- Proven battle-tested layout engine (used in graphviz, yEd, VS Code)
- Sugiyama layered algorithm automatically reduces edge crossings to near-optimal
- Direction-aware (port-side constraints map compass directions to layout edges)
- Z-axis support (layer constraints enforce multi-floor relationships)
- Performance adequate for 100+ room zones (~100–300ms)

*Why ReactFlow:*
- Complete solution: Pan, zoom, minimap, edge routing, selection all built-in
- Decoupling: Node & edge rendering are components; custom styling without touching core logic
- Performance: Hardware-accelerated with fallback; efficient for large graphs
- Active maintenance, good docs, React-native styling
- Familiar UX (Figma, Notion, Obsidian patterns)

*Why Phased, Not Big-Bang:*
- Risk mitigation: Each phase independently testable; earlier phases deliver value
- Parallelization: Teams can work on phases 1 & 2 simultaneously
- Feedback loop: Phase 1 gets designer feedback before Phase 3's UI refactor
- Reversibility: If ELK causes issues, fallback to BFS while keeping visual improvements

**Feature Preservation:**

All existing features remain intact:
- Room CRUD (create, rename, type, properties, NPC/loot/hazard)
- Exit CRUD (bidirectional pairing, one-way, modifiers, portals)
- Floor switching (Z-axis filtering, pan reset)
- Orphan detection & cleanup
- Context menus (room creation, copy/paste, edit, delete)
- Insert room on exit (room splitting)
- Validation warnings (entry type, connectivity, one-way)
- Zoom/pan/reset (improved in Phase 3)

**New Capabilities:**
- Exit crossing minimization (Phase 2, ELK)
- Minimap (Phase 3, ReactFlow)
- Bezier curves (Phase 1, Phase 4)
- Room shape variety (Phase 1, Phase 4)
- Direction-based coloring (Phase 1, Phase 4)

**Risks & Mitigations:**

| Risk | Mitigation |
|------|-----------|
| ELK output visually differs from BFS | Phase 2 includes before/after comparison; fallback to BFS if problematic |
| ReactFlow accessibility issues | Early testing with screen readers; validate keyboard nav (Phase 3 testing checklist) |
| Performance regression on 100+ room zones | Profile ELK + ReactFlow during Phase 2–3; lazy-load or optimize if needed |
| Portal exits break during migration | Portal logic is separate from main layout; explicit testing in Phase 3 |
| Z-axis multi-floor breaks | Phase 2 validates Z-axis mapping; Phase 3 tests floor switching explicitly |
| Designer blocked during migration | Phases are independent; partial features available early (Phase 1 usable immediately) |

**Dependencies:**

- elkjs (≥0.8.0)
- @xyflow/react (≥11.0 or latest)
- All existing zone API / room / exit DTOs remain unchanged

**Success Criteria:**

1. ✅ All existing CRUD operations work identically
2. ✅ Exit crossings visibly reduced (compare screenshots)
3. ✅ Pan/zoom/minimap smooth on 100+ room zones
4. ✅ All validation warnings & error flows intact
5. ✅ Floor switching preserves user's pan position
6. ✅ No performance regression on player minimap
7. ✅ Designer can complete typical zone creation in <5min

**Implementation Ownership:**

- **Phase 0:** Regis (Frontend Dev) + Elminster (Arch review)
- **Phase 1:** Regis (Designer UX enhancements)
- **Phase 2:** Regis + Elminster (ELK integration; coordinate mapping)
- **Phase 3:** Regis (ReactFlow migration; major refactor)
- **Phases 4–6:** Regis (visual polish, cleanup)

**Approval:**

**Elminster** approves this migration plan as the architectural direction for the zone designer, provided:
1. Phase 0 verification passes (no dependency conflicts, clean module scaffolding)
2. Phase 1 delivers visual improvements without regression
3. Phase 2 demonstrates crossing reduction without breaking multi-floor zones
4. Phase 3 includes comprehensive testing before production rollout


---

## Triage Action Mislabeling — Root Causes & Fixes

**By:** Elminster (Lead)  
**Date:** 2026-04-05  
**Issue:** Squad triage GitHub Action applies incorrect labels

### Summary

The `squad-triage.yml` workflow applies member labels correctly when issues contain domain-specific keywords (e.g., "frontend" → squad:regis), but has **three critical mislabeling patterns:**

1. **Unconditional `go:needs-research` label** — applied to *every* triaged issue, regardless of readiness
2. **No epic/tracking issue detection** — epics and multi-phase tracking issues get member labels when they should remain unassigned
3. **Multiple label conflicts** — both the Lead and a domain member get labeled (e.g., squad:elminster + squad:regis + squad:minsc), creating ambiguous ownership

### Root Cause Analysis

**1. Unconditional `go:needs-research` Application**

File: `.github/workflows/squad-triage.yml`, lines 202–208

Every issue gets `go:needs-research` immediately upon triage, regardless of whether it's:
- A well-scoped Phase implementation (like #267, #268 — already implementation-ready)
- An epic tracking issue (like #266 — is a parent decomposition, not work-in-progress)
- A design decision (like #273 — cleanup phase, ready for Minsc's testing work)

**Impact:** Workflows downstream (CI, PR routing) may skip issues labeled "needs-research" or deprioritize them. Blocks clear signal of "ready to implement now" (should be `go:yes`).

**2. No Epic/Tracking Issue Detection**

File: `.github/workflows/squad-triage.yml`, lines 70–89 (member parsing) + 119–189 (routing logic)

The triage logic has no concept of issue *type*. It only keyword-matches against titles and bodies to find domain roles. There is no check for:
- Issue labels (`type:epic`, `type:spike`)
- Issue title patterns ("[EPIC]", "[TRACKING]", "[META]")
- Multi-issue decomposition (parent with numbered sub-issues #267, #268, etc.)

**Consequence:** 
- Epic trackers receive domain labels (squad:regis + squad:minsc for #266) when they should route only to the Lead (squad:elminster) for architectural oversight
- Tracking issues become indistinguishable from implementation work
- Prevents clear parent-child work hierarchies

**3. Multiple Member Labels (Ambiguous Ownership)**

File: `.github/workflows/squad-triage.yml`, lines 194–200 (single label) + manual label editing post-triage

The triage script only adds **one** member label (lines 194–200), but post-triage **editing allows manual label stacking**. There's no guard against multiple member labels on a single issue.

**Failure mode:** When an issue can logically involve multiple people, the workflow allows all three labels to coexist, creating:
- Ambiguous "who owns this?" when there's no single assignee
- No DRI (Directly Responsible Individual) signal
- Coordination overhead — which member kicks off work first?

### Specific Fixes Required

**Fix 1: Smart `go:*` Label Assignment (NOT Unconditional `go:needs-research`)**

File: `.github/workflows/squad-triage.yml`  
Lines to modify: 202–208

Change: Add logic to determine if issue is a tracking/epic or a phase with clear acceptance criteria. If so, mark `go:yes`; otherwise default to `go:needs-research`.

**Rationale:** 
- Epics are orchestration issues for the Lead — they're inherently "go:yes" (parent decision framework)
- Phased features with acceptance criteria are ready to implement
- Default to "needs-research" for everything else

**Fix 2: Epic/Tracking Issue Detection & Lead-Only Routing**

File: `.github/workflows/squad-triage.yml`  
Lines to modify: 119–189 (routing logic)

Change: Add epic/tracking detection before role-based keyword matching. If epic detected, route to Lead only.

**Consequence:** 
- #266 would receive *only* `squad:elminster` (not squad:minsc or squad:regis)
- Lead orchestrates the phases; sub-issues (#267–#273) route to individual members
- Clear parent-child hierarchy: parent → Lead, children → domain experts

**Fix 3: Guard Against Multiple Member Labels**

File: `.github/workflows/squad-triage.yml` OR `.github/workflows/squad-label-enforce.yml`

Change: Add validation logic to ensure only **one** `squad:{member}` label per issue. If multiple detected, warn via issue comment and require manual review.

### Recommendations

**Immediate (today):**
1. Implement Fix 1 (smart `go:*` verdict) — 15 minutes, no risk
2. Implement Fix 2 (epic detection) — 20 minutes, blocks ambiguous routing
3. Manually reassign #266 to `squad:elminster` only (remove minsc, regis)

**Short-term (this week):**
4. Implement Fix 3 (label enforcement) in squad-label-enforce.yml
5. Document epic/phase issue naming conventions
6. Retriage recent issues that received go:needs-research incorrectly

**Testing:**
- Triage an epic → verify it receives squad:elminster + go:yes, not domain labels
- Triage a phase with acceptance criteria → verify squad:{expert} + go:yes
- Verify no issue can have multiple squad:{member} labels

### Root Cause Summary

The triage action was built for **domain routing** (finding the right expert), not for **issue type handling** (distinguishing epics from implementations). It applies the same keyword-matching logic to both, leading to:

1. **Type blindness:** Can't tell epics from features → treats all as implementation work
2. **Verdict rigidity:** Assumes all new issues are research spikes → applies `go:needs-research` unconditionally
3. **No ownership guard:** Allows multiple member labels → creates coordination ambiguity

All three are fixable in the triage workflow with ~40 lines of added logic. No database changes, no schema updates, no breaking changes.

---

## 2026-04-04T22:25:00Z: GDD §6 Combat System Audit — Gap Analysis & Issue Backlog
**By:** Elminster (Lead / Architect)  
**Issues:** #278, #279, #280, #281, #282, #283, #284, #285, #286

**Decision:** Systematic audit of GDD §6 (all subsections §6.1–§6.11) against the codebase identified 9 implementation gaps and 1 GDD alignment issue. All gaps filed as GitHub issues with the `squad` label. No issues duplicate existing tracked work (#32, #161, #167, #277).

**Key Findings:**
1. **CombatSystem.resolveTick() is well-structured for extension.** The tick phases map cleanly to the GDD tick loop. Adding abilities, threat, and positioning will extend these phases rather than replacing them.

2. **Simultaneous damage resolution is correct.** All damage calculated from start-of-tick HP, applied at once. This matches the GDD determinism requirement.

3. **DowningSystem is a net positive divergence.** GDD §6.7 says "no downed state" but the DowningSystem creates meaningful group rescue dynamics. Recommendation: update GDD, don't remove the system.

4. **Creature AI targeting is the most impactful gap.** Creatures targeting `playersHere[0]` makes group combat meaningless — threat tables (#281) should be high priority.

**Implementation Priority:**
1. #278 Auto-attack baseline (foundational)
2. #279 Abilities & cooldowns (unlocks tactical depth)
3. #281 Threat system (enables meaningful group combat)
4. #280 Enemy telegraphs (requires abilities)
5. #285 Flee skill check (small, independent)
6. #283 Signal classification (improves readability)
7. #284 Combat HUD (client work, blocked)
8. #282 Room positioning (largest feature)
9. #286 GDD alignment (documentation)

**Impact:**
- Drizzt (Engine Dev): Primary assignee for #278, #279, #281, #280, #285
- Regis (Frontend Dev): Primary assignee for #284, #283
- Jarlaxle (Systems Dev): May assist with #282 (positioning)
- GDD: Needs update for DowningSystem documentation (#286)
# Decision: Combat Grid System — Phased Implementation Recommended

**Date:** 2025-01-04  
**Author:** Jarlaxle  
**Context:** Issue #337 — DCSS-style grid combat research  
**Status:** Proposal / Awaiting Team Review

---

## Decision

Grid-based tactical combat is **feasible and architecturally sound** for Ellmud, but should be implemented in **phases with go/no-go gates** rather than as a full replacement of the position zone system.

**Recommendation:** Implement Phase 1 (minimal grid) as a **prototype in a feature branch**. If performance and text-mode UX meet acceptance criteria, proceed to Phase 2. If not, defer until graphical client is available.

---

## Context

Issue #337 proposes adding DCSS-style grid combat with x-y positioning, line-of-sight, and spatial tactics. Current system uses abstract zones (Front/Flank/Rear) that provide tactical depth for group play while being ignorable in solo play.

**Analysis findings:**
- Existing tick-based combat loop and position system provide strong foundation
- Grid dimensions of 8×8 to 12×12 tiles scale well for 1-20 players + creatures
- Movement costs (1 action per tile) fit naturally into tick cycle
- Backward compatibility is achievable — rooms can opt into grid mode
- Key risks: performance with 30+ entities, text-mode rendering, content design complexity

Full analysis: `docs/design/337-combat-grid-systems.md`

---

## Rationale

**Why phased implementation:**
1. **Text-mode rendering is unproven.** DCSS works because players see tiles. We need to validate that coordinate text or ASCII grids provide enough spatial awareness before committing.
2. **Performance is a constraint.** 20 players + 10 creatures = 900 range checks per tick. Caching mitigates this, but needs profiling with real workloads.
3. **Content complexity increases.** Every grid room needs spawn points, obstacles, and telegraphs manually placed. Start small (boss fights only) before scaling.

**Why not full replacement:**
- Zone-based combat works well for standard encounters (3-5 entities)
- Grid combat adds most value in boss fights and large-scale group content
- Keeping both systems allows content designers to choose the right tool per room

---

## Phased Rollout

### Phase 1: Minimal Grid (3-4 weeks)
- Add `gridPosition` to `Combatant`, `grid_width/height` to room data
- Implement grid movement (1 tile per action)
- Extend `canReachTarget()` with distance + weapon range
- Basic A* pathfinding for creatures
- Text-based coordinate rendering ("You at (5,3). Goblin at (4,1).")
- **No LOS, no cover, no facing** — keep it simple
- **Test with 1-2 boss rooms only**

**Success criteria:**
- Performance: <100ms per tick with 20 players + 10 creatures
- UX: Boss fight feels more tactical than zone-based version
- No regressions in non-grid rooms

### Phase 2: Tactical Depth (4-6 weeks, if Phase 1 succeeds)
- ASCII grid renderer in client
- Line-of-sight blocking (raycasting)
- Cover mechanics (+dodge chance)
- Facing and flanking
- Cone/circle telegraph shapes

### Phase 3: DCSS-Style Rendering (stretch goal, post-1.0)
- Tile-based sprite rendering (canvas or WebGL)
- Animated movement and attacks
- Visual telegraphs
- Fog of war

---

## Architecture Decisions

**Backward compatibility approach:**
- `gridPosition?: GridPosition` on `Combatant` (optional field)
- If room has `grid_width`, use grid logic; else use zone logic
- Derive `position` (zone) from `gridPosition.y` for existing mechanics
- Mixed content supported — some rooms use grids, others don't

**Data model:**
- Add nullable columns to `zone_rooms`: `grid_width`, `grid_height`, `obstacles` (JSONB)
- Rooms without grid data continue using zone-based combat unchanged

**Performance mitigation:**
- Cache distance matrix (O(n²) once per tick, O(1) lookups)
- Limit pathfinding depth to 10 tiles
- Cache creature paths for 3-5 ticks

---

## Open Questions for Team

1. **Do we want grid combat in 1.0, or defer to post-1.0?**
   - If 1.0: Commit to Phase 1 prototype now
   - If post-1.0: Close #337 as "future feature," focus on core loop polish

2. **Who owns the ASCII grid renderer?**
   - Khelben (UI/UX) or Drizzt (client systems)?

3. **What's the content design workflow for placing spawn points?**
   - Manual JSON editing?
   - Admin tooling (future)?
   - Procedural placement for standard rooms?

4. **Should solo players ever see grid combat?**
   - Grid adds most value in group fights
   - Solo grid combat may feel tedious without the tactical coordination payoff
   - Recommendation: Grid for boss fights + 5+ player content only

---

## Impact on Other Systems

- **Combat HUD (Khelben):** Grid renderer UI component needed
- **Narration (Drizzt/Ralph):** LLM must narrate grid positions ("The goblin lunges from two tiles north")
- **Creature AI (Jarlaxle):** Pathfinding logic needed (A* on grid graph)
- **Room generation (Jarlaxle):** Grid dimensions + spawn points in room templates

---

## Next Steps

1. **Team review this decision** — async comments or sync discussion
2. **If approved:** Jarlaxle prototypes Phase 1 in `feature/grid-combat` branch
3. **If rejected:** Close #337 as "deferred" or "won't implement"

---

**Decision owner:** Jarlaxle  
**Reviewers needed:** Ralph (product direction), Khelben (UI feasibility), Drizzt (client systems)
# Decision: Combat Grid Frontend Architecture

**Date:** 2026-01-25  
**Author:** Regis (Frontend Dev)  
**Context:** Issue #337 — DCSS-style combat grid visualization  
**Status:** Proposed (awaiting team approval)

---

## Decision Summary

For DCSS-style grid combat rendering, the frontend will use **HTML5 Canvas 2D** (not WebGL/Pixi.js) with the **rot.js roguelike toolkit** (or a custom tile renderer if rot.js proves overkill). The grid will be an **optional overlay** that enhances but doesn't replace text combat, maintaining accessibility and text-first parity.

---

## Key Technical Decisions

### 1. Rendering Technology: Canvas 2D

**Chosen:** HTML5 Canvas 2D Context  
**Rejected:** WebGL (via Pixi.js), SVG, DOM-based grid, ANSI terminal blocks

**Rationale:**
- Canvas 2D is proven in DCSS webtiles (the inspiration for this feature)
- Simpler API than WebGL, no library dependencies, smaller bundle
- Excellent performance for tile grids (400 tiles + 20 entities easily hits 60fps)
- Native `drawImage()` with sprite sheet clipping is ideal for tile rendering
- Works on all devices including older mobile hardware

WebGL adds complexity and bundle size (~500KB for Pixi.js) for no performance gain in this use case. We're not rendering particle effects or 1000s of sprites — this is a static/turn-based grid.

### 2. Tile Engine: rot.js (with custom fallback option)

**Chosen:** [rot.js](https://ondras.github.io/rot.js/hp/) roguelike toolkit  
**Fallback:** Custom 200-line tile renderer if rot.js feels heavy

**Rationale:**
- rot.js is purpose-built for roguelike UIs (15KB minified)
- Includes Canvas tile rendering, FOV algorithms, pathfinding (future-useful)
- Well-documented, actively maintained, MIT license
- If we only need basic tile rendering, we can extract that logic and drop the rest

**Phase 1 approach:** Start with rot.js for rapid prototyping. Evaluate after prototype. If we need finer control, write a custom renderer.

### 3. Tileset: DCSS CC0 Tiles

**Chosen:** [DCSS tiles repository](https://github.com/crawl/tiles) (CC0 license)  
**Alternatives:** Kenney Roguelike Pack (CC0, simpler), Oryx Design Lab (CC BY 3.0), custom tiles

**Rationale:**
- DCSS tiles are CC0 (public domain equivalent) — cleanest licensing
- Battle-tested in web environment (DCSS webtiles)
- Consistent visual style, large coverage (creatures, players, items, terrain)
- 32×32px standard size (web-friendly)
- Must audit ARTISTS.md and TILES_UNDER_UNKNOWN_LICENSE.md before use

**Credit requirement:** Add DCSS attribution to game credits/docs.

### 4. UI Integration: Optional Overlay (Not Replacement)

**Chosen:** Grid is a **toggleable enhancement** to text combat  
**Rejected:** Grid as primary combat interface, grid replacing text log

**Rationale:**
- **Accessibility:** Text-first combat must remain playable (screen readers, keyboard-only)
- **Player choice:** Some players prefer pure text MUD experience
- **Mobile fallback:** Small screens may not fit grid comfortably
- **Information parity:** Grid shows position, text shows detailed effects/status

**Layout strategy:**
- Desktop: Grid replaces minimap widget in right panel during combat
- Tablet: Full-screen overlay with touch controls
- Mobile: Disabled by default (text works fine), add overlay if demand exists
- Toggle button in header: "Grid View" icon

### 5. State Management: Server-Authoritative Grid

**Chosen:** Server tracks entity positions (x, y per room), client renders via WebSocket  
**Rejected:** Client-side prediction (for MVP)

**Protocol (addition to Colyseus schema):**
```typescript
// Server → Client
room.send('combat:grid:init', { gridSize, entities: [{ id, type, x, y, hp, sprite }] });
room.send('combat:grid:move', { entityId, x, y });
room.send('combat:grid:damage', { entityId, hp });
room.send('combat:grid:remove', { entityId });

// Client → Server
room.send('combat:grid:action', { action: 'move'|'attack', targetX, targetY });
```

**Rationale:**
- Grid state is additive — extends existing `roomOccupants` with position data
- Server validation prevents cheating (client can't fake positions)
- No client-side prediction in Phase 1 (keeps implementation simple)
- Phase 2+ can add prediction if latency becomes an issue

### 6. Responsive Design: Desktop-First, Mobile-Optional

**Chosen:** Desktop grid in right panel, mobile disabled initially  
**Rejected:** Mobile-first approach, full responsive grid

**Desktop (≥1024px):** Grid in right panel (400-600px), replaces minimap during combat  
**Tablet (768-1023px):** Full-screen overlay (centered, semi-transparent backdrop)  
**Mobile (<768px):** Disabled by default (text-only combat)

**Rationale:**
- Mobile MUD players are accustomed to text interfaces
- 32×32px tiles × 20×20 grid = 640×640px minimum (doesn't fit mobile screens without scrolling)
- Better to ship a polished desktop experience than a compromised mobile one
- Can add mobile grid overlay in Phase 3 if user feedback demands it

### 7. Accessibility Strategy: Text Parity

**Chosen:** All grid events **must** generate corresponding text messages  
**Keyboard navigation:** Arrow keys for cursor, Tab for entity cycling, Space/Enter for actions

**Requirements:**
- Combat log remains authoritative source of combat info
- Canvas element has `aria-label` describing grid state
- Entity list announced as text ("3 goblins: north, east, northeast")
- High contrast mode option (replaces sprites with colored shapes + text labels)
- HP bars use patterns (stripes, dots) in addition to color (colorblind-friendly)

**Rationale:**
- Grid must not regress accessibility for screen reader or keyboard-only users
- Text-first combat is a core design pillar of Ellmud
- Grid is a visualization layer, not a gameplay requirement

---

## Implementation Roadmap

### Phase 1: Canvas Prototype (1-2 weeks)
- CombatGrid component (Canvas rendering, hardcoded test data)
- Sprite sheet loader (creatures.png with 10-20 test tiles)
- Grid toggle button in ZoneExploration header
- Static grid rendering (no animations)
- Click-to-select entity (updates `enemyStatus` in store)

**Out of scope:** Animations, server integration, mobile optimization

### Phase 2: Server Integration (2-3 weeks)
- Server-side grid positioning (add x, y to creature/player state)
- WebSocket protocol (combat:grid:* messages)
- Client syncs grid state from server
- Basic animations (entity movement tween, damage flash)
- Player grid actions (click → send action to server)

**Out of scope:** Advanced animations, full tactical combat system

### Phase 3: Polish & Optimization (1-2 weeks)
- Animation system (death effects, attack swooshes, floating damage numbers)
- High contrast mode (accessibility)
- Keyboard navigation (arrow keys, tab cycling)
- Performance profiling (60fps target)
- Mobile responsive layout (or graceful disable)
- User settings (toggle grid, toggle animations, tile size)

---

## Open Questions for Team Discussion

**Q1: Grid size — fixed or variable per room?**
- Fixed (e.g., always 20×20): Simpler, consistent UI
- Variable: Some rooms bigger/smaller (more realistic, harder to design)
- **Recommendation:** Start fixed, evaluate variable in Phase 2

**Q2: Grid topology — square or hex?**
- Square: Simpler math, aligns with DCSS
- Hex: Better tactical combat (no diagonal weirdness), harder to implement
- **Recommendation:** Square grid (DCSS proven)

**Q3: FOV / Fog of War?**
- Full visibility (see entire grid)
- Line-of-sight only (fog of war)
- **Recommendation:** Phase 1 = full visibility, Phase 3 = add FOV if desired (rot.js has FOV algorithms)

**Q4: Multi-floor combat?**
- Combat spans multiple z-levels (e.g., balcony overlooking arena)
- **Recommendation:** Out of scope for MVP (assume single-floor grid per room)

---

## Team Impact

**Backend (Drizzt/Minsc):** Need to extend Colyseus schema to include grid positions (x, y per entity in room). New WebSocket message types for grid state updates.

**Game Design (Ralph):** Need to decide which rooms support grid combat (all? boss rooms only?). Grid size per room. Entity placement strategy.

**Frontend (Regis):** Owner. New CombatGrid component, sprite sheet management, Canvas rendering, WebSocket handlers.

**Testing:** Grid should not break existing text combat. Both modes must work independently.

---

## Risks & Mitigations

**Risk 1: Tileset licensing issues**
- **Mitigation:** Strict audit of DCSS tiles, only use CC0-confirmed tiles, maintain attribution

**Risk 2: Performance issues on low-end devices**
- **Mitigation:** Performance testing in Phase 1, fallback to text-only if needed

**Risk 3: Players find grid distracting/unnecessary**
- **Mitigation:** User survey after Phase 1 prototype, grid is **toggleable and optional**

**Risk 4: Screen reader users lose combat info**
- **Mitigation:** Text parity requirement (all grid events logged as text)

---

## Alternatives Considered & Rejected

**ASCII Art Grid (No Sprites):** Render grid as colored ASCII characters. Rejected: DCSS-style tiles explicitly requested in issue.

**SVG-Based Grid:** Use SVG instead of Canvas. Rejected: Performance issues with 400+ SVG nodes.

**Terminal-Based Grid (ANSI Blocks):** Render grid as ANSI-colored blocks in terminal. Rejected: Not visually compelling enough.

**WebGL (Pixi.js):** Hardware-accelerated rendering. Rejected: Overkill for static tile grid, adds 500KB bundle size.

---

## Approval Needed From

- **Ralph (Lead):** Grid design philosophy, integration with text combat, tactical combat system
- **Drizzt/Minsc (Backend):** Server-side grid positioning, WebSocket protocol
- **Team consensus:** Canvas 2D vs WebGL, desktop-first approach, Phase 1 scope

---

**Next Steps:**
1. Get team approval on Canvas 2D approach
2. Download DCSS tiles repository and audit licensing
3. Create prototype sprite sheet (10-20 test tiles)
4. Design WebSocket protocol (collaborate with backend)
5. Implement Phase 1 prototype

— Regis
# Issue #337 Decision: Grid Combat Visual System

**Date:** 2026-04-07  
**Decision Owner:** Laeral (Content Designer)  
**Status:** DESIGN RECOMMENDATION FOR TEAM  
**Issue:** #337 — "feature idea: in-room combat represented by sprites in a grid (DCSS style)"

---

## Decision: Grid Combat is Optional, Text-First Supplementary

### The Recommendation

Implement a DCSS-style grid overlay for real-time combat, but **grid visibility and interaction must be optional**. The text-primary MUD experience remains the canonical game, and text-only players must have zero disadvantage.

### Why This Matters

1. **Ellmud's identity is text-first.** Grid is a clarity tool, not a game changer.
2. **Accessibility.** Color-blind, mobile, and keyboard-only players must not be locked out.
3. **Server load.** Optional grids mean clients that don't need them don't request updates.
4. **MUD tradition.** Position-based combat has existed in MUDs for 30+ years via text. Grid adds *visuals*, not *mechanics*.

---

## Key Decisions Locked In

### 1. Creature Visual Representation

| **Factor** | **Decision** | **Rationale** |
|---|---|---|
| **Silhouettes define category** | Humanoid / Bestial / Swarming / Amorphous / Drone shapes | Instant readability at 32×32px |
| **Color = threat level** | Saturation increases with danger (pale = weak, vivid = boss) | Subconscious threat reading |
| **Size scales with tier** | 1×1 for common, 2×2+ for bosses | Visual weight = combat weight |
| **State overlays** | Wounds, downed, stabilized shown as texture + position changes | No extra UI clutter |
| **Disposition badges** | Small icons (🔴 hostile, 🟡 alerted, 🟢 neutral) | Single-glance threat assessment |

### 2. Grid Room Atmosphere

| **Factor** | **Decision** | **Rationale** |
|---|---|---|
| **Faction color palettes** | Kindari = grey/rust, Bloom = green/cyan, Krewe = purple/gold | Visual cohesion per zone |
| **Terrain tiles** | Base layer (stone/algae/ritual) + hazard overlays (toxic/spikes/heat) | Layered visual clarity |
| **Fog of war** | Partial visibility based on existing LOS; ghosted off-screen creatures | Preserves extraction-horror tension |
| **Environmental storytelling** | Tile details (rust streaks, glowing cracks, ritual symbols) suggest zone history | Immersion without text bloat |

### 3. Player Representation

| **Factor** | **Decision** | **Rationale** |
|---|---|---|
| **Faction-colored sprites** | Player color reflects home stronghold | Quick team identification |
| **Visible equipment** | Weapon/armor silhouettes visible on player sprite | Tactical readability |
| **PvP threat glow** | Red outline for hostile players | Instant danger recognition |
| **Proximity clustering** | Players naturally group in adjacent cells; name labels auto-compact at 5+ | Avoids label clutter |

### 4. Art Direction

| **Factor** | **Decision** | **Rationale** |
|---|---|---|
| **Pixel art at 32×32px** | High-contrast, minimalist, hard edges | Moody, retro, efficient; fits dystopian aesthetic |
| **Limited palettes** | ~24–32 colors per zone tileset | Enforces impact and clarity |
| **Minimal animation** | 2–4 frame loops for idle/walk/attack | Performance; retro feel |
| **Reference style** | DCSS (readability) + Cogmind (sci-fi) + Caves of Qud (mutation) | Dark extraction-horror tone |

### 5. Design Principle: Supplementary, Never Mandatory

| **Constraint** | **How It's Enforced** |
|---|---|
| **Text combat is canonical** | All position info, ability costs, cooldowns visible in text feed first. Grid updates *sync with* text, never ahead. |
| **Grid is optional** | Toggle button hides grid; game fully playable without it. Mobile clients can default to text-only. |
| **No information loss** | Any data shown on grid is also in text (position badges, target list, creature state). |
| **Keyboard-only works** | All grid actions (move, target, ability) have hotkey equivalents; clicking grid is optional. |

---

## Technical Implications for Squad

### For Minsc (Combat System)

- Existing `position` system (Front/Flank/Rear) maps directly to grid zones
- Existing creature `disposition` (hostile/neutral/fleeing) maps to badge system
- No new data structures needed; grid consumes existing room/combat state
- **Note:** LOS mechanics (awareness skill, stealth) must feed into grid visibility layer

### For Regis (Client/UI)

- Build grid renderer (Canvas or WebGL) as **optional HUD panel**
- Grid updates on **1-second combat tick** (sync with text narration)
- Implement grid toggle in Settings → Display
- Add **zoom/scale options** and **high-contrast mode**
- Keyboard hotkeys for positioning (e.g., NumPad for grid movement)
- Mobile fallback: Grid disabled by default on <768px screens

### For Bruenor (Content/Database)

- **No database changes required** for grid to work (room exits, creature stats, terrain all exist)
- Optional: Add tileset category tags to zones (e.g., `zone.grid_theme = 'kindari'`) to assign palette
- Create creature sprite definitions (just references to 32×32 PNG files in `assets/sprites/creatures/`)

### For Drizzt (Narration/LLM)

- Narration remains text-primary and unaffected
- Grid clarity actually *reduces* narration burden (position already visual, no need to over-describe)

---

## Decisions Deferred (Future Discussion)

- **Animated terrain:** Do hazard tiles animate? (Defer to Phase 4 polish)
- **Destructible terrain:** Can players break walls, collapse hazards? (Gameplay decision, not visual)
- **Grid-only abilities:** Are there abilities that only work with grid visibility? (No — must work text-only)
- **Asset license:** Will sprites be hand-drawn, AI-generated, or licensed existing assets? (Art production decision)

---

## Design Documentation

Complete visual design analysis saved to:
- **File:** `docs/design/337-combat-grid-visual-design.md`
- **Sections:** Creature representation, zone atmosphere, player sprites, design principles, art direction, implementation roadmap, visual glossary

This document is the canonical reference for squad implementation.

---

## Sign-Off

- **Laeral:** Design complete, ready for implementation scoping
- **Next steps:** Regis estimates client build complexity; Bruenor assesses content requirements; Squad schedules art production phase



---

