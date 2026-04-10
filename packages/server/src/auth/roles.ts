/**
 * Role utilities — re-exports shared types and adds server-side convenience.
 *
 * The canonical role types and hierarchy live in @ellmud/shared.
 * This module re-exports them and adds:
 *   - hasRole() alias for hasMinRole()
 *   - isAdmin() / isContentDev() convenience checks
 *   - autoPromoteAdmin() for startup bootstrap
 */

import {
  type UserRole,
  VALID_ROLES,
  ROLE_HIERARCHY,
  hasMinRole,
  isValidRole,
} from '@ellmud/shared';
import type { PlayerRepository } from './PlayerRepository.js';

// Re-export shared types for consumers that import from auth/roles
export { type UserRole, VALID_ROLES, ROLE_HIERARCHY, isValidRole };

// Re-export the ordered list for tests that expect an array
const ROLE_HIERARCHY_LIST: readonly UserRole[] = VALID_ROLES;
export { ROLE_HIERARCHY_LIST };

/** Alias: does `userRole` meet or exceed `requiredRole`? */
export function hasRole(userRole: UserRole | string, requiredRole: UserRole): boolean {
  if (!isValidRole(userRole)) return false;
  return hasMinRole(userRole, requiredRole);
}

/** Convenience: is this an admin? */
export function isAdmin(role: UserRole | string): boolean {
  return hasRole(role, 'admin');
}

/** Convenience: is this at least content-dev? */
export function isContentDev(role: UserRole | string): boolean {
  return hasRole(role, 'content-dev');
}

/**
 * Auto-promote a user to admin on startup via AUTO_PROMOTE_ADMIN env var.
 * Safe to call in both PG and in-memory contexts.
 */
export async function autoPromoteAdmin(playerRepo: PlayerRepository): Promise<void> {
  const username = process.env['AUTO_PROMOTE_ADMIN'];
  if (!username || !username.trim()) return;

  const player = await playerRepo.findByUsername(username);
  if (!player) {
    console.log(`[AutoPromote] User '${username}' not found — skipping`);
    return;
  }

  const currentRole = await playerRepo.getRoleByPlayerId(player.id);
  if (currentRole === 'admin') {
    console.log(`[AutoPromote] '${username}' is already admin`);
    return;
  }

  // setRole is optional — only InMemoryPlayerRepository supports it for now
  if ('setRole' in playerRepo && typeof (playerRepo as Record<string, unknown>).setRole === 'function') {
    await (playerRepo as unknown as { setRole(id: string, role: string): Promise<void> }).setRole(player.id, 'admin');
  }
  console.log(`[AutoPromote] Promoted '${username}' from '${currentRole}' to 'admin'`);
}
