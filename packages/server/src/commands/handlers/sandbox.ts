/**
 * sandbox — Combat sandbox dev tool command handler.
 *
 * Subcommands: spawn, reset, status, kill, heal, set, info, clear, log
 * Double-gated: featureHandlers room type gate + devModeEnabled config check.
 */

import type { CommandContext, CommandResult, NarrationEntry } from '../index.js';
import type { Combatant, TickResult } from '../../combat/CombatState.js';
import { getConfig } from '../../config.js';
import { getAllCreatureTemplates } from '../../creatures/CreatureManager.js';

const MAX_SPAWN_COUNT = 5;
const SANDBOX_ARENA_ROOM_TYPE = 'feature_sandbox_arena';

// ─── Stat Override Tracking ─────────────────────────────────────────────────

/** Per-entity stat overrides: entityId → statName → { original, override } */
const sandboxOverrides = new Map<string, Map<string, { original: number; override: number }>>();

/** Stat name aliases — maps user-facing names to Combatant property names. */
const STAT_ALIASES: Record<string, keyof Combatant> = {
  hp: 'hp',
  maxhp: 'maxHp',
  atk: 'attack',
  attack: 'attack',
  def: 'defence',
  defence: 'defence',
  defense: 'defence',
  agi: 'agility',
  agility: 'agility',
  armour: 'armour',
  armor: 'armour',
  block: 'defence',
};

const SETTABLE_STATS = ['hp', 'maxhp', 'atk', 'def', 'agi', 'armour', 'block'];

// ─── Combat Log Ring Buffer ─────────────────────────────────────────────────

export interface SandboxCombatLogEntry {
  tick: number;
  attacker: string;
  target: string;
  rawDamage: number;
  armourReduction: number;
  finalDamage: number;
  dodged: boolean;
  ability?: string;
}

const COMBAT_LOG_MAX = 100;
const combatLogBuffer: SandboxCombatLogEntry[] = [];
let combatLogTick = 0;

/** Record combat events from a tick result (called from ZoneRoom sandbox tick path). */
export function recordSandboxCombatEvents(tickResult: TickResult, tick: number): void {
  combatLogTick = tick;
  for (const event of tickResult.events) {
    if (event.type !== 'strike') continue;
    const entry: SandboxCombatLogEntry = {
      tick,
      attacker: event.actorName,
      target: event.targetName ?? '?',
      rawDamage: event.damage ?? 0,
      armourReduction: 0,
      finalDamage: event.damage ?? 0,
      dodged: event.dodged ?? false,
      ability: undefined,
    };
    if (combatLogBuffer.length >= COMBAT_LOG_MAX) {
      combatLogBuffer.shift();
    }
    combatLogBuffer.push(entry);
  }
}

/** Clear the combat log buffer (called on sandbox reset). */
export function clearSandboxCombatLog(): void {
  combatLogBuffer.length = 0;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

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

  const { args } = ctx;
  const subcommand = args[0]?.toLowerCase();

  if (!subcommand) {
    return {
      narrations: [sysMsg(
        'Sandbox commands:\n' +
        '  sandbox spawn <creature_type> [count] — Spawn creatures in the arena\n' +
        '  sandbox reset — Clear arena, restore HP/stamina\n' +
        '  sandbox status — Show arena state\n' +
        '  sandbox kill — Instantly kill all sandbox creatures\n' +
        '  sandbox heal — Restore your HP/stamina to max\n' +
        '  sandbox set <target> <stat> <value> — Override a stat\n' +
        '  sandbox info [creature_type] — Inspect creature templates\n' +
        '  sandbox clear — Reset all stat overrides\n' +
        '  sandbox log [N] — Show recent combat events',
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
    case 'set':
      return handleSet(ctx);
    case 'info':
      return handleInfo(ctx);
    case 'clear':
      return handleClear(ctx);
    case 'log':
      return handleLog(ctx);
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

  // Clear all stat overrides
  const overrideCount = sandboxOverrides.size;
  sandboxOverrides.clear();

  // Clear combat log
  clearSandboxCombatLog();

  const parts = [`Arena reset. Cleared ${cleared} creature(s). HP and stamina restored.`];
  if (overrideCount > 0) {
    parts.push(`Cleared ${overrideCount} stat override(s).`);
  }

  return {
    narrations: [sysMsg(parts.join(' '))],
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

// ─── Phase 2: Tuning Tools ─────────────────────────────────────────────────

function handleSet(ctx: CommandContext): CommandResult {
  const { args, player, combatSystem, creatureManager } = ctx;
  const targetArg = args[1]?.toLowerCase();
  const statArg = args[2]?.toLowerCase();
  const valueArg = args[3];

  if (!targetArg || !statArg || valueArg === undefined) {
    return { narrations: [sysMsg(
      'Usage: sandbox set <target> <stat> <value>\n' +
      `  target: player, creature name, or index (1, 2, ...)\n` +
      `  stats: ${SETTABLE_STATS.join(', ')}`,
    )] };
  }

  const value = parseInt(valueArg, 10);
  if (isNaN(value)) {
    return { narrations: [sysMsg(`Invalid value: "${valueArg}". Must be a number.`)] };
  }

  const combatantKey = STAT_ALIASES[statArg];
  if (!combatantKey) {
    return { narrations: [sysMsg(`Unknown stat: "${statArg}". Valid stats: ${SETTABLE_STATS.join(', ')}`)] };
  }

  // Resolve the target combatant
  let combatant: Combatant | undefined;
  let entityLabel: string;

  if (targetArg === 'player' || targetArg === 'self' || targetArg === 'me') {
    combatant = combatSystem?.getCombatant(player.sessionId);
    entityLabel = 'Player';
    if (!combatant) {
      return { narrations: [sysMsg('Player not registered as combatant. Enter combat first.')] };
    }
  } else {
    // Try to resolve creature by name or index
    if (!creatureManager) {
      return { narrations: [sysMsg('Creature manager not available.')] };
    }
    const arenaRoomId = findArenaRoomId(ctx);
    if (!arenaRoomId) {
      return { narrations: [sysMsg('Cannot find the sandbox arena room.')] };
    }
    const creatures = creatureManager.getCreaturesInRoom(arenaRoomId);
    if (creatures.length === 0) {
      return { narrations: [sysMsg(`No target found: no creatures in the arena. Spawn some first.`)] };
    }

    // Try numeric index first (1-based)
    const idx = parseInt(targetArg, 10);
    if (!isNaN(idx) && idx >= 1 && idx <= creatures.length) {
      const creature = creatures[idx - 1]!;
      combatant = combatSystem?.getCombatant(creature.id);
      entityLabel = `${creature.name} (#${idx})`;
    } else {
      // Try name match (partial, case-insensitive)
      const match = creatures.find(c =>
        c.name.toLowerCase().includes(targetArg) || c.type.toLowerCase().includes(targetArg),
      );
      if (match) {
        combatant = combatSystem?.getCombatant(match.id);
        entityLabel = match.name;
      } else {
        return { narrations: [sysMsg(`No creature matching "${targetArg}" in the arena.`)] };
      }
    }

    if (!combatant) {
      return { narrations: [sysMsg(`"${entityLabel}" is not registered as a combatant. It may not be in combat.`)] };
    }
  }

  // Track original value (first override only)
  const entityId = combatant.id;
  if (!sandboxOverrides.has(entityId)) {
    sandboxOverrides.set(entityId, new Map());
  }
  const entityOverrides = sandboxOverrides.get(entityId)!;
  const statKey = combatantKey as string;

  if (!entityOverrides.has(statKey)) {
    entityOverrides.set(statKey, {
      original: combatant[combatantKey] as number,
      override: value,
    });
  } else {
    entityOverrides.get(statKey)!.override = value;
  }

  // Apply the override
  (combatant as unknown as Record<string, unknown>)[combatantKey] = value;

  return { narrations: [sysMsg(`${entityLabel!}: ${statArg} set to ${value} (was ${entityOverrides.get(statKey)!.original}).`)] };
}

function handleInfo(ctx: CommandContext): CommandResult {
  const { args } = ctx;
  const creatureType = args[1]?.toLowerCase();

  const templates = getAllCreatureTemplates();

  if (!creatureType) {
    // List all templates with brief stats
    const lines: string[] = ['── Creature Templates ──'];
    for (const t of templates) {
      lines.push(
        `  ${t.name} (${t.type}) — HP: ${t.stats.maxHp}, ATK: ${t.stats.attack}, DEF: ${t.stats.defence}, ARM: ${t.stats.armour}, AGI: ${t.stats.agility}`,
      );
    }
    if (templates.length === 0) {
      lines.push('  (no templates registered)');
    }
    return { narrations: [sysMsg(lines.join('\n'))] };
  }

  // Find specific template
  const template = templates.find(
    t => t.type === creatureType || t.name.toLowerCase() === creatureType || t.type.includes(creatureType),
  );

  if (!template) {
    const available = templates.map(t => t.type).join(', ');
    return { narrations: [sysMsg(`Unknown creature type: "${creatureType}".\nAvailable: ${available}`)] };
  }

  const lines: string[] = [
    `── ${template.name} ──`,
    `  Type: ${template.type}`,
    `  HP: ${template.stats.maxHp}`,
    `  Attack: ${template.stats.attack}`,
    `  Defence: ${template.stats.defence}`,
    `  Armour: ${template.stats.armour}`,
    `  Agility: ${template.stats.agility}`,
    `  Aggressive: ${template.aggressive ? 'yes' : 'no'}`,
    `  Flee threshold: ${Math.round(template.fleeThreshold * 100)}%`,
  ];

  if (template.positionType) {
    lines.push(`  Position type: ${template.positionType}`);
  }

  if (template.abilities && template.abilities.length > 0) {
    lines.push('  Abilities:');
    for (const a of template.abilities) {
      lines.push(`    ${a.name} — DMG: ${a.damage}, Wind-up: ${a.windUpTicks} ticks`);
    }
  } else {
    lines.push('  Abilities: none');
  }

  if (template.spawnRules) {
    lines.push(`  Spawn: ${template.spawnRules.minCount}–${template.spawnRules.maxCount}`);
  }

  return { narrations: [sysMsg(lines.join('\n'))] };
}

function handleClear(ctx: CommandContext): CommandResult {
  const { combatSystem } = ctx;

  if (sandboxOverrides.size === 0) {
    return { narrations: [sysMsg('No active stat overrides.')] };
  }

  const restored: string[] = [];

  for (const [entityId, overrides] of sandboxOverrides) {
    const combatant = combatSystem?.getCombatant(entityId);
    if (combatant) {
      for (const [statKey, { original }] of overrides) {
        (combatant as unknown as Record<string, unknown>)[statKey] = original;
        restored.push(`${combatant.name}.${statKey}: ${original}`);
      }
    }
  }

  const count = sandboxOverrides.size;
  sandboxOverrides.clear();

  const lines = [`Cleared overrides for ${count} entity(ies).`];
  if (restored.length > 0) {
    lines.push('Restored:');
    for (const r of restored) {
      lines.push(`  ${r}`);
    }
  }

  return { narrations: [sysMsg(lines.join('\n'))] };
}

function handleLog(ctx: CommandContext): CommandResult {
  const { args } = ctx;
  const countArg = args[1];
  const count = Math.min(Math.max(1, parseInt(countArg ?? '10', 10) || 10), COMBAT_LOG_MAX);

  if (combatLogBuffer.length === 0) {
    return { narrations: [sysMsg('No combat events recorded. Start a fight in the arena.')] };
  }

  const entries = combatLogBuffer.slice(-count);
  const lines: string[] = [`── Combat Log (last ${entries.length} of ${combatLogBuffer.length}) ──`];

  for (const e of entries) {
    if (e.dodged) {
      lines.push(`  [T${e.tick}] ${e.attacker} → ${e.target}: DODGED`);
    } else {
      lines.push(`  [T${e.tick}] ${e.attacker} → ${e.target}: ${e.finalDamage} dmg`);
    }
  }

  return { narrations: [sysMsg(lines.join('\n'))] };
}

/** Exported for testing — clear module-level state. */
export function _resetSandboxState(): void {
  sandboxOverrides.clear();
  combatLogBuffer.length = 0;
  combatLogTick = 0;
}

/** Exported for testing — access the overrides map. */
export function _getSandboxOverrides(): Map<string, Map<string, { original: number; override: number }>> {
  return sandboxOverrides;
}
