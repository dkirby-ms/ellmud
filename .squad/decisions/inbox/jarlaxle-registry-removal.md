# Decision: Static Item Registry Removed

**Author:** Jarlaxle
**Date:** 2025-07-17
**Status:** Implemented

## What Changed

All 34 static `ItemDefinition` constants, the `ALL_ITEMS` array, and the `ITEM_REGISTRY` Map have been removed from `packages/server/src/items/registry.ts`. The lookup functions (`getItemDefinition`, `getAllItemDefinitions`, `getItemsByType`, `getItemsByTier`) now delegate exclusively to `ContentRegistry` (DB-backed). A new `getItemDefinitionsMap()` function replaces direct `ITEM_REGISTRY` usage in call sites that need a `Map<string, ItemDefinition>`.

## Why

No deployments without the database. The static fallback created a dual-source-of-truth problem — item data could drift between code and DB. ContentRegistry is now canonical.

## Impact

- **Production code:** Fully updated. Zero type errors.
- **Test files need updating (Minsc):** Three test files import removed constants:
  - `__tests__/items.test.ts`
  - `__tests__/container-commands.test.ts`
  - `__tests__/container-items.test.ts`
- **Seed data:** Verified complete in migrations 002 and 015.
- **Runtime requirement:** ContentRegistry MUST be initialized before any item lookup. `requireRegistry()` throws a clear error if not.
