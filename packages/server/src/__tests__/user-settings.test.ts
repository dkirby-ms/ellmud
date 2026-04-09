import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthService } from '../auth/AuthService.js';
import { InMemoryTokenStore } from '../auth/TokenStore.js';
import { InMemoryPlayerRepository } from '../auth/PlayerRepository.js';
import { createAuthRouter } from '../auth/routes.js';
import { createSettingsRouter } from '../api/settings.js';
import { initUserSettingsProvider, resetUserSettingsProvider } from '../db/UserSettingsRepository.js';
import express from 'express';

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
  app.use(createSettingsRouter({ authService }));
  return app;
}

async function requestJson(
  app: express.Express,
  method: 'get' | 'post' | 'put',
  path: string,
  body?: Record<string, unknown>,
  headers?: Record<string, string>,
): Promise<{ status: number; body: Record<string, unknown> }> {
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

/** Register a player and return token + playerId. */
async function registerPlayer(app: express.Express, username = 'SettingsHero') {
  const res = await requestJson(app, 'post', '/auth/register', {
    username,
    password: 'password123',
  });
  return { token: res.body['token'] as string, playerId: res.body['playerId'] as string };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('User Settings API', () => {
  let authService: AuthService;
  let tokenStore: InMemoryTokenStore;
  let app: express.Express;

  beforeEach(() => {
    const deps = createAuthService();
    authService = deps.authService;
    tokenStore = deps.tokenStore;
    initUserSettingsProvider(false);
    app = createTestApp(authService);
  });

  afterEach(() => {
    tokenStore.dispose();
    resetUserSettingsProvider();
  });

  // ── Auth ──

  describe('authentication', () => {
    it('should return 401 without Authorization header', async () => {
      const res = await requestJson(app, 'get', '/api/user/settings');
      expect(res.status).toBe(401);
      expect(res.body['error']).toBeDefined();
    });

    it('should return 401 with invalid token', async () => {
      const res = await requestJson(app, 'get', '/api/user/settings', undefined, {
        Authorization: 'Bearer bogus-token-xyz',
      });
      expect(res.status).toBe(401);
    });

    it('should return 401 for malformed Authorization header', async () => {
      const res = await requestJson(app, 'get', '/api/user/settings', undefined, {
        Authorization: 'Token some-value',
      });
      expect(res.status).toBe(401);
    });
  });

  // ── GET defaults ──

  describe('GET /api/user/settings', () => {
    it('should return default config when no settings exist', async () => {
      const { token } = await registerPlayer(app);
      const res = await requestJson(app, 'get', '/api/user/settings', undefined, {
        Authorization: `Bearer ${token}`,
      });
      expect(res.status).toBe(200);
      expect(res.body['config']).toEqual({
        display: {},
        narration: {},
        gameplay: {},
        accessibility: {},
      });
    });
  });

  // ── PUT create + update ──

  describe('PUT /api/user/settings', () => {
    it('should create settings on first PUT', async () => {
      const { token } = await registerPlayer(app);
      const config = { display: { fontSize: 16 }, narration: { verbosity: 'verbose' } };
      const res = await requestJson(app, 'put', '/api/user/settings', { config }, {
        Authorization: `Bearer ${token}`,
      });
      expect(res.status).toBe(200);
      expect(res.body['config']).toEqual(config);
    });

    it('should update existing settings', async () => {
      const { token } = await registerPlayer(app);

      // Create
      await requestJson(app, 'put', '/api/user/settings', {
        config: { display: { fontSize: 14 } },
      }, { Authorization: `Bearer ${token}` });

      // Update
      const res = await requestJson(app, 'put', '/api/user/settings', {
        config: { display: { fontSize: 20 }, narration: { narrationStyle: 'gothic' } },
      }, { Authorization: `Bearer ${token}` });

      expect(res.status).toBe(200);
      expect((res.body['config'] as Record<string, unknown>)['display']).toEqual({ fontSize: 20 });
      expect((res.body['config'] as Record<string, unknown>)['narration']).toEqual({ narrationStyle: 'gothic' });
    });

    it('should persist settings across GET after PUT', async () => {
      const { token } = await registerPlayer(app);
      const config = { narration: { verbosity: 'terse', narrationStyle: 'noir' } };

      await requestJson(app, 'put', '/api/user/settings', { config }, {
        Authorization: `Bearer ${token}`,
      });

      const res = await requestJson(app, 'get', '/api/user/settings', undefined, {
        Authorization: `Bearer ${token}`,
      });
      expect(res.status).toBe(200);
      expect(res.body['config']).toEqual(config);
    });
  });

  // ── Validation ──

  describe('validation', () => {
    it('should reject missing config in body', async () => {
      const { token } = await registerPlayer(app);
      const res = await requestJson(app, 'put', '/api/user/settings', {}, {
        Authorization: `Bearer ${token}`,
      });
      expect(res.status).toBe(400);
      expect(res.body['error']).toContain('config');
    });

    it('should reject fontSize below 12', async () => {
      const { token } = await registerPlayer(app);
      const res = await requestJson(app, 'put', '/api/user/settings', {
        config: { display: { fontSize: 8 } },
      }, { Authorization: `Bearer ${token}` });
      expect(res.status).toBe(400);
      expect(res.body['error']).toContain('fontSize');
    });

    it('should reject fontSize above 24', async () => {
      const { token } = await registerPlayer(app);
      const res = await requestJson(app, 'put', '/api/user/settings', {
        config: { display: { fontSize: 30 } },
      }, { Authorization: `Bearer ${token}` });
      expect(res.status).toBe(400);
      expect(res.body['error']).toContain('fontSize');
    });

    it('should reject non-integer fontSize', async () => {
      const { token } = await registerPlayer(app);
      const res = await requestJson(app, 'put', '/api/user/settings', {
        config: { display: { fontSize: 14.5 } },
      }, { Authorization: `Bearer ${token}` });
      expect(res.status).toBe(400);
      expect(res.body['error']).toContain('fontSize');
    });

    it('should reject invalid verbosity', async () => {
      const { token } = await registerPlayer(app);
      const res = await requestJson(app, 'put', '/api/user/settings', {
        config: { narration: { verbosity: 'extreme' } },
      }, { Authorization: `Bearer ${token}` });
      expect(res.status).toBe(400);
      expect(res.body['error']).toContain('verbosity');
    });

    it('should reject invalid narrationStyle', async () => {
      const { token } = await registerPlayer(app);
      const res = await requestJson(app, 'put', '/api/user/settings', {
        config: { narration: { narrationStyle: 'fantasy' } },
      }, { Authorization: `Bearer ${token}` });
      expect(res.status).toBe(400);
      expect(res.body['error']).toContain('narrationStyle');
    });

    it('should reject unknown top-level keys', async () => {
      const { token } = await registerPlayer(app);
      const res = await requestJson(app, 'put', '/api/user/settings', {
        config: { theme: { color: 'dark' } },
      }, { Authorization: `Bearer ${token}` });
      expect(res.status).toBe(400);
      expect(res.body['error']).toContain('Unknown top-level key');
    });

    it('should accept valid verbosity values', async () => {
      const { token } = await registerPlayer(app);
      for (const v of ['terse', 'standard', 'verbose']) {
        const res = await requestJson(app, 'put', '/api/user/settings', {
          config: { narration: { verbosity: v } },
        }, { Authorization: `Bearer ${token}` });
        expect(res.status).toBe(200);
      }
    });

    it('should accept valid narrationStyle values', async () => {
      const { token } = await registerPlayer(app);
      for (const s of ['default', 'gothic', 'noir', 'clinical']) {
        const res = await requestJson(app, 'put', '/api/user/settings', {
          config: { narration: { narrationStyle: s } },
        }, { Authorization: `Bearer ${token}` });
        expect(res.status).toBe(200);
      }
    });

    it('should accept empty config object', async () => {
      const { token } = await registerPlayer(app);
      const res = await requestJson(app, 'put', '/api/user/settings', {
        config: {},
      }, { Authorization: `Bearer ${token}` });
      expect(res.status).toBe(200);
    });
  });
});
