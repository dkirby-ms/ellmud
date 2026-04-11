-- 006_room_features.sql — Add features column to zone_rooms (Issue #345).
-- Room features are examinable objects players can inspect via "look <target>".

ALTER TABLE zone_rooms
  ADD COLUMN IF NOT EXISTS features JSONB NOT NULL DEFAULT '[]';
