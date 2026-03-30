-- 017_create_characters.sql
-- Character entity — the progression container (1:N from players/accounts).
-- Multi-character per account. Soft-delete via deleted_at.

-- Table now consolidated into 001_schema.sql.
-- Unique indexes kept here (not covered by consolidation):

-- Unique character name per player (only among non-deleted characters).
CREATE UNIQUE INDEX IF NOT EXISTS idx_uq_character_name_per_player
  ON characters (player_id, lower(name)) WHERE deleted_at IS NULL;

-- Only one active character per account (non-deleted).
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_character
  ON characters (player_id) WHERE is_active = true AND deleted_at IS NULL;
