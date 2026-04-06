-- Migration 020: Retheme creatures and items for dystopian Gulf Coast setting
-- Source: Laeral's creature & item retheme design document
-- Updates names, descriptions, and room_descriptions to align with post-apocalyptic
-- Gulf Coast setting (mutant fauna, scavenged tech, faction references).
-- IDs, stats, loot tables, and behavior flags are unchanged — cosmetic/narrative only.

BEGIN;

-- ============================================================
-- CREATURE RETHEMES (creature_definitions table)
-- ============================================================

-- city_dog → Silt Roach
UPDATE creature_definitions
SET name = 'Silt Roach',
    description = 'A plate-sized cockroach with a rust-brown carapace, skittering between piles of debris. Its antennae twitch constantly, sensing vibration. Mostly scavenges the dead, but will swarm the living if disturbed.',
    room_description = 'A giant roach picks through debris, its antennae twitching.'
WHERE type = 'city_dog';

-- pigeon_flock → Mosquito Swarm
UPDATE creature_definitions
SET name = 'Mosquito Swarm',
    description = 'A thick, droning cloud of mosquitoes, each one grotesquely swollen — the size of a man''s thumb. They move as one, drawn to body heat and the carbon dioxide of breathing. The sound alone makes your skin crawl.',
    room_description = 'A cloud of bloated mosquitoes drifts through the air, droning.'
WHERE type = 'pigeon_flock';

-- feral_dog → Feral Hog
UPDATE creature_definitions
SET name = 'Feral Hog',
    description = 'A bristle-backed hog with yellowed tusks and mean, piggy eyes. Centuries of unchecked breeding have made them massive — this one is the size of a small car. Its hide is scarred from territorial fights and its breath reeks of carrion.',
    room_description = 'A feral hog roots through rubble, tusks gleaming.'
WHERE type = 'feral_dog';

-- alley_thug → Render-Kin Stalker
UPDATE creature_definitions
SET name = 'Render-Kin Stalker',
    description = 'A lean, scarred figure that moves with predatory grace — almost human, but wrong. Its arms are too long, its fingers tipped with thick yellow nails like claws, and its jaw juts forward over a lipless mouth. It watches you with eyes set too far apart. Something like intelligence burns behind them.',
    room_description = 'A clawed mutant crouches in the shadows, watching.'
WHERE type = 'alley_thug';

-- dockside_smuggler → Bone-Tithe Hoarder
UPDATE creature_definitions
SET name = 'Bone-Tithe Hoarder',
    description = 'A gaunt, skeletal figure with elongated fingers and sunken eyes, its waxy skin stretched tight over bone. Scavenged drone optics hang from its neck like amulets. It clutches a bundle of salvage to its chest and hisses at your approach — the sound of something that would kill before it shares.',
    room_description = 'A gaunt mutant crouches over a pile of salvage, hissing.'
WHERE type = 'dockside_smuggler';

-- plague_bearer → Fester-Thrall
UPDATE creature_definitions
SET name = 'Fester-Thrall',
    description = 'A shambling, asymmetrical shape wrapped in its own weeping sores. Tumorous growths bulge from its shoulders and neck. You can see the ghost of a human skeleton under the distortions — a spine that curves wrong, fingers fused into paddles, a face that looks half-melted. The air around it shimmers with a sweet, chemical reek. Where it walks, the algae blooms thicker.',
    room_description = 'A misshapen mutant shambles past, trailing the stench of rot and chemicals.'
WHERE type = 'plague_bearer';

-- the_harbourmaster → The Graftlord
UPDATE creature_definitions
SET name = 'The Graftlord',
    description = 'A massive, bloated figure draped in corroded scrap metal and rusted chain, sitting on a throne of overturned desks and barnacle-crusted anchors. Vestigial limbs twitch from its back. A tarnished port authority badge is pinned to what might once have been a uniform, now fused to its mottled gray-green skin. It does not speak. It does not need to. Everything in this ruin belongs to it.',
    room_description = 'The Graftlord looms on its throne of rust and rubble, watching.'
WHERE type = 'the_harbourmaster';

-- ============================================================
-- ITEM RETHEMES (item_definitions table)
-- ============================================================

-- alley_thugs_coin → Scavenged Circuit Board
UPDATE item_definitions
SET name = 'Scavenged Circuit Board',
    description = 'A cracked circuit board stripped from a pre-extinction drone, its copper traces still faintly visible under corrosion. The Bone-Tithes hoard these obsessively. Traders accept them as scrap value — a fraction of a draw.'
WHERE id = 'alley_thugs_coin';

-- noble_signet_ring → Pre-Extinction Signet Ring
UPDATE item_definitions
SET name = 'Pre-Extinction Signet Ring',
    description = 'A tarnished ring bearing an engraved family crest — unrecognizable now, from a bloodline that ended a thousand years ago. The metalwork is fine enough to suggest wealth. The Kindari would pay to study the alloy.'
WHERE id = 'noble_signet_ring';

-- city_map → Salvaged City Map
UPDATE item_definitions
SET name = 'Salvaged City Map',
    description = 'A laminated pre-extinction street map of New Orleans, water-stained and brittle. Half the streets are flooded or collapsed now, but the bones of the grid are still recognizable. Someone has scratched new annotations in charcoal — safe routes, danger zones, water sources.'
WHERE id = 'city_map';

-- silk_scarf → Bloom-Stained Cloth
UPDATE item_definitions
SET name = 'Bloom-Stained Cloth',
    description = 'A strip of woven fabric discolored by exposure to the mutant algae bloom — faintly luminescent green in low light. Krewe Calliope uses these in their rituals. Worth a few sips to the right buyer.'
WHERE id = 'silk_scarf';

-- healing_draught → Algae Salve
UPDATE item_definitions
SET name = 'Algae Salve',
    description = 'A thick, green paste sealed in a scavenged jar. Brewed from cultivated bloom algae by the Bloom Tenders, it promotes rapid cell regeneration when applied to wounds. Tastes vile. Works fast.'
WHERE id = 'healing_draught';

-- iron_sword → Rebar Machete
UPDATE item_definitions
SET name = 'Rebar Machete',
    description = 'A length of construction rebar, one end wrapped in electrical tape for grip, the other hammered flat and ground to a crude edge. Ugly, heavy, effective.'
WHERE id = 'iron_sword';

-- iron_chainmail → Scrap-Weave Vest
UPDATE item_definitions
SET name = 'Scrap-Weave Vest',
    description = 'A vest stitched together from overlapping strips of salvaged sheet metal, wired with drone cabling. It rattles when you move and chafes like hell, but it''ll stop a claw or a tusk.'
WHERE id = 'iron_chainmail';

-- voidforged_blade → Drone-Core Blade
UPDATE item_definitions
SET name = 'Drone-Core Blade',
    description = 'A blade forged from the alloy core of a military drone''s reactor housing. The metal has an unsettling blue-black sheen and is impossibly light for its hardness. The Kindari say the alloy composition doesn''t match anything in pre-extinction metallurgy databases. It hums faintly when swung.'
WHERE id = 'voidforged_blade';

-- shardsteel_sabre → Honed Drone Blade
UPDATE item_definitions
SET name = 'Honed Drone Blade',
    description = 'A long, single-edged blade cut from a military drone''s wing strut. The alloy is lighter and harder than anything the Kindari can reproduce — pre-extinction engineering at its finest. The edge holds indefinitely.'
WHERE id = 'shardsteel_sabre';

-- shardsteel_shard → Drone Alloy Shard
UPDATE item_definitions
SET name = 'Drone Alloy Shard',
    description = 'A jagged fragment of the unknown alloy found in military drone structural components. Too small to forge alone, but the Kindari pay well for these — they''re trying to reverse-engineer the composition.'
WHERE id = 'shardsteel_shard';

-- corroded_halberd → Corroded Fire Axe
UPDATE item_definitions
SET name = 'Corroded Fire Axe',
    description = 'A pre-extinction fire axe, its red paint long gone, its handle wrapped in waterlogged leather. The blade is pitted with rust but the weight behind it is still lethal. Someone etched tally marks into the haft.'
WHERE id = 'corroded_halberd';

-- rat_tail — description update only (name unchanged)
UPDATE item_definitions
SET description = 'A greasy, wiry tail snapped from a mutant rat. The Bloom Tenders buy these for biological study — they''re tracking mutation rates in the local population.'
WHERE id = 'rat_tail';

COMMIT;
