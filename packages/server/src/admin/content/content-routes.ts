/**
 * Content CRUD routes — RESTful endpoints for admin-editable game content.
 *
 * Provides GET/POST/PUT/DELETE for 9 entity types:
 *   items, creatures, biomes, modifiers, skills, loot-tables, factions, rooms, narrative
 *
 * All routes are protected by adminAuth middleware.
 * Data lives in ContentStore (in-memory, Phase 1). Swappable to PG later.
 */

import { randomUUID } from 'crypto';
import { Router, type Request, type Response } from 'express';
import { adminAuth } from '../middleware.js';
import { ContentStoreError, type ContentEntity, type IContentStore } from './ContentStore.js';
import { validateContent } from './content-validation.js';
import { CONTENT_ENTITY_TYPES, type ContentEntityType } from './content-types.js';

export interface ContentRouterDeps {
  stores: Map<ContentEntityType, IContentStore<ContentEntity>>;
}

export function createContentRouter(deps: ContentRouterDeps): Router {
  const router = Router();
  const { stores } = deps;

  // Register CRUD routes for each entity type
  for (const entityType of CONTENT_ENTITY_TYPES) {
    const store = stores.get(entityType);
    if (!store) continue;

    const basePath = `/admin/api/content/${entityType}`;

    // ─── GET /admin/api/{entity} — List all ──────────────────────────
    router.get(basePath, adminAuth, async (_req: Request, res: Response) => {
      try {
        const entities = await store.getAll();
        res.json(entities);
      } catch (err) {
        console.error(`[Admin] Failed to list ${entityType}:`, err);
        res.status(500).json({ error: `Failed to list ${entityType}` });
      }
    });

    // ─── GET /admin/api/{entity}/:id — Get by ID ────────────────────
    router.get(`${basePath}/:id`, adminAuth, async (req: Request, res: Response) => {
      try {
        const entity = await store.getById(req.params.id);
        if (!entity) {
          res.status(404).json({ error: `${entityType} '${req.params.id}' not found` });
          return;
        }
        res.json(entity);
      } catch (err) {
        console.error(`[Admin] Failed to get ${entityType}:`, err);
        res.status(500).json({ error: `Failed to get ${entityType}` });
      }
    });

    // ─── POST /admin/api/{entity} — Create ──────────────────────────
    router.post(basePath, adminAuth, async (req: Request, res: Response) => {
      try {
        const data = req.body as Record<string, unknown>;

        // Validate
        const errors = validateContent(entityType, data, false);
        if (errors.length > 0) {
          res.status(400).json({ error: 'Validation failed', details: errors });
          return;
        }

        // Auto-generate ID if not provided
        const entity: ContentEntity = {
          ...data,
          id: (data['id'] as string) || randomUUID(),
        };

        const created = await store.create(entity);
        res.status(201).json(created);
      } catch (err) {
        if (err instanceof ContentStoreError) {
          const status = err.code === 'DUPLICATE_ID' ? 409 : 400;
          res.status(status).json({ error: err.message });
          return;
        }
        console.error(`[Admin] Failed to create ${entityType}:`, err);
        res.status(500).json({ error: `Failed to create ${entityType}` });
      }
    });

    // ─── PUT /admin/api/{entity}/:id — Update ───────────────────────
    router.put(`${basePath}/:id`, adminAuth, async (req: Request, res: Response) => {
      try {
        const data = req.body as Record<string, unknown>;

        // Validate (partial — update mode)
        const errors = validateContent(entityType, data, true);
        if (errors.length > 0) {
          res.status(400).json({ error: 'Validation failed', details: errors });
          return;
        }

        const updated = await store.update(req.params.id, data as Partial<ContentEntity>);
        res.json(updated);
      } catch (err) {
        if (err instanceof ContentStoreError && err.code === 'NOT_FOUND') {
          res.status(404).json({ error: err.message });
          return;
        }
        console.error(`[Admin] Failed to update ${entityType}:`, err);
        res.status(500).json({ error: `Failed to update ${entityType}` });
      }
    });

    // ─── DELETE /admin/api/{entity}/:id — Delete ────────────────────
    router.delete(`${basePath}/:id`, adminAuth, async (req: Request, res: Response) => {
      try {
        const deleted = await store.delete(req.params.id);
        if (!deleted) {
          res.status(404).json({ error: `${entityType} '${req.params.id}' not found` });
          return;
        }
        res.status(204).send();
      } catch (err) {
        console.error(`[Admin] Failed to delete ${entityType}:`, err);
        res.status(500).json({ error: `Failed to delete ${entityType}` });
      }
    });
  }

  return router;
}
