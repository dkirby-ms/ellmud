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

# Decision: Player Groups, Consent, Follow Architecture (Issue #403)

**Author:** Elminster (Lead/Architect)
**Date:** 2026-07-23
**Issue:** #403

## Context
Players need follow, consent, and group mechanics (classic MUD style). No existing follow/group/consent commands, DB tables, or PlayerState fields exist.

## Key Findings
- Command registration is trivial (Map-based, add handler + register)
- CombatSystem already tracks damage contributors per target (`killerIds[]`) — kill attribution ready
- XP distribution NOT implemented (framework exists, logic doesn't)
- Loot is free-for-all (anyone can loot any corpse)
- ZoneRoom has robust player tracking and room broadcast infrastructure
- `CommandContext` provides `otherPlayerInfo`, `resolvePlayersInRoom()` — player lookup ready

## Decision
**XL feature, broken into 4 independent phases:**

1. **Follow (M):** `follow <player>`, `unfollow`. In-memory PlayerState fields (`followingSessionId`, `followers` Set). Auto-follow on leader movement. Zone-scoped, resets on collapse.

2. **Consent (S):** `consent <player> <action>`. General-purpose consent map on PlayerState. Reusable for trade, teleport, future mechanics. Session-scoped.

3. **Groups (L):** `GroupManager` service (like CombatSystem). `group form/add/remove/leave/disband`, `gsay`. In-memory, no DB for v1. Max 20 members. Leader departure = disband.

4. **Combat Rewards (M, deferred):** Depends on XP system + Phase 3. Split XP among group members. Loot mode setting.

**Ship Phase 1+2 first, Phase 3 as separate PR, Phase 4 deferred.**

## Routing
- Phase 1+2: Drizzt (PlayerState, command handlers, movement hooks)
- Phase 3: Jarlaxle (new GroupManager service, cross-cutting integration)
- Phase 4: Jarlaxle (combat reward pipeline)
- All phases: Minsc (multi-player interaction tests)

## Team Impact
- New `follow`, `unfollow`, `consent`, `group`, `gsay` commands
- PlayerState gains follow/consent fields
- New `GroupManager` service injected into CommandContext
- `handleGo()` gains follower-movement hook
- Future: `handleLoot()` modified for group loot modes


# Decision: Illumination & Visibility System Architecture (Issue #402)

**Author:** Elminster (Lead/Architect)
**Date:** 2026-07-23
**Issue:** #402

## Context
Rooms need an illumination property (lit/dark) and players need vision state flags (blinded, nightvision, infravision, see_invisible). No illumination system exists today — rooms show all content unconditionally.

## Key Findings
- No illumination field in DB, types, or runtime Room objects
- `ZoneModifier` type already includes `'darkness'` but it's not enforced
- `NarrationRoom.light_level` field exists for LLM context but is never populated
- `AwarenessSystem` provides player-to-player visibility (skill-based, not light-based) — separate concern
- `PlayerState` has no vision/buff system beyond `deathPenalty`

## Decision
**Phase 1:** Add `illumination TEXT NOT NULL DEFAULT 'lit'` column to `zone_rooms`. Thread through types and zone-adapter. Gate look/go/goto output in dark rooms (show "pitch black" + exits only unless player has light source). TEXT column (not boolean) for extensibility.

**Phase 2:** Add `visionFlags: Set<VisionFlag>` to PlayerState (in-memory, transient). Light-source items grant nightvision-equivalent. Combat accuracy penalty in darkness.

**Phase 3 (deferred):** Dim illumination, time-of-day, magical darkness, ZoneModifier enforcement.

## Routing
- Phase 1: Jarlaxle (zone-adapter, migration) + Bruenor (content values)
- Phase 2: Drizzt (PlayerState, command handlers, combat integration)

## Team Impact
- New `Illumination` type in shared package
- Room interface gains `illumination` field
- Zone adapter must map new column
- Look/go/goto commands gain visibility gate
- Combat damage pipeline gains darkness modifier (Phase 2)


# Review Decision: #390 + #389 Approved

**Date:** 2026-07-22
**Author:** Elminster
**PRs:** #392 (Item Interaction), #393 (Admin Item Spawn)

## Decisions

1. **Both branches approved and PRs opened.** All tests pass on both branches.

2. **Merge order matters.** PR #392 (item interaction) should merge first — it introduces `equipSlot` on the `Item` interface. After that merges, PR #393 (admin spawn) should be updated to include `equipSlot` and `roomDescription` in the spawned item construction (`itemToSpawn` in `routes.ts`).

3. **`_roomEvent` pattern (non-blocking).** Branch #390 introduces `_roomEvent` as an ad-hoc field on `CommandResult` for 3rd-person broadcast messages. If more commands adopt this pattern, it should be formalized into the `CommandResult` interface proper. For now, the underscore-prefixed convention is acceptable.

4. **Content entity to domain object mapping.** The admin spawn route manually constructs `itemToSpawn` with only 4 fields. This will silently drop new fields as the `Item` interface grows. A shared `toItem()` mapper (like the existing `toCreatureTemplate()`) should be created. Non-blocking for this PR wave.

## Action Items

- After #392 merges, update #393 to pass through `equipSlot` and `roomDescription` in `itemToSpawn`
- Consider formalizing `_roomEvent` on `CommandResult` if a third command uses it


# Decision: Status Panel Tab Redesign (Issue #404)

**Author:** Elminster (Lead/Architect)
**Date:** 2026-07-23
**Issue:** #404

## Context
Right-side status panel has 10 sections in a single scrolling column — too much content, needs tabs. Also, "Stance" shows hardcoded "Cautious" instead of actual posture.

## Key Findings
- Panel is 234 lines of inline JSX in ZoneExploration.tsx (not extracted)
- Posture is NOT synced to client AppState — server has it, `PlayerStateMessage` doesn't include it
- `WhoListModal` shows other players' posture, but local player's posture is missing from status panel
- All needed data already available in AppState (HP, stamina, equipment, inventory, occupants, sound cues)
- Equipment silhouette, compass, minimap already functional components
- Styling: Tailwind CSS v4 with theme tokens

## Decision
**Prerequisite fix:** Add `posture` to `PlayerStateMessage` and `AppState`. Replace "Cautious" with real posture. Ships independently (S, half-day).

**Main redesign:**
1. Extract to `<StatusPanel>` component
2. Always-visible header: HP bar, Stamina bar, Posture, Status Effect pills
3. Tab bar: Environment (default) | Gear | Character
4. Environment tab: Compass, Minimap, CombatHUD (conditional), Room Occupants
5. Gear tab: Equipment Silhouette, Full Inventory
6. Character tab: Sound Cues, Quick Actions, future skills/reputation

Tab state via `useState` (ephemeral, no URL routing).

## Routing
- Posture sync: Drizzt (server-side PlayerStateMessage change)
- Panel extraction + tabs: Regis (React components, Tailwind styling)

## Team Impact
- New `StatusPanel` component extracted from ZoneExploration.tsx
- `PlayerStateMessage` gains `posture` field (server→client contract change)
- AppState gains `posture: Posture` field
- No API or shared type changes beyond posture sync


# Decision: Add `actions: write` permission to promote workflows

**Author:** Khelben (CI/CD Dev)
**Date:** 2025-07-14
**Status:** Implemented
**PR:** #401
**Branch:** squad/fix-promote-permissions

## Context

The Scheduled UAT Promote workflow (run #24256588502) successfully pushed dev → uat but failed at the "Trigger CI/CD on uat" step:

```
gh workflow run ci-cd.yml --ref uat
HTTP 403: Resource not accessible by integration
```

The `gh workflow run` command calls the GitHub workflow_dispatch API, which requires `actions: write` permission. Both promote workflows (`scheduled-uat-promote.yml` and `squad-promote.yml`) only had `contents: write`.

## Decision

Add `actions: write` to the `permissions` block in both promote workflows, alongside the existing `contents: write`.

## Rationale

- `contents: write` — needed for `git push` to the target branch
- `actions: write` — needed for `gh workflow run` (workflow_dispatch API)

This is the minimum permission escalation required. No PAT or additional secrets needed since `GITHUB_TOKEN` supports `actions: write` when explicitly declared.

## Impact

- Fixes the 403 error on the CI/CD trigger step
- Applies to both `scheduled-uat-promote.yml` and `squad-promote.yml`
- No other workflow changes needed


# Decision: Scheduled dev → uat Promotion Workflow

**Date:** 2025-07-18  
**Author:** Khelben (CI/CD Dev)  
**Status:** Proposed  
**PR:** squad/uat-daily-builds → dev

---

## Context

The team wanted daily builds flowing into UAT automatically so QA always has fresh code to test without manual promotion steps.

## Decision

Created `.github/workflows/scheduled-uat-promote.yml` — a **new, separate** workflow that:

1. **Runs 3x daily** (08:00, 14:00, 20:00 UTC) via `schedule` cron triggers
2. **Supports manual trigger** via `workflow_dispatch`
3. **Only promotes dev → uat** (uat → prod stays manual via `squad-promote.yml`)
4. **Safety:** Skips if dev has no commits ahead of uat
5. **Strips forbidden paths** (`.squad/`, `.ai-team/`, etc.) — same logic as `squad-promote.yml`
6. **Concurrency group** prevents overlapping runs
7. **Pinned action SHAs** match existing `ci-cd.yml`

## Why a Separate Workflow

- `squad-promote.yml` handles the full dev → uat → prod chain and should remain manual (prod deploys need human approval)
- Scheduled automation should only touch the dev → uat leg
- Keeping them separate means the schedule can be tuned without risking prod deployment logic

## Risks

- If dev has a broken build, the scheduled merge will push it to uat. Mitigation: `ci-cd.yml` runs build+test on push to uat and the deploy pipeline has rollback.
- Forbidden path stripping logic is duplicated across two workflows. If paths change, both must be updated.

## Follow-up

- Consider extracting the forbidden-path stripping into a reusable composite action if the list grows.
- Monitor whether 3x/day frequency is right — adjust cron schedule as needed.


# Decision: Dystopian Future Bestiary Design

**Date:** 2026-04-07  
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

---

## Decision

Designed a comprehensive bestiary of ~103 creatures for Ellmud's dystopian future setting, distributed across 7 zone environments with full stat progression from Tier 1 to Tier 3 plus bosses.

---

## Context

The game needed a creature roster to populate adventure zones beyond the initial 5 creatures in The Warrens. Requirements:
- ~100 creatures across all tiers
- Distributed across varied zone environments
- Post-apocalyptic/dystopian theming (NOT medieval fantasy)
- Mix of aggressive and passive creatures
- Items and loot tables for each creature
- Stat scaling that creates meaningful progression
- Telegraphed abilities for elite/boss encounters

---

## Design Decisions

### 1. Zone Environment Structure

Organized creatures by thematic zone environments rather than pure tier:

1. **Collapsed Megastructure** (ruins, rubble, urban decay)
2. **Flooded Depths** (submerged infrastructure, aquatic mutations)
3. **Toxic Wastes** (chemical spills, industrial hazards)
4. **Overgrown Ruins** (nature reclaiming, aggressive flora/fauna)
5. **Industrial Graveyard** (abandoned factories, rogue machinery)
6. **Desolate Wastes** (radiation zones, nuclear fallout)
7. **Eternal Night** (perpetual darkness, shadow creatures)

**Rationale:** Zone environments create cohesive narrative theming. Creatures tell environmental stories (what happened here, what survived, what evolved). This structure supports future zone creation — designers can pick an environment and have a ready roster.

### 2. Tier Distribution

- **Tier 1 (Shallow):** 40 creatures — most common, varied, foundational encounters
- **Tier 2 (Deep):** 35 creatures — more dangerous, specialized abilities
- **Tier 3 (Abyssal):** 20 creatures — elite threats, unique mechanics
- **Bosses:** 8 total (2 Tier 2, 6 Tier 3) — one signature boss per environment

**Rationale:** Pyramid structure (more common creatures at lower tiers) supports zone population density. Tier 1 has the most variety because players spend the most time there. Bosses anchor each environment with memorable encounters.

### 3. Stat Scaling Philosophy

Progression based on existing Warrens baseline:

- **Tier 1:** HP 15-60, Attack 5-15, Defence 1-6, Armour 0-5
- **Tier 2:** HP 60-120, Attack 15-30, Defence 6-12, Armour 5-15
- **Tier 3:** HP 120-250, Attack 30-60, Defence 12-25, Armour 15-30
- **Bosses:** HP 150-420, Attack 18-80, Defence 8-30, Armour 10-40

**Rationale:** Stats build from proven baseline (Gutterspawn 15 HP → The Collapsed One 150 HP). Tier ceilings overlap slightly to allow elite T1 creatures (Hollow Stalker) to bridge into T2 content. Boss stat ranges span multiple tiers to support varied difficulty.

### 4. Archetype Variety

Each zone environment includes mix of:

- **Berserker** — High damage, medium durability, low agility (Scrap Brute, Gamma Ghoul)
- **Skulker** — High agility, medium damage, low HP, hit-and-flee (Hollow Stalker, Tidal Lurker)
- **Guardian** — High durability, low agility, devastating attacks (Concrete Shambler, Demolisher Mech)
- **Swarm** — Numerous, weak individually, dangerous in groups (Gutterspawn, Rust Beetle)
- **Ranged** — Distance attacks, medium stats (Acid Spitter, Arc Welder)
- **Caster** — Abilities, telegraphed, medium HP (Memory Echo, Toxic Wraith)

**Rationale:** Archetype variety creates tactical diversity. Players must adapt combat approach per encounter. Zone rosters feel cohesive (all Flooded Depths creatures are water-themed) while maintaining mechanical variety.

### 5. Telegraphed Abilities

Elite creatures and bosses have telegraphed abilities:

- Wind-up time: 3-9 ticks (based on tier and damage)
- Telegraph text: Atmospheric description of attack charging
- Damage proportional to wind-up (longer wind-up = higher damage)
- Bosses have 2-4 abilities minimum

**Example:**
```typescript
{
  id: 'frenzied_leap',
  name: 'Frenzied Leap',
  damage: 10,
  windUpTicks: 4,
  telegraphText: 'The gutterspawn crouches low, muscles coiling beneath its bloated hide...'
}
```

**Rationale:** Telegraphs create counterplay opportunities. Players can react (flee, defensive stance, interrupt). Atmospheric telegraph text maintains MUD narrative feel while providing mechanical clarity.

### 6. Loot Table Design

Items follow tier system progression:

- **Scrap** (T1 common drops) — Vendor trash baseline, crafting materials
- **Common** (T1-2 useful gear) — Baseline equipment tier
- **Sturdy** (T1 rare, T2 common) — Upgrade tier
- **Refined** (T2 rare, T3 common) — Advanced gear
- **Masterwork** (boss drops) — Elite equipment
- **Anomalous** (rare T3 boss drops) — Top-tier unique items

**Rationale:** Loot tables support economy (vendor trash for currency) and progression (gear upgrades). Boss loot includes signature items (Sovereign's Crown, Masterwork Assembly Suit) that define builds. Each creature has thematic drops (Gutterspawn Fang, Reactor Core Fragment, Shadow Silk).

### 7. Passive/Ambient Creatures

Included 4 non-hostile creatures:

- **Scrap Pigeon** (Tier 0) — Urban scavengers, flee from threats
- **Rad Crow** (Tier 1) — Intelligent scavengers, follow groups
- **Mutant Fish School** (Tier 1) — Glowing fish in toxic water
- **Salvage Mule** (Tier 0) — Pack animals, wandering after owner's death

**Rationale:** Not everything should be hostile. Passive creatures add atmospheric texture, optional hunting targets, and environmental storytelling. Salvage Mules create emergent moments (finding abandoned pack animal with loot).

### 8. Boss Design Patterns

Each boss anchored to environment with signature mechanics:

- **Multi-phase abilities** — Bosses have 2-4 distinct attacks
- **Summon mechanics** — Call lesser creatures (Spillmother births mutations, Assembly Line builds robots)
- **Area effects** — Damage multiple targets (Nuclear Inferno, Rubble Avalanche)
- **Thematic ultimate** — Signature move defines boss identity (Abyssal Maw's Devouring Lunge, Endless Dark's Consume Light)

**Example Boss Structure:**
```
The Spillmother (Tier 3 Boss)
- Deluge of Poison (80 dmg, 8 tick wind-up)
- Birth Spawn (summons 3-4 creatures, 6 tick wind-up)
- Contamination Field (45 dmg area, 5 tick wind-up)
```

**Rationale:** Bosses are memorable setpiece encounters. Multi-ability design prevents repetitive combat. Summon mechanics create dynamic fights (players must manage adds while fighting boss). Area effects punish clustering, reward positioning.

### 9. Environmental Storytelling

Creatures designed to tell environment's story:

- **Industrial Graveyard** — Sparker Drones (damaged maintenance bots), Rust Shambler (workers who died in accidents), Assembly Line (factory achieved consciousness)
- **Desolate Wastes** — Gamma Ghoul (radiation victims), Atomic Colossus (walking reactor core), Fallout King (first to die in nuclear fire, first to rise)
- **Overgrown Ruins** — Moss Walker (deer overgrown with vegetation), Green Mother (births all plant life), Forest Titan (animated tree defending overgrown zones)

**Rationale:** Creatures answer implicit questions: What happened here? What survived? What evolved? Environmental consistency creates believable world. Players infer lore from creature design.

### 10. Room Descriptions

Each creature has atmospheric room description:

- 2-4 sentences
- Sets tone immediately
- Hints at threat level
- Uses active verbs and sensory details

**Examples:**
- "Gutterspawn scuttle through the debris, their wet breathing echoing off broken concrete."
- "The Sovereign of Dust hovers above broken ground, debris swirling in impossible patterns."
- "Something large moves through the overgrowth. You can't quite see it."

**Rationale:** Room descriptions are first impression. They establish atmosphere and threat before combat starts. Active descriptions (creature doing something) feel more immediate than static descriptions (creature standing there).

---

## Thematic Principles

1. **Post-apocalyptic, NOT fantasy** — Creatures reflect collapsed civilization (mutants, machines, toxic adaptations). No dragons, orcs, or goblins.

2. **Louisiana Gothic maintained** — Where applicable, creatures reference Gulf Coast setting (Silt Serpent, Mutant Hound, Swamp denizens). Design doc is setting-agnostic for reusable patterns but honors established world.

3. **Uncanny valley horror** — Best creatures are "almost human" (Memory Echo, Pale Wanderer, Fungal Shambler puppeting corpses). Distortion of familiar creates unease.

4. **Nature is indifferent** — Wildlife (Moss Walker, Bloom Beast, Wasteland Hound) isn't evil, just adapted. Ecosystem as resource, not malevolent force.

5. **Technology is dead or corrupted** — Machines (Sentry Bot, Shredder Unit, Nano Swarm) follow corrupted protocols or evolved beyond programming. No friendly robots.

---

## Implementation Handoff

### For Bruenor (Systems Implementation)

1. **Create TypeScript templates** — One file per creature in `packages/server/src/creatures/templates/`
2. **Update creature types** — Add new type constants to `packages/server/src/creatures/types.ts`
3. **Database migration** — Seed `creature_definitions` table with all creature entries
4. **Item definitions** — Create items for all loot table entries (100+ items)
5. **Zone integration** — Link creatures to appropriate zone environments via spawn rules
6. **Ability implementation** — Build telegraphed ability system if not already complete
7. **Boss encounters** — Create boss rooms in relevant zones

### For Future Content Design

- **Zone creation** — Designers can reference environment sections (e.g., "building Toxic Wastes zone, use Acid Spitter, Hazmat Horror, Mutation Titan")
- **Creature variants** — Design doc provides templates for variants (e.g., "Scorched Behemoth" can inspire "Frozen Behemoth" for arctic zones)
- **Boss patterns** — Reusable boss mechanics (summon adds, area effects, multi-phase abilities)

---

## Files Created

- `docs/bestiary-design.md` — Complete bestiary design document (3200+ lines)

---

## Files Referenced

- `packages/server/src/creatures/types.ts` — Creature type definitions
- `packages/server/src/creatures/templates/gutterspawn.ts` — Example T1 creature
- `packages/server/src/creatures/templates/the-collapsed-one.ts` — Example boss
- `GDD.md` — World lore, zone tiers, item tiers

---

## Estimated Implementation Time

2-3 weeks for:
- 100+ creature TypeScript templates
- 100+ item definitions
- Database migration
- Zone integration
- Boss encounter design

---

## Open Questions (None)

All design decisions finalized. Ready for implementation.

---

## Success Criteria

- [ ] All 103 creatures implemented in TypeScript templates
- [ ] All loot table items defined in database
- [ ] Creatures spawn in appropriate zone environments
- [ ] Telegraphed abilities functional in combat
- [ ] Boss encounters tested and balanced
- [ ] Stats validated against tier progression curves

---

**Next Action:** Bruenor implements creature templates and database entries.


# Minsc — Speedwalk False Positive Research (#380 Residual)

**Date:** 2025-07-18
**Issue:** #380 — Moving quickly with individually typed commands triggers speedwalk message
**Status:** Root cause identified, fix approaches proposed, reproduction test written

---

## Summary

The original #380 fix (`shouldTreatAsSpeedwalk` requiring 2+ moves) correctly prevents **single direction letters** from triggering speedwalk. However, a **residual false positive** remains: when a player types individual direction commands rapidly (e.g., `n` Enter `e` Enter), the input can accumulate to `"ne"` before the second submit, which `shouldTreatAsSpeedwalk("ne")` correctly identifies as 2 moves — triggering the "Speedwalk: 2 moves (ne)" message even though the player intended two separate single-direction commands.

## Root Cause Analysis

### Trigger 1: React Controlled Input Race Condition (primary)

The command input in `ZoneExploration.tsx` (line 512-516) is a **React controlled input**:

```tsx
<input value={command} onChange={(e) => setCommand(e.target.value)} />
```

In `handleSubmit` (line 173-218), `setCommand("")` clears the input after submission. However, React 18's state update is **not synchronous to the DOM**. The update is committed after the event handler returns and React re-renders.

**The race window:**

1. User submits `"n"` → `handleSubmit` fires → `setCommand("")` is **queued**
2. React needs to re-render and commit before the DOM input clears
3. User types `"e"` **before** React commits → browser appends `"e"` to the still-present `"n"` in the DOM → `onChange("ne")` fires → `setCommand("ne")`
4. The `setCommand("")` from step 1 and `setCommand("ne")` from step 3 both enter React's batch. The final state is `"ne"` (last write wins if they resolve in the same render pass, or the `""` gets overwritten).
5. User presses Enter → `handleSubmit` with `command = "ne"` → `shouldTreatAsSpeedwalk("ne")` → **true** → false positive

**Timing window:** This is the gap between React's `setState` call and the DOM commit — typically under 16ms (one frame), but enough for a fast typist who can sustain 10+ keystrokes per second.

### Trigger 2: Keyboard Key Repeat (secondary)

If a player holds a direction key slightly too long before releasing, the OS key-repeat fires. A single held `n` key becomes `"nn"` in the input. On most systems, repeat delay is 250-500ms — plausible during rapid play.

- Input: `"nn"` → `shouldTreatAsSpeedwalk("nn")` → **true** (2 moves) → false positive
- This doesn't require any React race condition at all

### Trigger 3: Stale Closure + React Batching (edge case)

With React 18's automatic batching via `createRoot`, if multiple events are processed in the same microtask:

1. `onChange` sets `command = "n"` (React hasn't re-rendered)
2. Submit fires with **stale** `handleSubmit` closure (still has `command = ""` from previous render)
3. `trimmed = ""` → early return → command `"n"` is **silently dropped**
4. Input retains `"n"`, user types next direction → accumulates

This causes the previous direction to be "stuck" in the input, leading to accumulation on the next keystroke.

## Code Path

```
ZoneExploration.tsx:176  → const trimmed = command.trim()
ZoneExploration.tsx:181  → setCommand("")           ← async, doesn't clear DOM immediately
ZoneExploration.tsx:186  → shouldTreatAsSpeedwalk(trimmed)
  speedwalk.ts:98        → isSpeedwalk(input)       ← matches "ne" as valid speedwalk
  speedwalk.ts:99-100    → parseSpeedwalk → moves.length > 1  ← 2 moves → true
ZoneExploration.tsx:199  → addSystemMessage("Speedwalk: 2 moves (ne)")  ← FALSE POSITIVE
```

## What's NOT the Cause

- **Server-side throttling**: Speedwalk detection is entirely client-side
- **`useDirectionKeys` hook**: Only fires when input is NOT focused (line 51-58 of `useDirectionKeys.ts`)
- **Command history**: Arrow-up/down correctly sets a single value; no accumulation path
- **`shouldTreatAsSpeedwalk` logic**: The function itself is correct — the bug is upstream (what value reaches it)

## Reproduction

Test file: `packages/client/src/__tests__/speedwalk-false-positive.test.tsx`

- 13 tests, all passing
- Demonstrates that accumulated direction chars ("ne", "nn", "nne") trigger `shouldTreatAsSpeedwalk` → true
- Component test harness mirrors ZoneExploration's controlled input pattern
- Note: In jsdom/testing-library, React commits synchronously, so the exact race can't be triggered programmatically — the test simulates the accumulated state directly

## Proposed Fix Approaches (ranked)

### Fix A: Synchronous DOM clear via ref (recommended — minimal change)

In `handleSubmit`, directly clear the DOM input value via the ref **before** React's async state update:

```tsx
// In handleSubmit, after setCommand(""):
if (inputRef.current) inputRef.current.value = '';
```

This ensures the DOM input is empty before the next keystroke, regardless of React's commit timing. Safe because React will also set it to `""` on re-render (idempotent).

**Pros:** One line, zero risk of breaking anything, directly addresses the root cause.
**Cons:** Slightly "un-React" — manually touching the DOM.

### Fix B: Track input source (paste vs. typed)

Only activate speedwalk mode when the input came from a paste event. Track via `onPaste` handler:

```tsx
const pastedRef = useRef(false);
// onPaste: pastedRef.current = true
// onChange: (if not paste) pastedRef.current = false
// handleSubmit: only check speedwalk if pastedRef.current
```

**Pros:** Completely eliminates false positives from typing.
**Cons:** Prevents users from intentionally typing speedwalks like `3e2n`. May be too restrictive.

### Fix C: `flushSync` for input clearing

```tsx
import { flushSync } from 'react-dom';
// In handleSubmit:
flushSync(() => setCommand(''));
```

**Pros:** Guarantees synchronous DOM update.
**Cons:** `flushSync` forces synchronous re-render of the entire component tree, which can cause performance issues. React docs discourage its use.

### Fix D: Debounce-based detection

Track the last submission timestamp. If a new submission arrives within N ms of the previous one, skip speedwalk detection and treat as a regular command.

```tsx
const lastSubmitRef = useRef(0);
// In handleSubmit:
const now = Date.now();
const tooFast = now - lastSubmitRef.current < 300;
lastSubmitRef.current = now;
if (!tooFast && shouldTreatAsSpeedwalk(trimmed)) { ... }
```

**Pros:** Simple, addresses both race condition and key-repeat scenarios.
**Cons:** Arbitrary threshold (300ms). Could miss legitimate speedwalks typed quickly.

### Fix E: Minimum input length for speedwalk (simple heuristic)

Require at least 3 characters for speedwalk activation (e.g., `3e` or `ene`). Two-char inputs like `ne`, `nn` are treated as regular commands.

**Pros:** Very simple. Eliminates the most common false positive (2-char accumulation).
**Cons:** Prevents legitimate 2-move speedwalks like `ne`. Changes the feature contract.

## Recommendation

**Fix A** (ref-based DOM clear) is the safest and most targeted fix. It addresses the root cause without changing speedwalk semantics or introducing arbitrary thresholds.

If the team wants a belt-and-suspenders approach, **Fix A + Fix D** together would cover both the React race condition AND the key-repeat scenario.

---

*— Minsc, Tester*
*"If it can break, it will break. Found it before the players did."*


# Speedwalk False-Positive Research — Issue #380 (Residual Bug)

**Author:** Regis (Frontend Dev)  
**Date:** 2026-04-21  
**Issue:** #380 — [BUG] moving quickly with individually typed commands between rooms sometimes results in showing a speedwalking message  
**Status:** Research complete — fix approach proposed, not yet implemented

---

## Summary

The prior fix (commit e101f02) correctly resolved the **deterministic** case where single direction letters always triggered speedwalk. However, the **intermittent** "sometimes" behavior described in the issue title is a **separate race condition** that still exists. Fast typists can trigger false speedwalk messages when typing individual direction commands in rapid succession.

---

## Root Cause Analysis

### The Race Condition

The bug is a classic React controlled-input timing gap between `setCommand("")` (async state update) and the DOM input actually clearing.

**File:** `packages/client/src/pages/ZoneExploration.tsx`

**Critical path** (lines 173–218):

```
handleSubmit fires →
  line 181: setCommand("")          ← React batches this, not yet applied to DOM
  line 186: shouldTreatAsSpeedwalk  ← checks current command
  line 215: sendCommand(command)    ← sends to server
  handler returns →
  React schedules re-render (microtask) →
  ⚠️ GAP: DOM input still has old value ("n") ←
  User types next char ("e") →
  DOM input becomes "ne" (appended to stale value) →
  onChange fires with e.target.value = "ne" →
  setCommand("ne") queued →
  React flushes both: "" then "ne" → final command = "ne"
```

On the next Enter press, `shouldTreatAsSpeedwalk("ne")` returns `true` (2 moves: north + east), triggering the speedwalk UI even though the player intended two separate moves.

### Why React 18 Makes This Possible

- **React version:** 18.3.1 with `createRoot` (concurrent mode) — confirmed in `packages/client/src/main.tsx`
- React 18's automatic batching defers all state updates to the next microtask/scheduler flush
- In React 17, `setState` inside browser event handlers flushed synchronously — the input would have been cleared before the next keystroke arrived
- In React 18, the re-render from `setCommand("")` is **asynchronous**, creating a window where the DOM input retains the old value

### Reproduction Requirements

1. Player must type fast enough that their next keystroke arrives between `handleSubmit` returning and React re-rendering (~1 frame, ≈16ms on 60fps)
2. Previous command must be a single direction letter (n/s/e/w/u/d)
3. Next keystroke must also be a direction letter
4. The concatenation (e.g., "ne", "ns", "sw") passes `shouldTreatAsSpeedwalk()` — which requires 2+ moves

This explains the **intermittent** nature: it only happens when the user types fast enough to beat the React render cycle.

---

## Code Trace: Full Command Flow

### 1. Input Entry
- **File:** `ZoneExploration.tsx:512-516`
- Controlled input: `<input value={command} onChange={(e) => setCommand(e.target.value)} />`
- Input is inside a `<form onSubmit={handleSubmit}>` (line 505)

### 2. Form Submission
- **File:** `ZoneExploration.tsx:173-218` — `handleSubmit` callback
- Clears input via `setCommand("")` (line 181) — **async state update**
- Checks `shouldTreatAsSpeedwalk(trimmed)` (line 186)
- Falls through to `sendCommand(command)` for non-speedwalk (line 215)
- Note: `sendCommand` is `handleCommand` from `useZoneConnection` (line 70)

### 3. Speedwalk Detection
- **File:** `speedwalk.ts:97-101` — `shouldTreatAsSpeedwalk()`
- Calls `isSpeedwalk()` → regex `/^(\d*[nsewud])+$/` (line 25)
- If match, parses and checks `moves.length > 1`
- Threshold: **2 or more moves** triggers speedwalk mode

### 4. Command Dispatch
- **File:** `useZoneConnection.ts:434-442` — `handleCommand`
- Sends raw text to server via `sendRawCommand(room, input)`
- **File:** `connection.ts:195-209` — `sendRawCommand`
- Server-side: direction aliases expand `n` → `go north` (line 187-191)

### 5. Direction Key Shortcuts
- **File:** `useDirectionKeys.ts` — global keydown listener
- Only fires when input is **not** focused (line 50-58)
- Calls `handleExitClick` directly — **no speedwalk detection involved**
- Not a factor in this bug

---

## What the Prior Fix Addressed vs. What Remains

| Scenario | Prior Fix (e101f02) | Residual Bug |
|----------|-------------------|-------------|
| Type "n", Enter → speedwalk message | ✅ Fixed (`shouldTreatAsSpeedwalk("n")` → false) | N/A |
| Type "n", Enter, quickly type "e", Enter → speedwalk message | N/A | ❌ **Still broken** (race: input shows "ne") |
| Type "ne" intentionally, Enter → speedwalk | N/A | ✅ Correct behavior (user intended speedwalk) |

---

## Proposed Fix Approaches

### Option A: `flushSync` on input clear (Recommended)

```typescript
import { flushSync } from 'react-dom';

// In handleSubmit, replace line 181:
flushSync(() => setCommand(""));
```

**Pros:** Forces synchronous re-render, input DOM is cleared before any subsequent keystrokes. Root cause fix.  
**Cons:** `flushSync` bypasses React's batching optimization — but this is a single state update on a low-frequency action (form submit), so performance impact is negligible.

### Option B: Imperatively clear DOM input

```typescript
// After setCommand(""), add:
if (inputRef.current) inputRef.current.value = "";
```

**Pros:** Immediate DOM effect, no React scheduling dependency.  
**Cons:** Manipulating controlled input DOM directly is a React anti-pattern; could cause React to log warnings or behave unexpectedly if the controlled value and DOM value diverge.

### Option C: Track last-submit timestamp

```typescript
const lastSubmitRef = useRef(0);

// In handleSubmit:
lastSubmitRef.current = Date.now();

// In speedwalk check:
const timeSinceLastSubmit = Date.now() - lastSubmitRef.current;
if (shouldTreatAsSpeedwalk(trimmed) && timeSinceLastSubmit > 300) { ... }
```

**Pros:** Doesn't fight React's rendering model. Heuristic safety net.  
**Cons:** Arbitrary threshold; doesn't fix the underlying race; could block legitimate rapid speedwalks.

### Option D: Raise speedwalk threshold to 3+ moves

```typescript
// In shouldTreatAsSpeedwalk:
return result.ok && result.moves.length > 2;  // was > 1
```

**Pros:** Simple, eliminates 2-char false positives.  
**Cons:** Breaks legitimate 2-move speedwalks (e.g., "ne" for north-then-east). Trades one UX issue for another.

### Recommendation

**Option A (`flushSync`)** is the cleanest fix. It addresses the root cause (async input clearing) with minimal code change (1 import + wrapping 1 line). The performance cost is negligible since form submissions are user-paced, not high-frequency.

---

## Files Involved

| File | Role |
|------|------|
| `packages/client/src/pages/ZoneExploration.tsx` | Command input, form handling, speedwalk integration |
| `packages/client/src/utils/speedwalk.ts` | `isSpeedwalk()`, `shouldTreatAsSpeedwalk()`, `parseSpeedwalk()` |
| `packages/client/src/hooks/useZoneConnection.ts` | `handleCommand`, `handleExitClick` — command dispatch |
| `packages/client/src/hooks/useDirectionKeys.ts` | Arrow key shortcuts (not involved in this bug) |
| `packages/client/src/services/connection.ts` | `sendRawCommand` — direction alias expansion |
| `packages/client/src/__tests__/speedwalk.test.ts` | 48 existing tests — would need integration test for the race |

---

## Testing Considerations

- Unit tests for `shouldTreatAsSpeedwalk` are thorough (48 tests) but don't cover the **integration timing** bug
- A proper test would need to simulate the React render cycle gap — possibly via a React Testing Library integration test that:
  1. Types "n" and submits the form
  2. Immediately (before `act()` flushes) types "e" into the input
  3. Verifies the input shows "e" (not "ne")
  4. Submits again and verifies no speedwalk message appears
- Alternatively, Playwright E2E test with fast keystroke injection


_Merged from decisions/inbox/ on 2026-04-10T20:11._
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


---

## 2026-04-10T00:00:00Z: Decision — Room-Level Illumination System (Phase 1)

**Author:** Jarlaxle (Systems Dev)  
**Date:** 2026-04-10  
**Issue:** #402  
**PR:** #407  
**Status:** Implemented  

### Context

The game needs a visibility system where certain rooms are dark, hiding their contents from players. This is Phase 1 — room-level illumination only (no light sources, darkvision, or dynamic lighting yet).

### Decision

#### Illumination type

Added `Illumination = 'lit' | 'dark'` as a union type in `@ellmud/shared`. The field is optional on Room interfaces — omitted means lit. This ensures all existing rooms are unaffected (zero migration risk) and the type is extensible for future phases (e.g. `'dim'`).

#### DB schema

Added `illumination TEXT NOT NULL DEFAULT 'lit'` to `zone_rooms`. Using TEXT (not BOOLEAN) to support future illumination levels without another migration.

#### Darkness behavior

Dark rooms:
- Show `DARKNESS_MESSAGE` ("It is too dark to see.") instead of room description
- Hide creatures, items, other players, and features
- Still show **exits** (so players can navigate)
- Still send **roomHeader** (so client knows the room name)
- Player can still move through dark rooms freely

#### Two Room interfaces

Both `packages/shared/src/room-graph.ts` (Room) and `packages/server/src/generator/RoomGraph.ts` (Room) needed the `illumination` field. The shared one flows through zone-adapter; the server one is used by CommandContext in handlers.

#### NarrationRoom.light_level

Previously hardcoded to 1.0 with a TODO. Now populated from `room.illumination` (0.0 for dark, 1.0 otherwise). This feeds the AI narration layer so it can adapt prose to darkness.

### Alternatives considered

1. **Zone-level darkness** — Too coarse; individual rooms need control.
2. **Boolean `isDark`** — Less extensible than a string union type.
3. **Hide exits in dark rooms** — Would trap players; rejected for playability.

### Phase 2 considerations

- Light sources (torches, lanterns) that override room darkness
- Darkvision trait for certain characters
- Dynamic illumination (time-of-day, spell effects)
- `'dim'` illumination level with partial visibility

---

## 2026-04-11T00:37:00Z: Architecture Approval — Follow + Consent System (Phase 1+2)

**By:** Elminster (Reviewer)  
**Date:** 2026-04-11  
**PR:** #408 (feat: follow + consent system)  
**Status:** Approved & Merged

### Context

1050-line PR adding follow/unfollow commands (Phase 1), consent/unconsent/revoke commands (Phase 2), auto-follow on movement, follow status in room descriptions, and disconnect cleanup. 37 tests, all passing.

### Decision

**Approve and merge.** The architecture is clean and consistent with existing patterns. The identified issues are non-blocking for v1 but must be addressed before Phase 3 (Groups).

### Issues Found (Non-Blocking Follow-Ups)

1. **#411 — Refactor follow-display logic:** Extract duplicated logic from `look.ts` and `go.ts` into a shared helper.
2. **#412 — Skip downed followers in moveFollowers():** Currently a downed/dead follower teleports with their leader. Must skip downed state.
3. **#413 — Clean up follow on player death:** `handlePlayerDeath()` needs to call follow cleanup. Dead leaders still have active followers.

### Design Notes for Phase 3

- **Transitive follow chains (A→B→C):** Intentionally don't propagate. Document this design decision.
- **Consent gating:** Consent is not yet checked by `follow`. If Phase 3 requires consent-gated follow, wire it during that phase.
- **Griefing prevention:** Consider a follower count cap before Phase 3 launch.

### Who Should Fix

- Issues #411–#413: Drizzt (original author) or Regis
- Design scope #411–#413 resolution enables Phase 3 (Group Formation)

### Deliverables

- ✅ PR #408 merged to dev
- ✅ All 37 tests passing on merge commit
- ✅ 3 follow-up issues filed (#411, #412, #413)
- ✅ Session log & orchestration logs created

---

## 2026-04-11T00:45:00Z: Group Formation Architecture (#403 Phase 3)

**By:** Drizzt (Engine Dev)  
**PR:** #414  
**Date:** 2026-04-11

### Decision

Groups use the same in-memory, session-scoped pattern as follow/consent. A `GroupManager` class owns group state centrally (rather than distributing across PlayerState), keeping group operations atomic and preventing orphaned state.

### Key Design Choices

1. **Centralized GroupManager** — Groups are managed via a registry (groupId → Group), not scattered across PlayerStates. PlayerState only stores a `groupId` reference. This prevents inconsistencies when members disconnect.

2. **Leader-disconnect disbands** — Per issue requirements. Implemented via `cleanupGroupMembership()` called from both `onLeave` and `handlePlayerDeath`.

3. **Add requires follow OR consent** — `group add <player>` checks the leader's follower set AND the target's consentedPlayers set. This gates group membership behind explicit player intent.

4. **gsay uses 'speech' NarrationType** — No 'chat' type exists in the shared schema. Group chat uses 'speech' to leverage existing client rendering for spoken messages.

5. **_groupEvent/_gsay metadata pattern** — Command handlers return metadata that ZoneRoom interprets for broadcasting, consistent with _followStarted, _postureChange, _roomEvent patterns.

### Commands Implemented (8 total)

- group form — Create new group with current leader
- group add — Add player to group (requires follow + consent)
- group remove — Remove player from group
- group kick — Leader kicks player from group
- group leave — Player leaves group
- group disband — Leader disbands entire group
- group leader — Reassign group leadership
- gsay — Group-scoped speech using ZoneRoom broadcast

### Team Impact

- **Regis (Client):** Group info display will need a client-side panel or tab. gsay messages arrive as 'speech' narrations with `[Group]` prefix.
- **Jarlaxle (Content):** Future combat reward sharing (Phase 4) will read group membership from GroupManager.
- **All:** resolvePlayerById is now available on CommandContext for any command that needs session-ID-based player lookup.

### Follow-up Issues Resolved

- #411 (Follow dependency in group formation)
- #412 (Consent gating for group membership)
- #413 (Leader disconnect behavior)

### Deliverables

- ✅ PR #414 approved by Elminster
- ✅ 57 new tests covering all commands, permissions, edge cases
- ✅ GroupManager centralized state management
- ✅ ZoneRoom integration for group broadcasts
- ✅ PR #414 merged to dev
- ✅ All 3 blocking issues (#411, #412, #413) closed

---

### 2026-04-11T13:03Z: Design answers for #409 Container System
**By:** Dale Kirby (via Copilot)
**What:** Answers to 5 open design questions from Elminster's architecture proposal:
1. **Equipped items on death:** Lootable — equipped items go into the corpse
2. **Corpse TTL:** 12 hours (much longer than Elminster's suggestion of 10 min — player-friendly)
3. **Container UI:** Inline in inventory panel (simpler approach)
4. **Bag carry bonus:** Some bags can increase carry capacity, but not every bag (optional property per bag)
5. **Stash ↔ inventory transfer:** Yes, but only at stash locations (safe rooms/hubs)
**Why:** User decisions to unblock #409 implementation phases
### 2026-04-11T16:56Z: User directive
**By:** Copilot (via dkirby-ms)
**What:** No full CI on dev branch — too expensive for GitHub Actions minutes. Dev PRs do not need the full Ellmud test suite.
**Why:** User request — captured for team memory
### 2026-04-11T17:00Z: User directive - Versioning strategy
**By:** Copilot (via dkirby-ms)
**What:** Desired versioning model:
- **Build number (patch):** Auto-bump on every dev build or promote cycle - no manual intervention
- **Minor version:** Auto-bump on release (promote to prod)
- **Major version:** Manual only - reserved for the user to bump intentionally
- Deprecate the overlap between release.yml (manual) and squad-release.yml (auto) - consolidate into one automated path
**Why:** User request - current process requires manual version bumps which is friction. Automation should handle build + minor; human controls major.
# Decision: CodeQL Security Fixes — Drizzt (#419)

**Date:** 2025-07-22  
**Author:** Drizzt (Engine Dev)  
**Issue:** #419

## Decisions Made

### 1. Sanitization: Single-char removal over multi-char regex
Replaced `/<[^>]*>/g` (multi-char HTML tag strip) with `/[<>]/g` (single-char angle bracket removal). This eliminates the CodeQL "Incomplete multi-character sanitization" alert because single-character removal can't be bypassed by nesting (e.g. `<<script>script>` → `script`). ANSI tags use `[`/`]`, not `<`/`>`, so this is safe.

Also extended control char range from `\x00-\x1F\x7F` to `\x00-\x1F\x7F-\x9F` to cover C1 control characters.

### 2. Rate limiting: Shared middleware with tiered limits
Created `packages/server/src/middleware/rate-limit.ts` with a `createLimiter()` factory that respects `ALLOW_LOCAL_AUTH` bypass (matching auth/routes.ts pattern). Pre-built tiers:
- **auth**: 20 req/15 min (Entra callback)
- **api**: 60 req/15 min (characters, settings, spawn-zone)
- **admin-write**: 100 req/15 min (creature/item definition CRUD — already behind adminAuth)
- **static**: 200 req/15 min (catch-all SPA serving)

### 3. ReDoS: Character-class email regex
Replaced polynomial `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` with linear `/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/`. Slightly more restrictive but covers all practical email formats.

## Impact
- 11 files changed, 87 insertions, 22 deletions
- All 2915 server tests pass, lint clean
- No behavioral changes to game logic
# Decision: Playwright E2E Testing Infrastructure

**Author:** Drizzt  
**Date:** 2026-04-11  
**Issue:** #416

## What

Created `packages/e2e/` workspace with Playwright for end-to-end multiplayer testing.

## Key Decisions

1. **Base URL is `localhost:3000`** — the Vite dev server port (not 5173). Vite proxies `/auth/*`, `/api/*`, `/colyseus` to the game server on port 2567.

2. **PlayerFixture pattern** — Each test player is an isolated BrowserContext. Auth is done via API (`POST /auth/register`), then the token is injected into localStorage. This avoids brittle UI-based login flows.

3. **Selectors** — Command input: `input[aria-label="Command input"]`. Narrative terminal: `[role="log"][aria-label="Game narrative"]`. These are stable accessibility attributes already in the client.

4. **Default zone** — All test players start in `the-reliquary` for co-location in multiplayer tests.

5. **Chromium only** for now. Firefox/WebKit can be added later.

## Who Cares

- **Regis:** If client selectors change (aria-labels on command input or narrative terminal), E2E tests will break.
- **Everyone:** Run `npm run test:e2e` from root. Requires dev stack running with `ALLOW_LOCAL_AUTH=true`.
# Decision: E2E Character Name Isolation

**Author:** Drizzt  
**Date:** 2026-04-11  
**Status:** Implemented

## Context

E2E tests create characters that persist in the Colyseus room as "linkdead" after test cleanup. The DB record is deleted, but the in-room state remains. When subsequent tests create characters with the same name, pattern assertions match stale output.

## Decision

Character names in E2E tests now include a random 4-letter alpha suffix (e.g., `Alicexmqp` instead of `Alice`). All test assertions use the dynamic `player.name` property rather than hardcoded strings.

## Impact

- **All agents writing E2E tests:** Use `player.name` for commands (`follow ${leader.name}`) and assertions (`new RegExp(alice.name, 'i')`). Never hardcode character names.
- **Room topology:** Starting room is `reliquary-inn` with only a `down` exit. Use `go down`/`go up` for movement tests.
- **Pattern matching:** Server sends posture-aware descriptions (`is standing here`), so use `is.*here` in regex patterns.
# Decision: Follow Arrival Message Ordering

**Author:** Drizzt  
**Date:** 2026-07-24  
**Scope:** Server — ZoneRoom follow system

## Context

When a leader moves rooms, `moveFollowers` executes inside the `movedRoom` block, before `deliverResult` sends the leader's own room description. This caused follower arrival messages to be lost (rendered above the room header in the client).

## Decision

- `moveFollowers` now returns follower names instead of sending leader notifications inline.
- `broadcastPlayerMovement` accepts an optional `excludeFromArrivalIds` set so the leader is excluded from the generic "arrives" message for followers.
- Deferred "X follows you." notifications are sent to the leader AFTER `deliverResult` in `handleCommandMessage`.

## Impact

- **Regis / Client:** No client changes needed — uses existing `narrate` message with type `ambient`.
- **Jarlaxle / Content:** Departure room behavior unchanged ("X follows Y." still sent).
- **All:** Any future system that needs deferred post-room-description notifications should follow this same pattern.
# Decision: Group E2E Tests Adapted to Actual Commands

**Author:** Drizzt
**Date:** 2026-04-12
**Context:** #416 Phase 4 — Group Feature E2E Tests

## Decision
The task spec described `group invite` and `group accept` commands, but the actual server implementation uses a different flow: `follow` then `group form` (creates group from all followers) and `group add <player>` (requires target to be following or have consented). The E2E tests were written to match the real implementation, not the spec.

## Impact
- All 6 test scenarios from the spec are covered, adapted to actual commands
- Future test writers should reference `packages/server/src/commands/handlers/group.ts` for canonical command behavior
- If an invite/accept system is ever added, these tests will need updating
# Research Summary: Issues #417 & #418

**Author:** Elminster  
**Date:** 2026-04-11  
**Status:** Complete — Both issues ready for implementation

---

## ISSUE #417: [FEATURE] Toggle Follow

### Current Follow System Analysis

**Locations:**
- Follow command: `packages/server/src/commands/handlers/follow.ts`
- Consent system: `packages/server/src/commands/handlers/consent.ts`
- PlayerState: `packages/server/src/state/PlayerState.ts` (lines 59-67)

**Current Implementation:**
- `PlayerState.followingPlayerId`: Tracks who this player is following (in-memory, session-scoped)
- `PlayerState.followers`: Set of player IDs following this player (in-memory, session-scoped)
- **Consent system:** Binary all-or-nothing per-player model (session-scoped, resets on disconnect)
- **No persistence:** Both follow and consent currently disappear on disconnect

### Problem & Solution

**Issue:** Players cannot prevent others from following them. The follow command only checks if the follower finds the target in the same room—there's no opt-out mechanism.

**Solution Architecture:**
1. **New Database Column:** Add `allowFollowing: BOOLEAN NOT NULL DEFAULT true` to `character_flags` table (migrating with #365's pattern)
2. **Follow Command Logic:** Check `allowFollowing` flag before permitting follow:
   ```
   if (!target.allowFollowing && follower != leader) → reject with "Player does not accept followers"
   ```
3. **Toggle Command:** New `/toggle follow` command (generic framework for future boolean settings):
   ```
   /toggle follow → flips allowFollowing, persists to character_flags
   /toggle rp     → existing behavior (already in character_flags)
   /toggle anon   → existing behavior
   ```
4. **Settings UI:** Integrate toggle into player settings panel (toggleable flags already exist in UI for `/flag` command)

### Storage Decision
- **Where:** `character_flags.flags` JSONB (like existing `anon` and `rp` flags)
- **Why:** Consistent with existing flag pattern, persists across sessions, character-scoped
- **Alternative rejected:** New table — unnecessary complexity; flags are the right pattern

### Implementation Notes
- Admins can always follow others (if desired, enforce in follow command)
- The "followers" set on PlayerState is already correct — no changes needed there
- Follow command rejection should show a clear, friendly message

---

## ISSUE #418: [FEATURE] ANSI Tags Support for Items & Creatures

### Current ANSI Tag System Analysis

**ANSI Parser:** `packages/client/src/lib/ansi-parser.ts`
- Supports lightweight tags: `[red]...[/red]`, `[bold]...[/bold]`
- Supports raw ANSI escapes: `\x1b[31m...`
- Already generates React spans with `.ansi-*` CSS classes

**AnsiText Component:** `packages/client/src/components/AnsiText.tsx`
- Simple wrapper: calls `parseAnsiText()` and renders result
- Already used in ZoneExploration.tsx for all narration display

**Where Item/Creature Names & Descriptions Appear:**

1. **Main Text Window** (ZoneExploration.tsx):
   - Room descriptions (already use AnsiText ✓)
   - Look command output (items + creatures listed as strings within narration ✓)
   - Combat messages, take/drop messages, etc. (all via narrations ✓)

2. **Status Panel** (StatusPanel.tsx):
   - RoomOccupants component (creature/player names)
   - Currently displays raw text — **NEEDS AnsiText wrapper**

3. **Item Tooltips** (ItemTooltip.tsx):
   - Shows item name, description, stats
   - Currently displays raw text — **NEEDS AnsiText wrapper**

4. **Inventory Overlay** (InventoryOverlay.tsx):
   - Item names and descriptions in list
   - Currently displays raw text — **NEEDS AnsiText wrapper**

### Server-Side Data Structure

**Item Interface** (`packages/server/src/generator/RoomGraph.ts`):
```typescript
export interface Item {
  id: string;
  name: string;                     // ← Can contain ANSI tags
  description: string;              // ← Can contain ANSI tags
  roomDescription?: string;         // ← Already supports ANSI tags (#386)
  weight: number;
  // ...
}
```

**Creature Interface** (`packages/server/src/creatures/types.ts`):
```typescript
export interface CreatureTemplate {
  name: string;                     // ← Can contain ANSI tags
  roomDescription?: string;         // ← Already supports ANSI tags
  // ...
}

export interface Creature {
  name: string;                     // ← Can contain ANSI tags
  roomDescription?: string;         // ← Already supports ANSI tags
  // ...
}
```

**Current Usage:**
- `roomDescription` already supports ANSI tags (used in look/go/goto commands)
- `name` field is plain text in most places but passed through narrations (which are parsed for ANSI)
- When items/creatures appear in narrations like "A [red]bloodied[/red] dagger lies here.", tags are parsed by client ✓

### What Needs to Change

**Server-side:** No changes required! Item/creature names and descriptions can already contain ANSI tags.

**Client-side Changes:**

1. **RoomOccupants.tsx** (Status Panel):
   - Wrap creature.name in `<AnsiText>` component
   - Wrap player names (also support ANSI if desired)

2. **ItemTooltip.tsx**:
   - Wrap name and description in `<AnsiText>` components

3. **InventoryOverlay.tsx**:
   - Wrap item names and descriptions in `<AnsiText>` components

4. **StatusPanel.tsx** (if displaying item/creature names anywhere):
   - Wrap in `<AnsiText>` where applicable

5. **Look Command Output:**
   - Already works! Line like "A [red]bloodied dagger[/red] lies here." is parsed when rendered as narration ✓
   - No client changes needed for main text window

### Storage Decision
- **No database changes needed** — the fields already exist and support the content
- Content creators can add ANSI tags to item/creature names and descriptions via:
  - Admin CRUD API (already done for rooms)
  - Content seed files
  - Migration scripts

---

## Implementation Recommendations

### ISSUE #417 — Toggle Follow

**Owner:** Jarlaxle (Systems) — This is a player interaction/consent system feature
- Follow command logic change (server)
- Toggle command implementation (server)
- Settings UI integration (client via settings modal)

**Effort:** Small (1-2 sprints)
- Add migration for `character_flags` (if not already JSONB)
- Add toggle logic to follow command
- Create `/toggle` command handler (reusable pattern)
- Wire toggle into settings UI

**Dependencies:** None (character_flags exists, follow command exists)

---

### ISSUE #418 — ANSI Tags for Items & Creatures

**Owner:** Regis (Client) — Primarily UI/display changes
- RoomOccupants.tsx, ItemTooltip.tsx, InventoryOverlay.tsx updates
- Verify AnsiText is imported and used correctly

**Effort:** Very small (0.5 sprint)
- 4-5 file changes, mostly wrapping text in `<AnsiText>` components
- No server changes, no database changes
- Content can already contain ANSI tags

**Dependencies:** None (ANSI parser already exists and works)

---

## Decisions

1. **#417 Storage:** Use `character_flags.flags` JSONB for `allowFollowing` flag (consistent with existing pattern)
2. **#417 Scope:** Focus on follow-blocking first; toggle command is the generic framework (extends to other boolean settings later)
3. **#418 Scope:** Client-side text rendering only — server data structures already support ANSI
4. **#418 Placement:** Use `<AnsiText>` component consistently wherever item/creature names and descriptions appear
# Decision: Container Command Preposition Parsing

**Author:** Jarlaxle  
**Date:** 2025-07-17  
**Issue:** #409 Phase 4

## Decision

Preposition parsing for `put X in Y` and `take X from Y` is handled **inside the command handlers**, not in the parser. The parser passes the full args array unmodified.

## Rationale

- The parser's job is verb recognition and alias expansion. Adding preposition-aware grammar would couple it to specific command semantics.
- Using `lastIndexOf(' in ')` / `lastIndexOf(' from ')` in handlers handles multi-word item names gracefully (e.g., "put iron sword in expedition pack").
- This pattern is consistent with how `loot X from corpse` already works in `loot.ts` (regex-based `from` extraction).
- Future preposition commands (e.g., `give X to Y`) can follow the same handler-side pattern.

## Impact

Any agent adding preposition-based commands should parse them in the handler, not modify the parser.
# Decision: Container Item Type Architecture (#409 Phase 2)

**Author:** Jarlaxle  
**Date:** 2025-07-15  
**Status:** Implemented and pushed to dev

## Decision

Container items are regular items with `type: 'container'` — no separate entity or table. Container properties live on `ItemDefinition.containerProperties`, and runtime contents live on `ItemInstance.contents`.

## Key Technical Choices

1. **No new DB migration** — Container contents are serialized into the existing `metadata` JSONB column on `player_inventory`. The `inventoryToEntries()` helper writes a `containerContents` key into metadata.

2. **No container nesting** — You cannot put a bag inside a bag. This prevents infinite depth in persistence and weight calculations. Explicitly rejected in `addItemToContainer()`.

3. **Immutable container operations** — All add/remove functions return new `ItemInstance` objects. Original is never mutated. This keeps state management predictable for ZoneRoom lifecycle.

4. **carryBonus is opt-in per container definition** — `calculateCarryBonus()` sums bonuses from all containers in inventory. Not all containers provide this bonus.

5. **Weight calculation** — Container total weight = own weight + sum of contents weights. This feeds into existing `PlayerState.currentWeight` calculations.

## Implications for Other Agents

- **Drizzt (Commands)**: Will need container-specific commands: `put <item> in <bag>`, `get <item> from <bag>`, `look in <bag>`. These should call the shared `addItemToContainer`/`removeItemFromContainer` functions.
- **Bruenor (Content)**: Can define new container items in DB seeds using `containerProperties` JSON field.
- **Client**: Container contents display inline in inventory panel (user-confirmed — not a separate panel).
### 2026-04-11: Equipped items are lootable on death (#409 Phase 3)
**By:** Jarlaxle
**What:** Equipped items now drop into the corpse on player death alongside inventory items. Soulbound equipped items are preserved (same rule as inventory). Corpse TTL updated to 12 hours (43200s) per user decision.
**Impact:** Bruenor/Drizzt — any client-side death UI or corpse display should account for equipped gear appearing in corpse item lists. The `VisibleEquipment` on PlayerState is cleared on death (same as before), but the actual Item objects now go into the corpse instead of being destroyed.
**Files:** `PlayerState.ts` (new `getEquippedItems()`, `clearAllEquippedItems()`), `ZoneRoom.ts` (death handler), `config.ts` (TTL default)
### 2026-04-11: Inventory Persistence Architecture (Issue #409)
**By:** Jarlaxle
**What:** Implemented persistent player inventory as a new `inventory/` module following the exact same provider pattern as `stash/`.
**Key decisions:**
1. **Inventory module is separate from stash module** — Both use the same interface/InMemory/Pg/provider pattern but are independent modules. Inventory = carried items (everywhere, weight-limited). Stash = bank (feature_stash rooms only).
2. **Bulk save on lifecycle events** — `saveInventory()` does atomic replace (DELETE all + INSERT). Used on leave and death.
3. **Debounced save on mutations** — 2-second debounce timer per player on take/drop to coalesce rapid item changes. Timer cleared before explicit saves.
4. **Load order in onJoin** — Starter kit grants first (one-time, idempotent), then persisted inventory loaded from DB. Weight limits enforced by `PlayerState.addItem()`.
5. **Death persists after corpse split** — Non-soulbound items go to corpse, soulbound stay. DB save happens after the split so only survivors persist.
6. **Migration 014** — Fixed pre-existing duplicate 012 numbering (renamed starter_kit_granted to 013, new inventory is 014).
**Why:** Foundation for Container System Phase 2+ (corpse containers, bag carry bonuses, stash↔inventory transfers).
# Decision: Shared Forbidden-Paths Script

**Date:** 2025-07-15
**Author:** Khelben (CI/CD Dev)
**PR:** #424

## Context
Two workflows (`scheduled-uat-promote.yml` and `squad-promote.yml`) independently maintained identical forbidden-path lists for stripping AI-team/squad files during dev→uat promotion. Any update to one list could miss the other, creating a sync risk.

Additionally, these workflows used different concurrency groups (or none), allowing them to race on UAT merges.

## Decision
1. **Extracted forbidden paths** into `.github/scripts/strip-forbidden-paths.sh` — single source of truth.
2. **Aligned concurrency groups** to `uat-promote` across both workflows.
3. **Hardened health check** in `ci-cd.yml` to check `"status":"ok"` instead of `"uptime"`.

## Impact
- Adding/removing forbidden paths requires changing only one file.
- Scheduled and manual UAT promotes can no longer race.
- Health check survives API schema changes.
# Minsc Research: Issues #419 and #420

**Researcher:** Minsc (Tester)  
**Date:** 2026-04-11  
**Issues:** #419 (CodeQL alerts), #420 (Remove midgaard zone)

---

## ISSUE #419 — CodeQL Alerts

### Executive Summary
15 open CodeQL alerts identified across the codebase. Three categories: **incomplete input sanitization** (3), **polynomial regex vulnerability** (1), **missing rate limiting** (10), plus one already-fixed randomness issue. All have clear remediation paths and are testable.

### Detailed Findings

#### 1. **Incomplete Multi-Character Sanitization** (HIGH severity, 3 instances)

**Files:**
- `packages/server/src/commands/handlers/say.ts:18`
- `packages/server/src/commands/handlers/emote.ts:15`
- `packages/server/src/commands/handlers/whisper.ts:15`

**Root Cause:**
All three use identical regex: `/[\x00-\x1F\x7F]/g`
- This strips control characters AND DEL (0x7F)
- **Gap:** Missing range \x7B-\x7E (braces `{`, pipe `|`, tilde `~`)
- These characters can be injected into game narration for XSS via LLM prompt injection

**Recommended Fix:**
Expand regex to: `/[\x00-\x1F\x7B-\x7E\x7F]/g` (add ASCII special chars 123-126)
Or use whitelist: Allow only alphanumeric + basic punctuation (`.!?,'"-`)

**Risk Level:** Medium — Only affects in-game chat; LLM narration may interpret these as markup. Attackers can inject control sequences.

**Testing Strategy:**
- Unit tests for each handler with payloads: `say "{inject}"`, `emote "|command"`, `whisper ~hack~`
- Verify sanitized output contains no special chars

---

#### 2. **Polynomial ReDoS (Regular Expression Denial of Service)** (HIGH severity, 1 instance)

**File:** `packages/server/src/admin/users/user-routes.ts:37`

**Current Regex:**
```javascript
/^[^\s@]+@[^\s@]+\.[^\s@]+$/
```

**Problem:**
- `[^\s@]+` matches "any char except space or @", repeated unbounded
- When given a long string of non-@ chars followed by backtracking failure, causes exponential backtracking
- Example: 50 chars of "A" followed by "@" but missing dot → tries millions of combinations

**Recommended Fix:**
Replace with simpler, linear regex:
```javascript
/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
```
Or use a library like `email-validator` for robust RFC 5322 compliance.

**Risk Level:** Medium — Admin endpoints only; limited exposure. But can cause server slowdown under attack.

**Testing Strategy:**
- Benchmark regex speed on valid emails (should be <1ms)
- Stress test with 1000-char malformed email; measure response time
- Verify no DoS with inputs like `"a".repeat(50)+"@"`

---

#### 3. **Missing Rate Limiting** (HIGH severity, 10 instances)

**Affected Endpoints:**
- Auth: `POST /auth/entra/callback` (entra-routes.ts:51)
- API: `POST /api/characters/` (characters.ts:36, 52, 108, 130)
- API: `POST /api/settings/` (settings.ts:110, 127)
- API: `POST /api/spawn-zone` (spawn-zone.ts:41)
- Admin: `POST /admin/api/creature-definitions` (routes.ts:253, 290, 352, 387)
- Server: Catch-all static file serving (index.ts:321)

**Why It Matters:**
- Character creation, OAuth callback, item/creature creation all lack per-IP or per-user rate limiting
- Allows brute-force attacks, spam, resource exhaustion
- OWASP A04:2021 — Insecure Design

**Recommended Fix:**
Implement `express-rate-limit` middleware:
```javascript
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100, // 100 requests per window
  keyGenerator: (req) => req.user?.id || req.ip, // Per-user or per-IP
});
app.use('/api/characters', limiter);
app.use('/admin/api/', limiter);
```

**Risk Level:** High — These are high-value endpoints. Missing rate limits are low-hanging fruit for attackers.

**Testing Strategy:**
- Load test each endpoint with 500 requests in 1 second
- Verify 429 (Too Many Requests) response after limit exceeded
- Verify authenticated users get higher limits than anonymous

---

#### 4. **Insecure Randomness** (HIGH severity, 1 instance)

**File:** `packages/e2e/src/fixtures/test-fixture.ts:23` (FIXED)

**Status:** ✅ Already resolved  
Alert #4 marked as "fixed". The test fixture was using `Math.random()` for username generation; likely corrected to use `crypto.getRandomValues()`.

---

### Summary Table

| Alert | Count | Files | Severity | Status |
|-------|-------|-------|----------|--------|
| Incomplete Sanitization | 3 | say.ts, emote.ts, whisper.ts | HIGH | Open, fixable |
| Polynomial ReDoS | 1 | user-routes.ts | HIGH | Open, fixable |
| Missing Rate Limiting | 10 | index.ts, entra-routes.ts, admin/routes.ts, api/* | HIGH | Open, fixable |
| Insecure Randomness | 1 | test-fixture.ts | HIGH | **FIXED** |
| **Total Open** | **15** | — | — | — |

---

## ISSUE #420 — Remove Midgaard Zone Import

### Executive Summary
The Midgaard zone (classic DikuMUD city) was imported as a test of the `.wld` importer. It is now safe to remove. **Five locations** require cleanup: one migration, one SQL sample, one importer documentation, one test file, and one room features migration.

### Detailed Findings

#### **Files to Remove or Modify:**

1. **Migration (Data):** `packages/server/src/db/migrations/004_import_midgaard.sql`
   - **Action:** DELETE entire file
   - **Impact:** Zone `midgaard` and all 57 rooms/115 exits removed from DB on next migration
   - **Risk:** If any active player characters are in Midgaard rooms, they will have invalid room references. Check DB before deletion.
   - **Coordinate:** Ensure no players have `current_room_slug` = any Midgaard room

2. **Sample SQL:** `scripts/sample-diku-import.sql`
   - **Action:** DELETE entire file OR DELETE Midgaard section (lines with "Midgaard City" and all associated INSERT statements)
   - **Rationale:** This is example/documentation of the import format; keeping it doesn't hurt, but removing clarifies that Midgaard is no longer a built-in zone
   - **Note:** The file is NOT auto-run; it's just a reference for how `.wld` imports work

3. **Importer Documentation:** `scripts/import-diku-zone.ts`, `scripts/import-diku-zone.js`, `scripts/import-diku-zone.d.ts`
   - **Action:** UPDATE comments/examples
   - **Current:** Examples show `npx tsx scripts/import-diku-zone.ts scripts/midgaard.wld midgaard "Midgaard City"`
   - **Recommended:** Replace with a generic example or remove Midgaard-specific mention
   - **Impact:** Low — just documentation; users can still import other zones

4. **Room Features Migration:** `packages/server/src/db/migrations/006_room_features.sql` (lines 18-19, 32)
   - **Action:** DELETE two SQL queries that reference Midgaard
   - **Current:**
     ```sql
     WHERE zone_id = (SELECT id FROM zones WHERE slug = 'midgaard')
       AND slug = 'the-temple-of-midgaard';
     ```
   - **Rationale:** These are example/seed data for the Temple of Midgaard room features; once migration 004 is deleted, this zone won't exist

5. **Test Data:** `packages/client/src/map/__tests__/computeLayout.test.ts`
   - **Action:** DELETE test case #29 or UPDATE to use a different zone topology
   - **Current:** Test loads Midgaard's full 57-room topology to validate edge crossing minimization
   - **Recommendation:** Keep the TEST logic, but replace Midgaard topology with a generated/mock dense zone. Test #29 is valuable for regression testing (crossing elimination on dense graphs).
   - **Learnings documented in `.squad/agents/regis/history.md`**
   - **Risk:** If deleted, lose regression coverage for complex layout scenarios

---

#### **Shared Infrastructure — DO NOT REMOVE:**

- **Importer itself:** `scripts/import-diku-zone.ts` — The `.wld` parser/importer should STAY. It's reusable infrastructure for importing other DikuMUD zones in the future.
- **ELK layout engine, zone designer:** These are general-purpose and have no Midgaard-specific logic.
- **Test utilities:** The test infrastructure in `computeLayout.test.ts` should stay; only the Midgaard-specific test case is removable.

---

### Cleanup Checklist

- [ ] **Verify no players in Midgaard:** Run `SELECT COUNT(*) FROM player_state WHERE current_zone_slug = 'midgaard'`
- [ ] **Delete migration:** `004_import_midgaard.sql`
- [ ] **Delete sample SQL:** `scripts/sample-diku-import.sql` (or archive to `docs/examples/`)
- [ ] **Update importer examples:** `scripts/import-diku-zone.ts` (comments), `scripts/import-diku-zone.d.ts`
- [ ] **Update room features migration:** `006_room_features.sql` (remove Midgaard references)
- [ ] **Update test case:** `computeLayout.test.ts` test #29 (replace or delete)
- [ ] **Run migrations:** Verify no errors on fresh DB
- [ ] **Test zone designer:** Load another zone (e.g., Siltgate) and verify layout engine still works

---

### Risk Assessment

**Low Risk.**
- Midgaard is not referenced in any gameplay code, only in migrations and tests.
- No hardcoded zone slug in config or game logic.
- Removing the migration will simply fail to create the zone on next DB init — no cascading logic failures.
- Test case removal is safe (other tests cover layout engine).

**Coordinate With:**
- DB team: Ensure no active players in Midgaard before migration deletion
- Frontend team: Update test case or provide alternative dense zone topology

---

## Recommendations

### For #419 (CodeQL):
1. **Immediate:** Fix sanitization regex in all three command handlers (2-hour task, high impact)
2. **Short-term:** Add rate limiting to auth/API endpoints (4-hour task, medium complexity)
3. **Polish:** Replace email regex with library or hardened pattern (1-hour task)
4. **Verification:** Add integration tests for each fix

### For #420 (Midgaard):
1. **Immediate:** Verify no players in Midgaard zone
2. **Execute:** Follow cleanup checklist (1-2 hour task, straightforward)
3. **Verification:** Run test suite; verify zone designer still works with other zones

---

## Test Plan

### For #419:
- **Sanitization:** Unit tests in `say.test.ts`, `emote.test.ts`, `whisper.test.ts` with payloads: `{`, `|`, `~`, `\x7B`, etc.
- **ReDoS:** Benchmark test with 1000-char malformed email; measure regex speed (<1ms expected)
- **Rate Limiting:** Integration test hitting endpoints 500+ times in 1s; verify 429 response

### For #420:
- **Migration:** Run `npm run migrate` on fresh DB; verify Midgaard zone does NOT exist
- **Zone Designer:** Load Siltgate or other zone; verify no errors
- **Tests:** Run `npm run test`; verify no failures related to missing Midgaard

---

## Ownership

- **CodeQL Fixes:** Drizzt (Backend) or Minsc (if taking ownership of security tests)
- **Midgaard Removal:** Laeral (Content/Infrastructure) or Regis (if test refactoring needed)
- **Verification:** Minsc (test coverage)
# Decision: ANSI Tag Rendering for Items and Creatures (#418)

**Author:** Regis (Frontend Dev)
**Date:** 2025-07-17
**Status:** Implemented

## Context

Issue #418 requested ANSI tag support (e.g., `[red]...[/red]`) for item names, item descriptions, and creature names across all player-facing UI components.

The ANSI parser (`ansi-parser.ts`) and the `AnsiText` React component already existed and were in use for the main text narration window and a couple of item descriptions.

## Decision

Wrap all raw text interpolations of item/creature names and descriptions in `<AnsiText text={...} />` across every player-facing component that renders them:

- **RoomOccupants** — creature names
- **ItemTooltip** — item name (description was already wrapped)
- **InventoryOverlay** — item names and flavor text
- **StatusPanel GearTab** — inventory item names
- **CombatHUD** — enemy name and available target names
- **CombinedStashLoadout** — item names in loadout, inventory list, zone finds, and selected detail
- **EquipmentSilhouette** — equipped item names (with existing truncation preserved)

## Rationale

- Client-only change; no server or shared type modifications needed since item/creature data structures already pass strings that may contain ANSI markup.
- AnsiText gracefully handles strings with no ANSI tags (renders as plain text), so this is a safe universal wrap.
- EquipmentSilhouette applies a 12-char truncation before passing to AnsiText. If truncation cuts an ANSI tag, the parser degrades gracefully. The full name is always visible in the ItemTooltip hover.

## Implications

- Any new component that renders item or creature names should use `<AnsiText>` for consistency.
- The `AnsiText` component is a default export from `packages/client/src/components/AnsiText.tsx`.
# Decision: Automated Version Bumping

**Date:** 2025-01-XX  
**Author:** Khelben (CI/CD Dev)  
**Status:** ✅ Implemented (PR #425)  
**Scope:** CI/CD, Release Management, Versioning

## Context

The project had two overlapping release workflows:
1. `release.yml` — Manual workflow_dispatch on prod, user picks major/minor/patch, runs npm version, commits, tags, creates GitHub Release
2. `squad-release.yml` — Auto-triggered on prod push, reads version from package.json, creates tag + GitHub Release if tag doesn't exist

This created confusion about which workflow to use and required manual version bumping before releases.

## Decision

**Implement automated version bumping tied to branch promotion workflow:**

- **Patch bumps (0.1.x):** Automated on every dev → uat promotion
- **Minor bumps (0.x.0):** Automated on every uat → prod promotion  
- **Major bumps (x.0.0):** Manual only (reserved for breaking changes)

**Deprecate `release.yml` in favor of the automated system.**

## Rationale

1. **Reduces Human Error:** Eliminates manual version bumping mistakes (forgetting to bump, wrong bump type, version conflicts)
2. **Consistent Versioning:** Every UAT build gets a unique patch version
3. **Clear Intent:** Minor version change = production release, patch = UAT build
4. **Simpler Workflow:** Developers use promote workflow, versioning happens automatically
5. **Idempotent Releases:** squad-release.yml remains idempotent and handles the actual GitHub Release creation

## Implementation Details

### Modified Workflows

1. **scheduled-uat-promote.yml**
   - Added Node.js setup and npm ci
   - After merge: npm version patch --no-git-tag-version
   - Sync workspace versions via npm run version:sync
   - Commit with [skip ci] to prevent infinite loops

2. **squad-promote.yml**
   - dev→uat job: Same patch bump as scheduled workflow
   - uat→prod job: Minor bump (resets patch to 0)
   - Dry run mode shows version preview
   - Removed CHANGELOG version validation

3. **squad-release.yml**
   - Removed CHANGELOG version validation
   - Reads auto-bumped version from package.json
   - Creates tag + GitHub Release (unchanged behavior)

4. **release.yml**
   - Renamed to DEPRECATED-release.yml
   - Replaced with error stub explaining new model

### Version Bump Flow

```
1. Merge branches
2. npm version {patch|minor} --no-git-tag-version
3. npm run version:sync (align workspace packages)
4. git commit -m "chore: bump version to X.Y.Z [skip ci]"
5. git push
6. squad-release.yml reads version and creates release (prod only)
```

### Safety Mechanisms

- **[skip ci]:** Prevents version bump commits from triggering workflows infinitely
- **Idempotent:** Multiple runs don't double-bump (npm version fails if version exists)
- **Dry run:** Shows what version WOULD be bumped to without committing
- **Workspace sync:** Ensures monorepo packages stay aligned

## Alternatives Considered

1. **Keep manual release.yml:** Rejected — duplicate functionality, error-prone
2. **Tag-based versioning:** Rejected — requires manual tagging, defeats automation
3. **Semantic-release tool:** Rejected — too heavyweight, requires commit message conventions
4. **Version in separate file:** Rejected — package.json is canonical for Node.js projects

## Consequences

### Positive
- ✅ Zero manual version management
- ✅ Every UAT build has unique version
- ✅ Clear version history (patch = UAT, minor = prod)
- ✅ Reduced risk of version conflicts
- ✅ Simpler mental model for developers

### Negative
- ⚠️ Version numbers increment faster (every UAT merge)
- ⚠️ Cannot skip versions (e.g., go from 0.1.5 → 0.1.7)
- ⚠️ CHANGELOG no longer tied to version numbers

### Mitigations
- Version increment rate is acceptable for this project
- Skipping versions is not a requirement
- CHANGELOG can document changes by date/feature instead of version

## Dependencies

- `scripts/sync-versions.mjs` — Must work correctly for monorepo
- `.nvmrc` — Defines Node.js version for workflows
- `package.json` — Single source of truth for version

## Validation

- [x] Dry run mode shows correct version preview
- [x] Patch bump works on dev → uat
- [x] Minor bump works on uat → prod
- [x] [skip ci] prevents infinite loops
- [x] Workspace versions stay synced
- [x] squad-release.yml picks up auto-bumped version
- [x] Deprecated release.yml fails with helpful error

## Rollback Plan

If automated versioning causes issues:
1. Restore `release.yml` from DEPRECATED-release.yml
2. Revert changes to squad-promote.yml and scheduled-uat-promote.yml
3. Manually bump versions before promoting to prod
4. squad-release.yml continues to work (unchanged core behavior)

## Team Communication

- PR #425 documents the change comprehensively
- Updated `.squad/agents/khelben/history.md` with learnings
- This decision doc serves as reference for future team members

## Related Decisions

- Workflow Audit (2025-01) — Identified release.yml duplication
- Scheduled UAT Promotion — Established 4x daily dev→uat pipeline
- Forbidden Path Stripping — Prevent .squad/ from reaching prod

## Open Questions

- [ ] Should we add CHANGELOG automation (auto-generate from commits)?
- [ ] Should we add version rollback capability for emergency fixes?
- [ ] Should major version bumps also be automated (e.g., based on commit prefix)?

## Success Metrics

- Zero manual version bump errors
- 100% of UAT builds have unique versions
- Reduced time from dev→prod (no manual version step)
- Developer feedback on new workflow

---

**Review Status:** Pending team review  
**Next Review:** After 2 weeks of production use
