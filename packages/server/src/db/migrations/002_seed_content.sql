-- 002_seed_content.sql — Consolidated seed data (factions, items, creatures).

-- ============================================================================
-- 1. Factions (final names/descriptions from migration 017)
-- ============================================================================

INSERT INTO factions (id, name, slug, philosophy, specialty, description, milestones, events) VALUES
  (gen_random_uuid(), 'The Kindari', 'kindari', 'Pragmatic survivalists. Gear and craftsmanship above all.', 'Best crafting recipes, armour bonuses, durability perks.', 'Craft, preservation, and restoration. The Kindari believe the old world''s technology — properly understood and repaired — is the key to reclaiming the future. They scavenge drone components, restore mechanical systems, and venerate the pickling urns that saved humanity. Above all, they revere Saitcho Kindar — the anonymous inventor of the brine whose legacy preserved them all.', '[]', '[]'),
  (gen_random_uuid(), 'The Bloom Tenders', 'bloom-tenders', 'Knowledge-seekers. Map the zones, understand the collapse.', 'Awareness bonuses, extended expedition timers, anomaly detection.', 'Knowledge, adaptation, and navigation. The Bloom Tenders believe survival depends on understanding the new world — its ecology, its mutant wildlife, its chemical signals. They study the mutant algae that woke the urns, cultivating samples and tracking its spread across the Gulf. They believe the bloom carries meaning, patterns, perhaps even intent.', '[]', '[]'),
  (gen_random_uuid(), 'Krewe Calliope', 'krewe-calliope', 'Risk-takers and profiteers. High risk, high reward.', 'Better loot rolls, PvP stealth bonuses, black-market access.', 'Ritual, spectacle, and cultural preservation. Krewe Calliope emerged from the corrupted remnants of New Orleans Mardi Gras krewe culture. They preserve what it means to be human through ritual, music, art, and spectacle. They are part carnival troupe, part secret society, part death cult. They offer hope and meaning, but the price is participation in rituals that blur celebration and sacrifice.', '[]', '[]');

-- ============================================================================
-- 2. Item definitions (44 items — 27 from 002 + 17 from 004, rethemed by 020)
-- ============================================================================

INSERT INTO item_definitions (id, name, type, tier, base_stats, base_durability, weight, description, soulbound, stackable, max_stack, status) VALUES

  -- ─── Weapons ──────────────────────────────────────────────────────────────
  ('rusty_blade',       'Rusty Blade',        'weapon', 'scrap',     '{"damage":8,"speed":1}',            30,  5,    'A corroded shortsword. It cuts, barely.',                                                                                                false, false, 1, 'published'),
  ('iron_sword',        'Rebar Machete',      'weapon', 'common',    '{"damage":12,"speed":1}',           50,  6,    'A length of construction rebar, one end wrapped in electrical tape for grip, the other hammered flat and ground to a crude edge. Ugly, heavy, effective.', false, false, 1, 'published'),
  ('corroded_halberd',  'Corroded Fire Axe',  'weapon', 'sturdy',    '{"damage":18,"speed":2}',           60,  12,   'A pre-extinction fire axe, its red paint long gone, its handle wrapped in waterlogged leather. The blade is pitted with rust but the weight behind it is still lethal. Someone etched tally marks into the haft.', false, false, 1, 'published'),
  ('shardsteel_sabre',  'Honed Drone Blade',  'weapon', 'refined',   '{"damage":16,"speed":1}',           80,  5,    'A long, single-edged blade cut from a military drone''s wing strut. The alloy is lighter and harder than anything the Kindari can reproduce — pre-extinction engineering at its finest. The edge holds indefinitely.', false, false, 1, 'published'),
  ('voidforged_blade',  'Drone-Core Blade',   'weapon', 'anomalous', '{"damage":20,"speed":1}',          120,  4,    'A blade forged from the alloy core of a military drone''s reactor housing. The metal has an unsettling blue-black sheen and is impossibly light for its hardness. The Kindari say the alloy composition doesn''t match anything in pre-extinction metallurgy databases. It hums faintly when swung.', false, false, 1, 'published'),
  ('bent_rebar',        'Bent Rebar',         'weapon', 'scrap',     '{"damage":4,"speed":0.8}',          20,  3,    'A corroded length of rebar, wrenched from a collapsed wall. One end is bent into a rough hook. Heavy, slow, and ugly — but better than bare hands.', false, false, 1, 'published'),
  ('scavenger_shiv',    'Scavenger''s Shiv',  'weapon', 'common',    '{"damage":7,"speed":1.2}',          30,  2,    'A sliver of plate glass, its base wrapped in copper wire for a grip. The edge is wickedly sharp but fragile.',                             false, false, 1, 'published'),
  ('dockworker_hook',   'Dockworker''s Hook', 'weapon', 'common',    '{"damage":9,"speed":1.1}',          40,  4,    'A curved iron hook mounted on a wooden handle, used to haul cargo. Just as effective at hauling flesh.',                                   false, false, 1, 'published'),
  ('smugglers_dagger',  'Smuggler''s Dagger', 'weapon', 'common',    '{"damage":11,"speed":1.3}',         45,  2,    'A slender blade with a blackened finish to prevent glinting in torchlight. Balanced for throwing.',                                        false, false, 1, 'published'),
  ('fish_knife',        'Fish Knife',         'weapon', 'scrap',     '{"damage":5,"speed":1.4}',          20,  1,    'A thin-bladed filleting knife, its edge still keen despite years of salt exposure.',                                                       false, false, 1, 'published'),

  -- ─── Armour ───────────────────────────────────────────────────────────────
  ('tattered_leather',    'Tattered Leather',    'armour', 'scrap',   '{"armour":3,"weight":8}',           25,  8,    'Barely held together with sinew and hope.',                                                                                              false, false, 1, 'published'),
  ('iron_chainmail',      'Scrap-Weave Vest',    'armour', 'common',  '{"armour":6,"weight":15}',          50,  15,   'A vest stitched together from overlapping strips of salvaged sheet metal, wired with drone cabling. It rattles when you move and chafes like hell, but it''ll stop a claw or a tusk.', false, false, 1, 'published'),
  ('corroded_shield',     'Corroded Shield',     'armour', 'scrap',   '{"armour":4,"weight":10}',          20,  10,   'A round shield covered in barnacles and rust.',                                                                                         false, false, 1, 'published'),
  ('reinforced_plate',    'Reinforced Plate',    'armour', 'sturdy',  '{"armour":10,"weight":25}',         70,  25,   'Thick plating bolted over hardened leather.',                                                                                            false, false, 1, 'published'),
  ('rubble_crusted_vest', 'Rubble-Crusted Vest', 'armour', 'common',  '{"armour":3,"weight":5}',           40,  5,    'A padded leather vest with chunks of masonry and tile lashed to its surface. Improvised but effective.',                                  false, false, 1, 'published'),
  ('leather_jerkin',      'Leather Jerkin',      'armour', 'common',  '{"armour":4,"weight":6}',           45,  6,    'Stiff boiled leather, cut for mobility. Standard dock worker protection.',                                                               false, false, 1, 'published'),
  ('smugglers_cloak',     'Smuggler''s Cloak',   'armour', 'common',  '{"armour":2,"weight":3}',           35,  3,    'A dark hooded cloak with hidden pockets sewn into the lining.',                                                                          false, false, 1, 'published'),
  ('plague_mask',         'Plague Mask',         'armour', 'sturdy',  '{"armour":1,"weight":2}',           50,  2,    'A beaked mask stuffed with dried herbs. Reduces the effect of toxic fumes.',                                                             false, false, 1, 'published'),

  -- ─── Consumables ──────────────────────────────────────────────────────────
  ('waterlogged_potion', 'Waterlogged Potion', 'consumable', 'scrap',  '{"heal":20}',                    NULL, 1,    'Murky liquid in a cracked flask. Probably drinkable.',                                                                                   false, true,  5, 'published'),
  ('healing_draught',    'Algae Salve',        'consumable', 'common', '{"heal":40}',                    NULL, 1,    'A thick, green paste sealed in a scavenged jar. Brewed from cultivated bloom algae by the Bloom Tenders, it promotes rapid cell regeneration when applied to wounds. Tastes vile. Works fast.', false, true,  5, 'published'),
  ('stamina_tonic',      'Stamina Tonic',      'consumable', 'common', '{"staminaRestore":30,"duration":5}', NULL, 1, 'A bitter brew that quickens the limbs.',                                                                                                 false, true,  5, 'published'),
  ('sewer_lamp',         'Sewer Lamp',         'consumable', 'common', '{"duration":10}',                NULL, 2,    'A shuttered brass lantern filled with rendered fat. Burns with a smoky, orange flame.',                                                  false, false, 1, 'published'),

  -- ─── Materials ────────────────────────────────────────────────────────────
  ('revenant_bone',      'Revenant Bone',           'material', 'common',  '{}', NULL, 2,    'A bleached bone from a dungeon creature. Crafting material.',                                                                                    false, true, 20, 'published'),
  ('shardsteel_shard',   'Drone Alloy Shard',       'material', 'sturdy',  '{}', NULL, 3,    'A jagged fragment of the unknown alloy found in military drone structural components. Too small to forge alone, but the Kindari pay well for these — they''re trying to reverse-engineer the composition.', false, true, 20, 'published'),
  ('sodden_scroll',      'Sodden Scroll',           'material', 'common',  '{}', NULL, 1,    'Barely legible parchment. Might be useful to scholars.',                                                                                      false, true, 20, 'published'),
  ('tarnished_amulet',   'Tarnished Amulet',        'material', 'sturdy',  '{}', NULL, 1,    'A faded trinket with faint inscriptions.',                                                                                                    false, true, 20, 'published'),
  ('drowned_offering',   'Drowned Offering',         'material', 'refined', '{}', NULL, 2,    'A ritualistic token left at submerged altars.',                                                                                               false, true, 20, 'published'),
  ('tarnished_medallion','Tarnished Medallion',      'material', 'common',  '{}', NULL, 0.5,  'An ornate disc of tarnished metal, stamped with a sigil that might once have been a face or a sun or a wheel.',                                false, true, 20, 'published'),
  ('gutterspawn_fang',   'Gutterspawn Fang',         'material', 'scrap',   '{}', NULL, 0.2,  'A hollow, yellowed fang pulled from a gutterspawn maw. The interior canal still glistens with venom.',                                        false, true, 20, 'published'),
  ('charred_street_map', 'Charred Street Map',       'material', 'sturdy',  '{}', NULL, 0.5,  'A fragment of vellum, edges blackened by fire, showing a street grid that matches the ruins around you. Landmarks are annotated in a precise, alien script.', false, false, 1, 'published'),
  ('waterlogged_bone',   'Waterlogged Bone',         'material', 'common',  '{}', NULL, 1,    'A spongy bone that weeps brackish water. Useful for crude crafting.',                                                                        false, true, 20, 'published'),
  ('revenant_essence',   'Revenant Essence',         'material', 'common',  '{}', NULL, 0.5,  'A viscous, faintly glowing substance extracted from a fallen revenant.',                                                                      false, true, 20, 'published'),
  ('rat_tail',           'Rat Tail',                 'material', 'scrap',   '{}', NULL, 0.1,  'A greasy, wiry tail snapped from a mutant rat. The Bloom Tenders buy these for biological study — they''re tracking mutation rates in the local population.', false, true, 50, 'published'),
  ('corroded_pipe',      'Corroded Pipe',            'material', 'scrap',   '{}', NULL, 2,    'A length of rusted pipe, encrusted with mineral deposits. Could be smelted down or swung in desperation.',                                     false, true, 20, 'published'),
  ('sewer_moss',         'Sewer Moss',               'material', 'scrap',   '{}', NULL, 0.3,  'A damp clump of bioluminescent moss scraped from sewer walls. Faintly toxic, faintly useful.',                                                false, true, 20, 'published'),
  ('city_map',           'Salvaged City Map',        'material', 'common',  '{}', NULL, 0.5,  'A laminated pre-extinction street map of New Orleans, water-stained and brittle. Half the streets are flooded or collapsed now, but the bones of the grid are still recognizable. Someone has scratched new annotations in charcoal — safe routes, danger zones, water sources.', false, false, 1, 'published'),
  ('silk_scarf',         'Bloom-Stained Cloth',      'material', 'common',  '{}', NULL, 0.3,  'A strip of woven fabric discolored by exposure to the mutant algae bloom — faintly luminescent green in low light. Krewe Calliope uses these in their rituals. Worth a few sips to the right buyer.', false, true, 10, 'published'),
  ('brass_compass',      'Brass Compass',            'material', 'sturdy',  '{}', NULL, 0.5,  'A navigational compass with a cracked glass face. The needle still trembles toward north.',                                                   false, false, 1, 'published'),
  ('harbor_manifest',    'Harbor Manifest',           'material', 'common',  '{}', NULL, 0.3,  'A water-stained shipping manifest listing cargo, destinations, and — interestingly — undeclared goods.',                                      false, true, 10, 'published'),
  ('alley_thugs_coin',   'Scavenged Circuit Board',  'material', 'scrap',   '{}', NULL, 0.1,  'A cracked circuit board stripped from a pre-extinction drone, its copper traces still faintly visible under corrosion. The Bone-Tithes hoard these obsessively. Traders accept them as scrap value — a fraction of a draw.', false, true, 50, 'published'),
  ('dock_rope',          'Dock Rope',                'material', 'scrap',   '{}', NULL, 1.5,  'A length of tarred hemp rope, frayed but still strong. Useful for binding or climbing.',                                                      false, true, 10, 'published'),
  ('noble_signet_ring',  'Pre-Extinction Signet Ring','material', 'refined', '{}', NULL, 0.2,  'A tarnished ring bearing an engraved family crest — unrecognizable now, from a bloodline that ended a thousand years ago. The metalwork is fine enough to suggest wealth. The Kindari would pay to study the alloy.', false, false, 1, 'published'),
  ('silt_venom_sac',     'Silt Venom Sac',           'material', 'common',  '{}', NULL, 0.3,  'A translucent sac of pale green venom, extracted from a silt serpent. Alchemists value it highly.',                                           false, true, 20, 'published'),
  ('serpent_scale',      'Serpent Scale',             'material', 'common',  '{}', NULL, 0.2,  'An iridescent scale shed by a silt serpent. Hard as iron and surprisingly flexible.',                                                        false, true, 20, 'published'),

  -- ─── Keys ─────────────────────────────────────────────────────────────────
  ('crypt_key_fragment', 'Crypt Key Fragment',       'key', 'common', '{}', NULL, 1,    'Part of a shattered key. Collect all fragments to unlock deeper crypts.',                                                                           false, false, 1, 'published'),
  ('sanctuary_key',      'Sanctuary Key',            'key', 'common', '{}', NULL, 0.3,  'A heavy iron key, its shaft thick with verdigris but its teeth still sharp. Fits the reinforced door between the Broken Sanctuary and the Sunken Square.', false, false, 1, 'published'),
  ('harbourmaster_key',  'Harbourmaster''s Key',     'key', 'common', '{}', NULL, 0.3,  'A heavy brass key on a corroded chain. Opens the harbourmaster''s locked stores.',                                                                  false, false, 1, 'published')

ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- 3. Creature definitions (15 creatures — 7 from 002 + 8 from 004)
--    Final values: names/descriptions from 020, room_descriptions from 020/009,
--    idle_ticks 10x from 010, aggressive flags from 008.
-- ============================================================================

INSERT INTO creature_definitions (type, name, slug, description, max_hp, attack, defence, armour, agility, min_count, max_count, preferred_rooms, forbidden_rooms, idle_ticks_min, idle_ticks_max, flee_threshold, loot_table, aggressive, room_description, status)
VALUES
  -- ─── From 002 (original zone creatures) ───────────────────────────────────
  ('drowned_revenant', 'Drowned Revenant', 'drowned_revenant', '',
   50, 10, 3, 3, 0, 3, 5, '{corridor,dead_end}', '{entry}', 300, 500, 0.25,
   '[{"itemId":"waterlogged_bone","dropWeight":1},{"itemId":"revenant_essence","dropWeight":1}]'::jsonb,
   true, 'A drowned revenant sways in the murk, waterlogged limbs dragging.', 'published'),

  ('gutterspawn', 'Gutterspawn', 'gutterspawn', '',
   15, 5, 1, 0, 7, 2, 4, '{corridor,dead_end}', '{entry,boss}', 300, 600, 0.3,
   '[{"itemId":"gutterspawn_fang","dropWeight":80},{"itemId":"bent_rebar","dropWeight":15}]'::jsonb,
   true, 'A gutterspawn crouches in the filth, eyes glinting.', 'published'),

  ('rubble_scavenger', 'Rubble Scavenger', 'rubble_scavenger', '',
   35, 8, 3, 2, 4, 1, 3, '{junction,dead_end}', '{entry,boss}', 400, 800, 0.15,
   '[{"itemId":"bent_rebar","dropWeight":50},{"itemId":"tarnished_medallion","dropWeight":25},{"itemId":"scavenger_shiv","dropWeight":15}]'::jsonb,
   true, 'A rubble scavenger picks through debris with twitching claws.', 'published'),

  ('hollow_stalker', 'Hollow Stalker', 'hollow_stalker', '',
   60, 13, 5, 4, 6, 1, 2, '{junction}', '{entry,corridor}', 500, 1200, 0.15,
   '[{"itemId":"tarnished_medallion","dropWeight":40},{"itemId":"sanctuary_key","dropWeight":15},{"itemId":"scavenger_shiv","dropWeight":20}]'::jsonb,
   true, 'A hollow stalker drifts in the shadows, barely visible.', 'published'),

  ('the_collapsed_one', 'The Collapsed One', 'the_collapsed_one', '',
   150, 18, 8, 10, 1, 1, 1, '{boss}', '{entry,corridor,junction,dead_end}', 800, 1500, 0,
   '[{"itemId":"rubble_crusted_vest","dropWeight":30},{"itemId":"scavenger_shiv","dropWeight":25},{"itemId":"charred_street_map","dropWeight":20},{"itemId":"tarnished_medallion","dropWeight":25}]'::jsonb,
   true, 'The Collapsed One looms here, stone and flesh fused into one.', 'published'),

  ('slum_rat', 'Slum Rat', 'slum_rat',
   'A bloated rat the size of a terrier, its fur matted with filth and its eyes bright with cunning malice. Individually a nuisance; in packs, a genuine threat to the wounded.',
   8, 3, 0, 0, 6, 2, 5, '{corridor,dead_end}', '{boss}', 200, 400, 0.5,
   '[{"itemId":"rat_tail","dropWeight":60}]'::jsonb,
   true, 'A slum rat sniffs along the ground.', 'published'),

  ('sewer_lurker', 'Sewer Lurker', 'sewer_lurker',
   'A long-limbed thing that clings to sewer ceilings, its pale skin slick with condensation. It drops silently onto prey, striking fast before retreating into the pipes.',
   25, 7, 2, 0, 5, 1, 2, '{corridor,dead_end,junction}', '{entry,boss}', 400, 800, 0.3,
   '[{"itemId":"corroded_pipe","dropWeight":40},{"itemId":"sewer_moss","dropWeight":30}]'::jsonb,
   true, 'A sewer lurker clings to the damp wall.', 'published'),

  -- ─── From 004 (Siltgate creatures, rethemed by 020) ──────────────────────
  ('city_dog', 'Silt Roach', 'city_dog',
   'A plate-sized cockroach with a rust-brown carapace, skittering between piles of debris. Its antennae twitch constantly, sensing vibration. Mostly scavenges the dead, but will swarm the living if disturbed.',
   12, 4, 1, 0, 5, 1, 2, '{corridor,junction}', '{boss}', 300, 600, 0.4,
   '[{"itemId":"rat_tail","dropWeight":30}]'::jsonb,
   false, 'A giant roach picks through debris, its antennae twitching.', 'published'),

  ('pigeon_flock', 'Mosquito Swarm', 'pigeon_flock',
   'A thick, droning cloud of mosquitoes, each one grotesquely swollen — the size of a man''s thumb. They move as one, drawn to body heat and the carbon dioxide of breathing. The sound alone makes your skin crawl.',
   5, 1, 0, 0, 8, 1, 1, '{corridor,junction,entry}', '{boss,dead_end}', 200, 400, 0.8,
   '[]'::jsonb,
   false, 'A cloud of bloated mosquitoes drifts through the air, droning.', 'published'),

  ('feral_dog', 'Feral Hog', 'feral_dog',
   'A bristle-backed hog with yellowed tusks and mean, piggy eyes. Centuries of unchecked breeding have made them massive — this one is the size of a small car. Its hide is scarred from territorial fights and its breath reeks of carrion.',
   20, 7, 2, 1, 5, 1, 2, '{corridor,dead_end}', '{boss,entry}', 300, 600, 0.3,
   '[{"itemId":"rat_tail","dropWeight":20},{"itemId":"waterlogged_bone","dropWeight":30}]'::jsonb,
   true, 'A feral hog roots through rubble, tusks gleaming.', 'published'),

  ('alley_thug', 'Render-Kin Stalker', 'alley_thug',
   'A lean, scarred figure that moves with predatory grace — almost human, but wrong. Its arms are too long, its fingers tipped with thick yellow nails like claws, and its jaw juts forward over a lipless mouth. It watches you with eyes set too far apart. Something like intelligence burns behind them.',
   30, 9, 3, 2, 4, 1, 2, '{corridor,junction,dead_end}', '{entry,boss}', 400, 800, 0.2,
   '[{"itemId":"alley_thugs_coin","dropWeight":60},{"itemId":"smugglers_dagger","dropWeight":15},{"itemId":"leather_jerkin","dropWeight":10}]'::jsonb,
   true, 'A clawed mutant crouches in the shadows, watching.', 'published'),

  ('dockside_smuggler', 'Bone-Tithe Hoarder', 'dockside_smuggler',
   'A gaunt, skeletal figure with elongated fingers and sunken eyes, its waxy skin stretched tight over bone. Scavenged drone optics hang from its neck like amulets. It clutches a bundle of salvage to its chest and hisses at your approach — the sound of something that would kill before it shares.',
   40, 11, 4, 3, 6, 1, 2, '{dead_end,corridor}', '{entry,boss}', 500, 1000, 0.2,
   '[{"itemId":"smugglers_dagger","dropWeight":30},{"itemId":"smugglers_cloak","dropWeight":20},{"itemId":"alley_thugs_coin","dropWeight":40}]'::jsonb,
   true, 'A gaunt mutant crouches over a pile of salvage, hissing.', 'published'),

  ('silt_serpent', 'Silt Serpent', 'silt_serpent',
   'A thick-bodied serpent adapted to the flooded sewers. Its scales shimmer with an oily iridescence and its bite delivers a numbing venom.',
   35, 10, 3, 2, 7, 1, 2, '{corridor,dead_end}', '{entry,boss}', 400, 800, 0.25,
   '[{"itemId":"silt_venom_sac","dropWeight":50},{"itemId":"serpent_scale","dropWeight":40}]'::jsonb,
   true, 'A silt serpent coils in the shallow water, barely disturbing the surface.', 'published'),

  ('plague_bearer', 'Fester-Thrall', 'plague_bearer',
   'A shambling, asymmetrical shape wrapped in its own weeping sores. Tumorous growths bulge from its shoulders and neck. You can see the ghost of a human skeleton under the distortions — a spine that curves wrong, fingers fused into paddles, a face that looks half-melted. The air around it shimmers with a sweet, chemical reek. Where it walks, the algae blooms thicker.',
   80, 14, 5, 4, 2, 1, 1, '{dead_end,boss}', '{entry,corridor}', 600, 1200, 0.1,
   '[{"itemId":"plague_mask","dropWeight":25},{"itemId":"silt_venom_sac","dropWeight":30},{"itemId":"sewer_moss","dropWeight":40}]'::jsonb,
   true, 'A misshapen mutant shambles past, trailing the stench of rot and chemicals.', 'published'),

  ('the_harbourmaster', 'The Graftlord', 'the_harbourmaster',
   'A massive, bloated figure draped in corroded scrap metal and rusted chain, sitting on a throne of overturned desks and barnacle-crusted anchors. Vestigial limbs twitch from its back. A tarnished port authority badge is pinned to what might once have been a uniform, now fused to its mottled gray-green skin. It does not speak. It does not need to. Everything in this ruin belongs to it.',
   120, 16, 7, 8, 3, 1, 1, '{boss}', '{entry,corridor,dead_end,junction}', 800, 1500, 0,
   '[{"itemId":"harbourmaster_key","dropWeight":100},{"itemId":"dockworker_hook","dropWeight":40},{"itemId":"brass_compass","dropWeight":30},{"itemId":"harbor_manifest","dropWeight":50}]'::jsonb,
   true, 'The Graftlord looms on its throne of rust and rubble, watching.', 'published')

ON CONFLICT (type) DO NOTHING;
