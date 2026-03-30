-- 018_rekey_tables_to_character.sql
-- Add character_id column to all per-player tables alongside existing player_id.
-- Does NOT drop player_id — safer for incremental migration.

-- Indexes now consolidated into 001_schema.sql.
-- ALTER TABLE statements kept for migration history reference:

-- player_skills
ALTER TABLE player_skills ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES characters(id) ON DELETE CASCADE;

-- player_stash
ALTER TABLE player_stash ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES characters(id) ON DELETE CASCADE;

-- player_loadout
ALTER TABLE player_loadout ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES characters(id) ON DELETE CASCADE;

-- player_profile
ALTER TABLE player_profile ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES characters(id) ON DELETE CASCADE;

-- player_stash_capacity
ALTER TABLE player_stash_capacity ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES characters(id) ON DELETE CASCADE;

-- player_shard_sickness
ALTER TABLE player_shard_sickness ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES characters(id) ON DELETE CASCADE;

-- faction_membership
ALTER TABLE faction_membership ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES characters(id) ON DELETE CASCADE;

-- run_history
ALTER TABLE run_history ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES characters(id) ON DELETE CASCADE;
