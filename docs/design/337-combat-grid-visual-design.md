# Issue #337: In-Room Combat Grid — Visual Design Analysis

**Requested by:** dkirby-ms  
**Design Lead:** Laeral (Content Designer)  
**Date:** 2026-04-07  
**Status:** RESEARCH & DESIGN ANALYSIS

---

## Executive Summary

Ellmud's core identity is **text-first, MUD-native gameplay** with server-authoritative, position-based tactical combat. A DCSS-style grid visualization can enhance tactical clarity and spatial awareness without replacing the text experience. This design analysis establishes visual principles, creature representation systems, and a tileset art direction that fit Ellmud's dark extraction-horror aesthetic while respecting its text-primary heritage.

**Key findings:**
- Grid should be **optional and supplementary**, never mandatory
- Creature visuals must reflect **tier progression and thematic faction zones**
- Tileset art should be **moody, minimalist, high-contrast pixel art** matching the dystopian Gulf South setting
- Environmental tiles encode **narrative and mechanical information** (hazards, faction influence, shard degradation)

---

## 1. Creature Visual Representation on a Grid

### 1.1 Visual Distinction by Creature Type

**Goal:** Players must instantly recognize creature categories and threat level at a glance, even in multi-enemy encounters.

#### Creature Category Silhouettes

Each creature type occupies a distinct visual "family" using core silhouette shapes:

| **Category** | **Silhouette** | **Visual Cues** | **Examples** |
|---|---|---|---|
| **Humanoid (Corrupted)** | Two-legged, head-shoulders profile | Mostly erect posture, asymmetric limbs | Alley Thug, Infected Cultist, Plague Bearer |
| **Bestial (Natural)** | Four-legged or crawling | Low center of gravity, aggressive angles | Feral Dog, Silt Serpent, Sewer Lurker |
| **Swarming (Vermin)** | Small clustered forms | Grouped/overlapping sprites, dense patterns | Slum Rats, Swarm Insects, Carrion Flies |
| **Amorphous (Mutant)** | Blob-like or irregular edges | Irregular outline, bulbous growths | The Collapsed One, Shambler, Ooze variants |
| **Drone/Construct** | Angular, geometric | Hard edges, visible joints/panels, metallic | Salvaged Servitor, Security Platform, Crawler Unit |

**Visual encoding:**
- Humanoids = humanoid shapes + visible corruption (warping, growths, asymmetry)
- Beasts = animal body plans with predatory postures
- Swarms = multiple small sprites or dense cluster texture
- Mutants = organic horror (asymmetry, extra limbs, weeping growths)
- Constructs = clean geometric forms, often rust-streaked

#### Color Coding by Threat & Disposition

Beyond silhouette, **color depth** signals threat:

| **Threat Level** | **Color Intensity** | **Example Hue** |
|---|---|---|
| Neutral/Fleeing | Pale, desaturated | Grey-green, washed tan |
| Hostile/Common | Moderate saturation | Brown, muted red, dark green |
| Elite/Mini-Boss | Rich, saturated | Deep red, stark black, sickly yellow |
| Boss/Unique | Vivid, almost glowing | Crimson, acidic green, pale white |

**Implementation:** A creature's sprite darkens and saturates as HP decreases and aggression increases. A fleeing creature drains toward grey-white; an enraged boss blazes in full saturation.

---

### 1.2 Tier Progression & Visual Scale

**Ellmud's item tier system** (scrap → common → sturdy → refined → masterwork → anomalous) does not directly map to creatures. However, creatures have an **internal tier concept** tied to zone progression and power scaling.

**Visual representation of creature advancement:**

| **Power Tier** | **Grid Size** | **Detail Level** | **Silhouette Confidence** |
|---|---|---|---|
| **T1 (Scrap Zone)** | 1×1 cell | Minimal detail, clear outline | Unmistakable silhouette |
| **T2 (Common Zone)** | 1×1 cell | Medium detail, slight texture variation | Recognizable category |
| **T3 (Sturdy Zone)** | 1–2×1 cells | Rich detail, layered coloring | Complex but readable |
| **T4+ (Refined+ Zone)** | 2×2+ cells | High detail, animated elements | Elite visual weight |

**Size scaling rules:**
- **Small creatures (Slum Rat, Swarm):** 1×1, densely packed if swarming
- **Medium creatures (Ghouls, Dogs, Thugs):** 1×1 with visual weight
- **Large creatures (Bosses, The Collapsed One):** 2×2, 3×2, or 3×3 depending on concept
- **Massive/Unique bosses:** Can overflow grid cells with shadow/halo effect to show "too big for one cell"

### 1.3 Creature State Visualization

Combat states must be **instantly readable** even in chaotic multi-enemy rooms.

#### Health & Condition Overlays

| **State** | **Visual Indicator** | **Effect on Sprite** |
|---|---|---|
| **Healthy (100% HP)** | None | Normal, full saturation |
| **Wounded (50–99% HP)** | Subtle crack/wound texture overlay | Minor color shift, small red accents |
| **Critical (<50% HP)** | Heavy wound overlay, bleeding effect | Red veining, dark staining, visual distortion |
| **Downed (0 HP, not dead)** | Prone position, desaturated color | Sprite rotates/collapses, turns pale grey |
| **Stabilized (bleeding stopped)** | Downed + faint glow | Pale glow around sprite, still prone |

#### Disposition Badges

A small **icon badge** appears adjacent to or above each creature sprite:

- 🔴 **Hostile** — Red exclamation, active attack stance
- 🟡 **Alerted** — Yellow question mark, cautious posture
- 🟢 **Neutral** — No badge, neutral stance
- 🔵 **Fleeing** — Blue arrow away from threat
- ⚫ **Downed** — Dark cross or downward arrow

---

## 2. Grid Room Atmosphere

### 2.1 Environmental Tiles & Terrain Encoding

The grid represents the **room's layout and hazards**. Each cell type communicates both narrative and mechanical information.

#### Base Terrain Types

| **Terrain** | **Visual** | **Mechanical Effect** | **Thematic Use** |
|---|---|---|---|
| **Stone Floor** | Grey stone blocks, light texture | Default, no penalty | Ruins, dungeons, strongholds |
| **Rubble/Debris** | Cracked, broken stones, dust patterns | Movement slower, concealment bonus | Ashgate, collapsed zones |
| **Water/Sludge** | Murky liquid, ripple texture | Movement slower, ranged penalty | Sewers, flooded areas, Bloom Observatory |
| **Corrupted Ground** | Cracked with bioluminescent veining | Movement slower, HP regen debuff | Mutation zones, anomaly areas |
| **Overgrown** | Vines, moss, wild growth | Movement slower, stealth bonus | Siltgate ruins, external zones |
| **Constructed** | Clean tile, industrial pattern | Default, possibly faster movement | Strongholds, Kindari tech zones |

#### Hazard Markers

| **Hazard** | **Visual Marker** | **Animation** | **Interaction** |
|---|---|---|---|
| **Toxic Gas/Vapor** | Swirling cloud overlay | Pulsing, drifting | Damage on entry/presence |
| **Spikes/Caltrops** | Jagged overlay pattern | Slight shimmer | Damage on entry |
| **Lava/Heat Source** | Glowing orange/red cells | Wavering distortion | High damage, visual warning |
| **Collapsed Ceiling (danger)** | Hanging rubble, particle drizzle | Occasional falling rocks | Damage zones, environmental threat |
| **Concealment Spot** | Darker shading, shadow pattern | None | Can hide here (stealth mechanic) |

---

### 2.2 Zone Theme Translation to Grid Visuals

**Ellmud's three faction strongholds and external zones** each have a distinct visual identity that should carry through to grid combat environments.

#### The Kindari (The Reliquary)

**Theme:** Industrial salvage, brutalist concrete, reverent technology  
**Grid Aesthetic:**
- **Base color:** Gunmetal grey, rust red accents
- **Terrain patterns:** Concrete slabs, geometric tile work, visible grating/metal plating
- **Hazards:** Sparking electrical conduits, scalding steam vents, sharp salvaged metal
- **Special tiles:** Drone components embedded in floor, glowing maintenance panels
- **Mood:** Cold, utilitarian, reverent. Every visual element suggests function and history.

Example grid cell descriptions:
```
Concrete slab with faded warning stripes
Rusted metal grating with gaps
Steam vent with scalding mist
Salvaged servo-arm debris (obstacle)
Glowing circuit board pattern
```

#### The Bloom Observatory

**Theme:** Ecological mutation, bioluminescence, living growth  
**Grid Aesthetic:**
- **Base color:** Sickly green, turquoise accents, living blacks
- **Terrain patterns:** Algae-slick decking, overgrown plating, pulsing biomass
- **Hazards:** Spore clouds, acidic pools, carnivorous plants, electromagnetic blooms
- **Special tiles:** Living algae patches (healing?), mutation hotspots
- **Mood:** Organic, alien, beautiful and terrible. Nature has reclaimed this place with hunger.

Example grid cell descriptions:
```
Algae-slick platform
Bioluminescent moss cluster
Spore cloud (hazard)
Living root tangle (movement block)
Acidic pool reflection
```

#### Krewe Calliope (The Carrion Court)

**Theme:** Ritual, performance, masked darkness  
**Grid Aesthetic:**
- **Base color:** Deep purples, golds, blacks with theatrical accents
- **Terrain patterns:** Weathered tile, symbolic paint, scattered ritual objects
- **Hazards:** Trap mechanisms, electrified barriers, collapsing stage sections
- **Special tiles:** Altar markings, masked statuary, ceremonial fire
- **Mood:** Eerie, performative, cultish. This space was built for spectacle and secrets.

Example grid cell descriptions:
```
Painted ceremonial tile
Mask-adorned wall section
Flickering theatrical light
Trap door outline
Ritual incense smoke cloud
```

#### External Zones (Warrens, Siltgate, etc.)

**The Warrens** (water-logged ruins):
- Murky water dominates, skeletal structures, decaying corpses, fungal blooms
- Color: Deep blues and greens with pale bone-white highlights

**Siltgate** (urban decay):
- Cracked asphalt, collapsed buildings, urban overgrowth, street graffiti
- Color: Dusty browns, faded signage colors, sludge greens

---

### 2.3 Fog of War & Visibility

**Question:** Should the grid reveal all creatures in the room, or should visibility be limited?

**Answer:** **Partial visibility with line-of-sight awareness**, balanced with the MUD's existing awareness mechanics.

#### Visibility Rules

1. **Direct sight:** Creatures within the player's current line-of-sight (LOS) are fully visible on the grid
2. **Off-screen:** Creatures in the room but outside LOS are shown as **ghosted outlines** or **icons only** (no detail)
3. **Undetected:** Creatures with stealth/concealment that the player hasn't discovered yet appear as **subtle shimmer** or **question mark** if the player has awareness skill
4. **Sound cues:** If creatures move beyond LOS but make noise, they appear as **sound wave radiants** on the grid

#### Rationale

- Respects the **existing awareness skill** and stealth mechanics in the GDD
- Preserves the tension of unknown threats (creeping closer)
- Prevents grid from becoming a "perfect information" tool that breaks MUD immersion
- Allows sound propagation (a key GDD mechanic) to translate visually

---

## 3. Player Representation on the Grid

### 3.1 Player Character Sprites

Player sprites should be **instantly distinguishable from creatures** while respecting character customization and faction affiliation.

#### Base Player Appearance

- **Silhouette:** Upright humanoid, clearly artificial/customized look (wearing equipment)
- **Size:** Always 1×1 grid cell
- **Color:** Defined by **faction stronghold colors**:
  - **Kindari:** Silvery/grey with red trim
  - **Bloom Tenders:** Turquoise/green with blue accents
  - **Krewe Calliope:** Purple/gold with black accents
- **Visual weight:** Similar to creature T3, but with clear "this is a player" markers (equipment visible, stance readable as deliberate)

#### Equipment Visual Representation

**Equipped items should be subtly visible on the player sprite:**

- **Weapon:** Visible in sprite's hand/reach (sword outline, bow shape, spell effect)
- **Armor:** Shows as silhouette variation (heavy plate, light leather, robes)
- **Special Items:** Icon overlay (glowing artifact, shield badge, tool attachment)

#### PvP Visual Distinction

In PvP scenarios, players fighting each other must be distinguishable:

- **Your party:** Bright, clear sprites with faction colors
- **Neutral players:** Slightly desaturated but clearly player-like
- **Hostile players:** Red outline/glow, clear threat indicator
- **Named players:** Display player name above/near sprite (optional toggle)

---

### 3.2 Group Positioning & Visual Crowding

When multiple players occupy the same room:

1. **Individual cells:** Each player occupies their own grid cell (no overlap)
2. **Proximity clustering:** Players naturally form groups in adjacent cells
3. **Name tags:** If more than 5 players in a room, show abbreviated names instead of full names (avoid label clutter)
4. **Color banding:** Use slightly different shades of faction color to distinguish party members from enemy players

---

## 4. Design Principles: Text-First, Grid-Supplementary

### 4.1 The Grid Enhances, Never Replaces

**Core principle:** The grid is a **tactical reference tool**, not the primary experience.

**Implementation:**
- Grid is **optional and toggleable** (player can hide it with a UI button)
- All combat narration remains in the **text feed** as the primary medium
- Grid updates **sync with text narration**, not ahead of it
- Position changes are **described in text** before being visible on grid

**Example interaction:**
```
TEXT (primary):
"You move to flank the ghoul. [Position: Flank]"

GRID (secondary):
Player sprite moves one cell left, positioning badge updates to [F]
```

### 4.2 Text-Primary Combat Remains Fully Functional

**For players who disable the grid (or on mobile/low-bandwidth):**

- All combat information is available in the **text feed alone**
- Position system uses **text badges** (`[F]`, `[K]`, `[R]`) that appear in narration
- Target info, ability costs, and cooldowns remain text-first in the UI
- **The game is playable and fully tactical without the grid.**

### 4.3 Accessibility & Inclusivity

**Grid combat must not create new barriers:**

1. **Color-blind friendly:** Use **shape + saturation** instead of hue alone for state indication
2. **Mobile support:** Grid adapts to small screens, optional zoom
3. **Keyboard-only:** All grid actions (move, target, use ability) work via hotkeys without clicking
4. **High-contrast mode:** Toggle that emphasizes outlines and reduces saturation for visibility-impaired players
5. **Text alternative:** A terminal-style "ASCII grid" option (uses box-drawing characters) for purists

---

## 5. Tileset Art Direction

### 5.1 Recommended Art Style

**Ellmud's darkness and isolation demand a specific visual approach:**

#### Primary Style: **Pixel Art (High-Contrast, Minimalist)**

**Why pixel art?**
- Native to grid-based games and browsers
- Scales cleanly on any screen size (retro charm + technical efficiency)
- Fits the **dystopian, corrupted aesthetic** (everything is broken, salvaged, worn)
- Performance-efficient for real-time combat
- Can be beautifully moody at small sizes (12–32px)

**Recommended specs:**
- **Tile size:** 32×32px (standard) or 16×16px (mobile compact)
- **Palette depth:** 16–32 colors per tileset (enforces clarity and impact)
- **Pixel density:** Medium-high (anti-aliasing minimal, hard edges)
- **Animation frames:** 2–4 frames for moving creatures and hazards (no excessive animation)

#### Aesthetic References

| **Reference** | **Relevant Aspects** | **What to adopt / avoid** |
|---|---|---|
| **Dungeon Crawl: Stone Soup (DCSS)** | High-contrast sprites, readable at small sizes, clear silhouettes | **Adopt:** Clean outlines, strong shapes. **Avoid:** DCSS's sometimes-bright colors (too cheerful for Ellmud) |
| **Cogmind** | Sci-fi + brutalist aesthetic, excellent use of geometric forms | **Adopt:** Angular construction drones, industrial materials. **Avoid:** Too much variety (stay moody) |
| **Caves of Qud** | Dark, eerie, strong personality in minimal space | **Adopt:** Mutant creatures, corruption visuals, weird beauty. **Avoid:** Cartoon-style proportions |
| **Darkest Dungeon** | Victorian gothic, high contrast, hand-drawn-like feel | **Adopt:** Darkness and shadow, thematic cohesion. **Avoid:** The animation style (too ornate for grid) |

---

### 5.2 Color Palette by Zone Theme

Each faction stronghold and zone has a **restricted color palette** that makes visuals cohesive and readable.

#### The Kindari (Salvage/Industrial)

**Palette:**
- **Primary:** Gunmetal grey (#4a4a4a), rust red (#8b4513)
- **Secondary:** Weathered bronze (#8b7355), bright warning yellow (#ffff00, for hazards)
- **Accents:** Electrical blue (#0066ff, for active tech), blood copper (#cc6633)
- **Shadows:** Deep charcoal (#1a1a1a)

**Visual rules:**
- Everything looks **salvaged and functional**
- Rust streaks visible on large surfaces
- Geometric patterns suggest mechanical design
- Warm lighting (torch/fire) contrasts cool shadows

#### The Bloom Observatory

**Palette:**
- **Primary:** Sickly green (#66dd00), deep teal (#008888)
- **Secondary:** Bioluminescent cyan (#00ffff), algae brown (#5a5a2e)
- **Accents:** Acidic yellow-green (#ccff00), diseased purple (#aa00ff)
- **Shadows:** Dark seafoam blue (#001a33)

**Visual rules:**
- Everything shows **organic growth and corruption**
- Glowing accents suggest bioluminescence
- Wet/dripping surfaces implied by shine patterns
- Colors feel alive but wrong

#### Krewe Calliope (Ritual/Performance)

**Palette:**
- **Primary:** Deep purple (#551155), aged gold (#aa8844)
- **Secondary:** Theatrical red (#cc3333), ritual black (#220022)
- **Accents:** Mask white (#ffffee), occult blue (#0055cc)
- **Shadows:** Absolute black (#000000) for drama

**Visual rules:**
- Everything looks **hand-painted and meaningful**
- Gold accents suggest wealth and ritual importance
- Darkness frames dramatic highlights
- Visual storytelling through color (mask colors, ceremonial objects)

---

### 5.3 Creature Pixel Art Guidelines

Creatures should be **readable and memorable** at 32×32px.

#### Design Process

1. **Start with silhouette:** Block out the creature's basic shape in 2 colors (fore/shadow)
2. **Add tier detail:** T1 creatures use minimal detail; higher tiers get more layering and texture
3. **Apply faction palette:** Use the zone's restricted color set
4. **Animate subtly:** Idle sway or breathing (2–3 frame loop)
5. **Test at distance:** Sprites must be readable when 50% opacity (ghosted/off-LOS)

#### Example Creature Sprites

**Slum Rat (T1, Bestial)**
- 16×16px compact sprite
- Brown body, darker stripes, visible teeth/red eyes
- Animated: tail twitch (2 frames)
- Silhouette: unmistakably a rat, hunched

**Drowned Revenant (T2, Humanoid Corrupted)**
- 32×32px
- Greyish-blue corpse colors, tattered clothing, misaligned limbs
- Animated: shambling walk (2 frames), irregular breathing
- Silhouette: human-shaped but wrong proportions

**The Collapsed One (T4, Amorphous Boss)**
- 64×64px (2×2 cells, shows overflow)
- Asymmetrical masses, some limb-like protrusions, weeping texture
- Animated: pulsing/undulating (3 frames), subtle color shifts
- Silhouette: horror-inducing wrongness, dominates space

---

### 5.4 Environmental Tile Patterns

Grid floor tiles should suggest **narrative and mechanical information** without being cluttered.

#### Base Terrain Tiles (32×32px)

**Stone Floor (Kindari/Ruins):**
- Regular stone block grid pattern
- Slight shadow variation per block (3–4 shades)
- Cracks suggesting age
- Optional: geometric warning stripe pattern in hazard areas

**Algae-Slick (Bloom Observatory):**
- Organic ripple pattern, liquid-like
- Bioluminescent highlights (glowing cracks)
- Wet shine suggesting moisture
- Color gradient (darker edges, lighter center)

**Ritual Tile (Krewe Calliope):**
- Hand-painted symbol pattern (spirals, masks, stars)
- Gold inlay suggestions
- Shadow/age cracking
- Dust and wear visible

#### Hazard Overlays

Hazards appear as **semi-transparent pattern overlays** on base tiles:

**Toxic Gas:**
- Swirling cloud pattern, slightly animated
- Color: Sickly yellow-green with opacity ~60%
- Edge: Soft feathering to show gas dispersal

**Spikes/Caltrops:**
- Jagged line pattern, radiating from corners
- Color: Weapon metal (gunmetal or blood copper)
- Shadow beneath to show height/danger

**Lava/Heat:**
- Glowing orange/red base with black cracks
- Animated: subtle wavering distortion (2–3 frames)
- Heat shimmer effect (pixel displacement at top)

---

## 6. Implementation Roadmap (High-Level)

### Phase 1: Foundation
- [ ] Establish 32×32px tileset framework (base terrain + faction themes)
- [ ] Design core creature silhouettes (10–15 common creatures across all tiers)
- [ ] Create visual style guide (palette, pixel conventions, animation rules)

### Phase 2: Creature & Hazard Art
- [ ] Complete creature sprite library for existing zones (Warrens, Siltgate, etc.)
- [ ] Design hazard overlays (toxic, spikes, heat, concealment)
- [ ] Create boss-tier creature sprites (larger canvases, more detail)

### Phase 3: Client Integration
- [ ] Build grid renderer (WebGL or Canvas-based, 1-second tick sync)
- [ ] Integrate position badges from existing combat system
- [ ] Add grid toggle, zoom, and accessibility options

### Phase 4: Polish & Iteration
- [ ] User testing with small group (tactical clarity, readability)
- [ ] Color-blind testing and high-contrast mode tuning
- [ ] Performance optimization for mobile and weak browsers

---

## 7. Key Design Decisions

### 7.1 Why Pixel Art Over Drawn Tiles?

**Pixel art chosen over:**
- **Vector/drawn tiles:** Less atmospheric, cleaner but less moody
- **3D models:** Overkill for tactical grid, poor MUD aesthetic fit
- **ASCII-enhanced:** Too niche, limited visual richness

**Pixel art delivers:**
- Cohesive dark aesthetic matching game tone
- Scalability and performance efficiency
- Retro gaming nostalgia (fits extraction-horror vibe)
- Compatibility with low-bandwidth conditions

### 7.2 Why Optional Grid?

The grid must be **toggleable** because:
1. Text-first MUD players may resent visual UI intrusion
2. Mobile/low-bandwidth players need text-only fallback
3. Accessibility requires non-visual alternatives
4. Server load scales better if not all clients demand real-time grid updates

**Grid is an enhancement layer**, not a dependency.

### 7.3 Why Fog of War?

Partial visibility (based on existing LOS mechanics) is crucial because:
1. Reveals the **hidden threat** tension that makes extraction horror work
2. Prevents grid from becoming a "perfect information" cheat tool
3. Aligns with existing awareness skill and stealth systems
4. Makes distant threats palpable (sound radiants on grid)

---

## 8. Visual Design Glossary

| **Term** | **Definition** |
|---|---|
| **Silhouette** | The basic shape/outline of a creature, readable even at low resolution |
| **Saturation** | Color vividness; high saturation = vivid and threatening, low = pale and weak |
| **Tile** | One 32×32px grid cell; base unit of the combat space |
| **Overlay** | Semi-transparent pattern (hazard, condition) applied over base tile |
| **Ghost/Ghosted** | Reduced opacity sprite (50%) indicating off-LOS or undetected entity |
| **Disposition badge** | Small icon (🔴🟡🟢) showing creature state (hostile/neutral/fleeing) |
| **Faction palette** | Restricted color set per stronghold for visual cohesion |
| **Pixel-perfect** | Sharp, no anti-aliasing; appropriate for retro art style |

---

## 9. Next Steps for Implementation

1. **Art Production:** Commission or develop core tileset and creature sprites following this guide
2. **Client Build:** Develop grid renderer and integrate with existing combat HUD
3. **Testing:** Validate grid readability with playtesters unfamiliar with DCSS
4. **Accessibility Audit:** Ensure color-blind, mobile, and keyboard-only players are supported
5. **Optional Iteration:** Based on player feedback, refine creature designs and color palettes

---

## Appendix: Reference Inspirations

- **Dungeon Crawl: Stone Soup** — Grid-based combat visibility, readable pixel sprites
- **Cogmind** — Sci-fi brutalist aesthetic, roguelike extraction gameplay
- **Caves of Qud** — Dark mutation visuals, post-apocalyptic atmosphere
- **Darkest Dungeon** — Victorian gothic mood, high-contrast artwork
- **MUD1/LPC era MUDs** — Text-first tradition, position-based combat without graphics

---

**Design Analysis Complete.** Ready for implementation phase planning and art direction.
