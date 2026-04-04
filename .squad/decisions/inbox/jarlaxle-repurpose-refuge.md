### 2026-04-01: Repurpose Refuge as Designer/Debug Hub
**By:** Jarlaxle (Systems Dev)
**Issue:** #239

## Decision
The Refuge zone category changed from `hub` to `dev`. The shared `ZoneDefinition.category` type now includes `'dev'` as a valid value. The `dev` category is treated identically to `hub`/`social` in the ZoneRoom tick loop — no collapse timer, no creature AI, no combat resolution. Faction strongholds (#236) are now the primary player hubs.

## Rationale
With faction strongholds serving as the real player hubs, the Refuge is no longer the canonical starting area for most players. Rather than remove it (it still serves as the fallback for unaffiliated players), it's repurposed as a designer/debug hub where game systems can be tested safely. The `dev` category signals this intent clearly in the DB and shared types.

## Impact
- **Shared types:** `ZoneDefinition.category` gains `'dev'` — any code that exhaustively switches on category needs updating
- **DB seed:** Refuge zone row changes category column value; requires migration re-run on existing databases
- **Server:** `isNonCombatZone` in ZoneRoom now includes `'dev'` — dev zones are safe from combat/collapse
- **Client:** Refuge.tsx descriptions updated but file not renamed (still functional as fallback)
- **Tests:** Faction-stronghold tests updated to seed Refuge as `dev`; test helpers accept `'dev'` category
