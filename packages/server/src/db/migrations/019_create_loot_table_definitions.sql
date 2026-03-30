-- 027_create_loot_table_definitions.sql
-- Dedicated loot_table_definitions table for admin-editable loot table content.
-- No data to migrate — loot-tables are currently empty in content_definitions.

-- Table now consolidated into 001_schema.sql.

-- Clean up any stale rows from the generic table (should be empty, but safety-net)
DELETE FROM content_definitions WHERE entity_type = 'loot-tables';
