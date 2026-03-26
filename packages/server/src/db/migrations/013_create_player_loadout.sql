-- 013_create_player_loadout.sql
-- Player equipment loadout — which items are equipped in which slots.
-- Items are removed from player_stash when equipped and returned when unequipped.

CREATE TABLE player_loadout (
  player_id    UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  slot         TEXT NOT NULL,  -- equipment slot name (e.g. 'weapon', 'offhand', 'head', 'chest', 'legs', 'feet')
  instance_id  TEXT NOT NULL,  -- unique item instance ID (matches StashItemInstance.instanceId)
  item_id      UUID NOT NULL REFERENCES item_definitions(id),
  metadata     JSONB NOT NULL DEFAULT '{}',  -- instance-specific data (durability, maxDurability, etc.)
  equipped_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (player_id, slot)
);

CREATE INDEX idx_loadout_player ON player_loadout (player_id);
