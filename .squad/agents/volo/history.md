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
