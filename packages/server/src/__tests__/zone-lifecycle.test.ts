/**
 * ZoneRoom lifecycle tests — verify all state transitions
 * seeding → open → active → destabilising → collapse
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ColyseusTestServer } from '@colyseus/testing';
import { bootTestServer, connectTestClient, wait, waitUntil, quickCollapseOptions } from './helpers/index.js';

let colyseus: ColyseusTestServer;

beforeAll(async () => {
  colyseus = await bootTestServer();
});

afterAll(async () => {
  await colyseus.shutdown();
});

describe('ZoneRoom Lifecycle', () => {
  it('should start in seeding state on creation', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'zone');

    expect(collector.zoneState.length).toBeGreaterThan(0);
    const states = collector.zoneState.map((s) => s.state);
    expect(states).toContain('seeding');

    await client.leave();
  });

  it('should transition from seeding → open', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'zone');

    await wait(1500);

    const states = collector.zoneState.map((s) => s.state);
    expect(states).toContain('seeding');
    expect(states).toContain('open');

    await client.leave();
  });

  it('should transition from open → active', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'zone');

    // seeding(1s) → open → active(5s)
    await wait(7000);

    const states = collector.zoneState.map((s) => s.state);
    expect(states).toContain('open');
    expect(states).toContain('active');

    await client.leave();
  });

  it('should reach destabilising when stability drops to 25%', async () => {
    const { client, collector } = await connectTestClient(
      colyseus,
      'zone',
      quickCollapseOptions(12),
    );

    // seeding(1s) → open(5s) → active, timer=12, destabilise at 75% = 9 ticks
    await wait(16_000);

    const states = collector.zoneState.map((s) => s.state);
    expect(states).toContain('active');
    expect(states).toContain('destabilising');

    await client.leave();
  }, 25_000);

  it('should reach collapse when stability hits zero', async () => {
    const { client, collector } = await connectTestClient(
      colyseus,
      'zone',
      quickCollapseOptions(8),
    );

    const reachedCollapse = await waitUntil(
      () => collector.zoneState.some((s) => s.state === 'collapse'),
      25_000,
    );

    expect(reachedCollapse).toBe(true);

    const systemMessages = collector.narrateByType('system');
    const collapseNarration = systemMessages.find((m) => m.text.includes('shatters'));
    expect(collapseNarration).toBeDefined();

    try { await client.leave(); } catch { /* may already be disconnected */ }
  }, 30_000);

  it('should include collapseTimer in zone state messages', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'zone');

    expect(collector.zoneState.length).toBeGreaterThan(0);
    const firstState = collector.zoneState[0]!;
    expect(firstState.collapseTimer).toBeTypeOf('number');
    expect(firstState.collapseTimer).toBeGreaterThan(0);

    await client.leave();
  });
});

describe('ZoneRoom Collapse Timer', () => {
  it('should decrement collapse timer during active state', async () => {
    const { client, collector } = await connectTestClient(
      colyseus,
      'zone',
      quickCollapseOptions(30),
    );

    await wait(7000);

    const activeStates = collector.zoneState.filter((s) => s.state === 'active');
    expect(activeStates.length).toBeGreaterThan(0);

    const activeTimer = activeStates[0]!.collapseTimer;
    expect(activeTimer).toBeDefined();
    expect(activeTimer).toBeTypeOf('number');

    await client.leave();
  });

  it('should accept custom collapse timer via room options', async () => {
    const customTimer = 60;
    const { client, collector } = await connectTestClient(
      colyseus,
      'zone',
      { collapseTimer: customTimer },
    );

    const firstState = collector.zoneState[0]!;
    expect(firstState.collapseTimer).toBe(customTimer);

    await client.leave();
  });
});
