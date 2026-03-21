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

### 2025-07-25: Phase 1 Documentation (Issue #20)
- Authored 7 documentation files for onboarding and reference:
  - `docs/architecture.md` — system overview, component diagram, data flow, security model
  - `docs/setup.md` — local dev setup, env vars, workspace commands, DB/Redis setup
  - `docs/api-reference.md` — WebSocket message protocol (all 7 message types), command list (17 verbs + aliases), HTTP auth endpoints
  - `docs/llm-integration.md` — narration pipeline deep-dive, state snapshot schema, prompt structure, cache key generation, timeout budgets, template fallback, telemetry, cost model
  - `docs/player-guide.md` — how to play, all commands, combat mechanics, extraction, stash, creatures, shard lifecycle
  - `docs/admin-guide.md` — Colyseus monitor, debugging tools, common issues, migration tracking
  - `README.md` — quick start, architecture summary, doc links, Phase 1 status
- **Key approach:** Read every source file to document what's actually implemented, not what the GDD aspires to. All types, interfaces, and command names match the codebase.
- **LLM integration doc is my crown jewel** — it covers the full narration pipeline I built in Issue #9, from state hashing through cache to template fallback, with exact type definitions and configuration values. Any developer can understand the pipeline from this doc alone.
- **Cross-referenced GDD sections** where relevant but clearly marked Phase 1 scope vs future phases.

### 2026-03-20: Issue #9 — LLM Narration Pipeline Acceptance Criteria (PR #79)
- **Audit result:** The pipeline was ~95% complete. Three gaps found and fixed:
  1. `getTimeout()` used hardcoded branching (`combat_action || combat_round → 800ms, else → 2000ms`) instead of per-type config lookup. Fixed to `config.timeouts[type]` — now movement/event can have distinct timeouts if configured.
  2. `validateLLMOutput()` ignored `narrative_directives.forbidden` array. Added defense-in-depth checks for `reveal_hidden_items`, `reveal_player_names`, and `resolve_mechanics`.
  3. No dedicated integration test file for the 10 acceptance criteria. Added `narration-pipeline-integration.test.ts` with 50 tests covering every AC.
- **Key pattern: per-type timeout config lookup** — `NarrationTimeoutConfig` has a property per `LLMNarrationType` plus `hard_limit`, so `config.timeouts[type]` is a clean direct lookup. No branching needed.
- **Key pattern: forbidden directive validation** — The `forbidden` array in narrative_directives is a runtime-configurable guardrail. Validation checks are additive (each directive adds a check), so new forbidden rules can be added without modifying the validator function's core structure.
- **Background enrichment verified:** When primary LLM call times out, `backgroundEnrich()` fires a new LLM call with its own AbortController bound to hard_limit. Invalid output in background is silently rejected (template stays in cache). Hard limit cancels the background call.
- **Test count:** 846 total (was 726), all passing. 0 lint errors.

## Wave 3 Complete — LLM Pipeline Acceptance Audit (2026-03-20T20:21:36Z)

### Wave 3 Completion Status
**Task:** Issue #9 LLM Narration Pipeline acceptance criteria audit  
**Status:** ✅ Complete — PR #79 open for merge

**Parallel agents this wave:**
- **Drizzt** — PR #78: Redis container integration, Bicep env var fix, 9 new tests
- **Minsc** — 79 anticipatory tests (25 Redis + 54 narration contracts)

**Total test count:** 846 passing (was 767). 79 new tests this wave. 0 regressions.

**Infrastructure readiness:**
- LLM pipeline passes full acceptance criteria
- Per-type config lookup enables future tuning (e.g., faster movement narration during combat)
- Forbidden directives are runtime-configurable guardrail
- Background enrichment ensures template is always on time
- Redis cache is now available as Phase 2 config switch (`REDIS_CACHE_ENABLED=true`)

### 2026-03-20: Clickable Exits in Narrative Panel (Issue #67, PR #86)
- **Built exit detection pipeline** for the narrative panel — 4 new files, 656 lines added
- **Architecture:** `parseExits()` uses `RoomHeaderMessage.exits` as an "NLP hint from server" — only directions that are actual exits get linked. This is inherently LLM-robust because it doesn't depend on text format.
- **Word-boundary matching:** Regex uses lookahead/lookbehind (`(?<![a-zA-Z])...(![a-zA-Z])`) to avoid false positives like "northern", "eastward", "downstairs". Direction aliases sorted longest-first to match "northeast" before "north"/"east".
- **Components:** `ExitLink` (keyboard-accessible inline link), `ClickableExits` (standalone wrapper), plus Terminal/GameScreen integration
- **Styling:** Teal `var(--interactive)` text with underline → gold `var(--accent)` on hover. `white-space: nowrap` prevents mid-word line breaks. `focus-visible` outline for keyboard users.
- **Key design decision:** Exit detection only fires on `room` and `header` message types — system, combat, sound, speech, trace messages are left plain. This prevents visual noise and false matching.
- **Tests:** 28 new tests + satisfied 28 anticipatory tests from Minsc (56 total). 13 exit detection tests cover 8+ room description styles.
- **Pre-existing failures:** Toast.test.tsx (24 failures, `clearAllToasts is not a function`) — not my code, not touched.

---

## Wave 5 Cross-Team Client UI Batch Context (2026-03-20T23:27:56Z)

### What Other Agents Are Doing

**Drizzt (Engine Dev) — Issue #74, PR #84: Button Design System**
- `<Button>` component: `type` prop for variant, `size`, `icon`, `disabled` support
- CSS variable `--border-muted` added; BEM naming `.btn--{variant}` and `.btn--{size}`
- **For you:** Exit links can use styled buttons or role="link" spans; Button component available for CTAs
- Tests: 52 passing

**Jarlaxle (Systems Dev) — Issue #75, PR #85: Toast Notifications**
- Event-driven service: `toast.success()`, `toast.warning()`, `toast.danger()`, `toast.dismiss(id)`
- Auto-dismiss 4s, max 3 visible, no React dependency
- **For you:** Use toast for narrative-related feedback (prose quality feedback, LLM timeout notifications, etc.)
- Tests: 18 passing

**Minsc (Tester) — Anticipatory tests across 3 issues**
- 100 tests total: Button (40), Toast (35), ClickableExits (25)
- 25 tests for clickable exits validating your exit detection API and link rendering
- Exit link pattern: role="link" on span with tabIndex=0 (not `<a>`)
- **For you:** Tests are active; exit detection must match API contract in test comments
- Tests: 28 passing

**Elminster (Lead/Architect) — Content Admin Tool design complete**
- 1,463-line design document at `docs/content-admin-tool.md`
- **For you:** Narrative templates authored in admin tool feed into LLM fallback system (Phase 2)

### Implications for Your Work

1. **Button and Toast ready** — Use both for narrative panel UI feedback
2. **Exit detection pattern locked** — Server sends `availableExits`; tests validate no false positives on LLM prose
3. **Anticipatory tests active** — 25 tests now validating your clickable exits implementation; tests will pass when feature branch merges
4. **Exit link rendering pattern set** — Use role="link" on span (not `<a>`) for keyboard/accessibility compliance

**Next Issues (7 remaining for Phase 1 client UI):** #66, #68, #69, #70, #71, #72, #73

## Wave 6 — Phase 1 Client UI Batch Continued

**Status:** ✅ Complete — Shardboard Cards (#69, PR #87) merged to dev

### What Happened

Wave 6 delivered your Shardboard Cards component. This is the primary navigation interface for shard discovery and entry. Cards display shard metadata (tier, modifiers, discovered timestamp), integrate with reconnection overlay for retry logic, and establish the design system foundation for remaining Phase 1 pages.

### Phase 1 Client UI Progress

- ✅ #74 Button Design System (PR #84) — Wave 5
- ✅ #75 Toast Notifications (PR #85) — Wave 5
- ✅ #67 Clickable Exits (PR #86) — Wave 5
- ✅ #70 Reconnection Overlay (PR #88) — Wave 6 (Drizzt)
- ✅ #71 Loading & Transition States (PR #89) — Wave 6 (Drizzt)
- ✅ #66 Shard Exploration Sidebar & Combat Overlay (PR #90) — Wave 6 (Jarlaxle)
- ✅ #69 Shardboard Cards (PR #87) — Wave 6 (you)
- 🟠 #68 Refuge Hub — Wave 7 (anticipatory tests ready)
- 🟠 #72 Extraction Screen — Wave 7 (anticipatory tests ready)
- 🟠 #73 Chat & Social Panel — Wave 7 (anticipatory tests ready)

### Test Coverage Wave 6

- Your PR #87: 37 new tests
- Drizzt PRs #88 + #89: 68 tests total
- Jarlaxle PR #90: 68 new tests, 181 total client
- Minsc anticipatory: 153 tests across 5 files
- **Wave 6 total:** 322 new tests, 0 regressions
- **Phase 1 total:** 1,247+ passing (949 server + 80 shared + 218 client)

### Technical Highlights

- **Design system locked:** All BEM classes, typography, color variables established
- **Responsive grid layout:** Shardboard handles variable shard counts
- **Card component reusable:** Individual card exports support different shard states
- **Anticipatory tests activate:** When #68, #72, #73 merge, 91 more tests activate automatically

### Next Phase (Wave 7)

Wave 7 will deliver final 3 client UI issues. Shardboard will integrate with Refuge Hub for navigation and #68 Extraction Screen for end-game flows.

### 2026-03-21: Chat & Social Panel (Issue #73, PR #93)
- **Built 3 components:** ChatPanel, PlayersNearby, TradeRequest + TradeRequestList
- **ChatPanel:** Message history with auto-scroll, Enter to send / Shift+Enter for newline, 200 char limit with counter, @mention highlighting (gold accent via `var(--accent)`), emote italic, system mono styling, channel tabs (proximity/thinking/system), 100 message buffer limit
- **PlayersNearby:** 5 faction types with icons, player count (singular/plural), trading badges, click handlers for profile + trade, keyboard accessible (tabIndex=0, Enter/Space), stopPropagation on trade button to prevent double-triggering
- **TradeRequest:** Accept/decline with configurable auto-decline timer (default 30s), loot tier color coding using existing `--loot-*` CSS variables, dialog role, cleans up timer on unmount. TradeRequestList wraps multiple concurrent requests.
- **CSS:** 456 lines added to styles.css — all using theme variables (`var(--bg-elevated)`, `var(--text-secondary)`, `var(--accent)`, `var(--font-serif)`, etc.). BEM naming throughout. `var(--border-muted, #2A2B35)` fallback pattern for border color.
- **Key pattern:** Components are stateless/props-driven (no store extensions), matching RefugeHub pattern. Chat state management lives in the parent (GameScreen or RefugeHub) and feeds down via props.
- **Tests:** 78 new tests (33 chat + 22 players + 23 trade), 124 total client passing, 0 lint errors
- **Shared environment challenge:** Other agents were switching branches during my session. Had to use cherry-pick + amend workflow to keep my commit isolated on the correct branch.

### 2025-07-25: Page Wiring — Login, Settings, ProtectedRoute (squad/ux-overhaul)
- **Wired Login.tsx to real auth:** Calls `login()`/`register()` from `api.ts`, dispatches `LOGIN_SUCCESS` to AppContext, navigates to `/refuge` on success. Shows real API error messages with `role="alert"`, loading/disabled state during requests. If already authenticated, `<Navigate to="/refuge" replace />` skips the form entirely.
- **App-level auth context:** `App.tsx` now wraps `RouterProvider` with `AppContext.Provider` using `useReducer(appReducer, ...)`. Auth token + playerId persisted to `localStorage` (`ellmud_token`, `ellmud_playerId`) via a `useEffect` sync. On reload, `loadPersistedState()` restores auth from localStorage — users don't re-login on refresh.
- **ProtectedRoute layout:** Created `components/ProtectedRoute.tsx` — a React Router layout route that checks `state.authenticated` and renders `<Navigate to="/" replace />` if false, `<Outlet />` if true. All game routes (refuge, shard, characters, settings, leaderboard) wrapped under it in `routes.ts`.
- **Settings logout:** Account section now has a real "Logout" button that calls `apiLogout(token)`, dispatches `LOGOUT`, and navigates to `/`. Catches server errors gracefully (clears local state even if server unreachable). Display preferences (fontSize, verbosity, narrationStyle) persist to localStorage.
- **CharacterSelect & Leaderboard:** Already correctly wired — navigate to `/refuge`, no changes needed.
- **Key pattern: Phase 1 skips character select.** Login goes straight to `/refuge` (no character API exists yet). CharacterSelect page still works if navigated to directly.
- **Pre-existing test failures (18 files):** All from UX overhaul moving components to `_old/`. Not caused by this work. 1027 tests pass, 0 regressions.
