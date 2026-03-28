# Bruenor — History

## Project Context

- **Project:** Ellmud — PvPvE Extraction RPG / Real-Time MUD
- **Stack:** Node.js, Colyseus, React, PostgreSQL
- **Description:** Procedurally generated shard instances, tick-based combat, server-authoritative game state, LLM narration layer. Text-primary interface with ANSI colour and UTF-8 box-drawing.
- **User:** dkirby-ms
- **Joined:** 2026-03-28

## Key Context

- Admin API endpoints for content management under `/admin/api/`
- Zone CRUD: `/admin/api/zones/` — create zones, rooms, exits
- Item CRUD: `/admin/api/items/` — create items with tiers and stats
- NPC CRUD: `/admin/api/npcs/` — create creatures with stat blocks
- Cross-zone exits use `target_zone_slug` + `target_room_slug` columns in `zone_exits`
- Orphaned exit cleanup: GET/POST `/admin/api/zones/cleanup/orphaned-exits`
- All content is live immediately (no staging/promotion system)
- DB schema defined in `packages/server/src/db/migrations/`

## Learnings
