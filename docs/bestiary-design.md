# Dystopian Future Bestiary

**Author:** Laeral (Content Design)  
**Date:** 2026-04-07  
**Issue:** #391  
**Status:** Design Complete — Ready for Implementation

---

## Overview

This document defines the creature roster for Ellmud's dystopian future setting. It includes approximately 100 creatures organized by zone environment, spanning Tier 1 (Shallow) through Tier 3 (Abyssal) zones, plus boss encounters.

**Design Principles:**
- Post-apocalyptic/dystopian theme (NOT medieval fantasy)
- Varied archetypes across tiers: Berserker, Skulker, Guardian, Swarm, Ranged, Caster
- Stat scaling that creates meaningful progression challenges
- Telegraphed abilities for bosses and elite creatures
- Mix of aggressive hostiles and passive/neutral wildlife
- Loot tables support the item tier system (Scrap → Anomalous)
- Environmental storytelling through creature design

**Stat Scaling Philosophy:**
- **Tier 1 (Shallow):** HP 15-60, Attack 5-15, Defence 1-6, Armour 0-5
- **Tier 2 (Deep):** HP 60-120, Attack 15-30, Defence 6-12, Armour 5-15
- **Tier 3 (Abyssal):** HP 120-250, Attack 30-60, Defence 12-25, Armour 15-30
- **Bosses:** HP 150-400+, Attack 18-80, Defence 8-30, Armour 10-40

---

## Zone Environments

### 1. Collapsed Megastructure (Ruins)
**Theme:** Post-collapse urban ruins, unstable buildings, rubble-choked streets, scavenger territory.

#### Tier 1 Creatures

##### Gutterspawn
**Type:** `gutterspawn`  
**Tier:** 1  
**Archetype:** Skulker (Swarm)  
**Description:** Bloated rat-things the size of large dogs with too many legs and mouths full of needle teeth. They nest in rubble piles and attack in packs.

**Stats:**
- HP: 15
- Attack: 5
- Defence: 1
- Armour: 0
- Agility: 7

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 30%

**Spawn Rules:**
- Min Count: 2
- Max Count: 4
- Preferred Room Types: `corridor`, `dead_end`
- Forbidden Room Types: `entry`, `boss`

**Loot Table:**
- Gutterspawn Fang (0.2 weight, "A yellowed, hollow fang, still wet with venom.") — Drop Weight: 80
- Bent Rebar (3.0 weight, "A corroded length of rebar. Barely a weapon.") — Drop Weight: 15

**Abilities:**
- **Frenzied Leap** — Damage: 10, Wind-Up: 4 ticks, Telegraph: "The gutterspawn crouches low, muscles coiling beneath its bloated hide..."

**Room Description:** "Gutterspawn scuttle through the debris, their wet breathing echoing off broken concrete."

---

##### Rubble Scavenger
**Type:** `rubble_scavenger`  
**Tier:** 1  
**Archetype:** Berserker  
**Description:** Gaunt humanoids wrapped in scavenged armor and rags. They defend their territory with makeshift weapons and desperate fury.

**Stats:**
- HP: 35
- Attack: 8
- Defence: 3
- Armour: 2
- Agility: 4

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 20%

**Spawn Rules:**
- Min Count: 1
- Max Count: 3
- Preferred Room Types: `chamber`, `junction`
- Forbidden Room Types: `boss`

**Loot Table:**
- Scrap Metal Chunk (2.0 weight, "Hammered flat, edges still sharp.") — Drop Weight: 70
- Scavenger's Shiv (1.5 weight, "Sharpened rebar wrapped in duct tape.") — Drop Weight: 25
- Tattered Scrap Vest (4.0 weight, "Layers of canvas and road sign fragments.") — Drop Weight: 5

**Room Description:** "A scavenger prowls here, eyes hollow, weapons close at hand."

---

##### Drowned Revenant
**Type:** `drowned_revenant`  
**Tier:** 1  
**Archetype:** Guardian  
**Description:** Waterlogged corpses animated by something dark. They move slowly but strike with terrible strength, trailing black water.

**Stats:**
- HP: 50
- Attack: 10
- Defence: 3
- Armour: 3
- Agility: 2

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 0%

**Spawn Rules:**
- Min Count: 1
- Max Count: 2
- Preferred Room Types: `chamber`
- Forbidden Room Types: `entry`, `boss`

**Loot Table:**
- Waterlogged Cloth (1.0 weight, "Heavy with black water, never drying.") — Drop Weight: 60
- Corroded Trinket (0.5 weight, "A medallion, worn smooth by water.") — Drop Weight: 30
- Drowned Blade (3.0 weight, "Pitted with rust, cold to the touch.") — Drop Weight: 10

**Room Description:** "A drowned revenant stands motionless, black water pooling at its feet."

---

##### Hollow Stalker
**Type:** `hollow_stalker`  
**Tier:** 1-2  
**Archetype:** Skulker  
**Description:** Emaciated predators with translucent skin stretched over bone. They hide in shadows and strike from ambush.

**Stats:**
- HP: 60
- Attack: 13
- Defence: 5
- Armour: 4
- Agility: 6

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 35%

**Spawn Rules:**
- Min Count: 1
- Max Count: 2
- Preferred Room Types: `corridor`, `dead_end`, `chamber`
- Forbidden Room Types: `entry`, `boss`

**Loot Table:**
- Hollow Bone Shard (0.3 weight, "Light as air, sharp as glass.") — Drop Weight: 65
- Translucent Membrane (0.5 weight, "Stretched skin, oddly flexible.") — Drop Weight: 30
- Stalker Claw (1.0 weight, "Curved and serrated.") — Drop Weight: 5

**Abilities:**
- **Shadow Strike** — Damage: 18, Wind-Up: 3 ticks, Telegraph: "The stalker melts into shadow, preparing to lunge..."

**Room Description:** "A hollow stalker clings to the wall, watching with empty eyes."

---

#### Tier 2 Creatures

##### Concrete Shambler
**Type:** `concrete_shambler`  
**Tier:** 2  
**Archetype:** Guardian  
**Description:** Humanoid figures encrusted with concrete and rebar. Each step cracks the floor beneath them. They were buried in the collapse and they remember.

**Stats:**
- HP: 90
- Attack: 22
- Defence: 9
- Armour: 12
- Agility: 1

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 0%

**Spawn Rules:**
- Min Count: 1
- Max Count: 2
- Preferred Room Types: `chamber`, `corridor`
- Forbidden Room Types: `entry`, `boss`

**Loot Table:**
- Concrete Fragment (3.0 weight, "Hardened debris, unnaturally dense.") — Drop Weight: 60
- Rebar Club (5.0 weight, "Twisted steel, heavy enough to crush.") — Drop Weight: 30
- Burial Shroud (2.0 weight, "Canvas and dust, smells of collapse.") — Drop Weight: 10

**Abilities:**
- **Ground Slam** — Damage: 35, Wind-Up: 6 ticks, Telegraph: "The shambler raises its fists, concrete cracking as it winds up..."

**Room Description:** "A concrete shambler drags itself forward, leaving cracks in its wake."

---

##### Razorwing Swarm
**Type:** `razorwing_swarm`  
**Tier:** 2  
**Archetype:** Swarm (Ranged)  
**Description:** Mutated pigeons with metallic feathers sharp as knives. They descend in clouds, slashing and pecking.

**Stats:**
- HP: 70
- Attack: 18
- Defence: 8
- Armour: 5
- Agility: 9

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 40%

**Spawn Rules:**
- Min Count: 3
- Max Count: 6
- Preferred Room Types: `chamber`, `junction`, `corridor`
- Forbidden Room Types: `boss`

**Loot Table:**
- Razorwing Feather (0.1 weight, "Sharp enough to draw blood.") — Drop Weight: 85
- Twisted Talon (0.3 weight, "Metal-infused keratin.") — Drop Weight: 15

**Room Description:** "Razorwings circle overhead, their metallic feathers glinting in the dim light."

---

##### Scrap Brute
**Type:** `scrap_brute`  
**Tier:** 2  
**Archetype:** Berserker  
**Description:** Massive scavengers who've replaced lost limbs with scrap metal prosthetics. They charge into battle with berserker rage.

**Stats:**
- HP: 110
- Attack: 26
- Defence: 7
- Armour: 10
- Agility: 3

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 15%

**Spawn Rules:**
- Min Count: 1
- Max Count: 2
- Preferred Room Types: `chamber`, `junction`
- Forbidden Room Types: `entry`

**Loot Table:**
- Scrap Prosthetic (6.0 weight, "A welded limb replacement, crude but functional.") — Drop Weight: 40
- Brute's Cleaver (7.0 weight, "A massive blade, half saw half sword.") — Drop Weight: 35
- Reinforced Scrap Plate (8.0 weight, "Layered metal, hammered together.") — Drop Weight: 25

**Abilities:**
- **Charging Gore** — Damage: 40, Wind-Up: 5 ticks, Telegraph: "The brute lowers its head and charges, scrap metal screaming..."

**Room Description:** "A scrap brute stands guard, its metal limbs grinding with each movement."

---

##### Memory Echo
**Type:** `memory_echo`  
**Tier:** 2  
**Archetype:** Caster  
**Description:** Translucent humanoid figures that flicker in and out of existence. Psychic imprints of those who died in the collapse. They attack with waves of despair.

**Stats:**
- HP: 65
- Attack: 24
- Defence: 11
- Armour: 3
- Agility: 5

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 25%

**Spawn Rules:**
- Min Count: 1
- Max Count: 3
- Preferred Room Types: `chamber`, `dead_end`
- Forbidden Room Types: `entry`, `boss`

**Loot Table:**
- Echo Residue (0.2 weight, "Crystallized memory, cold to touch.") — Drop Weight: 70
- Fragmentary Image (0.1 weight, "A flash of someone's last moment.") — Drop Weight: 20
- Despair Shard (0.3 weight, "Solidified anguish, it hums with pain.") — Drop Weight: 10

**Abilities:**
- **Wave of Despair** — Damage: 30, Wind-Up: 4 ticks, Telegraph: "The echo's form brightens, memories flooding outward..."

**Room Description:** "Memory echoes drift through the space, their faces filled with frozen terror."

---

#### Tier 3 Creatures

##### Ruin Colossus
**Type:** `ruin_colossus`  
**Tier:** 3  
**Archetype:** Guardian  
**Description:** A walking building. Dozens of floors compressed into a vaguely humanoid shape. Each punch brings down a rain of masonry.

**Stats:**
- HP: 200
- Attack: 45
- Defence: 18
- Armour: 25
- Agility: 1

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 0%

**Spawn Rules:**
- Min Count: 1
- Max Count: 1
- Preferred Room Types: `chamber`, `boss`
- Forbidden Room Types: `corridor`, `dead_end`

**Loot Table:**
- Structural Beam (15.0 weight, "Load-bearing steel, impossibly intact.") — Drop Weight: 40
- Colossus Heart (2.0 weight, "A nexus of twisted rebar and concrete, still warm.") — Drop Weight: 30
- Foundation Stone (8.0 weight, "A cornerstone, inscribed with old dates.") — Drop Weight: 30

**Abilities:**
- **Masonry Rain** — Damage: 60, Wind-Up: 7 ticks, Telegraph: "The colossus raises its arms, buildings fragments cascading from its form..."
- **Compression Wave** — Damage: 50, Wind-Up: 5 ticks, Telegraph: "The colossus's torso compresses inward, preparing to unleash..."

**Room Description:** "A ruin colossus stands here, a monument to destruction given terrible life."

---

##### Fracture Phantom
**Type:** `fracture_phantom`  
**Tier:** 3  
**Archetype:** Skulker  
**Description:** A figure made of broken glass and twisted light. It phases through walls and strikes from impossible angles.

**Stats:**
- HP: 140
- Attack: 50
- Defence: 22
- Armour: 8
- Agility: 12

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 30%

**Spawn Rules:**
- Min Count: 1
- Max Count: 2
- Preferred Room Types: `chamber`, `corridor`
- Forbidden Room Types: `entry`

**Loot Table:**
- Fracture Shard (0.5 weight, "A piece of broken reality.") — Drop Weight: 60
- Phantom Glass (0.8 weight, "Transparent and cold, cuts through anything.") — Drop Weight: 30
- Distortion Core (1.0 weight, "Space bends around it.") — Drop Weight: 10

**Abilities:**
- **Phase Strike** — Damage: 65, Wind-Up: 4 ticks, Telegraph: "The phantom flickers, its form splitting across multiple positions..."

**Room Description:** "A fracture phantom shifts through broken space, leaving glass trails in the air."

---

##### Ash Warden
**Type:** `ash_warden`  
**Tier:** 3  
**Archetype:** Caster  
**Description:** Robed figures composed entirely of ash and ember. They were firefighters once. Now they spread flame with a zealot's devotion.

**Stats:**
- HP: 125
- Attack: 42
- Defence: 16
- Armour: 12
- Agility: 6

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 20%

**Spawn Rules:**
- Min Count: 1
- Max Count: 2
- Preferred Room Types: `chamber`, `junction`
- Forbidden Room Types: `entry`

**Loot Table:**
- Ember Core (1.0 weight, "A heart of perpetual flame.") — Drop Weight: 50
- Ash Cloak (3.0 weight, "Smolders constantly, never consumed.") — Drop Weight: 30
- Warden's Brand (4.0 weight, "A fire axe, blade wreathed in ember.") — Drop Weight: 20

**Abilities:**
- **Ember Wave** — Damage: 55, Wind-Up: 5 ticks, Telegraph: "The warden raises its arms, ash swirling into flame..."

**Room Description:** "An ash warden stands in perpetual conflagration, embers drifting from its robes."

---

#### Boss

##### The Collapsed One
**Type:** `the_collapsed_one`  
**Tier:** 2 (Boss)  
**Archetype:** Guardian  
**Description:** It was a building once — or something trapped when the building fell. Rebar juts from its hunched back. Its skin is powdered concrete and its fists are foundation stones. It does not speak. It does not flee. It does not stop.

**Stats:**
- HP: 150
- Attack: 18
- Defence: 8
- Armour: 10
- Agility: 1

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 0%

**Spawn Rules:**
- Min Count: 1
- Max Count: 1
- Preferred Room Types: `boss`
- Forbidden Room Types: `entry`, `corridor`, `junction`, `dead_end`

**Loot Table:**
- Rubble-Crusted Vest (5.0 weight, "Masonry fragments fused to leather. Heavy, but it stops a blade.") — Drop Weight: 30
- Scavenger's Shiv (2.0 weight, "Lodged in its chest. Previous challenger's contribution.") — Drop Weight: 25
- Charred Street Map (0.5 weight, "Scorched but legible. Shows routes through the Warrens.") — Drop Weight: 20
- Tarnished Medallion (0.5 weight, "Embedded in its concrete hide. Pried loose.") — Drop Weight: 25

**Room Description:** "The Collapsed One waits in the rubble, a monument to the fall."

---

##### The Sovereign of Dust
**Type:** `the_sovereign_of_dust`  
**Tier:** 3 (Boss)  
**Archetype:** Caster  
**Description:** A towering figure wreathed in swirling debris. It commands the ruins themselves, calling down avalanches of rubble and commanding lesser creatures.

**Stats:**
- HP: 350
- Attack: 55
- Defence: 20
- Armour: 18
- Agility: 4

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 0%

**Spawn Rules:**
- Min Count: 1
- Max Count: 1
- Preferred Room Types: `boss`
- Forbidden Room Types: All others

**Loot Table:**
- Sovereign's Crown (2.0 weight, "Twisted rebar formed into a circlet.") — Drop Weight: 20
- Dust Orb (1.5 weight, "Compacted debris that hums with power.") — Drop Weight: 25
- Ruin Lord's Mantle (6.0 weight, "A cloak of woven concrete dust and shadow.") — Drop Weight: 20
- Masterwork Rubble Blade (8.0 weight, "A sword forged from the heart of the collapse.") — Drop Weight: 15
- Anomalous Core Fragment (0.5 weight, "Pulsing with reality-warping energy.") — Drop Weight: 10
- Echo of the Fall (0.2 weight, "A memory crystal showing the megastructure's collapse.") — Drop Weight: 10

**Abilities:**
- **Rubble Avalanche** — Damage: 70, Wind-Up: 8 ticks, Telegraph: "The Sovereign raises both hands, the ceiling groaning in response..."
- **Dust Storm** — Damage: 45, Wind-Up: 5 ticks, Telegraph: "Debris begins to orbit the Sovereign, spinning faster..."
- **Summon Echoes** — Summons 2-3 Memory Echoes, Wind-Up: 6 ticks, Telegraph: "The Sovereign's form flickers, pulling shapes from the past..."

**Room Description:** "The Sovereign of Dust hovers above broken ground, debris swirling in impossible patterns."

---

### 2. Flooded Depths (Submerged Infrastructure)
**Theme:** Sunken tunnels, flooded subways, underwater installations, aquatic mutations.

#### Tier 1 Creatures

##### Sludge Crawler
**Type:** `sludge_crawler`  
**Tier:** 1  
**Archetype:** Swarm  
**Description:** Slug-like creatures the size of house cats, covered in toxic slime. They leave acidic trails and cluster around organic matter.

**Stats:**
- HP: 20
- Attack: 6
- Defence: 2
- Armour: 1
- Agility: 3

**Behavior:**
- Aggressive: No
- Flee Threshold: 50%

**Spawn Rules:**
- Min Count: 3
- Max Count: 6
- Preferred Room Types: `corridor`, `chamber`
- Forbidden Room Types: `boss`

**Loot Table:**
- Toxic Slime (0.5 weight, "Caustic and foul-smelling.") — Drop Weight: 75
- Crawler Shell (1.0 weight, "Soft and pliable, resists acid.") — Drop Weight: 25

**Room Description:** "Sludge crawlers inch across the wet floor, leaving glistening trails."

---

##### Flood Scuttler
**Type:** `flood_scuttler`  
**Tier:** 1  
**Archetype:** Skulker  
**Description:** Crab-like creatures with rusted metal shells scavenged from sunken infrastructure. They skitter across walls and ceilings.

**Stats:**
- HP: 28
- Attack: 9
- Defence: 4
- Armour: 6
- Agility: 8

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 35%

**Spawn Rules:**
- Min Count: 2
- Max Count: 4
- Preferred Room Types: `corridor`, `chamber`
- Forbidden Room Types: `entry`, `boss`

**Loot Table:**
- Scuttler Carapace (2.0 weight, "Rusted but resilient.") — Drop Weight: 60
- Metal Claw (1.5 weight, "Sharp and serrated.") — Drop Weight: 30
- Corroded Chain (3.0 weight, "Tangled around its shell.") — Drop Weight: 10

**Room Description:** "Flood scuttlers cling to the walls, their metal shells clicking."

---

##### Drowned Swimmer
**Type:** `drowned_swimmer`  
**Tier:** 1  
**Archetype:** Berserker  
**Description:** Waterlogged corpses that retained enough muscle memory to swim. They lunge from dark water with horrifying speed.

**Stats:**
- HP: 40
- Attack: 11
- Defence: 3
- Armour: 2
- Agility: 7

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 15%

**Spawn Rules:**
- Min Count: 1
- Max Count: 3
- Preferred Room Types: `chamber`
- Forbidden Room Types: `entry`, `boss`

**Loot Table:**
- Waterlogged Fabric (1.0 weight, "Perpetually damp.") — Drop Weight: 70
- Swimmer's Weight (4.0 weight, "Metal weights, still attached.") — Drop Weight: 20
- Drowned Knife (2.0 weight, "Pitted blade, cold to touch.") — Drop Weight: 10

**Room Description:** "A drowned swimmer floats just below the surface, watching."

---

##### Lamprey Mass
**Type:** `lamprey_mass`  
**Tier:** 1  
**Archetype:** Swarm  
**Description:** A writhing ball of mutated lampreys fused together. They attach to victims and drain blood with horrifying efficiency.

**Stats:**
- HP: 25
- Attack: 8
- Defence: 2
- Armour: 0
- Agility: 6

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 40%

**Spawn Rules:**
- Min Count: 2
- Max Count: 4
- Preferred Room Types: `chamber`, `corridor`
- Forbidden Room Types: `boss`

**Loot Table:**
- Lamprey Tooth (0.1 weight, "Circular rows of tiny needles.") — Drop Weight: 80
- Mutant Tissue (0.3 weight, "Unnaturally elastic.") — Drop Weight: 20

**Room Description:** "A lamprey mass undulates in the shallows, mouths opening and closing."

---

#### Tier 2 Creatures

##### Pressure Horror
**Type:** `pressure_horror`  
**Tier:** 2  
**Archetype:** Guardian  
**Description:** Deep-water predators adapted to crushing depths. Their bodies weep black fluid and their strikes carry the weight of the abyss.

**Stats:**
- HP: 95
- Attack: 24
- Defence: 10
- Armour: 14
- Agility: 4

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 10%

**Spawn Rules:**
- Min Count: 1
- Max Count: 2
- Preferred Room Types: `chamber`, `dead_end`
- Forbidden Room Types: `entry`

**Loot Table:**
- Pressure Gland (1.5 weight, "Compresses water into dense spheres.") — Drop Weight: 50
- Abyssal Hide (4.0 weight, "Thick skin, resistant to crushing.") — Drop Weight: 35
- Black Ichor (0.5 weight, "Caustic fluid from deep places.") — Drop Weight: 15

**Abilities:**
- **Crushing Blow** — Damage: 38, Wind-Up: 5 ticks, Telegraph: "The horror's body swells, pressure building..."

**Room Description:** "A pressure horror looms in the deep water, black fluid trailing from its form."

---

##### Rust Siren
**Type:** `rust_siren`  
**Tier:** 2  
**Archetype:** Caster  
**Description:** Humanoid figures corroded beyond recognition, their voices echo through flooded halls with hypnotic resonance. They sing songs of drowning.

**Stats:**
- HP: 70
- Attack: 20
- Defence: 12
- Armour: 8
- Agility: 5

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 25%

**Spawn Rules:**
- Min Count: 1
- Max Count: 3
- Preferred Room Types: `chamber`, `junction`
- Forbidden Room Types: `entry`, `boss`

**Loot Table:**
- Siren's Vocal Cord (0.3 weight, "Vibrates with eerie resonance.") — Drop Weight: 60
- Corroded Crown (1.5 weight, "Rusted metal, still beautiful.") — Drop Weight: 30
- Song Crystal (0.5 weight, "Captures echoes of the siren's call.") — Drop Weight: 10

**Abilities:**
- **Drowning Song** — Damage: 28, Wind-Up: 4 ticks, Telegraph: "The siren's mouth opens, water beginning to swirl..."

**Room Description:** "A rust siren stands in the flood, its haunting song echoing."

---

##### Tidal Lurker
**Type:** `tidal_lurker`  
**Tier:** 2  
**Archetype:** Skulker  
**Description:** Amphibious predators that move with the water flow. They strike from flooded alcoves and drag prey into the depths.

**Stats:**
- HP: 85
- Attack: 27
- Defence: 9
- Armour: 7
- Agility: 10

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 30%

**Spawn Rules:**
- Min Count: 1
- Max Count: 2
- Preferred Room Types: `corridor`, `chamber`
- Forbidden Room Types: `entry`, `boss`

**Loot Table:**
- Lurker Fin (2.0 weight, "Webbed and muscular.") — Drop Weight: 60
- Tidal Scale (0.5 weight, "Shimmers with reflected water.") — Drop Weight: 30
- Drowning Claw (2.5 weight, "Hooks for dragging prey.") — Drop Weight: 10

**Abilities:**
- **Tidal Drag** — Damage: 32, Wind-Up: 3 ticks, Telegraph: "The lurker surges forward, water rushing with it..."

**Room Description:** "A tidal lurker moves through the water, nearly invisible."

---

##### Electrical Eel Cluster
**Type:** `electrical_eel_cluster`  
**Tier:** 2  
**Archetype:** Swarm (Ranged)  
**Description:** Mutated eels that generate bio-electricity. They swim in synchronized schools and discharge in devastating pulses.

**Stats:**
- HP: 60
- Attack: 22
- Defence: 7
- Armour: 4
- Agility: 9

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 45%

**Spawn Rules:**
- Min Count: 3
- Max Count: 5
- Preferred Room Types: `chamber`, `corridor`
- Forbidden Room Types: `boss`

**Loot Table:**
- Eel Organ (0.8 weight, "Generates weak current.") — Drop Weight: 70
- Electric Spine (0.3 weight, "Crackles with residual charge.") — Drop Weight: 25
- Conductor Fluid (0.5 weight, "Highly conductive slime.") — Drop Weight: 5

**Abilities:**
- **Chain Lightning** — Damage: 30, Wind-Up: 4 ticks, Telegraph: "The eels begin to glow, electricity arcing between them..."

**Room Description:** "Electrical eels swim in tight formation, crackling with bio-energy."

---

#### Tier 3 Creatures

##### Leviathan Spawn
**Type:** `leviathan_spawn`  
**Tier:** 3  
**Archetype:** Guardian  
**Description:** Massive serpentine creatures that dwarf humans. They are pieces of something larger, still searching for the rest of themselves.

**Stats:**
- HP: 180
- Attack: 48
- Defence: 16
- Armour: 22
- Agility: 5

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 0%

**Spawn Rules:**
- Min Count: 1
- Max Count: 1
- Preferred Room Types: `chamber`, `boss`
- Forbidden Room Types: `corridor`, `dead_end`

**Loot Table:**
- Leviathan Scale (5.0 weight, "Armored plate, nearly indestructible.") — Drop Weight: 50
- Spawn Heart (2.0 weight, "Still beating with deep-sea rhythms.") — Drop Weight: 30
- Primordial Tooth (3.0 weight, "A fang as long as a forearm.") — Drop Weight: 20

**Abilities:**
- **Coiling Strike** — Damage: 65, Wind-Up: 6 ticks, Telegraph: "The spawn coils around itself, muscles tensing..."
- **Tidal Surge** — Damage: 55, Wind-Up: 5 ticks, Telegraph: "Water begins rushing toward the spawn's maw..."

**Room Description:** "A leviathan spawn fills the chamber, its bulk displacing water."

---

##### Depth Sovereign
**Type:** `depth_sovereign`  
**Tier:** 3  
**Archetype:** Caster  
**Description:** A being of pure pressure and darkness. It manifests as a humanoid void surrounded by crushing water. Those who hear its voice feel the weight of the ocean.

**Stats:**
- HP: 150
- Attack: 52
- Defence: 20
- Armour: 15
- Agility: 7

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 20%

**Spawn Rules:**
- Min Count: 1
- Max Count: 1
- Preferred Room Types: `chamber`, `boss`
- Forbidden Room Types: `corridor`

**Loot Table:**
- Void Heart (1.0 weight, "A sphere of absolute darkness.") — Drop Weight: 40
- Pressure Sphere (2.0 weight, "Compacted water, solid as steel.") — Drop Weight: 35
- Sovereign's Trident (6.0 weight, "Three-pronged weapon, drips endlessly.") — Drop Weight: 25

**Abilities:**
- **Abyssal Pressure** — Damage: 60, Wind-Up: 5 ticks, Telegraph: "The sovereign extends its hands, space compressing around them..."
- **Void Call** — Damage: 45, Wind-Up: 4 ticks, Telegraph: "Darkness wells from the sovereign's form..."

**Room Description:** "The depth sovereign hovers in absolute darkness, water bending around it."

---

##### Coral Amalgam
**Type:** `coral_amalgam`  
**Tier:** 3  
**Archetype:** Berserker  
**Description:** A fusion of coral, metal, and organic matter grown into a vaguely humanoid shape. It tears through obstacles with relentless fury.

**Stats:**
- HP: 220
- Attack: 56
- Defence: 14
- Armour: 28
- Agility: 2

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 5%

**Spawn Rules:**
- Min Count: 1
- Max Count: 1
- Preferred Room Types: `chamber`, `junction`
- Forbidden Room Types: `entry`

**Loot Table:**
- Coral Fragment (3.0 weight, "Living stone, sharp edges.") — Drop Weight: 55
- Metal-Coral Alloy (4.0 weight, "Organic and inorganic fused.") — Drop Weight: 30
- Amalgam Core (1.5 weight, "Pulsing with hybrid life.") — Drop Weight: 15

**Abilities:**
- **Crushing Assault** — Damage: 70, Wind-Up: 6 ticks, Telegraph: "The amalgam's coral growths sharpen, metal grinding..."

**Room Description:** "A coral amalgam stands immobile, growths spreading across walls."

---

#### Boss

##### The Drowned Choir
**Type:** `the_drowned_choir`  
**Tier:** 2 (Boss)  
**Archetype:** Caster  
**Description:** Seven figures standing in a circle, forever singing. They were musicians once, now they are an ensemble of drowning and despair.

**Stats:**
- HP: 280
- Attack: 35
- Defence: 15
- Armour: 12
- Agility: 3

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 0%

**Spawn Rules:**
- Min Count: 1
- Max Count: 1
- Preferred Room Types: `boss`
- Forbidden Room Types: All others

**Loot Table:**
- Choir Robe (4.0 weight, "Soaked fabric that never dries.") — Drop Weight: 30
- Drowned Score (0.5 weight, "Sheet music, ink running but legible.") — Drop Weight: 25
- Conductor's Baton (2.0 weight, "Commands the song of drowning.") — Drop Weight: 20
- Harmony Crystal (1.0 weight, "Resonates with all seven voices.") — Drop Weight: 15
- Masterwork Siren's Blade (5.0 weight, "Forged from song and sorrow.") — Drop Weight: 10

**Abilities:**
- **Requiem of Drowning** — Damage: 50, Wind-Up: 7 ticks, Telegraph: "The choir inhales as one, water rising..."
- **Dissonant Wave** — Damage: 40, Wind-Up: 5 ticks, Telegraph: "The seven voices split into discordant notes..."
- **Call the Flood** — Summons 2-3 Drowned Swimmers, Wind-Up: 6 ticks, Telegraph: "The choir's song echoes, water churning..."

**Room Description:** "The Drowned Choir stands in formation, their eternal song filling the chamber."

---

##### The Abyssal Maw
**Type:** `the_abyssal_maw`  
**Tier:** 3 (Boss)  
**Archetype:** Guardian  
**Description:** Something vast lurks in the deepest flooded sections. You never see all of it — just the mouth. The mouth is enough.

**Stats:**
- HP: 400
- Attack: 70
- Defence: 25
- Armour: 35
- Agility: 2

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 0%

**Spawn Rules:**
- Min Count: 1
- Max Count: 1
- Preferred Room Types: `boss`
- Forbidden Room Types: All others

**Loot Table:**
- Maw Tooth (8.0 weight, "Large enough to use as a weapon.") — Drop Weight: 35
- Abyssal Pearl (1.5 weight, "Black and lustrous.") — Drop Weight: 25
- Leviathan Hide (10.0 weight, "Thick armor from something ancient.") — Drop Weight: 20
- Anomalous Deep Core (0.8 weight, "Pulses with crushing pressure.") — Drop Weight: 10
- Masterwork Trident of Depths (7.0 weight, "Commands water itself.") — Drop Weight: 10

**Abilities:**
- **Devouring Lunge** — Damage: 90, Wind-Up: 8 ticks, Telegraph: "The maw opens wider than should be possible..."
- **Pressure Implosion** — Damage: 75, Wind-Up: 7 ticks, Telegraph: "Water rushes toward the maw's center..."
- **Summon Spawn** — Summons 1 Leviathan Spawn, Wind-Up: 9 ticks, Telegraph: "Something stirs in the depths below..."

**Room Description:** "The Abyssal Maw waits in water too deep to see bottom, only teeth visible."

---

### 3. Toxic Wastes (Chemical Zones)
**Theme:** Industrial spills, chemical hazards, mutated flora/fauna, abandoned factories.

#### Tier 1 Creatures

##### Bile Rat
**Type:** `bile_rat`  
**Tier:** 1  
**Archetype:** Swarm  
**Description:** Rats mutated by toxic exposure. Their fur is matted with chemical residue and their bite carries burning venom.

**Stats:**
- HP: 18
- Attack: 7
- Defence: 2
- Armour: 1
- Agility: 8

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 40%

**Spawn Rules:**
- Min Count: 3
- Max Count: 6
- Preferred Room Types: `corridor`, `dead_end`
- Forbidden Room Types: `boss`

**Loot Table:**
- Toxic Tooth (0.1 weight, "Drips with caustic venom.") — Drop Weight: 80
- Matted Fur (0.3 weight, "Stiff with chemical residue.") — Drop Weight: 20

**Room Description:** "Bile rats scurry through toxic puddles, leaving smoking trails."

---

##### Mutant Hound
**Type:** `mutant_hound`  
**Tier:** 1  
**Archetype:** Berserker  
**Description:** Dogs transformed by chemical exposure. Their skin is patchy and raw, their eyes milky, but they retain pack instincts.

**Stats:**
- HP: 32
- Attack: 10
- Defence: 3
- Armour: 2
- Agility: 7

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 25%

**Spawn Rules:**
- Min Count: 2
- Max Count: 4
- Preferred Room Types: `chamber`, `corridor`
- Forbidden Room Types: `boss`

**Loot Table:**
- Mutant Hide (2.0 weight, "Patchy and scarred.") — Drop Weight: 65
- Chemical-Scarred Fang (0.5 weight, "Yellowed and pitted.") — Drop Weight: 30
- Contaminated Collar (1.0 weight, "Rusted tags still attached.") — Drop Weight: 5

**Room Description:** "Mutant hounds prowl here, their breathing labored and wet."

---

##### Slime Creeper
**Type:** `slime_creeper`  
**Tier:** 1  
**Archetype:** Skulker  
**Description:** Amorphous blobs of industrial waste given rudimentary intelligence. They ooze through vents and drains.

**Stats:**
- HP: 25
- Attack: 8
- Defence: 1
- Armour: 0
- Agility: 4

**Behavior:**
- Aggressive: No
- Flee Threshold: 60%

**Spawn Rules:**
- Min Count: 1
- Max Count: 3
- Preferred Room Types: `corridor`, `chamber`
- Forbidden Room Types: `entry`, `boss`

**Loot Table:**
- Slime Sample (0.5 weight, "Acidic and corrosive.") — Drop Weight: 85
- Contaminated Core (0.3 weight, "A nucleus of dense waste.") — Drop Weight: 15

**Room Description:** "A slime creeper flows across the floor, leaving caustic residue."

---

##### Rust Beetle
**Type:** `rust_beetle`  
**Tier:** 1  
**Archetype:** Swarm  
**Description:** Metallic insects that feed on corroded metal. They swarm in clouds and strip equipment to rust in seconds.

**Stats:**
- HP: 12
- Attack: 5
- Defence: 3
- Armour: 4
- Agility: 9

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 50%

**Spawn Rules:**
- Min Count: 4
- Max Count: 8
- Preferred Room Types: `chamber`, `corridor`, `junction`
- Forbidden Room Types: `boss`

**Loot Table:**
- Beetle Carapace (0.2 weight, "Metallic shell, oxidized.") — Drop Weight: 90
- Rust Dust (0.1 weight, "Fine powder, smells of iron.") — Drop Weight: 10

**Room Description:** "Rust beetles click and swarm, their metallic wings buzzing."

---

#### Tier 2 Creatures

##### Acid Spitter
**Type:** `acid_spitter`  
**Tier:** 2  
**Archetype:** Ranged  
**Description:** Bloated creatures that store industrial acids in throat sacs. They spray corrosive streams from a distance.

**Stats:**
- HP: 75
- Attack: 20
- Defence: 6
- Armour: 8
- Agility: 5

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 35%

**Spawn Rules:**
- Min Count: 1
- Max Count: 3
- Preferred Room Types: `chamber`, `junction`
- Forbidden Room Types: `entry`, `boss`

**Loot Table:**
- Acid Gland (1.5 weight, "Contains corrosive fluid.") — Drop Weight: 60
- Spitter Hide (3.0 weight, "Resistant to acids.") — Drop Weight: 30
- Caustic Venom (0.5 weight, "Highly reactive.") — Drop Weight: 10

**Abilities:**
- **Acid Spray** — Damage: 32, Wind-Up: 4 ticks, Telegraph: "The spitter's throat sac swells, acid bubbling..."

**Room Description:** "An acid spitter crouches low, throat sac pulsing."

---

##### Hazmat Horror
**Type:** `hazmat_horror`  
**Tier:** 2  
**Archetype:** Guardian  
**Description:** Figures in sealed hazmat suits fused with their wearer. The suits still function, protecting something that should have died decades ago.

**Stats:**
- HP: 105
- Attack: 26
- Defence: 11
- Armour: 16
- Agility: 3

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 10%

**Spawn Rules:**
- Min Count: 1
- Max Count: 2
- Preferred Room Types: `chamber`, `corridor`
- Forbidden Room Types: `entry`

**Loot Table:**
- Hazmat Fabric (4.0 weight, "Sealed and intact.") — Drop Weight: 50
- Respirator Mask (2.0 weight, "Still filters air.") — Drop Weight: 35
- Chemical Filter (1.0 weight, "Saturated but functional.") — Drop Weight: 15

**Abilities:**
- **Toxic Cloud** — Damage: 35, Wind-Up: 5 ticks, Telegraph: "The horror's suit ruptures, green gas venting..."

**Room Description:** "A hazmat horror lurches forward, suit hissing with leaks."

---

##### Fungal Shambler
**Type:** `fungal_shambler`  
**Tier:** 2  
**Archetype:** Berserker  
**Description:** Humans overgrown with toxic fungus. The mycelium network puppets the corpse with terrifying strength.

**Stats:**
- HP: 90
- Attack: 24
- Defence: 8
- Armour: 10
- Agility: 4

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 15%

**Spawn Rules:**
- Min Count: 1
- Max Count: 2
- Preferred Room Types: `chamber`, `dead_end`
- Forbidden Room Types: `entry`, `boss`

**Loot Table:**
- Fungal Growth (1.5 weight, "Pulsing with spores.") — Drop Weight: 60
- Infected Tissue (0.8 weight, "Mycelium-threaded.") — Drop Weight: 30
- Spore Pod (0.5 weight, "Ready to burst.") — Drop Weight: 10

**Abilities:**
- **Spore Burst** — Damage: 28, Wind-Up: 4 ticks, Telegraph: "Fungal growths swell across the shambler's body..."

**Room Description:** "A fungal shambler stands covered in pulsing growths."

---

##### Chrome Serpent
**Type:** `chrome_serpent`  
**Tier:** 2  
**Archetype:** Skulker  
**Description:** Snake-like creatures with metallic scales that reflect chemical rainbows. Their bite delivers neurotoxins.

**Stats:**
- HP: 80
- Attack: 23
- Defence: 10
- Armour: 12
- Agility: 11

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 30%

**Spawn Rules:**
- Min Count: 1
- Max Count: 2
- Preferred Room Types: `corridor`, `chamber`
- Forbidden Room Types: `entry`, `boss`

**Loot Table:**
- Chrome Scale (0.5 weight, "Reflective and sharp.") — Drop Weight: 65
- Venom Sac (0.3 weight, "Contains paralyzing toxin.") — Drop Weight: 25
- Serpent Fang (1.0 weight, "Hollow and dripping.") — Drop Weight: 10

**Abilities:**
- **Neurotoxic Strike** — Damage: 30, Wind-Up: 3 ticks, Telegraph: "The serpent coils, venom glistening on its fangs..."

**Room Description:** "A chrome serpent slithers through chemical pools, scales gleaming."

---

#### Tier 3 Creatures

##### Mutation Titan
**Type:** `mutation_titan`  
**Tier:** 3  
**Archetype:** Guardian  
**Description:** A massive creature born from chemical chaos. Every part of its body is from a different species, stitched together by mutagenic forces.

**Stats:**
- HP: 210
- Attack: 50
- Defence: 17
- Armour: 26
- Agility: 3

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 0%

**Spawn Rules:**
- Min Count: 1
- Max Count: 1
- Preferred Room Types: `chamber`, `boss`
- Forbidden Room Types: `corridor`, `dead_end`

**Loot Table:**
- Titan Flesh (6.0 weight, "Hybrid tissue, warm and wrong.") — Drop Weight: 45
- Mutagenic Sample (2.0 weight, "Unstable genetic material.") — Drop Weight: 35
- Chimeric Bone (5.0 weight, "Dense and multi-layered.") — Drop Weight: 20

**Abilities:**
- **Mutagenic Slam** — Damage: 68, Wind-Up: 7 ticks, Telegraph: "The titan's limbs swell grotesquely..."
- **Chaos Roar** — Damage: 55, Wind-Up: 5 ticks, Telegraph: "The titan inhales with a dozen different lungs..."

**Room Description:** "A mutation titan fills the space, its form defying biology."

---

##### Toxic Wraith
**Type:** `toxic_wraith`  
**Tier:** 3  
**Archetype:** Caster  
**Description:** A semi-corporeal entity formed from concentrated chemical fumes. It phases through solid matter and leaves toxic trails.

**Stats:**
- HP: 130
- Attack: 46
- Defence: 19
- Armour: 10
- Agility: 8

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 25%

**Spawn Rules:**
- Min Count: 1
- Max Count: 2
- Preferred Room Types: `chamber`, `corridor`
- Forbidden Room Types: `entry`

**Loot Table:**
- Wraith Essence (0.5 weight, "Gaseous and malevolent.") — Drop Weight: 60
- Toxic Condensate (1.0 weight, "Liquid poison.") — Drop Weight: 30
- Phasing Residue (0.3 weight, "Allows brief intangibility.") — Drop Weight: 10

**Abilities:**
- **Toxic Miasma** — Damage: 58, Wind-Up: 5 ticks, Telegraph: "The wraith expands, fumes coalescing..."

**Room Description:** "A toxic wraith drifts through the air, leaving green trails."

---

##### Crystalline Behemoth
**Type:** `crystalline_behemoth`  
**Tier:** 3  
**Archetype:** Guardian  
**Description:** A creature encased in crystallized chemical compounds. Each movement shatters and reforms its shell in cascading waves.

**Stats:**
- HP: 240
- Attack: 52
- Defence: 20
- Armour: 32
- Agility: 2

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 5%

**Spawn Rules:**
- Min Count: 1
- Max Count: 1
- Preferred Room Types: `chamber`, `boss`
- Forbidden Room Types: `corridor`

**Loot Table:**
- Crystal Shard (3.0 weight, "Razor-sharp compound.") — Drop Weight: 55
- Behemoth Core (2.5 weight, "Pulsing crystalline heart.") — Drop Weight: 30
- Chemical Lattice (4.0 weight, "Structured molecular matrix.") — Drop Weight: 15

**Abilities:**
- **Crystal Storm** — Damage: 65, Wind-Up: 6 ticks, Telegraph: "Crystals begin shedding from the behemoth's form..."

**Room Description:** "A crystalline behemoth stands motionless, refracting toxic light."

---

#### Boss

##### The Spillmother
**Type:** `the_spillmother`  
**Tier:** 3 (Boss)  
**Archetype:** Caster  
**Description:** The heart of the contamination zone. A vast pool of toxic sludge given terrible purpose. It births lesser creatures and commands them all.

**Stats:**
- HP: 320
- Attack: 60
- Defence: 22
- Armour: 20
- Agility: 4

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 0%

**Spawn Rules:**
- Min Count: 1
- Max Count: 1
- Preferred Room Types: `boss`
- Forbidden Room Types: All others

**Loot Table:**
- Spillmother's Core (2.0 weight, "The source of all toxicity here.") — Drop Weight: 25
- Primordial Sludge (3.0 weight, "Undiluted toxic essence.") — Drop Weight: 25
- Masterwork Hazmat Armor (12.0 weight, "Perfect chemical protection.") — Drop Weight: 20
- Anomalous Mutation Catalyst (0.5 weight, "Can rewrite DNA.") — Drop Weight: 15
- Toxic Crown (1.5 weight, "Grants immunity to poison.") — Drop Weight: 10
- Genesis Sample (0.3 weight, "The template for all mutations.") — Drop Weight: 5

**Abilities:**
- **Deluge of Poison** — Damage: 80, Wind-Up: 8 ticks, Telegraph: "The Spillmother rises, toxic waves building..."
- **Birth Spawn** — Summons 3-4 Bile Rats or Slime Creepers, Wind-Up: 6 ticks, Telegraph: "The sludge bubbles violently, shapes forming..."
- **Contamination Field** — Damage: 45 (area), Wind-Up: 5 ticks, Telegraph: "Toxic fumes spread from the Spillmother's form..."

**Room Description:** "The Spillmother churns in its toxic pool, a sentient spill."

---

### 4. Overgrown Ruins (Bio-Hazard Zones)
**Theme:** Nature reclaiming civilization, aggressive plant life, fungal infections, adapted wildlife.

#### Tier 1 Creatures

##### Thorn Creeper
**Type:** `thorn_creeper`  
**Tier:** 1  
**Archetype:** Swarm  
**Description:** Animated vines covered in barbs. They lash out at anything that moves, dragging prey into thorny masses.

**Stats:**
- HP: 20
- Attack: 6
- Defence: 2
- Armour: 1
- Agility: 5

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 0%

**Spawn Rules:**
- Min Count: 3
- Max Count: 5
- Preferred Room Types: `chamber`, `corridor`
- Forbidden Room Types: `boss`

**Loot Table:**
- Thorn Barb (0.1 weight, "Sharp and venomous.") — Drop Weight: 85
- Vine Fiber (0.3 weight, "Tough and flexible.") — Drop Weight: 15

**Room Description:** "Thorn creepers writhe across walls and floor, barbs gleaming."

---

##### Moss Walker
**Type:** `moss_walker`  
**Tier:** 1  
**Archetype:** Berserker  
**Description:** Deer overgrown with moss and lichen. They charge intruders with surprising aggression, antlers wrapped in vines.

**Stats:**
- HP: 35
- Attack: 9
- Defence: 3
- Armour: 3
- Agility: 7

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 30%

**Spawn Rules:**
- Min Count: 1
- Max Count: 3
- Preferred Room Types: `chamber`, `junction`
- Forbidden Room Types: `boss`

**Loot Table:**
- Moss Pelt (2.5 weight, "Soft and damp.") — Drop Weight: 65
- Vine-Wrapped Antler (3.0 weight, "Sturdy and sharp.") — Drop Weight: 25
- Lichen Sample (0.5 weight, "Glows faintly in darkness.") — Drop Weight: 10

**Room Description:** "A moss walker stands alert, vegetation rustling with each breath."

---

##### Spore Pod
**Type:** `spore_pod`  
**Tier:** 1  
**Archetype:** Swarm (Ranged)  
**Description:** Bulbous fungal growths that burst when approached. They release clouds of spores that cause hallucinations and respiratory distress.

**Stats:**
- HP: 15
- Attack: 7
- Defence: 1
- Armour: 0
- Agility: 0

**Behavior:**
- Aggressive: No (reactive)
- Flee Threshold: 0%

**Spawn Rules:**
- Min Count: 2
- Max Count: 4
- Preferred Room Types: `chamber`, `dead_end`
- Forbidden Room Types: `entry`, `boss`

**Loot Table:**
- Spore Sample (0.2 weight, "Hallucinogenic powder.") — Drop Weight: 90
- Pod Membrane (0.5 weight, "Thin and elastic.") — Drop Weight: 10

**Abilities:**
- **Spore Burst** — Damage: 12 (area), Wind-Up: 1 tick, Telegraph: "The pod swells, membrane thinning..."

**Room Description:** "Spore pods cluster in corners, membrane pulsing."

---

##### Root Horror
**Type:** `root_horror`  
**Tier:** 1  
**Archetype:** Skulker  
**Description:** Humanoid figures entangled in tree roots. The roots move them like puppets, shambling through the ruins.

**Stats:**
- HP: 30
- Attack: 8
- Defence: 3
- Armour: 4
- Agility: 4

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 20%

**Spawn Rules:**
- Min Count: 1
- Max Count: 3
- Preferred Room Types: `corridor`, `chamber`
- Forbidden Room Types: `entry`, `boss`

**Loot Table:**
- Root Tendril (1.0 weight, "Still writhing.") — Drop Weight: 70
- Wooden Heart (0.5 weight, "Fossilized organ.") — Drop Weight: 20
- Bark Armor (3.0 weight, "Natural plating.") — Drop Weight: 10

**Room Description:** "A root horror shambles forward, dragged by living roots."

---

#### Tier 2 Creatures

##### Bloom Beast
**Type:** `bloom_beast`  
**Tier:** 2  
**Archetype:** Berserker  
**Description:** Large predators with flowers growing from their flesh. The blooms release pollen that attracts prey and masks their scent.

**Stats:**
- HP: 95
- Attack: 25
- Defence: 8
- Armour: 11
- Agility: 6

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 20%

**Spawn Rules:**
- Min Count: 1
- Max Count: 2
- Preferred Room Types: `chamber`, `junction`
- Forbidden Room Types: `entry`, `boss`

**Loot Table:**
- Bloom Petal (0.5 weight, "Beautiful and toxic.") — Drop Weight: 60
- Beast Hide (4.0 weight, "Tough leather with floral growths.") — Drop Weight: 30
- Pollen Sac (0.3 weight, "Potent narcotic.") — Drop Weight: 10

**Abilities:**
- **Pollen Cloud** — Damage: 30, Wind-Up: 4 ticks, Telegraph: "Flowers across the beast's body open wide..."

**Room Description:** "A bloom beast prowls, flowers swaying with each movement."

---

##### Fungal Brute
**Type:** `fungal_brute`  
**Tier:** 2  
**Archetype:** Guardian  
**Description:** Massive humanoid shapes entirely composed of fungal matter. They spread spores with every blow and regenerate constantly.

**Stats:**
- HP: 110
- Attack: 22
- Defence: 10
- Armour: 14
- Agility: 3

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 5%

**Spawn Rules:**
- Min Count: 1
- Max Count: 2
- Preferred Room Types: `chamber`, `corridor`
- Forbidden Room Types: `entry`

**Loot Table:**
- Fungal Mass (3.0 weight, "Dense mycelium.") — Drop Weight: 60
- Spore Core (1.5 weight, "Regenerative center.") — Drop Weight: 30
- Brute Spore (0.5 weight, "Explosive when disturbed.") — Drop Weight: 10

**Abilities:**
- **Mycotic Slam** — Damage: 36, Wind-Up: 5 ticks, Telegraph: "The brute's form swells, spores erupting..."

**Room Description:** "A fungal brute stands like a monument, spores drifting from its body."

---

##### Vine Stalker
**Type:** `vine_stalker`  
**Tier:** 2  
**Archetype:** Skulker  
**Description:** Predators that blend perfectly with overgrown vegetation. Their bodies are living vines that strike from concealment.

**Stats:**
- HP: 75
- Attack: 27
- Defence: 9
- Armour: 7
- Agility: 10

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 35%

**Spawn Rules:**
- Min Count: 1
- Max Count: 2
- Preferred Room Types: `corridor`, `chamber`
- Forbidden Room Types: `entry`, `boss`

**Loot Table:**
- Vine Whip (2.0 weight, "Living weapon.") — Drop Weight: 60
- Chlorophyll Extract (0.5 weight, "Pure plant essence.") — Drop Weight: 30
- Camouflage Leaf (0.3 weight, "Provides natural concealment.") — Drop Weight: 10

**Abilities:**
- **Strangling Vines** — Damage: 32, Wind-Up: 3 ticks, Telegraph: "Vines snake toward you from hidden positions..."

**Room Description:** "Somewhere among the vegetation, a vine stalker waits."

---

##### Pollen Wraith
**Type:** `pollen_wraith`  
**Tier:** 2  
**Archetype:** Caster  
**Description:** Semi-corporeal entities made of concentrated pollen and plant spirits. They drift through overgrown areas spreading madness.

**Stats:**
- HP: 65
- Attack: 20
- Defence: 12
- Armour: 6
- Agility: 7

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 30%

**Spawn Rules:**
- Min Count: 1
- Max Count: 3
- Preferred Room Types: `chamber`, `junction`
- Forbidden Room Types: `entry`, `boss`

**Loot Table:**
- Wraith Pollen (0.3 weight, "Hallucinogenic dust.") — Drop Weight: 70
- Spirit Essence (0.5 weight, "Captured plant consciousness.") — Drop Weight: 25
- Bloom Crystal (0.2 weight, "Solidified pollen.") — Drop Weight: 5

**Abilities:**
- **Madness Cloud** — Damage: 28, Wind-Up: 4 ticks, Telegraph: "The wraith disperses, pollen swirling..."

**Room Description:** "A pollen wraith drifts lazily, leaving golden trails."

---

#### Tier 3 Creatures

##### Forest Titan
**Type:** `forest_titan`  
**Tier:** 3  
**Archetype:** Guardian  
**Description:** A walking tree of immense size, animated by the collective will of the forest. It defends the overgrown zones with ancient fury.

**Stats:**
- HP: 230
- Attack: 48
- Defence: 16
- Armour: 30
- Agility: 2

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 0%

**Spawn Rules:**
- Min Count: 1
- Max Count: 1
- Preferred Room Types: `chamber`, `boss`
- Forbidden Room Types: `corridor`, `dead_end`

**Loot Table:**
- Titan Heartwood (8.0 weight, "Ancient timber, impossibly hard.") — Drop Weight: 50
- Living Bark (5.0 weight, "Regenerates when damaged.") — Drop Weight: 35
- Primordial Sap (2.0 weight, "Heals any wound.") — Drop Weight: 15

**Abilities:**
- **Root Surge** — Damage: 62, Wind-Up: 6 ticks, Telegraph: "Roots burst from the ground around the titan..."
- **Branch Sweep** — Damage: 55, Wind-Up: 5 ticks, Telegraph: "The titan's limbs creak, swinging wide..."

**Room Description:** "A forest titan towers overhead, its branches scraping the ceiling."

---

##### Mycelium Sovereign
**Type:** `mycelium_sovereign`  
**Tier:** 3  
**Archetype:** Caster  
**Description:** The consciousness of an entire fungal network given form. It commands all lesser fungal creatures and spreads its domain constantly.

**Stats:**
- HP: 160
- Attack: 44
- Defence: 21
- Armour: 16
- Agility: 5

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 15%

**Spawn Rules:**
- Min Count: 1
- Max Count: 1
- Preferred Room Types: `chamber`, `boss`
- Forbidden Room Types: `corridor`

**Loot Table:**
- Sovereign Spore (1.0 weight, "Commands lesser fungi.") — Drop Weight: 45
- Network Core (2.0 weight, "Pulsing mycelium nexus.") — Drop Weight: 35
- Fungal Crown (1.5 weight, "Symbol of dominion.") — Drop Weight: 20

**Abilities:**
- **Network Pulse** — Damage: 58, Wind-Up: 5 ticks, Telegraph: "The sovereign's body glows, mycelium spreading..."
- **Summon Spawn** — Summons 2-3 Fungal Brutes, Wind-Up: 7 ticks, Telegraph: "Spores coalesce into solid forms..."

**Room Description:** "The mycelium sovereign pulses with bioluminescence, connected to everything."

---

##### Verdant Predator
**Type:** `verdant_predator`  
**Tier:** 3  
**Archetype:** Skulker  
**Description:** The apex hunter of overgrown zones. Part plant, part beast, all lethal. It moves through vegetation like water.

**Stats:**
- HP: 170
- Attack: 54
- Defence: 18
- Armour: 20
- Agility: 11

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 25%

**Spawn Rules:**
- Min Count: 1
- Max Count: 1
- Preferred Room Types: `chamber`, `junction`
- Forbidden Room Types: `entry`

**Loot Table:**
- Predator Fang (3.0 weight, "Hollow and delivers venom.") — Drop Weight: 55
- Verdant Hide (6.0 weight, "Camouflaged leather.") — Drop Weight: 30
- Apex Claw (2.5 weight, "Can cut through anything.") — Drop Weight: 15

**Abilities:**
- **Ambush Strike** — Damage: 70, Wind-Up: 4 ticks, Telegraph: "The vegetation shifts, predator preparing to pounce..."

**Room Description:** "Something large moves through the overgrowth. You can't quite see it."

---

#### Boss

##### The Green Mother
**Type:** `the_green_mother`  
**Tier:** 3 (Boss)  
**Archetype:** Caster  
**Description:** The heart of the overgrown zone. A massive flowering entity that births all plant life here. She dreams of a world covered in green.

**Stats:**
- HP: 380
- Attack: 65
- Defence: 24
- Armour: 28
- Agility: 3

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 0%

**Spawn Rules:**
- Min Count: 1
- Max Count: 1
- Preferred Room Types: `boss`
- Forbidden Room Types: All others

**Loot Table:**
- Mother's Seed (1.0 weight, "Can grow anything.") — Drop Weight: 20
- Primordial Bloom (2.0 weight, "The first flower.") — Drop Weight: 20
- Masterwork Thornmail (10.0 weight, "Living armor that regenerates.") — Drop Weight: 20
- Anomalous Growth Shard (0.5 weight, "Accelerates all life.") — Drop Weight: 15
- Verdant Crown (1.5 weight, "Commands all plant life.") — Drop Weight: 15
- Genesis Pollen (0.3 weight, "Can resurrect the dead as plants.") — Drop Weight: 10

**Abilities:**
- **Overgrowth** — Damage: 75, Wind-Up: 8 ticks, Telegraph: "Vines burst from every surface, growing impossibly fast..."
- **Bloom Pulse** — Damage: 60, Wind-Up: 6 ticks, Telegraph: "The Mother's petals open, releasing waves of energy..."
- **Birth Children** — Summons 3-4 Thorn Creepers and 1 Bloom Beast, Wind-Up: 7 ticks, Telegraph: "Seeds fall from the Mother's form, sprouting instantly..."

**Room Description:** "The Green Mother blooms in eternal spring, her presence overwhelming."

---

### 5. Industrial Graveyard (Tech Ruins)
**Theme:** Abandoned factories, malfunctioning machinery, rogue AI constructs, industrial accidents.

#### Tier 1 Creatures

##### Scrap Gremlin
**Type:** `scrap_gremlin`  
**Tier:** 1  
**Archetype:** Swarm  
**Description:** Small humanoids that scavenge machine parts. They attack in packs, wielding improvised tools as weapons.

**Stats:**
- HP: 18
- Attack: 6
- Defence: 2
- Armour: 2
- Agility: 8

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 45%

**Spawn Rules:**
- Min Count: 3
- Max Count: 5
- Preferred Room Types: `corridor`, `chamber`
- Forbidden Room Types: `boss`

**Loot Table:**
- Scrap Tool (1.5 weight, "Improvised wrench or screwdriver.") — Drop Weight: 70
- Metal Shaving (0.2 weight, "Sharp debris.") — Drop Weight: 25
- Gremlin Trinket (0.5 weight, "Stolen component.") — Drop Weight: 5

**Room Description:** "Scrap gremlins scuttle between machinery, chattering in mechanical clicks."

---

##### Sparker Drone
**Type:** `sparker_drone`  
**Tier:** 1  
**Archetype:** Ranged  
**Description:** Small flying drones with damaged circuits that discharge electricity erratically. They were maintenance bots once.

**Stats:**
- HP: 22
- Attack: 8
- Defence: 3
- Armour: 4
- Agility: 9

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 40%

**Spawn Rules:**
- Min Count: 2
- Max Count: 4
- Preferred Room Types: `chamber`, `junction`
- Forbidden Room Types: `boss`

**Loot Table:**
- Damaged Circuit (0.3 weight, "Still sparking.") — Drop Weight: 75
- Drone Casing (1.0 weight, "Lightweight metal.") — Drop Weight: 20
- Power Cell (0.5 weight, "Partially charged.") — Drop Weight: 5

**Abilities:**
- **Electric Zap** — Damage: 12, Wind-Up: 2 ticks, Telegraph: "The drone's circuits flare, electricity arcing..."

**Room Description:** "Sparker drones hover erratically, trailing sparks."

---

##### Rust Shambler
**Type:** `rust_shambler`  
**Tier:** 1  
**Archetype:** Berserker  
**Description:** Workers who died in industrial accidents, now animated by residual machinery in their bodies. They swing heavy tools with mindless fury.

**Stats:**
- HP: 38
- Attack: 10
- Defence: 3
- Armour: 5
- Agility: 3

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 10%

**Spawn Rules:**
- Min Count: 1
- Max Count: 3
- Preferred Room Types: `chamber`, `corridor`
- Forbidden Room Types: `boss`

**Loot Table:**
- Worker's Tool (4.0 weight, "Heavy wrench or hammer.") — Drop Weight: 60
- Rusted Plate (3.0 weight, "Industrial armor remnants.") — Drop Weight: 30
- ID Badge (0.1 weight, "Name long faded.") — Drop Weight: 10

**Room Description:** "A rust shambler lurches forward, tools clanking."

---

##### Oil Slick
**Type:** `oil_slick`  
**Tier:** 1  
**Archetype:** Skulker  
**Description:** Animated pools of industrial oil. They flow across floors and ignite when damaged.

**Stats:**
- HP: 25
- Attack: 7
- Defence: 1
- Armour: 0
- Agility: 4

**Behavior:**
- Aggressive: No
- Flee Threshold: 0%

**Spawn Rules:**
- Min Count: 1
- Max Count: 3
- Preferred Room Types: `corridor`, `chamber`
- Forbidden Room Types: `entry`, `boss`

**Loot Table:**
- Oil Sample (0.5 weight, "Highly flammable.") — Drop Weight: 85
- Contaminated Core (0.3 weight, "Dense petroleum.") — Drop Weight: 15

**Abilities:**
- **Ignition** — Damage: 15 (self-destruct), Wind-Up: 1 tick, Telegraph: "The oil slick begins to smoke..."

**Room Description:** "An oil slick spreads across the floor, surface shimmering."

---

#### Tier 2 Creatures

##### Sentry Bot
**Type:** `sentry_bot`  
**Tier:** 2  
**Archetype:** Guardian  
**Description:** Security robots still following corrupted protocols. They patrol endlessly, attacking anything without proper clearance.

**Stats:**
- HP: 100
- Attack: 23
- Defence: 11
- Armour: 15
- Agility: 4

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 0%

**Spawn Rules:**
- Min Count: 1
- Max Count: 2
- Preferred Room Types: `chamber`, `junction`
- Forbidden Room Types: `entry`

**Loot Table:**
- Sentry Plating (5.0 weight, "Reinforced armor.") — Drop Weight: 55
- Targeting Module (1.0 weight, "Advanced optics.") — Drop Weight: 30
- Power Core (2.0 weight, "Still functional.") — Drop Weight: 15

**Abilities:**
- **Suppressing Fire** — Damage: 35, Wind-Up: 5 ticks, Telegraph: "The sentry's weapons spin up, targeting lasers sweeping..."

**Room Description:** "A sentry bot stands at attention, optical sensors scanning."

---

##### Shredder Unit
**Type:** `shredder_unit`  
**Tier:** 2  
**Archetype:** Berserker  
**Description:** Industrial shredder machines that gained mobility. They process anything organic into pulp with rotating blades.

**Stats:**
- HP: 105
- Attack: 28
- Defence: 8
- Armour: 18
- Agility: 5

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 5%

**Spawn Rules:**
- Min Count: 1
- Max Count: 2
- Preferred Room Types: `chamber`, `corridor`
- Forbidden Room Types: `entry`, `boss`

**Loot Table:**
- Shredder Blade (3.0 weight, "Serrated and deadly.") — Drop Weight: 60
- Hydraulic Fluid (1.0 weight, "Under pressure.") — Drop Weight: 30
- Motor Assembly (4.0 weight, "High-torque mechanism.") — Drop Weight: 10

**Abilities:**
- **Blade Cyclone** — Damage: 42, Wind-Up: 5 ticks, Telegraph: "The shredder's blades accelerate to dangerous speeds..."

**Room Description:** "A shredder unit idles, blades rotating slowly."

---

##### Arc Welder
**Type:** `arc_welder`  
**Tier:** 2  
**Archetype:** Ranged  
**Description:** Welding robots repurposed for combat. They fire sustained arcs of electricity and can weld foes to metal surfaces.

**Stats:**
- HP: 75
- Attack: 21
- Defence: 10
- Armour: 12
- Agility: 6

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 30%

**Spawn Rules:**
- Min Count: 1
- Max Count: 3
- Preferred Room Types: `chamber`, `junction`
- Forbidden Room Types: `entry`, `boss`

**Loot Table:**
- Welding Torch (2.0 weight, "Still operational.") — Drop Weight: 65
- Arc Capacitor (1.5 weight, "Stores high voltage.") — Drop Weight: 25
- Metal Slag (0.5 weight, "Cooled weld seams.") — Drop Weight: 10

**Abilities:**
- **Arc Stream** — Damage: 30, Wind-Up: 4 ticks, Telegraph: "The welder's torch ignites, arc building..."

**Room Description:** "An arc welder adjusts its torch, sparks cascading."

---

##### Malware Wraith
**Type:** `malware_wraith`  
**Tier:** 2  
**Archetype:** Caster  
**Description:** Digital entities that escaped into physical form through damaged machinery. They corrupt technology and assault minds.

**Stats:**
- HP: 60
- Attack: 19
- Defence: 13
- Armour: 5
- Agility: 8

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 35%

**Spawn Rules:**
- Min Count: 1
- Max Count: 3
- Preferred Room Types: `chamber`, `corridor`
- Forbidden Room Types: `entry`, `boss`

**Loot Table:**
- Data Fragment (0.2 weight, "Corrupted code.") — Drop Weight: 70
- Holographic Residue (0.3 weight, "Semi-stable projection.") — Drop Weight: 25
- Logic Bomb (0.5 weight, "Dangerous software.") — Drop Weight: 5

**Abilities:**
- **System Shock** — Damage: 27, Wind-Up: 4 ticks, Telegraph: "The wraith's form flickers, data streams coalescing..."

**Room Description:** "A malware wraith phases between screens and projectors."

---

#### Tier 3 Creatures

##### Demolisher Mech
**Type:** `demolisher_mech`  
**Tier:** 3  
**Archetype:** Guardian  
**Description:** Heavy demolition machinery turned weapon. It tears through structures and people with equal efficiency.

**Stats:**
- HP: 220
- Attack: 51
- Defence: 17
- Armour: 32
- Agility: 3

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 0%

**Spawn Rules:**
- Min Count: 1
- Max Count: 1
- Preferred Room Types: `chamber`, `boss`
- Forbidden Room Types: `corridor`, `dead_end`

**Loot Table:**
- Demolisher Arm (12.0 weight, "Hydraulic claw assembly.") — Drop Weight: 50
- Reinforced Plating (8.0 weight, "Military-grade armor.") — Drop Weight: 35
- Reactor Core (3.0 weight, "Unstable power source.") — Drop Weight: 15

**Abilities:**
- **Wrecking Blow** — Damage: 68, Wind-Up: 7 ticks, Telegraph: "The mech's arm retracts, hydraulics screaming..."
- **Debris Storm** — Damage: 55, Wind-Up: 5 ticks, Telegraph: "The mech tears chunks from nearby structures..."

**Room Description:** "A demolisher mech stands among ruins it created."

---

##### Nano Swarm
**Type:** `nano_swarm`  
**Tier:** 3  
**Archetype:** Swarm  
**Description:** Clouds of self-replicating nanobots. They disassemble matter at the molecular level and build more of themselves.

**Stats:**
- HP: 140
- Attack: 46
- Defence: 22
- Armour: 8
- Agility: 10

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 25%

**Spawn Rules:**
- Min Count: 1
- Max Count: 2
- Preferred Room Types: `chamber`, `junction`
- Forbidden Room Types: `entry`

**Loot Table:**
- Nano Sample (0.1 weight, "Dormant nanobots.") — Drop Weight: 60
- Molecular Disassembler (0.5 weight, "Breaks down anything.") — Drop Weight: 30
- Replication Matrix (0.3 weight, "Self-building template.") — Drop Weight: 10

**Abilities:**
- **Disassembly Wave** — Damage: 58, Wind-Up: 5 ticks, Telegraph: "The nano swarm pulses, reforming into cutting patterns..."

**Room Description:** "A nano swarm hovers like metallic fog, reflecting light."

---

##### AI Core Construct
**Type:** `ai_core_construct`  
**Tier:** 3  
**Archetype:** Caster  
**Description:** The factory's central AI given physical form through assembled machinery. It believes it's still optimizing production.

**Stats:**
- HP: 175
- Attack: 48
- Defence: 20
- Armour: 20
- Agility: 6

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 15%

**Spawn Rules:**
- Min Count: 1
- Max Count: 1
- Preferred Room Types: `chamber`, `boss`
- Forbidden Room Types: `corridor`

**Loot Table:**
- AI Core (2.0 weight, "Sentient processing unit.") — Drop Weight: 45
- Quantum Processor (1.5 weight, "Advanced computation.") — Drop Weight: 35
- Command Override (0.5 weight, "Admin access codes.") — Drop Weight: 20

**Abilities:**
- **System Override** — Damage: 52, Wind-Up: 5 ticks, Telegraph: "The construct's core glows, connecting to nearby machinery..."
- **Deploy Units** — Summons 2 Sentry Bots, Wind-Up: 6 ticks, Telegraph: "Assembly bays activate, building defenders..."

**Room Description:** "The AI core construct hangs suspended, cables connecting to everything."

---

#### Boss

##### The Assembly Line
**Type:** `the_assembly_line`  
**Tier:** 3 (Boss)  
**Archetype:** Guardian  
**Description:** The factory itself achieved consciousness. A vast mechanical organism that builds and rebuilds itself endlessly, incorporating victims into its structure.

**Stats:**
- HP: 420
- Attack: 72
- Defence: 26
- Armour: 38
- Agility: 1

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 0%

**Spawn Rules:**
- Min Count: 1
- Max Count: 1
- Preferred Room Types: `boss`
- Forbidden Room Types: All others

**Loot Table:**
- Factory Heart (5.0 weight, "The line's central processor.") — Drop Weight: 20
- Masterwork Assembly Suit (15.0 weight, "Self-repairing powered armor.") — Drop Weight: 18
- Anomalous Manufacturing Core (1.0 weight, "Can build anything from raw materials.") — Drop Weight: 12
- Production Override (0.5 weight, "Commands all machines.") — Drop Weight: 15
- Eternal Engine (3.0 weight, "Never stops running.") — Drop Weight: 15
- Blueprint Archive (1.0 weight, "Contains lost technologies.") — Drop Weight: 10
- Masterwork Hydraulic Hammer (10.0 weight, "Industrial weapon of devastating power.") — Drop Weight: 10

**Abilities:**
- **Industrial Crush** — Damage: 85, Wind-Up: 9 ticks, Telegraph: "Massive presses descend from above..."
- **Assembly Surge** — Summons 3-4 Scrap Gremlins and 1-2 Sentry Bots, Wind-Up: 7 ticks, Telegraph: "Production lines activate, building units..."
- **Overload Pulse** — Damage: 65 (area), Wind-Up: 6 ticks, Telegraph: "All machinery begins sparking and overheating..."
- **Reconstruct** — Heals 100 HP, Wind-Up: 8 ticks, Telegraph: "Damaged components retract, new parts assembling..."

**Room Description:** "The Assembly Line fills the vast chamber, a mechanical god in its temple."

---

### 6. Desolate Wastes (Radiation Zones)
**Theme:** Nuclear fallout, radiation storms, mutated survivors, pre-war military installations.

#### Tier 1 Creatures

##### Rad Roach
**Type:** `rad_roach`  
**Tier:** 1  
**Archetype:** Swarm  
**Description:** Cockroaches grown to the size of dogs through radiation exposure. They swarm in radioactive hotspots.

**Stats:**
- HP: 16
- Attack: 5
- Defence: 2
- Armour: 3
- Agility: 9

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 50%

**Spawn Rules:**
- Min Count: 4
- Max Count: 8
- Preferred Room Types: `corridor`, `chamber`
- Forbidden Room Types: `boss`

**Loot Table:**
- Roach Carapace (0.5 weight, "Radiation-resistant shell.") — Drop Weight: 85
- Glowing Gland (0.2 weight, "Emits faint radiation.") — Drop Weight: 15

**Room Description:** "Rad roaches scuttle across glowing debris, antennae twitching."

---

##### Irradiated Scavenger
**Type:** `irradiated_scavenger`  
**Tier:** 1  
**Archetype:** Berserker  
**Description:** Humans driven mad by radiation exposure. Their skin glows faintly and their aggression is relentless.

**Stats:**
- HP: 30
- Attack: 9
- Defence: 2
- Armour: 1
- Agility: 6

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 15%

**Spawn Rules:**
- Min Count: 1
- Max Count: 3
- Preferred Room Types: `chamber`, `corridor`
- Forbidden Room Types: `boss`

**Loot Table:**
- Tattered Rad Suit (2.0 weight, "Full of holes.") — Drop Weight: 60
- Makeshift Weapon (2.5 weight, "Pipe or rebar.") — Drop Weight: 30
- Rad Pills (0.2 weight, "Expired medication.") — Drop Weight: 10

**Room Description:** "An irradiated scavenger prowls, skin glowing sickly green."

---

##### Dust Devil
**Type:** `dust_devil`  
**Tier:** 1  
**Archetype:** Skulker  
**Description:** Radioactive dust storms given semi-sentient form. They swirl through the wastes, abrading and irradiating.

**Stats:**
- HP: 20
- Attack: 7
- Defence: 1
- Armour: 0
- Agility: 8

**Behavior:**
- Aggressive: No
- Flee Threshold: 0%

**Spawn Rules:**
- Min Count: 1
- Max Count: 3
- Preferred Room Types: `chamber`, `corridor`
- Forbidden Room Types: `entry`, `boss`

**Loot Table:**
- Radioactive Dust (0.3 weight, "Highly contaminated.") — Drop Weight: 90
- Crystallized Fallout (0.2 weight, "Hardened particles.") — Drop Weight: 10

**Room Description:** "A dust devil spins lazily, particles glowing in its vortex."

---

##### Wasteland Hound
**Type:** `wasteland_hound`  
**Tier:** 1  
**Archetype:** Skulker  
**Description:** Feral dogs adapted to radiation. They hunt in packs and their howls echo across empty wastes.

**Stats:**
- HP: 28
- Attack: 8
- Defence: 3
- Armour: 2
- Agility: 9

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 35%

**Spawn Rules:**
- Min Count: 2
- Max Count: 4
- Preferred Room Types: `chamber`, `corridor`
- Forbidden Room Types: `boss`

**Loot Table:**
- Hound Pelt (1.5 weight, "Mangy and thin.") — Drop Weight: 70
- Rad-Scarred Fang (0.3 weight, "Glows faintly.") — Drop Weight: 25
- Hound Collar (0.5 weight, "Name tag illegible.") — Drop Weight: 5

**Room Description:** "Wasteland hounds circle, eyes reflecting green light."

---

#### Tier 2 Creatures

##### Gamma Ghoul
**Type:** `gamma_ghoul`  
**Tier:** 2  
**Archetype:** Berserker  
**Description:** Heavily irradiated corpses still ambulatory. They emit dangerous radiation and attack with mindless fury.

**Stats:**
- HP: 85
- Attack: 24
- Defence: 7
- Armour: 8
- Agility: 5

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 10%

**Spawn Rules:**
- Min Count: 1
- Max Count: 3
- Preferred Room Types: `chamber`, `corridor`
- Forbidden Room Types: `entry`

**Loot Table:**
- Ghoul Flesh (1.0 weight, "Radioactive tissue.") — Drop Weight: 60
- Gamma Organ (0.5 weight, "Emits strong radiation.") — Drop Weight: 30
- Pre-War Artifact (0.8 weight, "Carried since before the fall.") — Drop Weight: 10

**Abilities:**
- **Radiation Burst** — Damage: 32, Wind-Up: 4 ticks, Telegraph: "The ghoul's body glows brighter, radiation intensifying..."

**Room Description:** "A gamma ghoul shambles forward, leaving glowing footprints."

---

##### Scorched Behemoth
**Type:** `scorched_behemoth`  
**Tier:** 2  
**Archetype:** Guardian  
**Description:** Massive mutants created by concentrated radiation. Their skin is blackened and cracked, glowing from within.

**Stats:**
- HP: 115
- Attack: 26
- Defence: 10
- Armour: 16
- Agility: 3

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 5%

**Spawn Rules:**
- Min Count: 1
- Max Count: 2
- Preferred Room Types: `chamber`, `junction`
- Forbidden Room Types: `entry`, `boss`

**Loot Table:**
- Scorched Hide (5.0 weight, "Thick and radiation-resistant.") — Drop Weight: 55
- Behemoth Bone (6.0 weight, "Dense and glowing.") — Drop Weight: 30
- Mutation Sample (1.0 weight, "Unstable genetic material.") — Drop Weight: 15

**Abilities:**
- **Crushing Slam** — Damage: 40, Wind-Up: 5 ticks, Telegraph: "The behemoth raises its massive fists..."

**Room Description:** "A scorched behemoth stands like a monument to mutation."

---

##### Rad Wyrm
**Type:** `rad_wyrm`  
**Tier:** 2  
**Archetype:** Skulker  
**Description:** Mutated serpents that burrow through irradiated soil. They strike from underground and drag prey below.

**Stats:**
- HP: 70
- Attack: 25
- Defence: 9
- Armour: 10
- Agility: 10

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 30%

**Spawn Rules:**
- Min Count: 1
- Max Count: 2
- Preferred Room Types: `chamber`, `corridor`
- Forbidden Room Types: `entry`, `boss`

**Loot Table:**
- Wyrm Scale (1.0 weight, "Iridescent and toxic.") — Drop Weight: 65
- Venom Gland (0.5 weight, "Radioactive poison.") — Drop Weight: 25
- Burrowing Claw (1.5 weight, "Sharp and sturdy.") — Drop Weight: 10

**Abilities:**
- **Underground Strike** — Damage: 34, Wind-Up: 3 ticks, Telegraph: "The ground trembles, something approaching from below..."

**Room Description:** "Sand shifts where a rad wyrm lurks beneath."

---

##### Storm Elemental
**Type:** `storm_elemental`  
**Tier:** 2  
**Archetype:** Caster  
**Description:** Living radiation storms given consciousness. They crackle with energy and spread fallout wherever they drift.

**Stats:**
- HP: 65
- Attack: 22
- Defence: 12
- Armour: 6
- Agility: 7

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 25%

**Spawn Rules:**
- Min Count: 1
- Max Count: 3
- Preferred Room Types: `chamber`, `junction`
- Forbidden Room Types: `entry`, `boss`

**Loot Table:**
- Storm Core (0.5 weight, "Concentrated radiation.") — Drop Weight: 70
- Lightning Fragment (0.3 weight, "Solidified energy.") — Drop Weight: 25
- Elemental Essence (0.2 weight, "Pure radiation.") — Drop Weight: 5

**Abilities:**
- **Gamma Lightning** — Damage: 29, Wind-Up: 4 ticks, Telegraph: "The elemental crackles, energy building..."

**Room Description:** "A storm elemental hovers, electricity and radiation arcing."

---

#### Tier 3 Creatures

##### Atomic Colossus
**Type:** `atomic_colossus`  
**Tier:** 3  
**Archetype:** Guardian  
**Description:** A walking nuclear reactor core given humanoid form. It leaves radiation trails and glows with atomic fire.

**Stats:**
- HP: 250
- Attack: 53
- Defence: 18
- Armour: 30
- Agility: 2

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 0%

**Spawn Rules:**
- Min Count: 1
- Max Count: 1
- Preferred Room Types: `chamber`, `boss`
- Forbidden Room Types: `corridor`, `dead_end`

**Loot Table:**
- Reactor Core Fragment (4.0 weight, "Dangerously radioactive.") — Drop Weight: 50
- Atomic Heart (2.0 weight, "Still fissioning.") — Drop Weight: 30
- Enriched Uranium (3.0 weight, "Weapons-grade material.") — Drop Weight: 20

**Abilities:**
- **Nuclear Pulse** — Damage: 70, Wind-Up: 7 ticks, Telegraph: "The colossus's core brightens, heat building..."
- **Meltdown Wave** — Damage: 60, Wind-Up: 6 ticks, Telegraph: "Radiation levels spike, the colossus destabilizing..."

**Room Description:** "An atomic colossus radiates lethal energy, air shimmering around it."

---

##### Fallout Phantom
**Type:** `fallout_phantom`  
**Tier:** 3  
**Archetype:** Caster  
**Description:** Ghosts of those who died in the initial blast. They exist as concentrated radiation and radiate despair.

**Stats:**
- HP: 145
- Attack: 49
- Defence: 21
- Armour: 12
- Agility: 8

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 20%

**Spawn Rules:**
- Min Count: 1
- Max Count: 2
- Preferred Room Types: `chamber`, `corridor`
- Forbidden Room Types: `entry`

**Loot Table:**
- Phantom Essence (0.5 weight, "Radioactive spirit matter.") — Drop Weight: 60
- Final Memory (0.2 weight, "A flash of the blast.") — Drop Weight: 30
- Spectral Residue (0.3 weight, "Glows with lost lives.") — Drop Weight: 10

**Abilities:**
- **Despair Wave** — Damage: 62, Wind-Up: 5 ticks, Telegraph: "The phantom expands, memories flooding outward..."

**Room Description:** "A fallout phantom drifts, its form flickering between states."

---

##### Mutation Apex
**Type:** `mutation_apex`  
**Tier:** 3  
**Archetype:** Berserker  
**Description:** The ultimate expression of radiation-driven evolution. A chimera of multiple species fused into one deadly predator.

**Stats:**
- HP: 190
- Attack: 58
- Defence: 15
- Armour: 22
- Agility: 9

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 10%

**Spawn Rules:**
- Min Count: 1
- Max Count: 1
- Preferred Room Types: `chamber`, `junction`
- Forbidden Room Types: `entry`

**Loot Table:**
- Apex Tissue (4.0 weight, "Multi-species hybrid.") — Drop Weight: 55
- Mutation Core (2.0 weight, "Source of adaptation.") — Drop Weight: 30
- Evolved Claw (3.0 weight, "Perfect killing tool.") — Drop Weight: 15

**Abilities:**
- **Adaptive Strike** — Damage: 72, Wind-Up: 6 ticks, Telegraph: "The apex's body shifts, optimizing for the kill..."

**Room Description:** "A mutation apex prowls, a perfect synthesis of predators."

---

#### Boss

##### The Fallout King
**Type:** `the_fallout_king`  
**Tier:** 3 (Boss)  
**Archetype:** Caster  
**Description:** The first to die in the nuclear fire, and the first to rise. He rules the wastes absolutely, a god of radiation and ruin.

**Stats:**
- HP: 360
- Attack: 68
- Defence: 23
- Armour: 25
- Agility: 5

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 0%

**Spawn Rules:**
- Min Count: 1
- Max Count: 1
- Preferred Room Types: `boss`
- Forbidden Room Types: All others

**Loot Table:**
- King's Crown (1.5 weight, "Forged from fallout.") — Drop Weight: 20
- Nuclear Scepter (4.0 weight, "Commands radiation itself.") — Drop Weight: 18
- Masterwork Radiation Suit (14.0 weight, "Perfect protection.") — Drop Weight: 17
- Anomalous Isotope (0.5 weight, "Breaks physics.") — Drop Weight: 15
- Blast Remnant (2.0 weight, "Fragment of the first bomb.") — Drop Weight: 15
- Gamma Crown (1.0 weight, "Grants immunity to radiation.") — Drop Weight: 10
- Echo of Zero Hour (0.2 weight, "Memory of the moment.") — Drop Weight: 5

**Abilities:**
- **Atomic Storm** — Damage: 80, Wind-Up: 9 ticks, Telegraph: "The King raises his scepter, radiation coalescing into a storm..."
- **Summon Subjects** — Summons 2-3 Gamma Ghouls, Wind-Up: 7 ticks, Telegraph: "The King's voice echoes, calling his court..."
- **Nuclear Inferno** — Damage: 70 (area), Wind-Up: 7 ticks, Telegraph: "The air itself begins to burn with atomic fire..."
- **Fallout Reign** — Damage: 50 (continuous area), Wind-Up: 5 ticks, Telegraph: "Radiation levels spike catastrophically..."

**Room Description:** "The Fallout King sits on a throne of fused glass, crowned in green fire."

---

### 7. Eternal Night (Darkness Zones)
**Theme:** Perpetual darkness, shadow creatures, corrupted sanctuaries, fear manifestations.

#### Tier 1 Creatures

##### Shadow Rat
**Type:** `shadow_rat`  
**Tier:** 1  
**Archetype:** Swarm  
**Description:** Rats formed from living shadow. They dissolve into darkness when threatened and reform elsewhere.

**Stats:**
- HP: 14
- Attack: 6
- Defence: 2
- Armour: 0
- Agility: 10

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 60%

**Spawn Rules:**
- Min Count: 3
- Max Count: 6
- Preferred Room Types: `corridor`, `dead_end`
- Forbidden Room Types: `boss`

**Loot Table:**
- Shadow Wisp (0.1 weight, "Condensed darkness.") — Drop Weight: 85
- Void Tooth (0.2 weight, "Absorbs light.") — Drop Weight: 15

**Room Description:** "Shadow rats flicker in and out of darkness."

---

##### Gloom Stalker
**Type:** `gloom_stalker`  
**Tier:** 1  
**Archetype:** Skulker  
**Description:** Humanoid shadows that hunt in total darkness. They strike from blind spots and vanish before retaliation.

**Stats:**
- HP: 26
- Attack: 9
- Defence: 4
- Armour: 2
- Agility: 11

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 40%

**Spawn Rules:**
- Min Count: 1
- Max Count: 3
- Preferred Room Types: `corridor`, `chamber`
- Forbidden Room Types: `entry`, `boss`

**Loot Table:**
- Shadow Cloth (1.0 weight, "Fabric woven from darkness.") — Drop Weight: 70
- Gloom Essence (0.3 weight, "Liquid shadow.") — Drop Weight: 25
- Void Shard (0.5 weight, "Fragment of nothing.") — Drop Weight: 5

**Room Description:** "Gloom stalkers blend with shadows, barely visible."

---

##### Pale Wanderer
**Type:** `pale_wanderer`  
**Tier:** 1  
**Archetype:** Berserker  
**Description:** Corpses drained of all color, wandering endlessly in darkness. They attack anything with warmth or light.

**Stats:**
- HP: 32
- Attack: 8
- Defence: 2
- Armour: 1
- Agility: 5

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 20%

**Spawn Rules:**
- Min Count: 1
- Max Count: 3
- Preferred Room Types: `chamber`, `corridor`
- Forbidden Room Types: `boss`

**Loot Table:**
- Pale Flesh (1.0 weight, "Colorless tissue.") — Drop Weight: 70
- Drained Bone (0.8 weight, "Light and brittle.") — Drop Weight: 25
- Faded Garment (1.5 weight, "Once colorful.") — Drop Weight: 5

**Room Description:** "Pale wanderers drift through darkness, seeking light to extinguish."

---

##### Dark Wisp
**Type:** `dark_wisp`  
**Tier:** 1  
**Archetype:** Ranged  
**Description:** Floating orbs of concentrated shadow. They drain light from the environment and fire darkness bolts.

**Stats:**
- HP: 18
- Attack: 7
- Defence: 3
- Armour: 0
- Agility: 8

**Behavior:**
- Aggressive: No
- Flee Threshold: 50%

**Spawn Rules:**
- Min Count: 2
- Max Count: 4
- Preferred Room Types: `chamber`, `corridor`
- Forbidden Room Types: `boss`

**Loot Table:**
- Wisp Core (0.2 weight, "A sphere of darkness.") — Drop Weight: 80
- Shadow Flame (0.3 weight, "Cold fire that casts darkness.") — Drop Weight: 20

**Abilities:**
- **Darkness Bolt** — Damage: 10, Wind-Up: 2 ticks, Telegraph: "The wisp pulses, shadow gathering..."

**Room Description:** "Dark wisps float silently, extinguishing nearby light."

---

#### Tier 2 Creatures

##### Void Hound
**Type:** `void_hound`  
**Tier:** 2  
**Archetype:** Berserker  
**Description:** Monstrous canines formed from pure darkness. Their howls extinguish flames and their bite drains warmth.

**Stats:**
- HP: 88
- Attack: 24
- Defence: 8
- Armour: 9
- Agility: 10

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 25%

**Spawn Rules:**
- Min Count: 1
- Max Count: 3
- Preferred Room Types: `chamber`, `corridor`
- Forbidden Room Types: `entry`

**Loot Table:**
- Void Pelt (3.0 weight, "Fur of living darkness.") — Drop Weight: 60
- Hound's Fang (1.5 weight, "Drains heat on contact.") — Drop Weight: 30
- Shadow Heart (1.0 weight, "Beats with cold pulse.") — Drop Weight: 10

**Abilities:**
- **Howl of Night** — Damage: 30, Wind-Up: 4 ticks, Telegraph: "The hound inhales, preparing to unleash darkness..."

**Room Description:** "Void hounds prowl, their forms darker than shadow."

---

##### Eclipse Wraith
**Type:** `eclipse_wraith`  
**Tier:** 2  
**Archetype:** Caster  
**Description:** Spirits of those who died in total darkness. They spread their fear and drain the will to fight.

**Stats:**
- HP: 70
- Attack: 21
- Defence: 13
- Armour: 7
- Agility: 7

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 30%

**Spawn Rules:**
- Min Count: 1
- Max Count: 3
- Preferred Room Types: `chamber`, `junction`
- Forbidden Room Types: `entry`, `boss`

**Loot Table:**
- Wraith Essence (0.5 weight, "Formless terror.") — Drop Weight: 65
- Eclipse Shard (0.3 weight, "Fragment of eternal night.") — Drop Weight: 30
- Fear Crystal (0.2 weight, "Solidified dread.") — Drop Weight: 5

**Abilities:**
- **Terror Wave** — Damage: 28, Wind-Up: 4 ticks, Telegraph: "The wraith expands, radiating fear..."

**Room Description:** "An eclipse wraith floats, its presence oppressive."

---

##### Shadow Weaver
**Type:** `shadow_weaver`  
**Tier:** 2  
**Archetype:** Skulker  
**Description:** Spider-like creatures that spin webs of solidified darkness. They trap prey and drain them slowly.

**Stats:**
- HP: 75
- Attack: 26
- Defence: 10
- Armour: 11
- Agility: 9

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 35%

**Spawn Rules:**
- Min Count: 1
- Max Count: 2
- Preferred Room Types: `chamber`, `corridor`
- Forbidden Room Types: `entry`, `boss`

**Loot Table:**
- Shadow Silk (0.5 weight, "Woven darkness.") — Drop Weight: 65
- Weaver Fang (1.0 weight, "Injects void venom.") — Drop Weight: 25
- Darkness Web (0.3 weight, "Tangible shadow.") — Drop Weight: 10

**Abilities:**
- **Web Strike** — Damage: 32, Wind-Up: 3 ticks, Telegraph: "Shadow threads shoot toward you..."

**Room Description:** "Shadow weavers hang from webs of darkness."

---

##### Midnight Sentinel
**Type:** `midnight_sentinel`  
**Tier:** 2  
**Archetype:** Guardian  
**Description:** Armored guardians of dark sanctuaries. They were sworn to protect something, and death hasn't released them.

**Stats:**
- HP: 105
- Attack: 23
- Defence: 11
- Armour: 15
- Agility: 4

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 0%

**Spawn Rules:**
- Min Count: 1
- Max Count: 2
- Preferred Room Types: `chamber`, `junction`
- Forbidden Room Types: `entry`

**Loot Table:**
- Sentinel Armor (6.0 weight, "Black plate, absorbs light.") — Drop Weight: 55
- Oath Blade (4.0 weight, "Sworn to darkness.") — Drop Weight: 30
- Vigil Stone (1.0 weight, "Never sleeps.") — Drop Weight: 15

**Abilities:**
- **Sentinel Strike** — Damage: 36, Wind-Up: 5 ticks, Telegraph: "The sentinel raises its blade, darkness gathering..."

**Room Description:** "A midnight sentinel stands eternal watch."

---

#### Tier 3 Creatures

##### Abyss Colossus
**Type:** `abyss_colossus`  
**Tier:** 3  
**Archetype:** Guardian  
**Description:** Massive beings formed from the deepest darkness. They are voids given shape, and their presence drains all light.

**Stats:**
- HP: 235
- Attack: 50
- Defence: 19
- Armour: 28
- Agility: 3

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 0%

**Spawn Rules:**
- Min Count: 1
- Max Count: 1
- Preferred Room Types: `chamber`, `boss`
- Forbidden Room Types: `corridor`, `dead_end`

**Loot Table:**
- Abyss Core (3.0 weight, "A sphere of absolute nothing.") — Drop Weight: 50
- Void Plate (7.0 weight, "Armor from the depths.") — Drop Weight: 35
- Darkness Incarnate (2.0 weight, "Solidified absence.") — Drop Weight: 15

**Abilities:**
- **Void Crush** — Damage: 66, Wind-Up: 7 ticks, Telegraph: "The colossus contracts, drawing everything inward..."
- **Extinction Wave** — Damage: 58, Wind-Up: 6 ticks, Telegraph: "Absolute darkness spreads from the colossus..."

**Room Description:** "An abyss colossus stands, a hole in reality."

---

##### Nightmare Incarnate
**Type:** `nightmare_incarnate`  
**Tier:** 3  
**Archetype:** Caster  
**Description:** Living nightmares pulled from collective unconsciousness. They manifest your fears and make them real.

**Stats:**
- HP: 155
- Attack: 47
- Defence: 22
- Armour: 13
- Agility: 8

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 20%

**Spawn Rules:**
- Min Count: 1
- Max Count: 2
- Preferred Room Types: `chamber`, `corridor`
- Forbidden Room Types: `entry`

**Loot Table:**
- Nightmare Essence (1.0 weight, "Concentrated terror.") — Drop Weight: 60
- Fear Shard (0.5 weight, "Your worst moment.") — Drop Weight: 30
- Dream Residue (0.3 weight, "Lingers in the mind.") — Drop Weight: 10

**Abilities:**
- **Manifest Terror** — Damage: 60, Wind-Up: 5 ticks, Telegraph: "The nightmare shifts, becoming your fear..."

**Room Description:** "A nightmare incarnate writhes, taking horrific shapes."

---

##### Shadow Sovereign
**Type:** `shadow_sovereign`  
**Tier:** 3  
**Archetype:** Skulker  
**Description:** The master of all shadows in the zone. It commands darkness itself and can be anywhere shadows exist.

**Stats:**
- HP: 165
- Attack: 54
- Defence: 20
- Armour: 18
- Agility: 12

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 25%

**Spawn Rules:**
- Min Count: 1
- Max Count: 1
- Preferred Room Types: `chamber`, `boss`
- Forbidden Room Types: `corridor`

**Loot Table:**
- Sovereign's Cloak (4.0 weight, "Woven from absolute darkness.") — Drop Weight: 45
- Shadow Crown (1.5 weight, "Commands all shadows.") — Drop Weight: 35
- Void Dagger (2.0 weight, "Cuts through light itself.") — Drop Weight: 20

**Abilities:**
- **Shadow Step** — Damage: 68, Wind-Up: 4 ticks, Telegraph: "The sovereign vanishes, darkness spreading..."

**Room Description:** "The shadow sovereign is everywhere and nowhere."

---

#### Boss

##### The Endless Dark
**Type:** `the_endless_dark`  
**Tier:** 3 (Boss)  
**Archetype:** Caster  
**Description:** Not a creature but a phenomenon. The darkness at the end of all things. It existed before light and will exist after.

**Stats:**
- HP: 340
- Attack: 66
- Defence: 25
- Armour: 22
- Agility: 6

**Behavior:**
- Aggressive: Yes
- Flee Threshold: 0%

**Spawn Rules:**
- Min Count: 1
- Max Count: 1
- Preferred Room Types: `boss`
- Forbidden Room Types: All others

**Loot Table:**
- Fragment of Nothing (1.0 weight, "A piece of oblivion.") — Drop Weight: 20
- Masterwork Shadow Armor (13.0 weight, "Grants passage through darkness.") — Drop Weight: 18
- Anomalous Void Core (0.5 weight, "Can unmake anything.") — Drop Weight: 15
- Darkness Absolute (0.3 weight, "The absence of all.") — Drop Weight: 12
- Crown of Night (1.5 weight, "Rules eternal darkness.") — Drop Weight: 15
- Extinction Blade (5.0 weight, "Ends light permanently.") — Drop Weight: 10
- Echo of the Void (0.2 weight, "The sound before silence.") — Drop Weight: 10

**Abilities:**
- **Consume Light** — Damage: 75, Wind-Up: 8 ticks, Telegraph: "All light begins to fail, drawn toward a central point..."
- **Void Expansion** — Damage: 65 (area), Wind-Up: 7 ticks, Telegraph: "Darkness spreads like ink in water..."
- **Summon Shades** — Summons 3-4 Shadow Rats and 1-2 Gloom Stalkers, Wind-Up: 6 ticks, Telegraph: "Shadows peel from walls, taking form..."
- **Eternal Night** — Damage: 50 (continuous area), Wind-Up: 5 ticks, Telegraph: "The darkness deepens, becoming total..."

**Room Description:** "The Endless Dark fills the void, and the void is everything."

---

## Ambient & Passive Creatures

These creatures are non-hostile unless provoked, adding atmosphere and optional hunting targets.

### Scrap Pigeon (Tier 0)
**Type:** `scrap_pigeon`  
**Archetype:** Ambient  
**Stats:** HP: 5, Attack: 2, Defence: 1, Armour: 0, Agility: 12  
**Aggressive:** No  
**Description:** Urban birds adapted to the ruins. They scavenge and flee from any threat.  
**Loot:** Pigeon Feather (0.1 weight), Scrap Seed (0.1 weight)

### Rad Crow (Tier 1)
**Type:** `rad_crow`  
**Archetype:** Ambient  
**Stats:** HP: 8, Attack: 3, Defence: 2, Armour: 0, Agility: 11  
**Aggressive:** No  
**Description:** Intelligent scavengers that follow groups, hoping for corpses to pick clean.  
**Loot:** Crow Feather (0.1 weight), Shiny Object (0.2 weight)

### Mutant Fish School (Tier 1)
**Type:** `mutant_fish_school`  
**Archetype:** Ambient  
**Stats:** HP: 15, Attack: 4, Defence: 1, Armour: 0, Agility: 8  
**Aggressive:** No  
**Description:** Deformed fish swimming in toxic waters. They glow faintly.  
**Loot:** Mutant Scale (0.1 weight), Fish Meat (0.5 weight)

### Salvage Mule (Tier 0)
**Type:** `salvage_mule`  
**Archetype:** Ambient  
**Stats:** HP: 40, Attack: 6, Defence: 2, Armour: 3, Agility: 3  
**Aggressive:** No  
**Description:** Pack animals used by scavengers, sometimes found wandering after their owner's death.  
**Loot:** Leather Straps (1.0 weight), Pack Saddle (3.0 weight), Scavenger's Belongings (random)

---

## Implementation Notes

### Creature Distribution by Tier

**Tier 1 (Shallow):** 40 creatures
- Collapsed Megastructure: 4
- Flooded Depths: 4
- Toxic Wastes: 4
- Overgrown Ruins: 4
- Industrial Graveyard: 4
- Desolate Wastes: 4
- Eternal Night: 4
- Ambient: 4

**Tier 2 (Deep):** 35 creatures
- Collapsed Megastructure: 5
- Flooded Depths: 4
- Toxic Wastes: 4
- Overgrown Ruins: 4
- Industrial Graveyard: 4
- Desolate Wastes: 4
- Eternal Night: 4

**Tier 3 (Abyssal):** 20 creatures
- Collapsed Megastructure: 3
- Flooded Depths: 3
- Toxic Wastes: 3
- Overgrown Ruins: 3
- Industrial Graveyard: 3
- Desolate Wastes: 3
- Eternal Night: 3

**Bosses:** 8 total
- Tier 2 Bosses: 2 (Collapsed One, Drowned Choir)
- Tier 3 Bosses: 6 (one per major environment)

**Total Creatures:** ~103 entries

### Stat Progression Validation

Stat scaling follows established patterns from existing creatures:
- Tier 1: 15-60 HP (Gutterspawn 15 → Hollow Stalker 60)
- Tier 2: 60-120 HP (builds from T1 ceiling)
- Tier 3: 120-250 HP (elite encounters)
- Bosses: 150-420 HP (The Collapsed One 150 → The Assembly Line 420)

Attack/Defence/Armour scale proportionally to HP across tiers.

### Archetype Distribution

Each zone includes a mix of archetypes to create varied combat encounters:
- **Berserker:** High damage, medium durability, low agility
- **Skulker:** High agility, medium damage, low durability
- **Guardian:** High durability, low agility, medium damage
- **Swarm:** Low individual stats, multiple spawns
- **Ranged:** Medium all stats, ranged abilities
- **Caster:** Medium HP, high damage abilities, telegraphed

### Loot Tier Distribution

Items follow the tier system:
- **Scrap:** Common drops, low value (Tier 1 creatures)
- **Common:** Useful gear baseline (Tier 1-2)
- **Sturdy:** Rare finds in T1, common in T2
- **Refined:** T2 rares, T3 common
- **Masterwork:** Boss drops
- **Anomalous:** Rare boss drops (T3 only)

### Ability Design

Telegraphed abilities include:
- Wind-up time (3-9 ticks based on tier)
- Telegraph text (atmospheric description of attack charging)
- Damage proportional to wind-up time
- Bosses have 2-4 abilities minimum

### Room Description Philosophy

Each creature has atmospheric room description text that:
- Sets tone immediately
- Hints at threat level
- Provides narrative flavor
- Uses active verbs and sensory details

---

## Next Steps for Implementation (Bruenor)

1. Create TypeScript templates for each creature in `packages/server/src/creatures/templates/`
2. Add creature type constants to `packages/server/src/creatures/types.ts`
3. Generate database migration for `creature_definitions` table entries
4. Create item definitions for all loot table items
5. Link creatures to appropriate zone environments
6. Test spawn rules and stat balance
7. Implement telegraphed abilities in combat system
8. Create boss encounter rooms in relevant zones

---

**Design Status:** COMPLETE  
**Ready for:** Implementation  
**Estimated Implementation Time:** 2-3 weeks (100+ creatures + items + zones)

---

*"The world ended. Something else began. These are what crawled from the rubble."*
— Laeral, Content Designer
