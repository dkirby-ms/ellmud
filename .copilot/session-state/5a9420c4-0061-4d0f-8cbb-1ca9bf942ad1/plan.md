# Map UI & Admin Zone Designer — Implementation Plan

## Status: Phases A–D COMPLETE (zone system shipped)
The hand-crafted zone system is live: DB schema, PgZoneRepository, ShardRoom polymorphic loading, admin CRUD pages, Refuge seed, unified client routing. All prior todos done.

## Current Goal
Build the **player-facing map UI** and **admin visual zone designer** in parallel, sharing a common BFS layout engine.

## Design Decisions (confirmed)
1. **SVG rendering** — React SVG elements, CSS theme vars, accessible
2. **BFS layout** — all room coordinates computed client-side from connection graph; NO database coordinates
3. **Fog of war** — unexplored rooms hidden; adjacent unvisited rooms shown as ghost outlines
4. **Minimap in sidebar** — always-visible widget replacing CompassControl
5. **Full map overlay** — toggled with `M` key, z-50 overlay (like inventory drawer)
6. **Player map memory persisted** — `character_explored_rooms` table (migration 032); zone maps survive logout, shard maps ephemeral
7. **Admin designer** — new "Designer" tab in ZonesDetail alongside existing General/Rooms/Exits tabs
8. **No manual coordinates** — designers author rooms + exits only; layout is always BFS-computed
9. **Inter-zone exits** — fully supported in DB schema (targetZoneSlug/targetRoomSlug on zone_exits)

## What Already Exists
- DB: `character_explored_rooms` table + `PgExplorationRepository` (migration 032)
- DB: `zones`, `zone_rooms`, `zone_exits` tables (migrations 030-031)
- Server: `ZoneRepository` (Pg + InMemory), `convertZoneToRoomGraph()` adapter
- Server: `ShardRoom` polymorphic loading (zone or procedural)
- Client: Admin ZonesDetail.tsx with General/Rooms/Exits tabs
- Client: `CompassControl.tsx` (to be replaced by minimap)
- Shared: `ZoneDefinition`, `ZoneRoomDefinition`, `ZoneExitDefinition` types
- Shared: `Direction` type (north/south/east/west/up/down)

## Implementation Phases

### Phase 1: Shared BFS Layout Engine
Shared by both player map and admin designer. Pure function, no side effects.

- **bfs-layout**: `packages/client/src/map/computeLayout.ts`
  - Input: room graph (rooms + exits) + entry room ID
  - Output: `Map<roomId, {x, y}>` coordinates
  - Algorithm: BFS from entry, direction-aware placement (north=up, east=right)
  - Handle collisions: offset rooms that land on occupied cells
  - Handle up/down: z-layer indicator (not spatial offset)
  - Unit tests: various topologies (linear, hub-spoke, grid, loops)

### Phase 2: Server Exploration Wiring
Wire the existing ExplorationRepository into ShardRoom so the client gets exploration data.

- **exploration-messages**: Add `exploration_data` and `exploration_update` message types to `@ellmud/shared`
  - `exploration_data`: bulk payload on join (all previously visited rooms for this zone/shard)
  - `exploration_update`: single room on each room entry
- **record-visit**: Call `getExplorationRepository().recordVisit(...)` in ShardRoom on room movement
- **send-exploration**: Send `exploration_data` on join, `exploration_update` on `go` command
- **tests**: Verify exploration messages sent on join + movement

### Phase 3: Player Map UI
SVG-based map components consuming exploration data.

- **useExplorationMap hook**: `packages/client/src/hooks/useExplorationMap.ts`
  - Listens for `exploration_data` and `exploration_update` messages
  - Maintains set of visited room IDs + room graph topology
  - Calls `computeLayout()` to derive positions
  - Exposes: visitedRooms, ghostRooms, currentRoomId, positions
- **SVG components**: `packages/client/src/components/map/`
  - `MapRenderer.tsx` — SVG container, pan/zoom (optional)
  - `RoomNode.tsx` — room circle/rect with type coloring, current-room highlight
  - `ExitEdge.tsx` — line between connected rooms, direction indicators
  - `GhostRoom.tsx` — dim outline for unvisited adjacent rooms
- **MinimapWidget.tsx** — compact sidebar version, replaces CompassControl
  - Click room to navigate? Or display-only with compass still available
  - Shows current room highlighted, visited rooms, ghost adjacents
- **FullMapOverlay.tsx** — z-50 overlay, `M` key toggle
  - Larger SVG with room names visible
  - Pan/zoom for big zones
  - Close with `M` or Escape
- **Integration**: Wire into ShardExploration.tsx sidebar + overlay slot

### Phase 4: Admin Visual Zone Designer
New "Designer" tab in ZonesDetail for visual zone editing.

- **DesignerTab.tsx**: `packages/client/src/pages/admin/ZoneDesigner.tsx`
  - SVG canvas showing BFS-auto-layout of zone rooms
  - Room nodes: colored by type, labeled with name/slug
  - Exit edges: directional arrows between rooms
  - Inter-zone exits: special portal icon/color, shows target zone name
- **Add room**: Click empty space or toolbar button → creates room at position, opens inline form (name, slug, type)
- **Add exit**: Click-drag from one room to another → creates exit with direction auto-inferred from relative position
- **Delete room/exit**: Right-click or select + delete key
- **Edit room**: Click room node → sidebar/popover with room fields
- **Inter-zone connections**: 
  - Special "portal" exit mode: select target zone from dropdown, then target room
  - Rendered as distinctive portal icon on room edge
  - Shows target zone name on hover
- **Bidirectional exit helper**: When adding exit A→B north, offer to auto-create B→A south
- **Validation overlay**: Highlight problems (disconnected rooms, missing reverse exits, entry room not set)
- **Save**: Persists room/exit changes via existing admin API (CRUD to zone_rooms/zone_exits tables)

### Phase 5: Inter-Zone Map View (stretch)
Admin-only world map showing all zones and their inter-zone connections.

- **WorldMap.tsx**: Shows all zones as clusters with inter-zone portals drawn between them
- Read-only overview; click zone to open its designer
- Useful for validating the world graph is connected

## Technical Notes
- BFS layout is O(n) — fine for zones up to hundreds of rooms
- SVG chosen over Canvas for React integration, accessibility, and theme variable support
- `computeLayout()` is a pure function — easily unit-testable without DOM
- Player map uses fog of war; admin designer shows all rooms (no fog)
- Room type color scheme from admin already defined in RoomsList.tsx (entry=green, boss=red, junction=teal, etc.)
- Direction-to-offset mapping: north=(0,-1), south=(0,1), east=(1,0), west=(-1,0), up/down=z-layer badge
