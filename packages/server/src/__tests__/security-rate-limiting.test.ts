/**
 * Security Rate Limiting Tests — middleware/rate-limit.ts
 *
 * Verifies the shared rate-limiting middleware factory:
 *   - createLimiter produces working Express middleware
 *   - Returns 429 after exceeding the configured max
 *   - Pre-built limiters (apiLimiter, authLimiter, etc.) are exported
 *   - ALLOW_LOCAL_AUTH bypass replaces limiter with no-op
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import type { Server } from 'http';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getJson(
  port: number,
  path: string,
  ip = '127.0.0.1',
): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await fetch(`http://127.0.0.1:${port}${path}`, {
    headers: { 'X-Forwarded-For': ip },
  });
  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    // 204 or empty body
  }
  return { status: res.status, body: json };
}

// ─── Tests with rate limiting ENABLED ─────────────────────────────────────────

describe('Security: rate limiting middleware', () => {
  let server: Server;
  let port: number;

  beforeEach(async () => {
    // Ensure ALLOW_LOCAL_AUTH is not set so rate limiting is active
    delete process.env.ALLOW_LOCAL_AUTH;

    // Dynamic import to pick up the env var at module load time
    // We must reset the module cache each time
    vi.resetModules();
    const { createLimiter } = await import('../middleware/rate-limit.js');

    const app = express();
    app.set('trust proxy', 1);

    // Create a tight limiter: 3 requests per 15-minute window
    const tightLimiter = createLimiter({
      windowMs: 15 * 60 * 1000,
      max: 3,
      message: { error: 'Rate limit exceeded' },
    });

    app.get('/test', tightLimiter, (_req, res) => {
      res.json({ ok: true });
    });

    server = app.listen(0);
    const addr = server.address();
    port = typeof addr === 'object' && addr ? addr.port : 0;
  });

  afterEach(() => {
    server?.close();
  });

  it('allows requests under the limit', async () => {
    const res = await getJson(port, '/test', '10.10.0.1');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('returns 429 after exceeding the limit', async () => {
    const ip = '10.10.0.2';

    // Send 3 requests (the limit)
    for (let i = 0; i < 3; i++) {
      const res = await getJson(port, '/test', ip);
      expect(res.status).toBe(200);
    }

    // 4th request should be rate limited
    const blocked = await getJson(port, '/test', ip);
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toContain('Rate limit exceeded');
  });

  it('does not rate-limit different IPs', async () => {
    const ip1 = '10.10.0.3';
    const ip2 = '10.10.0.4';

    // Exhaust limit for ip1
    for (let i = 0; i < 4; i++) {
      await getJson(port, '/test', ip1);
    }

    // ip2 should still work
    const res = await getJson(port, '/test', ip2);
    expect(res.status).toBe(200);
  });

  it('exports pre-built limiters', async () => {
    vi.resetModules();
    const mod = await import('../middleware/rate-limit.js');
    expect(typeof mod.apiLimiter).toBe('function');
    expect(typeof mod.authLimiter).toBe('function');
    expect(typeof mod.adminWriteLimiter).toBe('function');
    expect(typeof mod.staticLimiter).toBe('function');
  });
});

// ─── Tests with ALLOW_LOCAL_AUTH bypass ───────────────────────────────────────

describe('Security: rate limiting — ALLOW_LOCAL_AUTH bypass', () => {
  let server: Server;
  let port: number;

  beforeEach(async () => {
    process.env.ALLOW_LOCAL_AUTH = 'true';
    vi.resetModules();
    const { createLimiter } = await import('../middleware/rate-limit.js');

    const app = express();
    app.set('trust proxy', 1);

    // Same tight limiter — but should be bypassed
    const tightLimiter = createLimiter({
      windowMs: 15 * 60 * 1000,
      max: 3,
      message: { error: 'Rate limit exceeded' },
    });

    app.get('/test', tightLimiter, (_req, res) => {
      res.json({ ok: true });
    });

    server = app.listen(0);
    const addr = server.address();
    port = typeof addr === 'object' && addr ? addr.port : 0;
  });

  afterEach(() => {
    server?.close();
    delete process.env.ALLOW_LOCAL_AUTH;
  });

  it('does not rate-limit when ALLOW_LOCAL_AUTH is true', async () => {
    const ip = '10.10.1.1';

    // Send 10 requests — all should succeed (bypass active)
    for (let i = 0; i < 10; i++) {
      const res = await getJson(port, '/test', ip);
      expect(res.status).toBe(200);
    }
  });
});
