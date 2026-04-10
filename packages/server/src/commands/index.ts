/**
 * Command registry — maps verb strings to handler functions.
 *
 * All command handlers receive a CommandContext and return a CommandResult.
 * The ZoneRoom is responsible for building the context and delivering the result.
 */

import type { NarrationType } from '@ellmud/shared';
import type { Room } from '../generator/RoomGraph.js';
import type { PlayerState } from '../state/PlayerState.js';
import type { CombatSystem } from '../combat/CombatSystem.js';
import type { CreatureManager } from '../creatures/CreatureManager.js';
import { handleGo } from './handlers/go.js';
import { handleLook } from './handlers/look.js';
import { handleTake } from './handlers/take.js';
import { handleDrop } from './handlers/drop.js';
import { handleInventory } from './handlers/inventory.js';
import { handleEquip, handleUnequip } from './handlers/equip.js';
import { handleAttack } from './handlers/attack.js';
import { handleStrike, handleDodge, handleFlee } from './handlers/combat-actions.js';
import { handleTarget } from './handlers/target.js';
import { handleSay } from './handlers/say.js';
import { handleWhisper } from './handlers/whisper.js';
import { handleEmote } from './handlers/emote.js';
import { handleStabilize } from './handlers/stabilize.js';
import { handlePeaceful } from './handlers/peaceful.js';
import { handleGoto } from './handlers/goto.js';
import { handleTeleport } from './handlers/teleport.js';
import { handleLoot } from './handlers/loot.js';
import { handlePosition } from './handlers/position.js';
import { handleHelp } from './handlers/help.js';
import type { DowningSystem } from '../systems/DowningSystem.js';
import type { CorpseSystem } from '../systems/CorpseSystem.js';
import type { StashService } from '../stash/StashService.js';
import type { LoadoutService } from '../loadout/LoadoutService.js';
import { handleBoard, handleEnter } from './handlers/board.js';
import { handleStashView, handleStore } from './handlers/stash-command.js';
import { handleLoadoutView } from './handlers/loadout-command.js';
import { handleRent } from './handlers/rent.js';
import { handleSandbox } from './handlers/sandbox.js';
import { handleFlag } from './handlers/flag.js';
import { handleStand, handleSit, handleCrouch, handleProne, handleRecline } from './handlers/posture.js';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface NarrationEntry {
  text: string;
  type: NarrationType;
}

export interface RoomHeaderEntry {
  roomName: string;
  exits: string[];
  stability: number;
  roomSlug?: string;
}

export interface CommandResult {
  narrations: NarrationEntry[];
  roomHeader?: RoomHeaderEntry;
  /** When set, the player should be transferred to another zone. */
  zoneTransfer?: { targetZoneSlug: string; targetRoomSlug: string };
  /** When set, triggers a special post-command action in ZoneRoom. */
  action?: 'rent';
  /** Narrations targeted at a specific player (e.g., teleport notification). */
  targetNarrations?: { sessionId: string; narrations: NarrationEntry[] };
}

export interface CreatureRef {
  id: string;
  name: string;
  type?: string;
  roomDescription?: string;
  /** Combat stats — passed through so the attack handler can register with real values. */
  hp?: number;
  maxHp?: number;
  attack?: number;
  defence?: number;
  armour?: number;
  agility?: number;
  dodgeSkillRank?: number;
}

/** Lightweight player info for room display (Issue #370). */
export interface PlayerRef {
  sessionId: string;
  name: string;
  anon: boolean;
  /** Current posture for room display (#371). */
  posture?: import('@ellmud/shared').Posture;
}

export interface CommandContext {
  player: PlayerState;
  room: Room;
  args: string[];
  /** Resolve a room ID to a Room object. */
  resolveRoom: (roomId: string) => Room | undefined;
  /** Other player session IDs in the same room. */
  otherPlayersInRoom: string[];
  /** Detailed info about other players in the same room (Issue #370). */
  otherPlayerInfo?: PlayerRef[];
  /** Resolve visible players in an arbitrary room by ID (Issue #370). */
  resolvePlayersInRoom?: (roomId: string) => PlayerRef[];
  /** Current zone stability (0–1). */
  stability: number;
  /** The player's in-game character name. */
  characterName?: string;
  /** Combat system reference (available in ZoneRoom context). */
  combatSystem?: CombatSystem;
  /** Living creatures in the current room. */
  creaturesInRoom?: CreatureRef[];
  /** Resolve creatures in an arbitrary room by ID. */
  resolveCreaturesInRoom?: (roomId: string) => CreatureRef[];
  /** Downing system reference (available in ZoneRoom context). */
  downingSystem?: DowningSystem;
  /** Stash service for personal storage (available in feature_stash rooms). */
  stashService?: StashService;
  /** Loadout service for equipment management (available in feature_stash rooms). */
  loadoutService?: LoadoutService;
  /** Query available zones (available in feature_expedition_board rooms). */
  queryZones?: () => Promise<ZoneListing[]>;
  /** Create/join a zone (available in feature_expedition_board rooms). */
  createZone?: (opts?: { tier?: number }) => Promise<ZoneListing | null>;
  /** Current zone display name (e.g. "The Refuge"). */
  zoneName?: string;
  /** Current zone slug identifier (e.g. "refuge"). */
  zoneSlug?: string;
  /** Corpse system reference for loot command (GDD §6.8). */
  corpseSystem?: CorpseSystem;
  /** Creature manager for sandbox spawn/clear operations. */
  creatureManager?: CreatureManager;
  /** Override scenario storage directory (dev/testing). */
  scenarioDir?: string;
  /** Check if a zone slug corresponds to a known zone (dev tools). */
  resolveZoneExists?: (slug: string) => boolean;
  /** Resolve a connected player by character name (dev tools). */
  resolvePlayerByName?: (name: string) => { sessionId: string; player: PlayerState; characterName: string } | undefined;
}

export type CommandHandler = (ctx: CommandContext) => CommandResult;

/** Shard listing summary for expedition board display. */
export interface ZoneListing {
  roomId: string;
  tier: number;
  lifecycle: string;
  playerCount: number;
  maxPlayers: number;
  locked: boolean;
}

// ─── Feature-Gated Handlers ────────────────────────────────────────────────

const featureHandlers = new Map<string, { handler: CommandHandler; requiredRoomType: string | string[] }>();
featureHandlers.set('board', { handler: handleBoard, requiredRoomType: 'feature_expedition_board' });
featureHandlers.set('enter', { handler: handleEnter, requiredRoomType: 'feature_expedition_board' });
// Keep legacy alias
featureHandlers.set('zoneboard', { handler: handleBoard, requiredRoomType: 'feature_expedition_board' });
featureHandlers.set('stash', { handler: handleStashView, requiredRoomType: 'feature_stash' });
featureHandlers.set('store', { handler: handleStore, requiredRoomType: 'feature_stash' });
featureHandlers.set('loadout', { handler: handleLoadoutView, requiredRoomType: 'feature_stash' });
featureHandlers.set('rent', { handler: handleRent, requiredRoomType: 'feature_inn' });
featureHandlers.set('sandbox', {
  handler: handleSandbox,
  requiredRoomType: ['feature_sandbox', 'feature_sandbox_arena', 'feature_sandbox_stats'],
});

// ─── Registry ───────────────────────────────────────────────────────────────

const handlers = new Map<string, CommandHandler>();

handlers.set('go', handleGo);
handlers.set('look', handleLook);
handlers.set('take', handleTake);
handlers.set('get', handleTake);
handlers.set('drop', handleDrop);
handlers.set('inventory', handleInventory);
handlers.set('equip', handleEquip);
handlers.set('unequip', handleUnequip);
handlers.set('attack', handleAttack);
handlers.set('strike', handleStrike);
handlers.set('dodge', handleDodge);
handlers.set('flee', handleFlee);
handlers.set('target', handleTarget);
handlers.set('say', handleSay);
handlers.set('whisper', handleWhisper);
handlers.set('emote', handleEmote);
handlers.set('stabilize', handleStabilize);
handlers.set('peaceful', handlePeaceful);
handlers.set('loot', handleLoot);
handlers.set('position', handlePosition);
handlers.set('pos', handlePosition); // Shorthand alias
handlers.set('goto', handleGoto);
handlers.set('teleport', handleTeleport);
handlers.set('help', handleHelp);
handlers.set('flag', handleFlag);
handlers.set('stand', handleStand);
handlers.set('sit', handleSit);
handlers.set('crouch', handleCrouch);
handlers.set('prone', handleProne);
handlers.set('recline', handleRecline);

/** Execute a command for a player. Returns narration results. */
export function handleCommand(
  verb: string,
  ctx: CommandContext,
): CommandResult {
  // Feature-gate: check if the command requires a specific room type
  const featureCmd = featureHandlers.get(verb);
  if (featureCmd) {
    const allowed = Array.isArray(featureCmd.requiredRoomType)
      ? featureCmd.requiredRoomType
      : [featureCmd.requiredRoomType];
    if (!allowed.includes(ctx.room.type as string)) {
      return {
        narrations: [{ text: `You can't do that here.`, type: 'system' as NarrationType }],
      };
    }
    return featureCmd.handler(ctx);
  }

  // Combat movement lock: block 'go' while in combat (must use 'flee')
  if (verb === 'go' && ctx.combatSystem?.isInCombat(ctx.player.sessionId)) {
    return {
      narrations: [{
        text: "You're in combat! Use 'flee' to escape first.",
        type: 'system',
      }],
    };
  }

  const handler = handlers.get(verb);
  if (!handler) {
    return {
      narrations: [{
        text: `You try to "${verb}" but nothing happens.`,
        type: 'system',
      }],
    };
  }
  return handler(ctx);
}
