-- 020_create_biome_definitions.sql
-- Dedicated biome_definitions table, migrating data out of the JSONB blob
-- in content_definitions.

-- Table now consolidated into 001_schema.sql.

-- Migrate existing biome rows from content_definitions
INSERT INTO biome_definitions (slug, name, description, tier, features, hazard_types, room_properties, narration_hints)
SELECT
  data->>'id',
  data->>'name',
  data->>'description',
  (data->>'tier')::INT,
  ARRAY(SELECT jsonb_array_elements_text(data->'features')),
  ARRAY(SELECT jsonb_array_elements_text(data->'hazardTypes')),
  ARRAY(SELECT jsonb_array_elements_text(data->'roomProperties')),
  ARRAY(SELECT jsonb_array_elements_text(data->'narrationHints'))
FROM content_definitions
WHERE entity_type = 'biomes'
ON CONFLICT (slug) DO NOTHING;

-- Remove migrated rows from the generic table
DELETE FROM content_definitions WHERE entity_type = 'biomes';
