/**
 * Audit log routes and helpers.
 *
 * Stores admin actions (create / update / delete) with optional entity
 * metadata.  Provides a GET endpoint with filtering by action, entity
 * type, and actor, plus limit/offset pagination.
 *
 * Table: audit_log (created by migration 010).
 */

import { randomUUID } from 'crypto';
import { Router, type Request, type Response } from 'express';
import { adminAuth } from '../middleware.js';
import { query } from '../../db/index.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuditEventInput {
  action: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  actor: string;
  details?: Record<string, unknown>;
}

interface AuditRow {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_name: string | null;
  actor: string;
  details: Record<string, unknown>;
  created_at: string;
}

// ─── Write helper ────────────────────────────────────────────────────────────

/**
 * Persist an audit event.  Safe to fire-and-forget (callers typically
 * `.catch(() => {})` so a logging failure never blocks the request).
 */
export async function logAuditEvent(input: AuditEventInput): Promise<void> {
  if (!process.env.DATABASE_URL) return; // no-op without PG

  const id = randomUUID();
  await query(
    `INSERT INTO audit_log (id, action, entity_type, entity_id, entity_name, actor, details)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      id,
      input.action,
      input.entityType ?? null,
      input.entityId ?? null,
      input.entityName ?? null,
      input.actor,
      JSON.stringify(input.details ?? {}),
    ],
  );
}

// ─── Read endpoint ───────────────────────────────────────────────────────────

export function createAuditRouter(): Router {
  const router = Router();

  router.get('/admin/api/audit-log', adminAuth, async (req: Request, res: Response) => {
    try {
      if (!process.env.DATABASE_URL) {
        res.json({ events: [] });
        return;
      }

      const { action, entity, actor, limit, offset } = req.query as Record<string, string | undefined>;

      const conditions: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      if (action) {
        conditions.push(`action = $${idx++}`);
        values.push(action);
      }
      if (entity) {
        conditions.push(`entity_type = $${idx++}`);
        values.push(entity);
      }
      if (actor) {
        conditions.push(`actor = $${idx++}`);
        values.push(actor);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const lim = Math.min(Math.max(parseInt(limit ?? '50', 10) || 50, 1), 200);
      const off = Math.max(parseInt(offset ?? '0', 10) || 0, 0);

      const sql = `SELECT id, action, entity_type, entity_id, entity_name, actor, details, created_at
                   FROM audit_log ${where}
                   ORDER BY created_at DESC
                   LIMIT $${idx++} OFFSET $${idx++}`;
      values.push(lim, off);

      const result = await query<AuditRow>(sql, values);
      res.json({ events: result.rows });
    } catch (err) {
      console.error('[Audit] Failed to query audit log:', err);
      res.status(500).json({ error: 'Failed to query audit log' });
    }
  });

  return router;
}
