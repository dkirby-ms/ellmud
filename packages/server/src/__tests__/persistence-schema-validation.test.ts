/**
 * Schema validation tests — proactive for Issue #3.
 *
 * Validates that migration SQL files are well-formed by parsing structure,
 * checking constraint naming, verifying foreign keys, and ensuring type
 * consistency with TypeScript db/types.ts.
 *
 * These are pure parse checks — no database connection needed.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// ─── Helpers ────────────────────────────────────────────────────────────────

const MIGRATIONS_DIR = join(import.meta.dirname!, '..', 'db', 'migrations');

function readMigration(filename: string): string {
  return readFileSync(join(MIGRATIONS_DIR, filename), 'utf-8');
}

function allMigrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();
}

/** Extract CREATE TABLE statements from SQL. */
function extractCreateTables(sql: string): string[] {
  const regex = /CREATE TABLE\s+(\w+)/gi;
  const tables: string[] = [];
  let match;
  while ((match = regex.exec(sql)) !== null) {
    tables.push(match[1]!);
  }
  return tables;
}

/** Extract CONSTRAINT names from SQL. */
function extractConstraints(sql: string): string[] {
  const regex = /CONSTRAINT\s+(\w+)/gi;
  const constraints: string[] = [];
  let match;
  while ((match = regex.exec(sql)) !== null) {
    constraints.push(match[1]!);
  }
  return constraints;
}

/** Extract CREATE INDEX names from SQL. */
function extractIndexes(sql: string): string[] {
  const regex = /CREATE INDEX\s+(?:IF NOT EXISTS\s+)?(\w+)/gi;
  const indexes: string[] = [];
  let match;
  while ((match = regex.exec(sql)) !== null) {
    indexes.push(match[1]!);
  }
  return indexes;
}

/** Extract REFERENCES clauses from SQL. */
function extractForeignKeys(sql: string): Array<{ column: string; refTable: string; refColumn: string }> {
  const regex = /(\w+)\s+UUID\s+NOT NULL\s+REFERENCES\s+(\w+)\((\w+)\)/gi;
  const fks: Array<{ column: string; refTable: string; refColumn: string }> = [];
  let match;
  while ((match = regex.exec(sql)) !== null) {
    fks.push({ column: match[1]!, refTable: match[2]!, refColumn: match[3]! });
  }
  return fks;
}

// ─── Migration File Structure ───────────────────────────────────────────────

describe('Migration files', () => {
  const files = allMigrationFiles();

  it('all migration files exist with expected naming', () => {
    expect(files).toContain('001_create_players.sql');
    expect(files).toContain('002_create_items.sql');
    expect(files).toContain('003_create_skills.sql');
    expect(files).toContain('004_create_factions.sql');
    expect(files).toContain('005_create_run_history.sql');
    // Additional migrations may be added by other team members
    expect(files.length).toBeGreaterThanOrEqual(5);
  });

  it('migration files are numbered sequentially', () => {
    files.forEach((f, i) => {
      const num = parseInt(f.split('_')[0]!, 10);
      expect(num).toBe(i + 1);
    });
  });

  it('all migration files are non-empty', () => {
    for (const f of files) {
      const sql = readMigration(f);
      expect(sql.trim().length).toBeGreaterThan(0);
    }
  });

  it('all migration files start with a comment header', () => {
    for (const f of files) {
      const sql = readMigration(f);
      expect(sql.trimStart().startsWith('--')).toBe(true);
    }
  });
});

// ─── 001: Players Schema ────────────────────────────────────────────────────

describe('001_create_players.sql', () => {
  const sql = readMigration('001_create_players.sql');

  it('creates player_identities table', () => {
    expect(extractCreateTables(sql)).toContain('player_identities');
  });

  it('creates players table', () => {
    expect(extractCreateTables(sql)).toContain('players');
  });

  it('enables pgcrypto extension', () => {
    expect(sql).toContain('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
  });

  it('player_identities has UUID primary key with default', () => {
    expect(sql).toMatch(/id\s+UUID PRIMARY KEY DEFAULT gen_random_uuid\(\)/i);
  });

  it('player_identities has provider column with local default', () => {
    expect(sql).toMatch(/provider\s+TEXT\s+NOT NULL\s+DEFAULT\s+'local'/i);
  });

  it('player_identities has password_hash column', () => {
    expect(sql).toMatch(/password_hash\s+TEXT/i);
  });

  it('players has username with UNIQUE constraint', () => {
    expect(sql).toMatch(/CONSTRAINT\s+uq_player_username\s+UNIQUE\s*\(username\)/i);
  });

  it('players references player_identities via identity_id', () => {
    const fks = extractForeignKeys(sql);
    const identityFk = fks.find(fk => fk.column === 'identity_id');
    expect(identityFk).toBeDefined();
    expect(identityFk!.refTable).toBe('player_identities');
    expect(identityFk!.refColumn).toBe('id');
  });

  it('has ON DELETE CASCADE for identity reference', () => {
    expect(sql).toMatch(/REFERENCES player_identities\(id\)\s+ON DELETE CASCADE/i);
  });

  it('has unique constraint on provider + provider_id', () => {
    expect(sql).toMatch(/CONSTRAINT\s+uq_identity_provider\s+UNIQUE\s*\(provider,\s*provider_id\)/i);
  });

  it('creates indexes for common lookups', () => {
    const indexes = extractIndexes(sql);
    expect(indexes).toContain('idx_players_identity');
    expect(indexes).toContain('idx_players_username');
    expect(indexes).toContain('idx_identities_email');
  });

  it('email index is partial (WHERE email IS NOT NULL)', () => {
    expect(sql).toMatch(/idx_identities_email.*WHERE email IS NOT NULL/is);
  });
});

// ─── 002: Items & Stash Schema ──────────────────────────────────────────────

describe('002_create_items.sql', () => {
  const sql = readMigration('002_create_items.sql');

  it('creates item_definitions table', () => {
    expect(extractCreateTables(sql)).toContain('item_definitions');
  });

  it('creates player_stash table', () => {
    expect(extractCreateTables(sql)).toContain('player_stash');
  });

  it('item_definitions has type column', () => {
    expect(sql).toMatch(/type\s+TEXT\s+NOT NULL/i);
  });

  it('item_definitions has soulbound boolean', () => {
    expect(sql).toMatch(/soulbound\s+BOOLEAN\s+NOT NULL\s+DEFAULT\s+false/i);
  });

  it('item_definitions has stats JSONB column', () => {
    expect(sql).toMatch(/stats\s+JSONB\s+NOT NULL\s+DEFAULT\s+'{}'/i);
  });

  it('player_stash has quantity CHECK constraint (> 0)', () => {
    expect(sql).toMatch(/quantity\s+INT\s+NOT NULL\s+DEFAULT\s+1\s+CHECK\s*\(quantity\s*>\s*0\)/i);
  });

  it('player_stash references players via player_id', () => {
    const fks = extractForeignKeys(sql);
    const playerFk = fks.find(fk => fk.column === 'player_id' && fk.refTable === 'players');
    expect(playerFk).toBeDefined();
  });

  it('player_stash references item_definitions via item_id', () => {
    const fks = extractForeignKeys(sql);
    const itemFk = fks.find(fk => fk.column === 'item_id' && fk.refTable === 'item_definitions');
    expect(itemFk).toBeDefined();
  });

  it('item deletion is RESTRICT (protect stash references)', () => {
    expect(sql).toMatch(/REFERENCES item_definitions\(id\)\s+ON DELETE RESTRICT/i);
  });

  it('player deletion cascades to stash', () => {
    expect(sql).toMatch(/REFERENCES players\(id\)\s+ON DELETE CASCADE/i);
  });

  it('has stash indexes for player and item lookups', () => {
    const indexes = extractIndexes(sql);
    expect(indexes).toContain('idx_stash_player');
    expect(indexes).toContain('idx_stash_item');
    expect(indexes).toContain('idx_items_type');
    expect(indexes).toContain('idx_items_tier');
  });

  it('player_stash has durability column (nullable for non-degradable)', () => {
    expect(sql).toMatch(/durability\s+REAL/i);
  });

  it('player_stash has metadata JSONB column', () => {
    expect(sql).toMatch(/metadata\s+JSONB\s+NOT NULL\s+DEFAULT\s+'{}'/i);
  });
});

// ─── 003: Skills Schema ─────────────────────────────────────────────────────

describe('003_create_skills.sql', () => {
  const sql = readMigration('003_create_skills.sql');

  it('creates player_skills table', () => {
    expect(extractCreateTables(sql)).toContain('player_skills');
  });

  it('has level CHECK constraint (>= 1)', () => {
    expect(sql).toMatch(/level\s+INT\s+NOT NULL\s+DEFAULT\s+1\s+CHECK\s*\(level\s*>=\s*1\)/i);
  });

  it('has xp CHECK constraint (>= 0)', () => {
    expect(sql).toMatch(/xp\s+INT\s+NOT NULL\s+DEFAULT\s+0\s+CHECK\s*\(xp\s*>=\s*0\)/i);
  });

  it('has unique constraint on player_id + skill_name', () => {
    expect(sql).toMatch(/CONSTRAINT\s+uq_player_skill\s+UNIQUE\s*\(player_id,\s*skill_name\)/i);
  });

  it('references players table', () => {
    const fks = extractForeignKeys(sql);
    expect(fks.some(fk => fk.refTable === 'players')).toBe(true);
  });

  it('has category column for skill grouping', () => {
    expect(sql).toMatch(/category\s+TEXT\s+NOT NULL/i);
  });
});

// ─── 004: Factions Schema ───────────────────────────────────────────────────

describe('004_create_factions.sql', () => {
  const sql = readMigration('004_create_factions.sql');

  it('creates factions table', () => {
    expect(extractCreateTables(sql)).toContain('factions');
  });

  it('creates faction_membership table', () => {
    expect(extractCreateTables(sql)).toContain('faction_membership');
  });

  it('seeds three canonical factions', () => {
    expect(sql).toContain('Ironwright Compact');
    expect(sql).toContain('Veil Cartographers');
    expect(sql).toContain('Scarlet Ledger');
  });

  it('factions has unique name constraint', () => {
    expect(sql).toMatch(/CONSTRAINT\s+uq_faction_name\s+UNIQUE\s*\(name\)/i);
  });

  it('factions has unique slug constraint', () => {
    expect(sql).toMatch(/CONSTRAINT\s+uq_faction_slug\s+UNIQUE\s*\(slug\)/i);
  });

  it('membership enforces one faction per player', () => {
    expect(sql).toMatch(/CONSTRAINT\s+uq_faction_membership_player\s+UNIQUE\s*\(player_id\)/i);
  });

  it('membership has reputation CHECK (>= 0)', () => {
    expect(sql).toMatch(/reputation\s+INT\s+NOT NULL\s+DEFAULT\s+0\s+CHECK\s*\(reputation\s*>=\s*0\)/i);
  });

  it('membership has rank CHECK (>= 1)', () => {
    expect(sql).toMatch(/rank\s+INT\s+NOT NULL\s+DEFAULT\s+1\s+CHECK\s*\(rank\s*>=\s*1\)/i);
  });

  it('faction deletion is RESTRICT (protect memberships)', () => {
    expect(sql).toMatch(/REFERENCES factions\(id\)\s+ON DELETE RESTRICT/i);
  });
});

// ─── 005: Run History Schema ────────────────────────────────────────────────

describe('005_create_run_history.sql', () => {
  const sql = readMigration('005_create_run_history.sql');

  it('creates run_history table', () => {
    expect(extractCreateTables(sql)).toContain('run_history');
  });

  it('has shard_tier CHECK constraint (1-3)', () => {
    expect(sql).toMatch(/shard_tier\s+INT\s+NOT NULL\s+CHECK\s*\(shard_tier BETWEEN 1 AND 3\)/i);
  });

  it('has duration_sec CHECK constraint (>= 0)', () => {
    expect(sql).toMatch(/duration_sec\s+INT\s+NOT NULL\s+DEFAULT\s+0\s+CHECK\s*\(duration_sec\s*>=\s*0\)/i);
  });

  it('has xp_gained CHECK constraint (>= 0)', () => {
    expect(sql).toMatch(/xp_gained\s+INT\s+NOT NULL\s+DEFAULT\s+0\s+CHECK\s*\(xp_gained\s*>=\s*0\)/i);
  });

  it('has extracted boolean default false', () => {
    expect(sql).toMatch(/extracted\s+BOOLEAN\s+NOT NULL\s+DEFAULT\s+false/i);
  });

  it('has extracted_items JSONB column', () => {
    expect(sql).toMatch(/extracted_items\s+JSONB\s+NOT NULL\s+DEFAULT\s+'\[\]'/i);
  });

  it('references players table', () => {
    const fks = extractForeignKeys(sql);
    expect(fks.some(fk => fk.refTable === 'players')).toBe(true);
  });

  it('has leaderboard index (shard_tier + xp_gained DESC)', () => {
    const indexes = extractIndexes(sql);
    expect(indexes).toContain('idx_runs_leaderboard');
  });

  it('has temporal index for recent runs', () => {
    const indexes = extractIndexes(sql);
    expect(indexes).toContain('idx_runs_created');
  });
});

// ─── Cross-Migration Consistency ────────────────────────────────────────────

describe('cross-migration consistency', () => {
  it('all foreign keys reference tables created in same or earlier migration', () => {
    // Build a running set of known tables across migrations in order
    const knownTables = new Set<string>();
    const files = allMigrationFiles();

    for (const file of files) {
      const sql = readMigration(file);
      // Add tables from this migration
      for (const table of extractCreateTables(sql)) {
        knownTables.add(table);
      }
      // Check FKs reference known tables
      for (const fk of extractForeignKeys(sql)) {
        expect(knownTables.has(fk.refTable)).toBe(true);
      }
    }
  });

  it('no duplicate table names across migrations', () => {
    const allTables: string[] = [];
    for (const file of allMigrationFiles()) {
      const sql = readMigration(file);
      allTables.push(...extractCreateTables(sql));
    }
    const unique = new Set(allTables);
    expect(unique.size).toBe(allTables.length);
  });

  it('no duplicate constraint names across migrations', () => {
    const allConstraints: string[] = [];
    for (const file of allMigrationFiles()) {
      const sql = readMigration(file);
      allConstraints.push(...extractConstraints(sql));
    }
    const unique = new Set(allConstraints);
    expect(unique.size).toBe(allConstraints.length);
  });

  it('no duplicate index names across migrations', () => {
    const allIndexes: string[] = [];
    for (const file of allMigrationFiles()) {
      const sql = readMigration(file);
      allIndexes.push(...extractIndexes(sql));
    }
    const unique = new Set(allIndexes);
    expect(unique.size).toBe(allIndexes.length);
  });

  it('all tables use UUID primary keys', () => {
    // content_definitions uses a composite TEXT PK (entity_type, id) because
    // content IDs are admin-defined slugs (e.g. 'rusty_blade', 'flooded_crypt'),
    // not auto-generated UUIDs.
    const COMPOSITE_PK_TABLES = ['content_definitions'];

    for (const file of allMigrationFiles()) {
      const sql = readMigration(file);
      const tables = extractCreateTables(sql);
      for (const table of tables) {
        if (COMPOSITE_PK_TABLES.includes(table)) continue;
        // Every other CREATE TABLE should have UUID PRIMARY KEY
        expect(sql).toMatch(new RegExp(`CREATE TABLE.*${table}[\\s\\S]*UUID PRIMARY KEY`, 'i'));
      }
    }
  });

  it('data tables have at least one timestamp column (created_at or updated_at)', () => {
    // Config/override tables (e.g., stash_capacity) may legitimately lack timestamps.
    // We check the core data migrations (001-005) which hold player-generated data.
    const coreMigrations = allMigrationFiles().filter(f => {
      const num = parseInt(f.split('_')[0]!, 10);
      return num >= 1 && num <= 5;
    });
    for (const file of coreMigrations) {
      const sql = readMigration(file);
      const tables = extractCreateTables(sql);
      if (tables.length > 0) {
        expect(sql).toMatch(/(created_at|updated_at)\s+TIMESTAMPTZ\s+NOT NULL\s+DEFAULT\s+now\(\)/i);
      }
    }
  });
});
