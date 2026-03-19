-- 001_create_players.sql
-- Player identity (normalized for OAuth bolt-on in Phase 4) + player profiles.
-- Phase 1: local username/password only. Phase 4: add OAuth rows to player_identities.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Identity table: one row per auth method. Local auth now, OAuth rows added later.
CREATE TABLE player_identities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider      TEXT NOT NULL DEFAULT 'local',   -- 'local', 'discord', 'github', etc.
  provider_id   TEXT,                             -- external OAuth subject ID (NULL for local)
  email         TEXT,
  password_hash TEXT,                             -- bcrypt hash; NULL for OAuth providers
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_identity_provider UNIQUE (provider, provider_id)
);

-- Player profile: the in-game persona. 1:1 with an identity for now; many:1 when OAuth lands.
CREATE TABLE players (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id   UUID NOT NULL REFERENCES player_identities(id) ON DELETE CASCADE,
  username      TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_player_username UNIQUE (username)
);

CREATE INDEX idx_players_identity ON players (identity_id);
CREATE INDEX idx_players_username ON players (username);
CREATE INDEX idx_identities_email ON player_identities (email) WHERE email IS NOT NULL;
