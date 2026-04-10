# Decision: Room-Level Illumination System (Phase 1)

**Author:** Jarlaxle (Systems Dev)
**Date:** 2026-04-10
**Issue:** #402
**PR:** #407
**Status:** Proposed

## Context

The game needs a visibility system where certain rooms are dark, hiding their contents from players. This is Phase 1 — room-level illumination only (no light sources, darkvision, or dynamic lighting yet).

## Decision

### Illumination type

Added `Illumination = 'lit' | 'dark'` as a union type in `@ellmud/shared`. The field is optional on Room interfaces — omitted means lit. This ensures all existing rooms are unaffected (zero migration risk) and the type is extensible for future phases (e.g. `'dim'`).

### DB schema

Added `illumination TEXT NOT NULL DEFAULT 'lit'` to `zone_rooms`. Using TEXT (not BOOLEAN) to support future illumination levels without another migration.

### Darkness behavior

Dark rooms:
- Show `DARKNESS_MESSAGE` ("It is too dark to see.") instead of room description
- Hide creatures, items, other players, and features
- Still show **exits** (so players can navigate)
- Still send **roomHeader** (so client knows the room name)
- Player can still move through dark rooms freely

### Two Room interfaces

Both `packages/shared/src/room-graph.ts` (Room) and `packages/server/src/generator/RoomGraph.ts` (Room) needed the `illumination` field. The shared one flows through zone-adapter; the server one is used by CommandContext in handlers.

### NarrationRoom.light_level

Previously hardcoded to 1.0 with a TODO. Now populated from `room.illumination` (0.0 for dark, 1.0 otherwise). This feeds the AI narration layer so it can adapt prose to darkness.

## Alternatives considered

1. **Zone-level darkness** — Too coarse; individual rooms need control.
2. **Boolean `isDark`** — Less extensible than a string union type.
3. **Hide exits in dark rooms** — Would trap players; rejected for playability.

## Phase 2 considerations

- Light sources (torches, lanterns) that override room darkness
- Darkvision trait for certain characters
- Dynamic illumination (time-of-day, spell effects)
- `'dim'` illumination level with partial visibility
