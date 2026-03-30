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

## Learnings

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
