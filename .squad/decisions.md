### 2026-04-04: Sprint 3 PR Review — Migration Discipline
**By:** Elminster (Lead / Architect)
**Issues:** #236, #237, #238, #239

## Decision
Seed migration files (003_seed_zones.sql, 004_seed_siltgate.sql, etc.) must NOT be modified to change runtime data in existing databases. The migration runner tracks applied files by filename — once a file is in the `_migrations` table, it will never re-run. Any data changes to existing rows (category updates, description changes, column value modifications) must use a **new numbered migration file** with UPDATE statements.

Modifying seed files is acceptable ONLY for maintaining correctness on fresh installations (both the seed update AND a new migration are needed).

## Rationale
PR #260 modified 003_seed_zones.sql to change the Refuge category from `hub` → `dev`, but this change will not apply to existing databases. The Refuge will remain `category='hub'` on any database that has already run the migration set. This was caught in review and flagged as a blocking issue.

This is the second time this pattern has been noted (Jarlaxle's own history mentions "Migration ordering matters: Seed migrations reference columns by original name"). It needs to be a documented team rule.

## Impact
- PR #260 needs a new `014_repurpose_refuge.sql` migration before merge
- All future data modifications must follow the same pattern: new migration file + optional seed file update
- This rule applies to all seed migrations (003, 004, and any future seed files)

---

### 2026-04-01: Insert Room on Exit — Zone Designer Pattern
**By:** Regis (Frontend Dev)  
**Issue:** #252  

## Decision
Added "Insert Room on Exit" as a new zone designer action. When an exit is selected, the user can insert a new room between the two connected rooms. This creates the room, deletes the original exit pair, and wires two new bidirectional pairs through the inserted room. The operation is atomic (all-or-nothing via try/catch) and the BFS layout engine naturally positions the new room on the grid between the originals.

## Rationale
Zone designers frequently need to add intermediate rooms to existing connections — for topological correctness (bridge rooms), narrative pacing, or encounter placement. Previously this required manually creating a room, deleting the exit, and rewiring 4+ exits by hand. The new button reduces this to a single click.

## Impact
- Button appears in both the exit-pair and single-exit panels in the zone designer side panel
- Hidden for cross-zone portal exits (portals span zones and shouldn't be split)
- New rooms default to type `corridor` — designer renames/retypes after insertion
- Uses purple dashed border styling (matching feature-room accent) to distinguish from Save/Delete actions
