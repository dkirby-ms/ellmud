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

## Team Updates

### 2026-04-06: Migration 022 — Faction Stronghold-to-Zone Connections
- **Scope:** 6 new rooms (2 per stronghold zone), 24 new exits (12 bidirectional pairs)
- **Content:** Connected faction strongholds (the-reliquary, the-bloom-observatory, the-carrion-court) to world zones (the-siltgate, warrens)
- **Exits:** 18 intra-zone, 6 inter-zone portal-pattern exits
- **Commit:** c683882
- **Zone totals:** Each stronghold +1 room; Siltgate +2 rooms, Warrens +1 room
- **Coordination:** Per Laeral's route design doc; all direction conflicts verified

---

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

### Stronghold Connections to World Zones (2026-04-07)
- **Migration:** `022_stronghold_connections.sql`
- **Source:** Laeral's stronghold connections design document (`.squad/decisions/inbox/laeral-stronghold-connections.md`)
- **Purpose:** Connect the three faction strongholds to main world zones (Siltgate and Warrens) via transitional rooms
- **Connections implemented:**
  1. **The Carrion Court** (Krewe Calliope) → **Siltgate** (Dockward) — superdome-breach → flooded-concourse → dock-street-1
  2. **The Reliquary** (Kindari) → **Siltgate** (Ashgate) — filtration-annex → pipe-bridge → ashgate-chapel
  3. **The Bloom Observatory** (Bloom Tenders) → **Warrens** — platform-descent → causeway-terminus → shattered-gate
- **New rooms (6 total):**
  - `superdome-breach` (the-carrion-court, corridor) — Krewe breach in Superdome wall
  - `flooded-concourse` (the-siltgate, corridor, {water}) — Flooded approach to Superdome
  - `filtration-annex` (the-reliquary, corridor, {heavy_door}) — Kindari maintenance corridor
  - `pipe-bridge` (the-siltgate, entrance) — Suspended walkway over blast crater
  - `platform-descent` (the-bloom-observatory, corridor) — External staircase down platform leg
  - `causeway-terminus` (warrens, entrance) — Causeway meets eastern wastes
- **Exit pattern:** 24 exits total (12 bidirectional pairs, 3 inter-zone connections). Each connection has 6 exits.
- **Inter-zone exits:** Follow established pattern from 004_seed_siltgate.sql — `to_room_slug = from_room_slug` (portal pattern), with `target_zone_slug` and `target_room_slug` filled, NULLIF for empty strings
- **Direction conflict resolution:**
  - `dock-street-1`: Used WEST (north/south/east occupied)
  - `ashgate-chapel`: Used WEST (north occupied, as designed)
  - `shattered-gate`: Used NORTH (west/east/south occupied)
- **Critical pattern:** Transitional rooms placed in correct zones based on ownership — breach rooms in stronghold zones, approach rooms in world zones
- **Transaction:** Full BEGIN/COMMIT wrap for atomicity
- **Zone totals after migration:**
  - the-carrion-court: 11 rooms (was 10), 15 exits (was 12)
  - the-reliquary: 11 rooms (was 10), 15 exits (was 12)
  - the-bloom-observatory: 11 rooms (was 10), 15 exits (was 12)
  - the-siltgate: 140 rooms (was 138), 292 exits (was 284)
  - warrens: 110 rooms (was 109), 222 exits (was 218)

---



### Stronghold Connections to World Zones (2026-04-06)
- **Migration:** `022_stronghold_connections.sql`
- **Source:** Laeral's stronghold connections design document
- **Purpose:** Connect the three faction strongholds to main world zones (Siltgate and Warrens) via transitional rooms
- **Connections implemented:**
  1. **The Carrion Court** (Krewe Calliope) → **Siltgate** (Dockward) — superdome-breach → flooded-concourse → dock-street-1
  2. **The Reliquary** (Kindari) → **Siltgate** (Ashgate) — filtration-annex → pipe-bridge → ashgate-chapel
  3. **The Bloom Observatory** (Bloom Tenders) → **Warrens** — platform-descent → causeway-terminus → shattered-gate
- **New rooms (6 total):**
  - `superdome-breach` (the-carrion-court, corridor) — Krewe breach in Superdome wall
  - `flooded-concourse` (the-siltgate, corridor, {water}) — Flooded approach to Superdome
  - `filtration-annex` (the-reliquary, corridor, {heavy_door}) — Kindari maintenance corridor
  - `pipe-bridge` (the-siltgate, entrance) — Suspended walkway over blast crater
  - `platform-descent` (the-bloom-observatory, corridor) — External staircase down platform leg
  - `causeway-terminus` (warrens, entrance) — Causeway meets eastern wastes
- **Exit pattern:** 24 exits total (12 bidirectional pairs, 3 inter-zone connections). Each connection has 6 exits: 2 intra-zone pairs in stronghold, 1 inter-zone pair, 2 intra-zone pairs in world zone.
- **Inter-zone exits:** Follow established pattern from 004_seed_siltgate.sql — `to_room_slug = from_room_slug` (portal pattern), with `target_zone_slug` and `target_room_slug` filled, NULLIF for empty strings.
- **Direction conflict resolution:**
  - `dock-street-1`: Used WEST (north/south/east occupied)
  - `ashgate-chapel`: Used WEST (north occupied, as designed)
  - `shattered-gate`: Used NORTH (west/east/south occupied)
- **Zone totals after migration:**
  - the-carrion-court: 11 rooms (was 10), 15 exits (was 12)
  - the-reliquary: 11 rooms (was 10), 15 exits (was 12)
  - the-bloom-observatory: 11 rooms (was 10), 15 exits (was 12)
  - the-siltgate: 140 rooms (was 138), 292 exits (was 284)
  - warrens: 110 rooms (was 109), 222 exits (was 218)

**Status:** Migration created and tested. Coordinator fixed 2 direction conflicts during implementation.

**Orchestration Log:** `.squad/orchestration-log/2026-04-06T19:20:15Z-bruenor.md`

### Stronghold Redesign Implementation (2026-04-08)
- **Scope:** Rebuilt all three faction strongholds in `003_seed_zones.sql` from Elminster''s redesign (Reliquary 22 rooms, Bloom Observatory 23 rooms, Carrion Court 24 rooms).
- **Topology:** New corridor-heavy layouts with updated inter-zone exits; portal targets updated for pipe-bridge, flooded-concourse, and causeway-terminus.
- **Creatures:** Added 15 non-aggressive stronghold NPCs to `002_seed_content.sql` with ambient stats and preferred room lists.
- **Slug decision:** Adopted short room prefixes (`reliquary-*`, `bloom-*`, `carrion-*`) and updated entry room slugs accordingly.

### Sandbox Rooms in The Refuge (2026-04-09)
- **Migration:** `005_sandbox_rooms.sql`
- **Source:** Architecture decision from coordinator — 3 sandbox rooms north of training-grounds
- **New rooms (3):**
  - `sandbox-lobby` (feature_sandbox, {safe_container}) — "The Proving Grounds" — warded antechamber, hub for sandbox area
  - `sandbox-arena` (feature_sandbox_arena, {safe_container, arena}) — "The Arena" — combat testing chamber
  - `sandbox-stats-lab` (feature_sandbox_stats, {safe_container}) — "The Tuning Forge" — stat/encounter planning room
- **New exits (6):** 3 bidirectional pairs — training-grounds↔sandbox-lobby (north/south), sandbox-lobby↔sandbox-arena (east/west), sandbox-lobby↔sandbox-stats-lab (west/east)
- **Direction conflict check:** training-grounds had south (hearth) and east (war-room) — north was free
- **Pattern:** Matched 003_seed_zones.sql exactly — cross-join VALUES, text[] cast for properties, NULLIF for target columns, ON CONFLICT DO NOTHING for idempotency
- **Transaction:** Full BEGIN/COMMIT wrap for atomicity

### Classic CircleMUD Zone Imports (2025-07-25)
- **Migrations:** `006_import_chessboard.sql`, `007_import_high_tower.sql`, `008_import_haon_dor.sql`
- **Source:** tbaMUD GitHub stock areas (lib/world/wld/), imported via `scripts/import-diku-zone.ts`
- **The Chessboard (36.wld):** 67 rooms, 230 intra-zone exits, 1 cross-zone skip (east to vnum 3066). Grid pattern with black/white squares, treasuries with locked up/down exits.
- **The High Tower of Magic (25.wld):** 100 rooms, 221 intra-zone exits, 4 cross-zone skips. Vertical tower with up/down exits across multiple levels. One exit targets vnum -1 (broken data in source).
- **The Haon-Dor Forest (60.wld):** 60 rooms, 147 intra-zone exits, 3 cross-zone skips (to zones 61 and 30). Branching wilderness with forest trails.
- **Numbering note:** Used 006/007/008 because 005_sandbox_rooms.sql already existed (task originally specified 005/006/007).
- **Importer observations:** Works cleanly on all three zone types — grid, vertical tower, and branching wilderness. Cross-zone exit warnings are expected and correct. The importer handles locked/hidden exits from CircleMUD flags properly.
- **SQL validation:** All 3 files have proper BEGIN/COMMIT wrapping, INSERT INTO zone_rooms + zone_exits with cross-join VALUES pattern, ON CONFLICT DO NOTHING for idempotency.

### Bestiary Template Implementation (2026-04-10)
- **Scope:** Implemented Laeral's bestiary design (#391) as TypeScript creature templates
- **Created:** 81 new creature template files in `packages/server/src/creatures/templates/`
- **Source:** Design from `squad/391-dystopian-bestiary` branch (86 total creatures, 5 already existed)
- **Zone coverage:**
  - Collapsed Megastructure (Ruins): 7 new creatures (concrete-shambler, razorwing-swarm, scrap-brute, memory-echo, ruin-colossus, fracture-phantom, ash-warden, the-sovereign-of-dust)
  - Flooded Depths: 12 new creatures (sludge-crawler through the-abyssal-maw)
  - Toxic Wastes: 12 new creatures (bile-rat through the-spillmother)
  - Overgrown Sanctuary: 12 new creatures (thorn-creeper through the-green-mother)
  - Derelict Factory: 12 new creatures (scrap-gremlin through the-assembly-line)
  - Irradiated Wasteland: 12 new creatures (rad-roach through the-fallout-king)
  - Deep Shadow: 14 new creatures (shadow-rat through the-endless-dark)
- **Template structure:** Each includes JSDoc header, stats, loot table, spawn rules, abilities, room description, behavioral flags
- **Pattern compliance:**
  - Kebab-case filenames matching type slugs
  - All exported from `creatures/index.ts`
  - Matches existing 5 template format exactly (gutterspawn, rubble-scavenger, drowned-revenant, hollow-stalker, the-collapsed-one)
  - TypeScript compilation verified (tsc --noEmit)
  - ESLint passed with 0 warnings
- **String escaping lesson:** Item names and descriptions with apostrophes (e.g., "Warden's Brand") needed explicit escaping in generator script. Fixed by escaping single quotes in both name and description fields during loot table formatting.
- **Data parsing:** Built Python parser for bestiary markdown format. Initial loot/abilities regex failed on multi-line content — fixed by first extracting section text, then matching within that scope.
- **Branch:** `squad/391-bestiary-templates`
- **PR:** #398 to dev
- **Files:** 82 changed (81 new templates + index.ts update), 5391 insertions

**Learnings:**
- When parsing structured markdown with sections, extract the section first, then parse within it — single-pass regex across full text fails on multi-line captures
- Always escape apostrophes in generated TypeScript string literals (both item names and descriptions)
- Creature template pattern: stats → lootTable → spawnRules → idle timers → behavioral flags → optional roomDescription/abilities
- TypeScript template files follow strict pattern: JSDoc → import → export const → template object with fixed property order

### Bestiary SQL Migration (2026-04-10)
- **Migration:** `011_bestiary_creatures.sql` — Complete database implementation of Laeral's bestiary design
- **Scope:** 81 new creature definitions + 343 new loot item definitions
- **Source:** `docs/bestiary-design.md` (86 total creatures, 5 already existed in 002_seed_content.sql)
- **Database-first approach:** The creature system uses a **database-driven ContentRegistry** pattern. All creature data lives in the `creature_definitions` PostgreSQL table and is loaded at runtime by `ContentRegistry`. The TypeScript `.ts` template files in `packages/server/src/creatures/templates/` are **LEGACY FALLBACKS only**.
- **Item handling:** Generated 343 new item definitions for all loot drops referenced by creatures. Used `ON CONFLICT (id) DO NOTHING` to skip items that already exist from migration 002.
- **Creature handling:** Used `ON CONFLICT (type) DO NOTHING` to skip the 5 existing creatures (gutterspawn, rubble_scavenger, drowned_revenant, hollow_stalker, the_collapsed_one).
- **SQL generation:** Built Node.js parser to extract creature data from markdown → JSON, then generate SQL inserts matching the exact pattern from 002_seed_content.sql.
- **Validation:** Verified all 253 unique loot item IDs in creature loot_table JSONB arrays have corresponding item definitions (either existing or new).
- **Pattern compliance:**
  - Followed exact column order from 002_seed_content.sql
  - `loot_table` is JSONB: `'[{"itemId":"some_item","dropWeight":80}]'::jsonb`
  - `preferred_rooms` and `forbidden_rooms` are TEXT arrays: `'{corridor,dead_end}'`
  - `slug` = `type` (snake_case) for all creatures
  - `idle_ticks_min/max` calculated with 10x multiplier pattern from 002
- **Branch:** `squad/391-bestiary-seed`
- **PR:** #399 to dev
- **Files:** 1 new migration file, 685 lines

**Learnings:**
- **Database-driven content is the correct approach** — TypeScript templates were legacy fallback pattern
- SQL migration files are the source of truth for creatures, not TypeScript template files
- When generating large SQL migrations from design docs, parse to JSON first for validation, then generate SQL
- Always verify loot item IDs exist before referencing them in JSONB loot tables
- Use `ON CONFLICT DO NOTHING` for idempotent migrations that might overlap with existing seed data
- Node.js string literal escaping: `str.replace(/'/g, "''"` for SQL single-quote escaping

### Container Items Implementation (2025-07-24)
- **PR:** #430 (squad/container-items → dev)
- **File:** `packages/server/src/items/registry.ts` — added 6 new container ItemDefinitions
- **Items:** Munitions Wrap (sturdy), Ironbound Coffer (refined), Salvager's Haversack (refined), Warden's Lockbox (masterwork), Fleshknit Satchel (masterwork), Hollow of the Forgotten (anomalous)
- **Pattern:** Container items use `type: 'container'`, `baseStats: {}`, `baseDurability: null`, plus `containerProperties` with maxSlots, optional maxWeight, optional carryBonus, optional allowedItemTypes
- **ANSI tags:** Name/description fields use bracket syntax `[bold]`, `[dim]`, `[cyan]`, `[magenta]`, `[yellow]`, `[reset]` — higher-tier items get colored names
- **Omitting maxWeight:** When `maxWeight` is not set in containerProperties, no weight limit is enforced (used for anomalous-tier Hollow)
- **Registry pattern:** Export as UPPER_SNAKE_CASE constant, add to ALL_ITEMS array — both static map and dynamic ContentRegistry use this
- **Tests:** Server test suite has 137 files / 2915 tests; takes ~8 minutes to run
