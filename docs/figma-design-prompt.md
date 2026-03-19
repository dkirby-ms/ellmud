# Ellmud — Figma AI Design Prompt

## Project Overview

Design a **multi-page web UI prototype** for **Ellmud**, a PvPvE Extraction RPG / Real-Time MUD played entirely in a web browser. Think *Dark Souls meets classic MUD meets Escape from Tarkov* — but the entire experience is **text-based**. There is no graphics engine, no sprites, no 3D. All game information is communicated through **richly styled narrative prose text**, typographic hierarchy, and subtle iconography. This is a game for people who love to *read*.

Players are **Shardwalkers** — diving into procedurally generated, collapsing dungeon instances ("shards"), fighting creatures, dodging other players, scavenging loot, and escaping before the shard collapses. Between runs, they return to **The Refuge**, a persistent hub where they manage gear, trade, and prepare.

---

## Aesthetic & Tone

- **Genre:** Dark fantasy. Crumbling ruins, corrupted dungeons, spectral light, bone and iron.
- **Mood:** Tense, atmospheric, mysterious. Not horror — but dread. The UI should feel like reading a forbidden book by candlelight in a collapsing library.
- **Era blend:** Medieval-dark-fantasy content, but the *interface* is a hybrid of **terminal/console aesthetics** (monospace input, scrolling text log) and **modern game UI** (clean panels, subtle animations, polished typography).
- **No pixel art, no retro CRT effects.** This is a modern, elegant, typographically rich interface that happens to be text-only.

---

## Color Palette

| Role | Color | Hex |
|---|---|---|
| **Background (primary)** | Near-black with blue undertone | `#0A0B0F` |
| **Background (panels/cards)** | Dark charcoal | `#12131A` |
| **Background (elevated surface)** | Slate | `#1C1D27` |
| **Text (primary — prose/narrative)** | Warm bone white | `#E8E0D0` |
| **Text (secondary — labels/UI)** | Muted silver | `#8A8B95` |
| **Text (disabled/hint)** | Dark grey | `#4A4B55` |
| **Accent (gold — highlights, titles, rare items)** | Muted antique gold | `#C9A84C` |
| **Danger / Combat / Health critical** | Blood red (desaturated) | `#8B2500` |
| **Safe / Success / Extraction** | Faded emerald | `#2D6B4F` |
| **Interactive / Links / Clickable** | Spectral teal | `#3A7D7B` |
| **Warning / Caution / Timer** | Amber | `#B8860B` |
| **Loot tier: Common** | Bone white | `#E8E0D0` |
| **Loot tier: Sturdy** | Pale green | `#6B8E6B` |
| **Loot tier: Refined** | Steel blue | `#4682B4` |
| **Loot tier: Masterwork** | Purple | `#7B4FA0` |
| **Loot tier: Anomalous** | Shimmering gold | `#DAA520` |

All colors are **muted and desaturated** — no neon, no high-saturation. The palette should feel like it's been aged, like pigment on vellum.

---

## Typography

| Usage | Style | Direction |
|---|---|---|
| **Narrative prose** (room descriptions, combat text, NPC speech) | Serif — warm, readable, book-like | Similar to *Crimson Text*, *Libre Baskerville*, or *EB Garamond*. This is the soul of the game. |
| **Command input & system messages** | Monospace — terminal heritage | Similar to *JetBrains Mono*, *Fira Code*, or *IBM Plex Mono*. Evokes the MUD command line. |
| **UI labels, buttons, headers** | Sans-serif — clean, modern | Similar to *Inter*, *DM Sans*, or *Plus Jakarta Sans*. Small, functional, does not compete with prose. |
| **Titles & headers** (screen names, item names, faction names) | Serif or decorative serif — slightly larger, gold accent | Can be the same serif as prose but bolder, or a display face like *Cinzel* for a fantasy-carved-stone feel. |

**Key rule:** The narrative text panel must be *extremely readable*. Line height 1.6–1.8, max width ~70ch, comfortable left-aligned paragraphs. This is a reading-heavy experience.

---

## Global Layout Principles

- **Web-first, desktop-optimized.** Primary breakpoint: 1440×900. Secondary: 1024px tablet. Mobile (portrait phone) is a stretch goal — the layout should degrade gracefully but is not the priority.
- **Dark theme only.** No light mode.
- **Single-page application feel.** Screens transition smoothly — no full page reloads.
- **Persistent elements:** A thin top bar (character name, HP indicator, location breadcrumb, settings gear icon) and the command input bar at the very bottom are always visible during gameplay.
- **Panel-based layout.** The UI is composed of panels that can be shown, hidden, or resized. Panels slide in from the sides or overlay with a dark scrim.

---

## Screens / Pages

Design all of the following screens as separate Figma pages/frames:

---

### 1. Login / Register

**Purpose:** Entry point. Simple, atmospheric.

**Layout:**
- Full-screen dark background with a subtle, very faint texture or gradient (cracks in stone, faded parchment grain — not literal images, just texture).
- Centered card (480px max width) with:
  - Game title "ELLMUD" in large display serif, gold (#C9A84C), slightly tracked/spaced.
  - Subtitle: "The shards are calling." in italic serif, muted silver.
  - Two tabs: **Login** | **Register**
  - Login: Username field, Password field, "Enter the Refuge" button (gold accent).
  - Register: Username, Password, Confirm Password, "Create Shardwalker" button.
  - Minimal — no social login buttons for Phase 1.
- Below the card: a single line of atmospheric flavor text that changes (e.g., *"The ground trembles. Another shard opens."*), muted silver, small serif italic.

---

### 2. Character Select / Create

**Purpose:** Choose an existing character or create a new one. (Players may have multiple characters.)

**Layout:**
- Left panel (40%): List of existing characters as cards. Each card shows:
  - Character name (serif, gold)
  - Faction icon + name (e.g., "Ironwright Compact")
  - Skill summary (top 3 skills as small badges)
  - Last played date (muted)
  - "Enter Refuge" button
- Right panel (60%): Character creation form (shown when "New Shardwalker" is selected):
  - Name input
  - Faction selector (three faction cards with icon, name, short description, specialty)
  - Starting loadout preview (purely cosmetic for Phase 1)
  - "Create" button
- Background: Same dark atmospheric style as login.

---

### 3. The Refuge — Hub Screen

**Purpose:** The persistent safe zone between shard runs. This is where players spend 30-50% of their time. It should feel like a **living place**, not a menu.

**Layout — Three-column:**
- **Left column (25%):** Navigation / Activity Panel
  - Vertical tab list: Stash, Loadout, Crafting, Marketplace, Factions, Contracts, Shardboard
  - Each tab has a small icon + label
  - Below tabs: "Ambient Events" feed — a scrolling text area showing NPC activity, weather changes, faction news. Small serif italic text, muted. (e.g., *"A hooded merchant sets up shop near the eastern gate." / "Rain begins to fall across the Refuge."*)
- **Center column (50%):** Context Panel — changes based on selected tab:
  - **Stash tab:** Grid/list of items. Each item shows: name (color-coded by tier), type icon, durability bar, weight. Drag-to-loadout or click to inspect. Filter/sort controls.
  - **Loadout tab:** Paper-doll-style text layout. Slots: Weapon (primary), Weapon (secondary), Armour (head, chest, legs, hands), Consumables (4 slots), Tools (2 slots), Shard Key slot. Each slot shows the equipped item name or "[empty]". Stats summary below.
  - **Crafting tab:** Recipe list (left sub-panel), selected recipe details (center sub-panel showing required materials, skill check, output), "Craft" button.
  - **Marketplace tab:** Listings table: Item offered, Item wanted, Seller (anonymous handle), Time remaining. "Post Listing" button.
  - **Factions tab:** Current faction, reputation bar, rank, available perks, faction description. Links to rival factions (greyed out, showing "Switch faction" with cost warning).
  - **Contracts tab:** Available contracts as cards: objective, reward, deadline. Active contracts shown at top with progress bars.
  - **Shardboard tab:** (see next screen — this is the shard selection UI)
- **Right column (25%):** Social & Chat Panel
  - Refuge-wide chat (proximity-based in the hub)
  - Chat input at bottom
  - Above chat: "Players nearby" list (just character names and faction icons)
  - Trade request notifications appear here

---

### 4. Shardboard (Shard Selection)

**Purpose:** The bulletin board where players choose which shard to enter. Critical pre-run screen.

**Layout:**
- A styled "bulletin board" aesthetic — cards pinned to a dark surface.
- Each shard entry is a card showing:
  - **Shard name** (procedurally generated, e.g., "Ashen Reach — Flooded Crypt") in serif gold
  - **Tier badge:** Tier 1 / 2 / 3 (color-coded: white/blue/purple)
  - **Biome icon + name** (Flooded Crypt, Shattered Bastion, Fungal Deep, Ember Rift, Hollow Archive)
  - **Modifiers** as small tags/chips (e.g., "Dense", "Hunted", "Dark")
  - **Player slots:** "2/4 players entered" — a simple fill indicator
  - **Time remaining in entry window** (countdown)
  - **Shard Key cost** (which key type is required)
  - "Enter Shard" button (gold, prominent)
- Filters at top: By tier, by biome, by modifier.
- A small "Rumoured Loot" section per card — vague hints: *"Scouts report anomalous readings near the central chamber."*

---

### 5. Shard Exploration — Main Gameplay Screen

**Purpose:** This is THE primary screen. Players spend 60%+ of gameplay time here. It must be **beautiful, readable, and functional** simultaneously.

**Layout — Split-panel, single screen:**

- **Narrative Panel (70%, left/center):**
  - A large, scrollable text area that displays all game narration. This is the "book" of the game.
  - Room descriptions appear as distinct prose paragraphs with a subtle separator (thin gold line or extra whitespace) between events.
  - **Room title** at top of each new room entry: name in serif gold, with exits listed below as subtle teal-colored clickable links (e.g., "Exits: [north] [east] [down]").
  - Combat narration appears inline — short, punchy lines (1-3 sentences per tick). Damage/status text uses color subtly: blood-red for hits taken, muted gold for hits dealt, emerald for heals.
  - Traces and sound cues appear in italic, slightly indented, muted silver. (e.g., *"You notice faint boot prints leading east, still damp."*)
  - **Important:** Text should feel like reading a novel — not a data dump. Generous whitespace, paragraph breaks, typographic contrast between narration types.
  - At the very top of the narrative panel: a **room header bar** showing the current room name and a subtle shard stability indicator (a thin bar that fills from green to amber to red as the shard destabilizes).

- **Sidebar (30%, right):**
  - **Character Status** (top section):
    - HP bar (horizontal, red fill on dark background, no numbers — qualitative: "Healthy" / "Wounded" / "Critical")
    - Status effects as small text tags (e.g., "Bleeding (light)", "Shard-sick")
    - Stance indicator: "Cautious" / "Aggressive" / "Stealthy"
  - **Quick Inventory** (middle section):
    - Equipped weapon(s)
    - Consumables (with use count)
    - Clickable to use (or type "use bandage" in the command bar)
  - **Collapse Timer** (prominent):
    - Countdown displayed prominently. Starts white, turns amber at 50%, turns red at 25% ("Destabilising"). Pulses gently in red phase.
  - **Sound Cues** (bottom of sidebar):
    - A small feed of recent directional sounds: "Scraping metal — from the north" / "Footsteps — east, fading". These are ephemeral — they fade out after a few seconds.
  - **Mini-actions** (contextual buttons):
    - "Look", "Listen", "Inventory" as quick-access buttons for players who prefer clicking over typing.

- **Command Input Bar (bottom, full width):**
  - Monospace input field, styled like a terminal prompt.
  - Prompt character: `>` in gold.
  - Placeholder text: "Type a command..." in dark grey.
  - Auto-complete hint appears above the input (ghost text showing the most likely command completion).
  - Command history: Up/down arrows cycle through previous commands.
  - The input bar is always visible and always focused. This is the primary interaction point.

---

### 6. Combat Mode (Overlay on Exploration Screen)

**Purpose:** When combat starts, the exploration screen transforms subtly — it doesn't navigate away.

**Changes from Exploration view:**
- **Combat banner** appears at the top of the narrative panel: "⚔ COMBAT" in a thin, wide banner with a blood-red accent line. Shows current tick number.
- **Tick timer:** A small countdown bar (1 second) that fills and resets each tick. Shows the player they have limited time to input an action.
- **Action quickbar** appears above the command input: a row of buttons for the 8 combat actions:
  - Strike | Heavy Strike | Dodge | Block | Use Item | Skill | Flee | Observe
  - Each button has a small icon and label. Clicking sends the command. Keyboard shortcuts shown as small superscript (e.g., `1` for Strike, `2` for Heavy Strike, etc.)
- **Enemy status** appears in the sidebar:
  - Target name (from prose description, e.g., "Drowned Revenant")
  - HP tier (text: "Uninjured" → "Wounded" → "Badly Wounded" → "Near Death")
  - Current telegraphed action (if player used Observe): "Winding up a heavy strike"
- **Combat log** in the narrative panel shows tick-by-tick results in compact form:
  - *"You lunge forward with your blade — the revenant staggers. [Tick 3]"*
  - *"The revenant's claws rake your shoulder. Blood wells from the wound. [Tick 4]"*
- When combat ends, the combat banner and action quickbar fade out, returning to exploration mode.

---

### 7. Inventory / Loadout Detail Screen

**Purpose:** Full inventory management. Accessible from the sidebar "Inventory" button or by typing `inventory`.

**Layout — Full overlay panel (slides in from right, 60% width):**
- **Two sections:**
  - **Carried items** (top): List of everything the player is carrying in this shard run. Each item: name (tier-colored), type, durability, weight. Contextual actions: Equip, Drop, Use, Inspect.
  - **Equipped gear** (bottom): Slot-based layout matching the Refuge loadout screen. Shows current weapon, armour, consumables.
- **Item inspect panel** (right sub-panel when an item is selected):
  - Item name (tier-colored, serif)
  - Flavor text (italic, from LLM — e.g., *"A halberd corroded by centuries of standing water. The edge is still keen enough to wound."*)
  - Stats: Damage range, armour value, durability, weight, special properties.
  - **No raw numbers for the player** — stats shown qualitatively: "Moderate damage", "Heavy", "Durable". (The actual numbers exist but are described in prose.)
- **Weight indicator:** Total carried weight vs. capacity as a simple bar.
- **Close button** or press `Escape` / type `close` to dismiss.

---

### 8. Extraction Screen

**Purpose:** The climactic moment — extracting from the shard with your loot.

**Layout — The exploration screen, but with an extraction overlay:**
- **Extraction ritual progress** appears as a large, centered progress bar overlaying the narrative panel:
  - Label: "Extraction Ritual — Hold Your Ground"
  - Multi-phase progress bar filling over several ticks.
  - Each phase is narrated in the text: *"You begin tracing the extraction sigil on the ground. The air crackles..."*
  - The bar pulses gently. Below it: "Noise generated: HIGH — nearby entities may investigate."
- **Sound cues intensify** during extraction — the sidebar shows increasing sounds from approaching creatures/players.
- **On success:** Narrative text announces the extraction. A brief **Run Summary** overlay appears:
  - "Extraction Successful" in gold serif
  - **Items extracted:** list with tier colors
  - **XP gained** (qualitative: "Significant combat experience")
  - **Contracts completed** (if any)
  - **Time in shard / Rooms explored / Creatures defeated** (simple stats)
  - "Return to Refuge" button
- **On failure** (death): Different summary — items lost, shard-sickness acquired, "Return to Refuge" button.

---

### 9. Chat & Social Panel

**Purpose:** Communication with other players. In shards, this is proximity-based. In the Refuge, it's hub-wide.

**Layout — Right-side sliding panel (can overlay or replace the sidebar):**
- **Chat tabs:**
  - "Proximity" (default in shards — only players in the same room can see messages)
  - "Whisper" (direct message to a player you can see)
  - "Refuge" (hub-wide, only available in Refuge)
  - "Squad" (only available if in a squad)
- **Chat messages:**
  - Player speech styled differently from game narration: quoted, with a speaker description (not name — in shards, it's "A figure in dark leather says:" and in Refuge it's the character name).
  - System messages in muted grey.
  - Emote actions in italic: *"A hooded figure bows deeply."*
- **Trade interface** (accessible via chat panel when two players are in the same room in the Refuge):
  - Offer panel: drag items or type `offer <item>`.
  - Counterparty's offer panel.
  - "Confirm" / "Cancel" buttons.

---

### 10. Leaderboard & Contracts

**Purpose:** Competitive and objective tracking.

**Layout — Full-screen overlay (accessed from Refuge navigation):**
- **Tabs:** Seasonal Leaderboard | Personal Stats | Active Contracts
- **Leaderboard:**
  - Table: Rank, Player Name (or anonymous handle), Faction, Shards Completed, Items Extracted, PvP Encounters Survived.
  - Current player's row highlighted in gold.
  - Faction leaderboard tab (collective progress).
- **Personal Stats:**
  - Runs completed, survival rate, favorite biome, total items extracted, longest streak.
  - Simple, clean stat cards.
- **Active Contracts:**
  - Contract cards: objective description, reward, deadline, progress bar.
  - "Abandon Contract" option (with cost warning).

---

### 11. Settings

**Purpose:** Player configuration.

**Layout — Full-screen overlay, left sidebar + right content:**
- **Setting categories (left):** Account, Display, Narration, Audio, Keybinds, Accessibility
- **Narration settings (important for this game):**
  - Verbosity: Terse / Standard / Verbose (radio buttons with preview text showing the difference)
  - Narration style: "Default" / "Gothic" / "Noir" / "Clinical" (cosmetic LLM prompt variations — premium feature)
- **Display settings:**
  - Font size slider for narrative text
  - Panel layout options (sidebar left vs right)
  - Color contrast mode (higher contrast variant for accessibility)
- **Keybinds:**
  - Rebindable command aliases table
  - Combat quickbar key assignments
- **Accessibility:**
  - Screen reader mode toggle
  - Disable color-dependent information
  - Animation reduction

---

## UI Component Patterns

### Text Styling in Narrative Panel
- **Room descriptions:** Full paragraphs, standard serif text, warm bone white.
- **Combat results:** Short lines, slightly bolder. Hits taken in desaturated red, hits dealt in muted gold, dodges/misses in silver.
- **Sound cues:** Italic, muted, indented with a "🔊" or subtle ear icon.
- **Trace descriptions:** Italic, muted silver, with a subtle "👁" or eye icon.
- **System messages:** Monospace, small, muted grey. (e.g., "You can't go that way." / "Command not recognized.")
- **NPC speech:** Quoted, in a slightly different font weight or subtle left-border accent.
- **Player speech:** Quoted with speaker description prefix.

### Buttons
- **Primary action** (Enter Shard, Confirm Trade, Extract): Gold background (#C9A84C) with dark text. Subtle hover glow.
- **Secondary action** (Cancel, Close, Filter): Outlined, muted silver border. Fill on hover.
- **Danger action** (Drop Item, Abandon Contract): Red-tinted outline. Confirmation dialog on click.
- **Ghost action** (sidebar quick-buttons like Look, Listen): No border, just text. Subtle underline on hover.

### Cards
- Dark charcoal background (#12131A) with 1px border of muted grey (#2A2B35). Subtle shadow.
- Hover: border brightens to muted gold. No aggressive animations.
- Item cards show a colored left-border accent matching the item's tier.

### Bars (HP, Durability, Progress)
- Thin (4-6px height), rounded, on dark track.
- HP: Red fill. No numbers. Segments or gradient from green → amber → red based on percentage.
- Durability: Grey fill. Degrades visually.
- Extraction progress: Gold fill, pulsing gently.
- Collapse timer: Starts white/green, transitions through amber to red with a pulse animation in final 25%.

### Modals / Dialogs
- Dark scrim overlay (80% opacity black).
- Centered card with content. Max width 600px.
- Used sparingly — only for confirmations, item inspections, and trade confirmations. The game avoids modal interruptions.

### Tooltips
- Small, dark, with a subtle gold border. Appear on hover after 300ms delay.
- Used for item names, skill descriptions, modifier explanations.

---

## Responsive Behavior

- **1440px+ (desktop):** Full three-column Refuge, full split-panel Exploration. Optimal experience.
- **1024px (tablet landscape):** Sidebar collapses to icons; can be expanded on tap. Narrative panel takes more space.
- **768px (tablet portrait):** Single-column layout. Sidebar becomes a bottom sheet that slides up. Navigation becomes a hamburger menu.
- **< 768px (phone):** Simplified single-column. Command bar at bottom. Narrative text fills the screen. All panels are full-screen overlays. Functional but not the primary target.

---

## Design Notes for Figma AI

- Generate this as a **multi-page Figma prototype** with clickable navigation between screens.
- Use **auto-layout** and **component variants** where possible (button states, item cards by tier, etc.).
- The Exploration screen (Screen 5) is the most important — spend the most design effort here. It should feel immersive, like a premium reading app crossed with a game HUD.
- Include **sample narrative text** in the exploration view — don't use lorem ipsum. Use dark fantasy prose like: *"The stairwell descends into brackish water. Your torch sputters, casting long shadows across the walls. Something has been carved into the stone above the waterline — recent, by the look of it. The air smells of iron and rot. Exits lead north, into deeper water, and back east the way you came."*
- Include sample combat text: *"You drive your blade forward — the revenant twists aside, but not quickly enough. Steel bites into waterlogged flesh. The creature shrieks, a sound like tearing cloth."*
- The overall feel should be: **"What if Kindle, Notion, and Dark Souls had a baby that was a text game."**

---

Updated history and posted a team decision about the design language choices. The prompt covers all 11 screens (login through settings), specifies the dark fantasy color palette, terminal-modern typography hybrid, and the critical single-screen split-panel layout for the main gameplay view. The design language is rooted directly in the GDD's text-primary, web-only, accessible-by-design requirements.