-- Content definitions table — stores admin-editable game content for all 9 entity types.
-- Uses JSONB data column for flexible schema per entity type.
-- Entity types: items, creatures, biomes, modifiers, skills, loot-tables, factions, rooms, narrative

CREATE TABLE content_definitions (
  id          TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  data        JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pk_content_definitions PRIMARY KEY (entity_type, id)
);

CREATE INDEX idx_content_entity_type ON content_definitions (entity_type);
CREATE INDEX idx_content_id          ON content_definitions (id);
CREATE INDEX idx_content_name        ON content_definitions ((data->>'name'));
