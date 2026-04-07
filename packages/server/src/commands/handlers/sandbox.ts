/**
 * sandbox — Combat sandbox dev tool command handler.
 *
 * Subcommands: spawn <creature_type> [count], reset, status, kill, heal
 * Double-gated: featureHandlers room type gate + devModeEnabled config check.
 */

import type { CommandContext, CommandResult, NarrationEntry } from '../index.js';
import { getConfig } from '../../config.js';
import { getAllCreatureTemplates } from '../../creatures/CreatureManager.js';

const MAX_SPAWN_COUNT = 5;
const SANDBOX_ARENA_ROOM_TYPE = 'feature_sandbox_arena';

function sysMsg(text: string): NarrationEntry {
  return { text, type: 'system' };
}

/** Find the sandbox-arena room ID from the room graph via resolveRoom scanning. */
function findArenaRoomId(ctx: CommandContext): string | undefined {
  // Check if current room IS the arena
  if (ctx.room.type === SANDBOX_ARENA_ROOM_TYPE) return ctx.room.id;

  // Walk connected rooms looking for the arena
  for (const [, exitRoomId] of ctx.room.exits) {
    const exitRoom = ctx.resolveRoom(exitRoomId);
    if (exitRoom?.type === SANDBOX_ARENA_ROOM_TYPE) return exitRoom.id;
  }

  return undefined;
}

export function handleSandbox(ctx: CommandContext): CommandResult {
  // Second gate: devModeEnabled
  if (!getConfig().devModeEnabled) {
    return { narrations: [sysMsg('That command is not available.')] };
  }

  const { args, player, combatSystem, creatureManager } = ctx;
  const subcommand = args[0]?.toLowerCase();

  if (!subcommand) {
    return {
      narrations: [sysMsg(
        'Sandbox commands:\n' +
        '  sandbox spawn <creature_type> [count] — Spawn creatures in the arena\n' +
        '  sandbox reset — Clear arena, restore HP/stamina\n' +
        '  sandbox status — Show arena state\n' +
        '  sandbox kill — Instantly kill all sandbox creatures\n' +
        '  sandbox heal — Restore your HP/stamina to max',
      )],
    };
  }

  switch (subcommand) {
    case 'spawn':
      return handleSpawn(ctx);
    case 'reset':
      return handleReset(ctx);
    case 'status':
      return handleStatus(ctx);
    case 'kill':
      return handleKill(ctx);
    case 'heal':
      return handleHeal(ctx);
    default:
      return { narrations: [sysMsg(`Unknown sandbox subcommand: "${subcommand}". Try "sandbox" for help.`)] };
  }
}

function handleSpawn(ctx: CommandContext): CommandResult {
  const { args, creatureManager } = ctx;

  if (!creatureManager) {
    return { narrations: [sysMsg('Creature manager not available.')] };
  }

  const creatureType = args[1]?.toLowerCase();
  if (!creatureType) {
    const templates = getAllCreatureTemplates();
    const available = templates.map(t => t.type).join(', ');
    return { narrations: [sysMsg(`Spawn what? Usage: sandbox spawn <creature_type> [count]\nAvailable: ${available}`)] };
  }

  const count = Math.min(Math.max(1, parseInt(args[2] ?? '1', 10) || 1), MAX_SPAWN_COUNT);

  const arenaRoomId = findArenaRoomId(ctx);
  if (!arenaRoomId) {
    return { narrations: [sysMsg('Cannot find the sandbox arena room.')] };
  }

  const spawned = creatureManager.spawnCreatureInRoom(creatureType, arenaRoomId, count);
  if (spawned.length === 0) {
    const templates = getAllCreatureTemplates();
    const available = templates.map(t => t.type).join(', ');
    return { narrations: [sysMsg(`Unknown creature type: "${creatureType}".\nAvailable: ${available}`)] };
  }

  return {
    narrations: [sysMsg(`Spawned ${spawned.length}x ${spawned[0]!.name} in the sandbox arena.`)],
  };
}

function handleReset(ctx: CommandContext): CommandResult {
  const { creatureManager, combatSystem, player } = ctx;

  if (!creatureManager) {
    return { narrations: [sysMsg('Creature manager not available.')] };
  }

  const arenaRoomId = findArenaRoomId(ctx);
  if (!arenaRoomId) {
    return { narrations: [sysMsg('Cannot find the sandbox arena room.')] };
  }

  // Remove all sandbox creatures from combat system first
  const creaturesInArena = creatureManager.getCreaturesInRoom(arenaRoomId);
  for (const creature of creaturesInArena) {
    if (combatSystem) {
      combatSystem.removeCombatant(creature.id);
    }
  }

  // Clear all creatures from the arena
  const cleared = creatureManager.clearCreaturesInRoom(arenaRoomId);

  // Remove player from combat if active
  if (combatSystem?.isInCombat(player.sessionId)) {
    combatSystem.removeCombatant(player.sessionId);
  }

  // Restore player HP/stamina via combat system combatant if registered
  const combatant = combatSystem?.getCombatant(player.sessionId);
  if (combatant) {
    combatant.hp = combatant.maxHp;
    if (combatant.maxStamina) combatant.stamina = combatant.maxStamina;
  }

  return {
    narrations: [sysMsg(`Arena reset. Cleared ${cleared} creature(s). HP and stamina restored.`)],
  };
}

function handleStatus(ctx: CommandContext): CommandResult {
  const { creatureManager, combatSystem, player } = ctx;

  if (!creatureManager) {
    return { narrations: [sysMsg('Creature manager not available.')] };
  }

  const arenaRoomId = findArenaRoomId(ctx);
  if (!arenaRoomId) {
    return { narrations: [sysMsg('Cannot find the sandbox arena room.')] };
  }

  const creatures = creatureManager.getCreaturesInRoom(arenaRoomId);
  const inCombat = combatSystem?.isInCombat(player.sessionId) ?? false;
  const combatant = combatSystem?.getCombatant(player.sessionId);

  const lines: string[] = [
    '── Sandbox Arena Status ──',
    `Creatures: ${creatures.length}`,
  ];

  for (const c of creatures) {
    lines.push(`  ${c.name} — HP: ${c.hp}/${c.maxHp} [${c.isAlive ? 'alive' : 'dead'}]`);
  }

  if (combatant) {
    lines.push(`Player HP: ${combatant.hp}/${combatant.maxHp}`);
    if (combatant.maxStamina) {
      lines.push(`Player Stamina: ${combatant.stamina ?? 0}/${combatant.maxStamina}`);
    }
  }

  lines.push(`In combat: ${inCombat ? 'yes' : 'no'}`);

  return { narrations: [sysMsg(lines.join('\n'))] };
}

function handleKill(ctx: CommandContext): CommandResult {
  const { creatureManager, combatSystem } = ctx;

  if (!creatureManager) {
    return { narrations: [sysMsg('Creature manager not available.')] };
  }

  const arenaRoomId = findArenaRoomId(ctx);
  if (!arenaRoomId) {
    return { narrations: [sysMsg('Cannot find the sandbox arena room.')] };
  }

  // Remove from combat first
  const creatures = creatureManager.getCreaturesInRoom(arenaRoomId);
  for (const creature of creatures) {
    if (combatSystem) {
      combatSystem.removeCombatant(creature.id);
    }
  }

  const cleared = creatureManager.clearCreaturesInRoom(arenaRoomId);

  // Remove player from combat if no enemies remain
  if (combatSystem?.isInCombat(ctx.player.sessionId)) {
    combatSystem.removeCombatant(ctx.player.sessionId);
  }

  return {
    narrations: [sysMsg(`Killed ${cleared} sandbox creature(s).`)],
  };
}

function handleHeal(ctx: CommandContext): CommandResult {
  const { combatSystem, player } = ctx;

  const combatant = combatSystem?.getCombatant(player.sessionId);
  if (combatant) {
    combatant.hp = combatant.maxHp;
    if (combatant.maxStamina) combatant.stamina = combatant.maxStamina;
    return {
      narrations: [sysMsg(`HP restored to ${combatant.hp}/${combatant.maxHp}. Stamina fully restored.`)],
    };
  }

  return {
    narrations: [sysMsg('You are fully healed (not in combat).')],
  };
}
