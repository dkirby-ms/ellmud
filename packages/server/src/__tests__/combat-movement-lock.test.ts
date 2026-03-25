/**
 * Combat Movement Lock Tests — Bug Fix #1
 *
 * Verifies that 'go' is blocked while in combat, 'flee' still works,
 * and other commands (look, inventory, strike, dodge) remain available.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { handleCommand, type CommandContext } from '../commands/index.js';
import { CombatSystem } from '../combat/CombatSystem.js';
import { createCombatant } from '../combat/CombatState.js';
import { PlayerState } from '../state/PlayerState.js';
import { createTestRoomGraph } from '../shard/RoomGraph.js';

const TEST_ROOM = 'entry';

function testExitResolver(roomId: string): string[] {
  if (roomId === 'entry') return ['corridor'];
  if (roomId === 'corridor') return ['entry'];
  return [];
}

describe('Combat Movement Lock', () => {
  let graph: ReturnType<typeof createTestRoomGraph>;
  let player: PlayerState;
  let combatSystem: CombatSystem;

  beforeEach(() => {
    graph = createTestRoomGraph();
    player = new PlayerState('player-1', TEST_ROOM, 20);
    combatSystem = new CombatSystem(testExitResolver);

    // Register player and a creature as combatants
    const playerCombatant = createCombatant('player-1', 'Player', TEST_ROOM, true);
    const creatureCombatant = createCombatant('creature-1', 'Revenant', TEST_ROOM, false);
    combatSystem.registerCombatant(playerCombatant);
    combatSystem.registerCombatant(creatureCombatant);
    combatSystem.initiateCombat('creature-1', 'player-1');
  });

  function buildCtx(args: string[] = []): CommandContext {
    return {
      player,
      room: graph.rooms.get(player.currentRoomId)!,
      args,
      resolveRoom: (id) => graph.rooms.get(id),
      otherPlayersInRoom: [],
      stability: 1.0,
      combatSystem,
    };
  }

  it('should block "go" while in combat', () => {
    expect(combatSystem.isInCombat('player-1')).toBe(true);
    const result = handleCommand('go', buildCtx(['north']));
    expect(result.narrations[0]!.text).toContain("You're in combat");
    expect(result.narrations[0]!.text).toContain('flee');
    expect(player.currentRoomId).toBe(TEST_ROOM); // player didn't move
  });

  it('should allow "flee" while in combat', () => {
    const result = handleCommand('flee', buildCtx(['north']));
    expect(result.narrations[0]!.text).not.toContain("You're in combat");
    expect(result.narrations[0]!.type).toBe('combat');
  });

  it('should allow "strike" while in combat', () => {
    const result = handleCommand('strike', buildCtx());
    expect(result.narrations[0]!.text).toContain('strike');
    expect(result.narrations[0]!.type).toBe('combat');
  });

  it('should allow "dodge" while in combat', () => {
    const result = handleCommand('dodge', buildCtx());
    expect(result.narrations[0]!.text).toContain('dodge');
    expect(result.narrations[0]!.type).toBe('combat');
  });

  it('should allow "look" while in combat', () => {
    const result = handleCommand('look', buildCtx());
    expect(result.narrations[0]!.type).toBe('room');
  });

  it('should allow "inventory" while in combat', () => {
    const result = handleCommand('inventory', buildCtx());
    expect(result.narrations[0]!.type).toBe('system');
  });

  it('should allow "go" when NOT in combat', () => {
    // Remove player from combat
    combatSystem.removeCombatant('player-1');
    expect(combatSystem.isInCombat('player-1')).toBe(false);

    const result = handleCommand('go', buildCtx(['north']));
    expect(result.narrations[0]!.text).toContain('You move north');
    expect(player.currentRoomId).toBe('corridor');
  });

  it('should allow "go" when combatSystem is not present', () => {
    // Context without combatSystem (e.g., non-shard room)
    const ctx: CommandContext = {
      player,
      room: graph.rooms.get(player.currentRoomId)!,
      args: ['north'],
      resolveRoom: (id) => graph.rooms.get(id),
      otherPlayersInRoom: [],
      stability: 1.0,
    };
    const result = handleCommand('go', ctx);
    expect(result.narrations[0]!.text).toContain('You move north');
  });
});
