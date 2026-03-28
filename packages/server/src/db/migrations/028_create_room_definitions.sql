-- Migration 028: Create dedicated room_definitions table
-- Replaces the generic content_definitions JSONB blob for rooms
-- with properly typed relational columns.

CREATE TABLE IF NOT EXISTS room_definitions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  type        TEXT NOT NULL DEFAULT '',
  properties  JSONB NOT NULL DEFAULT '[]',
  hazards     JSONB NOT NULL DEFAULT '[]',
  loot_containers JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
