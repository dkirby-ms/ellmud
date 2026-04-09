/**
 * role-admin-auth.test.ts — Role-based admin middleware tests (Issue #373).
 *
 * Design Decisions:
 *   - Admin middleware accepts ADMIN_TOKEN (silent fallback) OR player session
 *     with admin/content-dev role.
 *   - Player role → 403, content-dev/admin → 200.
 *   - No ADMIN_TOKEN env → no error, just skip token auth path.
 *   - GET /auth/me returns user's role.
 *
 * The existing adminAuth middleware will be upgraded to support both auth
 * paths. These tests define the expected behavior contract.
 *
 * TDD: Will fail until Jarlaxle upgrades the middleware and auth routes.
 */

import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import express, { type Request, type Response } from 'express';
import { adminAuth } from '../admin/middleware.js';
import { AuthService } from '../auth/AuthService.js';
import { InMemoryTokenStore } from '../auth/TokenStore.js';
import { InMemoryPlayerRepository } from '../auth/PlayerRepository.js';
import { createAuthRouter } from '../auth/routes.js';

// ─── Test Helpers ────────────────────────────────────────────────────────────

const TEST_ADMIN_TOKEN = 'test-admin-token-373';

function createAuthService() {
  const tokenStore = new InMemoryTokenStore();
  const playerRepo = new InMemoryPlayerRepository();
  const authService = new AuthService(tokenStore, playerRepo);
  return { authService, tokenStore, playerRepo };
}

/**
 * Creates an Express app with:
 * - Auth routes (register, login, /auth/me)
 * - A protected admin endpoint behind adminAuth
 */
function createRoleTestApp(authService: AuthService): express.Express {
  const app = express();
  app.use(express.json());
  app.use(createAuthRouter(authService));
  app.get('/admin/api/test', adminAuth, (_req: Request, res: Response) => {
    res.json({ ok: true, message: 'Admin access granted' });
  });
  return app;
}

async function httpRequest(
  app: express.Express,
  method: 'get' | 'post',
  path: string,
  opts?: { body?: Record<string, unknown>; token?: string; rawAuth?: string },
): Promise<{ status: number; body: Record<string, unknown> }> {
  const server = app.listen(0);
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (opts?.rawAuth !== undefined) {
      headers['Authorization'] = opts.rawAuth;
    } else if (opts?.token !== undefined) {
      headers['Authorization'] = `Bearer ${opts.token}`;
    }

    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      method: method.toUpperCase(),
      headers,
      body: opts?.body ? JSON.stringify(opts.body) : undefined,
    });
    const text = await res.text();
    let json: Record<string, unknown> = {};
    try {
      json = JSON.parse(text) as Record<string, unknown>;
    } catch {
      // non-JSON response
    }
    return { status: res.status, body: json };
  } finally {
    server.close();
  }
}

// ─── Admin Middleware: Role-Based Session Auth ───────────────────────────────

describe('Role-Based Admin Auth Middleware (Issue #373)', () => {
  let authService: AuthService;
  let tokenStore: InMemoryTokenStore;
  let app: express.Express;
  const originalAdminToken = process.env['ADMIN_TOKEN'];

  beforeEach(() => {
    const deps = createAuthService();
    authService = deps.authService;
    tokenStore = deps.tokenStore;
    app = createRoleTestApp(authService);
  });

  afterEach(() => {
    tokenStore.dispose();
    if (originalAdminToken !== undefined) {
      process.env['ADMIN_TOKEN'] = originalAdminToken;
    } else {
      delete process.env['ADMIN_TOKEN'];
    }
  });

  // ── ADMIN_TOKEN env var still works as fallback ──

  describe('ADMIN_TOKEN fallback (backward compatibility)', () => {
    it('accepts valid ADMIN_TOKEN even without session auth', async () => {
      process.env['ADMIN_TOKEN'] = TEST_ADMIN_TOKEN;
      const res = await httpRequest(app, 'get', '/admin/api/test', {
        token: TEST_ADMIN_TOKEN,
      });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    it('rejects invalid ADMIN_TOKEN', async () => {
      process.env['ADMIN_TOKEN'] = TEST_ADMIN_TOKEN;
      const res = await httpRequest(app, 'get', '/admin/api/test', {
        token: 'wrong-token',
      });
      // Should reject with 401 or 403 (depends on whether session is also checked)
      expect([401, 403]).toContain(res.status);
    });
  });

  // ── No ADMIN_TOKEN env → skip token auth, no crash ──

  describe('no ADMIN_TOKEN env var', () => {
    it('does not crash when ADMIN_TOKEN is not set', async () => {
      delete process.env['ADMIN_TOKEN'];
      // Register a user, get a session token
      const reg = await authService.register('AdminUser', 'password123');
      // Without ADMIN_TOKEN, only session-based auth should be available.
      // A valid session with admin role should still work.
      // For now, we just verify it doesn't crash (returns 401/403, not 500/503).
      const res = await httpRequest(app, 'get', '/admin/api/test', {
        token: reg.token,
      });
      // Without admin role set, this should be 403 (player role)
      // Key point: NOT 503 (the old "not configured" error)
      expect(res.status).not.toBe(503);
      expect([200, 401, 403]).toContain(res.status);
    });

    it('still works when ADMIN_TOKEN is empty string', async () => {
      process.env['ADMIN_TOKEN'] = '';
      const res = await httpRequest(app, 'get', '/admin/api/test', {
        token: 'any-token',
      });
      // Empty ADMIN_TOKEN should not match any token; should not crash
      expect(res.status).not.toBe(500);
    });
  });

  // ── Missing auth entirely → 401 ──

  describe('missing authentication', () => {
    it('returns 401 when no Authorization header is provided', async () => {
      process.env['ADMIN_TOKEN'] = TEST_ADMIN_TOKEN;
      const res = await httpRequest(app, 'get', '/admin/api/test');
      expect(res.status).toBe(401);
    });

    it('returns 401 for non-Bearer auth scheme', async () => {
      process.env['ADMIN_TOKEN'] = TEST_ADMIN_TOKEN;
      const res = await httpRequest(app, 'get', '/admin/api/test', {
        rawAuth: `Basic ${Buffer.from('admin:password').toString('base64')}`,
      });
      expect(res.status).toBe(401);
    });
  });

  // ── Invalid/expired session token → 401 ──

  describe('invalid or expired session tokens', () => {
    it('returns 401 for bogus session token', async () => {
      delete process.env['ADMIN_TOKEN'];
      const res = await httpRequest(app, 'get', '/admin/api/test', {
        token: 'totally-bogus-session-token',
      });
      expect(res.status).toBe(401);
    });

    it('returns 401 for expired session token', async () => {
      delete process.env['ADMIN_TOKEN'];
      // Create a token that expires immediately
      await tokenStore.set('expired-token', { playerId: 'p1', username: 'test' }, 0);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const res = await httpRequest(app, 'get', '/admin/api/test', {
        token: 'expired-token',
      });
      expect(res.status).toBe(401);
    });
  });

  // ── Role-based access: player → 403, content-dev/admin → 200 ──

  describe('role-based access control on admin endpoints', () => {
    it('player role → 403 on admin endpoints', async () => {
      delete process.env['ADMIN_TOKEN'];
      // Register creates a player with default 'player' role
      const reg = await authService.register('RegularPlayer', 'password123');

      const res = await httpRequest(app, 'get', '/admin/api/test', {
        token: reg.token,
      });
      expect(res.status).toBe(403);
    });

    // Note: These next two tests require Jarlaxle to implement role assignment.
    // The authService will need a method to set roles, or the player repo will
    // need to support role storage. The tests assume that once a user's role is
    // set to 'content-dev' or 'admin', their session token grants access.
    //
    // Jarlaxle can implement this by:
    //   1. Adding 'role' to TokenData / TokenPayload
    //   2. Storing role in the token store alongside playerId/username
    //   3. Updating adminAuth to check role from the session token

    it('content-dev role → 200 on admin endpoints', async () => {
      delete process.env['ADMIN_TOKEN'];
      const reg = await authService.register('ContentCreator', 'password123');

      // Manually set the role in the token store to simulate content-dev promotion
      // Jarlaxle's implementation should store role in TokenData
      await tokenStore.set(reg.token, {
        playerId: reg.playerId,
        username: 'ContentCreator',
        role: 'content-dev',
      } as never, 86400);

      const res = await httpRequest(app, 'get', '/admin/api/test', {
        token: reg.token,
      });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    it('admin role → 200 on admin endpoints', async () => {
      delete process.env['ADMIN_TOKEN'];
      const reg = await authService.register('AdminUser', 'password123');

      // Manually set admin role in token store
      await tokenStore.set(reg.token, {
        playerId: reg.playerId,
        username: 'AdminUser',
        role: 'admin',
      } as never, 86400);

      const res = await httpRequest(app, 'get', '/admin/api/test', {
        token: reg.token,
      });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });
});

// ─── GET /auth/me Returns Role ──────────────────────────────────────────────

describe('GET /auth/me includes role (Issue #373)', () => {
  let authService: AuthService;
  let tokenStore: InMemoryTokenStore;
  let app: express.Express;

  beforeEach(() => {
    const deps = createAuthService();
    authService = deps.authService;
    tokenStore = deps.tokenStore;
    app = express();
    app.use(express.json());
    app.use(createAuthRouter(authService));
  });

  afterEach(() => {
    tokenStore.dispose();
  });

  it('returns role field in /auth/me response', async () => {
    const reg = await authService.register('RoleUser', 'password123');

    const res = await httpRequest(app, 'get', '/auth/me', {
      token: reg.token,
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('role');
    expect(typeof res.body['role']).toBe('string');
  });

  it('newly registered user has "player" role by default', async () => {
    const reg = await authService.register('NewPlayer', 'password123');

    const res = await httpRequest(app, 'get', '/auth/me', {
      token: reg.token,
    });
    expect(res.status).toBe(200);
    expect(res.body['role']).toBe('player');
  });

  it('returns "admin" role for admin users', async () => {
    const reg = await authService.register('AdminMe', 'password123');

    // Simulate admin role in token store
    await tokenStore.set(reg.token, {
      playerId: reg.playerId,
      username: 'AdminMe',
      role: 'admin',
    } as never, 86400);

    const res = await httpRequest(app, 'get', '/auth/me', {
      token: reg.token,
    });
    expect(res.status).toBe(200);
    expect(res.body['role']).toBe('admin');
  });

  it('returns "content-dev" role for content-dev users', async () => {
    const reg = await authService.register('DevUser', 'password123');

    await tokenStore.set(reg.token, {
      playerId: reg.playerId,
      username: 'DevUser',
      role: 'content-dev',
    } as never, 86400);

    const res = await httpRequest(app, 'get', '/auth/me', {
      token: reg.token,
    });
    expect(res.status).toBe(200);
    expect(res.body['role']).toBe('content-dev');
  });
});
