-- 004_create_factions.sql
-- Factions + membership (GDD §9.4 — one faction per player, reputation + rank).

CREATE TABLE factions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  philosophy  TEXT,
  specialty   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_faction_name UNIQUE (name),
  CONSTRAINT uq_faction_slug UNIQUE (slug)
);

-- Seed the three canonical factions from GDD §9.4.
INSERT INTO factions (name, slug, philosophy, specialty) VALUES
  ('The Ironwright Compact', 'ironwright',
   'Pragmatic survivalists. Gear and craftsmanship above all.',
   'Best crafting recipes, armour bonuses, durability perks.'),
  ('The Veil Cartographers', 'veil',
   'Knowledge-seekers. Map the shards, understand the collapse.',
   'Awareness bonuses, extended shard timers, anomaly detection.'),
  ('The Scarlet Ledger', 'scarlet',
   'Risk-takers and profiteers. High risk, high reward.',
   'Better loot rolls, PvP stealth bonuses, black-market access.');

-- One faction at a time: player_id is UNIQUE.
CREATE TABLE faction_membership (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  faction_id  UUID NOT NULL REFERENCES factions(id) ON DELETE RESTRICT,
  reputation  INT NOT NULL DEFAULT 0 CHECK (reputation >= 0),
  rank        INT NOT NULL DEFAULT 1 CHECK (rank >= 1),
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_faction_membership_player UNIQUE (player_id)
);

CREATE INDEX idx_membership_faction ON faction_membership (faction_id);
