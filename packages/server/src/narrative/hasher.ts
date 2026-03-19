/**
 * State Hasher — deterministic SHA-256 of narration context for cache keys.
 *
 * Produces content-addressable keys: identical game states always yield
 * the same hash, regardless of property insertion order.
 */

import { createHash } from 'node:crypto';
import type { NarrationContext } from '@ellmud/shared';

/**
 * Fields stripped before hashing — ephemeral data that shouldn't
 * affect cache identity.
 */
const EPHEMERAL_EVENT_FIELDS = new Set(['tick']);

/**
 * Recursively sort object keys and strip ephemeral fields
 * to produce a canonical, deterministic representation.
 */
function canonicalize(value: unknown, stripKeys?: Set<string>): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item, stripKeys));
  }
  if (typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(value as Record<string, unknown>).sort();
    for (const key of keys) {
      if (stripKeys?.has(key)) continue;
      sorted[key] = canonicalize((value as Record<string, unknown>)[key], stripKeys);
    }
    return sorted;
  }
  return value;
}

/**
 * Hash a NarrationContext into a SHA-256 hex string.
 *
 * The context is canonicalized (sorted keys, stripped ephemeral fields)
 * before hashing to ensure deterministic output.
 */
export function hashState(context: NarrationContext): string {
  const canonical = canonicalize(context, EPHEMERAL_EVENT_FIELDS);
  const json = JSON.stringify(canonical);
  return createHash('sha256').update(json).digest('hex');
}
