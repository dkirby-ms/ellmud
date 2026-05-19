# elminster — History

**For a quick overview, see [summary.md](./summary.md)**

---

### 2026-05-19: Prometheus Metrics Feasibility Assessment (DELIVERED)

**Task:** Scope the effort and architecture for adding Prometheus metrics to the engine.

**Outcome:** ✅ DELIVERED — Feasibility assessment complete. Small effort (1-2 days MVP).

**Assessment Summary:**
- **Effort:** Small (1-2 day sprint for MVP)
- **Complexity:** Low to medium
- **Key dependency:** prom-client library (standard npm package)

**Components identified:**
1. **Prometheus Client (prom-client):** Registry setup and exporters
2. **/metrics HTTP Endpoint:** Standard prometheus text format (0.0.4)
3. **ZoneRoom Instrumentation:** Player counts, command latency, room transitions, broadcast messages

**Architecture notes:**
- No breaking changes to core engine
- Middleware-based collection for minimal intrusion
- Fully compatible with existing Colyseus setup

**Recommendation:** Backlog as low-priority improvement. Ready to implement when team has capacity (post-load-test work).

---


### 2025-07-22: Re-Review PR #442 — Unified Corpse System (REJECTED)

**Task:** Re-review corpse system PR after Drizzt's revision and Minsc's test rewrite.

**Verdict: REJECT — Test quality failure persists**

**Implementation (4 of 5 points resolved):**
- ✅ Group loot: Round-robin removed, replaced with shared corpse access via room.items containers
- ✅ TTL/decay: Creature corpses 5min, player corpses 10min, tickCorpseDecay() sweeps every tick
- ✅ Player corpse unification: Both creature and player death use identical Item with containerContents
- ⚠️ Single architecture: ZoneRoom clean, but CorpseSystem.ts still exists (not imported by production code)
- ❌ Test quality: 40 commented-out assertions, 10 active trivial assertions. Zero meaningful coverage.

**The Blocker:** creature-corpse.test.ts has 29 "passing" tests with no real assertions. Not one test verifies corpse creation, loot contents, open/take commands, or decay. This is the same issue from the original rejection — tests were never actually rewritten.

**Assignment:** Minsc (QA) to rewrite tests with real assertions. Decision logged to .squad/decisions/inbox/elminster-corpse-re-review-442.md.

