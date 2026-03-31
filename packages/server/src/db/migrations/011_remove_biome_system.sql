-- 011_remove_biome_system.sql — Remove biome system (GDD alignment).
--
-- Drops the biome_definitions table, renames zones.biome → zones.theme,
-- and removes biome columns from other tables.

-- Drop the dedicated biome definitions table
DROP TABLE IF EXISTS biome_definitions;

-- Rename zones.biome to zones.theme (retained as thematic tag)
ALTER TABLE zones RENAME COLUMN biome TO theme;

-- Drop biome columns from other tables
ALTER TABLE narrative_template_definitions DROP COLUMN IF EXISTS biome;
ALTER TABLE creature_definitions DROP COLUMN IF EXISTS biome_affinity;
ALTER TABLE run_history DROP COLUMN IF EXISTS biome;
ALTER TABLE character_explored_rooms DROP COLUMN IF EXISTS biome;
