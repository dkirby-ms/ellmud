/**
 * admin-token-validation.test.ts — Server-side admin token validation (Issue #369).
 *
 * Tests the adminAuth middleware and a dedicated /admin/api/validate-token
 * endpoint that Regis may add for upfront token validation.
 *
 * Scenarios:
 * 1. Missing Authorization header → 401
 * 2. Malformed Authorization header → 401
 * 3. Wrong token → 403
 * 4. Correct token → passes through
 * 5. ADMIN_TOKEN env not set → 503 (fail-closed)
 * 6. Token with extra whitespace is rejected
 * 7. Empty Bearer value is rejected
 * 8. Dedicated validate-token endpoint returns clear success/failure
 */

import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import express, { type Request, type Response } from 'express';
import { adminAuth, resetAdminAuth } from '../admin/middleware.js';

// ─── Test Helpers ────────────────────────────────────────────────────────────

const TEST_TOKEN = 'test-admin-token-12345';

function createAuthTestApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.use('/protected', adminAuth, (_req: Request, res: Response) => {
    res.json({ ok: true, message: 'Authenticated' });
  });
  return app;
}

async function authRequest(
  app: express.Express,
  path: string,
  opts?: { token?: string; rawAuth?: string },
): Promise<{ status: number; body: Record<string, unknown> }> {
  const server = app.listen(0);
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;

  try {
    const headers: Record<string, string> = {};
    if (opts?.rawAuth !== undefined) {
      headers['Authorization'] = opts.rawAuth;
    } else if (opts?.token !== undefined) {
      headers['Authorization'] = `Bearer ${opts.token}`;
    }

    const res = await fetch(`http://127.0.0.1:${port}${path}`, { headers });
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

// ─── adminAuth Middleware Tests ──────────────────────────────────────────────

describe('Admin Token Validation — Middleware (Issue #369)', () => {
  const originalEnv = process.env['ADMIN_TOKEN'];

  beforeEach(() => {
    // Ensure no session-based auth leaks from other test files
    resetAdminAuth();
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env['ADMIN_TOKEN'] = originalEnv;
    } else {
      delete process.env['ADMIN_TOKEN'];
    }
  });

  describe('missing or malformed Authorization header', () => {
    it('returns 401 when no Authorization header is provided', async () => {
      process.env['ADMIN_TOKEN'] = TEST_TOKEN;
      const app = createAuthTestApp();
      const res = await authRequest(app, '/protected');

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/missing/i);
    });

    it('returns 401 for non-Bearer authorization scheme', async () => {
      process.env['ADMIN_TOKEN'] = TEST_TOKEN;
      const app = createAuthTestApp();
      const res = await authRequest(app, '/protected', {
        rawAuth: `Basic ${Buffer.from('admin:password').toString('base64')}`,
      });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/missing|invalid/i);
    });

    it('returns 401 for Bearer with empty token value', async () => {
      process.env['ADMIN_TOKEN'] = TEST_TOKEN;
      const app = createAuthTestApp();
      const res = await authRequest(app, '/protected', {
        rawAuth: 'Bearer ',
      });

      // Empty string after "Bearer " should not match the real token
      expect([401, 403]).toContain(res.status);
    });

    it('returns 401 for Authorization header without Bearer prefix', async () => {
      process.env['ADMIN_TOKEN'] = TEST_TOKEN;
      const app = createAuthTestApp();
      const res = await authRequest(app, '/protected', {
        rawAuth: TEST_TOKEN,
      });

      expect(res.status).toBe(401);
    });
  });

  describe('invalid token values', () => {
    it('returns 403 for wrong token', async () => {
      process.env['ADMIN_TOKEN'] = TEST_TOKEN;
      const app = createAuthTestApp();
      const res = await authRequest(app, '/protected', { token: 'wrong-token' });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/invalid/i);
    });

    it('returns 403 for token with leading whitespace', async () => {
      process.env['ADMIN_TOKEN'] = TEST_TOKEN;
      const app = createAuthTestApp();
      const res = await authRequest(app, '/protected', {
        token: ` ${TEST_TOKEN}`,
      });

      expect(res.status).toBe(403);
    });

    it('returns 403 for token with embedded whitespace', async () => {
      process.env['ADMIN_TOKEN'] = TEST_TOKEN;
      const app = createAuthTestApp();
      const res = await authRequest(app, '/protected', {
        token: `test-admin token-12345`,
      });

      expect(res.status).toBe(403);
    });

    it('returns 403 for partial token match', async () => {
      process.env['ADMIN_TOKEN'] = TEST_TOKEN;
      const app = createAuthTestApp();
      const res = await authRequest(app, '/protected', {
        token: TEST_TOKEN.slice(0, 10),
      });

      expect(res.status).toBe(403);
    });

    it('returns 403 for case-altered token', async () => {
      process.env['ADMIN_TOKEN'] = TEST_TOKEN;
      const app = createAuthTestApp();
      const res = await authRequest(app, '/protected', {
        token: TEST_TOKEN.toUpperCase(),
      });

      expect(res.status).toBe(403);
    });
  });

  describe('valid token', () => {
    it('returns 200 with correct token', async () => {
      process.env['ADMIN_TOKEN'] = TEST_TOKEN;
      const app = createAuthTestApp();
      const res = await authRequest(app, '/protected', { token: TEST_TOKEN });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });

  describe('server misconfiguration (ADMIN_TOKEN not set)', () => {
    it('returns 503 when ADMIN_TOKEN env is not set', async () => {
      delete process.env['ADMIN_TOKEN'];
      const app = createAuthTestApp();
      const res = await authRequest(app, '/protected', { token: 'any-token' });

      expect(res.status).toBe(503);
      expect(res.body.error).toMatch(/not configured/i);
    });

    it('returns 401 when no Authorization header and ADMIN_TOKEN unset', async () => {
      delete process.env['ADMIN_TOKEN'];
      const app = createAuthTestApp();
      const res = await authRequest(app, '/protected');

      // Missing auth header is caught first → 401
      expect(res.status).toBe(401);
    });
  });

  describe('error response format', () => {
    it('returns JSON error body with "error" field for 401', async () => {
      process.env['ADMIN_TOKEN'] = TEST_TOKEN;
      const app = createAuthTestApp();
      const res = await authRequest(app, '/protected');

      expect(res.status).toBe(401);
      expect(typeof res.body.error).toBe('string');
      expect(res.body.error).toBeTruthy();
    });

    it('returns JSON error body with "error" field for 403', async () => {
      process.env['ADMIN_TOKEN'] = TEST_TOKEN;
      const app = createAuthTestApp();
      const res = await authRequest(app, '/protected', { token: 'bad' });

      expect(res.status).toBe(403);
      expect(typeof res.body.error).toBe('string');
      expect(res.body.error).toBeTruthy();
    });
  });
});

// ─── Validate-Token Endpoint Tests ──────────────────────────────────────────
//
// Regis may add a lightweight GET /admin/api/validate-token endpoint
// that returns 200 for valid tokens and 401/403 for invalid ones.
// These tests define the expected contract for that endpoint.

describe('Admin Token Validation Endpoint (anticipated)', () => {
  const originalEnv = process.env['ADMIN_TOKEN'];

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env['ADMIN_TOKEN'] = originalEnv;
    } else {
      delete process.env['ADMIN_TOKEN'];
    }
  });

  /**
   * Helper: creates an app with a validate-token endpoint behind adminAuth.
   * This simulates the endpoint Regis will likely add.
   */
  function createValidateApp(): express.Express {
    const app = express();
    app.use(express.json());
    app.get('/admin/api/validate-token', adminAuth, (_req: Request, res: Response) => {
      res.json({ valid: true });
    });
    return app;
  }

  it('returns 200 { valid: true } for correct token', async () => {
    process.env['ADMIN_TOKEN'] = TEST_TOKEN;
    const app = createValidateApp();
    const res = await authRequest(app, '/admin/api/validate-token', { token: TEST_TOKEN });

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
  });

  it('returns 403 for wrong token', async () => {
    process.env['ADMIN_TOKEN'] = TEST_TOKEN;
    const app = createValidateApp();
    const res = await authRequest(app, '/admin/api/validate-token', { token: 'nope' });

    expect(res.status).toBe(403);
  });

  it('returns 401 for missing token', async () => {
    process.env['ADMIN_TOKEN'] = TEST_TOKEN;
    const app = createValidateApp();
    const res = await authRequest(app, '/admin/api/validate-token');

    expect(res.status).toBe(401);
  });

  it('returns 503 when server has no ADMIN_TOKEN configured', async () => {
    delete process.env['ADMIN_TOKEN'];
    const app = createValidateApp();
    const res = await authRequest(app, '/admin/api/validate-token', { token: 'any' });

    expect(res.status).toBe(503);
  });
});
