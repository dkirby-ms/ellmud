-- Verification script for consolidated migrations (001-022)
-- Checks the final database state after migrations to ensure correctness

-- Helper function to count pass/fail results (PostgreSQL)
-- SELECT COUNT(CASE WHEN result = 'PASS' THEN 1 END) as passed FROM (...);

-- =============================================================================
-- SECTION 1: TABLE EXISTENCE CHECKS
-- =============================================================================

SELECT 'Check: zones table exists' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'zones') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: zone_rooms table exists' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'zone_rooms') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: zone_exits table exists' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'zone_exits') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: factions table exists' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'factions') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: creatures table exists' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'creature_definitions') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: characters table exists' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'characters') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: run_history table exists' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'run_history') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: character_explored_rooms table exists' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'character_explored_rooms') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: character_reputation table exists' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'character_reputation') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: player_death_penalty table exists' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'player_death_penalty') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

-- =============================================================================
-- SECTION 2: COLUMNS SHOULD NOT EXIST (REMOVED BY MIGRATIONS)
-- =============================================================================

SELECT 'Check: zones.biome should NOT exist' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zones' AND column_name = 'biome') 
  THEN 'FAIL' ELSE 'PASS' END AS result;

SELECT 'Check: zones.theme column should exist' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zones' AND column_name = 'theme') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: creature_definitions.biome_affinity should NOT exist' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'creature_definitions' AND column_name = 'biome_affinity') 
  THEN 'FAIL' ELSE 'PASS' END AS result;

SELECT 'Check: creature_definitions.aggressive column should exist' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'creature_definitions' AND column_name = 'aggressive') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: creature_definitions.room_description column should exist' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'creature_definitions' AND column_name = 'room_description') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: characters.gold should NOT exist' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'characters' AND column_name = 'gold') 
  THEN 'FAIL' ELSE 'PASS' END AS result;

SELECT 'Check: characters.water column should exist' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'characters' AND column_name = 'water') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: characters.last_inn_zone_slug column should exist' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'characters' AND column_name = 'last_inn_zone_slug') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: characters.last_inn_room_slug column should exist' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'characters' AND column_name = 'last_inn_room_slug') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: characters.starting_zone_slug column should exist' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'characters' AND column_name = 'starting_zone_slug') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: run_history.shard_tier should NOT exist' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'run_history' AND column_name = 'shard_tier') 
  THEN 'FAIL' ELSE 'PASS' END AS result;

SELECT 'Check: run_history.zone_tier column should exist' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'run_history' AND column_name = 'zone_tier') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: run_history.extracted should NOT exist' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'run_history' AND column_name = 'extracted') 
  THEN 'FAIL' ELSE 'PASS' END AS result;

SELECT 'Check: run_history.survived column should exist' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'run_history' AND column_name = 'survived') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: run_history.extracted_items should NOT exist' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'run_history' AND column_name = 'extracted_items') 
  THEN 'FAIL' ELSE 'PASS' END AS result;

SELECT 'Check: run_history.items_carried_out column should exist' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'run_history' AND column_name = 'items_carried_out') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: run_history.biome should NOT exist' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'run_history' AND column_name = 'biome') 
  THEN 'FAIL' ELSE 'PASS' END AS result;

SELECT 'Check: character_explored_rooms.biome should NOT exist' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'character_explored_rooms' AND column_name = 'biome') 
  THEN 'FAIL' ELSE 'PASS' END AS result;

SELECT 'Check: character_explored_rooms.zone_tier column should exist' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'character_explored_rooms' AND column_name = 'zone_tier') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: character_explored_rooms.shard_tier should NOT exist' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'character_explored_rooms' AND column_name = 'shard_tier') 
  THEN 'FAIL' ELSE 'PASS' END AS result;

-- =============================================================================
-- SECTION 3: TABLES SHOULD NOT EXIST (REMOVED BY MIGRATIONS)
-- =============================================================================

SELECT 'Check: biome_definitions table should NOT exist' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'biome_definitions') 
  THEN 'FAIL' ELSE 'PASS' END AS result;

SELECT 'Check: player_shard_sickness table should NOT exist (renamed to player_death_penalty)' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'player_shard_sickness') 
  THEN 'FAIL' ELSE 'PASS' END AS result;

-- =============================================================================
-- SECTION 4: FACTION DATA CHECKS
-- =============================================================================

SELECT 'Check: exactly 3 factions exist' AS test,
  CASE WHEN (SELECT COUNT(*) FROM factions) = 3 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: faction slug "kindari" exists' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM factions WHERE slug = 'kindari') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: faction slug "bloom-tenders" exists' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM factions WHERE slug = 'bloom-tenders') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: faction slug "krewe-calliope" exists' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM factions WHERE slug = 'krewe-calliope') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: no old faction slug "ironwright" exists' AS test,
  CASE WHEN NOT EXISTS (SELECT 1 FROM factions WHERE slug = 'ironwright') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: no old faction slug "veil" exists' AS test,
  CASE WHEN NOT EXISTS (SELECT 1 FROM factions WHERE slug = 'veil') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: no old faction slug "scarlet" exists' AS test,
  CASE WHEN NOT EXISTS (SELECT 1 FROM factions WHERE slug = 'scarlet') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

-- =============================================================================
-- SECTION 5: ZONE DATA CHECKS
-- =============================================================================

SELECT 'Check: exactly 6 zones exist' AS test,
  CASE WHEN (SELECT COUNT(*) FROM zones) = 6 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: zone "the-refuge" exists' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM zones WHERE slug = 'the-refuge') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: zone "the-refuge" has category "dev"' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM zones WHERE slug = 'the-refuge' AND category = 'dev') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: zone "warrens" exists' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM zones WHERE slug = 'warrens') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: zone "the-siltgate" exists' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM zones WHERE slug = 'the-siltgate') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: zone "the-reliquary" exists' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM zones WHERE slug = 'the-reliquary') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: zone "the-bloom-observatory" exists' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM zones WHERE slug = 'the-bloom-observatory') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: zone "the-carrion-court" exists' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM zones WHERE slug = 'the-carrion-court') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: no old zone slug "the-foundry" exists (renamed to the-reliquary)' AS test,
  CASE WHEN NOT EXISTS (SELECT 1 FROM zones WHERE slug = 'the-foundry') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: no old zone slug "the-cartographium" exists (renamed to the-bloom-observatory)' AS test,
  CASE WHEN NOT EXISTS (SELECT 1 FROM zones WHERE slug = 'the-cartographium') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: no old zone slug "the-counting-house" exists (renamed to the-carrion-court)' AS test,
  CASE WHEN NOT EXISTS (SELECT 1 FROM zones WHERE slug = 'the-counting-house') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

-- =============================================================================
-- SECTION 6: STRONGHOLD CONFIGURATION CHECKS
-- =============================================================================

SELECT 'Check: the-reliquary (Kindari) has faction_slug "kindari"' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM zones WHERE slug = 'the-reliquary' AND faction_slug = 'kindari') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: the-reliquary has category "faction_hub"' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM zones WHERE slug = 'the-reliquary' AND category = 'faction_hub') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: the-bloom-observatory (Bloom Tenders) has faction_slug "bloom-tenders"' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM zones WHERE slug = 'the-bloom-observatory' AND faction_slug = 'bloom-tenders') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: the-bloom-observatory has category "faction_hub"' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM zones WHERE slug = 'the-bloom-observatory' AND category = 'faction_hub') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: the-carrion-court (Krewe Calliope) has faction_slug "krewe-calliope"' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM zones WHERE slug = 'the-carrion-court' AND faction_slug = 'krewe-calliope') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: the-carrion-court has category "faction_hub"' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM zones WHERE slug = 'the-carrion-court' AND category = 'faction_hub') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

-- =============================================================================
-- SECTION 7: ROOM COUNTS BY ZONE
-- =============================================================================

SELECT 'Check: the-refuge has exactly 7 rooms' AS test,
  CASE WHEN (SELECT COUNT(*) FROM zone_rooms WHERE zone_slug = 'the-refuge') = 7 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: warrens has exactly 110 rooms (101 + 8 bridge + 1 causeway-terminus)' AS test,
  CASE WHEN (SELECT COUNT(*) FROM zone_rooms WHERE zone_slug = 'warrens') = 110 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: the-siltgate has exactly 141 rooms (136 + 2 bridge + 1 merchant-inn + 2 stronghold-connection)' AS test,
  CASE WHEN (SELECT COUNT(*) FROM zone_rooms WHERE zone_slug = 'the-siltgate') = 141 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: the-reliquary has exactly 11 rooms (10 base + 1 filtration-annex)' AS test,
  CASE WHEN (SELECT COUNT(*) FROM zone_rooms WHERE zone_slug = 'the-reliquary') = 11 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: the-bloom-observatory has exactly 11 rooms (10 base + 1 platform-descent)' AS test,
  CASE WHEN (SELECT COUNT(*) FROM zone_rooms WHERE zone_slug = 'the-bloom-observatory') = 11 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: the-carrion-court has exactly 11 rooms (10 base + 1 superdome-breach)' AS test,
  CASE WHEN (SELECT COUNT(*) FROM zone_rooms WHERE zone_slug = 'the-carrion-court') = 11 
  THEN 'PASS' ELSE 'FAIL' END AS result;

-- =============================================================================
-- SECTION 8: KEY STRONGHOLD CONNECTION ROOMS EXIST
-- =============================================================================

SELECT 'Check: superdome-breach room exists (carrion-court stronghold connection)' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM zone_rooms WHERE slug = 'superdome-breach') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: flooded-concourse room exists (siltgate stronghold connection)' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM zone_rooms WHERE slug = 'flooded-concourse') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: filtration-annex room exists (reliquary stronghold connection)' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM zone_rooms WHERE slug = 'filtration-annex') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: pipe-bridge room exists (siltgate stronghold connection)' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM zone_rooms WHERE slug = 'pipe-bridge') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: platform-descent room exists (bloom-observatory stronghold connection)' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM zone_rooms WHERE slug = 'platform-descent') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: causeway-terminus room exists (warrens stronghold connection)' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM zone_rooms WHERE slug = 'causeway-terminus') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

-- =============================================================================
-- SECTION 9: STRONGHOLD INN ROOMS EXIST
-- =============================================================================

SELECT 'Check: reliquary-inn room exists' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM zone_rooms WHERE slug = 'reliquary-inn') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: reliquary-inn-upper room exists' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM zone_rooms WHERE slug = 'reliquary-inn-upper') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: bloom-observatory-inn room exists' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM zone_rooms WHERE slug = 'bloom-observatory-inn') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: bloom-observatory-inn-upper room exists' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM zone_rooms WHERE slug = 'bloom-observatory-inn-upper') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: carrion-court-inn room exists' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM zone_rooms WHERE slug = 'carrion-court-inn') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: carrion-court-inn-upper room exists' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM zone_rooms WHERE slug = 'carrion-court-inn-upper') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

-- =============================================================================
-- SECTION 10: CREATURE DEFINITIONS CHECKS
-- =============================================================================

SELECT 'Check: "Silt Roach" creature exists (was city_dog, rethemed by migration 020)' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM creature_definitions WHERE name = 'Silt Roach') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: "Mosquito Swarm" creature exists (was pigeon_flock, rethemed by migration 020)' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM creature_definitions WHERE name = 'Mosquito Swarm') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: "Feral Hog" creature exists (was feral_dog, rethemed by migration 020)' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM creature_definitions WHERE name = 'Feral Hog') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: "Render-Kin Stalker" creature exists (was alley_thug, rethemed by migration 020)' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM creature_definitions WHERE name = 'Render-Kin Stalker') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: "Bone-Tithe Hoarder" creature exists (was dockside_smuggler, rethemed by migration 020)' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM creature_definitions WHERE name = 'Bone-Tithe Hoarder') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: "Fester-Thrall" creature exists (was plague_bearer, rethemed by migration 020)' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM creature_definitions WHERE name = 'Fester-Thrall') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: "The Graftlord" creature exists (was the_harbourmaster, rethemed by migration 020)' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM creature_definitions WHERE name = 'The Graftlord') 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: Silt Roach has aggressive = false' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM creature_definitions WHERE name = 'Silt Roach' AND aggressive = false) 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: Mosquito Swarm has aggressive = false' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM creature_definitions WHERE name = 'Mosquito Swarm' AND aggressive = false) 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: Render-Kin Stalker has aggressive = true' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM creature_definitions WHERE name = 'Render-Kin Stalker' AND aggressive = true) 
  THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT 'Check: all creatures have room_description column set' AS test,
  CASE WHEN (SELECT COUNT(*) FROM creature_definitions WHERE room_description IS NOT NULL) = (SELECT COUNT(*) FROM creature_definitions) 
  THEN 'PASS' ELSE 'FAIL' END AS result;

-- =============================================================================
-- SECTION 11: SUMMARY
-- =============================================================================

SELECT '=== VERIFICATION COMPLETE ===' AS summary,
  'Run the above queries and count PASS/FAIL results.' AS instructions;
