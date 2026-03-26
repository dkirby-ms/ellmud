-- 015_create_tokens.sql
-- Session token storage with TTL (replaces in-memory token store).

CREATE TABLE auth_tokens (
  token       TEXT PRIMARY KEY,
  player_id   UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  username    TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tokens_player ON auth_tokens (player_id);
CREATE INDEX idx_tokens_expires ON auth_tokens (expires_at);
