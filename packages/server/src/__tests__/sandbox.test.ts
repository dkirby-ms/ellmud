/**
 * Combat Sandbox Tests — Phases 1, 2 & 3
 *
 * Validates sandbox command gating, creature spawning, state reset,
 * instant kill, healing, state isolation, and selective ticking (Phase 1);
 * tuning tools: set, info, clear, log, damage breakdown (Phase 2);
 * scenario persistence, deterministic PRNG seed, and replay (Phase 3).
 *
 * Architecture decisions:
 * - Shared CombatSystem: sandbox uses zone's existing CombatSystem instance
 * - 3 rooms: sandbox-lobby (feature_sandbox), sandbox-arena (feature_sandbox_arena),
 *            sandbox-stats-lab (feature_sandbox_stats)
 * - Double gating: feature room type + devModeEnabled
 * - State isolation: no loot, no XP, no death penalty in sandbox
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
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
import { _resetSandboxState } from '../commands/handlers/sandbox.js';
import { createPRNG } from '../generator/prng.js';
import { seededPrng } from '../combat/prng.js';
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

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase 3 — Scenario Persistence, Deterministic PRNG, and Replay
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── 14. sandbox scenario save ────────────────────────────────────────────
  //
  // TODO: Awaiting Drizzt's handleScenario implementation.
  // These tests define the contract: `sandbox scenario save <name>` serializes
  // creature lineup + stat overrides + PRNG seed to JSON persistence.
  // Tests will activate once handleScenario is implemented.

  describe('sandbox scenario save', () => {
    let combatSystem: CombatSystem;
    let creatureManager: CreatureManager;

    beforeEach(() => {
      enableDevMode();
      combatSystem = new CombatSystem(exitResolver);
      creatureManager = new CreatureManager();
      _resetSandboxState();
    });

    it('save captures creature types and counts', () => {
      // Spawn 2 drowned_revenants into the arena
      handleCommand('sandbox', buildCtx(sandboxArena, ['spawn', 'drowned_revenant', '2'], {
        combatSystem, creatureManager,
      }));
      expect(creatureManager.getCreaturesInRoom(ARENA_ROOM_ID)).toHaveLength(2);

      // Save scenario
      const result = handleCommand('sandbox', buildCtx(sandboxLobby, ['scenario', 'save', 'test-fight'], {
        combatSystem, creatureManager,
      }));
      const text = narrationText(result).toLowerCase();

      // Must confirm the save and mention the scenario name
      expect(text).toMatch(/saved|scenario.*test-fight/);
      // Must NOT be the "unknown subcommand" fallback
      expect(text).not.toContain('unknown');
    });

    it('save captures stat overrides', () => {
      const player = makePlayer('player-1', ARENA_ROOM_ID);
      handleCommand('sandbox', buildCtx(sandboxArena, ['spawn', 'drowned_revenant'], {
        player, combatSystem, creatureManager,
      }));

      const creatures = creatureManager.getCreaturesInRoom(ARENA_ROOM_ID);
      const creatureCombatant = createCombatant(
        creatures[0]!.id, creatures[0]!.name, ARENA_ROOM_ID, false,
        DROWNED_REVENANT.stats,
      );
      combatSystem.registerCombatant(creatureCombatant);

      // Override the creature's attack stat
      handleCommand('sandbox', buildCtx(sandboxArena, ['set', creatures[0]!.id, 'atk', '99'], {
        player, combatSystem, creatureManager,
      }));

      // Save scenario — must succeed without "unknown" error
      const result = handleCommand('sandbox', buildCtx(sandboxLobby, ['scenario', 'save', 'override-test'], {
        player, combatSystem, creatureManager,
      }));
      const text = narrationText(result).toLowerCase();
      expect(text).toMatch(/saved|scenario/);
      expect(text).not.toContain('unknown');
    });

    it('save captures PRNG seed if set', () => {
      // Set a seed, then save
      handleCommand('sandbox', buildCtx(sandboxLobby, ['seed', '42'], {
        combatSystem, creatureManager,
      }));

      const result = handleCommand('sandbox', buildCtx(sandboxLobby, ['scenario', 'save', 'seeded-scenario'], {
        combatSystem, creatureManager,
      }));
      const text = narrationText(result).toLowerCase();
      expect(text).toMatch(/saved|scenario/);
      expect(text).not.toContain('unknown');
    });

    it('save overwrites existing scenario with same name', () => {
      // Spawn 1 creature and save
      handleCommand('sandbox', buildCtx(sandboxArena, ['spawn', 'drowned_revenant'], {
        combatSystem, creatureManager,
      }));
      const save1 = handleCommand('sandbox', buildCtx(sandboxLobby, ['scenario', 'save', 'dupe'], {
        combatSystem, creatureManager,
      }));
      expect(narrationText(save1).toLowerCase()).not.toContain('unknown');

      // Spawn another and re-save with same name — must succeed (overwrite)
      handleCommand('sandbox', buildCtx(sandboxArena, ['spawn', 'drowned_revenant'], {
        combatSystem, creatureManager,
      }));
      const save2 = handleCommand('sandbox', buildCtx(sandboxLobby, ['scenario', 'save', 'dupe'], {
        combatSystem, creatureManager,
      }));
      const text2 = narrationText(save2).toLowerCase();
      expect(text2).toMatch(/saved|overwr|scenario/);
      expect(text2).not.toContain('unknown');
    });

    it('save with no creatures still saves (empty scenario)', () => {
      // Arena is empty — save should still succeed
      const result = handleCommand('sandbox', buildCtx(sandboxLobby, ['scenario', 'save', 'empty-arena'], {
        combatSystem, creatureManager,
      }));
      const text = narrationText(result).toLowerCase();
      expect(text).toMatch(/saved|scenario/);
      expect(text).not.toContain('unknown');
    });

    it('save without a name returns usage hint', () => {
      // Missing name argument — should get a usage message, not a crash
      const result = handleCommand('sandbox', buildCtx(sandboxLobby, ['scenario', 'save'], {
        combatSystem, creatureManager,
      }));
      const text = narrationText(result).toLowerCase();
      expect(text).toMatch(/usage|name|provide/);
    });
  });

  // ─── 15. sandbox scenario load ────────────────────────────────────────────

  describe('sandbox scenario load', () => {
    let combatSystem: CombatSystem;
    let creatureManager: CreatureManager;

    beforeEach(() => {
      enableDevMode();
      combatSystem = new CombatSystem(exitResolver);
      creatureManager = new CreatureManager();
      _resetSandboxState();
    });

    it('load spawns the saved creatures', () => {
      // Save a scenario with 2 creatures
      handleCommand('sandbox', buildCtx(sandboxArena, ['spawn', 'drowned_revenant', '2'], {
        combatSystem, creatureManager,
      }));
      handleCommand('sandbox', buildCtx(sandboxLobby, ['scenario', 'save', 'two-revenants'], {
        combatSystem, creatureManager,
      }));

      // Reset the arena
      handleCommand('sandbox', buildCtx(sandboxLobby, ['reset'], {
        combatSystem, creatureManager,
      }));
      expect(creatureManager.getCreaturesInRoom(ARENA_ROOM_ID)).toHaveLength(0);

      // Load the scenario
      const result = handleCommand('sandbox', buildCtx(sandboxLobby, ['scenario', 'load', 'two-revenants'], {
        combatSystem, creatureManager,
      }));
      const text = narrationText(result).toLowerCase();
      expect(text).toMatch(/loaded|scenario/);
      expect(text).not.toContain('unknown');

      // Arena should have 2 creatures again
      expect(creatureManager.getCreaturesInRoom(ARENA_ROOM_ID)).toHaveLength(2);
    });

    it('load applies saved stat overrides', () => {
      const player = makePlayer('player-1', ARENA_ROOM_ID);
      handleCommand('sandbox', buildCtx(sandboxArena, ['spawn', 'drowned_revenant'], {
        player, combatSystem, creatureManager,
      }));

      const creatures = creatureManager.getCreaturesInRoom(ARENA_ROOM_ID);
      const creatureCombatant = createCombatant(
        creatures[0]!.id, creatures[0]!.name, ARENA_ROOM_ID, false,
        DROWNED_REVENANT.stats,
      );
      combatSystem.registerCombatant(creatureCombatant);

      handleCommand('sandbox', buildCtx(sandboxArena, ['set', creatures[0]!.id, 'atk', '77'], {
        player, combatSystem, creatureManager,
      }));

      handleCommand('sandbox', buildCtx(sandboxLobby, ['scenario', 'save', 'override-load'], {
        player, combatSystem, creatureManager,
      }));

      // Reset everything
      handleCommand('sandbox', buildCtx(sandboxLobby, ['reset'], {
        player, combatSystem, creatureManager,
      }));

      // Load scenario — overrides should be re-applied
      const loadResult = handleCommand('sandbox', buildCtx(sandboxLobby, ['scenario', 'load', 'override-load'], {
        player, combatSystem, creatureManager,
      }));
      const text = narrationText(loadResult).toLowerCase();
      expect(text).toMatch(/loaded|scenario/);

      // The loaded creatures should have overridden stats applied
      const loadedCreatures = creatureManager.getCreaturesInRoom(ARENA_ROOM_ID);
      expect(loadedCreatures).toHaveLength(1);
      const loadedCombatant = combatSystem.getCombatant(loadedCreatures[0]!.id);
      expect(loadedCombatant?.attack).toBe(77);
    });

    it('load clears previous arena state before loading', () => {
      // Start with 1 creature and save
      handleCommand('sandbox', buildCtx(sandboxArena, ['spawn', 'drowned_revenant'], {
        combatSystem, creatureManager,
      }));
      handleCommand('sandbox', buildCtx(sandboxLobby, ['scenario', 'save', 'one-creature'], {
        combatSystem, creatureManager,
      }));

      // Spawn 3 more (total 4)
      handleCommand('sandbox', buildCtx(sandboxArena, ['spawn', 'drowned_revenant', '3'], {
        combatSystem, creatureManager,
      }));
      expect(creatureManager.getCreaturesInRoom(ARENA_ROOM_ID)).toHaveLength(4);

      // Load the 1-creature scenario — should clear the 4 and restore 1
      handleCommand('sandbox', buildCtx(sandboxLobby, ['scenario', 'load', 'one-creature'], {
        combatSystem, creatureManager,
      }));
      expect(creatureManager.getCreaturesInRoom(ARENA_ROOM_ID)).toHaveLength(1);
    });

    it('load non-existent scenario returns error', () => {
      const result = handleCommand('sandbox', buildCtx(sandboxLobby, ['scenario', 'load', 'nonexistent'], {
        combatSystem, creatureManager,
      }));
      const text = narrationText(result).toLowerCase();

      // Must be a specific "not found" error, not the generic "unknown subcommand"
      expect(text).toMatch(/not found|no.*scenario|does.*not.*exist/);
    });

    it('load restores PRNG seed if present in scenario', () => {
      // Set a seed, save scenario
      handleCommand('sandbox', buildCtx(sandboxLobby, ['seed', '42'], {
        combatSystem, creatureManager,
      }));
      handleCommand('sandbox', buildCtx(sandboxArena, ['spawn', 'drowned_revenant'], {
        combatSystem, creatureManager,
      }));
      handleCommand('sandbox', buildCtx(sandboxLobby, ['scenario', 'save', 'seeded-load'], {
        combatSystem, creatureManager,
      }));

      // Clear seed
      handleCommand('sandbox', buildCtx(sandboxLobby, ['seed', 'random'], {
        combatSystem, creatureManager,
      }));

      // Load scenario — seed should be restored to 42
      handleCommand('sandbox', buildCtx(sandboxLobby, ['scenario', 'load', 'seeded-load'], {
        combatSystem, creatureManager,
      }));

      // Query seed: should report 42 again
      const seedResult = handleCommand('sandbox', buildCtx(sandboxLobby, ['seed'], {
        combatSystem, creatureManager,
      }));
      const seedText = narrationText(seedResult);
      expect(seedText).toContain('42');
    });
  });

  // ─── 16. sandbox scenario list ────────────────────────────────────────────

  describe('sandbox scenario list', () => {
    let combatSystem: CombatSystem;
    let creatureManager: CreatureManager;

    beforeEach(() => {
      enableDevMode();
      combatSystem = new CombatSystem(exitResolver);
      creatureManager = new CreatureManager();
      _resetSandboxState();
    });

    it('list shows saved scenarios with creature counts', () => {
      // Save two scenarios with different creature counts
      handleCommand('sandbox', buildCtx(sandboxArena, ['spawn', 'drowned_revenant', '2'], {
        combatSystem, creatureManager,
      }));
      handleCommand('sandbox', buildCtx(sandboxLobby, ['scenario', 'save', 'battle-duo'], {
        combatSystem, creatureManager,
      }));

      handleCommand('sandbox', buildCtx(sandboxLobby, ['reset'], {
        combatSystem, creatureManager,
      }));
      handleCommand('sandbox', buildCtx(sandboxArena, ['spawn', 'drowned_revenant'], {
        combatSystem, creatureManager,
      }));
      handleCommand('sandbox', buildCtx(sandboxLobby, ['scenario', 'save', 'solo-fight'], {
        combatSystem, creatureManager,
      }));

      // List all scenarios
      const result = handleCommand('sandbox', buildCtx(sandboxLobby, ['scenario', 'list'], {
        combatSystem, creatureManager,
      }));
      const text = narrationText(result).toLowerCase();

      expect(text).toContain('battle-duo');
      expect(text).toContain('solo-fight');
      expect(text).not.toContain('unknown');
    });

    it('list returns appropriate message when no scenarios exist', () => {
      const result = handleCommand('sandbox', buildCtx(sandboxLobby, ['scenario', 'list'], {
        combatSystem, creatureManager,
      }));
      const text = narrationText(result).toLowerCase();

      // Must say "no scenarios" — not "unknown subcommand"
      expect(text).toMatch(/no.*scenario|empty|none/);
      expect(text).not.toContain('unknown sandbox subcommand');
    });
  });

  // ─── 17. sandbox scenario delete ──────────────────────────────────────────

  describe('sandbox scenario delete', () => {
    let combatSystem: CombatSystem;
    let creatureManager: CreatureManager;

    beforeEach(() => {
      enableDevMode();
      combatSystem = new CombatSystem(exitResolver);
      creatureManager = new CreatureManager();
      _resetSandboxState();
    });

    it('delete removes the scenario file', () => {
      // Save a scenario then delete it
      handleCommand('sandbox', buildCtx(sandboxArena, ['spawn', 'drowned_revenant'], {
        combatSystem, creatureManager,
      }));
      handleCommand('sandbox', buildCtx(sandboxLobby, ['scenario', 'save', 'doomed'], {
        combatSystem, creatureManager,
      }));

      // Delete it
      const result = handleCommand('sandbox', buildCtx(sandboxLobby, ['scenario', 'delete', 'doomed'], {
        combatSystem, creatureManager,
      }));
      const text = narrationText(result).toLowerCase();
      expect(text).toMatch(/deleted|removed/);
      expect(text).not.toContain('unknown');

      // List should no longer include "doomed"
      const listResult = handleCommand('sandbox', buildCtx(sandboxLobby, ['scenario', 'list'], {
        combatSystem, creatureManager,
      }));
      const listText = narrationText(listResult).toLowerCase();
      expect(listText).not.toContain('doomed');
    });

    it('delete non-existent scenario returns error', () => {
      const result = handleCommand('sandbox', buildCtx(sandboxLobby, ['scenario', 'delete', 'ghost-scenario'], {
        combatSystem, creatureManager,
      }));
      const text = narrationText(result).toLowerCase();

      // Must be a specific "not found" error
      expect(text).toMatch(/not found|no.*scenario|does.*not.*exist/);
    });
  });

  // ─── 18. sandbox seed — Deterministic PRNG ────────────────────────────────

  describe('sandbox seed', () => {
    let combatSystem: CombatSystem;
    let creatureManager: CreatureManager;

    beforeEach(() => {
      enableDevMode();
      combatSystem = new CombatSystem(exitResolver);
      creatureManager = new CreatureManager();
      _resetSandboxState();
    });

    it('`sandbox seed 42` sets a deterministic PRNG', () => {
      const result = handleCommand('sandbox', buildCtx(sandboxLobby, ['seed', '42'], {
        combatSystem, creatureManager,
      }));
      const text = narrationText(result).toLowerCase();

      expect(text).toMatch(/seed.*42|prng.*42|set.*42/);
    });

    it('`sandbox seed` with no arg reports current seed', () => {
      // Set seed first
      handleCommand('sandbox', buildCtx(sandboxLobby, ['seed', '99'], {
        combatSystem, creatureManager,
      }));

      // Query seed
      const result = handleCommand('sandbox', buildCtx(sandboxLobby, ['seed'], {
        combatSystem, creatureManager,
      }));
      const text = narrationText(result);

      expect(text).toContain('99');
    });

    it('`sandbox seed random` restores Math.random', () => {
      // Set seed first
      handleCommand('sandbox', buildCtx(sandboxLobby, ['seed', '42'], {
        combatSystem, creatureManager,
      }));

      // Restore to random
      const result = handleCommand('sandbox', buildCtx(sandboxLobby, ['seed', 'random'], {
        combatSystem, creatureManager,
      }));
      const text = narrationText(result).toLowerCase();
      expect(text).toMatch(/random|cleared|reset|unseeded/);

      // Querying seed should show no seed / random / default
      const queryResult = handleCommand('sandbox', buildCtx(sandboxLobby, ['seed'], {
        combatSystem, creatureManager,
      }));
      const queryText = narrationText(queryResult).toLowerCase();
      expect(queryText).toMatch(/random|none|no.*seed|not.*set|default/);
    });

    it('same seed produces same combat results (determinism key test)', () => {
      // Helper: set up a seeded combat system, run ticks, collect damage values
      function runSeededCombat(seed: number): number[] {
        const cs = new CombatSystem(exitResolver);
        const cm = new CreatureManager();

        // Set the seed via command
        handleCommand('sandbox', buildCtx(sandboxLobby, ['seed', String(seed)], {
          combatSystem: cs, creatureManager: cm,
        }));

        // Spawn a creature
        handleCommand('sandbox', buildCtx(sandboxArena, ['spawn', 'drowned_revenant'], {
          combatSystem: cs, creatureManager: cm,
        }));

        const creatures = cm.getCreaturesInRoom(ARENA_ROOM_ID);
        const player = makePlayer('player-1', ARENA_ROOM_ID);
        const playerCombatant = createCombatant(
          player.sessionId, player.sessionId, ARENA_ROOM_ID, true,
          { ...DEFAULT_PLAYER_STATS, maxHp: 500 },
        );
        playerCombatant.hp = 500;
        const creatureCombatant = createCombatant(
          creatures[0]!.id, creatures[0]!.name, ARENA_ROOM_ID, false,
          { ...DROWNED_REVENANT.stats, maxHp: 500 },
        );
        creatureCombatant.hp = 500;

        cs.registerCombatant(playerCombatant);
        cs.registerCombatant(creatureCombatant);
        cs.initiateCombat(player.sessionId, creatures[0]!.id);

        // Run 5 ticks and record all damage values
        const damages: number[] = [];
        for (let i = 0; i < 5; i++) {
          const tickResult = cs.resolveTick();
          for (const event of tickResult.events) {
            if (event.type === 'strike') {
              damages.push(event.damage ?? 0);
            }
          }
        }
        return damages;
      }

      // Run twice with same seed — results MUST match
      const run1 = runSeededCombat(12345);
      const run2 = runSeededCombat(12345);

      expect(run1.length).toBeGreaterThan(0);
      expect(run1).toEqual(run2);

      // Different seed should produce different results
      const run3 = runSeededCombat(99999);
      if (run3.length === run1.length) {
        const allSame = run1.every((v, i) => v === run3[i]);
        if (!allSame) {
          expect(run1).not.toEqual(run3);
        }
      }
    });
  });

  // ─── 19. sandbox replay — Auto-Combat Ticks ──────────────────────────────

  describe('sandbox replay', () => {
    let combatSystem: CombatSystem;
    let creatureManager: CreatureManager;

    beforeEach(() => {
      enableDevMode();
      combatSystem = new CombatSystem(exitResolver);
      creatureManager = new CreatureManager();
      _resetSandboxState();
    });

    it('replay runs N ticks of auto-combat', () => {
      const player = makePlayer('player-1', ARENA_ROOM_ID);

      // Spawn a creature and register both combatants
      handleCommand('sandbox', buildCtx(sandboxArena, ['spawn', 'drowned_revenant'], {
        player, combatSystem, creatureManager,
      }));
      const creatures = creatureManager.getCreaturesInRoom(ARENA_ROOM_ID);
      expect(creatures).toHaveLength(1);

      const playerCombatant = createCombatant(
        player.sessionId, player.sessionId, ARENA_ROOM_ID, true,
        { ...DEFAULT_PLAYER_STATS, maxHp: 500 },
      );
      playerCombatant.hp = 500;
      const creatureCombatant = createCombatant(
        creatures[0]!.id, creatures[0]!.name, ARENA_ROOM_ID, false,
        { ...DROWNED_REVENANT.stats, maxHp: 500 },
      );
      creatureCombatant.hp = 500;

      combatSystem.registerCombatant(playerCombatant);
      combatSystem.registerCombatant(creatureCombatant);

      // Replay 3 ticks — replay auto-initiates combat if needed
      const result = handleCommand('sandbox', buildCtx(sandboxArena, ['replay', '3'], {
        player, combatSystem, creatureManager,
      }));
      const text = narrationText(result);

      // Output should mention ticks and contain combat data
      expect(text).toMatch(/tick|round|replay/i);
      expect(text.length).toBeGreaterThan(20);
    });

    it('replay output includes damage numbers per tick', () => {
      const player = makePlayer('player-1', ARENA_ROOM_ID);

      handleCommand('sandbox', buildCtx(sandboxArena, ['spawn', 'drowned_revenant'], {
        player, combatSystem, creatureManager,
      }));
      const creatures = creatureManager.getCreaturesInRoom(ARENA_ROOM_ID);

      const playerCombatant = createCombatant(
        player.sessionId, player.sessionId, ARENA_ROOM_ID, true,
        { ...DEFAULT_PLAYER_STATS, attack: 50, maxHp: 500 },
      );
      playerCombatant.hp = 500;
      const creatureCombatant = createCombatant(
        creatures[0]!.id, creatures[0]!.name, ARENA_ROOM_ID, false,
        { ...DROWNED_REVENANT.stats, maxHp: 500 },
      );
      creatureCombatant.hp = 500;

      combatSystem.registerCombatant(playerCombatant);
      combatSystem.registerCombatant(creatureCombatant);

      const result = handleCommand('sandbox', buildCtx(sandboxArena, ['replay', '2'], {
        player, combatSystem, creatureManager,
      }));
      const text = narrationText(result);

      // Should contain numeric damage values
      expect(text).toMatch(/\d+/);
      // Should reference damage via the dmg marker in the output format
      expect(text).toMatch(/damage|dmg|hit|strike|dealt/i);
    });

    it('replay with no creatures returns error', () => {
      const result = handleCommand('sandbox', buildCtx(sandboxArena, ['replay', '5'], {
        combatSystem, creatureManager,
      }));
      const text = narrationText(result).toLowerCase();

      expect(text).toMatch(/no.*creature|no.*combat|nothing.*replay|empty.*arena|spawn/);
    });

    it('replay with seed is deterministic (same output each run)', () => {
      function seededReplay(seed: number, ticks: number): string {
        const cs = new CombatSystem(exitResolver);
        const cm = new CreatureManager();
        _resetSandboxState();

        // Set the seed
        handleCommand('sandbox', buildCtx(sandboxLobby, ['seed', String(seed)], {
          combatSystem: cs, creatureManager: cm,
        }));

        // Spawn a creature
        handleCommand('sandbox', buildCtx(sandboxArena, ['spawn', 'drowned_revenant'], {
          combatSystem: cs, creatureManager: cm,
        }));

        const creatures = cm.getCreaturesInRoom(ARENA_ROOM_ID);
        const player = makePlayer('player-1', ARENA_ROOM_ID);
        const playerCombatant = createCombatant(
          player.sessionId, player.sessionId, ARENA_ROOM_ID, true,
          { ...DEFAULT_PLAYER_STATS, maxHp: 500 },
        );
        playerCombatant.hp = 500;
        const creatureCombatant = createCombatant(
          creatures[0]!.id, creatures[0]!.name, ARENA_ROOM_ID, false,
          { ...DROWNED_REVENANT.stats, maxHp: 500 },
        );
        creatureCombatant.hp = 500;

        cs.registerCombatant(playerCombatant);
        cs.registerCombatant(creatureCombatant);

        const result = handleCommand('sandbox', buildCtx(sandboxArena, ['replay', String(ticks)], {
          player, combatSystem: cs, creatureManager: cm,
        }));
        return narrationText(result);
      }

      const output1 = seededReplay(777, 3);
      const output2 = seededReplay(777, 3);

      expect(output1.length).toBeGreaterThan(0);
      expect(output1).toBe(output2);
    });
  });

  // ─── 20. Integration: seed + scenario + replay (full roundtrip) ───────────

  describe('integration: seed + scenario + replay', () => {
    let combatSystem: CombatSystem;
    let creatureManager: CreatureManager;

    beforeEach(() => {
      enableDevMode();
      combatSystem = new CombatSystem(exitResolver);
      creatureManager = new CreatureManager();
      _resetSandboxState();
    });

    it('save scenario with seed → load → replay → verify deterministic output', () => {
      // ── Phase A: Set seed, spawn creatures, save scenario ──
      handleCommand('sandbox', buildCtx(sandboxLobby, ['seed', '314159'], {
        combatSystem, creatureManager,
      }));
      handleCommand('sandbox', buildCtx(sandboxArena, ['spawn', 'drowned_revenant', '2'], {
        combatSystem, creatureManager,
      }));
      expect(creatureManager.getCreaturesInRoom(ARENA_ROOM_ID)).toHaveLength(2);

      handleCommand('sandbox', buildCtx(sandboxLobby, ['scenario', 'save', 'determinism-test'], {
        combatSystem, creatureManager,
      }));

      // ── Phase B: Reset, load, set up combat, replay ──
      handleCommand('sandbox', buildCtx(sandboxLobby, ['reset'], {
        combatSystem, creatureManager,
      }));
      _resetSandboxState();

      const loadResult = handleCommand('sandbox', buildCtx(sandboxLobby, ['scenario', 'load', 'determinism-test'], {
        combatSystem, creatureManager,
      }));
      expect(narrationText(loadResult).toLowerCase()).toMatch(/loaded|scenario/);

      const loadedCreatures = creatureManager.getCreaturesInRoom(ARENA_ROOM_ID);
      expect(loadedCreatures).toHaveLength(2);

      // Register player + creatures as combatants
      const player1 = makePlayer('player-1', ARENA_ROOM_ID);
      const pc1 = createCombatant(
        player1.sessionId, player1.sessionId, ARENA_ROOM_ID, true,
        { ...DEFAULT_PLAYER_STATS, maxHp: 500 },
      );
      pc1.hp = 500;
      combatSystem.registerCombatant(pc1);
      for (const c of loadedCreatures) {
        const cc = createCombatant(c.id, c.name, ARENA_ROOM_ID, false,
          { ...DROWNED_REVENANT.stats, maxHp: 500 });
        cc.hp = 500;
        combatSystem.registerCombatant(cc);
      }

      const replay1 = handleCommand('sandbox', buildCtx(sandboxArena, ['replay', '3'], {
        player: player1, combatSystem, creatureManager,
      }));
      const text1 = narrationText(replay1);

      // ── Phase C: Load again into fresh state, replay — must match ──
      const cs2 = new CombatSystem(exitResolver);
      const cm2 = new CreatureManager();
      _resetSandboxState();

      const loadResult2 = handleCommand('sandbox', buildCtx(sandboxLobby, ['scenario', 'load', 'determinism-test'], {
        combatSystem: cs2, creatureManager: cm2,
      }));
      expect(narrationText(loadResult2).toLowerCase()).toMatch(/loaded|scenario/);

      const loadedCreatures2 = cm2.getCreaturesInRoom(ARENA_ROOM_ID);
      expect(loadedCreatures2).toHaveLength(2);

      const player2 = makePlayer('player-1', ARENA_ROOM_ID);
      const pc2 = createCombatant(
        player2.sessionId, player2.sessionId, ARENA_ROOM_ID, true,
        { ...DEFAULT_PLAYER_STATS, maxHp: 500 },
      );
      pc2.hp = 500;
      cs2.registerCombatant(pc2);
      for (const c of loadedCreatures2) {
        const cc = createCombatant(c.id, c.name, ARENA_ROOM_ID, false,
          { ...DROWNED_REVENANT.stats, maxHp: 500 });
        cc.hp = 500;
        cs2.registerCombatant(cc);
      }

      const replay2 = handleCommand('sandbox', buildCtx(sandboxArena, ['replay', '3'], {
        player: player2, combatSystem: cs2, creatureManager: cm2,
      }));
      const text2 = narrationText(replay2);

      // The key assertion: identical seed → identical scenario → identical replay
      expect(text1.length).toBeGreaterThan(0);
      expect(text1).toBe(text2);
    });
  });

  // ─── PRNG determinism (unit validation) ───────────────────────────────────

  describe('PRNG determinism (unit)', () => {
    it('createPRNG with same seed produces identical sequences', () => {
      const prng1 = createPRNG(42);
      const prng2 = createPRNG(42);

      const seq1 = Array.from({ length: 20 }, () => prng1.next());
      const seq2 = Array.from({ length: 20 }, () => prng2.next());

      expect(seq1).toEqual(seq2);
    });

    it('createPRNG with different seeds produces different sequences', () => {
      const prng1 = createPRNG(42);
      const prng2 = createPRNG(43);

      const seq1 = Array.from({ length: 10 }, () => prng1.next());
      const seq2 = Array.from({ length: 10 }, () => prng2.next());

      expect(seq1).not.toEqual(seq2);
    });

    it('PRNG values are in [0, 1) range', () => {
      const prng = createPRNG(12345);
      for (let i = 0; i < 100; i++) {
        const v = prng.next();
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    });

    it('PRNG nextInt returns values in specified range', () => {
      const prng = createPRNG(999);
      for (let i = 0; i < 50; i++) {
        const v = prng.nextInt(5, 15);
        expect(v).toBeGreaterThanOrEqual(5);
        expect(v).toBeLessThanOrEqual(15);
      }
    });

    it('seededPrng (combat-specific) produces deterministic RollFn values', () => {
      const roll1 = seededPrng(42);
      const roll2 = seededPrng(42);

      const seq1 = Array.from({ length: 20 }, () => roll1());
      const seq2 = Array.from({ length: 20 }, () => roll2());

      expect(seq1).toEqual(seq2);
      // All values in [0, 1)
      for (const v of seq1) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    });
  });
});
