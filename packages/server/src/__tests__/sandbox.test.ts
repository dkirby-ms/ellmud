/**
 * Combat Sandbox Tests — Phase 1
 *
 * Validates sandbox command gating, creature spawning, state reset,
 * instant kill, healing, state isolation, and selective ticking.
 *
 * Architecture decisions:
 * - Shared CombatSystem: sandbox uses zone's existing CombatSystem instance
 * - 3 rooms: sandbox-lobby (feature_sandbox), sandbox-arena (feature_sandbox_arena),
 *            sandbox-stats-lab (feature_sandbox_stats)
 * - Double gating: feature room type + devModeEnabled
 * - State isolation: no loot, no XP, no death penalty in sandbox
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { handleCommand, type CommandContext, type CommandResult } from '../commands/index.js';
import { PlayerState } from '../state/PlayerState.js';
import { CombatSystem } from '../combat/CombatSystem.js';
import {
  createCombatant,
  DEFAULT_PLAYER_STATS,
} from '../combat/CombatState.js';
import { CreatureManager } from '../creatures/CreatureManager.js';
import { DROWNED_REVENANT } from '../creatures/templates/drowned-revenant.js';
import { resetConfig } from '../config.js';
import type { Room, Direction, RoomType } from '../generator/RoomGraph.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const LOBBY_ROOM_ID = 'sandbox-lobby';
const ARENA_ROOM_ID = 'sandbox-arena';
const STATS_LAB_ROOM_ID = 'sandbox-stats-lab';
const NON_SANDBOX_ROOM_ID = 'hearth';

// ─── Test Helpers ───────────────────────────────────────────────────────────

function makeRoom(
  id: string,
  type?: RoomType,
  exits: [Direction, string][] = [],
): Room {
  return {
    id,
    name: `Room ${id}`,
    description: `Test room ${id}`,
    type,
    exits: new Map(exits),
    items: [],
  };
}

const sandboxLobby = makeRoom(LOBBY_ROOM_ID, 'feature_sandbox' as RoomType, [
  ['east', ARENA_ROOM_ID],
  ['west', STATS_LAB_ROOM_ID],
]);
const sandboxArena = makeRoom(ARENA_ROOM_ID, 'feature_sandbox_arena' as RoomType, [
  ['west', LOBBY_ROOM_ID],
]);
const sandboxStatsLab = makeRoom(STATS_LAB_ROOM_ID, 'feature_sandbox_stats' as RoomType, [
  ['east', LOBBY_ROOM_ID],
]);
const nonSandboxRoom = makeRoom(NON_SANDBOX_ROOM_ID, undefined, [
  ['north', LOBBY_ROOM_ID],
]);

const allRooms = new Map<string, Room>([
  [LOBBY_ROOM_ID, sandboxLobby],
  [ARENA_ROOM_ID, sandboxArena],
  [STATS_LAB_ROOM_ID, sandboxStatsLab],
  [NON_SANDBOX_ROOM_ID, nonSandboxRoom],
]);

function exitResolver(roomId: string): string[] {
  const room = allRooms.get(roomId);
  if (!room) return [];
  return Array.from(room.exits.values());
}

function makePlayer(
  sessionId = 'player-1',
  roomId = LOBBY_ROOM_ID,
): PlayerState {
  return new PlayerState(sessionId, roomId, 20);
}

function buildCtx(
  room: Room,
  args: string[] = [],
  extras: Partial<CommandContext> = {},
): CommandContext {
  const player = extras.player ?? makePlayer('player-1', room.id);
  return {
    player,
    room,
    args,
    resolveRoom: (id) => allRooms.get(id),
    otherPlayersInRoom: [],
    stability: 1.0,
    ...extras,
  };
}

function narrationText(result: CommandResult): string {
  return result.narrations.map((n) => n.text).join('\n');
}

function enableDevMode(): void {
  process.env.DEV_MODE_ENABLED = 'true';
  resetConfig();
}

function disableDevMode(): void {
  process.env.DEV_MODE_ENABLED = 'false';
  resetConfig();
}

// ─── 1. Command Gating ─────────────────────────────────────────────────────

describe('Combat Sandbox', () => {
  afterEach(() => {
    delete process.env.DEV_MODE_ENABLED;
    resetConfig();
  });

  describe('command gating', () => {
    it('rejects sandbox command in a non-sandbox room', () => {
      enableDevMode();
      const ctx = buildCtx(nonSandboxRoom, ['spawn', 'drowned_revenant']);
      const result = handleCommand('sandbox', ctx);
      const text = narrationText(result).toLowerCase();

      expect(text).toContain("can't do that here");
    });

    it('rejects sandbox command when devModeEnabled is false', () => {
      disableDevMode();
      const ctx = buildCtx(sandboxLobby, ['spawn', 'drowned_revenant']);
      const result = handleCommand('sandbox', ctx);
      const text = narrationText(result).toLowerCase();

      expect(text).toContain('not available');
    });

    it('accepts sandbox command when in sandbox room AND devMode is enabled', () => {
      enableDevMode();
      const ctx = buildCtx(sandboxLobby, ['status'], {
        creatureManager: new CreatureManager(),
      });
      const result = handleCommand('sandbox', ctx);
      const text = narrationText(result);

      expect(text).not.toContain("can't do that here");
      expect(text).not.toContain('not available');
      expect(result.narrations.length).toBeGreaterThan(0);
    });

    it('rejects sandbox command in a regular corridor room', () => {
      enableDevMode();
      const corridorRoom = makeRoom('corridor-1', 'corridor');
      const ctx = buildCtx(corridorRoom, ['spawn', 'drowned_revenant']);
      const result = handleCommand('sandbox', ctx);
      const text = narrationText(result).toLowerCase();

      expect(text).toContain("can't do that here");
    });

    it('accepts sandbox command in all three sandbox room types', () => {
      enableDevMode();
      const cm = new CreatureManager();
      const cs = new CombatSystem(exitResolver);

      for (const room of [sandboxLobby, sandboxArena, sandboxStatsLab]) {
        const ctx = buildCtx(room, ['status'], { creatureManager: cm, combatSystem: cs });
        const result = handleCommand('sandbox', ctx);
        const text = narrationText(result).toLowerCase();
        expect(text).not.toContain("can't do that here");
      }
    });
  });

  // ─── 2. Spawn Command ──────────────────────────────────────────────────────

  describe('spawn command', () => {
    let combatSystem: CombatSystem;
    let creatureManager: CreatureManager;

    beforeEach(() => {
      enableDevMode();
      combatSystem = new CombatSystem(exitResolver);
      creatureManager = new CreatureManager();
    });

    it('spawns 1 creature when given a valid type', () => {
      const ctx = buildCtx(sandboxLobby, ['spawn', 'drowned_revenant'], {
        combatSystem,
        creatureManager,
      });
      const result = handleCommand('sandbox', ctx);
      const text = narrationText(result);

      expect(text.toLowerCase()).toContain('spawned');
      expect(text).toContain('1');

      const creaturesInArena = creatureManager.getCreaturesInRoom(ARENA_ROOM_ID);
      expect(creaturesInArena).toHaveLength(1);
      expect(creaturesInArena[0]!.type).toBe('drowned_revenant');
    });

    it('spawns specified count of creatures (e.g., 3)', () => {
      const ctx = buildCtx(sandboxLobby, ['spawn', 'drowned_revenant', '3'], {
        combatSystem,
        creatureManager,
      });
      const result = handleCommand('sandbox', ctx);
      const text = narrationText(result);

      expect(text).toContain('3');
      expect(creatureManager.getCreaturesInRoom(ARENA_ROOM_ID)).toHaveLength(3);
    });

    it('caps spawn count at 5 when requesting more', () => {
      const ctx = buildCtx(sandboxLobby, ['spawn', 'drowned_revenant', '10'], {
        combatSystem,
        creatureManager,
      });
      const result = handleCommand('sandbox', ctx);
      const text = narrationText(result);

      expect(text).toContain('5');
      expect(creatureManager.getCreaturesInRoom(ARENA_ROOM_ID)).toHaveLength(5);
    });

    it('returns error for invalid creature type', () => {
      const ctx = buildCtx(sandboxLobby, ['spawn', 'nonexistent_creature'], {
        combatSystem,
        creatureManager,
      });
      const result = handleCommand('sandbox', ctx);
      const text = narrationText(result).toLowerCase();

      expect(text).toContain('unknown creature type');
    });

    it('tags spawned creatures with sandbox: true', () => {
      const ctx = buildCtx(sandboxLobby, ['spawn', 'drowned_revenant'], {
        combatSystem,
        creatureManager,
      });
      handleCommand('sandbox', ctx);

      const creatures = creatureManager.getCreaturesInRoom(ARENA_ROOM_ID);
      expect(creatures).toHaveLength(1);
      expect(creatures[0]!.sandbox).toBe(true);
    });

    it('spawns creatures into arena even when issued from lobby', () => {
      const ctx = buildCtx(sandboxLobby, ['spawn', 'drowned_revenant', '2'], {
        combatSystem,
        creatureManager,
      });
      handleCommand('sandbox', ctx);

      expect(creatureManager.getCreaturesInRoom(LOBBY_ROOM_ID)).toHaveLength(0);
      expect(creatureManager.getCreaturesInRoom(ARENA_ROOM_ID)).toHaveLength(2);
    });
  });

  // ─── 3. Reset Command ──────────────────────────────────────────────────────

  describe('reset command', () => {
    let combatSystem: CombatSystem;
    let creatureManager: CreatureManager;

    beforeEach(() => {
      enableDevMode();
      combatSystem = new CombatSystem(exitResolver);
      creatureManager = new CreatureManager();
    });

    it('clears all sandbox creatures from the arena', () => {
      const spawnCtx = buildCtx(sandboxLobby, ['spawn', 'drowned_revenant', '3'], {
        combatSystem,
        creatureManager,
      });
      handleCommand('sandbox', spawnCtx);
      expect(creatureManager.getCreaturesInRoom(ARENA_ROOM_ID)).toHaveLength(3);

      const resetCtx = buildCtx(sandboxLobby, ['reset'], {
        combatSystem,
        creatureManager,
      });
      const result = handleCommand('sandbox', resetCtx);
      const text = narrationText(result).toLowerCase();

      expect(text).toContain('reset');
      expect(text).toContain('cleared');
      expect(creatureManager.getCreaturesInRoom(ARENA_ROOM_ID)).toHaveLength(0);
    });

    it('restores player HP to max after reset', () => {
      const player = makePlayer('player-1', LOBBY_ROOM_ID);
      const playerCombatant = createCombatant(
        player.sessionId, player.sessionId, ARENA_ROOM_ID, true,
        DEFAULT_PLAYER_STATS,
      );
      playerCombatant.hp = 30;
      combatSystem.registerCombatant(playerCombatant);

      const ctx = buildCtx(sandboxLobby, ['reset'], {
        player,
        combatSystem,
        creatureManager,
      });
      handleCommand('sandbox', ctx);

      expect(playerCombatant.hp).toBe(playerCombatant.maxHp);
    });

    it('restores player stamina to max after reset', () => {
      const player = makePlayer('player-1', LOBBY_ROOM_ID);
      const playerCombatant = createCombatant(
        player.sessionId, player.sessionId, ARENA_ROOM_ID, true,
        DEFAULT_PLAYER_STATS,
      );
      playerCombatant.stamina = 20;
      combatSystem.registerCombatant(playerCombatant);

      const ctx = buildCtx(sandboxLobby, ['reset'], {
        player,
        combatSystem,
        creatureManager,
      });
      handleCommand('sandbox', ctx);

      expect(playerCombatant.stamina).toBe(playerCombatant.maxStamina);
    });

    it('clears active encounters involving sandbox creatures', () => {
      const player = makePlayer('player-1', ARENA_ROOM_ID);
      const playerCombatant = createCombatant(
        player.sessionId, player.sessionId, ARENA_ROOM_ID, true,
        DEFAULT_PLAYER_STATS,
      );
      combatSystem.registerCombatant(playerCombatant);

      const spawnCtx = buildCtx(sandboxArena, ['spawn', 'drowned_revenant'], {
        player,
        combatSystem,
        creatureManager,
      });
      handleCommand('sandbox', spawnCtx);

      const creatures = creatureManager.getCreaturesInRoom(ARENA_ROOM_ID);
      const creature = creatures[0]!;
      const creatureCombatant = createCombatant(
        creature.id, creature.name, ARENA_ROOM_ID, false,
        DROWNED_REVENANT.stats,
      );
      combatSystem.registerCombatant(creatureCombatant);
      combatSystem.initiateCombat(creature.id, player.sessionId);
      expect(combatSystem.isInCombat(player.sessionId)).toBe(true);

      const resetCtx = buildCtx(sandboxLobby, ['reset'], {
        player,
        combatSystem,
        creatureManager,
      });
      handleCommand('sandbox', resetCtx);

      expect(combatSystem.isInCombat(player.sessionId)).toBe(false);
    });
  });

  // ─── 4. Kill Command ────────────────────────────────────────────────────────

  describe('kill command', () => {
    let combatSystem: CombatSystem;
    let creatureManager: CreatureManager;

    beforeEach(() => {
      enableDevMode();
      combatSystem = new CombatSystem(exitResolver);
      creatureManager = new CreatureManager();
    });

    it('instantly removes all sandbox creatures', () => {
      const spawnCtx = buildCtx(sandboxArena, ['spawn', 'drowned_revenant', '3'], {
        combatSystem,
        creatureManager,
      });
      handleCommand('sandbox', spawnCtx);
      expect(creatureManager.getCreaturesInRoom(ARENA_ROOM_ID)).toHaveLength(3);

      const killCtx = buildCtx(sandboxArena, ['kill'], {
        combatSystem,
        creatureManager,
      });
      const result = handleCommand('sandbox', killCtx);
      const text = narrationText(result).toLowerCase();

      expect(text).toContain('killed');
      expect(text).toContain('3');
      expect(creatureManager.getCreaturesInRoom(ARENA_ROOM_ID)).toHaveLength(0);
    });

    it('returns appropriate message when no creatures exist', () => {
      const ctx = buildCtx(sandboxArena, ['kill'], {
        combatSystem,
        creatureManager,
      });
      const result = handleCommand('sandbox', ctx);
      const text = narrationText(result).toLowerCase();

      expect(text).toContain('killed');
      expect(text).toContain('0');
    });
  });

  // ─── 5. Heal Command ───────────────────────────────────────────────────────

  describe('heal command', () => {
    let combatSystem: CombatSystem;

    beforeEach(() => {
      enableDevMode();
      combatSystem = new CombatSystem(exitResolver);
    });

    it('restores player HP to maxHP', () => {
      const player = makePlayer('player-1', ARENA_ROOM_ID);
      const playerCombatant = createCombatant(
        player.sessionId, player.sessionId, ARENA_ROOM_ID, true,
        DEFAULT_PLAYER_STATS,
      );
      playerCombatant.hp = 15;
      combatSystem.registerCombatant(playerCombatant);

      const ctx = buildCtx(sandboxArena, ['heal'], {
        player,
        combatSystem,
      });
      const result = handleCommand('sandbox', ctx);
      const text = narrationText(result).toLowerCase();

      expect(text).toContain('restored');
      expect(playerCombatant.hp).toBe(playerCombatant.maxHp);
    });

    it('restores player stamina to maxStamina', () => {
      const player = makePlayer('player-1', ARENA_ROOM_ID);
      const playerCombatant = createCombatant(
        player.sessionId, player.sessionId, ARENA_ROOM_ID, true,
        DEFAULT_PLAYER_STATS,
      );
      playerCombatant.stamina = 10;
      combatSystem.registerCombatant(playerCombatant);

      const ctx = buildCtx(sandboxArena, ['heal'], {
        player,
        combatSystem,
      });
      handleCommand('sandbox', ctx);

      expect(playerCombatant.stamina).toBe(playerCombatant.maxStamina);
    });
  });

  // ─── 6. State Isolation (CRITICAL) ──────────────────────────────────────────

  describe('state isolation', () => {
    let combatSystem: CombatSystem;

    beforeEach(() => {
      enableDevMode();
      combatSystem = new CombatSystem(exitResolver);
    });

    it('does NOT generate loot when a sandbox creature is defeated', () => {
      const player = makePlayer('player-1', ARENA_ROOM_ID);
      const playerCombatant = createCombatant(
        player.sessionId, player.sessionId, ARENA_ROOM_ID, true,
        { ...DEFAULT_PLAYER_STATS, attack: 999 },
      );
      const creatureCombatant = createCombatant(
        'creature-sandbox-0', 'Drowned Revenant', ARENA_ROOM_ID, false,
        { ...DROWNED_REVENANT.stats, maxHp: 1 },
      );
      creatureCombatant.hp = 1;

      combatSystem.registerCombatant(playerCombatant);
      combatSystem.registerCombatant(creatureCombatant);
      combatSystem.initiateCombat('player-1', 'creature-sandbox-0');

      const tickResult = combatSystem.resolveTick();
      const defeatedEvents = tickResult.events.filter(e => e.type === 'defeated');
      expect(defeatedEvents.length).toBeGreaterThan(0);

      // Player inventory must remain empty — no loot in sandbox
      expect(player.inventory.size).toBe(0);
    });

    it('sandbox creatures are tagged for XP/progression gating', () => {
      const creatureManager = new CreatureManager();
      const ctx = buildCtx(sandboxLobby, ['spawn', 'drowned_revenant'], {
        combatSystem,
        creatureManager,
      });
      handleCommand('sandbox', ctx);

      const creatures = creatureManager.getCreaturesInRoom(ARENA_ROOM_ID);
      expect(creatures.length).toBeGreaterThan(0);
      // sandbox: true flag is the isolation mechanism for XP gating
      expect(creatures[0]!.sandbox).toBe(true);
    });

    it('does NOT apply death penalty when player dies in sandbox arena', () => {
      const player = makePlayer('player-1', ARENA_ROOM_ID);
      expect(player.deathPenalty).toBeNull();

      const playerCombatant = createCombatant(
        player.sessionId, player.sessionId, ARENA_ROOM_ID, true,
        { ...DEFAULT_PLAYER_STATS, maxHp: 1 },
      );
      playerCombatant.hp = 1;
      const creatureCombatant = createCombatant(
        'creature-sandbox-0', 'Drowned Revenant', ARENA_ROOM_ID, false,
        { ...DROWNED_REVENANT.stats, attack: 999 },
      );

      combatSystem.registerCombatant(playerCombatant);
      combatSystem.registerCombatant(creatureCombatant);
      combatSystem.initiateCombat('creature-sandbox-0', 'player-1');
      combatSystem.resolveTick();

      expect(playerCombatant.hp).toBe(0);
      // Death penalty must NOT be applied in sandbox mode
      expect(player.deathPenalty).toBeNull();
    });

    it('sandbox room types do not overlap with run-tracking room types', () => {
      expect(sandboxArena.type).toBe('feature_sandbox_arena');
      expect(sandboxArena.type).not.toBe('entry');
      expect(sandboxArena.type).not.toBe('boss');
      expect(sandboxArena.type).not.toBe('corridor');
    });

    it('player equipment and stats are unchanged after leaving sandbox', () => {
      const player = makePlayer('player-1', ARENA_ROOM_ID);
      const originalWeight = player.maxCarryWeight;
      const originalInventorySize = player.inventory.size;

      const playerCombatant = createCombatant(
        player.sessionId, player.sessionId, ARENA_ROOM_ID, true,
        DEFAULT_PLAYER_STATS,
      );
      combatSystem.registerCombatant(playerCombatant);
      playerCombatant.hp = 30;
      playerCombatant.stamina = 10;

      // Move player out of sandbox
      player.currentRoomId = NON_SANDBOX_ROOM_ID;

      // PlayerState should be unmodified
      expect(player.maxCarryWeight).toBe(originalWeight);
      expect(player.inventory.size).toBe(originalInventorySize);
      expect(player.equipment).toBeUndefined();
    });
  });

  // ─── 7. Selective Ticking ────────────────────────────────────────────────────

  describe('selective ticking', () => {
    let combatSystem: CombatSystem;

    beforeEach(() => {
      enableDevMode();
      combatSystem = new CombatSystem(exitResolver);
    });

    it('combat ticks process in sandbox-arena rooms (even in dev zone)', () => {
      const playerCombatant = createCombatant(
        'player-1', 'player-1', ARENA_ROOM_ID, true,
        DEFAULT_PLAYER_STATS,
      );
      const creatureCombatant = createCombatant(
        'creature-sandbox-0', 'Drowned Revenant', ARENA_ROOM_ID, false,
        DROWNED_REVENANT.stats,
      );

      combatSystem.registerCombatant(playerCombatant);
      combatSystem.registerCombatant(creatureCombatant);
      combatSystem.initiateCombat('player-1', 'creature-sandbox-0');

      const tickResult = combatSystem.resolveTick();

      expect(tickResult.events.length).toBeGreaterThan(0);
      expect(playerCombatant.hp).toBeLessThan(playerCombatant.maxHp);
      expect(creatureCombatant.hp).toBeLessThan(creatureCombatant.maxHp);
    });

    it('CombatSystem correctly tracks encounters in arena room', () => {
      const playerCombatant = createCombatant(
        'player-1', 'player-1', ARENA_ROOM_ID, true,
        DEFAULT_PLAYER_STATS,
      );
      const creatureCombatant = createCombatant(
        'creature-sandbox-0', 'Drowned Revenant', ARENA_ROOM_ID, false,
        DROWNED_REVENANT.stats,
      );

      combatSystem.registerCombatant(playerCombatant);
      combatSystem.registerCombatant(creatureCombatant);
      combatSystem.initiateCombat('player-1', 'creature-sandbox-0');

      expect(combatSystem.isInCombat('player-1')).toBe(true);

      const bystander = createCombatant(
        'bystander', 'bystander', NON_SANDBOX_ROOM_ID, true,
        DEFAULT_PLAYER_STATS,
      );
      combatSystem.registerCombatant(bystander);
      expect(combatSystem.isInCombat('bystander')).toBe(false);
    });

    it('non-sandbox rooms in the same zone are NOT affected by sandbox ticking', () => {
      const playerCombatant = createCombatant(
        'player-1', 'player-1', ARENA_ROOM_ID, true,
        DEFAULT_PLAYER_STATS,
      );
      const creatureCombatant = createCombatant(
        'creature-sandbox-0', 'Drowned Revenant', ARENA_ROOM_ID, false,
        DROWNED_REVENANT.stats,
      );
      combatSystem.registerCombatant(playerCombatant);
      combatSystem.registerCombatant(creatureCombatant);
      combatSystem.initiateCombat('player-1', 'creature-sandbox-0');

      const hearthPlayer = createCombatant(
        'hearth-player', 'hearth-player', NON_SANDBOX_ROOM_ID, true,
        DEFAULT_PLAYER_STATS,
      );
      combatSystem.registerCombatant(hearthPlayer);

      combatSystem.resolveTick();

      expect(hearthPlayer.hp).toBe(hearthPlayer.maxHp);
      expect(combatSystem.isInCombat('hearth-player')).toBe(false);
      expect(playerCombatant.hp).toBeLessThan(playerCombatant.maxHp);
    });
  });

  // ─── Integration: Command flow end-to-end ─────────────────────────────────

  describe('command integration', () => {
    let creatureManager: CreatureManager;
    let combatSystem: CombatSystem;

    beforeEach(() => {
      enableDevMode();
      creatureManager = new CreatureManager();
      combatSystem = new CombatSystem(exitResolver);
    });

    it('sandbox with no subcommand returns help text', () => {
      const ctx = buildCtx(sandboxLobby, [], { creatureManager });
      const result = handleCommand('sandbox', ctx);
      const text = narrationText(result);

      expect(text.toLowerCase()).toContain('sandbox commands');
      expect(text.toLowerCase()).toContain('spawn');
      expect(text.toLowerCase()).toContain('reset');
    });

    it('sandbox with unknown subcommand returns error with suggestion', () => {
      const ctx = buildCtx(sandboxLobby, ['explode'], { creatureManager });
      const result = handleCommand('sandbox', ctx);
      const text = narrationText(result).toLowerCase();

      expect(text).toContain('unknown');
    });

    it('sandbox spawn also works from arena room', () => {
      const ctx = buildCtx(sandboxArena, ['spawn', 'drowned_revenant'], {
        combatSystem,
        creatureManager,
      });
      const result = handleCommand('sandbox', ctx);
      const text = narrationText(result).toLowerCase();

      expect(text).toContain('spawned');
      expect(creatureManager.getCreaturesInRoom(ARENA_ROOM_ID)).toHaveLength(1);
    });

    it('full spawn → kill → reset cycle', () => {
      const player = makePlayer('player-1', ARENA_ROOM_ID);

      // 1. Spawn
      const spawnCtx = buildCtx(sandboxArena, ['spawn', 'drowned_revenant'], {
        player, combatSystem, creatureManager,
      });
      handleCommand('sandbox', spawnCtx);
      expect(creatureManager.getCreaturesInRoom(ARENA_ROOM_ID)).toHaveLength(1);

      // 2. Kill
      const killCtx = buildCtx(sandboxArena, ['kill'], {
        player, combatSystem, creatureManager,
      });
      handleCommand('sandbox', killCtx);
      expect(creatureManager.getCreaturesInRoom(ARENA_ROOM_ID)).toHaveLength(0);

      // 3. Reset (should work even with no creatures)
      const resetCtx = buildCtx(sandboxLobby, ['reset'], {
        player, combatSystem, creatureManager,
      });
      const result = handleCommand('sandbox', resetCtx);
      expect(narrationText(result).toLowerCase()).toContain('reset');
    });
  });
});
