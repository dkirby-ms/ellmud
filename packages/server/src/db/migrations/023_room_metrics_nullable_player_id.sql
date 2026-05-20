-- 023_room_metrics_nullable_player_id.sql — Allow room-scoped operational metrics.
-- Room snapshots are not attributable to a specific player, so player_id must be nullable.

ALTER TABLE game_metrics
  ALTER COLUMN player_id DROP NOT NULL;
