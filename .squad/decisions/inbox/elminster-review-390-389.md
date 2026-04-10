# Review Decision: #390 + #389 Approved

**Date:** 2026-07-22
**Author:** Elminster
**PRs:** #392 (Item Interaction), #393 (Admin Item Spawn)

## Decisions

1. **Both branches approved and PRs opened.** All tests pass on both branches.

2. **Merge order matters.** PR #392 (item interaction) should merge first — it introduces `equipSlot` on the `Item` interface. After that merges, PR #393 (admin spawn) should be updated to include `equipSlot` and `roomDescription` in the spawned item construction (`itemToSpawn` in `routes.ts`).

3. **`_roomEvent` pattern (non-blocking).** Branch #390 introduces `_roomEvent` as an ad-hoc field on `CommandResult` for 3rd-person broadcast messages. If more commands adopt this pattern, it should be formalized into the `CommandResult` interface proper. For now, the underscore-prefixed convention is acceptable.

4. **Content entity to domain object mapping.** The admin spawn route manually constructs `itemToSpawn` with only 4 fields. This will silently drop new fields as the `Item` interface grows. A shared `toItem()` mapper (like the existing `toCreatureTemplate()`) should be created. Non-blocking for this PR wave.

## Action Items

- After #392 merges, update #393 to pass through `equipSlot` and `roomDescription` in `itemToSpawn`
- Consider formalizing `_roomEvent` on `CommandResult` if a third command uses it
