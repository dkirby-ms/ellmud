### Issue #309: Player UX — Entering the Game
**By:** Regis (Frontend Dev)

## Decision

Replaced the `/refuge` client route with `/zone` as the player hub entry point. ZoneExploration now dynamically resolves the player's faction stronghold via `GET /api/spawn-zone` instead of hardcoding `zone:the-refuge`. The "Enter Refuge" button is now "Enter World".

## Rationale

The GDD updated faction home zones so players spawn at faction-specific strongholds (The Foundry, The Cartographium, The Counting House), not the generic Refuge. The `/refuge` URI was misleading since Refuge is now a devs-only zone. The `/zone` route is generic and works for any faction.

## Key changes

- **Route:** `/refuge` → `/zone` (hub), `/zone/:zoneId` (specific zones) — both unchanged in structure
- **Hub detection:** `location.pathname === "/refuge"` → `useParams().zoneId` absence + `/api/spawn-zone` API call
- **Room name:** Hardcoded `zone:the-refuge` → dynamic from spawn-zone response (e.g. `zone:the-foundry`)
- **Guard added:** `useZoneConnection` skips connection when `roomName` is empty (during async spawn-zone resolution)
- **Fallback:** If spawn-zone API fails, defaults to `zone:the-refuge`

## Impact

- **All client navigation** updated: CharacterSelect, ZoneExploration, Settings, Leaderboard, ErrorFallback, AdminLayout, useZoneConnection
- **Tests:** All 2533 tests passing; test mocks updated with `fetchSpawnZone`
- **No server changes needed** — `/api/spawn-zone` endpoint already existed (Drizzt's work)
