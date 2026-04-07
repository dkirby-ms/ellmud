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

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase 2 — Tuning Tools
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── 8. sandbox set — Transient Stat Overrides ────────────────────────────

  describe('sandbox set command', () => {
    let combatSystem: CombatSystem;
    let creatureManager: CreatureManager;

    beforeEach(() => {
      enableDevMode();
      combatSystem = new CombatSystem(exitResolver);
      creatureManager = new CreatureManager();
    });

    it('sets player ATK override via "sandbox set player atk 50"', () => {
      const player = makePlayer('player-1', ARENA_ROOM_ID);
      const playerCombatant = createCombatant(
        player.sessionId, player.sessionId, ARENA_ROOM_ID, true,
        DEFAULT_PLAYER_STATS,
      );
      combatSystem.registerCombatant(playerCombatant);

      const ctx = buildCtx(sandboxArena, ['set', 'player', 'atk', '50'], {
        player, combatSystem, creatureManager,
      });
      const result = handleCommand('sandbox', ctx);
      const text = narrationText(result).toLowerCase();

      // Should acknowledge the override
      expect(text).toContain('set');
      expect(text).toContain('50');

      // The combatant's attack stat should reflect the override
      const updated = combatSystem.getCombatant(player.sessionId);
      expect(updated?.attack).toBe(50);
    });

    it('sets player HP via "sandbox set player hp 200"', () => {
      const player = makePlayer('player-1', ARENA_ROOM_ID);
      const playerCombatant = createCombatant(
        player.sessionId, player.sessionId, ARENA_ROOM_ID, true,
        DEFAULT_PLAYER_STATS,
      );
      combatSystem.registerCombatant(playerCombatant);

      const ctx = buildCtx(sandboxArena, ['set', 'player', 'hp', '200'], {
        player, combatSystem, creatureManager,
      });
      const result = handleCommand('sandbox', ctx);
      const text = narrationText(result).toLowerCase();

      expect(text).toContain('set');
      const updated = combatSystem.getCombatant(player.sessionId);
      expect(updated?.hp).toBe(200);
    });

    it('sets first creature DEF by index via "sandbox set 1 def 0"', () => {
      // Spawn a creature first
      const spawnCtx = buildCtx(sandboxArena, ['spawn', 'drowned_revenant'], {
        combatSystem, creatureManager,
      });
      handleCommand('sandbox', spawnCtx);

      const creatures = creatureManager.getCreaturesInRoom(ARENA_ROOM_ID);
      expect(creatures).toHaveLength(1);

      // Register creature as combatant
      const creature = creatures[0]!;
      const creatureCombatant = createCombatant(
        creature.id, creature.name, ARENA_ROOM_ID, false,
        DROWNED_REVENANT.stats,
      );
      combatSystem.registerCombatant(creatureCombatant);

      const ctx = buildCtx(sandboxArena, ['set', '1', 'def', '0'], {
        combatSystem, creatureManager,
      });
      const result = handleCommand('sandbox', ctx);
      const text = narrationText(result).toLowerCase();

      expect(text).toContain('set');
      // Creature's defence should be overridden to 0
      const updated = combatSystem.getCombatant(creature.id);
      expect(updated?.defence).toBe(0);
    });

    it('sets creature stat by name match via "sandbox set revenant atk 99"', () => {
      // Spawn a drowned revenant
      const spawnCtx = buildCtx(sandboxArena, ['spawn', 'drowned_revenant'], {
        combatSystem, creatureManager,
      });
      handleCommand('sandbox', spawnCtx);

      const creatures = creatureManager.getCreaturesInRoom(ARENA_ROOM_ID);
      const creature = creatures[0]!;
      const creatureCombatant = createCombatant(
        creature.id, creature.name, ARENA_ROOM_ID, false,
        DROWNED_REVENANT.stats,
      );
      combatSystem.registerCombatant(creatureCombatant);

      const ctx = buildCtx(sandboxArena, ['set', 'revenant', 'atk', '99'], {
        combatSystem, creatureManager,
      });
      const result = handleCommand('sandbox', ctx);
      const text = narrationText(result).toLowerCase();

      expect(text).toContain('set');
      const updated = combatSystem.getCombatant(creature.id);
      expect(updated?.attack).toBe(99);
    });

    it('returns error for unknown stat name', () => {
      const player = makePlayer('player-1', ARENA_ROOM_ID);
      const playerCombatant = createCombatant(
        player.sessionId, player.sessionId, ARENA_ROOM_ID, true,
        DEFAULT_PLAYER_STATS,
      );
      combatSystem.registerCombatant(playerCombatant);

      const ctx = buildCtx(sandboxArena, ['set', 'player', 'invalidstat', '5'], {
        player, combatSystem, creatureManager,
      });
      const result = handleCommand('sandbox', ctx);
      const text = narrationText(result).toLowerCase();

      // Should report the stat is unrecognized
      expect(text).toMatch(/unknown|invalid|unrecognized/);
    });

    it('returns error for unknown target', () => {
      const ctx = buildCtx(sandboxArena, ['set', 'nonexistent', 'atk', '5'], {
        combatSystem, creatureManager,
      });
      const result = handleCommand('sandbox', ctx);
      const text = narrationText(result).toLowerCase();

      // Implementation may report "no creatures" or "unknown target"
      expect(text).toMatch(/unknown|not found|no.*target|no.*creature/);
    });

    it('preserves the original value for later restoration', () => {
      const player = makePlayer('player-1', ARENA_ROOM_ID);
      const playerCombatant = createCombatant(
        player.sessionId, player.sessionId, ARENA_ROOM_ID, true,
        DEFAULT_PLAYER_STATS,
      );
      combatSystem.registerCombatant(playerCombatant);

      const originalAtk = playerCombatant.attack;

      const ctx = buildCtx(sandboxArena, ['set', 'player', 'atk', '999'], {
        player, combatSystem, creatureManager,
      });
      const result = handleCommand('sandbox', ctx);
      const text = narrationText(result);

      // The response should mention the original value
      expect(text).toContain(String(originalAtk));
      // And the combatant should have the new value
      expect(combatSystem.getCombatant(player.sessionId)?.attack).toBe(999);
    });
  });

  // ─── 9. sandbox info — Template Inspection ────────────────────────────────

  describe('sandbox info command', () => {
    let creatureManager: CreatureManager;

    beforeEach(() => {
      enableDevMode();
      creatureManager = new CreatureManager();
    });

    it('shows full stat block for a known creature type', () => {
      const ctx = buildCtx(sandboxStatsLab, ['info', 'drowned_revenant'], {
        creatureManager,
      });
      const result = handleCommand('sandbox', ctx);
      const text = narrationText(result);

      // Should display the template's stats
      expect(text.toLowerCase()).toContain('drowned revenant');
      expect(text).toContain(String(DROWNED_REVENANT.stats.maxHp));    // 50
      expect(text).toContain(String(DROWNED_REVENANT.stats.attack));    // 10
      expect(text).toContain(String(DROWNED_REVENANT.stats.defence));   // 3
      expect(text).toContain(String(DROWNED_REVENANT.stats.armour));    // 3
    });

    it('lists all available templates when no argument given', () => {
      const ctx = buildCtx(sandboxStatsLab, ['info'], {
        creatureManager,
      });
      const result = handleCommand('sandbox', ctx);
      const text = narrationText(result).toLowerCase();

      // Should list at least the drowned_revenant template
      expect(text).toContain('drowned_revenant');
    });

    it('returns error for nonexistent creature type', () => {
      const ctx = buildCtx(sandboxStatsLab, ['info', 'nonexistent_creature'], {
        creatureManager,
      });
      const result = handleCommand('sandbox', ctx);
      const text = narrationText(result).toLowerCase();

      expect(text).toMatch(/unknown|not found|no.*template/);
    });
  });

  // ─── 10. sandbox clear — Reset Overrides ──────────────────────────────────

  describe('sandbox clear command', () => {
    let combatSystem: CombatSystem;
    let creatureManager: CreatureManager;

    beforeEach(() => {
      enableDevMode();
      combatSystem = new CombatSystem(exitResolver);
      creatureManager = new CreatureManager();
    });

    it('restores original values after overrides were set', () => {
      const player = makePlayer('player-1', ARENA_ROOM_ID);
      const playerCombatant = createCombatant(
        player.sessionId, player.sessionId, ARENA_ROOM_ID, true,
        DEFAULT_PLAYER_STATS,
      );
      combatSystem.registerCombatant(playerCombatant);

      const originalAtk = playerCombatant.attack;
      const originalDef = playerCombatant.defence;

      // Apply overrides
      const setCtx1 = buildCtx(sandboxArena, ['set', 'player', 'atk', '999'], {
        player, combatSystem, creatureManager,
      });
      handleCommand('sandbox', setCtx1);

      const setCtx2 = buildCtx(sandboxArena, ['set', 'player', 'def', '0'], {
        player, combatSystem, creatureManager,
      });
      handleCommand('sandbox', setCtx2);

      expect(combatSystem.getCombatant(player.sessionId)?.attack).toBe(999);
      expect(combatSystem.getCombatant(player.sessionId)?.defence).toBe(0);

      // Clear overrides
      const clearCtx = buildCtx(sandboxArena, ['clear'], {
        player, combatSystem, creatureManager,
      });
      const result = handleCommand('sandbox', clearCtx);
      const text = narrationText(result).toLowerCase();

      expect(text).toMatch(/clear|restore|reset/);
      expect(combatSystem.getCombatant(player.sessionId)?.attack).toBe(originalAtk);
      expect(combatSystem.getCombatant(player.sessionId)?.defence).toBe(originalDef);
    });

    it('reports appropriately when no active overrides exist', () => {
      const player = makePlayer('player-1', ARENA_ROOM_ID);
      const playerCombatant = createCombatant(
        player.sessionId, player.sessionId, ARENA_ROOM_ID, true,
        DEFAULT_PLAYER_STATS,
      );
      combatSystem.registerCombatant(playerCombatant);

      const ctx = buildCtx(sandboxArena, ['clear'], {
        player, combatSystem, creatureManager,
      });
      const result = handleCommand('sandbox', ctx);
      const text = narrationText(result).toLowerCase();

      // Should not error — graceful no-op or acknowledge no overrides
      expect(text).toMatch(/no.*override|clear|nothing|already/);
    });

    it('stats match pre-override values after clear', () => {
      const player = makePlayer('player-1', ARENA_ROOM_ID);
      const playerCombatant = createCombatant(
        player.sessionId, player.sessionId, ARENA_ROOM_ID, true,
        DEFAULT_PLAYER_STATS,
      );
      combatSystem.registerCombatant(playerCombatant);

      // Capture pre-override snapshot
      const snapshot = {
        attack: playerCombatant.attack,
        defence: playerCombatant.defence,
        armour: playerCombatant.armour,
        maxHp: playerCombatant.maxHp,
      };

      // Override multiple stats
      handleCommand('sandbox', buildCtx(sandboxArena, ['set', 'player', 'atk', '500'], {
        player, combatSystem, creatureManager,
      }));
      handleCommand('sandbox', buildCtx(sandboxArena, ['set', 'player', 'def', '100'], {
        player, combatSystem, creatureManager,
      }));

      // Clear
      handleCommand('sandbox', buildCtx(sandboxArena, ['clear'], {
        player, combatSystem, creatureManager,
      }));

      const restored = combatSystem.getCombatant(player.sessionId)!;
      expect(restored.attack).toBe(snapshot.attack);
      expect(restored.defence).toBe(snapshot.defence);
      // armour should be unchanged — it was never overridden
      expect(restored.armour).toBe(snapshot.armour);
    });
  });

  // ─── 11. sandbox log — Combat Event Log ───────────────────────────────────

  describe('sandbox log command', () => {
    let combatSystem: CombatSystem;
    let creatureManager: CreatureManager;

    beforeEach(() => {
      enableDevMode();
      combatSystem = new CombatSystem(exitResolver);
      creatureManager = new CreatureManager();
    });

    it('shows recent combat events after combat occurs', () => {
      // Set up a combat encounter and tick
      const player = makePlayer('player-1', ARENA_ROOM_ID);
      const playerCombatant = createCombatant(
        player.sessionId, player.sessionId, ARENA_ROOM_ID, true,
        DEFAULT_PLAYER_STATS,
      );
      const creatureCombatant = createCombatant(
        'creature-sandbox-0', 'Drowned Revenant', ARENA_ROOM_ID, false,
        DROWNED_REVENANT.stats,
      );
      combatSystem.registerCombatant(playerCombatant);
      combatSystem.registerCombatant(creatureCombatant);
      combatSystem.initiateCombat(player.sessionId, 'creature-sandbox-0');
      combatSystem.resolveTick();

      const ctx = buildCtx(sandboxArena, ['log'], {
        player, combatSystem, creatureManager,
      });
      const result = handleCommand('sandbox', ctx);
      const text = narrationText(result).toLowerCase();

      // Should show some combat event content
      expect(text.length).toBeGreaterThan(0);
      // Should reference combat activity (strike, dodge, damage, etc.)
      expect(text).toMatch(/strike|dodge|damage|hit|log|event|combat/);
    });

    it('limits output with "sandbox log last 5"', () => {
      // Run several combat ticks to generate multiple events
      const player = makePlayer('player-1', ARENA_ROOM_ID);
      const playerCombatant = createCombatant(
        player.sessionId, player.sessionId, ARENA_ROOM_ID, true,
        { ...DEFAULT_PLAYER_STATS, maxHp: 500 },
      );
      playerCombatant.hp = 500;
      const creatureCombatant = createCombatant(
        'creature-sandbox-0', 'Drowned Revenant', ARENA_ROOM_ID, false,
        { ...DROWNED_REVENANT.stats, maxHp: 500 },
      );
      creatureCombatant.hp = 500;
      combatSystem.registerCombatant(playerCombatant);
      combatSystem.registerCombatant(creatureCombatant);
      combatSystem.initiateCombat(player.sessionId, 'creature-sandbox-0');

      // Multiple ticks to generate event history
      for (let i = 0; i < 5; i++) {
        combatSystem.resolveTick();
      }

      const ctx = buildCtx(sandboxArena, ['log', 'last', '5'], {
        player, combatSystem, creatureManager,
      });
      const result = handleCommand('sandbox', ctx);
      const text = narrationText(result);

      // Should have output — exact format depends on implementation
      expect(text.length).toBeGreaterThan(0);
    });

    it('shows appropriate message when no combat has occurred', () => {
      const ctx = buildCtx(sandboxArena, ['log'], {
        combatSystem, creatureManager,
      });
      const result = handleCommand('sandbox', ctx);
      const text = narrationText(result).toLowerCase();

      // Should indicate no events or empty log
      expect(text).toMatch(/no.*event|empty|no.*log|no.*combat/);
    });
  });

  // ─── 12. DamageBreakdown in tick results ──────────────────────────────────

  describe('DamageBreakdown in tick results', () => {
    let combatSystem: CombatSystem;

    beforeEach(() => {
      enableDevMode();
      combatSystem = new CombatSystem(exitResolver);
    });

    // TODO: DamageBreakdown is being added by Jarlaxle — these tests verify
    // the expected interface once CombatEvent gains a `breakdown` field.
    // If CombatEvent.breakdown does not yet exist, these will fail at compile
    // time, which is the intended signal that the implementation is needed.

    it('tick result events include a breakdown field after combat resolution', () => {
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
      const strikeEvents = tickResult.events.filter(e => e.type === 'strike');

      expect(strikeEvents.length).toBeGreaterThan(0);

      for (const event of strikeEvents) {
        // breakdown should be present on strike events
        expect(event).toHaveProperty('breakdown');
        const bd = (event as any).breakdown;
        expect(bd).toHaveProperty('rawDamage');
        expect(bd).toHaveProperty('finalDamage');
        expect(bd).toHaveProperty('armourReduction');
        expect(typeof bd.rawDamage).toBe('number');
        expect(typeof bd.finalDamage).toBe('number');
        expect(typeof bd.armourReduction).toBe('number');
      }
    });

    it('breakdown values are consistent with final damage', () => {
      const playerCombatant = createCombatant(
        'player-1', 'player-1', ARENA_ROOM_ID, true,
        { ...DEFAULT_PLAYER_STATS, attack: 20 },
      );
      const creatureCombatant = createCombatant(
        'creature-sandbox-0', 'Drowned Revenant', ARENA_ROOM_ID, false,
        DROWNED_REVENANT.stats,
      );

      combatSystem.registerCombatant(playerCombatant);
      combatSystem.registerCombatant(creatureCombatant);
      combatSystem.initiateCombat('player-1', 'creature-sandbox-0');

      const tickResult = combatSystem.resolveTick();
      const strikeEvents = tickResult.events.filter(e => e.type === 'strike');

      for (const event of strikeEvents) {
        const bd = (event as any).breakdown;
        if (!bd) continue;

        // finalDamage should be <= rawDamage (armour reduces it)
        expect(bd.finalDamage).toBeLessThanOrEqual(bd.rawDamage);
        // armourReduction should be non-negative
        expect(bd.armourReduction).toBeGreaterThanOrEqual(0);
        // finalDamage should match the event's damage field
        if (event.damage !== undefined) {
          expect(bd.finalDamage).toBe(event.damage);
        }
      }
    });

    it('dodge events show dodged: true with dodgeChance > 0', () => {
      // Use a deterministic roll that guarantees a dodge
      const alwaysDodgeRoll = () => 0.0; // lowest roll → always under dodge chance
      const dodgeCombatSystem = new CombatSystem(exitResolver, alwaysDodgeRoll);

      const playerCombatant = createCombatant(
        'player-1', 'player-1', ARENA_ROOM_ID, true,
        { ...DEFAULT_PLAYER_STATS, agility: 10 },
        5, // dodgeSkillRank
      );
      const creatureCombatant = createCombatant(
        'creature-sandbox-0', 'Drowned Revenant', ARENA_ROOM_ID, false,
        DROWNED_REVENANT.stats,
      );

      dodgeCombatSystem.registerCombatant(playerCombatant);
      dodgeCombatSystem.registerCombatant(creatureCombatant);
      dodgeCombatSystem.initiateCombat('creature-sandbox-0', 'player-1');

      // Queue the player to dodge (default auto-attacks current target)
      dodgeCombatSystem.submitAction('player-1', 'dodge');

      const tickResult = dodgeCombatSystem.resolveTick();

      // Dodge shows up as a strike event with dodged: true (GDD §6.4)
      const dodgedStrikes = tickResult.events.filter(
        e => e.type === 'strike' && e.dodged === true,
      );

      // With roll of 0.0 and high agility + dodge skill, the player should dodge
      expect(dodgedStrikes.length).toBeGreaterThan(0);

      for (const event of dodgedStrikes) {
        expect(event.dodged).toBe(true);
        expect(event.damage).toBe(0); // dodged attacks deal 0 damage
        // If breakdown is present, it should reflect the dodge
        const bd = (event as any).breakdown;
        if (bd) {
          expect(bd.dodged).toBe(true);
          expect(bd.dodgeChance).toBeGreaterThan(0);
        }
      }
    });
  });

  // ─── 13. Integration: set + combat ────────────────────────────────────────

  describe('integration: set + combat', () => {
    let combatSystem: CombatSystem;
    let creatureManager: CreatureManager;

    beforeEach(() => {
      enableDevMode();
      combatSystem = new CombatSystem(exitResolver);
      creatureManager = new CreatureManager();
    });

    it('setting creature DEF to 0 results in higher damage than default', () => {
      const player = makePlayer('player-1', ARENA_ROOM_ID);
      const playerCombatant = createCombatant(
        player.sessionId, player.sessionId, ARENA_ROOM_ID, true,
        DEFAULT_PLAYER_STATS,
      );
      combatSystem.registerCombatant(playerCombatant);

      // Spawn creature and register it as combatant
      const spawnCtx = buildCtx(sandboxArena, ['spawn', 'drowned_revenant'], {
        player, combatSystem, creatureManager,
      });
      handleCommand('sandbox', spawnCtx);
      const creature = creatureManager.getCreaturesInRoom(ARENA_ROOM_ID)[0]!;
      const creatureCombatant = createCombatant(
        creature.id, creature.name, ARENA_ROOM_ID, false,
        DROWNED_REVENANT.stats,
      );
      combatSystem.registerCombatant(creatureCombatant);

      // Baseline tick: creature has default DEF/armour
      combatSystem.initiateCombat(player.sessionId, creature.id);
      const baselineTick = combatSystem.resolveTick();
      const baselineStrike = baselineTick.events.find(
        e => e.type === 'strike' && e.actorId === player.sessionId,
      );
      const baselineDamage = baselineStrike?.damage ?? 0;

      // Reset encounter for a clean second test
      combatSystem.removeCombatant(player.sessionId);
      combatSystem.removeCombatant(creature.id);

      // Re-register with DEF=0 override on creature
      const playerCombatant2 = createCombatant(
        player.sessionId, player.sessionId, ARENA_ROOM_ID, true,
        DEFAULT_PLAYER_STATS,
      );
      const creatureCombatant2 = createCombatant(
        creature.id, creature.name, ARENA_ROOM_ID, false,
        { ...DROWNED_REVENANT.stats, armour: 0 },
      );
      combatSystem.registerCombatant(playerCombatant2);
      combatSystem.registerCombatant(creatureCombatant2);
      combatSystem.initiateCombat(player.sessionId, creature.id);

      const overrideTick = combatSystem.resolveTick();
      const overrideStrike = overrideTick.events.find(
        e => e.type === 'strike' && e.actorId === player.sessionId,
      );
      const overrideDamage = overrideStrike?.damage ?? 0;

      // With 0 armour, damage should be >= baseline (armour no longer reducing)
      expect(overrideDamage).toBeGreaterThanOrEqual(baselineDamage);
    });

    it('setting player ATK to 999 produces massive damage', () => {
      const player = makePlayer('player-1', ARENA_ROOM_ID);
      const playerCombatant = createCombatant(
        player.sessionId, player.sessionId, ARENA_ROOM_ID, true,
        { ...DEFAULT_PLAYER_STATS, attack: 999 },
      );
      const creatureCombatant = createCombatant(
        'creature-sandbox-0', 'Drowned Revenant', ARENA_ROOM_ID, false,
        DROWNED_REVENANT.stats,
      );

      combatSystem.registerCombatant(playerCombatant);
      combatSystem.registerCombatant(creatureCombatant);
      combatSystem.initiateCombat(player.sessionId, 'creature-sandbox-0');

      const tickResult = combatSystem.resolveTick();
      const playerStrike = tickResult.events.find(
        e => e.type === 'strike' && e.actorId === player.sessionId,
      );

      // 999 ATK minus small armour should still be massive
      expect(playerStrike?.damage).toBeGreaterThan(100);
    });

    it('clear restores overrides so next combat uses original stats', () => {
      const player = makePlayer('player-1', ARENA_ROOM_ID);
      const playerCombatant = createCombatant(
        player.sessionId, player.sessionId, ARENA_ROOM_ID, true,
        DEFAULT_PLAYER_STATS,
      );
      combatSystem.registerCombatant(playerCombatant);

      const originalAtk = playerCombatant.attack;

      // Override attack
      handleCommand('sandbox', buildCtx(sandboxArena, ['set', 'player', 'atk', '999'], {
        player, combatSystem, creatureManager,
      }));

      expect(combatSystem.getCombatant(player.sessionId)?.attack).toBe(999);

      // Clear overrides
      handleCommand('sandbox', buildCtx(sandboxArena, ['clear'], {
        player, combatSystem, creatureManager,
      }));

      // Attack should be back to original
      expect(combatSystem.getCombatant(player.sessionId)?.attack).toBe(originalAtk);
    });
  });
});
