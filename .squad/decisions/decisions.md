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
# UX Design Alignment Review — Comprehensive Audit

> **Author:** Elminster (Lead / Architect)
> **Date:** 2026-03-22
> **Scope:** Full screen-by-screen audit of all design specs vs. client implementation
> **Status:** REVIEW FINDINGS — Action Required

---

## Executive Summary

I have read every design document (`figma-design-prompt.md`, `figma-conversion-strategy.md`, `figma-gaps-brief.md`, `figma-v2-analysis.md`) and every client source file (`pages/*.tsx`, `components/*.tsx`, `styles/theme.css`, `store.ts`, `App.tsx`, `routes.ts`). This is a line-by-line audit.

**Overall verdict: 🟡 PARTIALLY ALIGNED — strong foundations, significant gaps remain.**

The implementation preserves the visual language and screen architecture from the Figma spec. Layout proportions, font strategy (serif/mono/sans), color palette hex values, and screen flow are all correct. However, there are two systemic issues and 28 discrete gaps across screens.

**Systemic Issues:**
1. **Zero theme token adoption** — 478 hardcoded hex values across 13 files, 0 theme token references. The `theme.css` Tailwind `@theme inline` block exists and maps every color, but no component uses `bg-bg-panel`, `text-accent-gold`, etc. Every file uses `bg-[#12131A]`, `text-[#C9A84C]`, etc.
2. **Pervasive inline fontFamily** — Every text element uses `style={{ fontFamily: "var(--font-serif)" }}` instead of Tailwind utility classes (`font-serif`). This works but is inconsistent with the Tailwind-first approach.

---

## Screen-by-Screen Audit

### 1. Login / Register

**Spec ref:** `figma-design-prompt.md` §1

| Element | Spec | Implementation | Status |
|---------|------|----------------|--------|
| Full-screen dark background | `#0A0B0F` | `bg-[#0A0B0F]` | ✅ Match |
| Subtle texture/gradient | Faint cracks or parchment grain | `opacity-5 bg-gradient-to-b from-[#1C1D27] to-transparent` | ✅ Match (gradient approach) |
| Centered card, 480px max-width | `max-width 480px` | `max-w-[480px]` | ✅ Match |
| Title "ELLMUD" in display serif, gold | Serif, `#C9A84C`, tracked/spaced | `font-serif, text-[#C9A84C], tracking-[0.2em], 2.5rem` | ✅ Match |
| Subtitle italic serif, muted silver | Italic serif, `#8A8B95` | `italic, font-serif, text-[#8A8B95]` | ✅ Match |
| Login \| Register tabs | Two tabs | Tab buttons with gold underline on active | ✅ Match |
| Login fields | Username, Password | Both present | ✅ Match |
| Register fields | Username, Password, Confirm | All three present | ✅ Match |
| "Enter the Refuge" button | Gold accent | `bg-[#C9A84C] text-[#0A0B0F]` | ✅ Match |
| "Create Shardwalker" button | Register button text | Present | ✅ Match |
| Flavor text below card | Muted silver, small serif italic, rotating | Random selection from 4 texts, serif italic, `#8A8B95` | ✅ Match |
| No social login | Phase 1 | None present | ✅ Match |

**Gaps found:** 0  
**Verdict:** ✅ **Fully aligned.** Login screen matches spec precisely.

---

### 2. Character Select / Create

**Spec ref:** `figma-design-prompt.md` §2

| Element | Spec | Implementation | Status |
|---------|------|----------------|--------|
| Left panel 40% | Character list | `w-[40%]` | ✅ Match |
| Right panel 60% | Creation form | `flex-1` (fills remaining 60%) | ✅ Match |
| Character cards | Name (serif, gold), faction icon+name, skills, last played | Gold serif name, Shield icon + faction, skill badges, last played date | ✅ Match |
| "Enter Refuge" button per card | Present | `bg-[#C9A84C]` button | ✅ Match |
| Creation form: name input | Present | Text input with label | ✅ Match |
| Faction selector | Three faction cards with icon, name, description, specialty | Three factions (Ironwright, Veilwardens, Ashen Covenant) with icons, descriptions, specialties | ✅ Match |
| Starting loadout preview | Cosmetic for Phase 1 | 🟡 Not present — right panel shows either creation form or empty state | 🟡 Minor |
| "Create" button | Present | Gold CTA button | ✅ Match |

**Gaps found:** 1

| # | Gap | Severity | Spec Ref | Fix Owner |
|---|-----|----------|----------|-----------|
| 1 | Starting loadout preview missing from creation form | 🟢 Minor | design-prompt §2 | Volo (UI) |

---

### 3. The Refuge — Hub Screen

**Spec ref:** `figma-design-prompt.md` §3

| Element | Spec | Implementation | Status |
|---------|------|----------------|--------|
| Three-column layout | Left 25%, Center 50%, Right 25% | Left `w-[25%]`, Center `flex-1`, Right `w-[25%]` | ✅ Match |
| Left: Vertical tab list | Stash, Loadout, Crafting, Marketplace, Factions, Contracts, Shardboard | All 7 tabs present with icons | ✅ Match |
| Left: Ambient Events feed | Scrolling text below tabs, serif italic, muted | Present — shows last 8 messages filtered by type, serif italic styling | ✅ Match |
| Center: Context panel per tab | Changes based on selected tab | Tab switching works, renders tab-specific content | ✅ Match |
| Stash tab | Grid/list of items, filter/sort | **Full grid-based stash (10×12)** with drag-drop, tier coloring, inspector panel | ✅ Match (exceeds spec) |
| Loadout tab | Paper-doll text layout, equipment slots | 6 equipment slots, 4 consumables, 2 tools, shard key, stats summary | ✅ Match |
| Crafting tab | Recipe list, details, craft button | **Stub only:** "Crafting system coming soon..." | 🟡 Expected (Phase 2) |
| Marketplace tab | Listings table, post listing | **Stub only:** "Marketplace coming soon..." | 🟡 Expected (Phase 2) |
| Factions tab | Faction info, reputation, perks | **Stub only:** "Faction details coming soon..." | 🟡 Expected (Phase 2) |
| Contracts tab | Contract cards with progress | **Stub only:** "Contracts coming soon..." | 🟡 Expected (Phase 2) |
| Shardboard tab | Shard selection cards | Fully implemented with tier badges, biome, modifiers, player slots, rumoured loot | ✅ Match |
| Right: Chat panel | Refuge-wide chat, input, players nearby | Chat input/output present, "Players Nearby" section present (stub: "coming soon") | 🟡 Partial |
| Top bar | Character name, HP, location breadcrumb, settings gear | Player ID, connection status, settings icon, admin link, logout | 🟡 Partial |

**Gaps found:** 6

| # | Gap | Severity | Spec Ref | Fix Owner |
|---|-----|----------|----------|-----------|
| 2 | Crafting tab is a stub | 🟡 Moderate | design-prompt §3 (Crafting) | Phase 2 scope — acceptable |
| 3 | Marketplace tab is a stub | 🟡 Moderate | design-prompt §3 (Marketplace) | Phase 2 scope — acceptable |
| 4 | Factions tab is a stub | 🟡 Moderate | design-prompt §3 (Factions) | Phase 2 scope — acceptable |
| 5 | Contracts tab is a stub | 🟡 Moderate | design-prompt §3 (Contracts) | Phase 2 scope — acceptable |
| 6 | Players Nearby is a stub ("coming soon") | 🟡 Moderate | design-prompt §3 (Right column) | Jarlaxle (Colyseus presence) |
| 7 | Top bar missing HP indicator and location breadcrumb (shows player ID + connection status instead) | 🟡 Moderate | design-prompt §3 (persistent elements) | Volo (UI) |

---

### 4. Shardboard (Shard Selection)

**Spec ref:** `figma-design-prompt.md` §4

| Element | Spec | Implementation | Status |
|---------|------|----------------|--------|
| Card-based bulletin board | Cards on dark surface | Grid of cards, `bg-[#12131A]`, borders | ✅ Match |
| Shard name in serif gold | Procedural names | Serif, `#C9A84C` | ✅ Match |
| Tier badge | Tier 1/2/3, color-coded white/blue/purple | Tier colors: `#E8E0D0`/`#4682B4`/`#7B4FA0` | ✅ Match |
| Biome icon + name | Present | Biome label present (no distinct icon per biome) | 🟡 Partial |
| Modifiers as tags/chips | Dense, Hunted, Dark | Modifier badges styled in `#B8860B` | ✅ Match |
| Player slots | "2/4 players entered" | Present as info grid | ✅ Match |
| Time remaining | Countdown | Present | ✅ Match |
| Shard Key cost | Key type required | Present | ✅ Match |
| "Enter Shard" button | Gold, prominent | `bg-[#C9A84C]` | ✅ Match |
| Filters | By tier, biome, modifier | ❌ Missing | 🟡 Moderate |
| Rumoured Loot | Vague hints | Present in a nested panel | ✅ Match |

**Gaps found:** 2

| # | Gap | Severity | Spec Ref | Fix Owner |
|---|-----|----------|----------|-----------|
| 8 | Shard filters (tier, biome, modifier) missing | 🟡 Moderate | design-prompt §4 | Volo (UI) |
| 9 | Biome-specific icons not implemented (text label only) | 🟢 Minor | design-prompt §4 | Volo (UI) |

---

### 5. Shard Exploration — Main Gameplay Screen

**Spec ref:** `figma-design-prompt.md` §5

| Element | Spec | Implementation | Status |
|---------|------|----------------|--------|
| 70/30 split panel | Narrative 70%, Sidebar 30% | `w-[70%]` / `w-[30%]` | ✅ Match |
| Narrative panel: scrollable text | Richly styled prose | Server-driven `TerminalMessage` rendering | ✅ Match |
| Room title in serif gold | Room name header | `text-[#C9A84C]`, serif, 1.125rem | ✅ Match |
| Exits as teal clickable links | `[north] [east]` in teal | `text-[#3A7D7B]`, underlined, clickable | ✅ Match |
| Narrative max width ~70ch | Readable prose width | `max-w-[70ch]` on all text types | ✅ Match |
| Line height 1.6–1.8 | Readable line spacing | `lineHeight: 1.7` | ✅ Match |
| Room descriptions: serif, bone white | Warm, book-like | `text-[#E8E0D0]`, serif | ✅ Match |
| Combat text: color-coded | Hits dealt gold, hits taken red, dodges silver | ❌ **All combat text is uniform `#E8E0D0`** — no color differentiation | 🔴 Critical |
| Traces: italic, muted, with Eye icon | Indented, `#8A8B95` | Italic, `#8A8B95`, Eye icon, indented | ✅ Match |
| Sound cues: italic, muted, with Volume2 icon | Indented, `#8A8B95` | Italic, `#8A8B95`, Volume2 icon, indented | ✅ Match |
| System messages: monospace, muted grey | Small, `#4A4B55` | `font-mono`, `text-[#4A4B55]`, text-sm | ✅ Match |
| NPC speech: quoted | Different styling from narration | Quoted in serif, `#E8E0D0` (no left-border accent or distinct weight) | 🟡 Partial |
| Room header bar | Room name + shard stability indicator | Room name (gold) + stability bar (w-32, color-transitions) | ✅ Match |
| Shard stability bar in narrative header | Thin bar (3-4px) spanning header, color transitions | Present but **only w-32 (128px), not full-width** — placed at right edge of header | 🟡 Partial |
| **Sidebar: Character Status** | HP bar (qualitative), status effects, stance | HP bar present (gradient, 75% width). Stance shown. **Status effects section completely missing.** | 🟡 Partial |
| HP bar: no numbers, qualitative | "Healthy" / "Wounded" / "Critical" | Shows "Healthy" label with green text. **HP bar is static at 75% — no dynamic state-based color transitions** | 🟡 Partial |
| Status effects tags | "Bleeding (light)", "Shard-sick" | ❌ **Not implemented** — no status effect rendering | 🟡 Moderate |
| Sidebar: Quick Inventory | Equipped weapon, consumables, clickable | Shows top 3 inventory items with sword icons | ✅ Match |
| Sidebar: Collapse Timer | Prominent countdown, color transitions | Large monospace text, `getCollapseColor()` transitions (green→amber→red) | ✅ Match |
| Collapse timer: "Destabilising" label | Warning label at 50% | Present: "Destabilising" shown when `state.shardState === "destabilising"` | ✅ Match |
| Collapse timer: "COLLAPSE IMMINENT" label | Red phase warning | ❌ **Missing** — no "COLLAPSE IMMINENT" label at <25% | 🟡 Moderate |
| Collapse timer: pulse animation in red phase | Gentle pulse at <25% | ❌ **Missing** — no CSS pulse animation on timer | 🟡 Moderate |
| Sidebar: Sound Cues | Ephemeral, fade out, "Silence." empty state | Shows last 5 cues, "Silence." empty state present. **No fade-out animation** | 🟡 Partial |
| Sound cues: directional highlighting | Direction word in teal `#3A7D7B` | ❌ **Not implemented** — entire cue text is uniform `#8A8B95` | 🟡 Moderate |
| Sidebar: Mini-action buttons | Look, Listen, Inventory | ✅ Present: 3 buttons in grid with hover effects | ✅ Match |
| Mini-action icons | Eye, Ear, Backpack (Lucide) | ❌ **No icons** — text-only buttons | 🟢 Minor |
| Command input: monospace | Terminal-style prompt | `font-mono` | ✅ Match |
| Command input: gold `>` prompt | `#C9A84C` | `text-[#C9A84C]` on `>` character | ✅ Match |
| Command input: placeholder | "Type a command..." | Present, changes based on connection status | ✅ Match |
| Command input: arrow history | Up/down cycles previous commands | Implemented with `onKeyDown` handler | ✅ Match |
| Auto-complete hint | Ghost text above input | ❌ **Not implemented** — no auto-complete UI | 🟡 Moderate |

**Gaps found:** 10

| # | Gap | Severity | Spec Ref | Fix Owner |
|---|-----|----------|----------|-----------|
| 10 | Combat text not color-coded (hits dealt should be gold, hits taken red, dodges silver) | 🔴 Critical | design-prompt §5, gaps-brief §2A | Volo (UI) |
| 11 | Status effects (Bleeding, Shard-sick) section missing from sidebar | 🟡 Moderate | design-prompt §5 (sidebar) | Volo (UI) |
| 12 | HP bar is static — no dynamic Healthy→Wounded→Critical color transitions | 🟡 Moderate | gaps-brief §4C | Volo (UI) |
| 13 | Shard stability bar is 128px, not full narrative header width | 🟡 Moderate | design-prompt §5, gaps-brief §3A | Volo (UI) |
| 14 | "COLLAPSE IMMINENT" warning label missing at <25% | 🟡 Moderate | gaps-brief §4D | Volo (UI) |
| 15 | Collapse timer has no pulse animation in red phase | 🟡 Moderate | gaps-brief §4D | Volo (UI) |
| 16 | Sound cue direction words not highlighted in teal | 🟡 Moderate | gaps-brief §3B | Volo (UI) |
| 17 | Sound cues don't fade out (no ephemeral animation) | 🟢 Minor | gaps-brief §3B | Volo (UI) |
| 18 | Auto-complete hint above command input not implemented | 🟡 Moderate | design-prompt §5, gaps-brief §3E | Volo (UI) |
| 19 | Mini-action buttons missing Lucide icons (Eye, Ear, Backpack) | 🟢 Minor | gaps-brief §3C | Volo (UI) |

---

### 6. Combat Mode (Overlay on Exploration)

**Spec ref:** `figma-design-prompt.md` §6, `figma-gaps-brief.md` §2A

| Element | Spec | Implementation | Status |
|---------|------|----------------|--------|
| Combat banner | "⚔ COMBAT" with blood-red accent line | `border-t-2 border-[#8B2500]`, text "⚔ COMBAT — Tick N" | ✅ Match |
| Tick timer | 1-second countdown bar that fills and resets | ❌ **Missing** — tick number shown as text, no visual countdown bar | 🟡 Moderate |
| Action quickbar | 8 buttons: Strike, Heavy Strike, Dodge, Block, Use Item, Skill, Flee, Observe | **7 buttons** (missing "Skill"). Present: Strike, Heavy Strike, Dodge, Block, Use Item, Flee, Observe | 🟡 Partial |
| Keyboard shortcuts | Superscript numbers | Numbers shown as small text before labels | ✅ Match (close enough) |
| Button hover: gold glow | Border brightens to gold, subtle glow | `hover:bg-[#C9A84C] hover:text-[#0A0B0F]` — gold fill, not border glow | 🟡 Partial |
| Button disabled state | Grey text `#4A4B55` | `opacity-50 cursor-not-allowed` | ✅ Match (functional) |
| Enemy status panel | Sidebar: target name, HP tier, telegraphed action | Present in sidebar with name, HP bar, HP tier labels, telegraphed action | ✅ Match |
| Combat narrative color-coding | Hits dealt gold, hits taken red | ❌ **All combat text uniform color** (already flagged in §5) | 🔴 Critical |
| Combat transitions (fade in/out) | 0.3s ease animations | ❌ **No transition animations** — abrupt show/hide | 🟢 Minor |

**Gaps found:** 4

| # | Gap | Severity | Spec Ref | Fix Owner |
|---|-----|----------|----------|-----------|
| 20 | Tick timer countdown bar missing (only text "Tick N") | 🟡 Moderate | design-prompt §6, gaps-brief §2A | Volo (UI) |
| 21 | "Skill" button missing from action quickbar (7 of 8 actions) | 🟡 Moderate | design-prompt §6 | Volo (UI) |
| 22 | Combat enter/exit has no fade transition animation | 🟢 Minor | gaps-brief §2A | Volo (UI) |
| 10 | (Already counted) Combat text color-coding missing | 🔴 Critical | design-prompt §5-6 | Volo (UI) |

---

### 7. Inventory / Loadout Detail Overlay

**Spec ref:** `figma-design-prompt.md` §7, `figma-gaps-brief.md` §2B

| Element | Spec | Implementation | Status |
|---------|------|----------------|--------|
| Slides from right, 60% width | Overlay panel | `w-[60%]` overlay, z-50, scrim | ✅ Match |
| Carried items: tier-colored names | Per-tier colors | `getTierColor()` function, all 5 tiers correct | ✅ Match |
| Type icon per item | Lucide icons | Not per-type — shows generic categories | 🟢 Minor |
| Durability bar | Thin, grey fill, degrades visually | Gradient bar `from-[#2D6B4F] to-[#B8860B]` | ✅ Match |
| Weight per item | Muted silver, right-aligned | Present | ✅ Match |
| Action buttons | Equip, Drop, Use, Inspect | Equip (`#3A7D7B`), Use (`#8A8B95`), Drop (`#8B2500`). **Inspect missing** | 🟢 Minor |
| Equipped gear section | Slot-based layout | 2 slots shown (Primary Weapon, Chest Armour) | ✅ Match |
| Item inspect sub-panel | Right side within overlay | ❌ **Not implemented** — flavor text and stats are inline per card | 🟡 Moderate |
| Flavor text: italic serif, muted | LLM-generated prose | Italic serif, `#8A8B95`, line-height 1.6 | ✅ Match |
| Stats: qualitative, monospace | "Moderate damage", etc. | Monospace tags: "Moderate damage", "Heavy", etc. | ✅ Match |
| Weight indicator | Carried N/M, progress bar | "14 / 20 units" with green bar | ✅ Match |
| Close button | ✕ button + Escape + `close` command | Close button present, scrim click dismisses | ✅ Match |
| Left-border accent per tier | 3px tier-colored | 4px tier-colored left border | ✅ Match |

**Gaps found:** 2

| # | Gap | Severity | Spec Ref | Fix Owner |
|---|-----|----------|----------|-----------|
| 23 | Item inspect sub-panel (click → side panel with large details) missing | 🟡 Moderate | design-prompt §7, gaps-brief §2B | Volo (UI) |
| 24 | "Inspect" action button missing from item cards | 🟢 Minor | design-prompt §7 | Volo (UI) |

---

### 8. Extraction Screen

**Spec ref:** `figma-design-prompt.md` §8, `figma-gaps-brief.md` §2C

| Element | Spec | Implementation | Status |
|---------|------|----------------|--------|
| **In-Progress state** | | | |
| Progress bar: centered overlay | Large, 60% narrative width, 8px height | Centered bar with pulse animation | ✅ Match |
| Label: "Extraction Ritual — Hold Your Ground" | Serif, bone white | Present, serif | ✅ Match |
| Fill: muted gold with pulse | `#C9A84C`, gentle pulse | `bg-[#C9A84C]`, CSS `@keyframes pulse` animation | ✅ Match |
| Multi-phase segments | Discrete segments per tick | ❌ **Smooth fill, not segmented** | 🟢 Minor |
| Noise warning | Amber text below bar | "Noise generated: HIGH..." in `#B8860B` | ✅ Match |
| **Success state** | | | |
| Full overlay with scrim | 80% dark scrim, centered card | Present, dark scrim, centered | ✅ Match |
| "Extraction Successful" in gold serif | `#C9A84C`, large serif | `text-[#C9A84C]`, serif, 1.75rem | ✅ Match |
| Items extracted: tier-colored | Correct tier colors | Green `#6B8E6B`, Blue `#4682B4`, White `#E8E0D0` | ✅ Match |
| Experience: qualitative text | Muted silver | "Significant combat experience gained" | ✅ Match |
| Contracts completed: emerald | `#2D6B4F` | ✅ Match | ✅ Match |
| Run stats: monospace | Time, rooms, creatures, players evaded | All four stats present, monospace | ✅ Match |
| "Return to Refuge" gold button | Primary gold | `bg-[#C9A84C]` | ✅ Match |
| Gold border on card | 1px gold | `borderColor: "#C9A84C"` | ✅ Match |
| **Death state** | | | |
| "You Have Fallen" in blood red | `#8B2500`, serif | `text-[#8B2500]`, serif, 1.75rem | ✅ Match |
| Items lost: crossed-out | Line-through, muted | Strikethrough text, `#4A4B55` bullets | ✅ Match |
| Status acquired | Amber text | "Shard-sickness (moderate)" in `#B8860B` | ✅ Match |
| Secondary button (outlined) | No gold fill, muted border | `border-[#8A8B95]`, text `#8A8B95` | ✅ Match |
| **Interrupted state** | Combat during extraction | ❌ **Not implemented** | 🟡 Moderate |

**Gaps found:** 2

| # | Gap | Severity | Spec Ref | Fix Owner |
|---|-----|----------|----------|-----------|
| 25 | Extraction interrupted state (combat during ritual) not implemented | 🟡 Moderate | gaps-brief §4E | Volo (UI) + Jarlaxle (protocol) |
| 26 | Multi-phase segments (discrete tick segments) not implemented (smooth fill instead) | 🟢 Minor | gaps-brief §2C | Volo (UI) |

---

### 9. Chat & Social Panel

**Spec ref:** `figma-design-prompt.md` §9, `figma-gaps-brief.md` §2D

| Element | Spec | Implementation | Status |
|---------|------|----------------|--------|
| Panel slides from right | 40% width overlay | `w-[40%]`, z-50, fixed overlay | ✅ Match |
| Chat tabs: Proximity, Whisper, Refuge, Squad | All four | All four present. Squad disabled. Context-aware availability | ✅ Match |
| Tab styling | Ghost text, gold underline on active | `border-b-2 border-[#C9A84C]` active, `text-[#8A8B95]` inactive | ✅ Match |
| Player speech styling | Quoted, serif italic, speaker description | Quoted serif with speaker prefix | ✅ Match |
| System messages | Monospace, muted grey | `font-mono`, `text-[#4A4B55]` | ✅ Match |
| Emotes | Italic, no quotes | `italic`, serif, `text-[#8A8B95]` | ✅ Match |
| Whispers | Teal prefix `[whisper]` | `text-[#3A7D7B]` whisper label | ✅ Match |
| Chat input | Monospace, "Say something..." | `font-mono`, placeholder present | ✅ Match |
| Commands hint | `/say /whisper /emote` | Present below input | ✅ Match |
| Players Nearby | Character name + faction icon, clickable | Present ("Nearby Presences") but with generic descriptors, **not clickable for whisper/trade** | 🟡 Partial |
| Trade interface | Two-column offer panel | ❌ **Not implemented** | 🟡 Moderate |

**Gaps found:** 2

| # | Gap | Severity | Spec Ref | Fix Owner |
|---|-----|----------|----------|-----------|
| 27 | Trade interface (two-column offer panel) not implemented | 🟡 Moderate | design-prompt §9, gaps-brief §2D | Phase 2 scope — acceptable |
| 28 | Nearby players not clickable for whisper/trade actions | 🟢 Minor | gaps-brief §2D | Volo (UI) |

---

### 10. Leaderboard & Contracts

**Spec ref:** `figma-design-prompt.md` §10

| Element | Spec | Implementation | Status |
|---------|------|----------------|--------|
| Three tabs | Seasonal Leaderboard, Personal Stats, Active Contracts | All three present (Trophy, Target, Swords icons) | ✅ Match |
| Table columns | Rank, Player, Faction, Shards, Items, PvP | All 6 columns present | ✅ Match |
| Current player highlighted gold | Gold row | `bg-[#C9A84C]/10` on player row | ✅ Match |
| Faction leaderboard tab | Collective progress | ❌ **Missing** — no faction-level leaderboard sub-tab | 🟡 Moderate |
| Personal Stats | Runs, survival rate, favorite biome, items, streak | 6 stat cards with correct data | ✅ Match |
| Contract cards | Objective, reward, deadline, progress, abandon | Objective, reward, progress bar present. **Deadline not shown**. Abandon button present | 🟡 Partial |

**Gaps found:** 2

| # | Gap | Severity | Spec Ref | Fix Owner |
|---|-----|----------|----------|-----------|
| 29 | Faction leaderboard sub-tab missing | 🟡 Moderate | design-prompt §10 | Volo (UI) |
| 30 | Contract deadline not displayed | 🟢 Minor | design-prompt §10 | Volo (UI) |

---

### 11. Settings

**Spec ref:** `figma-design-prompt.md` §11

| Element | Spec | Implementation | Status |
|---------|------|----------------|--------|
| Left sidebar + right content | Full-screen overlay, two-column | Two-column: 64rem sidebar + flex-1 content | ✅ Match |
| 6 categories | Account, Display, Narration, Audio, Keybinds, Accessibility | All 6 present with icons | ✅ Match |
| Verbosity: Terse/Standard/Verbose | Radio with preview text | Three options with prose previews | ✅ Match |
| Narration style | Default/Gothic/Noir/Clinical | Dropdown with all four options | ✅ Match |
| Font size slider | Slider for narrative text | Range input min=12 max=24 | ✅ Match |
| Panel layout options | Sidebar left vs right | Two buttons (Sidebar Right / Sidebar Left) | ✅ Match |
| Color contrast mode | High contrast toggle | Toggle present | ✅ Match |
| Keybinds | Rebindable table | 7 keybind rows (Strike through Observe) | ✅ Match |
| Accessibility | Screen reader, color-dependent, animations | All 3 toggles present with descriptions | ✅ Match |
| Audio | Audio settings | **Stub:** "Audio features coming soon..." | 🟡 Expected |

**Gaps found:** 0  
**Verdict:** ✅ **Fully aligned.** Settings matches spec comprehensively.

---

### 12. Reconnection Overlay

**Spec ref:** `figma-gaps-brief.md` §2E

| Element | Spec | Implementation | Status |
|---------|------|----------------|--------|
| Dark scrim overlay | Semi-transparent | `bg-black/80`, z-100 | ✅ Match |
| "Connection lost" text | Bone white, serif | `text-[#B8860B]` (amber, not bone white), serif | 🟡 Partial |
| Reconnecting progress bar | Visual progress | Gold bar with attempt/max progress | ✅ Match |
| "Your character will defend..." text | Muted silver | ❌ **Missing** — shows attempt count instead | 🟢 Minor |
| Reconnected state | Fade overlay, emerald toast | "Connection Restored" in `#2D6B4F`, auto-dismisses after 2s | ✅ Match |
| Failed state: "Return to Login" | Button | "Return to Refuge" button (not "Return to Login") | 🟡 Partial |

**Gaps found:** 2

| # | Gap | Severity | Spec Ref | Fix Owner |
|---|-----|----------|----------|-----------|
| 31 | "Your character will defend themselves..." reassurance text missing | 🟢 Minor | gaps-brief §2E | Volo (UI) |
| 32 | Failed reconnection says "Return to Refuge" instead of "Return to Login" | 🟢 Minor | gaps-brief §2E | Volo (UI) |

---

## Cross-Cutting Issues

### Theme Token Adoption: 🔴 CRITICAL

| File | Hardcoded Hex Count | Theme Token Count |
|------|--------------------:|------------------:|
| ShardExploration.tsx | 74 | 0 |
| Leaderboard.tsx | 58 | 0 |
| Settings.tsx | 56 | 0 |
| StashTab.tsx | 44 | 0 |
| Refuge.tsx | 43 | 0 |
| InventoryOverlay.tsx | 37 | 0 |
| LoadoutTab.tsx | 35 | 0 |
| ExtractionOverlay.tsx | 31 | 0 |
| CharacterSelect.tsx | 25 | 0 |
| ChatPanel.tsx | 24 | 0 |
| ShardboardTab.tsx | 19 | 0 |
| Login.tsx | 19 | 0 |
| ReconnectionOverlay.tsx | 13 | 0 |
| **TOTAL** | **478** | **0** |

The `theme.css` `@theme inline` block correctly exposes all tokens (`bg-bg-panel`, `text-accent-gold`, `text-text-primary`, etc.). **Zero components use them.** This means the palette is consistent by accident (all files hardcode the same hex values) but unmaintainable. A single palette change requires editing 478 occurrences.

### Color Accuracy

All hardcoded hex values match the design spec exactly:
- `#0A0B0F` = bg-primary ✅
- `#12131A` = bg-panel ✅
- `#1C1D27` = bg-elevated ✅
- `#E8E0D0` = text-primary ✅
- `#8A8B95` = text-secondary ✅
- `#4A4B55` = text-disabled ✅
- `#C9A84C` = accent-gold ✅
- `#8B2500` = danger ✅
- `#2D6B4F` = success ✅
- `#3A7D7B` = interactive ✅
- `#B8860B` = warning ✅
- `#6B8E6B` = tier-sturdy ✅
- `#4682B4` = tier-refined ✅
- `#7B4FA0` = tier-masterwork ✅
- `#DAA520` = tier-anomalous ✅

**One non-spec color found:** `#B89840` used for button hover states (6 occurrences). This is not in the design spec; the spec defines button hover as "subtle outer glow" not a darker fill. However, it's a reasonable UX approximation. The `styles.css` file defines `--accent-hover: #d4b35a` which is also unused.

### Font Strategy

| Usage | Spec Font | Implementation | Status |
|-------|-----------|----------------|--------|
| Narrative prose | Serif (Crimson Text) | `var(--font-serif)` = Crimson Text | ✅ Match |
| Commands/system | Mono (JetBrains Mono) | `var(--font-mono)` = JetBrains Mono | ✅ Match |
| UI labels/buttons | Sans (Inter) | `var(--font-sans)` = Inter | ✅ Match |
| Titles/headers | Serif/decorative (Cinzel option) | Uses Crimson Text (serif), not Cinzel | ✅ Acceptable |

Font assignments are **correct throughout**. Room names use serif. System messages use mono. UI chrome uses sans. Narrative prose uses serif. No mismatches found.

### Missing State Variants (gaps-brief §4)

| Variant | Status |
|---------|--------|
| §4A Button states (4 types × 4 states) | ❌ **Missing** — only primary gold button has hover. No danger, ghost, or secondary hover/active/disabled variants systematically defined |
| §4B Item card tier variants | ✅ Implemented via `getTierColor()` in StashTab, InventoryOverlay |
| §4C HP bar states (Healthy/Wounded/Critical) | ❌ **Missing** — static at 75%, always green |
| §4D Collapse timer phases | 🟡 Partial — color transitions work, "Destabilising" label exists, "COLLAPSE IMMINENT" missing, no pulse |
| §4E Extraction progress phases | 🟡 Partial — in-progress and success/death work. Interrupted state missing |
| §4F Toast notifications | ❌ **Missing** — Sonner `<Toaster />` imported in App.tsx but no custom styled toasts matching spec (4 types with left accent) |
| §4G Empty states (6 atmospheric) | ❌ **Missing** — only Sound Cues has "Silence." empty state. No atmospheric empty states for stash, contracts, characters, chat, shards, squad |

### Responsive Design

| Breakpoint | Spec | Implementation | Status |
|------------|------|----------------|--------|
| 1440px+ (Desktop) | Full experience | Fixed percentage widths | ✅ Functional |
| 1024px (Tablet Landscape) | Collapsible sidebar | ❌ No responsive behavior | ❌ Missing |
| 768px (Tablet Portrait) | Single-column + bottom sheet | ❌ No responsive behavior | ❌ Missing |
| <768px (Mobile) | Simplified | ❌ No responsive behavior | ❌ Missing |

---

## Consolidated Gap Table

| # | Screen | Gap | Severity | Spec Ref | Fix Owner |
|---|--------|-----|----------|----------|-----------|
| 1 | CharacterSelect | Starting loadout preview missing | 🟢 Minor | design-prompt §2 | Volo |
| 2 | Refuge | Crafting tab is stub | 🟡 Moderate | design-prompt §3 | Phase 2 |
| 3 | Refuge | Marketplace tab is stub | 🟡 Moderate | design-prompt §3 | Phase 2 |
| 4 | Refuge | Factions tab is stub | 🟡 Moderate | design-prompt §3 | Phase 2 |
| 5 | Refuge | Contracts tab is stub | 🟡 Moderate | design-prompt §3 | Phase 2 |
| 6 | Refuge | Players Nearby is stub | 🟡 Moderate | design-prompt §3 | Jarlaxle |
| 7 | Refuge | Top bar missing HP indicator + location breadcrumb | 🟡 Moderate | design-prompt §3 | Volo |
| 8 | Shardboard | Shard filters (tier/biome/modifier) missing | 🟡 Moderate | design-prompt §4 | Volo |
| 9 | Shardboard | Biome-specific icons not implemented | 🟢 Minor | design-prompt §4 | Volo |
| 10 | ShardExploration | **Combat text not color-coded** (gold/red/silver) | 🔴 Critical | design-prompt §5-6 | Volo |
| 11 | ShardExploration | Status effects section missing from sidebar | 🟡 Moderate | design-prompt §5 | Volo |
| 12 | ShardExploration | HP bar static — no dynamic state color transitions | 🟡 Moderate | gaps-brief §4C | Volo |
| 13 | ShardExploration | Stability bar is 128px, not full header width | 🟡 Moderate | design-prompt §5, gaps-brief §3A | Volo |
| 14 | ShardExploration | "COLLAPSE IMMINENT" label missing at <25% | 🟡 Moderate | gaps-brief §4D | Volo |
| 15 | ShardExploration | Collapse timer no pulse animation in red phase | 🟡 Moderate | gaps-brief §4D | Volo |
| 16 | ShardExploration | Sound cue direction words not teal-highlighted | 🟡 Moderate | gaps-brief §3B | Volo |
| 17 | ShardExploration | Sound cues no fade-out animation | 🟢 Minor | gaps-brief §3B | Volo |
| 18 | ShardExploration | Auto-complete hint above command input missing | 🟡 Moderate | design-prompt §5, gaps-brief §3E | Volo |
| 19 | ShardExploration | Mini-action buttons missing icons | 🟢 Minor | gaps-brief §3C | Volo |
| 20 | Combat | Tick timer countdown bar missing | 🟡 Moderate | design-prompt §6, gaps-brief §2A | Volo |
| 21 | Combat | "Skill" button missing from quickbar (7/8) | 🟡 Moderate | design-prompt §6 | Volo |
| 22 | Combat | No fade transitions on combat enter/exit | 🟢 Minor | gaps-brief §2A | Volo |
| 23 | Inventory | Item inspect sub-panel not implemented | 🟡 Moderate | design-prompt §7 | Volo |
| 24 | Inventory | "Inspect" action button missing | 🟢 Minor | design-prompt §7 | Volo |
| 25 | Extraction | Interrupted state not implemented | 🟡 Moderate | gaps-brief §4E | Volo + Jarlaxle |
| 26 | Extraction | Segmented progress bar (smooth instead) | 🟢 Minor | gaps-brief §2C | Volo |
| 27 | Chat | Trade interface not implemented | 🟡 Moderate | design-prompt §9 | Phase 2 |
| 28 | Chat | Nearby players not clickable | 🟢 Minor | gaps-brief §2D | Volo |
| 29 | Leaderboard | Faction leaderboard sub-tab missing | 🟡 Moderate | design-prompt §10 | Volo |
| 30 | Leaderboard | Contract deadline not displayed | 🟢 Minor | design-prompt §10 | Volo |
| 31 | Reconnection | "Character will defend..." text missing | 🟢 Minor | gaps-brief §2E | Volo |
| 32 | Reconnection | Says "Return to Refuge" not "Return to Login" on failure | 🟢 Minor | gaps-brief §2E | Volo |
| S1 | **ALL FILES** | **478 hardcoded hex values, zero theme tokens used** | 🔴 Critical | conversion-strategy §1.3 | Volo |
| S2 | **ALL FILES** | Pervasive inline `style={{ fontFamily }}` instead of Tailwind classes | 🟡 Moderate | conversion-strategy §1.3 | Volo |
| S3 | Cross-cutting | Button state variants not systematically defined | 🟡 Moderate | gaps-brief §4A | Volo |
| S4 | Cross-cutting | Toast notification system not styled per spec | 🟡 Moderate | gaps-brief §4F | Volo |
| S5 | Cross-cutting | Empty states not implemented (6 contexts) | 🟡 Moderate | gaps-brief §4G | Volo |
| S6 | Cross-cutting | No responsive breakpoints (1024px, 768px) | 🟡 Moderate | gaps-brief §5B-C | Phase 2 |

---

## Summary Metrics

| Category | Count |
|----------|------:|
| Total gaps identified | **38** |
| 🔴 Critical | **2** (combat text coloring, theme token adoption) |
| 🟡 Moderate | **24** |
| 🟢 Minor | **12** |
| Screens fully aligned | 3 of 12 (Login, Settings, Extraction mostly) |
| Phase 2 deferrals | 6 (Crafting, Marketplace, Factions, Contracts stubs, Trade interface, Responsive) |
| Actionable now | **32** |

---

## Prioritized Fix Batches

### Batch 1: Foundation (unblocks everything)
- **S1:** Theme token migration — replace all 478 hardcoded hex values with Tailwind theme tokens. This is the highest-leverage change.
- **S2:** Replace inline `fontFamily` styles with Tailwind `font-serif`/`font-mono`/`font-sans` utility classes.

### Batch 2: Core Gameplay Polish (Shard Exploration)
- **#10:** Combat text color-coding (hits dealt → gold, taken → red, dodges → silver)
- **#12:** Dynamic HP bar states (Healthy green → Wounded amber → Critical red pulse)
- **#11:** Status effects tags in sidebar
- **#13:** Full-width stability bar in narrative header
- **#14-15:** Collapse timer "COLLAPSE IMMINENT" label + pulse animation
- **#16:** Sound cue directional highlighting in teal
- **#18:** Auto-complete hint above command input
- **#20:** Tick timer countdown bar in combat
- **#21:** Add "Skill" button to combat quickbar

### Batch 3: Overlay Refinements
- **#23:** Item inspect sub-panel in inventory overlay
- **#25:** Extraction interrupted state
- **S3:** Button state variant system (primary/secondary/danger/ghost × default/hover/active/disabled)
- **S5:** Atmospheric empty states (6 contexts)

### Batch 4: Structural Gaps
- **#7:** Top bar: add HP indicator + location breadcrumb
- **#8:** Shardboard filters
- **#29:** Faction leaderboard sub-tab
- **S4:** Toast notification styling per spec

### Batch 5: Polish (defer to Phase 1.1)
- All 🟢 Minor items (#1, #9, #17, #19, #22, #24, #26, #28, #30, #31, #32)

---

## Disposition

The implementation has strong bones. The visual language is correct — palette, fonts, layout proportions all match the Figma spec. The architecture (Colyseus message-only protocol, React Context, server-authoritative state) is sound.

But the two systemic issues (theme token adoption, inline fontFamily) are technical debt that compounds with every new feature. And the combat text color-coding gap directly undermines the core gameplay readability — the spec explicitly states hits dealt in gold, hits taken in red, dodges in silver, and the current implementation renders all combat text in uniform bone white.

**Recommendation:** Batch 1 (theme token migration) should be the next sprint. It touches every file but is mechanical — a skilled agent can do it in a focused session. Batch 2 (Shard Exploration polish) follows immediately because that's where players spend 60%+ of their time.

*— Elminster*
___BEGIN___COMMAND_DONE_MARKER___0
---

---

## 2026-03-22: Theme token migration (Batch 1)
**By:** Volo (Narrative Dev)  
**Date:** 2026-03-22  
**Scope:** Client UI — 13 active files  

**Decision:** Replace all hardcoded hex utilities with Tailwind theme tokens, and replace inline fontFamily styles with `font-serif`, `font-sans`, or `font-mono` utility classes.

**Why:**
- UX review flagged pervasive hardcoded Tailwind hex colors and inline fontFamily styles, creating dual-palette risk and costly maintenance surface.
- `theme.css` already defines semantic tokens via `@theme inline`; components should consume these, not reinvent colors.
- Theme-first approach ensures palette changes flow from single source of truth.

**Impact:**
- Components are now token-first; palette changes flow from CSS variables.
- Dynamic color styles (tier/status) expressed via token variables instead of hex.
- Future UI work must avoid reintroducing arbitrary hex values or fontFamily styles.
- PR #103: 390 hardcoded hex → theme tokens, 0 remaining hex, 0 fontFamily remaining, TSC passes.

**Follow-up:** Batch 2 (combat/sidebar polish) tests ready. Implementation may proceed on signal from prioritization.

---

## 2026-03-22: UX Batch 2 — Anticipatory Test Contracts
**By:** Minsc (Tester)  
**Date:** 2026-03-22  
**Scope:** UX Review Batch 2 combat/sidebar polish (gaps #10-21)

**Decision:** Define 24 anticipatory tests covering 10 UX gaps, establishing DOM contract that Batch 2 implementation must satisfy.

**Key decisions:**
1. **Theme token classes over hex**: All color assertions use Tailwind token classes (`text-accent-gold`, `text-danger`, `text-text-secondary`, `text-interactive`, `text-success`, `text-warning`) — compatible with Volo's Batch 1 token migration.
2. **Combat subtypes via data attribute**: Color-coded combat messages tested via `[data-combat-type]` ancestor traversal. Implementation accommodates either `combatSubtype` field or content-based parsing.
3. **State shape extension**: Tests document expected AppState additions: `statusEffects`, `playerHp`, `playerMaxHp`.
4. **Accessibility-first tick timer**: `role="progressbar"` and `aria-valuenow` ensure screen-reader compatibility.
5. **Test IDs for emerging elements**: `data-testid` on auto-complete hint and tick timer for elements not yet implemented.

**Results:** 21 failing (expected) / 3 passing. Zero regressions on 77 existing tests.

**Team impact:**
- **Volo (Batch 2 implementer):** Run `npx vitest run packages/client/src/__tests__/ux-batch2-combat-sidebar.test.tsx` — all 24 should pass. If state field names differ, update test overrides.
- **Drizzt:** Coordinate on `combatSubtype` values if COMBAT_RESULT handler changes.
- **All:** `CombatAction` already includes `'skill'` type; quickbar just needs to add it (gap #21).

**Status:** Test contracts stable and ready for implementation. File: `packages/client/src/__tests__/ux-batch2-combat-sidebar.test.tsx`.

---

## 2026-03-22T10:58:00Z: PR #104 Review — Combat/Sidebar Polish Batch 2 (APPROVED)

**Date:** 2026-03-22  
**Reviewer:** Elminster (Lead / Architect)  
**Scope:** PR #104 feat(client): combat/sidebar polish — 10 UX gaps (Batch 2)  
**Authors:** Volo (implementation), Drizzt (test regex fix), Minsc (anticipatory tests)  
**Status:** ✅ **APPROVED** — Merge to `dev`

**Branch:** `squad/ux-batch2-combat-sidebar` → `dev` (commit `afaa80b`)  
**Files Changed:** 7 (+705 / -13 lines)  
**Test Results:** 101/101 client tests pass (24 new + 77 existing). Zero regressions.

**Gaps Verified:**
| Gap | Feature | Status |
|-----|---------|--------|
| #10 | Combat text color-coding (hit_dealt→gold, hit_taken→red, dodge→silver) | ✅ |
| #11 | Status effects in sidebar | ✅ |
| #12 | Dynamic HP bar states (Healthy→Wounded→Critical) | ✅ |
| #13 | Stability bar full width | ✅ |
| #14-15 | Collapse imminent warning + pulse animation | ✅ |
| #16 | Sound cue direction highlighting | ✅ |
| #18 | Auto-complete command hint | ✅ |
| #20 | Tick timer progress bar | ✅ |
| #21 | Skill button in quickbar (8/8 actions complete) | ✅ |

**Quality Strengths:**
- `healthState` derivation is DRY (single computation, two render sites)
- Regex pattern `^\d*\s*${label}$` safely handles numbered labels
- All new rendering uses theme tokens (text-accent-gold, text-danger) — no hardcoded hex
- Comprehensive `data-*` attributes for test targeting
- State extensions minimal and well-typed

**Non-Blocking Nits:**
1. Dead code: `DIRECTIONS` const (ShardExploration.tsx:159) unused
2. DRY opportunity: Stability bar color logic duplicates `getCollapseColor()` thresholds
3. Test inconsistency: Gap #21 test uses unanchored regex (harmless)

None warrant rejection. Flagged for future cleanup pass.

**Impact:** Phase 1 UX polish complete. All 10 Batch 2 gaps shipped. Ready for Phase 2 planning.

_Merged from decisions/inbox/ on 2026-03-22T10:58:00Z._


---

## 2026-03-23T18:45:00Z: Admin UI Requires Full API Wiring Pass

**Author:** Minsc (Tester/QA)  
**Date:** 2026-03-23  
**Status:** DECIDED  
**Scope:** Admin panel audit findings → Phase 2.5 decomposition  

### Context

Comprehensive audit of all 25 React admin pages and 8 server admin endpoints reveals that the admin UI is entirely cosmetic — zero API calls, zero endpoint wiring. All data is hardcoded mock data in local component state.

### Findings Summary

- **27 dead buttons** across detail/list/action pages (Save Draft, Submit Review, Simulate, Re-roll, Add User, Deploy ×3, Publish, Deprecate, Delete Draft, View All Activity, Review All)
- **8 cosmetic forms** with no data binding to backend
- **12 mock data lists** (all using hardcoded local component state)
- **0 out of 25 pages make any API call**
- **8 server endpoints** exist but are uncalled by React admin:
  - `GET /admin/api/rooms`, `GET /admin/api/rooms/:roomId`
  - `POST /admin/api/rooms/:roomId/pause`, `POST /admin/api/rooms/:roomId/resume`
  - `GET /admin/api/creatures`, `GET /admin/api/players`, `GET /admin/api/metrics`, `GET /admin/api/sse`
- **1 stub server endpoint** (`POST /admin/api/rooms/:roomId/spawn` — broadcasts chat message only, no NPC spawn logic)

### Impact

All admin pages render correctly but cannot persist any data. Designers using these screens would lose all work on page refresh.

### Recommendation

Before treating admin screens as "done", a wiring pass is needed:
1. Define content CRUD API endpoints (GET/POST/PUT/DELETE for items, creatures, biomes, modifiers, skills, loot-tables, factions, rooms, narrative)
2. Wire list pages to fetch data from server
3. Wire detail page Save/Submit buttons to POST/PUT endpoints
4. Clarify purpose of orphan endpoints and SSE
5. Implement spawn endpoint logic

**Next:** See decision below (Elminster's Phase 2.5 decomposition).

---

## 2026-03-23T18:45:00Z: Phase 2.5 Admin Audit Decomposition

**Author:** Elminster (Lead)  
**Date:** 2026-03-23  
**Status:** DECIDED  
**Scope:** Admin screen audit findings → GitHub issue decomposition  
**Audience:** Drizzt (Engine Dev), Jarlaxle (Systems Dev), Minsc (Tester), Volo (Client Dev)

### Problem Statement

Minsc's audit found 27 dead buttons and 8 orphan endpoints across admin UI. Risk: decomposing as 27 separate issues creates unmaintainable backlog with invisible dependency chains.

**Decision:** Decompose into **12 well-scoped GitHub issues** (#128–139), grouped by functional area and dependency chain.

### Issue Decomposition

| # | Title | Type | Depends On | Priority |
|---|-------|------|-----------|----------|
| 139 | **FOUNDATIONAL: Content CRUD API** | Server | — | P1 Blocker |
| 128 | Wire Creatures List + Detail | Client | #139 | P2 |
| 129 | Wire Items List + Detail | Client | #139 | P2 |
| 130 | Wire Biomes List + Detail + Stubs | Client | #139 | P2 |
| 131 | Wire 6 Remaining Detail Pages | Client | #139 | P2 |
| 132 | Wire Dashboard | Client+Server | #139 | P2 |
| 133 | Deploy Page Implementation | Client+Server | — | P3 |
| 134 | User Management | Client+Server | — | P3 |
| 135 | Audit Log | Client+Server | — | P3 |
| 136 | Simulator Features | Client+Server | #128, #131 | P3 |
| 137 | Orphan Endpoints Finalization | Server | #131 | P3 |
| 138 | Stub Pages + Layout Features | Client+Server | — | P3 |

### Execution Sequence

```
PHASE 1 (Foundational):
  #139 ← must complete first

PHASE 2 (Detail Pages + Dashboard):
  #128, #129, #130, #131 (all depend on #139)
  #132 (Dashboard wiring)
  #135 (Audit Log)

PHASE 3 (Supporting Features + Management):
  #134 (User Management)
  #136 (Simulators, after creatures + loot tables work)
  #137 (Room endpoints finalization)

PHASE 4 (Polish):
  #133 (Deploy)
  #138 (Stubs + Layout)
```

### Rationale

**Why not 27 separate issues?**
- All 8 detail page Save buttons have identical requirements
- Bulk actions cluster into 1 feature (not 3)
- Pagination Previous/Next is 1 feature (not 2)
- Result: 27 issues → confusing dependency graph, unclear ownership

**Why group by entity type?**
- Admin pages follow consistent CRUD pattern (List → Detail → Save)
- Grouping allows engineers to build once per entity and reuse pattern

**Why is #139 P1 blocker?**
- All detail pages depend on GET/:id and PUT/:id endpoints
- Prevents wasted effort on UI wiring without backend infrastructure

### Content CRUD API Design (#139)

**Pattern (per entity):**
```
GET    /admin/api/{entity}           → list (paginated)
GET    /admin/api/{entity}/:id       → fetch one
POST   /admin/api/{entity}           → create
PUT    /admin/api/{entity}/:id       → update
DELETE /admin/api/{entity}/:id       → soft delete or mark as draft
```

**Entities:** items, creatures, biomes, modifiers, skills, loot-tables, factions, rooms, narrative

**Server responsibility:**
- Validation (required fields, enum values, numeric ranges)
- Authorization (admin-only? or role-based per entity type?)
- Audit logging (all mutations recorded)
- Conflict resolution (optimistic locking or last-write-wins?)

### Form Wiring Pattern (Detail Pages)

Each detail page follows:
1. Load data: `useEffect(() => { fetch(GET /admin/api/{entity}/:id) }, [id])`
2. Update local state: `useState(entity)`
3. Save: `onClick={() => fetch(PUT /admin/api/{entity}/:id, state)}`
4. Handle errors: Show toast/modal on failure
5. Handle loading: Disable buttons, show spinner

### Labels

- `phase:2.5` — Phase 2.5 scope (new label created)
- `admin` — Admin panel (new label created)
- `priority:p1` — #139 only (blocker)

### Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Endpoint design changes mid-implementation | Review #139 endpoint design early in code review |
| Authorization model unclear | Define admin role strategy before #139 merge |
| Deployment flow complexity underestimated | Spike on deployment logic early; coordinate with Drizzt |
| SSE scope creep | Clarify requirements in #137 before starting #138 |
| Database performance (1000+ items) | Add pagination + indexes in #139; note in AC |

### Follow-Up Actions

1. **Drizzt (Engine Dev):** Review #139 endpoint design, implement Content CRUD API, clarify SSE usage
2. **Jarlaxle (Systems Dev):** Estimate simulator logic (#136), possibly user management backend (#134)
3. **Minsc (Tester):** Plan end-to-end test strategy, load testing (1000+ creatures)
4. **Elminster (Lead):** Code review #139 before approval, monitor cross-system integration

### Status

- ✅ All 12 issues created and labeled `phase:2.5`
- ✅ Dependency chain documented (in issue descriptions)
- ⏳ #139 Content CRUD API design awaiting Drizzt review
- ⏳ Sprint planning with team to estimate timeline

---

## User Directives Captured (2026-03-23)

### 1. No Statically Defined Game Assets (2026-03-23T18:53:39Z)

**By:** dkirby-ms (via Copilot)

**Directive:** All content definitions (items, creatures, biomes, modifiers, skills, loot tables, factions, rooms, narrative) must be stored in PostgreSQL, not hardcoded in TypeScript registries. The CRUD API must create proper DB tables and migrate existing static data.

**Why:** Admin screens need to manage real persistent data, not code-level constants. Static registries like `items/registry.ts` should be replaced with DB-backed repositories.

**Implications:**
- Content CRUD (#139) must use PostgreSQL storage, not in-memory `ContentStore`
- Migration strategy needed to move `ITEM_REGISTRY` and other static data to DB
- Admin UI can manage templates at runtime

### 2. Microsoft Entra External Identities for OAuth (2026-03-23T18:55:27Z)

**By:** dkirby-ms (via Copilot)

**Directive:** Use Microsoft Entra External Identities for user authentication. An external tenant is already deployed. App registration and user flow configuration will be done manually by the user. The app must implement the OAuth flow against Entra External ID.

**Why:** Cloud instances are live; need proper auth instead of dev-mode tokens.

**Implementation Notes:**
- External tenant deployed; app registration + user flow config done manually by user
- App must implement OAuth flow (authorization code, token exchange, refresh)
- Local auth behind dev toggle for testing (current bcrypt + JWT kept for dev)
- Admin routes must enforce OAuth roles (not just static ADMIN_TOKEN)

**Implications:**
- Issue #140 [Auth] Implement Entra External ID OAuth for player authentication created
- Auth audit completed; no OIDC libraries exist (clean slate)
- OAuth implementation unblocks PR #141 (Content CRUD + PostgreSQL storage)

---

## Decision: Content CRUD API Architecture (2026-03-24)

**By:** Drizzt (Engine Dev)

**PR:** #141 (awaiting PostgreSQL + OAuth before merge approval)

**Issue:** #139

### Context

Phase 2.5 admin pages need a content management API. The existing admin routes serve live runtime data (Colyseus rooms, creature instances, metrics). Content CRUD serves game *definition* data (templates, schemas) — conceptually different.

### Decisions

#### 1. Content Namespace: `/admin/api/content/{entity}`

Routes namespaced under `/admin/api/content/` to avoid collision with existing live-data routes at `/admin/api/rooms` and `/admin/api/creatures`. Existing endpoints remain untouched.

**Relevant to:** Jarlaxle (admin UI fetch URLs must use `/admin/api/content/` prefix), Minsc (integration test paths).

#### 2. In-Memory ContentStore with Repository Pattern

Generic `ContentStore<T>` class using `Map<string, T>` with async interface. Follows the same pattern as `PlayerRepository` and `StashRepository`. Ready for PG swap when needed.

**⚠️ Update (2026-03-23):** User directive requires PostgreSQL storage. In-memory approach blocks PR #141 merge. Next phase: migrate to `ContentRepository` with PostgreSQL backend.

**Relevant to:** Anyone adding persistence features.

#### 3. Pre-Seeded from Existing Registries

Content stores initialized from `ITEM_REGISTRY` (18 items), creature templates (1), plus biome/modifier/faction descriptors derived from shared type enums. Skills, loot-tables, rooms, and narrative start empty.

**Relevant to:** Admin UI should expect pre-populated data for items, creatures, biomes, modifiers, factions.

#### 4. Validation: Permissive for Phase 1

Only `name` is universally required. Entity-specific checks are minimal (type enums for items, entries array for loot-tables). Full schema validation can be tightened as content schemas stabilize.

**Relevant to:** Anyone building admin forms — server accepts flexible payloads.

# Decision: Biome Admin UI Schema Adaptation

**Date:** 2025-01-21  
**Decider:** Drizzt (Engine Dev)  
**Context:** Issue #130 — Wire BiomesList & BiomesDetail to Content CRUD API  
**Status:** Implemented

## Problem
The BiomesList and BiomesDetail pages were built with mock data that didn't match the backend `BiomeDefinition` schema. The UI needed to be adapted to work with the real Content CRUD API.

## Mock Schema (Before)
```typescript
interface Biome {
  id: string;
  name: string;
  type: string;                    // e.g., "flooded_crypt"
  signatureCreature: string;       // e.g., "Drowned Revenant"
  signatureHazard: string;         // e.g., "Rising Waters"
  roomCount: number;               // 18
  status: "published" | "draft";
  // ... plus detail fields like flavour, ambientSounds, lightLevelMin/Max, roomNames map
}
```

## Backend Schema (Actual)
```typescript
interface BiomeDefinition {
  id: string;
  name: string;
  description: string;
  tier: number;
  features: string[];
  hazardTypes: string[];
  roomProperties: string[];
  narrationHints: string[];
}
```

## Decision
**Adapt the UI to fully embrace the backend schema**, removing all mock-specific fields and implementing proper CRUD operations.

### Changes Made:
1. **BiomesList Table Columns**:
   - Removed: Type, Signature Creature, Signature Hazard, Room Templates, Status
   - Added: Description (truncated), Tier, Features count, Hazards count
   
2. **BiomesDetail Form Fields**:
   - Removed: type (slug), flavour, signatureCreature, signatureHazard, ambientSounds, lightLevelMin/Max, roomNames map
   - Added: description (textarea), tier (number), features (array), hazardTypes (array), roomProperties (array), narrationHints (array)
   
3. **Tab Structure**:
   - "Overview" → Basic info (name, description, tier) + features array
   - "Room Names" → Renamed to "Room Properties" → roomProperties + narrationHints arrays
   - "Room Descriptions" → Kept as stub ("Coming soon...")
   - "Loot Table" → Kept as stub ("Coming soon...")
   - "Hazards" → Wired to hazardTypes array editor

## Rationale
1. **Single Source of Truth**: Backend schema is authoritative. UI must adapt, not the other way around.
2. **Simplicity**: Backend schema is simpler and more focused than mock — good for Phase 1.
3. **Future-Proof**: Stubs for unimplemented tabs (Room Descriptions, Loot Table) allow for future expansion.
4. **Array Editors**: Dynamic array fields (features, hazardTypes, etc.) are flexible and user-friendly.

## Alternatives Considered
1. **Keep mock fields, adapt backend**: ❌ Wrong direction — backend is frozen, UI is flexible.
2. **Gradual migration**: ❌ Adds complexity, tech debt. Better to rip the band-aid off.
3. **Dual schema support**: ❌ Unnecessary — no real biome data exists yet in dev.

## Implementation Notes
- Reused existing `admin-api.ts` utility (from #128, #129)
- Loading/error states added for all API calls
- Form validation checks required fields (name, description)
- Navigation to detail view after create (with generated ID)

## Follow-Up Work
- Room Descriptions tab: Needs template editor (future)
- Loot Table tab: Needs loot table selector (future)
- Status/Publishing workflow: Submit Review button is placeholder
- Admin auth: localStorage token is Phase 1 — needs secure flow for production

## Related
- Issue #130
- PR #144
- `packages/server/src/admin/content/content-types.ts` (BiomeDefinition)
- `packages/client/src/lib/admin-api.ts` (CRUD utility)

---

## 2026-03-24: Dev Auto-Login Hook Wired Up

**By:** Drizzt (Engine Dev)  
**Date:** 2026-07-17  
**Commit:** da93ab7  

**Decision:** Wire the existing `useDevAutoLogin` hook into Login.tsx to auto-authenticate local dev users.

**Why:**
- Developers were forced to manually log in every time they started the app locally
- Hook already existed with correct logic — it just needed to be invoked
- Hook checks `import.meta.env.DEV` which Vite strips from production builds

**Impact:**
- **Dev experience:** No more manual login in local dev. Page auto-authenticates with `dev/devdev` credentials and redirects to `/refuge`
- **Production safety:** Zero risk — `import.meta.env.DEV` code is eliminated at build time
- **Fallback:** If server isn't running, hook silently fails and the manual login form remains available

**Relevant To:**
- **Jarlaxle:** Client UI changes in Login.tsx — no visual changes, just an added hook call
- **Minsc:** Integration tests may now see auto-login behavior in dev mode

**Files Modified:**
- `packages/client/src/pages/Login.tsx`

---

## 2025-07-26: Dodge Chance Formula and PRNG Integration

**By:** Jarlaxle  
**Date:** 2025-07-26  
**Status:** Implemented  
**Scope:** Combat System (damage.ts, CombatSystem.ts)

### Context

GDD §6.4 specifies that dodge grants a "% chance to fully avoid an attack (based on AGI stat + dodge skill rank)." This was missing from the Phase 1 combat implementation — dodge only halved damage via the 0.5 stance multiplier.

### Decision

- **Dodge chance formula:** `min(0.75, defence × 0.05)` — 5% per point of defence, capped at 75%.
- **PRNG injection:** CombatSystem accepts an optional `RollFn` at construction. Default returns 1 (never dodge) for backward compatibility.
- **Successful dodge:** `finalDamage = 0`, overriding the min-1-damage rule. The stance multiplier (0.5) still applies when dodge fails.
- **Defence stat mapping:** In Phase 1, the `defence` stat on Combatant serves as AGI/evasion. When skills are added in later phases, the formula should incorporate dodge skill rank additively.

### Impact

- The `calculateDamage()` signature gained an optional `DamageOptions` parameter — existing callers are unaffected.
- `CombatSystem` constructor gained an optional second `RollFn` argument — existing instantiations in ShardRoom need no changes until a real PRNG is wired in.
- Balance constants (`DODGE_CHANCE_PER_DEFENCE`, `MAX_DODGE_CHANCE`) are exported for easy tuning.

### For Other Agents

- **ShardRoom wiring:** When a seeded PRNG is available per shard, pass `prng.next` as the second arg to `new CombatSystem(exitResolver, prng.next)`.
- **Creature AI:** No changes needed — creatures use the same Combatant interface, their defence stat now affects dodge chance when they choose dodge action.

---

## 2026-03-25: Rate Limiters Per-Router Instance

**By:** Drizzt (Engine Dev)  
**Date:** 2026-03-25  
**Status:** Implemented

### Context
Adding `express-rate-limit` to auth endpoints. Module-level singleton limiters caused cross-test contamination — shared counters between test suites meant early register tests exhausted the limit before login tests could register their fixture users.

### Decision
Rate limiter instances are created **inside** `createAuthRouter()`, not at module scope. Each call to `createAuthRouter` gets fresh limiters with independent counters. Config constants (`LOGIN_RATE_LIMIT`, `REGISTER_RATE_LIMIT`) are exported for test assertions.

### Implications
- Production: single router instance, single set of limiters — no change in behavior
- Tests: each `createTestApp()` call gets isolated rate limit state
- If someone needs to share limiter state across multiple routers (e.g., cluster-wide limiting), they'll need to pass a custom `store` option — but that's a future concern

---

## 2026-03-25T12:16: Player identity keying pattern (sessionId → playerId)

**By:** Jarlaxle (Systems Dev)  
**Issue:** #197  
**PR:** #200  
**Date:** 2026-03-25  
**Status:** Implemented

### What

All room types (RefugeRoom, ShardRoom) must key player state to the persistent `playerId` from auth context, never to `client.sessionId`. Both rooms now use the same identity resolution pattern:

```typescript
const playerId = (options['playerId'] as string) || client.sessionId;
this.playerIds.set(client.sessionId, playerId);
```

The `playerIds` map (`sessionId → playerId`) provides forward lookup. `findClient()` does reverse lookup (`playerId → sessionId → Client`).

### Why

`client.sessionId` is ephemeral — a new one is assigned on every WebSocket connection. Using it as the player identity key causes all player-facing data (stash, combat state, extraction progress, traces) to become orphaned on reconnect.

### Impact

- Any future room types must follow this pattern — never key game state by `client.sessionId`.
- Combat system, extraction system, downing system, trace system, and awareness system all receive `playerId`, not `sessionId`.
- `findClient()` accepts `playerId` and reverse-lookups through the `playerIds` map. Direct `this.clients.find(c => c.sessionId === sid)` should only be used inside `findClient()` itself.
- Phase 2 consideration: `options['playerId']` is client-supplied and not validated against `client.auth.playerId`. This is fine for Phase 1 simple auth but should be hardened when OAuth lands.

## 2026-03-25: Fix Player Identity Handoff in Room onJoin

**By:** Elminster (Lead/Architect)  
**Date:** 2026-03-25  
**Status:** Bug identified, fix required  
**Severity:** 🔴 Critical — all player persistence is non-functional

### Problem

`ShardRoom.onJoin()` and `RefugeRoom.onJoin()` read `options['playerId']` to resolve the player's identity. In Colyseus 0.17, the return value of `onAuth()` is passed as `client.auth`, NOT merged into `options`. The client sends `{ token }` — there is no `playerId` in options.

The code falls back to `client.sessionId`, a 9-character nanoid that:
1. Is not a UUID (all game tables use `player_id UUID`)
2. Does not exist in the `players` table (FK violations)
3. Changes every connection (no persistence across sessions)

### Impact

- ALL game persistence is broken: profiles, stash, factions, run history
- Postgres saves fail silently (type error or FK violation)
- InMemory stores accept the wrong key but data is transient and unlinked
- Tests pass because `@colyseus/testing` bypasses `onAuth` and passes options directly

### Required Fix

Both rooms must read from `client.auth`:

```typescript
// ShardRoom.ts line 252 and RefugeRoom.ts line 91
const authData = client.auth as { playerId?: string; username?: string } | undefined;
const playerId = authData?.playerId || (options['playerId'] as string) || client.sessionId;
```

### Files Affected

- `packages/server/src/rooms/ShardRoom.ts:252`
- `packages/server/src/rooms/RefugeRoom.ts:91`

### Testing

- Existing tests will continue to pass (they use `options['playerId']` path)
- NEW integration test needed: verify `client.auth` path works with real auth flow
- Manual verification: register → login → join shard → leave → check `player_skills` table has rows with the correct `players.id` UUID

### Team Impact

- **Drizzt:** Implement the fix + integration test
- **All:** Any future room types must use `client.auth?.playerId`, not `options['playerId']`
---

## 2026-03-25T22:58Z: User directive — Old-school MUD visual aesthetic

**By:** dkirby-ms (via Copilot)  
**Status:** Captured for design direction  

**What:** The game should evoke the feeling of playing an old-school MUD. Use a console-like (monospace) font and ANSI-style coloring to convey visual info about items and events. Think terminal aesthetic — not modern web UI.

**Why:** User request — core design direction for the client's visual identity

---

## 2026-03-25T23:13Z: User directives — Stash/Loadout UI & mechanics

**By:** dkirby-ms (via Copilot)  
**Status:** Captured for mechanics constraints  

**What:**
1. **Layout:** Loadout on LEFT, Stash on RIGHT (not the reverse).
2. **In-shard equipping:** Players CAN swap equipment while exploring shards, including equipping items found in the shard. Loadout is NOT locked on shard entry.
3. **No durability/repair:** Keep repair and durability systems out of this work — that's Phase 3.
4. **Slot restrictions:** Equipment slots MUST enforce item type restrictions — chest slot only takes chest gear, rings for finger slots, hats/helmets for head, weapons for weapon slot, etc. Typed slot validation is required.

**Why:** User request — captured for team memory. These override Elminster's plan assumptions (which had stash on left, locked loadout during runs, and included durability checks).

---

## 2026-03-25T23:14Z: User directive — Shard entry requirements

**By:** dkirby-ms (via Copilot)  
**Status:** Captured  

**What:** Players should be allowed to enter a shard if they have the right key (or keys/other required items). Weapons are optional — do NOT require a weapon to enter a shard.

**Why:** User request — overrides Elminster's plan which listed "weapon required" as a shard entry validation rule. Only shard key(s) and any shard-specific required items gate entry.

---

## 2026-03-25T23:15Z: User directive — Server-authoritative stash/loadout anti-exploit

**By:** dkirby-ms (via Copilot)  
**Status:** Captured  

**What:** The stash/loadout system MUST be server-authoritative and hardened against item duplication bugs and other potential exploits. The client is a dumb terminal — all item moves (stash↔loadout, equip, unequip, pick up shard loot) must be validated and executed server-side. No client-side inventory mutations.

**Why:** User request — this is a PvPvE extraction game where item economy integrity is critical. Dupe bugs would be game-breaking.

---

## 2026-03-26: Compass Navigation Replaces Inline Exit Links

**Date:** 2026-03-26  
**By:** Drizzt (Engine Dev)  
**Issue:** #195  
**PR:** #205  
**Status:** Implemented  

### What

Direction/exit navigation is now handled by a persistent `CompassControl` widget in the sidebar instead of inline `Exits: [north] [east]` links reprinted on every room entry.

### Why

Inline exit links cluttered the narrative pane — every room move reprinted them, pushing story text off-screen. A persistent widget keeps exits always visible without polluting the narrative flow.

### Impact

- **Client narration no longer includes exit links.** Any component rendering `msg.type === "room"` should NOT add its own exit UI — the compass handles it.
- **`onRoomHeader` no longer emits an "Exits:" header message.** The room header dispatch updates `state.roomHeader.exits` which the compass reads reactively.
- **Exit data flow is unchanged:** Server sends `RoomHeaderMessage.exits[]`, client stores in `state.roomHeader`, compass reads from context. No new protocol messages.
- **The `exit-detection.ts` utility still exists** for potential future use (e.g., highlighting directions in LLM prose), but is no longer used for inline link rendering.

---

## 2026-03-20: Panel Layout Swap — ShardExploration

**By:** Drizzt (Engine Dev)  
**Date:** 2026-03-20  
**Status:** Implemented  

**What:** Swapped the two main panels in `ShardExploration.tsx` — the shardboard sidebar (30%) is now on the LEFT, and the narrative text panel (70%) is now on the RIGHT. Panel widths unchanged; only position swapped.

**Why:** User preference — narrative text gets the right side, shardboard/status panel gets the left side.

**Affects:** Any future work on `packages/client/src/pages/ShardExploration.tsx` layout or responsive breakpoints.

---

## 2026-03-26: Refuge Layout — Narrative Center, Tabs Right

**By:** Drizzt (Engine Dev)  
**Date:** 2026-03-26  
**Status:** Implemented  

**What:** The Refuge page layout has been reorganized:
- **Center column (flex-1):** Narrative/chat scrolling text window + command input
- **Right column (25%):** Players Nearby + tab content (shardboard, stash, loadout, etc.)
- **Left column (25%):** Tab navigation + ambient events (unchanged)

**Why:** Narrative feed needs the wider center area for better readability and proper scroll handling.

**Impact:** Auto-scroll uses `state.messages` as dependency (matching ShardExploration pattern).

---

## 2026-03-24: Unified Equipment/Stash UI + Shared Types

**By:** Drizzt (Engine Dev)  
**Date:** 2026-03-24  
**Status:** Implemented  
**Scope:** Client UI + Shared message protocol

### What

Replaced separate StashTab and LoadoutTab with a unified CombinedStashLoadout component. Added equipment slot types, message protocol, and display types to @ellmud/shared.

### Key Decisions

1. **Equipment Slot System:** 10 named slots: `head`, `chest`, `legs`, `feet`, `hands`, `weapon`, `offhand`, `ring1`, `ring2`, `amulet`. Defined as `EquipmentSlotType` in shared. `SLOT_ACCEPTS` maps which `ItemType` each slot accepts (e.g., weapon→['weapon'], head→['armour']). Ring/amulet slots temporarily accept 'material' — needs a jewelry ItemType later.

2. **Message Protocol:**
   - Client → Server: `EQUIP_ITEM { itemId, targetSlot }`, `UNEQUIP_ITEM { slot }`
   - Server → Client: `LOADOUT_UPDATE { slots }`, `STASH_UPDATE { items }`
   - Added to `MessageTypes` const in shared

3. **DisplayItem Contract:** Server sends pre-resolved `DisplayItem` objects (name, type, tier, weight, description, allowedSlots) so the client never needs to look up definitions. Jarlaxle's server-side LoadoutService must emit this format.

4. **GearTier → MUD Rarity CSS Mapping:** scrap→ansi-dim, common→mud-common, sturdy→mud-uncommon, refined→mud-rare, masterwork→mud-epic, anomalous→mud-legendary

5. **No Optimistic Updates:** Client sends equip/unequip requests and shows a pending state. UI only mutates when server confirms via LOADOUT_UPDATE/STASH_UPDATE.

### Impact
- **Jarlaxle:** Must implement LOADOUT_UPDATE and STASH_UPDATE message emission in LoadoutService/room handlers
- **All UI work:** GearTier→MUD class mapping is now canonical — use `TIER_CLASS` from CombinedStashLoadout or factor into shared utility
- **StashTab.tsx and LoadoutTab.tsx:** No longer imported by any page. Can be deleted or kept as reference.

---

## 2025-07-25: LoadoutService Architecture Decision

**By:** Jarlaxle (Systems Dev)  
**Date:** 2025-07-25  
**Status:** Implemented  
**Context:** Server-authoritative equipment system for loadout management

### What

LoadoutService uses a **per-player mutex lock** to prevent race conditions during equip/unequip/swap operations. All item moves are atomic: remove-from-source + add-to-destination in a single locked operation.

### Key Decisions

1. **Two-form constructor**: `LoadoutService(stashRepo, itemDefs)` for tests (internal in-memory loadout), `LoadoutService(loadoutRepo, stashRepo, itemDefs)` for rooms with explicit repos.

2. **Slot restrictions use shared `SLOT_ACCEPTS`**: No item sub-type enforcement (e.g., helmet vs chestpiece — both are "armour" and fit any armour slot). Sub-type enforcement deferred to Phase 2 if needed.

3. **Shard equipping via separate methods**: `equipFromInventory()` and `unequipToInventory()` for in-shard operations. Displaced items are NOT added to stash — they go back to shard inventory (caller responsibility).

4. **Shard entry validation**: Requires at least one "key" type item in stash. Weapons are optional. No durability checks (Phase 3).

5. **Empty slot unequip is a no-op success** (`ok: true`), not an error.

### Impact

- Rooms must register EQUIP_ITEM, UNEQUIP_ITEM, SWAP_ITEM message handlers
- Client receives LOADOUT_UPDATE after every server-confirmed operation — no optimistic client state
- ShardRoom blocks equipment changes during extraction

---

## 2025-07-26: Reusable `useAutoScroll` hook pattern for scrollable containers

**By:** Jarlaxle (Systems Dev)  
**Issue:** #196  
**PR:** #204  
**Date:** 2025-07-26  
**Status:** Implemented  

**What:** Created `packages/client/src/hooks/useAutoScroll.ts` — a generic hook for any scrollable container that needs auto-scroll-to-bottom with smart disengage/re-engage. Also established the `.narrative-scroll` CSS class in `theme.css` as the standard game-themed scrollbar.

**Why:** Both ShardExploration and Refuge had ad-hoc scroll logic (naive `scrollTop` set, `scrollIntoView` sentinel div). The hook centralizes the pattern and handles the edge case of user-initiated scroll-up correctly.

**Impact:** Any new scrollable pane (chat, logs, event feeds) should use `useAutoScroll(dependency)` instead of rolling custom scroll logic. Use the `narrative-scroll` CSS class on any container that needs a themed scrollbar. The threshold parameter (default 48px) controls how close to the bottom the user must scroll to re-engage auto-scroll.

---

## 2025-07-26: Stash/Loadout Test Coverage Strategy

**Author:** Minsc (Tester)  
**Date:** 2025-07-26  
**Status:** Complete  

### Context

Jarlaxle implemented the LoadoutService (equip/unequip/swap between stash and equipment slots). Minsc was tasked with writing comprehensive test coverage before the system goes live.

### Decisions

1. **4-file test structure** — Split tests by concern rather than one mega-file:
   - `loadout-service.test.ts` — Core unit tests (equip, unequip, swap, slot restrictions, getters)
   - `loadout-anti-exploit.test.ts` — Duplication prevention, race conditions, cross-player isolation
   - `loadout-shard.test.ts` — Shard-specific methods (validateShardEntry, equipFromInventory, unequipToInventory)
   - `loadout-integration.test.ts` — Colyseus room handler tests via `@colyseus/testing`

2. **Shared fixtures in helpers/** — Created `loadout-fixtures.ts` with 14 test items covering all equipment types (armour, weapon, tool, material, key, consumable). Factory functions (`makeInstance`, `populateStash`) keep tests DRY.

3. **3-arg constructor for test isolation** — Tests use `new LoadoutService(loadoutRepo, stashRepo, itemDefs)` to inject explicit repositories, enabling direct inspection of repo state in assertions.

4. **Anti-exploit tests verify invariants, not just API** — `countTotalItems()` helper counts items across stash + loadout to verify the total never changes during equip/swap operations. This catches duplication bugs that API-level tests might miss.

5. **Race condition tests use Promise.all** — Concurrent equip operations on the same item verify that exactly one succeeds and the item count invariant holds.

### Outcome

82 tests, all passing. Full suite (1741 tests) — zero regressions.

---

## 2025-07-25: Seed Item Catalog Location & Schema

**Author:** Volo (Narrative Dev)  
**Date:** 2025-07-25  
**Status:** Implemented  

### What
Created `packages/server/src/dev/seed-items.ts` — a catalog of 40 items for development and testing.

### Why
Testing the stash, loadout, and equipment UI requires items covering every slot type, rarity tier, and item category. The existing registry (`items/registry.ts`) uses `ItemDefinition` (the combat-side schema), while the stash/loadout system uses `StashItem` (the stash-side schema). Seed items use `StashItem` to match the loadout fixtures and `LoadoutService` expectations.

### Decisions Made
1. **File location:** `packages/server/src/dev/` — clearly dev-only, not mixed with production item data
2. **Schema:** Uses `StashItem` interface, not `ItemDefinition` — matches stash/loadout system expectations
3. **No registry merge:** These items are NOT added to the production `ITEM_REGISTRY`. They're imported separately where needed. When the two item schemas reconcile (per the TODO in stash.ts), seed items should be updated.
4. **Slot acceptance compliance:** Items respect `SLOT_ACCEPTS` — e.g. rings/amulets are type `material` (current placeholder), offhand items are `weapon` or `tool`

### Impact
- Loadout tests can import specific items or the full catalog
- Dev workflows can call `populateDevStash()` to fill a stash instantly
- No production code changes — additive only

---

## 2026-03-26: Loadout Needs DB Persistence

**Filed by:** Jarlaxle (Systems Dev)  
**Date:** 2025-07-26  
**Priority:** High — data-loss risk on server restart  
**Status:** In Progress (Drizzt assigned)  

### Problem

`InMemoryLoadoutRepository` stores equipped gear in RAM only. When a player equips an item:

1. Item is **removed from stash** (PostgreSQL — `PgStashRepository.removeItem`)
2. Item is **placed in loadout** (RAM — `InMemoryLoadoutRepository.setSlot`)

If the server restarts between these states, the item is gone from the DB stash but also gone from memory. **The item vanishes permanently.**

### Impact

- Any equipped item is at risk of silent loss on every deploy, crash, or restart
- Players lose gear with no explanation and no recovery path
- The more valuable the loadout, the worse the impact

### Proposed Fix

1. Create `PgLoadoutRepository` implementing the existing `LoadoutRepository` interface
2. Add a DB migration: `player_loadouts` table (player_id, slot, item_instance JSONB)
3. Wire it into `initLoadout()` in ShardRoom + RefugeRoom via `getLoadoutRepository()`
4. The interface (`load`, `save`, `setSlot`, `getSlot`, `clear`, `listPlayerIds`) is already clean — just needs a Pg backing

### Related Context

- `LoadoutRepository` interface: `packages/server/src/loadout/LoadoutRepository.ts`
- `LoadoutService` constructor already accepts an explicit `LoadoutRepository` (3-arg form)
- Stash already has `PgStashRepository` as a pattern to follow
- Death handler now correctly calls `clearLoadout()` (fixed alongside this filing)

---

## 2026-03-26: Shard-Sickness Death Counts Must Persist Across Server Restarts

**Filed by:** Copilot (Scribe)  
**Date:** 2026-03-26  
**Priority:** Low → Medium (part of PG persistence audit)  
**Status:** Proposed (backlog)

### Problem

Shard-sickness tracks player death counts per shard location. These counts are currently stored in memory only. On server restart, all death counts reset to 0. This breaks game mechanics:

1. **Mechanic breakdown:** Players should accumulate warnings/sickness effects as they die — restarting the server shouldn't erase their progress
2. **User expectation:** Death counts are permanent character history, not session-temporary
3. **Testing burden:** Tests can't rely on death count persistence; live data at risk

### Proposed Fix

1. Add shard-sickness column to `player_profile` table (or dedicated `player_shard_sickness` table)
2. Create `PgShardSicknessRepository` implementing existing `ShardSicknessRepository` interface
3. Wire into PlayerProfile initialization via provider pattern (like LoadoutRepository)
4. Death count persists across all server restarts automatically

### Related Context

- Part of PG persistence audit (4 gaps: Loadout, Profile equipment, Token Store, **Shard Sickness**)
- LoadoutRepository pattern is the template to follow for repository implementation
- Current in-memory implementation: `packages/server/src/player/shard-sickness/`
- Audit baseline: 2026-03-26 (Phase 1: Loadout critical fix; Phase 2: Profile equipment; Phase 3: Token Store; Phase 4: Shard Sickness)

### Effort Estimate

- Medium (database schema + repository + provider wiring + tests ~2-3hrs after Loadout pattern established)

---

## 2026-03-26: Faction Dual-Table Resolution

**Author:** Jarlaxle (Systems Dev)  
**Date:** 2026-03-26  
**Status:** Implemented (dev branch)

### Context

Two tables stored faction data with conflicting names and sources:
- `factions` (migration 004): UUID PKs, canonical GDD names (Ironwright Compact, Veil Cartographers, Scarlet Ledger), FK to `faction_membership`, game state source of truth
- `content_definitions` (stale): JSONB rows with entity_type='factions', different names (Ironhearth, Veilwalkers, Ashborn), no FK relationships, out of sync with game logic

The admin UI was reading from `content_definitions` instead of `factions`, showing stale faction data. This created a dual-source-of-truth problem where the game and admin system disagreed on faction names and membership.

### Decision

Use the `factions` table as the single, exclusive source of truth for all faction data. Extend it with admin-UI fields (description, milestones, events) rather than maintaining a parallel JSONB copy in `content_definitions`. Create a dedicated `PgFactionDefinitionsStore` to manage faction admin data while preserving relational integrity.

### Implementation

1. **PgFactionDefinitionsStore** (new file: `packages/server/src/stores/PgFactionDefinitionsStore.ts`)
   - Implements `IContentStore<ContentEntity>` interface
   - Reads/writes `factions` table directly
   - Preserves FK constraints with `faction_membership` table
   - Follows established pattern: biomes, modifiers, narrative, creatures (all migrated same way Phase 2)

2. **Migration 025: `025-faction-admin-fields.ts`**
   - Adds columns to `factions`: `description` (TEXT), `milestones` (JSONB), `events` (JSONB)
   - Backfills `description` from existing `philosophy` column (no data loss)
   - Idempotent: conditional column existence checks before adding
   - Cleanup: DELETE stale `content_definitions` rows where `entity_type='factions'`
   - Performance: Single table scan + DELETE, no joins, <10ms runtime

3. **Init.ts Wiring** (`packages/server/src/db/init.ts`)
   - Routes 'factions' entity type to `PgFactionDefinitionsStore` instead of generic `PgContentStore`
   - Added comments documenting migration sequence (001-003 base, 004 factions table, 005-024 content stores, 025 admin fields + cleanup)
   - Admin UI CRUD now atomic with game state

### Rationale

- The `factions` table has relational constraints and is the actual source of game state — extending it preserves integrity
- Deleting stale `content_definitions` faction rows eliminates the dual-source problem
- Follows Phase 2 consolidation pattern: each dedicated content store (biomes, modifiers, narrative, creatures, now factions) reads/writes a single relational table
- Only three entity types remain on generic `content_definitions`: skills, loot-tables, rooms (next phase)

### Consequences

- Admin UI faction CRUD now reads/writes the canonical `factions` table
- All faction displays (game, admin, API) show the same authoritative data (Ironwright, Veil, Scarlet)
- FK integrity enforced at database level
- Stale JSONB faction entries removed from `content_definitions`
- Migration cleanup reduces database size and query ambiguity

### Quality Gate

✅ Build clean (npm run build)  
✅ Tests passing (npm run test)  
✅ Linter clean (eslint)  
✅ Zero regressions


---

## 2026-03-20: RefugeRoom Room-Gated Commands
**By:** Drizzt (Engine Dev)

### What

RefugeRoom commands are now gated by which room the player is in:
- **stash / take / store** → only in `stash-alcove`
- **shardboard / enter** → only in `shardboard`
- **loadout / equipment** → available everywhere
- **look / go / directions** → available everywhere

Players start in `hearth` and must navigate (`go west`, `go east`, etc.) to reach feature rooms.

### Why

The Refuge is no longer a flat hub — it's a navigable 7-room zone. Gating commands to specific rooms creates spatial meaning and encourages exploration.

### Impact

- All tests that send stash or shardboard commands from the Refuge must first navigate to the correct room
- The `requireRoom` helper sends a directional hint when gating rejects a command
- Ambient narration can race with command responses — tests should use `.find()` not last-element indexing

---

## 2026-03-26: Zone Transfer Protocol
**By:** Drizzt (Engine Dev)

### Context

Inter-zone exits (e.g., stepping from Refuge into a dungeon zone) need a server→client handshake. The server can't just move the player — the client needs to disconnect from one ShardRoom and reconnect to another.

### Decision

- The `go` command handler detects inter-zone exits via `isInterZoneId()` and returns a `zoneTransfer` field on `CommandResult` (no direct Client coupling in handlers).
- `ShardRoom.handleCommandMessage` reads `result.zoneTransfer` and sends a `ZONE_TRANSFER` message (type: `zone_transfer`) to the client with `{ targetZoneSlug, targetRoomSlug }`.
- The client is responsible for disconnecting and reconnecting to the target zone room, passing `targetRoomSlug` as a join option so the zone ShardRoom can place the player in the correct entry room.
- The player is NOT removed from the current room by the server — the client-initiated `onLeave` handles cleanup.

### Implications

- Client must handle the `ZONE_TRANSFER` message type (new wire message).
- Hub/social zones skip combat, extraction, downing, and collapse — they run as persistent rooms.
- Zone rooms include `zoneName` in room headers for UI display.

---

## 2026-03-26: Inter-Zone Exit Convention
**By:** Drizzt (Engine Dev)

### What

Inter-zone exits (exits that connect one zone to another) are represented in `RoomGraph` exit maps using a prefixed room ID format:

```
zone:{zoneSlug}/{roomSlug}
```

Example: `zone:the-refuge/market-square`

Helper functions exported from `@ellmud/shared`:
- `makeInterZoneId(zoneSlug, roomSlug)` — builds the prefixed ID
- `isInterZoneId(roomId)` — checks the prefix
- `parseInterZoneId(roomId)` — extracts zone slug and room slug

### Why

- Zone exits must flow through the same `Room.exits` Map<Direction, string> as intra-zone exits
- Downstream code (ShardRoom navigation, command handlers) needs a simple, reliable way to detect when a player is moving between zones vs. within a zone
- The `zone:` prefix is detectable with a string check — no schema changes to Room or RoomGraph needed
- Parsing is O(1) and doesn't require a lookup table

### Impact

- **ShardRoom / navigation handlers:** Must check `isInterZoneId()` before resolving room references. Inter-zone movement will require zone switching logic (not yet implemented).
- **Serialization:** The `serializeRoomGraph()` / `deserializeRoomGraph()` functions handle these IDs transparently since they're just strings.
- **Future zone loading:** The zone slug in the ID tells the server which zone to load/join when the player crosses boundaries.

---

## 2026-03-26: Content Store Migration Audit — Complete
**By:** Elminster (Lead/Architect)

### Executive Summary

Full codebase audit confirms **successful migration from generic `content_definitions` JSONB table to 9 dedicated relational stores**. All code paths are correct. No blocking issues. The `content_definitions` table was safely dropped in migration 029 and is not queried by any live code.

**Recommendation:** ✅ Proceed with Phase 1 deployment. Content storage architecture is production-ready.

### Key Findings

✅ **All 9 Dedicated Stores Implemented:**
- PgBiomeDefinitionsStore
- PgCreatureDefinitionsStore
- PgItemDefinitionsStore
- PgModifierDefinitionsStore
- PgNarrativeDefinitionsStore
- PgFactionDefinitionsStore
- PgSkillDefinitionsStore
- PgLootTableDefinitionsStore
- PgRoomDefinitionsStore

✅ **Admin Routes Verified:**
- Routes: `GET/POST/PUT/DELETE /admin/api/content/{entity}`
- Uses: `IContentStore` interface via `initializeContentStores()`
- Zero references to `content_definitions` table

✅ **Build & Tests:**
- Build succeeds with zero TS errors
- All 51 tests pass
- Schema validation test correct

⚠️ **Minor Findings (Not Blocking):**
- Three TODOs in deploy-routes.ts for pending change tracking (intentionally stubbed for Phase 1)
- Severity: LOW — can be implemented in Phase 2

### Architectural Pattern

The migration follows **Repository Pattern** architecture:
```
Admin Routes (CRUD)
    ↓
IContentStore Interface (contract)
    ↓
Factory: initializeContentStores()
    ├─ PG: Creates 9 Pg*DefinitionsStore (live)
    └─ In-Memory: Creates 9 ContentStore (dev)
        ↓
        Dedicated Relational Tables
```

---

## 2026-03-26T19:11:17Z: Zone system design decisions
**By:** dkirby-ms (via Copilot)

### What

1. Zone state is persistent with periodic "repop" — items and mobs respawn on a timer, like classic MUDs
2. Zones can link to each other via inter-zone exits (cross-zone navigation)
3. Zone mechanics work similarly to shards (combat, loot, hazards — parity)
4. Zone building is admin-only for now
5. The Refuge becomes a navigable zone (first zone)

### Why

User request — foundational design decisions for the hand-crafted zone system

---

## 2026-03-26: content_definitions Table Fully Retired
**By:** Jarlaxle (Systems Dev)

### Context

The `content_definitions` table was the original generic JSONB store for all admin-editable game content. Over migrations 002–028, all 9 entity types were given dedicated relational tables with properly typed columns.

### Decision

Migration 029 drops `content_definitions` entirely. The `PgContentStore` class (generic JSONB store) is deleted. All routing in `init.ts` now goes to dedicated `Pg*DefinitionsStore` classes.

### Consequences

- **deploy-routes.ts** has TODO comments where it used to query `content_definitions` for deploy diffs and entity counts. These need refactoring to aggregate across the 9 dedicated tables.
- **dashboard-routes.ts** now queries through store interfaces uniformly — no direct SQL to `content_definitions`.
- Any future entity types should get their own dedicated table + PgStore from the start. The generic JSONB pattern is dead.
- The `ContentStore` (in-memory) class still exists for dev mode — it's unrelated to the dropped table.

---

## 2026-03-26: Zone Repository Local Types (Temporary)
**By:** Jarlaxle (Systems Dev)

### What

Zone type definitions (ZoneDefinition, ZoneRoomDefinition, ZoneExitDefinition, ZoneData) are defined locally in `packages/server/src/zones/ZoneRepository.ts` rather than imported from `@ellmud/shared`.

### Why

Drizzt is creating `packages/shared/src/zone.ts` in parallel. The shared types weren't available at implementation time. Local types let the server module compile and build independently.

### Action Required

When shared zone types land:
1. Delete the local type definitions from `ZoneRepository.ts`
2. Import types from `@ellmud/shared` instead
3. Verify the shapes match (they should — coordinated on the schema)
4. The pre-existing `zone-adapter.ts` errors will also resolve

### Impact

- `PgZoneRepository.ts`, `InMemoryZoneRepository.ts`, and `index.ts` all import types from `./ZoneRepository.js` — they'll automatically pick up the shared types once re-exports change.
- No runtime behavior changes needed, only import paths.

---

## 2026-03-27: Exported `adminFetch` from admin-api.ts
**By:** Regis (Frontend Dev)

### What

Added `export` to `adminFetch<T>()` in `packages/client/src/lib/admin-api.ts` so that `zone-api.ts` (and future non-content-entity API modules) can reuse the auth/error-handling wrapper.

### Why

Zones use `/admin/api/zones/*` — not the generic `/admin/api/content/{type}` route — so the existing `listEntities`/`getEntity` helpers don't apply. Rather than duplicating the fetch+auth logic, exporting the base `adminFetch` lets specialized API modules compose on top of it.

### Impact

- Any code that previously relied on `adminFetch` being module-private is unaffected (it was only called internally).
- Future entity types with custom API paths can follow the `zone-api.ts` pattern.

---

## 2026-03-27: ZONE SYSTEM — Architecture Proposal
**By:** Elminster (Lead/Architect)

### Executive Summary

**Recommended Option 2 — Biome-Scoped Named Regions Within Shards**

Zones are procedurally generated sub-regions of individual shards. The generator partitions a shard's rooms into 2–4 coherent zones at generation time, applies zone names, and includes zone IDs in room metadata.

**Key outcomes:**
- Players get named, memorable sub-regions (zone names in room headers)
- Admin can define zone templates per biome (not per-shard — procedural)
- Zones are procedurally scoped sub-regions of shards, not persistent areas
- No breaking changes to current architecture
- Minimal DB schema additions (`zone_definitions` table)
- Scope: **2–3 developer days**

### Three Options Evaluated

**Option 1: Persistent Non-Instanced Zones — REJECTED**
- ❌ Breaks procedural identity (every run identical)
- ❌ Contradicts ephemeral shards design
- ❌ Requires hand-authoring 500–1000 rooms
- ❌ Large migration from procedural generator

**Option 2: Biome-Scoped Named Regions Within Shards — RECOMMENDED** ✅
- ✅ Preserves procedural identity (zones vary per shard)
- ✅ Maintains ephemeral guarantee (zones live/die with shards)
- ✅ Minimal schema (1 new table + optional Room fields)
- ✅ Admin-friendly (zone templates per biome, not per-shard)
- ✅ Player clarity (zone names orient in 40–60 room shards)
- ✅ LLM-ready (zone adjectives feed into narration)
- ✅ Low cost (~2–3 dev days, no breaking changes)
- ⚠️ Zones non-persistent (can't map across runs)

**Option 3: Zones as Biome Sub-Templates — WEAKER**
- ✅ Simplest (~4–6 hours)
- ❌ Zones implicit, not first-class
- ❌ No zone metadata or admin UI
- ❌ Limited expressiveness

### Data Model (Option 2)

```sql
CREATE TABLE zone_definitions (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  biome_id TEXT NOT NULL REFERENCES biome_definitions(id),
  tier SMALLINT,
  room_type_bias TEXT[],
  min_rooms SMALLINT DEFAULT 3,
  max_rooms SMALLINT DEFAULT 8,
  loot_concentration NUMERIC(3, 2) DEFAULT 0.5,
  theme_adjectives TEXT[],
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

Room table gets optional `zoneId?` and `zoneName?` fields.

### Implementation Scope

| File | Changes | Effort |
|------|---------|--------|
| `packages/shared/src/room-graph.ts` | Add `Zone` interface, add `zoneId?` to `Room` | 30 min |
| `packages/server/src/shard/generator.ts` | Add `partitionIntoZones()`, load zone definitions | **2.5 days** |
| `packages/server/src/rooms/ShardRoom.ts` | Store zones in state, include zone name in headers | 1 hour |
| `PgZoneDefinitionsStore.ts` | CRUD for zone_definitions | 2 hours |
| `packages/client/src/pages/admin/Zones.tsx` | Zone list + edit forms | 3 hours |
| Database migrations | Create `zone_definitions` table | 1 hour |
| Tests | Unit + integration tests | 4 hours |
| **Total** | | **~2.5 dev days (18 hours)** |

### Open Decisions for dkirby-ms

1. **Zone granularity:** Should Tier 1 shards (15–25 rooms) have 2 zones, Tier 2 (25–40) have 3–4 zones?
2. **Zone theme expressiveness:** Should zone names be thematic ("Ossuary Heart") or descriptive ("Boss Chamber")?
3. **Admin template depth:** How many zone templates per biome should we seed? (Recommendation: 2–3 per biome initially)
4. **Zone-level features (future):** Do you want zone-specific loot concentration, creature types, or modifiers?
5. **Client display:** Should zone name appear in room header, sidebar, or both?

### Conclusion

**Recommended next step:** Get dkirby-ms sign-off on the 5 open decisions, then assign to Drizzt for implementation in Phase 2.

---

## 2026-03-27: HAND-CRAFTED ZONES — Architecture Proposal v2
**By:** Elminster (Lead/Architect)

### Executive Summary

This proposal defines **hand-crafted zones** — traditional MUD-style authored areas with specific room layouts and connections — as a parallel system to the existing procedural shard generation.

**Core decision:** Zones are **persistent, authored room graphs** stored in the database and served via a generalized `ShardRoom` class. Players navigate fixed topologies defined by builders. The existing procedural shard system remains unchanged for dungeon-crawl instances.

**Key outcomes:**
- Zones are stored in PostgreSQL (`zones`, `zone_rooms`, `zone_exits` tables)
- Admin UI provides a zone builder with room editor and connection manager
- `ShardRoom` becomes polymorphic — loads from either procedural generator OR zone database
- Client navigation is unchanged — room headers and exits work identically
- Refuge retroactively becomes the first zone (migration to zone data model)
- Scope: **5–7 developer days** (data model, server refactor, admin UI, client indicators)

### What This Enables

- **Persistent authored dungeons** — Builders design dungeons once, players experience them repeatedly with story continuity
- **Coexistence with procedural shards** — Some instances are hand-crafted (Refuge, story dungeons), others procedurally generated (roguelike runs)
- **Traditional MUD gameplay** — Room-based navigation, topology persistence, persistent NPCs
- **Admin builder tools** — Zone editor with room layout visualization

### Implementation Approach

**Data Model:**
- `zones` table: Zone metadata (id, slug, name, description, level_min/max, tier, entry_room_ids, lifecycle, category, max_players, pvp_enabled)
- `zone_rooms` table: Individual room definitions (id, zone_id, name, description, type, properties, hazards, loot_containers)
- `zone_exits` table: Room connections (id, zone_room_id, direction, target_room_id, [optional] inter_zone_target)

**Server Architecture:**
- `ShardRoom` refactored to load RoomGraph from either:
  - Procedural: `generator.ts` (existing path, no changes)
  - Authored: `ZoneRepository.getZoneGraph(zoneId)` (new path)
- Polymorphic behavior: Same navigation handlers, same combat/loot systems, same client messaging
- Zone lifecycle: Persistent rooms with periodic "repop" (items/mobs respawn on timer)

**Admin UI:**
- New "Zones" section in admin dashboard
- Zone list → Zone editor (room grid layout + room property forms)
- Room editor: visual topology with drag-to-connect, exit directions, properties
- Test: Spawn a zone instance, see live results

**Client:**
- No changes to navigation UX — exits work the same
- Optional visual indicator: "You're in [Zone Name]" in room headers (already proposed)
- Future: zone-specific UI chrome (decorations, ambient sounds)

### Phased Rollout

**Phase 2a (Foundation):**
1. Create `zones`, `zone_rooms`, `zone_exits` tables
2. Create `ZoneRepository` interface and implementations (Pg + InMemory)
3. Refactor `ShardRoom.onCreate()` to handle both procedural and authored paths
4. Migrate Refuge to zone data model (first zone)

**Phase 2b (Admin UI):**
5. Build zone editor UI (list, create, edit, delete)
6. Build room editor UI (topology visualization, property forms)
7. Deploy zone data for Refuge + 1–2 example authored dungeons

**Phase 3 (Polish):**
8. Zone-level ambient events (NPCs, weather)
9. Performance tuning (zone graph caching, batched lookups)
10. Persistence testing at scale

### Key Decisions

1. **Polymorphic ShardRoom or separate ZoneRoom class?**
   - Recommendation: Polymorphic ShardRoom (easier client integration, one navigation code path)

2. **Repop timer:** How often should items and mobs respawn in hand-crafted zones?
   - Recommendation: Configurable per zone (default: 15 minutes, tunable via admin UI)

3. **Inter-zone exits:** Can a hand-crafted zone link to another hand-crafted zone or a shard?
   - Recommendation: Yes, using the `zone:{zoneSlug}/{roomSlug}` convention (already decided in "Zone Transfer Protocol")

4. **Admin permissions:** Can only super-admins edit zones, or should there be a "zone builder" role?
   - Recommendation: Super-admins only for Phase 2; role-based access can come later

5. **Refuge retroactive migration:** Can Refuge be migrated to zone data model without breaking live play?
   - Recommendation: Yes — Refuge data is small (7 rooms, no complex state), migration is a one-time fixture reset

### Scope & Timeline

| Component | Effort | Owner |
|-----------|--------|-------|
| Database schema + migrations | 2 hours | Jarlaxle |
| ZoneRepository interface + implementations | 1.5 days | Drizzt |
| ShardRoom refactor (polymorphic load) | 1 day | Drizzt |
| Refuge migration to zones | 4 hours | Drizzt |
| Admin zone editor UI | 1.5 days | Regis |
| Admin room editor UI + topology viz | 2 days | Regis |
| Integration testing + polish | 1 day | Minsc |
| **Total** | **~5–7 developer days** | |

### Open Questions for dkirby-ms

1. Should hand-crafted zones have quest systems tied to specific zones/rooms?
2. Should ambient events (NPC patrols, weather) be zone-specific or room-specific?
3. Do you want the Refuge ambient simulation (tick-driven ticks, NPC narration) to evolve or stay as-is?
4. Should future content (story dungeons, towns) be authored zones or continue with procedural generation?

### Recommendation

**Approve and queue for Phase 2b** (after procedural generation stabilizes in Phase 2a). This unlocks traditional MUD gameplay while preserving the roguelike procedural identity for shards.

---

## 2026-03-27T01:09:05Z: Zone unification design decisions
**By:** dkirby-ms (via Copilot)

### What

- **Ambient events in unified view:** Render as inline narrative prose (not a dedicated sidebar section)
- **Players Nearby:** Always show in all zones, unless hidden by a special effect (defer special effect implementation)
- **RefugeRoom retirement:** Yes, plan to retire it, but defer until after Phase 3 is validated
- **Feature room type naming:** `feature_stash` convention accepted (no objection raised)

### Why

User answers to Elminster's open questions from the unified zone UX architecture plan

---

## 2026-03-27T01:10:30Z: Feature panel and description decisions
**By:** dkirby-ms (via Copilot)

### What

- **Feature panel placement:** Renders in the right sidebar, replacing the status/inventory section while the player is in that feature room. Reverts when they leave.
- **Feature room descriptions:** Narrative prose + a brief stats summary line (e.g., "STASH: 12 items · 45/100 weight")

### Why

User clarification on Elminster's open questions 1 and 2 (from "Unified Zone UX via Feature Rooms" decision)

---

## 2026-03-27: GDD Documentation Standards
**By:** Volo (Narrative Dev)

### What

Established clear standards for maintaining the GDD.md going forward:

1. **Implementation Status Markers:** All sections must include "(Implemented)", "(Planned)", or "(Partial Implementation)" markers
2. **Describe Reality, Not Aspiration:** Design vision is valuable, but aspirational features must be explicitly marked as "Future" or "Planned"
3. **Database-First Documentation:** When documenting systems, start with database schema (tables, columns) before describing mechanics
4. **Roadmap Checkpoint Updates:** Phase checkboxes should be updated as features are completed, not left stale

### Why

The GDD was significantly out of sync with the codebase, causing confusion about what's actually implemented. The most critical example: the Refuge "living world" section described tick-driven ambient simulation (NPC wandering, weather, merchants) that **does not exist** in the codebase. The Refuge is a static zone with 7 rooms.

### Impact

- **For developers:** Clear understanding of what exists vs what needs building
- **For designers:** Clear separation of implemented foundation vs planned features
- **For squad agents:** Can confidently reference GDD knowing it reflects reality
- **For users (future):** Accurate documentation of game systems

### Standards Going Forward

When updating the GDD:
1. Add status markers to every major section heading
2. Use consistent marker format: *(Implemented)*, *(Planned)*, *(Partial Implementation)*
3. When describing a system with DB tables, list the tables first
4. Update Phase roadmap checkboxes when features are completed
5. Move aspirational content to clearly marked subsections (e.g., "Future: Ambient World Simulation")

---

## 2026-03-27: Unified Zone UX via Feature Rooms
**Author:** Elminster (Lead / Architect)  
**Status:** PROPOSED

### Context

The Refuge and Shard experiences use two entirely different UX and code patterns. Refuge is a tab-based menu UI (`Refuge.tsx`) backed by a bespoke switch statement in `RefugeRoom.ts`. Shards use a narrative exploration view (`ShardExploration.tsx`) backed by a modular command pipeline (`parseCommand` → `handleCommand`). This split means duplicate infrastructure, jarring context switches for players, and double the work for every new feature.

dkirby-ms wants **one exploration pattern everywhere** — players navigate rooms with compass/commands in all zones, and access features (stash, marketplace, shardboard) by entering special rooms, not clicking tabs.

### Decision

#### 1. Feature Room Types

Extend `RoomType` with `feature_`-prefixed types (`feature_stash`, `feature_shardboard`, `feature_marketplace`, etc.). Feature rooms are normal rooms in the graph — the type is the only discriminant. The `RoomHeaderMessage.roomType` field (already exists) signals the client to show the corresponding feature panel.

#### 2. Server: Shared Command Pipeline

RefugeRoom adopts the existing `parseCommand()` → `handleCommand()` pipeline from ShardRoom. Feature-specific commands (`stash`, `store`, `shardboard`, `enter`) become modular handlers in `packages/server/src/commands/handlers/`, gated by `ctx.room.type` checks. The `requireRoom()` pattern is deleted. `CommandContext` is extended with optional service references (`stashService`, `loadoutService`, `characterId`).

#### 3. Client: One Exploration View

`ShardExploration.tsx` becomes the universal exploration view. Feature panels are lazy-loaded React components registered by feature key, rendered when `roomType` starts with `feature_`. Shard-specific UI (stability bar, collapse timer) is conditionally hidden in non-shard zones. `Refuge.tsx` is deleted after migration.

#### 4. Phased Rollout

- Phase 1: Shared types (additive, no behavior change)
- Phase 2: Server command pipeline unification
- Phase 3: Client view unification with feature panel system
- Phase 4: Build out individual feature panel UIs
- Phase 5: Cleanup, delete Refuge.tsx, evaluate RefugeRoom retirement

#### 5. RefugeRoom Preservation (For Now)

RefugeRoom is **not** retired immediately. It adopts the shared command pipeline but retains its unique responsibilities (ambient tick simulation, shard creation). Whether it can be collapsed into a zone-mode ShardRoom is evaluated after Phase 3.

### Consequences

- **Positive:** One UX pattern for all zones. Half the code for new features. Room-based gating is server-authoritative and modular. Future zones (dungeons, wilderness) get feature rooms for free.
- **Negative:** Moderate implementation effort (~10–14 dev days across all phases). Feature panel UX placement needs design input. RefugeRoom ambient system may need special handling if we retire the class.
- **Risk:** Ambient simulation fidelity during consolidation. Mitigated by keeping RefugeRoom alive through Phase 5.

### Open Questions

1. Feature panel placement: sidebar vs main narrative column? → **ANSWERED: Right sidebar, replacing status/inventory section**
2. Feature room type naming convention: `feature_` vs alternatives? → **ANSWERED: `feature_` convention accepted**
3. When to evaluate RefugeRoom retirement (Phase 5)? → **ANSWERED: After Phase 3 validation, plan to retire**

### Key Files

- Unified types: `packages/shared/src/room-graph.ts`
- Command system: `packages/server/src/commands/`
- RefugeRoom: `packages/server/src/rooms/RefugeRoom.ts`
- ShardExploration: `packages/client/src/pages/ShardExploration.tsx`
- Refuge (to be retired): `packages/client/src/pages/Refuge.tsx`
- Zone seed: `packages/server/src/db/migrations/031_seed_refuge_zone.sql`


---

## 2026-03-27: Dual Exploration Modes as Co-Equal
**Author:** Volo (Narrative Dev)  
**Status:** Implemented

### Summary

Ellmud's game identity now canonically reflects **two co-equal exploration modes**:
1. **Static zones** (the Refuge, future hand-crafted areas) — persistent, designed environments for hub features and endgame discovery
2. **Procedurally generated shards** — temporary extraction instances for PvE/PvP encounters

Neither mode is framed as "primary" or "the main" way players explore. They complement each other.

### Rationale

- The Refuge is a **living world**, not a "loading screen." Players prepare, manage stash, socialize, and access features there.
- Procedural shards are where **extraction gameplay** happens — the high-tension, high-stakes runs.
- Both are essential to the player fantasy: *you live in the Refuge and raid shards*.
- Narrative docs now reflect this parity, enabling cohesive design across client UI, marketing, and future zones.

### Canonical Framing

**README.md (line 5):**
> Explore persistent zones and procedurally generated shards. Scavenge gear, fight creatures, manage your stash in the Refuge, then dive into extraction runs before collapse. Everything you don't extract, you lose.

**GDD.md (line 4 — Genre):**
> PvPvE Extraction RPG · Real-Time MUD · Dual Exploration (Static + Procedural)

**GDD.md (lines 22-26 — High-Level Vision):**
> Players live in **the Refuge**, a persistent hub where they manage gear, prepare for runs, and socialize. From there, they explore **two complementary exploration modes:**
> - **Static zones** (like the Refuge itself, and future hand-crafted endgame areas) — permanent, designed environments for feature access and discovery
> - **Procedurally generated "shards"** — temporary instances of corrupted regions — where they face PvE threats, environmental hazards, and emergent PvP encounters

### Design Implications

1. **Client UI:** The game has a **Refuge layout** (feature-access hub) and a **Shard layout** (exploration + combat). Both are first-class screens, not hierarchy.
2. **Content Pipeline:** Future zone designs can be hand-crafted (like Refuge or endgame dungeons) or procedurally generated (like exploration shards). Neither is the "default."
3. **Marketing/Onboarding:** Pitch the game as "You live in the Refuge and raid shards" — dual identity from the start.
4. **Roadmap:** Phase 3 roadmap item now reads "Content expansion (more biomes, creature types, **static zones**, procedural events)" — static zones are explicit growth goals.

### Implementation Detail

No code changes. This is a narrative/documentation alignment. GDD §2.2 already correctly documents both generation modes (hand-crafted zones ✅, procedural assembly ⚠️ partial). The updates lift this parity into the tagline and opening vision.

### Team Sign-Off

- **Volo (Narrative):** Framing implemented. Docs canonical.
- **dkirby-ms (Director):** Approved. Extraction RPG identity maintained.

---

## 2026-03-27: User Directive — Dual Mode Framing
**By:** dkirby-ms (via Copilot CLI)

### What

The game is not purely procedural roguelike. Static zones (like The Refuge) are a major exploration mode alongside procedural shards. README and GDD should reflect both modes equally — not frame procedural as the primary/only way players explore.

### Why

User request — captured for team memory.

---

## 2026-03-27: Feature Room Types Added to Shared Package
**Author:** Drizzt (Engine Dev)  
**Status:** Implemented

### Context

Zone unification Phase 1 required adding feature room types to the shared `RoomType` union so both server and client can reference them.

### Decision

- Added 7 feature room types to `RoomType`: `feature_stash`, `feature_shardboard`, `feature_marketplace`, `feature_crafting`, `feature_training`, `feature_contracts`, `feature_infirmary`
- `feature_` prefix is the discriminant — `isFeatureRoomType()` type guard and `getFeatureKey()` extractor live in `@ellmud/shared`
- `FeatureRoomType` utility type extracts the feature subset from the union
- Server-side `RoomGraph.ts` local duplicate synced to match
- Flooded Crypt biome templates extended with placeholder entries for all feature room types (names + descriptions)

### Impact

- **Jarlaxle:** New biomes must include entries for all feature room types in `ROOM_NAMES` / `ROOM_DESCRIPTIONS` Records
- **All agents:** Import `isFeatureRoomType` / `getFeatureKey` from `@ellmud/shared` — don't roll your own prefix checks
- **Future:** Phase 2 will wire these types into zone definitions and room rendering

---

## 2026-03-27: User Directive — Unified Room Class
**By:** dkirby-ms (via Copilot)

### What

Unify `ShardRoom` and `RefugeRoom` into a single room class. All rooms are just "rooms" — zone rooms (statically defined in DB) and generated rooms (procedurally created for shards). No separate Colyseus room types. Extend `ShardRoom` to handle everything, migrate `RefugeRoom` functionality into it, then delete `RefugeRoom`.

### Why

User request — the two-room-class split creates unnecessary complexity and divergent UX. Systems (combat, stash, ambient) should be composable and enabled per-zone/room config, not per-class.

---

## 2026-03-27: User Directive — Explored Rooms / Character Map
**By:** dkirby-ms (via Copilot)

### What

Prepare for a future "explored rooms" feature: per-character map data that tracks which rooms a player has visited, enabling a visual map of explored areas. This should be designed into the data model now even if the UI comes later.

### Why

User request — forward-looking design. The unified room system should lay groundwork for character-specific exploration tracking.


---

## 2026-03-27T12:25:42Z: Unified Room Architecture — Complete Plan
**By:** Elminster (Lead / Architect), Coordinator (directive capture)
**Status:** PROPOSED + Directive Confirmation
**Scope:** Server architecture, client routing, DB schema

### Context

The codebase has two Colyseus room classes — `ShardRoom` and `RefugeRoom` — serving the same purpose with significant duplication. User directive: consolidate into one room class with composable systems.

### Architectural Decisions

**D1: Single Room Class** — ShardRoom absorbs RefugeRoom. No separate class types. Eliminates ~500 lines of duplicated code. Client room name changes from `'refuge'` to `'zone:the-refuge'`. Coordinated deploy required.

**D2: Composable Systems via Zone Config** — Systems (combat, ambient, creatures, extraction) instantiate conditionally based on `zone.category`, `zone_rooms.type`, `zone.lifecycle`, `zone.pvp_enabled`. No class hierarchy, no code changes for new zones.

**D3: Feature-Gated Command Pipeline** — Commands like `stash`, `shardboard`, `enter` are registered with required `FeatureRoomType`. Pipeline checks `ctx.room.type` before dispatching. Rejected commands narrate contextually.

**D4: Zone Room Routing** — Zones registered as `server.define('zone:{slug}', ShardRoom)` with auto-provisioning at boot. Client joins via `joinOrCreate('zone:the-refuge', opts)`. Namespace prevents collision with shard room names.

**D5: Exploration Tracking — Per-Character Room Visits** — New `character_explored_rooms` table (migration 032) tracking visits: `character_id`, `zone_slug`, `room_id`, `room_type`, `room_name`, `coord_x/y/z`, `first_visited`, `last_visited`, `visit_count`. Designed now for future map UI.

**D6: Reconnection Grace Periods** — Hub/social zones get 10-second grace (vs RefugeRoom's none). Dungeon/wilderness zones get standard 30-second grace.

### User Directives — Confirmed

**Zone Naming:** `zone:the-refuge` is the canonical format for zone room names. Answers open question D4.

**Room Items Are Universal:** All rooms can hold floor items. The `take` command is universal — any player/creature picks up items from any room. Only `feature_stash` rooms provide personal stash storage (`store`/`stash` commands). Items in normal rooms are shared resources.

**Map UI Design:** Plan out character exploration map UI. Context is now mature (unified architecture + explored rooms schema). Design forward-looking while the team has full context.

### Key Files & Impact

- **Server:** `ShardRoom` consolidated, `RefugeRoom` deleted, command pipeline extended
- **Client:** Room names → `zone:{slug}`, exploration view unified
- **DB:** New `character_explored_rooms` table (migration 032)
- **Shared:** `RoomType` union already extended with feature types

### Risks & Mitigation

- **Behavior regression:** Feature parity checklist ensures RefugeRoom features absorbed 1:1. Phase-gated rollout.
- **Coordinated deploy:** Single PR with client + server changes.
- **matchMaker access:** Pass as function reference in CommandContext, keep handlers testable.

### Open Questions Resolved

1. ✅ Room name format → `zone:the-refuge`
2. ⏳ Exploration coordinates → Backfill with map UI
3. ✅ `take` command → Universal (not feature-gated)
4. ⏳ Shardboard logic → TBD (dedicated service or inline)
5. ⏳ Ambient system scope → TBD (hub-only or broader)


---

## 2026-07-17: Derive zoneSlug from Colyseus Room Name (Server-Authoritative)

**Author:** Drizzt (Engine Dev)  
**Date:** 2026-07-17  
**Status:** Implemented

### What

`ShardRoom.onCreate()` now derives `zoneSlug` from `this.roomName` when the room name starts with `zone:` and no explicit `zoneSlug` option is provided. ROOM_SWITCH targets for extraction and death now use `'zone:the-refuge'` instead of bare `'refuge'`.

### Why

- Clients call `joinOrCreate("zone:the-refuge", { token })` but never pass `zoneSlug` in options — the room name IS the zone identifier.
- The old `target: 'refuge'` didn't match the Colyseus room definition `'zone:the-refuge'`, breaking client room switching.
- Server-side derivation is more robust: any client joining a `zone:*` room gets zone behavior automatically, no client changes needed.

### Convention

- **ROOM_SWITCH `target` must always be the exact Colyseus room name** (e.g., `'zone:the-refuge'`, `'shard'`), never an abbreviated form.
- **Zone slug derivation is server-authoritative.** Clients should NOT need to duplicate the zone slug in join options.

### Impact

- Server: `ShardRoom.ts` — 3 code changes
- Tests: 5 assertion updates across 3 test files
- Client: No changes required (this was the point)
### 2026-03-28T00:14:27Z: User directive — Stamina system scoping
**By:** dkirby-ms (via Copilot)
**What:** Add stamina as a placeholder in the status panel now (always 0/0). Scope a full stamina system as a future TODO.
**Why:** User request — captured for team memory

### 2026-03-28T00:14:27Z: User directive — Equipment silhouette style
**By:** dkirby-ms (via Copilot)
**What:** Use an abstract slot diagram (not pixel-art body outline) for the equipment silhouette.
**Why:** User request — captured for team memory

### 2026-03-28T00:14:27Z: User directive — Shared ItemTooltip
**By:** dkirby-ms (via Copilot)
**What:** ItemTooltip component should be shared/reusable between EquipmentSilhouette and CombinedStashLoadout.
**Why:** User request — captured for team memory
# Decision: Exploration Messages Are Fire-and-Forget

**Date:** 2025-07-17  
**Author:** Drizzt (Engine Dev)  
**Status:** Implemented

## Context

ShardRoom sends exploration data to clients for the in-game map. Three paths trigger exploration messages:
1. `onJoin` → `EXPLORATION_DATA` (bulk payload with starting room)
2. Movement command → `EXPLORATION_UPDATE` (incremental room)
3. Flee (combat tick) → `EXPLORATION_UPDATE` (incremental room)

## Decision

Exploration persistence (`recordVisit`) is fire-and-forget — errors are logged but never block gameplay. The client map renders from messages alone; the repository is for cross-session persistence only.

Exits are serialized as `Record<string, string>` (direction → targetRoomId) in the `ExploredRoomData` payload, converted from the `Map<Direction, string>` used in the room graph.

## Impact

- **Client team:** The `ExploredRoomData` shape matches what `useExplorationMap.ts` expects. No client changes needed.
- **Persistence team:** If `recordVisit` throws, the player's map still works for the current session. Only cross-session recall is affected.
# Decision: PLAYER_STATE Message Pipeline

**Date:** 2026-03-27  
**Agent:** Drizzt (Engine Developer)  
**Status:** Implemented  

## Context

The client status panel and MUD prompt displayed HP, stamina, and status effects, but all values were hardcoded on the client side. The server never sent player state updates, so combat damage was invisible to the player until they checked their combatant state.

## Decision

Implemented a full message-only pipeline for player state updates:

1. **Message Type:** Added `PLAYER_STATE` to `MessageTypes` enum in shared package
2. **Message Shape:** `PlayerStateMessage` with `hp`, `maxHp`, `stamina`, `maxStamina`, `statusEffects[]`
3. **Server Sends:**
   - On join: Initial state with default HP (100/100)
   - After combat tick: Updates to players who took damage
4. **Client Receives:** Updates store fields (`playerHp`, `playerMaxHp`, `playerStamina`, `playerMaxStamina`, `statusEffects`)

## Key Constraints

- **Stamina is a placeholder:** Always 0/0. User explicitly wants to scope full stamina system later.
- **Status effects array is empty:** Ready for future system but not implemented yet.
- **HP source:** Pulled from `Combatant` objects in `CombatSystem`, which are created lazily when combat begins.
- **Optimization:** Only send PLAYER_STATE to players who took damage, not all players on every tick.

## Why This Matters

- **Team-wide pattern:** This establishes the canonical approach for real-time player state updates (message-only, no Schema sync).
- **Future stamina system:** The pipeline is ready — just populate the stamina fields when the system is implemented.
- **Status effects:** The structure is in place for status effect tracking (buffs, debuffs, DoTs).

## Files Modified

- `packages/shared/src/index.ts`
- `packages/server/src/rooms/ShardRoom.ts`
- `packages/client/src/store.ts`
- `packages/client/src/hooks/useShardConnection.ts`
- `packages/client/src/services/connection.ts`
- `packages/server/src/__tests__/helpers/message-collector.ts`

## Testing

- 3 new tests in `player-state-message.test.ts`:
  - PLAYER_STATE sent on join
  - PLAYER_STATE sent after combat damage
  - Message shape validation
- All tests pass, build clean

## Related Systems

- **Combat System:** CombatSystem tracks Combatant HP, which is the source for PLAYER_STATE messages
- **Client Store:** playerHp/maxHp already existed (hardcoded), now updated via message
- **Future Work:** Stamina system, status effects system
# Zone Design: The Warrens

**Author:** Laeral (Content Designer)
**Date:** 2025-07-24
**Status:** Draft — ready for Bruenor to implement

---

## Overview

| Field | Value |
|---|---|
| **Zone slug** | `the-warrens` |
| **Name** | The Warrens |
| **Biome** | ruins / urban decay |
| **Category** | `dungeon` (extraction zone) |
| **Lifecycle** | `persistent` |
| **Tier** | 1–2 |
| **PvP** | `false` |
| **Max players** | 3 |

**Theme:** A desolate, sparsely inhabited ruined city landscape. Winding streets choked with the detritus of some ancient civilisation — shattered masonry, corroded metal, dust that hasn't settled in centuries. The streets look deserted but the sounds of life and death echo across the cracked pavement. Something lives here. Something hunts here.

**Tone keywords (for LLM narration):** dread, desolation, urban decay, echo, dust, silence-then-noise, ancient loss

---

## 1. ROOMS (11 rooms)

### Room Map (ASCII)

```
                                    [Overwatch Tower]
                                           │
                                          (up)
                                           │
[Shattered Gate] ──east──▸ [Rubble Boulevard] ──east──▸ [Hollow Market] ──north──▸ [Broken Sanctuary]
       │                                                       │                          │
  (to Refuge/                                                south                  east (LOCKED)
   Hearth)                                                     │                          │
                                                      [Whispering Alley] ──────── [Collapsed Tenement]
                                                               │                   (dead end, east)
                                                             south
                                                               │
                                                   [Dustfall Extraction] ──east──▸ [Sunken Square]
                                                                                        │
                                                                                   down (HIDDEN)
                                                                                        │
                                                                                   [The Ratways]
                                                                                        │
                                                                                      south
                                                                                        │
                                                                                  [The Charnel Pit]
```

**Critical paths:**
- **Main loop:** Gate → Boulevard → Market → (north) Sanctuary → (locked east) Sunken Square
- **South loop:** Market → (south) Alley → (south) Extraction → (east) Sunken Square
- **Hidden descent:** Sunken Square → (hidden down) Ratways → (south) Charnel Pit (boss)
- **Dead ends:** Overwatch Tower (up from Boulevard), Collapsed Tenement (east from Alley)

---

### Room Definitions

#### 1. Shattered Gate
| Field | Value |
|---|---|
| **slug** | `shattered-gate` |
| **name** | Shattered Gate |
| **type** | `entry` |
| **properties** | `["heavy_door", "open_sky"]` |

**Description:**
A colossal archway, split down its centre by some ancient cataclysm, frames the entrance to a ruined city. Rubble spills outward like the city is trying to disgorge its own bones. Wind funnels through the gap, carrying the faint tang of rust and something older — something burnt.

**NPCs:** None (safe entry room)
**Loot:** None
**Hazards:** None

---

#### 2. Rubble-Choked Boulevard
| Field | Value |
|---|---|
| **slug** | `rubble-boulevard` |
| **name** | Rubble-Choked Boulevard |
| **type** | `corridor` |
| **properties** | `["open_sky", "rubble"]` |

**Description:**
A once-grand boulevard stretches east, its paving stones heaved upward by roots that died centuries ago. Collapsed facades lean drunkenly against one another, forming accidental tunnels of broken stone. Glass crunches underfoot no matter how carefully you step.

**NPCs:** Gutterspawn ×2–3
**Loot:** 1× crate (`bent-rebar` or `gutterspawn-fang`)
**Hazards:** `unstable_rubble` — loud movement may trigger minor rockfall (1–3 damage)

---

#### 3. Overwatch Tower
| Field | Value |
|---|---|
| **slug** | `overwatch-tower` |
| **name** | Overwatch Tower |
| **type** | `dead_end` |
| **properties** | `["elevated", "open_sky"]` |

**Description:**
A spiralling stair of crumbling stone leads up through the shell of a watchtower. Half the upper floor has sheered away, offering a vertiginous view over the rooftops of the dead city. Wind howls through the gap. Someone has scratched tally marks into the wall — hundreds of them — in neat, obsessive rows.

**NPCs:** None (eerily empty — tension room)
**Loot:** 1× corpse (`charred-street-map` 20% / `tarnished-medallion` 80%)
**Hazards:** `unstable_floor` — lingering too long risks collapse (environmental warning after 3 ticks)

---

#### 4. The Hollow Market
| Field | Value |
|---|---|
| **slug** | `hollow-market` |
| **name** | The Hollow Market |
| **type** | `junction` |
| **properties** | `["open_sky", "large_space"]` |

**Description:**
A sunken plaza opens up where three streets converge, littered with the skeletal frames of market stalls. Faded awnings hang in tatters. A dry fountain at the centre holds a statue with no face — whether eroded or deliberately defaced, it's impossible to tell. Echoes carry strangely here; sounds from every adjacent street pool in this space.

**NPCs:** Rubble Scavenger ×1–2
**Loot:** 2× crate (`bent-rebar` 50%, `scavenger-shiv` 20%, `tarnished-medallion` 30%)
**Hazards:** None (but sound propagation is amplified — actions here are audible from adjacent rooms)

---

#### 5. Broken Sanctuary
| Field | Value |
|---|---|
| **slug** | `broken-sanctuary` |
| **name** | Broken Sanctuary |
| **type** | `chamber` |
| **properties** | `["heavy_door", "enclosed"]` |

**Description:**
Stone columns, cracked but standing, hold up what remains of a vaulted ceiling. This was a place of worship or governance — the distinction has been erased by time. An altar of dark stone dominates the far wall, its surface scarred by claw marks. The air smells of old incense and fresh blood.

**NPCs:** Hollow Stalker ×1
**Loot:** 1× altar (`rubble-crusted-vest` 40%, `tarnished-medallion` 40%, `sanctuary-key` 20%)
**Hazards:** None

---

#### 6. Whispering Alley
| Field | Value |
|---|---|
| **slug** | `whispering-alley` |
| **name** | Whispering Alley |
| **type** | `corridor` |
| **properties** | `["narrow", "enclosed"]` |

**Description:**
The buildings press close here, their upper storeys nearly touching overhead. Every sound — your breath, your footfall, the distant crack of settling stone — bounces between the walls until it sounds like a crowd of invisible speakers. Debris forms knee-high barricades at irregular intervals. Something has been dragging things through here.

**NPCs:** Gutterspawn ×2–4
**Loot:** 1× corpse (`gutterspawn-fang` 60%, `scavenger-shiv` 25%, `sanctuary-key` 15%)
**Hazards:** None

---

#### 7. Collapsed Tenement
| Field | Value |
|---|---|
| **slug** | `collapsed-tenement` |
| **name** | Collapsed Tenement |
| **type** | `dead_end` |
| **properties** | `["enclosed", "rubble"]` |

**Description:**
What was once a three-storey dwelling has pancaked into a single compressed layer of shattered timber, bent pipes, and pulverised plaster. A narrow gap leads into a pocket of relative stability — a room-sized void where the floors above wedged against each other instead of falling. It smells like a den. It smells occupied.

**NPCs:** Rubble Scavenger ×2–3
**Loot:** 1× chest (`scavenger-shiv` 30%, `rubble-crusted-vest` 30%, `tarnished-medallion` 40%)
**Hazards:** `unstable_rubble` — combat here risks minor cave-in (1–3 damage per tick to all combatants, 30% chance per combat tick)

---

#### 8. Dustfall Extraction
| Field | Value |
|---|---|
| **slug** | `dustfall-extraction` |
| **name** | Dustfall Extraction |
| **type** | `extraction` |
| **properties** | `["open_sky", "large_space"]` |

**Description:**
A wide intersection where the ruins fall back, leaving an unexpected expanse of open sky. Dust drifts down endlessly from the crumbling buildings above, catching light like grey snow. A half-collapsed pedestrian bridge arches overhead — beneath it, the ground has been swept clean in a perfect circle. This is where the shard thins. This is where you leave.

**NPCs:** Rubble Scavenger ×0–1 (light patrol)
**Loot:** None (extraction point — keep it clean)
**Hazards:** None (but extraction ritual generates noise, drawing creatures from adjacent rooms)

---

#### 9. The Sunken Square
| Field | Value |
|---|---|
| **slug** | `sunken-square` |
| **name** | The Sunken Square |
| **type** | `junction` |
| **properties** | `["water", "enclosed"]` |

**Description:**
The street dips sharply here, as if the earth itself sagged under the weight of ruin. Stagnant water collects in the depression, ankle-deep and dark. The walls of surrounding buildings rise like the sides of a well. Scratch marks line the stone at water level — long, parallel gouges, ascending from somewhere below.

**NPCs:** Hollow Stalker ×1
**Loot:** 1× crate (submerged — `tarnished-medallion` 50%, `bent-rebar` 30%, `rubble-crusted-vest` 20%)
**Hazards:** `standing_water` — movement speed reduced, agility checks at -1 in combat

---

#### 10. The Ratways
| Field | Value |
|---|---|
| **slug** | `the-ratways` |
| **name** | The Ratways |
| **type** | `corridor` |
| **properties** | `["enclosed", "narrow", "water"]` |

**Description:**
A drainage tunnel, barely tall enough to stand in, runs beneath the square. The ceiling drips steadily. Gutterspawn nests line the walls — tangles of cloth, bone, and wire — most of them empty. Most. The tunnel slopes downward into darkness, and from below comes a sound like stone grinding against stone.

**NPCs:** Gutterspawn ×3–4
**Loot:** 1× nest-pile (`gutterspawn-fang` ×2 70%, `tarnished-medallion` 30%)
**Hazards:** `low_ceiling` — no overhead attacks; `water` — sound propagates further

---

#### 11. The Charnel Pit
| Field | Value |
|---|---|
| **slug** | `charnel-pit` |
| **name** | The Charnel Pit |
| **type** | `boss` |
| **properties** | `["cavern", "enclosed"]` |

**Description:**
The tunnel opens into a vast pit — the foundations of a collapsed building, ripped open like a wound. Bones and rubble are fused into the walls. At the centre, something enormous shifts in the debris, rebar-spiked and concrete-skinned, as if the building itself refused to die and instead became something worse. The air vibrates with each of its slow, grinding breaths.

**NPCs:** The Collapsed One ×1 (boss)
**Loot:** 1× boss chest (spawns on kill — `charred-street-map` 30%, `scavenger-shiv` 20%, `rubble-crusted-vest` 25%, `tarnished-medallion` 25%)
**Hazards:** `seismic_tremor` — boss ability: 30% chance per 3 ticks to shake the room (2–5 damage to all players, interrupts channelling)

---

## 2. EXIT MAP

All exits are bidirectional unless noted.

| From Room | Direction | To Room | Flags |
|---|---|---|---|
| `shattered-gate` | east | `rubble-boulevard` | — |
| `shattered-gate` | west | **Refuge / Hearth** | `cross_zone: true`, `target_zone_slug: refuge`, `target_room_slug: hearth` |
| `rubble-boulevard` | west | `shattered-gate` | — |
| `rubble-boulevard` | east | `hollow-market` | — |
| `rubble-boulevard` | up | `overwatch-tower` | — |
| `overwatch-tower` | down | `rubble-boulevard` | — |
| `hollow-market` | west | `rubble-boulevard` | — |
| `hollow-market` | north | `broken-sanctuary` | — |
| `hollow-market` | south | `whispering-alley` | — |
| `broken-sanctuary` | south | `hollow-market` | — |
| `broken-sanctuary` | east | `sunken-square` | `locked: true` (requires `sanctuary-key`) |
| `sunken-square` | west | `broken-sanctuary` | `locked: true` (requires `sanctuary-key`) |
| `whispering-alley` | north | `hollow-market` | — |
| `whispering-alley` | east | `collapsed-tenement` | — |
| `whispering-alley` | south | `dustfall-extraction` | — |
| `collapsed-tenement` | west | `whispering-alley` | — |
| `dustfall-extraction` | north | `whispering-alley` | — |
| `dustfall-extraction` | east | `sunken-square` | — |
| `sunken-square` | west | `dustfall-extraction` | — |
| `sunken-square` | down | `the-ratways` | `hidden: true` (discovered via search/perception check) |
| `the-ratways` | up | `sunken-square` | — |
| `the-ratways` | south | `charnel-pit` | — |
| `charnel-pit` | north | `the-ratways` | — |

**Key doors:** Broken Sanctuary ↔ Sunken Square requires the `sanctuary-key` (found on Hollow Stalkers or in Whispering Alley corpse loot).

**Hidden exit:** Sunken Square → down → The Ratways. The scratch marks in the room description are the hint. Discoverable via `search` command or high Awareness skill.

---

## 3. CREATURES

### 3a. Gutterspawn

| Field | Value |
|---|---|
| **type (slug)** | `gutterspawn` |
| **name** | Gutterspawn |
| **tier** | 1 |
| **behavior** | `skulker` (hit-and-flee) |

**Description:** Bloated, rat-like things the size of a large dog, with too many legs and mouths full of needle teeth. They nest in packs in the drainage tunnels and alleyways, emerging to feed on anything that stops moving. Individually pathetic. In numbers, lethal.

**Stats:**

| Stat | Value |
|---|---|
| maxHp | 15 |
| attack | 5 |
| defence | 1 |
| armour | 0 |
| agility | 7 |

**Spawn Rules:**

| Field | Value |
|---|---|
| minCount | 2 |
| maxCount | 4 |
| preferredRoomTypes | `["corridor", "dead_end"]` |
| forbiddenRoomTypes | `["entry", "extraction", "boss"]` |
| idleTicksMin | 3 |
| idleTicksMax | 6 |
| fleeThreshold | 0.3 |

**Loot Table:**

| itemId | name | weight | description | dropWeight |
|---|---|---|---|---|
| `gutterspawn-fang` | Gutterspawn Fang | 0.2 | A yellowed, hollow fang, still wet with venom. | 80 |
| `bent-rebar` | Bent Rebar | 3 | A corroded length of rebar. Barely a weapon. | 15 |
| *(nothing)* | — | — | — | 5 |

---

### 3b. Rubble Scavenger

| Field | Value |
|---|---|
| **type (slug)** | `rubble-scavenger` |
| **name** | Rubble Scavenger |
| **tier** | 1 |
| **behavior** | `berserker` (strike-heavy) |

**Description:** Gaunt, hunched humanoids wrapped in rags and scavenged armour. Whether they were once people or something that learned to walk like people is unclear. They fashion crude weapons from debris and fight with desperate, cornered-animal fury. Their eyes are empty but their hands never stop grasping.

**Stats:**

| Stat | Value |
|---|---|
| maxHp | 35 |
| attack | 8 |
| defence | 3 |
| armour | 2 |
| agility | 4 |

**Spawn Rules:**

| Field | Value |
|---|---|
| minCount | 1 |
| maxCount | 3 |
| preferredRoomTypes | `["junction", "dead_end", "chamber"]` |
| forbiddenRoomTypes | `["entry", "boss"]` |
| idleTicksMin | 4 |
| idleTicksMax | 8 |
| fleeThreshold | 0.15 |

**Loot Table:**

| itemId | name | weight | description | dropWeight |
|---|---|---|---|---|
| `bent-rebar` | Bent Rebar | 3 | A corroded length of rebar. Barely a weapon. | 50 |
| `tarnished-medallion` | Tarnished Medallion | 0.5 | An ornate disc of dull metal, engraved with a sigil no one remembers. | 25 |
| `scavenger-shiv` | Scavenger's Shiv | 2 | A blade of broken glass bound with wire. Crude but sharp. | 15 |
| *(nothing)* | — | — | — | 10 |

---

### 3c. Hollow Stalker

| Field | Value |
|---|---|
| **type (slug)** | `hollow-stalker` |
| **name** | Hollow Stalker |
| **tier** | 1–2 |
| **behavior** | `skulker` (ambush, hit-and-disengage) |

**Description:** Tall, emaciated figures that move in absolute silence until the moment they strike. Their skin is grey and taut, their features erased as if sanded smooth. They cling to walls and ceilings in collapsed structures, dropping on prey from above. When they kill, they drag the corpse away and are not seen eating — but the corpse is always found empty.

**Stats:**

| Stat | Value |
|---|---|
| maxHp | 60 |
| attack | 13 |
| defence | 5 |
| armour | 4 |
| agility | 6 |

**Spawn Rules:**

| Field | Value |
|---|---|
| minCount | 1 |
| maxCount | 2 |
| preferredRoomTypes | `["chamber", "junction"]` |
| forbiddenRoomTypes | `["entry", "extraction", "corridor"]` |
| idleTicksMin | 5 |
| idleTicksMax | 12 |
| fleeThreshold | 0.15 |

**Loot Table:**

| itemId | name | weight | description | dropWeight |
|---|---|---|---|---|
| `tarnished-medallion` | Tarnished Medallion | 0.5 | An ornate disc of dull metal. They collect these — no one knows why. | 40 |
| `sanctuary-key` | Sanctuary Key | 0.3 | A heavy iron key, corroded but intact. Its teeth are shaped like no modern lock. | 15 |
| `scavenger-shiv` | Scavenger's Shiv | 2 | Taken from a scavenger that won't be needing it. | 20 |
| *(nothing)* | — | — | — | 25 |

---

### 3d. The Collapsed One (Boss)

| Field | Value |
|---|---|
| **type (slug)** | `the-collapsed-one` |
| **name** | The Collapsed One |
| **tier** | 2 |
| **behavior** | `guardian` (slow, devastating, holds ground) |

**Description:** It was a building once — or it was something that was trapped when the building fell. Now the distinction is academic. Rebar juts from its hunched back like broken ribs. Its skin is powdered concrete and its fists are foundation stones. It moves with terrible, grinding slowness, but when it swings, walls crack. It does not speak. It does not flee. It does not stop.

**Stats:**

| Stat | Value |
|---|---|
| maxHp | 150 |
| attack | 18 |
| defence | 8 |
| armour | 10 |
| agility | 1 |

**Spawn Rules:**

| Field | Value |
|---|---|
| minCount | 1 |
| maxCount | 1 |
| preferredRoomTypes | `["boss"]` |
| forbiddenRoomTypes | `["entry", "extraction", "corridor", "junction", "dead_end", "chamber"]` |
| idleTicksMin | 8 |
| idleTicksMax | 15 |
| fleeThreshold | 0 |

**Loot Table:**

| itemId | name | weight | description | dropWeight |
|---|---|---|---|---|
| `rubble-crusted-vest` | Rubble-Crusted Vest | 5 | Masonry fragments fused to leather. Heavy, but it stops a blade. | 30 |
| `scavenger-shiv` | Scavenger's Shiv | 2 | Lodged in its chest. Previous challenger's contribution. | 25 |
| `charred-street-map` | Charred Street Map | 0.5 | Scorched but legible. Shows routes through the Warrens. | 20 |
| `tarnished-medallion` | Tarnished Medallion | 0.5 | Embedded in its concrete hide. Pried loose. | 25 |

---

## 4. ITEMS

### 4a. Bent Rebar (Scrap Weapon)

| Field | Value |
|---|---|
| **itemId** | `bent-rebar` |
| **name** | Bent Rebar |
| **type** | `weapon` |
| **tier** | `scrap` |
| **weight** | 3 |
| **allowedSlots** | `["weapon"]` |
| **durability** | 20 |

**Description:** A corroded length of rebar, wrenched from a collapsed wall. One end is bent into a rough hook. It's heavy, slow, and ugly — but it's better than bare hands, and you'll find a hundred of them in these ruins.

**Stats (JSONB):**
```json
{ "damage": 4, "speed": 0.8 }
```

---

### 4b. Scavenger's Shiv (Common Weapon)

| Field | Value |
|---|---|
| **itemId** | `scavenger-shiv` |
| **name** | Scavenger's Shiv |
| **type** | `weapon` |
| **tier** | `common` |
| **weight** | 2 |
| **allowedSlots** | `["weapon"]` |
| **durability** | 30 |

**Description:** A shard of plate glass, its base wrapped in copper wire for a grip. The edge is wickedly sharp but fragile. The scavengers of the Warrens fashion these by the dozen — they break often, so they make many.

**Stats (JSONB):**
```json
{ "damage": 7, "speed": 1.2 }
```

---

### 4c. Rubble-Crusted Vest (Common Armour)

| Field | Value |
|---|---|
| **itemId** | `rubble-crusted-vest` |
| **name** | Rubble-Crusted Vest |
| **type** | `armour` |
| **tier** | `common` |
| **weight** | 5 |
| **allowedSlots** | `["chest"]` |
| **durability** | 40 |

**Description:** A padded leather vest with chunks of masonry and tile lashed to its surface. Improvised but effective — the Warrens teach you to armour yourself with whatever the ruins provide. Weighs more than proper plate but costs nothing but sweat.

**Stats (JSONB):**
```json
{ "armour": 3 }
```

---

### 4d. Tarnished Medallion (Common Material)

| Field | Value |
|---|---|
| **itemId** | `tarnished-medallion` |
| **name** | Tarnished Medallion |
| **type** | `material` |
| **tier** | `common` |
| **weight** | 0.5 |
| **allowedSlots** | `[]` |
| **durability** | — |

**Description:** An ornate disc of tarnished metal, stamped with a sigil that might once have been a face or a sun or a wheel. The civilisation that minted these is dust, but the metal still has value. Merchants in the Refuge pay decent coin for pre-collapse artefacts.

**Stats (JSONB):**
```json
{ "vendor_value": 15 }
```

---

### 4e. Gutterspawn Fang (Scrap Material)

| Field | Value |
|---|---|
| **itemId** | `gutterspawn-fang` |
| **name** | Gutterspawn Fang |
| **type** | `material` |
| **tier** | `scrap` |
| **weight** | 0.2 |
| **allowedSlots** | `[]` |
| **durability** | — |

**Description:** A hollow, yellowed fang pulled from a gutterspawn's maw. The interior canal still glistens with venom. Alchemists and crafters use these for poison extraction or as improvised needles. Not worth much individually, but you'll have pockets full of them.

**Stats (JSONB):**
```json
{ "vendor_value": 3 }
```

---

### 4f. Sanctuary Key (Common Key)

| Field | Value |
|---|---|
| **itemId** | `sanctuary-key` |
| **name** | Sanctuary Key |
| **type** | `key` |
| **tier** | `common` |
| **weight** | 0.3 |
| **allowedSlots** | `[]` |
| **durability** | — |

**Description:** A heavy iron key, its shaft thick with verdigris but its teeth still sharp. It fits the reinforced door between the Broken Sanctuary and the Sunken Square — a shortcut through the ruins that someone once locked for a reason.

**Stats (JSONB):**
```json
{ "unlocks": "broken-sanctuary-east" }
```

---

### 4g. Charred Street Map (Sturdy Tool — Rare)

| Field | Value |
|---|---|
| **itemId** | `charred-street-map` |
| **name** | Charred Street Map |
| **type** | `tool` |
| **tier** | `sturdy` |
| **weight** | 0.5 |
| **allowedSlots** | `[]` |
| **durability** | — |
| **soulbound** | `false` |

**Description:** A fragment of vellum, edges blackened by fire, showing a street grid that matches the ruins around you. Landmarks are annotated in a precise, alien script. When consulted, it reveals the layout of rooms you haven't yet visited — including passages others might miss. The rare find that makes a run profitable even before you swing a blade.

**Stats (JSONB):**
```json
{ "effect": "reveal_zone_map", "uses": 1, "vendor_value": 40 }
```

---

## 5. ENCOUNTER FLOW & PACING

### Intended Player Experience

1. **Shattered Gate** — Safe arrival. Read the scene, orient yourself. The silence is the first threat.
2. **Rubble Boulevard** — First gutterspawn encounter. Easy, but teaches pack combat. Crate as tutorial loot.
3. **Overwatch Tower** (optional) — Risk/reward dead end. Good loot (rare map chance) but floor collapse hazard. Environmental storytelling via tally marks.
4. **Hollow Market** — Central junction. First rubble scavenger encounter. Three exits create decision paralysis — north toward the locked sanctuary path, or south into the alleys?
5. **Broken Sanctuary** (north path) — Hollow stalker ambush. Dangerous solo. The locked east door is visible but requires the key, creating a reason to explore further or return later.
6. **Whispering Alley** (south path) — Gutterspawn gauntlet. Narrow corridors amplify sound. The corpse loot can include the sanctuary key (alternate source).
7. **Collapsed Tenement** (dead end) — Scavenger den. Hazardous combat space (cave-in risk). Good loot chest as reward for the dead-end exploration.
8. **Dustfall Extraction** — The way out. Light patrols. The extraction ritual generates noise — creatures from Whispering Alley and Sunken Square may respond.
9. **Sunken Square** — Second hollow stalker. The hidden exit rewards searching. Standing water adds tactical complexity.
10. **The Ratways** (hidden) — Gutterspawn nest. Tense, claustrophobic. Signals the boss ahead via sound design (grinding stone).
11. **The Charnel Pit** (boss) — The Collapsed One. The zone's climax. High risk, strong loot. Seismic tremor mechanic prevents passive play.

### Difficulty Curve
- **Rooms 1-3:** Tier 1 introductory. Gutterspawn are cannon fodder.
- **Rooms 4-7:** Tier 1 standard. Rubble scavengers and gutterspawn packs. First hollow stalker is a difficulty spike.
- **Rooms 8-9:** Tier 1-2 transition. Second hollow stalker. Environmental hazards layer onto combat.
- **Rooms 10-11:** Tier 2. Gutterspawn swarm + boss. The Collapsed One requires kiting (low agility) or a party.

### Sound Propagation Notes
- The Hollow Market's `large_space` property means combat there echoes into Boulevard, Sanctuary, and Alley.
- The Ratways' `water` property carries sound down to the Charnel Pit — the boss may be alert when you arrive.
- Whispering Alley's `narrow` property creates echo — creatures here respond quickly to noise.
- Extraction ritual at Dustfall Extraction is audible in Whispering Alley and Sunken Square.

---

## 6. LORE HOOKS

- **The Tally Marks (Overwatch Tower):** Who was counting? What were they counting? Days? Kills? Arrivals? Future content can answer this with a journal item or NPC.
- **The Faceless Statue (Hollow Market):** Deliberate defacement suggests the civilisation fell to internal conflict, not external invasion. Connects to broader Ellmud lore about pre-collapse factions.
- **The Medallions:** The Hollow Stalkers collect tarnished medallions. They don't use them. They don't trade them. Future quest: figure out why. Possible connection to the Collapsed One or to a deeper zone beneath the Warrens.
- **The Collapsed One:** Is it a creature that merged with debris, or a building that became animate? The answer matters for future zone design — if structures can come alive in shards, that changes everything.
- **The Locked Sanctuary:** What was being kept out? Or kept in? The scratch marks in the Sunken Square descend — something was climbing up from below.

---

*End of design document. Ready for implementation.*
# Equipment Silhouette + Shared ItemTooltip Component

**Date:** 2026-03-28  
**Agent:** Regis (Frontend Developer)  
**Status:** ✅ Implemented  

## Context

Built a visual equipment slot diagram for the ShardExploration sidebar, allowing players to see their equipped gear at a glance without opening the full inventory modal. Created a reusable ItemTooltip component that can be shared across multiple UI elements.

## Decision

### 1. Abstract Slot Diagram (Not Body Outline)

Chose a **compact grid layout** showing equipment slots arranged logically:
```
       [Head]
  [Weapon] [Chest] [Offhand]
       [Hands]
       [Legs]
       [Feet]
  [Ring1] [Amulet] [Ring2]
```

**Rationale:**
- More space-efficient than pixel-art body silhouette
- Clearer slot identification with labels
- Easier to scan visually in sidebar
- Matches MUD text-first aesthetic

### 2. Reusable ItemTooltip Component

Created standalone `ItemTooltip.tsx` that can be used by:
- EquipmentSilhouette (current)
- CombinedStashLoadout (future enhancement)
- Any future item display context

**Features:**
- Viewport-aware positioning (prevents overflow)
- Tier-colored border and glow effect
- Shows: name, type, slot, weight, description, tier badge
- Ready for stats display when server provides them

### 3. Tier Color Standardization

Both components use identical tier color mapping:
- scrap: `#808080` (gray)
- common: `#d4d4d4` (white)
- sturdy: `#4ade80` (green)
- refined: `#60a5fa` (blue)
- masterwork: `#c084fc` (purple)
- anomalous: `#fbbf24` (gold)

These match the existing tier colors throughout the client codebase.

### 4. Sidebar Placement

Positioned between **status effects** and **quick inventory** in the right sidebar.

**Rationale:**
- Status effects → Equipment → Inventory forms a logical flow
- Player condition → What they're wearing → What they're carrying
- Equipment is semi-static (changes less frequently than inventory)

### 5. Stats Placeholder

ItemTooltip shows `?` for weapon/armour stats since `DisplayItem` doesn't include computed stats.

**Future Enhancement Needed:**
- Server must add computed stats (damage/speed/armour) to `DisplayItem` message
- Or create separate stat lookup endpoint
- Tooltip code already structured to display stats when available

## Implementation Files

**Created:**
- `packages/client/src/components/ItemTooltip.tsx`
- `packages/client/src/components/EquipmentSilhouette.tsx`

**Modified:**
- `packages/client/src/pages/ShardExploration.tsx` — Sidebar integration
- `packages/client/src/styles/theme.css` — Equipment + tooltip CSS

## Technical Details

### Layout Grid Definition
```typescript
const LAYOUT_GRID: (EquipmentSlotType | null)[][] = [
  [null, 'head', null],
  ['weapon', 'chest', 'offhand'],
  [null, 'hands', null],
  [null, 'legs', null],
  [null, 'feet', null],
  ['ring1', 'amulet', 'ring2'],
];
```

### Tooltip Positioning Algorithm
1. Default: mouse + 12px offset (down-right)
2. If overflow right edge → mouse - width - 12px (left)
3. If overflow bottom edge → mouse - height - 12px (up)
4. Clamp to viewport with 8px minimum margin

### CSS Classes
- `.equipment-grid`, `.equipment-row`, `.equipment-cell`
- `.equipment-slot-label` (empty slots)
- `.equipment-item-name` (equipped items)
- `.item-tooltip` with fade-in animation

## MUD Aesthetic Compliance

✅ Dark backgrounds with subtle borders  
✅ Monospace fonts for equipment names  
✅ Tier-colored glows on equipped items  
✅ Dotted borders for empty slots  
✅ Compact design for sidebar space constraints  
✅ Text-primary with ANSI color heritage  

## Testing Considerations

**Manual Testing:**
- [ ] Tooltip appears on equipment hover
- [ ] Tooltip repositions to avoid viewport overflow
- [ ] Tier colors match across components
- [ ] Empty slots show dotted borders
- [ ] Item name truncation works correctly

**Future Automated Tests:**
- Component renders with empty loadout
- Component renders with full loadout
- Tooltip shows correct item details
- Tier colors applied correctly

## Cross-Team Dependencies

**Drizzt (Engine):**
- Future: Add computed stats to `DisplayItem` for tooltip display
- Current: LOADOUT_UPDATE message already flows correctly

**Minsc (Content/Testing):**
- Can write tests for equipment silhouette rendering
- Tooltip positioning logic may need viewport mock

## Decision Rationale

This implementation prioritizes:
1. **Space efficiency** — Sidebar real estate is limited
2. **Reusability** — ItemTooltip can be used elsewhere
3. **MUD aesthetic** — Matches existing UI patterns
4. **Extensibility** — Ready for stats when server provides them
5. **Accessibility** — Semantic HTML, hover states

The abstract slot diagram scales better than a body outline and provides clearer information density for the MUD-style text interface.
### Zone Exit Update API + Designer Enhancements
**By:** Regis (Frontend Dev)
**Date:** 2026-03-28

**What**
Added `PUT /admin/api/zones/exits/:id` endpoint and `updateExit` method to `ZoneRepository` interface (both Pg and InMemory implementations). Client-side: `updateExit`, `getOrphanedExits`, `removeOrphanedExits` wrappers in `zone-api.ts`.

Portal exits now render with cyan/teal (#06b6d4) color and ⟐ glyph in the SVG canvas. Orphaned exits get dashed red stroke highlighting plus a toolbar scan/cleanup workflow. Exit selection opens a full edit panel (direction, to-room, locked, hidden, portal fields).

**Why**
Exits were select-and-delete only — no way to edit properties after creation. Portal exits were visually identical to intra-zone exits. Orphaned exit cleanup API existed server-side but had no UI to invoke it.

**Impact**
- `ZoneRepository` interface gained `updateExit` — any custom implementations need to add it
- No DB migration needed — `zone_exits` table already has all columns
- Portal color changed from purple (#7B4FA0) to cyan (#06b6d4) to distinguish from feature rooms
# Status Panel Wireup — Styling Pattern Decision

**By:** Regis (Frontend Dev)
**Date:** 2026-03-28

## What

Status bars (HP, stamina) and status effect pills use dedicated CSS classes in `theme.css` rather than Tailwind utility-only approach. CSS variables `--hp-healthy`, `--hp-wounded`, `--hp-critical`, `--stamina` added to `:root`.

## Why

- Keeps bar colors consistent with game theme and easy to adjust in one place
- Dynamic bar width is the only inline style (per project constraint)
- Status effect classification uses name-based keyword matching since `StatusEffect` has no `type` field — if the server adds an effect type field later, the classifier should be updated

## Impact

- **Drizzt:** When stamina system is implemented server-side, the stamina bar is already wired — just send non-zero values in `PLAYER_STATE` and the UI will reflect it automatically
- **Content/Testing:** Status effect keyword lists live in `ShardExploration.tsx` (`DEBUFF_KEYWORDS`, `BUFF_KEYWORDS`). New effect names should be added to the appropriate list for correct coloring.
# Decision: Z-Level Floor Switching Architecture

**Author:** Regis (Frontend Dev)  
**Date:** 2025-07-23  
**Status:** Implemented

## Context

The layout engine already computes z-levels from up/down exits. The map rendered all rooms regardless of z, making multi-floor zones cluttered and hard to read.

## Decision

### Floor filtering is client-side, stateful, per-component

- `MapRenderer` owns its own `currentFloor` state (defaults to current room's z)
- `FullMapOverlay` manages floor state separately so it can be reset when opened
- `ZoneDesigner` has its own floor state in the admin canvas
- `FloorSelector` is a stateless controlled component — consumers own the state

### Inter-floor exits are visible as ghost connections

When viewing floor N, if an exit connects floor N to floor M, both the edge and the off-floor endpoint are shown:
- Edge: dashed purple (#a78bfa) with ↑/↓ indicator
- Off-floor room: 30% opacity ghost node, clickable to switch floors

### Single-floor zones unchanged

`FloorSelector` returns `null` when `minFloor === maxFloor`. No new UI elements appear for the common single-floor case.

### Color constants

New constants in `packages/client/src/components/map/constants.ts`:
- `INTER_FLOOR_STROKE` = `#a78bfa`
- `INTER_FLOOR_DASH` = `'4 3'`
- `GHOST_FLOOR_OPACITY` = 0.3

### Keyboard shortcuts

`[` = floor down, `]` = floor up. Only active when not in an input field.

## Files Changed

- `packages/client/src/components/map/constants.ts` — new color constants
- `packages/client/src/components/map/FloorSelector.tsx` — **new** shared component
- `packages/client/src/components/map/useFloorFilter.ts` — **new** floor bounds + edge filtering utils
- `packages/client/src/components/map/ExitEdge.tsx` — inter-floor styling prop
- `packages/client/src/components/map/MapRenderer.tsx` — floor state, filtering, ghost layers
- `packages/client/src/components/map/FullMapOverlay.tsx` — floor selector in header
- `packages/client/src/components/map/MinimapWidget.tsx` — conditional floor selector
- `packages/client/src/pages/admin/ZoneDesigner.tsx` — floor state, filtered rendering, inter-floor ghost rooms

---

## 2026-03-28T17:33:19Z: Pan uses SVG viewBox offset, not CSS transform

**Author:** Regis (Frontend)  
**Date:** 2026-03-28  
**Status:** Implemented

**Context**

The Zone Designer needed pan support alongside the existing zoom (which uses viewBox scaling). Two approaches were possible:
1. CSS transform on the SVG or a wrapper div
2. Offset the SVG viewBox coordinates

**Decision**

Pan is implemented as a viewBox offset (`panX`/`panY` added to the zoom-adjusted origin). This keeps pan and zoom in the same coordinate space — no layering of CSS transforms on top of viewBox manipulations, which avoids coordinate conversion bugs when both are active.

**Consequences**

- Pan and zoom compose naturally since both modify the same viewBox
- Mouse-to-SVG coordinate conversion is straightforward (one scale factor from `getBoundingClientRect`)
- Room click handlers, exit rendering, and context menus are unaffected since they work in SVG coordinate space
- If we later add zoom-to-cursor, the shared viewBox approach makes that simpler
# Decision: Direction-Biased Room Layout in Zone Designer

**Date:** 2026-03-27  
**Decider:** Regis (Frontend Dev)  
**Status:** Implemented

## Problem

The zone designer was placing rooms in visually misleading positions. When a room's ideal position (determined by exit direction) was occupied, the layout engine used a direction-unaware spiral search to find the nearest free cell. This caused rooms with cardinal exits (east, west, north, south) to be placed at incorrect angles — for example, an "east" exit might place the target room north-east, south, or even west of the source, depending on which cell was free first.

**Example:** "blighted-courtyard" with an east exit might appear diagonal from its neighbor even though the exit is cardinal.

## Solution

Replaced the plain spiral search with a direction-biased algorithm for cardinal exits:

1. **Added `findNearestDirectional()`** — searches in concentric rings by Manhattan distance (same as before) but within each ring, uses a dot product score to prefer cells aligned with the exit direction.

   - For an "east" exit (dx=1, dy=0), cells further east get higher scores.
   - For a "north" exit (dx=0, dy=-1), cells further north get higher scores.

2. **Updated BFS** — the main layout loop now calls `findNearestDirectional(idealX, idealY, offset.dx, offset.dy, occupied)` instead of `findNearestUnoccupied(idealX, idealY, occupied)` when placing cardinal-direction neighbors (~line 387 in `computeLayout.ts`).

3. **Kept `findNearestUnoccupied()`** — still used for disconnected subgraph placement. No breaking changes to that code path.

## Impact

- **Zone designer UI:** Rooms now appear in visually correct positions relative to their exits. Cardinal exits produce straight lines, not diagonals.
- **Grid clusters:** Already placed as coherent blocks; this fix improves the linear/tree-shaped approach areas connecting to grids.
- **Tests:** All 14 existing `computeLayout.test.ts` tests still pass. No test expectations needed updating because the old tests didn't rely on the specific non-directional spiral behavior.

## Files Modified

- `packages/client/src/map/computeLayout.ts`
  - Added `findNearestDirectional()` function (37 lines)
  - Updated cardinal exit placement to use direction-biased search (1-line change in BFS loop)

## Build/Test Results

- **Build:** ✅ Clean (`npm run build`)
- **Tests:** ✅ 14/14 passed (`packages/client/src/map/__tests__/computeLayout.test.ts`)
- **Full client suite:** ✅ 125/125 passed

## Rationale

The layout engine is a pure function shared by both the admin zone designer and the player minimap. Visual accuracy is critical for zone design — designers need to see rooms where they logically belong. The direction-biased search maintains the "nearest free cell" property (minimal displacement) while respecting the semantic meaning of exit directions.

This is a targeted fix: grid clusters already work correctly, and disconnected subgraphs don't need directional bias. The change only affects the cardinal-exit placement in BFS, which is the exact code path that was producing misleading layouts.

# Decision: Z-Level Independent BFS Layout

**By:** Regis (Frontend Dev)
**Date:** 2026-03-27T20:05Z
**Component:** `packages/client/src/map/computeLayout.ts`

## What

The BFS layout engine now treats each z-level as an independent coordinate space:

1. **Phase 1** BFS-es the primary z-level (z=0), deferring all `up`/`down` exits into a pending list instead of placing targets immediately.
2. **Phase 2** processes each deferred z-level: the first transition anchors the sub-level at the source room's (x,y), then a fresh BFS expands the subgraph using only cardinal exits. Further `up`/`down` exits to deeper levels (z=-2, etc.) are deferred recursively.
3. **Phase 3** handles disconnected subgraphs (unchanged).

Each z-level gets its own `occupied` set — rooms on different floors can share the same (x,y) without collision since the designer displays one floor at a time.

## Why

The sewer level has 3 entry points from scattered surface rooms. The old BFS placed sub-level rooms at the surface room's (x,y), inheriting arbitrary positions that didn't match the sewer's own cardinal topology. Cardinal exits between sewer rooms then produced diagonal lines in the zone designer.

## Impact

- **Zone designer:** Sub-levels now display coherent cardinal layouts regardless of how many surface entry points exist.
- **Minimap:** Same engine, same fix applies.
- **Grid cluster detection:** Unchanged — still works within each z-level.
- **Tests:** 3 new tests (sewer topology, shared x/y across z-levels, 3-level cascade). All 17 passing.


---

## 2026-03-28: Remove zone preview and save-ready panels from ZonesDetail

**By:** Regis (Frontend Dev)  
**Date:** 2026-03-28  
**Status:** Implemented

**What:** Removed the right-side "Preview" panel and "✓ Zone ready to save" indicator from the zones detail page (`ZonesDetail.tsx`). The page layout changed from a 3-column grid (2/3 form + 1/3 sidebar) to full-width single column.

**Why:** The Zone Designer tab now provides a richer, interactive view of the zone — the static preview panel was redundant. The save-ready indicator added no value beyond what the Save button already communicates.

**Impact:** No state, handlers, or imports became unused — the removed panels only referenced existing `formData`, `rooms`, `exits`, and `error` state that are still used by the form tabs.

---

## 2026-03-29: Zone Designer UX Improvements

**Author:** Regis (Frontend Dev)  
**Date:** 2026-03-29  
**Status:** Implemented

## Context

Zone Designer had three UX pain points:
1. Narrow side panel (256px) cramped room editing forms
2. Wide rectangle room nodes (140×60) felt unbalanced and wasted vertical space
3. Room names truncated at 16 chars created information loss on the map

## Decision

Made three coordinated improvements:

1. **Wider Details Panel** — Increased from w-64 to w-80 (256px → 320px) for better form layout
2. **Square Room Nodes** — Changed to 100×100 squares with proportional cell spacing (160×160), repositioned all badges and indicators
3. **Toggleable Labels + Hover Tooltips** — Default shows only slug on map, hover displays rich tooltip with full details; toggle "Labels On" restores old behavior with both name and slug visible

## Rationale

- Square nodes provide better visual balance and work well with centered text
- Hover tooltips allow full information access without cluttering the map
- Toggle gives power users the option to always show names if preferred
- Wider panel eliminates form field cramping without significantly reducing map area

## Implementation Notes

- HTML div tooltips (not SVG) for better styling and no clipping issues
- 150ms hover delay prevents flickering on quick mouse movements
- Badge positions all recalculated for square node geometry
- Cell spacing maintains 60px gutters to prevent node overlap
- Toggle button follows existing toolbar button patterns

## Impact

**Affected:**
- **Vex / Content Designers:** Will benefit from cleaner map display and easier editing
- **Other Admin Tools:** May want to adopt similar hover tooltip patterns for information-dense UIs

**Future Considerations:**
- Room node size could be made configurable if different zones need different zoom levels
- Tooltip could be extended with additional room metadata (exits, connections, etc.)

**Commit:** 0a899fd — feat(designer): square rooms, wider panel, hover tooltips with toggle
# NPC and Item Room Management for Zone Designer

**Prepared by:** Elminster (Technical Lead)  
**Requested by:** dkirby-ms  
**Date:** March 2026  
**Scope:** Two new admin features for the Zone Designer tool

---

## Executive Summary

The Zone Designer already has foundational support for NPCs and items in rooms — the `ZoneRoomDefinition` interface exposes `npcs[]` and `lootContainers[]` fields, and the database stores them as JSONB in the `zone_rooms` table. However, the admin UI lacks UI components to manage them. Additionally, the NPC spawn data structure needs clarification, and creature template discovery is not yet exposed to admins.

This document proposes:

1. **NPC Management Feature:** UI to add/remove/configure creatures spawned per room (spawn count, creature type selection).
2. **Item/Loot Management Feature:** UI to add/remove loot containers and configure items within them.

Both features require minimal DB changes, rely on existing creature and item definition tables, and integrate into the existing zone CRUD API.

---

## Current State: Data Model

### NPCs in Rooms

**Database:** `zone_rooms.npcs` (JSONB)

Current structure (inferred from seed data and `CreatureManager.spawnCreaturesFromZone()`):

```json
[
  {
    "creatureId": "gutterspawn",
    "spawnCount": 2
  },
  {
    "creatureId": "slum_rat",
    "spawnCount": 1
  }
]
```

**Fields:**
- `creatureId` (string): References a creature template (e.g., "drowned_revenant", "gutterspawn", "rubble_scavenger").
- `spawnCount` (number): How many instances of this creature spawn in the room.

**How it works:**
- At shard/zone runtime, `CreatureManager.spawnCreaturesFromZone()` iterates rooms, reads the `npcs` array, and spawns instances.
- Creatures are tracked for repop (respawning after death) via `zoneCreatureRecords`.

**Creature templates available:**
- `drowned_revenant` (migration 023 seed)
- `gutterspawn` (inferred from seed data; template likely in templates/ folder)
- `slum_rat` (inferred)
- `rubble_scavenger` (inferred)
- Additional templates likely defined in `/creatures/templates/` directory

### Loot Containers in Rooms

**Database:** `zone_rooms.loot_containers` (JSONB)

Current structure (from seed data):

```json
[
  {
    "id": "r4c1-crate-1",
    "type": "crate",
    "items": [
      "bent_rebar",
      "gutterspawn_fang"
    ]
  },
  {
    "id": "r4c2-sack-1",
    "type": "crate",
    "items": [
      "rat_tail",
      "scavenger_shiv"
    ]
  }
]
```

**Fields:**
- `id` (string): Unique identifier for this container (e.g., "r4c1-crate-1").
- `type` (string): Container type (e.g., "crate", "corpse", "sack", "altar").
- `items` (string[]): Array of item definition slugs/IDs.

**How it works:**
- At runtime, `ShardRoom` reads `lootContainers` and initializes loot piles.
- Items are player-accessible via the `search` command.
- Item definitions are resolved from the `item_definitions` table by slug.

**Item definitions available:**
- See `item_definitions` table schema: `id`, `name`, `type` (weapon, armour, consumable, material, tool, key, blueprint), `tier`, `stats` (JSONB), `description`, `soulbound`.
- Items are typically identified by slug (e.g., "bent_rebar", "gutterspawn_fang").

### Hazards in Rooms

**Database:** `zone_rooms.hazards` (JSONB)

Current structure (from seed data):

```json
[
  {
    "type": "unstable_rubble",
    "severity": 0.2
  },
  {
    "type": "standing_water",
    "severity": 0.2
  }
]
```

**Fields:**
- `type` (string): Hazard type (e.g., "unstable_rubble", "standing_water").
- `severity` (number): Intensity (0.0–1.0 scale).

(Hazards are out of scope for this task but documented for completeness.)

---

## Current Admin API

**Zone CRUD routes:** `/admin/api/zones/*`

**Room endpoints:**
- `POST /admin/api/zones/{zoneId}/rooms` — Create room
- `PUT /admin/api/zones/rooms/{roomId}` — Update room (all fields, including npcs and lootContainers)
- `DELETE /admin/api/zones/rooms/{roomId}` — Delete room

**Current validation:** Slug and name only. No validation on `npcs`, `lootContainers`, or `hazards`.

**Client API:** `zone-api.ts`
- `updateRoom(roomId, data)` — Sends PUT request to update room

---

## Gaps & Design Questions

### 1. Creature Template Discovery

**Problem:** Admins cannot see available creature templates. `CREATURE_TEMPLATES` map in `CreatureManager.ts` is hardcoded and not exposed to the admin API.

**Solution:**
- Create an admin endpoint: `GET /admin/api/creatures` — Returns list of creature templates with metadata (name, stats, spawn rules, loot table).
- Response schema:
  ```json
  [
    {
      "id": "drowned_revenant",
      "name": "Drowned Revenant",
      "stats": { "maxHp": 50, "attack": 10, "defence": 3, "armour": 3 },
      "spawnRules": {
        "minCount": 3,
        "maxCount": 5,
        "preferredRoomTypes": ["corridor", "dead_end"],
        "forbiddenRoomTypes": ["entry", "extraction"]
      },
      "lootTable": [...]
    },
    ...
  ]
  ```
- Register all templates in `CREATURE_TEMPLATES` map (currently only `drowned_revenant`; need to discover/register `gutterspawn`, `slum_rat`, `rubble_scavenger`).

### 2. Item Definition Discovery

**Problem:** Admins cannot list available item definitions to populate loot containers.

**Solution:**
- Create an admin endpoint: `GET /admin/api/items` — Returns list of item definitions with metadata (name, type, tier, description).
- Response schema:
  ```json
  [
    {
      "id": "bent_rebar",
      "name": "Bent Rebar",
      "type": "material",
      "tier": "common",
      "description": "A piece of rusty metal...",
      "stats": { ... }
    },
    ...
  ]
  ```
- Leverage existing `ItemDefinitionsStore` repository.

### 3. NPC Configuration Properties

**Current limitation:** `npcs` array only supports `creatureId` and `spawnCount`. The GDD mentions additional NPC properties:
- **Aggression:** How quickly to alert and attack.
- **Patrol route:** Multi-room patrol paths (currently per-creature-template).
- **Items carried:** NPC-specific loot on death.
- **Behavior override:** Per-room behavior variations.

**Recommendation for Phase 1:**
- Keep `npcs` structure minimal: `{creatureId, spawnCount}` only.
- If zone designers need per-NPC aggression or patrol routes, extend the structure in Phase 2.
- For now, aggression and patrol are controlled by creature templates (global).

### 4. Loot Container Validation

**Current limitation:** No validation that items in `lootContainers` actually exist in `item_definitions`.

**Recommendation:**
- Add server-side validation in `updateRoom()` endpoint: cross-check item IDs against `item_definitions` table.
- Return validation errors if items not found.

### 5. Respawn & Hidden Items

**Question:** Should loot containers support:
- **Spawn rate:** Like NPCs, should containers have a spawn probability?
- **Hidden flag:** Items hidden until searched (GDD §4).

**Recommendation for Phase 1:**
- Loot containers always exist and are always visible.
- Add `hidden` and `spawnRate` fields in Phase 2 when search/detection mechanics mature.

---

## Data Model: Final Proposal

### NPC Spawn Record (No schema change required)

Keep existing structure; no DB migration needed:

```json
{
  "creatureId": "string (creature template ID)",
  "spawnCount": "number (1+)"
}
```

### Loot Container Record (No schema change required)

Keep existing structure; no DB migration needed:

```json
{
  "id": "string (unique per room)",
  "type": "string (crate, corpse, sack, etc.)",
  "items": "string[] (item definition IDs)"
}
```

---

## Implementation Plan

### Phase 1: Admin API Endpoints

**Scope:** Expose creature and item definitions to the admin interface. Validate NPC/loot data on room update.

#### 1.1 New Admin Endpoint: `GET /admin/api/creatures`

**File:** `packages/server/src/admin/zones/zone-routes.ts`

**Route:** `GET /admin/api/creatures`

**Handler:**
```typescript
router.get('/admin/api/creatures', adminAuth, async (_req, res) => {
  try {
    const creatures = Array.from(CREATURE_TEMPLATES.values()).map(t => ({
      id: t.type,
      name: t.name,
      stats: t.stats,
      spawnRules: t.spawnRules,
      lootTable: t.lootTable,
      idleTicksMin: t.idleTicksMin,
      idleTicksMax: t.idleTicksMax,
      fleeThreshold: t.fleeThreshold,
    }));
    res.json(creatures);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list creatures' });
  }
});
```

**Notes:**
- Must ensure all creature templates are registered in `CREATURE_TEMPLATES` (currently only `drowned_revenant`; need to load and register `gutterspawn`, `slum_rat`, `rubble_scavenger` from templates folder).
- Templates are defined in `/creatures/templates/*.ts` (singleton instances like `DROWNED_REVENANT`).

#### 1.2 New Admin Endpoint: `GET /admin/api/items`

**File:** `packages/server/src/admin/routes.ts` (or create new `admin/items/item-routes.ts`)

**Route:** `GET /admin/api/items`

**Handler:**
```typescript
router.get('/admin/api/items', adminAuth, async (_req, res) => {
  try {
    const itemRepo = getItemDefinitionsRepository();
    const items = await itemRepo.getAllItemDefinitions();
    const mapped = items.map(i => ({
      id: i.id,
      name: i.name,
      type: i.type,
      tier: i.tier,
      description: i.description,
      stats: i.stats,
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list items' });
  }
});
```

**Notes:**
- Leverage existing `ItemDefinitionsStore` (used by player inventory/stash system).
- Repository method `getAllItemDefinitions()` may need to be added if it doesn't exist.

#### 1.3 Enhanced Room Validation

**File:** `packages/server/src/admin/zones/zone-routes.ts`

**Enhancement:** `validateRoom()` function

Add checks for `npcs` and `lootContainers`:

```typescript
function validateRoom(data: Record<string, unknown>): string[] {
  const errors: string[] = [];

  // ... existing slug/name validation ...

  // Validate npcs array
  if (data.npcs && Array.isArray(data.npcs)) {
    for (const npc of data.npcs as any[]) {
      if (!npc.creatureId) {
        errors.push('NPC must have creatureId');
      }
      if (typeof npc.spawnCount !== 'number' || npc.spawnCount < 1) {
        errors.push('NPC spawnCount must be >= 1');
      }
      // Check if creature template exists
      const creatureExists = CREATURE_TEMPLATES.has(npc.creatureId);
      if (!creatureExists) {
        errors.push(`Unknown creature template: ${npc.creatureId}`);
      }
    }
  }

  // Validate lootContainers array
  if (data.lootContainers && Array.isArray(data.lootContainers)) {
    const seenIds = new Set<string>();
    for (const container of data.lootContainers as any[]) {
      if (!container.id) {
        errors.push('Loot container must have id');
      }
      if (seenIds.has(container.id)) {
        errors.push(`Duplicate loot container id: ${container.id}`);
      }
      seenIds.add(container.id);
      
      if (!container.type) {
        errors.push('Loot container must have type');
      }
      
      if (!Array.isArray(container.items)) {
        errors.push('Loot container items must be an array');
      }
      // TODO: Cross-check items against item_definitions in Phase 1.2
    }
  }

  return errors;
}
```

### Phase 2: Client UI Components

**Scope:** Build Zone Designer UI to add/remove/configure NPCs and loot containers.

#### 2.1 NPC Management UI

**File:** `packages/client/src/pages/AdminZoneEditor.tsx` (or new component `RoomNPCPanel.tsx`)

**Features:**
- Dropdown to select creature template (populated from `GET /admin/api/creatures`).
- Input field for spawn count (1+).
- "Add NPC" button to push to `npcs[]` array.
- "Remove NPC" button to splice from array.
- List of current NPCs with inline edit/delete.
- Real-time update to room object.

**Pseudo-code:**
```tsx
const [npcs, setNpcs] = useState(room.npcs || []);
const [creatures, setCreatures] = useState([]);

useEffect(() => {
  listCreatures().then(setCreatures);
}, []);

const addNPC = (creatureId, spawnCount) => {
  setNpcs([...npcs, { creatureId, spawnCount }]);
};

const removeNPC = (index) => {
  setNpcs(npcs.filter((_, i) => i !== index));
};

// Update room.npcs and persist
useEffect(() => {
  updateRoom(room.id, { ...room, npcs }).catch(handleError);
}, [npcs]);
```

#### 2.2 Loot Container Management UI

**File:** `packages/client/src/pages/AdminZoneEditor.tsx` (or new component `RoomLootPanel.tsx`)

**Features:**
- Input field for container ID (validated as slug-like).
- Dropdown for container type (crate, corpse, sack, etc.).
- Multi-select or tag input for items (populated from `GET /admin/api/items`).
- "Add Container" button.
- "Remove Container" button.
- List of current containers with inline edit/delete.
- Real-time update to room object.

**Pseudo-code:**
```tsx
const [lootContainers, setLootContainers] = useState(room.lootContainers || []);
const [items, setItems] = useState([]);

useEffect(() => {
  listItems().then(setItems);
}, []);

const addContainer = (id, type, items) => {
  setLootContainers([...lootContainers, { id, type, items }]);
};

const removeContainer = (index) => {
  setLootContainers(lootContainers.filter((_, i) => i !== index));
};

// Update room.lootContainers and persist
useEffect(() => {
  updateRoom(room.id, { ...room, lootContainers }).catch(handleError);
}, [lootContainers]);
```

### Phase 3: Testing & Validation

**Scope:** Ensure NPCs and loot containers spawn correctly at runtime.

#### 3.1 Unit Tests

**File:** `packages/server/src/__tests__/admin-crud.test.ts`

**Tests:**
- Validate `npcs` array structure (creatureId, spawnCount required, spawnCount >= 1).
- Validate `lootContainers` array structure (id unique, type present, items is array).
- Reject unknown creature templates.
- Reject invalid item references (Phase 1.3 enhancement).
- Update room with valid NPC/loot data.
- Reject room update with invalid NPC/loot data.

#### 3.2 Integration Tests

**File:** `packages/server/src/__tests__/zone-system.test.ts` (or extend)

**Tests:**
- Load zone with NPCs defined in rooms.
- Spawn creatures via `CreatureManager.spawnCreaturesFromZone()`.
- Verify creatures appear in the correct rooms.
- Load zone with loot containers.
- Verify containers appear in `ShardRoom` loot piles.
- Verify items are searchable/accessible.

#### 3.3 E2E Tests (Admin UI)

**File:** `packages/client/src/__tests__/admin-zone-editor.e2e.ts` (or similar)

**Tests:**
- Navigate to zone editor for a test zone.
- Add an NPC to a room.
- Verify NPC appears in the room's NPC list.
- Remove the NPC.
- Verify NPC is removed.
- Add a loot container with items.
- Verify container appears in the room's loot list.
- Remove the container.
- Verify container is removed.
- Persist changes and reload the zone.
- Verify changes are retained.

---

## Work Breakdown

### Server-Side (Backend)

| Task | File | Effort | Dependencies |
|------|------|--------|--------------|
| **1.1** Register missing creature templates in `CREATURE_TEMPLATES` | `/creatures/CreatureManager.ts` + `/creatures/templates/` | 1d | None |
| **1.2** Implement `GET /admin/api/creatures` endpoint | `/admin/zones/zone-routes.ts` | 1d | 1.1 |
| **1.3** Implement `GET /admin/api/items` endpoint | `/admin/routes.ts` or new `/admin/items/` | 1d | None (ItemDefinitionsStore exists) |
| **1.4** Add NPC/loot validation to room update | `/admin/zones/zone-routes.ts` | 1d | 1.2, 1.3 |
| **2.1** Unit tests for validation | `/__tests__/admin-crud.test.ts` | 1d | 1.4 |
| **2.2** Integration tests for spawning | `/__tests__/zone-system.test.ts` | 1d | 1.1, 1.4 |

**Server-side total:** ~6 days

### Client-Side (Frontend)

| Task | File | Effort | Dependencies |
|------|------|--------|--------------|
| **3.1** Fetch creature and item definitions | `/lib/zone-api.ts` | 0.5d | 1.2, 1.3 |
| **3.2** Build NPC management UI component | `/pages/AdminZoneEditor.tsx` + `/components/RoomNPCPanel.tsx` | 2d | 3.1 |
| **3.3** Build loot container UI component | `/pages/AdminZoneEditor.tsx` + `/components/RoomLootPanel.tsx` | 2d | 3.1 |
| **3.4** Integrate NPC panel into room editor | `/pages/AdminZoneEditor.tsx` | 1d | 3.2 |
| **3.5** Integrate loot panel into room editor | `/pages/AdminZoneEditor.tsx` | 1d | 3.3 |
| **4.1** E2E tests (admin UI) | `/__tests__/admin-zone-editor.e2e.ts` | 1d | 3.5 |

**Client-side total:** ~7.5 days

### Total Effort

- **Backend:** ~6 days
- **Frontend:** ~7.5 days
- **Total:** ~13.5 days (~2 weeks)

### Parallelization

- Backend tasks 1.2 and 1.3 can run in parallel (independent endpoints).
- Client tasks 3.2 and 3.3 can run in parallel (independent UI components).
- Server and client work can fully parallelize after initial API specs are agreed.

---

## Architecture & Design Decisions

### 1. No Separate Tables for NPC/Loot Data

**Decision:** Store `npcs` and `lootContainers` as JSONB in `zone_rooms` table (no new tables).

**Rationale:**
- `zone_rooms` already has JSONB columns for `npcs`, `lootContainers`, `hazards`.
- Room-level data (what spawns where) is authoritatively stored with the room definition.
- Avoids normalization overhead for data that is always queried/updated as a set.
- Matches existing pattern (hazards also stored inline).

### 2. Creature Templates as Read-Only Admin Reference

**Decision:** Expose creature templates via API as read-only metadata (no CRUD).

**Rationale:**
- Creature templates are global definitions (not per-room or per-zone).
- Defined in code and seeded to the database (migrations).
- For now, admins can only *use* existing templates to spawn creatures in rooms.
- If template editing is needed later, it can be added as a separate admin feature.

### 3. Item Definitions as Read-Only Admin Reference

**Decision:** Expose item definitions via API as read-only metadata (no CRUD).

**Rationale:**
- Same as creatures: items are global definitions.
- Zone designers select from the pool of defined items to populate loot containers.
- Item CRUD is a separate concern (item design tool, not zone design tool).

### 4. Validation at API Boundary

**Decision:** Validate `npcs` and `lootContainers` in the room update endpoint, not in the database.

**Rationale:**
- Fail fast with clear error messages.
- No constraint checking in the database (would require stored procedures or triggers).
- Admins get immediate feedback in the UI.

---

## Risks & Mitigations

### Risk 1: Missing Creature Templates

**Problem:** Not all creature types used in seed data are registered in `CREATURE_TEMPLATES`.

**Mitigation:**
- Audit `/creatures/templates/` directory and seed migrations to identify all in-use creature types.
- Register each in `CREATURE_TEMPLATES` during task 1.1.
- Add a test to verify `CREATURE_TEMPLATES` contains all types used in any zone.

### Risk 2: Item Definition Gaps

**Problem:** Items referenced in seed loot containers may not exist in `item_definitions` table.

**Mitigation:**
- Add optional validation in task 1.4 (cross-check items against table).
- If validation fails, zone admin will see errors on room update.
- Seed migration may need a follow-up to add missing item definitions.

### Risk 3: Complex NPC Behavior Requirements

**Problem:** Zone designers may want to configure per-NPC aggression, patrol routes, or items carried.

**Mitigation:**
- Phase 1 keeps `npcs` structure minimal: `{creatureId, spawnCount}` only.
- Document this limitation in release notes.
- Plan Phase 2 feature to extend NPC structure with behavior overrides.
- Current creature templates already support these via code, so it's a *configuration* problem, not a capability problem.

### Risk 4: Loot Container Spawn Rate

**Problem:** Some zones may want loot containers to spawn conditionally (e.g., 50% chance).

**Mitigation:**
- Phase 1: Loot containers always spawn.
- Phase 2: Add optional `spawnRate` field (0.0–1.0).
- Deterministic PRNG seeding ensures consistent spawns across shard replicas.

---

## Future Enhancements (Phase 2+)

1. **NPC Behavior Overrides:** Extend `npcs` structure to include `{creatureId, spawnCount, aggression?, patrolRoute?, items?}`.
2. **Loot Spawn Rates:** Add `spawnRate` field to loot containers.
3. **Hidden Items:** Add `hidden` flag to loot containers (integration with search/detection mechanics).
4. **Creature Type Creation:** Add admin interface for defining new creature templates (code-level today).
5. **Item Type Creation:** Add admin interface for defining new item definitions (already possible via CMS-like interface; could be polished).
6. **Loot Table Editor:** Link loot containers to loot table definitions (currently items are inline).
7. **Multi-Zone NPC Wandering:** Allow NPCs to patrol across multiple zones (Refuge-only feature today).

---

## Success Criteria

1. **Admin API:**
   - ✅ `GET /admin/api/creatures` returns all registered creature templates with metadata.
   - ✅ `GET /admin/api/items` returns all item definitions with metadata.
   - ✅ Room update endpoint validates `npcs` and `lootContainers` and rejects invalid data with clear errors.

2. **Admin UI:**
   - ✅ Zone editor displays NPC management panel in room details.
   - ✅ Admin can add/remove NPCs from a room with dropdown selection and numeric input.
   - ✅ Zone editor displays loot management panel in room details.
   - ✅ Admin can add/remove loot containers with tag-based item selection.
   - ✅ Changes persist to the database (room update).

3. **Runtime:**
   - ✅ Creatures defined in room `npcs` spawn at zone load and repop correctly.
   - ✅ Loot containers defined in room `lootContainers` are searchable and accessible to players.

4. **Testing:**
   - ✅ Unit tests verify validation logic.
   - ✅ Integration tests verify spawning behavior.
   - ✅ E2E tests verify admin UI workflows.

---

## Conclusion

The foundational infrastructure for NPC and item room management exists in the codebase. The primary work is:

1. **Expose creature and item templates to the admin API** (so admins can see what they can use).
2. **Build UI components** to manage `npcs` and `lootContainers` in the room editor.
3. **Validate data** at the API boundary.

The data model requires no schema changes, and the runtime behavior is already implemented in `CreatureManager` and `ShardRoom`. This is a **high-confidence, high-value feature** with clear dependencies and low architectural risk.

Estimated delivery: **~2 weeks** (6 days backend + 7.5 days frontend, with parallelization).
# Decision: Zone Designer NPC & Loot Management

**Date:** 2026-03-27  
**Author:** Regis (Frontend Dev)  
**Status:** Implemented

## Summary

Added two new admin API endpoints and UI features to the Zone Designer:
1. Resizable room details panel (drag handle on left edge)
2. NPC and loot container management in room editor

## New API Endpoints

### `GET /admin/api/creature-templates`
- Returns all creature templates from `CREATURE_TEMPLATES` registry
- Response: `{ templates: CreatureTemplate[], count: number }`
- Used by Zone Designer to populate NPC dropdown

### `GET /admin/api/items`
- Returns all item definitions from `ITEM_REGISTRY`
- Response: `{ items: ItemDefinition[], count: number }`
- Used by Zone Designer to populate loot item dropdown

## Data Model Changes

**Zone Room Definition (client types):**
- `npcs: RoomNPC[]` — was `unknown[]`
  - `RoomNPC = { creatureId: string, spawnCount: number }`
- `lootContainers: RoomLootContainer[]` — was `unknown[]`
  - `RoomLootContainer = { itemId: string, quantity: number }`

**Existing backend (no changes):**
- `zone_rooms.npcs` JSONB column already exists
- `zone_rooms.loot_containers` JSONB column already exists
- Room CRUD endpoints already accept these fields

## UI Changes

**Room details panel (ZoneDesigner.tsx):**
- Panel is now horizontally resizable (280px - 600px, default 320px)
- Drag handle on left edge (4px, subtle hover effect)
- NPCs section with add/remove rows (creature dropdown + spawn count input)
- Loot section with add/remove rows (item dropdown + quantity input)
- Both sections replace the previous read-only "Content summary"

## Impact

**For Backend Devs:**
- New creature templates should be registered in `CREATURE_TEMPLATES` (CreatureManager.ts)
- New items should be registered in `ITEM_REGISTRY` (items/registry.ts)
- Both will automatically appear in Zone Designer dropdowns

**For Content Designers:**
- Can now populate rooms with NPCs and loot via Zone Designer UI
- No need to manually edit JSONB in database
- Spawn counts and quantities editable inline

## Files Modified

**Server:**
- `packages/server/src/creatures/CreatureManager.ts` — added `getAllCreatureTemplates()`
- `packages/server/src/admin/routes.ts` — added two new endpoints

**Client:**
- `packages/client/src/lib/zone-api.ts` — added types and API functions
- `packages/client/src/pages/admin/ZoneDesigner.tsx` — UI implementation

## Testing

- Build: ✅ Clean (TypeScript compilation successful)
- Server tests: Running (91 test files, takes ~5+ minutes)
- Manual testing recommended for full UI verification

---

## 2026-03-30: Migration consolidation — 36 files → 3 clean files

**By:** Drizzt (Engine Dev)  
**Requested by:** dkirby-ms

**Decision:** Consolidate 36 incremental migration files into 3 clean migrations for pre-release clean slate.

**Migrations Created:**
- `001_schema.sql` — all tables, constraints, indexes
- `002_seed_content.sql` — factions, items, creatures  
- `003_seed_zones.sql` — Refuge + Warrens zones

**Why:** Pre-release project with zero production databases. Clean slate makes onboarding easier and removes accumulated ALTER/DROP/recreate noise from 36 incremental migrations.

**Impact:**
- Every dev must run `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` and restart the server
- All 36 old migration files deleted
- Future migrations start at `004_*.sql`
- Bug fix: stash-provider.ts `stats` → `base_stats` column reference
- Tests passing: 2051 server + 158 shared tests ✓
- Commit: 95a6f97

---

## 2026-03-29: Zone Designer Legend Panel

**By:** Regis (Frontend Dev)  
**Date:** 2026-03-28

### Decision

Added a collapsible floating legend panel to the Zone Designer map view. The legend is positioned in the bottom-left corner of the canvas, collapsed by default (showing only a small "Legend" button), and expands to show all visual element meanings.

### Rationale

- Designers need to understand what the various colors, line styles, badges, and indicators mean without guessing
- The legend uses the exact same SVG elements and hex colors as the map itself (show-don't-tell approach)
- Collapsed by default to avoid cluttering the map view — toggled via a compact button
- Semi-transparent background with backdrop blur so it doesn't fully obscure the map when expanded

### Impact

- No new dependencies or API changes
- All visual element styling references the same constants (`ROOM_TYPE_COLORS`, `FEATURE_COLOR`, `PORTAL_COLOR`, etc.)
- If room type colors or exit styles change in the future, the legend will need to be updated in tandem

---

## 2026-03-29: Exit Pairs View in ZonesDetail.tsx

**By:** Regis (Frontend Dev)

### Decision

The Exits tab now groups bidirectional exits into pairs. One-way exits are shown distinctly with a "+ reverse" action. Expanded rows reveal per-direction details. The "Add Exit" form defaults to creating bidirectional pairs.

### Rationale

- Reduces visual clutter — 10 bidirectional connections show as 10 rows instead of 20
- Matches the mental model zone designers already have (rooms are *connected*, not just exited)
- Consistent with ZoneDesigner's `connectBidirectional` pattern

---

## 2026-03-29T17:17: User Directive — Room Duplication in City Zones

**By:** dkirby-ms (via Copilot)

### Decision

It's totally okay for rooms to be duplicated, especially streets or grid areas that will have many rooms with similar descriptions/names. Repeated room names/descriptions are expected and desirable for urban grid layouts.

### Rationale

User request — captured for team memory. This affects zone design philosophy: cities should feel large and repetitive like real streets, not every room needs a unique name.

---

## 2026-03-29: Room Duplication Pattern for City Zones

**By:** Laeral (Content Designer)  
**Status:** Approved — aligns with user directive (2026-03-29T17:17)

### Decision

City zones should use **repeated display names** for generic connective rooms (streets, alleys, tunnels, passages). Only landmarks, shops, taverns, quest locations, and boss rooms get unique names.

**Slug Convention:** Repeated rooms use `{name-slug}-{n}` pattern for DB primary key uniqueness:
- `narrow-alley-1`, `narrow-alley-2`, `narrow-alley-3`, …
- `sewer-tunnel-1`, `sewer-tunnel-2`, …
- `cobblestone-street-1`, `cobblestone-street-2`, …

**Display Name:** The `name` column in `zone_rooms` repeats freely. Players see "Narrow Alley" multiple times — this is intentional.

**Description Variation:** Each room with a shared name MUST have a unique description with different sensory details. Same name ≠ same text.

**Property Variation:** Rooms with shared names MAY differ in properties (e.g. one "Narrow Alley" has `stench`, another has `water`). This creates mechanical variety.

### When to repeat vs. keep unique

| Repeat | Keep Unique |
|--------|-------------|
| Streets, alleys, passages | Named gates and entries |
| Sewer tunnels, junctions | Boss rooms, quest rooms |
| Rubble fields, ruins | Shops, taverns, inns |
| Tenement blocks, warehouse rows | Plazas, squares with features |
| Generic corridors | NPC locations, chapels |

### Rationale

A city with 100+ unique room names feels like a theme park. A city with repeated street names feels like a real place. The repetition makes the city feel large and grid-like, and makes landmark rooms memorable by contrast.

**Impact on dungeon zones:** This pattern is specific to **city/urban zones**. Dungeon zones like The Warrens should continue using unique room names — every room in a dungeon is a designed encounter space.

**Applies to:** The Siltgate (implemented), and any future city zones.

---

## 2026-03-30T00:40Z: Zone Entry Room Respects targetRoomSlug

**By:** Drizzt (Engine Dev)  
**Date:** 2026-03-30  
**File:** `packages/server/src/rooms/ShardRoom.ts` (onJoin, line ~447)

### What

When a player joins a zone via a cross-zone exit, the server now checks `options['targetRoomSlug']` and places the player in that room if it's valid in the zone's room graph. Falls back to `startRoomId` for direct zone joins or invalid slugs.

### Why

Cross-zone exits (e.g., the-refuge → the-siltgate via a portal targeting `market-square`) were always dropping players at the zone's start room, breaking spatial consistency. The client was already sending the correct target — the server just wasn't reading it.

### Impact

- **Jarlaxle:** Client-side zone transfer already sends `targetRoomSlug` correctly — no client changes needed.
- **Regis:** Zone Designer portal exits with `targetRoomSlug` now actually work end-to-end.
- **Minsc:** Integration tests for cross-zone navigation should verify player lands in the targeted room, not just the zone's start.

---

## 2026-03-30T00:40Z: Input Focus Restoration Pattern

**By:** Regis (Frontend Dev)  
**Date:** 2026-03-30

### What

Added ref-based focus restoration to the command input in `ShardExploration.tsx`. A `useEffect` watches `state.connectionStatus` and calls `inputRef.current?.focus()` (via `requestAnimationFrame`) whenever the connection returns to `'connected'`.

### Why

During zone switches, the input is disabled while `connectionStatus === 'connecting'`. When re-enabled, browser focus is lost. `autoFocus` only fires on mount, not re-enable. This broke the seamless MUD typing experience.

### Impact

- Single file change: `packages/client/src/pages/ShardExploration.tsx`
- No new dependencies or API changes
- Pattern is reusable: any input disabled during async transitions should use ref + useEffect + rAF to restore focus

---

## 2026-03-30T00:40Z: Up/Down Ghost Rooms Are Not Positioned on the Map

**By:** Regis (Frontend Dev)  
**Date:** 2026-03-30  
**Status:** Implemented

### Context

Ghost rooms for up/down exits were being positioned at `parentPos.z ± 1`, inflating floor bounds. This caused all rooms on a floor to show incorrect ↑/↓ indicators and the FloorSelector to show phantom floors.

### Decision

- **Up/down ghost rooms are not given positions.** They exist in `ghostRooms` but have no entry in `positions`, so they don't render or affect floor bounds.
- **RoomNode shows exit-based ↑/↓ badges** (purple, matching inter-floor stroke color) on rooms that have `up` or `down` in their exits. This replaces the old z-level badge that showed on every room of a non-zero floor.
- **Floor bounds are now accurate** — only visited rooms (which get real z-values from `computeLayout` BFS) contribute to min/max floor.

### Impact

- `useExplorationMap.ts` — ghost positioning block for up/down removed
- `RoomNode.tsx` — z-badge replaced with exit-based badges
- `useFloorFilter.ts`, `MapRenderer.tsx`, `MinimapWidget.tsx` — no changes needed
- All 24 computeLayout tests still pass

---

## 2026-03-30T19:15:45Z: User directive — Zone topology constraints for future zones

**By:** dkirby-ms (via Copilot)  
**Date:** 2026-03-30

**Decision:** Zone topology lessons learned from Siltgate layout issues must be captured and applied to all future zone building work. The zone design itself (exit graph) creates unavoidable layout conflicts — 6 topological conflicts and 35+ position collisions in a 136-room zone. Future zones must be designed with layout-algorithm constraints in mind.

**Why:** User request. Zone design is the controllable variable in the layout system; the algorithm is correct. Preventing conflicts requires upfront validation during zone design, not post-hoc fixes after database commit.

**Impact:**
- Zone-topology skill created at `.squad/skills/zone-topology/SKILL.md` — available to all zone designers
- Layout engine constraints documented by Drizzt for reference during design
- Proposed `validateZoneTopology()` API can be wired into admin zone submission flow
- All future zone designs should be validated against the constraint checklist before implementation

**Cross-Team References:**
- **Laeral's Siltgate analysis:** `.squad/decisions/inbox/laeral-siltgate-topology-fixes.md` — identified 6 specific conflicts (Δ=3 to Δ=17) with proposed bridge-room fixes
- **Drizzt's constraint documentation:** `.squad/decisions/inbox/drizzt-layout-constraints.md` — layout algorithm phases, scoring weights, zone design guidelines
- **Engine files:** Zone data at `packages/server/src/db/migrations/004_seed_siltgate.sql`, layout engine at `packages/client/src/map/computeLayout.ts`, tests at `packages/client/src/map/__tests__/computeLayout.test.ts`

---

## 2026-03-30T19:15:45Z: Layout Engine Topological Constraints & Scoring System

**By:** Drizzt (Engine Dev)  
**Date:** 2026-03-30  
**Scope:** `packages/client/src/map/computeLayout.ts` (~2700 lines) — comprehensive reference documentation

**Decision:** Documented the `computeLayout` algorithm's hard and soft constraints, penalty weights, and optimization phases. Zone designers now have clear guidelines for designing topologies that layout cleanly.

**Key Findings:**
- **Topological conflicts are inevitable in cyclic graphs** — each room occupies exactly one grid cell; when two paths assign different ideal cells to the same room, at least one exit becomes non-adjacent or diagonal.
- **Cycle sum constraint:** For every cycle, cardinal direction offsets must sum to (0, 0). Non-zero sums = impossible geometry.
- **Penalty hierarchy:** Direction mismatch (50) > diagonal (20) > distance stretch (1 per cell) > occlusion (3/15)
- **Algorithm phases:** 8 phases from BFS greedy placement through grid expansion and occlusion cleanup

**Zone Design Guidelines from Engine Constraints:**
- Keep cycles short (4–6 rooms ideal; 8+ expect stretch)
- Match path lengths between neighborhoods to avoid conflicting offsets
- Limit cross-neighborhood shortcuts (each shortcut increases cycle length)
- Budget intermediate bridge rooms to absorb grid distance
- Pre-validate cycles with formula: `Σ(direction_offsets) must equal (0, 0)` before submission

**Deliverables:**
- Comprehensive documentation: `.squad/decisions/inbox/drizzt-layout-constraints.md`
- Proposed API: `validateZoneTopology(roomGraph): ValidationResult` for content submission pipeline
- Pre-handoff checklist: Enables designers to self-validate before database commit

**Cross-Team Impact:**
- **Laeral:** Topology constraints inform all future zone design; Siltgate fixes prioritized by Δ severity
- **Bruenor:** Can wire `validateZoneTopology()` into admin zone designer UI
- **Minsc:** Can build integration tests for API validation
- **All zone designers:** Have clear constraint checklist to follow

---

## 2026-03-30T19:15:45Z: Zone-Topology Skill Created

**By:** Laeral (Content Designer)  
**Date:** 2026-03-30  
**Status:** Deployed to team  
**File:** `.squad/skills/zone-topology/SKILL.md`

**Scope:** Comprehensive skill covering grid constraints, conflict patterns, design guidelines, and pre-handoff checklist for zone designers.

**What It Covers:**
1. **Grid Constraint Fundamentals** — Every room occupies exactly one grid cell; for any cycle, cardinal direction offsets must sum to (0, 0)
2. **Conflict Patterns:**
   - Shortcuts: Cross-neighborhood bypasses create non-zero cycle sums
   - Rings: Multi-entry systems (e.g., sewers with two entry points) diverge on opposite ends
   - L-loops: 5-room loops can't fit in 4-cell rectangle; creates topological impossibility
   - Vertical shortcuts: Sewer connections bridging surface and underground create additional paths
3. **Design Guidelines:**
   - Junction density: 4–6 junctions per quarter acceptable; 8+ signals over-connection
   - Shortcut savings: Each shortcut should save 3+ steps minimum (narrow/corridor shortcut at 2 steps doesn't justify conflict budget)
   - Bridge room budgeting: Each Δ=N conflict requires roughly N/2 intermediate rooms
4. **Cycle Validation Formula:** For designers to check their own work before submission
5. **Pre-Handoff Checklist:** Self-validation questionnaire for zone designers

**Siltgate Case Study:**
- 136 rooms, 286 exits
- 6 conflicts identified (Δ=3 to Δ=17)
- 35+ position collisions
- Proposed fixes: 8–9 bridge rooms (zone grows to ~144–145 rooms)
- Fixes prioritized by conflict severity

**Deployment:**
- Skill available to Bruenor for Siltgate implementation work
- Available to all future zone designers (Dune, Elminster, etc.)
- Complements Drizzt's engine constraints documentation

**Team Impact:**
- Prevents recurring topology issues in new zones
- Shifts validation left: catch issues during design, not after commit
- Creates shared vocabulary for zone design discussions (shortcuts, rings, L-loops, etc.)

---

## 2026-03-31T18:30:47Z: User directive — Remove extraction concept, MUD-style death

**By:** dkirby-ms (via Copilot)  
**Date:** 2026-03-31

**Decision:** The extraction mechanic (channeling to leave a zone with loot) is no longer part of the design. The game no longer has an "extraction game" identity.

**What Changed:**
1. **Remove extraction concept:** The extraction mechanic is gone. Players exit zones via normal exits, risking death at any moment.
2. **MUD-style death:** Death is meaningful — players leave a corpse behind containing their equipped gear. Other players or creatures can loot the corpse.
3. **Equipment loss/destruction:** There will be other meaningful ways equipment can be lost or destroyed beyond death (details TBD — the GDD notes this as a design space).
4. **Genre shift:** The game is no longer an "extraction RPG" — it's evolving toward a traditional MUD/MMORPG with meaningful death penalties and gear risk.

**Why:** The game design has evolved away from the extraction genre. Risk and stakes come from death and gear loss mechanics rather than extraction timers and safe-zone returns. MUD-style death (corpse drop, gear loss, corpse runs) is more natural to the text-game medium than channeled extraction rituals. Creates continuous tension and enables emergent gameplay (corpse camping, corpse runs, risk assessment at every fight).

**Impact:**
- GDD.md fully updated: genre reframed, extraction mechanic removed entirely
- ~172 insertions, 81 deletions across 15+ sections
- §6.5 Death & Corpse System added (new)
- §6.6 Equipment Loss & Destruction added (design space open)
- Zone lifecycle and core gameplay loop rewritten
- Roadmap updated: extraction mechanic removed from completed items; Death mechanic, Corpse looting, Death penalty, Corpse recovery added

**Open Design Questions:**
- Corpse persistence duration
- Corpse recovery ("corpse run") mechanics
- Death penalty severity
- Equipment degradation balance

**Code Impact:**
The codebase has an extraction mechanic implemented (multi-tick channel, marked as `[x]` in roadmap). This code is now deprecated by design intent. It should be removed or replaced with death/corpse mechanics when the combat system redesign reaches that phase.

**Decision Status:** Proposed — awaiting review by dkirby-ms.

---

## 2026-03-31T18:31:00Z: GDD update — remove extraction concept entirely, add MUD-style death & corpse system

**By:** Elminster (Lead)  
**Date:** 2026-03-31  
**Scope:** GDD.md only — no code changes  
**Outcome:** SUCCESS

**Changes Summary:**
1. **Genre reframing:** "PvPvE Extraction RPG" → "PvPvE Real-Time MUD · Meaningful Death"
2. **Mechanics removed:** Extraction nodes, extraction ritual, extraction-based gameplay loop, extraction timer framing, `> extract` command, extraction ritual noise value, Extraction Nodes column from zone size table
3. **Mechanics added/reframed:**
   - §6.5 Death & Corpse System (new section) — Corpse drops at death location with non-soulbound gear. Lootable by others. Player respawns at faction stronghold with death debuff. Corpse persistence and recovery are open design questions.
   - §6.6 Equipment Loss & Destruction (new section) — Documents the design space for non-death gear loss: durability breakage, curses, NPC theft, traps, sacrificial mechanics. Details TBD.
   - §2.2 "Adventure Zones" (renamed from Extraction Zones) — Zones are entered/exited via exits. The danger is death, not a timer.
   - §2.3 Zone Lifecycle (rewritten) — Two models: Persistent (always available, respawning content) and Instanced (future, on-demand, optional collapse timer). No extraction in either model.
   - §3 Core Gameplay Loop — Step 6 now "Return or Die." Step 7 is "Debrief." Walking out through an exit is how you leave.
4. **Roadmap updated:** Extraction mechanic removed from completed items; Death mechanic, Corpse looting, Death penalty, Corpse recovery added

**Deliverables:**
- GDD.md (~172 insertions, 81 deletions across 15+ sections)
- Decision record: `.squad/decisions/inbox/elminster-extraction-removal.md`

**Rationale:** MUD-style death (corpse drop, gear loss, corpse runs) is more natural to the text-game medium than channeled extraction rituals. Creates continuous tension and enables emergent gameplay (corpse camping, corpse runs, risk assessment at every fight). Simpler to implement and reason about.

**Decision Status:** Proposed — awaiting review by dkirby-ms.

---

## 2026-03-31T20:05:17Z: GDD-Codebase Gap Analysis & 15-Issue Sprint Plan

**By:** Elminster (Lead/Architect)  
**Date:** 2026-03-31  
**Scope:** Complete audit of codebase vs GDD (extraction removal, biome removal, shard→zone terminology, Refuge repurpose, faction strongholds, death system)  
**Status:** AUDIT COMPLETE — 15 GitHub issues created (#228–#242)  

**Executive Summary:**

Comprehensive audit of codebase against three major GDD revisions: (1) removal of shards/biomes as player-facing concepts, (2) Refuge repurposed as designer hub with faction strongholds as player home, (3) extraction mechanic replaced with MUD-style death. The codebase has deep architectural roots in all three removed concepts. This is not a naming pass — it is architectural.

**Findings Summary:**

- **🔴 Must Change (8 issues):** Extraction system removal, biome type removal, Shardwalker branding, Shardboard UI, ShardRoom architecture, shard-sickness rename, faction strongholds implementation, corpse system implementation
- **🟡 Should Change (14 issues):** Internal "shard" terminology (~500 occurrences), player-facing flavor text, DB column renames, lifecycle decoupling, Refuge hub repurposing, NPC spawn routing, admin UI, leaderboard metrics, chat context, lore item names
- **🟢 Nice to Have (1 issue):** Lore item name updates

**Issues Created (Tracked in #228):**
- Sprint 1: #228–#231 (Foundation: extraction & biome removal)
- Sprint 2: #232–#235 (Internal naming: shard → zone)
- Sprint 3: #236–#239 (Game mechanics: faction strongholds & death)
- Sprint 4: #240–#242 (Schema migrations & polish)

**Cross-References & Dependencies:**
- Master tracker: Issue #228 with checklist, links to all 15 issues
- Sprint dependencies: S2 depends on S1, S3 on S1–S2, S4 on S1–S3
- Labels: `gdd-alignment`, `priority:must/should/nice-to-have`, `sprint:1/2/3/4`

**Rationale:**

The three GDD revisions represent a maturation of design intent: away from extraction-based genre mechanics toward traditional MUD/MMORPG with meaningful death and faction-based home systems. Aligning the codebase with this intent requires architectural changes, not cosmetic renames. The 15 issues are sequenced to allow parallel work within sprints while respecting inter-sprint dependencies.

**Next Steps:**

1. Review and approve #228 master tracker and child issues
2. Assign issues to team members per sprint capacity
3. Begin Sprint 1 work: extraction system removal and biome type deletion
4. DB migrations deferred to Sprint 4 to avoid blocking other work
