-- 006_siltgate_diagonal_fix.sql — Reroute collapsed-building-1 north exit
-- from rubble-street-1 to rubble-street-3 to eliminate last diagonal.
-- This was appended to 005 after it had already been applied.

BEGIN;

-- Remove old rs1 ↔ cb1 connection
DELETE FROM zone_exits
WHERE zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate')
  AND from_room_slug = 'rubble-street-1' AND direction = 'south' AND to_room_slug = 'collapsed-building-1';

DELETE FROM zone_exits
WHERE zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate')
  AND from_room_slug = 'collapsed-building-1' AND direction = 'north' AND to_room_slug = 'rubble-street-1';

-- Add new rs3 ↔ cb1 connection (ON CONFLICT for fresh DBs where 005 already has this)
INSERT INTO zone_exits (zone_id, from_room_slug, direction, to_room_slug, target_zone_slug, target_room_slug, locked, hidden)
SELECT z.id, v.from_slug, v.direction, v.to_slug,
       NULLIF(v.target_zone, ''), NULLIF(v.target_room, ''),
       v.is_locked, v.is_hidden
FROM zones z, (VALUES
  ('rubble-street-3',      'south', 'collapsed-building-1', '', '', false, false),
  ('collapsed-building-1', 'north', 'rubble-street-3',      '', '', false, false)
) AS v(from_slug, direction, to_slug, target_zone, target_room, is_locked, is_hidden)
WHERE z.slug = 'the-siltgate'
ON CONFLICT (zone_id, from_room_slug, direction) DO NOTHING;

COMMIT;
