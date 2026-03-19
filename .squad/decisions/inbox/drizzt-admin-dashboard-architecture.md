# Decision: Admin dashboard on same Express server

**By:** Drizzt
**Date:** 2026-07-21
**Issue:** #14

## What
The admin dashboard runs on the same Express server as the game, not a separate process. Admin routes are at `/admin/api/*`, dashboard UI at `/admin/`. Auth is via `ADMIN_TOKEN` env var (separate from player auth). Real-time updates use SSE (Server-Sent Events), not a WebSocket admin client.

## Why
- Single process keeps Phase 1 deployment simple (one container)
- SSE is simpler than WebSocket for one-way admin data flow
- Separate admin token prevents privilege confusion with player auth
- Inline HTML avoids a build step and framework dependency for admin UI

## Trade-offs
- SSE polling at 2s interval means slight delay vs true push
- Admin accessing private Room fields (`players` map) uses `as any` — will need cleanup if Room API changes
- Single process means admin load affects game server (acceptable at Phase 1 scale)
