-- 032: character_explored_rooms — tracks per-character room exploration.
-- No coordinate columns: client computes positions via BFS from room graph.

-- Table and indexes now consolidated into 001_schema.sql.
-- Unique index kept here (not in consolidation):

CREATE UNIQUE INDEX IF NOT EXISTS uq_character_zone_room
  ON character_explored_rooms (character_id, COALESCE(zone_slug, '__shard__'), room_id);
