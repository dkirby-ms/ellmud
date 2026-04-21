-- 022_faction_hq_npcs.sql — Populate faction HQ zones with friendly NPCs and loot containers
-- All NPCs are non-aggressive (safe zones). Design by Laeral (laeral-faction-hq-population.md).

-- ============================================================================
-- 1. Creature Definitions (24 friendly faction NPCs)
-- ============================================================================
-- Column order matches 011_bestiary_creatures.sql exactly:
-- (type, name, slug, description, max_hp, attack, defence, armour, agility,
--  min_count, max_count, preferred_rooms, forbidden_rooms,
--  idle_ticks_min, idle_ticks_max, flee_threshold, loot_table,
--  aggressive, room_description, status)

INSERT INTO creature_definitions (type, name, slug, description, max_hp, attack, defence, armour, agility, min_count, max_count, preferred_rooms, forbidden_rooms, idle_ticks_min, idle_ticks_max, flee_threshold, loot_table, aggressive, room_description, status)
VALUES
-- ── The Reliquary (Kindari) ─────────────────────────────────────────────────

  ('kindari_gate_warden', 'Kindari Gate Warden', 'kindari_gate_warden',
   'A hardened Kindari sentry in welded scrap-plate armour, tasked with keeping the Reliquary secure.',
   120, 14, 10, 8, 3, 1, 2,
   '{reliquary-filtration-annex,reliquary-loading-dock}', '{}',
   300, 700, 0, '[]'::jsonb, false,
   'A Kindari gate warden stands watch, one hand resting on a pipe-wrench mace.', 'published'),

  ('kindari_technician', 'Kindari Technician', 'kindari_technician',
   'A grease-stained engineer who keeps the Reliquary''s pumps and generators alive through sheer ingenuity.',
   45, 5, 4, 2, 4, 1, 4,
   '{reliquary-commons,reliquary-generator-room,reliquary-pipe-corridor}', '{}',
   300, 800, 0, '[]'::jsonb, false,
   'A Kindari technician crouches over an open panel, muttering about pressure valves.', 'published'),

  ('kindari_drone_handler', 'Kindari Drone Handler', 'kindari_drone_handler',
   'A specialist who strips, repairs, and reprograms salvaged drones for reconnaissance.',
   55, 7, 5, 3, 5, 2, 2,
   '{reliquary-drone-bay}', '{}',
   300, 700, 0, '[]'::jsonb, false,
   'A drone handler examines a cracked rotor blade, comparing it against a hand-drawn schematic.', 'published'),

  ('kindari_quartermaster', 'Kindari Quartermaster', 'kindari_quartermaster',
   'The faction''s chief trader, cataloguing every screw, spool, and circuit board with obsessive precision.',
   65, 6, 5, 3, 3, 1, 1,
   '{reliquary-market}', '{}',
   400, 800, 0, '[]'::jsonb, false,
   'The Kindari quartermaster tallies inventory on a battered clipboard, barely looking up.', 'published'),

  ('kindari_medic', 'Kindari Medic', 'kindari_medic',
   'A water-purification specialist who doubles as a field surgeon, cleaning wounds with filtered water and salvaged antiseptic.',
   50, 4, 4, 2, 4, 1, 1,
   '{reliquary-infirmary}', '{}',
   400, 800, 0, '[]'::jsonb, false,
   'A Kindari medic rinses surgical tools in the filtration pool, humming a work hymn.', 'published'),

  ('kindari_drill_instructor', 'Kindari Drill Instructor', 'kindari_drill_instructor',
   'A scarred veteran who trains recruits using hydraulic resistance rigs and simulated breach drills.',
   90, 12, 8, 6, 5, 1, 1,
   '{reliquary-training}', '{}',
   200, 600, 0, '[]'::jsonb, false,
   'A drill instructor barks orders at a recruit struggling against a pneumatic training arm.', 'published'),

  ('kindari_archivist', 'Kindari Archivist', 'kindari_archivist',
   'A quiet scholar who catalogues salvaged blueprints and pre-collapse technical manuals.',
   40, 3, 3, 1, 3, 1, 1,
   '{reliquary-war-room}', '{}',
   400, 800, 0, '[]'::jsonb, false,
   'A Kindari archivist carefully unfolds a water-stained blueprint, tracing pipe routes with a finger.', 'published'),

  ('kindari_shrine_keeper', 'Kindari Shrine Keeper', 'kindari_shrine_keeper',
   'An elder who maintains the shrine to Saitcho Kindar, tending offerings and reciting preservation hymns.',
   35, 2, 2, 1, 2, 1, 1,
   '{reliquary-shrine-alcove}', '{}',
   500, 800, 0, '[]'::jsonb, false,
   'The shrine keeper arranges gear-tooth offerings around the urn, whispering the Preservation Creed.', 'published'),

-- ── The Bloom Observatory (Bloom Tenders) ───────────────────────────────────

  ('bloom_deck_guard', 'Bloom Deck Guard', 'bloom_deck_guard',
   'A weather-hardened Tender in barnacle-crusted armour, armed with a harpoon-spear. Watches the platform perimeter for threats from below.',
   110, 13, 9, 7, 4, 1, 2,
   '{bloom-platform-descent,bloom-netting-walk}', '{}',
   300, 700, 0, '[]'::jsonb, false,
   'A Bloom deck guard leans against the railing, scanning the waterline with narrowed eyes.', 'published'),

  ('bloom_cultivator', 'Bloom Cultivator', 'bloom_cultivator',
   'A patient algae farmer who tends the platform''s cultivation trays, monitoring pH and growth rates by hand.',
   40, 3, 3, 1, 3, 1, 4,
   '{bloom-commons,bloom-algae-terraces,bloom-kelp-garden}', '{}',
   400, 800, 0, '[]'::jsonb, false,
   'A Bloom cultivator scoops a sample from a tank, holding it up to the grey light.', 'published'),

  ('bloom_trader', 'Bloom Trader', 'bloom_trader',
   'A shrewd Tender who barters biosamples, data slates, and cultivated reagents at the Barter Net.',
   55, 5, 4, 2, 3, 1, 1,
   '{bloom-market}', '{}',
   400, 800, 0, '[]'::jsonb, false,
   'A Bloom trader arranges jars of dried algae and labelled vials on a salt-stained counter.', 'published'),

  ('bloom_medic', 'Bloom Medic', 'bloom_medic',
   'A Tender healer who treats injuries with algae poultices and seawater soaks, working calmly amid the platform''s constant damp.',
   50, 4, 4, 2, 4, 1, 1,
   '{bloom-infirmary}', '{}',
   400, 800, 0, '[]'::jsonb, false,
   'A Bloom medic wraps a crewmate''s hand in kelp-fibre bandage, murmuring instructions.', 'published'),

  ('bloom_navigator', 'Bloom Navigator', 'bloom_navigator',
   'A cartographer and tide-reader who plots safe routes through bloom-infested waters.',
   60, 6, 5, 3, 5, 1, 1,
   '{bloom-expedition-board}', '{}',
   300, 700, 0, '[]'::jsonb, false,
   'A navigator pins a fresh tide chart to the wall, tracing currents with a compass needle.', 'published'),

  ('bloom_sparring_master', 'Bloom Sparring Master', 'bloom_sparring_master',
   'A veteran Tender who trains recruits in close-quarters combat adapted for slippery decks and tight corridors.',
   85, 11, 8, 5, 6, 1, 1,
   '{bloom-training}', '{}',
   200, 600, 0, '[]'::jsonb, false,
   'The sparring master circles a trainee on the wet deck, correcting their footing with a sharp tap.', 'published'),

  ('bloom_radio_operator', 'Bloom Radio Operator', 'bloom_radio_operator',
   'A quiet technician who monitors salvaged transmitters for storm warnings and distant signals.',
   35, 2, 2, 1, 3, 1, 1,
   '{bloom-radio-shack}', '{}',
   500, 800, 0, '[]'::jsonb, false,
   'A radio operator adjusts a dial, headphones clamped tight, scribbling notes on static patterns.', 'published'),

  ('bloom_cook', 'Bloom Cook', 'bloom_cook',
   'The platform''s mess chief, brewing kelp stew and fermented algae drinks that keep the crew fed and functional.',
   45, 4, 3, 1, 3, 1, 1,
   '{bloom-mess-deck}', '{}',
   400, 800, 0, '[]'::jsonb, false,
   'A Bloom cook stirs a bubbling pot of kelp stew, tasting from a wooden spoon.', 'published'),

-- ── The Carrion Court (Krewe Calliope) ──────────────────────────────────────

  ('calliope_masked_sentinel', 'Masked Sentinel', 'calliope_masked_sentinel',
   'A Krewe guard in lacquered parade armour, face hidden behind a grinning skull mask. Silence is their only performance.',
   115, 14, 10, 8, 4, 1, 2,
   '{carrion-commons,carrion-superdome-breach}', '{}',
   300, 700, 0, '[]'::jsonb, false,
   'A masked sentinel stands motionless at the archway, skull mask gleaming in the torchlight.', 'published'),

  ('calliope_vendor', 'Krewe Curiosity Vendor', 'calliope_vendor',
   'A flamboyant merchant who sells salvage, masks, trinkets, and "blessings" with equal theatricality.',
   50, 5, 4, 2, 4, 2, 2,
   '{carrion-market}', '{}',
   300, 700, 0, '[]'::jsonb, false,
   'A Krewe vendor gestures dramatically at a spread of masks and bottled charms, mid-haggle.', 'published'),

  ('calliope_bone_priest', 'Bone Priest', 'calliope_bone_priest',
   'A ritual specialist who tends the dead, mixes incense, and performs the Krewe''s funerary rites.',
   55, 5, 5, 3, 3, 1, 2,
   '{carrion-infirmary,carrion-incense-hall}', '{}',
   400, 800, 0, '[]'::jsonb, false,
   'A bone priest grinds herbs into a brass censer, filling the air with sweet, heavy smoke.', 'published'),

  ('calliope_drummer', 'Krewe Drummer', 'calliope_drummer',
   'A tireless percussionist who keeps the Dome''s heartbeat alive. The rhythm guides patrols, meals, and mourning alike.',
   40, 4, 3, 1, 4, 2, 2,
   '{carrion-drum-circle}', '{}',
   300, 700, 0, '[]'::jsonb, false,
   'A Krewe drummer strikes a battered steel drum in a steady, hypnotic cadence.', 'published'),

  ('calliope_choreographer', 'Krewe Choreographer', 'calliope_choreographer',
   'A combat instructor who teaches fighting as performance — every parry a flourish, every riposte a bow.',
   75, 10, 7, 5, 6, 1, 1,
   '{carrion-training}', '{}',
   200, 600, 0, '[]'::jsonb, false,
   'The choreographer demonstrates a spinning disarm, then pauses to critique a student''s footwork.', 'published'),

  ('calliope_muralist', 'Krewe Muralist', 'calliope_muralist',
   'A painter who documents the Krewe''s history in vivid, sweeping panels across the Dome''s concrete walls.',
   35, 2, 2, 1, 3, 1, 1,
   '{carrion-mural-arcade}', '{}',
   500, 800, 0, '[]'::jsonb, false,
   'A muralist dabs ochre onto a half-finished panel depicting a candlelit funeral procession.', 'published'),

  ('calliope_mask_artisan', 'Mask Artisan', 'calliope_mask_artisan',
   'A craftsperson who carves and paints the ceremonial masks that define Krewe identity. Each mask is a story.',
   40, 3, 3, 2, 4, 1, 1,
   '{carrion-armoury}', '{}',
   400, 800, 0, '[]'::jsonb, false,
   'A mask artisan holds a half-carved face up to the lantern light, turning it slowly.', 'published'),

  ('calliope_stage_hand', 'Krewe Stage Hand', 'calliope_stage_hand',
   'A jack-of-all-trades who maintains the Dome''s scaffolding, rigs lanterns, and keeps the stages ready for performance.',
   45, 5, 4, 2, 5, 1, 2,
   '{carrion-scaffold-bridge,carrion-rain-stage}', '{}',
   300, 700, 0, '[]'::jsonb, false,
   'A stage hand tightens rope lashings on a scaffold, testing the knots with practiced tugs.', 'published')

ON CONFLICT (type) DO NOTHING;

-- ============================================================================
-- 2. Phase 1 Combat Stats for faction NPCs
-- ============================================================================
-- Guards: moderate combat stats, some shield_block
UPDATE creature_definitions SET unarmed = 6, one_handed = 8, two_handed = 4, ranged = 2, shield_block = 3, dodge_skill_rank = 1
  WHERE slug IN ('kindari_gate_warden', 'bloom_deck_guard', 'calliope_masked_sentinel');

-- Trainers: moderate-high combat stats
UPDATE creature_definitions SET unarmed = 7, one_handed = 7, two_handed = 5, ranged = 3, shield_block = 2, dodge_skill_rank = 2
  WHERE slug IN ('kindari_drill_instructor', 'bloom_sparring_master', 'calliope_choreographer');

-- Vendors/specialists: low combat stats
UPDATE creature_definitions SET unarmed = 3, one_handed = 3, two_handed = 1, ranged = 1, shield_block = 0, dodge_skill_rank = 0
  WHERE slug IN ('kindari_quartermaster', 'kindari_medic', 'kindari_drone_handler',
                 'bloom_trader', 'bloom_medic', 'bloom_navigator',
                 'calliope_vendor', 'calliope_bone_priest');

-- Flavor NPCs: minimal combat stats
UPDATE creature_definitions SET unarmed = 2, one_handed = 1, two_handed = 0, ranged = 0, shield_block = 0, dodge_skill_rank = 0
  WHERE slug IN ('kindari_technician', 'kindari_archivist', 'kindari_shrine_keeper',
                 'bloom_cultivator', 'bloom_radio_operator', 'bloom_cook',
                 'calliope_drummer', 'calliope_muralist', 'calliope_mask_artisan', 'calliope_stage_hand');

-- ============================================================================
-- 3. Room NPC Assignments — The Reliquary
-- ============================================================================

UPDATE zone_rooms SET npcs = '[{"creatureId":"kindari_technician","spawnCount":2}]'::jsonb
  WHERE slug = 'reliquary-commons' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-reliquary');

UPDATE zone_rooms SET npcs = '[{"creatureId":"kindari_gate_warden","spawnCount":1}]'::jsonb
  WHERE slug = 'reliquary-filtration-annex' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-reliquary');

UPDATE zone_rooms SET npcs = '[{"creatureId":"kindari_gate_warden","spawnCount":1}]'::jsonb
  WHERE slug = 'reliquary-loading-dock' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-reliquary');

UPDATE zone_rooms SET npcs = '[{"creatureId":"kindari_technician","spawnCount":1}]'::jsonb
  WHERE slug = 'reliquary-generator-room' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-reliquary');

UPDATE zone_rooms SET npcs = '[{"creatureId":"kindari_technician","spawnCount":1}]'::jsonb
  WHERE slug = 'reliquary-pipe-corridor' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-reliquary');

UPDATE zone_rooms SET npcs = '[{"creatureId":"kindari_drone_handler","spawnCount":2}]'::jsonb
  WHERE slug = 'reliquary-drone-bay' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-reliquary');

UPDATE zone_rooms SET npcs = '[{"creatureId":"kindari_quartermaster","spawnCount":1}]'::jsonb
  WHERE slug = 'reliquary-market' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-reliquary');

UPDATE zone_rooms SET npcs = '[{"creatureId":"kindari_medic","spawnCount":1}]'::jsonb
  WHERE slug = 'reliquary-infirmary' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-reliquary');

UPDATE zone_rooms SET npcs = '[{"creatureId":"kindari_drill_instructor","spawnCount":1}]'::jsonb
  WHERE slug = 'reliquary-training' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-reliquary');

UPDATE zone_rooms SET npcs = '[{"creatureId":"kindari_archivist","spawnCount":1}]'::jsonb
  WHERE slug = 'reliquary-war-room' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-reliquary');

UPDATE zone_rooms SET npcs = '[{"creatureId":"kindari_shrine_keeper","spawnCount":1}]'::jsonb
  WHERE slug = 'reliquary-shrine-alcove' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-reliquary');

-- ============================================================================
-- 4. Room NPC Assignments — The Bloom Observatory
-- ============================================================================

UPDATE zone_rooms SET npcs = '[{"creatureId":"bloom_cultivator","spawnCount":1}]'::jsonb
  WHERE slug = 'bloom-commons' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-bloom-observatory');

UPDATE zone_rooms SET npcs = '[{"creatureId":"bloom_cultivator","spawnCount":2}]'::jsonb
  WHERE slug = 'bloom-algae-terraces' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-bloom-observatory');

UPDATE zone_rooms SET npcs = '[{"creatureId":"bloom_cultivator","spawnCount":1}]'::jsonb
  WHERE slug = 'bloom-kelp-garden' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-bloom-observatory');

UPDATE zone_rooms SET npcs = '[{"creatureId":"bloom_trader","spawnCount":1}]'::jsonb
  WHERE slug = 'bloom-market' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-bloom-observatory');

UPDATE zone_rooms SET npcs = '[{"creatureId":"bloom_medic","spawnCount":1}]'::jsonb
  WHERE slug = 'bloom-infirmary' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-bloom-observatory');

UPDATE zone_rooms SET npcs = '[{"creatureId":"bloom_navigator","spawnCount":1}]'::jsonb
  WHERE slug = 'bloom-expedition-board' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-bloom-observatory');

UPDATE zone_rooms SET npcs = '[{"creatureId":"bloom_sparring_master","spawnCount":1}]'::jsonb
  WHERE slug = 'bloom-training' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-bloom-observatory');

UPDATE zone_rooms SET npcs = '[{"creatureId":"bloom_radio_operator","spawnCount":1}]'::jsonb
  WHERE slug = 'bloom-radio-shack' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-bloom-observatory');

UPDATE zone_rooms SET npcs = '[{"creatureId":"bloom_cook","spawnCount":1}]'::jsonb
  WHERE slug = 'bloom-mess-deck' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-bloom-observatory');

UPDATE zone_rooms SET npcs = '[{"creatureId":"bloom_deck_guard","spawnCount":1}]'::jsonb
  WHERE slug = 'bloom-platform-descent' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-bloom-observatory');

UPDATE zone_rooms SET npcs = '[{"creatureId":"bloom_deck_guard","spawnCount":1}]'::jsonb
  WHERE slug = 'bloom-netting-walk' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-bloom-observatory');

-- ============================================================================
-- 5. Room NPC Assignments — The Carrion Court
-- ============================================================================

UPDATE zone_rooms SET npcs = '[{"creatureId":"calliope_masked_sentinel","spawnCount":1}]'::jsonb
  WHERE slug = 'carrion-commons' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-carrion-court');

UPDATE zone_rooms SET npcs = '[{"creatureId":"calliope_masked_sentinel","spawnCount":1}]'::jsonb
  WHERE slug = 'carrion-superdome-breach' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-carrion-court');

UPDATE zone_rooms SET npcs = '[{"creatureId":"calliope_vendor","spawnCount":2}]'::jsonb
  WHERE slug = 'carrion-market' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-carrion-court');

UPDATE zone_rooms SET npcs = '[{"creatureId":"calliope_bone_priest","spawnCount":1}]'::jsonb
  WHERE slug = 'carrion-infirmary' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-carrion-court');

UPDATE zone_rooms SET npcs = '[{"creatureId":"calliope_bone_priest","spawnCount":1}]'::jsonb
  WHERE slug = 'carrion-incense-hall' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-carrion-court');

UPDATE zone_rooms SET npcs = '[{"creatureId":"calliope_drummer","spawnCount":2}]'::jsonb
  WHERE slug = 'carrion-drum-circle' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-carrion-court');

UPDATE zone_rooms SET npcs = '[{"creatureId":"calliope_choreographer","spawnCount":1}]'::jsonb
  WHERE slug = 'carrion-training' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-carrion-court');

UPDATE zone_rooms SET npcs = '[{"creatureId":"calliope_muralist","spawnCount":1}]'::jsonb
  WHERE slug = 'carrion-mural-arcade' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-carrion-court');

UPDATE zone_rooms SET npcs = '[{"creatureId":"calliope_mask_artisan","spawnCount":1}]'::jsonb
  WHERE slug = 'carrion-armoury' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-carrion-court');

UPDATE zone_rooms SET npcs = '[{"creatureId":"calliope_stage_hand","spawnCount":1}]'::jsonb
  WHERE slug = 'carrion-scaffold-bridge' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-carrion-court');

UPDATE zone_rooms SET npcs = '[{"creatureId":"calliope_stage_hand","spawnCount":1}]'::jsonb
  WHERE slug = 'carrion-rain-stage' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-carrion-court');

-- ============================================================================
-- 6. Starting Items (Loot Containers) — The Reliquary
-- ============================================================================

UPDATE zone_rooms SET starting_items = '[{"id":"salvage_crate","type":"crate","items":[]}]'::jsonb
  WHERE slug = 'reliquary-armoury' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-reliquary');

UPDATE zone_rooms SET starting_items = '[{"id":"drone_parts_bin","type":"crate","items":[]}]'::jsonb
  WHERE slug = 'reliquary-drone-bay' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-reliquary');

UPDATE zone_rooms SET starting_items = '[{"id":"medics_supply_locker","type":"chest","items":[]}]'::jsonb
  WHERE slug = 'reliquary-infirmary' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-reliquary');

UPDATE zone_rooms SET starting_items = '[{"id":"quartermasters_sample_case","type":"crate","items":[]}]'::jsonb
  WHERE slug = 'reliquary-market-backroom' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-reliquary');

UPDATE zone_rooms SET starting_items = '[{"id":"emergency_tool_chest","type":"chest","items":[]}]'::jsonb
  WHERE slug = 'reliquary-generator-room' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-reliquary');

UPDATE zone_rooms SET starting_items = '[{"id":"offering_bowl","type":"altar","items":[]}]'::jsonb
  WHERE slug = 'reliquary-shrine-alcove' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-reliquary');

-- ============================================================================
-- 7. Starting Items (Loot Containers) — The Bloom Observatory
-- ============================================================================

UPDATE zone_rooms SET starting_items = '[{"id":"specimen_jar_rack","type":"crate","items":[]}]'::jsonb
  WHERE slug = 'bloom-stash' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-bloom-observatory');

UPDATE zone_rooms SET starting_items = '[{"id":"navigation_kit","type":"chest","items":[]}]'::jsonb
  WHERE slug = 'bloom-armoury' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-bloom-observatory');

UPDATE zone_rooms SET starting_items = '[{"id":"cooks_pantry_crate","type":"crate","items":[]}]'::jsonb
  WHERE slug = 'bloom-mess-deck' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-bloom-observatory');

UPDATE zone_rooms SET starting_items = '[{"id":"observation_log","type":"chest","items":[]}]'::jsonb
  WHERE slug = 'bloom-lens-gallery' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-bloom-observatory');

UPDATE zone_rooms SET starting_items = '[{"id":"emergency_supply_box","type":"crate","items":[]}]'::jsonb
  WHERE slug = 'bloom-cargo-hatch' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-bloom-observatory');

UPDATE zone_rooms SET starting_items = '[{"id":"bioluminescent_sample","type":"crate","items":[]}]'::jsonb
  WHERE slug = 'bloom-tidal-pool' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-bloom-observatory');

-- ============================================================================
-- 8. Starting Items (Loot Containers) — The Carrion Court
-- ============================================================================

UPDATE zone_rooms SET starting_items = '[{"id":"costume_trunk","type":"chest","items":[]}]'::jsonb
  WHERE slug = 'carrion-stash' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-carrion-court');

UPDATE zone_rooms SET starting_items = '[{"id":"mask_blank_crate","type":"crate","items":[]}]'::jsonb
  WHERE slug = 'carrion-armoury' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-carrion-court');

UPDATE zone_rooms SET starting_items = '[{"id":"incense_brazier_supply","type":"crate","items":[]}]'::jsonb
  WHERE slug = 'carrion-incense-hall' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-carrion-court');

UPDATE zone_rooms SET starting_items = '[{"id":"prop_heap","type":"crate","items":[]}]'::jsonb
  WHERE slug = 'carrion-prop-graveyard' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-carrion-court');

UPDATE zone_rooms SET starting_items = '[{"id":"offering_basket","type":"altar","items":[]}]'::jsonb
  WHERE slug = 'carrion-tunnel-of-masks' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-carrion-court');

UPDATE zone_rooms SET starting_items = '[{"id":"rain_stage_cache","type":"crate","items":[]}]'::jsonb
  WHERE slug = 'carrion-rain-stage' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-carrion-court');
