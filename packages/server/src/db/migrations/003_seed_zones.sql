-- 003_seed_zones.sql — Seed zone data (Refuge + Warrens).

-- ============================================================================
-- The Refuge — persistent hub zone
-- ============================================================================

INSERT INTO zones (id, slug, name, description, level_min, level_max, tier, theme, entry_room_slugs, lifecycle, category, max_players, pvp_enabled, repop_interval_seconds)
VALUES (gen_random_uuid(), 'the-refuge', 'The Refuge',
  'A battered sanctuary carved from the ruins of a collapsed ruin. The last safe haven for those who dare the rifts.',
  1, 100, 1, 'flooded_crypt', '{hearth}', 'persistent', 'hub', 0, false, 0);

-- Refuge rooms
INSERT INTO zone_rooms (id, zone_id, slug, name, description, type, properties, loot_containers, hazards, npcs)
SELECT gen_random_uuid(), z.id, v.slug, v.name, v.description, v.type,
       v.properties::text[], v.loot_containers::jsonb, v.hazards::jsonb, v.npcs::jsonb
FROM zones z, (VALUES
  ('hearth',           'The Hearth',         'A broad stone chamber warmed by a perpetual fire. Scarred adventurers rest on makeshift benches. The air smells of ash and iron.', 'entry',    '{}', '[]', '[]', '[]'),
  ('stash-alcove',     'Stash Alcove',       'A narrow alcove lined with locked chests and hanging satchels. Your belongings are here — what you''ve kept from the depths.',    'corridor', '{}', '[]', '[]', '[]'),
  ('training-grounds', 'Training Grounds',   'A cleared space where weapons ring against practice dummies. Scratched tally marks cover the walls.',                              'corridor', '{}', '[]', '[]', '[]'),
  ('expedition-board', 'The Expedition Board', 'A massive board of pinned notes, sketched maps, and rift coordinates. This is where expeditions begin.',                          'corridor', '{}', '[]', '[]', '[]'),
  ('market',           'The Market',         'Makeshift stalls selling salvaged goods. A gruff quartermaster eyes your coin pouch.',                                              'corridor', '{}', '[]', '[]', '[]'),
  ('infirmary',        'The Infirmary',      'Cots and bandages. A healer tends to the wounded. The smell of poultice lingers.',                                                  'corridor', '{}', '[]', '[]', '[]'),
  ('war-room',         'The War Room',       'A locked chamber where faction leaders meet. Maps of known zones cover the walls.',                                                'corridor', '{}', '[]', '[]', '[]')
) AS v(slug, name, description, type, properties, loot_containers, hazards, npcs)
WHERE z.slug = 'the-refuge';

-- Refuge exits
INSERT INTO zone_exits (id, zone_id, from_room_slug, direction, to_room_slug, target_zone_slug, target_room_slug, locked, hidden)
SELECT gen_random_uuid(), z.id, v.from_slug, v.direction, v.to_slug,
       NULLIF(v.target_zone, ''), NULLIF(v.target_room, ''),
       v.is_locked, v.is_hidden
FROM zones z, (VALUES
  ('hearth',           'east',  'stash-alcove',     '', '', false, false),
  ('stash-alcove',     'west',  'hearth',           '', '', false, false),
  ('hearth',           'north', 'training-grounds', '', '', false, false),
  ('training-grounds', 'south', 'hearth',           '', '', false, false),
  ('hearth',           'west',  'expedition-board', '', '', false, false),
  ('expedition-board', 'east',  'hearth',           '', '', false, false),
  ('hearth',           'south', 'market',           '', '', false, false),
  ('market',           'north', 'hearth',           '', '', false, false),
  ('market',           'east',  'infirmary',        '', '', false, false),
  ('infirmary',        'west',  'market',           '', '', false, false),
  ('training-grounds', 'east',  'war-room',         '', '', false, false),
  ('war-room',         'west',  'training-grounds', '', '', false, false)
) AS v(from_slug, direction, to_slug, target_zone, target_room, is_locked, is_hidden)
WHERE z.slug = 'the-refuge';


-- ============================================================================
-- The Warrens — expanded 100+ room zone
-- ============================================================================

INSERT INTO zones (id, slug, name, description, level_min, level_max, tier, theme, entry_room_slugs, lifecycle, category, max_players, pvp_enabled, repop_interval_seconds)
VALUES (gen_random_uuid(), 'warrens', 'The Warrens',
  'A vast, decaying ruined city stretching far beyond its shattered gate. Winding streets of crumbling tenements give way to a dense slum quarter where desperate creatures claw out survival among the refuse. Beneath the surface, flooded sewers hide worse things still. The sounds of skittering claws and collapsing masonry echo endlessly across the cracked pavement.',
  1, 100, 1, 'flooded_crypt', '{shattered-gate}', 'persistent', 'dungeon', 6, false, 300);

-- ============================================================================
-- 3. Approach Area (~15 rooms) + Slums Grid Rows 1-3 (21 rooms)
-- ============================================================================
INSERT INTO zone_rooms (zone_id, slug, name, description, type, properties, npcs, loot_containers, hazards)
SELECT z.id, v.slug, v.name, v.description, v.type,
       v.properties::text[], v.npcs::jsonb, v.loot_containers::jsonb, v.hazards::jsonb
FROM zones z, (VALUES

  -- =========================================================================
  -- APPROACH AREA — Entry path from the gate into the slums (~15 rooms)
  -- =========================================================================

  -- A1. Shattered Gate (entry) — updated description
  ('shattered-gate',
   'Shattered Gate',
   'A colossal archway, split down its centre by some ancient cataclysm, frames the threshold of a ruined city that sprawls into haze. Rubble spills outward like the city is trying to disgorge its own bones. Wind funnels through the gap, carrying the faint tang of rust and something older — something burnt. Beyond the gate, streets branch in every direction, swallowed by dust and silence.',
   'entry',
   '{heavy_door}',
   '[]',
   '[]',
   '[]'),

  -- A2. Rubble-Choked Boulevard (corridor)
  ('rubble-boulevard',
   'Rubble-Choked Boulevard',
   'A once-grand boulevard stretches deeper into the city, its paving stones heaved upward by roots that died centuries ago. Collapsed facades lean drunkenly against one another, forming accidental tunnels of broken stone. Glass crunches underfoot no matter how carefully you step.',
   'corridor',
   '{}',
   '[{"creatureId": "gutterspawn", "spawnCount": 2}]',
   '[{"id": "boulevard-crate-1", "type": "crate", "items": ["bent_rebar", "gutterspawn_fang"]}]',
   '[{"type": "unstable_rubble", "severity": 0.3}]'),

  -- A3. Overwatch Tower (dead_end)
  ('overwatch-tower',
   'Overwatch Tower',
   'A spiralling stair of crumbling stone leads up through the shell of a watchtower. Half the upper floor has sheered away, offering a vertiginous view over the rooftops of the dead city and the dense slum quarter to the east. Wind howls through the gap. Someone has scratched tally marks into the wall — hundreds of them — in neat, obsessive rows.',
   'dead_end',
   '{}',
   '[]',
   '[{"id": "tower-corpse-1", "type": "corpse", "items": ["charred_street_map", "tarnished_medallion"]}]',
   '[{"type": "unstable_floor", "severity": 0.4}]'),

  -- A4. The Hollow Market (junction)
  ('hollow-market',
   'The Hollow Market',
   'A sunken plaza opens where several streets converge, littered with the skeletal frames of market stalls. Faded awnings hang in tatters. A dry fountain at the centre holds a statue with no face — whether eroded or deliberately defaced, it is impossible to tell. Echoes carry strangely here; sounds from every adjacent street pool in this space like water finding a drain.',
   'junction',
   '{cavern}',
   '[{"creatureId": "rubble_scavenger", "spawnCount": 1}]',
   '[{"id": "market-crate-1", "type": "crate", "items": ["bent_rebar", "scavenger_shiv", "tarnished_medallion"]}]',
   '[]'),

  -- A5. Broken Sanctuary (junction)
  ('broken-sanctuary',
   'Broken Sanctuary',
   'Stone columns, cracked but standing, hold up what remains of a vaulted ceiling. This was a place of worship or governance — the distinction has been erased by time. An altar of dark stone dominates the far wall, its surface scarred by claw marks. The air smells of old incense and fresh blood.',
   'junction',
   '{heavy_door}',
   '[{"creatureId": "hollow_stalker", "spawnCount": 1}]',
   '[{"id": "sanctuary-altar-1", "type": "altar", "items": ["rubble_crusted_vest", "tarnished_medallion", "sanctuary_key"]}]',
   '[]'),

  -- A6. Whispering Alley (corridor)
  ('whispering-alley',
   'Whispering Alley',
   'The buildings press close here, their upper storeys nearly touching overhead. Every sound — your breath, your footfall, the distant crack of settling stone — bounces between the walls until it sounds like a crowd of invisible speakers. Debris forms knee-high barricades at irregular intervals. Something has been dragging things through here.',
   'corridor',
   '{}',
   '[{"creatureId": "gutterspawn", "spawnCount": 3}]',
   '[{"id": "alley-corpse-1", "type": "corpse", "items": ["gutterspawn_fang", "scavenger_shiv", "sanctuary_key"]}]',
   '[]'),

  -- A7. Dustfall Extraction (dead_end)
  ('dustfall-extraction',
   'Dustfall Extraction',
   'A wide intersection where the ruins fall back, leaving an unexpected expanse of open sky. Dust drifts down endlessly from the crumbling buildings above, catching light like grey snow. A half-collapsed pedestrian bridge arches overhead — beneath it, the ground has been swept clean in a perfect circle. This is where the veil thins. This is where you leave.',
   'dead_end',
   '{}',
   '[]',
   '[]',
   '[]'),

  -- A8. Collapsed Overpass (corridor) — NEW
  ('collapsed-overpass',
   'Collapsed Overpass',
   'A highway overpass has buckled and dropped, its concrete deck now forming a long ramp of fractured slabs angled toward the city interior. Rebar juts from the edges like broken ribs. Below, the original street is buried under tonnes of debris, forcing all traffic up and over this precarious bridge of ruin.',
   'corridor',
   '{}',
   '[{"creatureId": "gutterspawn", "spawnCount": 1}]',
   '[]',
   '[{"type": "unstable_rubble", "severity": 0.3}]'),

  -- A9. Burned-Out Chapel (dead_end) — NEW
  ('burned-chapel',
   'Burned-Out Chapel',
   'Fire gutted this small chapel long ago, leaving walls of blackened stone and a roof open to the sky. Charred pews have been shoved against the walls to form crude shelters. The floor is a mosaic of cracked tiles depicting a figure with outstretched arms — now missing its head, the tiles there smashed to powder.',
   'dead_end',
   '{}',
   '[{"creatureId": "slum_rat", "spawnCount": 3}]',
   '[{"id": "chapel-corpse-1", "type": "corpse", "items": ["tarnished_medallion", "rat_tail"]}]',
   '[]'),

  -- A10. Scavenger''s Den (combat) — NEW
  ('scavengers-den',
   'Scavenger''s Den',
   'A cellar entrance, half-hidden by fallen masonry, opens into a low-ceilinged room reeking of cured meat and unwashed bodies. Salvage is piled everywhere — bent pipes, frayed wire, cracked glass sorted into careful heaps. The scavengers who nest here do not appreciate visitors.',
   'combat',
   '{heavy_door}',
   '[{"creatureId": "rubble_scavenger", "spawnCount": 2}]',
   '[{"id": "den-crate-1", "type": "crate", "items": ["scavenger_shiv", "bent_rebar", "tarnished_medallion"]}]',
   '[]'),

  -- A11. Merchant''s Row (corridor) — NEW
  ('merchants-row',
   'Merchant''s Row',
   'A narrow commercial street lined with gutted shopfronts, their signage long since illegible. Display windows gape like empty eye sockets. Broken shelving and scattered inventory — mostly worthless — litter the pavement. The street bends east toward denser habitation, and the smell of rot thickens with each step.',
   'corridor',
   '{}',
   '[{"creatureId": "gutterspawn", "spawnCount": 2}, {"creatureId": "slum_rat", "spawnCount": 2}]',
   '[{"id": "merchant-crate-1", "type": "crate", "items": ["bent_rebar", "rat_tail"]}]',
   '[]'),

  -- A12. Gutter Run (corridor) — NEW
  ('gutter-run',
   'Gutter Run',
   'A drainage channel cuts through the street here, its iron grating long since looted. The channel is dry but stained dark, and the walls on either side are slick with condensation. Rat droppings crunch underfoot in drifts. The passage narrows ahead where a building has partially collapsed into the channel.',
   'corridor',
   '{water}',
   '[{"creatureId": "slum_rat", "spawnCount": 3}]',
   '[]',
   '[{"type": "standing_water", "severity": 0.2}]'),

  -- A13. Blighted Courtyard (junction) — NEW
  ('blighted-courtyard',
   'Blighted Courtyard',
   'Four tenement blocks once enclosed this courtyard; now only three walls stand, the fourth reduced to a slope of rubble that opens onto the slum quarter beyond. A dead tree, bleached white as bone, stands at the centre. Its branches have been hung with scraps of cloth — offerings, warnings, or simply rags left to dry by things that no longer remember the difference.',
   'junction',
   '{}',
   '[{"creatureId": "gutterspawn", "spawnCount": 1}, {"creatureId": "slum_rat", "spawnCount": 2}]',
   '[{"id": "courtyard-crate-1", "type": "crate", "items": ["gutterspawn_fang", "rat_tail", "bent_rebar"]}]',
   '[]'),

  -- A14. Condemned Arch (corridor) — NEW
  ('condemned-arch',
   'Condemned Arch',
   'A stone archway, older than the buildings around it, marks the transition from the approach streets into the dense slum quarter. Cracks web across its keystone, and the walls on either side bulge inward ominously. Someone has scratched the word TURN BACK into the stone in jagged letters. Beyond, the tenements crowd together like teeth in a clenched jaw.',
   'corridor',
   '{}',
   '[{"creatureId": "gutterspawn", "spawnCount": 2}]',
   '[]',
   '[{"type": "unstable_rubble", "severity": 0.2}]'),

  -- A15. Ironmonger''s Ruin (dead_end) — NEW
  ('ironmongers-ruin',
   'Ironmonger''s Ruin',
   'The collapsed remains of a metalworker''s shop, its forge cold for centuries but still radiating a faint chemical smell. Rusted tools hang from wall pegs — tongs, hammers, files — most too corroded to use but a few still holding an edge. The back wall has caved in, revealing a pocket of darkness beyond where something small scrabbles and squeaks.',
   'dead_end',
   '{}',
   '[{"creatureId": "slum_rat", "spawnCount": 2}]',
   '[{"id": "ironmonger-chest-1", "type": "chest", "items": ["bent_rebar", "scavenger_shiv", "rat_tail"]}]',
   '[]'),

  -- =========================================================================
  -- SLUMS GRID — Row 1 (slum-r1c1 through slum-r1c7)
  -- =========================================================================

  -- R1C1
  ('slum-r1c1',
   'Rat-Gnawed Doorway',
   'A sagging doorframe opens onto a cramped landing where the plaster walls have been chewed to the lath. Shredded fabric and gnawed bones litter the floor in equal measure. The air is thick with the musk of vermin, and tiny eyes glint from cracks in the baseboards.',
   'combat',
   '{}',
   '[{"creatureId": "slum_rat", "spawnCount": 3}]',
   '[{"id": "r1c1-corpse-1", "type": "corpse", "items": ["rat_tail", "rat_tail"]}]',
   '[]'),

  -- R1C2
  ('slum-r1c2',
   'Collapsed Washing Line',
   'Clotheslines sag between the upper floors of two leaning tenements, draped with rags that have fused into stiff grey sheets. The alley below is barely shoulder-width, its cobbles slick with runoff. A gutterspawn has made a nest in the tangle of laundry overhead, hissing at anyone who passes beneath.',
   'combat',
   '{}',
   '[{"creatureId": "gutterspawn", "spawnCount": 1}, {"creatureId": "slum_rat", "spawnCount": 2}]',
   '[]',
   '[]'),

  -- R1C3
  ('slum-r1c3',
   'Broken Stairwell',
   'A stairwell spirals upward through a gutted tenement, every other step missing or cracked through. The banister is long gone, salvaged for fuel or weapons. Something has been nesting on the landing above — the smell is unmistakable, a cloying mix of rot and animal heat.',
   'combat',
   '{}',
   '[{"creatureId": "gutterspawn", "spawnCount": 2}]',
   '[{"id": "r1c3-crate-1", "type": "crate", "items": ["gutterspawn_fang", "bent_rebar"]}]',
   '[{"type": "unstable_rubble", "severity": 0.2}]'),

  -- R1C4
  ('slum-r1c4',
   'Ash-Choked Landing',
   'A thick layer of pale ash blankets this landing, undisturbed except for a single trail of footprints leading to and from the stairs. The walls are scorched black above waist height. Whatever fire swept through here burned hot enough to fuse the window glass into opaque lumps.',
   'combat',
   '{}',
   '[{"creatureId": "slum_rat", "spawnCount": 2}, {"creatureId": "gutterspawn", "spawnCount": 1}]',
   '[{"id": "r1c4-corpse-1", "type": "corpse", "items": ["tarnished_medallion", "rat_tail"]}]',
   '[]'),

  -- R1C5
  ('slum-r1c5',
   'Rotting Lean-To',
   'Sheets of corrugated metal and splintered planks have been propped against a crumbling wall to form a crude shelter. The interior reeks of damp and mildew. Scavenger tools — a bent pry bar, a sack of salvage — suggest recent occupation, but the occupant is nowhere in sight.',
   'combat',
   '{}',
   '[{"creatureId": "rubble_scavenger", "spawnCount": 1}, {"creatureId": "slum_rat", "spawnCount": 2}]',
   '[{"id": "r1c5-crate-1", "type": "crate", "items": ["scavenger_shiv", "rat_tail"]}]',
   '[]'),

  -- R1C6
  ('slum-r1c6',
   'Cracked Cistern Alcove',
   'A stone cistern, split down one side, sits in a recessed alcove between two tenements. Stagnant water pools at its base, breeding clouds of pale insects. The walls are slick with moisture, and the cobbles here are treacherously smooth beneath a film of green algae.',
   'combat',
   '{water}',
   '[{"creatureId": "gutterspawn", "spawnCount": 1}, {"creatureId": "slum_rat", "spawnCount": 2}]',
   '[]',
   '[{"type": "standing_water", "severity": 0.2}]'),

  -- R1C7
  ('slum-r1c7',
   'Boarded Shopfront',
   'Heavy planks have been nailed across the front of this shop, but something has torn through them from inside, leaving jagged splinters framing a dark opening. Shelves within are overturned, their contents long since looted. The back room is pitch dark, and from it comes the sound of claws on stone.',
   'combat',
   '{heavy_door}',
   '[{"creatureId": "gutterspawn", "spawnCount": 2}]',
   '[{"id": "r1c7-crate-1", "type": "crate", "items": ["bent_rebar", "gutterspawn_fang", "rat_tail"]}]',
   '[]'),

  -- =========================================================================
  -- SLUMS GRID — Row 2 (slum-r2c1 through slum-r2c7)
  -- =========================================================================

  -- R2C1
  ('slum-r2c1',
   'Leaning Tenement Stoop',
   'The front stoop of a tenement that has shifted ten degrees off plumb, its doorframe a parallelogram. Cracks zigzag up the facade like lightning frozen in stone. Rats boil out of the gap beneath the stoop at the slightest disturbance, a chittering grey tide.',
   'combat',
   '{}',
   '[{"creatureId": "slum_rat", "spawnCount": 3}]',
   '[{"id": "r2c1-corpse-1", "type": "corpse", "items": ["rat_tail", "rat_tail", "tarnished_medallion"]}]',
   '[]'),

  -- R2C2
  ('slum-r2c2',
   'Refuse-Choked Passage',
   'Garbage has accumulated in this narrow passage to knee height — rotting cloth, broken crockery, unidentifiable organic matter compressed into a foul-smelling stratum. The walls are close enough to touch with outstretched arms. Movement in the refuse suggests it is not entirely uninhabited.',
   'combat',
   '{}',
   '[{"creatureId": "slum_rat", "spawnCount": 2}, {"creatureId": "gutterspawn", "spawnCount": 1}]',
   '[]',
   '[]'),

  -- R2C3
  ('slum-r2c3',
   'Splintered Barricade',
   'Someone built a barricade here from furniture, doors, and wagon parts, blocking the passage between two tenement rows. It has been smashed through from the east side, planks jutting outward like broken bones. Whatever came through did so with considerable force and no concern for stealth.',
   'combat',
   '{heavy_door}',
   '[{"creatureId": "gutterspawn", "spawnCount": 2}]',
   '[{"id": "r2c3-crate-1", "type": "crate", "items": ["scavenger_shiv", "gutterspawn_fang"]}]',
   '[{"type": "unstable_rubble", "severity": 0.2}]'),

  -- R2C4
  ('slum-r2c4',
   'Shattered Window Row',
   'A row of tenements stretches along this section, every window blown out. Glass crunches in drifts against the building fronts. Wind whistles through the empty frames, creating a discordant chorus that rises and falls with each gust. Dark shapes move behind the openings on the upper floors.',
   'combat',
   '{}',
   '[{"creatureId": "gutterspawn", "spawnCount": 1}, {"creatureId": "slum_rat", "spawnCount": 2}]',
   '[{"id": "r2c4-corpse-1", "type": "corpse", "items": ["bent_rebar", "rat_tail"]}]',
   '[]'),

  -- R2C5
  ('slum-r2c5',
   'Gutted Bakery',
   'The remains of a bakery, its ovens torn open and brick scattered across the floor. Flour dust still coats every surface, ghostly white, disturbed only by the tracks of creatures that have made this place their larder. A half-collapsed counter serves as a barricade, and behind it something chews wetly on what might once have been bread — or might not.',
   'combat',
   '{}',
   '[{"creatureId": "rubble_scavenger", "spawnCount": 1}, {"creatureId": "slum_rat", "spawnCount": 2}]',
   '[{"id": "r2c5-crate-1", "type": "crate", "items": ["rat_tail", "tarnished_medallion"]}]',
   '[]'),

  -- R2C6
  ('slum-r2c6',
   'Sagging Roofline Walk',
   'The roofs of adjacent tenements have sagged together, creating a sheltered walkway between upper floors. Tiles shift underfoot with each step, threatening to give way entirely. The view from up here reveals the slum quarter stretching in every direction — a maze of crumbling walls and dark alleys.',
   'combat',
   '{}',
   '[{"creatureId": "gutterspawn", "spawnCount": 2}]',
   '[]',
   '[{"type": "unstable_floor", "severity": 0.3}]'),

  -- R2C7
  ('slum-r2c7',
   'Rusty Pipe Junction',
   'A tangle of exposed pipes — water, sewage, unknowable purpose — bursts from the wall where a tenement has partially collapsed, spraying thin streams of brackish water across the passage. The floor is perpetually wet, and the metallic smell of corroded iron fills the air. Rats drink from the puddles without apparent concern.',
   'combat',
   '{water}',
   '[{"creatureId": "slum_rat", "spawnCount": 3}]',
   '[{"id": "r2c7-corpse-1", "type": "corpse", "items": ["bent_rebar", "rat_tail"]}]',
   '[{"type": "standing_water", "severity": 0.2}]'),

  -- =========================================================================
  -- SLUMS GRID — Row 3 (slum-r3c1 through slum-r3c7)
  -- =========================================================================

  -- R3C1
  ('slum-r3c1',
   'Caved-In Pantry',
   'The ground floor of this tenement has partially collapsed into its cellar, revealing a pantry stocked with jars of unidentifiable preserved matter. The jars are intact but their contents have darkened to black. Rats have chewed through the wooden shelving, and their droppings coat every surface.',
   'combat',
   '{}',
   '[{"creatureId": "slum_rat", "spawnCount": 2}, {"creatureId": "gutterspawn", "spawnCount": 1}]',
   '[{"id": "r3c1-crate-1", "type": "crate", "items": ["rat_tail", "gutterspawn_fang"]}]',
   '[{"type": "unstable_rubble", "severity": 0.2}]'),

  -- R3C2
  ('slum-r3c2',
   'Vermin Nest Alcove',
   'A recessed alcove between two buildings has become a massive rat nest — a shoulder-high mound of shredded fabric, gnawed wood, and matted fur. The nest pulses faintly with movement. Disturbing it would be unwise, but the glint of something metallic near its base is difficult to ignore.',
   'combat',
   '{}',
   '[{"creatureId": "slum_rat", "spawnCount": 3}]',
   '[{"id": "r3c2-corpse-1", "type": "corpse", "items": ["rat_tail", "rat_tail", "tarnished_medallion"]}]',
   '[]'),

  -- R3C3
  ('slum-r3c3',
   'Puddle-Slicked Crossing',
   'Two alleys intersect here in a shallow depression that collects rainwater and runoff. The puddles are deep enough to hide the cobbles, and the water has a faintly iridescent sheen. Sounds echo oddly off the wet stone — a footstep sounds like two, a drip like a drum.',
   'combat',
   '{water}',
   '[{"creatureId": "gutterspawn", "spawnCount": 2}]',
   '[]',
   '[{"type": "standing_water", "severity": 0.2}]'),

  -- R3C4
  ('slum-r3c4',
   'Crooked Balcony Landing',
   'An exterior balcony, ripped from its upper-floor moorings, now leans against the opposite building at a steep angle, forming a precarious ramp. The ironwork railing is twisted into abstract shapes. Below the ramp, a gutterspawn has claimed the shadowed space as territory, surrounding itself with a ring of gnawed bones.',
   'combat',
   '{}',
   '[{"creatureId": "gutterspawn", "spawnCount": 1}, {"creatureId": "slum_rat", "spawnCount": 2}]',
   '[{"id": "r3c4-crate-1", "type": "crate", "items": ["gutterspawn_fang", "bent_rebar"]}]',
   '[]'),

  -- R3C5
  ('slum-r3c5',
   'Ransacked Dwelling',
   'This ground-floor dwelling has been torn apart — furniture overturned, floorboards pried up, even the walls hacked open in places. Whoever searched here was thorough but not tidy. Plaster dust coats everything, and the air tastes of chalk. A trail of bloody paw prints leads from the shattered front door into the back room.',
   'combat',
   '{}',
   '[{"creatureId": "rubble_scavenger", "spawnCount": 1}]',
   '[{"id": "r3c5-crate-1", "type": "crate", "items": ["scavenger_shiv", "tarnished_medallion", "rat_tail"]}]',
   '[]'),

  -- R3C6
  ('slum-r3c6',
   'Ash-Streaked Alley',
   'Pale ash drifts along this alley in low, wind-pushed waves, collecting in doorways and against walls. The source is unclear — perhaps a fire deeper in the slums, perhaps something else. Footprints appear and vanish in the ash. The silence here feels deliberate, as if the alley itself is holding its breath.',
   'combat',
   '{}',
   '[{"creatureId": "gutterspawn", "spawnCount": 1}, {"creatureId": "slum_rat", "spawnCount": 2}]',
   '[]',
   '[]'),

  -- R3C7
  ('slum-r3c7',
   'Makeshift Barricade',
   'A wall of salvaged debris — doors, shutters, bent sheet metal, a rusted bed frame — blocks the alley here, forcing passage through a narrow gap barely wide enough to squeeze through sideways. On the far side, the remains of a campfire and scattered bones suggest this was a defended position. The defenders are gone. What they were defending against is not.',
   'combat',
   '{heavy_door}',
   '[{"creatureId": "gutterspawn", "spawnCount": 2}, {"creatureId": "slum_rat", "spawnCount": 2}]',
   '[{"id": "r3c7-crate-1", "type": "crate", "items": ["gutterspawn_fang", "scavenger_shiv", "rat_tail"]}]',
   '[{"type": "unstable_rubble", "severity": 0.2}]')

) AS v(slug, name, description, type, properties, npcs, loot_containers, hazards)
WHERE z.slug = 'warrens'
ON CONFLICT (zone_id, slug) DO NOTHING;

-- Phase 2: Slum grid rows 4-7, sewer level
-- Idempotent: uses INSERT ... ON CONFLICT DO NOTHING so re-running is safe.

-- ============================================================================
-- SLUM GRID ROWS 4–7 (28 rooms)
-- ============================================================================

INSERT INTO zone_rooms (zone_id, slug, name, description, type, properties, npcs, loot_containers, hazards)
SELECT z.id, v.slug, v.name, v.description, v.type,
       v.properties::text[], v.npcs::jsonb, v.loot_containers::jsonb, v.hazards::jsonb
FROM zones z, (VALUES

  -- ── Row 4 ──────────────────────────────────────────────────────────────────

  ('slum-r4c1',
   'Grime-Caked Stoop',
   'A buckled stone staircase descends from a doorway that no longer leads anywhere, its upper floors long since caved in. Grease-black mould blooms across every surface, and the reek of stale urine clings to the air. Something has been nesting in the rubble beneath the lowest step.',
   'combat',
   '{}',
   '[{"creatureId": "gutterspawn", "spawnCount": 2}, {"creatureId": "slum_rat", "spawnCount": 2}]',
   '[{"id": "r4c1-crate-1", "type": "crate", "items": ["bent_rebar", "gutterspawn_fang"]}]',
   '[{"type": "unstable_rubble", "severity": 0.2}]'),

  ('slum-r4c2',
   'The Pinch',
   'Two listing tenements lean toward one another until their upper storeys almost kiss, squeezing the passage below into a gap barely wide enough for one. Laundry lines strung between the buildings hold nothing but frayed rope and bird bones. The shadows here are thick and smell of wet ash.',
   'combat',
   '{}',
   '[{"creatureId": "slum_rat", "spawnCount": 3}, {"creatureId": "gutterspawn", "spawnCount": 1}]',
   '[{"id": "r4c2-sack-1", "type": "crate", "items": ["rat_tail", "scavenger_shiv"]}]',
   '[]'),

  ('slum-r4c3',
   'Ashfall Tenement',
   'A fire gutted this building decades ago but the walls still stand, blackened and brittle. Soot coats everything in a fine grey powder that puffs into the air with each step. Charred furniture has been stacked into crude barricades across the interior doorways.',
   'combat',
   '{}',
   '[{"creatureId": "gutterspawn", "spawnCount": 1}, {"creatureId": "slum_rat", "spawnCount": 2}]',
   '[{"id": "r4c3-corpse-1", "type": "corpse", "items": ["tarnished_medallion", "bent_rebar"]}]',
   '[]'),

  ('slum-r4c4',
   'Blighted Courtyard',
   'A cramped interior courtyard surrounded by sagging balconies. Pools of stagnant rainwater collect in the cracked paving stones, each one scummed with a sickly iridescent film. Rats scatter at the edges of vision, always just out of reach.',
   'combat',
   '{water}',
   '[{"creatureId": "slum_rat", "spawnCount": 3}, {"creatureId": "gutterspawn", "spawnCount": 1}]',
   '[{"id": "r4c4-crate-1", "type": "crate", "items": ["rat_tail", "gutterspawn_fang"]}]',
   '[{"type": "standing_water", "severity": 0.2}]'),

  ('slum-r4c5',
   'Gallows Lean',
   'An iron lamppost, bent at a grotesque angle, juts from the cobblestones like a crooked finger. Knotted ropes dangle from its crossbar, frayed by weather and teeth. The surrounding buildings list away from it as though trying to avert their gaze.',
   'combat',
   '{}',
   '[{"creatureId": "gutterspawn", "spawnCount": 2}, {"creatureId": "slum_rat", "spawnCount": 2}]',
   '[{"id": "r4c5-corpse-1", "type": "corpse", "items": ["scavenger_shiv", "rat_tail"]}]',
   '[]'),

  ('slum-r4c6',
   'Mildew Row',
   'A terrace of identical dwellings stretches along the lane, every surface furred with grey-green mildew. The doors hang open on rusted hinges, revealing interiors choked with damp plaster and rotting fabric. The air is thick enough to taste — sour, organic, clinging.',
   'combat',
   '{water}',
   '[{"creatureId": "slum_rat", "spawnCount": 3}]',
   '[{"id": "r4c6-sack-1", "type": "crate", "items": ["bent_rebar", "rat_tail"]}]',
   '[{"type": "standing_water", "severity": 0.2}]'),

  ('slum-r4c7',
   'The Gutter Shrine',
   'Amid the squalor, someone has arranged shards of coloured glass, bent nails, and small animal skulls into an elaborate pattern on a flat stone. Offerings of salvaged wire and tallow stubs surround it. The gutterspawn give this place a wide berth — or perhaps they guard it.',
   'combat',
   '{}',
   '[{"creatureId": "gutterspawn", "spawnCount": 2}, {"creatureId": "rubble_scavenger", "spawnCount": 1}]',
   '[{"id": "r4c7-altar-1", "type": "crate", "items": ["tarnished_medallion", "gutterspawn_fang", "scavenger_shiv"]}]',
   '[{"type": "unstable_rubble", "severity": 0.2}]'),

  -- ── Row 5 ──────────────────────────────────────────────────────────────────

  ('slum-r5c1',
   'Scrapheap Alley',
   'Salvaged metal has been piled head-high on both sides of this narrow passage — twisted rebar, flattened cans, coils of blackened wire. The heaps shift and groan in the wind, threatening to collapse inward. Rats nest deep inside the metal, their eyes catching the light like scattered embers.',
   'combat',
   '{}',
   '[{"creatureId": "slum_rat", "spawnCount": 3}, {"creatureId": "rubble_scavenger", "spawnCount": 1}]',
   '[{"id": "r5c1-crate-1", "type": "crate", "items": ["bent_rebar", "scavenger_shiv"]}]',
   '[{"type": "unstable_rubble", "severity": 0.2}]'),

  ('slum-r5c2',
   'Drowned Cellar Mouth',
   'A square hole in the pavement reveals a flooded cellar below, its dark water level lapping just a hand-span beneath the street. Bubbles rise intermittently from the depths, each one releasing a sulphurous belch. The stones around the opening are slick with algae.',
   'combat',
   '{water}',
   '[{"creatureId": "gutterspawn", "spawnCount": 2}, {"creatureId": "slum_rat", "spawnCount": 2}]',
   '[{"id": "r5c2-crate-1", "type": "crate", "items": ["rat_tail", "gutterspawn_fang"]}]',
   '[{"type": "standing_water", "severity": 0.2}]'),

  ('slum-r5c3',
   'Charcoal Stacks',
   'Heaps of charcoal — the remnants of demolished buildings burned for fuel — line this stretch of lane like black snowdrifts. Every footstep sinks ankle-deep, raising clouds of fine carbon dust that coats the lungs. The gutterspawn here are smeared head to foot in the stuff, nearly invisible in the gloom.',
   'combat',
   '{}',
   '[{"creatureId": "gutterspawn", "spawnCount": 2}, {"creatureId": "slum_rat", "spawnCount": 2}]',
   '[{"id": "r5c3-sack-1", "type": "crate", "items": ["gutterspawn_fang", "tarnished_medallion"]}]',
   '[]'),

  ('slum-r5c4',
   'The Cage Walk',
   'Iron cages — livestock pens, perhaps, or something worse — line both sides of this alley, their doors hanging open. The bars are scratched bright where something has tested them repeatedly. A narrow walkway threads between the cages, barely wide enough to pass without brushing the rust-flaked metal.',
   'combat',
   '{heavy_door}',
   '[{"creatureId": "gutterspawn", "spawnCount": 1}, {"creatureId": "slum_rat", "spawnCount": 3}]',
   '[{"id": "r5c4-crate-1", "type": "crate", "items": ["bent_rebar", "rat_tail", "scavenger_shiv"]}]',
   '[]'),

  ('slum-r5c5',
   'Blackened Hearth',
   'The remains of a communal firepit dominate this small clearing between buildings. Scorched stones ring a crater of cold ash and half-burned bone. The surrounding walls are streaked with soot in patterns that almost look deliberate — spirals, concentric circles, shapes that might once have meant something.',
   'combat',
   '{}',
   '[{"creatureId": "slum_rat", "spawnCount": 2}, {"creatureId": "gutterspawn", "spawnCount": 1}]',
   '[{"id": "r5c5-corpse-1", "type": "corpse", "items": ["tarnished_medallion", "rat_tail"]}]',
   '[]'),

  ('slum-r5c6',
   'Rag-Curtain Lane',
   'Strips of cloth — torn blankets, shredded clothing, unidentifiable fabric stiff with old stains — hang from lines strung between the buildings, creating a maze of grimy curtains. Visibility is arm''s length at best. Things move behind the rags, displacing them with the faintest rustle.',
   'combat',
   '{}',
   '[{"creatureId": "gutterspawn", "spawnCount": 2}, {"creatureId": "slum_rat", "spawnCount": 2}]',
   '[{"id": "r5c6-sack-1", "type": "crate", "items": ["scavenger_shiv", "gutterspawn_fang"]}]',
   '[{"type": "unstable_rubble", "severity": 0.2}]'),

  ('slum-r5c7',
   'Hollow-Eyed Row',
   'A line of tenements stares down at the lane through empty window sockets, every pane of glass long since shattered. The interiors are dark voids that seem to breathe — a faint current of foul air exhales from each opening. Scratch marks around the window frames suggest things climb in and out after dark.',
   'combat',
   '{}',
   '[{"creatureId": "slum_rat", "spawnCount": 3}, {"creatureId": "gutterspawn", "spawnCount": 1}]',
   '[{"id": "r5c7-crate-1", "type": "crate", "items": ["rat_tail", "bent_rebar"]}]',
   '[]'),

  -- ── Row 6 ──────────────────────────────────────────────────────────────────

  ('slum-r6c1',
   'Ironmonger''s Ruin',
   'A collapsed workshop spills its contents across the lane — anvils half-buried in rubble, tongs fused together by rust, ingots of corroded metal stacked against a wall that is no longer there. The forge chimney still stands, a solitary pillar of blackened brick rising from the wreckage.',
   'combat',
   '{heavy_door}',
   '[{"creatureId": "rubble_scavenger", "spawnCount": 1}, {"creatureId": "slum_rat", "spawnCount": 2}]',
   '[{"id": "r6c1-crate-1", "type": "crate", "items": ["bent_rebar", "scavenger_shiv", "tarnished_medallion"]}]',
   '[]'),

  ('slum-r6c2',
   'The Filth Trough',
   'A drainage channel runs down the centre of this sunken lane, clogged with decades of accumulated refuse. The sewage has congealed into a black, semi-solid mass that squelches underfoot. Flies swarm in thick, lazy clouds, and the stench is a physical force that pushes against the back of the throat.',
   'combat',
   '{water}',
   '[{"creatureId": "slum_rat", "spawnCount": 3}, {"creatureId": "gutterspawn", "spawnCount": 1}]',
   '[{"id": "r6c2-sack-1", "type": "crate", "items": ["rat_tail", "gutterspawn_fang"]}]',
   '[{"type": "standing_water", "severity": 0.2}]'),

  ('slum-r6c3',
   'Broken Stair Landing',
   'A wide exterior staircase, once connecting street level to a raised terrace, has crumbled into a slope of fractured stone. The landing at the top still holds, offering a vantage point over the surrounding rooftops. Gutterspawn have fortified it with scavenged planks and wire.',
   'combat',
   '{}',
   '[{"creatureId": "gutterspawn", "spawnCount": 2}, {"creatureId": "slum_rat", "spawnCount": 2}]',
   '[{"id": "r6c3-crate-1", "type": "crate", "items": ["bent_rebar", "gutterspawn_fang"]}]',
   '[{"type": "unstable_rubble", "severity": 0.2}]'),

  ('slum-r6c4',
   'Fever Alley',
   'The air here hangs unnaturally still and warm, trapped between windowless walls that radiate stored heat even at night. Puddles of condensation collect in every hollow. The residents of this lane — before they vanished — scratched tallies on the walls. The tallies stop abruptly, all at the same count.',
   'combat',
   '{water}',
   '[{"creatureId": "gutterspawn", "spawnCount": 2}, {"creatureId": "slum_rat", "spawnCount": 2}]',
   '[{"id": "r6c4-corpse-1", "type": "corpse", "items": ["tarnished_medallion", "rat_tail"]}]',
   '[{"type": "standing_water", "severity": 0.2}]'),

  ('slum-r6c5',
   'Coffin Narrows',
   'This passage is so tight that shoulders brush both walls simultaneously. The buildings on either side are windowless at ground level — blank expanses of stained concrete that press in like the sides of a sarcophagus. The only light falls from a sliver of sky far above.',
   'combat',
   '{}',
   '[{"creatureId": "slum_rat", "spawnCount": 3}, {"creatureId": "gutterspawn", "spawnCount": 1}]',
   '[{"id": "r6c5-sack-1", "type": "crate", "items": ["scavenger_shiv", "rat_tail"]}]',
   '[]'),

  ('slum-r6c6',
   'Sootfall Corner',
   'Where two alleys meet at a sharp angle, a perpetual rain of fine black soot drifts down from a crumbling chimney stack high above. The ground is carpeted in the stuff, soft and ankle-deep. Footprints — human, rat, and something with too many toes — crisscross the dark powder.',
   'combat',
   '{}',
   '[{"creatureId": "gutterspawn", "spawnCount": 1}, {"creatureId": "slum_rat", "spawnCount": 3}]',
   '[{"id": "r6c6-crate-1", "type": "crate", "items": ["gutterspawn_fang", "bent_rebar"]}]',
   '[]'),

  ('slum-r6c7',
   'The Choking Yard',
   'A square of packed earth enclosed by leaning walls, choked with heaps of mouldering refuse and tangled wire. The air is thick with particulate — fibres, dust, ash — that catches in the throat and turns every breath into a wheeze. Rats have tunnelled through the garbage, creating a warren within the Warren.',
   'combat',
   '{}',
   '[{"creatureId": "slum_rat", "spawnCount": 3}, {"creatureId": "rubble_scavenger", "spawnCount": 1}]',
   '[{"id": "r6c7-crate-1", "type": "crate", "items": ["rat_tail", "scavenger_shiv", "tarnished_medallion"]}]',
   '[{"type": "unstable_rubble", "severity": 0.2}]'),

  -- ── Row 7 ──────────────────────────────────────────────────────────────────

  ('slum-r7c1',
   'Slop Gutter Bend',
   'The lane curves sharply around the foundation of a collapsed tower, its gutter swollen with a sluggish stream of grey-brown runoff. The liquid is warm to the touch and reeks of lye. Rats drink from it without apparent harm, their eyes reflecting a faint, unhealthy luminescence.',
   'combat',
   '{water}',
   '[{"creatureId": "slum_rat", "spawnCount": 3}, {"creatureId": "gutterspawn", "spawnCount": 1}]',
   '[{"id": "r7c1-sack-1", "type": "crate", "items": ["rat_tail", "bent_rebar"]}]',
   '[{"type": "standing_water", "severity": 0.2}]'),

  ('slum-r7c2',
   'The Dead Lantern',
   'A corroded iron lantern, twice the height of a person, stands at the centre of a small crossroads. Its glass panels are shattered, its fuel reservoir dry, but someone keeps placing candle stubs inside it — fresh wax pools at its base. The surrounding buildings have been marked with crude warning symbols.',
   'combat',
   '{}',
   '[{"creatureId": "gutterspawn", "spawnCount": 2}, {"creatureId": "slum_rat", "spawnCount": 2}]',
   '[{"id": "r7c2-crate-1", "type": "crate", "items": ["tarnished_medallion", "gutterspawn_fang"]}]',
   '[]'),

  ('slum-r7c3',
   'Vermin Court',
   'A recessed alcove between three buildings forms a natural amphitheatre of filth. The ground writhes with rats — not fleeing, not hiding, but massing. They flow around obstacles like dark water, their collective movement producing a sound like rainfall on dry leaves. The walls are gnawed smooth.',
   'combat',
   '{}',
   '[{"creatureId": "slum_rat", "spawnCount": 3}, {"creatureId": "gutterspawn", "spawnCount": 2}]',
   '[{"id": "r7c3-corpse-1", "type": "corpse", "items": ["rat_tail", "scavenger_shiv", "gutterspawn_fang"]}]',
   '[]'),

  ('slum-r7c4',
   'Cracked Basin Hollow',
   'A stone cistern, split clean in half by some seismic event, sits in the centre of a small square. Water still seeps from a pipe in its base, filling the lower half of the basin and overflowing into the cracked paving. The water is surprisingly clear — the rats avoid it.',
   'combat',
   '{water}',
   '[{"creatureId": "gutterspawn", "spawnCount": 2}, {"creatureId": "slum_rat", "spawnCount": 2}]',
   '[{"id": "r7c4-crate-1", "type": "crate", "items": ["bent_rebar", "tarnished_medallion"]}]',
   '[{"type": "standing_water", "severity": 0.2}]'),

  ('slum-r7c5',
   'Tallow-Smoke Run',
   'A persistent haze of greasy yellow smoke drifts through this lane, emanating from a makeshift tallow-rendering pit dug into the floor of a ruined shop. The fat still bubbles sluggishly, heated by some source deep below. Visibility is poor and every surface is slick with condensed grease.',
   'combat',
   '{}',
   '[{"creatureId": "slum_rat", "spawnCount": 2}, {"creatureId": "gutterspawn", "spawnCount": 2}]',
   '[{"id": "r7c5-sack-1", "type": "crate", "items": ["scavenger_shiv", "rat_tail"]}]',
   '[{"type": "unstable_rubble", "severity": 0.2}]'),

  ('slum-r7c6',
   'Beggar''s Alcove',
   'A deep recess in a crumbling wall has been curtained off with layers of scavenged cloth and flattened tin. Inside, the remains of a camp — a bedroll of rags, a ring of stones around cold ash, scratched marks on the wall counting days. The occupant is gone. The rats have moved in.',
   'combat',
   '{}',
   '[{"creatureId": "slum_rat", "spawnCount": 3}, {"creatureId": "rubble_scavenger", "spawnCount": 1}]',
   '[{"id": "r7c6-corpse-1", "type": "corpse", "items": ["tarnished_medallion", "rat_tail", "bent_rebar"]}]',
   '[]'),

  ('slum-r7c7',
   'The Last Ditch',
   'The slum grid terminates here at a deep trench carved across the lane — a defensive measure, long abandoned. The far side has collapsed into rubble, but the ditch itself has filled with stagnant water and refuse, forming a fetid moat. Things move beneath its surface.',
   'combat',
   '{water}',
   '[{"creatureId": "gutterspawn", "spawnCount": 2}, {"creatureId": "slum_rat", "spawnCount": 3}]',
   '[{"id": "r7c7-crate-1", "type": "crate", "items": ["gutterspawn_fang", "rat_tail", "scavenger_shiv"]}]',
   '[{"type": "standing_water", "severity": 0.2}]')

) AS v(slug, name, description, type, properties, npcs, loot_containers, hazards)
WHERE z.slug = 'warrens'
ON CONFLICT (zone_id, slug) DO NOTHING;

-- ============================================================================
-- UNDERGROUND SEWER LEVEL (20 rooms)
-- ============================================================================

INSERT INTO zone_rooms (zone_id, slug, name, description, type, properties, npcs, loot_containers, hazards)
SELECT z.id, v.slug, v.name, v.description, v.type,
       v.properties::text[], v.npcs::jsonb, v.loot_containers::jsonb, v.hazards::jsonb
FROM zones z, (VALUES

  -- ── Sewer Junctions & Corridors ────────────────────────────────────────────

  ('sewer-main-junction',
   'Main Drainage Junction',
   'Four tunnels converge into a circular chamber where the ceiling vaults upward into a crumbling dome. Ankle-deep water swirls in a slow vortex around a central drain grate, half-clogged with debris. The sound is deafening — the echo of a dozen water sources merging into a single, sustained roar. Faded directional markers are barely visible on the walls, painted in a language no one speaks anymore.',
   'junction',
   '{water,cavern}',
   '[{"creatureId": "gutterspawn", "spawnCount": 3}, {"creatureId": "slum_rat", "spawnCount": 3}]',
   '[{"id": "sewer-jnc-crate-1", "type": "crate", "items": ["corroded_pipe", "bent_rebar", "tarnished_medallion"]}]',
   '[{"type": "standing_water", "severity": 0.4}]'),

  ('sewer-north-tunnel',
   'Northern Drain Tunnel',
   'A long, straight tunnel stretches into darkness, its arched ceiling slick with condensation that drips in a ceaseless patter. The floor slopes gently downward, channelling a thin stream of dark water along a central groove. The walls are lined with pipes of varying diameter, some still groaning with pressure, others burst open and dry.',
   'corridor',
   '{water,low_ceiling}',
   '[{"creatureId": "gutterspawn", "spawnCount": 3}, {"creatureId": "slum_rat", "spawnCount": 2}]',
   '[{"id": "sewer-nth-sack-1", "type": "crate", "items": ["corroded_pipe", "gutterspawn_fang"]}]',
   '[{"type": "low_ceiling", "severity": 0.3}, {"type": "standing_water", "severity": 0.4}]'),

  ('sewer-south-tunnel',
   'Southern Drain Tunnel',
   'This tunnel curves gently to the south, its walls narrowing as the ceiling dips lower. Water streams along the floor in a sheet barely a finger deep but bitterly cold. The brickwork here is older — hand-laid stone rather than poured concrete — and covered in a pale, bioluminescent moss that provides a faint, sickly glow.',
   'corridor',
   '{water,low_ceiling}',
   '[{"creatureId": "sewer_lurker", "spawnCount": 1}, {"creatureId": "slum_rat", "spawnCount": 3}]',
   '[{"id": "sewer-sth-crate-1", "type": "crate", "items": ["corroded_pipe", "rat_tail"]}]',
   '[{"type": "low_ceiling", "severity": 0.3}, {"type": "standing_water", "severity": 0.4}]'),

  ('sewer-east-conduit',
   'Eastern Conduit',
   'A narrow conduit bored through solid rock, its walls scored with the circular marks of the machine that carved it. The air is stale and tastes of iron. A single pipe runs along the ceiling, leaking at every joint, creating a curtain of drips that soaks anything passing beneath. The floor is treacherous with algae.',
   'corridor',
   '{water}',
   '[{"creatureId": "gutterspawn", "spawnCount": 3}, {"creatureId": "slum_rat", "spawnCount": 2}]',
   '[{"id": "sewer-east-sack-1", "type": "crate", "items": ["bent_rebar", "corroded_pipe"]}]',
   '[{"type": "standing_water", "severity": 0.4}]'),

  ('sewer-west-conduit',
   'Western Conduit',
   'A wide, low-ceilinged passage runs west, its floor submerged beneath knee-deep water that hides the footing. The water is opaque and warm — heated by something deep below. Bubbles surface at irregular intervals, each one popping with a faint hiss and the smell of methane.',
   'corridor',
   '{water,low_ceiling}',
   '[{"creatureId": "sewer_lurker", "spawnCount": 1}, {"creatureId": "gutterspawn", "spawnCount": 2}]',
   '[{"id": "sewer-west-crate-1", "type": "crate", "items": ["corroded_pipe", "scavenger_shiv"]}]',
   '[{"type": "standing_water", "severity": 0.4}, {"type": "toxic_gas", "severity": 0.3}]'),

  ('sewer-deep-channel',
   'The Deep Channel',
   'The tunnel floor drops away into a channel of fast-moving water, black and fathomless. A narrow ledge of crumbling brick runs along one wall — the only path forward. The current carries debris past at alarming speed: splintered wood, tangles of wire, and occasionally something pale and shapeless that might once have been alive.',
   'corridor',
   '{water}',
   '[{"creatureId": "gutterspawn", "spawnCount": 4}, {"creatureId": "slum_rat", "spawnCount": 2}]',
   '[{"id": "sewer-deep-crate-1", "type": "crate", "items": ["corroded_pipe", "rubble_crusted_vest"]}]',
   '[{"type": "standing_water", "severity": 0.4}]'),

  ('sewer-pipe-maze',
   'The Pipe Maze',
   'A forest of vertical pipes — some as wide as a person, others thin as a wrist — fills this section of tunnel from floor to ceiling. The gaps between them form a labyrinth that shifts as the pipes expand and contract with temperature. Steam hisses from cracked joints. Navigation is by sound and touch as much as sight.',
   'corridor',
   '{low_ceiling}',
   '[{"creatureId": "gutterspawn", "spawnCount": 3}, {"creatureId": "sewer_lurker", "spawnCount": 1}]',
   '[{"id": "sewer-pipe-sack-1", "type": "crate", "items": ["corroded_pipe", "bent_rebar", "gutterspawn_fang"]}]',
   '[{"type": "low_ceiling", "severity": 0.3}]'),

  ('sewer-drain-grate',
   'Rusted Drain Grate',
   'A massive iron grate, pitted with corrosion and bent outward by some tremendous force, spans the width of the tunnel. Something tore through it from below. The bars are thick as a forearm and the metal groans when touched. Beyond it, the tunnel continues downward into deeper darkness. Water pours through the grate in a steady cascade.',
   'corridor',
   '{water,heavy_door}',
   '[{"creatureId": "gutterspawn", "spawnCount": 3}, {"creatureId": "slum_rat", "spawnCount": 3}]',
   '[{"id": "sewer-grate-crate-1", "type": "crate", "items": ["corroded_pipe", "tarnished_medallion"]}]',
   '[{"type": "standing_water", "severity": 0.4}]'),

  -- ── Sewer Junctions ────────────────────────────────────────────────────────

  ('sewer-silt-chamber',
   'Silt Chamber',
   'A wide, low room where the current slows and the water deposits its burden of silt and debris. The floor is a treacherous mire of soft sediment that sucks at boots and hides its depth. The walls are lined with alcoves — overflow channels — each one dark and dripping. The silt has built up in layers, and digging reveals things best left buried.',
   'junction',
   '{water,cavern}',
   '[{"creatureId": "sewer_lurker", "spawnCount": 2}, {"creatureId": "slum_rat", "spawnCount": 3}]',
   '[{"id": "sewer-silt-crate-1", "type": "crate", "items": ["corroded_pipe", "rubble_crusted_vest", "tarnished_medallion"]}]',
   '[{"type": "standing_water", "severity": 0.4}, {"type": "toxic_gas", "severity": 0.3}]'),

  ('sewer-blackwater-crossing',
   'Blackwater Crossing',
   'Two tunnels intersect above a sunken basin filled with water so dark it absorbs all light. A crude bridge of salvaged planks and wire spans the gap, swaying with each step. The water below is perfectly still — no ripple, no reflection — and yet something displaces it occasionally, sending gentle waves lapping at the stone walls.',
   'junction',
   '{water}',
   '[{"creatureId": "gutterspawn", "spawnCount": 4}, {"creatureId": "sewer_lurker", "spawnCount": 1}]',
   '[{"id": "sewer-bw-crate-1", "type": "crate", "items": ["corroded_pipe", "sanctuary_key", "gutterspawn_fang"]}]',
   '[{"type": "standing_water", "severity": 0.4}]'),

  -- ── Sewer Combat Rooms ─────────────────────────────────────────────────────

  ('sewer-overflow-chamber',
   'Overflow Chamber',
   'A cavernous room where the sewer system vented during floods. The ceiling arches high overhead, stained with tide lines marking decades of rising water. The current level sits at waist height along the walls but is shallower at the centre, where a raised platform of piled stone offers precarious footing. The acoustics amplify every splash into a thunderclap.',
   'combat',
   '{water,cavern}',
   '[{"creatureId": "gutterspawn", "spawnCount": 4}, {"creatureId": "sewer_lurker", "spawnCount": 1}]',
   '[{"id": "sewer-overflow-chest-1", "type": "chest", "items": ["rubble_crusted_vest", "corroded_pipe", "bent_rebar"]}]',
   '[{"type": "standing_water", "severity": 0.4}]'),

  ('sewer-cistern',
   'The Drowned Cistern',
   'An enormous cylindrical tank sunk into the bedrock, its walls lined with cracked ceramic tiles that were once white. Water fills it to chest height, cold and utterly still. The ceiling is a dome of riveted iron plates, weeping rust in long streaks. At the centre, a pillar of corroded metal rises from the water — the remains of a pump mechanism. Things brush against legs beneath the surface.',
   'combat',
   '{water,cavern}',
   '[{"creatureId": "sewer_lurker", "spawnCount": 2}, {"creatureId": "gutterspawn", "spawnCount": 3}]',
   '[{"id": "sewer-cistern-chest-1", "type": "chest", "items": ["rubble_crusted_vest", "corroded_pipe", "sanctuary_key"]}]',
   '[{"type": "standing_water", "severity": 0.4}, {"type": "toxic_gas", "severity": 0.3}]'),

  ('sewer-rat-nest',
   'Rat King''s Nest',
   'A vast mound of shredded cloth, gnawed bone, and compacted waste fills the centre of this chamber — a nest of staggering proportions. The rats here are larger than those on the surface, sleek and aggressive, their eyes burning with feral intelligence. The nest writhes and churns as hundreds of bodies move within it. The smell is beyond description.',
   'combat',
   '{cavern}',
   '[{"creatureId": "slum_rat", "spawnCount": 3}, {"creatureId": "gutterspawn", "spawnCount": 3}]',
   '[{"id": "sewer-ratnest-chest-1", "type": "chest", "items": ["rat_tail", "gutterspawn_fang", "tarnished_medallion", "corroded_pipe"]}]',
   '[{"type": "toxic_gas", "severity": 0.4}]'),

  ('sewer-fungal-grotto',
   'Fungal Grotto',
   'The tunnel opens into a natural cave where moisture and darkness have spawned a garden of grotesque fungi. Mushrooms the size of torsos cluster along the walls, their caps weeping a luminous yellow fluid. Fibrous tendrils hang from the ceiling like curtains of pale hair. The air is thick with spores that make the lungs burn and the eyes water.',
   'combat',
   '{cavern}',
   '[{"creatureId": "sewer_lurker", "spawnCount": 2}, {"creatureId": "gutterspawn", "spawnCount": 2}]',
   '[{"id": "sewer-fungal-crate-1", "type": "crate", "items": ["corroded_pipe", "rubble_crusted_vest"]}]',
   '[{"type": "toxic_gas", "severity": 0.5}]'),

  ('sewer-effluent-pool',
   'Effluent Pool',
   'The tunnel terminates in a wide, shallow pool of chemical-green water that bubbles gently. The surface is iridescent with oil and scummed with a crust that cracks underfoot like thin ice. Pipes in the far wall pour a steady trickle of dark liquid into the pool. The fumes are acrid enough to strip paint.',
   'combat',
   '{water}',
   '[{"creatureId": "gutterspawn", "spawnCount": 4}, {"creatureId": "slum_rat", "spawnCount": 2}]',
   '[{"id": "sewer-effluent-sack-1", "type": "crate", "items": ["corroded_pipe", "gutterspawn_fang", "bent_rebar"]}]',
   '[{"type": "standing_water", "severity": 0.4}, {"type": "toxic_gas", "severity": 0.4}]'),

  ('sewer-lurker-den',
   'Lurker''s Den',
   'A low-ceilinged pocket carved into the tunnel wall, half-flooded and reeking of carrion. Bones are piled in the corners — rat, gutterspawn, and disturbingly humanoid — stripped clean and arranged in neat rows. The den''s occupant has scratched deep grooves into the stone around the entrance, marking territory. The grooves are fresh.',
   'combat',
   '{water,low_ceiling}',
   '[{"creatureId": "sewer_lurker", "spawnCount": 2}, {"creatureId": "gutterspawn", "spawnCount": 2}]',
   '[{"id": "sewer-lurker-chest-1", "type": "chest", "items": ["rubble_crusted_vest", "corroded_pipe", "scavenger_shiv", "sanctuary_key"]}]',
   '[{"type": "low_ceiling", "severity": 0.3}, {"type": "standing_water", "severity": 0.4}]'),

  ('sewer-flooded-vault',
   'The Flooded Vault',
   'A sealed chamber — once a maintenance room or storage vault — has been breached by rising water. The door hangs open against the current, and inside, metal shelving units stand submerged to their upper shelves. Equipment and supplies are ruined, but the vault''s reinforced walls have kept the worst of the sewer creatures at bay. Until now.',
   'combat',
   '{water,heavy_door}',
   '[{"creatureId": "sewer_lurker", "spawnCount": 1}, {"creatureId": "gutterspawn", "spawnCount": 3}]',
   '[{"id": "sewer-vault-chest-1", "type": "chest", "items": ["rubble_crusted_vest", "sanctuary_key", "corroded_pipe", "tarnished_medallion"]}]',
   '[{"type": "standing_water", "severity": 0.4}]'),

  -- ── Sewer Dead Ends ────────────────────────────────────────────────────────

  ('sewer-collapsed-drain',
   'Collapsed Drain',
   'The tunnel ends abruptly where the ceiling has caved in, filling the passage with a wall of compacted earth and shattered brick. Water seeps through the collapse, pooling at the base in a shallow, silty puddle. Something glints in the rubble — a length of pipe, a shard of metal, the possibility of salvage. The ground trembles occasionally, hinting that the collapse is not yet finished.',
   'dead_end',
   '{water}',
   '[{"creatureId": "gutterspawn", "spawnCount": 3}, {"creatureId": "slum_rat", "spawnCount": 2}]',
   '[{"id": "sewer-collapse-crate-1", "type": "crate", "items": ["corroded_pipe", "bent_rebar", "gutterspawn_fang"]}]',
   '[{"type": "unstable_rubble", "severity": 0.3}, {"type": "standing_water", "severity": 0.4}]'),

  ('sewer-bone-shelf',
   'The Bone Shelf',
   'A natural shelf of rock juts from the tunnel wall, and upon it someone — or something — has carefully arranged bones. Hundreds of them. Rat skulls in concentric circles, gutterspawn vertebrae stacked into columns, long bones laid in parallel rows. The arrangement is deliberate, almost ritualistic. The air here is cold and still, and sound seems muffled.',
   'dead_end',
   '{cavern}',
   '[{"creatureId": "gutterspawn", "spawnCount": 3}]',
   '[{"id": "sewer-bone-corpse-1", "type": "corpse", "items": ["tarnished_medallion", "gutterspawn_fang", "corroded_pipe"]}]',
   '[{"type": "toxic_gas", "severity": 0.3}]'),

  ('sewer-gas-pocket',
   'The Gas Pocket',
   'The tunnel bulges outward into a natural pocket in the rock where toxic fumes have accumulated in a visible haze. The air shimmers and the eyes water within moments of entering. The walls are slick with a yellowish condensate. Deep claw marks score the stone floor — something was trapped here and fought desperately to escape.',
   'dead_end',
   '{cavern,low_ceiling}',
   '[{"creatureId": "sewer_lurker", "spawnCount": 1}, {"creatureId": "gutterspawn", "spawnCount": 2}]',
   '[{"id": "sewer-gas-crate-1", "type": "crate", "items": ["corroded_pipe", "rubble_crusted_vest"]}]',
   '[{"type": "toxic_gas", "severity": 0.5}, {"type": "low_ceiling", "severity": 0.3}]')

) AS v(slug, name, description, type, properties, npcs, loot_containers, hazards)
WHERE z.slug = 'warrens'
ON CONFLICT (zone_id, slug) DO NOTHING;

-- ============================================================================
-- KEY JUNCTION ROOMS + BOSS (inserted fresh — Phase 1 deleted all old rooms)
-- ============================================================================

INSERT INTO zone_rooms (zone_id, slug, name, description, type, properties, npcs, loot_containers, hazards)
SELECT z.id, v.slug, v.name, v.description, v.type,
       v.properties::text[], v.npcs::jsonb, v.loot_containers::jsonb, v.hazards::jsonb
FROM zones z, (VALUES

  -- Sunken Square: key junction connecting surface slums to sewers
  ('sunken-square',
   'The Sunken Square',
   'The street plunges into a broad depression where the foundations gave way long ago, creating a bowl of shattered flagstone and stagnant water. Ankle-deep brine collects at the lowest point, dark and cold, lapping at the mouths of drainage tunnels that yawn open in the basin walls. This is the hinge between the slums above and the sewer labyrinth below — scratch marks line the stone at water level, long parallel gouges ascending from somewhere beneath. Every sound pools here, echoing off the encircling walls until direction loses all meaning.',
   'junction',
   '{water}',
   '[{"creatureId": "gutterspawn", "spawnCount": 2}, {"creatureId": "slum_rat", "spawnCount": 3}]',
   '[{"id": "square-crate-1", "type": "crate", "items": ["tarnished_medallion", "bent_rebar", "rubble_crusted_vest"]}]',
   '[{"type": "standing_water", "severity": 0.3}]'),

  -- The Ratways: major sewer corridor connecting to the expanded underground
  ('the-ratways',
   'The Ratways',
   'A primary drainage artery running beneath the Sunken Square, wide enough for two to walk abreast but low enough to force a stoop. The ceiling drips in a ceaseless cadence, and the walls are crusted with generations of gutterspawn nests — tangles of cloth, bone, wire, and worse — stretching into side passages too narrow for anything larger than a rat. The tunnel branches ahead, connecting to the deeper sewer network. The air is thick with musk and the chittering of unseen things.',
   'corridor',
   '{water,low_ceiling}',
   '[{"creatureId": "gutterspawn", "spawnCount": 4}, {"creatureId": "slum_rat", "spawnCount": 3}]',
   '[{"id": "ratways-nest-1", "type": "corpse", "items": ["gutterspawn_fang", "tarnished_medallion", "corroded_pipe"]}]',
   '[{"type": "low_ceiling", "severity": 0.3}, {"type": "standing_water", "severity": 0.4}]'),

  -- The Charnel Pit (boss room — preserved from original)
  ('charnel-pit',
   'The Charnel Pit',
   'The tunnel opens into a vast pit — the foundations of a collapsed building, ripped open like a wound. Bones and rubble are fused into the walls. At the centre, something enormous shifts in the debris, rebar-spiked and concrete-skinned, as if the building itself refused to die and instead became something worse. The air vibrates with each of its slow, grinding breaths.',
   'boss',
   '{cavern}',
   '[{"creatureId": "the_collapsed_one", "spawnCount": 1}]',
   '[{"id": "charnel-boss-chest", "type": "chest", "items": ["rubble_crusted_vest", "scavenger_shiv", "charred_street_map", "tarnished_medallion"]}]',
   '[{"type": "seismic_tremor", "severity": 0.5}]'),

  -- Collapsed Tenement (preserved dead-end)
  ('collapsed-tenement',
   'Collapsed Tenement',
   'What was once a three-storey dwelling has pancaked into a single compressed layer of shattered timber, bent pipes, and pulverised plaster. A narrow gap leads into a pocket of relative stability — a room-sized void where the floors above wedged against each other instead of falling. It smells like a den. It smells occupied.',
   'dead_end',
   '{}',
   '[{"creatureId": "rubble_scavenger", "spawnCount": 2}]',
   '[{"id": "tenement-chest-1", "type": "chest", "items": ["scavenger_shiv", "rubble_crusted_vest", "tarnished_medallion"]}]',
   '[{"type": "unstable_rubble", "severity": 0.3}]'),

  -- === EXTRA SURFACE ROOMS (to reach 100+) ===

  ('plague-ward',
   'The Plague Ward',
   'A row of buildings sealed with rusted iron bars, their doorways bricked up from the outside. Whatever happened here, the city tried to contain it. Faded quarantine marks — a skull within a circle — are painted on every lintel. Through a gap in the brickwork, you can see bedframes stacked like kindling.',
   'dead_end',
   '{heavy_door}',
   '[{"creatureId": "gutterspawn", "spawnCount": 3}]',
   '[{"id": "plague-corpse-1", "type": "corpse", "items": ["tarnished_medallion", "bent_rebar"]}]',
   '[{"type": "toxic_gas", "severity": 0.3}]'),

  ('gallows-square',
   'Gallows Square',
   'An open plaza dominated by a weathered wooden scaffold, its crossbeam still intact though the rope has long since rotted away. The cobblestones are worn smooth in a wide circle around the base — a gathering place, once. Now the only audience is a flock of pale, eyeless birds that roost along the beam, turning their heads in unison as you approach.',
   'junction',
   '{}',
   '[{"creatureId": "rubble_scavenger", "spawnCount": 2}]',
   '[{"id": "gallows-crate-1", "type": "crate", "items": ["scavenger_shiv", "bent_rebar", "rat_tail"]}]',
   '[]'),

  ('tilted-tower',
   'The Tilted Tower',
   'A narrow watchtower leans at a sickening fifteen-degree angle, its foundations undermined by the sewer system below. The interior staircase spirals upward into creaking darkness, each step a gamble against structural collapse. From the top — if you dare — you can see the full sprawl of the slums stretching south.',
   'dead_end',
   '{}',
   '[]',
   '[{"id": "tower-lookout-1", "type": "corpse", "items": ["charred_street_map", "tarnished_medallion"]}]',
   '[{"type": "unstable_floor", "severity": 0.5}]'),

  ('dyers-vats',
   'The Dyer''s Vats',
   'Three enormous stone vats, cracked and stained with centuries of pigment, sit in what was once an industrial yard. The chemical residue has seeped into the ground, killing everything within ten paces and leaving the soil a mottled purple-black. The vats themselves hold stagnant rainwater in lurid, unnatural colours.',
   'combat',
   '{water}',
   '[{"creatureId": "slum_rat", "spawnCount": 4}]',
   '[{"id": "dyers-crate-1", "type": "crate", "items": ["corroded_pipe", "bent_rebar"]}]',
   '[{"type": "toxic_gas", "severity": 0.2}]'),

  ('beggar-kings-throne',
   'The Beggar King''s Throne',
   'A basement room beneath a collapsed tavern, furnished with salvaged grandeur — a cracked leather armchair sits atop a pile of rubble like a throne, surrounded by offerings of bent cutlery and polished stones. Whoever ruled here is long gone, but the shrine persists. Candle stubs, some recent, suggest pilgrims still visit.',
   'dead_end',
   '{cavern}',
   '[{"creatureId": "hollow_stalker", "spawnCount": 1}]',
   '[{"id": "throne-offering-1", "type": "altar", "items": ["sanctuary_key", "tarnished_medallion", "rubble_crusted_vest"]}]',
   '[]'),

  ('ashfall-gardens',
   'Ashfall Gardens',
   'A walled courtyard where ornamental trees have petrified into grey, skeletal forms. Ash covers everything — the benches, the dry fountain, the gravel paths — in a uniform grey shroud. Footprints in the ash tell conflicting stories: some human, some not, all recent. The walls provide shelter from the wind but trap the silence.',
   'junction',
   '{}',
   '[{"creatureId": "gutterspawn", "spawnCount": 2}, {"creatureId": "rubble_scavenger", "spawnCount": 1}]',
   '[{"id": "garden-corpse-1", "type": "corpse", "items": ["bent_rebar", "gutterspawn_fang", "rat_tail"]}]',
   '[{"type": "unstable_rubble", "severity": 0.2}]'),

  ('gutter-bridge',
   'Gutter Bridge',
   'A stone footbridge spans a chasm where the street collapsed into the sewers below. The bridge itself is intact but barely — hairline fractures web across its surface, and chunks of railing have fallen into the darkness below. You can hear water rushing somewhere far beneath your feet.',
   'corridor',
   '{}',
   '[{"creatureId": "slum_rat", "spawnCount": 3}]',
   '[]',
   '[{"type": "unstable_floor", "severity": 0.4}]'),

  ('tannery-ruins',
   'Tannery Ruins',
   'The stench hits before you see the source — a row of stone-lined tanning pits, some still holding the brackish remains of whatever chemical bath was used to cure hides. The building around them has mostly collapsed, leaving the pits open to the sky like infected wounds in the earth. Flies buzz in thick, lazy clouds.',
   'combat',
   '{water}',
   '[{"creatureId": "gutterspawn", "spawnCount": 2}, {"creatureId": "slum_rat", "spawnCount": 2}]',
   '[{"id": "tannery-crate-1", "type": "crate", "items": ["bent_rebar", "scavenger_shiv", "corroded_pipe"]}]',
   '[{"type": "toxic_gas", "severity": 0.3}]'),

  ('blind-alley',
   'Blind Alley',
   'The passage narrows to a dead end where a massive block of masonry has fallen from above, sealing what was once a through-route. The walls are close enough to touch both sides simultaneously. Someone has scratched a crude map into the stone at eye level — most of it is wrong, but one arrow points down toward a drain grate.',
   'dead_end',
   '{}',
   '[{"creatureId": "slum_rat", "spawnCount": 2}]',
   '[{"id": "alley-corpse-1", "type": "corpse", "items": ["charred_street_map", "rat_tail"]}]',
   '[]'),

  ('sluice-gate',
   'The Sluice Gate',
   'A heavy iron gate, green with verdigris, blocks the mouth of a drainage channel that descends into the earth. The gate mechanism is rusted solid, but something has bent three of the bars apart just wide enough to squeeze through. Water trickles steadily through the gap, and the air rising from below is warm and foul.',
   'junction',
   '{water,heavy_door}',
   '[{"creatureId": "gutterspawn", "spawnCount": 2}]',
   '[{"id": "sluice-crate-1", "type": "crate", "items": ["corroded_pipe", "bent_rebar"]}]',
   '[{"type": "standing_water", "severity": 0.3}]'),

  ('rubble-maze',
   'The Rubble Maze',
   'Collapsed buildings have created an accidental labyrinth of narrow passages between heaps of debris. The paths twist and double back, and the walls of rubble shift underfoot. It would be easy to get lost here — easier still to be cornered. Fresh claw marks on the stone suggest you are not the only thing navigating this mess.',
   'combat',
   '{}',
   '[{"creatureId": "gutterspawn", "spawnCount": 3}, {"creatureId": "rubble_scavenger", "spawnCount": 1}]',
   '[{"id": "maze-corpse-1", "type": "corpse", "items": ["gutterspawn_fang", "scavenger_shiv"]}]',
   '[{"type": "unstable_rubble", "severity": 0.3}]'),

  ('cistern-access',
   'Cistern Access',
   'A circular stone hatch set into the ground, its cover long since pried open and discarded. Iron rungs descend into darkness — a maintenance shaft leading to the old city cisterns. The stonework around the hatch is scored with tool marks, some old, some fresh. Water echoes from below, amplified by the shaft into something that sounds almost like breathing.',
   'junction',
   '{water}',
   '[{"creatureId": "slum_rat", "spawnCount": 2}]',
   '[]',
   '[{"type": "standing_water", "severity": 0.2}]'),

  ('watchmens-post',
   'Watchmen''s Post',
   'A squat stone building, more intact than most, with arrow slits instead of windows and a reinforced door hanging from one hinge. Inside, a table and chairs are still arranged as if the occupants merely stepped out. Duty rosters pinned to the wall are illegible with age, but the weapon rack remains — empty, naturally.',
   'dead_end',
   '{heavy_door}',
   '[{"creatureId": "hollow_stalker", "spawnCount": 1}]',
   '[{"id": "post-chest-1", "type": "chest", "items": ["scavenger_shiv", "rubble_crusted_vest", "charred_street_map"]}]',
   '[]')

) AS v(slug, name, description, type, properties, npcs, loot_containers, hazards)
WHERE z.slug = 'warrens'
ON CONFLICT (zone_id, slug) DO NOTHING;

-- Phase 3: All exits
-- Designed by Laeral (Content Designer), built by Bruenor (Content Builder).
-- Idempotent: uses INSERT ... ON CONFLICT DO NOTHING so re-running is safe.
--
-- Topology revision notes (v2):
--   1. cistern-access connected to slum-r7c2 (was orphaned on surface).
--   2. sunken-square connected to slum-r1c1 west (additional surface link).
--   3. Approach loop broken into tree branches off the main spine
--      (merchants-row→gutter-run). burned-chapel/scavengers-den branch east
--      of merchants-row; blighted-courtyard/condemned-arch/ironmongers-ruin
--      branch east of gutter-run.
--   4. sluice-gate moved to slum-r5c1 west (mid-grid sewer access).
--   5. dustfall-extraction moved to dead-end off slum-r6c7 east (destination,
--      not waypoint).

-- Wipe all existing Warrens exits so this migration is the single source of truth.
-- Previous migrations (033) created exits that are now obsolete after the expansion.
DELETE FROM zone_exits
WHERE zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

-- Insert all exits for the expanded Warrens zone.
INSERT INTO zone_exits (zone_id, from_room_slug, direction, to_room_slug, target_zone_slug, target_room_slug, locked, hidden)
SELECT z.id, v.from_slug, v.direction, v.to_slug,
       NULLIF(v.target_zone, ''), NULLIF(v.target_room, ''),
       v.is_locked, v.is_hidden
FROM zones z, (VALUES
  -- ── Cross-zone exit ──────────────────────────────────────────────────
  ('shattered-gate', 'west', 'shattered-gate', 'the-refuge', 'hearth', false, false),

  -- ── Approach area (surface) ─────────────────────────────────────────
  -- Main spine: shattered-gate → rubble-boulevard → collapsed-overpass
  --             → hollow-market → merchants-row → gutter-run → grid
  ('shattered-gate', 'east', 'rubble-boulevard', '', '', false, false),
  ('rubble-boulevard', 'west', 'shattered-gate', '', '', false, false),
  ('rubble-boulevard', 'east', 'collapsed-overpass', '', '', false, false),
  ('collapsed-overpass', 'west', 'rubble-boulevard', '', '', false, false),
  ('rubble-boulevard', 'up', 'overwatch-tower', '', '', false, false),
  ('overwatch-tower', 'down', 'rubble-boulevard', '', '', false, false),
  ('collapsed-overpass', 'east', 'hollow-market', '', '', false, false),
  ('hollow-market', 'west', 'collapsed-overpass', '', '', false, false),
  ('hollow-market', 'north', 'broken-sanctuary', '', '', false, false),
  ('broken-sanctuary', 'south', 'hollow-market', '', '', false, false),
  ('hollow-market', 'south', 'whispering-alley', '', '', false, false),
  ('whispering-alley', 'north', 'hollow-market', '', '', false, false),
  ('hollow-market', 'east', 'merchants-row', '', '', false, false),
  ('merchants-row', 'west', 'hollow-market', '', '', false, false),
  ('whispering-alley', 'east', 'collapsed-tenement', '', '', false, false),
  ('collapsed-tenement', 'west', 'whispering-alley', '', '', false, false),
  ('broken-sanctuary', 'east', 'sunken-square', '', '', true, false),
  ('sunken-square', 'west', 'broken-sanctuary', '', '', true, false),
  -- Branch: merchants-row east → burned-chapel → scavengers-den
  ('merchants-row', 'east', 'burned-chapel', '', '', false, false),
  ('burned-chapel', 'west', 'merchants-row', '', '', false, false),
  ('burned-chapel', 'south', 'scavengers-den', '', '', false, false),
  ('scavengers-den', 'north', 'burned-chapel', '', '', false, false),
  -- Spine continued
  ('merchants-row', 'south', 'gutter-run', '', '', false, false),
  ('gutter-run', 'north', 'merchants-row', '', '', false, false),
  -- Branch: gutter-run east → blighted-courtyard → condemned-arch → ironmongers-ruin
  ('gutter-run', 'east', 'blighted-courtyard', '', '', false, false),
  ('blighted-courtyard', 'west', 'gutter-run', '', '', false, false),
  ('blighted-courtyard', 'south', 'condemned-arch', '', '', false, false),
  ('condemned-arch', 'north', 'blighted-courtyard', '', '', false, false),
  ('condemned-arch', 'east', 'ironmongers-ruin', '', '', false, false),
  ('ironmongers-ruin', 'west', 'condemned-arch', '', '', false, false),
  -- Grid entry
  ('gutter-run', 'south', 'slum-r1c1', '', '', false, false),
  ('slum-r1c1', 'north', 'gutter-run', '', '', false, false),

  -- ── 7x7 Slum Grid — east/west ─────────────────────────────────────
  ('slum-r1c1', 'east', 'slum-r1c2', '', '', false, false),
  ('slum-r1c2', 'west', 'slum-r1c1', '', '', false, false),
  ('slum-r1c2', 'east', 'slum-r1c3', '', '', false, false),
  ('slum-r1c3', 'west', 'slum-r1c2', '', '', false, false),
  ('slum-r1c3', 'east', 'slum-r1c4', '', '', false, false),
  ('slum-r1c4', 'west', 'slum-r1c3', '', '', false, false),
  ('slum-r1c4', 'east', 'slum-r1c5', '', '', false, false),
  ('slum-r1c5', 'west', 'slum-r1c4', '', '', false, false),
  ('slum-r1c5', 'east', 'slum-r1c6', '', '', false, false),
  ('slum-r1c6', 'west', 'slum-r1c5', '', '', false, false),
  ('slum-r1c6', 'east', 'slum-r1c7', '', '', false, false),
  ('slum-r1c7', 'west', 'slum-r1c6', '', '', false, false),
  ('slum-r2c1', 'east', 'slum-r2c2', '', '', false, false),
  ('slum-r2c2', 'west', 'slum-r2c1', '', '', false, false),
  ('slum-r2c2', 'east', 'slum-r2c3', '', '', false, false),
  ('slum-r2c3', 'west', 'slum-r2c2', '', '', false, false),
  ('slum-r2c3', 'east', 'slum-r2c4', '', '', false, false),
  ('slum-r2c4', 'west', 'slum-r2c3', '', '', false, false),
  ('slum-r2c4', 'east', 'slum-r2c5', '', '', false, false),
  ('slum-r2c5', 'west', 'slum-r2c4', '', '', false, false),
  ('slum-r2c5', 'east', 'slum-r2c6', '', '', false, false),
  ('slum-r2c6', 'west', 'slum-r2c5', '', '', false, false),
  ('slum-r2c6', 'east', 'slum-r2c7', '', '', false, false),
  ('slum-r2c7', 'west', 'slum-r2c6', '', '', false, false),
  ('slum-r3c1', 'east', 'slum-r3c2', '', '', false, false),
  ('slum-r3c2', 'west', 'slum-r3c1', '', '', false, false),
  ('slum-r3c2', 'east', 'slum-r3c3', '', '', false, false),
  ('slum-r3c3', 'west', 'slum-r3c2', '', '', false, false),
  ('slum-r3c3', 'east', 'slum-r3c4', '', '', false, false),
  ('slum-r3c4', 'west', 'slum-r3c3', '', '', false, false),
  ('slum-r3c4', 'east', 'slum-r3c5', '', '', false, false),
  ('slum-r3c5', 'west', 'slum-r3c4', '', '', false, false),
  ('slum-r3c5', 'east', 'slum-r3c6', '', '', false, false),
  ('slum-r3c6', 'west', 'slum-r3c5', '', '', false, false),
  ('slum-r3c6', 'east', 'slum-r3c7', '', '', false, false),
  ('slum-r3c7', 'west', 'slum-r3c6', '', '', false, false),
  ('slum-r4c1', 'east', 'slum-r4c2', '', '', false, false),
  ('slum-r4c2', 'west', 'slum-r4c1', '', '', false, false),
  ('slum-r4c2', 'east', 'slum-r4c3', '', '', false, false),
  ('slum-r4c3', 'west', 'slum-r4c2', '', '', false, false),
  ('slum-r4c3', 'east', 'slum-r4c4', '', '', false, false),
  ('slum-r4c4', 'west', 'slum-r4c3', '', '', false, false),
  ('slum-r4c4', 'east', 'slum-r4c5', '', '', false, false),
  ('slum-r4c5', 'west', 'slum-r4c4', '', '', false, false),
  ('slum-r4c5', 'east', 'slum-r4c6', '', '', false, false),
  ('slum-r4c6', 'west', 'slum-r4c5', '', '', false, false),
  ('slum-r4c6', 'east', 'slum-r4c7', '', '', false, false),
  ('slum-r4c7', 'west', 'slum-r4c6', '', '', false, false),
  ('slum-r5c1', 'east', 'slum-r5c2', '', '', false, false),
  ('slum-r5c2', 'west', 'slum-r5c1', '', '', false, false),
  ('slum-r5c2', 'east', 'slum-r5c3', '', '', false, false),
  ('slum-r5c3', 'west', 'slum-r5c2', '', '', false, false),
  ('slum-r5c3', 'east', 'slum-r5c4', '', '', false, false),
  ('slum-r5c4', 'west', 'slum-r5c3', '', '', false, false),
  ('slum-r5c4', 'east', 'slum-r5c5', '', '', false, false),
  ('slum-r5c5', 'west', 'slum-r5c4', '', '', false, false),
  ('slum-r5c5', 'east', 'slum-r5c6', '', '', false, false),
  ('slum-r5c6', 'west', 'slum-r5c5', '', '', false, false),
  ('slum-r5c6', 'east', 'slum-r5c7', '', '', false, false),
  ('slum-r5c7', 'west', 'slum-r5c6', '', '', false, false),
  ('slum-r6c1', 'east', 'slum-r6c2', '', '', false, false),
  ('slum-r6c2', 'west', 'slum-r6c1', '', '', false, false),
  ('slum-r6c2', 'east', 'slum-r6c3', '', '', false, false),
  ('slum-r6c3', 'west', 'slum-r6c2', '', '', false, false),
  ('slum-r6c3', 'east', 'slum-r6c4', '', '', false, false),
  ('slum-r6c4', 'west', 'slum-r6c3', '', '', false, false),
  ('slum-r6c4', 'east', 'slum-r6c5', '', '', false, false),
  ('slum-r6c5', 'west', 'slum-r6c4', '', '', false, false),
  ('slum-r6c5', 'east', 'slum-r6c6', '', '', false, false),
  ('slum-r6c6', 'west', 'slum-r6c5', '', '', false, false),
  ('slum-r6c6', 'east', 'slum-r6c7', '', '', false, false),
  ('slum-r6c7', 'west', 'slum-r6c6', '', '', false, false),
  ('slum-r7c1', 'east', 'slum-r7c2', '', '', false, false),
  ('slum-r7c2', 'west', 'slum-r7c1', '', '', false, false),
  ('slum-r7c2', 'east', 'slum-r7c3', '', '', false, false),
  ('slum-r7c3', 'west', 'slum-r7c2', '', '', false, false),
  ('slum-r7c3', 'east', 'slum-r7c4', '', '', false, false),
  ('slum-r7c4', 'west', 'slum-r7c3', '', '', false, false),
  ('slum-r7c4', 'east', 'slum-r7c5', '', '', false, false),
  ('slum-r7c5', 'west', 'slum-r7c4', '', '', false, false),
  ('slum-r7c5', 'east', 'slum-r7c6', '', '', false, false),
  ('slum-r7c6', 'west', 'slum-r7c5', '', '', false, false),
  ('slum-r7c6', 'east', 'slum-r7c7', '', '', false, false),
  ('slum-r7c7', 'west', 'slum-r7c6', '', '', false, false),

  -- ── 7x7 Slum Grid — north/south ──────────────────────────────────
  ('slum-r1c1', 'south', 'slum-r2c1', '', '', false, false),
  ('slum-r2c1', 'north', 'slum-r1c1', '', '', false, false),
  ('slum-r1c2', 'south', 'slum-r2c2', '', '', false, false),
  ('slum-r2c2', 'north', 'slum-r1c2', '', '', false, false),
  ('slum-r1c3', 'south', 'slum-r2c3', '', '', false, false),
  ('slum-r2c3', 'north', 'slum-r1c3', '', '', false, false),
  ('slum-r1c4', 'south', 'slum-r2c4', '', '', false, false),
  ('slum-r2c4', 'north', 'slum-r1c4', '', '', false, false),
  ('slum-r1c5', 'south', 'slum-r2c5', '', '', false, false),
  ('slum-r2c5', 'north', 'slum-r1c5', '', '', false, false),
  ('slum-r1c6', 'south', 'slum-r2c6', '', '', false, false),
  ('slum-r2c6', 'north', 'slum-r1c6', '', '', false, false),
  ('slum-r1c7', 'south', 'slum-r2c7', '', '', false, false),
  ('slum-r2c7', 'north', 'slum-r1c7', '', '', false, false),
  ('slum-r2c1', 'south', 'slum-r3c1', '', '', false, false),
  ('slum-r3c1', 'north', 'slum-r2c1', '', '', false, false),
  ('slum-r2c2', 'south', 'slum-r3c2', '', '', false, false),
  ('slum-r3c2', 'north', 'slum-r2c2', '', '', false, false),
  ('slum-r2c3', 'south', 'slum-r3c3', '', '', false, false),
  ('slum-r3c3', 'north', 'slum-r2c3', '', '', false, false),
  ('slum-r2c4', 'south', 'slum-r3c4', '', '', false, false),
  ('slum-r3c4', 'north', 'slum-r2c4', '', '', false, false),
  ('slum-r2c5', 'south', 'slum-r3c5', '', '', false, false),
  ('slum-r3c5', 'north', 'slum-r2c5', '', '', false, false),
  ('slum-r2c6', 'south', 'slum-r3c6', '', '', false, false),
  ('slum-r3c6', 'north', 'slum-r2c6', '', '', false, false),
  ('slum-r2c7', 'south', 'slum-r3c7', '', '', false, false),
  ('slum-r3c7', 'north', 'slum-r2c7', '', '', false, false),
  ('slum-r3c1', 'south', 'slum-r4c1', '', '', false, false),
  ('slum-r4c1', 'north', 'slum-r3c1', '', '', false, false),
  ('slum-r3c2', 'south', 'slum-r4c2', '', '', false, false),
  ('slum-r4c2', 'north', 'slum-r3c2', '', '', false, false),
  ('slum-r3c3', 'south', 'slum-r4c3', '', '', false, false),
  ('slum-r4c3', 'north', 'slum-r3c3', '', '', false, false),
  ('slum-r3c4', 'south', 'slum-r4c4', '', '', false, false),
  ('slum-r4c4', 'north', 'slum-r3c4', '', '', false, false),
  ('slum-r3c5', 'south', 'slum-r4c5', '', '', false, false),
  ('slum-r4c5', 'north', 'slum-r3c5', '', '', false, false),
  ('slum-r3c6', 'south', 'slum-r4c6', '', '', false, false),
  ('slum-r4c6', 'north', 'slum-r3c6', '', '', false, false),
  ('slum-r3c7', 'south', 'slum-r4c7', '', '', false, false),
  ('slum-r4c7', 'north', 'slum-r3c7', '', '', false, false),
  ('slum-r4c1', 'south', 'slum-r5c1', '', '', false, false),
  ('slum-r5c1', 'north', 'slum-r4c1', '', '', false, false),
  ('slum-r4c2', 'south', 'slum-r5c2', '', '', false, false),
  ('slum-r5c2', 'north', 'slum-r4c2', '', '', false, false),
  ('slum-r4c3', 'south', 'slum-r5c3', '', '', false, false),
  ('slum-r5c3', 'north', 'slum-r4c3', '', '', false, false),
  ('slum-r4c4', 'south', 'slum-r5c4', '', '', false, false),
  ('slum-r5c4', 'north', 'slum-r4c4', '', '', false, false),
  ('slum-r4c5', 'south', 'slum-r5c5', '', '', false, false),
  ('slum-r5c5', 'north', 'slum-r4c5', '', '', false, false),
  ('slum-r4c6', 'south', 'slum-r5c6', '', '', false, false),
  ('slum-r5c6', 'north', 'slum-r4c6', '', '', false, false),
  ('slum-r4c7', 'south', 'slum-r5c7', '', '', false, false),
  ('slum-r5c7', 'north', 'slum-r4c7', '', '', false, false),
  ('slum-r5c1', 'south', 'slum-r6c1', '', '', false, false),
  ('slum-r6c1', 'north', 'slum-r5c1', '', '', false, false),
  ('slum-r5c2', 'south', 'slum-r6c2', '', '', false, false),
  ('slum-r6c2', 'north', 'slum-r5c2', '', '', false, false),
  ('slum-r5c3', 'south', 'slum-r6c3', '', '', false, false),
  ('slum-r6c3', 'north', 'slum-r5c3', '', '', false, false),
  ('slum-r5c4', 'south', 'slum-r6c4', '', '', false, false),
  ('slum-r6c4', 'north', 'slum-r5c4', '', '', false, false),
  ('slum-r5c5', 'south', 'slum-r6c5', '', '', false, false),
  ('slum-r6c5', 'north', 'slum-r5c5', '', '', false, false),
  ('slum-r5c6', 'south', 'slum-r6c6', '', '', false, false),
  ('slum-r6c6', 'north', 'slum-r5c6', '', '', false, false),
  ('slum-r5c7', 'south', 'slum-r6c7', '', '', false, false),
  ('slum-r6c7', 'north', 'slum-r5c7', '', '', false, false),
  ('slum-r6c1', 'south', 'slum-r7c1', '', '', false, false),
  ('slum-r7c1', 'north', 'slum-r6c1', '', '', false, false),
  ('slum-r6c2', 'south', 'slum-r7c2', '', '', false, false),
  ('slum-r7c2', 'north', 'slum-r6c2', '', '', false, false),
  ('slum-r6c3', 'south', 'slum-r7c3', '', '', false, false),
  ('slum-r7c3', 'north', 'slum-r6c3', '', '', false, false),
  ('slum-r6c4', 'south', 'slum-r7c4', '', '', false, false),
  ('slum-r7c4', 'north', 'slum-r6c4', '', '', false, false),
  ('slum-r6c5', 'south', 'slum-r7c5', '', '', false, false),
  ('slum-r7c5', 'north', 'slum-r6c5', '', '', false, false),
  ('slum-r6c6', 'south', 'slum-r7c6', '', '', false, false),
  ('slum-r7c6', 'north', 'slum-r6c6', '', '', false, false),
  ('slum-r6c7', 'south', 'slum-r7c7', '', '', false, false),
  ('slum-r7c7', 'north', 'slum-r6c7', '', '', false, false),

  -- ── Grid edge → extra surface rooms ──────────────────────────────
  -- NW corner: sunken-square (sewer shaft access via the-ratways)
  ('slum-r1c1', 'west', 'sunken-square', '', '', false, false),
  ('sunken-square', 'east', 'slum-r1c1', '', '', false, false),
  -- N edge: gutter-bridge (dead-end lookout)
  ('slum-r1c4', 'north', 'gutter-bridge', '', '', false, false),
  ('gutter-bridge', 'south', 'slum-r1c4', '', '', false, false),
  -- NE corner: gallows-square → tilted-tower
  ('slum-r1c7', 'east', 'gallows-square', '', '', false, false),
  ('gallows-square', 'west', 'slum-r1c7', '', '', false, false),
  ('gallows-square', 'east', 'tilted-tower', '', '', false, false),
  ('tilted-tower', 'west', 'gallows-square', '', '', false, false),
  -- W edge mid: plague-ward
  ('slum-r4c1', 'west', 'plague-ward', '', '', false, false),
  ('plague-ward', 'east', 'slum-r4c1', '', '', false, false),
  -- E edge mid: rubble-maze → watchmens-post
  ('slum-r4c7', 'east', 'rubble-maze', '', '', false, false),
  ('rubble-maze', 'west', 'slum-r4c7', '', '', false, false),
  ('rubble-maze', 'east', 'watchmens-post', '', '', false, false),
  ('watchmens-post', 'west', 'rubble-maze', '', '', false, false),
  -- W edge mid-low: sluice-gate (sewer access via sewer-main-junction)
  ('slum-r5c1', 'west', 'sluice-gate', '', '', false, false),
  ('sluice-gate', 'east', 'slum-r5c1', '', '', false, false),
  -- E edge low: dustfall-extraction (zone extraction destination)
  ('slum-r6c7', 'east', 'dustfall-extraction', '', '', false, false),
  ('dustfall-extraction', 'west', 'slum-r6c7', '', '', false, false),
  -- SW corner: dyers-vats → beggar-kings-throne
  ('slum-r7c1', 'south', 'dyers-vats', '', '', false, false),
  ('dyers-vats', 'north', 'slum-r7c1', '', '', false, false),
  ('dyers-vats', 'west', 'beggar-kings-throne', '', '', false, false),
  ('beggar-kings-throne', 'east', 'dyers-vats', '', '', false, false),
  -- S edge: cistern-access (sewer access via sewer-cistern)
  ('slum-r7c2', 'south', 'cistern-access', '', '', false, false),
  ('cistern-access', 'north', 'slum-r7c2', '', '', false, false),
  -- S edge mid: ashfall-gardens (dead-end exploration)
  ('slum-r7c4', 'south', 'ashfall-gardens', '', '', false, false),
  ('ashfall-gardens', 'north', 'slum-r7c4', '', '', false, false),
  -- SE corner: tannery-ruins → blind-alley
  ('slum-r7c7', 'south', 'tannery-ruins', '', '', false, false),
  ('tannery-ruins', 'north', 'slum-r7c7', '', '', false, false),
  ('tannery-ruins', 'east', 'blind-alley', '', '', false, false),
  ('blind-alley', 'west', 'tannery-ruins', '', '', false, false),

  -- ── Surface → sewer vertical shafts ──────────────────────────────
  ('sunken-square', 'down', 'the-ratways', '', '', false, true),
  ('the-ratways', 'up', 'sunken-square', '', '', false, false),
  ('sluice-gate', 'down', 'sewer-main-junction', '', '', false, false),
  ('sewer-main-junction', 'up', 'sluice-gate', '', '', false, false),
  ('cistern-access', 'down', 'sewer-cistern', '', '', false, false),
  ('sewer-cistern', 'up', 'cistern-access', '', '', false, false),

  -- ── Sewer internal network ────────────────────────────────────────
  ('the-ratways', 'east', 'sewer-main-junction', '', '', false, false),
  ('sewer-main-junction', 'west', 'the-ratways', '', '', false, false),
  ('the-ratways', 'west', 'charnel-pit', '', '', false, false),
  ('charnel-pit', 'east', 'the-ratways', '', '', false, false),
  ('sewer-main-junction', 'north', 'sewer-north-tunnel', '', '', false, false),
  ('sewer-north-tunnel', 'south', 'sewer-main-junction', '', '', false, false),
  ('sewer-main-junction', 'south', 'sewer-south-tunnel', '', '', false, false),
  ('sewer-south-tunnel', 'north', 'sewer-main-junction', '', '', false, false),
  ('sewer-main-junction', 'east', 'sewer-east-conduit', '', '', false, false),
  ('sewer-east-conduit', 'west', 'sewer-main-junction', '', '', false, false),
  ('sewer-north-tunnel', 'east', 'sewer-drain-grate', '', '', false, false),
  ('sewer-drain-grate', 'west', 'sewer-north-tunnel', '', '', false, false),
  ('sewer-north-tunnel', 'north', 'sewer-rat-nest', '', '', false, false),
  ('sewer-rat-nest', 'south', 'sewer-north-tunnel', '', '', false, false),
  ('sewer-rat-nest', 'east', 'sewer-bone-shelf', '', '', false, false),
  ('sewer-bone-shelf', 'west', 'sewer-rat-nest', '', '', false, false),
  ('sewer-drain-grate', 'east', 'sewer-overflow-chamber', '', '', false, false),
  ('sewer-overflow-chamber', 'west', 'sewer-drain-grate', '', '', false, false),
  -- overflow-chamber is a dead-end off drain-grate (removed south→east-conduit
  -- to avoid spatial conflict: overflow can't be both east-of-drain-grate AND
  -- north-of-east-conduit on an integer grid)
  ('sewer-east-conduit', 'east', 'sewer-pipe-maze', '', '', false, false),
  ('sewer-pipe-maze', 'west', 'sewer-east-conduit', '', '', false, false),
  -- effluent-pool reached only via deep-channel→east (removed pipe-maze→south
  -- shortcut: convergence conflict with deep-channel positioning)
  ('sewer-pipe-maze', 'east', 'sewer-gas-pocket', '', '', false, false),
  ('sewer-gas-pocket', 'west', 'sewer-pipe-maze', '', '', false, false),
  ('sewer-south-tunnel', 'south', 'sewer-flooded-vault', '', '', false, false),
  ('sewer-flooded-vault', 'north', 'sewer-south-tunnel', '', '', false, false),
  ('sewer-south-tunnel', 'west', 'sewer-west-conduit', '', '', false, false),
  ('sewer-west-conduit', 'east', 'sewer-south-tunnel', '', '', false, false),
  ('sewer-south-tunnel', 'east', 'sewer-blackwater-crossing', '', '', false, false),
  ('sewer-blackwater-crossing', 'west', 'sewer-south-tunnel', '', '', false, false),
  ('sewer-flooded-vault', 'south', 'sewer-collapsed-drain', '', '', false, false),
  ('sewer-collapsed-drain', 'north', 'sewer-flooded-vault', '', '', false, false),
  ('sewer-blackwater-crossing', 'south', 'sewer-deep-channel', '', '', false, false),
  ('sewer-deep-channel', 'north', 'sewer-blackwater-crossing', '', '', false, false),
  ('sewer-deep-channel', 'east', 'sewer-effluent-pool', '', '', false, false),
  ('sewer-effluent-pool', 'west', 'sewer-deep-channel', '', '', false, false),
  ('sewer-deep-channel', 'south', 'sewer-silt-chamber', '', '', false, false),
  ('sewer-silt-chamber', 'north', 'sewer-deep-channel', '', '', false, false),
  ('sewer-west-conduit', 'west', 'sewer-cistern', '', '', false, false),
  ('sewer-cistern', 'east', 'sewer-west-conduit', '', '', false, false),
  ('sewer-west-conduit', 'south', 'sewer-lurker-den', '', '', false, false),
  ('sewer-lurker-den', 'north', 'sewer-west-conduit', '', '', false, false),
  ('sewer-cistern', 'south', 'sewer-fungal-grotto', '', '', false, false),
  ('sewer-fungal-grotto', 'north', 'sewer-cistern', '', '', false, false)
) AS v(from_slug, direction, to_slug, target_zone, target_room, is_locked, is_hidden)
WHERE z.slug = 'warrens'
ON CONFLICT (zone_id, from_room_slug, direction) DO NOTHING;
