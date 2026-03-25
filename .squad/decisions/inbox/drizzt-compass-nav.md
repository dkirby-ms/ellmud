# Decision: Compass Navigation Replaces Inline Exit Links

**Date:** 2026-03-26
**By:** Drizzt (Engine Dev)
**Issue:** #195
**PR:** #205

## What

Direction/exit navigation is now handled by a persistent `CompassControl` widget in the sidebar instead of inline `Exits: [north] [east]` links reprinted on every room entry.

## Why

Inline exit links cluttered the narrative pane — every room move reprinted them, pushing story text off-screen. A persistent widget keeps exits always visible without polluting the narrative flow.

## Impact

- **Client narration no longer includes exit links.** Any component rendering `msg.type === "room"` should NOT add its own exit UI — the compass handles it.
- **`onRoomHeader` no longer emits an "Exits:" header message.** The room header dispatch updates `state.roomHeader.exits` which the compass reads reactively.
- **Exit data flow is unchanged:** Server sends `RoomHeaderMessage.exits[]`, client stores in `state.roomHeader`, compass reads from context. No new protocol messages.
- **The `exit-detection.ts` utility still exists** for potential future use (e.g., highlighting directions in LLM prose), but is no longer used for inline link rendering.
