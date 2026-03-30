-- 027_create_loot_table_definitions.sql
-- Dedicated loot_table_definitions table for admin-editable loot table content.
-- No data to migrate — loot-tables are currently empty in content_definitions.

CREATE TABLE IF NOT EXISTS loot_table_definitions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  entries         JSONB NOT NULL DEFAULT '[]',
  min_drops       INT NOT NULL DEFAULT 1,
  max_drops       INT NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Clean up any stale rows from the generic table (should be empty, but safety-net)
DELETE FROM content_definitions WHERE entity_type = 'loot-tables';
