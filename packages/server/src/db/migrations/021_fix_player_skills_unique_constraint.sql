-- 021_fix_player_skills_unique_constraint.sql — Fix unique constraint for multi-character support (#464).
-- The old constraint (player_id, skill_name) would allow data corruption when
-- a player has multiple characters. The correct key is (character_id, skill_name).

ALTER TABLE player_skills DROP CONSTRAINT IF EXISTS uq_player_skill;
ALTER TABLE player_skills ADD CONSTRAINT uq_character_skill UNIQUE (character_id, skill_name);
