/**
 * Auth Edge Case Tests
 *
 * Covers: input validation boundaries, token store TTL behavior,
 * multiple sessions per user, colyseus auth hook edge cases.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthService, AuthError } from '../auth/AuthService.js';
import { InMemoryTokenStore } from '../auth/TokenStore.js';
import { InMemoryPlayerRepository, DuplicateUsernameError } from '../auth/PlayerRepository.js';
import {
  authenticateClient,
  initColyseusAuth,
  resetColyseusAuth,
} from '../auth/colyseus-auth.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createDeps() {
  const tokenStore = new InMemoryTokenStore();
  const playerRepo = new InMemoryPlayerRepository();
  const authService = new AuthService(tokenStore, playerRepo);
  return { authService, tokenStore, playerRepo };
}

// ─── Input Validation Boundaries ────────────────────────────────────────────

describe('Auth Input Validation Boundaries', () => {
  let authService: AuthService;
  let tokenStore: InMemoryTokenStore;

  beforeEach(() => {
    const deps = createDeps();
    authService = deps.authService;
    tokenStore = deps.tokenStore;
  });

  afterEach(() => {
    tokenStore.dispose();
  });

  it('rejects username shorter than 3 characters', async () => {
    await expect(authService.register('ab', 'password123'))
      .rejects.toThrow('3-20 characters');
  });

  it('accepts username exactly 3 characters', async () => {
    const result = await authService.register('abc', 'password123');
    expect(result.token).toBeTruthy();
    expect(result.playerId).toBeTruthy();
  });

  it('accepts username exactly 20 characters', async () => {
    const result = await authService.register('a'.repeat(20), 'password123');
    expect(result.token).toBeTruthy();
  });

  it('rejects username longer than 20 characters', async () => {
    await expect(authService.register('a'.repeat(21), 'password123'))
      .rejects.toThrow('3-20 characters');
  });

  it('rejects username with special characters', async () => {
    await expect(authService.register('user@name', 'password123'))
      .rejects.toThrow('letters, numbers, underscores, and hyphens');
  });

  it('accepts username with underscores and hyphens', async () => {
    const result = await authService.register('test_user-1', 'password123');
    expect(result.token).toBeTruthy();
  });

  it('rejects password shorter than 6 characters', async () => {
    await expect(authService.register('testuser', '12345'))
      .rejects.toThrow('at least 6 characters');
  });

  it('accepts password exactly 6 characters', async () => {
    const result = await authService.register('testuser', '123456');
    expect(result.token).toBeTruthy();
  });

  it('rejects empty username', async () => {
    await expect(authService.register('', 'password123'))
      .rejects.toThrow();
  });

  it('rejects empty password', async () => {
    await expect(authService.register('testuser', ''))
      .rejects.toThrow();
  });

  it('login rejects empty credentials', async () => {
    await expect(authService.login('', ''))
      .rejects.toThrow('required');
  });
});

// ─── Token Store Behavior ───────────────────────────────────────────────────

describe('TokenStore TTL Behavior', () => {
  let tokenStore: InMemoryTokenStore;

  beforeEach(() => {
    tokenStore = new InMemoryTokenStore();
  });

  afterEach(() => {
    tokenStore.dispose();
  });

  it('token is retrievable before expiry', async () => {
    await tokenStore.set('token-1', { playerId: 'p1', username: 'user1' }, 10);
    const result = await tokenStore.get('token-1');
    expect(result).not.toBeNull();
    expect(result!.playerId).toBe('p1');
  });

  it('token is null after deletion', async () => {
    await tokenStore.set('token-1', { playerId: 'p1', username: 'user1' }, 10);
    await tokenStore.delete('token-1');
    const result = await tokenStore.get('token-1');
    expect(result).toBeNull();
  });

  it('deleting non-existent token does not throw', async () => {
    await expect(tokenStore.delete('non-existent')).resolves.toBeUndefined();
  });

  it('overwriting a token replaces its data', async () => {
    await tokenStore.set('token-1', { playerId: 'p1', username: 'user1' }, 10);
    await tokenStore.set('token-1', { playerId: 'p2', username: 'user2' }, 10);
    const result = await tokenStore.get('token-1');
    expect(result!.playerId).toBe('p2');
  });

  it('dispose clears all tokens', async () => {
    await tokenStore.set('t1', { playerId: 'p1', username: 'u1' }, 60);
    await tokenStore.set('t2', { playerId: 'p2', username: 'u2' }, 60);
    tokenStore.dispose();

    expect(await tokenStore.get('t1')).toBeNull();
    expect(await tokenStore.get('t2')).toBeNull();
  });
});

// ─── Multiple Sessions Per User ─────────────────────────────────────────────

describe('Multiple Login Sessions', () => {
  let authService: AuthService;
  let tokenStore: InMemoryTokenStore;

  beforeEach(() => {
    const deps = createDeps();
    authService = deps.authService;
    tokenStore = deps.tokenStore;
  });

  afterEach(() => {
    tokenStore.dispose();
  });

  it('multiple logins produce distinct tokens', async () => {
    await authService.register('multiuser', 'password123');
    const login1 = await authService.login('multiuser', 'password123');
    const login2 = await authService.login('multiuser', 'password123');

    expect(login1.token).not.toBe(login2.token);
    expect(login1.playerId).toBe(login2.playerId);
  });

  it('logging out one session does not affect others', async () => {
    await authService.register('multiuser', 'password123');
    const login1 = await authService.login('multiuser', 'password123');
    const login2 = await authService.login('multiuser', 'password123');

    await authService.logout(login1.token);

    expect(await authService.validateToken(login1.token)).toBeNull();
    expect(await authService.validateToken(login2.token)).not.toBeNull();
  });

  it('register and login return tokens for the same player', async () => {
    const reg = await authService.register('sameuser', 'password123');
    const login = await authService.login('sameuser', 'password123');

    expect(reg.playerId).toBe(login.playerId);
    expect(reg.token).not.toBe(login.token);
  });
});

// ─── Colyseus Auth Hook Edge Cases ──────────────────────────────────────────

describe('Colyseus Auth Edge Cases', () => {
  afterEach(() => {
    resetColyseusAuth();
  });

  it('without auth service, anonymous access is allowed', async () => {
    resetColyseusAuth();
    const result = await authenticateClient(undefined);
    expect(result.playerId).toBe('anonymous');
    expect(result.username).toBe('anonymous');
  });

  it('with auth required but null service, throws on join attempt', async () => {
    resetColyseusAuth();
    initColyseusAuth(null as unknown as AuthService, true);

    await expect(authenticateClient(undefined))
      .rejects.toThrow('Auth service not initialized');
  });

  it('with auth service, invalid token throws error', async () => {
    const deps = createDeps();
    initColyseusAuth(deps.authService, true);

    await expect(authenticateClient('invalid-token'))
      .rejects.toThrow('expired or invalid');

    deps.tokenStore.dispose();
  });

  it('with auth service, valid token returns player data', async () => {
    const deps = createDeps();
    initColyseusAuth(deps.authService, false);

    const reg = await deps.authService.register('authtest', 'password123');
    const result = await authenticateClient(reg.token);

    expect(result.playerId).toBe(reg.playerId);
    expect(result.username).toBe('authtest');

    deps.tokenStore.dispose();
  });

  it('with auth not required, no token gives anonymous access', async () => {
    const deps = createDeps();
    initColyseusAuth(deps.authService, false);

    const result = await authenticateClient(undefined);
    expect(result.playerId).toBe('anonymous');

    deps.tokenStore.dispose();
  });

  it('with auth required, no token throws error', async () => {
    const deps = createDeps();
    initColyseusAuth(deps.authService, true);

    await expect(authenticateClient(undefined))
      .rejects.toThrow('Authentication required');

    deps.tokenStore.dispose();
  });
});

// ─── AuthError Class ────────────────────────────────────────────────────────

describe('AuthError', () => {
  it('has correct name and statusCode', () => {
    const err = new AuthError('test', 401);
    expect(err.name).toBe('AuthError');
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('test');
  });

  it('is an instance of Error', () => {
    const err = new AuthError('test', 400);
    expect(err).toBeInstanceOf(Error);
  });
});

// ─── DuplicateUsernameError ─────────────────────────────────────────────────

describe('DuplicateUsernameError', () => {
  it('duplicate registration throws DuplicateUsernameError', async () => {
    const deps = createDeps();
    await deps.authService.register('taken', 'password123');

    try {
      await deps.authService.register('taken', 'differentpass');
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(DuplicateUsernameError);
    }

    deps.tokenStore.dispose();
  });
});
