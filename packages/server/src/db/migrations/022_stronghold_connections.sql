-- 022_stronghold_connections.sql — Connect faction strongholds to world zones
--
-- Implements Laeral's design for physical connections between the three faction
-- strongholds and the main world zones (Siltgate and Warrens).
--
-- Connections:
--   The Carrion Court (Krewe Calliope)  → Siltgate (Dockward)
--   The Reliquary (Kindari)              → Siltgate (Ashgate Wastes)
--   The Bloom Observatory (Bloom Tenders) → Warrens (eastern approach)
--
-- Adds 6 new transitional rooms (2 per connection route) and establishes
-- bidirectional exits between strongholds and world zones.

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- Connection 1: The Carrion Court → Siltgate (Dockward)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Route: carrion-court-inn → superdome-breach → flooded-concourse → dock-street-1
--
-- Narrative: The Krewe's half-collapsed Superdome opens to the flooded streets
--            of Dockward. Carnival debris marks their territorial boundary.

-- ── New Room 1: Superdome Breach (in the-carrion-court zone) ─────────────────

INSERT INTO zone_rooms (id, zone_id, slug, name, description, type, properties, loot_containers, hazards, npcs)
SELECT gen_random_uuid(), z.id, v.slug, v.name, v.description, v.type,
       v.properties::text[], v.loot_containers::jsonb, v.hazards::jsonb, v.npcs::jsonb
FROM zones z, (VALUES
  ('superdome-breach', 'Superdome Breach', 'A jagged rent in the Superdome''s outer wall allows passage between the Krewe''s domain and the streets beyond. Vines thread through the gap, and rainwater pools on cracked concrete. Krewe banners hang from the rusted girders above, visible from the street — a territorial marker and an invitation.', 'corridor', '{}', '[]', '[]', '[]')
) AS v(slug, name, description, type, properties, loot_containers, hazards, npcs)
WHERE z.slug = 'the-carrion-court';

-- ── New Room 2: Flooded Concourse (in the-siltgate zone) ─────────────────────

INSERT INTO zone_rooms (id, zone_id, slug, name, description, type, properties, loot_containers, hazards, npcs)
SELECT gen_random_uuid(), z.id, v.slug, v.name, v.description, v.type,
       v.properties::text[], v.loot_containers::jsonb, v.hazards::jsonb, v.npcs::jsonb
FROM zones z, (VALUES
  ('flooded-concourse', 'Flooded Concourse', 'The approach to the Superdome wades through ankle-deep brackish water, the street submerged where drainage has failed. Carnival debris floats on the surface — plastic beads, torn masks, waterlogged feathers. The drum-echo from within the Dome is audible even here.', 'corridor', '{water}', '[]', '[]', '[]')
) AS v(slug, name, description, type, properties, loot_containers, hazards, npcs)
WHERE z.slug = 'the-siltgate';

-- ── Exits: Carrion Court ↔ Siltgate ──────────────────────────────────────────

INSERT INTO zone_exits (id, zone_id, from_room_slug, direction, to_room_slug, target_zone_slug, target_room_slug, locked, hidden)
SELECT gen_random_uuid(), z.id, v.from_slug, v.direction, v.to_slug,
       NULLIF(v.target_zone, ''), NULLIF(v.target_room, ''),
       v.is_locked, v.is_hidden
FROM zones z, (VALUES
  -- Intra-zone: carrion-court-inn ↔ superdome-breach (within the-carrion-court)
  ('carrion-court-inn', 'south', 'superdome-breach', '', '', false, false),
  ('superdome-breach', 'north', 'carrion-court-inn', '', '', false, false),
  
  -- Inter-zone: superdome-breach (carrion-court) → flooded-concourse (siltgate)
  ('superdome-breach', 'south', 'superdome-breach', 'the-siltgate', 'flooded-concourse', false, false)
) AS v(from_slug, direction, to_slug, target_zone, target_room, is_locked, is_hidden)
WHERE z.slug = 'the-carrion-court';

INSERT INTO zone_exits (id, zone_id, from_room_slug, direction, to_room_slug, target_zone_slug, target_room_slug, locked, hidden)
SELECT gen_random_uuid(), z.id, v.from_slug, v.direction, v.to_slug,
       NULLIF(v.target_zone, ''), NULLIF(v.target_room, ''),
       v.is_locked, v.is_hidden
FROM zones z, (VALUES
  -- Inter-zone: flooded-concourse (siltgate) → superdome-breach (carrion-court)
  ('flooded-concourse', 'north', 'flooded-concourse', 'the-carrion-court', 'superdome-breach', false, false),
  
  -- Intra-zone: flooded-concourse ↔ dock-street-1 (within the-siltgate)
  -- dock-street-1 has north→tavern-row, south→dock-street-2, east→fish-market
  -- Using WEST (the only free direction)
  ('flooded-concourse', 'east', 'dock-street-1', '', '', false, false),
  ('dock-street-1', 'west', 'flooded-concourse', '', '', false, false)
) AS v(from_slug, direction, to_slug, target_zone, target_room, is_locked, is_hidden)
WHERE z.slug = 'the-siltgate';


-- ═══════════════════════════════════════════════════════════════════════════
-- Connection 2: The Reliquary → Siltgate (Ashgate Wastes)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Route: reliquary-inn → filtration-annex → pipe-bridge → ashgate-chapel
--
-- Narrative: The Kindari's water treatment plant extends via fortified corridors
--            to the burned chapel at Ashgate's edge. Industrial pragmatism.

-- ── New Room 1: Filtration Annex (in the-reliquary zone) ─────────────────────

INSERT INTO zone_rooms (id, zone_id, slug, name, description, type, properties, loot_containers, hazards, npcs)
SELECT gen_random_uuid(), z.id, v.slug, v.name, v.description, v.type,
       v.properties::text[], v.loot_containers::jsonb, v.hazards::jsonb, v.npcs::jsonb
FROM zones z, (VALUES
  ('filtration-annex', 'Filtration Annex', 'A narrow maintenance corridor extending from the Reliquary''s main structure, its walls lined with rusted piping and gauge dials. The Kindari have reinforced this passage with welded iron plates. A heavy security door at the far end leads to the wasteland beyond.', 'corridor', '{heavy_door}', '[]', '[]', '[]')
) AS v(slug, name, description, type, properties, loot_containers, hazards, npcs)
WHERE z.slug = 'the-reliquary';

-- ── New Room 2: Pipe Bridge (in the-siltgate zone) ───────────────────────────

INSERT INTO zone_rooms (id, zone_id, slug, name, description, type, properties, loot_containers, hazards, npcs)
SELECT gen_random_uuid(), z.id, v.slug, v.name, v.description, v.type,
       v.properties::text[], v.loot_containers::jsonb, v.hazards::jsonb, v.npcs::jsonb
FROM zones z, (VALUES
  ('pipe-bridge', 'Pipe Bridge', 'A suspended walkway built atop massive water mains that cross a blast crater. The pipes groan underfoot, and gaps in the grating offer vertiginous views of rubble far below. The Reliquary''s concrete bulk looms behind; ahead, the burned chapel marks the edge of Ashgate.', 'entrance', '{}', '[]', '[]', '[]')
) AS v(slug, name, description, type, properties, loot_containers, hazards, npcs)
WHERE z.slug = 'the-siltgate';

-- ── Exits: Reliquary ↔ Siltgate ──────────────────────────────────────────────

INSERT INTO zone_exits (id, zone_id, from_room_slug, direction, to_room_slug, target_zone_slug, target_room_slug, locked, hidden)
SELECT gen_random_uuid(), z.id, v.from_slug, v.direction, v.to_slug,
       NULLIF(v.target_zone, ''), NULLIF(v.target_room, ''),
       v.is_locked, v.is_hidden
FROM zones z, (VALUES
  -- Intra-zone: reliquary-inn ↔ filtration-annex (within the-reliquary)
  -- reliquary-inn has east→reliquary-training, up→reliquary-inn-upper; using SOUTH (free)
  ('reliquary-inn', 'south', 'filtration-annex', '', '', false, false),
  ('filtration-annex', 'north', 'reliquary-inn', '', '', false, false),
  
  -- Inter-zone: filtration-annex (reliquary) → pipe-bridge (siltgate)
  ('filtration-annex', 'east', 'filtration-annex', 'the-siltgate', 'pipe-bridge', false, false)
) AS v(from_slug, direction, to_slug, target_zone, target_room, is_locked, is_hidden)
WHERE z.slug = 'the-reliquary';

INSERT INTO zone_exits (id, zone_id, from_room_slug, direction, to_room_slug, target_zone_slug, target_room_slug, locked, hidden)
SELECT gen_random_uuid(), z.id, v.from_slug, v.direction, v.to_slug,
       NULLIF(v.target_zone, ''), NULLIF(v.target_room, ''),
       v.is_locked, v.is_hidden
FROM zones z, (VALUES
  -- Inter-zone: pipe-bridge (siltgate) → filtration-annex (reliquary)
  ('pipe-bridge', 'west', 'pipe-bridge', 'the-reliquary', 'filtration-annex', false, false),
  
  -- Intra-zone: pipe-bridge ↔ ashgate-chapel (within the-siltgate)
  -- ashgate-chapel has north→dust-bowl; south, east, west are free
  -- Using WEST as designed
  ('pipe-bridge', 'east', 'ashgate-chapel', '', '', false, false),
  ('ashgate-chapel', 'west', 'pipe-bridge', '', '', false, false)
) AS v(from_slug, direction, to_slug, target_zone, target_room, is_locked, is_hidden)
WHERE z.slug = 'the-siltgate';


-- ═══════════════════════════════════════════════════════════════════════════
-- Connection 3: The Bloom Observatory → Warrens
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Route: bloom-observatory-inn → platform-descent → causeway-terminus → shattered-gate
--
-- Narrative: The offshore platform descends to a corroded causeway that crosses
--            brackish shallows to the eastern wastes. A liminal threshold.

-- ── New Room 1: Platform Descent (in the-bloom-observatory zone) ─────────────

INSERT INTO zone_rooms (id, zone_id, slug, name, description, type, properties, loot_containers, hazards, npcs)
SELECT gen_random_uuid(), z.id, v.slug, v.name, v.description, v.type,
       v.properties::text[], v.loot_containers::jsonb, v.hazards::jsonb, v.npcs::jsonb
FROM zones z, (VALUES
  ('platform-descent', 'Platform Descent', 'An external staircase of rusted grating spirals down the platform''s leg, exposed to salt wind and spray. Algae slicks coat every surface, making footing treacherous. Below, the causeway extends eastward across brackish shallows toward the wasteland horizon.', 'corridor', '{}', '[]', '[]', '[]')
) AS v(slug, name, description, type, properties, loot_containers, hazards, npcs)
WHERE z.slug = 'the-bloom-observatory';

-- ── New Room 2: Causeway Terminus (in warrens zone) ──────────────────────────

INSERT INTO zone_rooms (id, zone_id, slug, name, description, type, properties, loot_containers, hazards, npcs)
SELECT gen_random_uuid(), z.id, v.slug, v.name, v.description, v.type,
       v.properties::text[], v.loot_containers::jsonb, v.hazards::jsonb, v.npcs::jsonb
FROM zones z, (VALUES
  ('causeway-terminus', 'Causeway Terminus', 'The corroded causeway meets solid ground at the edge of the eastern wastes. The transition is abrupt — behind you, the green-slicked platform rises from the water; ahead, blast-scarred earth and the shattered archway of the Warrens. The Bloom Tenders call this the ''Threshold.'' Few cross it lightly.', 'entrance', '{}', '[]', '[]', '[]')
) AS v(slug, name, description, type, properties, loot_containers, hazards, npcs)
WHERE z.slug = 'warrens';

-- ── Exits: Bloom Observatory ↔ Warrens ───────────────────────────────────────

INSERT INTO zone_exits (id, zone_id, from_room_slug, direction, to_room_slug, target_zone_slug, target_room_slug, locked, hidden)
SELECT gen_random_uuid(), z.id, v.from_slug, v.direction, v.to_slug,
       NULLIF(v.target_zone, ''), NULLIF(v.target_room, ''),
       v.is_locked, v.is_hidden
FROM zones z, (VALUES
  -- Intra-zone: bloom-observatory-inn ↔ platform-descent (within the-bloom-observatory)
  ('bloom-observatory-inn', 'down', 'platform-descent', '', '', false, false),
  ('platform-descent', 'up', 'bloom-observatory-inn', '', '', false, false),
  
  -- Inter-zone: platform-descent (bloom-observatory) → causeway-terminus (warrens)
  ('platform-descent', 'east', 'platform-descent', 'warrens', 'causeway-terminus', false, false)
) AS v(from_slug, direction, to_slug, target_zone, target_room, is_locked, is_hidden)
WHERE z.slug = 'the-bloom-observatory';

INSERT INTO zone_exits (id, zone_id, from_room_slug, direction, to_room_slug, target_zone_slug, target_room_slug, locked, hidden)
SELECT gen_random_uuid(), z.id, v.from_slug, v.direction, v.to_slug,
       NULLIF(v.target_zone, ''), NULLIF(v.target_room, ''),
       v.is_locked, v.is_hidden
FROM zones z, (VALUES
  -- Inter-zone: causeway-terminus (warrens) → platform-descent (bloom-observatory)
  ('causeway-terminus', 'west', 'causeway-terminus', 'the-bloom-observatory', 'platform-descent', false, false),
  
  -- Intra-zone: causeway-terminus ↔ shattered-gate (within warrens)
  -- shattered-gate has west→the-refuge, east→rubble-boulevard, south→the-siltgate
  -- Using NORTH (the only free direction)
  ('causeway-terminus', 'south', 'shattered-gate', '', '', false, false),
  ('shattered-gate', 'north', 'causeway-terminus', '', '', false, false)
) AS v(from_slug, direction, to_slug, target_zone, target_room, is_locked, is_hidden)
WHERE z.slug = 'warrens';

COMMIT;
