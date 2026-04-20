# bruenor — History

**For a quick overview, see [summary.md](./summary.md)**

---

### 2026-04-20: Creature ANSI Color Migration (023)

**Status:** ✅ Complete — Merged to `.squad/decisions/decisions.md`

**Decision:** Added ANSI color tags to all creature room_description fields via SQL migration 023
- **Aggressive creatures** (`aggressive = true`): Wrapped in `[bright-red]...[/bright-red]`
- **Passive creatures** (`aggressive = false`): Wrapped in `[bright-cyan]...[/bright-cyan]`

**Rationale:** Per Laeral's design spec, visual differentiation helps players immediately identify threat level when entering a room. Tags applied at data layer, parsed client-side by existing ANSI parser.

**Files Changed:**
- `packages/server/src/db/migrations/023_creature_description_colors.sql` — New migration
- `packages/server/src/__tests__/creature-appearance.test.ts` — Updated test assertions

**Test Results:** All 77 creature-related tests pass ✓

**Implementation Notes:**
- SQL pattern uses string concatenation for efficient single-pass UPDATE
- No hardcoded creature definitions in TypeScript (all database-driven)
- No changes to room descriptions or item descriptions (creatures only)

**Orchestration Status:** Logged to `.squad/decisions/decisions.md`

---

## Core Context

**Role:** Documentation

**Key Focus Areas:**
- Core responsibilities for this agent
- Integration with wider system architecture  
- Test coverage and reliability
- Documentation and knowledge transfer

**Recent Work (Last 30 Lines):**

- **SQL generation:** Built Node.js parser to extract creature data from markdown → JSON, then generate SQL inserts matching the exact pattern from 002_seed_content.sql.
- **Validation:** Verified all 253 unique loot item IDs in creature loot_table JSONB arrays have corresponding item definitions (either existing or new).
- **Pattern compliance:**
  - Followed exact column order from 002_seed_content.sql
  - `loot_table` is JSONB: `'[{"itemId":"some_item","dropWeight":80}]'::jsonb`
  - `preferred_rooms` and `forbidden_rooms` are TEXT arrays: `'{corridor,dead_end}'`
  - `slug` = `type` (snake_case) for all creatures
  - `idle_ticks_min/max` calculated with 10x multiplier pattern from 002
- **ANSI color migration (023):** ASSIGNED — Add [bright-red] tags for aggressive creatures and [bright-cyan] for passive creatures. Update all 86 creature room_descriptions across migrations 002, 011, 022. Update test assertions to expect new colored output.
- **Branch:** `squad/391-bestiary-seed`
- **PR:** #399 to dev
- **Files:** 1 new migration file, 685 lines

**Learnings:**
- **Database-driven content is the correct approach** — TypeScript templates were legacy fallback pattern
- SQL migration files are the source of truth for creatures, not TypeScript template files
- When generating large SQL migrations from design docs, parse to JSON first for validation, then generate SQL
- Always verify loot item IDs exist before referencing them in JSONB loot tables
- Use `ON CONFLICT DO NOTHING` for idempotent migrations that might overlap with existing seed data
- Node.js string literal escaping: `str.replace(/'/g, "''"` for SQL single-quote escaping
- **ANSI color migration (023):** Added [bright-red] tags for aggressive creatures and [bright-cyan] for passive creatures. Used UPDATE with string concatenation (`'[bright-red]' || room_description || '[/bright-red]'`) to wrap existing descriptions. Test assertions updated to match new colored output.

### Container Items Implementation (2025-07-24)
- **PR:** #430 (squad/container-items → dev)
- **File:** `packages/server/src/items/registry.ts` — added 6 new container ItemDefinitions
- **Items:** Munitions Wrap (sturdy), Ironbound Coffer (refined), Salvager's Haversack (refined), Warden's Lockbox (masterwork), Fleshknit Satchel (masterwork), Hollow of the Forgotten (anomalous)
- **Pattern:** Container items use `type: 'container'`, `baseStats: {}`, `baseDurability: null`, plus `containerProperties` with maxSlots, optional maxWeight, optional carryBonus, optional allowedItemTypes
- **ANSI tags:** Name/description fields use bracket syntax `[bold]`, `[dim]`, `[cyan]`, `[magenta]`, `[yellow]`, `[reset]` — higher-tier items get colored names
- **Omitting maxWeight:** When `maxWeight` is not set in containerProperties, no weight limit is enforced (used for anomalous-tier Hollow)
- **Registry pattern:** Export as UPPER_SNAKE_CASE constant, add to ALL_ITEMS array — both static map and dynamic ContentRegistry use this
- **Tests:** Server test suite has 137 files / 2915 tests; takes ~8 minutes to run


---

## Detailed History

Full session logs and dated entries have been moved to `history-archive.md` to keep this file compact.
