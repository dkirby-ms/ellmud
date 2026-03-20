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
