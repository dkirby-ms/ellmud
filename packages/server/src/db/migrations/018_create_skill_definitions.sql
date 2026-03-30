-- 026_create_skill_definitions.sql
-- Dedicated skill_definitions table for admin-editable skill content.
-- No data to migrate — skills are currently empty in content_definitions.

-- Table now consolidated into 001_schema.sql.

-- Clean up any stale rows from the generic table (should be empty, but safety-net)
DELETE FROM content_definitions WHERE entity_type = 'skills';
