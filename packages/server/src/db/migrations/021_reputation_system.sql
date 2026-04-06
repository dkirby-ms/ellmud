-- Migration 021: Reputation System
-- Transition from faction-based to starting-zone-based character creation.
-- Faction reputation is now earned through gameplay, not assigned at creation.

-- Add starting_zone_slug to characters table
ALTER TABLE characters ADD COLUMN starting_zone_slug TEXT;

-- Default existing characters based on their faction_slug
UPDATE characters SET starting_zone_slug = COALESCE(
  (SELECT CASE faction_slug
    WHEN 'kindari' THEN 'the-reliquary'
    WHEN 'bloom-tenders' THEN 'the-bloom-observatory'
    WHEN 'krewe-calliope' THEN 'the-carrion-court'
    ELSE 'the-reliquary'
  END),
  'the-reliquary'
);

ALTER TABLE characters ALTER COLUMN starting_zone_slug SET NOT NULL;
ALTER TABLE characters ALTER COLUMN starting_zone_slug SET DEFAULT 'the-reliquary';

-- Make faction_slug nullable (no longer required at creation)
ALTER TABLE characters ALTER COLUMN faction_slug DROP NOT NULL;

-- New reputation table
CREATE TABLE IF NOT EXISTS character_reputation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  faction_slug TEXT NOT NULL,
  reputation INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(character_id, faction_slug)
);
CREATE INDEX idx_character_reputation_char ON character_reputation(character_id);
