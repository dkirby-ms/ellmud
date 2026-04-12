-- Migration 016: Rename loot_containers → starting_items, drop room_definitions
-- Items placed at zone init persist permanently; only creatures respawn.
-- room_definitions was an admin-only content table unused by the game runtime.

ALTER TABLE zone_rooms RENAME COLUMN loot_containers TO starting_items;
DROP TABLE IF EXISTS room_definitions;
