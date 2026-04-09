# Decision: User Settings Backend Architecture (#359)

**Author:** Jarlaxle (Systems Dev)
**Date:** 2025-07-25
**Status:** Implemented

## Decision
User settings backend uses the **provider pattern** (interface → PG + InMemory) consistent with all other server persistence (characters, stash, factions, etc.). The API is two endpoints: `GET /api/user/settings` and `PUT /api/user/settings`.

## Key Choices
1. **JSONB config blob** — single `config` column with structured categories (`display`, `narration`, `gameplay`, `accessibility`). Avoids schema migrations for new settings.
2. **Server-side validation** — fontSize range (12–24), verbosity enum, narrationStyle enum, unknown top-level key rejection. Invalid → 400.
3. **No middleware** — auth is an inline `authenticate()` helper per the characters.ts pattern, not Express middleware. Keeps it consistent with existing routes.
4. **Default config on GET** — if no row exists, returns empty category objects. No DB write on first GET.
5. **Upsert semantics** — PUT always succeeds (creates or replaces). No separate POST/PATCH.

## Scope Boundaries (per user decisions)
- No keybind export, no profiles/presets, no .rcfile upload in v1.
- `gameplay` and `accessibility` categories are present but empty — reserved for future use.
