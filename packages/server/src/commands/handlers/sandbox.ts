/**
 * sandbox — Combat sandbox dev tool command handler.
 *
 * Subcommands: spawn, reset, status, kill, heal, set, info, clear, log, seed, replay, scenario
 * Double-gated: featureHandlers room type gate + devModeEnabled config check.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { CommandContext, CommandResult, NarrationEntry } from '../index.js';
import type { Combatant, TickResult } from '../../combat/CombatState.js';
import type { DamageBreakdown } from '../../combat/damage.js';
import { getConfig } from '../../config.js';
import { getAllCreatureTemplates } from '../../creatures/CreatureManager.js';
import { seededPrng } from '../../combat/prng.js';

const MAX_SPAWN_COUNT = 5;
const SANDBOX_ARENA_ROOM_TYPE = 'feature_sandbox_arena';

/** Resolve scenario storage directory (relative to project root). */
export const SCENARIO_DIR = path.join(process.cwd(), 'packages/server/data/sandbox-scenarios');

// ─── Scenario Schema ────────────────────────────────────────────────────────

export interface SandboxScenario {
  name: string;
  savedAt: string;
  seed?: number;
  creatures: Array<{
    type: string;
    overrides?: Record<string, number>;
  }>;
  overrides?: Record<string, Record<string, number>>;
  playerOverrides?: Record<string, number>;
}

// ─── Stat Override Tracking ─────────────────────────────────────────────────

/** Per-entity stat overrides: entityId → statName → { original, override } */
const sandboxOverrides = new Map<string, Map<string, { original: number; override: number }>>();

/** Stat name aliases — maps user-facing names to Combatant property names. */
const STAT_ALIASES: Record<string, keyof Combatant> = {
  hp: 'hp',
  maxhp: 'maxHp',
  atk: 'attack',
  attack: 'attack',
  dodge: 'dodge',
  dge: 'dodge',
  shieldblock: 'shieldBlock',
  block: 'shieldBlock',
  armour: 'armour',
  armor: 'armour',
};

const SETTABLE_STATS = ['hp', 'maxhp', 'atk', 'dodge', 'shieldblock', 'armour', 'block'];

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

// ─── PRNG Seed Tracking ────────────────────────────────────────────────────

/** Current sandbox PRNG seed — null means using default (Math.random-like or CombatSystem default). */
let currentSeed: number | null = null;

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
        '  sandbox log [N] — Show recent combat events\n' +
        '  sandbox seed [number|random] — Set/show PRNG seed for deterministic combat\n' +
        '  sandbox replay [ticks] — Auto-run combat for N ticks (default: 10)\n' +
        '  sandbox scenario save|load|list|delete — Manage saved scenarios',
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
    case 'seed':
      return handleSeed(ctx);
    case 'replay':
      return handleReplay(ctx);
    case 'scenario':
      return handleScenario(ctx);
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
    narrations: [sysMsg(`Spawned ${spawned.length}x ${spawned[0]?.name ?? 'unknown'} in the sandbox arena.`)],
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
      const creature = creatures[idx - 1];
      if (!creature) {
        return { narrations: [sysMsg(`No creature at index ${idx}.`)] };
      }
      combatant = combatSystem?.getCombatant(creature.id);
      entityLabel = `${creature.name} (#${idx})`;
    } else {
      // Try name or ID match (partial, case-insensitive)
      const match = creatures.find(c =>
        c.id === targetArg ||
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
  const entityOverrides = sandboxOverrides.get(entityId);
  if (!entityOverrides) {
    return { narrations: [sysMsg(`Failed to track overrides for "${entityLabel}".`)] };
  }
  const statKey = combatantKey as string;

  if (!entityOverrides.has(statKey)) {
    entityOverrides.set(statKey, {
      original: combatant[combatantKey] as number,
      override: value,
    });
  } else {
    const existing = entityOverrides.get(statKey);
    if (existing) {
      existing.override = value;
    }
  }

  // Apply the override
  (combatant as unknown as Record<string, unknown>)[combatantKey] = value;

  const appliedOverride = entityOverrides.get(statKey);
  return { narrations: [sysMsg(`${entityLabel ?? 'unknown'}: ${statArg} set to ${value} (was ${appliedOverride?.original ?? '?'}).`)] };
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
        `  ${t.name} (${t.type}) — HP: ${t.stats.maxHp}, UNA: ${t.stats.unarmed}, 1H: ${t.stats.oneHanded}, 2H: ${t.stats.twoHanded}, RNG: ${t.stats.ranged}, ARM: ${t.stats.armour}, DGE: ${t.stats.dodge}, BLK: ${t.stats.shieldBlock}`,
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
    `  Unarmed: ${template.stats.unarmed}`,
    `  One-Handed: ${template.stats.oneHanded}`,
    `  Two-Handed: ${template.stats.twoHanded}`,
    `  Ranged: ${template.stats.ranged}`,
    `  Armour: ${template.stats.armour}`,
    `  Dodge: ${template.stats.dodge}`,
    `  Shield Block: ${template.stats.shieldBlock}`,
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

// ─── Phase 3: Deterministic PRNG + Replay ──────────────────────────────────

function handleSeed(ctx: CommandContext): CommandResult {
  const { args, combatSystem } = ctx;
  const seedArg = args[1];

  // No argument: show current seed
  if (seedArg === undefined) {
    const display = currentSeed !== null ? String(currentSeed) : 'random (default)';
    return { narrations: [sysMsg(`Current PRNG seed: ${display}`)] };
  }

  // "random" restores default RollFn
  if (seedArg.toLowerCase() === 'random') {
    currentSeed = null;
    if (combatSystem) {
      combatSystem.setRollFn(() => Math.random());
    }
    return { narrations: [sysMsg('PRNG seed cleared. Using Math.random().')] };
  }

  // Parse numeric seed
  const seed = parseInt(seedArg, 10);
  if (isNaN(seed)) {
    return { narrations: [sysMsg(`Invalid seed: "${seedArg}". Use a number or "random".`)] };
  }

  currentSeed = seed;
  if (combatSystem) {
    combatSystem.setRollFn(seededPrng(seed));
  }

  return { narrations: [sysMsg(`PRNG seed set to ${seed}. Combat rolls are now deterministic.`)] };
}

/** Format a DamageBreakdown into compact human-readable text. */
function formatBreakdown(bd: DamageBreakdown): string {
  const parts: string[] = [];
  parts.push(`raw:${bd.rawDamage}`);
  const totalMult = bd.abilityMultiplier * bd.stanceMultiplier;
  if (totalMult !== 1.0) {
    parts.push(`×${totalMult.toFixed(1)}`);
  }
  if (bd.armourReduction > 0) {
    parts.push(`-arm:${bd.armourReduction}`);
  }
  if (bd.blockReduction > 0) {
    parts.push(`-blk:${bd.blockReduction}`);
  }
  if (bd.flankingBonus !== 1.0) {
    parts.push(`flank:×${bd.flankingBonus.toFixed(2)}`);
  }
  parts.push(`= ${bd.finalDamage}`);
  return parts.join(' ');
}

function handleReplay(ctx: CommandContext): CommandResult {
  const { args, combatSystem, creatureManager, player } = ctx;

  if (!combatSystem || !creatureManager) {
    return { narrations: [sysMsg('Combat system or creature manager not available.')] };
  }

  const arenaRoomId = findArenaRoomId(ctx);
  if (!arenaRoomId) {
    return { narrations: [sysMsg('Cannot find the sandbox arena room.')] };
  }

  const creatures = creatureManager.getCreaturesInRoom(arenaRoomId);
  const aliveCreatures = creatures.filter(c => c.isAlive);
  const playerAlreadyInCombat = combatSystem.isInCombat(player.sessionId);

  if (aliveCreatures.length === 0 && !playerAlreadyInCombat) {
    return { narrations: [sysMsg('No living creatures in the arena. Spawn some first.')] };
  }

  const maxTicks = Math.min(Math.max(1, parseInt(args[1] ?? '10', 10) || 10), 100);

  // If seed is set, re-seed the PRNG so replay is reproducible from this point
  if (currentSeed !== null) {
    combatSystem.setRollFn(seededPrng(currentSeed));
  }

  // Auto-initiate combat with first creature if player not already in combat
  if (!playerAlreadyInCombat && aliveCreatures.length > 0) {
    const firstCreature = aliveCreatures[0];
    if (!firstCreature) {
      return { narrations: [sysMsg('No alive creatures found in the arena.')] };
    }
    const combatant = combatSystem.getCombatant(firstCreature.id);
    if (!combatant) {
      return { narrations: [sysMsg('Arena creatures are not registered as combatants. Try attacking one first.')] };
    }
    combatSystem.initiateCombat(player.sessionId, firstCreature.id);
  }

  const lines: string[] = [];
  if (currentSeed !== null) {
    lines.push(`── Replay (seed: ${currentSeed}, ${maxTicks} ticks) ──`);
  } else {
    lines.push(`── Replay (${maxTicks} ticks) ──`);
  }

  let combatEnded = false;

  for (let tick = 1; tick <= maxTicks; tick++) {
    // Submit strike for the player
    const playerCombatant = combatSystem.getCombatant(player.sessionId);
    if (playerCombatant && playerCombatant.hp > 0) {
      combatSystem.submitAction(player.sessionId, 'strike');
    }

    // Submit strike for creatures tracked by CreatureManager
    for (const creature of aliveCreatures) {
      const creatureCombatant = combatSystem.getCombatant(creature.id);
      if (creatureCombatant && creatureCombatant.hp > 0 && combatSystem.isInCombat(creature.id)) {
        combatSystem.submitAction(creature.id, 'strike');
      }
    }

    // Also submit strike for any hostile combatants from the encounter
    // (covers cases where combatants are registered directly, not via CreatureManager)
    const hostiles = combatSystem.getHostilesInEncounter(player.sessionId);
    for (const hostile of hostiles) {
      if (hostile.hp > 0 && !aliveCreatures.some(c => c.id === hostile.id)) {
        combatSystem.submitAction(hostile.id, 'strike');
      }
    }

    const tickResult: TickResult = combatSystem.resolveTick();

    for (const event of tickResult.events) {
      if (event.type === 'strike') {
        const bd = event.breakdown;
        const bdStr = bd ? ` (${formatBreakdown(bd)})` : '';
        const dodgeTag = event.dodged ? ' [DODGED]' : '';
        lines.push(
          `[Tick ${tick}] ${event.actorName} → ${event.targetName ?? '?'}: ${event.damage ?? 0} dmg${bdStr}${dodgeTag}`,
        );
      } else if (event.type === 'defeated') {
        lines.push(`[Tick ${tick}] ${event.actorName} defeated!`);
      } else if (event.type === 'combat_end') {
        lines.push(`[Tick ${tick}] Combat ended.`);
        combatEnded = true;
      }
    }

    // Record events for the regular combat log as well
    recordSandboxCombatEvents(tickResult, combatLogTick + tick);

    if (combatEnded) break;

    // Check if combat is still active
    if (!combatSystem.isInCombat(player.sessionId)) {
      const pc = combatSystem.getCombatant(player.sessionId);
      if (pc && pc.hp > 0) {
        lines.push(`[Result] All enemies defeated after ${tick} ticks. Player HP: ${pc.hp}/${pc.maxHp}.`);
      } else {
        lines.push(`[Result] Player defeated after ${tick} ticks.`);
      }
      break;
    }
  }

  if (!combatEnded && !lines[lines.length - 1]?.startsWith('[Result]')) {
    const pc = combatSystem.getCombatant(player.sessionId);
    const remainingHostiles = combatSystem.getHostilesInEncounter(player.sessionId);
    const creaturesDesc = remainingHostiles
      .filter(c => c.hp > 0)
      .map(c => `${c.name} HP:${c.hp}/${c.maxHp}`)
      .join(', ');
    lines.push(`[After ${maxTicks} ticks] Player HP: ${pc?.hp ?? 0}/${pc?.maxHp ?? 0}. Creatures: ${creaturesDesc || 'none'}`);
  }

  return { narrations: [sysMsg(lines.join('\n'))] };
}

/** Exported for reading the current seed in tests. */
export function _getCurrentSeed(): number | null {
  return currentSeed;
}

// ─── Phase 3: Scenario Save/Load/List/Delete ────────────────────────────────

/** Resolve the scenario storage directory — tests can override via ctx.scenarioDir. */
function resolveScenarioDir(ctx: CommandContext): string {
  return (ctx as CommandContext & { scenarioDir?: string }).scenarioDir ?? SCENARIO_DIR;
}

function handleScenario(ctx: CommandContext): CommandResult {
  const { args } = ctx;
  const action = args[1]?.toLowerCase();

  if (!action) {
    return { narrations: [sysMsg(
      'Scenario commands:\n' +
      '  sandbox scenario save <name> — Save current arena state\n' +
      '  sandbox scenario load <name> — Load a saved scenario\n' +
      '  sandbox scenario list — List saved scenarios\n' +
      '  sandbox scenario delete <name> — Delete a saved scenario',
    )] };
  }

  switch (action) {
    case 'save':
      return handleScenarioSave(ctx);
    case 'load':
      return handleScenarioLoad(ctx);
    case 'list':
      return handleScenarioList(ctx);
    case 'delete':
      return handleScenarioDelete(ctx);
    default:
      return { narrations: [sysMsg(`Unknown scenario action: "${action}". Use save, load, list, or delete.`)] };
  }
}

function handleScenarioSave(ctx: CommandContext): CommandResult {
  const { args, creatureManager, player } = ctx;
  const name = args[2];

  if (!name) {
    return { narrations: [sysMsg('Usage: sandbox scenario save <name>')] };
  }

  if (!creatureManager) {
    return { narrations: [sysMsg('Creature manager not available.')] };
  }

  const arenaRoomId = findArenaRoomId(ctx);
  if (!arenaRoomId) {
    return { narrations: [sysMsg('Cannot find the sandbox arena room.')] };
  }

  const creatures = creatureManager.getCreaturesInRoom(arenaRoomId);

  // Build per-creature entries — one entry per instance, with individual overrides
  const creatureEntries: SandboxScenario['creatures'] = [];
  const allOverrides: Record<string, Record<string, number>> = {};

  for (const creature of creatures) {
    const entityOverrides = sandboxOverrides.get(creature.id);
    let overridesRecord: Record<string, number> | undefined;
    if (entityOverrides && entityOverrides.size > 0) {
      overridesRecord = {};
      for (const [statKey, { override }] of entityOverrides) {
        overridesRecord[statKey] = override;
      }
      allOverrides[creature.id] = overridesRecord;
    }

    creatureEntries.push({
      type: creature.type,
      ...(overridesRecord ? { overrides: overridesRecord } : {}),
    });
  }

  // Gather player overrides
  const playerEntityOverrides = sandboxOverrides.get(player.sessionId);
  let playerOverrides: Record<string, number> | undefined;
  if (playerEntityOverrides && playerEntityOverrides.size > 0) {
    playerOverrides = {};
    for (const [statKey, { override }] of playerEntityOverrides) {
      playerOverrides[statKey] = override;
    }
    allOverrides[player.sessionId] = playerOverrides;
  }

  const scenario: SandboxScenario = {
    name,
    savedAt: new Date().toISOString(),
    creatures: creatureEntries,
    ...(currentSeed !== null ? { seed: currentSeed } : {}),
    ...(Object.keys(allOverrides).length > 0 ? { overrides: allOverrides } : {}),
    ...(playerOverrides ? { playerOverrides } : {}),
  };

  const totalOverrides = Object.values(allOverrides)
    .reduce((sum: number, m: Record<string, number>) => sum + Object.keys(m).length, 0);

  const scenarioDir = resolveScenarioDir(ctx);
  try {
    fs.mkdirSync(scenarioDir, { recursive: true });
    const filePath = path.join(scenarioDir, `${name}.json`);
    const existed = fs.existsSync(filePath);
    fs.writeFileSync(filePath, JSON.stringify(scenario, null, 2), 'utf-8');

    const msg = existed
      ? `Scenario '${name}' overwritten with ${creatures.length} creature(s) and ${totalOverrides} override(s).`
      : `Scenario '${name}' saved with ${creatures.length} creature(s) and ${totalOverrides} override(s).`;
    return { narrations: [sysMsg(msg)] };
  } catch (err) {
    return { narrations: [sysMsg(`Failed to save scenario: ${(err as Error).message}`)] };
  }
}

function handleScenarioLoad(ctx: CommandContext): CommandResult {
  const { args, creatureManager, combatSystem, player } = ctx;
  const name = args[2];

  if (!name) {
    return { narrations: [sysMsg('Usage: sandbox scenario load <name>')] };
  }

  if (!creatureManager) {
    return { narrations: [sysMsg('Creature manager not available.')] };
  }

  const scenarioDir = resolveScenarioDir(ctx);
  const filePath = path.join(scenarioDir, `${name}.json`);
  if (!fs.existsSync(filePath)) {
    return { narrations: [sysMsg(`Scenario '${name}' not found.`)] };
  }

  let scenario: SandboxScenario;
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    scenario = JSON.parse(raw) as SandboxScenario;
  } catch (err) {
    return { narrations: [sysMsg(`Failed to load scenario: ${(err as Error).message}`)] };
  }

  // Reset arena — mirrors handleReset logic
  const arenaRoomId = findArenaRoomId(ctx);
  if (!arenaRoomId) {
    return { narrations: [sysMsg('Cannot find the sandbox arena room.')] };
  }

  const creaturesInArena = creatureManager.getCreaturesInRoom(arenaRoomId);
  for (const creature of creaturesInArena) {
    combatSystem?.removeCombatant(creature.id);
  }
  creatureManager.clearCreaturesInRoom(arenaRoomId);
  if (combatSystem?.isInCombat(player.sessionId)) {
    combatSystem.removeCombatant(player.sessionId);
  }
  sandboxOverrides.clear();
  clearSandboxCombatLog();

  // Restore PRNG seed if present
  if (scenario.seed !== undefined) {
    currentSeed = scenario.seed;
    combatSystem?.setRollFn(seededPrng(scenario.seed));
  }

  // Spawn creatures from scenario — one spawn call per entry
  let totalSpawned = 0;
  for (const entry of scenario.creatures) {
    const spawned = creatureManager.spawnCreatureInRoom(entry.type, arenaRoomId, 1);
    if (spawned.length === 0) continue;

    const creature = spawned[0];
    if (!creature) continue;

    // Apply creature-level stat overrides to the Creature instance
    if (entry.overrides) {
      for (const [statKey, value] of Object.entries(entry.overrides)) {
        if (statKey in creature) {
          (creature as unknown as Record<string, unknown>)[statKey] = value;
        }
      }
      // Also register as combatant so overrides are immediately visible
      if (combatSystem) {
        const combatant = creatureManager.toCombatant(creature);
        combatSystem.registerCombatant(combatant);
      }
    }

    totalSpawned += spawned.length;
  }

  // Apply player overrides if player is a combatant
  let overridesApplied = 0;
  if (scenario.playerOverrides) {
    const combatant = combatSystem?.getCombatant(player.sessionId);
    if (combatant) {
      for (const [statKey, value] of Object.entries(scenario.playerOverrides)) {
        if (statKey in combatant) {
          if (!sandboxOverrides.has(player.sessionId)) {
            sandboxOverrides.set(player.sessionId, new Map());
          }
          const playerOverrides = sandboxOverrides.get(player.sessionId);
          playerOverrides?.set(statKey, {
            original: combatant[statKey as keyof Combatant] as number,
            override: value,
          });
          (combatant as unknown as Record<string, unknown>)[statKey] = value;
          overridesApplied++;
        }
      }
    } else {
      overridesApplied = Object.keys(scenario.playerOverrides).length;
    }
  }

  const parts = [`Scenario '${name}' loaded: ${totalSpawned} creature(s) spawned`];
  if (overridesApplied > 0) {
    parts[0] += `, ${overridesApplied} override(s) applied.`;
  } else {
    parts[0] += '.';
  }
  if (scenario.seed !== undefined) {
    parts.push(`PRNG seed: ${scenario.seed}`);
  }

  return { narrations: [sysMsg(parts.join(' '))] };
}

function handleScenarioList(ctx: CommandContext): CommandResult {
  const scenarioDir = resolveScenarioDir(ctx);
  try {
    if (!fs.existsSync(scenarioDir)) {
      return { narrations: [sysMsg('No saved scenarios.')] };
    }

    const files = fs.readdirSync(scenarioDir).filter(f => f.endsWith('.json'));
    if (files.length === 0) {
      return { narrations: [sysMsg('No saved scenarios.')] };
    }

    const lines: string[] = ['── Saved Scenarios ──'];
    for (const file of files.sort()) {
      try {
        const raw = fs.readFileSync(path.join(scenarioDir, file), 'utf-8');
        const scenario = JSON.parse(raw) as SandboxScenario;
        const creatureCount = scenario.creatures.length;
        const date = new Date(scenario.savedAt).toLocaleString();
        lines.push(`  ${scenario.name} — ${creatureCount} creature(s), saved ${date}`);
      } catch {
        const name = file.replace('.json', '');
        lines.push(`  ${name} — (invalid file)`);
      }
    }

    return { narrations: [sysMsg(lines.join('\n'))] };
  } catch (err) {
    return { narrations: [sysMsg(`Failed to list scenarios: ${(err as Error).message}`)] };
  }
}

function handleScenarioDelete(ctx: CommandContext): CommandResult {
  const { args } = ctx;
  const name = args[2];

  if (!name) {
    return { narrations: [sysMsg('Usage: sandbox scenario delete <name>')] };
  }

  const scenarioDir = resolveScenarioDir(ctx);
  const filePath = path.join(scenarioDir, `${name}.json`);
  if (!fs.existsSync(filePath)) {
    return { narrations: [sysMsg(`Scenario '${name}' not found.`)] };
  }

  try {
    fs.unlinkSync(filePath);
    return { narrations: [sysMsg(`Scenario '${name}' deleted.`)] };
  } catch (err) {
    return { narrations: [sysMsg(`Failed to delete scenario: ${(err as Error).message}`)] };
  }
}

/** Exported for testing — clear module-level state. */
export function _resetSandboxState(): void {
  sandboxOverrides.clear();
  combatLogBuffer.length = 0;
  combatLogTick = 0;
  currentSeed = null;
}

/** Exported for testing — access the overrides map. */
export function _getSandboxOverrides(): Map<string, Map<string, { original: number; override: number }>> {
  return sandboxOverrides;
}
