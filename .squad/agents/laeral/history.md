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
