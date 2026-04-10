-- 012_starter_kit_granted.sql — Track whether a character has received their starter kit.
-- Used to grant starter items to inventory on first zone join rather than to stash on creation.
-- Default is false for all existing and new characters.

ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS starter_kit_granted BOOLEAN NOT NULL DEFAULT false;
