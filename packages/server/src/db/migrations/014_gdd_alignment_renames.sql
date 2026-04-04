-- Migration 013: GDD terminology alignment — Issue #240.
--
-- Renames columns that still use legacy "shard" / "extraction" terminology
-- to match the current GDD vocabulary, and updates the __shard__ sentinel
-- to __instance__.

-- ── run_history column renames ──────────────────────────────────────────────

ALTER TABLE run_history RENAME COLUMN shard_tier TO zone_tier;
ALTER TABLE run_history RENAME COLUMN extracted TO survived;
ALTER TABLE run_history RENAME COLUMN extracted_items TO items_carried_out;

-- ── character_explored_rooms column rename ──────────────────────────────────

ALTER TABLE character_explored_rooms RENAME COLUMN shard_tier TO zone_tier;

-- Replace __shard__ sentinel with __instance__ in unique index.
-- Must drop + recreate because the COALESCE expression changed.
DROP INDEX IF EXISTS uq_character_zone_room;
CREATE UNIQUE INDEX uq_explored_character_zone_room
  ON character_explored_rooms(character_id, COALESCE(zone_slug, '__instance__'), room_id);
