-- Amend creature_definitions for content-driven architecture.
-- Adds slug (human-readable lookup key), updated_at, enforces status NOT NULL.

-- 1. Add slug column (nullable for backfill).
ALTER TABLE creature_definitions ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- 2. Backfill slug from existing type column.
UPDATE creature_definitions SET slug = type WHERE slug IS NULL;

-- 3. Make slug NOT NULL now that all rows are populated.
ALTER TABLE creature_definitions ALTER COLUMN slug SET NOT NULL;

-- 4. Add updated_at timestamp.
ALTER TABLE creature_definitions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 5. Enforce status NOT NULL with sensible default.
UPDATE creature_definitions SET status = 'published' WHERE status IS NULL;
ALTER TABLE creature_definitions ALTER COLUMN status SET NOT NULL;
ALTER TABLE creature_definitions ALTER COLUMN status SET DEFAULT 'published';
