/**
 * Stash Wiring Integration Tests
 *
 * Verifies that the stash persistence provider is correctly wired into
 * the game loop: RefugeRoom loads stash on entry, ShardRoom persists
 * extracted items, and both rooms share the same repository instance.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { ColyseusTestServer } from '@colyseus/testing';
import { Server } from '@colyseus/core';
import { MessageTypes } from '@ellmud/shared';
import type { StashItem, StashItemInstance } from '@ellmud/shared';
import { MessageCollector } from './helpers/message-collector.js';
import { wait, makeCommand } from './helpers/index.js';
import { RefugeRoom } from '../rooms/RefugeRoom.js';
import {
  InMemoryStashRepository,
  StashService,
  initStashProvider,
  getStashRepository,
  getItemDefs,
  isStashPg,
  resetStashProvider,
} from '../stash/index.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

const IRON_ORE: StashItem = {
  id: 'iron-ore',
  name: 'Iron Ore',
  type: 'material',
  weight: 5,
  rarity: 'common',
  description: 'A chunk of iron ore.',
  baseDurability: null,
};

const HEAVY_ANVIL: StashItem = {
  id: 'heavy-anvil',
  name: 'Heavy Anvil',
  type: 'material',
  weight: 150,
  rarity: 'common',
  description: 'An impossibly heavy anvil.',
  baseDurability: null,
};

function makeInstance(itemId: string): StashItemInstance {
  return {
    instanceId: `${itemId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    itemId,
    durability: null,
    maxDurability: null,
  };
}

// ─── Provider Unit Tests ────────────────────────────────────────────────────

describe('Stash Provider', () => {
  afterEach(() => {
    resetStashProvider();
  });

  it('defaults to in-memory when not initialized', () => {
    const repo = getStashRepository();
    expect(repo).toBeInstanceOf(InMemoryStashRepository);
    expect(isStashPg()).toBe(false);
  });

  it('uses in-memory when initialized with usePg=false', () => {
    initStashProvider(false);
    const repo = getStashRepository();
    expect(repo).toBeInstanceOf(InMemoryStashRepository);
    expect(isStashPg()).toBe(false);
  });

  it('returns same repository instance on repeated calls', () => {
    initStashProvider(false);
    const repo1 = getStashRepository();
    const repo2 = getStashRepository();
    expect(repo1).toBe(repo2);
  });

  it('returns same itemDefs map on repeated calls', () => {
    initStashProvider(false);
    const defs1 = getItemDefs();
    const defs2 = getItemDefs();
    expect(defs1).toBe(defs2);
  });

  it('resetStashProvider clears state', () => {
    initStashProvider(false);
    const repo1 = getStashRepository();
    resetStashProvider();
    const repo2 = getStashRepository();
    expect(repo1).not.toBe(repo2);
    expect(isStashPg()).toBe(false);
  });
});

// ─── RefugeRoom Stash Wiring Tests ──────────────────────────────────────────

describe('RefugeRoom Stash Wiring', () => {
  let colyseus: ColyseusTestServer;
  let repo: InMemoryStashRepository;
  let itemDefs: Map<string, StashItem>;

  beforeAll(async () => {
    const server = new Server();
    server.define('refuge', RefugeRoom);
    await server.listen(0);
    const addr = (server as unknown as { transport: { server: { address(): { port: number } } } }).transport.server.address();
    (server as unknown as { port: number }).port = addr.port;
    colyseus = new ColyseusTestServer(server);
  });

  afterAll(async () => {
    await colyseus.shutdown();
  });

  beforeEach(() => {
    repo = new InMemoryStashRepository();
    itemDefs = new Map([[IRON_ORE.id, IRON_ORE], [HEAVY_ANVIL.id, HEAVY_ANVIL]]);
  });

  it('loads stash summary on Refuge entry', async () => {
    const room = await colyseus.createRoom('refuge', {});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (room as any).initStash(repo, itemDefs);

    // Pre-populate stash
    const playerId = 'test-player';
    await repo.addItem(playerId, makeInstance(IRON_ORE.id), 3);

    const client = await colyseus.connectTo(room, { playerId });
    const collector = new MessageCollector(client);
    await wait(500);

    // Should receive stash summary narration
    const stashMsg = collector.narrate.find((m) => m.text.includes('STASH'));
    expect(stashMsg).toBeDefined();
    expect(stashMsg!.text).toContain('Iron Ore');
    expect(stashMsg!.text).toContain('weight');

    await client.leave();
  });

  it('shows empty stash for new player', async () => {
    const room = await colyseus.createRoom('refuge', {});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (room as any).initStash(repo, itemDefs);

    const client = await colyseus.connectTo(room, { playerId: 'new-player' });
    const collector = new MessageCollector(client);
    await wait(500);

    const stashMsg = collector.narrate.find((m) => m.text.includes('stash'));
    expect(stashMsg).toBeDefined();
    expect(stashMsg!.text).toContain('empty');

    await client.leave();
  });

  it('stash command shows current stash contents', async () => {
    const room = await colyseus.createRoom('refuge', {});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (room as any).initStash(repo, itemDefs);

    const playerId = 'stash-cmd-player';
    await repo.addItem(playerId, makeInstance(IRON_ORE.id), 2);

    const client = await colyseus.connectTo(room, { playerId });
    const collector = new MessageCollector(client);
    await wait(500);

    const beforeCount = collector.narrate.length;
    client.send(MessageTypes.COMMAND, makeCommand('stash'));
    await wait(500);

    const newMessages = collector.narrate.slice(beforeCount);
    const stashResponse = newMessages.find((m) => m.text.includes('STASH'));
    expect(stashResponse).toBeDefined();
    expect(stashResponse!.text).toContain('Iron Ore');

    await client.leave();
  });

  it('take command removes item from stash', async () => {
    const room = await colyseus.createRoom('refuge', {});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (room as any).initStash(repo, itemDefs);

    const playerId = 'take-player';
    await repo.addItem(playerId, makeInstance(IRON_ORE.id), 2);

    const client = await colyseus.connectTo(room, { playerId });
    const collector = new MessageCollector(client);
    await wait(500);

    client.send(MessageTypes.COMMAND, makeCommand('take', 'iron', 'ore'));
    await wait(500);

    // Should confirm the take
    const takeMsg = collector.narrate.find((m) => m.text.includes('take') || m.text.includes('Iron Ore'));
    expect(takeMsg).toBeDefined();

    // Verify stash was actually modified in repo
    const entries = await repo.loadStash(playerId);
    expect(entries.length).toBe(1);
    expect(entries[0]!.quantity).toBe(1);

    await client.leave();
  });

  it('stash persists across multiple client connections (same repo)', async () => {
    const playerId = 'persist-player';
    await repo.addItem(playerId, makeInstance(IRON_ORE.id), 5);

    // First connection — take an item
    const room1 = await colyseus.createRoom('refuge', {});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (room1 as any).initStash(repo, itemDefs);

    const client1 = await colyseus.connectTo(room1, { playerId });
    new MessageCollector(client1);
    await wait(500);

    client1.send(MessageTypes.COMMAND, makeCommand('take', 'iron'));
    await wait(500);
    await client1.leave();

    // Second connection — stash should reflect the take
    const room2 = await colyseus.createRoom('refuge', {});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (room2 as any).initStash(repo, itemDefs);

    const client2 = await colyseus.connectTo(room2, { playerId });
    const collector2 = new MessageCollector(client2);
    await wait(500);

    const stashMsg = collector2.narrate.find((m) => m.text.includes('STASH'));
    expect(stashMsg).toBeDefined();
    // Should show 4 items (5 - 1 taken)
    expect(stashMsg!.text).toContain('x4');

    await client2.leave();
  });
});

// ─── Shared Repository Tests ────────────────────────────────────────────────

describe('Shared Repository Across Rooms', () => {
  afterEach(() => {
    resetStashProvider();
  });

  it('RefugeRoom and ShardRoom use the same provider repo', async () => {
    initStashProvider(false);

    const repo = getStashRepository();
    const defs = getItemDefs();

    // Create StashService instances like the rooms would
    const service1 = new StashService(repo, defs);
    const service2 = new StashService(repo, defs);

    // Register item def
    defs.set(IRON_ORE.id, IRON_ORE);

    // Store via service1 (simulating ShardRoom extraction)
    const playerId = 'shared-player';
    await service1.storeItem(playerId, makeInstance(IRON_ORE.id));

    // Load via service2 (simulating RefugeRoom entry)
    const view = await service2.loadStash(playerId);
    expect(view.entries.length).toBe(1);
    expect(view.entries[0]!.definition.name).toBe('Iron Ore');
  });

  it('weight enforcement works across shared repository', async () => {
    initStashProvider(false);

    const repo = getStashRepository();
    const defs = getItemDefs();
    defs.set(HEAVY_ANVIL.id, HEAVY_ANVIL);
    defs.set(IRON_ORE.id, IRON_ORE);

    const service = new StashService(repo, defs);
    const playerId = 'weight-player';

    // Add heavy anvil (150 weight) — should succeed (capacity 200)
    const r1 = await service.storeItem(playerId, makeInstance(HEAVY_ANVIL.id));
    expect(r1.ok).toBe(true);

    // Add iron ore (5 weight × 10 = 50) — should succeed (total 200)
    for (let i = 0; i < 10; i++) {
      const r = await service.storeItem(playerId, makeInstance(IRON_ORE.id));
      expect(r.ok).toBe(true);
    }

    // One more iron ore would exceed 200 — should fail
    const r2 = await service.storeItem(playerId, makeInstance(IRON_ORE.id));
    expect(r2.ok).toBe(false);
    expect(r2.error).toContain('Stash full');
  });
});

// ─── Health Endpoint Stash Status ───────────────────────────────────────────

describe('Health Endpoint — Stash Persistence Status', () => {
  let server: import('node:http').Server;

  afterEach(() => {
    if (server) server.close();
  });

  it('reports in-memory stash by default', async () => {
    const express = (await import('express')).default;
    const { createHealthRouter } = await import('../health.js');
    const app = express();
    app.use(createHealthRouter({}));
    server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;

    const res = await fetch(`http://127.0.0.1:${port}/health`);
    const body = await res.json() as { persistence: { stash: string } };
    expect(body.persistence.stash).toBe('in-memory');
  });

  it('reports postgresql stash when isStashPg is true', async () => {
    const express = (await import('express')).default;
    const { createHealthRouter } = await import('../health.js');
    const app = express();
    app.use(createHealthRouter({ isStashPg: true }));
    server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;

    const res = await fetch(`http://127.0.0.1:${port}/health`);
    const body = await res.json() as { persistence: { stash: string } };
    expect(body.persistence.stash).toBe('postgresql');
  });
});
