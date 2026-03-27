# Regis — History

## Core Context

- **Project:** Ellmud — PvPvE Extraction RPG / Real-Time MUD
- **Stack:** Node.js, Colyseus (WebSocket), React client, PostgreSQL
- **User:** dkirby-ms
- **Joined:** 2026-03-27
- **Client path:** `packages/client/`
- **Admin pages:** `packages/client/src/pages/admin/`
- **Shared types:** `packages/shared/src/`
- **Styling:** MUD-aesthetic, text-primary, ANSI colour heritage. Uses `theme.css` for base styles.
- **Admin pattern:** List page (table) → Detail page (form with modals for nested data). Examples: `NarrativeDetail.tsx`, `BiomesDetail.tsx`.
- **Hooks:** `useAutoScroll` for scrollable panes, `useShardConnection` for game room connections.
- **Compass nav:** `CompassControl.tsx` in sidebar. Exit data via `state.roomHeader.exits`.

## Learnings

- **Zone API uses a separate base path:** Zones use `/admin/api/zones/*` not the generic `/admin/api/content/{type}` path. Created `zone-api.ts` wrapping `adminFetch` for zone/room/exit CRUD.
- **`adminFetch` was not exported:** Had to add `export` to the function declaration in `admin-api.ts` so `zone-api.ts` could import it.
- **Zone types from shared:** `ZoneDefinition`, `ZoneRoomDefinition`, `ZoneExitDefinition`, `ZoneData` live in `packages/shared/src/zone.ts`. Defined local interfaces in `zone-api.ts` to avoid cross-package import issues in the client bundle.
- **Admin page convention:** List page → Detail page with tabs. Sidebar entry in `navSections` array in `AdminLayout.tsx`. Routes in `routes.ts` admin children block.
- **Zone detail is more complex than standard entities:** Has nested rooms and exits managed via sub-routes on the zone API, requiring inline CRUD forms instead of simple field editing.
- **ShardExploration layout is 70/30 split:** Narrative panel (70%) + sidebar (30%). Sidebar sections top-to-bottom: Status, Status Effects, Quick Inventory, Enemy, Collapse Timer, Sound Cues, Compass, Quick Actions. Layout is `h-screen flex flex-col` with `flex-1 flex overflow-hidden` main area.
- **Overlay pattern for game UI modals:** Equipment drawer, extraction, chat, and reconnection all use overlays at `z-50` with `bg-black/60` backdrop. Not tabs or split panels. Full map should follow this pattern.
- **Client is a "dumb terminal":** No Colyseus Schema sync. All server→client communication via explicit message types in `@ellmud/shared`. New features need new message types wired through `useShardConnection` handlers.
- **Room types from shared:** `RoomType` union in `packages/shared/src/room-graph.ts` includes corridor, junction, dead_end, entry, extraction, boss, and all `feature_*` types. `isFeatureRoomType()` and `getFeatureKey()` helpers available.
- **Map UI design produced:** Full design doc covers SVG rendering, BFS layout for procedural shards, minimap replacing compass in sidebar, full map as overlay, `useExplorationMap` hook, two new message types (`exploration_data`, `exploration_update`). Decision filed to `.squad/decisions/inbox/regis-map-ui-design.md`.
- **ANSI/MUD styling classes:** `tailwind.css` defines `.ansi-*` (16 terminal colors), `.mud-*` semantic classes (damage, healing, dodge, speech, exits, etc.), and `.narrative-terminal` with CRT scanline overlay. Map styling should use these same color values.
- **CompassControl.tsx:** 3×3 grid of cardinal/ordinal buttons + Up/Down. Reads exits from `state.roomHeader?.exits`. Will be superseded by MinimapWidget once map is built.
- **Zone room naming convention (Phase C3):** Colyseus room names use `zone:<slug>` format (e.g. `"zone:the-refuge"`). Client routes (`/refuge`, `/shard/live`) are unchanged. ChatPanel context labels (`"shard"` | `"refuge"`) are UI concepts, not room names. Admin `isShard` check now covers both `"shard"` and `zone:` prefixed rooms. The `switchRoom` target for extraction completion is `"zone:the-refuge"`.

## 2026-03-27T15:39Z — Phase C3 Complete

**Completed:** Client room connection updates for zone naming  
**Files Modified:** 5

- `Refuge.tsx` — connect calls updated to `zone:the-refuge`
- `useShardConnection.ts` — ROOM_SWITCH handler updated
- `connection.test.ts` — test fixtures updated
- `LiveRooms.tsx` — zone room styling
- `LiveRoomDetail.tsx` — zone room display

**Build:** ✅ Clean

**Dependency:** Drizzt's Phase C (zone registration) — now satisfied.

- **useShardConnection accepts roomName param:** The hook now takes an optional `roomName` string (default `'shard'`). ShardExploration derives the room name from `useLocation().pathname` — `/refuge` maps to `zone:the-refuge`, everything else defaults to `shard`. This means ShardExploration is reusable for any zone-mode room.
- **Zone mode hides shard-specific UI:** When `isZone` is true, the "Back to Refuge" button, Shard Stability bar, and Collapse Timer sidebar section are hidden. ChatPanel context switches to `"refuge"`. CombinedStashLoadout gets `inShard={false}`.

## 2026-03-27T16:20Z — Refuge Unified Exploration UI

**Completed:** Route `/refuge` to ShardExploration instead of old tab-based Refuge hub  
**Files Modified:** 3

- `routes.ts` — `/refuge` now renders `ShardExploration` instead of `Refuge`
- `useShardConnection.ts` — accepts `roomName` param; both `connect()` calls and reconnection use it dynamically
- `ShardExploration.tsx` — derives zone mode from route path; hides shard-only UI (back button, stability bar, collapse timer); adjusts chat context and connection messages

**Build:** ✅ Clean  
**Tests:** ✅ 115 passed (10 files)

**Note:** `Refuge.tsx` is NOT deleted — just no longer routed. Can be cleaned up later.

- **Stability bar & collapse timer fully removed from UI:** The `Shard Stability` progress bar (room header), `COLLAPSE TIMER` sidebar section, `useCountdown` import, `collapseTime`/`collapseTimerMax` variables, `formatTime` helper, `getCollapseColor` function, and `stability` variable are all removed from `ShardExploration.tsx`. Server-side state (`collapseTimer`, `collapseTimerMax`, `shardState`, `stability`) is still sent and stored in `useShardConnection` — only the UI consumption was removed. The `useCountdown` hook file itself is preserved since it may be useful elsewhere.

## 2026-03-27T17:35Z — Death Refuge Navigation Fix

**Completed:** Fixed "Return to Refuge" button after death to properly switch rooms and update URL  
**Files Modified:** 3

- `ExtractionOverlay.tsx` — Added `onReturnToRefuge` callback prop to both success and death overlay buttons
- `useShardConnection.ts` — `onRoomSwitch` handler now calls `navigate('/refuge')` after successful room switch to refuge; added double-connect guard to prevent re-connecting when already on correct room
- `ShardExploration.tsx` — Passed empty callback to ExtractionOverlay (server auto-sends ROOM_SWITCH after 3s)

**Build:** ✅ Clean  
**Tests:** ✅ 111 passed (10 files)

**Root Cause:** Two issues: (1) ExtractionOverlay buttons bypassed server-driven room switch by calling `navigate()` directly, racing with server ROOM_SWITCH message. (2) Server ROOM_SWITCH handler switched Colyseus connection but never updated URL, leaving UI in wrong state (`isZone` stayed false even after connecting to `zone:the-refuge`).

**Solution:** Overlay buttons now call optional callback (no-op for death - server handles it). ROOM_SWITCH handler navigates to `/refuge` after successful switch. Double-connect guard prevents useEffect from re-connecting when already on correct room after navigation.


---

## Team Sync: 2026-03-27T17:40:16Z

**Drizzt (Engine Dev) completed DB stability fixes simultaneously:**
- Fixed PostgreSQL ON CONFLICT syntax in PgExplorationRepository (expression-based conflict detection)
- Separated authPlayerIds from characterIds in ShardRoom to resolve FK violations
- All 2239 server tests passing

**Cross-team impact on Regis work:**
- Exploration state from `useShardConnection` now saves reliably (Drizzt's PgExplorationRepository fix)
- No race conditions on character_explored_rooms inserts
- DB layer stable for future feature work

**Decisions logged to .squad/decisions.md:**
1. Database Constraint and FK Error Fixes (Drizzt)
2. Client Room Switch and Navigation Pattern (Regis)
3. Refuge uses ShardExploration UI (Regis)
4. Stability bar and collapse timer UI removed (Regis)
5. Stability bar/collapse timer deprecation (user directive via Drizzt)

## Learnings

- **BFS layout engine lives at `packages/client/src/map/computeLayout.ts`:** Pure function, no React imports. Takes a `Map<string, { exits: Map<string, string> }>` and an entry room ID, returns `Map<string, RoomPosition>` with `(x, y, z)` coords. Used by both player minimap and admin zone designer.
- **Direction offsets:** north → (0,−1), south → (0,+1), east → (+1,0), west → (−1,0). Up/down change z-layer only, same (x,y). This matches screen convention (y increases downward).
- **Collision resolution uses spiral search:** When a BFS target cell is occupied, `findNearestUnoccupied()` spirals outward by Manhattan distance to find the closest free cell. Guarantees no two rooms share an (x,y) position.
- **Disconnected subgraphs get offset placement:** After BFS exhausts the entry component, unplaced rooms are BFS'd from a position offset 3 cells to the right of the current bounding box.
- **Test file at `packages/client/src/map/__tests__/computeLayout.test.ts`:** 14 tests cover single room, corridor, hub-spoke, 2×2 grid, 3×3 grid, cycles, up/down, collisions, disconnected graphs, unknown exits, and cell uniqueness.
- **useExplorationMap hook at `packages/client/src/hooks/useExplorationMap.ts`:** Listens for `EXPLORATION_DATA` (bulk) and `EXPLORATION_UPDATE` (single) messages from the Colyseus room. Returns `MapState` with visited rooms, ghost rooms (unvisited adjacent), computed positions, and current room ID. Rebuilds layout via `computeLayout()` on every update.
- **SVG map components at `packages/client/src/components/map/`:** Four files: `MapRenderer.tsx` (SVG container with viewBox computation, renders edges/ghosts/rooms in correct z-order), `RoomNode.tsx` (circle per room, colored by type, glow on current), `ExitEdge.tsx` (line between connected rooms), `GhostRoom.tsx` (dashed outline for unvisited adjacent rooms). Shared constants in `constants.ts` (`CELL_SIZE=60`, room type color map).
- **ExploredRoomData exits are `Record<string, string>`:** Not `Map`. The shared type uses a plain object for JSON serialization. The hook converts to `Map(Object.entries(...))` when feeding into `computeLayout`.
- **Colyseus SDK has no `removeMessageHandler`:** Cleanup happens implicitly on `room.leave()`. The useEffect cleanup comment documents this.
- **ZoneDesigner component (interactive):** `packages/client/src/pages/admin/ZoneDesigner.tsx` — full CRUD SVG canvas for zone rooms and exits. Toolbar: Add Room (modal form), Connect (click-to-connect mode with bidirectional helper), Portal (inter-zone exit creation via zone/room dropdowns). Side panel for room editing (name, type, description) and exit details/delete. Validation overlay: disconnected rooms (⚠ yellow), no entry room warning, missing reverse exits (dashed ghost lines). Props: `zoneId`, `onZoneChanged` callback for parent refetch. Uses `zone-api.ts` functions directly. ~800 lines.
- **Zone-api types use `string` not shared enums:** `ZoneRoomDefinition.type` is `string` (not `RoomType`), `ZoneExitDefinition.direction` is `string` (not `Direction`). Keep this in mind when consuming zone-api types — use string-based checks, not shared type imports.
- **Admin tab pattern in ZonesDetail:** `Tab` union type + `activeTab` state + `tabs[]` array rendered as bottom-bordered buttons. Content switched via `{activeTab === "x" && (...)}` conditionals. Adding a tab = extend union, add array entry, add content block.
- **MinimapWidget + FullMapOverlay built:** Standalone components at `packages/client/src/components/map/`. MinimapWidget wraps `MapRenderer compact={true}` in a 200×200 container with expand button. FullMapOverlay is a z-50 fixed overlay with backdrop blur, Escape key close, matching InventoryOverlay/ExtractionOverlay patterns. CSS in `map.css`. `useMapToggle` hook at `packages/client/src/hooks/useMapToggle.ts` handles M-key binding (skips when typing in inputs). Now wired into ShardExploration (see below).
- **Map integration into ShardExploration:** `useExplorationMap(roomRef.current)` and `useMapToggle()` added to component body. MinimapWidget sits below CompassControl in the sidebar. FullMapOverlay renders before ExtractionOverlay in DOM order so extraction/reconnection overlays stack above the map. Test mock for `ux-batch2-combat-sidebar.test.tsx` updated to include `roomRef`, `useExplorationMap`, and `useMapToggle` mocks.
- **Designer connect mode pattern:** When a room is selected, clicking "Connect" enters connect mode (dashed border on source, crosshair cursor on targets). Clicking a target room opens a side panel with inferred direction (from relative grid position) and a bidirectional checkbox (default: checked). Direction inference uses `inferDirection()` — compares dx/dy of layout positions, majority axis wins (east/west for horizontal, north/south for vertical). Bidirectional creates both A→B and B→A (reverse direction from OPPOSITE map) in two sequential API calls.
- **Designer validation is visual-only:** Three warning types computed in `useMemo` from rooms/exits: no entry room, disconnected rooms (no exits touching them), one-way exits (A→B exists but B→A doesn't). Disconnected rooms get yellow ⚠ stroke + badge. One-way exits get amber stroke + dashed ghost line showing the missing reverse. Warning bar at bottom of designer with AlertTriangle icon. None of these block saves.
- **Portal exits use `toRoomSlug: fromRoomSlug`:** For inter-zone exits, the `toRoomSlug` field is set to the same room as `fromRoomSlug` since the real destination is in `targetZoneSlug`/`targetRoomSlug`. The portal dialog fetches all zones via `listZones()`, then loads the target zone's rooms via `getZone(slug)` for the room dropdown.
- **Designer manages its own selection state:** No longer delegates to parent via `selectedRoomSlug`/`selectedExitId` props. Internal `selectedRoom`/`selectedExit` state drives the side panel and mode logic. `onRoomSelect`/`onExitSelect` callbacks are still available for external notification but optional.

---

## Team Sync — 2026-03-27T19:11:50Z (Exploration Phase Complete)

### Phase Completion
All 13 plan todos completed. Build clean, 2271 tests passing, 0 lint errors.

### Drizzt Integration
- Exploration message protocol (EXPLORATION_DATA / EXPLORATION_UPDATE) fully wired into ShardRoom
- authPlayerIds fix ensures DB writes use auth UUID, not characterId
- Exploration recording fires at join, go, flee with fire-and-forget pattern
- Shard mode sends empty prior visits (ephemeral), zone mode loads from DB
- No exploration messages impact room stability

### Minsc Testing
- 18 exploration message tests in `exploration-messages.test.ts`
- Coverage: M1–M8 categories including bulk/single payloads, zone vs shard modes, duplicate upserts
- Pattern established for future message tests (MessageCollector doesn't capture exploration yet)

### Decision Archive
- 8 new decisions merged from inbox to decisions.md (deduplicated)
- Inbox directory cleared
- Full decision trail available for team reference
