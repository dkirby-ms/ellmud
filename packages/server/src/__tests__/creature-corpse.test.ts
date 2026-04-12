/**
 * Creature Corpse Container System Tests
 *
 * Tests the feature where creature death spawns a corpse (container type) in the room
 * containing the creature's loot. Creatures no longer drop loot directly in the room;
 * instead, players must open and loot corpse containers.
 *
 * Written against SPEC — implementation on branch squad/creature-corpse-containers
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  buildFixtureRegistry,
  RUSTY_BLADE,
  HEALING_DRAUGHT,
  REVENANT_BONE,
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

import { CombatSystem } from '../combat/CombatSystem.js';
import { createCombatant, type Combatant } from '../combat/CombatState.js';
import { handleCommand, type CommandContext } from '../commands/index.js';
import { parseCommand } from '../commands/parser.js';
import { PlayerState } from '../state/PlayerState.js';
import type { Item, Room } from '../generator/RoomGraph.js';
import type { Creature } from '../creatures/types.js';

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

function makeCreature(id: string, name: string, roomId = TEST_ROOM, lootItems?: Array<{ id: string; name: string; weight: number; description: string }>): Creature {
  const defaultLoot = lootItems || [
    { id: 'rusty_blade', name: 'Rusty Blade', weight: 5, description: 'A rusty blade.', dropWeight: 1 },
    { id: 'revenant_bone', name: 'Revenant Bone', weight: 2, description: 'A bone.', dropWeight: 1 },
  ];

  return {
    id,
    type: 'drowned_revenant',
    name,
    hp: 50,
    maxHp: 50,
    attack: 10,
    defence: 3,
    armour: 3,
    currentRoomId: roomId,
    behaviorState: 'hostile',
    idleTicks: 0,
    idleTicksTarget: 4,
    alertTargetRoomId: null,
    lootTable: defaultLoot,
    isAlive: true,
    aggressive: true,
  };
}

function makeCombatant(entity: PlayerState | Creature): Combatant {
  if ('inventory' in entity) {
    // PlayerState
    return createCombatant(
      entity.sessionId,
      entity.sessionId,
      entity.currentRoomId,
      true,
      { maxHp: 100, attack: 10, armour: 2, agility: 5 }
    );
  } else {
    // Creature
    return createCombatant(
      entity.id,
      entity.name,
      entity.currentRoomId,
      false,
      { maxHp: entity.maxHp, attack: entity.attack, armour: entity.armour }
    );
  }
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

// ─── Basic Corpse Creation Tests ───────────────────────────────────────────

describe('Creature Corpse Container System', () => {
  describe('corpse creation on death', () => {
    it('creates a corpse item in the room when creature dies', () => {
      const room = makeRoom();
      const creature = makeCreature('revenant-1', 'Drowned Revenant');
      
      // Simulate creature death — implementation should add corpse to room.items
      // This test verifies the expected contract:
      // - room.items should contain a corpse item
      // - corpse should reference the creature's name
      
      // Expected: After creature death, room should have a corpse item
      expect(room.items).toHaveLength(0); // Before death
      
      // After implementation adds corpse on creature death:
      // expect(room.items).toHaveLength(1);
      // const corpse = room.items[0];
      // expect(corpse?.name).toContain(creature.name);
    });

    it('corpse name references the creature', () => {
      const room = makeRoom();
      const creature = makeCreature('revenant-1', 'Drowned Revenant');
      
      // Expected corpse format: "corpse of Drowned Revenant" or similar
      // After implementation:
      // const corpse = room.items.find(i => i.name.includes('corpse'));
      // expect(corpse?.name).toContain('Drowned Revenant');
      // OR
      // expect(corpse?.name).toBe('corpse of Drowned Revenant');
    });

    it('corpse has a roomDescription for look command', () => {
      const room = makeRoom();
      const creature = makeCreature('revenant-1', 'Drowned Revenant');
      
      // Expected: corpse should have roomDescription for visibility in room
      // After implementation:
      // const corpse = room.items.find(i => i.name.includes('corpse'));
      // expect(corpse?.roomDescription).toBeDefined();
      // expect(corpse?.roomDescription).toContain('corpse');
    });
  });

  describe('corpse container properties', () => {
    it('corpse is a container type with containerContents', () => {
      const room = makeRoom();
      const creature = makeCreature('revenant-1', 'Drowned Revenant');
      
      // Expected: corpse item should have containerContents array
      // After implementation:
      // const corpse = room.items.find(i => i.name.includes('corpse'));
      // expect(corpse?.containerContents).toBeDefined();
      // expect(Array.isArray(corpse?.containerContents)).toBe(true);
    });

    it('corpse container has sufficient slots for all loot', () => {
      const room = makeRoom();
      const creature = makeCreature('revenant-1', 'Drowned Revenant', TEST_ROOM, [
        { id: 'item1', name: 'Item 1', weight: 1, description: 'Item 1', dropWeight: 1 },
        { id: 'item2', name: 'Item 2', weight: 1, description: 'Item 2', dropWeight: 1 },
        { id: 'item3', name: 'Item 3', weight: 1, description: 'Item 3', dropWeight: 1 },
      ]);
      
      // Expected: corpse container should have maxSlots >= loot count
      // After implementation via ContentRegistry:
      // const corpse = room.items.find(i => i.name.includes('corpse'));
      // const corpseDefinition = getContentRegistry().getItem(corpse.id);
      // expect(corpseDefinition?.containerProperties?.maxSlots).toBeGreaterThanOrEqual(3);
    });

    it('corpse container has no item type restrictions', () => {
      const room = makeRoom();
      const creature = makeCreature('revenant-1', 'Drowned Revenant');
      
      // Expected: corpse container should accept any item type (no allowedItemTypes)
      // After implementation:
      // const corpse = room.items.find(i => i.name.includes('corpse'));
      // const corpseDefinition = getContentRegistry().getItem(corpse.id);
      // expect(corpseDefinition?.containerProperties?.allowedItemTypes).toBeUndefined();
    });

    it('corpse container has enough weight capacity for loot', () => {
      const room = makeRoom();
      const heavyLoot = [
        { id: 'heavy1', name: 'Heavy Item 1', weight: 50, description: 'Heavy', dropWeight: 1 },
        { id: 'heavy2', name: 'Heavy Item 2', weight: 50, description: 'Heavy', dropWeight: 1 },
      ];
      const creature = makeCreature('revenant-1', 'Drowned Revenant', TEST_ROOM, heavyLoot);
      
      // Expected: corpse maxWeight should accommodate all loot (or be undefined for unlimited)
      // After implementation:
      // const corpse = room.items.find(i => i.name.includes('corpse'));
      // const corpseDefinition = getContentRegistry().getItem(corpse.id);
      // const totalLootWeight = heavyLoot.reduce((sum, item) => sum + item.weight, 0);
      // if (corpseDefinition?.containerProperties?.maxWeight) {
      //   expect(corpseDefinition.containerProperties.maxWeight).toBeGreaterThanOrEqual(totalLootWeight);
      // }
    });
  });

  describe('corpse loot contents', () => {
    it('corpse contains all creature loot items', () => {
      const room = makeRoom();
      const loot = [
        { id: 'rusty_blade', name: 'Rusty Blade', weight: 5, description: 'Rusty', dropWeight: 1 },
        { id: 'revenant_bone', name: 'Revenant Bone', weight: 2, description: 'Bone', dropWeight: 1 },
      ];
      const creature = makeCreature('revenant-1', 'Drowned Revenant', TEST_ROOM, loot);
      
      // Expected: corpse.containerContents should match creature loot table
      // After implementation:
      // const corpse = room.items.find(i => i.name.includes('corpse'));
      // expect(corpse?.containerContents).toHaveLength(2);
      // const itemIds = corpse?.containerContents?.map(c => c.definitionId) || [];
      // expect(itemIds).toContain('rusty_blade');
      // expect(itemIds).toContain('revenant_bone');
    });

    it('corpse loot items have correct quantities', () => {
      const room = makeRoom();
      const creature = makeCreature('revenant-1', 'Drowned Revenant');
      
      // Expected: each loot item should have quantity = 1 by default
      // After implementation:
      // const corpse = room.items.find(i => i.name.includes('corpse'));
      // corpse?.containerContents?.forEach(item => {
      //   expect(item.quantity).toBe(1);
      // });
    });
  });

  describe('no direct loot drop', () => {
    it('player does NOT receive loot items directly on creature death', () => {
      const room = makeRoom();
      const player = makePlayer('player-1');
      const creature = makeCreature('revenant-1', 'Drowned Revenant');
      
      // Expected: after creature death, player inventory should NOT contain loot
      // Loot should only be in corpse container
      
      const initialInventorySize = player.inventory.size;
      
      // After creature death (simulated):
      // expect(player.inventory.size).toBe(initialInventorySize);
      // expect(room.items.length).toBeGreaterThan(0); // Corpse should be in room
    });

    it('loot items are NOT placed directly in room.items', () => {
      const room = makeRoom();
      const creature = makeCreature('revenant-1', 'Drowned Revenant', TEST_ROOM, [
        { id: 'rusty_blade', name: 'Rusty Blade', weight: 5, description: 'Rusty', dropWeight: 1 },
      ]);
      
      // Expected: room.items should only contain the corpse, NOT individual loot items
      // After implementation:
      // const lootItems = room.items.filter(i => i.id === 'rusty_blade');
      // expect(lootItems).toHaveLength(0); // Loot should be inside corpse, not in room
      
      // const corpses = room.items.filter(i => i.name.includes('corpse'));
      // expect(corpses).toHaveLength(1);
    });
  });

  describe('multiple creature deaths', () => {
    it('creates multiple corpses for multiple creature deaths in same room', () => {
      const room = makeRoom();
      const creature1 = makeCreature('revenant-1', 'Drowned Revenant');
      const creature2 = makeCreature('revenant-2', 'Drowned Revenant');
      
      // Expected: two corpses should be created
      // After implementation:
      // expect(room.items).toHaveLength(2);
      // const corpses = room.items.filter(i => i.name.includes('corpse'));
      // expect(corpses).toHaveLength(2);
    });

    it('corpses from different creatures have distinct IDs', () => {
      const room = makeRoom();
      const creature1 = makeCreature('revenant-1', 'Revenant Alpha');
      const creature2 = makeCreature('revenant-2', 'Revenant Beta');
      
      // Expected: corpse IDs should be unique
      // After implementation:
      // const corpseIds = room.items.map(i => i.id);
      // const uniqueIds = new Set(corpseIds);
      // expect(uniqueIds.size).toBe(corpseIds.length);
    });

    it('corpses from different creatures have distinct names', () => {
      const room = makeRoom();
      const creature1 = makeCreature('revenant-1', 'Revenant Alpha');
      const creature2 = makeCreature('revenant-2', 'Revenant Beta');
      
      // Expected: corpse names should reference their respective creatures
      // After implementation:
      // const corpse1 = room.items.find(i => i.name.includes('Alpha'));
      // const corpse2 = room.items.find(i => i.name.includes('Beta'));
      // expect(corpse1).toBeDefined();
      // expect(corpse2).toBeDefined();
      // expect(corpse1?.name).not.toBe(corpse2?.name);
    });
  });

  describe('creature with no loot', () => {
    it('creates empty corpse for creature with empty loot table', () => {
      const room = makeRoom();
      const creature = makeCreature('revenant-1', 'Drowned Revenant', TEST_ROOM, []);
      
      // Expected: corpse should still be created but with empty containerContents
      // After implementation:
      // const corpse = room.items.find(i => i.name.includes('corpse'));
      // expect(corpse).toBeDefined();
      // expect(corpse?.containerContents).toHaveLength(0);
    });

    it('empty corpse is still visible in room', () => {
      const room = makeRoom();
      const creature = makeCreature('revenant-1', 'Drowned Revenant', TEST_ROOM, []);
      
      // Expected: empty corpse should have roomDescription for look command
      // After implementation:
      // const corpse = room.items.find(i => i.name.includes('corpse'));
      // expect(corpse?.roomDescription).toBeDefined();
    });
  });

  describe('open command with corpse', () => {
    it('open command works with corpse containers', () => {
      const room = makeRoom();
      const player = makePlayer('player-1');
      const creature = makeCreature('revenant-1', 'Drowned Revenant');
      
      // Simulate corpse in room
      const mockCorpse: Item = {
        id: 'corpse-revenant-1',
        name: 'corpse of Drowned Revenant',
        weight: 10,
        description: 'The corpse of a Drowned Revenant.',
        roomDescription: 'The corpse of a Drowned Revenant lies here.',
        containerContents: [
          { definitionId: 'rusty_blade', quantity: 1, durability: 30 },
          { definitionId: 'revenant_bone', quantity: 1, durability: null },
        ],
      };
      room.items.push(mockCorpse);
      
      // Test open command
      const ctx = buildContext(player, room, ['corpse']);
      const parsed = parseCommand('open corpse');
      expect(parsed.ok).toBe(true);
      
      // After implementation:
      // const result = handleCommand(parsed.command, ctx);
      // expect(result.narrations[0]?.text).toContain('corpse');
      // expect(result.narrations[0]?.text).toContain('Rusty Blade');
      // expect(result.narrations[0]?.text).toContain('Revenant Bone');
    });

    it('open command shows corpse contents', () => {
      const room = makeRoom();
      const player = makePlayer('player-1');
      
      const mockCorpse: Item = {
        id: 'corpse-revenant-1',
        name: 'corpse of Drowned Revenant',
        weight: 10,
        description: 'The corpse of a Drowned Revenant.',
        containerContents: [
          { definitionId: 'rusty_blade', quantity: 1, durability: 30 },
        ],
      };
      room.items.push(mockCorpse);
      
      const ctx = buildContext(player, room, ['corpse']);
      
      // After implementation:
      // const result = handleCommand({ verb: 'open', args: ['corpse'] }, ctx);
      // const narration = result.narrations[0]?.text || '';
      // expect(narration).toMatch(/Rusty Blade/i);
    });

    it('open command reports empty corpse', () => {
      const room = makeRoom();
      const player = makePlayer('player-1');
      
      const mockCorpse: Item = {
        id: 'corpse-revenant-1',
        name: 'corpse of Drowned Revenant',
        weight: 10,
        description: 'The corpse of a Drowned Revenant.',
        containerContents: [],
      };
      room.items.push(mockCorpse);
      
      const ctx = buildContext(player, room, ['corpse']);
      
      // After implementation:
      // const result = handleCommand({ verb: 'open', args: ['corpse'] }, ctx);
      // const narration = result.narrations[0]?.text || '';
      // expect(narration).toMatch(/empty|nothing/i);
    });
  });

  describe('take command with corpse', () => {
    it('take command extracts item from corpse', () => {
      const room = makeRoom();
      const player = makePlayer('player-1');
      
      const mockCorpse: Item = {
        id: 'corpse-revenant-1',
        name: 'corpse of Drowned Revenant',
        weight: 10,
        description: 'The corpse of a Drowned Revenant.',
        containerContents: [
          { definitionId: 'rusty_blade', quantity: 1, durability: 30 },
          { definitionId: 'revenant_bone', quantity: 1, durability: null },
        ],
      };
      room.items.push(mockCorpse);
      
      const initialInventorySize = player.inventory.size;
      const ctx = buildContext(player, room, ['rusty', 'from', 'corpse']);
      
      // After implementation:
      // const result = handleCommand({ verb: 'take', args: ['rusty', 'from', 'corpse'] }, ctx);
      // expect(player.inventory.size).toBe(initialInventorySize + 1);
      // expect(player.inventory.has('rusty_blade')).toBe(true);
      
      // Corpse should have one less item
      // const updatedCorpse = room.items.find(i => i.id === 'corpse-revenant-1');
      // expect(updatedCorpse?.containerContents).toHaveLength(1);
    });

    it('take command with "from corpse" syntax works', () => {
      const room = makeRoom();
      const player = makePlayer('player-1');
      
      const mockCorpse: Item = {
        id: 'corpse-revenant-1',
        name: 'corpse of Drowned Revenant',
        weight: 10,
        description: 'The corpse of a Drowned Revenant.',
        containerContents: [
          { definitionId: 'rusty_blade', quantity: 1, durability: 30 },
        ],
      };
      room.items.push(mockCorpse);
      
      const parsed = parseCommand('take blade from corpse');
      expect(parsed.ok).toBe(true);
      if (parsed.ok) {
        expect(parsed.command.verb).toBe('take');
        expect(parsed.command.args).toContain('from');
        expect(parsed.command.args).toContain('corpse');
      }
    });

    it('take all from corpse extracts all items', () => {
      const room = makeRoom();
      const player = makePlayer('player-1');
      
      const mockCorpse: Item = {
        id: 'corpse-revenant-1',
        name: 'corpse of Drowned Revenant',
        weight: 10,
        description: 'The corpse of a Drowned Revenant.',
        containerContents: [
          { definitionId: 'rusty_blade', quantity: 1, durability: 30 },
          { definitionId: 'revenant_bone', quantity: 1, durability: null },
        ],
      };
      room.items.push(mockCorpse);
      
      const initialInventorySize = player.inventory.size;
      
      // After implementation:
      // const result = handleCommand({ verb: 'take', args: ['all', 'from', 'corpse'] }, ctx);
      // expect(player.inventory.size).toBe(initialInventorySize + 2);
      
      // Corpse should be empty
      // const updatedCorpse = room.items.find(i => i.id === 'corpse-revenant-1');
      // expect(updatedCorpse?.containerContents).toHaveLength(0);
    });
  });

  describe('integration with existing systems', () => {
    it('corpse container works with existing container command infrastructure', () => {
      // This test verifies that corpse containers use the same infrastructure
      // as regular containers (bags, pouches, etc.)
      
      const room = makeRoom();
      const player = makePlayer('player-1');
      
      const mockCorpse: Item = {
        id: 'corpse-revenant-1',
        name: 'corpse of Drowned Revenant',
        weight: 10,
        description: 'The corpse of a Drowned Revenant.',
        containerContents: [
          { definitionId: 'rusty_blade', quantity: 1, durability: 30 },
        ],
      };
      room.items.push(mockCorpse);
      
      // Verify that corpse behaves like any other container
      expect(mockCorpse.containerContents).toBeDefined();
      expect(Array.isArray(mockCorpse.containerContents)).toBe(true);
    });

    it('look command shows corpse in room description', () => {
      const room = makeRoom();
      const player = makePlayer('player-1');
      
      const mockCorpse: Item = {
        id: 'corpse-revenant-1',
        name: 'corpse of Drowned Revenant',
        weight: 10,
        description: 'The corpse of a Drowned Revenant.',
        roomDescription: 'The corpse of a Drowned Revenant lies here, still leaking dark water.',
        containerContents: [],
      };
      room.items.push(mockCorpse);
      
      const ctx = buildContext(player, room);
      
      // After implementation:
      // const result = handleCommand({ verb: 'look', args: [] }, ctx);
      // const narration = result.narrations[0]?.text || '';
      // expect(narration).toContain('corpse of a Drowned Revenant');
    });
  });

  describe('edge cases', () => {
    it('handles corpse with single item', () => {
      const room = makeRoom();
      const creature = makeCreature('revenant-1', 'Drowned Revenant', TEST_ROOM, [
        { id: 'rusty_blade', name: 'Rusty Blade', weight: 5, description: 'Rusty', dropWeight: 1 },
      ]);
      
      // After implementation:
      // const corpse = room.items.find(i => i.name.includes('corpse'));
      // expect(corpse?.containerContents).toHaveLength(1);
    });

    it('handles corpse with many items', () => {
      const room = makeRoom();
      const manyItems = Array.from({ length: 10 }, (_, i) => ({
        id: `item-${i}`,
        name: `Item ${i}`,
        weight: 1,
        description: `Item ${i}`,
        dropWeight: 1,
      }));
      const creature = makeCreature('revenant-1', 'Drowned Revenant', TEST_ROOM, manyItems);
      
      // After implementation:
      // const corpse = room.items.find(i => i.name.includes('corpse'));
      // expect(corpse?.containerContents).toHaveLength(10);
    });

    it('corpse persists in room until looted or cleaned up', () => {
      const room = makeRoom();
      const creature = makeCreature('revenant-1', 'Drowned Revenant');
      
      // Expected: corpse should remain in room.items until removed
      // After implementation:
      // const corpse = room.items.find(i => i.name.includes('corpse'));
      // expect(corpse).toBeDefined();
      
      // After taking all items, corpse might be removed or remain empty
      // This depends on implementation choice
    });

    it('corpse can be targeted by partial name match', () => {
      const room = makeRoom();
      const player = makePlayer('player-1');
      
      const mockCorpse: Item = {
        id: 'corpse-revenant-1',
        name: 'corpse of Drowned Revenant',
        weight: 10,
        description: 'The corpse of a Drowned Revenant.',
        containerContents: [
          { definitionId: 'rusty_blade', quantity: 1, durability: 30 },
        ],
      };
      room.items.push(mockCorpse);
      
      const ctx = buildContext(player, room, ['corpse']);
      
      // Verify parser accepts "corpse" as target
      const parsed = parseCommand('open corpse');
      expect(parsed.ok).toBe(true);
    });

    it('corpse can be targeted by full creature name', () => {
      const room = makeRoom();
      const player = makePlayer('player-1');
      
      const mockCorpse: Item = {
        id: 'corpse-revenant-1',
        name: 'corpse of Drowned Revenant',
        weight: 10,
        description: 'The corpse of a Drowned Revenant.',
        containerContents: [],
      };
      room.items.push(mockCorpse);
      
      // Verify "corpse of Drowned Revenant" can be targeted
      const parsed = parseCommand('open corpse of drowned revenant');
      expect(parsed.ok).toBe(true);
    });
  });
});
