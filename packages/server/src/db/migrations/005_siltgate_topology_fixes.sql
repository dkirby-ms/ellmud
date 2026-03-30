-- 005_siltgate_topology_fixes.sql — Fix 6 topological conflicts in The Siltgate zone.
-- Adds 2 bridge rooms, removes 10 shortcut exits, inserts 8 corrected exits,
-- and updates room types/descriptions for continuity.
-- Design source: Laeral's bridge-room-designs (2025-07-24)

BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- 1. INSERT 2 new bridge rooms
-- ═══════════════════════════════════════════════════════════════
INSERT INTO zone_rooms (zone_id, slug, name, description, type, properties, npcs, loot_containers, hazards)
SELECT z.id, v.slug, v.name, v.description, v.type,
       v.properties::text[], v.npcs::jsonb, v.loot_containers::jsonb, v.hazards::jsonb
FROM zones z, (VALUES
  ('rubble-passage-1',
   'Rubble Passage',
   'A narrow crawlway hacked through fallen masonry, barely wide enough for one. Splintered roof beams jut from the walls like broken ribs, and the dust is so thick each step raises a grey cloud that coats the throat. Something skitters in the dark gap ahead — too large for a rat.',
   'corridor',
   '{pvp,rubble,narrow}',
   '[]',
   '[]',
   '[]'),
  ('gutter-sewer',
   'Flooded Gutter',
   'Below the drain grate, a low brick chamber fills with the slum''s grey runoff. The water is knee-deep and warm in a way that suggests sources best not contemplated. Crude scratch-marks on the walls — tally marks, names, a crude map — indicate this space has served as a hideout before. The passage south has long since collapsed, leaving only the climb back up.',
   'dead_end',
   '{pvp,water,enclosed}',
   '[{"creatureId": "slum_rat", "spawnCount": 2}]',
   '[{"type": "search", "items": [{"itemId": "alley_thugs_coin", "dropWeight": 40}]}]',
   '[]')
) AS v(slug, name, description, type, properties, npcs, loot_containers, hazards)
WHERE z.slug = 'the-siltgate';

-- ═══════════════════════════════════════════════════════════════
-- 2. DELETE 10 problematic shortcut exits
-- ═══════════════════════════════════════════════════════════════

-- Fix 1: dock-street-5 ↔ narrow-alley-3 (Δ=9 cross-neighborhood shortcut)
DELETE FROM zone_exits
WHERE zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate')
  AND from_room_slug = 'dock-street-5' AND direction = 'east' AND to_room_slug = 'narrow-alley-3';

DELETE FROM zone_exits
WHERE zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate')
  AND from_room_slug = 'narrow-alley-3' AND direction = 'west' AND to_room_slug = 'dock-street-5';

-- Fix 2: scorched-plaza ↔ rubble-street-2 (Δ=5 dual-approach conflict)
DELETE FROM zone_exits
WHERE zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate')
  AND from_room_slug = 'scorched-plaza' AND direction = 'north' AND to_room_slug = 'rubble-street-2';

DELETE FROM zone_exits
WHERE zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate')
  AND from_room_slug = 'rubble-street-2' AND direction = 'south' AND to_room_slug = 'scorched-plaza';

-- Fix 3: sewer-junction-2 ↔ sewer-tunnel-4 (Δ=17 sewer ring)
DELETE FROM zone_exits
WHERE zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate')
  AND from_room_slug = 'sewer-junction-2' AND direction = 'east' AND to_room_slug = 'sewer-tunnel-4';

DELETE FROM zone_exits
WHERE zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate')
  AND from_room_slug = 'sewer-tunnel-4' AND direction = 'west' AND to_room_slug = 'sewer-junction-2';

-- Fix 4: gutter-drain ↔ sewer-junction-1 (Δ=8 vertical shortcut)
DELETE FROM zone_exits
WHERE zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate')
  AND from_room_slug = 'gutter-drain' AND direction = 'down' AND to_room_slug = 'sewer-junction-1';

DELETE FROM zone_exits
WHERE zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate')
  AND from_room_slug = 'sewer-junction-1' AND direction = 'up' AND to_room_slug = 'gutter-drain';

-- Fix 5: garden-terrace ↔ iron-balcony-2 (Δ=3 L-loop)
DELETE FROM zone_exits
WHERE zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate')
  AND from_room_slug = 'garden-terrace' AND direction = 'west' AND to_room_slug = 'iron-balcony-2';

DELETE FROM zone_exits
WHERE zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate')
  AND from_room_slug = 'iron-balcony-2' AND direction = 'east' AND to_room_slug = 'garden-terrace';

-- ═══════════════════════════════════════════════════════════════
-- 3. INSERT 8 corrected bridge exits
-- ═══════════════════════════════════════════════════════════════
INSERT INTO zone_exits (zone_id, from_room_slug, direction, to_room_slug, target_zone_slug, target_room_slug, locked, hidden)
SELECT z.id, v.from_slug, v.direction, v.to_slug,
       NULLIF(v.target_zone, ''), NULLIF(v.target_room, ''),
       v.is_locked, v.is_hidden
FROM zones z, (VALUES
  -- Fix 2: Ashgate bridge via rubble-passage-1
  ('collapsed-building-1', 'south',  'rubble-passage-1',   '', '', false, false),
  ('rubble-passage-1',     'north',  'collapsed-building-1','', '', false, false),
  ('rubble-passage-1',     'west',   'collapsed-building-3','', '', false, false),
  ('collapsed-building-3', 'east',   'rubble-passage-1',   '', '', false, false),
  -- Fix 4: gutter-drain → gutter-sewer dead-end
  ('gutter-drain',         'down',   'gutter-sewer',       '', '', false, false),
  ('gutter-sewer',         'up',     'gutter-drain',       '', '', false, false),
  -- Fix 5: promenade-walk-3 → iron-balcony-2 reroute
  ('promenade-walk-3',     'south',  'iron-balcony-2',     '', '', false, false),
  ('iron-balcony-2',       'north',  'promenade-walk-3',   '', '', false, false)
) AS v(from_slug, direction, to_slug, target_zone, target_room, is_locked, is_hidden)
WHERE z.slug = 'the-siltgate';

-- ═══════════════════════════════════════════════════════════════
-- 4. UPDATE collapsed-building-1 type: dead_end → corridor
-- ═══════════════════════════════════════════════════════════════
UPDATE zone_rooms
SET type = 'corridor', updated_at = now()
WHERE zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate')
  AND slug = 'collapsed-building-1';

-- ═══════════════════════════════════════════════════════════════
-- 5. UPDATE descriptions for severed sewer passage (narrative continuity)
-- ═══════════════════════════════════════════════════════════════
UPDATE zone_rooms
SET description = description || ' The eastern tunnel is choked with fallen masonry — whatever collapse sealed it was recent enough that the dust hasn''t settled.',
    updated_at = now()
WHERE zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate')
  AND slug = 'sewer-junction-2';

UPDATE zone_rooms
SET description = description || ' The western end of the tunnel terminates in a wall of rubble and twisted iron. Water seeps through the gaps, but nothing larger than a rat could pass.',
    updated_at = now()
WHERE zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate')
  AND slug = 'sewer-tunnel-4';

-- ═══════════════════════════════════════════════════════════════
-- 6. Fix 7: Reroute rubble-street-1↔collapsed-building-1 to
--    rubble-street-3↔collapsed-building-1 (eliminate last diagonal)
-- ═══════════════════════════════════════════════════════════════
DELETE FROM zone_exits
WHERE zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate')
  AND from_room_slug = 'rubble-street-1' AND direction = 'south' AND to_room_slug = 'collapsed-building-1';

DELETE FROM zone_exits
WHERE zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate')
  AND from_room_slug = 'collapsed-building-1' AND direction = 'north' AND to_room_slug = 'rubble-street-1';

INSERT INTO zone_exits (zone_id, from_room_slug, direction, to_room_slug, target_zone_slug, target_room_slug, locked, hidden)
SELECT z.id, v.from_slug, v.direction, v.to_slug,
       NULLIF(v.target_zone, ''), NULLIF(v.target_room, ''),
       v.is_locked, v.is_hidden
FROM zones z, (VALUES
  ('rubble-street-3',        'south', 'collapsed-building-1', '', '', false, false),
  ('collapsed-building-1',   'north', 'rubble-street-3',      '', '', false, false)
) AS v(from_slug, direction, to_slug, target_zone, target_room, is_locked, is_hidden)
WHERE z.slug = 'the-siltgate';

COMMIT;
