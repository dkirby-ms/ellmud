/**
 * auto-promote-admin.test.ts — AUTO_PROMOTE_ADMIN env var tests (Issue #373).
 *
 * Design Decision: AUTO_PROMOTE_ADMIN env var auto-promotes a user on startup.
 *
 * Jarlaxle will implement an autoPromoteAdmin() function (likely in auth/roles.ts
 * or a startup module) that:
 *   1. Reads AUTO_PROMOTE_ADMIN from env (expects a username)
 *   2. Looks up the user by username
 *   3. If found, sets their role to 'admin'
 *   4. If not found, logs a warning and continues (no crash)
 *   5. If already admin, no-op
 *
 * TDD: Will fail until the auto-promote function is implemented.
 */

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { AuthService } from '../auth/AuthService.js';
import { InMemoryTokenStore } from '../auth/TokenStore.js';
import { InMemoryPlayerRepository } from '../auth/PlayerRepository.js';

// Import the anticipated function — will fail until implemented
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error — TDD: module does not exist yet
import { autoPromoteAdmin } from '../auth/roles.js';

// ─── Test Helpers ────────────────────────────────────────────────────────────

function createAuthDeps() {
  const tokenStore = new InMemoryTokenStore();
  const playerRepo = new InMemoryPlayerRepository();
  const authService = new AuthService(tokenStore, playerRepo);
  return { authService, tokenStore, playerRepo };
}

// ─── AUTO_PROMOTE_ADMIN Tests ────────────────────────────────────────────────

describe('AUTO_PROMOTE_ADMIN (Issue #373)', () => {
  const originalEnv = process.env['AUTO_PROMOTE_ADMIN'];

  beforeEach(() => {
    delete process.env['AUTO_PROMOTE_ADMIN'];
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env['AUTO_PROMOTE_ADMIN'] = originalEnv;
    } else {
      delete process.env['AUTO_PROMOTE_ADMIN'];
    }
  });

  it('promotes specified user to admin role on startup', async () => {
    const { authService, playerRepo, tokenStore } = createAuthDeps();

    // Register a regular player
    await authService.register('PromoteMe', 'password123');

    // Set env and run auto-promote
    process.env['AUTO_PROMOTE_ADMIN'] = 'PromoteMe';
    await autoPromoteAdmin(playerRepo);

    // Verify: user should now have admin role
    // The exact mechanism depends on implementation, but the player repo
    // should reflect the role change
    const player = await playerRepo.findByUsername('PromoteMe');
    expect(player).not.toBeNull();
    // Jarlaxle will add 'role' to the player data
    expect((player as Record<string, unknown>)['role']).toBe('admin');

    tokenStore.dispose();
  });

  it('handles user not found gracefully (no crash)', async () => {
    const { playerRepo, tokenStore } = createAuthDeps();

    // Set env to a non-existent user
    process.env['AUTO_PROMOTE_ADMIN'] = 'NonExistentUser';

    // Should not throw — just log a warning
    await expect(autoPromoteAdmin(playerRepo)).resolves.not.toThrow();

    tokenStore.dispose();
  });

  it('is a no-op when user is already admin', async () => {
    const { authService, playerRepo, tokenStore } = createAuthDeps();

    // Register and promote
    await authService.register('AlreadyAdmin', 'password123');
    process.env['AUTO_PROMOTE_ADMIN'] = 'AlreadyAdmin';
    await autoPromoteAdmin(playerRepo);

    // Promote again — should be a no-op
    const consoleSpy = vi.spyOn(console, 'log');
    await autoPromoteAdmin(playerRepo);

    // Verify still admin (not downgraded or errored)
    const player = await playerRepo.findByUsername('AlreadyAdmin');
    expect((player as Record<string, unknown>)['role']).toBe('admin');

    consoleSpy.mockRestore();
    tokenStore.dispose();
  });

  it('does nothing when AUTO_PROMOTE_ADMIN is not set', async () => {
    const { playerRepo, tokenStore } = createAuthDeps();

    delete process.env['AUTO_PROMOTE_ADMIN'];

    // Should be a no-op — no crash, no changes
    await expect(autoPromoteAdmin(playerRepo)).resolves.not.toThrow();

    tokenStore.dispose();
  });

  it('handles empty string AUTO_PROMOTE_ADMIN gracefully', async () => {
    const { playerRepo, tokenStore } = createAuthDeps();

    process.env['AUTO_PROMOTE_ADMIN'] = '';

    // Empty string should be treated as "not set"
    await expect(autoPromoteAdmin(playerRepo)).resolves.not.toThrow();

    tokenStore.dispose();
  });

  it('is case-insensitive when looking up username', async () => {
    const { authService, playerRepo, tokenStore } = createAuthDeps();

    await authService.register('MixedCase', 'password123');

    process.env['AUTO_PROMOTE_ADMIN'] = 'mixedcase'; // lowercase
    await autoPromoteAdmin(playerRepo);

    const player = await playerRepo.findByUsername('MixedCase');
    expect((player as Record<string, unknown>)['role']).toBe('admin');

    tokenStore.dispose();
  });
});
