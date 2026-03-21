-- 006_create_stash_capacity.sql
-- Per-player stash weight capacity (GDD §7.3 — expandable via upgrades).
-- Defaults handled in application code; this table stores overrides.

CREATE TABLE IF NOT EXISTS player_stash_capacity (
  player_id   UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  max_weight  INT NOT NULL DEFAULT 200 CHECK (max_weight > 0)
);
