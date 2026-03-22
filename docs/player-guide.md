# Player Guide — Phase 1

Welcome to **Ellmud**, a PvPvE extraction RPG set in a dark fantasy world of unstable dimensional shards.

You are a **Shardwalker** — diving into procedurally generated dungeons to scavenge gear, fight creatures, and extract before the shard collapses. Everything you don't extract, you lose.

## The Gameplay Loop

```
1. Prepare  →  Equip gear from your stash
2. Enter    →  Join a shard through the Shardboard
3. Explore  →  Navigate rooms, find loot, avoid hazards
4. Fight    →  Combat creatures (or other players)
5. Extract  →  Channel the extraction ritual to escape
6. Return   →  Items you carried are saved to your stash
```

**Death means loss.** If you die in a shard, you drop all non-soulbound items and respawn in the Refuge with shard-sickness (a temporary debuff).

## Basic Commands

### Moving Around

Type a direction to move:

```
> go north
> go south
> go east
```

**Shortcuts:** `n`, `s`, `e`, `w`, `u`, `d` — single-letter directions.

### Looking Around

```
> look              — Describe the current room
> look sword        — Examine a specific item or feature
> search            — Search for hidden items
> listen            — Listen for sounds in nearby rooms
```

**Alias:** `l` for `look`.

### Managing Items

```
> take torch        — Pick up an item from the room
> drop torch        — Drop an item from your inventory
> inventory         — List what you're carrying
> use potion        — Use a consumable item
```

**Alias:** `i` for `inventory`.

### Combat

Combat is **tick-based** (1-second rounds). When you encounter a creature:

```
> attack revenant   — Initiate combat
```

During each combat tick, choose one action:

| Action | Command | Effect |
|--------|---------|--------|
| Strike | `strike` | Attack your target |
| Dodge | `dodge` | Reduce incoming damage |
| Flee | `flee [direction]` | Attempt to escape |

**If you don't type anything**, you automatically dodge.

**Damage is simultaneous** — all attacks resolve from start-of-tick health, then all damage is applied at once.

Combat ends when:
- All enemies are defeated
- You flee successfully
- 10 ticks pass with no strikes (timeout)

**Alias:** `k` for `attack`.

### Extraction

To escape a shard with your loot, find an **extraction room** and channel the ritual:

```
> extract
```

Extraction takes **5 ticks** (5 seconds). During this time:
- You **cannot** move, attack, or flee
- You **can** look, check inventory, take, and drop items
- The ritual generates **loud noise** (level 8) — creatures will investigate
- Taking damage **interrupts** the extraction

Successfully extracting saves all carried items to your stash.

### Social

```
> say Hello, anyone there?
```

Speech is heard by other players in the same room.

## The Refuge

The Refuge is your safe hub between shard runs. Here you can:

```
> stash             — View your persistent stash (weight & items)
> store sword       — Move an item from inventory to stash
> shardboard        — See available shard entries
> enter <shard-id>  — Enter an open shard listed on the shardboard
> look              — Survey the Refuge
```

Your **stash** persists between runs. Default capacity: 200 weight units.

## The Shardboard

The Shardboard shows available shard entries. Each shard has:

- **Shard ID** — The identifier used with `enter <shard-id>`
- **Biome** — The environment type (Flooded Crypt, Shattered Bastion, etc.)
- **Tier** — Difficulty level (Tier 1 is the easiest)
- **Modifiers** — Special conditions (darkness, bountiful loot, etc.)
- **Lifecycle** — Seeding, Open, Active, Destabilising, or Collapse

## Items & Gear

### Gear Tiers

Items come in six quality tiers:

| Tier | Quality | Drop Chance |
|------|---------|------------|
| Scrap | Barely functional | Common |
| Common | Serviceable | Common |
| Sturdy | Well-made | Uncommon |
| Refined | Excellent | Rare |
| Masterwork | Exceptional | Very rare |
| Anomalous | Reality-warped | Extremely rare |

Higher-tier items have better stats and durability — but losing them hurts more.

### Item Types

- **Weapons** — Damage and speed stats
- **Armour** — Damage reduction and weight
- **Consumables** — Healing potions, stamina tonics (limited slots)
- **Materials** — Crafting ingredients (bones, shards, scrolls)
- **Keys** — Unlock locked areas
- **Tools** — Utility items

### Durability

Most items degrade with use. A broken weapon deals reduced damage; broken armour provides no protection. Repair at the Refuge (Phase 2).

## Creatures

In Phase 1, you'll encounter **Drowned Revenants** in the Flooded Crypt biome:

- **HP:** 50
- **Behavior:** Patrols corridors, investigates noise, attacks on sight
- **Flees** at 25% health
- **Drops:** Waterlogged bones, revenant essence

Creature behavior follows a state machine: **idle** → **alert** (heard noise) → **hostile** (found you) → **fleeing** (low health).

## Combat Tips

1. **Dodge is free** — If you're unsure, doing nothing defaults to dodge
2. **Check your exits** — Know where you can flee before engaging
3. **Extraction is loud** — Clear nearby rooms before extracting
4. **Items on the ground vanish** when the shard collapses — extract or lose them
5. **Simultaneous damage** means mutual kills are possible — don't start a fight at low health

## Shard Lifecycle

Shards are unstable and temporary:

| Phase | What Happens |
|-------|-------------|
| **Open** | Entry points activate, you can join |
| **Active** | Explore, fight, loot freely |
| **Destabilising** | Hazards intensify, time is running out |
| **Collapse** | Shard destroyed — anything not extracted is lost |

Watch for stability warnings in the room descriptions. When the ground shakes, it's time to extract.
