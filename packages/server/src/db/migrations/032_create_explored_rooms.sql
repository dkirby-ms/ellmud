-- 032: character_explored_rooms — tracks per-character room exploration.
-- No coordinate columns: client computes positions via BFS from room graph.

CREATE TABLE IF NOT EXISTS character_explored_rooms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id  TEXT        NOT NULL,
  zone_slug     TEXT,                          -- NULL = procedural shard
  room_id       TEXT        NOT NULL,
  room_type     TEXT        NOT NULL,
  room_name     TEXT        NOT NULL,
  shard_tier    SMALLINT,                      -- NULL for static zones
  biome         TEXT,                          -- NULL for static zones
  first_visited TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_visited  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  visit_count   INTEGER     NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_character_zone_room
  ON character_explored_rooms (character_id, COALESCE(zone_slug, '__shard__'), room_id);

CREATE INDEX IF NOT EXISTS idx_explored_rooms_character
  ON character_explored_rooms (character_id);

CREATE INDEX IF NOT EXISTS idx_explored_rooms_character_zone
  ON character_explored_rooms (character_id, zone_slug);
