# Elminster — History

## Project Context

- **Project:** Shardbound (ellmud) — PvPvE Extraction RPG / Real-Time MUD
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
