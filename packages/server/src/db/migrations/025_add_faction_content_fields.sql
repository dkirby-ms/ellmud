-- 025_add_faction_content_fields.sql
-- Adds admin-UI content fields (description, milestones, events) to the
-- canonical `factions` table (migration 004), then removes the stale
-- content_definitions rows for entity_type='factions'.
--
-- The `factions` table is the single source of truth for faction data.
-- The content_definitions copies had different names (Ironhearth vs.
-- Ironwright Compact) and are superseded.
--
-- Idempotent — safe to run multiple times.

-- Add missing columns (IF NOT EXISTS prevents errors on re-run)
ALTER TABLE factions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE factions ADD COLUMN IF NOT EXISTS milestones  JSONB NOT NULL DEFAULT '[]';
ALTER TABLE factions ADD COLUMN IF NOT EXISTS events      JSONB NOT NULL DEFAULT '[]';

-- Back-fill description from philosophy for existing rows that have no
-- description yet (one-time data migration).
UPDATE factions SET description = philosophy WHERE description IS NULL;

-- Remove stale content_definitions faction rows
DELETE FROM content_definitions WHERE entity_type = 'factions';
