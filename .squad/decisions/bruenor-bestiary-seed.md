# Decision: Database-First Creature Implementation via SQL Migration

**Date:** 2026-04-10  
**Author:** Bruenor (Content Builder)  
**Context:** Issue #391 — Bestiary creature implementation  
**Status:** Implemented  
**PR:** #399

## Decision

The creature system uses a **database-driven ContentRegistry** pattern. All creature data is stored in the `creature_definitions` PostgreSQL table and loaded at runtime by `ContentRegistry` (see `packages/server/src/content/ContentRegistry.ts`).

**The correct way to add creatures is via SQL migration files**, not TypeScript template files.

## Implementation

Created migration `011_bestiary_creatures.sql` containing:
- **343 new item definitions** — All loot items referenced by creature drops
- **81 new creature definitions** — Complete bestiary from Laeral's design doc

### Migration Pattern

```sql
-- Items first (loot drops)
INSERT INTO item_definitions (id, name, type, tier, base_stats, base_durability, weight, description, soulbound, stackable, max_stack, status) VALUES
  ('scrap_metal_chunk', 'Scrap Metal Chunk', 'material', 'scrap', '{}', NULL, 2, 'Material dropped by dungeon creatures.', false, true, 20, 'published'),
  ...
ON CONFLICT (id) DO NOTHING;

-- Creatures second
INSERT INTO creature_definitions (type, name, slug, description, max_hp, attack, defence, armour, agility, min_count, max_count, preferred_rooms, forbidden_rooms, idle_ticks_min, idle_ticks_max, flee_threshold, loot_table, aggressive, room_description, status)
VALUES
  ('concrete_shambler', 'Concrete Shambler', 'concrete_shambler', '...',
   90, 22, 9, 12, 1, 1, 2, '{chamber}', '{entry}', 100, 400, 0.25,
   '[{"itemId":"concrete_fragment","dropWeight":60},{"itemId":"rebar_club","dropWeight":30}]'::jsonb,
   true, 'A concrete shambler drags itself forward, leaving cracks in its wake.', 'published'),
  ...
ON CONFLICT (type) DO NOTHING;
```

### Key Details

- **loot_table** is JSONB: `'[{"itemId":"item_id","dropWeight":80}]'::jsonb`
- **preferred_rooms** and **forbidden_rooms** are TEXT arrays: `'{corridor,dead_end}'`
- **slug** = **type** (snake_case) for all creatures
- **ON CONFLICT DO NOTHING** allows safe re-runs and avoids duplicating existing creatures from 002_seed_content.sql

## Rationale

1. **Single source of truth** — Database is authoritative, not TypeScript files
2. **Live configuration** — Changes apply immediately without code deployment
3. **Content team access** — SQL migrations are accessible to content designers
4. **Version control** — Migration files track creature evolution over time
5. **Atomicity** — Migrations are transactional and safe

## Legacy Pattern

The TypeScript template files in `packages/server/src/creatures/templates/` are **LEGACY FALLBACKS only**. They exist for backward compatibility but should not be used for new creatures.

PR #398 created TypeScript templates before this pattern was clarified. Those files are deprecated but harmless (ContentRegistry prioritizes database records).

## Future Work

All new creatures should be added via SQL migrations following the pattern established in `011_bestiary_creatures.sql`.

## References

- Migration: `packages/server/src/db/migrations/011_bestiary_creatures.sql`
- Design doc: `docs/bestiary-design.md`
- ContentRegistry: `packages/server/src/content/ContentRegistry.ts`
- Schema: `packages/server/src/db/migrations/001_schema.sql` (creature_definitions table)
