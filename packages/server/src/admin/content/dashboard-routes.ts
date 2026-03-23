/**
 * Dashboard API routes — aggregate metrics, recent changes, and validation warnings
 * for the admin dashboard.
 *
 * Endpoints:
 *   GET /admin/api/dashboard/metrics          — entity counts + active rooms
 *   GET /admin/api/dashboard/recent-changes   — last 10 modified content definitions
 *   GET /admin/api/dashboard/validation-warnings — scan content for issues
 *
 * All routes require adminAuth.
 */

import { Router, type Request, type Response } from 'express';
import { adminAuth } from '../middleware.js';
import { matchMaker } from '@colyseus/core';
import type { ContentEntityType } from './content-types.js';
import { CONTENT_ENTITY_TYPES } from './content-types.js';
import type { IContentStore, ContentEntity } from './ContentStore.js';
import { query as dbQuery } from '../../db/index.js';

export interface DashboardRouterDeps {
  stores: Map<ContentEntityType, IContentStore<ContentEntity>>;
  usePg: boolean;
}

export function createDashboardApiRouter(deps: DashboardRouterDeps): Router {
  const router = Router();
  const { stores, usePg } = deps;

  // ─── GET /admin/api/dashboard/metrics — aggregate counts ─────────────────
  router.get('/admin/api/dashboard/metrics', adminAuth, async (_req: Request, res: Response) => {
    try {
      // Entity counts — from PG or in-memory stores
      const entityCounts: Record<string, number> = {};
      let totalItems = 0;

      if (usePg) {
        try {
          const result = await dbQuery<{ entity_type: string; count: string }>(
            `SELECT entity_type, COUNT(*)::text as count FROM content_definitions GROUP BY entity_type`,
          );
          for (const row of result.rows) {
            entityCounts[row.entity_type] = parseInt(row.count, 10);
            totalItems += entityCounts[row.entity_type];
          }
        } catch {
          // DB unavailable — fall through to store-based counts
          for (const entityType of CONTENT_ENTITY_TYPES) {
            const store = stores.get(entityType);
            if (store) {
              const all = await store.getAll();
              entityCounts[entityType] = all.length;
              totalItems += all.length;
            }
          }
        }
      } else {
        for (const entityType of CONTENT_ENTITY_TYPES) {
          const store = stores.get(entityType);
          if (store) {
            const all = await store.getAll();
            entityCounts[entityType] = all.length;
            totalItems += all.length;
          }
        }
      }

      // Active rooms from Colyseus matchMaker
      let activeRooms = 0;
      let activePlayers = 0;
      try {
        const rooms = await matchMaker.query({});
        activeRooms = rooms.length;
        activePlayers = rooms.reduce((sum, r) => sum + r.clients, 0);
      } catch {
        // Colyseus not initialized — zero is fine
      }

      res.json({
        totalItems,
        entityCounts,
        activeRooms,
        activePlayers,
        entityTypes: CONTENT_ENTITY_TYPES,
      });
    } catch (err) {
      console.error('[Admin] Dashboard metrics error:', err);
      res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
    }
  });

  // ─── GET /admin/api/dashboard/recent-changes — last 10 modified items ────
  router.get('/admin/api/dashboard/recent-changes', adminAuth, async (_req: Request, res: Response) => {
    try {
      if (usePg) {
        try {
          const result = await dbQuery<{
            id: string;
            entity_type: string;
            data: Record<string, unknown>;
            created_at: Date;
            updated_at: Date;
          }>(
            `SELECT id, entity_type, data, created_at, updated_at
             FROM content_definitions
             ORDER BY updated_at DESC
             LIMIT 10`,
          );

          const changes = result.rows.map((row) => ({
            id: row.id,
            entityType: row.entity_type,
            name: (row.data as Record<string, unknown>)['name'] as string || row.id,
            updatedAt: row.updated_at.toISOString(),
            createdAt: row.created_at.toISOString(),
          }));

          res.json({ changes });
          return;
        } catch {
          // DB unavailable — fall through to in-memory
        }
      }

      // In-memory fallback: collect all entities, sort by any timestamp we can find
      const allEntities: Array<{
        id: string;
        entityType: string;
        name: string;
        updatedAt: string;
        createdAt: string;
      }> = [];

      for (const entityType of CONTENT_ENTITY_TYPES) {
        const store = stores.get(entityType);
        if (!store) continue;
        const entities = await store.getAll();
        for (const entity of entities) {
          allEntities.push({
            id: entity.id,
            entityType,
            name: (entity['name'] as string) || entity.id,
            updatedAt: (entity['updatedAt'] as string) || new Date().toISOString(),
            createdAt: (entity['createdAt'] as string) || new Date().toISOString(),
          });
        }
      }

      // In-memory stores don't have timestamps, so just return the most recent batch
      const changes = allEntities.slice(0, 10);
      res.json({ changes });
    } catch (err) {
      console.error('[Admin] Recent changes error:', err);
      res.status(500).json({ error: 'Failed to fetch recent changes' });
    }
  });

  // ─── GET /admin/api/dashboard/validation-warnings — scan for issues ──────
  router.get('/admin/api/dashboard/validation-warnings', adminAuth, async (_req: Request, res: Response) => {
    try {
      const warnings: Array<{
        entityType: string;
        entityId: string;
        entityName: string;
        message: string;
        severity: 'warning' | 'error';
      }> = [];

      for (const entityType of CONTENT_ENTITY_TYPES) {
        const store = stores.get(entityType);
        if (!store) continue;

        const entities = await store.getAll();

        for (const entity of entities) {
          // Missing name
          if (!entity['name'] || (typeof entity['name'] === 'string' && entity['name'].trim() === '')) {
            warnings.push({
              entityType,
              entityId: entity.id,
              entityName: entity.id,
              message: `Missing required field: name`,
              severity: 'error',
            });
          }

          const name = (entity['name'] as string) || entity.id;

          // Missing description (for types that require it)
          const needsDescription: ContentEntityType[] = ['biomes', 'modifiers', 'skills', 'factions', 'rooms', 'items'];
          if (needsDescription.includes(entityType)) {
            if (!entity['description'] || (typeof entity['description'] === 'string' && entity['description'].trim() === '')) {
              warnings.push({
                entityType,
                entityId: entity.id,
                entityName: name,
                message: `Missing description`,
                severity: 'warning',
              });
            }
          }

          // Creatures: check for missing type
          if (entityType === 'creatures') {
            if (!entity['type'] || (typeof entity['type'] === 'string' && entity['type'].trim() === '')) {
              warnings.push({
                entityType,
                entityId: entity.id,
                entityName: name,
                message: `Missing creature type`,
                severity: 'error',
              });
            }
          }

          // Loot tables: check for empty entries
          if (entityType === 'loot-tables') {
            const entries = entity['entries'];
            if (!Array.isArray(entries) || entries.length === 0) {
              warnings.push({
                entityType,
                entityId: entity.id,
                entityName: name,
                message: `Loot table has no entries`,
                severity: 'warning',
              });
            }
          }

          // Narrative: check for missing template
          if (entityType === 'narrative') {
            if (!entity['template'] || (typeof entity['template'] === 'string' && entity['template'].trim() === '')) {
              warnings.push({
                entityType,
                entityId: entity.id,
                entityName: name,
                message: `Narrative template is empty`,
                severity: 'error',
              });
            }
          }

          // Items: check for missing type
          if (entityType === 'items') {
            if (!entity['type'] || (typeof entity['type'] === 'string' && entity['type'].trim() === '')) {
              warnings.push({
                entityType,
                entityId: entity.id,
                entityName: name,
                message: `Missing item type`,
                severity: 'warning',
              });
            }
          }
        }
      }

      res.json({
        warnings,
        totalWarnings: warnings.filter((w) => w.severity === 'warning').length,
        totalErrors: warnings.filter((w) => w.severity === 'error').length,
      });
    } catch (err) {
      console.error('[Admin] Validation warnings error:', err);
      res.status(500).json({ error: 'Failed to scan for validation warnings' });
    }
  });

  return router;
}
