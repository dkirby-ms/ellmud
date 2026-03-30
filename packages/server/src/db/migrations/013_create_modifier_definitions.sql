-- 021_create_modifier_definitions.sql
-- Dedicated modifier_definitions table, migrating data out of the JSONB blob
-- in content_definitions.

-- Table now consolidated into 001_schema.sql.

-- Migrate existing modifier rows from content_definitions
INSERT INTO modifier_definitions (slug, name, description, effects, stackable, tags)
SELECT
  data->>'id',
  data->>'name',
  data->>'description',
  COALESCE(data->'effects', '{}'),
  COALESCE((data->>'stackable')::BOOLEAN, false),
  ARRAY(SELECT jsonb_array_elements_text(data->'tags'))
FROM content_definitions
WHERE entity_type = 'modifiers'
ON CONFLICT (slug) DO NOTHING;

-- Remove migrated rows from the generic table
DELETE FROM content_definitions WHERE entity_type = 'modifiers';
