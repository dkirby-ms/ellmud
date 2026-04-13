# jarlaxle — History

**For a quick overview, see [summary.md](./summary.md)**

---

## Core Context

**Role:** AI/LLM Integration

**Key Focus Areas:**
- Core responsibilities for this agent
- Integration with wider system architecture  
- Test coverage and reliability
- Documentation and knowledge transfer

**Recent Work (Last 30 Lines):**

- Removed ~115 lines of complex group loot distribution logic from ZoneRoom.syncCreaturesAfterCombat()
- Extended `open` and `take` commands to support room containers in addition to inventory containers
- Added `itemId` field to LootItem interface to map loot instances to item definition IDs
- Corpse items created with containerContents array containing all generated loot
- Created test fixtures: waterlogged_bone, revenant_essence
- Updated container-related tests to cover corpse scenarios

### Key Changes
- **ZoneRoom.ts**: Corpse creation logic (~35 lines) replacing group distribution (~115 lines removed)
- **open.ts**: Extended to check room items when opening containers
- **take.ts**: Extended to support `take X from Y` where Y is a room container
- **loot.ts**: Updated to reference containerContents rather than direct item distribution
- **item-fixtures.ts**: Added new test item definitions

### Test Results
- All 3480+ tests passing
- 29 corpse-specific tests from Minsc's TDD suite all passing
- Zero regressions

### Collaboration
- Worked with Minsc (Tester) on spec-based test coverage
- Minsc wrote tests in parallel to guide implementation
- Tests validated all functionality as features were implemented
- Tests serve as regression protection for future changes

### Learnings
- Reusing container infrastructure simpler than custom loot distribution logic
- Player agency improves with explicit take commands over auto-distribution
- Corpse item pattern aligns with thematic game feel (visible death consequences)


### 2026-04-13: Creature Reroll Stats Shape Fix
**Status:** ✅ Complete

📌 Team update (2026-04-13T1145Z): Fix creature reroll stats shape mismatch — CreatureDefinition interface now uses flat properties (maxHp, attack, defence, armour) matching store entity shape. Decided by Jarlaxle.

**Problem:** Simulate-routes.ts CreatureDefinition interface expected nested stats object (`creature.stats.maxHp`), but PgCreatureDefinitionsStore.rowToEntity() returns flat entity (`creature.maxHp`). Result: creature.stats was always undefined, triggering "no stats defined" 400 error on reroll.

**Solution:** 
- Changed CreatureDefinition to use flat properties
- Construct baseline stats object from those properties before passing to rollCreatureStats()
- Updated guard check to validate flat properties

**Why This Approach:**
The store's flat shape is used consistently elsewhere in the admin system. Changing the store to nest stats would ripple across admin UI and other routes. Adapting at the simulate boundary is minimal and safe.

**Impact:** Reroll endpoint now works without errors.

---

## Detailed History

Full session logs and dated entries have been moved to `history-archive.md` to keep this file compact.
