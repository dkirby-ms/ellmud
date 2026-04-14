/**
 * Respawn Location Resolution Tests — Bug #461
 *
 * Respawn chain should be: lastInn → faction hub → startingZoneSlug → The Refuge
 * Currently startingZoneSlug is never consulted.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveRespawnTarget,
  type RespawnInput,
} from '../zones/respawn.js';

describe('resolveRespawnTarget (Bug #461)', () => {
  it('uses last inn when set', () => {
    const input: RespawnInput = {
      lastInn: { zoneSlug: 'warrens', roomSlug: 'inn-room-1' },
      factionSlug: 'kindari',
      startingZoneSlug: 'the-reliquary',
    };
    const result = resolveRespawnTarget(input);
    expect(result.target).toBe('zone:warrens');
    expect(result.roomSlug).toBe('inn-room-1');
    expect(result.displayName).toBe('your rented room');
  });

  it('falls back to faction hub when no inn is set', () => {
    const input: RespawnInput = {
      lastInn: null,
      factionSlug: 'kindari',
      startingZoneSlug: 'the-reliquary',
    };
    const result = resolveRespawnTarget(input);
    expect(result.target).toBe('zone:the-reliquary');
    expect(result.roomSlug).toBeUndefined();
    expect(result.displayName).toBe('The Reliquary');
  });

  it('falls back to startingZoneSlug when no inn and no faction', () => {
    const input: RespawnInput = {
      lastInn: null,
      factionSlug: undefined,
      startingZoneSlug: 'the-bloom-observatory',
    };
    const result = resolveRespawnTarget(input);
    expect(result.target).toBe('zone:the-bloom-observatory');
    expect(result.roomSlug).toBeUndefined();
    expect(result.displayName).toBe('The Bloom Observatory');
  });

  it('defaults to The Refuge when nothing is set', () => {
    const input: RespawnInput = {
      lastInn: null,
      factionSlug: undefined,
      startingZoneSlug: undefined,
    };
    const result = resolveRespawnTarget(input);
    expect(result.target).toBe('zone:the-refuge');
    expect(result.roomSlug).toBeUndefined();
    expect(result.displayName).toBe('The Refuge');
  });

  it('ignores unrecognized faction slug and falls through to startingZoneSlug', () => {
    const input: RespawnInput = {
      lastInn: null,
      factionSlug: 'unknown-faction',
      startingZoneSlug: 'the-carrion-court',
    };
    const result = resolveRespawnTarget(input);
    // unknown faction has no stronghold → falls through to startingZoneSlug
    expect(result.target).toBe('zone:the-carrion-court');
    expect(result.displayName).toBe('The Carrion Court');
  });

  it('ignores unrecognized startingZoneSlug and defaults to Refuge', () => {
    const input: RespawnInput = {
      lastInn: null,
      factionSlug: undefined,
      startingZoneSlug: 'nonexistent-zone',
    };
    const result = resolveRespawnTarget(input);
    expect(result.target).toBe('zone:the-refuge');
    expect(result.displayName).toBe('The Refuge');
  });
});
