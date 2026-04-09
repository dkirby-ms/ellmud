### 2026-07-27: Who List Server Implementation — Jarlaxle
**By:** Jarlaxle (Game Systems Dev)
**Issue:** #366

**What was built:**
- `WhoListService` — cross-room player gathering + visibility filtering
- `getWhoListPlayerData()` on ZoneRoom — public API for matchMaker iteration
- `REQUEST_PLAYER_LIST` → `PLAYER_LIST` message handler (structured data for Regis's modal)
- `who` text command (MUD-style ASCII table via narration)
- Parser + help registry updates

**Key decisions for team:**
1. **Cross-room data gathering uses matchMaker.query() → getLocalRoomById() → getWhoListPlayerData()** — Same pattern as admin routes, but through a clean public method instead of `(room as any)['players']`. If you need cross-room data in the future, follow this pattern.
2. **`who` is an async intercept in handleCommandMessage**, NOT a registered sync handler — because it needs matchMaker + DB queries. If more async commands are needed, follow this precedent: intercept before the `const ctx = this.buildCommandContext(...)` line.
3. **devModeEnabled = admin for visibility checks** — No per-player admin flag exists. When it does, update ViewerContext.isAdmin resolution in handleRequestPlayerList + handleWhoCommand.
4. **PlayerListEntry.level and .class are null** — Phase 1 has no level/class system. Fill them in when those systems land.

**Data contract for Regis:**
Client sends `REQUEST_PLAYER_LIST` (no payload) → Server responds with `PLAYER_LIST` containing `{ players: PlayerListEntry[] }`. The server pre-filters based on viewer's visibility — client renders what it receives, no further filtering needed.
