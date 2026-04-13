# elminster — History

**For a quick overview, see [summary.md](./summary.md)**

---

## Core Context

**Role:** Workflow Engine

**Key Focus Areas:**
- Core responsibilities for this agent
- Integration with wider system architecture  
- Test coverage and reliability
- Documentation and knowledge transfer

**Recent Work (Last 30 Lines):**


---

**Decisions Logged to:** `.squad/decisions/inbox/elminster-research-417-418.md`
**GitHub Comments:** Both issues annotated with research summary and architect recommendations
**Labels Updated:** Both issues transitioned from go:needs-research to go:ready, assigned squad member labels

**Process Notes:**
- Directives review confirmed inventory/stash separation and user flags architecture fit both issues
- No conflicts with existing architecture patterns
- Both issues are self-contained with clear acceptance criteria
- No cross-system dependencies or blocking work identified

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


---

## Learnings

### 2025-01-23: Permadeath System Design — Three Options Proposed

**Task:** Analyze current death/combat/corpse systems and design permadeath feature for Ellmud.

**Context:** User requested permadeath as a new feature. Performed comprehensive analysis of:
- GDD §6.5-6.8 (death, downing, corpse systems)
- Current death flow: downing → bleed-out → corpse drop → respawn with death penalty
- Data model: `player_identities` → `players` → `characters` (character soft-deletion supported)
- Death tracking: `player_death_penalty` table (death_count, last_death_at)
- Soulbound items: preserved on death, never dropped in corpse
- Zone lifecycle: persistent (always up, respawn on schedule) vs. instanced (collapse timer, corpse lost on collapse)
- Extraction loop: walk out alive to keep gear, die to lose it

**Key Files Analyzed:**
- GDD.md (extraction, death, permadeath mentions)
- packages/server/src/combat/CombatSystem.ts (defeat detection)
- packages/server/src/rooms/ZoneRoom.ts:handlePlayerDeath() (death flow orchestration)
- packages/server/src/systems/CorpseSystem.ts (lootable corpse creation/TTL)
- packages/server/src/systems/DeathPenalty.ts (death count tracking, debuff stacking)
- packages/server/src/state/PlayerState.ts (in-memory player state, inventory, equipment)
- packages/server/src/db/migrations/001_schema.sql (players, characters, player_death_penalty tables)

**Design Proposal:** Three options presented in `.squad/decisions/inbox/elminster-permadeath-design.md`:
1. **Run-Based Permadeath (Roguelike):** Lose all inventory/equipment on death, keep stash. Already implemented — no code change.
2. **Character Permadeath with Account Persistence (RECOMMENDED):** Opt-in per character, character deleted after N deaths (configurable threshold). Account/reputation persists. Minimal schema change (`permadeath_enabled`, `permadeath_threshold` columns on `characters`). Medium implementation cost (server + client UI).
3. **Instanced-Zone Permadeath (Gauntlet):** Permadeath only in hardcore zones. High implementation cost, bifurcates zone design.

**Recommendation:** Option 2 — strikes balance between meaningful stakes and respecting player time. Opt-in design doesn't disrupt casual players. Opens design space for high-risk/high-reward modes (titles, leaderboards, cosmetics).

**Blocked on:** Dale's decision on threshold values (1/3/5 deaths?) and opt-in timing (creation only, or mid-game ritual?).

**Architecture Notes:**
- Permadeath must respect extraction loop (death = corpse drop for others to loot)
- Death penalty system already tracks `death_count` per character (foundation in place)
- Character soft-deletion (`deleted_at`, `is_active=false`) already supported
- Soulbound items should remain soulbound in permadeath (preserve quest rewards across character deaths)
- Instance collapse death should count toward permadeath threshold (no free passes)

**Process Notes:**
- Analyzed 9 key files across GDD, combat, death, corpse, player state, DB schema
- Cross-referenced directives (inventory/stash separation, container-based corpses)
- Identified security edge cases (disconnect death, instance collapse, griefing)
- Proposed 3-phase rollout: beta → tuning → public announcement

### 2026-07-23: Code Review — PR #449 ANSI Formatting Toolbar (APPROVED)

**Task:** Review PR #449 (`squad/admin-ansi-toolbar` → `dev`) — ANSI formatting toolbar for admin content editors.

**Verdict: APPROVE — Clean extraction, consistent migration, zero type errors.**

**New components:** `AnsiToolbar` wraps selected text in ANSI tags via textarea ref; `AnsiTextarea` composes toolbar + textarea + collapsible preview. Both are well-structured with clear props interfaces. Toolbar cursor restoration uses `requestAnimationFrame` correctly.

**Migration:** All 7 admin detail pages (Creatures, Factions, Items, Modifiers, Narrative, Rooms, Skills) consistently replaced `textarea` + `AnsiPreview` with single `AnsiTextarea`. onChange signatures updated from `(e) => e.target.value` to `(v) => v`. No missed imports, no leftover Color Reference code. CreatureDetail's duplicate Live Preview panel correctly removed.

**AnsiPreview:** Slimmed to read-only. Palette/clipboard code removed. Currently has zero imports — effectively dead code but harmless to keep for future read-only contexts.

**Observations:** NarrativeDetail dialogue lines pass custom `className` with `rounded-none`, matching AnsiTextarea's default — consistent. Template textarea passes custom `style` for `lineHeight`. Both work correctly with the passthrough props.

**Type check:** `tsc --noEmit` passes clean on the branch.

---

### 2026-04-13: Code Review — PR #449 AnsiToolbar + AnsiTextarea (APPROVED)

**Task:** Review PR #449 (`squad/admin-ansi-toolbar` → `dev`) — ANSI toolbar component build + admin page consolidation.

**Verdict: APPROVE — Clean extraction, consistent migration, no regressions.**

**New components:** `AnsiToolbar` component inserts/wraps ANSI tags at textarea cursor via ref. `AnsiTextarea` composite (toolbar + textarea + preview) as canonical pattern for ANSI-editable fields. Both well-structured, clear props, proper React patterns.

**Migration:** All 7 admin detail pages consistently migrated to use `AnsiTextarea`. Old `<textarea> + <AnsiPreview>` pairs removed. CreatureDetail duplicate Live Preview panel correctly removed. `AnsiPreview` slimmed to read-only (Color Reference code removed). Zero missed imports, no orphaned code.

**Type check:** `tsc --noEmit` clean. Backward-compatible with read-only AnsiPreview contexts (not currently used, but available for future).

**Decision logged to:** `.squad/decisions.md` (merged from inbox 2026-04-13T00:28:21Z)

### 2026-04-13: Code Review — Publish Refactor + #445 Exit Icons (APPROVED)

**Task:** Review branch `squad/445-zone-designer-exit-icons` and `squad/publish-refactor` containing two pieces of work: (1) publish refactor removing "review" status from all admin pages, (2) #445 clickable up/down exit icons with connected exit highlighting.

**Verdict: APPROVE — Clean, consistent, no issues found.**

**Publish refactor:** All 9 affected files updated uniformly. Status type narrowed from `draft|review|published|deprecated` to `draft|published|deprecated` across CreaturesList, ItemsList, and all detail pages. AuditLog filter updated. Grep confirms zero remaining "review" status references in client or server code. Implementation of user directive: simplify content workflow from draft → review → published to draft → published.

**#445 Exit icons:** ZoneRoomNode up/down spans now clickable with `e.stopPropagation()`, hover effects, and exit-count tooltips. ZoneExitEdge supports new `highlighted` data prop with cyan glow. ZoneDesigner wires `highlightedExitIds` state correctly — populated on room selection, cleared on all deselection paths (ESC, canvas click, exit click). Proper `useCallback` and `useMemo` dependency arrays. Edge cases handled: single/multiple up-down exits, all deselection paths working.

**Decision logged to:** `.squad/decisions.md` (inbox entries merged 2026-04-13T00:05Z)

**Merged:** Both commits squash-merged to dev via PR #447 (#446) and PR #448 (#445 + publish refactor).

### 2026-04-13: Permadeath System Design Analysis (DELIVERED)

**Task:** Architect permadeath system with three design options and recommendation.

**Outcome:** ✅ DELIVERED — Comprehensive design proposal; user direction received for system-wide reset model (design pivoted from recommendation).

**Deliverable:** Permadeath Design Proposal analyzed three approaches:
- **Option 1:** Run-based permadeath (stash-safe extraction, no character deletion)
- **Option 2:** Character permadeath with account persistence (opt-in per character, threshold-based) ⭐ RECOMMENDED
- **Option 3:** Softer permadeath with inventory reset only

**User Pivot:** User request changed design from per-character opt-in to server-wide reset model: simple boolean toggle, no threshold, every death resets character (not deletes), stash preserved, death count persists.

**Impact:** Triggered implementation iterations across Drizzt (DB schema), Jarlaxle (death handler x2), Regis (UI messaging x2), Minsc (tests x2). Design document archived to decisions.md.

---

## Detailed History

Full session logs and dated entries have been moved to `history-archive.md` to keep this file compact.
