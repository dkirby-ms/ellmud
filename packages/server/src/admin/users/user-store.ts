/**
 * UserStore — repository abstraction for admin user CRUD.
 *
 * Follows the same interface/in-memory/pg pattern used by
 * StashRepository and PlayerRepository elsewhere in the codebase.
 *
 * PgUserStore delegates to the shared pg pool (query/getClient).
 * InMemoryUserStore keeps data in Maps for CI and unit tests.
 */

import { query, getClient } from '../../db/index.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UserRecord {
  id: string;
  identityId: string;
  username: string;
  email: string | null;
  role: string;
  provider: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  username: string;
  passwordHash: string;
  email: string | null;
  role: string;
}

export interface UpdateUserInput {
  username?: string;
  email?: string;
  role?: string;
}

// ─── Errors ──────────────────────────────────────────────────────────────────

export class DuplicateUsernameError extends Error {
  constructor(public readonly username: string) {
    super(`Username '${username}' is already taken`);
    this.name = 'DuplicateUsernameError';
  }
}

export class DuplicateProviderError extends Error {
  constructor() {
    super('A local account already exists for this provider ID');
    this.name = 'DuplicateProviderError';
  }
}

// ─── Interface ───────────────────────────────────────────────────────────────

export interface UserStore {
  listUsers(): Promise<UserRecord[]>;
  getUserById(id: string): Promise<UserRecord | null>;
  createUser(input: CreateUserInput): Promise<UserRecord>;
  updateUser(id: string, input: UpdateUserInput): Promise<UserRecord | null>;
  deleteUser(id: string): Promise<boolean>;
}

// ─── PostgreSQL Implementation ───────────────────────────────────────────────

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

function rowToRecord(row: UserRow): UserRecord {
  return {
    id: row.id,
    identityId: row.identity_id,
    username: row.username,
    email: row.email,
    role: row.role,
    provider: row.provider,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isPgError(err: unknown): err is { code: string; constraint?: string } {
  return typeof err === 'object' && err !== null && 'code' in err;
}

export class PgUserStore implements UserStore {
  async listUsers(): Promise<UserRecord[]> {
    const result = await query<UserRow>(
      `SELECT p.id, p.identity_id, p.username, p.created_at, p.updated_at,
              i.email, i.role, i.provider
       FROM players p
       JOIN player_identities i ON i.id = p.identity_id
       ORDER BY p.created_at DESC`,
    );
    return result.rows.map(rowToRecord);
  }

  async getUserById(id: string): Promise<UserRecord | null> {
    const result = await query<UserRow>(
      `SELECT p.id, p.identity_id, p.username, p.created_at, p.updated_at,
              i.email, i.role, i.provider
       FROM players p
       JOIN player_identities i ON i.id = p.identity_id
       WHERE p.id = $1`,
      [id],
    );
    return result.rows.length > 0 ? rowToRecord(result.rows[0]) : null;
  }

  async createUser(input: CreateUserInput): Promise<UserRecord> {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const identityResult = await client.query<IdentityRow>(
        `INSERT INTO player_identities (provider, password_hash, email, role)
         VALUES ('local', $1, $2, $3)
         RETURNING id, provider, email, role, created_at`,
        [input.passwordHash, input.email, input.role],
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
        [identity.id, input.username],
      );
      const player = playerResult.rows[0];

      await client.query('COMMIT');

      return {
        id: player.id,
        identityId: identity.id,
        username: player.username,
        email: identity.email,
        role: identity.role,
        provider: identity.provider,
        createdAt: player.created_at,
        updatedAt: player.updated_at,
      };
    } catch (err: unknown) {
      await client.query('ROLLBACK');
      if (isPgError(err) && err.code === '23505') {
        if (err.constraint === 'uq_player_username') {
          throw new DuplicateUsernameError(input.username);
        }
        if (err.constraint === 'uq_identity_provider') {
          throw new DuplicateProviderError();
        }
      }
      throw err;
    } finally {
      client.release();
    }
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<UserRecord | null> {
    const existing = await query<{ id: string; identity_id: string }>(
      `SELECT id, identity_id FROM players WHERE id = $1`,
      [id],
    );
    if (existing.rows.length === 0) return null;

    const identityId = existing.rows[0].identity_id;
    const client = await getClient();

    try {
      await client.query('BEGIN');

      if (input.username !== undefined) {
        await client.query(
          `UPDATE players SET username = $1, updated_at = now() WHERE id = $2`,
          [input.username.trim(), id],
        );
      }

      const identityUpdates: string[] = [];
      const identityValues: unknown[] = [];
      let paramIndex = 1;

      if (input.email !== undefined) {
        identityUpdates.push(`email = $${paramIndex++}`);
        identityValues.push(input.email === '' ? null : input.email);
      }

      if (input.role !== undefined) {
        identityUpdates.push(`role = $${paramIndex++}`);
        identityValues.push(input.role);
      }

      if (identityUpdates.length > 0) {
        identityValues.push(identityId);
        await client.query(
          `UPDATE player_identities SET ${identityUpdates.join(', ')} WHERE id = $${paramIndex}`,
          identityValues,
        );
      }

      await client.query('COMMIT');
    } catch (err: unknown) {
      await client.query('ROLLBACK');
      if (isPgError(err) && err.code === '23505') {
        if (err.constraint === 'uq_player_username') {
          throw new DuplicateUsernameError(input.username ?? '');
        }
      }
      throw err;
    } finally {
      client.release();
    }

    return this.getUserById(id);
  }

  async deleteUser(id: string): Promise<boolean> {
    const existing = await query<{ identity_id: string }>(
      `SELECT identity_id FROM players WHERE id = $1`,
      [id],
    );
    if (existing.rows.length === 0) return false;

    await query(
      `DELETE FROM player_identities WHERE id = $1`,
      [existing.rows[0].identity_id],
    );
    return true;
  }
}

// ─── In-Memory Implementation ────────────────────────────────────────────────

interface InMemoryIdentity {
  id: string;
  provider: string;
  email: string | null;
  passwordHash: string;
  role: string;
  createdAt: Date;
}

interface InMemoryPlayer {
  id: string;
  identityId: string;
  username: string;
  createdAt: Date;
  updatedAt: Date;
}

export class InMemoryUserStore implements UserStore {
  private identities = new Map<string, InMemoryIdentity>();
  private players = new Map<string, InMemoryPlayer>();
  private usernameIndex = new Map<string, string>(); // lowercase username → player id
  private providerIndex = new Map<string, string>(); // provider+email → identity id

  resetStore(): void {
    this.identities.clear();
    this.players.clear();
    this.usernameIndex.clear();
    this.providerIndex.clear();
  }

  async listUsers(): Promise<UserRecord[]> {
    const records: UserRecord[] = [];
    for (const player of this.players.values()) {
      const identity = this.identities.get(player.identityId);
      if (!identity) continue;
      records.push({
        id: player.id,
        identityId: player.identityId,
        username: player.username,
        email: identity.email,
        role: identity.role,
        provider: identity.provider,
        createdAt: player.createdAt,
        updatedAt: player.updatedAt,
      });
    }
    records.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return records;
  }

  async getUserById(id: string): Promise<UserRecord | null> {
    const player = this.players.get(id);
    if (!player) return null;
    const identity = this.identities.get(player.identityId);
    if (!identity) return null;
    return {
      id: player.id,
      identityId: player.identityId,
      username: player.username,
      email: identity.email,
      role: identity.role,
      provider: identity.provider,
      createdAt: player.createdAt,
      updatedAt: player.updatedAt,
    };
  }

  async createUser(input: CreateUserInput): Promise<UserRecord> {
    if (this.usernameIndex.has(input.username.toLowerCase())) {
      throw new DuplicateUsernameError(input.username);
    }

    // Check for duplicate provider entry (same as PgUserStore uq_identity_provider)
    const providerKey = `local:${input.email ?? ''}`;
    if (this.providerIndex.has(providerKey)) {
      throw new DuplicateProviderError();
    }

    const now = new Date();
    const identityId = crypto.randomUUID();
    const playerId = crypto.randomUUID();

    const identity: InMemoryIdentity = {
      id: identityId,
      provider: 'local',
      email: input.email,
      passwordHash: input.passwordHash,
      role: input.role,
      createdAt: now,
    };

    const player: InMemoryPlayer = {
      id: playerId,
      identityId,
      username: input.username,
      createdAt: now,
      updatedAt: now,
    };

    this.identities.set(identityId, identity);
    this.players.set(playerId, player);
    this.usernameIndex.set(input.username.toLowerCase(), playerId);
    this.providerIndex.set(providerKey, identityId);

    return {
      id: playerId,
      identityId,
      username: player.username,
      email: identity.email,
      role: identity.role,
      provider: identity.provider,
      createdAt: player.createdAt,
      updatedAt: player.updatedAt,
    };
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<UserRecord | null> {
    const player = this.players.get(id);
    if (!player) return null;
    const identity = this.identities.get(player.identityId);
    if (!identity) return null;

    if (input.username !== undefined) {
      const trimmed = input.username.trim();
      const existingId = this.usernameIndex.get(trimmed.toLowerCase());
      if (existingId && existingId !== id) {
        throw new DuplicateUsernameError(trimmed);
      }
      this.usernameIndex.delete(player.username.toLowerCase());
      player.username = trimmed;
      player.updatedAt = new Date();
      this.usernameIndex.set(trimmed.toLowerCase(), id);
    }

    if (input.email !== undefined) {
      identity.email = input.email === '' ? null : input.email;
    }

    if (input.role !== undefined) {
      identity.role = input.role;
    }

    return {
      id: player.id,
      identityId: player.identityId,
      username: player.username,
      email: identity.email,
      role: identity.role,
      provider: identity.provider,
      createdAt: player.createdAt,
      updatedAt: player.updatedAt,
    };
  }

  async deleteUser(id: string): Promise<boolean> {
    const player = this.players.get(id);
    if (!player) return false;

    const identity = this.identities.get(player.identityId);
    if (identity) {
      const providerKey = `${identity.provider}:${identity.email ?? ''}`;
      this.providerIndex.delete(providerKey);
    }

    this.usernameIndex.delete(player.username.toLowerCase());
    this.players.delete(id);
    this.identities.delete(player.identityId);
    return true;
  }
}
