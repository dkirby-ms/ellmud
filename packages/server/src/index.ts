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
import { staticLimiter } from './middleware/rate-limit.js';
import rateLimit from 'express-rate-limit';
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
import { createAdminRouter, createDashboardRouter, createContentRouter, createDashboardApiRouter, initializeContentStores, createUserRouter, createAuditRouter, createSimulateRouter, createDeployRouter, createZoneRouter, initAdminAuth } from './admin/index.js';
import { getConfig, ZONE_DEFAULT_MAX_PLAYERS } from './config.js';
import { runMigrations } from './db/index.js';
import { createNarrationCache, createPresence, testRedisConnection } from './cache/index.js';
import { initStashProvider, isStashPg, loadItemDefsFromDb } from './stash/index.js';
import { initInventoryProvider } from './inventory/index.js';
import { initProfileProvider } from './player/index.js';
import { initFactionProvider } from './faction/index.js';
import { initRunHistoryProvider } from './run-history/index.js';
import { initLoadoutProvider } from './loadout/index.js';
import { initDeathPenaltyProvider } from './systems/index.js';
import { initMetricsProvider } from './metrics/index.js';
import { initCharacterProvider } from './character/index.js';
import { createCharacterRouter } from './api/characters.js';
import { createSpawnZoneRouter } from './api/spawn-zone.js';
import { createSettingsRouter } from './api/settings.js';
import { initUserSettingsProvider } from './db/UserSettingsRepository.js';
import { initCharacterFlagsProvider } from './db/CharacterFlagsRepository.js';
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

// ─── Inventory Persistence (#409) ───────────────────────────────────────────
initInventoryProvider(USE_PG);
console.log(`[Ellmud] Inventory persistence: ${USE_PG ? 'PostgreSQL' : 'in-memory'}`);

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

// ─── Gameplay Metrics ──────────────────────────────────────────────────────
initMetricsProvider(USE_PG);
console.log(`[Ellmud] Gameplay metrics: ${USE_PG ? 'PostgreSQL' : 'no-op'}`);

// ─── Character Persistence ──────────────────────────────────────────────────
initCharacterProvider(USE_PG);
console.log(`[Ellmud] Character persistence: ${USE_PG ? 'PostgreSQL' : 'in-memory'}`);

// ─── Zone Persistence ───────────────────────────────────────────────────────
initZoneProvider(USE_PG);
console.log(`[Ellmud] Zone persistence: ${USE_PG ? 'PostgreSQL' : 'in-memory'}`);

// ─── Exploration Persistence ────────────────────────────────────────────────
initExplorationProvider(USE_PG);
console.log(`[Ellmud] Exploration persistence: ${USE_PG ? 'PostgreSQL' : 'in-memory'}`);

// ─── User Settings Persistence ──────────────────────────────────────────────
initUserSettingsProvider(USE_PG);
console.log(`[Ellmud] User settings persistence: ${USE_PG ? 'PostgreSQL' : 'in-memory'}`);

// ─── Character Flags Persistence ────────────────────────────────────────────
initCharacterFlagsProvider(USE_PG);
console.log(`[Ellmud] Character flags persistence: ${USE_PG ? 'PostgreSQL' : 'in-memory'}`);

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

// Global rate limiter — baseline protection for all endpoints (500 req / 15 min per IP).
// Per-route limiters (authLimiter, apiLimiter, adminWriteLimiter) enforce tighter tiers.
if (process.env.ALLOW_LOCAL_AUTH !== 'true') {
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' },
  }));
}

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
  app.use(createAuthRouter(authService, playerRepo));
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

// ─── Spawn Zone API ─────────────────────────────────────────────────────────
app.use(createSpawnZoneRouter(authService));
console.log('[Ellmud] Spawn Zone API: enabled');

// ─── User Settings API ──────────────────────────────────────────────────────
app.use(createSettingsRouter({ authService }));
console.log('[Ellmud] User Settings API: enabled');

// Version endpoint — /api/version
app.use(createVersionRouter());

// Mount health check endpoint — includes Redis + persistence status
app.use(createHealthRouter({ isCacheRedis, isPresenceRedis, isStashPg: isStashPg() }));

// ─── Admin Dashboard ─────────────────────────────────────────────────────────
// Admin API at /admin/api/*, diagnostics dashboard at /monitor
// Protected by ADMIN_TOKEN (silent fallback) or session-based role check.

// Initialize role-based admin auth (enables session token + role check)
initAdminAuth(authService, playerRepo);
console.log('[Ellmud] Admin auth: session-based role check enabled');

// ─── AUTO_PROMOTE_ADMIN — Bootstrap first admin user ─────────────────────────
const AUTO_PROMOTE = process.env['AUTO_PROMOTE_ADMIN'];
if (AUTO_PROMOTE && USE_PG) {
  try {
    const { query: dbQuery } = await import('./db/index.js');
    // Find user by username (case-insensitive)
    const result = await dbQuery<{ id: string; identity_id: string; username: string }>(
      `SELECT p.id, p.identity_id, p.username
       FROM players p
       WHERE LOWER(p.username) = LOWER($1)`,
      [AUTO_PROMOTE],
    );
    if (result.rows.length > 0) {
      const { identity_id, username } = result.rows[0];
      const roleResult = await dbQuery<{ role: string }>(
        `SELECT role FROM player_identities WHERE id = $1`,
        [identity_id],
      );
      const currentRole = roleResult.rows[0]?.role ?? 'player';
      if (currentRole !== 'admin') {
        await dbQuery(
          `UPDATE player_identities SET role = 'admin' WHERE id = $1`,
          [identity_id],
        );
        console.log(`[Ellmud] AUTO_PROMOTE_ADMIN: Promoted '${username}' from '${currentRole}' to 'admin'`);
        // Audit the auto-promotion
        const { logAuditEvent } = await import('./admin/audit/audit-routes.js');
        logAuditEvent({
          action: 'role_change',
          entityType: 'user',
          entityId: result.rows[0].id,
          entityName: username,
          actor: 'system:auto-promote',
          details: { previousRole: currentRole, newRole: 'admin', trigger: 'AUTO_PROMOTE_ADMIN' },
        }).catch(() => {});
      } else {
        console.log(`[Ellmud] AUTO_PROMOTE_ADMIN: '${username}' is already admin`);
      }
    } else {
      console.log(`[Ellmud] AUTO_PROMOTE_ADMIN: User '${AUTO_PROMOTE}' not found — will promote when they register`);
    }
  } catch (err) {
    console.log('[Ellmud] AUTO_PROMOTE_ADMIN: Failed —', err instanceof Error ? err.message : String(err));
  }
}

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
app.use(staticLimiter, express.static(publicPath));

// Catch-all: serve index.html for client-side routing (GET only — does not
// interfere with Colyseus POST /matchmake/* routes).
// In dev mode the client dist may not exist; skip gracefully.
const indexHtml = path.join(publicPath, 'index.html');
app.get('*', staticLimiter, (_req, res) => {
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

// Ensure the-refuge is always registered (fallback debug hub for unaffiliated players)
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
console.log(`[Ellmud] Zone capacity: ${ZONE_DEFAULT_MAX_PLAYERS} default, ${config.maxPlayersPerZone} env override${process.env.MAX_PLAYERS_PER_ZONE ? ' (active)' : ''}`);
console.log(`[Ellmud] Max replicas: ${config.maxReplicas}`);
