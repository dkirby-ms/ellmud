import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { AuthService, AuthError } from '../auth/AuthService.js';
import { InMemoryTokenStore } from '../auth/TokenStore.js';
import { InMemoryPlayerRepository, DuplicateUsernameError } from '../auth/PlayerRepository.js';
import {
  authenticateClient,
  initColyseusAuth,
  resetColyseusAuth,
} from '../auth/colyseus-auth.js';
import { createAuthRouter } from '../auth/routes.js';
import express from 'express';
import { ColyseusTestServer } from '@colyseus/testing';
import { Server } from '@colyseus/core';
import { ShardRoom } from '../rooms/ShardRoom.js';
import { RefugeRoom } from '../rooms/RefugeRoom.js';
import { MessageTypes } from '@ellmud/shared';
import type { NarrateMessage } from '@ellmud/shared';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createAuthService() {
  const tokenStore = new InMemoryTokenStore();
  const playerRepo = new InMemoryPlayerRepository();
  const authService = new AuthService(tokenStore, playerRepo);
  return { authService, tokenStore, playerRepo };
}

function createTestApp(authService: AuthService) {
  const app = express();
  app.use(express.json());
  app.use(createAuthRouter(authService));
  return app;
}

async function requestJson(
  app: express.Express,
  method: 'get' | 'post',
  path: string,
  body?: Record<string, unknown>,
  headers?: Record<string, string>,
): Promise<{ status: number; body: Record<string, unknown> }> {
  // Use a lightweight approach: create a test server, make the request, close it
  const server = app.listen(0);
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;

  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        ...(headers ?? {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json() as Record<string, unknown>;
    return { status: res.status, body: json };
  } finally {
    server.close();
  }
}

// ─── AuthService Unit Tests ──────────────────────────────────────────────────

describe('AuthService', () => {
  let authService: AuthService;
  let tokenStore: InMemoryTokenStore;

  beforeEach(() => {
    const deps = createAuthService();
    authService = deps.authService;
    tokenStore = deps.tokenStore;
  });

  afterEach(() => {
    tokenStore.dispose();
  });

  // ── Registration ──

  describe('register', () => {
    it('should register a new player and return token', async () => {
      const result = await authService.register('TestHero', 'password123');
      expect(result.playerId).toBeDefined();
      expect(result.token).toBeDefined();
      expect(typeof result.playerId).toBe('string');
      expect(typeof result.token).toBe('string');
    });

    it('should reject duplicate usernames (case-insensitive)', async () => {
      await authService.register('Drizzt', 'password123');
      await expect(authService.register('drizzt', 'otherpass1')).rejects.toThrow(DuplicateUsernameError);
    });

    it('should reject empty username', async () => {
      await expect(authService.register('', 'password123')).rejects.toThrow(AuthError);
    });

    it('should reject empty password', async () => {
      await expect(authService.register('TestHero', '')).rejects.toThrow(AuthError);
    });

    it('should reject username shorter than 3 characters', async () => {
      await expect(authService.register('ab', 'password123')).rejects.toThrow('3-20 characters');
    });

    it('should reject username longer than 20 characters', async () => {
      await expect(authService.register('a'.repeat(21), 'password123')).rejects.toThrow('3-20 characters');
    });

    it('should reject password shorter than 6 characters', async () => {
      await expect(authService.register('TestHero', '12345')).rejects.toThrow('at least 6');
    });

    it('should reject username with invalid characters', async () => {
      await expect(authService.register('test hero!', 'password123')).rejects.toThrow('letters, numbers');
    });
  });

  // ── Login ──

  describe('login', () => {
    it('should login with correct credentials', async () => {
      const reg = await authService.register('TestHero', 'password123');
      const login = await authService.login('TestHero', 'password123');
      expect(login.playerId).toBe(reg.playerId);
      expect(login.token).toBeDefined();
      expect(login.token).not.toBe(reg.token); // Different session
    });

    it('should reject wrong password', async () => {
      await authService.register('TestHero', 'password123');
      await expect(authService.login('TestHero', 'wrongpass')).rejects.toThrow('Invalid username or password');
    });

    it('should reject nonexistent user', async () => {
      await expect(authService.login('nobody', 'password123')).rejects.toThrow('Invalid username or password');
    });

    it('should reject empty credentials', async () => {
      await expect(authService.login('', '')).rejects.toThrow(AuthError);
    });
  });

  // ── Token Validation ──

  describe('validateToken', () => {
    it('should validate a valid token', async () => {
      const result = await authService.register('TestHero', 'password123');
      const payload = await authService.validateToken(result.token);
      expect(payload).not.toBeNull();
      expect(payload!.playerId).toBe(result.playerId);
      expect(payload!.username).toBe('TestHero');
    });

    it('should return null for invalid token', async () => {
      const payload = await authService.validateToken('bogus-token-123');
      expect(payload).toBeNull();
    });

    it('should return null for empty token', async () => {
      const payload = await authService.validateToken('');
      expect(payload).toBeNull();
    });

    it('should return null after logout', async () => {
      const result = await authService.register('TestHero', 'password123');
      await authService.logout(result.token);
      const payload = await authService.validateToken(result.token);
      expect(payload).toBeNull();
    });
  });

  // ── Token Expiry ──

  describe('token expiry', () => {
    it('should expire token after TTL', async () => {
      // Create a store with a very short TTL
      const shortStore = new InMemoryTokenStore();
      const repo = new InMemoryPlayerRepository();
      const shortAuth = new AuthService(shortStore, repo);

      // Manually set a token with 1ms TTL via the store directly
      await shortStore.set('expiring-token', { playerId: 'p1', username: 'test' }, 0);

      // Wait for expiry
      await new Promise((resolve) => setTimeout(resolve, 50));

      const payload = await shortAuth.validateToken('expiring-token');
      expect(payload).toBeNull();

      shortStore.dispose();
    });
  });
});

// ─── HTTP Routes Tests ──────────────────────────────────────────────────────

describe('Auth HTTP Routes', () => {
  let authService: AuthService;
  let tokenStore: InMemoryTokenStore;
  let app: express.Express;

  beforeEach(() => {
    const deps = createAuthService();
    authService = deps.authService;
    tokenStore = deps.tokenStore;
    app = createTestApp(authService);
  });

  afterEach(() => {
    tokenStore.dispose();
  });

  describe('POST /auth/register', () => {
    it('should register and return 201 with token', async () => {
      const res = await requestJson(app, 'post', '/auth/register', {
        username: 'TestHero',
        password: 'password123',
      });
      expect(res.status).toBe(201);
      expect(res.body['playerId']).toBeDefined();
      expect(res.body['token']).toBeDefined();
    });

    it('should return 409 for duplicate username', async () => {
      await requestJson(app, 'post', '/auth/register', {
        username: 'TestHero',
        password: 'password123',
      });
      const res = await requestJson(app, 'post', '/auth/register', {
        username: 'TestHero',
        password: 'otherpass1',
      });
      expect(res.status).toBe(409);
      expect(res.body['error']).toBeDefined();
    });

    it('should return 400 for missing fields', async () => {
      const res = await requestJson(app, 'post', '/auth/register', {});
      expect(res.status).toBe(400);
    });

    it('should return 400 for short password', async () => {
      const res = await requestJson(app, 'post', '/auth/register', {
        username: 'TestHero',
        password: '123',
      });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login and return 200 with token', async () => {
      await requestJson(app, 'post', '/auth/register', {
        username: 'TestHero',
        password: 'password123',
      });
      const res = await requestJson(app, 'post', '/auth/login', {
        username: 'TestHero',
        password: 'password123',
      });
      expect(res.status).toBe(200);
      expect(res.body['token']).toBeDefined();
    });

    it('should return 401 for wrong password', async () => {
      await requestJson(app, 'post', '/auth/register', {
        username: 'TestHero',
        password: 'password123',
      });
      const res = await requestJson(app, 'post', '/auth/login', {
        username: 'TestHero',
        password: 'wrongpass',
      });
      expect(res.status).toBe(401);
    });

    it('should return 401 for nonexistent user', async () => {
      const res = await requestJson(app, 'post', '/auth/login', {
        username: 'ghost',
        password: 'password123',
      });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('should invalidate token on logout', async () => {
      const reg = await requestJson(app, 'post', '/auth/register', {
        username: 'TestHero',
        password: 'password123',
      });
      const token = reg.body['token'] as string;

      const res = await requestJson(app, 'post', '/auth/logout', undefined, {
        Authorization: `Bearer ${token}`,
      });
      expect(res.status).toBe(200);

      // Token should now be invalid
      const payload = await authService.validateToken(token);
      expect(payload).toBeNull();
    });

    it('should return 400 without auth header', async () => {
      const res = await requestJson(app, 'post', '/auth/logout');
      expect(res.status).toBe(400);
    });
  });

  describe('GET /auth/me', () => {
    it('should return 200 with player info for valid token', async () => {
      const reg = await requestJson(app, 'post', '/auth/register', {
        username: 'TestHero',
        password: 'password123',
      });
      const token = reg.body['token'] as string;

      const res = await requestJson(app, 'get', '/auth/me', undefined, {
        Authorization: `Bearer ${token}`,
      });
      expect(res.status).toBe(200);
      expect(res.body['playerId']).toBe(reg.body['playerId']);
      expect(res.body['username']).toBe('TestHero');
    });

    it('should return 401 for invalid token', async () => {
      const res = await requestJson(app, 'get', '/auth/me', undefined, {
        Authorization: 'Bearer bogus-token-xyz',
      });
      expect(res.status).toBe(401);
      expect(res.body['error']).toBeDefined();
    });

    it('should return 401 when no Authorization header is present', async () => {
      const res = await requestJson(app, 'get', '/auth/me');
      expect(res.status).toBe(401);
      expect(res.body['error']).toBeDefined();
    });

    it('should return 401 for malformed Authorization header', async () => {
      const res = await requestJson(app, 'get', '/auth/me', undefined, {
        Authorization: 'Token some-value',
      });
      expect(res.status).toBe(401);
      expect(res.body['error']).toBeDefined();
    });
  });
});

// ─── Colyseus onAuth Tests ──────────────────────────────────────────────────

describe('Colyseus onAuth', () => {
  let authService: AuthService;
  let tokenStore: InMemoryTokenStore;

  beforeEach(() => {
    const deps = createAuthService();
    authService = deps.authService;
    tokenStore = deps.tokenStore;
    initColyseusAuth(authService, false);
  });

  afterEach(() => {
    resetColyseusAuth();
    tokenStore.dispose();
  });

  it('should allow anonymous join when auth not required', async () => {
    const result = await authenticateClient(undefined);
    expect(result.playerId).toBe('anonymous');
  });

  it('should validate a valid token', async () => {
    const reg = await authService.register('TestHero', 'password123');
    const result = await authenticateClient(reg.token);
    expect(result.playerId).toBe(reg.playerId);
    expect(result.username).toBe('TestHero');
  });

  it('should reject an invalid token', async () => {
    initColyseusAuth(authService, true);
    await expect(authenticateClient('bogus-token')).rejects.toThrow('expired or invalid');
  });

  it('should reject missing token when auth is required', async () => {
    initColyseusAuth(authService, true);
    await expect(authenticateClient(undefined)).rejects.toThrow('Authentication required');
  });

  it('should reject expired token', async () => {
    initColyseusAuth(authService, true);
    // Manually insert a token then immediately remove it to simulate expiry
    await tokenStore.set('expired-token', { playerId: 'p1', username: 'test' }, 0);
    await new Promise((resolve) => setTimeout(resolve, 50));
    await expect(authenticateClient('expired-token')).rejects.toThrow('expired or invalid');
  });
});

// ─── Colyseus Integration: Room Join with Auth ──────────────────────────────

describe('Room join with auth', () => {
  let colyseus: ColyseusTestServer;
  let authService: AuthService;
  let tokenStore: InMemoryTokenStore;

  beforeAll(async () => {
    const deps = createAuthService();
    authService = deps.authService;
    tokenStore = deps.tokenStore;
    // Auth is optional — existing tests still work without token
    initColyseusAuth(authService, false);

    const server = new Server();
    server.define('shard', ShardRoom);
    server.define('refuge', RefugeRoom);
    await server.listen(0);
    const addr = (server as unknown as { transport: { server: { address(): { port: number } } } }).transport.server.address();
    (server as unknown as { port: number }).port = addr.port;
    colyseus = new ColyseusTestServer(server);
  });

  afterAll(async () => {
    await colyseus.shutdown();
    resetColyseusAuth();
    tokenStore.dispose();
  });

  it('should allow anonymous join to shard (auth optional)', async () => {
    const room = await colyseus.createRoom('shard', {});
    const client = await colyseus.connectTo(room);

    const messages: NarrateMessage[] = [];
    client.onMessage(MessageTypes.NARRATE, (data: NarrateMessage) => {
      messages.push(data);
    });

    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(messages.length).toBeGreaterThan(0);

    await client.leave();
  });

  it('should allow authenticated join to shard', async () => {
    const reg = await authService.register('ShardRunner', 'password123');

    const room = await colyseus.createRoom('shard', {});
    const client = await colyseus.connectTo(room, { token: reg.token });

    const messages: NarrateMessage[] = [];
    client.onMessage(MessageTypes.NARRATE, (data: NarrateMessage) => {
      messages.push(data);
    });

    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(messages.length).toBeGreaterThan(0);

    await client.leave();
  });

  it('should allow anonymous join to refuge (auth optional)', async () => {
    const room = await colyseus.createRoom('refuge', {});
    const client = await colyseus.connectTo(room);

    const messages: NarrateMessage[] = [];
    client.onMessage(MessageTypes.NARRATE, (data: NarrateMessage) => {
      messages.push(data);
    });

    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(messages.length).toBeGreaterThan(0);

    await client.leave();
  });

  it('register → login → join room integration', async () => {
    // Step 1: Register
    const reg = await authService.register('IntegrationHero', 'securePass1');
    expect(reg.token).toBeDefined();

    // Step 2: Login with same credentials
    const login = await authService.login('IntegrationHero', 'securePass1');
    expect(login.playerId).toBe(reg.playerId);

    // Step 3: Join room with login token
    const room = await colyseus.createRoom('shard', {});
    const client = await colyseus.connectTo(room, { token: login.token });

    const messages: NarrateMessage[] = [];
    client.onMessage(MessageTypes.NARRATE, (data: NarrateMessage) => {
      messages.push(data);
    });

    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0]!.text).toContain('rift');

    await client.leave();
  });
});
