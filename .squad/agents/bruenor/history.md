# bruenor — History

**For a quick overview, see [summary.md](./summary.md)**

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
