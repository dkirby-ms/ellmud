/**
 * User management CRUD routes for admin dashboard.
 *
 * Provides GET/POST/PUT/DELETE for user accounts:
 *   GET    /admin/api/users      — list all users
 *   GET    /admin/api/users/:id  — get single user
 *   POST   /admin/api/users      — create user (bcrypt password)
 *   PUT    /admin/api/users/:id  — update user (username, email, role)
 *   DELETE /admin/api/users/:id  — delete user
 *
 * All routes protected by adminAuth middleware.
 * password_hash is NEVER returned in API responses.
 *
 * Accepts an optional UserStore for dependency injection. When none is
 * provided, auto-selects PgUserStore (DATABASE_URL set) or
 * InMemoryUserStore (no DATABASE_URL) — matching the repository pattern
 * used by StashRepository and PlayerRepository.
 */

import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { adminAuth } from '../middleware.js';
import {
  type UserStore,
  type UserRecord,
  PgUserStore,
  InMemoryUserStore,
  DuplicateUsernameError,
  DuplicateProviderError,
} from './user-store.js';

const BCRYPT_ROUNDS = 10;

const VALID_ROLES = ['player', 'viewer', 'moderator', 'admin'] as const;
type UserRole = typeof VALID_ROLES[number];

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidRole(role: string): role is UserRole {
  return VALID_ROLES.includes(role as UserRole);
}

function toJson(record: UserRecord) {
  return {
    id: record.id,
    identityId: record.identityId,
    username: record.username,
    email: record.email,
    role: record.role,
    provider: record.provider,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

// Shared in-memory store so multiple routers see the same data (tests, dev).
let sharedInMemoryStore: InMemoryUserStore | null = null;

function getDefaultStore(): UserStore {
  if (process.env.DATABASE_URL) {
    return new PgUserStore();
  }
  if (!sharedInMemoryStore) {
    sharedInMemoryStore = new InMemoryUserStore();
  }
  return sharedInMemoryStore;
}

export function createUserRouter(store?: UserStore): Router {
  const userStore = store ?? getDefaultStore();

  const router = Router();

  // ─── GET /admin/api/users — List all users ─────────────────────────
  router.get('/admin/api/users', adminAuth, async (_req: Request, res: Response) => {
    try {
      const users = await userStore.listUsers();
      res.json(users.map(toJson));
    } catch (err) {
      console.error('[Admin] Failed to list users:', err);
      res.status(500).json({ error: 'Failed to list users' });
    }
  });

  // ─── GET /admin/api/users/:id — Get single user ───────────────────
  router.get('/admin/api/users/:id', adminAuth, async (req: Request, res: Response) => {
    try {
      const user = await userStore.getUserById(req.params.id);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      res.json(toJson(user));
    } catch (err) {
      console.error('[Admin] Failed to get user:', err);
      res.status(500).json({ error: 'Failed to get user' });
    }
  });

  // ─── POST /admin/api/users — Create user ──────────────────────────
  router.post('/admin/api/users', adminAuth, async (req: Request, res: Response) => {
    try {
      const { username, email, password, role } = req.body as {
        username?: string;
        email?: string;
        password?: string;
        role?: string;
      };

      // Validate required fields
      const errors: string[] = [];

      if (!username || username.trim().length === 0) {
        errors.push('Username is required');
      } else if (username.trim().length < 3) {
        errors.push('Username must be at least 3 characters');
      }

      if (!password || password.length < 8) {
        errors.push('Password must be at least 8 characters');
      }

      if (email && !isValidEmail(email)) {
        errors.push('Invalid email format');
      }

      if (role !== undefined && role.trim() !== '' && !isValidRole(role)) {
        errors.push(`Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`);
      }

      if (errors.length > 0) {
        res.status(400).json({ error: 'Validation failed', details: errors });
        return;
      }

      const passwordHash = await bcrypt.hash(password!, BCRYPT_ROUNDS);
      const userRole = role && role.trim() && isValidRole(role) ? role : 'player';

      const user = await userStore.createUser({
        username: username!.trim(),
        passwordHash,
        email: email || null,
        role: userRole,
      });

      res.status(201).json(toJson(user));
    } catch (err) {
      if (err instanceof DuplicateUsernameError) {
        res.status(409).json({ error: err.message });
        return;
      }
      if (err instanceof DuplicateProviderError) {
        res.status(409).json({ error: err.message });
        return;
      }
      if (!res.headersSent) {
        console.error('[Admin] Failed to create user:', err);
        res.status(500).json({ error: 'Failed to create user' });
      }
    }
  });

  // ─── PUT /admin/api/users/:id — Update user ───────────────────────
  router.put('/admin/api/users/:id', adminAuth, async (req: Request, res: Response) => {
    try {
      const { username, email, role } = req.body as {
        username?: string;
        email?: string;
        role?: string;
      };

      // Validate
      const errors: string[] = [];

      if (username !== undefined && username.trim().length < 3) {
        errors.push('Username must be at least 3 characters');
      }

      if (email !== undefined && email !== '' && !isValidEmail(email)) {
        errors.push('Invalid email format');
      }

      if (role !== undefined && !isValidRole(role)) {
        errors.push(`Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`);
      }

      if (errors.length > 0) {
        res.status(400).json({ error: 'Validation failed', details: errors });
        return;
      }

      const updated = await userStore.updateUser(req.params.id, { username, email, role });

      if (!updated) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json(toJson(updated));
    } catch (err) {
      if (err instanceof DuplicateUsernameError) {
        res.status(409).json({ error: err.message });
        return;
      }
      if (!res.headersSent) {
        console.error('[Admin] Failed to update user:', err);
        res.status(500).json({ error: 'Failed to update user' });
      }
    }
  });

  // ─── DELETE /admin/api/users/:id — Delete user ─────────────────────
  router.delete('/admin/api/users/:id', adminAuth, async (req: Request, res: Response) => {
    try {
      const deleted = await userStore.deleteUser(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      res.status(204).send();
    } catch (err) {
      console.error('[Admin] Failed to delete user:', err);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });

  return router;
}
