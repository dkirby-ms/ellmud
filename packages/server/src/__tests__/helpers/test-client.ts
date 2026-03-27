/**
 * Test client helpers — reduce boilerplate for connecting test clients
 * and waiting for initial messages.
 */
import { ColyseusTestServer } from '@colyseus/testing';
import { Server } from '@colyseus/core';
import { ShardRoom } from '../../rooms/ShardRoom.js';
import { MessageCollector } from './message-collector.js';

export interface TestClientHandle {
  client: Awaited<ReturnType<ColyseusTestServer['connectTo']>>;
  collector: MessageCollector;
}

/**
 * Boot a test server with ShardRoom defined.
 * Zone-mode tests pass `{ zoneSlug: 'the-refuge' }` as options.
 * Uses server.listen(0) so the OS assigns a random available port,
 * then patches server.port so ColyseusTestServer connects correctly.
 * (@colyseus/testing's boot() ignores the port param for Server instances.)
 */
export async function bootTestServer(): Promise<ColyseusTestServer> {
  const server = new Server();
  server.define('shard', ShardRoom);
  await server.listen(0);
  // After listen(0), the OS-assigned port is on the underlying HTTP server
  const addr = (server as unknown as { transport: { server: { address(): { port: number } } } }).transport.server.address();
  (server as unknown as { port: number }).port = addr.port;
  return new ColyseusTestServer(server);
}

/**
 * Create a room and connect a client with a MessageCollector already wired up.
 * Waits `settleMs` for initial join messages to arrive.
 */
export async function connectTestClient(
  colyseus: ColyseusTestServer,
  roomType: string = 'shard',
  options: Record<string, unknown> = {},
  settleMs = 500,
): Promise<TestClientHandle> {
  const room = await colyseus.createRoom(roomType, options);
  const client = await colyseus.connectTo(room);
  const collector = new MessageCollector(client);

  await new Promise((resolve) => setTimeout(resolve, settleMs));
  return { client, collector };
}

/**
 * Connect a client to an EXISTING room with a MessageCollector wired up.
 */
export async function connectToExistingRoom(
  colyseus: ColyseusTestServer,
  room: Awaited<ReturnType<ColyseusTestServer['createRoom']>>,
  settleMs = 500,
): Promise<TestClientHandle> {
  const client = await colyseus.connectTo(room);
  const collector = new MessageCollector(client);

  await new Promise((resolve) => setTimeout(resolve, settleMs));
  return { client, collector };
}

/**
 * Small delay helper — named for clarity in test code.
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait until a condition is met, checking every `intervalMs`. Returns true if
 * condition was met, false if timeout was reached.
 */
export async function waitUntil(
  condition: () => boolean,
  timeoutMs = 20000,
  intervalMs = 500,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (condition()) return true;
    await wait(intervalMs);
  }
  return condition();
}
