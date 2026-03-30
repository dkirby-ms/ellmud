-- Create dedicated narrative_template_definitions table.
-- Replaces the JSONB blob in content_definitions for narrative templates.

CREATE TABLE IF NOT EXISTS narrative_template_definitions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  narrative_type  TEXT NOT NULL DEFAULT 'lore',
  biome           TEXT,
  template        TEXT NOT NULL DEFAULT '',
  tone            TEXT,
  verbosity       TEXT,
  tags            TEXT[] NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No existing narrative rows to migrate — table starts empty.
-- Clean up any stale narrative entries from the generic store.
DELETE FROM content_definitions WHERE entity_type = 'narrative';
