-- 001_schema.sql — Full database schema for Ellmud.
-- gen_random_uuid() is built-in since PostgreSQL 13 — no extension needed.

-- ============================================================================
-- Independent tables (no foreign key dependencies)
-- ============================================================================

-- Player authentication identities (local or OAuth)
CREATE TABLE player_identities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider    TEXT NOT NULL DEFAULT 'local',
  provider_id TEXT,
  email       TEXT,
  password_hash TEXT,
  role        TEXT NOT NULL DEFAULT 'player',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_identity_provider UNIQUE (provider, provider_id)
);

-- Game item blueprints (id is a human-readable slug, e.g. 'rusty_blade')
CREATE TABLE item_definitions (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  type           TEXT NOT NULL,
  tier           TEXT NOT NULL DEFAULT 'common',
  base_stats     JSONB NOT NULL DEFAULT '{}',
  description    TEXT NOT NULL DEFAULT '',
  soulbound      BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  base_durability INTEGER,
  weight         REAL NOT NULL DEFAULT 1,
  stackable      BOOLEAN NOT NULL DEFAULT false,
  max_stack      INTEGER NOT NULL DEFAULT 1,
  status         TEXT NOT NULL DEFAULT 'published',
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Factions
CREATE TABLE factions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  philosophy  TEXT,
  specialty   TEXT,
  description TEXT,
  milestones  JSONB NOT NULL DEFAULT '[]',
  events      JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_faction_name UNIQUE (name),
  CONSTRAINT uq_faction_slug UNIQUE (slug)
);

-- Biome templates for procedural generation
CREATE TABLE biome_definitions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  tier            INTEGER NOT NULL DEFAULT 1,
  features        TEXT[] NOT NULL DEFAULT '{}',
  hazard_types    TEXT[] NOT NULL DEFAULT '{}',
  room_properties TEXT[] NOT NULL DEFAULT '{}',
  narration_hints TEXT[] NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Room-level modifiers (buffs/debuffs)
CREATE TABLE modifier_definitions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  effects     JSONB NOT NULL DEFAULT '{}',
  stackable   BOOLEAN NOT NULL DEFAULT false,
  tags        TEXT[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Narrative templates for LLM narration
CREATE TABLE narrative_template_definitions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  narrative_type TEXT NOT NULL DEFAULT 'lore',
  biome          TEXT,
  template       TEXT NOT NULL DEFAULT '',
  tone           TEXT,
  verbosity      TEXT,
  tags           TEXT[] NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Loot table blueprints
CREATE TABLE loot_table_definitions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  entries     JSONB NOT NULL DEFAULT '[]',
  min_drops   INTEGER NOT NULL DEFAULT 1,
  max_drops   INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Room blueprints for procedural generation
CREATE TABLE room_definitions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  type            TEXT NOT NULL DEFAULT '',
  properties      JSONB NOT NULL DEFAULT '[]',
  hazards         JSONB NOT NULL DEFAULT '[]',
  loot_containers JSONB NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Skill blueprints
CREATE TABLE skill_definitions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  description    TEXT NOT NULL DEFAULT '',
  category       TEXT NOT NULL DEFAULT '',
  cooldown_ticks INTEGER NOT NULL DEFAULT 0,
  stamina_cost   INTEGER NOT NULL DEFAULT 0,
  effects        JSONB NOT NULL DEFAULT '{}',
  requirements   JSONB NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Creature blueprints (id UUID, slug + type are human-readable)
CREATE TABLE creature_definitions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  description     TEXT DEFAULT '',
  behavior        TEXT,
  max_hp          INTEGER NOT NULL DEFAULT 100,
  attack          INTEGER NOT NULL DEFAULT 10,
  defence         INTEGER NOT NULL DEFAULT 5,
  armour          INTEGER NOT NULL DEFAULT 0,
  agility         INTEGER NOT NULL DEFAULT 0,
  min_count       INTEGER NOT NULL DEFAULT 1,
  max_count       INTEGER NOT NULL DEFAULT 3,
  preferred_rooms TEXT[] NOT NULL DEFAULT '{}',
  forbidden_rooms TEXT[] NOT NULL DEFAULT '{}',
  idle_ticks_min  INTEGER NOT NULL DEFAULT 3,
  idle_ticks_max  INTEGER NOT NULL DEFAULT 5,
  flee_threshold  REAL NOT NULL DEFAULT 0.25,
  biome_affinity  TEXT[],
  tier_min        INTEGER,
  tier_max        INTEGER,
  status          TEXT NOT NULL DEFAULT 'published',
  loot_table      JSONB NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  slug            TEXT NOT NULL UNIQUE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Persistent zone definitions
CREATE TABLE zones (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                    TEXT NOT NULL UNIQUE,
  name                    TEXT NOT NULL,
  description             TEXT NOT NULL DEFAULT '',
  level_min               INTEGER NOT NULL DEFAULT 1,
  level_max               INTEGER NOT NULL DEFAULT 100,
  tier                    INTEGER NOT NULL DEFAULT 1,
  biome                   TEXT NOT NULL DEFAULT 'flooded_crypt',
  entry_room_slugs        TEXT[] NOT NULL DEFAULT '{}',
  lifecycle               TEXT NOT NULL DEFAULT 'persistent',
  category                TEXT NOT NULL DEFAULT 'dungeon',
  max_players             INTEGER NOT NULL DEFAULT 0,
  pvp_enabled             BOOLEAN NOT NULL DEFAULT false,
  repop_interval_seconds  INTEGER NOT NULL DEFAULT 300,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Deployment tracking
CREATE TABLE deploy_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment     TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  deployed_by     TEXT NOT NULL,
  entity_count    INTEGER NOT NULL DEFAULT 0,
  changes_summary JSONB DEFAULT '{}',
  started_at      TIMESTAMPTZ DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  notes           TEXT,
  CONSTRAINT deploy_history_environment_check CHECK (environment IN ('staging', 'production')),
  CONSTRAINT deploy_history_status_check CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'rolled_back'))
);

-- Admin audit log
CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  entity_name TEXT,
  actor       TEXT NOT NULL DEFAULT 'admin',
  details     JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- Tables with foreign keys — Tier 1 (depends on identities)
-- ============================================================================

CREATE TABLE players (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id UUID NOT NULL REFERENCES player_identities(id) ON DELETE CASCADE,
  username    TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_player_username UNIQUE (username)
);

-- ============================================================================
-- Tier 2 (depends on players)
-- ============================================================================

CREATE TABLE characters (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id      UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  faction_slug   TEXT NOT NULL,
  is_active      BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_played_at TIMESTAMPTZ,
  deleted_at     TIMESTAMPTZ,
  CONSTRAINT chk_character_name_length CHECK (char_length(name) >= 2 AND char_length(name) <= 24)
);

CREATE TABLE auth_tokens (
  token      TEXT PRIMARY KEY,
  player_id  UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  username   TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- Tier 3 (depends on players, characters, item_definitions, factions)
-- ============================================================================

CREATE TABLE faction_membership (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id    UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  faction_id   UUID NOT NULL REFERENCES factions(id) ON DELETE RESTRICT,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  reputation   INT NOT NULL DEFAULT 0 CHECK (reputation >= 0),
  rank         INT NOT NULL DEFAULT 1 CHECK (rank >= 1),
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_faction_membership_player UNIQUE (player_id)
);

CREATE TABLE player_skills (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id    UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  skill_name   TEXT NOT NULL,
  category     TEXT NOT NULL,
  level        INT NOT NULL DEFAULT 1 CHECK (level >= 1),
  xp           INT NOT NULL DEFAULT 0 CHECK (xp >= 0),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_player_skill UNIQUE (player_id, skill_name)
);

CREATE TABLE player_stash (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id    UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  item_id      TEXT NOT NULL REFERENCES item_definitions(id) ON DELETE RESTRICT,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  quantity     INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  durability   REAL,
  metadata     JSONB NOT NULL DEFAULT '{}',
  acquired_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE player_stash_capacity (
  player_id    UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  max_weight   INTEGER NOT NULL DEFAULT 200 CHECK (max_weight > 0)
);

CREATE TABLE player_shard_sickness (
  player_id    UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  death_count  INTEGER NOT NULL DEFAULT 0,
  last_death_at BIGINT
);

CREATE TABLE player_loadout (
  player_id    UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  slot         TEXT NOT NULL,
  instance_id  TEXT NOT NULL,
  item_id      TEXT NOT NULL REFERENCES item_definitions(id) ON DELETE RESTRICT,
  metadata     JSONB NOT NULL DEFAULT '{}',
  equipped_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, slot)
);

CREATE TABLE player_profile (
  player_id        UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  character_id     UUID REFERENCES characters(id) ON DELETE CASCADE,
  max_carry_weight INTEGER NOT NULL DEFAULT 20,
  equipment        JSONB NOT NULL DEFAULT '{}',
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE run_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id       UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  character_id    UUID REFERENCES characters(id) ON DELETE CASCADE,
  run_id          TEXT NOT NULL,
  shard_tier      INT NOT NULL CHECK (shard_tier BETWEEN 1 AND 3),
  biome           TEXT,
  duration_sec    INT NOT NULL DEFAULT 0 CHECK (duration_sec >= 0),
  extracted       BOOLEAN NOT NULL DEFAULT false,
  extracted_items JSONB NOT NULL DEFAULT '[]',
  xp_gained       INT NOT NULL DEFAULT 0 CHECK (xp_gained >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- Zone child tables (depends on zones)
-- ============================================================================

CREATE TABLE zone_rooms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id         UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  slug            TEXT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'corridor',
  properties      TEXT[] NOT NULL DEFAULT '{}',
  loot_containers JSONB NOT NULL DEFAULT '[]',
  hazards         JSONB NOT NULL DEFAULT '[]',
  npcs            JSONB NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_zone_room_slug UNIQUE (zone_id, slug)
);

CREATE TABLE zone_exits (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id          UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  from_room_slug   TEXT NOT NULL,
  direction        TEXT NOT NULL,
  to_room_slug     TEXT NOT NULL,
  target_zone_slug TEXT,
  target_room_slug TEXT,
  locked           BOOLEAN NOT NULL DEFAULT false,
  hidden           BOOLEAN NOT NULL DEFAULT false,
  condition        JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_zone_exit_direction UNIQUE (zone_id, from_room_slug, direction)
);

-- Character exploration tracking (character_id is TEXT, not UUID FK)
CREATE TABLE character_explored_rooms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id  TEXT NOT NULL,
  zone_slug     TEXT,
  room_id       TEXT NOT NULL,
  room_type     TEXT NOT NULL,
  room_name     TEXT NOT NULL,
  shard_tier    SMALLINT,
  biome         TEXT,
  first_visited TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_visited  TIMESTAMPTZ NOT NULL DEFAULT now(),
  visit_count   INTEGER NOT NULL DEFAULT 1
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- player_identities
CREATE INDEX idx_identities_email ON player_identities(email) WHERE email IS NOT NULL;

-- players
CREATE INDEX idx_players_identity ON players(identity_id);
CREATE INDEX idx_players_username ON players(username);

-- characters
CREATE INDEX idx_characters_player ON characters(player_id);
CREATE UNIQUE INDEX idx_one_active_character ON characters(player_id) WHERE (is_active = true AND deleted_at IS NULL);
CREATE UNIQUE INDEX idx_uq_character_name_per_player ON characters(player_id, lower(name)) WHERE (deleted_at IS NULL);

-- item_definitions
CREATE INDEX idx_item_definitions_type ON item_definitions(type);
CREATE INDEX idx_item_definitions_tier ON item_definitions(tier);

-- auth_tokens
CREATE INDEX idx_tokens_player ON auth_tokens(player_id);
CREATE INDEX idx_tokens_expires ON auth_tokens(expires_at);

-- faction_membership
CREATE INDEX idx_membership_faction ON faction_membership(faction_id);
CREATE INDEX idx_membership_character ON faction_membership(character_id);

-- player_skills
CREATE INDEX idx_skills_player ON player_skills(player_id);
CREATE INDEX idx_skills_category ON player_skills(player_id, category);
CREATE INDEX idx_skills_character ON player_skills(character_id);

-- player_stash
CREATE INDEX idx_stash_player ON player_stash(player_id);
CREATE INDEX idx_stash_item ON player_stash(player_id, item_id);
CREATE INDEX idx_stash_character ON player_stash(character_id);

-- player_stash_capacity
CREATE INDEX idx_stash_cap_character ON player_stash_capacity(character_id);

-- player_shard_sickness
CREATE INDEX idx_shard_sickness_character ON player_shard_sickness(character_id);

-- player_loadout
CREATE INDEX idx_loadout_player ON player_loadout(player_id);
CREATE INDEX idx_loadout_character ON player_loadout(character_id);

-- player_profile
CREATE INDEX idx_profile_character ON player_profile(character_id);

-- run_history
CREATE INDEX idx_runs_player ON run_history(player_id);
CREATE INDEX idx_runs_character ON run_history(character_id);
CREATE INDEX idx_runs_leaderboard ON run_history(shard_tier, xp_gained DESC);
CREATE INDEX idx_runs_created ON run_history(created_at DESC);
CREATE INDEX idx_runs_xp ON run_history(xp_gained DESC);

-- deploy_history
CREATE INDEX idx_deploy_history_env ON deploy_history(environment);
CREATE INDEX idx_deploy_history_started ON deploy_history(started_at DESC);

-- audit_log
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_actor ON audit_log(actor);
CREATE INDEX idx_audit_log_entity_type ON audit_log(entity_type);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);

-- character_explored_rooms
CREATE INDEX idx_explored_rooms_character ON character_explored_rooms(character_id);
CREATE INDEX idx_explored_rooms_character_zone ON character_explored_rooms(character_id, zone_slug);
CREATE UNIQUE INDEX uq_character_zone_room ON character_explored_rooms(character_id, COALESCE(zone_slug, '__shard__'), room_id);

-- zone_rooms
CREATE INDEX idx_zone_rooms_zone_id ON zone_rooms(zone_id);

-- zone_exits
CREATE INDEX idx_zone_exits_zone_id ON zone_exits(zone_id);
CREATE INDEX idx_zone_exits_from ON zone_exits(zone_id, from_room_slug);
