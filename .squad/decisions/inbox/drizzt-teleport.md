# Decision: targetNarrations pattern for directed player messages

**Author:** Drizzt  
**Date:** 2025-07-23  
**PR:** #335  

## Context
The `teleport` command needs to send feedback to both the admin (command issuer) and the target player. The existing architecture only supports: narrations to the sender, room broadcasts (say/emote), and whisper delivery.

## Decision
Added `targetNarrations?: { sessionId: string; narrations: NarrationEntry[] }` to `CommandResult`. ZoneRoom delivers these to the specified player after the normal result. This avoids coupling verb names into ZoneRoom's delivery logic (unlike the whisper/say special-casing).

## Impact
- Any future command that needs to notify a specific player can use `targetNarrations`
- Currently only supports a single target; could be extended to an array if needed
- ZoneRoom delivery is a simple `clients.find()` + `sendNarrate()` loop
