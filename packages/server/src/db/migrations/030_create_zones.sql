-- Migration 030: Create zone tables for hand-crafted MUD-style zones.
-- Zones are persistent authored room graphs that coexist with procedural shards.
-- Supports inter-zone exits, repop timers, and full combat/loot/hazard parity.

CREATE TABLE IF NOT EXISTS zones (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                   TEXT NOT NULL UNIQUE,
  name                   TEXT NOT NULL,
  description            TEXT NOT NULL DEFAULT '',
  level_min              INTEGER NOT NULL DEFAULT 1,
  level_max              INTEGER NOT NULL DEFAULT 100,
  tier                   INTEGER NOT NULL DEFAULT 1,
  biome                  TEXT NOT NULL DEFAULT 'flooded_crypt',
  entry_room_slugs       TEXT[] NOT NULL DEFAULT '{}',
  lifecycle              TEXT NOT NULL DEFAULT 'persistent',   -- persistent | scheduled | event
  category               TEXT NOT NULL DEFAULT 'dungeon',      -- hub | dungeon | wilderness | social
  max_players            INTEGER NOT NULL DEFAULT 0,           -- 0 = unlimited
  pvp_enabled            BOOLEAN NOT NULL DEFAULT false,
  repop_interval_seconds INTEGER NOT NULL DEFAULT 300,         -- 5 min default
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS zone_rooms (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id          UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  slug             TEXT NOT NULL,
  name             TEXT NOT NULL,
  description      TEXT NOT NULL,
  type             TEXT NOT NULL DEFAULT 'corridor',
  properties       TEXT[] NOT NULL DEFAULT '{}',
  loot_containers  JSONB NOT NULL DEFAULT '[]',
  hazards          JSONB NOT NULL DEFAULT '[]',
  npcs             JSONB NOT NULL DEFAULT '[]',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_zone_room_slug UNIQUE (zone_id, slug)
);

CREATE TABLE IF NOT EXISTS zone_exits (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id          UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  from_room_slug   TEXT NOT NULL,
  direction        TEXT NOT NULL,
  to_room_slug     TEXT NOT NULL,
  target_zone_slug TEXT,           -- NULL for intra-zone exits
  target_room_slug TEXT,           -- NULL for intra-zone exits
  locked           BOOLEAN NOT NULL DEFAULT false,
  hidden           BOOLEAN NOT NULL DEFAULT false,
  condition        JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_zone_exit_direction UNIQUE (zone_id, from_room_slug, direction)
);

CREATE INDEX idx_zone_rooms_zone_id ON zone_rooms(zone_id);
CREATE INDEX idx_zone_exits_zone_id ON zone_exits(zone_id);
CREATE INDEX idx_zone_exits_from    ON zone_exits(zone_id, from_room_slug);
