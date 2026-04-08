# Decision: Include roomGraphRooms in zone detail response

**Author:** Drizzt (Engine Dev)
**Date:** 2025-07
**Commit:** `e3d506b`
**Status:** Implemented on dev

## Context

The admin Room Graph tab was unable to display spawned creatures because it depended on a separate zone-data API call (`GET /admin/api/zones/:slug`) to determine the room list. For procedural zones that have no `zoneSlug`, this fetch always returned null, causing the `roomOccupancy` useMemo to short-circuit with an empty map — silently hiding all creature occupancy.

The previous fix (commit `a82cf3d`) addressed three surface symptoms (fire-and-forget `loadRoom`, invalid room ID validation, hardcoded zone name) but did not fix the root cause.

## Decision

Include the live room graph rooms in the `getZoneDetail()` response as a new `roomGraphRooms[]` field. The client now uses this authoritative room list as a fallback when zone data is unavailable.

## Rationale

- The server already has the room graph — duplicating the fetch on the client creates an unnecessary failure point.
- This fixes both procedural zones (no `zoneSlug`) and any scenario where the zone API fetch fails.
- The room graph is the source of truth for creature placement (spawn validates against it), so using it for display ensures consistency.

## Trade-offs

- Slightly larger room detail response (adds room id/name/type per room).
- When full zone data IS available, it's still preferred for richer metadata (properties, NPCs, loot containers).
