<!-- markdownlint-disable-file -->

# Zone Designer Quick-Start Guide

This guide walks you through creating your first hand-crafted zone in Ellmud using the admin tools.

## Prerequisites

- Admin access to the admin dashboard (http://localhost:3000/admin)
- Basic familiarity with the [Zone Content Specification](zone-content.md)
- Understanding of zone structure: rooms, exits, creatures, loot

## Step 1: Plan Your Zone

Before touching the admin dashboard, sketch out your zone on paper or in a text editor.

**Define:**
- **Zone name** (e.g., "Flooded Crypt")
- **Tier** (1-5)
- **Theme/biome** (crypt, forest, ruins, etc.)
- **Room count** (15-40 recommended)
- **Key encounters** (boss room, loot room, safe room)
- **Rough room layout** (draw a simple map)

**Example plan:**
```
Flooded Crypt (Tier 2, 25 rooms)
Theme: Underwater dungeon with drowned creatures
Entry: North Gate (safe)
Exit: South Gate (safe)
Boss: Tier 2 boss in center chamber (Room 13)
Loot: 2-3 chest rooms with tier-appropriate gear
```

## Step 2: Create the Zone Record

Log into the admin dashboard and navigate to **Zones**.

1. Click **+ New Zone**
2. Fill in:
   - **Name:** "Flooded Crypt"
   - **Tier:** 2
   - **Biome:** `underwater_crypt`
   - **Lifecycle:** `persistent`
   - **Max Players:** 100
   - **Description:** "A flooded burial chamber inhabited by drowned ancients. Water fills the lower levels; navigation is treacherous."
3. Click **Create**

**Note:** Save the zone ID (UUID) — you'll need it for creating rooms.

## Step 3: Create Rooms

Navigate to the **Rooms** section (under the zone) or use **Rooms** CRUD.

For each room in your plan, create a record:

```
Room 1: North Gate
Type: corridor
Environment: underwater_crypt
Light: 0.6 (moderately lit)
Hazards: [water_deep]
Features: [stone_arch, rusted_gate]
Description: "A grand stone gateway, now corroded by salt water. The gate hangs partially open, its hinges long rusted. Water up to your chest fills the chamber beyond."
```

**Best practice:** Number your rooms (1, 2, 3...) in your planner so you can create them systematically. The admin UI will assign UUIDs; you'll map them to your planner numbers.

Create at least:
- 2-4 **entry/exit rooms** (safe, no creatures)
- 3-4 **encounter rooms** (creatures, loot containers)
- 1 **boss room** (major threat)
- 1-2 **safe rooms** (story/rest rooms, no creatures)
- Remaining **corridor rooms** (connecting, may have light encounters)

## Step 4: Link Rooms with Exits

Once all rooms exist, create **exits** connecting them.

For each room, add exits in cardinal directions (north, south, east, west, up, down):

```
Room 1 (North Gate):
  - south → Room 2 (Flooded Hall)
  - east → Room 3 (Side Chamber)

Room 2 (Flooded Hall):
  - north → Room 1 (North Gate)
  - west → Room 4 (Creature Corridor)
  - south → Room 5 (Deep Chamber)
  ...
```

**Mapping tool:** Use a simple text map or sketch to keep track:
```
      [1: Gate]
         |
      [2: Hall]
      /  |  \
   [3] [4] [5]
         |
      [13: Boss]
         |
      [20: Exit]
```

## Step 5: Place Creatures

For each **encounter room**, add creature spawns.

In the **Creatures** section:
1. View available creature definitions (or create new ones)
2. For each encounter room, add a spawn entry:

```
Room 4 (Creature Corridor):
  Spawn 1: Drowned Revenant (qty 2, respawn 300 ticks)
  Spawn 2: Drowned Zombie (qty 1, respawn 300 ticks)
```

**Tier-appropriate:** For Tier 2 zone:
- Tier 1-2 creatures OK
- Avoid tier 3+ (too hard)
- Mix 1-2 creatures per room (average 1.5/room for Tier 2)

## Step 6: Place Loot

For each room that should have loot, add **loot containers** (chests, skeletons, etc.).

In the **Loot** or **Room** details:
1. Add container (chest, skeleton, rubble, etc.)
2. Assign loot table (e.g., "tier-2-common-drops")
3. Set respawn timer (300-600 ticks = 5-10 minutes)

**Tier 2 loot example:**
```
Room 6 (Treasure Chamber):
  Container 1: Chest (Tier 2 drops, 70% chance, respawn 600 ticks)
  
Expected loot: Common→Sturdy items, occasional Refined, rare Masterwork
```

## Step 7: Test & Iterate

### Playtesting Checklist

1. **Navigate the zone:**
   - Start in entry room, walk every path
   - Verify all exits work (no dead ends unless intentional)
   - Check room descriptions are sensible

2. **Combat:**
   - Enter an encounter room
   - Fight 1-2 creatures
   - Verify damage, experience, difficulty feel right
   - Check loot drops are reasonable

3. **Pacing:**
   - Count fights needed to exit
   - Estimate time to complete (should match tier)
   - Check for monotony (vary encounter types, room types)

4. **Balance:**
   - Is Tier 2 actually tier-appropriate?
   - Do new players have a learning curve (not instant death)?
   - Do experienced players find challenge?

### Iteration Loop

If something feels wrong:
1. **Too hard?** Reduce creature count, lower creature tier, add safe rooms
2. **Too easy?** Increase creature count, add harder creatures, add hazards
3. **Confusing layout?** Add more exits, simplify branching, add signposts
4. **Boring?** Add variety in encounter types, hazards, environmental flavor

After each tweak, re-test.

## Step 8: Document Your Zone

Add metadata to your zone record for future designers:

```
Zone: Flooded Crypt
Author: YourName
Created: 2026-04-25
Tier: 2
Intended for: Duo or solo Tier 2 players
Key features: Water hazards, underwater theme, drowned mobs
Balance notes: Slightly harder than average Tier 2 (creatures are fast)
Future ideas: Boss variant fight, treasure keys to unlock secret room
```

## Tips & Best Practices

### Room Descriptions

Write prose-first. The LLM will enhance it, but your base description should be:
- **Evocative:** "Murky water fills this chamber" not "Room with water"
- **Specific:** Include visual details, sounds, smells
- **Brief:** 1-3 sentences (LLM expands)

### Encounter Design

Variety keeps zones fresh:
- **Solo threat:** 1 powerful creature
- **Pack threat:** 3-4 weaker creatures
- **Mixed:** 1 elite + 1-2 minions
- **Safe:** No creatures, story/loot room

### Loot Distribution

Zones should feel rewarding but not grindy:
- **Low:** 30% of rooms have loot containers
- **Medium:** 50% of rooms (recommended)
- **High:** 70% of rooms (only for treasure zones)

### Progression

Connect zones by difficulty:
- **Tier 1:** Easiest, best for learning (combat tutorial zones)
- **Tier 2:** Intermediate, good for early progression
- **Tier 3+:** Escalating difficulty, challenging tiers
- **Safe zones:** Pvery tier should have accessible loot/exp opportunities

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Players getting lost | Fewer exits, clearer room names, add signposts |
| Creatures too hard | Reduce tier, reduce qty, add escape routes |
| Boring encounters | Mix creature types, add hazards, environmental obstacles |
| Loot feels stingy | Increase container density, improve drop rates |
| Zone feels small | Add more rooms (aim for 20-40), more branching |

## See Also

- **[Zone Content Specification](zone-content.md)** — Full design guidelines
- **[GDD.md](../GDD.md)** — Game design (zones, combat, mechanics)
- **[docs/admin-guide.md](admin-guide.md)** — Admin dashboard feature reference

## Next Steps

Once your first zone is complete and tested:
1. Deploy to staging environment
2. Invite testers (players, other designers)
3. Gather feedback
4. Iterate (Step 7)
5. Merge to production when satisfied

Happy zone building! 🎮

