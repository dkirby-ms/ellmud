# Player Guide

Welcome to **Ellmud**, a real-time multiplayer MUD/MMORPG with permadeath and persistent consequence.

You are an **adventurer** in a vast world of hand-crafted zones filled with creatures, loot, and other players. Venture into dangerous areas to earn gear and experience. If you fall, your equipped gear is lost and left behind on your corpse. Your legend is recorded in the Hall of Fame. Every adventure carries weight.

## The Gameplay Loop

```
1. Spawn        →  Appear in your faction stronghold
2. Prepare      →  Equip gear from your stash, form a group (optional)
3. Enter Zone   →  Choose an adventure zone from the Expedition Board
4. Explore      →  Navigate rooms, find loot, encounter creatures and players
5. Combat       →  Fight creatures (or defend yourself against players)
6. Survive/Die  →  Reach a zone exit and walk out alive, or fall and lose your gear
7. Recover      →  Return to your stronghold with loot or respawn with death debuff
```

**If you die in a zone:** You drop all non-soulbound equipped items on your corpse. Other players can loot them. You respawn in your faction stronghold and receive a temporary death penalty debuff (reduced stats, regeneration). Your death is recorded in the Hall of Fame.

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

Combat is **real-time and continuous**. When you encounter a creature:

```
> attack revenant   — Initiate combat against the creature
```

During combat, your character **auto-attacks** the target each server tick (1 second). You control your actions via an ability bar with 5 hotkeys (1–5):

| Action | Hotkey | Effect |
|--------|--------|--------|
| Ability 1 | `1` | Use your first equipped ability |
| Ability 2 | `2` | Use your second equipped ability |
| Ability 3 | `3` | Use your third equipped ability |
| Ability 4 | `4` | Use your fourth equipped ability |
| Ability 5 | `5` | Use your fifth equipped ability |
| Flee | `F` or type `flee` | Attempt to escape from combat |
| Target Next | `Tab` | Cycle to the next hostile creature |

**Abilities have cooldowns and cost stamina.** Choose which abilities to equip before entering a zone. The right ability at the right time can turn a fight.

Combat ends when:
- All creatures in your room are defeated
- You successfully flee to another room
- You die

**Positioning:** Your position affects combat effectiveness. During combat, you can reposition (Front, Flank, or Rear) — melee attacks work best from Front or Flank, while ranged attacks work from any position.

**Alias:** `k` for `attack`.

### Leaving a Zone

When you've explored enough or want to preserve your loot, navigate to a **zone exit**:

```
> look              — Check if there's an exit in this room
> go north          — Move toward an exit if one exists in that direction
```

Once you've exited the zone, all items in your inventory are automatically transferred to your stash in your faction stronghold. You've successfully completed your adventure!

**You can exit at any time** — there's no timer, no ritual, no collapse. Just navigate to the edge of the zone and walk out.

### Social

```
> say Hello, anyone there?
```

Speech is heard by other players in the same room.

## Your Faction Stronghold

Your faction stronghold is your home base — a safe space where you prepare for adventures and manage your gear between runs. Here you can:

```
> stash             — View your persistent stash (weight & items)
> store sword       — Move an item from inventory to stash
> take sword        — Equip an item from your stash
> look              — Survey the stronghold
> board             — Access the Expedition Board to enter zones
```

### Stash

Your **stash** persists between zone visits. It holds all the gear you're not currently using. Default capacity: 200 weight units.

Items in your stash are **always safe**. They are not lost on death and cannot be taken by other players.

### Expedition Board

The Expedition Board lists available **zones** you can enter. Each zone has:

- **Zone Name** — The area name (Flooded Crypt, Lost Catacombs, etc.)
- **Tier** — Difficulty level (Tier 1 is easier; higher tiers are more dangerous)
- **Modifiers** — Special conditions (darkness, bountiful loot, etc.)
- **Current Population** — How many players are currently in this zone

Select a zone and enter. You'll spawn in the entry room and can immediately begin exploring.

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

1. **Plan your abilities** — Equip the right mix before entering a zone
2. **Use positioning** — Melee works best from Front/Flank; ranged from any position
3. **Know your exits** — Remember how to get back before engaging tough enemies
4. **Group up** — Form a group with friends for tougher zones
5. **Don't overextend** — If you're low on health and gear, head for an exit

## Death & The Hall of Fame

**Permadeath is permanent.** When you die:
- Your character is gone forever (you can create a new one)
- All equipped gear drops on your corpse for others to loot
- Soulbound items (cosmetics, special rewards) are preserved
- Your death is recorded in the **Hall of Fame** with your stats (zones cleared, creatures slain, gear value, etc.)
- You respawn in your faction stronghold with a **death penalty debuff** that reduces your stats temporarily (30 minutes or until removed at the infirmary)

**There is no resurrection.** Your legacy lives on in the Hall of Fame, but your character's journey is over.

## Zone Design

Zones are **hand-crafted**, persistent areas designed for exploration and discovery. You'll return to the same zones multiple times, learning layouts and discovering secrets. Each visit feels fresh because:

- **Other players** are present, creating unpredictable encounters
- **Creatures respawn** on timers, changing what threats you face  
- **Loot is distributed**, so you never find the exact same items twice
- **Environmental hazards** create tactical challenges (water, darkness, unstable terrain)

Zones do not collapse. There is no timer. You can spend as long as you want exploring, as long as you have the stamina to survive.
