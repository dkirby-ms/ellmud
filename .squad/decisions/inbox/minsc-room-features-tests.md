# Decision: Room Features Test Strategy

**Author:** Minsc (Tester)  
**Date:** 2026-07  
**Related:** #345, PR #351

## Decision

Proactive tests written against the design spec in `decisions.md` before Jarlaxle's implementation lands. Tests define the `RoomFeature` interface locally and use type assertions (`Room & { features?: RoomFeature[] }`) to avoid depending on types that don't exist yet.

## Key test expectations locked in

- `look <target>` with matching keyword → feature's `longDescription` as narration type `'room'`
- `look <target>` with no match → `"You don't see..."` message as type `'system'`
- `look` with no args → unchanged room description behavior
- Case-insensitive keyword matching
- First-match-wins when multiple features share a keyword
- Exact match only — `"note"` does NOT match `"notebook"`
- Rooms with `features: []` or `features: undefined` work normally

## Rationale

Writing tests first establishes a contract Jarlaxle's implementation must satisfy. If the implementation deviates from the spec, failing tests will surface the gap immediately. Minor adjustments (import paths, exact error wording) are expected when the PR merges.
