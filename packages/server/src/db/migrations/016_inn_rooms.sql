-- 016_inn_rooms.sql — Inn rooms for faction strongholds and Siltgate (GDD §2.1).
--
-- Adds gold currency column and last-inn respawn tracking to characters.
-- Adds inn rooms (corridor + feature_inn) to each faction stronghold,
-- connected via the training room's free west exit.
-- Converts Siltgate's merchant-inn into an inn with a private upper room.

-- ============================================================================
-- Schema changes: gold + last inn tracking
-- ============================================================================

ALTER TABLE characters ADD COLUMN IF NOT EXISTS gold INTEGER NOT NULL DEFAULT 0;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS last_inn_zone_slug TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS last_inn_room_slug TEXT;

-- ============================================================================
-- The Foundry — Ironwright Arms inn
-- ============================================================================

INSERT INTO zone_rooms (id, zone_id, slug, name, description, type, properties, loot_containers, hazards, npcs)
SELECT gen_random_uuid(), z.id, v.slug, v.name, v.description, v.type,
       v.properties::text[], v.loot_containers::jsonb, v.hazards::jsonb, v.npcs::jsonb
FROM zones z, (VALUES
  ('foundry-inn',       'The Ironwright Arms',                  'A sturdy inn built of riveted iron plates and dark timber. The common room smells of forge-smoke and stew. Iron lanterns hang from chains overhead, casting a warm glow across long benches where travellers rest between expeditions.', 'corridor',     '{}', '[]', '[]', '[]'),
  ('foundry-inn-upper', 'The Ironwright Arms — Private Room',   'A clean room with a writing desk and iron-framed bed. A leather-bound ledger sits open on the nightstand, ready for guests to settle accounts. The walls are riveted plate, muffling the sounds of the forge below.',                  'feature_inn',  '{}', '[]', '[]', '[]')
) AS v(slug, name, description, type, properties, loot_containers, hazards, npcs)
WHERE z.slug = 'the-foundry';

INSERT INTO zone_exits (id, zone_id, from_room_slug, direction, to_room_slug, target_zone_slug, target_room_slug, locked, hidden)
SELECT gen_random_uuid(), z.id, v.from_slug, v.direction, v.to_slug,
       NULLIF(v.target_zone, ''), NULLIF(v.target_room, ''),
       v.is_locked, v.is_hidden
FROM zones z, (VALUES
  ('foundry-training',  'west', 'foundry-inn',       '', '', false, false),
  ('foundry-inn',       'east', 'foundry-training',  '', '', false, false),
  ('foundry-inn',       'up',   'foundry-inn-upper', '', '', false, false),
  ('foundry-inn-upper', 'down', 'foundry-inn',       '', '', false, false)
) AS v(from_slug, direction, to_slug, target_zone, target_room, is_locked, is_hidden)
WHERE z.slug = 'the-foundry';

-- ============================================================================
-- The Cartographium — The Wayfarer's Rest inn
-- ============================================================================

INSERT INTO zone_rooms (id, zone_id, slug, name, description, type, properties, loot_containers, hazards, npcs)
SELECT gen_random_uuid(), z.id, v.slug, v.name, v.description, v.type,
       v.properties::text[], v.loot_containers::jsonb, v.hazards::jsonb, v.npcs::jsonb
FROM zones z, (VALUES
  ('cartographium-inn',       'The Wayfarer''s Rest',                   'A quiet inn tucked beneath the observatory tower. Star charts and expedition maps paper the walls between bookshelves. The air smells of old paper and spiced tea. A brass telescope by the window offers a view of the rift-scarred horizon.',  'corridor',     '{}', '[]', '[]', '[]'),
  ('cartographium-inn-upper', 'The Wayfarer''s Rest — Private Room',    'A cosy room with a narrow bed beneath a skylight. A writing desk holds ink, quills, and blank journal pages — the Cartographers encourage guests to record their observations. A ledger on the nightstand tracks room accounts.',              'feature_inn',  '{}', '[]', '[]', '[]')
) AS v(slug, name, description, type, properties, loot_containers, hazards, npcs)
WHERE z.slug = 'the-cartographium';

INSERT INTO zone_exits (id, zone_id, from_room_slug, direction, to_room_slug, target_zone_slug, target_room_slug, locked, hidden)
SELECT gen_random_uuid(), z.id, v.from_slug, v.direction, v.to_slug,
       NULLIF(v.target_zone, ''), NULLIF(v.target_room, ''),
       v.is_locked, v.is_hidden
FROM zones z, (VALUES
  ('cartographium-training',  'west', 'cartographium-inn',       '', '', false, false),
  ('cartographium-inn',       'east', 'cartographium-training',  '', '', false, false),
  ('cartographium-inn',       'up',   'cartographium-inn-upper', '', '', false, false),
  ('cartographium-inn-upper', 'down', 'cartographium-inn',       '', '', false, false)
) AS v(from_slug, direction, to_slug, target_zone, target_room, is_locked, is_hidden)
WHERE z.slug = 'the-cartographium';

-- ============================================================================
-- The Counting House — The Gilded Cot inn
-- ============================================================================

INSERT INTO zone_rooms (id, zone_id, slug, name, description, type, properties, loot_containers, hazards, npcs)
SELECT gen_random_uuid(), z.id, v.slug, v.name, v.description, v.type,
       v.properties::text[], v.loot_containers::jsonb, v.hazards::jsonb, v.npcs::jsonb
FROM zones z, (VALUES
  ('counting-house-inn',       'The Gilded Cot',                  'A well-appointed inn hidden behind an unmarked door. Velvet curtains partition private booths where Ledger operatives unwind. The bar serves expensive spirits and the innkeeper sees everything but says nothing.',                             'corridor',     '{}', '[]', '[]', '[]'),
  ('counting-house-inn-upper', 'The Gilded Cot — Private Room',   'A richly furnished room with dark wood panelling and brass fittings. The bed is softer than you expected. A ledger on the writing desk tracks accounts in the Ledger''s own cipher — you note the page left open for your charges.',              'feature_inn',  '{}', '[]', '[]', '[]')
) AS v(slug, name, description, type, properties, loot_containers, hazards, npcs)
WHERE z.slug = 'the-counting-house';

INSERT INTO zone_exits (id, zone_id, from_room_slug, direction, to_room_slug, target_zone_slug, target_room_slug, locked, hidden)
SELECT gen_random_uuid(), z.id, v.from_slug, v.direction, v.to_slug,
       NULLIF(v.target_zone, ''), NULLIF(v.target_room, ''),
       v.is_locked, v.is_hidden
FROM zones z, (VALUES
  ('counting-house-training',  'west', 'counting-house-inn',       '', '', false, false),
  ('counting-house-inn',       'east', 'counting-house-training',  '', '', false, false),
  ('counting-house-inn',       'up',   'counting-house-inn-upper', '', '', false, false),
  ('counting-house-inn-upper', 'down', 'counting-house-inn',       '', '', false, false)
) AS v(from_slug, direction, to_slug, target_zone, target_room, is_locked, is_hidden)
WHERE z.slug = 'the-counting-house';

-- ============================================================================
-- Update stronghold entry rooms to inn
-- ============================================================================

UPDATE zones SET entry_room_slugs = '{foundry-inn}' WHERE slug = 'the-foundry';
UPDATE zones SET entry_room_slugs = '{cartographium-inn}' WHERE slug = 'the-cartographium';
UPDATE zones SET entry_room_slugs = '{counting-house-inn}' WHERE slug = 'the-counting-house';

-- ============================================================================
-- Siltgate — Merchant's Inn upper room
-- ============================================================================

INSERT INTO zone_rooms (id, zone_id, slug, name, description, type, properties, loot_containers, hazards, npcs)
SELECT gen_random_uuid(), z.id,
  'merchant-inn-upper',
  'Private Room — The Merchant''s Inn',
  'A modest but clean room above the common hall. A narrow bed, a washstand, and a ledger on the nightstand for settling accounts. The sounds of the inn below are muffled by thick floorboards.',
  'feature_inn',
  '{}'::text[], '[]'::jsonb, '[]'::jsonb, '[]'::jsonb
FROM zones z
WHERE z.slug = 'siltgate';

INSERT INTO zone_exits (id, zone_id, from_room_slug, direction, to_room_slug, target_zone_slug, target_room_slug, locked, hidden)
SELECT gen_random_uuid(), z.id, v.from_slug, v.direction, v.to_slug,
       NULLIF(v.target_zone, ''), NULLIF(v.target_room, ''),
       v.is_locked, v.is_hidden
FROM zones z, (VALUES
  ('merchant-inn',       'up',   'merchant-inn-upper', '', '', false, false),
  ('merchant-inn-upper', 'down', 'merchant-inn',       '', '', false, false)
) AS v(from_slug, direction, to_slug, target_zone, target_room, is_locked, is_hidden)
WHERE z.slug = 'siltgate';
