/**
 * Character Posture System Tests — Issue #371
 *
 * Comprehensive tests for the posture system covering:
 *   - Posture commands (/sit, /stand, /crouch, /prone, /recline)
 *   - "Already in posture" feedback
 *   - Parser recognition of posture verbs
 *   - Movement auto-reset to standing
 *   - Room display with posture descriptions
 *   - forcePosture utility for combat knockdowns
 *   - System-only postures (floating, hovering)
 *   - Edge cases (combat, rapid changes, knockdown recovery)
 *   - Who list posture field
 *
 * @see Issue #371
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { handleCommand, type CommandContext, type CommandResult, type PlayerRef } from '../commands/index.js';
import { parseCommand } from '../commands/parser.js';
import { handleLook } from '../commands/handlers/look.js';
import { forcePosture } from '../commands/handlers/posture.js';
import { PlayerState } from '../state/PlayerState.js';
import { type Room, type Direction } from '../generator/RoomGraph.js';
import { CombatSystem } from '../combat/CombatSystem.js';
import { createCombatant } from '../combat/CombatState.js';
import { formatWhoListText } from '../who/WhoListService.js';
import {
  type Posture,
  VALID_POSTURES,
  PLAYER_SETTABLE_POSTURES,
  DEFAULT_POSTURE,
  POSTURE_MOVEMENT_VERBS,
  POSTURE_ROOM_DESCRIPTIONS,
} from '@ellmud/shared';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: 'test-room',
    name: 'Test Chamber',
    description: 'A plain room for testing.',
    exits: new Map<Direction, string>([['north', 'north-room']]),
    items: [],
    ...overrides,
  };
}

function makeNorthRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: 'north-room',
    name: 'North Chamber',
    description: 'A room to the north.',
    exits: new Map<Direction, string>([['south', 'test-room']]),
    items: [],
    ...overrides,
  };
}

const rooms = new Map<string, Room>();

function buildCtx(
  player: PlayerState,
  room: Room,
  args: string[] = [],
  extras: Partial<CommandContext> = {},
): CommandContext {
  return {
    player,
    room,
    args,
    resolveRoom: (id) => rooms.get(id),
    otherPlayersInRoom: [],
    stability: 1.0,
    characterName: 'TestWarrior',
    ...extras,
  };
}

function testExitResolver(roomId: string): string[] {
  if (roomId === 'test-room') return ['north-room'];
  if (roomId === 'north-room') return ['test-room'];
  return [];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('Character Posture System (Issue #371)', () => {
  let testRoom: Room;
  let northRoom: Room;
  let player: PlayerState;

  beforeEach(() => {
    testRoom = makeRoom();
    northRoom = makeNorthRoom();
    rooms.clear();
    rooms.set(testRoom.id, testRoom);
    rooms.set(northRoom.id, northRoom);
    player = new PlayerState('player-1', testRoom.id, 20);
  });

  // ─── Shared types ──────────────────────────────────────────────────────────

  describe('Shared posture types (@ellmud/shared)', () => {
    it('VALID_POSTURES includes all 7 postures', () => {
      expect(VALID_POSTURES).toContain('standing');
      expect(VALID_POSTURES).toContain('sitting');
      expect(VALID_POSTURES).toContain('crouching');
      expect(VALID_POSTURES).toContain('prone');
      expect(VALID_POSTURES).toContain('reclining');
      expect(VALID_POSTURES).toContain('floating');
      expect(VALID_POSTURES).toContain('hovering');
      expect(VALID_POSTURES).toHaveLength(7);
    });

    it('PLAYER_SETTABLE_POSTURES excludes floating and hovering', () => {
      expect(PLAYER_SETTABLE_POSTURES).toContain('standing');
      expect(PLAYER_SETTABLE_POSTURES).toContain('sitting');
      expect(PLAYER_SETTABLE_POSTURES).toContain('crouching');
      expect(PLAYER_SETTABLE_POSTURES).toContain('prone');
      expect(PLAYER_SETTABLE_POSTURES).toContain('reclining');
      expect(PLAYER_SETTABLE_POSTURES).not.toContain('floating');
      expect(PLAYER_SETTABLE_POSTURES).not.toContain('hovering');
      expect(PLAYER_SETTABLE_POSTURES).toHaveLength(5);
    });

    it('DEFAULT_POSTURE is standing', () => {
      expect(DEFAULT_POSTURE).toBe('standing');
    });

    it('POSTURE_MOVEMENT_VERBS has entries for all postures', () => {
      for (const p of VALID_POSTURES) {
        expect(POSTURE_MOVEMENT_VERBS[p]).toBeDefined();
        expect(typeof POSTURE_MOVEMENT_VERBS[p]).toBe('string');
      }
    });

    it('POSTURE_ROOM_DESCRIPTIONS has entries for all postures', () => {
      for (const p of VALID_POSTURES) {
        expect(POSTURE_ROOM_DESCRIPTIONS[p]).toBeDefined();
        expect(typeof POSTURE_ROOM_DESCRIPTIONS[p]).toBe('string');
      }
    });

    it('movement verbs are distinct per posture', () => {
      expect(POSTURE_MOVEMENT_VERBS.standing).toMatch(/walk/i);
      expect(POSTURE_MOVEMENT_VERBS.prone).toMatch(/crawl/i);
      expect(POSTURE_MOVEMENT_VERBS.crouching).toMatch(/sneak/i);
      expect(POSTURE_MOVEMENT_VERBS.floating).toMatch(/float/i);
    });

    it('room descriptions include "here" for each posture', () => {
      for (const p of VALID_POSTURES) {
        expect(POSTURE_ROOM_DESCRIPTIONS[p]).toMatch(/here/i);
      }
    });
  });

  // ─── PlayerState posture field ─────────────────────────────────────────────

  describe('PlayerState — posture field', () => {
    it('has a posture property', () => {
      expect(player).toHaveProperty('posture');
    });

    it('defaults to standing for new characters', () => {
      expect(player.posture).toBe('standing');
    });

    it('can be set to any valid posture', () => {
      for (const p of VALID_POSTURES) {
        player.posture = p;
        expect(player.posture).toBe(p);
      }
    });
  });

  // ─── 1. Posture Command Tests ──────────────────────────────────────────────

  describe('Posture commands — set posture', () => {
    it('/sit sets posture to sitting and narrates', () => {
      const result = handleCommand('sit', buildCtx(player, testRoom));

      expect(player.posture).toBe('sitting');
      expect(result.narrations.length).toBeGreaterThan(0);
      expect(result.narrations[0]!.text).toMatch(/sit/i);
    });

    it('/stand sets posture to standing', () => {
      player.posture = 'sitting';
      const result = handleCommand('stand', buildCtx(player, testRoom));

      expect(player.posture).toBe('standing');
      expect(result.narrations[0]!.text).toMatch(/stand/i);
    });

    it('/crouch sets posture to crouching', () => {
      const result = handleCommand('crouch', buildCtx(player, testRoom));

      expect(player.posture).toBe('crouching');
      expect(result.narrations[0]!.text).toMatch(/crouch/i);
    });

    it('/prone sets posture to prone', () => {
      const result = handleCommand('prone', buildCtx(player, testRoom));

      expect(player.posture).toBe('prone');
      expect(result.narrations[0]!.text).toMatch(/prone|drop|ground/i);
    });

    it('/recline sets posture to reclining', () => {
      const result = handleCommand('recline', buildCtx(player, testRoom));

      expect(player.posture).toBe('reclining');
      expect(result.narrations[0]!.text).toMatch(/recline/i);
    });

    it('posture commands produce room-type narration', () => {
      const result = handleCommand('sit', buildCtx(player, testRoom));
      expect(result.narrations[0]!.type).toBe('room');
    });
  });

  // ─── 1b. Already in target posture ─────────────────────────────────────────

  describe('Posture commands — already in target posture', () => {
    it('/sit when already sitting → "You are already sitting."', () => {
      player.posture = 'sitting';
      const result = handleCommand('sit', buildCtx(player, testRoom));

      expect(player.posture).toBe('sitting');
      expect(result.narrations[0]!.text).toMatch(/already.*sit/i);
      expect(result.narrations[0]!.type).toBe('system');
    });

    it('/stand when already standing → "You are already standing."', () => {
      const result = handleCommand('stand', buildCtx(player, testRoom));

      expect(player.posture).toBe('standing');
      expect(result.narrations[0]!.text).toMatch(/already.*stand/i);
    });

    it('/crouch when already crouching → rejection', () => {
      player.posture = 'crouching';
      const result = handleCommand('crouch', buildCtx(player, testRoom));
      expect(result.narrations[0]!.text).toMatch(/already.*crouch/i);
    });

    it('/prone when already prone → rejection', () => {
      player.posture = 'prone';
      const result = handleCommand('prone', buildCtx(player, testRoom));
      expect(result.narrations[0]!.text).toMatch(/already.*prone/i);
    });

    it('/recline when already reclining → rejection', () => {
      player.posture = 'reclining';
      const result = handleCommand('recline', buildCtx(player, testRoom));
      expect(result.narrations[0]!.text).toMatch(/already.*reclin/i);
    });
  });

  // ─── 1c. Parser recognizes posture commands ────────────────────────────────

  describe('Parser — posture verbs', () => {
    for (const verb of ['sit', 'stand', 'crouch', 'prone', 'recline'] as const) {
      it(`recognizes "${verb}" as a known verb`, () => {
        const result = parseCommand(verb);
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.command.verb).toBe(verb);
      });
    }

    it('rejects "float" — not a player command', () => {
      const result = parseCommand('float');
      expect(result.ok).toBe(false);
    });

    it('rejects "hover" — not a player command', () => {
      const result = parseCommand('hover');
      expect(result.ok).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Section 2: Movement + Posture
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Movement resets posture to standing', () => {
    const nonStandingPostures: Posture[] = ['sitting', 'prone', 'crouching', 'reclining'];

    for (const posture of nonStandingPostures) {
      it(`moving while ${posture} → resets to standing`, () => {
        player.posture = posture;
        handleCommand('go', buildCtx(player, testRoom, ['north']));

        expect(player.currentRoomId).toBe('north-room');
        expect(player.posture).toBe('standing');
      });
    }

    it('moving while already standing → stays standing', () => {
      handleCommand('go', buildCtx(player, testRoom, ['north']));
      expect(player.posture).toBe('standing');
    });

    it('failed movement (no exit) does NOT reset posture', () => {
      player.posture = 'sitting';
      handleCommand('go', buildCtx(player, testRoom, ['west']));

      expect(player.currentRoomId).toBe('test-room');
      expect(player.posture).toBe('sitting');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Section 3: Room Display
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Room display shows player posture', () => {
    it('"Alice is sitting here." when posture = sitting', () => {
      const ctx = buildCtx(player, testRoom, [], {
        otherPlayersInRoom: ['alice-session'],
        otherPlayerInfo: [
          { sessionId: 'alice-session', name: 'Alice', anon: false, posture: 'sitting' },
        ],
      });

      const result = handleLook(ctx);
      const text = result.narrations.map((n) => n.text).join('\n');
      expect(text).toMatch(/Alice is sitting here/i);
    });

    it('"Bob is standing here." when posture = standing', () => {
      const ctx = buildCtx(player, testRoom, [], {
        otherPlayersInRoom: ['bob-session'],
        otherPlayerInfo: [
          { sessionId: 'bob-session', name: 'Bob', anon: false, posture: 'standing' },
        ],
      });

      const text = handleLook(ctx).narrations.map((n) => n.text).join('\n');
      expect(text).toMatch(/Bob is standing here/i);
    });

    it('"Charlie is lying prone here." when posture = prone', () => {
      const ctx = buildCtx(player, testRoom, [], {
        otherPlayersInRoom: ['charlie-session'],
        otherPlayerInfo: [
          { sessionId: 'charlie-session', name: 'Charlie', anon: false, posture: 'prone' },
        ],
      });

      const text = handleLook(ctx).narrations.map((n) => n.text).join('\n');
      expect(text).toMatch(/Charlie is lying prone here/i);
    });

    it('multiple players with different postures', () => {
      const ctx = buildCtx(player, testRoom, [], {
        otherPlayersInRoom: ['alice-session', 'bob-session'],
        otherPlayerInfo: [
          { sessionId: 'alice-session', name: 'Alice', anon: false, posture: 'sitting' },
          { sessionId: 'bob-session', name: 'Bob', anon: false, posture: 'crouching' },
        ],
      });

      const text = handleLook(ctx).narrations.map((n) => n.text).join('\n');
      expect(text).toMatch(/Alice is sitting here/i);
      expect(text).toMatch(/Bob is crouching here/i);
    });

    it('player without posture falls back to "is here"', () => {
      const ctx = buildCtx(player, testRoom, [], {
        otherPlayersInRoom: ['legacy-session'],
        otherPlayerInfo: [
          { sessionId: 'legacy-session', name: 'Legacy', anon: false },
        ],
      });

      const text = handleLook(ctx).narrations.map((n) => n.text).join('\n');
      expect(text).toMatch(/Legacy is here/i);
    });

    it('anonymous players hidden regardless of posture', () => {
      const ctx = buildCtx(player, testRoom, [], {
        otherPlayersInRoom: ['anon-session'],
        otherPlayerInfo: [
          { sessionId: 'anon-session', name: 'Stealth', anon: true, posture: 'sitting' },
        ],
      });

      const text = handleLook(ctx).narrations.map((n) => n.text).join('\n');
      expect(text).not.toContain('Stealth');
    });
  });

  // ─── Go handler — posture in target room players ──────────────────────────

  describe('Go handler — posture in target room', () => {
    it('entering a room shows players with posture descriptions', () => {
      const ctx = buildCtx(player, testRoom, ['north'], {
        resolvePlayersInRoom: (roomId) => {
          if (roomId === 'north-room') {
            return [
              { sessionId: 'alice-session', name: 'Alice', anon: false, posture: 'sitting' as Posture },
            ];
          }
          return [];
        },
      });

      const text = handleCommand('go', ctx).narrations.map((n) => n.text).join('\n');
      expect(text).toMatch(/Alice is sitting here/i);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Section 4: Force Posture
  // ═══════════════════════════════════════════════════════════════════════════

  describe('forcePosture utility', () => {
    it('sets posture and returns broadcast message', () => {
      const result = forcePosture(player, 'prone', 'TestWarrior');
      expect(player.posture).toBe('prone');
      expect(result).not.toBeNull();
      expect(result!.message).toContain('TestWarrior');
    });

    it('returns null when already in target posture', () => {
      player.posture = 'prone';
      expect(forcePosture(player, 'prone', 'TestWarrior')).toBeNull();
    });

    it('can set floating (system-only posture)', () => {
      const result = forcePosture(player, 'floating', 'TestWarrior');
      expect(player.posture).toBe('floating');
      expect(result!.message).toMatch(/float/i);
    });

    it('can set hovering (system-only posture)', () => {
      const result = forcePosture(player, 'hovering', 'TestWarrior');
      expect(player.posture).toBe('hovering');
      expect(result!.message).toMatch(/hover/i);
    });
  });

  describe('System-only postures not player-settable', () => {
    it('"float" is not a recognized command', () => {
      handleCommand('float', buildCtx(player, testRoom));
      expect(player.posture).not.toBe('floating');
    });

    it('"hover" is not a recognized command', () => {
      handleCommand('hover', buildCtx(player, testRoom));
      expect(player.posture).not.toBe('hovering');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Section 5: Edge Cases
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Edge cases', () => {
    it('posture changes are allowed during combat', () => {
      const combatSystem = new CombatSystem(testExitResolver);
      const pc = createCombatant('player-1', 'TestWarrior', 'test-room', true);
      const npc = createCombatant('creature-1', 'Revenant', 'test-room', false);
      combatSystem.registerCombatant(pc);
      combatSystem.registerCombatant(npc);
      combatSystem.initiateCombat('creature-1', 'player-1');

      handleCommand('crouch', buildCtx(player, testRoom, [], { combatSystem }));
      expect(player.posture).toBe('crouching');
    });

    it('rapid posture changes — final state is last command', () => {
      handleCommand('sit', buildCtx(player, testRoom));
      expect(player.posture).toBe('sitting');

      handleCommand('crouch', buildCtx(player, testRoom));
      expect(player.posture).toBe('crouching');

      handleCommand('prone', buildCtx(player, testRoom));
      expect(player.posture).toBe('prone');

      handleCommand('stand', buildCtx(player, testRoom));
      expect(player.posture).toBe('standing');
    });

    it('stand recovers from combat knockdown (forced prone)', () => {
      forcePosture(player, 'prone', 'TestWarrior');
      handleCommand('stand', buildCtx(player, testRoom));
      expect(player.posture).toBe('standing');
    });

    it('movement from forced prone resets to standing', () => {
      forcePosture(player, 'prone', 'TestWarrior');
      handleCommand('go', buildCtx(player, testRoom, ['north']));

      expect(player.currentRoomId).toBe('north-room');
      expect(player.posture).toBe('standing');
    });

    it('non-movement commands do NOT change posture', () => {
      player.posture = 'sitting';
      handleCommand('look', buildCtx(player, testRoom));
      expect(player.posture).toBe('sitting');

      handleCommand('inventory', buildCtx(player, testRoom));
      expect(player.posture).toBe('sitting');
    });

    it('all posture transitions from non-standing work', () => {
      player.posture = 'sitting';
      handleCommand('crouch', buildCtx(player, testRoom));
      expect(player.posture).toBe('crouching');

      handleCommand('prone', buildCtx(player, testRoom));
      expect(player.posture).toBe('prone');

      handleCommand('recline', buildCtx(player, testRoom));
      expect(player.posture).toBe('reclining');

      handleCommand('sit', buildCtx(player, testRoom));
      expect(player.posture).toBe('sitting');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Section 6: Who List
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Who list posture', () => {
    it('PlayerListEntry accepts posture field', () => {
      const entry = {
        name: 'TestWarrior',
        level: null,
        class: null,
        zone: 'The Refuge',
        flags: [] as Array<'anon' | 'rp'>,
        anon: false,
        posture: 'sitting' as Posture,
      };
      expect(entry.posture).toBe('sitting');
    });

    it('formatWhoListText includes posture when present', () => {
      const entries = [
        {
          name: 'Alice',
          level: null,
          class: null,
          zone: 'The Refuge',
          flags: [] as Array<'anon' | 'rp'>,
          anon: false,
          posture: 'sitting' as Posture,
        },
      ];

      const output = formatWhoListText(entries);
      expect(output).toContain('Alice');
      expect(output).toMatch(/sit/i);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Section 7: Posture Broadcast Metadata
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Posture command result — broadcast metadata', () => {
    it('posture change includes _postureChange for room broadcast', () => {
      const ctx = buildCtx(player, testRoom, [], { characterName: 'Alice' });
      const result = handleCommand('sit', ctx) as CommandResult & {
        _postureChange?: { characterName: string; message: string };
      };

      expect(result._postureChange).toBeDefined();
      expect(result._postureChange!.characterName).toBe('Alice');
      expect(result._postureChange!.message).toMatch(/Alice.*sit/i);
    });

    it('already-in-posture does NOT include _postureChange', () => {
      player.posture = 'sitting';
      const result = handleCommand('sit', buildCtx(player, testRoom)) as CommandResult & {
        _postureChange?: unknown;
      };
      expect(result._postureChange).toBeUndefined();
    });
  });
});
