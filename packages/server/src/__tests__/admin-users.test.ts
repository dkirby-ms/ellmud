/**
 * Integration tests for the Admin User Management API (PR #148).
 *
 * Tests the full CRUD lifecycle for user management:
 *   GET    /admin/api/users        → 200 (array)
 *   GET    /admin/api/users/:id    → 200 | 404
 *   POST   /admin/api/users        → 201 | 400 | 409
 *   PUT    /admin/api/users/:id    → 200 | 404 | 400
 *   DELETE /admin/api/users/:id    → 204 | 404
 *
 * Security & validation requirements:
 *   - All endpoints require Authorization: Bearer {ADMIN_TOKEN}
 *   - Valid roles: player, content-dev, admin
 *   - Password hash NEVER exposed in responses
 *   - Empty string roles should default to 'player' in POST
 *   - Username must be at least 3 characters
 *   - Password must be at least 8 characters
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import express from 'express';
import { createAdminRouter } from '../admin/routes.js';
import { createUserRouter } from '../admin/users/index.js';
import { InMemoryUserStore } from '../admin/users/user-store.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const TEST_TOKEN = 'test-admin-token-12345';

// ─── Test Helpers ───────────────────────────────────────────────────────────

// Shared store for all tests - ensures consistent state management
const testUserStore = new InMemoryUserStore();

function createTestApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.use(createAdminRouter());
  app.use(createUserRouter(testUserStore));
  return app;
}

/**
 * Extended request helper supporting all HTTP methods needed for CRUD.
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

/**
 * Clean up test users created during tests.
 * Not needed for InMemoryUserStore since resetStore() handles cleanup.
 */
async function cleanupTestUser(_username: string): Promise<void> {
  // No-op: InMemoryUserStore is reset in beforeEach
}

// ─── Auth Enforcement (shared across all CRUD endpoints) ────────────────────

describe('Admin User Management — Auth Enforcement', () => {
  const originalEnv = process.env['ADMIN_TOKEN'];

  beforeEach(() => {
    testUserStore.resetStore();
    process.env['ADMIN_TOKEN'] = TEST_TOKEN;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env['ADMIN_TOKEN'] = originalEnv;
    } else {
      delete process.env['ADMIN_TOKEN'];
    }
  });

  const authProbes: Array<{ method: 'get' | 'post' | 'put' | 'delete'; path: string; body?: Record<string, unknown> }> = [
    { method: 'get', path: '/admin/api/users' },
    { method: 'get', path: '/admin/api/users/some-id' },
    { method: 'post', path: '/admin/api/users', body: { username: 'testuser', password: 'password123' } },
    { method: 'put', path: '/admin/api/users/some-id', body: { username: 'updateduser' } },
    { method: 'delete', path: '/admin/api/users/some-id' },
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

// ─── CRUD Lifecycle ─────────────────────────────────────────────────────────

describe('Admin User Management — CRUD Lifecycle', () => {
  const originalEnv = process.env['ADMIN_TOKEN'];

  beforeEach(() => {
    testUserStore.resetStore();
    process.env['ADMIN_TOKEN'] = TEST_TOKEN;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env['ADMIN_TOKEN'] = originalEnv;
    } else {
      delete process.env['ADMIN_TOKEN'];
    }
  });

  it('full CRUD lifecycle: create → read → update → read → delete → verify 404', async () => {
    const app = createTestApp();
    const testUsername = `testuser_${Date.now()}`;

    try {
      // ── Step 1: Create ──
      const createRes = await request(app, 'post', '/admin/api/users', {
        token: TEST_TOKEN,
        body: {
          username: testUsername,
          email: 'test@example.com',
          password: 'password123',
          role: 'player',
        },
      });
      expect(createRes.status).toBe(201);
      const created = createRes.body as Record<string, unknown>;
      expect(created).toHaveProperty('id');
      expect(created.username).toBe(testUsername);
      expect(created.email).toBe('test@example.com');
      expect(created.role).toBe('player');
      expect(created).not.toHaveProperty('password_hash');
      expect(created).not.toHaveProperty('passwordHash');
      const userId = created.id as string;

      // ── Step 2: Read by ID ──
      const getRes = await request(app, 'get', `/admin/api/users/${userId}`, {
        token: TEST_TOKEN,
      });
      expect(getRes.status).toBe(200);
      const fetched = getRes.body as Record<string, unknown>;
      expect(fetched.id).toBe(userId);
      expect(fetched.username).toBe(testUsername);
      expect(fetched.email).toBe('test@example.com');
      expect(fetched.role).toBe('player');
      expect(fetched).not.toHaveProperty('password_hash');
      expect(fetched).not.toHaveProperty('passwordHash');

      // ── Step 3: Update ──
      const updateRes = await request(app, 'put', `/admin/api/users/${userId}`, {
        token: TEST_TOKEN,
        body: {
          username: `${testUsername}_updated`,
          email: 'updated@example.com',
          role: 'content-dev',
        },
      });
      expect(updateRes.status).toBe(200);
      const updated = updateRes.body as Record<string, unknown>;
      expect(updated.id).toBe(userId);
      expect(updated.username).toBe(`${testUsername}_updated`);
      expect(updated.email).toBe('updated@example.com');
      expect(updated.role).toBe('content-dev');
      expect(updated).not.toHaveProperty('password_hash');
      expect(updated).not.toHaveProperty('passwordHash');

      // ── Step 4: Read again to verify persistence ──
      const getUpdatedRes = await request(app, 'get', `/admin/api/users/${userId}`, {
        token: TEST_TOKEN,
      });
      expect(getUpdatedRes.status).toBe(200);
      const reFetched = getUpdatedRes.body as Record<string, unknown>;
      expect(reFetched.username).toBe(`${testUsername}_updated`);
      expect(reFetched.email).toBe('updated@example.com');
      expect(reFetched.role).toBe('content-dev');

      // ── Step 5: Delete ──
      const deleteRes = await request(app, 'delete', `/admin/api/users/${userId}`, {
        token: TEST_TOKEN,
      });
      expect(deleteRes.status).toBe(204);

      // ── Step 6: Verify deletion — read should 404 ──
      const getDeletedRes = await request(app, 'get', `/admin/api/users/${userId}`, {
        token: TEST_TOKEN,
      });
      expect(getDeletedRes.status).toBe(404);
    } finally {
      await cleanupTestUser(testUsername);
      await cleanupTestUser(`${testUsername}_updated`);
    }
  });

  it('GET /admin/api/users — list returns array', async () => {
    const app = createTestApp();
    const listRes = await request(app, 'get', '/admin/api/users', { token: TEST_TOKEN });
    expect(listRes.status).toBe(200);
    const list = listRes.body as unknown[];
    expect(Array.isArray(list)).toBe(true);
    
    // Verify no user in the list exposes password_hash
    for (const user of list) {
      expect(user).not.toHaveProperty('password_hash');
      expect(user).not.toHaveProperty('passwordHash');
    }
  });

  it('GET /admin/api/users/:id — returns 404 for non-existent user', async () => {
    const app = createTestApp();
    const res = await request(app, 'get', '/admin/api/users/00000000-0000-0000-0000-000000000000', {
      token: TEST_TOKEN,
    });
    expect(res.status).toBe(404);
  });
});

// ─── POST Validation ────────────────────────────────────────────────────────

describe('Admin User Management — POST Validation', () => {
  const originalEnv = process.env['ADMIN_TOKEN'];

  beforeEach(() => {
    testUserStore.resetStore();
    process.env['ADMIN_TOKEN'] = TEST_TOKEN;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env['ADMIN_TOKEN'] = originalEnv;
    } else {
      delete process.env['ADMIN_TOKEN'];
    }
  });

  it('POST with valid data creates user', async () => {
    const app = createTestApp();
    const testUsername = `validuser_${Date.now()}`;

    try {
      const res = await request(app, 'post', '/admin/api/users', {
        token: TEST_TOKEN,
        body: {
          username: testUsername,
          email: 'valid@example.com',
          password: 'securepass123',
          role: 'content-dev',
        },
      });
      expect(res.status).toBe(201);
      const user = res.body as Record<string, unknown>;
      expect(user.username).toBe(testUsername);
      expect(user.role).toBe('content-dev');
      expect(user).not.toHaveProperty('password_hash');
    } finally {
      await cleanupTestUser(testUsername);
    }
  });

  it('POST with missing username rejects with 400', async () => {
    const app = createTestApp();
    const res = await request(app, 'post', '/admin/api/users', {
      token: TEST_TOKEN,
      body: {
        email: 'test@example.com',
        password: 'password123',
      },
    });
    expect(res.status).toBe(400);
    const body = res.body as Record<string, unknown>;
    expect(body).toHaveProperty('error');
  });

  it('POST with short username rejects with 400', async () => {
    const app = createTestApp();
    const res = await request(app, 'post', '/admin/api/users', {
      token: TEST_TOKEN,
      body: {
        username: 'ab',
        email: 'test@example.com',
        password: 'password123',
      },
    });
    expect(res.status).toBe(400);
  });

  it('POST with missing password rejects with 400', async () => {
    const app = createTestApp();
    const res = await request(app, 'post', '/admin/api/users', {
      token: TEST_TOKEN,
      body: {
        username: 'testuser',
        email: 'test@example.com',
      },
    });
    expect(res.status).toBe(400);
  });

  it('POST with short password rejects with 400', async () => {
    const app = createTestApp();
    const res = await request(app, 'post', '/admin/api/users', {
      token: TEST_TOKEN,
      body: {
        username: 'testuser',
        email: 'test@example.com',
        password: 'short',
      },
    });
    expect(res.status).toBe(400);
  });

  it('POST with invalid email rejects with 400', async () => {
    const app = createTestApp();
    const res = await request(app, 'post', '/admin/api/users', {
      token: TEST_TOKEN,
      body: {
        username: 'testuser',
        email: 'not-an-email',
        password: 'password123',
      },
    });
    expect(res.status).toBe(400);
  });

  it('POST with invalid role rejects with 400', async () => {
    const app = createTestApp();
    const res = await request(app, 'post', '/admin/api/users', {
      token: TEST_TOKEN,
      body: {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'superadmin',
      },
    });
    expect(res.status).toBe(400);
    const body = res.body as Record<string, unknown>;
    expect(body).toHaveProperty('error');
  });

  it('POST with empty string role defaults to player', async () => {
    const app = createTestApp();
    const testUsername = `emptyRole_${Date.now()}`;

    try {
      const res = await request(app, 'post', '/admin/api/users', {
        token: TEST_TOKEN,
        body: {
          username: testUsername,
          email: 'test@example.com',
          password: 'password123',
          role: '',
        },
      });
      expect(res.status).toBe(201);
      const user = res.body as Record<string, unknown>;
      expect(user.role).toBe('player');
    } finally {
      await cleanupTestUser(testUsername);
    }
  });

  it('POST without role defaults to player', async () => {
    const app = createTestApp();
    const testUsername = `noRole_${Date.now()}`;

    try {
      const res = await request(app, 'post', '/admin/api/users', {
        token: TEST_TOKEN,
        body: {
          username: testUsername,
          email: 'test@example.com',
          password: 'password123',
        },
      });
      expect(res.status).toBe(201);
      const user = res.body as Record<string, unknown>;
      expect(user.role).toBe('player');
    } finally {
      await cleanupTestUser(testUsername);
    }
  });
});

// ─── PUT Validation ─────────────────────────────────────────────────────────

describe('Admin User Management — PUT Validation', () => {
  const originalEnv = process.env['ADMIN_TOKEN'];
  let testUserId: string;
  const testUsername = `puttest_${Date.now()}`;

  beforeAll(async () => {
    testUserStore.resetStore();
    process.env['ADMIN_TOKEN'] = TEST_TOKEN;
    // Create a test user
    const app = createTestApp();
    const res = await request(app, 'post', '/admin/api/users', {
      token: TEST_TOKEN,
      body: {
        username: testUsername,
        email: 'puttest@example.com',
        password: 'password123',
      },
    });
    testUserId = (res.body as Record<string, unknown>).id as string;
  });

  afterAll(async () => {
    await cleanupTestUser(testUsername);
    if (originalEnv !== undefined) {
      process.env['ADMIN_TOKEN'] = originalEnv;
    } else {
      delete process.env['ADMIN_TOKEN'];
    }
  });

  beforeEach(() => {
    // Don't reset store here - we need the user created in beforeAll
    process.env['ADMIN_TOKEN'] = TEST_TOKEN;
  });

  it('PUT with partial update (username only) succeeds', async () => {
    const app = createTestApp();
    const res = await request(app, 'put', `/admin/api/users/${testUserId}`, {
      token: TEST_TOKEN,
      body: { username: `${testUsername}_v2` },
    });
    expect(res.status).toBe(200);
    const user = res.body as Record<string, unknown>;
    expect(user.username).toBe(`${testUsername}_v2`);
  });

  it('PUT with partial update (role only) succeeds', async () => {
    const app = createTestApp();
    const res = await request(app, 'put', `/admin/api/users/${testUserId}`, {
      token: TEST_TOKEN,
      body: { role: 'admin' },
    });
    expect(res.status).toBe(200);
    const user = res.body as Record<string, unknown>;
    expect(user.role).toBe('admin');
  });

  it('PUT with invalid role rejects with 400', async () => {
    const app = createTestApp();
    const res = await request(app, 'put', `/admin/api/users/${testUserId}`, {
      token: TEST_TOKEN,
      body: { role: 'invalidrole' },
    });
    expect(res.status).toBe(400);
  });

  it('PUT with empty string role rejects with 400', async () => {
    const app = createTestApp();
    const res = await request(app, 'put', `/admin/api/users/${testUserId}`, {
      token: TEST_TOKEN,
      body: { role: '' },
    });
    expect(res.status).toBe(400);
  });

  it('PUT with short username rejects with 400', async () => {
    const app = createTestApp();
    const res = await request(app, 'put', `/admin/api/users/${testUserId}`, {
      token: TEST_TOKEN,
      body: { username: 'ab' },
    });
    expect(res.status).toBe(400);
  });

  it('PUT with invalid email rejects with 400', async () => {
    const app = createTestApp();
    const res = await request(app, 'put', `/admin/api/users/${testUserId}`, {
      token: TEST_TOKEN,
      body: { email: 'not-an-email' },
    });
    expect(res.status).toBe(400);
  });

  it('PUT on non-existent user returns 404', async () => {
    const app = createTestApp();
    const res = await request(app, 'put', '/admin/api/users/00000000-0000-0000-0000-000000000000', {
      token: TEST_TOKEN,
      body: { username: 'newname' },
    });
    expect(res.status).toBe(404);
  });

  it('PUT response never exposes password hash', async () => {
    const app = createTestApp();
    const res = await request(app, 'put', `/admin/api/users/${testUserId}`, {
      token: TEST_TOKEN,
      body: { username: `${testUsername}_secure` },
    });
    expect(res.status).toBe(200);
    const user = res.body as Record<string, unknown>;
    expect(user).not.toHaveProperty('password_hash');
    expect(user).not.toHaveProperty('passwordHash');
  });
});

// ─── DELETE Validation ──────────────────────────────────────────────────────

describe('Admin User Management — DELETE', () => {
  const originalEnv = process.env['ADMIN_TOKEN'];

  beforeEach(() => {
    testUserStore.resetStore();
    process.env['ADMIN_TOKEN'] = TEST_TOKEN;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env['ADMIN_TOKEN'] = originalEnv;
    } else {
      delete process.env['ADMIN_TOKEN'];
    }
  });

  it('DELETE on non-existent user returns 404', async () => {
    const app = createTestApp();
    const res = await request(app, 'delete', '/admin/api/users/00000000-0000-0000-0000-000000000000', {
      token: TEST_TOKEN,
    });
    expect(res.status).toBe(404);
  });

  it('DELETE removes user successfully', async () => {
    const app = createTestApp();
    const testUsername = `deletetest_${Date.now()}`;

    // Create user
    const createRes = await request(app, 'post', '/admin/api/users', {
      token: TEST_TOKEN,
      body: {
        username: testUsername,
        email: 'delete@example.com',
        password: 'password123',
      },
    });
    const userId = (createRes.body as Record<string, unknown>).id as string;

    // Delete user
    const deleteRes = await request(app, 'delete', `/admin/api/users/${userId}`, {
      token: TEST_TOKEN,
    });
    expect(deleteRes.status).toBe(204);

    // Verify user is gone
    const getRes = await request(app, 'get', `/admin/api/users/${userId}`, {
      token: TEST_TOKEN,
    });
    expect(getRes.status).toBe(404);
  });
});

// ─── Role Validation ────────────────────────────────────────────────────────

describe('Admin User Management — Role Validation', () => {
  const originalEnv = process.env['ADMIN_TOKEN'];

  beforeEach(() => {
    testUserStore.resetStore();
    process.env['ADMIN_TOKEN'] = TEST_TOKEN;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env['ADMIN_TOKEN'] = originalEnv;
    } else {
      delete process.env['ADMIN_TOKEN'];
    }
  });

  const validRoles = ['player', 'content-dev', 'admin'];

  for (const role of validRoles) {
    it(`POST with role="${role}" succeeds`, async () => {
      const app = createTestApp();
      const testUsername = `role_${role}_${Date.now()}`;

      try {
        const res = await request(app, 'post', '/admin/api/users', {
          token: TEST_TOKEN,
          body: {
            username: testUsername,
            email: `${role}@example.com`,
            password: 'password123',
            role,
          },
        });
        expect(res.status).toBe(201);
        const user = res.body as Record<string, unknown>;
        expect(user.role).toBe(role);
      } finally {
        await cleanupTestUser(testUsername);
      }
    });
  }
});

// ─── Password Hash Security ─────────────────────────────────────────────────

describe('Admin User Management — Password Hash Security', () => {
  const originalEnv = process.env['ADMIN_TOKEN'];

  beforeEach(() => {
    testUserStore.resetStore();
    process.env['ADMIN_TOKEN'] = TEST_TOKEN;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env['ADMIN_TOKEN'] = originalEnv;
    } else {
      delete process.env['ADMIN_TOKEN'];
    }
  });

  it('POST response never exposes password hash', async () => {
    const app = createTestApp();
    const testUsername = `security_post_${Date.now()}`;

    try {
      const res = await request(app, 'post', '/admin/api/users', {
        token: TEST_TOKEN,
        body: {
          username: testUsername,
          email: 'security@example.com',
          password: 'password123',
        },
      });
      expect(res.status).toBe(201);
      const user = res.body as Record<string, unknown>;
      expect(user).not.toHaveProperty('password_hash');
      expect(user).not.toHaveProperty('passwordHash');
      expect(user).not.toHaveProperty('password');
    } finally {
      await cleanupTestUser(testUsername);
    }
  });

  it('GET /admin/api/users/:id never exposes password hash', async () => {
    const app = createTestApp();
    const testUsername = `security_get_${Date.now()}`;

    try {
      const createRes = await request(app, 'post', '/admin/api/users', {
        token: TEST_TOKEN,
        body: {
          username: testUsername,
          email: 'security@example.com',
          password: 'password123',
        },
      });
      const userId = (createRes.body as Record<string, unknown>).id as string;

      const getRes = await request(app, 'get', `/admin/api/users/${userId}`, {
        token: TEST_TOKEN,
      });
      expect(getRes.status).toBe(200);
      const user = getRes.body as Record<string, unknown>;
      expect(user).not.toHaveProperty('password_hash');
      expect(user).not.toHaveProperty('passwordHash');
      expect(user).not.toHaveProperty('password');
    } finally {
      await cleanupTestUser(testUsername);
    }
  });

  it('GET /admin/api/users list never exposes password hash', async () => {
    const app = createTestApp();
    const res = await request(app, 'get', '/admin/api/users', { token: TEST_TOKEN });
    expect(res.status).toBe(200);
    const users = res.body as Record<string, unknown>[];
    
    for (const user of users) {
      expect(user).not.toHaveProperty('password_hash');
      expect(user).not.toHaveProperty('passwordHash');
      expect(user).not.toHaveProperty('password');
    }
  });
});
