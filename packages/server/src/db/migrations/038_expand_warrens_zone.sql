-- Migration 038: Expand The Warrens — from 11 rooms to 100+ rooms.
-- Phase 1 of 3: Approach area (~15 rooms) + Slums Grid rows 1-3 (21 rooms).
-- Deletes existing room/exit data and re-seeds with the expanded layout.
-- Designed by Laeral (Content Designer), built by Bruenor (Content Builder).
-- Idempotent: uses INSERT ... ON CONFLICT DO NOTHING so re-running is safe.

-- ============================================================================
-- 1. Delete existing room & exit data for a clean replacement
-- ============================================================================
DELETE FROM zone_exits WHERE zone_id = (SELECT id FROM zones WHERE slug = 'warrens');
DELETE FROM zone_rooms WHERE zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

-- ============================================================================
-- 2. Update zone metadata
-- ============================================================================
UPDATE zones SET
  description = 'A vast, decaying ruined city stretching far beyond its shattered gate. Winding streets of crumbling tenements give way to a dense slum quarter where desperate creatures claw out survival among the refuse. Beneath the surface, flooded sewers hide worse things still. The sounds of skittering claws and collapsing masonry echo endlessly across the cracked pavement.',
  max_players = 6
WHERE slug = 'warrens';

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

  -- A7. Dustfall Extraction (extraction)
  ('dustfall-extraction',
   'Dustfall Extraction',
   'A wide intersection where the ruins fall back, leaving an unexpected expanse of open sky. Dust drifts down endlessly from the crumbling buildings above, catching light like grey snow. A half-collapsed pedestrian bridge arches overhead — beneath it, the ground has been swept clean in a perfect circle. This is where the shard thins. This is where you leave.',
   'extraction',
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
