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

### 2026-03-19: Azure hosting architecture for Shardbound
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

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
