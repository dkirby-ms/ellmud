-- Migration 016: Rename loot_containers → starting_items
-- Items placed at zone init persist permanently; only creatures respawn.

ALTER TABLE zone_rooms RENAME COLUMN loot_containers TO starting_items;
ALTER TABLE room_definitions RENAME COLUMN loot_containers TO starting_items;
