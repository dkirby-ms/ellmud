-- 014_player_inventory.sql — Persistent player inventory table (Issue #409).
--
-- Mirrors the player_stash schema. Inventory is the player's carried items
-- (accessible everywhere, weight-limited). Stash is the bank (feature_stash rooms only).

CREATE TABLE IF NOT EXISTS player_inventory (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id    UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  item_id      TEXT NOT NULL REFERENCES item_definitions(id) ON DELETE RESTRICT,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  quantity     INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  durability   REAL,
  metadata     JSONB NOT NULL DEFAULT '{}',
  acquired_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes (matching player_stash index patterns)
CREATE INDEX IF NOT EXISTS idx_inventory_player ON player_inventory(player_id);
CREATE INDEX IF NOT EXISTS idx_inventory_item ON player_inventory(player_id, item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_character ON player_inventory(character_id);
