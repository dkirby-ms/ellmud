-- 012_room_illumination.sql — Add illumination column to zone_rooms (Issue #402).
-- Phase 1: room-level illumination property. Player vision flags deferred to Phase 2.

ALTER TABLE zone_rooms
  ADD COLUMN illumination TEXT NOT NULL DEFAULT 'lit';
