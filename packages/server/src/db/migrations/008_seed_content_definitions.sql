-- Seed content definitions from existing static registries.
-- Items (18), creatures (1), biomes (5), modifiers (5), factions (3).
-- Skills, loot-tables, rooms, narrative start empty.

-- ─── Items ───────────────────────────────────────────────────────────────────

INSERT INTO content_definitions (id, entity_type, data) VALUES
  ('rusty_blade', 'items', '{"id":"rusty_blade","name":"Rusty Blade","type":"weapon","tier":"scrap","baseStats":{"damage":8,"speed":1},"baseDurability":30,"weight":5,"description":"A corroded shortsword. It cuts, barely.","soulbound":false}'),
  ('iron_sword', 'items', '{"id":"iron_sword","name":"Iron Sword","type":"weapon","tier":"common","baseStats":{"damage":12,"speed":1},"baseDurability":50,"weight":6,"description":"A serviceable blade of hammered iron.","soulbound":false}'),
  ('corroded_halberd', 'items', '{"id":"corroded_halberd","name":"Corroded Halberd","type":"weapon","tier":"sturdy","baseStats":{"damage":18,"speed":2},"baseDurability":60,"weight":12,"description":"A polearm eaten by salt water, still dangerous.","soulbound":false}'),
  ('shardsteel_sabre', 'items', '{"id":"shardsteel_sabre","name":"Shardsteel Sabre","type":"weapon","tier":"refined","baseStats":{"damage":16,"speed":1},"baseDurability":80,"weight":5,"description":"Forged from metal recovered deep within the shards.","soulbound":false}'),
  ('voidforged_blade', 'items', '{"id":"voidforged_blade","name":"Voidforged Blade","type":"weapon","tier":"anomalous","baseStats":{"damage":20,"speed":1},"baseDurability":120,"weight":4,"description":"A blade that shimmers between planes. Disturbingly light.","soulbound":false}'),
  ('tattered_leather', 'items', '{"id":"tattered_leather","name":"Tattered Leather","type":"armour","tier":"scrap","baseStats":{"armour":3,"weight":8},"baseDurability":25,"weight":8,"description":"Barely held together with sinew and hope.","soulbound":false}'),
  ('iron_chainmail', 'items', '{"id":"iron_chainmail","name":"Iron Chainmail","type":"armour","tier":"common","baseStats":{"armour":6,"weight":15},"baseDurability":50,"weight":15,"description":"Standard-issue chain links. Heavy but reliable.","soulbound":false}'),
  ('corroded_shield', 'items', '{"id":"corroded_shield","name":"Corroded Shield","type":"armour","tier":"scrap","baseStats":{"armour":4,"weight":10},"baseDurability":20,"weight":10,"description":"A round shield covered in barnacles and rust.","soulbound":false}'),
  ('reinforced_plate', 'items', '{"id":"reinforced_plate","name":"Reinforced Plate","type":"armour","tier":"sturdy","baseStats":{"armour":10,"weight":25},"baseDurability":70,"weight":25,"description":"Thick plating bolted over hardened leather.","soulbound":false}'),
  ('waterlogged_potion', 'items', '{"id":"waterlogged_potion","name":"Waterlogged Potion","type":"consumable","tier":"scrap","baseStats":{"heal":20},"baseDurability":null,"weight":1,"description":"Murky liquid in a cracked flask. Probably drinkable.","soulbound":false}'),
  ('healing_draught', 'items', '{"id":"healing_draught","name":"Healing Draught","type":"consumable","tier":"common","baseStats":{"heal":40},"baseDurability":null,"weight":1,"description":"A reliable potion brewed in the Refuge.","soulbound":false}'),
  ('stamina_tonic', 'items', '{"id":"stamina_tonic","name":"Stamina Tonic","type":"consumable","tier":"common","baseStats":{"staminaRestore":30,"duration":5},"baseDurability":null,"weight":1,"description":"A bitter brew that quickens the limbs.","soulbound":false}'),
  ('revenant_bone', 'items', '{"id":"revenant_bone","name":"Revenant Bone","type":"material","tier":"common","baseStats":{},"baseDurability":null,"weight":2,"description":"A bleached bone from a shard creature. Crafting material.","soulbound":false}'),
  ('shardsteel_shard', 'items', '{"id":"shardsteel_shard","name":"Shardsteel Shard","type":"material","tier":"sturdy","baseStats":{},"baseDurability":null,"weight":3,"description":"A fragment of metal infused with shard energy.","soulbound":false}'),
  ('sodden_scroll', 'items', '{"id":"sodden_scroll","name":"Sodden Scroll","type":"material","tier":"common","baseStats":{},"baseDurability":null,"weight":1,"description":"Barely legible parchment. Might be useful to scholars.","soulbound":false}'),
  ('tarnished_amulet', 'items', '{"id":"tarnished_amulet","name":"Tarnished Amulet","type":"material","tier":"sturdy","baseStats":{},"baseDurability":null,"weight":1,"description":"A faded trinket with faint inscriptions.","soulbound":false}'),
  ('drowned_offering', 'items', '{"id":"drowned_offering","name":"Drowned Offering","type":"material","tier":"refined","baseStats":{},"baseDurability":null,"weight":2,"description":"A ritualistic token left at submerged altars.","soulbound":false}'),
  ('crypt_key_fragment', 'items', '{"id":"crypt_key_fragment","name":"Crypt Key Fragment","type":"key","tier":"common","baseStats":{},"baseDurability":null,"weight":1,"description":"Part of a shattered key. Collect all fragments to unlock deeper crypts.","soulbound":false}')
ON CONFLICT (entity_type, id) DO NOTHING;

-- ─── Creatures ───────────────────────────────────────────────────────────────

INSERT INTO content_definitions (id, entity_type, data) VALUES
  ('drowned_revenant', 'creatures', '{"id":"drowned_revenant","type":"drowned_revenant","name":"Drowned Revenant","stats":{"maxHp":50,"attack":10,"defence":3,"armour":3},"lootTable":[{"itemId":"waterlogged_bone","name":"waterlogged bone","weight":1,"description":"A spongy bone that weeps brackish water. Useful for crude crafting.","dropWeight":1},{"itemId":"revenant_essence","name":"revenant essence","weight":0.5,"description":"A viscous, faintly glowing substance extracted from a fallen revenant.","dropWeight":1}],"spawnRules":{"minCount":3,"maxCount":5,"preferredRoomTypes":["corridor","dead_end"],"forbiddenRoomTypes":["entry","extraction"]},"idleTicksMin":3,"idleTicksMax":5,"fleeThreshold":0.25}')
ON CONFLICT (entity_type, id) DO NOTHING;

-- ─── Biomes ──────────────────────────────────────────────────────────────────

INSERT INTO content_definitions (id, entity_type, data) VALUES
  ('flooded_crypt', 'biomes', '{"id":"flooded_crypt","name":"Flooded Crypt","description":"Waterlogged corridors and sunken chambers. Home to drowned revenants.","tier":1,"features":["water","darkness","narrow_passages"],"hazardTypes":["flooding","collapse"],"roomProperties":["water","heavy_door"],"narrationHints":["dripping water","distant moaning","salt-crusted walls"]}'),
  ('shattered_bastion', 'biomes', '{"id":"shattered_bastion","name":"Shattered Bastion","description":"Crumbling fortifications and war-scarred halls.","tier":1,"features":["rubble","open_spaces","defensive_positions"],"hazardTypes":["collapse","trap"],"roomProperties":["heavy_door","cavern"],"narrationHints":["grinding stone","echoing footsteps","ancient banners"]}'),
  ('fungal_deep', 'biomes', '{"id":"fungal_deep","name":"Fungal Deep","description":"Bioluminescent caverns choked with alien growth.","tier":2,"features":["bioluminescence","spore_clouds","organic_walls"],"hazardTypes":["poison","spore_burst"],"roomProperties":["cavern"],"narrationHints":["pulsing light","acrid spores","squelching underfoot"]}'),
  ('ashen_reach', 'biomes', '{"id":"ashen_reach","name":"Ashen Reach","description":"Scorched wastes where fire still smoulders beneath.","tier":2,"features":["heat","ash_clouds","lava_vents"],"hazardTypes":["fire","heat_exhaustion"],"roomProperties":["cavern"],"narrationHints":["crackling embers","choking ash","waves of heat"]}'),
  ('void_rift', 'biomes', '{"id":"void_rift","name":"Void Rift","description":"Reality fractures where the shard bleeds into nothing.","tier":3,"features":["gravity_anomalies","void_tears","unstable_geometry"],"hazardTypes":["void_damage","reality_shift"],"roomProperties":["cavern"],"narrationHints":["spatial distortion","silence","flickering existence"]}')
ON CONFLICT (entity_type, id) DO NOTHING;

-- ─── Modifiers ───────────────────────────────────────────────────────────────

INSERT INTO content_definitions (id, entity_type, data) VALUES
  ('darkness', 'modifiers', '{"id":"darkness","name":"Darkness","description":"Reduced visibility. Sound-based detection emphasized.","effects":{"visibility":-50,"soundRange":2},"stackable":false,"tags":["environmental","stealth"]}'),
  ('hunted', 'modifiers', '{"id":"hunted","name":"Hunted","description":"Creatures are aggressive and patrol more frequently.","effects":{"creatureAggro":2,"patrolSpeed":1.5},"stackable":false,"tags":["creature","danger"]}'),
  ('silent', 'modifiers', '{"id":"silent","name":"Silent","description":"Sound propagation severely dampened.","effects":{"soundRange":-3,"stealthBonus":20},"stackable":false,"tags":["environmental","stealth"]}'),
  ('echoing', 'modifiers', '{"id":"echoing","name":"Echoing","description":"Sound carries further. Stealth is harder.","effects":{"soundRange":3,"stealthPenalty":-15},"stackable":false,"tags":["environmental","sound"]}'),
  ('bountiful', 'modifiers', '{"id":"bountiful","name":"Bountiful","description":"Increased loot quality and quantity.","effects":{"lootMultiplier":1.5,"rarityBonus":1},"stackable":false,"tags":["loot","reward"]}')
ON CONFLICT (entity_type, id) DO NOTHING;

-- ─── Factions ────────────────────────────────────────────────────────────────

INSERT INTO content_definitions (id, entity_type, data) VALUES
  ('ironhearth', 'factions', '{"id":"ironhearth","name":"Ironhearth","description":"Builders and defenders. They forge the Refuge''s walls.","milestones":[{"name":"Wall Menders","threshold":100,"description":"Basic fortifications restored."}],"events":[]}'),
  ('veilwalkers', 'factions', '{"id":"veilwalkers","name":"Veilwalkers","description":"Scouts and scholars who chart the shards.","milestones":[{"name":"Pathfinders","threshold":100,"description":"New shard routes mapped."}],"events":[]}'),
  ('ashborn', 'factions', '{"id":"ashborn","name":"Ashborn","description":"Warriors hardened by loss. They push deeper than anyone.","milestones":[{"name":"First Blood","threshold":100,"description":"Veteran status recognized."}],"events":[]}')
ON CONFLICT (entity_type, id) DO NOTHING;
