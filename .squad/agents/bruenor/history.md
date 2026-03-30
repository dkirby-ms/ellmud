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

### The Siltgate City Zone Build (2026-03-29)
- **Migration:** `004_seed_siltgate.sql` (1478 lines, 89KB)
- **Zone:** `the-siltgate` — persistent city zone, tier 1, urban biome
- **Rooms:** 136 total across 7 quarters on 3 vertical levels:
  - Market Square (10 rooms, hub/entry, z=0)
  - Silver Arcade (18 rooms, merchant quarter, z=0)
  - Highwind Estates (16 rooms, noble promenade, z=1)
  - Dockward (22 rooms, harbour, z=0, pvp)
  - Beggar's Span (22 rooms, slums, z=0, pvp)
  - Ashgate Wastes (22 rooms, ruins, z=0, pvp)
  - Drowned Veins (26 rooms, sewers, z=-1, pvp)
- **Exits:** 286 total (282 intra-zone bidirectional + 4 cross-zone)
  - Cross-zone: city-gate↔the-refuge/market, ashgate↔warrens/shattered-gate
  - Return exits added to Refuge and Warrens zones (ON CONFLICT DO NOTHING)
  - Hidden exits: smugglers-cove (off tide-gate), thieves-den (off rat-run-2)
- **New items:** 17 (dockworker_hook, smugglers_dagger, fish_knife, leather_jerkin, smugglers_cloak, plague_mask, city_map, sewer_lamp, silk_scarf, brass_compass, harbor_manifest, alley_thugs_coin, dock_rope, noble_signet_ring, silt_venom_sac, serpent_scale, harbourmaster_key)
- **New creatures:** 8 (city_dog, pigeon_flock, feral_dog, alley_thug, dockside_smuggler, silt_serpent, plague_bearer, the_harbourmaster)
- **Bosses:** the_harbourmaster (Dockward), plague_bearer (Drowned Veins)
- **Room duplication directive followed:** Generic rooms (Narrow Alley, Dock Street, Sewer Tunnel, etc.) share display names with unique slugs and distinct descriptions
- **Validation:** All exits bidirectional, no orphaned refs, no duplicate slugs, all cross-zone targets verified
