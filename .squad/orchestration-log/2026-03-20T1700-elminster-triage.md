# Orchestration Log: Elminster Infrastructure Phase 1 Triage

**Agent:** Elminster  
**Task:** Infra Triage #1, #2, #3, #9, #11, #14, #18  
**Timestamp:** 2026-03-20T17:00:00Z  
**Status:** ✅ COMPLETED  
**Deliverable:** .squad/decisions/inbox/elminster-infra-triage.md  

## Summary

Comprehensive triage of seven Phase 1 infrastructure-dependent issues. Classified 5 as agent-ready (can be fully coded without Azure access), 1 as partially ready (agent codes, user provisions), recommended deferring 1 to Phase 2. Produced dependency graph and critical path for UAT entry.

## Classification

### 🟢 Agent-Ready (5 issues)

- **#3 PostgreSQL Schema:** Pure TypeScript schema design + migration files. No database connection required to write migrations and test schema correctness.
- **#2 Redis Container:** Redis config is environment variables + connection logic. Cache key schema and fallback logic are pure functions. Local Docker testing proceeds in parallel.
- **#9 LLM Narration Pipeline:** Pipeline architecture defined. Mock Azure transport exists. Agent writes wiring code + template fallback.
- **#11 Stash Persistence:** Depends on #3. Agent swaps in PostgresStashRepository once schema ready. No Azure dependency.
- **#18 Bicep IaC:** Templates already exist. Agent refactors to include PostgreSQL (currently missing) and fixes AI Foundry resource state.

### 🟡 Partially Agent-Ready (1 issue)

- **#1 Azure Infrastructure Setup:** User requires Azure CLI access. Agent prereq work complete (Bicep templates #18). Local testing proceeds without live resources. Validation smoke tests written by agent post-deployment.

### ⚠️ Recommendation: Defer to Phase 2 (1 issue)

- **#14 Admin Dashboard:** Full implementation is 16–20 hours. Phase 1 solo play doesn't need live Schema inspection for UAT. Deferring unblocks faster UAT entry. Phase 2 multiplayer immediately benefits from richer observability.
  - **Alternative:** Phase 1 health endpoint only (2–3 hours). Not recommended; still uses resources for minimal value.

## Dependency Graph

```
#1 (Azure Infrastructure)
├─ #18 (Bicep IaC) — agent writes/refines templates
│  └─ (user runs: az deployment group create)
│
├─ #2 (Redis Container) — agent codes cache client + integration
│  ├─ #9 (LLM Pipeline) — agent wires Foundry + template fallback
│  └─ #11 (Stash Persistence) — depends on #3
│     └─ #3 (PostgreSQL Schema) — agent writes schema + repositories
│
└─ #14 (Admin Dashboard) — RECOMMEND DEFER to Phase 2
```

**Critical Path for UAT Entry:**
1. User runs Bicep (#1 provisioning)
2. Agent completes #18 (Bicep refinement) + #3 (schema) in parallel → ~7 hours
3. Agent completes #2 (Redis) + #9 (LLM) in parallel → ~10 hours
4. Agent completes #11 (Stash) after #3 done → ~4 hours
5. System ready for Phase 1 UAT (solo play, extraction, stash persistence)

## Effort Estimates

| Issue | Category | Agent Hours | User Hours | Blocker | Critical Path |
|-------|----------|-------------|-----------|---------|----------------|
| #1    | Azure    | 2–3        | 0.25–0.5  | User CLI | Yes (gate)    |
| #2    | Redis    | 6–8        | 0.5       | None    | Yes            |
| #3    | PostgreSQL | 4–6      | 0.5       | None    | Yes            |
| #9    | LLM      | 4–5        | 0.5       | None    | Yes            |
| #11   | Stash    | 4–5        | 0.5       | #3      | Yes            |
| #14   | Admin    | 2–3 (health) / 16–20 (full) | 0  | None | No (defer)    |
| #18   | Bicep    | 3–4        | 0.5       | None    | Yes            |

**Total Agent Hours (Critical Path):** ~31–36 hours  
**Total User Hours:** ~2–3 hours (mostly provisioning wait time)

## Key Findings

### Azure Infrastructure Status
- ✅ ACA provisioning complete; no action needed
- ✅ ACR provisioning complete; no action needed
- 🔄 PostgreSQL Flexible Server: Bicep template exists; may not be deployed
- ⚠️ AI Foundry soft-deleted: User should verify or let Bicep recreate
- ⚠️ Redis sidecar provisioned; agent writes connection code in #2

### Risk Mitigations

1. **Azure CLI auth delays:** Agent codes all schemas + repositories against interfaces immediately. Local testing proceeds with in-memory stubs.
2. **PostgreSQL provisioning slow:** Bicep templates handle provisioning. Agent writes code against schema in parallel.
3. **Redis sidecar unreachable:** Fallback logic in #9 ensures combat handling gracefully if Redis unavailable.
4. **LLM latency exceeds timeout:** Template fallback is the defense. Tested before UAT.
5. **Schema migration conflicts:** Version control SQL files. Simple sequential numbering (001-, 002-).

## Recommended Priority

### Week 1 (Parallel)
1. **Agent:** Complete #18 (Bicep IaC) — 3–4 hours
2. **Agent:** Start #3 (PostgreSQL Schema) — 4–6 hours
3. **User:** Run #1 (Azure Infrastructure) once #18 ready

### Week 1 (After Azure Resources)
4. **Agent:** Complete #2 (Redis Container) — 6–8 hours
5. **Agent:** Complete #9 (LLM Pipeline) — 4–5 hours

### Week 2
6. **Agent:** Complete #11 (Stash Persistence) — 4–5 hours
7. **Agent:** (Skip #14 or health endpoint only)

### UAT Entry Gate
- All of #1, #2, #3, #9, #11 complete ✓
- User smoke-tested Azure resources ✓
- Server connects to PostgreSQL, Redis, and Foundry ✓

## Success Criteria

**Phase 1 UAT Ready When:**
- ✅ Bicep templates deploy without errors
- ✅ Server connects to PostgreSQL, Redis, AI Foundry (health endpoint shows "connected")
- ✅ Player can login → enter shard → extract item → stash persists across restart
- ✅ LLM narration appears (cached or template fallback)
- ✅ Cache hit ratio > 50% for repeated shard traversals

---

**Next Steps:** Assign #18 and #3 to agents; schedule user Azure provisioning after #18 ready
