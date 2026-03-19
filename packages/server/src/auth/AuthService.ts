/**
 * AuthService — Core authentication logic.
 *
 * Orchestrates password hashing, player creation, token generation.
 * Stateless service — all state lives in TokenStore and PlayerRepository.
 */

import bcrypt from 'bcryptjs';
import type { TokenStore } from './TokenStore.js';
import type { PlayerRepository } from './PlayerRepository.js';
import { DuplicateUsernameError } from './PlayerRepository.js';

const BCRYPT_ROUNDS = 10;
const TOKEN_TTL_SECONDS = 24 * 60 * 60; // 24 hours

export interface AuthResult {
  playerId: string;
  token: string;
}

export interface TokenPayload {
  playerId: string;
  username: string;
}

export class AuthService {
  constructor(
    private readonly tokenStore: TokenStore,
    private readonly playerRepo: PlayerRepository,
  ) {}

  /**
   * Register a new player with username/password.
   * Returns a session token on success.
   */
  async register(username: string, password: string): Promise<AuthResult> {
    this.validateInput(username, password);

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Will throw DuplicateUsernameError if username is taken
    const player = await this.playerRepo.createPlayer(username, passwordHash);

    const token = crypto.randomUUID();
    await this.tokenStore.set(token, { playerId: player.id, username }, TOKEN_TTL_SECONDS);

    return { playerId: player.id, token };
  }

  /**
   * Login with existing credentials.
   * Returns a session token on success.
   */
  async login(username: string, password: string): Promise<AuthResult> {
    if (!username || !password) {
      throw new AuthError('Username and password are required', 400);
    }

    const player = await this.playerRepo.findByUsername(username);
    if (!player) {
      throw new AuthError('Invalid username or password', 401);
    }

    const valid = await bcrypt.compare(password, player.passwordHash);
    if (!valid) {
      throw new AuthError('Invalid username or password', 401);
    }

    const token = crypto.randomUUID();
    await this.tokenStore.set(token, { playerId: player.id, username: player.username }, TOKEN_TTL_SECONDS);

    return { playerId: player.id, token };
  }

  /**
   * Validate a session token.
   * Returns player data if valid, null if expired/invalid.
   */
  async validateToken(token: string): Promise<TokenPayload | null> {
    if (!token) return null;
    return this.tokenStore.get(token);
  }

  /** Invalidate a session token (logout). */
  async logout(token: string): Promise<void> {
    await this.tokenStore.delete(token);
  }

  private validateInput(username: string, password: string): void {
    if (!username || typeof username !== 'string') {
      throw new AuthError('Username is required', 400);
    }
    if (!password || typeof password !== 'string') {
      throw new AuthError('Password is required', 400);
    }
    if (username.length < 3 || username.length > 20) {
      throw new AuthError('Username must be 3-20 characters', 400);
    }
    if (password.length < 6) {
      throw new AuthError('Password must be at least 6 characters', 400);
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      throw new AuthError('Username may only contain letters, numbers, underscores, and hyphens', 400);
    }
  }
}

/** Auth error with HTTP status code for route handlers. */
export class AuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export { DuplicateUsernameError };
