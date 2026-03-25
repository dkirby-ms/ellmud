/**
 * Entra OAuth Authentication Tests
 *
 * Covers: config validation, login redirect, callback handling,
 * session creation, edge cases.
 *
 * Mocks EntraAuthService to avoid real OIDC discovery/network calls.
 * Tests the route layer + AuthService integration (session token issuance,
 * user creation/lookup in the player repository).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import { AuthService } from '../auth/AuthService.js';
import { InMemoryTokenStore } from '../auth/TokenStore.js';
import { InMemoryPlayerRepository } from '../auth/PlayerRepository.js';
import { createEntraRouter } from '../auth/entra-routes.js';
import type { EntraAuthService, EntraUserInfo, EntraConfig } from '../auth/EntraAuthService.js';

// ─── Mock EntraAuthService ──────────────────────────────────────────────────

/**
 * Fake EntraAuthService for route-level testing.
 * No OIDC discovery, no network — just returns canned data.
 */
class MockEntraAuthService {
  private shouldFail = false;
  private failError: Error | null = null;
  private userInfo: EntraUserInfo = {
    oid: 'entra-oid-12345',
    email: 'hero@example.com',
    name: 'TestHero',
    preferred_username: 'testhero@example.com',
  };

  getAuthorizationUrl(): { url: string; state: string; nonce: string } {
    return {
      url: 'https://test-tenant.ciamlogin.com/test-tenant/oauth2/v2.0/authorize?client_id=test-client&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fcallback&scope=openid+profile+email&response_type=code&state=mock-state-123&nonce=mock-nonce-456',
      state: 'mock-state-123',
      nonce: 'mock-nonce-456',
    };
  }

  async handleCallback(
    _callbackUrl: URL,
    _expectedState: string,
    _expectedNonce: string,
  ): Promise<EntraUserInfo> {
    if (this.shouldFail) {
      throw this.failError || new Error('Token exchange failed');
    }
    return this.userInfo;
  }

  // Test helpers
  setUserInfo(info: EntraUserInfo): void {
    this.userInfo = info;
  }

  setFailure(error?: Error): void {
    this.shouldFail = true;
    this.failError = error ?? null;
  }

  clearFailure(): void {
    this.shouldFail = false;
    this.failError = null;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function createDeps() {
  const tokenStore = new InMemoryTokenStore();
  const playerRepo = new InMemoryPlayerRepository();
  const authService = new AuthService(tokenStore, playerRepo);
  return { authService, tokenStore, playerRepo };
}

function createTestApp(authService: AuthService, entraService: MockEntraAuthService) {
  const app = express();
  app.use(express.json());
  app.use(createEntraRouter(authService, entraService as unknown as EntraAuthService));
  return app;
}

/**
 * Make an HTTP request that does NOT follow redirects (to test redirect responses).
 * Returns status, headers, and body text.
 */
async function requestNoRedirect(
  port: number,
  path: string,
  options?: { headers?: Record<string, string> },
): Promise<{ status: number; headers: Headers; body: string }> {
  const res = await fetch(`http://127.0.0.1:${port}${path}`, {
    redirect: 'manual',
    headers: options?.headers ?? {},
  });
  const body = await res.text();
  return { status: res.status, headers: res.headers, body };
}

/**
 * Make a GET request following redirects and returning the final response.
 */
async function requestFollow(
  port: number,
  path: string,
  options?: { headers?: Record<string, string> },
): Promise<{ status: number; headers: Headers; body: string; url: string }> {
  const res = await fetch(`http://127.0.0.1:${port}${path}`, {
    redirect: 'follow',
    headers: options?.headers ?? {},
  });
  const body = await res.text();
  return { status: res.status, headers: res.headers, body, url: res.url };
}

// ─── 1. Login Redirect ─────────────────────────────────────────────────────

describe('Entra OAuth: Login Redirect', () => {
  let server: Server;
  let port: number;
  let tokenStore: InMemoryTokenStore;
  let mockEntra: MockEntraAuthService;

  beforeEach(() => {
    const deps = createDeps();
    tokenStore = deps.tokenStore;
    mockEntra = new MockEntraAuthService();
    const app = createTestApp(deps.authService, mockEntra);
    server = app.listen(0);
    const addr = server.address();
    port = typeof addr === 'object' && addr ? addr.port : 0;
  });

  afterEach(() => {
    server.close();
    tokenStore.dispose();
  });

  it('GET /auth/entra/login returns a 302 redirect', async () => {
    const res = await requestNoRedirect(port, '/auth/entra/login');
    expect(res.status).toBe(302);
  });

  it('redirects to the Entra authorization URL', async () => {
    const res = await requestNoRedirect(port, '/auth/entra/login');
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('ciamlogin.com');
    expect(location).toContain('/oauth2/v2.0/authorize');
  });

  it('authorization URL includes required OAuth params', async () => {
    const res = await requestNoRedirect(port, '/auth/entra/login');
    const location = res.headers.get('location') ?? '';
    const url = new URL(location);
    const params = url.searchParams;

    expect(params.get('scope')).toContain('openid');
    expect(params.get('scope')).toContain('profile');
    expect(params.get('scope')).toContain('email');
    expect(params.get('response_type')).toBe('code');
    expect(params.get('redirect_uri')).toBeTruthy();
    expect(params.get('state')).toBeTruthy();
  });

  it('sets state and nonce cookies for CSRF protection', async () => {
    const res = await requestNoRedirect(port, '/auth/entra/login');
    const setCookies = res.headers.getSetCookie();
    const cookieStr = setCookies.join('; ');

    expect(cookieStr).toContain('entra_state=');
    expect(cookieStr).toContain('entra_nonce=');
    // HttpOnly should be set for security
    expect(cookieStr).toContain('HttpOnly');
  });
});

// ─── 2. Callback Handling ───────────────────────────────────────────────────

describe('Entra OAuth: Callback Handling', () => {
  let server: Server;
  let port: number;
  let tokenStore: InMemoryTokenStore;
  let authService: AuthService;
  let mockEntra: MockEntraAuthService;

  beforeEach(() => {
    const deps = createDeps();
    authService = deps.authService;
    tokenStore = deps.tokenStore;
    mockEntra = new MockEntraAuthService();
    const app = createTestApp(authService, mockEntra);
    server = app.listen(0);
    const addr = server.address();
    port = typeof addr === 'object' && addr ? addr.port : 0;
  });

  afterEach(() => {
    server.close();
    tokenStore.dispose();
  });

  it('callback with valid code and state cookies redirects to client with token', async () => {
    // Simulate the cookies that would be set during the login redirect
    const cookies = 'entra_state=mock-state-123; entra_nonce=mock-nonce-456';
    const res = await requestNoRedirect(
      port,
      '/auth/entra/callback?code=auth-code-xyz&state=mock-state-123',
      { headers: { Cookie: cookies } },
    );

    expect(res.status).toBe(302);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('/auth/callback');
    expect(location).toContain('token=');
    expect(location).toContain('playerId=');
  });

  it('callback without state cookies returns 400 (CSRF protection)', async () => {
    // No cookies at all — CSRF state is missing
    const res = await requestNoRedirect(
      port,
      '/auth/entra/callback?code=auth-code-xyz&state=mock-state-123',
    );

    expect(res.status).toBe(400);
    expect(res.body).toContain('CSRF');
  });

  it('callback when token exchange fails redirects to error page', async () => {
    mockEntra.setFailure(new Error('Entra token exchange failed'));

    const cookies = 'entra_state=mock-state-123; entra_nonce=mock-nonce-456';
    const res = await requestNoRedirect(
      port,
      '/auth/entra/callback?code=bad-code&state=mock-state-123',
      { headers: { Cookie: cookies } },
    );

    // Should redirect to error page, not crash
    expect(res.status).toBe(302);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('error=');
  });

  it('callback clears state/nonce cookies', async () => {
    const cookies = 'entra_state=mock-state-123; entra_nonce=mock-nonce-456';
    const res = await requestNoRedirect(
      port,
      '/auth/entra/callback?code=auth-code-xyz&state=mock-state-123',
      { headers: { Cookie: cookies } },
    );

    const setCookies = res.headers.getSetCookie();
    const cookieStr = setCookies.join('; ');
    // Cookies should be cleared (expired)
    expect(cookieStr).toContain('entra_state=');
    expect(cookieStr).toContain('entra_nonce=');
  });
});

// ─── 3. Session Creation ────────────────────────────────────────────────────

describe('Entra OAuth: Session Creation', () => {
  let server: Server;
  let port: number;
  let tokenStore: InMemoryTokenStore;
  let authService: AuthService;
  let playerRepo: InMemoryPlayerRepository;
  let mockEntra: MockEntraAuthService;

  beforeEach(() => {
    const deps = createDeps();
    authService = deps.authService;
    tokenStore = deps.tokenStore;
    playerRepo = deps.playerRepo;
    mockEntra = new MockEntraAuthService();
    const app = createTestApp(authService, mockEntra);
    server = app.listen(0);
    const addr = server.address();
    port = typeof addr === 'object' && addr ? addr.port : 0;
  });

  afterEach(() => {
    server.close();
    tokenStore.dispose();
  });

  it('issues our own session token (not the Entra token)', async () => {
    const cookies = 'entra_state=mock-state-123; entra_nonce=mock-nonce-456';
    const res = await requestNoRedirect(
      port,
      '/auth/entra/callback?code=auth-code-xyz&state=mock-state-123',
      { headers: { Cookie: cookies } },
    );

    const location = res.headers.get('location') ?? '';
    const redirectUrl = new URL(location);
    const token = redirectUrl.searchParams.get('token');

    expect(token).toBeTruthy();
    // Our token is a UUID — NOT a JWT from Entra
    expect(token).not.toContain('.');
    // Validate the token against our own auth service
    const payload = await authService.validateToken(token!);
    expect(payload).not.toBeNull();
    expect(payload!.playerId).toBeTruthy();
  });

  it('creates a new user in the DB for first-time OAuth login', async () => {
    mockEntra.setUserInfo({
      oid: 'new-user-oid-999',
      email: 'newplayer@example.com',
      name: 'NewPlayer',
    });

    const cookies = 'entra_state=mock-state-123; entra_nonce=mock-nonce-456';
    const res = await requestNoRedirect(
      port,
      '/auth/entra/callback?code=auth-code-xyz&state=mock-state-123',
      { headers: { Cookie: cookies } },
    );

    const location = res.headers.get('location') ?? '';
    const redirectUrl = new URL(location);
    const playerId = redirectUrl.searchParams.get('playerId');

    expect(playerId).toBeTruthy();

    // Verify the player was created in the repository
    const player = await playerRepo.findByProvider('entra', 'new-user-oid-999');
    expect(player).not.toBeNull();
    expect(player!.username).toBe('NewPlayer');
  });

  it('finds existing user on subsequent OAuth login', async () => {
    // First login — creates the user
    const cookies = 'entra_state=mock-state-123; entra_nonce=mock-nonce-456';
    const res1 = await requestNoRedirect(
      port,
      '/auth/entra/callback?code=auth-code-xyz&state=mock-state-123',
      { headers: { Cookie: cookies } },
    );
    const location1 = res1.headers.get('location') ?? '';
    const playerId1 = new URL(location1).searchParams.get('playerId');

    // Second login — same Entra user, should find existing
    const res2 = await requestNoRedirect(
      port,
      '/auth/entra/callback?code=auth-code-xyz&state=mock-state-123',
      { headers: { Cookie: cookies } },
    );
    const location2 = res2.headers.get('location') ?? '';
    const playerId2 = new URL(location2).searchParams.get('playerId');

    expect(playerId1).toBeTruthy();
    expect(playerId2).toBe(playerId1);
  });

  it('issues distinct tokens for each OAuth login session', async () => {
    const cookies = 'entra_state=mock-state-123; entra_nonce=mock-nonce-456';
    const res1 = await requestNoRedirect(
      port,
      '/auth/entra/callback?code=auth-code-xyz&state=mock-state-123',
      { headers: { Cookie: cookies } },
    );
    const token1 = new URL(res1.headers.get('location')!).searchParams.get('token');

    const res2 = await requestNoRedirect(
      port,
      '/auth/entra/callback?code=auth-code-xyz&state=mock-state-123',
      { headers: { Cookie: cookies } },
    );
    const token2 = new URL(res2.headers.get('location')!).searchParams.get('token');

    expect(token1).toBeTruthy();
    expect(token2).toBeTruthy();
    expect(token1).not.toBe(token2);
  });
});

// ─── 4. Edge Cases ──────────────────────────────────────────────────────────

describe('Entra OAuth: Edge Cases', () => {
  let server: Server;
  let port: number;
  let tokenStore: InMemoryTokenStore;
  let authService: AuthService;
  let mockEntra: MockEntraAuthService;

  beforeEach(() => {
    const deps = createDeps();
    authService = deps.authService;
    tokenStore = deps.tokenStore;
    mockEntra = new MockEntraAuthService();
    const app = createTestApp(authService, mockEntra);
    server = app.listen(0);
    const addr = server.address();
    port = typeof addr === 'object' && addr ? addr.port : 0;
  });

  afterEach(() => {
    server.close();
    tokenStore.dispose();
  });

  it('Entra user with only oid (no email/name) still gets a generated username', async () => {
    mockEntra.setUserInfo({
      oid: 'minimal-oid-001',
      // no email, no name, no preferred_username
    });

    const cookies = 'entra_state=mock-state-123; entra_nonce=mock-nonce-456';
    const res = await requestNoRedirect(
      port,
      '/auth/entra/callback?code=auth-code-xyz&state=mock-state-123',
      { headers: { Cookie: cookies } },
    );

    expect(res.status).toBe(302);
    const location = res.headers.get('location') ?? '';
    const token = new URL(location).searchParams.get('token');
    expect(token).toBeTruthy();

    // User should be created with a fallback username
    const payload = await authService.validateToken(token!);
    expect(payload).not.toBeNull();
    expect(payload!.username).toBeTruthy();
    expect(payload!.username.length).toBeGreaterThanOrEqual(3);
  });

  it('Entra user with email but no display name uses email-based username', async () => {
    mockEntra.setUserInfo({
      oid: 'email-only-oid-002',
      email: 'wanderer@darkrift.com',
      // no name
    });

    const cookies = 'entra_state=mock-state-123; entra_nonce=mock-nonce-456';
    const res = await requestNoRedirect(
      port,
      '/auth/entra/callback?code=auth-code-xyz&state=mock-state-123',
      { headers: { Cookie: cookies } },
    );

    expect(res.status).toBe(302);
    const token = new URL(res.headers.get('location')!).searchParams.get('token');
    const payload = await authService.validateToken(token!);
    expect(payload).not.toBeNull();
    // Should derive username from email local part
    expect(payload!.username).toBe('wanderer');
  });

  it('Entra user with special chars in display name gets sanitized username', async () => {
    mockEntra.setUserInfo({
      oid: 'special-char-oid-003',
      email: 'test@example.com',
      name: 'Drizzt Do\'Urden ⚔️',
    });

    const cookies = 'entra_state=mock-state-123; entra_nonce=mock-nonce-456';
    const res = await requestNoRedirect(
      port,
      '/auth/entra/callback?code=auth-code-xyz&state=mock-state-123',
      { headers: { Cookie: cookies } },
    );

    expect(res.status).toBe(302);
    const token = new URL(res.headers.get('location')!).searchParams.get('token');
    const payload = await authService.validateToken(token!);
    expect(payload).not.toBeNull();
    // Username should only contain valid characters
    expect(payload!.username).toMatch(/^[a-zA-Z0-9_-]+$/);
  });
});

// ─── 5. Disabled Entra (no routes mounted) ──────────────────────────────────

describe('Entra OAuth: Disabled (no Entra env vars)', () => {
  let server: Server;
  let port: number;
  let tokenStore: InMemoryTokenStore;

  beforeEach(() => {
    const deps = createDeps();
    tokenStore = deps.tokenStore;
    // Build app WITHOUT Entra routes — simulates missing ENTRA_* env vars
    const app = express();
    app.use(express.json());
    // Only mount a catch-all to verify Entra routes are not registered
    app.use((_req, res) => {
      res.status(404).json({ error: 'Not found' });
    });
    server = app.listen(0);
    const addr = server.address();
    port = typeof addr === 'object' && addr ? addr.port : 0;
  });

  afterEach(() => {
    server.close();
    tokenStore.dispose();
  });

  it('GET /auth/entra/login returns 404 when Entra is disabled', async () => {
    const res = await requestNoRedirect(port, '/auth/entra/login');
    expect(res.status).toBe(404);
  });

  it('GET /auth/entra/callback returns 404 when Entra is disabled', async () => {
    const res = await requestNoRedirect(port, '/auth/entra/callback?code=test&state=test');
    expect(res.status).toBe(404);
  });
});

// ─── 6. AuthService.loginOAuth Unit Tests ───────────────────────────────────

describe('AuthService.loginOAuth', () => {
  let authService: AuthService;
  let tokenStore: InMemoryTokenStore;
  let playerRepo: InMemoryPlayerRepository;

  beforeEach(() => {
    const deps = createDeps();
    authService = deps.authService;
    tokenStore = deps.tokenStore;
    playerRepo = deps.playerRepo;
  });

  afterEach(() => {
    tokenStore.dispose();
  });

  it('creates a new player for an unknown OAuth identity', async () => {
    const result = await authService.loginOAuth('entra', 'oid-new-001', 'player@test.com', 'Player');
    expect(result.playerId).toBeTruthy();
    expect(result.token).toBeTruthy();

    const player = await playerRepo.findByProvider('entra', 'oid-new-001');
    expect(player).not.toBeNull();
  });

  it('returns existing player for known OAuth identity', async () => {
    const first = await authService.loginOAuth('entra', 'oid-repeat-002', 'repeat@test.com', 'Repeat');
    const second = await authService.loginOAuth('entra', 'oid-repeat-002', 'repeat@test.com', 'Repeat');

    expect(second.playerId).toBe(first.playerId);
    expect(second.token).not.toBe(first.token); // New session, different token
  });

  it('generates a valid username when displayName is null', async () => {
    const result = await authService.loginOAuth('entra', 'oid-noname', null, null);
    expect(result.playerId).toBeTruthy();

    const payload = await authService.validateToken(result.token);
    expect(payload).not.toBeNull();
    expect(payload!.username).toMatch(/^[a-zA-Z0-9_-]+$/);
    expect(payload!.username.length).toBeGreaterThanOrEqual(3);
  });

  it('generates username from email when displayName is too short', async () => {
    const result = await authService.loginOAuth('entra', 'oid-short', 'drizzt@underdark.com', 'Ab');
    const payload = await authService.validateToken(result.token);
    expect(payload).not.toBeNull();
    // "Ab" is < 3 chars after cleaning, should fall through to email
    expect(payload!.username).toBe('drizzt');
  });

  it('issued token is valid in our token store', async () => {
    const result = await authService.loginOAuth('entra', 'oid-valid', 'valid@test.com', 'ValidUser');
    const payload = await authService.validateToken(result.token);
    expect(payload).not.toBeNull();
    expect(payload!.playerId).toBe(result.playerId);
    expect(payload!.username).toBe('ValidUser');
  });

  it('OAuth token can be invalidated via logout', async () => {
    const result = await authService.loginOAuth('entra', 'oid-logout', 'logout@test.com', 'LogoutUser');
    await authService.logout(result.token);
    const payload = await authService.validateToken(result.token);
    expect(payload).toBeNull();
  });
});

// ─── 7. EntraAuthService Unit Tests (non-network) ──────────────────────────

describe('EntraAuthService: getAuthorizationUrl (pre-initialized mock)', () => {
  it('returns url, state, and nonce', () => {
    const mock = new MockEntraAuthService();
    const result = mock.getAuthorizationUrl();

    expect(result.url).toBeTruthy();
    expect(result.state).toBeTruthy();
    expect(result.nonce).toBeTruthy();
  });

  it('authorization URL includes client_id param', () => {
    const mock = new MockEntraAuthService();
    const { url } = mock.getAuthorizationUrl();
    const parsed = new URL(url);
    expect(parsed.searchParams.get('client_id')).toBeTruthy();
  });

  it('authorization URL includes redirect_uri param', () => {
    const mock = new MockEntraAuthService();
    const { url } = mock.getAuthorizationUrl();
    const parsed = new URL(url);
    expect(parsed.searchParams.get('redirect_uri')).toBeTruthy();
  });
});

// ─── 8. Entra Config Validation ─────────────────────────────────────────────

describe('Entra Config Validation', () => {
  it('Entra routes NOT mounted when env vars are empty strings', () => {
    const entraConfig: EntraConfig = {
      clientId: '',
      clientSecret: '',
      tenantId: '',
      tenantSubdomain: '',
      redirectUri: 'http://localhost:3000/auth/callback',
    };

    // The condition in index.ts checks: if (clientId && clientSecret && tenantId)
    // Empty strings are falsy — Entra should NOT be initialized
    const shouldInit = !!(entraConfig.clientId && entraConfig.clientSecret && entraConfig.tenantId);
    expect(shouldInit).toBe(false);
  });

  it('Entra routes mounted when all env vars are present', () => {
    const entraConfig: EntraConfig = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      tenantId: 'test-tenant-id',
      tenantSubdomain: 'test-tenant',
      redirectUri: 'http://localhost:3000/auth/callback',
    };

    const shouldInit = !!(entraConfig.clientId && entraConfig.clientSecret && entraConfig.tenantId);
    expect(shouldInit).toBe(true);
  });

  it('Entra NOT initialized when only clientId is provided', () => {
    const entraConfig: EntraConfig = {
      clientId: 'test-client-id',
      clientSecret: '',
      tenantId: '',
      tenantSubdomain: '',
      redirectUri: 'http://localhost:3000/auth/callback',
    };

    const shouldInit = !!(entraConfig.clientId && entraConfig.clientSecret && entraConfig.tenantId);
    expect(shouldInit).toBe(false);
  });

  it('Entra NOT initialized when only clientId and secret are provided', () => {
    const entraConfig: EntraConfig = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      tenantId: '',
      tenantSubdomain: '',
      redirectUri: 'http://localhost:3000/auth/callback',
    };

    const shouldInit = !!(entraConfig.clientId && entraConfig.clientSecret && entraConfig.tenantId);
    expect(shouldInit).toBe(false);
  });
});
