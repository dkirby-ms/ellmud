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
