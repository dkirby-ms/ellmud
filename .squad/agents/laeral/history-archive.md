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


