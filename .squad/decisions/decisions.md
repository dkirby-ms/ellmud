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

## 2026-03-20T23:27:56Z: Button Component API Convention

**Date:** 2026-03-20  
**Author:** Drizzt (Engine Dev)  
**Scope:** Issue #74 — Button Design System / PR #84  

**Decision:** The `<Button>` component uses `type` as the variant prop (primary/secondary/danger/ghost), matching the issue spec. This means `type` is *not* the HTML `type` attribute — the component always renders `type="button"` on the underlying `<button>` element.

**Why:**
- Matches design system specification
- Provides semantic variant naming in props
- Allows icon support and size variants without collision with HTML type attribute

**API & Conventions:**
- Import: `import { Button } from '../components/Button.js'`
- Usage: `<Button type="primary" size="medium" icon="⚔️" disabled>Label</Button>`
- All new UI pages must use `<Button>` instead of raw `<button>` elements
- CSS class convention: `.btn--{variant}` and `.btn--{size}` with full words (not abbreviations)
- New CSS variable `--border-muted` (#2A2B35) added to `:root` for shared component use

**Cross-Team Impact:**
- **Jarlaxle:** Use `<Button>` for any UI work (inventory, stats panel, etc.)
- **Minsc:** Anticipatory tests established; pattern for future component tests
- **Elminster:** New CSS variable namespace and button class convention documented

---

## 2026-03-20T23:27:56Z: Toast Notification System API

**Date:** 2026-03-20  
**Author:** Jarlaxle (Systems Dev)  
**Scope:** Issue #75 — Toast Notifications / PR #85  

**Decision:** The toast notification system uses an **event-driven service + React component pattern**. The service (`services/toast.ts`) is a standalone pub/sub module with no React dependency. The component (`components/ToastContainer.tsx`) subscribes to the service and manages animation state.

**Why:**
- Decoupled from React state — any code can call toast methods without context/dispatch
- No new dependencies — SVG icons are inline (no lucide-react)
- Animation ownership stays in component; service only manages data lifecycle

**API:**
- Methods: `toast.system()`, `toast.success()`, `toast.warning()`, `toast.danger()`, `toast.dismiss(id)`
- Auto-dismiss after 4 seconds
- Max 3 visible toasts
- Container mounts once in `App.tsx`
- Import anywhere: `import { toast } from '../services/toast.js'`
- Service has no side effects on import — safe for any module

**CSS Conventions:**
- `.toast`, `.toast-system`, `.toast-success`, `.toast-warning`, `.toast-danger`, `.toast-exit`, `.toast-container`, `.toast-accent`, `.toast-icon`, `.toast-content`, `.toast-title`, `.toast-message`, `.toast-close`

**Cross-Team Impact:**
- **Drizzt:** Toast service can be called from connection handlers/error catchers
- **Volo:** Toast pattern available for narrative events and combat feedback
- **Minsc:** Timer and animation test patterns established

---

## 2026-03-20T23:27:56Z: Clickable Exits Use Server Hints, Not Pure Regex

**Date:** 2026-03-20  
**Author:** Volo (Narrative Dev)  
**Scope:** Issue #67 — Clickable Exits in Narrative Panel / PR #86  

**Decision:** Exit detection in the narrative panel uses `RoomHeaderMessage.exits` (the structured exit array from the server) as the source of truth for which directions to link. It does NOT use pure regex to find direction words in LLM prose.

**Why:**
- LLM prose is unpredictable — regex that works on "Exits: north, south" fails on creative descriptions like "The northern wind carries the scent of pine from the south-facing cliffs"
- Server already knows which exits are valid — false positives are eliminated
- Word-boundary matching prevents "northern"/"eastward"/"downstairs" from becoming clickable

**API & Implementation:**
- Terminal component accepts optional `availableExits` and `onExitClick` props (backward-compatible)
- Exit detection applies to `room` and `header` message types only
- Standalone `ClickableExits` component for contexts without server hints
- To add new direction types: update `DIRECTION_ALIASES` in `exit-detection.ts`

**Cross-Team Impact:**
- **Drizzt:** Narrative panel receives `availableExits` from room state
- **Jarlaxle:** Toast pattern available for exit-click feedback
- **Minsc:** Exit link test patterns (role="link" on span with tabIndex=0)

---

## 2026-03-20T23:27:56Z: Client UI Anticipatory Test Conventions

**Date:** 2026-03-20  
**Author:** Minsc (Tester)  
**Scope:** Phase 1 Client UI batch — Issues #74, #75, #67  

**Decision:** Anticipatory tests for client UI components follow strict conventions to activate automatically when feature branches merge.

**Test Patterns:**
1. **Import real components** — no mocks for the component under test. Tests fail at import resolution until implementation lands (correct signal).
2. **Toast timer tests** use `vi.useFakeTimers({ shouldAdvanceTime: true })` for auto-dismiss verification, switch to `vi.useRealTimers()` for userEvent click tests (userEvent needs real timers).
3. **Toast cleanup** uses `toast._reset()` in beforeEach/afterEach — service exposes this test-only helper.
4. **ExitLink uses role="link" on `<span>`** not `<a>` — tests query with `getByRole('link')` but DOM element is span with tabIndex=0.
5. **Button class checks** use `.toContain('btn--primary')` not regex, matching BEM convention.
6. **CSS variable compliance** verified by checking no inline `style` attributes contain hardcoded hex values.

**Why:** These conventions ensure tests activate automatically when feature branches merge without code changes. Import-failure pattern makes it obvious which implementations are missing.

**Cross-Team Impact:**
- All three feature PRs (#84, #85, #86) have passing test suites validating API contracts
- Test patterns establish conventions for future component testing
- 100+ anticipatory tests across Button, Toast, ClickableExits now active

---

## 2026-03-20T23:27:56Z: Content Admin Tool Architecture

**Date:** 2026-03-20  
**Author:** Elminster (Lead/Architect)  
**Scope:** Content Admin Tool design document / `docs/content-admin-tool.md`  

**Decision:** Comprehensive design for a separate web application (separate container, shared PostgreSQL) that enables designers to author all game content (creatures, items, biomes, loot tables, shard modifiers, skills, factions, room templates, narrative templates, balance constants) without code changes.

**Why:**
- Currently all game content lives in TypeScript source files
- Adding a creature requires: developer → PR → code review → deploy
- This doesn't scale when designers iterate on 5 biomes × 5+ creature types × dozens of items

**Key Architecture Decisions:**
1. **Separate from Admin Dashboard** — This tool authors content; existing dashboard observes live state via SSE
2. **Separate Container, Shared DB** — Content admin runs its own Container Apps instance, uses own `content_*` tables in PostgreSQL, doesn't touch Redis
3. **Content Lifecycle:** Draft → Review → Published — Designers create drafts; Lead Designers approve; Published content deployed via atomic snapshots
4. **Atomic Deployment Snapshots** — Each deployment creates immutable snapshot mapping all content entries to versions; rollback restores previous snapshot
5. **Hot Reload, Not Restart** — Server gets `POST /admin/api/content/reload` endpoint; re-reads from PostgreSQL without restart (zero downtime)
6. **Backward Compatible Migration** — Game server falls back to hardcoded TypeScript content when content tables absent

**Team Impact:**
- **Drizzt:** Game server needs content registry module reading from PostgreSQL (backward-compatible fallback)
- **Jarlaxle:** Creature templates, biome data, loot tables currently hardcoded will eventually load from DB
- **Volo:** Narrative templates authored in admin tool feed into LLM fallback system
- **All:** Existing `item_definitions` and `factions` tables migrate into content admin system

**Status:** Design document complete (1,463 lines, 23 screens, 12 content domains). Implementation Phase 2 candidate.

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

---

## 2026-03-21T15:09:00Z: ACA Deploy Must Clear Both Command and Args

**Author:** Jarlaxle (Systems Dev)  
**Date:** 2026-03-21  
**Status:** Implemented

**Context:** Azure Container Apps inherits `command` (ENTRYPOINT) and `args` (CMD) independently. Our Bicep template sets both for the bootstrap placeholder. The CI/CD deploy step was only overriding `command` via `--command`, leaving the bootstrap `args` intact—so the placeholder kept running even after deploy.

**Decision:** When using `az containerapp update` to deploy, always explicitly set **both** `--command` and `--args`. Use `--args ""` to clear inherited args when they should not carry over.

The health check now validates the real server's `"uptime"` field rather than the generic `"status":"ok"` that both placeholder and real server return. This prevents false-positive health checks from masking a failed deploy.

**Implications:**
- Any future changes to the deploy step must preserve both `--command` and `--args ""` flags
- If the real server's `/health` response shape changes (in `packages/server/src/health.ts`), the CI/CD health check grep must be updated to match
- The Bicep bootstrap is intentional for initial provisioning—do not remove it

---

## 2026-03-21T15:09:00Z: PostgreSQL Host Port Changed to 5434

**Date:** 2026-03-21  
**Author:** Drizzt (Engine Dev)  
**Issue:** Docker-compose port isolation

**Context:** Playgrid uses host port **5433** for its PostgreSQL container. Ellmud was using the default **5432**, which could also conflict with a system-level Postgres install. To avoid port collisions when both projects run on the same dev machine, we needed a unique host port.

**Decision:**
- **Ellmud PostgreSQL host port → 5434** (container still listens on 5432 internally)
- Added `name: ellmud` to `docker-compose.yml` so Docker isolates our project's networks and volumes under a dedicated namespace
- Redis stays on **6379** (no conflict reported)

**What Changed:**
| File | Change |
|---|---|
| `docker-compose.yml` | Added `name: ellmud`; port `5432:5432` → `5434:5432` |
| `docs/setup.md` | Updated standalone Docker example and `DATABASE_URL` to use port 5434 |

**Not Changed:**
- `infra/modules/container-apps.bicep` and `infra/modules/postgres.bicep` — these reference Azure Flexible Server's internal port 5432 (server-to-server), unrelated to local dev
- `packages/server/src/db/index.ts` — reads `DATABASE_URL` from env; no hardcoded port

**Impact:** Developers must use `localhost:5434` when connecting to the local Ellmud Postgres (e.g., psql, pgAdmin, DATABASE_URL).

---

## 2026-03-21T15:09:00Z: Extraction Screen Component API

**Author:** Drizzt (Engine Dev)  
**Issue:** #72  
**PR:** #92

**Decision:** Extraction screen uses a phase-discriminated union pattern: `ExtractionScreen` accepts `phase: 'extracting' | 'success' | 'failure'` with phase-specific props. Internally delegates to `ExtractionOverlay`, `ExtractionSuccess`, `ExtractionFailure`.

**Why:**
- Single entry point for GameScreen integration (just render `<ExtractionScreen phase={...} />`)
- Individual sub-components exportable for direct use if needed
- TypeScript discriminated union ensures compile-time prop correctness per phase
- Matches issue spec: overlay during channeling, full-page for success/failure

**Tier naming:** Used `anomalous` (not `relic`) matching the theme CSS variables and issue spec. The removed anticipatory tests had `relic` — this is intentionally different.

**Impact:**
- GameScreen will need to track extraction state and render `ExtractionScreen` conditionally
- Types exported from `extraction-types.ts` should be used when wiring server messages to props
- `onReturn` callback should trigger room switch back to refuge

---

## 2026-03-21T15:09:00Z: PR #90 CSS Variable Compliance Rejection

**Author:** Elminster (Lead / Architect)  
**PR:** #90 (Shard Exploration Sidebar & Combat Overlay)  
**Author of PR:** Jarlaxle  
**Status:** Rejected — CSS variable migration required

**Issue:** PR #90 introduces ~23 hardcoded hex color values in styles.css, violating the team's established design token policy ("All future screens must use `:root` variables; no hardcoded colors").

**Specific violations:**
- Direct theme variable equivalents used as hex: `#12131A` (--bg-panel), `#C9A84C` (--accent), `#E8E0D0` (--text-primary), `#4682B4` (--loot-refined), `#7B4FA0` (--loot-masterwork)
- Missing theme variables needed: `#2A2B35` (border-subtle), `#3E3F4C` (border-hover), `#d4b35a` (accent-hover), `#cc4400` (hp-badly-wounded), `#222` (border-dark)
- Duplicate `.reconnect-overlay` CSS block (copy-paste error)

**Required fix:**
1. Add 5 new CSS variables to `:root`: `--border-subtle`, `--border-hover`, `--accent-hover`, `--hp-badly-wounded`, `--border-dark`
2. Replace all ~23 hardcoded hex values with `var(--...)` references
3. Remove duplicate `.reconnect-overlay` block

**Assigned to:** Drizzt (per review policy: not original author)

**Note:** The `#d4b35a` hover color also appears in PRs #91 and #92 (1 instance each). These are approved with notes — the same new `--accent-hover` variable should be used across all three PRs.

**Impact:** This is a CSS-only fix. No component logic changes needed.

---

## 2026-03-21T15:09:00Z: CSS Variable Compliance Must Be Enforced Pre-Merge

**Author:** Elminster (Lead / Architect)  
**Trigger:** Batch A review — 3 of 5 PRs had hardcoded hex values in CSS

**Decision:** All color values in CSS must use `:root` CSS variables. No hardcoded `#hex` values in component-level styles. If a needed shade doesn't exist as a variable, define it in `:root` first, then reference it.

**Why:**
- The prior decision ("All future screens must use `:root` variables; no hardcoded colors") was violated in PRs #84, #87, and #88
- PR #87 was the worst offender: 10+ hex values where exact variable equivalents already exist (`#12131A` = `--bg-panel`, `#C9A84C` = `--accent`, etc.)
- This undermines theming capability and makes the design system fragile

**Acceptable exceptions:**
- `rgba()` values in `box-shadow` (opacity-based effects are inherently contextual)
- Defining new variables in `:root` (the definition site uses hex, references use `var()`)

**Enforcement:**
- All agents must grep their CSS additions for raw `#` hex values before submitting
- Reviewers should reject PRs with hardcoded colors that have existing variable equivalents
- Consider adding a stylelint rule: `declaration-no-important` + custom property enforcement

_Merged from decisions/inbox/ on 2026-03-21T15:09:00Z._
