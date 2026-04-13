/**
 * Creature Corpse Container System Tests
 *
 * Tests the feature where creature death spawns a corpse (container type) in the room
 * containing the creature's loot. Creatures no longer drop loot directly in the room;
 * instead, players must open and loot corpse containers.
 *
 * Tests cover: corpse creation, loot contents, TTL/decay, open/take/loot commands,
 * and group loot access.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  buildFixtureRegistry,
} from './helpers/item-fixtures.js';

// Mock ContentRegistry for item lookups
const FIXTURE_MAP = buildFixtureRegistry();
vi.mock('../content/index.js', () => ({
  getContentRegistry: () => ({
    isInitialized: () => true,
    getItem: (id: string) => FIXTURE_MAP.get(id),
    getAllItems: () => Array.from(FIXTURE_MAP.values()),
  }),
}));

import { handleCommand, type CommandContext } from '../commands/index.js';
import { parseCommand } from '../commands/parser.js';
import { PlayerState } from '../state/PlayerState.js';
import type { Item, Room } from '../generator/RoomGraph.js';

// ─── Test Helpers ───────────────────────────────────────────────────────────

const TEST_ROOM = 'test-room';

function makeRoom(id = TEST_ROOM): Room {
  return {
    id,
    name: 'Test Chamber',
    description: 'A test chamber.',
    exits: new Map(),
    items: [],
  };
}

function makePlayer(id: string, roomId = TEST_ROOM): PlayerState {
  return new PlayerState(id, roomId, 100);
}

/** Build a corpse Item matching the format produced by syncCreaturesAfterCombat. */
function makeCorpseItem(
  creatureId: string,
  creatureName: string,
  loot: Array<{ definitionId: string; quantity: number; durability: number | null }> = [],
  overrides: Partial<Item> = {},
): Item {
  return {
    id: `corpse-${creatureId}`,
    name: `corpse of ${creatureName}`,
    weight: 10,
    description: `The remains of a ${creatureName}.`,
    roomDescription: `The corpse of a ${creatureName} lies here.`,
    containerContents: loot,
    createdAt: Date.now(),
    ttlSeconds: 300,
    noTake: true,
    ...overrides,
  };
}

function buildContext(player: PlayerState, room: Room, args: string[] = []): CommandContext {
  return {
    player,
    room,
    args,
    resolveRoom: () => room,
    otherPlayersInRoom: [],
    stability: 1.0,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Creature Corpse Container System', () => {

  // ── 1. Creature corpse creation ─────────────────────────────────────────

  describe('creature corpse creation', () => {
    it('corpse id follows the format corpse-{creatureId}', () => {
      const corpse = makeCorpseItem('creature-revenant-1', 'Drowned Revenant');
      expect(corpse.id).toBe('corpse-creature-revenant-1');
    });

    it('corpse name follows the format "corpse of {creatureName}"', () => {
      const corpse = makeCorpseItem('creature-revenant-1', 'Drowned Revenant');
      expect(corpse.name).toBe('corpse of Drowned Revenant');
    });

    it('corpse has containerContents array', () => {
      const corpse = makeCorpseItem('creature-revenant-1', 'Drowned Revenant', [
        { definitionId: 'rusty_blade', quantity: 1, durability: null },
      ]);
      expect(corpse.containerContents).toBeDefined();
      expect(Array.isArray(corpse.containerContents)).toBe(true);
      expect(corpse.containerContents).toHaveLength(1);
    });

    it('corpse has createdAt and ttlSeconds (300 for creatures)', () => {
      const corpse = makeCorpseItem('creature-revenant-1', 'Drowned Revenant');
      expect(corpse.createdAt).toBeDefined();
      expect(typeof corpse.createdAt).toBe('number');
      expect(corpse.ttlSeconds).toBe(300);
    });

    it('corpse has roomDescription for look command', () => {
      const corpse = makeCorpseItem('creature-revenant-1', 'Drowned Revenant');
      expect(corpse.roomDescription).toBeDefined();
      expect(corpse.roomDescription).toContain('corpse');
      expect(corpse.roomDescription).toContain('Drowned Revenant');
    });

    it('corpse appears in room.items when pushed', () => {
      const room = makeRoom();
      expect(room.items).toHaveLength(0);

      const corpse = makeCorpseItem('creature-revenant-1', 'Drowned Revenant', [
        { definitionId: 'rusty_blade', quantity: 1, durability: null },
      ]);
      room.items.push(corpse);

      expect(room.items).toHaveLength(1);
      expect(room.items[0]!.id).toBe('corpse-creature-revenant-1');
      expect(room.items[0]!.name).toContain('Drowned Revenant');
    });
  });

  // ── 2. Player corpse creation ───────────────────────────────────────────

  describe('player corpse creation', () => {
    it('player corpse has correct name format', () => {
      const playerCorpse = makeCorpseItem('player-1', 'Drizzt', [
        { definitionId: 'rusty_blade', quantity: 1, durability: 30 },
      ], { ttlSeconds: 600 });

      expect(playerCorpse.name).toBe('corpse of Drizzt');
    });

    it('player corpse has ttlSeconds of 600', () => {
      const playerCorpse = makeCorpseItem('player-1', 'Drizzt', [], { ttlSeconds: 600 });
      expect(playerCorpse.ttlSeconds).toBe(600);
    });

    it('player corpse contains the dropped items', () => {
      const droppedItems = [
        { definitionId: 'rusty_blade', quantity: 1, durability: 30 },
        { definitionId: 'revenant_bone', quantity: 1, durability: null },
      ];
      const playerCorpse = makeCorpseItem('player-1', 'Drizzt', droppedItems, { ttlSeconds: 600 });

      expect(playerCorpse.containerContents).toHaveLength(2);
      const ids = playerCorpse.containerContents!.map(c => c.definitionId);
      expect(ids).toContain('rusty_blade');
      expect(ids).toContain('revenant_bone');
    });

    it('player corpse appears in room.items', () => {
      const room = makeRoom();
      const playerCorpse = makeCorpseItem('player-1', 'Drizzt', [
        { definitionId: 'rusty_blade', quantity: 1, durability: 30 },
      ], { ttlSeconds: 600 });
      room.items.push(playerCorpse);

      expect(room.items).toHaveLength(1);
      expect(room.items[0]!.name).toBe('corpse of Drizzt');
    });
  });

  // ── 3. Loot contents ────────────────────────────────────────────────────

  describe('loot contents', () => {
    it('corpse containerContents matches creature loot table output', () => {
      const loot = [
        { definitionId: 'rusty_blade', quantity: 1, durability: null },
        { definitionId: 'revenant_bone', quantity: 1, durability: null },
      ];
      const corpse = makeCorpseItem('creature-revenant-1', 'Drowned Revenant', loot);

      expect(corpse.containerContents).toHaveLength(2);
      expect(corpse.containerContents![0]!.definitionId).toBe('rusty_blade');
      expect(corpse.containerContents![1]!.definitionId).toBe('revenant_bone');
    });

    it('loot items have valid definitionId and quantity', () => {
      const loot = [
        { definitionId: 'rusty_blade', quantity: 1, durability: 30 },
        { definitionId: 'revenant_bone', quantity: 1, durability: null },
      ];
      const corpse = makeCorpseItem('creature-revenant-1', 'Drowned Revenant', loot);

      for (const item of corpse.containerContents!) {
        expect(item.definitionId).toBeTruthy();
        expect(item.quantity).toBeGreaterThanOrEqual(1);
      }
    });

    it('loot items are inside corpse, not loose in room.items', () => {
      const room = makeRoom();
      const corpse = makeCorpseItem('creature-revenant-1', 'Drowned Revenant', [
        { definitionId: 'rusty_blade', quantity: 1, durability: null },
      ]);
      room.items.push(corpse);

      const looseBlades = room.items.filter(i => i.id === 'rusty_blade');
      expect(looseBlades).toHaveLength(0);

      const corpses = room.items.filter(i => i.id.startsWith('corpse-'));
      expect(corpses).toHaveLength(1);
      expect(corpses[0]!.containerContents).toHaveLength(1);
    });

    it('empty loot table produces corpse with empty containerContents', () => {
      const corpse = makeCorpseItem('creature-revenant-1', 'Drowned Revenant', []);
      expect(corpse.containerContents).toHaveLength(0);
    });
  });

  // ── 4. TTL / decay ──────────────────────────────────────────────────────

  describe('TTL / decay', () => {
    /**
     * Simulates ZoneRoom.tickCorpseDecay() logic: remove items where
     * (now - createdAt) / 1000 >= ttlSeconds.
     */
    function tickDecay(room: Room): void {
      const now = Date.now();
      room.items = room.items.filter(item => {
        if (item.createdAt !== undefined && item.ttlSeconds !== undefined) {
          const age = (now - item.createdAt) / 1000;
          return age < item.ttlSeconds;
        }
        return true;
      });
    }

    it('removes a corpse whose TTL has expired', () => {
      const room = makeRoom();
      const corpse = makeCorpseItem('creature-revenant-1', 'Drowned Revenant', [
        { definitionId: 'rusty_blade', quantity: 1, durability: null },
      ]);
      corpse.createdAt = Date.now() - 301_000; // 301 seconds ago, past 300s TTL
      room.items.push(corpse);

      tickDecay(room);

      expect(room.items).toHaveLength(0);
    });

    it('keeps a corpse whose TTL has not expired', () => {
      const room = makeRoom();
      const corpse = makeCorpseItem('creature-revenant-1', 'Drowned Revenant', [
        { definitionId: 'rusty_blade', quantity: 1, durability: null },
      ]);
      // created just now — well within 300s TTL
      room.items.push(corpse);

      tickDecay(room);

      expect(room.items).toHaveLength(1);
      expect(room.items[0]!.id).toBe('corpse-creature-revenant-1');
    });

    it('decays multiple corpses independently', () => {
      const room = makeRoom();

      const expiredCorpse = makeCorpseItem('creature-a', 'Zombie', [
        { definitionId: 'rusty_blade', quantity: 1, durability: null },
      ]);
      expiredCorpse.createdAt = Date.now() - 400_000; // expired

      const freshCorpse = makeCorpseItem('creature-b', 'Skeleton', [
        { definitionId: 'revenant_bone', quantity: 1, durability: null },
      ]);
      // freshCorpse.createdAt is Date.now() — still alive

      room.items.push(expiredCorpse, freshCorpse);
      expect(room.items).toHaveLength(2);

      tickDecay(room);

      expect(room.items).toHaveLength(1);
      expect(room.items[0]!.id).toBe('corpse-creature-b');
    });

    it('does not decay items without TTL fields', () => {
      const room = makeRoom();
      const normalItem: Item = {
        id: 'torch',
        name: 'battered torch',
        weight: 1,
        description: 'A torch.',
      };
      room.items.push(normalItem);

      tickDecay(room);

      expect(room.items).toHaveLength(1);
      expect(room.items[0]!.id).toBe('torch');
    });
  });

  // ── 5. Open / take commands ─────────────────────────────────────────────

  describe('open command with corpse', () => {
    it('open corpse lists its contents', () => {
      const room = makeRoom();
      const player = makePlayer('player-1');
      const corpse = makeCorpseItem('creature-revenant-1', 'Drowned Revenant', [
        { definitionId: 'rusty_blade', quantity: 1, durability: 30 },
        { definitionId: 'revenant_bone', quantity: 1, durability: null },
      ]);
      room.items.push(corpse);

      const ctx = buildContext(player, room, ['corpse']);
      const result = handleCommand('open', ctx);

      const text = result.narrations[0]?.text ?? '';
      expect(text).toContain('corpse of Drowned Revenant');
      expect(text).toContain('Rusty Blade');
      expect(text).toContain('Revenant Bone');
    });

    it('open corpse reports empty when no items remain', () => {
      const room = makeRoom();
      const player = makePlayer('player-1');
      const corpse = makeCorpseItem('creature-revenant-1', 'Drowned Revenant', []);
      room.items.push(corpse);

      const ctx = buildContext(player, room, ['corpse']);
      const result = handleCommand('open', ctx);

      const text = result.narrations[0]?.text ?? '';
      expect(text.toLowerCase()).toMatch(/empty/);
    });

    it('open command can target by partial name "corpse"', () => {
      const room = makeRoom();
      const player = makePlayer('player-1');
      const corpse = makeCorpseItem('creature-revenant-1', 'Drowned Revenant', [
        { definitionId: 'rusty_blade', quantity: 1, durability: null },
      ]);
      room.items.push(corpse);

      const ctx = buildContext(player, room, ['corpse']);
      const result = handleCommand('open', ctx);
      expect(result.narrations[0]?.text).toContain('Rusty Blade');
    });
  });

  describe('take command with corpse', () => {
    it('take <item> from corpse moves item to player inventory', () => {
      const room = makeRoom();
      const player = makePlayer('player-1');
      const corpse = makeCorpseItem('creature-revenant-1', 'Drowned Revenant', [
        { definitionId: 'rusty_blade', quantity: 1, durability: 30 },
        { definitionId: 'revenant_bone', quantity: 1, durability: null },
      ]);
      room.items.push(corpse);

      const initialSize = player.inventory.size;
      const ctx = buildContext(player, room, ['blade', 'from', 'corpse']);
      const result = handleCommand('take', ctx);

      expect(player.inventory.size).toBe(initialSize + 1);
      const text = result.narrations[0]?.text ?? '';
      expect(text).toContain('Rusty Blade');
    });

    it('take <item> from corpse removes it from containerContents', () => {
      const room = makeRoom();
      const player = makePlayer('player-1');
      const corpse = makeCorpseItem('creature-revenant-1', 'Drowned Revenant', [
        { definitionId: 'rusty_blade', quantity: 1, durability: 30 },
        { definitionId: 'revenant_bone', quantity: 1, durability: null },
      ]);
      room.items.push(corpse);

      const ctx = buildContext(player, room, ['blade', 'from', 'corpse']);
      handleCommand('take', ctx);

      const updatedCorpse = room.items.find(i => i.id === 'corpse-creature-revenant-1');
      expect(updatedCorpse?.containerContents).toHaveLength(1);
      expect(updatedCorpse?.containerContents![0]!.definitionId).toBe('revenant_bone');
    });

    it('take from corpse reports error for unknown item', () => {
      const room = makeRoom();
      const player = makePlayer('player-1');
      const corpse = makeCorpseItem('creature-revenant-1', 'Drowned Revenant', [
        { definitionId: 'rusty_blade', quantity: 1, durability: null },
      ]);
      room.items.push(corpse);

      const ctx = buildContext(player, room, ['potion', 'from', 'corpse']);
      const result = handleCommand('take', ctx);

      const text = result.narrations[0]?.text ?? '';
      expect(text.toLowerCase()).toMatch(/doesn't contain|not found|don't see/i);
    });

    it('parser correctly parses "take blade from corpse"', () => {
      const parsed = parseCommand('take blade from corpse');
      expect(parsed.ok).toBe(true);
      if (parsed.ok) {
        expect(parsed.command.verb).toBe('take');
        expect(parsed.command.args.join(' ')).toContain('from');
        expect(parsed.command.args.join(' ')).toContain('corpse');
      }
    });

    it('cannot pick up a non-empty corpse directly (must loot)', () => {
      const room = makeRoom();
      const player = makePlayer('player-1');
      const corpse = makeCorpseItem('creature-revenant-1', 'Drowned Revenant', [
        { definitionId: 'rusty_blade', quantity: 1, durability: null },
      ]);
      room.items.push(corpse);

      const ctx = buildContext(player, room, ['corpse']);
      const result = handleCommand('take', ctx);

      const text = result.narrations[0]?.text ?? '';
      expect(text.toLowerCase()).toMatch(/can't pick up/i);
      // Corpse should still be in the room
      expect(room.items).toHaveLength(1);
    });
  });

  describe('loot command with corpse', () => {
    it('loot corpse takes all items from corpse', () => {
      const room = makeRoom();
      const player = makePlayer('player-1');
      const corpse = makeCorpseItem('creature-revenant-1', 'Drowned Revenant', [
        { definitionId: 'rusty_blade', quantity: 1, durability: 30 },
        { definitionId: 'revenant_bone', quantity: 1, durability: null },
      ]);
      room.items.push(corpse);

      const initialSize = player.inventory.size;
      const ctx = buildContext(player, room, ['corpse']);
      const result = handleCommand('loot', ctx);

      expect(player.inventory.size).toBe(initialSize + 2);
      const text = result.narrations[0]?.text ?? '';
      expect(text).toContain('Rusty Blade');
      expect(text).toContain('Revenant Bone');
    });

    it('loot corpse adds items to player inventory', () => {
      const room = makeRoom();
      const player = makePlayer('player-1');
      const corpse = makeCorpseItem('creature-revenant-1', 'Drowned Revenant', [
        { definitionId: 'rusty_blade', quantity: 1, durability: 30 },
      ]);
      room.items.push(corpse);

      const initialSize = player.inventory.size;
      const ctx = buildContext(player, room, ['corpse']);
      const result = handleCommand('loot', ctx);

      expect(player.inventory.size).toBe(initialSize + 1);
      expect(result.narrations[0]?.text).toContain('Rusty Blade');
    });

    it('loot empty corpse reports it is empty', () => {
      const room = makeRoom();
      const player = makePlayer('player-1');
      const corpse = makeCorpseItem('creature-revenant-1', 'Drowned Revenant', []);
      room.items.push(corpse);

      const ctx = buildContext(player, room, ['corpse']);
      const result = handleCommand('loot', ctx);

      const text = result.narrations[0]?.text ?? '';
      expect(text.toLowerCase()).toMatch(/empty/);
    });

    it('loot with no corpses reports no corpses', () => {
      const room = makeRoom();
      const player = makePlayer('player-1');

      const ctx = buildContext(player, room, []);
      const result = handleCommand('loot', ctx);

      const text = result.narrations[0]?.text ?? '';
      expect(text.toLowerCase()).toMatch(/no corpses/);
    });

    it('loot <item> from corpse delegates to take', () => {
      const room = makeRoom();
      const player = makePlayer('player-1');
      const corpse = makeCorpseItem('creature-revenant-1', 'Drowned Revenant', [
        { definitionId: 'rusty_blade', quantity: 1, durability: 30 },
        { definitionId: 'revenant_bone', quantity: 1, durability: null },
      ]);
      room.items.push(corpse);

      const initialSize = player.inventory.size;
      const ctx = buildContext(player, room, ['blade', 'from', 'corpse']);
      const result = handleCommand('loot', ctx);

      expect(player.inventory.size).toBe(initialSize + 1);
      const text = result.narrations[0]?.text ?? '';
      expect(text).toContain('Rusty Blade');
    });
  });

  // ── 6. Group loot (multiple players) ────────────────────────────────────

  describe('group loot', () => {
    it('two players can loot from the same corpse', () => {
      const room = makeRoom();
      const player1 = makePlayer('player-1');
      const player2 = makePlayer('player-2');
      const corpse = makeCorpseItem('creature-revenant-1', 'Drowned Revenant', [
        { definitionId: 'rusty_blade', quantity: 1, durability: 30 },
        { definitionId: 'revenant_bone', quantity: 1, durability: null },
      ]);
      room.items.push(corpse);

      // Player 1 takes the blade
      const ctx1 = buildContext(player1, room, ['blade', 'from', 'corpse']);
      const r1 = handleCommand('take', ctx1);
      expect(r1.narrations[0]?.text).toContain('Rusty Blade');
      expect(player1.inventory.size).toBe(1);

      // Player 2 takes the bone
      const ctx2 = buildContext(player2, room, ['bone', 'from', 'corpse']);
      const r2 = handleCommand('take', ctx2);
      expect(r2.narrations[0]?.text).toContain('Revenant Bone');
      expect(player2.inventory.size).toBe(1);

      // Corpse should now be empty
      const updatedCorpse = room.items.find(i => i.id === 'corpse-creature-revenant-1');
      expect(updatedCorpse?.containerContents).toHaveLength(0);
    });

    it('second player can take from corpse after first player takes one item', () => {
      const room = makeRoom();
      const player1 = makePlayer('player-1');
      const player2 = makePlayer('player-2');
      const corpse = makeCorpseItem('creature-revenant-1', 'Drowned Revenant', [
        { definitionId: 'rusty_blade', quantity: 1, durability: 30 },
        { definitionId: 'revenant_bone', quantity: 1, durability: null },
      ]);
      room.items.push(corpse);

      // Player 1 takes the blade
      const ctx1 = buildContext(player1, room, ['blade', 'from', 'corpse']);
      handleCommand('take', ctx1);
      expect(player1.inventory.size).toBe(1);

      // Player 2 opens and still sees remaining item
      const ctx2 = buildContext(player2, room, ['corpse']);
      const result = handleCommand('open', ctx2);
      const text = result.narrations[0]?.text ?? '';
      expect(text).toContain('Revenant Bone');
    });
  });

  // ── 7. Multiple corpses ─────────────────────────────────────────────────

  describe('multiple corpses in same room', () => {
    it('two corpses from different creatures have distinct IDs', () => {
      const corpse1 = makeCorpseItem('creature-revenant-1', 'Revenant Alpha');
      const corpse2 = makeCorpseItem('creature-revenant-2', 'Revenant Beta');

      expect(corpse1.id).not.toBe(corpse2.id);
    });

    it('two corpses from different creatures have distinct names', () => {
      const corpse1 = makeCorpseItem('creature-revenant-1', 'Revenant Alpha');
      const corpse2 = makeCorpseItem('creature-revenant-2', 'Revenant Beta');

      expect(corpse1.name).not.toBe(corpse2.name);
      expect(corpse1.name).toContain('Alpha');
      expect(corpse2.name).toContain('Beta');
    });

    it('both corpses appear in room.items', () => {
      const room = makeRoom();
      room.items.push(makeCorpseItem('creature-a', 'Zombie'));
      room.items.push(makeCorpseItem('creature-b', 'Skeleton'));

      const corpses = room.items.filter(i => i.id.startsWith('corpse-'));
      expect(corpses).toHaveLength(2);
    });
  });
});
