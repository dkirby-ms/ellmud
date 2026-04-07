# Content Store Refactor Scoping — Elminster Spawn
**Date:** 2026-03-26T15:45  
**Agent:** Elminster (Lead/Architect)  
**Mode:** Background  
**Status:** Completed  

## Scope Summary

Elminster conducted a comprehensive audit of the admin console content store architecture to determine refactoring scope for migrating from a generic `content_definitions` table to dedicated schemas per entity type.

### Audit Results

- **Entity types audited:** 9 types (items, creatures, biomes, modifiers, skills, loot-tables, factions, rooms, narrative)
- **Table analyzed:** `content_definitions` with JSONB `data` column and `entity_type` discriminator
- **Data freshness assessment:** Items table had 18 seeded rows vs 40+ in code registry (staleness confirmed)
- **Type safety assessment:** JSONB bypasses schema validation; no column-level constraints
- **Query performance assessment:** No indexes on JSONB keys; all queries scan full JSON blob

### Reference Implementation Validated

- **`PgItemDefinitionsStore`** successfully migrated items entity type
- Pattern: Dedicated table + store class implementing `IContentStore<ContentEntity>`
- Admin UI continues to work unchanged (zero client changes required)
- Proves feasibility for remaining 8 entity types

### Migration Plan Produced

**3-Phase Implementation Strategy (50 hours total):**

1. **Phase 1 (Quick Wins — 14.5h):** Biomes, Modifiers, Narrative
   - Simple flat schemas
   - Establishes pattern for team
   - Can run in parallel
   
2. **Phase 2 (High Impact — 20h):** Creatures, Factions
   - Creatures = highest priority (game content foundation)
   - Factions = requires table reconciliation
   
3. **Phase 3 (Low Priority — 15.5h):** Skills, Loot Tables, Rooms
   - Empty or low-usage tables
   - Defer until admin console proves necessary

### Critical Issue Identified

**Faction Table Conflict:**
- Migration 004 created `factions` table (3 rows: Ironwright, Veil, Scarlet) for player membership
- Migration 008 seeded `content_definitions` with 3 different factions (ironhearth, veilwalkers, ashborn)
- Two systems, different schemas, potential confusion
- **Resolution:** Option A recommended — merge both sets into single `faction_definitions` table with unified schema

### Design Decisions Captured

8 key architectural decisions documented:
1. Migrate from generic content_definitions to dedicated tables
2. Store class responsibilities and interface pattern
3. JSONB usage strategy (columns for queryable fields, JSONB for nested structures)
4. ID strategy (UUID primary key + text slug)
5. Migration phasing (simple first, complex later)
6. Faction table reconciliation approach
7. In-memory mode preservation for local development
8. Client-side API remains unchanged

### Deliverables

- Decision document: `.squad/decisions/inbox/elminster-content-store-refactor.md`
- Implementation checklist per entity type
- Success metrics defined
- Risk mitigation strategies outlined
- References to existing patterns and code locations

## Next Actions

1. Team review of migration plan and phasing strategy
2. Confirm faction reconciliation approach with product/design
3. Begin Phase 1 implementation (biomes, modifiers, narrative)
4. Establish code review checklist for pattern compliance
