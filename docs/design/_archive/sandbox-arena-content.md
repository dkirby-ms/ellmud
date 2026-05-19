# Sandbox Arena Design — The Refuge Combat Testing Facilities

**Status:** Design Document  
**Author:** Laeral, Content Designer  
**Date:** 2026-04-07  
**Zone:** The Refuge (dev/debug hub)  
**Audience:** Game designers, developers, combat testers, QA

---

## 1. OVERVIEW

The Refuge currently serves as a designer hub with feature-room implementations (Stash, Expedition Board, Market, etc.) for testing faction stronghold mechanics. This design extends the Refuge with **dedicated sandbox combat facilities** — a cluster of rooms where designers and developers can safely test combat mechanics, creature behavior, item balance, and encounter design without affecting the live zone populations.

The sandbox system provides:
- **Controlled arena environment** with thematic descriptions fitting the Refuge's "designer pocket dimension" aesthetic
- **Pre-built test creature roster** covering multiple archetypes, tiers, and specializations
- **Configuration interface** for spawning creatures on-demand and adjusting encounter difficulty
- **Safe respawn guarantees** — deaths in the arena are consequence-free (no corpse loss, no debuffs)

---

## 2. PHYSICAL LAYOUT

### 2.1 Room Cluster Design

**Expansion:** Add **4 new rooms** to The Refuge connected via a new corridor from the Hearth.

```
                             [The Hearth] (existing)
                                   |
                                 north
                                   |
                           [The Proving Hall]
                                   |
                   +-------+-------+-------+
                   |       |       |       |
                 north   east    west   south
                   |       |       |       |
         [Arsenal] |       |       |       |
                   |       |       |       |
         [Control] +-------+       +-------+
         Sanctum         [Test Arena]
                              (2 exits)
```

### 2.2 Room Descriptions

#### **The Proving Hall** (connecting corridor)
- **Slug:** `proving-hall`
- **Type:** corridor
- **Description:**
  > "A narrow passage carved from pale stone, cool and echoing. Diagrams are scratched into the walls—combat formations, creature anatomies, tactical notations. The air hums with a faint harmonic frequency; the walls here seem to absorb violence. You hear the distant sound of metal striking stone."
- **Properties:** `{ enclosed, echoing }`
- **Exits:**
  - South → The Hearth
  - North → Test Arena
  - East → Armory
  - West → Control Sanctum

#### **Test Arena** (main combat space)
- **Slug:** `test-arena`
- **Type:** chamber (large open space)
- **Description:**
  > "A vast circular chamber with a packed-earth floor and walls of reinforced stone. Sand and sawdust cover deep gouges and old bloodstains. Chalk circles and numbered zones mark testing grounds. The ceiling rises into shadow, studded with chains and observation galleries. Whatever is built to withstand violence, this room was built for it—and has done so for an age."
- **Properties:** `{ large_space, arena, safe_container }`
- **Exits:**
  - South → The Proving Hall
  - (Secondary exit to second arena available for future expansion)

#### **Armory** (equipment staging room)
- **Slug:** `armory`
- **Type:** junction
- **Description:**
  > "Racks of weapons and armor line the walls—all of it non-lethal or training-grade. Wooden swords, padded helms, reinforced vests, and training spears lean against iron frames. A worn ledger sits on a bench, documenting who equipped what and when. The equipment is deliberately standardized, maintained, and tracked. This is a craftsperson's logbook, not a quartermaster's hoard."
- **Properties:** `{ armory, safe_container }`
- **Loot containers:**
  ```json
  [
    {
      "id": "training_gear_rack",
      "name": "Training Gear Rack",
      "contains": ["training_sword", "padded_vest", "reinforced_helm", "training_spear"],
      "max_takes": null
    }
  ]
  ```
- **Exits:**
  - West → The Proving Hall

#### **Control Sanctum** (configuration hub)
- **Slug:** `control-sanctum`
- **Type:** junction
- **Description:**
  > "A small stone chamber dominated by a long workbench scarred with notations, formulae, and creature sketches. Shelves hold reference materials: journals bound in worn leather, charts of creature stats, maps of the arena marked with tactical notations. A mirror on one wall reflects the arena beyond, allowing observation without exposure. The space feels lived-in—this is where every encounter is planned, every test is logged."
- **Properties:** `{ control_room, safe_container }`
- **NPCs:** (Placeholder for future interactive config system)
- **Exits:**
  - East → The Proving Hall

---

## 3. SANDBOX CREATURE ROSTER

### 3.1 Design Principles

The roster spans **5 combat archetypes** with **2-3 difficulty tiers each**, allowing designers to build encounters ranging from trivial (training) to challenging (boss-level) while maintaining variety.

**Naming Convention:** `Training {Archetype} (T{Tier})`
- Example: `Training Brute (T1)`, `Training Arcanist (T3)`
- All sandbox creatures have the `training_` slug prefix

**Tier Scale:**
- **T0:** Trivial (1-5 HP, minimal threat) — for ability testing
- **T1:** Novice difficulty (20-50 HP, baseline combat) — baseline testing
- **T2:** Intermediate (60-120 HP, multiple mechanics) — encounter design
- **T3:** Advanced (150-300 HP, boss-tier mechanics) — stress test

### 3.2 Creature Definitions

All sandbox creatures:
- Are **aggressive by default** (test combat engagement)
- Use **simplified loot tables** (minimal drops, training gear only)
- Exclude **locked rooms** and **boss-exclusive rooms** from `forbidden_rooms`
- Avoid **entry rooms** in preferred/forbidden to prevent spawn-camping

---

#### **MELEE TANK ARCHETYPE**

Slow, durable, high-armor opponents that soak damage.

##### Training Construct (T1 Melee Tank)
- **Slug:** `training_construct_t1`
- **Name:** Training Construct (T1)
- **Description:** "A golem-like figure of fused metal and stone, weighted and slow. Perfect for testing sustained melee damage."
- **Stats:** HP 50, Attack 8, Defence 2, Armour 5, Agility 1
- **Spawn:** min_count 1, max_count 2 (appears in pairs for testing group vs. single tank)
- **Behavior:** idle 300-600 ticks, flee_threshold 0.1 (very stubborn)
- **Loot:** `[{"itemId": "scrap_metal", "dropWeight": 100}]`
- **Room description:** "A ponderous training construct, reinforced plating dull with age."
- **Status:** published

##### Training Sentinel (T2 Melee Tank)
- **Slug:** `training_sentinel_t2`
- **Name:** Training Sentinel (T2)
- **Description:** "A heavily armored animated construct with layered plate and mechanical joints. Harder than T1 but still bound by combat rules."
- **Stats:** HP 120, Attack 12, Defence 4, Armour 8, Agility 2
- **Spawn:** min_count 1, max_count 1 (single, boss-like threat)
- **Behavior:** idle 400-800 ticks, flee_threshold 0.05
- **Loot:** `[{"itemId": "scrap_metal", "dropWeight": 80}, {"itemId": "reinforced_plating", "dropWeight": 20}]`
- **Room description:** "A sentinel of burnished metal and layered armour, waiting motionless."
- **Status:** published

##### Training Colossus (T3 Melee Tank)
- **Slug:** `training_colossus_t3`
- **Name:** Training Colossus (T3)
- **Description:** "An enormous, nigh-unbreakable titan of fused metal and reinforced stone, the most durable training opponent available. Extreme damage dealer and tank."
- **Stats:** HP 250, Attack 16, Defence 6, Armour 12, Agility 1
- **Spawn:** min_count 1, max_count 1 (solo only)
- **Behavior:** idle 500-1200 ticks, flee_threshold 0 (never flees)
- **Loot:** `[{"itemId": "reinforced_plating", "dropWeight": 100}]`
- **Room description:** "An monolithic training colossus towers here, each step an echo."
- **Status:** published

---

#### **RANGED ATTACKER ARCHETYPE**

Mobile, medium-durability opponents that keep distance and deal sustained ranged damage.

##### Training Archer (T1 Ranged)
- **Slug:** `training_archer_t1`
- **Name:** Training Archer (T1)
- **Description:** "A mobile humanoid figure that favors distance, firing blunt projectiles in training. Tests ranged avoidance and movement."
- **Stats:** HP 30, Attack 10, Defence 2, Armour 1, Agility 5
- **Spawn:** min_count 1, max_count 2
- **Behavior:** idle 200-500 ticks, flee_threshold 0.4 (kites away)
- **Loot:** `[{"itemId": "blunted_arrow", "dropWeight": 100}]`
- **Room description:** "A nimble training archer nocks a blunt arrow."
- **Status:** published

##### Training Sniper (T2 Ranged)
- **Slug:** `training_sniper_t2`
- **Name:** Training Sniper (T2)
- **Description:** "A precise, deadly range specialist who maintains careful distance and delivers high-damage shots. Tests kiting and threat management."
- **Stats:** HP 60, Attack 14, Defence 3, Armour 2, Agility 6
- **Spawn:** min_count 1, max_count 1
- **Behavior:** idle 300-700 ticks, flee_threshold 0.25 (keeps distance)
- **Loot:** `[{"itemId": "blunted_arrow", "dropWeight": 60}, {"itemId": "reinforced_bow", "dropWeight": 40}]`
- **Room description:** "A training sniper sights carefully, weapon steady."
- **Status:** published

##### Training Marksman (T3 Ranged)
- **Slug:** `training_marksman_t3`
- **Name:** Training Marksman (T3)
- **Description:** "The ultimate ranged test opponent—extreme damage, agility, and stamina. Tests whether melee characters can close distance under sustained fire."
- **Stats:** HP 100, Attack 18, Defence 4, Armour 2, Agility 8
- **Spawn:** min_count 1, max_count 1
- **Behavior:** idle 400-900 ticks, flee_threshold 0.15
- **Loot:** `[{"itemId": "reinforced_bow", "dropWeight": 100}]`
- **Room description:** "A masterwork training marksman, bow drawn, eyes narrowed."
- **Status:** published

---

#### **FAST DODGER ARCHETYPE**

Low durability, extremely high agility, fast-attacking opponents that test defensive mechanics.

##### Training Wisp (T1 Dodger)
- **Slug:** `training_wisp_t1`
- **Name:** Training Wisp (T1)
- **Description:** "A barely-corporeal training phantom, extremely evasive, weak in hits. Tests dodging and precision against mobile targets."
- **Stats:** HP 15, Attack 5, Defence 1, Armour 0, Agility 9
- **Spawn:** min_count 2, max_count 4 (intended as a swarm)
- **Behavior:** idle 150-350 ticks, flee_threshold 0.6 (highly reactive)
- **Loot:** `[]` (no drops)
- **Room description:** "A wisp-like training phantom flickers in and out of visibility."
- **Status:** published

##### Training Phantom (T2 Dodger)
- **Slug:** `training_phantom_t2`
- **Name:** Training Phantom (T2)
- **Description:** "A translucent combat phantom that strikes from unexpected angles with deadly precision. Tests evasion and reaction time."
- **Stats:** HP 40, Attack 11, Defence 2, Armour 0, Agility 8
- **Spawn:** min_count 1, max_count 2
- **Behavior:** idle 250-600 ticks, flee_threshold 0.35
- **Loot:** `[{"itemId": "wisp_essence", "dropWeight": 100}]`
- **Room description:** "A training phantom darts through the shadows, barely visible."
- **Status:** published

##### Training Shade (T3 Dodger)
- **Slug:** `training_shade_t3`
- **Name:** Training Shade (T3)
- **Description:** "A master-tier evasion specialist—nearly invisible, devastating attacks, near-impossible to hit. The ultimate avoidance test."
- **Stats:** HP 70, Attack 15, Defence 1, Armour 0, Agility 10
- **Spawn:** min_count 1, max_count 1
- **Behavior:** idle 300-800 ticks, flee_threshold 0.2
- **Loot:** `[{"itemId": "wisp_essence", "dropWeight": 100}]`
- **Room description:** "A training shade dissolves into shadow, then coalesces—barely a flicker in the air."
- **Status:** published

---

#### **AOE/HAZARD ARCHETYPE**

Medium-durability opponents that create area hazards and test distance/positioning.

##### Training Caster (T1 AoE)
- **Slug:** `training_caster_t1`
- **Name:** Training Caster (T1)
- **Description:** "A magical practitioner that channels simple area blasts. Tests movement and hazard avoidance."
- **Stats:** HP 35, Attack 7, Defence 1, Armour 0, Agility 4
- **Spawn:** min_count 1, max_count 2
- **Behavior:** idle 350-700 ticks, flee_threshold 0.3
- **Loot:** `[{"itemId": "spell_crystal_tier1", "dropWeight": 100}]`
- **Room description:** "A training caster gestures, fingers trailing light."
- **Status:** published

##### Training Warlock (T2 AoE)
- **Slug:** `training_warlock_t2`
- **Name:** Training Warlock (T2)
- **Description:** "A veteran spellcaster with powerful area effects and sustained magical output. Tests tactical positioning and group coordination."
- **Stats:** HP 70, Attack 13, Defence 3, Armour 1, Agility 5
- **Spawn:** min_count 1, max_count 1
- **Behavior:** idle 400-900 ticks, flee_threshold 0.25
- **Loot:** `[{"itemId": "spell_crystal_tier2", "dropWeight": 100}]`
- **Room description:** "A training warlock hums with arcane energy, hands glowing."
- **Status:** published

##### Training Sorcerer (T3 AoE)
- **Slug:** `training_sorcerer_t3`
- **Name:** Training Sorcerer (T3)
- **Description:** "The highest-tier spellcaster—overwhelming area damage, multiple simultaneous effects, devastating magical assault. Extreme positioning and coordination test."
- **Stats:** HP 120, Attack 17, Defence 5, Armour 2, Agility 6
- **Spawn:** min_count 1, max_count 1
- **Behavior:** idle 500-1200 ticks, flee_threshold 0.15
- **Loot:** `[{"itemId": "spell_crystal_tier3", "dropWeight": 100}]`
- **Room description:** "A training sorcerer channels devastating magic, the air warping around them."
- **Status:** published

---

#### **SWARM ARCHETYPE**

Very low durability, numerous spawns, tests crowd control and cleave mechanics.

##### Training Minion (T0 Swarm — Trivial)
- **Slug:** `training_minion_t0`
- **Name:** Training Minion (T0)
- **Description:** "Barely-sentient training construct. Designed to test cleave and AoE abilities without meaningful risk."
- **Stats:** HP 5, Attack 2, Defence 0, Armour 0, Agility 2
- **Spawn:** min_count 5, max_count 10 (heavy swarm)
- **Behavior:** idle 100-300 ticks, flee_threshold 0.9 (cowardly)
- **Loot:** `[]`
- **Room description:** "A diminutive training minion shuffles aimlessly."
- **Status:** published

##### Training Grunt (T1 Swarm)
- **Slug:** `training_grunt_t1`
- **Name:** Training Grunt (T1)
- **Description:** "A small but competent combatant. Spawns in groups to test crowd control and multi-target tactics."
- **Stats:** HP 20, Attack 6, Defence 1, Armour 1, Agility 3
- **Spawn:** min_count 3, max_count 6
- **Behavior:** idle 200-400 ticks, flee_threshold 0.5
- **Loot:** `[{"itemId": "scrap_metal", "dropWeight": 100}]`
- **Room description:** "A training grunt stands ready, weapon raised."
- **Status:** published

##### Training Brute (T2 Swarm)
- **Slug:** `training_brute_t2`
- **Name:** Training Brute (T2)
- **Description:** "Larger, tougher swarm members that hit harder. Tests sustained AoE and crowd control stamina."
- **Stats:** HP 50, Attack 10, Defence 2, Armour 2, Agility 2
- **Spawn:** min_count 2, max_count 4
- **Behavior:** idle 300-600 ticks, flee_threshold 0.3
- **Loot:** `[{"itemId": "scrap_metal", "dropWeight": 80}, {"itemId": "reinforced_plating", "dropWeight": 20}]`
- **Room description:** "A training brute snarls, knuckles scraping stone."
- **Status:** published

---

### 3.3 Test Creature Summary Table

| Archetype | Tier | Name | HP | Attack | Agility | Spawn | Purpose |
|-----------|------|------|----|----|---------|-------|---------|
| **Melee Tank** | T1 | Training Construct | 50 | 8 | 1 | 1-2 | Baseline armor/durability test |
| | T2 | Training Sentinel | 120 | 12 | 2 | 1 | Boss-tier single threat |
| | T3 | Training Colossus | 250 | 16 | 1 | 1 | Maximum tank stress test |
| **Ranged** | T1 | Training Archer | 30 | 10 | 5 | 1-2 | Distance management |
| | T2 | Training Sniper | 60 | 14 | 6 | 1 | High-damage kiting |
| | T3 | Training Marksman | 100 | 18 | 8 | 1 | Extreme ranged pressure |
| **Dodger** | T1 | Training Wisp | 15 | 5 | 9 | 2-4 | Precision/evasion swarm |
| | T2 | Training Phantom | 40 | 11 | 8 | 1-2 | Mid-tier evasion |
| | T3 | Training Shade | 70 | 15 | 10 | 1 | Maximum avoidance test |
| **AoE** | T1 | Training Caster | 35 | 7 | 4 | 1-2 | Basic positioning |
| | T2 | Training Warlock | 70 | 13 | 5 | 1 | Advanced area control |
| | T3 | Training Sorcerer | 120 | 17 | 6 | 1 | Extreme AoE assault |
| **Swarm** | T0 | Training Minion | 5 | 2 | 2 | 5-10 | Cleave/AoE trivial |
| | T1 | Training Grunt | 20 | 6 | 3 | 3-6 | CC/multi-target baseline |
| | T2 | Training Brute | 50 | 10 | 2 | 2-4 | Sustained group pressure |

---

## 4. ENCOUNTER BUILDING FRAMEWORK

### 4.1 Simple Encounter Templates

Designers can combine creatures from the roster to build standard test encounters:

**Single-Target (1v1):**
- `T1 Tank` — baseline melee training
- `T2 Ranged` — distance management training
- `T1 Dodger (×3)` — precision practice

**Small Group (1v3):**
- `T1 Tank + T1 Archer + T1 Caster` — mixed-threat baseline
- `T2 Tank (×2) + T1 Archer` — tank-heavy group test

**Boss-Level (1v1 extreme):**
- `T3 Tank` — ultimate durability test
- `T3 Sorcerer` — ultimate damage output test
- `T3 Shade` — ultimate avoidance test

**Crowd Control (1v8):**
- `Training Minion (×8)` — trivial cleave test
- `Training Grunt (×5)` — standard CC test
- `Training Brute (×3)` — sustained group pressure

### 4.2 Notes on Difficulty Scaling

The roster is deliberately **flat-leveled** — all creatures are training versions regardless of tier. T3 creatures do not trivialize T1 zones; they are designed specifically for sandbox testing at maximum difficulty. Encounter difficulty is determined by:
1. **Creature tier choice** (T0–T3)
2. **Spawn count and archetype mix**
3. **Arena room modifiers** (future: environmental hazards, terrain effects)

---

## 5. IMPLEMENTATION NOTES

### 5.1 Database Integration

All rooms and creatures are seeded via migration scripts:
- **Rooms:** Insert into `zone_rooms` with `zone_id` for `the-refuge`
- **Creatures:** Insert into `creature_definitions` with all training creatures marked `status = 'published'`
- **Exits:** Insert into `zone_exits` connecting Proving Hall to existing Hearth room

### 5.2 Safety Features

The Test Arena is flagged with `safe_container = true` to ensure:
- **No corpse drop** — Deaths in arena are consequence-free
- **No debuffs applied** — Failed encounters do not penalize the player
- **Respawn in arena** — Designer/tester returns to arena floor after death
- **Gear preservation** — Equipment is never lost in sandbox combat

### 5.3 Creature Respawn Logic

Sandbox creatures respect standard zone respawn mechanics:
- **Respawn interval:** Configurable per creature (default: 300-600 ticks)
- **Spawn count scaling:** `min_count` / `max_count` determine how many active creatures at any time
- **Idle behavior:** Training creatures use simplified idle patterns (no wandering between rooms)

### 5.4 Future Expansions

**Phase 2 — Interactive Control Sanctum:**
- Admin UI panel for spawning creatures on-demand
- Encounter preset templates (dropdown selections)
- Real-time stat adjustments for rapid testing
- Arena modifier toggles (hazards, terrain, darkness, etc.)

**Phase 3 — Extended Arenas:**
- Additional arena rooms for simultaneous multi-group testing
- Environmental hazard rooms (fire, water, toxins) for mechanic isolation
- Boss-design space with customizable arena properties

**Phase 4 — Spectator Gallery:**
- Observation rooms above arena with one-way visibility
- Replay system for encounter recording and analysis
- Statistical logging (damage dealt, healing absorbed, combat duration)

---

## 6. DESIGN RATIONALE

### Room Cluster Rationale

- **Proving Hall connector:** Deliberately thematic—names invoke training and proving grounds, fitting the Refuge's "designer workspace" feel. Positioned north of Hearth for natural exploration.
- **Test Arena:** Large chamber with historical scarring emphasizes this is a long-standing testing ground. Chalk circles reference D&D battle maps and modern tactical systems.
- **Armory:** Logbook detail grounds the space in verisimilitude (who used what, when?) and provides future design space for logging/metrics.
- **Control Sanctum:** "Mirror on the wall" observation mechanic explains how designers can watch combat without participating. Matches the control/configuration purpose.

### Creature Roster Rationale

- **5 core archetypes** represent the major combat roles: durability (tank), distance (ranged), evasion (dodger), crowd effects (AoE), and overwhelming numbers (swarm). All are present in the live zone populations and campaign content.
- **3-tier scaling** (T1/T2/T3, plus T0 trivial) allows progression from "baseline learning" to "stress test the system."
- **Training prefix** makes creatures clearly sandbox-only and prevents confusion with live zone creatures.
- **Simplified loot tables** ensure testing is focused on mechanics, not drops. Training gear items are placeholder-tier, not aspirational loot.
- **No unique or boss-tier mechanics** — sandbox creatures use core combat only. Specialized mechanics (summons, heal, disease) are tested in live zones with real creatures.

---

## 7. REFERENCES

- **GDD.md§2.2–2.3:** Zone lifecycle and room definitions
- **GDD.md§3:** Core gameplay loop emphasizing controlled, tested encounters
- **GDD.md§6:** Combat system overview (attack, defence, armour, agility mechanics)
- **Laeral History:** The Warrens design (creature archetype patterns), The Siltgate (tier scaling rationale)
- **Database Schema:** `creature_definitions` (type, stats, spawns, loot), `zone_rooms` (room properties), `zone_exits` (connections)

---

## 8. DELIVERABLES CHECKLIST

- [x] Room layout and descriptions (4 rooms)
- [x] Room-to-room exit map
- [x] 15 test creatures across 5 archetypes and 4 tiers
- [x] Creature stat balancing (HP, Attack, Defence, Armour, Agility)
- [x] Spawn count ranges for diverse encounter building
- [x] Loot table definitions (minimal, training-focused)
- [x] Encounter template examples (1v1, group, boss, swarm)
- [x] Implementation notes (DB integration, safety flags, respawn logic)
- [x] Design rationale and future expansion roadmap

---

**Status:** Ready for implementation by server migration scripts (002_seed_content, 003_seed_zones).
