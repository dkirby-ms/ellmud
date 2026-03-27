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
