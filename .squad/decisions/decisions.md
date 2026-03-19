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
