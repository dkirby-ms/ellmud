# Regis — Character Creation UI Refactor (2026-04-06T16:00)

**Status:** Completed (Background)  
**Timestamp:** 2026-04-06T16:00 UTC  
**Decision:** `.squad/decisions/inbox/regis-starting-zone-picker.md`

## Summary

Replaced faction picker with starting zone picker in CharacterSelect.tsx. Updated API calls to use `startingZoneSlug` instead of `factionSlug`. Updated shared types in both locations (`packages/shared/src/index.ts`). Updated and verified character creation tests.

## Scope

- **CharacterSelect.tsx:** `FACTIONS` → `STARTING_ZONES` (the-reliquary, the-bloom-observatory, the-carrion-court). Label "Choose Your Faction" → "Where Do You Wake Up?"
- **API service:** `createCharacter` now sends `{ name, startingZoneSlug }` instead of `{ name, factionSlug }`
- **Shared types (both occurrences):** `CharacterSummary` adds `startingZoneSlug`, `startingZoneName`; `factionSlug`, `factionName` now nullable. `CreateCharacterRequest` uses `startingZoneSlug`
- **Character cards:** Show starting zone name (📍 marker); faction only displayed if non-null (earned later)
- **Tests:** Updated to verify server accepts `startingZoneSlug` param and sets `factionSlug: null`

## Team Impact

- **Jarlaxle/Drizzt:** Server-side InMemoryCharacterRepository.create() already accepts `startingZoneSlug` as 3rd param
- **Minsc:** Check for null before rendering faction info in admin pages
- **Volo:** Zone descriptions in STARTING_ZONES hardcoded in client — coordinate if lore changes

## Next Steps

- Deploy UI changes to staging/production with migration 021
