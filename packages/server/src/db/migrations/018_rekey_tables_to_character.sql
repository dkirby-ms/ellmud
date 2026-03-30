-- 018_rekey_tables_to_character.sql
-- Add character_id column to all per-player tables alongside existing player_id.
-- Does NOT drop player_id — safer for incremental migration.

-- player_skills
ALTER TABLE player_skills ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES characters(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_skills_character ON player_skills (character_id);

-- player_stash
ALTER TABLE player_stash ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES characters(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_stash_character ON player_stash (character_id);

-- player_loadout
ALTER TABLE player_loadout ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES characters(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_loadout_character ON player_loadout (character_id);

-- player_profile
ALTER TABLE player_profile ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES characters(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_profile_character ON player_profile (character_id);

-- player_stash_capacity
ALTER TABLE player_stash_capacity ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES characters(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_stash_cap_character ON player_stash_capacity (character_id);

-- player_shard_sickness
ALTER TABLE player_shard_sickness ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES characters(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_shard_sickness_character ON player_shard_sickness (character_id);

-- faction_membership
ALTER TABLE faction_membership ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES characters(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_membership_character ON faction_membership (character_id);

-- run_history
ALTER TABLE run_history ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES characters(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_runs_character ON run_history (character_id);
