# Combat Grid System — Unified Design Proposal
**Issue:** [#337](https://github.com/dkirby-ms/ellmud/issues/337) — Feature idea: in-room combat represented by sprites in a grid (DCSS style)  
**Author:** Elminster (Lead/Architect)  
**Contributors:** Jarlaxle (Systems), Regis (Frontend), Laeral (Visual Design)  
**Date:** 2026-01-25  
**Status:** DESIGN PROPOSAL — AWAITING DECISION

---

## Executive Summary

Three team members have completed comprehensive research on implementing DCSS-style grid-based tactical combat for Ellmud. This proposal synthesizes their findings into a unified architectural recommendation.

**The verdict: This is a technically viable Phase 2+ feature with significant implementation cost and risk. Recommend SPIKE first, then decide.**

### Key Findings

**What aligns across all three analyses:**
- Grid combat is **mechanically sound** and integrates cleanly with existing tick-based combat and position systems
- **Canvas 2D rendering** with DCSS CC0 tiles is the right technical approach
- Grid must be **optional and supplementary** — text-first combat remains fully functional
- **8×8 to 12×12 grid dimensions** scale appropriately for 1-20 player encounters
- Server-authoritative grid state with backward compatibility is achievable
- Implementation requires **3-phase approach**: minimal grid → tactical depth → visual polish

**Critical risks identified:**
1. **Text-mode rendering challenge** — Can we make grid state readable in a text interface?
2. **Performance at scale** — 20 players + 10 creatures with pathfinding/LOS per 1s tick
3. **Content design complexity** — Manual spawn placement and obstacle design for every grid room
4. **Development time** — 8-14 weeks minimum for functional grid system
5. **User acceptance** — Does the MUD community want this, or does it break immersion?

**Recommendation:** **SPIKE → GO/NO-GO GATE → PHASE 1 (if approved)**

---

## 1. Research Summary by Domain

### 1.1 Game Systems (Jarlaxle)

**Strengths:**
- Existing tick-based combat loop (1s resolution) provides perfect foundation for grid integration
- Current position zone system (Front/Flank/Rear) can be **derived from grid coordinates** for backward compatibility
- Server-authoritative state model naturally extends to grid positions
- Movement costs (1 action = 1 tile) fit cleanly into tick budget

**Proposed mechanics:**
- **Grid dimensions:** 8×8 (small), 10×10 (standard), 12×12 (boss arenas) — variable per room
- **Coordinate system:** x-y with zone derivation (Front = y≤3, Flank = 4-6, Rear = 7+)
- **Movement:** 1 tile per action, orthogonal + diagonal allowed, no multi-tile moves in Phase 1
- **Range:** Chebyshev distance (max of Δx, Δy) with weapon-based limits (melee=1, ranged=5-10)
- **Creature AI:** A* pathfinding with 10-tile depth limit, path caching for 3-5 ticks

**Phase 1 simplifications:**
- No line-of-sight blocking (all in-range targets hittable)
- No cover mechanics
- No facing/flanking bonuses
- Text coordinates only ("You are at (5,3). Goblin at (4,1).")

**Open questions:**
- AoE telegraphs on grid — cone/circle or zone-based?
- Entity collision — allow overlap or block?
- Spawn camping mitigation?

### 1.2 Frontend Implementation (Regis)

**Strengths:**
- DCSS tiles are CC0-licensed and proven in web environment (crawl/tiles repo)
- HTML5 Canvas 2D is perfect fit — simple, fast, no library dependencies
- React + WebSocket architecture already in place
- Grid can replace minimap widget during combat (clean UI integration)

**Technical approach:**
- **Rendering:** Canvas 2D with sprite sheets (32×32px tiles)
- **Tile library:** Start with rot.js for rapid prototyping (15KB, optional dependency)
- **Layout:** Grid in right panel (desktop), overlay modal (tablet), optional full-screen (mobile)
- **WebSocket protocol:** `combat:grid:init`, `combat:grid:move`, `combat:grid:damage`, `combat:grid:remove`
- **State sync:** Server-authoritative, client renders from server messages (no client-side prediction in Phase 1)

**Accessibility priorities:**
- Text parity requirement — all grid events logged in text feed
- Keyboard navigation (arrow keys, tab cycling)
- High-contrast mode for colorblind users
- Screen reader support via aria-labels and combat log

**Performance targets:**
- 60fps rendering for 400-tile grid + 20 entities
- Canvas 2D can easily handle this (DCSS webtiles is proof)

**Phase plan:**
- **Phase 1 (1-2 weeks):** Canvas prototype with hardcoded test data, sprite sheet loader, toggle button
- **Phase 2 (2-3 weeks):** Server integration, real-time WebSocket sync, basic animations
- **Phase 3 (1-2 weeks):** Polish, keyboard nav, high-contrast mode, performance tuning

### 1.3 Visual Design (Laeral)

**Strengths:**
- Clear visual hierarchy system for creature representation (silhouette + color + size)
- Zone-specific environmental tilesets maintain thematic consistency
- Fog-of-war design respects existing awareness/stealth mechanics
- Pixel art aesthetic (32×32px) fits dark extraction-horror setting

**Design principles:**
- **Grid enhances, never replaces** — text-first identity preserved
- **Toggleable and optional** — not mandatory for combat
- **Instant readability** — creature type/threat/state visible at a glance
- **Faction-themed palettes** — Kindari (grey/rust), Bloom (green/teal), Calliope (purple/gold)

**Creature visual encoding:**
- **Silhouette:** Humanoid (corrupted), Bestial, Swarming, Amorphous, Construct
- **Color saturation:** Threat level + HP state (healthy=saturated, dying=desaturated)
- **Size:** T1-T3 = 1×1 cell, T4+ bosses = 2×2+ cells
- **State overlays:** Wounds, status effects, disposition badges (🔴 hostile, 🟡 alert, 🔵 fleeing)

**Environmental tiles:**
- Terrain types encode mechanical effects (rubble=slow, corrupted ground=HP regen debuff)
- Hazard markers (toxic gas, spikes, lava) with animation
- Zone theming (Kindari concrete/rust, Bloom bioluminescence, Calliope ritual tiles)

**Fog-of-war approach:**
- Direct LOS = fully visible
- Off-LOS = ghosted outline (50% opacity)
- Undetected stealth = shimmer or question mark (if player has awareness)
- Sound cues = sound wave radiants on grid

---

## 2. Where the Proposals Align

All three research documents converge on these core design decisions:

1. **Grid is optional and supplementary** — Can be disabled, text combat remains fully functional
2. **Server-authoritative positioning** — Client renders server state, no client-side prediction
3. **Canvas 2D rendering** with DCSS CC0 tiles (not WebGL, not SVG, not ASCII-in-DOM)
4. **8-12 tile grid dimensions** variable per room type
5. **1 tile = 1 action movement cost** integrated into existing tick loop
6. **Backward compatibility** via zone derivation from grid coordinates
7. **Phased implementation** with go/no-go gate after Phase 1 spike
8. **Performance is acceptable** if properly optimized (distance matrix caching, path caching)

---

## 3. Where the Proposals Diverge (Conflicts Resolved)

### 3.1 Text-Mode Rendering Strategy

**Divergence:**
- Jarlaxle: Phase 1 uses text coordinates only ("You are at (5,3)")
- Regis: Phase 1 includes Canvas prototype with visual tiles
- Laeral: Assumes visual grid from start (pixel art design focus)

**Resolution (Elminster):**
Phase 1 MUST include both:
- **Text coordinates** in combat log for non-visual clients
- **Canvas visual prototype** to validate the concept
- Text parity requirement means grid state must be **comprehensible from text alone**
- If ASCII grid rendering proves necessary, add it in Phase 1.5 before committing to Phase 2

### 3.2 Line-of-Sight and Fog-of-War

**Divergence:**
- Jarlaxle: Defer LOS to Phase 2, Phase 1 has no blocking
- Regis: Mentions FOV as Phase 3 stretch goal (rot.js has algorithms)
- Laeral: Fog-of-war is essential from start for tension/stealth mechanics

**Resolution (Elminster):**
- **Phase 1:** No LOS blocking, full grid visibility (simplest)
- **Phase 2:** Add LOS raycasting + fog-of-war together (they're coupled)
- **Rationale:** Fog-of-war without LOS blocking is just cosmetic. Implement both or neither.
- Laeral's stealth/awareness concerns are valid but not MVP-critical. Phase 1 proves the grid concept; Phase 2 adds tactical depth.

### 3.3 Mobile Support

**Divergence:**
- Regis: Start with mobile disabled (Option A), add full-screen overlay if demanded
- Laeral: Assumes mobile works (mentions touch controls, responsive tiles)

**Resolution (Elminster):**
- **Phase 1:** Desktop only, gracefully disable on mobile (show text coordinates)
- **Phase 2:** Evaluate mobile demand before investing in touch UI
- Mobile MUD players are accustomed to text. Don't solve a problem that may not exist.

### 3.4 Animation Complexity

**Divergence:**
- Regis: Minimal animations in Phase 1 (optional swooshes), polish in Phase 3
- Laeral: 2-4 frame creature animations from start (idle breathing, movement tween)

**Resolution (Elminster):**
- **Phase 1:** Static grid, no animations (fastest path to validation)
- **Phase 2:** Movement tweens only (200ms ease-out, essential for readability)
- **Phase 3:** Death fades, attack effects, floating damage numbers
- Laeral's 2-frame idle loops can be added in Phase 3 polish. Phase 1 must be ruthlessly minimal.

---

## 4. Architectural Integration

### 4.1 Data Model Changes

**New database columns (backward-compatible):**
```sql
ALTER TABLE zone_rooms
  ADD COLUMN grid_width INTEGER DEFAULT NULL,
  ADD COLUMN grid_height INTEGER DEFAULT NULL,
  ADD COLUMN obstacles JSONB DEFAULT NULL; -- [{x, y}]
```

**New TypeScript interfaces:**
```typescript
export interface GridPosition {
  x: number; // 0-indexed
  y: number; // 0-indexed
}

export interface Combatant {
  // ... existing fields
  gridPosition?: GridPosition; // Present if room has grid
  position: PositionZone;      // Derived from gridPosition for backward compat
}

export interface GridCombatState {
  gridWidth: number;
  gridHeight: number;
  obstacles: GridPosition[];
  entityPositions: Map<string, GridPosition>;
}

export interface CombatEncounter {
  // ... existing fields
  gridState?: GridCombatState;
}
```

**Zone derivation logic:**
```typescript
function deriveZoneFromGrid(gridPos: GridPosition, gridHeight: number): PositionZone {
  const frontThreshold = Math.floor(gridHeight / 3);
  const rearThreshold = Math.ceil(gridHeight * 2 / 3);
  
  if (gridPos.y < frontThreshold) return 'front';
  if (gridPos.y >= rearThreshold) return 'rear';
  return 'flank';
}
```

### 4.2 Tick Loop Integration

**Modified combat tick sequence:**
1. **Movement resolution** — Process `queuedActions` with `action: 'move'`, validate pathing, update `gridPosition`, derive `position` zone
2. **Ability resolution** — Range checks use `getDistance(attacker.gridPosition, target.gridPosition)` + weapon type
3. **Auto-attacks** — `canReachTarget()` checks grid distance instead of zone logic (if `gridPosition` present)
4. **Creature AI** — A* pathing toward highest-threat unreachable target, move 1 tile, update position
5. **State broadcast** — Include `gridPosition` in combat state messages

**Performance optimization:**
```typescript
// Cache distance matrix per tick (O(n²) once, then O(1) lookups)
const distanceCache = new Map<string, number>();

for (const a of combatants) {
  for (const b of combatants) {
    const key = `${a.id}-${b.id}`;
    distanceCache.set(key, getDistance(a.gridPosition, b.gridPosition));
  }
}
```

**Profiling target:** <100ms per tick with 20 players + 10 creatures (900 range checks)

### 4.3 Backward Compatibility Strategy

**Three deployment scenarios:**
1. **Old room (no grid), new client** → Zone-based combat, no grid rendered ✅
2. **New room (grid), old client** → Server sends `gridPosition`, old client ignores it, reads `position` zone ✅ (degraded but functional)
3. **Mixed rooms in zone** → Grid state per-room, transitions clean ✅

**Content migration path:**
- Existing rooms remain zone-based (grid columns NULL)
- New boss fights opt into grid (set `grid_width/height`, place spawn points)
- Gradual rollout — no flag day, no breaking changes

---

## 5. Implementation Plan (Phased Approach)

### Phase 0: SPIKE (1 week) — **REQUIRED BEFORE COMMITMENT**

**Goal:** Validate the two critical unknowns before investing 8-14 weeks.

**Deliverables:**
1. **ASCII grid renderer prototype** in combat log (box-drawing characters, entity letters)
   - Can players comprehend grid state from text alone?
   - Conduct blind playtest with 3-5 MUD players (no visual grid)
2. **Canvas grid prototype** with 5 test creatures on 10×10 grid
   - Does pixel art fit Ellmud's dark aesthetic?
   - Is 32×32px tile size readable at typical desktop resolution?
3. **Performance benchmark** — Simulate 20 players + 10 creatures, measure tick time with:
   - Distance matrix calculation (900 checks)
   - 10 A* pathfinding runs (10-tile depth)
   - Target: <100ms per tick

**Go/No-Go criteria:**
- ✅ Text-mode grid is comprehensible without visual aid
- ✅ Visual grid enhances tactical awareness (playtester feedback)
- ✅ Performance target met (<100ms tick with 30 entities)
- ❌ Any criterion fails → **DEFER to post-1.0 with graphical client**

**Investment:** 1 week engineer time (Regis frontend + Jarlaxle backend). Low risk.

---

### Phase 1: Minimal Viable Grid (3-4 weeks) — **ONLY IF SPIKE PASSES**

**Scope:**
- Server: `gridPosition` on `Combatant`, grid dimensions on rooms, movement action queuing
- Server: Basic creature A* pathfinding (no LOS, no cover)
- Server: Range validation with Chebyshev distance + weapon types
- Client: Canvas grid renderer with sprite sheets (rot.js or custom)
- Client: Text coordinate output ("You at (5,3), Goblin at (4,1)")
- Client: Grid toggle button, replaces minimap during combat
- Client: Click entity to select target (sync with CombatHUD)
- Content: Convert 1-2 boss rooms to grid (manual spawn placement)

**Explicitly excluded:**
- Line-of-sight blocking
- Cover mechanics
- Facing/flanking bonuses
- Animations (static grid updates only)
- Mobile support (desktop only)
- ASCII grid in terminal (defer if text coordinates suffice)

**Success criteria:**
- 20-player + 10-creature boss fight runs at <100ms per tick ✅
- Boss fight feels **more tactically interesting** than zone-based (playtester survey) ✅
- No regressions in non-grid rooms ✅
- Text-mode players can participate effectively (accessibility test) ✅

**Go/No-Go gate:** After Phase 1 complete, evaluate:
1. Performance acceptable?
2. Grid enhances tactics (not just visual noise)?
3. Content designers can create grid rooms efficiently?
4. Text parity maintained?

**If ANY answer is "no" → PARK FEATURE, revisit post-1.0.**

---

### Phase 2: Tactical Depth (4-6 weeks) — **ONLY IF PHASE 1 APPROVED**

**Scope:**
- Line-of-sight raycasting (blocks ranged attacks through obstacles)
- Cover mechanics (+20% dodge chance behind pillars/crates)
- Facing/flanking (attacking from behind = +15% damage)
- Fog-of-war (entities beyond LOS appear ghosted)
- Cone/circle telegraph shapes (raycasting to determine affected tiles)
- ASCII grid renderer in combat log (for text-only clients)
- Creature formation AI (coordinated positioning)
- Mobile overlay (full-screen grid, opt-in for advanced users)

**Success criteria:**
- LOS/cover system adds tactical depth without exploitability ✅
- Fog-of-war enhances tension (stealth, awareness mechanics work) ✅
- ASCII grid is readable for text clients ✅
- Performance remains <100ms per tick ✅

---

### Phase 3: Visual Polish (8-12 weeks, stretch goal) — **POST-LAUNCH CANDIDATE**

**Scope:**
- Full DCSS CC0 tileset integration (200+ creature/item/terrain tiles)
- Smooth animations (movement tweens, attack swooshes, death fades)
- Visual telegraphs (red highlight on affected tiles)
- Floating damage numbers, status effect icons
- High-contrast accessibility mode
- Keyboard navigation polish (arrow keys, spatial selection)
- Mobile pinch-to-zoom support
- Faction-themed tilesets (Kindari/Bloom/Calliope palettes)

**Success criteria:**
- Visual grid is **delightful and polished** (production-quality UX) ✅
- Accessibility audit passes (WCAG 2.1 AA) ✅
- Mobile experience is smooth (or gracefully disabled) ✅

---

## 6. Top Risks and Mitigation

### Risk 1: Text-Mode Rendering Is Unreadable
**Severity:** HIGH — This is the feature's fundamental viability question.  
**Likelihood:** MEDIUM — ASCII grids work for traditional roguelikes, but Ellmud's prose focus is different.

**Mitigation:**
- SPIKE Phase validates text comprehension before commitment
- ASCII grid renderer as fallback if coordinates alone insufficient
- Text parity requirement enforced at code review level

**Contingency:** If text rendering fails validation → **DEFER to post-1.0 graphical client.**

---

### Risk 2: Performance Degrades with 20-Player Raids
**Severity:** HIGH — Ellmud's identity includes large-scale group PvE.  
**Likelihood:** MEDIUM — 900 distance checks + 10 A* pathfinding runs per tick is non-trivial.

**Mitigation:**
- Distance matrix caching (O(n²) once per tick, then O(1) lookups)
- Path caching (creatures commit to path for 3-5 ticks)
- Defer LOS raycasting to Phase 2 (Phase 1 has no blocking)
- SPIKE Phase includes performance benchmark

**Contingency:** Cap grid-enabled encounters at 10 players, or disable grid for 20-player content.

---

### Risk 3: Content Design Complexity Explosion
**Severity:** MEDIUM — Manually placing spawn points/obstacles for every grid room is tedious.  
**Likelihood:** HIGH — This is unavoidable grunt work.

**Mitigation:**
- Make grid combat **opt-in per room** (most rooms stay zone-based)
- Start with boss fights only (5-10 grid rooms vs 291 total rooms)
- Build editor tooling (zone designer grid placement UI)
- Procedural spawn placement for standard rooms (Phase 2 feature)

**Contingency:** If design burden too high → keep grid exclusive to boss/setpiece encounters.

---

### Risk 4: User Rejection / Immersion Break
**Severity:** MEDIUM — MUD purists may see grid as "not a real MUD."  
**Likelihood:** LOW-MEDIUM — Depends on community composition.

**Mitigation:**
- Grid is **optional and toggleable** (can be completely disabled)
- Text-first experience preserved (grid supplements, not replaces)
- Early playtester feedback in SPIKE Phase
- Frame as "tactical overlay" not "fundamental change to combat"

**Contingency:** If community backlash → make grid opt-in per player (user setting, default OFF).

---

### Risk 5: Development Time Underestimated
**Severity:** MEDIUM — 8-14 weeks is a significant investment.  
**Likelihood:** MEDIUM — Scope creep is common in "make it pretty" features.

**Mitigation:**
- Ruthlessly enforce phase boundaries (no Phase 2 features in Phase 1)
- SPIKE Phase front-loads risk discovery
- Tight go/no-go gates (clear exit criteria)
- Phase 3 is explicitly post-launch stretch goal

**Contingency:** If Phase 1 takes >4 weeks → reevaluate priority vs other roadmap items.

---

## 7. Open Questions for dkirby-ms

These require product/design decisions before proceeding:

### Q1: Is Grid Combat a Phase 1 (Pre-Launch) or Phase 2 (Post-Launch) Feature?
- **Context:** Phase 1 MVP is already scoped (see GDD). Grid adds 8-14 weeks to timeline.
- **Options:**
  - **Pre-launch:** Grid is core to Ellmud's tactical identity, worth delaying launch
  - **Post-launch:** Grid is polish, launch without it, add later based on player demand
- **Recommendation:** **Post-launch.** Zone-based combat is tactically sound. Grid is enhancement, not requirement.

### Q2: What Is Your Tolerance for Text-Mode Rendering Awkwardness?
- **Context:** ASCII grids may feel clunky compared to visual tiles.
- **Spectrum:**
  - **High tolerance:** Text coordinates + occasional ASCII grid is acceptable
  - **Low tolerance:** If visual grid isn't smooth, don't ship feature
- **Recommendation:** Validate in SPIKE Phase playtest. Let user feedback decide.

### Q3: Should Grid Be Opt-In (User Setting) or Opt-Out (Default Enabled)?
- **Context:** Affects new player onboarding and community perception.
- **Options:**
  - **Default ON:** Grid is flagship feature, showcase it immediately
  - **Default OFF:** Preserve text-first identity, let interested users enable
- **Recommendation:** **Default ON** for grid-enabled rooms (with clear toggle). If grid passes Phase 1 quality bar, it should be showcased.

### Q4: Are You Willing to Commission Custom Pixel Art, or Must We Use CC0 DCSS Tiles?
- **Context:** DCSS tiles are free but generic. Custom art ensures thematic fit.
- **Cost:** ~$500-1500 for custom tileset (50-100 creatures + terrain + UI).
- **Recommendation:** Start with DCSS CC0 tiles in Phase 1-2. Commission custom art in Phase 3 if feature proves successful.

### Q5: What Is the Minimum Success Criterion for Grid Combat?
- **Context:** When do we declare this feature "good enough to ship"?
- **Proposed criterion:** "Boss fights feel more tactical than zone-based, and text-mode players report no accessibility loss."
- **Your criterion?** (This gates the go/no-go decision.)

---

## 8. Recommendation

**Elminster's verdict: BUILD IT, but with strict gates.**

### Implementation Path

**Step 1: SPIKE (1 week)**
- Validate text rendering + performance + visual aesthetic
- Budget: 40 engineer-hours (Regis + Jarlaxle)
- Risk: Low (1 week investment, clear exit criteria)

**Step 2: Go/No-Go Decision (Based on SPIKE results)**
- Pass → Proceed to Phase 1
- Fail → Park feature, revisit post-1.0

**Step 3: Phase 1 (3-4 weeks, if SPIKE passes)**
- Minimal viable grid on 1-2 boss rooms
- Budget: 120-160 engineer-hours
- Risk: Medium (performance, text parity, content design)

**Step 4: Go/No-Go Decision (Based on Phase 1 results)**
- Pass + community approval → Proceed to Phase 2
- Pass but low priority → park until post-launch
- Fail → revert, feature stays in branch

**Step 5: Phase 2-3 (Post-Launch, If Approved)**
- Add tactical depth (LOS, cover, fog-of-war)
- Polish animations and accessibility
- Expand to more rooms based on player demand

### Why This Is the Right Call

**Pros:**
- Grid combat **is mechanically sound** — all three analyses agree on feasibility
- Technical approach is **proven** (DCSS webtiles, Canvas 2D, Colyseus WebSocket)
- Risk is **front-loaded** (SPIKE Phase validates before heavy investment)
- Backward compatibility **preserves existing work** (no breaking changes)
- Phased approach allows **early exit** if any phase fails validation

**Cons:**
- **8-14 weeks development time** (significant opportunity cost)
- Text-mode rendering **unproven** (SPIKE Phase is critical)
- Content design burden **increases** (manual spawn placement)
- Community reception **uncertain** (may be seen as "not MUD enough")

**The key question:** Is tactical grid combat **core to Ellmud's identity**, or is it **optional polish**?
- If core → Invest pre-launch (but defer to Phase 1.5, after core systems stable)
- If optional → Defer to post-launch, prioritize other features

Given Ellmud's **text-first, extraction-RPG** focus, I believe grid is **optional enhancement**, not requirement. The existing zone-based combat (Front/Flank/Rear) provides tactical depth for group play. Grid adds **visualization and granularity**, but is not necessary for core gameplay loop.

**Recommended priority: Post-launch Phase 2 feature.** Launch with zone-based combat, gather player feedback, build grid if demanded.

However, **if dkirby-ms believes grid is flagship feature** → Run SPIKE Phase now, decide based on results.

---

## 9. Deliverables and Next Steps

**If approved for SPIKE Phase:**
1. Regis: Canvas grid prototype (10×10 grid, 5 test creatures, sprite sheet)
2. Regis: ASCII grid renderer in combat log (box-drawing + entity letters)
3. Jarlaxle: Performance benchmark (30 entities, distance matrix + A* pathfinding)
4. Jarlaxle: Playtester recruitment (3-5 MUD veterans, blind text-only test)
5. Elminster: SPIKE results review + go/no-go recommendation (end of Week 1)

**If approved for Phase 1 (post-SPIKE):**
1. Jarlaxle: Server-side grid state implementation (data model, tick integration)
2. Regis: Client-side Canvas renderer + WebSocket sync
3. Laeral: Convert 1-2 boss rooms to grid (manual spawn placement)
4. All: Integration testing, performance profiling, accessibility audit
5. Elminster: Phase 1 results review + go/no-go recommendation (end of Week 4-5)

**If deferred:**
1. File this proposal + research docs for future reference
2. Add to post-launch roadmap backlog
3. Revisit after launch based on player demand

---

## 10. Appendices

### A. File References
- **Systems analysis:** `docs/design/337-combat-grid-systems.md` (Jarlaxle, 695 lines)
- **Frontend analysis:** `docs/design/337-combat-grid-frontend.md` (Regis, 945 lines)
- **Visual design analysis:** `docs/design/337-combat-grid-visual-design.md` (Laeral, 572 lines)
- **Original issue:** https://github.com/dkirby-ms/ellmud/issues/337

### B. Key Technical Files
- **Combat system:** `packages/server/src/combat/CombatSystem.ts`
- **Combat state:** `packages/server/src/combat/CombatState.ts`
- **Creature AI:** `packages/server/src/creatures/behavior.ts`
- **Client combat HUD:** `packages/client/src/components/CombatHUD.tsx`
- **Zone exploration UI:** `packages/client/src/pages/ZoneExploration.tsx`

### C. External Resources
- **DCSS tiles repository:** https://github.com/crawl/tiles (CC0 licensed)
- **DCSS webtiles (live demo):** https://crawl.develz.org/play.htm
- **rot.js (tile engine):** https://ondras.github.io/rot.js/hp/ (15KB, MIT license)
- **Canvas 2D API:** https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API

---

**End of Proposal. Awaiting dkirby-ms input on the 5 open questions above.**

— Elminster, Lead/Architect
