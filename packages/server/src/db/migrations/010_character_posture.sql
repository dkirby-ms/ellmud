-- 010_character_posture.sql — Per-character posture persistence (#371).
-- Stores the character's current physical posture (standing, sitting, etc.).
-- Default is 'standing' for all existing and new characters.

ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS posture TEXT NOT NULL DEFAULT 'standing';
