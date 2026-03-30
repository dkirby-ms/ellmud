-- 024_cleanup_content_definitions.sql
-- Safety-net cleanup: remove any stale rows for entity types that have been
-- migrated to dedicated relational tables.
--
-- Migrations 002 (items), 020 (biomes), 021 (modifiers), 022 (narrative),
-- and 023 (creatures) each created dedicated tables and deleted their own rows.
-- This migration ensures no orphaned rows remain if any of those DELETEs were
-- skipped or a re-seed inserted stale data.
--
-- Idempotent — safe to run multiple times; deletes zero rows when already clean.

DELETE FROM content_definitions
WHERE entity_type IN ('items', 'biomes', 'modifiers', 'narrative', 'creatures');
