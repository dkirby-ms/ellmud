# Decision: Potable Water Economy

**Author:** Laeral (Content Designer)
**Date:** 2025-07-25
**Requested by:** dkirby-ms
**Status:** DRAFT — awaiting team review

---

## Summary

The game's currency is **potable water**, measured in **draws**. This replaces the existing `gold` column concept from migration 016. Water is heavy, consumable, and universally needed — a survival currency grounded in the Gulf Coast setting.

## Key Design Points

1. **Unit:** The "draw" (~1 cup of clean water). 10 draws = a day's hydration.
2. **Weight:** Water has encumbrance. Wealth = physical burden. Rich players are slower.
3. **Consumable:** Players can drink their savings. Desperation mechanic — survival and commerce share the same resource.
4. **Faction roles:**
   - Urnkeepers **produce** water (filtration at the Reliquary)
   - Tidereaders **discover** water (spring locations, water chemistry knowledge)
   - Silt Traders **distribute** water (trade routes, brokerage, market control)
5. **Cisterns:** Faction strongholds have water cisterns (safe stash for currency). Faction-locked.
6. **Inn cost:** 10 draws for non-faction guests (replaces 10 gold).

## Backend Action Required

- Migration 016 added `gold INTEGER` column to `characters` table. This needs renaming to `water` or `draws` in a future migration.
- All game logic, commands, and UI referencing "gold" should update to water/draws terminology.
- The underlying mechanics (integer column, cost deduction) remain the same — this is a naming/theming change.

## Document Location

Full design written into `docs/thematic-direction.md`, Section 8.

## Rationale

- Directly tied to Gulf Coast setting (brackish water everywhere, clean water scarce)
- Creates weight-based inventory tension (Caves of Qud inspiration)
- Consumable currency adds desperation mechanic absent from abstract money systems
- Faction economic roles create natural interdependence and conflict
- Grounded in real-world water scarcity issues of the Louisiana/Mississippi coast
