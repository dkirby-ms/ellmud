-- 007_warrens_topology_fixes.sql — Fix 19 topological conflicts in The Warrens zone.
-- Adds 8 bridge rooms to lengthen sewer paths, removes 8 shortcut exit pairs,
-- inserts 11 corrected exit pairs, and updates broken-sanctuary description.
-- Zone grows from 101 to 109 rooms; 0 BFS conflicts after changes.
-- Design source: Laeral's warrens-topology-fixes (2025-07-25)

BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- 1. INSERT 8 new sewer bridge rooms
-- ═══════════════════════════════════════════════════════════════
-- Fix A-1: 4 rooms to lengthen the-ratways → sewer-main-junction path
-- Fix A-2: 4 rooms to lengthen sewer-west-conduit → sewer-cistern path

INSERT INTO zone_rooms (zone_id, slug, name, description, type, properties, npcs, loot_containers, hazards)
SELECT z.id, v.slug, v.name, v.description, v.type,
       v.properties::text[], v.npcs::jsonb, v.loot_containers::jsonb, v.hazards::jsonb
FROM zones z, (VALUES

  -- ── Fix A-1: Ratways-to-Junction sewer chain ─────────────────────────────

  ('sewer-drip-tunnel',
   'Drip Tunnel',
   'A low tunnel sloping downward from the Ratways, its ceiling bristling with stalactites of calcite and rust. Water drips in an irregular rhythm from every surface — not a steady leak, but the sporadic bleeding of a dozen cracked pipes hidden above the stonework. The floor is slick with mineral deposits, and each footfall sends a splash echoing ahead into unseen darkness. Rat droppings crunch underfoot between the puddles.',
   'corridor',
   '{pvp,water,enclosed,narrow}',
   '[{"creatureId": "slum_rat", "spawnCount": 2}]',
   '[]',
   '[]'),

  ('sewer-cracked-conduit',
   'Cracked Conduit',
   'The tunnel widens here where a massive clay conduit has split lengthwise, disgorging its contents across the passage floor. The crack runs from floor to ceiling like a wound, and through it seeps a slow, oily liquid that smells of iron and decay. Makeshift bridges of salvaged planks span the worst of the flow. The walls are scored with claw marks — something uses this route regularly.',
   'corridor',
   '{pvp,water,enclosed}',
   '[{"creatureId": "gutterspawn", "spawnCount": 2}]',
   '[{"id": "cracked-conduit-sack-1", "type": "crate", "items": ["corroded_pipe", "bent_rebar"]}]',
   '[]'),

  ('sewer-blind-turn',
   'Blind Turn',
   'The tunnel bends sharply here, visibility dropping to nothing around the corner. The walls are scratched with crude directional arrows — the work of some previous explorer who learned the hard way that the sewers do not run straight. The acoustics play tricks; sounds from ahead seem to come from behind. A rusted iron grate is bolted across a side passage, whatever lies beyond it long since sealed away.',
   'corridor',
   '{pvp,enclosed,narrow}',
   '[]',
   '[]',
   '[]'),

  ('sewer-narrow-drain',
   'Narrow Drain',
   'A drainage channel barely wide enough for one, carved through bedrock rather than brick. The walls press in close, and the ceiling forces a stoop. Water runs ankle-deep along a central groove, cold and fast enough to tug at the feet. The passage opens slightly ahead where it meets a larger tunnel — the sound of flowing water grows louder, echoing off brick walls.',
   'corridor',
   '{pvp,water,enclosed,narrow}',
   '[{"creatureId": "slum_rat", "spawnCount": 3}]',
   '[{"id": "narrow-drain-corpse-1", "type": "corpse", "items": ["tarnished_medallion", "corroded_pipe"]}]',
   '[]'),

  -- ── Fix A-2: West-Conduit-to-Cistern sewer chain ─────────────────────────

  ('sewer-rubble-choke',
   'Rubble Choke',
   'The tunnel narrows to a crawlspace where a partial collapse has choked the passage with broken brick and morite. Someone — or something — has cleared just enough space to squeeze through, leaving scrape marks on the remaining masonry. Dust sifts from the ceiling with every vibration, a constant reminder that the rest could come down at any moment. Beyond the rubble, the passage drops downward.',
   'corridor',
   '{pvp,enclosed,narrow,rubble}',
   '[]',
   '[]',
   '[]'),

  ('sewer-trickle-passage',
   'Trickle Passage',
   'A low maintenance corridor with a shallow channel cut into the floor, carrying a thin stream of grey water eastward. The walls are lined with corroded brass fixtures — the remnants of a valve system that once controlled flow to the western conduit. Most have been pried loose for scrap. Gutterspawn silk stretches between the remaining pipes, glistening with moisture.',
   'corridor',
   '{pvp,water,enclosed}',
   '[{"creatureId": "gutterspawn", "spawnCount": 2}]',
   '[{"id": "trickle-sack-1", "type": "crate", "items": ["corroded_pipe", "bent_rebar"]}]',
   '[]'),

  ('sewer-slime-channel',
   'Slime Channel',
   'The passage floor drops into a shallow trough coated in a thick, luminescent green slime that pulses faintly in the darkness. The slime is warm to the touch and smells of copper and rotting vegetation. It clings to boots and gear, and anything left in contact with it too long begins to corrode. The walls weep the same substance from hairline cracks in the mortar.',
   'corridor',
   '{pvp,water,enclosed,hazardous}',
   '[{"creatureId": "sewer_lurker", "spawnCount": 1}]',
   '[]',
   '[]'),

  ('sewer-stagnant-pool',
   'Stagnant Pool',
   'The tunnel opens into a low, vaulted chamber where drainage from multiple passages collects in a broad, motionless pool. The water is black and perfectly still, its surface broken only by the occasional bubble rising from whatever decays beneath. A narrow stone ledge runs along the eastern wall — the only dry path forward. The stench is extraordinary, even by sewer standards.',
   'chamber',
   '{pvp,water,enclosed,stench}',
   '[{"creatureId": "gutterspawn", "spawnCount": 3}]',
   '[{"id": "stagnant-pool-corpse-1", "type": "corpse", "items": ["corroded_pipe", "gutterspawn_fang", "tarnished_medallion"]}]',
   '[]')

) AS v(slug, name, description, type, properties, npcs, loot_containers, hazards)
WHERE z.slug = 'warrens';

-- ═══════════════════════════════════════════════════════════════
-- 2. DELETE 8 exit pairs (16 rows) — remove topology-breaking shortcuts
-- ═══════════════════════════════════════════════════════════════

-- Fix A-1: the-ratways ↔ sewer-main-junction (1-hop shortcut, should be 6 hops)
DELETE FROM zone_exits
WHERE zone_id = (SELECT id FROM zones WHERE slug = 'warrens')
  AND from_room_slug = 'the-ratways' AND direction = 'east' AND to_room_slug = 'sewer-main-junction';

DELETE FROM zone_exits
WHERE zone_id = (SELECT id FROM zones WHERE slug = 'warrens')
  AND from_room_slug = 'sewer-main-junction' AND direction = 'west' AND to_room_slug = 'the-ratways';

-- Fix A-2: sewer-south-tunnel ↔ sewer-west-conduit (wrong-direction west link)
DELETE FROM zone_exits
WHERE zone_id = (SELECT id FROM zones WHERE slug = 'warrens')
  AND from_room_slug = 'sewer-south-tunnel' AND direction = 'west' AND to_room_slug = 'sewer-west-conduit';

DELETE FROM zone_exits
WHERE zone_id = (SELECT id FROM zones WHERE slug = 'warrens')
  AND from_room_slug = 'sewer-west-conduit' AND direction = 'east' AND to_room_slug = 'sewer-south-tunnel';

-- Fix A-2: sewer-west-conduit ↔ sewer-cistern (1-hop shortcut, should be 4 hops)
DELETE FROM zone_exits
WHERE zone_id = (SELECT id FROM zones WHERE slug = 'warrens')
  AND from_room_slug = 'sewer-west-conduit' AND direction = 'west' AND to_room_slug = 'sewer-cistern';

DELETE FROM zone_exits
WHERE zone_id = (SELECT id FROM zones WHERE slug = 'warrens')
  AND from_room_slug = 'sewer-cistern' AND direction = 'east' AND to_room_slug = 'sewer-west-conduit';

-- Fix B: broken-sanctuary ↔ sunken-square (dual-approach conflict)
DELETE FROM zone_exits
WHERE zone_id = (SELECT id FROM zones WHERE slug = 'warrens')
  AND from_room_slug = 'broken-sanctuary' AND direction = 'east' AND to_room_slug = 'sunken-square';

DELETE FROM zone_exits
WHERE zone_id = (SELECT id FROM zones WHERE slug = 'warrens')
  AND from_room_slug = 'sunken-square' AND direction = 'west' AND to_room_slug = 'broken-sanctuary';

-- ═══════════════════════════════════════════════════════════════
-- 3. INSERT 11 exit pairs (22 rows) — corrected sewer topology
-- ═══════════════════════════════════════════════════════════════
INSERT INTO zone_exits (zone_id, from_room_slug, direction, to_room_slug, target_zone_slug, target_room_slug, locked, hidden)
SELECT z.id, v.from_slug, v.direction, v.to_slug,
       NULLIF(v.target_zone, ''), NULLIF(v.target_room, ''),
       v.is_locked, v.is_hidden
FROM zones z, (VALUES
  -- Fix A-1: the-ratways → sewer-main-junction via 4-room chain (S→S→W→S→E)
  ('the-ratways',          'south', 'sewer-drip-tunnel',      '', '', false, false),
  ('sewer-drip-tunnel',    'north', 'the-ratways',            '', '', false, false),
  ('sewer-drip-tunnel',    'south', 'sewer-cracked-conduit',  '', '', false, false),
  ('sewer-cracked-conduit','north', 'sewer-drip-tunnel',      '', '', false, false),
  ('sewer-cracked-conduit','west',  'sewer-blind-turn',       '', '', false, false),
  ('sewer-blind-turn',     'east',  'sewer-cracked-conduit',  '', '', false, false),
  ('sewer-blind-turn',     'south', 'sewer-narrow-drain',     '', '', false, false),
  ('sewer-narrow-drain',   'north', 'sewer-blind-turn',       '', '', false, false),
  ('sewer-narrow-drain',   'east',  'sewer-north-tunnel',     '', '', false, false),
  ('sewer-north-tunnel',   'west',  'sewer-narrow-drain',     '', '', false, false),

  -- Fix A-2: sewer-south-tunnel → sewer-cistern via 4-room chain (W→S→E→S→E→E)
  ('sewer-south-tunnel',   'west',  'sewer-rubble-choke',     '', '', false, false),
  ('sewer-rubble-choke',   'east',  'sewer-south-tunnel',     '', '', false, false),
  ('sewer-rubble-choke',   'south', 'sewer-west-conduit',     '', '', false, false),
  ('sewer-west-conduit',   'north', 'sewer-rubble-choke',     '', '', false, false),
  ('sewer-west-conduit',   'east',  'sewer-trickle-passage',  '', '', false, false),
  ('sewer-trickle-passage','west',  'sewer-west-conduit',     '', '', false, false),
  ('sewer-trickle-passage','south', 'sewer-slime-channel',    '', '', false, false),
  ('sewer-slime-channel',  'north', 'sewer-trickle-passage',  '', '', false, false),
  ('sewer-slime-channel',  'east',  'sewer-stagnant-pool',    '', '', false, false),
  ('sewer-stagnant-pool',  'west',  'sewer-slime-channel',    '', '', false, false),
  ('sewer-stagnant-pool',  'east',  'sewer-cistern',          '', '', false, false),
  ('sewer-cistern',        'west',  'sewer-stagnant-pool',    '', '', false, false)
) AS v(from_slug, direction, to_slug, target_zone, target_room, is_locked, is_hidden)
WHERE z.slug = 'warrens';

-- ═══════════════════════════════════════════════════════════════
-- 4. UPDATE broken-sanctuary description (now a dead-end)
-- ═══════════════════════════════════════════════════════════════
UPDATE zone_rooms
SET description = description || ' The eastern wall shows the outline of a bricked-up doorway — sealed deliberately, and recently.',
    updated_at = now()
WHERE zone_id = (SELECT id FROM zones WHERE slug = 'warrens')
  AND slug = 'broken-sanctuary';

COMMIT;
