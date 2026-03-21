# Wave 2: Schema & Test Infrastructure

**Date:** 2026-03-19  
**Time Range:** 14:30–14:53 (Coordinating Jarlaxle + Minsc completions)

## Summary

Wave 2 delivered PostgreSQL schema foundation and comprehensive test infrastructure:
- **Jarlaxle**: 5 migrations + typed schema + connection pool (Commit 5ef7fe2)
- **Minsc**: Test helpers + 56 tests + coverage config (Commit de1fbaf)
- **2 decision records** merged to canonical decisions.md

Ready for Wave 3 networking/state sync work.

---

## Jarlaxle: Issue #3 — PostgreSQL Schema

**Outcome:** ✅ SUCCESS

### Deliverables

| Component | Status |
|-----------|--------|
| 5 migration files (001–005) | ✅ |
| TypeScript type definitions (types.ts) | ✅ |
| Connection pool + Knex setup (index.ts) | ✅ |
| `pg` dependency | ✅ |
| GDD-accurate data (factions, skills) | ✅ |
| OAuth identity normalization | ✅ |

### GDD Compliance

- **Faction names** (Issue #3 vs. GDD §9.4): Used GDD-canonical names (Ironwright Compact, Veil Cartographers, Scarlet Ledger) over issue text paraphrasing
- **Skill categories** (GDD §7.1): Six categories (combat, defence, survival, subterfuge, awareness, social) not four
- **Decision**: GDD is source of truth for all game data

### Files

```
packages/server/src/db/
├── migrations/
│   ├── 001_init_schema.ts
│   ├── 002_identity.ts
│   ├── 003_character_data.ts
│   ├── 004_faction_data.ts
│   └── 005_skill_data.ts
├── index.ts
└── types.ts
```

### Commit

- **SHA**: 5ef7fe2
- **Message**: `feat(db): PostgreSQL schema with migrations, types, and connection pool (Issue #3)`

---

## Minsc: Issue #19 — Test Infrastructure

**Outcome:** ✅ SUCCESS

### Deliverables

| Area | Before | After | Status |
|------|--------|-------|--------|
| Test count (server) | 5 | 42 | ✅ |
| Test count (shared) | 0 | 19 | ✅ |
| Coverage config | None | 80% threshold | ✅ |
| Test helpers | None | 3 helpers + Colyseus patterns | ✅ |
| Vitest configs | Partial | 3 complete configs | ✅ |

### Test Patterns Established

1. **One test server per file** — Colyseus port binding (2568) prevents parallelism
2. **`fileParallelism: false`** — Server vitest.config.ts
3. **Polling helper** — `waitUntil()` for state transitions (not fixed delays)
4. **@colyseus/sdk devDependency** — Added (not declared upstream)

### Files

```
packages/server/
├── test/
│   ├── helpers/
│   │   ├── test-client.ts
│   │   ├── test-fixtures.ts
│   │   └── message-collector.ts
│   └── [5 test files]
├── vitest.config.ts
└── package.json (updated)

packages/shared/
├── vitest.config.ts
└── test/ [expanded]

packages/client/
└── vitest.config.ts
```

### Commit

- **SHA**: de1fbaf
- **Message**: `test: Colyseus test infrastructure + 56 tests with helpers (Issue #19)`

---

## Decisions Merged

2 decision records added to `.squad/decisions/decisions.md`:

1. **jarlaxle-gdd-names-canonical.md** → GDD is canonical for faction/skill names over issue paraphrasing
2. **minsc-colyseus-test-architecture.md** → Test server patterns (one per file, polling, fileParallelism: false)

---

## What's Next (Wave 3)

- [ ] Drizzt: Room/State sync logic (Issue #4)
- [ ] Elminster: Client connecting/joining (Issue #5)
- [ ] Volo: Chat/broadcast (Issue #6)

---

_Scribed by Copilot_
