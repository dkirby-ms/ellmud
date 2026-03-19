-- 002_create_items.sql
-- Item definitions (game-designer-authored rows) + player stash (persistent inventory).

CREATE TABLE item_definitions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  type        TEXT NOT NULL,  -- weapon, armour, consumable, material, tool, key, blueprint
  tier        TEXT,           -- scrap, common, sturdy, refined, masterwork, anomalous (NULL for materials)
  stats       JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  soulbound   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE player_stash (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  item_id     UUID NOT NULL REFERENCES item_definitions(id) ON DELETE RESTRICT,
  quantity    INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  durability  REAL,           -- NULL for non-degradable items (materials, keys)
  metadata    JSONB NOT NULL DEFAULT '{}',  -- crafted-item variation, roll data
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stash_player  ON player_stash (player_id);
CREATE INDEX idx_stash_item    ON player_stash (player_id, item_id);
CREATE INDEX idx_items_type    ON item_definitions (type);
CREATE INDEX idx_items_tier    ON item_definitions (tier) WHERE tier IS NOT NULL;
