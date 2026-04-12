/**
 * ZoneRoom lifecycle tests — verify zones are always 'open' (MUD-style persistent).
 * Legacy collapse lifecycle (seeding → open → active → destabilising → collapse)
 * was removed in #438.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ColyseusTestServer } from '@colyseus/testing';
import { bootTestServer, connectTestClient, wait } from './helpers/index.js';

let colyseus: ColyseusTestServer;

beforeAll(async () => {
  colyseus = await bootTestServer();
});

afterAll(async () => {
  await colyseus.shutdown();
});

describe('ZoneRoom Lifecycle', () => {
  it('should start in open state immediately on creation', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'zone');

    expect(collector.zoneState.length).toBeGreaterThan(0);
    const states = collector.zoneState.map((s) => s.state);
    expect(states).toContain('open');

    await client.leave();
  });

  it('should remain in open state over time (no collapse)', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'zone');

    await wait(2000);

    const states = collector.zoneState.map((s) => s.state);
    // All state messages should be 'open'
    for (const state of states) {
      expect(state).toBe('open');
    }

    await client.leave();
  });

  it('zone state message should not include collapseTimer', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'zone');

    expect(collector.zoneState.length).toBeGreaterThan(0);
    const firstState = collector.zoneState[0]!;
    expect(firstState.state).toBe('open');
    expect(firstState).not.toHaveProperty('collapseTimer');

    await client.leave();
  });
});
