/**
 * Starting gear on join — Integration tests for Issue #377.
 *
 * Verifies that ZoneRoom sends LOADOUT_UPDATE and STASH_UPDATE messages
 * to the client on join, so the UI can display equipped and stored items.
 *
 * Root cause: When RefugeRoom was merged into ZoneRoom, the on-join
 * stash/loadout update was lost. The old RefugeRoom called
 * sendLoadoutAndStashUpdate() during onJoin; ZoneRoom did not.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { ColyseusTestServer } from '@colyseus/testing';
import { MessageTypes } from '@ellmud/shared';

import {
  bootTestServer,
  connectTestClient,
  wait,
} from './helpers/index.js';

import {
  resetInstanceCounter,
} from './helpers/loadout-fixtures.js';

// ─── Test Server ─────────────────────────────────────────────────────────────

let colyseus: ColyseusTestServer;

beforeAll(async () => {
  colyseus = await bootTestServer();
}, 30000);

afterAll(async () => {
  await colyseus.shutdown();
}, 30000);

beforeEach(() => {
  resetInstanceCounter();
});

// ═══════════════════════════════════════════════════════════════════════════
// ISSUE #377 — Starting gear missing: LOADOUT_UPDATE + STASH_UPDATE on join
// ═══════════════════════════════════════════════════════════════════════════

describe('ZoneRoom sends loadout and stash on join (#377)', () => {
  it('sends LOADOUT_UPDATE to the client on join', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'zone', { zoneSlug: 'the-refuge' });

    await wait(500);

    const loadoutMsg = collector.loadoutUpdate;
    expect(loadoutMsg.length).toBeGreaterThanOrEqual(1);

    // Loadout should have a slots object (even if all empty for a new player)
    const data = loadoutMsg[0]!;
    expect(data.slots).toBeDefined();
    expect(typeof data.slots).toBe('object');

    await client.leave();
  });

  it('sends STASH_UPDATE to the client on join', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'zone', { zoneSlug: 'the-refuge' });

    await wait(500);

    const stashMsg = collector.stashUpdate;
    expect(stashMsg.length).toBeGreaterThanOrEqual(1);

    // Stash should have an items array (empty for a new in-memory player)
    const data = stashMsg[0]!;
    expect(data.items).toBeDefined();
    expect(Array.isArray(data.items)).toBe(true);

    await client.leave();
  });

  it('sends both LOADOUT_UPDATE and STASH_UPDATE before any user interaction', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'zone', { zoneSlug: 'the-refuge' });

    await wait(500);

    // Both messages should arrive automatically on join
    const hasLoadout = collector.all.some((m) => m.type === MessageTypes.LOADOUT_UPDATE);
    const hasStash = collector.all.some((m) => m.type === MessageTypes.STASH_UPDATE);

    expect(hasLoadout).toBe(true);
    expect(hasStash).toBe(true);

    await client.leave();
  });

  it('sends equipment updates on join for procedural zone too', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'zone');

    await wait(500);

    const hasLoadout = collector.all.some((m) => m.type === MessageTypes.LOADOUT_UPDATE);
    const hasStash = collector.all.some((m) => m.type === MessageTypes.STASH_UPDATE);

    expect(hasLoadout).toBe(true);
    expect(hasStash).toBe(true);

    await client.leave();
  });

  it('LOADOUT_UPDATE slots has the expected structure', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'zone', { zoneSlug: 'the-refuge' });

    await wait(500);

    const loadoutMsg = collector.loadoutUpdate[0];
    expect(loadoutMsg).toBeDefined();

    const { slots } = loadoutMsg!;
    // Should have all standard equipment slot keys
    expect(slots).toHaveProperty('head');
    expect(slots).toHaveProperty('chest');
    expect(slots).toHaveProperty('legs');
    expect(slots).toHaveProperty('feet');
    expect(slots).toHaveProperty('hands');
    expect(slots).toHaveProperty('weapon');
    expect(slots).toHaveProperty('offhand');
    expect(slots).toHaveProperty('ring1');
    expect(slots).toHaveProperty('ring2');
    expect(slots).toHaveProperty('amulet');

    await client.leave();
  });

  it('STASH_UPDATE items array has correct DisplayItem shape when items exist', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'zone', { zoneSlug: 'the-refuge' });

    await wait(500);

    const stashMsg = collector.stashUpdate[0];
    expect(stashMsg).toBeDefined();
    expect(stashMsg!.items).toBeDefined();

    // In-memory mode won't have starter items (those are Postgres-only),
    // but the structure should still be valid
    for (const item of stashMsg!.items) {
      expect(item).toHaveProperty('instanceId');
      expect(item).toHaveProperty('definitionId');
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('type');
      expect(item).toHaveProperty('weight');
    }

    await client.leave();
  });
});
