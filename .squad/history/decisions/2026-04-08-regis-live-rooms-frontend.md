# Decision: Live Rooms Frontend — Zone Room Management

**Author:** Regis (Frontend Dev)
**Date:** 2026-XX-XX
**PR:** #352
**Issue:** #344

## Decision

Enhanced the existing `LiveRoomDetail.tsx` page with zone-room-level management rather than creating a separate admin page. This follows the approved design from `decisions.md`.

## Key Implementation Choices

1. **Tabbed interface** — Added "Room Graph | Creatures | Players" tabs to the left column. The Room Graph tab is the new default when viewing zone rooms.

2. **Client-side occupancy computation** — Rather than a new API endpoint for room occupancy, we derive it client-side by cross-referencing `room.players[].currentRoomId` and `room.creatures[].currentRoomId` against the zone room definitions from `getZone(slug)`. This is efficient for typical zone sizes (5-30 rooms).

3. **Zone data via existing `getZone()` API** — We fetch the zone definition using the new `zoneSlug` field on `LiveRoomDetail`. This reuses the existing zone-api.ts `getZone()` function rather than creating a new endpoint.

4. **Graceful degradation** — If `zoneSlug` is not yet provided by the backend, the Room Graph tab shows a helpful message explaining the backend dependency. Existing functionality (pause/resume, spawn, creatures/players lists) is unaffected.

5. **Non-zone rooms unaffected** — The tabbed interface only appears for zone rooms (`isZoneRoom`). Non-zone Colyseus rooms keep their existing layout.

## Team Impact

- **Drizzt (Backend):** Needs to add `zoneSlug` to the `GET /admin/api/rooms/:roomId` response and implement `POST /broadcast` and `POST /teleport` endpoints. Frontend is wired to the expected contract.
- **No new routes or navigation changes** — Enhancement to existing page only.
