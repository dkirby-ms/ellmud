import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { ColyseusTestServer } from '@colyseus/testing';
import { Server } from '@colyseus/core';
import { ShardRoom } from '../rooms/ShardRoom.js';
import { MessageTypes } from '@ellmud/shared';
import type { NarrateMessage, RoomHeaderMessage } from '@ellmud/shared';

import { parseCommand } from '../commands/parser.js';
import { handleCommand, type CommandContext } from '../commands/index.js';
import { PlayerState } from '../state/PlayerState.js';
import { createTestRoomGraph } from '../shard/RoomGraph.js';

// ─── Parser Unit Tests ────────────────────────────────────────────────────

describe('Command Parser', () => {
  it('should parse a simple verb', () => {
    const result = parseCommand('look');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.command.verb).toBe('look');
      expect(result.command.args).toEqual([]);
    }
  });

  it('should parse verb with args', () => {
    const result = parseCommand('take corroded halberd');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.command.verb).toBe('take');
      expect(result.command.args).toEqual(['corroded', 'halberd']);
    }
  });

  it('should expand direction aliases', () => {
    const cases: Array<[string, string, string[]]> = [
      ['n', 'go', ['north']],
      ['s', 'go', ['south']],
      ['e', 'go', ['east']],
      ['w', 'go', ['west']],
      ['u', 'go', ['up']],
      ['d', 'go', ['down']],
      ['north', 'go', ['north']],
      ['south', 'go', ['south']],
      ['east', 'go', ['east']],
      ['west', 'go', ['west']],
      ['up', 'go', ['up']],
      ['down', 'go', ['down']],
    ];

    for (const [input, expectedVerb, expectedArgs] of cases) {
      const result = parseCommand(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.command.verb).toBe(expectedVerb);
        expect(result.command.args).toEqual(expectedArgs);
      }
    }
  });

  it('should expand command aliases', () => {
    const result1 = parseCommand('l');
    expect(result1.ok).toBe(true);
    if (result1.ok) expect(result1.command.verb).toBe('look');

    const result2 = parseCommand('i');
    expect(result2.ok).toBe(true);
    if (result2.ok) expect(result2.command.verb).toBe('inventory');
  });

  it('should reject unknown verbs', () => {
    const result = parseCommand('xyzzy');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Unknown command');
    }
  });

  it('should reject empty input', () => {
    const result = parseCommand('');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Silence');
    }
  });

  it('should handle extra whitespace', () => {
    const result = parseCommand('  go   north  ');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.command.verb).toBe('go');
      expect(result.command.args).toEqual(['north']);
    }
  });

  it('should be case insensitive', () => {
    const result = parseCommand('LOOK');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.command.verb).toBe('look');
    }
  });
});

// ─── Room Graph Tests ─────────────────────────────────────────────────────

describe('Room Graph', () => {
  it('should create a test graph with 6 rooms', () => {
    const graph = createTestRoomGraph();
    expect(graph.rooms.size).toBe(6);
    expect(graph.startRoomId).toBe('entry');
  });

  it('should have bidirectional exits', () => {
    const graph = createTestRoomGraph();
    const entry = graph.rooms.get('entry')!;
    expect(entry.exits.get('north')).toBe('corridor');

    const corridor = graph.rooms.get('corridor')!;
    expect(corridor.exits.get('south')).toBe('entry');
  });
});

// ─── Player State Tests ───────────────────────────────────────────────────

describe('PlayerState', () => {
  let player: PlayerState;

  beforeEach(() => {
    player = new PlayerState('test-session', 'entry', 10);
  });

  it('should start with empty inventory', () => {
    expect(player.inventory.size).toBe(0);
    expect(player.currentWeight).toBe(0);
  });

  it('should add items to inventory', () => {
    const item = { id: 'torch', name: 'torch', weight: 1, description: 'a torch' };
    expect(player.addItem(item)).toBe(true);
    expect(player.inventory.size).toBe(1);
    expect(player.currentWeight).toBe(1);
  });

  it('should stack identical items', () => {
    const item = { id: 'torch', name: 'torch', weight: 1, description: 'a torch' };
    player.addItem(item);
    player.addItem(item);
    expect(player.inventory.get('torch')!.quantity).toBe(2);
    expect(player.currentWeight).toBe(2);
  });

  it('should reject items over weight limit', () => {
    const heavy = { id: 'anvil', name: 'anvil', weight: 11, description: 'very heavy' };
    expect(player.addItem(heavy)).toBe(false);
    expect(player.inventory.size).toBe(0);
  });

  it('should remove items from inventory', () => {
    const item = { id: 'torch', name: 'torch', weight: 1, description: 'a torch' };
    player.addItem(item);
    const removed = player.removeItem('torch');
    expect(removed).not.toBeNull();
    expect(player.inventory.size).toBe(0);
    expect(player.currentWeight).toBe(0);
  });

  it('should return null when removing non-existent item', () => {
    expect(player.removeItem('nonexistent')).toBeNull();
  });

  it('should find items by partial name', () => {
    const item = { id: 'halberd', name: 'corroded halberd', weight: 5, description: 'a weapon' };
    player.addItem(item);
    expect(player.findItem('corroded')).not.toBeNull();
    expect(player.findItem('halberd')).not.toBeNull();
    expect(player.findItem('nonexistent')).toBeNull();
  });
});

// ─── Command Handler Tests (unit, no Colyseus) ───────────────────────────

describe('Command Handlers', () => {
  let graph: ReturnType<typeof createTestRoomGraph>;
  let player: PlayerState;

  function buildCtx(args: string[] = []): CommandContext {
    return {
      player,
      room: graph.rooms.get(player.currentRoomId)!,
      args,
      resolveRoom: (id) => graph.rooms.get(id),
      otherPlayersInRoom: [],
      stability: 1.0,
    };
  }

  beforeEach(() => {
    graph = createTestRoomGraph();
    player = new PlayerState('test-session', 'entry', 20);
  });

  describe('look', () => {
    it('should describe the current room', () => {
      const result = handleCommand('look', buildCtx());
      expect(result.narrations.length).toBeGreaterThan(0);
      expect(result.narrations[0]!.text).toContain('Shard Entry');
      expect(result.narrations[0]!.type).toBe('room');
    });

    it('should list exits', () => {
      const result = handleCommand('look', buildCtx());
      expect(result.narrations[0]!.text).toContain('Exits:');
    });

    it('should list items in room', () => {
      const result = handleCommand('look', buildCtx());
      expect(result.narrations[0]!.text).toContain('battered torch');
    });

    it('should return a room header', () => {
      const result = handleCommand('look', buildCtx());
      expect(result.roomHeader).toBeDefined();
      expect(result.roomHeader!.roomName).toBe('Shard Entry');
    });
  });

  describe('go', () => {
    it('should move player to valid exit', () => {
      const result = handleCommand('go', buildCtx(['north']));
      expect(player.currentRoomId).toBe('corridor');
      expect(result.narrations[0]!.text).toContain('You move north');
      expect(result.narrations[0]!.text).toContain('Flooded Corridor');
    });

    it('should reject invalid direction', () => {
      const result = handleCommand('go', buildCtx(['west']));
      expect(result.narrations[0]!.text).toContain('no exit');
      expect(player.currentRoomId).toBe('entry');
    });

    it('should reject missing direction', () => {
      const result = handleCommand('go', buildCtx());
      expect(result.narrations[0]!.text).toContain('Go where?');
    });

    it('should reject nonsense direction', () => {
      const result = handleCommand('go', buildCtx(['sideways']));
      expect(result.narrations[0]!.text).toContain('not a valid direction');
    });

    it('should update room header after move', () => {
      const result = handleCommand('go', buildCtx(['north']));
      expect(result.roomHeader).toBeDefined();
      expect(result.roomHeader!.roomName).toBe('Flooded Corridor');
    });
  });

  describe('take', () => {
    it('should pick up item from room', () => {
      const room = graph.rooms.get('entry')!;
      expect(room.items.length).toBe(1);

      const result = handleCommand('take', buildCtx(['torch']));
      expect(result.narrations[0]!.text).toContain('pick up');
      expect(room.items.length).toBe(0);
      expect(player.inventory.size).toBe(1);
    });

    it('should reject taking item not in room', () => {
      const result = handleCommand('take', buildCtx(['sword']));
      expect(result.narrations[0]!.text).toContain("don't see");
    });

    it('should reject taking with no args', () => {
      const result = handleCommand('take', buildCtx());
      expect(result.narrations[0]!.text).toContain('Take what?');
    });

    it('should reject taking when over weight', () => {
      player = new PlayerState('test-session', 'armory', 4);
      const result = handleCommand('take', buildCtx(['halberd']));
      expect(result.narrations[0]!.text).toContain('too heavy');
    });

    it('should match by partial name', () => {
      const result = handleCommand('take', buildCtx(['battered']));
      expect(result.narrations[0]!.text).toContain('pick up');
    });
  });

  describe('drop', () => {
    beforeEach(() => {
      const room = graph.rooms.get('entry')!;
      // Take the torch first
      const torch = room.items[0]!;
      room.items.splice(0, 1);
      player.addItem(torch);
    });

    it('should drop item into room', () => {
      const room = graph.rooms.get('entry')!;
      expect(room.items.length).toBe(0);

      const result = handleCommand('drop', buildCtx(['torch']));
      expect(result.narrations[0]!.text).toContain('drop');
      expect(room.items.length).toBe(1);
      expect(player.inventory.size).toBe(0);
    });

    it('should reject dropping item not in inventory', () => {
      const result = handleCommand('drop', buildCtx(['sword']));
      expect(result.narrations[0]!.text).toContain('not carrying');
    });

    it('should reject dropping with no args', () => {
      const result = handleCommand('drop', buildCtx());
      expect(result.narrations[0]!.text).toContain('Drop what?');
    });
  });

  describe('inventory', () => {
    it('should show empty inventory', () => {
      const result = handleCommand('inventory', buildCtx());
      expect(result.narrations[0]!.text).toContain('nothing');
    });

    it('should list carried items', () => {
      player.addItem({ id: 'torch', name: 'battered torch', weight: 1, description: 'a torch' });
      const result = handleCommand('inventory', buildCtx());
      expect(result.narrations[0]!.text).toContain('battered torch');
      expect(result.narrations[0]!.text).toContain('Weight:');
    });

    it('should show quantities for stacked items', () => {
      const item = { id: 'torch', name: 'battered torch', weight: 1, description: 'a torch' };
      player.addItem(item);
      player.addItem(item);
      const result = handleCommand('inventory', buildCtx());
      expect(result.narrations[0]!.text).toContain('x2');
    });
  });

  describe('unknown commands', () => {
    it('should return a system narration for unknown verbs', () => {
      const result = handleCommand('dance', buildCtx());
      expect(result.narrations[0]!.type).toBe('system');
      expect(result.narrations[0]!.text).toContain('dance');
    });
  });
});

// ─── Integration Tests (Colyseus client → server) ─────────────────────────

describe('ShardRoom Commands (Integration)', () => {
  let colyseus: ColyseusTestServer;

  beforeAll(async () => {
    const server = new Server();
    server.define('shard', ShardRoom);
    await server.listen(0);
    const addr = (server as unknown as { transport: { server: { address(): { port: number } } } }).transport.server.address();
    (server as unknown as { port: number }).port = addr.port;
    colyseus = new ColyseusTestServer(server);
  });

  afterAll(async () => {
    await colyseus.shutdown();
  });

  it('should send room description on join', async () => {
    const room = await colyseus.createRoom('shard', { useTestGraph: true });
    const client = await colyseus.connectTo(room);

    const narrations: NarrateMessage[] = [];
    const headers: RoomHeaderMessage[] = [];
    client.onMessage(MessageTypes.NARRATE, (d: NarrateMessage) => narrations.push(d));
    client.onMessage(MessageTypes.ROOM_HEADER, (d: RoomHeaderMessage) => headers.push(d));

    await new Promise((r) => setTimeout(r, 500));

    // Should have system welcome + room narration
    expect(narrations.length).toBeGreaterThanOrEqual(2);
    const roomNarration = narrations.find((n) => n.type === 'room');
    expect(roomNarration).toBeDefined();
    expect(roomNarration!.text).toContain('Shard Entry');

    // Should have room header
    expect(headers.length).toBeGreaterThanOrEqual(1);
    expect(headers[0]!.roomName).toBe('Shard Entry');

    await client.leave();
  });

  it('should handle look command via messages', async () => {
    const room = await colyseus.createRoom('shard', { useTestGraph: true });
    const client = await colyseus.connectTo(room);

    const narrations: NarrateMessage[] = [];
    client.onMessage(MessageTypes.NARRATE, (d: NarrateMessage) => narrations.push(d));

    await new Promise((r) => setTimeout(r, 500));
    const beforeCount = narrations.length;

    client.send(MessageTypes.COMMAND, { verb: 'look', args: [] });
    await new Promise((r) => setTimeout(r, 500));

    expect(narrations.length).toBeGreaterThan(beforeCount);
    const lookNarration = narrations.slice(beforeCount).find((n) => n.type === 'room');
    expect(lookNarration).toBeDefined();
    expect(lookNarration!.text).toContain('Shard Entry');

    await client.leave();
  });

  it('should handle movement commands', async () => {
    const room = await colyseus.createRoom('shard', { useTestGraph: true });
    const client = await colyseus.connectTo(room);

    const narrations: NarrateMessage[] = [];
    const headers: RoomHeaderMessage[] = [];
    client.onMessage(MessageTypes.NARRATE, (d: NarrateMessage) => narrations.push(d));
    client.onMessage(MessageTypes.ROOM_HEADER, (d: RoomHeaderMessage) => headers.push(d));

    await new Promise((r) => setTimeout(r, 500));
    const beforeNarr = narrations.length;
    const beforeHead = headers.length;

    // Move north (entry → corridor)
    client.send(MessageTypes.COMMAND, { verb: 'go', args: ['north'] });
    await new Promise((r) => setTimeout(r, 500));

    const moveNarrations = narrations.slice(beforeNarr);
    expect(moveNarrations.length).toBeGreaterThan(0);
    expect(moveNarrations[0]!.text).toContain('Flooded Corridor');

    const newHeaders = headers.slice(beforeHead);
    expect(newHeaders.length).toBeGreaterThan(0);
    expect(newHeaders[0]!.roomName).toBe('Flooded Corridor');

    await client.leave();
  });

  it('should handle direction alias via message', async () => {
    const room = await colyseus.createRoom('shard', { useTestGraph: true });
    const client = await colyseus.connectTo(room);

    const narrations: NarrateMessage[] = [];
    client.onMessage(MessageTypes.NARRATE, (d: NarrateMessage) => narrations.push(d));

    await new Promise((r) => setTimeout(r, 500));
    const beforeCount = narrations.length;

    // Use 'n' alias — parser should expand to 'go north'
    client.send(MessageTypes.COMMAND, { verb: 'n', args: [] });
    await new Promise((r) => setTimeout(r, 500));

    const moveNarrations = narrations.slice(beforeCount);
    expect(moveNarrations.length).toBeGreaterThan(0);
    expect(moveNarrations[0]!.text).toContain('Flooded Corridor');

    await client.leave();
  });

  it('should handle take and inventory commands', async () => {
    const room = await colyseus.createRoom('shard', { useTestGraph: true });
    const client = await colyseus.connectTo(room);

    const narrations: NarrateMessage[] = [];
    client.onMessage(MessageTypes.NARRATE, (d: NarrateMessage) => narrations.push(d));

    await new Promise((r) => setTimeout(r, 500));
    let beforeCount = narrations.length;

    // Take the torch from entry room
    client.send(MessageTypes.COMMAND, { verb: 'take', args: ['torch'] });
    await new Promise((r) => setTimeout(r, 500));

    const takeNarrations = narrations.slice(beforeCount);
    expect(takeNarrations.length).toBeGreaterThan(0);
    expect(takeNarrations[0]!.text).toContain('pick up');

    beforeCount = narrations.length;

    // Check inventory
    client.send(MessageTypes.COMMAND, { verb: 'i', args: [] });
    await new Promise((r) => setTimeout(r, 500));

    const invNarrations = narrations.slice(beforeCount);
    expect(invNarrations.length).toBeGreaterThan(0);
    expect(invNarrations[0]!.text).toContain('battered torch');

    await client.leave();
  });

  it('should reject unknown commands with system narration', async () => {
    const room = await colyseus.createRoom('shard', { useTestGraph: true });
    const client = await colyseus.connectTo(room);

    const narrations: NarrateMessage[] = [];
    client.onMessage(MessageTypes.NARRATE, (d: NarrateMessage) => narrations.push(d));

    await new Promise((r) => setTimeout(r, 500));
    const beforeCount = narrations.length;

    client.send(MessageTypes.COMMAND, { verb: 'xyzzy', args: [] });
    await new Promise((r) => setTimeout(r, 500));

    const errorNarrations = narrations.slice(beforeCount);
    expect(errorNarrations.length).toBeGreaterThan(0);
    expect(errorNarrations[0]!.type).toBe('system');
    expect(errorNarrations[0]!.text).toContain('Unknown command');

    await client.leave();
  });
});
