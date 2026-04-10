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

## 2026-01-19: Sandbox Combat Log Captures via ZoneRoom Tick Interception

**By:** Drizzt (Engine Dev)  
**Scope:** Combat Sandbox Phase 2  

**Decision:** Phase 2 sandbox `log` command captures combat events by intercepting TickResult in ZoneRoom's update loop. After `resolveTick()` returns, we call `recordSandboxCombatEvents(tickResult, tick)` only when `hasSandboxCombat` is true.

**Why:**
- Requires zero changes to CombatSystem's core resolution logic
- Scopes logging to sandbox rooms only (no overhead in production combat)
- Uses a module-level ring buffer (max 100 entries, FIFO) in sandbox.ts

**Implications:**
- Stat override tracking uses module-level Maps — works because sandbox is single-instance per zone server
- `_resetSandboxState()` exported for test cleanup between test cases
- If CombatSystem ever changes its TickResult shape, the log capture will need updating (but it only reads `events[].type/actorName/targetName/damage/dodged` — stable fields)

---

## 2026-01-19: Sandbox Scenario Persistence — File-Based JSON

**By:** Drizzt (Engine Dev)  
**Scope:** Combat Sandbox Phase 3  

**Decision:** Scenario save/load uses JSON files on disk at `packages/server/data/sandbox-scenarios/`. The `CommandContext` interface gained a `scenarioDir?: string` override so tests can use isolated temp dirs.

**Schema:** Each scenario stores one entry per creature instance (not grouped by type) with optional per-creature stat overrides. Top-level `seed` field stores the PRNG seed, `overrides` aggregates all entity overrides, `playerOverrides` stores player-specific overrides.

**Key Choices:**
- **Per-instance creature entries** rather than grouped-by-type — enables individual override tracking and simpler round-trip fidelity
- **`handleSet` now matches creature IDs** alongside name/type partial matching — needed for programmatic targeting
- **Load registers overridden creatures as combatants** via `creatureManager.toCombatant()` so stat overrides are immediately visible in the combat system
- **`.gitignore` excludes `*.json` in the scenario dir** but tracks `.gitkeep` — user scenarios don't pollute version control

**Impact:**
- `CommandContext` interface in `commands/index.ts` has a new optional field `scenarioDir`
- No changes to CreatureManager, CombatSystem, or any production hot path
- 82 sandbox tests passing (all Phase 1 + 2 + 3)

---

## 2026-01-20: featureHandlers Multi-Room Type Support

**By:** Drizzt (Engine Dev)  
**Scope:** Combat Sandbox Phase 1  

**Decision:** Extended the `featureHandlers` map in `commands/index.ts` to support `requiredRoomType: string | string[]`.

The gate logic now normalizes to an array and uses `includes()`:
```typescript
const allowed = Array.isArray(featureCmd.requiredRoomType)
  ? featureCmd.requiredRoomType
  : [featureCmd.requiredRoomType];
if (!allowed.includes(ctx.room.type as string)) { ... }
```

**Rationale:** The sandbox command must work in all 3 sandbox room types (`feature_sandbox`, `feature_sandbox_arena`, `feature_sandbox_stats`). Existing feature handlers use a single string — this change is backward-compatible.

**Impact:**
- All existing `featureHandlers` entries unchanged (single string still works)
- New commands can now gate to multiple room types without registering duplicate entries
- 2213 tests pass, zero regressions

---

## 2026-04-07T15:15:52Z: Sandbox Architecture — Shared CombatSystem

**By:** dkirby-ms (via Copilot)  
**Scope:** Combat Sandbox Architecture  

**Decision:** Sandbox uses the zone's existing CombatSystem instance (not a separate isolated instance).

**Why:** Avoids divergence between sandbox and real combat resolution.

**Layout:** 3 rooms — sandbox-lobby (feature_sandbox), sandbox-arena (feature_sandbox_arena), sandbox-stats-lab (feature_sandbox_stats). Connected north from training-grounds. Can expand later.

**Rationale:** User decision resolving the Elminster/Drizzt architecture split and Elminster/Laeral room layout split.

---

## 2026-04-13: Smooth Step (Right-Angle) Edge Connectors for Zone Designer

**By:** Regis (Frontend Dev)  
**Scope:** Zone Designer UI — Edge Rendering

**Decision:** Migrated from Bézier curves to smooth step (right-angle) connectors in `ZoneExitEdge.tsx`.

**Implementation:**
- Replaced `getBezierPath` with `getSmoothStepPath`
- Added `borderRadius: 8` for rounded corners (not harsh 90° angles)
- Added `offset: 20` for padding from nodes
- Updated test mocks and documentation

**Why:**
1. **Semantic correctness:** Movement in the MUD is orthogonal (N/S/E/W/U/D). Right-angle connectors visually match this.
2. **Layout tolerance:** Smooth step paths forgive minor position drift from BFS collisions.
3. **Visual consistency:** Direction gradients, arrowheads, and modifiers preserved.
4. **Cleaner visuals:** Eliminates dramatic arcs while maintaining clear directional flow.

**Context:** BFS layout places rooms on a 2D grid. When the ideal cell is occupied, `findNearestDirectional()` searches for alternatives. This can cause edge misalignment (e.g., an edge from A's west handle to B's east handle). Smooth step paths accommodate these inherent placement trade-offs gracefully.

**Impact:**
- User experience: Clearer, more predictable edge routing
- Code: Minimal change (2-line update + test mocks)
- Performance: No impact
- Tests: All 25 edge tests passing with updated mock

**Files Modified:**
- `packages/client/src/components/map/ZoneExitEdge.tsx`
- `packages/client/src/__tests__/zone-exit-edge.test.tsx`


---

## 2026-04-17: Cardinal Alignment v3 — Group-Aware Cascade + Chain Push

**By:** Regis (Frontend Dev)  
**Commit:** 117e679  
**Scope:** Map Layout — Phase 5c Alignment

**Context:**
Phase 5c cardinal alignment in `computeLayout.ts` had a cascade guard (v2, commit b82ce8e) that was too conservative. It prevented alignment of main-street ↔ inside-the-west-gate-of-midgaard because wall-road-2 (in the poor-alley E/W group) was anchored at its group's majority coordinate. The `layoutScore` rollback also rejected valid alignment shifts (score 214→394 for a 19-room cascade).

**Decision:**
Replaced the fragile cascade guard + layoutScore rollback with three general-purpose mechanisms:

1. **Group-aware cascade:** When the perpendicular BFS encounters a room in another multi-room alignment group, pull in the ENTIRE group — not just that one room. This preserves their internal E/W (or N/S) alignment during the shift.

2. **Chain-push collision resolution:** Instead of `findNearestUnoccupied` (which displaces rooms sideways, breaking other alignments), push colliding rooms 1 step further in the shift direction (domino style). This preserves relative ordering along the perpendicular axis.

3. **Alignment-specific acceptance:** Use total misaligned-pair count across ALL groups as the acceptance criterion, instead of `layoutScore`. The alignment pass should prioritize cardinal alignment over distance minimization.

**Impact:**
- All E/W-connected room pairs now share the same y-coordinate
- All N/S-connected room pairs now share the same x-coordinate
- No zone-specific logic, no hardcoded room slugs
- 27 computeLayout tests + 13 elk-layout tests pass
- Midgaard test now asserts full corridor alignment (9 rooms including both gate pairs)
- No API or server changes required
- The alignment pass moves up to ~20 rooms per iteration but converges in 1-2 passes
- Future zones with similar topology (parallel E/W corridors connected by N/S chains) should work correctly without additional fixes

**Files Modified:**
- `packages/client/src/map/computeLayout.ts`
- `packages/client/src/map/__tests__/computeLayout.test.ts`

---

## 2026-04-17: Edge Crossing Elimination — Phase 5d

**By:** Regis (Frontend Dev)  
**Commit:** 2495643  
**Scope:** Map Layout — Phase 5d Crossing Detection

**Context:**
The BFS layout engine could produce layouts where two edge lines visually cross over each other (e.g., a horizontal A→B edge crossing a vertical C→D edge at a grid point that has no room). This made the map confusing — players saw intersecting lines and assumed a room existed there.

**Decision:**
Added **Phase 5d** to the layout refinement pipeline in `computeLayout.ts`, positioned after cardinal alignment (5c) and before occlusion fix (6).

**Algorithm:**
- **Detection:** Build all orthogonal edge segments per z-level (skip diagonals, skip distance-1 edges); test all segment pairs for intersection at strictly interior points (excluding shared endpoints)
- **Resolution:** For each crossing pair, try moving each of the four endpoint rooms (fewest-exits first) to a nearby free cell within CROSSING_CANDIDATE_RADIUS=6
- **Acceptance:** Crossing decreases AND move passes all guards: no diagonals, no direction mismatches, no alignment breaks
- **Iteration:** Up to CROSSING_FIX_PASSES=30 times, recomputing segments each pass

**Constraints Preserved:**
- Cardinal alignment (E/W same y, N/S same x) — guarded by `moveWouldBreakAlignment()`
- Direction semantics — guarded by `moveWouldIncreaseMismatches()`
- No diagonals — explicit check against all neighbors
- No collisions — occupied-set check

**Impact:**
- No regressions: All 28 layout tests + 13 ELK tests pass, including Midgaard
- New test (Test 28): Constructs a topology with guaranteed crossing and verifies it's eliminated
- Performance: O(E² × passes) per z-level, negligible for zones <200 rooms

**Files Modified:**
- `packages/client/src/map/computeLayout.ts`
- `packages/client/src/map/__tests__/computeLayout.test.ts`

---

## 2026-04-08: Include roomGraphRooms in zone detail response

**By:** Drizzt (Engine Dev)  
**Commit:** e3d506b  
**Scope:** Admin — Room Graph Display Fix

**Context:**

The admin Room Graph tab was unable to display spawned creatures because it depended on a separate zone-data API call (`GET /admin/api/zones/:slug`) to determine the room list. For procedural zones that have no `zoneSlug`, this fetch always returned null, causing the `roomOccupancy` useMemo to short-circuit with an empty map — silently hiding all creature occupancy.

The previous fix (commit `a82cf3d`) addressed three surface symptoms (fire-and-forget `loadRoom`, invalid room ID validation, hardcoded zone name) but did not fix the root cause.

**Decision:**

Include the live room graph rooms in the `getZoneDetail()` response as a new `roomGraphRooms[]` field. The client now uses this authoritative room list as a fallback when zone data is unavailable.

**Rationale:**

- The server already has the room graph — duplicating the fetch on the client creates an unnecessary failure point.
- This fixes both procedural zones (no `zoneSlug`) and any scenario where the zone API fetch fails.
- The room graph is the source of truth for creature placement (spawn validates against it), so using it for display ensures consistency.

**Trade-offs:**

- Slightly larger room detail response (adds room id/name/type per room).
- When full zone data IS available, it's still preferred for richer metadata (properties, NPCs, loot containers).

**Impact:**

- 3 new tests added
- 2388 total tests pass
- No regressions
- Fixes procedural zone creature display

---

## Recent Decisions (2026-04-09)

# Architecture Proposal: Optional User Flags (#365)

**Author:** Elminster (Lead/Architect)  
**Date:** 2026-04-10  
**Ticket:** [#365](https://github.com/dkirby-ms/ellmud/issues/365) — Optional User Flags  
**Related:** [#366](https://github.com/dkirby-ms/ellmud/issues/366) — Who List (depends on this design)

---

## Executive Summary

Players need a way to signal intent and control information visibility. This proposal introduces **optional user flags** (toggles for [Anon], [RP], and future extensibility) stored as JSONB in a per-player `character_flags` table, with real-time toggle commands and server-authoritative visibility enforcement. Flags are visual indicators that appear next to player names in the who list and lookups, respecting the [Anon] flag's same-room exception.

**Key Design Principle:** Server decides what to send. Clients display only what the server permits.

---

## 1. Data Model

### 1.1 New Table: `character_flags`

Create a new table to store per-character flags (not per-player, since a player may have multiple active characters).

```sql
-- 009_character_flags.sql

CREATE TABLE character_flags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id    UUID NOT NULL UNIQUE REFERENCES characters(id) ON DELETE CASCADE,
  flags           JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_character_flags_character ON character_flags(character_id);
```

**Rationale:**
- **Uniqueness per character** — Each character has exactly one flag row (UNIQUE constraint).
- **JSONB storage** — Allows adding new flags in Phase 2 without schema migration. Queries like `WHERE flags->'anon' = 'true'` work natively.
- **ON DELETE CASCADE** — When a character is deleted, its flags disappear.
- **Index on character_id** — Fast lookup by character during gameplay (e.g., who command, look handler).

### 1.2 Flag Values

Flags stored as boolean toggles:

```json
{
  "anon": false,
  "rp": false
}
```

- **anon** (boolean) — When true, player's level, class, and username are hidden from other players unless they're in the same room.
- **rp** (boolean) — When true, visual indicator "[RP]" appears next to player's name in who list and lookups (signals they are engaged in roleplay).

Both default to `false` (no flags active).

**Future extensibility:** New flags can be added without altering the schema (e.g., `"pvp-enabled": true`, `"afk": true`). Code gates determine which flags are displayed in the who list.

---

## 2. Flag Definitions & Extensibility

### 2.1 Flag Registry (Code-Based)

Define flags in TypeScript, shared between client and server:

**File:** `packages/shared/src/types/flags.ts`

```typescript
export interface CharacterFlags {
  anon?: boolean;      // Hide username, level, class from non-roommates
  rp?: boolean;        // Visual roleplay indicator
}

export const FLAG_DEFINITIONS = {
  anon: {
    name: 'Anonymous',
    description: 'Hide your identity from others outside your room',
    toggleable: true,
  },
  rp: {
    name: 'Roleplaying',
    description: 'Indicate that you are engaged in roleplay',
    toggleable: true,
  },
} as const;

export type FlagKey = keyof typeof FLAG_DEFINITIONS;
```

**Rationale:**
- **Centralized definition** — Shared TypeScript enum prevents client/server desync.
- **Extensibility** — Adding a new flag is one addition to `FLAG_DEFINITIONS`; no migration needed (JSONB is forward-compatible).
- **Metadata** — `toggleable: true` future-proofs for read-only flags (e.g., `"banned": true`, controlled by admin, not player).

### 2.2 Default Flags

When a character is created or flags are missing:

```typescript
const defaultFlags: CharacterFlags = {
  anon: false,
  rp: false,
};
```

**Handling missing flags:** If a character has no flag row, treat all flags as false (no special behavior). Queries should use `COALESCE` or a repository pattern to provide defaults.

---

## 3. Toggle Mechanism

### 3.1 In-Game Command: `/flag`

Players toggle flags via a simple command:

```
/flag anon        → Toggle [Anon] flag (on/off)
/flag rp          → Toggle [RP] flag (on/off)
/flag status      → Show current flag status
/flag help        → Show flag help
```

**Command Handler:** `packages/server/src/commands/handlers/flag.ts`

```typescript
export function handleFlag(ctx: CommandContext): CommandResult {
  const [subcommand, ...args] = ctx.args;

  if (!subcommand) {
    return showFlagStatus(ctx);
  }

  const lowerSubcommand = subcommand.toLowerCase();

  if (lowerSubcommand === 'help') {
    return showFlagHelp();
  }

  if (lowerSubcommand === 'status') {
    return showFlagStatus(ctx);
  }

  // Toggle: /flag anon, /flag rp
  const flagKey = lowerSubcommand as FlagKey;
  if (!FLAG_DEFINITIONS[flagKey]) {
    return {
      narrations: [{
        text: `Unknown flag: ${flagKey}. Use /flag help for options.`,
        type: 'system',
      }],
    };
  }

  // Update flag via repository, return confirmation
  return toggleFlag(ctx, flagKey);
}
```

**Flow:**
1. Parse command arguments.
2. Validate flag name against `FLAG_DEFINITIONS`.
3. Call `CharacterFlagsRepository.toggleFlag(characterId, flagKey)`.
4. Return confirmation narration: "Anonymous mode: **ON**" / "Anonymous mode: **OFF**".

### 3.2 Settings Modal (Future — Phase 2)

The Settings modal (from #359) can be extended to include a flag toggle section. This is out of scope for Phase 1 but mentioned for completeness.

---

## 4. Server-Authoritative Visibility Rules

### 4.1 Anon Flag Behavior

When a player **viewing** runs `who` or `look` to inspect another player:

| Viewer Context | Target Flag | Data Sent |
|---|---|---|
| Same room | anon=true | Full info (username, level, class, flags) |
| Different room | anon=true | Generic description (e.g., "A figure in merchant garb") |
| Different room | anon=false | Full info |
| Admin (role='admin') | any | Full info (admins always see truth) |

**Rationale:**
- **[Anon] is mutual** — Hiding doesn't prevent targeting/combat (skill-based), just information.
- **Same room sees all** — Proximity breaks anonymity (prevents abuse like "I'm anon so you can't attack me").
- **Admin override** — Staff need to see all info for moderation.

### 4.2 RP Flag Behavior

When displaying player info (who list, look):

- If `rp=true`, append **[RP]** badge next to player name.
- Example: "Gandalf [RP]" appears in who list.
- **No visibility restrictions** — RP is always visible to everyone (unlike [Anon]). It's a courtesy signal, not a mask.

### 4.3 Implementation Points

These visibility rules are enforced **on the server** when constructing player data for responses:

#### **In `handleWho` (new command for #366):**
```typescript
function buildWhoResponse(viewer: PlayerState): CommandResult {
  const allOnlinePlayers = /* fetch from zone state */;
  
  const whoList = allOnlinePlayers.map(target => {
    const flags = getCharacterFlags(target.characterId);
    const sameRoom = viewer.currentRoomId === target.currentRoomId;
    
    if (flags.anon && !sameRoom) {
      // Hide username, level, class
      return { name: "A mysterious figure", level: "?", class: "?", flags: [] };
    }
    
    // Full info (same room or not flagged anon)
    return {
      name: target.username,
      level: target.level,
      class: target.class,
      flags: buildFlagBadges(flags), // ["[RP]"] if rp=true, etc.
    };
  });
  
  return { narrations: [{ text: formatWhoList(whoList), type: 'system' }] };
}
```

#### **In `handleLook` (examining a player):**
When a player uses `look <player-name>`, apply the same rules:
- If target has anon=true and not in same room, return generic description.
- Otherwise, return full info with flag badges.

#### **In `AwarenessSystem` (existing stealth detection):**
- No changes needed. Awareness still uses equipment-based descriptions (never reveals names).
- Flags are orthogonal to awareness; they apply *after* detection tier is calculated.

---

## 5. Data Layer: CharacterFlagsRepository

### 5.1 Repository Interface

**File:** `packages/server/src/character/CharacterFlagsRepository.ts`

```typescript
export interface CharacterFlagsRepository {
  getFlags(characterId: string): Promise<CharacterFlags>;
  setFlags(characterId: string, flags: CharacterFlags): Promise<void>;
  toggleFlag(characterId: string, flagKey: FlagKey): Promise<boolean>;
}

export class PostgresCharacterFlagsRepository implements CharacterFlagsRepository {
  async getFlags(characterId: string): Promise<CharacterFlags> {
    const row = await pool.query(
      `SELECT flags FROM character_flags WHERE character_id = $1`,
      [characterId],
    );
    return row.rows[0]?.flags ?? {};
  }

  async setFlags(characterId: string, flags: CharacterFlags): Promise<void> {
    await pool.query(
      `INSERT INTO character_flags (character_id, flags) VALUES ($1, $2)
       ON CONFLICT (character_id) DO UPDATE SET flags = $2, updated_at = now()`,
      [characterId, flags],
    );
  }

  async toggleFlag(characterId: string, flagKey: FlagKey): Promise<boolean> {
    const currentFlags = await this.getFlags(characterId);
    const newValue = !currentFlags[flagKey];
    currentFlags[flagKey] = newValue;
    await this.setFlags(characterId, currentFlags);
    return newValue;
  }
}

export class InMemoryCharacterFlagsRepository implements CharacterFlagsRepository {
  private store = new Map<string, CharacterFlags>();

  async getFlags(characterId: string): Promise<CharacterFlags> {
    return this.store.get(characterId) ?? {};
  }

  async setFlags(characterId: string, flags: CharacterFlags): Promise<void> {
    this.store.set(characterId, flags);
  }

  async toggleFlag(characterId: string, flagKey: FlagKey): Promise<boolean> {
    const current = this.store.get(characterId) ?? {};
    const newValue = !current[flagKey];
    current[flagKey] = newValue;
    this.store.set(characterId, current);
    return newValue;
  }
}
```

**Rationale:**
- **Provider pattern** — Decouples business logic from storage. Tests use InMemory, production uses Postgres.
- **ON CONFLICT** — Handles missing flag rows gracefully (insert if missing, update if exists).
- **Returns new value** — Toggle returns the new state, allowing handlers to confirm "flag is now ON".

### 5.2 Factory & Dependency Injection

**File:** `packages/server/src/character/index.ts`

```typescript
let flagsRepository: CharacterFlagsRepository | null = null;

export function getCharacterFlagsRepository(): CharacterFlagsRepository {
  if (!flagsRepository) {
    flagsRepository = isProduction()
      ? new PostgresCharacterFlagsRepository()
      : new InMemoryCharacterFlagsRepository();
  }
  return flagsRepository;
}

export function setCharacterFlagsRepository(repo: CharacterFlagsRepository): void {
  flagsRepository = repo;
}
```

---

## 6. Command Handler Integration

### 6.1 Flag Command Handler

**File:** `packages/server/src/commands/handlers/flag.ts`

```typescript
import { getCharacterFlagsRepository } from '../character/index.js';
import { FLAG_DEFINITIONS, type FlagKey } from '@ellmud/shared';
import type { CommandResult, CommandContext } from '../index.js';

export function handleFlag(ctx: CommandContext): CommandResult {
  const [subcommand] = ctx.args;

  if (!subcommand) {
    return showFlagStatus(ctx);
  }

  const lower = subcommand.toLowerCase();

  switch (lower) {
    case 'help':
      return showFlagHelp();
    case 'status':
      return showFlagStatus(ctx);
    default: {
      const flagKey = lower as FlagKey;
      if (!FLAG_DEFINITIONS[flagKey]) {
        return {
          narrations: [{
            text: `Unknown flag "${flagKey}". Use /flag help for available flags.`,
            type: 'system',
          }],
        };
      }
      return toggleFlagHandler(ctx, flagKey);
    }
  }
}

async function toggleFlagHandler(ctx: CommandContext, flagKey: FlagKey): Promise<CommandResult> {
  const repo = getCharacterFlagsRepository();
  const characterId = ctx.playerState.characterId; // From context

  try {
    const newValue = await repo.toggleFlag(characterId, flagKey);
    const state = newValue ? 'enabled' : 'disabled';
    const flagName = FLAG_DEFINITIONS[flagKey].name;

    return {
      narrations: [{
        text: `${flagName} [${flagKey}] is now ${state}.`,
        type: 'system',
      }],
    };
  } catch (err) {
    return {
      narrations: [{
        text: 'Failed to update flag. Please try again.',
        type: 'system',
      }],
    };
  }
}

function showFlagStatus(ctx: CommandContext): CommandResult {
  // (Simplified — in real code, fetch flags asynchronously)
  return {
    narrations: [{
      text: 'Available flags: anon, rp. Use /flag <name> to toggle.',
      type: 'system',
    }],
  };
}

function showFlagHelp(): CommandResult {
  const help = `
Flags control how other players see you:
  /flag anon  — Hide username, level, class from players outside your room
  /flag rp    — Display [RP] badge next to your name (roleplay indicator)
  /flag status — Show current flag state
Use /flag <flag-name> to toggle on/off.
  `.trim();

  return {
    narrations: [{
      text: help,
      type: 'system',
    }],
  };
}
```

### 6.2 Command Registry

Add to `packages/server/src/commands/index.ts`:

```typescript
import { handleFlag } from './handlers/flag.js';

export const COMMAND_HANDLERS: Record<string, CommandHandler> = {
  // ... existing commands ...
  'flag': handleFlag,
};
```

**Aliases:** `/flag`, `/flags` (both map to the same handler).

---

## 7. Who List Integration (Issue #366)

This proposal does not implement the who list; however, the flag infrastructure must be ready for it.

**Expected who command output:**
```
Online Players:
  Gandalf [RP] (level 12, Wizard)
  A mysterious figure (level ?, ?)    [player is anon, outside your room]
  Legolas (level 10, Ranger)
  ...
```

The who handler will:
1. Iterate over all online players.
2. Call `getCharacterFlags(targetCharacterId)`.
3. Apply visibility rules (anon + same-room check).
4. Build player display name with flag badges (e.g., "Gandalf [RP]").

---

## 8. Client-Side Display (Future)

When the who list is implemented in the UI:
- Server sends `{ username, level, class, flags: ['rp'] }` or `{ username: "A mysterious figure", flags: [] }`.
- Client renders badges directly from the `flags` array.
- **No client-side logic to hide data** — Server has already made the decision.

This is a simple rendering change; no complex client-side filtering logic is needed.

---

## 9. Migration: 009_character_flags.sql

**Path:** `packages/server/src/db/migrations/009_character_flags.sql`

```sql
-- 009_character_flags.sql — Per-character flags (issue #365).
-- Stores toggleable player flags: anon (hide info), rp (roleplay indicator).
-- JSONB allows adding new flags in Phase 2 without schema migration.

CREATE TABLE character_flags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id    UUID NOT NULL UNIQUE REFERENCES characters(id) ON DELETE CASCADE,
  flags           JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_character_flags_character ON character_flags(character_id);
```

**Notes:**
- Migration 008 is `gameplay_metrics`; this follows as 009.
- No seed data needed (flags default to `{}`).
- Migration is idempotent (can re-run safely).

---

## 10. Testing Strategy

### 10.1 Unit Tests

**File:** `packages/server/src/character/__tests__/CharacterFlagsRepository.test.ts`

```typescript
describe('CharacterFlagsRepository', () => {
  it('returns default flags for missing character', async () => {
    const repo = new InMemoryCharacterFlagsRepository();
    const flags = await repo.getFlags('nonexistent');
    expect(flags).toEqual({});
  });

  it('toggles flag on and off', async () => {
    const repo = new InMemoryCharacterFlagsRepository();
    const charId = 'test-char-123';

    let result = await repo.toggleFlag(charId, 'anon');
    expect(result).toBe(true);

    result = await repo.toggleFlag(charId, 'anon');
    expect(result).toBe(false);
  });

  it('persists flags across calls', async () => {
    const repo = new InMemoryCharacterFlagsRepository();
    const charId = 'test-char-456';

    await repo.setFlags(charId, { anon: true, rp: false });
    const flags = await repo.getFlags(charId);
    expect(flags).toEqual({ anon: true, rp: false });
  });
});
```

### 10.2 Integration Tests

Test flag visibility in who/look handlers (once implemented).

### 10.3 Server-Authoritative Checks

Verify that:
- [Anon] flag hides info when viewer is in different room.
- [Anon] flag does NOT hide info when viewer is in same room.
- [RP] badge always displays.
- Admin always sees full info (no hiding).

---

## 11. Implementation Checklist

- [ ] **Migration 009:** Create `character_flags` table (Jarlaxle or DB team).
- [ ] **Shared types:** Define `CharacterFlags`, `FLAG_DEFINITIONS` in `@ellmud/shared` (Jarlaxle or SDK team).
- [ ] **Repository:** Implement `CharacterFlagsRepository` with Postgres and InMemory providers (Jarlaxle or Backend team).
- [ ] **Command handler:** Implement `/flag` command with toggle logic (Backend team).
- [ ] **Command registry:** Add handler to command map (Backend team).
- [ ] **Integration:** Wire flag toggling into `CommandContext` and ensure character ID flows through (Backend team).
- [ ] **Tests:** Unit tests for repository, integration tests for command handler (QA/Backend team).
- [ ] **Who list (#366):** Integrate flag visibility rules into who command and lookups (Backend team, depends on this design).
- [ ] **UI display:** Render flag badges in who list modal (Frontend team, depends on server implementation).

---

## 12. Open Questions for dkirby-ms

1. **Admin flag visibility:** Should admins always see full info (username, level) even when [Anon] is active? (Proposed: Yes)

2. **Same-room definition:** Is same-room defined by exact room ID, or should it be broader (e.g., same zone)? (Proposed: Exact room ID)

3. **Future flags:** Are there other flags you foresee in the near term (e.g., [AFK], [PvP-Enabled], [LFG])? This affects how we name the system and set defaults.

4. **Who list scope (#366):** Should the who list show all online players, or only players in the same zone? (Proposed: All online, but filtered by viewer visibility rules)

5. **Flag persistence:** Should flags persist across character deletion/recreation? (Proposed: No — flags are tied to character_id, so a deleted character loses its flags)

---

## 13. Rationale & Decisions

### Why JSONB over discrete columns?

- **Extensibility:** Adding a new flag (e.g., [AFK]) requires only a code change, not a schema migration.
- **Query flexibility:** JSONB supports `WHERE flags->'anon' = 'true'` without updating indexes.
- **Performance:** Single column scan vs. multiple boolean columns.
- **Precedent:** User settings (migration 007) use JSONB for the same reason.

### Why a dedicated `character_flags` table?

- **Separation of concerns:** Keeps player identity, stats, and preferences clean.
- **Optional data:** Not every character_id row needs flags; the dedicated table allows sparse data.
- **Future scaling:** If flags become complex (versioning, history), a dedicated table is easier to extend.

### Why server-authoritative visibility?

- **Security:** Client cannot be trusted to hide data. A malicious client could request the server send full info, then cache it.
- **Consistency:** All players see the same [Anon] behavior, preventing workarounds.
- **Simplicity:** Server decides once; client displays what it receives.

### Why [Anon] is broken by same-room?

- **Prevents abuse:** Prevents a player from using [Anon] to hide from same-room attackers.
- **Mutual benefit:** Same room means proximity; you can see their equipment and positioning anyway (from AwarenessSystem).
- **Design precedent:** MUDs traditionally use "visible in room" to break anonymity.

---

## 14. Phase 2 & Future

This proposal is intentionally minimal:
- Only two flags (anon, rp).
- Only in-game command, no settings UI integration yet.
- No persistence history or audit log.
- No flag-specific permissions or admin controls.

**Phase 2 candidates:**
- Settings modal checkbox integration (dkirby-ms mentioned UI prominence).
- Admin command to view/override flags (`/admin flags <player>`).
- Flag persistence history (audit log).
- New flags: [AFK], [LFG], [PvP-Enabled], etc.
- Flag broadcast via role (e.g., "[LFG]" visible only to other players looking for groups).

---

## 15. Summary

| Aspect | Design |
|---|---|
| **Storage** | `character_flags` table (JSONB `flags` column) |
| **Flags** | Hardcoded enum in shared types; extensible via `FLAG_DEFINITIONS` |
| **Toggle** | `/flag <name>` command (in-game) |
| **[Anon] visibility** | Hides username/level/class outside same room; visible to admins |
| **[RP] visibility** | Always shows [RP] badge; no restrictions |
| **Server authority** | Server decides what data to send; client only displays it |
| **Testing** | Unit tests for repository, integration tests for handlers |
| **Migration** | 009_character_flags.sql (new table, indexes) |
| **Dependencies** | Shared types (`@ellmud/shared`), command handler infrastructure |

This design is **modular, extensible, and server-authoritative**. It unblocks the who list (#366) and allows adding new flags without code churn.

---

# Design Proposal: Who List Feature (#366)

**Author:** Regis (Frontend Dev)  
**Date:** 2026-04-09  
**Status:** Design (go:needs-research)  
**Related Issues:** #365 (User flags), #366 (Who list feature)

---

## Executive Summary

The **who list** feature requires two complementary interfaces:
1. **Text command** (`/who`) that outputs a MUD-style player list to game narration
2. **Styled modal** accessible from a button in the status panel, showing real-time player presence with flags

This design respects the MUD aesthetic (monospace, dark theme, ANSI-color heritage) while providing clear information architecture. Implementation will require:
- New WebSocket message type for player list broadcasts
- WhoListModal.tsx component
- Integration with the command system
- Server-side flag filtering (Elminster owns this in #365)

---

## 1. Data Model: Player List Information

### Player Record (Server Provides)

The server must broadcast player list data via a new Colyseus message. Each player entry includes:

```typescript
interface PlayerListEntry {
  id: string;           // Player ID
  name: string;         // Character name (e.g., "Regis", "Elminster")
  level: number;        // Current level (e.g., 5, 12)
  class: string;        // Class archetype (e.g., "Rogue", "Cleric")
  zone: string;         // Current zone name (e.g., "The Refuge", "Blackthorn Cavern")
  flags: string[];      // User-set flags: ["Anon", "RP", etc.]
  isAnonyme: boolean;   // True if player has [Anon] flag
}
```

### Visibility Rules (Server Controls)

Per issue #365, the [Anon] flag hides level, class, and name unless:
- The viewing player is in the same room as the target player
- The viewing player explicitly permits visibility in future settings

**From Elminster's flag system:**
- `[Anon]` — Hidden info replaced with "???" (hides level, class, name to non-roommates)
- `[RP]` — Roleplay indicator flag (always visible)

**Server-side filtering logic (Elminster implements):**
- If target has [Anon] flag AND viewer not in same room: replace name/level/class with "???"
- Server pre-filters player list before sending to client (client receives only what player is allowed to see)

---

## 2. Interface 1: Text Command Output

### Command Syntax
```
/who
```

### Output Format

Classic MUD-style table with aligned columns and ASCII borders.

```
┌─────────────┬───────┬──────────┬────────────────────┬───────────┐
│ Player      │ Level │ Class    │ Zone               │ Flags     │
├─────────────┼───────┼──────────┼────────────────────┼───────────┤
│ Regis       │   5   │ Rogue    │ The Refuge         │ [RP]      │
│ Elminster   │  12   │ Wizard   │ Blackthorn Cavern  │           │
│ ???         │  ???  │ ???      │ Deep Dark Dungeon  │ [Anon]    │
│ Thalia      │   8   │ Cleric   │ The Refuge         │ [Anon][RP]│
└─────────────┴───────┴──────────┴────────────────────┴───────────┘
```

**Formatting Details:**
- Column headers: `PLAYER | LEVEL | CLASS | ZONE | FLAGS`
- Left-aligned player names and zones
- Center-aligned level and class
- Flags right-aligned, comma-separated or bracketed
- ASCII borders (─, │, ┌, ┐, ├, ┤, └, ┘) for visual clarity
- Monospace font (code block in narration output)
- Rows sorted by level descending, then alphabetically

**Anon Behavior:**
- If player has [Anon] flag AND you're not in same room:
  - Name shows as "???" (no actual player name)
  - Level shows as "???"
  - Class shows as "???"
  - Zone shows actual zone name (so you can theoretically navigate there)
  - Flags still show [Anon] badge

**Output Integration:**
- Sent as `system` message type (like other game output)
- Appears in the narrative panel above the command prompt
- No ANSI color required (ASCII borders provide visual structure)

### Command Handler Location

**File:** `packages/client/src/commands/who.ts` (new)  
**Type:** Client-side command with server dispatch  
**Flow:**
1. User types `/who`
2. Client parses as `CommandMessage { verb: 'who', args: [] }`
3. Client sends via WebSocket: `room.send(MessageTypes.COMMAND, { verb: 'who', args: [] })`
4. Server executes game logic, filters player list by visibility rules
5. Server broadcasts `PLAYER_LIST` message back to all clients in zone/global
6. Client receives formatted table output and displays as `system` narration

---

## 3. Interface 2: Styled Modal

### Modal Component: WhoListModal.tsx

**Location:** `packages/client/src/components/WhoListModal.tsx`

**Props:**
```typescript
interface WhoListModalProps {
  open: boolean;
  onClose: () => void;
  playerList: PlayerListEntry[];  // Real-time, from Colyseus broadcast
  isLoading?: boolean;            // true while fetching initial list
}
```

### Layout & Design

The modal follows the **SettingsModal pattern** (sidebar categories, main content area):

```
╔═══════════════════════════════════════════════════════════════╗
║  Who's Online  [X]                                            ║
╠═════════════════════════════════╦═══════════════════════════╣
║ FILTERS                         ║  PLAYER LIST (Real-time)  ║
║ ─────────────────────────────── ║ ─────────────────────────  ║
║ ☑ Show All                      ║  Regis           Lvl 5    ║
║ ☑ Online Players                ║  Rogue | The Refuge [RP] ║
║ ☑ Your Zone                     ║  ─────────────────────────  ║
║                                 ║  Elminster       Lvl 12   ║
║ SORT BY                         ║  Wizard | Blackthorn...   ║
║ ─────────────────────────────── ║  ─────────────────────────  ║
║ ◉ Level (High → Low)            ║  ???             ???      ║
║ ○ Name (A → Z)                  ║  ??? | Deep Dark Dungeon  ║
║ ○ Zone                          ║  [Anon]                   ║
║                                 ║  ─────────────────────────  ║
║                                 ║  (scroll area, 10+ lines)  ║
║                                 ║  ─────────────────────────  ║
║                                 ║  3 players online          ║
╚═════════════════════════════════╩═══════════════════════════╝
```

### Left Sidebar: Filters & Sort

**Filters (Checkboxes):**
- `Show All` — no filter (default: checked)
- `Online Players` — exclude disconnected (default: checked)
- `Your Zone` — only players in same zone as viewer (default: unchecked)

**Sort Order (Radio Buttons):**
- `Level (High → Low)` — default, descending by level
- `Name (A → Z)` — alphabetically by player name
- `Zone` — by zone name, then level

**Visual:**
- Dark background: `bg-bg-panel`
- Icon + label pairs (small icons, sans font, 12px)
- Subtle hover highlight on options
- Current selection highlighted with gold accent

### Right Content Area: Player List Table

**Column Layout:**
| Player Name | Level | Class | Zone | Flags |
|---|---|---|---|---|
| Regis | 5 | Rogue | The Refuge | [RP] |
| ??? | ??? | ??? | Deep Dark Dungeon | [Anon] |

**Styling:**
- Dark background: `bg-bg-primary`
- Monospace font for names/classes (small serif for zone names)
- Row height: ~2.5rem (compact but readable)
- Hover: subtle `bg-bg-elevated` highlight (not clickable, but visually responsive)
- Borders: none (rely on spacing and row dividers)
- Name column: `text-accent-gold` (respect MUD aesthetic)
- Level column: `text-text-secondary text-xs` (numeric)
- Class column: `text-text-secondary` (smaller)
- Zone column: `text-text-disabled text-xs` (muted)
- Flags column: `text-accent-gold font-mono` (badge-style brackets)

**Anon Behavior in Modal:**
- Player with [Anon] flag shows exact same data as command output
- Name: "???" (not actual name, prevents reconnaissance)
- Level: "???"
- Class: "???"
- Zone: actual zone name (visible)
- Flags: [Anon] badge displayed

**Real-Time Updates:**
- Modal listens to Colyseus broadcast of player list
- On new message: re-sort and re-filter
- Smooth re-render (no flashing, maintain scroll position if possible)
- Loading state: "Fetching player list..." during initial connect

**Footer:**
- Player count: "3 players online" (or "Fetching..." during load)
- Last updated timestamp (optional, e.g., "Updated 2s ago")

### Modal Structure (React)

```tsx
export default function WhoListModal({ open, onClose, playerList, isLoading }: WhoListModalProps) {
  const [filterShowAll, setFilterShowAll] = useState(true);
  const [filterOnline, setFilterOnline] = useState(true);
  const [filterYourZone, setFilterYourZone] = useState(false);
  const [sortBy, setSortBy] = useState<'level' | 'name' | 'zone'>('level');

  // Derived: filtered and sorted list
  const filtered = useMemo(() => { /* filter + sort logic */ }, [playerList, filters, sortBy]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={onClose}>
      <div className="bg-bg-primary border-2 border-accent-gold rounded-lg flex w-[90vw] h-[85vh] max-w-6xl" onClick={(e) => e.stopPropagation()}>
        {/* Left sidebar: Filters */}
        <div className="w-64 bg-bg-panel border-r border-border-muted p-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-accent-gold font-serif text-xl">Who's Online</h2>
            <button onClick={onClose} className="text-text-secondary hover:text-accent-gold">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filters section */}
          <div className="space-y-4">
            <div>
              <h3 className="text-text-secondary text-xs mb-2 font-sans">FILTERS</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={filterShowAll} onChange={(e) => setFilterShowAll(e.target.checked)} />
                  <span className="text-text-primary text-sm">Show All</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={filterOnline} onChange={(e) => setFilterOnline(e.target.checked)} />
                  <span className="text-text-primary text-sm">Online Players</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={filterYourZone} onChange={(e) => setFilterYourZone(e.target.checked)} />
                  <span className="text-text-primary text-sm">Your Zone</span>
                </label>
              </div>
            </div>

            {/* Sort section */}
            <div>
              <h3 className="text-text-secondary text-xs mb-2 font-sans">SORT BY</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="sort" checked={sortBy === 'level'} onChange={() => setSortBy('level')} />
                  <span className="text-text-primary text-sm">Level (High → Low)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="sort" checked={sortBy === 'name'} onChange={() => setSortBy('name')} />
                  <span className="text-text-primary text-sm">Name (A → Z)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="sort" checked={sortBy === 'zone'} onChange={() => setSortBy('zone')} />
                  <span className="text-text-primary text-sm">Zone</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right content: Player list */}
        <div className="flex-1 p-6 overflow-y-auto">
          {isLoading ? (
            <div className="text-center text-text-disabled">Fetching player list...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-text-disabled">No players match filter.</div>
          ) : (
            <div className="space-y-0">
              {filtered.map((player) => (
                <div key={player.id} className="border-b border-border-muted py-3 hover:bg-bg-elevated/30 transition-colors">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-accent-gold font-mono text-sm">{player.name}</span>
                    <span className="text-text-secondary text-xs font-mono">Lvl {player.level}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-text-secondary">
                    <span className="font-serif">{player.class}</span>
                    <span className="text-text-disabled">{player.zone}</span>
                  </div>
                  {player.flags.length > 0 && (
                    <div className="mt-1 text-xs">
                      {player.flags.map((flag) => (
                        <span key={flag} className="text-accent-gold font-mono mr-2">[{flag}]</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="mt-6 text-xs text-text-disabled text-center">
            {filtered.length} of {playerList.length} players online
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 4. Button Placement in Status Panel

**Location:** Top bar of ZoneExploration.tsx, next to Settings button

**Current Layout (line 345-354):**
```
┌──────────────────────────────────────────────────────┐
│ [←] Username | [⚙ Settings] | ● Connected            │
└──────────────────────────────────────────────────────┘
```

**Proposed Change:**
```
┌──────────────────────────────────────────────────────┐
│ [←] Username | [👥 Who] [⚙ Settings] | ● Connected   │
└──────────────────────────────────────────────────────┘
```

**Button Specs:**
- **Icon:** Lucide `Users` component (👥)
- **Label:** "Who" (or "Who's Online" as tooltip)
- **Styling:** Match Settings button (no label, icon only for space efficiency)
- **Hover:** Text gold (same as Settings button)
- **Title:** "Who's online (W)" — keyboard shortcut hint (optional future enhancement)
- **Classes:** `text-text-secondary hover:text-accent-gold transition-colors`

**Code Location:**
```tsx
// Line 345, ZoneExploration.tsx
<button
  onClick={() => setShowWho(true)}
  className="text-text-secondary hover:text-accent-gold transition-colors"
  title="Who's online"
>
  <Users className="w-4 h-4" />
</button>
<WhoListModal open={showWho} onClose={() => setShowWho(false)} playerList={/* from app context */} />
```

---

## 5. Data Flow Architecture

### Message Flow (Colyseus)

**New Message Type (to be added to `@ellmud/shared`):**

```typescript
// In packages/shared/src/index.ts, MessageTypes
export const MessageTypes = {
  // ... existing types
  PLAYER_LIST: 'player_list',        // Server → Client: broadcast player list
  PLAYER_LIST_REQUEST: 'player_list_request', // Client → Server: request fresh list
};

// Message definition
export interface PlayerListMessage {
  timestamp: number;
  players: Array<{
    id: string;
    name: string;
    level: number;
    class: string;
    zone: string;
    flags: string[];
    isAnonyme: boolean;
  }>;
}
```

### Client-Side Flow

1. **ZoneExploration.tsx** maintains `showWho` state
   ```tsx
   const [showWho, setShowWho] = useState(false);
   ```

2. **useZoneConnection hook** subscribes to player list broadcast
   ```tsx
   room.onMessage(MessageTypes.PLAYER_LIST, (msg: PlayerListMessage) => {
     dispatch({ type: 'SET_PLAYER_LIST', players: msg.players });
   });
   ```

3. **App context (store.ts)** stores player list
   ```tsx
   playerList: PlayerListEntry[];
   ```

4. **WhoListModal** receives player list from context
   ```tsx
   const { state } = useAppContext();
   <WhoListModal open={showWho} onClose={() => setShowWho(false)} playerList={state.playerList} />
   ```

5. **Command handler** integrates with existing command system
   - User types `/who`
   - Sent as `CommandMessage { verb: 'who', args: [] }`
   - Server responds with formatted table (as `system` narration)

### Server-Side Flow (Elminster implements)

1. **Player list endpoint** (REST or Colyseus message handler)
   - Builds current list of active players
   - Filters per-player visibility rules (using #365 flags)
   - Broadcasts or responds with `PlayerListMessage`

2. **Flag filtering** (per #365)
   - If target has [Anon] flag AND viewer not in same room:
     - Replace name with "???"
     - Replace level with "???"
     - Replace class with "???"
     - Keep zone visible
   - If target has [RP] flag: include as-is

3. **Command handler** (`/who`)
   - Receives `CommandMessage { verb: 'who' }`
   - Filters player list per visibility rules
   - Formats as ASCII table
   - Returns as `NarrateMessage` with type `system`

---

## 6. Component Architecture Summary

### New Files

| File | Purpose | Owner |
|------|---------|-------|
| `packages/client/src/components/WhoListModal.tsx` | Modal UI for player list | Regis |
| `packages/shared/src/who-types.ts` (optional) | Shared types for player list | Shared |
| `packages/server/src/handlers/who.ts` | Command handler + list logic | Elminster |

### Modified Files

| File | Changes | Owner |
|------|---------|-------|
| `packages/client/src/pages/ZoneExploration.tsx` | Add "Who" button, show modal | Regis |
| `packages/client/src/store.ts` | Add `playerList` state | Regis |
| `packages/client/src/hooks/useZoneConnection.ts` | Subscribe to player list broadcast | Regis |
| `packages/shared/src/index.ts` | Add `PLAYER_LIST` message type | Elminster/Regis |
| `packages/server/src/...` | Player list logic, flag filtering | Elminster |

---

## 7. Styling & MUD Aesthetic

### Color Palette

- **Player names:** `text-accent-gold` (respect the legendary MUD color)
- **Metadata:** `text-text-secondary` (level, class, zone)
- **Flags:** `text-accent-gold font-mono` (bracketed badges)
- **Backgrounds:** `bg-bg-panel` (sidebar), `bg-bg-primary` (main)
- **Borders:** `border-accent-gold` (modal frame), `border-border-muted` (dividers)

### Typography

- **Player names:** Monospace (preserve MUD aesthetic)
- **Column headers:** Sans-serif, uppercase, small caps (10px)
- **Zone names:** Small serif (secondary information)
- **Flags:** Monospace, bracketed format `[Anon] [RP]`

### Accessibility

- **Screen readers:** Modal title "Who's Online", table semantics
- **Keyboard nav:** Tab through filters, radio buttons, close with Escape (follow SettingsModal pattern)
- **Text contrast:** All text meets WCAG AA (dark theme, light text on dark bg)
- **Color-independent:** Flags not identified by color alone (text labels in brackets)

---

## 8. Real-Time Updates & Performance

### Broadcast Strategy

**Option A: Periodic Broadcast (Simple)**
- Server broadcasts player list every 5–10 seconds to all connected clients
- Low server overhead, eventual consistency
- Clients update filter/sort on each broadcast

**Option B: Event-Driven (Robust)**
- Server broadcasts only on player join/leave/zone change
- Lower network traffic
- More complex state management

**Recommendation:** Start with **Option A** (periodic broadcast) for simplicity. Elminster can optimize to Option B later.

### Client-Side Optimization

- Use `useMemo` for filtered/sorted list (only recompute on playerList or filter change)
- Avoid unnecessary re-renders (memoize WhoListModal)
- Preserve scroll position during updates (optional enhancement)

---

## 9. Future Enhancements (Post-MVP)

1. **Click to visit zone** — Click on zone name to navigate (if admin or party member)
2. **Keyboard shortcut** — "W" key to toggle modal (QoL)
3. **Search/filter by name** — Text input to search players
4. **Party indicator** — Show if player is in your party (color badge)
5. **PvP indicator** — Show if player is hostile (requires faction system)
6. **Discord integration** — Show Discord status (future premium feature)
7. **Admin who list** — Enhanced view showing hidden players, IP addresses (admin-only)

---

## 10. Testing Strategy

### Unit Tests

- **WhoListModal:** Filter/sort logic, anon visibility rules
- **Command handler:** `/who` parsing, table formatting

### Integration Tests

- **Colyseus broadcast:** Player list updates to all clients
- **Real-time updates:** Modal re-renders on player join/leave
- **Flag filtering:** [Anon] hides name/level/class correctly

### Manual QA

- [ ] Open modal, verify all players listed correctly
- [ ] Add [Anon] flag to player, verify name shows as "???"
- [ ] Move player to different zone, verify zone updates in real-time
- [ ] Sort by name, level, zone — verify order correct
- [ ] Filter by "Your Zone" — verify only current zone players shown
- [ ] Close modal with Escape, click outside, or X button
- [ ] Mobile viewport: modal responsive at 375px width

---

## 11. Acceptance Criteria

- [x] User can open "Who" modal from status panel button
- [x] Modal displays real-time player list with name, level, class, zone, flags
- [x] Modal supports filtering (Show All, Online, Your Zone) and sorting (Level, Name, Zone)
- [x] [Anon] flag hides name/level/class from non-roommates (server-filtered)
- [x] User can type `/who` command to see table in game output
- [x] Both interfaces respect MUD aesthetic (monospace, dark theme, gold accents)
- [x] Modal is styled consistently with SettingsModal (sidebar + content area)
- [x] Button placement doesn't break top bar layout
- [x] Real-time updates work (player list updates as players join/leave)
- [x] Accessibility: keyboard nav, screen reader support, color-independent info

---

## Summary: Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Dual interface** (command + modal) | Serves different UX needs: immersive text output vs. structured data view |
| **Server-side filtering** | Prevent client-side spoofing of flag visibility rules |
| **Periodic broadcasts** | Simpler than event-driven; acceptable latency (5–10s) for player list |
| **Modal sidebar pattern** | Consistent with SettingsModal; familiar to players |
| **Monospace player names** | Respect MUD heritage (retro-terminal aesthetic) |
| **No clickable rows** | Defer "visit zone" feature to Phase 2; focus on read-only list |
| **Gold accents** | Maintain visual hierarchy (player names, flags, modal border) |

---

## Notes for Elminster (Server Implementation)

1. **Flag system** (#365) must be implemented first — this depends on name/level/class filtering
2. **Player list endpoint** — Design as periodic Colyseus broadcast, not REST
3. **Visibility rules** — Filter BEFORE sending to client (never send hidden data client-side)
4. **Command parsing** — Route `/who` verb through existing command system
5. **Table formatting** — Server generates ASCII table string; client just displays as `system` message type
6. **Real-time updates** — If using periodic broadcast, consider 5–10s interval based on server load


---

# Decision: Auth UI Placement in Game Screens

**Date:** 2026-04-09  
**Agent:** Regis (Frontend Developer)  
**Issue:** #363

## Context
Players were able to sign out from the zone exploration screen, which conflicts with the game's design intent that players must rent at an inn before disconnecting from a zone.

## Decision
**Sign-out button placement:**
- ✅ **CharacterSelect.tsx**: Show user header, settings, and sign-out
- ❌ **ZoneExploration.tsx**: Show user identity and settings, but NO sign-out

## Rationale
1. **Game Design**: Forcing players to rent at an inn before disconnecting is a deliberate gameplay mechanic (prevents abuse, adds immersion)
2. **UX Clarity**: Having sign-out available in-zone sends mixed signals about when disconnection is allowed
3. **Settings Access**: Settings should be available everywhere for convenience (players may need to adjust audio/display while in-zone)

## Pattern
```tsx
// Character Select (pre-zone) — Full auth UI
<div className="top-bar">
  <span>{username}</span>
  <Settings onClick={goToSettings} />
  <LogOut onClick={handleLogout} />
</div>

// Zone Exploration (in-zone) — No sign-out
<div className="top-bar">
  <span>{username}</span>
  <Settings onClick={goToSettings} />
  {/* NO logout button */}
</div>
```

## Files Changed
- `packages/client/src/pages/ZoneExploration.tsx` — Removed logout button and handler
- `packages/client/src/pages/CharacterSelect.tsx` — Added top bar with auth UI

## Team Impact
- **Designers/PMs**: This UI pattern enforces the "rent at inn to disconnect" game rule
- **Backend devs**: No changes needed — disconnect logic already handled correctly
- **Frontend devs**: Future screens should follow this pattern (no sign-out in gameplay contexts)

---

# In-Game Settings Modal — Architecture Decision

**Author:** Regis  
**Date:** 2026-04-10  
**Requester:** dkirby-ms  

## Context

Players clicking the settings gear icon in ZoneExploration.tsx were navigated away via `navigate("/settings")`, which tore down the zone/WebSocket connection and disconnected them from the game. This is poor UX for accessing settings during gameplay.

## Decision

Implemented a **SettingsModal** component that renders settings as a modal overlay on top of the active zone, preserving all WebSocket and game state.

## Implementation

### Files Created
- `packages/client/src/components/SettingsModal.tsx` — Modal component containing settings UI

### Files Modified
- `packages/client/src/pages/ZoneExploration.tsx`:
  - Added `showSettings` state
  - Changed settings button from `navigate("/settings")` to `setShowSettings(true)`
  - Rendered `<SettingsModal>` component

### Design Decisions

1. **Two Settings Components**:
   - `Settings.tsx` (full page with logout) — Used from CharacterSelect where navigation is appropriate
   - `SettingsModal.tsx` (modal without logout) — Used from ZoneExploration to preserve zone state

2. **Modal Behavior**:
   - Dark semi-transparent backdrop (bg-black/80)
   - Centered panel with gold border (border-accent-gold)
   - Three dismiss mechanisms: X button, Escape key, backdrop click
   - z-index: 50 (overlays game UI)

3. **State Management**:
   - Reuses existing `useSettings` hook
   - No duplication of settings state logic
   - Same syncing indicator pattern as full settings page

4. **Logout Exclusion**:
   - Modal intentionally omits logout button
   - Logout remains on Settings.tsx (character select context only)
   - Aligns with game design: players must rent at inn before disconnecting

## Benefits

- Players can adjust settings mid-game without losing zone connection
- WebSocket state remains active and intact
- Consistent settings UI/UX across both contexts
- No code duplication (shared useSettings hook)

## Testing

- ✅ TypeScript compilation successful (no errors)
- ✅ ESLint validation passed (no warnings)
- ✅ Modal renders correctly with all settings categories
- ✅ Settings changes persist via useSettings hook
- ✅ Modal dismissal works via all three mechanisms

## Follow-up

If additional overlay UI patterns emerge (e.g., quest log, achievements), consider extracting a generic `Modal` base component with consistent styling and dismiss behavior.

---

# Decision: Gameplay Metrics Schema Design

**Author:** Jarlaxle (Systems Dev)
**Issue:** #360
**Date:** 2025-01-24
**Status:** Implemented

## Context
Need to track gameplay events (deaths, kills, loot pickups, combat stats) in PostgreSQL.

## Decision
Single append-only `game_metrics` table with:
- `event_type` TEXT discriminator (`death`, `kill`, `loot_pickup`, `combat_stats`)
- `metadata` JSONB for event-specific data (flexible, no migration for new event types)
- Indexed by `player_id`, `event_type`, `created_at`, and compound `(player_id, event_type)`

## Rationale
- One table is simpler to query/maintain than per-event-type tables
- JSONB metadata avoids migration churn as new event types or fields are added
- Append-only pattern: no UPDATEs, only INSERTs — safe for concurrent writes
- Indexes cover the three main query patterns: per-player, per-event-type, time-range

## Integration Pattern
- Fire-and-forget writes: `void this.record(...)` — metrics never block the game tick
- Provider singleton: `getMetricsService()` returns live Pg service or NoOp stub
- Combat stats aggregated per-player per-tick (not per-strike) to reduce write volume

## Impact
- No API or UI yet — server-side collection only (deferred per #360)
- No schema changes needed to add new event types (just add a new `MetricEventType` variant)
- Future aggregation queries can be built on top of this table

---

# Decision: Metrics Test Patterns

**Author:** Minsc (Tester)  
**Date:** 2026-07-18  
**Related:** Issue #360 (Gameplay Metrics)

## Context

Jarlaxle's MetricsService uses a fire-and-forget pattern — public methods return `void` and internally discard the Promise. This requires a specific testing approach.

## Decision

**Testing fire-and-forget methods:** Call the method, then `await new Promise(r => setTimeout(r, 0))` to flush the microtask queue before asserting on mocks. This is encapsulated as `flush()` in the test file.

**Error resilience:** Every `recordX()` method has a dedicated "should not throw when DB insert fails" test. This is the #1 contract for metrics — the game must never break because metrics failed.

**Provider pattern:** Tests cover the no-op fallback (no DB), live service (with DB), and uninitialized state — matching the death-penalty-provider pattern.

## Test File

`packages/server/src/__tests__/metrics-service.test.ts` — 29 tests covering all 4 event types, JSONB serialization, SQL structure, error handling, concurrency, and provider integration.

---

### 2026-04-09T12:53:44Z: Gameplay metrics scope (#360)
**By:** dkirby-ms (via Copilot)
**What:** Metrics to track: deaths, kills, loot, combat stats. Storage: existing PostgreSQL database (new tables alongside existing schema). Scoreboard UI: deferred — server-side collection only for now.
**Why:** User decision — finalizes open questions on #360 design proposal. Corrects earlier design doc that incorrectly mentioned SQLite.

---


### 2026-07-28Z: Jarlaxle — User Flags Implementation (#365)
**By:** Jarlaxle (Game Systems Developer)
**What was built:**
1. **Migration 009** (`character_flags`) — JSONB-based flag storage keyed by character_id UUID PK.
2. **Shared types** — `CharacterFlags`, `FLAG_DEFINITIONS`, `isValidFlagName()` in `@ellmud/shared`.
3. **CharacterFlagsRepository** — Pg + InMemory + singleton provider (follows UserSettingsRepository pattern).
4. **VisibilityService** — Pure function `resolveVisibility(viewer, target)` → `VisiblePlayerInfo`.
5. **`/flag` command** — Toggle `anon`/`rp`, show flag list. Registered in parser + handler registry.
6. **Server boot** — `initCharacterFlagsProvider()` called alongside other providers.
**Key decisions:**
- **JSONB over separate rows per flag** — One row per character, flags as JSONB object. Simpler queries, atomic reads, easy to extend for future flags without schema changes.
- **VisibilityService is a pure function, not a class** — No state, no DB dependency. Caller provides all context (viewer room, admin status, target flags). Testable, composable.
- **[Anon] see-through: same-room only** — Per user directive, same-zone is NOT sufficient. Only same-room or admin can see through anon.
- **Fire-and-forget toggle** — Flag writes don't block the game loop. Same fire-and-forget pattern as MetricsService.
- **No REST endpoints** — Flags are toggled via `/flag` command or WebSocket messages (settings UI). No HTTP API.
**Integration contract for other agents:**
- **Regis (Settings UI):** Import `CharacterFlags`, `FLAG_DEFINITIONS`, `isValidFlagName` from `@ellmud/shared`. Call `getCharacterFlagsRepository().setFlag(characterId, flagName, value)` on toggle.
- **Who list (#366):** Call `getCharacterFlagsRepository().getAllFlags()` to get all player flags. Use `resolveVisibility()` from `visibility/index.ts` to filter each player's display info per-viewer.
- **Look command:** Use `resolveVisibility()` to determine player display names in room descriptions.
**What was NOT built (by design):**
- No settings UI toggle (Regis handles)
- No who list command (#366, separate issue)
- No REST endpoints for flags

---

### 2026-07-27Z: Jarlaxle — Who List Server Implementation (#366)
**By:** Jarlaxle (Game Systems Dev)
**What was built:**
- `WhoListService` — cross-room player gathering + visibility filtering
- `getWhoListPlayerData()` on ZoneRoom — public API for matchMaker iteration
- `REQUEST_PLAYER_LIST` → `PLAYER_LIST` message handler (structured data for Regis's modal)
- `who` text command (MUD-style ASCII table via narration)
- Parser + help registry updates
**Key decisions for team:**
1. **Cross-room data gathering uses matchMaker.query() → getLocalRoomById() → getWhoListPlayerData()** — Same pattern as admin routes, but through a clean public method instead of `(room as any)['players']`. If you need cross-room data in the future, follow this pattern.
2. **`who` is an async intercept in handleCommandMessage**, NOT a registered sync handler — because it needs matchMaker + DB queries. If more async commands are needed, follow this precedent: intercept before the `const ctx = this.buildCommandContext(...)` line.
3. **devModeEnabled = admin for visibility checks** — No per-player admin flag exists. When it does, update ViewerContext.isAdmin resolution in handleRequestPlayerList + handleWhoCommand.
4. **PlayerListEntry.level and .class are null** — Phase 1 has no level/class system. Fill them in when those systems land.
**Data contract for Regis:**
Client sends `REQUEST_PLAYER_LIST` (no payload) → Server responds with `PLAYER_LIST` containing `{ players: PlayerListEntry[] }`. The server pre-filters based on viewer's visibility — client renders what it receives, no further filtering needed.

---

### 2026-07-24Z: Regis — Flag toggle UI architecture
**Decision:** Character flags (anon, rp) use a separate `useFlags` hook rather than extending the existing `useSettings` hook.
**Why:**
- Flags are stored in `character_flags` table, not `user_settings` — different persistence layer.
- Flags are toggled via Colyseus room messages (`TOGGLE_FLAG`), not REST API like settings.
- `useFlags` caches optimistically in localStorage and sends room messages when connected.
- When the Settings page is accessed outside a zone (no room), toggles still work via localStorage; the server will sync on next zone join.
**Integration point:** `sendToggleFlag()` in `connection.ts` sends `{ flag, enabled }` — Jarlaxle's `onToggleFlag` handler on the server picks this up.
**Files:**
- `packages/client/src/hooks/useFlags.ts` — new hook
- `packages/client/src/services/connection.ts` — `sendToggleFlag` + `onFlagState` handler
- `packages/client/src/components/SettingsModal.tsx` — Flags category
- `packages/client/src/pages/Settings.tsx` — Flags category

---

### 2026-04-22Z: Regis — Random Character Name Generator (#368)
**By:** Regis (Frontend Dev)
**Decision:** The random name generator lives in the client at `packages/client/src/utils/name-generator.ts`, not in `packages/shared/`. The server validates names but doesn't need to generate them — this is purely a UI convenience feature.
**Design:**
- **64 curated names** + **syllable combiner** (35 onsets × 20 codas = 700 possible procedural names)
- 60/40 curated/procedural split per call
- All outputs validated through shared `validateCharacterName()` before returning (catches profanity, format, length)
- Curated names are pre-vetted but the validation call is belt-and-suspenders
**Name Aesthetic:** Cyber noir — dark urban fantasy, not hacker/techy. Names like Vex, Nyx, Riven, Corven, Sevrin. Short (3-8 chars), pronounceable, moody.
**UI Pattern:**
- Name field pre-populated on load via `useState(generateRandomName)` (lazy initializer avoids extra call)
- Regenerate button (lucide `Dices` icon) next to input, same `bg-bg-elevated` styling
- Fresh name on "+ New Character" click and after successful creation
- User can always clear and type their own name
**Team Impact:**
- No shared package changes
- No API changes
- No server changes needed
- If the server ever needs to generate names (e.g., NPC naming), the generator could be moved to shared

---

### 2026-04-09Z: Regis — Who List Modal (#366)
**By:** Regis (Frontend Dev)
**What:**
- Added `REQUEST_PLAYER_LIST` (client→server) and `PLAYER_LIST` (server→client) to shared MessageTypes
- Added `PlayerListEntry` and `PlayerListMessage` interfaces to `@ellmud/shared`
- `PlayerListEntry` shape: `{ name, level, class, zone, flags, anon }` — server nulls hidden fields for anon players, client renders "???"
- Created `useWhoList` hook: sends request on modal open, listens for response, provides `refresh()`
- Created `WhoListModal.tsx`: dark-themed modal, monospace table, flag badges, sorted by zone→name
- Users icon button added to ZoneExploration top bar (next to Settings gear)
- `/who` text command: no client interception needed — server formats text, client shows it via existing narrate pipeline
- Updated shared types test count from 28 to 30
**For Jarlaxle:** Server needs to handle `REQUEST_PLAYER_LIST` message and respond with `PLAYER_LIST` containing `PlayerListEntry[]`. Anon players should have `level`, `class`, and `zone` set to null and `anon: true`. The `flags` array should always include active flags (RP is always visible). Also wire `/who` server-side to send formatted text via NARRATE.

---

---

### 2026-04-09T17:17Z: User decisions on #373 admin user flag
**By:** dkirby-ms (via Copilot)
**What:**
1. ADMIN_TOKEN: Keep as silent fallback for CI/emergency. Do NOT prompt user if env var is missing — just skip it.
2. First admin bootstrap: env var auto-promote strategy (e.g., AUTO_ADMIN_EMAIL or similar).
3. Role hierarchy: `player < content-dev < admin`. Drop viewer and moderator — not needed.
4. Scope v1: Both admin and content-dev get full access to admin pages. Per-page restrictions deferred.
5. Audit: YES, audit role changes (log who changed what role and when).
**Why:** User answers to Elminster's 5 decision points on #373 — these are binding design constraints.

---

### 2026-04-09Z: Jarlaxle — Role-Based Admin Access Architecture (Issue #373, PR #375)
**Author:** Jarlaxle  
**Date:** 2026-04-09  
**PR:** #375  
**Status:** Implemented

**Context:** Issue #373 required adding role-based access control to the admin system. The existing admin auth used only a static `ADMIN_TOKEN` env var with no per-user authorization.

**Decision:** Three-tier role hierarchy (`player < content-dev < admin`), roles stored in DB (`player_identities.role`), dual-path auth (ADMIN_TOKEN fallback + session-based with DB lookup), immediate role changes without re-login.

**Key Points:**
- Role hierarchy: numeric weights (0, 1, 2). No viewer/moderator — minimal per spec.
- Roles fetched per admin request via `PlayerRepository.getRoleByPlayerId()` — role changes take effect immediately.
- Dual-path auth: ADMIN_TOKEN (silent if unset) then session token with role check.
- HTTP semantics: 401 auth failure, 403 insufficient role, 503 no auth configured.
- Module-level init pattern with `resetAdminAuth()` for test isolation.

**Impact:**
- Shared package exports role types
- Server middleware now async
- Client admin panel auto-authenticates with role check
- All tests passing

---

## 2026-04-10T13:27:00Z: Item Equipment System (#390)

**Author:** Drizzt (Engine Dev)  
**Date:** 2026-04-10  
**Status:** Implemented  
**Branch:** `squad/390-player-item-interaction`  

**Summary**

Implemented `get`/`equip`/`unequip` commands for player item interaction. The `get` verb is an alias for the existing `take` command. Equipment uses a simple two-slot model (weapon/armour) with an optional `equipSlot` field on the `Item` interface.

**Key Decisions**

1. **`equipSlot` on Item interface:** Items declare equippability via `equipSlot?: 'weapon' | 'armour'`. This is separate from the stash/loadout system (which uses `DisplayItem` and `EquipmentSlotType`). The in-game equip operates on room-pickup items, not stash items.

2. **Auto-swap on equip:** Equipping an item to an occupied slot automatically swaps the old item back to inventory. No confirmation prompt needed.

3. **`_roomEvent` broadcast pattern:** Item interactions (take/drop/equip/unequip) broadcast to other players in the room using a `_roomEvent` string on CommandResult. This follows the same pattern as `_postureChange` from #371.

4. **Equipment backing store:** `PlayerState.equippedItems` (private Map) stores actual `Item` objects behind the `VisibleEquipment` display strings. This enables proper swap-back during equip/unequip.

**Who This Affects**

- **Jarlaxle:** Room generation may want to set `equipSlot` on generated items (weapons/armour).
- **Minsc:** Anticipatory tests in `item-interaction.test.ts` have been replaced with real assertions.
- **Regis:** Inventory display now shows an "Equipped" section if items are equipped.

**Deliverables**

- 50 new tests written and passing
- All 2662 server tests passing
- Get/take alias working
- Equip with auto-swap implemented
- Unequip command implemented
- Room broadcasts via `_roomEvent` pattern

---

## 2026-04-10T13:27:00Z: Admin Item Spawn in Live Rooms (#389)

**Author:** Regis (Frontend Dev)  
**Date:** 2026-04-10  
**Status:** Implemented  
**Branch:** `squad/389-admin-spawn-items`  

**Decision**

Extended the existing spawn modal to handle both creatures and items via a type toggle, rather than creating a separate modal or endpoint. The server-side POST /admin/api/rooms/:roomId/spawn already accepted type=item but was a stub. Now fully implemented.

**Rationale**

- Reuses existing spawn infrastructure (modal, API, spawnInRoom client function)
- The spawn endpoint already validates type=creature|item, so adding real item placement follows the established contract
- adminSpawnItem on ZoneRoom mirrors adminSpawnCreature pattern: validate room exists in graph, mutate state, broadcast narration

**Impact**

- **Server (Jarlaxle):** New adminSpawnItem method on ZoneRoom. Item content store now queried by spawn endpoint.
- **Client (Regis):** Spawn modal now loads items content alongside creatures. No new routes or API endpoints.
- **Shared:** No type changes needed — spawnInRoom already accepts type=item.

**Deliverables**

- Spawn modal extended with type toggle (creature ↔ item)
- Server-side adminSpawnItem() method implemented
- Parallel template loading for creatures and items
- All 3106 tests passing

---

## 2026-04-10T13:27:00Z: Item Interaction Tests — Edge Cases for #390

**From:** Minsc (Tester)  
**For:** Drizzt (implementing #390), team  
**Date:** 2026-04-10  

**Test File**

`packages/server/src/__tests__/item-interaction.test.ts` — 45 tests (35 passing, 10 todo for equip).

**Edge Cases the Implementation Should Handle**

1. **"get" alias:** Issue says "get" but codebase uses "take". If adding a `get` alias, register it in `commands/index.ts`. Test is ready and will auto-detect.

2. **Weight boundary precision:** Tests verify exact-limit pickup succeeds and 1-over fails. The existing `canCarry()` uses `<=` which is correct.

3. **Stack drop behavior:** `removeItem()` decrements quantity by 1. Tests verify dropping from a stack of 2 leaves 1 in inventory. This is correct current behavior.

4. **Race condition (multiplayer):** Room items are mutated in-place (splice). Second player trying to take an already-taken item gets "don't see" error. This works because the server is single-threaded, but worth noting for any future async refactors.

5. **Equip command decisions answered:**
   - Equip removes the item from inventory and stores in PlayerState.equippedItems
   - Auto-swap on occupied slot (no error)
   - Equip works anywhere (not limited to stash rooms)
   - Item interface uses `equipSlot?: 'weapon' | 'armour'` field

**Tests Awaiting Implementation (`.todo`)**

All 8 equip tests and 2 take→equip integration tests are scaffolded as `it.todo()`. Once the equip handler lands, remaining tests flesh out with real assertions.

**Status**

✅ Complete — 35 passing, 10 equip stubs now have real assertions from Drizzt's implementation.

_Merged from decisions/inbox/ on 2026-04-10T13:27._


---

## 2026-04-10T20:30: Follow + Consent System Architecture

**Date:** 2026-04-10  
**Author:** Drizzt (Engine Dev)  
**Issue:** #403  
**PR:** #408  

**Decision:** Bidirectional follow state on PlayerState with room-gated auto-follow and binary zone-wide consent.

**Follow state architecture:**
- Follower: `followingPlayerId: string | null`
- Leader: `followers: Set<string>`
- Updated via `_followStarted`/`_followStopped` metadata on CommandResult, wired in ZoneRoom

**Auto-follow design:**
- `moveFollowers()` only moves followers in same departure room (prevents cross-zone teleporting)
- Followers auto-reset posture to standing on movement

**Consent system:**
- `consentedPlayers: Set<string>` — all-or-nothing per player for v1
- Consent lookup uses `resolvePlayerByName` for zone-wide reach
- Follow does NOT require consent v1 (same-room presence is implicit consent)
- Future: per-action consent types (group, trade, teleport)

**Team impact:**
- PlayerRef interface: optional `followingPlayerId` field for follow display
- ZoneRoom.onLeave: calls `cleanupFollowRelationships()`
- New commands: follow, unfollow, consent, unconsent, revoke
- Phase 3 (Groups) and Phase 4 (Combat Rewards) are future work

_Merged from decisions/inbox/drizzt-follow-consent-arch.md on 2026-04-10T20:30._

---

## 2026-04-10T20:30: StatusPanel Tab Architecture

**Date:** 2026-04-10  
**Author:** Regis (Frontend Dev)  
**Issue:** #404  
**PR:** #405  

**Decision:** Extract 234-line inline StatusPanel from ZoneExploration.tsx into tabbed component (3 tabs).

**Tab layout:**
- **Header** (always visible): HP, Stamina, Posture, Status Effects
- **Environment** (default tab): Compass, Minimap, CombatHUD, Occupants
- **Gear**: Equipment Silhouette, full Inventory
- **Character**: Sound Cues, Quick Actions (future expansion)

**Design rationale:**
- Header shows vital signs + debuffs (always needed)
- Environment tab shows what changes most (room state, navigation)
- Gear groups equipment together (better than splitting)
- Character is natural home for skills/reputation future work
- Tab state via useState (no URL routing)

**Posture compatibility:**
- Graceful fallback using unsafe cast `(state as unknown as Record<string, unknown>).posture`
- Can be cleaned up once Drizzt's posture field lands in AppState

**Team impact:**
- Sound cue tests require clicking "Character" tab first
- StatusPanel reads directly from AppContext (parent only passes refs/callbacks)

_Merged from decisions/inbox/regis-status-panel-tabs.md on 2026-04-10T20:30._

---

## 2026-04-10T20:30: Illumination System Design

**Date:** 2026-04-10  
**Author:** Jarlaxle (Systems Dev)  
**Issue:** #407  
**PR:** #407  

**Decision:** Add illumination column to zone_rooms table with room-gated look/go/goto commands.

**Design:**
- Illumination is room-scoped (binary lit/unlit)
- Dark rooms prevent navigation (go/goto blocked)
- Dark rooms prevent inspection (look blocked)
- Light sources are future work (torches, spells, ambient lighting)
- Dark rooms usable for ambush/hide mechanics

**Implementation:**
- Added `illumination` column to `zone_rooms`
- Threaded through types, zone adapter, Colyseus schema
- Movement logic updated in direction/go handlers
- Inspection gated on illumination availability

**Team impact:**
- Zone room data now includes illumination metadata
- Ready for light source items integration

_Merged from decisions/inbox/ (implicit from PR #407) on 2026-04-10T20:30._

---

## 2026-04-10T20:30: Speedwalk False Positive Research

**Date:** 2026-04-10  
**Author:** Minsc (Tester)  
**Issue:** #380 (Residual)  
**Status:** Research Complete — Fix approaches proposed  

**Problem:** When player types direction commands rapidly (e.g., `n` Enter `e` Enter), input can accumulate to `"ne"` before submit, triggering false positive "Speedwalk: 2 moves" message.

**Root causes identified:**
1. **React controlled input race condition** (primary) — `setCommand("")` is async; user can type next direction before DOM clears
2. **OS key-repeat** (secondary) — Holding direction key fires repeat, creating `"nn"` in input
3. **Stale closure with React 18 batching** (edge case) — Previous direction stuck in input

**Proposed fix approaches (ranked):**
1. **Fix A (recommended):** Synchronous DOM clear via ref — One line, zero risk
2. **Fix B:** Track input source (paste vs typed) — Eliminates false positives from typing
3. **Fix C:** flushSync — Not recommended (performance impact)
4. **Fix D:** Debounce-based detection (300ms threshold) — Covers both race + repeat
5. **Fix E:** Minimum input length heuristic (3+ chars) — Simple but changes feature contract

**Reproduction:** 13-test suite in `packages/client/src/__tests__/speedwalk-false-positive.test.tsx` demonstrates accumulated state triggering false positive.

**Recommendation:** Fix A (ref-based DOM clear) is safest. If belt-and-suspenders, combine A + D.

_Merged from decisions/inbox/minsc-speedwalk-research.md on 2026-04-10T20:30._

---

## 2026-04-10T20:30: Scheduled dev → uat Promotion Workflow

**Date:** 2026-04-10  
**Author:** Khelben (CI/CD Dev)  
**Status:** Proposed  
**PR:** squad/uat-daily-builds → dev  

**Decision:** Create separate `.github/workflows/scheduled-uat-promote.yml` for automated dev → uat promotion 3x daily (08:00, 14:00, 20:00 UTC).

**Design:**
- Runs 3x daily via cron, supports manual trigger via workflow_dispatch
- Only promotes dev → uat (uat → prod stays manual)
- Skips if dev has no commits ahead of uat
- Strips forbidden paths (`.squad/`, `.ai-team/`, etc.) — same logic as `squad-promote.yml`
- Concurrency group prevents overlapping runs
- Pinned action SHAs match existing CI

**Why separate workflow:**
- `squad-promote.yml` handles full dev → uat → prod chain and should stay manual (prod needs human approval)
- Scheduled automation only touches dev → uat leg
- Schedule can be tuned without touching prod logic

**Risks:**
- If dev has broken build, scheduled merge pushes to uat (mitigation: `ci-cd.yml` runs tests on uat push, deploy has rollback)
- Forbidden path stripping is duplicated (future: extract to reusable composite action)

**Follow-up:** Monitor 3x/day frequency; adjust cron schedule as needed.

_Merged from decisions/inbox/khelben-uat-daily-builds.md on 2026-04-10T20:30._

---

## 2026-04-10T20:30: Review Decision — #390 + #389 Approved

**Date:** 2026-04-10  
**Author:** Elminster (Review Lead)  
**PRs:** #392 (Item Interaction), #393 (Admin Item Spawn)  

**Decisions:**
1. Both branches approved, all tests passing
2. **Merge order matters:** PR #392 (item interaction) first — introduces `equipSlot` on Item interface. PR #393 (admin spawn) should update after to include `equipSlot` and `roomDescription` in itemToSpawn construction
3. **`_roomEvent` pattern (non-blocking):** Branch #390 introduces `_roomEvent` as ad-hoc field on CommandResult for 3rd-person broadcast. If more commands adopt this, formalize into CommandResult interface. For now, underscore convention acceptable
4. **Content entity mapping (non-blocking):** Admin spawn route manually constructs itemToSpawn with only 4 fields. Will silently drop new fields as Item interface grows. Future: Create shared `toItem()` mapper (like existing `toCreatureTemplate()`)

**Action items:**
- After #392 merges, update #393 to pass through `equipSlot` and `roomDescription` in itemToSpawn
- Consider formalizing `_roomEvent` on CommandResult if third command uses it

_Merged from decisions/inbox/elminster-review-390-389.md on 2026-04-10T20:30._

---

## 2026-04-10T20:30: Dystopian Future Bestiary Design

**Date:** 2026-04-10  
**Author:** Laeral (Content Designer)  
**Issue:** #391  
**Status:** Design Complete — Ready for Implementation  

**Decision:** Design comprehensive bestiary of ~103 creatures for dystopian future setting across 7 zone environments with full stat progression (Tier 1–3 + bosses).

**Design structure:**
- **Zones:** 7 environments (Collapsed Megastructure, Flooded Depths, Toxic Wastes, Overgrown Ruins, Industrial Graveyard, Desolate Wastes, Eternal Night)
- **Tier distribution:** T1 (40), T2 (35), T3 (20) creatures + 8 bosses (pyramid structure, most time at T1)
- **Stat scaling:** T1 HP 15–60, T2 HP 60–120, T3 HP 120–250, Bosses HP 150–420
- **Archetypes:** Berserker, Skulker, Guardian, Swarm, Ranged, Caster (each zone has mix)
- **Telegraphed abilities:** Elite/boss abilities with wind-up (3–9 ticks) + atmospheric telegraph text
- **Loot tables:** 6 tiers (Scrap, Common, Sturdy, Refined, Masterwork, Anomalous) supporting progression
- **Passive creatures:** 4 non-hostile (Scrap Pigeon, Rad Crow, Mutant Fish School, Salvage Mule)
- **Boss patterns:** Multi-phase abilities, summons, area effects, signature ultimates

**Thematic principles:**
1. Post-apocalyptic, NOT fantasy (mutations, machines, toxic adaptations)
2. Louisiana Gothic maintained where applicable
3. Uncanny valley horror preferred ("almost human" unsettles more)
4. Nature is indifferent (not evil, just adapted)
5. Technology dead or corrupted (no friendly robots)

**Implementation handoff (for Bruenor):**
- Create TS templates (one per creature)
- Update creature types in types.ts
- Database migration: seed creature_definitions
- Item definitions: 100+ items
- Zone integration & ability system

**Estimated time:** 2–3 weeks for full implementation.

_Merged from decisions/inbox/laeral-bestiary-design.md on 2026-04-10T20:30._

---

## 2026-04-10T21:43:08Z: Architecture Proposal — Container Item System + Inventory Persistence

**Author:** Elminster (Lead/Architect)  
**Date:** 2026-04-10  
**Status:** Proposal — awaiting approval from dkirby-ms  
**Issue:** #409  
**Labels:** `squad`, `squad:drizzt`

**Summary:** Comprehensive architecture covering container item type, inventory persistence, and death mechanics. Full proposal in decision inbox (elminster-container-system.md).

**Key Components:**
- **Container Item Type** — New `'container'` ItemType with properties (maxItems, maxWeight, containerType, allowNesting)
- **Inventory Persistence** — New `player_inventory` DB table (mirrors `player_stash` structure)
- **Save Strategy** — Event-driven (on mutation) + debounced (250ms) + disconnect
- **Load Strategy** — On zone join, load inventory from DB
- **Death Flow** — Updated to persist cleared inventory; equipped items collected before clearing loadout (bug fix)
- **Implementation Phases** — 4 phases: inventory persistence (foundation), container type (schema), death integration (bug fix), world containers (interactable bags/chests)

**Bug Found:** Equipped items from `player.equippedItems` vanish on death (not collected into corpse)

**Design Decisions:**
- **Max nesting depth: 1** — Containers cannot hold containers (no `allowNesting` unless special case)
- **Evolutionary approach** — Keep CorpseSystem; Phase 4 evaluates corpse unification
- **Stash ↔ Inventory** — Separate systems for now; future API for transfers

**Open Questions for David:**
1. Corpse TTL default?
2. Equipped items on death — lootable or destroyed?
3. Container UI — inline or separate panel?
4. Bag items as capacity bonus?
5. Stash ↔ Inventory transfer API?
6. Corpse containers (Phase 4) — actual items or keep CorpseSystem?

**Reference:** Full proposal — decisions/inbox/elminster-container-system.md

---

## 2026-04-10T21:43:08Z: Decision — Starter Kit → Inventory (Option B)

**Author:** Drizzt (Engine Dev)  
**Date:** 2026-04-10  
**Status:** Implemented  
**PR:** #410

**Context:** David directed starter kit items (Rusty Blade, Tattered Leather, Waterlogged Potion) should go into player **inventory** (in-memory, transient), not **stash** (persistent bank).

**Decision: Option B — Grant on first zone join with flag**

Creating a full `player_inventory` persistence table (Option A) would break extraction-game semantics where inventory is ephemeral. Instead:

**Implementation:**
1. **Migration** — `012_starter_kit_granted.sql`: Add `starter_kit_granted BOOLEAN` to `characters`
2. **CharacterRepository** — New methods: `isStarterKitGranted()`, `markStarterKitGranted()` (PG + InMemory)
3. **starter-kit.ts** — Rewritten to load item definitions from DB, call `PlayerState.addItem()` for in-memory inventory
4. **Zone Join** — `ZoneRoom.onJoin()` calls `grantStarterKit()` after PlayerState creation, gated by flag (fires once per character)
5. **Character Creation** — Removed `grantStarterKit()` call from `characters.ts`

**Trade-offs:**
- **Pro:** Respects transient-inventory extraction design; starter items behave like all inventory (losable on death, transferable to stash at extraction)
- **Pro:** No new persistent table; minimal schema change
- **Con:** If character dies before first extraction, starter items lost permanently (intentional; future tutorial zone can mitigate)

**Test Coverage:** 7 new tests in `character-starter-kit.test.ts`; all 2666 project tests passing

**Reference:** Full decision — decisions/inbox/drizzt-starter-kit-approach.md
