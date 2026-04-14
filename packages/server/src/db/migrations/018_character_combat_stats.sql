-- 018_character_combat_stats.sql — Phase 1 combat stats for player characters.
-- Adds weapon-type skill ranks and defensive stats to the characters table.
-- No agility column — dodge alone handles combat avoidance (user directive 2026-04-13).

ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS max_hp        INTEGER NOT NULL DEFAULT 100,   -- Maximum hit points
  ADD COLUMN IF NOT EXISTS unarmed       INTEGER NOT NULL DEFAULT 5,     -- Unarmed combat skill rank
  ADD COLUMN IF NOT EXISTS one_handed    INTEGER NOT NULL DEFAULT 5,     -- One-handed weapon skill rank
  ADD COLUMN IF NOT EXISTS two_handed    INTEGER NOT NULL DEFAULT 5,     -- Two-handed weapon skill rank
  ADD COLUMN IF NOT EXISTS ranged        INTEGER NOT NULL DEFAULT 5,     -- Ranged weapon skill rank
  ADD COLUMN IF NOT EXISTS shield_block  INTEGER NOT NULL DEFAULT 5,     -- Shield block chance rank (binary: block or not)
  ADD COLUMN IF NOT EXISTS dodge         INTEGER NOT NULL DEFAULT 5,     -- Dodge chance rank
  ADD COLUMN IF NOT EXISTS armour        INTEGER NOT NULL DEFAULT 2;     -- Flat damage reduction
