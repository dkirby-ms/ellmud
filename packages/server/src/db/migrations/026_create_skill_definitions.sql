-- 026_create_skill_definitions.sql
-- Dedicated skill_definitions table for admin-editable skill content.
-- No data to migrate — skills are currently empty in content_definitions.

CREATE TABLE IF NOT EXISTS skill_definitions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  category        TEXT NOT NULL DEFAULT '',
  cooldown_ticks  INT NOT NULL DEFAULT 0,
  stamina_cost    INT NOT NULL DEFAULT 0,
  effects         JSONB NOT NULL DEFAULT '{}',
  requirements    JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Clean up any stale rows from the generic table (should be empty, but safety-net)
DELETE FROM content_definitions WHERE entity_type = 'skills';
