-- 016_create_shard_sickness.sql
-- Shard-sickness death tracking — persists across server restarts.
-- User directive: deaths always count.

CREATE TABLE IF NOT EXISTS player_shard_sickness (
  player_id      UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  death_count    INT NOT NULL DEFAULT 0,
  last_death_at  BIGINT  -- epoch milliseconds (matches JS Date.now())
);
