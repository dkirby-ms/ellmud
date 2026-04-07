# Content Store Scoping Session Log
**Date:** 2026-03-26T15:45  
**Agent:** Elminster (Lead/Architect)  

## Session Summary

Elminster completed a full architectural scoping and design review of the admin console content management system migration from generic JSONB storage to dedicated schemas.

### Scope: 9 Entity Types Audited

Examined each content type for complexity, dependencies, and migration effort:
- Items (already migrated — reference implementation)
- Creatures, Biomes, Modifiers, Narrative, Skills, Loot Tables, Factions, Rooms

### Key Findings

**Problem Statement:** Generic `content_definitions` table with discriminator + JSONB works for prototyping but prevents schema evolution, type safety, and query optimization.

**Solution:** Follow the pattern established by PgItemDefinitionsStore — dedicated table + store class for each entity type.

**Critical Constraint:** Factions have dual presence in DB (player system + admin content system). Must reconcile before character system can reference them.

### Deliverable: Migration Plan

3-phase implementation strategy with:
- 9 detailed architectural decisions
- Complexity-based prioritization
- Risk mitigation approaches
- Success metrics
- Open questions for team review

**Total Effort:** 50 hours estimated across all 8 remaining entity types (items already complete).

### Team Impact

- **Admin UI:** No changes required (stores implement common interface)
- **Developers:** Pattern is clear, repeatable, low risk
- **Database:** Type safety, query optimization, independent schema evolution enabled
- **Future:** Schema flexibility maintained (can promote JSONB keys to columns later if needed)
