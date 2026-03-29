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
  AdminShardDetail,
  AdminRefugeDetail,
  AdminPlayerInfo,
  AdminCreatureInfo,
  AdminMetrics,
} from './types.js';
import type { ContentEntity, IContentStore } from './content/ContentStore.js';
import type { ContentEntityType } from './content/content-types.js';
import type { CreatureTemplate } from '../creatures/types.js';

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

  // ─── GET /admin/api/rooms/:roomId — Room detail ──────────────────────────
  router.get('/admin/api/rooms/:roomId', adminAuth, async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params;
      const room = safeGetRoom(roomId);

      if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }

      if (room.roomName === 'shard') {
        const detail = getShardDetail(room);
        res.json(detail);
      } else if (room.roomName === 'refuge') {
        const detail = getRefugeDetail(room);
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

  // ─── GET /admin/api/creatures — List all creatures across shards ──────────
  router.get('/admin/api/creatures', adminAuth, async (_req: Request, res: Response) => {
    try {
      const rooms = await safeQueryRooms();
      const creatures: Array<AdminCreatureInfo & { shardRoomId: string }> = [];

      for (const roomCache of rooms) {
        if (roomCache.name !== 'shard') continue;
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
              shardRoomId: roomCache.roomId,
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
      const { getAllCreatureTemplates } = await import('../creatures/CreatureManager.js');
      const templates = getAllCreatureTemplates();
      res.json({ templates, count: templates.length });
    } catch (err) {
      console.error('[Admin] Failed to list creature templates:', err);
      res.status(500).json({ error: 'Failed to list creature templates' });
    }
  });

  // ─── GET /admin/api/items — List all item definitions ────────────────────
  router.get('/admin/api/items', adminAuth, async (_req: Request, res: Response) => {
    try {
      const { getAllItemDefinitions } = await import('../items/registry.js');
      const items = getAllItemDefinitions();
      res.json({ items, count: items.length });
    } catch (err) {
      console.error('[Admin] Failed to list items:', err);
      res.status(500).json({ error: 'Failed to list items' });
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

        if (room.roomName === 'shard') {
          const shardPlayers = getShardPlayers(room);
          for (const p of shardPlayers) {
            players.push({ ...p, roomId: roomCache.roomId, roomName: 'shard' });
          }
        } else if (room.roomName === 'refuge') {
          // Refuge doesn't have PlayerState objects, just session→playerId mapping
          for (const client of room.clients) {
            players.push({
              sessionId: client.sessionId,
              currentRoomId: 'refuge',
              inventoryCount: 0,
              currentWeight: 0,
              maxCarryWeight: 0,
              roomId: roomCache.roomId,
              roomName: 'refuge',
            });
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
      const shards = rooms.filter((r) => r.name === 'shard');
      const refuges = rooms.filter((r) => r.name === 'refuge');
      const totalPlayers = rooms.reduce((sum, r) => sum + r.clients, 0);

      const telemetry = deps.telemetry?.getTelemetry();
      const cacheSize = getCacheSize(deps.cache);

      const metrics: AdminMetrics = {
        uptime: process.uptime(),
        timestamp: Date.now(),
        rooms: {
          total: rooms.length,
          shards: shards.length,
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
            message: `Broadcast spawn of "${id}" — room has no creature manager (non-shard room)`,
          });
          return;
        }

        // Determine spawn room — use targetRoomId if provided, otherwise pick
        // first room from the shard's room graph
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

        // Cast to CreatureTemplate (content store entity has the same shape + id field)
        const template = templateEntity as unknown as CreatureTemplate;
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

  // ─── GET /admin — Serve dashboard HTML ──────────────────────────────────
  router.get('/admin', (_req: Request, res: Response) => {
    // Serve inline — no file dependency needed
    res.redirect('/admin/');
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

function getShardDetail(room: import('@colyseus/core').Room): AdminShardDetail {
  const state = room.state as {
    shardId?: string;
    biome?: string;
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

  return {
    roomId: room.roomId,
    name: 'shard',
    clients: room.clients.length,
    biome: state.biome ?? 'unknown',
    lifecycle: state.lifecycle ?? 'unknown',
    stability: state.stability ?? 0,
    collapseTimer: state.collapseTimer ?? 0,
    tick: state.tick ?? 0,
    playerCount: state.playerCount ?? 0,
    paused: !room.clock.running,
    players,
    creatures,
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

function getShardPlayers(room: import('@colyseus/core').Room): AdminPlayerInfo[] {
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
    const shards = rooms.filter((r) => r.name === 'shard');
    const refuges = rooms.filter((r) => r.name === 'refuge');
    const totalPlayers = rooms.reduce((sum, r) => sum + r.clients, 0);

    const telemetry = deps.telemetry?.getTelemetry();
    const cacheSize = getCacheSize(deps.cache);

    // Count creatures across shards
    let totalCreatures = 0;
    let livingCreatures = 0;
    for (const shardCache of shards) {
      const shardRoom = safeGetRoom(shardCache.roomId);
      if (!shardRoom) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cm = (shardRoom as any)['creatureManager'] as
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
        shards: shards.length,
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
