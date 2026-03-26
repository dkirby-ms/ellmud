-- 021_create_modifier_definitions.sql
-- Dedicated modifier_definitions table, migrating data out of the JSONB blob
-- in content_definitions.

CREATE TABLE IF NOT EXISTS modifier_definitions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  effects     JSONB NOT NULL DEFAULT '{}',
  stackable   BOOLEAN NOT NULL DEFAULT false,
  tags        TEXT[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
