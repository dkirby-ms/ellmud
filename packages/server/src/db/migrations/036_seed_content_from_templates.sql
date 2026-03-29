-- Seed item_definitions and creature_definitions from TypeScript templates.
-- Single source of truth moves from code to database.
-- Loot tables are normalized: only {itemId, dropWeight} — no duplicated metadata.
-- Idempotent: uses INSERT ... ON CONFLICT DO NOTHING.

-- ============================================================================
-- 1. Item definitions — from registry.ts + missing items from zone/creature refs
-- ============================================================================

INSERT INTO item_definitions (id, name, type, tier, base_stats, base_durability, weight, description, soulbound, stackable, max_stack, status) VALUES

  -- ─── Weapons ──────────────────────────────────────────────────────────────
  ('rusty_blade',       'Rusty Blade',        'weapon', 'scrap',     '{"damage":8,"speed":1}',            30,  5,    'A corroded shortsword. It cuts, barely.',                                                                                                false, false, 1, 'published'),
  ('iron_sword',        'Iron Sword',         'weapon', 'common',    '{"damage":12,"speed":1}',           50,  6,    'A serviceable blade of hammered iron.',                                                                                                  false, false, 1, 'published'),
  ('corroded_halberd',  'Corroded Halberd',   'weapon', 'sturdy',    '{"damage":18,"speed":2}',           60,  12,   'A polearm eaten by salt water, still dangerous.',                                                                                       false, false, 1, 'published'),
  ('shardsteel_sabre',  'Shardsteel Sabre',   'weapon', 'refined',   '{"damage":16,"speed":1}',           80,  5,    'Forged from metal recovered deep within the shards.',                                                                                   false, false, 1, 'published'),
  ('voidforged_blade',  'Voidforged Blade',   'weapon', 'anomalous', '{"damage":20,"speed":1}',          120,  4,    'A blade that shimmers between planes. Disturbingly light.',                                                                             false, false, 1, 'published'),
  ('bent_rebar',        'Bent Rebar',         'weapon', 'scrap',     '{"damage":4,"speed":0.8}',          20,  3,    'A corroded length of rebar, wrenched from a collapsed wall. One end is bent into a rough hook. Heavy, slow, and ugly — but better than bare hands.', false, false, 1, 'published'),
  ('scavenger_shiv',    'Scavenger''s Shiv',  'weapon', 'common',    '{"damage":7,"speed":1.2}',          30,  2,    'A shard of plate glass, its base wrapped in copper wire for a grip. The edge is wickedly sharp but fragile.',                             false, false, 1, 'published'),

  -- ─── Armour ───────────────────────────────────────────────────────────────
  ('tattered_leather',    'Tattered Leather',    'armour', 'scrap',   '{"armour":3,"weight":8}',           25,  8,    'Barely held together with sinew and hope.',                                                                                              false, false, 1, 'published'),
  ('iron_chainmail',      'Iron Chainmail',      'armour', 'common',  '{"armour":6,"weight":15}',          50,  15,   'Standard-issue chain links. Heavy but reliable.',                                                                                       false, false, 1, 'published'),
  ('corroded_shield',     'Corroded Shield',     'armour', 'scrap',   '{"armour":4,"weight":10}',          20,  10,   'A round shield covered in barnacles and rust.',                                                                                         false, false, 1, 'published'),
  ('reinforced_plate',    'Reinforced Plate',    'armour', 'sturdy',  '{"armour":10,"weight":25}',         70,  25,   'Thick plating bolted over hardened leather.',                                                                                            false, false, 1, 'published'),
  ('rubble_crusted_vest', 'Rubble-Crusted Vest', 'armour', 'common', '{"armour":3,"weight":5}',           40,  5,    'A padded leather vest with chunks of masonry and tile lashed to its surface. Improvised but effective.',                                  false, false, 1, 'published'),

  -- ─── Consumables ──────────────────────────────────────────────────────────
  ('waterlogged_potion', 'Waterlogged Potion', 'consumable', 'scrap',  '{"heal":20}',                    NULL, 1,    'Murky liquid in a cracked flask. Probably drinkable.',                                                                                   false, true,  5, 'published'),
  ('healing_draught',    'Healing Draught',    'consumable', 'common', '{"heal":40}',                    NULL, 1,    'A reliable potion brewed in the Refuge.',                                                                                                false, true,  5, 'published'),
  ('stamina_tonic',      'Stamina Tonic',      'consumable', 'common', '{"staminaRestore":30,"duration":5}', NULL, 1, 'A bitter brew that quickens the limbs.',                                                                                                 false, true,  5, 'published'),

  -- ─── Materials ────────────────────────────────────────────────────────────
  ('revenant_bone',      'Revenant Bone',      'material', 'common',  '{}', NULL, 2,    'A bleached bone from a shard creature. Crafting material.',                                                                                    false, true, 20, 'published'),
  ('shardsteel_shard',   'Shardsteel Shard',   'material', 'sturdy',  '{}', NULL, 3,    'A fragment of metal infused with shard energy.',                                                                                              false, true, 20, 'published'),
  ('sodden_scroll',      'Sodden Scroll',      'material', 'common',  '{}', NULL, 1,    'Barely legible parchment. Might be useful to scholars.',                                                                                      false, true, 20, 'published'),
  ('tarnished_amulet',   'Tarnished Amulet',   'material', 'sturdy',  '{}', NULL, 1,    'A faded trinket with faint inscriptions.',                                                                                                    false, true, 20, 'published'),
  ('drowned_offering',   'Drowned Offering',   'material', 'refined', '{}', NULL, 2,    'A ritualistic token left at submerged altars.',                                                                                               false, true, 20, 'published'),
  ('tarnished_medallion','Tarnished Medallion', 'material', 'common', '{}', NULL, 0.5,  'An ornate disc of tarnished metal, stamped with a sigil that might once have been a face or a sun or a wheel.',                                false, true, 20, 'published'),
  ('gutterspawn_fang',   'Gutterspawn Fang',   'material', 'scrap',   '{}', NULL, 0.2,  'A hollow, yellowed fang pulled from a gutterspawn maw. The interior canal still glistens with venom.',                                        false, true, 20, 'published'),
  ('charred_street_map', 'Charred Street Map', 'material', 'sturdy',  '{}', NULL, 0.5,  'A fragment of vellum, edges blackened by fire, showing a street grid that matches the ruins around you. Landmarks are annotated in a precise, alien script.', false, false, 1, 'published'),

  -- Materials from creature loot (not in original registry)
  ('waterlogged_bone',   'Waterlogged Bone',   'material', 'common',  '{}', NULL, 1,    'A spongy bone that weeps brackish water. Useful for crude crafting.',                                                                        false, true, 20, 'published'),
  ('revenant_essence',   'Revenant Essence',   'material', 'common',  '{}', NULL, 0.5,  'A viscous, faintly glowing substance extracted from a fallen revenant.',                                                                      false, true, 20, 'published'),

  -- Materials from zone loot containers (not in original registry)
  ('rat_tail',           'Rat Tail',           'material', 'scrap',   '{}', NULL, 0.1,  'A greasy, wiry tail snapped from a slum rat. Alchemists pay copper for these.',                                                               false, true, 50, 'published'),
  ('corroded_pipe',      'Corroded Pipe',      'material', 'scrap',   '{}', NULL, 2,    'A length of rusted pipe, encrusted with mineral deposits. Could be smelted down or swung in desperation.',                                     false, true, 20, 'published'),
  ('sewer_moss',         'Sewer Moss',         'material', 'scrap',   '{}', NULL, 0.3,  'A damp clump of bioluminescent moss scraped from sewer walls. Faintly toxic, faintly useful.',                                                false, true, 20, 'published'),

  -- ─── Keys ─────────────────────────────────────────────────────────────────
  ('crypt_key_fragment', 'Crypt Key Fragment', 'key', 'common', '{}', NULL, 1,    'Part of a shattered key. Collect all fragments to unlock deeper crypts.',                                                                           false, false, 1, 'published'),
  ('sanctuary_key',      'Sanctuary Key',      'key', 'common', '{}', NULL, 0.3,  'A heavy iron key, its shaft thick with verdigris but its teeth still sharp. Fits the reinforced door between the Broken Sanctuary and the Sunken Square.', false, false, 1, 'published')

ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- 2. Creature definitions — from template files + task-designed creatures
-- ============================================================================

-- Drowned Revenant — already exists from migration 023, update loot table to normalized form.
UPDATE creature_definitions SET
  loot_table = '[{"itemId":"waterlogged_bone","dropWeight":1},{"itemId":"revenant_essence","dropWeight":1}]'::jsonb,
  slug = 'drowned_revenant',
  updated_at = now()
WHERE type = 'drowned_revenant';

-- Gutterspawn
INSERT INTO creature_definitions (type, name, slug, max_hp, attack, defence, armour, agility, min_count, max_count, preferred_rooms, forbidden_rooms, idle_ticks_min, idle_ticks_max, flee_threshold, loot_table, status)
VALUES (
  'gutterspawn', 'Gutterspawn', 'gutterspawn',
  15, 5, 1, 0, 7,
  2, 4,
  '{corridor,dead_end}', '{entry,extraction,boss}',
  3, 6, 0.3,
  '[{"itemId":"gutterspawn_fang","dropWeight":80},{"itemId":"bent_rebar","dropWeight":15}]'::jsonb,
  'published'
) ON CONFLICT (type) DO NOTHING;

-- Rubble Scavenger
INSERT INTO creature_definitions (type, name, slug, max_hp, attack, defence, armour, agility, min_count, max_count, preferred_rooms, forbidden_rooms, idle_ticks_min, idle_ticks_max, flee_threshold, loot_table, status)
VALUES (
  'rubble_scavenger', 'Rubble Scavenger', 'rubble_scavenger',
  35, 8, 3, 2, 4,
  1, 3,
  '{junction,dead_end}', '{entry,boss}',
  4, 8, 0.15,
  '[{"itemId":"bent_rebar","dropWeight":50},{"itemId":"tarnished_medallion","dropWeight":25},{"itemId":"scavenger_shiv","dropWeight":15}]'::jsonb,
  'published'
) ON CONFLICT (type) DO NOTHING;

-- Hollow Stalker
INSERT INTO creature_definitions (type, name, slug, max_hp, attack, defence, armour, agility, min_count, max_count, preferred_rooms, forbidden_rooms, idle_ticks_min, idle_ticks_max, flee_threshold, loot_table, status)
VALUES (
  'hollow_stalker', 'Hollow Stalker', 'hollow_stalker',
  60, 13, 5, 4, 6,
  1, 2,
  '{junction}', '{entry,extraction,corridor}',
  5, 12, 0.15,
  '[{"itemId":"tarnished_medallion","dropWeight":40},{"itemId":"sanctuary_key","dropWeight":15},{"itemId":"scavenger_shiv","dropWeight":20}]'::jsonb,
  'published'
) ON CONFLICT (type) DO NOTHING;

-- The Collapsed One (boss)
INSERT INTO creature_definitions (type, name, slug, max_hp, attack, defence, armour, agility, min_count, max_count, preferred_rooms, forbidden_rooms, idle_ticks_min, idle_ticks_max, flee_threshold, loot_table, status)
VALUES (
  'the_collapsed_one', 'The Collapsed One', 'the_collapsed_one',
  150, 18, 8, 10, 1,
  1, 1,
  '{boss}', '{entry,extraction,corridor,junction,dead_end}',
  8, 15, 0,
  '[{"itemId":"rubble_crusted_vest","dropWeight":30},{"itemId":"scavenger_shiv","dropWeight":25},{"itemId":"charred_street_map","dropWeight":20},{"itemId":"tarnished_medallion","dropWeight":25}]'::jsonb,
  'published'
) ON CONFLICT (type) DO NOTHING;

-- Slum Rat — Tier 0 trash mob (no template file, designed per spec)
INSERT INTO creature_definitions (type, name, slug, description, max_hp, attack, defence, armour, agility, min_count, max_count, preferred_rooms, forbidden_rooms, idle_ticks_min, idle_ticks_max, flee_threshold, loot_table, status)
VALUES (
  'slum_rat', 'Slum Rat', 'slum_rat',
  'A bloated rat the size of a terrier, its fur matted with filth and its eyes bright with cunning malice. Individually a nuisance; in packs, a genuine threat to the wounded.',
  8, 3, 0, 0, 6,
  2, 5,
  '{corridor,dead_end}', '{boss}',
  2, 4, 0.5,
  '[{"itemId":"rat_tail","dropWeight":60}]'::jsonb,
  'published'
) ON CONFLICT (type) DO NOTHING;

-- Sewer Lurker — Tier 1 ambush predator (no template file, designed per spec)
INSERT INTO creature_definitions (type, name, slug, description, max_hp, attack, defence, armour, agility, min_count, max_count, preferred_rooms, forbidden_rooms, idle_ticks_min, idle_ticks_max, flee_threshold, loot_table, status)
VALUES (
  'sewer_lurker', 'Sewer Lurker', 'sewer_lurker',
  'A long-limbed thing that clings to sewer ceilings, its pale skin slick with condensation. It drops silently onto prey, striking fast before retreating into the pipes.',
  25, 7, 2, 0, 5,
  1, 2,
  '{corridor,dead_end,junction}', '{entry,extraction,boss}',
  4, 8, 0.3,
  '[{"itemId":"corroded_pipe","dropWeight":40},{"itemId":"sewer_moss","dropWeight":30}]'::jsonb,
  'published'
) ON CONFLICT (type) DO NOTHING;
