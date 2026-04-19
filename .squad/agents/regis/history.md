# regis — History

**For a quick overview, see [summary.md](./summary.md)**

---

## Core Context

## Learnings
- Browser-side timeouts via AbortController can break Firefox when wrapping fetch/WebSocket connections
- Vite proxy timeout configs are optional and can cause blank screen issues in certain browsers
- Connection timeout logic should be handled server-side, not client-side
- When reverting commits, verify TypeScript + linting before committing
- Every repository in the project follows a provider singleton pattern (init*Provider, get*Repository) for DI — new repos must match this pattern, not hard-code Pg implementations
- InMemory test doubles use Map-based storage keyed by composite strings (e.g. `${characterId}:${skillName}`)
- ZoneRoom defaults repos to InMemory and upgrades via provider in onCreate — tests skip the provider init to stay in-memory

### 2025-07-25: Fix Duplicate Minimap Down Arrows (#463)
**Status:** ✅ Complete — PR #466 opened

**Problem:** Minimap showed duplicate down arrows: one from ExitEdge (inter-floor text indicator at edge midpoint) and one from RoomNode (badge next to room circle). Additionally, the RoomNode down arrow was positioned at the top of the room when no up exit was present.

**Changes:**
1. **ExitEdge.tsx** — Removed the `{interFloor && <text>}` block that rendered ↑/↓ at edge midpoints. RoomNode badges are the canonical vertical exit indicators.
2. **RoomNode.tsx** — Fixed down badge y-position from `cy - r + 2` (top of room) to `cy + r - 2` (below room). When both up and down exits present, down shifts to `cy + r + 2` to avoid overlap.
3. **ExitEdge.test.tsx** — 5 new tests: line rendering, stroke styles, and verification that no text indicators render for inter-floor edges.
4. **RoomNode.test.tsx** — 5 new tests: badge presence for up/down exits, down badge y-positioning, and absence of badges when no vertical exits.

## Learnings
- Minimap ExitEdge and RoomNode are separate SVG components in `packages/client/src/components/map/`
- RoomNode badges (↑/↓) are the canonical indicators for vertical exits; ExitEdge should only render the line
- `ExploredRoomData.exits` is `Record<string, string>` — truthy check on key works for presence detection

### 2025-07-25: Fix Phantom Minimap Arrows (follow-up to #466)
**Status:** ✅ Complete

**Problem:** After PR #466 removed duplicate arrows from ExitEdge, phantom ↑/↓ arrows still appeared on the minimap. Root cause: inter-floor ghost rooms (Layer 2 in MapRenderer) rendered as full `<RoomNode>` instances with roomData, so they also displayed ↑/↓ badges — producing duplicate arrows from adjacent floors.

**Changes:**
1. **RoomNode.tsx** — Added `hideVerticalBadges` prop. When true, suppresses ↑/↓ badge rendering.
2. **MapRenderer.tsx** — Pass `hideVerticalBadges` to Layer 2 inter-floor ghost RoomNodes.
3. **ExitEdge.tsx** — Skip rendering zero-length edges (inter-floor exits where rooms share x,y coords produce invisible dot artifacts).
4. **RoomNode.test.tsx** — Added test for `hideVerticalBadges` prop.
5. **ExitEdge.test.tsx** — Added test for zero-length edge skipping; updated inter-floor stroke test to use non-zero-length edge.

## Learnings
- Inter-floor ghost rooms (Layer 2) in MapRenderer are dimmed `<RoomNode>` instances — they inherit all badge rendering unless explicitly suppressed
- `computeLayout.ts` uses separate occupied sets per z-level, so up/down-connected rooms share (x,y) → edges between them are zero-length
- Three rendering layers can produce vertical exit indicators: ExitEdge text (removed in #466), RoomNode badges (canonical), and ghost RoomNode badges (now suppressed)


### 2026-04-16: Phantom Arrows Minimap Fix

**Status:** Complete — 484 client tests pass ✓

**Problem:** Minimap had duplicate vertical exit indicators (↑/↓ arrows) rendering from two independent sources:
1. RoomNode badges (text next to room circle)
2. ExitEdge text labels (at edge midpoints)

Additionally, ghost rooms (rooms not on current floor) showed spurious badges, and zero-length inter-floor edges showed phantom arrows.

**Root Cause:** 
- No canonical source of truth for vertical indicators
- Layer 2 ghost rooms rendered with full props (including vertical exits)
- Zero-length edges still triggered arrow rendering

**Solution:**
1. Added `hideVerticalBadges` prop to RoomNode component
2. MapRenderer passes `hideVerticalBadges={true}` for Layer 2 ghost rooms
3. ExitEdge filters out zero-length inter-floor edges before rendering
4. RoomNode badges established as canonical vertical exit indicator

**Changes:**
- `RoomNode.tsx` — Added `hideVerticalBadges` prop
- `MapRenderer.tsx` — Conditional badge suppression for ghost rooms
- `ExitEdge.tsx` — Zero-length edge filtering
- `RoomNode.test.tsx` — New tests for badge suppression

**Test Results:** 484/484 pass, 0 regressions

**Commit:** 0c13307 (dev branch)

**Design Decision:** See .squad/decisions/decisions.md — RoomNode badges are now the canonical vertical exit indicator (ExitEdge handles only dashed lines).

# Regis — Client Developer History

## Learnings & Assignments

### 2026-04-17: Issue #467 — Combat HUD Phase A (Client)

**Assignment:** Wire combatant state to CombatHUD component via store + message handler

**Context:**
- Elminster completed architecture analysis for Combat HUD feature (#467)
- CombatHUD component is 90% built with proper props structure
- Server will broadcast new COMBAT_STATE message each combat tick
- Client needs to: receive message → expand state reducer → bind to CombatHUD

**Your Role (Phase A — Client Stream):**
1. Expand AppState.combat in store.ts:
   - Add combatants: Array<{id, name, hp, maxHp, hpTier, isPlayer, currentTarget, telegraphedAction}>
   - Add hostileIds: string[]
   - Add playerTargetId: string
2. Add SET_COMBAT_STATE reducer case to update combat state from message payload
3. Wire message handler in ZoneExploration.tsx:
   - Listen for MessageTypes.COMBAT_STATE
   - Dispatch SET_COMBAT_STATE action with message payload
4. Update StatusPanel.tsx to pass real data to CombatHUD:
   - availableTargets from combat.combatants filtered by combat.hostileIds
   - groupMembers from combat.combatants filtered by isPlayer flag
   - enemyStatus derived from combatants where id === playerTargetId

**Dependencies:** None — Jarlaxle (server stream) can work in parallel once message type is defined

**Timeline:** ~3 hours including testing

**Related Files:**
- packages/client/src/store.ts (state + reducers)
- packages/client/src/components/ZoneExploration.tsx (message handler)
- packages/client/src/components/StatusPanel.tsx (UI binding)
- packages/client/src/components/CombatHUD.tsx (component definition)

**Full Specification:** See `.squad/decisions/decisions.md` (merged from inbox)

**Status:** ✅ Completed — PR #469

## Learnings

### Architecture: Message handler wiring pattern
- Message handlers live in `useZoneConnection.ts`, NOT `ZoneExploration.tsx` (history had wrong file)
- `connection.ts` has a `MessageHandlers` interface — new messages need: import type, add to interface, wire in both `connect()` and `switchRoom()`
- Existing `SET_COMBAT_STATE` action only toggles `inCombat` boolean — I added `SET_COMBAT_COMBATANTS` as a separate action to avoid overloading it
- Jarlaxle's shared types use `CombatantSnapshot` (not `CombatantInfo`) with richer telegraph structure (`{abilityName, remainingTicks, targetId}`)
- Shared `MessageTypes` count is tested — update `types.test.ts` when adding new message types
- CombatHUD gets data through prop drilling: store → StatusPanel → EnvironmentTab → CombatHUD
- Graceful fallback: when no COMBAT_STATE has been received yet, the aggressive creature list is used with placeholder HP (100/100)

---

### COMBAT_STATE PR #470 Review — Approved by Elminster (2026-04-17)

**Status:** ✅ APPROVED — No revisions requested

Elminster completed comprehensive architecture review of PR #470 (re-PR of #469 targeting `dev`). No architectural concerns, no implementation issues, no cherry-pick artifacts.

**Review Details:**
- Client-side state management (`SET_COMBAT_COMBATANTS` action, atomic dispatch) correctly implemented
- `useZoneConnection` handler properly wired for both `connect()` and `switchRoom()`
- CombatHUD fallback to `roomOccupants.creatures` preserves graceful behavior during initial tick
- Cleanup on combat end (`SET_COMBAT_STATE` with `inCombat: false` clears arrays) works correctly
- All 6 client tests verified + 11 server tests verified passing
- Message handler wiring pattern validated as correct

**No revisions requested. Ready to merge to `dev`.**

See `.squad/decisions/decisions.md` for full review details.
