# Decision: Fix creature reroll stats shape mismatch

**Author:** Jarlaxle (Systems Dev)
**Date:** 2025-07-14
**File:** `packages/server/src/admin/simulate/simulate-routes.ts`

## Problem

The `CreatureDefinition` interface in simulate-routes expected a **nested** `stats` object (`creature.stats.maxHp`), but `PgCreatureDefinitionsStore.rowToEntity()` returns a **flat** entity (`creature.maxHp`). This caused `creature.stats` to always be `undefined`, triggering the "Creature has no stats defined" 400 error on every reroll request.

## Fix

- Changed the `CreatureDefinition` interface to use flat properties (`maxHp`, `attack`, `defence`, `armour`) matching the actual entity shape from the store.
- Construct a `baseline` stats object from those flat properties before passing to `rollCreatureStats()`.
- Updated the guard check to validate the flat properties instead of `creature.stats`.
- Introduced a `BaselineStats` interface for the `rollCreatureStats` function parameter.

## Why this approach

The store's flat shape is used consistently elsewhere in the admin system. Changing the store to nest stats would ripple across the admin UI and other routes. Adapting at the simulate boundary is the minimal, safe fix.
