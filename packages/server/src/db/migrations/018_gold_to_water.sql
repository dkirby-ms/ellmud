-- 018_gold_to_water.sql — Rename gold currency column to water (potable water economy).
--
-- Updates:
--   - Renames characters.gold → characters.water
--   - Aligns with post-apocalyptic Gulf Coast theme where clean drinking water ("draws") is currency
--   - See docs/thematic-direction.md §8 for economy design

BEGIN;

ALTER TABLE characters RENAME COLUMN gold TO water;

COMMIT;
