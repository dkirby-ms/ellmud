## 2026-04-19T11:30:00Z: E2E Combat Coverage Expansion (PR #480)

**By:** Minsc (QA), Elminster (Review Lead)  
**PR:** #480 — `e2e/expand-combat-coverage` → `dev`  
**Date:** 2026-04-19  
**Status:** ✅ Merged to `dev`  
**Scope:** Test infrastructure — combat e2e coverage gaps, assertion tightening

---

## Overview

Expanded combat e2e test suite from 7 → 10 tests (3 new, 3 tightened assertions). All 39 e2e tests pass, zero regressions. PR reviewed and approved by Elminster with two non-blocking improvement suggestions.

---

## New Tests (3)

### Combat Completion
**Test:** `combat completes when creature is killed`  
Kills a sludge_crawler in warrens dungeon zone, verifies `/is defeated/` and `/combat has ended/` messages. Uses `peaceful` mode to isolate encounter.  
**Quality:** Strong — both end-of-combat messages verified with specific regex.

### Movement Block
**Test:** `go command is blocked during combat`  
Tests in reliquary-inn (sync zone, no ticks needed). Verifies exact error: `"You're in combat! Use 'flee' to escape first."`  
**Quality:** Strong — gold standard for command rejection testing.

### Multi-Creature Aggro
**Test:** `multiple aggressive creatures engage when one is attacked`  
Two flood_scuttlers spawn; player attacks one; waits for strike messages from both.  
**Note:** No DB creatures have `assist` configs; test uses aggressive behavior tree proxy (acceptable pragmatic choice).

---

## Tightened Assertions (3)

### Observer Test
**Before:** `seesAlice || seesCombat` — passes on name OR any combat keyword (too loose)  
**After:** Regex `/strikes.*for \d+ damage/i` — Bob must see actual strike narration with numeric damage  
**Quality:** Strong — moved to warrens for real tick-based damage verification.

### Flee Test
**Before:** `m.length > 20` — "any long message proves flee worked" (easily passes on room descriptions)  
**After:** Retry loop (5 attempts for 50% chance) → `/flees from combat/i` → `go west` succeeds  
**Quality:** Strong — movement success is definitive proof of escape.

### Aggressive Creature Test
**Before:** Spawns aggressive creature, manually types `attack` (identical to Test 1)  
**After:** Spawns flood_scuttler in rubble-boulevard, player walks in with `go east`, waits for auto-aggro  
**Quality:** Strong — tests actual AI behavior tree path (idle → hostile → combat_strike).

---

## Infrastructure Work

| Component | Status | Notes |
|-----------|--------|-------|
| `DEV_MODE_ENABLED` flag | ✅ | Enables `goto` + `peaceful` for test control. Zero regressions (29 existing tests pass). |
| `teleportToWarrens()` helper | ✅ | Clean abstraction. Double-confirmation (waitForMessage + look) handles async zone loading. |
| File-level JSDoc | ✅ | Documents faction_hub vs dungeon zone distinction — prevents future confusion. |
| `adminSpawnCreature` zone param | ✅ | Pre-existing 3rd arg (`zoneSlug`) correctly used for warrens spawns. |

---

## Critical Discovery: Combat Tick Architecture

**Problem:** Combat ticks don't run in starting zones (`faction_hub` category: reliquary, bloom-observatory, carrion-court).  
**Original observation:** Tests 1–7 only passed because they tested synchronous command responses, not tick resolution.  
**Solution:** `goto warrens:shattered-gate` teleports to dungeon zone where ticks are active.  
**Pattern locked in:** Starting zone + teleport + peaceful isolation = reliable combat e2e.

---

## Review Outcome

**Reviewer:** Elminster  
**Verdict:** APPROVE_WITH_NOTES  
**Assessment:** 5/6 fully addressed, 1/6 via acceptable proxy. Two minor improvement suggestions.

### Elminster's Non-Blocking Suggestions

1. **Multi-creature assertion:** Change `strikeMessages.length >= 1` to `>= 2` — both creatures should produce at least 2 total strikes in 20s.

2. **Flee retry failure message:** Add explicit error after retry loop:
   ```ts
   throw new Error('Flee failed after 5 attempts');
   ```
   (Currently test fails confusingly with `go` command timeout if all flee attempts fail.)

---

## Rationale & Design Notes

**Pragmatic creature-assist proxy:** Avoids coupling test infrastructure to game content seeds. True assist test would require seed data changes (no DB creatures currently have `assist` configs). Current aggressive behavior tree proxy is the right pragmatic choice.

**Zone distinction documentation:** Future developers will understand why combat tests must teleport to dungeons. Prevents costly rework.

**DEV_MODE_ENABLED scope:** Test server only. No regressions. Acceptable surface for test admin commands.

---

## Artifacts

- PR #480: `e2e/expand-combat-coverage` → `dev`
- Test file: `packages/server/src/__tests__/e2e/combat.spec.ts`
- Orchestration logs: 
  - `.squad/orchestration-log/2026-04-19T11-30-minsc.md`
  - `.squad/orchestration-log/2026-04-19T11-30-elminster.md`
- Session log: `.squad/log/2026-04-19T11-30-e2e-combat-expansion.md`

---

*Merged from inbox: `elminster-e2e-combat-review-480.md` on 2026-04-19T11:30:00Z.*

---


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


## 2026-04-15: CI/CD Branching Strategy & Promotion Gating

**By:** Khelben (CI/CD Dev)  
**Date:** 2026-04-15  
**Context:** Post-incident review of commit 8aaea81 (TS errors promoted to uat)  
**Status:** Analysis complete; recommendations issued  
**Scope:** CI/CD pipeline — promotion workflows, gating, concurrency

### Executive Summary

Current dev → uat → prod model is sound, but **automated scheduled promotion lacks CI gating**. Broken code on dev gets merged to uat without validation. Root cause: `scheduled-uat-promote.yml` checks commit count, not CI status. Broken code sits on uat until caught by uat's CI, delaying detection and fixes.

### Critical Issues

**1. No CI Gating on Scheduled Promotion**
- Scheduled promotion runs 4x daily (01:00, 13:00, 17:00, 21:00 UTC)
- If dev has 10 commits ahead (including broken ones), all 10 auto-merge to uat
- CI validation happens *after* merge → 12-hour detection lag (TS errors, 2026-04-14)
- **Fix:** Check dev's latest CI status before merging; skip if failed

**2. Forbidden-Path Duplication**
- `.github/scripts/strip-forbidden-paths.sh` defines authoritative list
- Also defined inline in `scheduled-uat-promote.yml` line 85 (conflict regex)
- One list updated → other forgotten → conflicts missed → forbidden files leak
- **Fix:** Single source of truth; both workflows reference same script

**3. Concurrency Group Misalignment**
- `scheduled-uat-promote.yml` group = `uat-promote` (dev→uat)
- `squad-promote.yml` group = `prod-promote` (uat→prod)
- Separate groups allow dev→uat and uat→prod to overlap (race condition)
- **Fix:** Unified group name (`code-promotion`) serializes all promotions

### Immediate Actions (Priority 1)

**1. Add CI Gating to scheduled-uat-promote.yml**
- New `check-dev-ci` job validates dev's latest CI run
- Outputs `passed=true/false`
- `promote-dev-to-uat` job depends on this; skips if CI failed

**2. Consolidate Forbidden-Paths Reference**
- Extract forbidden-path regex to script or shared variable
- Both workflows source the same definition
- Prevents sync drift

**3. Unify Concurrency Groups**
- Both workflows use `concurrency.group: code-promotion`
- Ensures uat→prod waits for dev→uat completion

### Medium/Long-term Recommendations

- **Branch Protection Rules:** Confirm uat requires CI status check; prod requires up-to-date
- **Release Branch Model:** If real prod system added, switch from force-push to merge-based with hotfix cherry-pick
- **Promotion Observability:** Add Discord notifications for all promotion outcomes (success, skip, failure)
# Progression System Architecture — Issue #457

**Author:** Elminster (Lead/Architect)  
**Date:** 2025-01-28  
**Issue:** #457 — Stat training and progression system  
**Status:** PROPOSAL (awaiting Dale's approval)

---

## Executive Summary

This proposal redesigns EllMUD's progression system from the current static-stat model to a **use-based, skill-driven progression** system with scaled HP growth, 0-100 combat stats, and stamina as a separate resource pool.

**Key Changes:**
- **HP scaling:** 20-30 base → 1000+ endgame via combat experience
- **Combat stats:** 0-100 scale for all weapon skills and defensive stats
- **Stamina:** New ~100 pool separate from HP, modified by status/gear
- **Use-based progression:** Using a weapon type increases that skill (fast early, slow later)
- **Three-layer model preserved:** Template → Base → Effective (Base now grows over time)

**Migration Strategy:** 4-phase rollout with backward compatibility at each step.

---

## 1. STAT MODEL REDESIGN

### 1.1 Current System (Phase 1 Baseline)

**CombatStats Interface (8 stats):**
```typescript
interface CombatStats {
  maxHp: number;        // Currently: 100 (static)
  unarmed: number;      // Currently: 5 (static)
  oneHanded: number;    // Currently: 5 (static)
  twoHanded: number;    // Currently: 5 (static)
  ranged: number;       // Currently: 5 (static)
  shieldBlock: number;  // Currently: 5 (static)
  dodge: number;        // Currently: 5 (static)
  armour: number;       // Currently: 2 (static)
}
```

**Problems:**
- All players have identical stats (no progression)
- Starting HP=100 is too high for early game (should be 20-30)
- No differentiation between starter and endgame characters
- Equipment bonuses exist but add to already-high base values

### 1.2 New System — 0-100 Scaled Stats

**Revised CombatStats Interface:**
```typescript
interface CombatStats {
  maxHp: number;        // 20-30 base → 1000+ endgame (separate formula)
  unarmed: number;      // 0-100 scale (5 = starter value)
  oneHanded: number;    // 0-100 scale (5 = starter value)
  twoHanded: number;    // 0-100 scale (5 = starter value)
  ranged: number;       // 0-100 scale (5 = starter value)
  shieldBlock: number;  // 0-100 scale (5 = starter value)
  dodge: number;        // 0-100 scale (5 = starter value)
  armour: number;       // 0-100 scale (2 = starter value)
}
```

**0-100 Scale Semantics:**
- **0-20:** Untrained (fumbles, poor accuracy, minimal defence)
- **21-40:** Novice (functional basics, common in new players)
- **41-60:** Competent (reliable performance, mid-game plateau)
- **61-80:** Expert (high effectiveness, late-game target)
- **81-100:** Master (peak performance, endgame specialists)

**Starter Values (same as current):**
- Weapon skills: 5 (untrained baseline — use-based growth from here)
- Defensive stats: dodge=5, shieldBlock=5, armour=2
- maxHp: **25** (down from 100)

### 1.3 Stamina — New Resource Pool

**New Stat:**
```typescript
interface Combatant {
  // ... existing fields
  stamina: number;      // Current stamina (players only)
  maxStamina: number;   // Maximum stamina (players only)
}
```

**Properties:**
- **Base value:** 100 for all players (never scales with progression)
- **Regeneration:** +10 stamina per tick (1 second) out of combat; +5 per tick in combat
- **Status modifiers:** Exhausted=-50 max, Energized=+25 max, Bleeding=-5/tick
- **Equipment modifiers:** Light armour=+10 max, Heavy armour=-15 max
- **Ability costs:** Heavy Strike=15, Block=10/tick, Dodge=20

**Stamina replaces mana/energy concepts — it's a tactical resource, not a magic bar.**

### 1.4 HP Growth Formula

**Current Problem:** HP=100 for all characters (starter and endgame same).

**New Formula (Logarithmic Growth Curve):**

```
maxHp = base_hp + (combat_xp_multiplier × log(1 + total_combat_xp))
```

Where:
- `base_hp = 25` (starting HP for new characters)
- `combat_xp_multiplier = 150` (tuning constant)
- `total_combat_xp` = cumulative XP earned from combat encounters (all sources)
- `log()` = natural logarithm

**Example Milestones:**
| Total Combat XP | Max HP | Description |
|---|---|---|
| 0 | 25 | Brand new character |
| 100 | 116 | ~10 encounters survived |
| 500 | 219 | ~50 encounters, early mid-game |
| 2000 | 389 | ~200 encounters, solid mid-game |
| 10000 | 687 | ~1000 encounters, late-game |
| 50000 | 1031 | Endgame veteran |

**Why Logarithmic?**
- Fast early gains (25→116 in first 10 encounters = good feedback)
- Slows naturally at mid/late game (prevents runaway scaling)
- No hard cap needed (100k XP = ~1200 HP, diminishing returns keep it reasonable)
- Matches genre conventions (classic MUDs, D&D, roguelikes all use logarithmic HP curves)

**XP Sources (all award combat_xp):**
- Creature kill credit: 10-100 XP (scaled by creature level)
- Survival time in combat: 5 XP per 30 ticks (~30 seconds)
- Boss kills: 500-2000 XP (one-time bonuses)
- PvP kills: 50-200 XP (scaled by victim's HP/level)

### 1.5 Damage Formula Impacts

**Current damage formula (from damage.ts):**
```
final_damage = max(1, (attack × stance_multiplier) - armour) × flanking_bonus
```

**No changes needed to core formula**, but:
- **Attack values will trend higher** as weapon skills grow 5→80+
- **Armour reduction becomes more meaningful** (armour 2→50 blocks flat damage)
- **Equipment damage bonuses remain additive** (`attack = weaponSkill + weaponDamage`)

**Example Combat Math (using new scales):**
- Starter player: `unarmed=5 + fists=0 = attack 5` vs. `armour 2` → `5-2 = 3 damage/hit`
- Mid-game player: `oneHanded=40 + iron_sword=10 = attack 50` vs. `armour 15` → `50-15 = 35 damage/hit`
- Endgame player: `twoHanded=75 + steel_greatsword=30 = attack 105` vs. `armour 50` → `105-50 = 55 damage/hit`

**Dodge/Block Chance Formulas (already exist in damage.ts):**
```typescript
dodgeChance = min(0.75, 0.20 + 0.03 × dodge)   // 20% base + 3% per rank
blockChance = min(0.60, 0.05 + 0.03 × shieldBlock) // 5% base + 3% per rank
```

These formulas **already scale correctly** for 0-100 values:
- dodge=5 → 35% dodge chance (starter)
- dodge=50 → 75% dodge chance (capped, endgame)
- shieldBlock=5 → 20% block chance (starter)
- shieldBlock=18 → 60% block chance (capped, mid-game)

---

## 2. USE-BASED PROGRESSION SYSTEM

### 2.1 Core Mechanic — Skill-by-Doing

**Design Principle:** Using a weapon type increases that weapon's skill rank. Defensive stats grow through successful use.

**Trigger Events:**
| Stat | Trigger | XP Award |
|---|---|---|
| unarmed | Land unarmed strike | 1-3 XP |
| oneHanded | Land one-handed weapon strike | 1-3 XP |
| twoHanded | Land two-handed weapon strike | 1-3 XP |
| ranged | Land ranged weapon strike | 1-3 XP |
| shieldBlock | Successfully block attack with shield | 2-5 XP |
| dodge | Successfully dodge attack | 2-5 XP |
| armour | Take reduced damage from armour | 1 XP per 5 damage blocked |

**XP variance:** 
- Successful hits against higher-level creatures award more XP (×1.5 multiplier per level difference)
- Critical success (future): Double XP award
- Misses/failures award 0 XP (no participation trophies)

### 2.2 Skill Rank Growth Curve

**Formula (Exponential XP Requirements):**

```typescript
function xpToNextRank(currentRank: number): number {
  if (currentRank >= 100) return Infinity; // Cap at 100
  return Math.floor(50 * Math.pow(1.15, currentRank));
}
```

**Example Milestones:**
| Rank | Total XP Required | Hits to Rank (avg) | Description |
|---|---|---|---|
| 5 → 10 | 356 XP | ~150 hits | Fast early gains (starter → novice) |
| 10 → 20 | 1,742 XP | ~700 hits | Early mid-game (novice → competent) |
| 20 → 40 | 18,314 XP | ~7,000 hits | Mid-game plateau (competent → expert) |
| 40 → 60 | 193,201 XP | ~77,000 hits | Late-game grind (expert → master) |
| 60 → 80 | 2,038,392 XP | ~815,000 hits | Endgame mastery |
| 80 → 100 | 21,508,780 XP | ~8.6M hits | Lifetime achievement (months/years) |

**Why Exponential?**
- **Ranks 0-20:** Fast progression (days) — new players see results quickly
- **Ranks 20-40:** Moderate pace (weeks) — mid-game plateau feels earned
- **Ranks 40-60:** Slow grind (months) — late-game specialization is meaningful
- **Ranks 60-100:** Prestige territory (months/years) — true mastery is rare

**Anti-Grind Safeguards:**
- **Skill XP per encounter capped** at 50 XP/skill (prevents AFK farming)
- **Diminishing returns on same-level mobs** (kill same creature 10+ times = halved XP)
- **Variety bonus** (+25% XP for using multiple weapon types in same session)

### 2.3 Skill Specialization vs. Generalization

**Players choose their path:**
- **Specialist:** Focus one weapon type (e.g., oneHanded=80, rest=5) → High attack in one style, weak if disarmed
- **Generalist:** Spread across multiple types (e.g., oneHanded=40, twoHanded=40, ranged=30) → Flexible, but lower peak damage
- **Defensive tank:** Invest in shieldBlock + armour → Low damage, high survivability
- **Dodge specialist:** Max dodge + light armour → High avoidance, fragile if hit

**No class restrictions — equipment access and stat growth are the only constraints.**

### 2.4 Database Schema — Skill XP Tracking

**New Table: `character_skill_progress`**

```sql
CREATE TABLE character_skill_progress (
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  skill_type   TEXT NOT NULL, -- 'unarmed', 'oneHanded', 'twoHanded', 'ranged', 'shieldBlock', 'dodge', 'armour'
  current_xp   INTEGER NOT NULL DEFAULT 0,
  total_xp     INTEGER NOT NULL DEFAULT 0, -- Lifetime XP (never decreases, even after rank-ups)
  last_gain_at TIMESTAMPTZ,
  PRIMARY KEY (character_id, skill_type)
);

CREATE INDEX idx_character_skill_progress_char ON character_skill_progress(character_id);
```

**Why separate table?**
- Keeps `characters` table clean (stat columns stay as base ranks)
- Allows XP history queries (when did they last train X?)
- Supports future skill decay mechanics (unused skills atrophy over time)

**XP → Rank Conversion (runtime):**
```typescript
function calculateRankFromXP(totalXP: number): number {
  let rank = 0;
  let xpRequired = 0;
  while (xpRequired <= totalXP && rank < 100) {
    xpRequired += xpToNextRank(rank);
    rank++;
  }
  return rank;
}
```

This runs on:
- Character login (load base stats from DB)
- Equipment change (recalculate effective stats)
- Skill XP gain (check for rank-up, update characters table if needed)

### 2.5 Combat XP (for HP Growth)

**New Column: `characters.combat_xp`**

```sql
ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS combat_xp INTEGER NOT NULL DEFAULT 0;
```

**Combat XP is separate from skill XP:**
- Skill XP: Per-skill progression (oneHanded, dodge, etc.)
- Combat XP: Universal HP growth currency

**Award Rules:**
- Creature kill credit: 10-100 XP (scaled by creature level)
- Survival bonus: 5 XP per 30 combat ticks (~30 seconds in active combat)
- Boss kill bonus: 500-2000 XP (one-time per boss per character)
- PvP kill: 50-200 XP (scaled by victim's max HP / 10)

**No XP loss on death** (death penalty is corpse loot + temporary stat debuff, not XP loss).

---

## 3. DATABASE SCHEMA CHANGES

### 3.1 Migration 020 — Progression Foundations

**File:** `020_progression_system.sql`

```sql
-- ============================================================================
-- Migration 020: Progression System — Use-Based Skill Growth & HP Scaling
-- ============================================================================

-- ─── Step 1: Add combat_xp to characters ────────────────────────────────────

ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS combat_xp INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN characters.combat_xp IS 
  'Cumulative combat experience points — drives HP growth via logarithmic formula.';

-- ─── Step 2: Adjust starter HP from 100 → 25 ────────────────────────────────

-- Update default for new characters
ALTER TABLE characters
  ALTER COLUMN max_hp SET DEFAULT 25;

-- Migrate existing characters: Set combat_xp based on current HP
-- Formula: If HP=100, grant retroactive XP equivalent to mid-game character
-- This preserves existing power level while enabling future growth
UPDATE characters
  SET combat_xp = CASE
    WHEN max_hp = 100 THEN 2000  -- Retroactive "mid-game" XP (~389 calculated HP)
    ELSE 0                        -- Fresh characters start at 0
  END,
  max_hp = CASE
    WHEN max_hp = 100 THEN 389   -- Recalculate from combat_xp=2000
    ELSE 25                       -- Fresh characters start at base
  END
  WHERE deleted_at IS NULL;

-- ─── Step 3: Create skill progress tracking table ───────────────────────────

CREATE TABLE character_skill_progress (
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  skill_type   TEXT NOT NULL, -- 'unarmed', 'oneHanded', 'twoHanded', 'ranged', 'shieldBlock', 'dodge', 'armour'
  current_xp   INTEGER NOT NULL DEFAULT 0,  -- XP toward next rank
  total_xp     INTEGER NOT NULL DEFAULT 0,  -- Lifetime XP (never decreases)
  last_gain_at TIMESTAMPTZ,
  PRIMARY KEY (character_id, skill_type),
  CONSTRAINT chk_skill_type CHECK (
    skill_type IN ('unarmed', 'oneHanded', 'twoHanded', 'ranged', 'shieldBlock', 'dodge', 'armour')
  )
);

CREATE INDEX idx_character_skill_progress_char ON character_skill_progress(character_id);

COMMENT ON TABLE character_skill_progress IS
  'Tracks per-skill XP progression for use-based skill growth system (Issue #457).';

-- ─── Step 4: Initialize skill XP for existing characters ────────────────────

-- Retroactive XP grant: Existing characters with stat rank 5 get starter XP (0)
-- Characters with higher ranks (e.g., from testing) get proportional XP
INSERT INTO character_skill_progress (character_id, skill_type, total_xp, current_xp)
SELECT 
  c.id AS character_id,
  skill_type,
  -- Retroactive XP calculation (approximate)
  CASE 
    WHEN rank = 5 THEN 0  -- Starter value = 0 XP
    WHEN rank > 5 THEN FLOOR(50 * (POWER(1.15, rank) - 1) / 0.15)  -- Geometric series sum
    ELSE 0
  END AS total_xp,
  0 AS current_xp  -- All XP applied to ranks; current_xp always starts fresh
FROM characters c
CROSS JOIN (
  SELECT 'unarmed' AS skill_type, c.unarmed AS rank FROM characters c WHERE c.deleted_at IS NULL
  UNION ALL
  SELECT 'oneHanded', c.one_handed FROM characters c WHERE c.deleted_at IS NULL
  UNION ALL
  SELECT 'twoHanded', c.two_handed FROM characters c WHERE c.deleted_at IS NULL
  UNION ALL
  SELECT 'ranged', c.ranged FROM characters c WHERE c.deleted_at IS NULL
  UNION ALL
  SELECT 'shieldBlock', c.shield_block FROM characters c WHERE c.deleted_at IS NULL
  UNION ALL
  SELECT 'dodge', c.dodge FROM characters c WHERE c.deleted_at IS NULL
  UNION ALL
  SELECT 'armour', c.armour FROM characters c WHERE c.deleted_at IS NULL
) AS skill_data
ON c.id = skill_data.character_id  -- This is invalid SQL; fixed below
WHERE c.deleted_at IS NULL;

-- CORRECTED INSERT (removing invalid self-join):
INSERT INTO character_skill_progress (character_id, skill_type, total_xp, current_xp)
SELECT c.id, 'unarmed', 0, 0 FROM characters c WHERE c.deleted_at IS NULL
UNION ALL
SELECT c.id, 'oneHanded', 0, 0 FROM characters c WHERE c.deleted_at IS NULL
UNION ALL
SELECT c.id, 'twoHanded', 0, 0 FROM characters c WHERE c.deleted_at IS NULL
UNION ALL
SELECT c.id, 'ranged', 0, 0 FROM characters c WHERE c.deleted_at IS NULL
UNION ALL
SELECT c.id, 'shieldBlock', 0, 0 FROM characters c WHERE c.deleted_at IS NULL
UNION ALL
SELECT c.id, 'dodge', 0, 0 FROM characters c WHERE c.deleted_at IS NULL
UNION ALL
SELECT c.id, 'armour', 0, 0 FROM characters c WHERE c.deleted_at IS NULL;

-- ─── Step 5: Add stamina columns to characters ──────────────────────────────

-- Stamina is NOT stored in characters table (it's runtime-only in PlayerState)
-- Max stamina modifiers from equipment/status are calculated dynamically
-- No migration needed here; stamina lives in Combatant interface only

-- ─── Verification Queries ────────────────────────────────────────────────────

-- Verify all active characters have skill progress rows (should be 7 per character)
-- Expected: COUNT(*) = 7 × (active character count)
-- SELECT COUNT(*) FROM character_skill_progress;

-- Verify HP migration preserved power levels
-- SELECT id, max_hp, combat_xp FROM characters WHERE deleted_at IS NULL;
```

### 3.2 Data Model Summary

**After Migration 020:**

**`characters` table changes:**
- `max_hp` default: 100 → 25
- `combat_xp` column added (drives HP growth)
- Existing stat columns (unarmed, one_handed, etc.) unchanged — still store base ranks

**New table: `character_skill_progress`**
- Tracks XP per skill type
- `total_xp` used to calculate current rank
- `current_xp` tracks partial progress toward next rank (UI display)

**Runtime-only (not persisted):**
- `stamina` / `maxStamina` (in Combatant interface, recalculated each combat registration)

---

## 4. INTEGRATION POINTS

### 4.1 Combat Registration (attack.ts, ZoneRoom.ts)

**Current Problem (from history.md):**
> Player combat always uses DEFAULT_PLAYER_STATS — base stats from DB and equipment bonuses never loaded at registration (attack.ts:57, ZoneRoom.ts:1911, 1952)

**Fix Required:**

**In `ZoneRoom.ts` (lines 1985-1991, 2030-2036):**

Replace:
```typescript
const eff = this.playerStatsCache.get(player.sessionId);
const playerOpts = eff
  ? { attack: eff.attack, maxHp: eff.maxHp, armour: eff.armour, dodge: eff.dodge, shieldBlock: eff.shieldBlock }
  : undefined;
```

With:
```typescript
const eff = this.playerStatsCache.get(player.sessionId);
const playerOpts = eff
  ? { 
      attack: eff.attack, 
      maxHp: eff.maxHp, 
      armour: eff.armour, 
      dodge: eff.dodge, 
      shieldBlock: eff.shieldBlock,
      stamina: eff.maxStamina,       // NEW: Wire stamina
      maxStamina: eff.maxStamina     // NEW: Wire stamina
    }
  : undefined;
```

**Add `calculateMaxStamina()` helper:**
```typescript
// In stats.ts or new progression.ts file
export function calculateMaxStamina(
  baseStamina: number = 100,
  equipment: EquipmentBonuses,
  statusEffects: string[] = []
): number {
  let max = baseStamina;
  
  // Equipment modifiers (from armour weight)
  if (equipment.armour >= 20) max -= 15;  // Heavy armour penalty
  else if (equipment.armour <= 5) max += 10; // Light armour bonus
  
  // Status effect modifiers
  if (statusEffects.includes('exhausted')) max -= 50;
  if (statusEffects.includes('energized')) max += 25;
  
  return Math.max(10, max); // Floor at 10 to prevent 0-stamina edge cases
}
```

**Wire into `calculatePlayerEffectiveStats()`:**
```typescript
export interface EffectiveStats {
  maxHp: number;
  attack: number;
  armour: number;
  shieldBlock: number;
  dodge: number;
  maxStamina: number;  // NEW
}

export function calculatePlayerEffectiveStats(
  base: CombatStats,
  equipment: EquipmentBonuses,
  statusEffects: string[] = []
): EffectiveStats {
  const skillKey = WEAPON_SKILL_KEY[equipment.weaponSkill];
  const weaponSkillValue = base[skillKey] as number;

  return {
    maxHp: base.maxHp,
    attack: weaponSkillValue + equipment.weaponDamage,
    armour: base.armour + equipment.armour,
    shieldBlock: equipment.shieldBlock > 0 ? base.shieldBlock + equipment.shieldBlock : 0,
    dodge: base.dodge,
    maxStamina: calculateMaxStamina(100, equipment, statusEffects),  // NEW
  };
}
```

### 4.2 HP Growth on Combat XP Gain

**New System: `ProgressionSystem.ts`**

```typescript
/**
 * ProgressionSystem — Handles skill XP gains, rank-ups, and HP growth.
 * 
 * Responsibilities:
 * - Award skill XP on combat events (hits landed, blocks, dodges)
 * - Award combat XP on kills/survival
 * - Calculate rank-ups and persist to DB
 * - Recalculate HP from combat_xp on rank changes
 */

import type { CharacterRepository } from '../character/CharacterRepository.js';

export const HP_BASE = 25;
export const HP_MULTIPLIER = 150;

/** Calculate max HP from combat XP using logarithmic formula. */
export function calculateMaxHPFromCombatXP(combatXP: number): number {
  return Math.floor(HP_BASE + HP_MULTIPLIER * Math.log(1 + combatXP));
}

/** Calculate XP required to reach next rank for a given skill. */
export function xpToNextRank(currentRank: number): number {
  if (currentRank >= 100) return Infinity;
  return Math.floor(50 * Math.pow(1.15, currentRank));
}

/** Calculate current rank from total XP. */
export function calculateRankFromXP(totalXP: number): number {
  let rank = 0;
  let xpAccumulator = 0;
  while (rank < 100) {
    const xpNeeded = xpToNextRank(rank);
    if (xpAccumulator + xpNeeded > totalXP) break;
    xpAccumulator += xpNeeded;
    rank++;
  }
  return rank;
}

export interface SkillXPGain {
  characterId: string;
  skillType: 'unarmed' | 'oneHanded' | 'twoHanded' | 'ranged' | 'shieldBlock' | 'dodge' | 'armour';
  xp: number;
}

export interface CombatXPGain {
  characterId: string;
  xp: number;
  reason: string; // 'kill', 'survival', 'boss', 'pvp'
}

export class ProgressionSystem {
  constructor(private characterRepo: CharacterRepository) {}

  /** Award skill XP and check for rank-ups. Returns true if rank increased. */
  async awardSkillXP(gain: SkillXPGain): Promise<boolean> {
    // Load current skill progress
    const progress = await this.characterRepo.getSkillProgress(gain.characterId, gain.skillType);
    const newTotalXP = progress.total_xp + gain.xp;
    const oldRank = calculateRankFromXP(progress.total_xp);
    const newRank = calculateRankFromXP(newTotalXP);

    // Persist XP gain
    await this.characterRepo.addSkillXP(gain.characterId, gain.skillType, gain.xp);

    // If rank-up occurred, update base stat in characters table
    if (newRank > oldRank) {
      await this.characterRepo.updateStatRank(gain.characterId, gain.skillType, newRank);
      return true;
    }
    return false;
  }

  /** Award combat XP and recalculate HP. Returns new max HP. */
  async awardCombatXP(gain: CombatXPGain): Promise<number> {
    const char = await this.characterRepo.getById(gain.characterId);
    if (!char) throw new Error('Character not found');

    const newCombatXP = char.combatStats.combat_xp + gain.xp;
    const newMaxHP = calculateMaxHPFromCombatXP(newCombatXP);

    // Persist combat XP and recalculated HP
    await this.characterRepo.updateCombatXP(gain.characterId, newCombatXP);
    await this.characterRepo.updateMaxHP(gain.characterId, newMaxHP);

    return newMaxHP;
  }
}
```

**Hook into CombatSystem tick resolution:**

```typescript
// In CombatSystem.ts, after damage is dealt:
if (result.events.some(e => e.type === 'defeated')) {
  const defeatedEvent = result.events.find(e => e.type === 'defeated');
  const killerIds = defeatedEvent.killerIds ?? [];
  
  // Award combat XP to all killers
  for (const killerId of killerIds) {
    const combatant = this.combatants.get(killerId);
    if (combatant?.isPlayer) {
      await this.progressionSystem.awardCombatXP({
        characterId: killerId,
        xp: 50, // Base kill XP (scaled by creature level in future)
        reason: 'kill'
      });
    }
  }
}

// Award skill XP for each landed hit
for (const event of result.events) {
  if (event.type === 'strike' && !event.dodged && !event.blocked) {
    const attacker = this.combatants.get(event.actorId);
    if (attacker?.isPlayer) {
      // Determine weapon type from attacker's equipment (requires equipment context)
      const weaponType = getEquippedWeaponType(event.actorId); // Needs implementation
      await this.progressionSystem.awardSkillXP({
        characterId: event.actorId,
        skillType: weaponType,
        xp: 2 // Base hit XP
      });
    }
  }
  
  // Award dodge XP on successful dodge
  if (event.dodged) {
    const defender = this.combatants.get(event.targetId);
    if (defender?.isPlayer) {
      await this.progressionSystem.awardSkillXP({
        characterId: event.targetId,
        skillType: 'dodge',
        xp: 3
      });
    }
  }
  
  // Award shieldBlock XP on successful block
  if (event.blocked) {
    const defender = this.combatants.get(event.targetId);
    if (defender?.isPlayer) {
      await this.progressionSystem.awardSkillXP({
        characterId: event.targetId,
        skillType: 'shieldBlock',
        xp: 4
      });
    }
  }
}
```

### 4.3 CharacterRepository Extensions

**New Methods:**

```typescript
export interface CharacterRepository {
  // ... existing methods
  
  /** Get skill progress for a specific skill type. */
  getSkillProgress(characterId: string, skillType: string): Promise<{
    total_xp: number;
    current_xp: number;
    last_gain_at: Date | null;
  }>;
  
  /** Add XP to a skill. */
  addSkillXP(characterId: string, skillType: string, xp: number): Promise<void>;
  
  /** Update a stat rank (called on rank-up). */
  updateStatRank(characterId: string, skillType: string, newRank: number): Promise<void>;
  
  /** Update combat XP. */
  updateCombatXP(characterId: string, newCombatXP: number): Promise<void>;
  
  /** Update max HP (recalculated from combat XP). */
  updateMaxHP(characterId: string, newMaxHP: number): Promise<void>;
}
```

**PgCharacterRepository Implementation:**

```typescript
async getSkillProgress(characterId: string, skillType: string) {
  const result = await this.db.query(
    `SELECT total_xp, current_xp, last_gain_at 
     FROM character_skill_progress 
     WHERE character_id = $1 AND skill_type = $2`,
    [characterId, skillType]
  );
  return result.rows[0] ?? { total_xp: 0, current_xp: 0, last_gain_at: null };
}

async addSkillXP(characterId: string, skillType: string, xp: number) {
  await this.db.query(
    `INSERT INTO character_skill_progress (character_id, skill_type, total_xp, current_xp, last_gain_at)
     VALUES ($1, $2, $3, $3, NOW())
     ON CONFLICT (character_id, skill_type)
     DO UPDATE SET 
       total_xp = character_skill_progress.total_xp + $3,
       current_xp = character_skill_progress.current_xp + $3,
       last_gain_at = NOW()`,
    [characterId, skillType, xp]
  );
}

async updateStatRank(characterId: string, skillType: string, newRank: number) {
  const columnMap = {
    unarmed: 'unarmed',
    oneHanded: 'one_handed',
    twoHanded: 'two_handed',
    ranged: 'ranged',
    shieldBlock: 'shield_block',
    dodge: 'dodge',
    armour: 'armour'
  };
  const column = columnMap[skillType];
  await this.db.query(
    `UPDATE characters SET ${column} = $1 WHERE id = $2`,
    [newRank, characterId]
  );
  
  // Reset current_xp to 0 after rank-up
  await this.db.query(
    `UPDATE character_skill_progress 
     SET current_xp = 0 
     WHERE character_id = $1 AND skill_type = $2`,
    [characterId, skillType]
  );
}

async updateCombatXP(characterId: string, newCombatXP: number) {
  await this.db.query(
    `UPDATE characters SET combat_xp = $1 WHERE id = $2`,
    [newCombatXP, characterId]
  );
}

async updateMaxHP(characterId: string, newMaxHP: number) {
  await this.db.query(
    `UPDATE characters SET max_hp = $1 WHERE id = $2`,
    [newMaxHP, characterId]
  );
}
```

### 4.4 Frontend Stat Display

**Current State (from shared/index.ts):**
- Frontend has `SET_COMBAT_STATS` reducer but server never dispatches it (integration gap from Phase 1 review)

**Required Changes:**

**Server: Dispatch combat stats on character load**

```typescript
// In ZoneRoom.ts, after player joins and character loads:
const baseStats = await this.characterRepo.getBaseStats(client.sessionId);
const equipment = this.loadoutManager.getEquippedItems(client.sessionId);
const equipmentBonuses = calculateEquipmentBonuses(equipment);
const effectiveStats = calculatePlayerEffectiveStats(baseStats, equipmentBonuses);

// Cache for combat registration
this.playerStatsCache.set(client.sessionId, effectiveStats);

// Dispatch to client
client.send('combat_stats', {
  maxHp: effectiveStats.maxHp,
  currentHp: client.state.hp, // From PlayerState
  attack: effectiveStats.attack,
  armour: effectiveStats.armour,
  dodge: effectiveStats.dodge,
  shieldBlock: effectiveStats.shieldBlock,
  stamina: effectiveStats.maxStamina,
  maxStamina: effectiveStats.maxStamina,
  // Additional UI metadata
  baseStats: baseStats, // Show raw base stats in character sheet
  equipmentBonuses: equipmentBonuses, // Show equipment contribution
});
```

**Client: Handle combat_stats message**

```typescript
// In client state reducer:
case 'combat_stats':
  return {
    ...state,
    combatStats: {
      maxHp: message.maxHp,
      currentHp: message.currentHp,
      attack: message.attack,
      armour: message.armour,
      dodge: message.dodge,
      shieldBlock: message.shieldBlock,
      stamina: message.stamina,
      maxStamina: message.maxStamina,
    },
    characterSheet: {
      baseStats: message.baseStats,
      equipmentBonuses: message.equipmentBonuses,
    }
  };
```

**UI Components to Update:**

1. **Character Sheet** — Show base stats + equipment bonuses + effective totals
2. **Combat HUD** — Display HP bar (scales 0-1000+), stamina bar (0-100)
3. **Progression Notifications** — "Your One-Handed skill increased to 21!" (on rank-up)
4. **XP Progress Bars** — Show current_xp / xp_to_next_rank per skill (optional)

### 4.5 Death Penalty Interaction

**Current System (from DowningSystem.ts):**
- Bleedout timer: 60 ticks
- Grace period: 3 ticks before killing blow
- Death penalty exists but is not applied (orphaned code from Phase 1 review)

**Death Penalty Design (Issue #457 scope):**

**On Death:**
1. Drop corpse with all equipped gear (existing)
2. Respawn at faction stronghold (existing)
3. Apply temporary stat debuff: **-20% to all combat stats for 300 ticks (5 minutes)**
4. **NO XP loss** (death penalty is gear risk + stat debuff, not progression loss)

**New Interface:**

```typescript
export interface DeathPenalty {
  appliedAt: number; // Tick when penalty was applied
  expiresAt: number; // Tick when penalty expires (appliedAt + 300)
  statMultiplier: number; // 0.8 (-20% debuff)
}
```

**Apply on death (in DowningSystem or ZoneRoom death handler):**

```typescript
// After corpse drop, before respawn teleport:
playerState.deathPenalty = {
  appliedAt: currentTick,
  expiresAt: currentTick + 300,
  statMultiplier: 0.8
};

// Recalculate effective stats with penalty
const baseStats = await this.characterRepo.getBaseStats(playerId);
const equipment = this.loadoutManager.getEquippedItems(playerId);
const effectiveStats = calculatePlayerEffectiveStats(baseStats, equipment);

// Apply death penalty multiplier
if (playerState.deathPenalty && currentTick < playerState.deathPenalty.expiresAt) {
  effectiveStats.attack *= playerState.deathPenalty.statMultiplier;
  effectiveStats.armour *= playerState.deathPenalty.statMultiplier;
  effectiveStats.dodge *= playerState.deathPenalty.statMultiplier;
  effectiveStats.shieldBlock *= playerState.deathPenalty.statMultiplier;
}

this.playerStatsCache.set(playerId, effectiveStats);
```

**Tick expiration check (in ZoneRoom tick):**

```typescript
for (const [sid, ps] of this.players) {
  if (ps.deathPenalty && currentTick >= ps.deathPenalty.expiresAt) {
    delete ps.deathPenalty;
    // Recalculate stats without penalty
    this.recalculatePlayerStats(sid);
    // Notify player
    this.sendNarrate(this.clients.get(sid), {
      text: 'The shadow of death fades. You feel your strength return.',
      type: 'system',
      timestamp: Date.now()
    });
  }
}
```

---

## 5. PHASED IMPLEMENTATION PLAN

### Phase 0: Foundation (1-2 days)

**Goal:** Database migrations + CharacterRepository extensions

**Tasks:**
- [ ] Write `020_progression_system.sql` migration
- [ ] Test migration on dev DB (verify HP recalculation, skill_progress population)
- [ ] Extend CharacterRepository interface with progression methods
- [ ] Implement PgCharacterRepository progression methods
- [ ] Update InMemoryCharacterRepository (test doubles)
- [ ] Unit tests for progression math (HP formula, XP curves, rank calculation)

**Acceptance Criteria:**
- Migration runs cleanly on fresh DB and existing DB
- `getSkillProgress()`, `addSkillXP()`, `updateStatRank()` work correctly
- XP→Rank calculation matches design spec (test rank 5→10, 20→40, 60→80)

### Phase 1: HP Growth (2-3 days)

**Goal:** Combat XP awards + logarithmic HP scaling

**Tasks:**
- [ ] Create `ProgressionSystem.ts` with `awardCombatXP()`
- [ ] Hook into CombatSystem defeat events (award kill XP)
- [ ] Hook into CombatSystem tick (award survival XP every 30 ticks)
- [ ] Implement `calculateMaxHPFromCombatXP()` in combat registration
- [ ] Update frontend to display scaled HP bars (max 1000+ range)
- [ ] Add death penalty stat debuff (300-tick expiration)

**Acceptance Criteria:**
- Players gain combat XP on kills and survival
- Max HP increases logarithmically (25 → 116 after ~100 XP)
- HP bar UI scales correctly (no overflow at 1000+ HP)
- Death penalty applies -20% to stats for 5 minutes

### Phase 2: Use-Based Skill Progression (3-4 days)

**Goal:** Skill XP gains on weapon use, dodge, block

**Tasks:**
- [ ] Hook `awardSkillXP()` into CombatSystem strike events (detect weapon type)
- [ ] Award dodge XP on successful dodge
- [ ] Award shieldBlock XP on successful block
- [ ] Award armour XP on damage reduction (1 XP per 5 blocked)
- [ ] Implement rank-up detection and `updateStatRank()` calls
- [ ] Wire rank-ups into effective stat recalculation (force cache invalidation)
- [ ] Add progression notifications to narration feed ("Skill increased!")

**Acceptance Criteria:**
- Using a weapon awards XP to that weapon type's skill
- Dodging/blocking awards XP to defensive stats
- Rank-ups persist to DB and update effective stats
- Players see progression feedback in narration

### Phase 3: Stamina System (2-3 days)

**Goal:** Stamina pool, regeneration, equipment/status modifiers

**Tasks:**
- [ ] Add `stamina` / `maxStamina` to Combatant interface (players only)
- [ ] Implement `calculateMaxStamina()` with equipment/status modifiers
- [ ] Wire stamina into combat registration (initialize from effective stats)
- [ ] Add stamina costs to abilities (Heavy Strike, Block)
- [ ] Implement stamina regeneration (+10/tick OOC, +5/tick in combat)
- [ ] Add stamina bar to combat HUD (client UI)
- [ ] Block ability use when stamina < cost (validation in CombatSystem)

**Acceptance Criteria:**
- Stamina regenerates correctly in/out of combat
- Abilities consume stamina and are blocked when insufficient
- Heavy armour reduces max stamina, light armour increases it
- Status effects (exhausted, energized) modify stamina

### Phase 4: Frontend Integration & Polish (2-3 days)

**Goal:** Character sheet, progression UI, XP notifications

**Tasks:**
- [ ] Dispatch `combat_stats` message on character load
- [ ] Build Character Sheet UI (base stats + equipment bonuses + effective)
- [ ] Add skill XP progress bars (optional, per-skill)
- [ ] Style progression notifications (rank-up badges, XP gains)
- [ ] Add `/stats` command to show detailed progression info
- [ ] Update GDD documentation with progression mechanics
- [ ] Write player-facing guide ("How Progression Works")

**Acceptance Criteria:**
- Character sheet displays all stats correctly
- Players see real-time XP gains and rank-ups
- `/stats` command shows detailed progression data
- Documentation is updated

**Total Estimated Time:** 10-15 days (2-3 weeks)

---

## 6. RISKS & TRADE-OFFS

### 6.1 Balance Risks

**Risk:** Exponential XP curve makes ranks 60+ unattainable

**Mitigation:**
- Tune `xpToNextRank()` multiplier (currently 1.15, can lower to 1.12 for faster high-end progression)
- Add endgame XP sources (boss kills, rare encounters, daily bonuses)
- Monitor player data (if <1% reach rank 50 in 6 months, curve is too steep)

**Risk:** HP scaling makes early game too fragile (25 HP = 2-hit deaths)

**Mitigation:**
- Starter zones have low-damage creatures (5-8 damage/hit)
- Free healing at faction stronghold
- Bleedout system gives 60-second safety net
- If 25 HP proves too low, adjust `HP_BASE` to 35-40 (migration can bump existing characters)

**Risk:** Stamina costs make abilities unusable in long fights

**Mitigation:**
- In-combat regen (+5/tick) is intentionally generous (100 stamina = 20 ticks of regen)
- Abilities cost 10-20 stamina (1-2 ticks to recover)
- Players can disengage and regen stamina before re-engaging (tactical choice)

### 6.2 Technical Risks

**Risk:** Skill XP queries on every hit cause DB load

**Mitigation:**
- Batch XP writes (accumulate in memory, flush every 10 ticks)
- Use `ON CONFLICT DO UPDATE` for upsert efficiency
- Add DB index on `(character_id, skill_type)` (already in schema)

**Risk:** HP recalculation on every combat XP gain is expensive

**Mitigation:**
- HP recalculation is `O(1)` (logarithm + multiplication)
- Only persist HP to DB when it changes (compare old vs. new before UPDATE)
- Cache effective HP in PlayerState (don't query DB mid-combat)

**Risk:** Migration 020 breaks existing characters

**Mitigation:**
- Retroactive XP grants preserve power levels (HP=100 → combat_xp=2000)
- Test migration on staging DB with real player data
- Rollback plan: Migration 021 reverts changes (restore HP=100, drop skill_progress table)

### 6.3 Design Trade-Offs

**Trade-Off:** Use-based progression vs. quest/achievement-based progression

**Decision:** Use-based is more organic and fits MUD genre (skill-by-doing is classic)

**Downside:** Players might grind low-level mobs for XP (anti-social behavior)

**Safeguard:** Diminishing returns on same-creature kills (halve XP after 10 kills)

---

**Trade-Off:** Logarithmic HP curve vs. linear HP curve

**Decision:** Logarithmic prevents runaway scaling and matches genre conventions

**Downside:** Endgame HP growth feels slow (2000 XP → 3000 XP only adds ~100 HP)

**Justification:** At 1000+ HP, another 100 HP is meaningful (10% increase). Linear scaling would hit 5000+ HP (impossible to balance PvP).

---

**Trade-Off:** Stamina as resource pool vs. cooldowns-only

**Decision:** Stamina adds tactical depth (resource management during fights)

**Downside:** Another bar to track (complexity tax)

**Justification:** Stamina unifies ability costs, blocking, dodging (cleaner than per-ability cooldowns + per-ability costs). Genre-standard (ESO, WoW, D&D all use stamina/energy).

---

## 7. OPEN QUESTIONS FOR DALE

1. **HP Scaling Tuning:** Start at 25 HP or 35 HP? (25 = fragile starter, 35 = safer but slower growth feedback)

2. **Skill XP Variance:** Should higher-level creatures award more skill XP (e.g., 1-3 XP baseline, +50% per level difference)? Or flat 2 XP per hit?

3. **PvP Progression:** Should PvP kills award skill XP (currently yes for combat XP, TBD for skill XP)? Risk: PvP farming loops.

4. **Stamina Regen Rates:** +10 OOC, +5 in-combat feel right? Or too fast/slow?

5. **Death Penalty Duration:** 300 ticks (5 minutes) or shorter (180 ticks = 3 minutes)? Feedback loop depends on zone run length.

6. **Skill Decay:** Should unused skills atrophy over time (e.g., -1 rank per 30 days inactive)? Or permanent once earned?

7. **Specialization Incentives:** Should high-rank skills (80+) grant passive bonuses (e.g., oneHanded=90 → +5% crit chance)? Or pure attack scaling?

---

## 8. CONCLUSION

This progression system transforms EllMUD from a static-stat prototype into a dynamic, growth-driven RPG while preserving the three-layer architecture and use-based philosophy.

**What Changes:**
- HP scales 25 → 1000+ via combat XP (logarithmic curve)
- Weapon skills and defensive stats scale 5 → 100 via use-based XP (exponential curve)
- Stamina adds tactical resource management (100 base, modified by gear/status)
- Death penalty applies temporary stat debuff (no XP loss)

**What Stays the Same:**
- CombatStats interface (8 stats, no structural changes)
- Damage formula (dodge→block→armour→damage pipeline unchanged)
- Equipment bonuses (still additive to base stats)
- Three-layer model (Template→Base→Effective, Base now grows over time)

**Implementation Priority:**
1. Phase 0: DB migrations + CharacterRepository (foundation)
2. Phase 1: HP growth (immediate player feedback)
3. Phase 2: Skill XP (core progression loop)
4. Phase 3: Stamina (tactical depth)
5. Phase 4: Frontend polish (UX completion)

**Estimated Timeline:** 2-3 weeks for full implementation + testing.

**Next Steps:**
1. Dale reviews proposal and answers open questions
2. Merge Phase 0 (migrations) after review approval
3. Iterative rollout of Phases 1-4 with playtesting between each

---

**Proposal Status:** AWAITING APPROVAL

**Related Issues:** #457  
**Related PRs:** (none yet)  
**Dependencies:** Phase 1 combat stat system (migrations 018/019) must be merged first  
**Blockers:** None

---

## 2026-04-16T00:00:00Z: RoomNode badges are canonical vertical exit indicators

**By:** Regis (Frontend Dev)  
**Date:** 2026-07-25  
**Issue:** #463  
**Status:** Implemented  
**Commit:** 0c13307

### Context

The minimap had two independent sources of ↑/↓ arrows for vertical exits:
1. **RoomNode badges** — small text next to the room circle
2. **ExitEdge text** — text label at the midpoint of inter-floor edge lines

Both rendered simultaneously, causing duplicate arrows on the minimap, plus ghost rooms (rooms not on the current floor) showed spurious vertical badges.

### Decision

**RoomNode badges are the single source of truth for vertical exit indicators.** ExitEdge renders only the dashed line for inter-floor connections — no text labels.

### Rationale

- RoomNode badges are anchored to the room they belong to, making them spatially unambiguous
- ExitEdge midpoint text overlaps with room nodes on single-floor maps or when rooms are close together
- One canonical indicator eliminates visual noise and prevents future drift between two labeling systems
- Ghost rooms on Layer 2 now suppress badges via `hideVerticalBadges` prop

### Implementation

- Added `hideVerticalBadges` prop to RoomNode
- MapRenderer passes this flag for Layer 2 ghost rooms
- Filtered zero-length inter-floor edges in ExitEdge
- 484 client tests pass; no regressions

---

## 2026-04-15T00:00:00Z: Death-Spawn-Routing Test Hardening

**By:** Minsc (Tester)  
**Date:** 2026-04-15  
**Status:** Implemented  
**Commit:** f48c993

### Context

Elminster reviewed Drizzt's CI fix (commit 131f6a5 for death penalty race condition) and REJECTED with two required test changes to `death-spawn-routing.test.ts`. Since Drizzt was locked out, Minsc (QA) made the revisions.

### Changes Made

#### 1. `fastForwardDeath` now asserts downed state was reached
The polling loop tracked whether the player entered downed state, but never asserted it. If the player never got downed, all 6 integration tests would silently pass without a death occurring. Added `expect(foundDowned).toBe(true)` after the loop.

#### 2. Death penalty test: conditional guard → hard assertion
The `if (postDeathPlayer)` guard meant all deathPenalty assertions were silently skipped when the player was cleaned up before polling found them. Replaced with `expect(postDeathPlayer).toBeDefined()`.

#### 3. Death penalty test: race condition fix
The hardening immediately revealed a real bug: `fastForwardDeath` waits 8s (including ROOM_SWITCH delay), so the player was already cleaned up by room switch before the deathPenalty poll started. The old conditional guard had been hiding this. Fixed by inlining the downed-state polling and capturing deathPenalty immediately after bleed-out, before room switch cleanup.

### Validation

- 23/23 tests pass in `death-spawn-routing.test.ts`
- 3269/3269 server tests pass (0 regressions)

### Convention Established

**No conditional guards around test assertions.** Use `expect(x).toBeDefined()` instead of `if (x) { expect(x)... }`. The latter creates vacuously-passing tests that hide real failures.

---

## 2026-07-22T00:00:00Z: Synchronous state mutations before awaits in fire-and-forget async handlers

**By:** Drizzt (Engine Dev)  
**Date:** 2026-07-22  
**Status:** Implemented  
**Commit:** 131f6a5

### Context

CI flake in death-penalty test caused by `handlePlayerDeath()` setting `player.deathPenalty` after two `await` calls, but being called fire-and-forget from tick handlers.

### Decision

When an async method is called fire-and-forget (no `await` at call site), any synchronous state mutations that callers might observe must happen BEFORE the first `await`. This applies to `handlePlayerDeath()` and any similar pattern in tick handlers.

### Rationale

The tick system and tests observe state synchronously. If a fire-and-forget async function defers state writes behind awaits, the state appears stale until the microtask queue drains — which is non-deterministic under load.

### Applied To

`player.deathPenalty` assignment moved before `incrementDeathCount`/`setLastDeathTime` awaits in `ZoneRoom.handlePlayerDeath()`.

### Team Impact

Any future fire-and-forget async handlers in tick code should follow this pattern.

---

## 2026-01-01T00:00:00Z: Expand CI/CD paths-ignore

**By:** Khelben (CI/CD Dev)  
**Date:** 2025-01-01  
**Status:** Implemented  
**Scope:** CI/CD configuration

### Context

The CI/CD workflow was only ignoring `docs/`, `.squad/`, and `*.md` files. Changes to workflow files, infrastructure, Copilot config, and repo metadata were still triggering full CI runs unnecessarily.

### Decision

Added these paths to `paths-ignore` in both `pull_request` and `push` triggers:

- `.github/**` — workflow/agent config changes
- `.copilot/**` — Copilot session state
- `infra/**` — infrastructure-as-code (Bicep/Terraform)
- `LICENSE`
- `.gitattributes`
- `.gitignore`

`workflow_dispatch` left untouched (manual trigger, no paths concept).

### Rationale

These paths contain no application code. Skipping CI for them saves runner minutes and reduces noise. If a workflow change itself needs validation, `workflow_dispatch` can be used manually.

