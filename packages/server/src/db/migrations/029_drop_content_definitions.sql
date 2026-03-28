-- Migration 029: Drop the legacy content_definitions table.
--
-- All 9 entity types now have dedicated relational stores:
--   items       → item_definitions       (migration 002)
--   biomes      → biome_definitions      (migration 020)
--   modifiers   → modifier_definitions   (migration 021)
--   narrative   → narrative_definitions  (migration 022)
--   creatures   → creature_definitions   (migration 023)
--   factions    → faction_definitions    (migration 004+025)
--   skills      → skill_definitions      (migration 026)
--   loot-tables → loot_table_definitions (migration 027)
--   rooms       → room_definitions       (migration 028)
--
-- The generic JSONB blob table is no longer needed.

DROP TABLE IF EXISTS content_definitions;
