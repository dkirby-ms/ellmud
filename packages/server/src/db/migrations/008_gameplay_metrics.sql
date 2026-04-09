-- 008_gameplay_metrics.sql — Gameplay event tracking (#360).
-- Stores deaths, kills, loot pickups, and combat stats as append-only events.

CREATE TABLE game_metrics (
  id          BIGSERIAL PRIMARY KEY,
  player_id   UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Common query patterns: by player, by event type, by time range
CREATE INDEX idx_game_metrics_player    ON game_metrics (player_id);
CREATE INDEX idx_game_metrics_type      ON game_metrics (event_type);
CREATE INDEX idx_game_metrics_created   ON game_metrics (created_at);
CREATE INDEX idx_game_metrics_player_type ON game_metrics (player_id, event_type);
