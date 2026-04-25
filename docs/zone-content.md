<!-- markdownlint-disable-file -->

# Zone Content Specification

## Overview

This document provides guidelines for designing hand-crafted **zones** in Ellmud. Zones are persistent, hand-designed areas filled with creatures, loot, hazards, and environmental storytelling. This spec ensures consistency, balance, and quality across all zone content.

## Zone Structure

### Room Graph

Each zone is a **directed graph of rooms**. Rooms are nodes; exits are edges.

**Constraints:**
- **Minimum rooms:** 15 (small zone)
- **Recommended:** 20-40 (standard zone)
- **Maximum:** 60+ (large zone or endgame area)
- **Room types:** Corridor, chamber, alcove, clearing, passage, etc.

**Design Principle:** Design for **tactical exploration**, not maze difficulty. Players should be able to map the zone mentally or with mapping tools. Excessive complexity (>60 rooms) should be used sparingly for endgame content.

### Entry & Exit Points

**Entry Points:**
- Each zone has **2-4 entry rooms** distributed geographically
- Entry rooms do not spawn creatures (safe to orient yourself)
- Multiple entries prevent spawn camping; players enter in different parts of the map

**Exit Points:**
- Each zone has **2-4 exits** to the faction stronghold or connected overworld
- Exits are distributed throughout the zone (not at a single chokepoint)
- Exits are safe; no creatures spawn in exit rooms
- Reaching an exit means you've escaped with your loot

**Design Principle:** Distributed entries and exits create meaningful navigation decisions and prevent "corridor bottleneck" gameplay.

### Room Design

Each room has the following properties:

```typescript
{
  id: string;                      // Unique identifier (e.g., "flooded-crypt::room-12")
  name: string;                    // Display name (e.g., "Collapsed Pillar Chamber")
  type: RoomType;                  // Classification (corridor, chamber, alcove, etc.)
  description: string;             // Base description (LLM enriches this)
  environment: EnvironmentType;    // Biome/thematic (crypt, forest, ruins, etc.)
  light_level: number;             // 0.0 (pitch black) to 1.0 (bright)
  hazards: HazardType[];           // Environmental dangers (water, spikes, collapse, etc.)
  features: RoomFeature[];         // Interactive elements
  loot_containers: LootContainer[]; // Chests, skeletons, rubble, etc.
  creatures: CreatureSpawn[];      // What creatures spawn here (respawn schedule)
  exits: Exit[];                   // Connections to other rooms
}
```

### Room Types

| Type | Purpose | Typical Size | Creatures |
|------|---------|--------------|-----------|
| **Corridor** | Passage between areas | 1-2 creatures | 0-2 |
| **Chamber** | Main encounter area | 3-5 creatures | 3-5 |
| **Alcove** | Side area, treasure room | 0-2 creatures | 0-1 |
| **Clearing** | Open space, multiple exits | 2-4 creatures | 2-4 |
| **Passage** | Narrow tunnel | 0-1 creatures | 0-1 |
| **Boss Chamber** | Significant threat | 1 boss + minions | 1-3 |

**Design Principle:** Vary room types to create distinct spaces and encounter densities. Long corridors build tension; chambers provide major battles.

## Encounter Design

### Creature Placement

Each room has a configured **creature spawn list**:

```typescript
{
  creature_id: string;      // Reference to creature definition
  spawn_count: number;      // How many spawn (1-5)
  spawn_delay_ticks: number; // Respawn after this many ticks (300-600 = 5-10 minutes)
  disposition: string;       // "idle", "patrol", "alert", "hostile"
}
```

### Encounter Tiers

Zones are classified by **tier**, determining difficulty:

| Tier | Creature Level | Loot Quality | Recommended Party |
|------|----------------|--------------|-------------------|
| **1** | 1-3 | Scrap/Common | Solo or duo |
| **2** | 4-6 | Common/Sturdy | Duo/trio |
| **3** | 7-9 | Sturdy/Refined | 3-4 players |
| **4** | 10-12 | Refined/Masterwork | 4-6 players |
| **5** | 13+ | Masterwork/Anomalous | 6+ players or skilled solo |

**Consistency:** All rooms in a zone should be tier-appropriate. Avoid tier 1 creatures in a tier 3 zone (exception: young versions of creatures for learning encounters).

### Creature Mix

Within a zone, use varied creature types to create interesting dynamics:

- **Elite encounters:** 1 tough creature + minions (e.g., 1 boss + 2 trash mobs)
- **Pack encounters:** Multiple weaker creatures (e.g., 4 trash mobs)
- **Solo encounters:** 1 creature challenging enough to be interesting (e.g., 1 strong creature at tier-appropriate level)

**Design Principle:** Mix solo, pack, and mixed encounters to keep combat fresh. Avoid all-trash or all-boss compositions.

### Safe Rooms

Designate **2-3 rooms per zone** as safe (no creatures):
- Lore rooms (environmental storytelling, no combat)
- Resource rooms (healing springs, rest areas)
- Hub rooms (multiple exits, tactical decision points)

**Design Principle:** Safe rooms provide mental breaks and strategic resting points without punishing exploration.

## Loot Distribution

### Loot Containers

Loot is found in containers:

```typescript
{
  id: string;
  type: "chest", "skeleton", "rubble", "altar", "corpse", etc.;
  difficulty: number;  // 1-5 (lockpicking/opening difficulty)
  loot_table_id: string; // Reference to loot table
  respawn_ticks: number;  // How long before contents respawn (300-1200)
}
```

### Loot Table Strategy

Each room or creature type references a **loot table** that defines:
- **Drop chance:** Probability a creature/container yields loot
- **Rarity distribution:** % chance of each rarity (Scrap 40%, Common 35%, Sturdy 15%, Refined 8%, Masterwork 1.5%, Anomalous 0.5%)
- **Item types:** Which items (weapons, armor, consumables, materials) can drop
- **Quantity:** How many items per drop

**Tier-Appropriate Loot:**

| Zone Tier | Primary Rarity | Secondary | Tertiary |
|-----------|---------------|-----------|----------|
| **1** | Scrap (50%) | Common (40%) | Sturdy (10%) |
| **2** | Common (50%) | Sturdy (30%) | Refined (15%), Scrap (5%) |
| **3** | Sturdy (45%) | Refined (35%) | Masterwork (15%), Common (5%) |
| **4** | Refined (50%) | Masterwork (30%) | Anomalous (15%), Sturdy (5%) |
| **5** | Masterwork (50%) | Anomalous (35%) | Refined (10%), Materials (5%) |

**Design Principle:** Higher tiers drop better loot, but lower tiers should still provide useful gear for progression. No tier is completely worthless.

### Loot Density

- **Low density:** 30% of rooms have containers; 50% drop rate = ~15% of visits yield loot
- **Medium density:** 50% of rooms have containers; 70% drop rate = ~35% of visits yield loot
- **High density:** 70% of rooms have containers; 80% drop rate = ~56% of visits yield loot

**Recommendation:** Use medium density for most zones. High density zones feel like loot piñatas; low density zones feel barren. Vary within a zone for pacing.

## Environmental Storytelling

### Narrative Direction

Each zone tells a **thematic story** through environment and lore:

**Examples:**
- **Flooded Crypt:** A burial chamber slowly filling with water; drowned ancients as creatures; waterlogged gear as loot
- **Lost Catacombs:** An ancient library collapsing; undead scholars as creatures; scrolls and tomes as materials
- **Shattered Bastion:** A fortress under siege; skeletal defenders still fighting; reinforced armor as loot

### Traces & Environmental Cues

Rooms include **traces** (sounds, footprints, signs) that hint at:
- Creature presence nearby (distant growls, scratches on stone)
- Loot availability (glint of metal, scent of decay)
- Other player activity (fresh footprints, recent corpses)
- Hazard warnings (rumbling, poisonous smell, unstable cracks)

**Design:** Include 1-2 traces per room for atmosphere and player awareness.

### Hazards

Environmental hazards create tactical challenges:

| Hazard | Effect | Frequency |
|--------|--------|-----------|
| **Water** | Reduced movement, armor encumbrance | 20% of rooms (tier-dependent) |
| **Collapse** | Damage, blocking exits, trapped creatures | 10% of rooms (endgame zones) |
| **Darkness** | Reduced visibility, heightened creature awareness | 15% of rooms |
| **Spikes/Traps** | Damage on movement or interaction | 5% of rooms |
| **Poison/Hazardous Air** | Status effects, damage over time | 8% of rooms |
| **Fire/Heat** | Damage, stat debuffs | 5% of rooms |
| **Supernatural** | Curses, stat drains, disorientation | 3% of rooms (thematic) |

**Design Principle:** Hazards should be **avoidable** (players can route around them or mitigate) and **thematically appropriate** to the zone.

## Zone Statistics

### Creature Density

Average creatures per room (across all rooms, including safe rooms):

| Tier | Avg Creatures/Room | Notes |
|------|-------------------|-------|
| **1** | 1.0-1.5 | Manageable for solo |
| **2** | 1.5-2.0 | Encouraging duo play |
| **3** | 2.0-2.5 | Group content |
| **4** | 2.5-3.5 | Large groups |
| **5** | 3.0-4.0 | Raids or skilled teams |

### Loot Value

Total tradeable value of all items in a zone (for reference):

| Tier | Est. Total Value | Avg per Visit |
|------|------------------|---------------|
| **1** | 500-1000 gold | 50-150 gold |
| **2** | 1500-2500 gold | 150-300 gold |
| **3** | 3000-5000 gold | 300-600 gold |
| **4** | 7500-12500 gold | 750-1500 gold |
| **5** | 20000+ gold | 2000+ gold |

**Design Principle:** Higher-tier zones reward players with better loot, creating incentive to progress.

### Time to Complete

Estimate time to explore and fully clear a zone:

| Tier | Solo | Duo | Group |
|------|------|-----|-------|
| **1** | 45-60 min | 30-45 min | 25-35 min |
| **2** | 60-90 min | 40-60 min | 35-50 min |
| **3** | 90-120 min | 60-90 min | 50-75 min |
| **4** | 120-150+ min | 90-120+ min | 75-100+ min |
| **5** | 150+ min | 120+ min | 100+ min |

**Design Principle:** Respect player time. A 40-minute zone run should feel rewarding, not grindy.

## Progression & Gating

### Accessibility

Early zones (Tier 1-2) should be **accessible to all**. Newer players should be able to get gear, learn combat, and survive.

**Requirements:**
- No tier 3+ creatures in tier 1-2 zones
- Safe rooms allow resting and planning
- Multiple exit points prevent dead-end traps
- Loot is tier-appropriate (new players can gear up)

### Endgame Gating

Higher-tier zones can have **gating mechanics**:
- **Keys:** Require items found in lower tiers (ritual keys, faction tokens)
- **Skill gates:** Require player progression (high Swordsmanship to enter, etc.)
- **Faction gates:** Require faction reputation
- **Location gates:** Geographic isolation (high mountain, deep underground)

**Design Principle:** Gates should be **discoverable** and **achievable**, not arbitrary.

## Zone Database Schema

Zones are stored in PostgreSQL:

```sql
CREATE TABLE zones (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  biome VARCHAR,
  tier INT,
  category VARCHAR,
  lifecycle VARCHAR, -- 'persistent' or 'instanced'
  max_players_per_instance INT DEFAULT 100,
  description TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE zone_rooms (
  id UUID PRIMARY KEY,
  zone_id UUID REFERENCES zones(id),
  name VARCHAR NOT NULL,
  type VARCHAR,
  environment VARCHAR,
  light_level FLOAT,
  hazards TEXT[],
  loot_table_id UUID,
  created_at TIMESTAMP
);

CREATE TABLE zone_exits (
  id UUID PRIMARY KEY,
  room_id UUID REFERENCES zone_rooms(id),
  direction VARCHAR,
  destination_room_id UUID REFERENCES zone_rooms(id),
  created_at TIMESTAMP
);

-- Creature spawns, loot tables, etc. reference zones
```

## Best Practices

1. **Playtesting:** Design on paper, test in-game. Walk every path, check sightlines and tight corridors.
2. **Consistency:** Keep tier, aesthetic, and creature types consistent within a zone.
3. **Variety:** Mix room types, encounter compositions, and hazard types to keep exploration fresh.
4. **Narrative:** Every room should have a *reason* — lore, strategy, or discovery.
5. **Balance:** Ensure difficulty scaling matches player progression.
6. **Polish:** Use traces, ambient sounds, and environmental details to bring zones to life.

## See Also

- **[GDD.md](../../GDD.md)** — Full game design, including zone instancing and zone lifecycle
- **[docs/architecture.md](../architecture.md)** — Zone loading and server systems
- **[docs/player-guide.md](../player-guide.md)** — How players experience zones

