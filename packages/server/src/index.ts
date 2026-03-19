import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { monitor } from '@colyseus/monitor';
import express from 'express';
import { ShardRoom, RefugeRoom } from './rooms/index.js';
import {
  AuthService,
  InMemoryTokenStore,
  InMemoryPlayerRepository,
  createAuthRouter,
  initColyseusAuth,
} from './auth/index.js';
import { createHealthRouter } from './health.js';
import { getConfig } from './config.js';

const config = getConfig();
const PORT = config.port;
const AUTH_REQUIRED = config.authRequired;

const app = express();
app.use(express.json());

// ─── Auth Setup ──────────────────────────────────────────────────────────────
const tokenStore = new InMemoryTokenStore();
const playerRepo = new InMemoryPlayerRepository();
const authService = new AuthService(tokenStore, playerRepo);

// Mount auth routes on the same Express app Colyseus uses
app.use(createAuthRouter(authService));

// Mount health check endpoint
app.use(createHealthRouter());


// Initialize Colyseus room auth hooks
initColyseusAuth(authService, AUTH_REQUIRED);

// Colyseus monitor (admin dashboard) — serves Schema state for admin visibility
app.use('/colyseus', monitor());

const server = new Server({
  transport: new WebSocketTransport({ server: app.listen(PORT) }),
});

// Register room types
server.define('shard', ShardRoom);
server.define('refuge', RefugeRoom);

console.log(`[Ellmud] Colyseus server listening on ws://localhost:${PORT}`);
console.log(`[Ellmud] Admin monitor at http://localhost:${PORT}/colyseus`);
console.log(`[Ellmud] Auth required: ${AUTH_REQUIRED}`);
console.log(`[Ellmud] Max players/shard: ${config.maxPlayersPerShard}, Matchmaker: ${config.matchmakerMode}, Redis: ${config.redis.enabled ? 'enabled' : 'disabled'}`);
