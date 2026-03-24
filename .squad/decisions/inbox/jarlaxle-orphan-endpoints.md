# Decision: Separate Live Rooms UI from Content Editor

**By:** Jarlaxle (Game Systems Developer)
**Date:** 2025-07-28
**Issue:** #137 — Orphan Endpoint Finalization
**PR:** #147

## Context
The task specified adding pause/resume/spawn buttons to `RoomsDetail.tsx`. However, that component is a **content template editor** (CRUD for room definitions via `/admin/api/content/rooms`). The orphan endpoints operate on **live Colyseus room instances** (`/admin/api/rooms/:roomId/pause`, etc.) — a fundamentally different concern.

## Decision
Created separate **Live Rooms** pages at `/admin/live-rooms` instead of mixing runtime controls into the content editor. Content editing and server operations are cleanly separated:

- `/admin/rooms` + `/admin/rooms/:id` → Content templates (CRUD)
- `/admin/live-rooms` + `/admin/live-rooms/:roomId` → Runtime room management (pause/resume/spawn/status)

## Rationale
- Conflating content editing with runtime operations would confuse the admin UI
- Content rooms use `useAdminEntity` hook (content CRUD pattern); live rooms use direct API calls (action pattern)
- Future: Live Rooms page can evolve into full server monitoring without impacting content workflow

## Impact
- AdminLayout sidebar: "Live Rooms" added under System section
- Routes: `/admin/live-rooms` and `/admin/live-rooms/:roomId` added
- If team prefers inline controls on content pages, the API functions are in `admin-api.ts` and can be consumed anywhere
