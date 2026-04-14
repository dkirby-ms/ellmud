-- 019_creature_combat_stats.sql — Phase 1 combat stats for creature definitions.
-- Adds weapon-type skill ranks and dodge to creature_definitions.
-- Creatures use the same weapon skill model as players — they can equip gear.
-- Existing max_hp, attack, armour columns kept for backward compatibility.
-- No agility column — dodge_skill_rank alone handles avoidance (user directive 2026-04-13).

ALTER TABLE creature_definitions
  ADD COLUMN IF NOT EXISTS unarmed           INTEGER NOT NULL DEFAULT 5,   -- Unarmed combat skill rank
  ADD COLUMN IF NOT EXISTS one_handed        INTEGER NOT NULL DEFAULT 5,   -- One-handed weapon skill rank
  ADD COLUMN IF NOT EXISTS two_handed        INTEGER NOT NULL DEFAULT 5,   -- Two-handed weapon skill rank
  ADD COLUMN IF NOT EXISTS ranged            INTEGER NOT NULL DEFAULT 5,   -- Ranged weapon skill rank
  ADD COLUMN IF NOT EXISTS shield_block      INTEGER NOT NULL DEFAULT 0,   -- Shield block chance rank
  ADD COLUMN IF NOT EXISTS dodge_skill_rank  INTEGER NOT NULL DEFAULT 0;   -- Dodge chance rank

-- ─── Populate varied dodge ranks by creature archetype ──────────────────────
-- Agile creatures: city_dog (silt roach), rubble_scavenger → dodge 3
UPDATE creature_definitions SET dodge_skill_rank = 3
  WHERE slug IN ('city_dog', 'rubble_scavenger');

-- Fast creatures: pigeon_flock (n/a — use razorwing_swarm), hollow_stalker, flood_scuttler, tidal_lurker → dodge 2
UPDATE creature_definitions SET dodge_skill_rank = 2
  WHERE slug IN ('hollow_stalker', 'razorwing_swarm', 'flood_scuttler', 'tidal_lurker', 'electrical_eel_cluster');

-- Medium creatures: sewer_lurker, drowned_swimmer, lamprey_mass, memory_echo → dodge 1
UPDATE creature_definitions SET dodge_skill_rank = 1
  WHERE slug IN ('drowned_revenant', 'the_collapsed_one', 'sewer_lurker', 'drowned_swimmer',
                 'lamprey_mass', 'memory_echo', 'rust_siren', 'fracture_phantom',
                 'ash_warden', 'the_sovereign_of_dust', 'depth_sovereign');

-- Very slow / immobile: gutterspawn, concrete_shambler, ruin_colossus, coral_amalgam → dodge 0 (default)

-- ─── Populate varied weapon skill ranks by creature archetype ───────────────
-- Melee brawlers (unarmed-focused): gutterspawn, slum_rat, sludge_crawler, lamprey_mass
UPDATE creature_definitions SET unarmed = 8, one_handed = 2, two_handed = 1, ranged = 0
  WHERE slug IN ('gutterspawn', 'slum_rat', 'sludge_crawler', 'lamprey_mass');

-- Claw/fang fighters (unarmed + one-handed): city_dog, rubble_scavenger, sewer_lurker, flood_scuttler
UPDATE creature_definitions SET unarmed = 6, one_handed = 5, two_handed = 1, ranged = 0
  WHERE slug IN ('city_dog', 'rubble_scavenger', 'sewer_lurker', 'flood_scuttler');

-- Armed humanoids (one-handed focused): drowned_revenant, drowned_swimmer, hollow_stalker
UPDATE creature_definitions SET unarmed = 3, one_handed = 8, two_handed = 3, ranged = 1
  WHERE slug IN ('drowned_revenant', 'drowned_swimmer', 'hollow_stalker');

-- Heavy hitters (two-handed focused): concrete_shambler, scrap_brute, the_collapsed_one
UPDATE creature_definitions SET unarmed = 4, one_handed = 3, two_handed = 10, ranged = 0
  WHERE slug IN ('concrete_shambler', 'scrap_brute', 'the_collapsed_one');

-- Ranged / magical: razorwing_swarm, electrical_eel_cluster, memory_echo
UPDATE creature_definitions SET unarmed = 2, one_handed = 2, two_handed = 1, ranged = 8
  WHERE slug IN ('razorwing_swarm', 'electrical_eel_cluster', 'memory_echo');

-- Balanced elite: rust_siren, ash_warden, fracture_phantom, pressure_horror, tidal_lurker
UPDATE creature_definitions SET unarmed = 5, one_handed = 7, two_handed = 5, ranged = 4
  WHERE slug IN ('rust_siren', 'ash_warden', 'fracture_phantom', 'pressure_horror', 'tidal_lurker');

-- Boss creatures: the_sovereign_of_dust, the_drowned_choir, the_abyssal_maw, ruin_colossus, coral_amalgam
UPDATE creature_definitions SET unarmed = 6, one_handed = 8, two_handed = 8, ranged = 6, shield_block = 3
  WHERE slug IN ('the_sovereign_of_dust', 'the_drowned_choir', 'the_abyssal_maw',
                 'ruin_colossus', 'coral_amalgam');

-- Leviathan spawn and depth sovereign: massive aquatic predators
UPDATE creature_definitions SET unarmed = 10, one_handed = 4, two_handed = 6, ranged = 3, shield_block = 2
  WHERE slug IN ('leviathan_spawn', 'depth_sovereign');
