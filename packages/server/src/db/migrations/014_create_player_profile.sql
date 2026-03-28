-- 014_create_player_profile.sql
-- Extended player profile data — fields not covered by player_skills.

CREATE TABLE IF NOT EXISTS player_profile (
  player_id        UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  max_carry_weight INT NOT NULL DEFAULT 20,
  equipment        JSONB NOT NULL DEFAULT '{}',
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
