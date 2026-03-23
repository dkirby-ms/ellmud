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
 */

import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { adminAuth } from '../middleware.js';
import { query, getClient } from '../../db/index.js';

const BCRYPT_ROUNDS = 10;

const VALID_ROLES = ['player', 'viewer', 'moderator', 'admin'] as const;
type UserRole = typeof VALID_ROLES[number];

interface UserRow {
  id: string;
  identity_id: string;
  username: string;
  email: string | null;
  role: string;
  provider: string;
  created_at: Date;
  updated_at: Date;
}

interface IdentityRow {
  id: string;
  provider: string;
  email: string | null;
  role: string;
  created_at: Date;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidRole(role: string): role is UserRole {
  return VALID_ROLES.includes(role as UserRole);
}

export function createUserRouter(): Router {
  const router = Router();

  // ─── GET /admin/api/users — List all users ─────────────────────────
  router.get('/admin/api/users', adminAuth, async (_req: Request, res: Response) => {
    try {
      const result = await query<UserRow>(
        `SELECT p.id, p.identity_id, p.username, p.created_at, p.updated_at,
                i.email, i.role, i.provider
         FROM players p
         JOIN player_identities i ON i.id = p.identity_id
         ORDER BY p.created_at DESC`,
      );

      const users = result.rows.map((row) => ({
        id: row.id,
        identityId: row.identity_id,
        username: row.username,
        email: row.email,
        role: row.role,
        provider: row.provider,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      res.json(users);
    } catch (err) {
      console.error('[Admin] Failed to list users:', err);
      res.status(500).json({ error: 'Failed to list users' });
    }
  });

  // ─── GET /admin/api/users/:id — Get single user ───────────────────
  router.get('/admin/api/users/:id', adminAuth, async (req: Request, res: Response) => {
    try {
      const result = await query<UserRow>(
        `SELECT p.id, p.identity_id, p.username, p.created_at, p.updated_at,
                i.email, i.role, i.provider
         FROM players p
         JOIN player_identities i ON i.id = p.identity_id
         WHERE p.id = $1`,
        [req.params.id],
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const row = result.rows[0];
      res.json({
        id: row.id,
        identityId: row.identity_id,
        username: row.username,
        email: row.email,
        role: row.role,
        provider: row.provider,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
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

      if (role && !isValidRole(role)) {
        errors.push(`Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`);
      }

      if (errors.length > 0) {
        res.status(400).json({ error: 'Validation failed', details: errors });
        return;
      }

      const passwordHash = await bcrypt.hash(password!, BCRYPT_ROUNDS);
      const userRole = role || 'player';

      const client = await getClient();
      try {
        await client.query('BEGIN');

        const identityResult = await client.query<IdentityRow>(
          `INSERT INTO player_identities (provider, password_hash, email, role)
           VALUES ('local', $1, $2, $3)
           RETURNING id, provider, email, role, created_at`,
          [passwordHash, email || null, userRole],
        );
        const identity = identityResult.rows[0];

        const playerResult = await client.query<{
          id: string;
          username: string;
          created_at: Date;
          updated_at: Date;
        }>(
          `INSERT INTO players (identity_id, username)
           VALUES ($1, $2)
           RETURNING id, username, created_at, updated_at`,
          [identity.id, username!.trim()],
        );
        const player = playerResult.rows[0];

        await client.query('COMMIT');

        res.status(201).json({
          id: player.id,
          identityId: identity.id,
          username: player.username,
          email: identity.email,
          role: identity.role,
          provider: identity.provider,
          createdAt: player.created_at,
          updatedAt: player.updated_at,
        });
      } catch (err: unknown) {
        await client.query('ROLLBACK');

        if (isPgError(err) && err.code === '23505') {
          if (err.constraint === 'uq_player_username') {
            res.status(409).json({ error: `Username '${username}' is already taken` });
            return;
          }
          if (err.constraint === 'uq_identity_provider') {
            res.status(409).json({ error: 'A local account already exists for this provider ID' });
            return;
          }
        }
        throw err;
      } finally {
        client.release();
      }
    } catch (err) {
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

      // Verify user exists
      const existing = await query<{ id: string; identity_id: string }>(
        `SELECT id, identity_id FROM players WHERE id = $1`,
        [req.params.id],
      );

      if (existing.rows.length === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const identityId = existing.rows[0].identity_id;
      const client = await getClient();

      try {
        await client.query('BEGIN');

        // Update players table (username)
        if (username !== undefined) {
          await client.query(
            `UPDATE players SET username = $1, updated_at = now() WHERE id = $2`,
            [username.trim(), req.params.id],
          );
        }

        // Update player_identities table (email, role)
        const identityUpdates: string[] = [];
        const identityValues: unknown[] = [];
        let paramIndex = 1;

        if (email !== undefined) {
          identityUpdates.push(`email = $${paramIndex++}`);
          identityValues.push(email === '' ? null : email);
        }

        if (role !== undefined) {
          identityUpdates.push(`role = $${paramIndex++}`);
          identityValues.push(role);
        }

        if (identityUpdates.length > 0) {
          identityValues.push(identityId);
          await client.query(
            `UPDATE player_identities SET ${identityUpdates.join(', ')} WHERE id = $${paramIndex}`,
            identityValues,
          );
        }

        await client.query('COMMIT');

        // Fetch updated user
        const result = await query<UserRow>(
          `SELECT p.id, p.identity_id, p.username, p.created_at, p.updated_at,
                  i.email, i.role, i.provider
           FROM players p
           JOIN player_identities i ON i.id = p.identity_id
           WHERE p.id = $1`,
          [req.params.id],
        );

        const row = result.rows[0];
        res.json({
          id: row.id,
          identityId: row.identity_id,
          username: row.username,
          email: row.email,
          role: row.role,
          provider: row.provider,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        });
      } catch (err: unknown) {
        await client.query('ROLLBACK');

        if (isPgError(err) && err.code === '23505') {
          if (err.constraint === 'uq_player_username') {
            res.status(409).json({ error: `Username '${username}' is already taken` });
            return;
          }
        }
        throw err;
      } finally {
        client.release();
      }
    } catch (err) {
      if (!res.headersSent) {
        console.error('[Admin] Failed to update user:', err);
        res.status(500).json({ error: 'Failed to update user' });
      }
    }
  });

  // ─── DELETE /admin/api/users/:id — Delete user ─────────────────────
  router.delete('/admin/api/users/:id', adminAuth, async (req: Request, res: Response) => {
    try {
      // Get identity_id first (CASCADE will handle players row)
      const existing = await query<{ identity_id: string }>(
        `SELECT identity_id FROM players WHERE id = $1`,
        [req.params.id],
      );

      if (existing.rows.length === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Delete from player_identities — CASCADE deletes players row
      await query(
        `DELETE FROM player_identities WHERE id = $1`,
        [existing.rows[0].identity_id],
      );

      res.status(204).send();
    } catch (err) {
      console.error('[Admin] Failed to delete user:', err);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });

  return router;
}

function isPgError(err: unknown): err is { code: string; constraint?: string } {
  return typeof err === 'object' && err !== null && 'code' in err;
}
