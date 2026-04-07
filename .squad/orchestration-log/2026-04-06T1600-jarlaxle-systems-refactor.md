# Jarlaxle — Character Creation & Reputation System (2026-04-06T16:00)

**Status:** Completed (Background)  
**Timestamp:** 2026-04-06T16:00 UTC  
**Decision:** `.squad/decisions/inbox/jarlaxle-reputation-system.md`

## Summary

Built migration 021 and refactored character creation system. Players now choose a starting zone instead of a faction. Faction reputation earned through gameplay, not assigned at creation. Character creation API and shared types updated. Schema changes include new `starting_zone_slug` column, nullable `faction_slug`, and new `character_reputation` table.

## Scope

- **Migration 021:** `characters.starting_zone_slug` column (NOT NULL, backfilled from faction), `character_reputation` table with (character_id, faction_slug, reputation) UNIQUE constraint
- **API contract:** `POST /api/characters` now accepts `{ name, startingZoneSlug }`, resolves to valid zones (the-reliquary, the-bloom-observatory, the-carrion-court)
- **Spawn-zone API:** `GET /api/spawn-zone` resolves from character's `starting_zone_slug`, falls back to faction membership for legacy data
- **Shared types:** `CharacterSummary` updated with `startingZoneSlug`, `startingZoneName`; `factionSlug`, `factionName` now nullable. Both occurrences in `packages/shared/src/index.ts` updated. `CreateCharacterRequest` uses `startingZoneSlug` instead of `factionSlug`

## Team Impact

- **Regis:** CharacterSelect.tsx UI already updated with zone picker (see regis-starting-zone-picker.md)
- **Drizzt:** Spawn-zone API now reads from character repository as primary path
- **Minsc:** Admin tools now have `startingZoneSlug` field; `factionSlug` may be null for new characters
- **Laeral:** No impact — creature/item systems untouched

## Next Steps

- Deploy migration 021 to staging/production
- Monitor legacy character data backfill
