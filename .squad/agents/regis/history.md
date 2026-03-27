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

