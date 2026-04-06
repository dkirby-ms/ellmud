-- 019_room_flavor_rewrite.sql — Complete room name and description rewrite
--
-- Updates all Siltgate and Warrens room names and descriptions to align with
-- dystopian Gulf Coast setting (year 3000, ruins of New Orleans).
-- Based on Laeral's complete room description document (revision 2.0).
--
-- Covers 212 rooms:
--   - 137 Siltgate rooms (136 original + 1 topology fix: rubble-passage-1)
--   - 75 Warrens rooms (65 original + 9 topology fixes + 1 shattered-gate)
--   - Topology fixes from migrations 005 and 007 are included

BEGIN;

-- ============================================================================
-- Update zone descriptions
-- ============================================================================

UPDATE zones SET description = 'The ruins of New Orleans, transformed. The Mississippi shifted west into the Atchafalaya centuries ago, leaving Siltgate stranded on a silted delta. Water still defines this place — not the river, but the Gulf, creeping inland through flooded streets and collapsed seawalls. Pre-extinction townhouses tilt into the mud, their iron balconies wrapped in spanish moss. The air is thick with humidity, salt, and the smell of decay layered over growth. Drones rust in the overgrowth. You are not the first to wake here.'
WHERE slug = 'the-siltgate';

UPDATE zones SET description = 'Beneath Siltgate''s ruins lies a network of pre-extinction infrastructure — storm drains, service tunnels, and forgotten maintenance corridors. The flooding didn''t reach everywhere; some chambers remain dry, filled with stale air and the detritus of the old world. Rats have made kingdoms here. The walls are scratched with claw marks, and the darkness presses close. You hear skittering echoes in every direction.'
WHERE slug = 'warrens';

-- ============================================================================
-- Update Siltgate room names and descriptions
-- ============================================================================

UPDATE zone_rooms SET name = 'Apothecary', description = 'Cracked glass jars line shelves bolted to a tilting wall, their contents long since congealed into unidentifiable pastes. A mortar and pestle sits on the counter, stained green with algae-bloom residue. The smell of mold and forgotten medicine hangs thick.'
WHERE slug = 'apothecary' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Ash Garden', description = 'A courtyard garden gone feral, where magnolias and crepe myrtles have burst through flagstone paths and a live oak draped in spanish moss dominates the center. The original plantings are strangled beneath kudzu, and the iron benches have become part of the undergrowth.'
WHERE slug = 'ash-garden' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Ashgate', description = 'The gateway into the eastern wastes stands flanked by toppled drone sentinels, their corroded hulls fused to the crumbling brick. Scorch marks blacken the archway where ancient weapons fire melted stone to glass. Beyond, the ruins stretch into a haze of ash and humidity.'
WHERE slug = 'ashgate' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Burned Chapel', description = 'Fire-blackened walls frame a roofless nave where rain has pooled on the altar. Giant roaches nest in the charred pews, but someone has placed fresh wildflowers in a cracked vase near the door. Faith persists even here.'
WHERE slug = 'ashgate-chapel' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Barnacled Quay', description = 'Wooden platforms extend over brackish water thick with oil sheen and algae blooms. Barnacles crust every surface below the waterline, and vendors sell hand-drawn navigation charts marking safe passages through the drowned streets.'
WHERE slug = 'barnacled-quay' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Bazaar Row', description = 'Scavengers hawk drone components and spider silk from floating platforms anchored to submerged bollards. The brackish water reflects green algae-light off their wares, and somewhere nearby, accordion music drifts through the humid air.'
WHERE slug = 'bazaar-row-1' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Bazaar Row', description = 'Waterlogged stalls lean against collapsed storefronts, selling everything from roach chitin armor to pre-extinction curiosities. Haggling voices echo off crumbling brick while giant roaches scuttle between the vendors'''' feet.'
WHERE slug = 'bazaar-row-2' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Bazaar Row', description = 'The bazaar narrows here into a choke-point of hanging tarps and swaying rope bridges, vendors crammed shoulder-to-shoulder above the murky water. A woman sells jars of bioluminescent algae for lamp-fuel; a man offers smoked rat jerky by the strip.'
WHERE slug = 'bazaar-row-3' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Beggar King''''s Court', description = 'A raised platform of lashed-together debris serves as the court of the Span''''s self-proclaimed sovereign. Offerings of salvage and food are piled at the edges, and the surrounding shacks lean inward as if bowing. Rats watch from every shadow.'
WHERE slug = 'beggar-kings-court' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Beggar''''s Lane', description = 'A collapsed townhouse leans at a drunken angle, its iron-lace balcony dangling over flooded streets. Spanish moss hangs from broken shutters, and kudzu has consumed the ground floor. A faint lamplight glows from the upper level.'
WHERE slug = 'beggars-lane-1' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Beggar''''s Lane', description = 'An alley choked with debris and vegetation where kudzu has bridged the gap overhead, creating a tunnel of green shadow. Water flows through in a steady stream, and rat-runs line the upper walls. Move quickly.'
WHERE slug = 'beggars-lane-2' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Beggar''''s Lane', description = 'The lane sinks lower here, water rising to mid-calf. Corrugated tin walls channel the flow between listing shacks, and the stench of open sewage mingles with cook-smoke. Children''''s laughter echoes from somewhere above the waterline.'
WHERE slug = 'beggars-lane-3' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Belvedere', description = 'A rooftop observation platform built atop a half-collapsed hotel, reached by a rickety external staircase. From here you can see across the drowned streets to the Gulf''''s grey horizon. Wind-shredded awnings snap and flutter overhead.'
WHERE slug = 'belvedere' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Blackwater Crossing', description = 'The road dips beneath oily black water that reflects no light. Submerged vehicles form stepping-stones for those who know the route, but one misstep means chest-deep muck. The crossing reeks of petroleum and rotting vegetation.'
WHERE slug = 'blackwater-crossing' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Blast Crater', description = 'A bowl of fused earth and melted steel marks where a drone swarm detonated its payload a millennium ago. The glass-smooth crater floor holds stagnant rainwater, and nothing grows here—not even kudzu. The silence is absolute.'
WHERE slug = 'blast-crater' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Bone Canal', description = 'A narrow waterway flanked by crumbling brick where the current carries debris and worse. Pale things that might be bones tumble past in the murky flow. The canal walls are etched with high-water marks well above your head.'
WHERE slug = 'bone-canal' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Bone Pit', description = 'A heap of collapsed masonry and twisted rebar creates a treacherous hill. Salvagers have carved paths through the debris, and lamps glow deep in the crevices—someone''''s living in there. The whole structure groans when the wind picks up.'
WHERE slug = 'bone-pit' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Broken Bridge', description = 'Shattered concrete and broken glass create an obstacle course barely above the waterline. The collapse is recent enough that the edges are sharp, not yet worn smooth by weather. One wrong step means a nasty cut or a plunge into dark water below.'
WHERE slug = 'broken-bridge' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Carrion Field', description = 'An open lot where drone carcasses have been dragged and piled for stripping. Scavengers have picked the machines to skeletal frames, and carrion birds roost on the rusted antennae. The ground is stained with machine oil and something darker.'
WHERE slug = 'carrion-field' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Chandler''''s Shop', description = 'Tallow candles and salvaged oil lamps crowd every shelf in this cramped, low-ceilinged shop. The chandler works at a bench near the back, rendering rat fat into cheap tallow. The greasy smoke stains everything a yellowish brown.'
WHERE slug = 'chandlers-shop' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'City Gate', description = 'Massive iron gates hang open on rusted hinges, their once-proud crests obscured by decades of algae and bird droppings. The road beyond dissolves into flooded streets where mangrove roots grip the asphalt. Siltgate opens before you, vast and drowned.'
WHERE slug = 'city-gate' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Cloth Merchant''''s Hall', description = 'Bolts of spider-silk fabric and woven kudzu-fiber hang from ceiling hooks, swaying in the draft. The merchant weighs her goods on a salvaged scale, trading cloth for drone parts or food. Moths the size of your palm flutter among the textiles.'
WHERE slug = 'cloth-merchants-hall' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Cobblestone Street', description = 'Original cobblestones peek through centuries of silt, their rounded surfaces slick with algae. The buildings flanking the street lean toward each other overhead, nearly meeting, creating a dim green corridor of dripping stone and hanging moss.'
WHERE slug = 'cobblestone-street-1' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Cobblestone Street', description = 'The cobblestones here are buckled upward by mangrove roots, making the footing treacherous. Brackish water runs between the displaced stones in a dozen tiny streams. A faded street sign, barely legible, reads something ending in ''''-ille.'''''
WHERE slug = 'cobblestone-street-2' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Cobblestone Street', description = 'This stretch of cobblestones sits slightly higher than the surrounding streets, making it one of the dryer paths through the district. Vendors have claimed the advantage, setting up lean-to stalls against the building facades. Trade flows as steadily as the water below.'
WHERE slug = 'cobblestone-street-3' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Collapsed Building', description = 'What was once a multi-story building is now a single pile of rubble slowly sinking into the silted mud. Mushrooms grow from the mortar, and spiders have strung webs between the jutting rebar. The sound of settling stone is constant.'
WHERE slug = 'collapsed-building-1' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Collapsed Building', description = 'The building pancaked decades ago, leaving fragments of walls and floors jutting at odd angles. Kudzu has claimed the ruins completely, and rats nest in the debris, their runs visible as packed trails through the vegetation.'
WHERE slug = 'collapsed-building-2' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Collapsed Building', description = 'Only two walls remain standing, meeting at a corner that frames open sky. The interior is a jungle of vine and rubble, and a colony of bats roosts in what was once a third-floor closet, now exposed to the elements.'
WHERE slug = 'collapsed-building-3' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Collapsed Sewer', description = 'The tunnel ceiling gave way here, dumping tons of earth and pavement into the passage. Water seeps through the blockage in muddy rivulets. Rats have burrowed through the collapse, but nothing human-sized is getting past.'
WHERE slug = 'collapsed-sewer' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Courtyard Fountain', description = 'A stone fountain stands in the center of a flooded courtyard, its basin overflowing with rainwater and algae. The carved figure atop it has eroded into an unrecognizable lump. Three passages lead away through vine-draped archways.'
WHERE slug = 'courtyard-fountain' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Crumbling Wall', description = 'A long section of fortification wall crumbles into the flooded street, its bricks spilling like loose teeth. Vegetation erupts from every crack, and the top of the wall serves as a precarious elevated walkway for those brave enough to balance.'
WHERE slug = 'crumbling-wall-1' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Crumbling Wall', description = 'The wall here has partially collapsed outward, creating a ramp of rubble and vine that connects street level to the higher ground beyond. Spiders have claimed the intact sections, their webs spanning the gaps like silver curtains.'
WHERE slug = 'crumbling-wall-2' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Dock Street', description = 'Shipping containers welded into platforms float on the flooded street, connected by swaying gangplanks. Salvage skiffs tie up to rusted cleats while fishermen hawk mutant catfish. The water here is deep—you can''''t see bottom.'
WHERE slug = 'dock-street-1' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Dock Street', description = 'A makeshift dock built atop submerged pilings where scavengers unload drone components from flat-bottomed boats. The smell of fish guts and battery acid mingles in the humid air. Something large moves beneath the murky surface.'
WHERE slug = 'dock-street-2' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Dock Street', description = 'The street is fully submerged here, navigable only by boat or by wading the chest-deep channel that follows the old sidewalk. Salt-crusted ropes are strung between lampposts as guide-lines. The Gulf''''s tidal pull is palpable.'
WHERE slug = 'dock-street-3' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Dock Street', description = 'Crane arms from a pre-extinction loading dock jut over the water like skeletal fingers. Salvagers have rigged pulleys to the booms for hauling cargo from the boats below. Rust flakes fall like orange snow with every gust of wind.'
WHERE slug = 'dock-street-4' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Dock Street', description = 'A pier of salvaged materials where the Gulf''''s currents are strong enough to require securing every vessel twice. Nets full of scavenged debris hang drying in the sun. The water is murky green and hides treacherous depth.'
WHERE slug = 'dock-street-5' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Dockside Tavern', description = 'A shipping container converted into a drinking establishment, its walls cut with windows and its roof patched with corrugated tin. Inside, salvagers nurse cups of algae-brew and trade stories of the deep water. A hand-painted sign reads ''''The Rusty Hook.'''''
WHERE slug = 'dockside-tavern' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Drain Grate', description = 'A heavy iron grate set in the flooded street marks the entrance to the sewers below. The bars are bent and corroded, wide enough for a person to squeeze through. Foul air rises from the darkness, and you hear distant rushing water.'
WHERE slug = 'drain-grate-1' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Drain Grate', description = 'This grate is nearly buried under silt and debris, only one corner visible above the waterline. Rats stream in and out through the gaps, their bodies slick with sewer muck. The stench alone is enough to make your eyes water.'
WHERE slug = 'drain-grate-2' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Drowned Shrine', description = 'The cathedral''''s massive doors hang askew, revealing an interior overgrown with mangroves sprouting from flooded tile. Krewe Calliope masks hang from the vaulted ceiling like strange angels. You hear drums from somewhere deep within.'
WHERE slug = 'drowned-shrine' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Dry Dock', description = 'A concrete basin that once held ships for repair now holds only mud and standing water. The massive gates are frozen open by rust. Salvagers have built lean-tos against the basin walls, using the sheltered space as a workshop for boat repairs.'
WHERE slug = 'dry-dock' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Dust Bowl', description = 'An anomalous dry patch where the ground is cracked clay and the air shimmers with heat. The surrounding water has receded here due to some underground drainage, leaving behind a bowl of baked earth and bleached debris.'
WHERE slug = 'dust-bowl' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Effluent Outflow', description = 'A massive pipe discharges murky water into the flooded street in a constant, reeking stream. The outflow has carved a channel through the silt, and the water here is discolored and foul. Nothing lives near the pipe mouth.'
WHERE slug = 'effluent-outflow' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Estate Gate', description = 'Wrought-iron gates twisted into abstract shapes by age and storm frame the entrance to the old Garden District. The pillars still bear fragments of carved stone—a lion''''s paw, a fleur-de-lis. Beyond, grand oaks arch over flooded avenues.'
WHERE slug = 'estate-gate' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Fish Market', description = 'The stench of fish—mutant catfish, gar, and things without names—hits you before the sight. Vendors work on floating platforms, gutting and scaling their catches. Gulls and giant roaches compete for the offal tossed into the water below.'
WHERE slug = 'fish-market' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Flooded Chamber', description = 'Waist-deep water fills this vaulted room, its surface covered in a thick layer of green duckweed. The walls bear faded murals now streaked with water damage and mold. Something bumps against your legs beneath the surface.'
WHERE slug = 'flooded-chamber' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Flophouse', description = 'Hammocks and rope beds are strung at every conceivable angle in this gutted building, stacked three high. The air is thick with the smell of unwashed bodies and mildew. A hand-lettered sign charges ''''one salvage piece per night.'''''
WHERE slug = 'flophouse' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Fountain Plaza', description = 'A flooded square where mangroves have taken root, their aerial roots creating a maze above the standing water. Giant spider webs span between the trees, their silk gleaming in the filtered green light. You give them wide berth.'
WHERE slug = 'fountain-plaza' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Fungal Cavern', description = 'Bioluminescent fungi coat the walls in patches of sickly blue-green light, their caps as wide as dinner plates. The air is thick with spores that catch in your throat. Puddles on the floor glow faintly, reflecting the fungal light.'
WHERE slug = 'fungal-cavern' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Garden Terrace', description = 'A terraced hillside garden gone completely wild, its stone retaining walls buckled by root systems. Jasmine and honeysuckle tangle with kudzu in a fragrant, impenetrable wall of green. Stone steps, cracked and mossy, lead between the overgrown levels.'
WHERE slug = 'garden-terrace' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Glassblower''''s Workshop', description = 'A brick furnace still stands in the center of this workshop, cold now for centuries. Shelves hold the remains of delicate glasswork—bottles, vials, ornamental pieces—most shattered by tremors or time. Sand and broken glass crunch underfoot.'
WHERE slug = 'glassblowers-workshop' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Guild Hall', description = 'A row of merchant shelters built on stilts extends over standing water, their foundations barnacle-crusted. Battery cores and salvaged optics fill crates while vendors shout prices over the drone of insects. The scent of Gulf salt pervades everything.'
WHERE slug = 'guild-hall' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Gutter Drain', description = 'A narrow channel cut between buildings carries runoff toward the sewers, its flow persistent and foul. The walls are slick with black mold, and the footing consists of submerged debris you can''''t see. Rats watch from dry ledges overhead.'
WHERE slug = 'gutter-drain' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Harbourmaster''''s Office', description = 'The old harbourmaster''''s building sits on reinforced pilings above the high-water mark, its walls patched with shipping container steel. Inside, maps of the drowned coast cover every surface. Whoever controls this office controls the dock trade.'
WHERE slug = 'harbourmasters-office' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Highwind Bridge', description = 'A suspension bridge of salvaged cable and metal grating spans a flooded gap between two building rooftops. The wind at this height is fierce, and the bridge sways with every step. Far below, dark water churns with unseen currents.'
WHERE slug = 'highwind-bridge' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Iron Balcony', description = 'A row of Creole cottages submerged to their second stories, their pastel paint faded to uniform grey. Families make do with the upper floors while water sloshes through empty rooms below. Laundry hangs between buildings on salvaged cable.'
WHERE slug = 'iron-balcony-1' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Iron Balcony', description = 'The ornate ironwork of these balconies has rusted into lace-like fragility, beautiful but treacherous. You edge along the narrow walkway, gripping the railing gently—too much pressure and the whole thing could give. Below, the flooded street reflects green sky.'
WHERE slug = 'iron-balcony-2' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Jeweler''''s Lane', description = 'A slender alley barely wide enough for one person, its walls close and oppressive. A single merchant displays salvaged jewelry under glass—tarnished silver, clouded gems, a gold tooth mounted on a chain. The prices are steep and non-negotiable.'
WHERE slug = 'jewelers-lane' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Lean-To Camp', description = 'Sheets of corrugated tin and plastic tarp form a cluster of makeshift shelters, their occupants gone but their belongings remain—a bedroll, a dented pot, a child''''s toy carved from driftwood. The camp feels recently abandoned.'
WHERE slug = 'lean-to-camp' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Library Entrance', description = 'Massive stone columns frame a doorway choked with vine and rubble. Beyond, you glimpse rows of collapsed shelving and the papery remains of books dissolved by a millennium of humidity. The musty smell of decayed paper is overwhelming.'
WHERE slug = 'library-entrance' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Market Square', description = 'The heart of Siltgate''''s commerce sprawls across a flooded plaza where floating platforms and elevated walkways connect dozens of stalls. The noise is tremendous—bartering, music, the splash of boats. Everything has a price here, and everything is for sale.'
WHERE slug = 'market-square' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Merchant''''s Inn', description = 'A three-story building whose ground floor is permanently flooded, its upper levels converted into cramped guest rooms. A rope ladder provides access from the dock-level entrance. The innkeeper charges extra for rooms above the mosquito line.'
WHERE slug = 'merchant-inn' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Money-Changers'''' Row', description = 'Makeshift counting-houses line a raised boardwalk where money-changers weigh salvage and assign barter-credits. Abacuses click and scales balance as traders argue conversion rates. Armed guards stand at every door—currency is a dangerous business.'
WHERE slug = 'money-changers-row' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Mud Flat', description = 'The water recedes here to reveal a stretch of grey, sucking mud that grabs at your feet with every step. Fiddler crabs swarm the exposed flats, and the stench of low tide is eye-watering. It''''s the fastest route, if you don''''t mind the filth.'
WHERE slug = 'mud-flat' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Narrow Alley', description = 'Salvage stalls cluster in ankle-deep water, their wares protected under patched tarps. The smell of rust and algae-brew mingles with mutant rat meat sizzling on makeshift grills. Mosquitoes swarm thick enough to choke on.'
WHERE slug = 'narrow-alley-1' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Narrow Alley', description = 'The alley bends sharply between two leaning buildings, their upper floors nearly touching overhead. Someone has strung wire between the walls hung with dangling bottles—an alarm system or wind chimes, you can''''t tell which.'
WHERE slug = 'narrow-alley-2' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Narrow Alley', description = 'A gap between tilting buildings where water rises to knee-depth and the walls drip condensation. Salvaged cables hang overhead like vines. The passage stinks of mildew and rat musk, and the exit seems very far away.'
WHERE slug = 'narrow-alley-3' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Narrow Alley', description = 'The walls press close enough to touch both sides at once, and the sky above is just a sliver of grey. Water trickles down the brickwork in persistent streams. You have to turn sideways to pass the rusted fire escape blocking half the path.'
WHERE slug = 'narrow-alley-4' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Narrow Alley', description = 'The passage squeezes between collapsed storefronts, forcing you to turn sideways in places. Algae coats the walls in slick green, and the footing is treacherous. Something watches from a window above—you feel it more than see it.'
WHERE slug = 'narrow-alley-5' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Narrow Alley', description = 'Graffiti in faded pigment covers the alley walls—symbols you don''''t recognize, warnings or prayers left by previous generations. The paint runs and bleeds where water has streaked it. Rats have gnawed through the baseboards on both sides.'
WHERE slug = 'narrow-alley-6' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Narrow Alley', description = 'Shards of mirror glass embedded in the alley walls catch and scatter your lamplight in disorienting flashes. The effect was probably decorative once; now it makes the passage feel like a funhouse. The glass crunches underfoot where pieces have fallen.'
WHERE slug = 'narrow-alley-7' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Narrow Alley', description = 'The alley opens briefly into a tiny courtyard where a cistern collects rainwater. Someone has chalked directions on the wall—arrows pointing to ''''market'''' and ''''dock.'''' The cistern water looks clean enough, but you''''ve learned not to trust appearances here.'
WHERE slug = 'narrow-alley-8' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'News Board', description = 'A large board of salvaged plywood stands in a small cleared area, covered in pinned notices—job postings, missing persons, warnings about rat swarms, and cryptic messages in code. A few people linger, reading and muttering.'
WHERE slug = 'news-board' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Noble Residence', description = 'The remains of a Garden District mansion, its columns intact but its roof collapsed inward. Magnolia trees grow wild in the flooded parlor, and mutant snakes nest in the chandelier wreckage. Wealth means nothing to the Gulf.'
WHERE slug = 'noble-residence-1' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Noble Residence', description = 'This plantation-style house has sunk unevenly, its east wing submerged while its west wing tilts skyward. Inside, water-stained portraits of forgotten families hang at drunken angles. A family of possums has claimed the grand piano.'
WHERE slug = 'noble-residence-2' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Observatory', description = 'The dome of the old observatory has cracked open like an egg, exposing a rusted telescope to the elements. Vines spiral up the instrument''''s mount, and birds nest in the gears. On clear nights, you can still see stars through the gap.'
WHERE slug = 'observatory' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Pawn Alley', description = 'Every doorway along this narrow lane houses a pawnbroker dealing in specific salvage—one buys only electronics, another only tools, a third only weapons. Competition keeps prices honest and tempers short. Arguments echo off the close walls.'
WHERE slug = 'pawn-alley' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Pawn Shop', description = 'Wire cages and locked cabinets display an eclectic collection of pre-extinction artifacts alongside practical salvage. The shopkeeper sits behind reinforced glass, weighing offerings on a precision scale. A sign reads: ''''No credit. No exceptions.'''''
WHERE slug = 'pawn-shop' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Pier', description = 'A makeshift dock built atop submerged pilings where scavengers unload drone components from flat-bottomed boats. The smell of fish guts and battery acid mingles in the humid air. Something large creates a wake beneath the platform.'
WHERE slug = 'pier-1' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Pier', description = 'Warped wooden planks extend over deep water where the current runs strong. The pier groans and shifts with the tides, and several sections have been replaced with mismatched scrap metal. Fishing lines dangle from every railing.'
WHERE slug = 'pier-2' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Pier', description = 'The furthest pier juts into open water where the Gulf''''s grey expanse meets the drowned cityscape. Wind tears at the tattered awning overhead, and the salt spray is constant. Boats are moored in a tight cluster, bumping and creaking against their lines.'
WHERE slug = 'pier-3' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Plague Bearer''''s Lair', description = 'The cathedral''''s crypt has been repurposed into something far worse—a nest of disease and decay. The walls seep moisture stained yellow-green, and the air is thick with a sweetness that burns your sinuses. Whatever lives here has been here a very long time.'
WHERE slug = 'plague-bearers-lair' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Plague House', description = 'Red-painted crosses mark the door of this boarded-up house, a quarantine sign from a forgotten era. The boards have rotted through, and the interior is a black void that exhales warm, fetid air. Nobody goes inside. Nobody comes out.'
WHERE slug = 'plague-house' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Promenade Walk', description = 'The old promenade''''s iron railings are crusted with barnacles at the waterline, marking how high the floods reach. Grand buildings line the walk, their facades cracked but still elegant in ruin. Pigeons and roaches share the ornamental ledges.'
WHERE slug = 'promenade-walk-1' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Promenade Walk', description = 'Cracked marble tiles underfoot tell of former elegance. The promenade''''s grand lampposts still stand, wrapped in creeping fig and crowned with bird nests. The buildings here retain faded painted signs for hotels and restaurants that served a vanished world.'
WHERE slug = 'promenade-walk-2' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Promenade Walk', description = 'Spanish moss hangs in curtains from every structure along this stretch, filtering the light into green shadow. Brackish water pools in every depression, and mosquitoes swarm so thick you taste them. Beautiful, terrible, alive.'
WHERE slug = 'promenade-walk-3' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Promenade Walk', description = 'What was once an elegant boulevard is now a canal of sluggish brown water flanked by crumbling facades. Vines cascade from upper balconies like green waterfalls. A heron stands motionless in the shallows, watching you pass with ancient indifference.'
WHERE slug = 'promenade-walk-4' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Rat Run', description = 'A passage so narrow the walls brush your shoulders, its surfaces gnawed smooth by generations of rats. Droppings crunch underfoot, and the air is thick with ammonia. You can hear them in the walls—hundreds of them, breathing and shifting.'
WHERE slug = 'rat-run-1' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Rat Run', description = 'The corridor is riddled with burrow-holes, each one large enough for a dog-sized rat to lunge from. Scratch-marks score the walls in parallel grooves, and the floor is a compressed layer of droppings and shed fur. You are not welcome here.'
WHERE slug = 'rat-run-2' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Rope Walk', description = 'Salvaged ropes and cables are strung between buildings at multiple heights, creating a web of walkways above the flooded street. The rope-walk sways underfoot, and the drop to dark water below is unsettling. Experienced locals move with practiced ease.'
WHERE slug = 'rope-walk' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Rubble Street', description = 'The road is buried under a landslide of collapsed buildings, creating a ridge of broken masonry and tangled rebar. A narrow footpath has been kicked through the debris, but the footing shifts constantly. Dust rises with every step.'
WHERE slug = 'rubble-street-1' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Rubble Street', description = 'Chunks of concrete the size of automobiles block the old street, forcing travelers to climb over and squeeze between them. Moss and lichen soften the edges, and pools of stagnant water fill every hollow. Mosquito larvae swirl in the puddles.'
WHERE slug = 'rubble-street-2' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Rubble Street', description = 'This section of road has buckled upward, cracked and heaved by root systems beneath. The resulting rubble field is dotted with hardy weeds and nesting insects. A corroded street sign juts from the debris at a forty-five-degree angle.'
WHERE slug = 'rubble-street-3' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Rubble Street', description = 'A mountain of pulverized brick and mortar dominates the passage, the remains of an entire city block compressed into a single slope. Salvagers have driven stakes into the rubble to mark safe paths. The unstable ground shifts and groans.'
WHERE slug = 'rubble-street-4' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Rubble Street', description = 'Rebar tangles like briars across the rubble-choked street, snagging clothing and skin with rusty barbs. Someone has bent the worst of it aside and marked the cleared path with strips of colored cloth. You follow the ribbons carefully.'
WHERE slug = 'rubble-street-5' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Ruined Tenement', description = 'A row of connected apartments has sagged into itself, each unit collapsing into the one below. The bottom floor is completely submerged, and the upper levels are a maze of tilted hallways and buckled doors. Rats stream between the rooms freely.'
WHERE slug = 'ruined-tenement-1' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Ruined Tenement', description = 'The tenement''''s exterior wall has fallen away, exposing a cross-section of tiny apartments—each one a snapshot of lives interrupted. Wallpaper peels in long strips, and furniture hangs suspended over the void. Nature has filled every room with green.'
WHERE slug = 'ruined-tenement-2' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Sailmaker''''s Loft', description = 'Bolts of canvas and spider-silk fabric are stacked to the ceiling in this elevated workshop. The sailmaker stitches by lamplight, fingers quick and sure, repairing the sails and tarps that keep Siltgate''''s boats and shelters functional.'
WHERE slug = 'sailmakers-loft' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Scavenger''''s Market', description = 'A covered market where drone components are the primary currency. Disassembled sensor arrays, servo motors, and intact solar cells are displayed on salvaged tables. The vendors know the value of every bolt and circuit to the last trade-credit.'
WHERE slug = 'scavengers-market' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Scorched Plaza', description = 'The plaza''''s paving stones are fused into glass in patches where ancient weapons fire struck. Charred stumps of trees ring the edges, though new growth—tenacious live oaks—pushes up through the cracks. Scorch marks radiate outward from a central impact point.'
WHERE slug = 'scorched-plaza' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Scribe''''s Corner', description = 'A small, sheltered nook where a scribe works by lamplight, copying maps and records onto salvaged paper. Ink jars and quills clutter a tilted desk, and stacks of yellowed documents teeter on every surface. Knowledge is currency here.'
WHERE slug = 'scribe-corner' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Serpent''''s Den', description = 'Cottonmouths and mutant water moccasins coil in the warm, dark interior of this collapsed building, their bodies thick as a human arm. The air smells of snake musk and wet stone. You freeze—the nearest one has already seen you.'
WHERE slug = 'serpent-den' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Servants'''' Passage', description = 'A hidden corridor behind the walls of a grand house, its plaster peeling to reveal brick and lath. The passage is low and cramped, built for people who were meant to be neither seen nor heard. Cobwebs fill the space like curtains.'
WHERE slug = 'servants-passage' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Sewer Cistern', description = 'A large underground reservoir where water collects from multiple drain-pipes. The cistern is half-full of dark, still water, its surface broken only by the occasional drip from above. The acoustics amplify every sound into distorted echoes.'
WHERE slug = 'sewer-cistern-1' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Sewer Junction', description = 'Three tunnels converge in a vaulted chamber where the water runs knee-deep and the current pulls in conflicting directions. Maintenance numbers, barely legible, are stenciled on the walls above each passage. The rats have their own routes overhead.'
WHERE slug = 'sewer-junction-1' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Sewer Junction', description = 'A wider section of tunnel where side passages branch off into darkness. The water flows from multiple directions, creating eddies and whirlpools around a central drain grate. The iron grate is jammed with debris and rat bones.'
WHERE slug = 'sewer-junction-2' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Sewer Junction', description = 'The tunnel opens into a cylindrical chamber where pipes enter from several levels. Water cascades from the upper pipes in thin streams, creating a constant curtain of spray. The noise is deafening, and visibility is poor through the mist.'
WHERE slug = 'sewer-junction-3' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Sewer Tunnel', description = 'The tunnel slopes through ankle-deep water that tastes of chemicals and decay. Something skitters in the darkness ahead—rats, or worse. Your lamp reflects off countless watching eyes.'
WHERE slug = 'sewer-tunnel-1' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Sewer Tunnel', description = 'Corroded pipes line the ceiling of this passage, dripping a brownish liquid at irregular intervals. The walls are streaked with mineral deposits in orange and green. The water underfoot has a faint chemical glow.'
WHERE slug = 'sewer-tunnel-2' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Sewer Tunnel', description = 'The tunnel narrows until your shoulders nearly touch both walls. The brickwork here is ancient—hand-laid and crumbling—and the mortar crumbles at a touch. You hear running water ahead, and the draft carries a cold, mineral smell.'
WHERE slug = 'sewer-tunnel-3' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Sewer Tunnel', description = 'A maintenance corridor choked with debris and rat droppings, the air thick with ammonia stench. Water pools in the low spots, and you hear the echo of skittering from multiple directions. This is their territory now.'
WHERE slug = 'sewer-tunnel-4' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Sewer Tunnel', description = 'The tunnel curves gently, obscuring what lies ahead. The water deepens around the bend, rising from ankle to shin. Fungal growth covers the walls in phosphorescent patches that pulse faintly, like breathing.'
WHERE slug = 'sewer-tunnel-5' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Sewer Tunnel', description = 'A flooded passage where the ceiling is so low you must duck, and the water comes to mid-thigh. The current is stronger here, pulling toward some unseen drain. Rat carcasses float past in the flow—something bigger than rats hunts down here.'
WHERE slug = 'sewer-tunnel-6' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Sewer Tunnel', description = 'The brickwork gives way to rough-hewn stone in this section, as if the tunnel was carved rather than built. Chisel marks are visible on the walls, and the floor is uneven bedrock. The water here is icy cold and crystal clear.'
WHERE slug = 'sewer-tunnel-7' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Sewer Tunnel', description = 'Clusters of pipes run along the ceiling, some intact, others burst and spraying thin jets of water. The tunnel floor is a patchwork of original brick and improvised repairs—scrap metal, poured concrete, even compacted earth. The rats have marked every surface.'
WHERE slug = 'sewer-tunnel-8' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Sewer Vault', description = 'A domed underground chamber where the city''''s main sewer lines once converged. The vault is cathedral-like in scale, its ceiling lost in shadow. Water pours from broken conduits into a central pool where the current spirals downward into blackness.'
WHERE slug = 'sewer-vault' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Shattered Bridge', description = 'The remains of an elevated highway overpass jut from the rubble like broken bones. The road surface hangs in mid-air, cracked and tilting, with nothing but a thirty-foot drop to flooded ruins below. Pigeons nest in the exposed rebar.'
WHERE slug = 'shattered-bridge' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Silk Road', description = 'Spider-silk merchants have claimed this dead-end street, hanging samples of their harvested fiber like banners. The silk gleams in the filtered light—strong as cable, light as cloth. Giant orb-weavers are kept in cages nearby, spinning ceaselessly.'
WHERE slug = 'silk-road' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Silt Pool', description = 'A depression in the ground has filled with grey, silty water so thick it''''s nearly mud. The pool bubbles occasionally, releasing trapped gases that smell of sulfur and rot. Nothing visible lives in it, but the surface sometimes moves on its own.'
WHERE slug = 'silt-pool' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Silver Arcade', description = 'The skeleton of a grand hotel''''s arcade stretches overhead, its glass roof long shattered but its iron framework intact. Merchants have hung tarps from the arches, creating a covered market. Light filters through in shifting patterns.'
WHERE slug = 'silver-arcade-1' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Silver Arcade', description = 'The arcade''''s mosaic floor—once depicting Gulf wildlife—is cracked and scattered but still visible in patches. Vendor stalls are arranged between the surviving columns, selling specialty salvage: optics, precision tools, medical supplies.'
WHERE slug = 'silver-arcade-2' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Silver Arcade', description = 'A section of the arcade where the upper floors have collapsed into a slope of rubble, creating a natural amphitheater. Merchants sell from terraced positions on the debris, their goods displayed on flattened slabs of concrete and marble.'
WHERE slug = 'silver-arcade-3' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Silver Arcade', description = 'The deepest section of the arcade is dim and cool, sheltered from the sun by intact portions of the hotel above. High-value trades happen here in hushed tones. The merchants watch each other as carefully as they watch their customers.'
WHERE slug = 'silver-arcade-4' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Smuggler''''s Cove', description = 'A concealed inlet beneath a collapsed wharf, accessible only at low tide or by those who know the underwater entrance. Crates of contraband are stacked on a dry ledge, and the smell of lamp oil and gunpowder is sharp in the damp air.'
WHERE slug = 'smugglers-cove' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Span Gate', description = 'The entrance to Beggar''''s Span is marked by two listing telephone poles lashed together with rope, supporting a sagging crossbeam. Beyond, the district''''s tilting houses crowd together over flooded lanes. The smell of cook-smoke and sewage greets you.'
WHERE slug = 'span-gate' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Tar Pit', description = 'A bubbling pool of ancient asphalt has risen to the surface through cracked pavement, its black surface dotted with trapped insects and small animals. The tarry smell is overwhelming, and the heat radiating from the pool is unnatural.'
WHERE slug = 'tar-pit' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Tavern Row', description = 'Three competing drinking establishments line this short street, their doors open to the humid air. Music—fiddle, drum, and something that might be a saxophone—bleeds from each one, creating a discordant symphony. The crowd spills between them freely.'
WHERE slug = 'tavern-row' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Thieves'''' Den', description = 'A concealed room behind a false wall in a collapsed building, its entrance disguised by hanging vines. Inside, stolen goods are sorted and catalogued with surprising precision. The thieves are gone, but they''''ll be back—the lamps are still warm.'
WHERE slug = 'thieves-den' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Tide Gate', description = 'Massive rusted floodgates, designed to hold back storm surge, stand permanently jammed half-open. The Gulf''''s tidal water flows freely through the gap, rising and falling twice daily. Crossing requires timing—or swimming.'
WHERE slug = 'tide-gate' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Undercity Gate', description = 'A reinforced doorway built into the foundations of a collapsed building, leading down into the tunnels below Siltgate. Salvage marks and directional arrows are scratched into the stone around the frame. Cool, damp air rises from below.'
WHERE slug = 'undercity-gate' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Warehouse', description = 'A vast corrugated-iron structure listing badly to one side, its loading doors frozen half-open. Inside, rows of rusted shelving hold the decayed remnants of pre-extinction goods—unidentifiable lumps in rotted packaging. Rats have claimed the upper levels.'
WHERE slug = 'warehouse-1' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Warehouse', description = 'The warehouse floor is ankle-deep in water that has seeped through the foundation. Wooden crates have swelled and burst, spilling their contents into the murk. The smell of wet wood and mold fills the cavernous space, and pigeons roost in the rafters.'
WHERE slug = 'warehouse-2' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Warehouse', description = 'This warehouse has been partially converted into living quarters—walls of stacked crates divide the interior into rooms, and hammocks hang from the ceiling joists. The current occupants have left their belongings but not their cooking fire, which still smolders.'
WHERE slug = 'warehouse-3' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Wine Merchant''''s Cellar', description = 'Stone steps descend into a flooded cellar where wine racks still line the walls, their bottles green with algae. Most are empty or broken, but occasionally a salvager finds one still sealed—ancient vintages worth a fortune in trade-credits.'
WHERE slug = 'wine-merchants-cellar' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Wrecked Barricade', description = 'A barricade of overturned vehicles, furniture, and debris blocks most of the street, built by long-dead defenders against a threat that''''s been forgotten. The barrier is crumbling now, slowly being absorbed by the vegetation that grips it from every direction.'
WHERE slug = 'wrecked-barricade' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');

UPDATE zone_rooms SET name = 'Rubble Passage', description = 'A narrow path threads between collapsed walls and leaning steel beams in the heart of Ashgate''''s ruins. The rubble shifts underfoot with each step, and corroded drone chassis protrude from the debris like metal tombstones. The passage connects two pockets of wreckage.  ---'
WHERE slug = 'rubble-passage-1' AND zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate');


-- ============================================================================
-- Update Warrens room names and descriptions
-- ============================================================================

UPDATE zone_rooms SET name = 'Shattered Gate', description = 'Twisted metal and pulverized concrete spread in every direction, the aftermath of a drone swarm''''s final engagement. Rust-orange water collects in blast craters, and kudzu creeps over the wreckage like a shroud. The air tastes of iron and wet ash.'
WHERE slug = 'shattered-gate' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Ashfall Gardens', description = 'A sunken courtyard where ash-grey soil supports only the hardiest plants—ironweed, rat-tail grass, and a single twisted fig tree. The surrounding buildings form a natural windbreak, and the relative shelter has attracted a colony of enormous cockroaches.'
WHERE slug = 'ashfall-gardens' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'The Beggar King''''s Throne', description = 'The throne room of the rat kingdom—a raised platform surrounded by bones and offerings of scavenged metal. The Rat King coils upon itself, a knot of flesh and fur and teeth. All its eyes find you at once. The chittering stops. Everything goes quiet.'
WHERE slug = 'beggar-kings-throne' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Blind Alley', description = 'The alley terminates at a wall of collapsed brick, a dead end in every sense. Rats have burrowed through at ground level, but you''''re too large to follow. Scratch-marks on the walls suggest others have tried—and failed—to climb out.'
WHERE slug = 'blind-alley' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'The Charnel Pit', description = 'A pit carved from the bedrock beneath the Warrens, its floor carpeted with bones both old and fresh. The walls are polished smooth by countless bodies pressing past. Something massive breathes in the darkness at the bottom, slow and patient.'
WHERE slug = 'charnel-pit' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Cistern Access', description = 'A chamber where water has pooled deep and stagnant, its surface filmed with algae. The smell is sulfurous, and rats cling to upper ledges, refusing to enter the water. That''''s a bad sign—they know something you don''''t.'
WHERE slug = 'cistern-access' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Collapsed Tenement', description = 'The building folded in on itself like a house of cards, each floor pancaking onto the one below. Now it''''s a compressed sandwich of debris—plaster, wood, wire, and the crushed possessions of vanished lives. Roaches swarm the exposed edges.'
WHERE slug = 'collapsed-tenement' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'The Dyer''''s Vats', description = 'Ancient stone vats, once used for dyeing cloth, now hold stagnant pools of chemical-tinged water. The stone is stained in permanent bands of indigo and ochre. Rats drink from the vats despite the toxicity—or perhaps because of it, grown immune over generations.'
WHERE slug = 'dyers-vats' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Gallows Square', description = 'A wooden framework still stands in the center of this open area, its original purpose unmistakable. Rats have built nests in the crossbeam, and their droppings streak the posts white. The square serves as a reluctant crossroads—no one lingers.'
WHERE slug = 'gallows-square' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Gutter Bridge', description = 'Waist-deep water fills this passage, flowing steadily deeper into the Warrens. Your lamp reflects off the surface, but you can''''t see bottom. Something large creates ripples from ahead—moving toward you or away, you can''''t tell.'
WHERE slug = 'gutter-bridge' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'The Plague Ward', description = 'Rows of rotted cots fill this long chamber, each one a deathbed from a forgotten epidemic. The walls are stained with handprints at waist height—the dying, reaching for help that never came. Even the rats avoid the darkest corners.'
WHERE slug = 'plague-ward' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'The Rubble Maze', description = 'Collapsed walls create a labyrinth of tight corridors and dead ends, the debris piled high enough to block all sight lines. Rats have established ambush points throughout, using their intimate knowledge of the terrain. You hear them flanking.'
WHERE slug = 'rubble-maze' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Blackwater Crossing', description = 'The tunnel opens into a flooded intersection where black, oily water flows from four directions. The current is deceptively strong, and the water is opaque—you can''''t see your feet. Rats cross on pipes bolted to the ceiling above.'
WHERE slug = 'sewer-blackwater-crossing' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'The Bone Shelf', description = 'A natural ledge in the sewer wall is piled with bones—rat bones mostly, but some are larger. The rats have arranged them with disturbing deliberateness, femurs parallel, skulls facing outward. It looks almost like a shrine.'
WHERE slug = 'sewer-bone-shelf' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'The Drowned Cistern', description = 'A cavernous water-storage chamber now flooded to chest height. The water is warm and murky, hiding whatever waits beneath. Ripples spread from the far wall where something moves. The cistern''''s acoustic properties turn every splash into thunder.'
WHERE slug = 'sewer-cistern' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Collapsed Drain', description = 'The drain tunnel has caved in completely here, filling the passage with earth and broken pipe. Water seeps through the collapse in muddy streams, and the air is thick with clay dust. This route is sealed—permanently.'
WHERE slug = 'sewer-collapsed-drain' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'The Deep Channel', description = 'The tunnel floor drops away sharply here, and the water goes from knee-deep to over your head in a single step. A narrow ledge along one wall provides the only passage. The water in the channel is cold and fast-moving, and you hear it roaring as it drains into something deeper.'
WHERE slug = 'sewer-deep-channel' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Rusted Drain Grate', description = 'A massive iron grate blocks most of the tunnel, its bars corroded but still solid. Rats slip between the gaps easily, but you''''ll need to find the section where the bars have rusted through—there, in the lower corner, just wide enough.'
WHERE slug = 'sewer-drain-grate' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Eastern Conduit', description = 'The tunnel extends into darkness, its walls slick with mold and its ceiling dripping steadily. You hear water flowing somewhere below, and above it, the constant scratch and skitter of rat claws. They''''re everywhere down here.'
WHERE slug = 'sewer-east-conduit' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Effluent Pool', description = 'A low-ceilinged chamber where waste water has collected in a reeking pool. The surface is crusted with a grey-green scum that cracks when disturbed. Rats the size of terriers lurk at the edges, and the territorial ones are already showing teeth.'
WHERE slug = 'sewer-effluent-pool' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'The Flooded Vault', description = 'A vaulted chamber half-submerged in black water, its original purpose lost beneath the flood. Pillars rise from the water like drowned sentinels. Between them, dog-sized rats perch on floating debris, their eyes tracking you with predatory intelligence.'
WHERE slug = 'sewer-flooded-vault' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Fungal Grotto', description = 'Bioluminescent mushrooms coat every surface in a pulsing blue-green glow, some as tall as your forearm. The spores in the air are thick enough to see, and they make your head swim. Rats here are pale and eyeless, navigating by sound and smell alone.'
WHERE slug = 'sewer-fungal-grotto' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'The Gas Pocket', description = 'The air here burns your eyes and catches in your throat—methane or something worse, seeping from cracks in the tunnel floor. Your lamp flame turns blue and lengthens dangerously. Linger here too long and you won''''t wake up.'
WHERE slug = 'sewer-gas-pocket' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Lurker''''s Den', description = 'A side chamber where something has been feeding—bones are piled in a corner, stripped clean and cracked for marrow. The den stinks of musk and old blood. Whatever lives here is large, patient, and currently absent. Or hiding.'
WHERE slug = 'sewer-lurker-den' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Main Drainage Junction', description = 'A den where mutant rats have piled their refuse—gnawed bones, shredded plastic, and things you don''''t want to examine closely. The chittering is constant, coming from multiple directions. You''''re at a crossroads in their kingdom.'
WHERE slug = 'sewer-main-junction' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Northern Drain Tunnel', description = 'The tunnel runs straight and long toward the northern outskirts, its brick walls better-preserved than most. The water flows southward in a steady current, and the draft carries a faint hint of fresh air—the surface is closer here.'
WHERE slug = 'sewer-north-tunnel' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Overflow Chamber', description = 'A massive chamber designed to absorb flood surges, its walls ringed with overflow channels at multiple heights. The current population of mutant rats has turned it into an arena—bones and territorial markings cover the floor. You''''ve entered the fighting pit.'
WHERE slug = 'sewer-overflow-chamber' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'The Pipe Maze', description = 'A tangle of interconnected pipes of varying diameters fills this section of tunnel. Some are large enough to crawl through, others too small for anything but rats. The maze of metal creates echoes that make directional hearing impossible.'
WHERE slug = 'sewer-pipe-maze' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Rat King''''s Nest', description = 'Shredded cloth, gnawed wood, and matted fur form a massive communal nest filling half the chamber. The nest pulses with movement—dozens of rats, intertwined and seething. The dominant ones are scarred, heavy, and unafraid of your light.'
WHERE slug = 'sewer-rat-nest' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Silt Chamber', description = 'Centuries of sediment have nearly filled this chamber, leaving only a few feet of clearance between the silt floor and the brick ceiling. You crawl through on hands and knees, the wet silt sucking at your limbs. Multiple passages branch off at silt level.'
WHERE slug = 'sewer-silt-chamber' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Southern Drain Tunnel', description = 'The tunnel angles downward, and the water deepens with every step. The southern wall is cracked, and tree roots have forced their way through, creating a curtain of pale tendrils that brush your face as you pass. The rats use them as highways.'
WHERE slug = 'sewer-south-tunnel' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Western Conduit', description = 'A long, straight conduit of corroded iron pipe, its interior coated with scale and mineral deposits. The pipe is just large enough to walk through hunched over. Water trickles along the bottom, and the echoes of your footsteps reach far ahead, announcing your presence.'
WHERE slug = 'sewer-west-conduit' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'The Sluice Gate', description = 'A massive gate mechanism controls water flow at this junction, its wheel rusted but still partially functional. Waist-deep water thunders through the partially open sluice, and the spray soaks everything. Passages lead off in several directions above the waterline.'
WHERE slug = 'sluice-gate' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Grime-Caked Stoop', description = 'A set of crumbling steps leads to a doorless threshold coated in decades of compacted filth. The stoop is a rat highway—their greasy trails are worn into the stone. You can feel them watching from the dark interior, calculating your threat level.'
WHERE slug = 'slum-r4c1' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'The Pinch', description = 'The passage narrows until the walls nearly touch, forcing you sideways through a gap barely wider than your chest. Rats flow through effortlessly, their bodies compressing to squeeze past. In this tight space, there''''s nowhere to swing a weapon.'
WHERE slug = 'slum-r4c2' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Ashfall Tenement', description = 'A gutted tenement where ash-grey dust coats every surface, remnant of some long-ago fire. The walls are scored with claw marks at rat height, and nesting material—shredded cloth, paper, and fur—fills every corner. The silence between the chittering is worse.'
WHERE slug = 'slum-r4c3' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Blighted Courtyard', description = 'An enclosed courtyard where nothing grows but black mold and pale, sickly mushrooms. The flagstones are cracked and heaved, and pools of stagnant water breed mosquitoes in clouds. Rats drink from the pools brazenly, their eyes reflecting your lamplight.'
WHERE slug = 'slum-r4c4' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Gallows Lean', description = 'A tilting wooden structure leans so far you wonder what keeps it standing. The building creaks with every gust of wind, and rats cascade between the leaning floors like water. The ground-level passage beneath it is a gauntlet of dripping rot.'
WHERE slug = 'slum-r4c5' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Mildew Row', description = 'Every surface here wears a thick coat of white and green mildew, the spores so dense they form a visible haze in your lamplight. The smell is choking—damp earth and decay. Rats have tunneled through the mildewed walls, leaving trails of exposed brick.'
WHERE slug = 'slum-r4c6' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'The Gutter Shrine', description = 'Someone has built a crude altar from salvaged debris in a flooded gutter—drone parts, rat skulls, and candle stubs arranged with care. The offerings are fresh. Whatever faith survives here has gone feral and strange.'
WHERE slug = 'slum-r4c7' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Scrapheap Alley', description = 'Piles of twisted metal and broken machinery choke this narrow lane, scavenged from the surrounding ruins and sorted into rough categories. Rats nest in the hollows between the heaps, using the metal warren as a fortress. Sharp edges catch the light—and the unwary.'
WHERE slug = 'slum-r5c1' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Drowned Cellar Mouth', description = 'A cellar entrance yawns open in the flooded street, its stairs descending into black water. Rats stream up and down the steps, diving without hesitation into the darkness below. Bubbles rise from the depths, and the water stinks of something chemical and wrong.'
WHERE slug = 'slum-r5c2' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Charcoal Stacks', description = 'Mounds of charcoal from burned-out buildings have been piled here, staining everything sooty black. The air tastes of old smoke, and the ground crunches with each step. Rats have burrowed into the charcoal piles, their exits marked by sprays of black dust.'
WHERE slug = 'slum-r5c3' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'The Cage Walk', description = 'Salvaged wire mesh and rebar cages line both sides of this passage, originally built to trap rats for food. Some cages still hold occupants—live ones, dead ones, and some in between. The surviving rats outside the cages watch you with unmistakable malice.'
WHERE slug = 'slum-r5c4' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Blackened Hearth', description = 'A massive brick hearth stands exposed where the surrounding building has crumbled away. The firepit is cold but the ashes are recent—someone cooks here. Rats circle the hearth at a respectful distance, drawn by food scraps but wary of the heat-memory.'
WHERE slug = 'slum-r5c5' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Rag-Curtain Lane', description = 'Strips of fabric—rags, really—hang across this passage like curtains, dividing the space into blind segments. You can''''t see more than a few feet ahead, but you can hear movement behind every rag. The rats use the curtains for cover, launching ambushes.'
WHERE slug = 'slum-r5c6' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Hollow-Eyed Row', description = 'A row of buildings whose windows have all been smashed out stares at you with dark, empty sockets. The interiors are gutted—nothing but shadows and rat-shine. The wind blows through the hollow structures, producing a low, mournful howl.'
WHERE slug = 'slum-r5c7' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Ironmonger''''s Ruin', description = 'The collapsed remains of a metalworker''''s shop, its forge cold and its anvil half-buried in rubble. Rusted tools and scraps of worked iron litter the floor. Rats have claimed the forge-pit as a nesting site, its stone bowl warm from the bodies packed inside.'
WHERE slug = 'slum-r6c1' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'The Filth Trough', description = 'A channel of concentrated sewage runs through this depression, its surface thick with grey scum. The stench is physically painful, and your eyes stream. Rats swim through it unbothered, their mutations having long since adapted them to the toxicity.'
WHERE slug = 'slum-r6c2' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Broken Stair Landing', description = 'A staircase rises from the flooded ground floor, its steps crumbling away with each use. The landing at the top is the only dry ground in sight, and it''''s contested territory—claw marks and dried blood suggest regular battles for the high ground.'
WHERE slug = 'slum-r6c3' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Fever Alley', description = 'The air here is unnaturally warm and wet, heated by some underground source—a broken steam pipe, maybe, or geothermal seepage. The heat breeds disease, and the rats here are mangy and aggressive, their bites more likely to fester than elsewhere.'
WHERE slug = 'slum-r6c4' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Coffin Narrows', description = 'The passage narrows into a killing ground where rats can attack from burrows on both sides. Bones litter the floor—some animal, some disturbingly humanoid. The walls are close enough to touch with outstretched arms, and the ceiling presses low.'
WHERE slug = 'slum-r6c5' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Sootfall Corner', description = 'A perpetual rain of black soot drifts down from a chimney somewhere above, coating every surface in a fine dark layer. Your footprints are the only marks—until you notice the smaller prints weaving between them. The soot-covered rats are nearly invisible.'
WHERE slug = 'slum-r6c6' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'The Choking Yard', description = 'A small, enclosed yard where the air barely moves. The stagnation concentrates the smells—rat musk, rotting wood, and the sweet-sick scent of decay. Breathing is difficult, and your lungs rebel. The rats here pant in the heat, mouths open, teeth bared.'
WHERE slug = 'slum-r6c7' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Slop Gutter Bend', description = 'The gutter curves sharply here, creating a blind corner that''''s perfect for ambush. The water carries a slurry of waste and rat hair, and the flow accelerates around the bend. Rats cling to the walls above the waterline, watching the corner with predatory patience.'
WHERE slug = 'slum-r7c1' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'The Dead Lantern', description = 'A shattered lantern hangs from a rusted hook, its glass gone and its wick long burned out. The darkness here is near-total—your own light barely pushes it back. Rats are bolder in the dark, and you feel them testing your defenses with quick, probing rushes.'
WHERE slug = 'slum-r7c2' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Vermin Court', description = 'A wide chamber where generations of rats have established a colony of staggering size. The walls are honeycombed with burrows, and the floor writhes with bodies. Hierarchy is visible—the largest rats hold the center, while runts scurry the edges.'
WHERE slug = 'slum-r7c3' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Cracked Basin Hollow', description = 'A stone washbasin, cracked down the center, sits in a hollow where two passages meet. The basin still catches rainwater from a leak above, and rats queue to drink from it with eerie discipline. The pecking order is enforced with swift, vicious bites.'
WHERE slug = 'slum-r7c4' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Tallow-Smoke Run', description = 'The air is thick with greasy smoke from a tallow-rendering fire somewhere nearby. The haze reduces visibility to arm''''s length, and rats use the smoke screen expertly—you hear them circling but can''''t pin down a direction. Your eyes burn.'
WHERE slug = 'slum-r7c5' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Beggar''''s Alcove', description = 'A shallow niche in the wall that once sheltered a beggar—a threadbare blanket and empty tin cup remain. Now it shelters rats. The largest one sits in the niche like a grotesque parody of its former human occupant, watching you with calculating red eyes.'
WHERE slug = 'slum-r7c6' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'The Last Ditch', description = 'The final passage before the Warrens give way to open sewer. A trench has been dug—or gnawed—across the floor, creating a moat of filthy water. The rats on the far side are organized, alert, and positioned like sentries guarding their kingdom''''s border.'
WHERE slug = 'slum-r7c7' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'The Sunken Square', description = 'The ground here dropped during some ancient subsidence, creating a bowl-shaped depression now permanently flooded. Buildings rim the edges, leaning inward, and the water at the center is deep and dark. Multiple passages radiate outward like spokes.'
WHERE slug = 'sunken-square' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Tannery Ruins', description = 'Chemical-stained vats and stretched hides—now petrified into stiff, cracked sheets—fill this ruined workshop. The tanning chemicals have seeped into the ground, creating a toxic zone where only the most resilient organisms thrive. The rats here are enormous and oddly colored.'
WHERE slug = 'tannery-ruins' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'The Ratways', description = 'A warren of tunnels gnawed through earth and rubble by generations of mutant rats, now large enough for a crouching human to navigate. The walls are smooth and packed, the floor carpeted in compressed droppings. Every surface bears the mark of claws and teeth.'
WHERE slug = 'the-ratways' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'The Tilted Tower', description = 'A clock tower tilts at a twenty-degree angle, its internal stairs a nightmare of shifted geometry. The clock face is frozen at 4:47—the moment, perhaps, when the building shifted. From the top, you can see the Warrens spread below in all their squalid glory.'
WHERE slug = 'tilted-tower' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Watchmen''''s Post', description = 'A fortified guard station built from salvaged materials at a tunnel intersection. The post is abandoned but well-constructed—loopholes for observation, a reinforced door, a small dry room. Someone maintained it until recently. The logbook on the desk is open to a half-finished entry.'
WHERE slug = 'watchmens-post' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Gutter Sewer', description = 'A crumbling stairway descends from the gutter-level streets into a low tunnel where the ceiling weeps condensation. The transition from slum to sewer is marked by a tide-line of filth on the walls and a sudden drop in temperature. Rats stream past your ankles, heading deeper.'
WHERE slug = 'gutter-sewer' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Drip Tunnel', description = 'Water drips from a thousand tiny cracks in the tunnel ceiling, creating a constant percussion that drowns out all other sound. The floor is a shallow lake of accumulated drips, and the walls are streaked white with mineral deposits. Your footsteps splash in rhythm with the dripping.'
WHERE slug = 'sewer-drip-tunnel' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Cracked Conduit', description = 'A long crack runs the length of this conduit, letting in thin blades of light from somewhere above. Roots have exploited the crack, dangling into the tunnel like pale fingers. Water seeps through steadily, and the vegetation provides cover for rats watching from the shadows.'
WHERE slug = 'sewer-cracked-conduit' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Blind Turn', description = 'The tunnel bends sharply here, a ninety-degree turn that eliminates all forward visibility. The acoustics are strange—sounds from around the corner arrive distorted and amplified. You press against the wall, listening hard before committing to the turn.'
WHERE slug = 'sewer-blind-turn' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Narrow Drain', description = 'The tunnel pinches to barely shoulder-width, forcing you to squeeze through sideways. The brick walls are slick with black slime, and the water underfoot is barely ankle-deep but flowing fast. Rats pass through the constriction without slowing, their bodies compressing like liquid.'
WHERE slug = 'sewer-narrow-drain' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Rubble Choke', description = 'A partial cave-in has narrowed this tunnel to a crawlspace choked with broken brick and earth. Water streams through the gaps in the rubble, and you can feel the draft from the far side. You''''ll have to belly-crawl through, and the debris shifts with every movement.'
WHERE slug = 'sewer-rubble-choke' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Trickle Passage', description = 'A thin stream of relatively clear water trickles along a groove worn into the tunnel floor over centuries. The passage is quiet here—unusually so. The rats have avoided this stretch for some reason, and the only sound is the soft murmur of flowing water.'
WHERE slug = 'sewer-trickle-passage' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Slime Channel', description = 'Every surface in this tunnel is coated in a thick layer of greenish-black slime that smells of decay and copper. The floor is treacherously slippery, and the walls offer no grip. The slime seems almost alive, pulsing faintly in the light of your lamp.'
WHERE slug = 'sewer-slime-channel' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

UPDATE zone_rooms SET name = 'Stagnant Pool', description = 'The tunnel widens into a shallow pool where the water has stopped moving entirely. A skin of grey-green algae covers the surface, undisturbed and eerily still. Gas bubbles occasionally break through the scum with a soft pop, releasing the smell of rotten eggs.'
WHERE slug = 'sewer-stagnant-pool' AND zone_id = (SELECT id FROM zones WHERE slug = 'warrens');

COMMIT;