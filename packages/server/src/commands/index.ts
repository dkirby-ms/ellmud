/**
 * Command registry — maps verb strings to handler functions.
 *
 * All command handlers receive a CommandContext and return a CommandResult.
 * The ShardRoom is responsible for building the context and delivering the result.
 */

import type { NarrationType } from '@ellmud/shared';
import type { Room } from '../shard/RoomGraph.js';
import type { PlayerState } from '../state/PlayerState.js';
import type { CombatSystem } from '../combat/CombatSystem.js';
import { handleGo } from './handlers/go.js';
import { handleLook } from './handlers/look.js';
import { handleTake } from './handlers/take.js';
import { handleDrop } from './handlers/drop.js';
import { handleInventory } from './handlers/inventory.js';
import { handleAttack } from './handlers/attack.js';
import { handleStrike, handleDodge, handleFlee } from './handlers/combat-actions.js';
import { handleSay } from './handlers/say.js';
import { handleWhisper } from './handlers/whisper.js';
import { handleEmote } from './handlers/emote.js';
import { handleStabilize } from './handlers/stabilize.js';
import { handlePeaceful } from './handlers/peaceful.js';
import type { DowningSystem } from '../systems/DowningSystem.js';
import type { StashService } from '../stash/StashService.js';
import type { LoadoutService } from '../loadout/LoadoutService.js';
import { handleBoard, handleEnter } from './handlers/board.js';
import { handleStashView, handleStore } from './handlers/stash-command.js';
import { handleLoadoutView } from './handlers/loadout-command.js';

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
}

export interface CreatureRef {
  id: string;
  name: string;
  type?: string;
  roomDescription?: string;
}

export interface CommandContext {
  player: PlayerState;
  room: Room;
  args: string[];
  /** Resolve a room ID to a Room object. */
  resolveRoom: (roomId: string) => Room | undefined;
  /** Other player session IDs in the same room. */
  otherPlayersInRoom: string[];
  /** Current shard stability (0–1). */
  stability: number;
  /** The player's in-game character name. */
  characterName?: string;
  /** Combat system reference (available in ShardRoom context). */
  combatSystem?: CombatSystem;
  /** Living creatures in the current room. */
  creaturesInRoom?: CreatureRef[];
  /** Resolve creatures in an arbitrary room by ID. */
  resolveCreaturesInRoom?: (roomId: string) => CreatureRef[];
  /** Downing system reference (available in ShardRoom context). */
  downingSystem?: DowningSystem;
  /** Stash service for personal storage (available in feature_stash rooms). */
  stashService?: StashService;
  /** Loadout service for equipment management (available in feature_stash rooms). */
  loadoutService?: LoadoutService;
  /** Query available shards (available in feature_expedition_board rooms). */
  queryShards?: () => Promise<ShardListing[]>;
  /** Create/join a shard (available in feature_expedition_board rooms). */
  createShard?: (opts?: { tier?: number }) => Promise<ShardListing | null>;
  /** Current zone display name (e.g. "The Refuge"). */
  zoneName?: string;
  /** Current zone slug identifier (e.g. "refuge"). */
  zoneSlug?: string;
}

export type CommandHandler = (ctx: CommandContext) => CommandResult;

/** Shard listing summary for expedition board display. */
export interface ShardListing {
  roomId: string;
  tier: number;
  lifecycle: string;
  playerCount: number;
  maxPlayers: number;
  locked: boolean;
}

// ─── Feature-Gated Handlers ────────────────────────────────────────────────

const featureHandlers = new Map<string, { handler: CommandHandler; requiredRoomType: string }>();
featureHandlers.set('board', { handler: handleBoard, requiredRoomType: 'feature_expedition_board' });
featureHandlers.set('enter', { handler: handleEnter, requiredRoomType: 'feature_expedition_board' });
// Keep legacy alias
featureHandlers.set('shardboard', { handler: handleBoard, requiredRoomType: 'feature_expedition_board' });
featureHandlers.set('stash', { handler: handleStashView, requiredRoomType: 'feature_stash' });
featureHandlers.set('store', { handler: handleStore, requiredRoomType: 'feature_stash' });
featureHandlers.set('loadout', { handler: handleLoadoutView, requiredRoomType: 'feature_stash' });

// ─── Registry ───────────────────────────────────────────────────────────────

const handlers = new Map<string, CommandHandler>();

handlers.set('go', handleGo);
handlers.set('look', handleLook);
handlers.set('take', handleTake);
handlers.set('drop', handleDrop);
handlers.set('inventory', handleInventory);
handlers.set('attack', handleAttack);
handlers.set('strike', handleStrike);
handlers.set('dodge', handleDodge);
handlers.set('flee', handleFlee);
handlers.set('say', handleSay);
handlers.set('whisper', handleWhisper);
handlers.set('emote', handleEmote);
handlers.set('stabilize', handleStabilize);
handlers.set('peaceful', handlePeaceful);

/** Execute a command for a player. Returns narration results. */
export function handleCommand(
  verb: string,
  ctx: CommandContext,
): CommandResult {
  // Feature-gate: check if the command requires a specific room type
  const featureCmd = featureHandlers.get(verb);
  if (featureCmd) {
    if (ctx.room.type !== featureCmd.requiredRoomType) {
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
