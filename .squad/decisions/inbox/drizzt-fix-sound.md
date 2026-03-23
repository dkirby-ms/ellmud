# Decision: Room properties must be plumbed through all adapter layers

**Author:** Drizzt
**Date:** 2026-03-21
**Context:** PR #118 review fix

## Decision
When the shared `Room` interface adds optional fields (like `properties`), the local `Room` interface in `packages/server/src/shard/RoomGraph.ts` and the `adaptRoom()` function in `graph-adapter.ts` must be updated to preserve them. Subsystem resolvers (e.g., SoundSystem's `RoomResolver` in ShardRoom) must also pass through any fields the subsystem consumes.

## Rationale
The `properties` field was present in the shared type and in SoundSystem's `SoundRoom` interface, but silently dropped at three points in between. Unit tests passed because they used mock data with properties — only production paths lost them. This is a systemic risk whenever adapter layers sit between data sources and consumers.

## Rule
Any new field added to `@ellmud/shared Room` that affects gameplay must be:
1. Added to the local `Room` interface in `RoomGraph.ts`
2. Copied in `adaptRoom()` in `graph-adapter.ts`
3. Forwarded in any subsystem resolvers that need it
