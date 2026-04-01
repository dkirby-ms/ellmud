// Load .env from monorepo root (no-op in production where env vars come from the container)
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirnameInit = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirnameInit, '../../../.env') });

import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { monitor } from '@colyseus/monitor';
import express from 'express';
import http from 'http';
import { ZoneRoom } from './rooms/index.js';
import {
  AuthService,
  InMemoryTokenStore,
  PgTokenStore,
  InMemoryPlayerRepository,
  PgPlayerRepository,
  createAuthRouter,
  initColyseusAuth,
  EntraAuthService,
  createEntraRouter,
  type EntraConfig,
} from './auth/index.js';
import { createHealthRouter } from './health.js';
import { createVersionRouter } from './api/version.js';
import { createAdminRouter, createDashboardRouter, createContentRouter, createDashboardApiRouter, initializeContentStores, createUserRouter, createAuditRouter, createSimulateRouter, createDeployRouter, createZoneRouter } from './admin/index.js';
import { getConfig } from './config.js';
import { runMigrations } from './db/index.js';
import { createNarrationCache, createPresence, testRedisConnection } from './cache/index.js';
import { initStashProvider, isStashPg, loadItemDefsFromDb } from './stash/index.js';
import { initProfileProvider } from './player/index.js';
import { initFactionProvider } from './faction/index.js';
import { initRunHistoryProvider } from './run-history/index.js';
import { initLoadoutProvider } from './loadout/index.js';
import { initDeathPenaltyProvider } from './systems/index.js';
import { initCharacterProvider } from './character/index.js';
import { createCharacterRouter } from './api/characters.js';
import { initZoneProvider, getZoneRepository } from './zones/index.js';
import { initExplorationProvider } from './exploration/index.js';
import { initContentRegistry } from './content/index.js';

const config = getConfig();
const PORT = config.port;
const AUTH_REQUIRED = config.authRequired;
let USE_PG = !!process.env.DATABASE_URL;

// Log Redis connection info for diagnostics (mask password)
if (config.redis.enabled || config.redis.cacheEnabled || config.redis.driverEnabled) {
  const masked = config.redis.connectionString.replace(/:([^@]+)@/, ':***@');
  console.log(`[Ellmud] Redis connection: ${masked}`);
}

// Validate DATABASE_URL format if present
if (USE_PG) {
  try {
    new URL(process.env.DATABASE_URL!);
  } catch {
    console.log('[Ellmud] ⚠ DATABASE_URL is set but cannot be parsed as a valid URL');
    console.log('[Ellmud]   This usually means the password contains characters that need percent-encoding');
    console.log('[Ellmud]   Characters like | < > { } must be encoded (e.g., | → %7C, < → %3C)');
    console.log('[Ellmud]   Falling back to in-memory persistence');
    USE_PG = false;
  }
}

// ─── Database Bootstrap ──────────────────────────────────────────────────────
if (USE_PG) {
  console.log('[Ellmud] DATABASE_URL detected — running PostgreSQL migrations…');
  try {
    await runMigrations();
    console.log('[Ellmud] Migrations complete.');
  } catch (err) {
    console.log('[Ellmud] ⚠ PostgreSQL migration failed — starting without database persistence');
    console.log('[Ellmud] Error details:', err instanceof Error ? err.message : String(err));
    USE_PG = false;
  }
}

// ─── Stash Persistence ──────────────────────────────────────────────────────
initStashProvider(USE_PG);
if (USE_PG) {
  const count = await loadItemDefsFromDb();
  console.log(`[Ellmud] Loaded ${count} item definitions from database.`);
}
console.log(`[Ellmud] Stash persistence: ${USE_PG ? 'PostgreSQL' : 'in-memory'}`);

// ─── Player Profile Persistence ─────────────────────────────────────────────
initProfileProvider(USE_PG);
console.log(`[Ellmud] Profile persistence: ${USE_PG ? 'PostgreSQL' : 'in-memory'}`);

// ─── Faction Persistence ────────────────────────────────────────────────────
initFactionProvider(USE_PG);
console.log(`[Ellmud] Faction persistence: ${USE_PG ? 'PostgreSQL' : 'in-memory'}`);

// ─── Run History Persistence ────────────────────────────────────────────────
initRunHistoryProvider(USE_PG);
console.log(`[Ellmud] Run history persistence: ${USE_PG ? 'PostgreSQL' : 'in-memory'}`);

// ─── Loadout Persistence ────────────────────────────────────────────────────
initLoadoutProvider(USE_PG);
console.log(`[Ellmud] Loadout persistence: ${USE_PG ? 'PostgreSQL' : 'in-memory'}`);

// ─── Death Penalty Persistence ─────────────────────────────────────────────
initDeathPenaltyProvider(USE_PG);
console.log(`[Ellmud] Death penalty persistence: ${USE_PG ? 'PostgreSQL' : 'in-memory'}`);

// ─── Character Persistence ──────────────────────────────────────────────────
initCharacterProvider(USE_PG);
console.log(`[Ellmud] Character persistence: ${USE_PG ? 'PostgreSQL' : 'in-memory'}`);

// ─── Zone Persistence ───────────────────────────────────────────────────────
initZoneProvider(USE_PG);
console.log(`[Ellmud] Zone persistence: ${USE_PG ? 'PostgreSQL' : 'in-memory'}`);

// ─── Exploration Persistence ────────────────────────────────────────────────
initExplorationProvider(USE_PG);
console.log(`[Ellmud] Exploration persistence: ${USE_PG ? 'PostgreSQL' : 'in-memory'}`);

// ─── Content Registry (DB-driven creature/item definitions) ─────────────────
if (USE_PG) {
  try {
    const { getPool } = await import('./db/index.js');
    await initContentRegistry(getPool());
  } catch (err) {
    console.log('[Ellmud] ⚠ ContentRegistry initialization failed — using code fallback');
    console.log('[Ellmud] Error:', err instanceof Error ? err.message : String(err));
  }
} else {
  console.log('[Ellmud] Content registry: code fallback (no DATABASE_URL)');
}
// ─── Redis Bootstrap ─────────────────────────────────────────────────────────
const { cache: narrationCache, isRedis: isCacheRedis } = await createNarrationCache(config);
const { presence, isRedis: isPresenceRedis } = await createPresence(config);

const app = express();
app.use(express.json());

// Trust the Azure Container Apps load balancer for correct protocol detection
app.set('trust proxy', 1);

// ─── Auth Setup ──────────────────────────────────────────────────────────────
const tokenStore = USE_PG ? new PgTokenStore() : new InMemoryTokenStore();
const playerRepo = USE_PG ? new PgPlayerRepository() : new InMemoryPlayerRepository();
const authService = new AuthService(tokenStore, playerRepo);
console.log(`[Ellmud] Token persistence: ${USE_PG ? 'PostgreSQL' : 'in-memory'}`);

// Mount local auth routes (only if ALLOW_LOCAL_AUTH is true)
const ALLOW_LOCAL_AUTH = process.env.ALLOW_LOCAL_AUTH !== 'false';
if (ALLOW_LOCAL_AUTH) {
  app.use(createAuthRouter(authService));
  console.log('[Ellmud] Local authentication: enabled');
} else {
  console.log('[Ellmud] Local authentication: disabled (OAuth only)');
}

// Initialize and mount Entra OAuth routes
const entraConfig: EntraConfig = {
  clientId: process.env.ENTRA_CLIENT_ID || '',
  clientSecret: process.env.ENTRA_CLIENT_SECRET || '',
  tenantId: process.env.ENTRA_TENANT_ID || '',
  tenantSubdomain: process.env.ENTRA_TENANT_SUBDOMAIN || '',
  redirectUri: process.env.ENTRA_REDIRECT_URI || 'http://localhost:3000/auth/entra/callback',
};

if (entraConfig.clientId && entraConfig.clientSecret && entraConfig.tenantId) {
  const entraService = new EntraAuthService(entraConfig);
  try {
    await entraService.initialize();
    app.use(createEntraRouter(authService, entraService));
    console.log('[Ellmud] Entra External ID OAuth: enabled');
  } catch (err) {
    console.log('[Ellmud] ⚠ Entra OAuth initialization failed:', err instanceof Error ? err.message : String(err));
    console.log('[Ellmud] Continuing without Entra authentication');
  }
} else {
  console.log('[Ellmud] Entra OAuth: disabled (missing ENTRA_* env vars)');
}

// ─── Character API ───────────────────────────────────────────────────────────
app.use(createCharacterRouter(authService, USE_PG));
console.log('[Ellmud] Character API: enabled');

// Version endpoint — /api/version
app.use(createVersionRouter());

// Mount health check endpoint — includes Redis + persistence status
app.use(createHealthRouter({ isCacheRedis, isPresenceRedis, isStashPg: isStashPg() }));

// ─── Admin Dashboard ─────────────────────────────────────────────────────────
// Admin API at /admin/api/*, diagnostics dashboard at /monitor
// Protected by ADMIN_TOKEN env var — admin auth is separate from player auth.

// Content CRUD API — admin-managed game content (items, creatures, etc.)
const contentStores = initializeContentStores(USE_PG);
app.use(createContentRouter({ stores: contentStores }));
app.use(createDashboardApiRouter({ stores: contentStores, usePg: USE_PG }));
console.log(`[Ellmud] Content store: ${USE_PG ? 'PostgreSQL' : 'in-memory'}`);

// Audit log API — query admin action history
app.use(createAuditRouter());
console.log('[Ellmud] Audit log API: enabled');

// Simulation API — test game mechanics (loot drops, creature stat rolls)
app.use(createSimulateRouter({ stores: contentStores }));

// Deploy API — content deployment simulation (staging, production)
app.use('/admin/api/deploy', createDeployRouter());
console.log('[Ellmud] Deploy API: enabled');

// Zone management CRUD — admin-managed MUD zones (rooms, exits)
app.use(createZoneRouter());
console.log('[Ellmud] Zone management API: enabled');

// Admin runtime API — room management, metrics, SSE. Receives contentStores for spawn.
app.use(createAdminRouter({ cache: narrationCache, isCacheRedis, isPresenceRedis, isStashPg: isStashPg(), contentStores }));

// User management CRUD — admin-only user accounts
if (USE_PG) {
  app.use(createUserRouter());
  console.log('[Ellmud] User management API: enabled (PostgreSQL)');
}

app.use('/monitor', createDashboardRouter());

// Initialize Colyseus room auth hooks
initColyseusAuth(authService, AUTH_REQUIRED);

// Colyseus monitor (admin dashboard) — serves Schema state for admin visibility
app.use('/colyseus', monitor());

// Serve client static files (client build output lives in packages/client/dist)
const publicPath = path.resolve(__dirnameInit, '../../client/dist');
app.use(express.static(publicPath));

// Catch-all: serve index.html for client-side routing (GET only — does not
// interfere with Colyseus POST /matchmake/* routes).
// In dev mode the client dist may not exist; skip gracefully.
const indexHtml = path.join(publicPath, 'index.html');
app.get('*', (_req, res) => {
  res.sendFile(indexHtml, (err) => {
    if (err) res.status(404).end();
  });
});

// Create HTTP server from Express but don't listen yet — Colyseus's
// Server.listen() will call httpServer.listen(PORT) AND register matchmaking
// routes (POST /matchmake/joinOrCreate/:roomName, etc.) via
// bindRouterToTransport, which prepends a handler that intercepts Colyseus
// routes before Express sees them.
const httpServer = http.createServer(app);

// ─── Matchmaker Driver Setup ────────────────────────────────────────────────
// When Redis driver is enabled, use RedisDriver for matchmaker coordination
// across replicas. Otherwise, use default local driver (single replica only).
let driver = undefined;
if (config.redis.driverEnabled && config.redis.enabled) {
  // Pre-validate Redis before constructing RedisDriver — the Colyseus
  // package emits unhandled ioredis `error` events on connection failure.
  const driverProbe = await testRedisConnection(config.redis.connectionString);
  if (!driverProbe.reachable) {
    console.warn('[Ellmud] Redis unreachable — using local matchmaker driver:', driverProbe.error);
  } else {
    try {
      const { RedisDriver } = await import('@colyseus/redis-driver');
      driver = new RedisDriver(config.redis.connectionString);
      console.log('[Ellmud] Matchmaker driver: Redis (multi-replica)');
    } catch (err) {
      console.warn('[Ellmud] Redis driver unavailable — using local driver:', (err as Error).message);
    }
  }
}

const server = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
  presence,
  driver,
});

// Register room types
server.define('zone', ZoneRoom);

// Dynamic zone registration — register each zone from the zone repository
const registeredZoneSlugs = new Set<string>();
try {
  const zoneRepo = getZoneRepository();
  const zones = await zoneRepo.getAllZones();
  for (const zone of zones) {
    const roomName = `zone:${zone.slug}`;
    server.define(roomName, ZoneRoom);
    registeredZoneSlugs.add(zone.slug);
    console.log(`[Ellmud] Registered zone: ${roomName}`);
  }
} catch (err) {
  console.log('[Ellmud] Failed to load zones for registration:', err instanceof Error ? err.message : String(err));
}

// Ensure the-refuge is always registered (fallback if not in DB)
if (!registeredZoneSlugs.has('the-refuge')) {
  server.define('zone:the-refuge', ZoneRoom);
  console.log('[Ellmud] Registered zone: zone:the-refuge (fallback)');
}

await server.listen(PORT);

console.log(`[Ellmud] Colyseus server listening on ws://localhost:${PORT}`);
console.log(`[Ellmud] Admin monitor at http://localhost:${PORT}/colyseus`);
console.log(`[Ellmud] Admin dashboard at http://localhost:${PORT}/monitor`);
console.log(`[Ellmud] Auth required: ${AUTH_REQUIRED}`);
console.log(`[Ellmud] Cache: ${isCacheRedis ? 'Redis' : 'in-memory'}, Presence: ${isPresenceRedis ? 'Redis' : 'local'}`);
console.log(`[Ellmud] Matchmaker driver: ${config.redis.driverEnabled ? 'Redis' : 'local'}`);
console.log(`[Ellmud] Stash persistence: ${isStashPg() ? 'PostgreSQL' : 'in-memory'}`);
console.log(`[Ellmud] Max players/zone (default): ${config.maxPlayersPerZone}, Max replicas: ${config.maxReplicas}`);
