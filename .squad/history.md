# Project Context

- **Owner:** {user name}
- **Project:** {project description}
- **Stack:** {languages, frameworks, tools}
- **Created:** {timestamp}

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->

---

### 2026-03-26T13:07:32Z: All PG Persistence Gaps Closed

**By:** Drizzt + Jarlaxle (Engine + Systems Dev)  
**Date:** 2026-03-26  
**Status:** Completed

## Context

The server persisted some data to PostgreSQL (stash, loadout) but left 4 critical gaps:
- Player profile fields (equipment, maxCarryWeight) — reverted on restart
- Auth tokens — in-memory only, lost on restart  
- Shard sickness death counts — in-memory only, violated "deaths always count" directive

## What

**Phase 2 (Drizzt):** Created `player_profile` table (migration 014) to persist equipment and maxCarryWeight alongside player_skills. Extended PgPlayerProfileRepository to query/write both tables in a single transaction.

**Phase 3+4 (Jarlaxle):** Created `auth_tokens` table (migration 015, TEXT PK) for session tokens. Created `player_shard_sickness` table (migration 016) with death_count tracking. Implemented PgTokenStore and PgShardSicknessStore with provider wiring, updated ShardRoom and barrel exports for consistent module references.

## Impact

- **0 persistence gaps remaining.** All entity types (stash, loadout, profile, tokens, sickness) now survive server restart when DATABASE_URL is set.
- **Provider pattern consistent** across all 5 stores (Stash, Loadout, Profile, TokenStore, SicknessDess) — all behind USE_PG flag with in-memory fallback.
- **Schema validation test** updated for composite PKs (player_loadout) and TEXT PKs (auth_tokens).
- **Build clean, 1775 tests pass.** 31 new tests added across both phases (8 profile, 15 token, 8 sickness).
- **Migrations applied to running DB.** Deployments can now restart without data loss.

## Learnings

- **JSONB for variable-schema fields** (equipment metadata) is cleaner than sentinel rows or EAV patterns.
- **DELETE on reset** (shard sickness) avoids orphan rows better than setting count=0.
- **TEXT primary key** appropriate for externally-generated tokens (not UUID domain entities).
- **Barrel exports** (systems/index.ts) keep module coupling loose and testable.
