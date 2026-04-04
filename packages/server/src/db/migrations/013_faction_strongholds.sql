-- 013_faction_strongholds.sql — Faction stronghold hub zones (GDD §2.1).
--
-- Three faction strongholds replace the Refuge as player hubs:
--   The Foundry          (Ironwright Compact)
--   The Cartographium    (Veil Cartographers)
--   The Counting House   (Scarlet Ledger)
--
-- Each stronghold provides 8 feature rooms:
--   commons (entry), stash, armoury, expedition_board, market, training, infirmary, war_room

-- ============================================================================
-- Schema change: add faction_slug column to zones
-- ============================================================================

ALTER TABLE zones ADD COLUMN IF NOT EXISTS faction_slug TEXT;

-- ============================================================================
-- The Foundry — Ironwright Compact stronghold
-- ============================================================================

INSERT INTO zones (id, slug, name, description, level_min, level_max, tier, theme, entry_room_slugs, lifecycle, category, max_players, pvp_enabled, repop_interval_seconds, faction_slug)
VALUES (gen_random_uuid(), 'the-foundry', 'The Foundry',
  'A massive forge-complex carved into a mountainside, its chimneys belching smoke day and night. The Ironwright Compact built this bastion around the Great Anvil — a relic from before the Collapse. Every surface is iron-riveted stone, every corridor echoes with the ring of hammers.',
  1, 100, 1, 'flooded_crypt', '{foundry-commons}', 'persistent', 'faction_hub', 0, false, 0, 'ironwright');

INSERT INTO zone_rooms (id, zone_id, slug, name, description, type, properties, loot_containers, hazards, npcs)
SELECT gen_random_uuid(), z.id, v.slug, v.name, v.description, v.type,
       v.properties::text[], v.loot_containers::jsonb, v.hazards::jsonb, v.npcs::jsonb
FROM zones z, (VALUES
  ('foundry-commons',          'The Great Anvil',         'A cavernous hall dominated by the Great Anvil — a slab of dark metal taller than three men, radiating faint warmth even when no forge is lit. Iron chains hang from the vaulted ceiling, suspending oil lanterns that cast orange light across scarred stone floors. Ironwright crafters and soldiers gather here between expeditions, sharing news and sharpening blades.',                  'entry',                    '{}', '[]', '[]', '[]'),
  ('foundry-stash',            'The Vault',               'A fortified chamber behind a riveted iron door. Heavy chests line the walls, each stamped with an owner''s mark. The air is dry — the Ironwrights engineered ventilation shafts to prevent rust. Your belongings are locked away here, safe from the world outside.',                                                                                                                    'feature_stash',            '{}', '[]', '[]', '[]'),
  ('foundry-armoury',          'The Smithy',              'A working forge where the Compact''s best smiths hammer out weapons and armour. Racks of gear line the walls — swords, shields, breastplates, all bearing the Ironwright stamp. A gruff quartermaster manages loadouts with ruthless efficiency.',                                                                                                                                       'feature_armoury',          '{}', '[]', '[]', '[]'),
  ('foundry-expedition-board', 'The Commission Wall',     'A soot-blackened wall covered in riveted iron plates, each bearing an engraved expedition notice. Coordinates, threat assessments, and reward tallies are stamped into the metal in the Ironwright fashion — permanent, precise, and unambiguous.',                                                                                                                                      'feature_expedition_board',  '{}', '[]', '[]', '[]'),
  ('foundry-market',           'The Trade Floor',         'A busy exchange hall where salvage changes hands. Ironwright traders deal in raw materials, crafted goods, and hard-won salvage. Scales and measuring tools are bolted to every counter. Nothing here is given freely — everything has a price, calculated to the last ingot.',                                                                                                           'feature_marketplace',      '{}', '[]', '[]', '[]'),
  ('foundry-training',         'The Proving Grounds',     'A reinforced training hall with scarred practice dummies and weapon racks. The floor is pitted from years of sparring. Ironwright veterans run drills here — their philosophy is simple: skill is forged through repetition, like steel.',                                                                                                                                                 'feature_training',         '{}', '[]', '[]', '[]'),
  ('foundry-infirmary',        'The Mending Hall',        'A clean, well-ordered infirmary smelling of poultice and heated iron. The Ironwrights believe in practical medicine — splints, stitches, and cauterization. Wounded fighters rest on iron-framed cots while healers tend to them with brisk efficiency.',                                                                                                                                 'feature_infirmary',        '{}', '[]', '[]', '[]'),
  ('foundry-war-room',         'The Iron Council',        'A sealed chamber behind a heavy door marked with the Ironwright sigil. A massive table dominates the room, its surface inlaid with a metal relief map of known zones. Faction officers meet here to plan operations, assign contracts, and track the Compact''s standing against rival factions.',                                                                                       'feature_war_room',         '{}', '[]', '[]', '[]')
) AS v(slug, name, description, type, properties, loot_containers, hazards, npcs)
WHERE z.slug = 'the-foundry';

INSERT INTO zone_exits (id, zone_id, from_room_slug, direction, to_room_slug, target_zone_slug, target_room_slug, locked, hidden)
SELECT gen_random_uuid(), z.id, v.from_slug, v.direction, v.to_slug,
       NULLIF(v.target_zone, ''), NULLIF(v.target_room, ''),
       v.is_locked, v.is_hidden
FROM zones z, (VALUES
  ('foundry-commons',          'east',  'foundry-stash',            '', '', false, false),
  ('foundry-stash',            'west',  'foundry-commons',          '', '', false, false),
  ('foundry-stash',            'north', 'foundry-armoury',          '', '', false, false),
  ('foundry-armoury',          'south', 'foundry-stash',            '', '', false, false),
  ('foundry-commons',          'west',  'foundry-expedition-board', '', '', false, false),
  ('foundry-expedition-board', 'east',  'foundry-commons',          '', '', false, false),
  ('foundry-commons',          'north', 'foundry-training',         '', '', false, false),
  ('foundry-training',         'south', 'foundry-commons',          '', '', false, false),
  ('foundry-commons',          'south', 'foundry-market',           '', '', false, false),
  ('foundry-market',           'north', 'foundry-commons',          '', '', false, false),
  ('foundry-market',           'south', 'foundry-infirmary',        '', '', false, false),
  ('foundry-infirmary',        'north', 'foundry-market',           '', '', false, false),
  ('foundry-training',         'east',  'foundry-war-room',         '', '', false, false),
  ('foundry-war-room',         'west',  'foundry-training',         '', '', false, false)
) AS v(from_slug, direction, to_slug, target_zone, target_room, is_locked, is_hidden)
WHERE z.slug = 'the-foundry';


-- ============================================================================
-- The Cartographium — Veil Cartographers stronghold
-- ============================================================================

INSERT INTO zones (id, slug, name, description, level_min, level_max, tier, theme, entry_room_slugs, lifecycle, category, max_players, pvp_enabled, repop_interval_seconds, faction_slug)
VALUES (gen_random_uuid(), 'the-cartographium', 'The Cartographium',
  'A sprawling observatory-library built into the ruins of an ancient tower. Its walls are lined with maps, star charts, and expedition journals. The Veil Cartographers believe that knowledge of the world''s fractures is the only true power — and they hoard it jealously behind these ink-stained walls.',
  1, 100, 1, 'flooded_crypt', '{cartographium-commons}', 'persistent', 'faction_hub', 0, false, 0, 'veil');

INSERT INTO zone_rooms (id, zone_id, slug, name, description, type, properties, loot_containers, hazards, npcs)
SELECT gen_random_uuid(), z.id, v.slug, v.name, v.description, v.type,
       v.properties::text[], v.loot_containers::jsonb, v.hazards::jsonb, v.npcs::jsonb
FROM zones z, (VALUES
  ('cartographium-commons',          'The Hall of Maps',          'A grand rotunda whose walls are covered floor to ceiling with maps — hand-drawn, etched, painted, and pinned in overlapping layers. A great orrery of brass and crystal hangs from the domed ceiling, slowly turning. Veil Cartographers gather here to share discoveries, debate theories, and plan their next ventures into the unknown.',                                  'entry',                    '{}', '[]', '[]', '[]'),
  ('cartographium-stash',            'The Archive Vault',         'A climate-controlled vault behind a sealed door inscribed with protective glyphs. Shelves of treated wood hold expedition packs, preserved specimens, and personal effects. The Cartographers take preservation seriously — nothing rots in the Archive Vault.',                                                                                                                  'feature_stash',            '{}', '[]', '[]', '[]'),
  ('cartographium-armoury',          'The Outfitting Wing',       'A long gallery where exploration gear is catalogued and distributed. Light armour, cartography tools, signal devices, and climbing equipment hang from labelled pegs. A meticulous quartermaster ensures every piece is accounted for.',                                                                                                                                          'feature_armoury',          '{}', '[]', '[]', '[]'),
  ('cartographium-expedition-board', 'The Plotting Table',        'A vast table of polished stone dominates this room, its surface etched with a grid system that the Cartographers use to coordinate expeditions. Pinned notes, sketched maps, and rift coordinates cluster around active zones. This is where ventures are planned and launched.',                                                                                                  'feature_expedition_board',  '{}', '[]', '[]', '[]'),
  ('cartographium-market',           'The Exchange',              'A quiet trading hall where Cartographers barter information as readily as goods. Rare maps, translated texts, and anomaly readings have value here that outsiders wouldn''t understand. A few material traders also operate, though they are secondary to the knowledge brokers.',                                                                                                  'feature_marketplace',      '{}', '[]', '[]', '[]'),
  ('cartographium-training',         'The Observation Deck',      'An open platform at the top of the tower, exposed to wind and sky. Telescopes and sensing instruments point in every direction. Trainees learn to read terrain, identify anomalies, and navigate by stars and rift-light. The view is magnificent — and deeply unsettling.',                                                                                                       'feature_training',         '{}', '[]', '[]', '[]'),
  ('cartographium-infirmary',        'The Restoration Chamber',   'A quiet room of soft light and carefully arranged crystals. The Cartographers'' approach to healing blends practical medicine with their study of ambient energies. Patients rest in alcoves lined with sound-dampening tapestries while healers work in focused silence.',                                                                                                         'feature_infirmary',        '{}', '[]', '[]', '[]'),
  ('cartographium-war-room',         'The Strategium',            'A sealed inner chamber accessible only to ranked Cartographers. Detailed maps of faction territories, resource flows, and rival movements cover every surface. A central table holds a three-dimensional model of the known world — updated daily by scouts returning from the field.',                                                                                            'feature_war_room',         '{}', '[]', '[]', '[]')
) AS v(slug, name, description, type, properties, loot_containers, hazards, npcs)
WHERE z.slug = 'the-cartographium';

INSERT INTO zone_exits (id, zone_id, from_room_slug, direction, to_room_slug, target_zone_slug, target_room_slug, locked, hidden)
SELECT gen_random_uuid(), z.id, v.from_slug, v.direction, v.to_slug,
       NULLIF(v.target_zone, ''), NULLIF(v.target_room, ''),
       v.is_locked, v.is_hidden
FROM zones z, (VALUES
  ('cartographium-commons',          'east',  'cartographium-stash',            '', '', false, false),
  ('cartographium-stash',            'west',  'cartographium-commons',          '', '', false, false),
  ('cartographium-stash',            'north', 'cartographium-armoury',          '', '', false, false),
  ('cartographium-armoury',          'south', 'cartographium-stash',            '', '', false, false),
  ('cartographium-commons',          'west',  'cartographium-expedition-board', '', '', false, false),
  ('cartographium-expedition-board', 'east',  'cartographium-commons',          '', '', false, false),
  ('cartographium-commons',          'north', 'cartographium-training',         '', '', false, false),
  ('cartographium-training',         'south', 'cartographium-commons',          '', '', false, false),
  ('cartographium-commons',          'south', 'cartographium-market',           '', '', false, false),
  ('cartographium-market',           'north', 'cartographium-commons',          '', '', false, false),
  ('cartographium-market',           'south', 'cartographium-infirmary',        '', '', false, false),
  ('cartographium-infirmary',        'north', 'cartographium-market',           '', '', false, false),
  ('cartographium-training',         'east',  'cartographium-war-room',         '', '', false, false),
  ('cartographium-war-room',         'west',  'cartographium-training',         '', '', false, false)
) AS v(from_slug, direction, to_slug, target_zone, target_room, is_locked, is_hidden)
WHERE z.slug = 'the-cartographium';


-- ============================================================================
-- The Counting House — Scarlet Ledger stronghold
-- ============================================================================

INSERT INTO zones (id, slug, name, description, level_min, level_max, tier, theme, entry_room_slugs, lifecycle, category, max_players, pvp_enabled, repop_interval_seconds, faction_slug)
VALUES (gen_random_uuid(), 'the-counting-house', 'The Counting House',
  'A fortified merchant-palace hidden behind an unremarkable facade in the city ruins. Inside, the Scarlet Ledger conducts its business — part trading house, part intelligence bureau, part thieves'' guild. Every surface gleams with dark wood and brass fittings. The air smells of ink, coin, and ambition.',
  1, 100, 1, 'flooded_crypt', '{counting-house-commons}', 'persistent', 'faction_hub', 0, false, 0, 'scarlet');

INSERT INTO zone_rooms (id, zone_id, slug, name, description, type, properties, loot_containers, hazards, npcs)
SELECT gen_random_uuid(), z.id, v.slug, v.name, v.description, v.type,
       v.properties::text[], v.loot_containers::jsonb, v.hazards::jsonb, v.npcs::jsonb
FROM zones z, (VALUES
  ('counting-house-commons',          'The Ledger Hall',         'A grand entrance hall of dark wood panelling and brass fixtures. Ledger books line the walls in locked glass cases. Crystal chandeliers cast warm light over clustered tables where Scarlet Ledger operatives drink, gamble, and broker deals. A massive set of scales sits on a pedestal by the entrance — the faction''s symbol made real.',                                      'entry',                    '{}', '[]', '[]', '[]'),
  ('counting-house-stash',            'The Deep Vault',          'A series of nested vaults behind progressively heavier doors. The innermost chamber is rumoured to be trapped. Your personal lockbox is here — combination-sealed and warded. The Scarlet Ledger protects its members'' assets with the same ferocity it protects its own.',                                                                                                        'feature_stash',            '{}', '[]', '[]', '[]'),
  ('counting-house-armoury',          'The Arsenal',             'A discreet armoury concealed behind a false bookshelf. Inside, weapons and armour are displayed with the care of a collector — daggers, crossbows, poisoned blades, and light armour designed for speed over protection. The Ledger''s philosophy: strike first, strike unseen.',                                                                                                    'feature_armoury',          '{}', '[]', '[]', '[]'),
  ('counting-house-expedition-board', 'The Bounty Board',        'A cork-lined alcove where bounties, contracts, and expedition notices are pinned with brass tacks. Each posting has a value assigned in the Ledger''s own currency. The most lucrative jobs are pinned highest — you need to reach for them.',                                                                                                                                      'feature_expedition_board',  '{}', '[]', '[]', '[]'),
  ('counting-house-market',           'The Black Market',        'A smoky back room where the real business happens. Contraband, rare finds, and items of questionable provenance change hands across felt-lined tables. The Ledger takes a cut of every transaction — that''s the price of operating under their protection.',                                                                                                                       'feature_marketplace',      '{}', '[]', '[]', '[]'),
  ('counting-house-training',         'The Fighting Pit',        'A circular pit sunk into the floor, ringed by viewing galleries. Scarlet Ledger recruits learn combat here — dirty, practical, and ruthless. No rules, no honour, just results. The walls are stained with old blood that no amount of scrubbing has fully removed.',                                                                                                               'feature_training',         '{}', '[]', '[]', '[]'),
  ('counting-house-infirmary',        'The Blood Ward',          'A private medical suite staffed by discreet healers who don''t ask questions. The beds have curtains for privacy — many patients prefer not to be seen here. The Ledger''s surgeons are skilled, efficient, and expensive.',                                                                                                                                                        'feature_infirmary',        '{}', '[]', '[]', '[]'),
  ('counting-house-war-room',         'The Inner Sanctum',       'The most restricted room in the Counting House, accessible only to the Ledger''s inner circle. Intelligence reports, rival faction dossiers, and strategic maps cover the walls. A single candle burns on the central table — tradition holds it has never gone out since the Ledger''s founding.',                                                                                   'feature_war_room',         '{}', '[]', '[]', '[]')
) AS v(slug, name, description, type, properties, loot_containers, hazards, npcs)
WHERE z.slug = 'the-counting-house';

INSERT INTO zone_exits (id, zone_id, from_room_slug, direction, to_room_slug, target_zone_slug, target_room_slug, locked, hidden)
SELECT gen_random_uuid(), z.id, v.from_slug, v.direction, v.to_slug,
       NULLIF(v.target_zone, ''), NULLIF(v.target_room, ''),
       v.is_locked, v.is_hidden
FROM zones z, (VALUES
  ('counting-house-commons',          'east',  'counting-house-stash',            '', '', false, false),
  ('counting-house-stash',            'west',  'counting-house-commons',          '', '', false, false),
  ('counting-house-stash',            'north', 'counting-house-armoury',          '', '', false, false),
  ('counting-house-armoury',          'south', 'counting-house-stash',            '', '', false, false),
  ('counting-house-commons',          'west',  'counting-house-expedition-board', '', '', false, false),
  ('counting-house-expedition-board', 'east',  'counting-house-commons',          '', '', false, false),
  ('counting-house-commons',          'north', 'counting-house-training',         '', '', false, false),
  ('counting-house-training',         'south', 'counting-house-commons',          '', '', false, false),
  ('counting-house-commons',          'south', 'counting-house-market',           '', '', false, false),
  ('counting-house-market',           'north', 'counting-house-commons',          '', '', false, false),
  ('counting-house-market',           'south', 'counting-house-infirmary',        '', '', false, false),
  ('counting-house-infirmary',        'north', 'counting-house-market',           '', '', false, false),
  ('counting-house-training',         'east',  'counting-house-war-room',         '', '', false, false),
  ('counting-house-war-room',         'west',  'counting-house-training',         '', '', false, false)
) AS v(from_slug, direction, to_slug, target_zone, target_room, is_locked, is_hidden)
WHERE z.slug = 'the-counting-house';
