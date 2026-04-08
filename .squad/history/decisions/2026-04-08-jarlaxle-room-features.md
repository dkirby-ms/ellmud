# Room Features — Implementation Decision Record (Issue #345, PR #354)

**Agent:** Jarlaxle (Systems Dev)
**Date:** 2026-04-08

## Decision: RoomFeature Interface Fields

The design proposal in decisions.md used `shortDescription`/`longDescription`. The task spec explicitly requested `name`, `description`, and `type`. I followed the task spec:

```typescript
interface RoomFeature {
  id: string;
  keywords: string[];
  name: string;        // display name
  description: string; // what the player sees on examine
  type: string;        // e.g., "readable", "examinable"
  questId?: string | null;
}
```

**Rationale:** `name` + `description` is clearer than `shortDescription` + `longDescription`. The `type` field enables future conditional behavior (readable vs interactive vs discoverable).

## Decision: features required on ZoneRoomDefinition, optional on Room

- `ZoneRoomDefinition.features: RoomFeature[]` — Required, matching the DB column (`NOT NULL DEFAULT '[]'`)
- `Room.features?: RoomFeature[]` — Optional, since procedural and test rooms don't have features

This required adding `features: []` to ~8 test files that construct ZoneRoomDefinition objects directly. Consistent with the `npcs`, `lootContainers`, `hazards` pattern.

## Impact on Pre-Existing Proactive Tests

The `room-features.test.ts` file existed on disk (untracked) with a local `RoomFeature` type. Updated all 23 tests to use the actual shared type. All pass.
