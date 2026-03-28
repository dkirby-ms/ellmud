-- 017_create_characters.sql
-- Character entity — the progression container (1:N from players/accounts).
-- Multi-character per account. Soft-delete via deleted_at.

CREATE TABLE IF NOT EXISTS characters (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id       UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  faction_slug    TEXT NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_played_at  TIMESTAMPTZ,
  deleted_at      TIMESTAMPTZ,

  CONSTRAINT chk_character_name_length CHECK (char_length(name) BETWEEN 2 AND 24)
);

-- Unique character name per player (only among non-deleted characters).
CREATE UNIQUE INDEX IF NOT EXISTS idx_uq_character_name_per_player
  ON characters (player_id, lower(name)) WHERE deleted_at IS NULL;

-- Only one active character per account (non-deleted).
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_character
  ON characters (player_id) WHERE is_active = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_characters_player ON characters (player_id);
