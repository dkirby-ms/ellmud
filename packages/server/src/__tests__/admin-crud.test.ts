/**
 * Integration tests for the Admin Content CRUD API (Issue #139).
 *
 * Tests the full CRUD lifecycle for all 9 content entity types:
 *   items, creatures, biomes, modifiers, skills, loot-tables, factions, rooms, narrative
 *
 * Written TDD-style — these tests define the contract and will fail until
 * Drizzt lands the implementation on this branch.
 *
 * Endpoint spec per entity:
 *   GET    /admin/api/content/{entity}        → 200 (array)
 *   GET    /admin/api/content/{entity}/:id    → 200 | 404
 *   POST   /admin/api/content/{entity}        → 201 | 400
 *   PUT    /admin/api/content/{entity}/:id    → 200 | 404
 *   DELETE /admin/api/content/{entity}/:id    → 204 | 404
 *
 * All endpoints require: Authorization: Bearer {ADMIN_TOKEN}
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import { createAdminRouter, type AdminRouterDeps } from '../admin/routes.js';
import { createContentRouter, initializeContentStores } from '../admin/content/index.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const TEST_TOKEN = 'test-admin-token-12345';

/**
 * Minimal valid payloads for each entity type.
 * These represent the smallest correct body that should pass validation.
 */
const ENTITY_FIXTURES: Record<string, { create: Record<string, unknown>; update: Record<string, unknown> }> = {
  items: {
    create: { name: 'Rusty Blade', type: 'weapon', rarity: 'scrap', description: 'A corroded sword', weight: 2 },
    update: { name: 'Sharpened Blade', description: 'A newly honed sword' },
  },
  creatures: {
    create: { name: 'Drowned Revenant', type: 'drowned_revenant', hp: 50, maxHp: 50, attack: 8, defence: 4, armour: 2 },
    update: { name: 'Greater Drowned Revenant', hp: 80, maxHp: 80 },
  },
  biomes: {
    create: { name: 'Flooded Crypt', type: 'flooded_crypt', description: 'A waterlogged burial ground', tier: 1 },
    update: { description: 'A dark, waterlogged burial ground', tier: 2 },
  },
  modifiers: {
    create: { name: 'Darkness', type: 'darkness', description: 'Vision is severely limited', effect: { visibility: -0.5 } },
    update: { description: 'Near-total darkness engulfs the shard' },
  },
  skills: {
    create: { name: 'Heavy Strike', type: 'active', description: 'A powerful overhead blow', staminaCost: 15 },
    update: { description: 'A devastating overhead blow', staminaCost: 20 },
  },
  'loot-tables': {
    create: { name: 'Crypt Standard', biome: 'flooded_crypt', tier: 1, entries: [{ itemId: 'rusty_blade', dropWeight: 30 }] },
    update: { entries: [{ itemId: 'rusty_blade', dropWeight: 20 }, { itemId: 'bone_shard', dropWeight: 40 }] },
  },
  factions: {
    create: { name: 'Ironhearth', factionId: 'ironhearth', description: 'Stalwart defenders of the Refuge' },
    update: { description: 'Battle-hardened defenders of the last Refuge' },
  },
  rooms: {
    create: { name: 'Flooded Antechamber', type: 'corridor', description: 'A half-submerged passage', exits: {} },
    update: { description: 'A fully submerged passage', exits: { north: 'room-2' } },
  },
  narrative: {
    create: { name: 'Crypt Entry', type: 'room_description', template: 'You step into {biome}...', tags: ['entry', 'atmospheric'] },
    update: { template: 'You cautiously enter {biome}...', tags: ['entry', 'atmospheric', 'revised'] },
  },
};

/**
 * All 9 entity type slugs used in URL paths.
 */
const ENTITY_TYPES = Object.keys(ENTITY_FIXTURES);

// ─── Test Helpers ───────────────────────────────────────────────────────────

function createTestApp(deps: AdminRouterDeps = {}): express.Express {
  const app = express();
  app.use(express.json());
  app.use(createAdminRouter(deps));
  // Mount content CRUD routes with fresh stores per test app
  const contentStores = initializeContentStores();
  app.use(createContentRouter({ stores: contentStores }));
  return app;
}

/**
 * Extended request helper supporting all HTTP methods needed for CRUD.
 * Follows the pattern from admin.test.ts but adds PUT and DELETE.
 */
async function request(
  app: express.Express,
  method: 'get' | 'post' | 'put' | 'delete',
  path: string,
  opts?: { body?: Record<string, unknown>; token?: string },
): Promise<{ status: number; body: unknown; text: string }> {
  const server = app.listen(0);
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;

  try {
    const headers: Record<string, string> = {};
    if (opts?.token) {
      headers['Authorization'] = `Bearer ${opts.token}`;
    }
    if (opts?.body) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      method: method.toUpperCase(),
      headers,
      body: opts?.body ? JSON.stringify(opts.body) : undefined,
    });

    const text = await res.text();
    let json: unknown = {};
    try {
      json = JSON.parse(text);
    } catch {
      // non-JSON response (e.g. 204 empty body)
    }
    return { status: res.status, body: json, text };
  } finally {
    server.close();
  }
}

// ─── Auth Enforcement (shared across all CRUD endpoints) ────────────────────

describe('Admin Content CRUD — Auth Enforcement', () => {
  const originalEnv = process.env['ADMIN_TOKEN'];

  beforeEach(() => {
    process.env['ADMIN_TOKEN'] = TEST_TOKEN;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env['ADMIN_TOKEN'] = originalEnv;
    } else {
      delete process.env['ADMIN_TOKEN'];
    }
  });

  // Test a representative subset — one list, one get, one create, one update, one delete
  const authProbes: Array<{ method: 'get' | 'post' | 'put' | 'delete'; path: string; body?: Record<string, unknown> }> = [
    { method: 'get', path: '/admin/api/content/items' },
    { method: 'get', path: '/admin/api/content/items/some-id' },
    { method: 'post', path: '/admin/api/content/items', body: ENTITY_FIXTURES.items.create },
    { method: 'put', path: '/admin/api/content/items/some-id', body: ENTITY_FIXTURES.items.update },
    { method: 'delete', path: '/admin/api/content/items/some-id' },
  ];

  for (const probe of authProbes) {
    it(`returns 401 for ${probe.method.toUpperCase()} ${probe.path} without token`, async () => {
      const app = createTestApp();
      const res = await request(app, probe.method, probe.path, { body: probe.body });
      expect(res.status).toBe(401);
    });

    it(`returns 403 for ${probe.method.toUpperCase()} ${probe.path} with wrong token`, async () => {
      const app = createTestApp();
      const res = await request(app, probe.method, probe.path, {
        token: 'wrong-token-not-valid',
        body: probe.body,
      });
      expect(res.status).toBe(403);
    });
  }
});

// ─── CRUD Lifecycle Per Entity Type ─────────────────────────────────────────

describe('Admin Content CRUD — Lifecycle', () => {
  const originalEnv = process.env['ADMIN_TOKEN'];

  beforeEach(() => {
    process.env['ADMIN_TOKEN'] = TEST_TOKEN;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env['ADMIN_TOKEN'] = originalEnv;
    } else {
      delete process.env['ADMIN_TOKEN'];
    }
  });

  for (const entityType of ENTITY_TYPES) {
    describe(`${entityType}`, () => {
      const basePath = `/admin/api/content/${entityType}`;
      const fixtures = ENTITY_FIXTURES[entityType];

      it(`full CRUD lifecycle: create → read → update → read → delete → verify 404`, async () => {
        const app = createTestApp();

        // ── Step 1: Create ──
        const createRes = await request(app, 'post', basePath, {
          token: TEST_TOKEN,
          body: fixtures.create,
        });
        expect(createRes.status).toBe(201);
        const created = createRes.body as Record<string, unknown>;
        expect(created).toHaveProperty('id');
        const id = created.id as string;
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);

        // Verify created object echoes back the input fields
        for (const [key, value] of Object.entries(fixtures.create)) {
          expect(created[key]).toEqual(value);
        }

        // ── Step 2: Read by ID ──
        const getRes = await request(app, 'get', `${basePath}/${id}`, {
          token: TEST_TOKEN,
        });
        expect(getRes.status).toBe(200);
        const fetched = getRes.body as Record<string, unknown>;
        expect(fetched.id).toBe(id);
        for (const [key, value] of Object.entries(fixtures.create)) {
          expect(fetched[key]).toEqual(value);
        }

        // ── Step 3: Update ──
        const updateRes = await request(app, 'put', `${basePath}/${id}`, {
          token: TEST_TOKEN,
          body: fixtures.update,
        });
        expect(updateRes.status).toBe(200);
        const updated = updateRes.body as Record<string, unknown>;
        expect(updated.id).toBe(id);
        // Verify updated fields are reflected
        for (const [key, value] of Object.entries(fixtures.update)) {
          expect(updated[key]).toEqual(value);
        }

        // ── Step 4: Read again to verify persistence ──
        const getUpdatedRes = await request(app, 'get', `${basePath}/${id}`, {
          token: TEST_TOKEN,
        });
        expect(getUpdatedRes.status).toBe(200);
        const reFetched = getUpdatedRes.body as Record<string, unknown>;
        for (const [key, value] of Object.entries(fixtures.update)) {
          expect(reFetched[key]).toEqual(value);
        }

        // ── Step 5: Delete ──
        const deleteRes = await request(app, 'delete', `${basePath}/${id}`, {
          token: TEST_TOKEN,
        });
        expect(deleteRes.status).toBe(204);

        // ── Step 6: Verify deletion — read should 404 ──
        const getDeletedRes = await request(app, 'get', `${basePath}/${id}`, {
          token: TEST_TOKEN,
        });
        expect(getDeletedRes.status).toBe(404);
      });

      it(`GET ${basePath} — list returns array that includes created entities`, async () => {
        const app = createTestApp();

        // Create two entities
        const create1 = await request(app, 'post', basePath, {
          token: TEST_TOKEN,
          body: fixtures.create,
        });
        expect(create1.status).toBe(201);
        const id1 = (create1.body as Record<string, unknown>).id as string;

        const secondPayload = { ...fixtures.create, name: `${(fixtures.create.name as string)} II` };
        const create2 = await request(app, 'post', basePath, {
          token: TEST_TOKEN,
          body: secondPayload,
        });
        expect(create2.status).toBe(201);
        const id2 = (create2.body as Record<string, unknown>).id as string;

        // List all
        const listRes = await request(app, 'get', basePath, { token: TEST_TOKEN });
        expect(listRes.status).toBe(200);
        const list = listRes.body as unknown[];
        expect(Array.isArray(list)).toBe(true);
        expect(list.length).toBeGreaterThanOrEqual(2);

        // Both created entities should appear
        const ids = list.map((e) => (e as Record<string, unknown>).id);
        expect(ids).toContain(id1);
        expect(ids).toContain(id2);

        // Clean up
        await request(app, 'delete', `${basePath}/${id1}`, { token: TEST_TOKEN });
        await request(app, 'delete', `${basePath}/${id2}`, { token: TEST_TOKEN });
      });
    });
  }
});

// ─── 404 Handling ───────────────────────────────────────────────────────────

describe('Admin Content CRUD — 404 on Non-Existent ID', () => {
  const originalEnv = process.env['ADMIN_TOKEN'];

  beforeEach(() => {
    process.env['ADMIN_TOKEN'] = TEST_TOKEN;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env['ADMIN_TOKEN'] = originalEnv;
    } else {
      delete process.env['ADMIN_TOKEN'];
    }
  });

  const PHANTOM_ID = 'nonexistent-id-00000000';

  for (const entityType of ENTITY_TYPES) {
    const basePath = `/admin/api/content/${entityType}`;

    it(`GET ${basePath}/${PHANTOM_ID} → 404`, async () => {
      const app = createTestApp();
      const res = await request(app, 'get', `${basePath}/${PHANTOM_ID}`, { token: TEST_TOKEN });
      expect(res.status).toBe(404);
    });

    it(`PUT ${basePath}/${PHANTOM_ID} → 404`, async () => {
      const app = createTestApp();
      const res = await request(app, 'put', `${basePath}/${PHANTOM_ID}`, {
        token: TEST_TOKEN,
        body: ENTITY_FIXTURES[entityType].update,
      });
      expect(res.status).toBe(404);
    });

    it(`DELETE ${basePath}/${PHANTOM_ID} → 404`, async () => {
      const app = createTestApp();
      const res = await request(app, 'delete', `${basePath}/${PHANTOM_ID}`, { token: TEST_TOKEN });
      expect(res.status).toBe(404);
    });
  }
});

// ─── Validation — Missing Required Fields ───────────────────────────────────

describe('Admin Content CRUD — Validation (400 on bad input)', () => {
  const originalEnv = process.env['ADMIN_TOKEN'];

  beforeEach(() => {
    process.env['ADMIN_TOKEN'] = TEST_TOKEN;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env['ADMIN_TOKEN'] = originalEnv;
    } else {
      delete process.env['ADMIN_TOKEN'];
    }
  });

  for (const entityType of ENTITY_TYPES) {
    const basePath = `/admin/api/content/${entityType}`;

    it(`POST ${basePath} with empty body → 400`, async () => {
      const app = createTestApp();
      const res = await request(app, 'post', basePath, {
        token: TEST_TOKEN,
        body: {},
      });
      expect(res.status).toBe(400);
      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('error');
    });

    it(`POST ${basePath} with missing name → 400`, async () => {
      const app = createTestApp();
      const { name: _omitted, ...incomplete } = ENTITY_FIXTURES[entityType].create;
      void _omitted;
      const res = await request(app, 'post', basePath, {
        token: TEST_TOKEN,
        body: incomplete,
      });
      expect(res.status).toBe(400);
    });
  }
});
