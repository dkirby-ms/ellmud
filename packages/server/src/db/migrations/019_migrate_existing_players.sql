-- 019_migrate_existing_players.sql
-- Auto-migrate existing players: create a character row for each player,
-- then backfill character_id on all related tables.

-- Create one character per existing player (skip if already migrated).
INSERT INTO characters (player_id, name, faction_slug, is_active)
SELECT
  p.id,
  p.username,
  COALESCE(
    (SELECT f.slug FROM faction_membership fm
     JOIN factions f ON f.id = fm.faction_id
     WHERE fm.player_id = p.id
     LIMIT 1),
    'ironwright'
  ),
  true
FROM players p
WHERE NOT EXISTS (
  SELECT 1 FROM characters c WHERE c.player_id = p.id
);

-- Backfill character_id on all per-player tables using the auto-created character.
UPDATE player_skills ps
SET character_id = c.id
FROM characters c
WHERE c.player_id = ps.player_id AND ps.character_id IS NULL;

UPDATE player_stash ps
SET character_id = c.id
FROM characters c
WHERE c.player_id = ps.player_id AND ps.character_id IS NULL;

UPDATE player_loadout pl
SET character_id = c.id
FROM characters c
WHERE c.player_id = pl.player_id AND pl.character_id IS NULL;

UPDATE player_profile pp
SET character_id = c.id
FROM characters c
WHERE c.player_id = pp.player_id AND pp.character_id IS NULL;

UPDATE player_stash_capacity psc
SET character_id = c.id
FROM characters c
WHERE c.player_id = psc.player_id AND psc.character_id IS NULL;

UPDATE player_shard_sickness pss
SET character_id = c.id
FROM characters c
WHERE c.player_id = pss.player_id AND pss.character_id IS NULL;

UPDATE faction_membership fm
SET character_id = c.id
FROM characters c
WHERE c.player_id = fm.player_id AND fm.character_id IS NULL;

UPDATE run_history rh
SET character_id = c.id
FROM characters c
WHERE c.player_id = rh.player_id AND rh.character_id IS NULL;
