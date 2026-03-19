-- 003_create_skills.sql
-- Player skills and progression (GDD §7.1 — six categories, levelled through use).

CREATE TABLE player_skills (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  skill_name  TEXT NOT NULL,   -- e.g. 'swordsmanship', 'first_aid', 'tracking'
  category    TEXT NOT NULL,   -- combat, defence, survival, subterfuge, awareness, social
  level       INT NOT NULL DEFAULT 1 CHECK (level >= 1),
  xp          INT NOT NULL DEFAULT 0 CHECK (xp >= 0),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_player_skill UNIQUE (player_id, skill_name)
);

CREATE INDEX idx_skills_player   ON player_skills (player_id);
CREATE INDEX idx_skills_category ON player_skills (player_id, category);
