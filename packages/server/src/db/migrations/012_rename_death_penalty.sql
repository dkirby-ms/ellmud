-- Migration 012: Rename player_shard_sickness → player_death_penalty
-- Part of GDD §6.5 terminology alignment (shard-sickness → death penalty).

ALTER TABLE player_shard_sickness RENAME TO player_death_penalty;

DROP INDEX IF EXISTS idx_shard_sickness_character;
CREATE INDEX idx_death_penalty_character ON player_death_penalty(character_id);
