# Elminster — History

## Project Context

- **Project:** Ellmud — PvPvE Extraction RPG / Real-Time MUD
- **Stack:** Node.js, WebSocket/SSH, LLM integration for narrative
- **What:** Procedurally generated shard instances, tick-based combat, server-authoritative game state, LLM narration layer
- **User:** dkirby-ms
- **GDD:** GDD.md (comprehensive design document covering all game systems)

## Learnings

### 2026-03-19: Colyseus Architecture Analysis
- **Decision:** Proposed adopting Colyseus 0.17.x as game-server framework with message-only client protocol (no Schema state sync to clients). Decision file: `.squad/decisions/inbox/elminster-colyseus-architecture.md`
- **Key pattern:** Colyseus supports a dual-channel architecture — Schema state for server internals + `onMessage`/`broadcast` for prose delivery. This resolves the tension between Colyseus's default state-sync model and the GDD's "prose-only client" requirement (§14).
- **Mapping:** Colyseus Room = Shard Instance (1:1). `setSimulationInterval(cb, 1000)` = 1s combat tick. Matchmaker = Shardboard. Reconnection tokens = latency tolerance model.
- **Risk identified:** Schema state leakage to clients is the critical failure mode. Must enforce at architectural level (custom client wrapper, integration tests, code review gate).
- **Risk identified:** Refuge Room scaling — single Colyseus Room caps at ~50-100 concurrent clients. Refuge needs sharding or a separate lightweight service.
- **Risk identified:** SSH/TCP support requires a gateway bridge service to proxy into Colyseus rooms.
- **Open:** Awaiting dkirby-ms input on SSH priority, Refuge architecture, admin tooling, client SDK choice.
- **Key files:** `GDD.md` (full game design), `.squad/decisions/inbox/elminster-colyseus-architecture.md` (this analysis)
- **User preference:** dkirby-ms suggested Colyseus specifically for WebSocket management, game state, and reconnect logic. Receptive to framework adoption.

### 2026-03-19: Azure Hosting Architecture
- **Decision:** Proposed full Azure architecture mapping all GDD components to Azure services. Decision file: `.squad/decisions/inbox/elminster-azure-architecture.md`
- **Platform directive:** dkirby-ms directed Azure as hosting platform and Azure AI Foundry for LLM model hosting.
- **Key services:** Container Apps (Consumption) for Colyseus game server, Azure AI Foundry serverless endpoints (GPT-4o-mini) for narrative LLM, PostgreSQL Flexible Server (Burstable B1ms) for player persistence, Azure Cache for Redis (Basic C0) for LLM cache + Colyseus presence.
- **Critical finding — LLM latency:** GPT-4o-mini TTFT (~1.75s median) far exceeds the GDD's 200ms combat narration target. Combat narration MUST be cache-first with template fallback. The LLM enriches cache asynchronously, not on the hot path. This is the single most important architectural insight for the narrative system.
- **Cost profile:** Phase 1 MVP estimated at ~$57-91/month. Container Apps scale-to-zero is critical for cost control during low-traffic periods.
- **Redis retirement risk:** Azure Cache for Redis (Basic/Standard/Premium) retiring September 2028. New creation blocked April 2026 for new customers. Migration to Azure Managed Redis (~$100-175/month minimum) is a Phase 2 cost increase to plan for.
- **LLM economics:** ~$0.006/player-hour with 50-70% cache hit rate. Content-addressable caching (SHA-256 hash of state snapshot → Redis key) is the primary cost control mechanism.
- **Phase 1 simplifications:** Single Colyseus replica, in-process matchmaker, no SSH gateway, GPT-4o-mini for all tiers, web terminal only.
- **Production-ready from day one:** Server-authoritative state, LLM template fallback, player data durability (PostgreSQL + backups), WebSocket reconnection, content-addressable cache key design.
- **Open:** Awaiting dkirby-ms input on Azure region, Redis cost tolerance, subscription/credits, Foundry access, auth strategy, custom domain, CI/CD pipeline.
- **Key files:** `.squad/decisions/inbox/elminster-azure-architecture.md` (this analysis), `.squad/decisions/inbox/elminster-colyseus-architecture.md` (Colyseus decision it builds on)

### 2026-03-19: GDD Comprehensive Architecture Update
- **Action:** Updated GDD.md to codify all architecture decisions from this session into the source-of-truth document.
- **Sections updated:**
  - §Platform — Changed to "Web browser only", removed SSH/TCP references.
  - §2.1 The Refuge — Added "The Refuge as a Living World" subsection: RefugeRoom with tick-driven ambient simulation (NPC activity, faction events, wandering merchants, weather).
  - §4.5 Caching & Performance — Complete rewrite with Azure AI Foundry specifics: GPT-4o-mini, 1.75s TTFT reality, SHA-256 content-addressable Redis cache, 3-tier timeout budgets (800ms/2s/3s), token economics (~$0.006/player-hour), narration pipeline flow.
  - §13 Technical Architecture — Major rewrite. Replaced generic architecture with concrete Colyseus 0.17.x + Azure Container Apps stack. Added ASCII architecture diagram, service map, data flow diagram, Room architecture (ShardRoom/RefugeRoom 1:1 mapping), message-only client protocol, Schema state isolation, admin dashboard design, tick model, horizontal scaling, Redis presence, deployment pipeline (GitHub Actions + Bicep), player auth strategy, custom domain.
  - §13.5 Networking — WebSocket-only via Colyseus, reconnection via allowReconnection(30-60s), disconnected players dodge.
  - §13.6 Hosting & Deployment — New section: Azure service table with Phase 1 costs (~$40-75/month with unmanaged Redis), CI/CD pipeline, Bicep IaC, region choice.
  - §14 Anti-Cheat — Updated to reference room.send("narrate") and Schema patches.
  - §17 Roadmap — All four phases updated to reflect concrete stack. Phase 1 now includes infrastructure provisioning, Colyseus scaffold, LLM pipeline, auth, admin dashboard. SSH gateway permanently removed. OAuth bolt-on moved to Phase 4.
  - §18 Open Questions — Updated LLM economics question with concrete cost data.
- **Key decisions codified:** Colyseus 0.17.x, message-only client protocol, Schema server-internal only, Azure Container Apps (Consumption), GPT-4o-mini via Foundry serverless, PostgreSQL Flexible, unmanaged Redis container, GitHub Actions + Bicep, East US 2 / West US 2, kirbytoso.xyz domain, simple auth Phase 1 with OAuth-ready schema, admin dashboard from day 1.
- **Preserved:** All existing GDD content not replaced by concrete decisions. Cardinal rule "The LLM describes; the server decides" remains in §4.1 and now also §13.1.

### 2026-03-19: GDD Roadmap Decomposition into GitHub Backlog
- **Action:** Decomposed GDD §17 Roadmap into granular, implementable GitHub issues across all four phases.
- **Output:** Two files generated in `.copilot/session-state/15d4fe47-09fd-48dd-9476-570c154a96d1/files/`:
  - **backlog-issues.json**: 81 total issues (18 Phase 1, 12 Phase 2, 16 Phase 3, 10 Phase 4, 3 cross-phase testing), each with title, body (acceptance criteria + GDD section references + dependencies), labels (phase + domain), and milestone.
  - **backlog-summary.md**: Human-readable table grouped by phase, showing issue titles, domain labels, dependencies, and scoping notes.
- **Key scoping decisions:**
  1. **Phase 1 MVP (8–10 weeks):** Solo play only. Single creature type (Drowned Revenant). Single biome (Flooded Crypt). Tier 1 shards (15–25 rooms). Focus on core loop: login → loadout → enter shard → combat → extract → stash persists. LLM narration cached or template-fallback (no combat latency). Admin dashboard wired from day 1 (Schema visibility for debugging). Message-only client protocol enforced (integration tests verify no Schema patches leak).
  2. **Phase 2 Multiplayer (6–8 weeks post-Phase 1):** Multi-player infrastructure (Redis presence + KEDA scaling). Sound propagation. Traces (footprints, blood, decay TTLs). PvP encounters. Death & downing. Ambient Refuge (NPCs, weather, faction events). WebSocket reconnection tuning. Proximity communication (say, whisper, emote). Entry: multi-replica load test + PvP smoke tests.
  3. **Phase 3 Depth (8–12 weeks post-Phase 2):** Full skill tree (6 categories, 20+ skills, use-based leveling). Crafting system (recipes, materials, quality variance). All 5 biomes. Shard modifiers (1–3 per shard). Tier 2 & 3 shards. Creature variety (5+ per biome). Faction system (reputation, rank, recipes, perks). Standalone matchmaker separation. Marketplace (direct trade + player posts). Faction world events. Contracts. Seasonal rotations. Optional: GPT-4o quality tier.
  4. **Phase 4 World (6–8 weeks post-Phase 3):** OAuth integration (GitHub, Discord, Entra ID). Anomalous-tier gear. Lore & narrative arcs. Quest chains. Refinement phase; gameplay largely complete, focus on polish and long-term engagement.
  5. **Testing:** QA issues per phase ensure progressive verification (solo → multiplayer → depth → world).
- **Dependency Enforcement:**
  - Critical path: Infrastructure (#1–3) → Colyseus scaffold (#4) + room graph (#5) → combat (#6–7) → movement (#8) → extraction (#10) → integration test (#19).
  - Phase 2 gating factor: Multi-player infrastructure (#21). After: sound, traces, awareness can parallelize.
  - Phase 3 parallelization: Skill tree + crafting independent until factions; biome work independent until faction recipes.
  - Phase 4: Mostly refinements; heavy parallelization.
- **GDD Alignment:** Every issue references relevant GDD sections (§N notation). All issues preserve core design pillars: server authority, LLM as narration layer, message-only client, Colyseus 0.17.x, Azure stack, content-addressable cache, sound as PvP detection, traces as espionage, factions as economy drivers.
- **Architecture Preservation:** Schema state leakage prevention (client integration tests), LLM fallback path (combat never blocks on LLM), tick model (1s for combat/exploration, 3–5s for background AI), reconnection tokens (30–60s window), Redis content-addressing (SHA-256 hashing state snapshots), zone of exclusion for secrets (no auth secrets in client code).
- **Risk Mitigations Embedded:**
  - Phase 1: Admin dashboard schema visibility (day 1, not retrofitted).
  - Phase 1: Message-only protocol enforced (integration tests + code review gate).
  - Phase 2: Redis presence wired Phase 1 (no rework on scale-out).
  - Phase 2: Sticky sessions explicitly tested (WebSocket routing to correct replica).
  - Phase 3: Creature behavior AI deterministic + testable (same resolution as player actions).
  - Phase 4: OAuth schema prepared Phase 1 (zero breaking changes on bolt-on).
- **Total Backlog:** 81 issues, estimated 28–38 weeks end-to-end (1 full-time dev). Linearly scalable to team size.
- **Open Questions Captured:** 5 questions for stakeholder review (Phase 1 scope, Phase 2 timing, skill respec economy, anomalous item gating, seasonal leaderboard frequency, OAuth timing).

### 2026-03-19: Figma Export Conversion Strategy
- **Action:** Audited Figma AI prototype export (`/tmp/figma-export/`) and produced comprehensive conversion strategy at `docs/figma-conversion-strategy.md`. Decision filed at `.squad/decisions/inbox/elminster-figma-conversion.md`.
- **Figma export quality:** Visual design is production-quality — colors, typography, layout proportions all match the GDD design prompt exactly. Code quality is scaffold-tier: hardcoded hex colors throughout (not using theme tokens), inline `style={{ fontFamily }}` everywhere, all data mock, zero state management or server integration. 6 screens, 3 tab components, 48 shadcn/ui primitives (mostly unused).
- **Key finding — NarrativeEntry types:** The ShardExploration component defines `room | combat | trace | sound | system | speech` entry types that map directly to the server message categories. This validates the message protocol design.
- **Key finding — Combat overlay pattern:** The conditional combat action bar rendering in ShardExploration is the correct UX pattern for transitioning between exploration and combat without leaving the narrative view.
- **Decision — Keep visual design, rewrite implementation:** The layouts and visual patterns are the reusable asset; the code logic is 100% replaced. Every page needs: mock data removed, Colyseus message handlers, state management hooks, loading/error states.
- **Decision — State management:** React Context + useReducer (no external library). The client is a thin view layer over server-authoritative state. ~10 state slices. Migration to Zustand available if needed.
- **Decision — Colyseus integration:** Message-only pattern. Client MUST NOT subscribe to `room.state`. All state via `onMessage()` handlers. Schema leakage prevention enforced at architecture level.
- **Decision — Dependency reduction:** ~55 → ~22 packages. Drop all MUI (conflicts with Tailwind), 12 unused Radix primitives, 15+ scaffold deps. Add only `colyseus.js`.
- **Decision — Theme token migration:** Phase A prerequisite. All hardcoded hex values → Tailwind theme tokens. Inline fontFamily styles → Tailwind utilities. The theme.css already defines correct tokens — page components just don't use them.
- **Decision — File placement:** `packages/client/` in monorepo. `packages/shared/` for message types shared with server.
- **Phased plan:** A (Foundation, weeks 1-2) → B (Core Screens, weeks 3-5) → C (Gameplay, weeks 6-8) → D (Polish, weeks 9-10).
- **Key files:** `docs/figma-conversion-strategy.md` (full strategy), `.squad/decisions/inbox/elminster-figma-conversion.md` (architectural decisions).

### 2026-03-19: Figma Export v2 Analysis
- **Action:** Comprehensive analysis of updated Figma export v2 responding to the gap-fill brief. Analysis document: `docs/figma-v2-analysis.md`.
- **What the design team delivered:** Three new production-quality overlay components (ChatPanel, ExtractionOverlay, InventoryOverlay) addressing §2D, §2C, §2B from the brief. Combat UI implemented inline in ShardExploration. Sound cues panel added to sidebar.
- **Coverage scorecard:** 55% of requested items fully or partially addressed (11/20), 45% missing (9/20). High-value items delivered: chat/social panel, extraction flow (all 3 states), inventory/loadout overlay.
- **Key finding — Zero new dependencies:** v2 has the exact same 55 dependencies as v1. No new bloat. All new components built with existing React/Lucide/Radix primitives.
- **Key finding — Theme tokens infrastructure added:** v2 theme.css grew from ~2K to 3.1K. Added `@theme inline` block exposing all color/typography tokens for Tailwind utilities (Tailwind v4 pattern). Tokens now cover tier colors, state colors, typography scale, font weights. BUT: No components migrated to use tokens yet — still all hardcoded hex values.
- **Key finding — Overlay architecture pattern:** All three new components use state-discriminated rendering (null | state string → different UI trees). Clean pattern for modal overlays. Props drive UI (isOpen, state, progress), callbacks for dismissal (onClose). Stateless, reusable, wire-able to Colyseus.
- **Key finding — Tier color modeling:** InventoryOverlay introduces `Item` interface with `tier` enum (common/sturdy/refined/masterwork/anomalous). `getTierColor()` function maps tier to hex. This is new modeling work (not in v1). Should be extracted to shared utils.
- **Remaining gaps:** 12 items still missing. High-priority (3): reconnection overlay, enemy status panel, tick timer. Medium-priority (4): mini-action buttons, ambient events feed, auto-complete hint, trade interface. Low-priority (5): button state variants, HP bar states, toasts, empty states, responsive breakpoints.
- **Impact on conversion strategy:** Phase C (Gameplay) shrinks from 3 weeks → 2.5 weeks due to overlay scaffolds. Total estimate: 10 weeks → 9.5 weeks (5% time savings). Phase A (Foundation) and Phase B (Core Screens) unchanged.
- **Combat UI implementation:** Combat banner (⚔ COMBAT with blood-red border), action quickbar (7 buttons with keyboard shortcuts 1-7), sound cues panel all inline in ShardExploration. No separate component. Works functionally but needs enemy status panel and tick timer added (Phase C work).
- **Decision — No further design iterations needed:** The remaining gaps are small enough to build in-house during Phase C/D. Patterns are clear from existing components. Proceed with conversion using v1 + v2 combined as design source.
- **Decision — Phase A priority:** Migrate all hardcoded hex → theme tokens BEFORE starting Phase B. The Tailwind v4 @theme inline block is ready — just need find-replace gruntwork across all components.
- **Open for Phase C:** Add enemy status panel (sidebar, during combat), tick timer (below combat banner), reconnection overlay (full-screen). Add trade interface to ChatPanel. All other gaps are Phase D polish or post-MVP.
- **Key files:** `docs/figma-v2-analysis.md` (full analysis with gap scorecard, component deep dives, theme audit, remaining gaps list).

### 2025-07-25: Wave 4 PR Reviews (PRs #80, #81, #82, #83)
- **Action:** Code review of four Wave 4 PRs. All four approved.
- **PR #80 — Stash Persistence Wiring (Drizzt, #11):** APPROVED. Clean singleton provider pattern (`stash-provider.ts`). Rooms share repository via `getStashRepository()`/`getItemDefs()`. Health and admin endpoints report backend. 14 tests. No issues.
- **PR #81 — Room Graph Topology (Jarlaxle, #5 reopened):** APPROVED. Critical fix — room types now enforce structural semantics. Dead-ends = exactly 1 exit (branched off backbone), junctions = ≥3 exits (post-distance-enforcement). Guaranteed ≥1 dead-end per graph. 7 tests across multiple seeds. Post-processing order matters: distance cuts → junction enforcement.
- **PR #82 — Creature Admin Visibility (Jarlaxle, #7):** APPROVED with minor notes. `AdminCreatureInfo` type, `/admin/api/creatures` endpoint, creature data in shard detail, SSE creature counts, dashboard HTML table. Minor: `(room as any)['creatureManager']` pattern duplicated 3 times — accessing private field for admin inspection is acceptable per GDD §13.4 but the inline type cast should be extracted to a helper.
- **PR #83 — Extraction State Messaging (Drizzt, #10):** APPROVED. All 4 EXTRACTION_STATE phases wired (started/progress/interrupted/completed). The `wasExtracting` → `isExtracting` detection pattern for 'started' is clean. `interruptAll()` return value now wired to per-player interruption messages. 9 protocol tests.
- **Cross-system assessment:** All 4 PRs modify non-overlapping code paths and are architecturally compatible. PRs #80 and #83 both touch ShardRoom.ts but in different methods — will merge cleanly. Room topology (#81) gives creature behavior (#82) meaningful patrol semantics. Extraction messaging (#83) works correctly with stash transfer (#80).
- **Lesson:** The `as any` bracket-access pattern for admin inspection of private fields is an acceptable compromise for debugging visibility, but duplication should be controlled — extract to a typed helper or add a public admin-only accessor method.

## Wave 4b Completion — PR Review Gate + All Phase 1 Server Complete (2026-03-20T22:11Z)

**Status:** ✅ Complete  
**Role:** Lead / Architect  
**Task:** Review PRs #80–#83 for architecture, cross-system integration, test coverage  
**All Approved:** No rejections, no architecture regressions

### Decisions Made

#### 1. Stash Persistence Pattern (PR #80 — Drizzt, #11)
- **Decision:** Singleton provider pattern is correct for server-wide state
- **Rationale:** Rooms consume via accessor functions; tests bypass via initStash()
- **Impact:** Extraction transfer, creature loot, persistent DB all share same repository
- **Status:** APPROVED

#### 2. Room Type Topology Enforcement (PR #81 — Jarlaxle, #5)
- **Decision:** Room types now structurally enforced
- **Semantics:** dead_end=1 exit, junction≥3 exits
- **Foundational:** Creature AI, minimap, movement all rely on these guarantees
- **Minor note:** Monitor ensureJunctionExits() at Tier 3 (60 rooms) — may need BFS caching
- **Status:** APPROVED

#### 3. Admin Dashboard Creature Visibility (PR #82 — Jarlaxle, #7)
- **Decision:** `as any` bracket-access acceptable for Phase 1
- **Follow-up:** Before Phase 2, extract to typed getAdminSnapshot() method
- **Status:** APPROVED with phase-2-note

#### 4. Extraction State Messaging (PR #83 — Drizzt, #10)
- **Decision:** `wasExtracting` detection pattern is correct
- **Why:** Decouples command handler from protocol messaging
- **Integration:** Works correctly with stash (#80) and doesn't block creatures (#82)
- **Status:** APPROVED

### Cross-System Integration Verdict
All four PRs merge cleanly to dev:
- Stash provider (#80) + extraction transfer (#83) share same repository
- Room topology (#81) enables creature patrol (#82)
- Admin dashboard (#82) reports stash backend

### Phase 1 Server Block Complete
**Issues Closed:** #2, #3, #5, #7, #9, #10, #11, #18
**Test Coverage:** 949 server + 80 shared = 1029+ passing
**Infrastructure:** Production-ready

---

**Recommendation:** Server block complete. Next: Phase 1 client UI batch (#66–#75) or Phase 2.

### 2025-07-25: Content Admin Tool Design Document
- **Action:** Created comprehensive design document at `docs/content-admin-tool.md` (1,463 lines) for a designer-facing content management tool, separate from the existing debug/admin dashboard.
- **Key architecture decision:** Content admin tool is a separate container (React + Express) in the same Container Apps Environment, sharing the PostgreSQL instance but introducing its own `content_*` tables. Does NOT use Redis — Redis remains game-server-only.
- **Content domains covered (12):** Creatures, Items, Biomes, Shard Modifiers, Loot Tables, Skills, Factions, Room Templates, Narrative Templates, Balance Constants, Contracts (Phase 4), Crafting Recipes (Phase 3).
- **Data flow:** Content Admin → PostgreSQL (content tables) → Game Server reads at startup / hot-reload / shard seeding. Atomic content snapshots for deployment and rollback.
- **Content lifecycle:** Draft → In Review → Published → Deprecated, with version history per entry and atomic deployment snapshots.
- **Integration pattern:** Game server gets `POST /admin/api/content/reload` endpoint for hot-reload. Backward compatible — falls back to hardcoded TypeScript content when content tables are absent.
- **Key files:** `docs/content-admin-tool.md` (the design document), `.squad/decisions/inbox/elminster-content-admin-tool.md` (team decision).
- **Audience:** Document is designed for UI/UX designers creating Figma mockups — includes ASCII wireframes for every major screen, field-level detail for every content type, and component descriptions.
- **GDD relationship:** This tool is NOT the admin dashboard described in GDD §13.3 (which is a debug/inspection tool using Colyseus Schema sync). This is a content authoring tool that feeds content into the game.

### 2026-03-21: UX Overhaul Code Review (squad/ux-overhaul branch)
- **Action:** Reviewed 149-file, ~21K-line UX overhaul branch. Figma SPA conversion with Tailwind CSS 4, shadcn/ui, React Router 7, and Colyseus wiring for Shard and Refuge pages.
- **Verdict:** Conditional approval — two blockers must be fixed before merge.
- **🔴 Blocker #1 — Rules of Hooks violation in Refuge.tsx:** `useCallback`, `useReconnection`, `useRef`, `useEffect` called after conditional early return. React will crash on auth state transitions. Fix: remove redundant auth guard (ProtectedRoute handles it).
- **🔴 Blocker #2 — Combat action values don't match server protocol:** ShardExploration sends display labels ("Strike", "Heavy Strike") but CombatAction expects snake_case ("strike", "heavy_strike"). Combat is non-functional. Fix: separate labels from action values.
- **🟡 Should fix:** Admin routes unprotected (no ProtectedRoute wrapper), no token validation on page load, no error boundaries, extraction_state handler registered outside connect(), reconnection "Return to Refuge" dispatches LOGOUT.
- **Architecture validated:** Message-only Colyseus protocol correctly enforced (zero Schema leakage). React Router structure sound. AppContext+RouterProvider integration correct. Token persistence pattern clean.
- **Key files:** `.squad/decisions/inbox/elminster-ux-review.md` (full review verdict).

## 2026-03-21: UX Overhaul Branch Code Review

**Session:** Post-wave-7 sprint review  
**Scope:** 149 files, ~21K lines (squad/ux-overhaul branch)

**Review focus:**
- Figma SPA conversion (11 screens, dark fantasy theme, responsive layout)
- Colyseus client integration (message-only protocol, no Schema leakage)
- React Router migration (route hierarchy, protected routes, error handling)
- Auth flow and token persistence
- Reconnection strategy and overlay integration

**Verdict:** 🟡 **CONDITIONAL APPROVAL** — Two blockers, five should-fixes, five notes

**Blockers identified:**
1. Rules of Hooks violation in Refuge.tsx (hooks after conditional return) → ✅ Fixed by Volo
2. Combat action values don't match protocol in ShardExploration.tsx (labels vs enum) → ✅ Fixed by Jarlaxle

**Should-fixes (filed as Phase 1.1+ issues):**
- Admin routes lack auth guard
- No token validation on page load
- No error boundaries
- `extraction_state` handler late registration
- Reconnection button behavior inconsistency

**Architecture findings:**
- Message-only Colyseus protocol correctly enforced throughout
- Connection service is clean single integration point
- AppContext wrapping provides context across routes
- Token persistence and reconnection patterns are sound
- Protocol contract split across `connect()` and `.then()` — consolidation recommended

**Notes for future work:**
- Hardcoded hex values (theme tokens unused) — recommend migration pass
- ShardboardTab mock data misleading to testers
- 48 shadcn/ui components with low utilization — pruning candidate
- 450 skipped tests for old components — cleanup candidate
- Bundle size optimization (code-split admin routes)

**Outcome:** Conditional approval granted. Two blockers fixed post-review. Branch ready for merge after final validation.

### 2026-03-22: Comprehensive UX Design Alignment Review
- **Action:** Full screen-by-screen audit of all 12 screens/overlays against 4 design spec documents.
- **Findings:** 38 total gaps: 2 critical, 24 moderate, 12 minor.
- **🔴 Critical #1 — Theme token adoption:** 478 hardcoded hex values across 13 files, zero theme tokens used. `theme.css` @theme inline block exists but is completely unused.
- **🔴 Critical #2 — Combat text not color-coded:** Spec requires hits dealt in gold (#C9A84C), hits taken in red (#8B2500), dodges in silver (#8A8B95). Implementation renders all combat text uniformly in bone white (#E8E0D0).
- **Screens fully aligned:** Login, Settings match spec precisely. Extraction overlay is 90%+ aligned.
- **Screens with gaps:** ShardExploration (10 gaps — most of any screen), Refuge (6 gaps, mostly Phase 2 stubs), Combat (4 gaps), all others 1-3 gaps.
- **Systemic issues:** Inline `style={{ fontFamily }}` on every text element instead of Tailwind utility classes; button state variants not systematically defined; no responsive breakpoints; no atmospheric empty states; toast notifications not styled per spec.
- **All hex values match spec:** Every hardcoded color is correct — #0A0B0F, #12131A, #C9A84C, etc. One non-spec color: #B89840 used for button hover (reasonable approximation). The palette is consistent by accident (same hex everywhere) but unmaintainable.
- **Font strategy is correct:** Serif (Crimson Text) for narrative, mono (JetBrains Mono) for commands/system, sans (Inter) for UI chrome. No font mismatches found.
- **Key files reviewed:** All 6 pages, 7 overlay/tab components, theme.css, styles.css, store.ts, App.tsx, routes.ts.
- **Decision output:** `.squad/decisions/inbox/elminster-ux-alignment-review.md`
- **Prioritized fix batches:** (1) Theme token migration, (2) ShardExploration combat/sidebar polish, (3) Overlay refinements, (4) Structural gaps, (5) Minor polish.
**Next:** Phase 2 planning — content admin tool design ready (docs/content-admin-tool.md), implement per priority.

## Learnings

### 2026-03-21: Batch A Phase 1 Client UI Review (#84–#88)
**Context:** Reviewed 5 PRs for Phase 1 client UI: Button (#84, Drizzt), Toast (#85, Jarlaxle), Clickable Exits (#86, Volo), Shardboard (#87, Volo), Reconnection Overlay (#88, Drizzt).

**Key findings:**
- **Test quality across all 5 PRs is excellent.** Every PR has meaningful behavioral tests with proper assertions, not just smoke tests. Multi-layered testing (unit, component, integration) where appropriate.
- **Accessibility is consistently strong.** ARIA attributes, role attributes, keyboard support, aria-live regions.
- **CSS variable compliance is inconsistent.** PR #87 (Shardboard) had 10+ hardcoded hex values where exact CSS variable equivalents exist (e.g., `#12131A` instead of `var(--bg-panel)`, `#C9A84C` instead of `var(--accent)`). PRs #84 and #88 had minor hex values for interactive states that lack existing variables.
- **Pattern consistency is good.** Components follow BEM naming, use TypeScript interfaces for props, export named functions.

**Decision:** Rejected #87 for systemic CSS variable violations. Approved #84/#88 with notes on minor hex values. Clean approval for #85/#86.

**Enforcement note:** The team decision "All future screens must use `:root` variables; no hardcoded colors" needs teeth. Three of five PRs had some level of hex leakage. May need a CSS lint rule.

### 2025-07-25: Batch B PR Review — Phase 1 Client UI (PRs #89–#93)
- **Action:** Code review of 5 Wave 7 client UI PRs for code quality, pattern consistency, CSS compliance, accessibility, and correctness.
- **PR #89 — Loading & Transition States (Drizzt, #71):** ✅ APPROVED. 4 transition components (RoomTransitionLoader, ShardEntryLoader, CombatInitiationBanner, LongRunningIndicator). 300ms minimum display time, 2s auto-dismiss, 5s cancel threshold. All CSS uses theme variables — zero hardcoded hex. 27 tests with behavioral verification. Excellent accessibility (role="status", role="alert", aria-labels). Clean PR.
- **PR #90 — Shard Exploration Sidebar & Combat Overlay (Jarlaxle, #66+#70):** ❌ REJECTED. Massive PR (24 files, 135 tests, 1200+ lines CSS). Components and logic are excellent — CombatOverlay with keyboard shortcuts, ShardSidebar with sound cues + timer, ReconnectionOverlay with exponential backoff, ShardCard with countdown. Store properly extended. However: **~23 hardcoded hex values in CSS** violating team decision (no hardcoded colors). Values like #12131A (=--bg-panel), #C9A84C (=--accent), #4682B4 (=--loot-refined), #7B4FA0 (=--loot-masterwork) have direct theme variable equivalents. Also: duplicate `.reconnect-overlay` CSS block (copy-paste). Also need new theme variables for: --border-subtle (#2A2B35), --border-hover (#3E3F4C), --accent-hover (#d4b35a), --hp-badly-wounded (#cc4400), --border-dark (#222). **Assigned to Drizzt for CSS variable migration.**
- **PR #91 — Refuge Hub (Jarlaxle, #68):** ⚠️ APPROVED WITH NOTES. 7-tab tabbed navigation matching issue spec exactly. Controlled component pattern (parent manages tab state). 59 tests. Stub panels appropriate for Phase 1 scaffold. 1 minor hex: #d4b35a hover state. Clean accessibility (tablist/tab/tabpanel pattern). Tab names match issue spec per decisions.md.
- **PR #92 — Extraction Screen (Drizzt, #72):** ⚠️ APPROVED WITH NOTES. Discriminated union props pattern for 3 phases (extracting/success/failure). Shared extraction-types.ts. 52 tests. Proper accessibility. 1 minor hex: #d4b35a hover. Minor: `formatTime()` duplicated across ExtractionSuccess and ExtractionFailure — should extract to shared util.
- **PR #93 — Chat & Social Panel (Volo, #73):** ✅ APPROVED. ChatPanel with channel filtering + @mention highlighting. PlayersNearby with faction icons. TradeRequest with auto-decline timer. 78 tests. Zero hardcoded hex. Clean accessibility. Good edge case handling (empty states, char counter warning).
- **Cross-PR assessment:** PR90 is the only blocker. The CSS variable violation is extensive (~23 instances) and directly contradicts the team's established design token policy. Fix is mechanical (find-replace hex → var()) but some new :root variables are needed. All other PRs meet the quality bar.
