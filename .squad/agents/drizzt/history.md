# Drizzt — History

## Project Context

- **Project:** Ellmud — PvPvE Extraction RPG / Real-Time MUD
- **Stack:** Node.js, Colyseus 0.17.x (WebSocket), Azure Container Apps, PostgreSQL, Redis, LLM integration via Azure AI Foundry
- **What:** Procedurally generated shard instances, tick-based combat, server-authoritative game state, message-only client protocol, LLM narration layer
- **User:** dkirby-ms
- **GDD:** GDD.md (comprehensive design document covering all game systems, architecture frozen 2026-03-19)

## Work Complete

### 2026-03-19: Repository Provisioning & Backlog Deployment
**Task:** Create GitHub milestones + labels + backlog issues on dkirby-ms/ellmud  
**Status:** ✅ Complete

**Outcome:**
- Repository: dkirby-ms/ellmud (private, dev branch active)
- **4 milestones** created (Phase 1–4 MVP → World)
- **16 labels** created (domain: engine, gameplay, infrastructure, llm, admin + priority: critical-path, blocker, nice-to-have)
- **49 issues** deployed (#1–#49) with acceptance criteria, GDD references, dependencies
- Zero failures — all resources deployed atomically

**Issue Breakdown:**
| Phase | Count | Duration | Sample Issues |
|-------|-------|----------|---|
| Phase 1 MVP | 18 | 8–10 weeks | #1 Azure infra, #2 Redis, #3 CI/CD, #4 Colyseus scaffold, #5 RoomGen, #6–7 Combat, #8 Movement, #10 Extraction, #11–13 Stash/Auth/Client, #14 Admin dashboard, #19 Integration test |
| Phase 2 Multiplayer | 12 | 6–8 weeks | #20–#27 Multi-player, sound, traces, awareness, communication, ambient Refuge |
| Phase 3 Depth | 16 | 8–12 weeks | #28–#43 Skills, crafting, all 5 biomes, Tier 2–3, factions, faction-driven economy |
| Phase 4 World | 3 | 6–8 weeks | #44–#49 Marketplace, events, OAuth, lore, seasonal leaderboards |

**Architecture Enforcement:**
- ✅ Message-only protocol (no Schema sync to clients) — verified by integration test #19
- ✅ Admin dashboard authorised Schema consumer — Phase 1 design prevents retrofit
- ✅ LLM fallback pipeline — cache-first, template fallback, 200ms combat target
- ✅ Redis presence from Phase 1 — multi-replica scaling tested Phase 2 before prod
- ✅ Server-authoritative state — all game state server-only; clients receive prose only

**Critical Path:**
```
Infra (1–3) → Colyseus (4) + RoomGen (5) → Combat (6–7) → Movement (8) → Extraction (10)
  → Stash + Auth + Client (11–13) → Phase 1 Test (19)
  → Multi-Player Infra (21) → Phase 2 Gameplay (22–27) → Phase 2 Test (31)
  → Skills + Crafting (32–33) → Biomes + Factions (34–38) → Phase 3 Test (47)
  → OAuth + Seasonal (48–49) → Phase 4 Test (49)
```

**Documentation:**
- `.squad/orchestration-log/2026-03-19T11-55-drizzt.md` — Deployment report
- `.squad/decisions.md` — Backlog decision record (merged from inbox)

**Next Phase:** Phase 1 kickoff — assign developer(s) to issues #1–#18. Target: 8–10 weeks to solo MVP (login → loadout → shard entry → combat → extraction → stash persist).

## Learnings

1. **Backlog Atomicity:** Decomposing GDD roadmap into 81 granular issues requires tight traceability (GDD §N refs) and explicit risk mitigation (architectural enforcement gates like integration test #19).
2. **Repository-as-Source-of-Truth:** GitHub milestones, labels, and issues are single source of truth for team task planning. Seed with full context (acceptance criteria, dependencies, design references) from day 1.
3. **Critical Path is Bottleneck:** Phase 1 infrastructure (Azure, Colyseus scaffold, RoomGen) blocks all gameplay logic. Redis presence wired from Phase 1 (even solo MVP) prevents rework during Phase 2 multi-replica scaling.
