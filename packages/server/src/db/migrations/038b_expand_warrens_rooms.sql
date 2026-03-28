-- Migration 038b: Expand The Warrens — Phase 2: Slum grid rows 4-7, sewer level, reworked junctions.
-- ~49 rooms (28 slum grid + 20 sewer + 1 reworked junction). No exits — Phase 3 handles all exits.
-- Designed by Laeral (Content Designer), built by Bruenor (Content Builder).
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
