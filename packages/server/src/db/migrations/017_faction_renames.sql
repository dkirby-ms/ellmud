-- 017_faction_renames.sql — Faction and stronghold rename (thematic realignment)
--
-- Updates:
--   - Factions: ironwright → kindari, veil → bloom-tenders, scarlet → krewe-calliope
--   - Zones: the-foundry → the-reliquary, the-cartographium → the-bloom-observatory, the-counting-house → the-carrion-court
--   - All associated room names and descriptions updated to match new thematic direction

-- ============================================================================
-- Update factions table
-- ============================================================================

-- Update Kindari (formerly Ironwright Compact)
UPDATE factions
SET slug = 'kindari',
    name = 'The Kindari',
    description = 'Craft, preservation, and restoration. The Kindari believe the old world''s technology — properly understood and repaired — is the key to reclaiming the future. They scavenge drone components, restore mechanical systems, and venerate the pickling urns that saved humanity. Above all, they revere Saitcho Kindar — the anonymous inventor of the brine whose legacy preserved them all.'
WHERE slug = 'ironwright';

-- Update Bloom Tenders (formerly Veil Cartographers)
UPDATE factions
SET slug = 'bloom-tenders',
    name = 'The Bloom Tenders',
    description = 'Knowledge, adaptation, and navigation. The Bloom Tenders believe survival depends on understanding the new world — its ecology, its mutant wildlife, its chemical signals. They study the mutant algae that woke the urns, cultivating samples and tracking its spread across the Gulf. They believe the bloom carries meaning, patterns, perhaps even intent.'
WHERE slug = 'veil';

-- Update Krewe Calliope (formerly Scarlet Ledger)
UPDATE factions
SET slug = 'krewe-calliope',
    name = 'Krewe Calliope',
    description = 'Ritual, spectacle, and cultural preservation. Krewe Calliope emerged from the corrupted remnants of New Orleans Mardi Gras krewe culture. They preserve what it means to be human through ritual, music, art, and spectacle. They are part carnival troupe, part secret society, part death cult. They offer hope and meaning, but the price is participation in rituals that blur celebration and sacrifice.'
WHERE slug = 'scarlet';

-- ============================================================================
-- Update The Reliquary (formerly The Foundry) — Kindari stronghold
-- ============================================================================

UPDATE zones
SET slug = 'the-reliquary',
    name = 'The Reliquary',
    description = 'A converted water treatment plant on the edge of Siltgate. The massive concrete structure still has functional filtration systems, and the Kindari have turned it into a workshop complex. Industrial brutalist concrete with rusted catwalks, massive filtration tanks repurposed as storage, and the central chamber dominated by a shrine to Saitcho Kindar — a preserved pickling urn surrounded by scavenged drone components.',
    entry_room_slugs = '{reliquary-inn}',
    faction_slug = 'kindari'
WHERE slug = 'the-foundry';

-- Update The Reliquary room slugs
UPDATE zone_rooms SET slug = 'reliquary-commons' WHERE slug = 'foundry-commons';
UPDATE zone_rooms SET slug = 'reliquary-stash' WHERE slug = 'foundry-stash';
UPDATE zone_rooms SET slug = 'reliquary-armoury' WHERE slug = 'foundry-armoury';
UPDATE zone_rooms SET slug = 'reliquary-expedition-board' WHERE slug = 'foundry-expedition-board';
UPDATE zone_rooms SET slug = 'reliquary-market' WHERE slug = 'foundry-market';
UPDATE zone_rooms SET slug = 'reliquary-training' WHERE slug = 'foundry-training';
UPDATE zone_rooms SET slug = 'reliquary-infirmary' WHERE slug = 'foundry-infirmary';
UPDATE zone_rooms SET slug = 'reliquary-war-room' WHERE slug = 'foundry-war-room';
UPDATE zone_rooms SET slug = 'reliquary-inn' WHERE slug = 'foundry-inn';
UPDATE zone_rooms SET slug = 'reliquary-inn-upper' WHERE slug = 'foundry-inn-upper';

-- Update The Reliquary room names and descriptions
UPDATE zone_rooms
SET name = 'The Preservation Hall',
    description = 'You stand in a cavernous chamber where concrete pillars rise into shadow. At the center, a glass-walled shrine holds an intact pickling urn — the icon of survival, the vessel of Kindar''s miracle. The Kindari cluster around workbenches scattered throughout the hall, disassembling drone parts with reverent precision.'
WHERE slug = 'reliquary-commons';

UPDATE zone_rooms
SET name = 'The Archive Cistern',
    description = 'A drained water tank with numbered alcoves carved into its walls. Your gear rests here among coils of cable, vacuum-sealed tool kits, and salvaged battery cores. The air is dry and sterile.'
WHERE slug = 'reliquary-stash';

UPDATE zone_rooms
SET name = 'The Component Exchange',
    description = 'A warehouse floor where salvage is sorted, valued, and traded. Drone optics, solar panels, circuit boards — everything has a price calculated in utility and rarity.'
WHERE slug = 'reliquary-market';

UPDATE zone_rooms
SET name = 'The Pressure Chamber',
    description = 'A reinforced test room where machinery is stress-tested and combat drills run beneath flickering sodium lights. Hydraulic rams line one wall, their pistons hissing in timed rhythm.'
WHERE slug = 'reliquary-training';

UPDATE zone_rooms
SET name = 'The Salvage Wall',
    description = 'A metal wall covered in magnetic tags, each representing a drone swarm site, infrastructure ruin, or suspected cache of pre-extinction tech. Coordinates are scratched into steel plates.'
WHERE slug = 'reliquary-expedition-board';

UPDATE zone_rooms
SET name = 'The Waterworks',
    description = 'A gathering space built around a functioning filtration pool. The Kindari sit on the concrete rim, sharing ration packs and swapping repair techniques. The water is clear — a small miracle.'
WHERE slug = 'reliquary-infirmary';

UPDATE zone_rooms
SET name = 'The Schematic Vault',
    description = 'A locked room lined with salvaged blueprints, technical manuals, and hand-drawn diagrams of pre-extinction infrastructure. A map of Siltgate''s buried power grid covers the central table.'
WHERE slug = 'reliquary-war-room';

UPDATE zone_rooms
SET name = 'The Sleeper Cells',
    description = 'A sturdy inn built of riveted iron plates and dark timber. The common room smells of forge-smoke and stew. Iron lanterns hang from chains overhead, casting a warm glow across long benches where travellers rest between expeditions.'
WHERE slug = 'reliquary-inn';

UPDATE zone_rooms
SET name = 'The Sleeper Cells — Private Room',
    description = 'Rows of narrow bunks built into what were once filtration chambers. Each bunk has a locker and a lamp. The Kindari call them ''cells'' — a reminder of the urns.'
WHERE slug = 'reliquary-inn-upper';

UPDATE zone_rooms
SET name = 'The Assembly Bay',
    description = 'A workshop where the Kindari''s best technicians repair and restore salvaged equipment. Workbenches are cluttered with tools, circuit boards, and partially disassembled drone components. Everything here serves function over form.'
WHERE slug = 'reliquary-armoury';

-- Update The Reliquary exit references
UPDATE zone_exits SET from_room_slug = 'reliquary-commons' WHERE from_room_slug = 'foundry-commons';
UPDATE zone_exits SET to_room_slug = 'reliquary-commons' WHERE to_room_slug = 'foundry-commons';
UPDATE zone_exits SET from_room_slug = 'reliquary-stash' WHERE from_room_slug = 'foundry-stash';
UPDATE zone_exits SET to_room_slug = 'reliquary-stash' WHERE to_room_slug = 'foundry-stash';
UPDATE zone_exits SET from_room_slug = 'reliquary-armoury' WHERE from_room_slug = 'foundry-armoury';
UPDATE zone_exits SET to_room_slug = 'reliquary-armoury' WHERE to_room_slug = 'foundry-armoury';
UPDATE zone_exits SET from_room_slug = 'reliquary-expedition-board' WHERE from_room_slug = 'foundry-expedition-board';
UPDATE zone_exits SET to_room_slug = 'reliquary-expedition-board' WHERE to_room_slug = 'foundry-expedition-board';
UPDATE zone_exits SET from_room_slug = 'reliquary-market' WHERE from_room_slug = 'foundry-market';
UPDATE zone_exits SET to_room_slug = 'reliquary-market' WHERE to_room_slug = 'foundry-market';
UPDATE zone_exits SET from_room_slug = 'reliquary-training' WHERE from_room_slug = 'foundry-training';
UPDATE zone_exits SET to_room_slug = 'reliquary-training' WHERE to_room_slug = 'foundry-training';
UPDATE zone_exits SET from_room_slug = 'reliquary-infirmary' WHERE from_room_slug = 'foundry-infirmary';
UPDATE zone_exits SET to_room_slug = 'reliquary-infirmary' WHERE to_room_slug = 'foundry-infirmary';
UPDATE zone_exits SET from_room_slug = 'reliquary-war-room' WHERE from_room_slug = 'foundry-war-room';
UPDATE zone_exits SET to_room_slug = 'reliquary-war-room' WHERE to_room_slug = 'foundry-war-room';
UPDATE zone_exits SET from_room_slug = 'reliquary-inn' WHERE from_room_slug = 'foundry-inn';
UPDATE zone_exits SET to_room_slug = 'reliquary-inn' WHERE to_room_slug = 'foundry-inn';
UPDATE zone_exits SET from_room_slug = 'reliquary-inn-upper' WHERE from_room_slug = 'foundry-inn-upper';
UPDATE zone_exits SET to_room_slug = 'reliquary-inn-upper' WHERE to_room_slug = 'foundry-inn-upper';

-- ============================================================================
-- Update The Bloom Observatory (formerly The Cartographium) — Bloom Tenders stronghold
-- ============================================================================

UPDATE zones
SET slug = 'the-bloom-observatory',
    name = 'The Bloom Observatory',
    description = 'A repurposed offshore oil platform, partially submerged but stable, connected to Siltgate via a corroded causeway. The structure rises from the brackish Gulf like a rusted lighthouse. Open-air decks, salvaged telescope mounts, glass-walled observation chambers, and algae cultivation tanks. The platform is covered in crawling green growth — the Bloom Tenders cultivate the mutant algae, studying its behavior and chemical emissions.',
    entry_room_slugs = '{bloom-observatory-inn}',
    faction_slug = 'bloom-tenders'
WHERE slug = 'the-cartographium';

-- Update The Bloom Observatory room slugs
UPDATE zone_rooms SET slug = 'bloom-observatory-commons' WHERE slug = 'cartographium-commons';
UPDATE zone_rooms SET slug = 'bloom-observatory-stash' WHERE slug = 'cartographium-stash';
UPDATE zone_rooms SET slug = 'bloom-observatory-armoury' WHERE slug = 'cartographium-armoury';
UPDATE zone_rooms SET slug = 'bloom-observatory-expedition-board' WHERE slug = 'cartographium-expedition-board';
UPDATE zone_rooms SET slug = 'bloom-observatory-market' WHERE slug = 'cartographium-market';
UPDATE zone_rooms SET slug = 'bloom-observatory-training' WHERE slug = 'cartographium-training';
UPDATE zone_rooms SET slug = 'bloom-observatory-infirmary' WHERE slug = 'cartographium-infirmary';
UPDATE zone_rooms SET slug = 'bloom-observatory-war-room' WHERE slug = 'cartographium-war-room';
UPDATE zone_rooms SET slug = 'bloom-observatory-inn' WHERE slug = 'cartographium-inn';
UPDATE zone_rooms SET slug = 'bloom-observatory-inn-upper' WHERE slug = 'cartographium-inn-upper';

-- Update The Bloom Observatory room names and descriptions
UPDATE zone_rooms
SET name = 'The Tide Deck',
    description = 'You emerge onto an open platform slick with spray. Algae-stained railings ring the deck, and beyond them the Gulf stretches to the horizon — green, alive, and unknowable. Members of the Bloom Tenders crouch over cultivation trays, logging bloom patterns with quiet focus.'
WHERE slug = 'bloom-observatory-commons';

UPDATE zone_rooms
SET name = 'The Specimen Hold',
    description = 'A climate-controlled vault below deck, its shelves lined with sample jars, field kits, and personal effects sealed in waterproof cases. The air is cool and faintly chemical.'
WHERE slug = 'bloom-observatory-stash';

UPDATE zone_rooms
SET name = 'The Barter Net',
    description = 'A sheltered corner of the platform where the Bloom Tenders trade ecological data, biosamples, and navigation charts. Information is currency here.'
WHERE slug = 'bloom-observatory-market';

UPDATE zone_rooms
SET name = 'The Weather Deck',
    description = 'An exposed upper platform where the Bloom Tenders learn to read wind, water, and the telltale shimmer of chemical plumes. Navigational instruments salvaged from ships are bolted to the deck.'
WHERE slug = 'bloom-observatory-training';

UPDATE zone_rooms
SET name = 'The Chart Room',
    description = 'A sealed interior chamber with walls covered in hand-drawn maps — coastline shifts, algae bloom zones, drone debris fields. Expedition routes are plotted with colored thread.'
WHERE slug = 'bloom-observatory-expedition-board';

UPDATE zone_rooms
SET name = 'The Spillway',
    description = 'A communal gathering space built around a recirculating seawater pool. Members sit with feet in the water, sharing observations and brewing algae tea from cultivated strains. The tea tastes faintly sweet, faintly chemical. You''ve heard some people drink it every day.'
WHERE slug = 'bloom-observatory-infirmary';

UPDATE zone_rooms
SET name = 'The Signal Archive',
    description = 'A locked data room where biomonitoring logs, chemical signatures, and rival faction movements are tracked on salvaged whiteboards. The Bloom Tenders hoard patterns like treasure.'
WHERE slug = 'bloom-observatory-war-room';

UPDATE zone_rooms
SET name = 'The Bunks',
    description = 'A sheltered common area where the Bloom Tenders gather between shifts. The smell of saltwater and fermenting biomass mingles with the scent of algae tea. Crew members swap observations and share meals while seabirds cry overhead.'
WHERE slug = 'bloom-observatory-inn';

UPDATE zone_rooms
SET name = 'The Bunks — Private Room',
    description = 'Hammocks strung in a former control room, swaying with the platform''s subtle motion. Portholes look out over endless water. Sleep here is never silent — the Gulf is always talking.'
WHERE slug = 'bloom-observatory-inn-upper';

UPDATE zone_rooms
SET name = 'The Navigation Station',
    description = 'A workspace filled with charts, compasses, and weather instruments. The Bloom Tenders outfit expeditions here with navigation tools, environmental sensors, and protective gear suited for coastal exploration.'
WHERE slug = 'bloom-observatory-armoury';

-- Update The Bloom Observatory exit references
UPDATE zone_exits SET from_room_slug = 'bloom-observatory-commons' WHERE from_room_slug = 'cartographium-commons';
UPDATE zone_exits SET to_room_slug = 'bloom-observatory-commons' WHERE to_room_slug = 'cartographium-commons';
UPDATE zone_exits SET from_room_slug = 'bloom-observatory-stash' WHERE from_room_slug = 'cartographium-stash';
UPDATE zone_exits SET to_room_slug = 'bloom-observatory-stash' WHERE to_room_slug = 'cartographium-stash';
UPDATE zone_exits SET from_room_slug = 'bloom-observatory-armoury' WHERE from_room_slug = 'cartographium-armoury';
UPDATE zone_exits SET to_room_slug = 'bloom-observatory-armoury' WHERE to_room_slug = 'cartographium-armoury';
UPDATE zone_exits SET from_room_slug = 'bloom-observatory-expedition-board' WHERE from_room_slug = 'cartographium-expedition-board';
UPDATE zone_exits SET to_room_slug = 'bloom-observatory-expedition-board' WHERE to_room_slug = 'cartographium-expedition-board';
UPDATE zone_exits SET from_room_slug = 'bloom-observatory-market' WHERE from_room_slug = 'cartographium-market';
UPDATE zone_exits SET to_room_slug = 'bloom-observatory-market' WHERE to_room_slug = 'cartographium-market';
UPDATE zone_exits SET from_room_slug = 'bloom-observatory-training' WHERE from_room_slug = 'cartographium-training';
UPDATE zone_exits SET to_room_slug = 'bloom-observatory-training' WHERE to_room_slug = 'cartographium-training';
UPDATE zone_exits SET from_room_slug = 'bloom-observatory-infirmary' WHERE from_room_slug = 'cartographium-infirmary';
UPDATE zone_exits SET to_room_slug = 'bloom-observatory-infirmary' WHERE to_room_slug = 'cartographium-infirmary';
UPDATE zone_exits SET from_room_slug = 'bloom-observatory-war-room' WHERE from_room_slug = 'cartographium-war-room';
UPDATE zone_exits SET to_room_slug = 'bloom-observatory-war-room' WHERE to_room_slug = 'cartographium-war-room';
UPDATE zone_exits SET from_room_slug = 'bloom-observatory-inn' WHERE from_room_slug = 'cartographium-inn';
UPDATE zone_exits SET to_room_slug = 'bloom-observatory-inn' WHERE to_room_slug = 'cartographium-inn';
UPDATE zone_exits SET from_room_slug = 'bloom-observatory-inn-upper' WHERE from_room_slug = 'cartographium-inn-upper';
UPDATE zone_exits SET to_room_slug = 'bloom-observatory-inn-upper' WHERE to_room_slug = 'cartographium-inn-upper';

-- ============================================================================
-- Update The Carrion Court (formerly The Counting House) — Krewe Calliope stronghold
-- ============================================================================

UPDATE zones
SET slug = 'the-carrion-court',
    name = 'The Carrion Court',
    description = 'The half-collapsed New Orleans Superdome, its roof caved in and overgrown with vines, its interior transformed into a vast, echoing performance space. The Dome''s bowl is open to the sky now, rainwater pooling on the old field level. Krewe Calliope has built scaffolding stages, strung lanterns from the rusted girders, and painted murals on the concrete. The walls are covered in masks, banners, and ceremonial props from a thousand forgotten parades.',
    entry_room_slugs = '{carrion-court-inn}',
    faction_slug = 'krewe-calliope'
WHERE slug = 'the-counting-house';

-- Update The Carrion Court room slugs
UPDATE zone_rooms SET slug = 'carrion-court-commons' WHERE slug = 'counting-house-commons';
UPDATE zone_rooms SET slug = 'carrion-court-stash' WHERE slug = 'counting-house-stash';
UPDATE zone_rooms SET slug = 'carrion-court-armoury' WHERE slug = 'counting-house-armoury';
UPDATE zone_rooms SET slug = 'carrion-court-expedition-board' WHERE slug = 'counting-house-expedition-board';
UPDATE zone_rooms SET slug = 'carrion-court-market' WHERE slug = 'counting-house-market';
UPDATE zone_rooms SET slug = 'carrion-court-training' WHERE slug = 'counting-house-training';
UPDATE zone_rooms SET slug = 'carrion-court-infirmary' WHERE slug = 'counting-house-infirmary';
UPDATE zone_rooms SET slug = 'carrion-court-war-room' WHERE slug = 'counting-house-war-room';
UPDATE zone_rooms SET slug = 'carrion-court-inn' WHERE slug = 'counting-house-inn';
UPDATE zone_rooms SET slug = 'carrion-court-inn-upper' WHERE slug = 'counting-house-inn-upper';

-- Update The Carrion Court room names and descriptions
UPDATE zone_rooms
SET name = 'The Procession Gate',
    description = 'You pass beneath a crumbling archway into the bowl of the Superdome. The roof is gone, replaced by open sky and tangled vines. The field level is a shallow lake reflecting torchlight. Scaffolding stages rise from the water, and masked figures move through the space like actors on an endless set. Drums echo. Someone is always drumming.'
WHERE slug = 'carrion-court-commons';

UPDATE zone_rooms
SET name = 'The Wardrobe Vault',
    description = 'A backstage storage room lined with costume racks, prop trunks, and ceremonial regalia. Your belongings rest among feathered masks, tarnished instruments, and bolts of faded silk. Everything here is both gear and performance.'
WHERE slug = 'carrion-court-stash';

UPDATE zone_rooms
SET name = 'The Curiosity Bazaar',
    description = 'A sprawling market built on the old concourse level. Vendors sell scavenged goods, but also art, instruments, masks, festival tokens, and stranger things — blessings, fortunes, ritual participation. Everything is negotiable. Everything is theater.'
WHERE slug = 'carrion-court-market';

UPDATE zone_rooms
SET name = 'The Dance Floor',
    description = 'An open platform built above the waterline, its boards scarred by countless feet. Krewe members practice combat here — but it''s choreographed, ritualized, performed. Every strike is a step. Every block is a flourish. Fighting is theater.'
WHERE slug = 'carrion-court-training';

UPDATE zone_rooms
SET name = 'The Call Board',
    description = 'A bulletin wall backstage, covered in handwritten contracts, parade routes, and ritual schedules. The Krewe''s missions read like performance programs: ''Blessing Needed — Ashgate Ruins,'' ''Procession Escort — Dockward,'' ''Relic Recovery — The Drowned Veins (with music).'''
WHERE slug = 'carrion-court-expedition-board';

UPDATE zone_rooms
SET name = 'The Green Room',
    description = 'A communal lounge tucked behind the main stage. Krewe members gather here between performances, shedding masks, sharing drinks brewed from fermented algae, and swapping stories. The walls are covered in photos, playbills, and faded Mardi Gras beads.'
WHERE slug = 'carrion-court-infirmary';

UPDATE zone_rooms
SET name = 'The Inner Sanctum',
    description = 'A locked chamber deep beneath the Dome, accessible only to Krewe leadership. The walls are lined with ceremonial masks representing past Krewe captains. A central table holds maps, faction intelligence, and the Krewe''s true ledger — who owes what, who knows what, who''s watching whom. The masks watch you back.'
WHERE slug = 'carrion-court-war-room';

UPDATE zone_rooms
SET name = 'The Bunk Tiers',
    description = 'A gathering space in the old stadium seating where Krewe members rest between performances. Incense smoke drifts through the air. The sound of distant drums echoes through the Dome. Masks hang from every surface — watching, waiting, ready.'
WHERE slug = 'carrion-court-inn';

UPDATE zone_rooms
SET name = 'The Bunk Tiers — Private Alcove',
    description = 'Hammocks and cots strung in the old stadium seating, rising into the shadowed upper decks. Each tier has a different atmosphere — some quiet, some rowdy, some dedicated to specific Krewe sub-factions. Privacy is a curtain. Community is mandatory.'
WHERE slug = 'carrion-court-inn-upper';

UPDATE zone_rooms
SET name = 'The Costume Workshop',
    description = 'A workshop where Krewe members prepare for performances and expeditions. Masks, costumes, ceremonial weapons, and ritual props line the walls. The Krewe''s philosophy: every mission is a performance, every fighter is an actor. Dress the part.'
WHERE slug = 'carrion-court-armoury';

-- Update The Carrion Court exit references
UPDATE zone_exits SET from_room_slug = 'carrion-court-commons' WHERE from_room_slug = 'counting-house-commons';
UPDATE zone_exits SET to_room_slug = 'carrion-court-commons' WHERE to_room_slug = 'counting-house-commons';
UPDATE zone_exits SET from_room_slug = 'carrion-court-stash' WHERE from_room_slug = 'counting-house-stash';
UPDATE zone_exits SET to_room_slug = 'carrion-court-stash' WHERE to_room_slug = 'counting-house-stash';
UPDATE zone_exits SET from_room_slug = 'carrion-court-armoury' WHERE from_room_slug = 'counting-house-armoury';
UPDATE zone_exits SET to_room_slug = 'carrion-court-armoury' WHERE to_room_slug = 'counting-house-armoury';
UPDATE zone_exits SET from_room_slug = 'carrion-court-expedition-board' WHERE from_room_slug = 'counting-house-expedition-board';
UPDATE zone_exits SET to_room_slug = 'carrion-court-expedition-board' WHERE to_room_slug = 'counting-house-expedition-board';
UPDATE zone_exits SET from_room_slug = 'carrion-court-market' WHERE from_room_slug = 'counting-house-market';
UPDATE zone_exits SET to_room_slug = 'carrion-court-market' WHERE to_room_slug = 'counting-house-market';
UPDATE zone_exits SET from_room_slug = 'carrion-court-training' WHERE from_room_slug = 'counting-house-training';
UPDATE zone_exits SET to_room_slug = 'carrion-court-training' WHERE to_room_slug = 'counting-house-training';
UPDATE zone_exits SET from_room_slug = 'carrion-court-infirmary' WHERE from_room_slug = 'counting-house-infirmary';
UPDATE zone_exits SET to_room_slug = 'carrion-court-infirmary' WHERE to_room_slug = 'counting-house-infirmary';
UPDATE zone_exits SET from_room_slug = 'carrion-court-war-room' WHERE from_room_slug = 'counting-house-war-room';
UPDATE zone_exits SET to_room_slug = 'carrion-court-war-room' WHERE to_room_slug = 'counting-house-war-room';
UPDATE zone_exits SET from_room_slug = 'carrion-court-inn' WHERE from_room_slug = 'counting-house-inn';
UPDATE zone_exits SET to_room_slug = 'carrion-court-inn' WHERE to_room_slug = 'counting-house-inn';
UPDATE zone_exits SET from_room_slug = 'carrion-court-inn-upper' WHERE from_room_slug = 'counting-house-inn-upper';
UPDATE zone_exits SET to_room_slug = 'carrion-court-inn-upper' WHERE to_room_slug = 'counting-house-inn-upper';

-- ============================================================================
-- Update characters table faction_slug references (if column exists)
-- ============================================================================

UPDATE characters SET faction_slug = 'kindari' WHERE faction_slug = 'ironwright';
UPDATE characters SET faction_slug = 'bloom-tenders' WHERE faction_slug = 'veil';
UPDATE characters SET faction_slug = 'krewe-calliope' WHERE faction_slug = 'scarlet';

-- Update last_inn references
UPDATE characters SET last_inn_zone_slug = 'the-reliquary' WHERE last_inn_zone_slug = 'the-foundry';
UPDATE characters SET last_inn_zone_slug = 'the-bloom-observatory' WHERE last_inn_zone_slug = 'the-cartographium';
UPDATE characters SET last_inn_zone_slug = 'the-carrion-court' WHERE last_inn_zone_slug = 'the-counting-house';

UPDATE characters SET last_inn_room_slug = 'reliquary-inn-upper' WHERE last_inn_room_slug = 'foundry-inn-upper';
UPDATE characters SET last_inn_room_slug = 'bloom-observatory-inn-upper' WHERE last_inn_room_slug = 'cartographium-inn-upper';
UPDATE characters SET last_inn_room_slug = 'carrion-court-inn-upper' WHERE last_inn_room_slug = 'counting-house-inn-upper';
