# Decision: Extraction Stash Transfer Pattern

**Author:** Drizzt (Engine Dev)
**Date:** 2026-03-20
**Issue:** #10 — Extraction Return to Refuge + Stash Transfer

## Decision

When a player successfully extracts from a shard, their carried inventory is automatically transferred to their persistent stash before the `ROOM_SWITCH` to refuge.

## Key Design Choices

1. **Shard Item → Stash Item bridging**: Shard `Item` (id, name, weight, description) is registered as a `StashItem` with defaults (`type: 'material'`, `rarity: 'common'`, `baseDurability: null`). When Jarlaxle's full item system (#16) lands, these defaults should be replaced with proper item metadata.

2. **StashService weight enforcement**: Transfer uses `StashService.storeItem()` which enforces the 200-unit stash capacity. Items that would exceed the limit are lost — the player is narrated about what was saved and what was lost.

3. **Pure function extraction**: Transfer logic lives in `extraction/stash-transfer.ts` as a pure async function, independent of Colyseus. ShardRoom's `transferToStash()` wraps it with narration and inventory clearing.

4. **Shared repository pattern**: ShardRoom now has `initStash(repo?, itemDefs?)` matching RefugeRoom's pattern. Both rooms should share the same `StashRepository` instance so items transferred during extraction are visible when the player returns to refuge.

## Impact on Other Agents

- **Jarlaxle**: When the full item system (#16) merges, the Item → StashItem bridge in `stash-transfer.ts` should be updated to use proper item definitions instead of defaults.
- **Minsc**: Integration tests should verify the full extraction → refuge flow end-to-end, including stash contents after extraction.
