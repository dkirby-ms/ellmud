/**
 * @ellmud/server — Database connection and migration runner.
 *
 * Reads DATABASE_URL from the environment. Provides a shared Pool
 * and a helper to run the numbered migration files in order.
 */

import pg from 'pg';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── Connection Pool ─────────────────────────────────────────────────────────

let pool: pg.Pool | null = null;

/** Lazily initialize the connection pool on first use. */
export function getPool(): pg.Pool {
  if (!pool) {
    const needsSsl = process.env.DATABASE_URL?.includes('sslmode=require');
    
    // Strip sslmode from connection string to avoid pg deprecation warnings.
    // We manage SSL via the pool config instead.
    let connectionString = process.env.DATABASE_URL;
    if (needsSsl && connectionString) {
      connectionString = connectionString.replace(/[?&]sslmode=require/, '');
    }

    pool = new pg.Pool({
      connectionString,
      max: 10,
      ...(needsSsl && { ssl: { rejectUnauthorized: false } }),
    });

    if (needsSsl) {
      console.log('[db] SSL enabled (rejectUnauthorized: false, sslmode managed via pool config)');
    }

    pool.on('error', (err) => {
      console.log('[db] ⚠ Database pool error:', err.message);
      console.error('[db] Unexpected pool error:', err.message);
    });
  }
  return pool;
}

/** Run a single parameterised query against the pool. */
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  values?: unknown[],
): Promise<pg.QueryResult<T>> {
  return getPool().query<T>(text, values);
}

/** Acquire a client from the pool (for transactions). */
export async function getClient(): Promise<pg.PoolClient> {
  return getPool().connect();
}

/** Gracefully shut down the pool. */
export async function close(): Promise<void> {
  if (pool) {
    await pool.end();
  }
}

// ─── Migration Runner ────────────────────────────────────────────────────────

const MIGRATIONS_DIR = join(
  fileURLToPath(new URL('.', import.meta.url)),
  'migrations',
);

/**
 * Run all SQL migration files in order. Idempotent — tracks applied
 * migrations in a `_migrations` meta-table.
 */
export async function runMigrations(): Promise<void> {
  const poolInstance = getPool();
  
  // Ensure the meta-table exists.
  await poolInstance.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name       TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const { rowCount } = await poolInstance.query(
      `SELECT 1 FROM _migrations WHERE name = $1`,
      [file],
    );

    if (rowCount && rowCount > 0) continue;

    const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf-8');
    const client = await poolInstance.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        `INSERT INTO _migrations (name) VALUES ($1)`,
        [file],
      );
      await client.query('COMMIT');
      console.log(`[db] Applied migration: ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`[db] Migration failed: ${file}`, err);
      throw err;
    } finally {
      client.release();
    }
  }
}

// Re-export types for convenience.
export type { Player, PlayerIdentity, ItemDefinition, StashEntry, PlayerSkill, Faction, FactionMembership, RunHistory, UserSettings, UserSettingsConfig } from './types.js';
export { FactionSlugs } from './types.js';
export type { SkillCategory, ItemType, FactionSlug } from './types.js';
