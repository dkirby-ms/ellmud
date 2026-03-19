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

### 2025-07-25: LLM Narration Pipeline (Issue #9)
- **Built the full narration pipeline** at `packages/server/src/narrative/` — 8 files, 1600+ lines
- **Architecture:** NarrationService orchestrates hash → cache → LLM race → template fallback. LLM is never on the hot path.
- **State Hasher:** SHA-256 of canonicalized context (sorted keys, stripped ephemeral tick fields). Deterministic — identical states always produce the same cache key.
- **Cache:** Interface-based (`NarrationCache`) with in-memory LRU implementation (max 1000, TTL support). Redis implementation is a drop-in replacement for Phase 2.
- **LLM Client:** Transport-injected design — Azure AI Foundry via plain `fetch` (no SDK dependency). Output validation enforces GDD §4.4 contract: rejects mechanical numbers, Schema keywords, percentages.
- **Template Fallback:** Five narration types (room_description, combat_action, combat_round, movement, event) each produce atmospheric prose from state. Templates use biome-specific atmospheres, light-level descriptions, creature verbs, HP qualitative language.
- **Timeout enforcement:** AbortController-based. Combat: 800ms, exploration: 2s, hard limit: 3s. On timeout, template fires immediately, LLM continues in background to enrich cache.
- **Telemetry:** In-memory counters for cache hits/misses, LLM calls/timeouts, fallback uses, latency histogram.
- **Shared types:** `NarrationContext`, `LLMNarrationType`, `NarrationConfig` etc. in `packages/shared/src/narrative-types.ts`, re-exported from shared index.
- **Tests:** 40 tests covering hashing determinism, cache LRU/TTL, all template types, output validation, timeout fallback, background enrichment, full pipeline integration.
- **Fixed pre-existing test:** Updated shared types test to expect 5 MessageTypes (another agent added COMBAT_RESULT without updating the count assertion).

---

## Wave 4 Cross-Team Context (2026-03-19T16:32:56Z)

**Completed parallel:**
- ✅ **Drizzt Issue #12:** Username/password auth with bcrypt, JWT tokens, optional auth by default
- ✅ **Jarlaxle Issue #6:** Combat system (strike, dodge, flee), pure logic class, 1s tick loop
- ✅ **Your Issue #9:** LLM narration pipeline complete (in-memory cache, Azure AI client, fallback templates). 40 tests.

**Message types your pipeline receives:**
- From Drizzt #8 (commands): `{type: 'move', text: 'You move east', player: 'Alice', room: 'crypt-2'}`
- From Jarlaxle #6 (combat): `{type: 'combat-strike', text: 'You strike the goblin', damage: 8, target: 'goblin', attacker: 'Alice'}`
- Enrichment happens at delivery time — handlers produce template keys, NarrationService fills with flavor

**Upcoming Wave 5:**
- Jarlaxle #7: Drowned Revenant creature + AI → Your pipeline receives creature narration (movement, attacks, death)
- Drizzt #10: Extraction mechanic → Your pipeline receives extraction attempts, safe zone timers
- Minsc #13: Web Terminal Client → Your NARRATION messages are displayed line-by-line with telemetry badges

**Design contract for new handlers:**
- All handlers return `CommandResult` with narration entries: `{type: string, text: string, ...context}`
- Your NarrationService filters by `type` and selects template/context → LLM input
- No handler needs to know about narration enrichment — it's delivery-layer concern
- Keep `NarrationContext` type in sync as new action types arrive (you own the schema)
