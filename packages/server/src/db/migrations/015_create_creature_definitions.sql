-- Create dedicated creature_definitions table.
-- Replaces the JSONB blob in content_definitions for creatures.

-- Table now consolidated into 001_schema.sql.

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
