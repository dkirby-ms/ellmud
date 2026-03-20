# Drizzt — History

## Project Context

- **Project:** Ellmud — PvPvE Extraction RPG / Real-Time MUD
- **Stack:** Node.js, Colyseus 0.17.x (WebSocket), Azure Container Apps, PostgreSQL, Redis, LLM integration via Azure AI Foundry
- **What:** Procedurally generated shard instances, tick-based combat, server-authoritative game state, message-only client protocol, LLM narration layer
- **User:** dkirby-ms
- **GDD:** GDD.md (comprehensive design document covering all game systems, architecture frozen 2026-03-19)

## Core Context (Phase 1 Foundation — Completed)

**Completed work (high-level summary):**
- ✅ Repository provisioning: 49 issues (#1–#49) across 4 phases, 16 labels, 4 milestones
- ✅ Stash persistence: InMemoryStashRepository, weight-based capacity (200 units default), 43 tests
- ✅ Extraction mechanic: 5-tick channeled escape, command locks, noise generation, 30 tests
- ✅ Room graph generation: Jarlaxle completed (6 files, 101 tests, Flooded Crypt biome)
- ✅ Combat system: Jarlaxle completed (strike/dodge/flee, 1s tick loop, 32 tests)
- ✅ Auth system: PostgreSQL schema, bcrypt + JWT, optional by default
- ✅ Narration pipeline: LLM + in-memory cache + template fallbacks
- ✅ Web client: React terminal, message protocol, 44 tests
- ✅ Type declarations: `.d.ts` pattern for Vite/vitest (import.meta, jest-dom)
- ✅ CI/CD: GitHub Actions, OIDC Azure login, `az acr build`, revision-based rollback
- ✅ Bicep IaC: Two-phase deployment (Environment → Redis → Game Server)
- ✅ Admin dashboard: Express routes + SSE + separate ADMIN_TOKEN

**All 552 server tests passing, zero regressions.**

---

## Recent Work

### Static File Serving Fix (2026-03-19T22:30)
**Task:** Fix production deployment so React client is served from Express server
**Status:** ✅ Complete

**Changes:**
1. **Dockerfile** — Added `COPY --from=build /app/packages/client/dist ./packages/server/dist/public` to runtime stage so client build artifacts survive the multi-stage Docker build.
2. **packages/server/src/index.ts** — Added `express.static()` middleware and a catch-all `app.get('*')` route for React Router. Placed AFTER all API routes (`/auth`, `/health`, `/admin`, `/colyseus`) so API endpoints take precedence.

**Key insight:** Route registration order in Express matters — API routes registered first win over the catch-all. The `__dirname` derivation uses `import.meta.url` because the project uses ESM (`"module": "Node16"`).

**Verification:** TypeScript compiles clean, all 552 tests pass (23 files), pushed to dev.

---

## Cross-Team Updates (2026-03-19T22:30)

### Static File Serving Pattern Documented
**Relevant to:** Jarlaxle (Figma design tokens), Minsc (integration testing)
- Express now serves both API + static client from one container
- Route registration order is critical: API routes before catch-all
- Pattern documented in decisions.md for future reference

### Figma Design Tokens Adopted
**Relevant to:** All UI work going forward
- Jarlaxle deployed gold-palette CSS variables (`#C9A84C` accent, dark backgrounds)
- Typography: Cinzel (display), Crimson Text (serif), Inter (UI), JetBrains Mono (mono)
- Any new UI work must use these design tokens; old cyan palette is deprecated

---

## Learnings

### CI/CD 3-Branch Strategy
- **File:** `.github/workflows/ci-cd.yml`
- **Pattern:** `github.ref_name` maps directly to GitHub environment name (`uat`/`prod`), enabling `environment: ${{ github.ref_name }}` for env-aware secrets without any matrix or conditional logic.
- **Docker tags:** Environment-prefixed images (`ellmud-uat:{sha}`, `ellmud-prod:{sha}`) keep ACR organized and prevent UAT images from being confused with prod.
- **Key insight:** Since push triggers are scoped to `[uat, prod]` in the `on:` block, deploy job `if` conditions only need `github.event_name == 'push'` — the branch filtering is already enforced at the trigger level.
- **Infra alignment:** Bicep `environmentName` param already accepts `['dev', 'uat', 'prod']` with `resourcePrefix = 'ellmud-${environmentName}'`, so the CI/CD image naming convention (`ellmud-{env}`) matches infra naming.

### WebSocket Protocol Auto-Detection
- **File:** `packages/client/src/services/connection.ts`
- **Problem:** Hardcoded `ws://` caused mixed-content errors when the page was served over HTTPS on Azure Container Apps.
- **Fix:** Auto-detect protocol from `window.location.protocol`. HTTPS → `wss://${host}` (no port, ACA ingress handles TLS termination on 443). HTTP → `ws://${hostname}:2567` (local dev where Vite and Colyseus run on different ports).
- **Key insight:** Use `window.location.host` (includes port if non-default) for HTTPS and `window.location.hostname` (no port) + explicit `:2567` for HTTP dev. The `VITE_WS_URL` env var override is preserved as the highest-priority option.

### Colyseus 0.17 Matchmaking Route Registration
- **File:** `packages/server/src/index.ts`
- **Problem:** POST `/matchmake/joinOrCreate/refuge` returned 404. Colyseus matchmaking HTTP routes were never registered because `Server.listen()` was never called — the old code passed a pre-listening server (`app.listen(PORT)`) to `WebSocketTransport` and skipped the Colyseus startup flow.
- **Root cause:** In `@colyseus/core`, `bindRouterToTransport()` — the function that registers matchmaking routes — is only called inside `Server.listen()`. If you pass an already-listening server to the transport and never call `server.listen()`, no matchmaking routes are registered.
- **Fix:** (1) Create HTTP server via `http.createServer(app)` without listening, (2) pass it to `WebSocketTransport({ server: httpServer })`, (3) call `await server.listen(PORT)` which triggers the full Colyseus setup: `matchMaker.accept()` → `transport.listen()` → `bindRouterToTransport()`.
- **How it works:** `bindRouterToTransport` finds the Express app from the HTTP server's "request" listeners, removes it, then prepends a new handler that checks Colyseus routes first (POST `/matchmake/*`) and delegates non-matching requests to Express. This means the SPA catch-all (`app.get('*')`) is safe — it only catches GET requests that don't match Colyseus routes.
- **Key insight:** Never bypass `Server.listen()` in Colyseus 0.17. Even when providing your own HTTP server, Colyseus must call `listen()` to wire up matchmaking. The transport's `server` option is for sharing an HTTP server, not for pre-starting it.

### Dev Mode Auth Bypass (2026-03-21)
- **Files:** `packages/client/src/hooks/useDevAutoLogin.ts`, `packages/client/src/App.tsx`
- **Pattern:** Client-side auto-login hook using `import.meta.env.DEV` (Vite dev mode flag) to bypass auth screen during local development.
- **Implementation:** Custom hook (`useDevAutoLogin`) fires once on mount in dev mode, attempts to register dev user (ignores 409 duplicate error), then logs in with credentials `dev/devdev`. On success, dispatches `LOGIN_SUCCESS` action. On failure (server not running), silently falls back to AuthScreen.
- **Key insight:** No server changes needed — reuses existing `/auth/register` and `/auth/login` endpoints. The `useRef` pattern prevents multiple attempts, and the hook gracefully degrades when server is unavailable. In production builds, `import.meta.env.DEV` is false, so auth screen works normally.
- **Testing:** All 45 client tests pass, all 552 server tests pass. TypeScript and ESLint clean.

### Refuge ↔ Shard Room Switching (#65)
- **Files:** `packages/shared/src/index.ts`, `packages/server/src/rooms/RefugeRoom.ts`, `packages/server/src/rooms/ShardRoom.ts`, `packages/client/src/services/connection.ts`, `packages/client/src/components/GameScreen.tsx`
- **Pattern:** Server sends `ROOM_SWITCH` message (target + reason); client handles switch by leaving current room and joining the target via `switchRoom()`. No client-side routing — the server dictates when and where the player moves.
- **Key decisions:**
  - `ROOM_SWITCH` replaces the old `client.leave()` call in `handleSuccessfulExtraction()` — server no longer force-disconnects; client drives the room transition.
  - `enter` command in RefugeRoom defaults to shard when no argument given (Phase 1: single shard option).
  - `switchingRef` guard in GameScreen prevents onLeave handler from showing disconnect messages during a switch.
  - `handlersRef` pattern lets the same handlers object be reused across room switches, avoiding stale closures.
- **Testing:** 681 total tests passing (555 server + 46 client + 80 shared). 9 new tests covering enter command, shardboard, switchRoom(), and RoomSwitchMessage type.

### Extraction Return to Refuge + Stash Transfer (#10)
- **Files:** `packages/server/src/rooms/ShardRoom.ts`, `packages/server/src/extraction/stash-transfer.ts`, `packages/server/src/extraction/index.ts`, `packages/server/src/__tests__/extraction.test.ts`
- **What:** On successful extraction, player's shard inventory is transferred to their persistent stash before sending `ROOM_SWITCH` to refuge.
- **Key decisions:**
  - Extracted `transferInventoryToStash()` into `extraction/stash-transfer.ts` — pure function, testable without Colyseus infrastructure.
  - Shard `Item` → `StashItem` bridge: items registered as `type: 'material'`, `rarity: 'common'`, `baseDurability: null` by default. Jarlaxle's item system (#16) will reconcile these when both merge.
  - StashService weight enforcement used — items exceeding the 200-unit stash capacity are silently lost with narrated feedback.
  - ShardRoom gains `initStash(repo?, itemDefs?)` — same injection pattern as RefugeRoom. Allows shared repository across rooms.
  - `handleSuccessfulExtraction()` is now async to await stash transfer before cleanup.
  - Empty inventory extraction is a no-op (no narration, no stash calls).
- **Testing:** 6 new tests in extraction.test.ts: transfer all items, weight limit enforcement, empty inventory, stacked items, itemDef registration, full-stash rejection. 705 total tests passing (579 server + 46 client + 80 shared).

## Cross-Team Updates (Wave 1 completion — 2026-03-20T17:00)

### Room Switching Enables Full Shard Loop
**Relevant to:** Jarlaxle (#5), Minsc (integration), Elminster (infra)
- Refuge → Shard transitions now server-authorized via `ROOM_SWITCH` message
- `enter` command in RefugeRoom wires to generator-powered ShardRoom instances
- Extraction completion (`extraction_complete`) triggers Shard → Refuge return
- Full player lifecycle testable: login → enter → extract → return

### Generator Integration Point Ready
**For Jarlaxle #5:** ShardRoom now instantiates procedurally generated graphs on entry. Graph-adapter pattern handles conversion from shared RoomGraph format (LootContainer[]) to local Item[] format used by command handlers. No command system changes needed.

### Integration Test Harness Enhanced
**For Minsc:** MessageCollector helper now captures ROOM_SWITCH messages. Integration tests can verify room transitions without mocking Colyseus internals.
