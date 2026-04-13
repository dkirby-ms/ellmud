-- 017_permadeath_hall_of_fame.sql
-- Hall of Fame table for permadeath characters.
-- Records characters permanently removed by permadeath system.

CREATE TABLE hall_of_fame (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id      UUID NOT NULL,
  player_id         UUID NOT NULL,
  character_name    TEXT NOT NULL,
  level             INTEGER DEFAULT 1,
  total_kills       INTEGER DEFAULT 0,
  total_deaths      INTEGER NOT NULL,
  survived_seconds  INTEGER NOT NULL,
  cause_of_death    TEXT,
  zone_of_death     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for leaderboard queries (survival time descending)
CREATE INDEX idx_hall_of_fame_survival ON hall_of_fame(survived_seconds DESC);

-- Index for stats queries (zone, cause lookups)
CREATE INDEX idx_hall_of_fame_zone ON hall_of_fame(zone_of_death);
CREATE INDEX idx_hall_of_fame_cause ON hall_of_fame(cause_of_death);
