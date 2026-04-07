# Session Log: 2026-03-25T15:23 — Persistence Investigation

**Agent:** Elminster  
**Topic:** Player persistence lifecycle analysis  

## Root Cause: Identity Handoff Bug

Auth system works correctly. Identity loss occurs at `onJoin`:

- **Auth:** Sets `client.auth.playerId` ✓
- **onJoin:** Reads `options['playerId']` (always undefined in production) ✗
- **Fallback:** Uses `client.sessionId` (9-char nanoid, not UUID)
- **Result:** All FK writes fail silently, no persistence

**Files:** `ShardRoom.ts:252`, `RefugeRoom.ts:91`  
**Fix:** Read from `client.auth` instead of options

**Decision:** `.squad/decisions/inbox/elminster-player-identity-handoff-bug.md`
