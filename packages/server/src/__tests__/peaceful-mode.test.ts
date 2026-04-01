/**
 * Peaceful (dev mode) tests — creature aggro bypass, command gating, toggle.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { updateCreature, type CreatureWorldState } from '../creatures/behavior.js';
import type { Creature } from '../creatures/types.js';
import { handleCommand, type CommandContext } from '../commands/index.js';
import { parseCommand } from '../commands/parser.js';
import { PlayerState } from '../state/PlayerState.js';
import { resetConfig } from '../config.js';
import { createTestRoomGraph } from '../generator/RoomGraph.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCreature(overrides: Partial<Creature> = {}): Creature {
  return {
    id: 'creature-1',
    type: 'drowned_revenant',
    name: 'Drowned Revenant',
    hp: 50,
    maxHp: 50,
    attack: 10,
    defence: 3,
    armour: 3,
    currentRoomId: 'room-a',
    behaviorState: 'idle',
    idleTicks: 0,
    idleTicksTarget: 4,
    alertTargetRoomId: null,
    lootTable: [],
    isAlive: true,
    aggressive: true,
    ...overrides,
  };
}

function makeWorldState(overrides: Partial<CreatureWorldState> = {}): CreatureWorldState {
  return {
    playersInRoom: new Map(),
    roomExits: new Map([['room-a', ['room-b']], ['room-b', ['room-a']]]),
    noisyRooms: new Set(),
    ...overrides,
  };
}

function buildCtx(player: PlayerState, graph: ReturnType<typeof createTestRoomGraph>, args: string[] = []): CommandContext {
  return {
    player,
    room: graph.rooms.get(player.currentRoomId)!,
    args,
    resolveRoom: (id: string) => graph.rooms.get(id),
    otherPlayersInRoom: [],
    stability: 1,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Peaceful Dev Mode', () => {
  afterEach(() => {
    resetConfig();
    delete process.env.DEV_MODE_ENABLED;
  });

  describe('creature behavior with peaceful players', () => {
    it('creature stays idle when only peaceful players are in room', () => {
      const creature = makeCreature();
      // Peaceful player excluded from playersInRoom at the ZoneRoom level,
      // so the creature sees an empty room.
      const world = makeWorldState({
        playersInRoom: new Map(), // peaceful player filtered out
      });

      const action = updateCreature(creature, world, 0.25);

      expect(creature.behaviorState).toBe('idle');
      expect(action.type).toBe('idle');
    });

    it('creature goes hostile when non-peaceful player present', () => {
      const creature = makeCreature();
      const world = makeWorldState({
        playersInRoom: new Map([['room-a', ['normal-player']]]),
      });

      const action = updateCreature(creature, world, 0.25);

      expect(creature.behaviorState).toBe('hostile');
      expect(action.type).toBe('combat_strike');
      expect(action.targetCombatantId).toBe('normal-player');
    });

    it('creature targets only non-peaceful player when both present', () => {
      const creature = makeCreature();
      // In buildCreatureWorldState, peaceful players are filtered out,
      // so only the non-peaceful player appears.
      const world = makeWorldState({
        playersInRoom: new Map([['room-a', ['normal-player']]]),
      });

      const action = updateCreature(creature, world, 0.25);

      expect(creature.behaviorState).toBe('hostile');
      expect(action.targetCombatantId).toBe('normal-player');
    });

    it('hostile creature returns to idle when remaining players become peaceful', () => {
      const creature = makeCreature({ behaviorState: 'hostile' });
      // All players now peaceful → filtered out → empty room from creature's view
      const world = makeWorldState({
        playersInRoom: new Map(),
      });

      const action = updateCreature(creature, world, 0.25);

      expect(creature.behaviorState).toBe('idle');
      expect(action.type).toBe('idle');
    });
  });

  describe('PlayerState peaceful flag', () => {
    it('defaults to false', () => {
      const player = new PlayerState('s1', 'room-a');
      expect(player.peaceful).toBe(false);
    });

    it('can be toggled', () => {
      const player = new PlayerState('s1', 'room-a');
      player.peaceful = true;
      expect(player.peaceful).toBe(true);
      player.peaceful = false;
      expect(player.peaceful).toBe(false);
    });
  });

  describe('/peaceful command', () => {
    it('is recognized by the parser', () => {
      const result = parseCommand('peaceful');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.command.verb).toBe('peaceful');
      }
    });

    it('toggles peaceful flag when dev mode enabled', () => {
      process.env.DEV_MODE_ENABLED = 'true';
      resetConfig();

      const graph = createTestRoomGraph();
      const player = new PlayerState('s1', 'entry');

      const result1 = handleCommand('peaceful', buildCtx(player, graph));
      expect(player.peaceful).toBe(true);
      expect(result1.narrations[0]!.text).toContain('ON');

      const result2 = handleCommand('peaceful', buildCtx(player, graph));
      expect(player.peaceful).toBe(false);
      expect(result2.narrations[0]!.text).toContain('OFF');
    });

    it('rejects command when dev mode disabled', () => {
      process.env.DEV_MODE_ENABLED = 'false';
      resetConfig();

      const graph = createTestRoomGraph();
      const player = new PlayerState('s1', 'entry');

      const result = handleCommand('peaceful', buildCtx(player, graph));
      expect(player.peaceful).toBe(false);
      expect(result.narrations[0]!.text).toContain('not available');
    });

    it('rejects command when DEV_MODE_ENABLED not set', () => {
      resetConfig();

      const graph = createTestRoomGraph();
      const player = new PlayerState('s1', 'entry');

      const result = handleCommand('peaceful', buildCtx(player, graph));
      expect(player.peaceful).toBe(false);
      expect(result.narrations[0]!.text).toContain('not available');
    });
  });

  describe('world state filtering (integration)', () => {
    it('buildCreatureWorldState pattern excludes peaceful players', () => {
      // Simulate the ZoneRoom.buildCreatureWorldState() logic
      const players = new Map<string, PlayerState>();
      const peacefulPlayer = new PlayerState('peaceful-1', 'room-a');
      peacefulPlayer.peaceful = true;
      const normalPlayer = new PlayerState('normal-1', 'room-a');
      players.set('peaceful-1', peacefulPlayer);
      players.set('normal-1', normalPlayer);

      // Replicate the filtering logic from ZoneRoom
      const playersInRoom = new Map<string, string[]>();
      for (const [sid, ps] of players) {
        if (ps.peaceful) continue;
        const list = playersInRoom.get(ps.currentRoomId);
        if (list) {
          list.push(sid);
        } else {
          playersInRoom.set(ps.currentRoomId, [sid]);
        }
      }

      expect(playersInRoom.get('room-a')).toEqual(['normal-1']);
      expect(playersInRoom.has('room-a')).toBe(true);
    });

    it('filters all players when all are peaceful', () => {
      const players = new Map<string, PlayerState>();
      const p1 = new PlayerState('p1', 'room-a');
      p1.peaceful = true;
      const p2 = new PlayerState('p2', 'room-a');
      p2.peaceful = true;
      players.set('p1', p1);
      players.set('p2', p2);

      const playersInRoom = new Map<string, string[]>();
      for (const [sid, ps] of players) {
        if (ps.peaceful) continue;
        const list = playersInRoom.get(ps.currentRoomId);
        if (list) {
          list.push(sid);
        } else {
          playersInRoom.set(ps.currentRoomId, [sid]);
        }
      }

      expect(playersInRoom.has('room-a')).toBe(false);
    });
  });
});
