-- 020_stat_points_available.sql — Banked stat points for training system (#457).
-- Jarlaxle's XP system will increment this when skills level up.
-- Drizzt's train command decrements it when a player allocates points.

ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS stat_points_available INTEGER NOT NULL DEFAULT 0;
