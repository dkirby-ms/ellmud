-- 020_create_biome_definitions.sql
-- Dedicated biome_definitions table, migrating data out of the JSONB blob
-- in content_definitions.

CREATE TABLE IF NOT EXISTS biome_definitions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  tier            INT NOT NULL DEFAULT 1,
  features        TEXT[] NOT NULL DEFAULT '{}',
  hazard_types    TEXT[] NOT NULL DEFAULT '{}',
  room_properties TEXT[] NOT NULL DEFAULT '{}',
  narration_hints TEXT[] NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
