/**
 * CharacterFlagsRepository — Interface + PostgreSQL + InMemory implementations.
 *
 * Stores per-character display flags (anon, rp) as a JSONB blob.
 * Follows the same provider pattern as UserSettingsRepository.
 */

import { query } from './index.js';
import type { CharacterFlags, CharacterFlagName } from '@ellmud/shared';
import { DEFAULT_CHARACTER_FLAGS } from '@ellmud/shared';

// ─── Interface ───────────────────────────────────────────────────────────────

export interface CharacterFlagsRepository {
  /** Get flags for a character. Returns defaults if no row exists. */
  getFlags(characterId: string): Promise<CharacterFlags>;

  /** Set a single flag value. Creates or upserts the row. */
  setFlag(characterId: string, flagName: CharacterFlagName, value: boolean): Promise<void>;

  /** Get flags for all characters (for server-wide who list). */
  getAllFlags(): Promise<Map<string, CharacterFlags>>;
}

// ─── PostgreSQL Implementation ───────────────────────────────────────────────

interface FlagsRow {
  character_id: string;
  flags: Record<string, boolean>;
}

function rowToFlags(row: FlagsRow): CharacterFlags {
  return {
    anon: row.flags.anon === true,
    rp: row.flags.rp === true,
    allowFollowing: row.flags.allowFollowing !== false,
  };
}

export class PgCharacterFlagsRepository implements CharacterFlagsRepository {
  async getFlags(characterId: string): Promise<CharacterFlags> {
    const { rows } = await query<FlagsRow>(
      `SELECT character_id, flags FROM character_flags WHERE character_id = $1`,
      [characterId],
    );
    return rows[0] ? rowToFlags(rows[0]) : { ...DEFAULT_CHARACTER_FLAGS };
  }

  async setFlag(characterId: string, flagName: CharacterFlagName, value: boolean): Promise<void> {
    await query(
      `INSERT INTO character_flags (character_id, flags, updated_at)
       VALUES ($1, jsonb_build_object($2::text, $3::boolean), now())
       ON CONFLICT (character_id)
       DO UPDATE SET flags = character_flags.flags || jsonb_build_object($2::text, $3::boolean),
                     updated_at = now()`,
      [characterId, flagName, value],
    );
  }

  async getAllFlags(): Promise<Map<string, CharacterFlags>> {
    const { rows } = await query<FlagsRow>(
      `SELECT character_id, flags FROM character_flags`,
    );
    const result = new Map<string, CharacterFlags>();
    for (const row of rows) {
      result.set(row.character_id, rowToFlags(row));
    }
    return result;
  }
}

// ─── In-Memory Implementation ────────────────────────────────────────────────

export class InMemoryCharacterFlagsRepository implements CharacterFlagsRepository {
  private store = new Map<string, CharacterFlags>();

  async getFlags(characterId: string): Promise<CharacterFlags> {
    return structuredClone(this.store.get(characterId) ?? { ...DEFAULT_CHARACTER_FLAGS });
  }

  async setFlag(characterId: string, flagName: CharacterFlagName, value: boolean): Promise<void> {
    const current = this.store.get(characterId) ?? { ...DEFAULT_CHARACTER_FLAGS };
    current[flagName] = value;
    this.store.set(characterId, current);
  }

  async getAllFlags(): Promise<Map<string, CharacterFlags>> {
    const result = new Map<string, CharacterFlags>();
    for (const [id, flags] of this.store) {
      result.set(id, structuredClone(flags));
    }
    return result;
  }
}

// ─── Singleton Provider ──────────────────────────────────────────────────────

let _repo: CharacterFlagsRepository | null = null;

export function initCharacterFlagsProvider(usePg: boolean): void {
  _repo = usePg ? new PgCharacterFlagsRepository() : new InMemoryCharacterFlagsRepository();
}

export function getCharacterFlagsRepository(): CharacterFlagsRepository {
  if (!_repo) {
    _repo = new InMemoryCharacterFlagsRepository();
  }
  return _repo;
}

export function resetCharacterFlagsProvider(): void {
  _repo = null;
}
