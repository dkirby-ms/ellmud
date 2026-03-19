-- 005_create_run_history.sql
-- Run history for leaderboards, player stats, and analytics.

CREATE TABLE run_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id       UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  run_id          UUID NOT NULL,          -- shard instance ID (may not exist in DB yet)
  shard_tier      INT NOT NULL CHECK (shard_tier BETWEEN 1 AND 3),
  biome           TEXT,                    -- flooded_crypt, shattered_bastion, etc.
  duration_sec    INT NOT NULL DEFAULT 0 CHECK (duration_sec >= 0),
  extracted       BOOLEAN NOT NULL DEFAULT false,
  extracted_items JSONB NOT NULL DEFAULT '[]',
  xp_gained       INT NOT NULL DEFAULT 0 CHECK (xp_gained >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_runs_player    ON run_history (player_id);
CREATE INDEX idx_runs_xp        ON run_history (xp_gained DESC);
CREATE INDEX idx_runs_created   ON run_history (created_at DESC);
CREATE INDEX idx_runs_leaderboard ON run_history (shard_tier, xp_gained DESC);
