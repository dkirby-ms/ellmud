/**
 * Admin API routes — mounted at /admin on the Express app.
 *
 * All routes are protected by adminAuth middleware (ADMIN_TOKEN).
 * Provides: room listing, room detail, pause/resume, spawn, metrics, SSE stream.
 */

import { Router, type Request, type Response } from 'express';
import { matchMaker } from '@colyseus/core';
import { adminAuth } from './middleware.js';
import type { NarrationTelemetryTracker } from '../narrative/telemetry.js';
import type { NarrationCache } from '../narrative/cache.js';
import type { InMemoryNarrationCache } from '../narrative/cache.js';
import type {
  AdminRoomSummary,
  AdminZoneDetail,
  AdminRefugeDetail,
  AdminPlayerInfo,
  AdminCreatureInfo,
  AdminMetrics,
} from './types.js';
import type { ContentEntity, IContentStore } from './content/ContentStore.js';
import type { ContentEntityType } from './content/content-types.js';
import type { CreatureTemplate } from '../creatures/types.js';
import type {
  AdminBroadcastRequest,
  AdminBroadcastResponse,
  AdminLiveRoomInfo,
  AdminLiveRoomsResponse,
  AdminSpawnCreatureRequest,
  AdminSpawnCreatureResponse,
  AdminTeleportRequest,
  AdminTeleportResponse,
} from '@ellmud/shared';

export interface AdminRouterDeps {
  /** Narration telemetry tracker instance (optional — metrics degrade gracefully). */
  telemetry?: NarrationTelemetryTracker;
  /** Narration cache instance (optional — cache size reported as 0). */
  cache?: NarrationCache;
  /** Whether the narration cache is Redis-backed. */
  isCacheRedis?: boolean;
  /** Whether Colyseus presence is Redis-backed. */
  isPresenceRedis?: boolean;
  /** Whether stash persistence uses PostgreSQL. */
  isStashPg?: boolean;
  /** Content stores — used by spawn endpoint to look up creature templates. */
  contentStores?: Map<ContentEntityType, IContentStore<ContentEntity>>;
}

/** Check if a Colyseus room name is a ZoneRoom instance ('zone' or 'zone:<slug>'). */
function isZoneRoomName(name: string): boolean {
  return name === 'zone' || name.startsWith('zone:');
}

/**
 * Convert a flat ContentEntity (from the creature content store) into the
 * nested CreatureTemplate shape that CreatureManager.spawnSingleCreature expects.
 *
 * The content store stores stats/spawn-rules as top-level keys (maxHp, attack,
 * minCount…) while CreatureTemplate nests them under `stats` and `spawnRules`.
 */
function contentEntityToCreatureTemplate(entity: ContentEntity): CreatureTemplate {
  const e = entity as Record<string, unknown>;
  return {
    type: (e.type as string) ?? 'unknown',
    name: (e.name as string) ?? 'Unknown Creature',
    stats: {
      maxHp: (e.maxHp as number) ?? 100,
      attack: (e.attack as number) ?? 10,
      defence: (e.defence as number) ?? 5,
      armour: (e.armour as number) ?? 0,
      agility: (e.agility as number) ?? 0,
    },
    lootTable: Array.isArray(e.lootTable) ? (e.lootTable as CreatureTemplate['lootTable']) : [],
    spawnRules: {
      minCount: (e.minCount as number) ?? 1,
      maxCount: (e.maxCount as number) ?? 3,
      preferredRoomTypes: Array.isArray(e.preferredRooms) ? (e.preferredRooms as string[]) : [],
      forbiddenRoomTypes: Array.isArray(e.forbiddenRooms) ? (e.forbiddenRooms as string[]) : [],
    },
    idleTicksMin: (e.idleTicksMin as number) ?? 3,
    idleTicksMax: (e.idleTicksMax as number) ?? 8,
    fleeThreshold: (e.fleeThreshold as number) ?? 0.2,
    aggressive: (e.aggressive as boolean) ?? true,
    roomDescription: (e.roomDescription as string) ?? undefined,
    positionType: (e.positionType as CreatureTemplate['positionType']) ?? undefined,
  };
}

export function createAdminRouter(deps: AdminRouterDeps = {}): Router {
  const router = Router();

  // ─── GET /admin/api/rooms — List all active rooms ────────────────────────
  router.get('/admin/api/rooms', adminAuth, async (_req: Request, res: Response) => {
    try {
      const rooms = await safeQueryRooms();
      const summaries: AdminRoomSummary[] = rooms.map((r) => ({
        roomId: r.roomId,
        name: r.name,
        clients: r.clients,
        maxClients: r.maxClients,
        locked: r.locked ?? false,
        createdAt: r.createdAt?.toISOString(),
        metadata: r.metadata as Record<string, unknown> | undefined,
      }));
      res.json({ rooms: summaries });
    } catch (err) {
      console.error('[Admin] Failed to list rooms:', err);
      res.status(500).json({ error: 'Failed to list rooms' });
    }
  });

  // ─── GET /admin/api/rooms/live — List all live zone rooms with occupancy ──
  // NOTE: Must be registered BEFORE /admin/api/rooms/:roomId to avoid param capture.
  router.get('/admin/api/rooms/live', adminAuth, async (_req: Request, res: Response) => {
    try {
      const rooms = await safeQueryRooms();
      const allLiveRooms: AdminLiveRoomInfo[] = [];
      let totalPlayers = 0;
      let totalCreatures = 0;

      for (const roomCache of rooms) {
        if (!isZoneRoomName(roomCache.name)) continue;
        const room = safeGetRoom(roomCache.roomId);
        if (!room) continue;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const zoneRoom = room as any;
        if (typeof zoneRoom.adminGetLiveRooms !== 'function') continue;

        const liveRooms = zoneRoom.adminGetLiveRooms() as AdminLiveRoomInfo[];
        for (const lr of liveRooms) {
          totalPlayers += lr.playerCount;
          totalCreatures += lr.creatureCount;
          allLiveRooms.push(lr);
        }
      }

      res.json({ rooms: allLiveRooms, totalPlayers, totalCreatures } satisfies AdminLiveRoomsResponse);
    } catch (err) {
      console.error('[Admin] Failed to list live rooms:', err);
      res.status(500).json({ error: 'Failed to list live rooms' });
    }
  });

  // ─── GET /admin/api/rooms/:roomId — Room detail ──────────────────────────
  router.get('/admin/api/rooms/:roomId', adminAuth, async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params;
      const room = safeGetRoom(roomId);

      if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }

      if (isZoneRoomName(room.roomName)) {
        const detail = getZoneDetail(room);
        res.json(detail);
      } else {
        res.json({
          roomId: room.roomId,
          name: room.roomName,
          clients: room.clients.length,
        });
      }
    } catch (err) {
      console.error('[Admin] Failed to get room detail:', err);
      res.status(500).json({ error: 'Failed to get room detail' });
    }
  });

  // ─── GET /admin/api/creatures — List all creatures across zones ──────────
  router.get('/admin/api/creatures', adminAuth, async (_req: Request, res: Response) => {
    try {
      const rooms = await safeQueryRooms();
      const creatures: Array<AdminCreatureInfo & { zoneRoomId: string }> = [];

      for (const roomCache of rooms) {
        if (!isZoneRoomName(roomCache.name)) continue;
        const room = safeGetRoom(roomCache.roomId);
        if (!room) continue;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cm = (room as any)['creatureManager'] as
          | { getAllCreatures(): Array<{ id: string; name: string; type: string; hp: number; maxHp: number; currentRoomId: string; behaviorState: string; isAlive: boolean }> }
          | undefined;

        if (cm) {
          for (const c of cm.getAllCreatures()) {
            creatures.push({
              id: c.id,
              name: c.name,
              type: c.type,
              hp: c.hp,
              maxHp: c.maxHp,
              currentRoomId: c.currentRoomId,
              behaviorState: c.behaviorState,
              isAlive: c.isAlive,
              zoneRoomId: roomCache.roomId,
            });
          }
        }
      }

      res.json({ creatures, count: creatures.length });
    } catch (err) {
      console.error('[Admin] Failed to list creatures:', err);
      res.status(500).json({ error: 'Failed to list creatures' });
    }
  });

  // ─── GET /admin/api/creature-templates — List all creature templates ─────
  router.get('/admin/api/creature-templates', adminAuth, async (_req: Request, res: Response) => {
    try {
      const { getContentRegistry } = await import('../content/index.js');
      const registry = getContentRegistry();
      if (registry?.isInitialized()) {
        const templates = registry.getAllCreatures();
        res.json({ templates, count: templates.length });
      } else {
        const { getAllCreatureTemplates } = await import('../creatures/CreatureManager.js');
        const templates = getAllCreatureTemplates();
        res.json({ templates, count: templates.length });
      }
    } catch (err) {
      console.error('[Admin] Failed to list creature templates:', err);
      res.status(500).json({ error: 'Failed to list creature templates' });
    }
  });

  // ─── GET /admin/api/items — List all item definitions ────────────────────
  router.get('/admin/api/items', adminAuth, async (_req: Request, res: Response) => {
    try {
      const { getContentRegistry } = await import('../content/index.js');
      const registry = getContentRegistry();
      if (registry?.isInitialized()) {
        const items = registry.getAllItems();
        res.json({ items, count: items.length });
      } else {
        const { getAllItemDefinitions } = await import('../items/registry.js');
        const items = getAllItemDefinitions();
        res.json({ items, count: items.length });
      }
    } catch (err) {
      console.error('[Admin] Failed to list items:', err);
      res.status(500).json({ error: 'Failed to list items' });
    }
  });

  // ─── POST /admin/api/creature-definitions — Create a creature definition ─
  router.post('/admin/api/creature-definitions', adminAuth, async (req: Request, res: Response) => {
    try {
      const { getPool } = await import('../db/index.js');
      const body = req.body as Record<string, unknown>;
      const result = await getPool().query(
        `INSERT INTO creature_definitions
           (type, name, slug, max_hp, attack, defence, armour, agility,
            min_count, max_count, preferred_rooms, forbidden_rooms,
            idle_ticks_min, idle_ticks_max, flee_threshold, loot_table, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         RETURNING *`,
        [
          body.type, body.name, body.slug ?? body.type,
          body.max_hp ?? 100, body.attack ?? 10, body.defence ?? 5,
          body.armour ?? 0, body.agility ?? 0,
          body.min_count ?? 1, body.max_count ?? 3,
          body.preferred_rooms ?? [], body.forbidden_rooms ?? [],
          body.idle_ticks_min ?? 3, body.idle_ticks_max ?? 5,
          body.flee_threshold ?? 0.25,
          JSON.stringify(body.loot_table ?? []),
          body.status ?? 'published',
        ],
      );

      // Refresh the content registry cache
      const { getContentRegistry } = await import('../content/index.js');
      const registry = getContentRegistry();
      if (registry?.isInitialized()) await registry.reload();

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('[Admin] Failed to create creature definition:', err);
      res.status(500).json({ error: 'Failed to create creature definition' });
    }
  });

  // ─── PUT /admin/api/creature-definitions/:slug — Update a creature ───────
  router.put('/admin/api/creature-definitions/:slug', adminAuth, async (req: Request, res: Response) => {
    try {
      const { getPool } = await import('../db/index.js');
      const { slug } = req.params;
      const body = req.body as Record<string, unknown>;

      // Build SET clause from provided fields
      const fields: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      const allowed = [
        'type', 'name', 'max_hp', 'attack', 'defence', 'armour', 'agility',
        'min_count', 'max_count', 'preferred_rooms', 'forbidden_rooms',
        'idle_ticks_min', 'idle_ticks_max', 'flee_threshold', 'status',
      ];

      for (const key of allowed) {
        if (key in body) {
          fields.push(`${key} = $${idx++}`);
          values.push(body[key]);
        }
      }

      // loot_table needs JSON serialization
      if ('loot_table' in body) {
        fields.push(`loot_table = $${idx++}`);
        values.push(JSON.stringify(body.loot_table));
      }

      if (fields.length === 0) {
        res.status(400).json({ error: 'No fields to update' });
        return;
      }

      fields.push(`updated_at = now()`);
      values.push(slug);

      const result = await getPool().query(
        `UPDATE creature_definitions SET ${fields.join(', ')}
         WHERE slug = $${idx} OR type = $${idx}
         RETURNING *`,
        values,
      );

      if (result.rowCount === 0) {
        res.status(404).json({ error: `Creature "${slug}" not found` });
        return;
      }

      const { getContentRegistry } = await import('../content/index.js');
      const registry = getContentRegistry();
      if (registry?.isInitialized()) await registry.reload();

      res.json(result.rows[0]);
    } catch (err) {
      console.error('[Admin] Failed to update creature definition:', err);
      res.status(500).json({ error: 'Failed to update creature definition' });
    }
  });

  // ─── POST /admin/api/item-definitions — Create an item definition ────────
  router.post('/admin/api/item-definitions', adminAuth, async (req: Request, res: Response) => {
    try {
      const { getPool } = await import('../db/index.js');
      const body = req.body as Record<string, unknown>;
      const result = await getPool().query(
        `INSERT INTO item_definitions
           (id, name, type, tier, base_stats, base_durability, weight,
            description, soulbound, stackable, max_stack, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING *`,
        [
          body.id, body.name, body.type, body.tier ?? 'common',
          JSON.stringify(body.base_stats ?? {}),
          body.base_durability ?? null,
          body.weight ?? 1,
          body.description ?? '',
          body.soulbound ?? false,
          body.stackable ?? false,
          body.max_stack ?? 1,
          body.status ?? 'published',
        ],
      );

      const { getContentRegistry } = await import('../content/index.js');
      const registry = getContentRegistry();
      if (registry?.isInitialized()) await registry.reload();

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('[Admin] Failed to create item definition:', err);
      res.status(500).json({ error: 'Failed to create item definition' });
    }
  });

  // ─── PUT /admin/api/item-definitions/:id — Update an item ────────────────
  router.put('/admin/api/item-definitions/:id', adminAuth, async (req: Request, res: Response) => {
    try {
      const { getPool } = await import('../db/index.js');
      const { id } = req.params;
      const body = req.body as Record<string, unknown>;

      const fields: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      const allowed = [
        'name', 'type', 'tier', 'base_durability', 'weight',
        'description', 'soulbound', 'stackable', 'max_stack', 'status',
      ];

      for (const key of allowed) {
        if (key in body) {
          fields.push(`${key} = $${idx++}`);
          values.push(body[key]);
        }
      }

      if ('base_stats' in body) {
        fields.push(`base_stats = $${idx++}`);
        values.push(JSON.stringify(body.base_stats));
      }

      if (fields.length === 0) {
        res.status(400).json({ error: 'No fields to update' });
        return;
      }

      fields.push(`updated_at = now()`);
      values.push(id);

      const result = await getPool().query(
        `UPDATE item_definitions SET ${fields.join(', ')}
         WHERE id = $${idx}
         RETURNING *`,
        values,
      );

      if (result.rowCount === 0) {
        res.status(404).json({ error: `Item "${id}" not found` });
        return;
      }

      const { getContentRegistry } = await import('../content/index.js');
      const registry = getContentRegistry();
      if (registry?.isInitialized()) await registry.reload();

      res.json(result.rows[0]);
    } catch (err) {
      console.error('[Admin] Failed to update item definition:', err);
      res.status(500).json({ error: 'Failed to update item definition' });
    }
  });

  // ─── GET /admin/api/players — List all connected players ─────────────────
  router.get('/admin/api/players', adminAuth, async (_req: Request, res: Response) => {
    try {
      const rooms = await safeQueryRooms();
      const players: Array<AdminPlayerInfo & { roomId: string; roomName: string }> = [];

      for (const roomCache of rooms) {
        const room = safeGetRoom(roomCache.roomId);
        if (!room) continue;

        if (isZoneRoomName(room.roomName)) {
          const zonePlayers = getZonePlayers(room);
          for (const p of zonePlayers) {
            players.push({ ...p, roomId: roomCache.roomId, roomName: room.roomName });
          }
        }
      }

      res.json({ players, count: players.length });
    } catch (err) {
      console.error('[Admin] Failed to list players:', err);
      res.status(500).json({ error: 'Failed to list players' });
    }
  });

  // ─── GET /admin/api/metrics — Server + narration metrics ─────────────────
  // NOTE: Also available via SSE stream (/admin/api/sse) for real-time polling.
  // The React admin dashboard fetches metrics via /admin/api/dashboard/metrics
  // (content-focused). This endpoint returns server runtime metrics (uptime,
  // room counts, narration cache stats). Wire to admin UI when server monitoring
  // page is added.
  router.get('/admin/api/metrics', adminAuth, async (_req: Request, res: Response) => {
    try {
      const rooms = await safeQueryRooms();
      const zones = rooms.filter((r) => r.name === 'zone');
      const refuges = rooms.filter((r) => r.name === 'refuge');
      const totalPlayers = rooms.reduce((sum, r) => sum + r.clients, 0);

      const telemetry = deps.telemetry?.getTelemetry();
      const cacheSize = getCacheSize(deps.cache);

      const metrics: AdminMetrics = {
        uptime: process.uptime(),
        timestamp: Date.now(),
        rooms: {
          total: rooms.length,
          zones: zones.length,
          refuges: refuges.length,
          totalPlayers,
        },
        narration: {
          cache_hits: telemetry?.cache_hits ?? 0,
          cache_misses: telemetry?.cache_misses ?? 0,
          cache_hit_ratio: telemetry?.cache_hit_ratio ?? 0,
          cache_size: cacheSize,
          llm_calls: telemetry?.llm_calls ?? 0,
          llm_timeouts: telemetry?.llm_timeouts ?? 0,
          fallback_uses: telemetry?.fallback_uses ?? 0,
          fallback_rate: telemetry?.fallback_rate ?? 0,
          avg_llm_latency_ms: telemetry?.avg_llm_latency_ms ?? 0,
        },
        redis: {
          cache_backend: deps.isCacheRedis ? 'redis' : 'in-memory',
          presence_backend: deps.isPresenceRedis ? 'redis' : 'local',
        },
        persistence: {
          stash_backend: deps.isStashPg ? 'postgresql' : 'in-memory',
        },
      };

      res.json(metrics);
    } catch (err) {
      console.error('[Admin] Failed to get metrics:', err);
      res.status(500).json({ error: 'Failed to get metrics' });
    }
  });

  // ─── POST /admin/api/rooms/:roomId/pause — Pause shard tick ──────────────
  router.post('/admin/api/rooms/:roomId/pause', adminAuth, async (req: Request, res: Response) => {
    try {
      const room = safeGetRoom(req.params.roomId);
      if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }

      // Colyseus Clock — stop the tick
      room.clock.stop();
      res.json({ roomId: room.roomId, paused: true });
    } catch (err) {
      console.error('[Admin] Failed to pause room:', err);
      res.status(500).json({ error: 'Failed to pause room' });
    }
  });

  // ─── POST /admin/api/rooms/:roomId/resume — Resume shard tick ────────────
  router.post('/admin/api/rooms/:roomId/resume', adminAuth, async (req: Request, res: Response) => {
    try {
      const room = safeGetRoom(req.params.roomId);
      if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }

      room.clock.start();
      res.json({ roomId: room.roomId, paused: false });
    } catch (err) {
      console.error('[Admin] Failed to resume room:', err);
      res.status(500).json({ error: 'Failed to resume room' });
    }
  });

  // ─── POST /admin/api/rooms/:roomId/spawn — Spawn item/creature ──────────
  router.post('/admin/api/rooms/:roomId/spawn', adminAuth, async (req: Request, res: Response) => {
    try {
      const room = safeGetRoom(req.params.roomId);
      if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }

      const { type, id, targetRoomId } = req.body as { type?: string; id?: string; targetRoomId?: string };
      if (!type || !id) {
        res.status(400).json({ error: 'Missing required fields: type, id' });
        return;
      }

      if (type !== 'item' && type !== 'creature') {
        res.status(400).json({ error: 'type must be "item" or "creature"' });
        return;
      }

      if (type === 'creature') {
        // Look up creature template from content store
        const creatureStore = deps.contentStores?.get('creatures');
        if (!creatureStore) {
          res.status(500).json({ error: 'Content store not available — cannot resolve creature template' });
          return;
        }

        const templateEntity = await creatureStore.getById(id);
        if (!templateEntity) {
          res.status(404).json({ error: `Creature template "${id}" not found` });
          return;
        }

        // Access the room's CreatureManager
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cm = (room as any)['creatureManager'] as
          | import('../creatures/CreatureManager.js').CreatureManager
          | undefined;

        if (!cm) {
          // Room doesn't have a creature manager (e.g., refuge) — fall back to broadcast
          const { MessageTypes } = await import('@ellmud/shared');
          room.broadcast(MessageTypes.NARRATE, {
            text: `[ADMIN] A ${templateEntity.name ?? id} materializes from thin air.`,
            type: 'system',
            timestamp: Date.now(),
          });

          res.json({
            roomId: room.roomId,
            spawned: { type, id },
            message: `Broadcast spawn of "${id}" — room has no creature manager (non-zone room)`,
          });
          return;
        }

        // Determine spawn room — use targetRoomId if provided, otherwise pick
        // first room from the zone's room graph
        let spawnRoomId = targetRoomId;
        if (!spawnRoomId) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const roomGraph = (room as any)['roomGraph'] as
            | { rooms: Map<string, { id: string }> }
            | undefined;

          if (roomGraph && roomGraph.rooms.size > 0) {
            spawnRoomId = roomGraph.rooms.values().next().value?.id;
          }
        }

        if (!spawnRoomId) {
          res.status(400).json({ error: 'No targetRoomId provided and room graph unavailable' });
          return;
        }

        // Convert flat content entity into the nested CreatureTemplate shape
        const template = contentEntityToCreatureTemplate(templateEntity);
        const creature = cm.spawnSingleCreature(template, spawnRoomId);

        // Broadcast spawn notification to players in the room
        const { MessageTypes } = await import('@ellmud/shared');
        room.broadcast(MessageTypes.NARRATE, {
          text: `[ADMIN] A ${creature.name} materializes from thin air in room ${spawnRoomId}.`,
          type: 'system',
          timestamp: Date.now(),
        });

        res.json({
          roomId: room.roomId,
          spawned: { type, id, creatureId: creature.id, spawnRoomId },
          message: `Spawned creature "${creature.name}" (${creature.id}) in room ${spawnRoomId}`,
        });
        return;
      }

      // type === 'item' — Phase 1 stub: broadcast only
      // TODO: Implement item spawn via inventory/room loot system
      const { MessageTypes } = await import('@ellmud/shared');
      room.broadcast(MessageTypes.NARRATE, {
        text: `[ADMIN] A ${type} (${id}) materializes from thin air.`,
        type: 'system',
        timestamp: Date.now(),
      });

      res.json({
        roomId: room.roomId,
        spawned: { type, id },
        message: `Spawned ${type} "${id}" in room ${room.roomId} (broadcast only — item spawn not yet implemented)`,
      });
    } catch (err) {
      console.error('[Admin] Failed to spawn:', err);
      res.status(500).json({ error: 'Failed to spawn' });
    }
  });

  // ─── POST /admin/api/rooms/:roomId/broadcast — Broadcast message to zone room
  router.post('/admin/api/rooms/:roomId/broadcast', adminAuth, async (req: Request, res: Response) => {
    try {
      const room = safeGetRoom(req.params.roomId);
      if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }

      const { targetRoomId, message, type = 'system' } = req.body as AdminBroadcastRequest;
      if (!targetRoomId || !message) {
        res.status(400).json({ error: 'Missing required fields: targetRoomId, message' });
        return;
      }

      if (type !== 'system' && type !== 'admin') {
        res.status(400).json({ error: 'type must be "system" or "admin"' });
        return;
      }

      if (message.length > 500) {
        res.status(400).json({ error: 'Message must be 500 characters or less' });
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const zoneRoom = room as any;
      if (typeof zoneRoom.adminBroadcastToRoom !== 'function') {
        res.status(400).json({ error: 'Room does not support room-specific broadcasts' });
        return;
      }

      const result = zoneRoom.adminBroadcastToRoom(targetRoomId, message, type) as { success: boolean; error?: string };
      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.json({ success: true, message: 'Broadcast sent' } satisfies AdminBroadcastResponse);
    } catch (err) {
      console.error('[Admin] Failed to broadcast:', err);
      res.status(500).json({ error: 'Failed to broadcast message' });
    }
  });

  // ─── POST /admin/api/rooms/:roomId/teleport — Teleport player to zone room ─
  router.post('/admin/api/rooms/:roomId/teleport', adminAuth, async (req: Request, res: Response) => {
    try {
      const room = safeGetRoom(req.params.roomId);
      if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }

      const { sessionId, targetRoomId, notify = true } = req.body as AdminTeleportRequest;
      if (!sessionId || !targetRoomId) {
        res.status(400).json({ error: 'Missing required fields: sessionId, targetRoomId' });
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const zoneRoom = room as any;
      if (typeof zoneRoom.adminTeleportPlayer !== 'function') {
        res.status(400).json({ error: 'Room does not support player teleportation' });
        return;
      }

      const result = zoneRoom.adminTeleportPlayer(sessionId, targetRoomId, notify) as { success: boolean; error?: string; roomName?: string };
      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.json({ success: true, message: `Teleported player to ${result.roomName}` } satisfies AdminTeleportResponse);
    } catch (err) {
      console.error('[Admin] Failed to teleport:', err);
      res.status(500).json({ error: 'Failed to teleport player' });
    }
  });

  // ─── POST /admin/api/rooms/:roomId/spawn-creature — Spawn creature in zone room
  router.post('/admin/api/rooms/:roomId/spawn-creature', adminAuth, async (req: Request, res: Response) => {
    try {
      const room = safeGetRoom(req.params.roomId);
      if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }

      const { templateId, targetRoomId } = req.body as AdminSpawnCreatureRequest;
      if (!templateId || !targetRoomId) {
        res.status(400).json({ error: 'Missing required fields: templateId, targetRoomId' });
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const zoneRoom = room as any;
      if (typeof zoneRoom.adminSpawnCreature !== 'function') {
        res.status(400).json({ error: 'Room does not support creature spawning' });
        return;
      }

      // Look up creature template from content store (stays in routes — needs deps)
      const creatureStore = deps.contentStores?.get('creatures');
      if (!creatureStore) {
        res.status(500).json({ error: 'Content store not available — cannot resolve creature template' });
        return;
      }

      const templateEntity = await creatureStore.getById(templateId);
      if (!templateEntity) {
        res.status(404).json({ error: `Creature template "${templateId}" not found` });
        return;
      }

      const template = contentEntityToCreatureTemplate(templateEntity);
      const result = zoneRoom.adminSpawnCreature(template, targetRoomId) as { success: boolean; error?: string; creatureId?: string; creatureName?: string };
      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      const response: AdminSpawnCreatureResponse = {
        success: true,
        creatureId: result.creatureId!,
        creatureName: result.creatureName!,
        spawnRoomId: targetRoomId,
        message: `Spawned "${result.creatureName}" (${result.creatureId}) in room ${targetRoomId}`,
      };
      res.json(response);
    } catch (err) {
      console.error('[Admin] Failed to spawn creature:', err);
      res.status(500).json({ error: 'Failed to spawn creature' });
    }
  });

  // ─── GET /admin/api/sse — Server-Sent Events stream ─────────────────────
  // Real-time metrics stream consumed by the inline HTML dashboard (/admin/).
  // TODO: Wire to React admin UI for live-updating server monitoring. The stream
  // sends room counts, creature stats, narration metrics, and backend flags
  // every 2 seconds. Auth via query param ?token= (SSE doesn't support headers).
  router.get('/admin/api/sse', (req: Request, res: Response) => {
    const adminToken = process.env['ADMIN_TOKEN'];
    const queryToken = req.query['token'] as string | undefined;

    if (!adminToken || queryToken !== adminToken) {
      res.status(403).json({ error: 'Invalid admin token' });
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    // Send initial snapshot
    sendSSESnapshot(res, deps);

    // Poll every 2 seconds for updates
    const intervalId = setInterval(() => {
      sendSSESnapshot(res, deps);
    }, 2000);

    req.on('close', () => {
      clearInterval(intervalId);
    });
  });

  return router;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Safe matchMaker.query — returns [] if Colyseus isn't initialized. */
async function safeQueryRooms(): Promise<Awaited<ReturnType<typeof matchMaker.query>>> {
  try {
    return await matchMaker.query({});
  } catch {
    return [];
  }
}

/** Safe getLocalRoomById — returns undefined if room not found. */
function safeGetRoom(roomId: string): import('@colyseus/core').Room | undefined {
  try {
    return matchMaker.getLocalRoomById(roomId) ?? undefined;
  } catch {
    return undefined;
  }
}

function getZoneDetail(room: import('@colyseus/core').Room): AdminZoneDetail {
  const state = room.state as {
    zoneId?: string;
    lifecycle?: string;
    stability?: number;
    collapseTimer?: number;
    tick?: number;
    playerCount?: number;
  };

  // Access internal players map via bracket notation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playersMap = (room as any)['players'] as
    | Map<string, { sessionId: string; currentRoomId: string; inventory: Map<string, unknown>; currentWeight: number; maxCarryWeight: number }>
    | undefined;

  const players: AdminPlayerInfo[] = [];
  if (playersMap) {
    for (const [, ps] of playersMap) {
      players.push({
        sessionId: ps.sessionId,
        currentRoomId: ps.currentRoomId,
        inventoryCount: ps.inventory.size,
        currentWeight: ps.currentWeight,
        maxCarryWeight: ps.maxCarryWeight,
      });
    }
  }

  // Access creature manager for debug visibility
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const creatureManager = (room as any)['creatureManager'] as
    | { getAllCreatures(): Array<{ id: string; name: string; type: string; hp: number; maxHp: number; currentRoomId: string; behaviorState: string; isAlive: boolean }> }
    | undefined;

  const creatures: AdminCreatureInfo[] = [];
  if (creatureManager) {
    for (const c of creatureManager.getAllCreatures()) {
      creatures.push({
        id: c.id,
        name: c.name,
        type: c.type,
        hp: c.hp,
        maxHp: c.maxHp,
        currentRoomId: c.currentRoomId,
        behaviorState: c.behaviorState,
        isAlive: c.isAlive,
      });
    }
  }

  // Resolve zone slug via public accessor
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const zoneSlug = typeof (room as any).getZoneSlug === 'function'
    ? (room as any).getZoneSlug() as string | undefined
    : undefined;

  return {
    roomId: room.roomId,
    name: 'zone',
    clients: room.clients.length,
    lifecycle: state.lifecycle ?? 'unknown',
    stability: state.stability ?? 0,
    collapseTimer: state.collapseTimer ?? 0,
    tick: state.tick ?? 0,
    playerCount: state.playerCount ?? 0,
    paused: !room.clock.running,
    players,
    creatures,
    zoneSlug,
  };
}

function getRefugeDetail(room: import('@colyseus/core').Room): AdminRefugeDetail {
  const state = room.state as {
    tick?: number;
    playerCount?: number;
  };

  return {
    roomId: room.roomId,
    name: 'refuge',
    clients: room.clients.length,
    tick: state.tick ?? 0,
    playerCount: state.playerCount ?? 0,
    paused: !room.clock.running,
  };
}

function getZonePlayers(room: import('@colyseus/core').Room): AdminPlayerInfo[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playersMap = (room as any)['players'] as
    | Map<string, { sessionId: string; currentRoomId: string; inventory: Map<string, unknown>; currentWeight: number; maxCarryWeight: number }>
    | undefined;

  if (!playersMap) return [];

  const players: AdminPlayerInfo[] = [];
  for (const [, ps] of playersMap) {
    players.push({
      sessionId: ps.sessionId,
      currentRoomId: ps.currentRoomId,
      inventoryCount: ps.inventory.size,
      currentWeight: ps.currentWeight,
      maxCarryWeight: ps.maxCarryWeight,
    });
  }
  return players;
}

function getCacheSize(cache: NarrationCache | undefined): number {
  if (!cache) return 0;
  // InMemoryNarrationCache exposes .size
  if ('size' in cache && typeof (cache as InMemoryNarrationCache).size === 'number') {
    return (cache as InMemoryNarrationCache).size;
  }
  return 0;
}

async function sendSSESnapshot(res: Response, deps: AdminRouterDeps): Promise<void> {
  try {
    const rooms = await safeQueryRooms();
    const zones = rooms.filter((r) => r.name === 'zone');
    const refuges = rooms.filter((r) => r.name === 'refuge');
    const totalPlayers = rooms.reduce((sum, r) => sum + r.clients, 0);

    const telemetry = deps.telemetry?.getTelemetry();
    const cacheSize = getCacheSize(deps.cache);

    // Count creatures across zones
    let totalCreatures = 0;
    let livingCreatures = 0;
    for (const zoneCache of zones) {
      const zoneRoom = safeGetRoom(zoneCache.roomId);
      if (!zoneRoom) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cm = (zoneRoom as any)['creatureManager'] as
        | { getAllCreatures(): Array<{ isAlive: boolean }>; getLivingCreatures(): Array<unknown> }
        | undefined;
      if (cm) {
        totalCreatures += cm.getAllCreatures().length;
        livingCreatures += cm.getLivingCreatures().length;
      }
    }

    const data = {
      timestamp: Date.now(),
      uptime: process.uptime(),
      rooms: {
        total: rooms.length,
        zones: zones.length,
        refuges: refuges.length,
        totalPlayers,
        totalCreatures,
        livingCreatures,
        list: rooms.map((r) => ({
          roomId: r.roomId,
          name: r.name,
          clients: r.clients,
        })),
      },
      narration: {
        cache_hits: telemetry?.cache_hits ?? 0,
        cache_misses: telemetry?.cache_misses ?? 0,
        cache_hit_ratio: telemetry?.cache_hit_ratio ?? 0,
        cache_size: cacheSize,
        llm_calls: telemetry?.llm_calls ?? 0,
        llm_timeouts: telemetry?.llm_timeouts ?? 0,
        avg_llm_latency_ms: telemetry?.avg_llm_latency_ms ?? 0,
        fallback_rate: telemetry?.fallback_rate ?? 0,
      },
      redis: {
        cache_backend: deps.isCacheRedis ? 'redis' : 'in-memory',
        presence_backend: deps.isPresenceRedis ? 'redis' : 'local',
      },
      persistence: {
        stash_backend: deps.isStashPg ? 'postgresql' : 'in-memory',
      },
    };

    res.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch {
    // SSE error — client may have disconnected
  }
}
