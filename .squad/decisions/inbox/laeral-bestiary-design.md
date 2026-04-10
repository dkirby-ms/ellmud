# Decision: Dystopian Future Bestiary Design

**Date:** 2026-04-07  
**Author:** Laeral (Content Designer)  
**Issue:** #391  
**Status:** Design Complete — Ready for Implementation  

---

## Decision

Designed a comprehensive bestiary of ~103 creatures for Ellmud's dystopian future setting, distributed across 7 zone environments with full stat progression from Tier 1 to Tier 3 plus bosses.

---

## Context

The game needed a creature roster to populate adventure zones beyond the initial 5 creatures in The Warrens. Requirements:
- ~100 creatures across all tiers
- Distributed across varied zone environments
- Post-apocalyptic/dystopian theming (NOT medieval fantasy)
- Mix of aggressive and passive creatures
- Items and loot tables for each creature
- Stat scaling that creates meaningful progression
- Telegraphed abilities for elite/boss encounters

---

## Design Decisions

### 1. Zone Environment Structure

Organized creatures by thematic zone environments rather than pure tier:

1. **Collapsed Megastructure** (ruins, rubble, urban decay)
2. **Flooded Depths** (submerged infrastructure, aquatic mutations)
3. **Toxic Wastes** (chemical spills, industrial hazards)
4. **Overgrown Ruins** (nature reclaiming, aggressive flora/fauna)
5. **Industrial Graveyard** (abandoned factories, rogue machinery)
6. **Desolate Wastes** (radiation zones, nuclear fallout)
7. **Eternal Night** (perpetual darkness, shadow creatures)

**Rationale:** Zone environments create cohesive narrative theming. Creatures tell environmental stories (what happened here, what survived, what evolved). This structure supports future zone creation — designers can pick an environment and have a ready roster.

### 2. Tier Distribution

- **Tier 1 (Shallow):** 40 creatures — most common, varied, foundational encounters
- **Tier 2 (Deep):** 35 creatures — more dangerous, specialized abilities
- **Tier 3 (Abyssal):** 20 creatures — elite threats, unique mechanics
- **Bosses:** 8 total (2 Tier 2, 6 Tier 3) — one signature boss per environment

**Rationale:** Pyramid structure (more common creatures at lower tiers) supports zone population density. Tier 1 has the most variety because players spend the most time there. Bosses anchor each environment with memorable encounters.

### 3. Stat Scaling Philosophy

Progression based on existing Warrens baseline:

- **Tier 1:** HP 15-60, Attack 5-15, Defence 1-6, Armour 0-5
- **Tier 2:** HP 60-120, Attack 15-30, Defence 6-12, Armour 5-15
- **Tier 3:** HP 120-250, Attack 30-60, Defence 12-25, Armour 15-30
- **Bosses:** HP 150-420, Attack 18-80, Defence 8-30, Armour 10-40

**Rationale:** Stats build from proven baseline (Gutterspawn 15 HP → The Collapsed One 150 HP). Tier ceilings overlap slightly to allow elite T1 creatures (Hollow Stalker) to bridge into T2 content. Boss stat ranges span multiple tiers to support varied difficulty.

### 4. Archetype Variety

Each zone environment includes mix of:

- **Berserker** — High damage, medium durability, low agility (Scrap Brute, Gamma Ghoul)
- **Skulker** — High agility, medium damage, low HP, hit-and-flee (Hollow Stalker, Tidal Lurker)
- **Guardian** — High durability, low agility, devastating attacks (Concrete Shambler, Demolisher Mech)
- **Swarm** — Numerous, weak individually, dangerous in groups (Gutterspawn, Rust Beetle)
- **Ranged** — Distance attacks, medium stats (Acid Spitter, Arc Welder)
- **Caster** — Abilities, telegraphed, medium HP (Memory Echo, Toxic Wraith)

**Rationale:** Archetype variety creates tactical diversity. Players must adapt combat approach per encounter. Zone rosters feel cohesive (all Flooded Depths creatures are water-themed) while maintaining mechanical variety.

### 5. Telegraphed Abilities

Elite creatures and bosses have telegraphed abilities:

- Wind-up time: 3-9 ticks (based on tier and damage)
- Telegraph text: Atmospheric description of attack charging
- Damage proportional to wind-up (longer wind-up = higher damage)
- Bosses have 2-4 abilities minimum

**Example:**
```typescript
{
  id: 'frenzied_leap',
  name: 'Frenzied Leap',
  damage: 10,
  windUpTicks: 4,
  telegraphText: 'The gutterspawn crouches low, muscles coiling beneath its bloated hide...'
}
```

**Rationale:** Telegraphs create counterplay opportunities. Players can react (flee, defensive stance, interrupt). Atmospheric telegraph text maintains MUD narrative feel while providing mechanical clarity.

### 6. Loot Table Design

Items follow tier system progression:

- **Scrap** (T1 common drops) — Vendor trash baseline, crafting materials
- **Common** (T1-2 useful gear) — Baseline equipment tier
- **Sturdy** (T1 rare, T2 common) — Upgrade tier
- **Refined** (T2 rare, T3 common) — Advanced gear
- **Masterwork** (boss drops) — Elite equipment
- **Anomalous** (rare T3 boss drops) — Top-tier unique items

**Rationale:** Loot tables support economy (vendor trash for currency) and progression (gear upgrades). Boss loot includes signature items (Sovereign's Crown, Masterwork Assembly Suit) that define builds. Each creature has thematic drops (Gutterspawn Fang, Reactor Core Fragment, Shadow Silk).

### 7. Passive/Ambient Creatures

Included 4 non-hostile creatures:

- **Scrap Pigeon** (Tier 0) — Urban scavengers, flee from threats
- **Rad Crow** (Tier 1) — Intelligent scavengers, follow groups
- **Mutant Fish School** (Tier 1) — Glowing fish in toxic water
- **Salvage Mule** (Tier 0) — Pack animals, wandering after owner's death

**Rationale:** Not everything should be hostile. Passive creatures add atmospheric texture, optional hunting targets, and environmental storytelling. Salvage Mules create emergent moments (finding abandoned pack animal with loot).

### 8. Boss Design Patterns

Each boss anchored to environment with signature mechanics:

- **Multi-phase abilities** — Bosses have 2-4 distinct attacks
- **Summon mechanics** — Call lesser creatures (Spillmother births mutations, Assembly Line builds robots)
- **Area effects** — Damage multiple targets (Nuclear Inferno, Rubble Avalanche)
- **Thematic ultimate** — Signature move defines boss identity (Abyssal Maw's Devouring Lunge, Endless Dark's Consume Light)

**Example Boss Structure:**
```
The Spillmother (Tier 3 Boss)
- Deluge of Poison (80 dmg, 8 tick wind-up)
- Birth Spawn (summons 3-4 creatures, 6 tick wind-up)
- Contamination Field (45 dmg area, 5 tick wind-up)
```

**Rationale:** Bosses are memorable setpiece encounters. Multi-ability design prevents repetitive combat. Summon mechanics create dynamic fights (players must manage adds while fighting boss). Area effects punish clustering, reward positioning.

### 9. Environmental Storytelling

Creatures designed to tell environment's story:

- **Industrial Graveyard** — Sparker Drones (damaged maintenance bots), Rust Shambler (workers who died in accidents), Assembly Line (factory achieved consciousness)
- **Desolate Wastes** — Gamma Ghoul (radiation victims), Atomic Colossus (walking reactor core), Fallout King (first to die in nuclear fire, first to rise)
- **Overgrown Ruins** — Moss Walker (deer overgrown with vegetation), Green Mother (births all plant life), Forest Titan (animated tree defending overgrown zones)

**Rationale:** Creatures answer implicit questions: What happened here? What survived? What evolved? Environmental consistency creates believable world. Players infer lore from creature design.

### 10. Room Descriptions

Each creature has atmospheric room description:

- 2-4 sentences
- Sets tone immediately
- Hints at threat level
- Uses active verbs and sensory details

**Examples:**
- "Gutterspawn scuttle through the debris, their wet breathing echoing off broken concrete."
- "The Sovereign of Dust hovers above broken ground, debris swirling in impossible patterns."
- "Something large moves through the overgrowth. You can't quite see it."

**Rationale:** Room descriptions are first impression. They establish atmosphere and threat before combat starts. Active descriptions (creature doing something) feel more immediate than static descriptions (creature standing there).

---

## Thematic Principles

1. **Post-apocalyptic, NOT fantasy** — Creatures reflect collapsed civilization (mutants, machines, toxic adaptations). No dragons, orcs, or goblins.

2. **Louisiana Gothic maintained** — Where applicable, creatures reference Gulf Coast setting (Silt Serpent, Mutant Hound, Swamp denizens). Design doc is setting-agnostic for reusable patterns but honors established world.

3. **Uncanny valley horror** — Best creatures are "almost human" (Memory Echo, Pale Wanderer, Fungal Shambler puppeting corpses). Distortion of familiar creates unease.

4. **Nature is indifferent** — Wildlife (Moss Walker, Bloom Beast, Wasteland Hound) isn't evil, just adapted. Ecosystem as resource, not malevolent force.

5. **Technology is dead or corrupted** — Machines (Sentry Bot, Shredder Unit, Nano Swarm) follow corrupted protocols or evolved beyond programming. No friendly robots.

---

## Implementation Handoff

### For Bruenor (Systems Implementation)

1. **Create TypeScript templates** — One file per creature in `packages/server/src/creatures/templates/`
2. **Update creature types** — Add new type constants to `packages/server/src/creatures/types.ts`
3. **Database migration** — Seed `creature_definitions` table with all creature entries
4. **Item definitions** — Create items for all loot table entries (100+ items)
5. **Zone integration** — Link creatures to appropriate zone environments via spawn rules
6. **Ability implementation** — Build telegraphed ability system if not already complete
7. **Boss encounters** — Create boss rooms in relevant zones

### For Future Content Design

- **Zone creation** — Designers can reference environment sections (e.g., "building Toxic Wastes zone, use Acid Spitter, Hazmat Horror, Mutation Titan")
- **Creature variants** — Design doc provides templates for variants (e.g., "Scorched Behemoth" can inspire "Frozen Behemoth" for arctic zones)
- **Boss patterns** — Reusable boss mechanics (summon adds, area effects, multi-phase abilities)

---

## Files Created

- `docs/bestiary-design.md` — Complete bestiary design document (3200+ lines)

---

## Files Referenced

- `packages/server/src/creatures/types.ts` — Creature type definitions
- `packages/server/src/creatures/templates/gutterspawn.ts` — Example T1 creature
- `packages/server/src/creatures/templates/the-collapsed-one.ts` — Example boss
- `GDD.md` — World lore, zone tiers, item tiers

---

## Estimated Implementation Time

2-3 weeks for:
- 100+ creature TypeScript templates
- 100+ item definitions
- Database migration
- Zone integration
- Boss encounter design

---

## Open Questions (None)

All design decisions finalized. Ready for implementation.

---

## Success Criteria

- [ ] All 103 creatures implemented in TypeScript templates
- [ ] All loot table items defined in database
- [ ] Creatures spawn in appropriate zone environments
- [ ] Telegraphed abilities functional in combat
- [ ] Boss encounters tested and balanced
- [ ] Stats validated against tier progression curves

---

**Next Action:** Bruenor implements creature templates and database entries.
