/**
 * Creature wiring tests — spawning in shards, AI tick, loot drops, look command.
 *
 * Covers Issue #7 integration: creature systems wired into the live game loop.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CreatureManager } from '../creatures/CreatureManager.js';
import { DROWNED_REVENANT } from '../creatures/templates/drowned-revenant.js';
import type { CreatureWorldState } from '../creatures/behavior.js';
import { CombatSystem } from '../combat/CombatSystem.js';
import { createCombatant } from '../combat/CombatState.js';
import { createPRNG } from '../shard/prng.js';
import { generateShardGraph } from '../shard/generator.js';
import { adaptRoomGraph } from '../shard/graph-adapter.js';
import { handleLook } from '../commands/handlers/look.js';
import { handleCommand, type CommandContext } from '../commands/index.js';
import { PlayerState } from '../state/PlayerState.js';
import type { RoomGraph as LocalRoomGraph } from '../shard/RoomGraph.js';
import type { RoomGraph as SharedRoomGraph } from '@ellmud/shared';

// ─── Test Helpers ─────────────────────────────────────────────────────────────

function createTestShard(seed = 42) {
  const sharedGraph = generateShardGraph({ tier: 1, biome: 'flooded_crypt', seed });
  const localGraph = adaptRoomGraph(sharedGraph);
  const creatureManager = new CreatureManager();
  const creaturePrng = createPRNG(seed + 7919);
  const spawned = creatureManager.spawnCreatures(sharedGraph, DROWNED_REVENANT, creaturePrng);

  const combatSystem = new CombatSystem((roomId: string) => {
    const room = localGraph.rooms.get(roomId);
    return room ? Array.from(room.exits.values()) : [];
  });

  return { sharedGraph, localGraph, creatureManager, combatSystem, spawned };
}

function buildWorldState(
  localGraph: LocalRoomGraph,
  players: Map<string, PlayerState>,
  combatSystem: CombatSystem,
): CreatureWorldState {
  const playersInRoom = new Map<string, string[]>();
  for (const [sid, ps] of players) {
    const list = playersInRoom.get(ps.currentRoomId);
    if (list) {
      list.push(sid);
    } else {
      playersInRoom.set(ps.currentRoomId, [sid]);
    }
  }

  const roomExits = new Map<string, string[]>();
  for (const [id, room] of localGraph.rooms) {
    roomExits.set(id, Array.from(room.exits.values()));
  }

  const noisyRooms = new Set<string>(combatSystem.getActiveEncounterRoomIds());

  return { playersInRoom, roomExits, noisyRooms };
}

function buildCtx(
  player: PlayerState,
  localGraph: LocalRoomGraph,
  creatureManager: CreatureManager,
  combatSystem: CombatSystem,
  args: string[] = [],
): CommandContext {
  const room = localGraph.rooms.get(player.currentRoomId)!;
  const creaturesInRoom = creatureManager.getCreaturesInRoom(player.currentRoomId)
    .map(c => ({ id: c.id, name: c.name }));

  return {
    player,
    room,
    args,
    resolveRoom: (id) => localGraph.rooms.get(id),
    otherPlayersInRoom: [],
    stability: 1.0,
    combatSystem,
    creaturesInRoom,
  };
}

// ─── Creature Spawning in Shard ───────────────────────────────────────────────

describe('Creature Spawning in Shard', () => {
  it('spawns creatures in eligible rooms during shard creation', () => {
    const { spawned } = createTestShard();

    // Drowned Revenant template: 3-5 creatures
    expect(spawned.length).toBeGreaterThanOrEqual(3);
    expect(spawned.length).toBeLessThanOrEqual(5);
  });

  it('does not spawn creatures in entry rooms', () => {
    const { sharedGraph, spawned } = createTestShard();
    const entryIds = new Set(sharedGraph.entryRoomIds);

    for (const creature of spawned) {
      expect(entryIds.has(creature.currentRoomId)).toBe(false);
    }
  });

  it('does not spawn creatures in extraction rooms', () => {
    const { sharedGraph, spawned } = createTestShard();
    const extractionIds = new Set(sharedGraph.extractionRoomIds);

    for (const creature of spawned) {
      expect(extractionIds.has(creature.currentRoomId)).toBe(false);
    }
  });

  it('spawning is deterministic with the same seed', () => {
    const { spawned: spawned1 } = createTestShard(42);
    const { spawned: spawned2 } = createTestShard(42);

    expect(spawned1.length).toBe(spawned2.length);
    for (let i = 0; i < spawned1.length; i++) {
      expect(spawned1[i].currentRoomId).toBe(spawned2[i].currentRoomId);
      expect(spawned1[i].name).toBe(spawned2[i].name);
    }
  });

  it('all spawned creatures are Drowned Revenants with correct stats', () => {
    const { spawned } = createTestShard();

    for (const creature of spawned) {
      expect(creature.name).toBe('Drowned Revenant');
      expect(creature.type).toBe('drowned_revenant');
      expect(creature.maxHp).toBe(50);
      expect(creature.attack).toBe(10);
      expect(creature.isAlive).toBe(true);
      expect(creature.behaviorState).toBe('idle');
    }
  });
});

// ─── Creature AI Tick ─────────────────────────────────────────────────────────

describe('Creature AI Tick', () => {
  it('hostile creature initiates combat with player in same room', () => {
    const { localGraph, creatureManager, combatSystem, spawned } = createTestShard();
    const creature = spawned[0]!;

    // Place player in creature's room
    const player = new PlayerState('player-1', creature.currentRoomId);
    const players = new Map([['player-1', player]]);

    const world = buildWorldState(localGraph, players, combatSystem);
    const actions = creatureManager.updateAll(world);

    // Creature should transition to hostile and want to strike
    const creatureAction = actions.find(a => a.creatureId === creature.id);
    expect(creatureAction).toBeDefined();
    expect(creatureAction!.type).toBe('combat_strike');
    expect(creatureAction!.targetCombatantId).toBe('player-1');
    expect(creature.behaviorState).toBe('hostile');
  });

  it('creature action can be processed through combat system', () => {
    const { localGraph, creatureManager, combatSystem, spawned } = createTestShard();
    const creature = spawned[0]!;

    const player = new PlayerState('player-1', creature.currentRoomId);
    const players = new Map([['player-1', player]]);

    const world = buildWorldState(localGraph, players, combatSystem);
    const actions = creatureManager.updateAll(world);

    // Process creature action: register + initiate combat
    const action = actions.find(a => a.creatureId === creature.id)!;
    expect(action.type).toBe('combat_strike');

    combatSystem.registerCombatant(creatureManager.toCombatant(creature));
    combatSystem.registerCombatant(
      createCombatant('player-1', 'player-1', creature.currentRoomId, true),
    );
    combatSystem.initiateCombat(creature.id, 'player-1');

    expect(combatSystem.isInCombat(creature.id)).toBe(true);
    expect(combatSystem.isInCombat('player-1')).toBe(true);
    expect(combatSystem.hasActiveEncounters()).toBe(true);
  });

  it('combat tick resolves creature vs player simultaneously', () => {
    const { localGraph, creatureManager, combatSystem, spawned } = createTestShard();
    const creature = spawned[0]!;

    const player = new PlayerState('player-1', creature.currentRoomId);
    const players = new Map([['player-1', player]]);

    // Register combatants
    combatSystem.registerCombatant(creatureManager.toCombatant(creature));
    combatSystem.registerCombatant(
      createCombatant('player-1', 'player-1', creature.currentRoomId, true),
    );
    combatSystem.initiateCombat(creature.id, 'player-1');

    // Creature strikes, player strikes back
    combatSystem.submitAction('player-1', 'strike', creature.id);

    const result = combatSystem.resolveTick();
    expect(result.events.length).toBeGreaterThan(0);

    // Both should have taken damage
    const creatureCombatant = combatSystem.getCombatant(creature.id)!;
    const playerCombatant = combatSystem.getCombatant('player-1')!;
    expect(creatureCombatant.hp).toBeLessThan(50);
    expect(playerCombatant.hp).toBeLessThan(100);
  });

  it('creature AI stays idle when no players nearby', () => {
    const { localGraph, creatureManager, combatSystem } = createTestShard();
    const players = new Map<string, PlayerState>();

    const world = buildWorldState(localGraph, players, combatSystem);
    const actions = creatureManager.updateAll(world);

    // All actions should be idle or patrol
    for (const action of actions) {
      expect(['idle', 'patrol_move']).toContain(action.type);
    }
  });
});

// ─── Creature Loot Drops ──────────────────────────────────────────────────────

describe('Creature Loot Drops', () => {
  it('defeated creature drops loot items', () => {
    const { localGraph, creatureManager, combatSystem, spawned } = createTestShard();
    const creature = spawned[0]!;
    const roomId = creature.currentRoomId;
    const room = localGraph.rooms.get(roomId)!;
    const initialItemCount = room.items.length;

    // Kill the creature via combat — attack must exceed HP in one tick
    // Damage: attack × 0.5 (strike vs dodge) - armour(3) = need > 50 HP damage
    // So attack needs to be > (50 + 3) / 0.5 = 106
    combatSystem.registerCombatant(creatureManager.toCombatant(creature));
    combatSystem.registerCombatant(
      createCombatant('player-1', 'player-1', roomId, true, {
        maxHp: 100, attack: 200, defence: 5, armour: 2,
      }),
    );
    combatSystem.initiateCombat('player-1', creature.id);

    // Player strikes hard enough to kill creature
    combatSystem.submitAction('player-1', 'strike', creature.id);
    const result = combatSystem.resolveTick();

    // Check for defeated event
    const defeated = result.events.find(
      e => e.type === 'defeated' && e.actorId === creature.id,
    );
    expect(defeated).toBeDefined();

    // Generate loot BEFORE syncing (creature is still alive in manager until removed)
    const loot = creatureManager.removeCreature(creature.id);
    expect(loot.length).toBeGreaterThan(0);

    // Now sync remaining creatures
    const combatant = combatSystem.getCombatant(creature.id);
    if (combatant) {
      creatureManager.syncFromCombat(combatant);
    }

    // Place loot in room
    for (const item of loot) {
      room.items.push(item);
    }

    expect(room.items.length).toBeGreaterThan(initialItemCount);
    expect(creature.isAlive).toBe(false);

    // Verify loot contains expected items
    const lootNames = loot.map(i => i.name);
    expect(lootNames).toContain('waterlogged bone');
    expect(lootNames).toContain('revenant essence');
  });

  it('loot items are pickable via take command', () => {
    const { localGraph, creatureManager, combatSystem, spawned } = createTestShard();
    const creature = spawned[0]!;
    const roomId = creature.currentRoomId;
    const room = localGraph.rooms.get(roomId)!;

    // Generate and place loot
    const loot = creatureManager.removeCreature(creature.id);
    for (const item of loot) {
      room.items.push(item);
    }

    // Player tries to take loot
    const player = new PlayerState('player-1', roomId, 20);
    const ctx = buildCtx(player, localGraph, creatureManager, combatSystem, ['waterlogged', 'bone']);
    const result = handleCommand('take', ctx);

    expect(result.narrations[0]!.text).toContain('pick up');
    expect(player.inventory.size).toBe(1);
  });
});

// ─── Look Command with Creatures ──────────────────────────────────────────────

describe('Look Command with Creatures', () => {
  it('shows creatures present in room', () => {
    const { localGraph, creatureManager, combatSystem, spawned } = createTestShard();
    const creature = spawned[0]!;

    const player = new PlayerState('player-1', creature.currentRoomId);
    const ctx = buildCtx(player, localGraph, creatureManager, combatSystem);

    const result = handleLook(ctx);
    expect(result.narrations[0]!.text).toContain('Drowned Revenant');
    expect(result.narrations[0]!.text).toContain('lurks here');
  });

  it('does not show dead creatures', () => {
    const { localGraph, creatureManager, combatSystem, spawned } = createTestShard();
    const creature = spawned[0]!;
    const roomId = creature.currentRoomId;

    // Kill creature
    creatureManager.removeCreature(creature.id);

    const player = new PlayerState('player-1', roomId);
    const ctx = buildCtx(player, localGraph, creatureManager, combatSystem);

    const result = handleLook(ctx);
    expect(result.narrations[0]!.text).not.toContain('Drowned Revenant');
  });

  it('does not show creatures in rooms without them', () => {
    const { localGraph, creatureManager, combatSystem } = createTestShard();

    // Entry room should have no creatures
    const player = new PlayerState('player-1', localGraph.startRoomId);
    const ctx = buildCtx(player, localGraph, creatureManager, combatSystem);

    const result = handleLook(ctx);
    expect(result.narrations[0]!.text).not.toContain('lurks here');
  });
});

// ─── Attack Command with Creatures ────────────────────────────────────────────

describe('Attack Command with Creatures', () => {
  it('player can attack a creature by name', () => {
    const { localGraph, creatureManager, combatSystem, spawned } = createTestShard();
    const creature = spawned[0]!;

    // Register creature as combatant so attack handler can initiate
    combatSystem.registerCombatant(creatureManager.toCombatant(creature));

    const player = new PlayerState('player-1', creature.currentRoomId);
    const ctx = buildCtx(player, localGraph, creatureManager, combatSystem, ['revenant']);

    const result = handleCommand('attack', ctx);
    expect(result.narrations[0]!.text).toContain('combat begins');
    expect(result.narrations[0]!.text).toContain('Drowned Revenant');
  });

  it('player can attack a creature by partial name', () => {
    const { localGraph, creatureManager, combatSystem, spawned } = createTestShard();
    const creature = spawned[0]!;

    combatSystem.registerCombatant(creatureManager.toCombatant(creature));

    const player = new PlayerState('player-1', creature.currentRoomId);
    const ctx = buildCtx(player, localGraph, creatureManager, combatSystem, ['drowned']);

    const result = handleCommand('attack', ctx);
    expect(result.narrations[0]!.text).toContain('combat begins');
  });
});

// ─── Combat System getActiveEncounterRoomIds ──────────────────────────────────

describe('CombatSystem.getActiveEncounterRoomIds', () => {
  it('returns empty array when no encounters', () => {
    const combatSystem = new CombatSystem(() => []);
    expect(combatSystem.getActiveEncounterRoomIds()).toEqual([]);
  });

  it('returns room IDs of active encounters', () => {
    const combatSystem = new CombatSystem(() => ['room-2']);
    combatSystem.registerCombatant(createCombatant('a', 'A', 'room-1', true));
    combatSystem.registerCombatant(createCombatant('b', 'B', 'room-1', false));
    combatSystem.initiateCombat('a', 'b');

    const rooms = combatSystem.getActiveEncounterRoomIds();
    expect(rooms).toContain('room-1');
  });
});
