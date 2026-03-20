# Project Decisions

## 2026-03-19T12:46:00Z: User directive
**By:** dkirby-ms (via Copilot)

**Decision:** The project name is "Ellmud" (changed from "Shardbound"). Update all references.

**Rationale:** User request — standardizing project identity across all systems.

---

## 2026-03-19: Schema defineTypes over decorators
**By:** Drizzt (Engine Dev)  
**Scope:** All Colyseus Schema definitions in the server package

**Decision:** Use `defineTypes(MyClass, { field: 'type' })` programmatic API for all Colyseus Schema definitions instead of `@type()` decorators.

**Why:**
- `@colyseus/schema` v4.0.x's `@type()` decorator uses the legacy `PropertyDecorator` signature (target = prototype, field = string name)
- TypeScript 5.9.3 (required by schema v4 peer dependency) defaults to native TC39 Stage 3 decorators, which pass different arguments
- `experimentalDecorators: true` may conflict or be ignored by runtime transpilers (tsx, esbuild)
- `defineTypes()` is stable, explicit, and works regardless of decorator implementation

**Impact:**
- All team members creating Schema classes must use `defineTypes()` pattern
- Example in `packages/server/src/state.ts`
- No `experimentalDecorators` or `emitDecoratorMetadata` needed in tsconfig

---

## 2026-03-19T14:30: GDD faction & skill names canonical

**By:** Jarlaxle (Systems Dev)  
**Scope:** Issue #3 — PostgreSQL schema  

**Decision:** Game Design Document (GDD) is the canonical source for faction names and skill categories. When issue text paraphrases or simplifies GDD content, use GDD §9.4 and §7.1 as the source of truth.

**Example:** Issue #3 listed four skill categories and alternate faction names; GDD defines six skills (combat, defence, survival, subterfuge, awareness, social) and factions (Ironwright Compact, Veil Cartographers, Scarlet Ledger).

**Impact:**
- Code referencing `FactionSlugs` and `SkillCategory` should use `packages/server/src/db/types.ts` as the canonical enum
- Future issues should reference GDD sections directly
- All game data in schema must match GDD, not paraphrasing

---

## 2026-03-19T14:30: Colyseus test server architecture

**By:** Minsc (Tester)  
**Scope:** Issue #19 — Test infrastructure  

**Decision:** Establish repeatable patterns for Colyseus server testing to avoid port binding and timing flakiness.

**Patterns:**
- **One Colyseus test server per test file** — Shared across all `describe` blocks via file-level `beforeAll`/`afterAll`
- **`fileParallelism: false`** in server vitest config — Port 2568 cannot run multiple servers simultaneously
- **Polling over fixed waits** — Use `waitUntil()` helper for state transitions that depend on simulation clock
- **@colyseus/sdk as devDependency** — Added to @ellmud/server; required by @colyseus/testing but not declared upstream

**Why:** Parallel test files cause `EADDRINUSE` crashes. Simulation clock is imprecise under load, making fixed delays flaky.

**Impact:**
- All server test files must import `bootTestServer()` from helpers and use one server per file
- Never use `wait(N)` for state-dependent checks; use `waitUntil()` polling
- Server vitest enforces single-file parallelism

---

_Merged from decisions/inbox/ on 2026-03-19T14:30._

---

## 2026-03-19T16:32:56Z: Auth is optional, controlled by AUTH_REQUIRED env var

**By:** Drizzt (Engine Dev)  
**Scope:** Issue #12 — Username/Password Authentication  

**Decision:** Auth (token validation on room join) is **optional by default**. Set `AUTH_REQUIRED=true` to enforce authentication. When disabled, clients join rooms anonymously with `playerId: 'anonymous'`.

**Why:**
- Existing tests join rooms without tokens — making auth mandatory would break them
- Development workflow is faster without auth gates
- Production flips the env var to enforce login
- The `authenticateClient()` function in `colyseus-auth.ts` is the single control point

**Impact:**
- **ShardRoom and RefugeRoom** now have `onAuth` hooks — any team member modifying these rooms should preserve the `onAuth` method
- **Jarlaxle (Issue #6, #7):** If modifying ShardRoom for combat, the `onAuth` hook is at the top of the class — don't remove it
- **Future OAuth (Phase 4, Issue #48):** The `PlayerRepository` interface and `player_identities.provider` column are ready for `provider='google'` etc. Just add a new `loginWithOAuth()` method to AuthService

---

## 2026-03-19T16:32:56Z: Combat System Architecture — Pure Logic + Callback Injection

**By:** Jarlaxle (Systems Dev)  
**Scope:** Issue #6 — Basic Combat System  

**Decision:** The CombatSystem is implemented as a **pure game-logic class with no framework dependencies**. It receives an `ExitResolver` callback for flee mechanics instead of taking a direct RoomGraph reference. ShardRoom instantiates it and calls `resolveTick()` from the existing tick loop.

**Why:**
- **Testable in isolation:** All 32 combat tests run without Colyseus, making them fast (<15ms total) and deterministic
- **Portable:** If we ever need combat logic outside ShardRoom (e.g., Refuge duels, simulation), the system works anywhere
- **No circular deps:** CommandContext gets a type-only `combatSystem?` field, avoiding runtime coupling between command handlers and the combat module

**Impact on Team:**
- **Drizzt (Issue #10+):** New command handlers follow the identical pattern (CommandHandler → CommandResult). The `CommandContext` now has an optional `combatSystem` field — future commands can check `ctx.combatSystem?.isInCombat()` for combat-aware behavior
- **Volo (Issue #9):** Combat narration goes through existing `narrate` channel with type `'combat'`. No new message transport needed. Added `COMBAT_RESULT` message type to shared for structured data if the client wants it
- **Minsc (Issue #13):** Web Terminal Client displays combat UI (HP bars, action buttons). Client sends strike/dodge/flee commands via existing command parser (no protocol change)

---

## 2026-03-19T16:32:56Z: In-Memory Cache Default, Redis as Config Switch

**By:** Volo (Narrative Dev)  
**Scope:** Issue #9 — LLM Narration Pipeline  

**Decision:** Phase 1 uses in-memory LRU cache (max 1000 entries) as default. The `NarrationCache` interface allows a Redis implementation to be swapped in via dependency injection — no code changes needed, just config.

**Why:**
- No Redis dependency in dev/test — simpler setup
- Interface-based design means the switch is trivial: pass a `RedisNarrationCache` to `NarrationService`
- In-memory is sufficient for single-process Phase 1 deployment
- When horizontal scaling arrives (multi-process Container Apps), Redis becomes necessary for shared cache

**LLM Transport Design:**
The LLM client uses a `LLMTransport` function type (not an SDK class). To connect to Azure AI Foundry, call `createAzureTransport(config)` with endpoint/apiKey/deploymentName. For tests, inject any async function matching the `LLMTransport` signature.

**Impact:**
- **Drizzt (Issue #12):** When wiring NarrationService into rooms, instantiate with default (no cache arg) for now. Redis integration is a future config flag
- **Elminster (Ops):** When provisioning Azure Container Apps, if running >1 replica, a Redis NarrationCache implementation will be needed for cross-instance cache sharing
- **Minsc (Issue #13):** Web Terminal Client receives NARRATION messages with enriched text. Client can display telemetry badge (LLM vs template)

_Merged from decisions/inbox/ on 2026-03-19T16:32:56Z._

---

## 2026-03-20T12:03:00Z: Colyseus Server.listen() Required for Matchmaking

**By:** Drizzt (Engine Dev)  
**Status:** Implemented

**Context:** POST `/matchmake/joinOrCreate/refuge` was returning 404 in production. The Colyseus matchmaking HTTP routes were never being registered.

**Decision:** Always use `Server.listen(PORT)` instead of pre-listening the HTTP server. The correct pattern is:

```ts
const httpServer = http.createServer(app);  // Don't listen yet
const server = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});
server.define('refuge', RefugeRoom);
await server.listen(PORT);  // This registers matchmaking routes
```

**Never** do `app.listen(PORT)` and pass the result to the transport — this bypasses Colyseus's route registration.

**Impact:**
- **All agents:** If you modify `packages/server/src/index.ts`, preserve the `http.createServer(app)` + `server.listen(PORT)` pattern.
- **Minsc (QA):** The matchmaking endpoint `POST /matchmake/joinOrCreate/refuge` should now work in integration tests.
- **Client team:** No client changes needed — the Colyseus SDK's `joinOrCreate()` call will now succeed.

_Merged from decisions/inbox/ on 2026-03-20T12:03:00Z._

---

## 2026-03-20T20:21:36Z: Bicep IaC Two-Phase Module Pattern

**By:** Drizzt (Engine Dev)  
**Date:** 2025-07-25  
**PR:** #57 (squad/18-bicep-iac)  
**Issues:** #18, #1

**Decision:** The `container-apps.bicep` module supports two-phase deployment via a `deployApp` boolean parameter. Phase 1 creates only the Container Apps Environment; Phase 2 creates the environment (idempotent) plus the game server Container App.

**Rationale:** Redis deploys as a container *inside* the Container Apps Environment, and the game server needs Redis's FQDN as an environment variable. This creates a dependency chain: **Environment → Redis → Game Server App**. A single module can't output the environment ID and also consume the Redis host without a circular dependency.

**Impact:**
- **CI/CD** (#17): The deployment workflow calls `main.bicep` once — ARM resolves the two-phase ordering automatically via implicit dependencies between modules.
- **Future modules**: Any new sidecar containers (e.g., telemetry collector) follow the same pattern — deploy into the environment after it exists.
- **Redis is ephemeral**: No persistence, `allkeys-lru` eviction at 256MB. Losing Redis loses Colyseus presence data but not game state (that's in PostgreSQL).

---

## 2026-03-21T00:00:00Z: Redis Connection String Env Var Compatibility

**Author:** Drizzt (Engine Dev)  
**Date:** 2026-03-21  
**PR:** #78  
**Issue:** #2

**Context:** The Bicep IaC originally set `REDIS_URL` as the environment variable for the Redis connection string, but `config.ts` read `REDIS_CONNECTION_STRING`. This mismatch would cause Redis to be unreachable in production.

**Decision:** Config now reads both: `REDIS_CONNECTION_STRING` takes precedence, falls back to `REDIS_URL`, then defaults to `redis://localhost:6379`. The Bicep was updated to use `REDIS_CONNECTION_STRING` as the canonical name.

**Impact:**
- **Elminster (infra):** If adding new Redis env vars, use `REDIS_CONNECTION_STRING` as the canonical name
- **All agents:** The two-toggle design (`REDIS_CACHE_ENABLED` + `REDIS_PRESENCE_ENABLED`) allows Phase 1 → Phase 2 transition by flipping env vars only — no code changes needed

---

## 2026-03-20T20:21:36Z: Per-Type Timeout Config Lookup

**By:** Volo (Narrative Dev)  
**Date:** 2026-03-20  
**Issue:** #9  
**PR:** #79

**Decision:** `NarrationService.getTimeout()` uses direct per-type config lookup (`config.timeouts[type]`) instead of hardcoded branching by category (combat vs exploration).

**Context:** The original implementation grouped narration types into two categories:
- `combat_action | combat_round` → `config.timeouts.combat_action`
- everything else → `config.timeouts.room_description`

This worked because all types within a category had the same timeout value. But it meant that `movement` and `event` types couldn't have distinct timeouts even if the config specified them — they were silently mapped to `room_description`'s timeout.

**Rationale:** Since `NarrationTimeoutConfig` already has a property for every `LLMNarrationType`, direct lookup is simpler, more correct, and forward-compatible. If we later need different timeouts for `movement` vs `room_description` (e.g., faster movement narration during combat traversal), it just works.

**Impact:**
- No behavioral change with current `DEFAULT_NARRATION_CONFIG` (combat types = 800ms, others = 2000ms)
- Future flexibility to tune per-type without code changes
