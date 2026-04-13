## Project Context

- **Project:** Ellmud — PvPvE Extraction RPG / Real-Time MUD
- **Stack:** Node.js, Colyseus, React, PostgreSQL
- **Description:** Procedurally generated shard instances, tick-based combat, server-authoritative game state, LLM narration layer. Text-primary interface with ANSI colour and UTF-8 box-drawing.
- **GDD:** GDD.md — the authoritative game design document
- **User:** dkirby-ms
- **Joined:** 2026-03-28


## Key Context

- Content is authored via admin UI (zones, rooms, items, NPCs) and stored in PostgreSQL
- Zones contain rooms connected by exits; cross-zone exits link zones together
- Items follow a tier system: scrap → common → sturdy → refined → masterwork → anomalous (with stat multipliers)
- Creatures have types, stats, and behavior patterns
- The extraction loop: enter shard → explore → gather loot → extract (or die and lose items)
- All admin-authored content is considered live immediately (content promotion deferred)


## Team Updates

### 2026-04-06: Stronghold-Zone Route Design — Faction Stronghold Connections
- **Design completed:** Thematic routes connecting faction strongholds to Gulf Coast zones
- **Stronghold access:** All three strongholds (the-reliquary, the-bloom-observatory, the-carrion-court) now connected to adventure zones
- **Route narrative:** Each stronghold has thematic entry/exit room pairing; connections lead to distinctive entry points in target zones
- **Coordination:** Design matched to Bruenor's migration 022 execution; all room slugs and directions verified
- **Documentation:** Design doc filed to squad decisions; no implementation concerns flagged

---



## Archive Entry (2026-04-12T23:12:20+00:00)

# Laeral — History

## Project Context

- **Project:** Ellmud — PvPvE Extraction RPG / Real-Time MUD
- **Stack:** Node.js, Colyseus, React, PostgreSQL
- **Description:** Procedurally generated shard instances, tick-based combat, server-authoritative game state, LLM narration layer. Text-primary interface with ANSI colour and UTF-8 box-drawing.
- **GDD:** GDD.md — the authoritative game design document
- **User:** dkirby-ms
- **Joined:** 2026-03-28

## Key Context

- Content is authored via admin UI (zones, rooms, items, NPCs) and stored in PostgreSQL
- Zones contain rooms connected by exits; cross-zone exits link zones together
- Items follow a tier system: scrap → common → sturdy → refined → masterwork → anomalous (with stat multipliers)
- Creatures have types, stats, and behavior patterns
- The extraction loop: enter shard → explore → gather loot → extract (or die and lose items)
- All admin-authored content is considered live immediately (content promotion deferred)

## Team Updates

### 2026-04-06: Stronghold-Zone Route Design — Faction Stronghold Connections
- **Design completed:** Thematic routes connecting faction strongholds to Gulf Coast zones
- **Stronghold access:** All three strongholds (the-reliquary, the-bloom-observatory, the-carrion-court) now connected to adventure zones
- **Route narrative:** Each stronghold has thematic entry/exit room pairing; connections lead to distinctive entry points in target zones
- **Coordination:** Design matched to Bruenor's migration 022 execution; all room slugs and directions verified
- **Documentation:** Design doc filed to squad decisions; no implementation concerns flagged

---

## Learnings

### 2026-04-07: Issue #391 — Dystopian Future Bestiary Design
- Designed comprehensive bestiary for post-apocalyptic world with ~103 creatures across 7 zone environments.
- **Zone environments defined:** Collapsed Megastructure (ruins), Flooded Depths (submerged infrastructure), Toxic Wastes (chemical zones), Overgrown Ruins (bio-hazard), Industrial Graveyard (tech ruins), Desolate Wastes (radiation), Eternal Night (darkness zones).
- **Creature distribution:** Tier 1 (40 creatures), Tier 2 (35 creatures), Tier 3 (20 creatures), Bosses (8 total: 2 Tier 2, 6 Tier 3).
- **Stat scaling philosophy:** Tier 1 (15-60 HP, 5-15 Attack), Tier 2 (60-120 HP, 15-30 Attack), Tier 3 (120-250 HP, 30-60 Attack), Bosses (150-420 HP, 18-80 Attack). Progression builds from existing Warrens baseline (Gutterspawn 15 HP → The Collapsed One 150 HP → Assembly Line 420 HP).
- **Archetype mix per zone:** Each environment includes Berserker (high damage, medium durability), Skulker (high agility, hit-and-flee), Guardian (slow, devastating, high armour), Swarm (numerous, weak), Ranged (distance attacks), Caster (abilities, telegraphed) to create varied encounters.
- **Loot tier distribution:** Scrap (T1 common), Common (T1-2 useful baseline), Sturdy (T1 rare, T2 common), Refined (T2 rare, T3 common), Masterwork (boss drops), Anomalous (rare T3 boss drops).
- **Telegraphed abilities:** Wind-up times (3-9 ticks based on tier), atmospheric telegraph text, damage proportional to wind-up. Bosses have 2-4 abilities minimum with summon mechanics and area attacks.
- **Thematic consistency:** All creatures fit dystopian future setting (NOT medieval fantasy except Midgaard experiment). Named with post-apocalyptic flavor: Gutterspawn, Pressure Horror, Nano Swarm, Atomic Colossus, The Spillmother, etc.
- **Passive/ambient creatures:** Included 4 non-hostile creatures (Scrap Pigeon, Rad Crow, Mutant Fish School, Salvage Mule) for atmospheric texture and optional hunting.
- **Room descriptions:** Each creature has atmospheric description shown when entering rooms — sets tone, hints threat level, uses active verbs and sensory details.
- **Boss design patterns:** Multi-phase abilities, summon mechanics, area effects, thematic ultimate attacks. Each boss is thematically anchored to its environment (Sovereign of Dust commands rubble, Abyssal Maw controls water, Spillmother births mutations, etc.).
- **Implementation handoff notes:** Design doc includes TypeScript template structure, database migration guidance, item definition requirements, spawn rule integration, and stat balance testing recommendations.
- **Design principle: environmental storytelling through creatures** — each zone's roster tells a story about what happened there (industrial accidents → hazmat horrors, radiation exposure → gamma ghouls, nature reclaiming → forest titans).
- **Key file paths:** Design document at `docs/bestiary-design.md`. Existing creature templates at `packages/server/src/creatures/templates/`. Creature types at `packages/server/src/creatures/types.ts`.
- **Estimated implementation time:** 2-3 weeks for Bruenor to build 100+ creature templates + items + zone integration.
- Design document saved to `docs/bestiary-design.md` for implementation.

---

## 2026-04-11: Item System Architecture Update

**Impact:** Content authoring workflow now DB-only for all item definitions  
**Status:** ✅ Complete — Item definitions moved from code to database

**Context:**
- User directive: No DB-less deployments. ContentRegistry (PostgreSQL) is sole source of truth.
- Jarlaxle removed 34 static item constants from registry.ts; all item definitions now in `item_definitions` table
- Implications for Laeral's container designs (2026-07-24):
  - All 6 new containers (Munitions Wrap → Hollow of the Forgotten) will be added via ContentRegistry migrations, not code constants
  - Migration files (INSERT into `item_definitions`) are the authoritative source
  - ANSI formatting, container properties, tier progression all stored in DB

**Process for Bruenor (Content Builder):**
- Items → migrations (e.g., 016_add_containers.sql with 6 INSERT statements)
- No registry.ts updates needed; content goes live immediately via ContentRegistry
- Seed data verified complete in migrations 002 and 015

**Related decisions:**
- `2026-04-11T21:50:04Z` — Item definitions in DB only (Bruenor's responsibility)
- `2026-04-11T22:05:24Z` — ContentRegistry sole source of truth
- Container item designs ready for migration implementation: Munitions Wrap (sturdy), Ironbound Coffer (refined), Salvager's Haversack (refined), Warden's Lockbox (masterwork), Fleshknit Satchel (masterwork), Hollow of the Forgotten (anomalous)

---

### 2026-04-07: Sandbox Arena Content Design — The Refuge Combat Testing Facilities
- Designed a complete sandbox combat system for The Refuge, extending the dev hub with dedicated testing infrastructure.
- **Physical layout:** 4 new rooms (Proving Hall, Test Arena, Armory, Control Sanctum) connected via north exit from the Hearth, forming a thematic training complex.
- **Room theming:** Each room reinforces the "designer pocket dimension" aesthetic: Proving Hall as a study of violence, Test Arena as an ancient training ground (chalk circles, bloodstains, chains), Armory as a maintenance logbook, Control Sanctum as a planning hub with observation mirror.
- **Creature roster:** 15 test creatures across 5 core archetypes (Melee Tank, Ranged, Dodger, AoE, Swarm) spanning 4 tiers (T0-T3) for progression from trivial to boss-level difficulty. All creatures use `training_` slug prefix to distinguish from live content.
- **Archetype selection:** Mirrors live zone populations (Warrens, Siltgate have melee, ranged, magic users). Each archetype includes 2-3 tiers to allow both baseline and extreme testing.
- **Stat scaling principles:** Tier progression is steep — T3 creatures are 3-5× more durable/damaging than T1. Agility and armour define archetype feel (Dodgers: high agility/low armour; Tanks: low agility/high armour; Ranged: medium-high both; AoE: medium balanced; Swarm: numerous, weak individually).
- **Encounter building:** Roster supports templates (1v1, group, boss, swarm) and designer flexibility—just mix archetypes and tiers to build test scenarios. No preset encounters locked in; designers improvise.
- **Safety features:** Test Arena is marked `safe_container = true` (no corpse drops, no debuffs, respawn in-room). Sandbox deaths are consequence-free for rapid iteration.
- **Loot simplicity:** All sandbox creatures drop training-grade items only (scrap metal, crystals, minimal gear). Focuses testing on mechanics, not economics.
- **Implementation ready:** Design includes full DB integration notes, migration script placement, and respawn logic. Creatures follow existing `creature_definitions` schema; rooms follow zone room patterns.
- **Expansion roadmap:** Phase 2 (interactive Control Sanctum UI), Phase 3 (extended arenas with environmental hazards), Phase 4 (spectator gallery with logging).
- **Design document filed:** `docs/design/sandbox-arena-content.md` — comprehensive reference for implementation and future design conversations.

### 2026-04-07: Issue #337 — Grid Combat Visual Design Analysis
- Designed a complete visual system for DCSS-style grid combat supplementing Ellmud's text-primary MUD experience.
- **Creature representation:** Silhouettes define creature category; saturation/color depth signals threat level. Size scales with tier (T1 = 1×1, T4+ bosses = 2×2+ cells).
- **Zone theming on grid:** Each faction stronghold gets a distinct color palette (Kindari = gunmetal/rust, Bloom = sickly green/cyan, Krewe = purple/gold). Terrain tiles and hazard overlays translate narrative themes into mechanical visibility.
- **Player sprites:** Faction-colored with visible equipment; PvP threats show red glow; group management via proximity clustering and abbreviated names.
- **Fog of war:** Partial visibility based on existing LOS mechanics; off-screen creatures shown as ghosted outlines or sound radiants. Prevents grid from becoming a "perfect information" cheat.
- **Design principle:** Grid is *optional and supplementary*, never mandatory. Text-first combat remains fully functional without grid. Accessibility is front-loaded (color-blind modes, mobile support, keyboard-only).
- **Art direction:** 32×32px high-contrast pixel art (retro, moody, efficient). Recommended references: DCSS (readability), Cogmind (brutalist sci-fi), Caves of Qud (mutation horror), Darkest Dungeon (gothic mood).
- **Core decision:** Pixel art over drawn/vector/3D because it matches Ellmud's dystopian aesthetic, scales cleanly, and performs well even on low-bandwidth. ASCII-enhanced fallback available for purists.
- **Implementation phases:** Foundation (tileset framework + core silhouettes) → Creature/hazard art → Client integration → Polish.
- **Key learnings:** Position-based combat is already in GDD; grid is a transparency layer, not a game changer. Partial visibility preserves extraction-horror tension. Faction-specific color palettes make a 32px tile feel lush and thematic.

### 2025-07-24: The Warrens Zone Design
- Designed an 11-room extraction dungeon (tier 1–2, ruins biome) with full room graph, exit map, 4 creature types, and 7 items.
- Design document saved to `.squad/decisions/inbox/laeral-warrens-design.md` for Bruenor to implement.
- **Balance baseline:** Drowned Revenant (tier 1) has maxHp 50, attack 10, defence 3, armour 3, agility 3. Warrens creatures range from Gutterspawn (15 HP, swarm) to The Collapsed One (150 HP, boss). Scaling feels right for early-to-mid progression.
- **Room type vocabulary:** entry, extraction, boss, corridor, junction, dead_end, chamber. Properties include heavy_door, open_sky, enclosed, narrow, water, rubble, elevated, large_space, cavern.
- **Loot design:** Scrap items are common drops (vendor trash baseline). Common tier gear is the useful tier for this zone. One sturdy-tier rare (Charred Street Map) as the aspirational find.
- **Key items unlock locked exits** — the `sanctuary-key` creates a shortcut loop. Hidden exits use the `hidden: true` flag and are discoverable via `search` command.
- **Sound propagation** is a design lever: room properties (water, large_space, narrow) affect how noise travels, which matters for creature AI alerting and PvP awareness.

### 2025-03-28: The Siltgate — City Zone Design
- Designed a 98-room urban zone inspired by Waterdeep (Sojourn MUD) with 7 distinct quarters across 3 vertical levels.
- Zone spans tier 0-3 with selective PvP zones (safe in noble/merchant areas, enabled in slums/docks/sewers/ruins).
- **Vertical design:** Level 0 (Promenade) = elevated noble quarter; Level 1 (Street Grid) = main city sprawl; Level 2 (Undercity) = flooded sewers and forgotten cellars.
- **Social stratification:** Architecture, cleanliness, NPC behavior, and creature density visibly reflect wealth gradient from Highwind Estates (marble, guards, no combat) to Drowned Veins (sewage, monsters, disease).
- **Cross-zone connections:** Links to The Refuge (Market Square → Hearth) and The Warrens (Ashgate Wastes → Shattered Gate). City serves as mid-level bridge between safe hub and dangerous dungeon.
- **Urban creature roster:** Designed 10 new creatures including Slum Rat (tier 1 swarm), Feral Dog (tier 1 pack), Alley Thug (hostile NPC), Sewer Lurker (tier 2 ambusher), Silt Serpent (tier 3 mini-boss), Plague Bearer (tier 3 disease vector), and The Harbourmaster (tier 3 elite boss).
- **New item catalog:** 17 urban-themed items including Dockworker's Hook, Smuggler's Dagger, Smuggler's Cloak (with stealth bonus), Serpent Scale, Plague Shard, Harbourmaster's Key, Sewer Lamp (waterproof light source), City Map (reveals rooms).
- **Living city design:** Non-hostile NPCs (nobles, merchants, beggars, guards), ambient creatures (dogs, mules, pigeons), and feature rooms (shops, taverns, guild halls) create inhabited environment distinct from dungeon crawl.
- **Encounter zones:** Clear danger gradient — safe zones (Estates, Arcade, Market Square) → moderate (Dockward, Beggar's Span) → high (Ashgate Wastes, Drowned Veins). PvP hotspots at Smuggler's Wharf, Beggars' Market, and sewer ambush points.
- **Quest hooks:** 6 quest seeds including Smuggler's Debt (clear Harbourmaster), Rat Infestation (collect rat tails), Lost Library (recover scrolls), Serpent's Scale (defeat boss), Forged Papers (heist), Collapse Mapping (exploration contract).
- Design document saved to `.squad/decisions/inbox/laeral-city-zone-design.md` for Bruenor to implement.
- **Room properties expanded:** Added `safe` (no combat), `crowded` (high NPC density), `slippery` (dexterity checks), `well_lit` (high visibility), `stench` (olfactory hazard), `hazardous` (environmental damage) to existing vocabulary.
- **Key design principle:** "A living city — not a dungeon." Every quarter tells a story through architecture, population, and atmosphere. Social class is visible and tangible.

### 2025-03-29: Room Duplication Pattern for City Zones
- Revised the Siltgate from 98 rooms to 136 rooms by embracing room name duplication for generic connective tissue (streets, alleys, tunnels, passages).
- **Core principle:** Generic streets repeat display names; landmarks keep unique names. A city should feel grid-like and repetitive — the landmarks stand out because the streets around them are similar.
- **Slug convention:** Repeated rooms use `{name}-{n}` slugs (e.g. `narrow-alley-1`, `sewer-tunnel-3`) for DB uniqueness. Display names repeat freely.
- **Description variation:** Each duplicated room gets a unique description with different sensory details, even though the name is identical. This prevents copy-paste feel while maintaining grid sameness.
- **Property variation:** Rooms with the same name may have different properties (one "Narrow Alley" has `stench`, another `rubble`, another `water`), creating mechanical variety within visual sameness.
- **Repetition count per quarter:** Beggar's Span has 18 repeated rooms out of 28 total. Drowned Veins has 15/22. Ashgate Wastes has 11/20. This gradient matches atmosphere: slums and sewers feel maze-like; noble quarter stays curated.
- **Design contrast with dungeons:** The Warrens has 100+ unique room names (dungeon = every room is a setpiece). The Siltgate uses repetition (city = setpieces are shops and landmarks). Different zone types demand different naming strategies.

---

## 2026-03-29T17:34Z: Orchestration Checkpoint — Siltgate Room Duplication Delivery

**Status:** COMPLETE

Siltgate revision finalized and merged into team decisions archive.

**Deliverable Verified:**
- Siltgate expanded to 136 rooms with room duplication pattern fully implemented
- Room naming convention documented and approved
- Design philosophy (city vs. dungeon room design) captured for team reference

**Team Alignment:**
- User directive (dkirby-ms, 2026-03-29T17:17) confirmed: room duplication is desirable for urban grid layouts
- Regis's Zone Designer and Exit Pairs features now supporting this content design pattern
- Ready for Bruenor to implement rooms in database

**Decision Documents Created:**
- `.squad/decisions/decisions.md` — 4 new entries merged (legend, exit pairs, user directive, room duplication pattern)
- `.squad/orchestration-log/2026-03-29T17-34-laeral-siltgate-revision.md`

**Team Roster Status:** Laeral — 1 major content revision with philosophy update this cycle

### 2025-07-24: Siltgate Topology Analysis & Zone Grid Constraint Skill
- Performed full topology analysis of The Siltgate (136 rooms, 286 exits) against the `computeLayout.ts` BFS grid engine.
- Identified **6 topological conflicts** where rooms are reachable via paths that imply contradictory grid positions:
  1. `dock-street-5 ↔ narrow-alley-3` (Dockward ↔ Beggar's Span shortcut, Δ=9) — cross-neighborhood shortcut
  2. `rubble-street-1 ↔ rubble-street-2` (Beggar's Span ↔ Ashgate, Δ=5) — dual-approach neighborhood border
  3. `sewer-junction-2 ↔ sewer-tunnel-4` (Drowned Veins ring, Δ=17) — sewer loop with mismatched surface access points
  4. `narrow-alley-5 ↔ narrow-alley-6` (surface ↔ sewer vertical shortcut, Δ=8)
  5. `garden-terrace ↔ iron-balcony-2` (Highwind Estates L-loop, Δ=3)
  6. Self-referencing exits on `city-gate` and `ashgate`
- Also identified 35 grid position collisions (rooms wanting the same cell) and 11 four-way junctions.
- **Core insight:** These conflicts are content problems, not algorithm problems. The zone data creates impossible geometry that no layout engine can resolve. The fix is adding intermediate "bridge" rooms to absorb grid distance.
- Proposed 6 specific fixes adding 8–9 intermediate rooms (zone grows to ~144–145 rooms). Fixes prioritized by conflict severity (Δ value).
- **Key design principle learned:** For any cycle in a zone graph, the sum of cardinal direction offsets around the cycle must be zero. Non-zero sums = topological impossibility on a 2D grid.
- Created **zone-topology skill** at `.squad/skills/zone-topology/SKILL.md` — covers the grid constraint, conflict patterns (shortcuts, rings, L-loops, vertical shortcuts), design guidelines (junction density, shortcut savings limits, bridge room budgeting), cycle validation formula, and a pre-handoff checklist.
- Proposal document: `.squad/decisions/inbox/laeral-siltgate-topology-fixes.md`
- **File paths:** Zone data at `packages/server/src/db/migrations/004_seed_siltgate.sql`, layout engine at `packages/client/src/map/computeLayout.ts`, layout tests at `packages/client/src/map/__tests__/computeLayout.test.ts`

### 2025-07-24: Siltgate Bridge Room Designs — Topology Fix Implementation
- Designed concrete fixes for all 6 topological conflicts. Zone grows from 136 to 138 rooms with 0 BFS conflicts.
- **Key design decision — removal over bridging:** For Δ≥5 conflicts, removing the shortcut is almost always better than adding bridge rooms. The Siltgate grid is too dense (35 cell collisions) to fit bridge room chains. Only 2 new rooms were needed; the rest were pure exit surgery.
- **Bridge room sweet spot:** Bridge rooms work for Δ≤3. For Δ=3 (Estates L-loop), re-routing through an existing room (promenade-walk-3) eliminated the conflict with zero new rooms. For Δ=5 (Ashgate dual-approach), a single bridge room reconnected two sub-areas through nearby dead-ends.
- **Sewer ring lesson:** Ring topologies where two surface access points feed a single underground loop are almost always impossible on a 2D grid. The surface distance between access points never matches the underground tunnel length. Solution: break the ring into two dead-end branches. Use narrative (cave-in, sealed gate) to justify the break and create a quest hook for future reconnection.
- **Vertical shortcut lesson:** When room A connects down to sewer, sewer connects up to room B, and A and B are far apart on the surface, the ENTIRE chain from A through the underground gets pulled to B's grid position by BFS. Fix: sever the underground connection and replace with a standalone dead-end sewer access. This repositions the entire surface chain correctly.
- **Grid density metric:** At 35 collisions in 136 rooms, every candidate bridge path was blocked by existing rooms. Future zones should target <20% collision rate before attempting bridge room insertion.
- Design document: `.squad/decisions/inbox/laeral-bridge-room-designs.md`

### 2025-07-25: Warrens Topology Fixes — Sewer Path Lengthening
- Designed fixes for all 19 BFS conflicts in the Warrens zone. Zone grows from 101 to 109 rooms with 0 conflicts.
- **Vertical shortcut fix — path lengthening over severing:** Unlike Siltgate (where sewer rings were broken into dead-ends), the Warrens sewer is a tree, not a ring. The fix is to lengthen underground paths so their cardinal offsets match surface shaft distances. This preserves full sewer connectivity — all 3 shafts remain linked underground.
- **Direction zigzag technique:** When a straight N/S chain can't connect because the target room's exits are full, route the chain through an adjacent existing room. The Warrens ratways chain uses S→S→W→S→E to reach `sewer-north-tunnel` (which already connects S to main-junction), avoiding the blocked north exit on `sewer-main-junction`. The W/E pair cancels out, preserving the required net offset (0, +4).
- **Dual-approach conflict pattern:** When a room is reachable via two BFS-equidistant paths with different grid offsets, removing ONE link is always cheaper than bridging. For `sunken-square`, removing the approach-side link (broken-sanctuary↔sunken-square) was better than removing the grid-side link (sunken-square↔slum-r1c1) because the grid-side link keeps the sewer shafts close together on the grid, minimizing Fix A's room budget.
- **Intermediate room insertion technique:** For Fix A-2, inserting 1 room between south-tunnel and west-conduit (changing W to W→S) adjusted the running offset enough that only 3 more rooms were needed between west-conduit and cistern. Splitting the problem at an intermediate junction reduced total rooms from 5 to 4.
- **BFS simulation is essential:** Ran full BFS topology verification in Python before and after changes. Confirmed 0 conflicts and consistent grid positions for all 109 rooms. Never trust cycle math alone — always simulate.
- Design document: `.squad/decisions/inbox/laeral-warrens-topology-fixes.md`

### 2026-03-29: Thematic Realignment — Faction and Zone Redesign
- Expanded `docs/thematic-direction.md` with comprehensive faction and zone redesigns for dystopian Gulf Coast setting (year 3000, post-human Earth).
- **Faction redesigns:** Transformed three factions from generic fantasy to setting-specific survival factions:
  - Ironwright Compact → **The Urnkeepers** (technology salvage, drone scavenging, reverence for preservation tech)
  - Veil Cartographers → **The Tidereaders** (ecological mapping, biomonitoring, mutant algae research)
  - Scarlet Ledger → **The Silt Traders** (commerce, information brokerage, trade route control)
- **Stronghold redesigns:** Each faction stronghold reimagined with Louisiana setting flavor:
  - The Foundry → **The Reliquary** (converted water treatment plant)
  - The Cartographium → **The Bloom Observatory** (offshore oil platform with algae cultivation)
  - The Counting House → **The Exchange** (fortified French Quarter townhouses)
- Designed 8 room names for each stronghold (entry, stash, training, expedition board, market, commons, inn, war room) with dystopian Gulf Coast theming.
- **Zone re-themes:** Updated Siltgate (post-apocalyptic New Orleans, Mississippi shifted west) and The Warrens (service tunnels beneath ruins, rat-infested infrastructure).
- **World texture:** Defined drone swarm debris (lootable, dangerous), mutant wildlife (rats, roaches, snakes, mosquitoes, alligators), and recognizable New Orleans landmarks (Superdome, interstate overpasses, Bourbon Street flooded).
- **Player origin narrative:** Expanded "waking from pickling urns" experience — what characters remember, how factions recruit them, why they join.
- **Tone guidelines:** Louisiana gothic (brackish water, humidity, spanish moss, rust, overgrowth), gritty but not grimdark, eerie but hopeful.
- Marked 5 open questions for user review (surviving non-Sleeper humans, Saitcho Kindar's lore role, faction competition, partially-active drones, symbiotic wildlife).
- **Key design principle:** Second-person room descriptions (2-4 sentences), atmospheric but concise for terminal display. Gulf Coast flavor is non-negotiable — this is New Orleans, not generic ruins.
- Document status: Draft for iteration. No database changes yet — this is design iteration material.

### 2026-03-29: Mutant Human Descendants & World Expansion
- Resolved all 5 open questions from previous thematic direction draft:
  - **No other surviving humans** — only mutant descendants that evolved from human stock over ~1000 years
  - **Saitcho Kindar is mythic** — Satoshi Nakamoto-like anonymous figure, never met, only referenced in lore
  - **Multiple settlements exist** — Siltgate is one of several Gulf Coast settlements, others referenced but not yet defined
  - **Drones stay inactive** — dead machines, salvage only, NOT combat threats
  - **Wildlife is useful** — materials like spider silk, alligator hide, bioluminescent algae, but NOT friendly/tameable
- Designed comprehensive **Mutant Human Descendant** system (new Section 6):
  - 6 archetypes embodying "worst of humanity": Graftlords (corruption), Maw-Kin (gluttony), Bone-Tithes (greed), Render-Kin (violence), Fester-Thralls (ugliness/body horror), Rut-Callers (lust/obsession)
  - Each archetype has distinct appearance, behavior, habitat, and design notes
  - **Core design principle:** Uncanny valley horror — they're *almost* human, which makes them deeply unsettling
  - NOT zombies — they are alive, evolved, territorial organisms that don't recognize Sleepers as kin
  - Naming convention: corrupted bayou creole, local slang (e.g., "the Crowned," "Vault-Wraiths," "the Rotted")
  - Habitat: ruins, swamps, tunnels, flooded buildings — wherever humans once lived
- Added **Section 7: The Wider World** — hooks for other settlements:
  - NPC dialogue references to "Rust Harbor," "Barrier Settlements," "Shalepoint," "Mud Flats"
  - Expedition board contracts for escorts, mapping runs, salvage rumors
  - Tidereader charts showing other "awakening zones" along the coast
  - Design guideline: Leave hooks, don't define settlements yet — world should feel larger than what's visible
- Expanded **wildlife section** with useful materials:
  - Giant spider silk (crafting), bioluminescent algae (light sources), alligator hide (armor), snake venom (alchemy), rat meat/bones (sustenance/tools), mosquito chitin (armor), feral hog tusks (weapons/trade)
  - Wildlife behaviors can be exploited tactically (chemical scents, baiting, luring) but NOT tamed
  - Nature is indifferent, not friendly — ecosystem as resource, not companion
- **Tone refinement:** Mutant descendants are the most disturbing element in the game because they show what humanity became without civilization. Visual design targets body horror + recognition: "You see the shape of a human skull beneath the tumorous growths."
- **Key writing guidelines for mutant descriptions:**
  - Focus on distortion (proportions wrong, movements unnatural)
  - Emphasize recognition (almost human, but not)
  - Use sensory horror (smell, sound, movement)
- Document status: Second draft complete. All open questions resolved. Ready for content implementation.

### 2025-07-25: Potable Water Economy — Section 8
- Added comprehensive Section 8 (ECONOMY: POTABLE WATER) to `docs/thematic-direction.md` per dkirby-ms directive.
- **Core design decision:** Game currency is potable water, not gold. Inspired by Caves of Qud's dram-based water economy. Water is heavy, consumable, and universally needed — survival economics, not fantasy coinage.
- **Unit of measurement:** "draws" — corrupted slang from "drawing water." 1 draw ≈ 1 cup. 10 draws = a day's hydration. Thematic Gulf Coast vocabulary.
- **Weight-mobility tension:** Carrying wealth = carrying physical mass. Rich players are slower, more encumbered, more visible as targets. Creates strategic decisions about how much currency to carry vs. stash.
- **Faction economic roles:** Urnkeepers produce (filtration systems), Tidereaders discover (spring locations, water chemistry), Silt Traders distribute (trade routes, brokerage). No faction controls the full supply chain — interdependence creates natural tension.
- **Desperation mechanic:** Players can drink their own currency. Spending water = spending survival. "Water poor" is genuine desperation, not just "can't afford gear."
- **Faction cisterns:** Stash equivalent for currency at each stronghold. Faction-locked — factionless players have no safe storage.
- **Inn cost alignment:** Current 10-gold inn stay for non-faction guests becomes 10 draws. Backend note flagged for Bruenor/Drizzt to rename `gold` column from migration 016.
- **Writing guidelines:** Louisiana gothic tone, grounded survival language, sensory water descriptions, real Gulf Coast water problems as reference, no fantasy currency vocabulary.
- Decision document: `.squad/decisions/inbox/laeral-water-currency.md`


### 2026-04-06: Faction Reputation System & Faction Renames

- Implemented major faction redesign per user directive (dkirby-ms):
  - **Reputation-based faction system:** Players no longer choose a faction at character creation. Instead, they choose a STARTING ZONE (stronghold), beginning with neutral standing in their home city and distrusted elsewhere. Faction allegiance is earned through actions (missions, trade, helping faction members), not declared at creation.
  - **Multi-faction possibility:** Players can build standing with multiple factions, or commit to one, or remain freelance. High standing unlocks better prices, gear access, exclusive missions, and faction leadership recognition.
  - **Standing tiers:** Distrusted → Neutral → Accepted → Trusted → Honored, with escalating benefits (services, prices, stash/cistern access, NPC attitudes).
- **Faction renames with full rethemes:**
  1. **Urnkeepers → The Brined** — Emphasizes the pickling brine that saved them. Expanded lore around Saitcho Kindar cult of personality (reverence for the mythical brine inventor). Name is punchy Louisiana slang that sounds natural when spoken.
  2. **Tidereaders → The Bloom Watch** — Reflects their role as observers and interpreters of the mutant algae ecology. "Watch" has Gulf Coast fishing culture resonance. Shorter, more grounded than "Tidereaders."
  3. **Silt Traders → Krewe Calliope** (COMPLETE RETHEME) — Transformed from commerce/merchant faction into **dark carnival krewe culture**. New identity: preservation of post-apocalyptic Mardi Gras traditions — masks, music, ritual, spectacle twisted through 1000 years into something between carnival and cult. They control the MORALE ECONOMY (hope, meaning, culture) rather than logistics. Stronghold moved from French Quarter to the Superdome (now "The Carrion Court"). Authentic New Orleans krewe terminology (K-R-E-W-E spelling).
- **Krewe Calliope design details:**
  - Identity: Ritual, spectacle, cultural preservation — "The parade must go on."
  - Stronghold: The Carrion Court (collapsed Superdome converted to ritual performance space)
  - Room names: Procession Gate, Wardrobe Vault, Dance Floor, Call Board, Curiosity Bazaar, Green Room, Bunk Tiers, Inner Sanctum
  - Economic role: Morale keepers — they provide festivals, blessings, funerals, parades, and meaning. People need more than water to survive; they need hope. Krewe charges in water, favors, participation, or loyalty.
  - Faction traditions: Masks (worn in public, identity-defining), parades (torchlit processions through ruins), rites (blessings, funerals, induction ceremonies ranging from joyful to dark).
- **Document-wide updates:**
  - Section 1: Added reputation system explanation and faction name proposals with rationales
  - Section 4.2-4.4: Rewrote "First Contact" and "Why Join a Faction" as reputation-based system with starting zone selection
  - Section 5: Updated language choices with new faction names and krewe spelling convention
  - Section 7: Updated NPC dialogue and expedition board hooks with new faction names
  - Section 8: Updated water economy faction roles — Brined (producers), Bloom Watch (prospectors), Krewe Calliope (morale keepers). Expanded corruption questions to cover all three factions.
- **Key design principle:** Character creation shifts from "pick your ideology" to "pick your starting city." Identity emerges through play. The stronghold you start in shapes early experience but doesn't lock you into allegiance.
- **Writing tone:** Louisiana gothic maintained throughout. Krewe Calliope sections emphasize dark carnival atmosphere — masks, drums, torchlight, ritual, spectacle with an undercurrent of danger and obsession.
- Decision document: `.squad/decisions/inbox/laeral-faction-retheme.md`

### 2026-04-05: Faction Naming Revision 2 — The Kindari and The Bloom Tenders
- Revised faction names based on user feedback rejecting "The Brined" (sounds lame) and "The Bloom Watch" (doesn't address new algae-influence lore hook).
- **NEW LORE HOOK:** The Bloom Tenders faction is unknowingly under the discreet influence of the mutant algae itself. The algae subtly manipulates them — guiding decisions, drawing them to locations, making them protective of the bloom, steering their "scientific observations" toward conclusions that serve the algae's interests. They don't know they're being influenced.
- **FACTION 1 SELECTED: The Kindari** — Puts Kindar's name directly in the faction name (cult-of-personality identity). Louisiana/Creole -ari suffix (like "Rastafari"). Sounds like a religious/cultural designation. Spoken naturally in NPC dialogue. Implies a PEOPLE, not just a job.
- **FACTION 2 SELECTED: The Bloom Tenders** — DOUBLE MEANING: surface = "we tend the bloom (cultivation)"; sinister = "the bloom tends US (we are cultivated)." Nautical legitimacy (tender = ship servicing offshore platform). Botanical legitimacy (tending = gardening/caretaking). Perfect for a faction that doesn't realize they're being manipulated — they chose the name thinking it meant stewardship, but it's actually describing their relationship to the algae.
- **Other Faction 1 options considered:** The Preservation (too abstract), Kindar's Covenant (too biblical), The Urnborn (doesn't center Kindar), The Relic Guild (good Louisiana flavor but less religious), Sons of the Brine (gendered).
- **Other Faction 2 options considered:** The Verdant (good creep factor with "going verdant" slang, but loses nautical flavor), The Bloom Shepherds (religious pastoral but less Gulf authentic), The Tide-Turned (Louisiana flavor, creepy "turned" meaning, but less clear), The Bloom Witnesses (religious Jehovah's Witnesses vibe, unsettling, but awkward spoken), The Cultivated (dramatic irony works but too on-the-nose).
- Updated all ~48 instances of "The Brined" → "The Kindari" and "The Bloom Watch"/"Bloom Watch" → "The Bloom Tenders"/"Bloom Tenders" throughout docs/thematic-direction.md (668 lines).
- Updated sections: faction identity/philosophy (§1.1, §1.2), stronghold room descriptions, NPC first contact dialogue, player origin/starting zone text, economy section (faction water relationships), language guidelines, settlement references.
- **Design principle learned:** Faction names should work on multiple levels. The Kindari name centers their cult-of-personality identity around Kindar. The Bloom Tenders name has a surface meaning (what they think they are) and a sinister meaning (what they actually are) — perfect for a faction unknowingly under external influence.
- **Algae influence as story vector:** This lore hook should inform NPC dialogue (too-reverent statements about bloom, eerie consensus), faction quests (missions that seem scientific but serve algae propagation), player observations (Tenders being "too calm," "too synchronized"), and future story arcs (what happens when the truth is discovered?).
- Decision document: `.squad/decisions/inbox/laeral-faction-names-v2.md`
- **Team impact:** Bruenor (database faction names), Regis (UI labels), Volo/Jarlaxle (faction logic/dialogue), all writers (use new canonical names).

## Learnings

### 2025-01-03: Siltgate & Warrens Room Descriptions — Dystopian Gulf Coast Realignment

**Task:** Rewrote all 202 room descriptions (137 Siltgate + 65 Warrens) for thematic realignment from generic fantasy to dystopian post-apocalyptic Gulf Coast setting (year 3000, New Orleans ruins).

**Approach:**
- Read thematic direction document thoroughly to understand the setting: flooded New Orleans 1000 years after drone apocalypse, Mississippi shifted to Atchafalaya, silted delta, brackish water, mutant wildlife (dog-sized rats, giant roaches, mutant snakes), rusted drone debris, kudzu/spanish moss/mangrove overgrowth, oppressive humidity, green algae light
- Parsed 202 rooms from source data files
- Preserved all slugs and types exactly (critical for game functionality)
- Renamed rooms where appropriate to fit setting
- Rewrote all descriptions (1-3 sentences, evocative, Louisiana gothic atmosphere)

**Key thematic elements incorporated:**
- **Water everywhere:** flooded streets, brackish pools, standing water, seepage, humidity
- **Vegetation:** kudzu, spanish moss, mangroves, wild growth reclaiming ruins
- **Wildlife:** mutant rats (dog-sized), giant roaches, mutant snakes, mosquito swarms, alligators
- **Drone debris:** rusted combat drones as landmarks, salvage sites, mechanical graveyards
- **Architecture:** Hurricane-damaged Creole/Cajun buildings, Garden District mansions, shipping container causeways, tilting townhouses
- **Sensory details:** smell of saltwater/rust/rot, green algae light, oppressive humidity, constant dripping
- **Louisiana flavor:** Jackson Square, Superdome, streetcars, oak trees with moss, bayou transitions
- **Tone:** Eerie but alive, overgrown, nature won, humanity is the intruder (NOT grimdark)

**Spatial/functional preservation:**
- Market Square → Jackson Ruins Market (still central hub/entry)
- Silver Arcade → Garden District Colonnade (still merchant district)
- Highwind Estates → Overgrown Garden District (still wealthy quarter)
- Dockward → Container Causeway (still waterfront/salvage)
- Beggar's Span → Silt Flats (still poor/flooded quarter)
- Ashgate Wastes → Drone Graveyard (still ruins/debris field)
- Drowned Veins → Flooded Service Passages (still sewer/underground)
- Warrens → Pre-extinction infrastructure (storm drains, maintenance tunnels, rat kingdoms)

**Output location:** `.squad/decisions/inbox/laeral-room-descriptions.md`

**Learnings for future content work:**
- Louisiana gothic atmosphere requires specific sensory details: brackish water, spanish moss, humidity, green algae light, saltwater smell
- Mutant wildlife should feel dangerous but natural — not evil, just adapted and indifferent to humans
- Drone debris serves as both narrative flavor and salvage economy driver
- Room descriptions need to balance evocative atmosphere with functional game information (what you see, what threatens you, where exits might be)
- Preserve spatial logic even when rethemes — markets are still markets, sewers still sewers, entry points still entries
- Single quote escaping for SQL: `it''s` not `it's` in descriptions

**Ready for implementation:** All 202 rooms have complete rewrites ready for database update.

### 2025-07-24: Creature & Item Retheme — Gulf Coast Alignment
- Rethemed 8 creatures and 12 items from fantasy/generic to dystopian Gulf Coast post-apocalypse.
- **Creature retheme strategy:** Mapped mutant human descendant archetypes from thematic-direction.md §6.2 onto existing humanoid enemy slots (alley_thug → Render-Kin Stalker, dockside_smuggler → Bone-Tithe Hoarder, plague_bearer → Fester-Thrall, the_harbourmaster → The Graftlord). Mapped Gulf Coast fauna from §3.2 onto wildlife slots (city_dog → Silt Roach, pigeon_flock → Mosquito Swarm, feral_dog → Feral Hog).
- **Item retheme strategy:** Replaced medieval weapons with improvised/scavenged equivalents (iron_sword → Rebar Machete, corroded_halberd → Corroded Fire Axe, iron_chainmail → Scrap-Weave Vest). Replaced fantasy materials with drone salvage and algae-based materials. Removed all currency references (copper coins → circuit boards, "alchemists pay copper" → Bloom Tenders study).
- **Preservation principle:** All creature and item IDs unchanged — room spawn references and loot table references remain valid. Stats unchanged. Only names, descriptions, and room_descriptions updated.
- **Faction integration:** Items now reference specific factions as buyers/users (Kindari for tech salvage, Bloom Tenders for biological materials, Krewe Calliope for ritual items). This creates faction economy hooks for future quest design.
- **Key design decision — drone reactor alloy:** The anomalous-tier weapon (voidforged_blade → Drone-Core Blade) uses "unknown alloy from drone reactor housing" as its mystery element. This replaces inter-planar fantasy with technology-grounded mystery — the alloy doesn't match pre-extinction databases, which the Kindari find deeply troubling. Leaves room for future lore expansion about the drones' origins.
- Design document: `.squad/decisions/inbox/laeral-creature-item-retheme.md`


## 2026-04-06T16:30Z — Creature & Item Retheme Design

**Completed:** Comprehensive thematic retheme for dystopian Gulf Coast alignment  
**Status:** ✅ Design approved, merged to decisions.md  
**Deliverable:** Thematic direction narrative, item/creature mapping, implementation notes for Bruenor

**Scope:** 8 creatures, 12 items, 20 items already aligned (no change needed)
- **Creatures:** city_dog→Silt Roach, pigeon_flock→Mosquito Swarm, feral_dog→Feral Hog, alley_thug→Render-Kin Stalker, dockside_smuggler→Bone-Tithe Hoarder, plague_bearer→Fester-Thrall, the_harbourmaster→The Graftlord
- **Items:** alley_thugs_coin→Scavenged Circuit Board, noble_signet_ring→Pre-Extinction Signet Ring, city_map→Salvaged City Map, silk_scarf→Bloom-Stained Cloth, healing_draught→Algae Salve, iron_sword→Rebar Machete, iron_chainmail→Scrap-Weave Vest, voidforged_blade→Drone-Core Blade, shardsteel_sabre→Honed Drone Blade, shardsteel_shard→Drone Alloy Shard, corroded_halberd→Corroded Fire Axe, rat_tail (description update only)

**Key Design Principles:**
- No ID changes (all loot tables remain valid)
- No stat changes (cosmetic/narrative only)
- All names tied to setting lore (post-apocalyptic Gulf Coast, year 3000, ruins of New Orleans)
- Creatures grounded in Gulf Coast fauna/mutations per thematic-direction.md §3.2 and §6.2
- Items sourced from pre-extinction salvage, drone debris, or ecological features (mutant algae bloom)
- Passive behavior flags preserved (city_dog, pigeon_flock)

**Setting Alignment:**
- Creature names reflect Gulf Coast ecosystem: oversized insects (roaches, mosquitoes), feral livestock (hogs), mutant humans (Render-Kin, Bone-Tithe Hoarders per §6.2)
- Boss creatures (Graftlord, Fester-Thrall) tied to faction archetypes: Corruption (Graftlords), Ugliness/Body Horror (Fester-Thralls)
- Items reflect salvage economy: drone parts (circuit boards, alloy shards), pre-extinction artifacts (signet rings, city maps), ecological mutations (bloom-stained cloth)
- Water currency removes fantasy coinage references
- Rebar/sheet metal/drone cable replace medieval materials with post-apocalyptic construction scraps

**Files:** Merged from `.squad/decisions/inbox/laeral-creature-item-retheme.md` → `.squad/decisions.md` (comprehensive decision section with 20+ items already-aligned analysis, 7 creature retheme details, 12 item retheme details, implementation notes)

**Handoff:** Full migration details provided to Bruenor (migration 020 structure, SQL patterns, loot table preservation)


## 2026-04-06T19:00Z — Faction Stronghold → World Zone Connections

**Completed:** Physical connection design for 3 faction strongholds to Siltgate and Warrens  
**Status:** ✅ Design complete — ready for database migration  
**Deliverable:** `.squad/decisions/inbox/laeral-stronghold-connections.md`

**Task:** Design how to connect three faction strongholds (The Reliquary, The Bloom Observatory, The Carrion Court) to main world zones (Siltgate city zone = 2 connections, Warrens dungeon zone = 1 connection).

**Final Assignments:**
1. **The Carrion Court** (Krewe Calliope) → **Siltgate Dockward** — thematic necessity (New Orleans krewe in NO ruins, Superdome in city proper)
2. **The Reliquary** (Kindari) → **Siltgate Ashgate Wastes** — industrial edge positioning (water treatment plant at city boundary)
3. **The Bloom Observatory** (Bloom Tenders) → **Warrens** — frontier/explorer positioning (offshore platform reaching toward eastern wastes)

**Transitional Room Design:**
- **2 rooms per connection** — creates environmental storytelling buffer without padding
- **6 new rooms total:**
  - Carrion Court: `superdome-breach` (corridor), `flooded-concourse` (corridor)
  - Reliquary: `filtration-annex` (corridor), `pipe-bridge` (entrance)
  - Bloom Observatory: `platform-descent` (corridor), `causeway-terminus` (entrance)
- All rooms have full descriptions, type classifications, properties/hazards where appropriate

**Exit Direction Logic:**
- **Carrion Court:** south (out of Superdome toward harbor) → `dock-street-1` (Siltgate)
- **Reliquary:** east (toward wastes) → `ashgate-chapel` (Siltgate Ashgate Wastes)
- **Bloom Observatory:** down then east (descending platform, crossing causeway) → `shattered-gate` (Warrens entry)
- All exits bidirectional (return directions: north, west, up+west)

**Key Design Rationale:**
- **Krewe Calliope must be in Siltgate** — they're the New Orleans krewe faction per migration 017. The Carrion Court is the collapsed Superdome. No other placement makes narrative sense.
- **Kindari at industrial edge** — migration 017 describes The Reliquary as "a converted water treatment plant on the edge of Siltgate." Ashgate Wastes is the transitional zone between city and dungeon.
- **Bloom Tenders at frontier** — their offshore platform "connected to Siltgate via corroded causeway" (migration 017) extends toward the wastes, positioning them as frontier scouts/ecologists.

**Architecture & File Paths:**
- **Faction stronghold definitions:** `/home/saitcho/ellmud/packages/server/src/db/migrations/017_faction_renames.sql`
- **Siltgate zone (136 rooms):** `/home/saitcho/ellmud/packages/server/src/db/migrations/004_seed_siltgate.sql`
- **Warrens zone (~100 rooms):** `/home/saitcho/ellmud/packages/server/src/db/migrations/003_seed_zones.sql`
- **Stronghold structure:** Each has 9 feature rooms (commons, stash, armoury, expedition-board, market, training, infirmary, war-room, inn)
- **Entry room convention:** All strongholds use `*-inn` rooms as entry points (`carrion-court-inn`, `reliquary-inn`, `bloom-observatory-inn`)

**Implementation Notes:**
- New migration file needed: `022_stronghold_connections.sql` (or next available number)
- Insert 6 new `zone_rooms` records (2 per zone: 4 in `the-siltgate`, 2 in `warrens`)
- Insert 12 new `zone_exits` records (bidirectional for each connection segment)
- No changes to existing rooms — purely additive
- Transitional rooms should be creature-free or have only ambient/weak encounters (thresholds, not combat zones)

**Design Principles Applied:**
- **Thematic coherence over gameplay convenience** — Krewe = NOLA krewe → must be in NOLA ruins
- **Geographic/narrative logic** — water plant at industrial edge, offshore platform reaching toward wastes
- **Environmental storytelling via transitions** — each 2-room sequence tells a story about faction's relationship to the world
- **Faction identity reinforced by positioning:** Krewe (cultural heart), Kindari (infrastructure guardians), Bloom Tenders (frontier explorers)

**Spatial Logic:**
- **Carrion Court → Dockward:** Superdome breach → flooded approach → harbor street
- **Reliquary → Ashgate:** Maintenance corridor → pipe bridge over blast crater → burned chapel
- **Bloom Observatory → Warrens:** External staircase down platform leg → causeway across brackish shallows → shattered gate threshold

**User Preferences Identified:**
- Strong emphasis on thematic/narrative coherence
- Environmental storytelling through transitional spaces valued
- Faction positioning should reinforce identity (cultural vs. industrial vs. frontier)
- 2-in-Siltgate, 1-in-Warrens split provides balanced hub access + frontier positioning

**Ready for Implementation:** All connection routes fully specified with room details, exit directions, properties, and thematic justifications.

### 2026-04-06: Stronghold → World Zone Connections Design

Designed physical connections for all three faction strongholds to main world zones:

**Assignments:**
- **The Carrion Court** (Krewe Calliope) → **Siltgate** (Dockward)
- **The Reliquary** (Kindari) → **Siltgate** (Ashgate Wastes)
- **The Bloom Observatory** (Bloom Tenders) → **Warrens**

**Deliverables:**
- Design document specifying 6 transitional rooms (2 per connection)
- Complete exit mapping for all 24 exits (12 bidirectional pairs)
- Thematic narratives for each room reflecting faction identities
- Implementation notes for Bruenor including zone assignments, property guidance, spawn considerations

**Design Rationale:**
1. Krewe Calliope MUST be in Siltgate (Superdome = iconic New Orleans, flooded city setting)
2. Kindari at Ashgate Wastes (water treatment plant "on edge of Siltgate," perfect infrastructure positioning)
3. Bloom Tenders at Warrens edge (offshore platform reaching toward hostile eastern wastes, emphasizes frontier role)
4. Two transitional rooms per connection (creates buffer, allows pacing, provides environmental storytelling)
5. Exit directions chosen for spatial logic (south from Superdome, east from Reliquary, down-then-east from platform)

**Status:** Design complete, merged to `.squad/decisions.md` for Bruenor's implementation.

**Orchestration Log:** `.squad/orchestration-log/2026-04-06T19:20:15Z-laeral.md`

### 2025-07-24: Container Item Tier Progression Design
- Designed 6 new containers filling gaps at refined, masterwork, and anomalous tiers plus a sturdy-tier specialist.
- **Container system key facts:** `ContainerProperties` interface in `packages/shared/src/items.ts`. Fields: `maxSlots`, `maxWeight?`, `carryBonus?`, `allowedItemTypes?`. Omitting `maxWeight` means no weight limit. Container nesting is blocked in `addItemToContainer()`.
- **Existing containers:** Tattered Satchel (scrap), Expedition Pack (common), Apothecary's Pouch (sturdy/consumable-only).
- **New containers designed:** Munitions Wrap (sturdy, weapon-only), Ironbound Coffer (refined, general), Salvager's Haversack (refined, material-only), Warden's Lockbox (masterwork, general), Fleshknit Satchel (masterwork, consumable+key), Hollow of the Forgotten (anomalous, no weight limit, 0 weight, +25 carry bonus).
- **Design principles:** Weight trade-offs prevent strict upgrades at each tier; specialist containers reward build commitment; ANSI color tags in names signal rarity; anomalous tier is aspirational (drop weight 1).
- **ItemType spelling:** Code uses `'armour'` (British), not `'armor'`. Registry constants use `UPPER_SNAKE_CASE`.
- **Key file paths:** Container definitions in `packages/server/src/items/registry.ts`. Container interface in `packages/shared/src/items.ts`. Design doc at `.squad/decisions/inbox/laeral-container-designs.md`.
