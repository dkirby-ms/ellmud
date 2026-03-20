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

### 2026-03-19T21:50:40Z: User directive - Azure environments (UAT/Prod only)
**By:** dkirby-ms (via Copilot)
**What:** Azure environments are UAT and Prod only — no Dev environment. Local development uses local services (no Azure resources needed for dev).
**Why:** User request — captured for team memory. Affects Bicep IaC, CI/CD pipeline, and deploy scripts.

### 2026-03-19: Centralized Server Config Module
**By:** Drizzt (Engine Dev)
**Issue:** #15
**PR:** #53

**What**
Introduced `packages/server/src/config.ts` as the single source of truth for all server configuration. All env var reads go through `getConfig()` — no more scattered `process.env` lookups.

**Why**
- Player limit enforcement needs a config value accessible from `ShardRoom.onJoin()`
- Redis presence config needs to exist before Phase 2 (wired, disabled)
- Testability: `resetConfig()` lets tests override values without polluting other suites
- Server startup log now shows all scaling parameters at a glance

**Impact**
- Any new server config should go through `config.ts`, not raw `process.env`
- Tests that need non-default config must call `resetConfig()` in `afterEach`
- Multi-client shard tests must set `MAX_PLAYERS_PER_SHARD` > 1

### 2026-03-19: Client Package Type Declaration Pattern
**By:** Drizzt (Engine Dev)
**Date:** 2026-03-19
**Context:** Fixed client package build errors — `import.meta.env` and jest-dom matcher types

**What**
When adding third-party type declarations or augmenting library types in the monorepo:
1. **Create standalone `.d.ts` files in `src/`** rather than using `tsconfig.json` `types` array
2. **Use explicit module augmentation** (`declare module 'library'`) for extending interfaces
3. **Separate type declarations from runtime registration** — types in `.d.ts`, runtime setup in test setup files
4. **Follow Vite convention**: `vite-env.d.ts` with `/// <reference types="vite/client" />` for `import.meta.env`

**Rationale**
- **TypeScript `types` array doesn't play well with `moduleResolution: "bundler"`** — paths like `@testing-library/jest-dom/types/vitest` fail resolution even though the file exists
- **Explicit `.d.ts` files are more transparent** — easier to grep, easier to understand what types are being added
- **Vitest setup requires both type augmentation AND runtime registration** — `expect.extend(matchers)` adds methods at runtime; `.d.ts` augmentation tells TypeScript they exist

**Implementation**
- ✅ `packages/client/src/vite-env.d.ts` — Vite client types for import.meta
- ✅ `packages/client/src/testing.d.ts` — jest-dom matchers for vitest Assertion interface
- ✅ `packages/client/src/__tests__/setup.ts` — runtime matcher registration (unchanged from original pattern)

**Affected Packages**
- `packages/client` (direct fix)
- Future packages using Vite or vitest should follow the same pattern

**Notes**
This pattern should be documented if we add more packages to the monorepo. The jest-dom v6 `/vitest` import is supposed to handle both types and runtime, but it doesn't work reliably under our tooling setup (vitest 4.1.0 + bundler moduleResolution).

### 2026-03-19: CI/CD pipeline follows playgrid patterns with Ellmud adaptations
**By:** Drizzt
**Issue:** #17
**PR:** #56

**What**
CI/CD workflow uses OIDC Azure login, `az acr build` (remote build), `az containerapp update` with revision-based rollback. Dockerfile is multi-stage with workspace-aware layer caching. Deploy + docker jobs gated to `push to main` only; PRs run build/test/lint.

**Why**
Directly follows the playgrid reference per decision 2026-03-19 (deployment model). Adapted for Ellmud's `packages/*` workspace layout. `tsc --noEmit` scoped to server tsconfig to avoid pre-existing client TS errors blocking CI. Rollback step uses Container Apps revision management rather than manual re-deploy.

**Required secrets**
`AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `ACR_NAME`, `CONTAINER_APP_NAME`, `RESOURCE_GROUP` — must be configured before merging to `main`.

### 2026-03-19: Bicep IaC Two-Phase Module Pattern
**By:** Drizzt (Engine Dev)
**Date:** 2025-07-25
**PR:** #57 (squad/18-bicep-iac)
**Issues:** #18, #1

**What**
The `container-apps.bicep` module supports two-phase deployment via a `deployApp` boolean parameter. Phase 1 creates only the Container Apps Environment; Phase 2 creates the environment (idempotent) plus the game server Container App.

**Why**
Redis deploys as a container *inside* the Container Apps Environment, and the game server needs Redis's FQDN as an environment variable. This creates a dependency chain: **Environment → Redis → Game Server App**. A single module can't output the environment ID and also consume the Redis host without a circular dependency.

**Impact**
- **CI/CD** (#17): The deployment workflow calls `main.bicep` once — ARM resolves the two-phase ordering automatically via implicit dependencies between modules.
- **Future modules**: Any new sidecar containers (e.g., telemetry collector) follow the same pattern — deploy into the environment after it exists.
- **Redis is ephemeral**: No persistence, `allkeys-lru` eviction at 256MB. Losing Redis loses Colyseus presence data but not game state (that's in PostgreSQL).

### 2026-03-19: Serve React Client from Express in Production
**By:** Drizzt (Engine Dev)
**Requested by:** dkirby-ms
**Date:** 2026-03-19 (deployed 2026-03-19T22:30)
**Commit:** 3a45dd0

**Context**
Azure UAT deployment showed API JSON instead of the client UI. The Dockerfile multi-stage build discarded the client dist, and Express had no static file serving middleware.

**Decision**
1. **Dockerfile**: Copy `packages/client/dist` into `packages/server/dist/public` in the runtime stage. The client build is a static artifact — no runtime deps needed.
2. **Express static serving**: Add `express.static()` pointing at the `public/` directory alongside the compiled server code, plus a catch-all `app.get('*')` that serves `index.html` for React Router client-side routing.
3. **Route order**: All API routes (`/auth`, `/health`, `/admin`, `/colyseus`) are registered BEFORE static file serving. Express matches routes in registration order, so API endpoints always take precedence over the SPA catch-all.

**Implications**
- The server container now serves both the API and the client UI from a single process — no separate static hosting needed.
- Any new API routes MUST be registered before the catch-all, or they'll be swallowed by the SPA handler.
- The `public/` path is relative to the compiled server output (`dist/`), not the source tree.

### 2026-03-19: Redis Cache + Presence Independently Toggleable
**By:** Drizzt (Engine Dev)
**Date:** 2026-03-19
**Issue:** #2 — Redis Container Setup

**What**
Redis cache (`REDIS_CACHE_ENABLED`) and Redis presence (`REDIS_PRESENCE_ENABLED`) are controlled by separate env vars, not a single `REDIS_ENABLED` flag.

**Why**
- Local dev may want Redis cache (for faster narration iteration) without presence (single replica).
- Production may enable presence first (for scaling) before enabling the cache.
- The cache factory falls back to in-memory if Redis is unreachable, so enabling `REDIS_CACHE_ENABLED` is always safe — worst case it degrades gracefully.

**Impact**
- Config schema: `redis.enabled` (presence) + `redis.cacheEnabled` (cache) share `redis.connectionString`.
- Anyone adding new Redis-backed features should follow this pattern: add a new boolean toggle, share the connection string.

### 2026-03-19: Admin dashboard on same Express server
**By:** Drizzt
**Date:** 2026-03-19
**Issue:** #14

**What**
The admin dashboard runs on the same Express server as the game, not a separate process. Admin routes are at `/admin/api/*`, dashboard UI at `/admin/`. Auth is via `ADMIN_TOKEN` env var (separate from player auth). Real-time updates use SSE (Server-Sent Events), not a WebSocket admin client.

**Why**
- Single process keeps Phase 1 deployment simple (one container)
- SSE is simpler than WebSocket for one-way admin data flow
- Separate admin token prevents privilege confusion with player auth
- Inline HTML avoids a build step and framework dependency for admin UI

**Trade-offs**
- SSE polling at 2s interval means slight delay vs true push
- Admin accessing private Room fields (`players` map) uses `as any` — will need cleanup if Room API changes
- Single process means admin load affects game server (acceptable at Phase 1 scale)

### 2026-03-19: Stash uses weight-based capacity, not slot-based
**By:** Drizzt (Issue #11)
**Date:** 2026-03-19
**Status:** Implemented

**What**
The player stash enforces a weight-based capacity (default 200 weight units), not a fixed number of item slots. This means lighter items stack more efficiently, and heavy items consume proportionally more space.

**Why**
- GDD §7.3 specifies weight-limited stash with expandable capacity via upgrades
- Weight-based is more interesting gameplay-wise: players must choose between many light materials vs fewer heavy weapons
- Capacity upgrades (`setCapacity()`) are already implemented and ready for faction/progression unlocks
- The alternative (fixed slots) would require arbitrary slot limits per item type

**Impact**
- StashService.storeItem() checks `currentWeight + addedWeight > capacity`
- Default capacity is 200 weight units (generous for Phase 1, tunable later)
- When Jarlaxle's item system merges (#16), item weights must be reasonable (0.1–10.0 range typical)

### 2026-03-19: Item types live in @ellmud/shared, not server
**By:** Jarlaxle
**Date:** 2026-03-19
**Issue:** #16

**What**
All item interfaces (`ItemDefinition`, `ItemInstance`, `Loadout`, rarity configs, durability functions, loadout validation) are defined in `packages/shared/src/items.ts` and re-exported from `@ellmud/shared`.

Server-side code (registry, loot drops) imports these types. Drizzt's stash persistence (#11) should also import from `@ellmud/shared`.

**Why**
- Drizzt is building stash persistence (#11) in parallel. Both systems need the same `ItemDefinition` and `ItemInstance` types.
- Putting types in shared avoids divergence and ensures the DB layer and game logic agree on item structure.
- Pure functions (validateLoadout, computeEffectiveStats, etc.) are usable by both server and future client-side validation.

**Important: Avoid circular imports in shared**
`items.ts` must NOT import from `./index.js` (which re-exports `items.ts`). The `GearTier` type is duplicated locally to break the cycle. If you add new shared modules that reference types from `index.ts`, check for this pattern.

### 2026-03-19: Login Screen Rebuilt to Match Figma
**By:** Jarlaxle (Systems Dev)
**Date:** 2026-03-19 (deployed 2026-03-19T22:30)
**Status:** Implemented & pushed to dev
**Commit:** bad772a

**What Changed**
- `packages/client/src/styles.css` — Full CSS variable and auth-section rewrite to Figma palette
- `packages/client/src/components/AuthScreen.tsx` — Tab UI, gold design, confirm password, flavor text
- `packages/client/index.html` — Google Fonts (Cinzel, Crimson Text, Inter, JetBrains Mono)
- `packages/client/src/__tests__/auth.test.tsx` — Updated selectors, added password-mismatch test

**Why**
Team directive: "Always defer design and UX decisions to the Figma master design." The previous login screen used a cyan accent, wrong background colors, no serif fonts, and a toggle-button mode switch — none of which matched the spec in `docs/figma-design-prompt.md`.

**Design Tokens Applied**
- Background: `#0A0B0F` (primary), `#12131A` (panels), `#1C1D27` (elevated)
- Accent gold: `#C9A84C`
- Text: `#E8E0D0` (primary), `#8A8B95` (secondary), `#4A4B55` (disabled)
- Fonts: Cinzel (display), Crimson Text (serif/prose), Inter (UI), JetBrains Mono (mono)

**Impact**
- Game screen CSS variables updated (`--bg-panel` replaces `--bg-secondary`, `--text-secondary` replaces `--text-dim`, `--text-primary` replaces `--text-bright`)
- Any new UI work should use the Figma palette variables from `:root`
- 45/45 client tests pass, TypeScript clean, Vite build clean

### 2026-03-19: Combat should block movement commands
**By:** Minsc (Tester)
**Date:** 2026-03-19
**Context:** Phase 1 QA (Issue #19)

**What**
Players in active combat can use `go <direction>` to move freely without fleeing first. The `flee` action exists specifically for this purpose, but the command handler doesn't block movement during combat — only extraction channels enforce command locks.

**Evidence**
Cross-system integration test in `cross-system-integration.test.ts` confirms: a player registered in an active combat encounter can successfully `go north` without the system preventing it.

**Recommendation**
Add a combat command lock in `handleCommand()` (packages/server/src/commands/index.ts) that blocks `go` while `combatSystem.isInCombat(playerId)` is true, similar to the existing extraction command lock pattern. This aligns with GDD §6.2 flee mechanics.

**Impact**
Low risk — single conditional check before the `go` handler. Requires adding `playerId` to CommandContext (currently only has `player.sessionId`).

**Status**
Documented in KNOWN_ISSUES.md #1. Ready for Phase 2 implementation.

---

## Architecture Analyses (Approved)

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


---

## 2026-03-19T16:01:36Z: Client message-only protocol enforcement via test-time source scanning

**By:** Minsc (Tester)  
**Issue:** #13 — Web Terminal Client

### Decision

The connection test suite (`connection.test.ts`) reads the `connection.ts` source file at test time and verifies that forbidden Schema patterns (`room.state`, `onStateChange`, `@colyseus/schema` imports) are NOT present in executable code. Comments are stripped before checking to avoid false positives.

### Why

The "message-only protocol" is the single most critical architectural constraint. A Schema subscription would leak server state to the dumb terminal client, violating GDD §14. Static analysis at test time catches this before CI merges it.

### Trade-offs

- Pro: Zero-cost at runtime, catches accidental imports immediately
- Con: Brittle if connection code is refactored into multiple files (would need to scan all of them)
- Mitigation: If connection logic spreads, update the test to scan all service files

---

## 2026-03-19T16:01:36Z: Creature AI uses CreatureWorldState interface for decoupling

**By:** Jarlaxle  
**Issue:** #7 (Drowned Revenant)

### What

Creature behavior (`updateCreature()`) takes a `CreatureWorldState` interface — not direct Colyseus/ShardRoom references. ShardRoom must construct this state each tick:

```ts
interface CreatureWorldState {
  playersInRoom: Map<string, string[]>;  // roomId → playerIds
  roomExits: Map<string, string[]>;       // roomId → adjacent roomIds
  noisyRooms: Set<string>;               // rooms with recent sound
}
```

### Why

Keeps creature AI testable and decoupled from Colyseus. Behavior tree tests run without mocking any server infrastructure.

### Impact on Team

- **Drizzt (ShardRoom integration):** When integrating creatures into ShardRoom's tick, construct `CreatureWorldState` from room state. Call `creatureManager.updateAll(worldState)` each tick, then translate returned `CreatureAction[]` into combat system calls and player narration.
- **Volo (narration):** Creature actions return `CreatureAction` with type + IDs. Narration layer can enrich these. Creature names are plain strings (e.g., "Drowned Revenant").

---

## 2026-03-19T16:01:36Z: Extraction Channel Architecture

**By:** Drizzt (Engine Dev)  
**Issue:** #10

### What

Extraction is implemented as a **channel-based system** with a static command lock check integrated into the central command dispatcher (`handleCommand()`). The `ExtractionSystem` class is independent of Colyseus — it owns channel state and can be unit-tested without a server.

### Key Design Choices

1. **Command lock via static method**: `ExtractionSystem.checkCommandLock(verb, playerId, system)` is called in `handleCommand()` before dispatching to any handler. This means *all* commands pass through the lock — no handler needs to know about extraction.

2. **Combat damage interrupts extraction**: In `ShardRoom.update()`, after resolving combat ticks, any strike events targeting an extracting player interrupt their channel. This couples extraction to combat at the ShardRoom level (not inside either system).

3. **Local Room `type` field is optional**: Added `type?: RoomType` to the local/dev Room interface in `shard/RoomGraph.ts`. When Jarlaxle's generator replaces the test graph, this becomes the required `type: RoomType` from the shared package.

4. **Noise events are recorded but not propagated**: Per Phase 1 scope, extraction generates `NoiseEvent` objects (level 8, sustained) but they aren't fed into a trace system yet. The interface is stable for Phase 2 integration.

### Team Impact

- **Jarlaxle**: Extraction rooms must have `type: 'extraction'` in the room graph. The `extractionRoomIds` array on the shared `RoomGraph` type should be populated by the generator.
- **All handlers**: The `CommandContext` now has an optional `extractionSystem` field. Existing handlers don't need to change — the lock is enforced centrally.
- **Future channeled actions**: The channel + lock pattern can be reused for crafting, rituals, or any interruptible multi-tick action.

### 2026-03-19T22:37:00Z: User directive - Container App Environment Sharing
**By:** saitcho (via Copilot)
**What:** UAT and Prod have separate Container Apps but share a single Container App Environment (CAE). No separate CAE per environment.
**Why:** User request — captured for team memory

### 2026-03-20: CI/CD Pipeline — 3-Branch Environment Strategy
**By:** Drizzt (Engine Dev)
**Date:** 2026-03-20
**Commit:** ec83635

**What:** CI/CD workflow updated from single-branch (`main`) to 3-branch strategy:
- `dev` — PRs merge here. Tests only, no cloud deploy.
- `uat` — Push triggers build + deploy to UAT Azure Container App.
- `prod` — Push triggers build + deploy to Prod Azure Container App.

**Key design choices:**
1. GitHub environments (`uat`, `prod`) provide per-environment secrets (`CONTAINER_APP_NAME`, `RESOURCE_GROUP`, `ACR_NAME`, Azure OIDC creds). Each environment's secrets configured once in GitHub Settings → Environments.
2. Docker images tagged `ellmud-{env}:{sha}` (e.g., `ellmud-uat:abc1234`, `ellmud-prod:abc1234`) to keep ACR organized.
3. `github.ref_name` used as environment selector — no matrix, no conditionals. Push triggers scoped to `[uat, prod]`.
4. Failure issue job branch-aware (includes branch name in title/body).

**Requires from team:**
- GitHub environments `uat` and `prod` must be created in repo settings with appropriate secrets.
- Secrets per environment: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `ACR_NAME`, `CONTAINER_APP_NAME`, `RESOURCE_GROUP`.

**Why:** Team decision to use UAT/Prod only (no dev cloud environment). Local dev stays fully local.

### 2026-03-20: WebSocket Protocol Auto-Detection
**Author:** Drizzt (Engine Dev)
**Date:** 2026-03-20
**Status:** Implemented
**Commit:** a12f404

**Context**
The Colyseus client WebSocket endpoint was hardcoded to `ws://` in `packages/client/src/services/connection.ts`. Browsers block mixed-content WebSocket requests (`ws://` from `https://` page) when deployed to Azure Container Apps (HTTPS).

**Decision**
Auto-detect protocol from `window.location.protocol`:
- **HTTPS** → `wss://${window.location.host}` (no explicit port; ACA ingress terminates TLS on 443 → container port 2567)
- **HTTP** → `ws://${window.location.hostname}:2567` (local dev: Vite 5173, Colyseus 2567)
- **`VITE_WS_URL` env var** remains highest-priority override for custom configurations.

**Impact**
- **Server team:** No changes; ACA ingress routing unchanged.
- **Client team:** No changes; fix is transparent.
- **Infra team:** No Bicep changes; ACA already forwards 443 → 2567.
- **Testing:** All 552 server + 76 shared tests pass. Client connection tests pass (verify message-only protocol, unaffected).

### 2025-07-24: Concurrently for Dev Scripts
**Author:** Drizzt (Engine Dev)
**Date:** 2025-07-24
**Status:** Implemented

**Context**
The root `package.json` dev script used shell backgrounding (`&`) to run server and client in parallel:
```
"dev": "npm run dev:server & npm run dev:client & wait"
```
Backgrounded children survive the parent's SIGINT (Ctrl+C), leaving stale node processes bound to port 2567. Repeated "port in use" errors during development.

**Decision**
Replaced with `concurrently` which properly manages child process groups and forwards kill signals:
```
"dev": "concurrently --kill-others \"npm:dev:server\" \"npm:dev:client\""
```
- `concurrently` installed as root devDependency
- `--kill-others` ensures all children die on Ctrl+C
- `dev:server` and `dev:client` scripts unchanged

**Why:** Proper process lifecycle management removes friction from local development.

**Verification:** Build clean, 635/635 tests pass.

### 2025-07-24: Refuge Room Exits Set to Empty
**Author:** Drizzt (Engine Dev)
**Date:** 2025-07-24
**Status:** Implemented

**Context**
RefugeRoom sent `exits: ['north', 'south', 'east', 'west']` in ROOM_HEADER, but no `go` command handler existed. Players saw 4 exits they couldn't use.

**Decision**
Changed `exits: []` in ROOM_HEADER. Refuge is a single room (Central Plaza) with no sub-areas. Proper sub-area navigation deferred to future issue.

**Why:** Prevents confusion. UI no longer advertises unavailable exits.

**Impact:** No test changes needed. All 635 tests pass.

### 2026-03-21: Dev Mode Auth Bypass
**Author:** Drizzt (Engine Dev)
**Date:** 2026-03-21
**Status:** Implemented
**Commit:** (Wave 1)

**What:** Client-side dev mode auto-login skips auth screen during local development.

**Implementation:** `useDevAutoLogin` hook in `packages/client/src/hooks/` checks `import.meta.env.DEV`:
- If true and not authenticated, registers+logs in with dev credentials (`dev/devdev`)
- On success, dispatches `LOGIN_SUCCESS` → GameScreen
- On failure (server unavailable), gracefully falls back to AuthScreen

**Why client-side?**
- Zero server changes; reuses existing `/auth/register` and `/auth/login` endpoints
- Zero production risk; `import.meta.env.DEV` is compile-time false in production
- Graceful degradation; falls back if server unavailable
- Simple; 37 lines of code

**Files:** `packages/client/src/hooks/useDevAutoLogin.ts` (new), `packages/client/src/App.tsx` (2 line addition)

**Security:** Dev credentials intentional weak (local dev only), impossible to enable in production via compile-time constant, server auth unchanged.

**Team impact:** Faster local development DX. All 45 client + 552 server tests pass.

### 2026-03-20: Room Switching via ROOM_SWITCH Message
**Author:** Drizzt (Engine Dev)
**Issue:** #65
**Date:** 2026-03-20
**Status:** Implemented
**Commit:** a742710

**What:** Server sends `ROOM_SWITCH` message (`{ target, options?, reason }`) to trigger room transitions. Client handles switch by leaving current room and joining target.

**Protocol Addition:**
```
MessageTypes.ROOM_SWITCH = 'room_switch'
RoomSwitchMessage {
  target: string       // 'shard' | 'refuge'
  options?: Record<string, unknown>
  reason: string       // 'enter_shard' | 'extraction_complete'
}
```

**Why server-initiated, client-executed?**
- **Server authoritative:** Only server decides when switches occur (extraction complete, enter command)
- **Clean disconnects:** Client leaves current room before joining next, avoiding orphaned connections
- **Extensible:** `options` field carries biome selection, shard tier, etc. in future phases

**Implementation:**
- RefugeRoom: `enter` command emits `ROOM_SWITCH` → 'shard'
- ShardRoom: Extraction completion emits `ROOM_SWITCH` → 'refuge'
- Client: `switchRoom()` method handles disconnect/reconnect
- GameScreen: `switchingRef` guard prevents disconnect messages during transitions

**Testing:** 9 new tests, 681 total passing. Full flow verified: connect → enter → extract → return.

**Team impact:**
- Jarlaxle: GameScreen `switchingRef` guard must be checked by any UI state depending on connection status
- Minsc: Integration tests can test full flow; `MessageCollector` captures `ROOM_SWITCH` messages
- Elminster: No infra changes; room switching is intra-process

### 2026-03-20: Generator Wiring Uses Adapter Pattern
**Author:** Jarlaxle (Systems Dev)
**Issue:** #5
**Date:** 2026-03-20
**Status:** Implemented
**Commit:** fe06f2b

**What:** ShardRoom now calls `generateShardGraph()` by default instead of `createTestRoomGraph()`. Graph-adapter converts shared `RoomGraph` format (LootContainer[]) to local format (Item[]) for command handlers.

**Why Adapter, Not Unified Types?**
Shared `Room.items` is `LootContainer[]` (containers with item ID arrays), but command handlers expect `Item[]` (objects with name, weight, description). Unifying would require rewriting every handler that touches items. Adapter converts at ShardRoom boundary — zero changes to existing command system.

**Implementation:**
- New file: `packages/server/src/shard-gen/graph-adapter.ts` (conversion logic)
- ShardRoom.onCreate(): Calls `generateShardGraph()` by default, `{ useTestGraph: true }` option returns hardcoded 6-room test graph
- Result: Procedurally generated shards now standard; test mode available for deterministic fixtures

**Testing:** 5 new tests, 640 total passing. Generator wiring, adapter conversion, fallback logic verified.

**Team impact:**
- Drizzt: Command handlers unchanged; Room/Item interfaces stable
- Minsc: Room names now procedurally generated (e.g., "Drowned Vestibule") — UI must handle any string
- Future: Adding Tier 2/3 shards only requires generator config changes; adapter handles rest

### 2026-03-20: Infrastructure Phase 1 Triage
**Author:** Elminster (Architect)
**Date:** 2026-03-20
**Status:** Analysis Complete
**Deliverable:** .squad/decisions/inbox/elminster-infra-triage.md

**Summary:** Comprehensive triage of seven Phase 1 infrastructure issues. Classified 5 as agent-ready (can be fully coded without Azure access), 1 as partially ready, recommended deferring 1 to Phase 2.

**Agent-Ready (5 issues):**
- **#3 PostgreSQL Schema:** Pure TypeScript + SQL design. No DB connection required.
- **#2 Redis Container:** Config + connection logic. Local Docker testing parallel.
- **#9 LLM Pipeline:** Pipeline architecture + mock transport. Pure wiring work.
- **#11 Stash Persistence:** Depends on #3. Simple repository swap.
- **#18 Bicep IaC:** Templates exist. Refinement + PostgreSQL wiring.

**Partially Agent-Ready (1 issue):**
- **#1 Azure Infrastructure Setup:** User requires Azure CLI. Bicep prep work agent-ready. Local testing proceeds without resources.

**Defer to Phase 2 (1 issue):**
- **#14 Admin Dashboard:** Full scope 16–20 hours. Phase 1 solo play doesn't need Schema inspection. Phase 2 multiplayer makes immediately valuable. Recommend defer.

**Critical Path:** #18 (3–4h) + #3 (4–6h) in parallel → User Azure provision → #2 (6–8h) + #9 (4–5h) in parallel → #11 (4–5h) = ~31–36 agent hours to UAT gate.

**Key Finding:** Infrastructure bottleneck is solvable. All agent-ready work parallelizes; no blocked streams.

### 2026-03-20: Extraction Stash Transfer Pattern
**Author:** Drizzt (Engine Dev)
**Issue:** #10
**Date:** 2026-03-20
**Status:** Implemented
**PR:** #77

**What:** When a player successfully extracts from a shard, their carried inventory is automatically transferred to their persistent stash before the `ROOM_SWITCH` to refuge.

**Key design choices:**
- **Shard Item → Stash Item bridging:** Shard `Item` is registered as `StashItem` with defaults (`type: 'material'`, `rarity: 'common'`, `baseDurability: null`). Jarlaxle's full item system (#16) will replace these defaults when it lands.
- **StashService weight enforcement:** Transfer uses weight-aware storage; items exceeding 200-unit capacity are lost with player narration.
- **Pure function extraction:** Transfer logic lives in `extraction/stash-transfer.ts`, testable without Colyseus.
- **Shared repository pattern:** Both RefugeRoom and ShardRoom share the same `StashRepository` instance.

**Team impact:**
- Jarlaxle: Update Shard Item → StashItem bridge when item system #16 merges
- Minsc: Verify end-to-end extraction → refuge stash flow in integration tests

### 2026-03-20: DATABASE_URL Toggle for PG Persistence
**Author:** Drizzt (Engine Dev)
**Issue:** #3
**Date:** 2026-03-20
**Status:** Implemented
**PR:** #77

**What:** Setting `DATABASE_URL` in the environment activates PostgreSQL persistence. When unset, the server falls back to in-memory repositories (Phase 1 default).

**Why:**
- Zero-config local dev: no PG needed, just `npm run dev`
- Production: set `DATABASE_URL` and migrations run automatically on startup
- Tests run with mocked pg pool — no live database needed

**Implementation pattern:** Any new repository (skills, factions, run history) should follow: interface → in-memory impl → PG impl → DATABASE_URL toggle in index.ts

**Impact:**
- `PgStashRepository` uses `player_stash_capacity` table (migration 006) for per-player weight overrides
- JSONB `metadata` column on `player_stash` stores extensible item properties

### 2026-03-20: Repository Contract Test Pattern
**Author:** Minsc (Tester)
**Date:** 2026-03-20
**Context:** Persistence layer tests for Issue #3

**What:** Repository tests are written as contract test functions that accept a factory:
```typescript
function stashRepositoryContractTests(createRepo: () => StashRepository) { ... }
```

Currently invoked with `() => new InMemoryStashRepository()`. When Drizzt builds the PG implementation, add a second `describe` block with `() => new PgStashRepository(pool)` — same 39+ assertions, different backend.

**Why:**
- Guarantees behavioral equivalence between in-memory and PostgreSQL implementations
- Catches subtle differences (e.g., PG's `quantity > 0` CHECK vs in-memory allowing 0)
- No test duplication — one source of truth for expected behavior

**Files:** `packages/server/src/__tests__/persistence-player-repository.test.ts`, `persistence-stash-repository.test.ts`

**Impact:** When Drizzt implements PgPlayerRepository and PgStashRepository, add describe blocks that run existing contract tests against PG implementations.

### 2026-03-20: Client UI Issue Decomposition
**Author:** Elminster (Lead/Architect)
**Date:** 2026-03-20
**Scope:** GitHub issue creation strategy for Ellmud client UI implementation
**Status:** Decided ✓

**Decision:** 10 GitHub issues covering Phase 1 critical path:
- **Critical (4):** #66 Combat Overlay, #67 Clickable Exits, #68 Refuge Tabs, #69 Shardboard
- **High (2):** #70 Reconnection Overlay, #71 Loading States
- **Medium (4):** #72 Extraction Screen, #73 Chat Panel, #74 Button System, #75 Toast Notifications

**Why scoped this way:**
- Intentionally limited to Phase 1 MVP (Phase D/E deferred to Phase 2)
- Foundation work (#74 Button System, #75 Toasts) unblocks dependent issues
- Grouped related work (Combat UI is one issue, not 8)
- ~1 week per issue, completing these reaches ~80% overall client coverage

**Impact:** Each issue references precise Figma specifications and enforces design token consistency (CSS variables, typography, colors). All future screens must use `:root` variables; no hardcoded colors.

### 2026-03-20: Creature Spawning & AI Tick Wiring Integration
**Author:** Jarlaxle (Game Systems Dev)
**Date:** 2026-03-20
**Issue:** #7
**Status:** Implemented

**What:** CreatureManager, behavior tree, and loot system wired into ShardRoom's live game loop.

**Key design choices:**
- **Derived PRNG seed:** Creature placement uses `seed + 7919` (large prime offset) to keep spawning deterministic but independent from graph generator
- **AI tick order:** Creature AI → combat resolve → sync deaths → extraction tick. Ensures creature actions queue before same-tick resolution
- **Death processing:** `removeCreature()` (loot generation) before `syncFromCombat()` (mark dead). Order is critical for loot system.
- **Test isolation:** `useTestGraph: true` skips creature spawning. Existing 44+ test graph tests unaffected. Procedural tests use fixed seed for determinism.
- **CommandContext extension:** Optional `creaturesInRoom: {id, name}[]` field. Lightweight refs keep creature details out of command handlers.

**Tick sequence verified:**
- Creature AI evaluates and queues actions → Combat system resolves all actions (player + creature) simultaneously → Dead creatures removed (loot drops) → HP synced → Extraction checks run

**Team impact:**
- Drizzt: `CommandContext` has optional `creaturesInRoom`. Attack handler accepts creature targets. No breaking changes.
- Volo: Narration receives creature names; enriches flavor text (e.g., "Drowned Revenant strikes player-1")
- Minsc: Room descriptions now include creatures. Message format unchanged; terminal displays as-is.

