-- 009_character_flags.sql — Per-character optional flags (#365).
-- Stores user-toggled display flags (anon, rp) as JSONB.

CREATE TABLE IF NOT EXISTS character_flags (
  character_id  UUID PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
  flags         JSONB NOT NULL DEFAULT '{}',
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_character_flags_character ON character_flags (character_id);
