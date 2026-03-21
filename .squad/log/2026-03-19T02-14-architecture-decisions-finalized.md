# Session: Architecture Decisions Finalized
**Date:** 2026-03-19T02:14:00Z  
**Requested by:** dkirby-ms  
**Topic:** Architecture decisions finalized, all open questions resolved, GDD update in progress

## Summary

Team hired (Elminster as lead, Scribe for documentation). Three major architecture analyses completed and approved:

1. **Colyseus 0.17.x** as game-server framework
   - Message-only client protocol (prose only, no raw state)
   - ShardRoom and RefugeRoom abstractions
   - Dual-mode simulation (exploration event-driven, combat tick-based)
   - Redis presence for horizontal scaling

2. **Azure hosting architecture**
   - Container Apps for game server
   - Azure Database for PostgreSQL for persistence
   - Azure Cache for Redis for state/presence/LLM cache
   - Azure AI Foundry (GPT-4o-mini) for narration with cache-first + template fallback
   - Phase 1 cost: ~$57-91/month (scales to ~$390-715/month Phase 2)

3. **Deployment model**
   - Azure Container Apps + GitHub Actions CI/CD
   - Reference template: https://github.com/dkirby-ms/playgrid
   - SSH deferred to Phase 2, web-terminal only for Phase 1

## Open Questions Resolved (10 total)

1. **SSH support** → Deferred. Web browser only in Phase 1; SSH gateway in Phase 2+
2. **Refuge architecture** → Colyseus Room (`RefugeRoom`) with tick interval (living world simulation)
3. **Admin dashboard** → Yes. Design Schema with admin visibility from day 1
4. **Client SDK** → Full `@colyseus/sdk`, use for reconnection tokens (ignore state sync)
5. **Azure region** → US-based (East US 2 or West US 2 for AI Foundry availability)
6. **Redis** → Azure Cache for Redis Basic C0 now, migrate to managed later (retirement 2028)
7. **Azure subscription** → Already provisioned with Azure and AI Foundry access
8. **Foundry model access** → Already provisioned (GPT-4o-mini available)
9. **Player auth** → Simple username/password Phase 1, OAuth bolt-on later
10. **Custom domain** → kirbytoso.xyz (already owned), configure Phase 1 or later

## Work Done

- Elminster: 2 detailed architecture analyses (Colyseus, Azure) with risks, costs, scaling paths
- Scribe: Documentation inbox merged into decisions.md, session log written
- dkirby-ms: Approved all analyses, resolved all open questions, provided implementation directives

## Next Steps

- Elminster (in progress): Update GDD.md with integrated architecture section
- Team: Begin Phase 1 implementation (infrastructure-as-code, Colyseus server bootstrap)
