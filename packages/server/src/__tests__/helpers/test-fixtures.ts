/**
 * Test fixtures — mock data and deterministic helpers for tests.
 */
import type { CommandMessage, NarrationType, GearTier, ZoneTier, ZoneModifier } from '@ellmud/shared';

// ─── Deterministic PRNG ──────────────────────────────────────────────────────

/**
 * Simple seedable PRNG (mulberry32) for deterministic test scenarios.
 * Usage: const rng = createPRNG(42); rng(); // always same sequence
 */
export function createPRNG(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Mock Player Data ────────────────────────────────────────────────────────

export interface MockPlayer {
  name: string;
  sessionId: string;
}

export const MOCK_PLAYERS: MockPlayer[] = [
  { name: 'TestWarrior', sessionId: 'test-session-001' },
  { name: 'TestRogue', sessionId: 'test-session-002' },
  { name: 'TestMage', sessionId: 'test-session-003' },
  { name: 'TestHealer', sessionId: 'test-session-004' },
];

// ─── Mock Items ──────────────────────────────────────────────────────────────

export interface MockItem {
  name: string;
  tier: GearTier;
  weight: number;
}

export const MOCK_ITEMS: MockItem[] = [
  { name: 'Rusty Sword', tier: 'scrap', weight: 3.0 },
  { name: 'Iron Shield', tier: 'common', weight: 5.0 },
  { name: 'Elven Bow', tier: 'sturdy', weight: 2.0 },
  { name: 'Dwarven Hammer', tier: 'refined', weight: 8.0 },
  { name: 'Crystal Staff', tier: 'masterwork', weight: 1.5 },
  { name: 'Void Shard', tier: 'anomalous', weight: 0.1 },
];

// ─── Command Fixtures ────────────────────────────────────────────────────────

export function makeCommand(verb: string, ...args: string[]): CommandMessage {
  return { verb, args };
}

// ─── Shard Option Fixtures ───────────────────────────────────────────────────

export const ALL_SHARD_TIERS: ZoneTier[] = [1, 2, 3];

export const ALL_SHARD_MODIFIERS: ZoneModifier[] = [
  'darkness',
  'hunted',
  'silent',
  'echoing',
  'bountiful',
];

export const ALL_NARRATION_TYPES: NarrationType[] = [
  'room',
  'combat',
  'system',
  'speech',
  'sound',
  'trace',
];

/**
 * @deprecated Collapse lifecycle removed in #438. Zones are always 'open'.
 * Kept for backward compatibility — returns empty options.
 */
export function quickCollapseOptions(_collapseTimer = 10): Record<string, unknown> {
  return {};
}
