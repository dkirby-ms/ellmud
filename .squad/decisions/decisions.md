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
