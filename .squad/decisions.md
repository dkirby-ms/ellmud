# Squad Decisions

## Active Decisions

### 2026-03-19T01:56:36Z: User directive - Colyseus WebSocket framework
**By:** dkirby-ms (via Copilot)
**What:** Use the latest Colyseus version for WebSocket management, game state synchronization, and reconnect logic. The GDD specifies a WebSocket-based approach — Colyseus handles this plus state management.
**Why:** User request — captured for team memory

### 2026-03-19T01:57:00Z: User directive - Azure hosting platform
**By:** dkirby-ms (via Copilot)
**What:** Azure is the hosting platform. LLM models will be hosted on Azure via Azure AI Foundry (not external LLM APIs).
**Why:** User request — captured for team memory

### 2026-03-19T02:03:04Z: User directive - Deployment model
**By:** dkirby-ms (via Copilot)
**What:** Use Azure Container Apps for deployment with GitHub Actions CI/CD. Reference deployment model from https://github.com/dkirby-ms/playgrid as the template to copy.
**Why:** User request — proven deployment pattern from existing project

### 2026-03-19T02:10:19Z: User directive - Web-only (no SSH)
**By:** dkirby-ms (via Copilot)
**What:** The game is web browser only. No SSH/raw TCP support. Drop the SSH gateway bridge from the architecture entirely.
**Why:** User request — simplifies architecture, eliminates gateway bridge cost and complexity

### 2026-03-19T02:11:55Z: User directive - Refuge as living world
**By:** dkirby-ms (via Copilot)
**What:** The Refuge will be a Colyseus Room (`RefugeRoom`) with tick interval enabled — it should feel like a living world (NPCs moving, events happening, faction activity), not a static menu. The simulation interval supports this.
**Why:** User request — the Refuge should have ambient life and dynamism, making the tick infrastructure worthwhile even in the hub.

### 2026-03-19T02:14:26Z: Architecture - Open questions resolved
**By:** dkirby-ms (via Copilot)

**Decisions:**
1. **SSH support** → Dropped entirely. Web browser only.
2. **Refuge architecture** → Colyseus Room (`RefugeRoom`) with tick interval. Living world — NPCs, events, ambient activity.
3. **Admin dashboard** → Yes. Design Schema with admin visibility from day 1.
4. **Client SDK** → Full `@colyseus/sdk`, ignore state sync. Reconnection tokens worth it.
5. **Azure region** → US-based regions (East US 2 or West US 2 preferred for AI Foundry availability).
6. **Redis** → Unmanaged container for now (cost savings). Migrate to managed later if needed.
7. **Azure subscription** → Already provisioned. Has Azure and AI Foundry access.
8. **Foundry model access** → Already provisioned (GPT-4o-mini available).
9. **Player auth** → Simple username/password for Phase 1. Schema designed for OAuth bolt-on later.
10. **Custom domain** → kirbytoso.xyz (already owned). Can configure in Phase 1 or later.

**Why:** User resolved all open architecture questions from Elminster's Colyseus and Azure analyses.

---

## Architecture Analyses (Approved)

### 2026-03-19: Colyseus as game server framework
**By:** Elminster  
**Status:** Approved by dkirby-ms

**Key Decision:** Adopt **Colyseus 0.17.x** as the WebSocket game-server framework, used as a **room lifecycle and transport layer only** — not as the primary state-sync mechanism. The client is prose-only; Schema state remains server-internal.

**Why:** Colyseus provides battle-tested infrastructure (room lifecycle, matchmaking, reconnection tokens, WebSocket transport, horizontal scaling via Redis). However, Colyseus's default pattern (auto-syncing Schema state to clients) directly conflicts with GDD §14: "The client receives only narrated prose — never raw game state." This conflict is resolvable via dual-channel architecture: Schema for server internals + `onMessage`/`broadcast` for prose delivery.

**Mapping Summary:**
- Room ↔ Shard Instance (1:1). ShardRoom lifecycle = Seeding→Open→Active→Destabilising→Collapse.
- RefugeRoom ↔ The Refuge (long-lived, higher player counts).
- Schema ↔ Server-authoritative state (change tracking, serialisation, snapshot/restore; never leaked to client).
- `setSimulationInterval` ↔ Tick Model (1s interval for both exploration and combat).
- `onMessage`/`broadcast` ↔ Command input / Narrated output (primary gameplay data flow).
- Matchmaker ↔ Shard Queue / Shardboard (built-in; custom `filterBy` for tier/biome/modifiers).
- Reconnection ↔ Latency tolerance (30-60s window; during disconnection, character defaults to `dodge`).
- Redis Presence ↔ Horizontal scaling (multi-process deployment without rework).

**Dual-Mode Simulation:**
- Exploration: Event-driven commands, background tick for creature AI (3-5s), trace decay, collapse timer, sound.
- Combat: 1-second ticks. Collect actions during window, resolve at tick boundary. No-input → `dodge`.
- Implementation: `setSimulationInterval(this.update.bind(this), 1000)` in `onCreate`.

**Risks & Mitigations:**
1. **Schema State Leakage (CRITICAL)** → Architectural enforcement: client SDK wrapper must not subscribe to state patches. Code review gate. Integration test asserting no Schema-type messages reach client.
2. **Colyseus Client SDK Overhead** → Web-terminal: use SDK but ignore state callbacks. SSH clients (Phase 2+): thin WebSocket adapter.
3. **Room-per-Shard Scaling** → LLM service is external. Creature AI is lightweight. Monitor tick budget; offload heavy computation to worker threads if needed.
4. **Refuge Room Scaling** → Shard Refuge into multiple Room instances; use Redis pub/sub for cross-instance trade/chat.
5. **SSH/Raw TCP Support (Phase 2+)** → Gateway Bridge service translates SSH/TCP to Colyseus WebSocket as virtual clients.
6. **LLM Latency in Tick Loop** → Narration is async, non-blocking. Template fallback for missed windows.
7. **Colyseus Version Churn** → Pin to 0.17.x. Abstract behind own Room base class and transport interfaces.

**Recommendation:**
Adopt Colyseus 0.17.x with:
1. Message-only client protocol (commands + prose, no state sync).
2. Abstraction layer (ShardRoom, RefugeRoom, ShardboardService) containing Colyseus-specific code.
3. Gateway bridge for SSH (Phase 2+).
4. Redis presence from day one (even Phase 1 solo play) for scaling without rework.

---

### 2026-03-19: Azure hosting architecture for Ellmud
**By:** Elminster  
**Status:** Approved by dkirby-ms

**Key Decision:** Map every GDD component to concrete Azure services, with Azure AI Foundry as LLM hosting. Designed for extreme cost sensitivity in Phase 1 (solo MVP, <50 concurrent players) with clean scaling path to production multiplayer.

**Service Mapping (Phase 1):**
| Component | Azure Service | SKU | Cost (Phase 1) |
|---|---|---|---|
| Game Server (Colyseus) | Container Apps (Consumption) | 1 vCPU / 2 GiB, min 1 | $15-30 |
| LLM Service (Narrator) | AI Foundry Serverless Endpoints | GPT-4o-mini (pay-per-token) | $5-25 |
| Player Persistence | PostgreSQL Flexible Server | Burstable B1ms + 32 GB | $15 |
| LLM Response Cache | Azure Cache for Redis | Basic C0 (250 MB) | $16 |
| Redis Presence (Colyseus) | (same Redis instance) | (included) | (included) |
| Matchmaker / Shard Queue | Co-located in Colyseus | (same container) | (included) |
| SSH Gateway Bridge | Deferred to Phase 2+ | — | $0 |
| Observability | Azure Monitor + App Insights | Free tier | $0 |
| Container Registry | Azure Container Registry | Basic | $5 |

**Phase 1 Total: ~$55-90/month**

**LLM Strategy (Addressing Latency):**
The 200ms combat narration target cannot be met by real-time LLM generation (~1.75s median time-to-first-token). Solution:

| Tier | Model | Strategy | Latency Target |
|---|---|---|---|
| Combat lines | GPT-4o-mini | Cache-first. Pre-generate common patterns during shard seeding. Template fallback for uncached. | 200ms |
| Room descriptions | GPT-4o-mini (Phase 1) → GPT-4o (Phase 2+) | Pre-generate adjacent rooms during player entry. Streaming reduces latency. | 1s |
| Ambient/Trace | GPT-4o-mini | Background generation. Low urgency. Batch multiple descriptions. | 2s |

**Token Economics:**
- Per combat call: ~500 input + ~80 output = ~$0.000123
- Per room call: ~800 input + ~200 output = ~$0.000240
- Per ambient call: ~400 input + ~60 output = ~$0.000096
- At 50-70% cache hit rate, ~1000 player-hours/month = ~$6/month LLM cost

**Cost Control Mechanisms:**
1. Content-addressable cache (SHA-256 hash of state object; TTL = shard lifetime or 24h for templates).
2. Pre-generation (adjacent rooms during player entry; common combat lines during seeding).
3. Tiered models (Phase 1: mini for all; Phase 2+: GPT-4o for quality tier).
4. Template fallback (Handlebars-style templates if Redis miss or Foundry timeout).
5. Rate limiting (max 20 LLM calls/minute per player).
6. Batch API (future: 50% discount for pre-generation during downtime).

**Phase Breakdown:**

**Phase 1 MVP (~$57-91/month):**
- Single Colyseus replica (web-terminal only)
- In-process matchmaker
- PostgreSQL Burstable B1ms
- Redis Basic C0
- GPT-4o-mini for all narration
- Simple username/password auth

**Phase 2 Production (~$390-715/month):**
- 2-4 Colyseus replicas (multiplayer)
- Separate matchmaker Container App
- SSH Gateway Bridge
- PostgreSQL General Purpose D2s (higher throughput)
- Azure Managed Redis (retirement of Basic tier)
- GPT-4o for quality-tier room descriptions
- OAuth support

**What MUST be production-ready from Day 1:**
1. Server-authoritative game state (no Schema leakage).
2. LLM fallback pipeline (templates before Foundry integration).
3. Player data durability (PostgreSQL with automated backups).
4. WebSocket reconnection (Colyseus tokens from day one).
5. Content-addressable cache design (correct from start; changing it later invalidates cache).

**Risks & Mitigations:**
1. **LLM Latency (HIGH)** → Combat cache-first, pre-generate. Template fallback guaranteed. Gameplay never blocks.
2. **Redis Retirement (MEDIUM)** → Start with Basic C0 now. Plan migration to Managed Redis by mid-2027 (retirement Sept 2028). Alternative: container-based Redis (unmanaged, sufficient for cache + presence).
3. **Container Apps Session Affinity (MEDIUM)** → Colyseus + Redis presence handles routing natively. Test explicitly on second replica.
4. **PostgreSQL B1ms CPU (LOW)** → Burstable well-suited for bursty extraction writes. Monitor credits; upgrade to General Purpose if depleted frequently.
5. **Cold Start (LOW)** → Accept 5-15s cold start during off-hours. Keep min replicas = 1 for expected play hours (~$15/month).
6. **Foundry Regional Availability (LOW)** → Deploy all services in same region. East US 2 and West US 2 have broadest availability.

### 2026-03-19T11:55:00Z: Backlog Decomposition — GDD §17 Roadmap
**By:** Elminster (Lead)  
**Status:** Decision — Implemented

**What:** GDD Roadmap decomposed into 81 granular GitHub issues across 4 phases (Phase 1–4) with dependencies, acceptance criteria, and risk mitigations. Deployed to dkirby-ms/ellmud repository as issues #1–#49 plus 4 milestones and 16 domain/priority labels.

**Phase Breakdown:**
- **Phase 1 MVP (18 issues, 8–10 weeks):** Solo core loop, 1 creature, 1 biome, simple auth
- **Phase 2 Multiplayer (12 issues, 6–8 weeks):** Multi-player PvP, sound, traces, ambient Refuge
- **Phase 3 Depth (16 issues, 8–12 weeks):** Skills, crafting, all 5 biomes, Tier 2–3 progression, factions
- **Phase 4 World (10 issues, 6–8 weeks):** Marketplace, world events, OAuth, lore, seasonal leaderboards

**Key Architecture Preservation:**
- ✅ Colyseus 0.17.x message-only protocol (no Schema sync to clients)
- ✅ Azure Container Apps + AI Foundry + PostgreSQL Flexible
- ✅ Redis unmanaged container (cost optimization)
- ✅ Web-only (SSH deferred indefinitely)
- ✅ RefugeRoom as tick-driven living world
- ✅ Admin dashboard from Phase 1 (Schema authorised consumer only)
- ✅ LLM cache-first pipeline with template fallback (never blocks gameplay)
- ✅ Server-authoritative state verified by integration test #19

**Critical Path Dependencies:**
```
Infra (1–3) → Colyseus (4) + RoomGen (5) → Combat (6–7) → Movement (8) → Extraction (10)
  → Stash + Auth + Client (11–13) → Phase 1 Test (19)
  → Multi-Player Infra (21) → Phase 2 Gameplay (22–27) → Phase 2 Test (31)
  → Skills + Crafting (32–33) → Biomes + Factions (34–38) → Phase 3 Test (47)
  → OAuth + Seasonal (48–49) → Phase 4 Test (49)
```

**Parallelization Opportunities:**
- Phase 1: Infra → {Colyseus, RoomGen, Combat, Item System, Docs} in parallel
- Phase 2: Multi-Infra → {Sound, Traces, Awareness, Communication, Ambient} in parallel
- Phase 3: Heavy parallelization (skill tree, crafting, biomes, factions mostly independent)
- Phase 4: Refinements; safe to parallelize across teams

**Risk Mitigations Embedded in Backlog:**
1. **Schema Leakage (CRITICAL):** Client integration test (#19) verifies no Schema patches to web terminal; architectural enforcement via code review gate
2. **LLM Latency:** Combat cached or templated within 200ms; async enrichment (never blocks tick)
3. **Colyseus Scaling:** Redis presence from Phase 1; multi-replica stickiness tested Phase 2 before prod
4. **Refuge Room Scaling:** Shard Refuge into multiple rooms; Redis pub/sub for cross-instance trade/chat
5. **OAuth Retrofit:** Schema normalized Phase 1 for zero-migration Phase 4 bolt-on
6. **Creature AI Determinism:** Behavior uses same tick resolution; replayable and testable
7. **Prompt Injection Defence:** Free-text fields (say/emote) placed in untrusted data; never concatenated into LLM prompt

**Estimated Total Timeline:** 28–38 weeks (1 full-time developer)

**Why:** The GDD's 4-bullet-point roadmap per phase lacks sufficient detail for task assignment, sprint planning, and dependency tracking. This decomposition operationalizes the design without changing any core decisions or architecture. All issues include GDD section references (traceability), granular acceptance criteria (testable outcomes), and explicit dependency declarations (scheduling clarity).

**Stakeholder Input Questions (for Phase 1 kickoff):**
1. Is Phase 1 scope (solo, 1 creature, 1 biome) acceptable, or prioritize Phase 2 multi-player sooner?
2. Team size: 1 dev, 2 devs, or more? (Timeline scales linearly.)
3. OAuth required for launch, or post-launch nice-to-have?
4. Seasonal frequency: every 4 weeks, 6 weeks, or variable?

---

### 2026-03-19T12:52:00Z: Ellmud Client UI Design Language
**By:** Volo (Narrative Dev)  
**Status:** Proposed — awaiting team review

**What:** Defined the visual design language and screen architecture for the Ellmud web client, captured in a Figma AI design prompt for prototype generation.

**Key Decisions:**
1. **Single-screen gameplay paradigm**: The main shard exploration/combat view is a unified screen with a large narrative panel (70%) and a collapsible sidebar (30%), not separate pages. Players stay in one view during a run — consistent with MUD tradition.
2. **Terminal-modern hybrid aesthetic**: Command input at the bottom (monospace, terminal-inspired), narrative prose in a serif reading font, modern UI chrome in sans-serif. Blends MUD heritage with contemporary game UI.
3. **Dark fantasy color palette**: Near-black base (#0A0B0F), warm bone-white text (#E8E0D0), muted gold accents (#C9A84C), blood red for danger (#8B2500), spectral teal for interactables (#3A7D7B). No bright/saturated colors — everything muted and atmospheric.
4. **Text-first, no graphics engine**: All game state communicated through styled prose text, typographic hierarchy, and subtle iconography. No sprites, no canvas, no WebGL. This is a text game with excellent typography.
5. **Clickable affordances alongside typed commands**: Exits, items, and actions are subtly clickable in the narrative text (underline on hover) for accessibility, but the primary input remains the command bar. Power users type; new users can click.

**Why:**
- Respects GDD §12/§13: web-only, text-primary, no graphics engine, accessible by design
- Supports the "information scarcity" pillar: dark, atmospheric UI with limited visual information reinforces tension
- The single-screen layout keeps narrative flow unbroken during gameplay — critical for immersion in a text-heavy medium
- Terminal-modern hybrid attracts both MUD veterans (familiar input model) and modern gamers (polished UI)

**Impact:**
- Client developers should build toward this screen architecture
- LLM narrative output (my domain) must be formatted to work within the prose panel's constraints (line length, paragraph breaks, inline semantic markup for clickable elements)
- The Refuge hub view is the only screen that meaningfully differs from the shard view (tabbed panels for stash/crafting/trading vs. narrative exploration)

**Open Questions:**
- Should the Refuge use the same narrative-panel layout or a more structured dashboard? (Proposed: hybrid — narrative panel for ambient text, but with structured panels for stash/trade)
- Mobile breakpoint: is portrait phone a target or just tablet+desktop? (Proposed: tablet+ for Phase 1, phone as stretch goal)

### 2026-03-19T13:27: User directive — Figma design gaps
**By:** dkirby-ms (via Copilot)
**What:** If elements are missing from the Figma design export, flag them rather than inventing replacements. The user will go back to the design team to update the Figma prototype.
**Why:** User request — captured for team memory. Design team owns the visual spec; squad adapts, doesn't originate UI designs.

### 2026-03-19T13:28: User directive — Design authority (Figma as source of truth)
**By:** dkirby-ms (via Copilot)
**What:** Always defer design and UX decisions to the Figma master design. The Figma prototype is the authoritative source of truth for all visual design, layout, and UX patterns. If a screen, component, or interaction is missing from the Figma export, flag it as a gap — do NOT invent or improvise UI designs. Missing elements go back to the design team for creation in Figma first.
**Why:** User request — captured for team memory. Separation of concerns: design team owns UX, squad implements faithfully.

### 2026-03-19T13:28: Figma Export Conversion Architecture
**By:** Elminster (Lead/Architect)
**Status:** Proposed — awaiting team review
**Full analysis:** `docs/figma-conversion-strategy.md`

**Context:** A Figma AI prototype was exported as a React app (`/tmp/figma-export/`). It contains 6 screens, 3 tab components, and a full shadcn/ui library (~48 primitives). The export is a presentational prototype with zero server integration, hardcoded mock data, and no state management.

**Decisions:**
1. **Keep visual design, rewrite implementation** — Preserve the visual patterns as reference; rewrite every file's logic. The code implementation is scaffold-quality (hardcoded hex colors, inline styles, no shared state, mock data).
2. **Client lives at `packages/client/`** — Monorepo structure: `packages/client/` (React UI), `packages/server/` (Colyseus), `packages/shared/` (message types, game types). The shared package is the contract between client and server — prevents type drift.
3. **State management: React Context + useReducer** — No Zustand, no Redux. The client is a thin view layer over server-authoritative state. Context + useReducer handles ~10 state slices (auth, character, narrative, room, combat, shard, inventory, loadout, connection, settings). Migration to Zustand is clean if we outgrow this later.
4. **Colyseus integration: message-only, no Schema subscription** — The client MUST NOT subscribe to `room.state` or `room.onStateChange`. All game state arrives via `room.onMessage()` handlers. This is the schema leakage prevention enforced at the architecture level.
   - **Message flow:**
     - Client → Server: `room.send("command", { text })`, `room.send("action", { type })`, `room.send("chat", { text })`
     - Server → Client: `onMessage("narrate")`, `onMessage("combat:tick")`, `onMessage("shard:tick")`, `onMessage("ambient")`, `onMessage("chat")`
5. **Dependency reduction: ~55 → ~22 packages** — Drop all MUI packages (conflicts with Tailwind), unused Radix primitives (~12 packages), and Figma scaffold deps (canvas-confetti, cmdk, embla-carousel, recharts, etc.). Add `colyseus.js` as the only new dependency.
6. **Theme token migration required before feature work** — All page components use hardcoded hex values (`text-[#C9A84C]`) instead of the Tailwind theme tokens already defined in theme.css. This must be fixed in Phase A before any feature work, or we'll have two color systems to maintain.
7. **Shared message types package** — `packages/shared/` defines TypeScript interfaces for all client-server messages (`NarrateMessage`, `CombatTickMessage`, `ShardTickMessage`, etc.). Both client and server import from this package. This is the type-safe contract.

**Risks & Mitigations:**
- **Visual fidelity during token migration** — Compare screenshots before/after. The Figma export is the visual reference.
- **shadcn/ui pruning** — Verify build after each removal. Components are self-contained.
- **Narrative panel memory** — Cap at 500 entries. Server messages append indefinitely.

**Rejected Alternatives:**
- **Use Figma export as-is, incrementally wire up:** Rejected. The hardcoded colors and inline styles would accumulate tech debt faster than we can pay it off. A clean Phase A foundation is worth the upfront cost.
- **Use Redux/Zustand from day one:** Rejected. The client state is simple (server pushes, client renders). Context + useReducer is sufficient and has zero dependencies.
- **Drop shadcn/ui entirely:** Rejected. The primitives we keep (dialog, tabs, scroll-area, tooltip) are battle-tested accessible components that save us from reimplementing ARIA patterns.

**Impact:**
- **Client developers:** Follow `docs/figma-conversion-strategy.md` phased plan (A→B→C→D).
- **Server developers:** Define message types in `packages/shared/` before client integration.
- **Narrative dev (Volo):** LLM output must match `NarrateMessage` type format (type field, structured exits, semantic markup).

---

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction

---

### 2026-03-19T14:06: Figma Export v2 Analysis — Architecture Decisions
**By:** Elminster (Lead/Architect)  
**Status:** For stakeholder review  
**Context:** Deep analysis of updated Figma export responding to gap-fill brief. 55% coverage (11/20 items) achieved with production-quality component scaffolds.

#### Decision 1: Accept v2 Export and Proceed with Conversion

**Recommendation:** Accept the v2 Figma export (ChatPanel, ExtractionOverlay, InventoryOverlay) as production-quality scaffolds and integrate them into the conversion plan.

**Why:**
- Three new overlays are well-structured, stateless components aligned with message-only client architecture
- Implement high-value features (chat, extraction flow, inventory management) previously missing
- Component structure (props-driven, callback-based) compatible with Colyseus integration
- No new dependencies added (still 55 packages)
- Saves ~0.5 weeks of Phase C implementation time

**Impact:**
- Phase C timeline: 3 weeks → 2.5 weeks (5% time savings on overlays)
- Remaining gaps (enemy status panel, tick timer, reconnection overlay) are small enough to build in-house during Phase C/D

**Alternatives considered:**
- Request another design iteration → Rejected. Remaining gaps are polish/edge-cases faster to handle in-house.
- Reject v2 and build from scratch → Rejected. v2 scaffolds are production-quality and align with design system.

**Open questions:** None. Ready to proceed.

---

#### Decision 2: Prioritize Theme Token Migration (Phase A)

**Recommendation:** Make theme token migration the **first task** in Phase A (Foundation), before Colyseus integration work.

**Why:**
- Tailwind v4 `@theme inline` block exists in theme.css and exposes all tokens correctly
- All components (v1 and v2) still use hardcoded hex values (15-25+ per component)
- Token migration is pure find-replace work with zero behavioral changes — safe to parallelize across team
- Starting Phase B with hardcoded colors will cause merge conflicts and rework when tokens are eventually migrated

**Pattern to enforce:**

Before:
```tsx
<div className="bg-[#12131A] text-[#C9A84C] border-[#2A2B35]">
```

After:
```tsx
<div className="bg-bg-panel text-accent-gold border-border-muted">
```

**Impact:**
- Phase A work estimate unchanged (2 weeks) — token migration was always part of Phase A
- Eliminates ~800-1000 hardcoded hex literals across 9 components (6 pages + 3 new overlays)
- Reduces future maintenance burden (single source of truth for colors)

**Alternatives considered:**
- Migrate incrementally during Phase B/C → Rejected. Creates merge conflicts and inconsistent codebase.
- Keep hardcoded colors, add tokens for new code only → Rejected. Violates "single source of truth" principle.

**Open questions:** None. Straightforward refactoring.

---

#### Decision 3: Extract Shared Utilities During Phase A

**Recommendation:** Extract reusable utilities from new v2 components into `packages/shared/` during Phase A.

**Utilities to extract:**

1. **`getTierColor(tier: string): string`** (from InventoryOverlay.tsx)
   - Location: `packages/shared/utils/tiers.ts`
   - Maps tier enum → hex color
   - Used by: InventoryOverlay, StashTab, ShardboardTab, ExtractionOverlay

2. **`getCollapseColor(remainingSeconds: number, totalSeconds: number): string`** (from ShardExploration.tsx)
   - Location: `packages/client/utils/shard.ts`
   - Maps shard stability percentage → color (>50% white, 25-50% amber, <25% red)
   - Used by: ShardExploration (sidebar + narrative header)

3. **Tier enum and Item type** (from InventoryOverlay.tsx)
   - Location: `packages/shared/types/items.ts`
   - Type definitions for loot tiers and item properties
   - Used by: InventoryOverlay, StashTab, LoadoutTab, ExtractionOverlay

**Why:**
- These patterns are copy-pasted across multiple components
- Extracting enforces consistency (single source of truth)
- Enables shared types between client and server

**Impact:**
- Adds ~1 day to Phase A (extraction + migration work)
- Reduces Phase B/C implementation time by eliminating duplicate logic

**Alternatives considered:**
- Keep utilities inline, extract later → Rejected. Phase A is the correct time for foundational work.

**Open questions:** None.

---

#### Decision 4: Build Missing High-Priority Components in Phase C

**Recommendation:** Build the 3 missing high-priority components during Phase C (Gameplay) as part of combat and reconnection integration work.

**Components to build:**

1. **Enemy Status Panel** (sidebar, during combat)
   - Shows: enemy name (serif, gold), HP tier (qualitative text), telegraphed action
   - Location: Replaces Sound Cues section in ShardExploration sidebar during combat
   - Effort: ~0.5 days (state already exists, just needs rendering)

2. **Tick Timer** (below combat banner)
   - Shows: slim countdown bar (3-4px height) filling left-to-right over 1 second, resets each tick
   - Location: Immediately below "⚔ COMBAT" banner in ShardExploration
   - Effort: ~0.25 days (simple progress bar with 1s setInterval)

3. **Reconnection Overlay** (full-screen)
   - Shows: dark scrim, centered pulsing indicator, "Connection lost. Reconnecting..." text
   - Location: Full-screen overlay, appears when Colyseus room drops
   - Effort: ~1 day (includes Colyseus reconnection token handling)

**Why:**
- Critical for core UX (combat feedback, reconnection tolerance)
- Integrate directly with Phase C work (combat integration, Colyseus room lifecycle)
- Building earlier would require mocking server behavior

**Impact:**
- Adds ~1.75 days to Phase C
- Phase C estimate already included "combat UI polish" — this specifies it

**Alternatives considered:**
- Defer to Phase D → Rejected. Enemy status and tick timer are part of core combat loop, not polish.
- Build in Phase A/B → Rejected. Would require mocking server state.

**Open questions:** None.

---

#### Decision 5: Defer Medium/Low-Priority Gaps to Phase D or Post-MVP

**Recommendation:** Do not block conversion on remaining 9 medium/low-priority gaps. Build opportunistically during Phase C/D if time allows, otherwise defer to post-MVP.

**Deferred items:**

**Medium-priority (nice-to-have, Phase D if time allows):**
- Mini-action buttons (Look/Listen/Inventory quickbar) — ~0.5 days
- Ambient events feed (Refuge activity scrolling text) — ~1 day
- Auto-complete hint (ghost text above command input) — ~1 day
- Trade interface (two-column offer panel in ChatPanel) — ~2 days

**Low-priority (polish, post-MVP):**
- Button state variants documentation — ~0.5 days
- HP bar state transitions — ~0.5 days
- Toast notification component (4 variants) — ~1 day
- Empty state designs (6 atmospheric prose states) — ~1 day
- Responsive breakpoints (tablet layouts) — ~3 days or post-MVP

**Why:**
- Phase C/D timeline already tight (9.5 weeks for full conversion)
- These items improve UX but don't block core gameplay
- Can be added incrementally post-MVP based on player feedback

**Impact:**
- Protects Phase C/D timeline from scope creep
- Allows focus on core loop (login → loadout → enter shard → combat → extract → stash persists)

**Alternatives considered:**
- Build everything before launch → Rejected. Violates MVP principles.
- Build none of them ever → Rejected. Some (ambient events, trade UI) valuable for immersion/economy, just not blocking.

**Open questions:**
- Should we prioritize ambient events feed or trade interface? → Answer after Phase B — depends on RefugeRoom integration complexity.

---

#### Summary Table

| Decision | Recommendation | Impact | Phase |
|----------|----------------|--------|-------|
| **1. Accept v2 export** | ✅ Proceed with conversion using v1+v2 | -0.5 weeks Phase C | Immediate |
| **2. Prioritize theme tokens** | ✅ Migrate all hex → tokens in Phase A | Clean foundation for Phase B/C | Phase A |
| **3. Extract shared utils** | ✅ Extract getTierColor, Item types, collapse logic | +1 day Phase A, saves time later | Phase A |
| **4. Build high-priority gaps** | ✅ Enemy status, tick timer, reconnection overlay | +1.75 days Phase C | Phase C |
| **5. Defer medium/low gaps** | ✅ Defer 9 items to Phase D or post-MVP | Protects timeline | Phase D / Post-MVP |

**Net impact:** Phase A +1 day (utils extraction), Phase C -0.5 weeks (overlay scaffolds) +1.75 days (high-priority gaps) = **Phase C net: -1 day**. Total estimate: 10 weeks → 9.5 weeks.

**Go/no-go:** ✅ **Proceed with conversion.** The Figma export v2 provides sufficient design fidelity. No further design iterations needed.

---

*Proposed by Elminster — 2026-03-19*  
*Awaiting stakeholder review (dkirby-ms)*


---

## Wave 3 Completed Decisions

### 2026-03-19T16:01:36Z: Command System Architecture (Three-Layer Pattern)

**By:** Drizzt (Engine Dev)  
**Issue:** #8  
**What:** The command system uses a three-layer architecture:
1. **Parser** (`commands/parser.ts`) — Stateless text-to-`{verb, args}` transformation with alias expansion. Unknown verbs rejected with static error.
2. **Handlers** (`commands/handlers/*.ts`) — Pure functions receiving `CommandContext`, returning `CommandResult` with narration entries (type-tagged for LLM enrichment).
3. **Delivery** — ShardRoom builds context, invokes handler, sends narration to client.

**Why:** 
- Handlers are unit-testable without Colyseus (17 tests without framework)
- Extensibility: new command = handler file + one registry line (critical for combat system rollout)
- LLM-ready: narration entries have type tags; when LLM lands, handlers return templates without code changes

**Team Impact:**
- **Jarlaxle:** `Room` interface in `RoomGraph` is the navigation contract. Movement handlers validate against your room exits.
- **Combat (Issues #6-7):** Strike/dodge/flee handlers slot into same architecture. No parser or delivery changes needed.
- **Volo (Issue #9):** Narration delivery layer will enrich `{type, text}` entries with LLM. Handlers unchanged.

**Tech details:** `CommandContext` = player state + current room + room resolver + occupants list. `CommandResult` = `Narration[]` (each with `type: string`, `text: string`) + optional room header update.

---

### 2026-03-19T16:01:36Z: Backbone Chain Graph Topology for Shard Generation

**By:** Jarlaxle (Systems Dev)  
**Issue:** #5  
**What:** Room graph generator uses **backbone chain** topology: fill rooms connected linearly, entries attached near start, extractions near end, boss at ~60% depth. Cyclic edges added only between rooms within 35% of each other on backbone.

**Why:**
- Guarantees structural minimum distance (GDD requirement: no beeline to extraction)
- Supports navigation interest (cycles don't create shortcuts)
- Biome templates are decoupled from generator — new biome = template file only

**How:** Iterative edge repair after initial graph construction. Algorithm cuts edges on shortest entry→extraction paths, then repairs connectivity with BFS distance checks. Naive repair would re-introduce shortcuts; the fix checks each repair edge.

**Team Impact:**
- **Drizzt (Issue #8):** Movement handlers consume `RoomGraph` from generator. Exit validation against `room.exits` map.
- **Combat (Issues #6-7):** Room hazards stored in biome templates. Hazard effects checked during tick (future scope).
- **World Building (Phase 3):** New biomes only need template file + test. Sunken Library, Ironhold, etc. follow same pattern.

**Scope note:** PRNG is deterministic (mulberry32, seeded). Enables replay testing. Seed baking into ShardInstance is Issue #10 scope.

