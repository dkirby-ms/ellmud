/**
 * Player Identity Handoff — Integration Tests
 *
 * Validates the REAL onAuth → onJoin identity pipeline:
 *   register → get token → connect with { token } → room reads client.auth.playerId
 *
 * THE BUG THIS CATCHES:
 * Before the fix, both ShardRoom and RefugeRoom resolved playerId as:
 *   const playerId = (options['playerId'] as string) || client.sessionId;
 * When a client connects with a valid auth token, `options` contains { token: '...' }
 * but NOT { playerId: '...' }. The playerId lives on client.auth (set by onAuth),
 * not in options. So authenticated players were keyed by sessionId — a silent,
 * catastrophic identity failure.
 *
 * The fix reads client.auth first:
 *   const authData = client.auth as { playerId?: string } | undefined;
 *   const playerId = authData?.playerId || (options['playerId'] as string) || client.sessionId;
 *
 * LIMITATION: @colyseus/testing's connectTo() goes through the full Colyseus
 * matchmaker pipeline including instance onAuth. When initColyseusAuth() is
 * configured with an AuthService, the token passed in options IS validated by
 * onAuth, and client.auth IS populated. This means these tests exercise the
 * real auth path, not a mock.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ColyseusTestServer } from '@colyseus/testing';
import { Server } from '@colyseus/core';
import { ShardRoom } from '../rooms/ShardRoom.js';
import { RefugeRoom } from '../rooms/RefugeRoom.js';
import { AuthService } from '../auth/AuthService.js';
import { InMemoryTokenStore } from '../auth/TokenStore.js';
import { InMemoryPlayerRepository } from '../auth/PlayerRepository.js';
import { initColyseusAuth, resetColyseusAuth } from '../auth/colyseus-auth.js';
import { MessageCollector } from './helpers/message-collector.js';
import { wait } from './helpers/index.js';

// ─── Shared State ────────────────────────────────────────────────────────────

let colyseus: ColyseusTestServer;
let authService: AuthService;
let tokenStore: InMemoryTokenStore;

beforeAll(async () => {
  tokenStore = new InMemoryTokenStore();
  const playerRepo = new InMemoryPlayerRepository();
  authService = new AuthService(tokenStore, playerRepo);

  // Wire up auth so onAuth actually validates tokens
  initColyseusAuth(authService, false);

  const server = new Server();
  server.define('shard', ShardRoom);
  server.define('refuge', RefugeRoom);
  await server.listen(0);
  const addr = (
    server as unknown as { transport: { server: { address(): { port: number } } } }
  ).transport.server.address();
  (server as unknown as { port: number }).port = addr.port;
  colyseus = new ColyseusTestServer(server);
});

afterAll(async () => {
  await colyseus.shutdown();
  resetColyseusAuth();
  tokenStore.dispose();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Register a player and return their persistent UUID + token. */
async function registerPlayer(username: string, password = 'testpass123') {
  const result = await authService.register(username, password);
  return { playerId: result.playerId, token: result.token };
}

/** Access the server-side players map (Map<string, PlayerState>). */
function getServerPlayers(room: unknown): Map<string, unknown> {
  return (room as { players: Map<string, unknown> }).players;
}

/** Access the server-side playerIds map (Map<sessionId, playerId>). */
function getPlayerIdMap(room: unknown): Map<string, string> {
  return (room as { playerIds: Map<string, string> }).playerIds;
}

// ─── 1. The Core Bug: Auth Token → playerId Resolution ──────────────────────

describe('onAuth → onJoin identity handoff (ShardRoom)', () => {
  it('should use the authenticated playerId (UUID), NOT the sessionId', async () => {
    const { playerId, token } = await registerPlayer('AuthHero');

    const room = await colyseus.createRoom('shard', { collapseTimer: 120 });
    const client = await colyseus.connectTo(room, { token });
    const collector = new MessageCollector(client);
    await wait(500);

    const players = getServerPlayers(room);
    const playerIdMap = getPlayerIdMap(room);

    // THE critical assertion: player state MUST be keyed by the auth UUID
    expect(players.has(playerId)).toBe(true);
    // And it must NOT be keyed by the ephemeral sessionId
    expect(players.has(client.sessionId)).toBe(false);
    // The sessionId → playerId mapping must point to the auth UUID
    expect(playerIdMap.get(client.sessionId)).toBe(playerId);

    // Player should have received join messages (proves the join succeeded)
    expect(collector.narrate.length).toBeGreaterThan(0);

    await client.leave();
  });

  it('should use the same UUID whether player registered or logged in', async () => {
    const reg = await authService.register('LoginTest', 'testpass123');
    const login = await authService.login('LoginTest', 'testpass123');

    // Both tokens should resolve to the same playerId
    expect(login.playerId).toBe(reg.playerId);

    const room = await colyseus.createRoom('shard', { collapseTimer: 120 });
    const client = await colyseus.connectTo(room, { token: login.token });
    await wait(500);

    const players = getServerPlayers(room);
    expect(players.has(reg.playerId)).toBe(true);
    expect(players.has(client.sessionId)).toBe(false);

    await client.leave();
  });
});

describe('onAuth → onJoin identity handoff (RefugeRoom)', () => {
  it('should use the authenticated playerId in RefugeRoom too', async () => {
    const { playerId, token } = await registerPlayer('RefugeHero');

    const room = await colyseus.createRoom('refuge', {});
    const client = await colyseus.connectTo(room, { token });
    await wait(500);

    const playerIdMap = getPlayerIdMap(room);

    // RefugeRoom uses the same resolution logic — playerId must come from auth
    expect(playerIdMap.get(client.sessionId)).toBe(playerId);

    await client.leave();
  });
});

// ─── 2. Backward Compatibility: options['playerId'] Still Works ─────────────

describe('backward compatibility — options.playerId path', () => {
  it('should accept playerId from options (test harness pattern)', async () => {
    const room = await colyseus.createRoom('shard', { collapseTimer: 120 });
    const client = await colyseus.connectTo(room, { playerId: 'legacy-test-id' });
    await wait(500);

    const players = getServerPlayers(room);

    // Direct options.playerId should still work (existing test pattern)
    expect(players.has('legacy-test-id')).toBe(true);
    expect(players.has(client.sessionId)).toBe(false);

    await client.leave();
  });

  it('should fall back to sessionId when neither auth nor playerId is provided', async () => {
    const room = await colyseus.createRoom('shard', { collapseTimer: 120 });
    // No token, no playerId — anonymous join
    const client = await colyseus.connectTo(room, {});
    await wait(500);

    const players = getServerPlayers(room);

    // Anonymous join falls back to sessionId
    expect(players.has(client.sessionId)).toBe(true);

    await client.leave();
  });
});

// ─── 3. Priority: client.auth > options.playerId > sessionId ────────────────

describe('playerId resolution priority', () => {
  it('should prefer client.auth.playerId over options.playerId', async () => {
    const { playerId: authUuid, token } = await registerPlayer('PriorityHero');

    const room = await colyseus.createRoom('shard', { collapseTimer: 120 });
    // Pass BOTH token and playerId — auth should win
    const client = await colyseus.connectTo(room, {
      token,
      playerId: 'should-be-overridden',
    });
    await wait(500);

    const players = getServerPlayers(room);

    // The auth UUID takes priority over options.playerId
    expect(players.has(authUuid)).toBe(true);
    expect(players.has('should-be-overridden')).toBe(false);
    expect(players.has(client.sessionId)).toBe(false);

    await client.leave();
  });
});

// ─── 4. Multi-Player Auth Isolation ─────────────────────────────────────────

describe('authenticated multi-player isolation', () => {
  it('should give each authenticated player their own UUID-keyed state', async () => {
    const p1 = await registerPlayer('MultiAuth_A');
    const p2 = await registerPlayer('MultiAuth_B');

    const room = await colyseus.createRoom('shard', { collapseTimer: 120 });
    const c1 = await colyseus.connectTo(room, { token: p1.token });
    const c2 = await colyseus.connectTo(room, { token: p2.token });
    await wait(500);

    const players = getServerPlayers(room);

    // Each player keyed by their auth UUID
    expect(players.has(p1.playerId)).toBe(true);
    expect(players.has(p2.playerId)).toBe(true);

    // Neither keyed by sessionId
    expect(players.has(c1.sessionId)).toBe(false);
    expect(players.has(c2.sessionId)).toBe(false);

    // UUIDs are distinct
    expect(p1.playerId).not.toBe(p2.playerId);

    await c1.leave();
    await c2.leave();
  });
});

// ─── 5. Invalid / Expired Token ─────────────────────────────────────────────

describe('auth failure handling', () => {
  it('should reject connection when an invalid token is provided', async () => {
    // An explicitly-provided token MUST be valid. Invalid tokens should not
    // silently degrade to anonymous — the user intended to authenticate.
    const room = await colyseus.createRoom('shard', { collapseTimer: 120 });
    await expect(
      colyseus.connectTo(room, { token: 'bogus-token-xyz' }),
    ).rejects.toThrow(/expired|invalid/i);
  });

  it('should allow anonymous join when NO token is provided (auth optional)', async () => {
    const room = await colyseus.createRoom('shard', { collapseTimer: 120 });
    // No token at all — falls through to anonymous, then to sessionId
    const client = await colyseus.connectTo(room, {});
    await wait(500);

    const players = getServerPlayers(room);
    // Should join successfully using sessionId (anonymous playerId is filtered)
    expect(players.has(client.sessionId)).toBe(true);

    await client.leave();
  });
});

// ─── 6. Full Register → Login → Join → Verify Pipeline ─────────────────────

describe('full auth pipeline integration', () => {
  it('register → login → join shard → state keyed by persistent UUID', async () => {
    // Step 1: Register (simulates POST /auth/register)
    const reg = await authService.register('PipelineHero', 'securePass1');

    // Step 2: Login (simulates POST /auth/login)
    const login = await authService.login('PipelineHero', 'securePass1');
    expect(login.playerId).toBe(reg.playerId);

    // Step 3: Join with login token (simulates client.joinOrCreate('shard', { token }))
    const room = await colyseus.createRoom('shard', { collapseTimer: 120 });
    const client = await colyseus.connectTo(room, { token: login.token });
    const collector = new MessageCollector(client);
    await wait(500);

    // Step 4: Verify identity handoff
    const players = getServerPlayers(room);
    const playerIdMap = getPlayerIdMap(room);

    // The persistent UUID from the players table should be the key
    expect(players.has(reg.playerId)).toBe(true);
    expect(playerIdMap.get(client.sessionId)).toBe(reg.playerId);
    // NOT the ephemeral sessionId
    expect(players.has(client.sessionId)).toBe(false);

    // Game state operations should work normally
    expect(collector.narrate.length).toBeGreaterThan(0);
    expect(collector.narrate[0]!.text).toContain('rift');

    await client.leave();
  });

  it('register → login → join refuge → stash loads with correct playerId', async () => {
    const reg = await authService.register('RefugePipe', 'securePass1');
    const login = await authService.login('RefugePipe', 'securePass1');

    const room = await colyseus.createRoom('refuge', {});
    const client = await colyseus.connectTo(room, { token: login.token });
    const collector = new MessageCollector(client);
    await wait(500);

    const playerIdMap = getPlayerIdMap(room);

    // playerId from auth should be used for stash loading
    expect(playerIdMap.get(client.sessionId)).toBe(reg.playerId);

    // Refuge join messages should arrive
    expect(collector.narrate.length).toBeGreaterThan(0);

    await client.leave();
  });
});
