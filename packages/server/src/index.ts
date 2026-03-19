import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { monitor } from '@colyseus/monitor';
import express from 'express';
import { ShardRoom, RefugeRoom } from './rooms/index.js';

const PORT = Number(process.env['PORT'] ?? 2567);

const app = express();
app.use(express.json());

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
