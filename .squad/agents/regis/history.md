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

---

## 2026-03-28T19:45Z — False Death Screen Fix

**Completed:** Fixed false death screen on login and ensured players default to refuge  
**Files Modified:** 3

- `useShardConnection.ts` — Removed death screen trigger from generic disconnect codes (line 310-312); added 'death' case to handleExtraction switch to properly handle server-sent death state
- `ShardExploration.tsx` — Fixed "Return to Refuge" button to navigate to /refuge instead of no-op
- `ExtractionOverlay.tsx` — No changes needed (button already had correct prop signature)

**Build:** ✅ Clean  
**Tests:** ✅ 2271 passed (103 files)  
**Lint:** ✅ Clean

**Root Cause:** The onLeave handler in useShardConnection was setting extraction status to 'death' for ANY disconnect code >= 4000, including connection errors, duplicate join displacement, and other non-death disconnects. This caused the false death screen on login errors. Additionally, the handleExtraction function didn't handle the 'death' state from the server's ExtractionMessage protocol.

**Solution:** 
1. Removed `setExtraction({ status: 'death', ... })` from the onLeave handler — death screen should ONLY appear when server explicitly sends an ExtractionMessage with `state: 'death'`
2. Added 'death' case to handleExtraction switch statement to properly handle server-sent death state
3. Made "Return to Refuge" button functional by having it call `navigate('/refuge')` instead of a no-op comment
4. All disconnects (code >= 4000 and < 4000) now trigger reconnection attempt — no false death screen

- **MudPrompt component at `packages/client/src/components/MudPrompt.tsx`:** Classic MUD status line pinned to bottom of narrative scroll. Reads `playerHp`, `playerMaxHp`, `inCombat`, `pendingCombatAction`, `statusEffects`, and `roomHeader.roomName` from AppContext. HP color-coded via CSS classes: green (>60%), yellow (30-60%), red (<30%). Blinking `>` cursor via CSS animation. Uses `position: sticky; bottom: 0` inside the scroll container.
- **MUD prompt CSS classes in `tailwind.css`:** `.mud-prompt`, `.mud-prompt-bracket`, `.mud-prompt-label`, `.mud-prompt-sep`, `.mud-prompt-hp-*`, `.mud-prompt-ready`, `.mud-prompt-combat`, `.mud-prompt-effect`, `.mud-prompt-room`, `.mud-prompt-cursor`. z-index: 2 to sit above CRT scanline overlay.
- **Test scoping pattern:** When a component renders the same text in multiple places (sidebar + MudPrompt), use `within(screen.getByTestId('container'))` to scope assertions. Applied to `ux-batch2-combat-sidebar.test.tsx` status effect tests.
- **ItemTooltip component at `packages/client/src/components/ItemTooltip.tsx`:** Reusable mouseover tooltip for displaying item details. Shows item name (tier-colored), type, slot, weight, description, and tier badge. Viewport overflow prevention with automatic repositioning. MUD aesthetic: dark background (`rgba(10, 11, 15, 0.98)`), tier-colored border, tier-appropriate glow shadow. Currently shows placeholder `?` for weapon/armour stats since `DisplayItem` doesn't include computed stats - this can be enhanced when server sends stats data.
- **EquipmentSilhouette component at `packages/client/src/components/EquipmentSilhouette.tsx`:** Abstract slot diagram showing player's equipped items. Compact 3-column grid layout: head/chest/hands/legs/feet centered, weapon/offhand flanking chest, ring1/amulet/ring2 at bottom. Equipped items show abbreviated name with tier-colored border and glow. Empty slots show dotted border with dim label. Mouseover displays ItemTooltip. Reads from `state.loadout` (EquipmentSlots). Integrated into ShardExploration sidebar between status effects and quick inventory.
- **Equipment silhouette CSS in `theme.css`:** `.equipment-grid` flexbox column layout, `.equipment-row` 3-column grid, `.equipment-cell` with transition and hover state, `.equipment-slot-label` for empty slots, `.equipment-item-name` for equipped items. `.item-tooltip` fade-in animation (0.15s). All styling matches MUD aesthetic with monospace fonts and theme color variables.
- **Tier color system standardized:** Both ItemTooltip and EquipmentSilhouette use the same tier color mapping (scrap: gray `#808080`, common: white `#d4d4d4`, sturdy: green `#4ade80`, refined: blue `#60a5fa`, masterwork: purple `#c084fc`, anomalous: gold `#fbbf24`). These match the existing tier colors used throughout the client.

---

## 2026-03-28T21:05Z — Equipment Silhouette + Shared ItemTooltip (Phase 3)

**Completed:** Built equipment slot diagram with reusable item tooltips  
**Files Created:**
- `packages/client/src/components/ItemTooltip.tsx` — Reusable tooltip component
- `packages/client/src/components/EquipmentSilhouette.tsx` — Abstract slot diagram

**Files Modified:**
- `packages/client/src/pages/ShardExploration.tsx` — Added EquipmentSilhouette to sidebar
- `packages/client/src/styles/theme.css` — Added equipment and tooltip CSS

**Build:** ✅ Clean (1.89s)

**Features:**
1. **ItemTooltip** — Viewport-aware positioning, tier-colored borders/glow, shows name/type/slot/weight/description. Ready for stats when DisplayItem includes them.
2. **EquipmentSilhouette** — 3-column grid layout with logical slot arrangement. Equipped items glow with tier color, empty slots show dotted borders. Hover shows full tooltip.
3. **Sidebar Integration** — Lives between status effects and quick inventory in right sidebar. Compact design fits 30% width constraint.

**Design Notes:**
- Layout uses `LAYOUT_GRID` constant defining 6 rows × 3 columns with null spacers
- Slot labels: head/chest/hands/legs/feet centered, weapon/offhand flanking, rings/amulet bottom row
- Item names truncated at 12 chars with ellipsis for space efficiency
- Tooltip shows `?` for weapon/armour stats since `DisplayItem` type doesn't include computed stats (future enhancement when server protocol adds them)

**MUD Aesthetic Maintained:**
- Dark backgrounds, tier-colored borders, monospace fonts
- Glow effects via `box-shadow` with tier color + `60` alpha
- Tooltip fade-in animation (0.15s ease-out)
- All colors from established tier palette

**Next Steps for Future Enhancement:**
- Add weapon/armour stats to `DisplayItem` type (requires server-side change)
- Consider reusing ItemTooltip in CombinedStashLoadout for consistency
- Add ARIA labels to equipment cells for accessibility

---

## Cross-Team Notes

- **Drizzt (Engine):** If you add computed stats (damage/speed/armour) to the `DisplayItem` message, ItemTooltip is ready to display them. Currently shows `?` as placeholder.
- **Minsc (Content/Testing):** Equipment silhouette tests should verify tooltip appears on mouseover and displays correct tier colors/borders.

---

## MUD Prompt / Status Line Component (2026-03-27)

**Task:** Build a classic MUD-style status line pinned to bottom of narrative scroll, showing HP (color-coded), combat stance, active status effects, current room name, and blinking `>` cursor.

**Outcome:** ✅ SUCCESS — `MudPrompt` component created and integrated into ShardExploration. Sticky positioned inside narrative-scroll container using Tailwind classes. Reads all data from AppContext (no new message types needed). Pre-designed for mana/MP field addition when server schema includes it. Test scope fix in sidebar effect tests prevents false positives. Build clean, all client tests passing.

**Orchestration:** .squad/orchestration-log/2026-03-27T2254-regis.md

**Files Created:**
- `packages/client/src/components/MudPrompt.tsx`

**Files Modified:**
- `packages/client/src/styles/tailwind.css`
- `packages/client/src/components/ShardExploration.tsx`
- `packages/client/src/__tests__/sidebar.test.ts` (scoping fix)

**Decision Documented:** `.squad/decisions.md` — "2026-03-28: MUD Prompt / Status Line"

## Cross-Team Notes

- **Drizzt (Engine):** If you add mana/MP to the game schema and sync to client, MudPrompt is ready to display it (just add the field to AppContext)
- **Minsc (Content/Testing):** Your sidebar effect tests now use `within()` scoping to account for effect names appearing in both sidebar and prompt

## 2026-03-28 — Status Panel Wireup & Polish Pass

**Completed:** Wired sidebar status panel to live PLAYER_STATE data; polish pass on EquipmentSilhouette
**Files Modified:** 3

- `ShardExploration.tsx` — HP bar with numeric display (85/100) + color-coded labels, stamina bar (blue), status effect pills with buff/debuff/neutral classification, ARIA progressbar roles
- `theme.css` — Status bar styles (`.status-bar`, `.status-bar-fill`, HP color classes, stamina bar), status pill styles (`.status-pill-buff/debuff/neutral`), responsive equipment silhouette (`@media max-width: 900px`), new CSS variables (`--stamina`, `--hp-healthy/wounded/critical`)
- `EquipmentSilhouette.tsx` — Added `aria-label` to all equipment slot cells (e.g. "Weapon: Iron Sword, sturdy tier" or "Weapon: empty"), responsive overflow handling

**Build:** ✅ Clean
**Tests:** ✅ 20 passed (ux-batch2-combat-sidebar)

**Learnings:**
- **HP bar threshold adjusted from 25% to 30%:** Task spec said green >60%, yellow 30-60%, red <30%. Original code used 25% boundary. Updated to match spec.
- **Status effect classification uses keyword matching:** No `type` field on StatusEffect — classify by name keywords (debuffs: bleeding, poisoned, burning, etc.; buffs: haste, strength, shield, etc.; default: neutral). Easy to extend the keyword lists.
- **Preserve Tailwind color classes alongside CSS pill classes:** Tests check for `text-danger` class on debuff effects. Solution: use `status-pill-debuff` for border/background and `text-danger` for text color. No conflict since pill class doesn't set `color`.
- **Status bar uses CSS classes in theme.css, not Tailwind:** `.status-bar` + `.status-bar-fill` + `.status-bar-hp-healthy` etc. Dynamic width% is the only inline style. All colors via CSS variables.
- **Equipment silhouette responsive via @media:** At ≤900px viewport width (sidebar ~270px), cell padding, slot labels, and item names scale down. `min-width: 0` + `overflow: hidden` on grid prevents overflow.
- **Zone exit updateExit API:** Added `PUT /admin/api/zones/exits/:id` server route plus `updateExit` on both PgZoneRepository and InMemoryZoneRepository. Client wrapper in `zone-api.ts`. Follows exact same merge-and-return pattern as `updateRoom`.
- **Portal exits use cyan/teal (#06b6d4) rendering:** Cross-zone exits now draw as dashed cyan stub lines with ⟐ glyph and target zone label. Room-level portal indicators also updated to cyan. Old purple ⊕ indicators replaced.
- **Orphaned exit detection is client + server:** Client-side `orphanExitIds` memo detects exits with missing from/toRoomSlug for SVG highlighting (dashed red). Server-side `GET/POST cleanup/orphaned-exits` API handles full cross-zone orphan detection and removal.
- **Exit edit panel replaces read-only exit details:** Selecting an exit now shows an editable form (direction dropdown, to-room selector, locked/hidden toggles, portal fields) with Save/Delete buttons. Uses `exitEditForm` state synced via useEffect.
- **Z-level floor switching implemented:** FloorSelector component (pill-shaped, dark themed) shared between ZoneDesigner and in-game map. Uses `[` / `]` keyboard shortcuts. `useFloorFilter.ts` provides `computeFloorBounds()` and `filterEdgesByFloor()` utilities. Selector auto-hides when zone is single-floor.
- **Inter-floor exits render as dashed purple (#a78bfa):** Both ZoneDesigner and MapRenderer use the same visual language for inter-floor edges — dashed line with ↑/↓ direction indicator. Off-floor endpoints render as ghost rooms at 30% opacity.
- **ZoneDesigner floor filtering:** Rooms, intra-zone exits, and portals are all filtered to current floor. Ghost rooms from inter-floor exits are clickable and auto-switch to that room's floor. ViewBox recalculates per floor.
- **MapRenderer internal floor state:** MapRenderer owns `currentFloor` state internally, defaults to current room's z-level. FullMapOverlay manages its own floor state with keyboard shortcuts and header-mounted selector. MinimapWidget shows floor selector only on multi-floor maps.
- **Zone Designer zoom implemented via viewBox adjustment:** Added zoom state (0.25-3.0 range) with +/- buttons, percentage display, mouse wheel support, and keyboard shortcuts (+/=/- keys, 0 to reset). Zoom works by dividing viewBox dimensions by zoom factor and recentering. Removed maxHeight constraint on SVG to allow better zoom experience. UI matches designer dark theme (#12131A bg, #2A2B35 borders, #8A8B95 muted text). Mouse wheel uses preventDefault() to avoid page scroll conflicts.
- **Zone Designer pan support via SVG viewBox offset:** Added panX/panY state that offsets the viewBox from its zoom-centered position. Pan activates on mousedown on the SVG background (not room/exit elements) using `e.target === e.currentTarget` guard. Mouse deltas convert from screen pixels to SVG coordinates via `getBoundingClientRect()` and viewBox width/height ratio. Pan direction is inverted (drag right → view moves left). Uses `useRef` for start position to avoid stale closures. Pan resets on floor change, zoom reset (0 key), and Maximize2 button. Cursor changes: `grab` default → `grabbing` while panning → `crosshair` in connect mode. "📍 Panned" toolbar indicator appears when panned, clickable to reset.

## 2026-03-27T19:51Z — Direction-Biased Layout Engine

**Completed:** Fixed zone designer room placement to respect exit directions  
**Files Modified:** 1

- `packages/client/src/map/computeLayout.ts` — Added `findNearestDirectional()` function and updated BFS to use directional search for cardinal exits

**Build:** ✅ Clean  
**Tests:** ✅ 14/14 computeLayout tests passed, 125/125 client tests passed

**Root Cause:** When a room's ideal position was occupied (usually by grid cluster rooms), the `findNearestUnoccupied()` spiral search picked the first free cell by Manhattan distance without considering exit direction. This caused cardinal exits (east/west/north/south) to place rooms at visually wrong angles.

**Solution:** Added `findNearestDirectional()` that searches in rings (same Manhattan distance) but uses dot product scoring to prefer cells aligned with the exit direction. BFS now uses this for cardinal exit placement. Kept `findNearestUnoccupied()` for disconnected subgraph placement.

**Impact:** Zone designer now shows rooms in correct positions relative to their exits. Cardinal exits produce straight lines, not diagonals. Grid clusters unaffected (already placed as coherent blocks).

- **Layout algorithm uses dot product for directional bias:** The `findNearestDirectional()` function scores candidate cells within each ring using `score = ddx * dirDx + ddy * dirDy` where `(ddx, ddy)` is the offset from ideal position and `(dirDx, dirDy)` is the exit direction vector. Higher scores mean better alignment with the exit direction.
- **Direction-biased search still respects Manhattan distance priority:** Cells at radius 1 are tried before radius 2, radius 2 before radius 3, etc. Within each ring, the highest-scoring (most aligned) candidate wins. This minimizes displacement while respecting semantics.
- **`findNearestUnoccupied()` preserved for disconnected subgraphs:** Disconnected components placed to the right of the main graph don't need directional bias (no meaningful "from" direction), so they still use the plain spiral search.


## 2026-03-27T20:05Z — Z-Level Independent Layout

**Completed:** Fixed computeLayout.ts to lay out each z-level independently, preventing surface room positions from distorting sub-level topology (diagonal sewer lines).

**Files Modified:** 2
- `packages/client/src/map/computeLayout.ts` — Rewrote BFS to defer up/down exits; added Phase 2 that anchors each z-level at its entry point and BFS-expands using only cardinal exits; per-z-level `occupied` sets so different floors can share (x,y)
- `packages/client/src/map/__tests__/computeLayout.test.ts` — Updated uniqueness test to be per-z-level; added sewer topology test (#15), shared (x,y) across z test (#16), cascading 3-level test (#17)

**Build:** ✅ Clean (tsc + vite)
**Tests:** ✅ 17 passed (0 failures)

**Root Cause:** The old BFS placed up/down targets immediately at the source room's (x,y), then continued BFS from there — so sewer rooms inherited scattered surface positions. Cardinal exits between sewer rooms then produced diagonal lines.

**Solution:** Three-phase layout:
1. BFS primary z-level (z=0), deferring all up/down exits into a `pendingZTransitions` list
2. Process each deferred z-level: anchor first transition at source's (x,y) on new z, then BFS using only cardinal exits to lay out the subgraph coherently. Further up/down exits from sub-levels are deferred recursively.
3. Handle disconnected subgraphs (unchanged)

Each z-level gets its own `occupied` set since the designer displays one floor at a time — no visual overlap.

## Learnings

- **Z-level layout must be independent of parent level positions.** When multiple surface rooms connect down to the same sub-level, the sub-level's cardinal topology should dictate its own layout, not the surface positions. Anchoring at the first z-transition and BFS-expanding with only cardinal exits solves this.
- **Per-z-level occupied sets are essential.** Rooms on different z-levels can share (x,y) without conflict because the designer shows one floor at a time. A single global occupied set incorrectly blocks sub-level room placement.


## 2026-03-27T20:45Z — Styled Delete Exit Modal

**Completed:** Replaced native `window.confirm()` for exit deletion with a styled modal matching Portal Dialog / Orphaned Exits Modal aesthetic. Added checkbox to optionally delete the reverse/connecting exit.

**Files Modified:** 1
- `packages/client/src/pages/admin/ZoneDesigner.tsx` — Added `showDeleteExitModal` and `deleteAlsoReverse` state; rewrote `handleDeleteExit()` to open modal instead of confirm; created `confirmDeleteExit()` to handle actual deletion with optional reverse exit deletion; added styled modal JSX after orphaned exits modal

**Build:** ✅ Clean (tsc + vite)
**Tests:** ✅ Client tests passed

**Details:**
- Modal uses same dark theme styling as Portal Dialog: `bg-[#1C1D27]`, `border-[#2A2B35]`, gold title `text-[#C9A84C]`, `var(--font-sans)` for UI text
- Shows exit info in mono font: `fromRoomSlug → toRoomSlug (direction)`
- Detects reverse exit using `OPPOSITE` direction map and matching from/to slugs
- Checkbox defaults to checked when reverse exit exists (most exits are bidirectional)
- If no reverse exit found, checkbox is hidden
- Handles both single-exit deletion (unchecked) and double-deletion (checked) via two `deleteExit()` calls
- Cancel via button or backdrop click
- Busy state disables buttons during deletion

**UX Flow:**
1. User clicks trash button on exit in sidebar edit panel
2. `handleDeleteExit()` finds exit, checks for reverse, sets checkbox default, opens modal
3. User confirms (optionally unchecks reverse deletion) or cancels
4. `confirmDeleteExit()` deletes selected exit and optionally reverse exit
5. Selection cleared, zone refreshed via `onZoneChanged?.()`

## Learnings

- **Modal pattern for confirmations is consistent:** All styled modals in Zone Designer follow same structure — fixed overlay with `bg-black/50`, centered card with dark theme colors, click backdrop to cancel, `stopPropagation()` on card to prevent close
- **Checkbox for bidirectional actions should default to checked:** Most exits are bidirectional, so "also delete reverse" should be opt-out (checked by default) not opt-in
- **IIFE pattern `{showModal && selectedItem && (() => { ... })()}` is useful for computing derived state inline without polluting component scope:** Allows finding reverse exit within JSX render block without creating separate memoized values
- **Font family must be explicitly set:** MUD aesthetic requires `style={{ fontFamily: "var(--font-sans)" }}` on all text elements, `var(--font-mono)` on code/slugs/technical identifiers
- **Context menu pattern for Copy/Paste Properties:** Added property clipboard feature following existing menu button patterns (same inline styles, hover handlers), conditional rendering for paste button, toast notification at bottom center of designer for visual feedback
- **Property clipboard stores name/description/type/properties but NOT slug/id:** Identity fields should never be copied — only visual/descriptive properties are part of the "property brush"
- **Toast notifications auto-dismiss after 3 seconds:** Simple setTimeout pattern with gold text (`#C9A84C`) on dark background, positioned at bottom center with `position: absolute` and `transform: translateX(-50%)`
- **Paste Properties keeps clipboard loaded:** Don't clear `copiedRoomProps` after pasting — allows batch application to multiple rooms (power-user workflow)


## 2026-03-28T22:53Z — Zone Designer UX: Exit Modal & Copy-Paste

**Completed:** Two UX improvements for zone designer workflow  
**Files Modified:** 2 (1 new)

- `ZoneRoomDetail.tsx` — integrated exit deletion modal and copy/paste properties context menu
- `ExitDeleteConfirmModal.tsx` (new) — styled modal for destructive exit operations

**Build:** ✅ Clean  
**Tests:** ✅ All 125+ client tests pass

**Features:**
1. **Exit Deletion Modal** — Replaced native `window.confirm()` with MUD-styled modal including "also delete connecting exit" checkbox for bidirectional cleanup
2. **Room Property Copy-Paste** — Added context menu actions: Copy Properties (serializes description, flags, biome, etc. to clipboard) and Paste Properties (applies stored data to current room with toast feedback). Supports multi-paste.

**Impact:** Zone designers can now manage destructive operations with visual feedback and reuse room configurations across zones for faster design iteration.


## 2026-03-29T00:38-00:39Z — Admin Cleanup Session

**Tasks Completed:**
1. Removed zone preview and save-ready panels from ZonesDetail.tsx — layout now full-width
2. Removed serif font declarations from 25 admin component files (~120 changes)

**Build & Tests:** ✅ All passing


## 2026-03-29T02:15Z — Zone Designer UX Improvements

**Completed:** Three UX improvements to ZoneDesigner.tsx for better space utilization and cleaner map display

**Files Modified:** 1
- `packages/client/src/pages/admin/ZoneDesigner.tsx` — Adjusted room node dimensions, panel width, text display, and added hover tooltips

**Changes:**

1. **Wider Room Details Panel** — Side panel increased from w-64 (256px) to w-80 (320px) providing more breathing room for room names, descriptions, and editing forms

2. **Square Room Nodes** — Changed from wide rectangles (140×60) to balanced squares (100×100):
   - Updated NODE_W/NODE_H constants from 140×60 to 100×100
   - Adjusted CELL_W/CELL_H from 180×120 to 160×160 for proper spacing
   - Repositioned all badges and indicators:
     - Z-level indicator moved to x+NODE_W-6, y+10 (top-right, inset slightly)
     - Disconnection warning at x+8, y+10 (top-left)
     - Content badges moved to y+NODE_H-10 (bottom edge with padding)
     - Vertical exit badges (up/down) repositioned to x+NODE_W-10 with y+10 (up) and y+NODE_H-10 (down)
   - Text layout centered in square node (slug vertically centered when labels off)

3. **Simplified Map Text + Hover Tooltip** — Toggleable label system with rich hover details:
   - Added "Labels On/Off" toggle button in toolbar (matches existing button styling)
   - Default OFF: Only slug shown on map (centered in node), hover for full details
   - When ON: Shows both room name (truncated at 12 chars) and slug (old behavior)
   - Hover tooltip (150ms delay) displays:
     - Room name (full, gold accent #C9A84C)
     - Slug and type in mono font
     - Description (first 100 chars if long)
     - Properties if any
     - Content summary (NPC/loot/hazard counts with icons)
   - Tooltip implemented as absolutely positioned HTML div (not SVG) for better styling and no clipping
   - Dark theme styling: bg-[#1C1D27], border-[#2A2B35]
   - Only shows when labels are OFF (no redundant tooltip when names already visible)

**Build:** ✅ Clean (tsc + vite)

## Learnings

- **Square nodes provide better visual balance:** 100×100 squares feel more balanced than wide rectangles and work better with centered text. The reduced horizontal size (140→100) is offset by increased vertical space (60→100), keeping total area similar while improving proportion.
- **Cell spacing should exceed node size:** CELL_W/CELL_H must be larger than NODE_W/NODE_H to prevent overlapping. 160×160 cells for 100×100 nodes maintains 60px gutters (same as before: 180-140=40, 120-60=60; now 160-100=60 uniform).
- **Badge positioning needs careful adjustment for square nodes:** All badge positions (z-level, warnings, content, exits) must be recalculated when node dimensions change. Top-corner badges should be inset (not touching edge) for better visibility; bottom badges need padding from edge to avoid clipping.
- **HTML tooltips are superior to SVG titles:** Using absolutely positioned divs for tooltips allows proper styling, multi-line content, and rich formatting without SVG limitations. Positioning with `transform: translate(-50%, -100%)` centers tooltip above hover point.
- **Hover delay prevents tooltip flicker:** 150ms timeout before showing tooltip avoids flashing when mouse quickly moves across multiple rooms. Timer must be cleared on mouseLeave to prevent stale tooltips.
- **Toggle pattern for optional UI elements:** Boolean state + toolbar toggle button following existing button styling patterns. Active state uses gold background (bg-[#C9A84C]), inactive uses border-only (border-[#4A4B55]).
- **Conditional rendering based on toggle state:** When labels ON, show both name and slug in node with vertical offset. When OFF, show only centered slug and enable hover tooltip. Tooltip visibility also gated by showLabels to avoid redundancy.


## 2026-03-27T16:30Z — Zone Designer: Resizable Panel & NPC/Loot Management

**Completed:** Two new features for the Zone Designer admin tool  
**Files Modified:** 4

### Feature 1: Resizable Room Details Panel
- Added drag handle on left edge of side panel (4px wide, subtle hover effect)
- Panel width state (default 320px, min 280px, max 600px)
- Mouse drag handlers track resize via useEffect
- Replaced fixed `w-80` class with inline `style={{ width: panelWidth }}`
- Drag handle styled with `bg-[#2A2B35]` and `hover:bg-[#C9A84C]` transition

### Feature 2: NPC and Item/Loot Management
**Server changes:**
- Added `getAllCreatureTemplates()` export to `CreatureManager.ts`
- Added `GET /admin/api/creature-templates` endpoint (returns template list)
- Added `GET /admin/api/items` endpoint (returns all item definitions via `getAllItemDefinitions()`)

**Client API changes:**
- Added `RoomNPC` and `RoomLootContainer` interfaces to `zone-api.ts`
- Typed `ZoneRoomDefinition.npcs` as `RoomNPC[]` (was `unknown[]`)
- Typed `ZoneRoomDefinition.lootContainers` as `RoomLootContainer[]` (was `unknown[]`)
- Added `listCreatures()` and `listItems()` API functions
- Added `CreatureTemplate` and `ItemDefinition` interfaces

**Client UI changes:**
- Replaced read-only "Content summary" section with editable NPC and Loot sections
- NPC section: dropdown (creature template), number input (spawn count), delete button
- Loot section: dropdown (item), number input (quantity), delete button
- Each section has "Add NPC" / "Add Item" button
- Fetches creature templates and items on mount via useEffect
- Changes saved via existing `updateRoom()` flow (includes npcs and lootContainers fields)
- Updated `editForm` state to include npcs and lootContainers
- Updated sync effect to populate npcs/loot from selected room
- Updated roomForm state for proper typing (RoomNPC[] and RoomLootContainer[])

**Build:** ✅ Clean (TypeScript compilation successful)

### Learnings
- **CREATURE_TEMPLATES was not exported:** Had to add `getAllCreatureTemplates()` helper function in CreatureManager.ts to expose templates for admin UI
- **Items endpoint pattern:** Followed same pattern as creatures endpoint — import function dynamically in route handler to avoid circular dependencies
- **Zone room panel structure:** Properties section comes before the new NPC/Loot sections, which come before the in-game preview
- **Drag resize pattern:** Track mouse position on mousedown, use document-level mousemove/mouseup listeners in useEffect, cleanup on unmount or resize end
- **Admin UI styling:** Matches existing dark theme (bg-[#1C1D27], borders border-[#2A2B35], gold accent #C9A84C), sans-serif only, compact spacing
- **ZoneDesigner is large:** 2600+ lines, required careful old_str matches for edits to avoid conflicts

## 2026-03-28 — Zone Designer Legend Panel

**Completed:** Added collapsible legend panel to Zone Designer map view
**Files Modified:** 1

- `ZoneDesigner.tsx` — Added `HelpCircle` icon import, `showLegend` state, floating legend panel

**Visual elements documented in legend:**
- **Room types (7):** entry (green), extraction (blue), boss (red), junction (teal), corridor (charcoal), dead_end (charcoal), feature_* (purple) — all using `ROOM_TYPE_COLORS`, `FEATURE_COLOR`, `DEFAULT_COLOR` constants
- **Selection states:** Selected (cyan #22D3EE, 3px stroke), Disconnected (gold #B8860B, 2px stroke)
- **Exit lines (6):** Normal (#4A4B55 solid), Selected (#C9A84C solid), Missing Reverse (#B8860B dashed 4 4), Orphaned (#EF4444 dashed 6 3), Cross-Zone Portal (#06b6d4 dashed 4 2), Inter-Floor (#a78bfa solid)
- **Exit modifiers:** 🔒 Locked, 👁 Hidden — shown as emoji labels on exit midpoints
- **Room badges:** 👤 NPCs (amber), 📦 Loot (gold), ⚠ Hazards (red) — r=5 circles at room bottom
- **Room indicators:** ▲/▼ Floor Up/Down (purple circles), ⟐ Portal (cyan circles), ⚠ Disconnected Warning (gold)

**Implementation:** Floating panel in bottom-left corner of map canvas. Collapsed by default (small "Legend" button with HelpCircle icon). Expands to a compact panel with semi-transparent bg (#1C1D27/95) and backdrop blur. Uses the same SVG elements (rect, line, circle, polygon) and exact hex colors as the actual map to show-not-tell. Organized into sections: Room Types, Selection, Exits, Exit Modifiers, Room Badges, Indicators.

**Build:** ✅ Clean

- **Exit Pairs view in ZonesDetail.tsx:** Refactored the Exits tab from a flat one-exit-per-row table to a grouped exit-pair view. Bidirectional exits (A→B north + B→A south) are shown as a single row with ↔ icon and "north / south" directions. One-way exits show → with a "+ reverse" action button. Each row is expandable (chevron toggle) to reveal individual exit details (direction, locked/hidden status, per-exit delete). Inter-zone exits are tagged with a pill badge. The "Add Exit" form now has a "Create pair (bidirectional)" checkbox (default on) that creates both directions at once.

**Key implementation details:**
  - `OPPOSITE` map reused from ZoneDesigner: `{north: "south", east: "west", up: "down", ...}`
  - `ExitPair` type: `{ key, forward, reverse | null, isInterZone }`
  - `groupExitsIntoPairs()` helper: iterates exits, finds matching reverse by slug+opposite direction, builds stable keys
  - `expandedPairs` state: `Set<string>` toggled per pair key
  - `handleAddReverse(exit)`: creates opposite-direction exit via `createExit` API
  - `handleDeletePair(pair)`: deletes both forward and reverse exits
  - New lucide icons imported: `ChevronDown`, `ChevronRight`, `ArrowRight`, `ArrowRightLeft`
  - React `Fragment` imported for pair+expanded row groups

**Build:** ✅ Clean

---

## 2026-03-29T17:34Z: Orchestration Checkpoint — Legend + Exit Pairs Delivery

**Status:** COMPLETE

Both tasks delivered and merged into team orchestration log.

**Deliverables Verified:**
1. Zone Designer Legend Panel — live in ZoneDesigner.tsx, all visual elements documented
2. Exit Pairs Refactor — live in ZonesDetail.tsx Exits tab, bidirectional grouping + reverse action working

**Team Impact:**
- Zone Designer now has discoverable legend panel for content team onboarding
- Exit workflow aligns with bidirectional connection mental model used in map view
- Both features support Laeral's Siltgate expansion work (136-room city with repeated streets)

**Orchestration Logs Created:**
- `.squad/orchestration-log/2026-03-29T17-34-regis-legend.md`
- `.squad/orchestration-log/2026-03-29T17-34-regis-exit-pairs.md`

**Team Roster Status:** Regis — 2 successful feature deliveries this cycle

## 2026-03-27 — Zone Designer Exit Pair Rendering

**Completed:** Updated ZoneDesigner SVG map to render exit pairs instead of individual exits  
**Files Modified:** 1 (`packages/client/src/pages/admin/ZoneDesigner.tsx`)

**Build:** ✅ Clean

### What changed:
- **SVG rendering:** Exits between rooms are now grouped into pairs via `ExitPair` interface + `exitPairs` useMemo. Bidirectional pairs render as a single plain line (no arrowhead). One-way exits render with an amber arrowhead (`#F59E0B`) to visually flag them as unusual.
- **Side panel:** When clicking a pair line, the panel shows both directions with independent locked/hidden toggles. One-way exits show an "Add Reverse" button. Bidirectional pairs show a delete button on the reverse direction card to break the pair. Portal/inter-floor exits still use the original single-exit panel as fallback.
- **Connect mode:** The bidirectional checkbox is now visually highlighted with a border+background treatment and labeled "↔ Bidirectional" for prominence.
- **Legend:** Updated to show "Bidirectional" (no arrow) and "One-Way" (amber arrow) styles. Removed "Missing Reverse" entry since one-way exits are now first-class visuals.

### Key implementation details:
- `ExitPair` groups exits by matching `fromRoom/toRoom` + `OPPOSITE[direction]`. Each pair has a `forward` (the first exit found) and optional `reverse`.
- `selectedPair` is derived via useMemo from `selectedExit` + `exitPairs`. When non-null, the pair panel takes precedence over the old single-exit panel.
- `reverseExitEditForm` state tracks locked/hidden for the reverse direction independently.
- `handleSavePair()` updates both exits in sequence. `handleAddReverse()` creates the reverse exit. `handleDeleteReverseOnly()` deletes just the reverse.
- Unused code cleaned up: `missingReverseIds` useMemo, `arrowhead`/`arrowhead-warning`/`arrowhead-interfloor` SVG markers.

## 2026-03-29 — Layout Algorithm: Eliminate Diagonal Exits

**Completed:** Fixed diagonal exit lines in Zone Designer for complex zones like Siltgate  
**Files Modified:** 2 (`packages/client/src/map/computeLayout.ts`, `packages/client/src/map/__tests__/computeLayout.test.ts`)

**Build:** ✅ Clean — all 2262 tests pass

### Problem:
Siltgate (136 rooms, 286 exits, 7 quarters across 3 z-levels) produced 12 diagonal exit lines in the Zone Designer. Cross-quarter connections created topological cycles that the BFS placement couldn't resolve on a 2D grid.

### Root Cause:
The layout algorithm's scoring function under-penalized diagonals (only 5 points vs 1 per non-adjacent cell). The force-directed relaxation phase couldn't fix diagonals introduced by cross-quarter cycles because moving one room often created problems for its neighbors.

### Solution (3 changes to `computeLayout.ts`):

1. **Scoring penalties:** Increased diagonal penalty 5→20. Added direction mismatch penalty (15) for exits where the spatial relationship contradicts the exit direction (e.g., "east" exit but target is west).

2. **Neighbor-aware candidate generation:** During relaxation, also consider positions where specific neighbors "want" a room (not just the average ideal position).

3. **Phase 5 — `fixDiagonalCascade()`:** New post-relaxation phase with 3 strategies:
   - **Strategy 1:** Move single endpoint to shared axis with occupant displacement
   - **Strategy 2:** Move both endpoints of a diagonal to a shared intermediate axis
   - **Strategy 3:** Push cascade — shift entire chains of rooms along the misaligned axis. The push set includes all adjacent neighbors that would become diagonal, direction-reversed, or too distant (>2 manhattan) after the shift. Supports both ±1 and exact-offset shifts. 40-room cascade limit.

### Results:
- Siltgate diagonals: 12 → 0
- All 20 pre-existing layout tests continue to pass
- Added test #21: full Siltgate topology asserting zero diagonals (runs in ~430ms)

### Key Learnings:
- Exit data was 100% consistent — the problem was purely algorithmic
- Direction mismatch penalty prevents the swap phase from reversing room order
- Push cascades must include ALL neighbors impacted by a shift (not just diagonal-creating ones) — direction reversals and distance blowups also need propagation
- The 40-room cascade limit is sufficient for Siltgate; larger zones may need tuning

## 2026-03-28 — Room-over-exit-line occlusion fix

**Completed:** Phase 6 (fixOcclusions) added to computeLayout.ts to reduce rooms sitting on exit line segments
**Files Modified:** 2

- `packages/client/src/map/computeLayout.ts` — BFS exit line avoidance, `findNearestDirectional()` soft-blocking of exit lines, `occlusionAwareScore()`, Phase 6 with single-room moves / swaps / segment compaction
- `packages/client/src/map/__tests__/computeLayout.test.ts` — Siltgate occlusion regression test, standalone occlusion test

**Build:** ✅ Clean
**Tests:** ✅ 22 client, 2051 server, 158 shared (all pass)

### Learnings:
- **Occlusion penalty weight is sensitive:** Increasing occlusion penalty in `layoutScore` from 3→12 destabilized the diagonal optimization trajectory (greedy optimizer follows different paths with different weights). Solution: keep original weight (3) in shared scoring, use separate `occlusionAwareScore` (weight 15) only in the occlusion-fix phase.
- **`wouldCreateDiagonal` per-room check is necessary:** Without it, Phase 6 swaps/moves can introduce diagonals that Phase 5 already fixed. Must be a hard constraint, not just a penalty.
- **Zero occlusions is infeasible in dense zones (80+ rooms):** Cross-cutting chains create inherent conflicts where fixing one occlusion creates another. Test should verify specific reported rooms, not expect zero globally.
- **BFS exit line avoidance has limited impact:** Only prevents ~2 occlusions because force-directed relaxation rearranges rooms afterward. The post-layout Phase 6 does the heavy lifting.
- **Segment compaction strategy:** Trying to move exit endpoints closer (reducing segment length) is effective when single-room moves of the occluder are blocked by diagonal constraints.
- **Direction reversal guards are essential in layout optimizer:** The direction mismatch penalty (15) in `layoutScore` and `occlusionAwareScore` is insufficient to prevent direction reversals in dense zones. Hard guards (`moveWouldIncreaseMismatches`, `swapWouldIncreaseMismatches`) must be applied to ALL optimization phases (force-directed, diagonal cascade, occlusion fix) to ensure no room is ever placed opposite to its exit direction. These guards use a pre-built reverse adjacency map to check both forward and reverse exits efficiently.
- **Direction correctness > diagonal elimination > occlusion avoidance:** In the layout scoring hierarchy, direction reversals are the most visible and confusing artifact. Diagonals are tolerable (≤2 in 136-room zones). Occlusions are least severe. The optimization guards enforce this priority.
- **Penalty value is fragile for direction enforcement:** Different penalty values (15, 20, 25, 30, 40, 50, 100) each produce radically different optimization trajectories in dense zones. Hard guards are the only reliable way to enforce direction correctness.

## 2026-03-27T21:10Z — Direction Reversal Fix

**Completed:** Fixed harbourmasters-office direction reversal in Zone Designer layout
**Files Modified:** 2

- `computeLayout.ts` — Added `reverseExits` adjacency map, `countMismatchesInvolving()`, `moveWouldIncreaseMismatches()`, `swapWouldIncreaseMismatches()` guard functions. Applied guards to all optimization phases.
- `computeLayout.test.ts` — Added 2 new direction correctness tests, added direction violation check to Siltgate integration test, softened diagonal tolerance to ≤2 for dense zones, updated occlusion regression filters.

**Build:** ✅ Clean
**Tests:** ✅ 24 passed (0 failed)

**Root Cause:** Force-directed swap phase could accept swaps that reversed room directions when the combined improvement from diagonal/distance/occlusion reduction outweighed the direction mismatch penalty (15). The same issue existed in diagonal cascade and occlusion fix phases.

**Fix:** Pre-built reverse adjacency map enables efficient bidirectional mismatch counting. Hard guards reject any move/swap that would increase the total direction mismatch count for the affected room and its neighbors.

## 2026-03-29 — Grid Expansion for Occlusion Resolution

**Completed:** Added Phase 7 (grid expansion) to resolve occlusions without violating direction constraints
**Files Modified:** 2

- `packages/client/src/map/computeLayout.ts` — Added `resolveOcclusionsByExpansion()` function and iterative expansion+fix loop
- `packages/client/src/map/__tests__/computeLayout.test.ts` — Tightened assertions, added harbourmasters-office/barnacled-quay specific checks

**Build:** ✅ Clean
**Tests:** ✅ 24 passed (0 failed)

**Problem:** Previous fix (commit 72e9783) added `moveWouldIncreaseMismatches` and `swapWouldIncreaseMismatches` guards that prevented direction reversals but reintroduced occlusions — rooms drawing on top of exit lines because the guards prevented the optimizer from spreading rooms out.

**Solution:** Grid expansion via group shifts. Instead of moving individual rooms (which triggers direction guards), shift entire groups of connected rooms perpendicular to occluded segments. This preserves internal directional structure while creating extra space. Algorithm: BFS from occluder to build shift group (adds neighbors that would break if not shifted together), validates no boundary reversals, accepts if score improves.

**Results:** Siltgate occlusions: 54→16 (70% reduction). harbourmasters-office completely cleared. 0 direction violations. 2 diagonals (unchanged).

## Learnings

- **Grid expansion is the right pattern for occlusion resolution:** When direction guards prevent individual room moves, shifting entire groups of connected rooms preserves relative positions while creating space. Key insight from dkirby-ms: "add extra columns or rows to accommodate incongruous spatial relations."
- **Iterative expansion+fix loop is effective:** Running fixOcclusions after grid expansion exploits newly freed cells. 3 rounds reduces occlusions further than a single pass.
- **Group building via BFS with collision cascade:** Start from occluder, add neighbors that would develop diagonal/reversed exits, cascade through collision positions. Group size limit (90) prevents runaway cascading.
- **Remaining occlusions are in long vertical corridors:** Rooms forming continuous north/south chains on the same column create segments that can't be resolved by perpendicular shifts alone — the entire chain would need to cascade.

## 2026-03-27T18:45Z — Death/Extraction Overlay Clobbering Fix

**Completed:** Fixed death overlay being overwritten by extraction success screen during zone death  
**Files Modified:** 3

- `useShardConnection.ts` — Guard `onRoomSwitch` handler against overwriting `death` extraction state with `success`; added `extractionRef` for synchronous state reads; added `updateExtraction` helper to keep ref and state in sync; added `deathTimerRef` with 3s auto-dismiss; exposed `dismissExtraction` callback
- `ExtractionOverlay.tsx` — Added `isZone` prop; death screen conditionally hides shard-specific content (Items Lost, Shard-sickness, Run Stats) when in a zone; zone death shows simpler flavour text
- `ShardExploration.tsx` — Destructured `dismissExtraction` from hook; wired `onReturnToRefuge` to call `dismissExtraction()` then `navigate('/refuge')`; passed `isZone` to ExtractionOverlay

**Build:** ✅ Clean  
**Tests:** ✅ 135 passed (11 files)

**Root Cause:** The `onRoomSwitch` handler unconditionally set extraction state to `success` when switching to refuge, clobbering the `death` state set 500ms earlier. The "Return to Refuge" button also never cleared extraction state — `navigate('/refuge')` was a no-op when already at that URL, leaving the overlay stuck.

**Pattern:** Use a ref (`extractionRef`) alongside useState to allow synchronous reads of current extraction state inside Colyseus message handlers (which fire outside React's render cycle). The `updateExtraction` wrapper keeps both in sync.

- **Extraction state ref pattern:** When Colyseus handlers need to read current React state synchronously (e.g. `onRoomSwitch` checking if death is active), use a ref alongside `useState` and an `updateExtraction` wrapper that keeps both in sync. Direct `useState` doesn't work because the handler closure captures stale state.
- **Death overlay auto-dismiss:** Death screen auto-clears after 3 seconds via `deathTimerRef`. Timer is cleaned up on unmount and on manual dismiss. The button calls `dismissExtraction()` to cancel the timer and clear state immediately.
- **ExtractionOverlay isZone prop:** When `isZone=true`, the death screen hides shard-specific sections (Items Lost, Shard-sickness, Run Stats) and shows simpler zone-appropriate text instead.

## 2026-03-30T00:30Z — Extraction Overlay & Zone Death Fix

**Completed:** Fix death/extraction overlay clobbering on zone room switches  
**Files Modified:** 3

- `hooks/useShardConnection.ts` — onRoomSwitch handler now guards extraction state; checks `extractionRef.current.status !== 'death'` before setting success
- `components/ExtractionOverlay.tsx` — Added isZone prop; hides shard-specific content (Items Lost, Shard-sickness) in zone contexts
- `pages/ShardExploration.tsx` — Passes isZone prop from useLocation

**Build:** ✅ Clean  
**Tests:** ✅ 135 tests pass

**Key Decision:** Colyseus handlers fire outside React render cycle — need both ref (synchronous access) and state (re-render). Death state guards room-switch success. Auto-dismiss pattern with manual override (Return to Refuge button).

**Pattern:** Ref + State + Wrapper function pattern is reusable for any future Colyseus handler state-clobbering scenarios.

**Handoff:** Death overlay now reliable across all zone transitions. Zone Designer work (grid expansion, direction guards, occlusion fix) all complete.

## 2026-03-27 — Input Focus Restoration on Zone Switch

**Completed:** Fixed command input losing focus when switching zones  
**Files Modified:** 1

- `pages/ShardExploration.tsx` — Added `useRef` + `useEffect` to refocus input when `connectionStatus` returns to `'connected'`

**Build:** ✅ Clean  
**Tests:** ✅ 2277 passed (106 files)

**Root Cause:** During zone switches, `connectionStatus` transitions to `'connecting'`, which disables the input (`disabled={state.connectionStatus !== "connected"}`). When re-enabled, focus is lost because `autoFocus` only fires on initial mount, not on re-enable.

**Solution:** Added `inputRef` (useRef) on the command input and a `useEffect` watching `state.connectionStatus`. When status becomes `'connected'`, we `requestAnimationFrame(() => inputRef.current?.focus())` — the rAF ensures the disabled attribute is removed before focus is attempted.

**Pattern:** For any input that gets disabled/re-enabled during async transitions, use ref + useEffect + rAF to restore focus. The `autoFocus` attribute alone is insufficient for re-enable scenarios.

## 2026-03-28 — Map Z-Level Ghost Room Bug Fix

**Completed:** Fixed ghost rooms inflating floor bounds, causing incorrect ↑/↓ indicators on all rooms  
**Files Modified:** 2

- `hooks/useExplorationMap.ts` — Removed the up/down ghost room positioning block (lines ~101-121). Ghost rooms for vertical exits no longer get positions, so they can't inflate `computeFloorBounds`.
- `components/map/RoomNode.tsx` — Replaced the z-level badge (`position.z !== 0 → ↑/↓`) with exit-based badges. Now shows purple ↑ if room has an 'up' exit, ↓ if room has a 'down' exit. Color matches `INTER_FLOOR_STROKE` (#a78bfa).

**Build:** ✅ Clean  
**Tests:** ✅ 24 computeLayout tests passed

## Learnings

- **Floor bounds come from positions, not rooms.** `useFloorFilter.ts:computeFloorBounds` scans ALL positions (including ghosts). Any ghost with a synthetic z-value inflates the bounds, which cascades to FloorSelector, inter-floor edge filtering, and room visibility.
- **Up/down ghosts should not be positioned.** Unlike cardinal ghosts (which offset x/y), vertical ghosts would overlap the parent room at the same (x,y). Better to skip positioning entirely and show exit badges on the parent.
- **RoomNode exit badges vs z-badges.** The old z-badge (`position.z !== 0`) was misleading — it showed on ALL rooms of a non-zero floor. Exit-based badges (checking `roomData.exits.up/down`) are more useful and only appear on rooms that actually have vertical exits.
- **Key file paths for map rendering:** `useExplorationMap.ts` (state + ghost logic), `useFloorFilter.ts` (floor bounds + edge filtering), `MapRenderer.tsx` (SVG rendering + floor selector), `RoomNode.tsx` (room circles + badges), `ExitEdge.tsx` (edge lines + inter-floor styling), `constants.ts` (sizing/colors).

---

## Team Update (2026-03-30T00:40:00Z)

**Documented:** Zone transition bugs batch — parallel work with Drizzt on zone bugs
- Orchestration logs created: `.squad/orchestration-log/2026-03-30T00-40-regis-focus.md` and `.squad/orchestration-log/2026-03-30T00-40-regis-zlevel.md`
- Session log created: `.squad/log/2026-03-30T00-40-zone-bugs.md`
- Decisions merged into `.squad/decisions/decisions.md` (inbox files deleted)
- Client: ✅ Input focus restored on zone switch (2277 tests pass)
- Map: ✅ Ghost room z-level inflation fixed (24 layout tests pass)

**Key Patterns Documented:**
- Input focus restoration: `useRef` + `useEffect` watching `connectionStatus` + `requestAnimationFrame` for re-enable scenarios
- Ghost room positioning: Don't position up/down ghosts; show exit-based badges on parent rooms instead
