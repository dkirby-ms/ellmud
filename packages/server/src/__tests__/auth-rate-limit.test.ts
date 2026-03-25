/**
 * Rate Limiting Tests — Auth Endpoints
 *
 * Verifies that /auth/login and /auth/register enforce per-IP rate limits
 * and return 429 with Retry-After headers when exceeded.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import { AuthService } from '../auth/AuthService.js';
import { InMemoryTokenStore } from '../auth/TokenStore.js';
import { InMemoryPlayerRepository } from '../auth/PlayerRepository.js';
import { createAuthRouter } from '../auth/routes.js';
import type { Server } from 'http';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createTestApp() {
  const tokenStore = new InMemoryTokenStore();
  const playerRepo = new InMemoryPlayerRepository();
  const authService = new AuthService(tokenStore, playerRepo);

  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());
  app.use(createAuthRouter(authService));

  return { app, authService, tokenStore };
}

async function postJson(
  port: number,
  path: string,
  body: Record<string, unknown>,
  ip: string = '127.0.0.1',
): Promise<{ status: number; headers: Headers; body: Record<string, unknown> }> {
  const res = await fetch(`http://127.0.0.1:${port}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': ip,
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as Record<string, unknown>;
  return { status: res.status, headers: res.headers, body: json };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Auth Rate Limiting', () => {
  let server: Server;
  let port: number;
  let tokenStore: InMemoryTokenStore;

  beforeEach(async () => {
    const deps = createTestApp();
    tokenStore = deps.tokenStore;

    // Pre-register a user for login tests
    await deps.authService.register('RateLimitUser', 'password123');

    server = deps.app.listen(0);
    const addr = server.address();
    port = typeof addr === 'object' && addr ? addr.port : 0;
  });

  afterEach(() => {
    server.close();
    tokenStore.dispose();
  });

  describe('POST /auth/login — 10 attempts per 15 min', () => {
    it('should allow requests under the limit', async () => {
      const res = await postJson(port, '/auth/login', {
        username: 'RateLimitUser',
        password: 'password123',
      }, '10.0.0.1');
      expect(res.status).toBe(200);
    });

    it('should return 429 after exceeding the limit', async () => {
      const ip = '10.0.0.2';

      // Fire 10 requests (the limit)
      for (let i = 0; i < 10; i++) {
        await postJson(port, '/auth/login', {
          username: 'RateLimitUser',
          password: 'wrongpass',
        }, ip);
      }

      // 11th request should be rate limited
      const blocked = await postJson(port, '/auth/login', {
        username: 'RateLimitUser',
        password: 'password123',
      }, ip);

      expect(blocked.status).toBe(429);
      expect(blocked.body['error']).toContain('Too many login attempts');
      expect(blocked.headers.get('retry-after')).toBeTruthy();
    });

    it('should not rate-limit a different IP', async () => {
      const blockedIp = '10.0.0.3';
      const cleanIp = '10.0.0.4';

      // Exhaust the limit for blockedIp
      for (let i = 0; i < 11; i++) {
        await postJson(port, '/auth/login', {
          username: 'RateLimitUser',
          password: 'wrongpass',
        }, blockedIp);
      }

      // cleanIp should still work
      const res = await postJson(port, '/auth/login', {
        username: 'RateLimitUser',
        password: 'password123',
      }, cleanIp);
      expect(res.status).toBe(200);
    });
  });

  describe('POST /auth/register — 5 attempts per hour', () => {
    it('should allow requests under the limit', async () => {
      const res = await postJson(port, '/auth/register', {
        username: 'NewUser1',
        password: 'password123',
      }, '10.1.0.1');
      expect(res.status).toBe(201);
    });

    it('should return 429 after exceeding the limit', async () => {
      const ip = '10.1.0.2';

      // Fire 5 requests (the limit)
      for (let i = 0; i < 5; i++) {
        await postJson(port, '/auth/register', {
          username: `RegUser${i}`,
          password: 'password123',
        }, ip);
      }

      // 6th request should be rate limited
      const blocked = await postJson(port, '/auth/register', {
        username: 'RegUser99',
        password: 'password123',
      }, ip);

      expect(blocked.status).toBe(429);
      expect(blocked.body['error']).toContain('Too many registration attempts');
      expect(blocked.headers.get('retry-after')).toBeTruthy();
    });

    it('should not rate-limit a different IP', async () => {
      const blockedIp = '10.1.0.3';
      const cleanIp = '10.1.0.4';

      // Exhaust the limit for blockedIp
      for (let i = 0; i < 6; i++) {
        await postJson(port, '/auth/register', {
          username: `SpamUser${i}`,
          password: 'password123',
        }, blockedIp);
      }

      // cleanIp should still work
      const res = await postJson(port, '/auth/register', {
        username: 'CleanUser',
        password: 'password123',
      }, cleanIp);
      expect(res.status).toBe(201);
    });
  });

  describe('rate limits are independent per endpoint', () => {
    it('login limit should not affect register', async () => {
      const ip = '10.2.0.1';

      // Exhaust login limit
      for (let i = 0; i < 11; i++) {
        await postJson(port, '/auth/login', {
          username: 'RateLimitUser',
          password: 'wrongpass',
        }, ip);
      }

      // Register should still work from the same IP
      const res = await postJson(port, '/auth/register', {
        username: 'StillWorks',
        password: 'password123',
      }, ip);
      expect(res.status).toBe(201);
    });
  });
});
