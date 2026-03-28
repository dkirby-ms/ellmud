/**
 * Zone CRUD routes — RESTful endpoints for admin-managed MUD zones.
 *
 * Provides full CRUD for zones, rooms within zones, and exits within zones.
 * All routes are protected by adminAuth middleware.
 * Mutations log audit events for traceability.
 *
 * Endpoints:
 *   GET    /admin/api/zones              — List all zones
 *   GET    /admin/api/zones/:slug        — Get zone bundle (zone + rooms + exits)
 *   POST   /admin/api/zones              — Create zone
 *   PUT    /admin/api/zones/:id          — Update zone
 *   DELETE /admin/api/zones/:id          — Delete zone (cascades rooms/exits)
 *   POST   /admin/api/zones/:id/rooms    — Create room in zone
 *   PUT    /admin/api/zones/rooms/:id    — Update room
 *   DELETE /admin/api/zones/rooms/:id    — Delete room
 *   POST   /admin/api/zones/:id/exits    — Create exit in zone
 *   DELETE /admin/api/zones/exits/:id    — Delete exit
 */

import { Router, type Request, type Response } from 'express';
import { adminAuth } from '../middleware.js';
import { logAuditEvent } from '../audit/audit-routes.js';
import { getZoneRepository } from '../../zones/index.js';
import { ALL_DIRECTIONS, type Direction } from '@ellmud/shared';

// ─── Validation helpers ──────────────────────────────────────────────────────

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VALID_LIFECYCLES = ['persistent', 'scheduled', 'event'] as const;
const VALID_CATEGORIES = ['hub', 'dungeon', 'wilderness', 'social'] as const;

function validateSlug(value: unknown, field: string): string | null {
  if (typeof value !== 'string' || !SLUG_RE.test(value)) {
    return `${field} must be URL-safe (lowercase alphanumeric + hyphens)`;
  }
  return null;
}

interface ZoneValidationInput {
  data: Record<string, unknown>;
  isUpdate: boolean;
}

function validateZone({ data, isUpdate }: ZoneValidationInput): string[] {
  const errors: string[] = [];

  if (!isUpdate || data['slug'] !== undefined) {
    const err = validateSlug(data['slug'], 'slug');
    if (err) errors.push(err);
  }

  if (!isUpdate || data['name'] !== undefined) {
    if (typeof data['name'] !== 'string' || data['name'].trim().length === 0) {
      errors.push('name is required and must be non-empty');
    }
  }

  if (!isUpdate || data['tier'] !== undefined) {
    const tier = data['tier'];
    if (typeof tier !== 'number' || tier < 1 || tier > 3 || !Number.isInteger(tier)) {
      errors.push('tier must be 1, 2, or 3');
    }
  }

  if (!isUpdate || data['lifecycle'] !== undefined) {
    if (!VALID_LIFECYCLES.includes(data['lifecycle'] as typeof VALID_LIFECYCLES[number])) {
      errors.push(`lifecycle must be one of: ${VALID_LIFECYCLES.join(', ')}`);
    }
  }

  if (!isUpdate || data['category'] !== undefined) {
    if (!VALID_CATEGORIES.includes(data['category'] as typeof VALID_CATEGORIES[number])) {
      errors.push(`category must be one of: ${VALID_CATEGORIES.join(', ')}`);
    }
  }

  if (!isUpdate || data['repopIntervalSeconds'] !== undefined) {
    const repop = data['repopIntervalSeconds'];
    if (typeof repop !== 'number' || repop < 0) {
      errors.push('repopIntervalSeconds must be >= 0');
    }
  }

  return errors;
}

function validateRoom(data: Record<string, unknown>): string[] {
  const errors: string[] = [];

  const err = validateSlug(data['slug'], 'slug');
  if (err) errors.push(err);

  if (typeof data['name'] !== 'string' || data['name'].trim().length === 0) {
    errors.push('name is required and must be non-empty');
  }

  return errors;
}

function validateExit(data: Record<string, unknown>, roomSlugs: Set<string>): string[] {
  const errors: string[] = [];

  const dir = data['direction'] as string;
  if (!ALL_DIRECTIONS.includes(dir as Direction)) {
    errors.push(`direction must be one of: ${ALL_DIRECTIONS.join(', ')}`);
  }

  if (typeof data['fromRoomSlug'] !== 'string' || !roomSlugs.has(data['fromRoomSlug'])) {
    errors.push('fromRoomSlug must reference an existing room in the zone');
  }

  if (typeof data['toRoomSlug'] !== 'string' || data['toRoomSlug'].trim().length === 0) {
    errors.push('toRoomSlug is required');
  }

  return errors;
}

// ─── Router factory ──────────────────────────────────────────────────────────

export function createZoneRouter(): Router {
  const router = Router();
  const basePath = '/admin/api/zones';

  // ─── GET /admin/api/zones — List all zones ─────────────────────────────
  router.get(basePath, adminAuth, async (_req: Request, res: Response) => {
    try {
      const repo = getZoneRepository();
      const zones = await repo.getAllZones();
      res.json(zones);
    } catch (err) {
      console.error('[Admin] Failed to list zones:', err);
      res.status(500).json({ error: 'Failed to list zones' });
    }
  });

  // ─── GET /admin/api/zones/cleanup/orphaned-exits — Dry-run scan ─────────
  router.get(`${basePath}/cleanup/orphaned-exits`, adminAuth, async (_req: Request, res: Response) => {
    try {
      const repo = getZoneRepository();
      const orphans = await repo.findOrphanedExits();
      res.json({ count: orphans.length, orphanedExits: orphans });
    } catch (err) {
      console.error('[Admin] Failed to scan orphaned exits:', err);
      res.status(500).json({ error: 'Failed to scan orphaned exits' });
    }
  });

  // ─── POST /admin/api/zones/cleanup/orphaned-exits — Delete orphans ─────
  router.post(`${basePath}/cleanup/orphaned-exits`, adminAuth, async (_req: Request, res: Response) => {
    try {
      const repo = getZoneRepository();
      const removed = await repo.removeOrphanedExits();

      if (removed.length > 0) {
        await logAuditEvent({
          action: 'delete',
          entityType: 'zone-exit-cleanup',
          entityId: 'orphaned-exits',
          actor: 'admin',
          details: { removedCount: removed.length, removedIds: removed.map((o) => o.exit.id) },
        }).catch(() => {});
      }

      res.json({ removed: removed.length, orphanedExits: removed });
    } catch (err) {
      console.error('[Admin] Failed to remove orphaned exits:', err);
      res.status(500).json({ error: 'Failed to remove orphaned exits' });
    }
  });

  // ─── GET /admin/api/zones/:slug — Get zone bundle ─────────────────────
  router.get(`${basePath}/:slug`, adminAuth, async (req: Request, res: Response) => {
    try {
      const repo = getZoneRepository();
      const bundle = await repo.getZoneBySlug(req.params.slug);
      if (!bundle) {
        res.status(404).json({ error: `Zone '${req.params.slug}' not found` });
        return;
      }
      res.json(bundle);
    } catch (err) {
      console.error('[Admin] Failed to get zone:', err);
      res.status(500).json({ error: 'Failed to get zone' });
    }
  });

  // ─── POST /admin/api/zones — Create zone ──────────────────────────────
  router.post(basePath, adminAuth, async (req: Request, res: Response) => {
    try {
      const data = req.body as Record<string, unknown>;
      const errors = validateZone({ data, isUpdate: false });
      if (errors.length > 0) {
        res.status(400).json({ error: 'Validation failed', details: errors });
        return;
      }

      const repo = getZoneRepository();
      const { id: _id, createdAt: _ca, updatedAt: _ua, ...rest } = data as Record<string, unknown>;
      const created = await repo.createZone(rest as Parameters<typeof repo.createZone>[0]);

      await logAuditEvent({
        action: 'create',
        entityType: 'zone',
        entityId: created.id,
        entityName: created.name,
        actor: 'admin',
        details: { created },
      }).catch(() => {});

      res.status(201).json(created);
    } catch (err) {
      console.error('[Admin] Failed to create zone:', err);
      res.status(500).json({ error: 'Failed to create zone' });
    }
  });

  // ─── PUT /admin/api/zones/:id — Update zone ──────────────────────────
  router.put(`${basePath}/:id`, adminAuth, async (req: Request, res: Response) => {
    try {
      const data = req.body as Record<string, unknown>;
      const errors = validateZone({ data, isUpdate: true });
      if (errors.length > 0) {
        res.status(400).json({ error: 'Validation failed', details: errors });
        return;
      }

      const repo = getZoneRepository();
      const { id: _id, createdAt: _ca, updatedAt: _ua, ...rest } = data as Record<string, unknown>;
      const updated = await repo.updateZone(
        req.params.id,
        rest as Parameters<typeof repo.updateZone>[1],
      );

      await logAuditEvent({
        action: 'update',
        entityType: 'zone',
        entityId: updated.id,
        entityName: updated.name,
        actor: 'admin',
        details: { updated },
      }).catch(() => {});

      res.json(updated);
    } catch (err) {
      if (err instanceof Error && err.message.includes('not found')) {
        res.status(404).json({ error: err.message });
        return;
      }
      console.error('[Admin] Failed to update zone:', err);
      res.status(500).json({ error: 'Failed to update zone' });
    }
  });

  // ─── DELETE /admin/api/zones/:id — Delete zone (cascade) ──────────────
  router.delete(`${basePath}/:id`, adminAuth, async (req: Request, res: Response) => {
    try {
      const repo = getZoneRepository();
      const bundle = await repo.getZoneById(req.params.id);
      if (!bundle) {
        res.status(404).json({ error: `Zone '${req.params.id}' not found` });
        return;
      }

      await repo.deleteZone(req.params.id);

      await logAuditEvent({
        action: 'delete',
        entityType: 'zone',
        entityId: req.params.id,
        entityName: bundle.zone.name,
        actor: 'admin',
        details: { deleted: bundle.zone },
      }).catch(() => {});

      res.status(204).send();
    } catch (err) {
      console.error('[Admin] Failed to delete zone:', err);
      res.status(500).json({ error: 'Failed to delete zone' });
    }
  });

  // ─── POST /admin/api/zones/:id/rooms — Create room in zone ───────────
  router.post(`${basePath}/:id/rooms`, adminAuth, async (req: Request, res: Response) => {
    try {
      const data = req.body as Record<string, unknown>;
      const errors = validateRoom(data);
      if (errors.length > 0) {
        res.status(400).json({ error: 'Validation failed', details: errors });
        return;
      }

      const repo = getZoneRepository();
      const bundle = await repo.getZoneById(req.params.id);
      if (!bundle) {
        res.status(404).json({ error: `Zone '${req.params.id}' not found` });
        return;
      }

      // Check slug uniqueness within zone
      const slugExists = bundle.rooms.some((r) => r.slug === data['slug']);
      if (slugExists) {
        res.status(409).json({ error: `Room slug '${data['slug']}' already exists in this zone` });
        return;
      }

      const { id: _id, createdAt: _ca, updatedAt: _ua, ...rest } = data;
      const roomData = {
        properties: [],
        lootContainers: [],
        hazards: [],
        npcs: [],
        ...rest,
        zoneId: req.params.id,
      };
      const created = await repo.createRoom(
        roomData as unknown as Parameters<typeof repo.createRoom>[0],
      );

      await logAuditEvent({
        action: 'create',
        entityType: 'zone-room',
        entityId: created.id,
        entityName: created.name,
        actor: 'admin',
        details: { zoneId: req.params.id, created },
      }).catch(() => {});

      res.status(201).json(created);
    } catch (err) {
      console.error('[Admin] Failed to create room:', err);
      res.status(500).json({ error: 'Failed to create room' });
    }
  });

  // ─── PUT /admin/api/zones/rooms/:id — Update room ────────────────────
  router.put(`${basePath}/rooms/:id`, adminAuth, async (req: Request, res: Response) => {
    try {
      const data = req.body as Record<string, unknown>;

      const repo = getZoneRepository();
      const updated = await repo.updateRoom(
        req.params.id,
        data as Parameters<typeof repo.updateRoom>[1],
      );

      await logAuditEvent({
        action: 'update',
        entityType: 'zone-room',
        entityId: updated.id,
        entityName: updated.name,
        actor: 'admin',
        details: { updated },
      }).catch(() => {});

      res.json(updated);
    } catch (err) {
      if (err instanceof Error && err.message.includes('not found')) {
        res.status(404).json({ error: err.message });
        return;
      }
      console.error('[Admin] Failed to update room:', err);
      res.status(500).json({ error: 'Failed to update room' });
    }
  });

  // ─── DELETE /admin/api/zones/rooms/:id — Delete room ──────────────────
  router.delete(`${basePath}/rooms/:id`, adminAuth, async (req: Request, res: Response) => {
    try {
      const repo = getZoneRepository();
      await repo.deleteRoom(req.params.id);

      await logAuditEvent({
        action: 'delete',
        entityType: 'zone-room',
        entityId: req.params.id,
        actor: 'admin',
      }).catch(() => {});

      res.status(204).send();
    } catch (err) {
      console.error('[Admin] Failed to delete room:', err);
      res.status(500).json({ error: 'Failed to delete room' });
    }
  });

  // ─── POST /admin/api/zones/:id/exits — Create exit in zone ───────────
  router.post(`${basePath}/:id/exits`, adminAuth, async (req: Request, res: Response) => {
    try {
      const data = req.body as Record<string, unknown>;

      const repo = getZoneRepository();
      const bundle = await repo.getZoneById(req.params.id);
      if (!bundle) {
        res.status(404).json({ error: `Zone '${req.params.id}' not found` });
        return;
      }

      const roomSlugs = new Set(bundle.rooms.map((r) => r.slug));
      const errors = validateExit(data, roomSlugs);
      if (errors.length > 0) {
        res.status(400).json({ error: 'Validation failed', details: errors });
        return;
      }

      const { id: _id, createdAt: _ca, ...rest } = data;
      const created = await repo.createExit({
        ...rest,
        zoneId: req.params.id,
      } as Parameters<typeof repo.createExit>[0]);

      await logAuditEvent({
        action: 'create',
        entityType: 'zone-exit',
        entityId: created.id,
        actor: 'admin',
        details: { zoneId: req.params.id, created },
      }).catch(() => {});

      res.status(201).json(created);
    } catch (err) {
      console.error('[Admin] Failed to create exit:', err);
      res.status(500).json({ error: 'Failed to create exit' });
    }
  });

  // ─── DELETE /admin/api/zones/exits/:id — Delete exit ──────────────────
  router.delete(`${basePath}/exits/:id`, adminAuth, async (req: Request, res: Response) => {
    try {
      const repo = getZoneRepository();
      await repo.deleteExit(req.params.id);

      await logAuditEvent({
        action: 'delete',
        entityType: 'zone-exit',
        entityId: req.params.id,
        actor: 'admin',
      }).catch(() => {});

      res.status(204).send();
    } catch (err) {
      console.error('[Admin] Failed to delete exit:', err);
      res.status(500).json({ error: 'Failed to delete exit' });
    }
  });

  return router;
}
