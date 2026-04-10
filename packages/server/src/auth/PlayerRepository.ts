/**
 * PlayerRepository — Player CRUD against persistent storage.
 *
 * Phase 1: In-memory Map (no PostgreSQL dependency).
 * Phase 2+: PostgreSQL implementation using the schema from db/types.ts.
 *
 * The `player_identities` table uses provider='local' + password_hash
 * for username/password auth, with provider_id reserved for future OAuth.
 */

import type { Player } from '../db/types.js';

export interface PlayerRepository {
  createPlayer(username: string, passwordHash: string): Promise<Player & { passwordHash: string }>;
  findByUsername(username: string): Promise<(Player & { passwordHash: string }) | null>;
  findById(id: string): Promise<Player | null>;
  findByProvider(provider: string, providerId: string): Promise<Player | null>;
  createOAuthPlayer(provider: string, providerId: string, email: string | null, username: string): Promise<Player>;
  /** Look up the role from `player_identities` for a given player ID. Returns 'player' as default. */
  getRoleByPlayerId(playerId: string): Promise<string>;
}

/**
 * In-memory player repository for Phase 1.
 * Stores both Player and PlayerIdentity data in Maps.
 */
export class InMemoryPlayerRepository implements PlayerRepository {
  private players = new Map<string, Player & { passwordHash: string }>();
  private usernameIndex = new Map<string, string>(); // lowercase username → player id
  private providerIndex = new Map<string, string>(); // "provider:providerId" → player id
  private roles = new Map<string, string>(); // player id → role

  async createPlayer(username: string, passwordHash: string): Promise<Player & { passwordHash: string }> {
    const lowerUsername = username.toLowerCase();
    if (this.usernameIndex.has(lowerUsername)) {
      throw new DuplicateUsernameError(username);
    }

    const id = crypto.randomUUID();
    const identityId = crypto.randomUUID();
    const now = new Date();

    const player: Player & { passwordHash: string } = {
      id,
      identity_id: identityId,
      username,
      passwordHash,
      created_at: now,
      updated_at: now,
    };

    this.players.set(id, player);
    this.usernameIndex.set(lowerUsername, id);

    return player;
  }

  async findByUsername(username: string): Promise<(Player & { passwordHash: string }) | null> {
    const id = this.usernameIndex.get(username.toLowerCase());
    if (!id) return null;
    return this.players.get(id) ?? null;
  }

  async findById(id: string): Promise<Player | null> {
    const player = this.players.get(id);
    if (!player) return null;
    // Strip passwordHash from the returned Player
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _passwordHash, ...playerData } = player;
    return playerData;
  }

  async findByProvider(provider: string, providerId: string): Promise<Player | null> {
    const key = `${provider}:${providerId}`;
    const id = this.providerIndex.get(key);
    if (!id) return null;
    return this.findById(id);
  }

  async createOAuthPlayer(
    provider: string,
    providerId: string,
    email: string | null,
    username: string,
  ): Promise<Player> {
    const lowerUsername = username.toLowerCase();
    if (this.usernameIndex.has(lowerUsername)) {
      throw new DuplicateUsernameError(username);
    }

    const id = crypto.randomUUID();
    const identityId = crypto.randomUUID();
    const now = new Date();

    const player: Player & { passwordHash: string } = {
      id,
      identity_id: identityId,
      username,
      passwordHash: '', // OAuth users don't have passwords
      created_at: now,
      updated_at: now,
    };

    this.players.set(id, player);
    this.usernameIndex.set(lowerUsername, id);
    this.providerIndex.set(`${provider}:${providerId}`, id);

    // Strip passwordHash from the returned Player
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _passwordHash, ...playerData } = player;
    return playerData;
  }

  async getRoleByPlayerId(playerId: string): Promise<string> {
    return this.roles.get(playerId) ?? 'player';
  }

  /** Set a player's role (in-memory only — for testing/auto-promote). */
  async setRole(playerId: string, role: string): Promise<void> {
    this.roles.set(playerId, role);
  }
}

/** Thrown when attempting to create a player with an already-taken username. */
export class DuplicateUsernameError extends Error {
  constructor(username: string) {
    super(`Username already taken: ${username}`);
    this.name = 'DuplicateUsernameError';
  }
}
