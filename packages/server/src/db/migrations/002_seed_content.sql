-- 002_seed_content.sql — Seed game content definitions.

-- ============================================================================
-- 1. Factions
-- ============================================================================

INSERT INTO factions (id, name, slug, philosophy, specialty, description, milestones, events) VALUES
  (gen_random_uuid(), 'The Ironwright Compact', 'ironwright', 'Pragmatic survivalists. Gear and craftsmanship above all.', 'Best crafting recipes, armour bonuses, durability perks.', 'Pragmatic survivalists. Gear and craftsmanship above all.', '[]', '[]'),
  (gen_random_uuid(), 'The Veil Cartographers', 'veil', 'Knowledge-seekers. Map the zones, understand the collapse.', 'Awareness bonuses, extended expedition timers, anomaly detection.', 'Knowledge-seekers. Map the zones, understand the collapse.', '[]', '[]'),
  (gen_random_uuid(), 'The Scarlet Ledger', 'scarlet', 'Risk-takers and profiteers. High risk, high reward.', 'Better loot rolls, PvP stealth bonuses, black-market access.', 'Risk-takers and profiteers. High risk, high reward.', '[]', '[]');

-- ============================================================================
-- 2. Item definitions — from registry.ts + missing items from zone/creature refs
-- ============================================================================

INSERT INTO item_definitions (id, name, type, tier, base_stats, base_durability, weight, description, soulbound, stackable, max_stack, status) VALUES

  -- ─── Weapons ──────────────────────────────────────────────────────────────
  ('rusty_blade',       'Rusty Blade',        'weapon', 'scrap',     '{"damage":8,"speed":1}',            30,  5,    'A corroded shortsword. It cuts, barely.',                                                                                                false, false, 1, 'published'),
  ('iron_sword',        'Iron Sword',         'weapon', 'common',    '{"damage":12,"speed":1}',           50,  6,    'A serviceable blade of hammered iron.',                                                                                                  false, false, 1, 'published'),
  ('corroded_halberd',  'Corroded Halberd',   'weapon', 'sturdy',    '{"damage":18,"speed":2}',           60,  12,   'A polearm eaten by salt water, still dangerous.',                                                                                       false, false, 1, 'published'),
  ('shardsteel_sabre',  'Shardsteel Sabre',   'weapon', 'refined',   '{"damage":16,"speed":1}',           80,  5,    'Forged from metal recovered deep within the ruins.',                                                                                   false, false, 1, 'published'),
  ('voidforged_blade',  'Voidforged Blade',   'weapon', 'anomalous', '{"damage":20,"speed":1}',          120,  4,    'A blade that shimmers between planes. Disturbingly light.',                                                                             false, false, 1, 'published'),
  ('bent_rebar',        'Bent Rebar',         'weapon', 'scrap',     '{"damage":4,"speed":0.8}',          20,  3,    'A corroded length of rebar, wrenched from a collapsed wall. One end is bent into a rough hook. Heavy, slow, and ugly — but better than bare hands.', false, false, 1, 'published'),
  ('scavenger_shiv',    'Scavenger''s Shiv',  'weapon', 'common',    '{"damage":7,"speed":1.2}',          30,  2,    'A sliver of plate glass, its base wrapped in copper wire for a grip. The edge is wickedly sharp but fragile.',                             false, false, 1, 'published'),

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
  ('revenant_bone',      'Revenant Bone',      'material', 'common',  '{}', NULL, 2,    'A bleached bone from a dungeon creature. Crafting material.',                                                                                    false, true, 20, 'published'),
  ('shardsteel_shard',   'Shardsteel Shard',   'material', 'sturdy',  '{}', NULL, 3,    'A fragment of metal infused with void energy.',                                                                                              false, true, 20, 'published'),
  ('sodden_scroll',      'Sodden Scroll',      'material', 'common',  '{}', NULL, 1,    'Barely legible parchment. Might be useful to scholars.',                                                                                      false, true, 20, 'published'),
  ('tarnished_amulet',   'Tarnished Amulet',   'material', 'sturdy',  '{}', NULL, 1,    'A faded trinket with faint inscriptions.',                                                                                                    false, true, 20, 'published'),
  ('drowned_offering',   'Drowned Offering',   'material', 'refined', '{}', NULL, 2,    'A ritualistic token left at submerged altars.',                                                                                               false, true, 20, 'published'),
  ('tarnished_medallion','Tarnished Medallion', 'material', 'common', '{}', NULL, 0.5,  'An ornate disc of tarnished metal, stamped with a sigil that might once have been a face or a sun or a wheel.',                                false, true, 20, 'published'),
  ('gutterspawn_fang',   'Gutterspawn Fang',   'material', 'scrap',   '{}', NULL, 0.2,  'A hollow, yellowed fang pulled from a gutterspawn maw. The interior canal still glistens with venom.',                                        false, true, 20, 'published'),
  ('charred_street_map', 'Charred Street Map', 'material', 'sturdy',  '{}', NULL, 0.5,  'A fragment of vellum, edges blackened by fire, showing a street grid that matches the ruins around you. Landmarks are annotated in a precise, alien script.', false, false, 1, 'published'),
  ('waterlogged_bone',   'Waterlogged Bone',   'material', 'common',  '{}', NULL, 1,    'A spongy bone that weeps brackish water. Useful for crude crafting.',                                                                        false, true, 20, 'published'),
  ('revenant_essence',   'Revenant Essence',   'material', 'common',  '{}', NULL, 0.5,  'A viscous, faintly glowing substance extracted from a fallen revenant.',                                                                      false, true, 20, 'published'),
  ('rat_tail',           'Rat Tail',           'material', 'scrap',   '{}', NULL, 0.1,  'A greasy, wiry tail snapped from a slum rat. Alchemists pay copper for these.',                                                               false, true, 50, 'published'),
  ('corroded_pipe',      'Corroded Pipe',      'material', 'scrap',   '{}', NULL, 2,    'A length of rusted pipe, encrusted with mineral deposits. Could be smelted down or swung in desperation.',                                     false, true, 20, 'published'),
  ('sewer_moss',         'Sewer Moss',         'material', 'scrap',   '{}', NULL, 0.3,  'A damp clump of bioluminescent moss scraped from sewer walls. Faintly toxic, faintly useful.',                                                false, true, 20, 'published'),

  -- ─── Keys ─────────────────────────────────────────────────────────────────
  ('crypt_key_fragment', 'Crypt Key Fragment', 'key', 'common', '{}', NULL, 1,    'Part of a shattered key. Collect all fragments to unlock deeper crypts.',                                                                           false, false, 1, 'published'),
  ('sanctuary_key',      'Sanctuary Key',      'key', 'common', '{}', NULL, 0.3,  'A heavy iron key, its shaft thick with verdigris but its teeth still sharp. Fits the reinforced door between the Broken Sanctuary and the Sunken Square.', false, false, 1, 'published')

ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- 3. Creature definitions
-- ============================================================================

INSERT INTO creature_definitions (type, name, slug, description, max_hp, attack, defence, armour, agility, min_count, max_count, preferred_rooms, forbidden_rooms, idle_ticks_min, idle_ticks_max, flee_threshold, loot_table, status)
VALUES
  ('drowned_revenant', 'Drowned Revenant', 'drowned_revenant', '', 50, 10, 3, 3, 0, 3, 5, '{corridor,dead_end}', '{entry}', 30, 50, 0.25,
   '[{"itemId":"waterlogged_bone","dropWeight":1},{"itemId":"revenant_essence","dropWeight":1}]'::jsonb, 'published'),

  ('gutterspawn', 'Gutterspawn', 'gutterspawn', '', 15, 5, 1, 0, 7, 2, 4, '{corridor,dead_end}', '{entry,boss}', 30, 60, 0.3,
   '[{"itemId":"gutterspawn_fang","dropWeight":80},{"itemId":"bent_rebar","dropWeight":15}]'::jsonb, 'published'),

  ('rubble_scavenger', 'Rubble Scavenger', 'rubble_scavenger', '', 35, 8, 3, 2, 4, 1, 3, '{junction,dead_end}', '{entry,boss}', 40, 80, 0.15,
   '[{"itemId":"bent_rebar","dropWeight":50},{"itemId":"tarnished_medallion","dropWeight":25},{"itemId":"scavenger_shiv","dropWeight":15}]'::jsonb, 'published'),

  ('hollow_stalker', 'Hollow Stalker', 'hollow_stalker', '', 60, 13, 5, 4, 6, 1, 2, '{junction}', '{entry,corridor}', 50, 120, 0.15,
   '[{"itemId":"tarnished_medallion","dropWeight":40},{"itemId":"sanctuary_key","dropWeight":15},{"itemId":"scavenger_shiv","dropWeight":20}]'::jsonb, 'published'),

  ('the_collapsed_one', 'The Collapsed One', 'the_collapsed_one', '', 150, 18, 8, 10, 1, 1, 1, '{boss}', '{entry,corridor,junction,dead_end}', 80, 150, 0,
   '[{"itemId":"rubble_crusted_vest","dropWeight":30},{"itemId":"scavenger_shiv","dropWeight":25},{"itemId":"charred_street_map","dropWeight":20},{"itemId":"tarnished_medallion","dropWeight":25}]'::jsonb, 'published'),

  ('slum_rat', 'Slum Rat', 'slum_rat',
   'A bloated rat the size of a terrier, its fur matted with filth and its eyes bright with cunning malice. Individually a nuisance; in packs, a genuine threat to the wounded.',
   8, 3, 0, 0, 6, 2, 5, '{corridor,dead_end}', '{boss}', 20, 40, 0.5,
   '[{"itemId":"rat_tail","dropWeight":60}]'::jsonb, 'published'),

  ('sewer_lurker', 'Sewer Lurker', 'sewer_lurker',
   'A long-limbed thing that clings to sewer ceilings, its pale skin slick with condensation. It drops silently onto prey, striking fast before retreating into the pipes.',
   25, 7, 2, 0, 5, 1, 2, '{corridor,dead_end,junction}', '{entry,boss}', 40, 80, 0.3,
   '[{"itemId":"corroded_pipe","dropWeight":40},{"itemId":"sewer_moss","dropWeight":30}]'::jsonb, 'published')

ON CONFLICT (type) DO NOTHING;
