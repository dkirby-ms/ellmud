# Ellmud — Figma Design Gap-Fill Brief

> **From:** Development Squad (Narrative & Architecture)
> **To:** Design Team
> **Date:** 2026-03-19
> **Re:** Missing screens, components, states, and variants from the initial Figma AI export

---

## 1. What You Delivered — And It's Excellent

The initial export nails the dark-fantasy MUD aesthetic. The following screens are complete and production-quality:

| # | Screen | Verdict |
|---|--------|---------|
| 1 | **Login / Register** | ✅ Atmospheric, centered card, correct palette. Gold title, flavor text — perfect. |
| 2 | **Character Select / Create** | ✅ Left panel (character cards) + right panel (creation form). Faction picker works. |
| 3 | **The Refuge (Hub)** | ✅ Seven-tab navigation, three-column layout, correct proportions. Feels like a living place. |
| 4 | **Shardboard** (as Refuge tab) | ✅ Shard cards with tier badges, biome icons, modifiers, player slots, rumoured loot. Excellent. |
| 5 | **Shard Exploration** | ✅ The crown jewel. 70/30 narrative+sidebar split, narrative entry types (room/combat/trace/sound/system/speech), clickable exits, command input with history, collapse timer with color transitions. Beautiful and functional. |
| 10 | **Leaderboard** | ✅ Seasonal rankings, personal stats, contracts tabs. Clean layout. |
| 11 | **Settings** | ✅ Six-category panel (account, display, narration, audio, keybinds, accessibility). Comprehensive. |

**Specific wins:** The serif/mono/sans font strategy is exactly right. The tier coloring system is consistent. The narrative panel is readable and immersive — it genuinely feels like *"Kindle × Notion × Dark Souls."* The color palette (`#0A0B0F` base, `#C9A84C` gold, `#E8E0D0` bone white) is spot-on.

We want to keep everything you've built. What follows is what's **missing** from the original 11-screen spec.

---

## 2. Missing Screens / Views

The original prompt specified 11 screens. The export delivered 7 (counting Shardboard as its own). The following 4 screens need full Figma frames:

---

### 2A. Combat Mode Overlay (Original Prompt — Screen 6)

**What it is:** When combat begins, the Shard Exploration screen *transforms* — it doesn't navigate away. This should be a separate Figma frame showing the exploration screen **in its combat state**.

**What to design:**

- **Combat banner** at the top of the narrative panel:
  - Text: `"⚔ COMBAT"` in a thin, full-width banner
  - Blood-red accent line (`#8B2500`) beneath the text
  - Current tick number displayed right-aligned (e.g., `"Tick 4"`)
  - Font: sans-serif (`Inter`), uppercase, tracked wide, small size

- **Tick timer** — a slim countdown bar (3–4px height) immediately below the combat banner:
  - Fills from left to right over 1 second, then resets
  - Fill color: muted gold (`#C9A84C`)
  - Track color: dark charcoal (`#12131A`)
  - When nearly expired (last 200ms): fill pulses brighter

- **Action quickbar** — appears directly above the command input bar (bottom of screen):
  - A single row of 8 action buttons, evenly spaced:
    - `Strike` | `Heavy Strike` | `Dodge` | `Block` | `Use Item` | `Skill` | `Flee` | `Observe`
  - Each button: dark charcoal background (`#12131A`), 1px muted border (`#2A2B35`), bone-white text (`#E8E0D0`)
  - Small icon (Lucide) left of label
  - **Keyboard shortcut** displayed as superscript in muted silver (`#8A8B95`): `¹` for Strike, `²` for Heavy Strike, etc.
  - **Hover state:** border brightens to gold (`#C9A84C`), subtle glow
  - **Active/pressed state:** gold fill (`#C9A84C`) with dark text
  - **Disabled state** (e.g., no item to use): text in disabled grey (`#4A4B55`), no hover effect
  - Background of the quickbar strip: slightly elevated (`#1C1D27`) to visually separate from the command input below

- **Enemy status panel** in the sidebar (replaces or appears above the Sound Cues section during combat):
  - **Target name** in serif, muted gold — from prose description (e.g., *"Drowned Revenant"*)
  - **HP tier** as qualitative text: `"Uninjured"` → `"Wounded"` → `"Badly Wounded"` → `"Near Death"`
    - Color progression: bone white → amber (`#B8860B`) → blood red (`#8B2500`)
  - **Telegraphed action** (if player used Observe): italic, muted silver (e.g., *"Winding up a heavy strike"*)

- **Combat narrative** in the main panel — show sample tick-by-tick combat text:
  - *"You lunge forward with your blade — the revenant staggers. [Tick 3]"* — hits dealt in muted gold (`#C9A84C`)
  - *"The revenant's claws rake your shoulder. Blood wells from the wound. [Tick 4]"* — hits taken in desaturated red (`#8B2500`)
  - Dodges/misses in muted silver (`#8A8B95`)

- **Transition states:**
  - **Combat start:** banner and quickbar fade in (0.3s ease). A system message appears in the narrative: `"Combat initiated."` in monospace, muted grey.
  - **Combat end:** banner and quickbar fade out. System message: `"Combat resolved."` Return to exploration mode.

---

### 2B. Inventory / Loadout Detail Overlay (Original Prompt — Screen 7)

**What it is:** A panel that slides in from the right (60% of screen width) over the Shard Exploration view. Accessed during a shard run via the sidebar "Inventory" button or by typing `inventory`.

**What to design:**

- **Overlay panel** (60% width, slides from right edge):
  - Background: dark charcoal (`#12131A`) with a subtle left-edge shadow
  - Top-right: `✕` close button (muted silver, gold on hover)

- **Carried Items section** (top half):
  - List layout — each item row shows:
    - **Item name** in the appropriate tier color (see §4 below for tier color table)
    - **Type icon** (Lucide: Sword, Shield, Flask, etc.)
    - **Durability bar** — thin (4px), grey fill on dark track, degrades visually
    - **Weight** — muted silver, right-aligned
  - Contextual action buttons per item (ghost buttons): `Equip` | `Drop` | `Use` | `Inspect`

- **Equipped Gear section** (bottom half):
  - Slot-based layout matching the Refuge Loadout tab
  - Slots: Weapon (primary), Weapon (secondary), Armour (head/chest/legs/hands), Consumables (×4), Tools (×2)
  - Each slot shows: equipped item name (tier-colored) or `"[empty]"` in disabled grey (`#4A4B55`)

- **Item Inspect sub-panel** (appears to the right within the overlay when an item is selected):
  - **Item name** — tier-colored, serif font (`Crimson Text`), larger size
  - **Flavor text** — italic serif, muted silver. LLM-generated prose. Example: *"A halberd corroded by centuries of standing water. The edge is still keen enough to wound."*
  - **Stats** — shown qualitatively, NOT as raw numbers:
    - `"Moderate damage"` | `"Heavy"` | `"Durable"` | `"Slow to swing"`
    - Monospace font, small, in muted silver
  - **Special properties** (if any): short tag chips (e.g., `"Bleed on hit"`, `"Shard-touched"`)

- **Weight indicator** — bottom of the panel:
  - `"Carried: 14 / 20"` as text
  - Thin progress bar — amber fill when >75% capacity, red when >90%

- **Dismiss:** `Escape` key, `✕` button, or type `close`. Panel slides back right.

---

### 2C. Extraction Screen / Overlay (Original Prompt — Screen 8)

**What it is:** The climactic moment of a shard run. An overlay on the exploration screen showing the extraction ritual in progress, then a run summary on success or failure.

**What to design — two states:**

#### State 1: Extraction In Progress

- **Extraction progress bar** — large, centered, overlaying the narrative panel:
  - Label above bar: `"Extraction Ritual — Hold Your Ground"` in serif, bone white, centered
  - Bar dimensions: ~60% of narrative panel width, 8px height, rounded
  - Fill color: muted gold (`#C9A84C`), with a gentle pulse animation
  - Track color: dark charcoal (`#12131A`)
  - Multi-phase: the bar fills in distinct segments (each segment = one tick of the ritual)
  - Below the bar: `"Noise generated: HIGH — nearby entities may investigate."` in amber (`#B8860B`), sans-serif, small

- **Narrative text continues** beneath/around the overlay — the ritual is narrated:
  - *"You begin tracing the extraction sigil on the ground. The air crackles with unstable energy..."*
  - *"The sigil flares — something stirs in the corridor behind you."*

- **Sound cues intensify** in the sidebar — show increasing sounds:
  - `"Heavy footsteps — south, approaching"` — amber
  - `"Scraping metal — east, close"` — blood red (danger proximity)

- The player can still be interrupted (combat can start during extraction), so the action quickbar should remain accessible.

#### State 2A: Extraction Success — Run Summary

- **Full overlay** on the narrative panel (dark scrim 80% opacity behind):
  - Centered card, max-width 600px, dark charcoal background, 1px gold border

  - **Header:** `"Extraction Successful"` in serif, gold (`#C9A84C`), large

  - **Items Extracted** section:
    - List of extracted items, each name tier-colored with type icon
    - Example: `"Corroded Halberd"` in steel blue (`#4682B4` — Refined tier)

  - **Experience:** Qualitative text — `"Significant combat experience gained"` in muted silver

  - **Contracts Completed** (if any): contract name + `"✓ Complete"` in emerald (`#2D6B4F`)

  - **Run Stats** — simple stat line in muted silver, monospace:
    - `Time: 8m 42s` | `Rooms: 12` | `Creatures: 3` | `Players evaded: 1`

  - **Button:** `"Return to Refuge"` — primary gold button (`#C9A84C` background, dark text)

#### State 2B: Death — Run Summary

- Same overlay layout but with a different tone:
  - **Header:** `"You Have Fallen"` in serif, blood red (`#8B2500`), large
  - **Items Lost** section: crossed-out item names in muted silver
  - **Status acquired:** `"Shard-sickness (moderate)"` in amber
  - **Run Stats:** same format as success
  - **Button:** `"Return to Refuge"` — secondary outlined button (no gold; muted silver border)

---

### 2D. Chat & Social Panel (Original Prompt — Screen 9)

**What it is:** A sliding panel for player communication. Can overlay or replace the sidebar on the right side.

**What to design:**

- **Panel layout** — slides in from right, same width as sidebar (30%), can expand to 40% on click:
  - Background: panel charcoal (`#12131A`)
  - Top: tab bar for chat channels

- **Chat tabs:**
  - `"Proximity"` — default in shards (players in the same room only)
  - `"Whisper"` — direct message to a visible player
  - `"Refuge"` — hub-wide, only available in Refuge
  - `"Squad"` — only if in a squad; disabled/hidden otherwise
  - Tab style: ghost text tabs, active tab has gold underline (`#C9A84C`)

- **Chat message styling** (distinct from game narration):
  - **Player speech in shards:** Anonymous descriptor prefix — *"A figure in dark leather says: 'Anyone found the key?'"* — quoted, serif italic
  - **Player speech in Refuge:** Character name prefix — *"Varn says: 'Trading masterwork plate.'"* — quoted, serif italic
  - **System messages:** monospace, muted grey (`#4A4B55`)
  - **Emote actions:** italic, no quotes — *"A hooded figure bows deeply."*
  - **Whispers:** prefixed with `"[whisper]"` in spectral teal (`#3A7D7B`)

- **Chat input** at bottom of panel:
  - Monospace input, same style as command bar but smaller
  - Placeholder: `"Say something..."` in disabled grey
  - Commands: `/say`, `/whisper <target>`, `/emote`

- **Players Nearby** section — above the chat feed:
  - Simple list: character name + faction icon
  - Clickable: clicking a name opens whisper or trade options

- **Trade Interface** (accessible from chat panel when two players are in the same Refuge room):
  - Two-column offer panel: your offer (left) | their offer (right)
  - Drag items or type `offer <item>`
  - `"Confirm Trade"` (gold button) | `"Cancel"` (secondary button)
  - Both parties must confirm

---

### 2E. Additional Missing Screens

These were not in the original 11-screen spec but are identified as necessary by the engineering audit:

#### Death / Downed Screen
- When HP reaches 0 during a shard run
- Could be the Death Run Summary (§2C State 2B above) — but consider also showing a brief **narrative death moment** before the summary:
  - Dark scrim fades in over the narrative panel
  - Final line of combat text (e.g., *"The darkness closes in. Your body fails."*)
  - 2-second pause, then the Death Run Summary overlay appears

#### Reconnection Overlay
- When the WebSocket connection drops unexpectedly:
  - Semi-transparent dark scrim over the entire screen
  - Centered: spinning/pulsing indicator (subtle, not a spinner — maybe a slowly pulsing shard icon or gold dot)
  - Text: `"Connection lost. Reconnecting..."` in bone white, serif
  - Below: `"Your character will defend themselves while you're away."` in muted silver
  - On success: overlay fades, toast notification: `"Reconnected."` in emerald
  - On failure (timeout): `"Unable to reconnect."` + `"Return to Login"` button

#### Loading / Transition States
- **Shard loading:** When entering a shard from the Shardboard — brief loading screen:
  - Dark background with atmospheric text: *"The shard opens. Reality bends..."* in serif, gold, centered
  - Subtle pulsing animation
  - Transitions to the Shard Exploration screen when the server confirms room join
- **Room transition:** Brief inline indicator in the narrative panel when moving between rooms (not a full screen — just a subtle `"..."` or thin gold separator line with a 0.3s delay before new room text appears)

---

## 3. Missing Components Within Existing Screens

These components were described in the original prompt but are either absent or incomplete in the delivered screens:

---

### 3A. Shard Stability Indicator (Narrative Panel Header)

**Where:** Top of the narrative panel in Shard Exploration (Screen 5)
**Original spec:** *"A room header bar showing the current room name and a subtle shard stability indicator (a thin bar that fills from green to amber to red as the shard destabilizes)."*

**What to design:**
- Thin bar (3–4px) spanning the width of the narrative panel header
- **Stable phase:** faded emerald fill (`#2D6B4F`)
- **Destabilising phase (50%):** amber fill (`#B8860B`)
- **Collapsing phase (25%):** blood red fill (`#8B2500`) with gentle pulse
- This is *separate from* the collapse timer countdown in the sidebar — it's a visual-at-a-glance indicator

> **Note:** The collapse timer countdown in the sidebar IS already delivered and works well. This is the complementary thin bar in the narrative header.

---

### 3B. Sound Cues Panel (Sidebar)

**Where:** Bottom of the sidebar in Shard Exploration
**Original spec:** *"A small feed of recent directional sounds: 'Scraping metal — from the north' / 'Footsteps — east, fading'. These are ephemeral — they fade out after a few seconds."*

**What to design:**
- Small section at the bottom of the sidebar, below the Collapse Timer
- Label: `"Sounds"` in sans-serif, muted silver, small
- Each sound cue: italic serif, muted silver, with a subtle ear/volume icon (`Volume2` from Lucide)
- Directional indicator: the direction word (`north`, `east`) in spectral teal (`#3A7D7B`)
- **Ephemeral behavior:** cues fade out (opacity 1 → 0) over 5 seconds. Show 3–4 most recent.
- When no sounds: empty state — `"Silence."` in disabled grey, italic

---

### 3C. Mini-Action Buttons (Sidebar)

**Where:** Bottom of the sidebar in Shard Exploration (above or near the sound cues)
**Original spec:** *"'Look', 'Listen', 'Inventory' as quick-access buttons for players who prefer clicking over typing."*

**What to design:**
- 3 ghost-style buttons in a row: `Look` | `Listen` | `Inventory`
- No border, text-only, bone white
- Hover: subtle underline in gold
- Small Lucide icons: `Eye`, `Ear`, `Backpack`
- These populate the command bar when clicked (same as clickable exits)

---

### 3D. Ambient Events Feed (Refuge)

**Where:** Below the vertical tab list in the Refuge left column (25%)
**Original spec:** *"Below tabs: 'Ambient Events' feed — a scrolling text area showing NPC activity, weather changes, faction news. Small serif italic text, muted."*

**What to design:**
- A scrolling text area (~150px height) below the navigation tabs
- Label: `"Refuge Activity"` in sans-serif, small, muted silver
- Each event: small serif italic, muted silver (`#8A8B95`)
- Sample events:
  - *"A hooded merchant sets up shop near the eastern gate."*
  - *"Rain begins to fall across the Refuge."*
  - *"Ironwright representatives gather near the forge."*
  - *"A shardwalker stumbles through the gate, bloodied but alive."*
- New events appear at the top, old ones scroll down and eventually disappear
- This makes the Refuge feel like a **living world**, not a static menu

---

### 3E. Auto-Complete Hint (Command Input)

**Where:** Above the command input bar in Shard Exploration
**Original spec:** *"Auto-complete hint appears above the input (ghost text showing the most likely command completion)."*

**What to design:**
- A single line of ghost text directly above the command input field
- Font: monospace (`JetBrains Mono`), same size as input text
- Color: disabled grey (`#4A4B55`) — barely visible until relevant
- Example: user types `go n` → hint shows `go north` in ghost text
- Example: user types `att` → hint shows `attack` in ghost text
- The hint disappears when the input is empty

---

## 4. Missing States & Variants

These are component variants and state designs that enable the full UI to feel interactive and alive:

---

### 4A. Button States

The original prompt defines four button types. Each needs **default / hover / active / disabled** variants:

| Type | Default | Hover | Active (pressed) | Disabled |
|------|---------|-------|-------------------|----------|
| **Primary** (Enter Shard, Confirm) | Gold bg (`#C9A84C`), dark text (`#0A0B0F`) | Subtle outer glow (gold, 4px blur) | Slightly darker gold (`#B89A3C`), pressed shadow | Grey bg (`#2A2B35`), disabled text (`#4A4B55`) |
| **Secondary** (Cancel, Close, Filter) | Transparent bg, 1px muted silver border (`#8A8B95`), silver text | Fill with `#1C1D27`, border brightens to bone white | Fill with `#2A2B35` | Border and text in disabled grey (`#4A4B55`) |
| **Danger** (Drop Item, Abandon) | Transparent bg, 1px blood-red border (`#8B2500`), red text | Fill with `#1C1D27`, border brightens | Confirmation dialog appears (not a direct action) | Border and text in disabled grey |
| **Ghost** (Look, Listen, sidebar actions) | No border, bone-white text only | Subtle gold underline appears | Text briefly turns gold | Text in disabled grey, no underline |

---

### 4B. Item Card Variants by Loot Tier

Each loot tier needs a distinct card variant. The tier determines the **left-border accent color** and the **item name text color**:

| Tier | Name Color | Left Border | Example |
|------|-----------|-------------|---------|
| **Common** | Bone white (`#E8E0D0`) | Bone white (`#E8E0D0`) | *"Worn Leather Boots"* |
| **Sturdy** | Pale green (`#6B8E6B`) | Pale green (`#6B8E6B`) | *"Reinforced Gauntlets"* |
| **Refined** | Steel blue (`#4682B4`) | Steel blue (`#4682B4`) | *"Tempered Longsword"* |
| **Masterwork** | Purple (`#7B4FA0`) | Purple (`#7B4FA0`) | *"Voidsteel Halberd"* |
| **Anomalous** | Shimmering gold (`#DAA520`) | Shimmering gold (`#DAA520`) | *"The Weeping Edge"* |

**Card structure (all tiers):**
- Dark charcoal background (`#12131A`)
- 1px muted border (`#2A2B35`)
- Left-border accent: 3px, tier color
- Hover: border brightens to the tier color (subtle)
- Content: item name (tier-colored, serif), type icon, durability bar, weight

Please design **one card per tier** as a variant set.

---

### 4C. HP Bar States

The HP bar should communicate status **qualitatively** — no numbers. Three visual states:

| State | Fill Color | Text Label | Visual |
|-------|-----------|------------|--------|
| **Healthy** (>60%) | Faded emerald (`#2D6B4F`) | `"Healthy"` | Smooth fill, calm |
| **Wounded** (25–60%) | Amber (`#B8860B`) | `"Wounded"` | Fill reduced, text turns amber |
| **Critical** (<25%) | Blood red (`#8B2500`) | `"Critical"` | Minimal fill, gentle pulse animation, text turns red |

- Bar: thin (4–6px), rounded, on a dark track (`#1C1D27`)
- Text label appears below or beside the bar
- The transition between states should feel organic — the label changes when the threshold is crossed

---

### 4D. Collapse Timer States

The collapse timer is already in the export. Please add explicit variants for the three phases:

| Phase | Timer Color | Label | Visual |
|-------|-----------|-------|--------|
| **Stable** (>50% time remaining) | Bone white (`#E8E0D0`) | Time shown normally | Static |
| **Destabilising** (25–50%) | Amber (`#B8860B`) | `"Destabilising"` warning label appears | Subtle pulse |
| **Collapsing** (<25%) | Blood red (`#8B2500`) | `"COLLAPSE IMMINENT"` | Pronounced pulse animation, text urgency |

---

### 4E. Extraction Progress Bar States

| Phase | Bar Fill | Label | Notes |
|-------|---------|-------|-------|
| **Ritual starting** | 0%, empty track | `"Extraction Ritual — Hold Your Ground"` | Pulsing empty bar |
| **In progress** | Filling in segments (1 segment per tick) | Same label | Gold fill (`#C9A84C`), gentle pulse |
| **Interrupted** (combat starts) | Paused, current fill remains | `"Extraction Interrupted!"` in blood red | Bar stops filling, border flashes red |
| **Completed** | Full, solid gold | `"Extraction Complete"` in emerald | Brief glow effect, then transitions to run summary |

---

### 4F. Toast / Notification Patterns

The game needs a lightweight notification system for transient events:

- **Position:** Top-right corner, below the top bar
- **Card style:** dark charcoal (`#12131A`), 1px border, subtle shadow, 320px max-width
- **Auto-dismiss:** 4 seconds, with a subtle fade-out
- **Variants:**

| Type | Left Accent | Icon | Example |
|------|------------|------|---------|
| **System** | Muted silver (`#8A8B95`) | `Info` | `"Settings saved."` |
| **Success** | Emerald (`#2D6B4F`) | `CheckCircle` | `"Reconnected."` / `"Contract complete."` |
| **Warning** | Amber (`#B8860B`) | `AlertTriangle` | `"Shard destabilising."` / `"Inventory nearly full."` |
| **Danger** | Blood red (`#8B2500`) | `AlertCircle` | `"Connection lost."` / `"You are bleeding."` |

---

### 4G. Empty States

Design empty-state illustrations (text-only, atmospheric) for:

| Context | Empty State Text | Style |
|---------|-----------------|-------|
| **Empty Stash** | *"Your stash is bare. The shards hold what you seek."* | Serif italic, muted silver, centered |
| **No Contracts** | *"No contracts available. Check back after the next shard cycle."* | Serif italic, muted silver, centered |
| **No Characters** | *"No shardwalkers yet. Create one to begin."* | Serif italic, muted silver, centered with `"Create Shardwalker"` button below |
| **Empty Chat** | *"Silence in the Refuge. Say something."* | Serif italic, muted silver, centered |
| **No Shards Available** | *"The shardboard is empty. The veil is quiet... for now."* | Serif italic, muted silver, centered |
| **Empty Squad** | *"You walk alone."* | Serif italic, muted silver, centered |

These should feel atmospheric and in-world, not like error messages.

---

## 5. Responsive Breakpoints

The original prompt specified four breakpoints. The current export uses fixed percentage widths with **no responsive behavior**. We need responsive variants for at least the two primary breakpoints:

### 5A. Desktop (1440px+) — Already Delivered ✅
Full three-column Refuge, full split-panel Exploration. This is the current design.

### 5B. Tablet Landscape (1024px) — **MISSING**
- **Refuge:** Sidebar navigation collapses to **icon-only** (no labels). Center column expands. Chat column becomes a toggleable overlay.
- **Shard Exploration:** Sidebar collapses to **icon-only** (expandable on tap/click). Narrative panel takes ~85% width. Sidebar slides out when needed.
- **Command input bar:** Full width, unchanged.
- **Key principle:** Everything still accessible, just space-optimized.

### 5C. Tablet Portrait (768px) — **MISSING**
- **Single-column layout.** Navigation becomes a hamburger menu (top-left).
- **Sidebar** becomes a **bottom sheet** that slides up from the bottom.
- **Chat** becomes a full-screen overlay.
- **Narrative panel** fills the screen width.
- **Command bar** stays fixed at bottom.

### 5D. Mobile (<768px) — **MISSING** (Stretch Goal)
- Simplified single-column. Narrative text fills the screen.
- All panels are full-screen overlays (slide in, dismiss to return).
- Command bar at bottom.
- Functional but not the primary target — designing for this breakpoint is nice-to-have.

> **Priority:** Please design **5B (1024px)** and **5C (768px)** as responsive variants. Mobile (5D) can be deferred.

---

## 6. Summary Checklist

| Category | Items Needed | Priority |
|----------|-------------|----------|
| **Missing screens** | Combat Mode overlay, Inventory overlay, Extraction overlay (progress + success + death), Chat & Social panel, Reconnection overlay, Loading states | High |
| **Missing components** | Shard stability bar, Sound cues panel, Mini-action buttons, Ambient events feed, Auto-complete hint | Medium |
| **Missing states** | Button variants (4 types × 4 states), Item cards (5 tiers), HP bar (3 states), Collapse timer (3 phases), Extraction bar (4 phases), Toasts (4 types), Empty states (6 contexts) | Medium |
| **Responsive** | 1024px tablet landscape, 768px tablet portrait | Medium |

---

## 7. Design Direction Reminders

To ensure consistency with the delivered screens:

- **Palette:** Stay within the established hex values. No new colors unless absolutely necessary. Everything muted, desaturated — *"aged pigment on vellum."*
- **Typography:** Serif (`Crimson Text`) for narrative and atmospheric text. Monospace (`JetBrains Mono`) for commands and system. Sans-serif (`Inter`) for UI chrome.
- **Tone:** Tense, atmospheric, mysterious. Not horror — but dread. The UI should feel like reading a forbidden book by candlelight.
- **No pixel art, no retro CRT effects.** Modern, elegant, typographically rich.
- **Overlays, not new pages:** Combat, Inventory, Extraction, and Chat all overlay or transform the existing Shard Exploration screen — the player never "leaves" during a run.
- **Text-first:** Stats shown qualitatively (*"Moderate damage"*, *"Wounded"*), not as numbers. The UI communicates through prose, not data.

---

*The shards are calling. Let's make sure the UI is ready when they open.*
