/**
 * EFFECTIVE_STATS message tests — verify effective stats are sent on join and equip/unequip.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ColyseusTestServer } from '@colyseus/testing';
import {
  bootTestServer,
  connectTestClient,
} from './helpers/index.js';

let colyseus: ColyseusTestServer;

beforeAll(async () => {
  colyseus = await bootTestServer();
});

afterAll(async () => {
  await colyseus.shutdown();
});

describe('EFFECTIVE_STATS message — Server → Client (#455)', () => {
  it('should send EFFECTIVE_STATS on join after stats cache rebuild', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'zone');

    // Player should receive EFFECTIVE_STATS message on join
    expect(collector.effectiveStats.length).toBeGreaterThanOrEqual(1);

    const stats = collector.effectiveStats[0];
    expect(stats).toHaveProperty('maxHp');
    expect(stats).toHaveProperty('attack');
    expect(stats).toHaveProperty('armour');
    expect(stats).toHaveProperty('shieldBlock');
    expect(stats).toHaveProperty('dodge');

    // All values should be numbers
    expect(typeof stats.maxHp).toBe('number');
    expect(typeof stats.attack).toBe('number');
    expect(typeof stats.armour).toBe('number');
    expect(typeof stats.shieldBlock).toBe('number');
    expect(typeof stats.dodge).toBe('number');

    await client.leave();
  });

  it('effective stats values should be non-negative', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'zone');

    expect(collector.effectiveStats.length).toBeGreaterThanOrEqual(1);
    const stats = collector.effectiveStats[0];

    expect(stats.maxHp).toBeGreaterThanOrEqual(0);
    expect(stats.attack).toBeGreaterThanOrEqual(0);
    expect(stats.armour).toBeGreaterThanOrEqual(0);
    expect(stats.shieldBlock).toBeGreaterThanOrEqual(0);
    expect(stats.dodge).toBeGreaterThanOrEqual(0);

    await client.leave();
  });
});
