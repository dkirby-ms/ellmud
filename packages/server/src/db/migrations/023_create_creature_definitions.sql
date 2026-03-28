-- Create dedicated creature_definitions table.
-- Replaces the JSONB blob in content_definitions for creatures.

CREATE TABLE IF NOT EXISTS creature_definitions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  description     TEXT DEFAULT '',
  behavior        TEXT,
  max_hp          INT NOT NULL DEFAULT 100,
  attack          INT NOT NULL DEFAULT 10,
  defence         INT NOT NULL DEFAULT 5,
  armour          INT NOT NULL DEFAULT 0,
  agility         INT NOT NULL DEFAULT 0,
  min_count       INT NOT NULL DEFAULT 1,
  max_count       INT NOT NULL DEFAULT 3,
  preferred_rooms TEXT[] NOT NULL DEFAULT '{}',
  forbidden_rooms TEXT[] NOT NULL DEFAULT '{}',
  idle_ticks_min  INT NOT NULL DEFAULT 3,
  idle_ticks_max  INT NOT NULL DEFAULT 5,
  flee_threshold  REAL NOT NULL DEFAULT 0.25,
  biome_affinity  TEXT[],
  tier_min        INT,
  tier_max        INT,
  status          TEXT DEFAULT 'published',
  loot_table      JSONB NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migrate the existing creature (drowned_revenant) from content_definitions.
INSERT INTO creature_definitions (type, name, max_hp, attack, defence, armour, agility, min_count, max_count, preferred_rooms, forbidden_rooms, idle_ticks_min, idle_ticks_max, flee_threshold, loot_table)
SELECT
  data->>'type',
  data->>'name',
  (data->'stats'->>'maxHp')::INT,
  (data->'stats'->>'attack')::INT,
  (data->'stats'->>'defence')::INT,
  COALESCE((data->'stats'->>'armour')::INT, 0),
  COALESCE((data->'stats'->>'agility')::INT, 0),
  COALESCE((data->'spawnRules'->>'minCount')::INT, 1),
  COALESCE((data->'spawnRules'->>'maxCount')::INT, 3),
  COALESCE(ARRAY(SELECT jsonb_array_elements_text(data->'spawnRules'->'preferredRoomTypes')), '{}'),
  COALESCE(ARRAY(SELECT jsonb_array_elements_text(data->'spawnRules'->'forbiddenRoomTypes')), '{}'),
  COALESCE((data->>'idleTicksMin')::INT, 3),
  COALESCE((data->>'idleTicksMax')::INT, 5),
  COALESCE((data->>'fleeThreshold')::REAL, 0.25),
  COALESCE(data->'lootTable', '[]')
FROM content_definitions
WHERE entity_type = 'creatures'
ON CONFLICT (type) DO NOTHING;

-- Remove migrated creature rows from generic store.
DELETE FROM content_definitions WHERE entity_type = 'creatures';
