# Volo — History

## Project Context

- **Project:** Ellmud — PvPvE Extraction RPG / Real-Time MUD
- **Stack:** Node.js, WebSocket/SSH, LLM integration for narrative
- **What:** Procedurally generated shard instances, tick-based combat, server-authoritative game state, LLM narration layer
- **User:** dkirby-ms
- **GDD:** GDD.md (comprehensive design document covering all game systems)

## Learnings

### 2026-03-19: Figma AI Design Prompt Created
- Created a comprehensive Figma Make/AI prompt for the Ellmud client UI prototype
- **Screens defined (11 total):** Login/Register, Character Select, Refuge Hub, Shardboard, Shard Exploration (main gameplay), Combat Mode, Inventory/Loadout, Extraction Ritual, Chat/Social Panel, Leaderboard/Contracts, Settings
- **Color palette:** Dark fantasy — near-black backgrounds (#0A0B0F, #12131A), muted gold accents (#C9A84C), blood red for danger (#8B2500), spectral teal for interactables (#3A7D7B), bone white for text (#E8E0D0)
- **Typography direction:** Monospace for command input (terminal heritage), serif for narrative prose (fantasy book feel), sans-serif for UI chrome
- **Key design decision:** The main gameplay view is a single-screen split layout — large narrative text panel (70%) + sidebar for status/inventory/map (30%) — not separate pages. This respects the MUD paradigm where you stay in one view.
- **Layout approach:** Responsive web-first, desktop-optimized (1440px), with mobile considerations. Dark theme only. No graphics engine — all information conveyed through styled text, iconography, and subtle UI animation.
- **Terminal-modern hybrid:** Command input bar at bottom (terminal feel), but with modern affordances like autocomplete hints, clickable exits, and contextual action buttons for accessibility.

### 2026-03-19: Figma Gap-Fill Brief Created
- Authored `docs/figma-gaps-brief.md` — a structured follow-up brief for the design team identifying everything missing from the Figma AI export
- **Key gaps identified:**
  - **4 missing screens:** Combat Mode overlay (Screen 6), Inventory/Loadout detail overlay (Screen 7), Extraction screen with success/death states (Screen 8), Chat & Social panel (Screen 9). Also: Reconnection overlay, Death screen, Loading/transition states.
  - **5 missing components within existing screens:** Shard stability indicator bar (narrative header), Sound cues panel (sidebar), Mini-action buttons (Look/Listen/Inventory), Ambient events feed (Refuge left column), Auto-complete hint (command input)
  - **Missing states/variants:** Button states (4 types × 4 states), Item cards by loot tier (5 tiers), HP bar (Healthy/Wounded/Critical), Collapse timer phases, Extraction progress bar phases, Toast/notification patterns (4 types), Empty states (6 contexts)
  - **Missing responsive breakpoints:** 1024px tablet landscape, 768px tablet portrait (mobile deferred as stretch goal)
- **What was delivered well:** 7 screens (Login, Character Select, Refuge, Shardboard, Shard Exploration, Leaderboard, Settings) — visual design is production-quality, color palette and typography are spot-on, narrative panel is immersive
- **Design authority respected:** Brief is structured as a request back to the design team, not as invented UI. Per team decision: Figma is source of truth, squad flags gaps but doesn't originate designs.
