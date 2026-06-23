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

## Learnings

### 2026-05-19T23:05:13.930+00:00: UAT load-test evaluation
- `packages/e2e/src/load-test.ts` is the authoritative Playwright load harness: AUTO mode self-registers `loadtest{n}` accounts, creates/selects characters in `the-reliquary`, then joins `/zone` with stress traffic enabled by default.
- `scripts/load-test.sh` is the operator wrapper for UAT and targets `https://ellmud-test.kirbytoso.xyz` at 200 connections with `--action-interval 3000`.
- `packages/server/src/config.ts` defines persistent shared-zone capacity separately from procedural tiers: `getMaxPlayersForZone()` defaults persistent rooms to 100 players, while `getMaxPlayersForTier()` keeps procedural tiers at 3/4/6 unless `MAX_PLAYERS_PER_ZONE` overrides them.
- For UAT capacity claims, a load run only proves the concurrency it actually reached and held; with the current default ramp of 2 connections/sec, a 200-connection target needs roughly 100 seconds of ramp time before hold time is even measured.

### 2026-05-20T00:04:53.502+00:00: Colyseus 100-player zone viability
- `packages/server/src/rooms/ZoneRoom.ts` uses Colyseus as room/session transport but deliberately sends gameplay via typed `client.send()` / `broadcast()` messages; `ZoneState` is tiny server-side Schema (`zoneId`, `tier`, `lifecycle`, `stability`, `tick`, `playerCount`) rather than a full replicated entity graph.
- The room runs a 1-second simulation tick (`setSimulationInterval(..., 1000)`), which is MUD-scale, not action-game frame sync. That sharply lowers synchronization pressure compared with typical Colyseus realtime games.
- The real scaling risk in a 100-player shared zone is not Schema patch size; it is application-level fanout in `ZoneRoom` hot paths such as room-occupant refreshes, movement narration, room-local social broadcasts, and per-encounter combat snapshots, many of which iterate `this.players` directly.
- For Ellmud's text/discrete-command model, 100 players in one Colyseus room is architecturally viable on stronger CPU (2-4 vCPU preferred) and may be acceptable on 1 vCPU for mostly social traffic, but large same-room combat/social churn should be treated as the practical ceiling to test and optimize rather than evidence that Colyseus itself must be replaced.
- Key files for future review: `packages/server/src/rooms/ZoneRoom.ts`, `packages/server/src/state.ts`, `packages/server/src/config.ts`, `packages/server/src/index.ts`, `packages/shared/src/index.ts`.

### 2026-06-23T12:10:00Z: PR #528 security review — LLM Entra token auth

- Clean review for #510: Azure OpenAI auth uses managed-identity bearer tokens, introduces no API key/secret, avoids token logging, refreshes before expiry, and keeps least-privilege RBAC expectations.
- Open follow-up for a future hardening review: `ai-foundry.bicep` still allows local key auth and public network access out of scope for PR #528.
