-- Rebuild item_definitions for content-driven architecture.
-- Converts UUID primary key to human-readable TEXT slug.
-- Adds columns: base_durability, weight, stackable, max_stack, status, updated_at.
-- Renames stats → base_stats to distinguish from computed effective stats.

-- 1. Drop FK from player_stash so we can alter the referenced column type.
ALTER TABLE player_stash DROP CONSTRAINT IF EXISTS player_stash_item_id_fkey;

-- 2. Drop old indexes (will be recreated with new naming).
DROP INDEX IF EXISTS idx_items_type;
DROP INDEX IF EXISTS idx_items_tier;

-- 3. Clear pre-launch placeholder data and convert PK to TEXT.
TRUNCATE item_definitions CASCADE;
ALTER TABLE item_definitions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE item_definitions ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- 4. Rename stats → base_stats.
ALTER TABLE item_definitions RENAME COLUMN stats TO base_stats;

-- 5. Add new columns required by the content pipeline.
ALTER TABLE item_definitions ADD COLUMN IF NOT EXISTS base_durability INT;
ALTER TABLE item_definitions ADD COLUMN IF NOT EXISTS weight REAL NOT NULL DEFAULT 1;
ALTER TABLE item_definitions ADD COLUMN IF NOT EXISTS stackable BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE item_definitions ADD COLUMN IF NOT EXISTS max_stack INT NOT NULL DEFAULT 1;
ALTER TABLE item_definitions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published';
ALTER TABLE item_definitions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 6. Tighten existing nullable columns.
ALTER TABLE item_definitions ALTER COLUMN tier SET NOT NULL;
ALTER TABLE item_definitions ALTER COLUMN tier SET DEFAULT 'common';
UPDATE item_definitions SET description = '' WHERE description IS NULL;
ALTER TABLE item_definitions ALTER COLUMN description SET NOT NULL;
ALTER TABLE item_definitions ALTER COLUMN description SET DEFAULT '';

-- 7. Convert player_stash.item_id to TEXT to match new PK type.
TRUNCATE player_stash;
ALTER TABLE player_stash ALTER COLUMN item_id TYPE TEXT USING item_id::TEXT;

-- 8. Re-add FK from player_stash to item_definitions.
ALTER TABLE player_stash ADD CONSTRAINT player_stash_item_id_fkey
  FOREIGN KEY (item_id) REFERENCES item_definitions(id) ON DELETE RESTRICT;

-- 9. Recreate indexes with content-pipeline naming.
CREATE INDEX idx_item_definitions_type ON item_definitions(type);
CREATE INDEX idx_item_definitions_tier ON item_definitions(tier);
