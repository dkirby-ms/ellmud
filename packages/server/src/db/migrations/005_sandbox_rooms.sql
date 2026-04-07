-- 005_sandbox_rooms.sql — Sandbox rooms in The Refuge
--
-- Adds three sandbox rooms (lobby, arena, stats lab) north of training-grounds.
-- Layout: training-grounds → north → sandbox-lobby → east → sandbox-arena
--                                    sandbox-lobby → west → sandbox-stats-lab

BEGIN;

-- ============================================================================
-- 1. Rooms
-- ============================================================================

INSERT INTO zone_rooms (zone_id, slug, name, description, type, properties, npcs, loot_containers, hazards)
SELECT z.id, v.slug, v.name, v.description, v.type,
       v.properties::text[], v.npcs::jsonb, v.loot_containers::jsonb, v.hazards::jsonb
FROM zones z, (VALUES
  ('sandbox-lobby',
   'The Proving Grounds',
   'A warded antechamber where the air hums with contained energy. Chalk diagrams and tactical notations cover the walls. Spawn circles and targeting dummies stand ready for use. Whatever violence occurs beyond this room, it cannot escape the wards.',
   'feature_sandbox',
   '{safe_container}',
   '[]',
   '[]',
   '[]'),
  ('sandbox-arena',
   'The Arena',
   'A vast circular chamber with a packed-earth floor and walls of reinforced stone. Sand and sawdust cover deep gouges. Chalk circles and numbered zones mark testing grounds. The ceiling rises into shadow. Whatever is built to withstand violence, this room was built for it.',
   'feature_sandbox_arena',
   '{safe_container,arena}',
   '[]',
   '[]',
   '[]'),
  ('sandbox-stats-lab',
   'The Tuning Forge',
   'A small stone chamber dominated by a long workbench scarred with notations and creature sketches. Shelves hold reference journals, stat charts, and combat logs. A mirror on one wall reflects the arena beyond. This is where every encounter is planned and every test is logged.',
   'feature_sandbox_stats',
   '{safe_container}',
   '[]',
   '[]',
   '[]')
) AS v(slug, name, description, type, properties, npcs, loot_containers, hazards)
WHERE z.slug = 'the-refuge'
ON CONFLICT (zone_id, slug) DO NOTHING;

-- ============================================================================
-- 2. Exits
-- ============================================================================

INSERT INTO zone_exits (zone_id, from_room_slug, direction, to_room_slug, target_zone_slug, target_room_slug, locked, hidden)
SELECT z.id, v.from_slug, v.direction, v.to_slug,
       NULLIF(v.target_zone, ''), NULLIF(v.target_room, ''),
       v.is_locked, v.is_hidden
FROM zones z, (VALUES
  ('training-grounds', 'north', 'sandbox-lobby',    '', '', false, false),
  ('sandbox-lobby',    'south', 'training-grounds',  '', '', false, false),
  ('sandbox-lobby',    'east',  'sandbox-arena',     '', '', false, false),
  ('sandbox-arena',    'west',  'sandbox-lobby',     '', '', false, false),
  ('sandbox-lobby',    'west',  'sandbox-stats-lab', '', '', false, false),
  ('sandbox-stats-lab','east',  'sandbox-lobby',     '', '', false, false)
) AS v(from_slug, direction, to_slug, target_zone, target_room, is_locked, is_hidden)
WHERE z.slug = 'the-refuge'
ON CONFLICT (zone_id, from_room_slug, direction) DO NOTHING;

COMMIT;
