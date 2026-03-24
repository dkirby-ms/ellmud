-- Audit log table — stores admin CRUD actions for content entities.
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  entity_name TEXT,
  actor       TEXT NOT NULL DEFAULT 'admin',
  details     JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log (action);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_type ON audit_log (entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log (actor);
