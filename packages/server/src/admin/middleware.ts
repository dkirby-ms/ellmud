/**
 * Admin auth middleware — validates access to admin endpoints.
 *
 * Two authentication paths (checked in order):
 * 1. Static ADMIN_TOKEN env var — silent fallback, no warning if unset.
 * 2. Player session token — validates via AuthService, checks role is
 *    admin or content-dev.
 *
 * Call `initAdminAuth(authService, playerRepo)` at startup to enable
 * session-based authentication. Without it, only ADMIN_TOKEN works.
 */

import type { Request, Response, NextFunction } from 'express';
import type { AuthService } from '../auth/AuthService.js';
import type { PlayerRepository } from '../auth/PlayerRepository.js';
import { type UserRole, isValidRole, hasMinRole } from '@ellmud/shared';

let _authService: AuthService | null = null;
let _playerRepo: PlayerRepository | null = null;

/** Initialize session-based admin auth. Call once at startup. */
export function initAdminAuth(authService: AuthService, playerRepo: PlayerRepository): void {
  _authService = authService;
  _playerRepo = playerRepo;
}

/** Minimum role required for admin access. */
const MIN_ADMIN_ROLE: UserRole = 'content-dev';

export async function adminAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  if (!token) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  // Path 1: Static ADMIN_TOKEN (silent fallback — no warning if unset)
  const adminToken = process.env['ADMIN_TOKEN'];
  if (adminToken && token === adminToken) {
    next();
    return;
  }

  // Path 2: Player session token with role check
  if (_authService && _playerRepo) {
    try {
      const payload = await _authService.validateToken(token);
      if (payload) {
        const role = await _playerRepo.getRoleByPlayerId(payload.playerId);
        if (isValidRole(role) && hasMinRole(role, MIN_ADMIN_ROLE)) {
          // Attach admin identity to request for downstream audit use
          (req as AuthenticatedAdminRequest).adminUser = {
            playerId: payload.playerId,
            username: payload.username,
            role: role as UserRole,
          };
          next();
          return;
        }
        // Valid session but insufficient role
        res.status(403).json({ error: 'Insufficient permissions — admin or content-dev role required' });
        return;
      }
      // Token not recognized (invalid or expired) → 401
      res.status(401).json({ error: 'Invalid or expired session token' });
      return;
    } catch {
      // Token validation threw → treat as invalid token
      res.status(401).json({ error: 'Invalid or expired session token' });
      return;
    }
  }

  // Neither path succeeded
  if (!adminToken && !_authService) {
    res.status(503).json({ error: 'Admin access not configured' });
  } else {
    res.status(403).json({ error: 'Invalid admin token or insufficient permissions' });
  }
}

/** Extended Request with admin user identity (set by adminAuth middleware). */
export interface AuthenticatedAdminRequest extends Request {
  adminUser?: {
    playerId: string;
    username: string;
    role: UserRole;
  };
}

/** Reset session-based admin auth state — for testing only. */
export function resetAdminAuth(): void {
  _authService = null;
  _playerRepo = null;
}

