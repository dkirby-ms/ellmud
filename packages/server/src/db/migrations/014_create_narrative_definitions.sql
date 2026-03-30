-- Create dedicated narrative_template_definitions table.
-- Replaces the JSONB blob in content_definitions for narrative templates.

-- Table now consolidated into 001_schema.sql.

-- Clean up any stale narrative entries from the generic store.
DELETE FROM content_definitions WHERE entity_type = 'narrative';
