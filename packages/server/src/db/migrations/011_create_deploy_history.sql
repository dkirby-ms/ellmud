-- Migration 011: Deploy history tracking.
--
-- Simulates content deployment tracking for staging and production environments.

CREATE TABLE IF NOT EXISTS deploy_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment TEXT NOT NULL CHECK (environment IN ('staging', 'production')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'rolled_back')),
  deployed_by TEXT NOT NULL,
  entity_count INTEGER NOT NULL DEFAULT 0,
  changes_summary JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  notes TEXT
);

CREATE INDEX idx_deploy_history_env ON deploy_history(environment);
CREATE INDEX idx_deploy_history_started ON deploy_history(started_at DESC);
