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
