-- Migration 033: Seed The Warrens — a desolate ruined city extraction zone.
-- 11 rooms, 23 exits (including 1 hidden, 2 locked, 1 cross-zone to Refuge).
-- Designed by Laeral (Content Designer), built by Bruenor (Content Builder).
-- Idempotent: uses INSERT ... ON CONFLICT DO NOTHING so re-running is safe.

-- Ensure the zone exists (may have been created via admin UI with slug 'warrens')
INSERT INTO zones (slug, name, description, tier, biome, lifecycle, category, max_players, pvp_enabled, repop_interval_seconds, entry_room_slugs)
VALUES (
  'warrens',
  'The Warrens',
  'A desolate, sparsely inhabited ruined city landscape. Winding streets cluttered by the detritus of some ancient civilisation. The streets look deserted but the sounds of life and death echo across the cracked pavement.',
  1,
  'ruins',
  'persistent',
  'dungeon',
  3,
  false,
  300,
  ARRAY['shattered-gate']
)
ON CONFLICT (slug) DO UPDATE SET
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  category = EXCLUDED.category,
  max_players = EXCLUDED.max_players,
  entry_room_slugs = EXCLUDED.entry_room_slugs;

-- Insert rooms (properties is text[], not jsonb)
INSERT INTO zone_rooms (zone_id, slug, name, description, type, properties, npcs, loot_containers, hazards)
SELECT z.id, v.slug, v.name, v.description, v.type,
       v.properties::text[], v.npcs::jsonb, v.loot_containers::jsonb, v.hazards::jsonb
FROM zones z, (VALUES

  -- 1. Shattered Gate (entry)
  ('shattered-gate',
   'Shattered Gate',
   'A colossal archway, split down its centre by some ancient cataclysm, frames the entrance to a ruined city. Rubble spills outward like the city is trying to disgorge its own bones. Wind funnels through the gap, carrying the faint tang of rust and something older — something burnt.',
   'entry',
   '{heavy_door}',
   '[]',
   '[]',
   '[]'),

  -- 2. Rubble-Choked Boulevard (corridor)
  ('rubble-boulevard',
   'Rubble-Choked Boulevard',
   'A once-grand boulevard stretches east, its paving stones heaved upward by roots that died centuries ago. Collapsed facades lean drunkenly against one another, forming accidental tunnels of broken stone. Glass crunches underfoot no matter how carefully you step.',
   'corridor',
   '{}',
   '[{"creatureId": "gutterspawn", "spawnCount": 2}]',
   '[{"id": "boulevard-crate-1", "type": "crate", "items": ["bent_rebar", "gutterspawn_fang"]}]',
   '[{"type": "unstable_rubble", "severity": 0.3}]'),

  -- 3. Overwatch Tower (dead_end)
  ('overwatch-tower',
   'Overwatch Tower',
   'A spiralling stair of crumbling stone leads up through the shell of a watchtower. Half the upper floor has sheered away, offering a vertiginous view over the rooftops of the dead city. Wind howls through the gap. Someone has scratched tally marks into the wall — hundreds of them — in neat, obsessive rows.',
   'dead_end',
   '{}',
   '[]',
   '[{"id": "tower-corpse-1", "type": "corpse", "items": ["charred_street_map", "tarnished_medallion"]}]',
   '[{"type": "unstable_floor", "severity": 0.4}]'),

  -- 4. The Hollow Market (junction)
  ('hollow-market',
   'The Hollow Market',
   'A sunken plaza opens up where three streets converge, littered with the skeletal frames of market stalls. Faded awnings hang in tatters. A dry fountain at the centre holds a statue with no face — whether eroded or deliberately defaced, it is impossible to tell. Echoes carry strangely here; sounds from every adjacent street pool in this space.',
   'junction',
   '{cavern}',
   '[{"creatureId": "rubble_scavenger", "spawnCount": 1}]',
   '[{"id": "market-crate-1", "type": "crate", "items": ["bent_rebar", "scavenger_shiv", "tarnished_medallion"]}]',
   '[]'),

  -- 5. Broken Sanctuary (chamber)
  ('broken-sanctuary',
   'Broken Sanctuary',
   'Stone columns, cracked but standing, hold up what remains of a vaulted ceiling. This was a place of worship or governance — the distinction has been erased by time. An altar of dark stone dominates the far wall, its surface scarred by claw marks. The air smells of old incense and fresh blood.',
   'junction',
   '{heavy_door}',
   '[{"creatureId": "hollow_stalker", "spawnCount": 1}]',
   '[{"id": "sanctuary-altar-1", "type": "altar", "items": ["rubble_crusted_vest", "tarnished_medallion", "sanctuary_key"]}]',
   '[]'),

  -- 6. Whispering Alley (corridor)
  ('whispering-alley',
   'Whispering Alley',
   'The buildings press close here, their upper storeys nearly touching overhead. Every sound — your breath, your footfall, the distant crack of settling stone — bounces between the walls until it sounds like a crowd of invisible speakers. Debris forms knee-high barricades at irregular intervals. Something has been dragging things through here.',
   'corridor',
   '{}',
   '[{"creatureId": "gutterspawn", "spawnCount": 3}]',
   '[{"id": "alley-corpse-1", "type": "corpse", "items": ["gutterspawn_fang", "scavenger_shiv", "sanctuary_key"]}]',
   '[]'),

  -- 7. Collapsed Tenement (dead_end)
  ('collapsed-tenement',
   'Collapsed Tenement',
   'What was once a three-storey dwelling has pancaked into a single compressed layer of shattered timber, bent pipes, and pulverised plaster. A narrow gap leads into a pocket of relative stability — a room-sized void where the floors above wedged against each other instead of falling. It smells like a den. It smells occupied.',
   'dead_end',
   '{}',
   '[{"creatureId": "rubble_scavenger", "spawnCount": 2}]',
   '[{"id": "tenement-chest-1", "type": "chest", "items": ["scavenger_shiv", "rubble_crusted_vest", "tarnished_medallion"]}]',
   '[{"type": "unstable_rubble", "severity": 0.3}]'),

  -- 8. Dustfall Extraction (extraction)
  ('dustfall-extraction',
   'Dustfall Extraction',
   'A wide intersection where the ruins fall back, leaving an unexpected expanse of open sky. Dust drifts down endlessly from the crumbling buildings above, catching light like grey snow. A half-collapsed pedestrian bridge arches overhead — beneath it, the ground has been swept clean in a perfect circle. This is where the shard thins. This is where you leave.',
   'extraction',
   '{}',
   '[]',
   '[]',
   '[]'),

  -- 9. The Sunken Square (junction)
  ('sunken-square',
   'The Sunken Square',
   'The street dips sharply here, as if the earth itself sagged under the weight of ruin. Stagnant water collects in the depression, ankle-deep and dark. The walls of surrounding buildings rise like the sides of a well. Scratch marks line the stone at water level — long, parallel gouges, ascending from somewhere below.',
   'junction',
   '{water}',
   '[{"creatureId": "hollow_stalker", "spawnCount": 1}]',
   '[{"id": "square-crate-1", "type": "crate", "items": ["tarnished_medallion", "bent_rebar", "rubble_crusted_vest"]}]',
   '[{"type": "standing_water", "severity": 0.3}]'),

  -- 10. The Ratways (corridor)
  ('the-ratways',
   'The Ratways',
   'A drainage tunnel, barely tall enough to stand in, runs beneath the square. The ceiling drips steadily. Gutterspawn nests line the walls — tangles of cloth, bone, and wire — most of them empty. Most. The tunnel slopes downward into darkness, and from below comes a sound like stone grinding against stone.',
   'corridor',
   '{water}',
   '[{"creatureId": "gutterspawn", "spawnCount": 4}]',
   '[{"id": "ratways-nest-1", "type": "corpse", "items": ["gutterspawn_fang", "tarnished_medallion"]}]',
   '[{"type": "low_ceiling", "severity": 0.2}]'),

  -- 11. The Charnel Pit (boss)
  ('charnel-pit',
   'The Charnel Pit',
   'The tunnel opens into a vast pit — the foundations of a collapsed building, ripped open like a wound. Bones and rubble are fused into the walls. At the centre, something enormous shifts in the debris, rebar-spiked and concrete-skinned, as if the building itself refused to die and instead became something worse. The air vibrates with each of its slow, grinding breaths.',
   'boss',
   '{cavern}',
   '[{"creatureId": "the_collapsed_one", "spawnCount": 1}]',
   '[{"id": "charnel-boss-chest", "type": "chest", "items": ["rubble_crusted_vest", "scavenger_shiv", "charred_street_map", "tarnished_medallion"]}]',
   '[{"type": "seismic_tremor", "severity": 0.5}]')

) AS v(slug, name, description, type, properties, npcs, loot_containers, hazards)
WHERE z.slug = 'warrens'
ON CONFLICT (zone_id, slug) DO NOTHING;

-- Insert exits
INSERT INTO zone_exits (zone_id, from_room_slug, direction, to_room_slug, target_zone_slug, target_room_slug, locked, hidden)
SELECT z.id, v.from_slug, v.direction, v.to_slug,
       NULLIF(v.target_zone, ''), NULLIF(v.target_room, ''),
       v.is_locked, v.is_hidden
FROM zones z, (VALUES
  -- Shattered Gate ↔ Rubble Boulevard (east/west)
  ('shattered-gate',      'east',  'rubble-boulevard',   '', '', false, false),
  ('rubble-boulevard',    'west',  'shattered-gate',     '', '', false, false),

  -- Shattered Gate → Refuge (cross-zone exit west)
  ('shattered-gate',      'west',  'shattered-gate',     'the-refuge', 'hearth', false, false),

  -- Rubble Boulevard ↔ Hollow Market (east/west)
  ('rubble-boulevard',    'east',  'hollow-market',      '', '', false, false),
  ('hollow-market',       'west',  'rubble-boulevard',   '', '', false, false),

  -- Rubble Boulevard ↔ Overwatch Tower (up/down)
  ('rubble-boulevard',    'up',    'overwatch-tower',    '', '', false, false),
  ('overwatch-tower',     'down',  'rubble-boulevard',   '', '', false, false),

  -- Hollow Market ↔ Broken Sanctuary (north/south)
  ('hollow-market',       'north', 'broken-sanctuary',   '', '', false, false),
  ('broken-sanctuary',    'south', 'hollow-market',      '', '', false, false),

  -- Hollow Market ↔ Whispering Alley (south/north)
  ('hollow-market',       'south', 'whispering-alley',   '', '', false, false),
  ('whispering-alley',    'north', 'hollow-market',      '', '', false, false),

  -- Broken Sanctuary ↔ Sunken Square (east/west — LOCKED)
  ('broken-sanctuary',    'east',  'sunken-square',      '', '', true, false),
  ('sunken-square',       'west',  'broken-sanctuary',   '', '', true, false),

  -- Whispering Alley ↔ Collapsed Tenement (east/west)
  ('whispering-alley',    'east',  'collapsed-tenement', '', '', false, false),
  ('collapsed-tenement',  'west',  'whispering-alley',   '', '', false, false),

  -- Whispering Alley ↔ Dustfall Extraction (south/north)
  ('whispering-alley',    'south', 'dustfall-extraction', '', '', false, false),
  ('dustfall-extraction',  'north', 'whispering-alley',   '', '', false, false),

  -- Dustfall Extraction ↔ Sunken Square (east/south)
  ('dustfall-extraction',  'east',  'sunken-square',      '', '', false, false),
  ('sunken-square',       'south',  'dustfall-extraction', '', '', false, false),

  -- Sunken Square → The Ratways (down — HIDDEN)
  ('sunken-square',       'down',  'the-ratways',        '', '', false, true),
  ('the-ratways',         'up',    'sunken-square',       '', '', false, false),

  -- The Ratways ↔ The Charnel Pit (south/north)
  ('the-ratways',         'south', 'charnel-pit',        '', '', false, false),
  ('charnel-pit',         'north', 'the-ratways',        '', '', false, false)
) AS v(from_slug, direction, to_slug, target_zone, target_room, is_locked, is_hidden)
WHERE z.slug = 'warrens'
ON CONFLICT (zone_id, from_room_slug, direction) DO NOTHING;
