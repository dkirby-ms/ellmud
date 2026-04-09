/**
 * UserSettingsRepository — Interface + PostgreSQL implementation.
 *
 * Stores per-player config as a JSONB blob, keyed by player UUID.
 * Uses upsert semantics so the first PUT creates the row automatically.
 */

import { query } from './index.js';
import type { UserSettings, UserSettingsConfig } from './types.js';

// ─── Interface ───────────────────────────────────────────────────────────────

export interface UserSettingsRepository {
  getSettings(playerId: string): Promise<UserSettings | null>;
  upsertSettings(playerId: string, config: Record<string, unknown>): Promise<UserSettings>;
}

// ─── PostgreSQL Implementation ───────────────────────────────────────────────

interface UserSettingsRow {
  id: string;
  player_id: string;
  config: UserSettingsConfig;
  created_at: Date;
  updated_at: Date;
}

function rowToModel(row: UserSettingsRow): UserSettings {
  return {
    id: row.id,
    playerId: row.player_id,
    config: row.config,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PgUserSettingsRepository implements UserSettingsRepository {
  async getSettings(playerId: string): Promise<UserSettings | null> {
    const { rows } = await query<UserSettingsRow>(
      `SELECT id, player_id, config, created_at, updated_at
         FROM user_settings
        WHERE player_id = $1`,
      [playerId],
    );
    return rows[0] ? rowToModel(rows[0]) : null;
  }

  async upsertSettings(
    playerId: string,
    config: Record<string, unknown>,
  ): Promise<UserSettings> {
    const { rows } = await query<UserSettingsRow>(
      `INSERT INTO user_settings (player_id, config)
       VALUES ($1, $2)
       ON CONFLICT (player_id)
       DO UPDATE SET config = $2, updated_at = now()
       RETURNING id, player_id, config, created_at, updated_at`,
      [playerId, JSON.stringify(config)],
    );
    return rowToModel(rows[0]!);
  }
}

// ─── In-Memory Implementation ────────────────────────────────────────────────

export class InMemoryUserSettingsRepository implements UserSettingsRepository {
  private store = new Map<string, UserSettings>();

  async getSettings(playerId: string): Promise<UserSettings | null> {
    return this.store.get(playerId) ?? null;
  }

  async upsertSettings(
    playerId: string,
    config: Record<string, unknown>,
  ): Promise<UserSettings> {
    const now = new Date();
    const existing = this.store.get(playerId);
    const settings: UserSettings = {
      id: existing?.id ?? crypto.randomUUID(),
      playerId,
      config: config as UserSettingsConfig,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.store.set(playerId, settings);
    return structuredClone(settings);
  }
}

// ─── Singleton Provider ──────────────────────────────────────────────────────

let _repo: UserSettingsRepository | null = null;

export function initUserSettingsProvider(usePg: boolean): void {
  _repo = usePg ? new PgUserSettingsRepository() : new InMemoryUserSettingsRepository();
}

export function getUserSettingsRepository(): UserSettingsRepository {
  if (!_repo) {
    _repo = new InMemoryUserSettingsRepository();
  }
  return _repo;
}

export function resetUserSettingsProvider(): void {
  _repo = null;
}
