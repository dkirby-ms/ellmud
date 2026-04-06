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

---

## 2026-03-30T19:15Z: Zone-Topology Skill Reference — Future Implementation Guide

**Relevant to:** Siltgate implementation work and all future zone design tasks  
**Skill Location:** `.squad/skills/zone-topology/SKILL.md` (created by Laeral)

**Context:** Laeral analyzed the Siltgate zone topology and identified 6 topological conflicts (Δ=3 to Δ=17) with 35+ position collisions. These arise from the zone's exit graph structure, not engine defects. The zone-topology skill captures lessons learned and provides guidelines for designing topologies that layout cleanly.

**For Bruenor — Building Siltgate:**
- Reference the skill's **Pre-Handoff Checklist** before implementing room additions
- Use the **Cycle Validation Formula** to verify any major structural changes
- When fixing conflicts, budget intermediate bridge rooms based on the **Bridge Room Budgeting** guidelines (roughly N/2 rooms per Δ=N conflict)
- Proposed fixes are documented in `laeral-siltgate-topology-fixes.md` (now merged to decisions.md) — prioritized by conflict severity

**Cross-Skill Resources:**
- Drizzt's constraint documentation (decisions.md, 2026-03-30T19:15) explains the layout algorithm phases, penalty weights, and why conflicts arise in cyclic graphs
- Together, Laeral's design patterns + Drizzt's engine constraints = complete reference for zone design

**Files Generated:**
- Skill: `.squad/skills/zone-topology/SKILL.md`
- Orchestration log: `.squad/orchestration-log/2026-03-30T19-15-laeral.md`
- Decisions merged: decisions.md now contains user directive, Drizzt's constraints, and Laeral's topology analysis

### Siltgate Topology Fixes (2025-07-24)
- **Migration:** `005_siltgate_topology_fixes.sql`
- **Source:** Laeral's bridge-room-designs (`.squad/decisions/inbox/laeral-bridge-room-designs.md`)
- **Changes applied:**
  - 2 new rooms: `rubble-passage-1` (corridor, Ashgate bridge) and `gutter-sewer` (dead_end, slum sewer access)
  - 10 exits deleted: 5 bidirectional pairs that caused topological conflicts (Δ=3 to Δ=17)
  - 8 exits inserted: 4 bidirectional pairs — bridge connections via new rooms + promenade reroute
  - `collapsed-building-1` type changed from `dead_end` to `corridor` (now has north+south exits)
  - `sewer-junction-2` and `sewer-tunnel-4` descriptions updated with collapsed-passage narrative text
- **Zone total:** 138 rooms, 284 exits (was 136 rooms, 286 exits)
- **Pattern notes:** Matched 004_seed_siltgate.sql exactly — cross-join VALUES, NULLIF for target columns, subquery for zone_id in DELETEs, text[] casts for properties
- **Transaction:** Full BEGIN/COMMIT wrap for atomicity

### Warrens Topology Fixes (2025-07-25)
- **Migration:** `007_warrens_topology_fixes.sql`
- **Source:** Laeral's warrens-topology-fixes (`.squad/decisions/inbox/laeral-warrens-topology-fixes.md`)
- **Changes applied:**
  - 8 new rooms: `sewer-drip-tunnel`, `sewer-cracked-conduit`, `sewer-blind-turn`, `sewer-narrow-drain` (Fix A-1); `sewer-rubble-choke`, `sewer-trickle-passage`, `sewer-slime-channel`, `sewer-stagnant-pool` (Fix A-2)
  - 16 exits deleted: 8 bidirectional pairs — ratways↔main-junction (A-1), south-tunnel↔west-conduit (A-2), west-conduit↔cistern (A-2), broken-sanctuary↔sunken-square (B)
  - 22 exits inserted: 11 bidirectional pairs — 5 pairs for A-1 chain (S→S→W→S→E into sewer-north-tunnel), 6 pairs for A-2 chain (W→S→E→S→E→E into cistern)
  - `broken-sanctuary` description updated with bricked-up doorway text (now a dead-end)
- **Zone total:** 109 rooms (was 101); 0 BFS conflicts after changes
- **Critical slug note:** Warrens zone slug is `warrens`, NOT `the-warrens` — verified from 003_seed_zones.sql
- **Pattern notes:** Matched 005_siltgate_topology_fixes.sql structure — BEGIN/COMMIT, sectioned comments, cross-join VALUES for rooms/exits, individual DELETEs with subquery zone_id
- **Transaction:** Full BEGIN/COMMIT wrap for atomicity

### Faction and Stronghold Rename (2026-03-31)
- **Migration:** `017_faction_renames.sql`
- **Source:** Thematic realignment document (`docs/thematic-direction.md`)
- **Faction changes:**
  - `ironwright` → `kindari` (The Ironwright Compact → The Kindari)
  - `veil` → `bloom-tenders` (The Veil Cartographers → The Bloom Tenders)
  - `scarlet` → `krewe-calliope` (The Scarlet Ledger → Krewe Calliope)
- **Stronghold zone changes:**
  - `the-foundry` → `the-reliquary` (The Foundry → The Reliquary)
  - `the-cartographium` → `the-bloom-observatory` (The Cartographium → The Bloom Observatory)
  - `the-counting-house` → `the-carrion-court` (The Counting House → The Carrion Court)
- **Database updates:** Factions table (slug, name, description), zones table (slug, name, description, faction_slug, entry_room_slugs), zone_rooms (slugs, names, descriptions for all 30 stronghold rooms), zone_exits (room slug references), characters table (faction_slug, last_inn references)
- **Code updates:**
  - Server: `zones/stronghold.ts` (FACTION_SLUGS, FACTION_STRONGHOLD_MAP, HUB_DISPLAY_NAMES), `db/types.ts` (FactionSlugs enum), `api/characters.ts` (validFactions array), `character/InMemoryCharacterRepository.ts` (faction name mapping)
  - Client: `pages/CharacterSelect.tsx` (FACTIONS array), `hooks/useZoneConnection.ts` (hub zone checks), `pages/Leaderboard.tsx` (placeholder faction names)
  - Tests: `death-spawn-routing.test.ts`, `faction-repository.test.ts`, `faction-strongholds.test.ts`, `character-repository.test.ts`, `pg-character-repository.test.ts` (all faction slug references)
- **Room mapping:** Each stronghold has 10 rooms (8 original features + 2 inn rooms from migration 016). Room descriptions pulled from thematic direction doc sections 1.1, 1.2, 1.3.
- **Pattern notes:** Migration uses UPDATE statements to preserve row IDs and foreign key relationships. All room slug references in zone_exits updated after room slug changes. Entry room slugs updated to point to new inn room slugs.
- **Build verification:** TypeScript compilation successful — all imports and type references updated correctly.

### Gold to Water Currency Rename (2026-03-31)
- **Migration:** `018_gold_to_water.sql`
- **Source:** Thematic realignment — post-apocalyptic Gulf Coast water economy (`docs/thematic-direction.md` §8)
- **Database changes:**
  - `characters.gold` → `characters.water` (potable water as currency, units called "draws")
  - Migration added after 017_faction_renames, uses simple ALTER TABLE RENAME COLUMN
- **Code updates:**
  - `llm-client.ts`: Updated FORBIDDEN_PATTERNS regex to catch `water` and `draws` numbers (kept `gold|coins` for LLM hallucination protection)
  - `wave3-narration-contracts.test.ts`: Updated test description and added water/draws test case
- **Pattern notes:** Simple column rename migration following BEGIN/COMMIT wrap pattern
- **Build verification:** TypeScript compilation successful — no type errors after changes
- **Economy context:** Clean drinking water ("draws") replaces generic gold coins as the post-apocalyptic currency. Aligns with Gulf Coast flooding/survival setting.

### Room Flavor Rewrite Migration 019 (2026-04-06)
- **Migration:** `019_room_flavor_rewrite.sql`
- **Source:** Laeral's complete room description document revision 2.0 (`.squad/decisions/inbox/laeral-room-descriptions.md`)
- **Purpose:** Complete rewrite of ALL Siltgate and Warrens room names and descriptions to align with dystopian Gulf Coast setting (year 3000, ruins of New Orleans)
- **Changes applied:**
  - Zone descriptions: Updated both Siltgate and Warrens zone descriptions (from `docs/thematic-direction.md` §2.1 and §2.2)
  - Siltgate rooms: 137 UPDATE statements (136 original + 1 topology fix: rubble-passage-1)
  - Warrens rooms: 75 UPDATE statements (65 original + 9 topology fixes: gutter-sewer + 8 sewer-* rooms + shattered-gate)
  - Total: 212 room updates + 2 zone description updates = 214 UPDATE statements
- **Critical fix:** Laeral's document had "ashgate" listed twice under Siltgate section — second entry (Type: warrens) was actually shattered-gate in Warrens zone. Corrected in migration to update slug='shattered-gate' in warrens zone.
- **Setting elements:** Mississippi shifted west to Atchafalaya, Gulf creeping inland, flooded streets, drone debris, spanish moss, kudzu, mutant wildlife (dog-sized rats, giant roaches, mutant snakes), brackish water, rusted pre-extinction infrastructure, Creole/Cajun architecture, oppressive humidity
- **SQL pattern:** Each UPDATE uses subquery for zone_id to avoid cross-zone collisions: `WHERE slug = '{room-slug}' AND zone_id = (SELECT id FROM zones WHERE slug = '{zone-slug}')`
- **Escaping:** All single quotes doubled in descriptions (e.g., `it's` → `it''s`), em-dashes preserved
- **Transaction:** Full BEGIN/COMMIT wrap for atomicity
- **Documentation:** All topology fix rooms from migrations 005 and 007 included and updated with thematic descriptions

### Creature & Item Retheme (2026-04-06)
- **Migration:** `020_retheme_creatures_items.sql`
- **Source:** Laeral's creature & item retheme design document (merged to decisions.md)
- **Creature rethemes (8):** city_dog→Silt Roach, pigeon_flock→Mosquito Swarm, feral_dog→Feral Hog, alley_thug→Render-Kin Stalker, dockside_smuggler→Bone-Tithe Hoarder, plague_bearer→Fester-Thrall, the_harbourmaster→The Graftlord
- **Item rethemes (12):** alley_thugs_coin→Scavenged Circuit Board, noble_signet_ring→Pre-Extinction Signet Ring, city_map→Salvaged City Map, silk_scarf→Bloom-Stained Cloth, healing_draught→Algae Salve, iron_sword→Rebar Machete, iron_chainmail→Scrap-Weave Vest, voidforged_blade→Drone-Core Blade, shardsteel_sabre→Honed Drone Blade, shardsteel_shard→Drone Alloy Shard, corroded_halberd→Corroded Fire Axe, rat_tail (description only)
- **Scope:** Cosmetic/narrative only — names, descriptions, room_descriptions. No ID changes, no stat changes, no loot table changes, no schema changes.
- **TS templates check:** Confirmed no Siltgate creatures have hardcoded TS template files (all 5 templates are Warrens creatures: drowned-revenant, gutterspawn, hollow-stalker, rubble-scavenger, the-collapsed-one). No code changes needed.
- **SQL pattern:** UPDATE by `type` for creatures, UPDATE by `id` for items. All apostrophes pre-escaped in Laeral's design doc.
- **Transaction:** Full BEGIN/COMMIT wrap for atomicity
- **Build verification:** TypeScript compilation clean, all 2555 tests pass (128 test files)

---


