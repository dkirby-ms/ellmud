# Decision: Live Rooms Admin API Design

**Author:** Drizzt (Engine Dev)  
**Date:** 2026-04-08  
**Issue:** #344  
**PR:** #353

## Decision

Added public admin methods to ZoneRoom (`adminBroadcastToRoom`, `adminTeleportPlayer`, `adminGetLiveRooms`, `getZoneSlug`) rather than having admin routes reach into ZoneRoom internals via `as any` casts.

## Rationale

The existing admin routes already use `(room as any)['creatureManager']` for spawn. Rather than continuing this pattern for 4 new endpoints, I added well-defined public methods on ZoneRoom that encapsulate the logic. This:
1. Keeps ZoneRoom's private methods private (broadcastToRoom, broadcastPlayerMovement, etc.)
2. Makes the admin API surface explicit and testable
3. Reduces the risk of breaking admin routes when ZoneRoom internals change

## Impact

- **Regis (frontend):** Can use the typed request/response interfaces from `@ellmud/shared` when building the admin UI
- **Minsc (testing):** The public methods on ZoneRoom can be unit-tested directly, and the endpoints can be integration-tested via supertest
- **Future:** If we add more admin operations (e.g., kick player, force encounter), the pattern is established — add a public `admin*` method on the room class
