/**
 * Deploy routes — content deployment simulation system.
 *
 * Tracks content snapshots for staging/production environments.
 * Since there's no actual CI/CD pipeline, this simulates deployments
 * by recording which content changes have been "deployed".
 */

import { randomUUID } from 'crypto';
import { Router, type Request, type Response } from 'express';
import { adminAuth } from '../middleware.js';
import { query } from '../../db/index.js';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DeployHistoryRow {
  id: string;
  environment: 'staging' | 'production';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
  deployed_by: string;
  entity_count: number;
  changes_summary: Record<string, unknown>;
  started_at: string;
  completed_at: string | null;
  notes: string | null;
}

interface PendingChange {
  entityType: string;
  entityId: string;
  name: string;
  action: 'created' | 'modified' | 'deleted';
  modifiedAt: string;
}

interface ContentRow {
  id: string;
  entity_type: string;
  data: { name?: string };
  created_at: string;
  updated_at: string;
}

// ─── Routes ──────────────────────────────────────────────────────────────────

export function createDeployRouter(): Router {
  const router = Router();

  // GET /admin/api/deploy/diff — Compare current content vs last deployment
  router.get('/diff', adminAuth, async (req: Request, res: Response) => {
    try {
      // Find the last completed deployment for each environment
      const lastDeploysResult = await query<DeployHistoryRow>(
        `SELECT DISTINCT ON (environment) *
         FROM deploy_history
         WHERE status = 'completed'
         ORDER BY environment, completed_at DESC NULLS LAST`,
      );

      const lastDeploy = lastDeploysResult.rows[0] || null;
      const lastDeployTime = lastDeploy?.completed_at || '1970-01-01T00:00:00Z';

      // Find all content modified since last deploy
      const changesResult = await query<ContentRow>(
        `SELECT id, entity_type, data, created_at, updated_at
         FROM content_definitions
         WHERE updated_at > $1
         ORDER BY updated_at DESC`,
        [lastDeployTime],
      );

      const pendingChanges: PendingChange[] = changesResult.rows.map((row) => {
        const isNew = new Date(row.created_at) > new Date(lastDeployTime);
        return {
          entityType: row.entity_type,
          entityId: row.id,
          name: row.data.name || row.id,
          action: isNew ? 'created' : 'modified',
          modifiedAt: row.updated_at,
        };
      });

      res.json({
        pendingChanges,
        lastDeploy: lastDeploy
          ? {
              environment: lastDeploy.environment,
              completedAt: lastDeploy.completed_at,
              entityCount: lastDeploy.entity_count,
              deployedBy: lastDeploy.deployed_by,
            }
          : null,
      });
    } catch (error) {
      console.error('[deploy] Failed to fetch diff:', error);
      res.status(500).json({ error: 'Failed to fetch deployment diff' });
    }
  });

  // POST /admin/api/deploy/staging — Deploy to staging
  router.post('/staging', adminAuth, async (req: Request, res: Response) => {
    try {
      const deployedBy = req.body.deployedBy || 'admin';

      // Count current entities
      const countResult = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM content_definitions`,
      );
      const entityCount = parseInt(countResult.rows[0]?.count || '0', 10);

      // Get entity counts by type for summary
      const summaryResult = await query<{ entity_type: string; count: string }>(
        `SELECT entity_type, COUNT(*) as count
         FROM content_definitions
         GROUP BY entity_type`,
      );
      
      const changesSummary: Record<string, number> = {};
      for (const row of summaryResult.rows) {
        changesSummary[row.entity_type] = parseInt(row.count, 10);
      }

      const id = randomUUID();
      const result = await query<DeployHistoryRow>(
        `INSERT INTO deploy_history 
         (id, environment, status, deployed_by, entity_count, changes_summary, started_at, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING *`,
        [id, 'staging', 'completed', deployedBy, entityCount, JSON.stringify(changesSummary)],
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error('[deploy] Failed to deploy to staging:', error);
      res.status(500).json({ error: 'Failed to deploy to staging' });
    }
  });

  // POST /admin/api/deploy/production — Deploy to production
  router.post('/production', adminAuth, async (req: Request, res: Response) => {
    try {
      const { confirm, deployedBy = 'admin' } = req.body;

      if (!confirm) {
        res.status(400).json({ error: 'Confirmation required for production deployment' });
        return;
      }

      // Count current entities
      const countResult = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM content_definitions`,
      );
      const entityCount = parseInt(countResult.rows[0]?.count || '0', 10);

      // Get entity counts by type for summary
      const summaryResult = await query<{ entity_type: string; count: string }>(
        `SELECT entity_type, COUNT(*) as count
         FROM content_definitions
         GROUP BY entity_type`,
      );
      
      const changesSummary: Record<string, number> = {};
      for (const row of summaryResult.rows) {
        changesSummary[row.entity_type] = parseInt(row.count, 10);
      }

      const id = randomUUID();
      const result = await query<DeployHistoryRow>(
        `INSERT INTO deploy_history 
         (id, environment, status, deployed_by, entity_count, changes_summary, started_at, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING *`,
        [id, 'production', 'completed', deployedBy, entityCount, JSON.stringify(changesSummary)],
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error('[deploy] Failed to deploy to production:', error);
      res.status(500).json({ error: 'Failed to deploy to production' });
    }
  });

  // GET /admin/api/deploy/history — Deployment history
  router.get('/history', adminAuth, async (req: Request, res: Response) => {
    try {
      const limit = parseInt((req.query.limit as string) || '20', 10);
      const offset = parseInt((req.query.offset as string) || '0', 10);

      const result = await query<DeployHistoryRow>(
        `SELECT * FROM deploy_history
         ORDER BY started_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset],
      );

      const countResult = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM deploy_history`,
      );
      const total = parseInt(countResult.rows[0]?.count || '0', 10);

      res.json({
        deployments: result.rows,
        total,
        limit,
        offset,
      });
    } catch (error) {
      console.error('[deploy] Failed to fetch history:', error);
      res.status(500).json({ error: 'Failed to fetch deployment history' });
    }
  });

  // POST /admin/api/deploy/:id/rollback — Rollback a deployment
  router.post('/:id/rollback', adminAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await query<DeployHistoryRow>(
        `UPDATE deploy_history
         SET status = 'rolled_back', notes = COALESCE(notes || E'\\n', '') || 'Rolled back at ' || NOW()::TEXT
         WHERE id = $1
         RETURNING *`,
        [id],
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Deployment not found' });
        return;
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('[deploy] Failed to rollback deployment:', error);
      res.status(500).json({ error: 'Failed to rollback deployment' });
    }
  });

  return router;
}
