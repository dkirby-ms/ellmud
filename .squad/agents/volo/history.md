# Volo — History

## Project Context

- **Project:** Ellmud — PvPvE Extraction RPG / Real-Time MUD
- **Stack:** Node.js, WebSocket/SSH, LLM integration for narrative
- **What:** Procedurally generated shard instances, tick-based combat, server-authoritative game state, LLM narration layer
- **User:** dkirby-ms
- **GDD:** GDD.md (comprehensive design document covering all game systems)

## Learnings

### 2026-04-05 (Round 4): LLM Narration Toggle (PR #295)
- **Task:** Implement ENABLE_LLM_NARRATION environment variable toggle for LLM narration
- **Solution:** Added boolean flag to config that gates LLM client instantiation in NarrationService factory. When false, service operates in template-only mode (no LLM calls, instant responses).
- **Implementation:** Updated `createNarrationService()` factory to check config flag before wiring Azure AI transport. Added graceful fallback: if flag is false OR credentials missing, use templates.
- **Tests:** 9 new tests covering: toggle on/off states, cache behavior with toggle, fallback logic, timeout handling with toggle disabled
- **Integration:** Seamlessly combines with fire-and-forget pattern from PR #292. Users can now disable LLM entirely if needed (dev/test environments, cost control, etc.)
- **Team coordination:** Works with Jarlaxle's ability system — Heavy Strike/Block narration will use fire-and-forget pattern regardless of toggle state.
- **Key lesson:** Feature toggles for expensive services should gate the service instantiation itself (factory pattern), not individual calls. Cleaner, more testable, better performance (no redundant config checks at call time).

### 2026-04-05: Fire-and-Forget Narration Pattern (PR #292 Revision)
- **Task:** Fixed blocking narration call in ZoneRoom.onJoin() per Elminster's review feedback
- **Problem:** `await this.generateNarration()` blocked player connections for up to 2 seconds (cache miss + LLM timeout)
- **Solution:** Changed to fire-and-forget pattern — removed await, added `.then()` for delivery and `.catch()` for error logging
- **Impact:** Player join now completes immediately, narration arrives asynchronously 0-2000ms later
- **Core principle validated:** GDD §4.5 — "LLM never blocks critical path"
- **Test fix:** Updated `rooms.test.ts` to wait 1000ms and find system narration in message array (order no longer guaranteed)
- **Minor fix:** Corrected typo `narratonType` → `narrativeType` in parameter naming
- **Team lesson:** When integrating LLM calls, always check if the call is on a critical path (join, command response, state update). If yes, use fire-and-forget with proper error handling. The fallback text serves as immediate feedback; LLM enrichment arrives when ready.

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

### 2026-04-05: NarrationService Wired into ZoneRoom Runtime (Issue #277, Jarlaxle)
- **Impact to your domain:** NarrationService now has a runtime instantiation pattern in ZoneRoom via factory function
- **Factory pattern:** `createNarrationService()` conditionally creates LLMClient based on Azure AI env vars (graceful degradation in dev/test)
- **Entry narration integrated:** Room entry now generates LLM prose via `generateNarration()` helper with rich NarrationContext
- **What this means for you:**
  - Your pipeline (LLMClient, cache, validation, fallback) is now **operational at room runtime** — entry narration is the proof-of-concept
  - Next expansion points are ready: room descriptions (`look`), combat actions, movement events, sound/trace — each requires building appropriate NarrationContext
  - Cache is wired; telemetry is flowing; template fallback is active
  - Minsc/Regis can check `config.azureAI` to determine LLM availability in client UI settings
- **Architecture note:** Factory approach is clean and testable — config reading happens once at instantiation, not per-call. Redis cache can be wired similarly.
- **Tests:** 7 integration tests passing (Azure config, no-config, LLM available, LLM unavailable, context building, timeout fallback, cache tracking)
- **PR #292 status:** Ready for review

---

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

## 2026-03-21: Rules of Hooks Fix — Refuge.tsx

**Session:** Post-wave-7 sprint fixes  
**Status:** ✅ COMPLETE

**Issue:** Rules of Hooks violation in Refuge.tsx (lines 78–130)

**Problem:**
- `useCallback`, `useReconnection`, `useRef`, and `useEffect` called **after** conditional early return
- Code pattern: `if (!state.authenticated) return <Navigate ... />`  then hooks below
- Impact: React crash ("Rendered more hooks than during the previous render") on logout/token expiry
- This is a runtime crash that breaks the application when user transitions unauthenticated

**Root cause:** Redundant auth guard in Refuge component

**Solution:** Removed redundant conditional return entirely

**Reasoning:**
- Refuge route already wrapped in `ProtectedRoute` in routes.ts
- ProtectedRoute handles unauthenticated redirection (to login)
- Duplicate guard in Refuge component was both unnecessary and harmful
- Component can now render–unmount–remount without hook count changing

**Result:**
- All hooks at component root level
- No conditional returns before hooks
- Auth flow unchanged (ProtectedRoute still handles redirect)
- Component complies with React Rules of Hooks
- Ready for merge with blocker #2 fix (combat actions)

**Files modified:**
- `packages/client/src/pages/Refuge.tsx`

**Lock:** Drizzt (original author) — no conflicts

### 2025-07-25: Auth/Error Boundary Hardening (Code Review Fixes)
- **Item 1 — Admin route auth guards:** Wrapped all `/admin/*` routes with `ProtectedRoute` layout route in `routes.ts`, mirroring the existing game-route pattern. Unauthenticated users now get redirected to login for admin pages.
- **Item 2 — Token validation on page load:** Added two-layer token validation: (a) global 401 interceptor in `api.ts` that fires `onAuthError` callback on any 401 response, and (b) `validateToken()` probe that hits `GET /auth/me` on mount. App.tsx registers the 401 handler to dispatch LOGOUT. Server doesn't have `/auth/me` yet — the probe is optimistic (non-401 = keep token), and the 401 interceptor catches stale tokens on the first real API call.
- **Item 3 — Error boundaries:** Created `ErrorFallback` component using `useRouteError` from React Router. Applied via `ErrorBoundary` prop on both game and admin route groups. Uses Ellmud dark-fantasy palette (#0A0B0F bg, #C9A84C gold heading, #3A7D7B teal link). Shows error message + "Return to Refuge" link.
  - **Key pattern:** Tokens are opaque UUIDs (not JWTs), so client-side expiry checking isn't possible. Server-side `/auth/me` endpoint is the right follow-up to make the mount-time validation actually effective.
  - **Files modified:** `routes.ts`, `App.tsx`, `services/api.ts`, new `components/ErrorFallback.tsx`

### 2026-03-21: Theme Token Migration Batch 1
- Migrated hardcoded hex values in core client pages/components to Tailwind theme tokens from `theme.css` (`@theme inline`).
- Replaced inline `fontFamily` styles with `font-serif`, `font-sans`, and `font-mono` utilities for consistent typography.
- Swapped dynamic tier/status colors to CSS variable tokens to keep runtime styles on the same palette.

### 2025-07-26: UX Batch 2 — Combat & Sidebar Polish (PR #104)
- Implemented 10 UX gaps from Elminster's design alignment review for ShardExploration screen.
- **State extensions:** Added `combatSubtype` to `TerminalMessage`, `StatusEffect` interface, `statusEffects`/`playerHp`/`playerMaxHp` to `AppState`.
- **Key pattern: health state derivation** — Single `healthState` computed from `playerHp/playerMaxHp` ratio, returns label/color/barColor/pulse. Used in both top bar and sidebar for DRY rendering.
- **Key pattern: direction highlighting in sound cues** — Regex-based text splitting with `exec()` loop produces mixed text/JSX array. `data-sound-cue` attribute enables scoped RTL queries.
- **Test spec bug found:** Anticipatory test for Gap #21 uses `getByRole('button', { name: /Strike/i })` which matches both "Strike" and "Heavy Strike" buttons via substring regex. RTL's `matchRegExp` is `regex.test(text)` — no exact matching. Test needs anchored regex (`/^Strike$/i`) or `getAllByRole`.
- **23/24 tests passing**, 0 type errors, 0 lint errors.

### 2026-03-22: Wave 2 Sensory Narration Templates (Branch: feat/sensory-narration-templates)
- **Prompt templates + fallback narration** for Sound, Trace, and Awareness systems
- **LLMNarrationType extended:** Added `sound_narration`, `trace_narration`, `awareness_narration`
  - Sound: 40 tokens, 500ms timeout (distant/nearby/same-room variants)
  - Trace: 60 tokens, 600ms timeout (low/medium/high skill scaling)
  - Awareness: 50 tokens, 500ms timeout (vague/partial/full detection)
- **System prompts per narration type** in `llm-client.ts` — Sound emphasizes direction/quality, Trace emphasizes skill scaling, Awareness emphasizes stealth vs observer awareness
- **Fallback templates in sensory-templates.ts** — 34 functions generating atmospheric prose without mechanical leakage
  - Sound: direction phrases + intensity qualifiers (faint/moderate/loud)
  - Trace: age descriptors (fresh/recent/old/fading) + skill-scaled detail
  - Awareness: randomized equipment descriptions (never player names)
- **CRITICAL safeguard:** Player names never revealed in any narration. All descriptions use equipment, bearing, and posture.
- **Integration schema documented** for Sound, Trace, Awareness systems — how to invoke `narrationService.narrate()` with context
- **Files changed:** 
  - `packages/shared/src/narrative-types.ts` — Extended LLMNarrationType and NarrationTimeoutConfig
  - `packages/server/src/narrative/sensory-templates.ts` (new) — ~450 lines of fallback generators
  - `packages/server/src/narrative/templates.ts` — Added 3 renderers to RENDERERS map
  - `packages/server/src/narrative/llm-client.ts` — Added 3 system prompts, `getSystemPrompt()` selector
  - `packages/server/src/__tests__/narration-pipeline-integration.test.ts` — Fixed timeout config spread syntax
- **Key pattern: sensory data via traces field** — Sound and Traces populate `room.traces[]` with `type`, `direction`, `source`, `intensity`, `age_seconds`. LLM and fallback read this unified interface.
- **Cache inheritance:** Sensory narration uses same hash → cache → LLM → template pipeline. State hash includes sensory trace data, so identical sensory input = identical prose = consistent atmosphere.
- **Testing:** Type-checked all narrative files; shared package builds cleanly. Ready for Sound/Trace/Awareness systems to populate context and invoke pipeline.

---

## Phase 2: Feature Implementation & Fixes (2026-03-23)

### PR #123 — Refuge Ambient (REJECTED→REJECTED→APPROVED)
**Status:** ✅ Merged to dev
**What:** WeatherSystem, NPCSystem, AmbientSystem, 180+ narration templates
**Tests:** 76 Weather + 84 NPC + 38 Ambient = 198 total
**Rejection 1:** Stale DowningSystem/ShardSickness exports (merge artifact from other PRs)
**Rejection 2:** TypeScript build failure (WeatherSystem enum type mismatch)
**Approval:** After Jarlaxle removed stale exports + Drizzt fixed enum types

### Fixed PR #122 (Jarlaxle+Drizzt Locked)
**What:** Rebased feat/pvp-combat on dev, resolved 3 merge conflicts
**Result:** PR #122 ready for final review (0 regressions)

### Phase 2 Complete
- ✅ 1 feature authored, 1 fix executed
- ✅ 198 tests for Refuge ambient systems
- ✅ Template fallback narration primary, LLM enhancement wired
- ✅ NarrationType 'ambient' added to shared types for client

---

## Phase 2.5: Admin Panel Wiring (2026-03-23)

**Status:** Planning  
**Orchestration Log:** `.squad/orchestration-log/2026-03-23T18-45-00Z-elminster.md`

### Context

Minsc (Tester) audited all 25 React admin pages and found the entire UI is cosmetic — zero API calls, 27 dead buttons, all mock data. Elminster (Lead) decomposed findings into 12 well-scoped GitHub issues (#128–139) grouped by functional area and dependency chain.

### Phase 2.5 Issues (New Labels: `phase:2.5`, `admin`)

| # | Title | Owner | Depends On | Status |
|---|-------|-------|-----------|--------|
| 139 | **FOUNDATIONAL: Content CRUD API** | Drizzt | — | 🔴 P1 Blocker (Design review pending) |
| 128 | Wire Creatures List + Detail | TBD | #139 | ⏳ Blocked by #139 |
| 129 | Wire Items List + Detail | TBD | #139 | ⏳ Blocked by #139 |
| 130 | Wire Biomes List + Detail + Stubs | TBD | #139 | ⏳ Blocked by #139 |
| 131 | Wire 6 Remaining Detail Pages | TBD | #139 | ⏳ Blocked by #139 |
| 132 | Wire Dashboard | TBD | #139 | ⏳ Blocked by #139 |
| 133 | Deploy Page Implementation | TBD | — | ⏳ P3 |
| 134 | User Management | TBD | — | ⏳ P3 |
| 135 | Audit Log | TBD | — | ⏳ P3 |
| 136 | Simulator Features | Jarlaxle | #128, #131 | ⏳ Blocked by #128, #131 |
| 137 | Orphan Endpoints Finalization | Drizzt | #131 | ⏳ Blocked by #131 |
| 138 | Stub Pages + Layout Features | TBD | — | ⏳ P3 |

### Your Assignment (Volo)

Phase 2.5 introduces 12 admin panel wiring issues. Your likely work:
- **#128–131:** Wire React admin detail/list pages to Content CRUD API (depends on Drizzt's #139)
- **#132:** Dashboard wiring (metrics, recent changes, pending reviews)
- **#138:** Stub pages, layout features, notification bell
- Possibly: User management UI (#134) if needed

All client work depends on Drizzt completing #139 (Content CRUD API) first. Begin planning/design once #139 endpoint design is approved.

### Decision Documents

- **Minsc's audit findings:** `.squad/decisions/inbox/minsc-admin-audit.md`
- **Elminster's decomposition:** `.squad/decisions/inbox/elminster-phase25-admin.md`
- **Merged to:** `.squad/decisions/decisions.md` (2026-03-23 section)

### Execution Sequence (Recommended)

```
PHASE 1 (Foundational):
  #139 ← Drizzt must complete first

PHASE 2 (Detail Pages + Dashboard):
  #128, #129, #130, #131 (depend on #139) — **your client work**
  #132 (Dashboard wiring, depends on #139) — **your work**
  #135 (Audit Log, independent)

PHASE 3 (Supporting Features + Management):
  #134 (User Management, independent, possibly your work)
  #136 (Simulators, depends on #128 + #131, Jarlaxle)
  #137 (Orphan endpoints, depends on #131, Drizzt)

PHASE 4 (Polish):
  #133 (Deploy)
  #138 (Stubs + Layout, **your work**)
```

### Key Pattern: Content CRUD API (#139)

From Elminster's decomposition, all detail pages follow this pattern:

```javascript
// Detail page wiring pattern
useEffect(() => {
  fetch(`/admin/api/${entity}/${id}`).then(setFormData)
}, [id])

const handleSave = () => {
  fetch(`/admin/api/${entity}/${id}`, { 
    method: 'PUT', 
    body: formData 
  }).then(...).catch(...)
}
```

Wait for #139 endpoint design approval before implementing client side.

---

## 2026-03-23: Milestone — Entity Wiring Complete

**Status:** Entity wiring phase concluded.
- **Issues closed:** #128–#131 (all entity-related work)
- **PRs merged:** #141–#145
- **Outcome:** Admin dashboard fully functional for all entity types

**Next:** Phase 2.5 continues; entity wiring closed.


---

## 2026-03-24: Documentation Refresh for Phase 2/2.5 Completion

**Task:** Comprehensive README and docs refresh to reflect Phase 2/2.5 completion (PR #153)

**Outcome:** ✅ Complete — Documentation updated across README, setup.md, and admin-guide.md

### Changes Made

1. **README.md — Major Overhaul**
   - **Quick Start:** Added Docker/PostgreSQL/Redis setup with `docker compose up -d`
   - **Architecture Diagram:** Expanded with full component flow (ShardRoom, RefugeRoom, Admin API), Entra OAuth auth flow, and design principles
   - **Tech Stack:** Updated from "Redis planned" → Redis (implemented), "In-memory cache" → Redis, added "Admin UI: React + Vite"
   - **Auth:** Updated from "bcryptjs + UUID tokens" → "Microsoft Entra External ID (OAuth/OIDC) + bcrypt fallback"
   - **Phase Status:** Restructured as 3 sections:
     - **Phase 1 ✅:** Solo extraction (unchanged)
     - **Phase 2 ✅:** Multiplayer shards, React client, admin dashboard, PostgreSQL, Redis (NEW)
     - **Phase 2.5 ✅:** Admin CRUD, user management, audit log, loot/creature simulators, deploy page, Entra OAuth (NEW)
     - **Phase 3 ��:** SSH client, advanced AI, PvP, procedural narrative (NEW)
   - **Environment Variables:** New comprehensive section listing all current env vars
   - **Admin Dashboard URL:** Updated from `/colyseus` to `http://localhost:3000/admin`
   - **Access Points:** Added game client (3000), admin dashboard, server health, Colyseus monitor

2. **docs/setup.md — Phase 2/2.5 Alignment**
   - **Prerequisites:** Added Docker and Docker Compose to required tools
   - **Quick Start:** Added `docker compose up -d` step; added `npm run dev:client` instruction
   - **Docker Development Services:** NEW section explaining PostgreSQL (port 5434) and Redis (port 6379) setup
   - **Database Setup:** Renamed "Phase 2" to "Phase 2+"; added "Option 1: Docker Compose" and "Option 2: Manual"; expanded migrations list to 7 (added audit log, admin users)
   - **Environment Variables:** Expanded from 9 to 20 entries; added Entra OAuth vars, USE_PG_REPOS, ADMIN_TOKEN
   - **Tech Stack Table:** Updated Redis from "planned" to "implemented"; added React/Vite/Tailwind for admin UI

3. **docs/admin-guide.md — Phase 2.5 Comprehensive Update**
   - **Intro:** Reframed as React dashboard (not just Colyseus monitor)
   - **Quick Access:** NEW section with admin dashboard URL, API endpoint, Colyseus monitor
   - **Authentication:** NEW section covering admin login, roles (content, audit, deploy, users), protected endpoints with ADMIN_TOKEN
   - **Admin Dashboard Features:** NEW comprehensive section:
     - **Content Management:** Table of 11 entity types with CRUD capabilities (creatures, items, biomes, modifiers, loot tables, skills, factions, rooms, narrative templates, contracts stub, recipes stub)
     - **Audit Log:** Real-time tracking of admin actions; filters by entity type, action, user, date range; CSV export
     - **Simulators:** Loot drop simulator (verify distribution); creature stat re-roll simulator (verify rolls)
     - **Deploy Page:** Preview diffs, deploy to staging, promote to production; requires deploy role
   - **Colyseus Monitor:** Moved down; clarified as "internal" tool for development
   - **Narration Telemetry:** Updated to reference `/admin/api/metrics` (SSE stream)
   - **Database Migrations:** Renamed "Phase 2" to "Phase 2+"; expanded from 5 to 7 migrations
   - **Phase 2 Admin Features:** Replaced with "Phase 3+ Planned Features" (player analytics, leaderboards, social, PvP, loot analysis)

### Key Decisions Documented

- **Admin Dashboard Port:** Confirmed at `http://localhost:3000` (Vite dev server on React client)
- **Docker Services:** `docker-compose.yml` already configured; docs now prescribe usage
- **Entra OAuth:** Documented as Phase 2.5-complete auth system; bcrypt fallback for local dev
- **Admin Token:** Added to env vars; defaults to random UUID, logged at startup

### Review Notes

- All changes surgical: focused on accurate reflection of implemented features
- No invention of future systems; only documented what's actually built (Phase 2/2.5)
- Cross-referenced GDD.md where relevant for design context
- Maintained existing tone and structure; extended with Phase 2/2.5-specific sections


### Seed Item Catalog Created (packages/server/src/dev/seed-items.ts)
- **40 items** covering all 10 equipment slots, all 6 rarity tiers, 3 shard keys, 4 consumables, and stash-only materials/junk
- Uses `StashItem` / `StashItemInstance` interface (the stash-side schema), matching loadout-fixtures.ts patterns
- Includes `populateDevStash()` helper that fills a player's stash via any StashRepository-compatible repo
- Includes `getSeedItemsForSlot()` and `getSeedItemsByTier()` for targeted test scenarios
- Heavy item (Waterlogged Crate, 40w) and stackable items (nails ×5, rations ×3) for capacity/overflow testing
- Total catalog base weight: 188.5 (under default 200 cap; stacking pushes past for rejection flow testing)
- **Slot acceptance alignment:** Items match SLOT_ACCEPTS — armour for head/chest/legs/feet/hands, weapon for weapon, weapon+tool for offhand, material for ring1/ring2/amulet
- **Naming convention:** kebab-case IDs, evocative 2-3 word names, 1-2 sentence MUD-terse descriptions

### 2026-03-26: Seed Item Catalog Completed
- Delivered 40 seed items in `packages/server/src/dev/seed-items.ts`
- Includes `populateDevStash()` helper for instant test population
- All items respect `SLOT_ACCEPTS` slot restrictions
- Schema uses `StashItem` interface for stash/loadout compatibility
- No production registry merge — items imported separately where needed
- Build clean, 552 tests passing, zero regressions

### 2026-03-20: GDD Comprehensive Refresh (Requested by dkirby-ms)
- **Task:** Audit and rewrite GDD.md to match live codebase (852 lines → 1,091 lines, +239 lines, +28%)
- **Critical Finding:** GDD described procedural/in-memory architecture, but codebase has evolved to **database-driven** with PostgreSQL, zone system, and admin dashboard
- **Major Corrections:**
  1. **Refuge "living world"**: GDD claimed tick-driven ambient simulation (NPC wandering, weather, merchants) — NONE of this exists. Corrected to: static zone with 7 DB-defined rooms (hearth, stash-alcove, training-grounds, shardboard, market, infirmary, war-room)
  2. **Content sourcing**: Changed from "procedurally generated" to "database-driven" (31 migrations, 9 content types in dedicated tables)
  3. **Zone system**: Added new §10.1 documenting zones/zone_rooms/zone_exits tables, hand-crafted vs procedural modes
  4. **Character system**: Added new §7.4 documenting multi-character support (1:N from players)
  5. **Client architecture**: Changed from "web-terminal client" to "React 18 + Vite with TailwindCSS, shadcn/ui, compass navigation"
  6. **Admin dashboard**: Added new §13.5 documenting full content management system (9 content CRUD views, zone management, SSE updates)
  7. **Database schema**: Added new §13.4 documenting 31-migration PostgreSQL schema with all player persistence, content, zone, and audit tables
- **Implementation Status Markers**: Added 25+ "(Implemented)" / "(Planned)" / "(Partial Implementation)" markers throughout document
- **Roadmap Updates (§17)**: Updated Phase 1 checkboxes — 13 items from ❌ to ✅ (auth, stash, combat, extraction, React client, admin dashboard, zone system, character system, etc.)
- **Stale Items Found & Fixed**: 24 critical inaccuracies identified and corrected
- **Key Architectural Patterns Documented:**
  - Repository Provider pattern: Interface + PgImpl + InMemoryImpl + Provider singleton gated by DATABASE_URL
  - Zone system: zones, zone_rooms, zone_exits tables with inter-zone travel support
  - Command system split: ShardRoom (modular Map registry) vs RefugeRoom (monolithic switch)
  - Feature-room pattern: Specific gameplay systems accessed in dedicated rooms (stash in stash-alcove, shardboard in shardboard room)
- **Database Tables Documented:** player_identities, players, characters, player_skills, player_stash, player_loadout, player_stash_capacity, player_profile, faction_membership, run_history, player_shard_sickness, auth_tokens, item_definitions, biome_definitions, creature_definitions, modifier_definitions, narrative_template_definitions, skill_definitions, loot_table_definitions, room_definitions, factions, zones, zone_rooms, zone_exits, audit_log, deploy_history
- **File paths verified:** packages/server/src/db/migrations/ (31 files), packages/server/src/content/, packages/server/src/zones/, packages/server/src/rooms/ShardRoom.ts, packages/server/src/rooms/RefugeRoom.ts, packages/server/src/commands/, packages/client/src/
- **Principle:** "Describe what EXISTS, not aspirations" — moved all aspirational content to clearly marked "Future" or "Planned" sections


### 2026-03-27T01:25Z: GDD Audit Completion & Decisions Filing
- **Task:** Full GDD.md audit and refresh to align documentation with actual implementation status
- **Deliverable:** Comprehensive decision document filed at `.squad/decisions/inbox/volo-gdd-refresh.md`
- **Standards established:**
  1. **Implementation Status Markers** — All major sections must include "(Implemented)", "(Planned)", or "(Partial Implementation)" markers
  2. **Describe Reality, Not Aspiration** — Aspirational content explicitly marked as "Future" or "Planned"
  3. **Database-First Documentation** — When documenting systems, list DB schema (tables, columns) before mechanics
  4. **Roadmap Checkpoint Updates** — Phase checkboxes kept current, not stale

- **Key correction:** Refuge zone documentation was aspirational ("living world" with tick-driven ambient simulation, NPC wandering, weather, merchants). Corrected to reflect actual implementation: static zone with 7 rooms, navigable via room-based commands, no ambient simulation.

- **Scope of changes:**
  - +239 lines of new/corrected content
  - 25+ stale sections brought current
  - Implementation status markers applied throughout
  - New sections: database schema documentation, zone system, character system, admin dashboard features

- **Impact:** GDD is now authoritative and reliable for all team members and squad agents. Eliminates confusion between aspirational design and implemented reality.

- **Status:** Master decisions.md now includes volo-gdd-refresh.md as a canonical reference for GDD maintenance standards going forward.


## 2026-03-20: Dual Exploration Modes Parity in README & GDD

**What:** Updated README.md and GDD.md to reflect that static zones (the Refuge, future hand-crafted areas) and procedural shards are **co-equal** exploration modes, not frame procedural as the primary way players explore.

**Changes made:**
1. **README.md (line 5):** Rewrote tagline from "Dive into procedurally generated shards..." to "Explore persistent zones and procedurally generated shards. Scavenge gear, fight creatures, manage your stash in the Refuge, then dive into extraction runs before collapse." — now front-loads the Refuge as the player's home base and presents both modes.
2. **README.md (line 151):** Changed "Procedural narrative expansion" to "Content expansion (more biomes, creature types, **static zones**, procedural events)" — explicitly includes static zone expansion as a Phase 3 goal.
3. **GDD.md (line 4):** Changed genre from "Procedural Dungeon Crawler" to "Dual Exploration (Static + Procedural)" — broadens the descriptor to capture both modes equally.
4. **GDD.md (lines 22-26):** Rewrote high-level vision to explicitly describe both modes: "Players live in **the Refuge**, a persistent hub where they manage gear, prepare for runs, and socialize. From there, they explore **two complementary exploration modes:** **Static zones** (like the Refuge itself, and future hand-crafted endgame areas) and **Procedurally generated shards** (temporary instances...)." — this is the authoritative narrative framing.
5. **Verified (GDD.md):** Lines 69, 87-89 already correctly list "hand-crafted zones" and "procedural assembly" as two equal shard generation modes. Lines 538-540 correctly label them "Mode 1" and "Mode 2" without hierarchy. Line 1026 accurately reflects roadmap status (hand-crafted ✅, procedural ⚠️ partial).

**Why:** User directive (dkirby-ms) — The game's identity should honor both exploration modes equally. The Refuge is not a "loading screen" or "menu"; it's a persistent zone where players live and prepare. Procedural shards are where extraction gameplay happens. Neither is "the main" mode — they complement each other and together define the player experience.

**Tone maintained:** Kept extraction RPG identity strong (shard collapse, risk, narrated prose). Static zones are presented as feature-access hubs AND as endgame content to discover. Procedural shards remain the extraction-run heart of gameplay.

**Cross-team impact:** This framing affects how the client UI, marketing, and future zone designs are conceptualized. The dual-mode identity is now canonical in the narrative docs.

## 2026-03-27T11:55Z: Documentation Parity Update Completion & Decisions Filing

**What:** Dual Exploration Modes parity decision formally filed and archived.

**Deliverable:** `.squad/decisions/inbox/volo-zones-parity.md` created and merged to `.squad/decisions/decisions.md`. No further action required on documentation updates (changes already implemented on 2026-03-20).

**Files Modified:** README.md, GDD.md (completed 2026-03-20, now archived in decisions)

**Supporting Artifacts:**
- `.squad/orchestration-log/2026-03-27T11-55-volo.md` — orchestration log
- `.squad/log/2026-03-27T11-55-docs-zone-parity.md` — session log
- `.squad/decisions/decisions.md` — updated with Volo decision + Drizzt feature-room-types + user directive

**Status:** Complete. Both exploration modes (static zones + procedural shards) are now canonically presented as co-equal in all narrative documentation. Team alignment achieved.

---

### 2026-04-05: PR #292 Fix Commit — Fire-and-Forget Pattern
**Role:** Narrative Developer  
**Task:** Fix PR #292 async narration (reviewer lockout revision)

## Status: ✅ COMPLETE — Fix committed to PR #292

### Changes

Addressed Elminster's blocking review feedback on PR #292:

1. **Pattern Correction:** Converted `await generateNarration()` to fire-and-forget in `ZoneRoom.onJoin()`
   - Removes 0-2000ms latency from player join flow
   - Aligns with GDD §4.5 requirement
   - Uses `.then()/.catch()` for proper error handling

2. **Typo Fix:** Corrected template string in entry narration fallback text
   - "You step through the rift..." → "You step through the rift into a fragment of the dying world..."
   - Matches narrative tone established in room descriptions

3. **Test Updates:** Updated `NarrationService.test.ts` and `ZoneRoom.test.ts`
   - Tests now await 1000ms+ to allow async narration delivery
   - Message arrays searched for narration events (order-independent)
   - No longer assumes synchronous narration completion

### Decision Documentation

Documented fire-and-forget pattern and team guidance in `.squad/decisions/async-narration-pattern.md`:
- When to use fire-and-forget vs await
- Examples of critical vs non-critical narration calls
- Implementation notes (error logging, test patterns)

### Status

- Fix commit pushed to PR #292
- Awaiting re-review from Elminster
- Decision documented for future team reference on async patterns in Colyseus lifecycle hooks

