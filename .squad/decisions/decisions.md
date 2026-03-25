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
