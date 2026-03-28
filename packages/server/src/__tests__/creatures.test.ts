/**
 * Creature system tests — behavior tree, combat integration, spawning, loot.
 *
 * Covers Issue #7: Drowned Revenant creature type + AI behavior tree.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CreatureManager } from '../creatures/CreatureManager.js';
import { updateCreature, type CreatureWorldState } from '../creatures/behavior.js';
import { generateLoot } from '../creatures/loot.js';
import { DROWNED_REVENANT } from '../creatures/templates/drowned-revenant.js';
import type { Creature } from '../creatures/types.js';
import { CombatSystem } from '../combat/CombatSystem.js';
import { createCombatant } from '../combat/CombatState.js';
import { createPRNG } from '../shard/prng.js';
import type { Room, RoomGraph, RoomType, Direction } from '@ellmud/shared';

// ─── Test Helpers ─────────────────────────────────────────────────────────────

function makeRoom(id: string, type: RoomType, exits: [Direction, string][] = []): Room {
  return {
    id,
    name: `Room ${id}`,
    description: `Test room ${id}`,
    type,
    exits: new Map(exits),
    items: [],
    hazards: [],
  };
}

function makeTestRoomGraph(): RoomGraph {
  const rooms = new Map<string, Room>();

  rooms.set('entry-1', makeRoom('entry-1', 'entry', [['north', 'corridor-1']]));
  rooms.set('corridor-1', makeRoom('corridor-1', 'corridor', [['south', 'entry-1'], ['north', 'junction-1'], ['east', 'dead-end-1']]));
  rooms.set('junction-1', makeRoom('junction-1', 'junction', [['south', 'corridor-1'], ['north', 'corridor-2']]));
  rooms.set('dead-end-1', makeRoom('dead-end-1', 'dead_end', [['west', 'corridor-1']]));
  rooms.set('corridor-2', makeRoom('corridor-2', 'corridor', [['south', 'junction-1'], ['north', 'boss-1']]));
  rooms.set('boss-1', makeRoom('boss-1', 'boss', [['south', 'corridor-2'], ['north', 'extraction-1']]));
  rooms.set('extraction-1', makeRoom('extraction-1', 'extraction', [['south', 'boss-1']]));

  return {
    rooms,
    entryRoomIds: ['entry-1'],
    extractionRoomIds: ['extraction-1'],
    bossRoomId: 'boss-1',
    seed: 42,
    biome: 'flooded_crypt',
    tier: 1,
  };
}

function makeCreature(overrides: Partial<Creature> = {}): Creature {
  return {
    id: 'creature-test',
    type: 'drowned_revenant',
    name: 'Drowned Revenant',
    hp: 50,
    maxHp: 50,
    attack: 10,
    defence: 3,
    armour: 3,
    currentRoomId: 'corridor-1',
    behaviorState: 'idle',
    idleTicks: 0,
    idleTicksTarget: 4,
    alertTargetRoomId: null,
    lootTable: DROWNED_REVENANT.lootTable,
    isAlive: true,
    ...overrides,
  };
}

function makeWorldState(overrides: Partial<CreatureWorldState> = {}): CreatureWorldState {
  return {
    playersInRoom: new Map(),
    roomExits: new Map([
      ['entry-1', ['corridor-1']],
      ['corridor-1', ['entry-1', 'junction-1', 'dead-end-1']],
      ['junction-1', ['corridor-1', 'corridor-2']],
      ['dead-end-1', ['corridor-1']],
      ['corridor-2', ['junction-1', 'boss-1']],
      ['boss-1', ['corridor-2', 'extraction-1']],
      ['extraction-1', ['boss-1']],
    ]),
    noisyRooms: new Set(),
    ...overrides,
  };
}

// ─── Behavior Transition Tests ────────────────────────────────────────────────

describe('Creature Behavior Tree', () => {
  describe('idle state', () => {
    it('stays idle when no players or noise nearby', () => {
      const creature = makeCreature();
      const world = makeWorldState();

      const action = updateCreature(creature, world, 0.25);

      expect(creature.behaviorState).toBe('idle');
      expect(action.type).toBe('idle');
    });

    it('increments idle ticks each update', () => {
      const creature = makeCreature({ idleTicksTarget: 5 });
      const world = makeWorldState();

      updateCreature(creature, world, 0.25);
      expect(creature.idleTicks).toBe(1);

      updateCreature(creature, world, 0.25);
      expect(creature.idleTicks).toBe(2);
    });

    it('patrols to adjacent room when idle timer expires', () => {
      const creature = makeCreature({ idleTicks: 3, idleTicksTarget: 4 });
      const world = makeWorldState();

      const action = updateCreature(creature, world, 0.25);

      expect(action.type).toBe('patrol_move');
      expect(action.targetRoomId).toBeDefined();
      // Should be one of corridor-1's exits
      expect(['entry-1', 'junction-1', 'dead-end-1']).toContain(action.targetRoomId);
      expect(creature.idleTicks).toBe(0); // Reset after move
    });

    it('transitions to alert on noise in adjacent room', () => {
      const creature = makeCreature();
      const world = makeWorldState({ noisyRooms: new Set(['junction-1']) });

      updateCreature(creature, world, 0.25);

      expect(creature.behaviorState).toBe('alert');
      expect(creature.alertTargetRoomId).toBe('junction-1');
    });

    it('transitions to hostile when player enters same room', () => {
      const creature = makeCreature();
      const world = makeWorldState({
        playersInRoom: new Map([['corridor-1', ['player-1']]]),
      });

      const action = updateCreature(creature, world, 0.25);

      expect(creature.behaviorState).toBe('hostile');
      expect(action.type).toBe('combat_strike');
      expect(action.targetCombatantId).toBe('player-1');
    });
  });

  describe('alert state', () => {
    it('moves toward noise source', () => {
      const creature = makeCreature({
        behaviorState: 'alert',
        alertTargetRoomId: 'junction-1',
      });
      // Creature hasn't arrived yet — still in different room
      const world = makeWorldState({ noisyRooms: new Set(['junction-1']) });

      const action = updateCreature(creature, world, 0.25);

      expect(creature.behaviorState).toBe('alert');
      expect(action.type).toBe('alert_move');
      expect(action.targetRoomId).toBe('junction-1');
    });

    it('transitions to hostile when player found in same room', () => {
      const creature = makeCreature({ behaviorState: 'alert', alertTargetRoomId: 'corridor-1' });
      const world = makeWorldState({
        playersInRoom: new Map([['corridor-1', ['player-1']]]),
      });

      const action = updateCreature(creature, world, 0.25);

      expect(creature.behaviorState).toBe('hostile');
      expect(action.type).toBe('combat_strike');
    });

    it('returns to idle when arriving at target with no player', () => {
      const creature = makeCreature({
        behaviorState: 'alert',
        alertTargetRoomId: 'corridor-1', // Already at target
      });
      const world = makeWorldState();

      updateCreature(creature, world, 0.25);

      expect(creature.behaviorState).toBe('idle');
    });
  });

  describe('hostile state', () => {
    it('strikes first player in room (deterministic target)', () => {
      const creature = makeCreature({ behaviorState: 'hostile' });
      const world = makeWorldState({
        playersInRoom: new Map([['corridor-1', ['player-1', 'player-2']]]),
      });

      const action = updateCreature(creature, world, 0.25);

      expect(action.type).toBe('combat_strike');
      expect(action.targetCombatantId).toBe('player-1');
    });

    it('returns to idle when no players in room', () => {
      const creature = makeCreature({ behaviorState: 'hostile' });
      const world = makeWorldState(); // No players anywhere

      updateCreature(creature, world, 0.25);

      expect(creature.behaviorState).toBe('idle');
    });

    it('transitions to fleeing when HP at or below 25%', () => {
      const creature = makeCreature({ behaviorState: 'hostile', hp: 12 }); // 12/50 = 24%
      const world = makeWorldState({
        playersInRoom: new Map([['corridor-1', ['player-1']]]),
      });

      const action = updateCreature(creature, world, 0.25);

      expect(creature.behaviorState).toBe('fleeing');
      expect(action.type).toBe('combat_flee');
    });

    it('stays hostile above flee threshold', () => {
      const creature = makeCreature({ behaviorState: 'hostile', hp: 13 }); // 13/50 = 26%
      const world = makeWorldState({
        playersInRoom: new Map([['corridor-1', ['player-1']]]),
      });

      const action = updateCreature(creature, world, 0.25);

      expect(creature.behaviorState).toBe('hostile');
      expect(action.type).toBe('combat_strike');
    });
  });

  describe('fleeing state', () => {
    it('attempts to flee each tick', () => {
      const creature = makeCreature({ behaviorState: 'fleeing', hp: 10 });
      const world = makeWorldState({
        playersInRoom: new Map([['corridor-1', ['player-1']]]),
      });

      const action = updateCreature(creature, world, 0.25);

      expect(creature.behaviorState).toBe('fleeing');
      expect(action.type).toBe('combat_flee');
      expect(action.targetRoomId).toBeDefined();
    });

    it('dodges if cornered (no exits)', () => {
      const creature = makeCreature({ behaviorState: 'fleeing', hp: 10, currentRoomId: 'no-exits' });
      const world = makeWorldState({
        playersInRoom: new Map([['no-exits', ['player-1']]]),
        roomExits: new Map([['no-exits', []]]),
      });

      const action = updateCreature(creature, world, 0.25);

      expect(action.type).toBe('combat_dodge');
    });

    it('fleeing is terminal — never recovers in Phase 1', () => {
      const creature = makeCreature({ behaviorState: 'fleeing', hp: 50 }); // Full HP but still fleeing
      const world = makeWorldState();

      updateCreature(creature, world, 0.25);

      expect(creature.behaviorState).toBe('fleeing');
    });
  });

  describe('determinism', () => {
    it('same inputs produce same outputs', () => {
      const makeTestCreature = () => makeCreature({ idleTicks: 3, idleTicksTarget: 4 });
      const world = makeWorldState();

      const creature1 = makeTestCreature();
      const action1 = updateCreature(creature1, world, 0.25);

      const creature2 = makeTestCreature();
      const action2 = updateCreature(creature2, world, 0.25);

      expect(action1.type).toBe(action2.type);
      expect(action1.targetRoomId).toBe(action2.targetRoomId);
    });
  });
});

// ─── Combat Integration Tests ─────────────────────────────────────────────────

describe('Creature Combat Integration', () => {
  it('creature actions resolved by combat system like player actions', () => {
    const exitResolver = (roomId: string) => {
      if (roomId === 'corridor-1') return ['entry-1', 'junction-1'];
      return [];
    };

    const combat = new CombatSystem(exitResolver);
    const manager = new CreatureManager();
    const prng = createPRNG(42);
    const graph = makeTestRoomGraph();

    const spawned = manager.spawnCreatures(graph, DROWNED_REVENANT, prng);
    expect(spawned.length).toBeGreaterThan(0);

    const creature = spawned[0];
    const combatant = manager.toCombatant(creature);

    // Register creature as combatant
    combat.registerCombatant(combatant);

    // Register a player
    const player = createCombatant('player-1', 'Player', creature.currentRoomId, true, {
      maxHp: 100,
      attack: 10,
      defence: 5,
      armour: 2,
      agility: 5,
    });
    combat.registerCombatant(player);

    // Initiate combat
    const encId = combat.initiateCombat(player.id, combatant.id);
    expect(encId).not.toBeNull();

    // Submit creature's strike action (as creature AI would)
    combat.submitAction(combatant.id, 'strike', player.id);

    // Resolve tick
    const result = combat.resolveTick();

    // Both should have strike events
    expect(result.events.length).toBeGreaterThan(0);
    const creatureStrike = result.events.find(
      e => e.type === 'strike' && e.actorId === combatant.id,
    );
    expect(creatureStrike).toBeDefined();
    expect(creatureStrike!.damage).toBeGreaterThan(0);
  });

  it('creature HP syncs back after combat tick', () => {
    const combat = new CombatSystem(() => []);
    const manager = new CreatureManager();
    const prng = createPRNG(42);
    const graph = makeTestRoomGraph();

    const spawned = manager.spawnCreatures(graph, DROWNED_REVENANT, prng);
    const creature = spawned[0];
    const combatant = manager.toCombatant(creature);
    combat.registerCombatant(combatant);

    const player = createCombatant('player-1', 'Player', creature.currentRoomId, true, {
      maxHp: 100,
      attack: 15,
      defence: 5,
      armour: 2,
      agility: 5,
    });
    combat.registerCombatant(player);
    combat.initiateCombat(player.id, combatant.id);

    // Player strikes, creature dodges
    combat.submitAction(combatant.id, 'dodge');
    combat.resolveTick();

    // Sync HP back
    const updatedCombatant = combat.getCombatant(combatant.id)!;
    manager.syncFromCombat(updatedCombatant);

    const updatedCreature = manager.getCreature(creature.id)!;
    expect(updatedCreature.hp).toBeLessThan(creature.maxHp);
  });
});

// ─── Spawn Placement Tests ────────────────────────────────────────────────────

describe('Creature Spawning', () => {
  let manager: CreatureManager;
  let graph: RoomGraph;

  beforeEach(() => {
    manager = new CreatureManager();
    graph = makeTestRoomGraph();
  });

  it('spawns 3-5 Drowned Revenants', () => {
    const prng = createPRNG(42);
    const spawned = manager.spawnCreatures(graph, DROWNED_REVENANT, prng);

    expect(spawned.length).toBeGreaterThanOrEqual(3);
    expect(spawned.length).toBeLessThanOrEqual(5);
  });

  it('never spawns in entry rooms', () => {
    const prng = createPRNG(42);
    const spawned = manager.spawnCreatures(graph, DROWNED_REVENANT, prng);

    for (const creature of spawned) {
      expect(graph.entryRoomIds).not.toContain(creature.currentRoomId);
    }
  });

  it('never spawns in extraction rooms', () => {
    const prng = createPRNG(42);
    const spawned = manager.spawnCreatures(graph, DROWNED_REVENANT, prng);

    for (const creature of spawned) {
      expect(graph.extractionRoomIds).not.toContain(creature.currentRoomId);
    }
  });

  it('prefers corridor and dead_end rooms', () => {
    const prng = createPRNG(42);
    const spawned = manager.spawnCreatures(graph, DROWNED_REVENANT, prng);

    const preferredTypes = new Set(['corridor', 'dead_end']);
    for (const creature of spawned) {
      const room = graph.rooms.get(creature.currentRoomId)!;
      // With enough corridors/dead-ends available, all should be in preferred rooms
      expect(preferredTypes.has(room.type)).toBe(true);
    }
  });

  it('deterministic spawning with same seed', () => {
    const prng1 = createPRNG(42);
    const manager1 = new CreatureManager();
    const spawned1 = manager1.spawnCreatures(graph, DROWNED_REVENANT, prng1);

    const prng2 = createPRNG(42);
    const manager2 = new CreatureManager();
    const spawned2 = manager2.spawnCreatures(graph, DROWNED_REVENANT, prng2);

    expect(spawned1.length).toBe(spawned2.length);
    for (let i = 0; i < spawned1.length; i++) {
      expect(spawned1[i].currentRoomId).toBe(spawned2[i].currentRoomId);
      expect(spawned1[i].type).toBe(spawned2[i].type);
    }
  });

  it('creatures have correct Drowned Revenant stats', () => {
    const prng = createPRNG(42);
    const spawned = manager.spawnCreatures(graph, DROWNED_REVENANT, prng);

    for (const creature of spawned) {
      expect(creature.name).toBe('Drowned Revenant');
      expect(creature.maxHp).toBe(50);
      expect(creature.hp).toBe(50);
      expect(creature.attack).toBe(10);
      expect(creature.armour).toBe(3);
      expect(creature.type).toBe('drowned_revenant');
    }
  });

  it('each creature has a unique ID', () => {
    const prng = createPRNG(42);
    const spawned = manager.spawnCreatures(graph, DROWNED_REVENANT, prng);
    const ids = new Set(spawned.map(c => c.id));
    expect(ids.size).toBe(spawned.length);
  });
});

// ─── Loot Generation Tests ────────────────────────────────────────────────────

describe('Loot Generation', () => {
  it('generates loot from creature loot table on death', () => {
    const manager = new CreatureManager();
    const prng = createPRNG(42);
    const graph = makeTestRoomGraph();

    const spawned = manager.spawnCreatures(graph, DROWNED_REVENANT, prng);
    const creature = spawned[0];

    const loot = manager.removeCreature(creature.id);

    expect(loot.length).toBe(2);
    expect(loot[0].name).toBe('waterlogged bone');
    expect(loot[1].name).toBe('revenant essence');
  });

  it('loot items have unique IDs per creature', () => {
    const manager = new CreatureManager();
    const prng = createPRNG(42);
    const graph = makeTestRoomGraph();

    const spawned = manager.spawnCreatures(graph, DROWNED_REVENANT, prng);
    const loot1 = manager.removeCreature(spawned[0].id);
    const loot2 = manager.removeCreature(spawned[1].id);

    const allIds = [...loot1, ...loot2].map(l => l.id);
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(allIds.length);
  });

  it('dead creature returns no loot on second removal', () => {
    const manager = new CreatureManager();
    const prng = createPRNG(42);
    const graph = makeTestRoomGraph();

    const spawned = manager.spawnCreatures(graph, DROWNED_REVENANT, prng);
    manager.removeCreature(spawned[0].id);
    const secondLoot = manager.removeCreature(spawned[0].id);

    expect(secondLoot.length).toBe(0);
  });

  it('generateLoot returns correct item format', () => {
    const creature = makeCreature();
    const loot = generateLoot(creature);

    for (const item of loot) {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('weight');
      expect(item).toHaveProperty('description');
      expect(typeof item.id).toBe('string');
      expect(typeof item.name).toBe('string');
      expect(typeof item.weight).toBe('number');
    }
  });
});

// ─── CreatureManager Tick Tests ───────────────────────────────────────────────

describe('CreatureManager', () => {
  it('updateAll returns actions for all living creatures', () => {
    const manager = new CreatureManager();
    const prng = createPRNG(42);
    const graph = makeTestRoomGraph();

    manager.spawnCreatures(graph, DROWNED_REVENANT, prng);
    const world = makeWorldState();

    const actions = manager.updateAll(world);

    expect(actions.length).toBe(manager.getLivingCreatures().length);
  });

  it('getCreaturesInRoom returns creatures in specified room', () => {
    const manager = new CreatureManager();
    const prng = createPRNG(42);
    const graph = makeTestRoomGraph();

    const spawned = manager.spawnCreatures(graph, DROWNED_REVENANT, prng);
    const firstRoom = spawned[0].currentRoomId;

    const inRoom = manager.getCreaturesInRoom(firstRoom);
    expect(inRoom.length).toBeGreaterThan(0);
    for (const c of inRoom) {
      expect(c.currentRoomId).toBe(firstRoom);
    }
  });

  it('dead creatures are excluded from room queries', () => {
    const manager = new CreatureManager();
    const prng = createPRNG(42);
    const graph = makeTestRoomGraph();

    const spawned = manager.spawnCreatures(graph, DROWNED_REVENANT, prng);
    const firstRoom = spawned[0].currentRoomId;
    const countBefore = manager.getCreaturesInRoom(firstRoom).length;

    manager.removeCreature(spawned[0].id);

    const countAfter = manager.getCreaturesInRoom(firstRoom).length;
    expect(countAfter).toBe(countBefore - 1);
  });

  it('dead creatures are excluded from tick updates', () => {
    const manager = new CreatureManager();
    const prng = createPRNG(42);
    const graph = makeTestRoomGraph();

    manager.spawnCreatures(graph, DROWNED_REVENANT, prng);
    const allCount = manager.getAllCreatures().length;

    // Kill the first creature
    const creatures = manager.getAllCreatures();
    manager.removeCreature(creatures[0].id);

    const world = makeWorldState();
    const actions = manager.updateAll(world);

    expect(actions.length).toBe(allCount - 1);
  });

  it('toCombatant produces valid Combatant interface', () => {
    const manager = new CreatureManager();
    const prng = createPRNG(42);
    const graph = makeTestRoomGraph();

    const spawned = manager.spawnCreatures(graph, DROWNED_REVENANT, prng);
    const combatant = manager.toCombatant(spawned[0]);

    expect(combatant.id).toBe(spawned[0].id);
    expect(combatant.name).toBe('Drowned Revenant');
    expect(combatant.isPlayer).toBe(false);
    expect(combatant.hp).toBe(50);
    expect(combatant.maxHp).toBe(50);
    expect(combatant.attack).toBe(10);
    expect(combatant.armour).toBe(3);
    expect(combatant.roomId).toBe(spawned[0].currentRoomId);
  });

  it('patrol movement updates creature room', () => {
    const manager = new CreatureManager();
    const prng = createPRNG(42);
    const graph = makeTestRoomGraph();

    const spawned = manager.spawnCreatures(graph, DROWNED_REVENANT, prng);
    const creature = spawned[0];
    const originalRoom = creature.currentRoomId;

    // Force patrol by setting idle ticks near target
    creature.idleTicks = creature.idleTicksTarget - 1;

    const world = makeWorldState();
    const actions = manager.updateAll(world);

    // Find the action for our creature
    const patrolAction = actions.find(a => a.creatureId === creature.id && a.type === 'patrol_move');
    if (patrolAction) {
      // Creature should have moved
      expect(creature.currentRoomId).not.toBe(originalRoom);
      expect(creature.currentRoomId).toBe(patrolAction.targetRoomId);
    }
  });
});

// ─── Drowned Revenant Template Tests ──────────────────────────────────────────

describe('Drowned Revenant Template', () => {
  it('has correct stats from GDD §10.2', () => {
    expect(DROWNED_REVENANT.name).toBe('Drowned Revenant');
    expect(DROWNED_REVENANT.type).toBe('drowned_revenant');
    expect(DROWNED_REVENANT.stats.maxHp).toBe(50);
    expect(DROWNED_REVENANT.stats.attack).toBe(10);
    expect(DROWNED_REVENANT.stats.armour).toBe(3);
  });

  it('has loot table with crafting materials', () => {
    expect(DROWNED_REVENANT.lootTable.length).toBe(2);
    const names = DROWNED_REVENANT.lootTable.map(l => l.name);
    expect(names).toContain('waterlogged bone');
    expect(names).toContain('revenant essence');
  });

  it('spawn rules forbid entry and extraction rooms', () => {
    expect(DROWNED_REVENANT.spawnRules.forbiddenRoomTypes).toContain('entry');
    expect(DROWNED_REVENANT.spawnRules.forbiddenRoomTypes).toContain('extraction');
  });

  it('spawn rules prefer corridors and dead ends', () => {
    expect(DROWNED_REVENANT.spawnRules.preferredRoomTypes).toContain('corridor');
    expect(DROWNED_REVENANT.spawnRules.preferredRoomTypes).toContain('dead_end');
  });

  it('flee threshold is 25%', () => {
    expect(DROWNED_REVENANT.fleeThreshold).toBe(0.25);
  });

  it('idle patrol ticks are 3-5', () => {
    expect(DROWNED_REVENANT.idleTicksMin).toBe(3);
    expect(DROWNED_REVENANT.idleTicksMax).toBe(5);
  });
});
